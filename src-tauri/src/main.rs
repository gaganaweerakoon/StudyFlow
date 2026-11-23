#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod google;
mod ocr;

use serde_json::Value;
use std::path::PathBuf;
use studyflow_storage::{Document, Snapshot, Storage};
use tauri::{Manager, State};

struct WorkspaceDatabase(PathBuf);

#[tauri::command]
async fn load_snapshot(
    database: State<'_, WorkspaceDatabase>,
    document: Document,
) -> Result<Option<Snapshot>, String> {
    let path = database.0.clone();
    tauri::async_runtime::spawn_blocking(move || {
        Storage::open(&path)
            .and_then(|storage| storage.load(document))
            .map_err(|error| error.to_string())
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn save_snapshot(
    database: State<'_, WorkspaceDatabase>,
    document: Document,
    revision: u64,
    data: Value,
) -> Result<u64, String> {
    let path = database.0.clone();
    tauri::async_runtime::spawn_blocking(move || {
        Storage::open(&path)
            .and_then(|mut storage| storage.save(document, revision, &data))
            .map_err(|error| error.to_string())
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
fn inspect_legacy_backup(
    request: tauri::ipc::Request<'_>,
) -> Result<serde_json::Map<String, Value>, String> {
    match request.body() {
        tauri::ipc::InvokeBody::Raw(bytes) => studyflow_storage::read_legacy_backup(bytes),
        _ => Err("Choose a SQLite backup file.".into()),
    }
}

#[tauri::command]
async fn recognize_pdf_page(request: tauri::ipc::Request<'_>) -> Result<String, String> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
        return Err("Send a PDF page rendered as PNG.".into());
    };
    ocr::validate_png(bytes)?;
    let bytes = bytes.clone();
    tauri::async_runtime::spawn_blocking(move || ocr::recognize(&bytes))
        .await
        .map_err(|error| error.to_string())?
}

#[derive(Default)]
struct ActiveChat(std::sync::Mutex<Option<(String, Option<tokio::sync::oneshot::Sender<()>>)>>);

#[tauri::command]
async fn assistant_chat(
    state: State<'_, ActiveChat>,
    id: String,
    request: studyflow_assistant::ChatRequest,
    key: String,
    events: tauri::ipc::Channel<Value>,
) -> Result<(), String> {
    let (cancel, cancelled) = tokio::sync::oneshot::channel();
    {
        let mut active = state.0.lock().map_err(|error| error.to_string())?;
        if active.is_some() {
            return Err("A reply is already in progress.".into());
        }
        *active = Some((id, Some(cancel)));
    }
    let result = tokio::select! {
        result = studyflow_assistant::stream(request, key, |event| events.send(event).map_err(|error| error.to_string())) => result,
        _ = cancelled => Err("Reply stopped.".into()),
    };
    *state.0.lock().map_err(|error| error.to_string())? = None;
    result
}

#[tauri::command]
fn cancel_assistant_chat(state: State<'_, ActiveChat>, id: String) -> Result<(), String> {
    let mut active = state.0.lock().map_err(|error| error.to_string())?;
    if active
        .as_ref()
        .is_some_and(|(request_id, _)| request_id == &id)
    {
        if let Some(cancel) = active.as_mut().and_then(|(_, cancel)| cancel.take()) {
            let _ = cancel.send(());
        }
    }
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .manage(ActiveChat::default())
        .setup(|app| {
            let directory = app.path().app_local_data_dir()?;
            std::fs::create_dir_all(&directory)?;
            app.manage(WorkspaceDatabase(directory.join("studyflow.sqlite")));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_snapshot,
            save_snapshot,
            inspect_legacy_backup,
            recognize_pdf_page,
            assistant_chat,
            cancel_assistant_chat,
            google::google_sign_in
        ])
        .run(tauri::generate_context!())
        .expect("failed to start StudyFlow");
}
