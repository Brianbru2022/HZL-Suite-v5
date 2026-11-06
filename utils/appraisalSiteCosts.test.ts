import { buildAppraisalQualityChecks } from './appraisalQualityChecks';
import { describe, expect, it } from 'vitest';
import type { AppraisalCostLine, Project } from '../types';
import { createDefaultAppraisalOption, createDefaultCostLine, calculateAppraisalOption, calculateCostLines, calculateCostLineAmount, buildMonthlyCashflow, normalizeDevelopmentAppraisalOption } from './appraisal';
import { seedSiteCostChecklist, changeSiteCost, siteCostMetadata, siteCostSummary } from './appraisalSiteCosts';
import { resolveLinkedAbnormalAmount, refreshLinkedAbnormalLines } from './appraisalLinkedAbnormals';
import { buildFinalReportData } from './appraisalFinalReport';
import { buildAppraisalTradePackageBudget } from './appraisalTradePackageBudget';

const line = (patch: Partial<AppraisalCostLine> = {}) => createDefaultCostLine('ABNORMALS', 12, { id: 'element', title: 'Retaining wall', amount: 20000, notes: 'Engineer scheme', ...patch });
const option = () => ({ ...createDefaultAppraisalOption(), costLines: [line()], durationMonths: 12, financeAnnualRatePercent: 0, overheadPercent: 0, revenueLines: [{ id: 'sale', title: 'Sale', template: 'RESIDENTIAL_SALES' as const, units: 1, saleValuePerUnit: 1000000, cashflow: { type: 'END' as const, startMonth: 1, endMonth: 12 } }] });

