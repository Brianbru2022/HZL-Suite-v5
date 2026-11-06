import type {
  AppraisalHouseTypeLibraryItem,
  AppraisalRateLibraryItem,
  DevelopmentAppraisal,
  DevelopmentAppraisalOption,
} from '../types';
import {
  calculateAppraisalOption,
  calculateFinalReportMetrics,
  calculateSellerLandPriceMetrics,
} from './appraisal';
import { buildFinalReportData } from './appraisalFinalReport';
import { calculateCommercialFinancialAssurance } from './commercialLifecycle';

/** Capture the calculated basis before marking a revision immutable. */
export function freezeAppraisalVersion(
  appraisal: DevelopmentAppraisal,
  frozenAt = new Date().toISOString(),
): DevelopmentAppraisal {
  if (appraisal.frozenAt) return appraisal;
  const options = appraisal.options.map((source): DevelopmentAppraisalOption => {
    const option = JSON.parse(JSON.stringify(source)) as DevelopmentAppraisalOption;
    const frozenMetrics = calculateAppraisalOption(option);
    const frozenFinalReportMetrics = calculateFinalReportMetrics(option);
    const frozenSellerMetrics = calculateSellerLandPriceMetrics(option);
    const frozenZeroLandMetrics = calculateAppraisalOption({
      ...option,
      calculationMode: 'KNOWN_LAND_PROFIT_ON_GDV',
      knownLandValue: 0,
    });
    const frozenReportData = appraisal.kind !== 'COMMERCIAL'
      ? buildFinalReportData(option)
      : undefined;
    const frozenCommercialAssurance = appraisal.kind === 'COMMERCIAL'
      ? calculateCommercialFinancialAssurance(option)
      : undefined;
    return {
      ...option,
      frozenMetrics,
      frozenMetricsBasis: {
        calculationMode: option.calculationMode,
        knownLandValue: option.knownLandValue,
        targetProfitOnGdvPercent: option.targetProfitOnGdvPercent,
        overheadPercent: option.overheadPercent,
      },
      frozenFinalReportMetrics,
      frozenSellerMetrics,
      frozenZeroLandMetrics,
      frozenReportData,
      frozenCommercialAssurance,
    };
  });
  return { ...appraisal, options, frozenAt, updatedAt: frozenAt };
}

/** An editable revision must calculate afresh from its copied inputs. */
export function thawAppraisalOption(option: DevelopmentAppraisalOption): DevelopmentAppraisalOption {
  const {
    frozenMetrics: _metrics,
    frozenMetricsBasis: _basis,
    frozenFinalReportMetrics: _finalMetrics,
    frozenSellerMetrics: _sellerMetrics,
    frozenZeroLandMetrics: _zeroLandMetrics,
    frozenReportData: _report,
    frozenCommercialAssurance: _commercialAssurance,
    approvedReportIssues: _issues,
    ...editable
  } = option;
  return {
    ...editable,
    finalReportExecutiveSummary: undefined,
    finalReportSourceSignature: undefined,
  };
}

/** On a new revision, rebase only rows explicitly linked to pricing libraries. */
export function refreshRevisionLibraryPrices(
  option: DevelopmentAppraisalOption,
  houseTypes: AppraisalHouseTypeLibraryItem[],
  rates: AppraisalRateLibraryItem[],
): DevelopmentAppraisalOption {
  const houseTypesById = new Map(houseTypes.map((item) => [item.id, item]));
  const ratesById = new Map(rates.map((item) => [item.id, item]));
  return {
    ...option,
    houseTypeSchedule: option.houseTypeSchedule?.map((row) => {
      const latest = row.libraryHouseTypeId ? houseTypesById.get(row.libraryHouseTypeId) : undefined;
      return latest ? {
        ...row,
        buildCostPerM2: latest.buildCostPerM2,
        costBreakdown: latest.costBreakdown ? JSON.parse(JSON.stringify(latest.costBreakdown)) : undefined,
        priceIndex: latest.priceIndex,
      } : row;
    }),
    siteDimensions: option.siteDimensions?.map((row) => {
      const latest = row.libraryRateId ? ratesById.get(row.libraryRateId) : undefined;
      return latest && !row.isCostDriverInput ? {
        ...row,
        rate: latest.rate,
        priceIndex: latest.priceIndex,
        sourceFormula: latest.sourceFormula,
        sourceRow: latest.sourceRow,
      } : row;
    }),
  };
}

/** Guard read-only appraisals, including deletes and background refreshes. Folder and site metadata use narrow update paths. */
export function preserveFrozenAppraisals(
  previous: DevelopmentAppraisal[],
  proposed: DevelopmentAppraisal[],
): DevelopmentAppraisal[] {
  const frozen = new Map(previous.filter((entry) => entry.frozenAt || entry.unviableMarkedAt).map((entry) => [entry.id, entry]));
  if (frozen.size === 0) return proposed;
  const seen = new Set<string>();
  const next = proposed.map((entry) => {
    const original = frozen.get(entry.id);
    if (!original) return entry;
    seen.add(entry.id);
    return original;
  });
  previous.forEach((entry) => {
    if ((entry.frozenAt || entry.unviableMarkedAt) && !seen.has(entry.id)) next.push(entry);
  });
  return next;
}
