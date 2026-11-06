use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{path::PathBuf, time::Duration};
use tokio::process::Command;

const DEFAULT_ENDPOINT: &str = "http://127.0.0.1:1234/v1";
const DEFAULT_MODEL_DIR: &str = r"C:\models";
const LOCAL_REPORT_IDENTIFIER: &str = "hzl-local-report";
const TEST_PROMPT: &str = "Reply with OK only.";
const LOCAL_AI_SYSTEM_PROMPT: &str = "You are a professional QS reporting assistant. Return only the requested visible response text, without hidden reasoning or analysis.";

fn prompt_without_thinking(prompt: &str) -> String {
    format!("/no_think\n{}", prompt.trim())
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalAiRequest {
    endpoint: Option<String>,
    model: Option<String>,
    model_directory: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalAiStatus {
    cli_available: bool,
    cli_path: Option<String>,
    server_available: bool,
    endpoint: String,
    loaded_models: Vec<String>,
    configured_model_loaded: bool,
    model_directory_exists: bool,
    model_directory: String,
    gpu_detected: bool,
    gpu_summary: Option<String>,
    message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalAiCommandResult {
    ok: bool,
    message: String,
    output: Option<String>,
}

fn endpoint_or_default(endpoint: Option<String>) -> Result<String, String> {
    let endpoint = endpoint.unwrap_or_else(|| DEFAULT_ENDPOINT.to_string());
    let trimmed = endpoint.trim().trim_end_matches('/').to_string();
    if trimmed.starts_with("http://127.0.0.1:")
        || trimmed.starts_with("http://localhost:")
        || trimmed == "http://127.0.0.1"
        || trimmed == "http://localhost"
    {
        Ok(trimmed)
    } else {
        Err("Local AI endpoint must be a localhost or 127.0.0.1 HTTP URL.".to_string())
    }
}

fn model_dir_or_default(model_directory: Option<String>) -> String {
    model_directory
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| DEFAULT_MODEL_DIR.to_string())
}

async fn run_allowed_command(program: &str, args: &[&str]) -> Result<(bool, String), String> {
    let allowed = matches!(program, "where" | "nvidia-smi" | "lms");
    if !allowed {
        return Err("Command is not allowed.".to_string());
    }

    let output = Command::new(program)
        .args(args)
        .output()
        .await
        .map_err(|e| format!("Unable to run {program}: {e}"))?;

    let mut text = String::new();
    text.push_str(&String::from_utf8_lossy(&output.stdout));
    text.push_str(&String::from_utf8_lossy(&output.stderr));
    Ok((output.status.success(), text.trim().to_string()))
}

async fn detect_lms() -> (bool, Option<String>) {
    match run_allowed_command("where", &["lms"]).await {
        Ok((true, output)) => {
            let first = output.lines().next().map(|line| line.trim().to_string());
            (true, first)
        }
        _ => (false, None),
    }
}

async fn detect_gpu() -> (bool, Option<String>) {
    match run_allowed_command("nvidia-smi", &[
        "--query-gpu=name,memory.total,driver_version",
        "--format=csv,noheader",
    ]).await {
        Ok((true, output)) if !output.trim().is_empty() => {
            (true, Some(output.lines().next().unwrap_or_default().trim().to_string()))
        }
        _ => (false, None),
    }
}

async fn list_models(endpoint: &str) -> Result<Vec<String>, String> {
    let url = format!("{endpoint}/models");
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;
    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("Local AI server returned {}.", res.status()));
    }
    let json = res.json::<Value>().await.map_err(|e| e.to_string())?;
    let models = json
        .get("data")
        .and_then(|value| value.as_array())
        .map(|rows| {
            rows.iter()
                .filter_map(|row| row.get("id").and_then(|id| id.as_str()).map(ToString::to_string))
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    Ok(models)
}

async fn chat_completion(endpoint: &str, model: &str, prompt: &str) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;
    let body = serde_json::json!({
        "model": model,
        "messages": [
            { "role": "system", "content": LOCAL_AI_SYSTEM_PROMPT },
            { "role": "user", "content": prompt_without_thinking(prompt) }
        ],
        "temperature": 0.2,
        "max_tokens": 4096,
        "stream": false
    });
    let res = client
        .post(format!("{endpoint}/chat/completions"))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Unable to call local AI server: {e}"))?;
    let status = res.status();
    let text = res.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(format!("Local AI completion failed ({status}): {text}"));
    }
    let json = serde_json::from_str::<Value>(&text).map_err(|e| e.to_string())?;
    let content = json
        .get("choices")
        .and_then(|choices| choices.as_array())
        .and_then(|choices| choices.first())
        .and_then(|choice| choice.get("message"))
        .and_then(|message| message.get("content"))
        .and_then(|content| content.as_str())
        .unwrap_or("")
        .trim()
        .to_string();
    if content.is_empty() {
        Err("Local AI returned an empty response.".to_string())
    } else {
        Ok(content)
    }
}

