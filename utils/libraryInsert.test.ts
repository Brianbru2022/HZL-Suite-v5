import { describe, expect, it, vi } from 'vitest';
import type { BoQItem } from '../types';
import {
  beginLibraryInsertDrag,
  buildBillItemsFromLibraryInsert,
  clearLibraryInsertDrag,
  getLibraryInsertItems,
  getParentContextItems,
  getActiveLibraryInsertDragPayload,
  hasLibraryInsertDragPayload,
  insertItemsAtPlacement,
  LIBRARY_INSERT_DRAG_JSON_MIME,
  LIBRARY_INSERT_DRAG_MIME,
  parseLibraryInsertDragPayload,
  serializeLibraryInsertDragPayload,
} from './libraryInsert';

vi.mock('./generateId', () => ({
  generateId: vi.fn(() => `new-${Math.random().toString(36).slice(2, 6)}`),
}));

function item(id: string, type: BoQItem['type'], description = id, reference = id): BoQItem {
  return {
    id,
    type,
    reference,
    description,
    unit: type === 'PRICED' ? 'nr' : '',
    quantity: type === 'PRICED' ? 1 : 0,
    rate: type === 'PRICED' ? 10 : 0,
    total: type === 'PRICED' ? 10 : 0,
    dimensionRows: [{ id: `${id}-dim`, multiplier: 1, length: 1, width: 1, height: 1 }],
  };
}

function dataTransfer(values: Record<string, string>): DataTransfer {
  return {
    types: Object.keys(values),
    getData: (type: string) => values[type] || '',
  } as unknown as DataTransfer;
}

