import { describe, expect, it } from 'vitest';
import { ADDITIONAL_SITE_POWER_ROW_IDS, calculateTemporaryPowerReview, DEFAULT_TEMPORARY_POWER, TEMPORARY_POWER_ROW_IDS } from './appraisalTemporaryPower';
import { calculateSiteDimensionBaseTotal, createDefaultAppraisalOption, createSiteDimensionRowFromRate, normalizeDevelopmentAppraisalOption, temporaryPowerLinePresentation, temporaryPowerReview } from './appraisal';
import { createAwdPrelimsRatePack } from './appraisalInfrastructureRatePacks';
import { FUEL_ROW_IDS } from './appraisalFuel';

describe('site office generator and bunded tank package', () => {
  it('chooses the cheaper joint route and only connects mains when worthwhile', () => {
    expect(calculateTemporaryPowerReview(6).strategy).toBe('HIRE_FULL');
    expect(calculateTemporaryPowerReview(6).total).toBe(12900);
    expect(calculateTemporaryPowerReview(8).strategy).toBe('HIRE_THEN_MAINS');
    expect(calculateTemporaryPowerReview(8).total).toBe(16500);
    const nine = calculateTemporaryPowerReview(9);
    expect(nine.strategy).toBe('HIRE_THEN_MAINS');
    expect(nine.generator).toBe(6500);
    expect(nine.tank).toBe(1300);
    expect(nine.mains).toBe(3000);
    expect(nine.generatorFuel).toBe(5100);
    expect(nine.mainsMonths).toBe(3);
    expect(nine.mainsElectricity).toBe(900);
    expect(nine.equipmentTotal).toBe(10800);
    expect(nine.total).toBe(16800);
    expect(calculateTemporaryPowerReview(24, { ...DEFAULT_TEMPORARY_POWER, mainsAvailable: false }).strategy).toBe('PURCHASE_FULL');
  });

  it('uses one appraisal decision for generator, tank, connection, mains usage and fuel after save and reopen', () => {
    const original = createDefaultAppraisalOption('RESIDENTIAL_SALES');
    const pack = createAwdPrelimsRatePack();
    const rows = Object.values(TEMPORARY_POWER_ROW_IDS).map(id => createSiteDimensionRowFromRate(pack.find(rate => rate.id === id)!));
    const fuelRow = createSiteDimensionRowFromRate(pack.find(rate => rate.id === FUEL_ROW_IDS.accommodationGenerator)!);
    expect(rows.every(Boolean)).toBe(true);
    const saved = normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify({
      ...original, durationMonths: 9, programme: undefined,
      siteDimensions: [...rows, fuelRow],
      temporaryPower: { ...DEFAULT_TEMPORARY_POWER },
    })));
    const review = temporaryPowerReview(saved);
    expect(review.strategy).toBe('HIRE_THEN_MAINS');
    expect(rows.map(row => calculateSiteDimensionBaseTotal(row, saved))).toEqual([6500, 1300, 3000, 900]);
    expect(rows.reduce((sum, row) => sum + calculateSiteDimensionBaseTotal(row, saved), 0)).toBe(review.equipmentTotal + review.mainsElectricity);
    expect(calculateSiteDimensionBaseTotal(fuelRow, saved)).toBe(review.generatorFuel);
    const generatorLine = temporaryPowerLinePresentation(rows[0], saved)!;
    expect(generatorLine.unit).toBe('month');
    expect(generatorLine.quantity * generatorLine.rate).toBe(6500);
    expect(saved.temporaryPower).toEqual(DEFAULT_TEMPORARY_POWER);
    expect(saved.siteDimensions!.filter(row => row.libraryRateId === TEMPORARY_POWER_ROW_IDS.mainsElectricity)).toHaveLength(1);
    const duplicateRows = Object.values(ADDITIONAL_SITE_POWER_ROW_IDS).map(id => createSiteDimensionRowFromRate(pack.find(rate => rate.id === id)!));
    const withDuplicates = { ...saved, siteDimensions: [...saved.siteDimensions!, ...duplicateRows] };
    expect(duplicateRows.map(row => calculateSiteDimensionBaseTotal(row, withDuplicates))).toEqual([0, 0]);
    expect(temporaryPowerLinePresentation(duplicateRows[0], withDuplicates)?.quantity).toBe(0);
  });
});
