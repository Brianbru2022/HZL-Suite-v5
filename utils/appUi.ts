import type { WorkflowModuleId, WorkflowModuleStatus } from '../types';
import { WORKFLOW_MODULES } from './workflowModules';

export type AppNoticeSeverity = 'info' | 'success' | 'warning' | 'danger';
export type AppNoticeSource = 'ai' | 'release' | 'storage' | 'system';

export type AppNotice = {
  id: string;
  severity: AppNoticeSeverity;
  source: AppNoticeSource;
  message: string;
  actionLabel?: string;
  dismissible?: boolean;
};

export type NavigationModuleId = 'HOME' | 'ROADMAP' | 'SETTINGS' | 'PREFERENCES' | WorkflowModuleId;
export type NavigationModuleStatus = 'available' | 'beta' | 'coming-soon' | 'utility';
export type NavigationModuleVisibility = 'primary' | 'secondary' | 'roadmap';

export type NavigationModule = {
  id: NavigationModuleId;
  label: string;
  title: string;
  status: NavigationModuleStatus;
  visibility: NavigationModuleVisibility;
  moduleId?: WorkflowModuleId;
  requiresProject?: boolean;
};

export type WorkspaceViewPreset = {
  id: 'clean-bill' | 'trade-allocation' | 'tender-prep' | 'review-audit';
  label: string;
  visiblePanels: Array<'navigator' | 'bill' | 'inspector' | 'standards' | 'activity'>;
  density: 'comfortable' | 'compact';
  focusMode: boolean;
};

export type DesignToken = {
  name: string;
  hex: string;
  role: 'brand' | 'surface' | 'status' | 'ai';
};

export const PRIMARY_NAVIGATION_MODULES: NavigationModule[] = [
  { id: 'HOME', label: 'Home', title: 'Home command centre', status: 'available', visibility: 'primary' },
  { id: 'ESTIMATING', label: 'Estimate', title: 'Estimating', status: 'available', visibility: 'primary', moduleId: 'ESTIMATING', requiresProject: true },
  { id: 'LIBRARY_MAINTENANCE', label: 'Library', title: 'Library, trades, and contractors', status: 'available', visibility: 'primary', moduleId: 'LIBRARY_MAINTENANCE' },
  { id: 'TENDER_ANALYSIS', label: 'Tender', title: 'Tender analysis', status: 'available', visibility: 'primary', moduleId: 'TENDER_ANALYSIS', requiresProject: true },
  { id: 'COST_REPORTS', label: 'Reports', title: 'Cost reports', status: 'beta', visibility: 'primary', moduleId: 'COST_REPORTS', requiresProject: true },
  { id: 'AUDITS', label: 'Audits', title: 'Audit trail', status: 'beta', visibility: 'primary', moduleId: 'AUDITS' },
];

function toNavigationStatus(status: WorkflowModuleStatus): NavigationModuleStatus {
  if (status === 'AVAILABLE') return 'available';
  if (status === 'BETA') return 'beta';
  return 'coming-soon';
}

function toNavigationLabel(moduleId: WorkflowModuleId, name: string) {
  if (moduleId === 'ESTIMATING') return 'Estimate';
  if (moduleId === 'LIBRARY_MAINTENANCE') return 'Library';
  if (moduleId === 'TENDER_ANALYSIS') return 'Tender';
  if (moduleId === 'COST_REPORTS') return 'Reports';
  if (moduleId === 'SUBCONTRACT_APPOINTMENT') return 'Appointments';
  if (moduleId === 'FINAL_ACCOUNTS') return 'Final accounts';
  return name;
}

export const ROADMAP_NAVIGATION_MODULES: NavigationModule[] = WORKFLOW_MODULES.map((module) => ({
  id: module.id,
  label: toNavigationLabel(module.id, module.name),
  title: `${module.name} roadmap`,
  status: toNavigationStatus(module.status),
  visibility: 'roadmap',
  moduleId: module.id,
  requiresProject: module.requiresProject,
}));

export const WORKSPACE_VIEW_PRESETS: WorkspaceViewPreset[] = [
  { id: 'clean-bill', label: 'Clean bill', visiblePanels: ['navigator', 'bill', 'inspector'], density: 'compact', focusMode: false },
  { id: 'trade-allocation', label: 'Trade allocation', visiblePanels: ['navigator', 'bill', 'inspector', 'activity'], density: 'compact', focusMode: false },
  { id: 'tender-prep', label: 'Tender prep', visiblePanels: ['navigator', 'bill', 'standards', 'activity'], density: 'compact', focusMode: false },
  { id: 'review-audit', label: 'Review and audit', visiblePanels: ['bill', 'inspector', 'activity'], density: 'comfortable', focusMode: true },
];

export const APP_DESIGN_TOKENS: DesignToken[] = [
  { name: 'ink', hex: '#15202b', role: 'brand' },
  { name: 'warm-surface', hex: '#fbfaf7', role: 'surface' },
  { name: 'teal-progress', hex: '#0f766e', role: 'status' },
  { name: 'blue-info', hex: '#2563eb', role: 'status' },
  { name: 'amber-attention', hex: '#b45309', role: 'status' },
  { name: 'rose-danger', hex: '#be123c', role: 'status' },
  { name: 'violet-ai', hex: '#7c3aed', role: 'ai' },
];
