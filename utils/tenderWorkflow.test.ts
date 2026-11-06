import { describe, expect, it } from 'vitest';
import {
  buildTenderWorkflowStages,
  getTenderBudgetVarianceTone,
} from './tenderWorkflow';

describe('tender workflow stage model', () => {
  it('highlights missing returned rates during comparison', () => {
    const stages = buildTenderWorkflowStages({
      selectedTradeName: 'Groundworks',
      invitedContractorCount: 3,
      availableContractorCount: 1,
      contractorReturnCount: 2,
      pricedItemCount: 40,
      missingReturnedRateCount: 5,
      completedTenderCount: 1,
      leaderName: 'Alpha Groundworks',
      leaderGap: 1250,
      winnerCoveragePct: 0,
    });

    expect(stages.find((stage) => stage.id === 'RETURNS')?.complete).toBe(true);
    expect(stages.find((stage) => stage.id === 'COMPARISON')?.tone).toBe('warning');
    expect(stages.find((stage) => stage.id === 'COMPARISON')?.detail).toContain('5 missing returned rates');
  });

  it('marks award/apply/export progress when a winner and approval exist', () => {
    const stages = buildTenderWorkflowStages({
      selectedTradeName: 'Joinery',
      invitedContractorCount: 2,
      availableContractorCount: 0,
      contractorReturnCount: 2,
      pricedItemCount: 18,
      missingReturnedRateCount: 0,
      completedTenderCount: 2,
      leaderName: 'Oak Works',
      leaderGap: 400,
      winnerName: 'Oak Works',
      winnerCoveragePct: 100,
      latestApplyUpdatedCount: 17,
      approvalFileName: 'joinery-approval.pdf',
      budgetValue: 12000,
      selectedCommercialTotal: 11850,
    });

    expect(stages.find((stage) => stage.id === 'AWARD')?.tone).toBe('success');
    expect(stages.find((stage) => stage.id === 'AWARD')?.detail).toContain('Budget -GBP 150.00');
    expect(stages.find((stage) => stage.id === 'APPLY')?.complete).toBe(true);
    expect(stages.find((stage) => stage.id === 'EXPORT')?.status).toBe('Approval ready');
  });

  it('classifies budget variance bands', () => {
    expect(getTenderBudgetVarianceTone(10000, 9500)).toBe('success');
    expect(getTenderBudgetVarianceTone(10000, 10200)).toBe('warning');
    expect(getTenderBudgetVarianceTone(10000, 10600)).toBe('danger');
    expect(getTenderBudgetVarianceTone(0, 10600)).toBe('neutral');
  });
});
