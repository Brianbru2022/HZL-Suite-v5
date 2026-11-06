//! Gemini API calls from the Tauri backend so the API key stays in private desktop storage.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{env, fs, path::PathBuf};
use tauri::{AppHandle, Manager};

const GEMINI_API_KEY_ENV: &str = "GEMINI_API_KEY";
const GEMINI_BASE_URL: &str = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_CONFIG_FILE: &str = "ai-config.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GeminiStoredConfig {
    provider: String,
    api_key: String,
    default_model: Option<String>,
    analysis_model: Option<String>,
    hierarchy_model: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GeminiConfigStatus {
    configured: bool,
    source: String,
    provider: Option<String>,
    config_path: Option<String>,
}

fn normalize_stored_config(raw: &str) -> Result<GeminiStoredConfig, String> {
    let mut parsed = serde_json::from_str::<GeminiStoredConfig>(raw)
        .map_err(|e| format!("AI config file is invalid JSON: {e}"))?;

    parsed.provider = if parsed.provider.trim().is_empty() {
        "gemini".to_string()
    } else {
        parsed.provider.trim().to_lowercase()
    };

    if parsed.provider != "gemini" {
        return Err("Only Gemini AI config files are currently supported.".to_string());
    }

    parsed.api_key = parsed.api_key.trim().to_string();
    if parsed.api_key.is_empty() {
        return Err("AI config file does not contain a valid apiKey.".to_string());
    }

    Ok(parsed)
}

fn ensure_env_loaded() {
    let _ = dotenvy::dotenv();
}

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Unable to locate app config directory: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("Unable to create app config directory: {e}"))?;
    Ok(dir.join(GEMINI_CONFIG_FILE))
}

fn read_stored_config(app: &AppHandle) -> Result<Option<GeminiStoredConfig>, String> {
    let path = config_path(app)?;
    if !path.exists() {
        return Ok(None);
    }

    let raw = fs::read_to_string(&path)
        .map_err(|e| format!("Unable to read stored AI configuration: {e}"))?;
    let parsed = serde_json::from_str::<GeminiStoredConfig>(&raw)
        .map_err(|e| format!("Stored AI configuration is invalid: {e}"))?;

    if parsed.api_key.trim().is_empty() {
        return Ok(None);
    }

    Ok(Some(parsed))
}

fn resolve_api_key(app: &AppHandle) -> Result<Option<(String, String)>, String> {
    ensure_env_loaded();

    if let Ok(api_key) = env::var(GEMINI_API_KEY_ENV) {
        let trimmed = api_key.trim().to_string();
        if !trimmed.is_empty() {
            return Ok(Some((trimmed, "env".to_string())));
        }
    }

    if let Some(config) = read_stored_config(app)? {
        return Ok(Some((
            config.api_key.trim().to_string(),
            "imported".to_string(),
        )));
    }

    Ok(None)
}

fn current_config_status(app: &AppHandle) -> Result<GeminiConfigStatus, String> {
    let path = config_path(app)?;
    ensure_env_loaded();

    if let Ok(api_key) = env::var(GEMINI_API_KEY_ENV) {
        if !api_key.trim().is_empty() {
            return Ok(GeminiConfigStatus {
                configured: true,
                source: "env".to_string(),
                provider: Some("gemini".to_string()),
                config_path: Some(path.to_string_lossy().to_string()),
            });
        }
    }

    if let Some(config) = read_stored_config(app)? {
        return Ok(GeminiConfigStatus {
            configured: true,
            source: "imported".to_string(),
            provider: Some(config.provider),
            config_path: Some(path.to_string_lossy().to_string()),
        });
    }

    Ok(GeminiConfigStatus {
        configured: false,
        source: "none".to_string(),
        provider: None,
        config_path: Some(path.to_string_lossy().to_string()),
    })
}

fn write_stored_config(app: &AppHandle, config: &GeminiStoredConfig) -> Result<(), String> {
    let path = config_path(app)?;
    let tmp_path = path.with_extension("json.tmp");
    let serialized = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Unable to serialize AI configuration: {e}"))?;

    fs::write(&tmp_path, serialized)
        .map_err(|e| format!("Unable to write AI configuration: {e}"))?;
    fs::rename(&tmp_path, &path)
        .map_err(|e| format!("Unable to finalize AI configuration: {e}"))?;

    Ok(())
}

#[tauri::command]
pub fn is_gemini_configured(app: AppHandle) -> Result<bool, String> {
    Ok(current_config_status(&app)?.configured)
}

