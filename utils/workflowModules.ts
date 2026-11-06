import type { WorkflowModule, WorkflowModuleId, WorkflowModuleStatus } from '../types';
import type { ProjectWorkflowSummary } from './projectWorkflowSummary';

export const WORKFLOW_MODULES: WorkflowModule[] = [
  {
    id: 'APPRAISALS',
    name: 'Appraisals',
    description: 'Early development appraisals with multi-option residual land value and profit-on-GDV decisions.',
    status: 'BETA',
    category: 'PRE_CONTRACT',
    group: 'GLOBAL_TOOL',
    requiresProject: false,
    primaryAction: 'Open appraisals',
    readinessLabel: 'Development options',
    plannedInputs: ['Site or scheme brief', 'Residential sales assumptions', 'Commercial income assumptions', 'Monthly cashflow phasing'],
    plannedOutputs: ['Option comparison', 'Residual land value', 'Profit on GDV', 'Decision pack exports'],
  },
  {
    id: 'TAKE_OFF',
    name: 'Take-off',
    description: 'Measure quantities and link take-off records back to BoQ items without replacing specialist CAD/BIM tools in the first release.',
    status: 'COMING_SOON',
    category: 'PRE_CONTRACT',
    group: 'COMING_SOON',
    requiresProject: true,
    primaryAction: 'Preview module',
    dependsOn: ['ESTIMATING'],
    readinessLabel: 'Measurement records planned',
    plannedInputs: ['Drawings or measurement notes', 'Selected BoQ item', 'Measurement source and revision'],
    plannedOutputs: ['Measured quantity records', 'Quantity history', 'Linked bill-item quantity updates'],
  },
  {
    id: 'ESTIMATING',
    name: 'Estimating',
    description: 'Create and manage BoQs, sections, pages, headings, comments, quantities, rates, and exports.',
    status: 'AVAILABLE',
    category: 'ESTIMATING',
    group: 'LIVE',
    requiresProject: true,
    primaryAction: 'Open estimating',
    readinessLabel: 'Bills and priced items',
    plannedInputs: ['Project bills', 'Standards library rows', 'Imported schedules'],
    plannedOutputs: ['BoQ workspace', 'Excel/PDF exports', 'Tender-ready bill structure'],
  },
  {
    id: 'LIBRARY_MAINTENANCE',
    name: 'Library Maintenance',
    description: 'Maintain standards libraries, protected packs, large SQLite-backed catalogues, and reusable items.',
    status: 'AVAILABLE',
    category: 'ESTIMATING',
    group: 'GLOBAL_TOOL',
    requiresProject: false,
    primaryAction: 'Open library',
    readinessLabel: 'Global standards',
    plannedInputs: ['JSON libraries', '.qsplib packs', 'Manual standards content'],
    plannedOutputs: ['Reusable standards', 'Library packs', 'Controlled permissions'],
  },
  {
    id: 'TENDER_ANALYSIS',
    name: 'Tender Analysis',
    description: 'Set up trade packages, compare contractor returns, report missing rates, and apply winners back to bills.',
    status: 'AVAILABLE',
    category: 'TENDERING',
    group: 'LIVE',
    requiresProject: true,
    primaryAction: 'Open tender analysis',
    dependsOn: ['ESTIMATING'],
    readinessLabel: 'Trades and tender returns',
    plannedInputs: ['Priced BoQ items', 'Trade packages', 'Contractor returns'],
    plannedOutputs: ['Tender comparison', 'Award decision support', 'Applied winning rates'],
  },
  {
    id: 'CONTRACTS',
    name: 'Contracts',
    description: 'Prepare appointment information from approved tender packages and controlled scope decisions.',
    status: 'COMING_SOON',
    category: 'POST_CONTRACT',
    group: 'COMING_SOON',
    requiresProject: true,
    primaryAction: 'Preview module',
    dependsOn: ['TENDER_ANALYSIS'],
    readinessLabel: 'Needs tender award',
    plannedInputs: ['Approved tender award', 'Trade scope', 'Clarifications and exclusions'],
    plannedOutputs: ['Appointment data', 'Scope schedule', 'Contract checklist'],
  },
  {
    id: 'SUBCONTRACT_APPOINTMENT',
    name: 'Subcontract Appointment',
    description: 'Start from the approved tender package and prepare structured appointment data for subcontract setup.',
    status: 'COMING_SOON',
    category: 'POST_CONTRACT',
    group: 'COMING_SOON',
    requiresProject: true,
    primaryAction: 'Preview module',
    dependsOn: ['TENDER_ANALYSIS'],
    readinessLabel: 'Needs tender award',
    plannedInputs: ['Accepted tender return', 'Trade package scope', 'Exclusions and clarifications'],
    plannedOutputs: ['Appointment summary', 'Scope schedule', 'Contract data checklist'],
  },
  {
    id: 'VALUATIONS',
    name: 'Valuations',
    description: 'Track valuation periods, progress quantities, retention, cumulative totals, and payment positions.',
    status: 'COMING_SOON',
    category: 'POST_CONTRACT',
    group: 'COMING_SOON',
    requiresProject: true,
    primaryAction: 'Preview module',
    dependsOn: ['CONTRACTS'],
    readinessLabel: 'Needs contract package',
    plannedInputs: ['Contract package', 'BoQ items', 'Progress quantities or percentages'],
    plannedOutputs: ['Valuation summary', 'Current and cumulative values', 'Payment certificate data'],
  },
  {
    id: 'VARIATIONS',
    name: 'Variations',
    description: 'Maintain a controlled register for instructions, quotations, submitted values, agreed values, and pending commercial changes.',
    status: 'COMING_SOON',
    category: 'POST_CONTRACT',
    group: 'COMING_SOON',
    requiresProject: true,
    primaryAction: 'Preview module',
    dependsOn: ['CONTRACTS'],
    readinessLabel: 'Change control planned',
    plannedInputs: ['Instruction reference', 'Linked bill items or new scope', 'Quoted/submitted value'],
    plannedOutputs: ['Variation register', 'Status summary', 'Agreed change values for valuations'],
  },
  {
    id: 'FINAL_ACCOUNTS',
    name: 'Final Accounts',
    description: 'Reconcile contract sums, variations, valuations, retention, and close-out adjustments.',
    status: 'COMING_SOON',
    category: 'POST_CONTRACT',
    group: 'COMING_SOON',
    requiresProject: true,
    primaryAction: 'Preview module',
    dependsOn: ['VALUATIONS'],
    readinessLabel: 'Needs valuation history',
    plannedInputs: ['Contract sum', 'Agreed variations', 'Valuation history', 'Retention rules'],
    plannedOutputs: ['Final account reconciliation', 'Close-out summary', 'Outstanding item list'],
  },
  {
    id: 'AUDITS',
    name: 'Audits',
    description: 'Review important actions, diagnostics, import/export history, save events, and recorded operation evidence.',
    status: 'BETA',
    category: 'SYSTEM',
    group: 'GLOBAL_TOOL',
    requiresProject: false,
    primaryAction: 'Open audit trail',
    readinessLabel: 'Operation history',
    plannedInputs: ['Project actions', 'Save events', 'Import/export events', 'Tender awards'],
    plannedOutputs: ['Action history', 'Audit extracts', 'Review evidence'],
  },
  {
    id: 'COST_REPORTS',
    name: 'Cost Reports',
    description: 'Use current analytics, project summaries, and cost plan outputs as the reporting foundation.',
    status: 'BETA',
    category: 'REPORTING',
    group: 'LIVE',
    requiresProject: true,
    primaryAction: 'Open reports',
    dependsOn: ['ESTIMATING', 'TENDER_ANALYSIS'],
    readinessLabel: 'Totals and reports',
    plannedInputs: ['BoQ totals', 'Trade allocations', 'Tender data', 'Cost plan revisions'],
    plannedOutputs: ['Cost dashboard', 'Project summary', 'Cost plan reports'],
  },
];

