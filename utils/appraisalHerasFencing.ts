import type { AppraisalHerasFencingAssumptions } from '../types';

export const HERAS_FENCING_ROW_ID = 'awd-prelims-heras-fencing';

export const DEFAULT_HERAS_FENCING_ASSUMPTIONS: AppraisalHerasFencingAssumptions = {
  secureBoundaryM: 0,
  internalFencingPercent: 15,
  existingStockPercent: 50,
};

const nonnegative = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : fallback;

export function normalizeHerasFencingAssumptions(value: unknown): AppraisalHerasFencingAssumptions {
  const source = value && typeof value === 'object' ? value as Partial<AppraisalHerasFencingAssumptions> : {};
  return {
    measuredPerimeterM: source.measuredPerimeterM === undefined || source.measuredPerimeterM === null
      ? undefined : nonnegative(source.measuredPerimeterM, 0),
    secureBoundaryM: nonnegative(source.secureBoundaryM, 0),
    internalFencingPercent: Math.min(100, nonnegative(source.internalFencingPercent, 15)),
    existingStockPercent: Math.min(100, nonnegative(source.existingStockPercent, 50)),
  };
}

export function calculateHerasFencingPurchase(siteAreaM2: number, value?: AppraisalHerasFencingAssumptions) {
  const assumptions = normalizeHerasFencingAssumptions(value);
  const area = Math.max(0, siteAreaM2);
  // A square boundary adjusted by 12% for a less compact site gives about 1,000 m at 49,691 m².
  const inferredPerimeterM = area > 0 ? 4 * Math.sqrt(area) * 1.12 : 0;
  const perimeterM = assumptions.measuredPerimeterM ?? inferredPerimeterM;
  const externalFencingM = Math.max(0, perimeterM - Math.min(perimeterM, assumptions.secureBoundaryM));
  const internalFencingM = perimeterM * assumptions.internalFencingPercent / 100;
  const requiredFencingM = externalFencingM + internalFencingM;
  const bayCount = Math.ceil(requiredFencingM / 3.5);
  const completeBaysCost = bayCount * 45;
  const bracingBallastSparesCost = bayCount * 11;
  const gatesDeliveryCost = bayCount > 0 ? 1250 : 0;
  const fullPurchaseCost = completeBaysCost + bracingBallastSparesCost + gatesDeliveryCost;
  const newPurchasePercent = 100 - assumptions.existingStockPercent;
  const newPurchaseCost = fullPurchaseCost * newPurchasePercent / 100;
  return {
    siteAreaM2: area,
    inferredPerimeterM,
    perimeterM,
    externalFencingM,
    internalFencingM,
    requiredFencingM,
    bayCount,
    completeBaysCost,
    bracingBallastSparesCost,
    gatesDeliveryCost,
    fullPurchaseCost,
    existingStockPercent: assumptions.existingStockPercent,
    newPurchasePercent,
    newPurchaseCost,
    effectiveRatePerM2: area > 0 ? newPurchaseCost / area : 0,
    isPerimeterMeasured: assumptions.measuredPerimeterM !== undefined,
  };
}
