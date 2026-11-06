import React from 'react';
import { ArrowRight, Clipboard, Download, History, Info, Search, Trash2, X } from 'lucide-react';
import type { Project } from '../../types';
import { useModalFocus } from '../../hooks/useModalFocus';
import {
  clearOperationLogEntries,
  formatOperationLogForClipboard,
  listOperationLogEntries,
  subscribeToOperationLog,
  type OperationLogEntry,
  type OperationLogKind,
  type OperationLogStatus,
} from '../../utils/operationLog';
import type { ProjectEvidenceTarget } from '../../utils/projectEvidence';
import { getProjectEvidenceActionLabel, ProjectEvidencePanel } from '../Reports/ProjectEvidencePanel';

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function formatCounts(entry: OperationLogEntry) {
  if (!entry.counts) return '';
  return Object.entries(entry.counts)
    .filter(([, value]) => typeof value === 'number')
    .map(([key, value]) => `${value.toLocaleString()} ${key}`)
    .join(' | ');
}

function statusClass(status: OperationLogStatus) {
  if (status === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-200';
  if (status === 'error') return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/35 dark:text-red-200';
  if (status === 'cancelled') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-200';
  return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-surface-800 dark:text-slate-300';
}

const KIND_OPTIONS: Array<OperationLogKind | 'all'> = ['all', 'bill', 'tender', 'library', 'import', 'export', 'save', 'backup', 'ai', 'system'];
const STATUS_OPTIONS: Array<OperationLogStatus | 'all'> = ['all', 'success', 'error', 'info', 'cancelled'];
const DATE_OPTIONS = [
  { value: 'all', label: 'All dates' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
] as const;

function getEntryActionTarget(entry: OperationLogEntry): ProjectEvidenceTarget | null {
  if (entry.kind === 'bill') return 'bill';
  if (entry.kind === 'tender') return 'tender';
  if (entry.kind === 'library' || entry.kind === 'import') return 'library';
  if (entry.kind === 'export') return 'reports';
  return null;
}

function uniqueById<T extends { id: string; name: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function AuditTrailModal({
  isOpen,
  onClose,
  initialProjectId,
  project,
  onOpenBill,
  onOpenTenderAnalysis,
  onOpenReports,
  onOpenLibrary,
  onOpenVersionHistory,
  embedded = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialProjectId?: string | null;
  project?: Project | null;
  onOpenBill?: (billId?: string) => void;
  onOpenTenderAnalysis?: () => void;
  onOpenReports?: () => void;
  onOpenLibrary?: () => void;
  onOpenVersionHistory?: () => void;
  embedded?: boolean;
}) {
  const { contentRef, contentProps } = useModalFocus(isOpen && !embedded, onClose);
  const [entries, setEntries] = React.useState<OperationLogEntry[]>([]);
  const [query, setQuery] = React.useState('');
  const [kind, setKind] = React.useState<OperationLogKind | 'all'>('all');
  const [status, setStatus] = React.useState<OperationLogStatus | 'all'>('all');
  const [dateRange, setDateRange] = React.useState<(typeof DATE_OPTIONS)[number]['value']>('all');
  const [projectFilter, setProjectFilter] = React.useState('all');
  const [billFilter, setBillFilter] = React.useState('all');
  const [copyState, setCopyState] = React.useState<'idle' | 'copied' | 'failed'>('idle');

  React.useEffect(() => {
    if (!isOpen) return;
    const refresh = () => setEntries(listOperationLogEntries());
    refresh();
    return subscribeToOperationLog(refresh);
  }, [isOpen]);

  React.useEffect(() => {
    if (copyState === 'idle') return;
    const timeout = window.setTimeout(() => setCopyState('idle'), 2200);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  if (!isOpen) return null;

  const projectOptions = uniqueById(
    entries
      .filter((entry) => entry.projectId && entry.projectName)
      .map((entry) => ({ id: entry.projectId as string, name: entry.projectName as string }))
  ).sort((a, b) => a.name.localeCompare(b.name));

  const scopedProjectId = initialProjectId || project?.id || null;
  const effectiveProjectFilter = scopedProjectId || projectFilter;

  const billOptions = uniqueById(
    entries
      .filter((entry) => entry.billId && entry.billName)
      .filter((entry) => effectiveProjectFilter === 'all' || entry.projectId === effectiveProjectFilter)
      .map((entry) => ({ id: entry.billId as string, name: entry.billName as string }))
  ).sort((a, b) => a.name.localeCompare(b.name));

  const filteredEntries = entries.filter((entry) => {
    if (kind !== 'all' && entry.kind !== kind) return false;
    if (status !== 'all' && entry.status !== status) return false;
    if (effectiveProjectFilter !== 'all' && entry.projectId !== effectiveProjectFilter) return false;
    if (billFilter !== 'all' && entry.billId !== billFilter) return false;
    if (dateRange !== 'all') {
      const entryTime = new Date(entry.timestamp).getTime();
      if (Number.isNaN(entryTime)) return false;
      const now = Date.now();
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const cutoff = dateRange === 'today'
        ? startOfToday.getTime()
        : now - (dateRange === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000;
      if (entryTime < cutoff) return false;
    }
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [
      entry.kind,
      entry.status,
      entry.subject,
      entry.message,
      entry.projectName,
      entry.billName,
      entry.path,
      entry.error,
      entry.nextStep,
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatOperationLogForClipboard(filteredEntries));
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  };

  const handleDownload = () => {
    const body = formatOperationLogForClipboard(filteredEntries);
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `hzl-audit-trail-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    const confirmed = window.confirm('Clear the local audit trail? This does not change projects, bills, libraries, or exports.');
    if (!confirmed) return;
    clearOperationLogEntries();
    setEntries([]);
  };

  const evidenceTargets = [
    onOpenBill ? 'bill' : null,
    onOpenTenderAnalysis ? 'tender' : null,
    onOpenReports ? 'reports' : null,
    onOpenLibrary ? 'library' : null,
    onOpenVersionHistory ? 'version-history' : null,
  ].filter(Boolean) as ProjectEvidenceTarget[];

  const enabledTargetSet = new Set(evidenceTargets);

  const openEvidenceTarget = (target: ProjectEvidenceTarget, billId?: string) => {
    if (target === 'bill' && onOpenBill) {
      onClose();
      onOpenBill(billId);
      return;
    }
    if (target === 'tender' && onOpenTenderAnalysis) {
      onClose();
      onOpenTenderAnalysis();
      return;
    }
    if (target === 'reports' && onOpenReports) {
      onClose();
      onOpenReports();
      return;
    }
    if (target === 'library' && onOpenLibrary) {
      onClose();
      onOpenLibrary();
      return;
    }
    if (target === 'version-history' && onOpenVersionHistory) {
      onClose();
      onOpenVersionHistory();
    }
  };

  const content = (
      <div
        ref={contentRef}
        {...contentProps}
        data-smoke="audits-workspace"
        className={`flex w-full flex-col overflow-hidden rounded-app-lg border border-slate-200 bg-white shadow-app-lg dark:border-slate-700 dark:bg-surface-900 ${embedded ? 'h-full min-h-0' : 'max-h-[88vh] max-w-6xl'}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-700">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark:border-slate-700 dark:bg-surface-800 dark:text-slate-300">
              <History className="h-4 w-4" />
              Local operational history
            </div>
            <h2 className="mt-3 text-xl font-semibold text-slate-950 dark:text-slate-50">Local operational history</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-300">
              Review recent imports, exports, saves, library operations, backups, and system events recorded by this local installation. This history is editable and clearable; it is not an immutable or independently controlled audit record.
            </p>
          </div>
          <button type="button" onClick={onClose} className="workspace-secondary-btn px-3 py-2 text-xs" aria-label="Close audit trail">
            <X className="h-4 w-4" />
            Close
          </button>
        </div>

        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-3 dark:border-slate-700 dark:bg-surface-950/35">
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[260px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-app border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-emerald-400 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100"
                placeholder="Search audit trail..."
              />
            </label>
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as OperationLogKind | 'all')}
              className="rounded-app border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100"
            >
              {KIND_OPTIONS.map((option) => (
                <option key={option} value={option}>{option === 'all' ? 'All event types' : option}</option>
              ))}
            </select>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as OperationLogStatus | 'all')}
              className="rounded-app border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option === 'all' ? 'All statuses' : option}</option>
              ))}
            </select>
            <select
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value as (typeof DATE_OPTIONS)[number]['value'])}
              className="rounded-app border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100"
            >
              {DATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              value={effectiveProjectFilter}
              onChange={(event) => {
                setProjectFilter(event.target.value);
                setBillFilter('all');
              }}
              disabled={Boolean(scopedProjectId)}
              className="rounded-app border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100"
            >
              <option value="all">All projects</option>
              {scopedProjectId && !projectOptions.some((projectOption) => projectOption.id === scopedProjectId) && (
                <option value={scopedProjectId}>{project?.name || 'Current project'}</option>
              )}
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <select
              value={billFilter}
              onChange={(event) => setBillFilter(event.target.value)}
              disabled={billOptions.length === 0}
              className="rounded-app border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100"
            >
              <option value="all">All bills</option>
              {billOptions.map((bill) => (
                <option key={bill.id} value={bill.id}>{bill.name}</option>
              ))}
            </select>
            <button type="button" onClick={handleCopy} disabled={filteredEntries.length === 0} className="workspace-secondary-btn px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50">
              <Clipboard className="h-4 w-4" />
              {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy'}
            </button>
            <button type="button" onClick={handleDownload} disabled={filteredEntries.length === 0} className="workspace-secondary-btn px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50">
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={entries.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-app border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </button>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto p-6">
          <div className="mb-5">
            <ProjectEvidencePanel
              project={project}
              operationEntries={entries}
              title={project ? 'Current project evidence' : 'Installation evidence'}
              description={project
                ? 'Trace restore points, reports, tender decisions, and bill apply-back events tied to this project.'
                : 'Trace recent imports, exports, saves, library work, and other local audit events.'
              }
              compact
              enabledTargets={evidenceTargets}
              onOpenTarget={(target, item) => openEvidenceTarget(target, item.billId)}
            />
          </div>
          {filteredEntries.length === 0 ? (
            <div className="rounded-app-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-surface-950/30">
              <Info className="mx-auto h-6 w-6 text-slate-400" />
              <div className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">No audit entries to show</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Imports, exports, saves, library operations, and other recorded events will appear here.</div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-app-lg border border-slate-200 dark:border-slate-700">
              <table className="min-w-[980px] divide-y divide-slate-200 text-sm dark:divide-slate-700">
                <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800/70 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Time</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Event</th>
                    <th className="px-4 py-3 text-left">Source</th>
                    <th className="px-4 py-3 text-left">Counts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-surface-900">
                  {filteredEntries.map((entry) => {
                    const target = getEntryActionTarget(entry);
                    const canOpen = Boolean(target && enabledTargetSet.has(target));
                    return (
                      <tr key={entry.id} className="align-top">
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(entry.timestamp)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{entry.kind}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass(entry.status)}`}>{entry.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{entry.subject}</div>
                          {(entry.projectName || entry.billName) && (
                            <div className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                              {[entry.projectName, entry.billName].filter(Boolean).join(' / ')}
                            </div>
                          )}
                          <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{entry.message}</div>
                          {entry.path && <div className="mt-1 truncate text-[11px] text-slate-400 dark:text-slate-500">{entry.path}</div>}
                          {entry.error && <div className="mt-1 text-xs text-red-600 dark:text-red-300">{entry.error}</div>}
                          {entry.nextStep && <div className="mt-1 text-xs text-amber-700 dark:text-amber-300">{entry.nextStep}</div>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {target && canOpen ? (
                            <button
                              type="button"
                              onClick={() => openEvidenceTarget(target, entry.billId)}
                              className="workspace-secondary-btn px-2.5 py-1.5 text-xs"
                            >
                              {getProjectEvidenceActionLabel(target)}
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{formatCounts(entry) || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      {content}
    </div>
  );
}
