import React from 'react';
import { BadgePercent, Layers3, Users } from 'lucide-react';
import { formatCurrency } from '../../utils/formatting';

type TenderDetailedSummaryPanelProps = {
  selectedTradeName: string;
  valueMode: 'RATE' | 'VALUE';
  pricedItemCount: number;
  invitedContractorCount: number;
  contractorReturnCount: number;
  missingReturnedRateCount: number;
  currentLeaderName?: string;
  currentLeaderTotal?: number;
  leaderGap: number;
  lowestTotal: number;
  completedTenderCount: number;
  winnerCoverageLabel: string;
  winnerCoverageDetail: string;
  pricedWithQsEstimateCount: number;
  applyBackGuidance: string;
};

export function TenderDetailedSummaryPanel({
  selectedTradeName,
  valueMode,
  pricedItemCount,
  invitedContractorCount,
  contractorReturnCount,
  missingReturnedRateCount,
  currentLeaderName,
  currentLeaderTotal,
  leaderGap,
  lowestTotal,
  completedTenderCount,
  winnerCoverageLabel,
  winnerCoverageDetail,
  pricedWithQsEstimateCount,
  applyBackGuidance,
}: TenderDetailedSummaryPanelProps) {
  return (
    <div className="mb-4 space-y-3">
      <div className="rounded-app-lg border border-slate-200/80 bg-white/92 p-4 shadow-sm dark:border-slate-700 dark:bg-surface-900/92">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Detailed tender comparison</div>
            <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">
              {selectedTradeName} {valueMode === 'VALUE' ? 'value matrix' : 'rate matrix'}
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600 dark:text-slate-300">
              Enter and compare contractor returns directly in the matrix. Use the overview only for award approval and apply-back sign-off.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-surface-800 dark:text-slate-300">
              <Layers3 className="h-3.5 w-3.5" />
              {pricedItemCount} priced item{pricedItemCount === 1 ? '' : 's'}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300">
              <Users className="h-3.5 w-3.5" />
              {invitedContractorCount} invited, {contractorReturnCount} returned
            </span>
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium ${
              missingReturnedRateCount > 0
                ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300'
            }`}>
              <BadgePercent className="h-3.5 w-3.5" />
              {missingReturnedRateCount.toLocaleString()} missing rate{missingReturnedRateCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-app border border-slate-200 bg-surface px-3 py-3 dark:border-slate-700 dark:bg-surface-800">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Current leader</div>
            <div className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{currentLeaderName || 'No leader yet'}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{currentLeaderTotal !== undefined ? `GBP ${formatCurrency(currentLeaderTotal)}` : 'Enter contractor returns'}</div>
          </div>
          <div className="rounded-app border border-slate-200 bg-surface px-3 py-3 dark:border-slate-700 dark:bg-surface-800">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Spread to second</div>
            <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{leaderGap > 0 ? `GBP ${formatCurrency(leaderGap)}` : '-'}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{leaderGap > 0 && lowestTotal > 0 ? `${((leaderGap / lowestTotal) * 100).toFixed(2)}% gap` : 'Need two returns'}</div>
          </div>
          <div className="rounded-app border border-slate-200 bg-surface px-3 py-3 dark:border-slate-700 dark:bg-surface-800">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Complete returns</div>
            <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{completedTenderCount}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Fully priced submissions</div>
          </div>
          <div className="rounded-app border border-slate-200 bg-surface px-3 py-3 dark:border-slate-700 dark:bg-surface-800">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Winner coverage</div>
            <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{winnerCoverageLabel}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{winnerCoverageDetail}</div>
          </div>
          <div className="rounded-app border border-slate-200 bg-surface px-3 py-3 dark:border-slate-700 dark:bg-surface-800">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">QS support</div>
            <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{pricedWithQsEstimateCount}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Items with QS estimate</div>
          </div>
        </div>
      </div>
      <div className="rounded-app border border-slate-200/80 bg-white/90 px-4 py-3 text-xs leading-5 text-slate-600 shadow-sm dark:border-slate-700 dark:bg-surface-900/90 dark:text-slate-300">
        <span className="font-semibold text-slate-800 dark:text-slate-100">Apply-back guidance: </span>
        {applyBackGuidance}
      </div>
    </div>
  );
}
