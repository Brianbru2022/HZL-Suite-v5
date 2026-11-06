import { describe, expect, it } from 'vitest';
import type { Project } from '../types';
import { ABNORMAL_CATEGORIES, presetSiteCostAllocation, siteCostCategoriesFor } from './appraisalAbnormalCatalog';
import { createDefaultAppraisalOption, createDefaultCostLine, calculateAppraisalOption, calculateCostLineAmount, buildMonthlyCashflow, normalizeDevelopmentAppraisalOption } from './appraisal';
import { changeSiteCost, siteCostMetadata, siteCostSummary } from './appraisalSiteCosts';
import { refreshLinkedAbnormalLines } from './appraisalLinkedAbnormals';
import { buildFinalReportData, buildFallbackFinalReportExecutiveSummary } from './appraisalFinalReport';
import { buildAppraisalTradePackageBudget } from './appraisalTradePackageBudget';

const element = () => createDefaultCostLine('ABNORMALS', 12, {
  id: 'suds', title: 'SUDS basin', amount: 20000, notes: 'Engineer drainage strategy',
  sourceProjectId: 'p', sourceBillId: 'b', sourceSectionId: 's', sourcePageId: 'page',
  abnormalElement: { kind: 'BILL', categoryId: 'drainage', presetId: 'suds' },
  siteCost: { allocation: 'ABNORMALS', status: 'PROVISIONAL', includeInLandOffer: false, history: [] },
});
const option = () => ({ ...createDefaultAppraisalOption(), durationMonths: 12, abnormalBaseAllowance: 5000,
  financeAnnualRatePercent: 0, overheadPercent: 0, costLines: [element()],
  revenueLines: [{ id: 'sale', title: 'Sale', template: 'RESIDENTIAL_SALES' as const, units: 1, saleValuePerUnit: 1000000, cashflow: { type: 'END' as const, startMonth: 1, endMonth: 12 } }],
});
const move = (line = element()) => changeSiteCost(line, { siteCost: { ...siteCostMetadata(line), allocation: 'SITE_SPECIFIC' } });

