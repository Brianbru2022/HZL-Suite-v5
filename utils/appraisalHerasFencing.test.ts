import { describe, expect, it } from 'vitest';
import {
  calculateSiteDimensionBaseTotal,
  createDefaultAppraisalOption,
  createDefaultSiteDimensionRows,
  createSiteDimensionRowFromRate,
  herasFencingLinePresentation,
  herasFencingReview,
  normalizeDevelopmentAppraisalOption,
} from './appraisal';
import { calculateHerasFencingPurchase, HERAS_FENCING_ROW_ID } from './appraisalHerasFencing';
import { createAwdPrelimsRatePack } from './appraisalInfrastructureRatePacks';

describe('site-specific Heras fencing purchase', () => {
  it('uses perimeter-based bays and buys half the required allowance by default', () => {
    const review = calculateHerasFencingPurchase(49_691);
    expect(review.perimeterM).toBeCloseTo(1_000, -1);
    expect(review.bayCount).toBe(329);
    expect(review.fullPurchaseCost).toBe(19_674);
    expect(review.newPurchaseCost).toBe(9_837);
    expect(review.effectiveRatePerM2).toBeCloseTo(0.198, 3);
    expect(calculateHerasFencingPurchase(2_500).effectiveRatePerM2).toBeGreaterThan(review.effectiveRatePerM2);
    const coupar = calculateHerasFencingPurchase(4_033);
    expect(coupar.bayCount).toBe(94);
    expect(coupar.newPurchaseCost).toBe(3_257);
    expect(coupar.effectiveRatePerM2).toBeCloseTo(0.808, 3);
  });

  it('uses measured boundaries, credits secure sections, and retains the assumptions on reopening', () => {
    const siteRows = createDefaultSiteDimensionRows();
    const siteArea = siteRows.find(row => row.isCostDriverInput && row.costDriver === 'SITE_AREA_M2')!;
    siteArea.quantity = 49_691;
    const row = createSiteDimensionRowFromRate(createAwdPrelimsRatePack().find(rate => rate.id === HERAS_FENCING_ROW_ID)!);
    const option = createDefaultAppraisalOption('RESIDENTIAL_SALES');
    option.siteDimensions = [...siteRows, row];
    option.herasFencingAssumptions = {
      measuredPerimeterM: 1_200,
      secureBoundaryM: 200,
      internalFencingPercent: 15,
      existingStockPercent: 50,
    };
    const review = herasFencingReview(option);
    expect(review.externalFencingM).toBe(1_000);
    expect(review.internalFencingM).toBe(180);
    expect(review.bayCount).toBe(338);
    expect(calculateSiteDimensionBaseTotal(row, option)).toBe(review.newPurchaseCost);
    const presentation = herasFencingLinePresentation(row, option)!;
    expect(presentation.quantity * presentation.rate).toBe(review.newPurchaseCost);

    const reopened = normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(option)));
    expect(reopened.herasFencingAssumptions).toEqual(option.herasFencingAssumptions);
    expect(herasFencingReview(reopened).newPurchaseCost).toBe(review.newPurchaseCost);
  });

  it('charges no purchase when all required stock is already available', () => {
    const review = calculateHerasFencingPurchase(49_691, {
      secureBoundaryM: 0,
      internalFencingPercent: 15,
      existingStockPercent: 100,
    });
    expect(review.fullPurchaseCost).toBeGreaterThan(0);
    expect(review.newPurchaseCost).toBe(0);
  });
});
