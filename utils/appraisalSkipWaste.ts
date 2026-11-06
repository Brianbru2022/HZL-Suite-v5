import type { AppraisalHouseTypeScheduleRow, AppraisalSkipWasteAssumptions, DevelopmentAppraisalOption } from '../types';

export const SKIP_WASTE_ROW_IDS = {
  loads: 'awd-prelims-skips',
  segregationHandling: 'awd-prelims-skip-segregation-handling',
  segregationSetup: 'awd-prelims-skip-segregation-setup',
} as const;

const DEFAULTS: AppraisalSkipWasteAssumptions = {
  centralCollection: true,
  mixedRatePerLoad: 325,
  segregatedCollection: false,
  segregatedRatePerLoad: 275,
  segregationHandlingPerDwelling: 50,
  segregationSetupCost: 500,
  notes: '',
};

function nonNegative(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function normalizeSkipWasteAssumptions(value: unknown): AppraisalSkipWasteAssumptions {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Partial<AppraisalSkipWasteAssumptions> : {};
  return {
    centralCollection: source.centralCollection !== false,
    mixedRatePerLoad: nonNegative(source.mixedRatePerLoad, DEFAULTS.mixedRatePerLoad),
    segregatedCollection: source.segregatedCollection === true,
    segregatedRatePerLoad: nonNegative(source.segregatedRatePerLoad, DEFAULTS.segregatedRatePerLoad),
    segregationHandlingPerDwelling: nonNegative(source.segregationHandlingPerDwelling, DEFAULTS.segregationHandlingPerDwelling),
    segregationSetupCost: nonNegative(source.segregationSetupCost, DEFAULTS.segregationSetupCost),
    notes: typeof source.notes === 'string' ? source.notes : '',
  };
}

export function skipLoadsForArea(areaM2: number): { loads: number; calculationAreaM2?: number; reviewReason?: string } {
  if (!Number.isFinite(areaM2) || areaM2 <= 0) return { loads: 4, reviewReason: 'GIFA missing; four loads used provisionally.' };
  const calculationAreaM2 = Math.max(70, areaM2);
  if (calculationAreaM2 < 90) return { loads: 3, calculationAreaM2 };
  if (calculationAreaM2 < 130) return { loads: 4, calculationAreaM2 };
  if (calculationAreaM2 < 155) return { loads: 5, calculationAreaM2 };
  if (calculationAreaM2 <= 180) return { loads: 6, calculationAreaM2 };
  return { loads: 6, calculationAreaM2, reviewReason: 'Above the 130–180 m² source range; check the allowance.' };
}

export function skipWasteReview(option: Pick<DevelopmentAppraisalOption, 'houseTypeSchedule' | 'skipWasteAssumptions'>) {
  const assumptions = normalizeSkipWasteAssumptions(option.skipWasteAssumptions);
  const houseTypes = (option.houseTypeSchedule || [])
    .filter(row => nonNegative(row.quantity, 0) > 0)
    .map((row: AppraisalHouseTypeScheduleRow) => {
      const area = skipLoadsForArea(row.gifaM2);
      const override = row.skipLoadsPerDwelling;
      const loadsPerDwelling = nonNegative(override, area.loads);
      const dwellings = nonNegative(row.quantity, 0);
      return {
        id: row.id, name: row.houseTypeName, areaM2: nonNegative(row.gifaM2, 0), calculationAreaM2: area.calculationAreaM2, dwellings,
        calculatedLoadsPerDwelling: area.loads, loadsPerDwelling,
        override: typeof override === 'number' && Number.isFinite(override) && override >= 0,
        reviewReason: area.reviewReason,
        equivalentLoads: dwellings * loadsPerDwelling,
      };
    });
  const dwellings = houseTypes.reduce((sum, row) => sum + row.dwellings, 0);
  const equivalentLoads = houseTypes.reduce((sum, row) => sum + row.equivalentLoads, 0);
  const activeLoads = assumptions.centralCollection ? equivalentLoads : 0;
  const ratePerLoad = assumptions.segregatedCollection ? assumptions.segregatedRatePerLoad : assumptions.mixedRatePerLoad;
  const loadCost = activeLoads * ratePerLoad;
  const handlingCost = assumptions.centralCollection && assumptions.segregatedCollection ? dwellings * assumptions.segregationHandlingPerDwelling : 0;
  const setupCost = assumptions.centralCollection && assumptions.segregatedCollection && dwellings > 0 ? assumptions.segregationSetupCost : 0;
  return {
    assumptions, houseTypes, dwellings, equivalentLoads, activeLoads, ratePerLoad,
    loadCost, handlingCost, setupCost, total: loadCost + handlingCost + setupCost,
    mixedComparison: assumptions.centralCollection ? equivalentLoads * assumptions.mixedRatePerLoad : 0,
    reviewCount: houseTypes.filter(row => !!row.reviewReason && !row.override).length,
  };
}
