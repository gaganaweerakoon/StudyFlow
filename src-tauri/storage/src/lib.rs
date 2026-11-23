mod legacy;
pub use legacy::read_legacy_backup;

use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{fmt, path::Path, time::Duration};

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Document {
    Workspace,
    AssistantUsage,
    AssistantHistory,
}

impl Document {
    fn key(self) -> &'static str {
        match self {
            Self::Workspace => "workspace",
            Self::AssistantUsage => "assistant_usage",
            Self::AssistantHistory => "assistant_history",
        }
    }
}

#[derive(Debug, Serialize)]
pub struct Snapshot {
    pub revision: u64,
    pub data: Value,
}

#[derive(Debug)]
pub enum StorageError {
    Database(rusqlite::Error),
    Json(serde_json::Error),
    NewerSchema(u32),
    Conflict,
    InvalidDocument,
}

impl fmt::Display for StorageError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Database(error) => error.fmt(formatter),
            Self::Json(error) => error.fmt(formatter),
            Self::NewerSchema(version) => {
                write!(formatter, "Workspace database uses newer schema {version}")
            }
            Self::Conflict => write!(
                formatter,
                "This workspace changed in another window. Reopen StudyFlow to reload it."
            ),
            Self::InvalidDocument => write!(formatter, "Invalid workspace data or revision"),
        }
    }
}

impl From<rusqlite::Error> for StorageError {
    fn from(error: rusqlite::Error) -> Self {
        Self::Database(error)
    }
}

impl From<serde_json::Error> for StorageError {
    fn from(error: serde_json::Error) -> Self {
        Self::Json(error)
    }
}

pub struct Storage(Connection);

impl Storage {
    pub fn open(path: &Path) -> Result<Self, StorageError> {
        let mut connection = Connection::open(path)?;
        connection.busy_timeout(Duration::from_secs(5))?;
        let migration = connection.transaction_with_behavior(TransactionBehavior::Immediate)?;
        let version: u32 = migration.pragma_query_value(None, "user_version", |row| row.get(0))?;
        match version {
            0 => {
                migration.execute_batch(
                    "CREATE TABLE documents (
                        name TEXT PRIMARY KEY,
                        revision INTEGER NOT NULL CHECK (revision > 0),
                        data TEXT NOT NULL CHECK (json_valid(data))
                    ) STRICT;",
                )?;
                migration.pragma_update(None, "user_version", 1)?;
            }
            1 => {}
            newer => return Err(StorageError::NewerSchema(newer)),
        }
        migration.commit()?;
        Ok(Self(connection))
    }

    pub fn load(&self, document: Document) -> Result<Option<Snapshot>, StorageError> {
        let row = self
            .0
            .query_row(
                "SELECT revision, data FROM documents WHERE name = ?1",
                [document.key()],
                |row| Ok((row.get::<_, u64>(0)?, row.get::<_, String>(1)?)),
            )
            .optional()?;
        row.map(|(revision, data)| {
            Ok(Snapshot {
                revision,
                data: serde_json::from_str(&data)?,
            })
        })
        .transpose()
    }

    pub fn save(
        &mut self,
        document: Document,
        revision: u64,
        data: &Value,
    ) -> Result<u64, StorageError> {
        if !data.is_object() || revision >= (1_u64 << 53) - 1 {
            return Err(StorageError::InvalidDocument);
        }
        let encoded = serde_json::to_string(data)?;
        let next = revision + 1;
        let changed = if revision == 0 {
            self.0.execute(
                "INSERT INTO documents (name, revision, data) VALUES (?1, ?2, ?3)
                 ON CONFLICT(name) DO NOTHING",
                params![document.key(), next, encoded],
            )?
        } else {
            self.0.execute(
                "UPDATE documents SET revision = ?2, data = ?3 WHERE name = ?1 AND revision = ?4",
                params![document.key(), next, encoded, revision],
            )?
        };
        if changed != 1 {
            return Err(StorageError::Conflict);
        }
        Ok(next)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn workspace_survives_reopen_and_rejects_a_stale_writer() {
        let directory = tempfile::tempdir().unwrap();
        let file = directory.path().join("workspace.sqlite");
        let data = json!({ "tasks": [{ "id": "one", "done": true }], "notes": [] });
        let mut storage = Storage::open(&file).unwrap();
        assert!(storage.load(Document::Workspace).unwrap().is_none());
        assert_eq!(storage.save(Document::Workspace, 0, &data).unwrap(), 1);
        drop(storage);
        let mut storage = Storage::open(&file).unwrap();
        let snapshot = storage.load(Document::Workspace).unwrap().unwrap();
        assert_eq!(snapshot.revision, 1);
        assert_eq!(snapshot.data, data);
        assert!(matches!(
            storage.save(Document::Workspace, 0, &json!({})),
            Err(StorageError::Conflict)
        ));
        assert_eq!(
            storage.load(Document::Workspace).unwrap().unwrap().data,
            data
        );
    }
}
