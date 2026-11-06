import type { BoQBill, ItemLibrary, Project, TradePackage } from '../types';
import type { AppSettings } from './appSettings';
import { APP_DESCRIPTION, APP_NAME } from './branding';
import { EXPIRY_DATE_ISO, RELEASE_DATE_ISO, RELEASE_LABEL } from './appExpiry';
import { PERSISTENCE_DB_PATH, type PersistenceBackend } from './appPersistence';
import { getLibraryPricedCount } from './libraryViewModel';
import {
  formatOperationLogForClipboard,
  recordOperationLogEntry,
  type OperationLogEntry,
} from './operationLog';
import {
  formatReleaseSmokeChecklistReport,
  type ReleaseSmokeChecklistState,
} from './releaseSmokeChecklist';
import { formatLocalCrashReportsForSupport, hasLocalCrashReportingConsent, listLocalCrashReports } from './crashReporting';
import { formatExternalPilotReport, type ExternalPilotProgramme } from './externalPilot';

export interface ReleaseSupportContext {
  projects: Project[];
  libraries: ItemLibrary[];
  trades: TradePackage[];
  appSettings: AppSettings;
  persistenceBackend: PersistenceBackend;
  isHydrated: boolean;
  saveStatus: 'saved' | 'saving' | 'error';
  saveError: string | null;
  lastSavedAt: number | null;
  lastManualSaveAt: number | null;
  isGeminiConfigured: boolean | null;
  geminiConfigSource: 'env' | 'imported' | 'none';
  currentProject?: Project | null;
  activeBill?: BoQBill | null;
  releaseChecklistState: ReleaseSmokeChecklistState;
  recentOperations: OperationLogEntry[];
  externalPilotProgramme?: ExternalPilotProgramme;
}

export interface ReleaseSupportExportResult {
  status: 'success' | 'cancelled';
  path?: string;
  filename: string;
  method: 'sqlite' | 'json' | 'markdown';
  message: string;
}

interface AppDataBackupResult {
  sourcePath: string;
  destinationPath: string;
  bytes: number;
  evidencePath?: string;
  evidenceFiles?: number;
  evidenceBytes?: number;
  availableSpaceBytes?: number;
  retainedBackups?: number;
  verified?: boolean;
  exportedAt: string;
}

interface AppDataRestoreResult {
  sourcePath: string;
  automaticBackupPath: string;
  evidenceRestored: boolean;
  evidenceFiles: number;
  verified: boolean;
  restoredAt: string;
  message: string;
}

const APP_STATE_BACKUP_FORMAT = 'HZL_QS_SUITE_APP_STATE_BACKUP';
const APP_STATE_BACKUP_VERSION = 1;

function isTauriRuntime() {
  return typeof window !== 'undefined' && Boolean((window as unknown as { __TAURI__?: unknown }).__TAURI__);
}

