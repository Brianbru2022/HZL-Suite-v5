import { describe, expect, it } from 'vitest';
import { calculateSiteDimensionBaseTotal, createDefaultAppraisalOption, createManualHouseTypeScheduleRow, createSiteDimensionRowFromRate, miniSkipsForUnits, MINI_SKIPS_ROW_ID, normalizeDevelopmentAppraisalOption, resolveSiteDimensionQuantity } from './appraisal';
import { createAwdPrelimsRatePack } from './appraisalInfrastructureRatePacks';

describe('site-wide mini skips', () => {
  it('blends from 3 to 9 whole skips and caps the allowance at 20 dwellings', () => {
    expect([0, 1, 10, 20, 50].map(miniSkipsForUnits)).toEqual([0, 3, 6, 9, 9]);
    expect(miniSkipsForUnits(19)).toBeLessThanOrEqual(9);
  });

  it('reprices a saved lump-sum row without changing its identity or duplicating it', () => {
    const packRow = createAwdPrelimsRatePack().find(item => item.id === MINI_SKIPS_ROW_ID)!;
    const legacy = { ...createSiteDimensionRowFromRate(packRow), costDriver: 'FIXED_SUM' as const, unit: 'sum' as const, rate: 1000 };
    const option = normalizeDevelopmentAppraisalOption({
      ...createDefaultAppraisalOption('RESIDENTIAL_SALES'),
      houseTypeSchedule: [createManualHouseTypeScheduleRow({ quantity: 10 })],
      siteDimensions: [legacy],
    });
    const selected = option.siteDimensions!.find(item => item.libraryRateId === MINI_SKIPS_ROW_ID)!;
    expect(selected.id).toBe(legacy.id);
    expect(selected).toMatchObject({ costDriver: 'TOTAL_UNITS', unit: 'nr', rate: 150 });
    expect(resolveSiteDimensionQuantity(selected, option)).toBe(6);
    expect(calculateSiteDimensionBaseTotal(selected, option)).toBe(900);
    const reopened = normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(option)));
    expect(reopened.siteDimensions!.filter(item => item.libraryRateId === MINI_SKIPS_ROW_ID)).toHaveLength(1);
  });
});
