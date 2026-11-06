import { INFRASTRUCTURE_PRELIMS_ID } from './appraisalInfrastructureBill';
import { siteCostSummary, isAbnormalRemovalRow, isActiveSiteSourceRow } from './appraisalSiteCosts';
import type {
  AppraisalCostLine,
  AppraisalHouseTypeCostComponent,
  AppraisalHouseTypeScheduleRow,
  AppraisalSiteDimensionRow,
  DevelopmentAppraisal,
  DevelopmentAppraisalOption,
  Project,
  TradePackage,
} from '../types';
import {
  calculateAppraisalOption,
  calculateCostLineAmount,
  calculateCustomCostProvisionTotal,
  calculateGdvIncentiveCost,
  calculateHouseBuildingOverheadCost,
  calculateHouseTypeConstructionTotal,
  calculateHouseTypeStartPriceIndexContingency,
  calculateLandLbtt,
  calculateSiteDimensionStartPriceIndexContingency,
  calculateSiteDimensionTotal,
} from './appraisal';
import {
  AWD_INFRASTRUCTURE_RATE_PACK_PREFIX,
  AWD_PLOT_WORKS_RATE_PACK_PREFIX,
  AWD_PRELIMS_RATE_PACK_PREFIX,
} from './appraisalInfrastructureRatePacks';
import { generateId } from './generateId';

export type AppraisalTradePackageBudgetSourceKind =
  | 'HOUSE_COMPONENT'
  | 'HOUSE_UNALLOCATED'
  | 'INFRASTRUCTURE'
  | 'PLOT_WORKS';

export interface AppraisalTradePackageBudgetSource {
  id: string;
  kind: AppraisalTradePackageBudgetSourceKind;
  packageName: string;
  label: string;
  houseTypeName?: string;
  quantity?: number;
  baseAmount: number;
  indexUplift: number;
  siteStartAmount: number;
  baseIndex?: number;
  mapping?: string;
}

export interface AppraisalTradePackageBudget {
  id: string;
  name: string;
  baseAmount: number;
  indexUplift: number;
  siteStartAmount: number;
  sources: AppraisalTradePackageBudgetSource[];
}

export interface AppraisalTradePackageAllowance {
  id: string;
  label: string;
  amount: number;
}

export interface AppraisalTradePackageBudgetReport {
  packages: AppraisalTradePackageBudget[];
  allowances: AppraisalTradePackageAllowance[];
  packageTotal: number;
  allowanceTotal: number;
  mappingCount: number;
  warnings: string[];
  expectedStartDate?: string;
  startPriceIndex?: number;
}

export interface AppraisalTradePackageBudgetPushResult {
  project: Project;
  trades: TradePackage[];
  createdTradeNames: string[];
  updatedTradeNames: string[];
}

const STANDARD_COMPONENT_AMOUNTS: Partial<Record<AppraisalHouseTypeCostComponent['key'], number>> = {
  EV_CHARGERS: 1000,
  AIR_SOURCE_HEAT_PUMPS: 4000,
};

