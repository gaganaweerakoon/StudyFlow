// Used only in the isolated Windows acceptance build. Capture the step-scoped
// secret before Tauri starts any WebView or worker threads.
static KEY: std::sync::OnceLock<Option<String>> = std::sync::OnceLock::new();
pub fn initialize() {
    let key = std::env::var("GEMINI_API_KEY").ok().filter(|s| !s.trim().is_empty());
    std::env::remove_var("GEMINI_API_KEY");
    let _ = KEY.set(key);
}
pub fn read(provider: &str) -> Result<Option<String>, String> {
    Ok(if provider == "gemini" { KEY.get().cloned().flatten() } else { None })
}
pub fn update(_: &str, _: Option<String>) -> Result<(), String> {
    Err("Credential writes disabled in acceptance fixture".into())
}
