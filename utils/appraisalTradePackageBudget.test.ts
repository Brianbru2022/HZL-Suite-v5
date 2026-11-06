import { describe, expect, it } from 'vitest';
import type { DevelopmentAppraisal, DevelopmentAppraisalOption, Project, TradePackage } from '../types';
import { calculateAppraisalOption, createCashflowProfile, createDefaultAppraisalOption } from './appraisal';
import {
  applyAppraisalTradePackageBudgetsToEstimate,
  buildAppraisalTradePackageBudget,
} from './appraisalTradePackageBudget';

function makeOption(overrides: Partial<DevelopmentAppraisalOption> = {}): DevelopmentAppraisalOption {
  const option = createDefaultAppraisalOption('RESIDENTIAL_SALES');
  return {
    ...option,
    calculationMode: 'KNOWN_LAND_PROFIT_ON_GDV',
    knownLandValue: 0,
    programme: {
      appraisalPriceIndex: 232,
      expectedStartDate: '2027-01-01',
      startPriceIndex: 232,
      saleRateUnitsPerMonth: 2,
      leadInMonths: 0,
    },
    ...overrides,
  };
}

function siteRow(id: string, libraryRateId: string, label: string, quantity: number, rate: number, priceIndex = 215) {
  return {
    id,
    category: 'OTHER' as const,
    libraryRateId,
    label,
    unit: 'sum' as const,
    quantity,
    rate,
    priceIndex,
  };
}

