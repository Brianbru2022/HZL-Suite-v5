import React from 'react';
import {
  Activity,
  AlertTriangle,
  Bug,
  CheckCircle2,
  Clipboard,
  Clock,
  Database,
  Download,
  FileArchive,
  HardDrive,
  Info,
  Layers3,
  Library,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';
import { useToast } from '../../contexts/ToastContext';
import { useModalFocus } from '../../hooks/useModalFocus';
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from '../../utils/branding';
import { EXPIRY_DATE_ISO, RELEASE_DATE_ISO, RELEASE_LABEL } from '../../utils/appExpiry';
import { PERSISTENCE_DB_PATH } from '../../utils/appPersistence';
import { formatCurrency } from '../../utils/formatting';
import { getLibraryPricedCount } from '../../utils/libraryViewModel';
import {
  clearOperationLogEntries,
  formatOperationLogForClipboard,
  listRecentOperationLogEntries,
  subscribeToOperationLog,
  type OperationLogEntry,
} from '../../utils/operationLog';
import {
  RELEASE_SMOKE_CHECKLIST,
  formatReleaseSmokeChecklistReport,
  getReleaseSmokeChecklistProgress,
  readReleaseSmokeChecklistState,
  setReleaseSmokeCheckStatus,
  writeReleaseSmokeChecklistState,
  type ReleaseSmokeCheckStatus,
  type ReleaseSmokeChecklistState,
} from '../../utils/releaseSmokeChecklist';
import {
  exportAppBackup,
  exportDiagnosticsReport,
  restoreAppBackup,
  type ReleaseSupportContext,
} from '../../utils/releaseSupport';
import { listLocalCrashReports } from '../../utils/crashReporting';
import { generateId } from '../../utils/generateId';
import {
  EXTERNAL_PILOT_CHECKPOINTS,
  externalPilotProgress,
  externalPilotReleaseGate,
  formatExternalPilotReport,
  readExternalPilotProgramme,
  writeExternalPilotProgramme,
  type ExternalPilotCheckpointId,
  type ExternalPilotCheckpointStatus,
  type ExternalPilotDefectSeverity,
  type ExternalPilotProgramme,
} from '../../utils/externalPilot';

type DiagnosticsTone = 'ok' | 'warn' | 'error' | 'info';

function formatDateTime(value: number | string | null | undefined) {
  if (!value) return 'Not recorded';
  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function formatCount(value: number) {
  return value.toLocaleString();
}

function formatDuration(value: number | undefined) {
  if (value === undefined) return '';
  if (value < 1000) return `${value.toLocaleString()}ms`;
  return `${(value / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}s`;
}

function formatOperationCounts(entry: OperationLogEntry) {
  if (!entry.counts) return '';
  return Object.entries(entry.counts)
    .filter(([, value]) => typeof value === 'number')
    .map(([key, value]) => `${value.toLocaleString()} ${key}`)
    .join(' · ');
}

function StatusPill({ tone, label }: { tone: DiagnosticsTone; label: string }) {
  const styles: Record<DiagnosticsTone, string> = {
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-200',
    warn: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-200',
    error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/35 dark:text-red-200',
    info: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/55 dark:text-slate-200',
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${styles[tone]}`}>
      {label}
    </span>
  );
}

function getOperationTone(status: OperationLogEntry['status']): DiagnosticsTone {
  if (status === 'error') return 'error';
  if (status === 'success') return 'ok';
  if (status === 'cancelled') return 'warn';
  return 'info';
}

function getChecklistTone(status: ReleaseSmokeCheckStatus): DiagnosticsTone {
  if (status === 'passed') return 'ok';
  if (status === 'issue') return 'error';
  return 'info';
}

const CHECKLIST_GROUPS = Array.from(new Set(RELEASE_SMOKE_CHECKLIST.map((item) => item.group)));

function DiagnosticsCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-app-lg border border-slate-200 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-surface-900">
      <div className="flex items-start gap-3">
        <div className="rounded-app bg-slate-100 p-2 text-slate-600 dark:bg-surface-800 dark:text-slate-300">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            {label}
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {value}
          </div>
          {detail && <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</div>}
        </div>
      </div>
    </div>
  );
}

export function AppDiagnosticsModal({
  isOpen,
  onClose,
  onOpenVersionHistory,
  onOpenSettings,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenVersionHistory?: () => void;
  onOpenSettings?: () => void;
}) {
  const {
    projects,
    libraries,
    trades,
    currentProject,
    activeBill,
    saveStatus,
    saveError,
    lastSavedAt,
    lastManualSaveAt,
    persistenceBackend,
    isHydrated,
    isGeminiConfigured,
    geminiConfigSource,
    appSettings,
    saveNow,
  } = useAppContext();
  const { showToast } = useToast();
  const { contentRef, contentProps } = useModalFocus(isOpen, onClose);
  const [recentOperations, setRecentOperations] = React.useState<OperationLogEntry[]>([]);
  const [operationCopyState, setOperationCopyState] = React.useState<'idle' | 'copied' | 'failed'>('idle');
  const [smokeChecklistState, setSmokeChecklistState] = React.useState<ReleaseSmokeChecklistState>({});
  const [smokeCopyState, setSmokeCopyState] = React.useState<'idle' | 'copied' | 'failed'>('idle');
  const [backupExportState, setBackupExportState] = React.useState<'idle' | 'running'>('idle');
  const [backupRestoreState, setBackupRestoreState] = React.useState<'idle' | 'running'>('idle');
  const [diagnosticsExportState, setDiagnosticsExportState] = React.useState<'idle' | 'running'>('idle');
  const [pilotProgramme, setPilotProgramme] = React.useState<ExternalPilotProgramme>({ users: [], defects: [] });
  const [pilotName, setPilotName] = React.useState('');
  const [pilotOrganisation, setPilotOrganisation] = React.useState('');
  const [defectTitle, setDefectTitle] = React.useState('');
  const [defectSeverity, setDefectSeverity] = React.useState<ExternalPilotDefectSeverity>('S3');
  const [defectPilotUserId, setDefectPilotUserId] = React.useState('');
  const [pilotCopyState, setPilotCopyState] = React.useState<'idle' | 'copied' | 'failed'>('idle');

  React.useEffect(() => {
    if (!isOpen) return;
    const refreshOperations = () => setRecentOperations(listRecentOperationLogEntries(20));
    refreshOperations();
    setSmokeChecklistState(readReleaseSmokeChecklistState());
    setPilotProgramme(readExternalPilotProgramme());
    return subscribeToOperationLog(refreshOperations);
  }, [isOpen]);

  React.useEffect(() => {
    if (operationCopyState === 'idle') return;
    const timeout = window.setTimeout(() => setOperationCopyState('idle'), 2200);
    return () => window.clearTimeout(timeout);
  }, [operationCopyState]);

  React.useEffect(() => {
    if (smokeCopyState === 'idle') return;
    const timeout = window.setTimeout(() => setSmokeCopyState('idle'), 2200);
    return () => window.clearTimeout(timeout);
  }, [smokeCopyState]);

  React.useEffect(() => {
    if (pilotCopyState === 'idle') return;
    const timeout = window.setTimeout(() => setPilotCopyState('idle'), 2200);
    return () => window.clearTimeout(timeout);
  }, [pilotCopyState]);

  if (!isOpen) return null;

  const totalPricedItems = libraries.reduce((sum, library) => sum + getLibraryPricedCount(library), 0);
  const localCrashReports = listLocalCrashReports();
  const totalProjectValue = projects.reduce(
    (projectSum, project) =>
      projectSum +
      project.bills.reduce(
        (billSum, bill) =>
          billSum +
          bill.sections.reduce((sectionSum, section) => {
            const items = section.pages?.length
              ? section.pages.flatMap((page) => page.items || [])
              : section.items || [];
            return sectionSum + items.reduce((itemSum, item) => itemSum + (item.total || 0), 0);
          }, 0),
        0
      ),
    0
  );
  const storageTone: DiagnosticsTone = persistenceBackend === 'sqlite' ? 'ok' : 'error';
  const saveTone: DiagnosticsTone = saveStatus === 'error' ? 'error' : saveStatus === 'saving' ? 'warn' : 'ok';
  const aiTone: DiagnosticsTone = isGeminiConfigured ? 'ok' : isGeminiConfigured === false ? 'warn' : 'info';
  const warnings = [
    persistenceBackend !== 'sqlite'
      ? 'SQLite is unavailable. Export a JSON backup before closing the app.'
      : null,
    saveStatus === 'error'
      ? saveError || 'The last autosave failed. Check storage access and export a backup if needed.'
      : null,
    isGeminiConfigured === false
      ? 'AI is not configured. Core bill, library, and export features still work.'
      : null,
  ].filter(Boolean) as string[];
  const latestFailure = recentOperations.find((entry) => entry.status === 'error');
  const smokeProgress = getReleaseSmokeChecklistProgress(smokeChecklistState);
  const smokeProgressPct = smokeProgress.total > 0 ? Math.round((smokeProgress.passed / smokeProgress.total) * 100) : 0;
  const pilotGate = externalPilotReleaseGate(pilotProgramme);
  const pilotProgress = externalPilotProgress(pilotProgramme);

  const savePilotProgramme = (recipe: (current: ExternalPilotProgramme) => ExternalPilotProgramme) => {
    setPilotProgramme((current) => {
      const next = recipe(current);
      writeExternalPilotProgramme(next);
      return next;
    });
  };

  const addPilotUser = () => {
    const name = pilotName.trim();
    if (!name) {
      showToast({ type: 'error', message: 'Enter the pilot user name.' });
      return;
    }
    if (pilotProgramme.users.length >= 5) {
      showToast({ type: 'error', message: 'The controlled external pilot is limited to five named users.' });
      return;
    }
    savePilotProgramme((current) => ({ ...current, users: [...current.users, { id: generateId(), name, organisation: pilotOrganisation.trim(), addedAt: new Date().toISOString(), checkpoints: {} }] }));
    setPilotName('');
    setPilotOrganisation('');
  };

  const setPilotCheckpoint = (userId: string, checkpoint: ExternalPilotCheckpointId, status: ExternalPilotCheckpointStatus) => {
    savePilotProgramme((current) => ({ ...current, users: current.users.map((user) => user.id !== userId ? user : { ...user, checkpoints: { ...user.checkpoints, [checkpoint]: status } }) }));
  };

  const addPilotDefect = () => {
    const title = defectTitle.trim();
    if (!title) {
      showToast({ type: 'error', message: 'Enter a defect summary.' });
      return;
    }
    savePilotProgramme((current) => ({ ...current, defects: [...current.defects, { id: generateId(), pilotUserId: defectPilotUserId || undefined, title, severity: defectSeverity, status: 'OPEN', raisedAt: new Date().toISOString() }] }));
    setDefectTitle('');
  };

  const updatePilotDefectStatus = (defectId: string, status: 'OPEN' | 'FIXED' | 'ACCEPTED') => {
    savePilotProgramme((current) => ({ ...current, defects: current.defects.map((defect) => defect.id !== defectId ? defect : { ...defect, status, resolvedAt: status === 'OPEN' ? undefined : new Date().toISOString() }) }));
  };

  const copyPilotReport = async () => {
    try {
      await navigator.clipboard.writeText(formatExternalPilotReport(pilotProgramme));
      setPilotCopyState('copied');
    } catch {
      setPilotCopyState('failed');
    }
  };

  const handleCopyOperations = async () => {
    try {
      await navigator.clipboard.writeText(formatOperationLogForClipboard(recentOperations));
      setOperationCopyState('copied');
    } catch {
      setOperationCopyState('failed');
    }
  };

  const handleClearOperations = () => {
    clearOperationLogEntries();
    setRecentOperations([]);
  };

  const handleChecklistStatus = (id: string, status: ReleaseSmokeCheckStatus) => {
    setSmokeChecklistState((current) => {
      const next = setReleaseSmokeCheckStatus(current, id, status);
      writeReleaseSmokeChecklistState(next);
      return next;
    });
  };

  const handleResetChecklist = () => {
    setSmokeChecklistState({});
    writeReleaseSmokeChecklistState({});
  };

  const handleCopyChecklist = async () => {
    try {
      await navigator.clipboard.writeText(formatReleaseSmokeChecklistReport(smokeChecklistState, {
        appName: APP_NAME,
        releaseLabel: RELEASE_LABEL,
      }));
      setSmokeCopyState('copied');
    } catch {
      setSmokeCopyState('failed');
    }
  };

  const buildReleaseSupportContext = (): ReleaseSupportContext => ({
    projects,
    libraries,
    trades,
    appSettings,
    persistenceBackend,
    isHydrated,
    saveStatus,
    saveError,
    lastSavedAt,
    lastManualSaveAt,
    isGeminiConfigured,
    geminiConfigSource,
    currentProject,
    activeBill,
    releaseChecklistState: smokeChecklistState,
    recentOperations,
    externalPilotProgramme: pilotProgramme,
  });

  const handleExportBackup = async () => {
    if (backupExportState === 'running') return;
    setBackupExportState('running');
    try {
      const result = await exportAppBackup(buildReleaseSupportContext(), saveNow);
      showToast({
        type: result.status === 'success' ? 'success' : 'info',
        message: result.status === 'success'
          ? result.method === 'sqlite'
            ? 'Full SQLite app backup exported.'
            : 'App-state JSON backup exported.'
          : 'Backup export cancelled.',
      });
    } catch (error) {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Backup export failed.',
      });
    } finally {
      setBackupExportState('idle');
    }
  };

  const handleRestoreBackup = async () => {
    if (backupRestoreState === 'running') return;
    setBackupRestoreState('running');
    try {
      const result = await restoreAppBackup(buildReleaseSupportContext(), saveNow);
      if (result.status === 'success') {
        showToast({ type: 'success', message: 'Backup restored and verified. Reloading the app...' });
        window.setTimeout(() => window.location.reload(), 650);
      } else {
        showToast({ type: 'info', message: 'Backup restore cancelled.' });
      }
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Backup restore failed.' });
    } finally {
      setBackupRestoreState('idle');
    }
  };

  const handleExportDiagnosticsReport = async () => {
    if (diagnosticsExportState === 'running') return;
    setDiagnosticsExportState('running');
    try {
      const result = await exportDiagnosticsReport(buildReleaseSupportContext());
      showToast({
        type: result.status === 'success' ? 'success' : 'info',
        message: result.status === 'success' ? 'Diagnostics report exported.' : 'Diagnostics export cancelled.',
      });
    } catch (error) {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Diagnostics export failed.',
      });
    } finally {
      setDiagnosticsExportState('idle');
    }
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div
        ref={contentRef}
        {...contentProps}
        className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-app-2xl border border-slate-200 bg-surface shadow-app-lg dark:border-slate-700 dark:bg-surface-950"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-700">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={storageTone} label={persistenceBackend === 'sqlite' ? 'SQLite ready' : 'SQLite unavailable'} />
              <StatusPill tone={saveTone} label={saveStatus === 'saving' ? 'Saving' : saveStatus === 'error' ? 'Save issue' : 'Saved'} />
              <StatusPill tone={aiTone} label={isGeminiConfigured ? 'AI ready' : isGeminiConfigured === false ? 'AI not configured' : 'AI checking'} />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-slate-950 dark:text-slate-100">{APP_NAME} diagnostics</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {APP_TAGLINE}. {APP_DESCRIPTION}
            </p>
          </div>
          <button type="button" onClick={onClose} className="workspace-icon-btn" aria-label="Close diagnostics">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-112px)] overflow-y-auto p-6">
          {warnings.length > 0 && (
            <div className="mb-5 rounded-app-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/70 dark:bg-amber-950/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700 dark:text-amber-300" />
                <div>
                  <div className="text-sm font-semibold text-amber-950 dark:text-amber-100">Attention needed</div>
                  <div className="mt-2 space-y-1 text-sm leading-6 text-amber-900/85 dark:text-amber-200/85">
                    {warnings.map((warning) => (
                      <div key={warning}>{warning}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DiagnosticsCard
              icon={<Database className="h-4 w-4" />}
              label="Storage backend"
              value={persistenceBackend === 'sqlite' ? 'Desktop SQLite' : 'Browser fallback'}
              detail={`${PERSISTENCE_DB_PATH} - ${isHydrated ? 'hydrated' : 'hydrating'}`}
            />
            <DiagnosticsCard
              icon={<Save className="h-4 w-4" />}
              label="Last save"
              value={saveStatus === 'error' ? 'Save failed' : formatDateTime(lastSavedAt)}
              detail={saveError || 'Autosave preserves projects, trades, and library metadata.'}
            />
            <DiagnosticsCard
              icon={<Clock className="h-4 w-4" />}
              label="Build window"
              value={RELEASE_LABEL}
              detail={`Release ${formatDateTime(RELEASE_DATE_ISO)}. Expires ${formatDateTime(EXPIRY_DATE_ISO)}.`}
            />
            <DiagnosticsCard
              icon={<Layers3 className="h-4 w-4" />}
              label="Projects"
              value={`${formatCount(projects.length)} project${projects.length === 1 ? '' : 's'}`}
              detail={`${formatCurrency(totalProjectValue)} stored project value`}
            />
            <DiagnosticsCard
              icon={<Library className="h-4 w-4" />}
              label="Libraries"
              value={`${formatCount(libraries.length)} librar${libraries.length === 1 ? 'y' : 'ies'}`}
              detail={`${formatCount(totalPricedItems)} priced items indexed`}
            />
            <DiagnosticsCard
              icon={<HardDrive className="h-4 w-4" />}
              label="Trades"
              value={`${formatCount(trades.length)} trade package${trades.length === 1 ? '' : 's'}`}
              detail="Trade assignments remain editable inside project bills."
            />
            <DiagnosticsCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Local crash reports"
              value={appSettings.general.crashReportingEnabled ? `${localCrashReports.length.toLocaleString()} captured` : 'Not enabled'}
              detail={appSettings.general.crashReportingEnabled ? 'Stored locally and included only when Diagnostics is exported.' : 'Enable in Settings > General to capture future unexpected errors locally.'}
            />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-app-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Activity className="h-4 w-4 text-slate-500" />
                Active workspace
              </div>
              <div className="mt-4 grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400">Project</span>
                  <span className="min-w-0 truncate font-medium text-slate-900 dark:text-slate-100">
                    {currentProject?.name || 'No project selected'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400">Bill</span>
                  <span className="min-w-0 truncate font-medium text-slate-900 dark:text-slate-100">
                    {activeBill?.name || 'No bill selected'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400">AI source</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {geminiConfigSource === 'env' ? 'Environment' : geminiConfigSource === 'imported' ? 'Imported config' : 'None'}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-app-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Info className="h-4 w-4 text-slate-500" />
                Useful checks
              </div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-1 h-4 w-4 text-emerald-600" />
                  Large standards libraries should remain SQLite-backed and lazily loaded.
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-1 h-4 w-4 text-emerald-600" />
                  Export a JSON backup if storage is degraded or autosave reports an error.
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-1 h-4 w-4 text-violet-500" />
                  AI tools are optional and never required for local bill editing.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-app-lg border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <FileArchive className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                  Release support exports
                </div>
                <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600 dark:text-slate-300">
                  Create a one-click app backup and a shareable diagnostics report before installer testing, risky imports, or support handoff.
                  Desktop SQLite backups include the live app database; browser fallback exports a JSON app-state bundle.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  disabled={backupExportState === 'running'}
                  className="workspace-primary-btn px-3 py-2 text-xs disabled:opacity-60"
                >
                  <Download className="h-3.5 w-3.5" />
                  {backupExportState === 'running' ? 'Backing up...' : 'Backup now'}
                </button>
                <button
                  type="button"
                  onClick={handleRestoreBackup}
                  disabled={persistenceBackend !== 'sqlite' || backupRestoreState === 'running'}
                  className="workspace-secondary-btn px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {backupRestoreState === 'running' ? 'Restoring...' : 'Restore backup'}
                </button>
                <button
                  type="button"
                  onClick={handleExportDiagnosticsReport}
                  disabled={diagnosticsExportState === 'running'}
                  className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-60"
                >
                  <Clipboard className="h-3.5 w-3.5" />
                  {diagnosticsExportState === 'running' ? 'Exporting...' : 'Export diagnostics bundle'}
                </button>
              </div>
            </div>
          </div>

          <div className={`mt-5 rounded-app-lg border p-4 ${pilotGate.ready ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/20' : 'border-amber-200 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100"><Users className="h-4 w-4 text-sky-700 dark:text-sky-300" />External pilot register</div>
                <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600 dark:text-slate-300">Record each named pilot user against install, appraisal, export, backup, restore and upgrade. Commercial availability stays blocked until every checkpoint passes and every S1/S2 defect is fixed.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2"><StatusPill tone={pilotGate.ready ? 'ok' : 'warn'} label={pilotGate.ready ? 'Commercial gate ready' : 'Commercial gate blocked'} /><button type="button" onClick={() => { void copyPilotReport(); }} className="workspace-secondary-btn px-3 py-1.5 text-xs"><Clipboard className="h-3.5 w-3.5" />{pilotCopyState === 'copied' ? 'Copied' : pilotCopyState === 'failed' ? 'Copy failed' : 'Copy pilot record'}</button></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-300"><span>{pilotProgramme.users.length}/3-5 named users</span><span>{pilotProgress.passed}/{pilotProgress.total} checkpoints passed</span><span>{pilotProgress.openCriticalDefects.length} unresolved S1/S2 defect{pilotProgress.openCriticalDefects.length === 1 ? '' : 's'}</span></div>
            {!pilotGate.ready && <ul className="mt-3 space-y-1 text-xs leading-5 text-amber-900 dark:text-amber-100">{pilotGate.reasons.map((reason) => <li key={reason}>- {reason}</li>)}</ul>}

            <div className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_auto]"><input value={pilotName} onChange={(event) => setPilotName(event.target.value)} placeholder="Pilot user name" className="workspace-input px-3 py-2 text-xs" /><input value={pilotOrganisation} onChange={(event) => setPilotOrganisation(event.target.value)} placeholder="Organisation (optional)" className="workspace-input px-3 py-2 text-xs" /><button type="button" onClick={addPilotUser} className="workspace-secondary-btn px-3 py-2 text-xs"><Plus className="h-3.5 w-3.5" />Add user</button></div>

            <div className="mt-4 space-y-3">
              {pilotProgramme.users.length === 0 ? <div className="rounded-app border border-dashed border-slate-300 bg-white/60 p-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-surface-900/50 dark:text-slate-400">Add three to five named users to start the controlled pilot.</div> : pilotProgramme.users.map((user) => (
                <div key={user.id} className="rounded-app border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-surface-900">
                  <div className="flex flex-wrap items-center justify-between gap-2"><div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user.name}{user.organisation ? <span className="font-normal text-slate-500 dark:text-slate-400"> · {user.organisation}</span> : null}</div><button type="button" onClick={() => savePilotProgramme((current) => ({ ...current, users: current.users.filter((entry) => entry.id !== user.id), defects: current.defects.filter((defect) => defect.pilotUserId !== user.id) }))} className="workspace-icon-btn text-red-700 dark:text-red-300" aria-label={`Remove ${user.name}`}><Trash2 className="h-3.5 w-3.5" /></button></div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{EXTERNAL_PILOT_CHECKPOINTS.map((checkpoint) => { const status = user.checkpoints[checkpoint.id] || 'PENDING'; return <div key={checkpoint.id} className="rounded-app border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-surface-950/50"><div className="flex items-center justify-between gap-2"><div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{checkpoint.label}</div><StatusPill tone={status === 'PASSED' ? 'ok' : status === 'FAILED' ? 'error' : 'info'} label={status.toLowerCase()} /></div><div className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">{checkpoint.detail}</div><div className="mt-2 flex rounded-app border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-surface-900">{(['PENDING', 'PASSED', 'FAILED'] as const).map((next) => <button key={next} type="button" onClick={() => setPilotCheckpoint(user.id, checkpoint.id, next)} className={`flex-1 rounded px-1.5 py-1 text-[10px] font-semibold ${status === next ? next === 'PASSED' ? 'bg-emerald-600 text-white' : next === 'FAILED' ? 'bg-red-600 text-white' : 'bg-slate-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}>{next === 'PENDING' ? 'Pending' : next === 'PASSED' ? 'Pass' : 'Fail'}</button>)}</div></div>; })}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-app border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-surface-900"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100"><Bug className="h-4 w-4 text-red-600" />Pilot defects</div><div className="mt-3 grid gap-2 lg:grid-cols-[1fr_8rem_12rem_auto]"><input value={defectTitle} onChange={(event) => setDefectTitle(event.target.value)} placeholder="Defect summary" className="workspace-input px-3 py-2 text-xs" /><select value={defectSeverity} onChange={(event) => setDefectSeverity(event.target.value as ExternalPilotDefectSeverity)} className="workspace-input px-3 py-2 text-xs"><option value="S1">S1 critical</option><option value="S2">S2 major</option><option value="S3">S3 normal</option><option value="S4">S4 minor</option></select><select value={defectPilotUserId} onChange={(event) => setDefectPilotUserId(event.target.value)} className="workspace-input px-3 py-2 text-xs"><option value="">No named user</option>{pilotProgramme.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select><button type="button" onClick={addPilotDefect} className="workspace-secondary-btn px-3 py-2 text-xs"><Plus className="h-3.5 w-3.5" />Add defect</button></div>
              {pilotProgramme.defects.length === 0 ? <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">No pilot defects recorded.</p> : <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">{pilotProgramme.defects.map((defect) => <div key={defect.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-xs"><div><span className={`mr-2 font-semibold ${defect.severity === 'S1' || defect.severity === 'S2' ? 'text-red-700 dark:text-red-300' : 'text-slate-700 dark:text-slate-300'}`}>{defect.severity}</span><span className="font-medium text-slate-900 dark:text-slate-100">{defect.title}</span><span className="ml-2 text-slate-500 dark:text-slate-400">{defect.status.toLowerCase()}</span></div><div className="flex gap-1"><button type="button" onClick={() => updatePilotDefectStatus(defect.id, 'OPEN')} className="workspace-secondary-btn px-2 py-1 text-[10px]">Open</button><button type="button" onClick={() => updatePilotDefectStatus(defect.id, 'FIXED')} className="workspace-secondary-btn px-2 py-1 text-[10px]">Fixed</button><button type="button" onClick={() => updatePilotDefectStatus(defect.id, 'ACCEPTED')} className="workspace-secondary-btn px-2 py-1 text-[10px]">Accept</button></div></div>)}</div>}
            </div>
          </div>

          <div className="mt-5 rounded-app-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Release smoke checklist
                </div>
                <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Tick through the core flows before building or sharing a release.
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill
                  tone={smokeProgress.issue > 0 ? 'error' : smokeProgress.pending > 0 ? 'warn' : 'ok'}
                  label={`${smokeProgress.passed}/${smokeProgress.total} passed`}
                />
                <button
                  type="button"
                  onClick={handleCopyChecklist}
                  className="workspace-secondary-btn px-3 py-1.5 text-xs"
                >
                  <Clipboard className="h-3.5 w-3.5" />
                  {smokeCopyState === 'copied' ? 'Copied' : smokeCopyState === 'failed' ? 'Copy failed' : 'Copy report'}
                </button>
                <button
                  type="button"
                  onClick={handleResetChecklist}
                  className="workspace-secondary-btn px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full ${smokeProgress.issue > 0 ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${smokeProgressPct}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>{smokeProgress.pending.toLocaleString()} pending</span>
                <span>{smokeProgress.issue.toLocaleString()} issue{smokeProgress.issue === 1 ? '' : 's'}</span>
                <span>{smokeProgressPct}% complete</span>
              </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {CHECKLIST_GROUPS.map((group) => (
                <div key={group} className="rounded-app border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-surface-950/40">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    {group}
                  </div>
                  <div className="space-y-2">
                    {RELEASE_SMOKE_CHECKLIST.filter((item) => item.group === group).map((item) => {
                      const status = smokeChecklistState[item.id] || 'pending';
                      return (
                        <div key={item.id} className="rounded-app border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-surface-900">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <StatusPill tone={getChecklistTone(status)} label={status} />
                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</div>
                              </div>
                              <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.detail}</div>
                            </div>
                            <div className="flex shrink-0 rounded-app border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-950/50">
                              {(['pending', 'passed', 'issue'] as const).map((nextStatus) => (
                                <button
                                  key={nextStatus}
                                  type="button"
                                  onClick={() => handleChecklistStatus(item.id, nextStatus)}
                                  className={`rounded px-2 py-1 text-[11px] font-semibold capitalize transition ${
                                    status === nextStatus
                                      ? nextStatus === 'passed'
                                        ? 'bg-emerald-600 text-white'
                                        : nextStatus === 'issue'
                                          ? 'bg-red-600 text-white'
                                          : 'bg-slate-700 text-white'
                                      : 'text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                                  }`}
                                >
                                  {nextStatus === 'passed' ? 'Pass' : nextStatus}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-app-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <Activity className="h-4 w-4 text-slate-500" />
                  Operation history and recovery
                </div>
                <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Recent saves, imports, exports, pack operations, and storage warnings are kept locally for diagnostics.
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyOperations}
                  disabled={recentOperations.length === 0}
                  className="workspace-secondary-btn px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  <Clipboard className="h-3.5 w-3.5" />
                  {operationCopyState === 'copied' ? 'Copied' : operationCopyState === 'failed' ? 'Copy failed' : 'Copy diagnostics'}
                </button>
                <button
                  type="button"
                  onClick={handleClearOperations}
                  disabled={recentOperations.length === 0}
                  className="workspace-secondary-btn px-3 py-1.5 text-xs text-red-700 disabled:opacity-50 dark:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </button>
              </div>
            </div>
            {latestFailure && (
              <div className="mt-4 rounded-app border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900/70 dark:bg-red-950/30">
                <div className="font-semibold text-red-900 dark:text-red-100">Latest issue: {latestFailure.subject}</div>
                <div className="mt-1 leading-6 text-red-800/85 dark:text-red-200/85">{latestFailure.message}</div>
                {latestFailure.nextStep && (
                  <div className="mt-1 leading-6 text-red-800/85 dark:text-red-200/85">
                    Next step: {latestFailure.nextStep}
                  </div>
                )}
              </div>
            )}
            {recentOperations.length === 0 ? (
              <div className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                No operations have been logged in this local profile yet.
              </div>
            ) : (
              <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                {recentOperations.map((entry) => (
                  <div key={entry.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill tone={getOperationTone(entry.status)} label={entry.status} />
                        <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                          {entry.kind}
                        </span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{entry.subject}</span>
                      </div>
                      <div className="mt-1 break-words text-sm leading-6 text-slate-500 dark:text-slate-400">{entry.message}</div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-slate-400 dark:text-slate-500">
                        {entry.path && <span className="max-w-full break-all">Path: {entry.path}</span>}
                        {formatOperationCounts(entry) && <span>{formatOperationCounts(entry)}</span>}
                        {formatDuration(entry.durationMs) && <span>{formatDuration(entry.durationMs)}</span>}
                      </div>
                      {entry.error && (
                        <div className="mt-1 break-words text-xs leading-5 text-red-600 dark:text-red-300">
                          Error: {entry.error}
                        </div>
                      )}
                      {entry.nextStep && (
                        <div className="mt-1 break-words text-xs leading-5 text-slate-600 dark:text-slate-300">
                          Next step: {entry.nextStep}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{formatDateTime(entry.timestamp)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            {onOpenSettings && (
              <button type="button" onClick={onOpenSettings} className="workspace-secondary-btn px-4 py-2 text-sm">
                Settings
              </button>
            )}
            {onOpenVersionHistory && (
              <button type="button" onClick={onOpenVersionHistory} className="workspace-secondary-btn px-4 py-2 text-sm">
                Restore points
              </button>
            )}
            <button type="button" onClick={onClose} className="workspace-primary-btn px-4 py-2 text-sm">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
