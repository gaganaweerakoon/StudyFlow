use base64::{engine::general_purpose::STANDARD, Engine as _};
use rcgen::{generate_simple_self_signed, CertifiedKey};
use rustls::{pki_types::PrivatePkcs8KeyDer, ServerConfig, ServerConnection, StreamOwned};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    io::{Read, Write},
    net::{Ipv4Addr, TcpListener, TcpStream},
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use uuid::Uuid;

#[cfg(windows)]
mod windows_network;
#[cfg(not(windows))]
use std::net::{ToSocketAddrs, UdpSocket};

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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pending: Option<PendingClaim>,
}

#[derive(Clone, Serialize, Deserialize)]
struct PendingClaim {
    code_hash: [u8; 32],
    expires_at: u64,
}

fn unix_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

struct Server {
    identity: Identity,
    path: PathBuf,
    invitation: Option<([u8; 32], Instant)>,
    calendar: Option<Value>,
    focus: Option<Value>,
    focus_commands: Vec<Value>,
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

#[cfg(not(windows))]
fn host_addresses() -> Vec<Ipv4Addr> {
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
    addresses
}

#[cfg(windows)]
use windows_network::addresses as host_addresses;

fn addresses() -> Vec<String> {
    let mut seen = std::collections::HashSet::new();
    host_addresses()
        .into_iter()
        .filter(|ip| (ip.is_private() || ip.is_link_local()) && seen.insert(*ip))
        .take(12)
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
                focus: None,
                focus_commands: Vec::new(),
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

    pub fn publish_focus(&mut self, focus: Value) -> Result<(), String> {
        if !focus.is_object() || focus.to_string().len() > 65536
            || !focus["at"].is_number() || !focus["timer"].is_object() {
            return Err("Invalid StudyFlow focus snapshot.".into());
        }
        let paired = {
            let mut state = self.state.lock().map_err(|error| error.to_string())?;
            state.focus = Some(focus);
            state.identity.phone.is_some()
        };
        if paired {
            self.start(PORT)?;
        }
        Ok(())
    }

    /// Commands are accepted only after TLS pinning and saved-phone token authentication.
    pub fn drain_focus_commands(&self) -> Result<Value, String> {
        let mut state = self.state.lock().map_err(|error| error.to_string())?;
        Ok(Value::Array(std::mem::take(&mut state.focus_commands)))
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
        TcpStream::connect_timeout(&(Ipv4Addr::LOCALHOST, port).into(), Duration::from_secs(2))
            .map_err(|_| "StudyFlow could not reach its local listener.")?;
        let raw = secret();
        let mut state = self.state.lock().map_err(|error| error.to_string())?;
        let reconnect = state
            .identity
            .phone
            .as_ref()
            .is_some_and(|phone| phone.pending.is_none());
        if !reconnect && state.identity.phone.is_some() {
            let previous = state.identity.phone.take();
            if let Err(error) = write_identity(&state.path, &state.identity) {
                state.identity.phone = previous;
                return Err(error);
            }
        }
        let value = json!({
            "v": 1, "hosts": hosts, "port": port, "pc": pc_name(),
            "pin": STANDARD.encode(hash(&state.identity.cert)), "code": (!reconnect).then_some(&raw),
        });
        let svg = qrcode::QrCode::new(value.to_string())
            .map_err(|error| error.to_string())?
            .render::<qrcode::render::svg::Color>()
            .min_dimensions(260, 260)
            .build();
        state.invitation = (!reconnect).then(|| (hash(raw), Instant::now() + QR_LIFETIME));
        Ok(
            json!({ "qr": format!("data:image/svg+xml;base64,{}", STANDARD.encode(svg)), "seconds": QR_LIFETIME.as_secs() }),
        )
    }

    pub fn check_listener(&mut self) -> Result<Value, String> {
        let port = self.start(PORT)?;
        TcpStream::connect_timeout(&(Ipv4Addr::LOCALHOST, port).into(), Duration::from_secs(2))
            .map_err(|_| "StudyFlow could not reach its local listener.")?;
        Ok(json!({ "pc": pc_name(), "port": port, "addresses": addresses() }))
    }

    pub fn status(&self) -> Result<Value, String> {
        let state = self.state.lock().map_err(|error| error.to_string())?;
        Ok(
            json!({ "pc": pc_name(), "phone": state.identity.phone.as_ref().filter(|phone| phone.pending.is_none()).map(|phone| &phone.name), "lastSync": state.last_sync }),
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
        state.focus_commands.clear();
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
        let now = unix_seconds();
        let calendar = json!({ "revision": now, "events": events, "paired": true });
        let focus = self.focus.clone().unwrap_or(Value::Null);
        let configured_name = focus["profileName"].as_str().unwrap_or("").trim();
        let username = if !configured_name.is_empty() {
            configured_name.chars().take(64).collect::<String>()
        } else { "Student".into() };
        let server_now_ms = now.saturating_mul(1000);
        let proposed = request["token"].as_str().filter(|token| {
            token.len() == 64 && token.bytes().all(|byte| byte.is_ascii_hexdigit())
        });
        if let (Some("claim"), Some(token), Some(phone)) = (
            request["action"].as_str(),
            proposed,
            self.identity.phone.as_ref(),
        ) {
            if phone.token_hash == hash(token)
                && phone.pending.as_ref().is_some_and(|pending| {
                    now < pending.expires_at && hash(key) == pending.code_hash
                })
            {
                return json!({ "token": token, "calendar": calendar, "focus": focus, "serverNowMs": server_now_ms, "userName": username });
            }
        }
        match request["action"].as_str() {
            Some("claim")
                if self.identity.phone.is_none()
                    && self.invitation.is_some_and(|(valid, expires)| {
                        Instant::now() < expires && hash(key) == valid
                    }) =>
            {
                let token = proposed.map(str::to_owned).unwrap_or_else(secret);
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
                    pending: proposed.map(|_| PendingClaim {
                        code_hash: hash(key),
                        expires_at: now + QR_LIFETIME.as_secs(),
                    }),
                });
                if let Err(error) = write_identity(&self.path, &self.identity) {
                    self.identity.phone = None;
                    return json!({ "error": error });
                }
                self.invitation = None;
                if proposed.is_none() {
                    self.last_sync = Some(now);
                }
                json!({ "token": token, "calendar": calendar, "focus": focus, "serverNowMs": server_now_ms, "userName": username })
            }
            Some("sync" | "focus_control")
                if self
                    .identity
                    .phone
                    .as_ref()
                    .is_some_and(|phone| hash(key) == phone.token_hash) =>
            {
                if let Some(phone) = self.identity.phone.as_mut() {
                    if let Some(pending) = phone.pending.take() {
                        if let Err(error) = write_identity(&self.path, &self.identity) {
                            if let Some(phone) = self.identity.phone.as_mut() {
                                phone.pending = Some(pending);
                            }
                            return json!({ "error": error });
                        }
                    }
                }
                self.last_sync = Some(now);
                if request["action"] == "focus_control" {
                    let Some(command) = request["command"].as_str().filter(|command| {
                        matches!(*command, "start" | "pause" | "resume" | "reset" | "complete" | "take_break" | "end_break" | "offline_sync")
                    }) else {
                        return json!({ "error": "Unknown focus command." });
                    };
                    if self.focus_commands.len() >= 20 {
                        return json!({ "error": "PC is still processing earlier focus commands." });
                    }
                    let session_id = request["sessionId"].as_str()
                        .filter(|id| id.len() <= 128)
                        .unwrap_or("");
                    if command == "offline_sync" {
                        let record = &request["record"];
                        let Some(id) = record["id"].as_str().filter(|id| id.starts_with("phone-") && id.len() == 42) else {
                            return json!({ "error": "Invalid offline focus identity." });
                        };
                        if !record.is_object() || record.to_string().len() > 1500
                            || !record["startedAt"].is_number() || !record["endedAt"].is_number()
                            || !matches!(record["state"].as_str(), Some("running" | "paused" | "completed")) {
                            return json!({ "error": "Invalid offline focus record." });
                        }
                        if !self.focus_commands.iter().any(|queued| queued["record"]["id"].as_str() == Some(id)) {
                            self.focus_commands.push(json!({ "action": command, "record": record }));
                        }
                    } else {
                        self.focus_commands.push(json!({ "action": command, "sessionId": session_id }));
                    }
                    return json!({ "accepted": true, "focus": focus, "serverNowMs": server_now_ms, "userName": username });
                }
                json!({ "calendar": calendar, "focus": focus, "serverNowMs": server_now_ms, "userName": username })
            }
            Some("sync" | "focus_control") => {
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
        // Focus state is returned with calendar sync and commands require the
        // currently paired phone's token, not the public QR invitation code.
        companion.publish_focus(json!({
            "at": 1_795_400_000_000_u64,
            "timer": { "phase": "focus", "running": true, "secondsLeft": 1200 }
        })).unwrap();
        let live = request(port, &cert, sync.clone()).unwrap();
        assert_eq!(live["focus"]["timer"]["running"], true);
        assert!(live["serverNowMs"].is_number());

        let control = request(port, &cert, json!({
            "action": "focus_control", "key": token, "command": "pause"
        })).unwrap();
        assert_eq!(control["accepted"], true);
        assert_eq!(companion.drain_focus_commands().unwrap()[0]["action"], "pause");
        assert_eq!(companion.drain_focus_commands().unwrap(), json!([]));
        let invalid = request(port, &cert, json!({
            "action": "focus_control", "key": secret(), "command": "reset"
        })).unwrap();
        assert!(invalid["error"].is_string());
        assert_eq!(companion.drain_focus_commands().unwrap(), json!([]));
        let unsupported = request(port, &cert, json!({
            "action": "focus_control", "key": token, "command": "erase_workspace"
        })).unwrap();
        assert!(unsupported["error"].is_string());
        assert_eq!(companion.drain_focus_commands().unwrap(), json!([]));

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
    #[test]
    fn an_interrupted_claim_can_be_retried_after_the_pc_restarts() {
        let directory = std::env::temp_dir().join(format!("studyflow-test-{}", Uuid::new_v4()));
        std::fs::create_dir(&directory).unwrap();
        let file = directory.join("local.json");
        let mut companion = Companion::open(file.clone()).unwrap();
        companion.publish(json!([])).unwrap();
        let port = companion.start(0).unwrap();
        let code = secret();
        let token = secret();
        let cert = {
            let mut state = companion.state.lock().unwrap();
            state.invitation = Some((hash(&code), Instant::now() + QR_LIFETIME));
            state.identity.cert.clone()
        };
        let claim =
            json!({ "action": "claim", "key": code, "phone": "Test phone", "token": token });
        assert_eq!(request(port, &cert, claim.clone()).unwrap()["token"], token);
        assert_eq!(companion.status().unwrap()["phone"], Value::Null);

        let reopened = Companion::open(file).unwrap();
        reopened.state.lock().unwrap().calendar = Some(json!([]));
        assert_eq!(
            reopened.state.lock().unwrap().respond(claim.clone())["token"],
            token
        );
        let wrong = json!({ "action": "claim", "key": code, "token": secret() });
        assert!(reopened.state.lock().unwrap().respond(wrong)["error"].is_string());
        assert!(reopened
            .state
            .lock()
            .unwrap()
            .respond(json!({ "action": "sync", "key": token }))["calendar"]
            .is_object());
        assert_eq!(reopened.status().unwrap()["phone"], "Test phone");
        assert!(reopened.state.lock().unwrap().respond(claim)["error"].is_string());
        std::fs::remove_dir_all(directory).unwrap();
    }
}
