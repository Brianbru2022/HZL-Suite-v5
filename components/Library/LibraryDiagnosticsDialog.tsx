import { AlertTriangle, X } from 'lucide-react';

export type LibraryHeapSample = {
  usedJsHeapSize?: number;
  totalJsHeapSize?: number;
  jsHeapSizeLimit?: number;
  sampledAt: string;
};

type LibraryDiagnosticsDialogProps = {
  metrics: Record<string, any>;
  warnings: string[];
  debugSample: LibraryHeapSample;
  isDebugLogging: boolean;
  debugLogPath: string | null;
  onClose: () => void;
  onToggleLogging: () => void;
};

function formatMemoryMb(value?: number) {
  if (value == null) return 'Unavailable';
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function LibraryDiagnosticsDialog({
  metrics,
  warnings,
  debugSample,
  isDebugLogging,
  debugLogPath,
  onClose,
  onToggleLogging,
}: LibraryDiagnosticsDialogProps) {
  const metricRows = [
    ['Selected library', metrics.selectedLibrary],
    ['Selected folder', metrics.selectedFolder],
    ['Selected section', metrics.selectedSection],
    ['Libraries loaded', metrics.libraryCount.toLocaleString()],
    ['Folders in library', metrics.activeLibraryFolderCount.toLocaleString()],
    ['Visible folders', metrics.visibleFolderCount.toLocaleString()],
    ['Sections in folder', metrics.activeFolderSectionCount.toLocaleString()],
    ['Section items', metrics.activeSectionItemCount.toLocaleString()],
    ['Priced lines', metrics.activeSectionPricedCount.toLocaleString()],
    ['Flat rows (raw)', metrics.rawFlatItemCount.toLocaleString()],
    ['Flat rows (visible)', metrics.visibleFlatItemCount.toLocaleString()],
    ['Flat virtualization', metrics.virtualizedFlatSection ? 'On' : 'Off'],
    ['Pages in section', metrics.pageCount.toLocaleString()],
    ['Expanded pages', metrics.expandedPageCount.toLocaleString()],
    ['Collapsed pages', metrics.collapsedPageCount.toLocaleString()],
    ['Page item total', metrics.totalPageItems.toLocaleString()],
    ['Largest page', metrics.largestPageItemCount.toLocaleString()],
    ['Collapsed headings', metrics.collapsedHeadingCount.toLocaleString()],
    ['Search query', metrics.searchQuery],
    ['Library operation', metrics.libraryOperation],
    ['Operation detail', metrics.libraryOperationDetail],
    ['Operation counts', metrics.libraryOperationCounts],
    ['Operation destination', metrics.libraryOperationDestination],
  ];

  return (
    <div className="fixed inset-0 z-[145] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="workspace-shell w-full max-w-5xl overflow-hidden p-0"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 bg-white/92 px-6 py-5 dark:border-slate-700/80 dark:bg-[rgb(16_24_30_/_0.98)]">
          <div>
            <div className="workspace-chip mb-3">
              <AlertTriangle className="h-3.5 w-3.5" />
              Library diagnostics
            </div>
            <h3 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Debug large library behaviour</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
              This gives us a live readout of the Library render size and available browser heap so we can catch the out-of-memory path before the window crashes.
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Background log: {isDebugLogging ? `running (${debugLogPath || 'preparing...'})` : 'off'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="workspace-secondary-btn px-3 py-2 text-xs"
            aria-label="Close library diagnostics"
          >
            <X className="h-4 w-4" />
            Close
          </button>
        </div>

        <div className="grid gap-4 bg-white/88 px-6 py-6 dark:bg-[rgb(16_24_30_/_0.96)] lg:grid-cols-[1.35fr_0.85fr]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {metricRows.map(([label, value]) => (
                <div key={label} className="rounded-app-lg border border-slate-200/80 bg-white/92 p-3 dark:border-slate-700/80 dark:bg-[rgb(20_30_38_/_0.96)]">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{label}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</div>
                </div>
              ))}
            </div>

            <div className="rounded-app-xl border border-slate-200/80 bg-white/92 p-4 dark:border-slate-700/80 dark:bg-[rgb(20_30_38_/_0.96)]">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Heap sample</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Used JS heap</div>
                  <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{formatMemoryMb(debugSample.usedJsHeapSize)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Total JS heap</div>
                  <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{formatMemoryMb(debugSample.totalJsHeapSize)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Heap limit</div>
                  <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{formatMemoryMb(debugSample.jsHeapSizeLimit)}</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">Last sampled: {new Date(debugSample.sampledAt).toLocaleString()}</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-app-xl border border-amber-200/80 bg-amber-50/80 p-4 dark:border-amber-900/60 dark:bg-[rgb(55_38_20_/_0.68)]">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">Risk hints</div>
              {warnings.length ? (
                <ul className="mt-3 space-y-2 text-sm text-amber-900 dark:text-amber-100">
                  {warnings.map((warning) => (
                    <li key={warning} className="rounded-app-md bg-white/60 px-3 py-2 dark:bg-slate-950/20">{warning}</li>
                  ))}
                </ul>
              ) : (
                <div className="mt-3 text-sm text-amber-900 dark:text-amber-100">No immediate red flags in the current snapshot.</div>
              )}
            </div>

            <div className="rounded-app-xl border border-slate-200/80 bg-white/92 p-4 text-sm text-slate-600 dark:border-slate-700/80 dark:bg-[rgb(20_30_38_/_0.96)] dark:text-slate-300">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">How to use this</div>
              <div className="mt-3 space-y-2">
                <p>Open this dialog before importing or expanding a very large section, then keep it open while you navigate.</p>
                <p>If expanded pages, visible flat rows, or heap usage jump sharply just before the slowdown, we'll know exactly which render path still needs tightening.</p>
                <p>If the heap sample is unavailable, that means the current runtime is not exposing browser memory counters, but the row/page metrics will still help us isolate the crash path.</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onToggleLogging}
                  className={`workspace-compact-btn ${isDebugLogging ? 'border-emerald-400/60 bg-emerald-50 text-emerald-700 dark:border-emerald-700/70 dark:bg-emerald-950/30 dark:text-emerald-200' : ''}`}
                >
                  <AlertTriangle className="h-4 w-4" />
                  {isDebugLogging ? 'Stop background log' : 'Start background log'}
                </button>
                {debugLogPath && (
                  <div className="rounded-app-md border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs text-slate-600 dark:border-slate-700/80 dark:bg-slate-900/30 dark:text-slate-300">
                    Saving to: {debugLogPath}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
