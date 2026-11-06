import { engineeringScopeReview } from "./appraisalEngineeringScope";
import { ENGINEERING_SOURCE_FILE, ENGINEERING_SOURCE_NOTES } from "./appraisalEngineeringCatalogue";
import { isSiteCostElement, siteCostMetadata, siteCostSummary, siteBaseRowMatches, SITE_COST_ALLOCATION_LABELS, SITE_COST_STATUS_LABELS } from './appraisalSiteCosts';
import type { AppraisalCostLine, AppraisalHouseTypeScheduleRow, DevelopmentAppraisalOption } from '../types';
import {
  APPRAISAL_COST_CATEGORY_LABELS,
  calculateAppraisalOption,
  calculateCostLines,
  calculateCostLineAmount,
  calculateSiteDimensionTotal,
  calculateFinalReportMetrics,
  getHouseBuildingOverheadPercent,
  calculateHouseTypeConstructionTotal,
  calculateHouseTypeGdv,
  calculateHouseTypeSalesQuantity,
  calculateHouseTypeScheduleBuildCostPerM2,
  calculateOptionBaseGdv,
  calculateSalesIndexationUplift,
  calculateSellerLandPriceMetrics,
  getHouseTypeSalesRows,
  summariseHouseBuildingOption,
} from './appraisal';
import { cleanEvidenceText, isUsableEvidenceText } from './appraisalEvidenceExtraction';
import { notAllowedAbnormalRows, type NotAllowedAbnormalRow } from './appraisalNotAllowedAbnormals';

const SQ_FT_PER_M2 = 10.7639104167;
// Bump this whenever the financial interpretation used by report narrative changes.
// Stored narratives then become visibly stale rather than being issued against a
// different cost model.
const FINAL_REPORT_NARRATIVE_SCHEMA_VERSION = '2026-10-13-unpriced-abnormal-land-offer-exclusions';

export interface FinalReportSummaryRow {
  label: string;
  value: number;
  note?: string;
}

export interface FinalReportScenario {
  id: string;
  title: string;
  rows: FinalReportSummaryRow[];
  landValue: number;
  profit: number;
  profitOnGdvPercent: number;
}

export interface FinalReportHouseTypeRow {
  id: string;
  houseTypeName: string;
  quantity: number;
  gifaFt2: number;
  saleValuePerUnit: number;
  saleRateFt2: number;
  gdv: number;
  indexUpliftPerUnit: number;
  indexedSaleValuePerUnit: number;
  indexedSaleRateFt2: number;
  indexedGdv: number;
}

export interface FinalReportSensitivityRow {
  deltaRateFt2: number;
  averageRateFt2: number;
  gdv: number;
  landValue: number;
  profit: number;
  profitOnGdvPercent: number;
}

export interface FinalReportLandPriceSensitivityRow {
  id: string;
  label: string;
  landValue: number;
  totalCost: number;
  financeCost: number;
  profit: number;
  profitOnGdvPercent: number;
  profitMovement: number;
}

export interface FinalReportProfitMarginRow {
  id: string;
  label: string;
  isCurrentAppraisal?: boolean;
  operatingAndProfitPercent: number;
  overheadPercent: number;
  targetProfitOnGdvPercent: number;
  profit: number;
  profitOnGdvPercent: number;
  landValue: number;
  justification: string;
}

export interface FinalReportCostBreakdownRow {
  id: string;
  title: string;
  category: string;
  amount: number;
  notes?: string;
}

export interface FinalReportGroupedCostRow {
  id: string;
  title: string;
  amount: number;
  notes?: string;
}

export interface FinalReportCostSummaryRow extends FinalReportGroupedCostRow {
  role: 'COMPONENT' | 'FINANCE' | 'SUBTOTAL' | 'LAND' | 'TOTAL';
}

export interface FinalReportGdvRow {
  id: string;
  title: string;
  units: number;
  gdv: number;
}

export interface FinalReportBaseSummaryRow {
  label: string;
  value: number;
  isPercent?: boolean;
}

export interface FinalReportAbnormalEvidenceRow {
  allocation?: string;
  assessmentStatus?: string;
  includeInLandOffer?: boolean;
  offerQualification?: string;
  responsiblePerson?: string;
  baseOverlapNote?: string;
  retainedEstimate?: number;
  clearanceReason?: string;
  changeHistory?: AppraisalCostLine['siteCost'];
  id: string;
  title: string;
  amount: number;
  knownCostNotes: string;
  estimatedCostNotes: string;
  unknownCostNotes: string;
  evidenceNarrative: string;
  quotationCount: number;
  quotationNames: string[];
}

export interface FinalReportData {
  engineeringScope?: {confirmedAt:string;source:string;notes:string;normal:number;rows:Array<{reference:string;title:string;scope:string;status:string;destination:string;mechanism:string;amount:number;scopeAllowance:number;note:string;source:string}>} | null;
  currentScenario: FinalReportScenario;
  zeroLandScenario: FinalReportScenario | null;
  sellerScenario: FinalReportScenario | null;
  baseSalesGdv: number;
  salesIndexUplift: number;
  indexedSalesGdv: number;
  gdvRows: FinalReportGdvRow[];
  groupedCostRows: FinalReportGroupedCostRow[];
  costSummaryRows: FinalReportCostSummaryRow[];
  baseSummaryRows: FinalReportBaseSummaryRow[];
  salesBasisNarrative: string;
  gdvImprovementNarrative: string;
  costBreakdown: FinalReportCostBreakdownRow[];
  houseTypeRows: FinalReportHouseTypeRow[];
  baseAverageSaleRateFt2: number;
  averageSaleRateFt2: number;
  totalGifaFt2: number;
  sensitivityRows: FinalReportSensitivityRow[];
  landPriceSensitivityRows: FinalReportLandPriceSensitivityRow[];
  profitMarginRows: FinalReportProfitMarginRow[];
  abnormalConstraintsNarrative: string;
  abnormalRows: FinalReportAbnormalEvidenceRow[];
  siteCostSummaryRows: Array<{ title: string; base: number; additions: number; total: number }>;
  siteCostRegisterSummary: string;
  landOfferRows: FinalReportAbnormalEvidenceRow[];
  landOfferDisclosureTotal: number;
  /** Unpriced exclusions, separate from the already-counted land-offer disclosure. */
  notAllowedAbnormalRows: NotAllowedAbnormalRow[];
}

function fmtPercent(value: number) {
  return `${(value || 0).toFixed(1)}%`;
}

