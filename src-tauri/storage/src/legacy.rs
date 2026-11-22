use rusqlite::{types::ValueRef, Connection, OpenFlags};
use serde_json::{Map, Value};
use std::io::Write;

const TABLES: &[&str] = &[
    "subjects",
    "settings",
    "schedule_events",
    "recurring_events",
    "recurrence_exceptions",
    "recurrence_overrides",
    "study_sessions",
    "focus_intervals",
    "notes",
    "videos",
    "video_notes",
    "tasks",
    "learning_goals",
    "video_watch_history",
    "forest_plots",
    "forest_rewards",
];

pub fn read_legacy_backup(data: &[u8]) -> Result<Map<String, Value>, String> {
    if data.len() > 16 * 1024 * 1024 || !data.starts_with(b"SQLite format 3\0") {
        return Err("Choose a SQLite backup up to 16 MB.".into());
    }
    let mut file = tempfile::NamedTempFile::new().map_err(|error| error.to_string())?;
    file.write_all(data).map_err(|error| error.to_string())?;
    let database = Connection::open_with_flags(file.path(), OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|error| error.to_string())?;
    extract(&database).map_err(|error| error.to_string())
}

fn extract(database: &Connection) -> Result<Map<String, Value>, Box<dyn std::error::Error>> {
    database.execute_batch("PRAGMA trusted_schema = OFF; PRAGMA query_only = ON;")?;
    let version: i32 = database.pragma_query_value(None, "user_version", |row| row.get(0))?;
    if version != 17 {
        return Err(format!(
            "This backup uses schema {version}. StudyFlow supports legacy schema 17."
        )
        .into());
    }
    let integrity: String = database.query_row("PRAGMA quick_check(1)", [], |row| row.get(0))?;
    if integrity != "ok" {
        return Err("SQLite reported that the backup is damaged.".into());
    }
    let mut archive = Map::new();
    for table in TABLES {
        let kind: String = database.query_row(
            "SELECT type FROM pragma_table_list WHERE schema = 'main' AND name = ?1",
            [table],
            |row| row.get(0),
        )?;
        if kind != "table" {
            return Err(format!("Backup contains an unexpected object named {table}.").into());
        }
        let mut statement = database.prepare(&format!("SELECT * FROM main.{table}"))?;
        let keys: Vec<String> = statement
            .column_names()
            .iter()
            .map(|name| (*name).into())
            .collect();
        let mut rows = statement.query([])?;
        let mut records = Vec::new();
        while let Some(row) = rows.next()? {
            let mut record = Map::new();
            for (index, key) in keys.iter().enumerate() {
                let value = match row.get_ref(index)? {
                    ValueRef::Null => Value::Null,
                    ValueRef::Integer(value) => value.into(),
                    ValueRef::Real(value) => value.into(),
                    ValueRef::Text(value) => std::str::from_utf8(value)?.into(),
                    ValueRef::Blob(bytes) => serde_json::json!({ "bytes": bytes }),
                };
                record.insert(key.to_owned(), value);
            }
            records.push(Value::Object(record));
        }
        archive.insert((*table).into(), Value::Array(records));
    }
    Ok(archive)
}

#[cfg(test)]
mod tests {
    #[test]
    fn verifies_personal_backup_when_provided_locally() {
        let Some(path) = std::env::var_os("STUDYFLOW_LEGACY_FIXTURE") else {
            return;
        };
        let archive = super::read_legacy_backup(&std::fs::read(path).unwrap()).unwrap();
        for (table, count) in [
            ("subjects", 3),
            ("tasks", 76),
            ("recurring_events", 52),
            ("study_sessions", 53),
            ("focus_intervals", 80),
            ("forest_rewards", 44),
        ] {
            assert_eq!(archive[table].as_array().unwrap().len(), count, "{table}");
        }
    }
}
