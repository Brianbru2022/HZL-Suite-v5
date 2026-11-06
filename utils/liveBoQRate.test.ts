import { describe, expect, it } from 'vitest';
import { calculateLiveDirectRate, hasHalfBrickLabourOutlier } from './liveBoQRate';

describe('live direct bill rates', () => {
  const buildUp = {
    materials: 34.65, labourHours: 1, labourHourlyCost: 38,
    plant: 0, waste: 5, otherDirect: 0,
    labourBasis: 'One person-hour per m² at £38/hour', rationale: 'Normal wall build-up',
  };

  it('reconciles explicit components without contractor margin or preliminaries', () => {
    expect(calculateLiveDirectRate({ ...buildUp, overheadProfit: 100, preliminaries: 100 } as typeof buildUp)).toEqual({ labour: 38, rate: 77.65 });
  });

  it('rejects unsupported or non-numeric labour assumptions', () => {
    expect(calculateLiveDirectRate({ ...buildUp, labourBasis: '' })).toBeNull();
    expect(calculateLiveDirectRate({ ...buildUp, labourHours: 0 })).toBeNull();
    expect(calculateLiveDirectRate({ ...buildUp, materials: Number.NaN })).toBeNull();
  });

  it('flags the excessive half-brick labour in the reported example', () => {
    expect(hasHalfBrickLabourOutlier('half brick thick', 'm²', 115)).toBe(true);
    expect(hasHalfBrickLabourOutlier('half brick thick', 'm²', 38)).toBe(false);
    expect(hasHalfBrickLabourOutlier('stone wall', 'm²', 115)).toBe(false);
  });
});
