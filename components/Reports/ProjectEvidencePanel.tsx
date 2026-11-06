import React from 'react';
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, History, Info, RotateCcw, Scale } from 'lucide-react';
import type { Project } from '../../types';
import type { OperationLogEntry } from '../../utils/operationLog';
import {
  buildProjectEvidence,
  type ProjectEvidenceItem,
  type ProjectEvidenceTarget,
  type ProjectEvidenceTone,
} from '../../utils/projectEvidence';

function formatEvidenceTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function toneClasses(tone: ProjectEvidenceTone) {
  if (tone === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-200';
  if (tone === 'warning') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-200';
  if (tone === 'danger') return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/35 dark:text-rose-200';
  if (tone === 'ai') return 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/70 dark:bg-violet-950/35 dark:text-violet-200';
  if (tone === 'info') return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/35 dark:text-sky-200';
  return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-surface-800 dark:text-slate-300';
}

function itemIcon(item: ProjectEvidenceItem) {
  if (item.category === 'snapshot') return <RotateCcw className="h-4 w-4" />;
  if (item.category === 'tender-award') return <Scale className="h-4 w-4" />;
  if (item.category === 'apply-back') return <CheckCircle2 className="h-4 w-4" />;
  if (item.tone === 'danger' || item.tone === 'warning') return <AlertTriangle className="h-4 w-4" />;
  return <Activity className="h-4 w-4" />;
}

export function getProjectEvidenceActionLabel(target: ProjectEvidenceTarget) {
  switch (target) {
    case 'bill':
      return 'Open bill';
    case 'tender':
      return 'Open tender';
    case 'library':
      return 'Open library';
    case 'reports':
      return 'Open reports';
    case 'version-history':
      return 'Versions';
    case 'ai':
      return 'Open AI';
    case 'audit':
    default:
      return 'Open audit';
  }
}

export function ProjectEvidencePanel({
  project,
  operationEntries,
  title = 'Project evidence',
  description = 'Trace restore points, exports, tender decisions, and bill apply-back events from one place.',
  limit = 6,
  compact = false,
  enabledTargets,
  onOpenTarget,
}: {
  project?: Project | null;
  operationEntries: OperationLogEntry[];
  title?: string;
  description?: string;
  limit?: number;
  compact?: boolean;
  enabledTargets?: ProjectEvidenceTarget[];
  onOpenTarget?: (target: ProjectEvidenceTarget, item: ProjectEvidenceItem) => void;
}) {
  const evidence = React.useMemo(
    () => buildProjectEvidence(project, operationEntries, { limit }),
    [limit, operationEntries, project]
  );
  const enabledTargetSet = React.useMemo(() => new Set(enabledTargets), [enabledTargets]);

  return (
    <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            <History className="h-3.5 w-3.5" />
            Evidence
          </div>
          <h3 className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">{title}</h3>
          {!compact && <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClasses(evidence.counts.exceptions > 0 ? 'warning' : 'success')}`}>
          {evidence.counts.exceptions > 0 ? `${evidence.counts.exceptions} issue${evidence.counts.exceptions === 1 ? '' : 's'}` : 'No exceptions'}
        </span>
      </div>

      <div className={`mt-4 grid gap-2 ${compact ? 'md:grid-cols-5' : 'sm:grid-cols-2 lg:grid-cols-5'}`}>
        {evidence.metrics.map((metric) => (
          <div key={metric.id} className="rounded-app-sm border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-surface-950/35">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{metric.label}</div>
            <div className="mt-1 text-base font-semibold tabular-nums text-slate-950 dark:text-slate-50">{metric.value}</div>
            <div className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">{metric.detail}</div>
          </div>
        ))}
      </div>

      {evidence.items.length === 0 ? (
        <div className="mt-4 rounded-app-sm border border-dashed border-slate-300 bg-slate-50 p-4 text-xs leading-5 text-slate-500 dark:border-slate-700 dark:bg-surface-950/35 dark:text-slate-400">
          <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
            <Info className="h-4 w-4 text-slate-400" />
            No evidence yet
          </div>
          <div className="mt-1">Create a restore point, export a report, record a tender award, or apply tender rates to build the project trail.</div>
        </div>
      ) : (
        <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-app-sm border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
          {evidence.items.map((item) => {
            const canOpen = Boolean(
              item.actionTarget
              && onOpenTarget
              && (!enabledTargets || enabledTargetSet.has(item.actionTarget))
            );
            return (
              <div key={item.id} className="flex flex-wrap items-start gap-3 bg-white px-3 py-3 dark:bg-surface-900">
                <div className={`mt-0.5 rounded-app-sm border p-1.5 ${toneClasses(item.tone)}`}>{itemIcon(item)}</div>
                <div className="min-w-[220px] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-950 dark:text-slate-50">{item.title}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
                      {item.source}
                    </span>
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.detail}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {item.timestamp && <span className="text-[11px] text-slate-400 dark:text-slate-500">{formatEvidenceTime(item.timestamp)}</span>}
                    {item.meta.map((meta) => (
                      <span key={meta} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-surface-800 dark:text-slate-400">
                        {meta}
                      </span>
                    ))}
                  </div>
                </div>
                {item.actionTarget && canOpen && (
                  <button
                    type="button"
                    onClick={() => onOpenTarget?.(item.actionTarget as ProjectEvidenceTarget, item)}
                    className="workspace-secondary-btn px-2.5 py-1.5 text-xs"
                  >
                    {getProjectEvidenceActionLabel(item.actionTarget)}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
