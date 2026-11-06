import React from 'react';
import { ArrowDownToLine, CheckCircle2, Circle, FileSpreadsheet, Layers3, ShieldCheck, Trophy, Users } from 'lucide-react';
import type { TenderWorkflowStage, TenderWorkflowStageId, TenderWorkflowStageTone } from '../../utils/tenderWorkflow';

type TenderWorkflowStageCardsProps = {
  stages: ReadonlyArray<TenderWorkflowStage>;
  activeStageId: TenderWorkflowStageId;
  onSelectStage: (stageId: TenderWorkflowStageId) => void;
};

const toneClasses: Record<TenderWorkflowStageTone, string> = {
  neutral: 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200',
  info: 'border-blue-200 bg-blue-50/80 text-blue-800 dark:border-blue-900/70 dark:bg-blue-950/25 dark:text-blue-200',
  success: 'border-emerald-200 bg-emerald-50/80 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-200',
  warning: 'border-amber-200 bg-amber-50/85 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/28 dark:text-amber-200',
  danger: 'border-rose-200 bg-rose-50/85 text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/28 dark:text-rose-200',
};

const stageIcons: Record<TenderWorkflowStageId, typeof Users> = {
  SETUP: Users,
  RETURNS: FileSpreadsheet,
  COMPARISON: Layers3,
  AWARD: Trophy,
  APPLY: ArrowDownToLine,
  EXPORT: ShieldCheck,
};

export function TenderWorkflowStageCards({
  stages,
  activeStageId,
  onSelectStage,
}: TenderWorkflowStageCardsProps) {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
      {stages.map((stage) => {
        const Icon = stageIcons[stage.id];
        const isActive = stage.id === activeStageId;

        return (
          <button
            key={stage.id}
            type="button"
            onClick={() => onSelectStage(stage.id)}
            aria-pressed={isActive}
            className={`min-h-[7.25rem] rounded-app border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
              isActive
                ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                : toneClasses[stage.tone]
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-75">{stage.label}</span>
              </div>
              {stage.complete ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Circle className="h-4 w-4 shrink-0 opacity-55" />}
            </div>
            <div className="mt-3 truncate text-sm font-semibold">{stage.status}</div>
            <div className={`mt-1 line-clamp-2 text-xs leading-5 ${isActive ? 'opacity-80' : 'opacity-75'}`}>{stage.detail}</div>
          </button>
        );
      })}
    </div>
  );
}
