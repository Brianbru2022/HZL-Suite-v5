import type { CommercialFinancialScenario, DevelopmentAppraisalOption } from '../types';
import { calculateAppraisalOption, calculateCostLines, calculateOptionGdv } from './appraisal';
import { annualIncomeForRevenueLine, getCommercialAssets, getCommercialAssetRevenueLines } from './commercialAssets';

export type CommercialAssetLifecycleValue = { assetId: string; title: string; income: number; operatingCost: number; capitalExpenditure: number; netOperatingIncome: number; assetSaleValue: number };

export type CommercialLifecycleYearRow = {
  year: number; phase: 'DEVELOPMENT' | 'OPERATION'; income: number; operatingCost: number; capitalExpenditure: number; netOperatingIncome: number; developmentCost: number; interest: number; netCashflow: number; cumulativeCashflow: number; assetSaleValue: number; sellingCosts: number; outstandingFunding: number; netSaleEquity: number; profitOnSale: number; returnOnEquityPercent: number; debtDrawdown: number; debtFees: number; principalRepayment: number; debtService: number; dscr?: number; refinanceProceeds: number; refinanceFees: number; equityContribution: number; equityDistribution: number; leveredCashflow: number; assetValues: CommercialAssetLifecycleValue[];
};

export type CommercialLifecycleSummary = {
  rows: CommercialLifecycleYearRow[]; developmentCost: number; startingAnnualIncome: number; breakEvenYear?: number; firstPositiveOperatingIncomeYear?: number; bestExitYear?: number; reachesBreakEven: boolean; maxModelledYear: number; irrPercent?: number; npv: number; equityMultiple?: number; minimumDscr?: number; averageDscr?: number; totalDebtDrawn: number; totalDebtFees: number; totalEquityContributed: number; totalEquityDistributed: number;
};

export type CommercialFinancialScenarioResult = { scenario: CommercialFinancialScenario; lifecycle: CommercialLifecycleSummary; recommendation: string; recommendationDetail: string };
export type CommercialFinancialAssurance = { base: CommercialFinancialScenarioResult; scenarios: CommercialFinancialScenarioResult[] };

type MonthlyCashflow = Omit<CommercialLifecycleYearRow, 'year' | 'phase' | 'cumulativeCashflow' | 'returnOnEquityPercent' | 'assetValues'> & { month: number };

const DEFAULT_SCENARIOS: CommercialFinancialScenario[] = [
  { kind: 'BASE', name: 'Base', rentChangePercent: 0, voidChangePercent: 0, developmentCostChangePercent: 0, lifecycleCapexChangePercent: 0, exitYieldShiftBps: 0, delayMonths: 0 },
  { kind: 'UPSIDE', name: 'Upside', rentChangePercent: 5, voidChangePercent: -2, developmentCostChangePercent: -3, lifecycleCapexChangePercent: -10, exitYieldShiftBps: -25, delayMonths: 0 },
  { kind: 'DOWNSIDE', name: 'Downside', rentChangePercent: -10, voidChangePercent: 5, developmentCostChangePercent: 10, lifecycleCapexChangePercent: 25, exitYieldShiftBps: 75, delayMonths: 6 },
];

function numberValue(value: unknown, fallback = 0) { const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '')); return Number.isFinite(parsed) ? parsed : fallback; }
function nonNegative(value: unknown, fallback = 0) { return Math.max(0, numberValue(value, fallback)); }
function boundedPercent(value: unknown, fallback = 0) { return Math.min(100, nonNegative(value, fallback)); }
function toMonthlyRate(annualPercent: number) { return annualPercent > 0 ? Math.pow(1 + annualPercent / 100, 1 / 12) - 1 : 0; }
function roundFinancialValue(value: number) { return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100; }

