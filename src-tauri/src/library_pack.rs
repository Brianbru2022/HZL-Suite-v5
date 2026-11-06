use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
};
use tauri::{AppHandle, Emitter, Manager};

const LIVE_DB_FILE: &str = "qs-pro.db";
const PACK_FORMAT: &str = "QS_PRO_LIBRARY_SQLITE_PACK";
const PACK_VERSION: i64 = 1;

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryPackPermissions {
    allow_export_all: Option<bool>,
    allow_export_folders: Option<bool>,
    allow_export_sections: Option<bool>,
    allow_library_editing: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryPackImportResult {
    imported_libraries: usize,
    imported_items: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryPackExportResult {
    exported_libraries: usize,
    exported_items: i64,
    destination_path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LibraryPackProgress {
    operation: String,
    phase: String,
    detail: String,
    completed_libraries: usize,
    total_libraries: usize,
    completed_items: i64,
    total_items: i64,
}

type PackProgressSink<'a> = Option<&'a dyn Fn(LibraryPackProgress)>;

fn pack_progress(
    operation: &str,
    phase: &str,
    detail: impl Into<String>,
    completed_libraries: usize,
    total_libraries: usize,
    completed_items: i64,
    total_items: i64,
) -> LibraryPackProgress {
    LibraryPackProgress {
        operation: operation.to_string(),
        phase: phase.to_string(),
        detail: detail.into(),
        completed_libraries,
        total_libraries,
        completed_items,
        total_items,
    }
}

fn emit_pack_progress(app: &AppHandle, progress: LibraryPackProgress) {
    let _ = app.emit("library-pack-progress", progress);
}

fn report_pack_progress(
    progress_sink: PackProgressSink<'_>,
    operation: &str,
    phase: &str,
    detail: impl Into<String>,
    completed_libraries: usize,
    total_libraries: usize,
    completed_items: i64,
    total_items: i64,
) {
    if let Some(sink) = progress_sink {
        sink(pack_progress(
            operation,
            phase,
            detail,
            completed_libraries,
            total_libraries,
            completed_items,
            total_items,
        ));
    }
}

fn live_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Unable to locate app data directory: {e}"))?;
    Ok(dir.join(LIVE_DB_FILE))
}

fn bool_int(value: Option<bool>, fallback: bool) -> i64 {
    if value.unwrap_or(fallback) {
        1
    } else {
        0
    }
}

fn create_pack_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        PRAGMA foreign_keys = ON;
        PRAGMA journal_mode = DELETE;
        PRAGMA synchronous = NORMAL;

        CREATE TABLE pack_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE library_catalogs (
          id TEXT PRIMARY KEY,
          position INTEGER NOT NULL,
          name TEXT NOT NULL,
          export_locked INTEGER NOT NULL DEFAULT 0,
          favorite INTEGER NOT NULL DEFAULT 0,
          allow_export_all INTEGER NOT NULL DEFAULT 1,
          allow_export_folders INTEGER NOT NULL DEFAULT 1,
          allow_export_sections INTEGER NOT NULL DEFAULT 1,
          allow_library_editing INTEGER NOT NULL DEFAULT 1,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE library_folders (
          id TEXT PRIMARY KEY,
          library_id TEXT NOT NULL,
          position INTEGER NOT NULL,
          order_ref TEXT,
          name TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE library_sections (
          id TEXT PRIMARY KEY,
          library_id TEXT NOT NULL,
          folder_id TEXT NOT NULL,
          parent_section_id TEXT,
          position INTEGER NOT NULL,
          order_ref TEXT,
          name TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE library_pages (
          id TEXT PRIMARY KEY,
          library_id TEXT NOT NULL,
          folder_id TEXT NOT NULL,
          section_id TEXT NOT NULL,
          position INTEGER NOT NULL,
          order_ref TEXT,
          name TEXT,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE library_items (
          id TEXT PRIMARY KEY,
          library_id TEXT NOT NULL,
          folder_id TEXT NOT NULL,
          section_id TEXT NOT NULL,
          page_id TEXT,
          position INTEGER NOT NULL,
          type TEXT NOT NULL,
          reference TEXT NOT NULL DEFAULT '',
          description TEXT NOT NULL DEFAULT '',
          unit TEXT NOT NULL DEFAULT '',
          quantity REAL NOT NULL DEFAULT 0,
          quantity_decimals INTEGER,
          rate REAL NOT NULL DEFAULT 0,
          total REAL NOT NULL DEFAULT 0,
          dimension_rows TEXT,
          trade_package_id TEXT,
          rate_source TEXT,
          ai_locks TEXT,
          rate_build_up TEXT,
          updated_at TEXT NOT NULL
        );
        "#,
    )
    .map_err(|e| format!("Unable to create library pack schema: {e}"))
}

fn create_pack_indexes(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        CREATE INDEX IF NOT EXISTS idx_pack_folders_library ON library_folders(library_id, position);
        CREATE INDEX IF NOT EXISTS idx_pack_sections_folder ON library_sections(folder_id, position);
        CREATE INDEX IF NOT EXISTS idx_pack_pages_section ON library_pages(section_id, position);
        CREATE INDEX IF NOT EXISTS idx_pack_items_section ON library_items(section_id, page_id, position);
        CREATE INDEX IF NOT EXISTS idx_pack_items_library ON library_items(library_id);
        "#,
    )
    .map_err(|e| format!("Unable to index library pack: {e}"))
}

fn insert_selected_library_ids(conn: &Connection, library_ids: &[String]) -> Result<(), String> {
    conn.execute_batch("CREATE TEMP TABLE selected_library_ids (id TEXT PRIMARY KEY);")
        .map_err(|e| format!("Unable to prepare selected library list: {e}"))?;
    let mut stmt = conn
        .prepare("INSERT INTO selected_library_ids (id) VALUES (?1)")
        .map_err(|e| format!("Unable to prepare selected library insert: {e}"))?;
    for id in library_ids {
        stmt.execute(params![id])
            .map_err(|e| format!("Unable to stage selected library id: {e}"))?;
    }
    Ok(())
}

fn export_pack_from_paths(
    source_path: &Path,
    library_ids: Vec<String>,
    permissions: Option<LibraryPackPermissions>,
    destination_path: String,
    progress_sink: PackProgressSink<'_>,
) -> Result<LibraryPackExportResult, String> {
    let library_ids: Vec<String> = library_ids
        .into_iter()
        .filter(|id| !id.trim().is_empty())
        .collect();
    if library_ids.is_empty() {
        return Err("No libraries were selected for export.".to_string());
    }
    let total_libraries = library_ids.len();
    report_pack_progress(
        progress_sink,
        "export",
        "preflight",
        "Checking live database and destination...",
        0,
        total_libraries,
        0,
        0,
    );

    if !source_path.exists() {
        return Err(format!(
            "The live SQLite database could not be found at {}.",
            source_path.display()
        ));
    }

    let destination = PathBuf::from(destination_path);
    if source_path == destination.as_path() {
        return Err("The library pack cannot overwrite the live app database.".to_string());
    }
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Unable to create export directory: {e}"))?;
    }
    if destination.exists() {
        fs::remove_file(&destination)
            .map_err(|e| format!("Unable to replace existing library pack: {e}"))?;
    }

    let conn = Connection::open(&destination)
        .map_err(|e| format!("Unable to create library pack database: {e}"))?;
    conn.execute_batch("PRAGMA page_size = 4096;")
        .map_err(|e| format!("Unable to initialise library pack: {e}"))?;
    create_pack_schema(&conn)?;
    conn.execute(
        "ATTACH DATABASE ?1 AS live",
        params![source_path.to_string_lossy()],
    )
    .map_err(|e| format!("Unable to attach live database: {e}"))?;
    insert_selected_library_ids(&conn, &library_ids)?;

    let total_items: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM live.library_items WHERE library_id IN (SELECT id FROM selected_library_ids)",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);
    report_pack_progress(
        progress_sink,
        "export",
        "copying",
        format!(
            "Copying {} selected librar{} with {} item row{}...",
            total_libraries,
            if total_libraries == 1 { "y" } else { "ies" },
            total_items,
            if total_items == 1 { "" } else { "s" }
        ),
        0,
        total_libraries,
        0,
        total_items,
    );

    let allow_export_all = bool_int(
        permissions
            .as_ref()
            .and_then(|entry| entry.allow_export_all),
        true,
    );
    let allow_export_folders = bool_int(
        permissions
            .as_ref()
            .and_then(|entry| entry.allow_export_folders),
        true,
    );
    let allow_export_sections = bool_int(
        permissions
            .as_ref()
            .and_then(|entry| entry.allow_export_sections),
        true,
    );
    let allow_library_editing = bool_int(
        permissions
            .as_ref()
            .and_then(|entry| entry.allow_library_editing),
        true,
    );

    let permissions_json = serde_json::to_string(&permissions)
        .map_err(|e| format!("Unable to serialize library pack permissions: {e}"))?;
    let library_ids_json = serde_json::to_string(&library_ids)
        .map_err(|e| format!("Unable to serialize selected library ids: {e}"))?;

    conn.execute_batch("BEGIN IMMEDIATE")
        .map_err(|e| format!("Unable to start library pack export: {e}"))?;
    let copy_result = (|| -> Result<(), String> {
        conn.execute(
            "INSERT INTO pack_meta (key, value) VALUES
             ('format', ?1),
             ('version', ?2),
             ('permissions', ?3),
             ('library_ids', ?4)",
            params![
                PACK_FORMAT,
                PACK_VERSION.to_string(),
                permissions_json,
                library_ids_json
            ],
        )
        .map_err(|e| format!("Unable to write library pack metadata: {e}"))?;

        conn.execute(
            r#"
            INSERT INTO library_catalogs (
              id, position, name, export_locked, favorite,
              allow_export_all, allow_export_folders, allow_export_sections, allow_library_editing,
              updated_at
            )
            SELECT
              id, position, name,
              CASE WHEN ?1 = 1 THEN 0 ELSE 1 END,
              favorite,
              ?1, ?2, ?3, ?4,
              updated_at
            FROM live.library_catalogs
            WHERE id IN (SELECT id FROM selected_library_ids)
            "#,
            params![
                allow_export_all,
                allow_export_folders,
                allow_export_sections,
                allow_library_editing
            ],
        )
        .map_err(|e| format!("Unable to copy library catalog rows: {e}"))?;
        report_pack_progress(
            progress_sink,
            "export",
            "copying",
            "Copied library catalog rows.",
            0,
            total_libraries,
            0,
            total_items,
        );

        conn.execute(
            r#"
            INSERT INTO library_folders (id, library_id, position, order_ref, name, updated_at)
            SELECT id, library_id, position, order_ref, name, updated_at
            FROM live.library_folders
            WHERE library_id IN (SELECT id FROM selected_library_ids)
            "#,
            [],
        )
        .map_err(|e| format!("Unable to copy library folder rows: {e}"))?;
        report_pack_progress(
            progress_sink,
            "export",
            "copying",
            "Copied folder rows.",
            0,
            total_libraries,
            0,
            total_items,
        );

        conn.execute(
            r#"
            INSERT INTO library_sections (id, library_id, folder_id, parent_section_id, position, order_ref, name, updated_at)
            SELECT id, library_id, folder_id, parent_section_id, position, order_ref, name, updated_at
            FROM live.library_sections
            WHERE library_id IN (SELECT id FROM selected_library_ids)
            "#,
            [],
        )
        .map_err(|e| format!("Unable to copy library section rows: {e}"))?;
        report_pack_progress(
            progress_sink,
            "export",
            "copying",
            "Copied section rows.",
            0,
            total_libraries,
            0,
            total_items,
        );

        conn.execute(
            r#"
            INSERT INTO library_pages (id, library_id, folder_id, section_id, position, order_ref, name, updated_at)
            SELECT id, library_id, folder_id, section_id, position, order_ref, name, updated_at
            FROM live.library_pages
            WHERE library_id IN (SELECT id FROM selected_library_ids)
            "#,
            [],
        )
        .map_err(|e| format!("Unable to copy library page rows: {e}"))?;
        report_pack_progress(
            progress_sink,
            "export",
            "copying",
            "Copied page rows.",
            0,
            total_libraries,
            0,
            total_items,
        );

        let mut completed_items = 0_i64;
        for (index, library_id) in library_ids.iter().enumerate() {
            let inserted = conn.execute(
                r#"
                INSERT INTO library_items (
                  id, library_id, folder_id, section_id, page_id, position, type, reference, description,
                  unit, quantity, quantity_decimals, rate, total, dimension_rows, trade_package_id,
                  rate_source, ai_locks, rate_build_up, updated_at
                )
                SELECT
                  id, library_id, folder_id, section_id, page_id, position, type, reference, description,
                  unit, quantity, quantity_decimals, rate, total, dimension_rows, trade_package_id,
                  rate_source, ai_locks, rate_build_up, updated_at
                FROM live.library_items
                WHERE library_id = ?1
                "#,
                params![library_id],
            )
            .map_err(|e| format!("Unable to copy library item rows: {e}"))?;
            completed_items += inserted as i64;
            report_pack_progress(
                progress_sink,
                "export",
                "copying",
                format!(
                    "Copied item rows for library {} of {}.",
                    index + 1,
                    total_libraries
                ),
                index + 1,
                total_libraries,
                completed_items,
                total_items,
            );
        }

        Ok(())
    })();

    match copy_result {
        Ok(()) => conn
            .execute_batch("COMMIT")
            .map_err(|e| format!("Unable to finalize library pack export: {e}"))?,
        Err(error) => {
            let _ = conn.execute_batch("ROLLBACK");
            return Err(error);
        }
    }

    create_pack_indexes(&conn)?;
    report_pack_progress(
        progress_sink,
        "export",
        "indexing",
        "Creating pack indexes and compacting the file...",
        total_libraries,
        total_libraries,
        total_items,
        total_items,
    );
    conn.execute_batch("DETACH DATABASE live; VACUUM;")
        .map_err(|e| format!("Unable to compact library pack: {e}"))?;
    report_pack_progress(
        progress_sink,
        "export",
        "complete",
        "Library pack export complete.",
        total_libraries,
        total_libraries,
        total_items,
        total_items,
    );
    Ok(LibraryPackExportResult {
        exported_libraries: total_libraries,
        exported_items: total_items,
        destination_path: destination.to_string_lossy().to_string(),
    })
}

fn export_pack_impl(
    app: AppHandle,
    library_ids: Vec<String>,
    permissions: Option<LibraryPackPermissions>,
    destination_path: String,
) -> Result<LibraryPackExportResult, String> {
    let source_path = live_db_path(&app)?;
    let progress = |payload| emit_pack_progress(&app, payload);
    export_pack_from_paths(
        &source_path,
        library_ids,
        permissions,
        destination_path,
        Some(&progress),
    )
}

fn import_pack_from_paths(
    live_path: &Path,
    source_path: String,
    progress_sink: PackProgressSink<'_>,
) -> Result<LibraryPackImportResult, String> {
    report_pack_progress(
        progress_sink,
        "import",
        "preflight",
        "Checking selected library pack...",
        0,
        0,
        0,
        0,
    );
    if !live_path.exists() {
        return Err(format!(
            "The live SQLite database could not be found at {}.",
            live_path.display()
        ));
    }
    let source = PathBuf::from(source_path);
    if !source.exists() {
        return Err("The selected library pack does not exist.".to_string());
    }

    let conn = Connection::open(&live_path)
        .map_err(|e| format!("Unable to open live SQLite database: {e}"))?;
    conn.execute_batch("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 15000;")
        .map_err(|e| format!("Unable to initialise live database import: {e}"))?;
    conn.execute(
        "ATTACH DATABASE ?1 AS pack",
        params![source.to_string_lossy()],
    )
    .map_err(|e| {
        "This is not a valid SQLite .qsplib pack. Re-export using the latest build. ".to_string()
            + &e.to_string()
    })?;

    let format: String = conn
        .query_row(
            "SELECT value FROM pack.pack_meta WHERE key = 'format'",
            [],
            |row| row.get(0),
        )
        .map_err(|_| {
            "This is not a current SQLite .qsplib pack. Re-export using the latest build."
                .to_string()
        })?;
    if format != PACK_FORMAT {
        return Err(
            "This is not a current SQLite .qsplib pack. Re-export using the latest build."
                .to_string(),
        );
    }

    let library_ids: Vec<String> = {
        let mut stmt = conn
            .prepare("SELECT id FROM pack.library_catalogs")
            .map_err(|e| format!("Unable to read library pack catalogs: {e}"))?;
        let rows = stmt
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|e| format!("Unable to read library pack catalogs: {e}"))?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Unable to read library pack catalogs: {e}"))?
    };
    let imported_libraries = library_ids.len();
    report_pack_progress(
        progress_sink,
        "import",
        "preflight",
        format!(
            "Validated pack with {} librar{}.",
            imported_libraries,
            if imported_libraries == 1 { "y" } else { "ies" }
        ),
        0,
        imported_libraries,
        0,
        0,
    );

    conn.execute_batch("CREATE TEMP TABLE selected_import_library_ids (id TEXT PRIMARY KEY);")
        .map_err(|e| format!("Unable to prepare pack import: {e}"))?;
    {
        let mut stmt = conn
            .prepare("INSERT INTO selected_import_library_ids (id) VALUES (?1)")
            .map_err(|e| format!("Unable to prepare pack import: {e}"))?;
        for id in &library_ids {
            stmt.execute(params![id])
                .map_err(|e| format!("Unable to stage pack import: {e}"))?;
        }
    }

    let imported_items: i64 = conn
        .query_row("SELECT COUNT(*) FROM pack.library_items", [], |row| {
            row.get(0)
        })
        .unwrap_or(0);
    report_pack_progress(
        progress_sink,
        "import",
        "copying",
        format!(
            "Importing {} item row{} from SQLite pack...",
            imported_items,
            if imported_items == 1 { "" } else { "s" }
        ),
        0,
        imported_libraries,
        0,
        imported_items,
    );

    conn.execute_batch("BEGIN IMMEDIATE")
        .map_err(|e| format!("Unable to start library pack import: {e}"))?;
    let import_result = (|| -> Result<(), String> {
        conn.execute(
            "DELETE FROM library_catalogs WHERE id IN (SELECT id FROM selected_import_library_ids)",
            [],
        )
        .map_err(|e| format!("Unable to replace existing imported libraries: {e}"))?;
        report_pack_progress(
            progress_sink,
            "import",
            "copying",
            "Removed matching existing libraries.",
            0,
            imported_libraries,
            0,
            imported_items,
        );

        conn.execute(
            r#"
            INSERT INTO library_catalogs (
              id, position, name, export_locked, favorite,
              allow_export_all, allow_export_folders, allow_export_sections, allow_library_editing,
              updated_at
            )
            SELECT id, position, name, export_locked, favorite,
              allow_export_all, allow_export_folders, allow_export_sections, allow_library_editing,
              updated_at
            FROM pack.library_catalogs
            "#,
            [],
        )
        .map_err(|e| format!("Unable to import library catalogs: {e}"))?;
        report_pack_progress(
            progress_sink,
            "import",
            "copying",
            "Imported catalog rows.",
            0,
            imported_libraries,
            0,
            imported_items,
        );

        conn.execute(
            r#"
            INSERT INTO library_folders (id, library_id, position, order_ref, name, updated_at)
            SELECT id, library_id, position, order_ref, name, updated_at
            FROM pack.library_folders
            "#,
            [],
        )
        .map_err(|e| format!("Unable to import library folders: {e}"))?;
        report_pack_progress(
            progress_sink,
            "import",
            "copying",
            "Imported folder rows.",
            0,
            imported_libraries,
            0,
            imported_items,
        );

        conn.execute(
            r#"
            INSERT INTO library_sections (id, library_id, folder_id, parent_section_id, position, order_ref, name, updated_at)
            SELECT id, library_id, folder_id, parent_section_id, position, order_ref, name, updated_at
            FROM pack.library_sections
            "#,
            [],
        )
        .map_err(|e| format!("Unable to import library sections: {e}"))?;
        report_pack_progress(
            progress_sink,
            "import",
            "copying",
            "Imported section rows.",
            0,
            imported_libraries,
            0,
            imported_items,
        );

        conn.execute(
            r#"
            INSERT INTO library_pages (id, library_id, folder_id, section_id, position, order_ref, name, updated_at)
            SELECT id, library_id, folder_id, section_id, position, order_ref, name, updated_at
            FROM pack.library_pages
            "#,
            [],
        )
        .map_err(|e| format!("Unable to import library pages: {e}"))?;
        report_pack_progress(
            progress_sink,
            "import",
            "copying",
            "Imported page rows.",
            0,
            imported_libraries,
            0,
            imported_items,
        );

        let mut completed_items = 0_i64;
        for (index, library_id) in library_ids.iter().enumerate() {
            let inserted = conn.execute(
                r#"
                INSERT INTO library_items (
                  id, library_id, folder_id, section_id, page_id, position, type, reference, description,
                  unit, quantity, quantity_decimals, rate, total, dimension_rows, trade_package_id,
                  rate_source, ai_locks, rate_build_up, search_text, updated_at
                )
                SELECT
                  id, library_id, folder_id, section_id, page_id, position, type, reference, description,
                  unit, quantity, quantity_decimals, rate, total, dimension_rows, trade_package_id,
                  rate_source, ai_locks, rate_build_up,
                  lower(trim(coalesce(reference, '') || ' ' || coalesce(description, '') || ' ' || coalesce(unit, '') || ' ' || coalesce(type, ''))),
                  updated_at
                FROM pack.library_items
                WHERE library_id = ?1
                "#,
                params![library_id],
            )
            .map_err(|e| format!("Unable to import library items: {e}"))?;
            completed_items += inserted as i64;
            report_pack_progress(
                progress_sink,
                "import",
                "copying",
                format!(
                    "Imported item rows for library {} of {}.",
                    index + 1,
                    imported_libraries
                ),
                index + 1,
                imported_libraries,
                completed_items,
                imported_items,
            );
        }

        conn.execute(
            r#"
            INSERT INTO library_stats (
              library_id, folder_count, section_count, item_count, priced_count, updated_at
            )
            SELECT
              c.id,
              COALESCE(f.folder_count, 0),
              COALESCE(s.section_count, 0),
              COALESCE(i.item_count, 0),
              COALESCE(i.priced_count, 0),
              datetime('now')
            FROM library_catalogs c
            LEFT JOIN (
              SELECT library_id, COUNT(*) AS folder_count
              FROM library_folders
              GROUP BY library_id
            ) f ON f.library_id = c.id
            LEFT JOIN (
              SELECT library_id, COUNT(*) AS section_count
              FROM library_sections
              GROUP BY library_id
            ) s ON s.library_id = c.id
            LEFT JOIN (
              SELECT library_id,
                COUNT(*) AS item_count,
                SUM(CASE WHEN type IN ('PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM') THEN 1 ELSE 0 END) AS priced_count
              FROM library_items
              GROUP BY library_id
            ) i ON i.library_id = c.id
            WHERE c.id IN (SELECT id FROM selected_import_library_ids)
            ON CONFLICT(library_id) DO UPDATE SET
              folder_count = excluded.folder_count,
              section_count = excluded.section_count,
              item_count = excluded.item_count,
              priced_count = excluded.priced_count,
              updated_at = excluded.updated_at
            "#,
            [],
        )
        .map_err(|e| format!("Unable to update imported library stats: {e}"))?;
        report_pack_progress(
            progress_sink,
            "import",
            "indexing",
            "Updated imported library stats.",
            imported_libraries,
            imported_libraries,
            imported_items,
            imported_items,
        );

        Ok(())
    })();

    match import_result {
        Ok(()) => conn
            .execute_batch("COMMIT")
            .map_err(|e| format!("Unable to finalize library pack import: {e}"))?,
        Err(error) => {
            let _ = conn.execute_batch("ROLLBACK");
            return Err(error);
        }
    }

    conn.execute_batch("DETACH DATABASE pack;")
        .map_err(|e| format!("Unable to close library pack: {e}"))?;

    report_pack_progress(
        progress_sink,
        "import",
        "complete",
        "Library pack import complete.",
        imported_libraries,
        imported_libraries,
        imported_items,
        imported_items,
    );

    Ok(LibraryPackImportResult {
        imported_libraries,
        imported_items,
    })
}

fn import_pack_impl(
    app: AppHandle,
    source_path: String,
) -> Result<LibraryPackImportResult, String> {
    let live_path = live_db_path(&app)?;
    let progress = |payload| emit_pack_progress(&app, payload);
    import_pack_from_paths(&live_path, source_path, Some(&progress))
}

#[tauri::command]
pub async fn export_library_sqlite_pack(
    app: AppHandle,
    library_ids: Vec<String>,
    permissions: Option<LibraryPackPermissions>,
    destination_path: String,
) -> Result<LibraryPackExportResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        export_pack_impl(app, library_ids, permissions, destination_path)
    })
    .await
    .map_err(|e| format!("Library pack export task failed: {e}"))?
}

