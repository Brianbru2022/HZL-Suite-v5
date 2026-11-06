export interface LocalCrashReport {
  id: string;
  timestamp: string;
  source: 'window-error' | 'unhandled-rejection' | 'react-boundary';
  message: string;
  stack?: string;
  componentStack?: string;
}

const CONSENT_KEY = 'hzl-local-crash-reporting-consent-v1';
const REPORTS_KEY = 'hzl-local-crash-reports-v1';
const MAX_REPORTS = 20;
let listenersInstalled = false;

function storage() {
  return typeof window === 'undefined' ? null : window.localStorage;
}

function safeErrorMessage(value: unknown) {
  if (value instanceof Error) return value.message || value.name;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return 'Unknown error';
  }
}

export function setLocalCrashReportingConsent(enabled: boolean) {
  try {
    storage()?.setItem(CONSENT_KEY, enabled ? 'true' : 'false');
  } catch {
    // Support diagnostics must never interrupt the workspace.
  }
}

export function hasLocalCrashReportingConsent() {
  try {
    return storage()?.getItem(CONSENT_KEY) === 'true';
  } catch {
    return false;
  }
}

export function listLocalCrashReports(): LocalCrashReport[] {
  try {
    const raw = storage()?.getItem(REPORTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is LocalCrashReport => (
      entry && typeof entry.id === 'string' && typeof entry.timestamp === 'string' && typeof entry.message === 'string'
    ));
  } catch {
    return [];
  }
}

export function clearLocalCrashReports() {
  try {
    storage()?.removeItem(REPORTS_KEY);
  } catch {
    // Ignore unavailable local storage.
  }
}

export function recordLocalCrashReport(report: Omit<LocalCrashReport, 'id' | 'timestamp'>) {
  if (!hasLocalCrashReportingConsent()) return;
  try {
    const next: LocalCrashReport = {
      id: `crash-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      ...report,
    };
    storage()?.setItem(REPORTS_KEY, JSON.stringify([next, ...listLocalCrashReports()].slice(0, MAX_REPORTS)));
  } catch {
    // A crash report must not create a second failure.
  }
}

export function installLocalCrashReporting() {
  if (listenersInstalled || typeof window === 'undefined') return;
  listenersInstalled = true;
  window.addEventListener('error', (event) => {
    recordLocalCrashReport({
      source: 'window-error',
      message: event.message || safeErrorMessage(event.error),
      stack: event.error instanceof Error ? event.error.stack : undefined,
    });
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    recordLocalCrashReport({
      source: 'unhandled-rejection',
      message: safeErrorMessage(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}

export function formatLocalCrashReportsForSupport(reports = listLocalCrashReports()) {
  if (reports.length === 0) return 'No locally captured crash reports.';
  return reports.map((report) => [
    `- ${report.timestamp} | ${report.source} | ${report.message}`,
    report.stack ? `  Stack: ${report.stack}` : null,
    report.componentStack ? `  Component stack: ${report.componentStack}` : null,
  ].filter(Boolean).join('\n')).join('\n');
}
