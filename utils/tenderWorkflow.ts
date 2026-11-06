import { formatCurrency } from './formatting';

export type TenderWorkflowStageId = 'SETUP' | 'RETURNS' | 'COMPARISON' | 'AWARD' | 'APPLY' | 'EXPORT';
export type TenderWorkflowStageTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export type TenderWorkflowStage = {
  id: TenderWorkflowStageId;
  label: string;
  status: string;
  detail: string;
  tone: TenderWorkflowStageTone;
  complete: boolean;
};

export type TenderWorkflowStageInput = {
  selectedTradeName?: string | null;
  invitedContractorCount: number;
  availableContractorCount: number;
  contractorReturnCount: number;
  pricedItemCount: number;
  missingReturnedRateCount: number;
  completedTenderCount: number;
  leaderName?: string | null;
  leaderGap: number;
  winnerName?: string | null;
  winnerCoveragePct: number;
  latestApplyUpdatedCount?: number | null;
  approvalFileName?: string | null;
  budgetValue?: number;
  selectedCommercialTotal?: number;
};

export function getTenderBudgetVarianceTone(budgetValue = 0, selectedCommercialTotal = 0): TenderWorkflowStageTone {
  if (budgetValue <= 0 || selectedCommercialTotal <= 0) return 'neutral';
  const variancePct = ((selectedCommercialTotal - budgetValue) / budgetValue) * 100;
  if (variancePct > 5) return 'danger';
  if (variancePct > 0) return 'warning';
  return 'success';
}

export function buildTenderWorkflowStages(input: TenderWorkflowStageInput): TenderWorkflowStage[] {
  const missingRateTone: TenderWorkflowStageTone = input.contractorReturnCount === 0
    ? 'neutral'
    : input.missingReturnedRateCount > 0
      ? 'warning'
      : 'success';
  const comparisonReady = input.contractorReturnCount > 0;
  const budgetTone = getTenderBudgetVarianceTone(input.budgetValue, input.selectedCommercialTotal);
  const budgetVariance = (input.selectedCommercialTotal || 0) - (input.budgetValue || 0);
  const budgetVariancePct = input.budgetValue && input.budgetValue > 0 ? (budgetVariance / input.budgetValue) * 100 : 0;
  const budgetDetail = input.budgetValue && input.budgetValue > 0 && input.selectedCommercialTotal && input.selectedCommercialTotal > 0
    ? budgetVariance > 0
      ? `Budget +GBP ${formatCurrency(budgetVariance)} (${budgetVariancePct.toFixed(1)}%)`
      : budgetVariance < 0
        ? `Budget -GBP ${formatCurrency(Math.abs(budgetVariance))} (${Math.abs(budgetVariancePct).toFixed(1)}%)`
        : 'On budget'
    : '';
  const awardTone: TenderWorkflowStageTone = input.winnerName
    ? budgetTone === 'danger'
      ? 'warning'
      : 'success'
    : comparisonReady
      ? 'info'
      : 'neutral';

  return [
    {
      id: 'SETUP',
      label: 'Setup',
      status: input.selectedTradeName || 'Choose trade',
      detail: input.invitedContractorCount > 0
        ? `${input.invitedContractorCount.toLocaleString()} invited, ${input.availableContractorCount.toLocaleString()} still available`
        : 'Invite contractors from the trade library.',
      tone: input.selectedTradeName && input.invitedContractorCount > 0 ? 'success' : 'warning',
      complete: Boolean(input.selectedTradeName && input.invitedContractorCount > 0),
    },
    {
      id: 'RETURNS',
      label: 'Returns',
      status: `${input.contractorReturnCount.toLocaleString()}/${input.invitedContractorCount.toLocaleString()} live`,
      detail: input.contractorReturnCount > 0
        ? `${input.completedTenderCount.toLocaleString()} fully priced submission${input.completedTenderCount === 1 ? '' : 's'}`
        : 'Issue a blank tender workbook and capture the first return.',
      tone: input.contractorReturnCount > 0 ? 'success' : input.invitedContractorCount > 0 ? 'warning' : 'neutral',
      complete: input.contractorReturnCount > 0,
    },
    {
      id: 'COMPARISON',
      label: 'Comparison',
      status: input.leaderName || 'No leader',
      detail: input.missingReturnedRateCount > 0
        ? `${input.missingReturnedRateCount.toLocaleString()} missing returned rate${input.missingReturnedRateCount === 1 ? '' : 's'}`
        : input.leaderGap > 0
          ? `Gap to second: GBP ${formatCurrency(input.leaderGap)}`
          : comparisonReady
            ? 'No missing returned rates in scope.'
            : `${input.pricedItemCount.toLocaleString()} priced item${input.pricedItemCount === 1 ? '' : 's'} awaiting returns`,
      tone: missingRateTone,
      complete: comparisonReady && input.missingReturnedRateCount === 0,
    },
    {
      id: 'AWARD',
      label: 'Award',
      status: input.winnerName || 'No winner',
      detail: input.winnerName
        ? `${input.winnerCoveragePct.toFixed(0)}% priced coverage${budgetDetail ? ` | ${budgetDetail}` : ''}`
        : 'Select a winner from the overview once the spread is reviewed.',
      tone: awardTone,
      complete: Boolean(input.winnerName),
    },
    {
      id: 'APPLY',
      label: 'Apply-back',
      status: input.latestApplyUpdatedCount !== null && input.latestApplyUpdatedCount !== undefined
        ? `${input.latestApplyUpdatedCount.toLocaleString()} updated`
        : 'Not applied',
      detail: input.latestApplyUpdatedCount !== null && input.latestApplyUpdatedCount !== undefined
        ? 'Winning rates have been pushed back to the bill.'
        : input.winnerName
          ? 'Ready to apply chosen contractor rates.'
          : 'Choose a winner before applying rates back.',
      tone: input.latestApplyUpdatedCount !== null && input.latestApplyUpdatedCount !== undefined ? 'success' : input.winnerName ? 'info' : 'neutral',
      complete: input.latestApplyUpdatedCount !== null && input.latestApplyUpdatedCount !== undefined,
    },
    {
      id: 'EXPORT',
      label: 'Exports',
      status: input.approvalFileName ? 'Approval ready' : 'Issue pack',
      detail: input.approvalFileName || 'Export reports, blank tender sheets, and approval PDFs.',
      tone: input.approvalFileName ? 'success' : 'info',
      complete: Boolean(input.approvalFileName),
    },
  ];
}
