export type OperationLogKind = 'import' | 'export' | 'save' | 'backup' | 'library' | 'bill' | 'tender' | 'ai' | 'system';
export type OperationLogStatus = 'success' | 'error' | 'info' | 'cancelled';

export interface OperationLogCounts {
  projects?: number;
  bills?: number;
  libraries?: number;
  trades?: number;
  folders?: number;
  sections?: number;
  pages?: number;
  items?: number;
  pricedItems?: number;
  structureRows?: number;
  files?: number;
  added?: number;
  skipped?: number;
  failed?: number;
}

export interface OperationLogEntry {
  id: string;
  timestamp: string;
  kind: OperationLogKind;
  status: OperationLogStatus;
  subject: string;
  message: string;
  projectId?: string;
  projectName?: string;
  billId?: string;
  billName?: string;
  path?: string;
  counts?: OperationLogCounts;
  error?: string;
  nextStep?: string;
  durationMs?: number;
}

const OPERATION_LOG_KEY = 'hzl-operation-log-v1';
const OPERATION_LOG_EVENT = 'hzl-operation-log-updated';
const MAX_OPERATION_LOG_ENTRIES = 100;

function isOperationLogKind(value: string): value is OperationLogKind {
  return ['import', 'export', 'save', 'backup', 'library', 'bill', 'tender', 'ai', 'system'].includes(value);
}

function isOperationLogStatus(value: string): value is OperationLogStatus {
  return ['success', 'error', 'info', 'cancelled'].includes(value);
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readCounts(value: unknown): OperationLogCounts | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const counts: OperationLogCounts = {};
  (['projects', 'bills', 'libraries', 'trades', 'folders', 'sections', 'pages', 'items', 'pricedItems', 'structureRows', 'files', 'added', 'skipped', 'failed'] as const).forEach((key) => {
    const numberValue = readNumber(record[key]);
    if (numberValue !== undefined) counts[key] = numberValue;
  });
  return Object.keys(counts).length > 0 ? counts : undefined;
}

function normalizeEntry(entry: unknown): OperationLogEntry | null {
  if (!entry || typeof entry !== 'object') return null;
  const record = entry as Record<string, unknown>;
  const id = readString(record.id);
  const timestamp = readString(record.timestamp);
  const kind = readString(record.kind);
  const status = readString(record.status);
  const subject = readString(record.subject);
  const message = readString(record.message);

  if (!id || !timestamp || !kind || !status || !subject || !message) return null;
  if (!isOperationLogKind(kind) || !isOperationLogStatus(status)) return null;

  return {
    id,
    timestamp,
    kind,
    status,
    subject,
    message,
    projectId: readString(record.projectId),
    projectName: readString(record.projectName),
    billId: readString(record.billId),
    billName: readString(record.billName),
    path: readString(record.path),
    counts: readCounts(record.counts),
    error: readString(record.error),
    nextStep: readString(record.nextStep),
    durationMs: readNumber(record.durationMs),
  };
}

function readEntries(): OperationLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OPERATION_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeEntry)
      .filter((entry): entry is OperationLogEntry => Boolean(entry));
  } catch {
    return [];
  }
}

function writeEntries(entries: OperationLogEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(OPERATION_LOG_KEY, JSON.stringify(entries.slice(0, MAX_OPERATION_LOG_ENTRIES)));
    window.dispatchEvent(new CustomEvent(OPERATION_LOG_EVENT));
  } catch {
    // Diagnostics logging should never break the primary workflow.
  }
}

export function recordOperationLogEntry(entry: Omit<OperationLogEntry, 'id' | 'timestamp'>) {
  const nextEntry: OperationLogEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };
  writeEntries([nextEntry, ...readEntries()]);
  return nextEntry;
}

export function listRecentOperationLogEntries(limit = 12) {
  return readEntries().slice(0, limit);
}

export function listOperationLogEntries() {
  return readEntries();
}

export function clearOperationLogEntries() {
  writeEntries([]);
}

export function subscribeToOperationLog(listener: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(OPERATION_LOG_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(OPERATION_LOG_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

function formatCounts(counts?: OperationLogCounts) {
  if (!counts) return '';
  return Object.entries(counts)
    .filter(([, value]) => typeof value === 'number')
    .map(([key, value]) => `${key}: ${value.toLocaleString()}`)
    .join(', ');
}

export function formatOperationLogForClipboard(entries: OperationLogEntry[]) {
  if (entries.length === 0) return 'No operation history recorded.';
  return entries.map((entry) => {
    const lines = [
      `[${entry.timestamp}] ${entry.status.toUpperCase()} ${entry.kind}: ${entry.subject}`,
      entry.message,
    ];
    if (entry.projectName || entry.billName) {
      lines.push(`Scope: ${[entry.projectName, entry.billName].filter(Boolean).join(' / ')}`);
    }
    if (entry.path) lines.push(`Path: ${entry.path}`);
    const counts = formatCounts(entry.counts);
    if (counts) lines.push(`Counts: ${counts}`);
    if (entry.error) lines.push(`Error: ${entry.error}`);
    if (entry.nextStep) lines.push(`Next step: ${entry.nextStep}`);
    if (entry.durationMs !== undefined) lines.push(`Duration: ${entry.durationMs.toLocaleString()}ms`);
    return lines.join('\n');
  }).join('\n\n');
}
