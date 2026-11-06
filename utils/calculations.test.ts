import { describe, it, expect } from 'vitest';
import {
  getSectionReference,
  calculateRowValue,
  calculateItemQuantity,
  isItemPricedAndComplete,
  calculateProjectProgress,
  reindexBillReferences,
  safeMul,
  safeAdd,
  safeSub,
} from './calculations';
import { UnitType } from '../types';

describe('safeMul', () => {
  it('avoids floating point drift', () => {
    expect(safeMul(0.1, 0.2)).toBe(0.02);
    expect(safeMul(2.5, 4)).toBe(10);
  });
});

describe('safeAdd / safeSub', () => {
  it('rounds to precision', () => {
    expect(safeAdd(0.1, 0.2)).toBe(0.3);
    expect(safeSub(1, 0.9)).toBe(0.1);
  });
});

describe('getSectionReference', () => {
  it('returns A–Z for indices 0–25', () => {
    expect(getSectionReference(0)).toBe('A');
    expect(getSectionReference(1)).toBe('B');
    expect(getSectionReference(25)).toBe('Z');
  });

  it('returns AA for index 26 (edge case: first two-letter)', () => {
    expect(getSectionReference(26)).toBe('AA');
  });

  it('returns AB for index 27', () => {
    expect(getSectionReference(27)).toBe('AB');
  });

  it('returns AZ for index 51 (edge case: last AA–AZ block)', () => {
    expect(getSectionReference(51)).toBe('AZ');
  });

  it('returns BA for index 52 (edge case: first BA block)', () => {
    expect(getSectionReference(52)).toBe('BA');
  });

  it('returns BZ for index 77', () => {
    expect(getSectionReference(77)).toBe('BZ');
  });

  it('returns ZZ for index 701 (last two-letter ref)', () => {
    expect(getSectionReference(701)).toBe('ZZ');
  });
});

describe('calculateRowValue M2', () => {
  it('uses length × height when height > 0', () => {
    const row = { id: '1', multiplier: 1, length: 10, width: 5, height: 2, comment: '', isDeduction: false };
    expect(calculateRowValue(row, UnitType.M2)).toBe(safeMul(1, safeMul(10, 2)));
  });

  it('uses length × width when height is 0 (plan area convention)', () => {
    const row = { id: '1', multiplier: 1, length: 10, width: 3, height: 0, comment: '', isDeduction: false };
    expect(calculateRowValue(row, UnitType.M2)).toBe(safeMul(1, safeMul(10, 3)));
  });

  it('uses length × width when height is undefined', () => {
    const row = { id: '1', multiplier: 1, length: 4, width: 2.5, height: undefined, comment: '', isDeduction: false };
    expect(calculateRowValue(row, UnitType.M2)).toBe(safeMul(1, safeMul(4, 2.5)));
  });
});

describe('calculateRowValue M, M3, NR', () => {
  it('M uses length and multiplier', () => {
    const row = { id: '1', multiplier: 2, length: 5, width: 0, height: 0, comment: '', isDeduction: false };
    expect(calculateRowValue(row, UnitType.M)).toBe(safeMul(2, 5));
  });

  it('M3 uses length × width × height', () => {
    const row = { id: '1', multiplier: 1, length: 2, width: 3, height: 4, comment: '', isDeduction: false };
    expect(calculateRowValue(row, UnitType.M3)).toBe(safeMul(1, safeMul(2, safeMul(3, 4))));
  });

  it('NR returns multiplier only', () => {
    const row = { id: '1', multiplier: 10, length: 0, width: 0, height: 0, comment: '', isDeduction: false };
    expect(calculateRowValue(row, UnitType.NR)).toBe(10);
  });
});