function timestampForFile(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes.toLocaleString()} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString(undefined, { maximumFractionDigits: 1 })} MB`;
}

function nowMs() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function browserDownload(text: string, filename: string, type: string) {
  const blob = new Blob([text], { type });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

async function saveTextFile(
  text: string,
  filename: string,
  type: string,
  filters: Array<{ name: string; extensions: string[] }>
) {
  if (isTauriRuntime()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    const path = await save({ defaultPath: filename, filters });
    if (!path) return null;
    await writeTextFile(path, text);
    return path;
  }

  browserDownload(text, filename, type);
  return filename;
}

function countProjectItems(project: Project) {
  return project.bills.reduce((billCount, bill) => (
    billCount + bill.sections.reduce((sectionCount, section) => {
      const pageItems = section.pages?.flatMap((page) => page.items || []) || [];
      return sectionCount + (pageItems.length > 0 ? pageItems.length : (section.items || []).length);
    }, 0)
  ), 0);
}

function countProjectValue(project: Project) {
  return project.bills.reduce((billTotal, bill) => (
    billTotal + bill.sections.reduce((sectionTotal, section) => {
      const pageItems = section.pages?.flatMap((page) => page.items || []) || [];
      const items = pageItems.length > 0 ? pageItems : (section.items || []);
      return sectionTotal + items.reduce((itemTotal, item) => itemTotal + (item.total || 0), 0);
    }, 0)
  ), 0);
}

function buildBackupPayload(context: ReleaseSupportContext) {
  return {
    format: APP_STATE_BACKUP_FORMAT,
    version: APP_STATE_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: {
      name: APP_NAME,
      description: APP_DESCRIPTION,
      releaseLabel: RELEASE_LABEL,
      releaseDateIso: RELEASE_DATE_ISO,
      expiryDateIso: EXPIRY_DATE_ISO,
    },
    storage: {
      backend: context.persistenceBackend,
      databasePath: PERSISTENCE_DB_PATH,
      saveStatus: context.saveStatus,
      saveError: context.saveError,
      lastSavedAt: context.lastSavedAt ? new Date(context.lastSavedAt).toISOString() : null,
      lastManualSaveAt: context.lastManualSaveAt ? new Date(context.lastManualSaveAt).toISOString() : null,
      hydrated: context.isHydrated,
    },
    counts: {
      projects: context.projects.length,
      bills: context.projects.reduce((sum, project) => sum + project.bills.length, 0),
      projectItems: context.projects.reduce((sum, project) => sum + countProjectItems(project), 0),
      libraries: context.libraries.length,
      libraryPricedItems: context.libraries.reduce((sum, library) => sum + getLibraryPricedCount(library), 0),
      trades: context.trades.length,
    },
    data: {
      projects: context.projects,
      libraries: context.libraries,
      trades: context.trades,
      appSettings: context.appSettings,
      externalPilotProgramme: context.externalPilotProgramme,
    },
    restoreNotes: [
      'This JSON contains app state available to the frontend at export time.',
      'For desktop SQLite installs, the .qsbackup database export is the preferred full backup because large library items may be stored outside React state.',
      'Use Settings or Diagnostics > Restore backup to restore a desktop .qsbackup; use project JSON and .qsplib flows for selective restores.',
    ],
  };
}

export function buildDiagnosticsReport(context: ReleaseSupportContext, generatedAt = new Date().toISOString()) {
  const totalValue = context.projects.reduce((sum, project) => sum + countProjectValue(project), 0);
  const lines = [
    `# ${APP_NAME} Diagnostics Report`,
    '',
    `Generated: ${generatedAt}`,
    `Release: ${RELEASE_LABEL}`,
    `Storage: ${context.persistenceBackend === 'sqlite' ? 'Desktop SQLite' : 'Browser fallback'}`,
    `Database: ${PERSISTENCE_DB_PATH}`,
    `Hydrated: ${context.isHydrated ? 'yes' : 'no'}`,
    `Save status: ${context.saveStatus}`,
    `Last saved: ${context.lastSavedAt ? new Date(context.lastSavedAt).toISOString() : 'not recorded'}`,
    `Last manual save: ${context.lastManualSaveAt ? new Date(context.lastManualSaveAt).toISOString() : 'not recorded'}`,
    `AI configured: ${context.isGeminiConfigured === null ? 'checking' : context.isGeminiConfigured ? 'yes' : 'no'}`,
    `AI source: ${context.geminiConfigSource}`,
    `Local crash reporting: ${hasLocalCrashReportingConsent() ? 'enabled by user' : 'not enabled'}`,
    `Locally captured crash reports: ${listLocalCrashReports().length}`,
    '',
    '## Active Workspace',
    '',
    `- Project: ${context.currentProject?.name || 'none'}`,
    `- Bill: ${context.activeBill?.name || 'none'}`,
    '',
    '## Counts',
    '',
    `- Projects: ${context.projects.length.toLocaleString()}`,
    `- Bills: ${context.projects.reduce((sum, project) => sum + project.bills.length, 0).toLocaleString()}`,
    `- Project items: ${context.projects.reduce((sum, project) => sum + countProjectItems(project), 0).toLocaleString()}`,
    `- Project value: ${totalValue.toLocaleString(undefined, { style: 'currency', currency: 'GBP' })}`,
    `- Libraries: ${context.libraries.length.toLocaleString()}`,
    `- Library priced items: ${context.libraries.reduce((sum, library) => sum + getLibraryPricedCount(library), 0).toLocaleString()}`,
    `- Trade packages: ${context.trades.length.toLocaleString()}`,
    '',
    '## Warnings',
    '',
  ];

  const warnings = [
    context.persistenceBackend !== 'sqlite' ? 'SQLite is unavailable; export a backup before closing the app.' : null,
    context.saveStatus === 'error' ? context.saveError || 'Autosave is reporting an error.' : null,
    context.isGeminiConfigured === false ? 'AI is not configured. Core bill, library, and export features still work.' : null,
  ].filter(Boolean);
  if (warnings.length === 0) {
    lines.push('- None reported.');
  } else {
    warnings.forEach((warning) => lines.push(`- ${warning}`));
  }

  lines.push(
    '',
    '## Release Smoke Checklist',
    '',
    formatReleaseSmokeChecklistReport(context.releaseChecklistState, {
      appName: APP_NAME,
      releaseLabel: RELEASE_LABEL,
      generatedAt,
    }),
    '',
    '## External Pilot Register',
    '',
    context.externalPilotProgramme ? formatExternalPilotReport(context.externalPilotProgramme, generatedAt) : 'No external pilot register is retained in this diagnostics export.',
    '',
    '## Recent Operation History',
    '',
    formatOperationLogForClipboard(context.recentOperations),
    '',
    '## Locally Captured Crash Reports',
    '',
    formatLocalCrashReportsForSupport(),
    ''
  );

  return lines.join('\n');
}

