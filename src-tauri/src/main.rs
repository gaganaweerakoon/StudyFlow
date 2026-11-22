#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

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

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let directory = app.path().app_local_data_dir()?;
            std::fs::create_dir_all(&directory)?;
            app.manage(WorkspaceDatabase(directory.join("studyflow.sqlite")));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![load_snapshot, save_snapshot])
        .run(tauri::generate_context!())
        .expect("failed to start StudyFlow");
}
