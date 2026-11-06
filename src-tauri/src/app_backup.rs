use fs2::available_space;
use rusqlite::{params, Connection, DatabaseName};
use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
    time::{Duration, SystemTime},
};
use tauri::{AppHandle, Manager};

const LIVE_DB_FILE: &str = "qs-pro.db";
const EVIDENCE_DIR: &str = "evidence";
const DEFAULT_BACKUP_RETENTION: usize = 7;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppDataBackupResult {
    source_path: String,
    destination_path: String,
    bytes: u64,
    evidence_path: Option<String>,
    evidence_files: u64,
    evidence_bytes: u64,
    available_space_bytes: u64,
    retained_backups: usize,
    verified: bool,
    exported_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppDataRestoreResult {
    source_path: String,
    automatic_backup_path: String,
    evidence_restored: bool,
    evidence_files: u64,
    verified: bool,
    restored_at: String,
    message: String,
}

fn live_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Unable to locate app data directory: {e}"))?;
    Ok(dir.join(LIVE_DB_FILE))
}

fn app_evidence_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Unable to locate app data directory: {e}"))?;
    Ok(dir.join(EVIDENCE_DIR))
}

fn backup_evidence_path(destination: &Path) -> PathBuf {
    let file_name = destination.file_name().unwrap_or_default().to_string_lossy();
    destination
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .join(format!("{file_name}.evidence"))
}

fn directory_stats(path: &Path) -> Result<(u64, u64), String> {
    if !path.exists() {
        return Ok((0, 0));
    }
    let mut files = 0_u64;
    let mut bytes = 0_u64;
    for entry in fs::read_dir(path).map_err(|error| format!("Unable to inspect evidence directory: {error}"))? {
        let entry = entry.map_err(|error| format!("Unable to inspect evidence entry: {error}"))?;
        let entry_path = entry.path();
        let metadata = entry.metadata().map_err(|error| format!("Unable to inspect evidence metadata: {error}"))?;
        if metadata.is_dir() {
            let (child_files, child_bytes) = directory_stats(&entry_path)?;
            files += child_files;
            bytes += child_bytes;
        } else if metadata.is_file() {
            files += 1;
            bytes += metadata.len();
        }
    }
    Ok((files, bytes))
}

fn copy_directory(source: &Path, destination: &Path) -> Result<(), String> {
    if !source.exists() {
        return Ok(());
    }
    fs::create_dir_all(destination)
        .map_err(|error| format!("Unable to create evidence backup directory: {error}"))?;
    for entry in fs::read_dir(source).map_err(|error| format!("Unable to read evidence directory: {error}"))? {
        let entry = entry.map_err(|error| format!("Unable to read evidence entry: {error}"))?;
        let source_path = entry.path();
        let destination_path = destination.join(entry.file_name());
        let metadata = entry.metadata().map_err(|error| format!("Unable to inspect evidence entry: {error}"))?;
        if metadata.is_dir() {
            copy_directory(&source_path, &destination_path)?;
        } else if metadata.is_file() {
            fs::copy(&source_path, &destination_path)
                .map_err(|error| format!("Unable to copy evidence file: {error}"))?;
        }
    }
    Ok(())
}

fn verify_sqlite_backup(path: &Path) -> Result<(), String> {
    let connection = Connection::open(path)
        .map_err(|error| format!("Unable to open the created SQLite backup: {error}"))?;
    let result: String = connection
        .query_row("PRAGMA integrity_check", [], |row| row.get(0))
        .map_err(|error| format!("Unable to verify the created SQLite backup: {error}"))?;
    if result.eq_ignore_ascii_case("ok") {
        Ok(())
    } else {
        Err(format!("The created SQLite backup failed integrity verification: {result}"))
    }
}

