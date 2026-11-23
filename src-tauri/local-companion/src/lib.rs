use base64::{engine::general_purpose::STANDARD, Engine as _};
use rcgen::{generate_simple_self_signed, CertifiedKey};
use rustls::{pki_types::PrivatePkcs8KeyDer, ServerConfig, ServerConnection, StreamOwned};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    io::{Read, Write},
    net::{Ipv4Addr, TcpListener, TcpStream, ToSocketAddrs, UdpSocket},
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use uuid::Uuid;

const PORT: u16 = 8475;
const MAX_CALENDAR_BYTES: usize = 2_000_000;
const QR_LIFETIME: Duration = Duration::from_secs(120);

#[derive(Serialize, Deserialize)]
struct Identity {
    cert: Vec<u8>,
    key: Vec<u8>,
    phone: Option<Phone>,
}

#[derive(Serialize, Deserialize)]
struct Phone {
    token_hash: [u8; 32],
    name: String,
}

struct Server {
    identity: Identity,
    path: PathBuf,
    invitation: Option<([u8; 32], Instant)>,
    calendar: Option<Value>,
    last_sync: Option<u64>,
}

pub struct Companion {
    state: Arc<Mutex<Server>>,
    address: Option<u16>,
}

fn hash(value: impl AsRef<[u8]>) -> [u8; 32] {
    Sha256::digest(value).into()
}

fn secret() -> String {
    format!("{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple())
}

fn pc_name() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "StudyFlow PC".into())
        .chars()
        .take(48)
        .collect()
}

fn addresses() -> Vec<String> {
    let name = pc_name();
    let mut addresses = Vec::new();
    if let Ok(socket) = UdpSocket::bind((Ipv4Addr::UNSPECIFIED, 0)) {
        if socket.connect((Ipv4Addr::new(192, 0, 2, 1), 9)).is_ok() {
            if let Ok(std::net::SocketAddr::V4(address)) = socket.local_addr() {
                addresses.push(*address.ip());
            }
        }
    }
    if let Ok(resolved) = (name.as_str(), PORT).to_socket_addrs() {
        addresses.extend(resolved.filter_map(|address| match address.ip() {
            std::net::IpAddr::V4(ip) => Some(ip),
            _ => None,
        }));
    }
    addresses.retain(|ip| ip.is_private() || ip.is_link_local());
    addresses.sort_unstable();
    addresses.dedup();
    addresses
        .into_iter()
        .take(5)
        .map(|ip| ip.to_string())
        .collect()
}

fn write_identity(path: &Path, identity: &Identity) -> Result<(), String> {
    let temporary = path.with_extension("tmp");
    let bytes = serde_json::to_vec(identity).map_err(|error| error.to_string())?;
    std::fs::write(&temporary, bytes)
        .and_then(|()| std::fs::rename(&temporary, path))
        .map_err(|_| "Could not save the StudyFlow pairing on this PC.".into())
}

