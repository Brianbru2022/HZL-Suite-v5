use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::{
    fs,
    path::{Component, Path, PathBuf},
};
use tauri::{AppHandle, Manager};

const EVIDENCE_DIR: &str = "evidence";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedEvidenceWriteResult {
    local_evidence_path: String,
    content_sha256: String,
    size: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedEvidenceReadResult {
    data_base64: String,
    content_sha256: String,
    size: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManagedEvidenceVerification {
    exists: bool,
    content_sha256: Option<String>,
}

fn evidence_root(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Unable to locate app data directory: {error}"))?;
    Ok(app_data.join(EVIDENCE_DIR))
}

fn safe_component(value: &str, fallback: &str) -> String {
    let clean: String = value
        .chars()
        .map(|character| if character.is_ascii_alphanumeric() || matches!(character, '.' | '-' | '_') { character } else { '_' })
        .collect();
    let trimmed = clean.trim_matches(['.', '_']);
    if trimmed.is_empty() { fallback.to_string() } else { trimmed.to_string() }
}

fn safe_managed_path(app: &AppHandle, local_evidence_path: &str) -> Result<PathBuf, String> {
    let relative = Path::new(local_evidence_path);
    if relative.is_absolute()
        || relative.components().any(|component| !matches!(component, Component::Normal(_)))
    {
        return Err("The evidence path is not a valid managed local path.".to_string());
    }
    let root = evidence_root(app)?;
    let candidate = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Unable to locate app data directory: {error}"))?
        .join(relative);
    if !candidate.starts_with(&root) {
        return Err("The evidence path is outside the managed evidence folder.".to_string());
    }
    Ok(candidate)
}

fn sha256_hex(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

#[tauri::command]
pub fn store_appraisal_evidence(
    app: AppHandle,
    evidence_id: String,
    file_name: String,
    _mime_type: String,
    data_base64: String,
) -> Result<ManagedEvidenceWriteResult, String> {
    let bytes = STANDARD
        .decode(data_base64)
        .map_err(|error| format!("Unable to decode appraisal evidence: {error}"))?;
    let root = evidence_root(&app)?;
    let id = safe_component(&evidence_id, "evidence");
    let file_name = safe_component(&file_name, "evidence.bin");
    let directory = root.join(&id);
    fs::create_dir_all(&directory)
        .map_err(|error| format!("Unable to create evidence storage: {error}"))?;

    let destination = directory.join(file_name);
    let temporary = directory.join(".uploading");
    fs::write(&temporary, &bytes)
        .map_err(|error| format!("Unable to write appraisal evidence: {error}"))?;
    if destination.exists() {
        fs::remove_file(&destination)
            .map_err(|error| format!("Unable to replace existing appraisal evidence: {error}"))?;
    }
    fs::rename(&temporary, &destination)
        .map_err(|error| format!("Unable to finalise appraisal evidence: {error}"))?;

    Ok(ManagedEvidenceWriteResult {
        local_evidence_path: format!("{EVIDENCE_DIR}/{id}/{}", destination.file_name().unwrap_or_default().to_string_lossy()),
        content_sha256: sha256_hex(&bytes),
        size: bytes.len() as u64,
    })
}

#[tauri::command]
pub fn read_appraisal_evidence(
    app: AppHandle,
    local_evidence_path: String,
) -> Result<ManagedEvidenceReadResult, String> {
    let path = safe_managed_path(&app, &local_evidence_path)?;
    let bytes = fs::read(&path)
        .map_err(|error| format!("Unable to read managed appraisal evidence: {error}"))?;
    Ok(ManagedEvidenceReadResult {
        data_base64: STANDARD.encode(&bytes),
        content_sha256: sha256_hex(&bytes),
        size: bytes.len() as u64,
    })
}

#[tauri::command]
pub fn verify_appraisal_evidence(
    app: AppHandle,
    local_evidence_path: String,
    expected_sha256: Option<String>,
) -> Result<ManagedEvidenceVerification, String> {
    let path = safe_managed_path(&app, &local_evidence_path)?;
    if !path.exists() {
        return Ok(ManagedEvidenceVerification { exists: false, content_sha256: None });
    }
    let bytes = fs::read(&path)
        .map_err(|error| format!("Unable to verify managed appraisal evidence: {error}"))?;
    let hash = sha256_hex(&bytes);
    if let Some(expected) = expected_sha256 {
        if expected != hash {
            return Ok(ManagedEvidenceVerification { exists: true, content_sha256: Some(hash) });
        }
    }
    Ok(ManagedEvidenceVerification { exists: true, content_sha256: Some(hash) })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalises_storage_names_without_path_characters() {
        assert_eq!(safe_component("../Report 01.pdf", "file.bin"), "Report_01.pdf");
        assert_eq!(safe_component("", "file.bin"), "file.bin");
    }

    #[test]
    fn hashes_are_stable() {
        assert_eq!(sha256_hex(b"evidence"), "ee8250fb76e094b34b471f13a73dbbe51d1ae142e9df59d7c0d31ec20f0a0a8e");
    }
}
