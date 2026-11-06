// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app_backup;
mod app_evidence;
mod app_expiry;
mod gemini;
mod library_pack;
mod local_ai;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            gemini::is_gemini_configured,
            gemini::get_gemini_config_status,
            gemini::import_gemini_config,
            gemini::import_gemini_config_json,
            gemini::validate_and_store_gemini_config_json,
            gemini::remove_gemini_config,
            gemini::gemini_generate_content,
            local_ai::local_ai_status,
            local_ai::local_ai_create_model_dir,
            local_ai::local_ai_start_server,
            local_ai::local_ai_load_model,
            local_ai::local_ai_test_completion,
            local_ai::local_ai_chat_completion,
            app_expiry::get_app_expiry_status,
            app_backup::export_app_data_backup,
            app_backup::restore_app_data_backup,
            app_evidence::store_appraisal_evidence,
            app_evidence::read_appraisal_evidence,
            app_evidence::verify_appraisal_evidence,
            library_pack::export_library_sqlite_pack,
            library_pack::import_library_sqlite_pack,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
