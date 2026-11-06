import type { AppraisalSiloGeneratorAssumptions } from '../types';

export const SILO_GENERATOR_ROW_ID = 'awd-prelims-silo-generator';
export const SILO_GENERATOR_FUEL_ROW_ID = 'awd-prelims-silo-generator-fuel';

export const DEFAULT_SILO_GENERATOR_ASSUMPTIONS: AppraisalSiloGeneratorAssumptions = {
  activePercent: 75,
  readyToUsePurchaseCost: 9000,
  residualValue: 4000,
  productiveReuseMonths: 24,
  // £5,000 net capital / 24 productive months + £325 other ownership costs
  // = £533.33/active month, or £400/construction month at 75% use.
  ownershipMonthlyOtherCost: 325,
  hirePerActiveMonth: 1200,
  costBasisVersion: 2,
};

const LEGACY_OWNERSHIP_MONTHLY_COST = (24 * 400 - 5000) / (24 * 0.75);

const nonnegative = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : fallback;

const optionalNonnegative = (value: unknown): number | undefined =>
  value === undefined || value === null ? undefined : nonnegative(value, 0);

export function normalizeSiloGeneratorAssumptions(value: unknown): AppraisalSiloGeneratorAssumptions {
  const source = value && typeof value === 'object' ? value as Partial<AppraisalSiloGeneratorAssumptions> : {};
  const readyToUsePurchaseCost = nonnegative(source.readyToUsePurchaseCost, 9000);
  const savedOtherCost = nonnegative(source.ownershipMonthlyOtherCost, DEFAULT_SILO_GENERATOR_ASSUMPTIONS.ownershipMonthlyOtherCost);
  return {
    constructionMonths: optionalNonnegative(source.constructionMonths),
    activeMortarMonths: optionalNonnegative(source.activeMortarMonths),
    suitableMainsFromSiteMonth: optionalNonnegative(source.suitableMainsFromSiteMonth),
    activePercent: Math.min(100, nonnegative(source.activePercent, 75)),
    readyToUsePurchaseCost,
    residualValue: Math.min(readyToUsePurchaseCost, nonnegative(source.residualValue, 4000)),
    productiveReuseMonths: Math.max(1, nonnegative(source.productiveReuseMonths, 24)),
    ownershipMonthlyOtherCost: source.costBasisVersion !== 2 && Math.abs(savedOtherCost - LEGACY_OWNERSHIP_MONTHLY_COST) < 0.01
      ? DEFAULT_SILO_GENERATOR_ASSUMPTIONS.ownershipMonthlyOtherCost : savedOtherCost,
    hirePerActiveMonth: nonnegative(source.hirePerActiveMonth, 1200),
    costBasisVersion: 2,
  };
}

export function calculateSiloGeneratorReview(args: {
  dwellings: number;
  buildRateUnitsPerMonth: number;
  programmeMonths: number;
  leadInMonths: number;
  longestHouseBuildMonths: number;
  fuelPerActiveMonth: number;
  assumptions?: AppraisalSiloGeneratorAssumptions;
  legacyPurchaseCostBasis?: boolean;
}) {
  const a = normalizeSiloGeneratorAssumptions(args.assumptions);
  const dwellings = Math.max(0, Math.floor(args.dwellings));
  const leadInMonths = Math.max(0, args.leadInMonths);
  const availableMonths = Math.max(0, args.programmeMonths - leadInMonths);
  const buildRate = Math.max(0, args.buildRateUnitsPerMonth);
  const inferredFromOutput = dwellings > 0 && buildRate > 0 ? Math.ceil(dwellings / buildRate) : 0;
  const constructionMonths = a.constructionMonths ?? (dwellings > 0
    ? Math.min(availableMonths || Infinity, Math.max(inferredFromOutput, args.longestHouseBuildMonths, buildRate > 0 ? 0 : availableMonths))
    : 0);
  const provisionalMortarMonths = a.activeMortarMonths ?? constructionMonths * a.activePercent / 100;
  const generatorMonthsBeforeMains = a.suitableMainsFromSiteMonth === undefined
    ? Infinity : Math.max(0, a.suitableMainsFromSiteMonth - leadInMonths);
  const activeGeneratorMonths = Math.max(0, Math.min(constructionMonths, provisionalMortarMonths, generatorMonthsBeforeMains));
  const netCapitalCost = Math.max(0, a.readyToUsePurchaseCost - a.residualValue);
  const productiveReuseMonths = Math.max(1, a.productiveReuseMonths ?? 24);
  const capitalAllocationPerActiveMonth = netCapitalCost / productiveReuseMonths;
  const ownershipOtherCostPerActiveMonth = args.legacyPurchaseCostBasis
    ? nonnegative(args.assumptions?.ownershipMonthlyOtherCost, LEGACY_OWNERSHIP_MONTHLY_COST)
    : a.ownershipMonthlyOtherCost;
  const purchaseCost = activeGeneratorMonths > 0
    ? args.legacyPurchaseCostBasis
      ? netCapitalCost + ownershipOtherCostPerActiveMonth * activeGeneratorMonths
      : capitalAllocationPerActiveMonth * Math.min(activeGeneratorMonths, productiveReuseMonths)
        + ownershipOtherCostPerActiveMonth * activeGeneratorMonths
    : 0;
  const hireCost = a.hirePerActiveMonth * activeGeneratorMonths;
  const route = activeGeneratorMonths <= 0 ? 'NONE' : purchaseCost <= hireCost ? 'PURCHASE' : 'HIRE';
  const selectedCost = route === 'PURCHASE' ? purchaseCost : route === 'HIRE' ? hireCost : 0;
  const fuelCost = activeGeneratorMonths * Math.max(0, args.fuelPerActiveMonth);
  return {
    assumptions: args.legacyPurchaseCostBasis
      ? { ...a, ownershipMonthlyOtherCost: ownershipOtherCostPerActiveMonth, costBasisVersion: undefined }
      : a,
    dwellings, buildRate, inferredFromOutput, availableMonths, constructionMonths,
    provisionalMortarMonths,
    activeGeneratorMonths, generatorMonthsBeforeMains, netCapitalCost, productiveReuseMonths,
    capitalAllocationPerActiveMonth, ownershipOtherCostPerActiveMonth,
    legacyPurchaseCostBasis: args.legacyPurchaseCostBasis === true, purchaseCost, hireCost,
    route, selectedCost, fuelCost, totalWithFuel: selectedCost + fuelCost,
  };
}