fn rotate_app_backups(directory: &Path, retain_count: usize) -> Result<usize, String> {
    let mut backups = fs::read_dir(directory)
        .map_err(|error| format!("Unable to inspect backup directory: {error}"))?
        .filter_map(Result::ok)
        .filter_map(|entry| {
            let path = entry.path();
            let name = path.file_name()?.to_string_lossy();
            let eligible = path.is_file()
                && name.starts_with("HZL-QS-Suite-app-data-")
                && name.ends_with(".qsbackup");
            eligible.then_some(path)
        })
        .collect::<Vec<_>>();
    backups.sort_by_key(|path| {
        fs::metadata(path)
            .and_then(|metadata| metadata.modified())
            .unwrap_or(SystemTime::UNIX_EPOCH)
    });
    let remove_count = backups.len().saturating_sub(retain_count);
    for path in backups.iter().take(remove_count) {
        fs::remove_file(path).map_err(|error| format!("Unable to rotate old backup: {error}"))?;
        let evidence = backup_evidence_path(path);
        if evidence.exists() {
            fs::remove_dir_all(evidence).map_err(|error| format!("Unable to rotate old evidence backup: {error}"))?;
        }
    }
    Ok(backups.len().saturating_sub(remove_count))
}

fn export_sqlite_backup(source: &Path, destination: &Path) -> Result<u64, String> {
    if !source.exists() {
        return Err(format!(
            "The live SQLite database could not be found at {}.",
            source.display()
        ));
    }

    if source == destination {
        return Err("The backup destination cannot overwrite the live app database.".to_string());
    }

    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Unable to create backup directory: {e}"))?;
    }

    if destination.exists() {
        fs::remove_file(destination)
            .map_err(|e| format!("Unable to replace existing backup file: {e}"))?;
    }

    let conn = Connection::open(source)
        .map_err(|e| format!("Unable to open live app database for backup: {e}"))?;
    let _ = conn.execute("PRAGMA wal_checkpoint(FULL)", []);
    conn.execute(
        "VACUUM INTO ?1",
        params![destination.to_string_lossy().to_string()],
    )
    .map_err(|e| format!("Unable to create SQLite backup: {e}"))?;

    fs::metadata(destination)
        .map_err(|e| format!("Unable to inspect backup file: {e}"))
        .map(|metadata| metadata.len())
}

fn restore_sqlite_backup(source: &Path, destination: &Path) -> Result<(), String> {
    if !source.exists() {
        return Err(format!("The selected backup could not be found at {}.", source.display()));
    }
    if source == destination {
        return Err("The selected backup is already the live app database.".to_string());
    }
    verify_sqlite_backup(source)?;
    let mut live = Connection::open(destination)
        .map_err(|error| format!("Unable to open the live app database for restore: {error}"))?;
    live.busy_timeout(Duration::from_secs(10))
        .map_err(|error| format!("Unable to prepare the live app database for restore: {error}"))?;
    let _ = live.execute("PRAGMA wal_checkpoint(TRUNCATE)", []);
    live.restore(DatabaseName::Main, source, None::<fn(_)>)
        .map_err(|error| format!("Unable to restore the selected SQLite backup: {error}"))?;
    verify_sqlite_backup(destination)
}

