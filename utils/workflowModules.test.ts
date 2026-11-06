import { describe, expect, it } from 'vitest';
import {
  COMING_SOON_WORKFLOW_MODULES,
  WORKFLOW_MODULES,
  getWorkflowModuleStatusLabel,
  getWorkflowReadinessLabel,
  resolveWorkflowModuleLaunch,
} from './workflowModules';

describe('workflow module registry', () => {
  it('uses one unique id for every workflow module', () => {
    const ids = WORKFLOW_MODULES.map((module) => module.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps unfinished planned modules in the shared coming-soon registry', () => {
    const ids = new Set(COMING_SOON_WORKFLOW_MODULES.map((module) => module.id));
    expect(ids.has('APPRAISALS')).toBe(false);
    expect(ids.has('TAKE_OFF')).toBe(true);
    expect(ids.has('CONTRACTS')).toBe(true);
    expect(ids.has('SUBCONTRACT_APPOINTMENT')).toBe(true);
    expect(ids.has('VALUATIONS')).toBe(true);
    expect(ids.has('VARIATIONS')).toBe(true);
    expect(ids.has('FINAL_ACCOUNTS')).toBe(true);
    expect(ids.has('AUDITS')).toBe(false);
  });

  it('labels public module statuses consistently', () => {
    expect(getWorkflowModuleStatusLabel('AVAILABLE')).toBe('Available');
    expect(getWorkflowModuleStatusLabel('BETA')).toBe('Beta');
    expect(getWorkflowModuleStatusLabel('COMING_SOON')).toBe('Coming soon');
  });

  it('routes live modules through the hub when requested from the command centre', () => {
    const target = resolveWorkflowModuleLaunch('ESTIMATING', { projectCount: 2, preferHub: true });
    expect(target?.type).toBe('MODULE_HUB');
    expect(target && 'module' in target ? target.module.id : null).toBe('ESTIMATING');
  });

  it('routes project modules directly when a project id is supplied', () => {
    const target = resolveWorkflowModuleLaunch('TENDER_ANALYSIS', { projectCount: 2, projectId: 'project-1' });
    expect(target?.type).toBe('OPEN_PROJECT_MODULE');
    expect(target && 'projectId' in target ? target.projectId : null).toBe('project-1');
  });

  it('keeps coming-soon modules as previews even when a project exists', () => {
    const target = resolveWorkflowModuleLaunch('CONTRACTS', { projectCount: 1, projectId: 'project-1', preferHub: true });
    expect(target?.type).toBe('PREVIEW');
  });

  it('summarises readiness for post-tender future modules', () => {
    const module = WORKFLOW_MODULES.find((entry) => entry.id === 'CONTRACTS');
    expect(module).toBeTruthy();
    expect(getWorkflowReadinessLabel(module!, {
      projectId: 'project-1',
      billCount: 1,
      sectionCount: 1,
      pricedItemCount: 10,
      unpricedItemCount: 0,
      assignedTradeCount: 2,
      tenderContractorCount: 3,
      tenderAwardCount: 1,
      hasCostPlan: false,
      lastUpdatedAt: '2026-06-17T00:00:00.000Z',
      estimatingStatus: 'Ready',
      tenderStatus: 'Part awarded',
      reportsStatus: 'Ready',
    })).toBe('1 tender awards available');
  });

  it('opens the audit trail as a beta global module', () => {
    const target = resolveWorkflowModuleLaunch('AUDITS', { projectCount: 0 });
    expect(target?.type).toBe('OPEN_GLOBAL_MODULE');
  });

  it('opens appraisals as a beta global module', () => {
    const target = resolveWorkflowModuleLaunch('APPRAISALS', { projectCount: 0 });
    expect(target?.type).toBe('OPEN_GLOBAL_MODULE');
  });
});