#[tauri::command]
pub async fn import_library_sqlite_pack(
    app: AppHandle,
    source_path: String,
) -> Result<LibraryPackImportResult, String> {
    tauri::async_runtime::spawn_blocking(move || import_pack_impl(app, source_path))
        .await
        .map_err(|e| format!("Library pack import task failed: {e}"))?
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
                "hzl-pack-test-{name}-{}-{timestamp}",
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

    fn create_live_schema(path: &Path) -> Connection {
        let conn = Connection::open(path).expect("live test database should open");
        conn.execute_batch(
            r#"
            PRAGMA foreign_keys = ON;

            CREATE TABLE library_catalogs (
              id TEXT PRIMARY KEY,
              position INTEGER NOT NULL,
              name TEXT NOT NULL,
              export_locked INTEGER NOT NULL DEFAULT 0,
              favorite INTEGER NOT NULL DEFAULT 0,
              allow_export_all INTEGER NOT NULL DEFAULT 1,
              allow_export_folders INTEGER NOT NULL DEFAULT 1,
              allow_export_sections INTEGER NOT NULL DEFAULT 1,
              allow_library_editing INTEGER NOT NULL DEFAULT 1,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE library_folders (
              id TEXT PRIMARY KEY,
              library_id TEXT NOT NULL,
              position INTEGER NOT NULL,
              order_ref TEXT,
              name TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY(library_id) REFERENCES library_catalogs(id) ON DELETE CASCADE
            );

            CREATE TABLE library_sections (
              id TEXT PRIMARY KEY,
              library_id TEXT NOT NULL,
              folder_id TEXT NOT NULL,
              parent_section_id TEXT,
              position INTEGER NOT NULL,
              order_ref TEXT,
              name TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY(library_id) REFERENCES library_catalogs(id) ON DELETE CASCADE,
              FOREIGN KEY(folder_id) REFERENCES library_folders(id) ON DELETE CASCADE,
              FOREIGN KEY(parent_section_id) REFERENCES library_sections(id) ON DELETE CASCADE
            );

            CREATE TABLE library_pages (
              id TEXT PRIMARY KEY,
              library_id TEXT NOT NULL,
              folder_id TEXT NOT NULL,
              section_id TEXT NOT NULL,
              position INTEGER NOT NULL,
              order_ref TEXT,
              name TEXT,
              updated_at TEXT NOT NULL,
              FOREIGN KEY(library_id) REFERENCES library_catalogs(id) ON DELETE CASCADE,
              FOREIGN KEY(folder_id) REFERENCES library_folders(id) ON DELETE CASCADE,
              FOREIGN KEY(section_id) REFERENCES library_sections(id) ON DELETE CASCADE
            );

            CREATE TABLE library_items (
              id TEXT PRIMARY KEY,
              library_id TEXT NOT NULL,
              folder_id TEXT NOT NULL,
              section_id TEXT NOT NULL,
              page_id TEXT,
              position INTEGER NOT NULL,
              type TEXT NOT NULL,
              reference TEXT NOT NULL DEFAULT '',
              description TEXT NOT NULL DEFAULT '',
              unit TEXT NOT NULL DEFAULT '',
              quantity REAL NOT NULL DEFAULT 0,
              quantity_decimals INTEGER,
              rate REAL NOT NULL DEFAULT 0,
              total REAL NOT NULL DEFAULT 0,
              dimension_rows TEXT,
              trade_package_id TEXT,
              rate_source TEXT,
              ai_locks TEXT,
              rate_build_up TEXT,
              search_text TEXT NOT NULL DEFAULT '',
              updated_at TEXT NOT NULL,
              FOREIGN KEY(library_id) REFERENCES library_catalogs(id) ON DELETE CASCADE,
              FOREIGN KEY(folder_id) REFERENCES library_folders(id) ON DELETE CASCADE,
              FOREIGN KEY(section_id) REFERENCES library_sections(id) ON DELETE CASCADE,
              FOREIGN KEY(page_id) REFERENCES library_pages(id) ON DELETE CASCADE
            );

            CREATE TABLE library_stats (
              library_id TEXT PRIMARY KEY,
              folder_count INTEGER NOT NULL DEFAULT 0,
              section_count INTEGER NOT NULL DEFAULT 0,
              item_count INTEGER NOT NULL DEFAULT 0,
              priced_count INTEGER NOT NULL DEFAULT 0,
              updated_at TEXT NOT NULL,
              FOREIGN KEY(library_id) REFERENCES library_catalogs(id) ON DELETE CASCADE
            );
            "#,
        )
        .expect("live test schema should be created");
        conn
    }

    fn seed_library(conn: &Connection, library_id: &str, name: &str, position: i64) {
        let folder_id = format!("{library_id}-folder");
        let section_id = format!("{library_id}-section");
        let child_section_id = format!("{library_id}-child-section");
        let page_id = format!("{library_id}-page");
        let priced_item_id = format!("{library_id}-priced");
        let comment_item_id = format!("{library_id}-comment");

        conn.execute(
            r#"
            INSERT INTO library_catalogs (
              id, position, name, export_locked, favorite,
              allow_export_all, allow_export_folders, allow_export_sections, allow_library_editing,
              updated_at
            ) VALUES (?1, ?2, ?3, 0, 0, 1, 1, 1, 1, '2026-06-15T00:00:00Z')
            "#,
            params![library_id, position, name],
        )
        .expect("catalog should insert");
        conn.execute(
            "INSERT INTO library_folders (id, library_id, position, order_ref, name, updated_at) VALUES (?1, ?2, 0, '1', 'Folder', '2026-06-15T00:00:00Z')",
            params![folder_id, library_id],
        )
        .expect("folder should insert");
        conn.execute(
            "INSERT INTO library_sections (id, library_id, folder_id, parent_section_id, position, order_ref, name, updated_at) VALUES (?1, ?2, ?3, NULL, 0, '1A', 'Root Section', '2026-06-15T00:00:00Z')",
            params![section_id, library_id, folder_id],
        )
        .expect("section should insert");
        conn.execute(
            "INSERT INTO library_sections (id, library_id, folder_id, parent_section_id, position, order_ref, name, updated_at) VALUES (?1, ?2, ?3, ?4, 0, '1.010', 'Child Section', '2026-06-15T00:00:00Z')",
            params![child_section_id, library_id, folder_id, section_id],
        )
        .expect("child section should insert");
        conn.execute(
            "INSERT INTO library_pages (id, library_id, folder_id, section_id, position, order_ref, name, updated_at) VALUES (?1, ?2, ?3, ?4, 0, 'P1', 'Page One', '2026-06-15T00:00:00Z')",
            params![page_id, library_id, folder_id, section_id],
        )
        .expect("page should insert");
        conn.execute(
            r#"
            INSERT INTO library_items (
              id, library_id, folder_id, section_id, page_id, position, type, reference, description,
              unit, quantity, quantity_decimals, rate, total, dimension_rows, trade_package_id,
              rate_source, ai_locks, rate_build_up, search_text, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, 0, 'PRICED', 'A10/1', 'Excavate trench', 'nr', 1, NULL, 12.5, 12.5, NULL, NULL, NULL, NULL, NULL, 'source search text should not export', '2026-06-15T00:00:00Z')
            "#,
            params![priced_item_id, library_id, folder_id, section_id, page_id],
        )
        .expect("priced item should insert");
        conn.execute(
            r#"
            INSERT INTO library_items (
              id, library_id, folder_id, section_id, page_id, position, type, reference, description,
              unit, quantity, quantity_decimals, rate, total, dimension_rows, trade_package_id,
              rate_source, ai_locks, rate_build_up, search_text, updated_at
            ) VALUES (?1, ?2, ?3, ?4, NULL, 0, 'COMMENT', '', 'Child note for import', '', 0, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, 'source comment search text should not export', '2026-06-15T00:00:00Z')
            "#,
            params![comment_item_id, library_id, folder_id, child_section_id],
        )
        .expect("comment item should insert");
    }

    fn export_test_pack(source_path: &Path, pack_path: &Path) -> LibraryPackExportResult {
        export_pack_from_paths(
            source_path,
            vec!["lib-one".to_string()],
            Some(LibraryPackPermissions {
                allow_export_all: Some(false),
                allow_export_folders: Some(true),
                allow_export_sections: Some(false),
                allow_library_editing: Some(false),
            }),
            pack_path.to_string_lossy().to_string(),
            None,
        )
        .expect("pack export should succeed")
    }

    #[test]
    fn exports_selected_sqlite_pack_without_search_text() {
        let dir = TestDir::new("export");
        let source_path = dir.join("live.db");
        let pack_path = dir.join("export.qsplib");
        let source = create_live_schema(&source_path);
        seed_library(&source, "lib-one", "Library One", 0);
        seed_library(&source, "lib-two", "Library Two", 1);
        drop(source);

        let result = export_test_pack(&source_path, &pack_path);

        assert_eq!(result.exported_libraries, 1);
        assert_eq!(result.exported_items, 2);
        assert_eq!(result.destination_path, pack_path.to_string_lossy());

        let pack = Connection::open(pack_path).expect("pack should open as SQLite");
        let format: String = pack
            .query_row(
                "SELECT value FROM pack_meta WHERE key = 'format'",
                [],
                |row| row.get(0),
            )
            .expect("format metadata should exist");
        let catalog_count: i64 = pack
            .query_row("SELECT COUNT(*) FROM library_catalogs", [], |row| {
                row.get(0)
            })
            .expect("catalog count should be readable");
        let item_count: i64 = pack
            .query_row("SELECT COUNT(*) FROM library_items", [], |row| row.get(0))
            .expect("item count should be readable");
        let permission_row: (i64, i64, i64, i64) = pack
            .query_row(
                "SELECT export_locked, allow_export_all, allow_export_sections, allow_library_editing FROM library_catalogs WHERE id = 'lib-one'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .expect("permissions should be readable");
        let search_column_count: i64 = pack
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('library_items') WHERE name = 'search_text'",
                [],
                |row| row.get(0),
            )
            .expect("pack table info should be readable");

        assert_eq!(format, PACK_FORMAT);
        assert_eq!(catalog_count, 1);
        assert_eq!(item_count, 2);
        assert_eq!(permission_row, (1, 0, 0, 0));
        assert_eq!(search_column_count, 0);
    }

    #[test]
    fn imports_sqlite_pack_replacing_rows_and_rebuilding_search_text() {
        let dir = TestDir::new("import");
        let source_path = dir.join("source-live.db");
        let target_path = dir.join("target-live.db");
        let pack_path = dir.join("roundtrip.qsplib");
        let source = create_live_schema(&source_path);
        seed_library(&source, "lib-one", "Library One", 0);
        drop(source);
        export_test_pack(&source_path, &pack_path);

        let target = create_live_schema(&target_path);
        seed_library(&target, "lib-one", "Stale Library", 0);
        target
            .execute(
                "UPDATE library_items SET id = 'stale-item' WHERE id = 'lib-one-priced'",
                [],
            )
            .expect("stale item should be renamed");
        drop(target);

        let result =
            import_pack_from_paths(&target_path, pack_path.to_string_lossy().to_string(), None)
                .expect("pack import should succeed");

        assert_eq!(result.imported_libraries, 1);
        assert_eq!(result.imported_items, 2);

        let target = Connection::open(target_path).expect("target should open");
        let stale_count: i64 = target
            .query_row(
                "SELECT COUNT(*) FROM library_items WHERE id = 'stale-item'",
                [],
                |row| row.get(0),
            )
            .expect("stale count should be readable");
        let imported_item_count: i64 = target
            .query_row(
                "SELECT COUNT(*) FROM library_items WHERE library_id = 'lib-one'",
                [],
                |row| row.get(0),
            )
            .expect("imported item count should be readable");
        let search_text: String = target
            .query_row(
                "SELECT search_text FROM library_items WHERE id = 'lib-one-priced'",
                [],
                |row| row.get(0),
            )
            .expect("imported search text should exist");
        let stats: (i64, i64, i64, i64) = target
            .query_row(
                "SELECT folder_count, section_count, item_count, priced_count FROM library_stats WHERE library_id = 'lib-one'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .expect("stats should be updated");

        assert_eq!(stale_count, 0);
        assert_eq!(imported_item_count, 2);
        assert_eq!(search_text, "a10/1 excavate trench nr priced");
        assert_eq!(stats, (1, 2, 2, 1));
    }

    #[test]
    fn rejects_non_sqlite_library_pack_files() {
        let dir = TestDir::new("invalid");
        let target_path = dir.join("target-live.db");
        let invalid_pack_path = dir.join("old-table-dump.qsplib");
        let target = create_live_schema(&target_path);
        drop(target);
        fs::write(&invalid_pack_path, b"{\"table\":\"library_catalogs\"}\n")
            .expect("invalid pack fixture should be written");

        let error = import_pack_from_paths(
            &target_path,
            invalid_pack_path.to_string_lossy().to_string(),
            None,
        )
        .expect_err("invalid packs should be rejected");

        assert!(
            error.contains("not a valid SQLite .qsplib pack")
                || error.contains("not a current SQLite .qsplib pack"),
            "unexpected error: {error}"
        );
    }
}