#[tauri::command]
pub fn export_app_data_backup(
    app: AppHandle,
    destination_path: String,
    retain_count: Option<usize>,
) -> Result<AppDataBackupResult, String> {
    let source = live_db_path(&app)?;
    let destination = PathBuf::from(destination_path);
    let evidence_source = app_evidence_path(&app)?;
    let evidence_destination = backup_evidence_path(&destination);
    let (_, evidence_bytes) = directory_stats(&evidence_source)?;
    let database_bytes = fs::metadata(&source)
        .map_err(|error| format!("Unable to inspect live SQLite database: {error}"))?
        .len();
    let destination_directory = destination.parent().unwrap_or_else(|| Path::new("."));
    fs::create_dir_all(destination_directory)
        .map_err(|error| format!("Unable to create backup directory: {error}"))?;
    let available_space_bytes = available_space(destination_directory)
        .map_err(|error| format!("Unable to inspect available backup space: {error}"))?;
    let required_bytes = database_bytes.saturating_mul(2).saturating_add(evidence_bytes);
    if available_space_bytes < required_bytes {
        return Err(format!(
            "Insufficient free space for a verified backup. At least {required_bytes} bytes are required; {available_space_bytes} bytes are available."
        ));
    }
    let bytes = export_sqlite_backup(&source, &destination)?;
    verify_sqlite_backup(&destination)?;
    if evidence_destination.exists() {
        fs::remove_dir_all(&evidence_destination)
            .map_err(|error| format!("Unable to replace existing evidence backup: {error}"))?;
    }
    copy_directory(&evidence_source, &evidence_destination)?;
    let (evidence_files, copied_evidence_bytes) = directory_stats(&evidence_destination)?;
    if copied_evidence_bytes != evidence_bytes {
        return Err("Evidence backup verification failed because copied evidence size does not match the source.".to_string());
    }
    let retained_backups = rotate_app_backups(destination_directory, retain_count.unwrap_or(DEFAULT_BACKUP_RETENTION).max(1))?;

    Ok(AppDataBackupResult {
        source_path: source.to_string_lossy().to_string(),
        destination_path: destination.to_string_lossy().to_string(),
        bytes,
        evidence_path: (evidence_files > 0).then(|| evidence_destination.to_string_lossy().to_string()),
        evidence_files,
        evidence_bytes: copied_evidence_bytes,
        available_space_bytes,
        retained_backups,
        verified: true,
        exported_at: chrono::Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
pub fn restore_app_data_backup(
    app: AppHandle,
    source_path: String,
    restore_evidence: Option<bool>,
) -> Result<AppDataRestoreResult, String> {
    let source = PathBuf::from(source_path);
    let live = live_db_path(&app)?;
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Unable to locate app data directory: {error}"))?;
    let restore_directory = app_data.join("backups");
    fs::create_dir_all(&restore_directory)
        .map_err(|error| format!("Unable to create the restore checkpoint folder: {error}"))?;
    let checkpoint = restore_directory.join(format!(
        "pre-restore-{}.qsbackup",
        chrono::Utc::now().format("%Y%m%d-%H%M%S")
    ));
    let live_evidence = app_evidence_path(&app)?;
    let checkpoint_evidence = backup_evidence_path(&checkpoint);

    export_sqlite_backup(&live, &checkpoint)?;
    verify_sqlite_backup(&checkpoint)?;
    if checkpoint_evidence.exists() {
        fs::remove_dir_all(&checkpoint_evidence)
            .map_err(|error| format!("Unable to replace the pre-restore evidence checkpoint: {error}"))?;
    }
    copy_directory(&live_evidence, &checkpoint_evidence)?;

    restore_sqlite_backup(&source, &live)?;
    let source_evidence = backup_evidence_path(&source);
    let should_restore_evidence = restore_evidence.unwrap_or(true) && source_evidence.exists();
    let (evidence_restored, evidence_files) = if should_restore_evidence {
        if live_evidence.exists() {
            fs::remove_dir_all(&live_evidence)
                .map_err(|error| format!("Unable to replace live managed evidence: {error}"))?;
        }
        copy_directory(&source_evidence, &live_evidence)?;
        let (files, _) = directory_stats(&live_evidence)?;
        (true, files)
    } else {
        let (files, _) = directory_stats(&live_evidence)?;
        (false, files)
    };

    Ok(AppDataRestoreResult {
        source_path: source.to_string_lossy().to_string(),
        automatic_backup_path: checkpoint.to_string_lossy().to_string(),
        evidence_restored,
        evidence_files,
        verified: true,
        restored_at: chrono::Utc::now().to_rfc3339(),
        message: if evidence_restored {
            "The selected database and its managed evidence were restored. The app must now reload.".to_string()
        } else {
            "The selected database was restored. Its evidence sidecar was not found, so the current managed evidence was retained. The app must now reload.".to_string()
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        process,
        time::{SystemTime, UNIX_EPOCH},
    };

    struct TestDir {
        path: PathBuf,
    }

    impl TestDir {
        fn new(name: &str) -> Self {
            let timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("system time should be after Unix epoch")
                .as_nanos();
            let path = std::env::temp_dir().join(format!(
                "hzl-app-backup-test-{name}-{}-{timestamp}",
                process::id()
            ));
            fs::create_dir_all(&path).expect("test directory should be created");
            Self { path }
        }

        fn join(&self, name: &str) -> PathBuf {
            self.path.join(name)
        }
    }

    impl Drop for TestDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }

    fn create_source_db(path: &Path) {
        let conn = Connection::open(path).expect("source database should open");
        conn.execute_batch(
            r#"
            PRAGMA journal_mode = WAL;
            CREATE TABLE app_state (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL
            );
            INSERT INTO app_state (key, value) VALUES ('project-count', '1');
            "#,
        )
        .expect("source database should be seeded");
    }

    #[test]
    fn exports_sqlite_backup_with_live_data() {
        let dir = TestDir::new("export");
        let source_path = dir.join("qs-pro.db");
        let backup_path = dir.join("backups").join("app.qsbackup");
        create_source_db(&source_path);

        let bytes = export_sqlite_backup(&source_path, &backup_path)
            .expect("SQLite backup should be created");

        assert!(bytes > 0);
        assert!(backup_path.exists());
        let backup = Connection::open(&backup_path).expect("backup should open as SQLite");
        let value: String = backup
            .query_row(
                "SELECT value FROM app_state WHERE key = 'project-count'",
                [],
                |row| row.get(0),
            )
            .expect("backup should contain app_state rows");
        assert_eq!(value, "1");
    }

    #[test]
    fn replaces_existing_backup_file() {
        let dir = TestDir::new("replace");
        let source_path = dir.join("qs-pro.db");
        let backup_path = dir.join("app.qsbackup");
        create_source_db(&source_path);
        fs::write(&backup_path, b"old backup").expect("old backup fixture should be written");

        export_sqlite_backup(&source_path, &backup_path)
            .expect("SQLite backup should replace old file");

        let backup =
            Connection::open(&backup_path).expect("replacement backup should open as SQLite");
        let count: i64 = backup
            .query_row("SELECT COUNT(*) FROM app_state", [], |row| row.get(0))
            .expect("replacement backup should contain app_state table");
        assert_eq!(count, 1);
    }

    #[test]
    fn rejects_missing_live_database() {
        let dir = TestDir::new("missing");
        let error = export_sqlite_backup(&dir.join("missing.db"), &dir.join("app.qsbackup"))
            .expect_err("missing source should be rejected");

        assert!(error.contains("live SQLite database could not be found"));
    }

    #[test]
    fn rejects_overwriting_live_database() {
        let dir = TestDir::new("same-path");
        let source_path = dir.join("qs-pro.db");
        create_source_db(&source_path);

        let error = export_sqlite_backup(&source_path, &source_path)
            .expect_err("same source and destination should be rejected");

        assert!(error.contains("cannot overwrite the live app database"));
    }

    #[test]
    fn restores_a_verified_backup_over_the_live_database() {
        let dir = TestDir::new("restore");
        let source_path = dir.join("qs-pro.db");
        let backup_path = dir.join("app.qsbackup");
        create_source_db(&source_path);
        export_sqlite_backup(&source_path, &backup_path).expect("backup should be created");
        let live = Connection::open(&source_path).expect("live database should open");
        live.execute("UPDATE app_state SET value = '2' WHERE key = 'project-count'", [])
            .expect("live data should change");

        restore_sqlite_backup(&backup_path, &source_path).expect("backup should restore");

        let restored = Connection::open(&source_path).expect("restored database should open");
        let value: String = restored
            .query_row("SELECT value FROM app_state WHERE key = 'project-count'", [], |row| row.get(0))
            .expect("restored value should exist");
        assert_eq!(value, "1");
    }
}
