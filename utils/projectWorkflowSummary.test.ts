import { describe, expect, it } from 'vitest';
import type { BoQItem, Project } from '../types';
import { buildProjectWorkflowSummary } from './projectWorkflowSummary';

function item(id: string, overrides: Partial<BoQItem> = {}): BoQItem {
  return {
    id,
    type: 'PRICED',
    reference: id,
    description: id,
    unit: 'nr',
    quantity: 1,
    rate: 0,
    total: 0,
    ...overrides,
  };
}

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    name: 'Test Project',
    client: '',
    location: '',
    reference: '',
    updatedAt: '2026-06-16T10:00:00.000Z',
    measurementStandard: 'SMM7',
    ohpPercentage: 0,
    bills: [{
      id: 'bill-1',
      name: 'Bill 1',
      sections: [{
        id: 'section-1',
        name: 'Section 1',
        items: [item('priced', { rate: 10, total: 10, tradePackageId: 'trade-1' }), item('unpriced')],
      }],
    }],
    ...overrides,
  };
}

describe('buildProjectWorkflowSummary', () => {
  it('summarises estimating, trade, tender, and report readiness', () => {
    const summary = buildProjectWorkflowSummary(project({
      tenderContractors: { 'trade-1': ['contractor-1', 'contractor-2'] },
      tenderAwards: { 'trade-1': {} as never },
      costPlan: {} as never,
    }));

    expect(summary.billCount).toBe(1);
    expect(summary.sectionCount).toBe(1);
    expect(summary.pricedItemCount).toBe(2);
    expect(summary.unpricedItemCount).toBe(1);
    expect(summary.assignedTradeCount).toBe(1);
    expect(summary.tenderContractorCount).toBe(2);
    expect(summary.tenderAwardCount).toBe(1);
    expect(summary.estimatingStatus).toBe('Needs pricing');
    expect(summary.tenderStatus).toBe('Part awarded');
    expect(summary.reportsStatus).toBe('Cost plan ready');
  });
});
