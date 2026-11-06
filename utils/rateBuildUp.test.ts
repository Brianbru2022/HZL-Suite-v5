import { describe, expect, it } from 'vitest';
import { applyRateBuildUp, componentTotal, derivedRate } from './rateBuildUp';

describe('rate build-ups', () => {
  it('reconciles included components to the billed derived rate and line total', () => {
    const result = applyRateBuildUp({ quantity: 2, rate: 0, total: 0, rateBuildUp: { mode: 'DERIVED', components: [
      { id: 'labour', category: 'LABOUR', description: 'Operative', quantity: 1.5, unit: 'hr', rate: 24, position: 0 },
      { id: 'materials', category: 'MATERIALS', description: 'Sealant', quantity: 3, unit: 'nr', rate: 8.25, position: 1 },
      { id: 'excluded', category: 'PLANT', description: 'Excluded plant', quantity: 1, unit: 'day', rate: 80, included: false, position: 2 },
    ] } });
    expect(derivedRate(result.rateBuildUp)).toBe(60.75);
    expect(result.rate).toBe(60.75);
    expect(result.total).toBe(121.5);
  });

  it('supports custom categories and negative component values', () => {
    expect(componentTotal({ quantity: -1, rate: 45 })).toBe(-45);
    expect(derivedRate({ mode: 'DERIVED', components: [{ id: 'custom', category: 'CUSTOM', categoryLabel: 'Waste credit', description: 'Salvage', quantity: -1, unit: 'sum', rate: 45, position: 0 }] })).toBe(-45);
  });

  it('leaves legacy single-rate items unchanged', () => {
    const result = applyRateBuildUp({ quantity: 4, rate: 12.5, total: 0, rateBuildUp: { mode: 'SINGLE_RATE', components: [] } });
    expect(result.rate).toBe(12.5);
    expect(result.total).toBe(50);
  });
});
