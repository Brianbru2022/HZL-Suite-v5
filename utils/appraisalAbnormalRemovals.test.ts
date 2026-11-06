import { describe, it, expect } from 'vitest';
import { createDefaultAppraisalOption, normalizeDevelopmentAppraisalOption, calculateAppraisalOption, calculateCostLines, calculateCostLineAmount } from './appraisal';
import { ABNORMAL_REMOVAL_RATE_IDS, siteBaseRowMatches, changeSiteCost, siteCostMetadata, siteCostSummary } from './appraisalSiteCosts';
import { buildAppraisalTradePackageBudget } from './appraisalTradePackageBudget';
const fixture = () => normalizeDevelopmentAppraisalOption({ ...createDefaultAppraisalOption(), calculationMode: 'KNOWN_LAND_PROFIT_ON_GDV', financeAnnualRatePercent: 0, overheadPercent: 0, houseTypeSchedule: [], programme: { appraisalPriceIndex: 100, startPriceIndex: 110, expectedStartDate: '2027-01-01' }, costLines: [], siteDimensions: [
  { id: 'structures', libraryRateId: ABNORMAL_REMOVAL_RATE_IDS[0], label: 'Removal of existing structures', category: 'OTHER', unit: 'sum', quantity: 1, rate: 10000, priceIndex: 100 },
  { id: 'surfaces', libraryRateId: ABNORMAL_REMOVAL_RATE_IDS[1], label: 'Removal of existing surfaces', category: 'OTHER', unit: 'm2', quantity: 100, rate: 20, priceIndex: 100 },
  { id: 'new-road', libraryRateId: 'awd-infrastructure-roads', sourceFormula: 'USER_ROADS_PATHS_V1: fixture', label: 'New roads', category: 'OTHER', unit: 'm2', quantity: 100, rate: 50, priceIndex: 100 },
] });
describe('abnormal removal source links', () => {
  it('moves existing removal families out of the infrastructure base and counts each source once', () => {
    const o = fixture(), lines = calculateCostLines(o);
    expect(o.siteDimensions!.filter(r => !r.isCostDriverInput && siteBaseRowMatches(r, 'INFRASTRUCTURE') && r.rate * r.quantity > 0 && r.libraryRateId !== 'awd-infrastructure-bill-preliminaries').map(r => r.id)).toEqual(['new-road']);
    expect(lines.find(l => l.line.id === 'structured-house-building-infrastructure')?.amount).toBe(5200);
    expect(lines.filter(l => l.line.sourceSiteDimensionId)).toHaveLength(2);
    expect(siteCostSummary(o, l => calculateCostLineAmount(l, o)).additions.ABNORMALS).toBe(12000);
    expect(calculateAppraisalOption(o).nonLandCost).toBeCloseTo(18400, 2);
  });
  it('retains indexation in procurement reconciliation outside infrastructure packages', () => {
    const o = fixture(), report = buildAppraisalTradePackageBudget(o);
    expect(report.packageTotal).toBe(5000);
    expect(report.allowanceTotal).toBeCloseTo(13400, 2);
    expect(report.packages.flatMap(p => p.sources).some(s => s.label.includes('Removal'))).toBe(false);
    expect(report.packageTotal + report.allowanceTotal).toBeCloseTo(calculateAppraisalOption(o).nonLandCost, 2);
  });
  it('keeps source identity and evidence when moved; clears both source and index contribution', () => {
    const o = fixture(), source = o.costLines.find(l => l.sourceSiteDimensionId === 'structures')!;
    source.notes = 'Engineer survey';
    const moved = changeSiteCost(source, { siteCost: { ...siteCostMetadata(source), allocation: 'PLOT_WORKS' } });
    o.costLines = o.costLines.map(l => l.id === moved.id ? moved : l);
    expect(calculateAppraisalOption(o).nonLandCost).toBeCloseTo(18400, 2);
    expect(siteCostSummary(o, l => calculateCostLineAmount(l, o)).additions.PLOT_WORKS).toBe(10000);
    const cleared = changeSiteCost(moved, { siteCost: { ...siteCostMetadata(moved), status: 'CLEARED' } }, 'No demolition required');
    o.costLines = o.costLines.map(l => l.id === cleared.id ? cleared : l);
    expect(cleared.amount).toBe(10000); expect(cleared.notes).toBe('Engineer survey');
    expect(calculateAppraisalOption(o).nonLandCost).toBeCloseTo(7400, 2);
    const report = buildAppraisalTradePackageBudget(o);
    expect(report.packageTotal + report.allowanceTotal).toBeCloseTo(7400, 2);
  });
  it('normalizes idempotently, preserves live measurements and round trips source links', () => {
    const o = fixture(), first = o.costLines.filter(l => l.sourceSiteDimensionId).map(l => l.id);
    const next = normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(o)));
    expect(next.costLines.filter(l => l.sourceSiteDimensionId).map(l => l.id)).toEqual(first);
    next.siteDimensions!.find(row => row.id === 'structures')!.rate = 15000;
    const source = next.costLines.find(l => l.sourceSiteDimensionId === 'structures')!;
    expect(calculateCostLineAmount(source, next)).toBe(15000);
    expect(calculateAppraisalOption(next).nonLandCost).toBeCloseTo(23900, 2);
  });
});

it('excludes alterations from infrastructure and links a single abnormal contribution', () => {
  const original = fixture();
  original.siteDimensions!.push({id: 'alter', libraryRateId: 'awd-infrastructure-alterations', label: 'Alterations', category: 'OTHER', unit: 'sum', quantity: 1, rate: 3000, priceIndex: 100});
  const o = normalizeDevelopmentAppraisalOption(original);
  expect(siteBaseRowMatches(o.siteDimensions!.find(r => r.id === 'alter')!, 'INFRASTRUCTURE')).toBe(false);
  expect(o.costLines.filter(l => l.sourceSiteDimensionId === 'alter')).toHaveLength(1);
  expect(siteCostSummary(o, l => calculateCostLineAmount(l, o)).additions.ABNORMALS).toBe(15000);
  expect(calculateAppraisalOption(o).nonLandCost).toBeCloseTo(21700, 2);
  const report = buildAppraisalTradePackageBudget(o);
  expect(report.packageTotal).toBe(5000);
  expect(report.packageTotal + report.allowanceTotal).toBeCloseTo(21700, 2);
});
