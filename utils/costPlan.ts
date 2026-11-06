import type {
  CostPlan,
  CostPlanContingencyMode,
  CostPlanDrawingBasis,
  CostPlanLine,
  CostPlanSource,
  Project,
} from '../types';
import { generateId } from './generateId';
import { getSectionItems, safeAdd, safeMul } from './calculations';

const COST_TYPES = new Set(['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM']);

export function getDefaultContingencyForDrawingBasis(basis: CostPlanDrawingBasis): number {
  switch (basis) {
    case 'DETAILED_DRAWINGS':
      return 5;
    case 'OUTLINE_DRAWINGS':
      return 10;
    case 'NO_DRAWINGS':
    default:
      return 15;
  }
}

export function getDrawingBasisLabel(basis: CostPlanDrawingBasis): string {
  switch (basis) {
    case 'DETAILED_DRAWINGS':
      return 'Detailed drawings';
    case 'OUTLINE_DRAWINGS':
      return 'Outline drawings';
    case 'NO_DRAWINGS':
    default:
      return 'No drawings';
  }
}

export function getCostPlanSourceLabel(source: CostPlanSource): string {
  switch (source) {
    case 'BILL_NAMES':
      return 'Bill names';
    case 'BILL_SECTIONS':
      return 'Bill sections';
    case 'AI':
      return 'AI';
    case 'AI_CONCEPT':
      return 'AI concept build-up';
    case 'HYBRID':
    default:
      return 'Hybrid';
  }
}

export function getContingencyModeLabel(mode: CostPlanContingencyMode): string {
  return mode === 'PRORATED' ? 'Pro-rated across lines' : 'Separate line';
}

export function calculateBaseBillValue(project: Project, billId: string): number {
  const bill = project.bills.find((entry) => entry.id === billId);
  if (!bill) return 0;

  let total = 0;
  if ((bill.sections || []).length === 0) {
    total = (bill.items || []).reduce((acc, item) => (
      COST_TYPES.has(item.type) ? safeAdd(acc, item.total || safeMul(item.quantity, item.rate)) : acc
    ), 0);
  }

  return (bill.sections || []).reduce((acc, section) => (
    safeAdd(acc, calculateBaseSectionValue(project, billId, section.id))
  ), total);
}

export function calculateBaseSectionValue(project: Project, billId: string, sectionId: string): number {
  const bill = project.bills.find((entry) => entry.id === billId);
  const section = bill?.sections.find((entry) => entry.id === sectionId);
  if (!section) return 0;
  return getSectionItems(section).reduce((acc, item) => (
    COST_TYPES.has(item.type) ? safeAdd(acc, item.total || safeMul(item.quantity, item.rate)) : acc
  ), 0);
}

function buildBillLines(project: Project): CostPlanLine[] {
  return project.bills
    .map((bill) => ({
      id: generateId(),
      title: bill.name,
      source: 'BILL' as const,
      sourceBillId: bill.id,
      provenance: [bill.name],
      notes: `${bill.sections.length} section${bill.sections.length === 1 ? '' : 's'}`,
      baseValue: calculateBaseBillValue(project, bill.id),
      contingencyValue: 0,
      totalValue: 0,
    }))
    .filter((line) => line.baseValue > 0);
}

function buildSectionLines(project: Project): CostPlanLine[] {
  return project.bills.flatMap((bill) =>
    bill.sections
      .map((section) => ({
        id: generateId(),
        title: section.name,
        source: 'SECTION' as const,
        sourceBillId: bill.id,
        sourceSectionId: section.id,
        provenance: [`${bill.name} / ${section.name}`],
        notes: bill.name,
        baseValue: calculateBaseSectionValue(project, bill.id, section.id),
        contingencyValue: 0,
        totalValue: 0,
      }))
      .filter((line) => line.baseValue > 0)
  );
}

export function isContingencyLine(line: CostPlanLine): boolean {
  return line.title.trim().toLowerCase() === 'contingency' && line.baseValue === 0;
}

function applyContingency(lines: CostPlanLine[], percentage: number, mode: CostPlanContingencyMode): CostPlanLine[] {
  if (lines.length === 0) return [];
  const totalBase = lines.reduce((acc, line) => safeAdd(acc, line.baseValue), 0);
  const totalContingency = safeMul(totalBase, percentage / 100);

  if (mode === 'PRORATED' && totalBase > 0) {
    return lines.map((line, index) => {
      const contingencyValue = index === lines.length - 1
        ? safeAdd(totalContingency, -lines.slice(0, -1).reduce((acc, entry) => safeAdd(acc, entry.contingencyValue), 0))
        : safeMul(totalContingency, line.baseValue / totalBase);
      return {
        ...line,
        contingencyValue,
        totalValue: safeAdd(line.baseValue, contingencyValue),
        lowValue: typeof line.lowValue === 'number' ? safeAdd(line.lowValue, safeMul(contingencyValue, line.lowValue / (line.baseValue || 1))) : line.lowValue,
        highValue: typeof line.highValue === 'number' ? safeAdd(line.highValue, safeMul(contingencyValue, line.highValue / (line.baseValue || 1))) : line.highValue,
      };
    });
  }

  return [
    ...lines.map((line) => ({
      ...line,
      contingencyValue: 0,
      totalValue: line.baseValue,
    })),
    {
      id: generateId(),
      title: 'Contingency',
      source: 'MANUAL',
      notes: `${percentage.toFixed(1)}% applied separately`,
      baseValue: 0,
      contingencyValue: totalContingency,
      totalValue: totalContingency,
    },
  ];
}

