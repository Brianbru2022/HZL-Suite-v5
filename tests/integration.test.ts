import { describe, it, expect } from 'vitest';
import {
  getSectionItems,
  reindexBillReferences,
  calculateProjectTotal,
  getSectionReference,
} from '../utils/calculations';
import type { Project, BoQBill, BoQSection, BoQItem } from '../types';

describe('Integration: create project → add bill → add item → export flow', () => {
  it('builds project with one bill, one section, one item; reindex assigns refs; total is correct', () => {
    const item: BoQItem = {
      id: 'item-1',
      type: 'PRICED',
      reference: '',
      description: 'Excavate topsoil',
      unit: 'm³',
      quantity: 10,
      rate: 25,
      total: 250,
    };
    const section: BoQSection = {
      id: 'sec-1',
      name: 'Preliminaries',
      items: [item],
    };
    const bill: BoQBill = {
      id: 'bill-1',
      name: 'Main Bill',
      sections: [section],
    };
    const project: Project = {
      id: 'proj-1',
      name: 'Test Project',
      client: '',
      location: '',
      reference: '',
      updatedAt: new Date().toISOString(),
      measurementStandard: 'SMM7',
      ohpPercentage: 10,
      bills: [bill],
    };

    const reindexed = reindexBillReferences(project.bills[0], 0);
    expect(reindexed.sections[0].items[0].reference).toBe('A-01-01-01');

    const total = calculateProjectTotal(project);
    expect(total).toBe(250);
  });

  it('multiple sections get A, B, C refs and item refs A1, B1, etc.', () => {
    const bill: BoQBill = {
      id: 'b1',
      name: 'Bill',
      sections: [
        { id: 's1', name: 'S1', items: [{ id: 'i1', type: 'PRICED', reference: '', description: 'X', unit: 'nr', quantity: 1, rate: 100, total: 100 }] },
        { id: 's2', name: 'S2', items: [{ id: 'i2', type: 'PRICED', reference: '', description: 'Y', unit: 'nr', quantity: 1, rate: 50, total: 50 }] },
      ],
    };
    const out = reindexBillReferences(bill, 0);
    expect(out.sections[0].items[0].reference).toBe('A-01-01-01');
    expect(out.sections[1].items[0].reference).toBe('A-02-01-01');

    const project: Project = {
      id: 'p', name: 'P', client: '', location: '', reference: '', updatedAt: '', measurementStandard: 'SMM7',
      ohpPercentage: 0,
      bills: [out],
    };
    expect(calculateProjectTotal(project)).toBe(150);
  });

  it('export shape: project can be JSON.stringify-ed for export', () => {
    const project: Project = {
      id: 'p',
      name: 'Export Test',
      client: 'Client',
      location: 'London',
      reference: 'REF-1',
      updatedAt: new Date().toISOString(),
      measurementStandard: 'NRM2',
      ohpPercentage: 15,
      bills: [{
        id: 'b1',
        name: 'Bill 1',
        sections: [{
          id: 's1',
          name: 'Section A',
          items: [
            { id: 'i1', type: 'PRICED', reference: 'A1', description: 'Item', unit: 'nr', quantity: 2, rate: 10, total: 20 },
          ],
        }],
      }],
    };
    const json = JSON.stringify(project);
    const parsed = JSON.parse(json) as Project;
    expect(parsed.id).toBe('p');
    expect(parsed.bills[0].sections[0].items[0].reference).toBe('A1');
    expect(parsed.bills[0].sections[0].items[0].total).toBe(20);
  });

  it('treats paged section items as first-class project data', () => {
    const bill: BoQBill = {
      id: 'b-paged',
      name: 'Paged Bill',
      sections: [
        {
          id: 's-paged',
          name: 'Paged Section',
          items: [],
          pages: [
            {
              id: 'p1',
              name: 'Page 01',
              items: [
                { id: 'i1', type: 'PRICED', reference: '', description: 'Excavate trench', unit: 'm', quantity: 12, rate: 15, total: 180 },
              ],
            },
            {
              id: 'p2',
              name: 'Page 02',
              items: [
                { id: 'i2', type: 'PRICED', reference: '', description: 'Concrete fill', unit: 'm3', quantity: 4, rate: 95, total: 380 },
              ],
            },
          ],
        },
      ],
    };

    const reindexed = reindexBillReferences(bill, 0);
    const section = reindexed.sections[0];

    expect(getSectionItems(section)).toHaveLength(2);
    expect(section.pages?.[0].items[0].reference).toBe('A-01-01-01');
    expect(section.pages?.[1].items[0].reference).toBe('A-01-02-01');

    const project: Project = {
      id: 'proj-paged',
      name: 'Paged Project',
      client: '',
      location: '',
      reference: '',
      updatedAt: new Date().toISOString(),
      measurementStandard: 'SMM7',
      ohpPercentage: 0,
      bills: [reindexed],
    };

    expect(calculateProjectTotal(project)).toBe(560);
  });
});
