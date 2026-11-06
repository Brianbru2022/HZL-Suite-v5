import { isSiteCostElement, isClearedSiteCost, changeSiteCost } from './appraisalSiteCosts';
import type { AppraisalCostLine, DevelopmentAppraisal, DevelopmentAppraisalOption, Project } from '../types';
import { calculateBillBaseTotal, calculateSectionBaseTotal, getBillQuantityMultiplier } from './calculations';

const LINKED_AMOUNT_TOLERANCE = 0.005;

export function resolveLinkedAbnormalAmount(line: AppraisalCostLine, projects: Project[]): number | null {
  if (!isSiteCostElement(line) || isClearedSiteCost(line) || !line.sourceProjectId || !line.sourceBillId) return null;
  if (line.linkedAbnormalFrozen) return null;

  const project = projects.find((entry) => entry.id === line.sourceProjectId);
  const bill = project?.bills?.find((entry) => entry.id === line.sourceBillId);
  if (!bill) return null;

  const multiplier = getBillQuantityMultiplier(bill);
  if (line.sourceSectionId) {
    const section = bill.sections?.find((entry) => entry.id === line.sourceSectionId);
    if (line.sourcePageId) {
      const page = section?.pages?.find(entry => entry.id === line.sourcePageId);
      return page ? page.items.reduce((sum, item) => sum + (['PRICED','EXTRA_OVER_ITEM'].includes(item.type) ? item.total || 0 : 0), 0) * multiplier : null;
    }
    return section ? calculateSectionBaseTotal(section) * multiplier : null;
  }

  return calculateBillBaseTotal(bill) * multiplier;
}

export function refreshLinkedAbnormalLines(
  option: DevelopmentAppraisalOption,
  projects: Project[]
): DevelopmentAppraisalOption {
  let changed = false;
  const costLines = (option.costLines || []).map((line) => {
    const linkedAmount = resolveLinkedAbnormalAmount(line, projects);
    if (linkedAmount === null) return line;
    if (Math.abs((Number(line.amount) || 0) - linkedAmount) <= LINKED_AMOUNT_TOLERANCE) return line;
    changed = true;
    return changeSiteCost(line, { amount: linkedAmount, readOnlySnapshot: true }, 'Linked estimate refreshed');
  });

  return changed ? { ...option, costLines } : option;
}

export function refreshLinkedAbnormalAppraisal(
  appraisal: DevelopmentAppraisal,
  projects: Project[]
): DevelopmentAppraisal {
  if (appraisal.frozenAt) return appraisal;
  let changed = false;
  const options = (appraisal.options || []).map((option) => {
    const refreshed = refreshLinkedAbnormalLines(option, projects);
    if (refreshed !== option) changed = true;
    return refreshed;
  });

  return changed ? { ...appraisal, options } : appraisal;
}
