import React from 'react';
import {
  BarChart3,
  Briefcase,
  Building2,
  ClipboardCheck,
  FileCheck2,
  FileClock,
  FileText,
  History,
  Calculator,
  Library as LibraryIcon,
  Ruler,
  ScrollText,
  X,
} from 'lucide-react';
import type { Project, WorkflowModule, WorkflowModuleId } from '../../types';
import { WORKFLOW_MODULES, getWorkflowModuleStatusLabel } from '../../utils/workflowModules';
import { useModalFocus } from '../../hooks/useModalFocus';

const MODULE_ICONS: Partial<Record<WorkflowModuleId, React.ReactNode>> = {
  APPRAISALS: <Calculator className="h-5 w-5" />,
  TAKE_OFF: <Ruler className="h-5 w-5" />,
  ESTIMATING: <Building2 className="h-5 w-5" />,
  LIBRARY_MAINTENANCE: <LibraryIcon className="h-5 w-5" />,
  TENDER_ANALYSIS: <Briefcase className="h-5 w-5" />,
  SUBCONTRACT_APPOINTMENT: <ClipboardCheck className="h-5 w-5" />,
  CONTRACTS: <ClipboardCheck className="h-5 w-5" />,
  VALUATIONS: <FileClock className="h-5 w-5" />,
  VARIATIONS: <FileText className="h-5 w-5" />,
  FINAL_ACCOUNTS: <FileCheck2 className="h-5 w-5" />,
  AUDITS: <History className="h-5 w-5" />,
  COST_REPORTS: <BarChart3 className="h-5 w-5" />,
};

function getStatusClass(module: WorkflowModule, isActive = false) {
  if (module.status === 'AVAILABLE') {
    return isActive
      ? 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/55 dark:text-emerald-100'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-200';
  }
  if (module.status === 'BETA') {
    return isActive
      ? 'border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-800 dark:bg-sky-950/55 dark:text-sky-100'
      : 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/35 dark:text-sky-200';
  }
  return isActive
    ? 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950/55 dark:text-amber-100'
    : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-200';
}

function ModuleListItem({
  module,
  isActive,
  onSelect,
}: {
  module: WorkflowModule;
  isActive: boolean;
  onSelect: () => void;
}) {
  const icon = MODULE_ICONS[module.id] || <ScrollText className="h-5 w-5" />;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-app border px-4 py-3 text-left transition ${
        isActive
          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-card dark:border-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-100'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-surface-800'
      }`}
      aria-pressed={isActive}
    >
      <div className="flex items-start gap-3">
        <div className={`rounded-app p-2 ${isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/55 dark:text-emerald-100' : 'bg-slate-100 text-slate-500 dark:bg-surface-800 dark:text-slate-300'}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{module.name}</div>
          <div className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${getStatusClass(module, isActive)}`}>
            {getWorkflowModuleStatusLabel(module.status)}
          </div>
        </div>
      </div>
    </button>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
        {title}
      </div>
      <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {items.map((item) => (
          <div key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FutureModulesModal({
  isOpen,
  project,
  onClose,
}: {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
}) {
  const [selectedModuleId, setSelectedModuleId] = React.useState<WorkflowModuleId>('ESTIMATING');
  const { contentRef, contentProps } = useModalFocus(isOpen, onClose);
  const selectedModule = WORKFLOW_MODULES.find((module) => module.id === selectedModuleId) || WORKFLOW_MODULES[0];
  const selectedIcon = selectedModule ? MODULE_ICONS[selectedModule.id] || <ScrollText className="h-5 w-5" /> : <ScrollText className="h-5 w-5" />;
  const dependencyNames = (selectedModule.dependsOn || [])
    .map((moduleId) => WORKFLOW_MODULES.find((module) => module.id === moduleId)?.name)
    .filter((name): name is string => Boolean(name));

  if (!isOpen || !selectedModule) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={contentRef}
        {...contentProps}
        data-smoke="roadmap-workspace"
        className="workspace-shell flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200/80 bg-white/92 px-6 py-5 dark:border-slate-700/80 dark:bg-surface-900/95">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="workspace-chip mb-3">
                <ScrollText className="h-3.5 w-3.5" />
                Workflow roadmap
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Commercial workflow map</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-300">
                See the full HZL QS Suite workflow: live modules, beta tools, and planned modules with their dependencies and intended outputs.
              </p>
            </div>
            <button type="button" onClick={onClose} className="workspace-secondary-btn px-3 py-2 text-xs" aria-label="Close future modules">
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-y-auto border-b border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-surface-950/70 lg:border-b-0 lg:border-r">
            <div className="space-y-2">
              {WORKFLOW_MODULES.map((module) => (
                <div key={module.id}>
                  <ModuleListItem
                    module={module}
                    isActive={module.id === selectedModule.id}
                    onSelect={() => setSelectedModuleId(module.id)}
                  />
                </div>
              ))}
            </div>
          </aside>
          <main className="min-h-0 overflow-y-auto bg-surface p-6 dark:bg-surface-950">
            <div className="rounded-app-lg border border-slate-200 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-surface-900">
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-app bg-emerald-50 p-3 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-200">
                  {selectedIcon}
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                    {getWorkflowModuleStatusLabel(selectedModule.status)}
                  </div>
                  <h3 className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-50">{selectedModule.name}</h3>
                </div>
              </div>
              <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                {selectedModule.description}
              </p>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <DetailList title="Planned inputs" items={selectedModule.plannedInputs} />
              <DetailList title="Planned outputs" items={selectedModule.plannedOutputs} />
            </div>

            {dependencyNames.length > 0 && (
              <div className="mt-5">
                <DetailList title="Depends on" items={dependencyNames} />
              </div>
            )}

            <div className={`mt-5 rounded-app-lg border p-4 text-sm leading-6 ${getStatusClass(selectedModule)}`}>
              {selectedModule.status === 'COMING_SOON'
                ? 'Placeholder only. This module does not create, change, import, export, or calculate commercial data yet.'
                : `${selectedModule.name} is available in this build${project ? ` and can work with ${project.name}.` : '.'}`
              }
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
