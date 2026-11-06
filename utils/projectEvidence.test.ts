import { describe, expect, it } from 'vitest';
import type { Project } from '../types';
import type { OperationLogEntry } from './operationLog';
import { buildProjectEvidence } from './projectEvidence';

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    name: 'Evidence Project',
    client: '',
    location: '',
    reference: '',
    updatedAt: '2026-06-22T10:00:00.000Z',
    measurementStandard: 'SMM7',
    ohpPercentage: 0,
    bills: [],
    ...overrides,
  };
}

function operation(overrides: Partial<OperationLogEntry>): OperationLogEntry {
  return {
    id: 'entry-1',
    timestamp: '2026-06-22T09:00:00.000Z',
    kind: 'export',
    status: 'success',
    subject: 'Exported report',
    message: 'Created the report workbook.',
    projectId: 'project-1',
    projectName: 'Evidence Project',
    ...overrides,
  };
}

describe('buildProjectEvidence', () => {
  it('builds scoped evidence from operations, snapshots, awards, and apply-back history', () => {
    const summary = buildProjectEvidence(
      project({
        snapshots: [{
          id: 'snapshot-1',
          label: 'Before tender apply-back',
          createdAt: '2026-06-22T08:00:00.000Z',
          summary: 'Automatic restore point.',
          projectData: {} as never,
        }],
        tenderAwards: {
          'trade-1': {
            tradeId: 'trade-1',
            contractorId: 'contractor-1',
            contractorName: 'Alpha QS',
            selectedAt: '2026-06-22T08:30:00.000Z',
            sourceTenderPackageId: 'tender-1',
            sourceTenderPackageName: 'Groundworks',
            approvalStatus: 'APPROVAL_FORM_CREATED',
            billApplyHistory: [{
              appliedAt: '2026-06-22T08:45:00.000Z',
              contractorId: 'contractor-1',
              sourceTenderPackageId: 'tender-1',
              sourceTenderPackageName: 'Groundworks',
              itemsUpdated: 12,
              itemsSkipped: 1,
              itemsWithNoContractorRate: 2,
              updatedItemIds: [],
              skippedItemIds: [],
              noRateItemIds: [],
            }],
          },
        },
      }),
      [
        operation({ id: 'entry-1', kind: 'export', subject: 'Project export' }),
        operation({ id: 'entry-2', projectId: 'other-project', subject: 'Other project export' }),
        operation({ id: 'entry-3', kind: 'bill', status: 'error', subject: 'Bill update failed', billId: 'bill-1' }),
      ]
    );

    expect(summary.counts).toMatchObject({
      snapshots: 1,
      operations: 2,
      exports: 1,
      tenderAwards: 1,
      applyBacks: 1,
      exceptions: 1,
    });
    expect(summary.items.map((item) => item.title)).toContain('Award selected: Alpha QS');
    expect(summary.items.map((item) => item.title)).toContain('Applied Alpha QS tender rates');
    expect(summary.items.find((item) => item.title === 'Bill update failed')).toMatchObject({
      tone: 'danger',
      actionTarget: 'bill',
      billId: 'bill-1',
    });
  });

  it('supports a global audit evidence view when no project is supplied', () => {
    const summary = buildProjectEvidence(null, [
      operation({ id: 'entry-1', projectId: undefined, kind: 'import' }),
      operation({ id: 'entry-2', projectId: 'project-2', kind: 'export' }),
    ]);

    expect(summary.counts.operations).toBe(2);
    expect(summary.counts.imports).toBe(1);
    expect(summary.counts.exports).toBe(1);
    expect(summary.metrics.find((metric) => metric.id === 'data-movement')?.value).toBe('2');
  });
});
