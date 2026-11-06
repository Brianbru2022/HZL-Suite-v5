import type { AppraisalScottishWaterFees } from '../types';

// Scottish Water, Your Charges Explained 2026/27, pp. 15, 17-19.
export const SCOTTISH_WATER_2026 = {
  infrastructureWaterPerDwelling: 549.4,
  infrastructureWastewaterPerDwelling: 549.4,
  buildingWaterFlat: 187,
  buildingWaterSemiTerraced: 231,
  buildingWaterDetached: 296,
  buildingWaterUnclassifiedAverage: (187 + 231 + 296) / 3,
  application: 113.7,
  standardWaterConnection: 487,
  onsiteInspectionFirstHour: 155.8,
  desktopInspection: 50.6,
  // Reasonable Cost Contributions: Dwellings, 1 April 2026–31 March 2027.
  maximumWaterContributionPerDwelling: 2431.54,
  maximumWastewaterContributionPerDwelling: 2821.45,
  provisionalRebateFraction: 0.5,
} as const;

const count = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
const amount = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;

export function normalizeScottishWaterFees(value: unknown): AppraisalScottishWaterFees | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const input = value as Record<string, unknown>;
  return {
    waterDwellings: input.waterDwellings === undefined ? undefined : count(input.waterDwellings),
    wastewaterDwellings: input.wastewaterDwellings === undefined ? undefined : count(input.wastewaterDwellings),
    buildingWaterFlatHomes: input.buildingWaterFlatHomes === undefined ? undefined : count(input.buildingWaterFlatHomes),
    buildingWaterSemiTerracedHomes: input.buildingWaterSemiTerracedHomes === undefined ? undefined : count(input.buildingWaterSemiTerracedHomes),
    buildingWaterDetachedHomes: input.buildingWaterDetachedHomes === undefined ? undefined : count(input.buildingWaterDetachedHomes),
    contributionBasis: input.contributionBasis === 'AGREED' || input.contributionBasis === 'BUDGET' || input.contributionBasis === 'NONE'
      ? input.contributionBasis : 'DEFAULT_50_PERCENT',
    eligibleWaterWorksCost: amount(input.eligibleWaterWorksCost),
    eligibleWastewaterWorksCost: amount(input.eligibleWastewaterWorksCost),
    waterContribution: amount(input.waterContribution),
    wastewaterContribution: amount(input.wastewaterContribution),
    standardWaterConnections: input.standardWaterConnections === undefined ? undefined : count(input.standardWaterConnections),
    applicationCount: input.applicationCount === undefined ? undefined : count(input.applicationCount),
    waterInspections: input.waterInspections === undefined ? undefined : count(input.waterInspections),
    wastewaterInspections: input.wastewaterInspections === undefined ? undefined : count(input.wastewaterInspections),
    inspectionMethod: input.inspectionMethod === 'DESKTOP' ? 'DESKTOP' : 'ONSITE',
    quotedAdditionalConnectionCost: amount(input.quotedAdditionalConnectionCost),
    quotedWastewaterConnectionCost: amount(input.quotedWastewaterConnectionCost),
    note: typeof input.note === 'string' ? input.note : '',
  };
}