function fmtMoney(value: number) {
  return `£${(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function scenarioRows(metrics: ReturnType<typeof calculateAppraisalOption>): FinalReportSummaryRow[] {
  return [
    { label: 'GDV', value: metrics.gdv },
    { label: 'Non-land costs', value: metrics.nonLandCost },
    { label: 'Finance', value: metrics.financeCost },
    { label: 'Land value', value: metrics.landValue },
    { label: 'Total cost', value: metrics.totalCost },
    { label: 'Profit', value: metrics.profit, note: `${fmtPercent(metrics.profitOnGdvPercent)} on GDV` },
  ];
}

function scenario(id: string, title: string, metrics: ReturnType<typeof calculateAppraisalOption>): FinalReportScenario {
  return {
    id,
    title,
    rows: scenarioRows(metrics),
    landValue: metrics.landValue,
    profit: metrics.profit,
    profitOnGdvPercent: metrics.profitOnGdvPercent,
  };
}

function rowGifaFt2(row: AppraisalHouseTypeScheduleRow) {
  return Math.max(0, row.gifaM2 || 0) * SQ_FT_PER_M2;
}

type ReportSaleUnitRow = {
  id: string;
  houseTypeName: string;
  quantity: number;
  gifaM2: number;
  saleValuePerUnit: number;
  saleRatePerM2: number;
};

function reportSaleUnitRows(option: DevelopmentAppraisalOption): ReportSaleUnitRow[] {
  return (option.houseTypeSchedule || []).flatMap((row) => {
    const salesRows = getHouseTypeSalesRows(row);
    if (salesRows.length > 0) {
      return salesRows.map((salesRow) => ({
        id: `${row.id}-${salesRow.id}`,
        houseTypeName: salesRow.label,
        quantity: salesRow.quantity,
        gifaM2: salesRow.gifaM2,
        saleValuePerUnit: salesRow.saleValuePerUnit || row.saleValuePerUnit || 0,
        saleRatePerM2: salesRow.saleRatePerM2 || row.saleRatePerM2 || 0,
      }));
    }
    return [{
      id: row.id,
      houseTypeName: row.houseTypeName,
      quantity: calculateHouseTypeSalesQuantity(row),
      gifaM2: row.gifaM2,
      saleValuePerUnit: row.saleValuePerUnit || 0,
      saleRatePerM2: row.saleRatePerM2 || 0,
    }];
  });
}

function saleUnitGifaFt2(row: ReportSaleUnitRow) {
  return Math.max(0, row.gifaM2 || 0) * SQ_FT_PER_M2;
}

function saleUnitRateFt2(row: ReportSaleUnitRow) {
  const ft2 = saleUnitGifaFt2(row);
  if (ft2 <= 0) return 0;
  if ((row.saleValuePerUnit || 0) > 0) return (row.saleValuePerUnit || 0) / ft2;
  return Math.max(0, row.saleRatePerM2 || 0) / SQ_FT_PER_M2;
}

function rowSaleRateFt2(row: AppraisalHouseTypeScheduleRow) {
  const ft2 = rowGifaFt2(row);
  if (ft2 <= 0) return 0;
  if ((row.saleValuePerUnit || 0) > 0) return (row.saleValuePerUnit || 0) / ft2;
  return Math.max(0, row.saleRatePerM2 || 0) / SQ_FT_PER_M2;
}

function formatReportDateLabel(date: string | undefined) {
  if (!date) return '';
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
}

function salesIndexationGdvRowTitle(option: DevelopmentAppraisalOption) {
  const percent = (option.salesIndexationPercent || 0).toFixed(2).replace(/\.?0+$/, '');
  const startDate = formatReportDateLabel(option.programme?.expectedStartDate || option.startDate);
  return startDate
    ? `Sales indexation uplift (${percent}% to ${startDate})`
    : `Sales indexation uplift (${percent}%)`;
}

function withSaleRateDelta(option: DevelopmentAppraisalOption, deltaRateFt2: number): DevelopmentAppraisalOption {
  return {
    ...option,
    houseTypeSchedule: (option.houseTypeSchedule || []).map((row) => {
      const salesRows = getHouseTypeSalesRows(row);
      if (salesRows.length > 0) {
        return {
          ...row,
          salesRows: salesRows.map((salesRow) => {
            const ft2 = Math.max(0, salesRow.gifaM2 || 0) * SQ_FT_PER_M2;
            const currentRate = saleUnitRateFt2({
              id: salesRow.id,
              houseTypeName: salesRow.label,
              quantity: salesRow.quantity,
              gifaM2: salesRow.gifaM2,
              saleValuePerUnit: salesRow.saleValuePerUnit || row.saleValuePerUnit || 0,
              saleRatePerM2: salesRow.saleRatePerM2 || row.saleRatePerM2 || 0,
            });
            if (ft2 <= 0 || currentRate <= 0) return salesRow;
            const nextRate = Math.max(0, currentRate + deltaRateFt2);
            return {
              ...salesRow,
              saleValuePerUnit: Math.round(nextRate * ft2),
              saleRatePerM2: 0,
            };
          }),
          saleValuePerUnit: 0,
          saleRatePerM2: 0,
        };
      }
      const ft2 = rowGifaFt2(row);
      const currentRate = rowSaleRateFt2(row);
      if (ft2 <= 0 || currentRate <= 0) return row;
      const nextRate = Math.max(0, currentRate + deltaRateFt2);
      return {
        ...row,
        saleValuePerUnit: Math.round(nextRate * ft2),
        saleRatePerM2: 0,
      };
    }),
  };
}

function metricsAtLandPrice(option: DevelopmentAppraisalOption, landValue: number) {
  return calculateAppraisalOption({
    ...option,
    calculationMode: 'KNOWN_LAND_PROFIT_ON_GDV',
    knownLandValue: Math.max(0, landValue),
  });
}

function uniqueLandPrices(values: number[]) {
  const seen = new Set<number>();
  return values
    .map((value) => Math.max(0, Math.round(value || 0)))
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function buildLandPriceSensitivityRows(
  option: DevelopmentAppraisalOption,
  baseMetrics: ReturnType<typeof calculateAppraisalOption>
): FinalReportLandPriceSensitivityRow[] {
  const baseLandValue = Math.max(0, baseMetrics.landValue || 0);
  const baseProfit = metricsAtLandPrice(option, baseLandValue).profit;
  const sellerLandValue = Math.max(0, option.sellerMinimumLandValue || 0);
  const standardStep = 500000;
  // Retain five points on either side of the base land value. If the standard
  // £500k reduction would go below zero, re-space the full range evenly from
  // zero so the downside is still visible and meaningful.
  const step = baseLandValue - standardStep * 5 < 0 && baseLandValue > 0
    ? baseLandValue / 5
    : standardStep;
  const landPrices = uniqueLandPrices(
    Array.from({ length: 11 }, (_, index) => Math.max(0, baseLandValue + ((index - 5) * step)))
      .filter((value) => sellerLandValue <= 0 || value <= sellerLandValue),
  );

  return landPrices.map((landValue) => {
    const metrics = metricsAtLandPrice(option, landValue);
    const isBase = Math.abs(landValue - baseLandValue) < 1;
    const isSeller = sellerLandValue > 0 && Math.abs(landValue - sellerLandValue) < 1;
    const movement = landValue - baseLandValue;
    const movementLabel = `${movement >= 0 ? '+' : '-'}£${Math.abs(movement).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    return {
      id: `land-${landValue}`,
      label: isBase
        ? (baseMetrics.landValue < 0 ? 'Zero land baseline' : 'Base land appraisal')
        : isSeller
          ? `Landowner expected receipt (${movementLabel})`
          : movementLabel,
      landValue,
      totalCost: metrics.totalCost,
      financeCost: metrics.financeCost,
      profit: metrics.profit,
      profitOnGdvPercent: metrics.profitOnGdvPercent,
      profitMovement: metrics.profit - baseProfit,
    };
  });
}