impl Companion {
    pub fn open(path: PathBuf) -> Result<Self, String> {
        let identity = match std::fs::read(&path) {
            Ok(bytes) => serde_json::from_slice(&bytes)
                .map_err(|_| "Could not read the saved local pairing.")?,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                let CertifiedKey { cert, signing_key } =
                    generate_simple_self_signed(vec!["studyflow.local".into()])
                        .map_err(|error| error.to_string())?;
                let identity = Identity {
                    cert: cert.der().to_vec(),
                    key: signing_key.serialize_der(),
                    phone: None,
                };
                write_identity(&path, &identity)?;
                identity
            }
            Err(_) => return Err("Could not open the saved local pairing.".into()),
        };
        Ok(Self {
            state: Arc::new(Mutex::new(Server {
                identity,
                path,
                invitation: None,
                calendar: None,
                last_sync: None,
            })),
            address: None,
        })
    }

    fn start(&mut self, port: u16) -> Result<u16, String> {
        if let Some(port) = self.address {
            return Ok(port);
        }
        let listener = TcpListener::bind((Ipv4Addr::UNSPECIFIED, port)).map_err(|_| {
            "StudyFlow could not open its local pairing port. Close any other running copy."
        })?;
        let port = listener
            .local_addr()
            .map_err(|error| error.to_string())?
            .port();
        let state = self.state.lock().map_err(|error| error.to_string())?;
        let config =
            ServerConfig::builder_with_provider(rustls::crypto::ring::default_provider().into())
                .with_safe_default_protocol_versions()
                .map_err(|error| error.to_string())?
                .with_no_client_auth()
                .with_single_cert(
                    vec![state.identity.cert.clone().into()],
                    PrivatePkcs8KeyDer::from(state.identity.key.clone()).into(),
                )
                .map_err(|error| error.to_string())?;
        drop(state);
        let config = Arc::new(config);
        let state = Arc::clone(&self.state);
        std::thread::Builder::new()
            .name("studyflow-companion".into())
            .spawn(move || {
                for socket in listener.incoming().flatten() {
                    let _ = serve(socket, Arc::clone(&config), &state);
                }
            })
            .map_err(|error| error.to_string())?;
        self.address = Some(port);
        Ok(port)
    }

    pub fn publish(&mut self, events: Value) -> Result<(), String> {
        if !events.is_array() || events.to_string().len() > MAX_CALENDAR_BYTES {
            return Err("The companion calendar is too large to sync.".into());
        }
        let paired = {
            let mut state = self.state.lock().map_err(|error| error.to_string())?;
            if state.calendar.as_ref() != Some(&events) {
                state.calendar = Some(events);
            }
            state.identity.phone.is_some()
        };
        if paired {
            self.start(PORT)?;
        }
        Ok(())
    }

    pub fn invite(&mut self) -> Result<Value, String> {
        let hosts = addresses();
        if hosts.is_empty() {
            return Err(
                "Connect this PC and your phone to the same Wi-Fi or hotspot, then try again."
                    .into(),
            );
        }
        let port = self.start(PORT)?;
        let raw = secret();
        let mut state = self.state.lock().map_err(|error| error.to_string())?;
        if state.identity.phone.is_some() {
            return Err("Disconnect the paired phone before pairing another one.".into());
        }
        let value = json!({
            "v": 1, "hosts": hosts, "port": port, "pc": pc_name(),
            "pin": STANDARD.encode(hash(&state.identity.cert)), "code": raw,
        });
        let svg = qrcode::QrCode::new(value.to_string())
            .map_err(|error| error.to_string())?
            .render::<qrcode::render::svg::Color>()
            .min_dimensions(260, 260)
            .build();
        state.invitation = Some((hash(raw), Instant::now() + QR_LIFETIME));
        Ok(
            json!({ "qr": format!("data:image/svg+xml;base64,{}", STANDARD.encode(svg)), "seconds": QR_LIFETIME.as_secs() }),
        )
    }

    pub fn status(&self) -> Result<Value, String> {
        let state = self.state.lock().map_err(|error| error.to_string())?;
        Ok(
            json!({ "phone": state.identity.phone.as_ref().map(|phone| &phone.name), "lastSync": state.last_sync }),
        )
    }

    pub fn disconnect(&self) -> Result<(), String> {
        let mut state = self.state.lock().map_err(|error| error.to_string())?;
        let previous = state.identity.phone.take();
        if let Err(error) = write_identity(&state.path, &state.identity) {
            state.identity.phone = previous;
            return Err(error);
        }
        state.invitation = None;
        state.last_sync = None;
        Ok(())
    }
}

fn serve(
    socket: TcpStream,
    config: Arc<ServerConfig>,
    state: &Mutex<Server>,
) -> std::io::Result<()> {
    socket.set_read_timeout(Some(Duration::from_secs(3)))?;
    socket.set_write_timeout(Some(Duration::from_secs(3)))?;
    let mut stream = StreamOwned::new(
        ServerConnection::new(config).map_err(std::io::Error::other)?,
        socket,
    );
    let mut length = [0; 4];
    stream.read_exact(&mut length)?;
    let length = u32::from_be_bytes(length) as usize;
    if !(1..=2048).contains(&length) {
        return Ok(());
    }
    let mut request = vec![0; length];
    stream.read_exact(&mut request)?;
    let request: Value = serde_json::from_slice(&request).map_err(std::io::Error::other)?;
    let response = {
        let mut state = state
            .lock()
            .map_err(|_| std::io::Error::other("Companion unavailable"))?;
        state.respond(request)
    };
    let bytes = serde_json::to_vec(&response).map_err(std::io::Error::other)?;
    stream.write_all(&(bytes.len() as u32).to_be_bytes())?;
    stream.write_all(&bytes)?;
    stream.flush()
}

