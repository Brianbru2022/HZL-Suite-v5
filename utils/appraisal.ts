import { engineeringScopeReview, engineeringAbnormalAmount, normalizeEngineeringScope } from "./appraisalEngineeringScope";
import { normalizeScottishStatutoryFees, scottishBuildingWarrantFee2026, scottishResidentialPlanningFee2026, scottishResidentialPppFee2026 } from './scottishStatutoryFees2026';
import { calculateScottishRccFee, normalizeScottishRccFees } from './scottishRccFees2026';
import { calculateScottishWaterFees2026, normalizeScottishWaterFees } from './scottishWaterFees2026';
import { calculateSurveyReportSchedule, normalizeSurveyReportAssumptions } from './appraisalSurveyReports';
import { ADDITIONAL_SITE_POWER_ROW_IDS, calculateTemporaryPowerReview, normalizeTemporaryPower, TEMPORARY_POWER_ROW_IDS } from './appraisalTemporaryPower';
import { DRINKING_WATER_ROW_IDS, drinkingWaterReview, normalizeDrinkingWater } from './appraisalDrinkingWater';
import { FUEL_ROW_IDS, normalizeFuelAssumptions } from './appraisalFuel';
import { normalizeSkipWasteAssumptions, SKIP_WASTE_ROW_IDS, skipWasteReview } from './appraisalSkipWaste';
import { normalizePlotHeatingAssumptions, PLOT_HEATING_ROW_IDS, plotHeatingReview } from './appraisalPlotHeating';
import { calculateHerasFencingPurchase, HERAS_FENCING_ROW_ID, normalizeHerasFencingAssumptions } from './appraisalHerasFencing';
import { calculateSiloGeneratorReview, normalizeSiloGeneratorAssumptions, SILO_GENERATOR_FUEL_ROW_ID, SILO_GENERATOR_ROW_ID } from './appraisalSiloGenerator';
import { calculateSalesMarketingReview, normalizeSalesMarketingAssumptions, SALES_MARKETING_ROW_IDS } from './appraisalSalesMarketing';
import { PLOT_BASE_ALLOWANCES, PLOT_GARDEN_ALLOWANCES, RETIRED_INFRASTRUCTURE_RATE_IDS, LANDSCAPING_FENCING_COMPOUND_ALLOWANCES, LANDSCAPING_COMMENT, SERVICES_LIGHTING_ALLOWANCES, SERVICES_COMMENT, ROADS_PATHS_ALLOWANCES, ROADS_PATHS_COMMENT, DRAINAGE_ALLOWANCES, DRAINAGE_COMMENT, INFRASTRUCTURE_PRELIMS_ID } from './appraisalInfrastructureBill';
import { addMissingAgreedAppraisalRows } from './appraisalInfrastructureRatePacks';
import { isSiteCostElement, isClearedSiteCost, normalizeSiteCostLines, removeUnselectedAbnormalPresets, linkAbnormalRemovalRows, isAbnormalRemovalRow, isActiveSiteSourceRow, siteBaseRowMatches } from "./appraisalSiteCosts";
import type {
  AppraisalCalculationMode,
  AppraisalApprovedReportIssue,
  AppraisalCashflowProfile,
  CommercialAsset,
  AppraisalConsentStandardKey,
  AppraisalConsentStatus,
  AppraisalConsentTrackerEntry,
  AppraisalCostCategory,
  AppraisalCostLine,
  AppraisalCostPercentageBasis,
  AppraisalCustomCostProvision,
  AppraisalHouseTenure,
  AppraisalHouseTypeCostComponent,
  AppraisalHouseTypeCostComponentKey,
  AppraisalHouseTypeConfiguration,
  AppraisalHouseTypeLibraryItem,
  AppraisalHouseTypeSalesRow,
  AppraisalHouseTypeScheduleRow,
  AppraisalHouseTypeStyle,
  AppraisalInfrastructureCostDriver,
  AppraisalPricingReport,
  AppraisalPrelimsResourceCounts,
  AppraisalSafetyPlantAssumptions,
  AppraisalProgrammeAssumptions,
  AppraisalPlanningStatus,
  AppraisalRateFormulaComponent,
  AppraisalRateLibraryItem,
  AppraisalRevenueLine,
  AppraisalSiteDimensionCategory,
  AppraisalSiteDimensionRow,
  AppraisalSiteDimensionUnit,
  AppraisalTemplate,
  BoQItem,
  DevelopmentAppraisal,
  DevelopmentAppraisalKind,
  DevelopmentAppraisalOption,
  Project,
} from "../types";
import type { AppSettings } from "./appSettings";
import { getSectionItems } from "./calculations";
import { generateId } from "./generateId";
import {
  APPRAISAL_HOUSE_TYPE_DEFAULT_BUILD_MONTHS,
  APPRAISAL_HOUSE_TYPE_DEFAULT_PRICE_INDEX,
  resolveAppraisalStandardHouseTypeName,
} from "./appraisalHouseTypeLibraryStandards";
import {
  applyCommercialTemplateToOption,
  COMMERCIAL_APPRAISAL_TEMPLATES,
  defaultCommercialTemplateInputs,
} from "./commercialAppraisalTemplates";

export const APPRAISALS_LOCAL_STORAGE_KEY = "qs-pro-appraisals-v1";
export const APPRAISAL_HOUSE_TYPES_LOCAL_STORAGE_KEY =
  "qs-pro-appraisal-house-types-v1";
export const APPRAISAL_RATES_LOCAL_STORAGE_KEY = "qs-pro-appraisal-rates-v1";
export const DEFAULT_APPRAISAL_TEMPLATE: AppraisalTemplate =
  "RESIDENTIAL_SALES";
export const DEFAULT_APPRAISAL_DURATION_MONTHS = 18;
export const DEFAULT_TARGET_PROFIT_ON_GDV_PERCENT = 20;
export const DEFAULT_FINANCE_ANNUAL_RATE_PERCENT = 0;
export const HOUSE_BUILDING_OVERHEAD_PERCENT = 4;
export const APPRAISAL_REFERENCE_PATTERN = /^(\d{4})\.(\d{3})\.([A-Z]+)$/i;

export const APPRAISAL_HOUSE_TYPE_STYLE_OPTIONS: Array<{
  value: AppraisalHouseTypeStyle;
  label: string;
}> = [
  { value: "BUNGALOW", label: "Bungalow" },
  { value: "VILLA", label: "Villa" },
  { value: "TOWNHOUSE", label: "Townhouse" },
  { value: "FLAT", label: "Flat" },
  { value: "COTTAGE_FLAT", label: "Cottage Flat" },
  { value: "DETACHED", label: "Detached" },
  { value: "SEMI_DETACHED", label: "Semi-detached" },
  { value: "TERRACE", label: "Terrace" },
  { value: "COTTAGE", label: "Cottage" },
  { value: "OTHER", label: "Other" },
];

const APPRAISAL_HOUSE_TYPE_STYLES = new Set(
  APPRAISAL_HOUSE_TYPE_STYLE_OPTIONS.map((option) => option.value),
);

export const APPRAISAL_HOUSE_TYPE_CONFIGURATION_OPTIONS: Array<{
  value: AppraisalHouseTypeConfiguration;
  label: string;
}> = [
  { value: "DETACHED", label: "Detached" },
  { value: "SEMI_DETACHED", label: "Semi-detached" },
  { value: "END_TERRACE", label: "End Terrace" },
  { value: "MID_TERRACE", label: "Mid Terrace" },
  { value: "TERRACE", label: "Terrace" },
  { value: "COTTAGE_FLAT", label: "Cottage Flat" },
  { value: "OTHER", label: "Other" },
];

const APPRAISAL_HOUSE_TYPE_CONFIGURATIONS = new Set(
  APPRAISAL_HOUSE_TYPE_CONFIGURATION_OPTIONS.map((option) => option.value),
);

export const APPRAISAL_COST_CATEGORY_LABELS: Record<
  AppraisalCostCategory,
  string
> = {
  LAND_ACQUISITION: "Land / acquisition",
  CONSTRUCTION: "Construction",
  EXTERNAL_WORKS: "External works",
  ABNORMALS: "Abnormals",
  PROFESSIONAL_FEES: "Professional fees",
  STATUTORY_AUTHORITY: "Statutory / authority",
  MARKETING_SALES: "Marketing / sales",
  CONTINGENCY: "Contingency",
  FINANCE: "Finance fee",
  OTHER: "Other",
};

export const APPRAISAL_TEMPLATE_LABELS: Record<AppraisalTemplate, string> = {
  RESIDENTIAL_SALES: "Residential sales",
  COMMERCIAL_INCOME: "Commercial income",
};

export const APPRAISAL_MODE_LABELS: Record<AppraisalCalculationMode, string> = {
  RESIDUAL_LAND_VALUE: "Residual land value",
  KNOWN_LAND_PROFIT_ON_GDV: "Known land / project profit",
};

export const APPRAISAL_SITE_DIMENSION_LABELS: Record<
  AppraisalSiteDimensionCategory,
  string
> = {
  SITE_AREA: "Site area",
  ROADS: "Roads",
  FOOTPATHS: "Footpaths",
  COMMON_LANDSCAPING: "Common landscaping",
  BOUNDARY_FENCING: "Boundary fencing",
  PLOT_FENCING: "Plot fencing",
  PLANTING: "Planting",
  DRIVES: "Drives",
  COMMUNAL_PARKING: "Communal parking",
  FRONT_GARDENS: "Front gardens",
  REAR_GARDENS: "Rear gardens",
  OTHER: "Other",
};

export const APPRAISAL_INFRASTRUCTURE_COST_DRIVER_LABELS: Record<
  AppraisalInfrastructureCostDriver,
  string
> = {
  TOTAL_UNITS: "Total units",
  SITE_AREA_M2: "Site area m2",
  ROADS_M2: "Roads m2",
  PATHS_M2: "Footways m2",
  EXISTING_ROAD_JUNCTIONS: "Junctions with existing main roads",
  PLOT_WORKS_DRIVES_M2: "Plot works drives m2",
  PLOT_WORKS_FOOTPATHS_M2: "Plot works footpaths m2",
  FRONT_GARDENS_M2: "Front gardens m2",
  REAR_GARDENS_M2: "Rear gardens m2",
  COMMON_LANDSCAPING_M2: "Common landscaping m2",
  PLANTING_M2: "Planting area m2",
  BOUNDARY_FENCING_M: "Boundary fencing m",
  PLOT_FENCING_M: "Plot fencing m",
  GARDEN_WALLS_M: "Garden walls m",
  UNITS_WITH_DRIVES: "Units with drives",
  UNITS_WITHOUT_DRIVES: "Units without drives",
  GARDEN_WALLS_BASE_COST: "Garden Walls base cost",
  PROGRAMME_MONTHS: "Programme months",
  BUILD_RATE_UNITS_PER_MONTH: "Build rate units/month",
  STANDARD_HOUSE_TYPE_COUNT: "Standard house type count",
  NON_STANDARD_HOUSE_TYPE_COUNT: "Non-standard house type count",
  SUMMARY_BUILD_COST: "Summary build cost",
  TOTAL_GDV: "Total GDV",
  BUILDING_WARRANT_COST_BASIS: "Building warrant cost basis",
  ENGINEERS_FEES_FORMULA: "Engineers fees formula",
  PLANNING_FEES_FORMULA: "Planning fees formula",
  BUILDING_WARRANT_FORMULA: "Building warrant formula",
  RCC_FEES_FORMULA: "RCC formula",
  ASSISTANT_SITE_MANAGER_FORMULA: "Assistant Site Manager formula",
  FORKLIFT_DRIVER_FORMULA: "Forklift Driver formula",
  FORKLIFTS_FORMULA: "Forklifts formula",
  LABOURERS_FORMULA: "Labourers formula",
  SCOTTISH_WATER_REBATE_FORMULA: "Scottish Water rebate formula",
  FIXED_SUM: "Fixed sum",
};

export const APPRAISAL_INFRASTRUCTURE_COST_DRIVER_UNITS: Record<
  AppraisalInfrastructureCostDriver,
  AppraisalSiteDimensionUnit
> = {
  TOTAL_UNITS: "nr",
  SITE_AREA_M2: "m2",
  ROADS_M2: "m2",
  PATHS_M2: "m2",
  EXISTING_ROAD_JUNCTIONS: "nr",
  PLOT_WORKS_DRIVES_M2: "m2",
  PLOT_WORKS_FOOTPATHS_M2: "m2",
  FRONT_GARDENS_M2: "m2",
  REAR_GARDENS_M2: "m2",
  COMMON_LANDSCAPING_M2: "m2",
  PLANTING_M2: "m2",
  BOUNDARY_FENCING_M: "m",
  PLOT_FENCING_M: "m",
  GARDEN_WALLS_M: "m",
  UNITS_WITH_DRIVES: "nr",
  UNITS_WITHOUT_DRIVES: "nr",
  GARDEN_WALLS_BASE_COST: "sum",
  PROGRAMME_MONTHS: "month",
  BUILD_RATE_UNITS_PER_MONTH: "nr",
  STANDARD_HOUSE_TYPE_COUNT: "nr",
  NON_STANDARD_HOUSE_TYPE_COUNT: "nr",
  SUMMARY_BUILD_COST: "sum",
  TOTAL_GDV: "sum",
  BUILDING_WARRANT_COST_BASIS: "sum",
  ENGINEERS_FEES_FORMULA: "sum",
  PLANNING_FEES_FORMULA: "sum",
  BUILDING_WARRANT_FORMULA: "sum",
  RCC_FEES_FORMULA: "sum",
  ASSISTANT_SITE_MANAGER_FORMULA: "month",
  FORKLIFT_DRIVER_FORMULA: "month",
  FORKLIFTS_FORMULA: "month",
  LABOURERS_FORMULA: "month",
  SCOTTISH_WATER_REBATE_FORMULA: "sum",
  FIXED_SUM: "sum",
};

export const APPRAISAL_INFRASTRUCTURE_COST_DRIVER_CATEGORIES: Record<
  AppraisalInfrastructureCostDriver,
  AppraisalSiteDimensionCategory
> = {
  TOTAL_UNITS: "OTHER",
  SITE_AREA_M2: "SITE_AREA",
  ROADS_M2: "ROADS",
  PATHS_M2: "FOOTPATHS",
  EXISTING_ROAD_JUNCTIONS: "OTHER",
  PLOT_WORKS_DRIVES_M2: "DRIVES",
  PLOT_WORKS_FOOTPATHS_M2: "FOOTPATHS",
  FRONT_GARDENS_M2: "FRONT_GARDENS",
  REAR_GARDENS_M2: "REAR_GARDENS",
  COMMON_LANDSCAPING_M2: "COMMON_LANDSCAPING",
  PLANTING_M2: "PLANTING",
  BOUNDARY_FENCING_M: "BOUNDARY_FENCING",
  PLOT_FENCING_M: "PLOT_FENCING",
  GARDEN_WALLS_M: "OTHER",
  UNITS_WITH_DRIVES: "OTHER",
  UNITS_WITHOUT_DRIVES: "OTHER",
  GARDEN_WALLS_BASE_COST: "OTHER",
  PROGRAMME_MONTHS: "OTHER",
  BUILD_RATE_UNITS_PER_MONTH: "OTHER",
  STANDARD_HOUSE_TYPE_COUNT: "OTHER",
  NON_STANDARD_HOUSE_TYPE_COUNT: "OTHER",
  SUMMARY_BUILD_COST: "OTHER",
  TOTAL_GDV: "OTHER",
  BUILDING_WARRANT_COST_BASIS: "OTHER",
  ENGINEERS_FEES_FORMULA: "OTHER",
  PLANNING_FEES_FORMULA: "OTHER",
  BUILDING_WARRANT_FORMULA: "OTHER",
  RCC_FEES_FORMULA: "OTHER",
  ASSISTANT_SITE_MANAGER_FORMULA: "OTHER",
  FORKLIFT_DRIVER_FORMULA: "OTHER",
  FORKLIFTS_FORMULA: "OTHER",
  LABOURERS_FORMULA: "OTHER",
  SCOTTISH_WATER_REBATE_FORMULA: "OTHER",
  FIXED_SUM: "OTHER",
};

export const APPRAISAL_INFRASTRUCTURE_COST_DRIVER_OPTIONS = Object.entries(
  APPRAISAL_INFRASTRUCTURE_COST_DRIVER_LABELS,
).map(([value, label]) => ({
  value: value as AppraisalInfrastructureCostDriver,
  label,
}));

export const APPRAISAL_HOUSE_TYPE_COST_LABELS: Record<
  AppraisalHouseTypeCostComponentKey,
  string
> = {
  GROUNDWORK: "Groundwork",
  BRICK_LAB: "Brick labour",
  BRICK_MAT: "Brick materials",
  KIT: "Kit",
  JOINER: "Joiner",
  WINDOWS_DOORS: "Windows & doors",
  METALWORK: "Metalwork",
  STEEL: "Steel",
  SECOND_STEEL: "2nd steel",
  ROOFING: "Roofing",
  PV: "PV",
  ROUGHCAST: "Roughcast",
  ELECTRICAL: "Electrical",
  PLUMBING: "Plumbing",
  GARAGE_DOORS: "Garage doors",
  EV_CHARGERS: "EV chargers",
  AIR_SOURCE_HEAT_PUMPS: "Air source heat pumps",
  CERAMIC_TILING: "Ceramic tiling",
  DECORATION: "Decoration",
  SEALANTS: "Sealants",
  KITCHEN: "Kitchen",
  CLEANING: "Cleaning",
  SCAFFOLD: "Scaffold",
  FIRE_PROTECTION: "Fire protection",
  LIFT: "Lift",
  COMMON_STAIRS: "Common stairs",
  HANDRAILS_BALUSTRADES: "Handrails & balustrades",
  LANDLORD_LIGHTING: "Landlord lighting & power",
  DOOR_ENTRY_ACCESS: "Door entry & access control",
  SMOKE_VENT_FIRE_ALARM: "Smoke vent & fire alarm",
  ACOUSTIC_COMPARTMENTATION: "Acoustic & fire compartmentation",
  COMMUNAL_FINISHES: "Communal finishes",
  REFUSE_CYCLE_STORES: "Refuse/cycle stores",
  CUSTOM_ALLOWANCE: "Custom allowance",
};

export const APPRAISAL_HOUSE_TYPE_COST_COMPONENTS = Object.entries(
  APPRAISAL_HOUSE_TYPE_COST_LABELS,
).map(([key, label]) => ({
  key: key as AppraisalHouseTypeCostComponentKey,
  label,
}));

export const APPRAISAL_HOUSE_TYPE_STANDARD_COMPONENT_AMOUNTS: Partial<
  Record<AppraisalHouseTypeCostComponentKey, number>
> = {
  EV_CHARGERS: 1000,
  AIR_SOURCE_HEAT_PUMPS: 4000,
};

const OPTIONAL_HOUSE_TYPE_COST_COMPONENT_KEYS =
  new Set<AppraisalHouseTypeCostComponentKey>();

export function isOptionalHouseTypeCostComponent(
  key: AppraisalHouseTypeCostComponentKey,
): boolean {
  return OPTIONAL_HOUSE_TYPE_COST_COMPONENT_KEYS.has(key);
}

export const DEFAULT_SITE_DIMENSION_ROWS: Array<{
  category: AppraisalSiteDimensionCategory;
  costDriver: AppraisalInfrastructureCostDriver;
  label: string;
  unit: AppraisalSiteDimensionUnit;
}> = [
  {
    category: "SITE_AREA",
    costDriver: "SITE_AREA_M2",
    label: "Site area",
    unit: "m2",
  },
  { category: "ROADS", costDriver: "ROADS_M2", label: "Roads", unit: "m2" },
  { category: "FOOTPATHS", costDriver: "PATHS_M2", label: "Footways", unit: "m2" },
  { category: "OTHER", costDriver: "EXISTING_ROAD_JUNCTIONS", label: "Junctions with existing main roads", unit: "nr" },
  {
    category: "DRIVES",
    costDriver: "PLOT_WORKS_DRIVES_M2",
    label: "Drives",
    unit: "m2",
  },
  {
    category: "FOOTPATHS",
    costDriver: "PLOT_WORKS_FOOTPATHS_M2",
    label: "Plot works footpaths",
    unit: "m2",
  },
  {
    category: "FRONT_GARDENS",
    costDriver: "FRONT_GARDENS_M2",
    label: "Front gardens",
    unit: "m2",
  },
  {
    category: "REAR_GARDENS",
    costDriver: "REAR_GARDENS_M2",
    label: "Rear gardens",
    unit: "m2",
  },
  {
    category: "COMMON_LANDSCAPING",
    costDriver: "COMMON_LANDSCAPING_M2",
    label: "Common landscaping",
    unit: "m2",
  },
  {
    category: "PLANTING",
    costDriver: "PLANTING_M2",
    label: "Planting area",
    unit: "m2",
  },
  {
    category: "BOUNDARY_FENCING",
    costDriver: "BOUNDARY_FENCING_M",
    label: "Boundary fencing",
    unit: "m",
  },
  {
    category: "PLOT_FENCING",
    costDriver: "PLOT_FENCING_M",
    label: "Plot fencing",
    unit: "m",
  },
  {
    category: "OTHER",
    costDriver: "GARDEN_WALLS_M",
    label: "Garden walls",
    unit: "m",
  },
  {
    category: "OTHER",
    costDriver: "UNITS_WITH_DRIVES",
    label: "Units with drives",
    unit: "nr",
  },
  {
    category: "OTHER",
    costDriver: "UNITS_WITHOUT_DRIVES",
    label: "Units without drives",
    unit: "nr",
  },
];

export interface AppraisalOptionMetrics {
  optionId: string;
  gdv: number;
  revenueTotal: number;
  landValue: number;
  gdvIncentiveCost: number;
  nonLandCost: number;
  financeCost: number;
  totalCost: number;
  profit: number;
  targetProfit: number;
  profitOnGdvPercent: number;
  residualLandValue: number;
  residualOrSurplus: number;
  peakFunding: number;
  recommendation: "RECOMMENDED" | "VIABLE" | "WATCH" | "UNVIABLE";
}

export interface AppraisalMonthlyCashflowRow {
  month: number;
  inflow: number;
  outflowBeforeFinance: number;
  financeCost: number;
  netMovement: number;
  cumulativeBalance: number;
}

export interface AppraisalCashflowSummary {
  rows: AppraisalMonthlyCashflowRow[];
  financeCost: number;
  peakFunding: number;
}

export interface AppraisalFinalReportMetrics {
  metrics: AppraisalOptionMetrics;
  originalMetrics: AppraisalOptionMetrics;
  hasNegativeResidualLand: boolean;
}

export interface HouseBuildingOptionSummary {
  baseHouseConstructionCost: number;
  houseConstructionIndexCost: number;
  houseConstructionCost: number;
  basePrivateHouseConstructionCost: number;
  privateHouseConstructionIndexCost: number;
  privateHouseConstructionCost: number;
  baseAffordableHouseConstructionCost: number;
  affordableHouseConstructionIndexCost: number;
  affordableHouseConstructionCost: number;
  baseSiteWorksCost: number;
  siteWorksIndexCost: number;
  constructionIndexFactor: number;
  constructionIndexUplift: number;
  constructionContingency: number;
  privateHouseConstructionContingency: number;
  affordableHouseConstructionContingency: number;
  siteWorksContingency: number;
  siteWorksCost: number;
  indexedStructuredCost: number;
  totalStructuredCost: number;
  gdv: number;
  totalUnits: number;
  privateUnits: number;
  affordableUnits: number;
  totalGifa: number;
  averageSaleValuePerUnit: number;
  averageSaleValuePerM2: number;
}

export interface HouseBuildingProgrammeSummary {
  appraisalDate?: string;
  expectedStartDate?: string;
  appraisalPriceIndex: number;
  startPriceIndex: number;
  constructionIndexFactor: number;
  totalUnits: number;
  privateUnits: number;
  affordableUnits: number;
  leadInMonths: number;
  buildPeriodMonths: number;
  saleRateUnitsPerMonth: number;
  salePeriodMonths: number;
  programmeMonths: number;
  expectedEndDate?: string;
}

const COST_ITEM_TYPES = new Set<BoQItem["type"]>([
  "PRICED",
  "EXTRA_OVER_ITEM",
  "PROVISIONAL_SUM",
  "PC_SUM",
]);
const APPRAISAL_SITE_DIMENSION_UNITS = new Set<AppraisalSiteDimensionUnit>([
  "m2",
  "m",
  "nr",
  "sum",
  "month",
  "week",
  "kWh",
]);
const APPRAISAL_INFRASTRUCTURE_COST_DRIVERS =
  new Set<AppraisalInfrastructureCostDriver>(
    Object.keys(
      APPRAISAL_INFRASTRUCTURE_COST_DRIVER_LABELS,
    ) as AppraisalInfrastructureCostDriver[],
  );
const AWD_INFRASTRUCTURE_RATE_PACK_PREFIX = "awd-infrastructure";
const AWD_PLOT_WORKS_RATE_PACK_PREFIX = "awd-plot-works";
const AWD_PRELIMS_RATE_PACK_PREFIX = "awd-prelims";
const ASSISTANT_SITE_MANAGER_SOURCE_FORMULA =
  "Prelims!B23 = IF('Project Data'!E20 > 2, 'Project Data'!E21 * 3750, 0)";
const FORKLIFT_DRIVER_SOURCE_FORMULA =
  "Prelims!B24 adapted = MAX(0, programme months - lead-in months) * 3400 * selected forklift-driver count (automatic default: 1 or 2 by build rate)";
const LEGACY_FORKLIFT_DRIVER_SOURCE_FORMULA =
  "Prelims!B24 = IF('Project Data'!E20 > 2, 'Project Data'!E21 * 3400 * 2, 'Project Data'!E21 * 3400)";
const LEGACY_FORKLIFTS_SOURCE_FORMULA =
  "Prelims!B39 = IF('Project Data'!E20 > 2, 'Project Data'!E21 * 2125 * 2, 'Project Data'!E21 * 2125)";
const FORKLIFTS_SOURCE_FORMULA =
  "Prelims!B39 adapted = MAX(0, programme months - lead-in months) * 1716 * IF(build rate > 2 units/month, 2, 1)";
const FORKLIFT_REPAIRS_SOURCE_FORMULA =
  'Prelims!B40 adapted = active forklift months * selected forklift count * 212.5';
const RCC_SOURCE_FORMULA = 'RCC application/consent: selected roads authority fee; construction inspection charges are a separate Prelims row';
function refreshGeneratedForkliftNotes(id: unknown, value: unknown): string {
  const notes = typeof value === 'string' ? value : '';
  if (id === 'awd-prelims-rcc' && notes.startsWith('AWD Prelims Pack.'))
    return `AWD Prelims Pack. Local roads-authority RCC fee. Base formula: ${RCC_SOURCE_FORMULA}. Existing road-area allowances remain provisional until reviewed.`;
  if (id === 'awd-prelims-forklift-driver' && notes.startsWith('AWD Prelims Pack.')) {
    const updated = notes.replace(LEGACY_FORKLIFT_DRIVER_SOURCE_FORMULA, FORKLIFT_DRIVER_SOURCE_FORMULA);
    return updated.includes('excluding initial lead-in') ? updated : updated.replace(
      'one driver when',
      '£3,400 per driver per active programme month, excluding initial lead-in; selected count overrides the automatic assumption of one driver when',
    );
  }
  if (id === 'awd-prelims-forklift-repairs' && notes.startsWith('AWD Prelims Pack.'))
    return `AWD Prelims Pack. £212.50 per active forklift-month; matches forklift hire duration and count, excluding lead-in. Base formula: ${FORKLIFT_REPAIRS_SOURCE_FORMULA}.`;
  if (id !== 'awd-prelims-forklifts' || !notes.startsWith('AWD Prelims Pack.')) return notes;
  const updated = notes.replace(LEGACY_FORKLIFTS_SOURCE_FORMULA, FORKLIFTS_SOURCE_FORMULA);
  return updated.includes('excluding initial lead-in') ? updated : updated.replace(
    'one forklift when',
    '£1,716 per forklift per active programme month, excluding initial lead-in; one forklift when',
  );
}
const AWD_SALES_PRELIMS_RATE_IDS = new Set([
  "awd-prelims-sales-cabins",
  "awd-prelims-sales-assistants",
  "awd-prelims-sales-sundries",
  "awd-prelims-show-home-fitout",
  "awd-prelims-advertising",
]);

export const PRELIMS_RESOURCE_MONTHLY_RATES: Record<keyof AppraisalPrelimsResourceCounts, number> = {
  siteManagers: 6000,
  assistantSiteManagers: 3750,
  forkliftDrivers: 3400,
  labourers: 3060,
  forklifts: 1716,
};

const AWD_MONTHLY_PRELIMS_RESOURCE_RATES: Record<string, number> = {
  'awd-prelims-assistant-site-manager': PRELIMS_RESOURCE_MONTHLY_RATES.assistantSiteManagers,
  'awd-prelims-forklift-driver': PRELIMS_RESOURCE_MONTHLY_RATES.forkliftDrivers,
  'awd-prelims-labourers': PRELIMS_RESOURCE_MONTHLY_RATES.labourers,
  'awd-prelims-forklifts': PRELIMS_RESOURCE_MONTHLY_RATES.forklifts,
  'awd-prelims-forklift-repairs': 212.5,
};

function awdMonthlyPrelimsResourceRate(value: unknown): number | undefined {
  return typeof value === 'string' ? AWD_MONTHLY_PRELIMS_RESOURCE_RATES[value] : undefined;
}

function awdFormulaCostDriverForId(
  value: unknown,
): AppraisalInfrastructureCostDriver | undefined {
  if (value === "awd-prelims-assistant-site-manager")
    return "ASSISTANT_SITE_MANAGER_FORMULA";
  if (value === "awd-prelims-forklift-driver") return "FORKLIFT_DRIVER_FORMULA";
  if (value === "awd-prelims-forklifts") return "FORKLIFTS_FORMULA";
  if (value === "awd-prelims-forklift-repairs") return "FORKLIFTS_FORMULA";
  if (value === "awd-prelims-labourers") return "LABOURERS_FORMULA";
  return undefined;
}

function awdFormulaSourceFormulaForId(value: unknown) {
  if (value === 'awd-prelims-rcc') return RCC_SOURCE_FORMULA;
  if (value === "awd-prelims-assistant-site-manager")
    return ASSISTANT_SITE_MANAGER_SOURCE_FORMULA;
  if (value === "awd-prelims-forklift-driver")
    return FORKLIFT_DRIVER_SOURCE_FORMULA;
  if (value === "awd-prelims-forklifts") return FORKLIFTS_SOURCE_FORMULA;
  if (value === "awd-prelims-forklift-repairs") return FORKLIFT_REPAIRS_SOURCE_FORMULA;
  return undefined;
}

function nowIso() {
  return new Date().toISOString();
}

function todayDate() {
  return nowIso().slice(0, 10);
}

function appraisalYearFromDate(appraisalDate?: string) {
  const year = Number.parseInt(
    String(appraisalDate || todayDate()).slice(0, 4),
    10,
  );
  return Number.isFinite(year) && year > 0
    ? year
    : Number.parseInt(todayDate().slice(0, 4), 10);
}

function revisionToNumber(revision: string) {
  return revision
    .toUpperCase()
    .split("")
    .reduce(
      (total, char) => total * 26 + Math.max(0, char.charCodeAt(0) - 64),
      0,
    );
}

function numberToRevision(value: number) {
  let next = Math.max(1, Math.floor(value));
  let revision = "";
  while (next > 0) {
    next -= 1;
    revision = String.fromCharCode(65 + (next % 26)) + revision;
    next = Math.floor(next / 26);
  }
  return revision || "A";
}