export function calculateScottishWaterFees2026(totalDwellings: number, settings?: AppraisalScottishWaterFees,
  derivedMix?: { flats: number; semiTerraced: number; detached: number; unclassified?: number }) {
  const dwellings = count(totalDwellings);
  const waterDwellings = count(settings?.waterDwellings, dwellings);
  const wastewaterDwellings = count(settings?.wastewaterDwellings, dwellings);
  // House Types is authoritative when supplied. Saved counts from an earlier
  // appraisal must not freeze the building-water mix after the schedule changes.
  const flatHomes = count(derivedMix?.flats ?? settings?.buildingWaterFlatHomes);
  const semiTerracedHomes = count(derivedMix?.semiTerraced ?? settings?.buildingWaterSemiTerracedHomes);
  const detachedHomes = count(derivedMix?.detached ?? settings?.buildingWaterDetachedHomes);
  const unclassifiedHomes = count(derivedMix?.unclassified,
    Math.max(0, dwellings - flatHomes - semiTerracedHomes - detachedHomes));
  // Fresh-water infrastructure and physical water connections are included in
  // the separate services allowance. Building water and inspections are fees.
  const waterInfrastructureCharges = 0;
  const wastewaterInfrastructureCharges = wastewaterDwellings * SCOTTISH_WATER_2026.infrastructureWastewaterPerDwelling;
  const infrastructureCharges = wastewaterInfrastructureCharges;
  const buildingWaterCharges = flatHomes * SCOTTISH_WATER_2026.buildingWaterFlat
    + semiTerracedHomes * SCOTTISH_WATER_2026.buildingWaterSemiTerraced
    + detachedHomes * SCOTTISH_WATER_2026.buildingWaterDetached
    + unclassifiedHomes * SCOTTISH_WATER_2026.buildingWaterUnclassifiedAverage;
  const waterCharges = buildingWaterCharges;
  const wastewaterCharges = wastewaterInfrastructureCharges;
  const charges = waterCharges + wastewaterCharges;
  const waterCap = 0;
  const wastewaterCap = wastewaterDwellings * SCOTTISH_WATER_2026.maximumWastewaterContributionPerDwelling;
  const contributionBasis = settings?.contributionBasis || 'DEFAULT_50_PERCENT';
  const eligibleWaterWorksCost = amount(settings?.eligibleWaterWorksCost);
  const eligibleWastewaterWorksCost = amount(settings?.eligibleWastewaterWorksCost);
  const siteSpecificContribution = contributionBasis === 'BUDGET' || contributionBasis === 'AGREED';
  const waterContribution = 0;
  const wastewaterContribution = siteSpecificContribution ? Math.min(amount(settings?.wastewaterContribution), eligibleWastewaterWorksCost, wastewaterCap) : 0;
  const waterRebate = 0;
  const wastewaterRebate = contributionBasis === 'DEFAULT_50_PERCENT'
    ? -Math.round(wastewaterCharges * SCOTTISH_WATER_2026.provisionalRebateFraction * 100) / 100
    : wastewaterContribution > 0 ? -wastewaterContribution : 0;
  const rebate = waterRebate + wastewaterRebate;
  const standardWaterConnections = count(settings?.standardWaterConnections, waterDwellings);
  const applicationCount = count(settings?.applicationCount, dwellings > 0 ? 1 : 0);
  const waterInspections = count(settings?.waterInspections, waterDwellings);
  // A housing development normally connects its onsite sewers to the public
  // network at site-level connection points, not once for every dwelling.
  // The base drainage allowance covers up to two such physical connections.
  const wastewaterInspections = count(settings?.wastewaterInspections, Math.min(wastewaterDwellings, 2));
  const inspectionMethod = settings?.inspectionMethod === 'DESKTOP' ? 'DESKTOP' : 'ONSITE';
  const inspectionRate = inspectionMethod === 'DESKTOP' ? SCOTTISH_WATER_2026.desktopInspection : SCOTTISH_WATER_2026.onsiteInspectionFirstHour;
  const quotedAdditionalConnectionCost = amount(settings?.quotedAdditionalConnectionCost);
  const quotedWastewaterConnectionCost = amount(settings?.quotedWastewaterConnectionCost);
  const waterConnections = waterInspections * inspectionRate;
  const wastewaterConnections = applicationCount * SCOTTISH_WATER_2026.application
    + wastewaterInspections * inspectionRate + quotedWastewaterConnectionCost;
  const connections = waterConnections + wastewaterConnections;
  return { dwellings, waterDwellings, wastewaterDwellings, flatHomes, semiTerracedHomes, detachedHomes, unclassifiedHomes,
    waterInfrastructureCharges, wastewaterInfrastructureCharges, infrastructureCharges,
    buildingWaterCharges, waterCharges, wastewaterCharges, charges,
    waterRebate, wastewaterRebate, rebate, waterCap, wastewaterCap,
    waterContribution, wastewaterContribution, eligibleWaterWorksCost, eligibleWastewaterWorksCost,
    contributionBasis, standardWaterConnections, inspectionMethod, inspectionRate,
    applicationCount, waterInspections, wastewaterInspections, quotedAdditionalConnectionCost, quotedWastewaterConnectionCost,
    waterConnections, wastewaterConnections, connections };
}