describe('calculateItemQuantity', () => {
  it('sums row values for unit', () => {
    const rows = [
      { id: '1', multiplier: 1, length: 10, width: 0, height: 0, comment: '', isDeduction: false },
      { id: '2', multiplier: 1, length: 5, width: 0, height: 0, comment: '', isDeduction: false },
    ];
    expect(calculateItemQuantity(rows, UnitType.M)).toBe(15);
  });

  it('subtracts deduction rows', () => {
    const rows = [
      { id: '1', multiplier: 1, length: 10, width: 0, height: 0, comment: '', isDeduction: false },
      { id: '2', multiplier: 1, length: 3, width: 0, height: 0, comment: '', isDeduction: true },
    ];
    expect(calculateItemQuantity(rows, UnitType.M)).toBe(safeSub(10, 3));
  });

  it('returns 0 for empty dimension rows', () => {
    expect(calculateItemQuantity([], UnitType.M)).toBe(0);
  });
});

describe('reindexBillReferences', () => {
  it('assigns hierarchical refs <Bill>-<Section>-<Page>-<Order>', () => {
    const bill = {
      id: 'b1',
      name: 'Bill',
      sections: [
        {
          id: 's1',
          name: 'Section 1',
          items: [
            { id: 'i1', type: 'PRICED', reference: '', description: 'Item', unit: 'nr', quantity: 1, rate: 10, total: 10 },
            { id: 'i2', type: 'PRICED', reference: '', description: 'Item 2', unit: 'nr', quantity: 1, rate: 5, total: 5 },
          ],
        },
        {
          id: 's2',
          name: 'Section 2',
          items: [
            { id: 'i3', type: 'PRICED', reference: '', description: 'Item 3', unit: 'nr', quantity: 1, rate: 1, total: 1 },
          ],
        },
      ],
    } as any;
    const out = reindexBillReferences(bill, 0);
    expect(out.sections[0].items[0].reference).toBe('A-01-01-01');
    expect(out.sections[0].items[1].reference).toBe('A-01-01-02');
    expect(out.sections[1].items[0].reference).toBe('A-02-01-01');
  });

  it('clears reference for non-PRICED items', () => {
    const bill = {
      id: 'b1',
      name: 'Bill',
      sections: [{
        id: 's1',
        name: 'S1',
        items: [
          { id: 'h1', type: 'MAJOR_HEADING', reference: 'x', description: 'Head', unit: '', quantity: 0, rate: 0, total: 0 },
          { id: 'i1', type: 'PRICED', reference: '', description: 'Item', unit: 'nr', quantity: 1, rate: 10, total: 10 },
        ],
      }],
    } as any;
    const out = reindexBillReferences(bill, 0);
    expect(out.sections[0].items[0].reference).toBe('');
    expect(out.sections[0].items[1].reference).toBe('A-01-01-01');
  });
});

describe('isItemPricedAndComplete', () => {
  it('returns false for non-PRICED items', () => {
    expect(isItemPricedAndComplete({ id: '1', type: 'COMMENT', reference: '', description: '', unit: 'nr', quantity: 0, rate: 0, total: 0 } as any)).toBe(false);
  });

  it('returns false when rate is 0', () => {
    expect(isItemPricedAndComplete({ id: '1', type: 'PRICED', reference: '', description: '', unit: 'nr', quantity: 1, rate: 0, total: 0 } as any)).toBe(false);
  });

  it('returns true when type is PRICED and rate > 0', () => {
    expect(isItemPricedAndComplete({ id: '1', type: 'PRICED', reference: '', description: '', unit: 'nr', quantity: 1, rate: 10, total: 10 } as any)).toBe(true);
  });
});

describe('calculateProjectProgress', () => {
  it('uses isItemPricedAndComplete (rate > 0) for completion', () => {
    const project = {
      id: 'p1', name: 'P', client: '', location: '', reference: '', updatedAt: '', measurementStandard: 'SMM7',
      ohpPercentage: 0,
      bills: [{
        id: 'b1', name: 'B1', sections: [{
          id: 's1', name: 'S1', items: [
            { id: 'i1', type: 'PRICED', reference: '', description: '', unit: 'nr', quantity: 1, rate: 5, total: 5 },
            { id: 'i2', type: 'PRICED', reference: '', description: '', unit: 'nr', quantity: 1, rate: 0, total: 0 },
          ],
        }],
      }],
    } as any;
    expect(calculateProjectProgress(project)).toBe(50);
  });
});
