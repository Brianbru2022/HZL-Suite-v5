import { describe, expect, it } from 'vitest';
import type { BoQBill, BoQItem } from '../types';
import { getAdjacentBillRow, getBillNavigationRows } from './billNavigation';

const row = (id: string, type: BoQItem['type']): BoQItem => ({
  id, type, reference: '', description: id, unit: '', quantity: 0, rate: 0, total: 0,
});

describe('bill row navigation', () => {
  it('moves through bill, section and page rows and skips headings for priced jumps', () => {
    const bill: BoQBill = {
      id: 'bill', name: 'Bill', items: [row('bill-heading', 'GENERAL_HEADING')],
      sections: [
        { id: 'section-a', name: 'A', items: [row('a-priced', 'PRICED'), row('a-comment', 'COMMENT')] },
        { id: 'section-b', name: 'B', items: [], pages: [
          { id: 'page-b', items: [row('b-heading', 'MAJOR_HEADING'), row('b-priced', 'PROVISIONAL_SUM')] },
        ] },
      ],
    };
    const rows = getBillNavigationRows(bill);
    expect(rows.map((entry) => entry.item.id)).toEqual(['bill-heading', 'a-priced', 'a-comment', 'b-heading', 'b-priced']);
    expect(getAdjacentBillRow(rows, 'a-comment', 1)?.item.id).toBe('b-heading');
    expect(getAdjacentBillRow(rows, 'a-comment', 1, true)?.item.id).toBe('b-priced');
    expect(getAdjacentBillRow(rows, 'b-priced', -1, true)?.item.id).toBe('a-priced');
    expect(getAdjacentBillRow(rows, 'bill-heading', -1)).toBeNull();
    expect(getAdjacentBillRow(rows, 'missing', 1)).toBeNull();
  });
});