export function calculateIrr(cashflows: number[], periodsPerYear = 12): number | undefined {
  if (!cashflows.some((value) => value > 0) || !cashflows.some((value) => value < 0)) return undefined;
  const npv = (rate: number) => cashflows.reduce((total, cashflow, period) => total + cashflow / Math.pow(1 + rate, period), 0);
  const candidates = [-0.99, -0.9, -0.75, -0.5, -0.25, -0.1, -0.05, 0, 0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 4, 8, 16, 32];
  let low = candidates[0]; let lowValue = npv(low); let high: number | undefined;
  for (let index = 1; index < candidates.length; index += 1) { const candidate = candidates[index]; const value = npv(candidate); if (Number.isFinite(lowValue) && Number.isFinite(value) && lowValue * value <= 0) { high = candidate; break; } low = candidate; lowValue = value; }
  if (high === undefined) return undefined;
  for (let iteration = 0; iteration < 160; iteration += 1) {
    const middle = (low + high) / 2; const middleValue = npv(middle);
    if (Math.abs(middleValue) < 0.01) return (Math.pow(1 + middle, periodsPerYear) - 1) * 100;
    if (lowValue * middleValue <= 0) high = middle; else { low = middle; lowValue = middleValue; }
  }
  return (Math.pow(1 + (low + high) / 2, periodsPerYear) - 1) * 100;
}

function calculateNpv(cashflows: number[], annualDiscountRatePercent: number) { const monthlyRate = toMonthlyRate(nonNegative(annualDiscountRatePercent, 10)); return cashflows.reduce((total, cashflow, period) => total + cashflow / Math.pow(1 + monthlyRate, period), 0); }
function scenarioSet(option: DevelopmentAppraisalOption) { const supplied = option.commercialFinancialScenarios || []; return DEFAULT_SCENARIOS.map((fallback) => { const selected = supplied.find((scenario) => scenario.kind === fallback.kind); return { ...fallback, ...selected, kind: fallback.kind, name: selected?.name?.trim() || fallback.name }; }); }

function annualIncomeForScenario(option: DevelopmentAppraisalOption, scenario: CommercialFinancialScenario) {
  const baseIncome = calculateCommercialAnnualIncome(option);
  const potential = option.revenueLines.reduce((total, line) => { const voidPercent = boundedPercent(line.voidPercent); const effective = annualIncomeForRevenueLine(line); return total + (voidPercent < 100 ? effective / (1 - voidPercent / 100) : effective); }, 0);
  const baselineVoid = potential > 0 ? Math.max(0, 1 - baseIncome / potential) : 0;
  const scenarioVoid = Math.min(0.99, Math.max(0, baselineVoid + scenario.voidChangePercent / 100));
  const voidFactor = baselineVoid < 0.99 ? (1 - scenarioVoid) / (1 - baselineVoid) : 1;
  return baseIncome * Math.max(0, 1 + scenario.rentChangePercent / 100) * voidFactor;
}

function annualAssetValues(option: DevelopmentAppraisalOption, yearIndex: number, scenario: CommercialFinancialScenario, operatingPercent: number, revenueGrowth: number, costInflation: number, capexPercent: number, exitYield: number) {
  return getCommercialAssets(option).filter((asset) => asset.included).map((asset) => {
    const baseIncome = getCommercialAssetRevenueLines(option, asset).reduce((total, line) => total + annualIncomeForRevenueLine(line), 0);
    const growth = nonNegative(asset.annualRevenueGrowthPercent, revenueGrowth); const operating = boundedPercent(asset.annualOperatingCostPercent, operatingPercent); const capex = boundedPercent(asset.annualLifecycleCapexPercent, capexPercent); const yieldPercent = Math.max(0.1, nonNegative(asset.exitYieldPercent, exitYield) + scenario.exitYieldShiftBps / 100);
    const income = baseIncome * Math.max(0, 1 + scenario.rentChangePercent / 100) * Math.pow(1 + growth / 100, yearIndex);
    const operatingCost = baseIncome * Math.max(0, 1 + scenario.rentChangePercent / 100) * (operating / 100) * Math.pow(1 + costInflation / 100, yearIndex);
    const capitalExpenditure = baseIncome * Math.max(0, 1 + scenario.rentChangePercent / 100) * (capex / 100) * Math.max(0, 1 + scenario.lifecycleCapexChangePercent / 100) * Math.pow(1 + costInflation / 100, yearIndex);
    const netOperatingIncome = income - operatingCost;
    return { assetId: asset.id, title: asset.title, income, operatingCost, capitalExpenditure, netOperatingIncome, assetSaleValue: Math.max(0, netOperatingIncome) / (yieldPercent / 100) };
  });
}

