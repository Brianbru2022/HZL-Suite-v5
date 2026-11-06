import { describe, expect, it } from 'vitest';
import type { DevelopmentAppraisalOption } from '../types';
import { createCashflowProfile } from './appraisal';
import { buildCommercialExitStrategy, buildCommercialInvestmentReportContext } from './commercialInvestmentReport';

function option(): DevelopmentAppraisalOption {
  return {
    id: 'commercial-option', name: 'Commercial option', template: 'COMMERCIAL_INCOME', commercialTemplateId: 'DRIVE_THRU_RESTAURANT', commercialLocation: 'Cambuslang',
    commercialScopeAssessment: { siteAreaM2: 2300, summary: 'A drive-through restaurant with parking and servicing is proposed within the entered site boundary.' },
    calculationMode: 'KNOWN_LAND_PROFIT_ON_GDV', durationMonths: 12, targetProfitOnGdvPercent: 0, financeAnnualRatePercent: 0, knownLandValue: 0, sellerMinimumLandValue: 0,
    commercialLifecycleYears: 5, commercialAnnualOperatingCostPercent: 20, commercialAnnualRevenueGrowthPercent: 0, commercialAnnualCostInflationPercent: 0, commercialAnnualLifecycleCapexPercent: 0, commercialExitYieldPercent: 5, commercialSellingCostsPercent: 2,
    revenueLines: [{ id: 'income', title: 'Commercial income', template: 'COMMERCIAL_INCOME', area: 1000, rentRate: 100, yieldPercent: 5, voidPercent: 0, incentivePercent: 0, manualValue: 0, cashflow: createCashflowProfile('END', 12), notes: '' }],
    costLines: [{ id: 'cost', title: 'Development cost', category: 'CONSTRUCTION', amount: 200000, percentageBasis: 'NONE', percentageValue: 0, cashflow: createCashflowProfile('EVEN', 12), notes: '' }],
    recommended: false, assumptions: '', decisionNote: '', finalReportExecutiveSummary: '', finalReportSourceSignature: '', createdAt: '2026-07-16T00:00:00.000Z', updatedAt: '2026-07-16T00:00:00.000Z',
  };
}

describe('commercial investment report', () => {
  it('selects a positive lifecycle exit strategy and supplies the scope and annual exit data to AI context', () => {
    const strategy = buildCommercialExitStrategy(option());
    const context = buildCommercialInvestmentReportContext(option());

    expect(strategy.bestProfitYear).toBeDefined();
    expect(strategy.bestProfit).toBeGreaterThan(0);
    expect(strategy.label).toMatch(/EXIT|HOLD/);
    expect(context.siteScope).toContain('drive-through');
    expect(context.lifecycle.some((row) => row.assetSaleValue > 0 && row.netSaleEquity > 0)).toBe(true);
  });
});
