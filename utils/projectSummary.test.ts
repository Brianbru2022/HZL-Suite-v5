import { describe, expect, it } from 'vitest';
import type { Project } from '../types';
import { buildProjectSummary } from './projectSummary';

const project: Project = {
  id: 'p1',
  name: 'Test Project',
  client: '',
  location: '',
  reference: 'REF',
  updatedAt: new Date().toISOString(),
  measurementStandard: 'SMM7',
  ohpPercentage: 0,
  bills: [
    {
      id: 'b1',
      name: 'House Type A',
      billType: 'HOUSE_TYPE',
      houseTypeQuantity: 3,
      sections: [
        {
          id: 's1',
          name: 'Substructure',
          items: [
            { id: 'i1', type: 'PRICED', reference: 'A', description: 'Foundations', unit: 'Sum', quantity: 1, rate: 1000, total: 1000 },
          ],
        },
      ],
      items: [],
    },
    {
      id: 'b2',
      name: 'External Works',
      billType: 'STANDARD',
      houseTypeQuantity: 1,
      sections: [
        {
          id: 's2',
          name: 'Surfacing',
          items: [
            { id: 'i2', type: 'PRICED', reference: 'B', description: 'Paving', unit: 'Sum', quantity: 1, rate: 500, total: 500 },
          ],
        },
      ],
      items: [],
    },
  ],
};

describe('buildProjectSummary', () => {
  it('multiplies house type bills in bill summary mode', () => {
    const summary = buildProjectSummary(project, 'BILLS');
    expect(summary.rows).toHaveLength(2);
    expect(summary.rows[0].summaryValue).toBe(3000);
    expect(summary.summaryTotal).toBe(3500);
  });

  it('multiplies house type sections in bill and section summary mode', () => {
    const summary = buildProjectSummary(project, 'BILLS_AND_SECTIONS');
    expect(summary.rows).toHaveLength(2);
    const houseTypeRow = summary.rows.find((row) => row.billId === 'b1');
    expect(houseTypeRow?.summaryValue).toBe(3000);
    expect(summary.summaryTotal).toBe(3500);
  });
});
