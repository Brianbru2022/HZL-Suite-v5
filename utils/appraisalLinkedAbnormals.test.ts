import { describe, expect, it } from 'vitest';
import type { AppraisalCostLine, DevelopmentAppraisalOption, Project } from '../types';
import { UnitType } from '../types';
import {
  refreshLinkedAbnormalAppraisal,
  refreshLinkedAbnormalLines,
  resolveLinkedAbnormalAmount,
} from './appraisalLinkedAbnormals';

function linkedLine(overrides: Partial<AppraisalCostLine> = {}): AppraisalCostLine {
  return {
    id: 'abnormal-1',
    title: 'Linked abnormal',
    category: 'ABNORMALS',
    amount: 0,
    cashflow: { type: 'EVEN', startMonth: 1, endMonth: 12 },
    sourceProjectId: 'project-1',
    sourceBillId: 'bill-1',
    readOnlySnapshot: true,
    ...overrides,
  };
}

function projectWithTotals(): Project {
  return {
    id: 'project-1',
    name: 'Linked estimate',
    client: '',
    location: '',
    reference: '',
    updatedAt: '2026-07-06T00:00:00.000Z',
    measurementStandard: 'NRM2',
    ohpPercentage: 0,
    bills: [
      {
        id: 'bill-1',
        name: 'Abnormal bill',
        sections: [
          {
            id: 'section-1',
            name: 'Retaining walls',
            items: [
              { id: 'item-1', type: 'PRICED', reference: '1', description: 'Wall', unit: UnitType.SUM, quantity: 1, rate: 100, total: 100 },
              { id: 'item-2', type: 'COMMENT', reference: '', description: 'Ignore me', unit: UnitType.SUM, quantity: 0, rate: 0, total: 999 },
            ],
          },
          {
            id: 'section-2',
            name: 'Drainage',
            items: [
              { id: 'item-3', type: 'EXTRA_OVER_ITEM', reference: '2', description: 'Drain', unit: UnitType.SUM, quantity: 1, rate: 250, total: 250 },
            ],
          },
        ],
      },
    ],
  };
}

describe('linked appraisal abnormals', () => {
  it('resolves the current bill total for linked abnormal rows', () => {
    expect(resolveLinkedAbnormalAmount(linkedLine(), [projectWithTotals()])).toBe(350);
  });

  it('resolves the current section total when a section is linked', () => {
    expect(resolveLinkedAbnormalAmount(linkedLine({ sourceSectionId: 'section-2' }), [projectWithTotals()])).toBe(250);
  });

  it('refreshes linked abnormal line amounts without changing unlinked manual abnormals', () => {
    const option = {
      id: 'option-1',
      costLines: [
        linkedLine({ amount: 10 }),
        linkedLine({ id: 'manual-1', amount: 25, sourceProjectId: undefined, sourceBillId: undefined }),
      ],
    } as DevelopmentAppraisalOption;

    const refreshed = refreshLinkedAbnormalLines(option, [projectWithTotals()]);

    expect(refreshed.costLines[0].amount).toBe(350);
    expect(refreshed.costLines[1].amount).toBe(25);
  });

  it('does not refresh frozen linked abnormal lines', () => {
    const option = {
      id: 'option-1',
      costLines: [
        linkedLine({ amount: 10, linkedAbnormalFrozen: true, linkedAbnormalFrozenAt: '2026-07-08T00:00:00.000Z' }),
      ],
    } as DevelopmentAppraisalOption;

    const refreshed = refreshLinkedAbnormalLines(option, [projectWithTotals()]);

    expect(refreshed).toBe(option);
    expect(refreshed.costLines[0].amount).toBe(10);
  });

  it('returns the same appraisal object when linked amounts have not changed', () => {
    const appraisal = {
      id: 'appraisal-1',
      options: [{ id: 'option-1', costLines: [linkedLine({ amount: 350 })] }],
    } as unknown as Parameters<typeof refreshLinkedAbnormalAppraisal>[0];

    expect(refreshLinkedAbnormalAppraisal(appraisal, [projectWithTotals()])).toBe(appraisal);
  });
});
