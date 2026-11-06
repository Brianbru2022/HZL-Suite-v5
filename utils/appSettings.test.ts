import { describe, expect, it } from 'vitest';
import type { Project } from '../types';
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_BILL_LINE_STYLES,
  applyAppDefaultsToProject,
  buildNewProjectSettingsFromDefaults,
  getEffectiveProjectSettings,
  normalizeAppSettings,
} from './appSettings';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    name: 'Existing project',
    client: '',
    location: '',
    reference: 'REF',
    updatedAt: '2026-01-01T00:00:00.000Z',
    measurementStandard: 'SMM7',
    ohpPercentage: 0,
    bills: [],
    ...overrides,
  };
}

describe('app settings', () => {
  it('uses the Python bill presentation as the default without replacing project overrides', () => {
    expect(DEFAULT_BILL_LINE_STYLES.GENERAL_HEADING).toMatchObject({ fontFamily: 'aptos-narrow', fontColor: '#000000', backgroundColor: '#ffffff', bold: true, uppercase: true });
    expect(DEFAULT_BILL_LINE_STYLES.MAJOR_HEADING).toMatchObject({ bold: true, underline: true });
    expect(DEFAULT_BILL_LINE_STYLES.SUB_SECTION).toMatchObject({ bold: true, underline: false });
    expect(DEFAULT_BILL_LINE_STYLES.MINOR_HEADING).toMatchObject({ bold: false, italic: false });
    expect(DEFAULT_BILL_LINE_STYLES.COMMENT).toMatchObject({ bold: false, italic: true });
    expect(DEFAULT_BILL_LINE_STYLES.PRICED).toMatchObject({ bold: false, italic: false });
  });
  it('normalizes partial app settings while preserving defaults', () => {
    const settings = normalizeAppSettings({
      projectDefaults: {
        measurementStandard: 'NRM2',
        ohpPercentage: 7.5,
        showStickyBillTotals: false,
      },
      moduleSettings: {
        library: {
          preferQsplibPacks: false,
        },
        appraisals: {
          defaultTemplate: 'COMMERCIAL_INCOME',
          defaultDurationMonths: 24,
        },
      },
    });

    expect(settings.projectDefaults.measurementStandard).toBe('NRM2');
    expect(settings.projectDefaults.ohpPercentage).toBe(7.5);
    expect(settings.projectDefaults.showStickyBillTotals).toBe(false);
    expect(settings.projectDefaults.billWorkspaceLayout).toBe(DEFAULT_APP_SETTINGS.projectDefaults.billWorkspaceLayout);
    expect(settings.moduleSettings.library.preferQsplibPacks).toBe(false);
    expect(settings.moduleSettings.tender.showWorkflowStageCards).toBe(true);
    expect(settings.moduleSettings.appraisals.defaultTemplate).toBe('COMMERCIAL_INCOME');
    expect(settings.moduleSettings.appraisals.defaultDurationMonths).toBe(24);
    expect(settings.moduleSettings.appraisals.defaultTargetProfitOnGdvPercent).toBe(20);
    expect(settings.ai.providerMode).toBe('AUTO');
    expect(settings.ai.localModelDirectory).toBe('C:\\models');
    expect(settings.general.crashReportingEnabled).toBe(false);
    expect(settings.general.releaseChannel).toBe('STABLE');
  });

  it('keeps explicit support consent and pilot channel settings', () => {
    const settings = normalizeAppSettings({ general: { crashReportingEnabled: true, releaseChannel: 'PILOT' } });
    expect(settings.general.crashReportingEnabled).toBe(true);
    expect(settings.general.releaseChannel).toBe('PILOT');
  });

  it('builds new project settings from app defaults', () => {
    const settings = normalizeAppSettings({
      projectDefaults: {
        measurementStandard: 'NRM2',
        ohpPercentage: 10,
        billWorkspaceMode: 'GUIDED',
        showWorkflowGuidance: true,
        showStickyBillTotals: false,
      },
    });

    expect(buildNewProjectSettingsFromDefaults(settings)).toMatchObject({
      measurementStandard: 'NRM2',
      ohpPercentage: 10,
      billWorkspaceMode: 'GUIDED',
      showWorkflowGuidance: true,
      showStickyBillTotals: false,
    });
  });

  it('keeps explicit project overrides ahead of app defaults', () => {
    const settings = normalizeAppSettings({
      projectDefaults: {
        measurementStandard: 'NRM2',
        ohpPercentage: 12,
        showStickyBillTotals: false,
      },
    });
    const project = makeProject({
      measurementStandard: 'SMM7',
      ohpPercentage: 2.5,
      showStickyBillTotals: true,
    });

    expect(getEffectiveProjectSettings(project, settings)).toMatchObject({
      measurementStandard: 'SMM7',
      ohpPercentage: 2.5,
      showStickyBillTotals: true,
    });
  });

  it('applies app defaults only when explicitly requested', () => {
    const settings = normalizeAppSettings({
      projectDefaults: {
        measurementStandard: 'NRM2',
        ohpPercentage: 9,
        showStickyBillTotals: false,
      },
    });
    const project = makeProject({ measurementStandard: 'SMM7', ohpPercentage: 1, showStickyBillTotals: true });

    const updated = applyAppDefaultsToProject(project, settings);

    expect(updated.measurementStandard).toBe('NRM2');
    expect(updated.ohpPercentage).toBe(9);
    expect(updated.showStickyBillTotals).toBe(false);
    expect(project.measurementStandard).toBe('SMM7');
  });
});
