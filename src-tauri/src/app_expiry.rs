use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};

const RELEASE_PHASE: &str = "Beta";
const RELEASE_DATE_ISO: &str = "2026-05-08T00:00:00+01:00";
const DEFAULT_APP_EXPIRY_ISO: &str = "2026-12-31T23:59:59+00:00";
const DEFAULT_APP_EXPIRY_UNIX_SECONDS: u64 = 1_798_761_599;
const CLOCK_ROLLBACK_GRACE_SECONDS: u64 = 15 * 60;
const MARKER_FILE_NAME: &str = "qs-pro-expiry-marker.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppExpiryStatus {
    pub release_label: String,
    pub release_date_iso: String,
    pub expiry_date_iso: String,
    pub current_time_iso: String,
    pub current_unix_seconds: u64,
    pub expiry_unix_seconds: u64,
    pub expired: bool,
    pub clock_rollback_detected: bool,
    pub locked: bool,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExpiryMarker {
    last_seen_unix_seconds: u64,
}

fn current_unix_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn app_expiry_iso() -> &'static str {
    option_env!("HZL_QS_APP_EXPIRY_ISO")
        .filter(|value| DateTime::parse_from_rfc3339(value).is_ok())
        .unwrap_or(DEFAULT_APP_EXPIRY_ISO)
}

fn app_expiry_unix_seconds() -> u64 {
    DateTime::parse_from_rfc3339(app_expiry_iso())
        .map(|value| value.timestamp().max(0) as u64)
        .unwrap_or(DEFAULT_APP_EXPIRY_UNIX_SECONDS)
}

fn iso_from_unix_seconds(seconds: u64) -> String {
    DateTime::<Utc>::from(UNIX_EPOCH + std::time::Duration::from_secs(seconds)).to_rfc3339()
}

fn build_status(now: u64, clock_rollback_detected: bool) -> AppExpiryStatus {
    let expiry_unix_seconds = app_expiry_unix_seconds();
    let expired = now >= expiry_unix_seconds;
    let locked = expired || clock_rollback_detected;
    let reason = if clock_rollback_detected {
        "clock_rollback"
    } else if expired {
        "expired"
    } else {
        "valid"
    };

    AppExpiryStatus {
        release_label: format!("v{} {}", env!("CARGO_PKG_VERSION"), RELEASE_PHASE),
        release_date_iso: RELEASE_DATE_ISO.to_string(),
        expiry_date_iso: app_expiry_iso().to_string(),
        current_time_iso: iso_from_unix_seconds(now),
        current_unix_seconds: now,
        expiry_unix_seconds,
        expired,
        clock_rollback_detected,
        locked,
        reason: reason.to_string(),
    }
}

fn read_marker(app: &AppHandle) -> Option<ExpiryMarker> {
    let path = app.path().app_data_dir().ok()?.join(MARKER_FILE_NAME);
    let contents = fs::read_to_string(path).ok()?;
    serde_json::from_str(&contents).ok()
}

fn write_marker(app: &AppHandle, marker: &ExpiryMarker) {
    let Ok(dir) = app.path().app_data_dir() else {
        return;
    };
    if fs::create_dir_all(&dir).is_err() {
        return;
    }
    let Ok(contents) = serde_json::to_string(marker) else {
        return;
    };
    let _ = fs::write(dir.join(MARKER_FILE_NAME), contents);
}

pub fn evaluate_expiry(now: u64, last_seen: Option<u64>) -> AppExpiryStatus {
    let rollback = last_seen
        .map(|previous| now.saturating_add(CLOCK_ROLLBACK_GRACE_SECONDS) < previous)
        .unwrap_or(false);
    build_status(now, rollback)
}

#[tauri::command]
pub fn get_app_expiry_status(app: AppHandle) -> AppExpiryStatus {
    let now = current_unix_seconds();
    let last_seen = read_marker(&app).map(|marker| marker.last_seen_unix_seconds);
    let status = evaluate_expiry(now, last_seen);

    if !status.locked {
        write_marker(
            &app,
            &ExpiryMarker {
                last_seen_unix_seconds: last_seen.map_or(now, |previous| previous.max(now)),
            },
        );
    }

    status
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_before_expiry() {
        let status = evaluate_expiry(app_expiry_unix_seconds() - 1, None);
        assert!(!status.locked);
        assert_eq!(status.reason, "valid");
    }

    #[test]
    fn blocks_at_expiry() {
        let status = evaluate_expiry(app_expiry_unix_seconds(), None);
        assert!(status.locked);
        assert!(status.expired);
        assert_eq!(status.reason, "expired");
    }

    #[test]
    fn blocks_clock_rollback_beyond_grace() {
        let status = evaluate_expiry(2_000, Some(2_000 + CLOCK_ROLLBACK_GRACE_SECONDS + 1));
        assert!(status.locked);
        assert!(status.clock_rollback_detected);
        assert_eq!(status.reason, "clock_rollback");
    }

    #[test]
    fn allows_small_clock_drift() {
        let status = evaluate_expiry(2_000, Some(2_000 + CLOCK_ROLLBACK_GRACE_SECONDS));
        assert!(!status.locked);
        assert_eq!(status.reason, "valid");
    }
}
