import { describe, expect, it } from 'vitest';
import { calculateSiteDimensionBaseTotal, calculateSiteDimensionTotal, createDefaultAppraisalOption, normalizeDevelopmentAppraisalOption, rccFeeReview, siteDimensionEffectivePriceIndex } from './appraisal';
import { calculateScottishRccFee, estimateRccLengths, estimateRegionalRccBenchmark } from './scottishRccFees2026';
import { RCC_AUTHORITY_STYLES, SCOTTISH_RCC_AUTHORITIES } from './scottishRccSchedules2026';

describe('Scottish RCC fees by appraisal roads authority', () => {
  it('calculates the two verified 2026/27 authority schedules and keeps inspection distinct', () => {
    expect(calculateScottishRccFee({ authority: 'PERTH_KINROSS', officerHours: 10 }).fee).toBe(1980);
    expect(calculateScottishRccFee({ authority: 'PERTH_KINROSS', officerHours: 10 }).applicationFee).toBe(900);
    expect(calculateScottishRccFee({ authority: 'PERTH_KINROSS', officerHours: 10 }).inspectionFee).toBe(1080);
    expect(calculateScottishRccFee({ authority: 'EAST_LOTHIAN', roadLengthM: 150, footpathLengthM: 40 }).fee).toBeCloseTo(6434.2);
    expect(calculateScottishRccFee({ authority: 'EAST_LOTHIAN', roadLengthM: 150, footpathLengthM: 40 }).status).toBe('BUDGET');
    expect(calculateScottishRccFee({ authority: 'EAST_LOTHIAN', roadLengthM: 150, footpathLengthM: 40, inspectionHours: 2 }).fee).toBeCloseTo(5668.2);
    expect(calculateScottishRccFee({ authority: 'OTHER', otherAuthorityName: 'Council', manualFee: 1200 }).fee).toBe(1200);
    expect(calculateScottishRccFee({ authority: 'NOT_REQUIRED' }).fee).toBe(0);
  });

  it('derives RCC road and footpath lengths from Base measures and lets design lengths override them', () => {
    const estimate = estimateRccLengths({ authority: 'EAST_LOTHIAN' }, 1100, 300);
    expect(estimate.roadLengthM).toBe(200);
    expect(estimate.footpathLengthM).toBe(150);
    const review = calculateScottishRccFee({ authority: 'EAST_LOTHIAN' }, 1100, 300, 50);
    expect(review.applicationFee).toBe(525 + 100 * 37 + 100 * 21 + 150 * 6);
    expect(review.inspectionFee).toBeCloseTo(6 * 2 * 76.6);
    expect(review.status).toBe('BUDGET');
    const edited = calculateScottishRccFee({ authority: 'EAST_LOTHIAN', roadWidthM: 5, footpathWidthM: 2.5 }, 1100, 300, 50);
    expect(edited.applicationFee).toBe(525 + 100 * 37 + 120 * 21 + 120 * 6);
    const actual = calculateScottishRccFee({ authority: 'EAST_LOTHIAN', roadLengthM: 150, footpathLengthM: 40, inspectionHours: 2 }, 1100, 300, 50);
    expect(actual.applicationFee).toBe(525 + 100 * 37 + 50 * 21 + 40 * 6);
    expect(actual.status).toBe('CALCULATED');
  });

  it('budgets Perth & Kinross officer time from site roads without using another council consent tariff', () => {
    const review = calculateScottishRccFee({ authority: 'PERTH_KINROSS' }, 4169, 2612, 87);
    expect(review.status).toBe('BUDGET');
    expect(review.applicationFee).toBe(16 * 90);
    expect(review.inspectionFee).toBe(17 * 2 * 90);
    expect(review.fee).toBe(4500);
    expect(review.detail).toContain('QS budgets, not council tariffs');

    const kinross = createDefaultAppraisalOption('RESIDENTIAL_SALES', undefined, 'HOUSE_BUILDING');
    kinross.rccFees = { authority: 'PERTH_KINROSS' };
    kinross.siteDimensions = [
      { id: 'roads-area', category: 'ROADS', label: 'Roads', unit: 'm2', costDriver: 'ROADS_M2', isCostDriverInput: true, quantity: 4169, rate: 0, priceIndex: 0 },
      { id: 'paths-area', category: 'FOOTPATHS', label: 'Footways', unit: 'm2', costDriver: 'PATHS_M2', isCostDriverInput: true, quantity: 2612, rate: 0, priceIndex: 0 },
      { id: 'rcc-consent', category: 'OTHER', label: 'RCC consent', unit: 'sum', costDriver: 'RCC_FEES_FORMULA', libraryRateId: 'awd-prelims-rcc', quantity: 0, rate: 1, priceIndex: 233 },
      { id: 'rcc-inspections', category: 'OTHER', label: 'RCC inspections', unit: 'sum', costDriver: 'RCC_FEES_FORMULA', libraryRateId: 'awd-prelims-rcc-inspection', quantity: 0, rate: 1, priceIndex: 233 },
    ];
    expect(calculateSiteDimensionBaseTotal(kinross.siteDimensions[2], kinross)).toBe(1440);
    expect(calculateSiteDimensionBaseTotal(kinross.siteDimensions[3], kinross)).toBe(3060);
    expect(siteDimensionEffectivePriceIndex(kinross.siteDimensions[3], kinross)).toBe(0);

    const option = createDefaultAppraisalOption('RESIDENTIAL_SALES', undefined, 'HOUSE_BUILDING');
    option.rccFees = { authority: 'OTHER', otherAuthorityName: 'Scottish Borders' };
    option.siteDimensions = [
      { id: 'roads-area', category: 'ROADS', label: 'Roads', unit: 'm2', costDriver: 'ROADS_M2', isCostDriverInput: true, quantity: 5126, rate: 0, priceIndex: 0 },
      { id: 'rcc-consent', category: 'OTHER', label: 'RCC consent', unit: 'sum', costDriver: 'RCC_FEES_FORMULA', libraryRateId: 'awd-prelims-rcc', quantity: 0, rate: 1, priceIndex: 233 },
      { id: 'rcc-inspections', category: 'OTHER', label: 'RCC inspections', unit: 'sum', costDriver: 'RCC_FEES_FORMULA', libraryRateId: 'awd-prelims-rcc-inspection', quantity: 0, rate: 1, priceIndex: 0 },
    ];
    const consent = option.siteDimensions[1];
    const inspections = option.siteDimensions[2];
    expect(rccFeeReview(option).applicationFee).toBeGreaterThan(0);
    expect(rccFeeReview(option).inspectionFee).toBe(21 * 2 * 57.26);
    expect(calculateSiteDimensionBaseTotal(consent, option)).toBe(rccFeeReview(option).applicationFee);
    expect(calculateSiteDimensionBaseTotal(inspections, option)).toBe(2404.92);
    expect(siteDimensionEffectivePriceIndex(inspections, option)).toBe(0);
  });

  it('uses a disclosed multi-council inspection average when the local fee driver is unavailable', () => {
    const settings = { authority: 'OTHER' as const, otherAuthorityName: 'Aberdeenshire' };
    const benchmark = estimateRegionalRccBenchmark(settings, 1100, 300, 50);
    expect(benchmark.hourlyRate).toBeCloseTo((90 + 76.6 + 108.25 + 119.12 + 57.26) / 5);
    expect(benchmark.inspectionFee).toBeCloseTo(6 * 2 * benchmark.hourlyRate);
    const review = calculateScottishRccFee(settings, 1100, 300, 50);
    expect(review.status).toBe('BUDGET');
    expect(review.applicationFee).toBe(0);
    expect(review.inspectionFee).toBe(benchmark.inspectionFee);
    expect(review.detail).toContain('£21.66 per home');
    const bondBased = calculateScottishRccFee({ authority: 'OTHER', otherAuthorityName: 'Inverclyde' }, 1100, 300, 50);
    expect(bondBased.applicationFee).toBe(0);
    expect(bondBased.inspectionFee).toBe(benchmark.inspectionFee);
    expect(calculateScottishRccFee({ authority: 'OTHER', otherAuthorityName: 'Inverclyde', roadBondValue: 100000 }, 1100, 300, 50).inspectionFee).toBe(6450);
  });

  it('covers all 32 councils and distinguishes published one-off charges from provisional visit budgets', () => {
    expect(SCOTTISH_RCC_AUTHORITIES).toHaveLength(30);
    for (const otherAuthorityName of SCOTTISH_RCC_AUTHORITIES) {
      expect(RCC_AUTHORITY_STYLES[otherAuthorityName]).toBeTruthy();
      const review = calculateScottishRccFee({ authority: 'OTHER', otherAuthorityName }, 900);
      expect(Number.isFinite(review.fee)).toBe(true);
      expect(review.fee).toBeGreaterThanOrEqual(0);
      expect(['CALCULATED', 'BUDGET']).toContain(review.status);
    }
    const east = calculateScottishRccFee({ authority: 'OTHER', otherAuthorityName: 'East Ayrshire', roadBondValue: 120000 });
    expect(east.fee).toBe(5412);
    expect(east.status).toBe('CALCULATED');
    expect(east.inspectionFee).toBe(5412);
    expect(east.applicationFee).toBe(0);
    expect(calculateScottishRccFee({ authority: 'OTHER', otherAuthorityName: 'East Ayrshire', roadBondValue: 120000, manualInspectionFee: 6000 }).fee).toBe(6000);
    const highland = calculateScottishRccFee({ authority: 'OTHER', otherAuthorityName: 'Highland', roadConstructionCost: 200000 }, 900);
    expect(highland.applicationFee).toBe(5000);
    expect(highland.inspectionFee).toBe(1080);
    expect(highland.fee).toBe(6080);
    expect(calculateScottishRccFee({ authority: 'OTHER', otherAuthorityName: 'Highland', roadConstructionCost: 200000, manualApplicationFee: 4500 }, 900).fee).toBe(5580);
    const northLan = calculateScottishRccFee({ authority: 'OTHER', otherAuthorityName: 'North Lanarkshire', roadConstructionCost: 200000 });
    expect(northLan.fee).toBe(6994);
    const unknown = calculateScottishRccFee({ authority: 'OTHER', otherAuthorityName: 'Aberdeenshire' }, 900);
    expect(unknown.status).toBe('BUDGET');
    expect(unknown.inspectionFee).toBeCloseTo(12 * ((90 + 76.6 + 108.25 + 119.12 + 57.26) / 5), 2);
    expect(unknown.applicationFee).toBe(0);
    expect(calculateScottishRccFee({ authority: 'OTHER', otherAuthorityName: 'Aberdeenshire', inspectionVisits: 8, inspectionHoursPerVisit: 3, budgetHourlyRate: 100 }, 900).inspectionFee).toBe(2400);
    const borders = calculateScottishRccFee({ authority: 'OTHER', otherAuthorityName: 'Scottish Borders' }, 900);
    expect(borders.applicationFee).toBeCloseTo(525 + 100 * 37 + (900 / 5.5 - 100) * 21);
    expect(borders.detail).toContain('not a Scottish Borders charge');
    expect(borders.status).toBe('BUDGET');
    expect(calculateScottishRccFee({ authority: 'OTHER', otherAuthorityName: 'Scottish Borders', manualApplicationFee: 2500 }, 900).applicationFee).toBe(2500);
    const westDunbartonshire = calculateScottishRccFee({ authority: 'OTHER', otherAuthorityName: 'West Dunbartonshire', roadBondValue: 200000 }, 900);
    expect(westDunbartonshire.applicationFee).toBe(6000);
    expect(westDunbartonshire.inspectionFee).toBe(0);
    const renfrewshire = calculateScottishRccFee({ authority: 'OTHER', otherAuthorityName: 'Renfrewshire', roadConstructionCost: 200000 }, 900);
    expect(renfrewshire.inspectionFee).toBe(4000);
    expect(renfrewshire.applicationFee).toBe(0);
    expect(calculateScottishRccFee({ authority: 'OTHER', otherAuthorityName: 'West Dunbartonshire' }, 900, 0, 0, 200000).status).toBe('BUDGET');
  });

  it('preserves a saved RCC amount while unconfirmed, then replaces it without construction indexing', () => {
    const option = createDefaultAppraisalOption('RESIDENTIAL_SALES', undefined, 'HOUSE_BUILDING');
    option.siteDimensions = [
      { id: 'roads', category: 'ROADS', label: 'Roads', unit: 'm2', costDriver: 'ROADS_M2', isCostDriverInput: true, quantity: 1000, rate: 0, priceIndex: 0 },
      { id: 'rcc', category: 'OTHER', label: 'RCC', unit: 'sum', costDriver: 'RCC_FEES_FORMULA', libraryRateId: 'awd-prelims-rcc', quantity: 1, rate: 1, priceIndex: 233 },
    ];
    const saved = normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(option)), undefined, 'HOUSE_BUILDING');
    const row = saved.siteDimensions!.find(item => item.id === 'rcc')!;
    const inspectionRow = saved.siteDimensions!.find(item => item.libraryRateId === 'awd-prelims-rcc-inspection')!;
    expect(inspectionRow).toBeDefined();
    expect(calculateSiteDimensionBaseTotal(inspectionRow, saved)).toBe(0);
    expect(saved.rccFees).toEqual(expect.objectContaining({ authority: 'UNCONFIRMED', legacyAllowance: 6000 }));
    expect(calculateSiteDimensionBaseTotal(row, saved)).toBe(6000);
    expect(siteDimensionEffectivePriceIndex(row, saved)).toBe(233);
    saved.rccFees = { ...saved.rccFees!, authority: 'PERTH_KINROSS' };
    expect(rccFeeReview(saved).status).toBe('PROVISIONAL');
    expect(calculateSiteDimensionBaseTotal(row, saved)).toBe(6000);
    saved.rccFees.officerHours = 10;
    expect(calculateSiteDimensionBaseTotal(row, saved)).toBe(900);
    expect(calculateSiteDimensionBaseTotal(inspectionRow, saved)).toBe(1080);
    expect(siteDimensionEffectivePriceIndex(row, saved)).toBe(0);
    row.manualAdjustment = 50;
    saved.rccFees.authority = 'NOT_REQUIRED';
    expect(calculateSiteDimensionBaseTotal(row, saved)).toBe(0);
    expect(calculateSiteDimensionBaseTotal(inspectionRow, saved)).toBe(0);
    expect(calculateSiteDimensionTotal(row, saved)).toBe(0);
    expect(rccFeeReview(saved).fee).toBe(0);
    saved.rccFees.authority = 'PERTH_KINROSS';
    row.manualAdjustment = 0;
    const reopened = normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(saved)), undefined, 'HOUSE_BUILDING');
    expect(reopened.rccFees?.authority).toBe('PERTH_KINROSS');
    expect(reopened.rccFees?.officerHours).toBe(10);
    expect(calculateSiteDimensionBaseTotal(reopened.siteDimensions!.find(item => item.id === 'rcc')!, reopened)).toBe(900);
    expect(reopened.siteDimensions!.filter(item => item.libraryRateId === 'awd-prelims-rcc-inspection')).toHaveLength(1);
  });

  it('uses saved appraisal road and footpath areas for the East Lothian Prelims fee after reopen', () => {
    const option = createDefaultAppraisalOption('RESIDENTIAL_SALES', undefined, 'HOUSE_BUILDING');
    option.rccFees = { authority: 'EAST_LOTHIAN', roadWidthM: 5.5, footpathWidthM: 2 };
    option.siteDimensions = [
      { id: 'roads-area', category: 'ROADS', label: 'Roads', unit: 'm2', costDriver: 'ROADS_M2', isCostDriverInput: true, quantity: 1100, rate: 0, priceIndex: 0 },
      { id: 'paths-area', category: 'FOOTPATHS', label: 'Footways', unit: 'm2', costDriver: 'PATHS_M2', isCostDriverInput: true, quantity: 300, rate: 0, priceIndex: 0 },
      { id: 'rcc-consent', category: 'OTHER', label: 'RCC consent', unit: 'sum', costDriver: 'RCC_FEES_FORMULA', libraryRateId: 'awd-prelims-rcc', quantity: 1, rate: 1, priceIndex: 0 },
      { id: 'rcc-inspections', category: 'OTHER', label: 'RCC inspections', unit: 'sum', costDriver: 'RCC_FEES_FORMULA', libraryRateId: 'awd-prelims-rcc-inspection', quantity: 1, rate: 1, priceIndex: 0 },
    ];
    const restored = normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(option)), undefined, 'HOUSE_BUILDING');
    const review = rccFeeReview(restored);
    expect(review.applicationFee).toBe(525 + 100 * 37 + 100 * 21 + 150 * 6);
    expect(calculateSiteDimensionBaseTotal(restored.siteDimensions!.find(row => row.id === 'rcc-consent')!, restored)).toBe(review.applicationFee);
    expect(calculateSiteDimensionBaseTotal(restored.siteDimensions!.find(row => row.id === 'rcc-inspections')!, restored)).toBe(review.inspectionFee);
    expect(restored.rccFees?.roadWidthM).toBe(5.5);
  });
});
