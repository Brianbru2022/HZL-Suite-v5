import { describe, expect, it } from 'vitest';
import { calculateSiteDimensionBaseTotal, createDefaultAppraisalOption, createManualHouseTypeScheduleRow, createSiteDimensionRowFromRate, normalizeDevelopmentAppraisalOption, resolveSiteDimensionQuantity } from './appraisal';
import { createAwdPrelimsRatePack } from './appraisalInfrastructureRatePacks';
import { SKIP_WASTE_ROW_IDS, skipLoadsForArea, skipWasteReview } from './appraisalSkipWaste';
import { buildAppraisalQualityChecks } from './appraisalQualityChecks';

const pack = createAwdPrelimsRatePack();
const billRow = (id: string) => createSiteDimensionRowFromRate(pack.find(item => item.id === id)!);
const find = (option: ReturnType<typeof createDefaultAppraisalOption>, id: string) => option.siteDimensions!.find(row => row.libraryRateId === id)!;

describe('house-type-based construction skip waste', () => {
  it('uses a 70 m² calculation floor and flags missing or oversized areas', () => {
    expect([80, 90, 120, 130, 150, 155, 180].map(area => skipLoadsForArea(area).loads)).toEqual([3, 4, 4, 5, 5, 6, 6]);
    expect(skipLoadsForArea(0)).toMatchObject({ loads: 4, reviewReason: expect.any(String) });
    expect(skipLoadsForArea(60)).toMatchObject({ loads: 3, calculationAreaM2: 70 });
    expect(skipLoadsForArea(60).reviewReason).toBeUndefined();
    expect(skipLoadsForArea(190).reviewReason).toBeTruthy();
  });

  it('uses the 70 m² floor for Helensfield-sized homes without a report warning', () => {
    const option = normalizeDevelopmentAppraisalOption({
      ...createDefaultAppraisalOption('RESIDENTIAL_SALES'),
      houseTypeSchedule: [createManualHouseTypeScheduleRow({ houseTypeName: 'A2-4', gifaM2: 69, quantity: 4 })],
      siteDimensions: [billRow(SKIP_WASTE_ROW_IDS.loads)],
    });
    const review = skipWasteReview(option);
    expect(review.houseTypes[0]).toMatchObject({ areaM2: 69, calculationAreaM2: 70, calculatedLoadsPerDwelling: 3 });
    expect(review.total).toBe(4 * 3 * 325);
    expect(buildAppraisalQualityChecks(option).some(check => check.id === 'skip-waste-size-review')).toBe(false);
  });

  it('uses construction counts, migrates a legacy £1,400-per-home row, and persists per-type overrides', () => {
    const small = createManualHouseTypeScheduleRow({ houseTypeName: 'Small', gifaM2: 80, quantity: 2, separateSalesQuantity: true, salesQuantity: 1 });
    const typical = createManualHouseTypeScheduleRow({ houseTypeName: 'Typical', gifaM2: 110, quantity: 3 });
    const large = createManualHouseTypeScheduleRow({ houseTypeName: 'Large', gifaM2: 145, quantity: 1, skipLoadsPerDwelling: 6 });
    const legacy = { ...billRow(SKIP_WASTE_ROW_IDS.loads), label: 'Skips', rate: 1400 };
    const option = normalizeDevelopmentAppraisalOption({
      ...createDefaultAppraisalOption('RESIDENTIAL_SALES'),
      houseTypeSchedule: [small, typical, large], siteDimensions: [legacy],
    });
    const review = skipWasteReview(option);
    expect(review.dwellings).toBe(6);
    expect(review.equivalentLoads).toBe(2 * 3 + 3 * 4 + 1 * 6);
    expect(review.total).toBe(24 * 325);
    expect(find(option, SKIP_WASTE_ROW_IDS.loads)).toMatchObject({ id: legacy.id, rate: 325, unit: 'nr' });
    expect(resolveSiteDimensionQuantity(find(option, SKIP_WASTE_ROW_IDS.loads), option)).toBe(24);
    expect(calculateSiteDimensionBaseTotal(find(option, SKIP_WASTE_ROW_IDS.loads), option)).toBe(7800);
    expect(calculateSiteDimensionBaseTotal(find(option, SKIP_WASTE_ROW_IDS.segregationHandling), option)).toBe(0);
    expect(calculateSiteDimensionBaseTotal(find(option, SKIP_WASTE_ROW_IDS.segregationSetup), option)).toBe(0);
    const reopened = normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(option)));
    expect(reopened.houseTypeSchedule![2].skipLoadsPerDwelling).toBe(6);
    expect(reopened.siteDimensions!.filter(row => row.libraryRateId === SKIP_WASTE_ROW_IDS.loads)).toHaveLength(1);
    expect(reopened.siteDimensions!.filter(row => row.libraryRateId === SKIP_WASTE_ROW_IDS.segregationHandling)).toHaveLength(1);
    expect(reopened.siteDimensions!.filter(row => row.libraryRateId === SKIP_WASTE_ROW_IDS.segregationSetup)).toHaveLength(1);
  });

  it('models the optional segregated example without adding handling or setup twice', () => {
    const base = createDefaultAppraisalOption('RESIDENTIAL_SALES');
    const option = normalizeDevelopmentAppraisalOption({
      ...base,
      houseTypeSchedule: [createManualHouseTypeScheduleRow({ gifaM2: 110, quantity: 20 })],
      siteDimensions: [billRow(SKIP_WASTE_ROW_IDS.loads)],
      skipWasteAssumptions: { centralCollection: true, mixedRatePerLoad: 325, segregatedCollection: true, segregatedRatePerLoad: 275, segregationHandlingPerDwelling: 50, segregationSetupCost: 500 },
    });
    const review = skipWasteReview(option);
    expect(review.equivalentLoads).toBe(80);
    expect(review.mixedComparison).toBe(26000);
    expect(review.loadCost).toBe(22000);
    expect(review.handlingCost).toBe(1000);
    expect(review.setupCost).toBe(500);
    expect(review.total).toBe(23500);
    expect([SKIP_WASTE_ROW_IDS.loads, SKIP_WASTE_ROW_IDS.segregationHandling, SKIP_WASTE_ROW_IDS.segregationSetup]
      .reduce((sum, id) => sum + calculateSiteDimensionBaseTotal(find(option, id), option), 0)).toBe(23500);
    const tradeIncluded = { ...option, skipWasteAssumptions: { ...option.skipWasteAssumptions!, centralCollection: false } };
    expect(skipWasteReview(tradeIncluded).total).toBe(0);
  });

  it('flags unclassified floor areas and unevidenced segregated rates for review', () => {
    const option = normalizeDevelopmentAppraisalOption({
      ...createDefaultAppraisalOption('RESIDENTIAL_SALES'),
      houseTypeSchedule: [createManualHouseTypeScheduleRow({ gifaM2: 190, quantity: 1 })],
      siteDimensions: [billRow(SKIP_WASTE_ROW_IDS.loads)],
      skipWasteAssumptions: { centralCollection: true, mixedRatePerLoad: 325, segregatedCollection: true, segregatedRatePerLoad: 275, segregationHandlingPerDwelling: 50, segregationSetupCost: 500 },
    });
    const ids = buildAppraisalQualityChecks(option).map(check => check.id);
    expect(ids).toContain('skip-waste-size-review');
    expect(ids).toContain('skip-waste-segregation-evidence');
  });

  it('allows a house type already covered by trade disposal to contribute no central loads', () => {
    const option = normalizeDevelopmentAppraisalOption({
      ...createDefaultAppraisalOption('RESIDENTIAL_SALES'),
      houseTypeSchedule: [createManualHouseTypeScheduleRow({ gifaM2: 110, quantity: 4, skipLoadsPerDwelling: 0 })],
      siteDimensions: [billRow(SKIP_WASTE_ROW_IDS.loads)],
    });
    expect(skipWasteReview(option).equivalentLoads).toBe(0);
    expect(calculateSiteDimensionBaseTotal(find(option, SKIP_WASTE_ROW_IDS.loads), option)).toBe(0);
    expect(normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(option))).houseTypeSchedule![0].skipLoadsPerDwelling).toBe(0);
  });
});
