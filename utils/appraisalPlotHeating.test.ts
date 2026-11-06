import { describe, expect, it } from 'vitest';
import { calculateSiteDimensionBaseTotal, createDefaultAppraisalOption, createManualHouseTypeScheduleRow, createSiteDimensionRowFromRate, normalizeDevelopmentAppraisalOption } from './appraisal';
import { createAwdPrelimsRatePack } from './appraisalInfrastructureRatePacks';
import { PLOT_HEATING_ROW_IDS, plotHeatingReview } from './appraisalPlotHeating';

const pack = createAwdPrelimsRatePack();
const row = (id: string) => createSiteDimensionRowFromRate(pack.find(item => item.id === id)!);

describe('site-specific plot-heating allowance', () => {
  it('replaces the old £9,000 line, selects a cheaper equipment strategy and separates electricity', () => {
    const legacy = { ...row(PLOT_HEATING_ROW_IDS.purchase), label: 'Heaters', unit: 'sum' as const, rate: 9000 };
    const option = normalizeDevelopmentAppraisalOption({
      ...createDefaultAppraisalOption('RESIDENTIAL_SALES'),
      programme: { expectedStartDate: '2026-10-01', leadInMonths: 1 },
      houseTypeSchedule: [createManualHouseTypeScheduleRow({ quantity: 48, separateSalesQuantity: true, salesQuantity: 40, buildPeriodMonths: 12 })],
      siteDimensions: [legacy],
    });
    const review = plotHeatingReview(option);
    expect(review.dwellings).toBe(48);
    expect(review.buildRate).toBe(4);
    expect(review.provisional).toBe(false);
    expect(review.peakHeaters).toBeGreaterThan(0);
    expect(review.electricityKwh).toBeGreaterThan(0);
    expect(review.purchaseCost + review.hireCost).toBeLessThanOrEqual(review.hireAllComparison);
    expect(review.purchaseCost + review.hireCost).toBeLessThanOrEqual(review.buyAllComparison);
    const ids = Object.values(PLOT_HEATING_ROW_IDS);
    expect(ids.map(id => option.siteDimensions!.filter(item => item.libraryRateId === id).length)).toEqual([1, 1, 1]);
    expect(option.siteDimensions!.find(item => item.libraryRateId === PLOT_HEATING_ROW_IDS.purchase)).toMatchObject({ id: legacy.id, rate: 200, unit: 'nr' });
    expect(ids.reduce((sum, id) => sum + calculateSiteDimensionBaseTotal(option.siteDimensions!.find(item => item.libraryRateId === id)!, option), 0)).toBe(review.total);
    const reopened = normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(option)));
    expect(ids.map(id => reopened.siteDimensions!.filter(item => item.libraryRateId === id).length)).toEqual([1, 1, 1]);
  });

  it('uses programme date and lead-in, so a summer build has no winter plot-heating cost', () => {
    const base = createDefaultAppraisalOption('RESIDENTIAL_SALES');
    const winter = { ...base, programme: { expectedStartDate: '2026-11-01', leadInMonths: 0 }, houseTypeSchedule: [createManualHouseTypeScheduleRow({ quantity: 8, buildPeriodMonths: 2 })] };
    const summer = { ...winter, programme: { expectedStartDate: '2026-05-01', leadInMonths: 0 } };
    expect(plotHeatingReview(winter).electricityCost).toBeGreaterThan(0);
    expect(plotHeatingReview(summer).total).toBe(0);
    const delayed = { ...winter, programme: { expectedStartDate: '2026-09-01', leadInMonths: 2 } };
    expect(plotHeatingReview(delayed).electricityCost).toBe(plotHeatingReview(winter).electricityCost);
  });

  it('phases 106 homes across the site programme instead of finishing them within one house build period', () => {
    const option = {
      ...createDefaultAppraisalOption('RESIDENTIAL_SALES'),
      programme: { expectedStartDate: '2027-11-01', leadInMonths: 6, saleRateUnitsPerMonth: 2 },
      houseTypeSchedule: [createManualHouseTypeScheduleRow({ quantity: 106, buildPeriodMonths: 4 })],
    };
    const review = plotHeatingReview(option);
    expect(review.buildMonths).toBe(57);
    expect(review.dwellings).toBe(106);
    expect(review.peakHeaters).toBeGreaterThan(0);
    expect(review.purchaseFleet + review.hireHeaterWeeks).toBeGreaterThan(0);
    expect(review.electricityKwh).toBeGreaterThan(0);
  });

  it('uses a visible provisional winter share until a start date is entered and responds to quoted hire rates', () => {
    const base = createDefaultAppraisalOption('RESIDENTIAL_SALES');
    const option = { ...base, houseTypeSchedule: [createManualHouseTypeScheduleRow({ quantity: 60, buildPeriodMonths: 12 })] };
    const defaultReview = plotHeatingReview(option);
    expect(defaultReview.provisional).toBe(true);
    expect(defaultReview.electricityCost).toBeGreaterThan(0);
    const cheapHire = { ...option, plotHeatingAssumptions: { ...defaultReview.assumptions, hirePerHeaterWeek: 1 } };
    expect(plotHeatingReview(cheapHire).purchaseFleet).toBe(0);
    expect(plotHeatingReview(cheapHire).hireHeaterWeeks).toBeGreaterThan(0);
  });
});
