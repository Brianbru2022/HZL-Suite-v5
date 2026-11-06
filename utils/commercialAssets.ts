import { isClearedSiteCost } from './appraisalSiteCosts';
import type {
  AppraisalCostCategory,
  AppraisalCostLine,
  AppraisalRevenueLine,
  CommercialAsset,
  CommercialAssetRevenueModel,
  DevelopmentAppraisalOption,
} from '../types';
import { generateId } from './generateId';

const now = () => new Date().toISOString();

export type CommercialAssetAssessmentRow = {
  id?: string;
  title: string;
  description?: string;
  included?: boolean;
  revenueModel?: CommercialAssetRevenueModel;
  siteAllocationM2?: number;
  annualIncome?: number;
  operatingCostPercent?: number;
  revenueGrowthPercent?: number;
  lifecycleCapexPercent?: number;
  exitYieldPercent?: number;
  sellingCostsPercent?: number;
  developmentCost?: number;
  costTitle?: string;
  rationale?: string;
  excludedReason?: string;
};

export type CommercialSiteWideCostAssessmentRow = {
  title: string;
  category: AppraisalCostCategory;
  amount: number;
  notes?: string;
};

function numberOr(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

export function annualIncomeForRevenueLine(line: AppraisalRevenueLine) {
  if (line.template !== 'COMMERCIAL_INCOME') return 0;
  const annualRent = numberOr(line.annualRent) || numberOr(line.area) * numberOr(line.rentRate);
  const voidFactor = 1 - Math.min(100, numberOr(line.voidPercent)) / 100;
  const incentiveFactor = 1 - Math.min(100, numberOr(line.incentivePercent)) / 100;
  return annualRent * voidFactor * incentiveFactor;
}

export function getCommercialAssets(option: Pick<DevelopmentAppraisalOption, 'commercialAssets' | 'revenueLines' | 'costLines' | 'commercialTemplateId' | 'commercialTemplateInputs'>): CommercialAsset[] {
  const savedAssets = option.commercialAssets?.filter((asset) => asset && asset.id) || [];
  if (savedAssets.length > 0) return savedAssets;

  const commercialLines = option.revenueLines.filter((line) => line.template === 'COMMERCIAL_INCOME');
  if (commercialLines.length === 0) return [];
  const stamp = now();
  return commercialLines.map((line, index) => ({
    id: `legacy-commercial-asset-${line.id}`,
    title: line.title || `Commercial asset ${index + 1}`,
    description: line.notes || '',
    source: 'MANUAL' as const,
    included: true,
    revenueModel: 'LEASE' as const,
    siteAllocationM2: line.area,
    revenueLineIds: [line.id],
    costLineIds: index === 0 ? option.costLines.map((cost) => cost.id) : [],
    rationale: 'Existing commercial appraisal line retained as a separately assessed asset.',
    createdAt: stamp,
    updatedAt: stamp,
  }));
}

export function getCommercialAssetRevenueLines(option: Pick<DevelopmentAppraisalOption, 'revenueLines'>, asset: CommercialAsset) {
  const ids = new Set(asset.revenueLineIds);
  return option.revenueLines.filter((line) => ids.has(line.id));
}

export function getCommercialAssetCostLines(option: Pick<DevelopmentAppraisalOption, 'costLines'>, asset: CommercialAsset) {
  const ids = new Set(asset.costLineIds);
  return option.costLines.filter((line) => ids.has(line.id));
}

export function calculateCommercialAssetAnnualIncome(option: Pick<DevelopmentAppraisalOption, 'revenueLines'>, asset: CommercialAsset) {
  if (!asset.included) return 0;
  return getCommercialAssetRevenueLines(option, asset).reduce((total, line) => total + annualIncomeForRevenueLine(line), 0);
}

export function calculateCommercialAssetDevelopmentCost(option: Pick<DevelopmentAppraisalOption, 'costLines'>, asset: CommercialAsset) {
  if (!asset.included) return 0;
  return getCommercialAssetCostLines(option, asset).reduce((total, line) => total + (isClearedSiteCost(line) ? 0 : numberOr(line.amount)), 0);
}

export function getCommercialSiteWideCostLines(option: Pick<DevelopmentAppraisalOption, 'costLines' | 'commercialAssets' | 'revenueLines'>) {
  const assetCostIds = new Set(getCommercialAssets(option).flatMap((asset) => asset.costLineIds));
  return option.costLines.filter((line) => !assetCostIds.has(line.id));
}

export function applyCommercialAssetAssessment(
  option: DevelopmentAppraisalOption,
  assessment: CommercialAssetAssessmentRow[],
  siteWideCosts: CommercialSiteWideCostAssessmentRow[] = [],
): DevelopmentAppraisalOption {
  const timestamp = now();
  const replacedAssetReferences = new Set((option.commercialAssets || [])
    .filter((asset) => asset.source === 'ASSESSMENT' || asset.source === 'TEMPLATE')
    .flatMap((asset) => [asset.id, ...asset.revenueLineIds, ...asset.costLineIds]));
  const retainedRevenue = option.revenueLines.filter((line) => !replacedAssetReferences.has(line.id));
  const retainedCosts = option.costLines.filter((line) => !replacedAssetReferences.has(line.id));
  const retainedAssets = (option.commercialAssets || []).filter((asset) => asset.source !== 'ASSESSMENT' && asset.source !== 'TEMPLATE');
  const assets: CommercialAsset[] = [];
  const revenueLines: AppraisalRevenueLine[] = [];
  const costLines: AppraisalCostLine[] = [];

  assessment.forEach((entry, index) => {
    const assetId = entry.id || generateId();
    const revenueId = `commercial-asset-${assetId}-income`;
    const costId = `commercial-asset-${assetId}-cost`;
    const included = entry.included !== false;
    const title = entry.title.trim() || `Commercial asset ${index + 1}`;
    const annualIncome = numberOr(entry.annualIncome);
    const developmentCost = numberOr(entry.developmentCost);
    assets.push({
      id: assetId,
      title,
      description: entry.description?.trim() || '',
      source: 'ASSESSMENT',
      included,
      revenueModel: entry.revenueModel || 'LEASE',
      siteAllocationM2: numberOr(entry.siteAllocationM2),
      revenueLineIds: annualIncome > 0 ? [revenueId] : [],
      costLineIds: developmentCost > 0 ? [costId] : [],
      annualOperatingCostPercent: numberOr(entry.operatingCostPercent),
      annualRevenueGrowthPercent: numberOr(entry.revenueGrowthPercent),
      annualLifecycleCapexPercent: numberOr(entry.lifecycleCapexPercent),
      exitYieldPercent: numberOr(entry.exitYieldPercent),
      sellingCostsPercent: numberOr(entry.sellingCostsPercent),
      rationale: entry.rationale?.trim() || '',
      excludedReason: entry.excludedReason?.trim() || '',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    if (annualIncome > 0) {
      revenueLines.push({
        id: revenueId,
        title: `${title} income`,
        template: 'COMMERCIAL_INCOME',
        annualRent: annualIncome,
        area: numberOr(entry.siteAllocationM2),
        rentRate: 0,
        yieldPercent: numberOr(entry.exitYieldPercent),
        voidPercent: 0,
        incentivePercent: 0,
        manualValue: 0,
        cashflow: { type: 'END', startMonth: 1, endMonth: Math.max(1, option.durationMonths) },
        notes: entry.rationale?.trim() || '',
      });
    }
    if (developmentCost > 0) {
      costLines.push({
        id: costId,
        title: entry.costTitle?.trim() || `${title} development allowance`,
        category: 'CONSTRUCTION',
        amount: developmentCost,
        percentageBasis: 'NONE',
        percentageValue: 0,
        cashflow: { type: 'EVEN', startMonth: 1, endMonth: Math.max(1, option.durationMonths) },
        notes: entry.rationale?.trim() || '',
      });
    }
  });

  const siteCosts = siteWideCosts
    .filter((entry) => entry.title.trim() && numberOr(entry.amount) > 0)
    .map((entry, index) => ({
      id: `commercial-assessment-site-cost-${index + 1}`,
      title: entry.title.trim(),
      category: entry.category,
      amount: numberOr(entry.amount),
      percentageBasis: 'NONE' as const,
      percentageValue: 0,
      cashflow: { type: 'EVEN' as const, startMonth: 1, endMonth: Math.max(1, option.durationMonths) },
      notes: entry.notes?.trim() || '',
    }));

  return {
    ...option,
    commercialAssets: [...retainedAssets, ...assets],
    revenueLines: [...retainedRevenue, ...revenueLines],
    costLines: [...retainedCosts, ...costLines, ...siteCosts],
  };
}

export function updateCommercialAsset(option: DevelopmentAppraisalOption, assetId: string, patch: Partial<CommercialAsset>) {
  return {
    ...option,
    commercialAssets: getCommercialAssets(option).map((asset) => asset.id === assetId ? { ...asset, ...patch, updatedAt: now() } : asset),
  };
}
