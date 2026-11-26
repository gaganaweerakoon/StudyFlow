use reqwest::{Client, Method, Url};
use serde_json::Value;
use std::time::Duration;

#[tauri::command]
pub async fn companion_request(
    origin: String,
    action: String,
    token: String,
    body: Option<Value>,
) -> Result<Value, String> {
    let mut url = Url::parse(&origin).map_err(|_| "Enter your relay’s HTTPS address.")?;
    if url.scheme() != "https"
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.path() != "/"
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err("Enter your relay’s HTTPS address.".into());
    }
    let (method, path) = match action.as_str() {
        "enroll" => (Method::POST, "/v1/pairs"),
        "read" => (Method::GET, "/v1/calendar"),
        "publish" => (Method::PUT, "/v1/calendar"),
        "pip_enqueue" => (Method::PUT, "/v1/pip"),
        "pip_cancel" => (Method::DELETE, "/v1/pip"),
        "unpair" => (Method::DELETE, "/v1/pair"),
        _ => return Err("Unknown companion operation.".into()),
    };
    url.set_path(path);
    let client = Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|_| "Could not start a connection to the relay.")?;
    let mut request = client.request(method, url).bearer_auth(token);
    if let Some(data) = body {
        request = request.json(&data);
    }
    let response = request
        .send()
        .await
        .map_err(|_| "Could not connect to the StudyFlow relay.")?;
    let status = response.status();
    let data: Value = response
        .json()
        .await
        .map_err(|_| "Invalid response from the StudyFlow relay.")?;
    if !status.is_success() {
        return Err(data["error"]
            .as_str()
            .unwrap_or("Companion request failed.")
            .into());
    }
    Ok(data)
}

// Keep the desktop credential bound to its enrolled origin in the Windows vault.
#[tauri::command]
pub async fn pip_relay(action: String, origin: Option<String>, enrollment: Option<String>, body: Option<Value>) -> Result<Value, String> {
    #[cfg(windows)]
    {
        use crate::credentials;
        let stored = credentials::read("pip-relay")?;
        if action == "enroll" {
            if stored.is_some() { return Err("Disconnect the previous check-in relay first.".into()); }
            let origin = origin.ok_or("Enter the relay address.")?;
            if origin.len() > 240 { return Err("Relay address is too long.".into()); }
            let result = companion_request(origin.clone(), "enroll".into(), enrollment.ok_or("Enter the enrollment key.")?, None).await?;
            let token = result["desktopToken"].as_str().ok_or("Invalid enrollment response.")?;
            let binding = serde_json::to_string(&(origin,token)).map_err(|_| "Invalid relay address.")?;
            credentials::update("pip-relay", Some(binding))?;
            return Ok(serde_json::json!({"pairingCode":result["pairingCode"]}));
        }
        let binding = stored.ok_or("Pair a check-in relay first.")?;
        let (origin,token): (String,String) = serde_json::from_str(&binding).map_err(|_| "Invalid relay pairing.")?;
        let operation = match action.as_str() {
            "enqueue" => "pip_enqueue", "cancel" => "pip_cancel", "disconnect" => "unpair",
            _ => return Err("Unknown check-in operation.".into())
        };
        let result = companion_request(origin, operation.into(), token, body).await?;
        if action == "disconnect" { credentials::update("pip-relay", None)?; }
        Ok(result)
    }
    #[cfg(not(windows))]
    { let _ = (action, origin, enrollment, body); Err("Check-in relay pairing requires Windows.".into()) }
}

#[derive(Default)]
pub struct LocalCompanion(pub std::sync::Mutex<Option<studyflow_local_companion::Companion>>);

#[tauri::command]
pub async fn local_companion(
    app: tauri::AppHandle,
    action: String,
    events: Option<Value>,
    focus: Option<Value>,
) -> Result<Value, String> {
    use tauri::Manager;
    tauri::async_runtime::spawn_blocking(move || {
        let path = app
            .path()
            .app_local_data_dir()
            .map_err(|error| error.to_string())?
            .join("companion-local.json");
        let state = app.state::<LocalCompanion>();
        let mut slot = state.0.lock().map_err(|error| error.to_string())?;
        if slot.is_none() {
            if action == "publish" && !path.exists() {
                return Ok(Value::Null);
            }
            *slot = Some(studyflow_local_companion::Companion::open(path)?);
        }
        let companion = slot.as_mut().ok_or("Local pairing unavailable.")?;
        match action.as_str() {
            "publish" => {
                companion.publish(events.ok_or("Missing calendar.")?)?;
                if let Some(focus) = focus { companion.publish_focus(focus)?; }
                Ok(Value::Null)
            }
            "focus_commands" => companion.drain_focus_commands(),
            "invite" => {
                companion.publish(events.ok_or("Missing calendar.")?)?;
                if let Some(focus) = focus { companion.publish_focus(focus)?; }
                companion.invite()
            }
            "status" => companion.status(),
            "test" => companion.check_listener(),
            "disconnect" => {
                companion.disconnect()?;
                companion.status()
            }
            _ => Err("Unknown local pairing operation.".into()),
        }
    })
    .await
    .map_err(|error| error.to_string())?
}