export function calculateCommercialAnnualIncome(option: Pick<DevelopmentAppraisalOption, 'revenueLines'>): number { return option.revenueLines.reduce((total, line) => total + annualIncomeForRevenueLine(line), 0); }

function calculateScenarioLifecycle(option: DevelopmentAppraisalOption, scenario: CommercialFinancialScenario): CommercialLifecycleSummary {
  const metrics = calculateAppraisalOption(option); const gdv = calculateOptionGdv(option);
  const nonFinanceCost = calculateCostLines(option, gdv).filter(({ line }) => line.category !== 'FINANCE').reduce((total, row) => total + row.amount, 0);
  const landCost = option.calculationMode === 'KNOWN_LAND_PROFIT_ON_GDV' ? nonNegative(option.knownLandValue) : Math.max(0, metrics.landValue);
  const developmentCost = (nonFinanceCost + landCost) * Math.max(0, 1 + scenario.developmentCostChangePercent / 100);
  const constructionMonths = Math.max(1, Math.round(nonNegative(option.durationMonths, 12) + nonNegative(scenario.delayMonths)));
  const totalMonths = Math.min(75 * 12, constructionMonths + Math.max(12, Math.round(nonNegative(option.commercialLifecycleYears, 10))) * 12);
  const annualIncome = annualIncomeForScenario(option, scenario); const operatingPercent = boundedPercent(option.commercialAnnualOperatingCostPercent, 25); const revenueGrowth = nonNegative(option.commercialAnnualRevenueGrowthPercent, 2); const costInflation = nonNegative(option.commercialAnnualCostInflationPercent, 3); const capexPercent = boundedPercent(option.commercialAnnualLifecycleCapexPercent, 1); const exitYield = Math.max(0.1, nonNegative(option.commercialExitYieldPercent, option.revenueLines.find((line) => line.template === 'COMMERCIAL_INCOME')?.yieldPercent || 5.5) + scenario.exitYieldShiftBps / 100); const sellingCostsPercent = boundedPercent(option.commercialSellingCostsPercent, 2);
  const debtEnabled = option.commercialDebtEnabled !== false; const loanToCost = debtEnabled ? boundedPercent(option.commercialLoanToCostPercent, 65) / 100 : 0; const arrangementFeePercent = boundedPercent(option.commercialDebtArrangementFeePercent, 1) / 100; const exitFeePercent = boundedPercent(option.commercialDebtExitFeePercent, 0) / 100; const refinanceYear = Math.round(nonNegative(option.commercialRefinanceYear)); const refinanceLtv = boundedPercent(option.commercialRefinanceLoanToValuePercent, 65) / 100; const refinanceFeePercent = boundedPercent(option.commercialRefinanceFeePercent, 1) / 100; const debtRate = nonNegative(option.financeAnnualRatePercent) / 100; const refinanceRate = nonNegative(option.commercialRefinanceAnnualRatePercent, option.financeAnnualRatePercent) / 100; const amortisationMonths = Math.round(nonNegative(option.commercialDebtAmortisationYears, 25) * 12);
  const monthly: MonthlyCashflow[] = []; const equityCashflows = [0]; let debtBalance = 0; let scheduledMonthlyDebtService = 0; let activeMonthlyRate = debtRate / 12; let totalDebtDrawn = 0; let totalDebtFees = 0; let totalEquityContributed = 0; let totalEquityDistributed = 0; let firstPositiveOperatingIncomeYear: number | undefined; const dscrs: number[] = [];
  for (let month = 1; month <= totalMonths; month += 1) {
    const developmentMonth = month <= constructionMonths; const operationMonth = Math.max(0, month - constructionMonths - 1); const operationYear = Math.floor(operationMonth / 12); const developmentCostForMonth = developmentMonth ? developmentCost / constructionMonths : 0; const debtDrawdown = developmentCostForMonth * loanToCost; const developmentEquity = developmentCostForMonth - debtDrawdown; const debtFee = debtDrawdown * arrangementFeePercent; debtBalance += debtDrawdown; totalDebtDrawn += debtDrawdown; totalDebtFees += debtFee;
    let income = 0; let operatingCost = 0; let capitalExpenditure = 0; let netOperatingIncome = 0;
    if (!developmentMonth) { const assets = annualAssetValues(option, operationYear, scenario, operatingPercent, revenueGrowth, costInflation, capexPercent, exitYield); if (assets.length) { income = assets.reduce((total, asset) => total + asset.income, 0) / 12; operatingCost = assets.reduce((total, asset) => total + asset.operatingCost, 0) / 12; capitalExpenditure = assets.reduce((total, asset) => total + asset.capitalExpenditure, 0) / 12; } else { income = annualIncome * Math.pow(1 + revenueGrowth / 100, operationYear) / 12; operatingCost = annualIncome * (operatingPercent / 100) * Math.pow(1 + costInflation / 100, operationYear) / 12; capitalExpenditure = annualIncome * (capexPercent / 100) * Math.max(0, 1 + scenario.lifecycleCapexChangePercent / 100) * Math.pow(1 + costInflation / 100, operationYear) / 12; } netOperatingIncome = income - operatingCost; if (firstPositiveOperatingIncomeYear === undefined && netOperatingIncome - capitalExpenditure > 0) firstPositiveOperatingIncomeYear = Math.ceil(month / 12); }
    let refinanceProceeds = 0; let refinanceFees = 0;
    if (debtEnabled && refinanceYear > 0 && month === constructionMonths + refinanceYear * 12) { const refinanceValue = Math.max(0, netOperatingIncome * 12) / (exitYield / 100); const newDebt = refinanceValue * refinanceLtv; refinanceProceeds = newDebt - debtBalance; refinanceFees = newDebt * refinanceFeePercent; debtBalance = Math.max(0, newDebt); activeMonthlyRate = refinanceRate / 12; scheduledMonthlyDebtService = amortisationMonths > 0 && activeMonthlyRate > 0 ? debtBalance * activeMonthlyRate / (1 - Math.pow(1 + activeMonthlyRate, -amortisationMonths)) : 0; }
    if (!developmentMonth && debtEnabled && scheduledMonthlyDebtService === 0 && debtBalance > 0 && amortisationMonths > 0) scheduledMonthlyDebtService = activeMonthlyRate > 0 ? debtBalance * activeMonthlyRate / (1 - Math.pow(1 + activeMonthlyRate, -amortisationMonths)) : debtBalance / amortisationMonths;
    const interest = debtBalance * activeMonthlyRate; const principalRepayment = !developmentMonth && scheduledMonthlyDebtService > 0 ? Math.min(debtBalance, Math.max(0, scheduledMonthlyDebtService - interest)) : 0; debtBalance = Math.max(0, debtBalance - principalRepayment); const debtService = interest + principalRepayment; const dscr = !developmentMonth && debtService > 0 ? (netOperatingIncome - capitalExpenditure) / debtService : undefined; if (dscr !== undefined && Number.isFinite(dscr)) dscrs.push(dscr);
    const equityContribution = developmentEquity + debtFee + (developmentMonth ? interest : 0) + refinanceFees; const equityDistribution = !developmentMonth ? netOperatingIncome - capitalExpenditure - debtService + refinanceProceeds : 0; const leveredCashflow = equityDistribution - equityContribution; const netCashflow = netOperatingIncome - capitalExpenditure - developmentCostForMonth - interest - debtFee; totalEquityContributed += equityContribution; totalEquityDistributed += Math.max(0, equityDistribution); equityCashflows.push(leveredCashflow);
    monthly.push({ month, income, operatingCost, capitalExpenditure, netOperatingIncome, developmentCost: developmentCostForMonth, interest, netCashflow, assetSaleValue: 0, sellingCosts: 0, outstandingFunding: debtBalance, netSaleEquity: 0, profitOnSale: 0, debtDrawdown, debtFees: debtFee, principalRepayment, debtService, dscr, refinanceProceeds, refinanceFees, equityContribution, equityDistribution, leveredCashflow });
  }
  const rows: CommercialLifecycleYearRow[] = []; let bestExitYear: number | undefined; let bestProfitOnSale = Number.NEGATIVE_INFINITY; let cumulativeCashflow = 0; let breakEvenYear: number | undefined;
  for (let start = 0; start < monthly.length; start += 12) {
    const slice = monthly.slice(start, start + 12); const last = slice[slice.length - 1]; const year = Math.floor(start / 12) + 1; const phase = last.month <= constructionMonths ? 'DEVELOPMENT' : 'OPERATION'; const sum = (key: keyof MonthlyCashflow) => slice.reduce((total, entry) => total + (typeof entry[key] === 'number' ? entry[key] as number : 0), 0); const operationYear = Math.max(0, Math.floor((last.month - constructionMonths - 1) / 12)); const assetValues = phase === 'OPERATION' ? annualAssetValues(option, operationYear, scenario, operatingPercent, revenueGrowth, costInflation, capexPercent, exitYield) : []; const assetSaleValue = phase === 'OPERATION' ? (assetValues.reduce((total, asset) => total + asset.assetSaleValue, 0) || Math.max(0, sum('netOperatingIncome')) / (exitYield / 100)) : 0; const sellingCosts = assetSaleValue * (sellingCostsPercent / 100); const exitFee = last.outstandingFunding * exitFeePercent; const netSaleEquity = Math.max(0, assetSaleValue - sellingCosts - exitFee - last.outstandingFunding); const exitCashflows = equityCashflows.slice(0, Math.min(equityCashflows.length, start + slice.length + 1)); exitCashflows[exitCashflows.length - 1] += netSaleEquity; const returnOnEquityPercent = calculateIrr(exitCashflows) || 0; cumulativeCashflow += sum('netCashflow'); const profitOnSale = cumulativeCashflow + assetSaleValue - sellingCosts - exitFee - last.outstandingFunding; if (phase === 'OPERATION' && profitOnSale > bestProfitOnSale) { bestProfitOnSale = profitOnSale; bestExitYear = year; } if (breakEvenYear === undefined && cumulativeCashflow >= 0) breakEvenYear = year;
    const yearlyDscrs = slice.flatMap((entry) => entry.dscr === undefined ? [] : [entry.dscr]); rows.push({ year, phase, income: sum('income'), operatingCost: sum('operatingCost'), capitalExpenditure: sum('capitalExpenditure'), netOperatingIncome: sum('netOperatingIncome'), developmentCost: sum('developmentCost'), interest: sum('interest'), netCashflow: sum('netCashflow'), cumulativeCashflow, assetSaleValue, sellingCosts, outstandingFunding: last.outstandingFunding, netSaleEquity, profitOnSale, returnOnEquityPercent, debtDrawdown: sum('debtDrawdown'), debtFees: sum('debtFees'), principalRepayment: sum('principalRepayment'), debtService: sum('debtService'), dscr: yearlyDscrs.length ? yearlyDscrs.reduce((total, value) => total + value, 0) / yearlyDscrs.length : undefined, refinanceProceeds: sum('refinanceProceeds'), refinanceFees: sum('refinanceFees'), equityContribution: sum('equityContribution'), equityDistribution: sum('equityDistribution'), leveredCashflow: sum('leveredCashflow'), assetValues });
  }
  const preferredExit = rows.find((row) => row.year === bestExitYear); const preferredCashflows = preferredExit ? equityCashflows.slice(0, Math.min(equityCashflows.length, preferredExit.year * 12 + 1)) : equityCashflows.slice(); if (preferredExit) preferredCashflows[preferredCashflows.length - 1] += preferredExit.netSaleEquity;
  return { rows, developmentCost: roundFinancialValue(developmentCost), startingAnnualIncome: roundFinancialValue(annualIncome), breakEvenYear, firstPositiveOperatingIncomeYear, bestExitYear, reachesBreakEven: breakEvenYear !== undefined, maxModelledYear: Math.ceil(totalMonths / 12), irrPercent: calculateIrr(preferredCashflows), npv: roundFinancialValue(calculateNpv(preferredCashflows, nonNegative(option.commercialDiscountRatePercent, 10))), equityMultiple: totalEquityContributed > 0 ? (totalEquityDistributed + (preferredExit?.netSaleEquity || 0)) / totalEquityContributed : undefined, minimumDscr: dscrs.length ? Math.min(...dscrs) : undefined, averageDscr: dscrs.length ? dscrs.reduce((total, value) => total + value, 0) / dscrs.length : undefined, totalDebtDrawn: roundFinancialValue(totalDebtDrawn), totalDebtFees: roundFinancialValue(totalDebtFees), totalEquityContributed: roundFinancialValue(totalEquityContributed), totalEquityDistributed: roundFinancialValue(totalEquityDistributed) };
}

