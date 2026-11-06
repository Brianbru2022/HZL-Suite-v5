import { describe, expect, it } from 'vitest';
import type { BoQItem, Project } from '../types';
import { UnitType } from '../types';
import {
  collectRevisionStats,
  createBoqRevisionPoint,
  summariseBoqRevisionDelta,
} from './boqRevisionPoints';

function makeItem(overrides: Partial<BoQItem> = {}): BoQItem {
  return {
    id: 'item-1',
    type: 'PRICED',
    reference: '1.1',
    description: 'Excavate trench',
    unit: UnitType.M3,
    quantity: 1,
    quantityDecimals: 0,
    rate: 100,
    total: 100,
    ...overrides,
  };
}

function makeProject(items: BoQItem[], overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    name: 'Pilot project',
    client: 'HZL',
    location: 'Site',
    reference: 'P-001',
    updatedAt: '2026-06-23T10:00:00.000Z',
    measurementStandard: 'SMM7',
    ohpPercentage: 0,
    bills: [
      {
        id: 'bill-1',
        name: 'Bill 1',
        sections: [
          {
            id: 'section-1',
            name: 'Groundworks',
            items: [],
            pages: [
              {
                id: 'page-1',
                name: 'Page 1',
                items,
              },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('boqRevisionPoints', () => {
  it('creates a bill-scoped BoQ revision snapshot with useful stats', () => {
    const project = makeProject([
      makeItem(),
      makeItem({ id: 'heading-1', type: 'MAJOR_HEADING', reference: 'A', description: 'Groundworks', unit: '', quantity: 0, rate: 0, total: 0 }),
    ]);

    const snapshot = createBoqRevisionPoint(project, project.bills[0]);
    const stats = collectRevisionStats(project, snapshot.scope);

    expect(snapshot.kind).toBe('BOQ_REVISION');
    expect(snapshot.scope).toMatchObject({ type: 'BILL', billId: 'bill-1', billName: 'Bill 1' });
    expect(snapshot.label).toContain('BoQ revision - Bill 1');
    expect(snapshot.summary).toContain('2 bill rows');
    expect(stats).toMatchObject({ bills: 1, sections: 1, pages: 1, items: 2, pricedItems: 1, value: 100 });
  });

  it('stores custom revision labels and notes', () => {
    const project = makeProject([makeItem()]);

    const snapshot = createBoqRevisionPoint(project, project.bills[0], {
      label: 'Before client changes',
      note: 'Instruction 04 pricing changes',
    });

    expect(snapshot.label).toBe('Before client changes');
    expect(snapshot.note).toBe('Instruction 04 pricing changes');
    expect(snapshot.summary).toContain('1 bill row');
  });

  it('summarises added, removed, changed, and value movement against the live BoQ', () => {
    const originalItem = makeItem({ id: 'item-1', quantity: 1, rate: 100, total: 100 });
    const removedItem = makeItem({ id: 'item-removed', reference: '1.2', description: 'Remove spoil', total: 25 });
    const snapshotProject = makeProject([originalItem, removedItem]);
    const snapshot = createBoqRevisionPoint(snapshotProject, snapshotProject.bills[0]);
    const currentProject = makeProject([
      makeItem({ id: 'item-1', quantity: 2, rate: 60, total: 120 }),
      makeItem({ id: 'item-added', reference: '1.3', description: 'Backfill trench', rate: 30, total: 30 }),
    ]);

    const delta = summariseBoqRevisionDelta(snapshot, currentProject);

    expect(delta.scopeLabel).toBe('Bill 1');
    expect(delta.addedItems).toBe(1);
    expect(delta.removedItems).toBe(1);
    expect(delta.changedItems).toBe(1);
    expect(delta.before.value).toBe(125);
    expect(delta.current.value).toBe(150);
    expect(delta.valueDelta).toBe(25);
  });
});
