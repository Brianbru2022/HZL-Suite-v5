import { AlertTriangle, CheckCircle2, Database, Download, FileJson, Info, Loader2, Star, X } from 'lucide-react';
import type { ItemLibrary } from '../../types';
import {
  canExportLibraryAll,
  getLibraryStats,
  normalizeLibraryLabel,
} from '../../utils/libraryViewModel';
import {
  buildLibraryExportPreflight,
  type LibraryWorkflowCheck,
  type LibraryWorkflowSeverity,
} from '../../utils/libraryWorkflowPreflight';

type ExportPermissions = NonNullable<ItemLibrary['permissions']>;

type LibraryExportDialogProps = {
  exportableLibraries: ItemLibrary[];
  sortedLibraries: ItemLibrary[];
  selectedExportLibraries: ItemLibrary[];
  selectedExportLibraryIds: Record<string, boolean>;
  libraryStatsById: Map<string, { folders: number; sections: number; pages: number; items: number }>;
  exportPermissions: ExportPermissions;
  isExportingLibraries: boolean;
  libraryPackProgress: string;
  onClose: () => void;
  onSelectExportLibraries: (next: Record<string, boolean>) => void;
  onChangeExportPermissions: (next: ExportPermissions) => void;
  onExportJson: () => void;
  onExportPack: () => void;
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

export function LibraryExportDialog({
  exportableLibraries,
  sortedLibraries,
  selectedExportLibraries,
  selectedExportLibraryIds,
  libraryStatsById,
  exportPermissions,
  isExportingLibraries,
  libraryPackProgress,
  onClose,
  onSelectExportLibraries,
  onChangeExportPermissions,
  onExportJson,
  onExportPack,
}: LibraryExportDialogProps) {
  const preflight = buildLibraryExportPreflight({
    libraries: sortedLibraries,
    selectedLibraryIds: selectedExportLibraryIds,
    exportPermissions,
  });
  const isPackRecommended = preflight.recommendedFormat === 'pack';

  const updateSelectedLibrary = (libraryId: string, checked: boolean) => {
    onSelectExportLibraries({
      ...selectedExportLibraryIds,
      [libraryId]: checked,
    });
  };

  const updatePermission = (key: keyof ExportPermissions, checked: boolean) => {
    onChangeExportPermissions({
      ...exportPermissions,
      [key]: checked,
    });
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
      <div className="workspace-shell flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden p-0">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 bg-white/92 px-6 py-5 dark:border-slate-700/80 dark:bg-[rgb(16_24_30_/_0.98)]">
          <div>
            <div className="workspace-chip mb-3">
              <Download className="h-3.5 w-3.5" />
              Library export
            </div>
            <h3 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Export libraries</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
              Choose what recipients can do with imported copies. They can still insert items into bills even when library editing is blocked.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="workspace-secondary-btn px-3 py-2 text-xs"
            aria-label="Close library export dialog"
            disabled={isExportingLibraries}
          >
            <X className="h-4 w-4" />
            Close
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto bg-white/88 px-6 py-6 dark:bg-[rgb(16_24_30_/_0.96)]">
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ['1', 'Select', 'Choose exportable libraries and skip protected copies automatically.'],
              ['2', 'Preflight', 'Check size, storage mode, and recipient permissions.'],
              ['3', 'Export', 'Use a pack for full backup or JSON for compatibility hand-off.'],
            ].map(([step, title, detail]) => (
              <div key={step} className="rounded-app border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-700/80 dark:bg-slate-950/20">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">{step}</div>
                <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
                <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            {preflight.metrics.map((metric) => (
              <div key={metric.id} className="rounded-app border border-slate-200/80 bg-white/90 px-3 py-3 dark:border-slate-700/80 dark:bg-[rgb(20_30_38_/_0.96)]">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{metric.label}</div>
                <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{metric.value.toLocaleString()}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {preflight.checks.map((check) => (
              renderPreflightCheck(check)
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className={`rounded-app border p-4 ${isPackRecommended ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/70 dark:bg-emerald-950/24' : 'border-slate-200/80 bg-white/90 dark:border-slate-700/80 dark:bg-[rgb(20_30_38_/_0.96)]'}`}>
              <div className={`flex flex-wrap items-center gap-2 text-sm font-semibold ${isPackRecommended ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-900 dark:text-slate-100'}`}>
                <Database className="h-4 w-4" />
                SQLite pack
                {isPackRecommended && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">Recommended</span>
                )}
              </div>
              <p className={`mt-2 text-xs leading-5 ${isPackRecommended ? 'text-emerald-800/85 dark:text-emerald-100/80' : 'text-slate-500 dark:text-slate-400'}`}>
                Writes database rows in chunks and is the safest route for full standards, large item counts, and desktop-to-desktop restores.
              </p>
              {libraryPackProgress && (
                <div className="mt-3 rounded-app-sm border border-emerald-200 bg-white/70 px-2 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                  {libraryPackProgress}
                </div>
              )}
            </div>
            <div className={`rounded-app border p-4 ${!isPackRecommended ? 'border-blue-200 bg-blue-50/70 dark:border-blue-900/70 dark:bg-blue-950/24' : 'border-slate-200/80 bg-white/90 dark:border-slate-700/80 dark:bg-[rgb(20_30_38_/_0.96)]'}`}>
              <div className={`flex flex-wrap items-center gap-2 text-sm font-semibold ${!isPackRecommended ? 'text-blue-900 dark:text-blue-100' : 'text-slate-900 dark:text-slate-100'}`}>
                <FileJson className="h-4 w-4" />
                JSON file
                {!isPackRecommended && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">Suitable</span>
                )}
              </div>
              <p className={`mt-2 text-xs leading-5 ${!isPackRecommended ? 'text-blue-800/85 dark:text-blue-100/80' : 'text-slate-500 dark:text-slate-400'}`}>
                Useful for small compatibility transfers, reviewable backup files, and hand-offs where recipients cannot use .qsplib packs.
              </p>
            </div>
          </div>

          <div className="rounded-app border border-slate-200/80 bg-white/90 p-4 text-sm dark:border-slate-700/80 dark:bg-[rgb(20_30_38_/_0.96)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="font-medium text-slate-900 dark:text-slate-100">Libraries to export</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="workspace-secondary-btn px-3 py-1.5 text-xs"
                  onClick={() => {
                    const next: Record<string, boolean> = {};
                    exportableLibraries.forEach((library) => { next[library.id] = true; });
                    onSelectExportLibraries(next);
                  }}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="workspace-secondary-btn px-3 py-1.5 text-xs"
                  onClick={() => onSelectExportLibraries({})}
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
              {sortedLibraries.map((library) => {
                const isExportable = canExportLibraryAll(library);
                const stats = libraryStatsById.get(library.id) || getLibraryStats(library);
                return (
                  <label
                    key={library.id}
                    className={`flex items-start gap-3 rounded-app border px-3 py-2 ${
                      isExportable
                        ? 'cursor-pointer border-slate-200/70 bg-slate-50/70 dark:border-slate-700/70 dark:bg-slate-950/20'
                        : 'cursor-not-allowed border-amber-200/80 bg-amber-50/70 opacity-75 dark:border-amber-900/60 dark:bg-amber-950/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 disabled:cursor-not-allowed"
                      checked={Boolean(selectedExportLibraryIds[library.id]) && isExportable}
                      disabled={!isExportable}
                      onChange={(event) => updateSelectedLibrary(library.id, event.target.checked)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium text-slate-900 dark:text-slate-100">{normalizeLibraryLabel(library.name, 'Library')}</span>
                        {library.favorite && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500" />}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                        {stats.folders.toLocaleString()} folders | {stats.sections.toLocaleString()} sections | {stats.items.toLocaleString()} items
                        {!isExportable ? ' | protected from full export' : ''}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="rounded-app border border-slate-200/80 bg-white/90 p-4 text-sm dark:border-slate-700/80 dark:bg-[rgb(20_30_38_/_0.96)]">
            <div className="font-medium text-slate-900 dark:text-slate-100">Recipient permissions</div>
            <div className="mt-3 grid gap-3">
              {[
                ['allowExportAll', 'Allow full library export', 'Recipient can include this imported library in Export all.'],
                ['allowExportFolders', 'Allow folder JSON export', 'Recipient can export individual folders from this imported library.'],
                ['allowExportSections', 'Allow section JSON export', 'Recipient can export individual sections from this imported library.'],
                ['allowLibraryEditing', 'Allow library editing', 'Recipient can edit/import/AI-fill/delete inside the library. Bills remain editable either way.'],
              ].map(([key, label, hint]) => (
                <label key={key} className="flex items-start gap-3 rounded-app border border-slate-200/70 bg-slate-50/70 px-3 py-2 dark:border-slate-700/70 dark:bg-slate-950/20">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    checked={Boolean(exportPermissions[key as keyof ExportPermissions])}
                    onChange={(event) => updatePermission(key as keyof ExportPermissions, event.target.checked)}
                  />
                  <span>
                    <span className="block font-medium text-slate-900 dark:text-slate-100">{label}</span>
                    <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isExportingLibraries} className="workspace-secondary-btn px-4 py-2 text-sm disabled:opacity-50">
              Cancel
            </button>
            <button
              type="button"
              onClick={onExportPack}
              disabled={isExportingLibraries || exportableLibraries.length === 0 || selectedExportLibraries.length === 0}
              className="workspace-primary-btn px-4 py-2 text-sm disabled:opacity-50"
            >
              {isExportingLibraries ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isExportingLibraries ? 'Exporting...' : 'Export SQLite pack'}
            </button>
            <button
              type="button"
              onClick={onExportJson}
              disabled={isExportingLibraries || exportableLibraries.length === 0 || selectedExportLibraries.length === 0}
              className="workspace-secondary-btn px-4 py-2 text-sm disabled:opacity-50"
            >
              {isExportingLibraries ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isExportingLibraries ? 'Exporting...' : 'Export JSON file'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