describe('site-specific works and exceptional abnormals', () => {
  it('offers each original preset once, with planned SUDS separate from exceptional works', () => {
    const site = siteCostCategoriesFor('SITE_SPECIFIC').flatMap(c => c.elements);
    const abnormal = siteCostCategoriesFor('ABNORMALS').flatMap(c => c.elements);
    const original = ABNORMAL_CATEGORIES.flatMap(c => c.elements);
    expect([...site, ...abnormal].map(e => e.id).sort()).toEqual(original.map(e => e.id).sort());
    expect(new Set([...site, ...abnormal].map(e => e.id)).size).toBe(original.length);
    expect(site.map(e => e.id)).toEqual(expect.arrayContaining(['suds', 'filter-trenches', 'retaining-walls', 'substation-foundations']));
    expect(abnormal.map(e => e.id)).toEqual(expect.arrayContaining(['contamination', 'rock-excavation', 'existing-buildings']));
    expect(presetSiteCostAllocation('suds')).toBe('SITE_SPECIFIC');
    expect(siteCostCategoriesFor('SITE_SPECIFIC').every(c => c.elements.length > 0)).toBe(true);
  });
  it('moves an element without changing either financial mode, cashflow, source or base costs', () => {
    for (const calculationMode of ['RESIDUAL_LAND_VALUE', 'KNOWN_LAND_PROFIT_ON_GDV'] as const) {
      const original = { ...option(), calculationMode, knownLandValue: 100000 };
      const moved = move(); const next = { ...original, costLines: [moved] };
      expect(calculateAppraisalOption(next)).toEqual(calculateAppraisalOption(original));
      expect(buildMonthlyCashflow(next)).toEqual(buildMonthlyCashflow(original));
      expect(moved).toMatchObject({ id: original.costLines[0].id, amount: 20000, notes: original.costLines[0].notes, sourcePageId: 'page', abnormalElement: original.costLines[0].abnormalElement, cashflow: original.costLines[0].cashflow });
      expect(moved.siteCost!.history).toHaveLength(1);
      expect(siteCostSummary(next, l => calculateCostLineAmount(l, next))).toMatchObject({ additions: { SITE_SPECIFIC: 20000, ABNORMALS: 0 }, additionsTotal: 20000, abnormalBase: 5000 });
    }
  });
  it('preserves legacy allocations and normalizes a saved site-specific element idempotently', () => {
    const original = option();
    expect(normalizeDevelopmentAppraisalOption(original).costLines[0].siteCost!.allocation).toBe('ABNORMALS');
    const saved = normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify({ ...original, costLines: [move()] })));
    expect(saved.costLines).toHaveLength(1);
    expect(saved.costLines[0].siteCost!.allocation).toBe('SITE_SPECIFIC');
    expect(normalizeDevelopmentAppraisalOption(saved).costLines).toEqual(saved.costLines);
    expect(calculateAppraisalOption(saved)).toEqual(calculateAppraisalOption(original));
  });
  it('keeps moved links live and respects frozen snapshots', () => {
    const project = { id: 'p', bills: [{ id: 'b', sections: [{ id: 's', items: [], pages: [{ id: 'page', items: [{ type: 'PRICED', total: 23000 }] }] }] }] } as unknown as Project;
    const next = { ...option(), costLines: [move()] };
    const refreshed = refreshLinkedAbnormalLines(next, [project]);
    expect(refreshed.costLines[0].amount).toBe(23000);
    expect(refreshed.costLines[0].siteCost!.allocation).toBe('SITE_SPECIFIC');
    const frozen = { ...next, costLines: [{ ...next.costLines[0], linkedAbnormalFrozen: true }] };
    expect(refreshLinkedAbnormalLines(frozen, [project]).costLines[0].amount).toBe(20000);
  });
  it('clears and reopens with an explicit amount without losing scope or assessment history', () => {
    const moved = move();
    const cleared = changeSiteCost(moved, { siteCost: { ...moved.siteCost!, status: 'CLEARED' } }, 'Design confirms no basin required');
    expect(calculateCostLineAmount(cleared, { ...option(), costLines: [cleared] })).toBe(0);
    expect(cleared.amount).toBe(20000);
    expect(() => changeSiteCost(cleared, { siteCost: { ...cleared.siteCost!, status: 'KNOWN' } })).toThrow('Confirm');
    const reopened = changeSiteCost(cleared, { siteCost: { ...cleared.siteCost!, status: 'KNOWN' } }, '', 24000);
    expect(reopened.siteCost!.allocation).toBe('SITE_SPECIFIC');
    expect(reopened.siteCost!.history).toHaveLength(3);
    expect(reopened.sourcePageId).toBe('page');
  });
  it('counts disclosed and unresolved site-specific allowances once across reports and procurement', () => {
    const moved = move();
    const flagged = changeSiteCost(moved, { siteCost: { ...moved.siteCost!, status: 'TO_BE_ASSESSED', includeInLandOffer: true, offerQualification: 'Subject to drainage approval' } });
    const o = { ...option(), costLines: [flagged] };
    expect(calculateAppraisalOption(o)).toEqual(calculateAppraisalOption({ ...o, costLines: [element()] }));
    const summary = siteCostSummary(o, l => calculateCostLineAmount(l, o));
    expect(summary).toMatchObject({ unresolvedCount: 1, unresolvedAllowance: 20000, landOfferTotal: 20000 });
    const report = buildFinalReportData(o);
    expect(report.siteCostSummaryRows).toHaveLength(4);
    expect(report.siteCostSummaryRows.find(r => r.title === 'Site-specific works')).toEqual({ title: 'Site-specific works', base: 0, additions: 20000, total: 20000 });
    expect(report.abnormalRows[0].allocation).toBe('Site-specific works');
    expect(report.landOfferDisclosureTotal).toBe(20000);
    expect(buildAppraisalTradePackageBudget(o).allowances).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'Site-specific works additional elements', amount: 20000 })]));
    expect(buildFallbackFinalReportExecutiveSummary(o)).toContain('1 additional site element');
  });
});