export async function exportDiagnosticsReport(context: ReleaseSupportContext): Promise<ReleaseSupportExportResult> {
  const startedAt = nowMs();
  const filename = `HZL-QS-Suite-diagnostics-${timestampForFile()}.md`;
  const report = buildDiagnosticsReport(context);
  const path = await saveTextFile(report, filename, 'text/markdown;charset=utf-8', [
    { name: `${APP_NAME} diagnostics`, extensions: ['md', 'txt'] },
  ]);

  if (!path) {
    recordOperationLogEntry({
      kind: 'export',
      status: 'cancelled',
      subject: 'Diagnostics export',
      message: 'Diagnostics export was cancelled before choosing a destination.',
      durationMs: Math.round(nowMs() - startedAt),
    });
    return {
      status: 'cancelled',
      filename,
      method: 'markdown',
      message: 'Diagnostics export cancelled.',
    };
  }

  recordOperationLogEntry({
    kind: 'export',
    status: 'success',
    subject: 'Diagnostics export',
    message: 'Exported diagnostics report.',
    path,
    counts: { files: 1 },
    durationMs: Math.round(nowMs() - startedAt),
    nextStep: 'Attach this diagnostics report to the release or support record if an issue is being investigated.',
  });

  return {
    status: 'success',
    path,
    filename,
    method: 'markdown',
    message: `Diagnostics exported to ${path}.`,
  };
}

export async function exportAppBackup(
  context: ReleaseSupportContext,
  saveNow: () => Promise<PersistenceBackend>
): Promise<ReleaseSupportExportResult> {
  const startedAt = nowMs();
  const backupBackend = await saveNow();
  const currentContext: ReleaseSupportContext = {
    ...context,
    persistenceBackend: backupBackend,
  };

  if (isTauriRuntime() && backupBackend === 'sqlite') {
    const filename = `HZL-QS-Suite-app-data-${timestampForFile()}.qsbackup`;
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { invoke } = await import('@tauri-apps/api/core');
    const path = await save({
      defaultPath: filename,
      filters: [
        { name: `${APP_NAME} full database backup`, extensions: ['qsbackup', 'db'] },
      ],
    });

    if (!path) {
      recordOperationLogEntry({
        kind: 'backup',
        status: 'cancelled',
        subject: 'App database backup',
        message: 'App database backup was cancelled before choosing a destination.',
        durationMs: Math.round(nowMs() - startedAt),
      });
      return {
        status: 'cancelled',
        filename,
        method: 'sqlite',
        message: 'App database backup cancelled.',
      };
    }

    const result = await invoke<AppDataBackupResult>('export_app_data_backup', { destinationPath: path, retainCount: 7 });
    recordOperationLogEntry({
      kind: 'backup',
      status: 'success',
      subject: 'App database backup',
      message: `Exported and verified a full SQLite app database backup (${formatBytes(result.bytes)})${result.evidenceFiles ? ` with ${result.evidenceFiles.toLocaleString()} managed evidence file${result.evidenceFiles === 1 ? '' : 's'}` : ''}.`,
      path: result.destinationPath,
      counts: {
        files: 1 + (result.evidenceFiles || 0),
        projects: context.projects.length,
        libraries: context.libraries.length,
        trades: context.trades.length,
      },
      durationMs: Math.round(nowMs() - startedAt),
      nextStep: result.evidencePath
        ? 'Keep the .qsbackup file and its adjacent .evidence folder together, then use Restore backup in Settings or Diagnostics when recovery is required.'
        : 'Keep this .qsbackup file with the release record and use Restore backup in Settings or Diagnostics when recovery is required.',
    });

    return {
      status: 'success',
      path: result.destinationPath,
      filename,
      method: 'sqlite',
      message: `Verified app database backup exported to ${result.destinationPath}${result.retainedBackups ? ` (${result.retainedBackups} retained local backup${result.retainedBackups === 1 ? '' : 's'}).` : '.'}`,
    };
  }

  const filename = `HZL-QS-Suite-app-state-${timestampForFile()}.hzlbackup.json`;
  const payload = buildBackupPayload(currentContext);
  const path = await saveTextFile(JSON.stringify(payload, null, 2), filename, 'application/json;charset=utf-8', [
    { name: `${APP_NAME} app-state backup`, extensions: ['json'] },
  ]);

  if (!path) {
    recordOperationLogEntry({
      kind: 'backup',
      status: 'cancelled',
      subject: 'App-state JSON backup',
      message: 'App-state JSON backup was cancelled before choosing a destination.',
      durationMs: Math.round(nowMs() - startedAt),
    });
    return {
      status: 'cancelled',
      filename,
      method: 'json',
      message: 'App-state backup cancelled.',
    };
  }

  recordOperationLogEntry({
    kind: 'backup',
    status: 'success',
    subject: 'App-state JSON backup',
    message: 'Exported an app-state JSON backup.',
    path,
    counts: {
      files: 1,
      projects: context.projects.length,
      libraries: context.libraries.length,
      trades: context.trades.length,
    },
    durationMs: Math.round(nowMs() - startedAt),
    nextStep: 'Use project JSON and .qsplib flows for selective restore; desktop SQLite backups remain preferred for full packaged-app restore.',
  });

  return {
    status: 'success',
    path,
    filename,
    method: 'json',
    message: `App-state JSON backup exported to ${path}.`,
  };
}

