import { describe, expect, it } from 'vitest';
import { DEFAULT_DRINKING_WATER, DRINKING_WATER_ROW_IDS, bottledWaterMonthlyCost, drinkingWaterReview } from './appraisalDrinkingWater';
import { calculateSiteDimensionBaseTotal, createDefaultAppraisalOption, createSiteDimensionRowFromRate, normalizeDevelopmentAppraisalOption, siteAccommodationLinePresentation, siteAccommodationWaterReview } from './appraisal';
import { createAwdPrelimsRatePack } from './appraisalInfrastructureRatePacks';

describe('site accommodation rates and drinking-water choice', () => {
  it('uses three occupants by default, increasing bottled budget for five', () => {
    expect(bottledWaterMonthlyCost(DEFAULT_DRINKING_WATER)).toBe(100);
    expect(bottledWaterMonthlyCost({ ...DEFAULT_DRINKING_WATER, averagePeople: 5 })).toBe(150);
    const eighteen = drinkingWaterReview(18);
    expect(eighteen.method).toBe('BOTTLED_FULL');
    expect(eighteen.total).toBe(1800);
    expect(eighteen.mainsOptionCost).toBe(2700);
    const sixty = drinkingWaterReview(60);
    expect(sixty.method).toBe('BOTTLED_THEN_MAINS');
    expect([sixty.bottledCost, sixty.connectionCost, sixty.mainsServiceCost]).toEqual([600, 1500, 2700]);
    expect(sixty.total).toBe(4800);
    expect(drinkingWaterReview(60, { ...DEFAULT_DRINKING_WATER, connectionArrangement: 'NO_MAINS' }).total).toBe(6000);
    expect(drinkingWaterReview(60, { ...DEFAULT_DRINKING_WATER, connectionArrangement: 'PUBLIC_MAIN' }).method).toBe('BOTTLED_FULL');
  });

  it('replaces legacy rates, furniture and water rows without losing the selected split on reopen', () => {
    const pack = createAwdPrelimsRatePack();
    const ids = ['awd-prelims-rates', 'awd-prelims-furniture', ...Object.values(DRINKING_WATER_ROW_IDS)];
    const rows = ids.map(id => createSiteDimensionRowFromRate(pack.find(rate => rate.id === id)!));
    const original = createDefaultAppraisalOption('RESIDENTIAL_SALES');
    const saved = normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify({
      ...original, durationMonths: 60, programme: undefined, siteDimensions: rows,
      drinkingWater: { ...DEFAULT_DRINKING_WATER },
    })));
    expect(siteAccommodationWaterReview(saved).method).toBe('BOTTLED_THEN_MAINS');
    expect(ids.map(id => calculateSiteDimensionBaseTotal(saved.siteDimensions!.find(row => row.libraryRateId === id)!, saved))).toEqual([9000, 0, 600, 1500, 2700]);
    const waterLines = Object.values(DRINKING_WATER_ROW_IDS).map(id => siteAccommodationLinePresentation(saved.siteDimensions!.find(row => row.libraryRateId === id)!, saved)!);
    expect(waterLines.map(line => line.quantity * line.rate)).toEqual([600, 1500, 2700]);
    expect(saved.drinkingWater?.averagePeople).toBe(3);
  });
});
