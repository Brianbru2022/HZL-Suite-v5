import type { DevelopmentAppraisalOption } from '../types';
import { calculateCommercialAssetAnnualIncome, calculateCommercialAssetDevelopmentCost, getCommercialAssets, getCommercialSiteWideCostLines } from './commercialAssets';
import { buildCommercialAssessmentEvidence } from './commercialAssessmentEvidence';
import { calculateCommercialFinancialAssurance, calculateCommercialLifecycle } from './commercialLifecycle';

export type CommercialExitStrategy = {
  label: string;
  summary: string;
  bestProfitYear?: number;
  bestReturnYear?: number;
  bestProfit: number;
  bestReturnOnEquityPercent: number;
  irrPercent?: number;
  npv: number;
  equityMultiple?: number;
  minimumDscr?: number;
  downsideSupported: boolean;
};

export function buildCommercialExitStrategy(option: DevelopmentAppraisalOption): CommercialExitStrategy {
  const assurance = calculateCommercialFinancialAssurance(option);
  const lifecycle = assurance.base.lifecycle;
  const downside = assurance.scenarios.find((result) => result.scenario.kind === 'DOWNSIDE');
  const exitRows = lifecycle.rows.filter((row) => row.phase === 'OPERATION' && row.assetSaleValue > 0);
  const bestProfitRow = exitRows.reduce<typeof exitRows[number] | undefined>((best, row) => !best || row.profitOnSale > best.profitOnSale ? row : best, undefined);
  const bestReturnRow = exitRows.reduce<typeof exitRows[number] | undefined>((best, row) => !best || row.returnOnEquityPercent > best.returnOnEquityPercent ? row : best, undefined);
  if (!bestProfitRow || bestProfitRow.profitOnSale <= 0) {
    return {
      label: 'DO NOT PROCEED ON CURRENT BASIS',
      summary: 'The model does not produce a positive profit after an assumed sale in any operating year. Rework the development cost, land basis, income, yield or operating assumptions before committing capital.',
      bestProfit: bestProfitRow?.profitOnSale || 0,
      bestReturnOnEquityPercent: bestReturnRow?.returnOnEquityPercent || 0,
      irrPercent: lifecycle.irrPercent,
      npv: lifecycle.npv,
      equityMultiple: lifecycle.equityMultiple,
      minimumDscr: lifecycle.minimumDscr,
      downsideSupported: downside?.recommendation !== 'DOWNSIDE DOES NOT SUPPORT COMMITMENT',
    };
  }
  const earlyProfitRow = exitRows.find((row) => row.profitOnSale >= bestProfitRow.profitOnSale * 0.9);
  const preferredYear = earlyProfitRow?.year || bestProfitRow.year;
  const downsideSupported = downside?.recommendation !== 'DOWNSIDE DOES NOT SUPPORT COMMITMENT';
  const returnIsWeak = (lifecycle.irrPercent || 0) < (option.commercialDiscountRatePercent || 10) || lifecycle.npv <= 0;
  return {
    label: !downsideSupported ? `BASE CASE ONLY: REVIEW EXIT IN YEAR ${preferredYear}` : returnIsWeak ? `CONSIDER EXIT IN YEAR ${preferredYear}` : `HOLD TO YEAR ${preferredYear}, THEN REVIEW EXIT`,
    summary: returnIsWeak
      ? `The strongest sale profit is reached around year ${bestProfitRow.year}, but the model does not clear its equity return hurdle. Treat year ${preferredYear} as a review point and rework income, cost, funding or yield before commitment.`
      : downsideSupported
        ? `The base and downside cases support the investment thresholds. Hold through stabilisation, then review an exit against the year-by-year sale table rather than assuming that the latest year is automatically best.`
        : `The base case is positive, but the downside case does not clear the return or debt-service threshold. Do not rely on the headline result without mitigating rent, yield, cost and programme risk.`,
    bestProfitYear: bestProfitRow.year,
    bestReturnYear: bestReturnRow?.year,
    bestProfit: bestProfitRow.profitOnSale,
    bestReturnOnEquityPercent: bestReturnRow?.returnOnEquityPercent || 0,
    irrPercent: lifecycle.irrPercent,
    npv: lifecycle.npv,
    equityMultiple: lifecycle.equityMultiple,
    minimumDscr: lifecycle.minimumDscr,
    downsideSupported,
  };
}

