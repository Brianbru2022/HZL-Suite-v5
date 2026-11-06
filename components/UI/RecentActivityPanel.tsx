import React from 'react';
import { Activity, ArrowRight, CheckCircle2, Clock, Info, XCircle } from 'lucide-react';
import {
  listOperationLogEntries,
  subscribeToOperationLog,
  type OperationLogEntry,
  type OperationLogStatus,
} from '../../utils/operationLog';

function formatActivityTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function statusIcon(status: OperationLogStatus) {
  if (status === 'success') return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />;
  if (status === 'error') return <XCircle className="h-4 w-4 text-red-600 dark:text-red-300" />;
  if (status === 'cancelled') return <Clock className="h-4 w-4 text-amber-600 dark:text-amber-300" />;
  return <Info className="h-4 w-4 text-slate-400 dark:text-slate-500" />;
}

function scopeLabel(entry: OperationLogEntry) {
  return [entry.projectName, entry.billName].filter(Boolean).join(' / ');
}

export function RecentActivityPanel({
  title = 'Recent activity',
  projectId,
  limit = 5,
  onOpenAuditTrail,
}: {
  title?: string;
  projectId?: string | null;
  limit?: number;
  onOpenAuditTrail?: () => void;
}) {
  const [entries, setEntries] = React.useState<OperationLogEntry[]>([]);

  React.useEffect(() => {
    const refresh = () => {
      const nextEntries = listOperationLogEntries()
        .filter((entry) => !projectId || entry.projectId === projectId)
        .slice(0, limit);
      setEntries(nextEntries);
    };
    refresh();
    return subscribeToOperationLog(refresh);
  }, [limit, projectId]);

  return (
    <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            <Activity className="h-3.5 w-3.5" />
            Audit
          </div>
          <h3 className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">{title}</h3>
        </div>
        {onOpenAuditTrail && (
          <button type="button" onClick={onOpenAuditTrail} className="workspace-secondary-btn px-2.5 py-1.5 text-xs">
            Open
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="mt-4 rounded-app border border-dashed border-slate-300 bg-slate-50 p-4 text-xs leading-5 text-slate-500 dark:border-slate-700 dark:bg-surface-950/35 dark:text-slate-400">
          Saves, imports, exports, bill actions, and tender decisions will appear here as they are recorded.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-app border border-slate-100 bg-slate-50/75 p-3 dark:border-slate-800 dark:bg-surface-800/65">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 shrink-0">{statusIcon(entry.status)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">{entry.subject}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:bg-surface-900 dark:text-slate-400">
                      {entry.kind}
                    </span>
                  </div>
                  {scopeLabel(entry) && (
                    <div className="mt-1 truncate text-[11px] font-medium text-slate-400 dark:text-slate-500">{scopeLabel(entry)}</div>
                  )}
                  <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{entry.message}</div>
                  <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{formatActivityTime(entry.timestamp)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
