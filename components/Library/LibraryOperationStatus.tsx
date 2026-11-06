import { AlertTriangle, Check, Loader2, X } from 'lucide-react';

export type LibraryOperationPhase = 'running' | 'complete' | 'error' | 'cancelled';

export type LibraryOperationStatusModel = {
  label: string;
  phase: LibraryOperationPhase;
  detail?: string;
  startedAt: string;
  finishedAt?: string;
  completedCount?: number;
  totalCount?: number;
  failedCount?: number;
  destination?: string;
  error?: string;
  cancelable?: boolean;
  nextSteps?: string[];
};

type LibraryOperationStatusProps = {
  status: LibraryOperationStatusModel | null;
  isCancelRequested: boolean;
  onCancel: () => void;
  onDismiss: () => void;
};

export function LibraryOperationStatus({
  status,
  isCancelRequested,
  onCancel,
  onDismiss,
}: LibraryOperationStatusProps) {
  if (!status) return null;

  return (
    <div className="shrink-0 border-b border-slate-200/80 bg-white/82 px-6 py-2.5 text-xs shadow-sm backdrop-blur-xl dark:border-slate-700/80 dark:bg-[rgb(15_22_28_/_0.94)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {status.phase === 'running' ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-600 dark:text-emerald-300" />
          ) : status.phase === 'error' ? (
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-300" />
          ) : (
            <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
          )}
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {status.label}
              <span className="ml-2 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {status.phase}
              </span>
            </div>
            <div className="mt-0.5 truncate text-slate-500 dark:text-slate-400">
              {status.detail || 'Working...'}
              {status.totalCount ? ` (${(status.completedCount || 0).toLocaleString()} / ${status.totalCount.toLocaleString()})` : ''}
              {status.failedCount ? `, ${status.failedCount.toLocaleString()} failed` : ''}
              {status.destination ? ` | ${status.destination}` : ''}
              {status.error ? ` | ${status.error}` : ''}
            </div>
            {status.phase !== 'running' && status.nextSteps?.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {status.nextSteps.slice(0, 3).map((step) => (
                  <span key={step} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200">
                    {step}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status.phase === 'running' && status.cancelable && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isCancelRequested}
              className="workspace-secondary-btn px-3 py-1.5 text-xs disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              {isCancelRequested ? 'Stopping...' : 'Stop'}
            </button>
          )}
          {status.phase !== 'running' && (
            <button
              type="button"
              onClick={onDismiss}
              className="workspace-secondary-btn px-3 py-1.5 text-xs"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
