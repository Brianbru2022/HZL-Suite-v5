import { describe, expect, it } from 'vitest';
import type { DevelopmentAppraisalOption } from '../types';
import { buildAppraisalQualityChecks, canIssueAppraisalReport } from './appraisalQualityChecks';

function residential(): DevelopmentAppraisalOption {
  return {
    id: 'res', name: 'Residential', template: 'RESIDENTIAL_SALES', calculationMode: 'RESIDUAL_LAND_VALUE', durationMonths: 12, targetProfitOnGdvPercent: 20, financeAnnualRatePercent: 0,
    programme: { appraisalPriceIndex: 232, startPriceIndex: 242 }, revenueLines: [], costLines: [], houseTypeSchedule: [], recommended: false, assumptions: '', decisionNote: '', finalReportExecutiveSummary: '', finalReportSourceSignature: '', createdAt: '', updatedAt: '',
  };
}

describe('appraisal quality checks', () => {
  it('blocks report issue for an unpriced house type and a missing trade index', () => {
    const option = residential();
    option.houseTypeSchedule = [{ id: 'house', houseTypeName: 'A2-4', quantity: 1, gifaM2: 70, buildCostPerM2: 0, saleValuePerUnit: 0, costBreakdown: [{ id: 'trade', key: 'GROUNDWORK', label: 'Groundworks', amount: 5000, included: true } as any] }];
    const checks = buildAppraisalQualityChecks(option);
    expect(checks.some((check) => check.id === 'trade-index-house-trade')).toBe(true);
    expect(canIssueAppraisalReport(option)).toBe(false);
  });

  it('identifies each commercial included asset without a cost or income as a blocker', () => {
    const option = { ...residential(), template: 'COMMERCIAL_INCOME' as const, commercialAssessmentStage: 'MODELLED' as const, commercialAssets: [{ id: 'asset', title: 'Restaurant', source: 'MANUAL' as const, included: true, revenueModel: 'LEASE' as const, revenueLineIds: [], costLineIds: [], createdAt: '', updatedAt: '' }] };
    const checks = buildAppraisalQualityChecks(option);
    expect(checks.map((check) => check.id)).toEqual(expect.arrayContaining(['commercial-income-asset', 'commercial-cost-asset', 'commercial-yield-asset', 'commercial-discount-rate', 'commercial-loan-to-cost', 'commercial-dscr-threshold']));
  });

  it('warns about an unfrozen bill link but not an unlinked SuDS standard-rate allowance', () => {
    const option = residential();
    option.costLines = [{
      id: 'suds', title: 'SuDS', category: 'ABNORMALS', amount: 62333,
      percentageBasis: 'NONE', percentageValue: 0,
      cashflow: { type: 'EVEN', startMonth: 1, endMonth: 12 },
      linkedAbnormalFrozen: false,
      abnormalElement: { kind: 'RATE', rateId: 'site-specific-suds-area', quantity: 751, rate: 83, unit: 'm2' },
    } as any];
    expect(buildAppraisalQualityChecks(option).some(check => check.id === 'stale-linked-abnormal-suds')).toBe(false);
    option.costLines[0].sourceBillId = 'bill-1';
    expect(buildAppraisalQualityChecks(option).some(check => check.id === 'stale-linked-abnormal-suds')).toBe(true);
  });
});