/** Restores a verified desktop backup after first creating an automatic recovery checkpoint. */
export async function restoreAppBackup(
  context: ReleaseSupportContext,
  saveNow: () => Promise<PersistenceBackend>,
): Promise<ReleaseSupportExportResult> {
  const startedAt = nowMs();
  if (!isTauriRuntime()) {
    throw new Error('Full backup restore is available only in the installed desktop app.');
  }
  const backend = await saveNow();
  if (backend !== 'sqlite') {
    throw new Error('SQLite storage must be available before a full backup can be restored.');
  }
  const confirmation = window.confirm('Restore a full app backup? The current database will first be saved as an automatic pre-restore checkpoint, then the app will reload.');
  if (!confirmation) {
    return { status: 'cancelled', filename: '', method: 'sqlite', message: 'App backup restore cancelled.' };
  }
  const { open } = await import('@tauri-apps/plugin-dialog');
  const { invoke } = await import('@tauri-apps/api/core');
  const path = await open({
    multiple: false,
    filters: [{ name: `${APP_NAME} full database backup`, extensions: ['qsbackup', 'db'] }],
  });
  if (!path || Array.isArray(path)) {
    recordOperationLogEntry({ kind: 'backup', status: 'cancelled', subject: 'App database restore', message: 'App database restore was cancelled before choosing a backup.', durationMs: Math.round(nowMs() - startedAt) });
    return { status: 'cancelled', filename: '', method: 'sqlite', message: 'App backup restore cancelled.' };
  }
  const result = await invoke<AppDataRestoreResult>('restore_app_data_backup', { sourcePath: path, restoreEvidence: true });
  recordOperationLogEntry({
    kind: 'backup',
    status: 'success',
    subject: 'App database restore',
    message: `Restored and verified a full SQLite app backup${result.evidenceRestored ? ` with ${result.evidenceFiles.toLocaleString()} managed evidence file${result.evidenceFiles === 1 ? '' : 's'}` : '; managed evidence was retained because the backup has no evidence sidecar'}.`,
    path: result.sourcePath,
    counts: { files: 1 + (result.evidenceRestored ? result.evidenceFiles : 0), projects: context.projects.length, libraries: context.libraries.length, trades: context.trades.length },
    durationMs: Math.round(nowMs() - startedAt),
    nextStep: `The previous live state is retained at ${result.automaticBackupPath}. The desktop app is reloading the restored state.`,
  });
  return { status: 'success', path: result.sourcePath, filename: result.sourcePath.split(/[\\/]/).pop() || 'backup.qsbackup', method: 'sqlite', message: result.message };
}
