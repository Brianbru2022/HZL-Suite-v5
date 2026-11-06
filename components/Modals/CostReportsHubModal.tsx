import React from 'react';
import { BarChart3, FileCheck2, FileSpreadsheet, History, Layers3, PieChart, Scale, X } from 'lucide-react';
import type { Project, TradePackage } from '../../types';
import { calculateProjectTotal } from '../../utils/calculations';
import { formatCurrency } from '../../utils/formatting';
import { buildProjectWorkflowSummary } from '../../utils/projectWorkflowSummary';
import { listOperationLogEntries, subscribeToOperationLog, type OperationLogEntry } from '../../utils/operationLog';
import type { ProjectEvidenceItem, ProjectEvidenceTarget } from '../../utils/projectEvidence';
import { useModalFocus } from '../../hooks/useModalFocus';
import { ProjectEvidencePanel } from '../Reports/ProjectEvidencePanel';
import { TenderReportingModal } from './TenderReportingModal';

type CostReportsHubModalProps = {
  isOpen: boolean;
  project: Project;
  trades: TradePackage[];
  onClose: () => void;
  onOpenAnalytics: () => void;
  onOpenProjectSummary: () => void;
  onOpenCostPlan: () => void;
  onOpenProjectExcelExport: () => void;
  onOpenTenderAnalysis: () => void;
  onOpenAuditTrail?: () => void;
  onOpenVersionHistory?: () => void;
  onOpenBill?: (billId?: string) => void;
  embedded?: boolean;
};

function ReportCard({
  icon,
  title,
  description,
  meta,
  actionLabel,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  meta: string;
  actionLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-app border border-slate-200 bg-white p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50/45 hover:shadow-card dark:border-slate-700 dark:bg-surface-900 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-app bg-slate-100 p-2.5 text-slate-600 transition group-hover:bg-emerald-100 group-hover:text-emerald-700 dark:bg-surface-800 dark:text-slate-300 dark:group-hover:bg-emerald-950/45 dark:group-hover:text-emerald-200">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">{title}</div>
          <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        <span className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">{meta}</span>
        <span className="shrink-0 rounded-app-sm border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-surface-800 dark:text-slate-200">
          {actionLabel}
        </span>
      </div>
    </button>
  );
}