function riskEvidenceSummary(option: DevelopmentAppraisalOption) {
  const recorded = [
    option.assumptions,
    option.abnormalGeneralNotes,
    option.constraintsReport?.notes,
    ...(option.costLines || [])
      .filter(isSiteCostElement)
      .map((line) => `${line.title || 'Abnormal allowance'}${line.notes ? `: ${line.notes}` : ''}`),
  ]
    .map((value) => cleanEvidenceText(value || ''))
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return recorded.length > 280 ? `${recorded.slice(0, 277)}...` : recorded;
}

function buildProfitMarginRows(option: DevelopmentAppraisalOption): FinalReportProfitMarginRow[] {
  const evidence = riskEvidenceSummary(option);
  const currentOverheadPercent = getHouseBuildingOverheadPercent(option);
  const ricsOverheadPercent = 5;
  const cases = [
    {
      id: 'greenfield',
      label: 'Greenfield site',
      percent: 17.5,
      defaultJustification: 'Appropriate only for a straightforward greenfield delivery with normal servicing, planning and market risk.',
    },
    {
      id: 'normal',
      label: 'Normal risk',
      percent: 20,
      defaultJustification: 'Represents a standard residential development risk allowance with normal programme, sales and cost exposure.',
    },
    {
      id: 'moderate',
      label: 'Moderate risk',
      percent: 22.5,
      defaultJustification: 'Allows for additional but manageable delivery risk, such as quantified constraints, abnormal works or less certain programme assumptions.',
    },
    {
      id: 'high',
      label: 'High risk',
      percent: 25,
      defaultJustification: evidence
        ? `Specific recorded risk factors: ${evidence}`
        : 'No specific high-risk justification is recorded. This case should only be adopted once material site, cost, planning, market or delivery risks have been identified and documented.',
    },
  ];

  const currentMetrics = calculateAppraisalOption(option);
  const currentRow: FinalReportProfitMarginRow = {
    id: 'profit-margin-current-appraisal',
    label: 'Current appraisal',
    isCurrentAppraisal: true,
    operatingAndProfitPercent: currentOverheadPercent + Math.max(0, option.targetProfitOnGdvPercent || 0),
    overheadPercent: currentOverheadPercent,
    targetProfitOnGdvPercent: Math.max(0, option.targetProfitOnGdvPercent || 0),
    profit: currentMetrics.profit,
    profitOnGdvPercent: currentMetrics.profitOnGdvPercent,
    landValue: currentMetrics.landValue,
    justification: 'Current appraisal assumptions, retained unchanged for comparison with the separate RICS scenarios.',
  };

  return [currentRow, ...cases.map((entry) => {
    const metrics = calculateAppraisalOption({
      ...option,
      calculationMode: 'RESIDUAL_LAND_VALUE',
      overheadPercent: ricsOverheadPercent,
      targetProfitOnGdvPercent: Math.max(0, entry.percent - ricsOverheadPercent),
    });
    return {
      id: `profit-margin-${entry.id}`,
      label: entry.label,
      operatingAndProfitPercent: entry.percent,
      overheadPercent: ricsOverheadPercent,
      targetProfitOnGdvPercent: Math.max(0, entry.percent - ricsOverheadPercent),
      profit: metrics.profit,
      profitOnGdvPercent: metrics.profitOnGdvPercent,
      landValue: metrics.landValue,
      justification: entry.defaultJustification,
    };
  })];
}

function abnormalKnownNotes(line: AppraisalCostLine) {
  const quotationNames = (line.formalQuotations || []).map((quote) => quote.fileName).filter(Boolean);
  return [
    line.sourceLabel ? `Linked source: ${line.sourceLabel}` : '',
    line.sourceBillId ? `${line.linkedAbnormalFrozen ? 'Frozen linked abnormal snapshot' : 'Live linked abnormal'}${line.linkedAbnormalVersion ? ` version ${line.linkedAbnormalVersion}` : ''}` : '',
    quotationNames.length > 0 ? `Formal quotation evidence: ${quotationNames.join(', ')}` : '',
  ].filter(Boolean).join(' | ');
}