impl Server {
    fn respond(&mut self, request: Value) -> Value {
        let Some(key) = request["key"].as_str().filter(|value| value.len() == 64) else {
            return json!({ "error": "Invalid StudyFlow pairing." });
        };
        let Some(events) = self.calendar.as_ref() else {
            return json!({ "error": "Open your StudyFlow workspace on the PC, then try again." });
        };
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let calendar = json!({ "revision": now, "events": events, "paired": true });
        match request["action"].as_str() {
            Some("claim")
                if self.identity.phone.is_none()
                    && self.invitation.is_some_and(|(valid, expires)| {
                        Instant::now() < expires && hash(key) == valid
                    }) =>
            {
                let token = secret();
                let name = request["phone"]
                    .as_str()
                    .unwrap_or("Android phone")
                    .trim()
                    .chars()
                    .take(48)
                    .collect();
                self.identity.phone = Some(Phone {
                    token_hash: hash(&token),
                    name,
                });
                if let Err(error) = write_identity(&self.path, &self.identity) {
                    self.identity.phone = None;
                    return json!({ "error": error });
                }
                self.invitation = None;
                self.last_sync = Some(now);
                json!({ "token": token, "calendar": calendar })
            }
            Some("sync")
                if self
                    .identity
                    .phone
                    .as_ref()
                    .is_some_and(|phone| hash(key) == phone.token_hash) =>
            {
                self.last_sync = Some(now);
                json!({ "calendar": calendar })
            }
            Some("sync") => {
                json!({ "error": "This phone is no longer paired. Scan a new code to reconnect." })
            }
            _ => {
                json!({ "error": "This QR code has expired or was already used. Show a new code on your PC." })
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rustls::{pki_types::ServerName, ClientConfig, ClientConnection, RootCertStore};

    fn request(port: u16, cert: &[u8], data: Value) -> std::io::Result<Value> {
        let mut roots = RootCertStore::empty();
        roots.add(cert.to_vec().into()).unwrap();
        let config =
            ClientConfig::builder_with_provider(rustls::crypto::ring::default_provider().into())
                .with_safe_default_protocol_versions()
                .unwrap()
                .with_root_certificates(roots)
                .with_no_client_auth();
        let socket = TcpStream::connect((Ipv4Addr::LOCALHOST, port))?;
        socket.set_read_timeout(Some(Duration::from_secs(3)))?;
        let mut stream = StreamOwned::new(
            ClientConnection::new(
                Arc::new(config),
                ServerName::try_from("studyflow.local").unwrap(),
            )
            .unwrap(),
            socket,
        );
        let data = serde_json::to_vec(&data).unwrap();
        stream.write_all(&(data.len() as u32).to_be_bytes())?;
        stream.write_all(&data)?;
        let mut length = [0; 4];
        stream.read_exact(&mut length)?;
        let mut reply = vec![0; u32::from_be_bytes(length) as usize];
        stream.read_exact(&mut reply)?;
        Ok(serde_json::from_slice(&reply).unwrap())
    }

    #[test]
    fn pairing_expires_and_is_single_use_then_syncs_changes_over_tls() {
        let directory = std::env::temp_dir().join(format!("studyflow-test-{}", Uuid::new_v4()));
        std::fs::create_dir(&directory).unwrap();
        let file = directory.join("local.json");
        let original = json!([{ "id": "chemistry", "startAt": "2026-11-24T02:00:00Z" }]);
        let mut companion = Companion::open(file.clone()).unwrap();
        companion.publish(original.clone()).unwrap();
        let port = companion.start(0).unwrap();
        let code = secret();
        let cert = {
            let mut state = companion.state.lock().unwrap();
            state.invitation = Some((hash(&code), Instant::now() - Duration::from_secs(1)));
            state.identity.cert.clone()
        };
        let claim = json!({ "action": "claim", "key": code, "phone": "Test Android" });
        assert!(request(port, &cert, claim.clone()).unwrap()["error"].is_string());

        companion.state.lock().unwrap().invitation =
            Some((hash(&code), Instant::now() + QR_LIFETIME));
        let reply = request(port, &cert, claim.clone()).unwrap();
        assert_eq!(reply["calendar"]["events"], original);
        assert!(request(port, &cert, claim).unwrap()["error"].is_string());
        let token = reply["token"].as_str().unwrap();
        assert_eq!(companion.status().unwrap()["phone"], "Test Android");

        let updated = json!([{ "id": "chemistry", "startAt": "2026-11-24T02:30:00Z" }]);
        companion.publish(updated.clone()).unwrap();
        let sync = json!({ "action": "sync", "key": token });
        assert_eq!(
            request(port, &cert, sync.clone()).unwrap()["calendar"]["events"],
            updated
        );
        let reopened = Companion::open(file.clone()).unwrap();
        assert_eq!(reopened.status().unwrap()["phone"], "Test Android");
        assert_eq!(reopened.state.lock().unwrap().identity.cert, cert);
        assert_eq!(
            reopened
                .state
                .lock()
                .unwrap()
                .identity
                .phone
                .as_ref()
                .unwrap()
                .token_hash,
            hash(token)
        );
        companion.disconnect().unwrap();
        assert!(request(port, &cert, sync).unwrap()["error"].is_string());
        std::fs::remove_dir_all(directory).unwrap();
    }
}
