import { AlertTriangle, CheckCircle2, Database, FileJson, Info, Loader2, Scissors, Upload, X } from 'lucide-react';
import type { ItemLibrary } from '../../types';
import {
  buildLibraryCatalogImportGuide,
  type LibraryWorkflowCheck,
  type LibraryWorkflowSeverity,
} from '../../utils/libraryWorkflowPreflight';
import { normalizeLibraryLabel } from '../../utils/libraryViewModel';

type LibraryImportDialogProps = {
  libraryCount: number;
  activeLib: ItemLibrary | undefined;
  isImportingLibraryPack: boolean;
  isSplittingLibraryJson: boolean;
  libraryPackProgress: string;
  onClose: () => void;
  onImportPack: () => void;
  onImportJson: () => void;
  onSplitJson: () => void;
};

const severityClasses: Record<LibraryWorkflowSeverity, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200',
  info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/70 dark:bg-blue-950/30 dark:text-blue-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200',
  danger: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200',
};

const severityIcons: Record<LibraryWorkflowSeverity, typeof CheckCircle2> = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  danger: AlertTriangle,
};

function renderPreflightCheck(check: LibraryWorkflowCheck) {
  const Icon = severityIcons[check.severity];
  return (
    <div key={check.id} className={`flex gap-3 rounded-app border px-3 py-2.5 ${severityClasses[check.severity]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <div className="text-sm font-semibold">{check.label}</div>
        <div className="mt-0.5 text-xs opacity-85">{check.detail}</div>
      </div>
    </div>
  );
}

export function LibraryImportDialog({
  libraryCount,
  activeLib,
  isImportingLibraryPack,
  isSplittingLibraryJson,
  libraryPackProgress,
  onClose,
  onImportPack,
  onImportJson,
  onSplitJson,
}: LibraryImportDialogProps) {
  const guide = buildLibraryCatalogImportGuide({ libraryCount, activeLibrary: activeLib });
  const isBusy = isImportingLibraryPack || isSplittingLibraryJson;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
      <div className="workspace-shell flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden p-0">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 bg-white/92 px-6 py-5 dark:border-slate-700/80 dark:bg-[rgb(16_24_30_/_0.98)]">
          <div>
            <div className="workspace-chip mb-3">
              <Upload className="h-3.5 w-3.5" />
              Library import
            </div>
            <h3 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Import workflow</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-300">
              Choose a pack for full library backups, JSON for compatibility files, or split a large JSON export into safer section files.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="workspace-secondary-btn px-3 py-2 text-xs"
            aria-label="Close library import dialog"
            disabled={isBusy}
          >
            <X className="h-4 w-4" />
            Close
          </button>
        </div>

        <div className="grid gap-5 overflow-y-auto bg-white/88 px-6 py-6 dark:bg-[rgb(16_24_30_/_0.96)]">
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ['1', 'Preflight', 'Check catalog state and permissions before choosing a file.'],
              ['2', 'Import', 'Pick the safest route for the file you have.'],
              ['3', 'Review', 'Confirm counts, open the imported library, then export a backup if needed.'],
            ].map(([step, title, detail]) => (
              <div key={step} className="rounded-app border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-700/80 dark:bg-slate-950/20">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">{step}</div>
                <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
                <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {guide.checks.map((check) => (
              renderPreflightCheck(check)
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-app border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/24">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                <Database className="h-4 w-4" />
                SQLite pack
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">Recommended</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-emerald-800/85 dark:text-emerald-100/80">
                Best for full standards, large item counts, and moving libraries between desktop installs.
              </p>
              {libraryPackProgress && (
                <div className="mt-3 rounded-app-sm border border-emerald-200 bg-white/70 px-2 py-1 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                  {libraryPackProgress}
                </div>
              )}
              <button type="button" onClick={onImportPack} disabled={isBusy} className="workspace-primary-btn mt-4 w-full px-3 py-2 text-xs disabled:opacity-50">
                {isImportingLibraryPack ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isImportingLibraryPack ? 'Importing...' : 'Import pack'}
              </button>
            </div>

            <div className="rounded-app border border-slate-200/80 bg-white/90 p-4 dark:border-slate-700/80 dark:bg-[rgb(20_30_38_/_0.96)]">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <FileJson className="h-4 w-4" />
                JSON backup
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Good for small compatibility files, custom library JSON, and older exports.
              </p>
              <button type="button" onClick={onImportJson} disabled={isBusy} className="workspace-secondary-btn mt-4 w-full px-3 py-2 text-xs disabled:opacity-50">
                <Upload className="h-4 w-4" />
                Import JSON
              </button>
            </div>

            <div className="rounded-app border border-slate-200/80 bg-white/90 p-4 dark:border-slate-700/80 dark:bg-[rgb(20_30_38_/_0.96)]">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Scissors className="h-4 w-4" />
                Split JSON
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Break a large library JSON into section files before importing or sharing.
              </p>
              <button type="button" onClick={onSplitJson} disabled={isBusy} className="workspace-secondary-btn mt-4 w-full px-3 py-2 text-xs disabled:opacity-50">
                {isSplittingLibraryJson ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" />}
                {isSplittingLibraryJson ? 'Splitting...' : 'Split JSON file'}
              </button>
            </div>
          </div>

          <div className="rounded-app border border-blue-200 bg-blue-50/70 px-4 py-3 text-xs leading-5 text-blue-800 dark:border-blue-900/70 dark:bg-blue-950/25 dark:text-blue-200">
            After import, select the new library from the catalog and check priced item counts. {activeLib ? `Current library: ${normalizeLibraryLabel(activeLib.name, 'Library')}.` : 'No active library is selected.'}
          </div>
        </div>
      </div>
    </div>
  );
}
