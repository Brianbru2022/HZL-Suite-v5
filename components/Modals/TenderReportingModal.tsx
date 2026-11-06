import React from 'react';
import { BarChart3, CheckCircle2, FileSpreadsheet, Scale, Trophy, Users, X } from 'lucide-react';
import type { BoQItem, Project, TradePackage } from '../../types';
import { getSectionItems } from '../../utils/calculations';
import { formatCurrency } from '../../utils/formatting';
import { useModalFocus } from '../../hooks/useModalFocus';
import { useToast } from '../../contexts/ToastContext';
import { feedbackError, feedbackSuccess } from '../../utils/feedback';

type TenderReportingModalProps = {
  isOpen: boolean;
  project: Project;
  trades: TradePackage[];
  onClose: () => void;
  onOpenTenderAnalysis: () => void;
};

type TenderReportRow = {
  trade: TradePackage;
  pricedItems: BoQItem[];
  invitedCount: number;
  returnCount: number;
  missingRateCount: number;
  winnerName: string;
  lowestTotal: number;
  awardTotal: number;
};

function getProjectItems(project: Project) {
  return project.bills.flatMap((bill) => (
    bill.sections.flatMap((section) => getSectionItems(section))
  ));
}

function isPricedTenderItem(item: BoQItem) {
  return ['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(item.type);
}

function getTradeTenderTotal(items: BoQItem[], contractorId: string, project: Project) {
  return items.reduce((sum, item) => {
    const rate = project.tenderData?.[item.id]?.[contractorId] || 0;
    return sum + (rate > 0 ? (item.quantity || 0) * rate : 0);
  }, 0);
}

function buildTenderReportRows(project: Project, trades: TradePackage[]): TenderReportRow[] {
  const pricedItems = getProjectItems(project).filter(isPricedTenderItem);
  return trades.map((trade) => {
    const tradeItems = pricedItems.filter((item) => item.tradePackageId === trade.id);
    const invitedIds = project.tenderContractors?.[trade.id] || [];
    const invitedContractors = invitedIds
      .map((id) => trade.contractors.find((contractor) => contractor.id === id))
      .filter((contractor): contractor is NonNullable<typeof contractor> => Boolean(contractor));
    const returnCount = invitedContractors.filter((contractor) => (
      tradeItems.some((item) => (project.tenderData?.[item.id]?.[contractor.id] || 0) > 0)
    )).length;
    const missingRateCount = invitedContractors.reduce((count, contractor) => (
      count + tradeItems.filter((item) => !(project.tenderData?.[item.id]?.[contractor.id] || 0)).length
    ), 0);
    const totals = invitedContractors
      .map((contractor) => getTradeTenderTotal(tradeItems, contractor.id, project))
      .filter((total) => total > 0);
    const award = project.tenderAwards?.[trade.id];
    return {
      trade,
      pricedItems: tradeItems,
      invitedCount: invitedIds.length,
      returnCount,
      missingRateCount,
      winnerName: award?.contractorName || '',
      lowestTotal: totals.length ? Math.min(...totals) : 0,
      awardTotal: award ? getTradeTenderTotal(tradeItems, award.contractorId, project) : 0,
    };
  });
}

async function loadTenderExcelExports() {
  return import('../../utils/excelExport');
}

export const TenderReportingModal: React.FC<TenderReportingModalProps> = ({
  isOpen,
  project,
  trades,
  onClose,
  onOpenTenderAnalysis,
}) => {
  const { contentRef, contentProps } = useModalFocus(isOpen, onClose);
  const { showToast } = useToast();
  const [isExportingTradeId, setIsExportingTradeId] = React.useState<string | null>(null);
  const reportRows = React.useMemo(() => buildTenderReportRows(project, trades), [project, trades]);
  const rowsWithTenderActivity = reportRows.filter((row) => row.invitedCount > 0 || row.returnCount > 0 || row.winnerName);
  const totalInvited = reportRows.reduce((sum, row) => sum + row.invitedCount, 0);
  const totalReturns = reportRows.reduce((sum, row) => sum + row.returnCount, 0);
  const awardCount = reportRows.filter((row) => row.winnerName).length;
  const missingRateCount = reportRows.reduce((sum, row) => sum + row.missingRateCount, 0);

  if (!isOpen) return null;

  const handleExportTradeReport = async (trade: TradePackage) => {
    setIsExportingTradeId(trade.id);
    try {
      const { exportTenderAnalysisToExcel } = await loadTenderExcelExports();
      await exportTenderAnalysisToExcel(project, trade);
      showToast({ type: 'success', message: feedbackSuccess(`Tender report for "${trade.name}"`), duration: 3000 });
    } catch (error) {
      showToast({ type: 'error', message: feedbackError(`Tender report for "${trade.name}"`, error, 'Please try the export again.') });
    } finally {
      setIsExportingTradeId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={contentRef}
        {...contentProps}
        className="workspace-shell flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200/80 bg-white/92 px-6 py-5 dark:border-slate-700/80 dark:bg-surface-900/95">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="workspace-chip mb-3">
                <Scale className="h-3.5 w-3.5" />
                Tender reporting
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Tender reports for {project.name}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-300">
                Review tender status and export reporting outputs. Use Tender Analysis separately for live rate entry, comparison, award, and apply-back.
              </p>
            </div>
            <button type="button" onClick={onClose} className="workspace-secondary-btn px-3 py-2 text-xs" aria-label="Close tender reporting">
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-surface-50/80 p-6 dark:bg-surface-950/70">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                <Users className="h-3.5 w-3.5" />
                Invited
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-950 dark:text-slate-50">{totalInvited.toLocaleString()}</div>
            </div>
            <div className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Returns
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-950 dark:text-slate-50">{totalReturns.toLocaleString()}</div>
            </div>
            <div className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                <Trophy className="h-3.5 w-3.5" />
                Awards
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-950 dark:text-slate-50">{awardCount.toLocaleString()}</div>
            </div>
            <div className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                <BarChart3 className="h-3.5 w-3.5" />
                Missing rates
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-950 dark:text-slate-50">{missingRateCount.toLocaleString()}</div>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-app-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-surface-900">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800/70 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Trade package</th>
                  <th className="px-4 py-3 text-right">Items</th>
                  <th className="px-4 py-3 text-right">Invited</th>
                  <th className="px-4 py-3 text-right">Returns</th>
                  <th className="px-4 py-3 text-right">Missing</th>
                  <th className="px-4 py-3 text-left">Winner</th>
                  <th className="px-4 py-3 text-right">Lowest</th>
                  <th className="px-4 py-3 text-right">Award</th>
                  <th className="px-4 py-3 text-right">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-surface-900">
                {(rowsWithTenderActivity.length ? rowsWithTenderActivity : reportRows).map((row) => (
                  <tr key={row.trade.id}>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{row.trade.name}</td>
                    <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">{row.pricedItems.length.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">{row.invitedCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">{row.returnCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">{row.missingRateCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{row.winnerName || '-'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">{row.lowestTotal > 0 ? formatCurrency(row.lowestTotal) : '-'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">{row.awardTotal > 0 ? formatCurrency(row.awardTotal) : '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => { void handleExportTradeReport(row.trade); }}
                        disabled={row.pricedItems.length === 0 || isExportingTradeId === row.trade.id}
                        className="workspace-secondary-btn px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        {isExportingTradeId === row.trade.id ? 'Exporting...' : 'Export'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-app border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
            <div>
              <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">Need to enter rates, compare returns, or apply a winner?</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">That remains in Tender Analysis. Reporting is for status review and report exports only.</div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTenderAnalysis();
              }}
              className="workspace-primary-btn px-4 py-2 text-sm"
            >
              Open Tender Analysis
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
