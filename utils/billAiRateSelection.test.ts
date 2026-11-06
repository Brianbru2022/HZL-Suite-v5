import { describe, expect, it } from 'vitest';
import type { BoQBill, BoQItem } from '../types';
import { applyLiveRatesToBill, getAiRateRowContext, getSelectedAiRateRows } from './billAiRateSelection';
import { getBillNavigationRows } from './billNavigation';

const row = (id: string, type: BoQItem['type'], description = id): BoQItem => ({ id, type, description, reference: '', unit: 'm2', quantity: 1, rate: 0, total: 0 });
const bill: BoQBill = { id: 'bill', name: 'Bill', sections: [
  { id: 'section-a', name: 'A', items: [
    row('h1', 'GENERAL_HEADING'), row('h3', 'SUB_SECTION'), row('comment', 'COMMENT'),
    row('item-1', 'PRICED'), row('subcomment', 'SUB_COMMENT'), row('item-2', 'PRICED'),
    row('peer-comment', 'COMMENT'), row('item-3', 'PRICED'), row('peer-h3', 'SUB_SECTION'), row('item-4', 'PRICED'),
  ] },
  { id: 'section-b', name: 'B', items: [row('item-5', 'PRICED')] },
] };

describe('selected AI rate scope', () => {
  it('includes priced children of a heading through the next peer, within its section', () => {
    expect(getSelectedAiRateRows(bill, new Set(['h3'])).map((entry) => entry.item.id)).toEqual(['item-1', 'item-2', 'item-3']);
    expect(getSelectedAiRateRows(bill, new Set(['h1'])).map((entry) => entry.item.id)).toEqual(['item-1', 'item-2', 'item-3', 'item-4']);
  });

  it('includes comment children and counts overlapping selections once', () => {
    expect(getSelectedAiRateRows(bill, new Set(['comment', 'item-2'])).map((entry) => entry.item.id)).toEqual(['item-1', 'item-2']);
    expect(getSelectedAiRateRows(bill, new Set(['item-3'])).map((entry) => entry.item.id)).toEqual(['item-3']);
  });

  it('uses active parent text for a short priced description', () => {
    expect(getAiRateRowContext(getBillNavigationRows(bill), 'item-2')).toBe('h1 > h3 > comment > subcomment');
    expect(getAiRateRowContext(getBillNavigationRows(bill), 'item-5')).toBe('');
  });

  it('applies reviewed rates atomically while preserving locked rows and totals', () => {
    const source = { ...bill, sections: bill.sections.map((section) => ({
      ...section,
      items: section.items.map((item) => item.id === 'item-2' ? { ...item, aiLocks: { description: false, rate: true, measurements: false } } : item),
    })) };
    const evidence = { rationale: 'Published UK rate evidence reviewed.', assessedAt: '2026-11-05T12:00:00Z', sources: [{ title: 'Supplier', url: 'https://example.com/rates' }] };
    const result = applyLiveRatesToBill(source, [
      { itemId: 'item-1', rate: 42, evidence },
      { itemId: 'item-2', rate: 99, evidence },
    ]);
    expect(result.sections[0].items.find((item) => item.id === 'item-1')).toMatchObject({ rate: 42, total: 42, rateSource: 'AI_LIVE', liveRateEvidence: evidence });
    expect(result.sections[0].items.find((item) => item.id === 'item-2')?.rate).toBe(0);
    expect(result.sections[1].items.find((item) => item.id === 'item-5')?.rate).toBe(0);
  });
});
