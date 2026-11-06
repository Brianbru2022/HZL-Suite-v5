import type { AppraisalFinalReportMetrics, AppraisalOptionMetrics } from './utils/appraisal';
import type { FinalReportData } from './utils/appraisalFinalReport';
import type { CommercialFinancialAssurance } from './utils/commercialLifecycle';

export enum UnitType {
  M = "m",
  M2 = "m2",
  M3 = "m3",
  KG = "kg",
  NR = "nr",
  T = "t",
  SUM = "sum",
  HRS = "hrs",
}

export type ItemType =
  | "SUB_SECTION"
  | "MAJOR_HEADING"
  | "GENERAL_HEADING"
  | "MINOR_HEADING"
  | "COMMENT"
  | "SUB_COMMENT"
  | "PRICED"
  | "EXTRA_OVER_ITEM"
  | "PROVISIONAL_SUM"
  | "PC_SUM";

export type ClearValuesMode = "RATES" | "QUANTITIES" | "RATES_AND_QUANTITIES";

export type LibraryInsertMode =
  | "ITEM_ONLY"
  | "WITH_MISSING_PARENTS"
  | "FROM_HEADING"
  | "FROM_COMMENT"
  | "FULL_SECTION";

export type LibraryInsertPlacement =
  "BOTTOM" | "TOP" | "AFTER_SELECTED" | "BEFORE_SELECTED";

export interface LibraryInsertDestination {
  billId: string;
  sectionId?: string;
  pageId?: string | null;
  placement: LibraryInsertPlacement;
  anchorItemId?: string | null;
}

export type WorkflowModuleId =
  | "APPRAISALS"
  | "TAKE_OFF"
  | "ESTIMATING"
  | "LIBRARY_MAINTENANCE"
  | "TENDER_ANALYSIS"
  | "SUBCONTRACT_APPOINTMENT"
  | "CONTRACTS"
  | "VALUATIONS"
  | "VARIATIONS"
  | "FINAL_ACCOUNTS"
  | "AUDITS"
  | "COST_REPORTS";

export type WorkflowModuleStatus = "AVAILABLE" | "BETA" | "COMING_SOON";

export type WorkflowModuleGroup = "LIVE" | "GLOBAL_TOOL" | "COMING_SOON";

export type WorkflowModuleCategory =
  | "PRE_CONTRACT"
  | "ESTIMATING"
  | "TENDERING"
  | "POST_CONTRACT"
  | "REPORTING"
  | "SYSTEM";

export interface WorkflowModule {
  id: WorkflowModuleId;
  name: string;
  description: string;
  status: WorkflowModuleStatus;
  category: WorkflowModuleCategory;
  group?: WorkflowModuleGroup;
  requiresProject: boolean;
  primaryAction: string;
  dependsOn?: WorkflowModuleId[];
  readinessLabel?: string;
  plannedInputs: string[];
  plannedOutputs: string[];
}

export type WorkspaceFolderModule = "ESTIMATING" | "APPRAISALS";