export const CostReportsHubModal: React.FC<CostReportsHubModalProps> = ({
  isOpen,
  project,
  trades,
  onClose,
  onOpenAnalytics,
  onOpenProjectSummary,
  onOpenCostPlan,
  onOpenProjectExcelExport,
  onOpenTenderAnalysis,
  onOpenAuditTrail,
  onOpenVersionHistory,
  onOpenBill,
  embedded = false,
}) => {
  const { contentRef, contentProps } = useModalFocus(isOpen && !embedded, onClose);
  const [isTenderReportingOpen, setIsTenderReportingOpen] = React.useState(false);
  const [operationEntries, setOperationEntries] = React.useState<OperationLogEntry[]>([]);
  const summary = React.useMemo(() => buildProjectWorkflowSummary(project), [project]);
  const totalValue = React.useMemo(() => calculateProjectTotal(project), [project]);

  React.useEffect(() => {
    if (!isOpen) return;
    const refresh = () => setOperationEntries(listOperationLogEntries());
    refresh();
    return subscribeToOperationLog(refresh);
  }, [isOpen]);

  if (!isOpen) return null;

  const openAndClose = (action: () => void) => {
    onClose();
    action();
  };

  const evidenceTargets = [
    onOpenBill ? 'bill' : null,
    'tender',
    onOpenAuditTrail ? 'audit' : null,
    onOpenVersionHistory ? 'version-history' : null,
  ].filter(Boolean) as ProjectEvidenceTarget[];

  const handleOpenEvidenceTarget = (target: ProjectEvidenceTarget, item: ProjectEvidenceItem) => {
    if (target === 'bill' && onOpenBill) {
      onClose();
      onOpenBill(item.billId);
      return;
    }
    if (target === 'tender') {
      openAndClose(onOpenTenderAnalysis);
      return;
    }
    if (target === 'audit' && onOpenAuditTrail) {
      openAndClose(onOpenAuditTrail);
      return;
    }
    if (target === 'version-history' && onOpenVersionHistory) {
      openAndClose(onOpenVersionHistory);
    }
  };

  const content = (
    <>
      <div
        ref={contentRef}
        {...contentProps}
        data-smoke="reports-workspace"
        className={`workspace-shell flex w-full flex-col overflow-hidden ${embedded ? 'h-full min-h-0' : 'max-h-[92vh] max-w-5xl'}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200/80 bg-white/92 px-6 py-5 dark:border-slate-700/80 dark:bg-surface-900/95">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="workspace-chip mb-3">
                <BarChart3 className="h-3.5 w-3.5" />
                Cost reports
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Reports for {project.name}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-300">
                Open project analytics, summary exports, cost plans, and tender reporting from one place.
              </p>
            </div>
            <button type="button" onClick={onClose} className="workspace-secondary-btn px-3 py-2 text-xs" aria-label="Close cost reports">
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-surface-50/80 p-6 dark:bg-surface-950/70">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Project value</div>
              <div className="mt-2 text-lg font-semibold text-slate-950 dark:text-slate-50">{formatCurrency(totalValue)}</div>
            </div>
            <div className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Priced items</div>
              <div className="mt-2 text-lg font-semibold text-slate-950 dark:text-slate-50">{summary.pricedItemCount.toLocaleString()}</div>
            </div>
            <div className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Tender status</div>
              <div className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">{summary.tenderStatus}</div>
            </div>
            <div className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Cost plan</div>
              <div className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">{summary.hasCostPlan ? 'Available' : 'Not started'}</div>
            </div>
          </div>

          <div className="mt-5">
            <ProjectEvidencePanel
              project={project}
              operationEntries={operationEntries}
              enabledTargets={evidenceTargets}
              onOpenTarget={handleOpenEvidenceTarget}
            />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <ReportCard
              icon={<PieChart className="h-5 w-5" />}
              title="Analytics dashboard"
              description="Review project totals, trade allocation, unassigned exposure, and commercial warnings."
              meta={`${summary.assignedTradeCount} assigned trade${summary.assignedTradeCount === 1 ? '' : 's'}`}
              actionLabel="Open analytics"
              onClick={() => openAndClose(onOpenAnalytics)}
            />
            <ReportCard
              icon={<Layers3 className="h-5 w-5" />}
              title="Project summary"
              description="Build bill, trade, and section summary outputs for Excel or PDF issue."
              meta={`${summary.billCount} bill${summary.billCount === 1 ? '' : 's'} / ${summary.sectionCount} section${summary.sectionCount === 1 ? '' : 's'}`}
              actionLabel="Open summary"
              onClick={() => openAndClose(onOpenProjectSummary)}
            />
            <ReportCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="Cost plan"
              description="Compile, adjust, and export a project-level cost plan from bills, sections, or AI regrouping."
              meta={summary.hasCostPlan ? 'Cost plan ready' : 'Create from bill data'}
              actionLabel="Open cost plan"
              onClick={() => openAndClose(onOpenCostPlan)}
            />
            <ReportCard
              icon={<FileSpreadsheet className="h-5 w-5" />}
              title="Project Excel export"
              description="Export the project as workbook tabs or separate bill workbooks for external review."
              meta="Excel issue output"
              actionLabel="Export Excel"
              onClick={() => openAndClose(onOpenProjectExcelExport)}
            />
            <ReportCard
              icon={<Scale className="h-5 w-5" />}
              title="Tender reporting"
              description="Review tender return status, missing rates, awards, and export tender report workbooks."
              meta={`${summary.tenderContractorCount} tender contractor${summary.tenderContractorCount === 1 ? '' : 's'}`}
              actionLabel="Open reports"
              onClick={() => setIsTenderReportingOpen(true)}
            />
            <ReportCard
              icon={<FileCheck2 className="h-5 w-5" />}
              title="Tender approval PDFs"
              description="Create one-page award approval forms from the tender award panel for signing and issue."
              meta="PDF approval issue"
              actionLabel="Open awards"
              onClick={() => openAndClose(onOpenTenderAnalysis)}
            />
            {onOpenAuditTrail ? (
              <ReportCard
                icon={<History className="h-5 w-5" />}
                title="Export history"
                description="Review recorded report, tender, library, save, and export actions from the local audit trail."
                meta="Local audit trail"
                actionLabel="Open audit"
                onClick={() => openAndClose(onOpenAuditTrail)}
              />
            ) : null}
          </div>
        </div>
      </div>
      <TenderReportingModal
        isOpen={isTenderReportingOpen}
        project={project}
        trades={trades}
        onClose={() => setIsTenderReportingOpen(false)}
        onOpenTenderAnalysis={onOpenTenderAnalysis}
      />
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={onClose}>
      {content}
    </div>
  );
};