describe('libraryInsert helpers', () => {
  const source = [
    item('h1', 'GENERAL_HEADING', 'Groundworks', 'A'),
    item('h2', 'MAJOR_HEADING', 'Excavation', 'A10'),
    item('c1', 'COMMENT', 'Common comment', ''),
    item('p1', 'PRICED', 'Excavate trench', '1'),
    item('h2b', 'MAJOR_HEADING', 'Concrete', 'A20'),
    item('p2', 'PRICED', 'Pour concrete', '2'),
  ];

  it('finds parent headings before a priced library item', () => {
    expect(getParentContextItems(source, 3).map((entry) => entry.id)).toEqual(['h1', 'h2', 'c1']);
  });

  it('builds mode-specific source selections', () => {
    expect(getLibraryInsertItems(source, 'p1', 'ITEM_ONLY').map((entry) => entry.id)).toEqual(['p1']);
    expect(getLibraryInsertItems(source, 'p1', 'WITH_MISSING_PARENTS').map((entry) => entry.id)).toEqual(['h1', 'h2', 'c1', 'p1']);
    expect(getLibraryInsertItems(source, 'h2', 'FROM_HEADING').map((entry) => entry.id)).toEqual(['h1', 'h2', 'c1', 'p1']);
    expect(getLibraryInsertItems(source, 'c1', 'FROM_COMMENT').map((entry) => entry.id)).toEqual(['h1', 'h2', 'c1', 'p1']);
    expect(getLibraryInsertItems(source, 'h1', 'FULL_SECTION').map((entry) => entry.id)).toEqual(source.map((entry) => entry.id));
  });

  it('deduplicates non-priced structure rows but keeps priced rows', () => {
    const existing = [item('existing-h1', 'GENERAL_HEADING', 'Groundworks', 'A')];
    const result = buildBillItemsFromLibraryInsert(source, 'p1', 'WITH_MISSING_PARENTS', existing);
    expect(result.map((entry) => entry.type)).toEqual(['MAJOR_HEADING', 'COMMENT', 'PRICED']);
    expect(result[result.length - 1].rate).toBe(0);
    expect(result[result.length - 1].dimensionRows).toEqual([]);
  });

  it('keeps a selected heading when item-only mode is used beside an existing heading', () => {
    const existing = [item('existing-h2', 'MAJOR_HEADING', 'Excavation', 'A10')];
    const result = buildBillItemsFromLibraryInsert(source, 'h2', 'ITEM_ONLY', existing);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('MAJOR_HEADING');
    expect(result[0].description).toBe('Excavation');
  });

  it('restores family context after inserting another family', () => {
    const first = buildBillItemsFromLibraryInsert(source, 'p1', 'WITH_MISSING_PARENTS', []);
    const second = buildBillItemsFromLibraryInsert(source, 'p2', 'WITH_MISSING_PARENTS', first);
    const again = buildBillItemsFromLibraryInsert(source, 'p1', 'WITH_MISSING_PARENTS', [...first, ...second]);
    expect(again.map((r) => r.type)).toEqual(['MAJOR_HEADING', 'COMMENT', 'PRICED']);
    expect(again[1].description).toBe('Common comment');
  });

  it('does not deduplicate context against rows after the insertion position', () => {
    const existing = buildBillItemsFromLibraryInsert(source, 'p1', 'WITH_MISSING_PARENTS', []);
    const top = buildBillItemsFromLibraryInsert(source, 'p1', 'WITH_MISSING_PARENTS', existing, { placement: 'TOP' });
    expect(top.map((r) => r.type)).toEqual(['GENERAL_HEADING', 'MAJOR_HEADING', 'COMMENT', 'PRICED']);
    const before = buildBillItemsFromLibraryInsert(source, 'p1', 'WITH_MISSING_PARENTS', existing, { placement: 'BEFORE_SELECTED', anchorItemId: existing[1].id });
    expect(before.map((r) => r.type)).toEqual(['MAJOR_HEADING', 'COMMENT', 'PRICED']);
  });

  it('inserts at the requested placement', () => {
    const existing = [item('a', 'PRICED'), item('b', 'PRICED')];
    const inserted = [item('x', 'COMMENT')];
    expect(insertItemsAtPlacement(existing, inserted, 'TOP').map((entry) => entry.id)).toEqual(['x', 'a', 'b']);
    expect(insertItemsAtPlacement(existing, inserted, 'AFTER_SELECTED', 'a').map((entry) => entry.id)).toEqual(['a', 'x', 'b']);
    expect(insertItemsAtPlacement(existing, inserted, 'BEFORE_SELECTED', 'b').map((entry) => entry.id)).toEqual(['a', 'x', 'b']);
  });

  it('parses standards drag payloads from custom, json, and text fallbacks', () => {
    const payload = {
      kind: 'HZL_LIBRARY_INSERT' as const,
      selectedItemId: 'p1',
      selectedItemType: 'PRICED' as const,
      sourceItems: source,
      defaultMode: 'WITH_MISSING_PARENTS' as const,
      label: 'Excavate trench',
    };
    const jsonPayload = JSON.stringify(payload);
    const textPayload = serializeLibraryInsertDragPayload(payload);

    expect(parseLibraryInsertDragPayload(dataTransfer({ [LIBRARY_INSERT_DRAG_MIME]: jsonPayload }))?.selectedItemId).toBe('p1');
    expect(parseLibraryInsertDragPayload(dataTransfer({ [LIBRARY_INSERT_DRAG_JSON_MIME]: jsonPayload }))?.selectedItemId).toBe('p1');
    expect(parseLibraryInsertDragPayload(dataTransfer({ 'text/plain': textPayload }))?.selectedItemId).toBe('p1');
  });

  it('detects standards drags without treating bill row drags as standards drags', () => {
    expect(hasLibraryInsertDragPayload(dataTransfer({ [LIBRARY_INSERT_DRAG_MIME]: '{}' }))).toBe(true);
    expect(hasLibraryInsertDragPayload(dataTransfer({ [LIBRARY_INSERT_DRAG_JSON_MIME]: '{}' }))).toBe(true);
    expect(hasLibraryInsertDragPayload(dataTransfer({
      [LIBRARY_INSERT_DRAG_JSON_MIME]: '{}',
      'application/x-qs-bill-item': '{}',
    }))).toBe(false);
  });

  it('falls back to the active same-window standards drag session', () => {
    const payload = {
      kind: 'HZL_LIBRARY_INSERT' as const,
      selectedItemId: 'p1',
      selectedItemType: 'PRICED' as const,
      sourceItems: source,
      defaultMode: 'WITH_MISSING_PARENTS' as const,
      label: 'Excavate trench',
    };

    beginLibraryInsertDrag(payload);
    expect(getActiveLibraryInsertDragPayload()?.selectedItemId).toBe('p1');
    expect(hasLibraryInsertDragPayload(dataTransfer({}))).toBe(true);
    expect(parseLibraryInsertDragPayload(dataTransfer({}))?.selectedItemId).toBe('p1');

    clearLibraryInsertDrag();
    expect(getActiveLibraryInsertDragPayload()).toBeNull();
    expect(hasLibraryInsertDragPayload(dataTransfer({}))).toBe(false);
  });
});
