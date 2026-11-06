import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

export type TenderWorkflowTab = {
  id: string;
  label: string;
  detail: string;
  complete: boolean;
  onSelect: () => void;
};

export type TenderIssueChecklistItem = {
  label: string;
  detail: string;
  complete: boolean;
};

type TenderWorkflowHeaderProps = {
  readinessDetail: string;
  tabs: ReadonlyArray<TenderWorkflowTab>;
  activeTabId: string;
  checklist: ReadonlyArray<TenderIssueChecklistItem>;
};

export function TenderWorkflowHeader({
  readinessDetail,
  tabs,
  activeTabId,
  checklist,
}: TenderWorkflowHeaderProps) {
  const completeCount = checklist.filter((item) => item.complete).length;

  return (
    <div className="grid gap-3 rounded-app-lg border border-slate-200/80 bg-white/92 p-3 shadow-sm dark:border-slate-700/80 dark:bg-surface-900/95 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Tender workflow</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{readinessDetail}</div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {tabs.map((tab, index) => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={tab.onSelect}
                aria-pressed={isActive}
                className={`rounded-app border px-3 py-2 text-left transition ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white shadow-app dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                    : tab.complete
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-200'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white dark:border-slate-700 dark:bg-surface-800 dark:text-slate-300 dark:hover:bg-surface-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-65">{index + 1}</span>
                  {tab.complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                </div>
                <div className="mt-1 truncate text-xs font-semibold">{tab.label}</div>
                <div className={`mt-0.5 truncate text-[11px] ${isActive ? 'opacity-80' : 'opacity-70'}`}>{tab.detail}</div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="rounded-app border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-surface-800/70">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Issue checklist</div>
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {completeCount}/{checklist.length}
          </div>
        </div>
        <div className="mt-2 space-y-1.5">
          {checklist.map((item) => (
            <div key={item.label} className="flex items-start gap-2 rounded-app-sm bg-white/70 px-2.5 py-2 text-xs dark:bg-surface-900/65">
              {item.complete
                ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-300" />
                : <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-500" />}
              <div className="min-w-0">
                <div className="font-semibold text-slate-800 dark:text-slate-100">{item.label}</div>
                <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">{item.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