export function parseAppraisalReference(reference?: string) {
  const match = String(reference || "")
    .trim()
    .match(APPRAISAL_REFERENCE_PATTERN);
  if (!match) return null;
  return {
    year: Number.parseInt(match[1], 10),
    sequence: Number.parseInt(match[2], 10),
    revision: match[3].toUpperCase(),
    baseReference: `${match[1]}.${match[2]}`,
    reference: `${match[1]}.${match[2]}.${match[3].toUpperCase()}`,
  };
}

export function buildAppraisalReference(
  year: number,
  sequence: number,
  revision = "A",
) {
  return `${year}.${String(Math.max(1, sequence)).padStart(3, "0")}.${revision.toUpperCase()}`;
}

export function buildNextAppraisalReference(
  appraisals: Pick<DevelopmentAppraisal, "reference">[] = [],
  appraisalDate?: string,
) {
  const year = appraisalYearFromDate(appraisalDate);
  const highestSequence = appraisals.reduce((highest, appraisal) => {
    const parsed = parseAppraisalReference(appraisal.reference);
    return parsed?.year === year ? Math.max(highest, parsed.sequence) : highest;
  }, 0);
  return buildAppraisalReference(year, highestSequence + 1, "A");
}

export function buildNextAppraisalRevisionReference(
  appraisal: Pick<DevelopmentAppraisal, "reference" | "appraisalDate">,
  appraisals: Pick<DevelopmentAppraisal, "reference">[] = [],
) {
  const parsed = parseAppraisalReference(appraisal.reference);
  if (!parsed)
    return buildNextAppraisalReference(appraisals, appraisal.appraisalDate);
  const highestRevision = appraisals.reduce((highest, entry) => {
    const entryReference = parseAppraisalReference(entry.reference);
    if (
      !entryReference ||
      entryReference.year !== parsed.year ||
      entryReference.sequence !== parsed.sequence
    )
      return highest;
    return Math.max(highest, revisionToNumber(entryReference.revision));
  }, revisionToNumber(parsed.revision));
  return buildAppraisalReference(
    parsed.year,
    parsed.sequence,
    numberToRevision(highestRevision + 1),
  );
}

function clampNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  // Older saved appraisal snapshots can contain numeric input values as strings.
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function clampPositive(value: unknown, fallback = 0) {
  return Math.max(0, clampNumber(value, fallback));
}

function clampPositiveInt(value: unknown, fallback = 0) {
  return Math.max(0, Math.round(clampPositive(value, fallback)));
}

function normalizeOptionalPositiveNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function normalizeCoordinate(value: unknown, minimum: number, maximum: number) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : undefined;
}

function normalizeOptionalPositiveInt(value: unknown) {
  const parsed = normalizeOptionalPositiveNumber(value);
  return parsed === undefined ? undefined : Math.max(1, Math.round(parsed));
}

function normalizeHouseTypeStyle(
  value: unknown,
): AppraisalHouseTypeStyle | undefined {
  return APPRAISAL_HOUSE_TYPE_STYLES.has(value as AppraisalHouseTypeStyle)
    ? (value as AppraisalHouseTypeStyle)
    : undefined;
}

function normalizeHouseTypeConfiguration(
  value: unknown,
): AppraisalHouseTypeConfiguration | undefined {
  return APPRAISAL_HOUSE_TYPE_CONFIGURATIONS.has(
    value as AppraisalHouseTypeConfiguration,
  )
    ? (value as AppraisalHouseTypeConfiguration)
    : undefined;
}

function normalizeOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  const key = value.trim().toLowerCase();
  if (["yes", "y", "true", "1"].includes(key)) return true;
  if (["no", "n", "false", "0"].includes(key)) return false;
  return undefined;
}

function normalizeSiteDimensionUnit(
  value: unknown,
  fallback: AppraisalSiteDimensionUnit,
): AppraisalSiteDimensionUnit {
  return APPRAISAL_SITE_DIMENSION_UNITS.has(value as AppraisalSiteDimensionUnit)
    ? (value as AppraisalSiteDimensionUnit)
    : fallback;
}

export function normalizeInfrastructureCostDriver(
  value: unknown,
  fallback?: AppraisalInfrastructureCostDriver,
): AppraisalInfrastructureCostDriver | undefined {
  return APPRAISAL_INFRASTRUCTURE_COST_DRIVERS.has(
    value as AppraisalInfrastructureCostDriver,
  )
    ? (value as AppraisalInfrastructureCostDriver)
    : fallback;
}

export function legacyCategoryToInfrastructureCostDriver(
  category: AppraisalSiteDimensionCategory,
): AppraisalInfrastructureCostDriver | undefined {
  switch (category) {
    case "SITE_AREA":
      return "SITE_AREA_M2";
    case "ROADS":
      return "ROADS_M2";
    case "DRIVES":
      return "PLOT_WORKS_DRIVES_M2";
    case "FOOTPATHS":
      return "PATHS_M2";
    case "FRONT_GARDENS":
      return "FRONT_GARDENS_M2";
    case "REAR_GARDENS":
      return "REAR_GARDENS_M2";
    case "COMMON_LANDSCAPING":
      return "COMMON_LANDSCAPING_M2";
    case "PLANTING":
      return "PLANTING_M2";
    case "BOUNDARY_FENCING":
      return "BOUNDARY_FENCING_M";
    case "PLOT_FENCING":
      return "PLOT_FENCING_M";
    default:
      return undefined;
  }
}

export function infrastructureCostDriverToCategory(
  costDriver: AppraisalInfrastructureCostDriver | undefined,
  fallback: AppraisalSiteDimensionCategory = "OTHER",
): AppraisalSiteDimensionCategory {
  return costDriver
    ? APPRAISAL_INFRASTRUCTURE_COST_DRIVER_CATEGORIES[costDriver]
    : fallback;
}

export function getInfrastructureCostDriverUnit(
  costDriver: AppraisalInfrastructureCostDriver | undefined,
  fallback: AppraisalSiteDimensionUnit = "m2",
): AppraisalSiteDimensionUnit {
  return costDriver
    ? APPRAISAL_INFRASTRUCTURE_COST_DRIVER_UNITS[costDriver]
    : fallback;
}

function normalizeTenure(value: unknown): AppraisalHouseTenure {
  return value === "AFFORDABLE" ? "AFFORDABLE" : "PRIVATE";
}

function isHouseTypeCostComponentKey(
  value: unknown,
): value is AppraisalHouseTypeCostComponentKey {
  return typeof value === "string" && value in APPRAISAL_HOUSE_TYPE_COST_LABELS;
}

