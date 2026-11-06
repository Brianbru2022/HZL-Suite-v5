import type { BoQItem, Project } from '../types';
import { getBillItems } from './calculations';

const COST_ITEM_TYPES = new Set(['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM']);

function isCostItem(item: BoQItem) {
  return COST_ITEM_TYPES.has(item.type);
}

export interface ProjectWorkflowSummary {
  projectId: string;
  billCount: number;
  sectionCount: number;
  pricedItemCount: number;
  unpricedItemCount: number;
  assignedTradeCount: number;
  tenderContractorCount: number;
  tenderAwardCount: number;
  hasCostPlan: boolean;
  lastUpdatedAt: string;
  estimatingStatus: 'Not started' | 'Needs pricing' | 'Ready';
  tenderStatus: 'No trade setup' | 'Ready for returns' | 'Part awarded';
  reportsStatus: 'Needs project data' | 'Ready' | 'Cost plan ready';
}

export function buildProjectWorkflowSummary(project: Project): ProjectWorkflowSummary {
  const items = (project.bills || []).flatMap((bill) => getBillItems(bill));
  const pricedItems = items.filter(isCostItem);
  const unpricedItemCount = pricedItems.filter((item) => (Number(item.rate) || 0) <= 0).length;
  const assignedTradeIds = new Set(pricedItems.map((item) => item.tradePackageId).filter(Boolean));
  const tenderContractorIds = new Set(
    Object.values(project.tenderContractors || {}).flatMap((contractorIds) => contractorIds || [])
  );
  const tenderAwardCount = Object.keys(project.tenderAwards || {}).length;
  const billCount = project.bills?.length || 0;
  const sectionCount = (project.bills || []).reduce((count, bill) => count + (bill.sections?.length || 0), 0);
  const hasCostPlan = Boolean(project.costPlan);

  return {
    projectId: project.id,
    billCount,
    sectionCount,
    pricedItemCount: pricedItems.length,
    unpricedItemCount,
    assignedTradeCount: assignedTradeIds.size,
    tenderContractorCount: tenderContractorIds.size,
    tenderAwardCount,
    hasCostPlan,
    lastUpdatedAt: project.updatedAt,
    estimatingStatus: pricedItems.length === 0 ? 'Not started' : unpricedItemCount > 0 ? 'Needs pricing' : 'Ready',
    tenderStatus: tenderAwardCount > 0 ? 'Part awarded' : tenderContractorIds.size > 0 ? 'Ready for returns' : 'No trade setup',
    reportsStatus: hasCostPlan ? 'Cost plan ready' : pricedItems.length > 0 ? 'Ready' : 'Needs project data',
  };
}
