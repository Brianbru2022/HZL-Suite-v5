import { describe, expect, it } from 'vitest';
import type { BoQBill, BoQItem } from '../types';
import { getBillDestinationItems, isBillInsertDestinationValid, resolveHighlightedRow, resolveRowDropPlacement } from './billPlacement';
import { resolveLibraryDropPayload, insertItemsAtPlacement } from './libraryInsert';

const row = (id: string): BoQItem => ({ id, type: 'PRICED', reference: id, description: id, unit: 'nr', quantity: 2, rate: 3, total: 6 });

describe('bill insertion destinations', () => {
  it.each([false, true])('places library contents below the target with Ctrl=%s', (ctrlKey) => {
    const rows = ['A', 'B', 'C'].map(row);
    const block = [row('heading'), row('X'), row('Y')];
    expect(resolveRowDropPlacement()).toBe('after');
    const payload = resolveLibraryDropPayload({ kind: 'HZL_LIBRARY_INSERT', selectedItemId: 'X', sourceItems: block, defaultMode: 'FROM_HEADING' }, ctrlKey);
    expect(insertItemsAtPlacement(rows, payload.sourceItems, 'AFTER_SELECTED', 'B').map((item) => item.id)).toEqual(
      ctrlKey ? ['A', 'B', 'X', 'C'] : ['A', 'B', 'heading', 'X', 'Y', 'C'],
    );
    expect(block.map((item) => item.id)).toEqual(['heading', 'X', 'Y']);
    expect(rows.map((item) => item.id)).toEqual(['A', 'B', 'C']);
  });

  it('uses one selected row, otherwise the active row, and never guesses between selections', () => {
    const rows = ['A', 'B', 'C'].map(row);
    expect(resolveHighlightedRow(rows, new Set(['B']), 'A')?.id).toBe('B');
    expect(resolveHighlightedRow(rows, new Set(), 'B')?.id).toBe('B');
    expect(resolveHighlightedRow(rows, new Set(['A', 'C']), 'B')).toBeNull();
    expect(resolveHighlightedRow(rows, new Set(['another-page']), 'B')).toBeNull();
  });

  it('distinguishes empty destinations from deleted sections, pages and anchors', () => {
    const bill: BoQBill = { id: 'bill', name: 'Bill', items: [row('direct')], sections: [
      { id: 'section', name: 'Section', items: [row('B')] },
      { id: 'paged', name: 'Paged', items: [], pages: [{ id: 'page', items: [] }] },
    ] };
    expect(getBillDestinationItems(bill, 'paged', 'page')).toEqual([]);
    expect(getBillDestinationItems(bill, 'paged')).toBeNull();
    expect(isBillInsertDestinationValid(bill, { sectionId: 'paged', pageId: 'page', placement: 'BOTTOM' })).toBe(true);
    expect(isBillInsertDestinationValid(bill, { sectionId: 'section', placement: 'AFTER_SELECTED', anchorItemId: 'B' })).toBe(true);
    expect(isBillInsertDestinationValid(bill, { sectionId: 'section', placement: 'AFTER_SELECTED', anchorItemId: 'direct' })).toBe(false);
    expect(isBillInsertDestinationValid(bill, { sectionId: 'removed', placement: 'BOTTOM' })).toBe(false);
    expect(isBillInsertDestinationValid(bill, { sectionId: 'paged', pageId: 'removed', placement: 'BOTTOM' })).toBe(false);
    expect(isBillInsertDestinationValid(bill, { sectionId: 'section', placement: 'BEFORE_SELECTED', anchorItemId: 'removed' })).toBe(false);
  });
});