function normalizeHouseTypeComponentDetailRows(
  value: unknown,
): NonNullable<AppraisalHouseTypeCostComponent["detailRows"]> | undefined {
  if (!Array.isArray(value)) return undefined;
  const rows = value
    .map((entry) => {
      const source = isRecord(entry) ? entry : {};
      const label =
        typeof source.label === "string" && source.label.trim()
          ? source.label.trim()
          : "";
      const quantity = clampPositive(source.quantity);
      const rate = clampPositive(source.rate);
      const total =
        source.total !== undefined
          ? clampPositive(source.total)
          : quantity * rate;
      if (!label) return null;
      return {
        id: typeof source.id === "string" ? source.id : generateId(),
        label,
        quantity,
        unit:
          typeof source.unit === "string" && source.unit.trim()
            ? source.unit.trim()
            : "item",
        rate,
        total,
        basis: typeof source.basis === "string" ? source.basis : "",
        included: source.included === false ? false : true,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
  return rows.length ? rows : undefined;
}

export function createDefaultHouseTypeCostBreakdown(): AppraisalHouseTypeCostComponent[] {
  return APPRAISAL_HOUSE_TYPE_COST_COMPONENTS.map((component) => ({
    id: generateId(),
    key: component.key,
    label: component.label,
    amount: APPRAISAL_HOUSE_TYPE_STANDARD_COMPONENT_AMOUNTS[component.key] || 0,
    priceIndex: 0,
    included: !isOptionalHouseTypeCostComponent(component.key),
    notes: "",
  }));
}

function normalizeHouseTypeCostBreakdown(
  value: unknown,
  legacyPriceIndex = 0,
  preserveZeroAmounts = false,
): AppraisalHouseTypeCostComponent[] {
  const fallbackPriceIndex =
    clampPositive(legacyPriceIndex) || APPRAISAL_HOUSE_TYPE_DEFAULT_PRICE_INDEX;
  const sourceRows = Array.isArray(value) ? value : [];
  const normalizedSourceRows = sourceRows
    .map((entry) => {
      const source = isRecord(entry) ? entry : {};
      const rawKey = typeof source.key === "string" ? source.key : "";
      const key = isHouseTypeCostComponentKey(rawKey)
        ? rawKey
        : "CUSTOM_ALLOWANCE";
      const label =
        typeof source.label === "string" && source.label.trim()
          ? source.label.trim()
          : APPRAISAL_HOUSE_TYPE_COST_LABELS[key];
      const amount =
        source.amount !== undefined
          ? clampPositive(source.amount)
          : APPRAISAL_HOUSE_TYPE_STANDARD_COMPONENT_AMOUNTS[key] || 0;
      return {
        id: typeof source.id === "string" ? source.id : generateId(),
        key,
        label,
        amount,
        priceIndex: clampPositive(source.priceIndex) || fallbackPriceIndex,
        included: typeof source.included === "boolean" ? source.included : true,
        notes: typeof source.notes === "string" ? source.notes : "",
        aiGenerated: source.aiGenerated === true,
        detailRows: normalizeHouseTypeComponentDetailRows(source.detailRows),
      };
    })
    .filter((row) => row.label || row.amount > 0);
  const hasCustomRows = normalizedSourceRows.some(
    (row) => row.key === "CUSTOM_ALLOWANCE",
  );
  const hasAiGeneratedRows = normalizedSourceRows.some(
    (row) => row.aiGenerated,
  );
  if (hasCustomRows || hasAiGeneratedRows) {
    return normalizedSourceRows;
  }
  const rowsByKey = new Map<
    AppraisalHouseTypeCostComponentKey,
    Record<string, unknown>
  >();
  sourceRows.forEach((entry) => {
    const source = isRecord(entry) ? entry : {};
    if (isHouseTypeCostComponentKey(source.key) && !rowsByKey.has(source.key)) {
      rowsByKey.set(source.key, source);
    }
  });

  return APPRAISAL_HOUSE_TYPE_COST_COMPONENTS.map((component) => {
    const source = rowsByKey.get(component.key);
    const defaultAmount =
      APPRAISAL_HOUSE_TYPE_STANDARD_COMPONENT_AMOUNTS[component.key] || 0;
    const sourceAmount =
      source && source.amount !== undefined
        ? clampPositive(source.amount, defaultAmount)
        : defaultAmount;
    const amount = preserveZeroAmounts
      ? sourceAmount
      : defaultAmount > 0 && sourceAmount <= 0
        ? defaultAmount
        : sourceAmount;
    // EV charging and ASHPs are mandatory standard provision. Other components
    // can be excluded in an appraisal-specific build-up.
    const isMandatoryLowCarbonProvision = component.key === "EV_CHARGERS"
      || component.key === "AIR_SOURCE_HEAT_PUMPS";
    const included = isMandatoryLowCarbonProvision
      ? true
      : typeof source?.included === "boolean"
        ? source.included
        : !isOptionalHouseTypeCostComponent(component.key) ||
          (Boolean(source) && amount > 0);
    return {
      id: typeof source?.id === "string" ? source.id : generateId(),
      key: component.key,
      label:
        typeof source?.label === "string" && source.label.trim()
          ? source.label
          : component.label,
      amount,
      priceIndex: clampPositive(source?.priceIndex) || fallbackPriceIndex,
      included,
      notes: typeof source?.notes === "string" ? source.notes : "",
      aiGenerated: source?.aiGenerated === true,
      detailRows: normalizeHouseTypeComponentDetailRows(source?.detailRows),
    };
  });
}

export function calculateHouseTypeCostBreakdownTotal(
  costBreakdown: AppraisalHouseTypeCostComponent[] | undefined,
): number {
  if (!Array.isArray(costBreakdown)) return 0;
  return costBreakdown.reduce(
    (total, component) =>
      total +
      (component.included === false ? 0 : clampPositive(component.amount)),
    0,
  );
}

function hasNonDefaultHouseTypeComponentCost(
  costBreakdown: AppraisalHouseTypeCostComponent[] | undefined,
): boolean {
  return (
    Array.isArray(costBreakdown) &&
    costBreakdown.some(
      (component) =>
        component.included !== false &&
        Math.abs(
          clampPositive(component.amount) -
            (APPRAISAL_HOUSE_TYPE_STANDARD_COMPONENT_AMOUNTS[component.key] ||
              0),
        ) > 0.5,
    )
  );
}

function calculateCostBreakdownRatePerM2(
  costBreakdown: AppraisalHouseTypeCostComponent[] | undefined,
  gifaM2: unknown,
): number {
  const gifa = clampPositive(gifaM2);
  const total = calculateHouseTypeCostBreakdownTotal(costBreakdown);
  return gifa > 0 &&
    total > 0 &&
    hasNonDefaultHouseTypeComponentCost(costBreakdown)
    ? total / gifa
    : 0;
}

export function calculateHouseTypeLibraryBuildCostPerM2(
  houseType: Pick<
    AppraisalHouseTypeLibraryItem,
    "buildCostPerM2" | "costBreakdown" | "gifaM2"
  >,
): number {
  return (
    calculateCostBreakdownRatePerM2(
      houseType.costBreakdown,
      houseType.gifaM2,
    ) || clampPositive(houseType.buildCostPerM2)
  );
}

export function calculateHouseTypeScheduleBuildCostPerM2(
  row: Pick<
    AppraisalHouseTypeScheduleRow,
    "buildCostPerM2" | "costBreakdown" | "gifaM2"
  >,
): number {
  return (
    calculateCostBreakdownRatePerM2(row.costBreakdown, row.gifaM2) ||
    clampPositive(row.buildCostPerM2)
  );
}

function addMonthsToDate(date: string | undefined, months: number) {
  if (!date) return undefined;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  parsed.setUTCMonth(parsed.getUTCMonth() + Math.max(0, Math.round(months)));
  return parsed.toISOString().slice(0, 10);
}

function durationFor(
  option: Pick<DevelopmentAppraisalOption, "durationMonths">,
) {
  return Math.max(
    1,
    Math.min(
      360,
      Math.round(
        clampPositive(option.durationMonths, DEFAULT_APPRAISAL_DURATION_MONTHS),
      ),
    ),
  );
}

function normalizeMonth(value: unknown, fallback: number, duration: number) {
  return Math.max(
    1,
    Math.min(duration, Math.round(clampPositive(value, fallback))),
  );
}

export function createCashflowProfile(
  type: AppraisalCashflowProfile["type"] = "EVEN",
  durationMonths = DEFAULT_APPRAISAL_DURATION_MONTHS,
): AppraisalCashflowProfile {
  const duration = Math.max(1, Math.round(durationMonths));
  return {
    type,
    startMonth: 1,
    endMonth: duration,
  };
}

export function createDefaultAppraisalHouseType(
  overrides: Partial<AppraisalHouseTypeLibraryItem> = {},
): AppraisalHouseTypeLibraryItem {
  const timestamp = nowIso();
  const costBreakdown = normalizeHouseTypeCostBreakdown(
    overrides.costBreakdown || createDefaultHouseTypeCostBreakdown(),
    clampPositive(overrides.priceIndex),
    overrides.isIncomplete === true,
  );
  const gifaM2 = overrides.gifaM2 ?? 90;
  const buildCostPerM2 = overrides.costBreakdown
    ? calculateCostBreakdownRatePerM2(costBreakdown, gifaM2) ||
      (overrides.buildCostPerM2 ?? 1600)
    : (overrides.buildCostPerM2 ?? 1600);
  return {
    id: generateId(),
    name: "New house type",
    buildPeriodMonths: 6,
    notes: "",
    status: "ACTIVE",
    favorite: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
    gifaM2,
    buildCostPerM2,
    costBreakdown,
    // House type library indices are now held against individual trade components.
    priceIndex: 0,
  };
}

export function createHouseTypeScheduleRowFromLibrary(
  houseType: AppraisalHouseTypeLibraryItem,
  overrides: Partial<AppraisalHouseTypeScheduleRow> = {},
): AppraisalHouseTypeScheduleRow {
  const costBreakdown = houseType.costBreakdown?.length
    ? houseType.costBreakdown.map((component) => ({
        ...component,
        id: generateId(),
      }))
    : undefined;
  return {
    id: generateId(),
    libraryHouseTypeId: houseType.id,
    houseTypeName: houseType.name,
    style: houseType.style,
    configuration: houseType.configuration,
    storeys: houseType.storeys,
    bedrooms: houseType.bedrooms,
    garage: houseType.garage,
    privateDrive: houseType.privateDrive,
    tenure: "PRIVATE",
    quantity: 1,
    separateSalesQuantity: false,
    salesQuantity: undefined,
    constructionQuantityLabel: "",
    salesQuantityLabel: "",
    quantitySeparationNotes: "",
    gifaM2: houseType.gifaM2,
    buildCostPerM2: calculateHouseTypeLibraryBuildCostPerM2(houseType),
    costBreakdown,
    priceIndex: costBreakdown?.length ? 0 : houseType.priceIndex || 0,
    buildPeriodMonths: houseType.buildPeriodMonths || 6,
    salesRows: undefined,
    saleValuePerUnit: 0,
    saleRatePerM2: 0,
    notes: "",
    ...overrides,
  };
}

export function createManualHouseTypeScheduleRow(
  overrides: Partial<AppraisalHouseTypeScheduleRow> = {},
): AppraisalHouseTypeScheduleRow {
  return {
    id: generateId(),
    houseTypeName: "Manual house type",
    style: undefined,
    configuration: undefined,
    storeys: undefined,
    bedrooms: undefined,
    garage: undefined,
    privateDrive: undefined,
    tenure: "PRIVATE",
    quantity: 1,
    separateSalesQuantity: false,
    salesQuantity: undefined,
    constructionQuantityLabel: "",
    salesQuantityLabel: "",
    quantitySeparationNotes: "",
    gifaM2: 90,
    buildCostPerM2: 1600,
    priceIndex: 0,
    buildPeriodMonths: 6,
    salesRows: undefined,
    saleValuePerUnit: 0,
    saleRatePerM2: 0,
    notes: "",
    ...overrides,
  };
}

export function createDefaultSiteDimensionRows(): AppraisalSiteDimensionRow[] {
  return DEFAULT_SITE_DIMENSION_ROWS.map((row) => ({
    id: generateId(),
    ...row,
    isCostDriverInput: true,
    quantity: 0,
    rate: 0,
    priceIndex: 0,
    notes: "",
  }));
}

export function createSiteDimensionRow(
  overrides: Partial<AppraisalSiteDimensionRow> = {},
): AppraisalSiteDimensionRow {
  return {
    id: generateId(),
    category: "OTHER",
    label: "Other site allowance",
    unit: "m2",
    quantity: 0,
    rate: 0,
    notes: "",
    ...overrides,
  };
}

export function createDefaultAppraisalRate(
  overrides: Partial<AppraisalRateLibraryItem> = {},
): AppraisalRateLibraryItem {
  const timestamp = nowIso();
  const costDriver = normalizeInfrastructureCostDriver(
    overrides.costDriver,
    overrides.category
      ? legacyCategoryToInfrastructureCostDriver(overrides.category)
      : "ROADS_M2",
  );
  const category =
    overrides.category ||
    infrastructureCostDriverToCategory(costDriver, "ROADS");
  return {
    id: generateId(),
    category,
    costDriver,
    label:
      overrides.label ||
      (costDriver
        ? APPRAISAL_INFRASTRUCTURE_COST_DRIVER_LABELS[costDriver]
        : APPRAISAL_SITE_DIMENSION_LABELS[category]),
    unit:
      overrides.unit ||
      getInfrastructureCostDriverUnit(
        costDriver,
        category === "BOUNDARY_FENCING" || category === "PLOT_FENCING"
          ? "m"
          : "m2",
      ),
    rate: 0,
    notes: "",
    status: "ACTIVE",
    favorite: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

export function createSiteDimensionRowFromRate(
  rateItem: AppraisalRateLibraryItem,
  overrides: Partial<AppraisalSiteDimensionRow> = {},
): AppraisalSiteDimensionRow {
  return {
    id: generateId(),
    category: rateItem.category,
    costDriver: rateItem.costDriver,
    isCostDriverInput: false,
    libraryRateId: rateItem.id,
    label: rateItem.label,
    unit: rateItem.unit,
    quantity: rateItem.costDriver === "FIXED_SUM" ? 1 : 0,
    rate: rateItem.rate,
    priceIndex: rateItem.priceIndex || 0,
    sourceFormula: rateItem.sourceFormula || "",
    sourceRow: rateItem.sourceRow || "",
    notes: rateItem.notes || "",
    ...overrides,
  };
}

function getAppraisalSettings(settings?: AppSettings) {
  const appraisals = settings?.moduleSettings?.appraisals;
  return {
    defaultTemplate: appraisals?.defaultTemplate || DEFAULT_APPRAISAL_TEMPLATE,
    defaultDurationMonths:
      appraisals?.defaultDurationMonths || DEFAULT_APPRAISAL_DURATION_MONTHS,
    defaultTargetProfitOnGdvPercent:
      appraisals?.defaultTargetProfitOnGdvPercent ??
      DEFAULT_TARGET_PROFIT_ON_GDV_PERCENT,
    defaultFinanceAnnualRatePercent:
      appraisals?.defaultFinanceAnnualRatePercent ??
      DEFAULT_FINANCE_ANNUAL_RATE_PERCENT,
  };
}

export function createDefaultRevenueLine(
  template: AppraisalTemplate,
  durationMonths = DEFAULT_APPRAISAL_DURATION_MONTHS,
): AppraisalRevenueLine {
  if (template === "COMMERCIAL_INCOME") {
    return {
      id: generateId(),
      title: "Commercial income",
      template,
      area: 1000,
      rentRate: 25,
      yieldPercent: 6,
      voidPercent: 0,
      incentivePercent: 0,
      manualValue: 0,
      cashflow: createCashflowProfile("END", durationMonths),
      notes: "",
    };
  }

  return {
    id: generateId(),
    title: "Residential sales",
    template,
    units: 10,
    saleValuePerUnit: 250000,
    area: 0,
    valuePerArea: 0,
    manualValue: 0,
    cashflow: createCashflowProfile("END", durationMonths),
    notes: "",
  };
}

export function createDefaultCostLine(
  category: AppraisalCostCategory,
  durationMonths = DEFAULT_APPRAISAL_DURATION_MONTHS,
  overrides: Partial<AppraisalCostLine> = {},
): AppraisalCostLine {
  const defaultTiming: AppraisalCashflowProfile["type"] =
    category === "LAND_ACQUISITION"
      ? "UPFRONT"
      : category === "MARKETING_SALES"
        ? "END"
        : "EVEN";

  return {
    id: generateId(),
    title: APPRAISAL_COST_CATEGORY_LABELS[category],
    category,
    amount: 0,
    percentageBasis: "NONE",
    percentageValue: 0,
    cashflow: createCashflowProfile(defaultTiming, durationMonths),
    notes: "",
    ...overrides,
  };
}

const DEFAULT_CONSENT_TRACKER_ROWS: Array<{
  standardKey: Exclude<AppraisalConsentStandardKey, "CUSTOM">;
  title: string;
  authority: string;
}> = [
  {
    standardKey: "SCOTTISH_WATER_SEWERS",
    title: "Scottish Water sewers",
    authority: "Scottish Water",
  },
  {
    standardKey: "PLANNING",
    title: "Planning",
    authority: "Planning authority",
  },
  { standardKey: "RCC", title: "RCC", authority: "Roads / RCC authority" },
  {
    standardKey: "BUILDING_WARRANT",
    title: "Building warrant",
    authority: "Building standards",
  },
];

export function createDefaultConsentTrackerEntry(
  overrides: Partial<AppraisalConsentTrackerEntry> = {},
): AppraisalConsentTrackerEntry {
  const timestamp = nowIso();
  return {
    id: generateId(),
    standardKey: "CUSTOM",
    title: "New consent",
    authority: "",
    status: "NOT_STARTED",
    responsibleParty: "",
    reference: "",
    targetDate: "",
    submittedDate: "",
    approvedDate: "",
    notes: "",
    uploads: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

export function createDefaultConsentTrackerEntries(): AppraisalConsentTrackerEntry[] {
  return DEFAULT_CONSENT_TRACKER_ROWS.map((row) =>
    createDefaultConsentTrackerEntry(row),
  );
}

export function createDefaultAppraisalOption(
  template: AppraisalTemplate = DEFAULT_APPRAISAL_TEMPLATE,
  settings?: AppSettings,
  kind?: DevelopmentAppraisalKind,
): DevelopmentAppraisalOption {
  const defaults = getAppraisalSettings(settings);
  const durationMonths = defaults.defaultDurationMonths;
  const timestamp = nowIso();
  const optionKind: DevelopmentAppraisalKind =
    kind ||
    (template === "COMMERCIAL_INCOME" ? "COMMERCIAL" : "HOUSE_BUILDING");
  const commercialTemplate = COMMERCIAL_APPRAISAL_TEMPLATES[0];
  const commercialInputs = defaultCommercialTemplateInputs(commercialTemplate);
  const baseOption: DevelopmentAppraisalOption = {
    id: generateId(),
    name: "Base option",
    template,
    commercialAssessmentStage:
      optionKind === "COMMERCIAL" ? "MODELLED" : undefined,
    commercialTemplateId:
      optionKind === "COMMERCIAL" ? commercialTemplate.id : undefined,
    commercialTemplateInputs:
      optionKind === "COMMERCIAL" ? commercialInputs : undefined,
    commercialLocation: optionKind === "COMMERCIAL" ? "" : undefined,
    commercialRevenueAssessment:
      optionKind === "COMMERCIAL" ? undefined : undefined,
    commercialLifecycleYears: optionKind === "COMMERCIAL" ? 10 : undefined,
    commercialAnnualOperatingCostPercent:
      optionKind === "COMMERCIAL" ? 25 : undefined,
    commercialAnnualRevenueGrowthPercent:
      optionKind === "COMMERCIAL" ? 2 : undefined,
    commercialAnnualCostInflationPercent:
      optionKind === "COMMERCIAL" ? 3 : undefined,
    commercialAnnualLifecycleCapexPercent:
      optionKind === "COMMERCIAL" ? 1 : undefined,
    commercialExitYieldPercent:
      optionKind === "COMMERCIAL"
        ? commercialTemplate.revenue.yieldPercent
        : undefined,
    commercialSellingCostsPercent: optionKind === "COMMERCIAL" ? 2 : undefined,
    commercialDebtEnabled: optionKind === "COMMERCIAL" ? true : undefined,
    commercialLoanToCostPercent: optionKind === "COMMERCIAL" ? 65 : undefined,
    commercialDebtArrangementFeePercent: optionKind === "COMMERCIAL" ? 1 : undefined,
    commercialDebtExitFeePercent: optionKind === "COMMERCIAL" ? 0 : undefined,
    commercialDebtAmortisationYears: optionKind === "COMMERCIAL" ? 25 : undefined,
    commercialRefinanceYear: optionKind === "COMMERCIAL" ? 0 : undefined,
    commercialRefinanceLoanToValuePercent: optionKind === "COMMERCIAL" ? 65 : undefined,
    commercialRefinanceAnnualRatePercent: optionKind === "COMMERCIAL" ? defaults.defaultFinanceAnnualRatePercent : undefined,
    commercialRefinanceFeePercent: optionKind === "COMMERCIAL" ? 1 : undefined,
    commercialMinimumDscr: optionKind === "COMMERCIAL" ? 1.25 : undefined,
    commercialDiscountRatePercent: optionKind === "COMMERCIAL" ? 10 : undefined,
    commercialFinancialScenarios: optionKind === "COMMERCIAL" ? [
      { kind: 'BASE', name: 'Base', rentChangePercent: 0, voidChangePercent: 0, developmentCostChangePercent: 0, lifecycleCapexChangePercent: 0, exitYieldShiftBps: 0, delayMonths: 0 },
      { kind: 'UPSIDE', name: 'Upside', rentChangePercent: 5, voidChangePercent: -2, developmentCostChangePercent: -3, lifecycleCapexChangePercent: -10, exitYieldShiftBps: -25, delayMonths: 0 },
      { kind: 'DOWNSIDE', name: 'Downside', rentChangePercent: -10, voidChangePercent: 5, developmentCostChangePercent: 10, lifecycleCapexChangePercent: 25, exitYieldShiftBps: 75, delayMonths: 6 },
    ] : undefined,
    calculationMode:
      optionKind === "COMMERCIAL"
        ? "KNOWN_LAND_PROFIT_ON_GDV"
        : "RESIDUAL_LAND_VALUE",
    durationMonths,
    targetProfitOnGdvPercent: defaults.defaultTargetProfitOnGdvPercent,
    gdvIncentivePercent: 0,
    customGdvAdditionAmount: 0,
    customGdvAdditionNote: "",
    customCostProvisions: [],
    customCostProvisionAmount: 0,
    customCostProvisionNote: "",
    salesIndexationEnabled: false,
    salesIndexationPercent: 0,
    salesIndexationAssessedAt: "",
    salesIndexationNarrative: "",
    overheadPercent:
      optionKind === "HOUSE_BUILDING"
        ? HOUSE_BUILDING_OVERHEAD_PERCENT
        : undefined,
    financeAnnualRatePercent: defaults.defaultFinanceAnnualRatePercent,
    knownLandValue: 0,
    sellerMinimumLandValue: 0,
    revenueLines: optionKind === "HOUSE_BUILDING" ? [] : [],
    abnormalBaseAllowance: 0,
    costLines: [],
    houseTypeSchedule: optionKind === "HOUSE_BUILDING" ? [] : undefined,
    siteDimensions:
      optionKind === "HOUSE_BUILDING"
        ? createDefaultSiteDimensionRows()
        : undefined,
    programme:
      optionKind === "HOUSE_BUILDING"
        ? {
            appraisalPriceIndex: 0,
            expectedStartDate: "",
            startPriceIndex: 0,
            saleRateUnitsPerMonth: 0,
            leadInMonths: 0,
          }
        : undefined,
    recommended: false,
    baseMeasurementFiles: optionKind === "HOUSE_BUILDING" ? [] : undefined,
    architectFeasibilityLayouts:
      optionKind === "HOUSE_BUILDING" ? [] : undefined,
    pricingReport: undefined,
    housePricesComment: "",
    abnormalGeneralNotes: "",
    abnormalGeneralNarrative: "",
    constraintsReport: undefined,
    landContractVersions: optionKind === "HOUSE_BUILDING" ? [] : undefined,
    consentTracker:
      optionKind === "HOUSE_BUILDING"
        ? createDefaultConsentTrackerEntries()
        : undefined,
    assumptions: "",
    decisionNote: "",
    finalReportExecutiveSummary: "",
    finalReportSourceSignature: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  return optionKind === "COMMERCIAL"
    ? applyCommercialTemplateToOption(
        baseOption,
        commercialTemplate.id,
        commercialInputs,
      )
    : baseOption;
}

export function createDefaultAppraisal(
  project?: Project | null,
  settings?: AppSettings,
  kind: DevelopmentAppraisalKind = "HOUSE_BUILDING",
): DevelopmentAppraisal {
  const defaults = getAppraisalSettings(settings);
  const timestamp = nowIso();
  const template: AppraisalTemplate =
    kind === "COMMERCIAL" ? "COMMERCIAL_INCOME" : defaults.defaultTemplate;
  const option = createDefaultAppraisalOption(template, settings, kind);
  return {
    id: generateId(),
    kind,
    name: project
      ? `${project.name} appraisal`
      : kind === "COMMERCIAL"
        ? "New commercial appraisal"
        : "New house building appraisal",
    reference: project?.reference || "",
    client: project?.client || "",
    site: project?.location || "",
    siteStatus: "NOT_APPRAISED",
    sitePlanningStatus: "UNKNOWN",
    siteOffMarket: false,
    siteCountry: "",
    siteRegion: "",
    siteCounty: "",
    siteLandPriceKnown: false,
    siteLandPrice: undefined,
    appraisalDate: todayDate(),
    projectId: project?.id,
    status: "DRAFT",
    selectedOptionId: option.id,
    options: [option],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function calculateHouseTypeConstructionTotal(
  row: AppraisalHouseTypeScheduleRow,
): number {
  const quantity = clampPositive(row.quantity);
  const componentTotal = calculateHouseTypeCostBreakdownTotal(
    row.costBreakdown,
  );
  if (
    componentTotal > 0 &&
    hasNonDefaultHouseTypeComponentCost(row.costBreakdown)
  )
    return quantity * componentTotal;
  return (
    quantity *
    clampPositive(row.gifaM2) *
    calculateHouseTypeScheduleBuildCostPerM2(row)
  );
}

function normalizeSalesRow(
  row: Partial<AppraisalHouseTypeSalesRow>,
  fallbackId: string,
): AppraisalHouseTypeSalesRow | null {
  const quantity = clampPositive(row.quantity);
  const gifaM2 = clampPositive(row.gifaM2);
  if (quantity <= 0 || gifaM2 <= 0) return null;
  return {
    id: typeof row.id === "string" && row.id.trim() ? row.id : fallbackId,
    label:
      typeof row.label === "string" && row.label.trim()
        ? row.label.trim()
        : "Sale unit",
    quantity,
    gifaM2,
    saleValuePerUnit: clampPositive(row.saleValuePerUnit),
    saleRatePerM2: clampPositive(row.saleRatePerM2),
    notes: typeof row.notes === "string" ? row.notes : "",
  };
}

function firstAreaM2FromText(text: string): number {
  const normalized = text.toLowerCase().replace(/,/g, "");
  const explicit = normalized.match(
    /\b(\d+(?:\.\d+)?)\s*(?:m2|sq\s*m|sqm|square\s*metres?|square\s*meters?)\b/,
  );
  return explicit ? Number(explicit[1]) : 0;
}

function saleFlatAreaM2FromText(text: string): number {
  const normalized = text.toLowerCase().replace(/,/g, "");
  const flatOfArea = normalized.match(
    /\b(?:flat|flats|apartment|apartments)\s+(?:of|at)\s+(\d+(?:\.\d+)?)\s*(?:m2|sq\s*m|sqm|square\s*metres?|square\s*meters?)\b/,
  );
  if (flatOfArea) return Number(flatOfArea[1]);
  const areaFlat = normalized.match(
    /\b(\d+(?:\.\d+)?)\s*(?:m2|sq\s*m|sqm|square\s*metres?|square\s*meters?)\s+(?:flat|flats|apartment|apartments)\b/,
  );
  return areaFlat ? Number(areaFlat[1]) : 0;
}

function flatLevelQuantity(text: string, levelPattern: string): number {
  const patterns = [
    new RegExp(
      `\\b(\\d+)\\s*(?:nr|no\\.?|number)?\\s*(?:of\\s+)?(?:${levelPattern})(?:\\s+floor)?\\s*(?:flat|flats|apartment|apartments)?\\b`,
      "i",
    ),
    new RegExp(
      `\\b(\\d+)\\s+(?:on\\s+(?:the\\s+)?)?(?:${levelPattern})(?:\\s+floor)?\\b`,
      "i",
    ),
    new RegExp(
      `\\b(?:${levelPattern})(?:\\s+floor)?\\s*(?:flat|flats|apartment|apartments)?\\D{0,16}(\\d+)\\b`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match ? Number(match[1]) : 0;
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

function flatLevelQuantities(text: string, totalSalesQuantity: number) {
  const ground = flatLevelQuantity(text, "gf|ground(?:\\s+floor)?");
  const mid = flatLevelQuantity(text, "mid(?:dle)?(?:\\s+floor)?");
  const top = flatLevelQuantity(text, "top(?:\\s+floor)?|upper(?:\\s+floor)?");
  const explicitTotal = ground + mid + top;
  if (ground > 0 && mid > 0 && top > 0) {
    const scale =
      explicitTotal > 0 &&
      explicitTotal < totalSalesQuantity &&
      totalSalesQuantity % explicitTotal === 0
        ? totalSalesQuantity / explicitTotal
        : 1;
    return {
      ground: Math.round(ground * scale),
      mid: Math.round(mid * scale),
      top: Math.round(top * scale),
    };
  }
  const mentionsAllLevels =
    /\b(gf|ground(?:\s+floor)?)\b/i.test(text) &&
    /\bmid(?:dle)?(?:\s+floor)?\b/i.test(text) &&
    /\b(top(?:\s+floor)?|upper(?:\s+floor)?)\b/i.test(text);
  const impliesThreeFloors =
    /\b(?:3|three)[-\s]*storey\b/i.test(text) ||
    /\b(?:3|three)\s+floors?\b/i.test(text) ||
    /\bper\s+floor\b/i.test(text);
  if (!mentionsAllLevels && !impliesThreeFloors) return null;
  const equalQuantity = Math.max(1, Math.round(totalSalesQuantity / 3));
  return {
    ground: equalQuantity,
    mid: equalQuantity,
    top: Math.max(0, totalSalesQuantity - equalQuantity * 2),
  };
}

function inferredFlatSalesRows(
  row: AppraisalHouseTypeScheduleRow,
): AppraisalHouseTypeSalesRow[] {
  const salesQuantity = row.separateSalesQuantity
    ? clampPositive(row.salesQuantity)
    : 0;
  if (salesQuantity <= 1) return [];
  const text = [
    row.houseTypeName,
    row.quantitySeparationNotes,
    row.notes,
    row.salesQuantityLabel,
    row.constructionQuantityLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const looksLikeFlatBlock =
    /\b(flat|flats|apartment|apartments)\b/.test(text) ||
    /\bblock\b/.test(text);
  if (!looksLikeFlatBlock) return [];
  const levelQuantities = flatLevelQuantities(text, salesQuantity);
  if (!levelQuantities) return [];
  const areaM2 =
    saleFlatAreaM2FromText(text) ||
    (clampPositive(row.quantity) > 0
      ? clampPositive(row.gifaM2) /
        Math.max(1, salesQuantity / clampPositive(row.quantity))
      : 0) ||
    firstAreaM2FromText(text) ||
    clampPositive(row.gifaM2);
  if (areaM2 <= 0) return [];
  const inheritedSaleValue = clampPositive(row.saleValuePerUnit);
  const inheritedSaleRate = clampPositive(row.saleRatePerM2);
  return [
    {
      id: `${row.id}-sales-ground`,
      label: "Ground floor flat",
      quantity: levelQuantities.ground,
      gifaM2: areaM2,
    },
    {
      id: `${row.id}-sales-mid`,
      label: "Mid floor flat",
      quantity: levelQuantities.mid,
      gifaM2: areaM2,
    },
    {
      id: `${row.id}-sales-top`,
      label: "Top floor flat",
      quantity: levelQuantities.top,
      gifaM2: areaM2,
    },
  ]
    .map((saleRow) => ({
      ...saleRow,
      saleValuePerUnit: inheritedSaleValue,
      saleRatePerM2: inheritedSaleRate,
      notes: row.quantitySeparationNotes || "",
    }))
    .filter((saleRow) => saleRow.quantity > 0);
}

export function getHouseTypeSalesRows(
  row: AppraisalHouseTypeScheduleRow,
): AppraisalHouseTypeSalesRow[] {
  const explicitRows = (row.salesRows || [])
    .map((salesRow, index) =>
      normalizeSalesRow(salesRow, `${row.id}-sales-${index + 1}`),
    )
    .filter((salesRow): salesRow is AppraisalHouseTypeSalesRow =>
      Boolean(salesRow),
    );
  const inferredRows = inferredFlatSalesRows(row);
  if (inferredRows.length > 0 && explicitRows.length <= 1) {
    const inherited = explicitRows[0];
    return inherited
      ? inferredRows.map((salesRow) => ({
          ...salesRow,
          saleValuePerUnit:
            salesRow.saleValuePerUnit || inherited.saleValuePerUnit || 0,
          saleRatePerM2: salesRow.saleRatePerM2 || inherited.saleRatePerM2 || 0,
        }))
      : inferredRows;
  }
  if (explicitRows.length > 0) return explicitRows;
  return inferredRows;
}

export function calculateHouseTypeSalesQuantity(
  row: AppraisalHouseTypeScheduleRow,
): number {
  const salesRows = getHouseTypeSalesRows(row);
  if (salesRows.length > 0)
    return salesRows.reduce(
      (total, salesRow) => total + clampPositive(salesRow.quantity),
      0,
    );
  if (row.separateSalesQuantity) return clampPositive(row.salesQuantity);
  return clampPositive(row.quantity);
}

export function calculateHouseTypeSalesGifa(
  row: AppraisalHouseTypeScheduleRow,
): number {
  const salesRows = getHouseTypeSalesRows(row);
  if (salesRows.length > 0) {
    return salesRows.reduce(
      (total, salesRow) =>
        total +
        clampPositive(salesRow.quantity) * clampPositive(salesRow.gifaM2),
      0,
    );
  }
  return calculateHouseTypeSalesQuantity(row) * clampPositive(row.gifaM2);
}

function rowPriceIndexFactor(
  rowPriceIndex: unknown,
  programme: AppraisalProgrammeAssumptions | undefined,
) {
  const baseIndex = clampPositive(rowPriceIndex);
  const targetIndex = clampPositive(programme?.appraisalPriceIndex);
  // A library trade rate already based at or beyond the appraisal index is not deflated.
  if (baseIndex > 0 && targetIndex > 0)
    return Math.max(1, targetIndex / baseIndex);
  return 1;
}

export function calculateIndexedHouseTypeConstructionTotal(
  row: AppraisalHouseTypeScheduleRow,
  programme: AppraisalProgrammeAssumptions | undefined,
): number {
  const quantity = clampPositive(row.quantity);
  if (hasNonDefaultHouseTypeComponentCost(row.costBreakdown)) {
    const indexedComponentTotal = (row.costBreakdown || []).reduce(
      (total, component) => {
        if (component.included === false) return total;
        const componentIndex =
          clampPositive(component.priceIndex) ||
          clampPositive(row.priceIndex) ||
          APPRAISAL_HOUSE_TYPE_DEFAULT_PRICE_INDEX;
        return (
          total +
          clampPositive(component.amount) *
            rowPriceIndexFactor(componentIndex, programme)
        );
      },
      0,
    );
    return quantity * indexedComponentTotal;
  }
  const componentFallbackIndex = (row.costBreakdown || [])
    .map((component) => clampPositive(component.priceIndex))
    .find((priceIndex) => priceIndex > 0);
  return (
    calculateHouseTypeConstructionTotal(row) *
    rowPriceIndexFactor(
      componentFallbackIndex ||
        clampPositive(row.priceIndex) ||
        APPRAISAL_HOUSE_TYPE_DEFAULT_PRICE_INDEX,
      programme,
    )
  );
}

function indexedCostAtTargetIndex(
  baseCost: number,
  baseIndex: unknown,
  targetIndex: unknown,
) {
  const validBaseIndex = clampPositive(baseIndex);
  const validTargetIndex = clampPositive(targetIndex);
  if (validBaseIndex <= 0 || validTargetIndex <= 0) return baseCost;
  return baseCost * Math.max(1, validTargetIndex / validBaseIndex);
}

/**
 * Calculates the full movement from each rate's own base index through to the
 * expected site-start index. This is deliberately kept separate from the
 * appraisal-date reference cost so indexation is carried once, in contingency.
 */
function calculateIndexedCostStartDateContingency(
  baseCost: number,
  baseIndex: unknown,
  programme: AppraisalProgrammeAssumptions | undefined,
) {
  const startDateCost = indexedCostAtTargetIndex(
    baseCost,
    baseIndex,
    programme?.startPriceIndex,
  );
  return Math.max(0, startDateCost - baseCost);
}

export function calculateHouseTypeStartPriceIndexContingency(
  row: AppraisalHouseTypeScheduleRow,
  programme: AppraisalProgrammeAssumptions | undefined,
): number {
  const quantity = clampPositive(row.quantity);
  if (hasNonDefaultHouseTypeComponentCost(row.costBreakdown)) {
    return quantity * (row.costBreakdown || []).reduce((total, component) => {
      if (component.included === false) return total;
      const componentIndex =
        clampPositive(component.priceIndex) ||
        clampPositive(row.priceIndex) ||
        APPRAISAL_HOUSE_TYPE_DEFAULT_PRICE_INDEX;
      return total + calculateIndexedCostStartDateContingency(
        clampPositive(component.amount),
        componentIndex,
        programme,
      );
    }, 0);
  }

  const componentFallbackIndex = (row.costBreakdown || [])
    .map((component) => clampPositive(component.priceIndex))
    .find((priceIndex) => priceIndex > 0);
  return calculateIndexedCostStartDateContingency(
    calculateHouseTypeConstructionTotal(row),
    componentFallbackIndex ||
      clampPositive(row.priceIndex) ||
      APPRAISAL_HOUSE_TYPE_DEFAULT_PRICE_INDEX,
    programme,
  );
}

export function calculateHouseTypeGdv(
  row: AppraisalHouseTypeScheduleRow,
): number {
  const salesRows = getHouseTypeSalesRows(row);
  if (salesRows.length > 0) {
    return salesRows.reduce((total, salesRow) => {
      const quantity = clampPositive(salesRow.quantity);
      const saleValuePerUnit = clampPositive(
        salesRow.saleValuePerUnit,
        row.saleValuePerUnit,
      );
      if (saleValuePerUnit > 0) return total + quantity * saleValuePerUnit;
      return (
        total +
        quantity *
          clampPositive(salesRow.gifaM2) *
          clampPositive(salesRow.saleRatePerM2, row.saleRatePerM2)
      );
    }, 0);
  }
  const quantity = calculateHouseTypeSalesQuantity(row);
  const saleValuePerUnit = clampPositive(row.saleValuePerUnit);
  if (saleValuePerUnit > 0) return quantity * saleValuePerUnit;
  return (
    quantity * clampPositive(row.gifaM2) * clampPositive(row.saleRatePerM2)
  );
}

export function calculateLandLbtt(landValue: number): number {
  const price = clampPositive(landValue);
  return (
    (price > 150000 ? Math.min(price - 150000, 100000) * 0.01 : 0) +
    (price > 250000 ? (price - 250000) * 0.045 : 0)
  );
}

function getHouseTypeTotalUnits(option: DevelopmentAppraisalOption): number {
  return (option.houseTypeSchedule || []).reduce(
    (total, row) => total + calculateHouseTypeSalesQuantity(row),
    0,
  );
}

export function deriveScottishWaterBuildingWaterMix(option: DevelopmentAppraisalOption) {
  return (option.houseTypeSchedule || []).reduce((mix, row) => {
    const quantity = calculateHouseTypeSalesQuantity(row);
    const kind = row.configuration && row.configuration !== 'OTHER' ? row.configuration : row.style;
    if (kind === 'FLAT' || kind === 'COTTAGE_FLAT') mix.flats += quantity;
    else if (kind === 'SEMI_DETACHED' || kind === 'TERRACE' || kind === 'END_TERRACE' || kind === 'MID_TERRACE' || kind === 'TOWNHOUSE') mix.semiTerraced += quantity;
    else if (kind === 'DETACHED' || kind === 'VILLA' || kind === 'BUNGALOW' || kind === 'COTTAGE') mix.detached += quantity;
    else mix.unclassified += quantity;
    return mix;
  }, { flats: 0, semiTerraced: 0, detached: 0, unclassified: 0 });
}

function getPrivateHouseTypeUnits(option: DevelopmentAppraisalOption): number {
  return (option.houseTypeSchedule || [])
    .filter((row) => normalizeTenure(row.tenure) === "PRIVATE")
    .reduce((total, row) => total + calculateHouseTypeSalesQuantity(row), 0);
}

function getDriverInputQuantity(
  option: DevelopmentAppraisalOption,
  costDriver: AppraisalInfrastructureCostDriver,
  fallback = 0,
): number {
  const driverInput = (option.siteDimensions || []).find(
    (candidate) =>
      candidate.isCostDriverInput && candidate.costDriver === costDriver,
  );
  return clampPositive(driverInput?.quantity, fallback);
}

export function herasFencingReview(option: DevelopmentAppraisalOption) {
  return calculateHerasFencingPurchase(
    getDriverInputQuantity(option, 'SITE_AREA_M2'),
    option.herasFencingAssumptions,
  );
}

export function herasFencingLinePresentation(row: AppraisalSiteDimensionRow, option: DevelopmentAppraisalOption) {
  if (row.libraryRateId !== HERAS_FENCING_ROW_ID) return null;
  const review = herasFencingReview(option);
  const quantity = review.siteAreaM2 > 0 ? review.siteAreaM2 : 1;
  return {
    label: 'Heras fencing — new stock purchase',
    unit: review.siteAreaM2 > 0 ? 'm2' : 'sum',
    quantity,
    rate: review.newPurchaseCost / quantity,
    notes: `Site-specific effective rate £${review.effectiveRatePerM2.toFixed(2)}/m², not a flat site-area rate. ${review.isPerimeterMeasured ? 'Measured' : 'Area-derived'} perimeter ${review.perimeterM.toFixed(0)} m; ${review.externalFencingM.toFixed(0)} m external plus ${review.internalFencingM.toFixed(0)} m internal fencing; ${review.bayCount} complete 3.5 m bays. Full purchase £${review.fullPurchaseCost.toFixed(2)} (bays £45 each, bracing/ballast/spares £11 per bay, gates/delivery £1,250 where required). ${review.existingStockPercent}% existing stock; ${review.newPurchasePercent}% new purchase. Erection, relocation and removal excluded.`,
  };
}

export interface AppraisalNetDevelopableAreaSummary {
  grossSiteAreaM2: number;
  roadsM2: number;
  pathsM2: number;
  commonLandscapingM2: number;
  plantingM2: number;
  totalDeductionsM2: number;
  netDevelopableAreaM2: number;
  netDevelopableAreaAcres: number;
  netDevelopableAreaHectares: number;
  netDevelopablePercent: number;
  totalUnits: number;
  unitsPerNetAcre: number;
  unitsPerNetHectare: number;
}

export function calculateNetDevelopableArea(
  option: DevelopmentAppraisalOption,
): AppraisalNetDevelopableAreaSummary {
  const grossSiteAreaM2 = getDriverInputQuantity(option, "SITE_AREA_M2");
  const roadsM2 = getDriverInputQuantity(option, "ROADS_M2");
  const pathsM2 = getDriverInputQuantity(option, "PATHS_M2");
  const commonLandscapingM2 = getDriverInputQuantity(
    option,
    "COMMON_LANDSCAPING_M2",
  );
  const plantingM2 = getDriverInputQuantity(option, "PLANTING_M2");
  const totalDeductionsM2 =
    roadsM2 + pathsM2 + commonLandscapingM2 + plantingM2;
  const netDevelopableAreaM2 =
    grossSiteAreaM2 > 0 ? Math.max(0, grossSiteAreaM2 - totalDeductionsM2) : 0;
  const netDevelopableAreaAcres = netDevelopableAreaM2 / 4046.8564224;
  const netDevelopableAreaHectares = netDevelopableAreaM2 / 10000;
  const totalUnits = getHouseTypeTotalUnits(option);
  return {
    grossSiteAreaM2,
    roadsM2,
    pathsM2,
    commonLandscapingM2,
    plantingM2,
    totalDeductionsM2,
    netDevelopableAreaM2,
    netDevelopableAreaAcres,
    netDevelopableAreaHectares,
    netDevelopablePercent:
      grossSiteAreaM2 > 0 ? (netDevelopableAreaM2 / grossSiteAreaM2) * 100 : 0,
    totalUnits,
    unitsPerNetAcre:
      netDevelopableAreaAcres > 0 ? totalUnits / netDevelopableAreaAcres : 0,
    unitsPerNetHectare:
      netDevelopableAreaHectares > 0
        ? totalUnits / netDevelopableAreaHectares
        : 0,
  };
}

/** Land value expressed against the gross site and scheduled dwelling mix. */
export function calculateLandCostBenchmarks(
  landValue: number,
  grossSiteAreaM2: number,
  houseRows: AppraisalHouseTypeScheduleRow[],
) {
  const siteAreaM2 = clampPositive(grossSiteAreaM2);
  const grossAcres = siteAreaM2 / 4046.8564224;
  const grossHectares = siteAreaM2 / 10000;
  let privateUnits = 0;
  let allUnits = 0;
  let privateGifaM2 = 0;
  let allGifaM2 = 0;
  for (const row of houseRows) {
    const units = calculateHouseTypeSalesQuantity(row);
    const gifaM2 = calculateHouseTypeSalesGifa(row);
    allUnits += units;
    allGifaM2 += gifaM2;
    if (normalizeTenure(row.tenure) === 'PRIVATE') {
      privateUnits += units;
      privateGifaM2 += gifaM2;
    }
  }
  const privateGifaFt2 = privateGifaM2 * 10.76391041671;
  const allGifaFt2 = allGifaM2 * 10.76391041671;
  const per = (quantity: number) => quantity > 0 ? landValue / quantity : null;
  return {
    grossAcres,
    grossHectares,
    privateUnits,
    allUnits,
    privateGifaFt2,
    allGifaFt2,
    perGrossAcre: per(grossAcres),
    perGrossHectare: per(grossHectares),
    perPrivateUnit: per(privateUnits),
    perAllUnit: per(allUnits),
    perPrivateGrossFt2: per(privateGifaFt2),
    perAllGrossFt2: per(allGifaFt2),
  };
}

function getProgrammeMonths(option: DevelopmentAppraisalOption): number {
  const manualProgramme = getDriverInputQuantity(option, "PROGRAMME_MONTHS");
  if (manualProgramme > 0) return manualProgramme;
  const programmeSummary = calculateHouseBuildingProgrammeSummary(option);
  if (programmeSummary.programmeMonths > 0)
    return programmeSummary.programmeMonths;
  return clampPositive(option.durationMonths);
}

export function salesMarketingReview(option: DevelopmentAppraisalOption) {
  return calculateSalesMarketingReview({
    privateUnits: getPrivateHouseTypeUnits(option),
    programmeMonths: getProgrammeMonths(option),
    leadInMonths: clampPositive(option.programme?.leadInMonths),
    assumptions: option.salesMarketingAssumptions,
  });
}

export function salesMarketingLinePresentation(row: AppraisalSiteDimensionRow, option: DevelopmentAppraisalOption) {
  if (row.libraryRateId !== SALES_MARKETING_ROW_IDS.showhome && row.libraryRateId !== SALES_MARKETING_ROW_IDS.launch && row.libraryRateId !== SALES_MARKETING_ROW_IDS.ongoing) return null;
  const review = salesMarketingReview(option);
  if (row.libraryRateId === SALES_MARKETING_ROW_IDS.showhome) return {
    label: 'Show Home Fitout', unit: 'sum', quantity: review.showhomeFitout > 0 ? 1 : 0, rate: review.showhomeFitout,
    notes: `One 3–4 bedroom showhome: furniture £14,000; curtains and blinds £6,000; artwork, accessories and soft furnishings £4,000; feature decoration and decorative lighting £2,000${review.assumptions.includeShowhomeFloorCoverings ? '; floor coverings £6,000' : '; floor coverings already allowed in plot construction'}. Interior design, delivery, assembly, installation and buffer are excluded as provided in-house.`,
  };
  if (row.libraryRateId === SALES_MARKETING_ROW_IDS.launch) return {
    label: 'Retired upfront advertising', unit: 'sum', quantity: 0, rate: 0,
    notes: 'Upfront advertising has been removed; advertising is allowed monthly from sales start.',
  };
  if (row.libraryRateId === SALES_MARKETING_ROW_IDS.ongoing) return {
    label: 'Ongoing advertising and marketing', unit: 'month', quantity: review.campaignMonths, rate: review.assumptions.monthlyMarketingRate,
    notes: `Advertising from sales start at site month ${review.campaignStartMonth} to ${review.campaignEndMonth}; stops at the selected campaign end. Property portals, paid digital advertising and ongoing campaign support. Sales staff, showhome, incentives and selling-agent commission are separate.`,
  };
  return null;
}

const SALES_PRELIMS_MONTHLY_RATE_IDS = new Set([
  'awd-prelims-sales-cabins',
  'awd-prelims-sales-assistants',
  'awd-prelims-sales-sundries',
]);

export function salesPrelimsLinePresentation(
  row: AppraisalSiteDimensionRow,
  option: DevelopmentAppraisalOption,
) {
  if (!SALES_PRELIMS_MONTHLY_RATE_IDS.has(row.libraryRateId || '')) return null;
  const programmeMonths = getProgrammeMonths(option);
  const leadInMonths = clampPositive(option.programme?.leadInMonths);
  const showhouseBuildMonths = 4;
  const quantity = getPrivateHouseTypeUnits(option) > 0
    ? Math.max(0, programmeMonths - leadInMonths - showhouseBuildMonths)
    : 0;
  return {
    label: row.label,
    unit: 'month',
    quantity,
    rate: row.rate,
    notes: `${programmeMonths} programme months less ${leadInMonths} lead-in months and ${showhouseBuildMonths} months to build the first showhouse. Sales provision starts thereafter.${row.libraryRateId === 'awd-prelims-sales-sundries' ? ' £250 per operating month covers stationery/printing £60, refreshments £50, cleaning/toilet consumables £40, postage/keys/small items £50 and buffer £50. Sales staff, facility, utilities, professional cleaning, advertising, brochures and purchaser incentives are excluded.' : ''}`,
  };
}

export const SAFETY_PLANT_ROW_IDS = {
  healthAndSafety: 'awd-prelims-health-and-safety',
  externalInspections: 'awd-prelims-external-safety-inspections',
  smallPlant: 'awd-prelims-small-plant',
} as const;

export function normalizeSafetyPlantAssumptions(value: unknown): AppraisalSafetyPlantAssumptions {
  const source = isRecord(value) ? value : {};
  return {
    externalInspectionsRequired: source.externalInspectionsRequired === true,
    inspectionVisitsPerMonth: typeof source.inspectionVisitsPerMonth === 'number' && Number.isFinite(source.inspectionVisitsPerMonth) && source.inspectionVisitsPerMonth >= 0 ? source.inspectionVisitsPerMonth : 1,
    inspectionRatePerVisit: typeof source.inspectionRatePerVisit === 'number' && Number.isFinite(source.inspectionRatePerVisit) && source.inspectionRatePerVisit >= 0 ? source.inspectionRatePerVisit : 250,
  };
}

export function safetyPlantReview(option: DevelopmentAppraisalOption) {
  const months = getProgrammeMonths(option);
  const assumptions = normalizeSafetyPlantAssumptions(option.safetyPlantAssumptions);
  const inspectionVisits = assumptions.externalInspectionsRequired ? months * assumptions.inspectionVisitsPerMonth : 0;
  return {
    months,
    assumptions,
    healthAndSafety: months * 200,
    smallPlant: months * 150,
    inspectionVisits,
    inspections: inspectionVisits * assumptions.inspectionRatePerVisit,
  };
}

export function safetyPlantLinePresentation(row: AppraisalSiteDimensionRow, option: DevelopmentAppraisalOption) {
  if (row.libraryRateId !== SAFETY_PLANT_ROW_IDS.healthAndSafety &&
      row.libraryRateId !== SAFETY_PLANT_ROW_IDS.smallPlant &&
      row.libraryRateId !== SAFETY_PLANT_ROW_IDS.externalInspections) return null;
  const review = safetyPlantReview(option);
  if (row.libraryRateId === SAFETY_PLANT_ROW_IDS.healthAndSafety) return {
    label: 'Health and Safety', unit: 'month', quantity: review.months, rate: 200,
    notes: 'Management-team and visitor PPE, first-aid replenishment, minor safety signage, fire-equipment upkeep and safety consumables. Site-management salaries, adviser fees, external inspections and major shared protection are separate. Excludes VAT.',
  };
  if (row.libraryRateId === SAFETY_PLANT_ROW_IDS.smallPlant) return {
    label: 'Small Plant', unit: 'month', quantity: review.months, rate: 150,
    notes: 'Occasional shared equipment hire, minor tools and replacements for site-management activities. Regular identifiable hires and subcontractor trade equipment are separate. Excludes VAT.',
  };
  if (row.libraryRateId === SAFETY_PLANT_ROW_IDS.externalInspections) return {
    label: 'External H&S inspection visits', unit: 'nr', quantity: review.inspectionVisits, rate: review.assumptions.inspectionRatePerVisit,
    notes: 'Optional external professional site inspections. Visit frequency and fee are selected in Prelims assumptions; no cost unless required. Excludes VAT.',
  };
  return null;
}

export const MINI_SKIPS_ROW_ID = 'awd-prelims-mini-skips';

export function miniSkipsForUnits(units: number): number {
  const dwellings = Math.max(0, Math.floor(Number.isFinite(units) ? units : 0));
  if (dwellings === 0) return 0;
  return Math.min(9, 3 + Math.round((Math.min(dwellings, 20) - 1) * 6 / 19));
}

export function miniSkipsLinePresentation(row: AppraisalSiteDimensionRow, option: DevelopmentAppraisalOption) {
  if (row.libraryRateId !== MINI_SKIPS_ROW_ID) return null;
  const units = getHouseTypeTotalUnits(option);
  return {
    label: 'Mini Skips', unit: 'nr', quantity: miniSkipsForUnits(units), rate: 150,
    notes: `${units} dwellings; 3 mini skips for the smallest sites, rising by whole skips to a maximum of 9 at 20 dwellings. £150 per skip, excluding VAT. Site-wide allowance; trade waste skips are separate.`,
  };
}

export function skipWasteLinePresentation(row: AppraisalSiteDimensionRow, option: DevelopmentAppraisalOption) {
  const id = row.libraryRateId;
  if (id !== SKIP_WASTE_ROW_IDS.loads && id !== SKIP_WASTE_ROW_IDS.segregationHandling && id !== SKIP_WASTE_ROW_IDS.segregationSetup) return null;
  const review = skipWasteReview(option);
  const mode = review.assumptions.segregatedCollection ? 'Segregated collections' : 'Mixed collections';
  if (id === SKIP_WASTE_ROW_IDS.loads) return {
    label: '8-yard equivalent skip loads', unit: 'nr', quantity: review.activeLoads, rate: review.ratePerLoad,
    notes: `${mode}; calculated from the construction count and GIFA of each house type in Prelims assumptions. £325/load mixed default; exclusions include excavated soil, demolition, bulk groundwork and hazardous waste. ${review.reviewCount ? `${review.reviewCount} house type area allowance(s) need review.` : ''}`.trim(),
  };
  if (id === SKIP_WASTE_ROW_IDS.segregationHandling) return {
    label: 'Waste segregation handling', unit: 'nr',
    quantity: review.assumptions.centralCollection && review.assumptions.segregatedCollection ? review.dwellings : 0,
    rate: review.assumptions.segregationHandlingPerDwelling,
    notes: 'Illustrative additional handling per constructed dwelling, only when segregated collection is selected. Confirm against trade scope and site plan.',
  };
  return {
    label: 'Waste segregation setup', unit: 'sum', quantity: review.setupCost > 0 ? 1 : 0,
    rate: review.assumptions.segregationSetupCost,
    notes: 'Illustrative one-off site setup for segregated collection, only when selected. Confirm container arrangements and supplier price.',
  };
}

export function temporaryPowerReview(option: DevelopmentAppraisalOption) {
  const hasMainsRow = (option.siteDimensions || []).some(row => row.libraryRateId === TEMPORARY_POWER_ROW_IDS.mains);
  const hasGeneratorFuelRow = (option.siteDimensions || []).some(row => row.libraryRateId === FUEL_ROW_IDS.accommodationGenerator);
  return calculateTemporaryPowerReview(getProgrammeMonths(option), option.temporaryPower, hasMainsRow, hasGeneratorFuelRow ? normalizeFuelAssumptions(option.fuelAssumptions).accommodationGeneratorMonthly : 0);
}

export function fuelLinePresentation(row: AppraisalSiteDimensionRow, option: DevelopmentAppraisalOption) {
  const fuel = normalizeFuelAssumptions(option.fuelAssumptions);
  if (row.libraryRateId === FUEL_ROW_IDS.telehandler) return {
    label: 'Telehandler diesel fuel', unit: 'month',
    quantity: prelimsResourceMonths(option, 'forklifts') * prelimsResourceCount(option, 'forklifts'),
    rate: fuel.telehandlerMonthly,
    notes: '£600 per active telehandler-month by default; forklift count and on-site months match the forklift hire allowance, excluding the lead-in. Fuel only; hire, service and AdBlue are separate. Budget basis: 3.5 engine hours/day × 22 days × 4.6 litres/hour at £1.70/litre ex VAT.',
  };
  if (row.libraryRateId === FUEL_ROW_IDS.accommodationGenerator) return {
    label: 'Site-accommodation generator diesel fuel', unit: 'month',
    quantity: temporaryPowerReview(option).dieselMonths,
    rate: fuel.accommodationGeneratorMonthly,
    notes: '£850 per generator month by default. Stops when the selected temporary-power route switches to mains. Fuel only; generator and tank hire/purchase are separate. Budget basis: 10 hours/day × 22 days × 2.2 litres/hour at £1.70/litre ex VAT, with allowance for load variation.',
  };
  if (row.libraryRateId === FUEL_ROW_IDS.siloGenerator) return {
    label: 'Silo generator diesel fuel', unit: 'month',
    quantity: siloGeneratorReview(option).activeGeneratorMonths,
    rate: fuel.siloGeneratorMonthly,
    notes: 'Fuel for active mortar-silo generator months only, excluding lead-in and any period supplied from suitable mains. £330/month provisional basis: about 4 running hours/day × 22 days × 2.2 litres/hour × £1.70/litre excluding VAT. Separate from generator ownership/hire, telehandler fuel and site-office fuel.',
  };
  return null;
}

export function siloGeneratorReview(option: DevelopmentAppraisalOption) {
  return calculateSiloGeneratorReview({
    dwellings: getHouseTypeTotalUnits(option),
    buildRateUnitsPerMonth: getBuildRateUnitsPerMonth(option),
    programmeMonths: getProgrammeMonths(option),
    leadInMonths: clampPositive(option.programme?.leadInMonths),
    longestHouseBuildMonths: Math.max(0, ...(option.houseTypeSchedule || []).map(row => clampPositive(row.buildPeriodMonths))),
    fuelPerActiveMonth: normalizeFuelAssumptions(option.fuelAssumptions).siloGeneratorMonthly,
    assumptions: option.siloGeneratorAssumptions,
    legacyPurchaseCostBasis: Boolean(option.frozenMetrics && option.siloGeneratorAssumptions?.costBasisVersion !== 2),
  });
}

export function siloGeneratorLinePresentation(row: AppraisalSiteDimensionRow, option: DevelopmentAppraisalOption) {
  if (row.libraryRateId !== SILO_GENERATOR_ROW_ID) return null;
  const review = siloGeneratorReview(option);
  const a = review.assumptions;
  const purchaseByConstructionMonth = review.route === 'PURCHASE' && !review.legacyPurchaseCostBasis;
  const displayedMonths = purchaseByConstructionMonth ? review.constructionMonths : review.activeGeneratorMonths;
  return {
    label: `Silo generator — ${review.route === 'PURCHASE' ? 'purchase/reuse' : review.route === 'HIRE' ? 'hire' : 'pending construction programme'}`,
    unit: 'month', quantity: displayedMonths,
    rate: displayedMonths > 0 ? review.selectedCost / displayedMonths : 0,
    notes: `${review.dwellings} dwellings; ${review.constructionMonths} construction months after lead-in; ${review.activeGeneratorMonths} active mortar-generator months (${a.activeMortarMonths === undefined ? `${a.activePercent}% provisional` : 'entered period'})${a.suitableMainsFromSiteMonth === undefined ? '' : `; suitable mains from site month ${a.suitableMainsFromSiteMonth}`}. Purchase/reuse £${review.purchaseCost.toFixed(2)} (${review.legacyPurchaseCostBasis ? `historical one-site net capital £${review.netCapitalCost.toFixed(2)}` : `£${review.netCapitalCost.toFixed(2)} net capital spread over ${review.productiveReuseMonths} productive months`} plus £${review.ownershipOtherCostPerActiveMonth.toFixed(2)}/active month); hire £${review.hireCost.toFixed(2)} at £${a.hirePerActiveMonth.toFixed(2)}/active month. Lower cost selected. Diesel is a separate Prelims line.`,
  };
}

export function temporaryPowerLinePresentation(row: AppraisalSiteDimensionRow, option: DevelopmentAppraisalOption) {
  const id = row.libraryRateId;
  if ((id === ADDITIONAL_SITE_POWER_ROW_IDS.generator || id === ADDITIONAL_SITE_POWER_ROW_IDS.tank) && (option.siteDimensions || []).some(item => item.libraryRateId === TEMPORARY_POWER_ROW_IDS.generator)) {
    return { label: id === ADDITIONAL_SITE_POWER_ROW_IDS.generator ? 'Additional site-operations generator' : 'Additional site-operations fuel tank', unit: 'sum', quantity: 0, rate: 0, notes: 'No separate base allowance: the site-office generator and tank are costed together under Site accommodation. Use a manual adjustment for distinct additional plant.' };
  }
  if (id !== TEMPORARY_POWER_ROW_IDS.generator && id !== TEMPORARY_POWER_ROW_IDS.tank && id !== TEMPORARY_POWER_ROW_IDS.mains && id !== TEMPORARY_POWER_ROW_IDS.mainsElectricity) return null;
  const review = temporaryPowerReview(option);
  const settings = normalizeTemporaryPower(option.temporaryPower);
  if (id === TEMPORARY_POWER_ROW_IDS.mainsElectricity) return {
    label: 'Site-office mains electricity', unit: 'month', quantity: review.mainsMonths,
    rate: settings.mainsElectricityKwhPerMonth * settings.mainsElectricityRatePerKwh,
    notes: `${settings.mainsElectricityKwhPerMonth.toLocaleString('en-GB')} kWh/month × £${settings.mainsElectricityRatePerKwh.toFixed(3)}/kWh, from the selected mains connection to site completion. A provisional site-office budget; replace with metered consumption and the supplier tariff. Excludes plot-heating electricity. Generator fuel stops when this line starts.`,
  };
  const hire = review.strategy.startsWith('HIRE');
  const isGenerator = id === TEMPORARY_POWER_ROW_IDS.generator;
  const isMains = id === TEMPORARY_POWER_ROW_IDS.mains;
  return {
    label: isMains ? 'Permanent power connection' : isGenerator ? '20 kVA site office generator' : '1,000-litre static bunded fuel tank',
    unit: hire && !isMains ? 'month' : 'sum',
    quantity: isMains ? review.mains > 0 ? 1 : 0 : hire ? review.dieselMonths : 1,
    rate: isMains ? settings.permanentPowerCost : hire ? (isGenerator ? settings.generatorHirePerWeek : settings.tankHirePerWeek) * 52 / 12 : isGenerator ? settings.generatorPurchase : settings.tankPurchase,
    notes: isMains ? review.mains > 0 ? `Mains connection from programme month ${settings.mainsAvailableMonth}; selected with generator and tank hire/purchase.` : 'Not selected: continuing generator and tank provision costs less over the site programme.' : `${hire ? 'Hire' : 'Purchase and setup'} as one generator and tank package; diesel provision ${review.dieselMonths} programme months. Fuel is separate.`,
  };
}

export function siteAccommodationWaterReview(option: DevelopmentAppraisalOption) {
  const hasConnectionRows = (option.siteDimensions || []).some(row => row.libraryRateId === DRINKING_WATER_ROW_IDS.connection)
    && (option.siteDimensions || []).some(row => row.libraryRateId === DRINKING_WATER_ROW_IDS.mainsService);
  const settings = normalizeDrinkingWater(option.drinkingWater);
  return drinkingWaterReview(getProgrammeMonths(option), hasConnectionRows ? settings : { ...settings, connectionArrangement: 'NO_MAINS' });
}

export function siteAccommodationLinePresentation(row: AppraisalSiteDimensionRow, option: DevelopmentAppraisalOption) {
  const id = row.libraryRateId;
  if (id !== 'awd-prelims-rates' && id !== 'awd-prelims-furniture' && id !== 'awd-prelims-general-repairs' && id !== 'awd-prelims-electricity-phones-bt' &&
      id !== DRINKING_WATER_ROW_IDS.bottled && id !== DRINKING_WATER_ROW_IDS.connection &&
      id !== DRINKING_WATER_ROW_IDS.mainsService) return null;
  if (id === 'awd-prelims-electricity-phones-bt') return {
    label: 'Site communications — mobiles and Starlink', unit: 'month', quantity: getProgrammeMonths(option), rate: 150,
    notes: '£70/month for two company mobiles including modest handset provision, £70/month for one Starlink subscription and £10/month for tariff increases and incidental charges. Excludes site-office and plot electricity, generator fuel, and any one-off Starlink equipment or mounting.' + (row.manualAdjustment ? ' Review the carried manual adjustment: this line previously included electricity.' : ''),
  };
  if (id === 'awd-prelims-general-repairs') return {
    label: 'General Repairs', unit: 'month', quantity: getProgrammeMonths(option), rate: 200,
    notes: '£200 per programme month for minor repairs to cabins, fittings, locks, minor plumbing and common compound facilities. House snagging, subcontractor defects, generator servicing and forklift repairs are separate. Check the cabin hire agreement for routine maintenance already included.',
  };
  if (id === 'awd-prelims-furniture') return { label: 'Furniture', unit: 'sum', quantity: 1, rate: 0, notes: 'Included with cabin provision; no separate base allowance.' };
  if (id === 'awd-prelims-rates') return { label: 'Cabin rates', unit: 'month', quantity: getProgrammeMonths(option), rate: 150, notes: '£150 per programme month.' };
  const review = siteAccommodationWaterReview(option);
  const settings = normalizeDrinkingWater(option.drinkingWater);
  if (id === DRINKING_WATER_ROW_IDS.bottled) return {
    label: 'Bottled drinking water and dispenser', unit: 'month', quantity: review.bottledMonths, rate: review.bottleRate,
    notes: `Average ${settings.averagePeople} cabin occupants; 2 litres/person/day over 22 days, 18.9-litre bottles at £9 plus £25 dispenser hire, rounded to a £50 monthly increment. Selected for ${review.bottledMonths} months.`,
  };
  if (id === DRINKING_WATER_ROW_IDS.connection) return {
    label: 'Potable mains connection to site cabins', unit: 'sum', quantity: review.connectionCost > 0 ? 1 : 0, rate: review.connectionCost,
    notes: review.method === 'BOTTLED_THEN_MAINS' ? `Selected ${settings.connectionArrangement.toLowerCase().replaceAll('_', ' ')} connection after month ${settings.mainsAvailableMonth}; confirm the site-specific scope and quote. This excludes the development's plot-water main.` : 'Not selected: bottled water for the full programme costs less, or a potable connection is unavailable.',
  };
  return {
    label: 'Site-cabin potable mains standing and usage', unit: 'month', quantity: review.mainsMonths, rate: settings.mainsMonthlyCost,
    notes: 'Provisional post-commissioning site-accommodation water and sewerage charges; separate from Scottish Water building-water charges. Replace with the applicable meter/usage quotation.',
  };
}

export function plotHeatingLinePresentation(row: AppraisalSiteDimensionRow, option: DevelopmentAppraisalOption) {
  const id = row.libraryRateId;
  if (id !== PLOT_HEATING_ROW_IDS.purchase && id !== PLOT_HEATING_ROW_IDS.hire && id !== PLOT_HEATING_ROW_IDS.electricity) return null;
  const review = plotHeatingReview(option);
  const a = review.assumptions;
  const basis = `${review.dwellings} homes over ${review.buildMonths} construction months (${review.buildRate.toFixed(2)}/month); ${a.weeksPerHouse} heating weeks/home, ${a.heatersPerHouse} heaters/home, November–March only. ${review.provisional ? 'Programme start date missing: winter exposure provisionally estimated at 5/12 of the build period.' : 'Winter exposure follows the programme start date and lead-in.'}`;
  if (id === PLOT_HEATING_ROW_IDS.purchase) return {
    label: 'Plot heaters — purchase fleet', unit: 'nr', quantity: review.purchaseFleet, rate: a.purchasePerHeater,
    notes: `${basis} ${review.coreHeaters} working heaters bought with ${a.sparePercent}% spares. Equipment decision compares purchase with hire over the site programme. Distribution, delivery, testing and repairs are separate.`,
  };
  if (id === PLOT_HEATING_ROW_IDS.hire) return {
    label: 'Plot heaters — peak hire', unit: 'week', quantity: review.hireHeaterWeeks, rate: a.hirePerHeaterWeek,
    notes: `${basis} Additional heater-weeks above the purchased core. Obtain a site-specific fleet hire quotation.`,
  };
  return {
    label: 'Plot-heating electricity', unit: 'kWh', quantity: review.electricityKwh, rate: a.electricityPerKwh,
    notes: `${basis} Working heater-days × ${a.heaterKw} kW × ${a.hoursPerDay} h/day × ${a.thermostatDutyPercent}% thermostat duty. Plot electricity is separate from site-office generator fuel; confirm available mains capacity and tariff.`,
  };
}

function getBuildRateUnitsPerMonth(option: DevelopmentAppraisalOption): number {
  const manualBuildRate = getDriverInputQuantity(
    option,
    "BUILD_RATE_UNITS_PER_MONTH",
  );
  if (manualBuildRate > 0) return manualBuildRate;
  return clampPositive(option.programme?.saleRateUnitsPerMonth);
}

function getStandardHouseTypeCount(option: DevelopmentAppraisalOption): number {
  const manualCount = getDriverInputQuantity(
    option,
    "STANDARD_HOUSE_TYPE_COUNT",
  );
  if (manualCount > 0) return manualCount;
  return (option.houseTypeSchedule || []).filter(
    (row) => row.quantity > 0 || row.gifaM2 > 0 || row.houseTypeName.trim(),
  ).length;
}

function getNonStandardHouseTypeCount(
  option: DevelopmentAppraisalOption,
): number {
  return getDriverInputQuantity(option, "NON_STANDARD_HOUSE_TYPE_COUNT");
}

function getSummaryBuildCost(option: DevelopmentAppraisalOption): number {
  const manualBuildCost = getDriverInputQuantity(option, "SUMMARY_BUILD_COST");
  if (manualBuildCost > 0) return manualBuildCost;
  const houseCost = (option.houseTypeSchedule || []).reduce(
    (total, row) =>
      total + calculateIndexedHouseTypeConstructionTotal(row, option.programme),
    0,
  );
  const nonPrelimSiteCost = (option.siteDimensions || [])
    .filter(
      (row) =>
        row.id &&
        row.id !== "" &&
        !row.libraryRateId?.startsWith("awd-prelims-"),
    )
    .filter((row) => !row.isCostDriverInput && isActiveSiteSourceRow(row, option))
    .reduce(
      (total, row) => total + calculateSiteDimensionTotal(row, option),
      0,
    );
  return houseCost + nonPrelimSiteCost;
}

function getTotalGdv(option: DevelopmentAppraisalOption): number {
  return (option.houseTypeSchedule || []).reduce(
    (total, row) => total + calculateHouseTypeGdv(row),
    0,
  );
}

function calculateEngineersFeesFormula(
  option: DevelopmentAppraisalOption,
): number {
  if (option.engineeringScope?.confirmedAt) return engineeringScopeReview(option).normal;
  // Frozen revisions retain the allowance that was captured when they were issued.
  if (option.frozenMetrics) return (
    14600 +
    530 * getHouseTypeTotalUnits(option) +
    getStandardHouseTypeCount(option) +
    1200 * getNonStandardHouseTypeCount(option) +
    150 * getProgrammeMonths(option)
  );
  return 0;
}

function calculatePlanningFeesFormula(
  option: DevelopmentAppraisalOption,
): number {
  return calculateScottishStatutoryFees2026(option).planningFee;
}

function calculateBuildingWarrantFormula(
  option: DevelopmentAppraisalOption,
): number {
  return calculateScottishStatutoryFees2026(option).warrant.payable;
}

export function calculateScottishStatutoryFees2026(option: DevelopmentAppraisalOption) {
  const settings = option.scottishStatutoryFees;
  const dwellings = getHouseTypeTotalUnits(option);
  const planningApplication = settings?.planningApplication || 'FULL_NEW_DWELLINGS';
  const siteAreaM2 = getDriverInputQuantity(option, 'SITE_AREA_M2');
  const planningFee = planningApplication === 'MANUAL' ? clampPositive(settings?.planningManualFee)
    : planningApplication === 'PPP_NEW_DWELLINGS' ? scottishResidentialPppFee2026(dwellings, siteAreaM2)
    : scottishResidentialPlanningFee2026(dwellings);
  const warrantProxyValue = (option.houseTypeSchedule || []).reduce(
    (sum, row) => sum + calculateIndexedHouseTypeConstructionTotal(row, option.programme), 0);
  const savedWarrantBasis = getDriverInputQuantity(option, 'BUILDING_WARRANT_COST_BASIS');
  const warrantValueIsManual = settings?.warrantValueOfWorks !== undefined;
  const warrantValueOfWorks = warrantValueIsManual ? clampPositive(settings.warrantValueOfWorks)
    : savedWarrantBasis > 0 ? savedWarrantBasis : warrantProxyValue;
  const warrant = scottishBuildingWarrantFee2026(warrantValueOfWorks, settings?.warrantCertificates);
  return { dwellings, planningApplication, siteAreaM2, planningFee, warrantProxyValue,
    warrantValueIsManual, warrantSource: warrantValueIsManual ? 'MANUAL' as const : savedWarrantBasis > 0 ? 'BASE_MEASURE' as const : 'HOUSE_PROXY' as const, warrant };
}

export function isScottishStatutoryFeeRow(row: AppraisalSiteDimensionRow) {
  return row.costDriver === 'PLANNING_FEES_FORMULA' || row.costDriver === 'BUILDING_WARRANT_FORMULA';
}

/** Statutory 2026 cash fees are not escalated by the construction price index. */
export function siteDimensionEffectivePriceIndex(row: AppraisalSiteDimensionRow, option?: DevelopmentAppraisalOption): number {
  if (isScottishStatutoryFeeRow(row)) return 0;
  if (row.libraryRateId?.startsWith('awd-prelims-scottish-water-')) return 0;
  if (row.costDriver === 'RCC_FEES_FORMULA' && option) {
    const status = rccFeeReview(option).status;
    if (status === 'CALCULATED' || status === 'MANUAL' || status === 'NOT_REQUIRED' || status === 'BUDGET') return 0;
  }
  return row.priceIndex;
}

function calculateLegacyRccFormula(option: DevelopmentAppraisalOption): number {
  const roadsM2 = getDriverInputQuantity(option, "ROADS_M2");
  const roadUnits = roadsM2 / 5;
  return (
    500 + Math.min(roadUnits, 100) * 35 + Math.max(roadUnits - 100, 0) * 20
  );
}

export function rccFeeReview(option: DevelopmentAppraisalOption) {
  return calculateScottishRccFee(option.rccFees,
    getDriverInputQuantity(option, 'ROADS_M2'),
    getDriverInputQuantity(option, 'PATHS_M2'),
    getHouseTypeTotalUnits(option),
    rccRoadConstructionCostProxy(option));
}

/** Priced roads/path work is a provisional fee driver, never the road-bond security itself. */
export function rccRoadConstructionCostProxy(option: DevelopmentAppraisalOption): number {
  const roadPathIds = new Set<string>(ROADS_PATHS_ALLOWANCES
    .filter(item => item.id !== 'awd-infrastructure-road-markings').map(item => item.id));
  return (option.siteDimensions || [])
    .filter(row => !row.isCostDriverInput && row.libraryRateId && roadPathIds.has(row.libraryRateId))
    .reduce((sum, row) => sum + Math.max(0, calculateSiteDimensionBaseTotal(row, option)), 0);
}

export function surveyReportsReview(option: DevelopmentAppraisalOption) {
  return calculateSurveyReportSchedule(getDriverInputQuantity(option, 'SITE_AREA_M2'), option.surveyReports);
}

export const PRELIMS_SURVEY_RATE_PREFIX = 'awd-prelims-survey-';
const LEGACY_SITE_INVESTIGATIONS_ID = 'awd-prelims-site-investigations';
const CARRIED_SURVEY_ADJUSTMENT_ID = `${PRELIMS_SURVEY_RATE_PREFIX}carried-adjustment`;

/** Keep the fixed Prelims bill in step with the applied survey choices. */
export function syncSurveyReportBillRows(option: DevelopmentAppraisalOption): DevelopmentAppraisalOption {
  const rows = option.siteDimensions || [];
  if (!option.surveyReports?.confirmedAt) {
    if (!rows.some(row => row.libraryRateId === LEGACY_SITE_INVESTIGATIONS_ID)) return option;
    return { ...option, siteDimensions: rows.map(row => row.libraryRateId === LEGACY_SITE_INVESTIGATIONS_ID
      ? { ...row, label: 'Surveys and reports — prior allowance (review required)' } : row) };
  }
  const previous = new Map(rows.filter(row => row.libraryRateId?.startsWith(PRELIMS_SURVEY_RATE_PREFIX))
    .map(row => [row.libraryRateId!, row]));
  const legacy = rows.find(row => row.libraryRateId === LEGACY_SITE_INVESTIGATIONS_ID);
  const retained = rows.filter(row => row.libraryRateId !== LEGACY_SITE_INVESTIGATIONS_ID
    && !row.libraryRateId?.startsWith(PRELIMS_SURVEY_RATE_PREFIX));
  const selected = surveyReportsReview(option).rows.filter(row => row.included).map(row => {
    const libraryRateId = `${PRELIMS_SURVEY_RATE_PREFIX}${row.id}`;
    const existing = previous.get(libraryRateId);
    return createSiteDimensionRow({
      ...existing,
      libraryRateId,
      label: row.label,
      category: 'OTHER',
      costDriver: 'FIXED_SUM',
      unit: 'sum',
      quantity: 1,
      rate: row.amount,
      priceIndex: 233,
      sourceFormula: row.amountBasis === 'QUOTE'
        ? `Uploaded quote ${row.quote!.fileName}: £${row.amount} excluding VAT`
        : `Budget: £${row.baseFee} + gross site area × £${row.ratePerM2}/m²`,
      sourceRow: 'Prelims assumptions — Surveys and reports',
      notes: [row.scope, row.amountBasis === 'QUOTE' ? `Quoted amount ${row.amount.toFixed(2)} from ${row.quote!.fileName}.` : 'Budget allowance pending quote.', row.note].filter(Boolean).join(' '),
    });
  });
  const carriedAdjustment = previous.get(CARRIED_SURVEY_ADJUSTMENT_ID);
  const adjustment = carriedAdjustment?.manualAdjustment ?? legacy?.manualAdjustment ?? 0;
  if (adjustment) selected.push(createSiteDimensionRow({
    ...carriedAdjustment,
    libraryRateId: CARRIED_SURVEY_ADJUSTMENT_ID,
    label: 'Surveys and reports — carried manual adjustment',
    category: 'OTHER', costDriver: 'FIXED_SUM', unit: 'sum', quantity: 1,
    rate: 0, manualAdjustment: adjustment, priceIndex: 233,
    sourceRow: 'Prelims assumptions — Surveys and reports',
    notes: 'Manual adjustment carried from the former site-investigations allowance; review against the selected reports.',
  }));
  return { ...option, siteDimensions: [...retained, ...selected] };
}

function calculateLabourersFormula(option: DevelopmentAppraisalOption): number {
  return prelimsResourceMonths(option, 'labourers') * prelimsResourceCount(option, 'labourers');
}

export function prelimsResourceCount(option: DevelopmentAppraisalOption, key: keyof AppraisalPrelimsResourceCounts): number {
  const selected = option.prelimsResourceCounts?.[key];
  if (typeof selected === 'number' && Number.isFinite(selected) && selected >= 0)
    return Math.floor(selected);
  if (key === 'siteManagers') return 1;
  if (key === 'assistantSiteManagers') return getBuildRateUnitsPerMonth(option) > 2 ? 1 : 0;
  return getBuildRateResourceMultiplier(option);
}

export function prelimsResourceMonths(option: DevelopmentAppraisalOption, key: keyof AppraisalPrelimsResourceCounts): number {
  const months = getProgrammeMonths(option);
  return key === 'forklifts' || key === 'forkliftDrivers'
    ? Math.max(0, months - clampPositiveInt(option.programme?.leadInMonths))
    : months;
}

function calculateAssistantSiteManagerFormula(
  option: DevelopmentAppraisalOption,
): number {
  return prelimsResourceMonths(option, 'assistantSiteManagers') * prelimsResourceCount(option, 'assistantSiteManagers');
}

function getBuildRateResourceMultiplier(
  option: DevelopmentAppraisalOption,
): number {
  return getBuildRateUnitsPerMonth(option) > 2 ? 2 : 1;
}

function calculateForkliftDriverFormula(
  option: DevelopmentAppraisalOption,
): number {
  return prelimsResourceMonths(option, 'forkliftDrivers') * prelimsResourceCount(option, 'forkliftDrivers');
}

function calculateForkliftsFormula(option: DevelopmentAppraisalOption): number {
  return prelimsResourceMonths(option, 'forklifts') * prelimsResourceCount(option, 'forklifts');
}

function findGardenWallsBaseRow(
  option: DevelopmentAppraisalOption,
  currentRowId?: string,
): AppraisalSiteDimensionRow | undefined {
  return (option.siteDimensions || []).find(
    (row) =>
      row.id !== currentRowId &&
      !row.isCostDriverInput &&
      (row.libraryRateId === "awd-infrastructure-garden-walls" ||
        row.label.trim().toLowerCase() === "garden walls"),
  );
}

function isAwdSalesPrelimsRow(row: AppraisalSiteDimensionRow) {
  return AWD_SALES_PRELIMS_RATE_IDS.has(row.libraryRateId || "");
}

export function resolveSiteDimensionQuantity(
  row: AppraisalSiteDimensionRow,
  option?: DevelopmentAppraisalOption,
  resolvingRowIds: Set<string> = new Set(),
): number {
  if (option) {
    if (option.unpricedOutlineUntilSiteInputs && row.libraryRateId?.startsWith('awd-prelims-')
      && getHouseTypeTotalUnits(option) === 0
      && !(option.siteDimensions || []).some(item => item.isCostDriverInput && (Number(item.quantity) || 0) > 0)) return 0;
    const siloLine = siloGeneratorLinePresentation(row, option);
    if (siloLine) return siloLine.quantity;
    const marketingLine = salesMarketingLinePresentation(row, option);
    if (marketingLine) return marketingLine.quantity;
    const herasLine = herasFencingLinePresentation(row, option);
    if (herasLine) return herasLine.quantity;
    const salesLine = salesPrelimsLinePresentation(row, option);
    if (salesLine) return salesLine.quantity;
    const waterLine = siteAccommodationLinePresentation(row, option);
    if (waterLine) return waterLine.quantity;
    const fuelLine = fuelLinePresentation(row, option);
    if (fuelLine) return fuelLine.quantity;
    const safetyLine = safetyPlantLinePresentation(row, option);
    if (safetyLine) return safetyLine.quantity;
    const miniSkipsLine = miniSkipsLinePresentation(row, option);
    if (miniSkipsLine) return miniSkipsLine.quantity;
    const skipWasteLine = skipWasteLinePresentation(row, option);
    if (skipWasteLine) return skipWasteLine.quantity;
    const heatingLine = plotHeatingLinePresentation(row, option);
    if (heatingLine) return heatingLine.quantity;
  }
  if (option && Object.values(TEMPORARY_POWER_ROW_IDS).includes(row.libraryRateId as typeof TEMPORARY_POWER_ROW_IDS[keyof typeof TEMPORARY_POWER_ROW_IDS])) {
    const review = temporaryPowerReview(option);
    if (row.libraryRateId === TEMPORARY_POWER_ROW_IDS.mainsElectricity) return review.mainsMonths;
    if (row.libraryRateId === TEMPORARY_POWER_ROW_IDS.mains) return review.mains > 0 ? 1 : 0;
    return review.strategy.startsWith('HIRE') ? review.dieselMonths : 1;
  }
  if (row.costDriver === "FIXED_SUM") return 1;
  if (!option || !row.costDriver || row.isCostDriverInput)
    return clampPositive(row.quantity);

  if (row.libraryRateId?.startsWith('awd-prelims-scottish-water-')) return 1;
  if (row.libraryRateId === 'awd-prelims-forklift-repairs') return calculateForkliftsFormula(option);
  if (row.costDriver === "TOTAL_UNITS") return getHouseTypeTotalUnits(option);
  if (row.costDriver === "PROGRAMME_MONTHS") return getProgrammeMonths(option) * (row.libraryRateId === 'awd-prelims-site-manager' ? prelimsResourceCount(option, 'siteManagers') : 1);
  if (row.costDriver === "BUILD_RATE_UNITS_PER_MONTH")
    return getBuildRateUnitsPerMonth(option);
  if (row.costDriver === "STANDARD_HOUSE_TYPE_COUNT")
    return getStandardHouseTypeCount(option);
  if (row.costDriver === "NON_STANDARD_HOUSE_TYPE_COUNT")
    return getNonStandardHouseTypeCount(option);
  if (row.costDriver === "SUMMARY_BUILD_COST")
    return getSummaryBuildCost(option);
  if (row.costDriver === "TOTAL_GDV") return getTotalGdv(option);
  if (row.costDriver === "BUILDING_WARRANT_COST_BASIS")
    return getDriverInputQuantity(
      option,
      "BUILDING_WARRANT_COST_BASIS",
      getSummaryBuildCost(option),
    );
  if (row.costDriver === "ENGINEERS_FEES_FORMULA")
    return calculateEngineersFeesFormula(option);
  if (row.costDriver === "PLANNING_FEES_FORMULA")
    return calculatePlanningFeesFormula(option);
  if (row.costDriver === "BUILDING_WARRANT_FORMULA")
    return calculateBuildingWarrantFormula(option);
  if (row.costDriver === "RCC_FEES_FORMULA") return row.libraryRateId === 'awd-prelims-rcc-inspection'
    ? rccFeeReview(option).inspectionFee ?? 0 : rccFeeReview(option).applicationFee ?? rccFeeReview(option).fee;
  if (row.costDriver === "ASSISTANT_SITE_MANAGER_FORMULA")
    return calculateAssistantSiteManagerFormula(option);
  if (row.costDriver === "FORKLIFT_DRIVER_FORMULA")
    return calculateForkliftDriverFormula(option);
  if (row.costDriver === "FORKLIFTS_FORMULA")
    return calculateForkliftsFormula(option);
  if (row.costDriver === "LABOURERS_FORMULA")
    return calculateLabourersFormula(option);
  if (row.costDriver === "SCOTTISH_WATER_REBATE_FORMULA") return 1;
  if (row.costDriver === "GARDEN_WALLS_BASE_COST") {
    const gardenWallsRow = findGardenWallsBaseRow(option, row.id);
    if (gardenWallsRow && !resolvingRowIds.has(gardenWallsRow.id)) {
      const nextResolving = new Set(resolvingRowIds);
      nextResolving.add(row.id);
      return calculateSiteDimensionTotal(gardenWallsRow, option, nextResolving);
    }
    return getDriverInputQuantity(option, "GARDEN_WALLS_M") * 152;
  }

  const driverInput = (option.siteDimensions || []).find(
    (candidate) =>
      candidate.isCostDriverInput && candidate.costDriver === row.costDriver,
  );
  return clampPositive(driverInput?.quantity, row.quantity);
}

export function calculateSiteDimensionBaseTotal(
  row: AppraisalSiteDimensionRow,
  option?: DevelopmentAppraisalOption,
  resolvingRowIds: Set<string> = new Set(),
): number {
  if (option) {
    if (option.unpricedOutlineUntilSiteInputs && row.libraryRateId?.startsWith('awd-prelims-')
      && getHouseTypeTotalUnits(option) === 0
      && !(option.siteDimensions || []).some(item => item.isCostDriverInput && (Number(item.quantity) || 0) > 0)) return 0;
    if (row.libraryRateId === SILO_GENERATOR_ROW_ID) return siloGeneratorReview(option).selectedCost;
    const marketingLine = salesMarketingLinePresentation(row, option);
    if (marketingLine) return marketingLine.quantity * marketingLine.rate;
    if (row.libraryRateId === HERAS_FENCING_ROW_ID) return herasFencingReview(option).newPurchaseCost;
    const waterLine = siteAccommodationLinePresentation(row, option);
    if (waterLine) return waterLine.quantity * waterLine.rate;
    const fuelLine = fuelLinePresentation(row, option);
    if (fuelLine) return fuelLine.quantity * fuelLine.rate;
    const safetyLine = safetyPlantLinePresentation(row, option);
    if (safetyLine) return safetyLine.quantity * safetyLine.rate;
    const miniSkipsLine = miniSkipsLinePresentation(row, option);
    if (miniSkipsLine) return miniSkipsLine.quantity * miniSkipsLine.rate;
    const skipWasteLine = skipWasteLinePresentation(row, option);
    if (skipWasteLine) return skipWasteLine.quantity * skipWasteLine.rate;
    const heatingLine = plotHeatingLinePresentation(row, option);
    if (heatingLine) return heatingLine.quantity * heatingLine.rate;
  }
  if (option && (row.libraryRateId === ADDITIONAL_SITE_POWER_ROW_IDS.generator || row.libraryRateId === ADDITIONAL_SITE_POWER_ROW_IDS.tank) && (option.siteDimensions || []).some(item => item.libraryRateId === TEMPORARY_POWER_ROW_IDS.generator)) return 0;
  if (option && Object.values(TEMPORARY_POWER_ROW_IDS).includes(row.libraryRateId as typeof TEMPORARY_POWER_ROW_IDS[keyof typeof TEMPORARY_POWER_ROW_IDS])) {
    const review = temporaryPowerReview(option);
    if (row.libraryRateId === TEMPORARY_POWER_ROW_IDS.mainsElectricity) return review.mainsElectricity;
    if (row.libraryRateId === TEMPORARY_POWER_ROW_IDS.generator) return review.generator;
    if (row.libraryRateId === TEMPORARY_POWER_ROW_IDS.tank) return review.tank;
    return review.mains;
  }
  if (option && row.libraryRateId?.startsWith(PRELIMS_SURVEY_RATE_PREFIX)) {
    if (row.libraryRateId === CARRIED_SURVEY_ADJUSTMENT_ID) return 0;
    return surveyReportsReview(option).rows.find(item => `${PRELIMS_SURVEY_RATE_PREFIX}${item.id}` === row.libraryRateId)?.amount ?? 0;
  }
  if (option && row.libraryRateId?.startsWith('awd-prelims-scottish-water-')) {
    const fees = calculateScottishWaterFees2026(getHouseTypeTotalUnits(option), option.scottishWaterFees, deriveScottishWaterBuildingWaterMix(option));
    if (row.libraryRateId === 'awd-prelims-scottish-water-charges') return fees.charges;
    if (row.libraryRateId === 'awd-prelims-scottish-water-rebates') return fees.wastewaterRebate;
    if (row.libraryRateId === 'awd-prelims-scottish-water-connections') return fees.connections;
  }
  if (option && isScottishStatutoryFeeRow(row))
    return row.costDriver === 'PLANNING_FEES_FORMULA'
      ? calculatePlanningFeesFormula(option) : calculateBuildingWarrantFormula(option);
  if (option && row.costDriver === 'RCC_FEES_FORMULA') {
    const review = rccFeeReview(option);
    if (review.status === 'CALCULATED' || review.status === 'MANUAL' || review.status === 'NOT_REQUIRED' || review.status === 'BUDGET')
      return row.libraryRateId === 'awd-prelims-rcc-inspection' ? review.inspectionFee ?? 0 : review.applicationFee ?? review.fee;
  }
  // The scope is the entire Prelims fee. Preserve the old formula only on
  // frozen revisions, including any rate captured with that revision.
  if (row.costDriver === "ENGINEERS_FEES_FORMULA" && option)
    return option.frozenMetrics && !option.engineeringScope?.confirmedAt
      ? calculateEngineersFeesFormula(option) * clampPositive(row.rate)
      : calculateEngineersFeesFormula(option);
  if (row.libraryRateId === INFRASTRUCTURE_PRELIMS_ID && option) {
    return 0.04 * (option.siteDimensions || []).filter(entry => !entry.isCostDriverInput && entry.libraryRateId !== INFRASTRUCTURE_PRELIMS_ID && siteBaseRowMatches(entry, 'INFRASTRUCTURE')).reduce((sum, entry) => sum + calculateSiteDimensionTotal(entry, option, resolvingRowIds), 0);
  }
  if (
    option &&
    isAwdSalesPrelimsRow(row) &&
    getPrivateHouseTypeUnits(option) <= 0
  )
    return 0;
  return (
    resolveSiteDimensionQuantity(row, option, resolvingRowIds) *
    clampPositive(row.rate)
  );
}

export function calculateSiteDimensionManualAdjustment(
  row: AppraisalSiteDimensionRow,
  option?: DevelopmentAppraisalOption,
  resolvingRowIds: Set<string> = new Set(),
): number {
  if (row.libraryRateId === CARRIED_SURVEY_ADJUSTMENT_ID) return Number(row.manualAdjustment) || 0;
  if (row.libraryRateId === 'awd-prelims-scottish-water-rebates') return 0;
  if (row.costDriver === 'RCC_FEES_FORMULA' && option?.rccFees?.authority === 'NOT_REQUIRED') return 0;
  if (row.isCostDriverInput || !siteBaseRowMatches(row, 'PRELIMS')) return 0;
  const adjustment = typeof row.manualAdjustment === 'number' && Number.isFinite(row.manualAdjustment)
    ? row.manualAdjustment : 0;
  if (adjustment >= 0) return adjustment;
  return Math.max(-calculateSiteDimensionBaseTotal(row, option, resolvingRowIds), adjustment);
}

export function calculateSiteDimensionTotal(
  row: AppraisalSiteDimensionRow,
  option?: DevelopmentAppraisalOption,
  resolvingRowIds: Set<string> = new Set(),
): number {
  return calculateSiteDimensionBaseTotal(row, option, resolvingRowIds)
    + calculateSiteDimensionManualAdjustment(row, option, resolvingRowIds);
}

export function calculateSiteDimensionStartPriceIndexContingency(
  row: AppraisalSiteDimensionRow,
  option: DevelopmentAppraisalOption,
): number {
  return calculateIndexedCostStartDateContingency(
    calculateSiteDimensionTotal(row, option),
    siteDimensionEffectivePriceIndex(row, option),
    option.programme,
  );
}

export function calculateHouseBuildingProgrammeSummary(
  option: DevelopmentAppraisalOption,
  appraisalDate?: string,
): HouseBuildingProgrammeSummary {
  const houseRows = option.houseTypeSchedule || [];
  const programme: AppraisalProgrammeAssumptions = option.programme || {};
  const totalUnits = houseRows.reduce(
    (total, row) => total + calculateHouseTypeSalesQuantity(row),
    0,
  );
  const privateUnits = houseRows
    .filter((row) => normalizeTenure(row.tenure) === "PRIVATE")
    .reduce((total, row) => total + calculateHouseTypeSalesQuantity(row), 0);
  const affordableUnits = houseRows
    .filter((row) => normalizeTenure(row.tenure) === "AFFORDABLE")
    .reduce((total, row) => total + calculateHouseTypeSalesQuantity(row), 0);
  const leadInMonths = clampPositiveInt(programme.leadInMonths);
  const buildPeriodMonths = houseRows.reduce(
    (max, row) => Math.max(max, clampPositiveInt(row.buildPeriodMonths, 0)),
    0,
  );
  const saleRateUnitsPerMonth = clampPositive(programme.saleRateUnitsPerMonth);
  const salePeriodMonths =
    saleRateUnitsPerMonth > 0 && totalUnits > 0
      ? Math.ceil(totalUnits / saleRateUnitsPerMonth)
      : 0;
  const programmeMonths = leadInMonths + buildPeriodMonths + salePeriodMonths;
  const appraisalPriceIndex = clampPositive(programme.appraisalPriceIndex);
  const startPriceIndex = clampPositive(programme.startPriceIndex);
  const constructionIndexFactor =
    appraisalPriceIndex > 0 && startPriceIndex > 0
      ? startPriceIndex / appraisalPriceIndex
      : 1;
  const expectedStartDate =
    typeof programme.expectedStartDate === "string"
      ? programme.expectedStartDate
      : undefined;

  return {
    appraisalDate,
    expectedStartDate,
    appraisalPriceIndex,
    startPriceIndex,
    constructionIndexFactor,
    totalUnits,
    privateUnits,
    affordableUnits,
    leadInMonths,
    buildPeriodMonths,
    saleRateUnitsPerMonth,
    salePeriodMonths,
    programmeMonths,
    expectedEndDate: addMonthsToDate(expectedStartDate, programmeMonths),
  };
}

export function summariseHouseBuildingOption(
  option: DevelopmentAppraisalOption,
): HouseBuildingOptionSummary {
  const houseRows = option.houseTypeSchedule || [];
  const siteRows = (option.siteDimensions || []).filter(row => isActiveSiteSourceRow(row, option));
  const programme = calculateHouseBuildingProgrammeSummary(option);
  const baseHouseConstructionCost = houseRows.reduce(
    (total, row) => total + calculateHouseTypeConstructionTotal(row),
    0,
  );
  const houseConstructionCost = houseRows.reduce(
    (total, row) =>
      total + calculateIndexedHouseTypeConstructionTotal(row, option.programme),
    0,
  );
  const privateHouseRows = houseRows.filter(
    (row) => normalizeTenure(row.tenure) === "PRIVATE",
  );
  const affordableHouseRows = houseRows.filter(
    (row) => normalizeTenure(row.tenure) === "AFFORDABLE",
  );
  const basePrivateHouseConstructionCost = privateHouseRows.reduce(
    (total, row) => total + calculateHouseTypeConstructionTotal(row),
    0,
  );
  const privateHouseConstructionCost = privateHouseRows.reduce(
    (total, row) =>
      total + calculateIndexedHouseTypeConstructionTotal(row, option.programme),
    0,
  );
  const baseAffordableHouseConstructionCost = affordableHouseRows.reduce(
    (total, row) => total + calculateHouseTypeConstructionTotal(row),
    0,
  );
  const affordableHouseConstructionCost = affordableHouseRows.reduce(
    (total, row) =>
      total + calculateIndexedHouseTypeConstructionTotal(row, option.programme),
    0,
  );
  const baseSiteWorksCost = siteRows.reduce(
    (total, row) => total + calculateSiteDimensionTotal(row, option),
    0,
  );
  const siteWorksCost = siteRows.reduce(
    (total, row) =>
      total +
      calculateSiteDimensionTotal(row, option) *
        rowPriceIndexFactor(siteDimensionEffectivePriceIndex(row, option), option.programme),
    0,
  );
  const indexedStructuredCost = houseConstructionCost + siteWorksCost;
  const baseStructuredCost = baseHouseConstructionCost + baseSiteWorksCost;
  const privateHouseConstructionContingency =
    privateHouseRows.reduce(
      (total, row) =>
        total + calculateHouseTypeStartPriceIndexContingency(row, option.programme),
      0,
    );
  const affordableHouseConstructionContingency =
    affordableHouseRows.reduce(
      (total, row) =>
        total + calculateHouseTypeStartPriceIndexContingency(row, option.programme),
      0,
    );
  const siteWorksContingency = siteRows.reduce(
    (total, row) =>
      total + calculateSiteDimensionStartPriceIndexContingency(row, option),
    0,
  );
  const constructionContingency =
    privateHouseConstructionContingency +
    affordableHouseConstructionContingency +
    siteWorksContingency;
  const gdv = houseRows.reduce(
    (total, row) => total + calculateHouseTypeGdv(row),
    0,
  );
  const totalUnits = houseRows.reduce(
    (total, row) => total + calculateHouseTypeSalesQuantity(row),
    0,
  );
  const privateUnits = houseRows
    .filter((row) => normalizeTenure(row.tenure) === "PRIVATE")
    .reduce((total, row) => total + calculateHouseTypeSalesQuantity(row), 0);
  const affordableUnits = houseRows
    .filter((row) => normalizeTenure(row.tenure) === "AFFORDABLE")
    .reduce((total, row) => total + calculateHouseTypeSalesQuantity(row), 0);
  const totalGifa = houseRows.reduce(
    (total, row) => total + calculateHouseTypeSalesGifa(row),
    0,
  );

  return {
    baseHouseConstructionCost,
    houseConstructionIndexCost:
      houseConstructionCost - baseHouseConstructionCost,
    houseConstructionCost,
    basePrivateHouseConstructionCost,
    privateHouseConstructionIndexCost:
      privateHouseConstructionCost - basePrivateHouseConstructionCost,
    privateHouseConstructionCost,
    baseAffordableHouseConstructionCost,
    affordableHouseConstructionIndexCost:
      affordableHouseConstructionCost - baseAffordableHouseConstructionCost,
    affordableHouseConstructionCost,
    constructionIndexFactor: programme.constructionIndexFactor,
    constructionIndexUplift: constructionContingency,
    constructionContingency,
    privateHouseConstructionContingency,
    affordableHouseConstructionContingency,
    siteWorksContingency,
    baseSiteWorksCost,
    siteWorksIndexCost: siteWorksCost - baseSiteWorksCost,
    siteWorksCost,
    indexedStructuredCost,
    totalStructuredCost: baseStructuredCost + constructionContingency,
    gdv,
    totalUnits,
    privateUnits,
    affordableUnits,
    totalGifa,
    averageSaleValuePerUnit: totalUnits > 0 ? gdv / totalUnits : 0,
    averageSaleValuePerM2: totalGifa > 0 ? gdv / totalGifa : 0,
  };
}

function buildStructuredHouseBuildingCostLines(
  option: DevelopmentAppraisalOption,
  durationMonths = option.durationMonths,
): AppraisalCostLine[] {
  const summary = summariseHouseBuildingOption(option);
  const lines: AppraisalCostLine[] = [];
  const houseConstructionGroups = [
    {
      id: "private-house-construction",
      title: "Private house construction",
      amount: summary.basePrivateHouseConstructionCost,
      sourceLabel: "Structured private house type schedule",
    },
    {
      id: "affordable-house-construction",
      title: "Affordable house construction",
      amount: summary.baseAffordableHouseConstructionCost,
      sourceLabel: "Structured affordable house type schedule",
    },
  ];
  houseConstructionGroups.forEach((group) => {
    if (group.amount <= 0) return;
    lines.push(
      createDefaultCostLine("CONSTRUCTION", durationMonths, {
        id: `structured-house-building-${group.id}`,
        title: group.title,
        amount: group.amount,
        sourceLabel: group.sourceLabel,
        readOnlySnapshot: true,
        cashflow: createCashflowProfile("EVEN", durationMonths),
      }),
    );
  });
  const siteWorksGroups = [
    {
      id: "infrastructure",
      title: "Infrastructure",
      prefix: AWD_INFRASTRUCTURE_RATE_PACK_PREFIX,
    },
    {
      id: "plot-works",
      title: "Plot Works",
      prefix: AWD_PLOT_WORKS_RATE_PACK_PREFIX,
    },
    { id: "prelims", title: "Prelims", prefix: AWD_PRELIMS_RATE_PACK_PREFIX },
  ].map((group) => ({
    ...group,
    amount: (option.siteDimensions || [])
      .filter((row) => row.libraryRateId?.startsWith(`${group.prefix}-`) && !isAbnormalRemovalRow(row) && isActiveSiteSourceRow(row, option))
      .reduce(
        (total, row) =>
          total +
          calculateSiteDimensionTotal(row, option),
        0,
      ),
  }));
  siteWorksGroups.forEach((group) => {
    if (group.amount > 0) {
      lines.push(
        createDefaultCostLine("EXTERNAL_WORKS", durationMonths, {
          id: `structured-house-building-${group.id}`,
          title: group.title,
          amount: group.amount,
          sourceLabel: `Structured ${group.title.toLowerCase()} schedule`,
          readOnlySnapshot: true,
          cashflow: createCashflowProfile("EVEN", durationMonths),
        }),
      );
    }
  });
  const removalLines = linkAbnormalRemovalRows(option).costLines.filter(line => line.sourceSiteDimensionId && !isClearedSiteCost(line));
  let removalBase = 0;
  for (const line of removalLines) {
    const source = option.siteDimensions?.find(row => row.id === line.sourceSiteDimensionId);
    if (!source) continue;
    const amount = calculateSiteDimensionTotal(source, option);
    removalBase += amount;
    lines.push({ ...line, amount });
  }
  const groupedSiteWorksTotal = siteWorksGroups.reduce(
    (total, group) => total + group.amount,
    0,
  );
  const otherSiteWorks = Math.max(
    0,
    summary.baseSiteWorksCost - groupedSiteWorksTotal - removalBase,
  );
  if (otherSiteWorks > 0.01) {
    lines.push(
      createDefaultCostLine("EXTERNAL_WORKS", durationMonths, {
        id: "structured-house-building-other-site-metrics",
        title: "Other site metrics",
        amount: otherSiteWorks,
        sourceLabel: "Structured site metrics",
        readOnlySnapshot: true,
        cashflow: createCashflowProfile("EVEN", durationMonths),
      }),
    );
  }
  if (summary.constructionContingency > 0) {
    lines.push(
      createDefaultCostLine("CONTINGENCY", durationMonths, {
        id: "structured-house-building-contingency",
        title: "Contingency",
        amount: summary.constructionContingency,
        sourceLabel: "Trade-level price-index contingency to expected site start",
        readOnlySnapshot: true,
        cashflow: createCashflowProfile("EVEN", durationMonths),
      }),
    );
  }
  const overheadCost = calculateHouseBuildingOverheadCost(option);
  const overheadPercent = getHouseBuildingOverheadPercent(option);
  if (overheadCost > 0) {
    lines.push(
      createDefaultCostLine("OTHER", durationMonths, {
        id: "structured-house-building-overheads",
        title: "Overheads",
        amount: overheadCost,
        sourceLabel: `${formatPercentLabel(overheadPercent)} overheads on all non-land costs`,
        readOnlySnapshot: true,
        cashflow: createCashflowProfile("EVEN", durationMonths),
      }),
    );
  }
  return lines;
}

function isHouseBuildingOption(option: DevelopmentAppraisalOption) {
  return (
    Array.isArray(option.houseTypeSchedule) ||
    Array.isArray(option.siteDimensions)
  );
}

function getModelCostLines(option: DevelopmentAppraisalOption) {
  const lines = isHouseBuildingOption(option) ? option.costLines.filter(line => isSiteCostElement(line) && (!line.sourceSiteDimensionId || !option.siteDimensions?.some(row => row.id === line.sourceSiteDimensionId))) : option.costLines;
  const liveLines = lines.map(line => line.engineeringScopeItemId ? {...line,amount:engineeringAbnormalAmount(line,option)} : line);
  const base = clampPositive(option.abnormalBaseAllowance);
  return base > 0 ? [...liveLines, createDefaultCostLine("ABNORMALS", option.durationMonths, {
    id: 'site-abnormal-base', title: 'Abnormals base allowance', amount: base,
    cashflow: createCashflowProfile('EVEN', option.durationMonths),
  })] : liveLines;
}

function normalizeCustomCostProvisionRow(
  source: unknown,
  fallbackTitle = "Custom cost provision",
): AppraisalCustomCostProvision | null {
  if (!isRecord(source)) return null;
  const amount = clampPositive(source.amount);
  const title =
    typeof source.title === "string" && source.title.trim()
      ? source.title.trim()
      : fallbackTitle;
  const timestamp = nowIso();
  return {
    id:
      typeof source.id === "string" && source.id.trim()
        ? source.id
        : generateId(),
    title,
    amount,
    notes: typeof source.notes === "string" ? source.notes : "",
    createdAt:
      typeof source.createdAt === "string" ? source.createdAt : timestamp,
    updatedAt:
      typeof source.updatedAt === "string" ? source.updatedAt : timestamp,
  };
}

export function getCustomCostProvisions(
  option: Pick<
    DevelopmentAppraisalOption,
    | "customCostProvisions"
    | "customCostProvisionAmount"
    | "customCostProvisionNote"
  >,
): AppraisalCustomCostProvision[] {
  const rows = Array.isArray(option.customCostProvisions)
    ? option.customCostProvisions
        .map((row) => normalizeCustomCostProvisionRow(row))
        .filter((row): row is AppraisalCustomCostProvision => Boolean(row))
    : [];
  if (rows.length > 0) return rows;
  const legacyAmount = clampPositive(option.customCostProvisionAmount);
  const legacyNote =
    typeof option.customCostProvisionNote === "string"
      ? option.customCostProvisionNote.trim()
      : "";
  if (legacyAmount <= 0 && !legacyNote) return [];
  return [
    {
      id: "legacy-custom-cost-provision",
      title: legacyNote || "Custom cost provision",
      amount: legacyAmount,
      notes: legacyNote,
      createdAt: "",
      updatedAt: "",
    },
  ];
}

export function calculateCustomCostProvisionTotal(
  option: Pick<
    DevelopmentAppraisalOption,
    | "customCostProvisions"
    | "customCostProvisionAmount"
    | "customCostProvisionNote"
  >,
): number {
  return getCustomCostProvisions(option).reduce(
    (total, row) => total + clampPositive(row.amount),
    0,
  );
}

export function calculateHouseBuildingOverheadCost(
  option: DevelopmentAppraisalOption,
): number {
  if (!isHouseBuildingOption(option)) return 0;
  const overheadPercent = getHouseBuildingOverheadPercent(option);
  const structured = summariseHouseBuildingOption(option);
  const abnormalCost = getModelCostLines(option)
    .filter((line) => line.category !== "FINANCE")
    .reduce((total, line) => total + lineFixedAmount(line), 0);
  return (
    (structured.totalStructuredCost +
      abnormalCost +
      calculateCustomCostProvisionTotal(option)) *
    (overheadPercent / 100)
  );
}

export function getHouseBuildingOverheadPercent(
  option: Pick<DevelopmentAppraisalOption, "overheadPercent">,
): number {
  return clampPositive(option.overheadPercent, HOUSE_BUILDING_OVERHEAD_PERCENT);
}

type GdvIncentiveOption = Pick<
  DevelopmentAppraisalOption,
  "gdvIncentivePercent"
> &
  Partial<
    Pick<
      DevelopmentAppraisalOption,
      "houseTypeSchedule" | "salesIndexationEnabled" | "salesIndexationPercent"
    >
  >;

export function calculateGdvIncentiveBase(
  option: GdvIncentiveOption,
  fallbackGdv = 0,
): number {
  if (!Array.isArray(option.houseTypeSchedule))
    return clampPositive(fallbackGdv);
  const privateSalesGdv = option.houseTypeSchedule
    .filter((row) => normalizeTenure(row.tenure) === "PRIVATE")
    .reduce((total, row) => total + calculateHouseTypeGdv(row), 0);
  const salesIndexFactor =
    option.salesIndexationEnabled === true
      ? 1 + Math.min(100, clampPositive(option.salesIndexationPercent)) / 100
      : 1;
  return privateSalesGdv * salesIndexFactor;
}

export function calculateGdvIncentiveCost(
  option: GdvIncentiveOption,
  gdv: number,
): number {
  return (
    calculateGdvIncentiveBase(option, gdv) *
    (Math.min(100, clampPositive(option.gdvIncentivePercent)) / 100)
  );
}

function formatPercentLabel(value: number): string {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2).replace(/\.?0+$/, "")}%`;
}

export function calculateRevenueLineValue(line: AppraisalRevenueLine): number {
  if (line.template === "COMMERCIAL_INCOME") {
    const annualRent =
      clampPositive(line.annualRent) ||
      clampPositive(line.area) * clampPositive(line.rentRate);
    const voidFactor = 1 - Math.min(100, clampPositive(line.voidPercent)) / 100;
    const incentiveFactor =
      1 - Math.min(100, clampPositive(line.incentivePercent)) / 100;
    const netRent = annualRent * voidFactor * incentiveFactor;
    const yieldPercent = clampPositive(line.yieldPercent);
    const capitalValue = yieldPercent > 0 ? netRent / (yieldPercent / 100) : 0;
    return capitalValue + clampPositive(line.manualValue);
  }

  const unitsValue =
    clampPositive(line.units) * clampPositive(line.saleValuePerUnit);
  const areaValue = clampPositive(line.area) * clampPositive(line.valuePerArea);
  return unitsValue || areaValue || clampPositive(line.manualValue);
}

export function calculateOptionBaseGdv(
  option: DevelopmentAppraisalOption,
): number {
  return (
    summariseHouseBuildingOption(option).gdv +
    option.revenueLines.reduce(
      (total, line) => total + calculateRevenueLineValue(line),
      0,
    ) +
    clampPositive(option.customGdvAdditionAmount)
  );
}

export function calculateSalesIndexationUplift(
  option: DevelopmentAppraisalOption,
  baseGdv = calculateOptionBaseGdv(option),
): number {
  if (option.salesIndexationEnabled !== true) return 0;
  const indexableBaseGdv = Math.max(
    0,
    clampPositive(baseGdv) - clampPositive(option.customGdvAdditionAmount),
  );
  return (
    indexableBaseGdv *
    (Math.min(100, clampPositive(option.salesIndexationPercent)) / 100)
  );
}

export function calculateOptionGdv(option: DevelopmentAppraisalOption): number {
  const baseGdv = calculateOptionBaseGdv(option);
  return baseGdv + calculateSalesIndexationUplift(option, baseGdv);
}

function lineFixedAmount(line: AppraisalCostLine) {
  return isClearedSiteCost(line) ? 0 : clampPositive(line.amount);
}

function basisForLine(
  line: AppraisalCostLine,
  basis: AppraisalCostPercentageBasis,
  gdv: number,
  fixedNonLandCost: number,
  fixedConstructionCost: number,
) {
  if (basis === "GDV") return gdv;
  if (basis === "NON_LAND_COSTS") return fixedNonLandCost;
  if (basis === "CONSTRUCTION_COSTS") return fixedConstructionCost;
  return lineFixedAmount(line);
}

export function calculateCostLineAmount(
  line: AppraisalCostLine,
  option: DevelopmentAppraisalOption,
  gdv = calculateOptionGdv(option),
): number {
  if (isClearedSiteCost(line)) return 0;
  if (line.engineeringScopeItemId) return engineeringAbnormalAmount(line,option);
  if (line.sourceSiteDimensionId) {
    const row = option.siteDimensions?.find(entry => entry.id === line.sourceSiteDimensionId);
    return row ? calculateSiteDimensionTotal(row, option) : lineFixedAmount(line);
  }
  const structured = summariseHouseBuildingOption(option);
  const modelCostLines = getModelCostLines(option);
  const fixedNonLandCost = modelCostLines
    .filter((entry) => entry.category !== "FINANCE")
    .reduce(
      (total, entry) => total + lineFixedAmount(entry),
      structured.totalStructuredCost,
    );
  const fixedConstructionCost = modelCostLines
    .filter(
      (entry) =>
        entry.category === "CONSTRUCTION" ||
        entry.category === "EXTERNAL_WORKS",
    )
    .reduce(
      (total, entry) => total + lineFixedAmount(entry),
      structured.totalStructuredCost,
    );
  const basis = line.percentageBasis || "NONE";
  if (basis === "NONE") return lineFixedAmount(line);
  return (
    basisForLine(line, basis, gdv, fixedNonLandCost, fixedConstructionCost) *
    (clampPositive(line.percentageValue) / 100)
  );
}

export function calculateCostLines(
  option: DevelopmentAppraisalOption,
  gdv = calculateOptionGdv(option),
) {
  const gdvIncentiveCost = calculateGdvIncentiveCost(option, gdv);
  const gdvIncentiveLine =
    gdvIncentiveCost > 0
      ? [
          createDefaultCostLine("MARKETING_SALES", option.durationMonths, {
            id: "structured-gdv-incentive",
            title: "Private sales incentive",
            amount: gdvIncentiveCost,
            sourceLabel: `${formatPercentLabel(clampPositive(option.gdvIncentivePercent))} of private sales GDV`,
            readOnlySnapshot: true,
            cashflow: createCashflowProfile("END", option.durationMonths),
          }),
        ]
      : [];
  const customCostProvisionLines = getCustomCostProvisions(option)
    .filter((row) => clampPositive(row.amount) > 0)
    .map((row) =>
      createDefaultCostLine("OTHER", option.durationMonths, {
        id: `structured-custom-cost-provision-${row.id}`,
        title: row.title.trim() || "Custom cost provision",
        amount: clampPositive(row.amount),
        notes: row.notes || "",
        sourceLabel: row.title.trim() || "Custom cost provision",
        readOnlySnapshot: true,
        cashflow: createCashflowProfile("EVEN", option.durationMonths),
      }),
    );
  return [
    ...buildStructuredHouseBuildingCostLines(option),
    ...customCostProvisionLines,
    ...gdvIncentiveLine,
    ...getModelCostLines(option),
  ].map((line) => ({
    line,
    amount: calculateCostLineAmount(line, option, gdv),
  }));
}

export function spreadValueAcrossMonths(
  value: number,
  durationMonths: number,
  profile?: AppraisalCashflowProfile,
): number[] {
  const duration = Math.max(1, Math.round(durationMonths));
  const values = Array.from({ length: duration }, () => 0);
  if (!Number.isFinite(value) || value === 0) return values;

  const type = profile?.type || "EVEN";
  const startMonth = normalizeMonth(profile?.startMonth, 1, duration);
  const endMonth = Math.max(
    startMonth,
    normalizeMonth(profile?.endMonth, duration, duration),
  );
  const startIndex = startMonth - 1;
  const endIndex = endMonth - 1;
  const activeMonths = endIndex - startIndex + 1;

  if (type === "UPFRONT") {
    values[startIndex] = value;
    return values;
  }

  if (type === "END") {
    values[endIndex] = value;
    return values;
  }

  if (type === "CUSTOM" && profile?.customPercentages?.length) {
    const raw = profile.customPercentages
      .slice(0, duration)
      .map((entry) => Math.max(0, entry));
    const total = raw.reduce((sum, entry) => sum + entry, 0);
    if (total > 0) {
      raw.forEach((entry, index) => {
        if (index < duration) values[index] = value * (entry / total);
      });
      return values;
    }
  }

  if (type === "S_CURVE") {
    const weights = Array.from({ length: activeMonths }, (_, index) => {
      const position = activeMonths === 1 ? 0.5 : index / (activeMonths - 1);
      return Math.sin(Math.PI * position) + 0.25;
    });
    const totalWeight = weights.reduce((sum, entry) => sum + entry, 0) || 1;
    weights.forEach((weight, index) => {
      values[startIndex + index] = value * (weight / totalWeight);
    });
    return values;
  }

  const evenValue = value / activeMonths;
  for (let index = startIndex; index <= endIndex; index += 1) {
    values[index] = evenValue;
  }
  return values;
}

function prepareOptionCashflow(
  option: DevelopmentAppraisalOption,
  costRows: ReturnType<typeof calculateCostLines>,
) {
  const duration = durationFor(option);
  const inflows = Array.from({ length: duration }, () => 0);
  const outflows = Array.from({ length: duration }, () => 0);

  option.revenueLines.forEach((line) => {
    spreadValueAcrossMonths(
      calculateRevenueLineValue(line),
      duration,
      line.cashflow,
    ).forEach((value, index) => {
      inflows[index] += value;
    });
  });

  costRows
    .filter(({ line }) => line.category !== "FINANCE")
    .forEach(({ line, amount }) => {
      spreadValueAcrossMonths(amount, duration, line.cashflow).forEach(
        (value, index) => {
          outflows[index] += value;
        },
      );
    });

  return { duration, inflows, outflows, monthlyRate: Math.max(0, clampNumber(option.financeAnnualRatePercent)) / 100 / 12 };
}

function cashflowForLandValue(
  prepared: ReturnType<typeof prepareOptionCashflow>,
  landValue: number,
): AppraisalCashflowSummary {
  const { duration, inflows, outflows, monthlyRate } = prepared;
  const landOutflows = outflows.slice();
  if (landValue !== 0) {
    spreadValueAcrossMonths(
      landValue,
      duration,
      createCashflowProfile("UPFRONT", duration),
    ).forEach((value, index) => {
      landOutflows[index] += value;
    });
  }

  const rows: AppraisalMonthlyCashflowRow[] = [];
  let balance = 0;
  let financeCost = 0;
  let peakFunding = 0;

  for (let index = 0; index < duration; index += 1) {
    const outflowBeforeFinance = landOutflows[index];
    const preFinanceBalance = balance + inflows[index] - outflowBeforeFinance;
    const monthFinance =
      preFinanceBalance < 0 ? Math.abs(preFinanceBalance) * monthlyRate : 0;
    balance = preFinanceBalance - monthFinance;
    financeCost += monthFinance;
    peakFunding = Math.max(peakFunding, balance < 0 ? Math.abs(balance) : 0);
    rows.push({
      month: index + 1,
      inflow: inflows[index],
      outflowBeforeFinance,
      financeCost: monthFinance,
      netMovement: inflows[index] - outflowBeforeFinance - monthFinance,
      cumulativeBalance: balance,
    });
  }

  return {
    rows,
    financeCost,
    peakFunding,
  };
}

export function buildMonthlyCashflow(
  option: DevelopmentAppraisalOption,
  landValue = 0,
): AppraisalCashflowSummary {
  const gdv = calculateOptionGdv(option);
  return cashflowForLandValue(prepareOptionCashflow(option, calculateCostLines(option, gdv)), landValue);
}

function recommendationForMetrics(
  metrics: Pick<
    AppraisalOptionMetrics,
    "gdv" | "profitOnGdvPercent" | "residualLandValue"
  >,
): AppraisalOptionMetrics["recommendation"] {
  if (metrics.gdv <= 0) return "UNVIABLE";
  if (metrics.profitOnGdvPercent > 18) return "RECOMMENDED";
  if (metrics.profitOnGdvPercent >= 12) return "WATCH";
  return "UNVIABLE";
}

function prepareOptionMetrics(option: DevelopmentAppraisalOption) {
  const gdv = calculateOptionGdv(option);
  const costRows = calculateCostLines(option, gdv).filter(({ line }) => line.category !== "FINANCE");
  return {
    gdv,
    gdvIncentiveCost: calculateGdvIncentiveCost(option, gdv),
    nonLandCost: costRows.reduce((total, row) => total + row.amount, 0),
    cashflow: prepareOptionCashflow(option, costRows),
  };
}

function metricsForLandValue(
  option: DevelopmentAppraisalOption,
  landValue: number,
  prepared = prepareOptionMetrics(option),
): AppraisalOptionMetrics {
  const { gdv, gdvIncentiveCost, nonLandCost } = prepared;
  const cashflow = cashflowForLandValue(prepared.cashflow, landValue);
  const targetProfit =
    gdv * (Math.max(0, option.targetProfitOnGdvPercent) / 100);
  const totalCost = nonLandCost + landValue + cashflow.financeCost;
  const profit = gdv - totalCost;
  const profitOnGdvPercent = gdv > 0 ? (profit / gdv) * 100 : 0;
  const residualOrSurplus = profit - targetProfit;
  const residualLandValue =
    option.calculationMode === "RESIDUAL_LAND_VALUE"
      ? landValue
      : residualOrSurplus;

  const metrics: AppraisalOptionMetrics = {
    optionId: option.id,
    gdv,
    revenueTotal: gdv,
    landValue,
    gdvIncentiveCost,
    nonLandCost,
    financeCost: cashflow.financeCost,
    totalCost,
    profit,
    targetProfit,
    profitOnGdvPercent,
    residualLandValue,
    residualOrSurplus,
    peakFunding: cashflow.peakFunding,
    recommendation: "WATCH",
  };
  metrics.recommendation = recommendationForMetrics(metrics);
  return metrics;
}

export function solveResidualLandValue(
  option: DevelopmentAppraisalOption,
): AppraisalOptionMetrics {
  const prepared = prepareOptionMetrics(option);
  const { gdv } = prepared;
  if (gdv <= 0) return metricsForLandValue(option, 0, prepared);

  const targetProfit =
    gdv * (Math.max(0, option.targetProfitOnGdvPercent) / 100);
  const profitDelta = (landValue: number) =>
    metricsForLandValue(option, landValue, prepared).profit - targetProfit;
  let low = -gdv;
  let high = gdv * 2;

  for (let attempt = 0; attempt < 12 && profitDelta(low) < 0; attempt += 1)
    low *= 2;
  for (let attempt = 0; attempt < 12 && profitDelta(high) > 0; attempt += 1)
    high *= 2;

  for (let iteration = 0; iteration < 64; iteration += 1) {
    const mid = (low + high) / 2;
    if (profitDelta(mid) > 0) low = mid;
    else high = mid;
  }

  return metricsForLandValue(option, (low + high) / 2, prepared);
}

export function calculateAppraisalOption(
  option: DevelopmentAppraisalOption,
): AppraisalOptionMetrics {
  const basis = option.frozenMetricsBasis;
  if (option.frozenMetrics && basis
    && basis.calculationMode === option.calculationMode
    && basis.knownLandValue === option.knownLandValue
    && basis.targetProfitOnGdvPercent === option.targetProfitOnGdvPercent
    && basis.overheadPercent === option.overheadPercent) return option.frozenMetrics;
  if (option.calculationMode === "RESIDUAL_LAND_VALUE") {
    return solveResidualLandValue(option);
  }
  return metricsForLandValue(option, clampPositive(option.knownLandValue));
}

export function calculateFinalReportMetrics(
  option: DevelopmentAppraisalOption,
): AppraisalFinalReportMetrics {
  if (option.frozenFinalReportMetrics) return option.frozenFinalReportMetrics;
  const originalMetrics = calculateAppraisalOption(option);
  const hasNegativeResidualLand =
    option.calculationMode === "RESIDUAL_LAND_VALUE" &&
    originalMetrics.landValue < 0;
  return {
    originalMetrics,
    hasNegativeResidualLand,
    metrics: hasNegativeResidualLand
      ? metricsForLandValue(option, 0)
      : originalMetrics,
  };
}

export function calculateSellerLandPriceMetrics(
  option: DevelopmentAppraisalOption,
): AppraisalOptionMetrics | null {
  if (option.frozenSellerMetrics !== undefined) return option.frozenSellerMetrics;
  const sellerLandValue = clampPositive(option.sellerMinimumLandValue);
  return sellerLandValue > 0
    ? metricsForLandValue(option, sellerLandValue)
    : null;
}

export function compareAppraisalOptions(appraisal: DevelopmentAppraisal) {
  const options = appraisal.options.map((option) => ({
    option,
    metrics: calculateAppraisalOption(option),
  }));
  const explicit = options.find((entry) => entry.option.recommended);
  if (explicit)
    return options.map((entry) => ({
      ...entry,
      isRecommended: entry.option.id === explicit.option.id,
    }));

  const best = [...options].sort((a, b) => {
    if (
      a.option.calculationMode === "RESIDUAL_LAND_VALUE" ||
      b.option.calculationMode === "RESIDUAL_LAND_VALUE"
    ) {
      return b.metrics.residualLandValue - a.metrics.residualLandValue;
    }
    return b.metrics.profitOnGdvPercent - a.metrics.profitOnGdvPercent;
  })[0];

  return options.map((entry) => ({
    ...entry,
    isRecommended: Boolean(best && entry.option.id === best.option.id),
  }));
}

export function buildLinkedProjectCostSnapshot(
  project: Project,
): AppraisalCostLine {
  const total = project.bills.reduce(
    (projectTotal, bill) =>
      projectTotal +
      bill.sections.reduce(
        (billTotal, section) =>
          billTotal +
          getSectionItems(section).reduce(
            (sectionTotal, item) =>
              sectionTotal +
              (COST_ITEM_TYPES.has(item.type) ? clampPositive(item.total) : 0),
            0,
          ),
        0,
      ),
    0,
  );

  return createDefaultCostLine(
    "CONSTRUCTION",
    DEFAULT_APPRAISAL_DURATION_MONTHS,
    {
      title: `${project.name} BoQ snapshot`,
      amount: total,
      sourceProjectId: project.id,
      sourceLabel: `${project.name} current priced BoQ total`,
      readOnlySnapshot: true,
      notes: `Read-only snapshot inserted from linked project on ${new Date().toLocaleDateString()}.`,
    },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeProfile(
  value: unknown,
  durationMonths: number,
): AppraisalCashflowProfile {
  const source = isRecord(value) ? value : {};
  const type = ["UPFRONT", "EVEN", "END", "S_CURVE", "CUSTOM"].includes(
    String(source.type),
  )
    ? (source.type as AppraisalCashflowProfile["type"])
    : "EVEN";
  const duration = Math.max(1, Math.round(durationMonths));
  return {
    type,
    startMonth: normalizeMonth(source.startMonth, 1, duration),
    endMonth: normalizeMonth(source.endMonth, duration, duration),
    customPercentages: Array.isArray(source.customPercentages)
      ? source.customPercentages.map((entry) => clampPositive(entry))
      : undefined,
  };
}

function normalizeRevenueLine(
  value: unknown,
  template: AppraisalTemplate,
  durationMonths: number,
): AppraisalRevenueLine {
  const fallback = createDefaultRevenueLine(template, durationMonths);
  const source = isRecord(value) ? value : {};
  const lineTemplate =
    source.template === "COMMERCIAL_INCOME" ||
    source.template === "RESIDENTIAL_SALES"
      ? (source.template as AppraisalTemplate)
      : template;
  return {
    ...fallback,
    id: typeof source.id === "string" ? source.id : fallback.id,
    title: typeof source.title === "string" ? source.title : fallback.title,
    template: lineTemplate,
    units: clampPositive(source.units, fallback.units),
    saleValuePerUnit: clampPositive(
      source.saleValuePerUnit,
      fallback.saleValuePerUnit,
    ),
    area: clampPositive(source.area, fallback.area),
    valuePerArea: clampPositive(source.valuePerArea, fallback.valuePerArea),
    rentRate: clampPositive(source.rentRate, fallback.rentRate),
    annualRent: clampPositive(source.annualRent, fallback.annualRent),
    yieldPercent: clampPositive(source.yieldPercent, fallback.yieldPercent),
    voidPercent: clampPositive(source.voidPercent, fallback.voidPercent),
    incentivePercent: clampPositive(
      source.incentivePercent,
      fallback.incentivePercent,
    ),
    manualValue: clampPositive(source.manualValue, fallback.manualValue),
    cashflow: normalizeProfile(source.cashflow, durationMonths),
    notes: typeof source.notes === "string" ? source.notes : "",
  };
}

function normalizeCostLine(
  value: unknown,
  durationMonths: number,
): AppraisalCostLine {
  const source = isRecord(value) ? value : {};
  const category = [
    "LAND_ACQUISITION",
    "CONSTRUCTION",
    "EXTERNAL_WORKS",
    "ABNORMALS",
    "PROFESSIONAL_FEES",
    "STATUTORY_AUTHORITY",
    "MARKETING_SALES",
    "CONTINGENCY",
    "FINANCE",
    "OTHER",
  ].includes(String(source.category))
    ? (source.category as AppraisalCostCategory)
    : "OTHER";
  const basis = [
    "NONE",
    "GDV",
    "NON_LAND_COSTS",
    "CONSTRUCTION_COSTS",
  ].includes(String(source.percentageBasis))
    ? (source.percentageBasis as AppraisalCostPercentageBasis)
    : "NONE";
  return {
    ...createDefaultCostLine(category, durationMonths),
    engineeringScopeItemId: typeof source.engineeringScopeItemId === "string" ? source.engineeringScopeItemId : undefined,
    sourceSiteDimensionId: typeof source.sourceSiteDimensionId === "string" ? source.sourceSiteDimensionId : undefined,
    abnormalElement: isRecord(source.abnormalElement) && ['BILL','RATE','AI','MANUAL'].includes(String(source.abnormalElement.kind)) ? source.abnormalElement as unknown as AppraisalCostLine['abnormalElement'] : undefined,
    sourcePageId: typeof source.sourcePageId === 'string' ? source.sourcePageId : undefined,
    siteCost: isRecord(source.siteCost) ? source.siteCost as unknown as AppraisalCostLine["siteCost"] : undefined,
    id: typeof source.id === "string" ? source.id : generateId(),
    title:
      typeof source.title === "string"
        ? source.title
        : APPRAISAL_COST_CATEGORY_LABELS[category],
    category,
    amount: clampPositive(source.amount),
    percentageBasis: basis,
    percentageValue: clampPositive(source.percentageValue),
    cashflow: normalizeProfile(source.cashflow, durationMonths),
    notes: typeof source.notes === "string" ? source.notes : "",
    sourceProjectId:
      typeof source.sourceProjectId === "string"
        ? source.sourceProjectId
        : undefined,
    sourceBillId:
      typeof source.sourceBillId === "string" ? source.sourceBillId : undefined,
    sourceSectionId:
      typeof source.sourceSectionId === "string"
        ? source.sourceSectionId
        : undefined,
    sourceLabel:
      typeof source.sourceLabel === "string" ? source.sourceLabel : undefined,
    formalQuotations: Array.isArray(source.formalQuotations)
      ? source.formalQuotations
          .map((entry) => normalizePricingReport(entry))
          .filter(
            (
              entry,
            ): entry is NonNullable<
              ReturnType<typeof normalizePricingReport>
            > => Boolean(entry),
          )
      : undefined,
    pricedItemsInformationNotes:
      typeof source.pricedItemsInformationNotes === "string"
        ? source.pricedItemsInformationNotes
        : "",
    nonPricedItemsInformationNotes:
      typeof source.nonPricedItemsInformationNotes === "string"
        ? source.nonPricedItemsInformationNotes
        : "",
    readOnlySnapshot: source.readOnlySnapshot === true,
    linkedAbnormalFrozen: source.linkedAbnormalFrozen === true,
    linkedAbnormalFrozenAt:
      typeof source.linkedAbnormalFrozenAt === "string"
        ? source.linkedAbnormalFrozenAt
        : undefined,
    linkedAbnormalVersion: Number.isFinite(Number(source.linkedAbnormalVersion))
      ? Math.max(1, Math.round(Number(source.linkedAbnormalVersion)))
      : undefined,
    previousLinkedAbnormalId:
      typeof source.previousLinkedAbnormalId === "string"
        ? source.previousLinkedAbnormalId
        : undefined,
  };
}

function normalizeHouseTypeSchedule(
  value: unknown,
): AppraisalHouseTypeScheduleRow[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const source = isRecord(entry) ? entry : {};
    const gifaM2 = clampPositive(source.gifaM2);
    const costBreakdown = Array.isArray(source.costBreakdown)
      ? normalizeHouseTypeCostBreakdown(
          source.costBreakdown,
          clampPositive(source.priceIndex),
        )
      : undefined;
    const buildCostPerM2 =
      calculateCostBreakdownRatePerM2(costBreakdown, gifaM2) ||
      clampPositive(source.buildCostPerM2);
    const salesRows = Array.isArray(source.salesRows)
      ? source.salesRows
          .map((salesRow, index) =>
            normalizeSalesRow(
              isRecord(salesRow) ? salesRow : {},
              `${typeof source.id === "string" ? source.id : "house"}-sales-${index + 1}`,
            ),
          )
          .filter((salesRow): salesRow is AppraisalHouseTypeSalesRow =>
            Boolean(salesRow),
          )
      : undefined;
    return {
      id: typeof source.id === "string" ? source.id : generateId(),
      libraryHouseTypeId:
        typeof source.libraryHouseTypeId === "string"
          ? source.libraryHouseTypeId
          : undefined,
      houseTypeName:
        typeof source.houseTypeName === "string"
          ? source.houseTypeName
          : "House type",
      style: normalizeHouseTypeStyle(source.style),
      configuration: normalizeHouseTypeConfiguration(source.configuration),
      storeys: normalizeOptionalPositiveNumber(source.storeys),
      bedrooms: normalizeOptionalPositiveInt(source.bedrooms),
      garage: normalizeOptionalBoolean(source.garage),
      privateDrive: normalizeOptionalBoolean(source.privateDrive),
      tenure: normalizeTenure(source.tenure),
      quantity: clampPositive(source.quantity),
      separateSalesQuantity: source.separateSalesQuantity === true,
      salesQuantity:
        source.separateSalesQuantity === true
          ? clampPositive(source.salesQuantity)
          : undefined,
      constructionQuantityLabel:
        typeof source.constructionQuantityLabel === "string"
          ? source.constructionQuantityLabel
          : "",
      salesQuantityLabel:
        typeof source.salesQuantityLabel === "string"
          ? source.salesQuantityLabel
          : "",
      quantitySeparationNotes:
        typeof source.quantitySeparationNotes === "string"
          ? source.quantitySeparationNotes
          : "",
      gifaM2,
      skipLoadsPerDwelling: typeof source.skipLoadsPerDwelling === 'number' && Number.isFinite(source.skipLoadsPerDwelling) && source.skipLoadsPerDwelling >= 0 ? source.skipLoadsPerDwelling : undefined,
      buildCostPerM2,
      ...(costBreakdown ? { costBreakdown } : {}),
      priceIndex: costBreakdown?.length ? 0 : clampPositive(source.priceIndex),
      buildPeriodMonths: clampPositiveInt(source.buildPeriodMonths, 6),
      ...(salesRows?.length ? { salesRows } : {}),
      saleValuePerUnit: clampPositive(source.saleValuePerUnit),
      saleRatePerM2: clampPositive(source.saleRatePerM2),
      notes: typeof source.notes === "string" ? source.notes : "",
    };
  });
}

function normalizeProgrammeAssumptions(
  value: unknown,
): AppraisalProgrammeAssumptions {
  const source = isRecord(value) ? value : {};
  return {
    appraisalPriceIndex: clampPositive(source.appraisalPriceIndex),
    expectedStartDate:
      typeof source.expectedStartDate === "string"
        ? source.expectedStartDate
        : "",
    startPriceIndex: clampPositive(source.startPriceIndex),
    saleRateUnitsPerMonth: clampPositive(source.saleRateUnitsPerMonth),
    leadInMonths: clampPositiveInt(source.leadInMonths),
  };
}

function normalizeSiteDimensionRow(
  value: unknown,
  fallback?: Partial<AppraisalSiteDimensionRow>,
): AppraisalSiteDimensionRow {
  const source = isRecord(value) ? value : {};
  const formulaCostDriver = awdFormulaCostDriverForId(source.libraryRateId);
  const formulaSourceFormula = awdFormulaSourceFormulaForId(
    source.libraryRateId,
  );
  const rawCostDriver =
    source.libraryRateId === "awd-infrastructure-common-planting" &&
    source.costDriver === "COMMON_LANDSCAPING_M2"
      ? "PLANTING_M2"
      : source.libraryRateId === "awd-infrastructure-paths" &&
          source.costDriver === "PLOT_WORKS_FOOTPATHS_M2"
        ? "PATHS_M2"
        : source.libraryRateId === "awd-infrastructure-garden-walls" &&
            source.costDriver === "TOTAL_UNITS"
          ? "GARDEN_WALLS_M"
          : source.libraryRateId === "awd-prelims-architects-fees" &&
              source.costDriver === "SUMMARY_BUILD_COST"
            ? "TOTAL_GDV"
            : formulaCostDriver || source.costDriver;
  const sourceCostDriver = normalizeInfrastructureCostDriver(
    rawCostDriver,
    fallback?.costDriver,
  );
  const category = [
    "SITE_AREA",
    "ROADS",
    "FOOTPATHS",
    "COMMON_LANDSCAPING",
    "BOUNDARY_FENCING",
    "PLOT_FENCING",
    "PLANTING",
    "DRIVES",
    "COMMUNAL_PARKING",
    "FRONT_GARDENS",
    "REAR_GARDENS",
    "OTHER",
  ].includes(String(source.category))
    ? (source.category as AppraisalSiteDimensionCategory)
    : fallback?.category ||
      infrastructureCostDriverToCategory(sourceCostDriver, "OTHER");
  const costDriver = normalizeInfrastructureCostDriver(
    sourceCostDriver,
    legacyCategoryToInfrastructureCostDriver(category),
  );
  const monthlyResourceRate = awdMonthlyPrelimsResourceRate(source.libraryRateId);
  const unit = normalizeSiteDimensionUnit(
    monthlyResourceRate || source.costDriver === 'PROGRAMME_MONTHS' ? 'month' : formulaCostDriver
      ? "sum"
      : source.libraryRateId === "awd-infrastructure-garden-walls" &&
          source.unit === "nr"
        ? "m"
        : source.unit,
    fallback?.unit ||
      getInfrastructureCostDriverUnit(
        costDriver,
        category === "BOUNDARY_FENCING" || category === "PLOT_FENCING"
          ? "m"
          : "m2",
      ),
  );
  const rate = monthlyResourceRate
    ? monthlyResourceRate : formulaCostDriver
    ? 1
    : clampPositive(source.rate, fallback?.rate);
  const isCostDriverInput =
    source.isCostDriverInput === true ||
    fallback?.isCostDriverInput === true ||
    (source.isCostDriverInput !== false && !source.libraryRateId &&
      Boolean(costDriver) &&
      rate === 0 &&
      DEFAULT_SITE_DIMENSION_ROWS.some((row) => row.costDriver === costDriver));

  return {
    id:
      typeof source.id === "string" ? source.id : fallback?.id || generateId(),
    category,
    costDriver,
    isCostDriverInput,
    libraryRateId:
      typeof source.libraryRateId === "string"
        ? source.libraryRateId
        : fallback?.libraryRateId,
    label:
      typeof source.label === "string"
        ? source.label
        : fallback?.label || APPRAISAL_SITE_DIMENSION_LABELS[category],
    unit: typeof source.libraryRateId === 'string' && source.libraryRateId.startsWith('awd-prelims-scottish-water-') ? 'sum' : unit,
    quantity: clampPositive(source.quantity, fallback?.quantity),
    rate: typeof source.libraryRateId === 'string' && source.libraryRateId.startsWith('awd-prelims-scottish-water-') ? 1 : rate,
    priceIndex: isScottishStatutoryFeeRow({ costDriver } as AppraisalSiteDimensionRow) || (typeof source.libraryRateId === 'string' && source.libraryRateId.startsWith('awd-prelims-scottish-water-'))
      ? 0 : clampPositive(source.priceIndex, fallback?.priceIndex),
    manualAdjustment: typeof source.manualAdjustment === 'number' && Number.isFinite(source.manualAdjustment)
      ? source.manualAdjustment : fallback?.manualAdjustment,
    sourceFormula:
      typeof source.libraryRateId === 'string' && source.libraryRateId.startsWith('awd-prelims-scottish-water-')
        ? 'Scottish Water 2026/27 project formula; see Prelims assumptions'
        : formulaSourceFormula ||
      (typeof source.sourceFormula === "string"
        ? source.sourceFormula
        : fallback?.sourceFormula || ""),
    sourceRow:
      source.libraryRateId === 'awd-prelims-rcc' ? 'Roads authority 2026/27 schedule' :
      typeof source.sourceRow === "string"
        ? source.sourceRow
        : fallback?.sourceRow || "",
    notes: refreshGeneratedForkliftNotes(source.libraryRateId,
      typeof source.notes === "string" ? source.notes : fallback?.notes || ""),
  };
}

function normalizeSiteDimensions(value: unknown): AppraisalSiteDimensionRow[] {
  const sourceRows = Array.isArray(value) ? value : [];
  const normalized = sourceRows.map((row) => normalizeSiteDimensionRow(row))
    .filter(row => row.libraryRateId !== SALES_MARKETING_ROW_IDS.launch);
  const byCostDriver = new Map(
    normalized
      .filter((row) => row.isCostDriverInput && row.costDriver)
      .map((row) => [row.costDriver, row]),
  );
  const standardRows = DEFAULT_SITE_DIMENSION_ROWS.map(
    (row) =>
      byCostDriver.get(row.costDriver) ||
      normalizeSiteDimensionRow(
        {},
        {
          ...row,
          id: generateId(),
          isCostDriverInput: true,
          quantity: 0,
          rate: 0,
          notes: "",
        },
      ),
  );
  const customRows = normalized.filter((row) => !row.isCostDriverInput);
  return [...standardRows, ...customRows];
}

function normalizePricingReport(
  value: unknown,
): AppraisalPricingReport | undefined {
  const source = isRecord(value) ? value : null;
  if (
    !source ||
    typeof source.fileName !== "string" ||
    (typeof source.dataUrl !== "string" && typeof source.localEvidencePath !== "string")
  )
    return undefined;
  const extractionStatus = [
    "PENDING",
    "EXTRACTED",
    "WARNING",
    "FAILED",
    "UNSUPPORTED",
  ].includes(String(source.extractionStatus))
    ? (source.extractionStatus as NonNullable<
        AppraisalPricingReport["extractionStatus"]
      >)
    : undefined;
  return {
    id: typeof source.id === "string" ? source.id : generateId(),
    fileName: source.fileName,
    mimeType:
      typeof source.mimeType === "string"
        ? source.mimeType
        : "application/octet-stream",
    size: clampPositive(source.size),
    uploadedAt:
      typeof source.uploadedAt === "string" ? source.uploadedAt : nowIso(),
    dataUrl: typeof source.dataUrl === "string" ? source.dataUrl : undefined,
    storageMode: source.storageMode === "MANAGED_LOCAL" ? "MANAGED_LOCAL" : "EMBEDDED",
    localEvidencePath: typeof source.localEvidencePath === "string" ? source.localEvidencePath : undefined,
    contentSha256: typeof source.contentSha256 === "string" ? source.contentSha256 : undefined,
    integrityStatus: ["VERIFIED", "MISSING", "CHANGED", "UNAVAILABLE"].includes(String(source.integrityStatus))
      ? source.integrityStatus as AppraisalPricingReport["integrityStatus"] : undefined,
    integrityCheckedAt: typeof source.integrityCheckedAt === "string" ? source.integrityCheckedAt : undefined,
    notes: typeof source.notes === "string" ? source.notes : "",
    extractedText:
      typeof source.extractedText === "string" ? source.extractedText : "",
    extractionStatus,
    extractedAt:
      typeof source.extractedAt === "string" ? source.extractedAt : undefined,
    extractionError:
      typeof source.extractionError === "string" ? source.extractionError : "",
  };
}

function normalizeCommercialAssets(value: unknown): CommercialAsset[] {
  if (!Array.isArray(value)) return [];
  const models = new Set([
    "LEASE",
    "OWNER_OPERATED",
    "CONCESSION",
    "SALE",
    "OTHER",
  ]);
  const sources = new Set(["TEMPLATE", "ASSESSMENT", "MANUAL"]);
  return value.map((entry) => {
    const source = isRecord(entry) ? entry : {};
    const timestamp =
      typeof source.updatedAt === "string" ? source.updatedAt : nowIso();
    return {
      id: typeof source.id === "string" ? source.id : generateId(),
      title:
        typeof source.title === "string" && source.title.trim()
          ? source.title.trim()
          : "Commercial asset",
      description:
        typeof source.description === "string" ? source.description : "",
      source: sources.has(String(source.source))
        ? (source.source as CommercialAsset["source"])
        : "MANUAL",
      included: source.included !== false,
      revenueModel: models.has(String(source.revenueModel))
        ? (source.revenueModel as CommercialAsset["revenueModel"])
        : "LEASE",
      siteAllocationM2: clampPositive(source.siteAllocationM2),
      revenueLineIds: Array.isArray(source.revenueLineIds)
        ? source.revenueLineIds.filter(
            (id): id is string => typeof id === "string",
          )
        : [],
      costLineIds: Array.isArray(source.costLineIds)
        ? source.costLineIds.filter(
            (id): id is string => typeof id === "string",
          )
        : [],
      annualOperatingCostPercent: clampPositive(
        source.annualOperatingCostPercent,
      ),
      annualRevenueGrowthPercent: clampPositive(
        source.annualRevenueGrowthPercent,
      ),
      annualLifecycleCapexPercent: clampPositive(
        source.annualLifecycleCapexPercent,
      ),
      exitYieldPercent: clampPositive(source.exitYieldPercent),
      sellingCostsPercent: clampPositive(source.sellingCostsPercent),
      rationale: typeof source.rationale === "string" ? source.rationale : "",
      excludedReason:
        typeof source.excludedReason === "string" ? source.excludedReason : "",
      createdAt:
        typeof source.createdAt === "string" ? source.createdAt : timestamp,
      updatedAt: timestamp,
    };
  });
}

function normalizeApprovedReportIssues(value: unknown): AppraisalApprovedReportIssue[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.id !== 'string' || typeof entry.sourceHash !== 'string' || typeof entry.sourceSnapshot !== 'string') return [];
    const outputs: AppraisalApprovedReportIssue['outputs'] = Array.isArray(entry.outputs)
      ? entry.outputs.flatMap((output) => isRecord(output) && (output.format === 'PDF' || output.format === 'EXCEL') && (output.status === 'LOCKED' || output.status === 'EXPORTED') && typeof output.fileName === 'string'
        ? [{ format: output.format as 'PDF' | 'EXCEL', status: output.status as 'LOCKED' | 'EXPORTED', fileName: output.fileName, exportedAt: typeof output.exportedAt === 'string' ? output.exportedAt : undefined }]
        : [])
      : [];
    return [{
      id: entry.id,
      issueNumber: Math.max(1, Math.round(Number(entry.issueNumber) || 1)),
      reviewer: typeof entry.reviewer === 'string' ? entry.reviewer : '',
      approvedAt: typeof entry.approvedAt === 'string' ? entry.approvedAt : '',
      sourceHash: entry.sourceHash,
      sourceSnapshot: entry.sourceSnapshot,
      evidenceJustification: typeof entry.evidenceJustification === 'string' ? entry.evidenceJustification : '',
      allocationJustification: typeof entry.allocationJustification === 'string' ? entry.allocationJustification : '',
      createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : '',
      outputs,
    }];
  });
}

function normalizeConsentStatus(value: unknown): AppraisalConsentStatus {
  const candidate = String(value || "");
  return [
    "NOT_STARTED",
    "IN_PROGRESS",
    "SUBMITTED",
    "APPROVED",
    "CONDITIONED",
    "REJECTED",
    "NOT_REQUIRED",
  ].includes(candidate)
    ? (candidate as AppraisalConsentStatus)
    : "NOT_STARTED";
}

function normalizeConsentStandardKey(
  value: unknown,
): AppraisalConsentStandardKey {
  const candidate = String(value || "");
  return [
    "SCOTTISH_WATER_SEWERS",
    "PLANNING",
    "RCC",
    "BUILDING_WARRANT",
    "CUSTOM",
  ].includes(candidate)
    ? (candidate as AppraisalConsentStandardKey)
    : "CUSTOM";
}

function normalizeConsentTrackerEntry(
  value: unknown,
): AppraisalConsentTrackerEntry {
  const source = isRecord(value) ? value : {};
  const timestamp =
    typeof source.updatedAt === "string" ? source.updatedAt : nowIso();
  const standardKey = normalizeConsentStandardKey(source.standardKey);
  const defaultRow = DEFAULT_CONSENT_TRACKER_ROWS.find(
    (row) => row.standardKey === standardKey,
  );
  return createDefaultConsentTrackerEntry({
    id: typeof source.id === "string" ? source.id : generateId(),
    standardKey,
    title:
      typeof source.title === "string" && source.title.trim()
        ? source.title
        : defaultRow?.title || "Consent",
    authority:
      typeof source.authority === "string"
        ? source.authority
        : defaultRow?.authority || "",
    status: normalizeConsentStatus(source.status),
    responsibleParty:
      typeof source.responsibleParty === "string"
        ? source.responsibleParty
        : "",
    reference: typeof source.reference === "string" ? source.reference : "",
    targetDate: typeof source.targetDate === "string" ? source.targetDate : "",
    submittedDate:
      typeof source.submittedDate === "string" ? source.submittedDate : "",
    approvedDate:
      typeof source.approvedDate === "string" ? source.approvedDate : "",
    notes: typeof source.notes === "string" ? source.notes : "",
    uploads: Array.isArray(source.uploads)
      ? source.uploads
          .map((entry) => normalizePricingReport(entry))
          .filter((entry): entry is AppraisalPricingReport => Boolean(entry))
      : [],
    createdAt:
      typeof source.createdAt === "string" ? source.createdAt : timestamp,
    updatedAt: timestamp,
  });
}

function normalizeConsentTracker(
  value: unknown,
): AppraisalConsentTrackerEntry[] {
  const normalized = Array.isArray(value)
    ? value.map(normalizeConsentTrackerEntry)
    : [];
  const byStandard = new Map(
    normalized
      .filter((entry) => entry.standardKey !== "CUSTOM")
      .map((entry) => [entry.standardKey, entry]),
  );
  const standardRows = createDefaultConsentTrackerEntries().map(
    (row) => byStandard.get(row.standardKey) || row,
  );
  const customRows = normalized.filter(
    (entry) => entry.standardKey === "CUSTOM",
  );
  return [...standardRows, ...customRows];
}

export function normalizeAppraisalHouseTypeLibraryItems(
  value: unknown,
): AppraisalHouseTypeLibraryItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const source = isRecord(entry) ? entry : {};
    const timestamp =
      typeof source.updatedAt === "string" ? source.updatedAt : nowIso();
    const gifaM2 = clampPositive(source.gifaM2);
    const sourceName =
      typeof source.name === "string" && source.name.trim()
        ? source.name
        : "House type";
    const standardName = resolveAppraisalStandardHouseTypeName(sourceName);
    const costBreakdown = normalizeHouseTypeCostBreakdown(
      source.costBreakdown,
      standardName
        ? APPRAISAL_HOUSE_TYPE_DEFAULT_PRICE_INDEX
        : clampPositive(source.priceIndex),
      source.isIncomplete === true,
    );
    const buildCostPerM2 =
      calculateCostBreakdownRatePerM2(costBreakdown, gifaM2) ||
      clampPositive(source.buildCostPerM2);
    return {
      id: typeof source.id === "string" ? source.id : generateId(),
      name: standardName || sourceName,
      style: normalizeHouseTypeStyle(source.style),
      configuration: normalizeHouseTypeConfiguration(source.configuration),
      storeys: normalizeOptionalPositiveNumber(source.storeys),
      bedrooms: normalizeOptionalPositiveInt(source.bedrooms),
      garage: normalizeOptionalBoolean(source.garage),
      privateDrive: normalizeOptionalBoolean(source.privateDrive),
      gifaM2,
      buildCostPerM2,
      costBreakdown,
      priceIndex: 0,
      buildPeriodMonths: source.isIncomplete === true
        ? 0
        : standardName
          ? APPRAISAL_HOUSE_TYPE_DEFAULT_BUILD_MONTHS
          : clampPositiveInt(source.buildPeriodMonths, 6),
      notes: refreshGeneratedForkliftNotes(source.id, source.notes),
      isIncomplete: source.isIncomplete === true,
      incompleteWarning:
        typeof source.incompleteWarning === "string"
          ? source.incompleteWarning
          : "",
      status:
        source.status === "DRAFT" ||
        source.status === "ARCHIVED" ||
        source.status === "ACTIVE"
          ? source.status
          : "ACTIVE",
      favorite: source.favorite === true,
      createdAt:
        typeof source.createdAt === "string" ? source.createdAt : timestamp,
      updatedAt: timestamp,
    };
  });
}

function normalizeRateFormulaComponents(
  value: unknown,
): AppraisalRateFormulaComponent[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const components = value.map((entry) => {
    const source = isRecord(entry) ? entry : {};
    const costDriver = normalizeInfrastructureCostDriver(source.costDriver);
    return {
      id: typeof source.id === "string" ? source.id : generateId(),
      label:
        typeof source.label === "string" && source.label.trim()
          ? source.label
          : "Formula component",
      costDriver,
      quantity:
        source.quantity === undefined
          ? undefined
          : clampPositive(source.quantity),
      rate: clampPositive(source.rate),
      sourceFormula:
        typeof source.sourceFormula === "string" ? source.sourceFormula : "",
      notes: typeof source.notes === "string" ? source.notes : "",
    };
  });
  return components.length > 0 ? components : undefined;
}

export function normalizeAppraisalRateLibraryItems(
  value: unknown,
): AppraisalRateLibraryItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(entry => !isRecord(entry) || !RETIRED_INFRASTRUCTURE_RATE_IDS.has(String(entry.id)) && entry.id !== SALES_MARKETING_ROW_IDS.launch && !PLOT_GARDEN_ALLOWANCES.some(spec=>spec.legacyId===entry.id)).map((entry) => {
    const original = isRecord(entry) ? entry : {};
    let source = original.id === 'awd-infrastructure-cut-and-fill' && !(typeof original.sourceFormula === 'string' && original.sourceFormula.startsWith('USER_SITE_AREA_V1:'))
      ? { ...original, label: 'Cut and fill', rate: 3.19, costDriver: 'SITE_AREA_M2', unit: 'm2', sourceFormula: 'USER_SITE_AREA_V1: SITE_AREA_M2 * 3.19', sourceRow: 'INFRASTRUCTURE_CORE_SITE_AREA_V1' }
      : original;
    const drainage = DRAINAGE_ALLOWANCES.find(item => item.id === source.id);
    if (drainage && !(typeof source.sourceFormula === 'string' && source.sourceFormula.startsWith('USER_DRAINAGE_V1:'))) source = {...source,label:drainage.label,rate:drainage.rate,costDriver:'ROADS_M2',unit:'m2',priceIndex:233,sourceFormula:`USER_DRAINAGE_V1: ROADS_M2 * ${drainage.rate}`,sourceRow:'INFRASTRUCTURE_DRAINAGE_V1',notes:DRAINAGE_COMMENT};
    const plotBase=PLOT_BASE_ALLOWANCES.find(spec=>spec.id===source.id);
    if(plotBase && !(typeof source.sourceFormula==='string'&&source.sourceFormula.startsWith('USER_PLOT_BASE_V1:'))) source={...source,label:plotBase.label,rate:plotBase.rate,costDriver:plotBase.costDriver,unit:plotBase.unit,sourceFormula:`USER_PLOT_BASE_V1: ${plotBase.costDriver} * ${plotBase.rate}`,sourceRow:'PLOT_WORKS_BASE_V1'};
    const garden=PLOT_GARDEN_ALLOWANCES.find(spec=>spec.id===source.id);
    if(garden && !(typeof source.sourceFormula==='string'&&source.sourceFormula.startsWith('USER_PLOT_GARDENS_V1:'))) source={...source,label:garden.label,rate:garden.rate,costDriver:garden.costDriver,unit:garden.unit,priceIndex:233,sourceFormula:`USER_PLOT_GARDENS_V1: ${garden.costDriver} * ${garden.rate}`,sourceRow:'PLOT_WORKS_GARDENS_V1',notes:LANDSCAPING_COMMENT};
    const landscape=LANDSCAPING_FENCING_COMPOUND_ALLOWANCES.find(item=>item.id===source.id);
    if(landscape && !(typeof source.sourceFormula==='string'&&source.sourceFormula.startsWith('USER_LANDSCAPING_FENCING_COMPOUND_V1:'))) source={...source,label:landscape.label,rate:landscape.rate,costDriver:landscape.costDriver,unit:landscape.unit,priceIndex:233,sourceFormula:`USER_LANDSCAPING_FENCING_COMPOUND_V1: ${landscape.costDriver} * ${landscape.rate}`,sourceRow:'INFRASTRUCTURE_LANDSCAPING_FENCING_COMPOUND_V1',notes:landscape.unit==='m2'?LANDSCAPING_COMMENT:source.notes};
    const services = SERVICES_LIGHTING_ALLOWANCES.find(item=>item.id===source.id);
    if(services && !(typeof source.sourceFormula==='string' && source.sourceFormula.startsWith(services.id==='awd-infrastructure-street-lighting-works'?'USER_STREET_LIGHTING_WORKS_V1:':'USER_SERVICES_LIGHTING_V1:'))) source={...source,label:services.label,rate:services.rate,costDriver:services.costDriver,unit:services.unit,priceIndex:233,sourceFormula:`${services.id==='awd-infrastructure-street-lighting-works'?'USER_STREET_LIGHTING_WORKS_V1':'USER_SERVICES_LIGHTING_V1'}: ${'unpriced' in services ? 'UNPRICED' : services.costDriver+' * '+services.rate}`,sourceRow:'INFRASTRUCTURE_SERVICES_LIGHTING_V1',notes:'unpriced' in services ? 'Rate to be assessed; excluded from priced totals until assessed.' : SERVICES_COMMENT};
    const roads = ROADS_PATHS_ALLOWANCES.find(item=>item.id===source.id);
    if (roads && !(typeof source.sourceFormula === 'string' && source.sourceFormula.startsWith('USER_ROADS_PATHS_V1:'))) source={...source,label:roads.label,rate:roads.rate,costDriver:roads.costDriver,unit:roads.unit,priceIndex:233,sourceFormula:`USER_ROADS_PATHS_V1: ${roads.costDriver} * ${roads.rate}`,sourceRow:'INFRASTRUCTURE_ROADS_PATHS_V1',notes:ROADS_PATHS_COMMENT};
    if (source.id === SALES_MARKETING_ROW_IDS.showhome) source = { ...source, label: 'Show Home Fitout', rate: 32000, unit: 'sum', costDriver: 'FIXED_SUM', sourceFormula: 'One showhome: £26,000 furnishings/decoration plus £6,000 floor coverings when not in plot cost', sourceRow: 'USER_SHOWHOME_FITOUT_2026', notes: 'One 3–4 bedroom showhome; excludes in-house interior design, delivery, assembly, installation and buffer. Remove floor coverings when already in plot construction.' };
    if (source.id === SALES_MARKETING_ROW_IDS.ongoing) source = { ...source, label: 'Ongoing advertising and marketing', rate: 3000, unit: 'month', costDriver: 'PROGRAMME_MONTHS', sourceFormula: 'Sales operating months × £3,000/month default advertising allowance', sourceRow: 'USER_ONGOING_MARKETING_2026', notes: 'Property portals, paid digital advertising and campaign support from sales start; excludes separately allowed sales costs.' };
    if (source.id === 'awd-prelims-consumables') source = { ...source, label: 'Other site consumables', rate: 0, unit: 'month', costDriver: 'PROGRAMME_MONTHS', sourceFormula: 'No separate base allowance; H&S and Small Plant cover management consumables and tools', notes: 'Use a manual adjustment only for identifiable site consumables not covered by H&S, Small Plant or subcontract rates.' };
    if (typeof source.id === 'string' && source.id.startsWith('awd-prelims-scottish-water-')) source = {
      ...source, unit: 'sum', rate: 1, priceIndex: 0,
      label: source.id === 'awd-prelims-scottish-water-charges' ? 'Scottish Water building water and foul infrastructure'
        : source.id === 'awd-prelims-scottish-water-rebates' ? 'Scottish Water foul-water rebate'
        : 'Scottish Water applications and inspections',
      sourceFormula: 'Scottish Water 2026/27 project formula; see Prelims assumptions',
      sourceRow: 'Scottish Water Your Charges Explained 2026/27 / Reasonable Cost Contributions 2026/27',
      notes: 'Includes building water by house type, foul infrastructure, applications and inspections; excludes fresh-water infrastructure and physical water connections.',
    };
    const formulaCostDriver = awdFormulaCostDriverForId(source.id);
    const formulaSourceFormula = awdFormulaSourceFormulaForId(source.id);
    const rawCostDriver =
      source.id === "awd-infrastructure-common-planting" &&
      source.costDriver === "COMMON_LANDSCAPING_M2"
        ? "PLANTING_M2"
        : source.id === "awd-infrastructure-paths" &&
            source.costDriver === "PLOT_WORKS_FOOTPATHS_M2"
          ? "PATHS_M2"
          : source.id === "awd-infrastructure-garden-walls" &&
              source.costDriver === "TOTAL_UNITS"
            ? "GARDEN_WALLS_M"
            : source.id === "awd-prelims-architects-fees" &&
                source.costDriver === "SUMMARY_BUILD_COST"
              ? "TOTAL_GDV"
              : formulaCostDriver || source.costDriver;
    const sourceCostDriver = normalizeInfrastructureCostDriver(rawCostDriver);
    const category = [
      "SITE_AREA",
      "ROADS",
      "FOOTPATHS",
      "COMMON_LANDSCAPING",
      "BOUNDARY_FENCING",
      "PLOT_FENCING",
      "PLANTING",
      "DRIVES",
      "COMMUNAL_PARKING",
      "FRONT_GARDENS",
      "REAR_GARDENS",
      "OTHER",
    ].includes(String(source.category))
      ? (source.category as AppraisalSiteDimensionCategory)
      : infrastructureCostDriverToCategory(sourceCostDriver, "ROADS");
    const costDriver = normalizeInfrastructureCostDriver(
      sourceCostDriver,
      legacyCategoryToInfrastructureCostDriver(category),
    );
    const timestamp =
      typeof source.updatedAt === "string" ? source.updatedAt : nowIso();
    return {
      id: typeof source.id === "string" ? source.id : generateId(),
      category,
      costDriver,
      label:
        source.id === 'awd-infrastructure-topsoil-strip-stockpile' ? 'Topsoil strip and stockpile' : source.id === 'awd-infrastructure-cut-and-fill' ? 'Cut and fill' : typeof source.label === "string" && source.label.trim()
          ? source.label
          : costDriver
            ? APPRAISAL_INFRASTRUCTURE_COST_DRIVER_LABELS[costDriver]
            : APPRAISAL_SITE_DIMENSION_LABELS[category],
      unit: normalizeSiteDimensionUnit(
        awdMonthlyPrelimsResourceRate(source.id) || costDriver === 'PROGRAMME_MONTHS' ? 'month' : formulaCostDriver
          ? "sum"
          : source.id === "awd-infrastructure-garden-walls" &&
              source.unit === "nr"
            ? "m"
            : source.unit,
        getInfrastructureCostDriverUnit(
          costDriver,
          category === "BOUNDARY_FENCING" || category === "PLOT_FENCING"
            ? "m"
            : "m2",
        ),
      ),
      rate: awdMonthlyPrelimsResourceRate(source.id) || (formulaCostDriver ? 1 : clampPositive(source.rate)),
      formulaComponents: normalizeRateFormulaComponents(
        source.formulaComponents,
      ),
      priceIndex: costDriver === 'PLANNING_FEES_FORMULA' || costDriver === 'BUILDING_WARRANT_FORMULA' || (typeof source.id === 'string' && source.id.startsWith('awd-prelims-scottish-water-')) ? 0 : garden || (typeof source.id === 'string' && source.id.startsWith('awd-prelims-')) ? 233 : typeof source.id === 'string' && source.id.startsWith('awd-infrastructure-') && !['awd-infrastructure-removal-existing-structures','awd-infrastructure-removal-existing-surfaces','awd-infrastructure-alterations'].includes(source.id) ? 233 : clampPositive(source.priceIndex),
      sourceFormula:
        formulaSourceFormula ||
        (typeof source.sourceFormula === "string" ? source.sourceFormula : ""),
      sourceRow: source.id === 'awd-prelims-rcc' ? 'Roads authority 2026/27 schedule' : typeof source.sourceRow === "string" ? source.sourceRow : "",
      notes: refreshGeneratedForkliftNotes(source.id, source.notes),
      status:
        source.status === "DRAFT" ||
        source.status === "ARCHIVED" ||
        source.status === "ACTIVE"
          ? source.status
          : "ACTIVE",
      favorite: source.favorite === true,
      createdAt:
        typeof source.createdAt === "string" ? source.createdAt : timestamp,
      updatedAt: timestamp,
    };
  });
}

function inferAppraisalKind(
  source: Record<string, unknown>,
): DevelopmentAppraisalKind {
  if (source.kind === "HOUSE_BUILDING" || source.kind === "COMMERCIAL")
    return source.kind;
  const options = Array.isArray(source.options) ? source.options : [];
  const hasResidential = options.some(
    (option) => isRecord(option) && option.template === "RESIDENTIAL_SALES",
  );
  if (hasResidential) return "HOUSE_BUILDING";
  const hasCommercial = options.some(
    (option) => isRecord(option) && option.template === "COMMERCIAL_INCOME",
  );
  return hasCommercial ? "COMMERCIAL" : "HOUSE_BUILDING";
}

export function normalizeDevelopmentAppraisalOption(
  value: unknown,
  settings?: AppSettings,
  kind?: DevelopmentAppraisalKind,
): DevelopmentAppraisalOption {
  const source = isRecord(value) ? value : {};
  const defaults = getAppraisalSettings(settings);
  const template =
    source.template === "COMMERCIAL_INCOME" ||
    source.template === "RESIDENTIAL_SALES"
      ? (source.template as AppraisalTemplate)
      : kind === "COMMERCIAL"
        ? "COMMERCIAL_INCOME"
        : defaults.defaultTemplate;
  const optionKind =
    kind ||
    (template === "COMMERCIAL_INCOME" ? "COMMERCIAL" : "HOUSE_BUILDING");
  const fallback = createDefaultAppraisalOption(template, settings, optionKind);
  const durationMonths = durationFor({
    durationMonths: clampPositive(
      source.durationMonths,
      defaults.defaultDurationMonths,
    ),
  });
  const sourceMode =
    source.calculationMode === "KNOWN_LAND_PROFIT_ON_GDV" ||
    source.calculationMode === "RESIDUAL_LAND_VALUE"
      ? (source.calculationMode as AppraisalCalculationMode)
      : "RESIDUAL_LAND_VALUE";
  const mode: AppraisalCalculationMode =
    optionKind === "COMMERCIAL" ? "KNOWN_LAND_PROFIT_ON_GDV" : sourceMode;
  const sourceCostLines =
    Array.isArray(source.costLines) && source.costLines.length
      ? source.costLines.map((line) => normalizeCostLine(line, durationMonths))
      : fallback.costLines;
  const customCostProvisions = Array.isArray(source.customCostProvisions)
    ? source.customCostProvisions
        .map((row) => normalizeCustomCostProvisionRow(row))
        .filter((row): row is AppraisalCustomCostProvision => Boolean(row))
    : getCustomCostProvisions({
        customCostProvisionAmount: clampPositive(
          source.customCostProvisionAmount,
        ),
        customCostProvisionNote:
          typeof source.customCostProvisionNote === "string"
            ? source.customCostProvisionNote
            : "",
      });
  const resourceSource = isRecord(source.prelimsResourceCounts) ? source.prelimsResourceCounts : null;
  const resourceKeys: Array<keyof AppraisalPrelimsResourceCounts> = ['siteManagers', 'assistantSiteManagers', 'forkliftDrivers', 'labourers', 'forklifts'];
  const prelimsResourceCounts = resourceSource ? resourceKeys.reduce<AppraisalPrelimsResourceCounts>((counts, key) => {
    const value = resourceSource[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) counts[key] = Math.floor(value);
    return counts;
  }, {}) : undefined;
  const normalized: DevelopmentAppraisalOption = {
    ...fallback,
    id: typeof source.id === "string" ? source.id : fallback.id,
    name: typeof source.name === "string" ? source.name : fallback.name,
    template,
    commercialTemplateId:
      optionKind === "COMMERCIAL" &&
      typeof source.commercialTemplateId === "string"
        ? source.commercialTemplateId
        : fallback.commercialTemplateId,
    commercialAssessmentStage:
      optionKind === "COMMERCIAL" &&
      source.commercialAssessmentStage === "PRELIMINARY"
        ? "PRELIMINARY"
        : optionKind === "COMMERCIAL"
          ? "MODELLED"
          : undefined,
    commercialTemplateInputs:
      optionKind === "COMMERCIAL" && isRecord(source.commercialTemplateInputs)
        ? Object.fromEntries(
            Object.entries(source.commercialTemplateInputs).map(
              ([key, value]) => [key, clampPositive(value)],
            ),
          )
        : fallback.commercialTemplateInputs,
    commercialLocation:
      optionKind === "COMMERCIAL" &&
      typeof source.commercialLocation === "string"
        ? source.commercialLocation
        : fallback.commercialLocation,
    commercialAssets:
      optionKind === "COMMERCIAL"
        ? normalizeCommercialAssets(source.commercialAssets)
        : undefined,
    commercialInitialAssessmentBriefs:
      optionKind === "COMMERCIAL" &&
      Array.isArray(source.commercialInitialAssessmentBriefs)
        ? source.commercialInitialAssessmentBriefs
            .map((entry) => normalizePricingReport(entry))
            .filter((entry): entry is AppraisalPricingReport => Boolean(entry))
        : optionKind === "COMMERCIAL"
          ? []
          : undefined,
    commercialScopeAssessment:
      optionKind === "COMMERCIAL" && isRecord(source.commercialScopeAssessment)
        ? {
            siteAreaM2: clampPositive(
              source.commercialScopeAssessment.siteAreaM2,
            ),
            summary:
              typeof source.commercialScopeAssessment.summary === "string"
                ? source.commercialScopeAssessment.summary
                : "",
            assessedAt:
              typeof source.commercialScopeAssessment.assessedAt === "string"
                ? source.commercialScopeAssessment.assessedAt
                : "",
            provider:
              typeof source.commercialScopeAssessment.provider === "string"
                ? source.commercialScopeAssessment.provider
                : "",
          }
        : fallback.commercialScopeAssessment,
    commercialRevenueAssessment:
      optionKind === "COMMERCIAL" &&
      isRecord(source.commercialRevenueAssessment)
        ? {
            rentRate: clampPositive(
              source.commercialRevenueAssessment.rentRate,
            ),
            yieldPercent: clampPositive(
              source.commercialRevenueAssessment.yieldPercent,
            ),
            voidPercent: clampPositive(
              source.commercialRevenueAssessment.voidPercent,
            ),
            annualRent: clampPositive(
              source.commercialRevenueAssessment.annualRent,
            ),
            summary:
              typeof source.commercialRevenueAssessment.summary === "string"
                ? source.commercialRevenueAssessment.summary
                : "",
            assessedAt:
              typeof source.commercialRevenueAssessment.assessedAt === "string"
                ? source.commercialRevenueAssessment.assessedAt
                : "",
            provider:
              typeof source.commercialRevenueAssessment.provider === "string"
                ? source.commercialRevenueAssessment.provider
                : "",
          }
        : fallback.commercialRevenueAssessment,
    commercialLifecycleYears:
      optionKind === "COMMERCIAL"
        ? Math.max(
            1,
            Math.round(
              clampPositive(
                source.commercialLifecycleYears,
                fallback.commercialLifecycleYears || 10,
              ),
            ),
          )
        : undefined,
    commercialAnnualOperatingCostPercent:
      optionKind === "COMMERCIAL"
        ? clampPositive(
            source.commercialAnnualOperatingCostPercent,
            fallback.commercialAnnualOperatingCostPercent || 25,
          )
        : undefined,
    commercialAnnualRevenueGrowthPercent:
      optionKind === "COMMERCIAL"
        ? clampPositive(
            source.commercialAnnualRevenueGrowthPercent,
            fallback.commercialAnnualRevenueGrowthPercent || 2,
          )
        : undefined,
    commercialAnnualCostInflationPercent:
      optionKind === "COMMERCIAL"
        ? clampPositive(
            source.commercialAnnualCostInflationPercent,
            fallback.commercialAnnualCostInflationPercent || 3,
          )
        : undefined,
    commercialAnnualLifecycleCapexPercent:
      optionKind === "COMMERCIAL"
        ? clampPositive(
            source.commercialAnnualLifecycleCapexPercent,
            fallback.commercialAnnualLifecycleCapexPercent || 1,
          )
        : undefined,
    commercialExitYieldPercent:
      optionKind === "COMMERCIAL"
        ? clampPositive(
            source.commercialExitYieldPercent,
            fallback.commercialExitYieldPercent || 5.5,
          )
        : undefined,
    commercialSellingCostsPercent:
      optionKind === "COMMERCIAL"
        ? clampPositive(
            source.commercialSellingCostsPercent,
            fallback.commercialSellingCostsPercent || 2,
          )
        : undefined,
    commercialDebtEnabled:
      optionKind === "COMMERCIAL"
        ? source.commercialDebtEnabled !== false
        : undefined,
    commercialLoanToCostPercent:
      optionKind === "COMMERCIAL"
        ? clampPositive(source.commercialLoanToCostPercent, fallback.commercialLoanToCostPercent || 65)
        : undefined,
    commercialDebtArrangementFeePercent:
      optionKind === "COMMERCIAL"
        ? clampPositive(source.commercialDebtArrangementFeePercent, fallback.commercialDebtArrangementFeePercent || 1)
        : undefined,
    commercialDebtExitFeePercent:
      optionKind === "COMMERCIAL"
        ? clampPositive(source.commercialDebtExitFeePercent, fallback.commercialDebtExitFeePercent || 0)
        : undefined,
    commercialDebtAmortisationYears:
      optionKind === "COMMERCIAL"
        ? clampPositive(source.commercialDebtAmortisationYears, fallback.commercialDebtAmortisationYears || 25)
        : undefined,
    commercialRefinanceYear:
      optionKind === "COMMERCIAL"
        ? clampPositive(source.commercialRefinanceYear, fallback.commercialRefinanceYear || 0)
        : undefined,
    commercialRefinanceLoanToValuePercent:
      optionKind === "COMMERCIAL"
        ? clampPositive(source.commercialRefinanceLoanToValuePercent, fallback.commercialRefinanceLoanToValuePercent || 65)
        : undefined,
    commercialRefinanceAnnualRatePercent:
      optionKind === "COMMERCIAL"
        ? clampPositive(source.commercialRefinanceAnnualRatePercent, fallback.commercialRefinanceAnnualRatePercent || 8)
        : undefined,
    commercialRefinanceFeePercent:
      optionKind === "COMMERCIAL"
        ? clampPositive(source.commercialRefinanceFeePercent, fallback.commercialRefinanceFeePercent || 1)
        : undefined,
    commercialMinimumDscr:
      optionKind === "COMMERCIAL"
        ? clampPositive(source.commercialMinimumDscr, fallback.commercialMinimumDscr || 1.25)
        : undefined,
    commercialDiscountRatePercent:
      optionKind === "COMMERCIAL"
        ? clampPositive(source.commercialDiscountRatePercent, fallback.commercialDiscountRatePercent || 10)
        : undefined,
    commercialFinancialScenarios:
      optionKind === "COMMERCIAL"
        ? Array.isArray(source.commercialFinancialScenarios) && source.commercialFinancialScenarios.length
          ? source.commercialFinancialScenarios
              .filter((scenario): scenario is Record<string, unknown> => isRecord(scenario))
              .map((scenario) => ({
                kind: scenario.kind === 'UPSIDE' || scenario.kind === 'DOWNSIDE' ? scenario.kind : 'BASE',
                name: typeof scenario.name === 'string' ? scenario.name : 'Base',
                rentChangePercent: Number(scenario.rentChangePercent) || 0,
                voidChangePercent: Number(scenario.voidChangePercent) || 0,
                developmentCostChangePercent: Number(scenario.developmentCostChangePercent) || 0,
                lifecycleCapexChangePercent: Number(scenario.lifecycleCapexChangePercent) || 0,
                exitYieldShiftBps: Number(scenario.exitYieldShiftBps) || 0,
                delayMonths: Math.max(0, Number(scenario.delayMonths) || 0),
              }))
          : fallback.commercialFinancialScenarios
        : undefined,
    commercialLifecycleAssessment:
      optionKind === "COMMERCIAL" &&
      isRecord(source.commercialLifecycleAssessment)
        ? {
            summary:
              typeof source.commercialLifecycleAssessment.summary === "string"
                ? source.commercialLifecycleAssessment.summary
                : "",
            assessedAt:
              typeof source.commercialLifecycleAssessment.assessedAt ===
              "string"
                ? source.commercialLifecycleAssessment.assessedAt
                : "",
            provider:
              typeof source.commercialLifecycleAssessment.provider === "string"
                ? source.commercialLifecycleAssessment.provider
                : "",
          }
        : fallback.commercialLifecycleAssessment,
    calculationMode: mode,
    durationMonths,
    startDate:
      typeof source.startDate === "string" ? source.startDate : undefined,
    targetProfitOnGdvPercent: clampPositive(
      source.targetProfitOnGdvPercent,
      defaults.defaultTargetProfitOnGdvPercent,
    ),
    gdvIncentivePercent: clampPositive(source.gdvIncentivePercent),
    customGdvAdditionAmount: clampPositive(source.customGdvAdditionAmount),
    customGdvAdditionNote:
      typeof source.customGdvAdditionNote === "string"
        ? source.customGdvAdditionNote
        : "",
    customCostProvisions,
    customCostProvisionAmount: 0,
    customCostProvisionNote: "",
    salesIndexationEnabled: source.salesIndexationEnabled === true,
    salesIndexationPercent: clampPositive(source.salesIndexationPercent),
    salesIndexationAssessedAt:
      typeof source.salesIndexationAssessedAt === "string"
        ? source.salesIndexationAssessedAt
        : "",
    salesIndexationNarrative:
      typeof source.salesIndexationNarrative === "string"
        ? source.salesIndexationNarrative
        : "",
    overheadPercent:
      optionKind === "HOUSE_BUILDING"
        ? clampPositive(source.overheadPercent, HOUSE_BUILDING_OVERHEAD_PERCENT)
        : undefined,
    financeAnnualRatePercent: clampPositive(
      source.financeAnnualRatePercent,
      defaults.defaultFinanceAnnualRatePercent,
    ),
    knownLandValue: clampPositive(source.knownLandValue),
    sellerMinimumLandValue: clampPositive(source.sellerMinimumLandValue),
    revenueLines:
      Array.isArray(source.revenueLines) && source.revenueLines.length
        ? source.revenueLines.map((line) =>
            normalizeRevenueLine(line, template, durationMonths),
          )
        : fallback.revenueLines,
    engineeringScope: normalizeEngineeringScope(source.engineeringScope),
    agreedRateBasisVersion: typeof source.agreedRateBasisVersion === 'number' ? source.agreedRateBasisVersion : undefined,
    unpricedOutlineUntilSiteInputs: source.unpricedOutlineUntilSiteInputs === true,
    engineeringScopeDraft: normalizeEngineeringScope(source.engineeringScopeDraft),
    scottishStatutoryFees: normalizeScottishStatutoryFees(source.scottishStatutoryFees),
    rccFees: normalizeScottishRccFees(source.rccFees),
    scottishWaterFees: normalizeScottishWaterFees(source.scottishWaterFees),
    surveyReports: normalizeSurveyReportAssumptions(source.surveyReports),
    prelimsResourceCounts,
    temporaryPower: normalizeTemporaryPower(source.temporaryPower),
    drinkingWater: normalizeDrinkingWater(source.drinkingWater),
    fuelAssumptions: normalizeFuelAssumptions(source.fuelAssumptions),
    siloGeneratorAssumptions: normalizeSiloGeneratorAssumptions(source.siloGeneratorAssumptions),
    salesMarketingAssumptions: normalizeSalesMarketingAssumptions(source.salesMarketingAssumptions),
    safetyPlantAssumptions: normalizeSafetyPlantAssumptions(source.safetyPlantAssumptions),
    skipWasteAssumptions: normalizeSkipWasteAssumptions(source.skipWasteAssumptions),
    plotHeatingAssumptions: normalizePlotHeatingAssumptions(source.plotHeatingAssumptions),
    herasFencingAssumptions: normalizeHerasFencingAssumptions(source.herasFencingAssumptions),
    abnormalBaseAllowance: clampPositive(source.abnormalBaseAllowance),
    costLines: normalizeSiteCostLines(optionKind === "HOUSE_BUILDING" ? sourceCostLines.filter(isSiteCostElement) : sourceCostLines),
    recommended: source.recommended === true,
    assumptions:
      typeof source.assumptions === "string" ? source.assumptions : "",
    decisionNote:
      typeof source.decisionNote === "string" ? source.decisionNote : "",
    finalReportExecutiveSummary:
      typeof source.finalReportExecutiveSummary === "string"
        ? source.finalReportExecutiveSummary
        : "",
    finalReportSourceSignature:
      typeof source.finalReportSourceSignature === "string"
        ? source.finalReportSourceSignature
        : "",
    approvedReportIssues: normalizeApprovedReportIssues(source.approvedReportIssues),
    houseTypeSchedule:
      optionKind === "HOUSE_BUILDING"
        ? normalizeHouseTypeSchedule(source.houseTypeSchedule)
        : undefined,
    siteDimensions:
      optionKind === "HOUSE_BUILDING"
        ? normalizeSiteDimensions(source.siteDimensions)
        : undefined,
    programme:
      optionKind === "HOUSE_BUILDING"
        ? normalizeProgrammeAssumptions(source.programme)
        : undefined,
    baseMeasurementFiles:
      optionKind === "HOUSE_BUILDING" &&
      Array.isArray(source.baseMeasurementFiles)
        ? source.baseMeasurementFiles
            .map((entry) => normalizePricingReport(entry))
            .filter((entry): entry is AppraisalPricingReport => Boolean(entry))
        : optionKind === "HOUSE_BUILDING"
          ? []
          : undefined,
    architectFeasibilityLayouts:
      optionKind === "HOUSE_BUILDING" &&
      Array.isArray(source.architectFeasibilityLayouts)
        ? source.architectFeasibilityLayouts
            .map((entry) => normalizePricingReport(entry))
            .filter((entry): entry is AppraisalPricingReport => Boolean(entry))
        : optionKind === "HOUSE_BUILDING"
          ? []
          : undefined,
    pricingReport:
      optionKind === "HOUSE_BUILDING"
        ? normalizePricingReport(source.pricingReport)
        : undefined,
    housePricesComment:
      optionKind === "HOUSE_BUILDING" &&
      typeof source.housePricesComment === "string"
        ? source.housePricesComment
        : "",
    abnormalGeneralNotes:
      optionKind === "HOUSE_BUILDING" &&
      typeof source.abnormalGeneralNotes === "string"
        ? source.abnormalGeneralNotes
        : "",
    abnormalGeneralNarrative:
      optionKind === "HOUSE_BUILDING" &&
      typeof source.abnormalGeneralNarrative === "string"
        ? source.abnormalGeneralNarrative
        : "",
    constraintsReport:
      optionKind === "HOUSE_BUILDING"
        ? normalizePricingReport(source.constraintsReport)
        : undefined,
    landContractVersions:
      optionKind === "HOUSE_BUILDING" &&
      Array.isArray(source.landContractVersions)
        ? source.landContractVersions
            .map((entry) => normalizePricingReport(entry))
            .filter((entry): entry is AppraisalPricingReport => Boolean(entry))
        : optionKind === "HOUSE_BUILDING"
          ? []
          : undefined,
    consentTracker:
      optionKind === "HOUSE_BUILDING"
        ? normalizeConsentTracker(source.consentTracker)
        : undefined,
    createdAt:
      typeof source.createdAt === "string"
        ? source.createdAt
        : fallback.createdAt,
    updatedAt:
      typeof source.updatedAt === "string"
        ? source.updatedAt
        : fallback.updatedAt,
  };
  if (optionKind !== "HOUSE_BUILDING") return normalized;
  if (!normalized.rccFees) {
    const rccRow = normalized.siteDimensions?.find(row => !row.isCostDriverInput && row.costDriver === 'RCC_FEES_FORMULA');
    if (rccRow) normalized.rccFees = {
      authority: 'UNCONFIRMED',
      legacyAllowance: calculateLegacyRccFormula(normalized),
    };
  }
  const linked = linkAbnormalRemovalRows(ensureBaseInfrastructureRates(syncSurveyReportBillRows(removeUnselectedAbnormalPresets(addMissingAgreedAppraisalRows(normalized)))));
  return { ...linked, costLines: linked.costLines.map(line => line.sourceSiteDimensionId && !isClearedSiteCost(line) ? { ...line, amount: calculateCostLineAmount(line, linked) } : line) };
}

export function normalizeDevelopmentAppraisals(
  value: unknown,
  settings?: AppSettings,
): DevelopmentAppraisal[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const source = isRecord(entry) ? entry : {};
    // Frozen revisions and parked unviable sites retain their saved basis until
    // an editable version is created or the site is explicitly reopened.
    if (((typeof source.frozenAt === 'string' && source.frozenAt)
      || (typeof source.unviableMarkedAt === 'string' && source.unviableMarkedAt))
      && Array.isArray(source.options)) {
      return source as unknown as DevelopmentAppraisal;
    }
    const kind = inferAppraisalKind(source);
    const fallback = createDefaultAppraisal(null, settings, kind);
    const status = ["DRAFT", "REVIEW", "APPROVED", "ARCHIVED"].includes(
      String(source.status),
    )
      ? (source.status as DevelopmentAppraisal["status"])
      : "DRAFT";
    const options =
      Array.isArray(source.options) && source.options.length
        ? source.options.map((option) =>
            normalizeDevelopmentAppraisalOption(option, settings, kind),
          )
        : fallback.options;
    return {
      ...fallback,
      kind,
      id: typeof source.id === "string" ? source.id : fallback.id,
      costPackId:
        kind === "HOUSE_BUILDING" && source.costPackId === "AWD"
          ? "AWD"
          : undefined,
      name: typeof source.name === "string" ? source.name : fallback.name,
      reference: typeof source.reference === "string" ? source.reference : "",
      client: typeof source.client === "string" ? source.client : "",
      site: typeof source.site === "string" ? source.site : "",
      siteStatus: [
        "NOT_VIABLE",
        "BID_LOST",
        "VIABLE_DISCOUNTED",
        "NOT_APPRAISED",
        "APPRAISAL_IN_PROGRESS",
        "APPRAISED_VIABLE",
        "APPRAISED_PURSUED",
        "SITE_ACQUIRED",
      ].includes(String(source.siteStatus))
        ? (source.siteStatus as DevelopmentAppraisal["siteStatus"])
        : "NOT_APPRAISED",
      unviableMarkedAt: typeof source.unviableMarkedAt === 'string' && source.unviableMarkedAt
        ? source.unviableMarkedAt
        : undefined,
      sitePlanningStatus: [
        "UNKNOWN",
        "NONE",
        "IN_LDP",
        "EXPIRED",
        "IN_PRINCIPLE",
        "DETAILED_CONSENT",
      ].includes(String(source.sitePlanningStatus))
        ? (source.sitePlanningStatus as AppraisalPlanningStatus)
        : "UNKNOWN",
      siteOffMarket: source.siteOffMarket === true,
      siteCountry:
        typeof source.siteCountry === "string" ? source.siteCountry : "",
      siteRegion:
        typeof source.siteRegion === "string" ? source.siteRegion : "",
      siteCounty:
        typeof source.siteCounty === "string" ? source.siteCounty : "",
      siteLandPriceKnown: source.siteLandPriceKnown === true,
      siteLandPrice: normalizeOptionalPositiveNumber(source.siteLandPrice),
      siteAreaHectares: normalizeOptionalPositiveNumber(source.siteAreaHectares),
      siteLatitude: normalizeCoordinate(source.siteLatitude, -90, 90),
      siteLongitude: normalizeCoordinate(source.siteLongitude, -180, 180),
      appraisalDate:
        typeof source.appraisalDate === "string"
          ? source.appraisalDate
          : fallback.appraisalDate,
      appraisalFolderId:
        typeof source.appraisalFolderId === "string" &&
        source.appraisalFolderId.trim()
          ? source.appraisalFolderId
          : undefined,
      versionSummary:
        typeof source.versionSummary === "string" ? source.versionSummary : "",
      projectId:
        typeof source.projectId === "string" ? source.projectId : undefined,
      status,
      selectedOptionId:
        typeof source.selectedOptionId === "string"
          ? source.selectedOptionId
          : options[0]?.id,
      options,
      createdAt:
        typeof source.createdAt === "string"
          ? source.createdAt
          : fallback.createdAt,
      updatedAt:
        typeof source.updatedAt === "string"
          ? source.updatedAt
          : fallback.updatedAt,
      archivedAt:
        typeof source.archivedAt === "string" ? source.archivedAt : undefined,
    };
  });
}

/** Shared site-area items requested by the user; migration runs once and retains later edits. */
export function ensureBaseInfrastructureRates(option: DevelopmentAppraisalOption): DevelopmentAppraisalOption {
  const requested = [
    { id: 'awd-infrastructure-topsoil-strip-stockpile', label: 'Topsoil strip and stockpile', rate: 0.87 },
    { id: 'awd-infrastructure-cut-and-fill', label: 'Cut and fill', rate: 3.19 },
    { id: 'awd-infrastructure-clear-site-vegetation', label: 'Clear site of vegetation', rate: 0.25 },
  ];
  let rows = (option.siteDimensions || []).filter(row => !RETIRED_INFRASTRUCTURE_RATE_IDS.has(row.libraryRateId || '') && row.libraryRateId !== SALES_MARKETING_ROW_IDS.launch);
  for(const spec of PLOT_BASE_ALLOWANCES) {
    const patch={label:spec.label,rate:spec.rate,costDriver:spec.costDriver,unit:spec.unit,sourceFormula:`USER_PLOT_BASE_V1: ${spec.costDriver} * ${spec.rate}`,sourceRow:'PLOT_WORKS_BASE_V1'};
    if(!rows.some(row=>row.libraryRateId===spec.id))rows.push(createSiteDimensionRow({...patch,libraryRateId:spec.id,quantity:0,priceIndex:233}));
    else rows=rows.map(row=>row.libraryRateId===spec.id&&!row.sourceFormula?.startsWith('USER_PLOT_BASE_V1:')?{...row,...patch}:row);
  }
  for(const spec of PLOT_GARDEN_ALLOWANCES) {
    const moved=rows.find(row=>row.libraryRateId===spec.legacyId);
    if(!rows.some(row=>row.libraryRateId===spec.id)&&moved)rows=rows.map(row=>row.id===moved.id?{...row,libraryRateId:spec.id}:row);
    rows=rows.filter(row=>row.libraryRateId!==spec.legacyId);
    const patch={label:spec.label,rate:spec.rate,costDriver:spec.costDriver,unit:spec.unit,priceIndex:233,sourceFormula:`USER_PLOT_GARDENS_V1: ${spec.costDriver} * ${spec.rate}`,sourceRow:'PLOT_WORKS_GARDENS_V1'};
    if(!rows.some(row=>row.libraryRateId===spec.id))rows.push(createSiteDimensionRow({...patch,libraryRateId:spec.id,quantity:0,notes:LANDSCAPING_COMMENT}));
    else rows=rows.map(row=>row.libraryRateId===spec.id?(!row.sourceFormula?.startsWith('USER_PLOT_GARDENS_V1:')?{...row,...patch}:{...row,priceIndex:233}):row);
  }
  for (const spec of requested) {
    const existing = rows.filter(row => row.libraryRateId === spec.id);
    const patch = { label: spec.label, rate: spec.rate, costDriver: 'SITE_AREA_M2' as const, unit: 'm2' as const,
      sourceFormula: `USER_SITE_AREA_V1: SITE_AREA_M2 * ${spec.rate}`, sourceRow: 'INFRASTRUCTURE_CORE_SITE_AREA_V1' };
    if (!existing.length) rows = [...rows, createSiteDimensionRow({ ...patch, libraryRateId: spec.id, quantity: 0, priceIndex: option.programme?.appraisalPriceIndex || 0, notes: 'User-specified allowance; uses gross site area from Base measures. No separate addition of roads or footpaths to that area.' })];
    else rows = rows.map(row => row.libraryRateId === spec.id && !row.sourceFormula?.startsWith('USER_SITE_AREA_V1:') ? { ...row, ...patch, priceIndex: option.programme?.appraisalPriceIndex || 0 } : row);
  }
  for (const spec of DRAINAGE_ALLOWANCES) {
    const patch = {label:spec.label,rate:spec.rate,costDriver:'ROADS_M2' as const,unit:'m2' as const,priceIndex:233,sourceFormula:`USER_DRAINAGE_V1: ROADS_M2 * ${spec.rate}`,sourceRow:'INFRASTRUCTURE_DRAINAGE_V1'};
    if (!rows.some(row => row.libraryRateId === spec.id)) rows.push(createSiteDimensionRow({...patch,libraryRateId:spec.id,quantity:0,notes:DRAINAGE_COMMENT}));
    else rows = rows.map(row => row.libraryRateId === spec.id && !row.sourceFormula?.startsWith('USER_DRAINAGE_V1:') ? {...row,...patch} : row);
  }
  for(const spec of LANDSCAPING_FENCING_COMPOUND_ALLOWANCES) {
    const patch={label:spec.label,rate:spec.rate,costDriver:spec.costDriver,unit:spec.unit,priceIndex:233,sourceFormula:`USER_LANDSCAPING_FENCING_COMPOUND_V1: ${spec.costDriver} * ${spec.rate}`,sourceRow:'INFRASTRUCTURE_LANDSCAPING_FENCING_COMPOUND_V1'};
    if(!rows.some(row=>row.libraryRateId===spec.id))rows.push(createSiteDimensionRow({...patch,libraryRateId:spec.id,quantity:0,notes:spec.unit==='m2'?LANDSCAPING_COMMENT:''}));
    else rows=rows.map(row=>row.libraryRateId===spec.id&&!row.sourceFormula?.startsWith('USER_LANDSCAPING_FENCING_COMPOUND_V1:')?{...row,...patch}:row);
  }
  for(const spec of SERVICES_LIGHTING_ALLOWANCES) {
    const patch={label:spec.label,rate:spec.rate,costDriver:spec.costDriver,unit:spec.unit,priceIndex:233,sourceFormula:`${spec.id==='awd-infrastructure-street-lighting-works'?'USER_STREET_LIGHTING_WORKS_V1':'USER_SERVICES_LIGHTING_V1'}: ${'unpriced' in spec ? 'UNPRICED' : spec.costDriver+' * '+spec.rate}`,sourceRow:'INFRASTRUCTURE_SERVICES_LIGHTING_V1',notes:'unpriced' in spec ? 'Rate to be assessed; excluded from priced totals until assessed.' : SERVICES_COMMENT};
    if(!rows.some(row=>row.libraryRateId===spec.id))rows.push(createSiteDimensionRow({...patch,libraryRateId:spec.id,quantity:0}));
    else rows=rows.map(row=>row.libraryRateId===spec.id&&!row.sourceFormula?.startsWith(spec.id==='awd-infrastructure-street-lighting-works'?'USER_STREET_LIGHTING_WORKS_V1:':'USER_SERVICES_LIGHTING_V1:')?{...row,...patch}:row);
  }
  for (const spec of ROADS_PATHS_ALLOWANCES) {
    const patch={label:spec.label,rate:spec.rate,costDriver:spec.costDriver,unit:spec.unit,priceIndex:233,sourceFormula:`USER_ROADS_PATHS_V1: ${spec.costDriver} * ${spec.rate}`,sourceRow:'INFRASTRUCTURE_ROADS_PATHS_V1'};
    if(!rows.some(row=>row.libraryRateId===spec.id))rows.push(createSiteDimensionRow({...patch,libraryRateId:spec.id,quantity:0,notes:ROADS_PATHS_COMMENT}));
    else rows=rows.map(row=>row.libraryRateId===spec.id&&!row.sourceFormula?.startsWith('USER_ROADS_PATHS_V1:')?{...row,...patch}:row);
  }
  rows = rows.map(row => row.libraryRateId === 'awd-infrastructure-topsoil-strip-stockpile' ? {...row,label:'Topsoil strip and stockpile'} : row.libraryRateId === 'awd-infrastructure-cut-and-fill' ? {...row,label:'Cut and fill'} : row);
  rows = rows.map(row => !row.isCostDriverInput && siteBaseRowMatches(row, 'INFRASTRUCTURE') ? {...row, priceIndex:233} : row);
  rows = rows.map(row => !row.isCostDriverInput && siteBaseRowMatches(row, 'PLOT_WORKS') ? {...row, priceIndex:233} : row);
  rows = rows.map(row => !row.isCostDriverInput && siteBaseRowMatches(row, 'PRELIMS') ? {...row, priceIndex:isScottishStatutoryFeeRow(row) || row.libraryRateId === 'awd-prelims-rcc-inspection' || row.libraryRateId?.startsWith('awd-prelims-scottish-water-') ? 0 : 233} : row);
  rows = rows.map(row => row.libraryRateId === MINI_SKIPS_ROW_ID ? {
    ...row, label: 'Mini Skips', costDriver: 'TOTAL_UNITS', unit: 'nr', rate: 150,
    sourceFormula: '3 to 9 site-wide mini skips by dwelling count × £150 each', sourceRow: 'PRELIMS_MINI_SKIPS',
  } : row);
  rows = rows.map(row => row.libraryRateId === SKIP_WASTE_ROW_IDS.loads ? {
    ...row, label: '8-yard equivalent skip loads', costDriver: 'TOTAL_UNITS', unit: 'nr', rate: 325,
    sourceFormula: 'House-type construction counts × size-based loads × £325 per load', sourceRow: 'PRELIMS_SKIP_LOADS',
  } : row);
  rows = rows.map(row => row.libraryRateId === PLOT_HEATING_ROW_IDS.purchase ? {
    ...row, label: 'Plot heaters — purchase fleet', costDriver: 'FIXED_SUM', unit: 'nr', rate: 200,
    sourceFormula: 'Optimised purchased heater fleet including spares × unit purchase price', sourceRow: 'PRELIMS_PLOT_HEATERS',
  } : row);
  rows = rows.map(row => row.libraryRateId === 'awd-prelims-general-repairs' ? {
    ...row, label: 'General Repairs', costDriver: 'PROGRAMME_MONTHS', unit: 'month', rate: 200,
    sourceFormula: 'Programme months × £200 for minor site-accommodation and compound repairs', sourceRow: 'Prelims!B48',
  } : row);
  rows = rows.map(row => row.libraryRateId === 'awd-prelims-consumables' ? {
    ...row, label: 'Other site consumables', rate: 0,
    sourceFormula: 'No separate base allowance; H&S and Small Plant cover management consumables and tools',
    notes: 'Use a manual adjustment only for identifiable site consumables not covered by H&S, Small Plant or subcontract rates.',
  } : row);
  rows = rows.map(row => row.libraryRateId === 'awd-prelims-electricity-phones-bt' ? {
    ...row, label: 'Site communications — mobiles and Starlink', costDriver: 'PROGRAMME_MONTHS', unit: 'month', rate: 150,
    sourceFormula: 'Programme months × (£70 two company mobiles + £70 Starlink subscription + £10 incidental charges)', sourceRow: 'Prelims!B50',
  } : row);
  rows = rows.map(row => row.libraryRateId === 'awd-prelims-forklift-repairs' ? {
    ...row, label: 'Forklift Repairs', costDriver: 'FORKLIFTS_FORMULA', unit: 'month', rate: 212.5,
    sourceFormula: FORKLIFT_REPAIRS_SOURCE_FORMULA, sourceRow: 'Prelims!B40',
    notes: refreshGeneratedForkliftNotes(row.libraryRateId, row.notes),
  } : row);
  rows = rows.map(row => SALES_PRELIMS_MONTHLY_RATE_IDS.has(row.libraryRateId || '') ? {
    ...row,
    sourceFormula: 'MAX(0, programme months - lead-in months - 4 showhouse months) x monthly rate',
  } : row);
  rows = rows.map(row => row.libraryRateId === 'awd-prelims-sales-sundries' ? {
    ...row, label: 'Sales Sundries', costDriver: 'PROGRAMME_MONTHS', unit: 'month', rate: 250,
    sourceFormula: 'MAX(0, programme months - lead-in months - 4 showhouse months) x £250 per sales-office operating month',
    sourceRow: 'Prelims!B61',
  } : row);
  rows = rows.map(row => row.libraryRateId === SALES_MARKETING_ROW_IDS.showhome ? {
    ...row, label: 'Show Home Fitout', costDriver: 'FIXED_SUM', unit: 'sum', rate: 32000,
    sourceFormula: 'One showhome: £26,000 furnishings/decoration plus £6,000 floor coverings when not in plot cost',
    sourceRow: 'USER_SHOWHOME_FITOUT_2026',
  } : row.libraryRateId === SALES_MARKETING_ROW_IDS.ongoing ? {
    ...row, label: 'Ongoing advertising and marketing', costDriver: 'PROGRAMME_MONTHS', unit: 'month', rate: 3000,
    sourceFormula: 'Sales operating months × £3,000/month default advertising allowance', sourceRow: 'USER_ONGOING_MARKETING_2026',
  } : row);
  rows = rows.map(row => row.libraryRateId === HERAS_FENCING_ROW_ID ? {
    ...row,
    label: 'Heras fencing — new stock purchase',
    rate: 0.2,
    sourceFormula: 'Site-specific bay purchase: estimated/measured perimeter, less secure boundary, plus internal fencing; 50% new stock by default',
  } : row);
  rows = rows.map(row => row.libraryRateId === SILO_GENERATOR_ROW_ID ? {
    ...row,
    label: 'Silo generator — purchase or hire',
    costDriver: 'PROGRAMME_MONTHS', unit: 'month', rate: 400,
    sourceFormula: 'Compare purchase/reuse ownership with hire over selected active mortar months; fuel separately priced',
  } : row);
  if (rows.some(row => row.libraryRateId === SILO_GENERATOR_ROW_ID) && !rows.some(row => row.libraryRateId === SILO_GENERATOR_FUEL_ROW_ID))
    rows.push(createSiteDimensionRow({ libraryRateId: SILO_GENERATOR_FUEL_ROW_ID, label: 'Silo generator diesel fuel', unit: 'month', costDriver: 'PROGRAMME_MONTHS', quantity: 0, rate: 330, priceIndex: 233, sourceFormula: 'Active silo generator months × £330/month provisional diesel allowance', sourceRow: 'PRELIMS_SILO_GENERATOR_FUEL' }));
  if (rows.some(row => row.libraryRateId === PLOT_HEATING_ROW_IDS.purchase)) {
    if (!rows.some(row => row.libraryRateId === PLOT_HEATING_ROW_IDS.hire))
      rows.push(createSiteDimensionRow({ libraryRateId: PLOT_HEATING_ROW_IDS.hire, label: 'Plot heaters — peak hire', unit: 'week', costDriver: 'FIXED_SUM', quantity: 0, rate: 25, priceIndex: 233, sourceFormula: 'Optimised hired heater-weeks × weekly hire rate', sourceRow: 'PRELIMS_PLOT_HEATER_HIRE' }));
    if (!rows.some(row => row.libraryRateId === PLOT_HEATING_ROW_IDS.electricity))
      rows.push(createSiteDimensionRow({ libraryRateId: PLOT_HEATING_ROW_IDS.electricity, label: 'Plot-heating electricity', unit: 'kWh', costDriver: 'FIXED_SUM', quantity: 0, rate: 0.25, priceIndex: 233, sourceFormula: 'Working heater-days × kW × hours/day × thermostat duty × electricity rate', sourceRow: 'PRELIMS_PLOT_HEATER_ELECTRICITY' }));
  }
  rows = rows.map(row => row.libraryRateId === 'awd-prelims-rcc' && row.label === 'RCC' ? { ...row, label: 'RCC application / consent' } : row);
  rows = rows.map(row => row.libraryRateId === 'awd-prelims-scottish-water-charges' ? { ...row, label: 'Scottish Water building water and foul infrastructure' }
    : row.libraryRateId === 'awd-prelims-scottish-water-rebates' ? { ...row, label: 'Scottish Water foul-water rebate' }
    : row.libraryRateId === 'awd-prelims-scottish-water-connections' ? { ...row, label: 'Scottish Water applications and inspections' } : row);
  if (rows.some(row => row.libraryRateId === 'awd-prelims-rcc') && !rows.some(row => row.libraryRateId === 'awd-prelims-rcc-inspection'))
    rows.push(createSiteDimensionRow({ libraryRateId: 'awd-prelims-rcc-inspection', label: 'RCC construction inspections', unit: 'sum', costDriver: 'RCC_FEES_FORMULA', quantity: 1, rate: 1, priceIndex: 0, sourceFormula: 'Published inspection fee or provisional visit-based inspection budget', sourceRow: 'Roads authority 2026/27 inspection schedule' }));
  if (rows.some(row => row.libraryRateId === TEMPORARY_POWER_ROW_IDS.mains) && !rows.some(row => row.libraryRateId === TEMPORARY_POWER_ROW_IDS.mainsElectricity))
    rows.push(createSiteDimensionRow({ libraryRateId: TEMPORARY_POWER_ROW_IDS.mainsElectricity, label: 'Site-office mains electricity', unit: 'month', costDriver: 'PROGRAMME_MONTHS', quantity: 0, rate: 300, priceIndex: 233, sourceFormula: 'Selected mains months × 1,200 kWh/month × £0.25/kWh', sourceRow: 'PRELIMS_SITE_OFFICE_MAINS_ELECTRICITY' }));
  if (rows.some(row => row.libraryRateId === DRINKING_WATER_ROW_IDS.bottled)) {
    if (!rows.some(row => row.libraryRateId === DRINKING_WATER_ROW_IDS.connection)) rows.push(createSiteDimensionRow({ libraryRateId: DRINKING_WATER_ROW_IDS.connection, label: 'Potable mains connection to site cabins', unit: 'sum', costDriver: 'FIXED_SUM', quantity: 1, rate: 1500, priceIndex: 233, sourceFormula: 'Selected drinking-water solution', sourceRow: 'PRELIMS_DRINKING_WATER_CONNECTION' }));
    if (!rows.some(row => row.libraryRateId === DRINKING_WATER_ROW_IDS.mainsService)) rows.push(createSiteDimensionRow({ libraryRateId: DRINKING_WATER_ROW_IDS.mainsService, label: 'Site-cabin potable mains standing and usage', unit: 'month', costDriver: 'PROGRAMME_MONTHS', quantity: 0, rate: 50, priceIndex: 233, sourceFormula: 'Selected drinking-water solution', sourceRow: 'PRELIMS_DRINKING_WATER_MAINS_SERVICE' }));
  }
  if (rows.some(row => row.libraryRateId === FUEL_ROW_IDS.telehandler) && !rows.some(row => row.libraryRateId === FUEL_ROW_IDS.accommodationGenerator))
    rows.push(createSiteDimensionRow({ libraryRateId: FUEL_ROW_IDS.accommodationGenerator, label: 'Site-accommodation generator diesel fuel', unit: 'month', costDriver: 'PROGRAMME_MONTHS', quantity: 0, rate: 850, priceIndex: 233, sourceFormula: 'Generator diesel months selected by the combined temporary-power strategy', sourceRow: 'PRELIMS_GENERATOR_FUEL' }));
  if (rows.some(row => row.libraryRateId === SAFETY_PLANT_ROW_IDS.healthAndSafety) && !rows.some(row => row.libraryRateId === SAFETY_PLANT_ROW_IDS.externalInspections))
    rows.push(createSiteDimensionRow({ libraryRateId: SAFETY_PLANT_ROW_IDS.externalInspections, label: 'External H&S inspection visits', unit: 'nr', costDriver: 'PROGRAMME_MONTHS', quantity: 0, rate: 250, priceIndex: 233, sourceFormula: 'Optional external visits × rate per visit', sourceRow: 'PRELIMS_EXTERNAL_SAFETY_INSPECTIONS' }));
  if (rows.some(row => row.libraryRateId === SKIP_WASTE_ROW_IDS.loads)) {
    if (!rows.some(row => row.libraryRateId === SKIP_WASTE_ROW_IDS.segregationHandling))
      rows.push(createSiteDimensionRow({ libraryRateId: SKIP_WASTE_ROW_IDS.segregationHandling, label: 'Waste segregation handling', unit: 'nr', costDriver: 'TOTAL_UNITS', quantity: 0, rate: 50, priceIndex: 233, sourceFormula: 'Selected segregated collection handling per dwelling', sourceRow: 'PRELIMS_SKIP_SEGREGATION_HANDLING' }));
    if (!rows.some(row => row.libraryRateId === SKIP_WASTE_ROW_IDS.segregationSetup))
      rows.push(createSiteDimensionRow({ libraryRateId: SKIP_WASTE_ROW_IDS.segregationSetup, label: 'Waste segregation setup', unit: 'sum', costDriver: 'FIXED_SUM', quantity: 0, rate: 500, priceIndex: 233, sourceFormula: 'Selected segregated collection setup', sourceRow: 'PRELIMS_SKIP_SEGREGATION_SETUP' }));
  }
  if (!rows.some(row => row.libraryRateId === INFRASTRUCTURE_PRELIMS_ID)) rows.push(createSiteDimensionRow({libraryRateId:INFRASTRUCTURE_PRELIMS_ID,label:'Infrastructure preliminaries — 4% of the other infrastructure sections',unit:'sum',costDriver:'FIXED_SUM',quantity:1,rate:0.04,priceIndex:233,sourceFormula:'4% of infrastructure sections, excluding preliminaries, plot works and abnormals',sourceRow:'INFRASTRUCTURE_CUSTOM'}));
  const existingRows = option.siteDimensions || [];
  if (rows.length === existingRows.length && rows.every((row, index) => {
    const existing = existingRows[index];
    const keys = Object.keys(row) as Array<keyof AppraisalSiteDimensionRow>;
    return keys.length === Object.keys(existing).length && keys.every((key) => row[key] === existing[key]);
  })) return option;
  return { ...option, siteDimensions: rows };
}
