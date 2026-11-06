import { EngineersScopeStage } from "./EngineersScopeStage";
import { ScottishStatutoryFeesPanel } from './ScottishStatutoryFeesPanel';
import { RccFeesPanel } from './RccFeesPanel';
import { ScottishWaterFeesPanel } from './ScottishWaterFeesPanel';
import { PrelimsResourceCountsPanel } from './PrelimsResourceCountsPanel';
import { PrelimsTemporaryPowerPanel } from './PrelimsTemporaryPowerPanel';
import { PrelimsDrinkingWaterPanel } from './PrelimsDrinkingWaterPanel';
import { PrelimsFuelPanel } from './PrelimsFuelPanel';
import { PrelimsHerasFencingPanel } from './PrelimsHerasFencingPanel';
import { PrelimsSiloGeneratorPanel } from './PrelimsSiloGeneratorPanel';
import { PrelimsSalesMarketingPanel } from './PrelimsSalesMarketingPanel';
import { PrelimsSafetyPlantPanel } from './PrelimsSafetyPlantPanel';
import { PrelimsSkipWastePanel } from './PrelimsSkipWastePanel';
import { PrelimsPlotHeatingPanel } from './PrelimsPlotHeatingPanel';
import { SurveyReportsPanel } from './SurveyReportsPanel';
import { NotAllowedAbnormalsStage } from './NotAllowedAbnormalsStage';
import { notAllowedAbnormalRows } from '../../utils/appraisalNotAllowedAbnormals';
import { engineeringScopeReview } from "../../utils/appraisalEngineeringScope";
import { PLOT_WORKS_BILL_SECTIONS, plotWorksBillSection, LANDSCAPING_FENCING_COMPOUND_ALLOWANCES, LANDSCAPING_COMMENT, isInfrastructureRatePending, SERVICES_LIGHTING_ALLOWANCES, SERVICES_COMMENT, ROADS_PATHS_ALLOWANCES, ROADS_PATHS_COMMENT, DRAINAGE_COMMENT, SITE_ENABLING_WORKS_COMMENT, INFRASTRUCTURE_BILL_SECTIONS, INFRASTRUCTURE_PRELIMS_ID, infrastructureBillSection } from '../../utils/appraisalInfrastructureBill';
import { ensureBaseInfrastructureRates } from '../../utils/appraisal';
import { SiteCostSummary, SiteCostElementControls, NotAllowedSurveyAbnormals } from './SiteCostRegister';
import { MovableDialog } from '../UI/MovableDialog';
import { siteCostCategoriesFor, SUDS_STANDARD_RATE } from '../../utils/appraisalAbnormalCatalog';
import { isSiteCostElement, siteCostMetadata, SITE_COST_ALLOCATION_LABELS, SITE_COST_STATUS_LABELS, changeSiteCost, seedSiteCostChecklist, siteBaseRowMatches, linkAbnormalRemovalRows, isAbnormalRemovalRow, siteCostSummary } from '../../utils/appraisalSiteCosts';
﻿import React from 'react';
import {
  Archive,
  BarChart3,
  BookOpen,
  Building2,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Copy,
  FileDown,
  FileSpreadsheet,
  FileUp,
  Flag,
  Home,
  Link2,
  ListChecks,
  Lock,
  MessageSquareText,
  MoreHorizontal,
  Pencil,
  Plus,
  CopyPlus,
  Ruler,
  Save,
  Sparkles,
  Star,
  Trash2,
  RotateCcw,
  Unlock,
  X,
} from 'lucide-react';
import type {
  AppraisalCalculationMode,
  AppraisalCashflowProfile,
  AppraisalConsentStatus,
  AppraisalConsentTrackerEntry,
  AppraisalCostCategory,
  AppraisalCostLine,
  AppraisalCostPackId,
  AppraisalCostPercentageBasis,
  AppraisalCustomCostProvision,
  AppraisalHouseTypeCostComponent,
  AppraisalHouseTypeConfiguration,
  AppraisalHouseTypeLibraryItem,
  AppraisalHouseTypeSalesRow,
  AppraisalHouseTypeScheduleRow,
  AppraisalHouseTypeStyle,
  AppraisalInfrastructureCostDriver,
  AppraisalPricingReport,
  AppraisalRateLibraryItem,
  AppraisalRevenueLine,
  AppraisalSiteDimensionRow,
  AppraisalSiteStatus,
  AppraisalStatus,
  AppraisalTemplate,
  DevelopmentAppraisal,
  DevelopmentAppraisalKind,
  DevelopmentAppraisalOption,
  Project,
  WorkspaceFolder,
} from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useToast } from '../../contexts/ToastContext';
import {
  APPRAISAL_COST_CATEGORY_LABELS,
  APPRAISAL_HOUSE_TYPE_COST_LABELS,
  APPRAISAL_HOUSE_TYPE_CONFIGURATION_OPTIONS,
  APPRAISAL_HOUSE_TYPE_STYLE_OPTIONS,
  APPRAISAL_INFRASTRUCTURE_COST_DRIVER_LABELS,
  APPRAISAL_INFRASTRUCTURE_COST_DRIVER_OPTIONS,
  APPRAISAL_MODE_LABELS,
  APPRAISAL_SITE_DIMENSION_LABELS,
  APPRAISAL_TEMPLATE_LABELS,
  buildNextAppraisalReference,
  buildNextAppraisalRevisionReference,
  buildLinkedProjectCostSnapshot,
  calculateAppraisalOption,
  calculateCostLineAmount,
  calculateFinalReportMetrics,
  calculateHouseTypeCostBreakdownTotal,
  calculateHouseBuildingProgrammeSummary,
  calculateHouseTypeConstructionTotal,
  calculateHouseTypeStartPriceIndexContingency,
  calculateIndexedHouseTypeConstructionTotal,
  calculateHouseTypeGdv,
  calculateHouseTypeLibraryBuildCostPerM2,
  calculateHouseTypeSalesQuantity,
  calculateHouseTypeScheduleBuildCostPerM2,
  calculateHouseBuildingOverheadCost,
  calculateGdvIncentiveBase,
  calculateGdvIncentiveCost,
  calculateLandLbtt,
  calculateLandCostBenchmarks,
  calculateNetDevelopableArea,
  calculateOptionBaseGdv,
  calculateOptionGdv,
  calculateRevenueLineValue,
  calculateSalesIndexationUplift,
  calculateSellerLandPriceMetrics,
  calculateSiteDimensionBaseTotal,
  calculateSiteDimensionManualAdjustment,
  calculateSiteDimensionTotal,
  calculateSiteDimensionStartPriceIndexContingency,
  calculateScottishStatutoryFees2026,
  rccFeeReview,
  PRELIMS_SURVEY_RATE_PREFIX,
  siteDimensionEffectivePriceIndex,
  calculateCustomCostProvisionTotal,
  compareAppraisalOptions,
  createDefaultAppraisal,
  createDefaultAppraisalOption,
  createDefaultAppraisalHouseType,
  createDefaultAppraisalRate,
  createDefaultHouseTypeCostBreakdown,
  createDefaultCostLine,
  createDefaultRevenueLine,
  createHouseTypeScheduleRowFromLibrary,
  createManualHouseTypeScheduleRow,
  isOptionalHouseTypeCostComponent,
  createSiteDimensionRowFromRate,
  createSiteDimensionRow,
  getInfrastructureCostDriverUnit,
  infrastructureCostDriverToCategory,
  normalizeAppraisalHouseTypeLibraryItems,
  normalizeAppraisalRateLibraryItems,
  normalizeDevelopmentAppraisals,
  normalizeDevelopmentAppraisalOption,
  DEFAULT_TARGET_PROFIT_ON_GDV_PERCENT,
  getHouseBuildingOverheadPercent,
  getCustomCostProvisions,
  getHouseTypeSalesRows,
  HOUSE_BUILDING_OVERHEAD_PERCENT,
  parseAppraisalReference,
  resolveSiteDimensionQuantity,
  summariseHouseBuildingOption,
  temporaryPowerLinePresentation,
  siteAccommodationLinePresentation,
  fuelLinePresentation,
  safetyPlantLinePresentation,
  miniSkipsLinePresentation,
  skipWasteLinePresentation,
  plotHeatingLinePresentation,
  herasFencingLinePresentation,
  siloGeneratorLinePresentation,
  salesPrelimsLinePresentation,
  salesMarketingLinePresentation,
} from '../../utils/appraisal';
import {
  downloadAppraisalDecisionPackExcel,
  downloadAppraisalDecisionPackPdf,
  downloadApprovedReportIssueExcel,
  downloadApprovedReportIssuePdf,
  downloadAppraisalEvidenceAttachment,
  downloadAppraisalPdfAttachment,
  downloadAppraisalFinalReportDocx,
  downloadAppraisalHouseTypeScheduleExcel,
  downloadAwdRateLibraryReportExcel,
  downloadAppraisalLandownerViabilityPdf,
  downloadAppraisalLandOfferExclusionsPdf,
  downloadAppraisalRevenueCostSummaryExcel,
  downloadAppraisalRevenueCostSummaryPdf,
  downloadCommercialPreliminaryAssessmentPdf,
} from '../../utils/appraisalExport';
import {
  buildFinalReportAiContext,
  buildFallbackFinalReportExecutiveSummary,
  buildFinalReportData,
  extractFinalReportNarrativeSection,
  buildFinalReportSourceSignature,
} from '../../utils/appraisalFinalReport';
import {
  buildAppraisalPricingReportFromFile,
  ensureAppraisalReportExtracted,
} from '../../utils/appraisalEvidenceExtraction';
import { appraisalEvidenceStatusLabel, resolveAppraisalEvidenceDataUrl, verifyAppraisalEvidence } from '../../utils/appraisalEvidenceStorage';
import { refreshLinkedAbnormalAppraisal } from '../../utils/appraisalLinkedAbnormals';
import { freezeAppraisalVersion, preserveFrozenAppraisals, refreshRevisionLibraryPrices, thawAppraisalOption } from '../../utils/appraisalFreeze';
import { isBidLostFolderName, markSiteUnviableAcrossVersions, reconcileBidLostFolderStatuses, setSiteStatusAcrossVersions } from '../../utils/appraisalSiteStatus';
import { assignAppraisalFolderAcrossVersions } from '../../utils/appraisalFolderAssignment';
import {
  applyCommercialTemplateToOption,
  COMMERCIAL_APPRAISAL_TEMPLATES,
  commercialTemplateInputsForOption,
  defaultCommercialTemplateInputs,
  getCommercialAppraisalTemplate,
  getCommercialTemplateSector,
  getCommercialTemplateSectors,
  getCommercialTemplatesBySector,
  isCommercialTemplateLine,
} from '../../utils/commercialAppraisalTemplates';
import { generateId } from '../../utils/generateId';
import { afterNextPaint, startAppraisalPerformance } from '../../utils/appraisalPerformance';
import { buildAppraisalRegisterView } from '../../utils/appraisalRegister';
import {
  APPRAISAL_HOUSE_TYPE_DEFAULT_BUILD_MONTHS,
  APPRAISAL_HOUSE_TYPE_DEFAULT_PRICE_INDEX,
  mergeAppraisalHouseTypeCostDefaults,
} from '../../utils/appraisalHouseTypeDefaults';
import {
  buildHouseTypeElementalImportProposals,
  HOUSE_TYPE_ELEMENTAL_IMPORT_PRICE_INDEX,
  type HouseTypeElementalImportProposal,
} from '../../utils/appraisalHouseTypeElementalImport';
import {
  AWD_INFRASTRUCTURE_RATE_DEFINITIONS,
  AWD_INFRASTRUCTURE_RATE_PACK_NAME,
  AWD_INFRASTRUCTURE_RATE_PACK_PRICE_INDEX,
  AWD_INFRASTRUCTURE_RATE_PACK_PREFIX,
  AWD_PLOT_WORKS_RATE_DEFINITIONS,
  AWD_PLOT_WORKS_RATE_PACK_NAME,
  AWD_PLOT_WORKS_RATE_PACK_PRICE_INDEX,
  AWD_PLOT_WORKS_RATE_PACK_PREFIX,
  AWD_PRELIMS_RATE_DEFINITIONS,
  AWD_PRELIMS_RATE_PACK_NAME,
  AWD_PRELIMS_RATE_PACK_PRICE_INDEX,
  AWD_PRELIMS_RATE_PACK_PREFIX,
  AWD_PRELIMS_RATE_SECTIONS,
  getAwdPrelimsRateSection,
  isAwdInfrastructureRate,
  isAwdPrelimsRate,
  isAwdPlotWorksRate,
  mergeAwdInfrastructureRatePack,
  mergeAwdPrelimsRatePack,
  mergeAwdPlotWorksRatePack,
} from '../../utils/appraisalInfrastructureRatePacks';
import {
  ALL_WORKSPACE_FOLDERS_ID,
  ALL_WORKSPACE_YEARS_ID,
  createWorkspaceFolder,
  normalizeWorkspaceFolders,
} from '../../utils/workspaceFolders';
import type { ContextMenuEntry } from '../UI/ContextMenu';
import { MenuActionList } from '../UI/MenuActionList';
import { PopoverMenu } from '../UI/PopoverMenu';
import { calculateBillBaseTotal, calculateSectionBaseTotal, getBillItems, getBillQuantityMultiplier, getSectionItems } from '../../utils/calculations';
import { generateAppraisalExecutiveSummary, generateAppraisalReportNoteRewrite, generateCommercialAssetAssessment, generateCommercialInvestmentReport, generateCommercialLifecycleAssessment, generateCommercialRevenueGuidanceStep, generateCommercialScopeGuidanceStep, generateCommercialSiteScopeGuidanceStep, generateCommercialTemplateRecommendation, generateCustomCostProvisionAssessment, generateCustomCostProvisionGuidanceStep, generateHouseTypeCostAssessment, generateHouseTypeCostGuidanceStep, generateSalesIndexationAssessment, type CommercialAssetAssessmentResult } from '../../services/geminiService';
import { calculateCommercialAnnualIncome, calculateCommercialFinancialAssurance, calculateCommercialLifecycle } from '../../utils/commercialLifecycle';
import { buildCommercialExitStrategy, buildCommercialInvestmentReportContext, buildFallbackCommercialInvestmentReport } from '../../utils/commercialInvestmentReport';
import { applyCommercialAssetAssessment, calculateCommercialAssetAnnualIncome, calculateCommercialAssetDevelopmentCost, getCommercialAssets, getCommercialSiteWideCostLines, updateCommercialAsset } from '../../utils/commercialAssets';
import { commercialReportIssueRequirements, createApprovedReportIssue } from '../../utils/appraisalReportIssue';
import { buildCommercialAssessmentEvidence } from '../../utils/commercialAssessmentEvidence';
import { currentArchitectFeasibilityLayout, renderArchitectFeasibilityLayout, type AppraisalLayoutPreview } from '../../utils/appraisalLayoutPreview';
import {
  applyAppraisalTradePackageBudgetsToEstimate,
  buildAppraisalTradePackageBudget,
} from '../../utils/appraisalTradePackageBudget';
import { buildAppraisalQualityChecks, canIssueAppraisalReport, type AppraisalQualityIssue } from '../../utils/appraisalQualityChecks';

type EditorTab = 'REVENUE' | 'COSTS' | 'LIFECYCLE' | 'ASSUMPTIONS' | 'DECISION';
type HouseStage = 'HOUSE_TYPES' | 'PROGRAMME' | 'BASE_DATA' | 'BASE_MEASURES' | 'INFRASTRUCTURE' | 'PLOT_WORKS' | 'PRELIMS_ASSUMPTIONS' | 'PRELIMS' | 'ENGINEERS_SCOPE' | 'HOUSE_PRICES' | 'CUSTOM_GDV' | 'CUSTOM_COST' | 'COST_SUMMARY' | 'TRADE_PACKAGE_BUDGET' | 'OVERALL_SUMMARY' | 'LAND_CONTRACT' | 'CONSENTS' | 'SITE_SPECIFIC' | 'ABNORMAL_WORKS' | 'ABNORMALS' | 'DECISION' | 'NOT_ALLOWED_ABNORMALS';
export type AppraisalWorkspace = 'REGISTER' | DevelopmentAppraisalKind | 'LIBRARY';
type AppraisalExportType = 'pdf' | 'excel' | 'docx' | 'summaryPdf' | 'summaryExcel' | 'landownerPdf';
type AppraisalLibraryPack = 'AWD';
type AwdOtherCostSection = 'INFRASTRUCTURE' | 'PLOT_WORKS' | 'PRELIMS' | 'ABNORMALS';
type SiteMetricsSection = 'INFRASTRUCTURE' | 'PLOT_WORKS' | 'PRELIMS';

type NewAppraisalDraft = {
  kind: DevelopmentAppraisalKind;
  name: string;
  appraisalDate: string;
  appraisalFolderId: string;
  commercialLocation?: string;
  commercialLandValue?: number;
  commercialSiteAreaM2?: number;
  costPackId: AppraisalCostPackId;
  commercialTemplateSector?: string;
  commercialTemplateId?: string;
  commercialSetupMode?: 'EXISTING_TEMPLATE' | 'AI_PROMPT' | 'PRELIMINARY';
  commercialAiBrief?: string;
  commercialAiScopeSummary?: string;
  commercialAiScopeAssessed?: boolean;
  commercialAiSummary?: string;
  commercialAiTemplateAssessed?: boolean;
  commercialAssetAssessment?: CommercialAssetAssessmentResult;
  commercialAiAssetsAssessed?: boolean;
  commercialInitialAssessmentBrief?: AppraisalPricingReport;
  commercialInitialAssessmentBriefNote?: string;
  calculationMode: AppraisalCalculationMode;
  residualTargetPercent: number;
  residualTargetBasis: 'OVERHEAD_AND_PROFIT' | 'PROFIT_ONLY';
  salesIndexationEnabled: boolean;
};

type AppraisalVersionDraft = {
  appraisal: DevelopmentAppraisal;
  baseAppraisalId: string;
  mode: 'COPY_CURRENT_DATA' | 'BLANK_SLATE';
  summary: string;
};

type RateLibraryDraft = {
  costDriver: AppraisalInfrastructureCostDriver | '';
  label: string;
  unit: AppraisalSiteDimensionRow['unit'] | '';
  rate: string;
  priceIndex: string;
  notes: string;
};

type HouseTypeTradeUpdateDraft = {
  amount: string;
  priceIndex: string;
};

const costCategories: AppraisalCostCategory[] = [
  'LAND_ACQUISITION',
  'CONSTRUCTION',
  'EXTERNAL_WORKS',
  'ABNORMALS',
  'PROFESSIONAL_FEES',
  'STATUTORY_AUTHORITY',
  'MARKETING_SALES',
  'CONTINGENCY',
  'FINANCE',
  'OTHER',
];

const percentageBases: AppraisalCostPercentageBasis[] = ['NONE', 'GDV', 'CONSTRUCTION_COSTS', 'NON_LAND_COSTS'];
const timingProfiles: AppraisalCashflowProfile['type'][] = ['UPFRONT', 'EVEN', 'END', 'S_CURVE', 'CUSTOM'];
const statusOptions: AppraisalStatus[] = ['DRAFT', 'REVIEW', 'APPROVED', 'ARCHIVED'];
const siteStatusOptions: Array<{ id: AppraisalSiteStatus; label: string }> = [
  { id: 'NOT_VIABLE', label: 'Not viable' },
  { id: 'BID_LOST', label: 'Bid lost' },
  { id: 'VIABLE_DISCOUNTED', label: 'Viable but discounted' },
  { id: 'NOT_APPRAISED', label: 'Not appraised' },
  { id: 'APPRAISAL_IN_PROGRESS', label: 'Appraisal in progress' },
  { id: 'APPRAISED_VIABLE', label: 'Appraised and viable' },
  { id: 'APPRAISED_PURSUED', label: 'Appraised and being pursued' },
  { id: 'SITE_ACQUIRED', label: 'Site acquired' },
];
const consentStatusOptions: Array<{ id: AppraisalConsentStatus; label: string }> = [
  { id: 'NOT_STARTED', label: 'Not started' },
  { id: 'IN_PROGRESS', label: 'In progress' },
  { id: 'SUBMITTED', label: 'Submitted' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'CONDITIONED', label: 'Conditioned' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'NOT_REQUIRED', label: 'Not required' },
];
const costPackOptions: Array<{ id: AppraisalCostPackId; label: string; detail: string }> = [
  { id: 'AWD', label: 'AWD cost pack', detail: 'Standard house types, infrastructure, plot works, and prelims.' },
];
const setupCalculationModes: Array<{ id: AppraisalCalculationMode; label: string; detail: string }> = [
  { id: 'RESIDUAL_LAND_VALUE', label: 'Residual land value', detail: 'Solve the land value after costs, finance, and target profit.' },
  { id: 'KNOWN_LAND_PROFIT_ON_GDV', label: 'Known land / project profit', detail: 'Enter land cost and review project profit against GDV.' },
];
const tabs: Array<{ id: EditorTab; label: string }> = [
  { id: 'REVENUE', label: 'Revenue' },
  { id: 'COSTS', label: 'Costs' },
  { id: 'LIFECYCLE', label: 'Lifecycle' },
  { id: 'ASSUMPTIONS', label: 'Assumptions' },
  { id: 'DECISION', label: 'Final Report' },
];
const houseStages: Array<{ id: HouseStage; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'HOUSE_TYPES', label: 'House Types', icon: Home },
  { id: 'PROGRAMME', label: 'Programme', icon: FileSpreadsheet },
  { id: 'BASE_DATA', label: 'Base Data', icon: FileSpreadsheet },
  { id: 'BASE_MEASURES', label: 'Base measures', icon: Ruler },
  { id: 'INFRASTRUCTURE', label: 'Infrastructure', icon: Ruler },
  { id: 'PLOT_WORKS', label: 'Plot Works', icon: Ruler },
  { id: 'ENGINEERS_SCOPE', label: 'Engineer’s Scope', icon: ListChecks },
  { id: 'PRELIMS_ASSUMPTIONS', label: 'Prelims assumptions', icon: ListChecks },
  { id: 'PRELIMS', label: 'Prelims', icon: ListChecks },
  { id: 'HOUSE_PRICES', label: 'House Prices', icon: BarChart3 },
  { id: 'CUSTOM_GDV', label: 'Custom GDV', icon: Plus },
  { id: 'CUSTOM_COST', label: 'Custom Cost', icon: Calculator },
  { id: 'COST_SUMMARY', label: 'Cost Summary', icon: ListChecks },
  { id: 'TRADE_PACKAGE_BUDGET', label: 'Trade Package Budget', icon: Calculator },
  { id: 'OVERALL_SUMMARY', label: 'Overall Summary', icon: BarChart3 },
  { id: 'LAND_CONTRACT', label: 'Land Contract', icon: FileUp },
  { id: 'CONSENTS', label: 'Consents', icon: ListChecks },
  { id: 'SITE_SPECIFIC', label: 'Site-specific works', icon: Plus },
  { id: 'ABNORMAL_WORKS', label: 'Abnormals', icon: Plus },
  { id: 'ABNORMALS', label: 'Site costs and abnormals', icon: Plus },
  { id: 'DECISION', label: 'Final Report', icon: CheckCircle2 },
  { id: 'NOT_ALLOWED_ABNORMALS', label: 'Abnormal exclusions', icon: ListChecks },
];

const INFRASTRUCTURE_STAGE_COST_DRIVERS = new Set<AppraisalInfrastructureCostDriver>([
  'TOTAL_UNITS',
  'SITE_AREA_M2',
  'ROADS_M2',
  'PATHS_M2',
  'EXISTING_ROAD_JUNCTIONS',
  'COMMON_LANDSCAPING_M2',
  'PLANTING_M2',
  'BOUNDARY_FENCING_M',
  'PLOT_FENCING_M',
  'GARDEN_WALLS_M',
  'UNITS_WITH_DRIVES',
  'UNITS_WITHOUT_DRIVES',
  'GARDEN_WALLS_BASE_COST',
  'FIXED_SUM',
]);

const PLOT_WORKS_STAGE_COST_DRIVERS = new Set<AppraisalInfrastructureCostDriver>([
  'TOTAL_UNITS',
  'PLOT_WORKS_DRIVES_M2',
  'PLOT_WORKS_FOOTPATHS_M2',
  'FRONT_GARDENS_M2',
  'REAR_GARDENS_M2',
  'FIXED_SUM',
]);

const PRELIMS_STAGE_COST_DRIVERS = new Set<AppraisalInfrastructureCostDriver>(
  AWD_PRELIMS_RATE_DEFINITIONS.map((definition) => definition.costDriver)
);

type AwdSiteRateDefinition =
  | typeof AWD_INFRASTRUCTURE_RATE_DEFINITIONS[number]
  | typeof AWD_PLOT_WORKS_RATE_DEFINITIONS[number]
  | typeof AWD_PRELIMS_RATE_DEFINITIONS[number];

function createAwdSiteDimensionRowsFromDefinitions(
  definitions: AwdSiteRateDefinition[],
  packName: string,
  priceIndex: number,
  existingRows: AppraisalSiteDimensionRow[]
) {
  const existingRateIds = new Set(existingRows.map((row) => row.libraryRateId).filter(Boolean));
  return definitions
    .filter((definition) => !existingRateIds.has(definition.id) && !isAbnormalRemovalRow({libraryRateId: definition.id}))
    .map((definition) => createSiteDimensionRowFromRate(createDefaultAppraisalRate({
      id: definition.id,
      category: infrastructureCostDriverToCategory(definition.costDriver),
      costDriver: definition.costDriver,
      label: definition.label,
      unit: definition.unit,
      rate: definition.rate,
      formulaComponents: 'formulaComponents' in definition ? definition.formulaComponents : undefined,
      priceIndex: definition.costDriver === 'PLANNING_FEES_FORMULA' || definition.costDriver === 'BUILDING_WARRANT_FORMULA' ? 0 : priceIndex,
      sourceFormula: definition.formula,
      sourceRow: definition.sourceRow,
      notes: `${packName}. ${definition.basis}. Base formula: ${definition.formula}. Revised costs ignored.`,
      status: 'ACTIVE',
      favorite: true,
    })));
}

function hasAnyAwdSiteCostRows(rows: AppraisalSiteDimensionRow[]) {
  return rows.some((row) => (
    row.libraryRateId?.startsWith(`${AWD_INFRASTRUCTURE_RATE_PACK_PREFIX}-`)
    || row.libraryRateId?.startsWith(`${AWD_PLOT_WORKS_RATE_PACK_PREFIX}-`)
    || row.libraryRateId?.startsWith(`${AWD_PRELIMS_RATE_PACK_PREFIX}-`)
  ));
}

function ensureAwdSiteCostRows(option: DevelopmentAppraisalOption, mode: 'missing-only' | 'all' = 'all') {
  const existingRows = option.siteDimensions || [];
  if (mode === 'missing-only' && hasAnyAwdSiteCostRows(existingRows)) {
    // Complete partial legacy packs by ID; existing rates, measures and manual
    // adjustments remain as saved. Abnormal-only removal rows are excluded.
    const rowsToAdd = [
      ...createAwdSiteDimensionRowsFromDefinitions(AWD_INFRASTRUCTURE_RATE_DEFINITIONS, AWD_INFRASTRUCTURE_RATE_PACK_NAME, AWD_INFRASTRUCTURE_RATE_PACK_PRICE_INDEX, existingRows),
      ...createAwdSiteDimensionRowsFromDefinitions(AWD_PLOT_WORKS_RATE_DEFINITIONS, AWD_PLOT_WORKS_RATE_PACK_NAME, AWD_PLOT_WORKS_RATE_PACK_PRICE_INDEX, existingRows),
      ...createAwdSiteDimensionRowsFromDefinitions(AWD_PRELIMS_RATE_DEFINITIONS, AWD_PRELIMS_RATE_PACK_NAME, AWD_PRELIMS_RATE_PACK_PRICE_INDEX, existingRows),
    ];
    if (rowsToAdd.length === 0) return option;
    return linkAbnormalRemovalRows(ensureBaseInfrastructureRates({
      ...option,
      siteDimensions: [...existingRows, ...rowsToAdd],
    }));
  }
  const rowsToAdd = [
    ...createAwdSiteDimensionRowsFromDefinitions(
      AWD_INFRASTRUCTURE_RATE_DEFINITIONS,
      AWD_INFRASTRUCTURE_RATE_PACK_NAME,
      AWD_INFRASTRUCTURE_RATE_PACK_PRICE_INDEX,
      existingRows
    ),
    ...createAwdSiteDimensionRowsFromDefinitions(
      AWD_PLOT_WORKS_RATE_DEFINITIONS,
      AWD_PLOT_WORKS_RATE_PACK_NAME,
      AWD_PLOT_WORKS_RATE_PACK_PRICE_INDEX,
      existingRows
    ),
    ...createAwdSiteDimensionRowsFromDefinitions(
      AWD_PRELIMS_RATE_DEFINITIONS,
      AWD_PRELIMS_RATE_PACK_NAME,
      AWD_PRELIMS_RATE_PACK_PRICE_INDEX,
      existingRows
    ),
  ];
  if (rowsToAdd.length === 0) return linkAbnormalRemovalRows(ensureBaseInfrastructureRates(option));
  return linkAbnormalRemovalRows(ensureBaseInfrastructureRates({
    ...option,
    siteDimensions: [...existingRows, ...rowsToAdd],
  }));
}

function money(value: number) {
  return `£${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function houseTypeIndexUpliftTooltip(row: AppraisalHouseTypeScheduleRow, appraisalPriceIndex: number) {
  const quantity = Math.max(0, Number(row.quantity) || 0);
  const byIndex = new Map<number, number>();
  (row.costBreakdown || []).forEach((component) => {
    if (component.included === false) return;
    const amount = Math.max(0, Number(component.amount) || 0) * quantity;
    if (amount <= 0) return;
    const index = Math.max(0, Number(component.priceIndex) || 0)
      || Math.max(0, Number(row.priceIndex) || 0)
      || APPRAISAL_HOUSE_TYPE_DEFAULT_PRICE_INDEX;
    byIndex.set(index, (byIndex.get(index) || 0) + amount);
  });

  if (byIndex.size === 0 || appraisalPriceIndex <= 0) {
    return 'No trade-level index basis is available for this house type.';
  }

  const lines = Array.from(byIndex.entries())
    .sort(([left], [right]) => left - right)
    .map(([baseIndex, baseAmount]) => {
      if (appraisalPriceIndex <= baseIndex) {
        return `${money(baseAmount)} at index ${baseIndex}: no uplift.`;
      }
      const uplift = baseAmount * ((appraisalPriceIndex - baseIndex) / baseIndex);
      return `${money(baseAmount)} at index ${baseIndex} to ${appraisalPriceIndex}: ${money(uplift)} uplift.`;
    });

  return `${quantity} construction ${quantity === 1 ? 'unit' : 'units'}. ${lines.join(' ')}`;
}

function moneyWithDecimals(value: number, decimals: number) {
  return `£${(value || 0).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function appraisalRecommendationLabel(value: string) {
  if (value === 'WATCH') return 'Consider depending on requirement';
  if (value === 'UNVIABLE') return 'Subject to discount';
  if (value === 'RECOMMENDED' || value === 'VIABLE') return 'Recommended';
  return value;
}

function appraisalRecommendationPillClass(value: string) {
  if (value === 'RECOMMENDED' || value === 'VIABLE') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200';
  }
  if (value === 'WATCH') {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100';
  }
  return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200';
}

function sterling(value: number) {
  return `£${Math.max(0, value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function sterlingInputValue(value: number | undefined) {
  return value && value > 0 ? sterling(value) : '';
}

const SQ_FT_PER_M2 = 10.7639104167;

function m2RateFromFt2Rate(ratePerFt2: number) {
  return Math.max(0, ratePerFt2) * SQ_FT_PER_M2;
}

function ft2RateFromM2Rate(ratePerM2: number) {
  return Math.max(0, ratePerM2) / SQ_FT_PER_M2;
}

function formatQuantity(value: number) {
  return (value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatAppraisalDateLabel(date: string | undefined) {
  if (!date) return '';
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
}

function salesIndexUpliftLabel(option: DevelopmentAppraisalOption) {
  const percent = formatQuantity(option.salesIndexationPercent || 0);
  const startDate = formatAppraisalDateLabel(option.programme?.expectedStartDate || option.startDate);
  return startDate
    ? `Sales index uplift (${percent}% to ${startDate})`
    : `Sales index uplift (${percent}%)`;
}

function shortCostSummaryLabel(value: string | undefined, fallback: string, maxWords = 7) {
  const words = (value || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return fallback;
  return words.slice(0, maxWords).join(' ');
}

function quantityInputValue(value: number | undefined) {
  return value && value > 0 ? String(value) : '';
}

function libraryIndex(prefix: 'HT' | 'INF' | 'PW' | 'PRE' | 'OC' | 'ABN', index: number) {
  return `${prefix}-${String(index + 1).padStart(3, '0')}`;
}

const HOUSE_TYPE_STOREY_OPTIONS = [1, 1.5, 2, 2.5, 3, 4, 5];
const HOUSE_TYPE_BEDROOM_OPTIONS = [1, 2, 3, 4, 5, 6];

function houseTypeStyleLabel(style?: AppraisalHouseTypeStyle) {
  return APPRAISAL_HOUSE_TYPE_STYLE_OPTIONS.find((option) => option.value === style)?.label || '';
}

function houseTypeConfigurationLabel(configuration?: AppraisalHouseTypeConfiguration) {
  return APPRAISAL_HOUSE_TYPE_CONFIGURATION_OPTIONS.find((option) => option.value === configuration)?.label || '';
}

function houseTypeStoreysLabel(storeys?: number) {
  if (!storeys) return '';
  return `${storeys} storey${storeys === 1 ? '' : 's'}`;
}

function yesNoLabel(value: boolean | undefined) {
  return value === undefined ? '' : value ? 'Yes' : 'No';
}

function numberValue(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function currencyInputNumber(value: string) {
  return numberValue(value.replace(/[^0-9.]/g, ''));
}

function currencyInputDisplay(value: number) {
  return moneyWithDecimals(value || 0, 2);
}

function draftNumber(value: string, fallback: number) {
  return value.trim() === '' ? fallback : numberValue(value);
}

function inputClass(extra = '') {
  return `workspace-input px-3 py-2 text-xs ${extra}`;
}

function revisionSortValue(revision: string) {
  return revision.toUpperCase().split('').reduce((total, char) => (
    total * 26 + Math.max(0, char.charCodeAt(0) - 64)
  ), 0);
}

function groupAppraisalVersions(appraisals: DevelopmentAppraisal[]) {
  const groups = new Map<string, DevelopmentAppraisal[]>();
  appraisals.forEach((appraisal) => {
    const parsed = parseAppraisalReference(appraisal.reference);
    const key = parsed ? parsed.baseReference : `single:${appraisal.id}`;
    groups.set(key, [...(groups.get(key) || []), appraisal]);
  });
  return Array.from(groups.entries()).map(([key, versions]) => {
    const sortedVersions = versions.slice().sort((a, b) => {
      const parsedA = parseAppraisalReference(a.reference);
      const parsedB = parseAppraisalReference(b.reference);
      if (parsedA && parsedB && parsedA.baseReference === parsedB.baseReference) {
        return revisionSortValue(parsedB.revision) - revisionSortValue(parsedA.revision);
      }
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });
    return { key, primary: sortedVersions[0], versions: sortedVersions };
  });
}

function localDateString() {
  return new Date().toISOString().slice(0, 10);
}

function uniqueOptionName(options: Pick<DevelopmentAppraisalOption, 'name'>[], preferred: string) {
  const base = preferred.trim() || 'Option';
  const used = new Set(options.map((option) => option.name.trim().toLowerCase()));
  if (!used.has(base.toLowerCase())) return base;
  let index = 2;
  while (used.has(`${base} ${index}`.toLowerCase())) index += 1;
  return `${base} ${index}`;
}

function nextOptionName(options: Pick<DevelopmentAppraisalOption, 'name'>[]) {
  if (options.length === 0) return 'Base option';
  let index = options.length + 1;
  const used = new Set(options.map((option) => option.name.trim().toLowerCase()));
  while (used.has(`option ${index}`)) index += 1;
  return `Option ${index}`;
}

function shallowEqualRecord(a: Record<string, unknown>, b: Record<string, unknown>) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => Object.is(a[key], b[key]));
}

function duplicateConsentTrackerEntry(entry: AppraisalConsentTrackerEntry): AppraisalConsentTrackerEntry {
  const timestamp = new Date().toISOString();
  return {
    ...entry,
    id: generateId(),
    uploads: (entry.uploads || []).map((upload) => ({ ...upload, id: generateId() })),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function cloneAppraisalData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function duplicateOption(option: DevelopmentAppraisalOption, existingOptions: DevelopmentAppraisalOption[] = []): DevelopmentAppraisalOption {
  const timestamp = new Date().toISOString();
  const cloned = cloneAppraisalData(option);
  const sourceIds = new Map((cloned.siteDimensions || []).map(row => [row.id, generateId()]));
  return {
    ...cloned,
    id: generateId(),
    name: uniqueOptionName(existingOptions, `${cloned.name} copy`),
    recommended: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    revenueLines: cloned.revenueLines.map((line) => ({ ...line, id: generateId() })),
    costLines: cloned.costLines.map((line) => ({ ...line, id: generateId(), sourceSiteDimensionId: line.sourceSiteDimensionId ? sourceIds.get(line.sourceSiteDimensionId) : undefined })),
    houseTypeSchedule: cloned.houseTypeSchedule?.map((line) => ({ ...line, id: generateId() })),
    siteDimensions: cloned.siteDimensions?.map((line) => ({ ...line, id: sourceIds.get(line.id)! })),
    baseMeasurementFiles: cloned.baseMeasurementFiles?.map((file) => ({ ...file, id: generateId() })),
    architectFeasibilityLayouts: cloned.architectFeasibilityLayouts?.map((file) => ({ ...file, id: generateId() })),
    consentTracker: cloned.consentTracker?.map(duplicateConsentTrackerEntry),
  };
}

function duplicateOptionForRevision(option: DevelopmentAppraisalOption): DevelopmentAppraisalOption {
  const timestamp = new Date().toISOString();
  const cloned = thawAppraisalOption(cloneAppraisalData(option));
  const sourceIds = new Map((cloned.siteDimensions || []).map(row => [row.id, generateId()]));
  return {
    ...cloned,
    id: generateId(),
    recommended: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    revenueLines: cloned.revenueLines.map((line) => ({ ...line, id: generateId() })),
    costLines: cloned.costLines.map((line) => ({ ...line, id: generateId(), sourceSiteDimensionId: line.sourceSiteDimensionId ? sourceIds.get(line.sourceSiteDimensionId) : undefined })),
    houseTypeSchedule: cloned.houseTypeSchedule?.map((line) => ({ ...line, id: generateId() })),
    siteDimensions: cloned.siteDimensions?.map((line) => ({ ...line, id: sourceIds.get(line.id)! })),
    baseMeasurementFiles: cloned.baseMeasurementFiles?.map((file) => ({ ...file, id: generateId() })),
    architectFeasibilityLayouts: cloned.architectFeasibilityLayouts?.map((file) => ({ ...file, id: generateId() })),
    consentTracker: cloned.consentTracker?.map(duplicateConsentTrackerEntry),
  };
}

function duplicateAppraisal(appraisal: DevelopmentAppraisal, appraisals: DevelopmentAppraisal[], versionSummary = '', appSettings?: Parameters<typeof normalizeDevelopmentAppraisalOption>[1], houseTypes: AppraisalHouseTypeLibraryItem[] = [], rates: AppraisalRateLibraryItem[] = []): DevelopmentAppraisal {
  const timestamp = new Date().toISOString();
  const options = appraisal.options.map((option) => {
    const copy = duplicateOptionForRevision(option);
    return appraisal.frozenAt
      ? normalizeDevelopmentAppraisalOption(refreshRevisionLibraryPrices(copy, houseTypes, rates), appSettings, appraisal.kind === 'COMMERCIAL' ? 'COMMERCIAL' : 'HOUSE_BUILDING')
      : copy;
  });
  return {
    ...appraisal,
    frozenAt: undefined,
    id: generateId(),
    reference: buildNextAppraisalRevisionReference(appraisal, appraisals),
    versionSummary,
    status: 'DRAFT',
    selectedOptionId: options[0]?.id,
    options,
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: undefined,
  };
}

function createBlankAppraisalVersion(
  appraisal: DevelopmentAppraisal,
  appraisals: DevelopmentAppraisal[],
  appSettings: Parameters<typeof createDefaultAppraisal>[1],
  versionSummary = ''
): DevelopmentAppraisal {
  const timestamp = new Date().toISOString();
  const kind = appraisal.kind === 'COMMERCIAL' ? 'COMMERCIAL' : 'HOUSE_BUILDING';
  const next = createDefaultAppraisal(null, appSettings, kind);
  const options = next.options.map((option) => {
    const withMetadata = {
      ...option,
      commercialLocation: kind === 'COMMERCIAL' ? appraisal.site || option.commercialLocation : option.commercialLocation,
      updatedAt: timestamp,
    };
    return kind === 'HOUSE_BUILDING' && appraisal.costPackId === 'AWD'
      ? ensureAwdSiteCostRows(withMetadata)
      : withMetadata;
  });
  return {
    ...next,
    id: generateId(),
    kind,
    costPackId: kind === 'HOUSE_BUILDING' ? appraisal.costPackId : undefined,
    name: appraisal.name,
    reference: buildNextAppraisalRevisionReference(appraisal, appraisals),
    client: appraisal.client,
    site: appraisal.site,
    siteStatus: appraisal.siteStatus,
    unviableMarkedAt: appraisal.unviableMarkedAt,
    appraisalDate: localDateString(),
    appraisalFolderId: appraisal.appraisalFolderId,
    projectId: appraisal.projectId,
    versionSummary,
    status: 'DRAFT',
    selectedOptionId: options[0]?.id,
    options,
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: undefined,
  };
}

function appraisalStatusPillClass(status: DevelopmentAppraisal['status']) {
  return status === 'ARCHIVED'
    ? 'appraisal-top-pill appraisal-pill-status-archived uppercase tracking-[0.14em]'
    : 'appraisal-top-pill appraisal-pill-status uppercase tracking-[0.14em]';
}

function MetricTile({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'good' | 'watch' | 'bad' }) {
  const toneClass = tone === 'good'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100'
    : tone === 'watch'
      ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100'
      : tone === 'bad'
        ? 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-100'
        : 'border-slate-200 bg-slate-50/90 text-slate-900 dark:border-slate-700 dark:bg-surface-950/60 dark:text-slate-100';
  return (
    <div className={`rounded-app border px-2.5 py-2 ${toneClass}`}>
      <div className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] opacity-65">{label}</div>
      <div className="mt-0.5 truncate text-[13px] font-semibold">{value}</div>
    </div>
  );
}

function RedlineMetricTile({
  label,
  value,
  originalValue,
  tone = 'default',
}: {
  label: string;
  value: string;
  originalValue?: string;
  tone?: 'default' | 'good' | 'watch' | 'bad';
}) {
  const toneClass = tone === 'good'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100'
    : tone === 'watch'
      ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100'
      : tone === 'bad'
        ? 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-100'
        : 'border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100';
  return (
    <div className={`rounded-app border p-3 ${toneClass}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-65">{label}</div>
      {originalValue ? (
        <div className="mt-1 text-xs font-semibold text-rose-700 line-through dark:text-rose-300">{originalValue}</div>
      ) : null}
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

export function AppraisalsWorkspace({
  onClose,
  initialWorkspace = 'REGISTER',
}: {
  onClose: () => void;
  initialWorkspace?: AppraisalWorkspace;
}) {
  const {
    appraisals,
    setAppraisals,
    appraisalHouseTypes,
    setAppraisalHouseTypes,
    appraisalRates,
    setAppraisalRates,
    workspaceFolders,
    setWorkspaceFolders,
    projects,
    appSettings,
  } = useAppContext();
  const { askConfirm } = useConfirm();
  const { showToast } = useToast();
  const [activeWorkspace, setActiveWorkspace] = React.useState<AppraisalWorkspace>(initialWorkspace);
  const [activeAppraisalId, setActiveAppraisalId] = React.useState<string | null>(null);
  const [activeOptionId, setActiveOptionId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<EditorTab>('REVENUE');
  const [activeHouseStage, setActiveHouseStage] = React.useState<HouseStage>('HOUSE_TYPES');
  const [showArchived, setShowArchived] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState<AppraisalExportType | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [isCompareOpen, setIsCompareOpen] = React.useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = React.useState(false);
  const [isAssumptionsOpen, setIsAssumptionsOpen] = React.useState(false);
  const [newAppraisalDraft, setNewAppraisalDraft] = React.useState<NewAppraisalDraft | null>(null);
  const [versionDraft, setVersionDraft] = React.useState<AppraisalVersionDraft | null>(null);
  const [rateDraft, setRateDraft] = React.useState<RateLibraryDraft>({
    costDriver: '',
    label: '',
    unit: '',
    rate: '',
    priceIndex: '',
    notes: '',
  });
  const isRegisterWorkspace = activeWorkspace === 'REGISTER';
  const activeKind: DevelopmentAppraisalKind = activeWorkspace === 'COMMERCIAL' ? 'COMMERCIAL' : 'HOUSE_BUILDING';
  const isLibraryWorkspace = activeWorkspace === 'LIBRARY';
  const isEditingWorkspace = activeWorkspace === 'HOUSE_BUILDING' || activeWorkspace === 'COMMERCIAL';

  React.useEffect(() => {
    setActiveWorkspace(initialWorkspace);
  }, [initialWorkspace]);

  React.useEffect(() => {
    setIsDetailsOpen(false);
    setIsCompareOpen(false);
    setIsOptionsOpen(false);
    setIsAssumptionsOpen(false);
  }, [activeAppraisalId, activeWorkspace]);

  const normalizedAppraisals = appraisals;
  const normalizedHouseTypes = React.useMemo(
    () => normalizeAppraisalHouseTypeLibraryItems(appraisalHouseTypes),
    [appraisalHouseTypes]
  );
  const normalizedRates = React.useMemo(
    () => normalizeAppraisalRateLibraryItems(appraisalRates),
    [appraisalRates]
  );
  const appraisalWorkspaceFolders = React.useMemo(
    () => normalizeWorkspaceFolders(workspaceFolders).filter((folder) => folder.module === 'APPRAISALS'),
    [workspaceFolders]
  );
  React.useEffect(() => {
    if (reconcileBidLostFolderStatuses(normalizedAppraisals, appraisalWorkspaceFolders) === normalizedAppraisals) return;
    setAppraisals((current) => reconcileBidLostFolderStatuses(current, appraisalWorkspaceFolders));
  }, [appraisalWorkspaceFolders, normalizedAppraisals, setAppraisals]);
  const activeAppraisal = isEditingWorkspace
    ? normalizedAppraisals.find((entry) => (
        entry.id === activeAppraisalId
        && (entry.kind === activeKind || (!entry.kind && activeKind === 'HOUSE_BUILDING'))
        && (showArchived || entry.status !== 'ARCHIVED')
      )) || null
    : null;
  const activeOption = activeAppraisal?.options.find((option) => option.id === activeOptionId) || activeAppraisal?.options[0] || null;
  const activeMetrics = React.useMemo(() => (activeOption ? calculateAppraisalOption(activeOption) : null), [activeOption]);
  const activeSalesIndexUplift = React.useMemo(
    () => (activeOption ? calculateSalesIndexationUplift(activeOption, calculateOptionBaseGdv(activeOption)) : 0),
    [activeOption]
  );
  const activeCommercialLifecycle = React.useMemo(
    () => (activeKind === 'COMMERCIAL' && activeOption ? calculateCommercialLifecycle(activeOption) : null),
    [activeKind, activeOption]
  );

  React.useEffect(() => {
    if (!isEditingWorkspace) {
      setActiveAppraisalId(null);
      setActiveOptionId(null);
    }
  }, [isEditingWorkspace]);

  React.useEffect(() => {
    if (!activeAppraisal) {
      setActiveOptionId(null);
      return;
    }
    if (activeOptionId && activeAppraisal.options.some((option) => option.id === activeOptionId)) return;
    setActiveOptionId(activeAppraisal.selectedOptionId || activeAppraisal.options[0]?.id || null);
  }, [activeAppraisal, activeOptionId]);

  const setAndNormalize = React.useCallback((recipe: (current: DevelopmentAppraisal[]) => DevelopmentAppraisal[]) => {
    setAppraisals((current) => preserveFrozenAppraisals(current, recipe(current)));
  }, [setAppraisals]);

  React.useEffect(() => {
    if (!isEditingWorkspace || !activeAppraisalId) return;
    setAndNormalize((current) => {
      let changed = false;
      const next = current.map((appraisal) => {
        if (appraisal.frozenAt || appraisal.unviableMarkedAt || appraisal.id !== activeAppraisalId || (appraisal.kind || 'HOUSE_BUILDING') !== 'HOUSE_BUILDING') return appraisal;
        const hasAwdRows = appraisal.options.some((option) => hasAnyAwdSiteCostRows(option.siteDimensions || []));
        if (appraisal.costPackId !== 'AWD' && !hasAwdRows) return appraisal;
        const options = appraisal.options.map((option) => {
          const repaired = appraisal.costPackId === 'AWD' || hasAnyAwdSiteCostRows(option.siteDimensions || [])
            ? ensureAwdSiteCostRows(option, 'missing-only')
            : option;
          if (repaired !== option) changed = true;
          return repaired;
        });
        return changed ? { ...appraisal, options } : appraisal;
      });
      return changed ? next : current;
    });
  }, [activeAppraisalId, isEditingWorkspace, setAndNormalize]);

  const updateAppraisal = React.useCallback((appraisalId: string, recipe: (appraisal: DevelopmentAppraisal) => DevelopmentAppraisal) => {
    setAndNormalize((current) => current.map((entry) => {
      if (entry.id !== appraisalId) return entry;
      if (entry.frozenAt || entry.unviableMarkedAt) return entry;
      const nextEntry = recipe(entry);
      if (shallowEqualRecord(entry as unknown as Record<string, unknown>, nextEntry as unknown as Record<string, unknown>)) return entry;
      return { ...nextEntry, updatedAt: new Date().toISOString() };
    }));
  }, [setAndNormalize]);

  const updateSiteStatus = React.useCallback((appraisalId: string, status: AppraisalSiteStatus) => {
    // A viability decision may change after a version is frozen; pricing and inputs stay locked.
    const lostFolder = appraisalWorkspaceFolders.find((folder) => isBidLostFolderName(folder.name));
    setAppraisals((current) => {
      let next = setSiteStatusAcrossVersions(current, appraisalId, status);
      if (status === 'BID_LOST' && lostFolder) next = assignAppraisalFolderAcrossVersions(next, appraisalId, lostFolder.id);
      if (status !== 'BID_LOST') {
        const selected = current.find((entry) => entry.id === appraisalId);
        if (appraisalWorkspaceFolders.some((folder) => folder.id === selected?.appraisalFolderId && isBidLostFolderName(folder.name)))
          next = assignAppraisalFolderAcrossVersions(next, appraisalId, '');
      }
      return next;
    });
  }, [appraisalWorkspaceFolders, setAppraisals]);

  const handleMarkSiteUnviable = React.useCallback(async () => {
    if (!activeAppraisal || activeAppraisal.unviableMarkedAt) return;
    const confirmed = await askConfirm({
      title: 'Mark this site unviable?',
      message: `Mark ${activeAppraisal.site || activeAppraisal.name} unviable across all appraisal versions? The appraisal figures and frozen snapshots will remain unchanged.`,
      confirmLabel: 'Mark unviable',
    });
    if (!confirmed) return;
    setAppraisals((current) => {
      const marked = markSiteUnviableAcrossVersions(current, activeAppraisal.id);
      const selected = current.find((entry) => entry.id === activeAppraisal.id);
      return appraisalWorkspaceFolders.some((folder) => folder.id === selected?.appraisalFolderId && isBidLostFolderName(folder.name))
        ? assignAppraisalFolderAcrossVersions(marked, activeAppraisal.id, '')
        : marked;
    });
    setIsDetailsOpen(false);
    setIsOptionsOpen(false);
    setIsAssumptionsOpen(false);
    showToast({ type: 'info', message: 'Site marked unviable on every appraisal version.' });
  }, [activeAppraisal, appraisalWorkspaceFolders, askConfirm, setAppraisals, showToast]);

  const handleReopenSite = React.useCallback(() => {
    if (!activeAppraisal?.unviableMarkedAt) return;
    updateSiteStatus(activeAppraisal.id, 'APPRAISAL_IN_PROGRESS');
    showToast({ type: 'info', message: 'Site reopened for appraisal.' });
  }, [activeAppraisal, updateSiteStatus, showToast]);

  const handleMarkBidLost = React.useCallback(() => {
    if (!activeAppraisal || activeAppraisal.unviableMarkedAt || activeAppraisal.siteStatus === 'BID_LOST') return;
    updateSiteStatus(activeAppraisal.id, 'BID_LOST');
    showToast({ type: 'info', message: 'Bid marked lost on every appraisal version.' });
  }, [activeAppraisal, updateSiteStatus, showToast]);

  const handleReopenLostBid = React.useCallback(() => {
    if (!activeAppraisal || activeAppraisal.siteStatus !== 'BID_LOST') return;
    updateSiteStatus(activeAppraisal.id, 'APPRAISED_PURSUED');
    showToast({ type: 'info', message: 'Bid reopened as being pursued.' });
  }, [activeAppraisal, updateSiteStatus, showToast]);

  const syncHouseBuildingDuration = React.useCallback((option: DevelopmentAppraisalOption) => {
    if (!option.houseTypeSchedule && !option.programme) return option;
    const programmeSummary = calculateHouseBuildingProgrammeSummary(option);
    if (programmeSummary.programmeMonths <= 0 || programmeSummary.programmeMonths === option.durationMonths) return option;
    return { ...option, durationMonths: Math.max(1, programmeSummary.programmeMonths) };
  }, []);

  const createAppraisalFolderFromName = React.useCallback((folderName: string) => {
    const name = folderName.trim();
    if (!name) return null;
    const next = createWorkspaceFolder('APPRAISALS', name);
    setWorkspaceFolders((current) => normalizeWorkspaceFolders([next, ...current]));
    showToast({ type: 'success', message: `${next.name} folder created.` });
    return next;
  }, [setWorkspaceFolders, showToast]);

  const handleAssignAppraisalFolder = React.useCallback((appraisalId: string, folderId: string) => {
    const destinationIsBidLost = appraisalWorkspaceFolders.some((folder) => folder.id === folderId && isBidLostFolderName(folder.name));
    setAppraisals((current) => {
      const selected = current.find((entry) => entry.id === appraisalId);
      const sourceWasBidLost = appraisalWorkspaceFolders.some((folder) => folder.id === selected?.appraisalFolderId && isBidLostFolderName(folder.name));
      const moved = assignAppraisalFolderAcrossVersions(current, appraisalId, folderId);
      if (destinationIsBidLost) return setSiteStatusAcrossVersions(moved, appraisalId, 'BID_LOST');
      if (sourceWasBidLost && selected?.siteStatus === 'BID_LOST') return setSiteStatusAcrossVersions(moved, appraisalId, 'APPRAISED_PURSUED');
      return moved;
    });
  }, [appraisalWorkspaceFolders, setAppraisals]);

  const handleRenameAppraisalFolder = React.useCallback((folderId: string, name: string) => {
    setWorkspaceFolders((current) => normalizeWorkspaceFolders(current.map((folder) => (
      folder.id === folderId ? { ...folder, name, updatedAt: new Date().toISOString() } : folder
    ))));
    showToast({ type: 'success', message: `Folder renamed to ${name}.` });
  }, [setWorkspaceFolders, showToast]);

  const handleDeleteAppraisalFolder = React.useCallback((folderId: string) => {
    const folder = appraisalWorkspaceFolders.find((entry) => entry.id === folderId);
    setAppraisals((current) => current.map((entry) => (
      entry.appraisalFolderId === folderId ? { ...entry, appraisalFolderId: undefined } : entry
    )));
    setWorkspaceFolders((current) => normalizeWorkspaceFolders(current.filter((entry) => entry.id !== folderId)));
    showToast({ type: 'info', message: `${folder?.name || 'Folder'} deleted. Appraisals moved to Unfiled.` });
  }, [appraisalWorkspaceFolders, setAppraisals, setWorkspaceFolders, showToast]);

  const updateOption = React.useCallback((optionId: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => {
    if (!activeAppraisal || activeAppraisal.frozenAt || activeAppraisal.unviableMarkedAt) return;
    setAndNormalize((current) => current.map((appraisal) => {
      if (appraisal.id !== activeAppraisal.id) return appraisal;
      let optionChanged = false;
      const options = appraisal.options.map((option) => {
        if (option.id !== optionId) return option;
        const nextOption = syncHouseBuildingDuration(recipe(option));
        if (shallowEqualRecord(option as unknown as Record<string, unknown>, nextOption as unknown as Record<string, unknown>)) return option;
        optionChanged = true;
        return { ...nextOption, updatedAt: new Date().toISOString() };
      });
      const selectedChanged = appraisal.selectedOptionId !== optionId;
      if (!optionChanged && !selectedChanged) return appraisal;
      return {
        ...appraisal,
        selectedOptionId: optionId,
        options,
        updatedAt: new Date().toISOString(),
      };
    }));
  }, [activeAppraisal, setAndNormalize, syncHouseBuildingDuration]);

  React.useEffect(() => {
    setAndNormalize((current) => {
      let changed = false;
      const next = current.map((appraisal) => {
        const refreshed = refreshLinkedAbnormalAppraisal(appraisal, projects);
        if (refreshed === appraisal) return appraisal;
        changed = true;
        return { ...refreshed, updatedAt: new Date().toISOString() };
      });
      return changed ? next : current;
    });
  }, [projects, setAndNormalize]);

  const openAppraisal = React.useCallback((appraisal: DevelopmentAppraisal) => {
    const kind = appraisal.kind === 'COMMERCIAL' ? 'COMMERCIAL' : 'HOUSE_BUILDING';
    setActiveWorkspace(kind);
    setActiveAppraisalId(appraisal.id);
    setActiveOptionId(appraisal.selectedOptionId || appraisal.options[0]?.id || null);
    setActiveTab(kind === 'COMMERCIAL' ? 'REVENUE' : 'COSTS');
    setActiveHouseStage('HOUSE_TYPES');
  }, []);

  const handleCreateAppraisal = (kind: DevelopmentAppraisalKind = activeKind) => {
    const defaultCommercialTemplate = COMMERCIAL_APPRAISAL_TEMPLATES[0];
    setNewAppraisalDraft({
      kind,
      name: '',
      appraisalDate: localDateString(),
      appraisalFolderId: '',
      commercialLocation: '',
      commercialLandValue: 0,
      commercialSiteAreaM2: 0,
      costPackId: 'AWD',
      commercialTemplateSector: defaultCommercialTemplate?.sector,
      commercialTemplateId: defaultCommercialTemplate?.id,
      commercialSetupMode: 'EXISTING_TEMPLATE',
      commercialAiBrief: '',
      commercialAiScopeSummary: '',
      commercialAiScopeAssessed: false,
      commercialAiSummary: '',
      commercialAiTemplateAssessed: false,
      commercialAssetAssessment: undefined,
      commercialAiAssetsAssessed: false,
      commercialInitialAssessmentBrief: undefined,
      commercialInitialAssessmentBriefNote: '',
      calculationMode: kind === 'COMMERCIAL' ? 'KNOWN_LAND_PROFIT_ON_GDV' : 'RESIDUAL_LAND_VALUE',
      residualTargetPercent: appSettings.moduleSettings.appraisals.defaultTargetProfitOnGdvPercent ?? DEFAULT_TARGET_PROFIT_ON_GDV_PERCENT,
      residualTargetBasis: kind === 'COMMERCIAL' ? 'PROFIT_ONLY' : 'OVERHEAD_AND_PROFIT',
      salesIndexationEnabled: false,
    });
  };

  const handleConfirmCreateAppraisal = React.useCallback((draft: NewAppraisalDraft) => {
    const name = draft.name.trim();
    if (!name) return;
    const reference = buildNextAppraisalReference(normalizedAppraisals, draft.appraisalDate);
    const next = createDefaultAppraisal(null, appSettings, draft.kind);
    if (draft.kind === 'HOUSE_BUILDING' && draft.costPackId === 'AWD') {
      setAppraisalHouseTypes((current) => mergeAppraisalHouseTypeCostDefaults(current).houseTypes);
      setAppraisalRates((current) => {
        const infrastructure = mergeAwdInfrastructureRatePack(current).rates;
        const plotWorks = mergeAwdPlotWorksRatePack(infrastructure).rates;
        return mergeAwdPrelimsRatePack(plotWorks).rates;
      });
    }
    const created: DevelopmentAppraisal = {
      ...next,
      name,
      reference,
      costPackId: draft.kind === 'HOUSE_BUILDING' ? draft.costPackId : undefined,
      appraisalDate: draft.appraisalDate || localDateString(),
      appraisalFolderId: draft.appraisalFolderId || undefined,
      site: draft.kind === 'COMMERCIAL' ? draft.commercialLocation?.trim() || next.site : next.site,
      options: next.options.map((option, index) => {
        const profitTarget = draft.calculationMode === 'RESIDUAL_LAND_VALUE'
          ? draft.kind === 'HOUSE_BUILDING' && draft.residualTargetBasis === 'OVERHEAD_AND_PROFIT'
            ? Math.max(0, draft.residualTargetPercent - HOUSE_BUILDING_OVERHEAD_PERCENT)
            : Math.max(0, draft.residualTargetPercent)
          : option.targetProfitOnGdvPercent;
        const pricedOption = index === 0
          ? {
              ...option,
              calculationMode: draft.calculationMode,
              targetProfitOnGdvPercent: profitTarget,
              salesIndexationEnabled: draft.kind === 'HOUSE_BUILDING' ? draft.salesIndexationEnabled : false,
            }
          : option;
        if (draft.kind === 'COMMERCIAL') {
          const preliminaryBriefs = draft.commercialInitialAssessmentBrief
            ? [{ ...draft.commercialInitialAssessmentBrief, notes: draft.commercialInitialAssessmentBriefNote?.trim() || draft.commercialInitialAssessmentBrief.notes || '' }]
            : [];
          if (draft.commercialSetupMode === 'PRELIMINARY') {
            return {
              ...pricedOption,
              commercialAssessmentStage: 'PRELIMINARY' as const,
              commercialLocation: draft.commercialLocation?.trim() || '',
              knownLandValue: Math.max(0, draft.commercialLandValue || 0),
              commercialTemplateInputs: {},
              commercialAssets: [],
              commercialInitialAssessmentBriefs: preliminaryBriefs,
              revenueLines: [],
              costLines: [],
              assumptions: draft.commercialInitialAssessmentBriefNote?.trim() || pricedOption.assumptions,
            };
          }
          const template = getCommercialAppraisalTemplate(draft.commercialTemplateId);
          const assessment = draft.commercialAssetAssessment;
          const commercialInputs = {
            ...defaultCommercialTemplateInputs(template),
            ...(assessment?.proposedMeasures || {}),
            ...(draft.commercialSiteAreaM2 && draft.commercialSiteAreaM2 > 0 ? { siteAreaM2: draft.commercialSiteAreaM2 } : {}),
          };
          const templatedOption = applyCommercialTemplateToOption({
            ...pricedOption,
            durationMonths: Math.max(1, assessment?.durationMonths || pricedOption.durationMonths),
            financeAnnualRatePercent: assessment?.financeAnnualRatePercent ?? pricedOption.financeAnnualRatePercent,
            commercialAnnualOperatingCostPercent: assessment?.annualOperatingCostPercent ?? pricedOption.commercialAnnualOperatingCostPercent,
            commercialAnnualRevenueGrowthPercent: assessment?.annualRevenueGrowthPercent ?? pricedOption.commercialAnnualRevenueGrowthPercent,
            commercialAnnualCostInflationPercent: assessment?.annualCostInflationPercent ?? pricedOption.commercialAnnualCostInflationPercent,
            commercialAnnualLifecycleCapexPercent: assessment?.annualLifecycleCapexPercent ?? pricedOption.commercialAnnualLifecycleCapexPercent,
            commercialExitYieldPercent: assessment?.exitYieldPercent ?? pricedOption.commercialExitYieldPercent,
            commercialSellingCostsPercent: assessment?.sellingCostsPercent ?? pricedOption.commercialSellingCostsPercent,
            calculationMode: 'KNOWN_LAND_PROFIT_ON_GDV',
            knownLandValue: Math.max(0, draft.commercialLandValue || 0),
            targetProfitOnGdvPercent: 0,
            commercialLocation: draft.commercialLocation?.trim() || '',
            assumptions: draft.commercialAiSummary || draft.commercialAiScopeSummary
              ? [
                  pricedOption.assumptions,
                  draft.commercialAiScopeSummary ? `Commercial AI site scope: ${draft.commercialAiScopeSummary}` : '',
                  draft.commercialAiSummary ? `Commercial AI setup: ${draft.commercialAiSummary}` : '',
                ].filter(Boolean).join('\n')
              : pricedOption.assumptions,
            commercialAssessmentStage: 'MODELLED' as const,
            commercialInitialAssessmentBriefs: preliminaryBriefs,
          }, template.id, commercialInputs);
          return assessment?.assets?.length
            ? applyCommercialAssetAssessment(templatedOption, assessment.assets, assessment.siteWideCosts)
            : templatedOption;
        }
        return draft.kind === 'HOUSE_BUILDING' && draft.costPackId === 'AWD'
          ? ensureAwdSiteCostRows(pricedOption)
          : pricedOption;
      }),
    };
    setAndNormalize((current) => [created, ...current]);
    setNewAppraisalDraft(null);
    openAppraisal(created);
    showToast({ type: 'success', message: `${draft.kind === 'HOUSE_BUILDING' ? 'House building' : 'Commercial'} appraisal ${reference} created.` });
  }, [appSettings, normalizedAppraisals, openAppraisal, setAndNormalize, setAppraisalHouseTypes, setAppraisalRates, showToast]);

  const createAppraisalVersion = React.useCallback((appraisal: DevelopmentAppraisal) => {
    if (appraisal.unviableMarkedAt) return;
    setVersionDraft({
      appraisal,
      baseAppraisalId: appraisal.id,
      mode: 'COPY_CURRENT_DATA',
      summary: '',
    });
  }, []);

  const handleConfirmCreateVersion = React.useCallback((draft: AppraisalVersionDraft) => {
    const sourceAppraisal = normalizedAppraisals.find((appraisal) => appraisal.id === draft.baseAppraisalId) || draft.appraisal;
    if (sourceAppraisal.unviableMarkedAt) return;
    const summary = draft.summary.trim()
      || (draft.mode === 'COPY_CURRENT_DATA'
        ? 'New version created from existing appraisal data.'
        : 'New blank version created from register.');
    const copy = draft.mode === 'COPY_CURRENT_DATA'
      ? duplicateAppraisal(sourceAppraisal, normalizedAppraisals, summary, appSettings, normalizedHouseTypes, normalizedRates)
      : createBlankAppraisalVersion(sourceAppraisal, normalizedAppraisals, appSettings, summary);
    setAndNormalize((current) => [copy, ...current]);
    setVersionDraft(null);
    setActiveAppraisalId(copy.id);
    setActiveOptionId(copy.selectedOptionId || copy.options[0]?.id || null);
    setActiveWorkspace(copy.kind === 'COMMERCIAL' ? 'COMMERCIAL' : 'HOUSE_BUILDING');
    showToast({ type: 'success', message: `Appraisal revision ${copy.reference || ''} created.` });
  }, [appSettings, normalizedAppraisals, normalizedHouseTypes, normalizedRates, setAndNormalize, showToast]);

  const handleFreezeActiveAppraisal = React.useCallback(async () => {
    if (!activeAppraisal || activeAppraisal.frozenAt || activeAppraisal.unviableMarkedAt) return;
    const confirmed = await askConfirm({
      title: 'Freeze this appraisal version?',
      message: `Freeze ${activeAppraisal.reference || activeAppraisal.name} at its current inputs and calculated totals? Future edits require a new version.`,
      confirmLabel: 'Freeze version',
    });
    if (!confirmed) return;
    try {
      const frozen = freezeAppraisalVersion(activeAppraisal);
      setAndNormalize((current) => current.map((entry) => entry.id === frozen.id && !entry.frozenAt ? frozen : entry));
      setIsDetailsOpen(false);
      setIsOptionsOpen(false);
      setIsAssumptionsOpen(false);
      showToast({ type: 'success', message: `${activeAppraisal.reference || activeAppraisal.name} frozen. Create a new version for later changes.` });
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Could not freeze the appraisal.' });
    }
  }, [activeAppraisal, askConfirm, setAndNormalize, showToast]);

  const handleArchiveAppraisal = () => {
    if (!activeAppraisal) return;
    const archived = activeAppraisal.status !== 'ARCHIVED';
    updateAppraisal(activeAppraisal.id, (appraisal) => ({
      ...appraisal,
      status: archived ? 'ARCHIVED' : 'DRAFT',
      archivedAt: archived ? new Date().toISOString() : undefined,
    }));
    showToast({ type: 'info', message: archived ? 'Appraisal archived.' : 'Appraisal restored.' });
  };

  const restoreAppraisal = React.useCallback((appraisal: DevelopmentAppraisal) => {
    updateAppraisal(appraisal.id, (current) => ({
      ...current,
      status: 'DRAFT',
      archivedAt: undefined,
    }));
    showToast({ type: 'success', message: `${appraisal.name} restored to the register.` });
  }, [showToast, updateAppraisal]);

  const deleteAppraisal = React.useCallback(async (appraisal: DevelopmentAppraisal) => {
    if (appraisal.frozenAt || appraisal.unviableMarkedAt) {
      showToast({ type: 'info', message: 'Frozen or unviable appraisals are retained. Reopen an unviable site before making changes.' });
      return;
    }
    const confirmed = await askConfirm({
      title: 'Delete appraisal?',
      message: `Delete "${appraisal.name}"? This cannot be undone.`,
      confirmLabel: 'Delete appraisal',
      variant: 'danger',
    });
    if (!confirmed) return;
    setAndNormalize((current) => current.filter((entry) => entry.id !== appraisal.id));
    if (activeAppraisalId === appraisal.id) {
      setActiveAppraisalId(null);
      setActiveOptionId(null);
      setIsDetailsOpen(false);
      setIsCompareOpen(false);
      setActiveWorkspace('REGISTER');
    }
    showToast({ type: 'info', message: 'Appraisal deleted.' });
  }, [activeAppraisalId, askConfirm, setAndNormalize, showToast]);

  const handleDeleteActiveAppraisal = React.useCallback(() => {
    if (!activeAppraisal) return;
    void deleteAppraisal(activeAppraisal);
  }, [activeAppraisal, deleteAppraisal]);

  const handleAddOption = (template: AppraisalTemplate) => {
    if (!activeAppraisal) return;
    const baseOption = {
      ...createDefaultAppraisalOption(template, appSettings, activeKind),
      name: nextOptionName(activeAppraisal.options),
    };
    const option = activeKind === 'HOUSE_BUILDING' && activeAppraisal.costPackId === 'AWD'
      ? ensureAwdSiteCostRows(baseOption)
      : baseOption;
    updateAppraisal(activeAppraisal.id, (appraisal) => ({
      ...appraisal,
      selectedOptionId: option.id,
      options: [...appraisal.options, option],
    }));
    setActiveOptionId(option.id);
    setActiveTab(activeKind === 'COMMERCIAL' ? 'REVENUE' : 'COSTS');
    setActiveHouseStage('HOUSE_TYPES');
  };

  const handleDuplicateOption = () => {
    if (!activeAppraisal || !activeOption) return;
    const copy = duplicateOption(activeOption, activeAppraisal.options);
    updateAppraisal(activeAppraisal.id, (appraisal) => ({
      ...appraisal,
      selectedOptionId: copy.id,
      options: [...appraisal.options, copy],
    }));
    setActiveOptionId(copy.id);
  };

  const handleDeleteOption = () => {
    if (!activeAppraisal || !activeOption || activeAppraisal.options.length <= 1) return;
    updateAppraisal(activeAppraisal.id, (appraisal) => {
      const options = appraisal.options.filter((option) => option.id !== activeOption.id);
      return {
        ...appraisal,
        selectedOptionId: options[0]?.id,
        options,
      };
    });
  };

  const handleCreateRate = () => {
    const costDriver = rateDraft.costDriver || 'ROADS_M2';
    const category = infrastructureCostDriverToCategory(costDriver);
    const label = rateDraft.label.trim() || APPRAISAL_INFRASTRUCTURE_COST_DRIVER_LABELS[costDriver];
    const next = createDefaultAppraisalRate({
      category,
      costDriver,
      label,
      unit: rateDraft.unit || getInfrastructureCostDriverUnit(costDriver),
      rate: draftNumber(rateDraft.rate, 0),
      priceIndex: draftNumber(rateDraft.priceIndex, 0),
      notes: rateDraft.notes,
    });
    setAppraisalRates((current) => normalizeAppraisalRateLibraryItems([next, ...current]));
    setRateDraft({ costDriver: '', label: '', unit: '', rate: '', priceIndex: '', notes: '' });
    showToast({ type: 'success', message: `${label} added to the appraisal rates library.` });
  };

  const handleSaveHouseScheduleRowToLibrary = React.useCallback((row: AppraisalHouseTypeScheduleRow) => {
    const next = createDefaultAppraisalHouseType({
      name: row.houseTypeName || 'New house type',
      style: row.style,
      configuration: row.configuration,
      storeys: row.storeys,
      bedrooms: row.bedrooms,
      garage: row.garage,
      privateDrive: row.privateDrive,
      gifaM2: row.gifaM2,
      buildCostPerM2: calculateHouseTypeScheduleBuildCostPerM2(row),
      costBreakdown: cloneHouseTypeCostBreakdown(row.costBreakdown),
      priceIndex: row.priceIndex || 0,
      buildPeriodMonths: row.buildPeriodMonths || 6,
      notes: row.notes || '',
    });
    setAppraisalHouseTypes((current) => normalizeAppraisalHouseTypeLibraryItems([next, ...current]));
    showToast({ type: 'success', message: `${next.name} saved to the appraisal house-type library.` });
    return next.id;
  }, [setAppraisalHouseTypes, showToast]);

  const handleAddSiteMetricRow = (section: SiteMetricsSection = 'INFRASTRUCTURE') => {
    if (!activeOption) return;
    const label = section === 'PRELIMS'
      ? 'Other prelims allowance'
      : section === 'PLOT_WORKS'
        ? 'Other plot works allowance'
        : 'Other infrastructure allowance';
    updateOption(activeOption.id, (option) => ({
      ...option,
      siteDimensions: [
        ...(option.siteDimensions || []),
        createSiteDimensionRow({
          label,
          unit: 'sum',
          quantity: 1,
          sourceRow: `${section}_CUSTOM`,
        }),
      ],
    }));
    setActiveHouseStage(section);
  };

  const handleAddSiteMetricFromRate = (rateItem: AppraisalRateLibraryItem, section: SiteMetricsSection) => {
    if (!activeOption) return;
    updateOption(activeOption.id, (option) => ({
      ...option,
      siteDimensions: [
        ...(option.siteDimensions || []),
        createSiteDimensionRowFromRate(rateItem, {
          sourceRow: rateItem.sourceRow || `${section}_LIBRARY`,
        }),
      ],
    }));
    setActiveHouseStage(section);
  };

  const handleExport = async (type: AppraisalExportType, exportName?: string, reportLandValue = 0) => {
    if (!activeAppraisal) return;
    setIsExporting(type);
    try {
      const saved = type === 'pdf' && activeOption?.commercialAssessmentStage === 'PRELIMINARY'
        ? await downloadCommercialPreliminaryAssessmentPdf(activeAppraisal, projects, exportName)
        : type === 'pdf'
          ? await downloadAppraisalDecisionPackPdf(activeAppraisal, projects)
        : type === 'summaryPdf'
          ? await downloadAppraisalRevenueCostSummaryPdf(activeAppraisal, projects)
          : type === 'landownerPdf'
            ? await downloadAppraisalLandownerViabilityPdf(activeAppraisal, projects, reportLandValue)
          : type === 'summaryExcel'
            ? await downloadAppraisalRevenueCostSummaryExcel(activeAppraisal, projects)
            : type === 'docx'
              ? await downloadAppraisalFinalReportDocx(activeAppraisal, projects)
              : await downloadAppraisalDecisionPackExcel(activeAppraisal, projects);
      const exportLabel = type === 'pdf' ? 'PDF'
        : type === 'summaryPdf' ? 'Summary PDF'
          : type === 'landownerPdf' ? 'Landowner viability PDF'
          : type === 'summaryExcel' ? 'Summary Excel'
            : type === 'docx' ? 'Word'
              : 'Excel';
      showToast({
        type: saved ? 'success' : 'info',
        message: saved
          ? `${exportLabel} appraisal export saved.`
          : 'Appraisal export was cancelled before saving.',
      });
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Appraisal export failed.' });
    } finally {
      setIsExporting(null);
    }
  };

  const linkedProject = activeAppraisal?.projectId
    ? projects.find((project) => project.id === activeAppraisal.projectId)
    : null;
  const activeStageLabel = activeKind === 'HOUSE_BUILDING'
    ? houseStages.find((entry) => entry.id === activeHouseStage)?.label || 'House Types'
    : activeOption?.commercialAssessmentStage === 'PRELIMINARY'
      ? 'Preliminary Assessment'
      : tabs.find((entry) => entry.id === activeTab)?.label || 'Revenue';
  const isDecisionStage = activeKind === 'HOUSE_BUILDING'
    ? activeHouseStage === 'DECISION'
    : activeTab === 'DECISION';
  const comparisonRows = React.useMemo(
    () => (activeAppraisal && (isDecisionStage || isCompareOpen) ? compareAppraisalOptions(activeAppraisal) : []),
    [activeAppraisal, isCompareOpen, isDecisionStage]
  );
  const actionMenuItems: ContextMenuEntry[] = activeAppraisal && activeOption ? [
    { id: 'appraisal-workflow', type: 'label', label: 'Appraisal workspace' },
    {
      id: 'appraisal-options',
      label: 'Options',
      icon: <ListChecks className="h-4 w-4" />,
      disabled: Boolean(activeAppraisal.frozenAt || activeAppraisal.unviableMarkedAt),
      onSelect: () => setIsOptionsOpen(true),
    },
    {
      id: 'appraisal-details',
      label: 'Appraisal details',
      icon: <Pencil className="h-4 w-4" />,
      onSelect: () => setIsDetailsOpen(true),
    },
    {
      id: 'appraisal-assumptions',
      label: 'Base assumptions',
      icon: <Calculator className="h-4 w-4" />,
      disabled: Boolean(activeAppraisal.frozenAt || activeAppraisal.unviableMarkedAt),
      onSelect: () => setIsAssumptionsOpen(true),
    },
    {
      id: 'appraisal-compare',
      label: 'Compare options',
      icon: <BarChart3 className="h-4 w-4" />,
      onSelect: () => setIsCompareOpen(true),
    },
    { id: 'workspace-separator', type: 'separator' },
    { id: 'exports', type: 'label', label: 'Exports' },
    {
      id: 'export-pdf',
      label: 'Export PDF final report',
      icon: <FileDown className="h-4 w-4" />,
      disabled: Boolean(isExporting),
      onSelect: () => { void handleExport('pdf'); },
    },
    {
      id: 'export-summary-pdf',
      label: 'Export revenue/cost summary PDF',
      icon: <FileDown className="h-4 w-4" />,
      disabled: Boolean(isExporting),
      onSelect: () => { void handleExport('summaryPdf'); },
    },
    {
      id: 'export-summary-excel',
      label: 'Export revenue/cost summary Excel',
      icon: <FileSpreadsheet className="h-4 w-4" />,
      disabled: Boolean(isExporting),
      onSelect: () => { void handleExport('summaryExcel'); },
    },
    {
      id: 'export-excel',
      label: 'Export Excel final report',
      icon: <FileSpreadsheet className="h-4 w-4" />,
      disabled: Boolean(isExporting),
      onSelect: () => { void handleExport('excel'); },
    },
    { id: 'appraisal-separator', type: 'separator' },
    { id: 'appraisal-actions', type: 'label', label: 'Appraisal actions' },
    ...(activeAppraisal.frozenAt ? [{
      id: 'appraisal-new-version',
      label: 'Create editable new version',
      icon: <CopyPlus className="h-4 w-4" />,
      disabled: Boolean(activeAppraisal.unviableMarkedAt),
      onSelect: () => createAppraisalVersion(activeAppraisal),
    }] : [{
      id: 'appraisal-freeze',
      label: 'Freeze this version',
      icon: <Lock className="h-4 w-4" />,
      disabled: Boolean(activeAppraisal.unviableMarkedAt),
      onSelect: () => { void handleFreezeActiveAppraisal(); },
    }]),
    ...(activeAppraisal.unviableMarkedAt ? [{
      id: 'appraisal-reopen-site',
      label: 'Reopen unviable site',
      icon: <RotateCcw className="h-4 w-4" />,
      onSelect: handleReopenSite,
    }] : []),
    ...(activeAppraisal.siteStatus === 'BID_LOST' ? [{
      id: 'appraisal-reopen-lost-bid',
      label: 'Reopen lost bid',
      icon: <RotateCcw className="h-4 w-4" />,
      onSelect: handleReopenLostBid,
    }] : []),
    {
      id: 'appraisal-archive',
      label: activeAppraisal.status === 'ARCHIVED' ? 'Restore appraisal' : 'Archive appraisal',
      icon: <Archive className="h-4 w-4" />,
      disabled: Boolean(activeAppraisal.frozenAt || activeAppraisal.unviableMarkedAt),
      onSelect: handleArchiveAppraisal,
    },
    {
      id: 'appraisal-delete',
      label: 'Delete appraisal',
      icon: <Trash2 className="h-4 w-4" />,
      tone: 'danger',
      disabled: Boolean(activeAppraisal.frozenAt || activeAppraisal.unviableMarkedAt),
      onSelect: handleDeleteActiveAppraisal,
    },
  ] : [];

  return (
    <div data-smoke="appraisals-workspace" className="appraisal-workbench flex h-full min-h-0 w-full flex-col overflow-hidden rounded-app-xl border border-slate-200/80 shadow-card dark:border-slate-700/80">
      <header className="border-b border-slate-200/80 bg-white/90 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-surface-900/92">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="workspace-chip mb-3">
              <Calculator className="h-3.5 w-3.5" />
              Beta module
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Development Appraisals</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-300">
              Stage house-building appraisals and compare commercial options without changing projects, bills, tenders, or cost plans.
            </p>
            <div className="mt-4 inline-flex rounded-app border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-surface-950">
              <button
                type="button"
                data-smoke="appraisals-register-switch"
                onClick={() => setActiveWorkspace('REGISTER')}
                className={`inline-flex items-center gap-2 rounded-app-sm px-3 py-2 text-xs font-semibold transition ${
                  activeWorkspace === 'REGISTER'
                    ? 'bg-white text-slate-950 shadow-sm dark:bg-surface-800 dark:text-slate-50'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                Register
              </button>
              <button
                type="button"
                data-smoke="appraisals-house-switch"
                onClick={() => setActiveWorkspace('HOUSE_BUILDING')}
                className={`inline-flex items-center gap-2 rounded-app-sm px-3 py-2 text-xs font-semibold transition ${
                  activeWorkspace === 'HOUSE_BUILDING'
                    ? 'bg-white text-slate-950 shadow-sm dark:bg-surface-800 dark:text-slate-50'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                <Home className="h-4 w-4" />
                House Building
              </button>
              <button
                type="button"
                data-smoke="appraisals-commercial-switch"
                onClick={() => setActiveWorkspace('COMMERCIAL')}
                className={`inline-flex items-center gap-2 rounded-app-sm px-3 py-2 text-xs font-semibold transition ${
                  activeWorkspace === 'COMMERCIAL'
                    ? 'bg-white text-slate-950 shadow-sm dark:bg-surface-800 dark:text-slate-50'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                <Building2 className="h-4 w-4" />
                Commercial
              </button>
              <button
                type="button"
                data-smoke="appraisals-library-switch"
                onClick={() => setActiveWorkspace('LIBRARY')}
                className={`inline-flex items-center gap-2 rounded-app-sm px-3 py-2 text-xs font-semibold transition ${
                  activeWorkspace === 'LIBRARY'
                    ? 'bg-white text-slate-950 shadow-sm dark:bg-surface-800 dark:text-slate-50'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                Cost libraries
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isRegisterWorkspace ? (
              <>
                <button type="button" data-smoke="appraisals-new-house" onClick={() => handleCreateAppraisal('HOUSE_BUILDING')} className="inline-flex items-center gap-2 rounded-app-sm bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700">
                  <Home className="h-4 w-4" />
                  New house building
                </button>
                <button type="button" data-smoke="appraisals-new-commercial" onClick={() => handleCreateAppraisal('COMMERCIAL')} className="inline-flex items-center gap-2 rounded-app-sm bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700">
                  <Building2 className="h-4 w-4" />
                  New commercial
                </button>
              </>
            ) : null}
            <button type="button" onClick={onClose} className="workspace-secondary-btn px-3 py-2 text-xs">
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>
      </header>

      {isRegisterWorkspace ? (
        <AppraisalRegisterWorkspace
          appraisals={normalizedAppraisals}
          showArchived={showArchived}
          setShowArchived={setShowArchived}
          appraisalFolders={appraisalWorkspaceFolders}
          onCreateFolder={createAppraisalFolderFromName}
          onAssignFolder={handleAssignAppraisalFolder}
          onRenameFolder={handleRenameAppraisalFolder}
          onDeleteFolder={handleDeleteAppraisalFolder}
          onDeleteAppraisal={deleteAppraisal}
          onRestoreAppraisal={restoreAppraisal}
          onOpenAppraisal={openAppraisal}
          onCreateVersion={createAppraisalVersion}
        />
      ) : isLibraryWorkspace ? (
        <AppraisalLibraryWorkspace
          houseTypes={normalizedHouseTypes}
          rates={normalizedRates}
          rateDraft={rateDraft}
          setRateDraft={setRateDraft}
          onCreateRate={handleCreateRate}
          setAppraisalHouseTypes={setAppraisalHouseTypes}
          setAppraisalRates={setAppraisalRates}
        />
      ) : (
        <main className="appraisal-workbench min-h-0 flex-1 overflow-y-auto p-4 lg:p-5">
          {!activeAppraisal || !activeOption ? (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-md rounded-app-lg border border-slate-200 bg-white p-6 text-center shadow-card dark:border-slate-700 dark:bg-surface-900">
                <Calculator className="mx-auto h-10 w-10 text-primary-600" />
                <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">No {activeKind === 'HOUSE_BUILDING' ? 'house-building' : 'commercial'} appraisal selected</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Open an appraisal from the Register to edit it here.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <button type="button" data-smoke="appraisals-back-register" onClick={() => setActiveWorkspace('REGISTER')} className="workspace-secondary-btn px-4 py-2 text-sm">
                    <BookOpen className="h-4 w-4" />
                    Back to register
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex w-full flex-col gap-3">
                <section data-smoke="appraisals-guided-editor" className="appraisal-top-panel relative isolate overflow-hidden p-2.5">
                  {(activeAppraisal.frozenAt || activeAppraisal.unviableMarkedAt || activeAppraisal.siteStatus === 'BID_LOST') && (
                    <div aria-hidden="true" className="pointer-events-none absolute left-[51%] top-2 z-0 hidden -translate-x-1/2 select-none items-center gap-5 xl:flex">
                      {activeAppraisal.frozenAt && <span data-smoke="appraisals-frozen-watermark" className="-rotate-6 text-xl font-black tracking-[0.18em] text-rose-600/25 dark:text-rose-300/25">FROZEN</span>}
                      {activeAppraisal.unviableMarkedAt && <span data-smoke="appraisals-unviable-watermark" className="-rotate-6 text-xl font-black tracking-[0.16em] text-slate-700/30 dark:text-slate-200/25">UNVIABLE</span>}
                      {activeAppraisal.siteStatus === 'BID_LOST' && <span data-smoke="appraisals-bid-lost-watermark" className="-rotate-6 text-xl font-black tracking-[0.16em] text-slate-700/30 dark:text-slate-200/25">BID LOST</span>}
                    </div>
                  )}
                  <div className="relative z-10 grid items-center gap-2 xl:grid-cols-[minmax(20rem,0.75fr)_minmax(34rem,1fr)_auto]">
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <button type="button" data-smoke="appraisals-back-register" onClick={() => setActiveWorkspace('REGISTER')} className="workspace-secondary-btn px-2.5 py-1.5 text-xs">
                          <BookOpen className="h-4 w-4" />
                          Back to register
                        </button>
                        <span className={appraisalStatusPillClass(activeAppraisal.status)}>
                          {activeAppraisal.status}
                        </span>
                        {activeAppraisal.frozenAt && (
                          <span data-smoke="appraisals-frozen-badge" className="appraisal-top-pill border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                            <Lock className="h-3 w-3" /> Frozen {new Date(activeAppraisal.frozenAt).toLocaleDateString()}
                          </span>
                        )}
                        {activeAppraisal.unviableMarkedAt && (
                          <span data-smoke="appraisals-unviable-badge" className="appraisal-top-pill border-slate-400 bg-slate-200 text-slate-800 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100">
                            Unviable site
                          </span>
                        )}
                        {activeAppraisal.siteStatus === 'BID_LOST' && (
                          <span data-smoke="appraisals-bid-lost-badge" className="appraisal-top-pill border-slate-400 bg-slate-200 text-slate-800 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100">
                            Bid lost
                          </span>
                        )}
                        {activeAppraisal.reference && (
                          <span className="appraisal-top-pill appraisal-pill-reference tabular-nums">
                            {activeAppraisal.reference}
                          </span>
                        )}
                        <span className="appraisal-top-pill appraisal-pill-date">
                          {activeAppraisal.appraisalDate || 'No appraisal date'}
                        </span>
                        <h2 className="min-w-[14rem] flex-1 truncate pl-1 text-base font-semibold text-slate-950 dark:text-slate-50">{activeAppraisal.name}</h2>
                      </div>
                      <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          {activeKind === 'HOUSE_BUILDING' ? 'House building' : 'Commercial'} / {activeAppraisal.options.length} option{activeAppraisal.options.length === 1 ? '' : 's'}
                        </span>
                        {activeAppraisal.options.length > 1 ? (
                          <label className="min-w-[12rem]">
                            <span className="sr-only">Scenario</span>
                            <select
                              data-smoke="appraisals-option-select"
                              value={activeOption.id}
                              onChange={(event) => {
                                setActiveOptionId(event.target.value);
                                updateAppraisal(activeAppraisal.id, (appraisal) => ({ ...appraisal, selectedOptionId: event.target.value }));
                              }}
                              className={`${inputClass()} h-7 py-1 text-xs`}
                            >
                              {activeAppraisal.options.map((option) => (
                                <option key={option.id} value={option.id}>{option.name}</option>
                              ))}
                            </select>
                          </label>
                        ) : (
                          <span className="appraisal-top-pill appraisal-pill-option">
                            {activeOption.name}
                          </span>
                        )}
                        {activeKind === 'HOUSE_BUILDING' && activeAppraisal.costPackId && (
                          <span className="appraisal-top-pill appraisal-pill-pack">
                            {costPackOptions.find((pack) => pack.id === activeAppraisal.costPackId)?.label || activeAppraisal.costPackId}
                          </span>
                        )}
                        {activeKind === 'COMMERCIAL' && (
                          <span className="appraisal-top-pill appraisal-pill-pack">
                            Commercial template rates
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid min-w-0 gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
                      {activeKind === 'COMMERCIAL' ? (
                        <>
                          <MetricTile label="Land value" value={money(activeOption.knownLandValue || 0)} />
                          <MetricTile label="Annual income" value={money(activeCommercialLifecycle?.startingAnnualIncome || 0)} tone={(activeCommercialLifecycle?.startingAnnualIncome || 0) > 0 ? 'good' : 'watch'} />
                          <MetricTile label="Break-even" value={activeCommercialLifecycle?.breakEvenYear ? `Year ${activeCommercialLifecycle.breakEvenYear}` : 'Not within period'} tone={activeCommercialLifecycle?.breakEvenYear ? 'good' : 'watch'} />
                        </>
                      ) : (
                        <>
                          <MetricTile label="GDV" value={activeMetrics ? money(activeMetrics.gdv) : '£0'} />
                          {activeOption.salesIndexationEnabled ? (
                            <MetricTile
                              label={salesIndexUpliftLabel(activeOption)}
                              value={money(activeSalesIndexUplift)}
                              tone={activeSalesIndexUplift > 0 ? 'good' : 'default'}
                            />
                          ) : null}
                          <MetricTile label={activeOption.calculationMode === 'RESIDUAL_LAND_VALUE' ? 'Land value' : 'Profit'} value={activeMetrics ? money(activeOption.calculationMode === 'RESIDUAL_LAND_VALUE' ? activeMetrics.landValue : activeMetrics.profit) : '£0'} tone={(activeMetrics?.profit || 0) >= 0 ? 'good' : 'bad'} />
                          <MetricTile label="Peak funding" value={activeMetrics ? money(activeMetrics.peakFunding) : '£0'} />
                        </>
                      )}
                    </div>
                    <div className="flex justify-start gap-2 xl:justify-end">
                      <button
                        type="button"
                        data-smoke="appraisals-bid-lost"
                        disabled={Boolean(activeAppraisal.unviableMarkedAt || activeAppraisal.siteStatus === 'BID_LOST')}
                        onClick={handleMarkBidLost}
                        className={activeAppraisal.siteStatus === 'BID_LOST'
                          ? 'inline-flex h-8 items-center gap-1.5 rounded-app-sm border border-slate-400 bg-slate-200 px-2.5 text-xs font-semibold text-slate-800 cursor-not-allowed dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100'
                          : 'workspace-secondary-btn px-2.5 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40'}
                      >
                        <Flag className="h-3.5 w-3.5" />
                        {activeAppraisal.siteStatus === 'BID_LOST' ? 'Bid lost' : 'Mark bid lost'}
                      </button>
                      <button
                        type="button"
                        data-smoke="appraisals-site-viability"
                        disabled={Boolean(activeAppraisal.unviableMarkedAt)}
                        onClick={() => { void handleMarkSiteUnviable(); }}
                        className={activeAppraisal.unviableMarkedAt
                          ? 'inline-flex h-8 items-center gap-1.5 rounded-app-sm border border-rose-300 bg-rose-100 px-2.5 text-xs font-semibold text-rose-800 cursor-not-allowed dark:border-rose-700 dark:bg-rose-950/50 dark:text-rose-200'
                          : 'workspace-secondary-btn px-2.5 py-1.5 text-xs'}
                      >
                        <X className="h-3.5 w-3.5" />
                        {activeAppraisal.unviableMarkedAt ? 'Unviable' : 'Mark unviable'}
                      </button>
                      <button
                        type="button"
                        data-smoke="appraisals-freeze-version"
                        disabled={Boolean(activeAppraisal.frozenAt || activeAppraisal.unviableMarkedAt)}
                        onClick={() => { void handleFreezeActiveAppraisal(); }}
                        className={activeAppraisal.frozenAt
                          ? 'inline-flex h-8 items-center gap-1.5 rounded-app-sm border border-rose-300 bg-rose-100 px-2.5 text-xs font-semibold text-rose-800 cursor-not-allowed dark:border-rose-700 dark:bg-rose-950/50 dark:text-rose-200'
                          : 'workspace-secondary-btn px-2.5 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40'}
                      >
                        <Lock className="h-3.5 w-3.5" />
                        {activeAppraisal.frozenAt ? 'Frozen' : 'Freeze version'}
                      </button>
                      {activeAppraisal.frozenAt && (
                        <button
                          type="button"
                          data-smoke="appraisals-create-revision"
                          onClick={() => createAppraisalVersion(activeAppraisal)}
                          disabled={Boolean(activeAppraisal.unviableMarkedAt)}
                          className="workspace-secondary-btn px-2.5 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <CopyPlus className="h-3.5 w-3.5" />
                          New version
                        </button>
                      )}
                      <PopoverMenu
                        ariaLabel="Appraisal actions"
                        width={300}
                        estimatedHeight={420}
                        trigger={({ ref, isOpen, toggle }) => (
                          <button
                            ref={ref}
                            type="button"
                            data-smoke="appraisals-more-actions"
                            aria-expanded={isOpen}
                            onClick={toggle}
                            className="workspace-icon-btn h-8 w-8 p-0"
                            title="More appraisal actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        )}
                      >
                        {(close) => <MenuActionList items={actionMenuItems} close={close} itemTextSize="text-xs" />}
                      </PopoverMenu>
                    </div>
                  </div>
                </section>

                <div className="appraisal-shell-grid">
                  <aside className="hidden border-r border-slate-300/60 pr-3 dark:border-slate-700/70 xl:block">
                    <div className="appraisal-nav-panel sticky top-0 p-2.5">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workflow</div>
                          <h3 className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">{activeStageLabel}</h3>
                        </div>
                        <button type="button" disabled={Boolean(activeAppraisal.frozenAt || activeAppraisal.unviableMarkedAt)} onClick={() => setIsOptionsOpen(true)} className="workspace-icon-btn p-1.5 disabled:opacity-40" aria-label="Manage appraisal options" title="Manage options">
                          <ListChecks className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {activeKind === 'COMMERCIAL' ? (
                        <CommercialStageNav tab={activeTab} setTab={setActiveTab} variant="rail" />
                      ) : (
                        <HouseStageNav option={activeOption} stage={activeHouseStage} setStage={setActiveHouseStage} variant="rail" />
                      )}
                    </div>
                  </aside>

                  <div className="min-w-0 space-y-3">
                    <section className="appraisal-nav-panel p-2.5 xl:hidden">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workflow</div>
                          <h3 className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">{activeStageLabel}</h3>
                        </div>
                        <button type="button" disabled={Boolean(activeAppraisal.frozenAt || activeAppraisal.unviableMarkedAt)} onClick={() => setIsOptionsOpen(true)} className="workspace-secondary-btn px-2.5 py-1.5 text-xs disabled:opacity-40">
                          <ListChecks className="h-4 w-4" />
                          Manage options
                        </button>
                      </div>
                      <div className="mt-2 overflow-x-auto pb-1">
                        {activeKind === 'COMMERCIAL' ? (
                          <CommercialStageNav tab={activeTab} setTab={setActiveTab} />
                        ) : (
                          <HouseStageNav option={activeOption} stage={activeHouseStage} setStage={setActiveHouseStage} />
                        )}
                      </div>
                    </section>

                    {isDecisionStage && (
                      <section className="appraisal-step-panel p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Final report comparison</div>
                            <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">Compare options before exporting.</h3>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" data-smoke="appraisals-export-pdf" disabled={Boolean(isExporting)} onClick={() => { void handleExport('pdf'); }} className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-50">
                              <FileDown className="h-4 w-4" />
                              PDF
                            </button>
                            <button type="button" data-smoke="appraisals-export-excel" disabled={Boolean(isExporting)} onClick={() => { void handleExport('excel'); }} className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-50">
                              <FileSpreadsheet className="h-4 w-4" />
                              Excel
                            </button>
                          </div>
                        </div>
                        <AppraisalOptionComparisonTable
                          activeKind={activeKind}
                          activeOptionId={activeOption.id}
                          comparisonRows={comparisonRows}
                          onSelectOption={(optionId) => {
                            setActiveOptionId(optionId);
                            updateAppraisal(activeAppraisal.id, (appraisal) => ({ ...appraisal, selectedOptionId: optionId }));
                          }}
                        />
                      </section>
                    )}

                    <section className="appraisal-step-panel overflow-hidden">
                      <div className="appraisal-step-header flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Active work area</div>
                          <h3 className="mt-0.5 text-base font-semibold text-slate-950 dark:text-slate-50">{activeStageLabel}</h3>
                          <p className="mt-0.5 max-w-4xl truncate text-xs text-slate-500 dark:text-slate-400">
                            {activeKind === 'HOUSE_BUILDING'
                              ? houseStageDescription(activeHouseStage)
                              : activeOption.commercialAssessmentStage === 'PRELIMINARY'
                                ? 'Retain the preliminary assessment evidence and wait for further information before starting commercial calculations.'
                                : commercialStageDescription(activeTab)}
                          </p>
                        </div>
                        {activeKind === 'HOUSE_BUILDING' && isHouseStageIncomplete(activeHouseStage, activeOption) && (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                            Needs attention
                          </span>
                        )}
                      </div>
                      {activeAppraisal.frozenAt && (
                        <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
                          <strong>Frozen appraisal.</strong> Inputs and calculated totals are retained as at {new Date(activeAppraisal.frozenAt).toLocaleString()}.
                          Create a new version to change assumptions or use updated pricing.
                          {activeOption.frozenReportData && (
                            <details className="mt-2 rounded border border-emerald-200 bg-white/80 p-2 dark:border-emerald-800 dark:bg-surface-900/70">
                              <summary className="cursor-pointer font-semibold">View frozen cost summary</summary>
                              <div className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
                                {activeOption.frozenReportData.costSummaryRows.map((row) => (
                                  <div key={row.id} className="flex justify-between gap-4 border-b border-emerald-100 py-1 dark:border-emerald-900">
                                    <span>{row.title}</span><span className="font-semibold tabular-nums">{money(row.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      )}
                      {activeAppraisal.unviableMarkedAt && !activeAppraisal.frozenAt && (
                        <div className="border-b border-slate-300 bg-slate-100 px-4 py-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          <strong>Unviable site.</strong> Appraisal inputs are read-only. Reopen the site from More actions to edit it; its Register folder can still be changed.
                        </div>
                      )}
                      <div className="p-3">
                        <fieldset disabled={Boolean(activeAppraisal.frozenAt || activeAppraisal.unviableMarkedAt)} className="min-w-0 border-0 p-0 disabled:opacity-80">
                        {activeKind === 'HOUSE_BUILDING' ? (
                          <HouseBuildingEditor
                            appraisal={activeAppraisal}
                            option={activeOption}
                            stage={activeHouseStage}
                            setStage={setActiveHouseStage}
                            houseTypes={normalizedHouseTypes}
                            rateItems={normalizedRates}
                            onSaveHouseTypeToLibrary={handleSaveHouseScheduleRowToLibrary}
                            onAddSiteMetricRow={handleAddSiteMetricRow}
                            onAddSiteMetricFromRate={handleAddSiteMetricFromRate}
                            onOpenAppraisalLibraries={() => setActiveWorkspace('LIBRARY')}
                            projects={projects}
                            linkedProject={linkedProject}
                            updateAppraisal={updateAppraisal}
                            updateOption={updateOption}
                              onExportReport={(type, reportLandValue) => { void handleExport(type, undefined, reportLandValue); }}
                            isExporting={Boolean(isExporting)}
                          />
                        ) : (
                          <div data-smoke="appraisals-commercial-workspace" className="space-y-4">
                            {activeOption.commercialAssessmentStage === 'PRELIMINARY' ? (
                              <CommercialPreliminaryAssessmentPanel
                                appraisal={activeAppraisal}
                                option={activeOption}
                                updateOption={updateOption}
                                onExport={(exportName) => { void handleExport('pdf', exportName); }}
                                isExporting={Boolean(isExporting)}
                              />
                            ) : (
                              <>
                                <CommercialTemplatePanel option={activeOption} updateOption={updateOption} />
                                {activeTab === 'REVENUE' && <RevenueEditor option={activeOption} updateOption={updateOption} />}
                                {activeTab === 'COSTS' && <CostsEditor option={activeOption} linkedProject={linkedProject} updateOption={updateOption} />}
                                {activeTab === 'LIFECYCLE' && <CommercialLifecycleEditor option={activeOption} updateOption={updateOption} />}
                                {activeTab === 'ASSUMPTIONS' && <AssumptionsEditor option={activeOption} updateOption={updateOption} />}
                                {activeTab === 'DECISION' && (
                                  <DecisionEditor
                                    appraisal={activeAppraisal}
                                    option={activeOption}
                                    updateAppraisal={updateAppraisal}
                                    updateOption={updateOption}
                                    onExportReport={(type, reportLandValue) => { void handleExport(type, undefined, reportLandValue); }}
                                    isExporting={Boolean(isExporting)}
                                  />
                                )}
                              </>
                            )}
                          </div>
                        )}
                        </fieldset>
                      </div>
                    </section>
                  </div>
                </div>
              </div>

              {isDetailsOpen && (
                <AppraisalDetailsDrawer
                  appraisal={activeAppraisal}
                  activeOption={activeOption}
                  folders={appraisalWorkspaceFolders}
                  onClose={() => setIsDetailsOpen(false)}
                  updateAppraisal={updateAppraisal}
                  updateSiteStatus={updateSiteStatus}
                  updateOption={updateOption}
                  onAssignFolder={handleAssignAppraisalFolder}
                  onArchive={handleArchiveAppraisal}
                  onDelete={handleDeleteActiveAppraisal}
                />
              )}

              {isOptionsOpen && (
                <AppraisalOptionsDrawer
                  appraisal={activeAppraisal}
                  activeKind={activeKind}
                  activeOptionId={activeOption.id}
                  setActiveOptionId={setActiveOptionId}
                  updateAppraisal={updateAppraisal}
                  updateOption={updateOption}
                  onAddOption={() => handleAddOption(activeKind === 'COMMERCIAL' ? 'COMMERCIAL_INCOME' : 'RESIDENTIAL_SALES')}
                  onClose={() => setIsOptionsOpen(false)}
                />
              )}

              {isAssumptionsOpen && (
                <AppraisalSideDrawer
                  title="Base assumptions"
                  subtitle="Adjust target profit, overheads, finance, land assumptions, and appraisal notes for the active option."
                  smokeId="appraisals-base-assumptions-drawer"
                  onClose={() => setIsAssumptionsOpen(false)}
                  wide
                >
                  <AssumptionsEditor option={activeOption} updateOption={updateOption} />
                </AppraisalSideDrawer>
              )}

              {isCompareOpen && (
                <AppraisalSideDrawer
                  title="Compare options"
                  subtitle="Choose the active option or review the full appraisal position without leaving the current stage."
                  smokeId="appraisals-compare-drawer"
                  onClose={() => setIsCompareOpen(false)}
                  wide
                >
                  <AppraisalOptionComparisonTable
                    activeKind={activeKind}
                    activeOptionId={activeOption.id}
                    comparisonRows={comparisonRows}
                    onSelectOption={(optionId) => {
                      setActiveOptionId(optionId);
                      updateAppraisal(activeAppraisal.id, (appraisal) => ({ ...appraisal, selectedOptionId: optionId }));
                    }}
                  />
                </AppraisalSideDrawer>
              )}
            </>
          )}
        </main>
      )}

      {newAppraisalDraft && (
        <NewAppraisalSetupDrawer
          draft={newAppraisalDraft}
          appraisals={normalizedAppraisals}
          folders={appraisalWorkspaceFolders}
          aiSettings={appSettings.ai}
          showToast={showToast}
          onChange={(patch) => setNewAppraisalDraft((current) => (current ? { ...current, ...patch } : current))}
          onCreateFolder={createAppraisalFolderFromName}
          onClose={() => setNewAppraisalDraft(null)}
          onCreate={handleConfirmCreateAppraisal}
        />
      )}

      {versionDraft && (
        <AppraisalVersionDrawer
          draft={versionDraft}
          appraisals={normalizedAppraisals}
          onClose={() => setVersionDraft(null)}
          onCreate={handleConfirmCreateVersion}
        />
      )}
    </div>
  );
}

function AppraisalOptionComparisonTable({
  activeKind,
  activeOptionId,
  comparisonRows,
  onSelectOption,
}: {
  activeKind: DevelopmentAppraisalKind;
  activeOptionId: string;
  comparisonRows: ReturnType<typeof compareAppraisalOptions>;
  onSelectOption: (optionId: string) => void;
}) {
  return (
    <div data-smoke="appraisals-option-table" className="mt-4 overflow-x-auto rounded-app border border-slate-200 dark:border-slate-800">
      <table className="min-w-[980px] w-full text-left text-xs">
        <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
          <tr>
            <th className="px-3 py-2">Option</th>
            <th className="px-3 py-2 text-right">GDV</th>
            <th className="px-3 py-2 text-right">Cost</th>
            <th className="px-3 py-2 text-right">Finance</th>
            <th className="px-3 py-2 text-right">Land</th>
            <th className="px-3 py-2 text-right">Profit</th>
            <th className="px-3 py-2 text-right">Profit/GDV</th>
            <th className="px-3 py-2">Position</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {comparisonRows.map(({ option, metrics: originalMetrics, isRecommended }) => {
            const finalReportMetrics = calculateFinalReportMetrics(option);
            const metrics = finalReportMetrics.metrics;
            const position = metrics.recommendation;
            return (
              <tr
                key={option.id}
                onClick={() => onSelectOption(option.id)}
                className={`cursor-pointer ${option.id === activeOptionId ? 'bg-primary-50/80 dark:bg-primary-950/20' : 'bg-white hover:bg-slate-50 dark:bg-surface-900 dark:hover:bg-surface-800'}`}
              >
                <td className="px-3 py-2">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{option.name}</div>
                  <div className="text-[11px] text-slate-500">
                    {activeKind === 'HOUSE_BUILDING' ? 'House building' : APPRAISAL_TEMPLATE_LABELS[option.template]}
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-medium">{money(metrics.gdv)}</td>
                <td className="px-3 py-2 text-right">{money(metrics.nonLandCost)}</td>
                <td className="px-3 py-2 text-right">{money(metrics.financeCost)}</td>
                <td className="px-3 py-2 text-right">
                  {finalReportMetrics.hasNegativeResidualLand ? (
                    <div className="space-y-0.5">
                      <div className="text-[11px] text-rose-600 line-through dark:text-rose-300">{money(originalMetrics.landValue)}</div>
                      <div className="font-semibold">{money(metrics.landValue)}</div>
                    </div>
                  ) : money(metrics.landValue)}
                </td>
                <td className="px-3 py-2 text-right">
                  {finalReportMetrics.hasNegativeResidualLand ? (
                    <div className="space-y-0.5">
                      <div className="text-[11px] text-rose-600 line-through dark:text-rose-300">{money(originalMetrics.profit)}</div>
                      <div className="font-semibold">{money(metrics.profit)}</div>
                    </div>
                  ) : money(metrics.profit)}
                </td>
                <td className="px-3 py-2 text-right">
                  {finalReportMetrics.hasNegativeResidualLand ? (
                    <div className="space-y-0.5">
                      <div className="text-[11px] text-rose-600 line-through dark:text-rose-300">{originalMetrics.profitOnGdvPercent.toFixed(1)}%</div>
                      <div className="font-semibold">{metrics.profitOnGdvPercent.toFixed(1)}%</div>
                    </div>
                  ) : `${metrics.profitOnGdvPercent.toFixed(1)}%`}
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${appraisalRecommendationPillClass(position)}`}>
                    {isRecommended && <Star className="h-3 w-3" aria-label="Selected report option" />}
                    {appraisalRecommendationLabel(position)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AppraisalSideDrawer({
  title,
  subtitle,
  smokeId,
  onClose,
  wide = false,
  children,
}: {
  title: string;
  subtitle?: string;
  smokeId: string;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const panelRef = React.useRef<HTMLElement | null>(null);
  const returnFocusRef = React.useRef<HTMLElement | null>(null);
  const onCloseRef = React.useRef(onClose);
  const dragRef = React.useRef<{ offsetX: number; offsetY: number } | null>(null);
  const [position, setPosition] = React.useState<{ left: number; top: number } | null>(null);
  const safeLeft = 96;
  const clampPosition = React.useCallback((left: number, top: number) => {
    const panel = panelRef.current;
    const rect = panel?.getBoundingClientRect();
    const width = rect?.width || (wide ? Math.min(1216, window.innerWidth - safeLeft - 16) : Math.min(544, window.innerWidth - safeLeft - 16));
    const height = rect?.height || Math.min(720, window.innerHeight - 32);
    const minLeft = window.innerWidth > 760 ? safeLeft : 16;
    const maxLeft = Math.max(minLeft, window.innerWidth - width - 16);
    return {
      left: Math.min(Math.max(minLeft, left), maxLeft),
      top: Math.min(Math.max(16, top), Math.max(16, window.innerHeight - height - 16)),
    };
  }, [wide]);

  React.useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    setPosition(clampPosition((window.innerWidth - rect.width) / 2, Math.max(24, window.innerHeight * 0.08)));
  }, [clampPosition]);

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      returnFocusRef.current?.focus?.();
    };
  }, []);

  React.useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!dragRef.current) return;
      setPosition(clampPosition(event.clientX - dragRef.current.offsetX, event.clientY - dragRef.current.offsetY));
    };
    const handleMouseUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [clampPosition]);

  const beginDrag = (event: React.MouseEvent) => {
    if (event.button !== 0) return;
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    dragRef.current = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    setPosition({ left: rect.left, top: rect.top });
  };

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/35 backdrop-blur-[1px]" onMouseDown={onClose}>
      <aside
        ref={panelRef}
        data-smoke={smokeId}
        className={`absolute flex max-h-[calc(100vh-2rem)] ${wide ? 'w-[min(76rem,calc(100vw-7rem))]' : 'w-[min(34rem,calc(100vw-7rem))]'} flex-col overflow-hidden rounded-app-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-surface-950`}
        style={position ? { left: position.left, top: position.top } : { left: '50%', top: '8vh', visibility: 'hidden' }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header
          data-smoke={`${smokeId}-drag-handle`}
          className="cursor-move border-b border-slate-200 px-5 py-4 dark:border-slate-800"
          onMouseDown={beginDrag}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Appraisals</div>
              <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">{title}</h3>
              {subtitle && <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{subtitle}</p>}
            </div>
            <button type="button" onMouseDown={(event) => event.stopPropagation()} onClick={onClose} className="workspace-secondary-btn px-3 py-2 text-xs">
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </aside>
    </div>
  );
}

function AppraisalVersionDrawer({
  draft,
  appraisals,
  onClose,
  onCreate,
}: {
  draft: AppraisalVersionDraft;
  appraisals: DevelopmentAppraisal[];
  onClose: () => void;
  onCreate: (draft: AppraisalVersionDraft) => void;
}) {
  const [mode, setMode] = React.useState(draft.mode);
  const [summary, setSummary] = React.useState(draft.summary);
  const [baseAppraisalId, setBaseAppraisalId] = React.useState(draft.baseAppraisalId);
  React.useEffect(() => {
    setMode(draft.mode);
    setSummary(draft.summary);
    setBaseAppraisalId(draft.baseAppraisalId);
  }, [draft.appraisal.id, draft.baseAppraisalId, draft.mode, draft.summary]);
  const versionChoices = React.useMemo(() => {
    const parsed = parseAppraisalReference(draft.appraisal.reference);
    if (!parsed) return [draft.appraisal];
    return appraisals
      .filter((appraisal) => parseAppraisalReference(appraisal.reference)?.baseReference === parsed.baseReference)
      .sort((a, b) => {
        const revisionA = parseAppraisalReference(a.reference)?.revision || 'A';
        const revisionB = parseAppraisalReference(b.reference)?.revision || 'A';
        return revisionSortValue(revisionB) - revisionSortValue(revisionA);
      });
  }, [appraisals, draft.appraisal]);
  const baseAppraisal = versionChoices.find((appraisal) => appraisal.id === baseAppraisalId) || draft.appraisal;
  const nextReference = buildNextAppraisalRevisionReference(baseAppraisal, appraisals);
  const kindLabel = baseAppraisal.kind === 'COMMERCIAL' ? 'Commercial' : 'House building';
  const canCreate = baseAppraisal.status !== 'ARCHIVED';
  return (
    <AppraisalSideDrawer
      title="Create new version"
      subtitle="Choose whether the next appraisal revision starts from the current data or from a clean template."
      smokeId="appraisals-new-version-drawer"
      onClose={onClose}
    >
      <div className="space-y-5">
        <section className="rounded-app border border-primary-100 bg-primary-50/70 p-4 text-sm dark:border-primary-900/60 dark:bg-primary-950/20">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-700 dark:text-primary-200">Revision preview</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-950 dark:text-slate-50">{nextReference}</div>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {kindLabel} appraisal - {draft.appraisal.name}
          </p>
        </section>

        {versionChoices.length > 1 && (
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Base version</span>
            <select
              data-smoke="appraisals-version-base-select"
              value={baseAppraisal.id}
              onChange={(event) => setBaseAppraisalId(event.target.value)}
              className={`${inputClass()} mt-1 w-full`}
            >
              {versionChoices.map((appraisal) => {
                const parsed = parseAppraisalReference(appraisal.reference);
                const date = appraisal.appraisalDate ? new Date(`${appraisal.appraisalDate}T00:00:00`).toLocaleDateString() : 'No date';
                return (
                  <option key={appraisal.id} value={appraisal.id}>
                    {appraisal.reference || `Version ${parsed?.revision || ''}`} - {date}{appraisal.frozenAt ? ' (frozen)' : appraisal.status === 'ARCHIVED' ? ' (archived)' : ''}
                  </option>
                );
              })}
            </select>
            <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
              Choose the version whose data and assumptions should form the starting point for this revision.
            </span>
          </label>
        )}

        <fieldset>
          <legend className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Starting point</legend>
          <div className="mt-2 grid gap-2">
            <label
              className={`flex cursor-pointer gap-3 rounded-app border p-3 text-sm transition ${
                mode === 'COPY_CURRENT_DATA'
                  ? 'border-primary-200 bg-primary-50 text-primary-900 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-100'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-primary-200 dark:border-slate-800 dark:bg-surface-900 dark:text-slate-200'
              }`}
            >
              <input
                data-smoke="appraisals-version-copy-current"
                type="radio"
                name="appraisal-version-mode"
                checked={mode === 'COPY_CURRENT_DATA'}
                onChange={() => setMode('COPY_CURRENT_DATA')}
                className="mt-1"
              />
              <Copy className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <span className="block font-semibold">Use current appraisal data</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Copies the selected version's inputs, evidence and notes. Linked library prices refresh and totals recalculate; issued reports remain with the earlier version.
                </span>
              </span>
            </label>

            <label
              className={`flex cursor-pointer gap-3 rounded-app border p-3 text-sm transition ${
                mode === 'BLANK_SLATE'
                  ? 'border-primary-200 bg-primary-50 text-primary-900 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-100'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-primary-200 dark:border-slate-800 dark:bg-surface-900 dark:text-slate-200'
              }`}
            >
              <input
                data-smoke="appraisals-version-blank"
                type="radio"
                name="appraisal-version-mode"
                checked={mode === 'BLANK_SLATE'}
                onChange={() => setMode('BLANK_SLATE')}
                className="mt-1"
              />
              <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <span className="block font-semibold">Start with a blank slate</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Creates the next revision with the selected version's identity and folder, but resets the appraisal data to the default template for that appraisal type.
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Version change summary</span>
          <textarea
            data-smoke="appraisals-version-summary"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            rows={4}
            placeholder="Briefly record why this version is being created and what will change."
            className={`${inputClass()} mt-1 min-h-[7rem] w-full resize-y`}
          />
        </label>

        {!canCreate && (
          <div className="rounded-app border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
            Restore the selected appraisal before creating a new live version.
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <button type="button" onClick={onClose} className="workspace-secondary-btn px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            data-smoke="appraisals-version-create"
            onClick={() => onCreate({ ...draft, baseAppraisalId: baseAppraisal.id, mode, summary })}
            disabled={!canCreate}
            className="workspace-primary-btn px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CopyPlus className="h-4 w-4" />
            Create version
          </button>
        </div>
      </div>
    </AppraisalSideDrawer>
  );
}

function NewAppraisalSetupDrawer({
  draft: initialDraft,
  appraisals,
  folders,
  aiSettings,
  showToast,
  onCreateFolder,
  onClose,
  onCreate,
}: {
  draft: NewAppraisalDraft;
  appraisals: DevelopmentAppraisal[];
  folders: WorkspaceFolder[];
  aiSettings: ReturnType<typeof useAppContext>['appSettings']['ai'];
  showToast: (options: { type: 'success' | 'error' | 'info'; message: string; duration?: number }) => void;
  onChange: (patch: Partial<NewAppraisalDraft>) => void;
  onCreateFolder: (name: string) => WorkspaceFolder | null;
  onClose: () => void;
  onCreate: (draft: NewAppraisalDraft) => void;
}) {
  const [draft, setDraft] = React.useState(initialDraft);
  const [landValueDraft, setLandValueDraft] = React.useState(sterlingInputValue(initialDraft.commercialLandValue));
  const [folderName, setFolderName] = React.useState('');
  const [isAssessingCommercialTemplate, setIsAssessingCommercialTemplate] = React.useState(false);
  const [isAssessingCommercialScope, setIsAssessingCommercialScope] = React.useState(false);
  const [isAssessingCommercialAssets, setIsAssessingCommercialAssets] = React.useState(false);
  const [isUploadingCommercialBrief, setIsUploadingCommercialBrief] = React.useState(false);
  const [commercialScopeQuestion, setCommercialScopeQuestion] = React.useState('');
  const [commercialScopeAnswer, setCommercialScopeAnswer] = React.useState('');
  const [commercialScopeAnswers, setCommercialScopeAnswers] = React.useState<GuidedCommercialSiteScopeAnswer[]>([]);
  const [commercialAssetQuestion, setCommercialAssetQuestion] = React.useState('');
  const [commercialAssetAnswer, setCommercialAssetAnswer] = React.useState('');
  const [commercialAssetAnswers, setCommercialAssetAnswers] = React.useState<GuidedCommercialSiteScopeAnswer[]>([]);
  React.useEffect(() => {
    setDraft(initialDraft);
    setLandValueDraft(sterlingInputValue(initialDraft.commercialLandValue));
    setFolderName('');
    setCommercialScopeQuestion('');
    setCommercialScopeAnswer('');
    setCommercialScopeAnswers([]);
    setCommercialAssetQuestion('');
    setCommercialAssetAnswer('');
    setCommercialAssetAnswers([]);
  }, [initialDraft]);
  const updateDraft = (patch: Partial<NewAppraisalDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };
  const createFromDraft = () => {
    onCreate({
      ...draft,
      commercialLandValue: draft.kind === 'COMMERCIAL' ? currencyInputNumber(landValueDraft) : draft.commercialLandValue,
    });
  };
  const referencePreview = buildNextAppraisalReference(appraisals, draft.appraisalDate);
  const selectedFolder = folders.find((folder) => folder.id === draft.appraisalFolderId) || null;
  const commercialSetupMode = draft.commercialSetupMode || 'EXISTING_TEMPLATE';
  const reviewedAssetArea = (draft.commercialAssetAssessment?.assets || [])
    .filter((asset) => asset.included)
    .reduce((total, asset) => total + Math.max(0, Number(asset.siteAllocationM2 || 0)), 0);
  const reviewedAssetAreaWithinSite = !draft.commercialAssetAssessment
    || reviewedAssetArea <= Math.max(0, Number(draft.commercialSiteAreaM2 || 0));
  const canCreate = draft.name.trim().length > 0 && (
    draft.kind !== 'COMMERCIAL'
    || commercialSetupMode === 'EXISTING_TEMPLATE'
    || (commercialSetupMode === 'PRELIMINARY' && Boolean(draft.commercialInitialAssessmentBrief))
    || (Boolean(draft.commercialAiScopeAssessed) && Boolean(draft.commercialAiTemplateAssessed) && Boolean(draft.commercialAiAssetsAssessed) && reviewedAssetAreaWithinSite)
  );
  const appraisalTypeLabel = draft.kind === 'HOUSE_BUILDING' ? 'House building' : 'Commercial';
  const commercialTemplateSector = draft.commercialTemplateSector || getCommercialTemplateSector(draft.commercialTemplateId);
  const commercialTemplatesForSector = getCommercialTemplatesBySector(commercialTemplateSector);
  const selectedCommercialTemplate = commercialTemplatesForSector.some((template) => template.id === draft.commercialTemplateId)
    ? getCommercialAppraisalTemplate(draft.commercialTemplateId)
    : commercialTemplatesForSector[0] || getCommercialAppraisalTemplate(draft.commercialTemplateId);
  const handleCreateFolder = () => {
    const folder = onCreateFolder(folderName);
    if (!folder) return;
    updateDraft({ appraisalFolderId: folder.id });
    setFolderName('');
  };
  const fallbackCommercialScopeQuestion = (answers: GuidedCommercialSiteScopeAnswer[]) => {
    const answered = new Set(answers.map((entry) => entry.question.trim().toLowerCase()));
    const candidates = [
      'What commercial use or mix of uses should the site accommodate?',
      'What level of customer activity, parking, servicing, access or drive-through provision is required?',
      'What building height, storey count, capacity or operational scale is envisaged?',
      'Are there any known drainage, access, planning, visibility, topography or other site constraints?',
    ];
    return candidates.find((candidate) => !answered.has(candidate.toLowerCase())) || candidates[candidates.length - 1];
  };
  const fallbackCommercialAssetQuestion = (answers: GuidedCommercialSiteScopeAnswer[]) => {
    const answered = new Set(answers.map((entry) => entry.question.trim().toLowerCase()));
    const candidates = [
      'Which proposed uses will be owner-operated, leased, concession-based or sold?',
      'What operating capacity, customer throughput or income basis is expected for each proposed use?',
      'Are there known operator terms, rents, charges, utilities requirements or servicing constraints?',
      'Which elements should be treated as shared site works rather than individual income-producing assets?',
    ];
    return candidates.find((candidate) => !answered.has(candidate.toLowerCase())) || candidates[candidates.length - 1];
  };
  const commercialBriefContext = () => draft.commercialInitialAssessmentBrief
    ? buildCommercialAssessmentEvidence([{
        ...draft.commercialInitialAssessmentBrief,
        notes: draft.commercialInitialAssessmentBriefNote?.trim() || draft.commercialInitialAssessmentBrief.notes || '',
      }])
    : undefined;
  const fallbackCommercialAssetAssessment = (): CommercialAssetAssessmentResult => ({
    needsClarification: false,
    question: '',
    summary: `${selectedCommercialTemplate.name} has been retained as a conservative single-asset starting point for review.`,
    proposedMeasures: {},
    siteWideCosts: [],
    assets: [{
      title: selectedCommercialTemplate.shortName,
      description: selectedCommercialTemplate.description,
      included: true,
      revenueModel: 'LEASE',
      siteAllocationM2: Number(defaultCommercialTemplateInputs(selectedCommercialTemplate).grossFloorAreaM2 || 0),
      annualIncome: 0,
      operatingCostPercent: 25,
      revenueGrowthPercent: 2,
      lifecycleCapexPercent: 1,
      exitYieldPercent: selectedCommercialTemplate.revenue.yieldPercent,
      sellingCostsPercent: 2,
      developmentCost: 0,
      costTitle: `${selectedCommercialTemplate.shortName} development allowance`,
      rationale: selectedCommercialTemplate.revenue.notes,
      excludedReason: '',
    }],
  });
  const assessCommercialSiteScope = async () => {
    const brief = draft.commercialAiBrief?.trim();
    const siteAreaM2 = Math.max(0, Number(draft.commercialSiteAreaM2 || 0));
    if (!brief) {
      showToast({ type: 'info', message: 'Describe the proposed commercial development before asking AI to assess the site scope.' });
      return;
    }
    if (!siteAreaM2) {
      showToast({ type: 'info', message: 'Enter the whole site area before asking AI to assess what could fit.' });
      return;
    }
    if (commercialScopeQuestion && !commercialScopeAnswer.trim()) {
      showToast({ type: 'info', message: 'Answer the current AI scope question before continuing.' });
      return;
    }
    const nextAnswers = commercialScopeQuestion
      ? [...commercialScopeAnswers, { question: commercialScopeQuestion, answer: commercialScopeAnswer.trim() }]
      : commercialScopeAnswers;
    setIsAssessingCommercialScope(true);
    try {
      const result = await generateCommercialSiteScopeGuidanceStep({
        brief,
        location: draft.commercialLocation?.trim() || '',
        siteAreaM2,
        previousAnswers: nextAnswers,
        assessmentBrief: commercialBriefContext(),
      }, aiSettings);
      if (result.ok === false) {
        setCommercialScopeAnswers(nextAnswers);
        setCommercialScopeAnswer('');
        setCommercialScopeQuestion(fallbackCommercialScopeQuestion(nextAnswers));
        showToast({ type: 'info', message: 'AI was unavailable, so a focused site-scope question has been prepared for you to continue.' });
        return;
      }
      setCommercialScopeAnswers(nextAnswers);
      setCommercialScopeAnswer('');
      if (result.data.needsClarification) {
        setCommercialScopeQuestion(result.data.question || fallbackCommercialScopeQuestion(nextAnswers));
        showToast({ type: 'info', message: 'AI needs one more site-scope detail.' });
        return;
      }
      setCommercialScopeQuestion('');
      updateDraft({
        commercialAiScopeSummary: result.data.summary,
        commercialAiScopeAssessed: true,
        commercialAiTemplateAssessed: false,
        commercialAiSummary: '',
        commercialAssetAssessment: undefined,
        commercialAiAssetsAssessed: false,
      });
      showToast({ type: 'success', message: 'Commercial site scope assessed. You can now set the type and template.' });
    } catch (error) {
      console.error('Commercial site scope assessment error', error);
      setCommercialScopeAnswers(nextAnswers);
      setCommercialScopeAnswer('');
      setCommercialScopeQuestion(fallbackCommercialScopeQuestion(nextAnswers));
      showToast({ type: 'info', message: 'AI could not complete that step. Continue with the focused site-scope question shown.' });
    } finally {
      setIsAssessingCommercialScope(false);
    }
  };
  const resetCommercialSiteScope = () => {
    setCommercialScopeAnswers([]);
    setCommercialScopeQuestion('');
    setCommercialScopeAnswer('');
    updateDraft({ commercialAiScopeSummary: '', commercialAiScopeAssessed: false, commercialAiTemplateAssessed: false, commercialAiSummary: '', commercialAssetAssessment: undefined, commercialAiAssetsAssessed: false });
  };
  const fallbackCommercialTemplate = (brief: string) => {
    const words = brief.toLowerCase();
    return COMMERCIAL_APPRAISAL_TEMPLATES.find((template) => {
      const matchText = `${template.name} ${template.sector} ${template.description}`.toLowerCase();
      return ['drive-through', 'drive thru', 'restaurant', 'hotel', 'travelodge', 'premier inn'].some((keyword) => words.includes(keyword) && matchText.includes(keyword === 'drive thru' ? 'drive-through' : keyword));
    }) || COMMERCIAL_APPRAISAL_TEMPLATES[0];
  };
  const assessCommercialTemplate = async () => {
    const brief = draft.commercialAiBrief?.trim();
    if (!brief) {
      showToast({ type: 'info', message: 'Describe the proposed commercial development before asking AI to select a template.' });
      return;
    }
    if (!draft.commercialAiScopeAssessed || !draft.commercialAiScopeSummary) {
      showToast({ type: 'info', message: 'Assess the site scope first, using the entered site area as the fixed limit.' });
      return;
    }
    setIsAssessingCommercialTemplate(true);
    try {
      const result = await generateCommercialTemplateRecommendation({
        brief,
        location: draft.commercialLocation?.trim() || '',
        siteAreaM2: draft.commercialSiteAreaM2 || 0,
        siteScope: draft.commercialAiScopeSummary,
        assessmentBrief: commercialBriefContext(),
        templates: COMMERCIAL_APPRAISAL_TEMPLATES.map((template) => ({
          id: template.id,
          sector: template.sector,
          name: template.name,
          description: template.description,
          measures: template.measures.map((measure) => measure.label),
        })),
      }, aiSettings);
      if (result.ok === false) {
        const fallback = fallbackCommercialTemplate(brief);
        updateDraft({
          commercialTemplateSector: fallback.sector,
          commercialTemplateId: fallback.id,
          commercialAiSummary: `AI was unavailable. ${fallback.name} has been selected as a reviewable starting template from the proposed scope.`,
          commercialAiTemplateAssessed: true,
          commercialAssetAssessment: undefined,
          commercialAiAssetsAssessed: false,
        });
        showToast({ type: 'info', message: 'AI template selection was unavailable; a closest starting template has been selected for review.' });
        return;
      }
      const template = getCommercialAppraisalTemplate(result.data.templateId);
      updateDraft({
        commercialTemplateSector: template.sector,
        commercialTemplateId: template.id,
        commercialAiSummary: result.data.summary,
        commercialAiTemplateAssessed: true,
        commercialAssetAssessment: undefined,
        commercialAiAssetsAssessed: false,
      });
      showToast({ type: 'success', message: `${template.name} selected from the commercial brief.` });
    } finally {
      setIsAssessingCommercialTemplate(false);
    }
  };
  const assessCommercialAssets = async () => {
    if (!draft.commercialAiScopeAssessed || !draft.commercialAiTemplateAssessed) {
      showToast({ type: 'info', message: 'Assess the site scope and set a commercial template before preparing the asset mix.' });
      return;
    }
    if (commercialAssetQuestion && !commercialAssetAnswer.trim()) {
      showToast({ type: 'info', message: 'Answer the current commercial asset question before continuing.' });
      return;
    }
    const nextAnswers = commercialAssetQuestion
      ? [...commercialAssetAnswers, { question: commercialAssetQuestion, answer: commercialAssetAnswer.trim() }]
      : commercialAssetAnswers;
    setIsAssessingCommercialAssets(true);
    try {
      const assessmentBriefFile = await dataUrlToGeminiFile(draft.commercialInitialAssessmentBrief);
      const result = await generateCommercialAssetAssessment({
        location: draft.commercialLocation?.trim() || '',
        siteAreaM2: draft.commercialSiteAreaM2 || 0,
        proposal: draft.commercialAiBrief?.trim() || '',
        siteScope: draft.commercialAiScopeSummary || '',
        template: {
          id: selectedCommercialTemplate.id,
          name: selectedCommercialTemplate.name,
          description: selectedCommercialTemplate.description,
          measures: selectedCommercialTemplate.measures.map((measure) => ({ key: measure.key, label: measure.label, unit: measure.unit })),
        },
        assessmentBrief: commercialBriefContext(),
        previousAnswers: nextAnswers,
      }, aiSettings, assessmentBriefFile ? [assessmentBriefFile] : []);
      setCommercialAssetAnswers(nextAnswers);
      setCommercialAssetAnswer('');
      if (result.ok === false) {
        setCommercialAssetQuestion('');
        updateDraft({ commercialAssetAssessment: fallbackCommercialAssetAssessment(), commercialAiAssetsAssessed: true });
        showToast({ type: 'info', message: 'A conservative asset schedule has been prepared for review from the selected template.' });
        return;
      }
      if (result.data.needsClarification) {
        setCommercialAssetQuestion(result.data.question || fallbackCommercialAssetQuestion(nextAnswers));
        showToast({ type: 'info', message: 'One more commercial asset detail is needed.' });
        return;
      }
      setCommercialAssetQuestion('');
      updateDraft({ commercialAssetAssessment: result.data, commercialAiAssetsAssessed: true });
      showToast({ type: 'success', message: 'Commercial asset mix prepared for review.' });
    } catch (error) {
      console.error('Commercial asset assessment error', error);
      setCommercialAssetAnswers(nextAnswers);
      setCommercialAssetAnswer('');
      setCommercialAssetQuestion('');
      updateDraft({ commercialAssetAssessment: fallbackCommercialAssetAssessment(), commercialAiAssetsAssessed: true });
      showToast({ type: 'info', message: 'A conservative asset schedule has been prepared for review from the selected template.' });
    } finally {
      setIsAssessingCommercialAssets(false);
    }
  };
  const handleCommercialBriefUpload = async (file: File | undefined) => {
    if (!file) return;
    setIsUploadingCommercialBrief(true);
    try {
      const report = await buildAppraisalPricingReportFromFile(file);
      updateDraft({ commercialInitialAssessmentBrief: report, commercialAiScopeAssessed: false, commercialAiTemplateAssessed: false, commercialAiAssetsAssessed: false, commercialAssetAssessment: undefined });
      showToast({ type: report.extractionStatus === 'EXTRACTED' ? 'success' : 'info', message: report.extractionStatus === 'EXTRACTED' ? 'Initial assessment brief added.' : 'Brief saved; its text may need review before the assessment.' });
    } catch (error) {
      console.error('Commercial brief upload error', error);
      showToast({ type: 'error', message: 'The initial assessment brief could not be added.' });
    } finally {
      setIsUploadingCommercialBrief(false);
    }
  };
  const updateCommercialAssetDraft = (index: number, patch: Partial<CommercialAssetAssessmentResult['assets'][number]>) => {
    const current = draft.commercialAssetAssessment;
    if (!current) return;
    updateDraft({
      commercialAssetAssessment: {
        ...current,
        assets: current.assets.map((asset, assetIndex) => assetIndex === index ? { ...asset, ...patch } : asset),
      },
    });
  };
  const updateCommercialSiteCostDraft = (index: number, patch: Partial<CommercialAssetAssessmentResult['siteWideCosts'][number]>) => {
    const current = draft.commercialAssetAssessment;
    if (!current) return;
    updateDraft({
      commercialAssetAssessment: {
        ...current,
        siteWideCosts: current.siteWideCosts.map((cost, costIndex) => costIndex === index ? { ...cost, ...patch } : cost),
      },
    });
  };

  return (
    <AppraisalSideDrawer
      title={`New ${draft.kind === 'HOUSE_BUILDING' ? 'house building' : 'commercial'} appraisal`}
      subtitle="Set up the appraisal identity before creating the saved draft."
      smokeId="appraisals-new-setup-drawer"
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="rounded-app border border-primary-100 bg-primary-50/70 p-4 text-sm dark:border-primary-900/60 dark:bg-primary-950/20">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-700 dark:text-primary-200">Reference preview</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-950 dark:text-slate-50">{referencePreview}</div>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {appraisalTypeLabel} appraisal - {draft.appraisalDate || 'No date selected'} - {selectedFolder?.name || 'Unfiled appraisals'}
          </p>
        </div>

        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Appraisal name</span>
          <input
            data-smoke="appraisals-new-name"
            value={draft.name}
            onChange={(event) => updateDraft({ name: event.target.value })}
            placeholder="e.g. Sauchie Phases 5 to 9 CTC appraisal"
            className={`${inputClass()} mt-1 w-full`}
            autoFocus
          />
          {!draft.name.trim() && (
            <span className="mt-1 block text-[11px] font-medium text-amber-700 dark:text-amber-300">Name is required before the appraisal is created.</span>
          )}
        </label>

        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Appraisal date</span>
          <input
            data-smoke="appraisals-new-date"
            type="date"
            value={draft.appraisalDate}
            onChange={(event) => updateDraft({ appraisalDate: event.target.value })}
            className={`${inputClass()} mt-1 w-full`}
          />
        </label>

        {draft.kind === 'COMMERCIAL' && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Location</span>
              <input
                data-smoke="appraisals-new-commercial-location"
                value={draft.commercialLocation || ''}
                onChange={(event) => updateDraft({ commercialLocation: event.target.value })}
                placeholder="e.g. Inverness city centre, IV1"
                className={`${inputClass()} mt-1 w-full`}
              />
              <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">
                Used by the revenue assessment.
              </span>
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Land value</span>
              <input
                data-smoke="appraisals-new-commercial-land-value"
                type="text"
                inputMode="decimal"
                value={landValueDraft}
                onChange={(event) => setLandValueDraft(event.target.value)}
                onBlur={(event) => setLandValueDraft(sterlingInputValue(currencyInputNumber(event.currentTarget.value)))}
                placeholder="£0"
                className={`${inputClass('text-right tabular-nums')} mt-1 w-full`}
              />
              <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">
                Land is an entered lifecycle cost.
              </span>
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Whole site area</span>
              <input
                data-smoke="appraisals-new-commercial-site-area"
                type="number"
                min="0"
                value={draft.commercialSiteAreaM2 || ''}
                onChange={(event) => updateDraft({
                  commercialSiteAreaM2: Math.max(0, numberValue(event.target.value)),
                  commercialAiScopeSummary: '',
                  commercialAiScopeAssessed: false,
                  commercialAiTemplateAssessed: false,
                  commercialAiSummary: '',
                })}
                placeholder="m2"
                className={`${inputClass('text-right tabular-nums')} mt-1 w-full`}
              />
              <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">
                Required for AI site-scope assessment. This is a fixed boundary.
              </span>
            </label>
          </div>
        )}

        {draft.kind === 'HOUSE_BUILDING' ? (
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Cost pack</span>
            <select
              data-smoke="appraisals-new-cost-pack"
              value={draft.costPackId}
              onChange={(event) => updateDraft({ costPackId: event.target.value as AppraisalCostPackId })}
              className={`${inputClass()} mt-1 w-full`}
            >
              {costPackOptions.map((pack) => (
                <option key={pack.id} value={pack.id}>{pack.label}</option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">
              {costPackOptions.find((pack) => pack.id === draft.costPackId)?.detail}
            </span>
          </label>
        ) : (
          <fieldset className="rounded-app border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-surface-950/40">
            <legend className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Commercial setup</legend>
            <div className="inline-flex rounded-app-sm border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-surface-900">
              <button
                type="button"
                onClick={() => updateDraft({ commercialSetupMode: 'PRELIMINARY' })}
                className={`rounded-app-sm px-3 py-1.5 text-xs font-semibold transition ${commercialSetupMode === 'PRELIMINARY' ? 'bg-amber-600 text-white dark:bg-amber-400 dark:text-slate-950' : 'text-slate-600 dark:text-slate-300'}`}
              >
                Preliminary assessment
              </button>
              <button
                type="button"
                onClick={() => updateDraft({ commercialSetupMode: 'EXISTING_TEMPLATE' })}
                className={`rounded-app-sm px-3 py-1.5 text-xs font-semibold transition ${commercialSetupMode === 'EXISTING_TEMPLATE' ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-600 dark:text-slate-300'}`}
              >
                Existing templates
              </button>
              <button
                type="button"
                onClick={() => updateDraft({ commercialSetupMode: 'AI_PROMPT', commercialAiScopeAssessed: false, commercialAiScopeSummary: '', commercialAiTemplateAssessed: false, commercialAiSummary: '' })}
                className={`rounded-app-sm px-3 py-1.5 text-xs font-semibold transition ${commercialSetupMode === 'AI_PROMPT' ? 'bg-primary-600 text-white dark:bg-primary-400 dark:text-slate-950' : 'text-slate-600 dark:text-slate-300'}`}
              >
                <span className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> AI setup</span>
              </button>
            </div>

            {commercialSetupMode === 'PRELIMINARY' ? (
              <section className="mt-3 rounded-app-sm border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900 dark:bg-amber-950/20">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-800 dark:text-amber-200">Preliminary assessment evidence</div>
                    <p className="mt-1 max-w-xl text-xs leading-5 text-slate-600 dark:text-slate-300">Upload the initial assessment PDF before any cost, income or lifecycle calculations are started. The appraisal will remain at this evidence-led stage until you progress it into detailed assessment.</p>
                  </div>
                  <label className="workspace-secondary-btn cursor-pointer px-3 py-2 text-xs">
                    <FileUp className="h-4 w-4" />
                    {isUploadingCommercialBrief ? 'Adding...' : 'Upload PDF'}
                    <input type="file" accept=".pdf,application/pdf" className="sr-only" disabled={isUploadingCommercialBrief} onChange={(event) => { void handleCommercialBriefUpload(event.target.files?.[0]); event.currentTarget.value = ''; }} />
                  </label>
                </div>
                {draft.commercialInitialAssessmentBrief ? (
                  <div className="mt-3 rounded-app-sm border border-amber-200 bg-white/80 px-3 py-2 dark:border-amber-900 dark:bg-surface-950/50">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{draft.commercialInitialAssessmentBrief.fileName}</span>
                      <button type="button" onClick={() => updateDraft({ commercialInitialAssessmentBrief: undefined, commercialInitialAssessmentBriefNote: '' })} className="text-rose-700 hover:underline dark:text-rose-300">Remove</button>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{draft.commercialInitialAssessmentBrief.extractionStatus === 'EXTRACTED' ? 'Readable content is available for the preliminary report.' : 'The original PDF is saved; its readable text could not be extracted reliably.'}</p>
                    <label className="mt-2 block">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Assessment note</span>
                      <input value={draft.commercialInitialAssessmentBriefNote || ''} onChange={(event) => updateDraft({ commercialInitialAssessmentBriefNote: event.target.value })} placeholder="Optional context or information still required" className={`${inputClass()} mt-1 w-full`} />
                    </label>
                  </div>
                ) : (
                  <p className="mt-3 text-[11px] font-medium text-amber-800 dark:text-amber-200">A preliminary assessment PDF is required before this stage can be created.</p>
                )}
              </section>
            ) : commercialSetupMode === 'EXISTING_TEMPLATE' ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Commercial type</span>
                  <select
                    data-smoke="appraisals-new-commercial-type"
                    value={commercialTemplateSector}
                    onChange={(event) => {
                      const nextTemplates = getCommercialTemplatesBySector(event.target.value);
                      updateDraft({ commercialTemplateSector: event.target.value, commercialTemplateId: nextTemplates[0]?.id });
                    }}
                    className={`${inputClass()} mt-1 w-full`}
                  >
                    {getCommercialTemplateSectors().map((sector) => (
                      <option key={sector} value={sector}>{sector}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Template</span>
                  <select
                    data-smoke="appraisals-new-commercial-template"
                    value={selectedCommercialTemplate.id}
                    onChange={(event) => updateDraft({ commercialTemplateSector: getCommercialTemplateSector(event.target.value), commercialTemplateId: event.target.value })}
                    className={`${inputClass()} mt-1 w-full`}
                  >
                    {commercialTemplatesForSector.map((template) => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </select>
                  <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">{selectedCommercialTemplate.description}</span>
                </label>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Commercial proposal</span>
                  <textarea
                    data-smoke="appraisals-new-commercial-ai-brief"
                    value={draft.commercialAiBrief || ''}
                    onChange={(event) => updateDraft({
                      commercialAiBrief: event.target.value,
                      commercialAiScopeSummary: '',
                      commercialAiScopeAssessed: false,
                      commercialAiTemplateAssessed: false,
                      commercialAiSummary: '',
                      commercialAssetAssessment: undefined,
                      commercialAiAssetsAssessed: false,
                    })}
                    placeholder="Describe the proposed use, brand/occupier if known, scale, accommodation, access, parking and any unusual requirements."
                    className={`${inputClass('min-h-[7rem]')} mt-1 w-full`}
                  />
                </label>
                <section className="rounded-app-sm border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-surface-900/70">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Initial assessment brief</div>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Add the initial commercial criteria, site information, accommodation schedule, or cost/revenue evidence. Supported: DOCX, PDF, XLSX/CSV and TXT.</p>
                    </div>
                    <label className="workspace-secondary-btn cursor-pointer px-3 py-2 text-xs">
                      <FileUp className="h-4 w-4" />
                      {isUploadingCommercialBrief ? 'Adding...' : 'Upload brief'}
                      <input type="file" accept=".docx,.pdf,.xlsx,.xls,.csv,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv" className="sr-only" disabled={isUploadingCommercialBrief} onChange={(event) => { void handleCommercialBriefUpload(event.target.files?.[0]); event.currentTarget.value = ''; }} />
                    </label>
                  </div>
                  {draft.commercialInitialAssessmentBrief && (
                    <div className="mt-3 rounded-app-sm border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-surface-950">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-100">{draft.commercialInitialAssessmentBrief.fileName}</span>
                        <button type="button" onClick={() => updateDraft({ commercialInitialAssessmentBrief: undefined, commercialInitialAssessmentBriefNote: '', commercialAiScopeAssessed: false, commercialAiTemplateAssessed: false, commercialAiAssetsAssessed: false, commercialAssetAssessment: undefined })} className="text-rose-700 hover:underline dark:text-rose-300">Remove</button>
                      </div>
                      <label className="mt-2 block">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Brief note</span>
                        <input value={draft.commercialInitialAssessmentBriefNote || ''} onChange={(event) => updateDraft({ commercialInitialAssessmentBriefNote: event.target.value })} placeholder="Optional context for this assessment brief" className={`${inputClass()} mt-1 w-full`} />
                      </label>
                    </div>
                  )}
                </section>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="max-w-xl text-[11px] leading-5 text-slate-500 dark:text-slate-400">First assess what the fixed site area can accommodate. AI then selects the closest commercial type and cost/revenue template from that assessed scope.</p>
                  <div className="flex flex-wrap gap-2">
                    {draft.commercialAiScopeAssessed && (
                      <button type="button" onClick={resetCommercialSiteScope} className="workspace-secondary-btn px-3 py-2 text-xs">
                        <RotateCcw className="h-4 w-4" />
                        Reset scope
                      </button>
                    )}
                    <button type="button" onClick={() => { void assessCommercialSiteScope(); }} disabled={isAssessingCommercialScope} className="workspace-secondary-btn px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60">
                      <Sparkles className="h-4 w-4" />
                      {isAssessingCommercialScope ? 'Assessing...' : commercialScopeQuestion ? 'Submit scope answer' : 'Assess site scope'}
                    </button>
                    <button type="button" onClick={assessCommercialTemplate} disabled={!draft.commercialAiScopeAssessed || isAssessingCommercialTemplate} className="workspace-primary-btn px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60">
                      <Sparkles className="h-4 w-4" />
                      {isAssessingCommercialTemplate ? 'Assessing...' : 'Set type with AI'}
                    </button>
                    <button type="button" onClick={() => { void assessCommercialAssets(); }} disabled={!draft.commercialAiTemplateAssessed || isAssessingCommercialAssets} className="workspace-primary-btn px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60">
                      <Sparkles className="h-4 w-4" />
                      {isAssessingCommercialAssets ? 'Assessing...' : commercialAssetQuestion ? 'Submit asset answer' : 'Assess asset mix'}
                    </button>
                  </div>
                </div>
                {commercialScopeQuestion && (
                  <div className="rounded-app-sm border border-sky-200 bg-sky-50/70 p-3 dark:border-sky-900 dark:bg-sky-950/20">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">AI site-scope question</div>
                    <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{commercialScopeQuestion}</p>
                    <textarea
                      value={commercialScopeAnswer}
                      onChange={(event) => setCommercialScopeAnswer(event.target.value)}
                      placeholder="Add the available site and commercial scope information..."
                      className={`${inputClass('min-h-[4.5rem]')} mt-2 w-full`}
                    />
                  </div>
                )}
                {draft.commercialAiScopeAssessed && draft.commercialAiScopeSummary && (
                  <div className="rounded-app-sm border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-950 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100">
                    <span className="font-semibold">Assessed site scope.</span> {draft.commercialAiScopeSummary}
                  </div>
                )}
                {draft.commercialAiTemplateAssessed ? (
                  <div className="rounded-app-sm border border-primary-200 bg-primary-50 px-3 py-2 text-xs text-primary-900 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-100">
                    <span className="font-semibold">Selected: {selectedCommercialTemplate.sector} - {selectedCommercialTemplate.name}.</span>{' '}
                    {draft.commercialAiSummary}
                  </div>
                ) : (
                  <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">Assess the site scope, then set the commercial type and template before creating this AI-led appraisal.</p>
                )}
                {commercialAssetQuestion && (
                  <div className="rounded-app-sm border border-violet-200 bg-violet-50/70 p-3 dark:border-violet-900 dark:bg-violet-950/20">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">Commercial asset question</div>
                    <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{commercialAssetQuestion}</p>
                    <textarea value={commercialAssetAnswer} onChange={(event) => setCommercialAssetAnswer(event.target.value)} placeholder="Add the commercial asset information..." className={`${inputClass('min-h-[4.5rem]')} mt-2 w-full`} />
                  </div>
                )}
                {draft.commercialAssetAssessment && (
                  <section className="overflow-hidden rounded-app-sm border border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/15">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 px-3 py-2 dark:border-emerald-900">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Asset mix for review</div>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{draft.commercialAssetAssessment.summary}</p>
                      </div>
                      <span className={`text-xs font-semibold ${reviewedAssetAreaWithinSite ? 'text-emerald-800 dark:text-emerald-200' : 'text-rose-700 dark:text-rose-300'}`}>{draft.commercialAssetAssessment.assets.filter((asset) => asset.included).length} included · {formatQuantity(reviewedAssetArea)} m2 of {formatQuantity(draft.commercialSiteAreaM2 || 0)} m2</span>
                    </div>
                    <div className="max-h-[28rem] overflow-auto p-3 space-y-3">
                      {draft.commercialAssetAssessment.assets.map((asset, index) => (
                        <div key={`${asset.title}-${index}`} className="rounded-app-sm border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-surface-900">
                          <div className="grid gap-2 sm:grid-cols-[auto_minmax(10rem,1.3fr)_0.7fr_0.8fr_0.8fr]">
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200"><input type="checkbox" checked={asset.included} onChange={(event) => updateCommercialAssetDraft(index, { included: event.target.checked })} /> Include</label>
                            <label><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Asset</span><input value={asset.title} onChange={(event) => updateCommercialAssetDraft(index, { title: event.target.value })} className={`${inputClass()} mt-1`} /></label>
                            <label><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Area m2</span><input type="number" min="0" value={asset.siteAllocationM2 || ''} onChange={(event) => updateCommercialAssetDraft(index, { siteAllocationM2: numberValue(event.target.value) })} className={`${inputClass('text-right')} mt-1`} /></label>
                            <label><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Income pa</span><input type="number" min="0" value={asset.annualIncome || ''} onChange={(event) => updateCommercialAssetDraft(index, { annualIncome: numberValue(event.target.value) })} className={`${inputClass('text-right')} mt-1`} /></label>
                            <label><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Cost</span><input type="number" min="0" value={asset.developmentCost || ''} onChange={(event) => updateCommercialAssetDraft(index, { developmentCost: numberValue(event.target.value) })} className={`${inputClass('text-right')} mt-1`} /></label>
                          </div>
                          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_0.55fr_0.55fr_0.55fr]">
                            <label><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Revenue model</span><select value={asset.revenueModel} onChange={(event) => updateCommercialAssetDraft(index, { revenueModel: event.target.value as typeof asset.revenueModel })} className={`${inputClass()} mt-1`}><option value="LEASE">Lease</option><option value="OWNER_OPERATED">Owner operated</option><option value="CONCESSION">Concession</option><option value="SALE">Sale</option><option value="OTHER">Other</option></select></label>
                            <label><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Op cost %</span><input type="number" min="0" value={asset.operatingCostPercent || ''} onChange={(event) => updateCommercialAssetDraft(index, { operatingCostPercent: numberValue(event.target.value) })} className={`${inputClass('text-right')} mt-1`} /></label>
                            <label><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Capex %</span><input type="number" min="0" value={asset.lifecycleCapexPercent || ''} onChange={(event) => updateCommercialAssetDraft(index, { lifecycleCapexPercent: numberValue(event.target.value) })} className={`${inputClass('text-right')} mt-1`} /></label>
                            <label><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Exit yield %</span><input type="number" min="0" value={asset.exitYieldPercent || ''} onChange={(event) => updateCommercialAssetDraft(index, { exitYieldPercent: numberValue(event.target.value) })} className={`${inputClass('text-right')} mt-1`} /></label>
                          </div>
                          {(asset.rationale || asset.excludedReason) && <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{asset.included ? asset.rationale : asset.excludedReason || asset.rationale}</p>}
                        </div>
                      ))}
                    </div>
                    {(draft.commercialAssetAssessment.siteWideCosts.length > 0 || Object.keys(draft.commercialAssetAssessment.proposedMeasures).length > 0) && (
                      <div className="border-t border-emerald-200 p-3 dark:border-emerald-900">
                        {Object.keys(draft.commercialAssetAssessment.proposedMeasures).length > 0 && (
                          <div className="mb-3 rounded-app-sm border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-surface-900 dark:text-slate-300">
                            <span className="font-semibold text-slate-800 dark:text-slate-100">Template measures from the assessment:</span>{' '}
                            {Object.entries(draft.commercialAssetAssessment.proposedMeasures).map(([key, value]) => `${key}: ${formatQuantity(Number(value) || 0)}`).join(' · ')}
                          </div>
                        )}
                        {draft.commercialAssetAssessment.siteWideCosts.length > 0 && (
                          <div>
                            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Shared site costs for review</div>
                            <div className="space-y-2">
                              {draft.commercialAssetAssessment.siteWideCosts.map((cost, index) => (
                                <div key={`${cost.title}-${index}`} className="grid gap-2 rounded-app-sm border border-slate-200 bg-white p-2 sm:grid-cols-[1.25fr_0.9fr_0.6fr] dark:border-slate-800 dark:bg-surface-900">
                                  <label><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Cost</span><input value={cost.title} onChange={(event) => updateCommercialSiteCostDraft(index, { title: event.target.value })} className={`${inputClass()} mt-1`} /></label>
                                  <label><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Category</span><select value={cost.category} onChange={(event) => updateCommercialSiteCostDraft(index, { category: event.target.value as AppraisalCostCategory })} className={`${inputClass()} mt-1`}>{Object.entries(APPRAISAL_COST_CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
                                  <label><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Allowance</span><input type="number" min="0" value={cost.amount || ''} onChange={(event) => updateCommercialSiteCostDraft(index, { amount: numberValue(event.target.value) })} className={`${inputClass('text-right')} mt-1`} /></label>
                                  {cost.notes && <p className="sm:col-span-3 text-xs leading-5 text-slate-600 dark:text-slate-300">{cost.notes}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {!reviewedAssetAreaWithinSite && <div className="border-t border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950/25 dark:text-rose-200">Included asset allocations exceed the fixed site area. Amend the review before creating the appraisal.</div>}
                  </section>
                )}
              </div>
            )}
          </fieldset>
        )}

        {draft.kind === 'HOUSE_BUILDING' && (
        <fieldset>
          <legend className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Calculation basis</legend>
          <div className="mt-2 grid gap-2">
            {setupCalculationModes.map((mode) => (
              <label
                key={mode.id}
                className={`flex cursor-pointer gap-3 rounded-app border p-3 text-sm transition ${
                  draft.calculationMode === mode.id
                    ? 'border-primary-200 bg-primary-50 text-primary-900 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-100'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-primary-200 dark:border-slate-800 dark:bg-surface-900 dark:text-slate-200'
                }`}
              >
                <input
                  data-smoke={`appraisals-new-calculation-${mode.id}`}
                  type="radio"
                  name="appraisal-calculation-mode"
                  value={mode.id}
                  checked={draft.calculationMode === mode.id}
                  onChange={() => updateDraft({ calculationMode: mode.id })}
                  className="mt-1"
                />
                <span>
                  <span className="block font-semibold">{mode.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                    {draft.kind === 'COMMERCIAL'
                      ? mode.id === 'RESIDUAL_LAND_VALUE'
                        ? 'Solve the residual land value after commercial template costs, finance, and target return against sale/rental value.'
                        : 'Enter land cost and review project profit against sale/rental value.'
                      : mode.detail}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        )}

        {draft.kind === 'HOUSE_BUILDING' && draft.calculationMode === 'RESIDUAL_LAND_VALUE' && (
          <section className="rounded-app border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-surface-900">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Land price target
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[0.7fr_1.3fr]">
              <label>
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Target %
                </span>
                <input
                  data-smoke="appraisals-new-residual-target"
                  type="number"
                  value={draft.residualTargetPercent ? String(draft.residualTargetPercent) : ''}
                  onChange={(event) => updateDraft({ residualTargetPercent: numberValue(event.target.value) })}
                  className={`${inputClass('text-right')} mt-1 w-full`}
                />
              </label>
              {draft.kind === 'HOUSE_BUILDING' && (
              <fieldset>
                <legend className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Target includes</legend>
                <div className="mt-1 grid gap-2 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-start gap-2 rounded-app-sm border border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
                    <input
                      type="radio"
                      name="residual-target-basis"
                      checked={draft.residualTargetBasis === 'OVERHEAD_AND_PROFIT'}
                      onChange={() => updateDraft({ residualTargetBasis: 'OVERHEAD_AND_PROFIT' })}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block font-semibold text-slate-900 dark:text-slate-100">Overhead and profit</span>
                      <span className="mt-0.5 block text-slate-500 dark:text-slate-400">Profit target saved as target less {HOUSE_BUILDING_OVERHEAD_PERCENT}% overheads.</span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 rounded-app-sm border border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
                    <input
                      type="radio"
                      name="residual-target-basis"
                      checked={draft.residualTargetBasis === 'PROFIT_ONLY'}
                      onChange={() => updateDraft({ residualTargetBasis: 'PROFIT_ONLY' })}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block font-semibold text-slate-900 dark:text-slate-100">Profit only</span>
                      <span className="mt-0.5 block text-slate-500 dark:text-slate-400">Profit target saved exactly as entered.</span>
                    </span>
                  </label>
                </div>
              </fieldset>
              )}
            </div>
          </section>
        )}

        {draft.kind === 'HOUSE_BUILDING' && (
          <label className="flex cursor-pointer items-start gap-3 rounded-app border border-slate-200 bg-white p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-surface-900 dark:text-slate-200">
            <input
              type="checkbox"
              checked={draft.salesIndexationEnabled}
              onChange={(event) => updateDraft({ salesIndexationEnabled: event.target.checked })}
              className="mt-1"
            />
              <span>
                <span className="block font-semibold">Apply sales price indexation to GDV</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                Adds a separate GDV uplift line from now to site commencement. Set the commencement date, then use AI in Appraisal details for a location-specific assessment and saved report.
                </span>
              </span>
            </label>
        )}

        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Folder</span>
          <select
            data-smoke="appraisals-new-folder"
            value={draft.appraisalFolderId}
            onChange={(event) => updateDraft({ appraisalFolderId: event.target.value })}
            className={`${inputClass()} mt-1 w-full`}
          >
            <option value="">Unfiled appraisals</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>{folder.name}</option>
            ))}
          </select>
        </label>

        <div className="rounded-app border border-slate-200 p-3 dark:border-slate-800">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Create folder</span>
          <div className="mt-2 flex gap-2">
            <input
              data-smoke="appraisals-new-folder-name"
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleCreateFolder();
              }}
              placeholder="Customer / site folder"
              className={`${inputClass()} min-w-0 flex-1`}
            />
            <button
              type="button"
              data-smoke="appraisals-new-folder-create"
              onClick={handleCreateFolder}
              disabled={!folderName.trim()}
              className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>

        <div className="rounded-app border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-surface-900 dark:text-slate-300">
          <div className="font-semibold text-slate-900 dark:text-slate-100">{draft.name.trim() || 'Untitled appraisal'}</div>
          <div className="mt-1 flex flex-wrap gap-2">
            <span>{referencePreview}</span>
            <span>{appraisalTypeLabel}</span>
            <span>{draft.kind === 'HOUSE_BUILDING' ? costPackOptions.find((pack) => pack.id === draft.costPackId)?.label : selectedCommercialTemplate.shortName}</span>
            <span>{draft.kind === 'COMMERCIAL' ? 'Lifecycle cost / revenue' : setupCalculationModes.find((mode) => mode.id === draft.calculationMode)?.label}</span>
            <span>{selectedFolder?.name || 'Unfiled appraisals'}</span>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <button type="button" data-smoke="appraisals-new-cancel" onClick={onClose} className="workspace-secondary-btn px-3 py-2 text-xs">
            Cancel
          </button>
          <button
            type="button"
            data-smoke="appraisals-new-create"
            onClick={createFromDraft}
            disabled={!canCreate}
            className="workspace-primary-btn px-3 py-2 text-xs disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Create appraisal
          </button>
        </div>
      </div>
    </AppraisalSideDrawer>
  );
}

function SalesIndexationControl({
  appraisal,
  option,
  updateOption,
}: {
  appraisal: DevelopmentAppraisal;
  option: DevelopmentAppraisalOption;
  updateOption: (optionId: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const { appSettings } = useAppContext();
  const { showToast } = useToast();
  const [isAssessing, setIsAssessing] = React.useState(false);
  const [percentDraft, setPercentDraft] = React.useState(String(option.salesIndexationPercent || ''));
  React.useEffect(() => {
    setPercentDraft(String(option.salesIndexationPercent || ''));
  }, [option.id, option.salesIndexationPercent]);
  const baseGdv = React.useMemo(() => calculateOptionBaseGdv(option), [option]);
  const indexableSalesGdv = Math.max(0, baseGdv - Math.max(0, option.customGdvAdditionAmount || 0));
  const uplift = React.useMemo(() => calculateSalesIndexationUplift(option, baseGdv), [baseGdv, option]);
  const updateSalesIndexation = (patch: Partial<DevelopmentAppraisalOption>) => {
    updateOption(option.id, (current) => ({ ...current, ...patch }));
  };
  const commitPercent = (value: string) => {
    const percent = Math.max(0, numberValue(value));
    setPercentDraft(percent ? String(percent) : '');
    updateSalesIndexation({ salesIndexationPercent: percent });
  };
  const assessWithAi = async () => {
    const expectedStartDate = option.programme?.expectedStartDate || option.startDate || '';
    if (!expectedStartDate) {
      showToast({ type: 'info', message: 'Enter an expected commencement date in Programme before assessing sales indexation.' });
      return;
    }
    setIsAssessing(true);
    try {
      const result = await generateSalesIndexationAssessment({
        today: localDateString(),
        appraisalDate: appraisal.appraisalDate || localDateString(),
        expectedStartDate,
        appraisalName: appraisal.name,
        appraisalReference: appraisal.reference || '',
        client: appraisal.client || '',
        explicitSiteLocation: appraisal.site || '',
        locationClues: [appraisal.site, appraisal.name, appraisal.reference, option.housePricesComment]
          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0),
        optionName: option.name,
        baseGdv: indexableSalesGdv,
        housePricesComment: option.housePricesComment || '',
        assumptions: option.assumptions || '',
      }, appSettings.ai);
      if (result.ok) {
        const percent = Math.max(0, Number(result.data.percent) || 0);
        const roundedPercent = Number(percent.toFixed(2));
        setPercentDraft(roundedPercent ? String(roundedPercent) : '');
        updateSalesIndexation({
          salesIndexationEnabled: true,
          salesIndexationPercent: roundedPercent,
          salesIndexationNarrative: result.data.summary || '',
          salesIndexationAssessedAt: new Date().toISOString(),
        });
        showToast({ type: 'success', message: `Sales indexation assessed at ${roundedPercent.toFixed(2)}%.` });
      } else if (result.ok === false) {
        showToast({ type: 'error', message: result.error || 'Sales indexation assessment failed.' });
      }
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Sales indexation assessment failed.' });
    } finally {
      setIsAssessing(false);
    }
  };

  return (
    <section className="rounded-app border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-surface-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={option.salesIndexationEnabled === true}
            onChange={(event) => updateSalesIndexation({ salesIndexationEnabled: event.target.checked })}
            className="mt-1"
          />
          <span>
            <span className="block font-semibold">Apply sales price indexation to GDV</span>
            <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">
              Adds a separate uplift from now to expected site commencement.
            </span>
          </span>
        </label>
        <button
          type="button"
          onClick={() => { void assessWithAi(); }}
          disabled={isAssessing}
          className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          {isAssessing ? 'Assessing...' : 'Assess with AI'}
        </button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Index uplift %</span>
          <input
            type="number"
            value={percentDraft}
            onChange={(event) => setPercentDraft(event.target.value)}
            onBlur={(event) => commitPercent(event.currentTarget.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
            className={`${inputClass('text-right')} mt-1`}
          />
        </label>
        <MetricTile label="Indexable sales GDV" value={money(indexableSalesGdv)} />
        <MetricTile label={salesIndexUpliftLabel(option)} value={money(uplift)} tone={uplift > 0 ? 'good' : 'default'} />
      </div>
      {option.salesIndexationNarrative ? (
        <div className="mt-3 rounded-app border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-surface-950">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Saved assessment report</span>
            {option.salesIndexationAssessedAt ? (
              <span className="text-[10px] text-slate-400">
                {new Date(option.salesIndexationAssessedAt).toLocaleString()}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
            {option.salesIndexationNarrative}
          </p>
        </div>
      ) : null}
    </section>
  );
}

function AppraisalDetailsDrawer({
  appraisal,
  activeOption,
  folders,
  onClose,
  updateAppraisal,
  updateSiteStatus,
  updateOption,
  onAssignFolder,
  onArchive,
  onDelete,
}: {
  appraisal: DevelopmentAppraisal;
  activeOption: DevelopmentAppraisalOption | null;
  folders: WorkspaceFolder[];
  onClose: () => void;
  updateAppraisal: (appraisalId: string, recipe: (appraisal: DevelopmentAppraisal) => DevelopmentAppraisal) => void;
  updateSiteStatus: (appraisalId: string, status: AppraisalSiteStatus) => void;
  updateOption: (optionId: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
  onAssignFolder: (appraisalId: string, folderId: string) => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const isReadOnly = Boolean(appraisal.frozenAt || appraisal.unviableMarkedAt);
  const [draft, setDraft] = React.useState({
    name: appraisal.name,
    reference: appraisal.reference || '',
    appraisalDate: appraisal.appraisalDate || '',
  });
  React.useEffect(() => {
    setDraft({
      name: appraisal.name,
      reference: appraisal.reference || '',
      appraisalDate: appraisal.appraisalDate || '',
    });
  }, [appraisal.id]);
  const commitDraft = (patch: Partial<DevelopmentAppraisal>) => {
    updateAppraisal(appraisal.id, (current) => ({ ...current, ...patch }));
  };
  return (
    <AppraisalSideDrawer
      title="Appraisal details"
      subtitle={isReadOnly ? 'View this appraisal’s saved details. Change its folder from the Register.' : 'Edit record details, folder allocation, and status without crowding the workflow.'}
      smokeId="appraisals-details-drawer"
      onClose={onClose}
    >
      <fieldset disabled={isReadOnly} className="space-y-4 border-0 p-0">
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Appraisal name</span>
          <input
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            onBlur={(event) => commitDraft({ name: event.currentTarget.value })}
            onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
            className={`${inputClass()} mt-1`}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Workflow status</span>
            <select
              value={appraisal.status}
              onChange={(event) => updateAppraisal(appraisal.id, (current) => ({
                ...current,
                status: event.target.value as AppraisalStatus,
                archivedAt: event.target.value === 'ARCHIVED' ? new Date().toISOString() : undefined,
              }))}
              className={`${inputClass()} mt-1`}
            >
              {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Reference</span>
            <input
              value={draft.reference}
              onChange={(event) => setDraft((current) => ({ ...current, reference: event.target.value }))}
              onBlur={(event) => commitDraft({ reference: event.currentTarget.value })}
              onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
              className={`${inputClass()} mt-1`}
            />
          </label>
        </div>
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Site status</span>
          <select
            value={appraisal.siteStatus || 'NOT_APPRAISED'}
            onChange={(event) => updateSiteStatus(appraisal.id, event.target.value as AppraisalSiteStatus)}
            className={`${inputClass()} mt-1`}
          >
            {siteStatusOptions.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Appraisal date</span>
          <input
            type="date"
            value={draft.appraisalDate}
            onChange={(event) => {
              setDraft((current) => ({ ...current, appraisalDate: event.target.value }));
              commitDraft({ appraisalDate: event.target.value });
            }}
            className={`${inputClass()} mt-1`}
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Folder</span>
          <select
            value={appraisal.appraisalFolderId || ''}
            onChange={(event) => onAssignFolder(appraisal.id, event.target.value)}
            className={`${inputClass()} mt-1`}
          >
            <option value="">Unfiled appraisals</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>{folder.name}</option>
            ))}
          </select>
        </label>
        {(appraisal.kind || 'HOUSE_BUILDING') === 'HOUSE_BUILDING' && activeOption ? (
          <SalesIndexationControl appraisal={appraisal} option={activeOption} updateOption={updateOption} />
        ) : null}
        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <button type="button" onClick={onArchive} className="workspace-secondary-btn px-3 py-2 text-xs">
            <Archive className="h-4 w-4" />
            {appraisal.status === 'ARCHIVED' ? 'Restore' : 'Archive'}
          </button>
          <button type="button" onClick={onDelete} className="workspace-secondary-btn px-3 py-2 text-xs text-rose-700 hover:text-rose-800 dark:text-rose-300 dark:hover:text-rose-200">
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </fieldset>
    </AppraisalSideDrawer>
  );
}

function AppraisalOptionsDrawer({
  appraisal,
  activeKind,
  activeOptionId,
  setActiveOptionId,
  updateAppraisal,
  updateOption,
  onAddOption,
  onClose,
}: {
  appraisal: DevelopmentAppraisal;
  activeKind: DevelopmentAppraisalKind;
  activeOptionId: string;
  setActiveOptionId: React.Dispatch<React.SetStateAction<string | null>>;
  updateAppraisal: (appraisalId: string, recipe: (appraisal: DevelopmentAppraisal) => DevelopmentAppraisal) => void;
  updateOption: (optionId: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
  onAddOption: () => void;
  onClose: () => void;
}) {
  const [optionNameDrafts, setOptionNameDrafts] = React.useState<Record<string, string>>(() => (
    Object.fromEntries(appraisal.options.map((option) => [option.id, option.name]))
  ));
  React.useEffect(() => {
    setOptionNameDrafts(Object.fromEntries(appraisal.options.map((option) => [option.id, option.name])));
  }, [appraisal.id, appraisal.options.length]);
  const activateOption = (optionId: string) => {
    setActiveOptionId(optionId);
    updateAppraisal(appraisal.id, (current) => ({ ...current, selectedOptionId: optionId }));
  };
  const duplicateSpecificOption = (option: DevelopmentAppraisalOption) => {
    const copy = duplicateOption(option, appraisal.options);
    updateAppraisal(appraisal.id, (current) => ({
      ...current,
      selectedOptionId: copy.id,
      options: [...current.options, copy],
    }));
    setActiveOptionId(copy.id);
  };
  const deleteSpecificOption = (option: DevelopmentAppraisalOption) => {
    if (appraisal.options.length <= 1) return;
    updateAppraisal(appraisal.id, (current) => {
      const options = current.options.filter((entry) => entry.id !== option.id);
      const selectedOptionId = current.selectedOptionId === option.id ? options[0]?.id : current.selectedOptionId;
      return { ...current, options, selectedOptionId };
    });
    if (activeOptionId === option.id) {
      setActiveOptionId(appraisal.options.find((entry) => entry.id !== option.id)?.id || null);
    }
  };

  return (
    <AppraisalSideDrawer
      title="Options"
      subtitle="Rename scenarios, choose calculation basis, and decide which option is active."
      smokeId="appraisals-options-drawer"
      onClose={onClose}
      wide
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Scenario options</div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">The active option drives the current workflow and KPI strip.</p>
          </div>
          <button type="button" data-smoke="appraisals-add-option" onClick={onAddOption} className="workspace-primary-btn px-3 py-2 text-xs">
            <Plus className="h-4 w-4" />
            Add {activeKind === 'COMMERCIAL' ? 'commercial' : 'house'} option
          </button>
        </div>

        <div className="space-y-3">
          {appraisal.options.map((option) => (
            <section
              key={option.id}
              className={`rounded-app border p-3 ${
                option.id === activeOptionId
                  ? 'border-primary-200 bg-primary-50/70 dark:border-primary-800 dark:bg-primary-950/20'
                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-surface-900'
              }`}
            >
              <div className={`grid gap-3 ${activeKind === 'COMMERCIAL' ? 'lg:grid-cols-[minmax(14rem,1fr)_auto]' : 'lg:grid-cols-[minmax(14rem,1fr)_minmax(13rem,0.9fr)_auto]'}`}>
                <label>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Option name</span>
                  <input
                    value={optionNameDrafts[option.id] ?? option.name}
                    onChange={(event) => setOptionNameDrafts((current) => ({ ...current, [option.id]: event.target.value }))}
                    onBlur={(event) => {
                      const name = event.currentTarget.value;
                      updateOption(option.id, (current) => ({ ...current, name }));
                    }}
                    onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
                    className={`${inputClass()} mt-1 w-full`}
                  />
                </label>
                {activeKind === 'HOUSE_BUILDING' ? (
                <label>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Calculation basis</span>
                  <select
                    value={option.calculationMode}
                    onChange={(event) => updateOption(option.id, (current) => ({ ...current, calculationMode: event.target.value as AppraisalCalculationMode }))}
                    className={`${inputClass()} mt-1 w-full`}
                  >
                    {setupCalculationModes.map((mode) => <option key={mode.id} value={mode.id}>{mode.label}</option>)}
                  </select>
                </label>
                ) : (
                  <div className="rounded-app-sm border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-500 dark:text-blue-200">Commercial basis</span>
                    <span className="mt-1 block font-semibold">Lifecycle cost / revenue appraisal</span>
                  </div>
                )}
                <div className="flex flex-wrap items-end gap-2">
                  <button type="button" onClick={() => activateOption(option.id)} disabled={option.id === activeOptionId} className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-50">
                    <CheckCircle2 className="h-4 w-4" />
                    {option.id === activeOptionId ? 'Active' : 'Make active'}
                  </button>
                  <button type="button" onClick={() => duplicateSpecificOption(option)} className="workspace-secondary-btn px-3 py-2 text-xs">
                    <Copy className="h-4 w-4" />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSpecificOption(option)}
                    disabled={appraisal.options.length <= 1}
                    className="workspace-secondary-btn px-3 py-2 text-xs text-rose-700 hover:text-rose-800 disabled:opacity-50 dark:text-rose-300 dark:hover:text-rose-200"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-4">
                <span>{APPRAISAL_MODE_LABELS[option.calculationMode]}</span>
                <span>{option.durationMonths} months</span>
                <span>{option.houseTypeSchedule?.length || option.revenueLines.length} input row{(option.houseTypeSchedule?.length || option.revenueLines.length) === 1 ? '' : 's'}</span>
                <span>{option.recommended ? 'Recommended' : 'Not recommended'}</span>
              </div>
            </section>
          ))}
        </div>
      </div>
    </AppraisalSideDrawer>
  );
}

function updateLine<T extends { id: string }>(rows: T[], lineId: string, patch: Partial<T>) {
  return rows.map((line) => (line.id === lineId ? { ...line, ...patch } : line));
}

function commercialTemplateApplied(option: DevelopmentAppraisalOption) {
  return option.costLines.some(isCommercialTemplateLine) || option.revenueLines.some(isCommercialTemplateLine);
}

function percentageBasisLabel(basis: AppraisalCostPercentageBasis, template: AppraisalTemplate) {
  if (basis === 'GDV' && template === 'COMMERCIAL_INCOME') return 'SALE / RENTAL VALUE';
  return basis;
}

function AppraisalRegisterWorkspace({
  appraisals,
  showArchived,
  setShowArchived,
  appraisalFolders,
  onCreateFolder,
  onAssignFolder,
  onRenameFolder,
  onDeleteFolder,
  onDeleteAppraisal,
  onRestoreAppraisal,
  onOpenAppraisal,
  onCreateVersion,
}: {
  appraisals: DevelopmentAppraisal[];
  showArchived: boolean;
  setShowArchived: React.Dispatch<React.SetStateAction<boolean>>;
  appraisalFolders: WorkspaceFolder[];
  onCreateFolder: (name: string) => WorkspaceFolder | null;
  onAssignFolder: (appraisalId: string, folderId: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onDeleteAppraisal: (appraisal: DevelopmentAppraisal) => void;
  onRestoreAppraisal: (appraisal: DevelopmentAppraisal) => void;
  onOpenAppraisal: (appraisal: DevelopmentAppraisal) => void;
  onCreateVersion: (appraisal: DevelopmentAppraisal) => void;
}) {
  const [folderId, setFolderId] = React.useState(ALL_WORKSPACE_FOLDERS_ID);
  const [year, setYear] = React.useState(ALL_WORKSPACE_YEARS_ID);
  const [search, setSearch] = React.useState('');
  const [hideUnviable, setHideUnviable] = React.useState(false);
  const [hideBidLost, setHideBidLost] = React.useState(false);
  const [hideFrozen, setHideFrozen] = React.useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = React.useState(false);
  const [folderDialogName, setFolderDialogName] = React.useState('');
  const [versionCompareGroup, setVersionCompareGroup] = React.useState<{ key: string; primary: DevelopmentAppraisal; versions: DevelopmentAppraisal[] } | null>(null);
  const registerView = React.useMemo(
    () => buildAppraisalRegisterView(appraisals, appraisalFolders, {
      kind: 'ALL',
      showArchived,
      folderId,
      year,
      search,
    }),
    [appraisalFolders, appraisals, folderId, search, showArchived, year]
  );
  const registerGroups = React.useMemo(() => groupAppraisalVersions(registerView.appraisals), [registerView.appraisals]);
  const visibleRegisterGroups = React.useMemo(() => registerGroups.filter((group) => (
    (!hideUnviable || !group.primary.unviableMarkedAt)
    && (!hideBidLost || group.primary.siteStatus !== 'BID_LOST')
    && (!hideFrozen || !group.primary.frozenAt)
  )), [hideBidLost, hideFrozen, hideUnviable, registerGroups]);
  const registerComparisons = React.useMemo(() => new Map(
    visibleRegisterGroups.map((group) => [group.primary.id, compareAppraisalOptions(group.primary)] as const)
  ), [visibleRegisterGroups]);

  const getSelectedFolder = (folderId: string) => appraisalFolders.find((folder) => folder.id === folderId) || null;
  const buildFolderActionItems = (folderId: string): ContextMenuEntry[] => {
    const folder = getSelectedFolder(folderId);
    if (!folder) return [];
    return [
      { id: 'appraisal-folder-label', type: 'label', label: folder.name },
      {
        id: 'appraisal-folder-rename',
        label: 'Rename folder',
        icon: <Pencil className="h-4 w-4" />,
        onSelect: () => {
          const nextName = window.prompt('Rename appraisal folder', folder.name)?.trim();
          if (!nextName || nextName === folder.name) return;
          onRenameFolder(folder.id, nextName);
        },
      },
      {
        id: 'appraisal-folder-delete',
        label: 'Delete folder',
        icon: <Trash2 className="h-4 w-4" />,
        tone: 'danger',
        onSelect: () => {
          const confirmed = window.confirm(`Delete "${folder.name}"? Appraisals in this folder will move to Unfiled appraisals.`);
          if (!confirmed) return;
          onDeleteFolder(folder.id);
          setFolderId(ALL_WORKSPACE_FOLDERS_ID);
          setYear(ALL_WORKSPACE_YEARS_ID);
        },
      },
    ];
  };

  const selectedFolder = getSelectedFolder(registerView.selectedFolderId);
  const folderActionItems = buildFolderActionItems(registerView.selectedFolderId);
  const createFolderFromDialog = () => {
    const name = folderDialogName.trim();
    if (!name) return;
    const folder = onCreateFolder(name);
    if (!folder) return;
    setFolderId(folder.id);
    setYear(ALL_WORKSPACE_YEARS_ID);
    setFolderDialogName('');
    setFolderDialogOpen(false);
  };

  const renderAppraisalCard = (group: { key: string; primary: DevelopmentAppraisal; versions: DevelopmentAppraisal[] }) => {
    const appraisal = group.primary;
    const isUnviable = Boolean(appraisal.unviableMarkedAt);
    const isBidLost = appraisal.siteStatus === 'BID_LOST';
    const recommended = registerComparisons.get(appraisal.id)?.find((entry) => entry.isRecommended);
    const metrics = recommended?.metrics;
    const commercialLifecycle = appraisal.kind === 'COMMERCIAL'
      ? calculateCommercialLifecycle(recommended?.option || appraisal.options[0])
      : null;
    const targetProfitPercent = recommended?.option.targetProfitOnGdvPercent || DEFAULT_TARGET_PROFIT_ON_GDV_PERCENT;
    const metricPills = appraisal.kind === 'COMMERCIAL' ? (
      <>
        <AppraisalRegisterMetricPill label="Land" value={money((recommended?.option || appraisal.options[0])?.knownLandValue || 0)} />
        <AppraisalRegisterMetricPill label="Income" value={money(commercialLifecycle?.startingAnnualIncome || 0)} tone={(commercialLifecycle?.startingAnnualIncome || 0) > 0 ? 'good' : 'watch'} />
        <AppraisalRegisterMetricPill label="Break-even" value={commercialLifecycle?.breakEvenYear ? `Year ${commercialLifecycle.breakEvenYear}` : 'No'} tone={commercialLifecycle?.breakEvenYear ? 'good' : 'watch'} />
      </>
    ) : (
      <>
        <AppraisalRegisterMetricPill label="Land" value={money(metrics?.landValue || 0)} />
        <AppraisalRegisterMetricPill label="Profit" value={money(metrics?.profit || 0)} tone={(metrics?.profit || 0) >= 0 ? 'good' : 'bad'} />
        <AppraisalRegisterMetricPill
          label="Profit %"
          value={`${(metrics?.profitOnGdvPercent || 0).toFixed(1)}%`}
          tone={(metrics?.profitOnGdvPercent || 0) >= targetProfitPercent ? 'good' : 'watch'}
        />
      </>
    );

    return (
      <div
        key={group.key}
        data-smoke="appraisals-register-card"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('button, select, input, a, textarea')) return;
          onOpenAppraisal(appraisal);
        }}
        className={`relative isolate grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 overflow-hidden border-b px-4 py-3 text-left transition last:border-b-0 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,auto)_minmax(6rem,auto)_auto] ${isUnviable || isBidLost
          ? 'border-slate-200 bg-slate-100 opacity-80 grayscale hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700'
          : appraisal.frozenAt
          ? 'border-rose-100 bg-rose-50/35 hover:bg-rose-50/55 dark:border-rose-900/40 dark:bg-rose-950/10 dark:hover:bg-rose-950/20'
          : 'border-slate-100 bg-white hover:bg-primary-50/55 dark:border-slate-800 dark:bg-surface-900 dark:hover:bg-primary-950/20'}`}
      >
        {(isUnviable || isBidLost || appraisal.frozenAt) && (
          <span
            data-smoke={isUnviable ? 'appraisals-unviable-watermark' : isBidLost ? 'appraisals-bid-lost-watermark' : 'appraisals-register-watermark'}
            aria-hidden="true"
            className={`pointer-events-none absolute left-[36%] top-1/2 z-0 hidden -translate-x-1/2 -translate-y-1/2 -rotate-12 select-none text-2xl font-black tracking-[0.16em] xl:block ${isUnviable || isBidLost ? 'text-slate-700/30 dark:text-slate-200/25' : 'text-rose-600/25 dark:text-rose-300/25'}`}
          >
            {isUnviable ? 'UNVIABLE' : isBidLost ? 'BID LOST' : 'FROZEN'}
          </span>
        )}
        <span className="relative z-10 min-w-0">
          <span className="flex min-w-0 items-center gap-2">
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
              appraisal.kind === 'COMMERCIAL'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/35 dark:text-blue-200'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-200'
            }`}>
              {appraisal.kind === 'COMMERCIAL' ? 'Commercial' : 'Housing'}
            </span>
            <button type="button" onClick={() => onOpenAppraisal(appraisal)} className="min-w-0 truncate text-left text-sm font-semibold text-slate-900 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 dark:text-slate-100">
              {appraisal.name}
            </button>
            {appraisal.reference && (
              <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-500 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300">
                {appraisal.reference}
              </span>
            )}
          </span>
          <span className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span>{appraisal.status}</span>
            {isUnviable && <span className="font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">Unviable</span>}
            {isBidLost && <span className="font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">Bid lost</span>}
            {appraisal.frozenAt && <span className="font-semibold text-emerald-700 dark:text-emerald-300">Frozen {new Date(appraisal.frozenAt).toLocaleDateString()}</span>}
            {appraisal.status === 'ARCHIVED' && appraisal.archivedAt ? (
              <span>Archived {new Date(appraisal.archivedAt).toLocaleDateString()}</span>
            ) : null}
            <span>{appraisal.options.length} option{appraisal.options.length === 1 ? '' : 's'}</span>
            <span>{group.versions.length} version{group.versions.length === 1 ? '' : 's'}</span>
            <span>{appraisalFolders.find((folder) => folder.id === appraisal.appraisalFolderId)?.name || 'Unfiled'}</span>
          </span>
          <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">
            {appraisal.versionSummary?.trim() || 'No version change summary recorded yet.'}
          </span>
          <span className="mt-2 flex flex-wrap gap-1.5 xl:hidden">
            {metricPills}
          </span>
          {group.versions.length > 1 && (
            <span className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Versions</span>
              {group.versions.slice().reverse().map((version) => {
                const parsed = parseAppraisalReference(version.reference);
                const label = parsed?.revision || 'Version';
                return (
                  <button
                    key={version.id}
                    type="button"
                    onClick={() => onOpenAppraisal(version)}
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${
                      version.id === appraisal.id
                        ? 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-200'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-primary-200 hover:text-primary-700 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300 dark:hover:text-primary-200'
                    }`}
                  >
                    {version.frozenAt ? '🔒 ' : ''}{label}
                  </button>
                );
              })}
            </span>
          )}
        </span>
        <span className="relative z-10 hidden min-w-[19rem] flex-wrap justify-end gap-1.5 xl:flex">
          {metricPills}
        </span>
        <span className="relative z-10 hidden min-w-[5rem] text-right text-[11px] text-slate-400 dark:text-slate-500 xl:block">
            {appraisal.appraisalDate || new Date(appraisal.updatedAt || Date.now()).toLocaleDateString()}
        </span>
        <span className="relative z-10 flex min-w-0 shrink-0 items-center justify-end gap-2 text-right">
          <label className="sr-only" htmlFor={`appraisal-folder-${appraisal.id}`}>Appraisal folder</label>
          <select
            id={`appraisal-folder-${appraisal.id}`}
            value={appraisal.appraisalFolderId || ''}
            onChange={(event) => onAssignFolder(appraisal.id, event.target.value)}
            className="workspace-input hidden w-36 px-2 py-1.5 text-[11px] lg:block"
          >
            <option value="">Unfiled</option>
            {appraisalFolders.map((folder) => (
              <option key={folder.id} value={folder.id}>{folder.name}</option>
            ))}
          </select>
          {appraisal.status === 'ARCHIVED' ? (
            <button
              type="button"
              data-smoke="appraisals-restore-appraisal"
              onClick={() => onRestoreAppraisal(appraisal)}
              className="workspace-primary-btn shrink-0 px-2.5 py-1 text-[11px]"
              title="Restore appraisal to the live register"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore
            </button>
          ) : (
            <>
              <button type="button" onClick={() => onOpenAppraisal(appraisal)} className="workspace-secondary-btn shrink-0 px-2.5 py-1 text-[11px]">
                Open
              </button>
              <button type="button" data-smoke="appraisals-new-version" disabled={Boolean(appraisal.unviableMarkedAt)} onClick={() => onCreateVersion(appraisal)} className="workspace-secondary-btn shrink-0 px-2.5 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-40">
                New version
              </button>
              {group.versions.length > 1 && (
                <button
                  type="button"
                  data-smoke="appraisals-version-compare"
                  onClick={() => setVersionCompareGroup(group)}
                  className="workspace-secondary-btn shrink-0 px-2.5 py-1 text-[11px]"
                  title="Compare appraisal versions"
                  aria-label={`Compare versions for ${appraisal.name}`}
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Compare
                </button>
              )}
            </>
          )}
          {!appraisal.frozenAt && !appraisal.unviableMarkedAt && <button
            type="button"
            data-smoke="appraisals-delete-appraisal"
            onClick={() => onDeleteAppraisal(appraisal)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-app-sm border border-slate-200 text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:hover:bg-rose-950/30 dark:hover:text-rose-200"
            aria-label={`Delete ${appraisal.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>}
        </span>
      </div>
    );
  };

  return (
    <>
    <main data-smoke="appraisals-register-workspace" className="min-h-0 flex-1 overflow-y-auto p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Appraisal register</div>
          <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-50">Register</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            A simple newest-first list of house building and commercial appraisals.
          </p>
        </div>
        <button type="button" onClick={() => setShowArchived((value) => !value)} className="workspace-secondary-btn px-3 py-2 text-xs" title={showArchived ? 'Hide archived appraisals' : 'Show archived appraisals to restore them'}>
          <Archive className="h-4 w-4" />
          {showArchived ? 'Hide archived' : 'Archived'}
        </button>
      </div>

      <section className="overflow-hidden rounded-app-lg border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-surface-900">
        <div className="grid gap-3 border-b border-slate-200 bg-slate-50/75 p-3 dark:border-slate-800 dark:bg-surface-800/60 md:grid-cols-[minmax(11rem,1fr)_minmax(8rem,0.45fr)_minmax(14rem,1.2fr)_auto_auto]">
          <label className="min-w-0">
            <span className="sr-only">Folder</span>
            <select
              data-smoke="appraisals-register-folder-filter"
              value={registerView.selectedFolderId}
              onChange={(event) => {
                setFolderId(event.target.value);
                setYear(ALL_WORKSPACE_YEARS_ID);
              }}
              className="workspace-input w-full px-3 py-2 text-xs"
            >
              {registerView.folderOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0">
            <span className="sr-only">Year</span>
            <select
              data-smoke="appraisals-register-year-filter"
              value={registerView.selectedYear}
              onChange={(event) => setYear(event.target.value)}
              className="workspace-input w-full px-3 py-2 text-xs"
            >
              <option value={ALL_WORKSPACE_YEARS_ID}>All years</option>
              {registerView.yearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>
          <label className="min-w-0">
            <span className="sr-only">Search</span>
            <input
              data-smoke="appraisals-register-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              className="workspace-input w-full px-3 py-2 text-xs"
            />
          </label>
          <button
            type="button"
            data-smoke="appraisals-register-add-folder"
            onClick={() => {
              setFolderDialogName('');
              setFolderDialogOpen(true);
            }}
            className="workspace-primary-btn h-9 w-9 justify-center p-0"
            title="Add appraisal folder"
            aria-label="Add appraisal folder"
          >
            <Plus className="h-4 w-4" />
          </button>
          <PopoverMenu
            ariaLabel="Appraisal folder actions"
            width={240}
            estimatedHeight={150}
            trigger={({ ref, isOpen, toggle }) => (
              <button
                ref={ref}
                type="button"
                onClick={toggle}
                disabled={!selectedFolder}
                className="workspace-secondary-btn h-9 w-9 justify-center p-0 disabled:opacity-50"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                title="Folder actions"
                aria-label="Folder actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            )}
          >
            {(close) => <MenuActionList items={folderActionItems} close={close} itemTextSize="text-xs" />}
          </PopoverMenu>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-b border-slate-200 bg-slate-50/40 px-4 py-2 dark:border-slate-800 dark:bg-surface-800/30">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <input data-smoke="appraisals-hide-unviable" type="checkbox" checked={hideUnviable} onChange={(event) => setHideUnviable(event.target.checked)} className="accent-slate-700" />
            Hide unviable sites
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <input data-smoke="appraisals-hide-bid-lost" type="checkbox" checked={hideBidLost} onChange={(event) => setHideBidLost(event.target.checked)} className="accent-slate-700" />
            Hide lost bids
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <input data-smoke="appraisals-hide-frozen" type="checkbox" checked={hideFrozen} onChange={(event) => setHideFrozen(event.target.checked)} className="accent-slate-700" />
            Hide frozen sites
          </label>
        </div>

        {folderDialogOpen && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm dark:bg-black/65"
            onClick={() => setFolderDialogOpen(false)}
          >
            <form
              data-smoke="appraisals-folder-dialog"
              className="w-full max-w-md overflow-hidden rounded-app-lg border border-slate-200 bg-white shadow-app-lg dark:border-slate-700 dark:bg-surface-900"
              onClick={(event) => event.stopPropagation()}
              onSubmit={(event) => {
                event.preventDefault();
                createFolderFromDialog();
              }}
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Appraisal register</div>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">New folder</h2>
                </div>
                <button type="button" onClick={() => setFolderDialogOpen(false)} className="workspace-icon-btn" aria-label="Close new appraisal folder dialog">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3 px-5 py-4">
                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Folder name</span>
                  <input
                    autoFocus
                    data-smoke="appraisals-folder-name"
                    value={folderDialogName}
                    onChange={(event) => setFolderDialogName(event.target.value)}
                    className="workspace-input mt-1 w-full px-3 py-2 text-sm"
                    placeholder="e.g. June appraisals"
                  />
                </label>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-surface-800/70">
                <button type="button" onClick={() => setFolderDialogOpen(false)} className="workspace-secondary-btn px-3 py-2 text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={!folderDialogName.trim()} className="workspace-primary-btn px-3 py-2 text-xs disabled:opacity-50">
                  Create folder
                </button>
              </div>
            </form>
          </div>
        )}

        <div data-smoke="appraisals-register-results" className="min-h-[24rem] divide-y divide-slate-100 dark:divide-slate-800">
          {visibleRegisterGroups.length > 0 ? (
            visibleRegisterGroups.map(renderAppraisalCard)
          ) : (
            <div className="px-5 py-10 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-app-sm border border-dashed border-slate-300 text-slate-400 dark:border-slate-700">
                <ListChecks className="h-5 w-5" />
              </div>
              <div className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">No matching appraisals</div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Adjust the folder, year, search, or site filters.</p>
            </div>
          )}
        </div>
      </section>
    </main>
    {versionCompareGroup && (
      <AppraisalVersionComparisonDrawer
        group={versionCompareGroup}
        folders={appraisalFolders}
        onClose={() => setVersionCompareGroup(null)}
      />
    )}
    </>
  );
}

function AppraisalRegisterMetricPill({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'good' | 'watch' | 'bad';
}) {
  const toneClass = tone === 'good'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
    : tone === 'watch'
      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200'
      : tone === 'bad'
        ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200'
        : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-surface-800 dark:text-slate-300';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums ${toneClass}`}>
      <span className="uppercase tracking-[0.12em] opacity-70">{label}</span>
      <span>{value}</span>
    </span>
  );
}

function AppraisalVersionComparisonDrawer({
  group,
  folders,
  onClose,
}: {
  group: { key: string; primary: DevelopmentAppraisal; versions: DevelopmentAppraisal[] };
  folders: WorkspaceFolder[];
  onClose: () => void;
}) {
  const rows = React.useMemo(() => group.versions.slice().sort((a, b) => (
    new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  )).map((appraisal) => {
    const comparison = compareAppraisalOptions(appraisal);
    const recommended = comparison.find((entry) => entry.isRecommended) || comparison[0];
    const option = recommended?.option || appraisal.options[0];
    const metrics = recommended?.metrics || (option ? calculateAppraisalOption(option) : null);
    const lifecycle = appraisal.kind === 'COMMERCIAL' && option ? calculateCommercialLifecycle(option) : null;
    return {
      appraisal,
      option,
      metrics,
      lifecycle,
      folderName: folders.find((folder) => folder.id === appraisal.appraisalFolderId)?.name || 'Unfiled',
    };
  }), [folders, group.versions]);

  return (
    <AppraisalSideDrawer
      title="Compare versions"
      subtitle="Key metrics across appraisal revisions."
      smokeId="appraisals-version-compare-drawer"
      onClose={onClose}
      wide
    >
      <div className="space-y-4">
        <div className="rounded-app border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-surface-900">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Appraisal</div>
          <div className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">{group.primary.name}</div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {rows.length} version{rows.length === 1 ? '' : 's'} compared, newest first.
          </p>
        </div>

        <div className="overflow-x-auto rounded-app border border-slate-200 dark:border-slate-800">
          <table className="min-w-[1120px] w-full text-left text-xs">
            <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Version</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Folder</th>
                <th className="px-3 py-2 text-right">GDV/GSV</th>
                <th className="px-3 py-2 text-right">Cost</th>
                <th className="px-3 py-2 text-right">Land</th>
                <th className="px-3 py-2 text-right">Profit</th>
                <th className="px-3 py-2 text-right">Profit %</th>
                <th className="px-3 py-2 text-right">Income</th>
                <th className="px-3 py-2">Change summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-surface-950">
              {rows.map(({ appraisal, metrics, lifecycle, folderName }) => {
                const parsed = parseAppraisalReference(appraisal.reference);
                const profitPercent = metrics?.profitOnGdvPercent || 0;
                const profit = metrics?.profit || 0;
                return (
                  <tr key={appraisal.id} className={appraisal.id === group.primary.id ? 'bg-primary-50/60 dark:bg-primary-950/20' : ''}>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{parsed?.revision || appraisal.reference || 'Version'}</div>
                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{appraisal.appraisalDate || new Date(appraisal.updatedAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-3 py-2">{appraisal.status}</td>
                    <td className="px-3 py-2">{folderName}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{money(metrics?.gdv || 0)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(metrics?.totalCost || 0)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${(metrics?.landValue || 0) < 0 ? 'text-rose-700 dark:text-rose-300' : ''}`}>{money(metrics?.landValue || 0)}</td>
                    <td className={`px-3 py-2 text-right font-semibold tabular-nums ${profit < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-slate-100'}`}>{money(profit)}</td>
                    <td className={`px-3 py-2 text-right font-semibold tabular-nums ${profitPercent < 0 ? 'text-rose-700 dark:text-rose-300' : ''}`}>{profitPercent.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right tabular-nums">{lifecycle ? money(lifecycle.startingAnnualIncome || 0) : '-'}</td>
                    <td className="max-w-[22rem] px-3 py-2 text-slate-600 dark:text-slate-300">
                      {appraisal.versionSummary?.trim() || 'No version change summary recorded.'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppraisalSideDrawer>
  );
}

function updateProfile(profile: AppraisalCashflowProfile, patch: Partial<AppraisalCashflowProfile>): AppraisalCashflowProfile {
  return { ...profile, ...patch };
}

function AppraisalLibraryWorkspace({
  houseTypes,
  rates,
  rateDraft,
  setRateDraft,
  onCreateRate,
  setAppraisalHouseTypes,
  setAppraisalRates,
}: {
  houseTypes: AppraisalHouseTypeLibraryItem[];
  rates: AppraisalRateLibraryItem[];
  rateDraft: RateLibraryDraft;
  setRateDraft: React.Dispatch<React.SetStateAction<RateLibraryDraft>>;
  onCreateRate: () => void;
  setAppraisalHouseTypes: React.Dispatch<React.SetStateAction<AppraisalHouseTypeLibraryItem[]>>;
  setAppraisalRates: React.Dispatch<React.SetStateAction<AppraisalRateLibraryItem[]>>;
}) {
  const { showToast } = useToast();
  const { askConfirm } = useConfirm();
  const [activeLibraryPack, setActiveLibraryPack] = React.useState<AppraisalLibraryPack | null>(null);
  const [selectedOtherCostSection, setSelectedOtherCostSection] = React.useState<AwdOtherCostSection | null>(null);
  const [collapsedPrelimsSections, setCollapsedPrelimsSections] = React.useState<Set<string>>(() => new Set());
  const [isExportingAwdRateLibraryReport, setIsExportingAwdRateLibraryReport] = React.useState(false);
  const [isHouseTypeTradeUpdaterOpen, setIsHouseTypeTradeUpdaterOpen] = React.useState(false);
  const [isHouseTypeElementalImportOpen, setIsHouseTypeElementalImportOpen] = React.useState(false);
  const [isHouseTypeElementalImporting, setIsHouseTypeElementalImporting] = React.useState(false);
  const [houseTypeElementalImportFileName, setHouseTypeElementalImportFileName] = React.useState('');
  const [houseTypeElementalImportProposals, setHouseTypeElementalImportProposals] = React.useState<HouseTypeElementalImportProposal[]>([]);
  const [houseTypeTradeKey, setHouseTypeTradeKey] = React.useState<AppraisalHouseTypeCostComponent['key']>('KIT');
  const [houseTypeTradeUpdates, setHouseTypeTradeUpdates] = React.useState<Record<string, HouseTypeTradeUpdateDraft>>({});
  const updateHouseType = (id: string, patch: Partial<AppraisalHouseTypeLibraryItem>) => {
    setAppraisalHouseTypes((current) => normalizeAppraisalHouseTypeLibraryItems(current.map((entry) => (
      entry.id === id ? { ...entry, ...patch, updatedAt: new Date().toISOString() } : entry
    ))));
  };
  const updateRate = (id: string, patch: Partial<AppraisalRateLibraryItem>) => {
    setAppraisalRates((current) => normalizeAppraisalRateLibraryItems(current.map((entry) => (
      entry.id === id ? { ...entry, ...patch, updatedAt: new Date().toISOString() } : entry
    ))));
  };
  const removeHouseType = (id: string) => {
    setAppraisalHouseTypes((current) => current.filter((entry) => entry.id !== id));
  };
  const removeRate = (id: string) => {
    setAppraisalRates((current) => current.filter((entry) => entry.id !== id));
  };
  const handleRateCostDriverChange = (costDriver: AppraisalInfrastructureCostDriver) => {
    setRateDraft((current) => ({
      ...current,
      costDriver,
      label: current.costDriver && current.label === APPRAISAL_INFRASTRUCTURE_COST_DRIVER_LABELS[current.costDriver]
        ? APPRAISAL_INFRASTRUCTURE_COST_DRIVER_LABELS[costDriver]
        : current.label,
      unit: current.unit || getInfrastructureCostDriverUnit(costDriver),
    }));
  };
  const [selectedHouseTypeId, setSelectedHouseTypeId] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!selectedHouseTypeId || houseTypes.some((houseType) => houseType.id === selectedHouseTypeId)) return;
    setSelectedHouseTypeId(null);
  }, [houseTypes, selectedHouseTypeId]);

  const selectedHouseType = houseTypes.find((houseType) => houseType.id === selectedHouseTypeId) || null;
  const selectedHouseTypeBreakdown = selectedHouseType?.costBreakdown?.length
    ? selectedHouseType.costBreakdown
    : createDefaultHouseTypeCostBreakdown();
  const selectedHouseTypeBreakdownTotal = calculateHouseTypeCostBreakdownTotal(selectedHouseTypeBreakdown);
  const selectedHouseTypeBuildCost = selectedHouseType ? calculateHouseTypeLibraryBuildCostPerM2(selectedHouseType) : 0;
  const updateHouseTypeCostComponent = (
    houseType: AppraisalHouseTypeLibraryItem,
    componentKey: AppraisalHouseTypeCostComponent['key'],
    patch: Partial<AppraisalHouseTypeCostComponent>
  ) => {
    const currentBreakdown = houseType.costBreakdown?.length ? houseType.costBreakdown : createDefaultHouseTypeCostBreakdown();
    const nextBreakdown = currentBreakdown.map((component) => (
      component.key === componentKey ? { ...component, ...patch } : component
    ));
    updateHouseType(houseType.id, {
      costBreakdown: nextBreakdown,
      buildCostPerM2: calculateHouseTypeLibraryBuildCostPerM2({
        ...houseType,
        costBreakdown: nextBreakdown,
      }),
    });
  };
  const handleAddStandardHouseType = () => {
    const next = createDefaultAppraisalHouseType({
      name: `Standard house type ${houseTypes.length + 1}`,
      gifaM2: 90,
      buildCostPerM2: 1600,
      priceIndex: APPRAISAL_HOUSE_TYPE_DEFAULT_PRICE_INDEX,
      buildPeriodMonths: APPRAISAL_HOUSE_TYPE_DEFAULT_BUILD_MONTHS,
    });
    setAppraisalHouseTypes((current) => normalizeAppraisalHouseTypeLibraryItems([next, ...current]));
    setSelectedOtherCostSection(null);
    setSelectedHouseTypeId(next.id);
  };
  const handleLoadDetailedHouseTypeDefaults = () => {
    const result = mergeAppraisalHouseTypeCostDefaults(houseTypes);
    setAppraisalHouseTypes(result.houseTypes);
    showToast({
      type: 'success',
      message: `Detailed house costs loaded: ${result.inserted} added, ${result.updated} updated.`,
    });
  };
  const openHouseTypeTradeUpdater = () => {
    setHouseTypeTradeUpdates(Object.fromEntries(houseTypes.map((houseType) => [houseType.id, { amount: '', priceIndex: '' }])));
    setIsHouseTypeTradeUpdaterOpen(true);
  };
  const updateHouseTypeTradeDraft = (houseTypeId: string, patch: Partial<HouseTypeTradeUpdateDraft>) => {
    setHouseTypeTradeUpdates((current) => ({
      ...current,
      [houseTypeId]: {
        ...(current[houseTypeId] || { amount: '', priceIndex: '' }),
        ...patch,
      },
    }));
  };
  const applyHouseTypeTradeUpdates = () => {
    const rowsToUpdate = houseTypes.filter((houseType) => houseTypeTradeUpdates[houseType.id]?.amount.trim());
    if (rowsToUpdate.length === 0) {
      showToast({ type: 'info', message: 'Enter a cost against at least one house type before applying the update.' });
      return;
    }
    setAppraisalHouseTypes((current) => normalizeAppraisalHouseTypeLibraryItems(current.map((houseType) => {
      const update = houseTypeTradeUpdates[houseType.id];
      if (!update?.amount.trim()) return houseType;
      const currentBreakdown = houseType.costBreakdown?.length ? houseType.costBreakdown : createDefaultHouseTypeCostBreakdown();
      const nextBreakdown = currentBreakdown.map((component) => (
        component.key === houseTypeTradeKey
          ? {
            ...component,
            amount: Math.max(0, numberValue(update.amount)),
            priceIndex: update.priceIndex.trim()
              ? Math.max(0, numberValue(update.priceIndex))
              : component.priceIndex || APPRAISAL_HOUSE_TYPE_DEFAULT_PRICE_INDEX,
            included: true,
          }
          : component
      ));
      return {
        ...houseType,
        costBreakdown: nextBreakdown,
        buildCostPerM2: calculateHouseTypeLibraryBuildCostPerM2({ ...houseType, costBreakdown: nextBreakdown }),
        updatedAt: new Date().toISOString(),
      };
    })));
    setIsHouseTypeTradeUpdaterOpen(false);
    showToast({
      type: 'success',
      message: `${APPRAISAL_HOUSE_TYPE_COST_LABELS[houseTypeTradeKey]} updated for ${rowsToUpdate.length} house ${rowsToUpdate.length === 1 ? 'type' : 'types'}.`,
    });
  };
  const handleLoadAwdInfrastructurePack = () => {
    const result = mergeAwdInfrastructureRatePack(rates);
    setAppraisalRates(result.rates);
    showToast({
      type: 'success',
      message: `${AWD_INFRASTRUCTURE_RATE_PACK_NAME} loaded: ${result.inserted} added, ${result.updated} updated.`,
    });
  };
  const handleLoadAwdPlotWorksPack = () => {
    const result = mergeAwdPlotWorksRatePack(rates);
    setAppraisalRates(result.rates);
    showToast({
      type: 'success',
      message: `${AWD_PLOT_WORKS_RATE_PACK_NAME} loaded: ${result.inserted} added, ${result.updated} updated.`,
    });
  };
  const handleLoadAwdPrelimsPack = () => {
    const result = mergeAwdPrelimsRatePack(rates);
    setAppraisalRates(result.rates);
    showToast({
      type: 'success',
      message: `${AWD_PRELIMS_RATE_PACK_NAME} loaded: ${result.inserted} added, ${result.updated} updated.`,
    });
  };
  const togglePrelimsSection = (sectionId: string) => {
    setCollapsedPrelimsSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };
  const abnormalRates = rates.filter(item => isAbnormalRemovalRow({ libraryRateId: item.id }));
  const infrastructureRates = rates.filter(item => isAwdInfrastructureRate(item) && !isAbnormalRemovalRow({ libraryRateId: item.id }));
  const plotWorksRates = rates.filter(isAwdPlotWorksRate);
  const prelimsRates = rates.filter(item => isAwdPrelimsRate(item) && item.id !== 'awd-prelims-site-investigations');
  const baseInfrastructureDefinitionCount = AWD_INFRASTRUCTURE_RATE_DEFINITIONS.filter(item => !isAbnormalRemovalRow({libraryRateId:item.id})).length;
  const abnormalDefinitionCount = AWD_INFRASTRUCTURE_RATE_DEFINITIONS.length - baseInfrastructureDefinitionCount;
  const awdInfrastructureLoadedCount = infrastructureRates.length;
  const awdPlotWorksLoadedCount = plotWorksRates.length;
  const awdPrelimsLoadedCount = prelimsRates.length;
  const awdPackLoadedCount = abnormalRates.length + awdInfrastructureLoadedCount + awdPlotWorksLoadedCount + awdPrelimsLoadedCount;
  const awdPackDefinitionCount = AWD_INFRASTRUCTURE_RATE_DEFINITIONS.length + AWD_PLOT_WORKS_RATE_DEFINITIONS.length + AWD_PRELIMS_RATE_DEFINITIONS.length;
  const selectedOtherCostSectionLabel = selectedOtherCostSection === 'ABNORMALS' ? 'Abnormals' : selectedOtherCostSection === 'INFRASTRUCTURE'
    ? 'Infrastructure'
    : selectedOtherCostSection === 'PLOT_WORKS'
      ? 'Plot Works'
      : selectedOtherCostSection === 'PRELIMS'
        ? 'Prelims'
        : '';
  const selectedOtherCostRates = selectedOtherCostSection === 'ABNORMALS' ? abnormalRates : selectedOtherCostSection === 'INFRASTRUCTURE'
    ? infrastructureRates
    : selectedOtherCostSection === 'PLOT_WORKS'
      ? plotWorksRates
      : selectedOtherCostSection === 'PRELIMS'
        ? prelimsRates
      : [];
  const selectedOtherCostLoadedCount = selectedOtherCostSection === 'ABNORMALS' ? abnormalRates.length : selectedOtherCostSection === 'INFRASTRUCTURE'
    ? awdInfrastructureLoadedCount
    : selectedOtherCostSection === 'PLOT_WORKS'
      ? awdPlotWorksLoadedCount
      : selectedOtherCostSection === 'PRELIMS'
        ? awdPrelimsLoadedCount
      : 0;
  const selectedOtherCostDefinitionCount = selectedOtherCostSection === 'ABNORMALS' ? abnormalDefinitionCount : selectedOtherCostSection === 'INFRASTRUCTURE'
    ? baseInfrastructureDefinitionCount
    : selectedOtherCostSection === 'PLOT_WORKS'
      ? AWD_PLOT_WORKS_RATE_DEFINITIONS.length
      : selectedOtherCostSection === 'PRELIMS'
        ? AWD_PRELIMS_RATE_DEFINITIONS.length
      : 0;
  const handleOpenAwdPack = () => {
    const infrastructureResult = mergeAwdInfrastructureRatePack(rates);
    const plotWorksResult = mergeAwdPlotWorksRatePack(infrastructureResult.rates);
    const prelimsResult = mergeAwdPrelimsRatePack(plotWorksResult.rates);
    setAppraisalRates(prelimsResult.rates);
    setActiveLibraryPack('AWD');
    const inserted = infrastructureResult.inserted + plotWorksResult.inserted + prelimsResult.inserted;
    const updated = infrastructureResult.updated + plotWorksResult.updated + prelimsResult.updated;
    if (inserted > 0 || updated > 0) {
      showToast({
        type: 'success',
        message: `AWD pack ready: ${inserted} rates added, ${updated} updated.`,
      });
    }
  };
  const handleHouseTypeElementalImport = async (file?: File) => {
    if (!file) return;
    setIsHouseTypeElementalImporting(true);
    try {
      const proposals = await buildHouseTypeElementalImportProposals(file, houseTypes);
      if (proposals.length === 0) {
        throw new Error('No source house types could be matched to the current library. Load the AWD house type defaults first, then try again.');
      }
      setHouseTypeElementalImportFileName(file.name);
      setHouseTypeElementalImportProposals(proposals);
      showToast({ type: 'success', message: `${proposals.length} house type updates are ready for review.` });
    } catch (error) {
      console.error('Unable to import house type elemental workbook', error);
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to read the house type elemental workbook.' });
    } finally {
      setIsHouseTypeElementalImporting(false);
    }
  };
  const applyHouseTypeElementalProposal = async (proposal: HouseTypeElementalImportProposal) => {
    const confirmed = await askConfirm({
      title: `Update ${proposal.houseTypeName}?`,
      message: `This will replace the library build-up with the reviewed elemental source values at index ${HOUSE_TYPE_ELEMENTAL_IMPORT_PRICE_INDEX}. The current total is ${money(proposal.currentTotal)} and the proposed total is ${money(proposal.proposedTotal)}.`,
      confirmLabel: 'Update library rate',
      variant: 'default',
    });
    if (!confirmed) return;
    setAppraisalHouseTypes((current) => normalizeAppraisalHouseTypeLibraryItems(current.map((houseType) => (
      houseType.id === proposal.houseTypeId
        ? {
            ...houseType,
            ...(houseType.isIncomplete && proposal.gifaM2 > 0
              ? {
                  gifaM2: proposal.gifaM2,
                  bedrooms: proposal.bedrooms || houseType.bedrooms,
                  storeys: proposal.storeys || houseType.storeys,
                  style: proposal.style || houseType.style,
                  configuration: proposal.configuration || houseType.configuration,
                  buildPeriodMonths: houseType.buildPeriodMonths || APPRAISAL_HOUSE_TYPE_DEFAULT_BUILD_MONTHS,
                  isIncomplete: false,
                  incompleteWarning: '',
                }
              : {}),
            costBreakdown: proposal.costBreakdown,
            buildCostPerM2: houseType.isIncomplete && proposal.gifaM2 > 0 ? proposal.proposedTotal / proposal.gifaM2 : proposal.proposedRatePerM2,
            priceIndex: 0,
            notes: houseType.isIncomplete && proposal.gifaM2 > 0 ? proposal.notes : houseType.notes ? `${houseType.notes}\n${proposal.notes}` : proposal.notes,
            updatedAt: new Date().toISOString(),
          }
        : houseType
    ))));
    setHouseTypeElementalImportProposals((current) => current.map((entry) => (
      entry.id === proposal.id
        ? {
            ...entry,
            currentTotal: proposal.proposedTotal,
            currentRatePerM2: proposal.gifaM2 > 0 ? proposal.proposedTotal / proposal.gifaM2 : proposal.proposedRatePerM2,
            applied: true,
          }
        : entry
    )));
    showToast({ type: 'success', message: `${proposal.houseTypeName} updated from the elemental import.` });
  };
  const handleExportAwdRateLibraryReport = async () => {
    setIsExportingAwdRateLibraryReport(true);
    try {
      const saved = await downloadAwdRateLibraryReportExcel(rates);
      if (saved) {
        showToast({ type: 'success', message: 'AWD rate library report exported.' });
      }
    } catch (error) {
      console.error('Unable to export AWD rate library report', error);
      showToast({ type: 'error', message: 'Unable to export the AWD rate library report. Please try again.' });
    } finally {
      setIsExportingAwdRateLibraryReport(false);
    }
  };

  if (!activeLibraryPack) {
    return (
      <main data-smoke="appraisals-library-workspace" className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="mb-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Appraisal libraries</div>
          <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-50">Select a cost library pack</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Choose the standards pack before editing house type costs, build-ups, infrastructure rates, and cost drivers.
          </p>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            data-smoke="appraisals-awd-pack-open"
            onClick={handleOpenAwdPack}
            className="group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-app border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-primary-300 hover:bg-primary-50/45 dark:border-slate-800 dark:bg-surface-900 dark:hover:border-primary-800 dark:hover:bg-primary-950/20"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-app-sm border border-primary-100 bg-primary-50 text-primary-700 dark:border-primary-900/60 dark:bg-primary-950/30 dark:text-primary-200">
              <Building2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-50">AWD pack</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">House types, infrastructure, plot works, prelims, and cost drivers</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                <span className="rounded-full border border-slate-200 px-1.5 py-0.5 dark:border-slate-700">House types</span>
                <span className="rounded-full border border-slate-200 px-1.5 py-0.5 dark:border-slate-700">Infrastructure</span>
                <span className="rounded-full border border-slate-200 px-1.5 py-0.5 dark:border-slate-700">Plot Works</span>
                <span className="rounded-full border border-slate-200 px-1.5 py-0.5 dark:border-slate-700">Prelims</span>
              </div>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-300">
              {awdPackLoadedCount}/{awdPackDefinitionCount} rates
            </span>
          </button>
        </div>
      </main>
    );
  }

  return (
    <main data-smoke="appraisals-library-workspace" className="min-h-0 flex-1 overflow-y-auto p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Selected sub-library</div>
          <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-50">AWD pack</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Maintain AWD house type costs and other cost-driver rates from the workbook base formulas.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            data-smoke="appraisals-awd-rate-library-export"
            onClick={() => void handleExportAwdRateLibraryReport()}
            disabled={isExportingAwdRateLibraryReport}
            className="workspace-secondary-btn px-3 py-2 text-xs"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {isExportingAwdRateLibraryReport ? 'Exporting…' : 'Export rate report'}
          </button>
          <button type="button" onClick={() => setActiveLibraryPack(null)} className="workspace-secondary-btn px-3 py-2 text-xs">
            <BookOpen className="h-4 w-4" />
            Change pack
          </button>
        </div>
      </div>

      <div className="grid min-h-0 gap-5 xl:grid-cols-[minmax(22rem,30rem)_minmax(0,1fr)]">
        <div className="space-y-4">
        <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">House index</div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{houseTypes.length} standard house types</h2>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                data-smoke="appraisals-house-type-load-defaults"
                onClick={handleLoadDetailedHouseTypeDefaults}
                className="workspace-secondary-btn px-3 py-2 text-xs"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Load defaults
              </button>
              <button
                type="button"
                data-smoke="appraisals-house-type-elemental-import"
                onClick={() => setIsHouseTypeElementalImportOpen(true)}
                className="workspace-secondary-btn px-3 py-2 text-xs"
              >
                <FileUp className="h-4 w-4" />
                Import elemental rates
              </button>
              <button
                type="button"
                data-smoke="appraisals-house-type-bulk-update"
                onClick={openHouseTypeTradeUpdater}
                disabled={houseTypes.length === 0}
                className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-60"
              >
                <Calculator className="h-4 w-4" />
                Bulk updater
              </button>
              <button
                type="button"
                data-smoke="appraisals-house-type-create"
                onClick={handleAddStandardHouseType}
                className="workspace-primary-btn px-3 py-2 text-xs"
              >
                <Plus className="h-4 w-4" />
                Add house type
              </button>
            </div>
          </div>
          <div className="mt-3 max-h-44 overflow-y-auto rounded-app border border-slate-200 dark:border-slate-800">
            {houseTypes.length > 0 ? (
              <div className="divide-y divide-slate-200 text-xs dark:divide-slate-800">
                {houseTypes.map((houseType, index) => (
                  <button
                    key={houseType.id}
                    type="button"
                    onClick={() => {
                      setSelectedHouseTypeId(houseType.id);
                      setSelectedOtherCostSection(null);
                    }}
                    className={`grid w-full grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                      selectedHouseTypeId === houseType.id
                        ? 'bg-primary-50 text-primary-900 dark:bg-primary-950/30 dark:text-primary-100'
                        : 'hover:bg-primary-50/50 dark:hover:bg-primary-950/20'
                    }`}
                  >
                    <span className="font-semibold tabular-nums text-primary-700 dark:text-primary-200">{libraryIndex('HT', index)}</span>
                    <span className="min-w-0">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="block truncate font-medium text-slate-800 dark:text-slate-100">{houseType.name}</span>
                        {houseType.isIncomplete && (
                          <span className="shrink-0 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">Incomplete</span>
                        )}
                      </span>
                      {(houseType.style || houseType.configuration || houseType.storeys || houseType.bedrooms || houseType.garage !== undefined || houseType.privateDrive !== undefined) && (
                        <span className="mt-1 flex flex-wrap gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                          {houseType.style && <span>{houseTypeStyleLabel(houseType.style)}</span>}
                          {houseType.configuration && <span>{houseTypeConfigurationLabel(houseType.configuration)}</span>}
                          {houseType.storeys && <span>{houseTypeStoreysLabel(houseType.storeys)}</span>}
                          {houseType.bedrooms && <span>{houseType.bedrooms} bed</span>}
                          {houseType.garage !== undefined && <span>{houseType.garage ? 'Garage' : 'No garage'}</span>}
                          {houseType.privateDrive !== undefined && <span>{houseType.privateDrive ? 'Drive' : 'No drive'}</span>}
                        </span>
                      )}
                    </span>
                    <ChevronRight className="h-4 w-4 justify-self-end text-slate-400" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400">No house type defaults saved.</div>
            )}
          </div>
        </section>

        <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Other cost index</div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">AWD other cost sections</h2>
            </div>
            <Ruler className="h-4 w-4 text-primary-600 dark:text-primary-300" />
          </div>
          <div className="mt-3 max-h-44 overflow-y-auto rounded-app border border-slate-200 dark:border-slate-800">
            <div className="divide-y divide-slate-200 text-xs dark:divide-slate-800">
              {([
                ['INFRASTRUCTURE', 'Infrastructure'],
                ['PLOT_WORKS', 'Plot Works'],
                ['PRELIMS', 'Prelims'],
                ['ABNORMALS', 'Abnormals'],
              ] as Array<[AwdOtherCostSection, string]>).map(([id, label], index) => (
                <button
                  key={id}
                  type="button"
                  data-smoke={id === 'INFRASTRUCTURE'
                    ? 'appraisals-other-cost-infrastructure'
                    : id === 'PLOT_WORKS'
                      ? 'appraisals-other-cost-plot-works'
                      : id === 'PRELIMS'
                        ? 'appraisals-other-cost-prelims'
                        : 'appraisals-other-cost-abnormals'}
                  onClick={() => {
                    setSelectedOtherCostSection(id);
                    setSelectedHouseTypeId(null);
                  }}
                  className={`grid w-full grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                    selectedOtherCostSection === id
                      ? 'bg-primary-50 text-primary-900 dark:bg-primary-950/30 dark:text-primary-100'
                      : 'hover:bg-primary-50/50 dark:hover:bg-primary-950/20'
                  }`}
                >
                  <span className="font-semibold tabular-nums text-primary-700 dark:text-primary-200">{libraryIndex('OC', index)}</span>
                  <span className="truncate font-medium text-slate-800 dark:text-slate-100">{label}</span>
                  <ChevronRight className="h-4 w-4 justify-self-end text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        </section>
        </div>

        {isHouseTypeTradeUpdaterOpen && (
          <AppraisalSideDrawer
            title="House type trade updater"
            subtitle="Apply one trade's cost and base index across selected library house types. Blank cost rows are left unchanged."
            smokeId="appraisals-house-type-bulk-update-drawer"
            onClose={() => setIsHouseTypeTradeUpdaterOpen(false)}
            wide
          >
            <div className="space-y-4">
              <label className="block max-w-md">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Trade</span>
                <select
                  value={houseTypeTradeKey}
                  onChange={(event) => setHouseTypeTradeKey(event.target.value as AppraisalHouseTypeCostComponent['key'])}
                  className={`${inputClass()} mt-1`}
                >
                  {Object.entries(APPRAISAL_HOUSE_TYPE_COST_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </label>

              <div className="overflow-x-auto rounded-app border border-slate-200 dark:border-slate-800">
                <table className="min-w-[780px] w-full text-left text-xs">
                  <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2">House type</th>
                      <th className="px-3 py-2 text-right">Current cost</th>
                      <th className="px-3 py-2 text-right">New cost</th>
                      <th className="px-3 py-2 text-right">Base index</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-surface-900">
                    {houseTypes.map((houseType) => {
                      const component = (houseType.costBreakdown || []).find((entry) => entry.key === houseTypeTradeKey);
                      const update = houseTypeTradeUpdates[houseType.id] || { amount: '', priceIndex: '' };
                      return (
                        <tr key={houseType.id}>
                          <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-100">{houseType.name}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">{money(component?.amount || 0)}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              value={update.amount}
                              onChange={(event) => updateHouseTypeTradeDraft(houseType.id, { amount: event.target.value })}
                              placeholder="Leave blank to keep"
                              className={inputClass('text-right')}
                              aria-label={`${houseType.name} new ${APPRAISAL_HOUSE_TYPE_COST_LABELS[houseTypeTradeKey]} cost`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              value={update.priceIndex}
                              onChange={(event) => updateHouseTypeTradeDraft(houseType.id, { priceIndex: event.target.value })}
                              placeholder={String(component?.priceIndex || APPRAISAL_HOUSE_TYPE_DEFAULT_PRICE_INDEX)}
                              className={inputClass('text-right')}
                              aria-label={`${houseType.name} ${APPRAISAL_HOUSE_TYPE_COST_LABELS[houseTypeTradeKey]} base index`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                <button type="button" onClick={() => setIsHouseTypeTradeUpdaterOpen(false)} className="workspace-secondary-btn px-3 py-2 text-xs">
                  Cancel
                </button>
                <button type="button" onClick={applyHouseTypeTradeUpdates} className="workspace-primary-btn px-3 py-2 text-xs">
                  <Save className="h-4 w-4" />
                  Apply to library
                </button>
              </div>
            </div>
          </AppraisalSideDrawer>
        )}

        {isHouseTypeElementalImportOpen && (
          <AppraisalSideDrawer
            title="Import house type elemental rates"
            subtitle="Upload the House Type Elemental Appraisal Value workbook to review proposed library rates. Each house type remains unchanged until you confirm its individual update."
            smokeId="appraisals-house-type-elemental-import-drawer"
            onClose={() => setIsHouseTypeElementalImportOpen(false)}
            wide
          >
            <div className="space-y-4">
              <div className="rounded-app border border-primary-200 bg-primary-50 p-3 text-xs leading-5 text-primary-900 dark:border-primary-900/70 dark:bg-primary-950/30 dark:text-primary-100">
                Proposed values are set at base cost index {HOUSE_TYPE_ELEMENTAL_IMPORT_PRICE_INDEX}. The import uses the 450mm Brickwork substructure basis, excludes the 675mm alternative, and separates the ASHP premium from the GSH-equivalent plumbing and heating rate.
              </div>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-app border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs transition hover:border-primary-400 hover:bg-primary-50/50 dark:border-slate-700 dark:bg-surface-950 dark:hover:border-primary-700 dark:hover:bg-primary-950/20">
                <span className="min-w-0">
                  <span className="block font-semibold text-slate-800 dark:text-slate-100">{houseTypeElementalImportFileName || 'Choose elemental appraisal workbook'}</span>
                  <span className="mt-1 block text-slate-500 dark:text-slate-400">Requires the Summary and Plumbing & Heating worksheets.</span>
                </span>
                <span className="workspace-secondary-btn shrink-0 px-3 py-2 text-xs">
                  <FileUp className="h-4 w-4" />
                  {isHouseTypeElementalImporting ? 'Reading…' : 'Select file'}
                </span>
                <input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="sr-only"
                  disabled={isHouseTypeElementalImporting}
                  onChange={(event) => { void handleHouseTypeElementalImport(event.target.files?.[0]); event.currentTarget.value = ''; }}
                />
              </label>
              {houseTypeElementalImportProposals.length > 0 && (
                <div className="overflow-x-auto rounded-app border border-slate-200 dark:border-slate-800">
                  <table className="min-w-[840px] w-full text-left text-xs">
                    <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
                      <tr>
                        <th className="px-3 py-2">House type</th>
                        <th className="px-3 py-2 text-right">Current total</th>
                        <th className="px-3 py-2 text-right">Proposed total</th>
                        <th className="px-3 py-2 text-right">Current £/m2</th>
                        <th className="px-3 py-2 text-right">Proposed £/m2</th>
                        <th className="px-3 py-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-surface-900">
                      {houseTypeElementalImportProposals.map((proposal) => (
                        <tr key={proposal.id} className={proposal.applied ? 'bg-slate-50 text-slate-400 dark:bg-slate-950/50 dark:text-slate-500' : undefined}>
                          <td className="px-3 py-2">
                            <div className={`font-semibold ${proposal.applied ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                              {proposal.houseTypeName}
                              {proposal.applied && <span className="ml-2 rounded-full border border-slate-300 bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-400">Updated</span>}
                            </div>
                            <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">Source: {proposal.sourceName}</div>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">{money(proposal.currentTotal)}</td>
                          <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-800 dark:text-slate-100">{money(proposal.proposedTotal)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">{money(proposal.currentRatePerM2)}</td>
                          <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-800 dark:text-slate-100">{money(proposal.proposedRatePerM2)}</td>
                          <td className="px-3 py-2 text-right">
                            <button type="button" onClick={() => void applyHouseTypeElementalProposal(proposal)} disabled={proposal.applied} className="workspace-primary-btn px-3 py-2 text-xs disabled:cursor-default disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:border-slate-700 dark:disabled:bg-slate-800 dark:disabled:text-slate-400">
                              <Save className="h-4 w-4" />
                              {proposal.applied ? 'Updated' : 'Update'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </AppraisalSideDrawer>
        )}

        <section data-smoke="appraisals-library-inspector" className="min-h-[34rem] rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
          {selectedHouseType ? (
            <div data-smoke="appraisals-house-build-up-drawer" className="flex h-full min-h-0 flex-col">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">House type detail</div>
                  <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">{selectedHouseType.name}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Edit the standard house details and build-up costs for this plot type.
                  </p>
                </div>
                <button type="button" onClick={() => setSelectedHouseTypeId(null)} className="workspace-secondary-btn px-3 py-2 text-xs">
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="space-y-4">
                  <div className="rounded-app border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-surface-950">
                    <div className="grid gap-3 lg:grid-cols-[1.25fr_0.8fr_0.85fr_0.55fr_0.55fr_0.55fr_0.55fr_0.65fr_0.55fr_0.55fr]">
                      <label className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">House type</span>
                        <input
                          data-smoke="appraisals-house-type-name"
                          value={selectedHouseType.name}
                          onChange={(event) => updateHouseType(selectedHouseType.id, { name: event.target.value })}
                          className={inputClass()}
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Style</span>
                        <select
                          value={selectedHouseType.style || ''}
                          onChange={(event) => updateHouseType(selectedHouseType.id, { style: event.target.value ? event.target.value as AppraisalHouseTypeStyle : undefined })}
                          className={inputClass()}
                        >
                          <option value="">Select style</option>
                          {APPRAISAL_HOUSE_TYPE_STYLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Configuration</span>
                        <select
                          value={selectedHouseType.configuration || ''}
                          onChange={(event) => updateHouseType(selectedHouseType.id, { configuration: event.target.value ? event.target.value as AppraisalHouseTypeConfiguration : undefined })}
                          className={inputClass()}
                        >
                          <option value="">Select</option>
                          {APPRAISAL_HOUSE_TYPE_CONFIGURATION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Storeys</span>
                        <select
                          value={selectedHouseType.storeys ?? ''}
                          onChange={(event) => updateHouseType(selectedHouseType.id, { storeys: event.target.value ? Number.parseFloat(event.target.value) : undefined })}
                          className={inputClass('text-right')}
                        >
                          <option value="">-</option>
                          {HOUSE_TYPE_STOREY_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Bedrooms</span>
                        <select
                          value={selectedHouseType.bedrooms ?? ''}
                          onChange={(event) => updateHouseType(selectedHouseType.id, { bedrooms: event.target.value ? Number.parseInt(event.target.value, 10) : undefined })}
                          className={inputClass('text-right')}
                        >
                          <option value="">-</option>
                          {HOUSE_TYPE_BEDROOM_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Garage</span>
                        <select
                          value={selectedHouseType.garage === undefined ? '' : selectedHouseType.garage ? 'YES' : 'NO'}
                          onChange={(event) => updateHouseType(selectedHouseType.id, { garage: event.target.value === '' ? undefined : event.target.value === 'YES' })}
                          className={inputClass()}
                        >
                          <option value="">-</option>
                          <option value="YES">Yes</option>
                          <option value="NO">No</option>
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Private drive</span>
                        <select
                          value={selectedHouseType.privateDrive === undefined ? '' : selectedHouseType.privateDrive ? 'YES' : 'NO'}
                          onChange={(event) => updateHouseType(selectedHouseType.id, { privateDrive: event.target.value === '' ? undefined : event.target.value === 'YES' })}
                          className={inputClass()}
                        >
                          <option value="">-</option>
                          <option value="YES">Yes</option>
                          <option value="NO">No</option>
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">GIFA m2</span>
                        <input
                          data-smoke="appraisals-house-type-gifa"
                          type="number"
                          value={selectedHouseType.gifaM2}
                          onChange={(event) => updateHouseType(selectedHouseType.id, { gifaM2: numberValue(event.target.value) })}
                          className={inputClass('text-right')}
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Build cost/m2</span>
                        <input
                          data-smoke="appraisals-house-type-cost"
                          type="number"
                          value={Math.round(calculateHouseTypeLibraryBuildCostPerM2(selectedHouseType))}
                          onChange={(event) => updateHouseType(selectedHouseType.id, { buildCostPerM2: numberValue(event.target.value) })}
                          disabled={selectedHouseTypeBreakdownTotal > 0}
                          className={inputClass('text-right disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-400')}
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Build months</span>
                        <input
                          type="number"
                          value={selectedHouseType.buildPeriodMonths || 0}
                          onChange={(event) => updateHouseType(selectedHouseType.id, { buildPeriodMonths: Math.max(1, Math.round(numberValue(event.target.value))) })}
                          className={inputClass('text-right')}
                        />
                      </label>
                    </div>
                    <label className="mt-3 block space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Notes</span>
                      <input
                        value={selectedHouseType.notes || ''}
                        onChange={(event) => updateHouseType(selectedHouseType.id, { notes: event.target.value })}
                        placeholder="Optional notes"
                        tabIndex={-1}
                        className={inputClass()}
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <MetricTile label="Component total" value={money(selectedHouseTypeBreakdownTotal)} />
                    <MetricTile label="Derived cost/m2" value={money(selectedHouseTypeBuildCost)} />
                  </div>

                  <div className="overflow-x-auto rounded-app border border-slate-200 dark:border-slate-800">
                    <table className="min-w-[1040px] w-full text-left text-xs">
                      <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
                        <tr>
                          <th className="px-3 py-2">Element</th>
                          <th className="px-3 py-2 text-center">Include</th>
                          <th className="px-3 py-2 text-right">Amount/house</th>
                          <th className="px-3 py-2 text-right">Base index</th>
                          <th className="px-3 py-2 text-right">Cost/m2</th>
                          <th className="px-3 py-2">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-surface-900">
                        {selectedHouseTypeBreakdown.map((component) => {
                          const optional = isOptionalHouseTypeCostComponent(component.key);
                          const included = component.included !== false;
                          const componentRate = selectedHouseType.gifaM2 > 0 && included ? component.amount / selectedHouseType.gifaM2 : 0;
                          return (
                            <tr key={component.key}>
                              <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-100">
                                {APPRAISAL_HOUSE_TYPE_COST_LABELS[component.key]}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {optional ? (
                                  <input
                                    type="checkbox"
                                    checked={included}
                                    onChange={(event) => updateHouseTypeCostComponent(selectedHouseType, component.key, { included: event.target.checked })}
                                    className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 dark:border-slate-700 dark:bg-surface-900"
                                    aria-label={`Include ${APPRAISAL_HOUSE_TYPE_COST_LABELS[component.key]} cost`}
                                  />
                                ) : (
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Included</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  value={component.amount || 0}
                                  onChange={(event) => updateHouseTypeCostComponent(selectedHouseType, component.key, { amount: numberValue(event.target.value) })}
                                  placeholder={`${APPRAISAL_HOUSE_TYPE_COST_LABELS[component.key]} cost`}
                                  className={inputClass('text-right')}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={component.priceIndex || APPRAISAL_HOUSE_TYPE_DEFAULT_PRICE_INDEX}
                                  onChange={(event) => updateHouseTypeCostComponent(selectedHouseType, component.key, { priceIndex: numberValue(event.target.value) })}
                                  placeholder="Base index"
                                  className={inputClass('text-right')}
                                  aria-label={`${APPRAISAL_HOUSE_TYPE_COST_LABELS[component.key]} base price index`}
                                />
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-slate-700 dark:text-slate-200">{money(componentRate)}</td>
                              <td className="px-3 py-2">
                                <input
                                  value={component.notes || ''}
                                  onChange={(event) => updateHouseTypeCostComponent(selectedHouseType, component.key, { notes: event.target.value })}
                                  placeholder={`${APPRAISAL_HOUSE_TYPE_COST_LABELS[component.key]} notes`}
                                  tabIndex={-1}
                                  className={inputClass()}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedOtherCostSection ? (
            <div data-smoke="appraisals-other-cost-drawer" className="flex h-full min-h-0 flex-col">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Other cost detail</div>
                  <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">{selectedOtherCostSectionLabel}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {selectedOtherCostSection === 'INFRASTRUCTURE'
                      ? 'Infrastructure base rates exclude removal of existing structures, removal of existing surfaces and alterations; these are held in Abnormals.'
                      : selectedOtherCostSection === 'PLOT_WORKS'
                        ? 'Plot Works uses the workbook Plot Works column B base formulas.'
                        : selectedOtherCostSection === 'PRELIMS'
                          ? 'Prelims uses the workbook Prelims column B base formulas, grouped into collapsible sections.'
                          : 'Removal of existing structures, removal of existing surfaces and alterations are abnormal allowances, excluded from base infrastructure.'}
                  </p>
                </div>
                <button type="button" onClick={() => setSelectedOtherCostSection(null)} className="workspace-secondary-btn px-3 py-2 text-xs">
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {selectedOtherCostSection === 'INFRASTRUCTURE' || selectedOtherCostSection === 'PLOT_WORKS' || selectedOtherCostSection === 'PRELIMS' || selectedOtherCostSection === 'ABNORMALS' ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-app border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-surface-950">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedOtherCostSectionLabel} rates</h4>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {selectedOtherCostSection === 'INFRASTRUCTURE'
                            ? 'AWD Infrastructure rates use cost drivers such as total units, site area, roads, boundaries, and fixed sums.'
                            : selectedOtherCostSection === 'PLOT_WORKS'
                              ? 'AWD Plot Works rates use drives, footpaths, front garden, rear garden, and total-unit drivers.'
                              : selectedOtherCostSection === 'ABNORMALS' ? 'Abnormal rates cover existing structure removal, surface removal and alterations. They are excluded from the infrastructure base.' : 'AWD Prelims rates use design, statutory, staffing, accommodation, site, legal, and sales sections.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(selectedOtherCostSection === 'INFRASTRUCTURE' || selectedOtherCostSection === 'ABNORMALS')
                          ? handleLoadAwdInfrastructurePack
                          : selectedOtherCostSection === 'PLOT_WORKS'
                            ? handleLoadAwdPlotWorksPack
                            : handleLoadAwdPrelimsPack}
                        className="workspace-secondary-btn px-3 py-2 text-xs"
                        title={`${selectedOtherCostDefinitionCount} base rates from ${selectedOtherCostSectionLabel} column B. Revised costs ignored.`}
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        {selectedOtherCostLoadedCount > 0 ? `Update ${selectedOtherCostSectionLabel} rates` : `Load ${selectedOtherCostSectionLabel}`}
                      </button>
                    </div>

                    {selectedOtherCostSection === 'INFRASTRUCTURE' && (
                      <div className="grid gap-2 lg:grid-cols-[0.95fr_1fr_0.48fr_0.66fr_0.58fr_auto]">
                        <select
                          value={rateDraft.costDriver}
                          onChange={(event) => handleRateCostDriverChange(event.target.value as AppraisalInfrastructureCostDriver)}
                          className={inputClass(rateDraft.costDriver ? '' : 'text-slate-400 dark:text-slate-500')}
                          aria-label="Infrastructure cost driver"
                        >
                          <option value="" disabled>Cost driver</option>
                          {APPRAISAL_INFRASTRUCTURE_COST_DRIVER_OPTIONS.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                        <input
                          data-smoke="appraisals-rate-label"
                          value={rateDraft.label}
                          onChange={(event) => setRateDraft((current) => ({ ...current, label: event.target.value }))}
                          placeholder="Infrastructure item"
                          className={inputClass()}
                        />
                        <select
                          value={rateDraft.unit}
                          onChange={(event) => setRateDraft((current) => ({ ...current, unit: event.target.value as AppraisalSiteDimensionRow['unit'] }))}
                          className={inputClass(rateDraft.unit ? '' : 'text-slate-400 dark:text-slate-500')}
                          aria-label="Infrastructure unit"
                        >
                          <option value="" disabled>Unit</option>
                          <option value="m2">m2</option>
                          <option value="m">m</option>
                          <option value="nr">nr</option>
                          <option value="sum">sum</option>
                        </select>
                        <input
                          data-smoke="appraisals-rate-value"
                          type="number"
                          value={rateDraft.rate}
                          onChange={(event) => setRateDraft((current) => ({ ...current, rate: event.target.value }))}
                          placeholder="Rate per m2/m/nr/sum"
                          className={inputClass('text-right')}
                          aria-label="Rate value"
                        />
                        <input
                          type="number"
                          value={rateDraft.priceIndex}
                          onChange={(event) => setRateDraft((current) => ({ ...current, priceIndex: event.target.value }))}
                          placeholder="Price index"
                          className={inputClass('text-right')}
                          aria-label="Infrastructure price index"
                        />
                        <button type="button" data-smoke="appraisals-rate-create" onClick={onCreateRate} className="workspace-primary-btn px-3 py-2 text-xs">
                          <Plus className="h-4 w-4" />
                          Add
                        </button>
                      </div>
                    )}

                    {selectedOtherCostSection === 'PRELIMS' ? (
                      <div className="space-y-3">
                        {AWD_PRELIMS_RATE_SECTIONS.map((section) => {
                          const sectionRates = prelimsRates.filter((rate) => getAwdPrelimsRateSection(rate) === section.id);
                          const collapsed = collapsedPrelimsSections.has(section.id);
                          return (
                            <section key={section.id} data-smoke={`appraisals-prelims-section-${section.id.toLowerCase()}`} className="rounded-app border border-slate-200 bg-white dark:border-slate-800 dark:bg-surface-900">
                              <button
                                type="button"
                                onClick={() => togglePrelimsSection(section.id)}
                                className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-surface-800"
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  <ChevronRight className={`h-4 w-4 shrink-0 text-slate-400 transition ${collapsed ? '' : 'rotate-90'}`} />
                                  <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{section.label}</span>
                                </span>
                                <span className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-300">{sectionRates.length} rows</span>
                              </button>
                              {!collapsed && (
                                <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-800">
                                  <table className="min-w-[900px] w-full text-left text-xs">
                                    <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
                                      <tr>
                                        <th className="px-3 py-2">Index</th>
                                        <th className="px-3 py-2">Cost driver</th>
                                        <th className="px-3 py-2">Label</th>
                                        <th className="px-3 py-2">Unit</th>
                                        <th className="px-3 py-2 text-right">Rate</th>
                                        <th className="px-3 py-2 text-right">Price index</th>
                                        <th className="px-3 py-2">Notes</th>
                                        <th className="px-3 py-2"></th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-surface-900">
                                      {sectionRates.map((rate, index) => (
                                        <React.Fragment key={rate.id}>
                                          <tr>
                                            <td className="px-3 py-2 font-semibold tabular-nums text-primary-700 dark:text-primary-200">{libraryIndex('PRE', index)}</td>
                                            <td className="px-3 py-2">
                                              <select
                                                value={rate.costDriver || ''}
                                                onChange={(event) => {
                                                  const costDriver = event.target.value as AppraisalInfrastructureCostDriver | '';
                                                  updateRate(rate.id, costDriver
                                                    ? {
                                                        costDriver,
                                                        category: infrastructureCostDriverToCategory(costDriver),
                                                        unit: getInfrastructureCostDriverUnit(costDriver, rate.unit),
                                                      }
                                                    : { costDriver: undefined, category: 'OTHER' }
                                                  );
                                                }}
                                                className={inputClass()}
                                              >
                                                <option value="">Manual quantity</option>
                                                {APPRAISAL_INFRASTRUCTURE_COST_DRIVER_OPTIONS.map(({ value, label }) => (
                                                  <option key={value} value={value}>{label}</option>
                                                ))}
                                              </select>
                                            </td>
                                            <td className="px-3 py-2"><input data-smoke={`appraisals-rate-row-label-${rate.id}`} value={rate.label} onChange={(event) => updateRate(rate.id, { label: event.target.value })} className={inputClass()} /></td>
                                            <td className="px-3 py-2">
                                              <select value={rate.unit} onChange={(event) => updateRate(rate.id, { unit: event.target.value as AppraisalSiteDimensionRow['unit'] })} className={inputClass()}>
                                                <option value="m2">m2</option>
                                                <option value="m">m</option>
                                                <option value="nr">nr</option>
                                                <option value="sum">sum</option>
                                              </select>
                                            </td>
                                            <td className="px-3 py-2"><input type="number" value={rate.rate} onChange={(event) => updateRate(rate.id, { rate: numberValue(event.target.value) })} className={inputClass('text-right')} /></td>
                                            <td className="px-3 py-2"><input type="number" value={rate.priceIndex || 0} onChange={(event) => updateRate(rate.id, { priceIndex: numberValue(event.target.value) })} className={inputClass('text-right')} /></td>
                                            <td className="px-3 py-2"><input value={rate.notes || ''} onChange={(event) => updateRate(rate.id, { notes: event.target.value })} tabIndex={-1} className={inputClass()} /></td>
                                            <td className="px-3 py-2 text-right">
                                              <button type="button" onClick={() => removeRate(rate.id)} className="rounded-app-sm border border-slate-200 p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:hover:bg-rose-950/30 dark:hover:text-rose-200" aria-label="Delete rate">
                                                <Trash2 className="h-4 w-4" />
                                              </button>
                                            </td>
                                          </tr>
                                          {rate.formulaComponents && rate.formulaComponents.length > 0 && (
                                            <tr data-smoke={`appraisals-formula-build-up-${rate.id}`} className="bg-primary-50/40 dark:bg-primary-950/10">
                                              <td colSpan={8} className="px-3 py-3">
                                                <div className="rounded-app-sm border border-primary-100 bg-white p-3 dark:border-primary-900/60 dark:bg-surface-950">
                                                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-700 dark:text-primary-200">Formula build-up</div>
                                                  <div className="mt-2 overflow-x-auto">
                                                    <table className="min-w-[720px] w-full text-left text-[11px]">
                                                      <thead className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
                                                        <tr>
                                                          <th className="py-1 pr-3">Component</th>
                                                          <th className="py-1 pr-3">Site driver</th>
                                                          <th className="py-1 pr-3 text-right">Rate</th>
                                                          <th className="py-1 pr-3">Source</th>
                                                        </tr>
                                                      </thead>
                                                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                        {rate.formulaComponents.map((component) => (
                                                          <tr key={component.id}>
                                                            <td className="py-1.5 pr-3 font-semibold text-slate-800 dark:text-slate-100">{component.label}</td>
                                                            <td className="py-1.5 pr-3 text-slate-600 dark:text-slate-300">
                                                              {component.costDriver ? APPRAISAL_INFRASTRUCTURE_COST_DRIVER_LABELS[component.costDriver] : 'Fixed allowance'}
                                                            </td>
                                                            <td className="py-1.5 pr-3 text-right font-semibold tabular-nums text-slate-800 dark:text-slate-100">{money(component.rate)}</td>
                                                            <td className="py-1.5 pr-3 text-slate-500 dark:text-slate-400">{component.sourceFormula || component.notes || '-'}</td>
                                                          </tr>
                                                        ))}
                                                      </tbody>
                                                    </table>
                                                  </div>
                                                </div>
                                              </td>
                                            </tr>
                                          )}
                                        </React.Fragment>
                                      ))}
                                      {sectionRates.length === 0 && (
                                        <tr>
                                          <td colSpan={8} className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400">No {section.label.toLowerCase()} rates saved.</td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </section>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-app border border-slate-200 dark:border-slate-800">
                        <table className="min-w-[900px] w-full text-left text-xs">
                          <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
                            <tr>
                              <th className="px-3 py-2">Index</th>
                              <th className="px-3 py-2">Cost driver</th>
                              <th className="px-3 py-2">Label</th>
                              <th className="px-3 py-2">Unit</th>
                              <th className="px-3 py-2 text-right">Rate</th>
                              <th className="px-3 py-2 text-right">Price index</th>
                              <th className="px-3 py-2">Notes</th>
                              <th className="px-3 py-2"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-surface-900">
                            {selectedOtherCostRates.map((rate, index) => (
                              <tr key={rate.id}>
                                <td className="px-3 py-2 font-semibold tabular-nums text-primary-700 dark:text-primary-200">{libraryIndex(selectedOtherCostSection === 'ABNORMALS' ? 'ABN' : selectedOtherCostSection === 'PLOT_WORKS' ? 'PW' : 'INF', index)}</td>
                                <td className="px-3 py-2">
                                  <select
                                    value={rate.costDriver || ''}
                                    onChange={(event) => {
                                      const costDriver = event.target.value as AppraisalInfrastructureCostDriver | '';
                                      updateRate(rate.id, costDriver
                                        ? {
                                            costDriver,
                                            category: infrastructureCostDriverToCategory(costDriver),
                                            unit: getInfrastructureCostDriverUnit(costDriver, rate.unit),
                                          }
                                        : { costDriver: undefined, category: 'OTHER' }
                                      );
                                    }}
                                    className={inputClass()}
                                  >
                                    <option value="">Manual quantity</option>
                                    {APPRAISAL_INFRASTRUCTURE_COST_DRIVER_OPTIONS.map(({ value, label }) => (
                                      <option key={value} value={value}>{label}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-3 py-2"><input data-smoke={`appraisals-rate-row-label-${rate.id}`} value={rate.label} onChange={(event) => updateRate(rate.id, { label: event.target.value })} className={inputClass()} /></td>
                                <td className="px-3 py-2">
                                  <select value={rate.unit} onChange={(event) => updateRate(rate.id, { unit: event.target.value as AppraisalSiteDimensionRow['unit'] })} className={inputClass()}>
                                    <option value="m2">m2</option>
                                    <option value="m">m</option>
                                    <option value="nr">nr</option>
                                    <option value="sum">sum</option>
                                  </select>
                                </td>
                                <td className="px-3 py-2"><input type="number" value={rate.rate} onChange={(event) => updateRate(rate.id, { rate: numberValue(event.target.value) })} className={inputClass('text-right')} /></td>
                                <td className="px-3 py-2"><input type="number" value={rate.priceIndex || 0} onChange={(event) => updateRate(rate.id, { priceIndex: numberValue(event.target.value) })} className={inputClass('text-right')} /></td>
                                <td className="px-3 py-2"><input value={rate.notes || ''} onChange={(event) => updateRate(rate.id, { notes: event.target.value })} tabIndex={-1} className={inputClass()} /></td>
                                <td className="px-3 py-2 text-right">
                                  <button type="button" onClick={() => removeRate(rate.id)} className="rounded-app-sm border border-slate-200 p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:hover:bg-rose-950/30 dark:hover:text-rose-200" aria-label="Delete rate">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {selectedOtherCostRates.length === 0 && (
                              <tr>
                                <td colSpan={8} className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400">No {selectedOtherCostSectionLabel.toLowerCase()} rates saved.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-app border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-surface-950">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-app border border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300">
                      <Ruler className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedOtherCostSectionLabel} has no rate rows yet</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                      The AWD library now has a place for this section, but the detailed formulas have only been built for Infrastructure so far.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[28rem] flex-col items-center justify-center rounded-app border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-surface-950">
              <div className="flex h-12 w-12 items-center justify-center rounded-app border border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300">
                <ChevronRight className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Select an index row</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                Choose a house type or other cost section on the left to view and edit its detail here.
              </p>
            </div>
          )}
        </section>
      </div>

      {false && (
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <section className="workspace-sidebar p-4">
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-primary-600 dark:text-primary-300" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Appraisal library</div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">House type cost defaults</h2>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-app border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-surface-900">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Add standard house types here, then use the build-up icon on a row to view or edit component costs.
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                data-smoke="appraisals-house-type-load-defaults"
                onClick={handleLoadDetailedHouseTypeDefaults}
                className="workspace-secondary-btn px-3 py-2 text-xs"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Load detailed defaults
              </button>
              <button
                type="button"
                data-smoke="appraisals-house-type-create"
                onClick={handleAddStandardHouseType}
                className="workspace-primary-btn px-3 py-2 text-xs"
              >
                <Plus className="h-4 w-4" />
                Add standard house type
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-app border border-slate-200 dark:border-slate-800">
            <table className="min-w-[1220px] w-full table-fixed text-left text-xs">
              <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
                <tr>
                  <th className="w-20 px-3 py-2">Index</th>
                  <th className="w-40 px-3 py-2">House type</th>
                  <th className="w-32 px-3 py-2 text-right">GIFA m2</th>
                  <th className="w-36 px-3 py-2 text-right">Component total</th>
                  <th className="w-36 px-3 py-2 text-right">Build cost/m2</th>
                  <th className="w-32 px-3 py-2 text-right">Price index</th>
                  <th className="w-32 px-3 py-2 text-right">Build months</th>
                  <th className="px-3 py-2">Notes</th>
                  <th className="w-24 px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-surface-900">
                {houseTypes.map((houseType, index) => (
                  <tr key={houseType.id}>
                    <td className="whitespace-nowrap px-3 py-2 font-semibold tabular-nums text-primary-700 dark:text-primary-200">{libraryIndex('HT', index)}</td>
                    <td className="px-3 py-2"><input data-smoke={index === 0 ? 'appraisals-house-type-name' : undefined} value={houseType.name} onChange={(event) => updateHouseType(houseType.id, { name: event.target.value })} className={inputClass()} /></td>
                    <td className="px-3 py-2"><input data-smoke={index === 0 ? 'appraisals-house-type-gifa' : undefined} type="number" value={houseType.gifaM2} onChange={(event) => updateHouseType(houseType.id, { gifaM2: numberValue(event.target.value) })} className={inputClass('text-right')} /></td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-800 dark:text-slate-100">{money(calculateHouseTypeCostBreakdownTotal(houseType.costBreakdown))}</td>
                    <td className="px-3 py-2">
                      <input
                        data-smoke={index === 0 ? 'appraisals-house-type-cost' : undefined}
                        type="number"
                        value={Math.round(calculateHouseTypeLibraryBuildCostPerM2(houseType))}
                        onChange={(event) => updateHouseType(houseType.id, { buildCostPerM2: numberValue(event.target.value) })}
                        disabled={calculateHouseTypeCostBreakdownTotal(houseType.costBreakdown) > 0}
                        className={inputClass('text-right disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-400')}
                      />
                    </td>
                    <td className="px-3 py-2"><input type="number" value={houseType.priceIndex || 0} onChange={(event) => updateHouseType(houseType.id, { priceIndex: numberValue(event.target.value) })} className={inputClass('text-right')} /></td>
                    <td className="px-3 py-2"><input type="number" value={houseType.buildPeriodMonths || 0} onChange={(event) => updateHouseType(houseType.id, { buildPeriodMonths: Math.max(1, Math.round(numberValue(event.target.value))) })} className={inputClass('text-right')} /></td>
                    <td className="px-3 py-2"><input value={houseType.notes || ''} onChange={(event) => updateHouseType(houseType.id, { notes: event.target.value })} tabIndex={-1} className={inputClass()} /></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedHouseTypeId(houseType.id)}
                          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-app-sm border transition ${selectedHouseTypeId === houseType.id ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-200' : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}
                          aria-label="Edit house type cost breakdown"
                        >
                          <ListChecks className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => removeHouseType(houseType.id)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-app-sm border border-slate-200 text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:hover:bg-rose-950/30 dark:hover:text-rose-200" aria-label="Delete house type">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {houseTypes.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400">No house type defaults saved.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </section>

        {selectedHouseType && (
          <AppraisalSideDrawer
            title="House cost build-up"
            subtitle="View or edit component costs for this standard house type."
            smokeId="appraisals-house-build-up-drawer"
            onClose={() => setSelectedHouseTypeId(null)}
            wide
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-app border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-surface-900">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Standard house type</div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedHouseType.name}</h3>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <MetricTile label="Component total" value={money(selectedHouseTypeBreakdownTotal)} />
                  <MetricTile label="Derived cost/m2" value={money(selectedHouseTypeBuildCost)} />
                </div>
              </div>
              {selectedHouseType.isIncomplete && (
                <div className="rounded-app border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
                  {selectedHouseType.incompleteWarning || 'This library record is incomplete. Complete its house data and trade build-up before using it in an appraisal.'}
                </div>
              )}
              <div className="max-h-[calc(100vh-16rem)] overflow-y-auto rounded-app border border-slate-200 dark:border-slate-800">
                <table className="min-w-[920px] w-full text-left text-xs">
                  <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Element</th>
                      <th className="px-3 py-2 text-center">Include</th>
                      <th className="px-3 py-2 text-right">Amount/house</th>
                      <th className="px-3 py-2 text-right">Cost/m2</th>
                      <th className="px-3 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-surface-900">
                    {selectedHouseTypeBreakdown.map((component) => {
                      const optional = isOptionalHouseTypeCostComponent(component.key);
                      const included = component.included !== false;
                      const componentRate = selectedHouseType.gifaM2 > 0 && included ? component.amount / selectedHouseType.gifaM2 : 0;
                      return (
                        <tr key={component.key}>
                          <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-100">
                            {APPRAISAL_HOUSE_TYPE_COST_LABELS[component.key]}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {optional ? (
                              <input
                                type="checkbox"
                                checked={included}
                                onChange={(event) => updateHouseTypeCostComponent(selectedHouseType, component.key, { included: event.target.checked })}
                                className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 dark:border-slate-700 dark:bg-surface-900"
                                aria-label={`Include ${APPRAISAL_HOUSE_TYPE_COST_LABELS[component.key]} cost`}
                              />
                            ) : (
                              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Included</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={component.amount || 0}
                              onChange={(event) => updateHouseTypeCostComponent(selectedHouseType, component.key, { amount: numberValue(event.target.value) })}
                              placeholder={`${APPRAISAL_HOUSE_TYPE_COST_LABELS[component.key]} cost`}
                              className={inputClass('text-right')}
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-slate-700 dark:text-slate-200">{money(componentRate)}</td>
                          <td className="px-3 py-2">
                              <input
                                value={component.notes || ''}
                                onChange={(event) => updateHouseTypeCostComponent(selectedHouseType, component.key, { notes: event.target.value })}
                                placeholder={`${APPRAISAL_HOUSE_TYPE_COST_LABELS[component.key]} notes`}
                                tabIndex={-1}
                                className={inputClass()}
                              />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </AppraisalSideDrawer>
        )}

        <section className="workspace-sidebar p-4">
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-primary-600 dark:text-primary-300" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Appraisal library</div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Infrastructure rates</h2>
            </div>
            <button
              type="button"
              onClick={handleLoadAwdInfrastructurePack}
              className="workspace-secondary-btn px-3 py-2 text-xs"
              title={`${AWD_INFRASTRUCTURE_RATE_DEFINITIONS.length} base rates from Infrastructure column B. Revised costs ignored.`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {awdPackLoadedCount > 0 ? 'Update AWD pack rates' : 'Load AWD pack'}
            </button>
          </div>

          <div className="mt-4 grid gap-2 lg:grid-cols-[0.95fr_1fr_0.48fr_0.66fr_0.58fr_auto]">
            <select
              value={rateDraft.costDriver}
              onChange={(event) => handleRateCostDriverChange(event.target.value as AppraisalInfrastructureCostDriver)}
              className={inputClass(rateDraft.costDriver ? '' : 'text-slate-400 dark:text-slate-500')}
              aria-label="Infrastructure cost driver"
            >
              <option value="" disabled>Cost driver</option>
              {APPRAISAL_INFRASTRUCTURE_COST_DRIVER_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <input
              data-smoke="appraisals-rate-label"
              value={rateDraft.label}
              onChange={(event) => setRateDraft((current) => ({ ...current, label: event.target.value }))}
              placeholder="Infrastructure item"
              className={inputClass()}
            />
            <select
              value={rateDraft.unit}
              onChange={(event) => setRateDraft((current) => ({ ...current, unit: event.target.value as AppraisalSiteDimensionRow['unit'] }))}
              className={inputClass(rateDraft.unit ? '' : 'text-slate-400 dark:text-slate-500')}
              aria-label="Infrastructure unit"
            >
              <option value="" disabled>Unit</option>
              <option value="m2">m2</option>
              <option value="m">m</option>
              <option value="nr">nr</option>
              <option value="sum">sum</option>
            </select>
            <input
              data-smoke="appraisals-rate-value"
              type="number"
              value={rateDraft.rate}
              onChange={(event) => setRateDraft((current) => ({ ...current, rate: event.target.value }))}
              placeholder="Rate per m2/m/nr/sum"
              className={inputClass('text-right')}
              aria-label="Rate value"
            />
            <input
              type="number"
              value={rateDraft.priceIndex}
              onChange={(event) => setRateDraft((current) => ({ ...current, priceIndex: event.target.value }))}
              placeholder="Price index"
              className={inputClass('text-right')}
              aria-label="Infrastructure price index"
            />
            <button type="button" data-smoke="appraisals-rate-create" onClick={onCreateRate} className="workspace-primary-btn px-3 py-2 text-xs">
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>

          <div className="mt-4 overflow-x-auto rounded-app border border-slate-200 dark:border-slate-800">
            <table className="min-w-[900px] w-full text-left text-xs">
              <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2">Index</th>
                  <th className="px-3 py-2">Cost driver</th>
                  <th className="px-3 py-2">Label</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">Price index</th>
                  <th className="px-3 py-2">Notes</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-surface-900">
                {rates.map((rate, index) => (
                  <tr key={rate.id}>
                    <td className="px-3 py-2 font-semibold tabular-nums text-primary-700 dark:text-primary-200">{libraryIndex('INF', index)}</td>
                    <td className="px-3 py-2">
                      <select
                        value={rate.costDriver || ''}
                        onChange={(event) => {
                          const costDriver = event.target.value as AppraisalInfrastructureCostDriver | '';
                          updateRate(rate.id, costDriver
                            ? {
                                costDriver,
                                category: infrastructureCostDriverToCategory(costDriver),
                                unit: getInfrastructureCostDriverUnit(costDriver, rate.unit),
                              }
                            : { costDriver: undefined, category: 'OTHER' }
                          );
                        }}
                        className={inputClass()}
                      >
                        <option value="">Manual quantity</option>
                        {APPRAISAL_INFRASTRUCTURE_COST_DRIVER_OPTIONS.map(({ value, label }) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2"><input value={rate.label} onChange={(event) => updateRate(rate.id, { label: event.target.value })} className={inputClass()} /></td>
                    <td className="px-3 py-2">
                      <select value={rate.unit} onChange={(event) => updateRate(rate.id, { unit: event.target.value as AppraisalSiteDimensionRow['unit'] })} className={inputClass()}>
                        <option value="m2">m2</option>
                        <option value="m">m</option>
                        <option value="nr">nr</option>
                        <option value="sum">sum</option>
                      </select>
                    </td>
                    <td className="px-3 py-2"><input type="number" value={rate.rate} onChange={(event) => updateRate(rate.id, { rate: numberValue(event.target.value) })} className={inputClass('text-right')} /></td>
                    <td className="px-3 py-2"><input type="number" value={rate.priceIndex || 0} onChange={(event) => updateRate(rate.id, { priceIndex: numberValue(event.target.value) })} className={inputClass('text-right')} /></td>
                    <td className="px-3 py-2"><input value={rate.notes || ''} onChange={(event) => updateRate(rate.id, { notes: event.target.value })} tabIndex={-1} className={inputClass()} /></td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => removeRate(rate.id)} className="rounded-app-sm border border-slate-200 p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:hover:bg-rose-950/30 dark:hover:text-rose-200" aria-label="Delete rate">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {rates.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400">No infrastructure rates saved.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      )}

      {false && selectedHouseType && (
        <AppraisalSideDrawer
          title="House type detail"
          subtitle="Edit the standard house details and open build-up costs for this plot type."
          smokeId="appraisals-house-build-up-drawer"
          onClose={() => setSelectedHouseTypeId(null)}
          wide
        >
          <div className="space-y-4">
            <div className="rounded-app border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-surface-900">
              <div className="grid gap-3 lg:grid-cols-[1.2fr_0.55fr_0.65fr_0.55fr_0.55fr]">
                <label className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">House type</span>
                  <input
                    data-smoke="appraisals-house-type-name"
                    value={selectedHouseType.name}
                    onChange={(event) => updateHouseType(selectedHouseType.id, { name: event.target.value })}
                    className={inputClass()}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">GIFA m2</span>
                  <input
                    data-smoke="appraisals-house-type-gifa"
                    type="number"
                    value={selectedHouseType.gifaM2}
                    onChange={(event) => updateHouseType(selectedHouseType.id, { gifaM2: numberValue(event.target.value) })}
                    className={inputClass('text-right')}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Build cost/m2</span>
                  <input
                    data-smoke="appraisals-house-type-cost"
                    type="number"
                    value={Math.round(calculateHouseTypeLibraryBuildCostPerM2(selectedHouseType))}
                    onChange={(event) => updateHouseType(selectedHouseType.id, { buildCostPerM2: numberValue(event.target.value) })}
                    disabled={selectedHouseTypeBreakdownTotal > 0}
                    className={inputClass('text-right disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-400')}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Price index</span>
                  <input
                    type="number"
                    value={selectedHouseType.priceIndex || 0}
                    onChange={(event) => updateHouseType(selectedHouseType.id, { priceIndex: numberValue(event.target.value) })}
                    className={inputClass('text-right')}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Build months</span>
                  <input
                    type="number"
                    value={selectedHouseType.buildPeriodMonths || 0}
                    onChange={(event) => updateHouseType(selectedHouseType.id, { buildPeriodMonths: Math.max(1, Math.round(numberValue(event.target.value))) })}
                    className={inputClass('text-right')}
                  />
                </label>
              </div>
              <label className="mt-3 block space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Notes</span>
                  <input
                    value={selectedHouseType.notes || ''}
                    onChange={(event) => updateHouseType(selectedHouseType.id, { notes: event.target.value })}
                    placeholder="Optional notes"
                    tabIndex={-1}
                    className={inputClass()}
                  />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <MetricTile label="Component total" value={money(selectedHouseTypeBreakdownTotal)} />
              <MetricTile label="Derived cost/m2" value={money(selectedHouseTypeBuildCost)} />
            </div>

            <div className="max-h-[calc(100vh-22rem)] overflow-y-auto rounded-app border border-slate-200 dark:border-slate-800">
              <table className="min-w-[920px] w-full text-left text-xs">
                <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Element</th>
                    <th className="px-3 py-2 text-center">Include</th>
                    <th className="px-3 py-2 text-right">Amount/house</th>
                    <th className="px-3 py-2 text-right">Cost/m2</th>
                    <th className="px-3 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-surface-900">
                  {selectedHouseTypeBreakdown.map((component) => {
                    const optional = isOptionalHouseTypeCostComponent(component.key);
                    const included = component.included !== false;
                    const componentRate = selectedHouseType.gifaM2 > 0 && included ? component.amount / selectedHouseType.gifaM2 : 0;
                    return (
                      <tr key={component.key}>
                        <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-100">
                          {APPRAISAL_HOUSE_TYPE_COST_LABELS[component.key]}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {optional ? (
                            <input
                              type="checkbox"
                              checked={included}
                              onChange={(event) => updateHouseTypeCostComponent(selectedHouseType, component.key, { included: event.target.checked })}
                              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 dark:border-slate-700 dark:bg-surface-900"
                              aria-label={`Include ${APPRAISAL_HOUSE_TYPE_COST_LABELS[component.key]} cost`}
                            />
                          ) : (
                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Included</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={component.amount || 0}
                            onChange={(event) => updateHouseTypeCostComponent(selectedHouseType, component.key, { amount: numberValue(event.target.value) })}
                            placeholder={`${APPRAISAL_HOUSE_TYPE_COST_LABELS[component.key]} cost`}
                            className={inputClass('text-right')}
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-slate-700 dark:text-slate-200">{money(componentRate)}</td>
                        <td className="px-3 py-2">
                          <input
                            value={component.notes || ''}
                            onChange={(event) => updateHouseTypeCostComponent(selectedHouseType, component.key, { notes: event.target.value })}
                            placeholder={`${APPRAISAL_HOUSE_TYPE_COST_LABELS[component.key]} notes`}
                            tabIndex={-1}
                            className={inputClass()}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </AppraisalSideDrawer>
      )}

      {false && selectedOtherCostSection && (
        <AppraisalSideDrawer
          title={`${selectedOtherCostSectionLabel} detail`}
          subtitle={selectedOtherCostSection === 'INFRASTRUCTURE'
            ? 'Infrastructure is the first AWD other-cost section built from the workbook base formulas.'
            : 'This AWD other-cost section is reserved for the next detailed rate build-up.'}
          smokeId="appraisals-other-cost-drawer"
          onClose={() => setSelectedOtherCostSection(null)}
          wide={selectedOtherCostSection === 'INFRASTRUCTURE'}
        >
          {selectedOtherCostSection === 'INFRASTRUCTURE' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-app border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-surface-900">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Other cost detail</div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Infrastructure rates</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    AWD rates use cost drivers such as total units, site area, roads, boundaries, and fixed sums.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLoadAwdInfrastructurePack}
                  className="workspace-secondary-btn px-3 py-2 text-xs"
                  title={`${AWD_INFRASTRUCTURE_RATE_DEFINITIONS.length} base rates from Infrastructure column B. Revised costs ignored.`}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {awdPackLoadedCount > 0 ? 'Update AWD pack rates' : 'Load AWD pack'}
                </button>
              </div>

              <div className="grid gap-2 lg:grid-cols-[0.95fr_1fr_0.48fr_0.66fr_0.58fr_auto]">
                <select
                  value={rateDraft.costDriver}
                  onChange={(event) => handleRateCostDriverChange(event.target.value as AppraisalInfrastructureCostDriver)}
                  className={inputClass(rateDraft.costDriver ? '' : 'text-slate-400 dark:text-slate-500')}
                  aria-label="Infrastructure cost driver"
                >
                  <option value="" disabled>Cost driver</option>
                  {APPRAISAL_INFRASTRUCTURE_COST_DRIVER_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <input
                  data-smoke="appraisals-rate-label"
                  value={rateDraft.label}
                  onChange={(event) => setRateDraft((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Infrastructure item"
                  className={inputClass()}
                />
                <select
                  value={rateDraft.unit}
                  onChange={(event) => setRateDraft((current) => ({ ...current, unit: event.target.value as AppraisalSiteDimensionRow['unit'] }))}
                  className={inputClass(rateDraft.unit ? '' : 'text-slate-400 dark:text-slate-500')}
                  aria-label="Infrastructure unit"
                >
                  <option value="" disabled>Unit</option>
                  <option value="m2">m2</option>
                  <option value="m">m</option>
                  <option value="nr">nr</option>
                  <option value="sum">sum</option>
                </select>
                <input
                  data-smoke="appraisals-rate-value"
                  type="number"
                  value={rateDraft.rate}
                  onChange={(event) => setRateDraft((current) => ({ ...current, rate: event.target.value }))}
                  placeholder="Rate per m2/m/nr/sum"
                  className={inputClass('text-right')}
                  aria-label="Rate value"
                />
                <input
                  type="number"
                  value={rateDraft.priceIndex}
                  onChange={(event) => setRateDraft((current) => ({ ...current, priceIndex: event.target.value }))}
                  placeholder="Price index"
                  className={inputClass('text-right')}
                  aria-label="Infrastructure price index"
                />
                <button type="button" data-smoke="appraisals-rate-create" onClick={onCreateRate} className="workspace-primary-btn px-3 py-2 text-xs">
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>

              <div className="max-h-[calc(100vh-20rem)] overflow-x-auto overflow-y-auto rounded-app border border-slate-200 dark:border-slate-800">
                <table className="min-w-[900px] w-full text-left text-xs">
                  <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Index</th>
                      <th className="px-3 py-2">Cost driver</th>
                      <th className="px-3 py-2">Label</th>
                      <th className="px-3 py-2">Unit</th>
                      <th className="px-3 py-2 text-right">Rate</th>
                      <th className="px-3 py-2 text-right">Price index</th>
                      <th className="px-3 py-2">Notes</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-surface-900">
                    {rates.map((rate, index) => (
                      <tr key={rate.id}>
                        <td className="px-3 py-2 font-semibold tabular-nums text-primary-700 dark:text-primary-200">{libraryIndex('INF', index)}</td>
                        <td className="px-3 py-2">
                          <select
                            value={rate.costDriver || ''}
                            onChange={(event) => {
                              const costDriver = event.target.value as AppraisalInfrastructureCostDriver | '';
                              updateRate(rate.id, costDriver
                                ? {
                                    costDriver,
                                    category: infrastructureCostDriverToCategory(costDriver),
                                    unit: getInfrastructureCostDriverUnit(costDriver, rate.unit),
                                  }
                                : { costDriver: undefined, category: 'OTHER' }
                              );
                            }}
                            className={inputClass()}
                          >
                            <option value="">Manual quantity</option>
                            {APPRAISAL_INFRASTRUCTURE_COST_DRIVER_OPTIONS.map(({ value, label }) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2"><input value={rate.label} onChange={(event) => updateRate(rate.id, { label: event.target.value })} className={inputClass()} /></td>
                        <td className="px-3 py-2">
                          <select value={rate.unit} onChange={(event) => updateRate(rate.id, { unit: event.target.value as AppraisalSiteDimensionRow['unit'] })} className={inputClass()}>
                            <option value="m2">m2</option>
                            <option value="m">m</option>
                            <option value="nr">nr</option>
                            <option value="sum">sum</option>
                          </select>
                        </td>
                        <td className="px-3 py-2"><input type="number" value={rate.rate} onChange={(event) => updateRate(rate.id, { rate: numberValue(event.target.value) })} className={inputClass('text-right')} /></td>
                        <td className="px-3 py-2"><input type="number" value={rate.priceIndex || 0} onChange={(event) => updateRate(rate.id, { priceIndex: numberValue(event.target.value) })} className={inputClass('text-right')} /></td>
                        <td className="px-3 py-2"><input value={rate.notes || ''} onChange={(event) => updateRate(rate.id, { notes: event.target.value })} tabIndex={-1} className={inputClass()} /></td>
                        <td className="px-3 py-2 text-right">
                          <button type="button" onClick={() => removeRate(rate.id)} className="rounded-app-sm border border-slate-200 p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:hover:bg-rose-950/30 dark:hover:text-rose-200" aria-label="Delete rate">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {rates.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400">No infrastructure rates saved.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-app border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-surface-900">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-app border border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-300">
                <Ruler className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedOtherCostSectionLabel} has no rate rows yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                The AWD library now has a place for this section, but the detailed formulas have only been built for Infrastructure so far.
              </p>
            </div>
          )}
        </AppraisalSideDrawer>
      )}
    </main>
  );
}

function isHouseStageIncomplete(stage: HouseStage, option: DevelopmentAppraisalOption) {
  return getHouseStageState(stage, option) !== 'complete';
}

function siteMetricsSectionPrefix(section: SiteMetricsSection) {
  if (section === 'PRELIMS') return AWD_PRELIMS_RATE_PACK_PREFIX;
  return section === 'PLOT_WORKS' ? AWD_PLOT_WORKS_RATE_PACK_PREFIX : AWD_INFRASTRUCTURE_RATE_PACK_PREFIX;
}

function siteMetricsOtherPrefixes(section: SiteMetricsSection) {
  return [AWD_INFRASTRUCTURE_RATE_PACK_PREFIX, AWD_PLOT_WORKS_RATE_PACK_PREFIX, AWD_PRELIMS_RATE_PACK_PREFIX]
    .filter((prefix) => prefix !== siteMetricsSectionPrefix(section));
}

function siteMetricsDriverSet(section: SiteMetricsSection) {
  if (section === 'PRELIMS') return PRELIMS_STAGE_COST_DRIVERS;
  return section === 'PLOT_WORKS' ? PLOT_WORKS_STAGE_COST_DRIVERS : INFRASTRUCTURE_STAGE_COST_DRIVERS;
}

function isSiteMetricRowForSection(row: AppraisalSiteDimensionRow, section: SiteMetricsSection, prefix?: string) {
  if (!prefix || prefix === siteMetricsSectionPrefix(section)) return siteBaseRowMatches(row, section);
  const sectionPrefix = prefix || siteMetricsSectionPrefix(section);
  if (isRatePackRow(row, sectionPrefix)) return true;
  if (siteMetricsOtherPrefixes(section).some((otherPrefix) => isRatePackRow(row, otherPrefix))) return false;
  if (row.sourceRow === `${section}_CUSTOM` || row.sourceRow === `${section}_LIBRARY`) return true;
  if ((['INFRASTRUCTURE', 'PLOT_WORKS', 'PRELIMS'] as SiteMetricsSection[]).some((otherSection) => otherSection !== section && (row.sourceRow === `${otherSection}_CUSTOM` || row.sourceRow === `${otherSection}_LIBRARY`))) return false;
  const driverSet = siteMetricsDriverSet(section);
  if (section === 'INFRASTRUCTURE') return !row.costDriver || driverSet.has(row.costDriver);
  return Boolean(row.costDriver && driverSet.has(row.costDriver));
}

function isRateItemForSiteMetricSection(item: AppraisalRateLibraryItem, section: SiteMetricsSection) {
  if (item.id === 'awd-prelims-site-investigations') return false;
  if (isAbnormalRemovalRow({ libraryRateId: item.id })) return false;
  if (section === 'PRELIMS') {
    if (isAwdPrelimsRate(item)) return true;
    if (isAwdInfrastructureRate(item) || isAwdPlotWorksRate(item)) return false;
    return Boolean(item.costDriver && PRELIMS_STAGE_COST_DRIVERS.has(item.costDriver));
  }
  if (section === 'PLOT_WORKS') {
    if (isAwdPlotWorksRate(item)) return true;
    if (isAwdInfrastructureRate(item) || isAwdPrelimsRate(item)) return false;
    return Boolean(item.costDriver && PLOT_WORKS_STAGE_COST_DRIVERS.has(item.costDriver));
  }
  if (isAwdInfrastructureRate(item)) return true;
  if (isAwdPlotWorksRate(item) || isAwdPrelimsRate(item)) return false;
  return !item.costDriver || INFRASTRUCTURE_STAGE_COST_DRIVERS.has(item.costDriver);
}

function siteMetricRowsForSection(option: DevelopmentAppraisalOption, section: SiteMetricsSection) {
  const rows = (option.siteDimensions || []).filter((row) => !row.isCostDriverInput);
  const prefix = siteMetricsSectionPrefix(section);
  return rows.filter((row) => isSiteMetricRowForSection(row, section, prefix));
}

function getHouseStageState(stage: HouseStage, option: DevelopmentAppraisalOption): 'empty' | 'attention' | 'complete' {
  const summary = summariseHouseBuildingOption(option);
  if (stage === 'HOUSE_TYPES') {
    if ((option.houseTypeSchedule || []).length === 0) return 'empty';
    return summary.houseConstructionCost > 0 ? 'complete' : 'attention';
  }
  if (stage === 'PROGRAMME') {
    const programme = calculateHouseBuildingProgrammeSummary(option);
    const hasProgrammeInput = Boolean(option.programme?.expectedStartDate) || (option.programme?.saleRateUnitsPerMonth || 0) > 0 || (option.programme?.leadInMonths || 0) > 0;
    if (!hasProgrammeInput) return 'empty';
    return summary.totalUnits > 0 && Boolean(programme.expectedStartDate) && programme.saleRateUnitsPerMonth > 0 ? 'complete' : 'attention';
  }
  if (stage === 'BASE_MEASURES') {
    return (option.siteDimensions || []).some(row => row.isCostDriverInput && row.quantity > 0) ? 'complete' : 'empty';
  }
  if (stage === 'BASE_DATA') {
    return (option.baseMeasurementFiles || []).length > 0 || (option.architectFeasibilityLayouts || []).length > 0 ? 'complete' : 'empty';
  }
  if (stage === 'ENGINEERS_SCOPE') return option.engineeringScope?.confirmedAt && !option.engineeringScopeDraft ? 'complete' : 'attention';
  if (stage === 'PRELIMS_ASSUMPTIONS') return summary.totalUnits > 0 ? 'complete' : 'empty';
  if (stage === 'INFRASTRUCTURE' || stage === 'PLOT_WORKS' || stage === 'PRELIMS') {
    const sectionRows = siteMetricRowsForSection(option, stage);
    if (sectionRows.length === 0) return 'empty';
    return sectionRows.some((row) => calculateSiteDimensionTotal(row, option) > 0) ? 'complete' : 'attention';
  }
  if (stage === 'HOUSE_PRICES') {
    if ((option.houseTypeSchedule || []).length === 0) return 'empty';
    return summary.gdv > 0 ? 'complete' : 'attention';
  }
  if (stage === 'CUSTOM_GDV') {
    return (option.customGdvAdditionAmount || 0) > 0 || Boolean(option.customGdvAdditionNote?.trim()) ? 'complete' : 'empty';
  }
  if (stage === 'CUSTOM_COST') {
    return getCustomCostProvisions(option).length > 0 ? 'complete' : 'empty';
  }
  if (stage === 'COST_SUMMARY') return summary.houseConstructionCost > 0 || summary.siteWorksCost > 0 ? 'complete' : 'empty';
  if (stage === 'TRADE_PACKAGE_BUDGET') {
    const report = buildAppraisalTradePackageBudget(option);
    if (report.packages.length === 0) return 'empty';
    return report.warnings.length > 0 ? 'attention' : 'complete';
  }
  if (stage === 'OVERALL_SUMMARY') return summary.gdv > 0 || summary.totalStructuredCost > 0 ? 'complete' : 'empty';
  if (stage === 'LAND_CONTRACT') return (option.landContractVersions || []).length > 0 ? 'complete' : 'empty';
  if (stage === 'CONSENTS') {
    const rows = option.consentTracker || [];
    if (rows.length === 0) return 'empty';
    return rows.some((row) => row.status !== 'NOT_STARTED' || (row.uploads || []).length > 0 || row.notes?.trim()) ? 'complete' : 'attention';
  }
  if (stage === 'SITE_SPECIFIC' || stage === 'ABNORMAL_WORKS' || stage === 'ABNORMALS') {
    return (option.costLines || []).some((line) => isSiteCostElement(line) && (stage === 'ABNORMALS' || siteCostMetadata(line).allocation === (stage === 'SITE_SPECIFIC' ? 'SITE_SPECIFIC' : 'ABNORMALS')))
      || (stage !== 'SITE_SPECIFIC' && (Boolean(option.abnormalGeneralNotes?.trim()) || Boolean(option.constraintsReport)))
      ? 'complete'
      : 'empty';
  }
  if (stage === 'DECISION') return option.decisionNote?.trim() ? 'complete' : 'empty';
  if (stage === 'NOT_ALLOWED_ABNORMALS') return notAllowedAbnormalRows(option, true).length ? 'attention' : 'complete';
  return 'complete';
}

function stageStateClass(state: 'empty' | 'attention' | 'complete') {
  if (state === 'complete') return 'bg-emerald-500';
  if (state === 'attention') return 'bg-amber-400';
  return 'bg-slate-300 dark:bg-slate-600';
}

function stageStateLabel(state: 'empty' | 'attention' | 'complete') {
  if (state === 'complete') return 'Complete';
  if (state === 'attention') return 'Needs attention';
  return 'Empty';
}

function houseStageDescription(stage: HouseStage) {
  const descriptions: Record<HouseStage, string> = {
    HOUSE_TYPES: 'Select the housing mix, quantities, construction rates, and sales-ready schedule for the appraisal.',
    PROGRAMME: 'Set programme timing, start dates, build rate, and index assumptions that drive cost and sales timing.',
    BASE_MEASURES: 'Enter the shared quantities used by infrastructure and plot works calculations.',
    BASE_DATA: 'Upload the base measurement workbook used to support site metrics, areas, quantities, and measurement assumptions.',
    INFRASTRUCTURE: 'Record infrastructure quantities and rates for roads, sewers, paths, landscaping, and related external works.',
    PLOT_WORKS: 'Capture plot-specific works such as gardens, drives, fencing, planting, and plot-level external allowances.',
    PRELIMS_ASSUMPTIONS: 'Set surveys, staffing, forklift, planning, building warrant, RCC and Scottish Water assumptions that feed the fixed Prelims bill.',
    ENGINEERS_SCOPE: 'Confirm engineering scope, workbook-based fees and additional engineering costs allocated to Abnormals.',
    PRELIMS: 'Review preliminaries driven by programme, site metrics, and staffing/resource assumptions.',
    HOUSE_PRICES: 'Set sale values, incentives, price evidence, and sales indexation used to calculate GDV/GSV.',
    CUSTOM_GDV: 'Add a separate custom GDV/GSV allowance with a note explaining what it represents.',
    CUSTOM_COST: 'Add a separate custom cost provision with a note explaining what it covers.',
    COST_SUMMARY: 'Review the total build cost, indexed costs, overheads, abnormals, LBTT, and non-land cost position.',
    TRADE_PACKAGE_BUDGET: 'Review procurement trade budgets at the expected site-start index and, when linked, push confirmed values to Estimate trade budgets.',
    OVERALL_SUMMARY: 'Check the residual land, profit, margin, net developable area, and seller-price scenarios.',
    LAND_CONTRACT: 'Track land contract versions, notes, and supporting purchase evidence for the appraisal.',
    CONSENTS: 'Track planning, roads, warrants, utilities, consent status, dates, notes, and uploads.',
    SITE_SPECIFIC: 'Price planned site requirements such as SUDS, off-site connections and retaining works separately from the base allowances.',
    ABNORMAL_WORKS: 'Assess exceptional site costs such as contamination, rock and existing structure removal.',
    ABNORMALS: 'Review base allowances and all additional site elements, including site-specific works and abnormals.',
    DECISION: 'Prepare and generate the final appraisal report and export packs.',
    NOT_ALLOWED_ABNORMALS: 'Review excluded Prelims surveys, possible follow-on work and unpriced abnormal elements before making a land offer.',
  };
  return descriptions[stage];
}

function commercialStageDescription(tab: EditorTab) {
  const descriptions: Record<EditorTab, string> = {
    REVENUE: 'Set commercial sale or rental revenues and AI-assisted location assumptions.',
    COSTS: 'Review commercial template costs, external works, design costs, prelims, and allowances.',
    LIFECYCLE: 'Model year-on-year income, costs, interest, and break-even performance.',
    ASSUMPTIONS: 'Adjust the commercial appraisal assumptions and notes for this option.',
    DECISION: 'Prepare and export the commercial appraisal decision report.',
  };
  return descriptions[tab];
}

function commercialStageIcon(tab: EditorTab) {
  const icons: Record<EditorTab, React.ComponentType<{ className?: string }>> = {
    REVENUE: BarChart3,
    COSTS: Calculator,
    LIFECYCLE: ListChecks,
    ASSUMPTIONS: Pencil,
    DECISION: CheckCircle2,
  };
  return icons[tab];
}

function CommercialStageNav({
  tab,
  setTab,
  variant = 'pills',
}: {
  tab: EditorTab;
  setTab: React.Dispatch<React.SetStateAction<EditorTab>>;
  variant?: 'pills' | 'rail';
}) {
  return (
    <div className={variant === 'rail' ? 'space-y-2' : 'flex flex-wrap gap-2'}>
      {tabs.map((entry) => {
        const Icon = commercialStageIcon(entry.id);
        const selected = tab === entry.id;
        return (
          <button
            key={entry.id}
            type="button"
            data-smoke={`appraisals-commercial-stage-${entry.id.toLowerCase()}`}
            onClick={() => {
              const completeMeasure = startAppraisalPerformance('workflowStage');
              React.startTransition(() => setTab(entry.id));
              afterNextPaint(completeMeasure);
            }}
            className={variant === 'rail'
              ? `appraisal-stage-button ${selected ? 'appraisal-stage-button-active' : 'appraisal-stage-button-idle'}`
              : `inline-flex items-center gap-2 rounded-app-sm border px-3 py-2 text-xs font-semibold transition ${
                selected
                  ? 'border-primary-300 bg-primary-50 text-primary-800 dark:border-primary-700 dark:bg-primary-950/30 dark:text-primary-100'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300'
              }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {entry.label}
          </button>
        );
      })}
    </div>
  );
}

function CommercialPreliminaryAssessmentPanel({
  appraisal,
  option,
  updateOption,
  onExport,
  isExporting,
}: {
  appraisal: DevelopmentAppraisal;
  option: DevelopmentAppraisalOption;
  updateOption: (optionId: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
  onExport: (exportName: string) => void;
  isExporting: boolean;
}) {
  const { showToast } = useToast();
  const [isUploading, setIsUploading] = React.useState(false);
  const [downloadingBriefId, setDownloadingBriefId] = React.useState<string | null>(null);
  const [exportNames, setExportNames] = React.useState<Record<string, string>>({});
  const [preliminaryReportName, setPreliminaryReportName] = React.useState(`${appraisal.name} preliminary commercial assessment`);
  const briefs = option.commercialInitialAssessmentBriefs || [];
  const selectedTemplate = getCommercialAppraisalTemplate(option.commercialTemplateId);
  React.useEffect(() => {
    setPreliminaryReportName(`${appraisal.name} preliminary commercial assessment`);
  }, [appraisal.id, appraisal.name]);

  const addBrief = async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast({ type: 'info', message: 'Preliminary assessment evidence must be supplied as a PDF.' });
      return;
    }
    setIsUploading(true);
    try {
      const report = await buildAppraisalPricingReportFromFile(file);
      updateOption(option.id, (current) => ({
        ...current,
        commercialInitialAssessmentBriefs: [...(current.commercialInitialAssessmentBriefs || []), report],
      }));
      showToast({ type: report.extractionStatus === 'EXTRACTED' ? 'success' : 'info', message: report.extractionStatus === 'EXTRACTED' ? 'Preliminary assessment PDF added.' : 'PDF saved. Its readable text could not be extracted reliably.' });
    } catch (error) {
      console.error('Commercial preliminary assessment upload error', error);
      showToast({ type: 'error', message: 'The preliminary assessment PDF could not be added.' });
    } finally {
      setIsUploading(false);
    }
  };

  const startDetailedAssessment = () => {
    updateOption(option.id, (current) => {
      const template = getCommercialAppraisalTemplate(current.commercialTemplateId);
      return applyCommercialTemplateToOption({
        ...current,
        commercialAssessmentStage: 'MODELLED',
        commercialAssets: [],
        revenueLines: [],
        costLines: [],
      }, template.id, commercialTemplateInputsForOption(current));
    });
    showToast({ type: 'success', message: 'Detailed commercial assessment started. The preliminary PDFs remain attached to this appraisal.' });
  };

  const downloadBrief = async (brief: AppraisalPricingReport) => {
    setDownloadingBriefId(brief.id);
    try {
      const saved = await downloadAppraisalPdfAttachment(brief, exportNames[brief.id] || brief.fileName);
      showToast({ type: saved ? 'success' : 'info', message: saved ? 'Original preliminary assessment PDF exported.' : 'PDF export was cancelled.' });
    } catch (error) {
      console.error('Commercial preliminary assessment PDF export error', error);
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'The original preliminary assessment PDF could not be exported.' });
    } finally {
      setDownloadingBriefId(null);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]" data-smoke="appraisals-commercial-preliminary-assessment">
      <section className="rounded-app border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900 dark:bg-amber-950/20">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-200">Preliminary commercial assessment</div>
        <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">Evidence retained before financial modelling</h3>
        <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">This appraisal is intentionally on hold. No template rates, costs, income, lifecycle assumptions or exit values have been applied while the initial assessment is reviewed and further information is gathered.</p>
        <label className="mt-4 block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800 dark:text-amber-200">Preliminary report name</span>
          <input value={preliminaryReportName} onChange={(event) => setPreliminaryReportName(event.target.value)} className={`${inputClass()} mt-1 w-full`} />
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => onExport(preliminaryReportName)} disabled={isExporting} className="workspace-primary-btn px-3 py-2 text-xs disabled:opacity-50"><FileDown className="h-4 w-4" />{isExporting ? 'Preparing PDF...' : 'Export preliminary PDF'}</button>
          <button type="button" onClick={startDetailedAssessment} className="workspace-secondary-btn px-3 py-2 text-xs"><ChevronRight className="h-4 w-4" />Begin detailed assessment</button>
        </div>
      </section>

      <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Assessment PDFs</div>
            <h4 className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">{briefs.length ? `${briefs.length} retained` : 'No PDF retained'}</h4>
          </div>
          <label className="workspace-secondary-btn cursor-pointer px-3 py-2 text-xs">
            <FileUp className="h-4 w-4" />
            {isUploading ? 'Adding...' : 'Add PDF'}
            <input type="file" accept=".pdf,application/pdf" className="sr-only" disabled={isUploading} onChange={(event) => { void addBrief(event.target.files?.[0]); event.currentTarget.value = ''; }} />
          </label>
        </div>
        <div className="mt-3 space-y-2">
          {briefs.length ? briefs.map((brief) => (
            <div key={brief.id} className="rounded-app-sm border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-surface-950">
              <div className="min-w-0">
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{brief.fileName}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{brief.extractionStatus === 'EXTRACTED' ? 'Readable content available for the preliminary report' : 'Original PDF retained; readable text unavailable'}</div>
                </div>
              </div>
              <label className="mt-2 block">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Export report name</span>
                <input value={exportNames[brief.id] ?? brief.fileName.replace(/\.pdf$/i, '')} onChange={(event) => setExportNames((current) => ({ ...current, [brief.id]: event.target.value }))} className={`${inputClass()} mt-1 w-full`} />
              </label>
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => { void downloadBrief(brief); }} disabled={downloadingBriefId === brief.id} className="workspace-secondary-btn px-2 py-1.5 text-[11px] disabled:opacity-50">{downloadingBriefId === brief.id ? 'Exporting...' : 'Export PDF'}</button>
                <button type="button" onClick={() => updateOption(option.id, (current) => ({ ...current, commercialInitialAssessmentBriefs: (current.commercialInitialAssessmentBriefs || []).filter((entry) => entry.id !== brief.id) }))} className="text-xs font-semibold text-rose-700 hover:underline dark:text-rose-300">Remove</button>
              </div>
              {brief.notes?.trim() && <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{brief.notes}</p>}
            </div>
          )) : <p className="rounded-app-sm border border-dashed border-slate-300 px-3 py-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">Add the preliminary assessment PDF to retain the current evidence and make the preliminary report available.</p>}
        </div>
        <p className="mt-3 text-[11px] leading-5 text-slate-500 dark:text-slate-400">When detailed assessment begins, the currently selected starting template is {selectedTemplate.name}. It can be changed and refined after progression; no costs are applied until then.</p>
      </section>
    </div>
  );
}

function CommercialTemplatePanel({
  option,
  updateOption,
}: {
  option: DevelopmentAppraisalOption;
  updateOption: (optionId: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const { appSettings } = useAppContext();
  const { showToast } = useToast();
  const selectedTemplate = getCommercialAppraisalTemplate(option.commercialTemplateId);
  const selectedSector = selectedTemplate.sector;
  const templatesForSector = getCommercialTemplatesBySector(selectedSector);
  const inputs = commercialTemplateInputsForOption(option);
  const previewOption = React.useMemo(
    () => applyCommercialTemplateToOption({ ...option, revenueLines: [], costLines: [] }, selectedTemplate.id, inputs),
    [inputs, option, selectedTemplate.id]
  );
  const previewRevenue = previewOption.revenueLines[0];
  const previewCostTotal = previewOption.costLines.reduce((total, line) => total + (line.amount || 0), 0);
  const isApplied = commercialTemplateApplied(option);
  const [showTemplateRates, setShowTemplateRates] = React.useState(false);
  const [isAssessingScope, setIsAssessingScope] = React.useState(false);
  const [guidedScopeQuestion, setGuidedScopeQuestion] = React.useState('');
  const [guidedScopeAnswer, setGuidedScopeAnswer] = React.useState('');
  const [guidedScopeAnswers, setGuidedScopeAnswers] = React.useState<GuidedCommercialScopeAnswer[]>([]);
  React.useEffect(() => {
    setShowTemplateRates(false);
  }, [selectedTemplate.id]);

  const handleTemplateChange = (templateId: string) => {
    const nextTemplate = getCommercialAppraisalTemplate(templateId);
    updateOption(option.id, (current) => ({
      ...current,
      commercialTemplateId: nextTemplate.id,
      commercialTemplateInputs: defaultCommercialTemplateInputs(nextTemplate),
    }));
  };

  const handleSectorChange = (sector: string) => {
    const nextTemplate = getCommercialTemplatesBySector(sector)[0];
    if (nextTemplate) handleTemplateChange(nextTemplate.id);
  };

  const updateMeasure = (measureKey: string, value: number) => {
    updateOption(option.id, (current) => ({
      ...current,
      commercialTemplateInputs: {
        ...commercialTemplateInputsForOption(current),
        [measureKey]: Math.max(0, value),
      },
    }));
  };

  const applyTemplate = () => {
    updateOption(option.id, (current) => {
      const template = getCommercialAppraisalTemplate(current.commercialTemplateId);
      return applyCommercialTemplateToOption(current, template.id, commercialTemplateInputsForOption(current));
    });
  };

  const fallbackScopeQuestion = (answers: GuidedCommercialScopeAnswer[]) => {
    const answered = new Set(answers.map((entry) => entry.question.trim().toLowerCase()));
    const candidates = [
      'What is the intended commercial use, operator format and target customer or occupier?',
      'What building scale, capacity, storey count or operational format is proposed?',
      'What parking, servicing, access, delivery or drive-through requirements must fit on the site?',
      'Are there any known site constraints, retained features, drainage requirements or planning limitations?',
    ];
    return candidates.find((candidate) => !answered.has(candidate.toLowerCase())) || candidates[candidates.length - 1];
  };

  const runGuidedScopeAssessment = async () => {
    const siteAreaM2 = Number(inputs.siteAreaM2 || 0);
    if (!Number.isFinite(siteAreaM2) || siteAreaM2 <= 0) {
      showToast({ type: 'info', message: 'Enter the whole site area before asking AI to assess the scope.' });
      return;
    }
    if (guidedScopeQuestion && !guidedScopeAnswer.trim()) {
      showToast({ type: 'info', message: 'Answer the current AI scope question before continuing.' });
      return;
    }
    const nextAnswers = guidedScopeQuestion
      ? [...guidedScopeAnswers, { question: guidedScopeQuestion, answer: guidedScopeAnswer.trim() }]
      : guidedScopeAnswers;
    setIsAssessingScope(true);
    try {
      const result = await generateCommercialScopeGuidanceStep({
        location: option.commercialLocation?.trim() || '',
        siteAreaM2,
        template: {
          id: selectedTemplate.id,
          name: selectedTemplate.name,
          sector: selectedTemplate.sector,
          description: selectedTemplate.description,
          measures: selectedTemplate.measures.map((measure) => ({ key: measure.key, label: measure.label, unit: measure.unit })),
        },
        currentMeasures: inputs,
        scopeNotes: option.assumptions || '',
        assessmentEvidence: buildCommercialAssessmentEvidence(option.commercialInitialAssessmentBriefs),
        previousAnswers: nextAnswers,
      }, appSettings.ai);
      if (result.ok === false) {
        setGuidedScopeAnswers(nextAnswers);
        setGuidedScopeAnswer('');
        setGuidedScopeQuestion(fallbackScopeQuestion(nextAnswers));
        showToast({ type: 'info', message: 'AI was unavailable, so a focused scope question has been prepared for you to continue.' });
        return;
      }
      setGuidedScopeAnswers(nextAnswers);
      setGuidedScopeAnswer('');
      if (result.data.needsClarification) {
        setGuidedScopeQuestion(result.data.question || fallbackScopeQuestion(nextAnswers));
        showToast({ type: 'info', message: 'AI needs one more scope detail.' });
        return;
      }
      const allowedMeasureKeys = new Set(selectedTemplate.measures.map((measure) => measure.key));
      const proposedMeasures = Object.fromEntries(
        Object.entries(result.data.proposedMeasures).flatMap(([key, value]) => {
          const numeric = Number(value);
          return allowedMeasureKeys.has(key) && Number.isFinite(numeric) && numeric >= 0 ? [[key, numeric]] : [];
        }),
      );
      updateOption(option.id, (current) => {
        const nextInputs = {
          ...commercialTemplateInputsForOption(current),
          ...proposedMeasures,
          siteAreaM2,
        };
        return applyCommercialTemplateToOption({
          ...current,
          commercialTemplateInputs: nextInputs,
          commercialScopeAssessment: {
            siteAreaM2,
            summary: result.data.summary,
            assessedAt: new Date().toISOString(),
            provider: appSettings.ai.providerMode || 'AUTO',
          },
        }, selectedTemplate.id, nextInputs);
      });
      setGuidedScopeQuestion('');
      showToast({ type: 'success', message: 'AI scope proposal applied within the entered site area.' });
    } catch (error) {
      console.error('Guided commercial scope assessment error', error);
      setGuidedScopeAnswers(nextAnswers);
      setGuidedScopeAnswer('');
      setGuidedScopeQuestion(fallbackScopeQuestion(nextAnswers));
      showToast({ type: 'info', message: 'AI could not complete that step. Continue with the focused scope question shown.' });
    } finally {
      setIsAssessingScope(false);
    }
  };

  const resetGuidedScopeAssessment = () => {
    setGuidedScopeAnswers([]);
    setGuidedScopeQuestion('');
    setGuidedScopeAnswer('');
  };

  return (
    <section className="rounded-app border border-slate-200 bg-white dark:border-slate-800 dark:bg-surface-900">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Commercial template</div>
            <h4 className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">{selectedTemplate.name}</h4>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-300">
              {selectedTemplate.indexLabel}
            </span>
            <button type="button" onClick={() => { void runGuidedScopeAssessment(); }} disabled={isAssessingScope} className="workspace-secondary-btn px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50">
              <Sparkles className="h-4 w-4" />
              {isAssessingScope ? 'Assessing...' : guidedScopeQuestion ? 'Submit scope answer' : 'Assess scope with AI'}
            </button>
            <button type="button" onClick={applyTemplate} className="workspace-primary-btn px-3 py-2 text-xs">
              <CheckCircle2 className="h-4 w-4" />
              {isApplied ? 'Refresh rows' : 'Apply'}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(22rem,1fr)_auto]">
          <div className="grid gap-3 sm:grid-cols-3">
            <label>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Commercial type</span>
              <select
                value={selectedSector}
                onChange={(event) => handleSectorChange(event.target.value)}
                className={`${inputClass()} mt-1`}
              >
                {getCommercialTemplateSectors().map((sector) => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Template</span>
              <select
                value={selectedTemplate.id}
                onChange={(event) => handleTemplateChange(event.target.value)}
                className={`${inputClass()} mt-1`}
              >
                {templatesForSector.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Location</span>
              <input
                value={option.commercialLocation || ''}
                onChange={(event) => updateOption(option.id, (current) => ({ ...current, commercialLocation: event.target.value }))}
                placeholder="Town, city, postcode"
                className={`${inputClass()} mt-1`}
              />
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[28rem]">
            <div className="rounded-app-sm border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-surface-950">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Sale / rental value</div>
              <div className="mt-1 text-sm font-semibold tabular-nums text-slate-950 dark:text-slate-50">{previewRevenue ? money(calculateRevenueLineValue(previewRevenue)) : '£0'}</div>
            </div>
            <div className="rounded-app-sm border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-surface-950">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Template costs</div>
              <div className="mt-1 text-sm font-semibold tabular-nums text-slate-950 dark:text-slate-50">{money(previewCostTotal)}</div>
            </div>
            <div className="rounded-app-sm border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-surface-950">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Template date</div>
              <div className="mt-1 text-sm font-semibold tabular-nums text-slate-950 dark:text-slate-50">{selectedTemplate.createdAt}</div>
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{selectedTemplate.description}</p>
        {option.commercialScopeAssessment?.summary && !guidedScopeQuestion && (
          <div className="mt-3 rounded-app-sm border border-sky-200 bg-sky-50/70 px-3 py-2 text-xs leading-5 text-sky-950 dark:border-sky-900 dark:bg-sky-950/20 dark:text-sky-100">
            <span className="font-semibold">AI scope proposal.</span> {option.commercialScopeAssessment.summary}
          </div>
        )}
        {guidedScopeQuestion && (
          <div className="mt-3 rounded-app-sm border border-sky-200 bg-sky-50/70 p-3 dark:border-sky-900 dark:bg-sky-950/20">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">Guided AI scope</div>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{guidedScopeQuestion}</p>
              </div>
              <button type="button" onClick={resetGuidedScopeAssessment} className="workspace-secondary-btn px-2.5 py-1.5 text-xs">
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            </div>
            <textarea
              value={guidedScopeAnswer}
              onChange={(event) => setGuidedScopeAnswer(event.target.value)}
              placeholder="Add the available scope information..."
              className={`${inputClass('min-h-[4.5rem]')} mt-2`}
            />
          </div>
        )}
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
        {selectedTemplate.measures.map((measure) => (
          <label key={measure.key} title={measure.helper}>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{measure.key === 'siteAreaM2' ? 'Site area (AI limit)' : measure.label}</span>
            <span className="mt-1 flex overflow-hidden rounded-app-sm border border-slate-200 bg-white dark:border-slate-700 dark:bg-surface-950">
              <input
                type="number"
                min="0"
                value={inputs[measure.key] || ''}
                onChange={(event) => updateMeasure(measure.key, numberValue(event.target.value))}
                className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-right text-xs font-semibold tabular-nums text-slate-900 outline-none dark:text-slate-100"
              />
              <span className="border-l border-slate-200 bg-slate-50 px-2 py-2 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300">
                {measure.unit}
              </span>
            </span>
            {measure.key === 'siteAreaM2' && (
              <span className="mt-1 block text-[10px] leading-4 text-slate-500 dark:text-slate-400">Enter the whole site area. AI can propose the scope, but cannot change this limit.</span>
            )}
          </label>
        ))}
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setShowTemplateRates((current) => !current)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-surface-950"
        >
          <span className="inline-flex items-center gap-2">
            <ChevronRight className={`h-4 w-4 transition-transform ${showTemplateRates ? 'rotate-90' : ''}`} />
            Template rate detail
          </span>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{selectedTemplate.costElements.length} elements</span>
        </button>
        {showTemplateRates && (
          <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-950 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2">Element</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Basis</th>
                  <th className="px-4 py-2 text-right">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {selectedTemplate.costElements.map((element) => (
                  <tr key={element.key}>
                    <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{element.title}</td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{APPRAISAL_COST_CATEGORY_LABELS[element.category]}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                      {element.percentageOf ? element.percentageOf.toLowerCase().replace(/_/g, ' ') : `${element.quantityKey || 'fixed sum'} x ${element.basis}`}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      {element.basis === 'percent' ? `${element.rate}%` : money(element.rate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function HouseStageNav({
  option,
  stage,
  setStage,
  variant = 'pills',
}: {
  option: DevelopmentAppraisalOption;
  stage: HouseStage;
  setStage: React.Dispatch<React.SetStateAction<HouseStage>>;
  variant?: 'pills' | 'rail';
}) {
  const stageStates = React.useMemo(() => {
    const entries = houseStages.map((entry) => [entry.id, getHouseStageState(entry.id, option)] as const);
    return Object.fromEntries(entries) as Record<HouseStage, 'empty' | 'attention' | 'complete'>;
  }, [option]);

  return (
    <div className={variant === 'rail' ? 'space-y-2' : 'flex flex-wrap gap-2'}>
      {houseStages.map((entry) => {
        const Icon = entry.icon;
        const selected = stage === entry.id;
        const state = stageStates[entry.id];
        return (
          <button
            key={entry.id}
            type="button"
            data-smoke={`appraisals-house-stage-${entry.id.toLowerCase().replace(/_/g, '-')}`}
            onClick={() => {
              const completeMeasure = startAppraisalPerformance('workflowStage');
              React.startTransition(() => setStage(entry.id));
              afterNextPaint(completeMeasure);
            }}
            className={variant === 'rail'
              ? `appraisal-stage-button ${selected ? 'appraisal-stage-button-active' : 'appraisal-stage-button-idle'}`
              : `inline-flex items-center gap-2 rounded-app-sm border px-3 py-2 text-xs font-semibold transition ${
                selected
                  ? 'border-primary-300 bg-primary-50 text-primary-800 dark:border-primary-700 dark:bg-primary-950/30 dark:text-primary-100'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300'
              }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{entry.label}</span>
            <span className={`h-2 w-2 shrink-0 rounded-full ${stageStateClass(state)}`} aria-label={stageStateLabel(state)} />
          </button>
        );
      })}
    </div>
  );
}

function PrelimsAssumptionGroup({ title, smokeId, children }: { title: string; smokeId: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true);
  return <section className="rounded-app border border-slate-200 dark:border-slate-800" data-smoke={smokeId}>
    <button type="button" aria-expanded={open} onClick={() => setOpen(current => !current)} className="flex w-full items-center px-4 py-3 text-left font-semibold text-slate-900 dark:text-white">
      <span aria-hidden="true" className={`mr-2 inline-block transition ${open ? 'rotate-90' : ''}`}>▸</span>{title}
    </button>
    {open && <div className="p-3 pt-0">{children}</div>}
  </section>;
}

function StageNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-app border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
      {children}
    </div>
  );
}

function AppraisalQualityChecksPanel({ checks }: { checks: AppraisalQualityIssue[] }) {
  const blockers = checks.filter((check) => check.severity === 'BLOCKER');
  if (checks.length === 0) {
    return <section className="rounded-app border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">Report-preparation checks are complete. The live model has no blocking data-quality issues.</section>;
  }
  return (
    <section className={`rounded-app border p-3 ${blockers.length ? 'border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30' : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'}`}>
      <div className={`text-xs font-semibold ${blockers.length ? 'text-rose-900 dark:text-rose-100' : 'text-amber-900 dark:text-amber-100'}`}>{blockers.length ? `${blockers.length} report blocker${blockers.length === 1 ? '' : 's'} require resolution` : 'Report review required'}</div>
      <ul className={`mt-2 space-y-2 text-xs leading-5 ${blockers.length ? 'text-rose-800 dark:text-rose-200' : 'text-amber-800 dark:text-amber-200'}`}>
        {checks.map((check) => <li key={check.id}><span className="font-semibold">{check.severity === 'BLOCKER' ? 'Blocker' : 'Review'}: </span>{check.message} <span className="font-medium">{check.action}</span></li>)}
      </ul>
    </section>
  );
}

function HouseBuildingEditor({
  appraisal,
  option,
  stage,
  setStage,
  houseTypes,
  rateItems,
  onSaveHouseTypeToLibrary,
  onAddSiteMetricRow,
  onAddSiteMetricFromRate,
  onOpenAppraisalLibraries,
  projects,
  linkedProject,
  updateAppraisal,
  updateOption,
  onExportReport,
  isExporting,
}: {
  appraisal: DevelopmentAppraisal;
  option: DevelopmentAppraisalOption;
  stage: HouseStage;
  setStage: React.Dispatch<React.SetStateAction<HouseStage>>;
  houseTypes: AppraisalHouseTypeLibraryItem[];
  rateItems: AppraisalRateLibraryItem[];
  onSaveHouseTypeToLibrary: (row: AppraisalHouseTypeScheduleRow) => string;
  onAddSiteMetricRow: (section: SiteMetricsSection) => void;
  onAddSiteMetricFromRate: (rateItem: AppraisalRateLibraryItem, section: SiteMetricsSection) => void;
  onOpenAppraisalLibraries: () => void;
  projects: Project[];
  linkedProject: Project | null;
  updateAppraisal: (appraisalId: string, recipe: (appraisal: DevelopmentAppraisal) => DevelopmentAppraisal) => void;
  updateOption: (optionId: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
  onExportReport: (type: AppraisalExportType, reportLandValue?: number) => void;
  isExporting: boolean;
}) {
  if (stage === 'HOUSE_TYPES') {
    return (
      <HouseTypesStage
        appraisal={appraisal}
        option={option}
        houseTypes={houseTypes}
        projects={projects}
        onSaveHouseTypeToLibrary={onSaveHouseTypeToLibrary}
        onOpenAppraisalLibraries={onOpenAppraisalLibraries}
        updateOption={updateOption}
      />
    );
  }
  if (stage === 'PROGRAMME') {
    return (
      <ProgrammeSummaryStage
        appraisal={appraisal}
        option={option}
        updateAppraisal={updateAppraisal}
        updateOption={updateOption}
      />
    );
  }
  if (stage === 'ENGINEERS_SCOPE') return <div key={option.id}><EngineersScopeStage option={option} updateOption={updateOption} /></div>;
  if (stage === 'PRELIMS_ASSUMPTIONS') return <div className="space-y-4" data-smoke="appraisals-prelims-assumptions">
    <PrelimsAssumptionGroup title="Surveys and reports" smokeId="appraisals-prelims-group-surveys"><SurveyReportsPanel option={option} updateOption={updateOption} /></PrelimsAssumptionGroup>
    <PrelimsResourceCountsPanel option={option} updateOption={updateOption} />
    <PrelimsAssumptionGroup title="Site accommodation temporary power" smokeId="appraisals-prelims-group-temporary-power"><PrelimsTemporaryPowerPanel option={option} updateOption={updateOption} /></PrelimsAssumptionGroup>
    <PrelimsAssumptionGroup title="Diesel fuel" smokeId="appraisals-prelims-group-fuel"><PrelimsFuelPanel option={option} updateOption={updateOption} /></PrelimsAssumptionGroup>
    <PrelimsAssumptionGroup title="Silo generator" smokeId="appraisals-prelims-group-silo-generator"><PrelimsSiloGeneratorPanel option={option} updateOption={updateOption} /></PrelimsAssumptionGroup>
    <PrelimsAssumptionGroup title="Health and safety / small plant" smokeId="appraisals-prelims-group-safety-plant"><PrelimsSafetyPlantPanel option={option} updateOption={updateOption} /></PrelimsAssumptionGroup>
    <PrelimsAssumptionGroup title="Heras fencing purchase" smokeId="appraisals-prelims-group-heras-fencing"><PrelimsHerasFencingPanel option={option} updateOption={updateOption} /></PrelimsAssumptionGroup>
    <PrelimsAssumptionGroup title="Construction waste and skips" smokeId="appraisals-prelims-group-skip-waste"><PrelimsSkipWastePanel option={option} updateOption={updateOption} /></PrelimsAssumptionGroup>
    <PrelimsAssumptionGroup title="Plot heating" smokeId="appraisals-prelims-group-plot-heating"><PrelimsPlotHeatingPanel option={option} updateOption={updateOption} /></PrelimsAssumptionGroup>
    <PrelimsAssumptionGroup title="Site accommodation drinking water" smokeId="appraisals-prelims-group-drinking-water"><PrelimsDrinkingWaterPanel option={option} updateOption={updateOption} /></PrelimsAssumptionGroup>
    <PrelimsAssumptionGroup title="Planning and building warrant" smokeId="appraisals-prelims-group-statutory"><ScottishStatutoryFeesPanel option={option} updateOption={updateOption} /></PrelimsAssumptionGroup>
    <PrelimsAssumptionGroup title="Road Construction Consent" smokeId="appraisals-prelims-group-rcc"><RccFeesPanel option={option} updateOption={updateOption} siteCounty={appraisal.siteCounty} /></PrelimsAssumptionGroup>
    <PrelimsAssumptionGroup title="Scottish Water" smokeId="appraisals-prelims-group-water"><ScottishWaterFeesPanel option={option} updateOption={updateOption} /></PrelimsAssumptionGroup>
    <PrelimsAssumptionGroup title="Sales and marketing" smokeId="appraisals-prelims-group-sales-marketing"><PrelimsSalesMarketingPanel option={option} updateOption={updateOption} /></PrelimsAssumptionGroup>
  </div>;
  if (stage === 'BASE_MEASURES') return <BaseMeasuresStage option={option} updateOption={updateOption} />;
  if (stage === 'BASE_DATA') {
    return <BaseMeasurementDataStage option={option} updateOption={updateOption} />;
  }
  if (stage === 'INFRASTRUCTURE' || stage === 'PLOT_WORKS' || stage === 'PRELIMS') {
    return (
      <SiteMetricsStage
        section={stage}
        option={option}
        rateItems={rateItems}
        onAddSiteMetricRow={onAddSiteMetricRow}
        onAddSiteMetricFromRate={onAddSiteMetricFromRate}
        onOpenAppraisalLibraries={onOpenAppraisalLibraries}
        updateOption={updateOption}
      />
    );
  }
  if (stage === 'COST_SUMMARY') {
    return <HouseCostSummaryStage option={option} updateOption={updateOption} />;
  }
  if (stage === 'TRADE_PACKAGE_BUDGET') {
    return (
      <HouseTradePackageBudgetStage
        appraisal={appraisal}
        option={option}
        linkedProject={linkedProject}
      />
    );
  }
  if (stage === 'OVERALL_SUMMARY') {
    return <OverallSummaryStage option={option} />;
  }
  if (stage === 'LAND_CONTRACT') {
    return <LandContractStage option={option} updateOption={updateOption} />;
  }
  if (stage === 'CONSENTS') {
    return <ConsentTrackerStage option={option} updateOption={updateOption} />;
  }
  if (stage === 'ABNORMALS') {
    return <SiteCostsOverview appraisal={appraisal} option={option} projects={projects} linkedProject={linkedProject} updateAppraisal={updateAppraisal} setStage={setStage} updateOption={updateOption} />;
  }
  if (stage === 'SITE_SPECIFIC' || stage === 'ABNORMAL_WORKS') {
    return (
      <div key={stage}><AbnormalsStage
        allocation={stage === 'SITE_SPECIFIC' ? 'SITE_SPECIFIC' : 'ABNORMALS'}
        appraisal={appraisal}
        option={option}
        projects={projects}
        linkedProject={linkedProject}
        updateAppraisal={updateAppraisal}
        updateOption={updateOption}
      /></div>
    );
  }
  if (stage === 'HOUSE_PRICES') {
    return <HousePricesStage appraisal={appraisal} option={option} setStage={setStage} updateOption={updateOption} />;
  }
  if (stage === 'CUSTOM_GDV') {
    return <CustomGdvStage option={option} updateOption={updateOption} />;
  }
  if (stage === 'CUSTOM_COST') {
    return <CustomCostProvisionStage appraisal={appraisal} option={option} updateOption={updateOption} />;
  }
  if (stage === 'NOT_ALLOWED_ABNORMALS') return <NotAllowedAbnormalsStage option={option} appraisalName={appraisal.name} />;
  return (
    <div data-smoke="appraisals-house-final-report" className="space-y-4">
      <AssumptionsEditor option={option} updateOption={updateOption} />
      <DecisionEditor appraisal={appraisal} option={option} updateAppraisal={updateAppraisal} updateOption={updateOption} onExportReport={onExportReport} isExporting={isExporting} />
    </div>
  );
}

const HouseQuantityCells = React.memo(function HouseQuantityCells({
  row,
  onConstructionQuantityCommit,
  onSalesQuantityModeChange,
  onSalesQuantityCommit,
}: {
  row: AppraisalHouseTypeScheduleRow;
  onConstructionQuantityCommit: (row: AppraisalHouseTypeScheduleRow, value: number) => void;
  onSalesQuantityModeChange: (row: AppraisalHouseTypeScheduleRow, separateSalesQuantity: boolean) => void;
  onSalesQuantityCommit: (row: AppraisalHouseTypeScheduleRow, value: number) => void;
}) {
  const actualSeparate = row.separateSalesQuantity === true;
  const [separateDraft, setSeparateDraft] = React.useState(actualSeparate);

  React.useEffect(() => {
    setSeparateDraft(actualSeparate);
  }, [actualSeparate, row.id]);

  const toggleSeparate = () => {
    const next = !separateDraft;
    setSeparateDraft(next);
    React.startTransition(() => {
      onSalesQuantityModeChange(row, next);
    });
  };

  return (
    <>
      <td className="px-3 py-2">
        <DeferredNumberInput
          value={row.quantity || 0}
          blankZero
          onCommit={(value) => onConstructionQuantityCommit(row, value)}
          ariaLabel={`${row.houseTypeName} construction quantity`}
          className={`${inputClass('ml-auto w-24 text-right tabular-nums')} h-8 py-1`}
        />
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={separateDraft}
            onClick={toggleSeparate}
            className={`relative h-6 w-12 shrink-0 rounded-full border transition ${
              separateDraft
                ? 'border-primary-300 bg-primary-500 dark:border-primary-700 dark:bg-primary-600'
                : 'border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-surface-800'
            }`}
            title={separateDraft ? 'Sales quantity is different from construction quantity' : 'Sales quantity matches construction quantity'}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                separateDraft ? 'left-6' : 'left-0.5'
              }`}
            />
          </button>
          <span className="w-14 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {separateDraft ? 'Diff' : 'Same'}
          </span>
          <DeferredNumberInput
            value={calculateHouseTypeSalesQuantity(row)}
            blankZero
            onCommit={(value) => onSalesQuantityCommit(row, value)}
            disabled={!separateDraft}
            ariaLabel={`${row.houseTypeName} sales quantity`}
            className={`${inputClass('w-24 text-right tabular-nums')} h-8 py-1 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-surface-800 dark:disabled:text-slate-400`}
          />
        </div>
      </td>
    </>
  );
});

type HouseScheduleDrawerMode = 'STANDARD' | 'CUSTOM' | 'EDIT';
type HouseTenureValue = NonNullable<AppraisalHouseTypeScheduleRow['tenure']>;
type HouseScheduleFormMode = Exclude<HouseScheduleDrawerMode, 'STANDARD'>;
type CustomHouseCostMode = 'QUICK' | 'GUIDED';
type CustomHouseCostBasis = 'USE_LIBRARY_WHERE_SUITABLE' | 'FIRST_PRINCIPLES';
type SalesPricingMode = 'DEVELOPMENT_RATE_FT2' | 'HOUSE_TYPE_RATE_FT2' | 'ACTUAL_PRICE';
type StandardHouseSelectionDraft = {
  selected: boolean;
  quantity: string;
  tenure: HouseTenureValue;
};
type GuidedHouseCostAnswer = {
  question: string;
  answer: string;
};
type GuidedCustomCostAnswer = {
  question: string;
  answer: string;
};
type GuidedCommercialRevenueAnswer = {
  question: string;
  answer: string;
};
type GuidedCommercialScopeAnswer = {
  question: string;
  answer: string;
};
type GuidedCommercialSiteScopeAnswer = {
  question: string;
  answer: string;
};
type ComponentAllowanceDetailRow = {
  id: string;
  label: string;
  quantity: number;
  unit: string;
  rate: number;
  total: number;
  basis: string;
  included?: boolean;
};
type HouseScheduleDraft = {
  libraryHouseTypeId: string;
  houseTypeName: string;
  guidedConstructionDescription: string;
  guidedSalesDescription: string;
  style: string;
  configuration: string;
  storeys: string;
  bedrooms: string;
  garage: string;
  privateDrive: string;
  tenure: HouseTenureValue;
  quantity: string;
  separateSalesQuantity: boolean;
  salesQuantity: string;
  constructionQuantityLabel: string;
  salesQuantityLabel: string;
  quantitySeparationNotes: string;
  gifaM2: string;
  buildCostPerM2: string;
  priceIndex: string;
  buildPeriodMonths: string;
  salesRows: AppraisalHouseTypeSalesRow[];
  saleValuePerUnit: string;
  saleRatePerM2: string;
  notes: string;
  useCostBreakdown: boolean;
  costBreakdown: AppraisalHouseTypeCostComponent[];
  saveToLibrary: boolean;
};

function standardHouseSelectionDraft(selected = false): StandardHouseSelectionDraft {
  return {
    selected,
    quantity: '',
    tenure: 'PRIVATE',
  };
}

const salesPricingModes: Array<{ id: SalesPricingMode; label: string; description: string }> = [
  { id: 'DEVELOPMENT_RATE_FT2', label: 'Global £/ft2', description: 'Apply one rate across every selected house type.' },
  { id: 'HOUSE_TYPE_RATE_FT2', label: 'Individual £/ft2', description: 'Set a different rate for each house type.' },
  { id: 'ACTUAL_PRICE', label: 'Individual prices', description: 'Enter sale price per unit for each house type.' },
];

const MAX_PRICING_REPORT_BYTES = 50 * 1024 * 1024;

function cloneHouseTypeCostBreakdown(costBreakdown?: AppraisalHouseTypeCostComponent[]) {
  return (costBreakdown?.length ? costBreakdown : createDefaultHouseTypeCostBreakdown()).map((component) => ({
    ...component,
    id: generateId(),
  }));
}

function houseScheduleDraftFromRow(row: AppraisalHouseTypeScheduleRow): HouseScheduleDraft {
  const costBreakdown = cloneHouseTypeCostBreakdown(row.costBreakdown);
  const hasCostBreakdown = Boolean(row.costBreakdown?.length && calculateHouseTypeCostBreakdownTotal(row.costBreakdown) > 0);
  return {
    libraryHouseTypeId: row.libraryHouseTypeId || '',
    houseTypeName: row.houseTypeName,
    guidedConstructionDescription: '',
    guidedSalesDescription: '',
    style: row.style || '',
    configuration: row.configuration || '',
    storeys: row.storeys ? String(row.storeys) : '',
    bedrooms: row.bedrooms ? String(row.bedrooms) : '',
    garage: row.garage === undefined ? '' : row.garage ? 'YES' : 'NO',
    privateDrive: row.privateDrive === undefined ? '' : row.privateDrive ? 'YES' : 'NO',
    tenure: row.tenure || 'PRIVATE',
    quantity: String(row.quantity || 0),
    separateSalesQuantity: row.separateSalesQuantity === true,
    salesQuantity: row.salesQuantity ? String(row.salesQuantity) : '',
    constructionQuantityLabel: row.constructionQuantityLabel || '',
    salesQuantityLabel: row.salesQuantityLabel || '',
    quantitySeparationNotes: row.quantitySeparationNotes || '',
    gifaM2: String(row.gifaM2 || 0),
    buildCostPerM2: String(calculateHouseTypeScheduleBuildCostPerM2(row) || 0),
    priceIndex: String(row.priceIndex || 0),
    buildPeriodMonths: String(row.buildPeriodMonths || 0),
    salesRows: getHouseTypeSalesRows(row),
    saleValuePerUnit: String(row.saleValuePerUnit || 0),
    saleRatePerM2: String(row.saleRatePerM2 || 0),
    notes: row.notes || '',
    useCostBreakdown: hasCostBreakdown,
    costBreakdown,
    saveToLibrary: false,
  };
}

function comparableHouseScheduleDraft(draft: HouseScheduleDraft) {
  return {
    ...draft,
    costBreakdown: draft.costBreakdown.map(({ id: _id, ...component }) => component),
  };
}

function houseScheduleDraftsEqual(a: HouseScheduleDraft, b: HouseScheduleDraft) {
  return JSON.stringify(comparableHouseScheduleDraft(a)) === JSON.stringify(comparableHouseScheduleDraft(b));
}

function nextFallbackGuidedHouseCostQuestion(draft: HouseScheduleDraft, answers: GuidedHouseCostAnswer[]) {
  const asked = new Set(answers.map((entry) => entry.question));
  const answerText = answers.map((entry) => `${entry.question} ${entry.answer}`).join('\n');
  const inferred = inferGuidedHouseTypeBasics(draft.guidedConstructionDescription, draft.guidedSalesDescription, answerText);
  const hasStyleAndConfiguration = Boolean((draft.style || inferred.style) && (draft.configuration || inferred.configuration));
  const candidates = [
    !draft.guidedConstructionDescription.trim()
      ? 'Describe the construction item that should be costed, for example one block of flats, a terrace block, or a bespoke house type.'
      : '',
    !draft.guidedSalesDescription.trim()
      ? 'Describe the sales units that will be sold from this construction item, for example 12 flats, 6 townhouses, or one private house.'
      : '',
    !hasStyleAndConfiguration
      ? 'What is the intended house style and configuration, for example detached villa, semi-detached, bungalow, flat, mid terrace, or end terrace?'
      : '',
    !draft.storeys || !draft.bedrooms
      ? 'How many storeys and bedrooms should this custom house type have?'
      : '',
    numberValue(draft.gifaM2) <= 0
      ? 'What gross internal floor area should be costed per construction unit, in m2?'
      : '',
    'What is the main construction form: timber kit, masonry/brick/block, steel frame, concrete frame, or another system?',
    'Does the construction need a lift, precast/common stairs, handrails/balustrades, door entry, smoke ventilation, landlord lighting, or other communal area costs?',
    draft.garage === '' || draft.privateDrive === ''
      ? 'Should the house type include a garage, private driveway, EV charging, or any other plot-specific feature within the house cost?'
      : '',
    'Should EV chargers, ASHPs, PV, sprinklers, fire/acoustic compartmentation, or enhanced renewables be included in the house type cost?',
    'What specification level should be assumed for the construction, finishes, MEP, heating system, renewables, and kitchen/bathroom fit-out?',
    'Is there anything unusual about the design, construction method, access, structure, envelope, or services that should increase or reduce the house cost?',
    'Are any costs already allowed elsewhere in the appraisal that should be excluded from this custom house type rate?',
  ].filter(Boolean);
  return candidates.find((question) => !asked.has(question)) || candidates[candidates.length - 1] || 'What further cost-critical detail should be considered for this custom house type?';
}

function inferQuantityFromText(text: string, labels: string[]) {
  const normalized = text.toLowerCase();
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const before = normalized.match(new RegExp(`(\\d+)\\s+(?:\\w+\\s+){0,2}${escaped}s?\\b`));
    if (before) return Number(before[1]);
    const after = normalized.match(new RegExp(`${escaped}s?\\s+(?:of\\s+)?(\\d+)\\b`));
    if (after) return Number(after[1]);
  }
  const firstNumber = normalized.match(/\b(\d+)\b/);
  return firstNumber ? Number(firstNumber[1]) : 0;
}

function inferAreaM2FromText(text: string) {
  const normalized = text.toLowerCase().replace(/,/g, '');
  const explicitArea = normalized.match(/\b(\d+(?:\.\d+)?)\s*(?:m2|sq\s*m|sqm|square\s*metres?|square\s*meters?)\b/);
  if (explicitArea) return Number(explicitArea[1]);
  const gifaArea = normalized.match(/\b(?:gifa|gia|floor\s*area|gross\s*internal\s*floor\s*area)\D{0,24}(\d+(?:\.\d+)?)\b/);
  return gifaArea ? Number(gifaArea[1]) : 0;
}

function inferStoreysFromText(text: string) {
  const normalized = text.toLowerCase();
  const numeric = normalized.match(/\b(\d+)\s*(?:storey|storeys|story|stories|floor|floors)\b/);
  if (numeric) return Number(numeric[1]);
  if (/\b(single|one)[-\s]*(?:storey|story)\b/.test(normalized)) return 1;
  if (/\b(two|2)[-\s]*(?:storey|story)\b/.test(normalized)) return 2;
  if (/\b(three|3)[-\s]*(?:storey|story)\b/.test(normalized)) return 3;
  if (/\b(four|4)[-\s]*(?:storey|story)\b/.test(normalized)) return 4;
  if (/\b(five|5)[-\s]*(?:storey|story)\b/.test(normalized)) return 5;
  return 0;
}

function inferSaleFlatAreaM2FromText(text: string) {
  const normalized = text.toLowerCase().replace(/,/g, '');
  const flatOfArea = normalized.match(/\b(?:flat|flats|apartment|apartments)\s+(?:of|at)\s+(\d+(?:\.\d+)?)\s*(?:m2|sq\s*m|sqm|square\s*metres?|square\s*meters?)\b/);
  if (flatOfArea) return Number(flatOfArea[1]);
  const areaFlat = normalized.match(/\b(\d+(?:\.\d+)?)\s*(?:m2|sq\s*m|sqm|square\s*metres?|square\s*meters?)\s+(?:flat|flats|apartment|apartments)\b/);
  return areaFlat ? Number(areaFlat[1]) : 0;
}

function inferFlatLevelQuantity(text: string, levelPattern: string): number {
  const patterns = [
    new RegExp(`\\b(\\d+)\\s*(?:nr|no\\.?|number)?\\s*(?:of\\s+)?(?:${levelPattern})(?:\\s+floor)?\\s*(?:flat|flats|apartment|apartments)?\\b`, 'i'),
    new RegExp(`\\b(\\d+)\\s+(?:on\\s+(?:the\\s+)?)?(?:${levelPattern})(?:\\s+floor)?\\b`, 'i'),
    new RegExp(`\\b(?:${levelPattern})(?:\\s+floor)?\\s*(?:flat|flats|apartment|apartments)?\\D{0,16}(\\d+)\\b`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match ? Number(match[1]) : 0;
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

function inferFlatLevelQuantities(text: string, salesQuantity: number) {
  const ground = inferFlatLevelQuantity(text, 'gf|ground(?:\\s+floor)?');
  const mid = inferFlatLevelQuantity(text, 'mid(?:dle)?(?:\\s+floor)?');
  const top = inferFlatLevelQuantity(text, 'top(?:\\s+floor)?|upper(?:\\s+floor)?');
  const explicitTotal = ground + mid + top;
  if (ground > 0 && mid > 0 && top > 0) {
    const scale = explicitTotal > 0 && explicitTotal < salesQuantity && salesQuantity % explicitTotal === 0
      ? salesQuantity / explicitTotal
      : 1;
    return { ground: Math.round(ground * scale), mid: Math.round(mid * scale), top: Math.round(top * scale) };
  }
  const mentionsAllLevels = /\b(gf|ground(?:\s+floor)?)\b/i.test(text)
    && /\bmid(?:dle)?(?:\s+floor)?\b/i.test(text)
    && /\b(top(?:\s+floor)?|upper(?:\s+floor)?)\b/i.test(text);
  const impliesThreeFloors = /\b(?:3|three)[-\s]*storey\b/i.test(text)
    || /\b(?:3|three)\s+floors?\b/i.test(text)
    || /\bper\s+floor\b/i.test(text);
  if (!mentionsAllLevels && !impliesThreeFloors) return null;
  const equalQuantity = Math.max(1, Math.round(salesQuantity / 3));
  return { ground: equalQuantity, mid: equalQuantity, top: Math.max(0, salesQuantity - equalQuantity * 2) };
}

function inferFlatSalesRowsFromText(salesText: string, salesQuantity: number, fallbackGifaM2: number): AppraisalHouseTypeSalesRow[] {
  const text = salesText.toLowerCase().replace(/,/g, '');
  const looksLikeFlatBlock = /\b(flat|flats|apartment|apartments)\b/.test(text);
  if (!looksLikeFlatBlock || salesQuantity <= 1) return [];
  const levelQuantities = inferFlatLevelQuantities(text, salesQuantity);
  if (!levelQuantities) return [];
  const gifaM2 = inferSaleFlatAreaM2FromText(text) || Math.max(0, fallbackGifaM2) || inferAreaM2FromText(text);
  if (gifaM2 <= 0) return [];
  return [
    { id: generateId(), label: 'Ground floor flat', quantity: levelQuantities.ground, gifaM2, saleValuePerUnit: 0, saleRatePerM2: 0, notes: '' },
    { id: generateId(), label: 'Mid floor flat', quantity: levelQuantities.mid, gifaM2, saleValuePerUnit: 0, saleRatePerM2: 0, notes: '' },
    { id: generateId(), label: 'Top floor flat', quantity: levelQuantities.top, gifaM2, saleValuePerUnit: 0, saleRatePerM2: 0, notes: '' },
  ].filter((row) => row.quantity > 0);
}

function inferGuidedHouseTypeBasics(constructionDescription: string, salesDescription: string, answerText = '') {
  const combined = `${constructionDescription}\n${salesDescription}\n${answerText}`.toLowerCase();
  if (/\b(flat|flats|apartment|apartments)\b/.test(combined) || /\bblock\b/.test(combined)) {
    return {
      houseTypeName: 'Block of flats',
      style: 'FLAT' as AppraisalHouseTypeStyle,
      configuration: 'OTHER' as AppraisalHouseTypeConfiguration,
      constructionQuantityLabel: 'block',
      salesQuantityLabel: 'flat',
    };
  }
  if (/\b(mid\s*terrace|end\s*terrace|terrace|terraced)\b/.test(combined)) {
    return {
      houseTypeName: 'Terrace housing',
      style: 'TERRACE' as AppraisalHouseTypeStyle,
      configuration: 'TERRACE' as AppraisalHouseTypeConfiguration,
      constructionQuantityLabel: 'unit',
      salesQuantityLabel: 'house',
    };
  }
  if (/\b(bungalow|bungalows)\b/.test(combined)) {
    return {
      houseTypeName: 'Bungalow',
      style: 'BUNGALOW' as AppraisalHouseTypeStyle,
      configuration: 'OTHER' as AppraisalHouseTypeConfiguration,
      constructionQuantityLabel: 'unit',
      salesQuantityLabel: 'house',
    };
  }
  return {
    houseTypeName: '',
    style: '' as AppraisalHouseTypeStyle | '',
    configuration: '' as AppraisalHouseTypeConfiguration | '',
    constructionQuantityLabel: '',
    salesQuantityLabel: '',
  };
}

const HOUSE_TYPE_COMPONENT_ALLOCATION_WEIGHTS: Partial<Record<AppraisalHouseTypeCostComponent['key'], number>> = {
  GROUNDWORK: 4,
  BRICK_LAB: 5,
  BRICK_MAT: 7,
  KIT: 18,
  JOINER: 8,
  WINDOWS_DOORS: 5,
  METALWORK: 4,
  STEEL: 3,
  SECOND_STEEL: 2,
  ROOFING: 6,
  PV: 1,
  ROUGHCAST: 3,
  ELECTRICAL: 7,
  PLUMBING: 8,
  GARAGE_DOORS: 0,
  EV_CHARGERS: 1,
  AIR_SOURCE_HEAT_PUMPS: 4,
  CERAMIC_TILING: 2,
  DECORATION: 4,
  SEALANTS: 1,
  KITCHEN: 5,
  CLEANING: 1,
  SCAFFOLD: 3,
  FIRE_PROTECTION: 4,
  LIFT: 0,
  COMMON_STAIRS: 0,
  HANDRAILS_BALUSTRADES: 0,
  LANDLORD_LIGHTING: 0,
  DOOR_ENTRY_ACCESS: 0,
  SMOKE_VENT_FIRE_ALARM: 0,
  ACOUSTIC_COMPARTMENTATION: 0,
  COMMUNAL_FINISHES: 0,
  REFUSE_CYCLE_STORES: 0,
};

function inferHouseTypeComponentKeyFromText(text: string): AppraisalHouseTypeCostComponent['key'] | undefined {
  const normalized = text.toLowerCase();
  if (/\b(lift|elevator|passenger\s+lift|lift\s+shaft)\b/.test(normalized)) return 'LIFT';
  if (/\b(precast\s+stair|common\s+stair|communal\s+stair|staircase|stairwell)\b/.test(normalized)) return 'COMMON_STAIRS';
  if (/\b(balustrade|handrail|guarding|guardrail)\b/.test(normalized)) return 'HANDRAILS_BALUSTRADES';
  if (/\b(landlord|communal|common)\s+(lighting|power|electrical)\b/.test(normalized)) return 'LANDLORD_LIGHTING';
  if (/\b(access\s+control|door\s+entry|intercom|entry\s+system|controlled\s+entry)\b/.test(normalized)) return 'DOOR_ENTRY_ACCESS';
  if (/\b(smoke\s+vent|smoke\s+ventilation|fire\s+alarm|sprinkler|alarm)\b/.test(normalized)) return 'SMOKE_VENT_FIRE_ALARM';
  if (/\b(compartment|compartmentation|firestop|fire\s+stop|acoustic|separation)\b/.test(normalized)) return 'ACOUSTIC_COMPARTMENTATION';
  if (/\b(fire)\b/.test(normalized)) return 'FIRE_PROTECTION';
  if (/\b(communal|common|corridor|stair)\s+(finish|finishes|decoration|decorations|flooring|paint)\b/.test(normalized)) return 'COMMUNAL_FINISHES';
  if (/\b(refuse|bin\s+store|cycle\s+store|bike\s+store|store)\b/.test(normalized)) return 'REFUSE_CYCLE_STORES';
  if (/\b(ashp|air\s+source|heat\s+pump)\b/.test(normalized)) return 'AIR_SOURCE_HEAT_PUMPS';
  if (/\b(ev|charger|charging)\b/.test(normalized)) return 'EV_CHARGERS';
  if (/\b(electrical|lighting|power|consumer|wiring|alarm)\b/.test(normalized)) return 'ELECTRICAL';
  if (/\b(plumbing|heating|sanitary|bathroom|water|drainage|soil|vent)\b/.test(normalized)) return 'PLUMBING';
  if (/\b(window|door|glazing|screen)\b/.test(normalized)) return 'WINDOWS_DOORS';
  if (/\b(brick|blockwork|masonry|facade|facing)\b/.test(normalized)) return 'BRICK_MAT';
  if (/\b(frame|timber\s+frame|kit)\b/.test(normalized)) return 'KIT';
  if (/\b(steel|beam|lintel)\b/.test(normalized)) return 'STEEL';
  if (/\b(roof|truss|tile|slate)\b/.test(normalized)) return 'ROOFING';
  if (/\b(joiner|joinery|internal\s+door|skirting|stair)\b/.test(normalized)) return 'JOINER';
  if (/\b(scaffold|scaffolding)\b/.test(normalized)) return 'SCAFFOLD';
  if (/\b(clean|cleaning|sparkle)\b/.test(normalized)) return 'CLEANING';
  if (/\b(kitchen|appliance)\b/.test(normalized)) return 'KITCHEN';
  if (/\b(tile|tiling|ceramic)\b/.test(normalized)) return 'CERAMIC_TILING';
  if (/\b(roughcast|render|cladding)\b/.test(normalized)) return 'ROUGHCAST';
  if (/\b(sealant|sealants|mastic)\b/.test(normalized)) return 'SEALANTS';
  if (/\b(groundwork|foundation|substructure|slab)\b/.test(normalized)) return 'GROUNDWORK';
  return undefined;
}

function inferApartmentSpecificAllowances(
  text: string,
  targetTotal: number,
  gifaM2: number
): Partial<Record<AppraisalHouseTypeCostComponent['key'], { amount: number; note: string }>> {
  const normalized = text.toLowerCase();
  const add = (
    key: AppraisalHouseTypeCostComponent['key'],
    amount: number,
    note: string,
    rows: Partial<Record<AppraisalHouseTypeCostComponent['key'], { amount: number; note: string }>>
  ) => {
    if (amount <= 0) return;
    rows[key] = {
      amount: Math.round(amount),
      note,
    };
  };
  const rows: Partial<Record<AppraisalHouseTypeCostComponent['key'], { amount: number; note: string }>> = {};
  const cap = (amount: number, share = 0.08) => Math.min(Math.round(amount), Math.round(targetTotal * share));
  if (/\b(lift|elevator|passenger\s+lift|lift\s+shaft)\b/.test(normalized)) {
    add('LIFT', cap(45000, 0.1), 'Provisional allowance for passenger lift/lift shaft noted in the description.', rows);
  }
  if (/\b(precast\s+stair|common\s+stair|communal\s+stair|staircase|stairwell)\b/.test(normalized)) {
    add('COMMON_STAIRS', cap(25000, 0.06), 'Provisional allowance for common/precast stairs noted in the description.', rows);
  }
  if (/\b(balustrade|handrail|guarding|guardrail)\b/.test(normalized)) {
    add('HANDRAILS_BALUSTRADES', cap(9000, 0.03), 'Provisional allowance for handrails/balustrades noted in the description.', rows);
  }
  if (/\b(landlord|communal|common)\s+(lighting|power|electrical)\b/.test(normalized)) {
    add('LANDLORD_LIGHTING', cap(Math.max(9000, gifaM2 * 18), 0.04), 'Provisional allowance for landlord/common lighting and power.', rows);
  }
  if (/\b(access\s+control|door\s+entry|intercom|entry\s+system|controlled\s+entry)\b/.test(normalized)) {
    add('DOOR_ENTRY_ACCESS', cap(6000, 0.025), 'Provisional allowance for door entry/access control.', rows);
  }
  if (/\b(smoke\s+vent|smoke\s+ventilation|fire\s+alarm|sprinkler|alarm)\b/.test(normalized)) {
    add('SMOKE_VENT_FIRE_ALARM', cap(Math.max(10000, gifaM2 * 18), 0.04), 'Provisional allowance for fire alarm/smoke ventilation requirements.', rows);
  }
  if (/\b(compartment|compartmentation|firestop|fire\s+stop|acoustic|separation)\b/.test(normalized)) {
    add('ACOUSTIC_COMPARTMENTATION', cap(Math.max(18000, gifaM2 * 40), 0.06), 'Provisional allowance for acoustic/fire compartmentation uplift.', rows);
  }
  if (/\b(communal|common|corridor|stair)\s+(finish|finishes|decoration|decorations|flooring|paint)\b/.test(normalized)) {
    add('COMMUNAL_FINISHES', cap(Math.max(12000, gifaM2 * 22), 0.04), 'Provisional allowance for communal corridor/stair finishes.', rows);
  }
  if (/\b(refuse|bin\s+store|cycle\s+store|bike\s+store)\b/.test(normalized)) {
    add('REFUSE_CYCLE_STORES', cap(8000, 0.025), 'Provisional allowance for refuse/cycle store provision noted in the description.', rows);
  }
  return rows;
}

function buildComponentAllowanceDetailRows(
  component: AppraisalHouseTypeCostComponent,
  draft: HouseScheduleDraft
): ComponentAllowanceDetailRow[] {
  if (component.detailRows?.length) {
    return component.detailRows
      .map((row, index) => ({
        id: row.id || `detail-${index}`,
        label: row.label || 'Allowance item',
        quantity: Math.max(0, Number(row.quantity) || 0),
        unit: row.unit || 'item',
        rate: Math.max(0, Number(row.rate) || 0),
        total: Math.max(0, Number(row.total) || 0),
        basis: row.basis || 'AI measured build-up row.',
        included: row.included === false ? false : true,
      }))
      .filter((row) => row.label);
  }
  const amount = Math.max(0, Math.round(Number(component.amount) || 0));
  if (amount <= 0) return [];
  const constructionQuantity = Math.max(1, numberValue(draft.quantity) || 1);
  const salesQuantity = Math.max(0, numberValue(draft.salesQuantity) || numberValue(draft.quantity) || 0);
  const salesPerConstructionUnit = draft.separateSalesQuantity && salesQuantity > 0
    ? Math.max(0, salesQuantity / constructionQuantity)
    : 1;
  const gifaM2 = Math.max(0, numberValue(draft.gifaM2));
  const displayLabel = component.label?.trim() || APPRAISAL_HOUSE_TYPE_COST_LABELS[component.key];
  const storeys = Math.max(1, numberValue(draft.storeys) || inferStoreysFromText([
    draft.guidedConstructionDescription,
    draft.quantitySeparationNotes,
    draft.notes,
  ].join('\n')) || 1);
  const footprintM2 = gifaM2 > 0 ? Math.max(1, Math.round(gifaM2 / storeys)) : 1;
  const roofAreaM2 = Math.max(1, Math.round(footprintM2 * 1.15));
  const commonAreaM2 = Math.max(1, Math.round(gifaM2 * 0.12));
  const saleUnitCount = Math.max(1, salesPerConstructionUnit || salesQuantity || 1);
  const bedroomCount = Math.max(1, numberValue(draft.bedrooms) || 2);
  const wetRoomCount = Math.max(1, Math.round(saleUnitCount * 1.35));
  const planSideM = Math.max(1, Math.sqrt(footprintM2));
  const perimeterM = Math.max(1, Math.round(planSideM * 4));
  const externalWallAreaM2 = Math.max(1, Math.round(perimeterM * storeys * 2.7));
  const splitRows = (
    rows: Array<{ id: string; label: string; share: number; quantity: number; unit: string; basis: string }>
  ): ComponentAllowanceDetailRow[] => {
    const shareTotal = rows.reduce((total, row) => total + Math.max(0, row.share), 0) || 1;
    return rows.map((row) => {
      const total = Math.round(amount * (Math.max(0, row.share) / shareTotal));
      const quantity = Math.max(0, row.quantity);
      return {
        id: row.id,
        label: row.label,
        quantity,
        unit: row.unit,
        rate: quantity > 0 ? total / quantity : total,
        total,
        basis: row.basis,
      };
    });
  };
  const lump = (label: string, basis: string): ComponentAllowanceDetailRow[] => [{
    id: 'lump-sum',
    label,
    quantity: 1,
    unit: 'item',
    rate: amount,
    total: amount,
    basis,
  }];

  switch (component.key) {
    case 'GROUNDWORK':
      return splitRows([
        { id: 'foundations', label: 'Foundations / substructure', share: 40, quantity: footprintM2, unit: 'm2 footprint', basis: 'Inferred from GIFA divided by storeys.' },
        { id: 'underslab-drainage', label: 'Underslab drainage', share: 18, quantity: footprintM2, unit: 'm2 footprint', basis: 'Indicative allowance within the footprint.' },
        { id: 'incoming-services', label: 'Incoming service ducts/sleeves', share: 14, quantity: salesPerConstructionUnit || 1, unit: 'unit', basis: 'Based on saleable units per construction unit where available.' },
        { id: 'ground-floor-slab', label: 'Ground floor slab / oversite', share: 28, quantity: footprintM2, unit: 'm2 footprint', basis: 'Inferred ground floor slab area.' },
      ]);
    case 'BRICK_LAB':
      return splitRows([
        { id: 'substructure-labour', label: 'Substructure/blockwork labour', share: 22, quantity: footprintM2, unit: 'm2 footprint', basis: 'Inferred from footprint.' },
        { id: 'superstructure-labour', label: 'External wall/blockwork labour', share: 58, quantity: externalWallAreaM2, unit: 'm2 wall', basis: 'External wall area inferred from footprint, storeys and storey height.' },
        { id: 'openings-detailing-labour', label: 'Openings, lintels and detailing labour', share: 20, quantity: saleUnitCount, unit: 'unit', basis: 'Based on saleable units per construction unit.' },
      ]);
    case 'BRICK_MAT':
      return splitRows([
        { id: 'blocks-bricks', label: 'Blocks/bricks/facing materials', share: 60, quantity: externalWallAreaM2, unit: 'm2 wall', basis: 'External wall area inferred from footprint, storeys and storey height.' },
        { id: 'mortar-dpc-cavity', label: 'Mortar, DPCs, cavity trays and sundries', share: 18, quantity: externalWallAreaM2, unit: 'm2 wall', basis: 'Proportional allowance against inferred wall area.' },
        { id: 'lintels-cills', label: 'Lintels, cills and wall accessories', share: 22, quantity: saleUnitCount, unit: 'unit', basis: 'Based on saleable units per construction unit.' },
      ]);
    case 'KIT':
      return splitRows([
        { id: 'frame-panels', label: 'Timber frame / structural kit panels', share: 55, quantity: gifaM2 || 1, unit: 'm2 GIFA', basis: 'Measured against construction GIFA.' },
        { id: 'floors-internal-walls', label: 'Upper floors, partitions and internal structural walls', share: 30, quantity: gifaM2 || 1, unit: 'm2 GIFA', basis: 'Measured against construction GIFA.' },
        { id: 'kit-design-delivery', label: 'Kit design, delivery and erection sundries', share: 15, quantity: constructionQuantity, unit: draft.constructionQuantityLabel || 'unit', basis: 'Based on construction units.' },
      ]);
    case 'JOINER':
      return splitRows([
        { id: 'first-fix-joinery', label: 'First fix joinery', share: 35, quantity: gifaM2 || 1, unit: 'm2 GIFA', basis: 'Measured against construction GIFA.' },
        { id: 'second-fix-joinery', label: 'Second fix joinery, skirtings and facings', share: 35, quantity: saleUnitCount, unit: 'unit', basis: 'Based on saleable units per construction unit.' },
        { id: 'internal-doors-ironmongery', label: 'Internal doors and ironmongery', share: 30, quantity: Math.max(1, saleUnitCount * (bedroomCount + 3)), unit: 'door set', basis: 'Door count inferred from units and bedrooms.' },
      ]);
    case 'WINDOWS_DOORS':
      return splitRows([
        { id: 'windows', label: 'Windows', share: 62, quantity: saleUnitCount, unit: 'unit', basis: 'Window allowance distributed by saleable units.' },
        { id: 'external-doors', label: 'External doors / screens', share: 28, quantity: saleUnitCount, unit: 'unit', basis: 'Door allowance distributed by saleable units.' },
        { id: 'trims-sealants', label: 'Trims, fixings and making good', share: 10, quantity: externalWallAreaM2, unit: 'm2 wall', basis: 'Proportional allowance against inferred wall area.' },
      ]);
    case 'METALWORK':
      return splitRows([
        { id: 'misc-metalwork', label: 'Miscellaneous metalwork', share: 45, quantity: saleUnitCount, unit: 'unit', basis: 'Based on saleable units per construction unit.' },
        { id: 'brackets-supports', label: 'Brackets, supports and secondary metal items', share: 35, quantity: gifaM2 || 1, unit: 'm2 GIFA', basis: 'Measured against construction GIFA.' },
        { id: 'metalwork-sundries', label: 'Fixings, trims and sundries', share: 20, quantity: constructionQuantity, unit: draft.constructionQuantityLabel || 'unit', basis: 'Based on construction units.' },
      ]);
    case 'STEEL':
      return splitRows([
        { id: 'primary-steel', label: 'Primary structural steel', share: 70, quantity: gifaM2 || 1, unit: 'm2 GIFA', basis: 'Measured against construction GIFA.' },
        { id: 'steel-connections', label: 'Connections, plates and sundries', share: 20, quantity: gifaM2 || 1, unit: 'm2 GIFA', basis: 'Proportional allowance against GIFA.' },
        { id: 'steel-installation', label: 'Steel installation allowance', share: 10, quantity: constructionQuantity, unit: draft.constructionQuantityLabel || 'unit', basis: 'Based on construction units.' },
      ]);
    case 'SECOND_STEEL':
      return splitRows([
        { id: 'secondary-steel', label: 'Secondary steel / lintel steel', share: 65, quantity: saleUnitCount, unit: 'unit', basis: 'Based on saleable units per construction unit.' },
        { id: 'trimmers-bracing', label: 'Trimmers, bracing and local supports', share: 35, quantity: gifaM2 || 1, unit: 'm2 GIFA', basis: 'Measured against construction GIFA.' },
      ]);
    case 'KITCHEN': {
      const saleRows = draft.salesRows.length ? draft.salesRows : [{
        id: 'sale-units',
        label: draft.salesQuantityLabel || 'Sale unit',
        quantity: salesPerConstructionUnit,
        gifaM2: 0,
      }];
      const totalQty = saleRows.reduce((total, row) => total + Math.max(0, row.quantity || 0), 0) || salesPerConstructionUnit || 1;
      return saleRows.map((row) => {
        const quantity = Math.max(0, (row.quantity || 0) / constructionQuantity) || salesPerConstructionUnit || 1;
        const total = Math.round(amount * ((row.quantity || totalQty) / totalQty));
        return {
          id: `kitchen-${row.id}`,
          label: `Kitchen allowance - ${row.label}`,
          quantity,
          unit: 'nr',
          rate: quantity > 0 ? total / quantity : total,
          total,
          basis: 'Based on saleable units per construction unit.',
        };
      });
    }
    case 'ROOFING': {
      return splitRows([
        { id: 'roof-structure', label: 'Roof structure/trusses', share: 45, quantity: roofAreaM2, unit: 'm2 roof', basis: 'Roof area inferred from footprint with pitch allowance.' },
        { id: 'roof-covering', label: 'Roof covering, battens and membranes', share: 40, quantity: roofAreaM2, unit: 'm2 roof', basis: 'Roof area inferred from footprint with pitch allowance.' },
        { id: 'rainwater', label: 'Rainwater goods and roof trim', share: 15, quantity: roofAreaM2, unit: 'm2 roof', basis: 'Proportional allowance within roof package.' },
      ]);
    }
    case 'PV':
      return splitRows([
        { id: 'pv-panels', label: 'PV panels', share: 70, quantity: roofAreaM2, unit: 'm2 roof', basis: 'Roof area inferred from footprint with pitch allowance.' },
        { id: 'pv-inverter-controls', label: 'Inverter, controls and cabling', share: 20, quantity: constructionQuantity, unit: draft.constructionQuantityLabel || 'unit', basis: 'Based on construction units.' },
        { id: 'pv-commissioning', label: 'Testing and commissioning', share: 10, quantity: constructionQuantity, unit: draft.constructionQuantityLabel || 'unit', basis: 'Based on construction units.' },
      ]);
    case 'ROUGHCAST':
      return splitRows([
        { id: 'render-basecoat', label: 'Render/roughcast base coats', share: 45, quantity: externalWallAreaM2, unit: 'm2 wall', basis: 'External wall area inferred from footprint, storeys and storey height.' },
        { id: 'finish-coat', label: 'Finish coat / dash / texture', share: 40, quantity: externalWallAreaM2, unit: 'm2 wall', basis: 'External wall area inferred from footprint, storeys and storey height.' },
        { id: 'beads-trims-protection', label: 'Beads, trims and protection', share: 15, quantity: perimeterM, unit: 'm perimeter', basis: 'Perimeter inferred from footprint.' },
      ]);
    case 'ELECTRICAL':
      return splitRows([
        { id: 'first-fix-electrical', label: 'First fix electrical', share: 34, quantity: gifaM2 || 1, unit: 'm2 GIFA', basis: 'Measured against construction GIFA.' },
        { id: 'second-fix-electrical', label: 'Second fix, accessories and lighting', share: 38, quantity: saleUnitCount, unit: 'unit', basis: 'Based on saleable units per construction unit.' },
        { id: 'consumer-units-testing', label: 'Consumer units, testing and certification', share: 18, quantity: saleUnitCount, unit: 'unit', basis: 'Based on saleable units per construction unit.' },
        { id: 'common-electrical', label: 'Common/service electrical allowance', share: 10, quantity: commonAreaM2, unit: 'm2 common', basis: 'Common area estimated as 12% of GIFA unless better detail is entered.' },
      ]);
    case 'PLUMBING':
      return splitRows([
        { id: 'first-fix-plumbing', label: 'First fix plumbing and drainage', share: 34, quantity: wetRoomCount, unit: 'wet room', basis: 'Wet-room count inferred from saleable units.' },
        { id: 'sanitaryware', label: 'Sanitaryware and brassware', share: 30, quantity: wetRoomCount, unit: 'wet room', basis: 'Wet-room count inferred from saleable units.' },
        { id: 'heating-distribution', label: 'Heating distribution and controls', share: 26, quantity: saleUnitCount, unit: 'unit', basis: 'Based on saleable units per construction unit.' },
        { id: 'testing-commissioning', label: 'Testing and commissioning', share: 10, quantity: saleUnitCount, unit: 'unit', basis: 'Based on saleable units per construction unit.' },
      ]);
    case 'GARAGE_DOORS':
      return splitRows([
        { id: 'garage-doors', label: 'Garage doors', share: 80, quantity: saleUnitCount, unit: 'nr', basis: 'Based on units assumed to have garages unless edited.' },
        { id: 'garage-door-ironmongery', label: 'Frames, ironmongery and installation', share: 20, quantity: saleUnitCount, unit: 'nr', basis: 'Based on units assumed to have garages unless edited.' },
      ]);
    case 'LIFT':
      return splitRows([
        { id: 'lift-car-equipment', label: 'Lift car, doors and equipment', share: 65, quantity: 1, unit: 'lift', basis: 'Typically one lift per block unless noted otherwise.' },
        { id: 'lift-shaft-builderwork', label: 'Lift shaft builderwork / builders work', share: 20, quantity: storeys, unit: 'level', basis: 'Levels inferred from number of storeys.' },
        { id: 'lift-testing', label: 'Lift testing, commissioning and certification', share: 15, quantity: 1, unit: 'lift', basis: 'Typically one lift per block unless noted otherwise.' },
      ]);
    case 'COMMON_STAIRS':
      return splitRows([
        { id: 'precast-stairs', label: 'Precast/common stair flights', share: 70, quantity: Math.max(1, storeys - 1), unit: 'flight', basis: 'Flights inferred from number of storeys.' },
        { id: 'landings', label: 'Common stair landings/ancillaries', share: 30, quantity: Math.max(1, storeys), unit: 'level', basis: 'Levels inferred from number of storeys.' },
      ]);
    case 'HANDRAILS_BALUSTRADES':
      return splitRows([
        { id: 'handrails', label: 'Handrails', share: 45, quantity: Math.max(1, storeys - 1), unit: 'flight', basis: 'Flights inferred from number of storeys.' },
        { id: 'balustrades', label: 'Balustrades / guarding', share: 45, quantity: Math.max(1, storeys), unit: 'level', basis: 'Levels inferred from number of storeys.' },
        { id: 'fixings-finishes', label: 'Fixings, finishes and sundries', share: 10, quantity: 1, unit: 'item', basis: 'Proportional sundries allowance.' },
      ]);
    case 'LANDLORD_LIGHTING':
      return splitRows([
        { id: 'common-lighting', label: 'Common/landlord lighting', share: 65, quantity: Math.max(1, Math.round(gifaM2 * 0.12)), unit: 'm2 common', basis: 'Common area estimated as 12% of GIFA unless better detail is entered.' },
        { id: 'landlord-power', label: 'Landlord power and controls', share: 35, quantity: salesPerConstructionUnit || 1, unit: 'unit', basis: 'Based on saleable units per construction unit.' },
      ]);
    case 'DOOR_ENTRY_ACCESS':
      return splitRows([
        { id: 'entry-panel', label: 'Main entry panel / controller', share: 35, quantity: 1, unit: 'system', basis: 'One common entry system unless noted otherwise.' },
        { id: 'handsets-fobs', label: 'Handsets, fobs and unit interfaces', share: 45, quantity: saleUnitCount, unit: 'unit', basis: 'Based on saleable units per construction unit.' },
        { id: 'access-cabling-commissioning', label: 'Cabling, containment and commissioning', share: 20, quantity: commonAreaM2, unit: 'm2 common', basis: 'Common area estimated as 12% of GIFA unless better detail is entered.' },
      ]);
    case 'SMOKE_VENT_FIRE_ALARM':
      return splitRows([
        { id: 'fire-alarm', label: 'Fire alarm / detection', share: 45, quantity: salesPerConstructionUnit || 1, unit: 'unit', basis: 'Based on saleable units per construction unit.' },
        { id: 'smoke-vent', label: 'Smoke ventilation / AOV allowance', share: 55, quantity: Math.max(1, storeys), unit: 'level', basis: 'Levels inferred from number of storeys.' },
      ]);
    case 'ACOUSTIC_COMPARTMENTATION':
      return splitRows([
        { id: 'fire-compartmentation', label: 'Fire compartmentation / stopping', share: 55, quantity: gifaM2 || 1, unit: 'm2 GIFA', basis: 'Measured against the construction GIFA.' },
        { id: 'acoustic-separation', label: 'Acoustic separation uplift', share: 45, quantity: gifaM2 || 1, unit: 'm2 GIFA', basis: 'Measured against the construction GIFA.' },
      ]);
    case 'COMMUNAL_FINISHES':
      return splitRows([
        { id: 'corridor-finishes', label: 'Corridor/stair finishes', share: 60, quantity: Math.max(1, Math.round(gifaM2 * 0.12)), unit: 'm2 common', basis: 'Common area estimated as 12% of GIFA unless better detail is entered.' },
        { id: 'common-decoration', label: 'Common decoration and sundries', share: 40, quantity: Math.max(1, Math.round(gifaM2 * 0.12)), unit: 'm2 common', basis: 'Common area estimated as 12% of GIFA unless better detail is entered.' },
      ]);
    case 'REFUSE_CYCLE_STORES':
      return splitRows([
        { id: 'store-enclosure', label: 'Store enclosure / walls / doors', share: 55, quantity: saleUnitCount, unit: 'unit served', basis: 'Based on saleable units served by the store.' },
        { id: 'stands-bins-fittings', label: 'Cycle stands, bin fittings and protection', share: 30, quantity: saleUnitCount, unit: 'unit served', basis: 'Based on saleable units served by the store.' },
        { id: 'store-lighting-drainage', label: 'Lighting, drainage and sundries', share: 15, quantity: 1, unit: 'store', basis: 'Single store allowance unless noted otherwise.' },
      ]);
    case 'AIR_SOURCE_HEAT_PUMPS':
      return splitRows([
        { id: 'ashp-units', label: 'ASHP units and controls', share: 80, quantity: salesPerConstructionUnit || 1, unit: 'unit', basis: 'Based on saleable units per construction unit.' },
        { id: 'ashp-distribution', label: 'Distribution / commissioning allowance', share: 20, quantity: salesPerConstructionUnit || 1, unit: 'unit', basis: 'Based on saleable units per construction unit.' },
      ]);
    case 'EV_CHARGERS':
      return splitRows([
        { id: 'ev-chargers', label: 'EV charger provision', share: 80, quantity: salesPerConstructionUnit || 1, unit: 'unit', basis: 'Based on saleable units per construction unit.' },
        { id: 'ev-infrastructure', label: 'EV containment / distribution allowance', share: 20, quantity: salesPerConstructionUnit || 1, unit: 'unit', basis: 'Based on saleable units per construction unit.' },
      ]);
    case 'CERAMIC_TILING':
      return splitRows([
        { id: 'bathroom-tiling', label: 'Bathroom / shower tiling', share: 60, quantity: wetRoomCount, unit: 'wet room', basis: 'Wet-room count inferred from saleable units.' },
        { id: 'kitchen-utility-tiling', label: 'Kitchen / utility splashbacks', share: 25, quantity: saleUnitCount, unit: 'unit', basis: 'Based on saleable units per construction unit.' },
        { id: 'tiling-trims-adhesives', label: 'Trims, adhesives and grout', share: 15, quantity: wetRoomCount, unit: 'wet room', basis: 'Wet-room count inferred from saleable units.' },
      ]);
    case 'DECORATION':
      return splitRows([
        { id: 'walls-ceilings', label: 'Walls and ceilings decoration', share: 55, quantity: gifaM2 || 1, unit: 'm2 GIFA', basis: 'Measured against construction GIFA.' },
        { id: 'woodwork-metalwork', label: 'Woodwork/metalwork decoration', share: 25, quantity: saleUnitCount, unit: 'unit', basis: 'Based on saleable units per construction unit.' },
        { id: 'touch-ups-snagging', label: 'Touch-ups, snagging and final decorations', share: 20, quantity: constructionQuantity, unit: draft.constructionQuantityLabel || 'unit', basis: 'Based on construction units.' },
      ]);
    case 'SEALANTS':
      return splitRows([
        { id: 'wet-area-sealants', label: 'Wet area sealants', share: 45, quantity: wetRoomCount, unit: 'wet room', basis: 'Wet-room count inferred from saleable units.' },
        { id: 'window-door-sealants', label: 'Window and door sealants', share: 35, quantity: saleUnitCount, unit: 'unit', basis: 'Based on saleable units per construction unit.' },
        { id: 'movement-joints', label: 'Movement joints and sundry sealants', share: 20, quantity: gifaM2 || 1, unit: 'm2 GIFA', basis: 'Measured against construction GIFA.' },
      ]);
    case 'CLEANING':
      return splitRows([
        { id: 'builders-clean', label: 'Builders clean', share: 45, quantity: gifaM2 || 1, unit: 'm2 GIFA', basis: 'Measured against construction GIFA.' },
        { id: 'sparkle-clean', label: 'Sparkle clean / handover clean', share: 40, quantity: saleUnitCount, unit: 'unit', basis: 'Based on saleable units per construction unit.' },
        { id: 'common-clean', label: 'Common area clean', share: 15, quantity: commonAreaM2, unit: 'm2 common', basis: 'Common area estimated as 12% of GIFA unless better detail is entered.' },
      ]);
    case 'SCAFFOLD':
      return splitRows([
        { id: 'main-scaffold', label: 'Main elevation scaffold', share: 70, quantity: externalWallAreaM2, unit: 'm2 elevation', basis: 'External wall area inferred from footprint, storeys and storey height.' },
        { id: 'loading-bays-stair-towers', label: 'Loading bays, stair towers and adaptions', share: 20, quantity: storeys, unit: 'level', basis: 'Levels inferred from number of storeys.' },
        { id: 'scaffold-inspection', label: 'Inspection, handover and sundries', share: 10, quantity: constructionQuantity, unit: draft.constructionQuantityLabel || 'unit', basis: 'Based on construction units.' },
      ]);
    case 'FIRE_PROTECTION':
      return splitRows([
        { id: 'fire-stopping', label: 'Fire stopping and cavity barriers', share: 45, quantity: gifaM2 || 1, unit: 'm2 GIFA', basis: 'Measured against construction GIFA.' },
        { id: 'fire-doors-ironmongery', label: 'Fire doors, closers and ironmongery allowance', share: 35, quantity: saleUnitCount, unit: 'unit', basis: 'Based on saleable units per construction unit.' },
        { id: 'fire-certification', label: 'Fire protection certification / sundries', share: 20, quantity: constructionQuantity, unit: draft.constructionQuantityLabel || 'unit', basis: 'Based on construction units.' },
      ]);
    default:
      return splitRows([
        { id: 'labour', label: `${displayLabel} labour`, share: 45, quantity: gifaM2 || 1, unit: 'm2 GIFA', basis: 'Indicative split measured against construction GIFA.' },
        { id: 'materials', label: `${displayLabel} materials`, share: 45, quantity: gifaM2 || 1, unit: 'm2 GIFA', basis: 'Indicative split measured against construction GIFA.' },
        { id: 'sundries', label: `${displayLabel} sundries`, share: 10, quantity: constructionQuantity, unit: draft.constructionQuantityLabel || 'unit', basis: 'Indicative sundries allowance.' },
      ]);
  }
}

function nextFallbackGuidedCustomCostQuestion(note: string, answers: GuidedCustomCostAnswer[]) {
  const asked = new Set(answers.map((entry) => entry.question));
  const candidates = [
    !note.trim()
      ? 'What specifically should this custom cost provision cover?'
      : '',
    'What is the quantity, basis, or scale of the provision, for example number of units, area, length, lump sum, or percentage basis?',
    'Is there a known quote, rate, benchmark, or previous project allowance that should be used as the pricing basis?',
    'Is this provision definitely separate from house construction, infrastructure, plot works, prelims, abnormals, overheads, finance, land, or incentives?',
    'What uncertainty or risk allowance should be included, and what should be excluded from this provision?',
  ].filter(Boolean);
  return candidates.find((question) => !asked.has(question)) || candidates[candidates.length - 1] || 'What further cost-critical detail should be considered for this custom provision?';
}

function customHouseScheduleDraft(): HouseScheduleDraft {
  const row = createManualHouseTypeScheduleRow();
  return {
    ...houseScheduleDraftFromRow(row),
    useCostBreakdown: false,
    saveToLibrary: false,
  };
}

function houseScheduleOverridesFromDraft(draft: HouseScheduleDraft): Partial<AppraisalHouseTypeScheduleRow> {
  const costBreakdown = draft.useCostBreakdown ? cloneHouseTypeCostBreakdown(draft.costBreakdown) : undefined;
  return {
    libraryHouseTypeId: draft.libraryHouseTypeId || undefined,
    houseTypeName: draft.houseTypeName.trim() || 'House type',
    style: draft.style ? draft.style as AppraisalHouseTypeStyle : undefined,
    configuration: draft.configuration ? draft.configuration as AppraisalHouseTypeConfiguration : undefined,
    storeys: draft.storeys ? Math.max(0, numberValue(draft.storeys)) : undefined,
    bedrooms: draft.bedrooms ? Math.max(1, Math.round(numberValue(draft.bedrooms))) : undefined,
    garage: draft.garage === '' ? undefined : draft.garage === 'YES',
    privateDrive: draft.privateDrive === '' ? undefined : draft.privateDrive === 'YES',
    tenure: draft.tenure,
    quantity: Math.max(0, numberValue(draft.quantity)),
    separateSalesQuantity: draft.separateSalesQuantity,
    salesQuantity: draft.separateSalesQuantity ? Math.max(0, numberValue(draft.salesQuantity)) : undefined,
    constructionQuantityLabel: draft.constructionQuantityLabel.trim(),
    salesQuantityLabel: draft.salesQuantityLabel.trim(),
    quantitySeparationNotes: draft.quantitySeparationNotes.trim(),
    gifaM2: Math.max(0, numberValue(draft.gifaM2)),
    buildCostPerM2: Math.max(0, numberValue(draft.buildCostPerM2)),
    costBreakdown,
    priceIndex: Math.max(0, numberValue(draft.priceIndex)),
    buildPeriodMonths: Math.max(1, Math.round(numberValue(draft.buildPeriodMonths) || 1)),
    salesRows: draft.salesRows.length ? draft.salesRows.map((salesRow) => ({ ...salesRow, id: salesRow.id || generateId() })) : undefined,
    saleValuePerUnit: Math.max(0, numberValue(draft.saleValuePerUnit)),
    saleRatePerM2: Math.max(0, numberValue(draft.saleRatePerM2)),
    notes: draft.notes,
  };
}

function HouseTypesStage({
  appraisal,
  option,
  houseTypes,
  projects,
  onSaveHouseTypeToLibrary,
  onOpenAppraisalLibraries,
  updateOption,
}: {
  appraisal: DevelopmentAppraisal;
  option: DevelopmentAppraisalOption;
  houseTypes: AppraisalHouseTypeLibraryItem[];
  projects: Project[];
  onSaveHouseTypeToLibrary: (row: AppraisalHouseTypeScheduleRow) => string;
  onOpenAppraisalLibraries: () => void;
  updateOption: (optionId: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const { appSettings } = useAppContext();
  const { askConfirm } = useConfirm();
  const { showToast } = useToast();
  const rows = option.houseTypeSchedule || [];
  const usedHouseTypeRows = React.useMemo(() => rows.filter((row) => (
    Math.max(0, row.quantity || 0) > 0 || calculateHouseTypeSalesQuantity(row) > 0
  )), [rows]);
  const summary = summariseHouseBuildingOption(option);
  const [drawerMode, setDrawerMode] = React.useState<HouseScheduleDrawerMode | null>(null);
  const [editingRowId, setEditingRowId] = React.useState<string | null>(null);
  const [standardSearch, setStandardSearch] = React.useState('');
  const [standardSelections, setStandardSelections] = React.useState<Record<string, StandardHouseSelectionDraft>>({});
  const [draft, setDraft] = React.useState<HouseScheduleDraft>(() => customHouseScheduleDraft());
  const editOriginalDraftRef = React.useRef<HouseScheduleDraft | null>(null);
  const [isAssessingCustomCost, setIsAssessingCustomCost] = React.useState(false);
  const [customCostMode, setCustomCostMode] = React.useState<CustomHouseCostMode>('QUICK');
  const [customCostBasis, setCustomCostBasis] = React.useState<CustomHouseCostBasis>('USE_LIBRARY_WHERE_SUITABLE');
  const [guidedCostQuestion, setGuidedCostQuestion] = React.useState('');
  const [guidedCostAnswer, setGuidedCostAnswer] = React.useState('');
  const [guidedCostAnswers, setGuidedCostAnswers] = React.useState<GuidedHouseCostAnswer[]>([]);
  const [isExportingSchedule, setIsExportingSchedule] = React.useState(false);
  const [isLibraryRefreshOpen, setIsLibraryRefreshOpen] = React.useState(false);
  const appraisalPriceIndex = Math.max(0, Number(option.programme?.appraisalPriceIndex) || 0);
  const startPriceIndex = Math.max(0, Number(option.programme?.startPriceIndex) || 0);
  const linkedLibraryRows = React.useMemo(
    () => rows.filter((row) => row.libraryHouseTypeId && houseTypes.some((houseType) => houseType.id === row.libraryHouseTypeId)),
    [houseTypes, rows],
  );
  const filteredHouseTypes = React.useMemo(() => {
    const term = standardSearch.trim().toLowerCase();
    const matches = term
      ? houseTypes.filter((houseType) => (
        houseType.name.toLowerCase().includes(term)
        || String(houseType.gifaM2).includes(term)
        || String(houseType.priceIndex || '').includes(term)
      ))
      : houseTypes;
    return [...matches].sort((a, b) => (
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })
    ));
  }, [houseTypes, standardSearch]);
  const selectedStandardCount = React.useMemo(
    () => houseTypes.filter((houseType) => standardSelections[houseType.id]?.selected).length,
    [houseTypes, standardSelections]
  );
  const selectedStandardQuantityCount = React.useMemo(
    () => houseTypes.filter((houseType) => (
      standardSelections[houseType.id]?.selected
      && numberValue(standardSelections[houseType.id]?.quantity || '') > 0
    )).length,
    [houseTypes, standardSelections]
  );

  const openStandardDrawer = () => {
    editOriginalDraftRef.current = null;
    setStandardSelections(Object.fromEntries(
      houseTypes.map((houseType, index) => [houseType.id, standardHouseSelectionDraft(houseTypes.length === 1 && index === 0)])
    ));
    setStandardSearch('');
    setEditingRowId(null);
    setDrawerMode('STANDARD');
  };
  const updateStandardSelection = (houseTypeId: string, patch: Partial<StandardHouseSelectionDraft>) => {
    setStandardSelections((current) => ({
      ...current,
      [houseTypeId]: {
        ...(current[houseTypeId] || standardHouseSelectionDraft()),
        ...patch,
      },
    }));
  };
  const setFilteredStandardSelection = (selected: boolean) => {
    setStandardSelections((current) => {
      const next = { ...current };
      filteredHouseTypes.forEach((houseType) => {
        next[houseType.id] = {
          ...(next[houseType.id] || standardHouseSelectionDraft()),
          selected,
        };
      });
      return next;
    });
  };
  const comparableCostAssessment = React.useCallback((currentDraft: HouseScheduleDraft) => {
    const targetGifa = Math.max(0, numberValue(currentDraft.gifaM2));
    const targetBedrooms = currentDraft.bedrooms ? Math.round(numberValue(currentDraft.bedrooms)) : 0;
    const comparables = houseTypes
      .map((houseType) => {
        const rate = calculateHouseTypeLibraryBuildCostPerM2(houseType);
        const score = [
          houseType.style && currentDraft.style === houseType.style ? -20 : 0,
          houseType.configuration && currentDraft.configuration === houseType.configuration ? -18 : 0,
          houseType.bedrooms && targetBedrooms && houseType.bedrooms === targetBedrooms ? -12 : 0,
          targetGifa > 0 ? Math.abs(houseType.gifaM2 - targetGifa) : 0,
        ].reduce((total, value) => total + value, 0);
        return { houseType, rate, score };
      })
      .filter((entry) => entry.rate > 0)
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);
    const weightedRate = comparables.length > 0
      ? comparables.reduce((total, entry, index) => total + entry.rate * (comparables.length - index), 0)
        / comparables.reduce((total, _entry, index) => total + (comparables.length - index), 0)
      : Math.max(0, numberValue(currentDraft.buildCostPerM2));
    return {
      costPerM2: Math.round(weightedRate),
      totalCost: Math.round(weightedRate * targetGifa),
      comparables: comparables.map((entry) => entry.houseType.name),
    };
  }, [houseTypes]);
  const fallbackGuidedHouseAssessment = React.useCallback((
    currentDraft: HouseScheduleDraft,
    fallback: ReturnType<typeof comparableCostAssessment>,
    answers: GuidedHouseCostAnswer[]
  ) => {
    const answerText = answers.map((entry) => `${entry.question} ${entry.answer}`).join('\n');
    const constructionText = `${currentDraft.guidedConstructionDescription}\n${answerText}`;
    const salesText = `${currentDraft.guidedSalesDescription}\n${answerText}`;
    const isFlatBlock = /\b(flat|flats|apartment|apartments)\b/i.test(salesText) || /\bblock\b/i.test(constructionText);
    const constructionQuantityLabel = isFlatBlock ? 'block' : (currentDraft.constructionQuantityLabel || 'unit');
    const salesQuantityLabel = /\b(flat|flats|apartment|apartments)\b/i.test(salesText)
      ? 'flat'
      : /\b(house|houses|plot|plots)\b/i.test(salesText)
        ? 'house'
        : (currentDraft.salesQuantityLabel || 'sale unit');
    const inferredConstructionQuantity = inferQuantityFromText(constructionText, [constructionQuantityLabel, 'block', 'unit', 'house']);
    const inferredSalesQuantity = inferQuantityFromText(salesText, [salesQuantityLabel, 'flat', 'apartment', 'house', 'plot', 'unit']);
    const inferredGifa = inferAreaM2FromText(constructionText) || inferAreaM2FromText(salesText);
    const gifaM2 = Math.max(0, numberValue(currentDraft.gifaM2) || inferredGifa);
    const costPerM2 = Math.max(0, fallback.costPerM2 || numberValue(currentDraft.buildCostPerM2));
    const salesQuantity = Math.max(0, inferredSalesQuantity || numberValue(currentDraft.salesQuantity) || inferredConstructionQuantity || 1);
    const salesRows = inferFlatSalesRowsFromText(salesText, salesQuantity, inferAreaM2FromText(salesText));
    return {
      costPerM2,
      totalCost: Math.round(costPerM2 * gifaM2),
      buildMonths: Math.max(1, Math.round(numberValue(currentDraft.buildPeriodMonths) || 4)),
      confidence: 'LOW' as const,
      summary: `AI guidance was unavailable, so the custom house type has been provisionally assessed using the closest current library comparables. The construction basis has been interpreted as ${Math.max(1, inferredConstructionQuantity || 1)} ${constructionQuantityLabel}${Math.max(1, inferredConstructionQuantity || 1) === 1 ? '' : 's'} and the sales basis as ${salesRows.length ? salesRows.map((row) => `${row.quantity} ${row.label}`).join(', ') : `${salesQuantity} ${salesQuantityLabel}${salesQuantity === 1 ? '' : 's'}`}. Review the interpreted quantities, GIFA, and specification before relying on the cost.`,
      houseTypeName: currentDraft.houseTypeName || (isFlatBlock ? 'Block of flats' : 'Custom house type'),
      constructionQuantity: Math.max(1, inferredConstructionQuantity || numberValue(currentDraft.quantity) || 1),
      constructionQuantityLabel,
      salesQuantity,
      salesQuantityLabel,
      salesRows,
      gifaM2,
      quantitySeparationNotes: [
        currentDraft.guidedConstructionDescription.trim() ? `Construction basis: ${currentDraft.guidedConstructionDescription.trim()}` : '',
        currentDraft.guidedSalesDescription.trim() ? `Sales basis: ${currentDraft.guidedSalesDescription.trim()}` : '',
        answers.length ? `Guided answers: ${answers.map((entry) => `${entry.question} ${entry.answer}`).join(' ')}` : '',
      ].filter(Boolean).join('\n'),
    };
  }, [comparableCostAssessment]);
  const buildCustomHouseTypeCostContext = React.useCallback((
    currentDraft: HouseScheduleDraft,
    fallback: ReturnType<typeof comparableCostAssessment>,
    guidanceAnswers: GuidedHouseCostAnswer[] = []
  ) => ({
    appraisal: {
      name: appraisal.name,
      site: appraisal.site || '',
      client: appraisal.client || '',
      appraisalDate: appraisal.appraisalDate || '',
      reference: appraisal.reference || '',
    },
    option: {
      name: option.name,
      priceIndex: option.programme?.appraisalPriceIndex,
      expectedStartDate: option.programme?.expectedStartDate,
    },
    customHouseType: {
      name: currentDraft.houseTypeName,
      guidedConstructionDescription: currentDraft.guidedConstructionDescription,
      guidedSalesDescription: currentDraft.guidedSalesDescription,
      style: currentDraft.style ? houseTypeStyleLabel(currentDraft.style as AppraisalHouseTypeStyle) : '',
      configuration: currentDraft.configuration ? houseTypeConfigurationLabel(currentDraft.configuration as AppraisalHouseTypeConfiguration) : '',
      storeys: currentDraft.storeys,
      bedrooms: currentDraft.bedrooms,
      garage: currentDraft.garage,
      privateDrive: currentDraft.privateDrive,
      gifaM2: currentDraft.gifaM2,
      quantity: currentDraft.quantity,
      separateSalesQuantity: currentDraft.separateSalesQuantity,
      salesQuantity: currentDraft.salesQuantity,
      constructionQuantityLabel: currentDraft.constructionQuantityLabel,
      salesQuantityLabel: currentDraft.salesQuantityLabel,
      salesRows: currentDraft.salesRows,
      quantitySeparationNotes: currentDraft.quantitySeparationNotes,
      tenure: currentDraft.tenure,
      buildCostPerM2: currentDraft.buildCostPerM2,
      buildPeriodMonths: currentDraft.buildPeriodMonths,
      aiCostingBasis: customCostBasis,
      aiCostingBasisLabel: customCostBasis === 'FIRST_PRINCIPLES'
        ? 'First principles - ignore house library cost levels unless the user explicitly asks to compare.'
        : 'Use house library where suitable - use library comparables only if they are genuinely relevant.',
      costComponents: currentDraft.costBreakdown.map((component) => ({
        key: component.key,
        label: component.label?.trim() || APPRAISAL_HOUSE_TYPE_COST_LABELS[component.key],
        currentAmount: component.amount,
        included: component.included !== false,
        detailRows: component.detailRows || [],
      })),
      comments: currentDraft.notes,
    },
    guidedQuestionAnswerHistory: guidanceAnswers,
    currentLibraryComparables: houseTypes.map((houseType) => ({
      name: houseType.name,
      style: houseType.style ? houseTypeStyleLabel(houseType.style) : '',
      configuration: houseType.configuration ? houseTypeConfigurationLabel(houseType.configuration) : '',
      storeys: houseType.storeys,
      bedrooms: houseType.bedrooms,
      garage: yesNoLabel(houseType.garage),
      privateDrive: yesNoLabel(houseType.privateDrive),
      gifaM2: houseType.gifaM2,
      buildCostPerM2: Math.round(calculateHouseTypeLibraryBuildCostPerM2(houseType)),
      componentTotal: Math.round(calculateHouseTypeCostBreakdownTotal(houseType.costBreakdown)),
      costBreakdown: houseType.costBreakdown.map((component) => ({
        key: component.key,
        label: component.label?.trim() || APPRAISAL_HOUSE_TYPE_COST_LABELS[component.key],
        amount: Math.round(component.amount || 0),
        included: component.included !== false,
        detailRows: component.detailRows || [],
      })),
      priceIndex: houseType.priceIndex,
    })),
    fallbackComparableAssessment: fallback,
  }), [appraisal.appraisalDate, appraisal.client, appraisal.name, appraisal.reference, appraisal.site, customCostBasis, houseTypes, option.name, option.programme?.appraisalPriceIndex, option.programme?.expectedStartDate]);
  const buildAssessmentCostBreakdown = React.useCallback((
    currentBreakdown: AppraisalHouseTypeCostComponent[],
    assessment: {
      costPerM2: number;
      totalCost: number;
      costBreakdown?: Array<{
        key?: string;
        label: string;
        amount: number;
        included?: boolean;
        notes?: string;
        detailRows?: NonNullable<AppraisalHouseTypeCostComponent['detailRows']>;
      }>;
    },
    label: string
  ) => {
    const gifaM2 = Math.max(0, numberValue(draft.gifaM2) || assessment.totalCost / Math.max(1, assessment.costPerM2 || 1));
    const targetTotal = Math.max(0, Math.round(assessment.totalCost || (assessment.costPerM2 || 0) * gifaM2));
    const isComponentKey = (value?: string): value is AppraisalHouseTypeCostComponent['key'] => (
      Boolean(value && value in APPRAISAL_HOUSE_TYPE_COST_LABELS)
    );
    const incoming = (assessment.costBreakdown || [])
      .map((row) => ({
        ...row,
        key: row.key?.trim().toUpperCase(),
        label: row.label?.trim() || '',
        amount: Math.max(0, Number(row.amount) || 0),
      }))
      .filter((row) => row.label && row.amount > 0);
    const descriptionText = [
      draft.houseTypeName,
      draft.guidedConstructionDescription,
      draft.guidedSalesDescription,
      draft.quantitySeparationNotes,
      draft.notes,
    ].filter(Boolean).join(' ');
    const inferredAllowances = inferApartmentSpecificAllowances(descriptionText, targetTotal, gifaM2);
    const incomingWithInferred = [...incoming];
    Object.entries(inferredAllowances).forEach(([key, value]) => {
      if (!value || incomingWithInferred.some((row) => row.key === key)) return;
      incomingWithInferred.push({
        key,
        label: APPRAISAL_HOUSE_TYPE_COST_LABELS[key as AppraisalHouseTypeCostComponent['key']],
        amount: value.amount,
        included: true,
        notes: value.note,
      });
    });

    const allocateBaseline = (baseTotal: number) => {
      const weightTotal = currentBreakdown.reduce((total, component) => (
        total + (HOUSE_TYPE_COMPONENT_ALLOCATION_WEIGHTS[component.key] || 0)
      ), 0);
      return currentBreakdown.map((component) => {
        const weight = HOUSE_TYPE_COMPONENT_ALLOCATION_WEIGHTS[component.key] || 0;
        const amount = baseTotal > 0 && weightTotal > 0 ? Math.round(baseTotal * (weight / weightTotal)) : 0;
        return {
          ...component,
          amount,
          included: amount > 0,
          notes: amount > 0 ? `${label} QS component allocation for the remaining assessed cost.` : '',
        };
      });
    };

    if (incomingWithInferred.length > 0) {
      const rows = incomingWithInferred.map((row) => {
        const key = isComponentKey(row.key) ? row.key : 'CUSTOM_ALLOWANCE';
        const labelText = row.label.trim() || APPRAISAL_HOUSE_TYPE_COST_LABELS[key];
        return {
          id: generateId(),
          key,
          label: labelText,
          amount: Math.round(row.amount),
          included: row.included !== false,
          notes: row.notes || (key === 'CUSTOM_ALLOWANCE' ? `${label} custom AI row.` : `${label} AI row.`),
          aiGenerated: true,
          detailRows: row.detailRows?.map((detailRow, index) => ({
            id: detailRow.id || generateId(),
            label: detailRow.label || `Detail row ${index + 1}`,
            quantity: Math.max(0, Number(detailRow.quantity) || 0),
            unit: detailRow.unit || 'item',
            rate: Math.max(0, Number(detailRow.rate) || 0),
            total: Math.max(0, Number(detailRow.total) || 0),
            basis: detailRow.basis || '',
            included: detailRow.included === false ? false : true,
          })).filter((detailRow) => detailRow.label && detailRow.total > 0),
        };
      });
      const assessedTotal = calculateHouseTypeCostBreakdownTotal(rows);
      if (assessedTotal > 0 && targetTotal > 0 && Math.abs(assessedTotal - targetTotal) > 1) {
        const factor = targetTotal / assessedTotal;
        return rows.map((row) => row.included === false ? row : { ...row, amount: Math.round(Math.max(0, row.amount || 0) * factor) });
      }
      return rows;
    }

    return allocateBaseline(targetTotal).map((component) => ({
      ...component,
      notes: component.amount > 0 ? `${label} QS weighted allocation where the AI did not return a full component build-up; edit if a different build-up is required.` : component.notes,
    }));
  }, [draft.gifaM2]);
  const applyCustomHouseCostAssessment = React.useCallback((
    assessment: {
      costPerM2: number;
      totalCost: number;
      buildMonths: number;
      confidence: 'LOW' | 'MEDIUM' | 'HIGH';
      summary: string;
      costBreakdown?: Array<{
        key?: string;
        label: string;
        amount: number;
        included?: boolean;
        notes?: string;
        detailRows?: NonNullable<AppraisalHouseTypeCostComponent['detailRows']>;
      }>;
      houseTypeName?: string;
      constructionQuantity?: number;
      constructionQuantityLabel?: string;
      salesQuantity?: number;
      salesQuantityLabel?: string;
      salesRows?: AppraisalHouseTypeSalesRow[];
      gifaM2?: number;
      quantitySeparationNotes?: string;
    },
    fallback: ReturnType<typeof comparableCostAssessment>,
    label = 'AI cost assessment'
  ) => {
    setDraft((current) => {
      const constructionQuantity = assessment.constructionQuantity && assessment.constructionQuantity > 0
        ? Math.round(assessment.constructionQuantity)
        : 0;
      const salesQuantity = assessment.salesQuantity && assessment.salesQuantity > 0
        ? Math.round(assessment.salesQuantity)
        : 0;
      const constructionQuantityLabel = assessment.constructionQuantityLabel?.trim() || current.constructionQuantityLabel || (constructionQuantity > 0 ? 'unit' : '');
      const salesQuantityLabel = assessment.salesQuantityLabel?.trim() || current.salesQuantityLabel || (salesQuantity > 0 ? 'unit' : '');
      const separatedSales = Boolean(salesQuantity > 0 || current.separateSalesQuantity);
      const separationNotes = assessment.quantitySeparationNotes?.trim()
        || current.quantitySeparationNotes
        || [
          current.guidedConstructionDescription.trim() ? `Construction basis: ${current.guidedConstructionDescription.trim()}` : '',
          current.guidedSalesDescription.trim() ? `Sales basis: ${current.guidedSalesDescription.trim()}` : '',
        ].filter(Boolean).join('\n');
      const assessedNotes = [
        current.notes.trim(),
        `${label}: ${assessment.summary}`,
        `Assessed cost: ${money(assessment.costPerM2)}/m2, ${money(assessment.totalCost)} per ${constructionQuantityLabel || 'unit'}. Confidence: ${assessment.confidence}.`,
      ].filter(Boolean).join('\n\n');
      const assessmentBreakdown = buildAssessmentCostBreakdown(current.costBreakdown, assessment, label);
      return {
        ...current,
        houseTypeName: assessment.houseTypeName?.trim() || current.houseTypeName || 'Custom house type',
        quantity: constructionQuantity > 0 ? String(constructionQuantity) : current.quantity,
        separateSalesQuantity: separatedSales,
        salesQuantity: salesQuantity > 0 ? String(salesQuantity) : current.salesQuantity,
        constructionQuantityLabel,
        salesQuantityLabel,
        salesRows: assessment.salesRows?.length ? assessment.salesRows.map((salesRow) => ({
          ...salesRow,
          id: salesRow.id || generateId(),
          saleValuePerUnit: salesRow.saleValuePerUnit || 0,
          saleRatePerM2: salesRow.saleRatePerM2 || 0,
        })) : current.salesRows,
        quantitySeparationNotes: separationNotes,
        gifaM2: assessment.gifaM2 && assessment.gifaM2 > 0 ? String(Math.round(assessment.gifaM2)) : current.gifaM2,
        buildCostPerM2: String(Math.max(0, Math.round(assessment.costPerM2 || fallback.costPerM2))),
        useCostBreakdown: true,
        costBreakdown: assessmentBreakdown,
        buildPeriodMonths: String(Math.max(1, Math.round(assessment.buildMonths || numberValue(current.buildPeriodMonths) || 4))),
        notes: assessedNotes,
      };
    });
  }, [buildAssessmentCostBreakdown]);
  const assessCustomHouseCost = React.useCallback(async () => {
    if (!draft.houseTypeName.trim() || numberValue(draft.gifaM2) <= 0) {
      showToast({ type: 'info', message: 'Enter a house type name and GIFA before running the AI cost assessment.' });
      return;
    }
    const fallback = comparableCostAssessment(draft);
    setIsAssessingCustomCost(true);
    try {
      const result = await generateHouseTypeCostAssessment(buildCustomHouseTypeCostContext(draft, fallback), appSettings.ai);
      const assessment = result.ok
        ? result.data
        : {
          costPerM2: fallback.costPerM2,
          totalCost: fallback.totalCost,
          buildMonths: Math.max(1, Math.round(numberValue(draft.buildPeriodMonths) || 4)),
          summary: `AI assessment was unavailable, so a comparable-library rate has been used from ${fallback.comparables.join(', ') || 'the current standard house type data'}.`,
          confidence: 'LOW' as const,
        };
      applyCustomHouseCostAssessment(assessment, fallback);
      showToast({ type: result.ok ? 'success' : 'info', message: result.ok ? 'Custom house cost assessed.' : 'AI unavailable; comparable library cost used.' });
    } catch (error) {
      const assessedNotes = [
        draft.notes.trim(),
        `Comparable cost assessment: ${fallback.comparables.join(', ') || 'current standard house type data'} suggests ${money(fallback.costPerM2)}/m2, ${money(fallback.totalCost)} per unit.`,
      ].filter(Boolean).join('\n\n');
      setDraft((current) => ({ ...current, buildCostPerM2: String(fallback.costPerM2), notes: assessedNotes }));
      showToast({ type: 'info', message: error instanceof Error ? error.message : 'AI unavailable; comparable library cost used.' });
    } finally {
      setIsAssessingCustomCost(false);
    }
  }, [appSettings.ai, applyCustomHouseCostAssessment, buildCustomHouseTypeCostContext, comparableCostAssessment, draft, showToast]);
  const resetGuidedHouseCost = React.useCallback(() => {
    setGuidedCostQuestion('');
    setGuidedCostAnswer('');
    setGuidedCostAnswers([]);
  }, []);
  const applyGuidedDescriptionInferences = React.useCallback((answers: GuidedHouseCostAnswer[] = []) => {
    const answerText = answers.map((entry) => `${entry.question} ${entry.answer}`).join('\n');
    setDraft((current) => {
      const inferred = inferGuidedHouseTypeBasics(current.guidedConstructionDescription, current.guidedSalesDescription, answerText);
      const constructionQuantity = inferQuantityFromText(
        `${current.guidedConstructionDescription}\n${answerText}`,
        [inferred.constructionQuantityLabel || current.constructionQuantityLabel || 'block', 'block', 'unit', 'house']
      );
      const salesQuantity = inferQuantityFromText(
        `${current.guidedSalesDescription}\n${answerText}`,
        [inferred.salesQuantityLabel || current.salesQuantityLabel || 'flat', 'flat', 'apartment', 'house', 'plot', 'unit']
      );
      const inferredGifa = inferAreaM2FromText(`${current.guidedConstructionDescription}\n${current.guidedSalesDescription}\n${answerText}`);
      const salesRows = inferFlatSalesRowsFromText(
        `${current.guidedSalesDescription}\n${answerText}`,
        salesQuantity,
        inferAreaM2FromText(`${current.guidedSalesDescription}\n${answerText}`)
      );
      const hasManualDefaults = current.houseTypeName === 'Manual house type' && numberValue(current.gifaM2) === 90;
      return {
        ...current,
        houseTypeName: inferred.houseTypeName || (hasManualDefaults ? '' : current.houseTypeName),
        style: inferred.style || current.style,
        configuration: inferred.configuration || current.configuration,
        quantity: constructionQuantity > 0 ? String(constructionQuantity) : current.quantity,
        separateSalesQuantity: salesQuantity > 0 || current.separateSalesQuantity,
        salesQuantity: salesQuantity > 0 ? String(salesQuantity) : current.salesQuantity,
        constructionQuantityLabel: inferred.constructionQuantityLabel || current.constructionQuantityLabel,
        salesQuantityLabel: inferred.salesQuantityLabel || current.salesQuantityLabel,
        salesRows: salesRows.length ? salesRows : current.salesRows,
        gifaM2: inferredGifa > 0 && (numberValue(current.gifaM2) <= 0 || hasManualDefaults) ? String(Math.round(inferredGifa)) : current.gifaM2,
      };
    });
  }, []);
  const runGuidedHouseCostStep = React.useCallback(async () => {
    if (!draft.guidedConstructionDescription.trim() || !draft.guidedSalesDescription.trim()) {
      showToast({ type: 'info', message: 'Describe the construction item and the saleable units before starting guided AI costing.' });
      return;
    }
    const trimmedAnswer = guidedCostAnswer.trim();
    if (guidedCostQuestion && !trimmedAnswer) {
      showToast({ type: 'info', message: 'Answer the current AI question before continuing, or reset the guided costing.' });
      return;
    }
    const nextAnswers = guidedCostQuestion
      ? [...guidedCostAnswers, { question: guidedCostQuestion, answer: trimmedAnswer }]
      : guidedCostAnswers;
    applyGuidedDescriptionInferences(nextAnswers);
    const fallback = comparableCostAssessment(draft);
    setIsAssessingCustomCost(true);
    try {
      const result = await generateHouseTypeCostGuidanceStep(
        buildCustomHouseTypeCostContext(draft, fallback, nextAnswers),
        appSettings.ai
      );
      if (result.ok === false) {
        setGuidedCostAnswers(nextAnswers);
        setGuidedCostAnswer('');
        const inferredGifa = inferAreaM2FromText([
          draft.guidedConstructionDescription,
          draft.guidedSalesDescription,
          ...nextAnswers.map((entry) => `${entry.question} ${entry.answer}`),
        ].join('\n'));
        if (nextAnswers.length >= 3 && (numberValue(draft.gifaM2) > 0 || inferredGifa > 0)) {
          setGuidedCostQuestion('');
          applyCustomHouseCostAssessment(fallbackGuidedHouseAssessment(draft, fallback, nextAnswers), fallback, 'Guided fallback cost assessment');
          showToast({
            type: 'info',
            message: 'AI guidance is unavailable, so a provisional guided row has been created from your descriptions and current library rates.',
            duration: 6500,
          });
          return;
        }
        setGuidedCostQuestion(nextFallbackGuidedHouseCostQuestion(draft, nextAnswers));
        showToast({
          type: 'info',
          message: 'AI guidance is unavailable, so a fallback costing question has been shown so you can continue.',
          duration: 6500,
        });
        return;
      }
      setGuidedCostAnswers(nextAnswers);
      setGuidedCostAnswer('');
      if (result.data.needsClarification) {
        setGuidedCostQuestion(result.data.question);
        showToast({ type: 'info', message: 'AI has asked the next costing question.' });
        return;
      }
      setGuidedCostQuestion('');
      applyCustomHouseCostAssessment(result.data, fallback, 'Guided AI cost assessment');
      showToast({ type: 'success', message: 'Guided custom house cost assessed.' });
    } catch (error) {
      setGuidedCostAnswers(nextAnswers);
      setGuidedCostAnswer('');
      const inferredGifa = inferAreaM2FromText([
        draft.guidedConstructionDescription,
        draft.guidedSalesDescription,
        ...nextAnswers.map((entry) => `${entry.question} ${entry.answer}`),
      ].join('\n'));
      if (nextAnswers.length >= 3 && (numberValue(draft.gifaM2) > 0 || inferredGifa > 0)) {
        setGuidedCostQuestion('');
        applyCustomHouseCostAssessment(fallbackGuidedHouseAssessment(draft, fallback, nextAnswers), fallback, 'Guided fallback cost assessment');
        showToast({
          type: 'info',
          message: 'AI guidance is unavailable, so a provisional guided row has been created from your descriptions and current library rates.',
          duration: 6500,
        });
        return;
      }
      setGuidedCostQuestion(nextFallbackGuidedHouseCostQuestion(draft, nextAnswers));
      showToast({
        type: 'info',
        message: 'AI guidance is unavailable, so a fallback costing question has been shown so you can continue.',
        duration: 6500,
      });
    } finally {
      setIsAssessingCustomCost(false);
    }
  }, [
    appSettings.ai,
    applyCustomHouseCostAssessment,
    applyGuidedDescriptionInferences,
    buildCustomHouseTypeCostContext,
    comparableCostAssessment,
    draft,
    fallbackGuidedHouseAssessment,
    guidedCostAnswer,
    guidedCostAnswers,
    guidedCostQuestion,
    showToast,
  ]);
  const openCustomDrawer = () => {
    editOriginalDraftRef.current = null;
    resetGuidedHouseCost();
    setDraft(customHouseScheduleDraft());
    setEditingRowId(null);
    setDrawerMode('CUSTOM');
  };
  const openEditDrawer = (row: AppraisalHouseTypeScheduleRow) => {
    const nextDraft = houseScheduleDraftFromRow(row);
    editOriginalDraftRef.current = nextDraft;
    setDraft(nextDraft);
    setEditingRowId(row.id);
    setDrawerMode('EDIT');
  };
  const closeDrawer = () => {
    editOriginalDraftRef.current = null;
    setDrawerMode(null);
    setEditingRowId(null);
  };
  const appendRow = (row: AppraisalHouseTypeScheduleRow) => {
    updateOption(option.id, (current) => ({
      ...current,
      houseTypeSchedule: [...(current.houseTypeSchedule || []), row],
    }));
  };
  const commitRowUpdate = (rowId: string, patch: Partial<AppraisalHouseTypeScheduleRow>) => {
    updateOption(option.id, (current) => ({
      ...current,
      houseTypeSchedule: updateLine(current.houseTypeSchedule || [], rowId, patch),
    }));
  };
  const updateRow = (rowId: string, patch: Partial<AppraisalHouseTypeScheduleRow>) => {
    React.startTransition(() => {
      commitRowUpdate(rowId, patch);
    });
  };
  const requestCloseDrawer = async () => {
    if (
      drawerMode !== 'EDIT'
      || !editingRowId
      || !editOriginalDraftRef.current
      || houseScheduleDraftsEqual(draft, editOriginalDraftRef.current)
    ) {
      closeDrawer();
      return;
    }

    const shouldSave = await askConfirm({
      title: 'Save house type changes?',
      message: 'You have unsaved changes to this house schedule row. Save them before closing?',
      confirmLabel: 'Save changes',
      cancelLabel: 'Keep editing',
    });
    if (shouldSave) {
      commitRowUpdate(editingRowId, houseScheduleOverridesFromDraft(draft));
      closeDrawer();
      return;
    }

    const shouldDiscard = await askConfirm({
      title: 'Discard house type changes?',
      message: 'Close this row edit without saving the changes?',
      confirmLabel: 'Discard changes',
      cancelLabel: 'Keep editing',
      variant: 'danger',
    });
    if (shouldDiscard) closeDrawer();
  };
  const updateConstructionQuantity = (row: AppraisalHouseTypeScheduleRow, value: number) => {
    const quantity = Math.max(0, Math.round(value));
    updateRow(row.id, {
      quantity,
      salesQuantity: row.separateSalesQuantity ? row.salesQuantity : undefined,
    });
  };
  const updateSalesQuantityMode = (row: AppraisalHouseTypeScheduleRow, separateSalesQuantity: boolean) => {
    updateRow(row.id, {
      separateSalesQuantity,
      salesQuantity: separateSalesQuantity ? calculateHouseTypeSalesQuantity(row) || row.quantity || 0 : undefined,
      salesQuantityLabel: separateSalesQuantity ? row.salesQuantityLabel || 'sale unit' : row.salesQuantityLabel,
    });
  };
  const updateSalesQuantity = (row: AppraisalHouseTypeScheduleRow, value: number) => {
    updateRow(row.id, {
      separateSalesQuantity: true,
      salesQuantity: Math.max(0, Math.round(value)),
      salesQuantityLabel: row.salesQuantityLabel || 'sale unit',
    });
  };
  const deleteRow = (rowId: string) => {
    updateOption(option.id, (current) => ({
      ...current,
      houseTypeSchedule: (current.houseTypeSchedule || []).filter((entry) => entry.id !== rowId),
    }));
  };
  const refreshLinkedRowsFromLibrary = () => {
    const houseTypesById = new Map(houseTypes.map((houseType) => [houseType.id, houseType]));
    let refreshed = 0;
    updateOption(option.id, (current) => ({
      ...current,
      houseTypeSchedule: (current.houseTypeSchedule || []).map((row) => {
        const libraryHouseType = row.libraryHouseTypeId ? houseTypesById.get(row.libraryHouseTypeId) : undefined;
        if (!libraryHouseType) return row;
        refreshed += 1;
        const librarySnapshot = createHouseTypeScheduleRowFromLibrary(libraryHouseType);
        return {
          ...row,
          houseTypeName: librarySnapshot.houseTypeName,
          style: librarySnapshot.style,
          configuration: librarySnapshot.configuration,
          storeys: librarySnapshot.storeys,
          bedrooms: librarySnapshot.bedrooms,
          garage: librarySnapshot.garage,
          privateDrive: librarySnapshot.privateDrive,
          gifaM2: librarySnapshot.gifaM2,
          buildCostPerM2: librarySnapshot.buildCostPerM2,
          // The trade index belongs to the library rate. The appraisal calculation
          // then lifts it to the current appraisal index without changing the source.
          costBreakdown: librarySnapshot.costBreakdown,
          priceIndex: librarySnapshot.priceIndex,
          buildPeriodMonths: librarySnapshot.buildPeriodMonths,
        };
      }),
    }));
    setIsLibraryRefreshOpen(false);
    showToast({
      type: 'success',
      message: `${refreshed} linked house ${refreshed === 1 ? 'type' : 'types'} refreshed from the library. The library trade indices were retained, so the current appraisal uplift is recalculated automatically. Sales data and appraisal-specific inputs were retained.`,
    });
  };
  const saveStandardHouseTypes = () => {
    const selectedRows = [...houseTypes]
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }))
      .filter((houseType) => standardSelections[houseType.id]?.selected)
      .map((houseType) => {
        const selection = standardSelections[houseType.id] || standardHouseSelectionDraft();
        return createHouseTypeScheduleRowFromLibrary(houseType, {
          quantity: Math.max(0, numberValue(selection.quantity)),
          tenure: selection.tenure,
          saleValuePerUnit: 0,
          saleRatePerM2: 0,
        });
      })
      .filter((row) => row.quantity > 0);
    if (selectedRows.length === 0) return;
    updateOption(option.id, (current) => ({
      ...current,
      houseTypeSchedule: [...(current.houseTypeSchedule || []), ...selectedRows],
    }));
    closeDrawer();
  };
  const saveCustomHouseType = () => {
    let row = createManualHouseTypeScheduleRow(houseScheduleOverridesFromDraft(draft));
    if (draft.saveToLibrary) {
      const libraryId = onSaveHouseTypeToLibrary(row);
      row = { ...row, libraryHouseTypeId: libraryId };
    }
    appendRow(row);
    closeDrawer();
  };
  const saveEditedHouseType = () => {
    if (!editingRowId) return;
    commitRowUpdate(editingRowId, houseScheduleOverridesFromDraft(draft));
    closeDrawer();
  };
  const exportHouseTypeSchedule = React.useCallback(async () => {
    if (usedHouseTypeRows.length === 0) {
      showToast({ type: 'info', message: 'Add at least one house type with a quantity before exporting the schedule.' });
      return;
    }
    setIsExportingSchedule(true);
    try {
      const saved = await downloadAppraisalHouseTypeScheduleExcel(appraisal, projects);
      showToast({
        type: saved ? 'success' : 'info',
        message: saved ? 'House type schedule exported.' : 'House type schedule export cancelled.',
      });
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'House type schedule export failed.' });
    } finally {
      setIsExportingSchedule(false);
    }
  }, [appraisal, projects, showToast, usedHouseTypeRows.length]);

  return (
    <div data-smoke="appraisals-house-workspace" className="space-y-4">
      {rows.length === 0 && <StageNotice>Add standard house types from the appraisal library, or create a custom house type for this appraisal only.</StageNotice>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricTile label="Total units" value={summary.totalUnits.toLocaleString()} />
        <MetricTile label="Private" value={summary.privateUnits.toLocaleString()} />
        <MetricTile label="Affordable" value={summary.affordableUnits.toLocaleString()} />
        <MetricTile label="Cost at appraisal" value={money(summary.houseConstructionCost)} />
        <MetricTile label="GDV" value={money(summary.gdv)} tone={summary.gdv > 0 ? 'good' : 'watch'} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-app border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-surface-900">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">House type schedule</div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Add or edit house types in pop-outs so the workbench stays focused.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-smoke="appraisals-house-type-export"
            onClick={() => { void exportHouseTypeSchedule(); }}
            disabled={usedHouseTypeRows.length === 0 || isExportingSchedule}
            className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-60"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {isExportingSchedule ? 'Exporting...' : 'Export schedule'}
          </button>
          <button
            type="button"
            data-smoke="appraisals-house-type-refresh-library"
            onClick={() => {
              setIsLibraryRefreshOpen(true);
            }}
            disabled={linkedLibraryRows.length === 0}
            className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" />
            Update from library
          </button>
          <button
            type="button"
            data-smoke="appraisals-house-type-add"
            onClick={openStandardDrawer}
            disabled={houseTypes.length === 0}
            className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-60"
          >
            <BookOpen className="h-4 w-4" />
            Add standard house type
          </button>
          {houseTypes.length === 0 && (
            <button type="button" onClick={onOpenAppraisalLibraries} className="workspace-secondary-btn px-3 py-2 text-xs">
              <BookOpen className="h-4 w-4" />
              Appraisal libraries
            </button>
          )}
          <button type="button" data-smoke="appraisals-add-custom-house" onClick={openCustomDrawer} className="workspace-primary-btn px-3 py-2 text-xs">
            <Plus className="h-4 w-4" />
            Custom house type
          </button>
        </div>
      </div>

      <div data-smoke="appraisals-house-schedule" className="overflow-x-auto rounded-app border border-slate-200 dark:border-slate-800">
        <table className="min-w-[1480px] w-full text-left text-xs">
          <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">House type</th>
              <th className="px-3 py-2">Tenure</th>
              <th className="px-3 py-2 text-right">Construction qty</th>
              <th className="px-3 py-2 text-right">Sales qty / mode</th>
              <th className="px-3 py-2 text-right">GIFA m2</th>
              <th className="px-3 py-2 text-right">Base cost/m2</th>
              <th className="px-3 py-2 text-right">Build months</th>
              <th className="px-3 py-2 text-right">Base construction</th>
              <th className="px-3 py-2 text-right">Index uplift</th>
              <th className="px-3 py-2 text-right">Cost at appraisal (reference)</th>
              <th className="px-3 py-2 text-right">Sale/unit</th>
              <th className="px-3 py-2 text-right">GDV</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-surface-900">
            {rows.map((row) => {
              const salesRows = getHouseTypeSalesRows(row);
              const baseConstructionCost = calculateHouseTypeConstructionTotal(row);
              const indexedConstructionCost = calculateIndexedHouseTypeConstructionTotal(row, option.programme);
              const constructionIndexUplift = indexedConstructionCost - baseConstructionCost;
              const indexUpliftTooltip = houseTypeIndexUpliftTooltip(row, appraisalPriceIndex);
              return (
              <tr
                key={row.id}
                data-smoke="appraisals-house-row"
                onDoubleClick={() => openEditDrawer(row)}
                className="hover:bg-slate-50 dark:hover:bg-surface-800"
              >
                <td className="px-3 py-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    row.libraryHouseTypeId
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
                      : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-surface-800 dark:text-slate-300'
                  }`}>
                    {row.libraryHouseTypeId ? 'Library' : 'Custom'}
                  </span>
                </td>
                <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">
                  <div>{row.houseTypeName}</div>
                  {row.separateSalesQuantity && (
                    <div className="mt-1 text-[10px] font-medium text-primary-700 dark:text-primary-200">
                      Construction by {row.constructionQuantityLabel || 'construction unit'}, sales by {row.salesQuantityLabel || 'sales unit'}
                    </div>
                  )}
                  {salesRows.length > 1 && (
                    <div className="mt-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                      Sales split: {salesRows.map((salesRow) => `${salesRow.label} x ${salesRow.quantity}`).join(', ')}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">{row.tenure === 'AFFORDABLE' ? 'Affordable' : 'Private'}</td>
                <HouseQuantityCells
                  row={row}
                  onConstructionQuantityCommit={updateConstructionQuantity}
                  onSalesQuantityModeChange={updateSalesQuantityMode}
                  onSalesQuantityCommit={updateSalesQuantity}
                />
                <td className="px-3 py-2 text-right tabular-nums">{row.gifaM2}</td>
                <td className="px-3 py-2 text-right tabular-nums">{money(calculateHouseTypeScheduleBuildCostPerM2(row))}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.buildPeriodMonths || 0}</td>
                <td className="px-3 py-2 text-right tabular-nums">{money(baseConstructionCost)}</td>
                <td
                  className={`px-3 py-2 text-right tabular-nums ${constructionIndexUplift > 0 ? 'cursor-help text-amber-700 dark:text-amber-300' : ''}`}
                  title={indexUpliftTooltip}
                  aria-label={`Index uplift calculation for ${row.houseTypeName}: ${indexUpliftTooltip}`}
                >
                  {money(constructionIndexUplift)}
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{money(indexedConstructionCost)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{salesRows.length > 1 ? `${salesRows.length} sale types` : money(row.saleValuePerUnit || 0)}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{money(calculateHouseTypeGdv(row))}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => openEditDrawer(row)} className="workspace-secondary-btn px-2.5 py-1.5 text-[11px]" aria-label={`Edit ${row.houseTypeName}`}>
                      Edit
                    </button>
                    <button type="button" onClick={() => deleteRow(row.id)} className="rounded-app-sm border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 dark:border-slate-700 dark:text-rose-300 dark:hover:bg-rose-950/30" aria-label={`Delete ${row.houseTypeName}`}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  No house types added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isLibraryRefreshOpen && (
        <AppraisalSideDrawer
          title="Update linked house types"
          subtitle="Refresh the appraisal's construction data from the current house-type library."
          smokeId="appraisals-house-type-refresh-library-drawer"
          onClose={() => setIsLibraryRefreshOpen(false)}
        >
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <p>
              {linkedLibraryRows.length} linked {linkedLibraryRows.length === 1 ? 'house type is' : 'house types are'} available to refresh.
              This updates the house definition, GIFA, build cost, trade build-up, trade indices, and build period.
            </p>
            <p>
              Construction and sales quantities, tenure, sales prices, sale-type splits, and appraisal notes will remain unchanged.
            </p>
            <div className="rounded-app border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-surface-950 dark:text-slate-300">
              <div className="font-semibold text-slate-800 dark:text-slate-100">Two-stage index treatment</div>
              <p className="mt-1">
                Each refreshed trade keeps its library base index, then is uplifted to the appraisal index{appraisalPriceIndex > 0 ? ` (${appraisalPriceIndex})` : ''}. A separate contingency covers the movement from the appraisal index to the expected start index{startPriceIndex > 0 ? ` (${startPriceIndex})` : ''}.
              </p>
              <p className="mt-2">
                To treat a revised trade rate as current-day pricing, set that trade's index to the current index in the house-type library before refreshing. This avoids accidentally suppressing the 215-to-232 uplift.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
              <button type="button" onClick={() => setIsLibraryRefreshOpen(false)} className="workspace-secondary-btn px-3 py-2 text-xs">
                Keep appraisal data
              </button>
              <button type="button" onClick={refreshLinkedRowsFromLibrary} className="workspace-primary-btn px-3 py-2 text-xs">
                <RotateCcw className="h-4 w-4" />
                Update {linkedLibraryRows.length} {linkedLibraryRows.length === 1 ? 'row' : 'rows'}
              </button>
            </div>
          </div>
        </AppraisalSideDrawer>
      )}

      {drawerMode === 'STANDARD' && (
        <AppraisalSideDrawer
          title="Add standard house types"
          subtitle="Select one or more library house types and enter the appraisal-specific quantity and tenure. Sales prices are set separately in House Prices."
          smokeId="appraisals-standard-house-drawer"
          onClose={() => { void requestCloseDrawer(); }}
          wide
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <label className="min-w-[16rem] flex-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Search library</span>
                <input
                  value={standardSearch}
                  onChange={(event) => setStandardSearch(event.target.value)}
                  placeholder="Search house type library..."
                  className={`${inputClass()} mt-1`}
                  aria-label="Search standard house types"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setFilteredStandardSelection(true)} disabled={filteredHouseTypes.length === 0} className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-50">
                  Select shown
                </button>
                <button type="button" onClick={() => setFilteredStandardSelection(false)} disabled={selectedStandardCount === 0} className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-50">
                  Clear
                </button>
                <button
                  type="button"
                  data-smoke="appraisals-standard-house-save"
                  onClick={saveStandardHouseTypes}
                  disabled={selectedStandardQuantityCount === 0}
                  className="workspace-primary-btn px-4 py-2 text-sm disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Add selected ({selectedStandardQuantityCount})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-app border border-slate-200 dark:border-slate-800">
              <table className="min-w-[920px] w-full text-left text-xs">
                <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
                  <tr>
                    <th className="w-14 px-3 py-2">Use</th>
                    <th className="px-3 py-2">House type</th>
                    <th className="px-3 py-2 text-right">GIFA m2</th>
                    <th className="px-3 py-2 text-right">Cost/m2</th>
                    <th className="px-3 py-2 text-right">Build months</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2">Tenure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-surface-900">
                  {filteredHouseTypes.map((houseType, index) => {
                    const selection = standardSelections[houseType.id] || standardHouseSelectionDraft();
                    return (
                      <tr key={houseType.id} className={selection.selected ? 'bg-primary-50/65 dark:bg-primary-950/20' : houseType.isIncomplete ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}>
                        <td className="px-3 py-2">
                          <input
                            data-smoke={index === 0 ? 'appraisals-standard-house-select' : undefined}
                            type="checkbox"
                            checked={selection.selected}
                            disabled={houseType.isIncomplete}
                            onChange={(event) => updateStandardSelection(houseType.id, { selected: event.target.checked })}
                            aria-label={`Select ${houseType.name}`}
                            title={houseType.isIncomplete ? (houseType.incompleteWarning || 'Complete this house type before adding it to an appraisal.') : undefined}
                            className="h-4 w-4 disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                            <span>{houseType.name}</span>
                            {houseType.isIncomplete && <span className="rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">Complete before use</span>}
                          </div>
                          {houseType.isIncomplete && <div className="mt-1 max-w-[28rem] text-[11px] leading-4 text-amber-800 dark:text-amber-200">{houseType.incompleteWarning || 'Only partial cost data is recorded.'}</div>}
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden="true" />
                            {houseType.style && <span>{houseTypeStyleLabel(houseType.style)}</span>}
                            {houseType.configuration && <span>{houseTypeConfigurationLabel(houseType.configuration)}</span>}
                            {houseType.storeys && <span>{houseTypeStoreysLabel(houseType.storeys)}</span>}
                            {houseType.bedrooms && <span>{houseType.bedrooms} bed</span>}
                            {houseType.garage !== undefined && <span>{houseType.garage ? 'Garage' : 'No garage'}</span>}
                            {houseType.privateDrive !== undefined && <span>{houseType.privateDrive ? 'Drive' : 'No drive'}</span>}
                            <span>PI {houseType.priceIndex || '-'}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{houseType.gifaM2}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{money(calculateHouseTypeLibraryBuildCostPerM2(houseType))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{houseType.buildPeriodMonths || 0}</td>
                        <td className="px-3 py-2">
                          <input
                            data-smoke={index === 0 ? 'appraisals-standard-house-quantity' : undefined}
                            type="number"
                            min={0}
                            value={selection.quantity}
                            placeholder="-"
                            disabled={houseType.isIncomplete}
                            onFocus={() => updateStandardSelection(houseType.id, { selected: true })}
                            onChange={(event) => updateStandardSelection(houseType.id, { selected: true, quantity: event.target.value })}
                            className={`${inputClass('text-right')} min-w-[5rem] disabled:cursor-not-allowed disabled:opacity-50`}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={selection.tenure}
                            disabled={houseType.isIncomplete}
                            onFocus={() => updateStandardSelection(houseType.id, { selected: true })}
                            onChange={(event) => updateStandardSelection(houseType.id, { selected: true, tenure: event.target.value as HouseTenureValue })}
                            className={`${inputClass()} min-w-[8rem] disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            <option value="PRIVATE">Private</option>
                            <option value="AFFORDABLE">Affordable</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredHouseTypes.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-xs text-slate-500 dark:text-slate-400">No matching standard house types.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </AppraisalSideDrawer>
      )}

      {drawerMode === 'CUSTOM' && (
        <AppraisalSideDrawer
          title="Add custom house type"
          subtitle="Create an appraisal-only house type. Tick save to library only when it should become a reusable standard."
          smokeId="appraisals-custom-house-drawer"
          onClose={() => { void requestCloseDrawer(); }}
          wide
        >
          <HouseScheduleDraftForm
            draft={draft}
            setDraft={setDraft}
            mode="CUSTOM"
            costMode={customCostMode}
            onCostModeChange={(mode) => {
              setCustomCostMode(mode);
              resetGuidedHouseCost();
            }}
            costBasis={customCostBasis}
            onCostBasisChange={(basis) => {
              setCustomCostBasis(basis);
              resetGuidedHouseCost();
            }}
            onSubmit={saveCustomHouseType}
            onAssessCost={assessCustomHouseCost}
            onRunGuidedCostStep={runGuidedHouseCostStep}
            guidedQuestion={guidedCostQuestion}
            guidedAnswer={guidedCostAnswer}
            onGuidedAnswerChange={setGuidedCostAnswer}
            guidedAnswers={guidedCostAnswers}
            onResetGuidedCost={resetGuidedHouseCost}
            isAssessingCost={isAssessingCustomCost}
            submitLabel="Add custom house type"
          />
        </AppraisalSideDrawer>
      )}

      {drawerMode === 'EDIT' && (
        <AppraisalSideDrawer
          title="Edit house schedule row"
          subtitle="Update this appraisal row without changing the source library house type."
          smokeId="appraisals-house-edit-drawer"
          onClose={() => { void requestCloseDrawer(); }}
          wide
        >
          <HouseScheduleDraftForm
            draft={draft}
            setDraft={setDraft}
            mode="EDIT"
            costBasis={customCostBasis}
            onCostBasisChange={setCustomCostBasis}
            onAssessCost={assessCustomHouseCost}
            isAssessingCost={isAssessingCustomCost}
            onSubmit={saveEditedHouseType}
            submitLabel="Save row"
          />
        </AppraisalSideDrawer>
      )}
    </div>
  );
}

function HouseScheduleDraftForm({
  draft,
  setDraft,
  mode,
  costMode = 'QUICK',
  onCostModeChange,
  costBasis = 'USE_LIBRARY_WHERE_SUITABLE',
  onCostBasisChange,
  onSubmit,
  onAssessCost,
  onRunGuidedCostStep,
  guidedQuestion = '',
  guidedAnswer = '',
  onGuidedAnswerChange,
  guidedAnswers = [],
  onResetGuidedCost,
  isAssessingCost = false,
  submitLabel,
}: {
  draft: HouseScheduleDraft;
  setDraft: React.Dispatch<React.SetStateAction<HouseScheduleDraft>>;
  mode: HouseScheduleFormMode;
  costMode?: CustomHouseCostMode;
  onCostModeChange?: (mode: CustomHouseCostMode) => void;
  costBasis?: CustomHouseCostBasis;
  onCostBasisChange?: (basis: CustomHouseCostBasis) => void;
  onSubmit: () => void;
  onAssessCost?: () => void;
  onRunGuidedCostStep?: () => void;
  guidedQuestion?: string;
  guidedAnswer?: string;
  onGuidedAnswerChange?: (value: string) => void;
  guidedAnswers?: GuidedHouseCostAnswer[];
  onResetGuidedCost?: () => void;
  isAssessingCost?: boolean;
  submitLabel: string;
}) {
  const prefix = mode.toLowerCase();
  const componentTotal = calculateHouseTypeCostBreakdownTotal(draft.costBreakdown);
  const gifa = Math.max(0, numberValue(draft.gifaM2));
  const componentRate = gifa > 0 && componentTotal > 0 ? componentTotal / gifa : 0;
  const isGuidedCustom = mode === 'CUSTOM' && costMode === 'GUIDED';
  const [componentDetailId, setComponentDetailId] = React.useState<string | null>(null);
  const [componentDetailExcludedRows, setComponentDetailExcludedRows] = React.useState<Record<string, string[]>>({});
  const [componentDetailCurrencyDrafts, setComponentDetailCurrencyDrafts] = React.useState<Record<string, string>>({});
  const selectedComponentDetail = React.useMemo(
    () => draft.costBreakdown.find((component) => component.id === componentDetailId) || null,
    [componentDetailId, draft.costBreakdown]
  );
  const selectedComponentDetailRows = React.useMemo(
    () => selectedComponentDetail ? buildComponentAllowanceDetailRows(selectedComponentDetail, draft) : [],
    [draft, selectedComponentDetail]
  );
  const selectedComponentExcludedRowIds = selectedComponentDetail
    ? Array.from(new Set([
      ...selectedComponentDetailRows.filter((row) => row.included === false).map((row) => row.id),
      ...(componentDetailExcludedRows[selectedComponentDetail.id] || []),
    ]))
    : [];
  const selectedComponentIncludedRows = selectedComponentDetailRows.filter((row) => (
    row.included !== false && !selectedComponentExcludedRowIds.includes(row.id)
  ));
  const selectedComponentDetailTotal = selectedComponentIncludedRows.reduce((total, row) => total + Math.max(0, row.total), 0);
  const componentCurrencyDraftKey = (rowId: string, field: 'rate' | 'total') => `${rowId}:${field}`;
  const componentCurrencyValue = (rowId: string, field: 'rate' | 'total', value: number) => {
    const key = componentCurrencyDraftKey(rowId, field);
    return componentDetailCurrencyDrafts[key] ?? currencyInputDisplay(value);
  };
  const setComponentCurrencyDraft = (rowId: string, field: 'rate' | 'total', value: string | null) => {
    const key = componentCurrencyDraftKey(rowId, field);
    setComponentDetailCurrencyDrafts((current) => {
      const next = { ...current };
      if (value === null) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  };
  const updateDraft = (patch: Partial<HouseScheduleDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const updateSalesRow = (rowId: string, patch: Partial<AppraisalHouseTypeSalesRow>) => {
    updateDraft({
      salesRows: draft.salesRows.map((row) => row.id === rowId ? { ...row, ...patch } : row),
    });
  };
  const addSalesRow = () => {
    updateDraft({
      separateSalesQuantity: true,
      salesRows: [
        ...draft.salesRows,
        {
          id: generateId(),
          label: 'Sale type',
          quantity: 0,
          gifaM2: 0,
          saleValuePerUnit: 0,
          saleRatePerM2: 0,
          notes: '',
        },
      ],
    });
  };
  const removeSalesRow = (rowId: string) => {
    updateDraft({ salesRows: draft.salesRows.filter((row) => row.id !== rowId) });
  };
  const inferSalesBreakdown = () => {
    const constructionQuantity = Math.max(1, numberValue(draft.quantity) || 1);
    const salesQuantity = Math.max(0, numberValue(draft.salesQuantity) || numberValue(draft.quantity));
    const salesPerConstructionUnit = salesQuantity > 0 ? salesQuantity / constructionQuantity : 0;
    const inferred = inferFlatSalesRowsFromText(
      [
        draft.guidedSalesDescription,
        draft.quantitySeparationNotes,
        draft.notes,
        draft.houseTypeName,
      ].filter(Boolean).join('\n'),
      salesQuantity,
      salesPerConstructionUnit > 0 ? numberValue(draft.gifaM2) / salesPerConstructionUnit : 0
    );
    if (inferred.length > 0) {
      updateDraft({
        separateSalesQuantity: true,
        salesRows: inferred,
        salesQuantity: String(inferred.reduce((total, row) => total + Math.max(0, row.quantity || 0), 0)),
      });
    }
  };
  const updateComponent = (componentId: string, patch: Partial<AppraisalHouseTypeCostComponent>) => {
    updateDraft({
      costBreakdown: draft.costBreakdown.map((component) => (
        component.id === componentId ? { ...component, ...patch } : component
      )),
    });
  };
  const persistComponentDetailRows = (
    componentId: string,
    rows: ComponentAllowanceDetailRow[],
    excludedIds: string[] = selectedComponentExcludedRowIds
  ) => {
    const excludedSet = new Set(excludedIds);
    updateComponent(componentId, {
      detailRows: rows.map((row) => ({
        id: row.id,
        label: row.label || 'Allowance item',
        quantity: Math.max(0, Number(row.quantity) || 0),
        unit: row.unit || 'item',
        rate: Math.max(0, Number(row.rate) || 0),
        total: Math.max(0, Number(row.total) || 0),
        basis: row.basis || '',
        included: row.included === false || excludedSet.has(row.id) ? false : true,
      })),
    });
  };
  const updateComponentDetailRow = (
    rowId: string,
    patch: Partial<ComponentAllowanceDetailRow>,
    recalculation: 'FROM_RATE' | 'FROM_TOTAL' | 'NONE' = 'NONE'
  ) => {
    if (!selectedComponentDetail) return;
    const nextRows = selectedComponentDetailRows.map((row) => {
      if (row.id !== rowId) return row;
      const next = { ...row, ...patch };
      const quantity = Math.max(0, Number(next.quantity) || 0);
      const rate = Math.max(0, Number(next.rate) || 0);
      const total = Math.max(0, Number(next.total) || 0);
      if (recalculation === 'FROM_RATE') {
        next.total = Math.round(quantity * rate * 100) / 100;
      }
      if (recalculation === 'FROM_TOTAL') {
        next.rate = quantity > 0 ? total / quantity : total;
      }
      return next;
    });
    persistComponentDetailRows(selectedComponentDetail.id, nextRows);
  };
  const addComponentDetailRow = () => {
    if (!selectedComponentDetail) return;
    persistComponentDetailRows(selectedComponentDetail.id, [
      ...selectedComponentDetailRows,
      {
        id: generateId(),
        label: 'New allowance',
        quantity: 1,
        unit: 'item',
        rate: 0,
        total: 0,
        basis: 'User-added allowance line.',
        included: true,
      },
    ]);
  };
  const removeComponentDetailRow = (rowId: string) => {
    if (!selectedComponentDetail) return;
    persistComponentDetailRows(
      selectedComponentDetail.id,
      selectedComponentDetailRows.filter((row) => row.id !== rowId),
      selectedComponentExcludedRowIds.filter((id) => id !== rowId)
    );
  };
  const toggleComponentDetailRow = (componentId: string, rowId: string, excluded: boolean) => {
    const existing = selectedComponentExcludedRowIds;
    const nextExcludedIds = excluded
      ? Array.from(new Set([...existing, rowId]))
      : existing.filter((id) => id !== rowId);
    setComponentDetailExcludedRows((current) => {
      return {
        ...current,
        [componentId]: nextExcludedIds,
      };
    });
    persistComponentDetailRows(
      componentId,
      selectedComponentDetailRows.map((row) => (
        row.id === rowId ? { ...row, included: !excluded } : row
      )),
      nextExcludedIds
    );
  };
  const applySelectedComponentDetailRows = () => {
    if (!selectedComponentDetail) return;
    const includedText = selectedComponentIncludedRows.map((row) => (
      `${row.label}: ${row.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${row.unit} @ ${money(row.rate)} = ${money(row.total)}`
    ));
    const excludedText = selectedComponentDetailRows
      .filter((row) => selectedComponentExcludedRowIds.includes(row.id))
      .map((row) => `Excluded ${row.label}`);
    updateComponent(selectedComponentDetail.id, {
      amount: selectedComponentDetailTotal,
      detailRows: selectedComponentDetailRows.map((row) => ({
        id: row.id,
        label: row.label,
        quantity: row.quantity,
        unit: row.unit,
        rate: row.rate,
        total: row.total,
        basis: row.basis,
        included: row.included !== false && !selectedComponentExcludedRowIds.includes(row.id),
      })),
      notes: [
        'Allowance build-up:',
        ...includedText,
        ...excludedText,
      ].filter(Boolean).join('\n'),
    });
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {(mode === 'CUSTOM' || mode === 'EDIT') && onAssessCost && (
        <section className="rounded-app border border-primary-100 bg-primary-50/50 p-3 dark:border-primary-900/60 dark:bg-primary-950/20">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-700 dark:text-primary-200">{mode === 'EDIT' ? 'AI cost refresh' : 'Custom house type costing'}</div>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600 dark:text-slate-300">
                {mode === 'EDIT'
                  ? 'Re-run AI against the current row inputs. The result will refresh the rate, notes, saleable unit rows where applicable, and the editable component build-up.'
                  : 'Use the current calculation for a manual schedule row, or guided AI for separated construction and sales descriptions such as blocks of flats.'}
              </p>
            </div>
            {mode === 'CUSTOM' && onCostModeChange ? (
              <div className="inline-flex rounded-app border border-primary-200 bg-white p-1 text-xs dark:border-primary-900 dark:bg-surface-950">
              <button
                type="button"
                onClick={() => onCostModeChange?.('QUICK')}
                className={`rounded-app-sm px-3 py-1.5 font-semibold transition ${costMode === 'QUICK' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-surface-900'}`}
              >
                Current calculation
              </button>
              <button
                type="button"
                onClick={() => onCostModeChange?.('GUIDED')}
                className={`rounded-app-sm px-3 py-1.5 font-semibold transition ${costMode === 'GUIDED' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-surface-900'}`}
              >
                Guided AI questions
              </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { void onAssessCost(); }}
                disabled={isAssessingCost}
                className="workspace-primary-btn px-3 py-2 text-xs disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {isAssessingCost ? 'Assessing...' : 'Re-run AI'}
              </button>
            )}
          </div>

          {onCostBasisChange && (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {([
                {
                  id: 'USE_LIBRARY_WHERE_SUITABLE' as CustomHouseCostBasis,
                  label: 'Use library where suitable',
                  description: 'AI may use house library rates only if they are a fair comparable.',
                },
                {
                  id: 'FIRST_PRINCIPLES' as CustomHouseCostBasis,
                  label: 'First principles',
                  description: 'AI should price independently and use the library only for editable row names.',
                },
              ]).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onCostBasisChange(option.id)}
                  className={`rounded-app border p-3 text-left transition ${
                    costBasis === option.id
                      ? 'border-primary-300 bg-white text-slate-900 shadow-sm ring-1 ring-primary-200 dark:border-primary-700 dark:bg-primary-950/30 dark:text-slate-100 dark:ring-primary-900'
                      : 'border-primary-100 bg-white/60 text-slate-600 hover:bg-white dark:border-primary-900/60 dark:bg-surface-950/50 dark:text-slate-300 dark:hover:bg-surface-950'
                  }`}
                >
                  <span className="block text-xs font-semibold">{option.label}</span>
                  <span className="mt-1 block text-[11px] leading-4 text-slate-500 dark:text-slate-400">{option.description}</span>
                </button>
              ))}
            </div>
          )}

          {mode === 'EDIT' ? null : isGuidedCustom ? (
            <div className="mt-3 space-y-3 rounded-app border border-primary-100 bg-white/80 p-3 dark:border-primary-900/60 dark:bg-surface-950/60">
              <div className="grid gap-3 lg:grid-cols-2">
                <label>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Construction description</span>
                  <textarea
                    value={draft.guidedConstructionDescription}
                    onChange={(event) => updateDraft({ guidedConstructionDescription: event.target.value })}
                    placeholder="e.g. One four-storey block of flats with common stair, lift, services, and shared circulation."
                    className={`${inputClass('min-h-[5rem]')} mt-1`}
                  />
                </label>
                <label>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Sales description</span>
                  <textarea
                    value={draft.guidedSalesDescription}
                    onChange={(event) => updateDraft({ guidedSalesDescription: event.target.value })}
                    placeholder="e.g. 12 private flats sold individually, mixed one and two bedroom units."
                    className={`${inputClass('min-h-[5rem]')} mt-1`}
                  />
                </label>
              </div>

              {guidedAnswers.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Answered so far</div>
                  {guidedAnswers.map((entry, index) => (
                    <div key={`${entry.question}-${index}`} className="rounded-app-sm border border-slate-200 bg-slate-50 p-2 text-xs dark:border-slate-800 dark:bg-surface-900">
                      <div className="font-semibold text-slate-800 dark:text-slate-100">{entry.question}</div>
                      <div className="mt-1 leading-5 text-slate-600 dark:text-slate-300">{entry.answer}</div>
                    </div>
                  ))}
                </div>
              )}

              {guidedQuestion ? (
                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-700 dark:text-primary-200">Current AI question</span>
                  <div className="mt-1 rounded-app border border-primary-200 bg-primary-50/70 p-3 text-sm font-semibold text-slate-900 dark:border-primary-900 dark:bg-primary-950/20 dark:text-slate-100">
                    {guidedQuestion}
                  </div>
                  <textarea
                    value={guidedAnswer}
                    onChange={(event) => onGuidedAnswerChange?.(event.target.value)}
                    placeholder="Answer the AI question here..."
                    className={`${inputClass('mt-2 min-h-[4.5rem]')}`}
                  />
                </label>
              ) : (
                <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                  Start guided AI and it will ask only what it still needs, then fill the construction quantity, sales quantity, GIFA, cost, and row description.
                </p>
              )}

              {(draft.houseTypeName || numberValue(draft.quantity) > 0 || numberValue(draft.salesQuantity) > 0 || numberValue(draft.buildCostPerM2) > 0) && (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                  <MetricTile label="Description" value={draft.houseTypeName || 'Pending'} />
                  <MetricTile label="Cost basis" value={`${draft.quantity || '-'} ${draft.constructionQuantityLabel || 'units'}`} />
                  <MetricTile label="Sales basis" value={`${draft.salesQuantity || draft.quantity || '-'} ${draft.salesQuantityLabel || 'units'}`} />
                  <MetricTile label="GIFA m2" value={numberValue(draft.gifaM2).toLocaleString()} />
                  <MetricTile label="Cost/m2" value={money(numberValue(draft.buildCostPerM2))} />
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                {(guidedQuestion || guidedAnswers.length > 0) && (
                  <button
                    type="button"
                    onClick={onResetGuidedCost}
                    disabled={isAssessingCost}
                    className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset questions
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { void onRunGuidedCostStep?.(); }}
                  disabled={isAssessingCost}
                  className="workspace-primary-btn px-3 py-2 text-xs disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  {isAssessingCost ? 'Thinking...' : guidedQuestion ? 'Submit answer' : 'Start guided AI'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-app border border-primary-100 bg-white/70 p-3 dark:border-primary-900/60 dark:bg-surface-950/60">
              <p className="max-w-3xl text-xs leading-5 text-slate-600 dark:text-slate-300">
                Uses the detailed inputs below, current house type comparables, appraisal context, and online search where available to suggest a cautious build cost.
              </p>
              <button
                type="button"
                onClick={() => { void onAssessCost(); }}
                disabled={isAssessingCost}
                className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {isAssessingCost ? 'Assessing...' : 'Assess cost with AI'}
              </button>
            </div>
          )}
        </section>
      )}

      {!isGuidedCustom && (
        <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">House type</span>
          <input
            data-smoke={`appraisals-${prefix}-house-name`}
            value={draft.houseTypeName}
            onChange={(event) => updateDraft({ houseTypeName: event.target.value })}
            className={`${inputClass()} mt-1`}
          />
        </label>
        <label>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Tenure</span>
          <select
            value={draft.tenure}
            onChange={(event) => updateDraft({ tenure: event.target.value as HouseTenureValue })}
            className={`${inputClass()} mt-1`}
          >
            <option value="PRIVATE">Private</option>
            <option value="AFFORDABLE">Affordable</option>
          </select>
        </label>
        <label>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Style</span>
          <select
            value={draft.style}
            onChange={(event) => updateDraft({ style: event.target.value })}
            className={`${inputClass()} mt-1`}
          >
            <option value="">Select style</option>
            {APPRAISAL_HOUSE_TYPE_STYLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Configuration</span>
          <select
            value={draft.configuration}
            onChange={(event) => updateDraft({ configuration: event.target.value })}
            className={`${inputClass()} mt-1`}
          >
            <option value="">Select configuration</option>
            {APPRAISAL_HOUSE_TYPE_CONFIGURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Storeys</span>
          <select
            value={draft.storeys}
            onChange={(event) => updateDraft({ storeys: event.target.value })}
            className={`${inputClass('text-right')} mt-1`}
          >
            <option value="">-</option>
            {HOUSE_TYPE_STOREY_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Bedrooms</span>
          <select
            value={draft.bedrooms}
            onChange={(event) => updateDraft({ bedrooms: event.target.value })}
            className={`${inputClass('text-right')} mt-1`}
          >
            <option value="">-</option>
            {HOUSE_TYPE_BEDROOM_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Garage</span>
          <select
            value={draft.garage}
            onChange={(event) => updateDraft({ garage: event.target.value })}
            className={`${inputClass()} mt-1`}
          >
            <option value="">-</option>
            <option value="YES">Yes</option>
            <option value="NO">No</option>
          </select>
        </label>
        <label>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Private drive</span>
          <select
            value={draft.privateDrive}
            onChange={(event) => updateDraft({ privateDrive: event.target.value })}
            className={`${inputClass()} mt-1`}
          >
            <option value="">-</option>
            <option value="YES">Yes</option>
            <option value="NO">No</option>
          </select>
        </label>
        <label>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Quantity</span>
          <input
            data-smoke={`appraisals-${prefix}-house-quantity`}
            type="number"
            value={draft.quantity}
            onChange={(event) => updateDraft({ quantity: event.target.value })}
            className={`${inputClass('text-right')} mt-1`}
          />
        </label>
        <label>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Construction unit</span>
          <input
            value={draft.constructionQuantityLabel}
            onChange={(event) => updateDraft({ constructionQuantityLabel: event.target.value })}
            placeholder="e.g. block"
            className={`${inputClass()} mt-1`}
          />
        </label>
        <label>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Sales unit</span>
          <input
            value={draft.salesQuantityLabel}
            onChange={(event) => updateDraft({ salesQuantityLabel: event.target.value })}
            placeholder="e.g. flat"
            className={`${inputClass()} mt-1`}
          />
        </label>
        <label>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">GIFA m2</span>
          <input
            data-smoke={`appraisals-${prefix}-house-gifa`}
            type="number"
            value={draft.gifaM2}
            onChange={(event) => updateDraft({ gifaM2: event.target.value })}
            className={`${inputClass('text-right')} mt-1`}
          />
        </label>
        <label className="flex min-h-[4.2rem] items-end rounded-app border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-surface-900">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={draft.separateSalesQuantity}
              onChange={(event) => updateDraft({
                separateSalesQuantity: event.target.checked,
                salesQuantity: event.target.checked ? draft.salesQuantity || draft.quantity : '',
                constructionQuantityLabel: event.target.checked ? draft.constructionQuantityLabel || 'block' : draft.constructionQuantityLabel,
                salesQuantityLabel: event.target.checked ? draft.salesQuantityLabel || 'flat' : draft.salesQuantityLabel,
              })}
              className="h-4 w-4"
            />
            Separate sales quantity
          </span>
        </label>
        {draft.separateSalesQuantity && (
          <label>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Sales quantity</span>
            <input
              type="number"
              value={draft.salesQuantity}
              onChange={(event) => updateDraft({ salesQuantity: event.target.value })}
              placeholder="No. of flats / sales units"
              className={`${inputClass('text-right')} mt-1`}
            />
          </label>
        )}
        <label>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Build cost/m2</span>
          <input
            data-smoke={`appraisals-${prefix}-house-cost`}
            type="number"
            value={draft.useCostBreakdown && componentRate > 0 ? Math.round(componentRate) : draft.buildCostPerM2}
            disabled={draft.useCostBreakdown && componentRate > 0}
            onChange={(event) => updateDraft({ buildCostPerM2: event.target.value })}
            className={`${inputClass('text-right disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-400')} mt-1`}
          />
        </label>
        <label>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Price index</span>
          <input
            type="number"
            value={draft.priceIndex}
            onChange={(event) => updateDraft({ priceIndex: event.target.value })}
            className={`${inputClass('text-right')} mt-1`}
          />
        </label>
        <label>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Build months</span>
          <input
            type="number"
            value={draft.buildPeriodMonths}
            onChange={(event) => updateDraft({ buildPeriodMonths: event.target.value })}
            className={`${inputClass('text-right')} mt-1`}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Comments / assumptions</span>
        <textarea
          value={draft.notes}
          onChange={(event) => updateDraft({ notes: event.target.value })}
          tabIndex={-1}
          className={`${inputClass('min-h-[5rem]')} mt-1`}
        />
      </label>

      {draft.separateSalesQuantity && (
        <section className="space-y-3 rounded-app border border-primary-100 bg-primary-50/40 p-3 dark:border-primary-900/60 dark:bg-primary-950/20">
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-700 dark:text-primary-200">Construction / sales quantity explanation</span>
            <textarea
              value={draft.quantitySeparationNotes}
              onChange={(event) => updateDraft({ quantitySeparationNotes: event.target.value })}
              placeholder="Explain the separation, e.g. construction cost entered as 2 apartment blocks, sales price entered against 4 GF flats, 4 mid floor flats and 4 top floor flats."
              className={`${inputClass('min-h-[4.5rem]')} mt-1`}
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-700 dark:text-primary-200">Saleable unit breakdown</div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                These rows drive the House Prices tab, so GF, mid and top floor flats can each carry different sale prices.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={inferSalesBreakdown} className="workspace-secondary-btn px-3 py-2 text-xs">
                <Sparkles className="h-4 w-4" />
                Infer rows
              </button>
              <button type="button" onClick={addSalesRow} className="workspace-secondary-btn px-3 py-2 text-xs">
                <Plus className="h-4 w-4" />
                Add sale type
              </button>
            </div>
          </div>
          {draft.salesRows.length > 0 ? (
            <div className="overflow-x-auto rounded-app-sm border border-primary-100 bg-white dark:border-primary-900/60 dark:bg-surface-950">
              <table className="min-w-[760px] w-full text-left text-xs">
                <thead className="bg-primary-50 text-[10px] uppercase tracking-[0.16em] text-primary-700 dark:bg-primary-950/30 dark:text-primary-200">
                  <tr>
                    <th className="px-3 py-2">Sale type</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">GIFA m2/unit</th>
                    <th className="px-3 py-2 text-right">Sale/unit</th>
                    <th className="px-3 py-2 text-right">Rate £/m2</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-100 dark:divide-primary-900/50">
                  {draft.salesRows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2">
                        <input value={row.label} onChange={(event) => updateSalesRow(row.id, { label: event.target.value })} className={inputClass('h-8 px-2 py-1')} />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={row.quantity || ''} onChange={(event) => updateSalesRow(row.id, { quantity: numberValue(event.target.value) })} className={inputClass('h-8 px-2 py-1 text-right')} />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={row.gifaM2 || ''} onChange={(event) => updateSalesRow(row.id, { gifaM2: numberValue(event.target.value) })} className={inputClass('h-8 px-2 py-1 text-right')} />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={row.saleValuePerUnit || ''} onChange={(event) => updateSalesRow(row.id, { saleValuePerUnit: numberValue(event.target.value), saleRatePerM2: 0 })} className={inputClass('h-8 px-2 py-1 text-right')} />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={row.saleRatePerM2 || ''} onChange={(event) => updateSalesRow(row.id, { saleRatePerM2: numberValue(event.target.value), saleValuePerUnit: 0 })} className={inputClass('h-8 px-2 py-1 text-right')} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button type="button" onClick={() => removeSalesRow(row.id)} className="rounded-app-sm border border-slate-200 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 dark:border-slate-700 dark:text-rose-300">
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-app-sm border border-dashed border-primary-200 bg-white px-3 py-3 text-xs text-slate-500 dark:border-primary-900 dark:bg-surface-950 dark:text-slate-400">
              No saleable unit rows saved yet. Use Infer rows or add the GF, mid and top floor flat rows manually.
            </div>
          )}
        </section>
      )}
        </>
      )}

      {mode === 'CUSTOM' && onAssessCost && onCostModeChange === undefined && (
        <section className="rounded-app border border-primary-100 bg-primary-50/50 p-3 dark:border-primary-900/60 dark:bg-primary-950/20">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-700 dark:text-primary-200">AI cost assessment</div>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600 dark:text-slate-300">
                Choose a quick comparable assessment, or let AI ask focused QS questions until it has enough information to price the custom house type.
              </p>
            </div>
            <div className="inline-flex rounded-app border border-primary-200 bg-white p-1 text-xs dark:border-primary-900 dark:bg-surface-950">
              <button
                type="button"
                onClick={() => onCostModeChange?.('QUICK')}
                className={`rounded-app-sm px-3 py-1.5 font-semibold transition ${costMode === 'QUICK' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-surface-900'}`}
              >
                Current calculation
              </button>
              <button
                type="button"
                onClick={() => onCostModeChange?.('GUIDED')}
                className={`rounded-app-sm px-3 py-1.5 font-semibold transition ${costMode === 'GUIDED' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-surface-900'}`}
              >
                Guided AI questions
              </button>
            </div>
          </div>

          {costMode === 'QUICK' ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-app border border-primary-100 bg-white/70 p-3 dark:border-primary-900/60 dark:bg-surface-950/60">
              <p className="max-w-3xl text-xs leading-5 text-slate-600 dark:text-slate-300">
                Uses the current inputs, AWD house type comparables, appraisal context, and online search where available to suggest a cautious build cost.
              </p>
              <button
                type="button"
                onClick={() => { void onAssessCost(); }}
                disabled={isAssessingCost}
                className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {isAssessingCost ? 'Assessing...' : 'Assess cost with AI'}
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-3 rounded-app border border-primary-100 bg-white/80 p-3 dark:border-primary-900/60 dark:bg-surface-950/60">
              {guidedAnswers.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Answered so far</div>
                  {guidedAnswers.map((entry, index) => (
                    <div key={`${entry.question}-${index}`} className="rounded-app-sm border border-slate-200 bg-slate-50 p-2 text-xs dark:border-slate-800 dark:bg-surface-900">
                      <div className="font-semibold text-slate-800 dark:text-slate-100">{entry.question}</div>
                      <div className="mt-1 leading-5 text-slate-600 dark:text-slate-300">{entry.answer}</div>
                    </div>
                  ))}
                </div>
              )}

              {guidedQuestion ? (
                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-700 dark:text-primary-200">Current AI question</span>
                  <div className="mt-1 rounded-app border border-primary-200 bg-primary-50/70 p-3 text-sm font-semibold text-slate-900 dark:border-primary-900 dark:bg-primary-950/20 dark:text-slate-100">
                    {guidedQuestion}
                  </div>
                  <textarea
                    value={guidedAnswer}
                    onChange={(event) => onGuidedAnswerChange?.(event.target.value)}
                    placeholder="Answer the AI question here..."
                    className={`${inputClass('mt-2 min-h-[4.5rem]')}`}
                  />
                </label>
              ) : (
                <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                  Start guided costing and AI will ask the most important missing question first. It can continue asking until there is enough detail to produce the cost.
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                {(guidedQuestion || guidedAnswers.length > 0) && (
                  <button
                    type="button"
                    onClick={onResetGuidedCost}
                    disabled={isAssessingCost}
                    className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset questions
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { void onRunGuidedCostStep?.(); }}
                  disabled={isAssessingCost}
                  className="workspace-primary-btn px-3 py-2 text-xs disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  {isAssessingCost ? 'Thinking...' : guidedQuestion ? 'Submit answer' : 'Start guided AI'}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {((mode === 'CUSTOM' && !isGuidedCustom) || mode === 'EDIT') && (
        <section className="rounded-app border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-surface-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={draft.useCostBreakdown}
                onChange={(event) => updateDraft({ useCostBreakdown: event.target.checked })}
                className="h-4 w-4"
              />
              Use component build-up
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <MetricTile label="Component total" value={money(componentTotal)} />
              <MetricTile label="Derived cost/m2" value={money(componentRate)} />
            </div>
          </div>

          {draft.useCostBreakdown && (
            <div data-smoke={`appraisals-${prefix}-house-breakdown`} className="mt-4 max-h-[24rem] overflow-y-auto rounded-app border border-slate-200 dark:border-slate-800">
              <table className="min-w-[760px] w-full text-left text-xs">
                <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
                  <tr>
                    <th className="w-48 px-3 py-2">Element</th>
                    <th className="w-20 px-2 py-2 text-center">Exclude</th>
                    <th className="w-36 px-2 py-2 text-right">Amount</th>
                    <th className="px-3 py-2">Notes</th>
                    <th className="w-16 px-2 py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-surface-900">
                  {draft.costBreakdown.map((component) => {
                    const included = component.included !== false;
                    const componentLabel = component.label?.trim() || APPRAISAL_HOUSE_TYPE_COST_LABELS[component.key];
                    const tooltip = component.notes?.trim()
                      ? `${componentLabel}: ${component.notes.trim()}`
                      : `${componentLabel}: ${money(component.amount)} allowance. Open details to record the pricing basis.`;
                    return (
                      <tr key={component.id} title={tooltip} className="hover:bg-primary-50/60 dark:hover:bg-primary-950/20">
                        <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">
                          {componentLabel}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={!included}
                            onChange={(event) => updateComponent(component.id, { included: !event.target.checked })}
                            aria-label={`Exclude ${componentLabel} cost`}
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            value={component.amount}
                            onChange={(event) => updateComponent(component.id, { amount: numberValue(event.target.value) })}
                            className={inputClass('h-8 px-2 py-1 text-right')}
                            aria-label={`${componentLabel} amount`}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={component.notes || ''}
                            onChange={(event) => updateComponent(component.id, { notes: event.target.value })}
                            className={inputClass('h-8 px-2 py-1')}
                            aria-label={`${componentLabel} notes`}
                            tabIndex={-1}
                          />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => setComponentDetailId(component.id)}
                            className="rounded-app-sm border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-surface-800"
                            aria-label={`Open ${componentLabel} pricing detail`}
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {selectedComponentDetail && (
            <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={() => setComponentDetailId(null)}>
              <div
                className="flex max-h-[92vh] w-[min(74rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-app-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-surface-950"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Component pricing detail</div>
                    <h4 className="mt-1 text-base font-semibold text-slate-950 dark:text-slate-50">
                      {selectedComponentDetail.label?.trim() || APPRAISAL_HOUSE_TYPE_COST_LABELS[selectedComponentDetail.key]}
                    </h4>
                  </div>
                  <button type="button" onClick={() => setComponentDetailId(null)} className="workspace-secondary-btn px-3 py-2 text-xs">
                    <X className="h-4 w-4" />
                    Close
                  </button>
                </div>
                <div className="min-h-0 space-y-4 overflow-y-auto p-5">
                  <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                    <label className="flex min-h-[4rem] items-end rounded-app border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-surface-900">
                      <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={selectedComponentDetail.included === false}
                          onChange={(event) => updateComponent(selectedComponentDetail.id, { included: !event.target.checked })}
                          className="h-4 w-4"
                        />
                        Exclude
                      </span>
                    </label>
                    <label>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Amount</span>
                      <input
                        type="number"
                        value={selectedComponentDetail.amount}
                        onChange={(event) => updateComponent(selectedComponentDetail.id, { amount: numberValue(event.target.value) })}
                        className={`${inputClass('text-right')} mt-1`}
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Pricing rationale / assumptions</span>
                    <textarea
                      value={selectedComponentDetail.notes || ''}
                      onChange={(event) => updateComponent(selectedComponentDetail.id, { notes: event.target.value })}
                      placeholder="Record the basis, e.g. 6 kitchens at £5,000 each, lift allowance, precast stair allowance, exclusions, or assumptions to revisit."
                      className={`${inputClass('min-h-[9rem]')} mt-1`}
                    />
                  </label>
                  {selectedComponentDetailRows.length > 0 && (
                    <div className="rounded-app border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-surface-900">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Indicative allowance breakdown</div>
                          <p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                            Edit sub-items, exclude assumptions, then apply the selected total back to this component.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="rounded-app-sm border border-slate-200 bg-white px-3 py-2 text-right dark:border-slate-700 dark:bg-surface-950">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Selected total</div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{money(selectedComponentDetailTotal)}</div>
                          </div>
                          <button
                            type="button"
                            onClick={addComponentDetailRow}
                            className="workspace-secondary-btn px-3 py-2 text-xs"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add row
                          </button>
                          <button
                            type="button"
                            onClick={applySelectedComponentDetailRows}
                            className="workspace-secondary-btn px-3 py-2 text-xs"
                          >
                            Apply total
                          </button>
                        </div>
                      </div>
                      <div className="max-h-[22rem] overflow-auto">
                        <table className="min-w-[68rem] w-full table-fixed text-left text-xs">
                          <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
                            <tr>
                              <th className="w-[5rem] px-2 py-2 text-center">Exclude</th>
                              <th className="w-[31rem] px-2 py-2">Item / basis</th>
                              <th className="w-[7rem] px-2 py-2 text-right">Qty</th>
                              <th className="w-[8rem] px-2 py-2">Unit</th>
                              <th className="w-[8rem] px-2 py-2 text-right">Rate</th>
                              <th className="w-[9rem] px-2 py-2 text-right">Total</th>
                              <th className="w-[4rem] px-2 py-2 text-right"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-surface-950">
                            {selectedComponentDetailRows.map((row) => {
                              const excluded = row.included === false || selectedComponentExcludedRowIds.includes(row.id);
                              return (
                                <tr key={row.id} title={row.basis} className={excluded ? 'opacity-55' : ''}>
                                  <td className="px-2 py-2 text-center">
                                    <input
                                      type="checkbox"
                                      checked={excluded}
                                      onChange={(event) => toggleComponentDetailRow(selectedComponentDetail.id, row.id, event.target.checked)}
                                      className="h-4 w-4"
                                      aria-label={`Exclude ${row.label}`}
                                    />
                                  </td>
                                  <td className="px-2 py-2">
                                    <input
                                      type="text"
                                      value={row.label}
                                      onChange={(event) => updateComponentDetailRow(row.id, { label: event.target.value })}
                                      className={inputClass('h-8 px-2 py-1 text-xs font-semibold')}
                                      aria-label={`Detail item for ${row.label}`}
                                    />
                                    <input
                                      type="text"
                                      value={row.basis}
                                      onChange={(event) => updateComponentDetailRow(row.id, { basis: event.target.value })}
                                      className={`${inputClass('mt-1 h-8 px-2 py-1 text-[11px]')} text-slate-500 dark:text-slate-300`}
                                      aria-label={`Basis for ${row.label}`}
                                    />
                                  </td>
                                  <td className="px-2 py-2">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={row.quantity || ''}
                                      onChange={(event) => updateComponentDetailRow(row.id, { quantity: numberValue(event.target.value) }, 'FROM_RATE')}
                                      className={inputClass('h-8 min-w-0 px-2 py-1 text-right text-xs tabular-nums')}
                                      aria-label={`Quantity for ${row.label}`}
                                    />
                                  </td>
                                  <td className="px-2 py-2">
                                    <input
                                      type="text"
                                      value={row.unit}
                                      onChange={(event) => updateComponentDetailRow(row.id, { unit: event.target.value })}
                                      className={inputClass('h-8 min-w-0 px-2 py-1 text-xs')}
                                      aria-label={`Unit for ${row.label}`}
                                    />
                                  </td>
                                  <td className="px-2 py-2">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={componentCurrencyValue(row.id, 'rate', row.rate)}
                                      onFocus={() => setComponentCurrencyDraft(row.id, 'rate', row.rate ? row.rate.toFixed(2) : '')}
                                      onChange={(event) => {
                                        setComponentCurrencyDraft(row.id, 'rate', event.target.value);
                                        updateComponentDetailRow(row.id, { rate: currencyInputNumber(event.target.value) }, 'FROM_RATE');
                                      }}
                                      onBlur={(event) => {
                                        const rate = Math.round(currencyInputNumber(event.currentTarget.value) * 100) / 100;
                                        setComponentCurrencyDraft(row.id, 'rate', null);
                                        updateComponentDetailRow(row.id, { rate }, 'FROM_RATE');
                                      }}
                                      className={inputClass('h-8 min-w-0 px-2 py-1 text-right text-xs tabular-nums')}
                                      aria-label={`Rate for ${row.label}`}
                                    />
                                  </td>
                                  <td className="px-2 py-2">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={componentCurrencyValue(row.id, 'total', row.total)}
                                      onFocus={() => setComponentCurrencyDraft(row.id, 'total', row.total ? row.total.toFixed(2) : '')}
                                      onChange={(event) => {
                                        setComponentCurrencyDraft(row.id, 'total', event.target.value);
                                        updateComponentDetailRow(row.id, { total: currencyInputNumber(event.target.value) }, 'FROM_TOTAL');
                                      }}
                                      onBlur={(event) => {
                                        const total = Math.round(currencyInputNumber(event.currentTarget.value) * 100) / 100;
                                        setComponentCurrencyDraft(row.id, 'total', null);
                                        updateComponentDetailRow(row.id, { total }, 'FROM_TOTAL');
                                      }}
                                      className={inputClass('h-8 min-w-0 px-2 py-1 text-right text-xs font-semibold tabular-nums')}
                                      aria-label={`Total for ${row.label}`}
                                    />
                                  </td>
                                  <td className="px-2 py-2 text-right">
                                    <button
                                      type="button"
                                      onClick={() => removeComponentDetailRow(row.id)}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-app-sm border border-slate-200 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-rose-500/40 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                                      aria-label={`Remove ${row.label}`}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Use this detail view to adjust the component allowance or record sub-item assumptions. Excluded rows stay visible but are omitted from the component total.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {mode === 'CUSTOM' && !isGuidedCustom && (
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
          <input
            data-smoke="appraisals-custom-house-save-library"
            type="checkbox"
            checked={draft.saveToLibrary}
            onChange={(event) => updateDraft({ saveToLibrary: event.target.checked })}
            className="h-4 w-4"
          />
          Save this custom house type to the appraisal library
        </label>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button type="submit" data-smoke={`appraisals-${prefix}-house-save`} className="workspace-primary-btn px-4 py-2 text-sm">
          <Plus className="h-4 w-4" />
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function ProgrammeSummaryStage({
  appraisal,
  option,
  updateAppraisal,
  updateOption,
}: {
  appraisal: DevelopmentAppraisal;
  option: DevelopmentAppraisalOption;
  updateAppraisal: (appraisalId: string, recipe: (appraisal: DevelopmentAppraisal) => DevelopmentAppraisal) => void;
  updateOption: (optionId: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const { showToast } = useToast();
  const [loadingIndex, setLoadingIndex] = React.useState<'APPRAISAL' | 'START' | null>(null);
  const programme = option.programme || {};
  const programmeSummary = calculateHouseBuildingProgrammeSummary(option, appraisal.appraisalDate);
  const houseSummary = summariseHouseBuildingOption(option);

  const updateProgramme = (patch: NonNullable<DevelopmentAppraisalOption['programme']>) => {
    updateOption(option.id, (current) => ({
      ...current,
      programme: {
        ...(current.programme || {}),
        ...patch,
      },
    }));
  };

  const requestPriceIndex = async (target: 'APPRAISAL' | 'START') => {
    const date = target === 'APPRAISAL' ? appraisal.appraisalDate : programme.expectedStartDate;
    if (!date) {
      showToast({ type: 'info', message: target === 'APPRAISAL' ? 'Enter an appraisal date before asking AI for an index.' : 'Enter an expected start date before asking AI for an index.' });
      return;
    }

    setLoadingIndex(target);
    try {
      const { getConstructionPriceIndex } = await import('../../services/geminiService');
      const result = await getConstructionPriceIndex(date);
      if (result.ok) {
        if (result.data.index == null) {
          showToast({ type: 'info', message: result.data.rationale || 'AI could not find a reliable index value.' });
          return;
        }
        updateProgramme(target === 'APPRAISAL'
          ? { appraisalPriceIndex: result.data.index }
          : { startPriceIndex: result.data.index });
        showToast({ type: 'success', message: `AI index set to ${result.data.index}. ${result.data.rationale}`, duration: 6000 });
        return;
      }
      showToast({ type: 'error', message: 'error' in result ? result.error : 'AI price index lookup failed.' });
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'AI price index lookup failed.' });
    } finally {
      setLoadingIndex(null);
    }
  };

  return (
    <div data-smoke="appraisals-programme-summary" className="space-y-4">
      {(option.houseTypeSchedule || []).length === 0 && (
        <StageNotice>Add house types first so the programme can pull through the private, affordable, and total unit counts.</StageNotice>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="Total units" value={programmeSummary.totalUnits.toLocaleString()} />
        <MetricTile label="Private units" value={programmeSummary.privateUnits.toLocaleString()} />
        <MetricTile label="Affordable units" value={programmeSummary.affordableUnits.toLocaleString()} />
        <MetricTile label="Build period" value={`${programmeSummary.buildPeriodMonths} months`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
        <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Programme inputs</div>
            <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">Dates, indices, sales speed</h3>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Appraisal date</span>
              <input
                type="date"
                value={appraisal.appraisalDate || ''}
                onChange={(event) => updateAppraisal(appraisal.id, (current) => ({ ...current, appraisalDate: event.target.value }))}
                className={`${inputClass()} mt-1`}
              />
            </label>

            <label>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Appraisal price index</span>
              <span className="mt-1 flex gap-2">
                <input
                  type="number"
                  value={programme.appraisalPriceIndex ? String(programme.appraisalPriceIndex) : ''}
                  onChange={(event) => updateProgramme({ appraisalPriceIndex: numberValue(event.target.value) })}
                  className={inputClass('text-right')}
                />
                <button type="button" onClick={() => { void requestPriceIndex('APPRAISAL'); }} disabled={loadingIndex !== null} className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-60">
                  <Sparkles className="h-4 w-4" />
                  AI
                </button>
              </span>
            </label>

            <label>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Expected start date</span>
              <input
                type="date"
                value={programme.expectedStartDate || ''}
                onChange={(event) => updateProgramme({ expectedStartDate: event.target.value })}
                className={`${inputClass()} mt-1`}
              />
            </label>

            <label>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Start price index</span>
              <span className="mt-1 flex gap-2">
                <input
                  type="number"
                  value={programme.startPriceIndex ? String(programme.startPriceIndex) : ''}
                  onChange={(event) => updateProgramme({ startPriceIndex: numberValue(event.target.value) })}
                  className={inputClass('text-right')}
                />
                <button type="button" onClick={() => { void requestPriceIndex('START'); }} disabled={loadingIndex !== null} className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-60">
                  <Sparkles className="h-4 w-4" />
                  AI
                </button>
              </span>
            </label>

            <NumberField
              label="Lead-in months"
              value={programme.leadInMonths || 0}
              blankZero
              onChange={(value) => updateProgramme({ leadInMonths: Math.max(0, Math.round(value)) })}
            />
            <NumberField
              label="Sale speed units/month"
              value={programme.saleRateUnitsPerMonth || 0}
              blankZero
              onChange={(value) => updateProgramme({ saleRateUnitsPerMonth: value })}
            />
          </div>
        </section>

        <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Calculated programme</div>
            <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">Period and indexed cost</h3>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MetricTile label="Lead-in" value={`${programmeSummary.leadInMonths} months`} />
            <MetricTile label="Sales period" value={`${programmeSummary.salePeriodMonths} months`} tone={programmeSummary.saleRateUnitsPerMonth > 0 ? 'default' : 'watch'} />
            <MetricTile label="Programme period" value={`${programmeSummary.programmeMonths} months`} tone={programmeSummary.programmeMonths > 0 ? 'good' : 'watch'} />
            <MetricTile label="Expected end date" value={programmeSummary.expectedEndDate || '-'} />
            <MetricTile label="Base construction" value={money(houseSummary.baseHouseConstructionCost)} />
            <MetricTile label="Indexed construction" value={money(houseSummary.houseConstructionCost)} tone={houseSummary.houseConstructionIndexCost > 0 ? 'watch' : 'default'} />
            <MetricTile label="Index range" value={`${formatQuantity(programmeSummary.appraisalPriceIndex)} to ${formatQuantity(programmeSummary.startPriceIndex)}`} />
            <MetricTile label="Contingency" value={money(houseSummary.constructionContingency)} tone={houseSummary.constructionContingency > 0 ? 'watch' : 'default'} />
          </div>
          <div className="mt-4 rounded-app border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-surface-950 dark:text-slate-400">
            Finance duration now follows the calculated programme period automatically when programme or house type inputs change.
          </div>
        </section>
      </div>
    </div>
  );
}

function BaseMeasuresStage({ option, updateOption }: {
  option: DevelopmentAppraisalOption;
  updateOption: (id: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const drivers = new Set([...INFRASTRUCTURE_STAGE_COST_DRIVERS, ...PLOT_WORKS_STAGE_COST_DRIVERS]);
  const measures = (option.siteDimensions || []).filter(row => row.isCostDriverInput && row.costDriver && drivers.has(row.costDriver) && !['PLANTING_M2','GARDEN_WALLS_M','UNITS_WITH_DRIVES','UNITS_WITHOUT_DRIVES'].includes(row.costDriver));
  const update = (id: string, patch: Partial<AppraisalSiteDimensionRow>) => updateOption(option.id, current => ({ ...current, siteDimensions: updateLine(current.siteDimensions || [], id, patch) }));
  return <section data-smoke="appraisals-base-measures" className="space-y-4">
    <h2 className="text-lg font-semibold">Base measures for infrastructure and plot works</h2>
    <p className="text-sm text-slate-500">Enter each shared measurement once. Infrastructure and Plot works use these values automatically. Site area is the gross measured site area in m²; enter the full site area once, including roads and footpaths, rather than adding them again to the earthworks area. Units come from the house type schedule.</p>
    {(['INFRASTRUCTURE', 'PLOT_WORKS'] as const).map(section => {
      const sectionMeasures = measures.filter(row => section === 'INFRASTRUCTURE'
        ? INFRASTRUCTURE_STAGE_COST_DRIVERS.has(row.costDriver!)
        : PLOT_WORKS_STAGE_COST_DRIVERS.has(row.costDriver!) && !INFRASTRUCTURE_STAGE_COST_DRIVERS.has(row.costDriver!));
      return <section key={section} data-smoke={`appraisals-base-measures-${section === 'INFRASTRUCTURE' ? 'infrastructure' : 'plot-works'}`} className="rounded-app border border-slate-200 p-4 dark:border-slate-800">
      <h3 className="mb-3 font-semibold">{section === 'INFRASTRUCTURE' ? 'Infrastructure measures' : 'Plot works measures'}</h3>
      <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr><th>Measure</th><th>Unit</th><th>Quantity</th><th>Measurement notes</th></tr></thead><tbody>
      {sectionMeasures.map(row => <tr key={row.id} className="border-t"><td className="py-3">{APPRAISAL_INFRASTRUCTURE_COST_DRIVER_LABELS[row.costDriver!]}</td><td>{row.unit}</td><td><DeferredNumberInput value={row.quantity || 0} blankZero onCommit={value => update(row.id, {quantity: row.costDriver === 'EXISTING_ROAD_JUNCTIONS' ? Math.max(0,Math.floor(value)) : value})} ariaLabel={`${APPRAISAL_INFRASTRUCTURE_COST_DRIVER_LABELS[row.costDriver!]} measure`} className={inputClass('text-right')} /></td><td><DeferredTextInput value={row.notes || ''} onCommit={notes => update(row.id, {notes})} className={inputClass()} /></td></tr>)}
    </tbody></table></div>
      </section>;
    })}
  </section>;
}

function SiteMetricsStage({
  section,
  option,
  rateItems,
  onAddSiteMetricRow,
  onAddSiteMetricFromRate,
  onOpenAppraisalLibraries,
  updateOption,
}: {
  section: SiteMetricsSection;
  option: DevelopmentAppraisalOption;
  rateItems: AppraisalRateLibraryItem[];
  onAddSiteMetricRow: (section: SiteMetricsSection) => void;
  onAddSiteMetricFromRate: (rateItem: AppraisalRateLibraryItem, section: SiteMetricsSection) => void;
  onOpenAppraisalLibraries: () => void;
  updateOption: (optionId: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const { showToast } = useToast();
  const [isLibraryRefreshOpen, setIsLibraryRefreshOpen] = React.useState(false);
  const [treatRefreshedRatesAsCurrent, setTreatRefreshedRatesAsCurrent] = React.useState(false);
  const rows = option.siteDimensions || [];
  const isPlotWorks = section === 'PLOT_WORKS';
  const isPrelims = section === 'PRELIMS';
  const sectionPrefix = siteMetricsSectionPrefix(section);
  const sectionLabel = isPrelims ? 'Prelims' : isPlotWorks ? 'Plot works' : 'Infrastructure';
  const sectionSmokeId = isPrelims ? 'appraisals-prelims' : isPlotWorks ? 'appraisals-plot-works' : 'appraisals-infrastructure';
  const showDriverMeasures = false;
  const sectionRateItems = rateItems.filter((item) => isRateItemForSiteMetricSection(item, section));
  const sectionRateItemsById = React.useMemo(
    () => new Map(sectionRateItems.map((item) => [item.id, item])),
    [sectionRateItems],
  );
  const sectionDriverSet = new Set<AppraisalInfrastructureCostDriver>(
    siteMetricsDriverSet(section)
  );
  sectionRateItems.forEach((item) => {
    if (item.costDriver) sectionDriverSet.add(item.costDriver);
  });
  const driverRows = rows.filter((row) => row.isCostDriverInput && row.costDriver && sectionDriverSet.has(row.costDriver));
  const siteAreaOrder = ['awd-infrastructure-topsoil-strip-stockpile', 'awd-infrastructure-cut-and-fill', 'awd-infrastructure-clear-site-vegetation'];
  const infrastructureRows = rows.filter((row) => !row.isCostDriverInput && isSiteMetricRowForSection(row, section, sectionPrefix)).sort((a,b) => {
    if (section !== 'INFRASTRUCTURE') return 0;
    const rank = (row: AppraisalSiteDimensionRow) => { const index = siteAreaOrder.indexOf(row.libraryRateId || ''); return index < 0 ? siteAreaOrder.length : index; };
    return rank(a) - rank(b);
  });
  const linkedLibraryRows = infrastructureRows.filter((row) => row.libraryRateId && sectionRateItemsById.has(row.libraryRateId));
  const missingLibraryRateItems = sectionRateItems.filter(
    (rateItem) => !infrastructureRows.some((row) => row.libraryRateId === rateItem.id),
  );
  const costDriverOptions = APPRAISAL_INFRASTRUCTURE_COST_DRIVER_OPTIONS.filter(({ value }) => sectionDriverSet.has(value));
  const totalUnits = (option.houseTypeSchedule || []).reduce((total, row) => total + calculateHouseTypeSalesQuantity(row), 0);
  const appraisalPriceIndex = Math.max(0, Number(option.programme?.appraisalPriceIndex) || 0);
  const startPriceIndex = Math.max(0, Number(option.programme?.startPriceIndex) || 0);
  const updateSiteRow = (rowId: string, patch: Partial<AppraisalSiteDimensionRow>) => {
    updateOption(option.id, (current) => ({
      ...current,
      siteDimensions: updateLine(current.siteDimensions || [], rowId, patch),
    }));
  };
  const handleInfrastructureRowCostDriverChange = (rowId: string, costDriver: AppraisalInfrastructureCostDriver | '') => {
    updateSiteRow(rowId, costDriver
      ? {
          costDriver,
          category: infrastructureCostDriverToCategory(costDriver),
          unit: getInfrastructureCostDriverUnit(costDriver),
          quantity: costDriver === 'FIXED_SUM' ? 1 : 0,
        }
      : { costDriver: undefined }
    );
  };
  const refreshLinkedRowsFromLibrary = () => {
    let refreshed = 0;
    updateOption(option.id, (current) => ({
      ...current,
      siteDimensions: (current.siteDimensions || []).map((row) => {
        if (row.isCostDriverInput || !isSiteMetricRowForSection(row, section, sectionPrefix) || !row.libraryRateId) return row;
        const libraryRate = sectionRateItemsById.get(row.libraryRateId);
        if (!libraryRate) return row;
        refreshed += 1;
        const librarySnapshot = createSiteDimensionRowFromRate(libraryRate);
        return {
          ...row,
          category: librarySnapshot.category,
          costDriver: librarySnapshot.costDriver,
          label: librarySnapshot.label,
          unit: librarySnapshot.unit,
          rate: librarySnapshot.rate,
          priceIndex: treatRefreshedRatesAsCurrent && appraisalPriceIndex > 0
            ? appraisalPriceIndex
            : librarySnapshot.priceIndex,
          sourceFormula: librarySnapshot.sourceFormula,
          sourceRow: librarySnapshot.sourceRow,
        };
      }),
    }));
    setIsLibraryRefreshOpen(false);
    showToast({
      type: 'success',
      message: `${refreshed} linked ${sectionLabel.toLowerCase()} ${refreshed === 1 ? 'rate' : 'rates'} refreshed from the library. Measures and appraisal notes were retained.${treatRefreshedRatesAsCurrent && appraisalPriceIndex > 0 ? ` Refreshed rates are now based at index ${appraisalPriceIndex}.` : ''}`,
    });
  };
  const addAllLibraryRates = () => {
    if (missingLibraryRateItems.length === 0) return;
    const rateIdsToAdd = new Set(missingLibraryRateItems.map((rateItem) => rateItem.id));
    updateOption(option.id, (current) => {
      const currentRows = current.siteDimensions || [];
      const existingRateIds = new Set(
        currentRows
          .filter((row) => isSiteMetricRowForSection(row, section, sectionPrefix))
          .map((row) => row.libraryRateId)
          .filter((id): id is string => Boolean(id)),
      );
      const ratesToAdd = sectionRateItems.filter(
        (rateItem) => rateIdsToAdd.has(rateItem.id) && !existingRateIds.has(rateItem.id),
      );
      return {
        ...current,
        siteDimensions: [
          ...currentRows,
          ...ratesToAdd.map((rateItem) =>
            createSiteDimensionRowFromRate(rateItem, {
              sourceRow: rateItem.sourceRow || `${section}_LIBRARY`,
            }),
          ),
        ],
      };
    });
    showToast({
      type: "success",
      message: `${missingLibraryRateItems.length} ${sectionLabel.toLowerCase()} ${missingLibraryRateItems.length === 1 ? "rate was" : "rates were"} added from the appraisal rate library.`,
    });
  };

  if (section === 'INFRASTRUCTURE' || section === 'PLOT_WORKS' || section === 'PRELIMS') {
    const statutoryFees = isPrelims ? calculateScottishStatutoryFees2026(option) : null;
    const prelimHeadings:Record<string,string>={DESIGN_COSTS:'Design and professional fees',STATUTORY_FEES:'Statutory fees and approvals',REPORTS:'Surveys and reports',STAFFING:'Site management and staffing',SITE_ACCOMMODATION:'Site accommodation and welfare',SITE_PRELIMS:'Site operations and temporary facilities',SITE_SECURITY:'Security and access control',LEGAL:'Legal fees',SALES:'Sales and marketing'};
    const billSections=isPrelims?[...AWD_PRELIMS_RATE_SECTIONS.map(group=>prelimHeadings[group.id]),'Sundry']:section==='PLOT_WORKS'?PLOT_WORKS_BILL_SECTIONS:INFRASTRUCTURE_BILL_SECTIONS;
    const billSection=(row:AppraisalSiteDimensionRow)=>isPrelims?prelimHeadings[prelimSectionForRow(row)?.id || ''] || 'Sundry':section==='PLOT_WORKS'?plotWorksBillSection(row):infrastructureBillSection(row);
    const prelimOrder=(row:AppraisalSiteDimensionRow)=>{const index=AWD_PRELIMS_RATE_DEFINITIONS.findIndex(spec=>spec.id===row.libraryRateId);return index<0?Number.MAX_SAFE_INTEGER:index;};
    const serviceOrder=(row:AppraisalSiteDimensionRow)=>{const index=SERVICES_LIGHTING_ALLOWANCES.findIndex(spec=>spec.id===row.libraryRateId);return index<0?Number.MAX_SAFE_INTEGER:index;};
    const billPrefix=isPrelims?'PRE':section==='PLOT_WORKS'?'PLT':'INF';
    const billTotals = (billRows: AppraisalSiteDimensionRow[]) => billRows.reduce((total, row) => {
      const cost = indexedCostParts(calculateSiteDimensionTotal(row, option), siteDimensionEffectivePriceIndex(row, option), option);
      return { base: total.base + (isPrelims ? calculateSiteDimensionBaseTotal(row, option) : cost.baseCost), adjustment: total.adjustment + calculateSiteDimensionManualAdjustment(row, option), uplift: total.uplift + cost.indexCost, amount: total.amount + cost.total };
    }, {base: 0, adjustment: 0, uplift: 0, amount: 0});
    const totals = billTotals(infrastructureRows);
    return <section data-smoke={sectionSmokeId} className="space-y-3">
      <p className="text-sm text-slate-500">Fixed {sectionLabel.toLowerCase()} bill. {isPrelims?'Monthly quantities follow the site programme. Staffing and forklifts show months multiplied by the selected number; forklift hire and drivers exclude lead-in. Sales cabins, assistants and sundries start after lead-in plus four showhouse months.':'Quantities update from Base measures.'} Descriptions, measurement bases, units and rates are read-only here.</p>
      {isPrelims && <p className="text-sm text-slate-500">Manual adjustments are £ additions or deductions to the calculated allowance. Deductions are limited to the item's base cost. Construction-index uplift applies to indexed items; 2026 statutory fees are not indexed.</p>}
      <div className="overflow-x-auto rounded-app border border-slate-200 dark:border-slate-800">
        <table data-smoke={isPrelims?'appraisals-prelims-fixed-bill':section==='PLOT_WORKS'?'appraisals-plot-works-fixed-bill':'appraisals-infrastructure-fixed-bill'} className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-slate-100 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-surface-800"><tr>
            <th className="px-3 py-3">Ref</th><th className="px-3 py-3 min-w-[320px]">Description</th><th className="px-3 py-3">Unit</th><th className="px-3 py-3 text-right">Quantity</th><th className="px-3 py-3 text-right">Rate</th><th className="px-3 py-3 text-right">Base index</th><th className="px-3 py-3 text-right">Base cost</th>{isPrelims && <th className="px-3 py-3 text-right">Manual adjustment (£)</th>}<th className="px-3 py-3 text-right">Index uplift</th><th className="px-3 py-3 text-right">Amount</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">{billSections.map((sectionName, sectionIndex) => <React.Fragment key={sectionName}>
          {!(section === 'INFRASTRUCTURE' && sectionName === 'Sundry') && <tr className="bg-emerald-700 text-white dark:bg-emerald-800"><th colSpan={isPrelims ? 10 : 9} className="px-3 py-3 font-semibold">{sectionName}</th></tr>}
          {sectionName === 'Roads and paths' && <tr><td colSpan={isPrelims ? 10 : 9} className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">{ROADS_PATHS_COMMENT}</td></tr>}
          {sectionName === 'Landscaping' && <tr><td colSpan={isPrelims ? 10 : 9} className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">{LANDSCAPING_COMMENT}</td></tr>}
          {sectionName === 'Services' && <tr><td colSpan={isPrelims ? 10 : 9} className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">{SERVICES_COMMENT}</td></tr>}
          {sectionName === 'Drainage' && <tr><td colSpan={isPrelims ? 10 : 9} className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">{DRAINAGE_COMMENT}</td></tr>}
          {sectionName === 'Site Enabling Works' && <tr><td colSpan={isPrelims ? 10 : 9} className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">{SITE_ENABLING_WORKS_COMMENT}</td></tr>}
          {infrastructureRows.filter(row => billSection(row) === sectionName).sort((a,b) => isPrelims ? prelimOrder(a)-prelimOrder(b) : sectionName === 'Roads and paths' ? ROADS_PATHS_ALLOWANCES.findIndex(spec=>spec.id===a.libraryRateId)-ROADS_PATHS_ALLOWANCES.findIndex(spec=>spec.id===b.libraryRateId) : sectionName === 'Services' || sectionName === 'Street Lighting' ? serviceOrder(a)-serviceOrder(b) : sectionName === 'Landscaping' || sectionName === 'Fencing' ? LANDSCAPING_FENCING_COMPOUND_ALLOWANCES.findIndex(spec=>spec.id===a.libraryRateId)-LANDSCAPING_FENCING_COMPOUND_ALLOWANCES.findIndex(spec=>spec.id===b.libraryRateId) : 0).map((row,index) => {
            const costs = indexedCostParts(calculateSiteDimensionTotal(row, option), siteDimensionEffectivePriceIndex(row, option), option);
            const powerLine = isPrelims ? temporaryPowerLinePresentation(row, option) ?? siteAccommodationLinePresentation(row, option) ?? fuelLinePresentation(row, option) ?? siloGeneratorLinePresentation(row, option) ?? safetyPlantLinePresentation(row, option) ?? miniSkipsLinePresentation(row, option) ?? skipWasteLinePresentation(row, option) ?? plotHeatingLinePresentation(row, option) ?? herasFencingLinePresentation(row, option) ?? salesPrelimsLinePresentation(row, option) ?? salesMarketingLinePresentation(row, option) : null;
            return <tr key={row.id} data-bill-source={row.id} className="align-top even:bg-slate-50 dark:even:bg-surface-950">
              <td className="px-3 py-3 whitespace-nowrap text-slate-500">{`${billPrefix}-${String(sectionIndex+1).padStart(2,'0')}.${String(index+1).padStart(3,'0')}`}</td>
              <td className="px-3 py-3"><div className="font-medium">{powerLine?.label ?? (isPrelims && row.costDriver === 'ENGINEERS_FEES_FORMULA' ? (option.engineeringScope?.confirmedAt ? 'Engineer’s Scope fee' : option.frozenMetrics ? 'Engineers Fees — frozen allowance' : 'Engineer scope fee — pending') : row.label || APPRAISAL_SITE_DIMENSION_LABELS[row.category])}</div><div className="mt-1 text-xs text-slate-500">{powerLine?.notes ?? (row.libraryRateId === INFRASTRUCTURE_PRELIMS_ID ? '4% of the other infrastructure sections; excludes these preliminaries, plot works and abnormals' : isPrelims ? (row.libraryRateId?.startsWith(PRELIMS_SURVEY_RATE_PREFIX) ? row.notes : row.costDriver === 'PLANNING_FEES_FORMULA' ? `Scottish 2026 ${statutoryFees!.planningApplication === 'FULL_NEW_DWELLINGS' ? 'full new-dwellings application' : statutoryFees!.planningApplication === 'PPP_NEW_DWELLINGS' ? 'permission in principle' : 'manual planning assessment'}; ${statutoryFees!.dwellings} dwellings; fee £${statutoryFees!.planningFee.toFixed(2)}.` : row.costDriver === 'BUILDING_WARRANT_FORMULA' ? `Scottish 2026 one site-wide warrant; value of works £${statutoryFees!.warrant.valueOfWorks.toFixed(2)}; gross fee £${statutoryFees!.warrant.grossFee.toFixed(2)}; certification discount £${statutoryFees!.warrant.discount.toFixed(2)}.` : row.libraryRateId?.startsWith('awd-prelims-scottish-water-') ? AWD_PRELIMS_RATE_DEFINITIONS.find(spec=>spec.id===row.libraryRateId)?.formula : row.costDriver === 'RCC_FEES_FORMULA' ? rccFeeReview(option).detail : row.costDriver === 'ENGINEERS_FEES_FORMULA' && option.engineeringScope?.confirmedAt ? `Confirmed Engineer’s Scope: £${engineeringScopeReview(option).normal.toFixed(2)} replaces the former fee formula in Prelims. The topographical survey and optional abnormal designs are costed in their own sections.` : row.costDriver === 'ENGINEERS_FEES_FORMULA' ? (option.frozenMetrics ? 'Frozen revision retains its original engineer fee allowance.' : '£0 until the engineer scope is confirmed and applied.') : row.notes) || AWD_PRELIMS_RATE_DEFINITIONS.find(spec=>spec.id===row.libraryRateId)?.basis || (row.costDriver ? APPRAISAL_INFRASTRUCTURE_COST_DRIVER_LABELS[row.costDriver] : 'Saved measured quantity') : row.costDriver ? APPRAISAL_INFRASTRUCTURE_COST_DRIVER_LABELS[row.costDriver] : 'Saved measured quantity')}</div></td>
              <td className="px-3 py-3">{powerLine?.unit ?? (row.unit === 'm2' ? 'm²' : row.unit)}</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatQuantity(powerLine?.quantity ?? resolveSiteDimensionQuantity(row,option))}</td>
              <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">{powerLine ? moneyWithDecimals(powerLine.rate, 2) : isInfrastructureRatePending(row) ? '' : row.libraryRateId === INFRASTRUCTURE_PRELIMS_ID ? '4%' : isPrelims && row.libraryRateId?.startsWith(PRELIMS_SURVEY_RATE_PREFIX) ? 'Schedule' : isPrelims && row.unit !== 'month' && (row.costDriver?.endsWith('_FORMULA') || row.libraryRateId?.startsWith('awd-prelims-scottish-water-')) ? 'Formula' : isPrelims && row.costDriver==='TOTAL_GDV' && row.rate > 0 && row.rate < 1 ? `${formatQuantity(row.rate*100)}%` : moneyWithDecimals(row.rate,2)}</td>
              <td className="px-3 py-3 text-right tabular-nums">{siteDimensionEffectivePriceIndex(row, option) ? formatQuantity(siteDimensionEffectivePriceIndex(row, option)) : '—'}</td>
              <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">{isInfrastructureRatePending(row) ? 'To be assessed' : money(isPrelims ? calculateSiteDimensionBaseTotal(row, option) : costs.baseCost)}</td>
              {isPrelims && <td className="px-3 py-3"><DeferredNumberInput value={calculateSiteDimensionManualAdjustment(row, option)} minimum={row.libraryRateId === `${PRELIMS_SURVEY_RATE_PREFIX}carried-adjustment` ? undefined : -calculateSiteDimensionBaseTotal(row, option)} disabled={row.libraryRateId === 'awd-prelims-scottish-water-rebates' || (row.costDriver === 'RCC_FEES_FORMULA' && option.rccFees?.authority === 'NOT_REQUIRED')} onCommit={(value) => updateSiteRow(row.id, {manualAdjustment: value})} blankZero placeholder="0.00" ariaLabel={`Manual adjustment (£) for ${row.label}`} dataSmoke="appraisals-prelims-manual-adjustment" signedCurrency className={`${inputClass('w-32 text-right tabular-nums')} ml-auto`} /></td>}
              <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">{isInfrastructureRatePending(row) ? '—' : money(costs.indexCost)}</td>
              <td className="px-3 py-3 text-right font-semibold tabular-nums whitespace-nowrap">{isInfrastructureRatePending(row) ? 'Unpriced' : money(costs.total)}</td>
            </tr>;
          })}
          {!(section === 'INFRASTRUCTURE' && sectionName === 'Sundry') && <tr className="font-semibold"><td colSpan={6} className="px-3 py-2">{sectionName} subtotal</td>{(isPrelims ? ['base','adjustment','uplift','amount'] as const : ['base','uplift','amount'] as const).map(key => <td key={key} className="px-3 py-2 text-right tabular-nums">{money(billTotals(infrastructureRows.filter(row => billSection(row) === sectionName))[key])}</td>)}</tr>}
          </React.Fragment>)}</tbody>
          <tfoot className="border-t-2 border-slate-200 font-semibold dark:border-slate-700"><tr><td colSpan={6} className="px-3 py-3">{sectionLabel} total</td><td className="px-3 py-3 text-right tabular-nums">{money(totals.base)}</td>{isPrelims && <td className="px-3 py-3 text-right tabular-nums">{money(totals.adjustment)}</td>}<td className="px-3 py-3 text-right tabular-nums">{money(totals.uplift)}</td><td className="px-3 py-3 text-right tabular-nums">{money(totals.amount)}</td></tr></tfoot>
        </table>
      </div>
    </section>;
  }
  return (
    <div data-smoke={sectionSmokeId} className="space-y-3">
      {!isPrelims && <p className="text-sm text-slate-500">Quantities are calculated from the shared Base measures tab. Update those measurements there.</p>}
      {infrastructureRows.every((row) => calculateSiteDimensionTotal(row, option) <= 0) && (
        <StageNotice>{sectionLabel} measures are optional at draft stage, but at least one measured allowance is recommended before export.</StageNotice>
      )}
      {showDriverMeasures && (
        <section className="rounded-app border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-surface-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Cost driver measures</div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Quantities used by {sectionLabel.toLowerCase()} rates</h3>
            </div>
            <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
              Total units from house types: {totalUnits}
            </span>
          </div>
          <div className="mt-3 overflow-x-auto rounded-app border border-slate-200 dark:border-slate-800">
            <table className="min-w-[760px] w-full text-left text-xs">
              <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2">Cost driver</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="px-3 py-2 text-right">Measure</th>
                  <th className="px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-surface-900">
                {driverRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-100">
                      {row.costDriver ? APPRAISAL_INFRASTRUCTURE_COST_DRIVER_LABELS[row.costDriver] : row.label}
                    </td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{row.unit}</td>
                    <td className="px-3 py-2">
                      <DeferredNumberInput
                        value={row.quantity || 0}
                        blankZero
                        placeholder="-"
                        onCommit={(value) => updateSiteRow(row.id, { quantity: value })}
                        ariaLabel={`${row.costDriver ? APPRAISAL_INFRASTRUCTURE_COST_DRIVER_LABELS[row.costDriver] : row.label} measure`}
                        className={inputClass('text-right')}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <DeferredTextInput value={row.notes || ''} onCommit={(value) => updateSiteRow(row.id, { notes: value })} tabIndex={-1} className={inputClass()} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          data-smoke={isPrelims ? 'appraisals-prelims-refresh-library' : isPlotWorks ? 'appraisals-plot-works-refresh-library' : 'appraisals-infrastructure-refresh-library'}
          onClick={() => {
            setTreatRefreshedRatesAsCurrent(false);
            setIsLibraryRefreshOpen(true);
          }}
          disabled={linkedLibraryRows.length === 0}
          className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-60"
        >
          <RotateCcw className="h-4 w-4" />
          Update from library
        </button>
        <button
          type="button"
          data-smoke={isPrelims ? "appraisals-prelims-rate-add-all" : isPlotWorks ? "appraisals-plot-works-rate-add-all" : "appraisals-infrastructure-rate-add-all"}
          onClick={addAllLibraryRates}
          disabled={missingLibraryRateItems.length === 0}
          className="workspace-secondary-btn px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
          title="Adds every eligible rate from the appraisal rate library that is not already in this section."
        >
          <Plus className="h-4 w-4" />
          Add all library rates{missingLibraryRateItems.length > 0 ? ` (${missingLibraryRateItems.length})` : ""}
        </button>
        <select
          data-smoke={isPrelims ? 'appraisals-prelims-rate-add' : isPlotWorks ? 'appraisals-plot-works-rate-add' : 'appraisals-infrastructure-rate-add'}
          defaultValue=""
          disabled={sectionRateItems.length === 0}
          onChange={(event) => {
            const rateItem = sectionRateItems.find((entry) => entry.id === event.target.value);
            if (rateItem) onAddSiteMetricFromRate(rateItem, section);
            event.currentTarget.value = '';
          }}
          className="workspace-input w-auto min-w-[15rem] px-3 py-2 text-xs disabled:opacity-60"
          aria-label={`Add ${sectionLabel.toLowerCase()} rate from appraisal rate library`}
        >
          <option value="">{sectionRateItems.length > 0 ? `Add ${sectionLabel.toLowerCase()} rate from library...` : `No ${sectionLabel.toLowerCase()} rates saved`}</option>
          {sectionRateItems.map((rateItem, index) => (
            <option key={rateItem.id} value={rateItem.id}>
              {libraryIndex(isPrelims ? 'PRE' : isPlotWorks ? 'PW' : 'INF', index)} | {rateItem.label} - {money(rateItem.rate)}/{rateItem.unit} | {rateItem.costDriver ? APPRAISAL_INFRASTRUCTURE_COST_DRIVER_LABELS[rateItem.costDriver] : 'Manual quantity'}
            </option>
          ))}
        </select>
        {sectionRateItems.length === 0 && (
          <button type="button" onClick={onOpenAppraisalLibraries} className="workspace-secondary-btn px-3 py-2 text-xs">
            <BookOpen className="h-4 w-4" />
            Appraisal libraries
          </button>
        )}
        <button type="button" onClick={() => onAddSiteMetricRow(section)} className="workspace-secondary-btn px-3 py-2 text-xs">
          <Plus className="h-4 w-4" />
          Custom {sectionLabel.toLowerCase()} row
        </button>
      </div>
      <div className="overflow-x-auto rounded-app border border-slate-200 dark:border-slate-800">
        <table className="min-w-[1460px] w-full text-left text-xs">
          <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2">Metric</th>
              <th className="px-3 py-2">Cost driver</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2 text-right">Quantity</th>
              <th className="px-3 py-2 text-right">Rate</th>
              <th className="px-3 py-2 text-right">Rate base index</th>
              <th className="px-3 py-2 text-right">Base cost</th>
              <th className="px-3 py-2 text-right">Uplift to appraisal</th>
              <th className="px-3 py-2 text-right">Cost at appraisal</th>
              <th className="px-3 py-2">Notes</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-surface-900">
            {infrastructureRows.map((row) => {
              const resolvedQuantity = resolveSiteDimensionQuantity(row, option);
              const isLinkedQuantity = Boolean(row.costDriver);
              const costs = indexedCostParts(calculateSiteDimensionTotal(row, option), siteDimensionEffectivePriceIndex(row, option), option);
              return (
              <tr key={row.id}>
                <td className="px-3 py-2">
                  <DeferredTextInput value={row.label || APPRAISAL_SITE_DIMENSION_LABELS[row.category]} onCommit={(value) => updateSiteRow(row.id, { label: value })} className={inputClass()} />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={row.costDriver || ''}
                    onChange={(event) => handleInfrastructureRowCostDriverChange(row.id, event.target.value as AppraisalInfrastructureCostDriver | '')}
                    className={inputClass(row.costDriver ? '' : 'text-slate-400 dark:text-slate-500')}
                  >
                    <option value="">Manual quantity</option>
                    {costDriverOptions.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select value={row.unit} onChange={(event) => updateSiteRow(row.id, { unit: event.target.value as AppraisalSiteDimensionRow['unit'] })} className={inputClass()}>
                    <option value="m2">m2</option>
                    <option value="m">m</option>
                    <option value="nr">nr</option>
                    <option value="sum">sum</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <DeferredNumberInput
                    value={isLinkedQuantity ? resolvedQuantity : row.quantity || 0}
                    blankZero
                    placeholder="-"
                    onCommit={(value) => updateSiteRow(row.id, { quantity: value })}
                    disabled={isLinkedQuantity}
                    ariaLabel={`${row.label || APPRAISAL_SITE_DIMENSION_LABELS[row.category]} quantity`}
                    className={`${inputClass('text-right disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-400')}`}
                  />
                </td>
                <td className="px-3 py-2"><DeferredNumberInput dataSmoke={`appraisals-site-rate-${row.category}`} value={row.rate || 0} blankZero onCommit={(value) => updateSiteRow(row.id, { rate: value })} className={inputClass('text-right')} ariaLabel={`${row.label || APPRAISAL_SITE_DIMENSION_LABELS[row.category]} rate`} /></td>
                <td className="px-3 py-2"><DeferredNumberInput value={row.priceIndex || 0} blankZero onCommit={(value) => updateSiteRow(row.id, { priceIndex: value })} className={inputClass('text-right')} ariaLabel={`${row.label || APPRAISAL_SITE_DIMENSION_LABELS[row.category]} base price index`} /></td>
                <td className="px-3 py-2 text-right tabular-nums">{money(costs.baseCost)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{money(costs.indexCost)}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{money(costs.total)}</td>
                <td className="px-3 py-2"><DeferredTextInput value={row.notes || ''} onCommit={(value) => updateSiteRow(row.id, { notes: value })} tabIndex={-1} className={inputClass()} /></td>
                <td className="px-3 py-2 text-right">
                  <button type="button" onClick={() => updateOption(option.id, (current) => ({ ...current, siteDimensions: (current.siteDimensions || []).filter((entry) => entry.id !== row.id) }))} className="rounded-app-sm border border-slate-200 p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:hover:bg-rose-950/30 dark:hover:text-rose-200" aria-label="Delete site metric row">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isLibraryRefreshOpen && (
        <AppraisalSideDrawer
          title={`Update linked ${sectionLabel.toLowerCase()} rates`}
          subtitle="Refresh the appraisal's saved rate snapshots from the current cost library."
          smokeId={`${sectionSmokeId}-refresh-library-drawer`}
          onClose={() => setIsLibraryRefreshOpen(false)}
        >
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <p>
              {linkedLibraryRows.length} linked {sectionLabel.toLowerCase()} {linkedLibraryRows.length === 1 ? 'rate is' : 'rates are'} available to refresh.
              This updates the rate, price index, cost driver, unit, source formula, and library label.
            </p>
            <p>
              Measured quantities and appraisal-specific notes will remain unchanged.
            </p>
            <div className="rounded-app border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-surface-950 dark:text-slate-300">
              <div className="font-semibold text-slate-800 dark:text-slate-100">Two-stage index treatment</div>
              <p className="mt-1">
                The rate base index is first uplifted to the appraisal index{appraisalPriceIndex > 0 ? ` (${appraisalPriceIndex})` : ''}. The separate contingency then covers the movement from the appraisal index to the expected start index{startPriceIndex > 0 ? ` (${startPriceIndex})` : ''}.
              </p>
              <label className="mt-3 flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={treatRefreshedRatesAsCurrent}
                  disabled={appraisalPriceIndex <= 0}
                  onChange={(event) => setTreatRefreshedRatesAsCurrent(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-surface-900"
                />
                <span>
                  <span className="block font-semibold text-slate-800 dark:text-slate-100">The refreshed library rates are priced at the current appraisal index{appraisalPriceIndex > 0 ? ` (${appraisalPriceIndex})` : ''}</span>
                  <span className="mt-0.5 block">Use this only when the revised library rates have already been priced at today’s level. It stamps the refreshed appraisal rows at the appraisal index, so the model applies only the separate start-date contingency.</span>
                </span>
              </label>
              {appraisalPriceIndex <= 0 && <p className="mt-2 text-amber-700 dark:text-amber-200">Set the current appraisal index in Programme before rates can be marked as current-day prices.</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
              <button type="button" onClick={() => setIsLibraryRefreshOpen(false)} className="workspace-secondary-btn px-3 py-2 text-xs">
                Keep appraisal data
              </button>
              <button type="button" onClick={refreshLinkedRowsFromLibrary} className="workspace-primary-btn px-3 py-2 text-xs">
                <RotateCcw className="h-4 w-4" />
                Update {linkedLibraryRows.length} {linkedLibraryRows.length === 1 ? 'row' : 'rows'}
              </button>
            </div>
          </div>
        </AppraisalSideDrawer>
      )}
    </div>
  );
}

function OverallSummaryStage({ option }: { option: DevelopmentAppraisalOption }) {
  const summary = summariseHouseBuildingOption(option);
  const metrics = calculateAppraisalOption(option);
  const sellerMetrics = calculateSellerLandPriceMetrics(option);
  const appraisalPriceIndex = Math.max(0, Number(option.programme?.appraisalPriceIndex) || 0);
  const startPriceIndex = Math.max(0, Number(option.programme?.startPriceIndex) || 0);
  const netDevelopableArea = calculateNetDevelopableArea(option);
  const landCost = calculateLandCostBenchmarks(metrics.landValue, netDevelopableArea.grossSiteAreaM2, option.houseTypeSchedule || []);
  const baseGdv = calculateOptionBaseGdv(option);
  const salesIndexUplift = calculateSalesIndexationUplift(option, baseGdv);
  const headlineLabel = option.calculationMode === 'RESIDUAL_LAND_VALUE' ? 'Land cost' : 'Profit';
  const headlineValue = option.calculationMode === 'RESIDUAL_LAND_VALUE' ? metrics.landValue : metrics.profit;
  return (
    <div data-smoke="appraisals-overall-summary" className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label={headlineLabel} value={money(headlineValue)} tone={metrics.profit >= 0 ? 'good' : 'bad'} />
        <MetricTile label="GDV" value={money(metrics.gdv)} />
        {option.salesIndexationEnabled ? (
          <MetricTile label={salesIndexUpliftLabel(option)} value={money(salesIndexUplift)} tone={salesIndexUplift > 0 ? 'good' : 'default'} />
        ) : null}
        <MetricTile label="Total non-land cost" value={money(metrics.nonLandCost)} />
        <MetricTile label="Profit/GDV" value={`${metrics.profitOnGdvPercent.toFixed(1)}%`} tone={metrics.profitOnGdvPercent >= option.targetProfitOnGdvPercent ? 'good' : 'watch'} />
        <MetricTile label="Land cost" value={money(metrics.landValue)} />
        <MetricTile label="Finance" value={money(metrics.financeCost)} />
        <MetricTile label="Total cost" value={money(metrics.totalCost)} />
        <MetricTile label="Target profit" value={money(metrics.targetProfit)} />
        <MetricTile label={`Private sales incentive (${formatQuantity(option.gdvIncentivePercent || 0)}%)`} value={money(metrics.gdvIncentiveCost)} tone={metrics.gdvIncentiveCost > 0 ? 'watch' : 'default'} />
      </div>
      <section data-smoke="appraisals-land-cost-benchmarks" className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Land cost benchmarks</h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Each rate uses the land cost above. Area rates use the gross site area; floor-area rates use the scheduled gross internal floor area (GIFA). A dash means the measure has not been entered.
        </p>
        <div className="mt-3 overflow-x-auto rounded-app border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
              <tr><th className="px-3 py-2">Land cost basis</th><th className="px-3 py-2 text-right">Measure</th><th className="px-3 py-2 text-right">Land cost rate</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {[
                { label: 'Per gross site acre', measure: landCost.grossAcres > 0 ? `${landCost.grossAcres.toFixed(2)} ac` : '—', rate: landCost.perGrossAcre, decimals: 0, unit: '/ac' },
                { label: 'Per gross site hectare', measure: landCost.grossHectares > 0 ? `${landCost.grossHectares.toFixed(2)} ha` : '—', rate: landCost.perGrossHectare, decimals: 0, unit: '/ha' },
                { label: 'Per private unit', measure: landCost.privateUnits > 0 ? `${formatQuantity(landCost.privateUnits)} units` : '—', rate: landCost.perPrivateUnit, decimals: 0, unit: '/unit' },
                { label: 'Per private + affordable unit', measure: landCost.allUnits > 0 ? `${formatQuantity(landCost.allUnits)} units` : '—', rate: landCost.perAllUnit, decimals: 0, unit: '/unit' },
                { label: 'Per private gross ft²', measure: landCost.privateGifaFt2 > 0 ? `${formatQuantity(landCost.privateGifaFt2)} ft²` : '—', rate: landCost.perPrivateGrossFt2, decimals: 2, unit: '/ft²' },
                { label: 'Per private + affordable gross ft²', measure: landCost.allGifaFt2 > 0 ? `${formatQuantity(landCost.allGifaFt2)} ft²` : '—', rate: landCost.perAllGrossFt2, decimals: 2, unit: '/ft²' },
              ].map((row) => (
                <tr key={row.label}>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{row.label}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">{row.measure}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">{row.rate === null ? '—' : `${moneyWithDecimals(row.rate, row.decimals)}${row.unit}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Site area summary</div>
            <h4 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">Indicative net developable area</h4>
            <p className="mt-1 max-w-3xl text-xs text-slate-500 dark:text-slate-400">
              Calculated from current site metric inputs as gross site area less roads, infrastructure paths, common landscaping, and planting. Private plot drives and gardens are retained in the net area.
            </p>
          </div>
          {netDevelopableArea.grossSiteAreaM2 <= 0 && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
              Add site area to calculate
            </span>
          )}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile label="Gross site area" value={`${formatQuantity(netDevelopableArea.grossSiteAreaM2)} m2`} />
          <MetricTile label="Net developable area" value={`${formatQuantity(netDevelopableArea.netDevelopableAreaM2)} m2`} tone={netDevelopableArea.netDevelopableAreaM2 > 0 ? 'good' : 'watch'} />
          <MetricTile label="Net area acres / ha" value={`${netDevelopableArea.netDevelopableAreaAcres.toFixed(2)} ac / ${netDevelopableArea.netDevelopableAreaHectares.toFixed(2)} ha`} />
          <MetricTile label="Density" value={`${netDevelopableArea.unitsPerNetAcre.toFixed(1)} units/ac`} tone={netDevelopableArea.unitsPerNetAcre > 0 ? 'default' : 'watch'} />
        </div>
        <div className="mt-4 overflow-x-auto rounded-app border border-slate-200 dark:border-slate-800">
          <table className="min-w-[620px] w-full text-left text-xs">
            <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Area item</th>
                <th className="px-3 py-2 text-right">m2</th>
                <th className="px-3 py-2 text-right">% of gross site</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-surface-900">
              {[
                ['Gross site area', netDevelopableArea.grossSiteAreaM2, 100],
                ['Less roads', -netDevelopableArea.roadsM2, netDevelopableArea.grossSiteAreaM2 > 0 ? -(netDevelopableArea.roadsM2 / netDevelopableArea.grossSiteAreaM2) * 100 : 0],
                ['Less paths', -netDevelopableArea.pathsM2, netDevelopableArea.grossSiteAreaM2 > 0 ? -(netDevelopableArea.pathsM2 / netDevelopableArea.grossSiteAreaM2) * 100 : 0],
                ['Less common landscaping', -netDevelopableArea.commonLandscapingM2, netDevelopableArea.grossSiteAreaM2 > 0 ? -(netDevelopableArea.commonLandscapingM2 / netDevelopableArea.grossSiteAreaM2) * 100 : 0],
                ['Less planting', -netDevelopableArea.plantingM2, netDevelopableArea.grossSiteAreaM2 > 0 ? -(netDevelopableArea.plantingM2 / netDevelopableArea.grossSiteAreaM2) * 100 : 0],
                ['Net developable area', netDevelopableArea.netDevelopableAreaM2, netDevelopableArea.netDevelopablePercent],
              ].map(([label, area, percent]) => (
                <tr key={String(label)} className={label === 'Net developable area' ? 'font-semibold text-slate-900 dark:text-slate-100' : ''}>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{label}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${Number(area) < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-700 dark:text-slate-200'}`}>{formatQuantity(Number(area))}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${Number(percent) < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-500 dark:text-slate-400'}`}>{Number(percent).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {sellerMetrics ? (
        <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
          <div className="mb-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Seller land price analysis</div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Profit if land is acquired at the likely lowest seller acceptance figure.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile label="Seller land price" value={money(sellerMetrics.landValue)} />
            <MetricTile label="Profit at seller price" value={money(sellerMetrics.profit)} tone={sellerMetrics.profit >= 0 ? 'good' : 'bad'} />
            <MetricTile label="Profit/GDV at seller price" value={`${sellerMetrics.profitOnGdvPercent.toFixed(1)}%`} tone={sellerMetrics.profitOnGdvPercent >= option.targetProfitOnGdvPercent ? 'good' : 'watch'} />
            <MetricTile label="Target profit variance" value={money(sellerMetrics.profit - sellerMetrics.targetProfit)} tone={sellerMetrics.profit >= sellerMetrics.targetProfit ? 'good' : 'watch'} />
          </div>
        </section>
      ) : null}
      <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile label="Units" value={formatQuantity(summary.totalUnits)} />
          <MetricTile label="Private units" value={formatQuantity(summary.privateUnits)} />
          <MetricTile label="Affordable units" value={formatQuantity(summary.affordableUnits)} />
          <MetricTile label="Total GIFA m2" value={formatQuantity(summary.totalGifa)} />
        </div>
      </section>
    </div>
  );
}

function BaseMeasurementDataStage({
  option,
  updateOption,
}: {
  option: DevelopmentAppraisalOption;
  updateOption: (optionId: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const { showToast } = useToast();
  const files = React.useMemo(
    () => (option.baseMeasurementFiles || []).slice().sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()),
    [option.baseMeasurementFiles]
  );
  const layoutFiles = React.useMemo(
    () => (option.architectFeasibilityLayouts || []).slice().sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()),
    [option.architectFeasibilityLayouts]
  );
  const latestFile = files[0];
  const latestLayout = layoutFiles[0];
  const updateBaseFile = (fileId: string, patch: Partial<AppraisalPricingReport>) => {
    updateOption(option.id, (current) => ({
      ...current,
      baseMeasurementFiles: (current.baseMeasurementFiles || []).map((file) => (
        file.id === fileId ? { ...file, ...patch } : file
      )),
    }));
  };
  const removeBaseFile = (fileId: string) => {
    updateOption(option.id, (current) => ({
      ...current,
      baseMeasurementFiles: (current.baseMeasurementFiles || []).filter((file) => file.id !== fileId),
    }));
  };
  const updateLayoutFile = (fileId: string, patch: Partial<AppraisalPricingReport>) => {
    updateOption(option.id, (current) => ({
      ...current,
      architectFeasibilityLayouts: (current.architectFeasibilityLayouts || []).map((file) => (
        file.id === fileId ? { ...file, ...patch } : file
      )),
    }));
  };
  const removeLayoutFile = (fileId: string) => {
    updateOption(option.id, (current) => ({
      ...current,
      architectFeasibilityLayouts: (current.architectFeasibilityLayouts || []).filter((file) => file.id !== fileId),
    }));
  };
  const handleBaseMeasurementUpload = async (file: File | undefined) => {
    if (!file) return;
    const validExtension = /\.(xlsx|xlsm|xls|csv)$/i.test(file.name);
    if (!validExtension) {
      showToast({ type: 'error', message: 'Please upload an Excel or CSV base measurement file.' });
      return;
    }
    if (file.size > MAX_PRICING_REPORT_BYTES) {
      showToast({ type: 'error', message: 'Base measurement file is too large. Please upload a file under 50 MB.' });
      return;
    }
    try {
      const report = await buildAppraisalPricingReportFromFile(file);
      updateOption(option.id, (current) => ({
        ...current,
        baseMeasurementFiles: [
          {
            ...report,
            notes: '',
          },
          ...(current.baseMeasurementFiles || []),
        ],
      }));
      showToast({ type: 'success', message: `${file.name} saved as base measurement data.` });
    } catch {
      showToast({ type: 'error', message: 'Unable to read base measurement file.' });
    }
  };
  const handleLayoutUpload = async (file: File | undefined) => {
    if (!file) return;
    const validExtension = /\.(pdf|doc|docx|xls|xlsx|xlsm|csv|txt|png|jpg|jpeg|webp|dwg|dxf)$/i.test(file.name);
    if (!validExtension) {
      showToast({ type: 'error', message: 'Please upload a layout file such as PDF, image, CAD, Word, Excel, CSV, or TXT.' });
      return;
    }
    if (file.size > MAX_PRICING_REPORT_BYTES) {
      showToast({ type: 'error', message: 'Architect layout file is too large. Please upload a file under 50 MB.' });
      return;
    }
    try {
      const report = await buildAppraisalPricingReportFromFile(file);
      updateOption(option.id, (current) => ({
        ...current,
        architectFeasibilityLayouts: [
          {
            ...report,
            notes: '',
          },
          ...(current.architectFeasibilityLayouts || []),
        ],
      }));
      showToast({ type: 'success', message: `${file.name} saved as an architect feasibility layout.` });
    } catch {
      showToast({ type: 'error', message: 'Unable to read architect feasibility layout.' });
    }
  };

  return (
    <div data-smoke="appraisals-base-measurement-data" className="space-y-4">
      <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Base measurement data</div>
            <h4 className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">Measurement workbook evidence</h4>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500 dark:text-slate-400">
              Upload the Excel or CSV measurement workbook used to support site areas, infrastructure quantities, plot works, prelims drivers, and other measured appraisal inputs.
            </p>
          </div>
          <label className="workspace-primary-btn cursor-pointer px-3 py-2 text-xs">
            <FileUp className="h-4 w-4" />
            Upload file
            <input
              data-smoke="appraisals-base-measurement-upload"
              type="file"
              className="hidden"
              accept=".xlsx,.xlsm,.xls,.csv"
              onChange={(event) => {
                void handleBaseMeasurementUpload(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MetricTile label="Files" value={formatQuantity(files.length)} />
          <MetricTile label="Latest file" value={latestFile?.fileName || 'Not uploaded'} />
          <MetricTile label="Latest date" value={latestFile ? new Date(latestFile.uploadedAt).toLocaleDateString() : '-'} />
        </div>
      </section>

      {files.length > 0 ? (
        <div className="space-y-3">
          {files.map((file, index) => (
            <section key={file.id} className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                      index === 0
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
                        : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-400'
                    }`}>
                      {index === 0 ? 'Current measurement file' : `Version ${files.length - index}`}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Uploaded {new Date(file.uploadedAt).toLocaleDateString()} at {new Date(file.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className="mt-2 truncate text-sm font-semibold text-slate-950 dark:text-slate-50" title={file.fileName}>
                    {file.fileName}
                  </h4>
                   <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                     {(file.size / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} KB
                     {file.extractionStatus ? ` | ${file.extractionStatus.toLowerCase()}` : ''}
                   </div>
                   <EvidenceStorageStatus report={file} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <EvidenceDownloadButton report={file} className="workspace-secondary-btn px-3 py-2 text-xs">
                    <FileDown className="h-4 w-4" />
                    Download
                  </EvidenceDownloadButton>
                  <button type="button" onClick={() => removeBaseFile(file.id)} className="workspace-secondary-btn px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </div>
              <label className="mt-3 block">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Measurement notes</span>
                <textarea
                  value={file.notes || ''}
                  onChange={(event) => updateBaseFile(file.id, { notes: event.target.value })}
                  tabIndex={-1}
                  placeholder="Record what this measurement file supports, such as site area source, roads and paths take-off, plot works areas, planting, fencing, or prelims drivers."
                  className={`${inputClass('min-h-[4.5rem]')} mt-1`}
                />
              </label>
            </section>
          ))}
        </div>
      ) : (
        <section className="rounded-app border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-400">
          No base measurement data file has been uploaded yet.
        </section>
      )}

      <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Architect feasibility layout</div>
            <h4 className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">Layout and design evidence</h4>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500 dark:text-slate-400">
              Upload the architect's feasibility layout, design sketch, marked-up plan, or layout workbook used to support the unit mix, site capacity, roads, parking, open space, constraints, and measured assumptions.
            </p>
          </div>
          <label className="workspace-primary-btn cursor-pointer px-3 py-2 text-xs">
            <FileUp className="h-4 w-4" />
            Upload layout
            <input
              data-smoke="appraisals-architect-layout-upload"
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.xlsm,.csv,.txt,.png,.jpg,.jpeg,.webp,.dwg,.dxf"
              onChange={(event) => {
                void handleLayoutUpload(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MetricTile label="Layout files" value={formatQuantity(layoutFiles.length)} />
          <MetricTile label="Latest layout" value={latestLayout?.fileName || 'Not uploaded'} />
          <MetricTile label="Latest date" value={latestLayout ? new Date(latestLayout.uploadedAt).toLocaleDateString() : '-'} />
        </div>
      </section>

      {layoutFiles.length > 0 ? (
        <div className="space-y-3">
          {layoutFiles.map((file, index) => (
            <section key={file.id} className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                      index === 0
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
                        : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-400'
                    }`}>
                      {index === 0 ? 'Current layout' : `Version ${layoutFiles.length - index}`}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Uploaded {new Date(file.uploadedAt).toLocaleDateString()} at {new Date(file.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className="mt-2 truncate text-sm font-semibold text-slate-950 dark:text-slate-50" title={file.fileName}>
                    {file.fileName}
                  </h4>
                   <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                     {(file.size / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} KB
                     {file.extractionStatus ? ` | ${file.extractionStatus.toLowerCase()}` : ''}
                   </div>
                   <EvidenceStorageStatus report={file} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <EvidenceDownloadButton report={file} className="workspace-secondary-btn px-3 py-2 text-xs">
                    <FileDown className="h-4 w-4" />
                    Download
                  </EvidenceDownloadButton>
                  <button type="button" onClick={() => removeLayoutFile(file.id)} className="workspace-secondary-btn px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </div>
              <label className="mt-3 block">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Layout notes</span>
                <textarea
                  value={file.notes || ''}
                  onChange={(event) => updateLayoutFile(file.id, { notes: event.target.value })}
                  tabIndex={-1}
                  placeholder="Record key layout assumptions, such as unit count, developable area, parking count, open space, roads, constraints, or design changes to monitor."
                  className={`${inputClass('min-h-[4.5rem]')} mt-1`}
                />
              </label>
            </section>
          ))}
        </div>
      ) : (
        <section className="rounded-app border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-400">
          No architect feasibility layout has been uploaded yet.
        </section>
      )}
    </div>
  );
}

function LandContractStage({
  option,
  updateOption,
}: {
  option: DevelopmentAppraisalOption;
  updateOption: (optionId: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const { showToast } = useToast();
  const contractVersions = React.useMemo(
    () => (option.landContractVersions || []).slice().sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()),
    [option.landContractVersions]
  );
  const latestVersion = contractVersions[0];
  const updateContractVersion = (versionId: string, patch: Partial<AppraisalPricingReport>) => {
    updateOption(option.id, (current) => ({
      ...current,
      landContractVersions: (current.landContractVersions || []).map((version) => (
        version.id === versionId ? { ...version, ...patch } : version
      )),
    }));
  };
  const removeContractVersion = (versionId: string) => {
    updateOption(option.id, (current) => ({
      ...current,
      landContractVersions: (current.landContractVersions || []).filter((version) => version.id !== versionId),
    }));
  };
  const handleContractUpload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_PRICING_REPORT_BYTES) {
      showToast({ type: 'error', message: 'Land contract file is too large. Please upload a file under 50 MB.' });
      return;
    }
    try {
      const report = await buildAppraisalPricingReportFromFile(file);
      updateOption(option.id, (current) => ({
        ...current,
        landContractVersions: [
          {
            ...report,
            notes: '',
          },
          ...(current.landContractVersions || []),
        ],
      }));
      showToast({ type: 'success', message: `${file.name} saved as a land contract version.` });
    } catch {
      showToast({ type: 'error', message: 'Unable to read land contract purchase file.' });
    }
  };

  return (
    <div data-smoke="appraisals-land-contract" className="space-y-4">
      <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Land contract purchase</div>
            <h4 className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">Version-controlled purchase contract evidence</h4>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500 dark:text-slate-400">
              Save the land contract purchase documents used to support the appraisal. Add a new version whenever the contract changes.
            </p>
          </div>
          <label className="workspace-primary-btn cursor-pointer px-3 py-2 text-xs">
            <FileUp className="h-4 w-4" />
            Add version
            <input
              data-smoke="appraisals-land-contract-upload"
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
              onChange={(event) => {
                void handleContractUpload(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MetricTile label="Versions" value={formatQuantity(contractVersions.length)} />
          <MetricTile label="Latest file" value={latestVersion?.fileName || 'Not uploaded'} />
          <MetricTile label="Latest date" value={latestVersion ? new Date(latestVersion.uploadedAt).toLocaleDateString() : '-'} />
        </div>
      </section>

      {contractVersions.length > 0 ? (
        <div className="space-y-3">
          {contractVersions.map((version, index) => (
            <section key={version.id} className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                      index === 0
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
                        : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-400'
                    }`}>
                      {index === 0 ? 'Current version' : `Version ${contractVersions.length - index}`}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Uploaded {new Date(version.uploadedAt).toLocaleDateString()} at {new Date(version.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className="mt-2 truncate text-sm font-semibold text-slate-950 dark:text-slate-50" title={version.fileName}>
                    {version.fileName}
                  </h4>
                   <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                     {(version.size / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} KB
                     {version.extractionStatus ? ` | ${version.extractionStatus.toLowerCase()}` : ''}
                   </div>
                   <EvidenceStorageStatus report={version} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <EvidenceDownloadButton report={version} className="workspace-secondary-btn px-3 py-2 text-xs">
                    <FileDown className="h-4 w-4" />
                    Download
                  </EvidenceDownloadButton>
                  <button type="button" onClick={() => removeContractVersion(version.id)} className="workspace-secondary-btn px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </div>
              <label className="mt-3 block">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Version notes</span>
                <textarea
                  value={version.notes || ''}
                  onChange={(event) => updateContractVersion(version.id, { notes: event.target.value })}
                  tabIndex={-1}
                  placeholder="Record key contract changes, agreed land price movements, conditions, missives status, or solicitor notes."
                  className={`${inputClass('min-h-[4.5rem]')} mt-1`}
                />
              </label>
            </section>
          ))}
        </div>
      ) : (
        <section className="rounded-app border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-400">
          No land contract purchase versions have been uploaded yet.
        </section>
      )}
    </div>
  );
}

function consentStatusTone(status: AppraisalConsentStatus) {
  if (status === 'APPROVED') return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200';
  if (status === 'CONDITIONED' || status === 'SUBMITTED') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200';
  if (status === 'REJECTED') return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200';
  if (status === 'NOT_REQUIRED') return 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-400';
  return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200';
}

function consentStatusLabel(status: AppraisalConsentStatus) {
  return consentStatusOptions.find((option) => option.id === status)?.label || status;
}

function ConsentTrackerStage({
  option,
  updateOption,
}: {
  option: DevelopmentAppraisalOption;
  updateOption: (optionId: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const { showToast } = useToast();
  const rows = option.consentTracker || [];
  const updateConsent = (rowId: string, patch: Partial<AppraisalConsentTrackerEntry>) => {
    updateOption(option.id, (current) => ({
      ...current,
      consentTracker: (current.consentTracker || []).map((row) => (
        row.id === rowId ? { ...row, ...patch, updatedAt: new Date().toISOString() } : row
      )),
    }));
  };
  const addCustomConsent = () => {
    const timestamp = new Date().toISOString();
    updateOption(option.id, (current) => ({
      ...current,
      consentTracker: [
        ...(current.consentTracker || []),
        {
          id: generateId(),
          standardKey: 'CUSTOM',
          title: 'New consent',
          authority: '',
          status: 'NOT_STARTED',
          responsibleParty: '',
          reference: '',
          targetDate: '',
          submittedDate: '',
          approvedDate: '',
          notes: '',
          uploads: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
    }));
  };
  const removeConsent = (rowId: string) => {
    updateOption(option.id, (current) => ({
      ...current,
      consentTracker: (current.consentTracker || []).filter((row) => row.id !== rowId || row.standardKey !== 'CUSTOM'),
    }));
  };
  const uploadConsentFiles = async (rowId: string, files: FileList | null) => {
    const nextFiles = Array.from(files || []);
    if (nextFiles.length === 0) return;
    const oversized = nextFiles.find((file) => file.size > MAX_PRICING_REPORT_BYTES);
    if (oversized) {
      showToast({ type: 'error', message: `${oversized.name} is too large. Please upload files under 50 MB.` });
      return;
    }
    try {
      const reports = await Promise.all(nextFiles.map((file) => buildAppraisalPricingReportFromFile(file)));
      updateOption(option.id, (current) => ({
        ...current,
        consentTracker: (current.consentTracker || []).map((row) => (
          row.id === rowId
            ? { ...row, uploads: [...reports, ...(row.uploads || [])], updatedAt: new Date().toISOString() }
            : row
        )),
      }));
      showToast({ type: 'success', message: `${reports.length} consent upload${reports.length === 1 ? '' : 's'} saved.` });
    } catch {
      showToast({ type: 'error', message: 'Unable to read one of the consent uploads.' });
    }
  };
  const updateConsentUpload = (rowId: string, uploadId: string, patch: Partial<AppraisalPricingReport>) => {
    updateOption(option.id, (current) => ({
      ...current,
      consentTracker: (current.consentTracker || []).map((row) => (
        row.id === rowId
          ? {
              ...row,
              uploads: (row.uploads || []).map((upload) => upload.id === uploadId ? { ...upload, ...patch } : upload),
              updatedAt: new Date().toISOString(),
            }
          : row
      )),
    }));
  };
  const removeConsentUpload = (rowId: string, uploadId: string) => {
    updateOption(option.id, (current) => ({
      ...current,
      consentTracker: (current.consentTracker || []).map((row) => (
        row.id === rowId
          ? { ...row, uploads: (row.uploads || []).filter((upload) => upload.id !== uploadId), updatedAt: new Date().toISOString() }
          : row
      )),
    }));
  };
  const approvedCount = rows.filter((row) => row.status === 'APPROVED' || row.status === 'NOT_REQUIRED').length;
  const submittedCount = rows.filter((row) => row.status === 'SUBMITTED' || row.status === 'CONDITIONED').length;
  const uploadCount = rows.reduce((total, row) => total + (row.uploads || []).length, 0);

  return (
    <div data-smoke="appraisals-consents" className="space-y-4">
      <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Consent tracker</div>
            <h4 className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">Track statutory and utility consents</h4>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500 dark:text-slate-400">
              Standard consent rows are included for Scottish Water sewers, planning, RCC, and building warrants. Add further consent items where the site needs them.
            </p>
          </div>
          <button type="button" onClick={addCustomConsent} className="workspace-primary-btn px-3 py-2 text-xs">
            <Plus className="h-4 w-4" />
            Add consent
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <MetricTile label="Tracked items" value={formatQuantity(rows.length)} />
          <MetricTile label="Approved / not required" value={formatQuantity(approvedCount)} tone={approvedCount === rows.length && rows.length > 0 ? 'good' : 'default'} />
          <MetricTile label="Submitted / conditioned" value={formatQuantity(submittedCount)} tone={submittedCount > 0 ? 'watch' : 'default'} />
          <MetricTile label="Uploads" value={formatQuantity(uploadCount)} />
        </div>
      </section>

      <div className="grid gap-3">
        {rows.map((row) => (
          <section key={row.id} className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${consentStatusTone(row.status)}`}>
                  {consentStatusLabel(row.status)}
                </span>
                <div className="mt-2 grid gap-3 md:grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.65fr)]">
                  <label>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Consent item</span>
                    <input
                      value={row.title}
                      onChange={(event) => updateConsent(row.id, { title: event.target.value })}
                      className={`${inputClass()} mt-1`}
                    />
                  </label>
                  <label>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Authority</span>
                    <input
                      value={row.authority || ''}
                      onChange={(event) => updateConsent(row.id, { authority: event.target.value })}
                      className={`${inputClass()} mt-1`}
                    />
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="workspace-secondary-btn cursor-pointer px-3 py-2 text-xs">
                  <FileUp className="h-4 w-4" />
                  Upload
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
                    onChange={(event) => {
                      void uploadConsentFiles(row.id, event.target.files);
                      event.target.value = '';
                    }}
                  />
                </label>
                {row.standardKey === 'CUSTOM' ? (
                  <button type="button" onClick={() => removeConsent(row.id)} className="workspace-secondary-btn px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <label>
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Status</span>
                <select
                  value={row.status}
                  onChange={(event) => updateConsent(row.id, { status: event.target.value as AppraisalConsentStatus })}
                  className={`${inputClass()} mt-1`}
                >
                  {consentStatusOptions.map((status) => (
                    <option key={status.id} value={status.id}>{status.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Reference</span>
                <input value={row.reference || ''} onChange={(event) => updateConsent(row.id, { reference: event.target.value })} className={`${inputClass()} mt-1`} />
              </label>
              <label>
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Responsible</span>
                <input value={row.responsibleParty || ''} onChange={(event) => updateConsent(row.id, { responsibleParty: event.target.value })} className={`${inputClass()} mt-1`} />
              </label>
              <label>
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Target date</span>
                <input type="date" value={row.targetDate || ''} onChange={(event) => updateConsent(row.id, { targetDate: event.target.value })} className={`${inputClass()} mt-1`} />
              </label>
              <label>
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Submitted</span>
                <input type="date" value={row.submittedDate || ''} onChange={(event) => updateConsent(row.id, { submittedDate: event.target.value })} className={`${inputClass()} mt-1`} />
              </label>
              <label>
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Approved</span>
                <input type="date" value={row.approvedDate || ''} onChange={(event) => updateConsent(row.id, { approvedDate: event.target.value })} className={`${inputClass()} mt-1`} />
              </label>
              <label className="md:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Notes</span>
                <input value={row.notes || ''} onChange={(event) => updateConsent(row.id, { notes: event.target.value })} className={`${inputClass()} mt-1`} />
              </label>
            </div>

            {(row.uploads || []).length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-app border border-slate-200 dark:border-slate-800">
                <div className="bg-slate-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">Uploads</div>
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {(row.uploads || []).map((upload) => (
                    <div key={upload.id} className="grid gap-3 px-3 py-3 md:grid-cols-[minmax(12rem,1fr)_minmax(14rem,1.1fr)_auto] md:items-center">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100" title={upload.fileName}>{upload.fileName}</div>
                         <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                           {(upload.size / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} KB saved {new Date(upload.uploadedAt).toLocaleDateString()}
                         </div>
                         <EvidenceStorageStatus report={upload} />
                      </div>
                      <input
                        value={upload.notes || ''}
                        onChange={(event) => updateConsentUpload(row.id, upload.id, { notes: event.target.value })}
                        placeholder="Upload notes"
                        className={`${inputClass()} w-full`}
                      />
                      <div className="flex justify-end gap-2">
                        <EvidenceDownloadButton report={upload} className="workspace-secondary-btn px-3 py-2 text-xs">
                          <FileDown className="h-4 w-4" />
                          Download
                        </EvidenceDownloadButton>
                        <button type="button" onClick={() => removeConsentUpload(row.id, upload.id)} className="workspace-secondary-btn px-3 py-2 text-xs text-rose-700 dark:text-rose-300" aria-label={`Remove ${upload.fileName}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-app border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No documents uploaded for this consent item yet.
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function SiteCostsOverview({ appraisal, option, projects, linkedProject, updateAppraisal, setStage, updateOption }: React.ComponentProps<typeof AbnormalsStage> & {
  setStage: (stage: HouseStage) => void;
}) {
  const base = buildHouseCostSummary(option);
  return <div data-smoke="appraisals-site-costs-summary" className="space-y-4">
    <h2 className="text-lg font-semibold">Site costs and abnormals</h2>
    <p className="text-sm text-slate-500">Base allowances and additional elements remain separate. Each element counts once under its allocation.</p>
    <div className="flex gap-2"><button type="button" className="workspace-primary-btn px-3 py-2" onClick={() => setStage('SITE_SPECIFIC')}>Open Site-specific works</button><button type="button" className="workspace-secondary-btn px-3 py-2" onClick={() => setStage('ABNORMAL_WORKS')}>Open Abnormals</button></div>
    <SiteCostSummary option={option} infrastructureBase={base.infrastructureTotal} plotWorksBase={base.plotWorksTotal} onBaseChange={amount => updateOption(option.id, current => ({ ...current, abnormalBaseAllowance: amount }))} />
    <AbnormalsStage appraisal={appraisal} option={option} projects={projects} linkedProject={linkedProject} updateAppraisal={updateAppraisal} updateOption={updateOption} />
  </div>;
}

function AbnormalRemovalMeasurements({ option, updateOption, rowId }: {
  option: DevelopmentAppraisalOption;
  rowId: string;
  updateOption: (id: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const rows = (option.siteDimensions || []).filter(row => row.id === rowId && isAbnormalRemovalRow(row));
  const update = (rowId: string, patch: Partial<AppraisalSiteDimensionRow>) => updateOption(option.id, current => {
    const siteDimensions = current.siteDimensions?.map(row => row.id === rowId ? { ...row, ...patch } : row);
    const next = { ...current, siteDimensions };
    return { ...next, costLines: current.costLines.map(line => line.sourceSiteDimensionId === rowId ? changeSiteCost(line, { amount: calculateCostLineAmount(line, next) }, 'Removal measurement updated') : line) };
  });
  return rows.length ? <section className="rounded-app border border-slate-200 p-4 space-y-3">
    <h3 className="font-semibold">Existing structures, surfaces and alterations — abnormal allowances</h3>
    <p className="text-sm text-slate-500">These removal and alteration allowances are additional abnormals, excluded from the infrastructure base. Existing quantities and rates are retained; assess the extent and replace the allowance with measured costs as design develops. Price-index contingency remains in Contingency.</p>
    {rows.map(row => <fieldset disabled={option.costLines.some(line => line.sourceSiteDimensionId === row.id && line.siteCost?.status === 'CLEARED')} key={row.id} className="grid gap-2 border-t pt-3 sm:grid-cols-5" data-removal-source={row.id}>
      <div className="sm:col-span-5 font-medium">{row.label}</div>
      <label>Basis<select className={inputClass()} aria-label={`Basis for ${row.label}`} value={row.costDriver || 'MANUAL'} onChange={event => update(row.id, { costDriver: event.target.value === 'MANUAL' ? undefined : event.target.value as AppraisalSiteDimensionRow['costDriver'] })}><option value="TOTAL_UNITS">Per dwelling</option><option value="FIXED_SUM">Fixed sum</option><option value="MANUAL">Measured quantity</option></select></label>
      <label>Quantity<input className={inputClass()} aria-label={`Quantity for ${row.label}`} type="number" min="0" disabled={!!row.costDriver} key={`${row.id}-${row.quantity}-${row.costDriver}`} defaultValue={row.costDriver ? resolveSiteDimensionQuantity(row, option) : row.quantity} onBlur={event => update(row.id, { quantity: Math.max(0, Number(event.target.value) || 0) })} /></label>
      <label>Unit<select className={inputClass()} aria-label={`Unit for ${row.label}`} value={row.unit} onChange={event => update(row.id, { unit: event.target.value as AppraisalSiteDimensionRow['unit'] })}>{['nr','m','m2','sum'].map(unit => <option key={unit}>{unit}</option>)}</select></label>
      <label>Rate<input className={inputClass()} aria-label={`Rate for ${row.label}`} type="number" min="0" step="0.01" key={`${row.id}-${row.rate}`} defaultValue={row.rate} onBlur={event => update(row.id, { rate: Math.max(0, Number(event.target.value) || 0) })} /></label>
      <label>Base price index<input className={inputClass()} aria-label={`Price index for ${row.label}`} type="number" min="0" step="0.01" key={`${row.id}-${row.priceIndex}`} defaultValue={row.priceIndex || 0} onBlur={event => update(row.id, { priceIndex: Math.max(0, Number(event.target.value) || 0) })} /></label>
      <p className="sm:col-span-5 text-sm">Measured allowance: {money(calculateSiteDimensionTotal(row, option))}. Assessment, allocation, clearance and evidence are held in the linked element below.</p>
    </fieldset>)}
  </section> : null;
}

function AbnormalModal({title,onClose,children,movable=false}: {title:string;onClose:()=>void;children:React.ReactNode;movable?:boolean}) {
  return <MovableDialog title={title} onClose={onClose} movable={movable}>{children}</MovableDialog>;
}

function AbnormalElementAddDialog({option,projects,initialProjectId,allocation,onAdd,onClose}:{option:DevelopmentAppraisalOption;projects:Project[];initialProjectId?:string;allocation?:'SITE_SPECIFIC'|'ABNORMALS';onAdd:(line:AppraisalCostLine)=>void;onClose:()=>void}) {
  const [selectedAllocation,setSelectedAllocation]=React.useState<'SITE_SPECIFIC'|'ABNORMALS'>(allocation || 'SITE_SPECIFIC');
  const categories=siteCostCategoriesFor(selectedAllocation);
  const isSiteSpecific=selectedAllocation==='SITE_SPECIFIC';
  const categoryLabel=isSiteSpecific?'Site-specific category':'Abnormal category';
  const presetLabel=isSiteSpecific?'Preset site-specific element':'Preset abnormal';
  const {appraisalRates,appSettings}=useAppContext();
  const [step,setStep]=React.useState<'ELEMENT'|'SOURCE'>('ELEMENT');
  const [categoryId,setCategoryId]=React.useState('');
  const [presetId,setPresetId]=React.useState('');
  const [kind,setKind]=React.useState<'BILL'|'RATE'|'AI'|'MANUAL'|null>(null);
  const category=categories.find(entry=>entry.id===categoryId);
  const preset=category?.elements.find(entry=>entry.id===presetId);
  const custom=categoryId==='custom';
  const [projectId,setProjectId]=React.useState(initialProjectId||'');
  const [billId,setBillId]=React.useState('');const [sectionId,setSectionId]=React.useState('');const [pageId,setPageId]=React.useState('');
  const [title,setTitle]=React.useState('');const [rateId,setRateId]=React.useState('');const [quantity,setQuantity]=React.useState('');const [search,setSearch]=React.useState('');
  const [amount,setAmount]=React.useState('');const [notes,setNotes]=React.useState('');const [answer,setAnswer]=React.useState('');
  const [dialogue,setDialogue]=React.useState<NonNullable<AppraisalCostLine['abnormalElement']>['dialogue']>([]);
  const [question,setQuestion]=React.useState('');const [assessment,setAssessment]=React.useState<{amount:number;summary:string;confidence:string}|null>(null);
  const [busy,setBusy]=React.useState(false);const [error,setError]=React.useState('');const alive=React.useRef(true);
  React.useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const project=projects.find(entry=>entry.id===projectId);const bill=project?.bills.find(entry=>entry.id===billId);const section=bill?.sections.find(entry=>entry.id===sectionId);const page=section?.pages?.find(entry=>entry.id===pageId);
  const sourceItems=page?.items || (section?getSectionItems(section):bill?getBillItems(bill):[]);
  const sourceTotal=sourceItems.reduce((total,item)=>total+(['PRICED','EXTRA_OVER_ITEM'].includes(item.type)?item.total||0:0),0)*(bill?getBillQuantityMultiplier(bill):1);
  const sourceName=[bill?.name,section?.name,page?.name || (page?'Selected page':'')].filter(Boolean).join(' / ');
  const rates=appraisalRates.filter(rate=>rate.status!=='ARCHIVED'&&!rate.costDriver?.endsWith('_FORMULA')&&!rate.formulaComponents?.length);
  const fixedSudsRate=presetId==='suds';
  const rate=fixedSudsRate?SUDS_STANDARD_RATE:rates.find(entry=>entry.id===rateId);const quantityNumber=numberValue(quantity);
  const preview=kind==='BILL'?sourceTotal:kind==='RATE'?quantityNumber*(rate?.rate||0):numberValue(amount);
  const name=title.trim() || (kind==='BILL'?sourceName:kind==='RATE'?rate?.label:dialogue?.find(entry=>entry.role==='user')?.text.slice(0,100)) || '';
  const duplicate=kind==='BILL'&&option.costLines.some(line=>line.sourceProjectId===projectId&&line.sourceBillId===billId&&siteCostMetadata(line).status!=='CLEARED'&&(!line.sourceSectionId||!sectionId||line.sourceSectionId===sectionId&&(!line.sourcePageId||!pageId||line.sourcePageId===pageId)));
  const canAdd=step==='SOURCE' && Boolean(kind) && Boolean(name) && !busy && !duplicate && (kind==='BILL'?Boolean(bill)&&(pageId?Boolean(page):true):kind==='RATE'?Boolean(rate)&&quantity.trim()!==''&&Number.isFinite(quantityNumber)&&quantityNumber>0:kind==='AI'?Boolean(assessment)&&!question:true);
  const selectElement=(nextCategoryId:string,nextPresetId='')=>{
    const nextPreset=categories.find(entry=>entry.id===nextCategoryId)?.elements.find(entry=>entry.id===nextPresetId);
    setCategoryId(nextCategoryId);setPresetId(nextPresetId);setKind(null);
    setTitle(nextPreset?.label||'');setNotes(nextPreset?`${nextPreset.scope}\n\nBase scope boundary: ${nextPreset.baseBoundary}`:'');
    setBillId('');setSectionId('');setPageId('');setRateId('');setQuantity('');setSearch('');setAmount('');
    setAnswer('');setDialogue([]);setQuestion('');setAssessment(null);setError('');
  };
  const selectSource=(nextKind:NonNullable<typeof kind>)=>{
    setKind(nextKind);setError('');
    if(nextKind==='AI'&&!answer&&!dialogue?.length)setAnswer(`${title}. ${notes}`);
  };
  const askAi=async()=>{
    if(!answer.trim()||busy)return;
    const next=[...(dialogue||[]),{role:'user' as const,text:answer.trim()}];setBusy(true);setError('');setAssessment(null);
    try{
      const result=await generateCustomCostProvisionGuidanceStep({purpose:'ABNORMAL_ELEMENT',allocation:selectedAllocation,selectedElement:{category:category?.label||'Site-specific',preset:preset?.label,title,scopeAndEvidence:notes,baseBoundary:preset?.baseBoundary},dialogue:next,question,projectName:project?.name,programme:option.programme,houseTypeSchedule:(option.houseTypeSchedule||[]).map(row=>({name:row.houseTypeName,quantity:row.quantity})),currentCosts:buildHouseCostSummary(option),existingAbnormals:option.costLines.filter(isSiteCostElement).map(line=>({title:line.title,amount:calculateCostLineAmount(line,option),notes:line.notes})),requirements:`Assess only the described additional ${isSiteSpecific?'site-specific':'abnormal'} works. State measured scope, quantity and rate basis, inclusions, exclusions, uncertainty and overlap with base scope. Ask for missing measurements or evidence; do not invent project facts. Return a provisional allowance for review, never a cost already in the base allowances.`},appSettings.ai,isSiteSpecific?'SITE_SPECIFIC':'ABNORMAL');
      if(!alive.current)return;
      if(result.ok===false){setError(result.error);return;}
      const data=result.data;setAnswer('');setQuestion(data.needsClarification?data.question:'');
      setDialogue([...next,{role:'assistant',text:data.needsClarification?data.question:data.summary}]);
      if(!data.needsClarification){setAssessment(data);setAmount(String(data.amount));setNotes(current=>[current,data.summary].filter(Boolean).join('\n\n'));}
    }catch(e){if(alive.current)setError(e instanceof Error?e.message:'AI assessment unavailable.');}finally{if(alive.current)setBusy(false);}
  };
  const add=()=>{
    if(!canAdd||!kind)return;
    const line=createDefaultCostLine('ABNORMALS',option.durationMonths,{title:name,amount:Math.max(0,preview),notes,percentageBasis:'NONE',siteCost:{allocation:selectedAllocation,status:preview>0?'PROVISIONAL':'TO_BE_ASSESSED',includeInLandOffer:false,history:[]},abnormalElement:{kind,categoryId,categoryLabel:category?.label||'Site-specific',...(preset?{presetId:preset.id,presetLabel:preset.label,presetScope:`${preset.scope}\n\nBase scope boundary: ${preset.baseBoundary}`} : {}),basis:kind==='AI'?notes:kind==='RATE'?rate?.notes:sourceName||notes,...(kind==='RATE'?{rateId:rate!.id,quantity:quantityNumber,unit:rate!.unit,rate:rate!.rate,priceIndex:rate!.priceIndex}:{}),...(kind==='AI'?{dialogue}:{} )},...(kind==='BILL'?{sourceProjectId:project!.id,sourceBillId:bill!.id,sourceSectionId:section?.id,sourcePageId:page?.id,sourceLabel:sourceName,readOnlySnapshot:true,linkedAbnormalVersion:1,linkedAbnormalFrozen:false}:{})});
    onAdd(line);onClose();
  };
  return <AbnormalModal title={isSiteSpecific?"Add site-specific element":"Add abnormal element"} onClose={onClose} movable>
    <div className="mb-4 flex gap-4 border-b border-slate-200 pb-3 text-sm dark:border-slate-700" aria-label="Add abnormal steps">
      <span aria-current={step==='ELEMENT'?'step':undefined} className={step==='ELEMENT'?'font-semibold text-primary-700 dark:text-primary-300':'text-slate-500'}>1. Select element</span>
      <span aria-current={step==='SOURCE'?'step':undefined} className={step==='SOURCE'?'font-semibold text-primary-700 dark:text-primary-300':'text-slate-500'}>2. Add cost</span>
    </div>
    {step==='ELEMENT'?<div className="min-h-[22rem] space-y-4">
      {!allocation&&<label className="block text-sm">Cost section<select aria-label="Cost section" value={selectedAllocation} onChange={event=>{setSelectedAllocation(event.target.value as 'SITE_SPECIFIC'|'ABNORMALS');selectElement('');}} className={`${inputClass()} mt-1`}><option value="SITE_SPECIFIC">Site-specific works</option><option value="ABNORMALS">Abnormals</option></select></label>}
      <label className="block text-sm">{categoryLabel}<select aria-label={categoryLabel} value={categoryId} onChange={event=>selectElement(event.target.value)} className={`${inputClass()} mt-1`}><option value="">Select a category</option>{categories.map(entry=><option key={entry.id} value={entry.id}>{entry.label}</option>)}<option value="custom">Custom element</option></select></label>
      {!custom&&<label className="block text-sm">{presetLabel}<select aria-label={presetLabel} value={presetId} disabled={!category} onChange={event=>selectElement(categoryId,event.target.value)} className={`${inputClass()} mt-1`}><option value="">Select an element</option>{category?.elements.map(entry=><option key={entry.id} value={entry.id}>{entry.label}</option>)}</select></label>}
      {custom&&<label className="block text-sm">Element name<input aria-label="Element name" value={title} onChange={event=>setTitle(event.target.value)} placeholder="Name the element" className={`${inputClass()} mt-1`} /></label>}
      {preset&&<div className="rounded-app border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-surface-950"><p>{preset.scope}</p><p className="mt-2"><strong>Base scope boundary: </strong>{preset.baseBoundary}</p></div>}
      <p className="text-sm text-slate-500">Select an element, then choose AI, BoQ or Standard rate to prepare its cost. You can edit its name and scope. Costs enter the appraisal only when you click Add element.</p>
      <div className="flex justify-end gap-2 border-t pt-3"><button type="button" onClick={onClose} className="workspace-secondary-btn px-3 py-2">Cancel</button><button type="button" disabled={!(preset||custom&&title.trim())} onClick={()=>setStep('SOURCE')} className="workspace-primary-btn px-3 py-2 disabled:opacity-50">Next: choose pricing method</button></div>
    </div>:<>
    <div className="mb-4 flex items-center justify-between gap-3"><p className="text-sm font-medium">{category?.label||'Site-specific'}{preset?` › ${preset.label}`:''}</p><button type="button" disabled={busy} onClick={()=>setStep('ELEMENT')} className="workspace-secondary-btn shrink-0 px-3 py-2">Change element</button></div>
    <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={isSiteSpecific?"Site-specific pricing method":"Abnormal pricing method"}>{([['AI','AI'],['BILL','BoQ'],['RATE','Standard rate'],['MANUAL','Manual allowance']] as const).map(([key,label])=><button key={key} type="button" aria-pressed={kind===key} disabled={busy} onClick={()=>selectSource(key)} className={`${kind===key?'workspace-primary-btn':'workspace-secondary-btn'} px-3 py-2`}>{label}</button>)}</div>
    {!kind&&<p className="mb-3 text-sm text-slate-500">Choose how to price this element. BoQ links a bill, section or page; Standard rate uses a measured quantity; AI asks for missing scope and measurement details.</p>}
    <label className="mb-3 block text-sm">Element name<input aria-label="Element name" value={title} onChange={event=>setTitle(event.target.value)} placeholder={sourceName||rate?.label||'Name the element'} className={`${inputClass()} mt-1`} /></label>
    {kind==='BILL'&&<div className="grid gap-3 sm:grid-cols-2">
      <label>Estimate project<select aria-label="Estimate project" className={inputClass()} value={projectId} onChange={event=>{setProjectId(event.target.value);setBillId('');setSectionId('');setPageId('');}}><option value="">Select estimate</option>{projects.filter(p=>!p.archivedAt).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label>Bill<select aria-label="Bill" className={inputClass()} value={billId} onChange={event=>{setBillId(event.target.value);setSectionId('');setPageId('');}}><option value="">Select bill</option>{project?.bills.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <label>Section<select aria-label="Section" className={inputClass()} value={sectionId} onChange={event=>{setSectionId(event.target.value);setPageId('');}} disabled={!bill}><option value="">Whole bill</option>{bill?.sections.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label>Page<select aria-label="Page" className={inputClass()} value={pageId} onChange={event=>setPageId(event.target.value)} disabled={!section?.pages?.length}><option value="">Whole section</option>{section?.pages?.map((p,i)=><option key={p.id} value={p.id}>{p.name||`Page ${i+1}`}</option>)}</select></label>
      <p className="sm:col-span-2 text-sm text-slate-500">The selected priced total stays linked to its source. Review overlap before adding a whole bill or a section already included in another element.</p>{duplicate&&<p role="alert" className="sm:col-span-2 text-sm text-amber-700">This bill scope is already included in an element. Select a different scope or update the existing element.</p>}
    </div>}
    {kind==='RATE'&&fixedSudsRate&&<div className="grid gap-3"><p className="font-medium">Fixed SuDS rate: £83/m²</p><label>SuDS area (m²)<input aria-label="SuDS area (m²)" type="number" min="0" step="any" value={quantity} onChange={e=>setQuantity(e.target.value)} className={inputClass()} /></label><p className="text-sm text-slate-500">SuDS area × £83/m². The total updates automatically.</p></div>}
    {kind==='RATE'&&!fixedSudsRate&&<div className="grid gap-3"><label>Find a rate<input aria-label="Find a standard rate" value={search} onChange={e=>setSearch(e.target.value)} className={inputClass()} /></label><label>Standard rate<select aria-label="Standard rate" className={inputClass()} value={rateId} onChange={e=>setRateId(e.target.value)}><option value="">Select rate</option>{rates.filter(r=>r.id===rateId||r.label.toLowerCase().includes(search.toLowerCase())).map(r=><option key={r.id} value={r.id}>{r.label} — {moneyWithDecimals(r.rate,2)}/{r.unit}</option>)}</select></label><label>Measured quantity<input aria-label="Measured quantity" type="number" min="0" step="any" value={quantity} onChange={e=>setQuantity(e.target.value)} className={inputClass()} /></label>{rate&&<p className="text-sm text-slate-500">{moneyWithDecimals(rate.rate,2)} per {rate.unit}; base index {rate.priceIndex||'not stated'}. This selected rate is saved with the element; its quantity and rate can be revised in detail. {rate.notes}</p>}</div>}
    {kind==='AI'&&<div className="space-y-3"><div aria-live="polite" className="space-y-2 text-sm">{dialogue?.map((entry,i)=><p key={i} className={entry.role==='assistant'?'rounded border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-surface-950':'px-2'}><strong>{entry.role==='user'?'You':'QS assistant'}: </strong>{entry.text}</p>)}</div>{question&&<p className="font-medium">{question}</p>}<label className="block">{question?'Answer the QS question':isSiteSpecific?'Describe the site-specific works':'Describe the abnormal works'}<textarea aria-label={isSiteSpecific?"Site-specific AI description":"Abnormal AI description"} value={answer} onChange={e=>setAnswer(e.target.value)} className={`${inputClass('min-h-[6rem]')} mt-1`} /></label><button type="button" onClick={()=>void askAi()} disabled={busy||!answer.trim()} className="workspace-secondary-btn px-3 py-2 disabled:opacity-50"><Sparkles className="h-4 w-4" />{busy?'Assessing…':question?'Continue dialogue':isSiteSpecific?'Assess site-specific works':'Assess abnormal'}</button>{assessment&&<p className="text-sm">Provisional assessment; confidence {assessment.confidence.toLowerCase()}. Review the amount and scope before adding.</p>}{error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}</div>}
    {(kind==='MANUAL'||kind==='AI'&&assessment)&&<label className="mt-3 block">Allowance (£)<input aria-label="Allowance (£)" type="number" min="0" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} className={inputClass()} /></label>}
    <label className="mt-3 block text-sm">Scope, exclusions and evidence<textarea aria-label="Scope, exclusions and evidence" value={notes} onChange={e=>setNotes(e.target.value)} className={`${inputClass('min-h-[4rem]')} mt-1`} /></label>
    <div className="mt-4 flex items-center justify-between border-t pt-3"><strong>Element total: {moneyWithDecimals(Math.max(0,preview),2)}</strong><div className="flex gap-2"><button type="button" onClick={onClose} className="workspace-secondary-btn px-3 py-2">Cancel</button><button type="button" onClick={add} disabled={!canAdd} className="workspace-primary-btn px-3 py-2 disabled:opacity-50">Add element</button></div></div>
    </>}
  </AbnormalModal>;
}

function AbnormalsStage({
  appraisal,
  allocation,
  option,
  projects,
  linkedProject,
  updateAppraisal,
  updateOption,
}: {
  appraisal: DevelopmentAppraisal;
  allocation?: 'SITE_SPECIFIC' | 'ABNORMALS';
  option: DevelopmentAppraisalOption;
  projects: Project[];
  linkedProject: Project | null;
  updateAppraisal: (appraisalId: string, recipe: (appraisal: DevelopmentAppraisal) => DevelopmentAppraisal) => void;
  updateOption: (optionId: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const { showToast } = useToast();
  const abnormalRows = (option.costLines || []).filter(isSiteCostElement);
  const sectionRows = allocation ? abnormalRows.filter(line => siteCostMetadata(line).allocation === allocation) : abnormalRows;
  const sectionTitle = allocation === 'SITE_SPECIFIC' ? 'Site-specific works' : allocation === 'ABNORMALS' ? 'Abnormals' : 'Additional site elements';
  const addTitle = allocation === 'ABNORMALS' ? 'Add abnormal element' : 'Add site-specific element';
  const smokeId = allocation === 'SITE_SPECIFIC' ? 'appraisals-site-specific' : allocation === 'ABNORMALS' ? 'appraisals-abnormals' : 'appraisals-site-elements';
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [editingLineId, setEditingLineId] = React.useState<string | null>(null);
  const [allocationFilter, setAllocationFilter] = React.useState('ALL');
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const registerBase = buildHouseCostSummary(option);
  const filteredRows = sectionRows.filter(line => {
    const metadata = siteCostMetadata(line);
    return (allocationFilter === 'ALL' || metadata.allocation === allocationFilter) && (statusFilter === 'ALL' || metadata.status === statusFilter);
  });
  const abnormalTotal = sectionRows.reduce((total, row) => total + calculateCostLineAmount(row, option), 0);
  const [detailLineId, setDetailLineId] = React.useState<string | null>(null);
  const [activeInfoEditor, setActiveInfoEditor] = React.useState<{ lineId: string; kind: 'priced' | 'nonPriced' } | null>(null);
  const [activeNotesLineId, setActiveNotesLineId] = React.useState<string | null>(null);
  const [infoDraft, setInfoDraft] = React.useState<{ lineId: string; kind: 'priced' | 'nonPriced'; value: string } | null>(null);
  const [noteDrafts, setNoteDrafts] = React.useState<Record<string, string>>({});
  const [generalAbnormalNotesDraft, setGeneralAbnormalNotesDraft] = React.useState(option.abnormalGeneralNotes || '');
  React.useEffect(() => {
    setGeneralAbnormalNotesDraft(option.abnormalGeneralNotes || '');
  }, [option.id, option.abnormalGeneralNotes]);
  const detailLine = detailLineId ? abnormalRows.find((line) => line.id === detailLineId) || null : null;
  const detailProject = projects.find(project => project.id === detailLine?.sourceProjectId) || linkedProject;
  const detailBill = detailProject && detailLine?.sourceBillId
    ? detailProject.bills.find((bill) => bill.id === detailLine.sourceBillId) || null
    : null;
  const detailSection = detailBill && detailLine?.sourceSectionId
    ? detailBill.sections.find((section) => section.id === detailLine.sourceSectionId) || null
    : null;
  const detailPage = detailSection?.pages?.find(page => page.id === detailLine?.sourcePageId);
  const detailItems = detailPage ? detailPage.items : detailSection ? getSectionItems(detailSection) : detailBill ? getBillItems(detailBill) : [];
  const detailMultiplier = detailBill ? getBillQuantityMultiplier(detailBill) : 1;
  const detailSourceTotal = detailPage ? detailPage.items.reduce((sum,item) => sum + (['PRICED','EXTRA_OVER_ITEM'].includes(item.type) ? item.total || 0 : 0),0) * detailMultiplier : detailSection
    ? calculateSectionBaseTotal(detailSection) * detailMultiplier
    : detailBill
      ? calculateBillBaseTotal(detailBill) * detailMultiplier
      : 0;
  const pricedDetailItems = detailItems.filter((item) => ['PRICED', 'EXTRA_OVER_ITEM'].includes(item.type));
  const updateAbnormal = (lineId: string, patch: Partial<AppraisalCostLine>, reason = '', reopenAmount?: number) => {
    updateOption(option.id, current => {
      const original = current.costLines.find(line => line.id === lineId);
      const sourceId = original?.sourceSiteDimensionId;
      const siteDimensions = reopenAmount !== undefined && sourceId
        ? current.siteDimensions?.map(row => row.id === sourceId ? { ...row, costDriver: undefined, quantity: 1, unit: 'sum' as const, rate: reopenAmount } : row)
        : current.siteDimensions;
      return { ...current, siteDimensions, costLines: current.costLines.map(line => line.id === lineId ? changeSiteCost(sourceId && line.siteCost?.status !== 'CLEARED' ? { ...line, amount: calculateCostLineAmount(line, current) } : line, patch, reason, reopenAmount) : line) };
    });
  };
  const resolveLinkedLineSource = (line: AppraisalCostLine) => {
    const project = projects.find((entry) => entry.id === line.sourceProjectId) || linkedProject;
    const bill = project?.bills?.find((entry) => entry.id === line.sourceBillId) || null;
    const section = bill && line.sourceSectionId ? bill.sections?.find((entry) => entry.id === line.sourceSectionId) || null : null;
    const multiplier = bill ? getBillQuantityMultiplier(bill) : 1;
    const page = section?.pages?.find(entry => entry.id === line.sourcePageId);
    const amount = page ? page.items.reduce((sum,item)=>sum+(['PRICED','EXTRA_OVER_ITEM'].includes(item.type)?item.total||0:0),0)*multiplier : section
      ? calculateSectionBaseTotal(section) * multiplier
      : bill
        ? calculateBillBaseTotal(bill) * multiplier
        : line.amount || 0;
    return { project, bill, section, amount };
  };
  const freezeLinkedAbnormal = (line: AppraisalCostLine) => {
    if (!line.sourceBillId) return;
    updateAbnormal(line.id, {
      linkedAbnormalFrozen: true,
      linkedAbnormalFrozenAt: new Date().toISOString(),
      readOnlySnapshot: true,
    });
    showToast({ type: 'success', message: `${line.title || 'Linked abnormal'} frozen at ${money(line.amount || 0)}.` });
  };
  const unfreezeLinkedAbnormal = (line: AppraisalCostLine) => {
    if (!line.sourceBillId) return;
    const source = resolveLinkedLineSource(line);
    updateAbnormal(line.id, {
      linkedAbnormalFrozen: false,
      linkedAbnormalFrozenAt: undefined,
      amount: source.amount,
      readOnlySnapshot: true,
    });
    showToast({ type: 'success', message: `${line.title || 'Linked abnormal'} is live again.` });
  };
  const createLinkedAbnormalVersion = (line: AppraisalCostLine) => {
    const selectedProject = projects.find((entry) => entry.id === line.sourceProjectId) || linkedProject;
    const selectedBill = selectedProject?.bills?.find((entry) => entry.id === line.sourceBillId) || null;
    if (!selectedProject || !selectedBill) {
      showToast({ type: 'error', message: 'Select a linked estimate bill before creating a new abnormal version.' });
      return;
    }
    const selectedSection = line.sourceSectionId
        ? selectedBill.sections?.find((entry) => entry.id === line.sourceSectionId) || null
        : null;
    const nextAmount = resolveLinkedLineSource(line).amount;
    const nextVersion = Math.max(1, line.linkedAbnormalVersion || 1) + 1;
    const nextSourceLabel = line.sourceLabel || (selectedSection ? `${selectedBill.name} / ${selectedSection.name}` : selectedBill.name);
    const nextTitle = `${line.title.replace(/\s+v\d+$/i, '')} v${nextVersion}`;
    updateOption(option.id, (current) => ({
      ...current,
      costLines: [
        ...current.costLines.map(entry => entry.id === line.id ? changeSiteCost(entry, {
          title: nextTitle,
          amount: nextAmount,
          sourceProjectId: selectedProject.id,
          sourceBillId: selectedBill.id,
          sourceSectionId: selectedSection?.id,
          sourceLabel: nextSourceLabel,
          readOnlySnapshot: true,
          linkedAbnormalFrozen: false,
          linkedAbnormalVersion: nextVersion,
          notes: `Version ${nextVersion} created from ${line.title || 'linked abnormal'}. Live link: ${nextSourceLabel}.`,
          pricedItemsInformationNotes: line.pricedItemsInformationNotes || '',
          nonPricedItemsInformationNotes: line.nonPricedItemsInformationNotes || '',
        }, `Linked estimate version ${nextVersion}`) : entry),
      ],
    }));
    showToast({ type: 'success', message: `${nextTitle} created as a live linked abnormal version.` });
  };
  const commitInfoDraft = () => {
    if (!infoDraft) return;
    const line = abnormalRows.find((entry) => entry.id === infoDraft.lineId);
    if (!line) return;
    const currentValue = infoDraft.kind === 'priced'
      ? line.pricedItemsInformationNotes || ''
      : line.nonPricedItemsInformationNotes || '';
    if (infoDraft.value === currentValue) return;
    updateAbnormal(infoDraft.lineId, infoDraft.kind === 'priced'
      ? { pricedItemsInformationNotes: infoDraft.value }
      : { nonPricedItemsInformationNotes: infoDraft.value });
  };
  const openInfoEditor = (line: AppraisalCostLine, kind: 'priced' | 'nonPriced') => {
    commitInfoDraft();
    if (activeInfoEditor?.lineId === line.id && activeInfoEditor.kind === kind) {
      setActiveInfoEditor(null);
      setInfoDraft(null);
      return;
    }
    setActiveInfoEditor({ lineId: line.id, kind });
    setInfoDraft({
      lineId: line.id,
      kind,
      value: kind === 'priced' ? line.pricedItemsInformationNotes || '' : line.nonPricedItemsInformationNotes || '',
    });
  };
  const commitNotesDraft = (lineId: string) => {
    const line = abnormalRows.find((entry) => entry.id === lineId);
    const draft = noteDrafts[lineId];
    if (!line || draft === undefined || draft === (line.notes || '')) return;
    updateAbnormal(lineId, { notes: draft });
  };
  const toggleNotesEditor = (line: AppraisalCostLine) => {
    if (activeNotesLineId && activeNotesLineId !== line.id) commitNotesDraft(activeNotesLineId);
    if (activeNotesLineId === line.id) {
      commitNotesDraft(line.id);
      setActiveNotesLineId(null);
      return;
    }
    setActiveNotesLineId(line.id);
    setNoteDrafts((current) => ({ ...current, [line.id]: line.notes || '' }));
  };
  const updateConstraintsReport = (patch: Partial<AppraisalPricingReport>) => {
    updateOption(option.id, (current) => ({
      ...current,
      constraintsReport: current.constraintsReport ? { ...current.constraintsReport, ...patch } : undefined,
      abnormalGeneralNarrative: '',
    }));
  };
  const commitGeneralAbnormalNotes = (value: string) => {
    updateOption(option.id, (current) => ({ ...current, abnormalGeneralNotes: value.trim(), abnormalGeneralNarrative: '' }));
  };
  const clearConstraintsReport = () => {
    updateOption(option.id, (current) => ({ ...current, constraintsReport: undefined, abnormalGeneralNarrative: '' }));
  };
  const handleConstraintsReportUpload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_PRICING_REPORT_BYTES) {
      showToast({ type: 'error', message: 'Constraints report is too large. Please upload a file under 50 MB.' });
      return;
    }
    try {
      const report = await buildAppraisalPricingReportFromFile(file);
      updateOption(option.id, (current) => ({
        ...current,
        abnormalGeneralNarrative: '',
        constraintsReport: {
          notes: current.constraintsReport?.notes || '',
          ...report,
        },
      }));
      showToast({ type: 'success', message: `${file.name} saved to Abnormals.` });
    } catch {
      showToast({ type: 'error', message: 'Unable to read constraints report.' });
    }
  };
  const removeFormalQuotation = (lineId: string, quotationId: string) => {
    const line = abnormalRows.find((entry) => entry.id === lineId);
    if (!line) return;
    updateAbnormal(lineId, {
      formalQuotations: (line.formalQuotations || []).filter((quotation) => quotation.id !== quotationId),
    });
  };
  const readFormalQuotation = (file: File) => buildAppraisalPricingReportFromFile(file);
  const handleFormalQuotationUpload = async (lineId: string, files: FileList | null | undefined) => {
    const nextFiles = Array.from(files || []);
    if (nextFiles.length === 0) return;
    const oversized = nextFiles.find((file) => file.size > MAX_PRICING_REPORT_BYTES);
    if (oversized) {
      showToast({ type: 'error', message: `${oversized.name} is too large. Please upload quotation files under 50 MB each.` });
      return;
    }
    try {
      const quotations = await Promise.all(nextFiles.map(readFormalQuotation));
      const line = abnormalRows.find((entry) => entry.id === lineId);
      if (!line) return;
      updateAbnormal(lineId, {
        formalQuotations: [...(line.formalQuotations || []), ...quotations],
      });
      showToast({
        type: 'success',
        message: `${quotations.length} formal quotation${quotations.length === 1 ? '' : 's'} saved to ${line.title || 'abnormal'}.`,
      });
    } catch {
      showToast({ type: 'error', message: 'Unable to read one or more quotation files.' });
    }
  };
  return (
    <div data-smoke={smokeId} className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{sectionTitle}</h2><button type="button" data-smoke={`${smokeId}-add`} aria-label={addTitle} title={addTitle} className="workspace-primary-btn h-9 w-9 justify-center p-0" onClick={()=>setIsAddOpen(true)}><Plus className="h-4 w-4" /></button></div>
      <p className="text-sm text-slate-500">{allocation === 'SITE_SPECIFIC' ? 'Planned site requirements outside the base allowances, such as SUDS.' : allocation === 'ABNORMALS' ? 'Exceptional site costs, such as contamination, rock and demolition.' : 'All additional site elements, grouped by allocation.'} Only added elements are included. Select a total to open the detail.</p>
      <div className="flex flex-wrap gap-3 text-xs">{!allocation&&<label>Allocation <select aria-label="Filter allocation" className={inputClass('w-auto')} value={allocationFilter} onChange={e=>setAllocationFilter(e.target.value)}><option value="ALL">All allocations</option>{Object.entries(SITE_COST_ALLOCATION_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>}<label>Status <select aria-label="Filter assessment status" className={inputClass('w-auto')} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="ALL">All statuses</option>{Object.entries(SITE_COST_STATUS_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div>
      <div className="overflow-x-auto rounded-app border border-slate-200 dark:border-slate-700"><table data-smoke={`${smokeId}-bill`} className="w-full text-left text-sm"><thead className="bg-slate-100 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-surface-800"><tr><th className="px-3 py-3">Ref</th><th className="px-3 py-3">Element / section</th><th className="px-3 py-3">Source</th><th className="px-3 py-3">Allocation</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Total</th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-700"><tr className="bg-emerald-700 text-white dark:bg-emerald-800"><th colSpan={6} className="px-3 py-3">{allocation === 'SITE_SPECIFIC' ? 'Added site-specific elements' : allocation === 'ABNORMALS' ? 'Added abnormal elements' : 'All additional site elements'}</th></tr>{filteredRows.map(line=><tr key={line.id} data-abnormal-element={line.id} className="even:bg-slate-50 dark:even:bg-surface-950"><td className="px-3 py-2 text-slate-500">{siteCostMetadata(line).allocation === 'SITE_SPECIFIC' ? 'SITE' : 'ABN'}-{String(sectionRows.indexOf(line)+1).padStart(3,'0')}</td><td className="px-3 py-2"><button type="button" className="text-left font-medium text-primary-700 hover:underline dark:text-primary-300" onClick={()=>setEditingLineId(line.id)}>{line.title}</button>{line.abnormalElement?.categoryLabel&&<div className="mt-0.5 text-xs text-slate-500">{line.abnormalElement.categoryLabel}</div>}</td><td className="px-3 py-2 text-xs text-slate-500">{line.sourceBillId?line.sourceLabel||'Linked bill':line.abnormalElement?.kind==='RATE'?'Standard rate':line.abnormalElement?.kind==='AI'?'AI assessment':'Allowance'}</td><td className="px-3 py-2 text-xs">{SITE_COST_ALLOCATION_LABELS[siteCostMetadata(line).allocation]}</td><td className="px-3 py-2 text-xs">{SITE_COST_STATUS_LABELS[siteCostMetadata(line).status]}</td><td className="px-3 py-2 text-right"><button type="button" aria-label={`Open ${line.title} detail`} className="font-semibold tabular-nums hover:underline" onClick={()=>setEditingLineId(line.id)}>{siteCostMetadata(line).status==='CLEARED'?'No cost':calculateCostLineAmount(line,option)>0?money(calculateCostLineAmount(line,option)):'Unpriced'}</button></td></tr>)}{!filteredRows.length&&<tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">{sectionRows.length?'No elements match these filters.':'No costs added. Use + to add an element.'}</td></tr>}</tbody><tfoot className="border-t-2 border-slate-200 font-semibold dark:border-slate-700"><tr><td colSpan={5} className="px-3 py-3">Total added elements</td><td className="px-3 py-3 text-right tabular-nums">{money(abnormalTotal)}</td></tr></tfoot></table></div>
      {allocation !== 'SITE_SPECIFIC' && <NotAllowedSurveyAbnormals option={option} onExport={() => {
        downloadAppraisalLandOfferExclusionsPdf(option, appraisal.name)
          .then(saved => { if (saved) showToast({ type: 'success', message: 'Land-offer exclusions PDF saved.' }); })
          .catch(error => showToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to export exclusions.' }));
      }} />}
      {allocation !== 'SITE_SPECIFIC' && option.abnormalBaseAllowance!>0&&<p className="text-sm text-slate-500">Separately entered abnormal base allowance: {money(option.abnormalBaseAllowance!)}. Manage this in Site costs and abnormals.</p>}
      {allocation !== 'SITE_SPECIFIC' && <details className="text-sm"><summary className="cursor-pointer text-slate-500">General notes and constraints report</summary>
      <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">General abnormal summary</div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Record overall abnormal commentary for the final report, whether or not specific abnormal rows have been added.</p>
          </div>
          <label className="workspace-secondary-btn cursor-pointer px-3 py-2 text-xs">
            <FileDown className="h-4 w-4" />
            Upload report
            <input
              data-smoke="appraisals-constraints-report-upload"
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
              onChange={(event) => {
                handleConstraintsReportUpload(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </label>
        </div>
        <label className="mt-3 block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">General notes for report</span>
          <textarea
            value={generalAbnormalNotesDraft}
            onChange={(event) => setGeneralAbnormalNotesDraft(event.target.value)}
            onBlur={(event) => commitGeneralAbnormalNotes(event.currentTarget.value)}
            placeholder="Add a general summary of abnormal risks, constraints, or allowances to be rewritten into the final report."
            className={`${inputClass('min-h-[5rem]')} mt-1`}
          />
        </label>
        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Constraints report</div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Upload the constraints report used to support abnormal allowances.</p>
        </div>
        {option.constraintsReport ? (
          <div className="mt-3 rounded-app border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-surface-950">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{option.constraintsReport.fileName}</div>
                 <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                   {(option.constraintsReport.size / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} KB saved {new Date(option.constraintsReport.uploadedAt).toLocaleDateString()}
                 </div>
                 <EvidenceStorageStatus report={option.constraintsReport} />
              </div>
              <div className="flex flex-wrap gap-2">
                <EvidenceDownloadButton report={option.constraintsReport} className="workspace-secondary-btn px-3 py-2 text-xs">
                  <FileDown className="h-4 w-4" />
                  Download
                </EvidenceDownloadButton>
                <button type="button" onClick={clearConstraintsReport} className="workspace-secondary-btn px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>
            </div>
            <label className="mt-3 block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Report notes</span>
              <textarea
                value={option.constraintsReport.notes || ''}
                onChange={(event) => updateConstraintsReport({ notes: event.target.value })}
                tabIndex={-1}
                className={`${inputClass('min-h-[5rem]')} mt-1`}
              />
            </label>
          </div>
        ) : (
          <div className="mt-3 rounded-app border border-dashed border-slate-300 p-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No constraints report saved yet.
          </div>
        )}
      </section>
      </details>}
      {isAddOpen&&<AbnormalElementAddDialog allocation={allocation} option={option} projects={projects} initialProjectId={linkedProject?.id} onClose={()=>setIsAddOpen(false)} onAdd={line=>{updateOption(option.id,current=>({...current,costLines:[...current.costLines,line]}));setEditingLineId(line.id);}} />}
      {editingLineId&&<AbnormalModal title={allocation === 'SITE_SPECIFIC' ? "Site-specific element detail" : "Abnormal element detail"} onClose={()=>{commitInfoDraft();if(activeNotesLineId)commitNotesDraft(activeNotesLineId);setEditingLineId(null);}}>
        {abnormalRows.find(line=>line.id===editingLineId)?.abnormalElement?.presetScope&&<details className="mb-3 rounded-app border border-slate-200 p-3 text-sm dark:border-slate-700"><summary className="cursor-pointer font-medium">Selected preset and base scope boundary</summary><p className="mt-2 whitespace-pre-line">{abnormalRows.find(line=>line.id===editingLineId)?.abnormalElement?.presetScope}</p></details>}
      <div className="space-y-3">
        {abnormalRows.filter(line => line.id === editingLineId).map((line) => (
          <div key={line.id} data-site-cost-id={line.id} className="rounded-app border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-surface-900">
            {line.engineeringScopeItemId && <div className="mb-3 flex flex-wrap items-center gap-3 text-sm"><span>Engineering {line.engineeringScopeItemId}. Price is controlled in Engineer’s Scope. {line.linkedAbnormalFrozen ? 'The confirmed amount is frozen.' : 'The amount follows the current scope and measures.'} Reopening here freezes the explicitly confirmed amount.</span><button type="button" className="rounded border px-2 py-1" disabled={line.siteCost?.status==='CLEARED'} onClick={()=>updateAbnormal(line.id,{linkedAbnormalFrozen:!line.linkedAbnormalFrozen,amount:line.linkedAbnormalFrozen ? line.amount : calculateCostLineAmount(line,option)})}>{line.linkedAbnormalFrozen ? 'Use live Engineer’s Scope amount' : 'Freeze current engineering amount'}</button></div>}
            {line.sourceSiteDimensionId&&<AbnormalRemovalMeasurements option={option} updateOption={updateOption} rowId={line.sourceSiteDimensionId} />}
            <SiteCostElementControls line={line} baseAllowance={siteCostMetadata(line).allocation === 'INFRASTRUCTURE' ? registerBase.infrastructureTotal : siteCostMetadata(line).allocation === 'PLOT_WORKS' ? registerBase.plotWorksTotal : siteCostMetadata(line).allocation === 'ABNORMALS' ? option.abnormalBaseAllowance || 0 : 0} onChange={(patch, reason, amount) => updateAbnormal(line.id, patch, reason, amount)} />
            <div className="grid items-center gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)_auto]">
              <input
                data-smoke="appraisals-abnormal-title"
                aria-label="Abnormal title"
                key={`${line.id}-${line.title}`}
                defaultValue={line.title}
                onBlur={(event) => updateAbnormal(line.id, { title: event.target.value })}
                className={inputClass()}
              />
              <input
                key={`${line.id}-${line.sourceSiteDimensionId || line.engineeringScopeItemId ? calculateCostLineAmount(line, option) : line.amount || 0}`}
                aria-label="Abnormal amount"
                defaultValue={moneyWithDecimals(line.sourceSiteDimensionId || line.engineeringScopeItemId ? calculateCostLineAmount(line, option) : line.amount || 0, 2)}
                disabled={line.readOnlySnapshot || line.abnormalElement?.kind === 'RATE' || line.siteCost?.status === 'CLEARED'}
                onFocus={(event) => {
                  if (line.readOnlySnapshot) return;
                  event.currentTarget.value = line.amount ? String(line.amount) : '';
                  event.currentTarget.select();
                }}
                onBlur={(event) => {
                  if (line.readOnlySnapshot) return;
                  const nextAmount = currencyInputNumber(event.currentTarget.value);
                  updateAbnormal(line.id, { amount: nextAmount });
                  event.currentTarget.value = moneyWithDecimals(nextAmount, 2);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur();
                }}
                className={inputClass('text-right tabular-nums disabled:opacity-70')}
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => toggleNotesEditor(line)}
                  className={`rounded-app-sm border p-2 transition ${
                    line.notes || line.sourceLabel
                      ? 'border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 dark:border-primary-900/70 dark:bg-primary-950/25 dark:text-primary-200'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:hover:bg-surface-800 dark:hover:text-slate-100'
                  }`}
                  aria-label="Show abnormal notes"
                  title="Show notes and source"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {line.sourceBillId ? (
                  <button
                    type="button"
                    onClick={() => {setEditingLineId(null);setDetailLineId(line.id);}}
                    className="rounded-app-sm border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:hover:bg-surface-800 dark:hover:text-slate-100"
                    aria-label="View abnormal source detail"
                    title="View linked bill or section detail"
                  >
                    <BookOpen className="h-4 w-4" />
                  </button>
                ) : null}
                {line.sourceBillId ? (
                  <>
                    <button
                      type="button"
                      onClick={() => line.linkedAbnormalFrozen ? unfreezeLinkedAbnormal(line) : freezeLinkedAbnormal(line)}
                      disabled={line.siteCost?.status === 'CLEARED'}
                      className={`rounded-app-sm border p-2 transition ${
                        line.linkedAbnormalFrozen
                          ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:hover:bg-surface-800 dark:hover:text-slate-100'
                      }`}
                      aria-label={line.linkedAbnormalFrozen ? 'Unfreeze linked abnormal' : 'Freeze linked abnormal'}
                      title={line.linkedAbnormalFrozen ? 'Unfreeze and resume live BoQ updates' : 'Freeze this abnormal at its current value'}
                    >
                      {line.linkedAbnormalFrozen ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => createLinkedAbnormalVersion(line)}
                      disabled={line.siteCost?.status === 'CLEARED'}
                      className="rounded-app-sm border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:hover:bg-surface-800 dark:hover:text-slate-100"
                      aria-label="Create new linked abnormal version"
                      title="Create a new live version from the selected bill/section link"
                    >
                      <CopyPlus className="h-4 w-4" />
                    </button>
                  </>
                ) : null}

              </div>
            </div>
            {line.abnormalElement?.kind === 'RATE' && line.abnormalElement.presetId === 'suds' && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label>SuDS area (m²)<DeferredNumberInput ariaLabel="SuDS area (m²)" value={line.abnormalElement.quantity || 0} onCommit={value=>updateAbnormal(line.id,{amount:value*SUDS_STANDARD_RATE.rate,abnormalElement:{...line.abnormalElement!,quantity:value,rateId:SUDS_STANDARD_RATE.id,rate:SUDS_STANDARD_RATE.rate,unit:SUDS_STANDARD_RATE.unit,priceIndex:undefined,basis:SUDS_STANDARD_RATE.notes}})} disabled={line.siteCost?.status==='CLEARED'} className={inputClass()} /></label><p className="self-center text-sm font-medium">Fixed SuDS rate: £83/m²</p></div>}
            {line.abnormalElement?.kind === 'RATE' && line.abnormalElement.presetId !== 'suds' && <div className="mt-3 grid gap-3 sm:grid-cols-3"><label>Quantity<DeferredNumberInput ariaLabel="Abnormal rate quantity" value={line.abnormalElement.quantity || 0} onCommit={value=>updateAbnormal(line.id,{amount:value*(line.abnormalElement?.rate || 0),abnormalElement:{...line.abnormalElement!,quantity:value}})} disabled={line.siteCost?.status==='CLEARED'} className={inputClass()} /></label><label>Rate (£/{line.abnormalElement.unit})<DeferredNumberInput ariaLabel="Abnormal standard rate" value={line.abnormalElement.rate || 0} onCommit={value=>updateAbnormal(line.id,{amount:value*(line.abnormalElement?.quantity || 0),abnormalElement:{...line.abnormalElement!,rate:value}})} disabled={line.siteCost?.status==='CLEARED'} className={inputClass()} /></label><p className="text-sm text-slate-500">Selected rate basis: index {line.abnormalElement.priceIndex || 'not stated'}. {line.abnormalElement.basis}</p></div>}
            {line.abnormalElement?.kind === 'AI' && <details className="mt-3 text-sm"><summary className="cursor-pointer font-medium">AI assessment dialogue and basis</summary>{line.abnormalElement.dialogue?.map((entry,i)=><p key={i} className="mt-2"><strong>{entry.role==='user'?'You':'QS assistant'}: </strong>{entry.text}</p>)}</details>}
            {line.sourceBillId ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-app border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-surface-950 dark:text-slate-300">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${
                  line.linkedAbnormalFrozen
                    ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100'
                }`}>
                  {line.linkedAbnormalFrozen ? <Lock className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                  {line.linkedAbnormalFrozen ? 'Frozen snapshot' : 'Live BoQ link'}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-semibold dark:border-slate-700 dark:bg-surface-900">
                  Version {line.linkedAbnormalVersion || 1}
                </span>
                {line.previousLinkedAbnormalId ? (
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 dark:border-slate-700 dark:bg-surface-900">
                    Created from previous abnormal
                  </span>
                ) : null}
                {line.linkedAbnormalFrozenAt ? (
                  <span>Frozen {new Date(line.linkedAbnormalFrozenAt).toLocaleDateString()}</span>
                ) : null}
                {line.sourceLabel ? <span className="truncate">Source: {line.sourceLabel}</span> : null}
              </div>
            ) : null}
            {activeNotesLineId === line.id ? (
              <div className="mt-2 rounded-app border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-surface-950">
                {line.sourceLabel ? (
                  <div className="mb-2 rounded-app border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-100">
                    Source: {line.sourceLabel}
                  </div>
                ) : null}
                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Notes</span>
                  <textarea
                    value={noteDrafts[line.id] ?? line.notes ?? ''}
                    onChange={(event) => setNoteDrafts((current) => ({ ...current, [line.id]: event.target.value }))}
                    onBlur={(event) => updateAbnormal(line.id, { notes: event.currentTarget.value })}
                    tabIndex={-1}
                    className={`${inputClass('min-h-[4rem]')} mt-1`}
                  />
                </label>
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-app border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-surface-950">
              <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Evidence</span>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-600 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200">
                {(line.formalQuotations || []).length} quote{(line.formalQuotations || []).length === 1 ? '' : 's'}
              </span>
              <label className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-app-sm border border-slate-200 bg-white px-2 font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200 dark:hover:bg-surface-800 dark:hover:text-slate-50" title="Add formal quotations">
                <FileUp className="h-4 w-4" />
                Quotes
                <input
                  data-smoke="appraisals-abnormal-quotation-upload"
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.msg,.eml"
                  onChange={(event) => {
                    void handleFormalQuotationUpload(line.id, event.target.files);
                    event.target.value = '';
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => openInfoEditor(line, 'priced')}
                className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-app-sm border px-2 font-semibold transition ${
                  line.pricedItemsInformationNotes
                    ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200 dark:hover:bg-surface-800 dark:hover:text-slate-50'
                }`}
                title="Comments on priced items needing more information"
              >
                <MessageSquareText className="h-4 w-4" />
                Priced info
              </button>
              <button
                type="button"
                onClick={() => openInfoEditor(line, 'nonPriced')}
                className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-app-sm border px-2 font-semibold transition ${
                  line.nonPricedItemsInformationNotes
                    ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200 dark:hover:bg-surface-800 dark:hover:text-slate-50'
                }`}
                title="Comments on non-priced items needing more information"
              >
                <MessageSquareText className="h-4 w-4" />
                Non-priced info
              </button>
              {(line.formalQuotations || []).map((quotation) => (
                <span key={quotation.id} className="inline-flex max-w-[18rem] items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-600 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200">
                  <span className="truncate">{quotation.fileName}</span>
                  <EvidenceDownloadButton report={quotation} className="text-slate-400 hover:text-primary-600 disabled:opacity-50 dark:hover:text-primary-300" ariaLabel={`Download ${quotation.fileName}`}>
                    <FileDown className="h-3.5 w-3.5" />
                  </EvidenceDownloadButton>
                  <button type="button" onClick={() => removeFormalQuotation(line.id, quotation.id)} className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-300" title="Remove quote" aria-label={`Remove ${quotation.fileName}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
            {activeInfoEditor?.lineId === line.id ? (
              <label className="mt-2 block">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {activeInfoEditor.kind === 'priced' ? 'Priced items needing more information' : 'Non-priced items needing more information'}
                </span>
                <textarea
                  value={infoDraft?.lineId === line.id && infoDraft.kind === activeInfoEditor.kind
                    ? infoDraft.value
                    : activeInfoEditor.kind === 'priced' ? line.pricedItemsInformationNotes || '' : line.nonPricedItemsInformationNotes || ''}
                  onChange={(event) => setInfoDraft({
                    lineId: line.id,
                    kind: activeInfoEditor.kind,
                    value: event.target.value,
                  })}
                  onBlur={(event) => updateAbnormal(line.id, activeInfoEditor.kind === 'priced'
                    ? { pricedItemsInformationNotes: event.currentTarget.value }
                    : { nonPricedItemsInformationNotes: event.currentTarget.value })}
                  className={`${inputClass('min-h-[4rem]')} mt-1`}
                />
              </label>
            ) : null}
          </div>
        ))}
      </div>
      </AbnormalModal>}
      {detailLine ? (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-app-xl border border-slate-200 bg-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.85)] dark:border-slate-800 dark:bg-surface-900">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Abnormal source detail</div>
                <h3 className="mt-1 text-base font-semibold text-slate-950 dark:text-slate-50">{detailLine.title}</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {detailLine.sourceLabel || detailBill?.name || 'Linked bill/section'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <MetricTile label="Snapshot amount" value={money(detailLine.amount || 0)} />
                <MetricTile label="Current source total" value={money(detailSourceTotal)} tone={detailSourceTotal !== (detailLine.amount || 0) ? 'watch' : 'default'} />
                <button type="button" onClick={() => setDetailLineId(null)} className="workspace-icon-btn" aria-label="Close abnormal source detail">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {detailBill ? (
              <div className="min-h-0 flex-1 overflow-auto p-5">
                <div className="mb-3 grid gap-3 md:grid-cols-3">
                  <MetricTile label="Bill" value={detailBill.name} />
                  <MetricTile label="Scope" value={detailSection?.name || 'Whole bill'} />
                  <MetricTile label="Priced rows" value={formatQuantity(pricedDetailItems.length)} />
                </div>
                <div className="overflow-hidden rounded-app border border-slate-200 dark:border-slate-800">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-slate-100 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-950 dark:text-slate-400">
                      <tr>
                        <th className="px-3 py-2">Ref</th>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2">Unit</th>
                        <th className="px-3 py-2 text-right">Rate</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {detailItems.map((item) => {
                        const isPriced = ['PRICED', 'EXTRA_OVER_ITEM'].includes(item.type);
                        return (
                          <tr key={item.id} className={isPriced ? 'bg-white dark:bg-surface-900' : 'bg-slate-50/70 text-slate-500 dark:bg-surface-950/70 dark:text-slate-400'}>
                            <td className="px-3 py-2 font-mono">{item.reference || '-'}</td>
                            <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">{item.description || item.type}</td>
                            <td className="px-3 py-2">{item.type.replace(/_/g, ' ')}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{isPriced ? formatQuantity(item.quantity || 0) : ''}</td>
                            <td className="px-3 py-2">{isPriced ? item.unit || '' : ''}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{isPriced ? money(item.rate || 0) : ''}</td>
                            <td className="px-3 py-2 text-right font-semibold tabular-nums">{isPriced ? money((item.total || 0) * detailMultiplier) : ''}</td>
                          </tr>
                        );
                      })}
                      {detailItems.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-3 py-8 text-center text-slate-500 dark:text-slate-400">No rows found in the linked source.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-5 text-sm text-slate-500 dark:text-slate-400">
                The linked source bill or section could not be found in the linked estimate project.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HouseTradePackageBudgetStage({
  appraisal,
  option,
  linkedProject,
}: {
  appraisal: DevelopmentAppraisal;
  option: DevelopmentAppraisalOption;
  linkedProject: Project | null;
}) {
  const { trades, setTrades, updateProject } = useAppContext();
  const { askConfirm } = useConfirm();
  const { showToast } = useToast();
  const report = React.useMemo(() => buildAppraisalTradePackageBudget(option), [option]);
  const [openPackageIds, setOpenPackageIds] = React.useState<Set<string>>(() => new Set());
  const tradeByName = React.useMemo(
    () => new Map(trades.map((trade) => [trade.name.trim().toLocaleLowerCase(), trade])),
    [trades],
  );
  const plannedPushRows = React.useMemo(() => report.packages.map((entry) => {
    const trade = tradeByName.get(entry.name.trim().toLocaleLowerCase());
    const existingBudget = trade && linkedProject
      ? linkedProject.tenderTradeStatus?.[trade.id]?.budgetValue
      : undefined;
    return { entry, trade, existingBudget };
  }), [linkedProject, report.packages, tradeByName]);

  const togglePackage = (packageId: string) => {
    setOpenPackageIds((current) => {
      const next = new Set(current);
      if (next.has(packageId)) next.delete(packageId);
      else next.add(packageId);
      return next;
    });
  };

  const pushBudgets = async () => {
    if (!linkedProject || report.packages.length === 0) return;
    const newCount = plannedPushRows.filter((row) => !row.trade).length;
    const existingCount = plannedPushRows.length - newCount;
    const packagePreview = plannedPushRows
      .map(({ entry, trade, existingBudget }) => `${entry.name}: ${money(entry.siteStartAmount)} (${trade ? `existing ${typeof existingBudget === 'number' ? money(existingBudget) : 'not set'}` : 'new shared package'})`)
      .join('; ');
    const confirmed = await askConfirm({
      title: 'Push trade package budgets to Estimate',
      message: `Review: ${packagePreview}. ${existingCount} existing estimate trade budget${existingCount === 1 ? '' : 's'} will be updated and ${newCount} shared trade package${newCount === 1 ? '' : 's'} will be created in ${linkedProject.name}. Bills, priced items, tender returns, and contractor data will not change.`,
      confirmLabel: 'Push budgets',
    });
    if (!confirmed) return;

    const result = applyAppraisalTradePackageBudgetsToEstimate({
      appraisal,
      option,
      report,
      project: linkedProject,
      trades,
    });
    setTrades(result.trades);
    updateProject(linkedProject.id, { tenderTradeStatus: result.project.tenderTradeStatus });
    showToast({
      type: 'success',
      message: `Pushed ${result.updatedTradeNames.length} appraisal trade budget${result.updatedTradeNames.length === 1 ? '' : 's'} to Estimate${result.createdTradeNames.length > 0 ? ` and created ${result.createdTradeNames.length} shared trade package${result.createdTradeNames.length === 1 ? '' : 's'}` : ''}.`,
    });
  };

  return (
    <div className="space-y-3" data-smoke="appraisals-trade-package-budget">
      <section className="rounded-app border border-cyan-200 bg-cyan-50/70 px-3 py-3 dark:border-cyan-900/70 dark:bg-cyan-950/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">Procurement report</div>
            <h4 className="mt-0.5 text-sm font-semibold text-slate-950 dark:text-slate-50">Trade package budget</h4>
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
              Live all-in tender allowances at the expected site-start index. This report does not amend the appraisal Cost Summary or Contingency.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { void pushBudgets(); }}
            disabled={!linkedProject || report.packages.length === 0}
            className="workspace-primary-btn shrink-0 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
            title={linkedProject ? 'Review and push confirmed package budgets to the linked Estimate project' : 'Link an Estimate project in appraisal details before pushing budgets'}
          >
            <Link2 className="h-4 w-4" />
            Push package budgets to Estimate
          </button>
        </div>
        {!linkedProject && (
          <p className="mt-2 border-t border-cyan-200/80 pt-2 text-xs font-medium text-cyan-800 dark:border-cyan-900/70 dark:text-cyan-200">
            Link an Estimate project in appraisal details to push these budgets. The report remains available without a link.
          </p>
        )}
      </section>

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <MetricTile label="Linked Estimate" value={linkedProject?.name || 'Not linked'} tone={linkedProject ? 'good' : 'watch'} />
        <MetricTile label="Option" value={option.name || 'Base option'} />
        <MetricTile label="Expected start" value={formatAppraisalDateLabel(report.expectedStartDate) || 'Not set'} tone={report.expectedStartDate ? 'good' : 'watch'} />
        <MetricTile label="Start index" value={report.startPriceIndex ? formatQuantity(report.startPriceIndex) : 'Not set'} tone={report.startPriceIndex ? 'good' : 'watch'} />
        <MetricTile label="Package total" value={money(report.packageTotal)} tone="good" />
      </section>

      <section className="grid gap-2 sm:grid-cols-3">
        <MetricTile label="Separate allowances" value={money(report.allowanceTotal)} />
        <MetricTile label="Mapped sources" value={formatQuantity(report.mappingCount)} />
        <MetricTile label="Warnings" value={formatQuantity(report.warnings.length)} tone={report.warnings.length > 0 ? 'watch' : 'good'} />
      </section>

      {report.warnings.length > 0 && (
        <section className="rounded-app border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900/70 dark:bg-amber-950/20">
          <div className="text-xs font-semibold text-amber-900 dark:text-amber-100">Package review required</div>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-xs leading-5 text-amber-800 dark:text-amber-200">
            {report.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </section>
      )}

      <section className="overflow-hidden rounded-app border border-slate-200 bg-white dark:border-slate-800 dark:bg-surface-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5 dark:border-slate-800">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tender package budgets</h4>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">One all-in site-start value per package. Expand a row to inspect its source and embedded index movement.</p>
          </div>
          <span className="workspace-chip">{report.packages.length} packages</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-xs">
            <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
              <tr>
                <th className="w-9 px-3 py-2" aria-label="Expand" />
                <th className="px-3 py-2">Package</th>
                <th className="px-3 py-2 text-right">Sources</th>
                <th className="px-3 py-2 text-right">All-in site-start budget</th>
                {linkedProject && <th className="px-3 py-2 text-right">Estimate budget</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {plannedPushRows.map(({ entry, trade, existingBudget }) => {
                const open = openPackageIds.has(entry.id);
                return (
                  <React.Fragment key={entry.id}>
                    <tr className="bg-white dark:bg-surface-900">
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => togglePackage(entry.id)} className="workspace-icon-btn p-1" aria-label={`${open ? 'Hide' : 'Show'} ${entry.name} sources`}>
                          <ChevronRight className={`h-4 w-4 transition ${open ? 'rotate-90' : ''}`} />
                        </button>
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">{entry.name}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatQuantity(entry.sources.length)}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">{money(entry.siteStartAmount)}</td>
                      {linkedProject && (
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                          {trade ? (typeof existingBudget === 'number' ? money(existingBudget) : 'Not set') : 'Create shared package'}
                        </td>
                      )}
                    </tr>
                    {open && (
                      <tr className="bg-slate-50/80 dark:bg-surface-950/40">
                        <td colSpan={linkedProject ? 5 : 4} className="px-3 py-2.5">
                          <div className="overflow-x-auto rounded-app-sm border border-slate-200 dark:border-slate-800">
                            <table className="min-w-[760px] w-full text-left text-[11px]">
                              <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
                                <tr>
                                  <th className="px-3 py-2">Source</th>
                                  <th className="px-3 py-2">Basis</th>
                                  <th className="px-3 py-2 text-right">Base amount</th>
                                  <th className="px-3 py-2 text-right">Embedded index movement</th>
                                  <th className="px-3 py-2 text-right">Site-start total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {entry.sources.map((source) => (
                                  <tr key={source.id}>
                                    <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                                      {source.houseTypeName ? `${source.houseTypeName} - ${source.label}` : source.label}
                                    </td>
                                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{source.mapping || 'Direct source'}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{money(source.baseAmount)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums text-amber-700 dark:text-amber-300">{money(source.indexUplift)}</td>
                                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{money(source.siteStartAmount)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {report.packages.length === 0 && (
                <tr><td colSpan={linkedProject ? 5 : 4} className="px-3 py-8 text-center text-xs text-slate-500 dark:text-slate-400">No procurement package values are available yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-app border border-slate-200 bg-white dark:border-slate-800 dark:bg-surface-900">
        <div className="border-b border-slate-200 px-3 py-2.5 dark:border-slate-800">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Separate allowances</h4>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Prelims, abnormals, custom costs, overheads, finance, LBTT, and sales allowances stay outside procurement trade budgets.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[520px] w-full text-left text-xs">
            <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400"><tr><th className="px-3 py-2">Allowance</th><th className="px-3 py-2 text-right">Amount</th></tr></thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {report.allowances.map((allowance) => <tr key={allowance.id}><td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{allowance.label}</td><td className="px-3 py-2 text-right font-semibold tabular-nums">{money(allowance.amount)}</td></tr>)}
              {report.allowances.length === 0 && <tr><td colSpan={2} className="px-3 py-5 text-center text-slate-500 dark:text-slate-400">No separate allowances are currently included.</td></tr>}
              <tr className="bg-slate-100 font-semibold dark:bg-surface-800"><td className="px-3 py-2 text-slate-900 dark:text-slate-100">Total separate allowances</td><td className="px-3 py-2 text-right tabular-nums text-slate-900 dark:text-slate-100">{money(report.allowanceTotal)}</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function HouseCostSummaryStage({
  option,
  updateOption,
}: {
  option: DevelopmentAppraisalOption;
  updateOption: (optionId: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const summary = summariseHouseBuildingOption(option);
  const metrics = calculateAppraisalOption(option);
  const sellerMetrics = calculateSellerLandPriceMetrics(option);
  const costSummary = buildHouseCostSummary(option);
  const overheadPercent = getHouseBuildingOverheadPercent(option);
  const lbttTotal = calculateLandLbtt(metrics.landValue);
  const baseGdv = calculateOptionBaseGdv(option);
  const salesIndexUplift = calculateSalesIndexationUplift(option, baseGdv);
  const gdvIncentiveCost = calculateGdvIncentiveCost(option, metrics.gdv);
  const customCostProvisions = getCustomCostProvisions(option);
  const customCostProvision = calculateCustomCostProvisionTotal(option);
  const customCostProvisionLabel = customCostProvisions.length === 1
    ? shortCostSummaryLabel(customCostProvisions[0].title || customCostProvisions[0].notes, 'Custom cost provision')
    : `${customCostProvisions.length} custom cost provisions`;
  const structuredCost = costSummary.houseTotal
    + costSummary.infrastructureTotal
    + costSummary.plotWorksTotal
    + costSummary.prelimsTotal
    + costSummary.otherSiteTotal
    + summary.constructionContingency
    + costSummary.overheadsTotal;
  const totalBuildCost = metrics.nonLandCost;
  const costBuildUpRows: Array<{ id: string; label: string; amount: number; highlight?: boolean }> = [
    { id: 'private-houses', label: 'Private house construction', amount: costSummary.privateHouseTotal },
    { id: 'affordable-houses', label: 'Affordable house construction', amount: costSummary.affordableHouseTotal },
    { id: 'infrastructure', label: 'Infrastructure', amount: costSummary.infrastructureTotal },
    { id: 'plot-works', label: 'Plot works', amount: costSummary.plotWorksTotal },
    { id: 'prelims', label: 'Prelims', amount: costSummary.prelimsTotal },
    ...(costSummary.otherSiteTotal > 0 ? [{ id: 'other-site', label: 'Other site costs', amount: costSummary.otherSiteTotal }] : []),
    { id: 'contingency', label: 'Contingency', amount: summary.constructionContingency },
    {
      id: 'custom-cost',
      label: customCostProvisionLabel,
      amount: customCostProvision,
      highlight: customCostProvision > 0,
    },
    { id: 'abnormals', label: 'Site additions and abnormal base', amount: costSummary.abnormalsTotal },
    { id: 'gdv-incentive', label: 'Private sales incentive', amount: gdvIncentiveCost },
    { id: 'lbtt', label: 'LBTT', amount: lbttTotal },
    { id: 'overheads', label: `Overheads (${formatQuantity(overheadPercent)}%)`, amount: costSummary.overheadsTotal },
  ];

  return (
    <div data-smoke="appraisals-cost-summary" className="space-y-4">
      <SiteCostSummary option={option} infrastructureBase={costSummary.infrastructureTotal} plotWorksBase={costSummary.plotWorksTotal} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricTile label="Total non-land cost" value={money(totalBuildCost)} tone={totalBuildCost > 0 ? 'good' : 'watch'} />
        <MetricTile label="Structured subtotal" value={money(structuredCost)} />
        <MetricTile label="Private houses" value={money(costSummary.privateHouseTotal)} />
        <MetricTile label="Affordable houses" value={money(costSummary.affordableHouseTotal)} />
        <MetricTile label="Infrastructure base" value={money(costSummary.infrastructureTotal)} />
        <MetricTile label="Plot works base" value={money(costSummary.plotWorksTotal)} />
        <MetricTile label="Prelims" value={money(costSummary.prelimsTotal)} />
        <MetricTile label="LBTT" value={money(lbttTotal)} />
        <MetricTile label="Contingency" value={money(summary.constructionContingency)} tone={summary.constructionContingency > 0 ? 'watch' : 'default'} />
        <MetricTile label="Custom provision" value={money(customCostProvision)} tone={customCostProvision > 0 ? 'watch' : 'default'} />
        <MetricTile label={`Overheads (${formatQuantity(overheadPercent)}%)`} value={money(costSummary.overheadsTotal)} />
        <MetricTile label={`Private sales incentive (${formatQuantity(option.gdvIncentivePercent || 0)}%)`} value={money(gdvIncentiveCost)} tone={gdvIncentiveCost > 0 ? 'watch' : 'default'} />
        {option.salesIndexationEnabled ? (
          <MetricTile label={salesIndexUpliftLabel(option)} value={money(salesIndexUplift)} tone={salesIndexUplift > 0 ? 'good' : 'default'} />
        ) : null}
        <MetricTile label="Site additions and abnormal base" value={money(costSummary.abnormalsTotal)} />
      </div>
      {sellerMetrics ? (
        <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
          <div className="mb-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Seller land price analysis</div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Separate profit analysis based on the likely lowest land price the seller would accept.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile label="Seller land price" value={money(sellerMetrics.landValue)} />
            <MetricTile label="Profit" value={money(sellerMetrics.profit)} tone={sellerMetrics.profit >= 0 ? 'good' : 'bad'} />
            <MetricTile label="Profit/GDV" value={`${sellerMetrics.profitOnGdvPercent.toFixed(1)}%`} tone={sellerMetrics.profitOnGdvPercent >= option.targetProfitOnGdvPercent ? 'good' : 'watch'} />
            <MetricTile label="Finance at seller price" value={money(sellerMetrics.financeCost)} />
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-app border border-slate-200 bg-white dark:border-slate-800 dark:bg-surface-900">
        <div className="border-b border-slate-200 px-3 py-3 dark:border-slate-800">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Cost build-up</div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Summary of the costs feeding the total non-land cost. Detailed bills and allowances remain in their own tabs.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[520px] w-full text-left text-xs">
            <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-surface-900">
              {costBuildUpRows.map((row) => (
                <tr key={row.id} className={row.highlight ? 'bg-amber-50/60 dark:bg-amber-950/20' : undefined}>
                  <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">{row.label}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">{money(row.amount)}</td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-semibold dark:bg-surface-800">
                <td className="px-3 py-2 text-slate-900 dark:text-slate-100">Total non-land cost</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-900 dark:text-slate-100">{money(totalBuildCost)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="rounded-app border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-surface-900">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,16rem)_auto_1fr] sm:items-end">
          <NumberField
            label="Overheads %"
            value={overheadPercent}
            onChange={(value) => updateOption(option.id, (current) => ({ ...current, overheadPercent: Math.max(0, value) }))}
          />
          <button
            type="button"
            onClick={() => updateOption(option.id, (current) => ({ ...current, overheadPercent: HOUSE_BUILDING_OVERHEAD_PERCENT }))}
            className="rounded-app-sm border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-surface-800"
          >
            Reset to {HOUSE_BUILDING_OVERHEAD_PERCENT}%
          </button>
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            Applies to base house costs, infrastructure, plot works, prelims, contingency, and abnormals.
          </p>
        </div>
      </div>

    </div>
  );
}

type CostSummarySiteRow = {
  id: string;
  label: string;
  quantity: number;
  unit: string;
  rate: number;
  baseCost: number;
  indexCost: number;
  total: number;
  startContingency: number;
  costAtSiteStart: number;
  costDriver?: AppraisalInfrastructureCostDriver;
  sourceRow?: string;
};

type CostSummaryPrelimSection = {
  id: string;
  label: string;
  rows: CostSummarySiteRow[];
  total: number;
};

type CostSummaryCostLineRow = {
  id: string;
  label: string;
  amount: number;
  notes?: string;
};

function appraisalPriceIndexFactor(rowPriceIndex: unknown, option: DevelopmentAppraisalOption) {
  const baseIndex = Math.max(0, Number(rowPriceIndex) || 0);
  const targetIndex = Math.max(0, Number(option.programme?.appraisalPriceIndex) || 0);
  if (baseIndex > 0 && targetIndex > 0) return Math.max(1, targetIndex / baseIndex);
  return 1;
}

function indexedCostParts(baseCost: number, rowPriceIndex: unknown, option: DevelopmentAppraisalOption) {
  const factor = appraisalPriceIndexFactor(rowPriceIndex, option);
  const total = baseCost * factor;
  return {
    baseCost,
    indexCost: total - baseCost,
    total,
  };
}

function isRatePackRow(row: AppraisalSiteDimensionRow, prefix: string) {
  return Boolean(row.libraryRateId?.startsWith(`${prefix}-`));
}

function prelimSectionForRow(row: AppraisalSiteDimensionRow) {
  if (row.libraryRateId === 'awd-prelims-site-investigations' || row.libraryRateId?.startsWith(PRELIMS_SURVEY_RATE_PREFIX))
    return AWD_PRELIMS_RATE_SECTIONS.find(section => section.id === 'REPORTS') || null;
  const definition = AWD_PRELIMS_RATE_DEFINITIONS.find((entry) => entry.id === row.libraryRateId);
  return AWD_PRELIMS_RATE_SECTIONS.find((section) => section.id === definition?.section) || null;
}

function toSiteSummaryRow(row: AppraisalSiteDimensionRow, option: DevelopmentAppraisalOption): CostSummarySiteRow {
  const quantity = resolveSiteDimensionQuantity(row, option);
  const costs = indexedCostParts(calculateSiteDimensionTotal(row, option), siteDimensionEffectivePriceIndex(row, option), option);
  const startContingency = calculateSiteDimensionStartPriceIndexContingency(row, option);
  return {
    id: row.id,
    label: row.label || APPRAISAL_SITE_DIMENSION_LABELS[row.category],
    quantity,
    unit: row.unit,
    rate: row.rate,
    baseCost: costs.baseCost,
    indexCost: costs.indexCost,
    total: costs.total,
    startContingency,
    costAtSiteStart: costs.baseCost + startContingency,
    costDriver: row.costDriver,
    sourceRow: row.sourceRow,
  };
}

function buildHouseCostSummary(option: DevelopmentAppraisalOption) {
  const houseRows = (option.houseTypeSchedule || []).map((row) => {
    const quantity = Math.max(0, Number(row.quantity) || 0);
    const baseCost = calculateHouseTypeConstructionTotal(row);
    const total = calculateIndexedHouseTypeConstructionTotal(row, option.programme);
    const costs = {
      baseCost,
      indexCost: total - baseCost,
      total,
    };
    const startContingency = calculateHouseTypeStartPriceIndexContingency(row, option.programme);
    return {
      id: row.id,
      label: row.houseTypeName || 'House type',
      quantity,
      costPerHouse: quantity > 0 ? costs.baseCost / quantity : 0,
      baseCost: costs.baseCost,
      indexCost: costs.indexCost,
      total: costs.total,
      startContingency,
      costAtSiteStart: costs.baseCost + startContingency,
      tenure: row.tenure || 'PRIVATE',
    };
  });

  const siteRows = (option.siteDimensions || [])
    .filter((row) => !row.isCostDriverInput && !isAbnormalRemovalRow(row))
    .map((row) => ({ source: row, summary: toSiteSummaryRow(row, option) }));
  const infrastructureRows = siteRows
    .filter(({ source }) => isSiteMetricRowForSection(source, 'INFRASTRUCTURE'))
    .map(({ summary }) => summary);
  const plotWorksRows = siteRows
    .filter(({ source }) => isSiteMetricRowForSection(source, 'PLOT_WORKS'))
    .map(({ summary }) => summary);
  const prelimRows = siteRows
    .filter(({ source }) => isSiteMetricRowForSection(source, 'PRELIMS'));
  const otherSiteRows = siteRows
    .filter(({ source }) => (
      !isSiteMetricRowForSection(source, 'INFRASTRUCTURE')
      && !isSiteMetricRowForSection(source, 'PLOT_WORKS')
      && !isSiteMetricRowForSection(source, 'PRELIMS')
    ))
    .map(({ summary }) => summary);
  const abnormalRows = (option.costLines || [])
    .filter(isSiteCostElement)
    .map((line): CostSummaryCostLineRow => ({
      id: line.id,
      label: line.title || 'Abnormal',
      amount: calculateCostLineAmount(line, option),
      notes: line.notes,
    }));

  const prelimSections = AWD_PRELIMS_RATE_SECTIONS
    .map((section): CostSummaryPrelimSection => {
      const rows = prelimRows
        .filter(({ source }) => prelimSectionForRow(source)?.id === section.id)
        .map(({ summary }) => summary);
      return {
        id: section.id,
        label: section.label,
        rows,
        total: rows.reduce((total, row) => total + row.baseCost, 0),
      };
    })
    .filter((section) => section.rows.length > 0);
  const knownPrelimIds = new Set(prelimSections.flatMap((section) => section.rows.map((row) => row.id)));
  const ungroupedPrelims = prelimRows
    .map(({ summary }) => summary)
    .filter((row) => !knownPrelimIds.has(row.id));
  if (ungroupedPrelims.length > 0) {
    prelimSections.push({
      id: 'OTHER_PRELIMS',
      label: 'Other Prelims',
      rows: ungroupedPrelims,
      total: ungroupedPrelims.reduce((total, row) => total + row.baseCost, 0),
    });
  }

  const houseTotal = houseRows.reduce((total, row) => total + row.baseCost, 0);
  const privateHouseTotal = houseRows
    .filter((row) => row.tenure !== 'AFFORDABLE')
    .reduce((total, row) => total + row.baseCost, 0);
  const affordableHouseTotal = houseRows
    .filter((row) => row.tenure === 'AFFORDABLE')
    .reduce((total, row) => total + row.baseCost, 0);
  const infrastructureTotal = infrastructureRows.reduce((total, row) => total + row.baseCost, 0);
  const plotWorksTotal = plotWorksRows.reduce((total, row) => total + row.baseCost, 0);
  const prelimsTotal = prelimSections.reduce((total, section) => total + section.total, 0);
  const otherSiteTotal = otherSiteRows.reduce((total, row) => total + row.baseCost, 0);
  const abnormalsTotal = abnormalRows.reduce((total, row) => total + row.amount, 0) + Math.max(0, option.abnormalBaseAllowance || 0);
  if ((option.abnormalBaseAllowance || 0) > 0) abnormalRows.unshift({ id: 'site-abnormal-base', label: 'Abnormals base allowance', amount: option.abnormalBaseAllowance || 0 });
  const overheadsTotal = calculateHouseBuildingOverheadCost(option);

  return {
    houseRows,
    houseTotal,
    privateHouseTotal,
    affordableHouseTotal,
    infrastructureRows,
    infrastructureTotal,
    plotWorksRows,
    plotWorksTotal,
    prelimSections,
    prelimsTotal,
    abnormalRows,
    abnormalsTotal,
    otherSiteRows,
    otherSiteTotal,
    overheadsTotal,
  };
}

const HousePricesCommentControl = React.memo(function HousePricesCommentControl({
  optionId,
  savedComment,
  updateOption,
}: {
  optionId: string;
  savedComment?: string;
  updateOption: (optionId: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(savedComment || '');
  const hasComment = Boolean(savedComment?.trim());

  React.useEffect(() => {
    if (!open) setDraft(savedComment || '');
  }, [open, optionId, savedComment]);

  const openEditor = () => {
    setDraft(savedComment || '');
    setOpen(true);
  };
  const saveComment = () => {
    updateOption(optionId, (current) => ({ ...current, housePricesComment: draft }));
    setOpen(false);
  };

  return (
    <div className="relative flex justify-end">
      <button
        type="button"
        onClick={openEditor}
        className={`workspace-secondary-btn h-9 w-9 justify-center p-0 ${hasComment ? 'border-primary-300 text-primary-700 dark:border-primary-700 dark:text-primary-200' : ''}`}
        aria-label="Housing number comments"
        title="Housing number comments"
      >
        <MessageSquareText className="h-4 w-4" />
        {hasComment && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary-500" aria-hidden="true" />}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 w-[min(32rem,calc(100vw-4rem))] rounded-app border border-slate-200 bg-white p-4 text-left shadow-xl dark:border-slate-700 dark:bg-surface-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Housing number comments</h4>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Review notes only. These comments do not change the appraisal totals.
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="workspace-icon-btn" aria-label="Close housing number comments">
              <X className="h-4 w-4" />
            </button>
          </div>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add notes on housing numbers that may change the appraisal later."
            rows={6}
            className={`${inputClass('min-h-[9rem]')} mt-3 resize-y`}
          />
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="workspace-secondary-btn px-3 py-2 text-xs">
              Cancel
            </button>
            <button type="button" onClick={saveComment} className="workspace-primary-btn px-3 py-2 text-xs">
              Save comments
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

function CustomGdvStage({
  option,
  updateOption,
}: {
  option: DevelopmentAppraisalOption;
  updateOption: (optionId: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const [amountDraft, setAmountDraft] = React.useState(sterlingInputValue(option.customGdvAdditionAmount));
  const [noteDraft, setNoteDraft] = React.useState(option.customGdvAdditionNote || '');
  const housingSummary = summariseHouseBuildingOption(option);
  const customAmount = Math.max(0, option.customGdvAdditionAmount || 0);
  const baseGdv = calculateOptionBaseGdv(option);
  const indexedGdv = calculateOptionGdv(option);
  const salesIndexUplift = calculateSalesIndexationUplift(option, baseGdv);

  React.useEffect(() => {
    setAmountDraft(sterlingInputValue(option.customGdvAdditionAmount));
    setNoteDraft(option.customGdvAdditionNote || '');
  }, [option.id, option.customGdvAdditionAmount, option.customGdvAdditionNote]);

  const commitAmount = (value: string) => {
    const amount = currencyInputNumber(value);
    setAmountDraft(sterlingInputValue(amount));
    updateOption(option.id, (current) => ({ ...current, customGdvAdditionAmount: amount }));
  };
  const commitNote = (value: string) => {
    updateOption(option.id, (current) => ({ ...current, customGdvAdditionNote: value.trim() }));
  };
  const clearCustomGdv = () => {
    setAmountDraft('');
    setNoteDraft('');
    updateOption(option.id, (current) => ({ ...current, customGdvAdditionAmount: 0, customGdvAdditionNote: '' }));
  };

  return (
    <div data-smoke="appraisals-custom-gdv" className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="House sales GDV" value={money(housingSummary.gdv)} tone={housingSummary.gdv > 0 ? 'good' : 'watch'} />
        <MetricTile label="Custom GDV addition" value={money(customAmount)} tone={customAmount > 0 ? 'good' : 'default'} />
        <MetricTile label="Base GDV" value={money(baseGdv)} tone={baseGdv > 0 ? 'good' : 'watch'} />
        <MetricTile label={option.salesIndexationEnabled ? 'Indexed total GDV' : 'Total GDV'} value={money(indexedGdv)} tone={indexedGdv > 0 ? 'good' : 'watch'} />
      </div>

      <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Custom GDV / GSV addition</div>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Use this for a separate revenue allowance that is not represented by the house type sales schedule.
            </p>
          </div>
          {(customAmount > 0 || noteDraft.trim()) && (
            <button type="button" onClick={clearCustomGdv} className="workspace-secondary-btn px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
              <Trash2 className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,18rem)_1fr]">
          <label>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Addition amount</span>
            <input
              type="text"
              inputMode="decimal"
              value={amountDraft}
              onChange={(event) => setAmountDraft(event.target.value)}
              onBlur={(event) => commitAmount(event.currentTarget.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
              placeholder="£0"
              className={`${inputClass('text-right tabular-nums')} mt-1`}
            />
          </label>
          <label>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Note</span>
            <input
              type="text"
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              onBlur={(event) => commitNote(event.currentTarget.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
              placeholder="e.g. grant funding, commercial receipt, additional premium"
              className={`${inputClass()} mt-1`}
            />
          </label>
        </div>

        <div className="mt-4 rounded-app-sm border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-surface-950 dark:text-slate-300">
          The custom amount is added to base GDV/GSV before sales indexation. Current sales index uplift on the combined base is {money(salesIndexUplift)}.
        </div>
      </section>
    </div>
  );
}

function CustomCostProvisionStage({
  appraisal,
  option,
  updateOption,
}: {
  appraisal: DevelopmentAppraisal;
  option: DevelopmentAppraisalOption;
  updateOption: (optionId: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const { appSettings } = useAppContext();
  const { showToast } = useToast();
  const [amountDraft, setAmountDraft] = React.useState('');
  const [noteDraft, setNoteDraft] = React.useState('');
  const [aiCostMode, setAiCostMode] = React.useState<CustomHouseCostMode>('QUICK');
  const [isAssessingCost, setIsAssessingCost] = React.useState(false);
  const [guidedQuestion, setGuidedQuestion] = React.useState('');
  const [guidedAnswer, setGuidedAnswer] = React.useState('');
  const [guidedAnswers, setGuidedAnswers] = React.useState<GuidedCustomCostAnswer[]>([]);
  const metrics = calculateAppraisalOption(option);
  const customCostProvisions = getCustomCostProvisions(option);
  const provisionAmount = calculateCustomCostProvisionTotal(option);
  const overheadPercent = getHouseBuildingOverheadPercent(option);
  const provisionOverhead = provisionAmount * (overheadPercent / 100);
  const draftAmount = currencyInputNumber(amountDraft);
  const hasProvisionDraft = draftAmount > 0 || noteDraft.trim().length > 0;
  const resetGuidedCost = React.useCallback(() => {
    setGuidedQuestion('');
    setGuidedAnswer('');
    setGuidedAnswers([]);
  }, []);

  React.useEffect(() => {
    setAmountDraft('');
    setNoteDraft('');
    resetGuidedCost();
  }, [option.id, resetGuidedCost]);

  const formatAmountDraft = (value: string) => {
    const amount = currencyInputNumber(value);
    setAmountDraft(sterlingInputValue(amount));
  };
  const saveProvision = React.useCallback(() => {
    const amount = currencyInputNumber(amountDraft);
    const note = noteDraft.trim();
    if (amount <= 0 && !note) {
      showToast({ type: 'info', message: 'Enter an amount or note before adding a custom cost.' });
      return;
    }
    const timestamp = new Date().toISOString();
    const nextProvision: AppraisalCustomCostProvision = {
      id: generateId(),
      title: shortCostSummaryLabel(note, 'Custom cost provision'),
      amount,
      notes: note,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    setAmountDraft(sterlingInputValue(amount));
    setNoteDraft(note);
    updateOption(option.id, (current) => ({
      ...current,
      customCostProvisions: [...getCustomCostProvisions(current), nextProvision],
      customCostProvisionAmount: 0,
      customCostProvisionNote: '',
    }));
    setAmountDraft('');
    setNoteDraft('');
    resetGuidedCost();
    showToast({
      type: 'success',
      message: amount > 0
        ? 'Custom cost provision added to the cost summaries.'
        : 'Custom cost provision added.',
    });
  }, [amountDraft, noteDraft, option.id, resetGuidedCost, showToast, updateOption]);
  const handleProvisionKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.currentTarget instanceof HTMLInputElement || event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      saveProvision();
      event.currentTarget.blur();
    }
  };
  const clearDraft = () => {
    setAmountDraft('');
    setNoteDraft('');
    resetGuidedCost();
  };
  const deleteProvision = (provisionId: string) => {
    updateOption(option.id, (current) => ({
      ...current,
      customCostProvisions: getCustomCostProvisions(current).filter((row) => row.id !== provisionId),
      customCostProvisionAmount: 0,
      customCostProvisionNote: '',
    }));
  };
  const buildCustomCostContext = React.useCallback((answers: GuidedCustomCostAnswer[] = []) => {
    const optionMetrics = calculateAppraisalOption(option);
    const houseSummary = summariseHouseBuildingOption(option);
    const abnormalCost = (option.costLines || []).reduce((total, line) => total + calculateCostLineAmount(line, option, optionMetrics.gdv), 0);
    return {
      appraisal: {
        name: appraisal.name,
        reference: appraisal.reference,
        site: appraisal.site || '',
        client: appraisal.client || '',
        appraisalDate: appraisal.appraisalDate || '',
      },
      option: {
        name: option.name,
        calculationMode: option.calculationMode,
        durationMonths: option.durationMonths,
        assumptions: option.assumptions || '',
        customProvisionAmount: currencyInputNumber(amountDraft),
        customProvisionNote: noteDraft,
        customProvisions: getCustomCostProvisions(option).map((row) => ({
          title: row.title,
          amount: row.amount,
          notes: row.notes || '',
        })),
      },
      costSummary: {
        gdv: optionMetrics.gdv,
        houseConstructionCost: houseSummary.houseConstructionCost,
        siteWorksCost: houseSummary.siteWorksCost,
        abnormalCost,
        nonLandCost: optionMetrics.nonLandCost,
        landValue: optionMetrics.landValue,
        profit: optionMetrics.profit,
        profitOnGdvPercent: optionMetrics.profitOnGdvPercent,
      },
      houseSummary,
      siteMetrics: (option.siteDimensions || []).map((row) => ({
        label: row.label,
        costDriver: row.costDriver,
        unit: row.unit,
        quantity: row.quantity,
        rate: row.rate,
        notes: row.notes || '',
      })),
      existingCostLines: (option.costLines || []).map((line) => ({
        title: line.title,
        category: line.category,
        amount: line.amount,
        notes: line.notes || '',
      })),
      guidedQuestionAnswerHistory: answers,
    };
  }, [amountDraft, appraisal.appraisalDate, appraisal.client, appraisal.name, appraisal.reference, appraisal.site, noteDraft, option]);
  const applyAiCustomCost = React.useCallback((assessment: { amount: number; confidence: 'LOW' | 'MEDIUM' | 'HIGH'; summary: string }, label = 'AI assessed provision') => {
    const amount = Math.max(0, Math.round(assessment.amount || 0));
    const nextNote = [
      noteDraft.trim(),
      `${label}: ${assessment.summary}`,
      `Assessed amount: ${money(amount)}. Confidence: ${assessment.confidence}.`,
    ].filter(Boolean).join('\n\n');
    setAmountDraft(sterlingInputValue(amount));
    setNoteDraft(nextNote);
  }, [noteDraft]);
  const assessCustomCostProvision = React.useCallback(async () => {
    if (!noteDraft.trim()) {
      showToast({ type: 'info', message: 'Enter a note explaining what the custom cost provision covers before asking AI.' });
      return;
    }
    setIsAssessingCost(true);
    try {
      const result = await generateCustomCostProvisionAssessment(buildCustomCostContext(), appSettings.ai);
      if (result.ok) {
        applyAiCustomCost(result.data);
        showToast({ type: 'success', message: 'Custom cost provision assessed. Save it to add the row.' });
      } else if (result.ok === false) {
        showToast({ type: 'error', message: result.error || 'Custom cost provision assessment failed.' });
      }
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Custom cost provision assessment failed.' });
    } finally {
      setIsAssessingCost(false);
    }
  }, [appSettings.ai, applyAiCustomCost, buildCustomCostContext, noteDraft, showToast]);
  const runGuidedCustomCostStep = React.useCallback(async () => {
    if (!noteDraft.trim() && !guidedQuestion) {
      showToast({ type: 'info', message: 'Enter a short note for the custom provision, or start by describing what it should cover.' });
      return;
    }
    const trimmedAnswer = guidedAnswer.trim();
    if (guidedQuestion && !trimmedAnswer) {
      showToast({ type: 'info', message: 'Answer the current AI question before continuing, or reset the guided costing.' });
      return;
    }
    const nextAnswers = guidedQuestion
      ? [...guidedAnswers, { question: guidedQuestion, answer: trimmedAnswer }]
      : guidedAnswers;
    setIsAssessingCost(true);
    try {
      const result = await generateCustomCostProvisionGuidanceStep(buildCustomCostContext(nextAnswers), appSettings.ai);
      if (result.ok === false) {
        setGuidedAnswers(nextAnswers);
        setGuidedAnswer('');
        setGuidedQuestion(nextFallbackGuidedCustomCostQuestion(noteDraft, nextAnswers));
        showToast({
          type: 'info',
          message: `${result.error || 'Guided custom cost provision assessment is unavailable.'} A fallback costing question has been shown so you can continue.`,
          duration: 6500,
        });
        return;
      }
      setGuidedAnswers(nextAnswers);
      setGuidedAnswer('');
      if (result.data.needsClarification) {
        setGuidedQuestion(result.data.question);
        showToast({ type: 'info', message: 'AI has asked the next custom cost question.' });
        return;
      }
      setGuidedQuestion('');
      applyAiCustomCost(result.data, 'Guided AI assessed provision');
      showToast({ type: 'success', message: 'Guided custom cost provision assessed. Save it to add the row.' });
    } catch (error) {
      setGuidedAnswers(nextAnswers);
      setGuidedAnswer('');
      setGuidedQuestion(nextFallbackGuidedCustomCostQuestion(noteDraft, nextAnswers));
      showToast({
        type: 'info',
        message: `${error instanceof Error ? error.message : 'Guided custom cost provision assessment is unavailable.'} A fallback costing question has been shown so you can continue.`,
        duration: 6500,
      });
    } finally {
      setIsAssessingCost(false);
    }
  }, [appSettings.ai, applyAiCustomCost, buildCustomCostContext, guidedAnswer, guidedAnswers, guidedQuestion, noteDraft, showToast]);

  return (
    <div data-smoke="appraisals-custom-cost" className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="Custom provision" value={money(provisionAmount)} tone={provisionAmount > 0 ? 'watch' : 'default'} />
        <MetricTile label={`Related overhead (${formatQuantity(overheadPercent)}%)`} value={money(provisionOverhead)} tone={provisionOverhead > 0 ? 'watch' : 'default'} />
        <MetricTile label="Non-land cost" value={money(metrics.nonLandCost)} tone={metrics.nonLandCost > 0 ? 'watch' : 'default'} />
        <MetricTile label={option.calculationMode === 'RESIDUAL_LAND_VALUE' ? 'Residual land value' : 'Profit'} value={money(option.calculationMode === 'RESIDUAL_LAND_VALUE' ? metrics.landValue : metrics.profit)} tone={metrics.profit >= 0 ? 'good' : 'bad'} />
      </div>

      <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Add custom cost provision</div>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Add separate cost allowances that are not represented elsewhere in the appraisal model.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {hasProvisionDraft ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
                Draft
              </span>
            ) : customCostProvisions.length > 0 ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200">
                {customCostProvisions.length} saved
              </span>
            ) : null}
            {hasProvisionDraft && (
              <button type="button" onClick={clearDraft} className="workspace-secondary-btn px-3 py-2 text-xs">
                <X className="h-4 w-4" />
                Clear draft
              </button>
            )}
            <button
              type="button"
              onClick={saveProvision}
              disabled={!hasProvisionDraft}
              className="workspace-primary-btn px-3 py-2 text-xs disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Add provision
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,18rem)_1fr]">
          <label>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Provision amount</span>
            <input
              type="text"
              inputMode="decimal"
              value={amountDraft}
              onChange={(event) => setAmountDraft(event.target.value)}
              onBlur={(event) => formatAmountDraft(event.currentTarget.value)}
              onKeyDown={handleProvisionKeyDown}
              placeholder="£0"
              className={`${inputClass('text-right tabular-nums')} mt-1`}
            />
          </label>
          <label>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Note</span>
            <textarea
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              onBlur={(event) => setNoteDraft(event.currentTarget.value.trim())}
              onKeyDown={handleProvisionKeyDown}
              placeholder="e.g. risk allowance, legal provision, purchaser requirement"
              className={`${inputClass('min-h-[4.5rem]')} mt-1`}
            />
          </label>
        </div>
        {hasProvisionDraft ? (
          <div className="mt-3 rounded-app-sm border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
            Add the draft provision to include it in the cost summary, non-land cost, overhead calculation, cashflow, and final report.
          </div>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-app border border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-slate-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
            <span>Saved custom costs</span>
            <span className="text-right">Amount</span>
            <span className="sr-only">Actions</span>
          </div>
          <div className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-surface-900">
            {customCostProvisions.length > 0 ? customCostProvisions.map((row) => (
              <div key={row.id} className="grid grid-cols-[1fr_auto_auto] items-start gap-3 px-3 py-2 text-xs">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{shortCostSummaryLabel(row.title || row.notes, 'Custom cost provision')}</div>
                  {row.notes ? <div className="mt-1 line-clamp-2 text-slate-500 dark:text-slate-400">{row.notes}</div> : null}
                </div>
                <div className="text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100">{money(row.amount)}</div>
                <button
                  type="button"
                  onClick={() => deleteProvision(row.id)}
                  className="rounded-app-sm border border-slate-200 p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:hover:bg-rose-950/30 dark:hover:text-rose-200"
                  aria-label={`Delete ${row.title || 'custom cost provision'}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )) : (
              <div className="px-3 py-4 text-xs text-slate-500 dark:text-slate-400">No custom cost provisions have been added yet.</div>
            )}
          </div>
        </div>

        <section className="mt-4 rounded-app border border-primary-100 bg-primary-50/50 p-3 dark:border-primary-900/60 dark:bg-primary-950/20">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-700 dark:text-primary-200">AI cost assessment</div>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600 dark:text-slate-300">
                Choose a quick provision assessment, or let AI ask focused questions until it has enough information to price the allowance.
              </p>
            </div>
            <div className="inline-flex rounded-app border border-primary-200 bg-white p-1 text-xs dark:border-primary-900 dark:bg-surface-950">
              <button
                type="button"
                onClick={() => {
                  setAiCostMode('QUICK');
                  resetGuidedCost();
                }}
                className={`rounded-app-sm px-3 py-1.5 font-semibold transition ${aiCostMode === 'QUICK' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-surface-900'}`}
              >
                Current calculation
              </button>
              <button
                type="button"
                onClick={() => {
                  setAiCostMode('GUIDED');
                  resetGuidedCost();
                }}
                className={`rounded-app-sm px-3 py-1.5 font-semibold transition ${aiCostMode === 'GUIDED' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-surface-900'}`}
              >
                Guided AI questions
              </button>
            </div>
          </div>

          {aiCostMode === 'QUICK' ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-app border border-primary-100 bg-white/70 p-3 dark:border-primary-900/60 dark:bg-surface-950/60">
              <p className="max-w-3xl text-xs leading-5 text-slate-600 dark:text-slate-300">
                Uses the custom provision note, appraisal costs, house mix, site metrics, and existing allowances to suggest a cautious separate cost.
              </p>
              <button
                type="button"
                onClick={() => { void assessCustomCostProvision(); }}
                disabled={isAssessingCost}
                className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {isAssessingCost ? 'Assessing...' : 'Assess provision with AI'}
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-3 rounded-app border border-primary-100 bg-white/80 p-3 dark:border-primary-900/60 dark:bg-surface-950/60">
              {guidedAnswers.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Answered so far</div>
                  {guidedAnswers.map((entry, index) => (
                    <div key={`${entry.question}-${index}`} className="rounded-app-sm border border-slate-200 bg-slate-50 p-2 text-xs dark:border-slate-800 dark:bg-surface-900">
                      <div className="font-semibold text-slate-800 dark:text-slate-100">{entry.question}</div>
                      <div className="mt-1 leading-5 text-slate-600 dark:text-slate-300">{entry.answer}</div>
                    </div>
                  ))}
                </div>
              )}

              {guidedQuestion ? (
                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-700 dark:text-primary-200">Current AI question</span>
                  <div className="mt-1 rounded-app border border-primary-200 bg-primary-50/70 p-3 text-sm font-semibold text-slate-900 dark:border-primary-900 dark:bg-primary-950/20 dark:text-slate-100">
                    {guidedQuestion}
                  </div>
                  <textarea
                    value={guidedAnswer}
                    onChange={(event) => setGuidedAnswer(event.target.value)}
                    placeholder="Answer the AI question here..."
                    className={`${inputClass('mt-2 min-h-[4.5rem]')}`}
                  />
                </label>
              ) : (
                <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                  Start guided costing and AI will ask the most important missing question first. It can continue asking until there is enough detail to produce the provision.
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                {(guidedQuestion || guidedAnswers.length > 0) && (
                  <button
                    type="button"
                    onClick={resetGuidedCost}
                    disabled={isAssessingCost}
                    className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset questions
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { void runGuidedCustomCostStep(); }}
                  disabled={isAssessingCost}
                  className="workspace-primary-btn px-3 py-2 text-xs disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  {isAssessingCost ? 'Thinking...' : guidedQuestion ? 'Submit answer' : 'Start guided AI'}
                </button>
              </div>
            </div>
          )}
        </section>

        <div className="mt-4 rounded-app-sm border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-surface-950 dark:text-slate-300">
          Saved provisions are added to non-land costs and overheads are calculated on them. They are shown separately in the cost summary and final report.
        </div>
      </section>
    </div>
  );
}

function HousePricesStage({
  appraisal,
  option,
  setStage,
  updateOption,
}: {
  appraisal: DevelopmentAppraisal;
  option: DevelopmentAppraisalOption;
  setStage: React.Dispatch<React.SetStateAction<HouseStage>>;
  updateOption: (optionId: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const { showToast } = useToast();
  const [pricingMode, setPricingMode] = React.useState<SalesPricingMode>('ACTUAL_PRICE');
  const [developmentRateFt2, setDevelopmentRateFt2] = React.useState('');
  const [actualPriceDrafts, setActualPriceDrafts] = React.useState<Record<string, string>>({});
  type HousePriceDisplayRow = {
    key: string;
    parentId: string;
    salesRowId?: string;
    houseTypeName: string;
    tenure?: AppraisalHouseTypeScheduleRow['tenure'];
    quantity: number;
    gifaM2: number;
    saleValuePerUnit?: number;
    saleRatePerM2?: number;
    parentRow: AppraisalHouseTypeScheduleRow;
  };
  const rows = option.houseTypeSchedule || [];
  const priceRows = React.useMemo<HousePriceDisplayRow[]>(() => rows.flatMap((row) => {
    const salesRows = getHouseTypeSalesRows(row);
    if (salesRows.length > 0) {
      return salesRows.map((salesRow) => ({
        key: `${row.id}::${salesRow.id}`,
        parentId: row.id,
        salesRowId: salesRow.id,
        houseTypeName: salesRow.label,
        tenure: row.tenure,
        quantity: salesRow.quantity,
        gifaM2: salesRow.gifaM2,
        saleValuePerUnit: salesRow.saleValuePerUnit || row.saleValuePerUnit || 0,
        saleRatePerM2: salesRow.saleRatePerM2 || row.saleRatePerM2 || 0,
        parentRow: row,
      }));
    }
    return [{
      key: row.id,
      parentId: row.id,
      houseTypeName: row.houseTypeName,
      tenure: row.tenure,
      quantity: calculateHouseTypeSalesQuantity(row),
      gifaM2: row.gifaM2,
      saleValuePerUnit: row.saleValuePerUnit || 0,
      saleRatePerM2: row.saleRatePerM2 || 0,
      parentRow: row,
    }];
  }), [rows]);
  const scheduleWithDraftPrices = React.useMemo(() => rows.map((row) => {
    const salesRows = getHouseTypeSalesRows(row);
    if (pricingMode === 'ACTUAL_PRICE' && salesRows.length > 0) {
      return {
        ...row,
        salesRows: salesRows.map((salesRow) => {
          const key = `${row.id}::${salesRow.id}`;
          return {
            ...salesRow,
            saleValuePerUnit: currencyInputNumber(actualPriceDrafts[key] ?? sterlingInputValue(salesRow.saleValuePerUnit || row.saleValuePerUnit)),
            saleRatePerM2: 0,
          };
        }),
        saleValuePerUnit: 0,
        saleRatePerM2: 0,
      };
    }
    if (pricingMode === 'ACTUAL_PRICE') {
      return {
        ...row,
        saleValuePerUnit: currencyInputNumber(actualPriceDrafts[row.id] ?? sterlingInputValue(row.saleValuePerUnit)),
        saleRatePerM2: 0,
      };
    }
    return row;
  }), [actualPriceDrafts, pricingMode, rows]);
  const pricedRows = pricingMode === 'ACTUAL_PRICE'
    ? scheduleWithDraftPrices
    : rows;
  const pricedOption = pricingMode === 'ACTUAL_PRICE'
    ? { ...option, houseTypeSchedule: pricedRows }
    : option;
  const summary = summariseHouseBuildingOption(pricedOption);
  const averageSaleRateFt2 = ft2RateFromM2Rate(summary.averageSaleValuePerM2);
  const baseGdv = calculateOptionBaseGdv(pricedOption);
  const gdv = calculateOptionGdv(pricedOption);
  const salesIndexUplift = calculateSalesIndexationUplift(pricedOption, baseGdv);
  const gdvIncentiveCost = calculateGdvIncentiveCost(pricedOption, gdv);
  const gdvIncentiveBase = calculateGdvIncentiveBase(pricedOption, gdv);
  React.useEffect(() => {
    if (developmentRateFt2 || averageSaleRateFt2 <= 0) return;
    setDevelopmentRateFt2(String(Math.round(averageSaleRateFt2)));
  }, [averageSaleRateFt2, developmentRateFt2]);
  React.useEffect(() => {
    setActualPriceDrafts(Object.fromEntries(priceRows.map((row) => [row.key, sterlingInputValue(row.saleValuePerUnit)])));
  }, [priceRows]);
  const updateHouseSalePricingRow = (displayRow: HousePriceDisplayRow, patch: Partial<AppraisalHouseTypeSalesRow & AppraisalHouseTypeScheduleRow>) => {
    updateOption(option.id, (current) => ({
      ...current,
      houseTypeSchedule: (current.houseTypeSchedule || []).map((row) => {
        if (row.id !== displayRow.parentId) return row;
        if (!displayRow.salesRowId) return { ...row, ...patch };
        const salesRows = getHouseTypeSalesRows(row);
        return {
          ...row,
          salesRows: salesRows.map((salesRow) => salesRow.id === displayRow.salesRowId ? { ...salesRow, ...patch } : salesRow),
          saleValuePerUnit: 0,
          saleRatePerM2: 0,
        };
      }),
    }));
  };
  const updateActualPriceDraft = (rowId: string, value: string) => {
    const amount = currencyInputNumber(value);
    setActualPriceDrafts((current) => ({
      ...current,
      [rowId]: value.trim() ? sterling(amount) : '',
    }));
  };
  const commitActualPriceDraft = (rowId: string) => {
    const amount = currencyInputNumber(actualPriceDrafts[rowId] || '');
    const displayRow = priceRows.find((row) => row.key === rowId);
    if (displayRow) updateHouseSalePricingRow(displayRow, { saleValuePerUnit: amount, saleRatePerM2: 0 });
  };
  const applyDevelopmentRate = () => {
    const ratePerFt2 = numberValue(developmentRateFt2);
    if (ratePerFt2 <= 0) return;
    const ratePerM2 = m2RateFromFt2Rate(ratePerFt2);
    updateOption(option.id, (current) => ({
      ...current,
      houseTypeSchedule: (current.houseTypeSchedule || []).map((row) => {
        const salesRows = getHouseTypeSalesRows(row);
        if (salesRows.length > 0) {
          return {
            ...row,
            salesRows: salesRows.map((salesRow) => ({
              ...salesRow,
              saleValuePerUnit: Math.round(Math.max(0, salesRow.gifaM2 || 0) * ratePerM2),
              saleRatePerM2: ratePerM2,
            })),
            saleValuePerUnit: 0,
            saleRatePerM2: 0,
          };
        }
        return {
          ...row,
          saleValuePerUnit: Math.round(Math.max(0, row.gifaM2 || 0) * ratePerM2),
          saleRatePerM2: ratePerM2,
        };
      }),
    }));
  };
  const updatePricingReport = (patch: Partial<AppraisalPricingReport>) => {
    updateOption(option.id, (current) => ({
      ...current,
      pricingReport: current.pricingReport ? { ...current.pricingReport, ...patch } : undefined,
    }));
  };
  const clearPricingReport = () => {
    updateOption(option.id, (current) => ({ ...current, pricingReport: undefined }));
  };
  const handlePricingReportUpload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_PRICING_REPORT_BYTES) {
      showToast({ type: 'error', message: 'Pricing report is too large. Please upload a file under 50 MB.' });
      return;
    }
    try {
      const report = await buildAppraisalPricingReportFromFile(file);
      updateOption(option.id, (current) => ({
        ...current,
        pricingReport: {
          notes: current.pricingReport?.notes || '',
          ...report,
        },
      }));
      showToast({ type: 'success', message: `${file.name} saved to House Prices.` });
    } catch {
      showToast({ type: 'error', message: 'Unable to read pricing report.' });
    }
  };

  if ((option.houseTypeSchedule || []).length === 0) {
    return (
      <div className="space-y-3">
        <StageNotice>Add house-type rows first, then enter house prices here.</StageNotice>
        <button type="button" onClick={() => setStage('HOUSE_TYPES')} className="workspace-primary-btn px-3 py-2 text-xs">
          <Home className="h-4 w-4" />
          Go to House Types
        </button>
      </div>
    );
  }

  return (
    <div data-smoke="appraisals-house-prices" className="space-y-4">
      <HousePricesCommentControl optionId={option.id} savedComment={option.housePricesComment} updateOption={updateOption} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="Total units" value={summary.totalUnits.toLocaleString()} />
        <MetricTile label="Private units" value={summary.privateUnits.toLocaleString()} />
        <MetricTile label="Affordable units" value={summary.affordableUnits.toLocaleString()} />
        <MetricTile label="Total GIFA" value={`${summary.totalGifa.toLocaleString()} m2`} />
        <MetricTile label="Average sale/unit" value={money(summary.averageSaleValuePerUnit)} />
        <MetricTile label="Average sale/ft2" value={money(averageSaleRateFt2)} />
        <MetricTile label="Base GDV" value={money(baseGdv)} tone={baseGdv > 0 ? 'good' : 'watch'} />
        {pricedOption.salesIndexationEnabled ? (
          <MetricTile label={salesIndexUpliftLabel(pricedOption)} value={money(salesIndexUplift)} tone={salesIndexUplift > 0 ? 'good' : 'default'} />
        ) : null}
        <MetricTile label="Total GDV" value={money(gdv)} tone={gdv > 0 ? 'good' : 'watch'} />
        <MetricTile label={`Private sales incentive (${formatQuantity(option.gdvIncentivePercent || 0)}%)`} value={money(gdvIncentiveCost)} tone={gdvIncentiveCost > 0 ? 'watch' : 'default'} />
      </div>
      <SalesIndexationControl appraisal={appraisal} option={pricedOption} updateOption={updateOption} />
      {summary.gdv <= 0 && <StageNotice>Enter individual prices, apply one global £/ft2 rate, or set a £/ft2 rate per house type.</StageNotice>}

      <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
        <div className="grid gap-3 md:grid-cols-[minmax(0,16rem)_1fr] md:items-end">
          <label>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Private sales incentive %</span>
            <input
              data-smoke="appraisals-sales-gdv-incentive"
              type="number"
              value={option.gdvIncentivePercent || 0}
              onChange={(event) => updateOption(option.id, (current) => ({ ...current, gdvIncentivePercent: numberValue(event.target.value) }))}
              className={`${inputClass('text-right')} mt-1`}
            />
          </label>
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            {money(gdvIncentiveCost)} is carried into the summaries as a non-land cost, based on {money(gdvIncentiveBase)} private sales GDV. Affordable housing is excluded.
          </p>
        </div>
      </section>


      <div className="grid gap-2 md:grid-cols-3" role="tablist" aria-label="House pricing method">
        {salesPricingModes.map((mode) => {
          const active = pricingMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              data-smoke={`appraisals-sales-mode-${mode.id.toLowerCase().replace(/_/g, '-')}`}
              onClick={() => setPricingMode(mode.id)}
              className={`rounded-app border p-3 text-left transition ${
                active
                  ? 'border-primary-300 bg-primary-50 text-primary-900 dark:border-primary-700 dark:bg-primary-950/30 dark:text-primary-100'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300'
              }`}
              role="tab"
              aria-selected={active}
            >
              <span className="block text-xs font-semibold">{mode.label}</span>
              <span className="mt-1 block text-[11px] leading-4 opacity-75">{mode.description}</span>
            </button>
          );
        })}
      </div>

      {pricingMode === 'DEVELOPMENT_RATE_FT2' && (
        <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <label>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Global sales rate £/ft2</span>
              <input
                data-smoke="appraisals-sales-development-rate-ft2"
                type="number"
                value={developmentRateFt2}
                onChange={(event) => setDevelopmentRateFt2(event.target.value)}
                className={`${inputClass('text-right')} mt-1`}
              />
            </label>
            <button
              type="button"
              data-smoke="appraisals-sales-development-rate-apply"
              onClick={applyDevelopmentRate}
              disabled={numberValue(developmentRateFt2) <= 0}
              className="workspace-primary-btn self-end px-4 py-2 text-sm disabled:opacity-50"
            >
              Apply to selected houses
            </button>
          </div>
        </section>
      )}

      <div className="overflow-x-auto rounded-app border border-slate-200 dark:border-slate-800">
        <table className="min-w-[1040px] w-full table-fixed text-left text-xs">
          <colgroup>
            <col className="w-[26%]" />
            <col className="w-[12%]" />
            <col className="w-[8%]" />
            <col className="w-[10%]" />
            <col className="w-[24%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
            <tr>
              <th className="px-3 py-1.5">House type</th>
              <th className="px-3 py-1.5">Tenure</th>
              <th className="px-3 py-1.5 text-right">Sales qty</th>
              <th className="px-3 py-1.5 text-right">GIFA m2</th>
              {pricingMode === 'ACTUAL_PRICE' && <th className="px-3 py-1.5 text-right">Individual price</th>}
              {pricingMode === 'HOUSE_TYPE_RATE_FT2' && <th className="px-3 py-1.5 text-right">Individual £/ft2</th>}
              {pricingMode === 'DEVELOPMENT_RATE_FT2' && <th className="px-3 py-1.5 text-right">Individual price</th>}
              <th className="px-3 py-1.5 text-right">GDV</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-surface-900">
            {priceRows.map((row, index) => {
              const saleValuePerUnit = pricingMode === 'ACTUAL_PRICE'
                ? currencyInputNumber(actualPriceDrafts[row.key] ?? sterlingInputValue(row.saleValuePerUnit))
                : row.saleValuePerUnit || 0;
              const saleRatePerM2 = row.saleRatePerM2 || 0;
              const rowGdv = saleValuePerUnit > 0
                ? row.quantity * saleValuePerUnit
                : row.quantity * row.gifaM2 * saleRatePerM2;
              return (
              <tr key={row.key}>
                <td className="truncate px-3 py-1.5 font-semibold text-slate-900 dark:text-slate-100" title={row.houseTypeName}>{row.houseTypeName}</td>
                <td className="px-3 py-1.5">{row.tenure === 'AFFORDABLE' ? 'Affordable' : 'Private'}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{row.quantity}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{row.gifaM2}</td>
                {pricingMode === 'ACTUAL_PRICE' && (
                  <td className="px-3 py-1.5">
                    <input
                      data-smoke={index === 0 ? 'appraisals-sales-price-unit' : undefined}
                      type="text"
                      inputMode="numeric"
                      value={actualPriceDrafts[row.key] ?? sterlingInputValue(row.saleValuePerUnit)}
                      placeholder="£"
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) => updateActualPriceDraft(row.key, event.target.value)}
                      onBlur={() => commitActualPriceDraft(row.key)}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') return;
                        commitActualPriceDraft(row.key);
                        event.currentTarget.blur();
                      }}
                      className={`${inputClass('h-8 px-2 py-1 text-right')}`}
                    />
                  </td>
                )}
                {pricingMode === 'HOUSE_TYPE_RATE_FT2' && (
                  <td className="px-3 py-1.5">
                    <input
                      data-smoke={index === 0 ? 'appraisals-sales-price-rate-ft2' : undefined}
                      type="number"
                      value={Math.round(ft2RateFromM2Rate(row.saleRatePerM2 || 0))}
                      onChange={(event) => updateHouseSalePricingRow(row, {
                        saleValuePerUnit: 0,
                        saleRatePerM2: m2RateFromFt2Rate(numberValue(event.target.value)),
                      })}
                      className={`${inputClass('h-8 px-2 py-1 text-right')}`}
                    />
                  </td>
                )}
                {pricingMode === 'DEVELOPMENT_RATE_FT2' && (
                  <td className="px-3 py-1.5">
                    <input
                      data-smoke={index === 0 ? 'appraisals-sales-global-price-unit' : undefined}
                      type="text"
                      value={sterling(Math.round(row.saleValuePerUnit || 0))}
                      disabled
                      aria-label={`${row.houseTypeName} calculated sale price from global rate`}
                      className={`${inputClass('h-8 px-2 py-1 text-right disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-400')}`}
                    />
                    <div className="mt-0.5 text-right text-[10px] font-medium text-slate-400">
                      {money(ft2RateFromM2Rate(row.saleRatePerM2 || 0))}/ft2
                    </div>
                  </td>
                )}
                <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{money(rowGdv)}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Pricing evidence report</div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Upload and save the report explaining how the house prices were arrived at.</p>
          </div>
          <label className="workspace-secondary-btn cursor-pointer px-3 py-2 text-xs">
            <FileDown className="h-4 w-4" />
            Upload report
            <input
              data-smoke="appraisals-pricing-report-upload"
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
              onChange={(event) => {
                handlePricingReportUpload(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </label>
        </div>
        {option.pricingReport ? (
          <div className="mt-3 rounded-app border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-surface-950">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{option.pricingReport.fileName}</div>
                 <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                   {(option.pricingReport.size / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} KB saved {new Date(option.pricingReport.uploadedAt).toLocaleDateString()}
                 </div>
                 <EvidenceStorageStatus report={option.pricingReport} />
              </div>
              <div className="flex flex-wrap gap-2">
                <EvidenceDownloadButton report={option.pricingReport} className="workspace-secondary-btn px-3 py-2 text-xs">
                  <FileDown className="h-4 w-4" />
                  Download
                </EvidenceDownloadButton>
                <button type="button" onClick={clearPricingReport} className="workspace-secondary-btn px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>
            </div>
            <label className="mt-3 block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Report notes</span>
              <textarea
                value={option.pricingReport.notes || ''}
                onChange={(event) => updatePricingReport({ notes: event.target.value })}
                tabIndex={-1}
                className={`${inputClass('min-h-[5rem]')} mt-1`}
              />
            </label>
          </div>
        ) : (
          <div className="mt-3 rounded-app border border-dashed border-slate-300 p-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No pricing evidence report saved yet.
          </div>
        )}
      </section>
    </div>
  );
}

function CommercialAssetPortfolio({
  option,
  updateOption,
}: {
  option: DevelopmentAppraisalOption;
  updateOption: (optionId: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const assets = getCommercialAssets(option);
  const addAsset = () => updateOption(option.id, (current) => {
    const id = generateId();
    const revenue = createDefaultRevenueLine('COMMERCIAL_INCOME', current.durationMonths);
    const cost = createDefaultCostLine('CONSTRUCTION', current.durationMonths);
    return {
      ...current,
      revenueLines: [...current.revenueLines, { ...revenue, id: `commercial-asset-${id}-income`, title: 'New commercial asset income' }],
      costLines: [...current.costLines, { ...cost, id: `commercial-asset-${id}-cost`, title: 'New commercial asset development allowance' }],
      commercialAssets: [...getCommercialAssets(current), {
        id,
        title: 'New commercial asset',
        source: 'MANUAL',
        included: true,
        revenueModel: 'LEASE',
        revenueLineIds: [`commercial-asset-${id}-income`],
        costLineIds: [`commercial-asset-${id}-cost`],
        rationale: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }],
    };
  });

  return (
    <section className="overflow-hidden rounded-app border border-slate-200 bg-white dark:border-slate-800 dark:bg-surface-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Commercial assets</div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Each included asset feeds its own income, operating cost, capex and exit value into the portfolio lifecycle.</p>
        </div>
        <button type="button" onClick={addAsset} className="workspace-secondary-btn px-3 py-2 text-xs"><Plus className="h-4 w-4" /> Add asset</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:bg-surface-950 dark:text-slate-400"><tr><th className="px-3 py-2">Include</th><th className="px-3 py-2">Asset</th><th className="px-3 py-2">Model</th><th className="px-3 py-2 text-right">Area m2</th><th className="px-3 py-2 text-right">Income</th><th className="px-3 py-2 text-right">Development cost</th><th className="px-3 py-2 text-right">Op cost %</th><th className="px-3 py-2 text-right">Capex %</th><th className="px-3 py-2 text-right">Exit yield %</th></tr></thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {assets.map((asset) => (
              <tr key={asset.id} className={!asset.included ? 'opacity-60' : ''}>
                <td className="px-3 py-2"><input type="checkbox" checked={asset.included} onChange={(event) => updateOption(option.id, (current) => updateCommercialAsset(current, asset.id, { included: event.target.checked }))} /></td>
                <td className="px-3 py-2"><input value={asset.title} onChange={(event) => updateOption(option.id, (current) => updateCommercialAsset(current, asset.id, { title: event.target.value }))} className={`${inputClass()} min-w-[12rem]`} /></td>
                <td className="px-3 py-2"><select value={asset.revenueModel} onChange={(event) => updateOption(option.id, (current) => updateCommercialAsset(current, asset.id, { revenueModel: event.target.value as typeof asset.revenueModel }))} className={`${inputClass()} min-w-[8rem]`}><option value="LEASE">Lease</option><option value="OWNER_OPERATED">Owner operated</option><option value="CONCESSION">Concession</option><option value="SALE">Sale</option><option value="OTHER">Other</option></select></td>
                <td className="px-3 py-2"><input type="number" min="0" value={asset.siteAllocationM2 || ''} onChange={(event) => updateOption(option.id, (current) => updateCommercialAsset(current, asset.id, { siteAllocationM2: numberValue(event.target.value) }))} className={`${inputClass('text-right tabular-nums')} w-24`} /></td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{money(calculateCommercialAssetAnnualIncome(option, asset))}</td>
                <td className="px-3 py-2 text-right tabular-nums">{money(calculateCommercialAssetDevelopmentCost(option, asset))}</td>
                <td className="px-3 py-2"><input type="number" min="0" value={asset.annualOperatingCostPercent ?? option.commercialAnnualOperatingCostPercent ?? ''} onChange={(event) => updateOption(option.id, (current) => updateCommercialAsset(current, asset.id, { annualOperatingCostPercent: numberValue(event.target.value) }))} className={`${inputClass('text-right tabular-nums')} w-20`} /></td>
                <td className="px-3 py-2"><input type="number" min="0" value={asset.annualLifecycleCapexPercent ?? option.commercialAnnualLifecycleCapexPercent ?? ''} onChange={(event) => updateOption(option.id, (current) => updateCommercialAsset(current, asset.id, { annualLifecycleCapexPercent: numberValue(event.target.value) }))} className={`${inputClass('text-right tabular-nums')} w-20`} /></td>
                <td className="px-3 py-2"><input type="number" min="0" value={asset.exitYieldPercent ?? option.commercialExitYieldPercent ?? ''} onChange={(event) => updateOption(option.id, (current) => updateCommercialAsset(current, asset.id, { exitYieldPercent: numberValue(event.target.value) }))} className={`${inputClass('text-right tabular-nums')} w-20`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {getCommercialSiteWideCostLines(option).length > 0 && <div className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">Site-wide costs held outside individual assets: {money(getCommercialSiteWideCostLines(option).reduce((total, line) => total + (line.amount || 0), 0))}.</div>}
    </section>
  );
}

function RevenueEditor({
  option,
  updateOption,
}: {
  option: DevelopmentAppraisalOption;
  updateOption: (optionId: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const { appSettings } = useAppContext();
  const { showToast } = useToast();
  const [isAssessingRevenue, setIsAssessingRevenue] = React.useState(false);
  const [guidedRevenueQuestion, setGuidedRevenueQuestion] = React.useState('');
  const [guidedRevenueAnswer, setGuidedRevenueAnswer] = React.useState('');
  const [guidedRevenueAnswers, setGuidedRevenueAnswers] = React.useState<GuidedCommercialRevenueAnswer[]>([]);
  const updateRevenueLine = (lineId: string, patch: Partial<AppraisalRevenueLine>) => {
    updateOption(option.id, (current) => ({
      ...current,
      revenueLines: updateLine(current.revenueLines, lineId, patch),
    }));
  };
  const fallbackRevenueQuestion = (answers: GuidedCommercialRevenueAnswer[]) => {
    const answered = new Set(answers.map((entry) => entry.question.trim().toLowerCase()));
    const candidates = [
      'What is the intended occupier, operator or lease model, and is an occupier already identified?',
      'Is the quoted floor area gross internal area, net lettable area, or the expected trading area?',
      'Should income be assessed as investment rent, trading income, ground rent, or a sale receipt?',
      'What lease term, rent-free period, incentive or stabilisation period should be assumed?',
      'Are there any known target rents, yields, comparable evidence, or local market assumptions to use?',
    ];
    return candidates.find((candidate) => !answered.has(candidate.toLowerCase())) || candidates[candidates.length - 1];
  };
  const applyCommercialRevenueAssessment = (assessment: {
    rentRate: number;
    yieldPercent: number;
    voidPercent: number;
    annualRent: number;
    summary: string;
  }) => {
    updateOption(option.id, (current) => {
      const firstLine = current.revenueLines[0] || createDefaultRevenueLine('COMMERCIAL_INCOME', current.durationMonths);
      const nextLine: AppraisalRevenueLine = {
        ...firstLine,
        rentRate: assessment.rentRate || firstLine.rentRate || 0,
        yieldPercent: assessment.yieldPercent || firstLine.yieldPercent || 0,
        voidPercent: assessment.voidPercent ?? firstLine.voidPercent ?? 0,
        annualRent: assessment.annualRent || undefined,
        notes: assessment.summary || firstLine.notes || '',
      };
      return {
        ...current,
        commercialRevenueAssessment: {
          ...assessment,
          assessedAt: new Date().toISOString(),
          provider: appSettings.ai.providerMode || 'AUTO',
        },
        revenueLines: current.revenueLines.length
          ? [nextLine, ...current.revenueLines.slice(1)]
          : [nextLine],
      };
    });
  };
  const runGuidedCommercialRevenue = async () => {
    const location = option.commercialLocation?.trim();
    if (!location) {
      showToast({ type: 'info', message: 'Enter a commercial location before starting the revenue assessment.' });
      return;
    }
    if (guidedRevenueQuestion && !guidedRevenueAnswer.trim()) {
      showToast({ type: 'info', message: 'Answer the current AI question before continuing.' });
      return;
    }
    const nextAnswers = guidedRevenueQuestion
      ? [...guidedRevenueAnswers, { question: guidedRevenueQuestion, answer: guidedRevenueAnswer.trim() }]
      : guidedRevenueAnswers;
    setIsAssessingRevenue(true);
    try {
      const template = getCommercialAppraisalTemplate(option.commercialTemplateId);
      const inputs = commercialTemplateInputsForOption(option);
      const result = await generateCommercialRevenueGuidanceStep({
        location,
        template: {
          id: template.id,
          name: template.name,
          sector: template.sector,
          description: template.description,
          revenue: template.revenue,
        },
        measures: inputs,
        currentRevenueLines: option.revenueLines,
        currentAnnualIncome: calculateCommercialAnnualIncome(option),
        assessmentEvidence: buildCommercialAssessmentEvidence(option.commercialInitialAssessmentBriefs),
        previousAnswers: nextAnswers,
      }, appSettings.ai);
      if (result.ok === false) {
        setGuidedRevenueAnswers(nextAnswers);
        setGuidedRevenueAnswer('');
        setGuidedRevenueQuestion(fallbackRevenueQuestion(nextAnswers));
        showToast({ type: 'info', message: 'AI was unavailable, so a focused revenue question has been prepared for you to continue.' });
        return;
      }
      setGuidedRevenueAnswers(nextAnswers);
      setGuidedRevenueAnswer('');
      if (result.data.needsClarification) {
        setGuidedRevenueQuestion(result.data.question || fallbackRevenueQuestion(nextAnswers));
        showToast({ type: 'info', message: 'AI needs one more revenue detail.' });
        return;
      }
      setGuidedRevenueQuestion('');
      applyCommercialRevenueAssessment(result.data);
      showToast({ type: 'success', message: 'Commercial revenue assumptions updated.' });
    } catch (error) {
      console.error('Guided commercial revenue assessment error', error);
      setGuidedRevenueAnswers(nextAnswers);
      setGuidedRevenueAnswer('');
      setGuidedRevenueQuestion(fallbackRevenueQuestion(nextAnswers));
      showToast({ type: 'info', message: 'AI could not complete that step. Continue with the focused question shown.' });
    } finally {
      setIsAssessingRevenue(false);
    }
  };

  const resetGuidedCommercialRevenue = () => {
    setGuidedRevenueAnswers([]);
    setGuidedRevenueQuestion('');
    setGuidedRevenueAnswer('');
  };

  return (
    <div className="space-y-3">
      {option.template === 'COMMERCIAL_INCOME' && <CommercialAssetPortfolio option={option} updateOption={updateOption} />}
      {option.template === 'COMMERCIAL_INCOME' && option.commercialRevenueAssessment?.summary && (
        <section className="rounded-app border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100">
          <div className="font-semibold">AI revenue assessment</div>
          <p className="mt-1 leading-5">{option.commercialRevenueAssessment.summary}</p>
        </section>
      )}
      {option.template === 'COMMERCIAL_INCOME' && (
        <section className="rounded-app border border-sky-200 bg-sky-50/70 p-3 dark:border-sky-900 dark:bg-sky-950/20">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">Guided AI revenue assessment</div>
              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                The AI asks only for the next material commercial revenue detail, then applies cautious assumptions when the basis is complete.
              </p>
            </div>
            {guidedRevenueAnswers.length > 0 && (
              <button type="button" onClick={resetGuidedCommercialRevenue} className="workspace-secondary-btn px-2.5 py-1.5 text-xs">
                <RotateCcw className="h-3.5 w-3.5" />
                Reset questions
              </button>
            )}
          </div>
          {guidedRevenueQuestion && (
            <div className="mt-3 rounded-app-sm border border-sky-200 bg-white/80 p-3 dark:border-sky-900 dark:bg-surface-900/80">
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{guidedRevenueQuestion}</div>
              <textarea
                value={guidedRevenueAnswer}
                onChange={(event) => setGuidedRevenueAnswer(event.target.value)}
                placeholder="Add the available commercial revenue information..."
                className={`${inputClass('min-h-[4.5rem]')} mt-2`}
              />
            </div>
          )}
          {!guidedRevenueQuestion && guidedRevenueAnswers.length > 0 && (
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {guidedRevenueAnswers.length} revenue detail{guidedRevenueAnswers.length === 1 ? '' : 's'} provided.
            </div>
          )}
        </section>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {option.template === 'COMMERCIAL_INCOME' && (
          <button type="button" onClick={() => { void runGuidedCommercialRevenue(); }} disabled={isAssessingRevenue} className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-50">
            <Sparkles className="h-4 w-4" />
            {isAssessingRevenue ? 'Assessing...' : guidedRevenueQuestion ? 'Submit answer' : 'Assess revenue with AI'}
          </button>
        )}
        <button type="button" onClick={() => updateOption(option.id, (current) => ({ ...current, revenueLines: [...current.revenueLines, createDefaultRevenueLine(current.template, current.durationMonths)] }))} className="workspace-secondary-btn px-3 py-2 text-xs">
          <Plus className="h-4 w-4" />
          Revenue row
        </button>
      </div>
      {option.revenueLines.map((line) => (
        <div key={line.id} className="rounded-app border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-surface-900">
          <div className="grid gap-3 lg:grid-cols-[1.2fr_repeat(5,minmax(0,1fr))_auto]">
            <label>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Title</span>
              <input value={line.title} onChange={(event) => updateRevenueLine(line.id, { title: event.target.value })} className={`${inputClass()} mt-1`} />
            </label>
            {option.template === 'COMMERCIAL_INCOME' ? (
              <>
                <NumberField label="Area" value={line.area || 0} onChange={(value) => updateRevenueLine(line.id, { area: value })} />
                <NumberField label="Rent rate" value={line.rentRate || 0} onChange={(value) => updateRevenueLine(line.id, { rentRate: value })} />
                <NumberField label="Yield %" value={line.yieldPercent || 0} onChange={(value) => updateRevenueLine(line.id, { yieldPercent: value })} />
                <NumberField label="Void %" value={line.voidPercent || 0} onChange={(value) => updateRevenueLine(line.id, { voidPercent: value })} />
                <NumberField label="Manual value" value={line.manualValue || 0} onChange={(value) => updateRevenueLine(line.id, { manualValue: value })} />
              </>
            ) : (
              <>
                <NumberField label="Units" value={line.units || 0} onChange={(value) => updateRevenueLine(line.id, { units: value })} />
                <NumberField label="Sale/unit" value={line.saleValuePerUnit || 0} onChange={(value) => updateRevenueLine(line.id, { saleValuePerUnit: value })} />
                <NumberField label="Area" value={line.area || 0} onChange={(value) => updateRevenueLine(line.id, { area: value })} />
                <NumberField label="Rate/m2" value={line.valuePerArea || 0} onChange={(value) => updateRevenueLine(line.id, { valuePerArea: value })} />
                <NumberField label="Manual" value={line.manualValue || 0} onChange={(value) => updateRevenueLine(line.id, { manualValue: value })} />
              </>
            )}
            <button type="button" onClick={() => updateOption(option.id, (current) => ({ ...current, revenueLines: current.revenueLines.filter((entry) => entry.id !== line.id) }))} className="mt-5 rounded-app-sm border border-slate-200 p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:hover:bg-rose-950/30 dark:hover:text-rose-200" aria-label="Delete revenue row">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <LineTimingEditor
            profile={line.cashflow}
            durationMonths={option.durationMonths}
            onChange={(profile) => updateRevenueLine(line.id, { cashflow: profile })}
          />
        </div>
      ))}
    </div>
  );
}

function CommercialLifecycleEditor({
  option,
  updateOption,
}: {
  option: DevelopmentAppraisalOption;
  updateOption: (optionId: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const { appSettings } = useAppContext();
  const { showToast } = useToast();
  const lifecycle = React.useMemo(() => calculateCommercialLifecycle(option), [option]);
  const financialAssurance = React.useMemo(() => calculateCommercialFinancialAssurance(option), [option]);
  const [isAssessingLifecycle, setIsAssessingLifecycle] = React.useState(false);
  const updateLifecycle = (patch: Partial<DevelopmentAppraisalOption>) => {
    updateOption(option.id, (current) => ({ ...current, ...patch }));
  };
  const updateScenario = (kind: 'BASE' | 'UPSIDE' | 'DOWNSIDE', patch: Record<string, number>) => {
    updateOption(option.id, (current) => ({
      ...current,
      commercialFinancialScenarios: (current.commercialFinancialScenarios || financialAssurance.scenarios.map((result) => result.scenario)).map((scenario) => scenario.kind === kind ? { ...scenario, ...patch } : scenario),
    }));
  };
  const assessLifecycle = async () => {
    setIsAssessingLifecycle(true);
    try {
      const template = getCommercialAppraisalTemplate(option.commercialTemplateId);
      const result = await generateCommercialLifecycleAssessment({
        location: option.commercialLocation || '',
        template: { id: template.id, name: template.name, sector: template.sector, description: template.description },
        scope: option.commercialScopeAssessment?.summary || option.assumptions || '',
        revenueLines: option.revenueLines,
        commercialAssets: getCommercialAssets(option),
        assessmentEvidence: buildCommercialAssessmentEvidence(option.commercialInitialAssessmentBriefs),
        currentAssumptions: {
          operatingCostPercent: option.commercialAnnualOperatingCostPercent,
          revenueGrowthPercent: option.commercialAnnualRevenueGrowthPercent,
          costInflationPercent: option.commercialAnnualCostInflationPercent,
          lifecycleCapexPercent: option.commercialAnnualLifecycleCapexPercent,
          exitYieldPercent: option.commercialExitYieldPercent,
          sellingCostsPercent: option.commercialSellingCostsPercent,
          financeAnnualRatePercent: option.financeAnnualRatePercent,
        },
      }, appSettings.ai);
      if (result.ok === false) {
        showToast({ type: 'info', message: 'AI lifecycle assessment was unavailable. Existing lifecycle assumptions remain in place for review.' });
        return;
      }
      updateLifecycle({
        commercialAnnualOperatingCostPercent: result.data.operatingCostPercent,
        commercialAnnualRevenueGrowthPercent: result.data.revenueGrowthPercent,
        commercialAnnualCostInflationPercent: result.data.costInflationPercent,
        commercialAnnualLifecycleCapexPercent: result.data.lifecycleCapexPercent,
        commercialExitYieldPercent: result.data.exitYieldPercent,
        commercialSellingCostsPercent: result.data.sellingCostsPercent,
        commercialLifecycleAssessment: {
          summary: result.data.summary,
          assessedAt: new Date().toISOString(),
          provider: appSettings.ai.providerMode || 'AUTO',
        },
      });
      showToast({ type: 'success', message: 'AI lifecycle and exit assumptions updated.' });
    } catch (error) {
      console.error('Commercial lifecycle assessment error', error);
      showToast({ type: 'info', message: 'AI lifecycle assessment could not complete. Existing lifecycle assumptions remain available.' });
    } finally {
      setIsAssessingLifecycle(false);
    }
  };
  const operatingRows = lifecycle.rows.filter((row) => row.phase === 'OPERATION');
  const firstOperatingYear = operatingRows[0];

  return (
    <div className="space-y-4">
      <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Lifecycle appraisal</div>
            <h4 className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">Annual income, costs, interest, break-even and exit value</h4>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="grid gap-2 text-xs sm:grid-cols-3">
            <MetricTile label="Development cost" value={money(lifecycle.developmentCost)} />
            <MetricTile label="Starting annual income" value={money(lifecycle.startingAnnualIncome)} tone={lifecycle.startingAnnualIncome > 0 ? 'good' : 'watch'} />
            <MetricTile label="Break-even" value={lifecycle.breakEvenYear ? `Year ${lifecycle.breakEvenYear}` : 'Not within period'} tone={lifecycle.breakEvenYear ? 'good' : 'watch'} />
            </div>
            <button type="button" onClick={() => { void assessLifecycle(); }} disabled={isAssessingLifecycle} className="workspace-secondary-btn px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50">
              <Sparkles className="h-4 w-4" />
              {isAssessingLifecycle ? 'Assessing...' : 'Assess lifecycle with AI'}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Land value</span>
            <input
              type="text"
              inputMode="decimal"
              value={sterlingInputValue(option.knownLandValue)}
              onChange={(event) => updateLifecycle({ knownLandValue: currencyInputNumber(event.target.value), calculationMode: 'KNOWN_LAND_PROFIT_ON_GDV' })}
              placeholder="£0"
              className={`${inputClass('text-right tabular-nums')} mt-1`}
            />
          </label>
          <NumberField
            label="Minimum years"
            value={option.commercialLifecycleYears || 10}
            onChange={(value) => updateLifecycle({ commercialLifecycleYears: Math.max(1, Math.round(value)) })}
          />
          <NumberField
            label="Operating cost %"
            value={option.commercialAnnualOperatingCostPercent ?? 25}
            onChange={(value) => updateLifecycle({ commercialAnnualOperatingCostPercent: value })}
          />
          <NumberField
            label="Revenue growth %"
            value={option.commercialAnnualRevenueGrowthPercent ?? 2}
            onChange={(value) => updateLifecycle({ commercialAnnualRevenueGrowthPercent: value })}
          />
          <NumberField
            label="Cost inflation %"
            value={option.commercialAnnualCostInflationPercent ?? 3}
            onChange={(value) => updateLifecycle({ commercialAnnualCostInflationPercent: value })}
          />
          <NumberField
            label="Lifecycle capex reserve %"
            value={option.commercialAnnualLifecycleCapexPercent ?? 1}
            onChange={(value) => updateLifecycle({ commercialAnnualLifecycleCapexPercent: value })}
          />
          <NumberField
            label="Exit yield %"
            value={option.commercialExitYieldPercent ?? 5.5}
            onChange={(value) => updateLifecycle({ commercialExitYieldPercent: value })}
          />
          <NumberField
            label="Selling costs %"
            value={option.commercialSellingCostsPercent ?? 2}
            onChange={(value) => updateLifecycle({ commercialSellingCostsPercent: value })}
          />
        </div>

        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Funding and return thresholds</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex items-end gap-2 pb-2 text-sm font-medium text-slate-700 dark:text-slate-200"><input type="checkbox" checked={option.commercialDebtEnabled !== false} onChange={(event) => updateLifecycle({ commercialDebtEnabled: event.target.checked })} /> Debt funding enabled</label>
            <NumberField label="Loan to cost %" value={option.commercialLoanToCostPercent ?? 65} onChange={(value) => updateLifecycle({ commercialLoanToCostPercent: value })} />
            <NumberField label="Debt arrangement fee %" value={option.commercialDebtArrangementFeePercent ?? 1} onChange={(value) => updateLifecycle({ commercialDebtArrangementFeePercent: value })} />
            <NumberField label="Debt exit fee %" value={option.commercialDebtExitFeePercent ?? 0} onChange={(value) => updateLifecycle({ commercialDebtExitFeePercent: value })} />
            <NumberField label="Debt amortisation years" value={option.commercialDebtAmortisationYears ?? 25} onChange={(value) => updateLifecycle({ commercialDebtAmortisationYears: value })} />
            <NumberField label="Refinance after year (0 off)" value={option.commercialRefinanceYear ?? 0} onChange={(value) => updateLifecycle({ commercialRefinanceYear: value })} />
            <NumberField label="Refinance LTV %" value={option.commercialRefinanceLoanToValuePercent ?? 65} onChange={(value) => updateLifecycle({ commercialRefinanceLoanToValuePercent: value })} />
            <NumberField label="Refinance rate %" value={option.commercialRefinanceAnnualRatePercent ?? option.financeAnnualRatePercent ?? 0} onChange={(value) => updateLifecycle({ commercialRefinanceAnnualRatePercent: value })} />
            <NumberField label="Refinance fee %" value={option.commercialRefinanceFeePercent ?? 1} onChange={(value) => updateLifecycle({ commercialRefinanceFeePercent: value })} />
            <NumberField label="Minimum DSCR" value={option.commercialMinimumDscr ?? 1.25} onChange={(value) => updateLifecycle({ commercialMinimumDscr: value })} />
            <NumberField label="Discount rate %" value={option.commercialDiscountRatePercent ?? 10} onChange={(value) => updateLifecycle({ commercialDiscountRatePercent: value })} />
          </div>
        </div>

        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Base, upside and downside sensitivities</div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs"><thead className="text-[10px] uppercase tracking-[0.16em] text-slate-500"><tr><th className="px-2 py-2">Case</th><th className="px-2 py-2 text-right">Rent %</th><th className="px-2 py-2 text-right">Void pts</th><th className="px-2 py-2 text-right">Cost %</th><th className="px-2 py-2 text-right">Capex %</th><th className="px-2 py-2 text-right">Yield bps</th><th className="px-2 py-2 text-right">Delay months</th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-800">{financialAssurance.scenarios.map((result) => { const scenario = result.scenario; return <tr key={scenario.kind}><td className="px-2 py-2 font-semibold">{scenario.name}</td><td className="px-2 py-2"><input type="number" value={scenario.rentChangePercent} onChange={(event) => updateScenario(scenario.kind, { rentChangePercent: numberValue(event.target.value) })} className={`${inputClass('w-20 text-right tabular-nums')} ml-auto`} /></td><td className="px-2 py-2"><input type="number" value={scenario.voidChangePercent} onChange={(event) => updateScenario(scenario.kind, { voidChangePercent: numberValue(event.target.value) })} className={`${inputClass('w-20 text-right tabular-nums')} ml-auto`} /></td><td className="px-2 py-2"><input type="number" value={scenario.developmentCostChangePercent} onChange={(event) => updateScenario(scenario.kind, { developmentCostChangePercent: numberValue(event.target.value) })} className={`${inputClass('w-20 text-right tabular-nums')} ml-auto`} /></td><td className="px-2 py-2"><input type="number" value={scenario.lifecycleCapexChangePercent} onChange={(event) => updateScenario(scenario.kind, { lifecycleCapexChangePercent: numberValue(event.target.value) })} className={`${inputClass('w-20 text-right tabular-nums')} ml-auto`} /></td><td className="px-2 py-2"><input type="number" value={scenario.exitYieldShiftBps} onChange={(event) => updateScenario(scenario.kind, { exitYieldShiftBps: numberValue(event.target.value) })} className={`${inputClass('w-20 text-right tabular-nums')} ml-auto`} /></td><td className="px-2 py-2"><input type="number" min="0" value={scenario.delayMonths} onChange={(event) => updateScenario(scenario.kind, { delayMonths: Math.max(0, numberValue(event.target.value)) })} className={`${inputClass('w-20 text-right tabular-nums')} ml-auto`} /></td></tr>; })}</tbody></table>
          </div>
        </div>

        {option.commercialLifecycleAssessment?.summary && (
          <div className="mt-3 rounded-app-sm border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-950 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100">
            <span className="font-semibold">AI lifecycle assessment.</span> {option.commercialLifecycleAssessment.summary}
          </div>
        )}

        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <div className="rounded-app-sm border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-surface-950">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Income starts:</span>{' '}
            <span className="text-slate-600 dark:text-slate-300">{firstOperatingYear ? `Year ${firstOperatingYear.year}` : 'No operating year modelled'}</span>
          </div>
          <div className="rounded-app-sm border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-surface-950">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Positive operating income:</span>{' '}
            <span className="text-slate-600 dark:text-slate-300">
              {lifecycle.firstPositiveOperatingIncomeYear ? `Year ${lifecycle.firstPositiveOperatingIncomeYear}` : 'Not within period'}
            </span>
          </div>
          <div className="rounded-app-sm border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-surface-950 sm:col-span-2">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Interest basis:</span>{' '}
            <span className="text-slate-600 dark:text-slate-300">
              Annual interest is charged on the outstanding negative cumulative position. The model runs to at least year 12 and continues until break-even{lifecycle.reachesBreakEven ? '.' : `, capped at year ${lifecycle.maxModelledYear}.`}
            </span>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-app border border-slate-200 bg-white dark:border-slate-800 dark:bg-surface-900">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Year-by-year lifecycle</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1900px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-950 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2">Year</th>
                <th className="px-3 py-2">Phase</th>
                <th className="px-3 py-2 text-right">Income</th>
                <th className="px-3 py-2 text-right">Operating costs</th>
                <th className="px-3 py-2 text-right">Capex reserve</th>
                <th className="px-3 py-2 text-right">NOI</th>
                <th className="px-3 py-2 text-right">Development costs</th>
                <th className="px-3 py-2 text-right">Interest</th>
                <th className="px-3 py-2 text-right">Debt draw</th>
                <th className="px-3 py-2 text-right">Debt service</th>
                <th className="px-3 py-2 text-right">DSCR</th>
                <th className="px-3 py-2 text-right">Equity cashflow</th>
                <th className="px-3 py-2 text-right">Net</th>
                <th className="px-3 py-2 text-right">Cumulative</th>
                <th className="px-3 py-2 text-right">Exit value</th>
                <th className="px-3 py-2 text-right">Selling costs</th>
                <th className="px-3 py-2 text-right">Funding repay</th>
                <th className="px-3 py-2 text-right">Net sale equity</th>
                <th className="px-3 py-2 text-right">Profit on sale</th>
                <th className="px-3 py-2 text-right">ROE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {lifecycle.rows.map((row) => (
                <tr key={row.year}>
                  <td className="px-3 py-2 font-semibold tabular-nums text-slate-900 dark:text-slate-100">{row.year}</td>
                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{row.phase === 'DEVELOPMENT' ? 'Development' : 'Operation'}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{money(row.income)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{money(row.operatingCost)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{money(row.capitalExpenditure)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-700 dark:text-slate-200">{money(row.netOperatingIncome)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{money(row.developmentCost)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{money(row.interest)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{money(row.debtDrawdown)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{money(row.debtService)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{row.dscr === undefined ? '-' : formatQuantity(row.dscr)}</td>
                  <td className={`px-3 py-2 text-right font-semibold tabular-nums ${row.leveredCashflow < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{money(row.leveredCashflow)}</td>
                  <td className={`px-3 py-2 text-right font-semibold tabular-nums ${row.netCashflow < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                    {money(row.netCashflow)}
                  </td>
                  <td className={`px-3 py-2 text-right font-semibold tabular-nums ${row.cumulativeCashflow < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                    {money(row.cumulativeCashflow)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-700 dark:text-slate-200">{money(row.assetSaleValue)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{money(row.sellingCosts)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{money(row.outstandingFunding)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-700 dark:text-slate-200">{money(row.netSaleEquity)}</td>
                  <td className={`px-3 py-2 text-right font-semibold tabular-nums ${row.profitOnSale < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{money(row.profitOnSale)}</td>
                  <td className={`px-3 py-2 text-right font-semibold tabular-nums ${row.returnOnEquityPercent < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-700 dark:text-slate-200'}`}>{formatQuantity(row.returnOnEquityPercent)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CostsEditor({
  option,
  linkedProject,
  updateOption,
}: {
  option: DevelopmentAppraisalOption;
  linkedProject: Project | null;
  updateOption: (optionId: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const updateCostLine = (lineId: string, patch: Partial<AppraisalCostLine>) => {
    updateOption(option.id, (current) => ({
      ...current,
      costLines: updateLine(current.costLines, lineId, patch),
    }));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-end gap-2">
        {linkedProject && (
          <button
            type="button"
            onClick={() => updateOption(option.id, (current) => ({
              ...current,
              costLines: [
                ...current.costLines,
                {
                  ...buildLinkedProjectCostSnapshot(linkedProject),
                  cashflow: { type: 'EVEN', startMonth: 1, endMonth: current.durationMonths },
                },
              ],
            }))}
            className="workspace-secondary-btn px-3 py-2 text-xs"
          >
            <Link2 className="h-4 w-4" />
            Insert linked project snapshot
          </button>
        )}
        <button type="button" onClick={() => updateOption(option.id, (current) => ({ ...current, costLines: [...current.costLines, createDefaultCostLine('OTHER', current.durationMonths)] }))} className="workspace-secondary-btn px-3 py-2 text-xs">
          <Plus className="h-4 w-4" />
          Cost row
        </button>
      </div>

      {option.costLines.map((line) => (
        <div key={line.id} className="rounded-app border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-surface-900">
          <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_0.8fr_0.9fr_0.8fr_auto]">
            <label>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Title</span>
              <input value={line.title} disabled={line.readOnlySnapshot || line.siteCost?.status === 'CLEARED'} onChange={(event) => updateCostLine(line.id, { title: event.target.value })} className={`${inputClass()} mt-1 disabled:opacity-70`} />
            </label>
            <label>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Category</span>
              <select value={line.category} disabled={line.readOnlySnapshot || line.siteCost?.status === 'CLEARED'} onChange={(event) => updateCostLine(line.id, { category: event.target.value as AppraisalCostCategory })} className={`${inputClass()} mt-1 disabled:opacity-70`}>
                {costCategories.map((category) => <option key={category} value={category}>{APPRAISAL_COST_CATEGORY_LABELS[category]}</option>)}
              </select>
            </label>
            <NumberField label="Amount" value={line.amount || 0} disabled={line.readOnlySnapshot || line.siteCost?.status === 'CLEARED'} onChange={(value) => updateCostLine(line.id, { amount: value })} />
            <label>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Percentage basis</span>
              <select value={line.percentageBasis || 'NONE'} disabled={line.readOnlySnapshot || line.siteCost?.status === 'CLEARED'} onChange={(event) => updateCostLine(line.id, { percentageBasis: event.target.value as AppraisalCostPercentageBasis })} className={`${inputClass()} mt-1 disabled:opacity-70`}>
                {percentageBases.map((basis) => <option key={basis} value={basis}>{percentageBasisLabel(basis, option.template)}</option>)}
              </select>
            </label>
            <NumberField label="Percent" value={line.percentageValue || 0} disabled={line.readOnlySnapshot || line.siteCost?.status === 'CLEARED'} onChange={(value) => updateCostLine(line.id, { percentageValue: value })} />
            <button type="button" onClick={() => updateOption(option.id, (current) => ({ ...current, costLines: current.costLines.filter((entry) => entry.id !== line.id) }))} className="mt-5 rounded-app-sm border border-slate-200 p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:hover:bg-rose-950/30 dark:hover:text-rose-200" aria-label="Delete cost row">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          {line.sourceLabel && <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{line.sourceLabel}</div>}
          <LineTimingEditor
            profile={line.cashflow}
            durationMonths={option.durationMonths}
            onChange={(profile) => updateCostLine(line.id, { cashflow: profile })}
          />
        </div>
      ))}
    </div>
  );
}

function AssumptionsEditor({
  option,
  updateOption,
}: {
  option: DevelopmentAppraisalOption;
  updateOption: (optionId: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const [draft, setDraft] = React.useState({
    targetProfitOnGdvPercent: String(option.targetProfitOnGdvPercent || ''),
    financeAnnualRatePercent: String(option.financeAnnualRatePercent || ''),
    overheadPercent: String(getHouseBuildingOverheadPercent(option)),
    gdvIncentivePercent: String(option.gdvIncentivePercent || ''),
    expectedStartDate: option.programme?.expectedStartDate || '',
    appraisalPriceIndex: option.programme?.appraisalPriceIndex ? String(option.programme.appraisalPriceIndex) : '',
    startPriceIndex: option.programme?.startPriceIndex ? String(option.programme.startPriceIndex) : '',
    knownLandValue: sterlingInputValue(option.knownLandValue),
    sellerMinimumLandValue: sterlingInputValue(option.sellerMinimumLandValue),
    assumptions: option.assumptions || '',
  });
  React.useEffect(() => {
    setDraft({
      targetProfitOnGdvPercent: String(option.targetProfitOnGdvPercent || ''),
      financeAnnualRatePercent: String(option.financeAnnualRatePercent || ''),
      overheadPercent: String(getHouseBuildingOverheadPercent(option)),
      gdvIncentivePercent: String(option.gdvIncentivePercent || ''),
      expectedStartDate: option.programme?.expectedStartDate || '',
      appraisalPriceIndex: option.programme?.appraisalPriceIndex ? String(option.programme.appraisalPriceIndex) : '',
      startPriceIndex: option.programme?.startPriceIndex ? String(option.programme.startPriceIndex) : '',
      knownLandValue: sterlingInputValue(option.knownLandValue),
      sellerMinimumLandValue: sterlingInputValue(option.sellerMinimumLandValue),
      assumptions: option.assumptions || '',
    });
  }, [option.id]);
  const commitDraft = (patch: Partial<DevelopmentAppraisalOption>) => {
    updateOption(option.id, (current) => ({ ...current, ...patch }));
  };
  const commitProgrammeDraft = (patch: NonNullable<DevelopmentAppraisalOption['programme']>) => {
    updateOption(option.id, (current) => ({
      ...current,
      programme: {
        ...(current.programme || {}),
        ...patch,
      },
    }));
  };
  const commitCurrencyDraft = (field: 'knownLandValue' | 'sellerMinimumLandValue', value: string) => {
    const amount = currencyInputNumber(value);
    setDraft((current) => ({ ...current, [field]: sterlingInputValue(amount) }));
    commitDraft({ [field]: amount });
  };
  const changeCalculationMode = (calculationMode: AppraisalCalculationMode) => {
    if (option.calculationMode === calculationMode) return;
    const shouldSeedKnownLand = calculationMode === 'KNOWN_LAND_PROFIT_ON_GDV' && !option.knownLandValue;
    const solvedLandValue = shouldSeedKnownLand ? calculateAppraisalOption(option).landValue : option.knownLandValue;
    if (shouldSeedKnownLand) {
      setDraft((draftCurrent) => ({ ...draftCurrent, knownLandValue: sterlingInputValue(solvedLandValue) }));
    }
    updateOption(option.id, (current) => ({
      ...current,
      calculationMode,
      ...(shouldSeedKnownLand ? { knownLandValue: solvedLandValue } : {}),
    }));
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {option.template !== 'COMMERCIAL_INCOME' && (
        <div className="lg:col-span-2 rounded-app border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-surface-900/70">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Calculation basis</div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {setupCalculationModes.map((mode) => {
              const checked = option.calculationMode === mode.id;
              return (
                <label
                  key={mode.id}
                  className={`flex cursor-pointer gap-3 rounded-app-sm border p-3 text-sm transition ${
                    checked
                      ? 'border-primary-300 bg-primary-50 text-primary-950 dark:border-primary-700 dark:bg-primary-950/30 dark:text-primary-100'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-surface-950 dark:text-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name={`appraisal-assumption-calculation-${option.id}`}
                    value={mode.id}
                    checked={checked}
                    onChange={() => changeCalculationMode(mode.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-semibold">{mode.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{mode.detail}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
      {option.template !== 'COMMERCIAL_INCOME' && (
        <label>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Target profit on GDV %</span>
          <input
            type="number"
            value={draft.targetProfitOnGdvPercent}
            onChange={(event) => setDraft((current) => ({ ...current, targetProfitOnGdvPercent: event.target.value }))}
            onBlur={(event) => commitDraft({ targetProfitOnGdvPercent: numberValue(event.currentTarget.value) })}
            onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
            className={`${inputClass()} mt-1`}
          />
        </label>
      )}
      <label>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Finance annual rate %</span>
        <input
          type="number"
          value={draft.financeAnnualRatePercent}
          onChange={(event) => setDraft((current) => ({ ...current, financeAnnualRatePercent: event.target.value }))}
          onBlur={(event) => commitDraft({ financeAnnualRatePercent: numberValue(event.currentTarget.value) })}
          onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
          className={`${inputClass()} mt-1`}
        />
      </label>
      {option.calculationMode === 'KNOWN_LAND_PROFIT_ON_GDV' && (
        <label>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Known land value</span>
          <input
            type="text"
            inputMode="decimal"
            value={draft.knownLandValue}
            onChange={(event) => setDraft((current) => ({ ...current, knownLandValue: event.target.value }))}
            onBlur={(event) => commitCurrencyDraft('knownLandValue', event.currentTarget.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
            className={`${inputClass('text-right tabular-nums')} mt-1`}
          />
        </label>
      )}
      {option.template !== 'COMMERCIAL_INCOME' && (
      <label>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Likely lowest seller land price</span>
        <input
          type="text"
          inputMode="decimal"
          value={draft.sellerMinimumLandValue}
          onChange={(event) => setDraft((current) => ({ ...current, sellerMinimumLandValue: event.target.value }))}
          onBlur={(event) => commitCurrencyDraft('sellerMinimumLandValue', event.currentTarget.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
          placeholder="Leave blank if unknown"
          className={`${inputClass('text-right tabular-nums')} mt-1`}
        />
      </label>
      )}
      {option.template !== 'COMMERCIAL_INCOME' && (
        <label>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Overheads %</span>
          <span className="mt-1 flex gap-2">
            <input
              type="number"
              value={draft.overheadPercent}
              onChange={(event) => setDraft((current) => ({ ...current, overheadPercent: event.target.value }))}
              onBlur={(event) => commitDraft({ overheadPercent: Math.max(0, numberValue(event.currentTarget.value)) })}
              onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
              className={inputClass('text-right')}
            />
            <button
              type="button"
              onClick={() => {
                setDraft((current) => ({ ...current, overheadPercent: String(HOUSE_BUILDING_OVERHEAD_PERCENT) }));
                commitDraft({ overheadPercent: HOUSE_BUILDING_OVERHEAD_PERCENT });
              }}
              className="workspace-secondary-btn px-3 py-2 text-xs"
            >
              Reset
            </button>
          </span>
        </label>
      )}
      {option.template !== 'COMMERCIAL_INCOME' && (
        <label>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Private sales incentive %</span>
          <input
            type="number"
            value={draft.gdvIncentivePercent}
            onChange={(event) => setDraft((current) => ({ ...current, gdvIncentivePercent: event.target.value }))}
            onBlur={(event) => commitDraft({ gdvIncentivePercent: Math.max(0, numberValue(event.currentTarget.value)) })}
            onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
            placeholder="0"
            className={`${inputClass('text-right')} mt-1`}
          />
        </label>
      )}
      {option.template !== 'COMMERCIAL_INCOME' && (
        <>
          <label>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Expected start date</span>
            <input
              type="date"
              value={draft.expectedStartDate}
              onChange={(event) => setDraft((current) => ({ ...current, expectedStartDate: event.target.value }))}
              onBlur={(event) => commitProgrammeDraft({ expectedStartDate: event.currentTarget.value })}
              className={`${inputClass()} mt-1`}
            />
          </label>
          <label>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Current price index</span>
            <input
              type="number"
              value={draft.appraisalPriceIndex}
              onChange={(event) => setDraft((current) => ({ ...current, appraisalPriceIndex: event.target.value }))}
              onBlur={(event) => commitProgrammeDraft({ appraisalPriceIndex: numberValue(event.currentTarget.value) })}
              onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
              placeholder="Index at appraisal date"
              className={`${inputClass('text-right')} mt-1`}
            />
          </label>
          <label>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Start date price index</span>
            <input
              type="number"
              value={draft.startPriceIndex}
              onChange={(event) => setDraft((current) => ({ ...current, startPriceIndex: event.target.value }))}
              onBlur={(event) => commitProgrammeDraft({ startPriceIndex: numberValue(event.currentTarget.value) })}
              onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
              placeholder="Index at expected start"
              className={`${inputClass('text-right')} mt-1`}
            />
          </label>
        </>
      )}
      <label className="lg:col-span-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Assumption notes</span>
        <textarea
          value={draft.assumptions}
          onChange={(event) => setDraft((current) => ({ ...current, assumptions: event.target.value }))}
          onBlur={(event) => commitDraft({ assumptions: event.currentTarget.value })}
          className={`${inputClass('min-h-[8rem]')} mt-1`}
        />
      </label>
    </div>
  );
}

function formatRateFt2(value: number) {
  return `${moneyWithDecimals(value, 0)}/ft2`;
}

function reportValueClass(value: number, emphasis = true) {
  return [
    'text-right tabular-nums',
    emphasis ? 'font-semibold' : '',
    value < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-slate-100',
  ].filter(Boolean).join(' ');
}

function reportPercentClass(value: number) {
  return `px-3 py-2 ${reportValueClass(value, false)}`;
}

function evidencePreview(value: string, maxLength = 700) {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function EvidenceDownloadButton({
  report,
  className,
  children,
  ariaLabel,
}: {
  report: AppraisalPricingReport;
  className: string;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  const { showToast } = useToast();
  const [isDownloading, setIsDownloading] = React.useState(false);
  return (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel || `Download ${report.fileName}`}
      title={ariaLabel || `Download ${report.fileName}`}
      disabled={isDownloading}
      onClick={() => {
        void (async () => {
          setIsDownloading(true);
          try {
            const saved = await downloadAppraisalEvidenceAttachment(report);
            showToast({ type: saved ? 'success' : 'info', message: saved ? `${report.fileName} exported.` : 'Evidence export was cancelled.' });
          } catch (error) {
            showToast({ type: 'error', message: error instanceof Error ? error.message : 'Evidence export failed.' });
          } finally {
            setIsDownloading(false);
          }
        })();
      }}
    >
      {children}
    </button>
  );
}

function EvidenceStorageStatus({ report }: { report: AppraisalPricingReport }) {
  const [status, setStatus] = React.useState(report.integrityStatus || (report.storageMode === 'MANAGED_LOCAL' ? 'UNAVAILABLE' : 'VERIFIED'));
  const [detail, setDetail] = React.useState(appraisalEvidenceStatusLabel(report));

  React.useEffect(() => {
    let active = true;
    if (report.storageMode !== 'MANAGED_LOCAL') return () => { active = false; };
    void verifyAppraisalEvidence(report).then((result) => {
      if (!active) return;
      setStatus(result.status);
      setDetail(result.detail);
    });
    return () => { active = false; };
  }, [report]);

  const tone = status === 'VERIFIED'
    ? 'text-emerald-700 dark:text-emerald-300'
    : status === 'MISSING' || status === 'CHANGED'
      ? 'text-rose-700 dark:text-rose-300'
      : 'text-amber-700 dark:text-amber-300';
  return <div className={`mt-1 text-[11px] ${tone}`} title={detail}>{status === 'VERIFIED' ? appraisalEvidenceStatusLabel(report) : detail}</div>;
}

function ArchitectFeasibilityPlan({ option }: { option: DevelopmentAppraisalOption }) {
  const layout = React.useMemo(() => currentArchitectFeasibilityLayout(option), [option.architectFeasibilityLayouts]);
  const [preview, setPreview] = React.useState<AppraisalLayoutPreview | null>(null);
  const [previewError, setPreviewError] = React.useState('');

  React.useEffect(() => {
    let active = true;
    setPreview(null);
    setPreviewError('');
    if (!layout) return () => { active = false; };
    void renderArchitectFeasibilityLayout(layout)
      .then((result) => {
        if (active) setPreview(result);
      })
      .catch(() => {
        if (active) setPreviewError('The current feasibility layout could not be rendered into the report.');
      });
    return () => { active = false; };
  }, [layout]);

  if (!layout) return null;
  return (
    <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Architect feasibility layout</h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Current site plan used to support the layout, capacity and site assumptions.</p>
        </div>
        <EvidenceDownloadButton report={layout} className="workspace-secondary-btn px-3 py-2 text-xs">
          <FileDown className="h-4 w-4" />
          Source layout
        </EvidenceDownloadButton>
      </div>
      {preview ? (
        <div className="mt-3 overflow-hidden rounded-app-sm border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-surface-950">
          <img src={preview.dataUrl} alt="Architect feasibility layout" className="mx-auto block max-h-[48rem] w-auto max-w-full object-contain" />
        </div>
      ) : previewError ? (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{previewError}</p>
      ) : (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Preparing site plan preview...</p>
      )}
    </section>
  );
}

async function dataUrlToGeminiFile(report: AppraisalPricingReport | undefined) {
  if (!report) return null;
  const dataUrl = await resolveAppraisalEvidenceDataUrl(report);
  if (!dataUrl) return null;
  const commaIndex = dataUrl.indexOf(',');
  const data = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
  return data ? { mimeType: report.mimeType || 'application/octet-stream', data } : null;
}

/**
 * Text extraction is provided for every item of evidence in the final-report
 * context. Supply the source files as well when the combined inline payload is
 * safe for the model request, so plans and formatted pricing schedules can be
 * considered as visual evidence too.
 */
async function finalReportEvidenceFiles(option: DevelopmentAppraisalOption) {
  const evidence = [
    option.pricingReport,
    option.constraintsReport,
    ...(option.landContractVersions || []),
    ...(option.baseMeasurementFiles || []),
    ...(option.architectFeasibilityLayouts || []),
    ...(option.consentTracker || []).flatMap((consent) => consent.uploads || []),
    ...(option.costLines || []).flatMap((line) => line.formalQuotations || []),
    ...Object.values(option.surveyReports?.items || {}).map(choice => choice.quote),
    ...(option.surveyReports?.custom || []).map(choice => choice.quote),
  ].filter((report): report is AppraisalPricingReport => Boolean(report));
  const uniqueEvidence = Array.from(new Map(evidence.map((report) => [report.id, report])).values());
  const maximumFileBytes = 8 * 1024 * 1024;
  const maximumTotalBytes = 24 * 1024 * 1024;
  let totalBytes = 0;
  const files: { mimeType: string; data: string }[] = [];
  for (const report of uniqueEvidence) {
    if (report.size > maximumFileBytes || totalBytes + report.size > maximumTotalBytes) continue;
    try {
      const file = await dataUrlToGeminiFile(report);
      if (!file) continue;
      files.push(file);
      totalBytes += report.size;
    } catch {
      // The extracted text and recorded notes remain in the model context even
      // when an original file cannot be loaded from local evidence storage.
    }
  }
  return files;
}

function ReportScenarioTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: number; note?: string }>;
}) {
  return (
    <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-xs">
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">{row.label}</td>
                <td className={`px-3 py-2 ${reportValueClass(row.value)}`}>{money(row.value)}</td>
                <td className="px-3 py-2 text-right text-slate-500 dark:text-slate-400">{row.note || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CommercialDecisionEditor({
  appraisal,
  option,
  updateOption,
}: {
  appraisal: DevelopmentAppraisal;
  option: DevelopmentAppraisalOption;
  updateOption: (optionId: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const { appSettings, projects } = useAppContext();
  const { showToast } = useToast();
  const lifecycle = React.useMemo(() => calculateCommercialLifecycle(option), [option]);
  const financialAssurance = React.useMemo(() => calculateCommercialFinancialAssurance(option), [option]);
  const strategy = React.useMemo(() => buildCommercialExitStrategy(option), [option]);
  const qualityChecks = React.useMemo(() => buildAppraisalQualityChecks(option), [option]);
  const hasReportBlockers = qualityChecks.some((check) => check.severity === 'BLOCKER');
  const exitRows = React.useMemo(() => lifecycle.rows.filter((row) => row.phase === 'OPERATION' && row.assetSaleValue > 0), [lifecycle.rows]);
  const recommendedExit = React.useMemo(
    () => exitRows.find((row) => row.year === strategy.bestProfitYear) || exitRows[exitRows.length - 1],
    [exitRows, strategy.bestProfitYear],
  );
  const [reportOpen, setReportOpen] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [reviewer, setReviewer] = React.useState('');
  const [approvalDate, setApprovalDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [evidenceJustification, setEvidenceJustification] = React.useState('');
  const [allocationJustification, setAllocationJustification] = React.useState('');
  const [lockedExport, setLockedExport] = React.useState<string | null>(null);
  const approvalRequirements = React.useMemo(
    () => commercialReportIssueRequirements(option, evidenceJustification, allocationJustification),
    [option, evidenceJustification, allocationJustification],
  );
  const approveReportIssue = async () => {
    if (!option.finalReportExecutiveSummary?.trim()) {
      showToast({ type: 'error', message: 'Generate the commercial report before approving an issue.' });
      return;
    }
    if (!reviewer.trim()) {
      showToast({ type: 'error', message: 'Enter the reviewer before approving the report issue.' });
      return;
    }
    if (!approvalDate) {
      showToast({ type: 'error', message: 'Enter the approval date before approving the report issue.' });
      return;
    }
    if (hasReportBlockers || approvalRequirements.length > 0) {
      showToast({ type: 'error', message: 'Complete the commercial report controls before approving an issue.' });
      return;
    }
    const issue = await createApprovedReportIssue({ appraisal, option, reviewer, approvedAt: approvalDate, evidenceJustification, allocationJustification });
    updateOption(option.id, (current) => ({ ...current, approvedReportIssues: [...(current.approvedReportIssues || []), issue] }));
    showToast({ type: 'success', message: `Approved report issue ${issue.issueNumber} recorded. Export the locked PDF and Excel issue below.` });
  };
  const exportApprovedIssue = async (issueId: string, format: 'PDF' | 'EXCEL') => {
    const issue = (option.approvedReportIssues || []).find((entry) => entry.id === issueId);
    if (!issue) return;
    setLockedExport(`${issueId}-${format}`);
    try {
      const saved = format === 'PDF'
        ? await downloadApprovedReportIssuePdf(issue, projects)
        : await downloadApprovedReportIssueExcel(issue, projects);
      if (saved) {
        const exportedAt = new Date().toISOString();
        updateOption(option.id, (current) => ({
          ...current,
          approvedReportIssues: (current.approvedReportIssues || []).map((entry) => entry.id !== issueId ? entry : {
            ...entry,
            outputs: entry.outputs.map((output) => output.format !== format ? output : { ...output, status: 'EXPORTED', exportedAt }),
          }),
        }));
        showToast({ type: 'success', message: `Locked approved-issue ${format} saved.` });
      } else {
        showToast({ type: 'info', message: 'Approved-issue export was cancelled.' });
      }
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Approved-issue export failed.' });
    } finally {
      setLockedExport(null);
    }
  };
  const generateReport = async () => {
    if (!canIssueAppraisalReport(option)) {
      showToast({ type: 'error', message: 'Resolve the commercial report-preparation blockers before generating an issue report.' });
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generateCommercialInvestmentReport(buildCommercialInvestmentReportContext(option), appSettings.ai);
      const finalReportExecutiveSummary = result.ok ? result.data : buildFallbackCommercialInvestmentReport(option);
      updateOption(option.id, (current) => ({
        ...current,
        finalReportExecutiveSummary,
        finalReportSourceSignature: JSON.stringify(buildCommercialInvestmentReportContext(current)),
      }));
      setReportOpen(true);
      showToast({ type: result.ok ? 'success' : 'info', message: result.ok ? 'Commercial investment report generated.' : 'AI was unavailable; a detailed lifecycle report was prepared from the live appraisal data.' });
    } catch (error) {
      console.error('Commercial investment report generation error', error);
      const finalReportExecutiveSummary = buildFallbackCommercialInvestmentReport(option);
      updateOption(option.id, (current) => ({ ...current, finalReportExecutiveSummary }));
      setReportOpen(true);
      showToast({ type: 'info', message: 'A detailed lifecycle report was prepared from the live appraisal data.' });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!reportOpen) {
    return (
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Commercial investment report</div>
          <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">Exit strategy and lifecycle returns</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Generate a report that carries the site-scope assessment through revenue, lifecycle costs, annual exit values and a hold-versus-sale recommendation.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
            <MetricTile label="Best profit exit" value={strategy.bestProfitYear ? `Year ${strategy.bestProfitYear}` : 'None'} tone={strategy.bestProfit > 0 ? 'good' : 'bad'} />
            <MetricTile label="Profit on sale" value={money(strategy.bestProfit)} tone={strategy.bestProfit > 0 ? 'good' : 'bad'} />
            <MetricTile label="Equity IRR" value={strategy.irrPercent === undefined ? 'N/A' : `${formatQuantity(strategy.irrPercent)}%`} tone={(strategy.irrPercent || 0) >= (option.commercialDiscountRatePercent || 10) ? 'good' : 'watch'} />
            <MetricTile label="NPV" value={money(strategy.npv)} tone={strategy.npv > 0 ? 'good' : 'bad'} />
            <MetricTile label="Equity multiple" value={strategy.equityMultiple === undefined ? 'N/A' : `${formatQuantity(strategy.equityMultiple)}x`} tone={(strategy.equityMultiple || 0) >= 1 ? 'good' : 'watch'} />
            <MetricTile label="Downside" value={strategy.downsideSupported ? 'Supported' : 'Fails'} tone={strategy.downsideSupported ? 'good' : 'bad'} />
          </div>
          <div className="mt-4"><AppraisalQualityChecksPanel checks={qualityChecks} /></div>
          <div className="mt-4 flex gap-2">
            {option.finalReportExecutiveSummary?.trim() ? (
              <button type="button" onClick={() => setReportOpen(true)} className="workspace-secondary-btn flex-1 px-3 py-2 text-sm"><BookOpen className="h-4 w-4" /> Open report</button>
            ) : null}
            <button type="button" onClick={() => { void generateReport(); }} disabled={isGenerating || hasReportBlockers} className="workspace-primary-btn flex-1 px-3 py-2 text-sm disabled:opacity-50"><Sparkles className="h-4 w-4" />{isGenerating ? 'Generating...' : option.finalReportExecutiveSummary?.trim() ? 'Refresh report' : 'Generate report'}</button>
          </div>
        </section>
        <section className="rounded-app border border-sky-200 bg-sky-50/70 p-4 dark:border-sky-900 dark:bg-sky-950/20">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">Current model position</div>
          <h4 className="mt-1 text-base font-semibold text-slate-950 dark:text-slate-50">{strategy.label}</h4>
          <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{strategy.summary}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-smoke="appraisals-commercial-investment-report">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Commercial investment report</div>
          <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">{appraisal.name}</h3>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setReportOpen(false)} className="workspace-secondary-btn px-3 py-2 text-xs">Edit inputs</button>
          <button type="button" onClick={() => { void generateReport(); }} disabled={isGenerating} className="workspace-primary-btn px-3 py-2 text-xs disabled:opacity-50"><Sparkles className="h-4 w-4" />{isGenerating ? 'Generating...' : 'Refresh report'}</button>
        </div>
      </div>

      <AppraisalQualityChecksPanel checks={qualityChecks} />

      <section className="rounded-app border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900 dark:bg-amber-950/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-200">Controlled report issue</div>
            <h4 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">Approve a frozen issue</h4>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600 dark:text-slate-300">Approval captures the reviewed report source as an immutable SHA-256 snapshot. The PDF and Excel exports are then generated only from that preserved issue.</p>
          </div>
          <Lock className="h-5 w-5 text-amber-700 dark:text-amber-300" />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Reviewer</span><input value={reviewer} onChange={(event) => setReviewer(event.target.value)} placeholder="Reviewer name" className={`${inputClass()} mt-1 w-full`} /></label>
          <label><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Approval date</span><input type="date" value={approvalDate} onChange={(event) => setApprovalDate(event.target.value)} className={`${inputClass()} mt-1 w-full`} /></label>
          <label><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Evidence review justification</span><textarea value={evidenceJustification} onChange={(event) => setEvidenceJustification(event.target.value)} placeholder="Explain the evidence reviewed and how it supports the commercial assumptions." className={`${inputClass()} mt-1 min-h-20 w-full resize-y`} /></label>
          <label><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Shared-cost allocation justification</span><textarea value={allocationJustification} onChange={(event) => setAllocationJustification(event.target.value)} placeholder="Explain the allocation of shared access, servicing, parking and other site-wide costs." className={`${inputClass()} mt-1 min-h-20 w-full resize-y`} /></label>
        </div>
        {approvalRequirements.length > 0 && <ul className="mt-3 space-y-1 text-xs leading-5 text-rose-700 dark:text-rose-300">{approvalRequirements.map((requirement) => <li key={requirement}>- {requirement}</li>)}</ul>}
        <div className="mt-3 flex justify-end"><button type="button" onClick={() => { void approveReportIssue(); }} disabled={hasReportBlockers || approvalRequirements.length > 0 || !reviewer.trim()} className="workspace-primary-btn px-3 py-2 text-xs disabled:opacity-50"><Lock className="h-4 w-4" />Approve report issue</button></div>
      </section>

      {(option.approvedReportIssues || []).length > 0 && (
        <section className="overflow-hidden rounded-app border border-slate-200 bg-white dark:border-slate-800 dark:bg-surface-900">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800"><h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Approved issue record</h4><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Earlier issues remain immutable. Create a new issue after any report or assumption change.</p></div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">{[...(option.approvedReportIssues || [])].sort((left, right) => right.issueNumber - left.issueNumber).map((issue) => (
            <div key={issue.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs">
              <div className="min-w-0"><div className="font-semibold text-slate-900 dark:text-slate-100">Issue {issue.issueNumber} approved by {issue.reviewer} on {issue.approvedAt}</div><div className="mt-1 break-all text-slate-500 dark:text-slate-400">SHA-256: {issue.sourceHash}</div><div className="mt-1 text-slate-600 dark:text-slate-300">Evidence: {issue.evidenceJustification}</div><div className="mt-1 text-slate-600 dark:text-slate-300">Allocation: {issue.allocationJustification}</div></div>
              <div className="flex shrink-0 gap-2"><button type="button" onClick={() => { void exportApprovedIssue(issue.id, 'PDF'); }} disabled={lockedExport !== null} className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-50"><FileDown className="h-4 w-4" />{lockedExport === `${issue.id}-PDF` ? 'Preparing...' : 'Locked PDF'}</button><button type="button" onClick={() => { void exportApprovedIssue(issue.id, 'EXCEL'); }} disabled={lockedExport !== null} className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-50"><FileSpreadsheet className="h-4 w-4" />{lockedExport === `${issue.id}-EXCEL` ? 'Preparing...' : 'Locked Excel'}</button></div>
            </div>
          ))}</div>
        </section>
      )}

      <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Executive investment commentary</h4>
        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700 dark:text-slate-200">{option.finalReportExecutiveSummary || buildFallbackCommercialInvestmentReport(option)}</p>
      </section>

      <section className="overflow-hidden rounded-app border border-slate-200 bg-white dark:border-slate-800 dark:bg-surface-900">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800"><h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Financial assurance and sensitivity cases</h4><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">The funding case is assessed from monthly cashflows, then tested against base, upside and downside rent, void, cost, capex, yield and programme assumptions.</p></div>
        <div className="grid gap-2 px-4 py-3 text-xs sm:grid-cols-2 xl:grid-cols-6"><MetricTile label="Debt drawn" value={money(lifecycle.totalDebtDrawn)} /><MetricTile label="Debt fees" value={money(lifecycle.totalDebtFees)} /><MetricTile label="Equity contributed" value={money(lifecycle.totalEquityContributed)} /><MetricTile label="Min DSCR" value={lifecycle.minimumDscr === undefined ? 'N/A' : `${formatQuantity(lifecycle.minimumDscr)}x`} tone={lifecycle.minimumDscr !== undefined && lifecycle.minimumDscr < (option.commercialMinimumDscr || 1.25) ? 'bad' : 'good'} /><MetricTile label="Base IRR" value={lifecycle.irrPercent === undefined ? 'N/A' : `${formatQuantity(lifecycle.irrPercent)}%`} /><MetricTile label="Base NPV" value={money(lifecycle.npv)} tone={lifecycle.npv > 0 ? 'good' : 'bad'} /></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-left text-xs"><thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400"><tr><th className="px-3 py-2">Case</th><th className="px-3 py-2 text-right">Rent / void</th><th className="px-3 py-2 text-right">Cost / capex</th><th className="px-3 py-2 text-right">Yield / delay</th><th className="px-3 py-2 text-right">IRR</th><th className="px-3 py-2 text-right">NPV</th><th className="px-3 py-2 text-right">Equity multiple</th><th className="px-3 py-2 text-right">Min DSCR</th><th className="px-3 py-2">Outcome</th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-800">{financialAssurance.scenarios.map((result) => <tr key={result.scenario.kind}><td className="px-3 py-2 font-semibold">{result.scenario.name}</td><td className="px-3 py-2 text-right tabular-nums">{formatQuantity(result.scenario.rentChangePercent)}% / {formatQuantity(result.scenario.voidChangePercent)} pts</td><td className="px-3 py-2 text-right tabular-nums">{formatQuantity(result.scenario.developmentCostChangePercent)}% / {formatQuantity(result.scenario.lifecycleCapexChangePercent)}%</td><td className="px-3 py-2 text-right tabular-nums">{formatQuantity(result.scenario.exitYieldShiftBps)} bps / {formatQuantity(result.scenario.delayMonths)}m</td><td className="px-3 py-2 text-right tabular-nums">{result.lifecycle.irrPercent === undefined ? 'N/A' : `${formatQuantity(result.lifecycle.irrPercent)}%`}</td><td className={`px-3 py-2 text-right font-semibold tabular-nums ${result.lifecycle.npv < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{money(result.lifecycle.npv)}</td><td className="px-3 py-2 text-right tabular-nums">{result.lifecycle.equityMultiple === undefined ? 'N/A' : `${formatQuantity(result.lifecycle.equityMultiple)}x`}</td><td className="px-3 py-2 text-right tabular-nums">{result.lifecycle.minimumDscr === undefined ? 'N/A' : `${formatQuantity(result.lifecycle.minimumDscr)}x`}</td><td className="px-3 py-2 font-semibold">{result.recommendation}</td></tr>)}</tbody></table></div>
      </section>

      <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Site scope and proposed mix</h4>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{option.commercialScopeAssessment?.summary || 'No site-scope assessment has been saved. The proposal should be confirmed against the entered site area, access, servicing and planning requirements.'}</p>
          </div>
          <div className="grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-1">
            <MetricTile label="Commercial template" value={getCommercialAppraisalTemplate(option.commercialTemplateId).name} />
            <MetricTile label="Location" value={option.commercialLocation || 'Not recorded'} />
            <MetricTile label="Land value" value={money(option.knownLandValue || 0)} />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-app border border-slate-200 bg-white dark:border-slate-800 dark:bg-surface-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Asset mix, income and value basis</h4>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Each included commercial asset is assessed separately before the portfolio totals are combined.</p>
          </div>
          <MetricTile label="Site-wide costs" value={money(getCommercialSiteWideCostLines(option).reduce((total, line) => total + (line.amount || 0), 0))} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400"><tr><th className="px-3 py-2">Asset</th><th className="px-3 py-2">Revenue basis</th><th className="px-3 py-2">Assumption source</th><th className="px-3 py-2 text-right">Site area</th><th className="px-3 py-2 text-right">Development cost</th><th className="px-3 py-2 text-right">Annual income</th><th className="px-3 py-2 text-right">Exit yield</th><th className="px-3 py-2 text-right">Year 1 exit value</th></tr></thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {getCommercialAssets(option).map((asset) => {
                const yearOne = lifecycle.rows.find((row) => row.phase === 'OPERATION')?.assetValues.find((value) => value.assetId === asset.id);
                return <tr key={asset.id} className={!asset.included ? 'opacity-60' : ''}><td className="px-3 py-2"><div className="font-semibold text-slate-900 dark:text-slate-100">{asset.title}</div><div className="mt-0.5 text-slate-500 dark:text-slate-400">{asset.included ? asset.rationale || 'Included in the commercial assessment.' : asset.excludedReason || 'Excluded from the current commercial assessment.'}</div></td><td className="px-3 py-2">{asset.revenueModel.toLowerCase().replace(/_/g, ' ')}</td><td className="px-3 py-2 text-slate-600 dark:text-slate-300">{asset.source.toLowerCase().replace(/_/g, ' ')}</td><td className="px-3 py-2 text-right tabular-nums">{formatQuantity(asset.siteAllocationM2 || 0)} m2</td><td className="px-3 py-2 text-right tabular-nums">{money(calculateCommercialAssetDevelopmentCost(option, asset))}</td><td className="px-3 py-2 text-right font-semibold tabular-nums">{money(calculateCommercialAssetAnnualIncome(option, asset))}</td><td className="px-3 py-2 text-right tabular-nums">{formatQuantity(asset.exitYieldPercent ?? option.commercialExitYieldPercent ?? 0)}%</td><td className="px-3 py-2 text-right font-semibold tabular-nums">{money(yearOne?.assetSaleValue || 0)}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Proposed asset and investment basis</h4>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">The operating and exit assumptions used to assess the commercial investment case.</p>
          </div>
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">{strategy.label}</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="Starting annual income" value={money(lifecycle.startingAnnualIncome)} tone={lifecycle.startingAnnualIncome > 0 ? 'good' : 'watch'} />
          <MetricTile label="Operating cost" value={`${formatQuantity(option.commercialAnnualOperatingCostPercent || 0)}%`} />
          <MetricTile label="Revenue growth" value={`${formatQuantity(option.commercialAnnualRevenueGrowthPercent || 0)}%`} />
          <MetricTile label="Finance rate" value={`${formatQuantity(option.financeAnnualRatePercent || 0)}%`} />
        </div>
        {option.commercialRevenueAssessment?.summary && (
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{option.commercialRevenueAssessment.summary}</p>
        )}
      </section>

      <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Life costs, returns and annual sale position</h4>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Exit value is capitalised from annual NOI at the current exit yield, before selling costs and repayment of outstanding funding.</p>
          </div>
          <div className="grid gap-2 text-xs sm:grid-cols-3">
            <MetricTile label="Exit yield" value={`${formatQuantity(option.commercialExitYieldPercent || 0)}%`} />
            <MetricTile label="Selling costs" value={`${formatQuantity(option.commercialSellingCostsPercent || 0)}%`} />
            <MetricTile label="Capex reserve" value={`${formatQuantity(option.commercialAnnualLifecycleCapexPercent || 0)}%`} />
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[1320px] text-left text-xs">
            <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400"><tr><th className="px-3 py-2">Year</th><th className="px-3 py-2 text-right">NOI</th><th className="px-3 py-2 text-right">Capex</th><th className="px-3 py-2 text-right">Interest</th><th className="px-3 py-2 text-right">Principal</th><th className="px-3 py-2 text-right">DSCR</th><th className="px-3 py-2 text-right">Exit value</th><th className="px-3 py-2 text-right">Funding repay</th><th className="px-3 py-2 text-right">Net sale equity</th><th className="px-3 py-2 text-right">Profit on sale</th><th className="px-3 py-2 text-right">IRR at exit</th></tr></thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">{exitRows.map((row) => <tr key={row.year}><td className="px-3 py-2 font-semibold">{row.year}</td><td className="px-3 py-2 text-right tabular-nums">{money(row.netOperatingIncome)}</td><td className="px-3 py-2 text-right tabular-nums">{money(row.capitalExpenditure)}</td><td className="px-3 py-2 text-right tabular-nums">{money(row.interest)}</td><td className="px-3 py-2 text-right tabular-nums">{money(row.principalRepayment)}</td><td className="px-3 py-2 text-right tabular-nums">{row.dscr === undefined ? 'N/A' : `${formatQuantity(row.dscr)}x`}</td><td className="px-3 py-2 text-right font-semibold tabular-nums">{money(row.assetSaleValue)}</td><td className="px-3 py-2 text-right tabular-nums">{money(row.outstandingFunding)}</td><td className="px-3 py-2 text-right font-semibold tabular-nums">{money(row.netSaleEquity)}</td><td className={`px-3 py-2 text-right font-semibold tabular-nums ${row.profitOnSale < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{money(row.profitOnSale)}</td><td className="px-3 py-2 text-right tabular-nums">{formatQuantity(row.returnOnEquityPercent)}%</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className={`rounded-app border p-4 ${strategy.bestProfit > 0 ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20' : 'border-rose-200 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-950/20'}`}>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Ultimate recommendation</div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-base font-semibold text-slate-950 dark:text-slate-50">{strategy.label}</h4>
          {recommendedExit && <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">Year {recommendedExit.year}: {money(recommendedExit.profitOnSale)} profit / {formatQuantity(recommendedExit.returnOnEquityPercent)}% ROE</span>}
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{strategy.summary}</p>
      </section>
    </div>
  );
}

function DecisionEditor({
  appraisal,
  option,
  updateAppraisal,
  updateOption,
  onExportReport,
  isExporting,
}: {
  appraisal: DevelopmentAppraisal;
  option: DevelopmentAppraisalOption;
  updateAppraisal: (appraisalId: string, recipe: (appraisal: DevelopmentAppraisal) => DevelopmentAppraisal) => void;
  updateOption: (optionId: string, recipe: (option: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
  onExportReport: (type: AppraisalExportType, reportLandValue?: number) => void;
  isExporting: boolean;
}) {
  if (option.template === 'COMMERCIAL_INCOME') {
    return <CommercialDecisionEditor appraisal={appraisal} option={option} updateOption={updateOption} />;
  }
  const { showToast } = useToast();
  const { appSettings } = useAppContext();
  const [decisionNoteDraft, setDecisionNoteDraft] = React.useState(option.decisionNote || '');
  const [executiveSummaryDraft, setExecutiveSummaryDraft] = React.useState(option.finalReportExecutiveSummary || '');
  const [landownerLandCostDraft, setLandownerLandCostDraft] = React.useState('0');
  const [reportOpen, setReportOpen] = React.useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = React.useState(false);
  const [generationProgress, setGenerationProgress] = React.useState({ percent: 0, label: '' });
  const [reportDataSnapshot, setReportDataSnapshot] = React.useState<ReturnType<typeof buildFinalReportData> | null>(null);
  const [reportSourceSignatureSnapshot, setReportSourceSignatureSnapshot] = React.useState('');
  const [reportSignatureReady, setReportSignatureReady] = React.useState(false);
  const [openReportSections, setOpenReportSections] = React.useState({
    landSensitivity: false,
    salesSensitivity: false,
    abnormalEvidence: false,
  });
  React.useEffect(() => {
    setDecisionNoteDraft(option.decisionNote || '');
    setExecutiveSummaryDraft(option.finalReportExecutiveSummary || '');
    setLandownerLandCostDraft('0');
    setReportOpen(false);
    setReportDataSnapshot(null);
    setReportSourceSignatureSnapshot('');
    setReportSignatureReady(false);
    setOpenReportSections({
      landSensitivity: false,
      salesSensitivity: false,
      abnormalEvidence: false,
    });
  }, [option.id]);
  React.useEffect(() => {
    setExecutiveSummaryDraft(option.finalReportExecutiveSummary || '');
  }, [option.finalReportExecutiveSummary]);
  React.useEffect(() => {
    if (!isGeneratingSummary) return undefined;
    const timer = window.setInterval(() => {
      setGenerationProgress((current) => {
        if (current.percent >= 88) return current;
        return { ...current, percent: Math.min(88, current.percent + 3) };
      });
    }, 900);
    return () => window.clearInterval(timer);
  }, [isGeneratingSummary]);
  const finalReportMetrics = React.useMemo(() => calculateFinalReportMetrics(option), [option]);
  const landownerLandCost = Math.max(0, Number(landownerLandCostDraft) || 0);
  const qualityChecks = React.useMemo(() => buildAppraisalQualityChecks(option), [option]);
  const hasReportBlockers = qualityChecks.some((check) => check.severity === 'BLOCKER');
  const metrics = finalReportMetrics.metrics;
  const originalMetrics = finalReportMetrics.originalMetrics;
  const sellerMetrics = React.useMemo(() => calculateSellerLandPriceMetrics(option), [option]);
  const reportData = reportOpen ? reportDataSnapshot : null;
  const headlineLabel = option.calculationMode === 'RESIDUAL_LAND_VALUE' ? 'Final report land value' : 'Final report profit';
  const headlineValue = option.calculationMode === 'RESIDUAL_LAND_VALUE' ? metrics.landValue : metrics.profit;
  const originalHeadlineValue = option.calculationMode === 'RESIDUAL_LAND_VALUE' ? originalMetrics.landValue : originalMetrics.profit;
  const reportSourceSignature = reportSourceSignatureSnapshot;
  const executiveSummaryIsCurrent = Boolean(option.finalReportExecutiveSummary?.trim())
    && reportSignatureReady
    && option.finalReportSourceSignature === reportSourceSignature;
  // A changed narrative model makes a report stale for issuing, but it must not
  // hide the previous evidence-led analysis. Keeping it visible lets the user
  // compare and regenerate it instead of replacing it with generic fallback text.
  const generatedNarrative = executiveSummaryDraft || option.finalReportExecutiveSummary || '';
  const salesPricesNarrative = extractFinalReportNarrativeSection(generatedNarrative, 'Sales prices and basis')
    || reportData?.salesBasisNarrative
    || '';
  const gdvImprovementNarrative = extractFinalReportNarrativeSection(generatedNarrative, 'GDV improvement considerations')
    || reportData?.gdvImprovementNarrative
    || '';
  const hasGeneratedReport = Boolean(option.finalReportExecutiveSummary?.trim());
  React.useEffect(() => {
    if (!reportOpen || !reportDataSnapshot) return undefined;
    setReportSignatureReady(false);
    const timeoutId = window.setTimeout(() => {
      setReportSourceSignatureSnapshot(buildFinalReportSourceSignature(option));
      setReportSignatureReady(true);
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [option.id, reportDataSnapshot, reportOpen]);
  const prepareReportView = React.useCallback((sourceOption: DevelopmentAppraisalOption) => {
    const completeMeasure = startAppraisalPerformance('finalReportInitialRender');
    setReportDataSnapshot(buildFinalReportData(sourceOption));
    setReportSourceSignatureSnapshot('');
    setReportSignatureReady(false);
    setOpenReportSections({
      landSensitivity: false,
      salesSensitivity: false,
      abnormalEvidence: false,
    });
    afterNextPaint(completeMeasure);
  }, []);
  const toggleReportSection = (section: keyof typeof openReportSections, open: boolean) => {
    setOpenReportSections((current) => ({ ...current, [section]: open }));
  };
  const generateExecutiveSummary = async () => {
    if (isGeneratingSummary) return;
    if (!canIssueAppraisalReport(option)) {
      showToast({ type: 'error', message: 'Resolve the report-preparation blockers before generating an issue report.' });
      return;
    }
    setIsGeneratingSummary(true);
    try {
      setGenerationProgress({ percent: 8, label: 'Preparing appraisal data...' });
      const pricingReport = option.pricingReport ? await ensureAppraisalReportExtracted(option.pricingReport) : undefined;
      setGenerationProgress({ percent: 24, label: 'Extracting pricing evidence...' });
      const constraintsReport = option.constraintsReport ? await ensureAppraisalReportExtracted(option.constraintsReport) : undefined;
      setGenerationProgress({ percent: 36, label: 'Reading land contract versions...' });
      const landContractVersions = option.landContractVersions?.length
        ? await Promise.all(option.landContractVersions.map((contract) => ensureAppraisalReportExtracted(contract)))
        : [];
      const baseMeasurementFiles = option.baseMeasurementFiles?.length
        ? await Promise.all(option.baseMeasurementFiles.map((file) => ensureAppraisalReportExtracted(file)))
        : [];
      const architectFeasibilityLayouts = option.architectFeasibilityLayouts?.length
        ? await Promise.all(option.architectFeasibilityLayouts.map((file) => ensureAppraisalReportExtracted(file)))
        : [];
      setGenerationProgress({ percent: 42, label: 'Reading consent tracker uploads...' });
      const consentTracker = await Promise.all((option.consentTracker || []).map(async (consent) => ({
        ...consent,
        uploads: consent.uploads?.length
          ? await Promise.all(consent.uploads.map((upload) => ensureAppraisalReportExtracted(upload)))
          : [],
      })));
      setGenerationProgress({ percent: 48, label: 'Reading abnormal evidence and quotations...' });
      const costLines = await Promise.all((option.costLines || []).map(async (line) => ({
        ...line,
        formalQuotations: line.formalQuotations
          ? await Promise.all(line.formalQuotations.map((quote) => ensureAppraisalReportExtracted(quote)))
          : undefined,
      })));
      const evidenceOption: DevelopmentAppraisalOption = {
        ...option,
        pricingReport,
        constraintsReport,
        landContractVersions,
        baseMeasurementFiles,
        architectFeasibilityLayouts,
        consentTracker,
        costLines,
      };
      setGenerationProgress({ percent: 58, label: 'Building report tables and evidence context...' });
      const abnormalSummarySource = [
        option.abnormalGeneralNotes || '',
        constraintsReport?.notes || '',
      ].filter(Boolean).join('\n\n');
      let abnormalGeneralNarrative = '';
      if (abnormalSummarySource.trim() || constraintsReport?.extractedText?.trim()) {
        setGenerationProgress({ percent: 62, label: 'Rewriting abnormal summary...' });
        const rewrite = await generateAppraisalReportNoteRewrite({
          section: 'Abnormals and constraints',
          notes: abnormalSummarySource,
          extractedText: constraintsReport?.extractedText || '',
          appraisalName: appraisal.name,
        }, appSettings.ai);
        abnormalGeneralNarrative = rewrite.ok ? rewrite.data.trim() : '';
      }
      const narrativeOption: DevelopmentAppraisalOption = {
        ...evidenceOption,
        abnormalGeneralNarrative,
      };
      const evidenceSignature = buildFinalReportSourceSignature(evidenceOption);
      updateOption(option.id, (current) => ({
        ...current,
        pricingReport,
        constraintsReport,
        landContractVersions,
        baseMeasurementFiles,
        architectFeasibilityLayouts,
        consentTracker,
        costLines,
        abnormalGeneralNarrative,
      }));
      setGenerationProgress({ percent: 68, label: 'Preparing appraisal evidence for analysis...' });
      const evidenceFiles = await finalReportEvidenceFiles(narrativeOption);
      setGenerationProgress({ percent: 70, label: 'Generating report narrative...' });
      const result = await generateAppraisalExecutiveSummary(
        buildFinalReportAiContext(narrativeOption),
        evidenceFiles,
        appSettings.ai,
      );
      if (result.ok) {
        setGenerationProgress({ percent: 96, label: 'Saving generated report...' });
        setExecutiveSummaryDraft(result.data);
        setReportDataSnapshot(buildFinalReportData(narrativeOption));
        setReportSourceSignatureSnapshot(evidenceSignature);
        setReportSignatureReady(true);
        updateOption(option.id, (current) => ({
          ...current,
          finalReportExecutiveSummary: result.data,
          finalReportSourceSignature: evidenceSignature,
          baseMeasurementFiles,
          architectFeasibilityLayouts,
          abnormalGeneralNarrative,
        }));
        setGenerationProgress({ percent: 100, label: 'Report generated.' });
        showToast({ type: 'success', message: 'Executive summary generated.' });
      } else if (result.ok === false) {
        setGenerationProgress({ percent: 96, label: 'AI unavailable. Saving fallback report...' });
        const fallbackSummary = buildFallbackFinalReportExecutiveSummary(narrativeOption);
        setExecutiveSummaryDraft(fallbackSummary);
        setReportDataSnapshot(buildFinalReportData(narrativeOption));
        setReportSourceSignatureSnapshot(evidenceSignature);
        setReportSignatureReady(true);
        updateOption(option.id, (current) => ({
          ...current,
          finalReportExecutiveSummary: fallbackSummary,
          finalReportSourceSignature: evidenceSignature,
          baseMeasurementFiles,
          architectFeasibilityLayouts,
          abnormalGeneralNarrative,
        }));
        setGenerationProgress({ percent: 100, label: 'Fallback report generated.' });
        showToast({
          type: 'info',
          message: 'AI executive summary was unavailable, so a draft report summary was inserted from the live appraisal data.',
          duration: 6500,
        });
      }
    } catch (error) {
      setGenerationProgress({ percent: 100, label: 'Report generation failed.' });
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Final report generation failed.' });
    }
    window.setTimeout(() => {
      setIsGeneratingSummary(false);
      setGenerationProgress({ percent: 0, label: '' });
    }, 700);
  };
  const markOptionForReport = () => {
    updateAppraisal(appraisal.id, (current) => ({
      ...current,
      selectedOptionId: option.id,
      options: current.options.map((entry) => ({ ...entry, recommended: entry.id === option.id })),
    }));
  };
  const openGeneratedReport = () => {
    markOptionForReport();
    prepareReportView(option);
    setReportOpen(true);
  };
  const generateReport = () => {
    if (hasReportBlockers) {
      showToast({ type: 'error', message: 'Resolve the report-preparation blockers before opening an issue report.' });
      return;
    }
    markOptionForReport();
    setExecutiveSummaryDraft('');
    prepareReportView(option);
    updateOption(option.id, (current) => ({
      ...current,
      finalReportExecutiveSummary: '',
      finalReportSourceSignature: '',
    }));
    setReportOpen(true);
    void generateExecutiveSummary();
  };

  if (reportOpen) {
    if (!reportData) {
      return (
        <div className="rounded-app border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-surface-900 dark:text-slate-300">
          Preparing final report...
        </div>
      );
    }
    return (
      <div data-smoke="appraisals-generated-final-report" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Generated final report</div>
            <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">{appraisal.name}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setReportOpen(false)} className="workspace-secondary-btn px-3 py-2 text-xs">Edit inputs</button>
            <button type="button" onClick={() => onExportReport('pdf')} disabled={isExporting} className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-50">
              <FileDown className="h-4 w-4" />
              Export PDF
            </button>
            <button type="button" onClick={() => onExportReport('summaryPdf')} disabled={isExporting} className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-50">
              <FileDown className="h-4 w-4" />
              Export Summary PDF
            </button>
            <button type="button" onClick={() => onExportReport('summaryExcel')} disabled={isExporting} className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-50">
              <FileSpreadsheet className="h-4 w-4" />
              Export Summary Excel
            </button>
            <button type="button" onClick={() => onExportReport('excel')} disabled={isExporting} className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-50">
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel
            </button>
            <button type="button" onClick={() => onExportReport('docx')} disabled={isExporting} className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-50">
              <FileDown className="h-4 w-4" />
              Export Word
            </button>
          </div>
        </div>

        <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-2xl">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">External report</div>
              <h4 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">Landowner viability PDF</h4>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Creates a concise, externally shareable PDF with the selected land-cost basis, high-level costs, profit and individual abnormal allowances. The entered land cost is used for this report only and does not change the saved appraisal.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Report land cost</span>
                <span className="flex h-9 overflow-hidden rounded-app-sm border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-surface-950">
                  <span className="flex items-center border-r border-slate-200 px-2 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-300">£</span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={landownerLandCostDraft}
                    onChange={(event) => setLandownerLandCostDraft(event.target.value)}
                    onBlur={() => setLandownerLandCostDraft(String(landownerLandCost))}
                    aria-label="Land cost for landowner viability report"
                    className="w-32 border-0 bg-transparent px-2 text-right text-sm font-semibold tabular-nums outline-none"
                  />
                </span>
              </label>
              <button
                type="button"
                onClick={() => onExportReport('landownerPdf', landownerLandCost)}
                disabled={isExporting}
                className="workspace-primary-btn h-9 px-3 text-xs disabled:opacity-50"
              >
                <FileDown className="h-4 w-4" />
                Export landowner PDF
              </button>
            </div>
          </div>
        </section>

        <AppraisalQualityChecksPanel checks={qualityChecks} />

        <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Executive summary</h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Report figures update live from current appraisal data. Regenerate the narrative when the source changes.
              </p>
            </div>
            <button type="button" onClick={() => { void generateExecutiveSummary(); }} disabled={isGeneratingSummary} className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-50">
              <Sparkles className="h-4 w-4" />
              {isGeneratingSummary ? 'Generating...' : 'Regenerate'}
            </button>
          </div>
          {option.finalReportExecutiveSummary?.trim() && reportSignatureReady && !executiveSummaryIsCurrent ? (
            <div className="mt-3 rounded-app border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
              The report tables are using live appraisal data, but the executive summary was generated from an earlier report model or appraisal state. Regenerate it before issuing the report. This also removes superseded wording that treated normal trade-index contingency as a construction-cost discrepancy.
            </div>
          ) : (
            <div className="mt-3 rounded-app border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
              {reportSignatureReady
                ? `Live report data is current${executiveSummaryIsCurrent ? ', including the executive summary.' : '. Generate the executive summary when ready.'}`
                : 'Live report tables are prepared. Narrative freshness is being checked in the background.'}
            </div>
          )}
          {isGeneratingSummary ? (
            <div className="mt-3 rounded-app border border-primary-200 bg-primary-50 p-3 dark:border-primary-800 dark:bg-primary-950/20">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold text-primary-800 dark:text-primary-100">
                <span>{generationProgress.label || 'Generating final report...'}</span>
                <span>{generationProgress.percent}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/80 dark:bg-surface-950">
                <div className="h-full rounded-full bg-primary-600 transition-all duration-500 dark:bg-primary-300" style={{ width: `${generationProgress.percent}%` }} />
              </div>
            </div>
          ) : null}
          <textarea
            value={executiveSummaryDraft}
            onChange={(event) => setExecutiveSummaryDraft(event.target.value)}
            onBlur={(event) => {
              const finalReportExecutiveSummary = event.currentTarget.value;
              updateOption(option.id, (current) => ({
                ...current,
                finalReportExecutiveSummary,
                finalReportSourceSignature: reportSourceSignature,
              }));
            }}
            placeholder={isGeneratingSummary ? 'Generating executive summary...' : 'Generate or write the executive summary here.'}
            className={`${inputClass('min-h-[14rem]')} mt-3`}
          />
        </section>

        <ArchitectFeasibilityPlan option={option} />

        <section className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">GDV/GSV and cost summary</h4>
          <div className="mt-3 grid gap-4 xl:grid-cols-2">
            <div className="overflow-hidden rounded-app border border-slate-200 dark:border-slate-800">
              <div className="bg-slate-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">GDV / GSV breakdown</div>
              <table className="w-full text-left text-xs">
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {reportData.gdvRows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2 font-medium">{row.title}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.units > 0 ? `${formatQuantity(row.units)} units` : ''}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">{money(row.gdv)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-semibold dark:bg-surface-950">
                    <td className="px-3 py-2">Indexed GDV/GSV</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatQuantity(reportData.houseTypeRows.reduce((total, row) => total + row.quantity, 0))} units</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(metrics.gdv)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="overflow-hidden rounded-app border border-slate-200 dark:border-slate-800">
              <div className="bg-slate-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">Cost breakdown</div>
              <table className="w-full text-left text-xs">
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {reportData.costSummaryRows.map((row) => (
                    <tr
                      key={row.id}
                      className={row.role === 'TOTAL'
                        ? 'border-y-2 border-slate-700 bg-slate-100 font-bold dark:border-slate-300 dark:bg-surface-950'
                        : row.role === 'SUBTOTAL'
                          ? 'border-t-2 border-slate-500 bg-slate-50 font-bold dark:border-slate-500 dark:bg-surface-950'
                          : row.role === 'LAND'
                            ? 'bg-primary-50/50 font-semibold dark:bg-primary-950/20'
                            : undefined}
                    >
                      <td className={`px-3 py-2 ${row.role === 'SUBTOTAL' || row.role === 'TOTAL' ? 'font-bold underline decoration-slate-500 underline-offset-4 dark:decoration-slate-400' : 'font-medium'}`}>{row.title}</td>
                      <td className={`px-3 py-2 text-right font-semibold tabular-nums${row.role === 'SUBTOTAL' || row.role === 'TOTAL' ? ' font-bold underline decoration-slate-500 underline-offset-4 dark:decoration-slate-400' : ''}${row.amount < 0 ? ' text-red-600 dark:text-red-400' : ''}`}>{money(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {reportData.baseSummaryRows.map((row) => (
              <React.Fragment key={row.label}>
                <MetricTile
                  label={row.label}
                  value={row.isPercent ? `${row.value.toFixed(1)}%` : money(row.value)}
                  tone={row.value < 0 ? 'bad' : row.label === 'Profit' ? 'good' : 'default'}
                />
              </React.Fragment>
            ))}
          </div>
        </section>

        {(reportData.zeroLandScenario || reportData.sellerScenario) && (
          <div className="grid gap-3 xl:grid-cols-2">
            {reportData.zeroLandScenario && <ReportScenarioTable title="Adjustment: land at zero" rows={reportData.zeroLandScenario.rows} />}
            {reportData.sellerScenario && <ReportScenarioTable title="Adjustment: likely seller land price" rows={reportData.sellerScenario.rows} />}
          </div>
        )}

        <details
          className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900"
          open={openReportSections.landSensitivity}
          onToggle={(event) => toggleReportSection('landSensitivity', event.currentTarget.open)}
        >
          <summary className="cursor-pointer text-sm font-semibold text-slate-900 dark:text-slate-100">Land price profitability sensitivity</summary>
          {openReportSections.landSensitivity ? (
            <>
              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Shows five land-price movements either side of the base appraisal in £500,000 intervals. Where that would take land below zero, the five lower movements are spaced evenly down to £0. Values above a recorded landowner expected receipt are not shown.
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Basis</th>
                      <th className="px-3 py-2 text-right">Land price</th>
                      <th className="px-3 py-2 text-right">Finance</th>
                      <th className="px-3 py-2 text-right">Total cost</th>
                      <th className="px-3 py-2 text-right">Profit</th>
                      <th className="px-3 py-2 text-right">Profit/GDV</th>
                      <th className="px-3 py-2 text-right">Movement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {reportData.landPriceSensitivityRows.map((row, index) => (
                      <tr key={row.id}>
                        <td className="px-3 py-2 font-medium">{row.label || `Increment ${index + 1}`}</td>
                        <td className={`px-3 py-2 ${reportValueClass(row.landValue)}`}>{money(row.landValue)}</td>
                        <td className={`px-3 py-2 ${reportValueClass(row.financeCost)}`}>{money(row.financeCost)}</td>
                        <td className={`px-3 py-2 ${reportValueClass(row.totalCost)}`}>{money(row.totalCost)}</td>
                        <td className={`px-3 py-2 ${reportValueClass(row.profit)}`}>{money(row.profit)}</td>
                        <td className={reportPercentClass(row.profitOnGdvPercent)}>{row.profitOnGdvPercent.toFixed(1)}%</td>
                        <td className={`px-3 py-2 ${reportValueClass(row.profitMovement)}`}>{money(row.profitMovement)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </details>

        <section className="appraisal-report-deferred rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">House type sales summary</h4>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">Indexed average {formatRateFt2(reportData.averageSaleRateFt2)}</span>
          </div>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">{salesPricesNarrative}</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2">House type</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">GIFA ft2</th>
                  <th className="px-3 py-2 text-right">Base sale price</th>
                  <th className="px-3 py-2 text-right">Index uplift</th>
                  <th className="px-3 py-2 text-right">Indexed sale price</th>
                  <th className="px-3 py-2 text-right">Indexed £/ft2</th>
                  <th className="px-3 py-2 text-right">Indexed GDV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {reportData.houseTypeRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2 font-medium">{row.houseTypeName}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatQuantity(row.quantity)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatQuantity(row.gifaFt2)}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{money(row.saleValuePerUnit)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(row.indexUpliftPerUnit)}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{money(row.indexedSaleValuePerUnit)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatRateFt2(row.indexedSaleRateFt2)}</td>
                    <td className={`px-3 py-2 ${reportValueClass(row.indexedGdv)}`}>{money(row.indexedGdv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="appraisal-report-deferred rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">GDV improvement considerations</h4>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">{gdvImprovementNarrative}</p>
        </section>

        <details
          className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900"
          open={openReportSections.salesSensitivity}
          onToggle={(event) => toggleReportSection('salesSensitivity', event.currentTarget.open)}
        >
          <summary className="cursor-pointer text-sm font-semibold text-slate-900 dark:text-slate-100">Indexed sales sensitivity in £5/ft2 steps</summary>
          {openReportSections.salesSensitivity ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Movement</th>
                    <th className="px-3 py-2 text-right">Average £/ft2</th>
                    <th className="px-3 py-2 text-right">GDV</th>
                    <th className="px-3 py-2 text-right">Land value</th>
                    <th className="px-3 py-2 text-right">Profit</th>
                    <th className="px-3 py-2 text-right">Profit/GDV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {reportData.sensitivityRows.map((row) => (
                    <tr key={row.deltaRateFt2}>
                      <td className="px-3 py-2 font-medium">{row.deltaRateFt2 > 0 ? '+' : ''}{row.deltaRateFt2}/ft2</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatRateFt2(row.averageRateFt2)}</td>
                      <td className={`px-3 py-2 ${reportValueClass(row.gdv)}`}>{money(row.gdv)}</td>
                      <td className={`px-3 py-2 ${reportValueClass(row.landValue)}`}>{money(row.landValue)}</td>
                      <td className={`px-3 py-2 text-right font-semibold tabular-nums ${row.profit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>{money(row.profit)}</td>
                      <td className={reportPercentClass(row.profitOnGdvPercent)}>{row.profitOnGdvPercent.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </details>

        <details
          className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900"
          open={openReportSections.abnormalEvidence}
          onToggle={(event) => toggleReportSection('abnormalEvidence', event.currentTarget.open)}
        >
          <summary className="cursor-pointer text-sm font-semibold text-slate-900 dark:text-slate-100">Additional site elements and evidence</summary>
          {openReportSections.abnormalEvidence ? (
            <div className="mt-3 grid gap-3">
              <SiteCostSummary option={option} infrastructureBase={reportData.siteCostSummaryRows.find(row => row.title === 'Infrastructure')?.base || 0} plotWorksBase={reportData.siteCostSummaryRows.find(row => row.title === 'Plot works')?.base || 0} />
              {reportData.abnormalConstraintsNarrative ? (
                <article className="rounded-app border border-blue-100 bg-blue-50 p-3 dark:border-blue-900/60 dark:bg-blue-950/25">
                  <h5 className="text-sm font-semibold text-blue-950 dark:text-blue-100">Constraints report summary</h5>
                  <p className="mt-2 text-sm leading-6 text-blue-900 dark:text-blue-100">{evidencePreview(reportData.abnormalConstraintsNarrative, 900)}</p>
                </article>
              ) : null}
              {reportData.abnormalRows.map((row) => (
                <article key={row.id} className="rounded-app border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-surface-950">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h5 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.title}</h5>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {row.quotationCount} formal quote{row.quotationCount === 1 ? '' : 's'} recorded
                      </p>
                    </div>
                    <span className={`text-sm ${reportValueClass(row.amount)}`}>{money(row.amount)}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{evidencePreview(row.evidenceNarrative, 900)}</p>
                </article>
              ))}
              {reportData.abnormalRows.length === 0 && !reportData.abnormalConstraintsNarrative && (
                <div className="rounded-app border border-dashed border-slate-300 p-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No abnormal costs have been added yet.
                </div>
              )}
            </div>
          ) : null}
        </details>

        <section className="appraisal-report-deferred rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">RICS House Builders Profit Margins</h4>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">The current appraisal is shown unchanged for comparison. Separate RICS scenarios use a fixed 5.0% overhead allowance and profit on GDV of 12.5% for greenfield, 15.0% for normal risk, 17.5% for moderate risk and 20.0% for high risk.</p>
            </div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="bg-slate-100 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:bg-surface-800 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2">Risk case</th>
                  <th className="px-3 py-2 text-right">O&amp;P</th>
                  <th className="px-3 py-2 text-right">Overheads</th>
                  <th className="px-3 py-2 text-right">Profit %</th>
                  <th className="px-3 py-2 text-right">Profit £</th>
                  <th className="px-3 py-2 text-right">Residual land value</th>
                  <th className="px-3 py-2">Justification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {reportData.profitMarginRows.map((row) => (
                  <tr key={row.id} className={row.isCurrentAppraisal ? 'bg-slate-100/80 dark:bg-surface-800' : undefined}>
                    <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">{row.label}</td>
                    <td className={reportPercentClass(row.operatingAndProfitPercent)}>{row.operatingAndProfitPercent.toFixed(1)}%</td>
                    <td className={reportPercentClass(row.overheadPercent)}>{row.overheadPercent.toFixed(1)}%</td>
                    <td className={reportPercentClass(row.profitOnGdvPercent)}>{row.profitOnGdvPercent.toFixed(1)}%</td>
                    <td className={`px-3 py-2 ${reportValueClass(row.profit)}`}>{money(row.profit)}</td>
                    <td className={`px-3 py-2 ${reportValueClass(row.landValue)}`}>{money(row.landValue)}</td>
                    <td className="px-3 py-2 leading-5 text-slate-600 dark:text-slate-300">{row.justification}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="space-y-3">
        <AppraisalQualityChecksPanel checks={qualityChecks} />
        <RedlineMetricTile
          label={headlineLabel}
          value={money(headlineValue)}
          originalValue={finalReportMetrics.hasNegativeResidualLand ? money(originalHeadlineValue) : undefined}
          tone={metrics.profit >= 0 ? 'good' : 'bad'}
        />
        {finalReportMetrics.hasNegativeResidualLand ? (
          <>
            <RedlineMetricTile label="Profit" value={money(metrics.profit)} originalValue={money(originalMetrics.profit)} tone={metrics.profit >= 0 ? 'good' : 'bad'} />
            <RedlineMetricTile label="Profit/GDV" value={`${metrics.profitOnGdvPercent.toFixed(1)}%`} originalValue={`${originalMetrics.profitOnGdvPercent.toFixed(1)}%`} tone={metrics.profitOnGdvPercent >= option.targetProfitOnGdvPercent ? 'good' : 'watch'} />
            <div className="rounded-app border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:border-amber-800 dark:bg-amber-950/25 dark:text-amber-100">
              Residual land value was below zero, so the final report caps land at £0 and recalculates profit and profit/GDV on that basis.
            </div>
          </>
        ) : null}
        {sellerMetrics ? (
          <div className="grid gap-3">
            <MetricTile label="Seller likely lowest land price" value={money(sellerMetrics.landValue)} />
            <MetricTile label="Profit at seller price" value={money(sellerMetrics.profit)} tone={sellerMetrics.profit >= 0 ? 'good' : 'bad'} />
            <MetricTile label="Profit/GDV at seller price" value={`${sellerMetrics.profitOnGdvPercent.toFixed(1)}%`} tone={sellerMetrics.profitOnGdvPercent >= option.targetProfitOnGdvPercent ? 'good' : 'watch'} />
          </div>
        ) : null}
        <MetricTile label={`Private sales incentive (${formatQuantity(option.gdvIncentivePercent || 0)}%)`} value={money(metrics.gdvIncentiveCost)} tone={metrics.gdvIncentiveCost > 0 ? 'watch' : 'default'} />
        <div className="flex gap-2">
          {hasGeneratedReport ? (
            <button
              type="button"
              onClick={openGeneratedReport}
              className="workspace-secondary-btn flex-1 px-4 py-2 text-sm"
              title="Open existing generated final report"
              aria-label="Open existing generated final report"
            >
              <BookOpen className="h-4 w-4" />
              Open
            </button>
          ) : null}
          <button
            type="button"
            onClick={generateReport}
            disabled={isGeneratingSummary || hasReportBlockers}
            className="workspace-primary-btn flex-1 px-4 py-2 text-sm disabled:opacity-50"
            title={hasGeneratedReport ? 'Create a new refreshed final report' : 'Generate new final report'}
            aria-label={hasGeneratedReport ? 'Create a new refreshed final report' : 'Generate new final report'}
          >
            <Sparkles className="h-4 w-4" />
            {hasGeneratedReport ? 'New' : 'Generate'}
          </button>
        </div>
        {isGeneratingSummary ? (
          <div className="rounded-app border border-primary-200 bg-primary-50 p-3 dark:border-primary-800 dark:bg-primary-950/20">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-primary-800 dark:text-primary-100">
              <span>{generationProgress.label || 'Generating final report...'}</span>
              <span>{generationProgress.percent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/80 dark:bg-surface-950">
              <div className="h-full rounded-full bg-primary-600 transition-all duration-500 dark:bg-primary-300" style={{ width: `${generationProgress.percent}%` }} />
            </div>
          </div>
        ) : null}
        <div className="rounded-app border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:bg-surface-900 dark:text-slate-400">
          V1 appraisals are decision-support records only. Project bills, cost plans, tenders, and libraries are not updated by this module.
        </div>
      </div>
      <label>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Final report note</span>
        <textarea
          value={decisionNoteDraft}
          onChange={(event) => setDecisionNoteDraft(event.target.value)}
          onBlur={(event) => {
            const decisionNote = event.currentTarget.value;
            updateOption(option.id, (current) => ({ ...current, decisionNote }));
          }}
          className={`${inputClass('min-h-[12rem]')} mt-1`}
        />
      </label>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  disabled = false,
  blankZero = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  blankZero?: boolean;
}) {
  return (
    <label>
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <DeferredNumberInput
        value={value}
        onCommit={onChange}
        blankZero={blankZero}
        disabled={disabled}
        ariaLabel={label}
        className={`${inputClass()} mt-1 disabled:opacity-70`}
      />
    </label>
  );
}

const DeferredNumberInput = React.memo(function DeferredNumberInput({
  value,
  onCommit,
  blankZero = false,
  disabled = false,
  placeholder,
  className = '',
  ariaLabel,
  dataSmoke,
  minimum = 0,
  signedCurrency = false,
}: {
  value: number;
  onCommit: (value: number) => void;
  blankZero?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  dataSmoke?: string;
  minimum?: number;
  signedCurrency?: boolean;
}) {
  const displayValue = React.useCallback((nextValue: number) => (
    blankZero && Math.abs(nextValue || 0) < 0.000001 ? '' : String(nextValue || 0)
  ), [blankZero]);
  const [draft, setDraft] = React.useState(() => displayValue(value));
  const cancelNextBlur = React.useRef(false);

  React.useEffect(() => {
    setDraft(displayValue(value));
  }, [displayValue, value]);

  const commit = React.useCallback(() => {
    const normalizedDraft = signedCurrency ? draft.replace(/[£,\s]/g, '').replace(/\u2212/g, '-') : draft;
    const parsed = signedCurrency ? (normalizedDraft === '' ? 0 : Number(normalizedDraft)) : numberValue(draft);
    const nextValue = Math.max(minimum, Number.isFinite(parsed) ? parsed : value || 0);
    if (Math.abs(nextValue - (value || 0)) > 0.000001 || (draft.trim() === '' && value !== 0)) {
      const completeMeasure = startAppraisalPerformance('typingCommit');
      onCommit(nextValue);
      afterNextPaint(completeMeasure);
    }
    setDraft(displayValue(nextValue));
  }, [displayValue, draft, minimum, onCommit, signedCurrency, value]);

  React.useEffect(() => {
    if (signedCurrency || draft === displayValue(value)) return;
    const timeoutId = window.setTimeout(commit, 1200);
    return () => window.clearTimeout(timeoutId);
  }, [commit, displayValue, draft, signedCurrency, value]);

  return (
    <input
      data-smoke={dataSmoke}
      type="text"
      inputMode={signedCurrency ? "text" : "decimal"}
      value={draft}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (cancelNextBlur.current) { cancelNextBlur.current = false; return; }
        commit();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        }
        if (event.key === 'Escape') {
          if (signedCurrency) cancelNextBlur.current = true;
          setDraft(displayValue(value));
          event.currentTarget.blur();
        }
      }}
      className={className}
    />
  );
});

const DeferredTextInput = React.memo(function DeferredTextInput({
  value,
  onCommit,
  className = '',
  tabIndex,
  placeholder,
}: {
  value: string;
  onCommit: (value: string) => void;
  className?: string;
  tabIndex?: number;
  placeholder?: string;
}) {
  const [draft, setDraft] = React.useState(value);

  React.useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = React.useCallback(() => {
    if (draft !== value) {
      const completeMeasure = startAppraisalPerformance('typingCommit');
      onCommit(draft);
      afterNextPaint(completeMeasure);
    }
  }, [draft, onCommit, value]);

  React.useEffect(() => {
    if (draft === value) return;
    const timeoutId = window.setTimeout(commit, 1200);
    return () => window.clearTimeout(timeoutId);
  }, [commit, draft, value]);

  return (
    <input
      value={draft}
      placeholder={placeholder}
      tabIndex={tabIndex}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') {
          setDraft(value);
          event.currentTarget.blur();
        }
      }}
      className={className}
    />
  );
});

function LineTimingEditor({
  profile,
  durationMonths,
  onChange,
}: {
  profile: AppraisalCashflowProfile;
  durationMonths: number;
  onChange: (profile: AppraisalCashflowProfile) => void;
}) {
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-4">
      <label>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Timing</span>
        <select value={profile.type} onChange={(event) => onChange(updateProfile(profile, { type: event.target.value as AppraisalCashflowProfile['type'] }))} className={`${inputClass()} mt-1`}>
          {timingProfiles.map((timing) => <option key={timing} value={timing}>{timing}</option>)}
        </select>
      </label>
      <NumberField label="Start month" value={profile.startMonth || 1} onChange={(value) => onChange(updateProfile(profile, { startMonth: Math.max(1, Math.min(durationMonths, Math.round(value))) }))} />
      <NumberField label="End month" value={profile.endMonth || durationMonths} onChange={(value) => onChange(updateProfile(profile, { endMonth: Math.max(1, Math.min(durationMonths, Math.round(value))) }))} />
      {profile.type === 'CUSTOM' && (
        <label>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Custom % CSV</span>
          <input
            value={(profile.customPercentages || []).join(',')}
            onChange={(event) => onChange(updateProfile(profile, {
              customPercentages: event.target.value.split(',').map((entry) => numberValue(entry.trim())),
            }))}
            className={`${inputClass()} mt-1`}
          />
        </label>
      )}
    </div>
  );
}