#[tauri::command]
pub fn get_gemini_config_status(app: AppHandle) -> Result<GeminiConfigStatus, String> {
    current_config_status(&app)
}

#[tauri::command]
pub fn import_gemini_config(app: AppHandle, path: String) -> Result<GeminiConfigStatus, String> {
    let raw =
        fs::read_to_string(&path).map_err(|e| format!("Unable to read AI config file: {e}"))?;
    import_gemini_config_json(app, raw)
}

#[tauri::command]
pub fn import_gemini_config_json(
    app: AppHandle,
    json: String,
) -> Result<GeminiConfigStatus, String> {
    let parsed = normalize_stored_config(&json)?;

    write_stored_config(&app, &parsed)?;
    current_config_status(&app)
}

#[tauri::command]
pub async fn validate_and_store_gemini_config_json(
    app: AppHandle,
    json: String,
) -> Result<GeminiConfigStatus, String> {
    let parsed = normalize_stored_config(&json)?;
    let model = parsed
        .default_model
        .clone()
        .unwrap_or_else(|| "gemini-3.1-pro-preview".to_string());

    let url = format!("{}/models/{}:generateContent", GEMINI_BASE_URL, model);
    let body = serde_json::json!({
        "contents": [{
            "parts": [{ "text": "Reply with OK only." }]
        }]
    });

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let res = client
        .post(&url)
        .header("x-goog-api-key", parsed.api_key.trim())
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Unable to validate AI configuration: {e}"))?;

    let status = res.status();
    let text = res.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        let lower_text = text.to_lowercase();
        if status.as_u16() == 429
            && lower_text.contains("monthly spending cap")
            && lower_text.contains("project")
        {
            write_stored_config(&app, &parsed)?;
            return current_config_status(&app);
        }
        return Err(format!(
            "AI configuration validation failed ({}): {}",
            status, text
        ));
    }

    write_stored_config(&app, &parsed)?;
    current_config_status(&app)
}

#[tauri::command]
pub fn remove_gemini_config(app: AppHandle) -> Result<GeminiConfigStatus, String> {
    let path = config_path(&app)?;
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("Unable to remove AI configuration: {e}"))?;
    }
    current_config_status(&app)
}

/// Calls Gemini generateContent REST API. Keeps the API key server-side.
/// Returns the generated text from the first candidate, or an error string.
#[tauri::command]
pub async fn gemini_generate_content(
    app: AppHandle,
    model: String,
    contents: Value,
    generation_config: Option<Value>,
) -> Result<String, String> {
    let Some((api_key, _source)) = resolve_api_key(&app)? else {
        return Err(
            "Gemini is not configured. Import an AI config JSON in Settings or set GEMINI_API_KEY for local development."
                .to_string(),
        );
    };

    let url = format!("{}/models/{}:generateContent", GEMINI_BASE_URL, model);

    let body = match generation_config {
        Some(config) => {
            let mut gen_config = config.clone();
            // Tools must be top-level in the REST API; extract and convert to snake_case for API.
            let tools_value = gen_config.get("tools").cloned();
            if tools_value.is_some() {
                gen_config.as_object_mut().and_then(|o| o.remove("tools"));
            }
            let mut body = serde_json::json!({
                "contents": [contents],
                "generationConfig": gen_config
            });
            if let Some(tools) = tools_value {
                if let Some(arr) = tools.as_array() {
                    let api_tools: Vec<Value> = arr
                        .iter()
                        .map(|t| {
                            if t.get("googleSearch").is_some() {
                                serde_json::json!({ "google_search": {} })
                            } else {
                                t.clone()
                            }
                        })
                        .collect();
                    body["tools"] = serde_json::Value::Array(api_tools);
                }
            }
            body
        }
        None => serde_json::json!({
            "contents": [contents]
        }),
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;

    let res = client
        .post(&url)
        .header("x-goog-api-key", api_key.trim())
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = res.status();
    let text = res.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        return Err(format!("Gemini API error ({}): {}", status, text));
    }

    let json: Value = serde_json::from_str(&text).map_err(|e| format!("Invalid JSON: {}", e))?;
    let text_out = json
        .get("candidates")
        .and_then(|c| c.as_array())
        .and_then(|a| a.get(0))
        .and_then(|c| c.get("content"))
        .and_then(|c| c.get("parts"))
        .and_then(|p| p.as_array())
        .and_then(|p| p.get(0))
        .and_then(|p| p.get("text"))
        .and_then(|t| t.as_str())
        .unwrap_or("")
        .to_string();

    Ok(text_out)
}
