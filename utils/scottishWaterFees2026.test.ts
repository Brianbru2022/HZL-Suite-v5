import { describe, expect, it } from 'vitest';
import { calculateScottishWaterFees2026, normalizeScottishWaterFees } from './scottishWaterFees2026';

describe('Scottish Water 2026/27 appraisal charges', () => {
  it('charges building water, foul infrastructure and both inspection types without fresh-water infrastructure or connections', () => {
    const review = calculateScottishWaterFees2026(6);
    expect(review.charges).toBeCloseTo(6 * (549.4 + 238));
    expect(review.wastewaterCharges).toBeCloseTo(6 * 549.4);
    expect(review.waterCharges).toBe(6 * 238);
    expect(review.waterInfrastructureCharges).toBe(0);
    expect(review.rebate).toBeCloseTo(-review.wastewaterCharges * 0.5);
    expect(review.waterRebate + review.wastewaterRebate).toBeCloseTo(review.rebate);
    expect(review.wastewaterInspections).toBe(2);
    expect(review.connections).toBeCloseTo(113.7 + 8 * 155.8);
    expect(review.waterConnections + review.wastewaterConnections).toBeCloseTo(review.connections);
  });

  it('defaults to a negative 50% foul rebate and ignores saved fresh-water claims', () => {
    const pending = calculateScottishWaterFees2026(2, { waterContribution: 9000, wastewaterContribution: 9000 });
    expect(pending.rebate).toBeCloseTo(-pending.wastewaterCharges * 0.5);
    expect(calculateScottishWaterFees2026(2, { contributionBasis: 'NONE' }).rebate).toBe(0);
    const budget = calculateScottishWaterFees2026(2, {
      contributionBasis: 'BUDGET', eligibleWaterWorksCost: 7000, eligibleWastewaterWorksCost: 2000,
      waterContribution: 9000, wastewaterContribution: 1000,
    });
    expect(budget.rebate).toBe(-1000);
    expect(budget.rebate).toBeLessThanOrEqual(0);
    expect(budget.charges).toBe(pending.charges);
    expect(budget.connections).toBe(pending.connections);
  });

  it('does not charge a sewer inspection for every home on a multi-plot site', () => {
    const review = calculateScottishWaterFees2026(100);
    expect(review.waterInspections).toBe(100);
    expect(review.wastewaterInspections).toBe(2);
    expect(review.connections).toBeCloseTo(113.7 + 102 * 155.8);
  });

  it('allows project connection counts and quoted tie-ins without changing the charge per dwelling', () => {
    const review = calculateScottishWaterFees2026(4, {
      waterDwellings: 4, wastewaterDwellings: 3,
      standardWaterConnections: 1, applicationCount: 2,
      waterInspections: 1, wastewaterInspections: 2,
      quotedAdditionalConnectionCost: 5000, quotedWastewaterConnectionCost: 700,
      inspectionMethod: 'DESKTOP',
    });
    expect(review.charges).toBeCloseTo(3 * 549.4 + 4 * 238);
    expect(review.connections).toBeCloseTo(2 * 113.7 + 3 * 50.6 + 700);
    expect(review.quotedAdditionalConnectionCost).toBe(5000);
    expect(review.waterInfrastructureCharges).toBe(0);
  });

  it('takes the current House Types mix over stale saved counts and prices each type separately', () => {
    const review = calculateScottishWaterFees2026(135, {
      buildingWaterFlatHomes: 0, buildingWaterSemiTerracedHomes: 0, buildingWaterDetachedHomes: 135,
      waterInspections: 133, wastewaterInspections: 2, applicationCount: 2,
    }, { flats: 24, semiTerraced: 50, detached: 61 });
    expect(review.flatHomes).toBe(24);
    expect(review.semiTerracedHomes).toBe(50);
    expect(review.detachedHomes).toBe(61);
    expect(review.buildingWaterCharges).toBe(24 * 187 + 50 * 231 + 61 * 296);
    expect(review.charges).toBeCloseTo(review.buildingWaterCharges + 135 * 549.4);
    expect(review.connections).toBeCloseTo(2 * 113.7 + (133 + 2) * 155.8);
    expect(review.rebate).toBeCloseTo(-135 * 549.4 * 0.5);
  });

  it('uses the average of the three dwelling tariffs for homes without a recorded type', () => {
    const review = calculateScottishWaterFees2026(3, undefined,
      { flats: 1, semiTerraced: 0, detached: 0, unclassified: 2 });
    expect(review.unclassifiedHomes).toBe(2);
    expect(review.buildingWaterCharges).toBe(187 + 2 * 238);
  });

  it('normalizes saved values and rejects negative amounts', () => {
    const saved = normalizeScottishWaterFees({ contributionBasis: 'AGREED', waterContribution: -100, standardWaterConnections: 2.9 });
    expect(saved).toMatchObject({ contributionBasis: 'AGREED', waterContribution: 0, standardWaterConnections: 2 });
    expect(normalizeScottishWaterFees({ contributionBasis: 'NONE' })?.contributionBasis).toBe('NONE');
    expect(normalizeScottishWaterFees({})?.contributionBasis).toBe('DEFAULT_50_PERCENT');
  });
});
