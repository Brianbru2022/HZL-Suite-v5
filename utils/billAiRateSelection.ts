import type { BoQBill, BoQItem } from '../types';
import { getBillNavigationRows, type BillNavigationRow } from './billNavigation';
import { getLibraryHeadingLevel, PRICED_TYPES } from './libraryViewModel';
import { safeMul } from './calculations';
import { stripRichText } from './richText';

export interface BillAiRateUpdate {
  itemId: string;
  rate: number;
  evidence: NonNullable<BoQItem['liveRateEvidence']>;
}

function scopeKey(row: BillNavigationRow) {
  return `${row.sectionId}\u0000${row.pageId || ''}`;
}

/** A selected heading/comment includes priced descendants until the next peer or ancestor. */
export function getSelectedAiRateRows(bill: BoQBill, selectedIds: ReadonlySet<string>): BillNavigationRow[] {
  const rows = getBillNavigationRows(bill);
  const included = new Set<string>();
  for (let index = 0; index < rows.length; index += 1) {
    const selected = rows[index];
    if (!selectedIds.has(selected.item.id)) continue;
    if (PRICED_TYPES.has(selected.item.type)) {
      included.add(selected.item.id);
      continue;
    }
    const level = getLibraryHeadingLevel(selected.item.type);
    if (level === Number.MAX_SAFE_INTEGER) continue;
    const scope = scopeKey(selected);
    for (let childIndex = index + 1; childIndex < rows.length; childIndex += 1) {
      const child = rows[childIndex];
      if (scopeKey(child) !== scope) break;
      if (getLibraryHeadingLevel(child.item.type) <= level) break;
      if (PRICED_TYPES.has(child.item.type)) included.add(child.item.id);
    }
  }
  return rows.filter((row) => included.has(row.item.id));
}

/** Include only the active parent descriptions, so short child rows have a useful pricing scope. */
export function getAiRateRowContext(rows: BillNavigationRow[], targetId: string): string {
  const parents = new Map<number, string>();
  let scope = '';
  for (const row of rows) {
    if (scope !== scopeKey(row)) { parents.clear(); scope = scopeKey(row); }
    const level = getLibraryHeadingLevel(row.item.type);
    if (level !== Number.MAX_SAFE_INTEGER) {
      for (const key of parents.keys()) if (key >= level) parents.delete(key);
      const description = stripRichText(row.item.description).trim();
      if (description) parents.set(level, description);
    }
    if (row.item.id === targetId) break;
  }
  return [...parents.values()].join(' > ');
}

/** Commit reviewed rates across bill, section and page rows in one project update. */
export function applyLiveRatesToBill(bill: BoQBill, updates: BillAiRateUpdate[]): BoQBill {
  const byId = new Map(updates.map((update) => [update.itemId, update]));
  const updateItems = (items: BoQItem[]) => items.map((item) => {
    const update = byId.get(item.id);
    if (!update || !PRICED_TYPES.has(item.type) || item.aiLocks?.rate || item.rateBuildUp?.mode === 'DERIVED' || !Number.isFinite(update.rate) || update.rate <= 0) return item;
    return {
      ...item,
      rate: update.rate,
      total: safeMul(item.quantity, update.rate),
      rateSource: 'AI_LIVE',
      liveRateEvidence: update.evidence,
      rateBuildUp: item.rateBuildUp ? { ...item.rateBuildUp, mode: 'SINGLE_RATE' as const, updatedAt: new Date().toISOString() } : undefined,
    };
  });
  return {
    ...bill,
    items: bill.items ? updateItems(bill.items) : undefined,
    sections: bill.sections.map((section) => ({
      ...section,
      items: updateItems(section.items || []),
      pages: section.pages?.map((page) => ({ ...page, items: updateItems(page.items || []) })),
    })),
  };
}