#[tauri::command]
pub async fn local_ai_status(request: LocalAiRequest) -> Result<LocalAiStatus, String> {
    let endpoint = endpoint_or_default(request.endpoint)?;
    let model = request.model.unwrap_or_default();
    let model_directory = model_dir_or_default(request.model_directory);
    let model_directory_exists = PathBuf::from(&model_directory).exists();
    let (cli_available, cli_path) = detect_lms().await;
    let (gpu_detected, gpu_summary) = detect_gpu().await;
    let loaded_models = list_models(&endpoint).await.unwrap_or_default();
    let server_available = !loaded_models.is_empty() || list_models(&endpoint).await.is_ok();
    let configured_model_loaded = !loaded_models.is_empty() || loaded_models.iter().any(|loaded| {
        loaded == LOCAL_REPORT_IDENTIFIER
            || (!model.trim().is_empty() && (loaded == &model || loaded.contains(&model)))
    });
    let message = if !cli_available {
        "LM Studio CLI was not found. Open LM Studio once and install/enable lms.".to_string()
    } else if !server_available {
        "LM Studio server is not responding yet.".to_string()
    } else if !configured_model_loaded {
        "LM Studio server is running; load the selected model before generation.".to_string()
    } else {
        "Local AI is ready.".to_string()
    };

    Ok(LocalAiStatus {
        cli_available,
        cli_path,
        server_available,
        endpoint,
        loaded_models,
        configured_model_loaded,
        model_directory_exists,
        model_directory,
        gpu_detected,
        gpu_summary,
        message,
    })
}

#[tauri::command]
pub fn local_ai_create_model_dir(model_directory: Option<String>) -> Result<LocalAiCommandResult, String> {
    let model_directory = model_dir_or_default(model_directory);
    std::fs::create_dir_all(&model_directory)
        .map_err(|e| format!("Unable to create {model_directory}: {e}"))?;
    Ok(LocalAiCommandResult {
        ok: true,
        message: format!("{model_directory} is ready."),
        output: None,
    })
}

#[tauri::command]
pub async fn local_ai_start_server() -> Result<LocalAiCommandResult, String> {
    let (success, output) = run_allowed_command("lms", &["server", "start"]).await?;
    Ok(LocalAiCommandResult {
        ok: success,
        message: if success {
            "LM Studio server start requested.".to_string()
        } else {
            "Unable to start LM Studio server via lms.".to_string()
        },
        output: Some(output),
    })
}

#[tauri::command]
pub async fn local_ai_load_model(model: String) -> Result<LocalAiCommandResult, String> {
    let trimmed = model.trim();
    if trimmed.is_empty() {
        return Err("Choose a local model before loading.".to_string());
    }
    let (success, output) = run_allowed_command("lms", &[
        "load",
        trimmed,
        "--gpu=max",
        "--context-length",
        "8192",
        "--identifier",
        LOCAL_REPORT_IDENTIFIER,
    ]).await?;
    Ok(LocalAiCommandResult {
        ok: success,
        message: if success {
            "Local model load requested with GPU offload.".to_string()
        } else {
            "Unable to load the selected local model.".to_string()
        },
        output: Some(output),
    })
}

#[tauri::command]
pub async fn local_ai_test_completion(request: LocalAiRequest) -> Result<LocalAiCommandResult, String> {
    let endpoint = endpoint_or_default(request.endpoint)?;
    let model = request.model.unwrap_or_else(|| LOCAL_REPORT_IDENTIFIER.to_string());
    let output = match chat_completion(&endpoint, &model, TEST_PROMPT).await {
        Ok(text) => text,
        Err(error) if model != LOCAL_REPORT_IDENTIFIER => {
            chat_completion(&endpoint, LOCAL_REPORT_IDENTIFIER, TEST_PROMPT)
                .await
                .map_err(|fallback_error| format!("{error} Fallback alias also failed: {fallback_error}"))?
        }
        Err(error) => return Err(error),
    };
    Ok(LocalAiCommandResult {
        ok: true,
        message: "Local AI test completed.".to_string(),
        output: Some(output),
    })
}

#[tauri::command]
pub async fn local_ai_chat_completion(
    request: LocalAiRequest,
    prompt: String,
) -> Result<String, String> {
    let endpoint = endpoint_or_default(request.endpoint)?;
    let model = request.model.unwrap_or_else(|| LOCAL_REPORT_IDENTIFIER.to_string());
    match chat_completion(&endpoint, &model, &prompt).await {
        Ok(text) => Ok(text),
        Err(error) if model != LOCAL_REPORT_IDENTIFIER => {
            chat_completion(&endpoint, LOCAL_REPORT_IDENTIFIER, &prompt)
                .await
                .map_err(|fallback_error| format!("{error} Fallback alias also failed: {fallback_error}"))
        }
        Err(error) => Err(error),
    }
}