export function compileCostPlan(
  project: Project,
  source: CostPlanSource,
  drawingBasis: CostPlanDrawingBasis,
  contingencyPercentage: number,
  contingencyMode: CostPlanContingencyMode,
  aiLines?: Array<{ title: string; notes?: string; baseValue: number; provenance?: string[]; lowValue?: number; highValue?: number; confidenceLabel?: 'LOW' | 'MEDIUM' | 'HIGH'; confidenceNote?: string }>,
  conceptMeta?: { assumptions?: string[]; confidenceSummary?: string }
): CostPlan {
  const baseLines = (() => {
    switch (source) {
      case 'BILL_NAMES':
        return buildBillLines(project);
      case 'BILL_SECTIONS':
        return buildSectionLines(project);
      case 'AI':
        return (aiLines || []).map((line) => ({
          id: generateId(),
          title: line.title,
          source: 'AI' as const,
          provenance: line.provenance,
          notes: line.notes,
          baseValue: line.baseValue,
          contingencyValue: 0,
          totalValue: 0,
        }));
      case 'HYBRID':
        return (aiLines || []).length > 0
          ? (aiLines || []).map((line) => ({
            id: generateId(),
            title: line.title,
            source: 'AI' as const,
            provenance: line.provenance,
            notes: line.notes,
            baseValue: line.baseValue,
            lowValue: line.lowValue,
            highValue: line.highValue,
            confidenceLabel: line.confidenceLabel,
            confidenceNote: line.confidenceNote,
            contingencyValue: 0,
            totalValue: 0,
          }))
          : buildSectionLines(project);
      case 'AI_CONCEPT':
        return (aiLines || []).map((line) => ({
          id: generateId(),
          title: line.title,
          source: 'AI' as const,
          provenance: line.provenance,
          notes: line.notes,
          baseValue: line.baseValue,
          lowValue: line.lowValue,
          highValue: line.highValue,
          confidenceLabel: line.confidenceLabel,
          confidenceNote: line.confidenceNote,
          contingencyValue: 0,
          totalValue: 0,
        }));
      default:
        return buildSectionLines(project);
    }
  })();

  const lines = applyContingency(baseLines, contingencyPercentage, contingencyMode);
  const now = new Date().toISOString();
  const totalLowValue = lines.reduce((acc, line) => safeAdd(acc, line.lowValue ?? line.totalValue), 0);
  const totalHighValue = lines.reduce((acc, line) => safeAdd(acc, line.highValue ?? line.totalValue), 0);
  return {
    id: generateId(),
    title: `${project.name} cost plan`,
    source,
    drawingBasis,
    contingencyMode,
    contingencyPercentage,
    createdAt: project.costPlan?.createdAt || now,
    updatedAt: now,
    notes: `Compiled from ${getCostPlanSourceLabel(source)} on a ${getDrawingBasisLabel(drawingBasis).toLowerCase()} basis.`,
    assumptions: conceptMeta?.assumptions,
    confidenceSummary: conceptMeta?.confidenceSummary,
    totalLowValue,
    totalHighValue,
    lines,
  };
}

export function reapplyCostPlanContingency(plan: CostPlan, baseLines: CostPlanLine[]): CostPlan {
  const normalizedLines = baseLines
    .filter((line) => !isContingencyLine(line))
    .map((line) => ({
      ...line,
      title: line.title.trim() || 'Untitled line',
      provenance: line.provenance || [],
      notes: line.notes?.trim() || '',
      baseValue: line.baseValue || 0,
      contingencyValue: 0,
      totalValue: 0,
    }));

  return {
    ...plan,
    updatedAt: new Date().toISOString(),
    lines: applyContingency(normalizedLines, plan.contingencyPercentage, plan.contingencyMode),
  };
}

export function summariseCostPlan(plan: CostPlan): { baseTotal: number; contingencyTotal: number; total: number } {
  return plan.lines.reduce((acc, line) => ({
    baseTotal: safeAdd(acc.baseTotal, line.baseValue),
    contingencyTotal: safeAdd(acc.contingencyTotal, line.contingencyValue),
    total: safeAdd(acc.total, line.totalValue),
  }), { baseTotal: 0, contingencyTotal: 0, total: 0 });
}

export function formatCostPlanRange(plan: CostPlan | null | undefined) {
  if (!plan) return null;
  return {
    low: plan.totalLowValue ?? null,
    high: plan.totalHighValue ?? null,
  };
}

export function compareCostPlanTotals(currentPlan: CostPlan | null | undefined, previousPlan: CostPlan | null | undefined) {
  const currentSummary = currentPlan ? summariseCostPlan(currentPlan) : null;
  const previousSummary = previousPlan ? summariseCostPlan(previousPlan) : null;

  return {
    currentSummary,
    previousSummary,
    totalDelta: currentSummary && previousSummary ? safeAdd(currentSummary.total, -previousSummary.total) : null,
    baseDelta: currentSummary && previousSummary ? safeAdd(currentSummary.baseTotal, -previousSummary.baseTotal) : null,
  };
}

export function getCostPlanLineDelta(line: CostPlanLine, previousPlan: CostPlan | null | undefined): number | null {
  if (!previousPlan) return null;
  const previousLine = previousPlan.lines.find((entry) => entry.title.trim().toLowerCase() === line.title.trim().toLowerCase());
  if (!previousLine) return line.totalValue;
  return safeAdd(line.totalValue, -previousLine.totalValue);
}