export interface WorkspaceFolder {
  id: string;
  module: WorkspaceFolderModule;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export type AppraisalCalculationMode =
  "RESIDUAL_LAND_VALUE" | "KNOWN_LAND_PROFIT_ON_GDV";
export type AppraisalTemplate = "RESIDENTIAL_SALES" | "COMMERCIAL_INCOME";
export type DevelopmentAppraisalKind = "HOUSE_BUILDING" | "COMMERCIAL";
export type AppraisalStatus = "DRAFT" | "REVIEW" | "APPROVED" | "ARCHIVED";
export type AppraisalSiteStatus =
  | "NOT_VIABLE"
  | "BID_LOST"
  | "VIABLE_DISCOUNTED"
  | "NOT_APPRAISED"
  | "APPRAISAL_IN_PROGRESS"
  | "APPRAISED_VIABLE"
  | "APPRAISED_PURSUED"
  | "SITE_ACQUIRED";
export type AppraisalPlanningStatus =
  | "UNKNOWN"
  | "NONE"
  | "IN_LDP"
  | "EXPIRED"
  | "IN_PRINCIPLE"
  | "DETAILED_CONSENT";
export type AppraisalCostPackId = "AWD";
export type AppraisalTimingProfileType =
  "UPFRONT" | "EVEN" | "END" | "S_CURVE" | "CUSTOM";

export interface AppraisalCashflowProfile {
  type: AppraisalTimingProfileType;
  startMonth: number;
  endMonth: number;
  customPercentages?: number[];
}

export interface AppraisalRevenueLine {
  id: string;
  title: string;
  template: AppraisalTemplate;
  units?: number;
  saleValuePerUnit?: number;
  area?: number;
  valuePerArea?: number;
  rentRate?: number;
  annualRent?: number;
  yieldPercent?: number;
  voidPercent?: number;
  incentivePercent?: number;
  manualValue?: number;
  cashflow: AppraisalCashflowProfile;
  notes?: string;
}

export type AppraisalCostCategory =
  | "LAND_ACQUISITION"
  | "CONSTRUCTION"
  | "EXTERNAL_WORKS"
  | "ABNORMALS"
  | "PROFESSIONAL_FEES"
  | "STATUTORY_AUTHORITY"
  | "MARKETING_SALES"
  | "CONTINGENCY"
  | "FINANCE"
  | "OTHER";

export type AppraisalCostPercentageBasis =
  "NONE" | "GDV" | "NON_LAND_COSTS" | "CONSTRUCTION_COSTS";

export type AppraisalSiteCostAllocation = 'INFRASTRUCTURE' | 'PLOT_WORKS' | 'SITE_SPECIFIC' | 'ABNORMALS';
export type AppraisalSiteCostStatus = 'TO_BE_ASSESSED' | 'PROVISIONAL' | 'KNOWN' | 'CLEARED';
export interface AppraisalSiteCostMetadata {
  allocation: AppraisalSiteCostAllocation;
  status: AppraisalSiteCostStatus;
  includeInLandOffer: boolean;
  responsiblePerson?: string;
  offerQualification?: string;
  baseOverlapNote?: string;
  checklistKey?: string;
  clearanceReason?: string;
  history: Array<{ at: string; action: string; before: string; after: string; reason?: string }>;
}

export interface AppraisalCostLine {
  engineeringScopeItemId?: string;
  /** Live link to a removal allowance retained in the site measurement schedule. */
  sourceSiteDimensionId?: string;
  id: string;
  title: string;
  category: AppraisalCostCategory;
  amount: number;
  percentageBasis?: AppraisalCostPercentageBasis;
  percentageValue?: number;
  cashflow: AppraisalCashflowProfile;
  notes?: string;
  sourceProjectId?: string;
  sourceBillId?: string;
  sourceSectionId?: string;
  sourcePageId?: string;
  sourceLabel?: string;
  formalQuotations?: AppraisalPricingReport[];
  pricedItemsInformationNotes?: string;
  nonPricedItemsInformationNotes?: string;
  readOnlySnapshot?: boolean;
  linkedAbnormalFrozen?: boolean;
  linkedAbnormalFrozenAt?: string;
  linkedAbnormalVersion?: number;
  previousLinkedAbnormalId?: string;
  siteCost?: AppraisalSiteCostMetadata;
  abnormalElement?: {
    categoryId?: string;
    categoryLabel?: string;
    presetId?: string;
    presetLabel?: string;
    presetScope?: string;
    kind: 'BILL' | 'RATE' | 'AI' | 'MANUAL';
    rateId?: string;
    quantity?: number;
    unit?: string;
    rate?: number;
    priceIndex?: number;
    basis?: string;
    dialogue?: Array<{ role: 'user' | 'assistant'; text: string }>;
  };
}

export type AppraisalHouseTypeStatus = "ACTIVE" | "DRAFT" | "ARCHIVED";
export type AppraisalHouseTenure = "PRIVATE" | "AFFORDABLE";
export type AppraisalHouseTypeCostComponentKey =
  | "GROUNDWORK"
  | "BRICK_LAB"
  | "BRICK_MAT"
  | "KIT"
  | "JOINER"
  | "WINDOWS_DOORS"
  | "METALWORK"
  | "STEEL"
  | "SECOND_STEEL"
  | "ROOFING"
  | "PV"
  | "ROUGHCAST"
  | "ELECTRICAL"
  | "PLUMBING"
  | "GARAGE_DOORS"
  | "EV_CHARGERS"
  | "AIR_SOURCE_HEAT_PUMPS"
  | "CERAMIC_TILING"
  | "DECORATION"
  | "SEALANTS"
  | "KITCHEN"
  | "CLEANING"
  | "SCAFFOLD"
  | "FIRE_PROTECTION"
  | "LIFT"
  | "COMMON_STAIRS"
  | "HANDRAILS_BALUSTRADES"
  | "LANDLORD_LIGHTING"
  | "DOOR_ENTRY_ACCESS"
  | "SMOKE_VENT_FIRE_ALARM"
  | "ACOUSTIC_COMPARTMENTATION"
  | "COMMUNAL_FINISHES"
  | "REFUSE_CYCLE_STORES"
  | "CUSTOM_ALLOWANCE";

export interface AppraisalHouseTypeCostComponent {
  id: string;
  key: AppraisalHouseTypeCostComponentKey;
  label: string;
  amount: number;
  /** Base cost index for this individual trade/component. */
  priceIndex?: number;
  included?: boolean;
  notes?: string;
  aiGenerated?: boolean;
  detailRows?: Array<{
    id?: string;
    label: string;
    quantity: number;
    unit: string;
    rate: number;
    total: number;
    basis?: string;
    included?: boolean;
  }>;
}

export interface AppraisalProgrammeAssumptions {
  appraisalPriceIndex?: number;
  expectedStartDate?: string;
  startPriceIndex?: number;
  saleRateUnitsPerMonth?: number;
  leadInMonths?: number;
}

export type AppraisalHouseTypeStyle =
  | "BUNGALOW"
  | "VILLA"
  | "TOWNHOUSE"
  | "FLAT"
  | "COTTAGE_FLAT"
  | "DETACHED"
  | "SEMI_DETACHED"
  | "TERRACE"
  | "COTTAGE"
  | "OTHER";

export type AppraisalHouseTypeConfiguration =
  | "DETACHED"
  | "SEMI_DETACHED"
  | "END_TERRACE"
  | "MID_TERRACE"
  | "TERRACE"
  | "COTTAGE_FLAT"
  | "OTHER";

export interface AppraisalHouseTypeLibraryItem {
  id: string;
  name: string;
  style?: AppraisalHouseTypeStyle;
  configuration?: AppraisalHouseTypeConfiguration;
  storeys?: number;
  bedrooms?: number;
  garage?: boolean;
  privateDrive?: boolean;
  gifaM2: number;
  buildCostPerM2: number;
  costBreakdown?: AppraisalHouseTypeCostComponent[];
  priceIndex?: number;
  buildPeriodMonths?: number;
  notes?: string;
  /** Deliberately partial library record. It remains visible for completion but cannot be scheduled. */
  isIncomplete?: boolean;
  incompleteWarning?: string;
  status: AppraisalHouseTypeStatus;
  favorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppraisalHouseTypeSalesRow {
  id: string;
  label: string;
  quantity: number;
  gifaM2: number;
  saleValuePerUnit?: number;
  saleRatePerM2?: number;
  notes?: string;
}

export interface AppraisalRateLibraryItem {
  id: string;
  category: AppraisalSiteDimensionCategory;
  costDriver?: AppraisalInfrastructureCostDriver;
  label: string;
  unit: AppraisalSiteDimensionUnit;
  rate: number;
  formulaComponents?: AppraisalRateFormulaComponent[];
  priceIndex?: number;
  sourceFormula?: string;
  sourceRow?: string;
  notes?: string;
  status: AppraisalHouseTypeStatus;
  favorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppraisalHouseTypeScheduleRow {
  id: string;
  libraryHouseTypeId?: string;
  houseTypeName: string;
  style?: AppraisalHouseTypeStyle;
  configuration?: AppraisalHouseTypeConfiguration;
  storeys?: number;
  bedrooms?: number;
  garage?: boolean;
  privateDrive?: boolean;
  tenure?: AppraisalHouseTenure;
  quantity: number;
  separateSalesQuantity?: boolean;
  salesQuantity?: number;
  constructionQuantityLabel?: string;
  salesQuantityLabel?: string;
  quantitySeparationNotes?: string;
  gifaM2: number;
  /** Optional site-specific override; zero when disposal for this type is already in trade prices. */
  skipLoadsPerDwelling?: number;
  buildCostPerM2: number;
  costBreakdown?: AppraisalHouseTypeCostComponent[];
  priceIndex?: number;
  buildPeriodMonths?: number;
  salesRows?: AppraisalHouseTypeSalesRow[];
  saleValuePerUnit?: number;
  saleRatePerM2?: number;
  notes?: string;
}

export type AppraisalSiteDimensionCategory =
  | "SITE_AREA"
  | "ROADS"
  | "FOOTPATHS"
  | "COMMON_LANDSCAPING"
  | "BOUNDARY_FENCING"
  | "PLOT_FENCING"
  | "PLANTING"
  | "DRIVES"
  | "COMMUNAL_PARKING"
  | "FRONT_GARDENS"
  | "REAR_GARDENS"
  | "OTHER";

export type AppraisalInfrastructureCostDriver =
  | "TOTAL_UNITS"
  | "SITE_AREA_M2"
  | "ROADS_M2"
  | "PATHS_M2"
  | "EXISTING_ROAD_JUNCTIONS"
  | "PLOT_WORKS_DRIVES_M2"
  | "PLOT_WORKS_FOOTPATHS_M2"
  | "FRONT_GARDENS_M2"
  | "REAR_GARDENS_M2"
  | "COMMON_LANDSCAPING_M2"
  | "PLANTING_M2"
  | "BOUNDARY_FENCING_M"
  | "PLOT_FENCING_M"
  | "GARDEN_WALLS_M"
  | "UNITS_WITH_DRIVES"
  | "UNITS_WITHOUT_DRIVES"
  | "GARDEN_WALLS_BASE_COST"
  | "PROGRAMME_MONTHS"
  | "BUILD_RATE_UNITS_PER_MONTH"
  | "STANDARD_HOUSE_TYPE_COUNT"
  | "NON_STANDARD_HOUSE_TYPE_COUNT"
  | "SUMMARY_BUILD_COST"
  | "TOTAL_GDV"
  | "BUILDING_WARRANT_COST_BASIS"
  | "ENGINEERS_FEES_FORMULA"
  | "PLANNING_FEES_FORMULA"
  | "BUILDING_WARRANT_FORMULA"
  | "RCC_FEES_FORMULA"
  | "ASSISTANT_SITE_MANAGER_FORMULA"
  | "FORKLIFT_DRIVER_FORMULA"
  | "FORKLIFTS_FORMULA"
  | "LABOURERS_FORMULA"
  | "SCOTTISH_WATER_REBATE_FORMULA"
  | "FIXED_SUM";

export type AppraisalSiteDimensionUnit = "m2" | "m" | "nr" | "sum" | "month" | "week" | "kWh";

export interface AppraisalRateFormulaComponent {
  id: string;
  label: string;
  costDriver?: AppraisalInfrastructureCostDriver;
  quantity?: number;
  rate: number;
  sourceFormula?: string;
  notes?: string;
}

export interface AppraisalSiteDimensionRow {
  id: string;
  category: AppraisalSiteDimensionCategory;
  costDriver?: AppraisalInfrastructureCostDriver;
  isCostDriverInput?: boolean;
  libraryRateId?: string;
  label: string;
  unit: AppraisalSiteDimensionUnit;
  quantity: number;
  rate: number;
  priceIndex?: number;
  /** Signed preliminaries adjustment in pounds at the row's base index. */
  manualAdjustment?: number;
  sourceFormula?: string;
  sourceRow?: string;
  notes?: string;
}

export interface AppraisalPricingReport {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  /**
   * Legacy embedded evidence. New desktop uploads are stored alongside the
   * local database so the appraisal row does not contain a second base64 copy.
   */
  dataUrl?: string;
  storageMode?: "EMBEDDED" | "MANAGED_LOCAL";
  localEvidencePath?: string;
  contentSha256?: string;
  integrityStatus?: "VERIFIED" | "MISSING" | "CHANGED" | "UNAVAILABLE";
  integrityCheckedAt?: string;
  notes?: string;
  extractedText?: string;
  extractionStatus?:
    "PENDING" | "EXTRACTED" | "WARNING" | "FAILED" | "UNSUPPORTED";
  extractedAt?: string;
  extractionError?: string;
}

export type CommercialAssetRevenueModel =
  "LEASE" | "OWNER_OPERATED" | "CONCESSION" | "SALE" | "OTHER";
export type CommercialAssetSource = "TEMPLATE" | "ASSESSMENT" | "MANUAL";

export interface CommercialAsset {
  id: string;
  title: string;
  description?: string;
  source: CommercialAssetSource;
  included: boolean;
  revenueModel: CommercialAssetRevenueModel;
  siteAllocationM2?: number;
  revenueLineIds: string[];
  costLineIds: string[];
  annualOperatingCostPercent?: number;
  annualRevenueGrowthPercent?: number;
  annualLifecycleCapexPercent?: number;
  exitYieldPercent?: number;
  sellingCostsPercent?: number;
  rationale?: string;
  excludedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type AppraisalConsentStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "APPROVED"
  | "CONDITIONED"
  | "REJECTED"
  | "NOT_REQUIRED";

export type AppraisalConsentStandardKey =
  "SCOTTISH_WATER_SEWERS" | "PLANNING" | "RCC" | "BUILDING_WARRANT" | "CUSTOM";

export interface AppraisalConsentTrackerEntry {
  id: string;
  standardKey: AppraisalConsentStandardKey;
  title: string;
  authority?: string;
  status: AppraisalConsentStatus;
  responsibleParty?: string;
  reference?: string;
  targetDate?: string;
  submittedDate?: string;
  approvedDate?: string;
  notes?: string;
  uploads?: AppraisalPricingReport[];
  createdAt: string;
  updatedAt: string;
}

export type CommercialFinancialScenarioKind = 'BASE' | 'UPSIDE' | 'DOWNSIDE';

/** A reviewable sensitivity case applied to the commercial investment model. */
export interface CommercialFinancialScenario {
  kind: CommercialFinancialScenarioKind;
  name: string;
  rentChangePercent: number;
  voidChangePercent: number;
  developmentCostChangePercent: number;
  lifecycleCapexChangePercent: number;
  exitYieldShiftBps: number;
  delayMonths: number;
}

/**
 * A formal, immutable issue of an appraisal report. The source snapshot is
 * retained so that exports can always be reproduced from the reviewed basis.
 */
export interface AppraisalApprovedReportIssue {
  id: string;
  issueNumber: number;
  reviewer: string;
  approvedAt: string;
  sourceHash: string;
  sourceSnapshot: string;
  evidenceJustification: string;
  allocationJustification: string;
  createdAt: string;
  outputs: Array<{
    format: "PDF" | "EXCEL";
    status: "LOCKED" | "EXPORTED";
    fileName: string;
    exportedAt?: string;
  }>;
}

export interface AppraisalEngineeringScopeItem {
  fixedFee?: number;
  decision: 'PENDING' | 'REQUIRED' | 'NOT_REQUIRED';
  /** Required items use either the calculated amount or an explicitly entered total. */
  pricingMode?: 'CALCULATED' | 'MANUAL';
  rate?: number;
  quantity?: number;
  allowance?: number;
  note?: string;
}
export interface AppraisalEngineeringScope {
  version: 1;
  confirmedAt?: string;
  units?: number;
  houses?: number;
  houseTypes?: number;
  additionalFlattedBlocks?: number;
  items: Record<string, AppraisalEngineeringScopeItem>;
  history: Array<{ at: string; before: string; after: string }>;
}
export interface AppraisalScottishStatutoryFees {
  /** Full permission is the default for a new residential development. */
  planningApplication?: 'FULL_NEW_DWELLINGS' | 'PPP_NEW_DWELLINGS' | 'MANUAL';
  planningManualFee?: number;
  /** One site-wide warrant application. Blank uses the appraisal construction proxy. */
  warrantValueOfWorks?: number;
  warrantCertificates?: {
    structure?: boolean;
    energy?: boolean;
    electrical?: boolean;
    drainage?: boolean;
  };
}
export interface AppraisalRccFees {
  authority: 'UNCONFIRMED' | 'PERTH_KINROSS' | 'EAST_LOTHIAN' | 'OTHER' | 'NOT_REQUIRED';
  otherAuthorityName?: string;
  officerHours?: number;
  roadLengthM?: number;
  footpathLengthM?: number;
  /** Assumed average adopted carriageway width when converting measured area to length. */
  roadWidthM?: number;
  /** Assumed average adopted footway width when converting measured area to length. */
  footpathWidthM?: number;
  inspectionHours?: number;
  roadBondValue?: number;
  roadConstructionCost?: number;
  inspectionVisits?: number;
  inspectionHoursPerVisit?: number;
  budgetHourlyRate?: number;
  manualFee?: number;
  /** Separate authority-confirmed component overrides; legacy manualFee remains a combined total. */
  manualApplicationFee?: number;
  manualInspectionFee?: number;
  note?: string;
  /** Frozen pre-selection allowance, retained solely to avoid altering existing appraisals on upgrade. */
  legacyAllowance?: number;
}
/** Scottish Water 2026/27 development-charge assumptions, held per appraisal. */
export interface AppraisalScottishWaterFees {
  waterDwellings?: number;
  wastewaterDwellings?: number;
  buildingWaterFlatHomes?: number;
  buildingWaterSemiTerracedHomes?: number;
  buildingWaterDetachedHomes?: number;
  /** Default 50% appraisal credit or an explicit site-specific contribution decision. */
  contributionBasis?: 'DEFAULT_50_PERCENT' | 'NONE' | 'BUDGET' | 'AGREED';
  eligibleWaterWorksCost?: number;
  eligibleWastewaterWorksCost?: number;
  waterContribution?: number;
  wastewaterContribution?: number;
  standardWaterConnections?: number;
  applicationCount?: number;
  waterInspections?: number;
  wastewaterInspections?: number;
  inspectionMethod?: 'ONSITE' | 'DESKTOP';
  /** Quoted non-standard fresh-water connection or main tie-in charges, excluding developer plot service work. */
  quotedAdditionalConnectionCost?: number;
  /** Quoted public-sewer connection charges in addition to inspection visits. */
  quotedWastewaterConnectionCost?: number;
  note?: string;
}
/** Optional per-appraisal overrides of the Prelims staffing and forklift quantities. */
export interface AppraisalPrelimsResourceCounts {
  siteManagers?: number;
  assistantSiteManagers?: number;
  forkliftDrivers?: number;
  labourers?: number;
  forklifts?: number;
}
/** Generator and static bunded fuel tank are selected as one accommodation package. */
export interface AppraisalTemporaryPowerAssumptions {
  generatorPurchase: number;
  tankPurchase: number;
  generatorHirePerWeek: number;
  tankHirePerWeek: number;
  mainsAvailable: boolean;
  mainsAvailableMonth: number;
  permanentPowerCost: number;
  /** Site-office electricity only after the selected mains connection; plot heating is separate. */
  mainsElectricityKwhPerMonth: number;
  mainsElectricityRatePerKwh: number;
}
export interface AppraisalDrinkingWaterAssumptions {
  averagePeople: number;
  /** Optional quoted monthly bottle/dispenser allowance; otherwise calculated from occupancy. */
  bottledMonthlyOverride?: number;
  connectionArrangement: 'SITE_BRANCH' | 'PUBLIC_MAIN' | 'COMPLEX_CONNECTION' | 'NO_MAINS';
  mainsAvailableMonth: number;
  siteBranchCost: number;
  publicMainCost: number;
  complexConnectionCost: number;
  /** Provisional site-accommodation standing and usage allowance after commissioning. */
  mainsMonthlyCost: number;
}
export interface AppraisalFuelAssumptions {
  /** Per telehandler for each active forklift programme month. */
  telehandlerMonthly: number;
  /** Per site-office generator for each month before mains power is selected. */
  accommodationGeneratorMonthly: number;
  /** Diesel for one active mortar-silo generator month; separate from plant and site offices. */
  siloGeneratorMonthly: number;
}
export interface AppraisalSiloGeneratorAssumptions {
  /** Override the programme/house-count estimate when the construction period is known. */
  constructionMonths?: number;
  /** Override the 75% provisional mortar-working period when known. */
  activeMortarMonths?: number;
  /** Month from site start when a suitable dedicated mains supply becomes available. */
  suitableMainsFromSiteMonth?: number;
  activePercent: number;
  readyToUsePurchaseCost: number;
  residualValue: number;
  /** Productive generator months over which the net purchase cost is shared across sites. */
  productiveReuseMonths?: number;
  ownershipMonthlyOtherCost: number;
  hirePerActiveMonth: number;
  /** Editable versions use the portfolio ownership allocation; older frozen versions retain their original basis. */
  costBasisVersion?: 2;
}
export interface AppraisalSalesMarketingAssumptions {
  /** Zero-based month from the start of the site programme; cannot precede sales start. */
  campaignStartMonth?: number;
  /** Zero-based month from the start of the site programme; undefined uses programme completion. */
  campaignEndMonth?: number;
  monthlyMarketingRate: number;
  /** Uncheck when standard plot construction already includes the showhome floor coverings. */
  includeShowhomeFloorCoverings: boolean;
}
export interface AppraisalSurveyReportItemChoice {
  included?: boolean;
  /** Quoted amount excluding VAT; applies only while quote evidence is attached. */
  manualFee?: number;
  quote?: AppraisalPricingReport;
  note?: string;
}
export interface AppraisalCustomSurveyReport extends AppraisalSurveyReportItemChoice {
  id: string;
  label: string;
  category: string;
  baseFee: number;
  ratePerM2: number;
}
export interface AppraisalSurveyReportAssumptions {
  /** Applying the schedule creates one fixed Prelims line for each included report. */
  confirmedAt?: string;
  items?: Record<string, AppraisalSurveyReportItemChoice>;
  custom?: AppraisalCustomSurveyReport[];
}
export interface AppraisalSafetyPlantAssumptions {
  /** External H&S inspection visits are separate from the monthly consumables allowance. */
  externalInspectionsRequired: boolean;
  inspectionVisitsPerMonth: number;
  inspectionRatePerVisit: number;
}
/** Site-specific temporary mesh-fencing purchase assumptions. */
export interface AppraisalHerasFencingAssumptions {
  /** Override the area-derived external perimeter when a measured boundary is available. */
  measuredPerimeterM?: number;
  /** Existing secure boundary that does not need temporary fencing. */
  secureBoundaryM: number;
  internalFencingPercent: number;
  existingStockPercent: number;
}
export interface AppraisalSkipWasteAssumptions {
  centralCollection: boolean;
  mixedRatePerLoad: number;
  segregatedCollection: boolean;
  segregatedRatePerLoad: number;
  segregationHandlingPerDwelling: number;
  segregationSetupCost: number;
  notes?: string;
}
export interface AppraisalPlotHeatingAssumptions {
  weeksPerHouse: number;
  heatersPerHouse: number;
  sparePercent: number;
  purchasePerHeater: number;
  hirePerHeaterWeek: number;
  heaterKw: number;
  hoursPerDay: number;
  thermostatDutyPercent: number;
  electricityPerKwh: number;
  notes?: string;
}
export interface DevelopmentAppraisalOption {
  /** Marks the agreed base-rate schedule applied to this editable option. */
  agreedRateBasisVersion?: number;
  /** Legacy outline has the full bill ready, but no basis for its default fixed charges yet. */
  unpricedOutlineUntilSiteInputs?: boolean;
  /** Calculated at the instant this appraisal revision is frozen. */
  frozenMetrics?: AppraisalOptionMetrics;
  frozenMetricsBasis?: {
    calculationMode: AppraisalCalculationMode;
    knownLandValue?: number;
    targetProfitOnGdvPercent: number;
    overheadPercent?: number;
  };
  frozenFinalReportMetrics?: AppraisalFinalReportMetrics;
  frozenSellerMetrics?: AppraisalOptionMetrics | null;
  frozenZeroLandMetrics?: AppraisalOptionMetrics;
  /** Immutable report ledger for a frozen house-building revision. */
  frozenReportData?: FinalReportData;
  frozenCommercialAssurance?: CommercialFinancialAssurance;
  engineeringScope?: AppraisalEngineeringScope;
  engineeringScopeDraft?: AppraisalEngineeringScope;
  scottishStatutoryFees?: AppraisalScottishStatutoryFees;
  rccFees?: AppraisalRccFees;
  scottishWaterFees?: AppraisalScottishWaterFees;
  prelimsResourceCounts?: AppraisalPrelimsResourceCounts;
  temporaryPower?: AppraisalTemporaryPowerAssumptions;
  drinkingWater?: AppraisalDrinkingWaterAssumptions;
  fuelAssumptions?: AppraisalFuelAssumptions;
  siloGeneratorAssumptions?: AppraisalSiloGeneratorAssumptions;
  salesMarketingAssumptions?: AppraisalSalesMarketingAssumptions;
  safetyPlantAssumptions?: AppraisalSafetyPlantAssumptions;
  herasFencingAssumptions?: AppraisalHerasFencingAssumptions;
  skipWasteAssumptions?: AppraisalSkipWasteAssumptions;
  plotHeatingAssumptions?: AppraisalPlotHeatingAssumptions;
  surveyReports?: AppraisalSurveyReportAssumptions;
  id: string;
  name: string;
  template: AppraisalTemplate;
  /** A commercial appraisal can be retained as evidence-led preliminary work before financial modelling starts. */
  commercialAssessmentStage?: "PRELIMINARY" | "MODELLED";
  commercialTemplateId?: string;
  commercialTemplateInputs?: Record<string, number>;
  commercialLocation?: string;
  commercialAssets?: CommercialAsset[];
  commercialInitialAssessmentBriefs?: AppraisalPricingReport[];
  commercialScopeAssessment?: {
    siteAreaM2?: number;
    summary?: string;
    assessedAt?: string;
    provider?: string;
  };
  commercialRevenueAssessment?: {
    rentRate?: number;
    yieldPercent?: number;
    voidPercent?: number;
    annualRent?: number;
    summary?: string;
    assessedAt?: string;
    provider?: string;
  };
  commercialLifecycleYears?: number;
  commercialAnnualOperatingCostPercent?: number;
  commercialAnnualRevenueGrowthPercent?: number;
  commercialAnnualCostInflationPercent?: number;
  commercialAnnualLifecycleCapexPercent?: number;
  commercialExitYieldPercent?: number;
  commercialSellingCostsPercent?: number;
  /** Funding and investment-return assumptions for commercial lifecycle modelling. */
  commercialDebtEnabled?: boolean;
  commercialLoanToCostPercent?: number;
  commercialDebtArrangementFeePercent?: number;
  commercialDebtExitFeePercent?: number;
  commercialDebtAmortisationYears?: number;
  commercialRefinanceYear?: number;
  commercialRefinanceLoanToValuePercent?: number;
  commercialRefinanceAnnualRatePercent?: number;
  commercialRefinanceFeePercent?: number;
  commercialMinimumDscr?: number;
  commercialDiscountRatePercent?: number;
  commercialFinancialScenarios?: CommercialFinancialScenario[];
  commercialLifecycleAssessment?: {
    summary?: string;
    assessedAt?: string;
    provider?: string;
  };
  calculationMode: AppraisalCalculationMode;
  durationMonths: number;
  startDate?: string;
  targetProfitOnGdvPercent: number;
  gdvIncentivePercent?: number;
  customGdvAdditionAmount?: number;
  customGdvAdditionNote?: string;
  customCostProvisions?: AppraisalCustomCostProvision[];
  customCostProvisionAmount?: number;
  customCostProvisionNote?: string;
  salesIndexationEnabled?: boolean;
  salesIndexationPercent?: number;
  salesIndexationAssessedAt?: string;
  salesIndexationNarrative?: string;
  overheadPercent?: number;
  financeAnnualRatePercent: number;
  knownLandValue?: number;
  sellerMinimumLandValue?: number;
  revenueLines: AppraisalRevenueLine[];
  costLines: AppraisalCostLine[];
  houseTypeSchedule?: AppraisalHouseTypeScheduleRow[];
  siteDimensions?: AppraisalSiteDimensionRow[];
  programme?: AppraisalProgrammeAssumptions;
  baseMeasurementFiles?: AppraisalPricingReport[];
  architectFeasibilityLayouts?: AppraisalPricingReport[];
  pricingReport?: AppraisalPricingReport;
  housePricesComment?: string;
  abnormalBaseAllowance?: number;
  abnormalGeneralNotes?: string;
  abnormalGeneralNarrative?: string;
  constraintsReport?: AppraisalPricingReport;
  landContractVersions?: AppraisalPricingReport[];
  consentTracker?: AppraisalConsentTrackerEntry[];
  recommended?: boolean;
  assumptions?: string;
  decisionNote?: string;
  finalReportExecutiveSummary?: string;
  finalReportSourceSignature?: string;
  /** Formal approved issues. New issues are added rather than changing a prior record. */
  approvedReportIssues?: AppraisalApprovedReportIssue[];
  createdAt: string;
  updatedAt: string;
}

export interface AppraisalCustomCostProvision {
  id: string;
  title: string;
  amount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DevelopmentAppraisal {
  /** A frozen revision is read-only; later pricing must be calculated in a new revision. */
  frozenAt?: string;
  /** Explicit site-level decision made with the appraisal's Mark unviable action. */
  unviableMarkedAt?: string;
  id: string;
  kind?: DevelopmentAppraisalKind;
  costPackId?: AppraisalCostPackId;
  name: string;
  reference?: string;
  client?: string;
  site?: string;
  /** Commercial status of the opportunity, separate from the appraisal workflow and archive status. */
  siteStatus?: AppraisalSiteStatus;
  /** Planning position recorded for the site opportunity. */
  sitePlanningStatus?: AppraisalPlanningStatus;
  /** Whether the site opportunity is no longer available to progress. */
  siteOffMarket?: boolean;
  siteCountry?: string;
  /** Legacy regional grouping retained for older saved appraisals. */
  siteRegion?: string;
  siteCounty?: string;
  siteLandPriceKnown?: boolean;
  siteLandPrice?: number;
  /** Whole site area, stored in hectares for Land Finder. */
  siteAreaHectares?: number;
  /** Saved site pin used by Land Finder. Coordinates are optional until a location is resolved or placed. */
  siteLatitude?: number;
  siteLongitude?: number;
  appraisalDate?: string;
  appraisalFolderId?: string;
  versionSummary?: string;
  projectId?: string;
  status: AppraisalStatus;
  selectedOptionId?: string;
  options: DevelopmentAppraisalOption[];
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface DimensionRow {
  id: string;
  multiplier: number;
  length: number;
  width: number;
  height: number;
  comment?: string;
  isDeduction?: boolean;
}

/** Internal estimator basis for a priced BoQ rate. It is never sent to tenderers. */
export type RateBuildUpMode = 'SINGLE_RATE' | 'DERIVED';

export type RateBuildUpCategory =
  | 'LABOUR'
  | 'PLANT'
  | 'MATERIALS'
  | 'PRELIMINARIES'
  | 'SUBCONTRACTOR'
  | 'CUSTOM';

export interface RateBuildUpComponent {
  id: string;
  category: RateBuildUpCategory;
  /** Used when category is CUSTOM. */
  categoryLabel?: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  total?: number;
  note?: string;
  included?: boolean;
  position: number;
}

export interface RateBuildUp {
  mode: RateBuildUpMode;
  components: RateBuildUpComponent[];
  updatedAt?: string;
}

export interface BoQItem {
  id: string;
  type: ItemType;
  reference: string;
  description: string;
  unit: UnitType | string;
  quantity: number;
  quantityDecimals?: number;
  rate: number;
  total: number;
  dimensionRows?: DimensionRow[];
  tradePackageId?: string;
  rateSource?: "LOWEST" | "AVERAGE" | "HIGHEST" | "PLUGGED" | string; // string for specific contractor ID
  liveRateEvidence?: { rationale: string; sources: Array<{ title: string; url: string }>; assessedAt: string };
  aiLocks?: AiFieldLocks;
  rateBuildUp?: RateBuildUp;
}

export interface BoQSection {
  id: string;
  name: string;
  items: BoQItem[];
  /** Optional pages. When present, items live in page.items; section.items is unused. */
  pages?: BoQPage[];
}

export interface BoQPage {
  id: string;
  name?: string;
  items: BoQItem[];
}

export interface BoQBill {
  id: string;
  name: string;
  billType?: "STANDARD" | "HOUSE_TYPE";
  houseTypeName?: string;
  houseTypeQuantity?: number;
  sections: BoQSection[];
  /** When sections.length === 0, items can live here (optional section level). */
  items?: BoQItem[];
}

export type ProjectSnapshotKind = "RESTORE_POINT" | "BOQ_REVISION";

export interface ProjectSnapshotScope {
  type: "PROJECT" | "BILL";
  billId?: string;
  billName?: string;
}

export interface ProjectSnapshot {
  id: string;
  label: string;
  createdAt: string;
  kind?: ProjectSnapshotKind;
  scope?: ProjectSnapshotScope;
  summary?: string;
  note?: string;
  projectData: Omit<Project, "snapshots">;
}

export interface ImportQaSummary {
  billsImported: number;
  sectionsInferred: number;
  rowsSkipped: number;
  headingsPromoted: number;
}

export interface AiFieldLocks {
  description: boolean;
  rate: boolean;
  measurements: boolean;
}

export interface TenderTradeStatus {
  dueDate?: string;
  budgetValue?: number;
  /** Latest appraisal trade-package budget applied to this estimate trade. */
  appraisalBudgetSource?: {
    appraisalId: string;
    appraisalReference: string;
    optionId: string;
    generatedAt: string;
    sourceSignature: string;
  };
  mainContractorDiscountType?: "PERCENT" | "FIXED";
  mainContractorDiscountValue?: number;
  contractorSubmissionComments?: Record<string, string>;
  lastReturnReceivedAt?: string;
  responseState?: TenderResponseState;
  winnerRationale?: string;
}

export type TenderApprovalStatus =
  | "WINNER_SELECTED"
  | "APPROVAL_FORM_CREATED"
  | "SIGNED_APPROVAL_UPLOADED"
  | "APPROVED"
  | "REJECTED";

export interface TenderApplySummary {
  appliedAt: string;
  contractorId: string;
  sourceTenderPackageId: string;
  sourceTenderPackageName: string;
  itemsUpdated: number;
  itemsSkipped: number;
  itemsWithNoContractorRate: number;
  updatedItemIds: string[];
  skippedItemIds: string[];
  noRateItemIds: string[];
}

export interface TenderApprovalUpload {
  fileName: string;
  uploadedAt: string;
  uploadedBy?: string;
  pdfDataUrl?: string;
  signatureDetection?: "DETECTED" | "UNCERTAIN" | "NOT_DETECTED";
  manuallyConfirmed?: boolean;
}

export interface TenderAwardRecord {
  tradeId: string;
  contractorId: string;
  contractorName: string;
  selectedAt: string;
  sourceTenderPackageId: string;
  sourceTenderPackageName: string;
  approvalStatus: TenderApprovalStatus;
  preparedBy?: string;
  checkedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  approvalFormCreatedAt?: string;
  approvalWorkbookFileName?: string;
  signedApproval?: TenderApprovalUpload;
  billApplyHistory: TenderApplySummary[];
}

export type TenderResponseState =
  | "NOT_ISSUED"
  | "ISSUED"
  | "PARTIAL_RETURNS"
  | "RETURNS_RECEIVED"
  | "WINNER_SELECTED";

export type CostPlanSource =
  "BILL_NAMES" | "BILL_SECTIONS" | "AI" | "HYBRID" | "AI_CONCEPT";

export type CostPlanDrawingBasis =
  "DETAILED_DRAWINGS" | "OUTLINE_DRAWINGS" | "NO_DRAWINGS";

export type CostPlanContingencyMode = "SEPARATE" | "PRORATED";

export interface CostPlanLine {
  id: string;
  title: string;
  source: "BILL" | "SECTION" | "AI" | "MANUAL";
  sourceBillId?: string;
  sourceSectionId?: string;
  provenance?: string[];
  notes?: string;
  baseValue: number;
  lowValue?: number;
  highValue?: number;
  confidenceLabel?: "LOW" | "MEDIUM" | "HIGH";
  confidenceNote?: string;
  contingencyValue: number;
  totalValue: number;
}

export interface CostPlan {
  id: string;
  title: string;
  source: CostPlanSource;
  drawingBasis: CostPlanDrawingBasis;
  contingencyMode: CostPlanContingencyMode;
  contingencyPercentage: number;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  assumptions?: string[];
  confidenceSummary?: string;
  totalLowValue?: number;
  totalHighValue?: number;
  lines: CostPlanLine[];
}

export interface SectionAssembly {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  sourceBillId?: string;
  sourceBillName?: string;
  sourceSectionId?: string;
  sourceSectionName?: string;
  section: BoQSection;
}

export type BillWorkspaceLayout = "FOCUSED_SECTION" | "FULL_BILL";

export type BillWorkspaceMode = "GUIDED" | "CLEAN";

export type ProjectSummaryMode = "BILLS" | "BILLS_AND_SECTIONS";

export type HelpContextId =
  | "HOME"
  | "APPRAISALS"
  | "BILL_WORKSPACE"
  | "LIBRARY"
  | "TRADES"
  | "TENDER_ANALYSIS"
  | "ANALYTICS"
  | "COST_PLAN"
  | "PROJECT_SUMMARY"
  | "PROJECT_SETTINGS"
  | "APP_PREFERENCES"
  | "KEYBOARD_SHORTCUTS"
  | "ITEM_EDITOR"
  | "QUICK_ADD"
  | "INSPECTOR"
  | "IMPORT_BILL_LINES"
  | "COPY_CONTENT"
  | "ASK_AI"
  | "ASSEMBLIES"
  | "BILL_SETTINGS"
  | "PROMPT_MODAL"
  | "VERSION_HISTORY";

export interface HelpSection {
  title: string;
  bullets: string[];
}

export interface WalkthroughStep {
  id: string;
  title: string;
  body: string;
  targetId?: string;
}

export interface HelpHowTo {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  walkthroughStepId?: string;
}

export interface HelpArticle {
  id: HelpContextId;
  title: string;
  summary: string;
  sections: HelpSection[];
  howTos?: HelpHowTo[];
  walkthroughSteps?: WalkthroughStep[];
}

export type HeadingDisplayStyle = "BOLD" | "BOLD_UPPERCASE" | "BOLD_UNDERLINE";

export type CommentDisplayStyle = "MUTED_ITALIC" | "ITALIC" | "PLAIN";

export type BillLineStyleKey =
  | "GENERAL_HEADING"
  | "MAJOR_HEADING"
  | "SUB_SECTION"
  | "MINOR_HEADING"
  | "COMMENT"
  | "SUB_COMMENT"
  | "PRICED"
  | "EXTRA_OVER_ITEM"
  | "PROVISIONAL_SUM"
  | "PC_SUM";

export type BillLineFontFamily = "sans" | "aptos-narrow" | "serif" | "mono";

export type BillLineFontSize = "xs" | "sm" | "base" | "lg";

export interface BillLineStyleConfig {
  fontFamily: BillLineFontFamily;
  fontSize: BillLineFontSize;
  fontColor: string;
  backgroundColor: string;
  bold: boolean;
  underline: boolean;
  italic: boolean;
  uppercase: boolean;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  location: string;
  /** Structured site location used when researching local bill rates. */
  siteCountry?: string;
  siteRegion?: string;
  siteCounty?: string;
  reference: string;
  /** Optional app-level filing folder for the Estimate library. */
  estimateFolderId?: string;
  /** Soft archive flag for estimates hidden from the main register by default. */
  archivedAt?: string;
  updatedAt: string;
  measurementStandard: "SMM7" | "NRM2";
  ohpPercentage: number;
  bills: BoQBill[];
  // Map ItemID -> ContractorID (or 'QS_ESTIMATE') -> Rate
  tenderData?: Record<string, Record<string, number>>;
  // Map ItemID -> ContractorID -> { isPlugged?: boolean; source?: string }
  tenderAttributes?: Record<
    string,
    Record<string, { isPlugged?: boolean; source?: string }>
  >;
  /** Per trade: contractor IDs invited to this project's tender (from the global trades database). */
  tenderContractors?: Record<string, string[]>;
  /** Project-specific tender workflow metadata per trade package. */
  tenderTradeStatus?: Record<string, TenderTradeStatus>;
  /** Controlled tender award and approval records per trade package. */
  tenderAwards?: Record<string, TenderAwardRecord>;
  /** Manual restore points for user confidence and rollback. */
  snapshots?: ProjectSnapshot[];
  /** Allow automatic restore points before risky operations. Defaults to enabled. */
  autoSnapshotsEnabled?: boolean;
  /** Optional compiled cost plan for elemental / high-level reporting. */
  costPlan?: CostPlan | null;
  /** Previous cost plan revisions for comparison and rollback of commercial reporting. */
  costPlanHistory?: CostPlan[];
  /** Reusable section templates saved from this project's live sections. */
  sectionAssemblies?: SectionAssembly[];
  /** Preferred bill workspace layout for this project. */
  billWorkspaceLayout?: BillWorkspaceLayout;
  /** Preferred bill workspace mode for this project. */
  billWorkspaceMode?: BillWorkspaceMode;
  /** Renumber default numeric bill names like "Bill 1" when bills are reordered. */
  renumberNumericBillsOnReorder?: boolean;
  /** Show workflow guidance panels and next-step coaching. Defaults to enabled. */
  showWorkflowGuidance?: boolean;
  /** Keep the live bill totals visible at the bottom of the workspace. Defaults to enabled. */
  showStickyBillTotals?: boolean;
  /** Visual treatment for bill heading lines in the live workspace. */
  headingDisplayStyle?: HeadingDisplayStyle;
  /** Visual treatment for comment lines in the live workspace. */
  commentDisplayStyle?: CommentDisplayStyle;
  /** Fine-grained bill line styling for headings, comments, priced lines, and allowance rows. */
  billLineStyles?: Partial<Record<BillLineStyleKey, BillLineStyleConfig>>;
}

// Hierarchical Library Structure
export interface ItemLibrary {
  id: string;
  name: string;
  folders: LibraryFolder[];
  /** Local quality-control record for the source, currency and approval of a reusable library. */
  governance?: LibraryGovernance;
  /** Imported protected libraries can be used locally but cannot be exported again. */
  exportLocked?: boolean;
  /** Controls what recipients can do with imported copies of this library. */
  permissions?: LibraryPermissions;
  /** Favourite libraries are pinned to the top of the library list. */
  favorite?: boolean;
  /** True when item rows are stored in SQLite and loaded on demand. */
  storageMode?: "sqlite" | "memory";
  position?: number;
  itemCount?: number;
  pricedCount?: number;
  sectionCount?: number;
}

export type LibraryApprovalStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "SUPERSEDED";

export interface LibraryGovernanceChange {
  id: string;
  changedAt: string;
  summary: string;
}

export interface LibraryGovernance {
  owner?: string;
  source?: string;
  rateDate?: string;
  indexBasis?: string;
  reviewDate?: string;
  approvalStatus?: LibraryApprovalStatus;
  changeHistory?: LibraryGovernanceChange[];
}

export interface LibraryPermissions {
  allowExportAll?: boolean;
  allowExportFolders?: boolean;
  allowExportSections?: boolean;
  allowLibraryEditing?: boolean;
}

export interface LibraryFolder {
  id: string;
  orderRef?: string;
  name: string;
  sections: LibrarySection[];
  position?: number;
  itemCount?: number;
  pricedCount?: number;
  sectionCount?: number;
}

export interface LibrarySection {
  id: string;
  parentSectionId?: string;
  orderRef?: string;
  name: string;
  items: Omit<BoQItem, "total" | "quantity" | "id">[];
  subSections?: LibrarySection[];
  pages?: LibraryPage[];
  /** True when section item rows are stored in SQLite and loaded on demand. */
  storageMode?: "sqlite" | "memory";
  position?: number;
  itemCount?: number;
  pricedCount?: number;
  pageCount?: number;
}

export interface LibraryPage {
  id: string;
  orderRef?: string;
  name?: string;
  items: Omit<BoQItem, "total" | "quantity" | "id">[];
  position?: number;
  itemCount?: number;
  pricedCount?: number;
}

export type ContractorRating = "GREEN" | "YELLOW" | "ORANGE" | "RED";

export interface Contractor {
  id: string;
  name: string;
  address: string;
  email: string;
  phone?: string;
  companyReg?: string;
  vatNumber?: string;
  pointOfContact?: string;
  rating?: ContractorRating;
}

export interface TradePackage {
  id: string;
  name: string;
  contractors: Contractor[];
  winnerId?: string; // ID of the winning contractor
}

export interface AISuggestion {
  description: string;
  unit: UnitType;
}

export interface AIResponse {
  suggestions: AISuggestion[];
}

export interface AIClarification {
  needsClarification: boolean;
  questions: string[];
  phase?: "items" | "measurements";
  title?: string;
  description?: string;
  canSkip?: boolean;
}

export interface AiGenerationOptions {
  includeRates: boolean;
  includeMeasurements: boolean;
}

export interface AiProjectSetupConfig {
  enabled: boolean;
  brief: string;
  drawingBasis: CostPlanDrawingBasis;
  conversation: string[];
}

export interface PromptSubmitMeta {
  projectAiSetup?: AiProjectSetupConfig;
  orderRef?: string;
  siteLocation?: { country: string; region: string; county: string };
}

export interface AiMeasurementTarget {
  description: string;
  unit: UnitType | string;
  type?: ItemType;
}

export interface AiMeasurementRowDraft {
  multiplier?: number;
  length?: number;
  width?: number;
  height?: number;
  comment?: string;
  isDeduction?: boolean;
}

export interface AiMeasurementItem {
  description: string;
  unit?: UnitType | string;
  type?: ItemType;
  quantity?: number;
  dimensionRows: AiMeasurementRowDraft[];
}

export interface AiMeasurementStep {
  needsClarification: boolean;
  nextField?:
    | "drawing"
    | "length"
    | "width"
    | "height"
    | "thickness"
    | "depth"
    | "count"
    | "spacing"
    | "other";
  question?: string;
  items?: AiMeasurementItem[];
  summary?: string;
}

export interface AIHierarchyItem {
  type: ItemType;
  description: string;
  unit?: UnitType | string;
  estimatedRate?: number;
  defaultDims?: { length?: number; width?: number; height?: number };
}

export interface ProductSuggestion {
  name: string;
  manufacturer?: string;
  description: string;
  priceIndication?: string;
  url?: string;
}

export type PromptType =
  | "CREATE_PROJECT"
  | "ADD_BILL"
  | "RENAME_PROJECT"
  | "RENAME_BILL"
  | "ADD_SECTION"
  | "RENAME_SECTION"
  | "ADD_PAGE"
  | "RENAME_PAGE"
  | "CREATE_LIBRARY"
  | "RENAME_LIBRARY"
  | "CREATE_FOLDER"
  | "RENAME_FOLDER"
  | "CREATE_LIB_SECTION"
  | "RENAME_LIB_SECTION"
  | "CREATE_LIB_PAGE"
  | "RENAME_LIB_PAGE"
  | "CREATE_TRADE"
  | "ADD_CONTRACTOR"
  | "AI_GENERATE_HIERARCHY";

/** Context passed when opening a prompt (e.g. AI_GENERATE_HIERARCHY, RENAME_BILL). */
export interface PromptConfigContext {
  billId?: string;
  sectionId?: string;
  pageId?: string;
  libId?: string;
  folderId?: string;
  parentSectionId?: string;
  tradeId?: string;
  orderRef?: string;
  standard?: "SMM7" | "NRM2";
  aiOptions?: AiGenerationOptions;
  aiPhase?: "items" | "measurements";
  name?: string;
  id?: string;
  projectAiSetup?: Partial<AiProjectSetupConfig>;
  siteLocation?: { country: string; region: string; county: string };
}

/** Editor modal/panel state (bill or library item editing) */
export interface EditorConfig {
  billId: string | null;
  sectionId: string | null;
  /** When set, item belongs to this page (section has pages). Empty string = bill-level items when no sections. */
  pageId?: string | null;
  item?: BoQItem | null;
  type?: ItemType;
  insertAfterItemId?: string | null;
  libId?: string;
  folderId?: string;
  libSectionId?: string;
  itemIdx?: number;
  focusDimensions?: boolean;
}

/** Initial edit form state for the item editor */
export interface EditFormState {
  description: string;
  unit: string;
  quantity: number;
  quantityDecimals: number;
  rate: number;
  reference: string;
  tradePackageId: string;
  dimensionRows: DimensionRow[];
  type: ItemType;
  aiLocks: AiFieldLocks;
  rateBuildUp?: RateBuildUp;
}