describe('appraisal trade package budget', () => {
  it('aggregates individual house trades at each component start index and keeps excluded components out', () => {
    const report = buildAppraisalTradePackageBudget(makeOption({
      houseTypeSchedule: [{
        id: 'house-1',
        houseTypeName: 'Example villa',
        quantity: 2,
        gifaM2: 100,
        buildCostPerM2: 0,
        priceIndex: 215,
        buildPeriodMonths: 4,
        costBreakdown: [
          { id: 'groundwork', key: 'GROUNDWORK', label: 'Groundwork', amount: 100, priceIndex: 215, included: true },
          { id: 'electrical', key: 'ELECTRICAL', label: 'Electrical', amount: 300, priceIndex: 232, included: true },
          { id: 'ev', key: 'EV_CHARGERS', label: 'EV chargers', amount: 1000, priceIndex: 215, included: true },
          { id: 'excluded', key: 'KIT', label: 'Kit', amount: 500, priceIndex: 215, included: false },
        ],
      }],
    }));

    const groundworks = report.packages.find((entry) => entry.name === 'Groundworks');
    const electrical = report.packages.find((entry) => entry.name === 'Electrical');
    const ev = report.packages.find((entry) => entry.name === 'EV');

    expect(groundworks?.baseAmount).toBe(200);
    expect(groundworks?.indexUplift).toBeCloseTo(200 * (232 / 215 - 1), 2);
    expect(electrical?.siteStartAmount).toBe(600);
    expect(ev?.baseAmount).toBe(2000);
    expect(report.packages.some((entry) => entry.name === 'Kit')).toBe(false);
  });

  it('routes infrastructure and plot works to the agreed tender packages and leaves prelims outside them', () => {
    const report = buildAppraisalTradePackageBudget(makeOption({
      siteDimensions: [
        siteRow('ev', 'awd-infrastructure-ev-charging-with-drives', 'EV charging', 2, 1000),
        siteRow('wall', 'awd-infrastructure-garden-walls', 'Garden walls', 10, 50),
        siteRow('wall-groundwork', 'awd-infrastructure-garden-walls-groundwork', 'Garden walls groundwork', 10, 20),
        siteRow('fence', 'awd-infrastructure-boundary-fencing', 'Boundary fencing', 20, 30),
        siteRow('tar', 'awd-infrastructure-tar-surfacing', 'Tar surfacing', 10, 60),
        siteRow('lighting', 'awd-infrastructure-street-lighting', 'Street lighting', 1, 500),
        siteRow('roads', 'awd-infrastructure-roads', 'Roads', 10, 80),
        siteRow('plot', 'awd-plot-works-drives', 'Drives', 10, 40),
        siteRow('prelims', 'awd-prelims-site-manager', 'Site manager', 1, 1000),
      ],
    }));

    const packageNames = report.packages.map((entry) => entry.name);
    expect(packageNames).toEqual(expect.arrayContaining([
      'EV',
      'Labour only brickwork',
      'Groundworks',
      'Fencing',
      'Surfacing',
      'Street lighting',
    ]));
    expect(report.allowances.some((entry) => entry.label === 'Site manager')).toBe(true);
    expect(report.packages.flatMap((entry) => entry.sources).some((entry) => entry.label === 'Site manager')).toBe(false);
  });

  it('keeps legacy house costs visibly unallocated instead of silently allocating them', () => {
    const report = buildAppraisalTradePackageBudget(makeOption({
      houseTypeSchedule: [{
        id: 'legacy-house',
        houseTypeName: 'Legacy type',
        quantity: 2,
        gifaM2: 50,
        buildCostPerM2: 1000,
        priceIndex: 215,
        buildPeriodMonths: 4,
      }],
    }));

    const unallocated = report.packages.find((entry) => entry.name === 'House construction - unallocated');
    expect(unallocated?.baseAmount).toBe(100000);
    expect(unallocated?.siteStartAmount).toBeCloseTo(100000 * 232 / 215, 2);
    expect(report.warnings.join(' ')).toContain('Legacy type');
  });

  it('creates missing shared trades, matches existing trades case-insensitively, and only updates tender trade budgets', () => {
    const option = makeOption({
      houseTypeSchedule: [{
        id: 'house-1',
        houseTypeName: 'Example villa',
        quantity: 1,
        gifaM2: 100,
        buildCostPerM2: 0,
        buildPeriodMonths: 4,
        costBreakdown: [
          { id: 'groundwork', key: 'GROUNDWORK', label: 'Groundworks', amount: 1000, priceIndex: 215, included: true },
          { id: 'ev', key: 'EV_CHARGERS', label: 'EV chargers', amount: 1000, priceIndex: 215, included: true },
        ],
      }],
    });
    const report = buildAppraisalTradePackageBudget(option);
    const project: Project = {
      id: 'project-1',
      name: 'Linked estimate',
      client: '',
      location: '',
      reference: 'EST-1',
      updatedAt: '2026-01-01T00:00:00.000Z',
      measurementStandard: 'NRM2',
      ohpPercentage: 0,
      bills: [{ id: 'bill-1', name: 'Untouched bill', sections: [] }],
      tenderData: { 'item-1': { contractor: 99 } },
      tenderTradeStatus: { groundworks: { dueDate: '2026-02-01', budgetValue: 500 } },
    };
    const trades: TradePackage[] = [{ id: 'groundworks', name: 'gRoUnDwOrKs', contractors: [] }];
    const appraisal: Pick<DevelopmentAppraisal, 'id' | 'reference'> = { id: 'appraisal-1', reference: '2026.001.A' };
    const originalProject = structuredClone(project);

    const result = applyAppraisalTradePackageBudgetsToEstimate({
      appraisal,
      option,
      report,
      project,
      trades,
      generatedAt: '2026-08-13T12:00:00.000Z',
    });

    expect(result.createdTradeNames).toEqual(['EV']);
    expect(result.project.bills).toEqual(originalProject.bills);
    expect(result.project.tenderData).toEqual(originalProject.tenderData);
    expect(project).toEqual(originalProject);
    expect(result.project.tenderTradeStatus?.groundworks?.budgetValue).toBeCloseTo(1000 * 232 / 215, 2);
    expect(result.project.tenderTradeStatus?.groundworks?.dueDate).toBe('2026-02-01');
    expect(result.project.tenderTradeStatus?.groundworks?.appraisalBudgetSource).toMatchObject({
      appraisalId: 'appraisal-1',
      appraisalReference: '2026.001.A',
      optionId: option.id,
      generatedAt: '2026-08-13T12:00:00.000Z',
    });
    const evTrade = result.trades.find((trade) => trade.name === 'EV');
    expect(evTrade).toBeTruthy();
    expect(result.project.tenderTradeStatus?.[evTrade!.id]?.budgetValue).toBeCloseTo(1000 * 232 / 215, 2);
  });

  it('keeps abnormals and custom allowances out of trade packages', () => {
    const report = buildAppraisalTradePackageBudget(makeOption({
      costLines: [{
        id: 'abnormal',
        title: 'Mine workings',
        category: 'ABNORMALS',
        amount: 25000,
        cashflow: createCashflowProfile('EVEN', 12),
      }],
      customCostProvisions: [{ id: 'custom', title: 'Reserve', amount: 10000, notes: '', createdAt: '', updatedAt: '' }],
    }));

    expect(report.packages).toHaveLength(0);
    expect(report.allowances).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Abnormals additional elements', amount: 25000 }),
      expect.objectContaining({ label: 'Custom cost provisions', amount: 10000 }),
    ]));
  });

  it('is report-only and does not change the appraisal calculation or contingency inputs', () => {
    const option = makeOption({
      houseTypeSchedule: [{
        id: 'house-1', houseTypeName: 'Example villa', quantity: 1, gifaM2: 100, buildCostPerM2: 0, priceIndex: 215, buildPeriodMonths: 4,
        costBreakdown: [{ id: 'groundwork', key: 'GROUNDWORK', label: 'Groundwork', amount: 1000, priceIndex: 215, included: true }],
      }],
    });
    const beforeOption = structuredClone(option);
    const beforeMetrics = calculateAppraisalOption(option);

    buildAppraisalTradePackageBudget(option);

    expect(option).toEqual(beforeOption);
    expect(calculateAppraisalOption(option)).toEqual(beforeMetrics);
  });
});
