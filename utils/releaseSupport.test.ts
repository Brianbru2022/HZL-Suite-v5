import { describe, expect, it } from 'vitest';
import { UnitType, type ItemLibrary, type Project, type TradePackage } from '../types';
import { DEFAULT_APP_SETTINGS } from './appSettings';
import { buildDiagnosticsReport, type ReleaseSupportContext } from './releaseSupport';

function makeProject(): Project {
  return {
    id: 'project-1',
    name: 'Pilot project',
    client: 'HZL',
    location: 'Bristol',
    reference: 'PILOT-001',
    updatedAt: '2026-06-23T09:00:00.000Z',
    measurementStandard: 'SMM7',
    ohpPercentage: 5,
    bills: [
      {
        id: 'bill-1',
        name: 'Bill 1',
        sections: [
          {
            id: 'section-1',
            name: 'Preliminaries',
            items: [
              {
                id: 'item-1',
                type: 'PRICED',
                reference: 'A10',
                description: 'Project management',
                unit: UnitType.SUM,
                quantity: 1,
                rate: 1234,
                total: 1234,
              },
            ],
          },
        ],
      },
    ],
  };
}

function makeLibrary(): ItemLibrary {
  return {
    id: 'library-1',
    name: 'SMM7 test library',
    folders: [],
    pricedCount: 2,
  };
}

function makeContext(overrides: Partial<ReleaseSupportContext> = {}): ReleaseSupportContext {
  const project = makeProject();
  const library = makeLibrary();
  const trade: TradePackage = {
    id: 'trade-1',
    name: 'General builder',
    contractors: [],
  };

  return {
    projects: [project],
    libraries: [library],
    trades: [trade],
    appSettings: DEFAULT_APP_SETTINGS,
    persistenceBackend: 'localStorage',
    isHydrated: true,
    saveStatus: 'error',
    saveError: 'Autosave failed',
    lastSavedAt: Date.parse('2026-06-23T09:30:00.000Z'),
    lastManualSaveAt: Date.parse('2026-06-23T09:15:00.000Z'),
    isGeminiConfigured: false,
    geminiConfigSource: 'none',
    currentProject: project,
    activeBill: project.bills[0],
    releaseChecklistState: {
      'startup-opens': 'passed',
      'recovery-backup-diagnostics-export': 'issue',
    },
    recentOperations: [
      {
        id: 'operation-1',
        timestamp: '2026-06-23T09:45:00.000Z',
        kind: 'backup',
        status: 'success',
        subject: 'App-state JSON backup',
        message: 'Exported an app-state JSON backup.',
        counts: { files: 1, projects: 1, libraries: 1, trades: 1 },
      },
    ],
    ...overrides,
  };
}

describe('release support', () => {
  it('builds a diagnostics report with storage warnings, counts, smoke checks, and operation history', () => {
    const report = buildDiagnosticsReport(makeContext(), '2026-06-23T10:00:00.000Z');

    expect(report).toContain('# HZL QS Suite Diagnostics Report');
    expect(report).toContain('Generated: 2026-06-23T10:00:00.000Z');
    expect(report).toContain('Storage: Browser fallback');
    expect(report).toContain('Save status: error');
    expect(report).toContain('- SQLite is unavailable; export a backup before closing the app.');
    expect(report).toContain('- Autosave failed');
    expect(report).toContain('- AI is not configured. Core bill, library, and export features still work.');
    expect(report).toContain('- Project: Pilot project');
    expect(report).toContain('- Bill: Bill 1');
    expect(report).toContain('- Projects: 1');
    expect(report).toContain('- Bills: 1');
    expect(report).toContain('- Project items: 1');
    expect(report).toContain('- Libraries: 1');
    expect(report).toContain('- Library priced items: 2');
    expect(report).toContain('- Trade packages: 1');
    expect(report).toContain('[PASSED] App opens to a usable workspace');
    expect(report).toContain('[ISSUE] One-click backup and diagnostics export work');
    expect(report).toContain('SUCCESS backup: App-state JSON backup');
    expect(report).toContain('Counts: files: 1, projects: 1, libraries: 1, trades: 1');
  });
});
