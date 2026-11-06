import type { BoQBill, BoQItem } from '../types';
import { PRICED_TYPES } from './libraryViewModel';

export interface BillNavigationRow {
  item: BoQItem;
  sectionId: string;
  pageId?: string;
}

/** All bill rows in display order, including section and page scopes. */
export function getBillNavigationRows(bill: BoQBill): BillNavigationRow[] {
  const rows: BillNavigationRow[] = [];
  for (const item of bill.items || []) rows.push({ item, sectionId: '' });
  for (const section of bill.sections) {
    for (const item of section.items || []) rows.push({ item, sectionId: section.id });
    for (const page of section.pages || []) {
      for (const item of page.items || []) rows.push({ item, sectionId: section.id, pageId: page.id });
    }
  }
  return rows;
}

export function getAdjacentBillRow(
  rows: BillNavigationRow[],
  itemId: string,
  direction: -1 | 1,
  pricedOnly = false,
): BillNavigationRow | null {
  const index = rows.findIndex((row) => row.item.id === itemId);
  if (index < 0) return null;
  for (let next = index + direction; next >= 0 && next < rows.length; next += direction) {
    if (!pricedOnly || PRICED_TYPES.has(rows[next].item.type)) return rows[next];
  }
  return null;
}
