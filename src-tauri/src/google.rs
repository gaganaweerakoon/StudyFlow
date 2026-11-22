use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    io::{BufRead, BufReader, Write},
    net::TcpListener,
    time::{Duration, Instant},
};
use url::Url;
use uuid::Uuid;

#[tauri::command]
pub async fn google_sign_in(client_id: String, client_secret: String) -> Result<Value, String> {
    if !client_id.ends_with(".apps.googleusercontent.com")
        || client_id.len() > 200
        || !client_id
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || b".-_".contains(&byte))
        || client_secret.is_empty()
        || client_secret.len() > 512
    {
        return Err("Select a valid Google Desktop app OAuth configuration.".into());
    }
    let verifier = format!("{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple());
    let state = Uuid::new_v4().to_string();
    let listener =
        TcpListener::bind(("127.0.0.1", 0)).map_err(|_| "Could not start Google sign-in.")?;
    listener
        .set_nonblocking(true)
        .map_err(|_| "Could not start Google sign-in.")?;
    let port = listener
        .local_addr()
        .map_err(|_| "Could not start Google sign-in.")?
        .port();
    let redirect = format!("http://127.0.0.1:{port}/callback");
    let mut authorization = Url::parse("https://accounts.google.com/o/oauth2/v2/auth").unwrap();
    authorization.query_pairs_mut().extend_pairs([
        ("client_id", client_id.as_str()),
        ("redirect_uri", redirect.as_str()),
        ("response_type", "code"),
        ("scope", "openid email profile"),
        ("prompt", "select_account"),
        ("state", state.as_str()),
        ("code_challenge_method", "S256"),
        (
            "code_challenge",
            &URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes())),
        ),
    ]);
    open::that_detached(authorization.as_str()).map_err(|_| "Could not open your browser.")?;
    let code = tauri::async_runtime::spawn_blocking(move || read_callback(listener, &state))
        .await
        .map_err(|_| "Google sign-in was interrupted.")??;
    let client = reqwest::Client::builder()
        .https_only(true)
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|_| "Could not initialize Google sign-in.")?;
    let token: Value = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("code", code.as_str()),
            ("client_id", client_id.as_str()),
            ("client_secret", client_secret.as_str()),
            ("redirect_uri", redirect.as_str()),
            ("grant_type", "authorization_code"),
            ("code_verifier", verifier.as_str()),
        ])
        .send()
        .await
        .map_err(|_| "Could not reach Google.")?
        .error_for_status()
        .map_err(|_| "Google rejected the OAuth configuration or authorization code.")?
        .json()
        .await
        .map_err(|_| "Google returned an invalid token response.")?;
    let access_token = token["access_token"]
        .as_str()
        .ok_or("Google returned no access token.")?;
    let profile: Value = client
        .get("https://openidconnect.googleapis.com/v1/userinfo")
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|_| "Could not fetch your Google profile.")?
        .error_for_status()
        .map_err(|_| "Google rejected the profile request.")?
        .json()
        .await
        .map_err(|_| "Google returned an invalid profile.")?;
    let email = profile["email"]
        .as_str()
        .filter(|mail| !mail.is_empty())
        .ok_or("Google returned no email address.")?;
    if profile["email_verified"] != true || profile["sub"].as_str().is_none() {
        return Err("Google did not verify this account.".into());
    }
    Ok(json!({"id":profile["sub"],"name":profile["name"].as_str().unwrap_or(email),"email":email}))
}

fn read_callback(listener: TcpListener, state: &str) -> Result<String, String> {
    let until = Instant::now() + Duration::from_secs(120);
    while Instant::now() < until {
        let (mut stream, _) = match listener.accept() {
            Ok(connection) => connection,
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                std::thread::sleep(Duration::from_millis(80));
                continue;
            }
            Err(_) => return Err("Google sign-in was interrupted.".into()),
        };
        let _ = stream.set_read_timeout(Some(Duration::from_secs(1)));
        let mut line = String::new();
        use std::io::Read;
        if BufReader::new(&stream)
            .take(8192)
            .read_line(&mut line)
            .is_err()
        {
            continue;
        }
        let mut parts = line.split_whitespace();
        if parts.next() != Some("GET") {
            continue;
        }
        let Some(target) = parts
            .next()
            .filter(|target| target.starts_with("/callback?"))
        else {
            continue;
        };
        let Ok(url) = Url::parse(&format!("http://127.0.0.1{target}")) else {
            continue;
        };
        let values: std::collections::HashMap<_, _> = url.query_pairs().collect();
        if values.get("state").map(|value| value.as_ref()) != Some(state) {
            continue;
        }
        let body = "Return to StudyFlow to finish signing in.";
        let _ = write!(stream, "HTTP/1.0 200 OK\r\nContent-Type: text/plain\r\nCache-Control: no-store\r\nContent-Length: {}\r\n\r\n{}", body.len(), body);
        return values
            .get("code")
            .map(|code| code.to_string())
            .ok_or_else(|| "Google sign-in was cancelled.".into());
    }
    Err("Google sign-in timed out. Try again from StudyFlow.".into())
}