function evidenceSnippet(value: string | undefined, maxLength = 700) {
  const text = cleanEvidenceText(value);
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

type FinalReportEvidenceItem = {
  notes: string;
  extract: string;
};

function finalReportEvidenceItem(report: DevelopmentAppraisalOption['pricingReport'], maxLength: number): FinalReportEvidenceItem | null {
  if (!report) return null;
  const notes = cleanEvidenceText(report.notes || '');
  const extract = isUsableEvidenceText(report.extractedText)
    ? evidenceSnippet(report.extractedText, maxLength)
    : '';
  return notes || extract ? { notes, extract } : null;
}

function finalReportEvidenceItems(
  reports: Array<DevelopmentAppraisalOption['pricingReport'] | undefined>,
  maxLength: number,
  limit = 3,
) {
  return reports
    .map((report) => finalReportEvidenceItem(report, maxLength))
    .filter((item): item is FinalReportEvidenceItem => Boolean(item))
    .slice(0, limit);
}

/**
 * Keeps the report prompt grounded in readable documentary evidence without exposing
 * filenames or raw uploads in the issued report. Limits are deliberately bounded for
 * the local model context while preserving enough source wording for a useful narrative.
 */
function buildFinalReportEvidenceContext(option: DevelopmentAppraisalOption) {
  const abnormalCostEvidence = (option.costLines || [])
    .filter(isSiteCostElement)
    .map((line) => ({
      title: line.title,
      allowance: line.amount || 0,
      notes: [line.notes, line.pricedItemsInformationNotes, line.nonPricedItemsInformationNotes]
        .map((note) => cleanEvidenceText(note || ''))
        .filter(Boolean)
        .join(' '),
      quotationExtracts: finalReportEvidenceItems(line.formalQuotations || [], 1800, 2),
    }))
    .filter((line) => line.notes || line.quotationExtracts.length > 0);

  return {
    salesAndPricing: finalReportEvidenceItems([option.pricingReport], 6000, 1),
    designAndMeasurements: finalReportEvidenceItems([
      ...(option.architectFeasibilityLayouts || []),
      ...(option.baseMeasurementFiles || []),
    ], 2600, 3),
    surveyQuotations: [
      ...Object.entries(option.surveyReports?.items || {}).map(([id, choice]) => ({ id, quote: choice.quote, amount: choice.manualFee })),
      ...(option.surveyReports?.custom || []).map(choice => ({ id: choice.id, quote: choice.quote, amount: choice.manualFee })),
    ].filter(item => item.quote).map(item => ({
      surveyId: item.id,
      quotedAmount: item.amount ?? null,
      uploadedAt: item.quote?.uploadedAt,
      evidence: finalReportEvidenceItems([item.quote], 1800, 1),
    })),
    constraintsAndConsents: [
      ...finalReportEvidenceItems([option.constraintsReport], 4200, 1),
      ...finalReportEvidenceItems((option.consentTracker || []).flatMap((consent) => consent.uploads || []), 1600, 3),
    ],
    landAndLegal: finalReportEvidenceItems(option.landContractVersions || [], 2200, 2),
    abnormalCostEvidence,
  };
}

function reportEvidenceSummary(report: DevelopmentAppraisalOption['pricingReport']) {
  if (!report) return '';
  return [
    report.notes ? cleanEvidenceText(report.notes) : '',
    isUsableEvidenceText(report.extractedText) ? evidenceSnippet(report.extractedText, 1600) : '',
  ].filter(Boolean).join(' ');
}

function normalizeSalesUnitReferences(text: string, totalUnits: number) {
  const units = Math.round(totalUnits || 0);
  if (!text || units <= 0) return text;
  return text.replace(new RegExp(`\\b${units}\\s*g\\b`, 'gi'), `${units} units`);
}

function reportReadyNote(text: string) {
  const cleaned = cleanEvidenceText(text)
    .replace(/\buse the detail view to inspect[^.]*\.?/gi, '')
    .replace(/\blinked to [^.]*\.?/gi, '')
    .replace(/\bpriced items requiring further information are noted as:\s*/gi, '')
    .replace(/\bunknown or non-priced items requiring further information are noted as:\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

function buildSalesBasisNarrative(
  option: DevelopmentAppraisalOption,
  baseAverageSaleRateFt2: number,
  indexedAverageSaleRateFt2: number,
  totalGifaFt2: number,
  totalUnits: number,
  baseSalesGdv: number,
  salesIndexUplift: number,
  indexedSalesGdv: number
) {
  // These paragraphs are the non-AI fallback. Keep them factual and deliberately
  // short: raw document extraction belongs in the AI evidence context, never in a
  // reader-facing report panel.
  const pricingNotes = option.pricingReport?.notes ? evidenceSnippet(option.pricingReport.notes, 420) : '';
  const comments = evidenceSnippet(option.housePricesComment, 420);
  return [
    `The base sales schedule produces ${fmtMoney(baseSalesGdv)} at an average sales rate of ${fmtMoney(baseAverageSaleRateFt2)}/ft2 across ${Math.round(totalGifaFt2).toLocaleString()} ft2 GIFA.`,
    salesIndexUplift > 0 ? `Sales indexation adds ${fmtMoney(salesIndexUplift)}, giving an indexed GDV/GSV of ${fmtMoney(indexedSalesGdv)} at an indexed average rate of ${fmtMoney(indexedAverageSaleRateFt2)}/ft2.` : `No sales index uplift is currently applied, so the indexed GDV/GSV remains ${fmtMoney(indexedSalesGdv)}.`,
    comments ? `The pricing assumptions recorded for the appraisal are: ${normalizeSalesUnitReferences(comments, totalUnits)}.` : '',
    pricingNotes ? `The recorded pricing note is: ${normalizeSalesUnitReferences(pricingNotes, totalUnits)}.` : 'The pricing basis is drawn from the entered house price schedule and the current sales values in the appraisal.',
  ].filter(Boolean).join(' ');
}

function buildGdvImprovementNarrative(option: DevelopmentAppraisalOption) {
  const comments = evidenceSnippet(option.housePricesComment, 420);
  const evidenceSentence = comments
    ? `The recorded house-price comments should be tested against the current mix: ${normalizeSalesUnitReferences(comments, summariseHouseBuildingOption(option).totalUnits)}.`
    : 'No separate house-price commentary has been recorded, so GDV improvement recommendations should be treated as provisional until market and specification evidence is added.';
  return [
    evidenceSentence,
    'Potential GDV improvement should be tested through the housing mix, frontage, outlook, private parking, specification, incentives, and any premium plots identified in the pricing evidence rather than by applying a blanket sales uplift.',
    'Where a house type, GIFA, specification, or tenure mix changes to improve GDV, the construction cost must also be re-tested because build cost per m2, ASHP and EV allowances, prelims duration, infrastructure demand, and plot works may change at the same time.',
  ].join(' ');
}

/** Returns one named section from a generated final-report narrative. */
export function extractFinalReportNarrativeSection(summary: string | undefined, heading: string) {
  const source = (summary || '').replace(/\r/g, '').trim();
  if (!source) return '';
  const headings = [
    'Overview',
    'Sales prices and basis',
    'Costs and abnormals',
    'GDV improvement considerations',
    'Summary and recommendation',
  ];
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const start = new RegExp(`(?:^|\\n)\\s*${escapedHeading}\\s*:?[ \\t]*(?:\\n|$)`, 'i').exec(source);
  if (!start || start.index === undefined) return '';
  const contentStart = start.index + start[0].length;
  const remaining = source.slice(contentStart);
  const nextHeading = new RegExp(`\\n\\s*(?:${headings.filter((item) => item.toLowerCase() !== heading.toLowerCase()).map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\s*:?[ \\t]*(?:\\n|$)`, 'i').exec(remaining);
  return (nextHeading ? remaining.slice(0, nextHeading.index) : remaining).trim();
}

function buildAbnormalEvidenceNarrative(line: AppraisalCostLine) {
  const appraisalNotes = [
    line.pricedItemsInformationNotes,
    line.notes,
    line.nonPricedItemsInformationNotes,
  ].map((note) => reportReadyNote(note || '')).filter(Boolean);
  if (appraisalNotes.length > 0) return appraisalNotes.join(' ');

  const quotationNotes = (line.formalQuotations || [])
    .map((quote) => reportReadyNote(quote.notes || ''))
    .filter(Boolean);
  if (quotationNotes.length > 0) return quotationNotes.join(' ');

  return 'No appraisal note has been recorded for this abnormal item yet.';
}

function buildAbnormalConstraintsNarrative(option: DevelopmentAppraisalOption) {
  const aiNarrative = reportReadyNote(option.abnormalGeneralNarrative || '');
  if (aiNarrative) return aiNarrative;
  const summaryNotes = [
    reportReadyNote(option.abnormalGeneralNotes || ''),
    reportReadyNote(option.constraintsReport?.notes || ''),
  ].filter(Boolean);
  if (summaryNotes.length > 0) return summaryNotes.join(' ');
  const report = option.constraintsReport;
  if (!report) return '';
  if (isUsableEvidenceText(report.extractedText)) {
    return evidenceSnippet(cleanEvidenceText(report.extractedText || ''), 900);
  }
  return '';
}

function groupedCostsFromBreakdown(rows: FinalReportCostBreakdownRow[]) {
  const groups = new Map<string, FinalReportGroupedCostRow>();
  rows.forEach((row) => {
    const isAbnormal = row.category === APPRAISAL_COST_CATEGORY_LABELS.ABNORMALS;
    const key = isAbnormal ? 'abnormals' : row.id;
    const title = isAbnormal ? 'Abnormals' : row.title;
    const current = groups.get(key);
    groups.set(key, {
      id: key,
      title,
      amount: (current?.amount || 0) + row.amount,
      notes: isAbnormal
        ? 'Total abnormal allowance; see abnormal detail section.'
        : row.notes || current?.notes || '',
    });
  });
  return Array.from(groups.values());
}

function costSummaryRowsForReport(
  groupedCostRows: FinalReportGroupedCostRow[],
  metrics: ReturnType<typeof calculateAppraisalOption>,
  calculationMode: DevelopmentAppraisalOption['calculationMode'],
): FinalReportCostSummaryRow[] {
  const componentRows = groupedCostRows.map((row) => ({ ...row, role: 'COMPONENT' as const }));
  const subtotalBeforeLand = metrics.nonLandCost + metrics.financeCost;
  const landLabel = calculationMode === 'RESIDUAL_LAND_VALUE' ? 'Residual land value' : 'Land value';

  return [
    ...componentRows,
    ...(metrics.financeCost !== 0 ? [{
      id: 'finance',
      title: 'Finance',
      amount: metrics.financeCost,
      role: 'FINANCE' as const,
    }] : []),
    {
      id: 'subtotal-before-land',
      title: 'Subtotal before land',
      amount: subtotalBeforeLand,
      role: 'SUBTOTAL' as const,
    },
    {
      id: 'land-value',
      title: landLabel,
      amount: metrics.landValue,
      role: 'LAND' as const,
    },
    {
      id: 'total-cost',
      title: 'Total cost',
      amount: metrics.totalCost,
      role: 'TOTAL' as const,
    },
  ];
}

export function buildFinalReportData(option: DevelopmentAppraisalOption): FinalReportData {
  if (option.frozenReportData) return option.frozenReportData;
  const finalMetrics = calculateFinalReportMetrics(option);
  const sellerMetrics = calculateSellerLandPriceMetrics(option);
  const summary = summariseHouseBuildingOption(option);
  const totalGifaFt2 = summary.totalGifa * SQ_FT_PER_M2;
  const baseSalesGdv = calculateOptionBaseGdv(option);
  const salesIndexUplift = calculateSalesIndexationUplift(option, baseSalesGdv);
  const houseSalesGdv = summary.gdv;
  const customGdvAddition = Math.max(0, option.customGdvAdditionAmount || 0);
  const indexableSalesGdv = Math.max(0, baseSalesGdv - customGdvAddition);
  const salesIndexFactor = option.salesIndexationEnabled === true ? Math.min(100, Math.max(0, option.salesIndexationPercent || 0)) / 100 : 0;
  const indexedHouseSalesGdv = houseSalesGdv + (houseSalesGdv * salesIndexFactor);
  const indexedSalesGdv = indexableSalesGdv + salesIndexUplift;
  const baseAverageSaleRateFt2 = totalGifaFt2 > 0 ? houseSalesGdv / totalGifaFt2 : 0;
  const averageSaleRateFt2 = totalGifaFt2 > 0 ? indexedHouseSalesGdv / totalGifaFt2 : 0;
  const costBreakdown = calculateCostLines(option, finalMetrics.metrics.gdv)
    .filter(({ line }) => line.category !== 'FINANCE')
    .map(({ line, amount }) => ({
      id: line.id,
      title: line.title,
      category: isSiteCostElement(line) ? `Additional elements: ${SITE_COST_ALLOCATION_LABELS[siteCostMetadata(line).allocation]}` : APPRAISAL_COST_CATEGORY_LABELS[line.category],
      amount,
      notes: line.notes || line.sourceLabel || '',
    }));
  const privateRows = houseRowsByTenure(option.houseTypeSchedule || [], 'PRIVATE');
  const affordableRows = houseRowsByTenure(option.houseTypeSchedule || [], 'AFFORDABLE');
  const gdvRows: FinalReportGdvRow[] = [
    {
      id: 'private-gdv',
      title: 'Private housing GDV/GSV',
      units: privateRows.reduce((total, row) => total + calculateHouseTypeSalesQuantity(row), 0),
      gdv: privateRows.reduce((total, row) => total + calculateHouseTypeGdv(row), 0),
    },
    {
      id: 'affordable-gdv',
      title: 'Affordable housing GDV/GSV',
      units: affordableRows.reduce((total, row) => total + calculateHouseTypeSalesQuantity(row), 0),
      gdv: affordableRows.reduce((total, row) => total + calculateHouseTypeGdv(row), 0),
    },
    {
      id: 'custom-gdv-addition',
      title: option.customGdvAdditionNote?.trim() || 'Custom GDV addition',
      units: 0,
      gdv: Math.max(0, option.customGdvAdditionAmount || 0),
    },
    {
      id: 'sales-indexation-uplift',
      title: salesIndexationGdvRowTitle(option),
      units: 0,
      gdv: salesIndexUplift,
    },
  ].filter((row) => row.units > 0 || row.gdv > 0);
  const indexFactor = houseSalesGdv > 0 ? indexedHouseSalesGdv / houseSalesGdv : 1;
  const houseTypeRows = reportSaleUnitRows(option).map((row) => {
    const baseSaleValuePerUnit = row.saleValuePerUnit || 0;
    const baseGdv = baseSaleValuePerUnit > 0
      ? row.quantity * baseSaleValuePerUnit
      : row.quantity * Math.max(0, row.gifaM2 || 0) * Math.max(0, row.saleRatePerM2 || 0);
    const indexedSaleValuePerUnit = baseSaleValuePerUnit * indexFactor;
    const indexedGdv = baseGdv * indexFactor;
    const gifaFt2 = saleUnitGifaFt2(row);
    return {
      id: row.id,
      houseTypeName: row.houseTypeName,
      quantity: row.quantity,
      gifaFt2,
      saleValuePerUnit: baseSaleValuePerUnit,
      saleRateFt2: saleUnitRateFt2(row),
      gdv: baseGdv,
      indexUpliftPerUnit: Math.max(0, indexedSaleValuePerUnit - baseSaleValuePerUnit),
      indexedSaleValuePerUnit,
      indexedSaleRateFt2: gifaFt2 > 0 ? indexedSaleValuePerUnit / gifaFt2 : 0,
      indexedGdv,
    };
  });
  const sensitivityRows = [-25, -20, -15, -10, -5, 5, 10, 15, 20, 25].map((deltaRateFt2) => {
    const nextOption = withSaleRateDelta(option, deltaRateFt2);
    const metrics = calculateFinalReportMetrics(nextOption).metrics;
    return {
      deltaRateFt2,
      averageRateFt2: totalGifaFt2 > 0 ? metrics.gdv / totalGifaFt2 : 0,
      gdv: metrics.gdv,
      landValue: metrics.landValue,
      profit: metrics.profit,
      profitOnGdvPercent: metrics.profitOnGdvPercent,
    };
  });
  const abnormalRows = (option.costLines || [])
    .filter(isSiteCostElement)
    .map((line) => ({
      id: line.id,
      title: line.title,
      amount: calculateCostLineAmount(line, option),
      allocation: SITE_COST_ALLOCATION_LABELS[siteCostMetadata(line).allocation],
      assessmentStatus: SITE_COST_STATUS_LABELS[siteCostMetadata(line).status],
      includeInLandOffer: siteCostMetadata(line).includeInLandOffer,
      offerQualification: siteCostMetadata(line).offerQualification || '',
      responsiblePerson: siteCostMetadata(line).responsiblePerson || '',
      baseOverlapNote: siteCostMetadata(line).baseOverlapNote || '',
      retainedEstimate: line.amount || 0,
      clearanceReason: siteCostMetadata(line).clearanceReason || '',
      changeHistory: line.siteCost,
      knownCostNotes: abnormalKnownNotes(line),
      estimatedCostNotes: [line.notes || '', line.pricedItemsInformationNotes || ''].filter(Boolean).join(' | '),
      unknownCostNotes: line.nonPricedItemsInformationNotes || '',
      evidenceNarrative: [
        `Allocation: ${SITE_COST_ALLOCATION_LABELS[siteCostMetadata(line).allocation]}. Status: ${SITE_COST_STATUS_LABELS[siteCostMetadata(line).status]}.`,
        siteCostMetadata(line).includeInLandOffer ? `Include in land offer (cost already counted): ${siteCostMetadata(line).offerQualification || 'Qualification not recorded'}.` : '',
        siteCostMetadata(line).status === 'CLEARED' ? `Cleared: ${siteCostMetadata(line).clearanceReason || ''}. Retained estimate: ${fmtMoney(line.amount)}.` : '',
        siteCostMetadata(line).responsiblePerson ? `Responsible: ${siteCostMetadata(line).responsiblePerson}.` : '',
        siteCostMetadata(line).baseOverlapNote ? `Base overlap review: ${siteCostMetadata(line).baseOverlapNote}.` : '',
        buildAbnormalEvidenceNarrative(line),
      ].filter(Boolean).join(' '),
      quotationCount: (line.formalQuotations || []).length,
      quotationNames: (line.formalQuotations || []).map((quote) => quote.fileName).filter(Boolean),
    }));
  const siteCosts = siteCostSummary(option, line => calculateCostLineAmount(line, option));
  const baseFor = (section: 'INFRASTRUCTURE' | 'PLOT_WORKS') => (option.siteDimensions || []).filter(row => !row.isCostDriverInput && siteBaseRowMatches(row, section)).reduce((total, row) => total + calculateSiteDimensionTotal(row, option), 0);
  const siteCostSummaryRows = (Object.keys(SITE_COST_ALLOCATION_LABELS) as Array<keyof typeof SITE_COST_ALLOCATION_LABELS>).map(key => {
    const base = key === 'ABNORMALS' ? siteCosts.abnormalBase : key === 'SITE_SPECIFIC' ? 0 : baseFor(key);
    return { title: SITE_COST_ALLOCATION_LABELS[key], base, additions: siteCosts.additions[key], total: base + siteCosts.additions[key] };
  });
  const siteCostRegisterSummary = `Additional elements: ${fmtMoney(siteCosts.additionsTotal)}. To be assessed: ${siteCosts.unresolvedCount}; unpriced: ${siteCosts.unpricedCount}; unresolved allowances included: ${fmtMoney(siteCosts.unresolvedAllowance)}; cleared: ${siteCosts.clearedCount}. Land-offer disclosure is a subset already included in appraisal costs.`;
  const abnormalConstraintsNarrative = buildAbnormalConstraintsNarrative(option);
  const groupedCostRows = groupedCostsFromBreakdown(costBreakdown);
  const costSummaryRows = costSummaryRowsForReport(groupedCostRows, finalMetrics.originalMetrics, option.calculationMode);
  const landPriceSensitivityRows = buildLandPriceSensitivityRows(option, finalMetrics.originalMetrics);
  const profitMarginRows = buildProfitMarginRows(option);

  return {
    currentScenario: scenario('current', 'Current appraisal', finalMetrics.originalMetrics),
    zeroLandScenario: finalMetrics.hasNegativeResidualLand ? scenario('zero-land', 'Adjusted land at zero', finalMetrics.metrics) : null,
    sellerScenario: sellerMetrics ? scenario('seller', 'Likely seller land price', sellerMetrics) : null,
    baseSalesGdv: indexableSalesGdv,
    salesIndexUplift,
    indexedSalesGdv,
    gdvRows,
    groupedCostRows,
    costSummaryRows,
    baseSummaryRows: [
      { label: 'Indexed GDV/GSV', value: finalMetrics.originalMetrics.gdv },
      { label: 'Cost', value: finalMetrics.originalMetrics.totalCost },
      { label: 'Residual Land Value', value: finalMetrics.originalMetrics.landValue },
      { label: 'Profit', value: finalMetrics.originalMetrics.profit },
      { label: 'Profit %', value: finalMetrics.originalMetrics.profitOnGdvPercent, isPercent: true },
    ],
    salesBasisNarrative: buildSalesBasisNarrative(option, baseAverageSaleRateFt2, averageSaleRateFt2, totalGifaFt2, summary.totalUnits, indexableSalesGdv, salesIndexUplift, indexedSalesGdv),
    gdvImprovementNarrative: buildGdvImprovementNarrative(option),
    costBreakdown,
    houseTypeRows,
    baseAverageSaleRateFt2,
    averageSaleRateFt2,
    totalGifaFt2,
    sensitivityRows,
    landPriceSensitivityRows,
    profitMarginRows,
    abnormalConstraintsNarrative,
    abnormalRows,
    siteCostSummaryRows,
    siteCostRegisterSummary,
    engineeringScope: option.engineeringScope?.confirmedAt ? {confirmedAt:option.engineeringScope.confirmedAt,source:ENGINEERING_SOURCE_FILE,notes:ENGINEERING_SOURCE_NOTES,normal:engineeringScopeReview(option).normal,rows:engineeringScopeReview(option).rows.map(row=>{
      const element=row.def.abnormal ? option.costLines.find(line=>line.engineeringScopeItemId===row.def.id) : undefined;
      const register=element ? siteCostMetadata(element) : undefined;
      return {reference:row.def.id,title:row.def.label,scope:row.def.scope,status:`${row.decision==='NOT_REQUIRED' ? 'Not required' : row.def.kind==='INCLUDED' ? 'Included' : row.def.zeroCost ? 'Required: no fee' : row.pricingMode==='MANUAL' ? 'Required: manual entry' : 'Required: calculated sum'}${register ? `; ${SITE_COST_STATUS_LABELS[register.status]}${element?.linkedAbnormalFrozen ? '; frozen amount' : ''}` : ''}`,destination:register ? SITE_COST_ALLOCATION_LABELS[register.allocation] : row.destination,mechanism:row.mechanism,amount:element ? calculateCostLineAmount(element,option) : row.amount ?? 0,scopeAllowance:row.amount ?? 0,note:row.note,source:row.def.siteSpecific ? 'User-entered topographical survey cost; procurement scope at Sheet1!B15:L15' : `Sheet1!B${row.def.row}:L${row.def.row}`};
    })} : null,
    landOfferRows: abnormalRows.filter(row => row.includeInLandOffer),
    landOfferDisclosureTotal: siteCosts.landOfferTotal,
    notAllowedAbnormalRows: notAllowedAbnormalRows(option),
  };
}

function houseRowsByTenure(rows: AppraisalHouseTypeScheduleRow[], tenure: 'PRIVATE' | 'AFFORDABLE') {
  return rows.filter((row) => (row.tenure || 'PRIVATE') === tenure);
}

export function buildFinalReportAiContext(option: DevelopmentAppraisalOption) {
  const report = buildFinalReportData(option);
  const houseBuildingSummary = summariseHouseBuildingOption(option);
  return {
    reportNarrativeSchemaVersion: option.engineeringScope?.confirmedAt ? '2026-10-13-engineering-and-survey-exclusions' : FINAL_REPORT_NARRATIVE_SCHEMA_VERSION,
    option: {
      name: option.name,
      template: option.template,
      calculationMode: option.calculationMode,
      targetProfitOnGdvPercent: option.targetProfitOnGdvPercent,
      assumptions: option.assumptions || '',
      housePricesComment: option.housePricesComment || '',
      abnormalGeneralNotes: option.abnormalGeneralNotes || '',
      abnormalBaseAllowance: option.abnormalBaseAllowance || 0,
      engineeringScope: report.engineeringScope,
      engineeringScopeDraft: option.engineeringScopeDraft || null,
      siteCostRegister: (option.costLines || []).filter(isSiteCostElement).map(line => ({ id: line.id, amount: calculateCostLineAmount(line, option), metadata: siteCostMetadata(line) })),
      notAllowedAbnormalRows: report.notAllowedAbnormalRows,
      decisionNote: option.decisionNote || '',
      pricingReport: option.pricingReport
        ? {
            notes: option.pricingReport.notes || '',
            extractionStatus: option.pricingReport.extractionStatus,
            extractionError: option.pricingReport.extractionError,
          }
        : null,
      constraintsReport: option.constraintsReport
        ? {
            notes: option.constraintsReport.notes || '',
            extractionStatus: option.constraintsReport.extractionStatus,
            extractionError: option.constraintsReport.extractionError,
          }
        : null,
      landContractVersions: (option.landContractVersions || []).map((contract, index) => ({
        version: index + 1,
        uploadedAt: contract.uploadedAt,
        notes: contract.notes || '',
        extractionStatus: contract.extractionStatus,
        extractionError: contract.extractionError,
      })),
      baseMeasurementFiles: (option.baseMeasurementFiles || []).map((file, index) => ({
        version: index + 1,
        uploadedAt: file.uploadedAt,
        notes: file.notes || '',
        extractionStatus: file.extractionStatus,
        extractionError: file.extractionError,
      })),
      architectFeasibilityLayouts: (option.architectFeasibilityLayouts || []).map((file, index) => ({
        version: index + 1,
        uploadedAt: file.uploadedAt,
        notes: file.notes || '',
        extractionStatus: file.extractionStatus,
        extractionError: file.extractionError,
      })),
      consentTracker: (option.consentTracker || []).map((consent) => ({
        title: consent.title,
        authority: consent.authority || '',
        status: consent.status,
        responsibleParty: consent.responsibleParty || '',
        reference: consent.reference || '',
        targetDate: consent.targetDate || '',
        submittedDate: consent.submittedDate || '',
        approvedDate: consent.approvedDate || '',
        notes: consent.notes || '',
        uploads: (consent.uploads || []).map((upload) => ({
          uploadedAt: upload.uploadedAt,
          notes: upload.notes || '',
          extractionStatus: upload.extractionStatus,
          extractionError: upload.extractionError,
        })),
      })),
      documentaryEvidence: buildFinalReportEvidenceContext(option),
    },
    report,
    salesIndexation: {
      baseSalesGdv: report.baseSalesGdv,
      salesIndexUplift: report.salesIndexUplift,
      indexedSalesGdv: report.indexedSalesGdv,
      baseAverageSaleRateFt2: report.baseAverageSaleRateFt2,
      indexedAverageSaleRateFt2: report.averageSaleRateFt2,
      assessedAt: option.salesIndexationAssessedAt || '',
      narrative: option.salesIndexationNarrative || '',
    },
    salesScheduleAnalysis: report.houseTypeRows.map((row) => ({
      houseTypeName: row.houseTypeName,
      quantity: row.quantity,
      gifaFt2: row.gifaFt2,
      baseSaleValuePerUnit: row.saleValuePerUnit,
      baseSaleRateFt2: row.saleRateFt2,
      indexedSaleValuePerUnit: row.indexedSaleValuePerUnit,
      indexedSaleRateFt2: row.indexedSaleRateFt2,
      indexedGdv: row.indexedGdv,
    })),
    houseTypeCommercialSignals: (option.houseTypeSchedule || []).map((row) => {
      const salesRow = report.houseTypeRows.find((item) => item.id === row.id);
      const baseConstructionTotal = calculateHouseTypeConstructionTotal(row);
      return {
        houseTypeName: row.houseTypeName,
        quantity: salesRow?.quantity || 0,
        indexedGdv: salesRow?.indexedGdv || 0,
        baseConstructionTotal,
        grossContributionBeforeSiteCosts: (salesRow?.indexedGdv || 0) - baseConstructionTotal,
        caveat: 'This is a house-type commercial signal only. It excludes site-wide costs, abnormals, overheads, finance, land and taxes; it is not final project profit.',
      };
    }),
    gdvImprovementFallback: report.gdvImprovementNarrative,
    constructionCostBasis: {
      // The appraisal holds the individual house-type trade allowances at their
      // library/base indices. Index movement is deliberately a separate contingency.
      baseHouseConstructionCost: houseBuildingSummary.baseHouseConstructionCost,
      baseSiteWorksCost: houseBuildingSummary.baseSiteWorksCost,
      constructionContingencyToSiteStart: houseBuildingSummary.constructionContingency,
      privateHouseContingencyToSiteStart: houseBuildingSummary.privateHouseConstructionContingency,
      affordableHouseContingencyToSiteStart: houseBuildingSummary.affordableHouseConstructionContingency,
      siteWorksContingencyToSiteStart: houseBuildingSummary.siteWorksContingency,
      statement: 'Base house-type and site-work costs are not a discrepancy with the indexed reference amounts. Each included trade is held at its own base index and any valid movement from that trade index to the site-start index is carried once, separately, in construction contingency. The indexed-at-appraisal amounts are reference values only and are not additional costs.',
    },
    houseCostChecks: (option.houseTypeSchedule || []).map((row) => ({
      houseTypeName: row.houseTypeName,
      baseConstructionTotal: calculateHouseTypeConstructionTotal(row),
      baseBuildCostPerM2: calculateHouseTypeScheduleBuildCostPerM2(row),
    })),
  };
}

export function buildFinalReportSourceSignature(option: DevelopmentAppraisalOption) {
  return JSON.stringify(buildFinalReportAiContext(option));
}

export function buildFallbackFinalReportExecutiveSummary(option: DevelopmentAppraisalOption) {
  const report = buildFinalReportData(option);
  const current = report.currentScenario;
  const gdv = current.rows.find((row) => row.label === 'GDV')?.value || 0;
  const nonLand = current.rows.find((row) => row.label === 'Non-land costs')?.value || 0;
  const land = current.rows.find((row) => row.label === 'Land value')?.value || 0;
  const profit = current.profit;
  const abnormalTotal = report.abnormalRows.reduce((total, row) => total + row.amount, 0);
  const abnormalUnknowns = report.abnormalRows.filter((row) => row.unknownCostNotes.trim()).length;
  const zeroLandText = report.zeroLandScenario
    ? ` The residual land value is below zero, so the adjusted report also shows the position with land capped at £0, resulting in profit of ${fmtMoney(report.zeroLandScenario.profit)} (${fmtPercent(report.zeroLandScenario.profitOnGdvPercent)} on GDV).`
    : '';
  const sellerText = report.sellerScenario
    ? ` A separate likely seller land price scenario has also been included at ${fmtMoney(report.sellerScenario.landValue)}, showing profit of ${fmtMoney(report.sellerScenario.profit)} (${fmtPercent(report.sellerScenario.profitOnGdvPercent)} on GDV).`
    : '';
  const salesBasis = [
    report.salesBasisNarrative,
    option.housePricesComment ? `House price comments note that ${cleanEvidenceText(option.housePricesComment)}.` : '',
  ].filter(Boolean).join(' ');
  const abnormalsBasis = report.abnormalRows.length > 0
    ? `${report.abnormalRows.length} additional site element${report.abnormalRows.length === 1 ? '' : 's'} total ${fmtMoney(abnormalTotal)}. ${abnormalUnknowns > 0 ? `${abnormalUnknowns} site element${abnormalUnknowns === 1 ? ' has' : 's have'} unknown or further information notes.` : 'No unknown-cost notes have been recorded for the additional site elements.'}${report.abnormalConstraintsNarrative ? ` The constraints report summary notes: ${report.abnormalConstraintsNarrative}` : ''}`
    : report.abnormalConstraintsNarrative
      ? `No additional site elements have been added, but the constraints report summary notes: ${report.abnormalConstraintsNarrative}`
      : 'No additional site elements have been added.';
  const recommendation = current.profitOnGdvPercent > 18
    ? 'The appraisal is recommended on the current inputs because profit exceeds 18% of GDV/GSV.'
    : current.profitOnGdvPercent >= 12
      ? 'The appraisal should be considered depending on the required return, because profit sits between 12% and 18% of GDV/GSV.'
      : `The appraisal is not recommended on the current inputs unless the land can be secured at a discount${land < 0 ? ' or substantial discount' : ''} sufficient to restore the required return.`;

  return `Overview
The appraisal currently shows GDV of ${fmtMoney(gdv)}, non-land costs of ${fmtMoney(nonLand)}, land value of ${fmtMoney(land)}, and profit of ${fmtMoney(profit)} (${fmtPercent(current.profitOnGdvPercent)} on GDV).${zeroLandText}${sellerText}

Sales prices and basis
The current house price schedule produces an average sales rate of ${fmtMoney(report.averageSaleRateFt2)}/ft2 across ${fmtMoney(report.totalGifaFt2).replace('£', '')} ft2 GIFA. ${salesBasis || 'No separate house price commentary or pricing report notes have been recorded.'}

Costs and abnormals
The cost summary is based on the live appraisal cost build-up, including house costs, base site works, site-specific works, abnormals, preliminaries, overheads and contingency where applicable. ${abnormalsBasis}

GDV improvement considerations
${report.gdvImprovementNarrative}

Summary and recommendation
${recommendation}`;
}
