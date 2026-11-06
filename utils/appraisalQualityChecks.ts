import { isSiteCostElement, isClearedSiteCost, siteCostMetadata } from './appraisalSiteCosts';
import { calculateCostLineAmount } from './appraisal';
import type { AppraisalCostLine, DevelopmentAppraisalOption } from '../types';
import { getCommercialAssets, getCommercialSiteWideCostLines } from './commercialAssets';
import { calculateCommercialFinancialAssurance } from './commercialLifecycle';
import { SKIP_WASTE_ROW_IDS, skipWasteReview } from './appraisalSkipWaste';

export type AppraisalQualityIssue = {
  id: string;
  severity: 'BLOCKER' | 'WARNING';
  area: 'INDICES' | 'COSTS' | 'SALES' | 'LIBRARY' | 'COMMERCIAL' | 'EVIDENCE';
  message: string;
  action: string;
};

const positive = (value: unknown) => Number.isFinite(Number(value)) && Number(value) > 0;

function issue(id: string, severity: AppraisalQualityIssue['severity'], area: AppraisalQualityIssue['area'], message: string, action: string): AppraisalQualityIssue {
  return { id, severity, area, message, action };
}

function hasUsableIndex(value: unknown) {
  return positive(value);
}

function checkCostLine(line: AppraisalCostLine, index: number, checks: AppraisalQualityIssue[], option: DevelopmentAppraisalOption) {
  if (!line.title?.trim()) checks.push(issue(`cost-title-${line.id || index}`, 'BLOCKER', 'COSTS', `Cost row ${index + 1} has no description.`, 'Name the cost row or remove it.'));
  if (isSiteCostElement(line)) {
    const metadata = siteCostMetadata(line);
    if (isClearedSiteCost(line)) {
      if (!metadata.clearanceReason?.trim()) checks.push(issue(`site-clearance-${line.id}`, 'BLOCKER', 'EVIDENCE', `${line.title} is cleared without a reason.`, 'Record the clearance evidence and reason.'));
      return;
    }
    const amount = calculateCostLineAmount(line, option);
    if (metadata.status === 'TO_BE_ASSESSED' || metadata.status === 'PROVISIONAL' && amount === 0) checks.push(issue(`site-assessment-${line.id}`, 'WARNING', 'COSTS', `${line.title} remains ${amount > 0 ? 'unresolved with an allowance included' : 'unpriced and unresolved'}.`, 'Assess the element, record an allowance, qualify the offer or clear it with evidence.'));
    if (metadata.includeInLandOffer && !metadata.offerQualification?.trim()) checks.push(issue(`site-offer-${line.id}`, 'WARNING', 'EVIDENCE', `${line.title} is flagged for the land offer without a qualification.`, 'Record the cost explanation or unresolved offer condition.'));
    if (metadata.baseOverlapNote?.trim()) checks.push(issue(`site-overlap-${line.id}`, 'WARNING', 'COSTS', `${line.title} has a possible overlap with its base allowance.`, 'Resolve the recorded overlap through an explicit reviewed adjustment.'));
    if (metadata.status !== 'KNOWN' || amount > 0) return;
  }
  if (line.percentageBasis === 'NONE' && !positive(line.amount)) checks.push(issue(`cost-value-${line.id || index}`, 'BLOCKER', 'COSTS', `${line.title || `Cost row ${index + 1}`} has no positive allowance.`, 'Enter a supported cost allowance or remove the row.'));
}

