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