function positive(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function hasUsableComponentBreakdown(row: AppraisalHouseTypeScheduleRow) {
  return (row.costBreakdown || []).some((component) => (
    component.included !== false
    && Math.abs(positive(component.amount) - (STANDARD_COMPONENT_AMOUNTS[component.key] || 0)) > 0.5
  ));
}

function indexedAmount(baseAmount: number, baseIndex: unknown, startIndex: unknown) {
  const base = positive(baseAmount);
  const validBaseIndex = positive(baseIndex);
  const validStartIndex = positive(startIndex);
  if (base <= 0 || validBaseIndex <= 0 || validStartIndex <= validBaseIndex) return base;
  return base * (validStartIndex / validBaseIndex);
}

function houseComponentPackageName(component: AppraisalHouseTypeCostComponent) {
  if (component.key === 'GROUNDWORK') return 'Groundworks';
  return component.key === 'EV_CHARGERS' ? 'EV' : component.label.trim() || 'House construction - unallocated';
}

function sourceSection(row: AppraisalSiteDimensionRow): 'INFRASTRUCTURE' | 'PLOT_WORKS' | 'PRELIMS' {
  const rateId = row.libraryRateId || '';
  if (rateId.startsWith(`${AWD_PRELIMS_RATE_PACK_PREFIX}-`) || row.sourceRow === 'PRELIMS_CUSTOM' || row.sourceRow === 'PRELIMS_LIBRARY') return 'PRELIMS';
  if (rateId.startsWith(`${AWD_PLOT_WORKS_RATE_PACK_PREFIX}-`) || row.sourceRow === 'PLOT_WORKS_CUSTOM' || row.sourceRow === 'PLOT_WORKS_LIBRARY') return 'PLOT_WORKS';
  return 'INFRASTRUCTURE';
}

function infrastructurePackageName(row: AppraisalSiteDimensionRow) {
  const identity = `${row.libraryRateId || ''} ${row.label || ''} ${row.sourceRow || ''}`.toLowerCase();
  if (identity.includes('ev-charging') || identity.includes('ev charging')) return 'EV';
  if (identity.includes('garden-walls-groundwork') || identity.includes('garden walls groundwork')) return 'Groundworks';
  if (identity.includes('garden-walls') || identity.includes('garden walls')) return 'Labour only brickwork';
  if (identity.includes('fencing')) return 'Fencing';
  if (identity.includes('tar-surfacing') || identity.includes('tar surfacing')) return 'Surfacing';
  if (identity.includes('street-lighting') || identity.includes('street lighting')) return 'Street lighting';
  return 'Groundworks';
}

function appendAllowance(
  allowances: AppraisalTradePackageAllowance[],
  id: string,
  label: string,
  amount: number,
) {
  if (amount > 0.005) allowances.push({ id, label, amount });
}

function abnormalAmount(line: AppraisalCostLine, option: DevelopmentAppraisalOption) {
  return calculateCostLineAmount(line, option);
}

/**
 * Builds a procurement-only view of the current house-building appraisal. It is
 * deliberately report-only: no calculation from this helper is fed back into
 * the appraisal cost summary or contingency.
 */
export function buildAppraisalTradePackageBudget(
  option: DevelopmentAppraisalOption,
): AppraisalTradePackageBudgetReport {
  const packageMap = new Map<string, AppraisalTradePackageBudget>();
  const warnings: string[] = [];
  const startIndex = positive(option.programme?.startPriceIndex);

  const addSource = (source: AppraisalTradePackageBudgetSource) => {
    if (source.siteStartAmount <= 0.005) return;
    const key = source.packageName.trim().toLocaleLowerCase();
    const existing = packageMap.get(key);
    if (existing) {
      existing.baseAmount += source.baseAmount;
      existing.indexUplift += source.indexUplift;
      existing.siteStartAmount += source.siteStartAmount;
      existing.sources.push(source);
      return;
    }
    packageMap.set(key, {
      id: `appraisal-trade-${key.replace(/[^a-z0-9]+/g, '-')}`,
      name: source.packageName,
      baseAmount: source.baseAmount,
      indexUplift: source.indexUplift,
      siteStartAmount: source.siteStartAmount,
      sources: [source],
    });
  };

  (option.houseTypeSchedule || []).forEach((row) => {
    const quantity = positive(row.quantity);
    if (quantity <= 0) return;
    if (!hasUsableComponentBreakdown(row)) {
      const baseAmount = calculateHouseTypeConstructionTotal(row);
      const indexUplift = calculateHouseTypeStartPriceIndexContingency(row, option.programme);
      if (baseAmount > 0) {
        addSource({
          id: `house-unallocated-${row.id}`,
          kind: 'HOUSE_UNALLOCATED',
          packageName: 'House construction - unallocated',
          label: row.houseTypeName || 'House type',
          houseTypeName: row.houseTypeName,
          quantity,
          baseAmount,
          indexUplift,
          siteStartAmount: baseAmount + indexUplift,
          baseIndex: positive(row.priceIndex),
          mapping: 'Legacy house type without a usable component build-up',
        });
        warnings.push(`${row.houseTypeName || 'House type'} has no usable component build-up and remains unallocated.`);
      }
      return;
    }

    (row.costBreakdown || []).forEach((component) => {
      if (component.included === false || positive(component.amount) <= 0) return;
      const baseAmount = positive(component.amount) * quantity;
      const baseIndex = positive(component.priceIndex) || positive(row.priceIndex);
      const siteStartAmount = indexedAmount(baseAmount, baseIndex, startIndex);
      if (startIndex > 0 && baseIndex <= 0) {
        warnings.push(`${row.houseTypeName || 'House type'} / ${component.label || component.key} has no base index; no site-start uplift was applied.`);
      }
      addSource({
        id: `house-component-${row.id}-${component.id || component.key}`,
        kind: 'HOUSE_COMPONENT',
        packageName: houseComponentPackageName(component),
        label: component.label || component.key,
        houseTypeName: row.houseTypeName,
        quantity,
        baseAmount,
        indexUplift: siteStartAmount - baseAmount,
        siteStartAmount,
        baseIndex: baseIndex || undefined,
        mapping: component.key === 'EV_CHARGERS' ? 'House EV chargers mapped to EV' : 'House component trade',
      });
    });
  });

  const allowances: AppraisalTradePackageAllowance[] = [];
  (option.siteDimensions || []).forEach((row) => {
    if (row.isCostDriverInput || !isActiveSiteSourceRow(row, option)) return;
    if (row.libraryRateId === INFRASTRUCTURE_PRELIMS_ID) {
      appendAllowance(allowances, `infrastructure-prelims-${row.id}`, 'Infrastructure preliminaries (4%)', calculateSiteDimensionTotal(row, option) + calculateSiteDimensionStartPriceIndexContingency(row, option));
      return;
    }
    if (isAbnormalRemovalRow(row)) {
      appendAllowance(allowances, `removal-index-${row.id}`, `${row.label} price-index contingency`, calculateSiteDimensionStartPriceIndexContingency(row, option));
      return;
    }
    const section = sourceSection(row);
    const baseAmount = calculateSiteDimensionTotal(row, option);
    const indexUplift = calculateSiteDimensionStartPriceIndexContingency(row, option);
    const siteStartAmount = baseAmount + indexUplift;
    if (section === 'PRELIMS') {
      appendAllowance(allowances, `prelims-${row.id}`, row.label || 'Preliminaries', siteStartAmount);
      return;
    }
    if (siteStartAmount <= 0.005) return;
    const packageName = section === 'PLOT_WORKS' ? 'Groundworks' : infrastructurePackageName(row);
    const baseIndex = positive(row.priceIndex);
    if (startIndex > 0 && baseIndex <= 0) {
      warnings.push(`${row.label || 'Site rate'} has no base index; no site-start uplift was applied.`);
    }
    addSource({
      id: `site-rate-${row.id}`,
      kind: section === 'PLOT_WORKS' ? 'PLOT_WORKS' : 'INFRASTRUCTURE',
      packageName,
      label: row.label || 'Site rate',
      baseAmount,
      indexUplift,
      siteStartAmount,
      baseIndex: baseIndex || undefined,
      mapping: section === 'PLOT_WORKS'
        ? 'Plot works mapped to Groundworks'
        : `${row.label || 'Infrastructure'} mapped to ${packageName}`,
    });
  });

  const metrics = calculateAppraisalOption(option);
  const siteCosts = siteCostSummary(option, line => abnormalAmount(line, option));
  appendAllowance(allowances, 'abnormals', 'Abnormals base allowance', siteCosts.abnormalBase);
  for (const [allocation, total] of Object.entries(siteCosts.additions)) {
    appendAllowance(allowances, `site-additions-${allocation}`, `${allocation === 'PLOT_WORKS' ? 'Plot works' : allocation === 'INFRASTRUCTURE' ? 'Infrastructure' : allocation === 'SITE_SPECIFIC' ? 'Site-specific works' : 'Abnormals'} additional elements`, total);
  }
  appendAllowance(allowances, 'custom-cost', 'Custom cost provisions', calculateCustomCostProvisionTotal(option));
  appendAllowance(allowances, 'private-sales-incentive', 'Private sales incentive', calculateGdvIncentiveCost(option, metrics.gdv));
  appendAllowance(allowances, 'overheads', 'Overheads', calculateHouseBuildingOverheadCost(option));
  appendAllowance(allowances, 'finance', 'Finance', metrics.financeCost);
  appendAllowance(allowances, 'lbtt', 'LBTT', calculateLandLbtt(metrics.landValue));

  const packages = Array.from(packageMap.values())
    .map((entry) => ({
      ...entry,
      baseAmount: Math.round(entry.baseAmount * 100) / 100,
      indexUplift: Math.round(entry.indexUplift * 100) / 100,
      siteStartAmount: Math.round(entry.siteStartAmount * 100) / 100,
      sources: entry.sources.sort((left, right) => left.label.localeCompare(right.label)),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    packages,
    allowances,
    packageTotal: packages.reduce((total, entry) => total + entry.siteStartAmount, 0),
    allowanceTotal: allowances.reduce((total, entry) => total + entry.amount, 0),
    mappingCount: packages.reduce((total, entry) => total + entry.sources.length, 0),
    warnings: Array.from(new Set(warnings)),
    expectedStartDate: option.programme?.expectedStartDate,
    startPriceIndex: startIndex || undefined,
  };
}

export function buildAppraisalTradePackageBudgetSourceSignature(
  option: DevelopmentAppraisalOption,
) {
  const report = buildAppraisalTradePackageBudget(option);
  return JSON.stringify({
    optionId: option.id,
    startDate: report.expectedStartDate || '',
    startIndex: report.startPriceIndex || 0,
    packages: report.packages.map((entry) => [entry.name, entry.siteStartAmount]),
    allowances: report.allowances.map((entry) => [entry.label, entry.amount]),
  });
}

/** Applies confirmed package budgets without altering bills, tender returns, or contractor data. */
export function applyAppraisalTradePackageBudgetsToEstimate({
  appraisal,
  option,
  report = buildAppraisalTradePackageBudget(option),
  project,
  trades,
  generatedAt = new Date().toISOString(),
}: {
  appraisal: Pick<DevelopmentAppraisal, 'id' | 'reference'>;
  option: DevelopmentAppraisalOption;
  report?: AppraisalTradePackageBudgetReport;
  project: Project;
  trades: TradePackage[];
  generatedAt?: string;
}): AppraisalTradePackageBudgetPushResult {
  const nextTrades = trades.map((trade) => ({ ...trade, contractors: [...trade.contractors] }));
  const tradeByName = new Map(nextTrades.map((trade) => [trade.name.trim().toLocaleLowerCase(), trade]));
  const createdTradeNames: string[] = [];
  const updatedTradeNames: string[] = [];
  const tenderTradeStatus = { ...(project.tenderTradeStatus || {}) };
  const sourceSignature = buildAppraisalTradePackageBudgetSourceSignature(option);

  report.packages.forEach((budget) => {
    const key = budget.name.trim().toLocaleLowerCase();
    let trade = tradeByName.get(key);
    if (!trade) {
      trade = { id: generateId(), name: budget.name, contractors: [] };
      nextTrades.push(trade);
      tradeByName.set(key, trade);
      createdTradeNames.push(trade.name);
    }
    tenderTradeStatus[trade.id] = {
      ...(tenderTradeStatus[trade.id] || {}),
      budgetValue: budget.siteStartAmount,
      appraisalBudgetSource: {
        appraisalId: appraisal.id,
        appraisalReference: appraisal.reference || '',
        optionId: option.id,
        generatedAt,
        sourceSignature,
      },
    };
    updatedTradeNames.push(trade.name);
  });

  return {
    project: { ...project, tenderTradeStatus, updatedAt: generatedAt },
    trades: nextTrades,
    createdTradeNames,
    updatedTradeNames,
  };
}