describe('site cost register', () => {
  it('flags unresolved prompts without treating evidenced clearances as unpriced costs', () => { const o = option(); o.costLines = seedSiteCostChecklist([], 12); const checks = buildAppraisalQualityChecks(o).filter(check => check.area === 'COSTS'); expect(checks).toHaveLength(15); expect(checks.every(check => check.severity === 'WARNING')).toBe(true); o.costLines = [changeSiteCost(line(), { siteCost: { ...siteCostMetadata(line()), status: 'CLEARED' } }, 'Survey confirms no works')]; expect(buildAppraisalQualityChecks(o).filter(check => check.id.includes('element'))).toHaveLength(0); });
  it('avoids checklist identifier collisions while preserving existing elements', () => { const original = line({ id: 'site-checklist-rock' }); const rows = seedSiteCostChecklist([original], 12); expect(new Set(rows.map(row => row.id)).size).toBe(rows.length); expect(rows.find(row => row.siteCost?.checklistKey === 'rock')?.id).not.toBe(original.id); });
  it('seeds all prompts idempotently without guessing legacy title matches', () => {
    const legacy = line({ title: 'Rock excavation' });
    const first = seedSiteCostChecklist([legacy], 12), again = seedSiteCostChecklist(first, 12);
    expect(first).toHaveLength(16); expect(again).toEqual(first);
    expect(first.slice(1).every(row => row.amount === 0 && row.siteCost?.status === 'TO_BE_ASSESSED' && !row.siteCost.includeInLandOffer)).toBe(true);
    expect(new Set(first.map(row => row.id)).size).toBe(16);
  });
  it('moves costs without changing base, cashflow, evidence, identity or total', () => {
    const initial = { ...option(), abnormalBaseAllowance: 5000 };
    const moved = changeSiteCost(initial.costLines[0], { category: 'EXTERNAL_WORKS', siteCost: { ...siteCostMetadata(initial.costLines[0]), allocation: 'INFRASTRUCTURE' } });
    const next = { ...initial, costLines: [moved] };
    expect(calculateAppraisalOption(next)).toEqual(calculateAppraisalOption(initial));
    expect(buildMonthlyCashflow(next)).toEqual(buildMonthlyCashflow(initial));
    expect(moved.id).toBe('element'); expect(moved.notes).toBe('Engineer scheme'); expect(next.abnormalBaseAllowance).toBe(5000);
    const summary = siteCostSummary(next, row => calculateCostLineAmount(row, next));
    expect(summary.additions).toEqual({ INFRASTRUCTURE: 20000, PLOT_WORKS: 0, SITE_SPECIFIC: 0, ABNORMALS: 0 }); expect(summary.abnormalBase).toBe(5000);
  });
  it('counts an unassessed allowance and reveals unpriced unresolved prompts', () => {
    const o = option(); o.costLines = seedSiteCostChecklist([changeSiteCost(line(), { siteCost: { ...siteCostMetadata(line()), status: 'TO_BE_ASSESSED' } })], 12);
    const summary = siteCostSummary(o, row => calculateCostLineAmount(row, o));
    expect(summary.unresolvedCount).toBe(16); expect(summary.unpricedCount).toBe(15); expect(summary.unresolvedAllowance).toBe(20000);
  });
  it('requires clearance reason and retains estimate/history/evidence; reopening requires an amount', () => {
    const original = line({ percentageBasis: 'GDV', percentageValue: 2 });
    const patch = { siteCost: { ...siteCostMetadata(original), status: 'CLEARED' as const } };
    expect(() => changeSiteCost(original, patch)).toThrow('reason');
    const cleared = changeSiteCost(original, patch, 'Survey confirms no works');
    const o = { ...option(), costLines: [cleared] };
    expect(calculateCostLineAmount(cleared, o)).toBe(0); expect(cleared.amount).toBe(20000); expect(cleared.notes).toBe(original.notes);
    expect(cleared.siteCost?.history).toHaveLength(1);
    expect(() => changeSiteCost(cleared, { siteCost: { ...siteCostMetadata(cleared), status: 'KNOWN' } })).toThrow('Confirm');
    const reopened = changeSiteCost(cleared, { siteCost: { ...siteCostMetadata(cleared), status: 'KNOWN' } }, '', 25000);
    expect(calculateCostLineAmount(reopened, { ...o, costLines: [reopened] })).toBe(25000); expect(reopened.siteCost?.history).toHaveLength(2);
  });
  it('land-offer disclosure has no effect on fixed-price profit or residual land value', () => {
    for (const mode of ['KNOWN_LAND_PROFIT_ON_GDV', 'RESIDUAL_LAND_VALUE'] as const) {
      const initial = { ...option(), calculationMode: mode, knownLandValue: 150000 };
      const flagged = changeSiteCost(initial.costLines[0], { siteCost: { ...siteCostMetadata(initial.costLines[0]), includeInLandOffer: true, offerQualification: 'Price reflects retaining works' } });
      expect(calculateAppraisalOption({ ...initial, costLines: [flagged] })).toEqual(calculateAppraisalOption(initial));
      const without = calculateAppraisalOption({ ...initial, costLines: [] }), withCost = calculateAppraisalOption(initial);
      if (mode === 'RESIDUAL_LAND_VALUE') expect(withCost.landValue).toBeLessThan(without.landValue); else expect(withCost.profit).toBeLessThan(without.profit);
    }
  });
  it('includes abnormal base once, preserving independent additions', () => {
    const o = { ...option(), abnormalBaseAllowance: 5000 };
    expect(calculateCostLines(o).filter(({line}) => line.id === 'site-abnormal-base')).toHaveLength(1);
    expect(calculateAppraisalOption(o).nonLandCost - calculateAppraisalOption(option()).nonLandCost).toBe(5000);
  });
  it('preserves percentage amounts and moved metadata/history through save/reopen and scenario copy', () => {
    const o = option(); o.costLines = [line({ percentageBasis: 'GDV', percentageValue: 2 })];
    const before = calculateAppraisalOption(o);
    const moved = changeSiteCost(o.costLines[0], { siteCost: { ...siteCostMetadata(o.costLines[0]), allocation: 'PLOT_WORKS', includeInLandOffer: true } });
    const normalized = normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify({ ...o, costLines: [moved] })));
    expect(calculateAppraisalOption(normalized)).toEqual(before);
    expect(normalized.costLines.find(row => row.id === moved.id)?.siteCost).toEqual(moved.siteCost);
    const copied = structuredClone(normalized); copied.costLines[0].siteCost!.allocation = 'ABNORMALS';
    expect(normalized.costLines[0].siteCost?.allocation).toBe('PLOT_WORKS');
  });
  it('keeps live and frozen estimate links across allocations, and suspends cleared links', () => {
    const project = { id: 'p', bills: [{ id: 'b', sections: [{ id: 's', items: [{ id: 'i', type: 'PRICED', quantity: 1, rate: 500, total: 500 }] }] }] } as unknown as Project;
    const linked = line({ category: 'EXTERNAL_WORKS', sourceProjectId: 'p', sourceBillId: 'b', siteCost: { ...siteCostMetadata(line()), allocation: 'PLOT_WORKS' } });
    expect(resolveLinkedAbnormalAmount(linked, [project])).toBe(500);
    const refreshed = refreshLinkedAbnormalLines({ ...option(), costLines: [linked] }, [project]).costLines[0];
    expect(refreshed.amount).toBe(500); expect(refreshed.siteCost?.history).toHaveLength(1);
    expect(resolveLinkedAbnormalAmount({ ...linked, linkedAbnormalFrozen: true }, [project])).toBeNull();
    const cleared = changeSiteCost(linked, { siteCost: { ...siteCostMetadata(linked), status: 'CLEARED' } }, 'No work');
    expect(resolveLinkedAbnormalAmount(cleared, [project])).toBeNull(); expect(cleared.amount).toBe(20000);
  });
  it('reports counted percentage costs, allocations and the already-counted offer subset consistently', () => {
    const o = option(); o.costLines = [changeSiteCost(line({ percentageBasis: 'GDV', percentageValue: 3 }), { siteCost: { ...siteCostMetadata(line()), status: 'KNOWN', allocation: 'INFRASTRUCTURE', includeInLandOffer: true, offerQualification: 'Subject to scheme' } })];
    const report = buildFinalReportData(o);
    expect(report.abnormalRows[0].amount).toBe(calculateCostLineAmount(o.costLines[0], o));
    expect(report.abnormalRows[0].allocation).toBe('Infrastructure'); expect(report.landOfferRows).toHaveLength(1);
    expect(report.landOfferDisclosureTotal).toBe(report.abnormalRows[0].amount);
    expect(report.siteCostSummaryRows.find(row => row.title === 'Infrastructure')?.additions).toBe(report.landOfferDisclosureTotal);
    expect(buildAppraisalTradePackageBudget(o).allowances).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'Infrastructure additional elements', amount: report.landOfferDisclosureTotal })]));
  });
});
