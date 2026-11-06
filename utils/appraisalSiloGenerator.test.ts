import { describe, expect, it } from 'vitest';
import {
  calculateSiteDimensionBaseTotal,
  createDefaultAppraisalOption,
  createSiteDimensionRowFromRate,
  ensureBaseInfrastructureRates,
  fuelLinePresentation,
  normalizeDevelopmentAppraisalOption,
  siloGeneratorLinePresentation,
  siloGeneratorReview,
} from './appraisal';
import { createAwdPrelimsRatePack } from './appraisalInfrastructureRatePacks';
import { calculateSiloGeneratorReview, DEFAULT_SILO_GENERATOR_ASSUMPTIONS, SILO_GENERATOR_FUEL_ROW_ID, SILO_GENERATOR_ROW_ID } from './appraisalSiloGenerator';

const base = {
  dwellings: 48,
  buildRateUnitsPerMonth: 2,
  programmeMonths: 27,
  leadInMonths: 3,
  longestHouseBuildMonths: 6,
  fuelPerActiveMonth: 330,
};

describe('site-specific silo generator', () => {
  it('excludes lead-in, estimates active masonry time and selects purchase/reuse for a long site', () => {
    const result = calculateSiloGeneratorReview(base);
    expect(result.constructionMonths).toBe(24);
    expect(result.provisionalMortarMonths).toBe(18);
    expect(result.activeGeneratorMonths).toBe(18);
    expect(result.purchaseCost).toBeCloseTo(9_600, 2);
    expect(result.hireCost).toBe(21_600);
    expect(result.route).toBe('PURCHASE');
    expect(result.selectedCost).toBeCloseTo(9_600, 2);
    expect(result.fuelCost).toBe(5_940);
  });

  it('allocates reusable purchase cost to a short site and stops generator and fuel when suitable mains arrive', () => {
    const short = calculateSiloGeneratorReview({ ...base, dwellings: 8, programmeMonths: 7 });
    expect(short.constructionMonths).toBe(4);
    expect(short.activeGeneratorMonths).toBe(3);
    expect(short.route).toBe('PURCHASE');
    expect(short.selectedCost).toBeCloseTo(1_600, 2);
    const mains = calculateSiloGeneratorReview({
      ...base,
      assumptions: { ...DEFAULT_SILO_GENERATOR_ASSUMPTIONS, suitableMainsFromSiteMonth: 5 },
    });
    expect(mains.activeGeneratorMonths).toBe(2);
    expect(mains.route).toBe('PURCHASE');
    expect(mains.fuelCost).toBe(660);
  });

  it('uses the agreed £400 per construction month for Coupar Angus and retains the historical frozen basis', () => {
    const coupar = calculateSiloGeneratorReview({
      ...base, dwellings: 11, buildRateUnitsPerMonth: 2,
      programmeMonths: 12, leadInMonths: 2, longestHouseBuildMonths: 4,
    });
    expect(coupar.constructionMonths).toBe(6);
    expect(coupar.activeGeneratorMonths).toBe(4.5);
    expect(coupar.purchaseCost).toBe(2_400);
    expect(coupar.hireCost).toBe(5_400);
    expect(coupar.route).toBe('PURCHASE');
    const frozen = calculateSiloGeneratorReview({
      ...base, dwellings: 11, buildRateUnitsPerMonth: 2,
      programmeMonths: 12, leadInMonths: 2, longestHouseBuildMonths: 4,
      assumptions: { ...DEFAULT_SILO_GENERATOR_ASSUMPTIONS, ownershipMonthlyOtherCost: (24 * 400 - 5000) / 18 },
      legacyPurchaseCostBasis: true,
    });
    expect(frozen.purchaseCost).toBe(6_150);
    expect(frozen.route).toBe('HIRE');
    expect(frozen.selectedCost).toBe(5_400);
  });

  it('keeps an old frozen appraisal on its saved generator basis while an editable copy adopts the corrected allocation', () => {
    const option = createDefaultAppraisalOption('RESIDENTIAL_SALES');
    option.durationMonths = 12;
    option.houseTypeSchedule = [{ ...option.houseTypeSchedule![0], quantity: 11, buildPeriodMonths: 4 }];
    option.programme = { ...option.programme, leadInMonths: 2, saleRateUnitsPerMonth: 2 };
    option.siloGeneratorAssumptions = {
      ...DEFAULT_SILO_GENERATOR_ASSUMPTIONS,
      ownershipMonthlyOtherCost: (24 * 400 - 5000) / 18,
      costBasisVersion: undefined,
    };
    option.frozenMetrics = {} as NonNullable<typeof option.frozenMetrics>;
    expect(siloGeneratorReview(option).selectedCost).toBe(5_400);
    const editable = normalizeDevelopmentAppraisalOption({ ...option, frozenMetrics: undefined });
    expect(editable.siloGeneratorAssumptions?.costBasisVersion).toBe(2);
    expect(siloGeneratorReview(editable).selectedCost).toBe(2_400);
  });

  it('recalculates inferred periods when base appraisal data changes, while preserving deliberate overrides', () => {
    const initial = calculateSiloGeneratorReview(base);
    const revised = calculateSiloGeneratorReview({ ...base, dwellings: 60, programmeMonths: 33 });
    expect(initial.constructionMonths).toBe(24);
    expect(revised.constructionMonths).toBe(30);
    expect(revised.provisionalMortarMonths).toBe(22.5);
    const overridden = calculateSiloGeneratorReview({
      ...base, dwellings: 60, programmeMonths: 33,
      assumptions: { ...DEFAULT_SILO_GENERATOR_ASSUMPTIONS, constructionMonths: 20 },
    });
    expect(overridden.constructionMonths).toBe(20);
    expect(overridden.provisionalMortarMonths).toBe(15);
  });

  it('replaces the legacy lump sum, adds one separate fuel line and retains saved assumptions', () => {
    const option = createDefaultAppraisalOption('RESIDENTIAL_SALES');
    const pack = createAwdPrelimsRatePack();
    const generator = createSiteDimensionRowFromRate(pack.find(rate => rate.id === SILO_GENERATOR_ROW_ID)!, { costDriver: 'FIXED_SUM', rate: 10_000 });
    option.siteDimensions = [generator];
    option.houseTypeSchedule = [{ ...option.houseTypeSchedule![0], quantity: 48, buildPeriodMonths: 6 }];
    option.programme = { ...option.programme, leadInMonths: 3, saleRateUnitsPerMonth: 2 };
    option.siloGeneratorAssumptions = { ...DEFAULT_SILO_GENERATOR_ASSUMPTIONS };
    const migrated = ensureBaseInfrastructureRates(option);
    const generatorRow = migrated.siteDimensions!.find(row => row.libraryRateId === SILO_GENERATOR_ROW_ID)!;
    const fuelRows = migrated.siteDimensions!.filter(row => row.libraryRateId === SILO_GENERATOR_FUEL_ROW_ID);
    expect(generatorRow).toMatchObject({ costDriver: 'PROGRAMME_MONTHS', rate: 400 });
    expect(fuelRows).toHaveLength(1);
    expect(calculateSiteDimensionBaseTotal(generatorRow, migrated)).toBeCloseTo(9_600, 2);
    expect(siloGeneratorLinePresentation(generatorRow, migrated)!.quantity).toBe(24);
    expect(fuelLinePresentation(fuelRows[0], migrated)!.quantity).toBe(18);
    expect(calculateSiteDimensionBaseTotal(fuelRows[0], migrated)).toBe(5_940);
    expect(ensureBaseInfrastructureRates(migrated).siteDimensions!.filter(row => row.libraryRateId === SILO_GENERATOR_FUEL_ROW_ID)).toHaveLength(1);
    const reopened = normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(migrated)));
    expect(reopened.siloGeneratorAssumptions).toEqual(migrated.siloGeneratorAssumptions);
    expect(siloGeneratorReview(reopened).selectedCost).toBeCloseTo(9_600, 2);
  });
});
