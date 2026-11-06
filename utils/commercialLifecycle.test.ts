import { describe, expect, it } from 'vitest';
import type { DevelopmentAppraisalOption } from '../types';
import { createCashflowProfile } from './appraisal';
import { calculateCommercialAnnualIncome, calculateCommercialFinancialAssurance, calculateCommercialLifecycle } from './commercialLifecycle';

function option(overrides: Partial<DevelopmentAppraisalOption> = {}): DevelopmentAppraisalOption {
  return {
    id: 'commercial-option',
    name: 'Commercial option',
    template: 'COMMERCIAL_INCOME',
    commercialLocation: 'Inverness',
    calculationMode: 'KNOWN_LAND_PROFIT_ON_GDV',
    durationMonths: 12,
    targetProfitOnGdvPercent: 15,
    financeAnnualRatePercent: 0,
    knownLandValue: 0,
    sellerMinimumLandValue: 0,
    commercialLifecycleYears: 5,
    commercialAnnualOperatingCostPercent: 20,
    commercialAnnualRevenueGrowthPercent: 0,
    commercialAnnualCostInflationPercent: 0,
    commercialAnnualLifecycleCapexPercent: 0,
    commercialExitYieldPercent: 5,
    commercialSellingCostsPercent: 2,
    revenueLines: [{
      id: 'income',
      title: 'Commercial income',
      template: 'COMMERCIAL_INCOME',
      area: 1000,
      rentRate: 100,
      yieldPercent: 5,
      voidPercent: 0,
      incentivePercent: 0,
      manualValue: 0,
      cashflow: createCashflowProfile('END', 12),
      notes: '',
    }],
    costLines: [{
      id: 'cost',
      title: 'Development cost',
      category: 'CONSTRUCTION',
      amount: 200000,
      percentageBasis: 'NONE',
      percentageValue: 0,
      cashflow: createCashflowProfile('EVEN', 12),
      notes: '',
    }],
    recommended: false,
    assumptions: '',
    decisionNote: '',
    finalReportExecutiveSummary: '',
    finalReportSourceSignature: '',
    createdAt: '2026-07-02T00:00:00.000Z',
    updatedAt: '2026-07-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('commercial lifecycle', () => {
  it('calculates net annual income from area, rent and void assumptions', () => {
    expect(calculateCommercialAnnualIncome(option())).toBe(100000);
    expect(calculateCommercialAnnualIncome(option({
      revenueLines: [{ ...option().revenueLines[0], voidPercent: 10 }],
    }))).toBe(90000);
  });

  it('models development then operation years and finds break-even', () => {
    const summary = calculateCommercialLifecycle(option());
    expect(summary.rows[0].phase).toBe('DEVELOPMENT');
    expect(summary.rows[1].phase).toBe('OPERATION');
    expect(summary.firstPositiveOperatingIncomeYear).toBe(2);
    expect(summary.breakEvenYear).toBe(4);
    expect(summary.rows.at(-1)?.year).toBeGreaterThanOrEqual(12);
  });

  it('models the selected hold period with explicit annual cashflows', () => {
    const summary = calculateCommercialLifecycle(option({
      commercialLifecycleYears: 5,
      costLines: [{ ...option().costLines[0], amount: 2000000 }],
    }));

    expect(summary.rows.at(-1)?.year).toBeGreaterThanOrEqual(12);
    expect(summary.reachesBreakEven).toBe(false);
    expect(summary.rows.every((row) => Number.isFinite(row.leveredCashflow))).toBe(true);
  });

  it('records debt drawdowns, financing fees and debt service from monthly funding cashflows', () => {
    const summary = calculateCommercialLifecycle(option({
      financeAnnualRatePercent: 10,
      revenueLines: [{ ...option().revenueLines[0], rentRate: 0 }],
    }));

    expect(summary.rows[0].debtDrawdown).toBeGreaterThan(0);
    expect(summary.rows[0].debtFees).toBeGreaterThan(0);
    expect(summary.rows[0].interest).toBeGreaterThan(0);
    expect(summary.rows[1].debtService).toBeGreaterThan(summary.rows[1].interest);
    expect(summary.rows[1].dscr).toBe(0);
  });

  it('shows annual income-capitalised exit value, sale costs, funding repayment and profit on sale', () => {
    const summary = calculateCommercialLifecycle(option());
    const operatingYear = summary.rows[1];

    expect(operatingYear.netOperatingIncome).toBe(80000);
    expect(operatingYear.assetSaleValue).toBe(1600000);
    expect(operatingYear.sellingCosts).toBe(32000);
    expect(operatingYear.outstandingFunding).toBeLessThan(130000);
    expect(operatingYear.netSaleEquity).toBeGreaterThan(1400000);
    expect(operatingYear.profitOnSale).toBeGreaterThan(1300000);
    expect(operatingYear.returnOnEquityPercent).toBeGreaterThan(0);
  });

  it('keeps separately assessed assets distinct while combining their lifecycle totals', () => {
    const base = option({
      revenueLines: [
        { ...option().revenueLines[0], id: 'asset-a-income', annualRent: 100000 },
        { ...option().revenueLines[0], id: 'asset-b-income', annualRent: 50000 },
      ],
      commercialAssets: [
        { id: 'asset-a', title: 'Asset A', source: 'ASSESSMENT', included: true, revenueModel: 'LEASE', revenueLineIds: ['asset-a-income'], costLineIds: [], annualOperatingCostPercent: 10, exitYieldPercent: 5, createdAt: '', updatedAt: '' },
        { id: 'asset-b', title: 'Asset B', source: 'ASSESSMENT', included: true, revenueModel: 'CONCESSION', revenueLineIds: ['asset-b-income'], costLineIds: [], annualOperatingCostPercent: 20, exitYieldPercent: 10, createdAt: '', updatedAt: '' },
      ],
    });
    const yearOne = calculateCommercialLifecycle(base).rows[1];

    expect(yearOne.assetValues).toHaveLength(2);
    expect(yearOne.income).toBe(150000);
    expect(yearOne.netOperatingIncome).toBeCloseTo(130000, 6);
    expect(yearOne.assetSaleValue).toBe(2200000);
  });

  it('tests base, upside and downside cashflows with IRR, NPV, equity multiple and DSCR', () => {
    const assurance = calculateCommercialFinancialAssurance(option({ financeAnnualRatePercent: 8 }));
    const base = assurance.base;
    const upside = assurance.scenarios.find((result) => result.scenario.kind === 'UPSIDE');
    const downside = assurance.scenarios.find((result) => result.scenario.kind === 'DOWNSIDE');

    expect(base.lifecycle.totalDebtDrawn).toBeGreaterThan(0);
    expect(base.lifecycle.irrPercent).toBeGreaterThan(0);
    expect(base.lifecycle.npv).toBeGreaterThan(0);
    expect(base.lifecycle.equityMultiple).toBeGreaterThan(1);
    expect(base.lifecycle.minimumDscr).toBeGreaterThan(0);
    expect(upside?.lifecycle.npv).toBeGreaterThan(base.lifecycle.npv);
    expect(downside?.lifecycle.npv).toBeLessThan(base.lifecycle.npv);
  });
});