export function buildAppraisalQualityChecks(option: DevelopmentAppraisalOption): AppraisalQualityIssue[] {
  const checks: AppraisalQualityIssue[] = [];
  const programme = option.programme;
  const targetIndex = programme?.startPriceIndex || programme?.appraisalPriceIndex;
  if (option.template === 'RESIDENTIAL_SALES' && !hasUsableIndex(targetIndex)) {
    checks.push(issue('missing-target-index', 'BLOCKER', 'INDICES', 'Expected site-start or appraisal price index is missing.', 'Set the current price index and expected start index in Programme.'));
  }
  if (option.template === 'RESIDENTIAL_SALES' && programme?.appraisalPriceIndex && programme?.startPriceIndex && programme.startPriceIndex < programme.appraisalPriceIndex) {
    checks.push(issue('start-index-before-appraisal-index', 'WARNING', 'INDICES', 'The expected start index is lower than the appraisal index.', 'Confirm the programme and index assumptions before issuing.'));
  }
  (option.houseTypeSchedule || []).forEach((row, rowIndex) => {
    if (!positive(row.quantity)) checks.push(issue(`house-quantity-${row.id || rowIndex}`, 'BLOCKER', 'COSTS', `${row.houseTypeName || `House type ${rowIndex + 1}`} has no construction quantity.`, 'Enter a positive construction quantity or remove the row.'));
    if (!positive(row.gifaM2)) checks.push(issue(`house-area-${row.id || rowIndex}`, 'BLOCKER', 'COSTS', `${row.houseTypeName || `House type ${rowIndex + 1}`} has no GIFA.`, 'Enter the house GIFA.'));
    const includedComponents = (row.costBreakdown || []).filter((component) => component.included !== false && positive(component.amount));
    if (includedComponents.length === 0 && !positive(row.buildCostPerM2)) checks.push(issue(`house-cost-${row.id || rowIndex}`, 'BLOCKER', 'COSTS', `${row.houseTypeName || `House type ${rowIndex + 1}`} has no priced construction basis.`, 'Enter the trade breakdown or a supported base build cost.'));
    includedComponents.forEach((component) => {
      if (!hasUsableIndex(component.priceIndex) && !hasUsableIndex(row.priceIndex)) checks.push(issue(`trade-index-${row.id}-${component.id}`, 'BLOCKER', 'INDICES', `${row.houseTypeName}: ${component.label} has no valid price index.`, 'Set the trade base index before using it in an indexed appraisal.'));
    });
    const saleRows = row.salesRows || [];
    if (positive(row.quantity) && saleRows.length === 0 && !positive(row.saleValuePerUnit) && !positive(row.saleRatePerM2)) checks.push(issue(`house-sale-${row.id || rowIndex}`, 'BLOCKER', 'SALES', `${row.houseTypeName || `House type ${rowIndex + 1}`} has no supported sales assumption.`, 'Enter a sale price or sales rate.'));
  });
  if (option.template === 'RESIDENTIAL_SALES' && (option.siteDimensions || []).some(row => row.libraryRateId === SKIP_WASTE_ROW_IDS.loads)) {
    const waste = skipWasteReview(option);
    const provisionalTypes = waste.houseTypes.filter(row => row.reviewReason && !row.override);
    if (waste.assumptions.centralCollection && provisionalTypes.length > 0) {
      const examples = provisionalTypes.slice(0, 3).map(row => `${row.name} (${row.areaM2} m², ${row.loadsPerDwelling} loads/home)`).join(', ');
      const remainder = provisionalTypes.length > 3 ? ` and ${provisionalTypes.length - 3} more` : '';
      checks.push(issue('skip-waste-size-review', 'WARNING', 'COSTS', `${provisionalTypes.length} house type skip allowance(s) need review because GIFA is missing or exceeds 180 m²: ${examples}${remainder}.`, 'Review the house-type GIFA and set a site-specific loads-per-home allowance where needed.'));
    }
    if (waste.assumptions.centralCollection && waste.assumptions.segregatedCollection && !waste.assumptions.notes?.trim()) checks.push(issue('skip-waste-segregation-evidence', 'WARNING', 'EVIDENCE', 'The segregated skip-waste allowance uses illustrative collection and handling rates.', 'Record the supplier quotation or site-management basis in Prelims assumptions.'));
  }
  option.costLines.forEach((line, index) => checkCostLine(line, index, checks, option));
  option.costLines.filter((line) => line.sourceBillId && line.linkedAbnormalFrozen === false && !isClearedSiteCost(line)).forEach((line) => checks.push(issue(`stale-linked-abnormal-${line.id}`, 'WARNING', 'LIBRARY', `${line.title || 'Linked abnormal schedule'} is not frozen to this appraisal version.`, 'Refresh or freeze the linked abnormal schedule before issue.')));
  const evidence = [option.pricingReport, option.constraintsReport, ...(option.baseMeasurementFiles || []), ...(option.architectFeasibilityLayouts || [])].filter(Boolean);
  evidence.forEach((file, index) => {
    if (file?.integrityStatus === 'MISSING' || file?.integrityStatus === 'CHANGED') checks.push(issue(`evidence-integrity-${file?.id || index}`, 'WARNING', 'EVIDENCE', `${file?.fileName || 'Attached evidence'} is ${file.integrityStatus.toLowerCase()}.`, 'Re-link or review the evidence before issue.'));
  });
  if (option.template === 'COMMERCIAL_INCOME') {
    const assets = getCommercialAssets(option);
    const included = assets.filter((asset) => asset.included);
    if (option.commercialAssessmentStage !== 'PRELIMINARY' && included.length === 0) checks.push(issue('commercial-assets-missing', 'BLOCKER', 'COMMERCIAL', 'No included commercial assets are modelled.', 'Add each confirmed value-bearing asset or retain the appraisal as preliminary.'));
    included.forEach((asset) => {
      const revenues = option.revenueLines.filter((line) => asset.revenueLineIds.includes(line.id));
      const costs = option.costLines.filter((line) => asset.costLineIds.includes(line.id));
      if (revenues.length === 0 || !revenues.some((line) => positive(line.annualRent) || (positive(line.area) && positive(line.rentRate)) || positive(line.manualValue))) checks.push(issue(`commercial-income-${asset.id}`, 'BLOCKER', 'COMMERCIAL', `${asset.title} has no supported income assumption.`, 'Enter a rent, sale value, or other value-bearing revenue line.'));
      if (costs.length === 0 || !costs.some((line) => positive(line.amount))) checks.push(issue(`commercial-cost-${asset.id}`, 'BLOCKER', 'COMMERCIAL', `${asset.title} is unpriced.`, 'Add build, fit-out, acquisition, or other development costs.'));
      if (!positive(asset.exitYieldPercent ?? option.commercialExitYieldPercent)) checks.push(issue(`commercial-yield-${asset.id}`, 'BLOCKER', 'COMMERCIAL', `${asset.title} has no exit yield.`, 'Set an evidence-led exit yield for the asset.'));
      if (!asset.rationale?.trim()) checks.push(issue(`commercial-rationale-${asset.id}`, 'WARNING', 'COMMERCIAL', `${asset.title} has no recorded inclusion rationale.`, 'Record why the asset is included and the basis of its operating model.'));
    });
    getCommercialSiteWideCostLines(option).filter((line) => positive(line.amount) && !line.notes?.trim()).forEach((line) => checks.push(issue(`shared-cost-${line.id}`, 'WARNING', 'COMMERCIAL', `${line.title} is a shared site cost without an allocation note.`, 'Record the allocation basis or confirm it is genuinely site-wide.')));
    assets.filter((asset) => !asset.included && !asset.excludedReason?.trim()).forEach((asset) => checks.push(issue(`excluded-asset-${asset.id}`, 'WARNING', 'COMMERCIAL', `${asset.title} is excluded without a reason.`, 'Record the information required or the reason it is not valued.')));
    if (option.commercialAssessmentStage !== 'PRELIMINARY') {
      if (!positive(option.commercialDiscountRatePercent)) checks.push(issue('commercial-discount-rate', 'BLOCKER', 'COMMERCIAL', 'Commercial discount rate is missing.', 'Set an equity return hurdle before relying on NPV or IRR.'));
      if (option.commercialDebtEnabled !== false) {
        if (!positive(option.commercialLoanToCostPercent)) checks.push(issue('commercial-loan-to-cost', 'BLOCKER', 'COMMERCIAL', 'Commercial loan-to-cost is missing.', 'Set the debt percentage or disable debt funding.'));
        if (!positive(option.commercialMinimumDscr)) checks.push(issue('commercial-dscr-threshold', 'BLOCKER', 'COMMERCIAL', 'Minimum DSCR is missing.', 'Set the lender debt-service cover requirement.'));
      }
      const assurance = calculateCommercialFinancialAssurance(option);
      const base = assurance.base.lifecycle;
      const downside = assurance.scenarios.find((result) => result.scenario.kind === 'DOWNSIDE');
      if (base.irrPercent === undefined) checks.push(issue('commercial-irr-unavailable', 'WARNING', 'COMMERCIAL', 'Commercial IRR cannot be established from the current cashflows.', 'Confirm that the model contains both equity investment and a supported sale or income distribution.'));
      if (base.minimumDscr !== undefined && base.minimumDscr < (option.commercialMinimumDscr || 1.25)) checks.push(issue('commercial-dscr-fail', 'WARNING', 'COMMERCIAL', `Base-case DSCR of ${base.minimumDscr.toFixed(2)}x is below the required cover.`, 'Reduce debt, improve NOI, extend amortisation, or revisit the funding terms.'));
      if (downside?.recommendation === 'DOWNSIDE DOES NOT SUPPORT COMMITMENT') checks.push(issue('commercial-downside-fail', 'WARNING', 'COMMERCIAL', 'The downside case does not support investment commitment.', 'Document mitigation for rent, void, cost, capex, yield and programme exposure before issue.'));
    }
  }
  return checks;
}

export function canIssueAppraisalReport(option: DevelopmentAppraisalOption) {
  return !buildAppraisalQualityChecks(option).some((check) => check.severity === 'BLOCKER');
}