export function buildCommercialInvestmentReportContext(option: DevelopmentAppraisalOption) {
  const lifecycle = calculateCommercialLifecycle(option);
  const assurance = calculateCommercialFinancialAssurance(option);
  const strategy = buildCommercialExitStrategy(option);
  const assets = getCommercialAssets(option).map((asset) => ({
    title: asset.title,
    included: asset.included,
    revenueModel: asset.revenueModel,
    siteAllocationM2: asset.siteAllocationM2 || 0,
    developmentCost: calculateCommercialAssetDevelopmentCost(option, asset),
    startingAnnualIncome: calculateCommercialAssetAnnualIncome(option, asset),
    operatingCostPercent: asset.annualOperatingCostPercent ?? option.commercialAnnualOperatingCostPercent ?? 0,
    lifecycleCapexPercent: asset.annualLifecycleCapexPercent ?? option.commercialAnnualLifecycleCapexPercent ?? 0,
    exitYieldPercent: asset.exitYieldPercent ?? option.commercialExitYieldPercent ?? 0,
    rationale: asset.rationale || '',
    excludedReason: asset.excludedReason || '',
  }));
  return {
    location: option.commercialLocation || '',
    siteScope: option.commercialScopeAssessment?.summary || '',
    templateId: option.commercialTemplateId || '',
    revenueAssessment: option.commercialRevenueAssessment?.summary || '',
    lifecycleAssessment: option.commercialLifecycleAssessment?.summary || '',
    assessmentEvidence: buildCommercialAssessmentEvidence(option.commercialInitialAssessmentBriefs),
    assets,
    siteWideCosts: getCommercialSiteWideCostLines(option).map((line) => ({ title: line.title, amount: line.amount, notes: line.notes || '' })),
    assumptions: {
      landValue: option.knownLandValue || 0,
      operatingCostPercent: option.commercialAnnualOperatingCostPercent || 0,
      revenueGrowthPercent: option.commercialAnnualRevenueGrowthPercent || 0,
      costInflationPercent: option.commercialAnnualCostInflationPercent || 0,
      lifecycleCapexPercent: option.commercialAnnualLifecycleCapexPercent || 0,
      exitYieldPercent: option.commercialExitYieldPercent || 0,
      sellingCostsPercent: option.commercialSellingCostsPercent || 0,
      financeAnnualRatePercent: option.financeAnnualRatePercent || 0,
      loanToCostPercent: option.commercialLoanToCostPercent || 0,
      debtArrangementFeePercent: option.commercialDebtArrangementFeePercent || 0,
      debtAmortisationYears: option.commercialDebtAmortisationYears || 0,
      minimumDscr: option.commercialMinimumDscr || 0,
      discountRatePercent: option.commercialDiscountRatePercent || 0,
    },
    strategy,
    lifecycle: lifecycle.rows.map((row) => ({
      year: row.year,
      phase: row.phase,
      income: row.income,
      netOperatingIncome: row.netOperatingIncome,
      capitalExpenditure: row.capitalExpenditure,
      interest: row.interest,
      cumulativeCashflow: row.cumulativeCashflow,
      assetSaleValue: row.assetSaleValue,
      sellingCosts: row.sellingCosts,
      outstandingFunding: row.outstandingFunding,
      netSaleEquity: row.netSaleEquity,
      profitOnSale: row.profitOnSale,
      returnOnEquityPercent: row.returnOnEquityPercent,
      debtDrawdown: row.debtDrawdown,
      debtFees: row.debtFees,
      principalRepayment: row.principalRepayment,
      debtService: row.debtService,
      dscr: row.dscr,
      refinanceProceeds: row.refinanceProceeds,
      refinanceFees: row.refinanceFees,
      equityContribution: row.equityContribution,
      equityDistribution: row.equityDistribution,
      leveredCashflow: row.leveredCashflow,
      assets: row.assetValues,
    })),
    scenarios: assurance.scenarios.map((result) => ({
      name: result.scenario.name,
      kind: result.scenario.kind,
      rentChangePercent: result.scenario.rentChangePercent,
      voidChangePercent: result.scenario.voidChangePercent,
      developmentCostChangePercent: result.scenario.developmentCostChangePercent,
      lifecycleCapexChangePercent: result.scenario.lifecycleCapexChangePercent,
      exitYieldShiftBps: result.scenario.exitYieldShiftBps,
      delayMonths: result.scenario.delayMonths,
      irrPercent: result.lifecycle.irrPercent,
      npv: result.lifecycle.npv,
      equityMultiple: result.lifecycle.equityMultiple,
      minimumDscr: result.lifecycle.minimumDscr,
      bestExitYear: result.lifecycle.bestExitYear,
      recommendation: result.recommendation,
      recommendationDetail: result.recommendationDetail,
    })),
  };
}

export function buildFallbackCommercialInvestmentReport(option: DevelopmentAppraisalOption) {
  const context = buildCommercialInvestmentReportContext(option);
  const strategy = context.strategy;
  const scope = context.siteScope || 'The commercial scope remains subject to confirmation against the entered site area, access, servicing and planning constraints.';
  const includedAssets = context.assets.filter((asset) => asset.included);
  const assetNarrative = includedAssets.length
    ? includedAssets.map((asset) => `${asset.title} is assessed as a ${asset.revenueModel.toLowerCase().replace(/_/g, ' ')} use with starting annual income of £${Math.round(asset.startingAnnualIncome).toLocaleString()} and an exit yield of ${asset.exitYieldPercent.toFixed(2)}%.`).join(' ')
    : 'No income-producing commercial assets have been included in the current assessment.';
  const bestProfitText = strategy.bestProfitYear ? `The highest modeled profit on sale is £${Math.round(strategy.bestProfit).toLocaleString()} in year ${strategy.bestProfitYear}.` : 'No positive sale-profit year is currently modeled.';
  const scenarioNarrative = context.scenarios.map((scenario) => `${scenario.name}: ${scenario.irrPercent === undefined ? 'IRR not established' : `${scenario.irrPercent.toFixed(1)}% IRR`}, £${Math.round(scenario.npv).toLocaleString()} NPV, ${scenario.minimumDscr === undefined ? 'no debt-service cover' : `${scenario.minimumDscr.toFixed(2)}x minimum DSCR`}. ${scenario.recommendation}.`).join(' ');
  return `Overview\n${scope}\n\nSite scope and proposed mix\n${assetNarrative}\n\nLifecycle costs, funding and returns\nThe appraisal models monthly development cashflows, debt drawdowns, funding fees, interest, amortisation, refinancing, operating income, lifecycle capital reserve and annual sale positions based on each asset's net operating income capitalised at its selected exit yield. ${bestProfitText}\n\nBase, upside and downside cases\n${scenarioNarrative}\n\nExit strategy\n${strategy.summary}\n\nRecommendation\n${strategy.label}. This investment assessment should be tested against operational terms, planning, servicing, capital expenditure requirements and current investment-market yields before commitment.`;
}