function recommendationFor(lifecycle: CommercialLifecycleSummary, option: DevelopmentAppraisalOption, scenario: CommercialFinancialScenario) {
  const hurdle = nonNegative(option.commercialDiscountRatePercent, 10); const requiredDscr = nonNegative(option.commercialMinimumDscr, 1.25);
  if (!lifecycle.bestExitYear || lifecycle.npv <= 0 || (lifecycle.irrPercent ?? -Infinity) < hurdle || (lifecycle.minimumDscr !== undefined && lifecycle.minimumDscr < requiredDscr)) return { recommendation: scenario.kind === 'DOWNSIDE' ? 'DOWNSIDE DOES NOT SUPPORT COMMITMENT' : 'DO NOT PROCEED ON CURRENT BASIS', recommendationDetail: `The ${scenario.name.toLowerCase()} case does not clear the required return or debt-service cover. Resolve income, cost, yield, funding or programme risks before committing capital.` };
  return { recommendation: `HOLD TO YEAR ${lifecycle.bestExitYear}, THEN REVIEW EXIT`, recommendationDetail: `The ${scenario.name.toLowerCase()} case clears the return and debt-service thresholds. Review sale or refinancing in year ${lifecycle.bestExitYear} against current market evidence rather than assuming a later exit is automatically stronger.` };
}

export function calculateCommercialFinancialAssurance(option: DevelopmentAppraisalOption): CommercialFinancialAssurance { if (option.frozenCommercialAssurance) return option.frozenCommercialAssurance; const scenarios = scenarioSet(option).map((scenario) => { const lifecycle = calculateScenarioLifecycle(option, scenario); return { scenario, lifecycle, ...recommendationFor(lifecycle, option, scenario) }; }); const base = scenarios.find((result) => result.scenario.kind === 'BASE') || scenarios[0]; return { base, scenarios }; }

/** Compatibility entry point for lifecycle reports. It now returns the base financial-assurance case. */
export function calculateCommercialLifecycle(option: DevelopmentAppraisalOption): CommercialLifecycleSummary { return calculateCommercialFinancialAssurance(option).base.lifecycle; }