export function getWorkflowModuleStatusLabel(status: WorkflowModuleStatus) {
  if (status === 'AVAILABLE') return 'Available';
  if (status === 'BETA') return 'Beta';
  return 'Coming soon';
}

export const COMING_SOON_WORKFLOW_MODULES = WORKFLOW_MODULES.filter((module) => module.status === 'COMING_SOON');

export type WorkflowModuleLaunchTarget =
  | { type: 'MODULE_HUB'; module: WorkflowModule }
  | { type: 'PREVIEW'; module: WorkflowModule }
  | { type: 'OPEN_PROJECT_MODULE'; module: WorkflowModule; projectId: string }
  | { type: 'PROJECT_PICKER'; module: WorkflowModule }
  | { type: 'PROJECT_REQUIRED'; module: WorkflowModule }
  | { type: 'OPEN_GLOBAL_MODULE'; module: WorkflowModule };

export function getWorkflowModule(moduleId: WorkflowModuleId) {
  return WORKFLOW_MODULES.find((module) => module.id === moduleId) || null;
}

export function isWorkflowModuleLiveHub(module: WorkflowModule) {
  return module.group === 'LIVE' || module.group === 'GLOBAL_TOOL';
}

export function getWorkflowReadinessLabel(module: WorkflowModule, summary: ProjectWorkflowSummary | null | undefined) {
  if (!summary) {
    return module.requiresProject ? 'Choose a project first' : module.readinessLabel || module.primaryAction;
  }

  if (module.id === 'ESTIMATING') {
    return `${summary.billCount} bills | ${summary.pricedItemCount.toLocaleString()} priced | ${summary.unpricedItemCount.toLocaleString()} unpriced`;
  }

  if (module.id === 'TENDER_ANALYSIS') {
    return `${summary.assignedTradeCount} trades | ${summary.tenderContractorCount} contractors | ${summary.tenderAwardCount} awards`;
  }

  if (module.id === 'COST_REPORTS') {
    return summary.hasCostPlan ? 'Cost plan ready' : `${summary.pricedItemCount.toLocaleString()} priced items available`;
  }

  if (module.id === 'CONTRACTS' || module.id === 'SUBCONTRACT_APPOINTMENT') {
    return summary.tenderAwardCount > 0 ? `${summary.tenderAwardCount} tender awards available` : 'Needs tender award';
  }

  if (module.id === 'VALUATIONS' || module.id === 'VARIATIONS' || module.id === 'FINAL_ACCOUNTS') {
    return summary.tenderAwardCount > 0 ? 'Contract workflow planned' : module.readinessLabel || 'Coming soon';
  }

  if (module.id === 'AUDITS') {
    return 'Operation history and change evidence planned';
  }

  return module.readinessLabel || module.primaryAction;
}

export function resolveWorkflowModuleLaunch(
  moduleId: WorkflowModuleId,
  options: {
    projectCount: number;
    projectId?: string;
    preferHub?: boolean;
  }
): WorkflowModuleLaunchTarget | null {
  const module = getWorkflowModule(moduleId);
  if (!module) return null;

  if (module.status === 'COMING_SOON') {
    return { type: 'PREVIEW', module };
  }

  if (options.preferHub && isWorkflowModuleLiveHub(module) && !options.projectId) {
    return { type: 'MODULE_HUB', module };
  }

  if (module.requiresProject) {
    if (options.projectId) {
      return { type: 'OPEN_PROJECT_MODULE', module, projectId: options.projectId };
    }
    if (options.projectCount === 1) {
      return { type: 'PROJECT_PICKER', module };
    }
    if (options.projectCount > 1) {
      return { type: 'PROJECT_PICKER', module };
    }
    return { type: 'PROJECT_REQUIRED', module };
  }

  return { type: 'OPEN_GLOBAL_MODULE', module };
}
