import { invoke } from '@tauri-apps/api/core';
import {
  APP_EXPIRY_DATE_ISO,
  APP_EXPIRY_TIME,
  APP_RELEASE_DATE_ISO,
  APP_RELEASE_LABEL,
} from './appMetadata';

export const RELEASE_LABEL = APP_RELEASE_LABEL;
export const RELEASE_DATE_ISO = APP_RELEASE_DATE_ISO;
export const EXPIRY_DATE_ISO = APP_EXPIRY_DATE_ISO;
export const EXPIRY_TIME = APP_EXPIRY_TIME;
const CLOCK_ROLLBACK_GRACE_MS = 15 * 60 * 1000;
const FALLBACK_MARKER_KEY = 'qs-pro-expiry-last-seen-ms';

export type AppExpiryStatus = {
  releaseLabel: string;
  releaseDateIso: string;
  expiryDateIso: string;
  currentTimeIso: string;
  currentUnixSeconds: number;
  expiryUnixSeconds: number;
  expired: boolean;
  clockRollbackDetected: boolean;
  locked: boolean;
  reason: 'valid' | 'expired' | 'clock_rollback' | string;
};

export function formatExpiryCountdown(remainingMs: number) {
  if (remainingMs <= 0) return 'Expired';

  const totalMinutes = Math.floor(remainingMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m remaining`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }

  return `${Math.max(minutes, 0)}m remaining`;
}

export function evaluateFallbackExpiryStatus(nowMs: number, lastSeenMs?: number | null): AppExpiryStatus {
  const expired = nowMs >= EXPIRY_TIME;
  const clockRollbackDetected = typeof lastSeenMs === 'number' && nowMs + CLOCK_ROLLBACK_GRACE_MS < lastSeenMs;
  const locked = expired || clockRollbackDetected;
  const reason = clockRollbackDetected ? 'clock_rollback' : expired ? 'expired' : 'valid';

  return {
    releaseLabel: RELEASE_LABEL,
    releaseDateIso: RELEASE_DATE_ISO,
    expiryDateIso: EXPIRY_DATE_ISO,
    currentTimeIso: new Date(nowMs).toISOString(),
    currentUnixSeconds: Math.floor(nowMs / 1000),
    expiryUnixSeconds: Math.floor(EXPIRY_TIME / 1000),
    expired,
    clockRollbackDetected,
    locked,
    reason,
  };
}

function readFallbackLastSeen() {
  const raw = window.localStorage.getItem(FALLBACK_MARKER_KEY);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function writeFallbackLastSeen(nowMs: number, lastSeenMs: number | null) {
  window.localStorage.setItem(FALLBACK_MARKER_KEY, String(Math.max(nowMs, lastSeenMs || 0)));
}

export async function getAppExpiryStatus(): Promise<AppExpiryStatus> {
  try {
    return await invoke<AppExpiryStatus>('get_app_expiry_status');
  } catch {
    const nowMs = Date.now();
    const lastSeenMs = readFallbackLastSeen();
    const status = evaluateFallbackExpiryStatus(nowMs, lastSeenMs);
    if (!status.locked) {
      writeFallbackLastSeen(nowMs, lastSeenMs);
    }
    return status;
  }
}
