import type { BoQBill, BoQItem, LibraryInsertPlacement } from '../types';

export const ROW_DROP_HINT = 'Drop below the highlighted row.';
export const LIBRARY_DROP_HINT = 'Drop below · Hold Ctrl to insert one library line.';

export function resolveRowDropPlacement(): 'after' {
  return 'after';
}

export function resolveHighlightedRow(
  items: BoQItem[],
  selectedItemIds: ReadonlySet<string>,
  activeItemId?: string | null,
): BoQItem | null {
  const selected = items.filter((item) => selectedItemIds.has(item.id));
  if (selected.length === 1) return selected[0];
  if (selectedItemIds.size > 0) return null;
  return items.find((item) => item.id === activeItemId) || null;
}

export function getBillDestinationItems(
  bill: BoQBill,
  sectionId?: string | null,
  pageId?: string | null,
): BoQItem[] | null {
  if (!sectionId) return pageId ? null : bill.items || [];
  const section = bill.sections.find((entry) => entry.id === sectionId);
  if (!section) return null;
  if (pageId) return section.pages?.find((entry) => entry.id === pageId)?.items || null;
  return section.pages?.length ? null : section.items || [];
}

export function isBillInsertDestinationValid(
  bill: BoQBill,
  destination: { sectionId?: string | null; pageId?: string | null; placement: LibraryInsertPlacement; anchorItemId?: string | null },
): boolean {
  const items = getBillDestinationItems(bill, destination.sectionId, destination.pageId);
  if (!items) return false;
  if (destination.placement === 'TOP' || destination.placement === 'BOTTOM') return true;
  return Boolean(destination.anchorItemId && items.some((item) => item.id === destination.anchorItemId));
}
