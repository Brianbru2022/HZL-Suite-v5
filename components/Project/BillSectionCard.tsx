import React, { useRef, useState } from 'react';
import { Award, Banknote, CheckSquare, ChevronDown, Coins, Eraser, GripVertical, Layers, MoreHorizontal, Plus, Square } from 'lucide-react';
import type { BoQBill, BoQItem, BoQPage, BoQSection, ClearValuesMode, ItemType, TenderAwardRecord, TradePackage } from '../../types';
import { formatCurrency, getTradeColor, normalizeUnit } from '../../utils/formatting';
import { safeAdd } from '../../utils/calculations';
import { TradeAssignDropdown } from '../UI/TradeAssignDropdown';
import { ContextMenu, shouldUseNativeContextMenu } from '../UI/ContextMenu';
import type { ContextMenuEntry, ContextMenuState } from '../UI/ContextMenu';
import { MenuActionList } from '../UI/MenuActionList';
import { PopoverMenu } from '../UI/PopoverMenu';
import { AddLineMenu } from './AddLineMenu';
import { BillPageActionsMenu } from './BillPageActionsMenu';
import { buildBillPageActionItems, buildBillRowActionItems, buildBillSectionActionItems, ClearValuesMenuGroup } from './billActionMenuItems';
import { hasLibraryInsertDragPayload } from '../../utils/libraryInsert';
import { resolveRowDropPlacement, ROW_DROP_HINT } from '../../utils/billPlacement';
import { getNextCommentItemType, getNextHeadingItemType, getPriorCommentContextType } from '../../utils/billStructure';
import {
  getBillItemTypeLabel,
  getItemAccessibilityLabel,
  getTradeAssignmentHelperText,
  getTradeAssignmentLabel,
  InlineQuantityEditor,
  InlineRateEditor,
  InlineUnitEditor,
  renderBillDescription,
  toggleSelectedBillItem,
  toggleSelectedBillItems,
} from './billRowHelpers';
import { VirtualizedSectionRows } from './VirtualizedSectionRows';

const VIRTUALIZE_ITEMS_THRESHOLD = 50;
const RECENTLY_INSERTED_ROW_CLASS = 'ring-2 ring-emerald-300/80 ring-inset bg-emerald-50/85 shadow-[inset_3px_0_0_rgba(16,185,129,0.85)] transition-colors duration-700 dark:ring-emerald-700/75 dark:bg-emerald-950/35';

function billHeadingLevel(item: BoQItem) {
  switch (item.type) {
    case 'GENERAL_HEADING': return 1;
    case 'MAJOR_HEADING': return 2;
    case 'SUB_SECTION': return 3;
    case 'MINOR_HEADING': return 4;
    default: return null;
  }
}

function visibleBillItems(items: BoQItem[], collapsedHeadingIds: Set<string>) {
  let collapsedAtLevel: number | null = null;
  return items.filter((item) => {
    const level = billHeadingLevel(item);
    if (level != null && collapsedAtLevel != null && level <= collapsedAtLevel) collapsedAtLevel = null;
    const hidden = collapsedAtLevel != null;
    if (!hidden && level != null && collapsedHeadingIds.has(item.id)) collapsedAtLevel = level;
    return !hidden;
  });
}

type StandardsDropIndicator =
  | { kind: 'row'; targetItemId: string; sectionId: string; pageId?: string | null; placement: 'before' | 'after' }
  | { kind: 'destination'; sectionId: string; pageId?: string | null };

function preventRowDragOver(event: React.DragEvent<HTMLElement>) {
  event.preventDefault();
  event.dataTransfer.dropEffect = hasLibraryInsertDragPayload(event.dataTransfer) ? 'copy' : 'move';
}

function normalizeWorkspaceName(value: string | undefined, fallback: string) {
  const next = (value || '').trim();
  if (!next) return fallback;
  return next.replace(/\b(Section|Page|Bill)(\d+)/gi, '$1 $2');
}
export interface BillSectionCardProps {
  key?: string;
  section: BoQSection;
  sectionIndex: number;
  activeBill: BoQBill;
  viewMode: 'standard' | 'trade';
  selectedTradeFilter: string;
  onChangeTradeFilter?: (tradeId: string) => void;
  trades: TradePackage[];
  tenderAwards?: Record<string, TenderAwardRecord>;
  selectedItemIds: Set<string>;
  setSelectedItemIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  recentlyInsertedItemIds?: Set<string>;
  activeItemId: string | null;
  activeInsertAnchorId?: string | null;
  onQuickAdd?: (type: ItemType | null, sectionId: string, pageId: string | null | undefined, anchorItemId: string | null, nameFirst: boolean) => void;
  onOpenEditor: (billId: string, sectionId: string, item?: BoQItem, type?: ItemType, pageId?: string | null, insertAfterItemId?: string | null) => void;
  onOpenPrompt: (type: string, context?: Record<string, unknown> | BoQBill) => void;
  onOpenLibrary: (open: boolean) => void;
  onOpenStandardsInsert?: () => void;
  onImportJsonToSection?: (sectionId: string) => void;
  onImportJsonToPage?: (sectionId: string, pageId: string) => void;
  onSingleItemTradeAssign: (itemId: string, tradeId: string) => void;
  onSectionTradeAssign: (billId: string, sectionId: string, tradeId: string) => void;
  onPageTradeAssign?: (billId: string, sectionId: string, pageId: string, tradeId: string) => void;
  onDeleteBillItem: (sectionId: string, itemId: string, pageId?: string | null) => void;
  onMoveBillItem: (draggedItemId: string, targetItemId: string, placement: 'before' | 'after', sectionId: string, pageId?: string | null) => void;
  onShiftBillItem: (itemId: string, direction: 'UP' | 'DOWN', sectionId: string, pageId?: string | null) => void;
  onInlineQuantityUpdate: (itemId: string, quantity: number, sectionId: string, pageId?: string | null) => void;
  onInlineUnitUpdate: (itemId: string, unit: string, sectionId: string, pageId?: string | null) => void;
  onInlineRateUpdate: (itemId: string, rate: number, sectionId: string, pageId?: string | null) => void;
  onItemDragStart: (event: React.DragEvent<HTMLElement>, itemId: string, sectionId: string, pageId?: string | null) => void;
  onPointerDragStart: (event: React.MouseEvent<HTMLElement>, itemId: string, sectionId: string, pageId?: string | null) => void;
  onPointerDragHover: (event: React.MouseEvent<HTMLTableRowElement>, targetItemId: string, sectionId: string, pageId?: string | null) => void;
  onItemDragEnd: () => void;
  onItemDrop: (event: React.DragEvent<HTMLTableRowElement>, targetItemId: string, sectionId: string, pageId?: string | null) => void;
  onStandardsDropToDestination?: (event: React.DragEvent<HTMLElement>, sectionId: string, pageId?: string | null) => void;
  pointerDraggedItemState: { itemId: string; sectionId: string; pageId?: string | null } | null;
  pointerDropIndicatorState: { targetItemId: string; sectionId: string; pageId?: string | null; placement: 'before' | 'after' } | null;
  isCostItem: (type: string) => boolean;
  getRowStyles: (type: string, isActive: boolean, isSelected?: boolean, isUnassigned?: boolean, costRowIndex?: number) => string;
  getTextStyles: (type: string, previousType?: string | null) => string;
  getRowInlineStyle: (type: string, isActive: boolean, isSelected?: boolean) => React.CSSProperties | undefined;
  getDescriptionInlineStyle: (type: string) => React.CSSProperties | undefined;
  getDisplayRef: (item: BoQItem) => string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isPageCollapsed?: (pageId: string) => boolean;
  onTogglePageCollapse?: (pageId: string) => void;
  onExportSection?: (section: BoQSection) => void;
  onSaveSectionAssembly?: () => void;
   /** Optional: delete this entire section (and its items). */
  onDeleteSection?: () => void;
  /** Optional: move this section one position up in the bill. */
  onMoveSectionUp?: () => void;
  /** Optional: move this section one position down in the bill. */
  onMoveSectionDown?: () => void;
  /** Optional: copy this section to another destination. */
  onCopySection?: () => void;
  /** Optional: copy a page to another destination. */
  onCopyPage?: (billId: string, sectionId: string, pageId: string) => void;
  /** Optional: delete a page from this section. */
  onDeletePage?: (billId: string, sectionId: string, pageId: string) => void;
  onClearSectionValues?: (mode: ClearValuesMode) => void;
  onClearPageValues?: (billId: string, sectionId: string, pageId: string, mode: ClearValuesMode) => void;
  /** True when rendering bill-level items (no sections). Hides section actions and uses sectionId '' for editor/delete. */
  isBillLevel?: boolean;
  pageCardRefs?: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  isCleanWorkspace?: boolean;
  isWorkspaceMaximized?: boolean;
  workspaceZoom?: number;
  isStandardsDragActive?: boolean;
}

export function BillSectionCard(p: BillSectionCardProps) {
  const [collapsedHeadingIds, setCollapsedHeadingIds] = useState<Set<string>>(new Set());
  const {
    section,
    sectionIndex,
    activeBill,
    selectedTradeFilter,
    onChangeTradeFilter,
    trades,
    tenderAwards,
    selectedItemIds,
    setSelectedItemIds,
    recentlyInsertedItemIds,
    activeItemId,
    activeInsertAnchorId,
    onQuickAdd,
    onOpenEditor,
    onOpenPrompt,
    onOpenLibrary,
    onOpenStandardsInsert,
    onImportJsonToSection,
    onImportJsonToPage,
    onSingleItemTradeAssign,
    onSectionTradeAssign,
    onPageTradeAssign,
    onDeleteBillItem,
    onMoveBillItem,
    onShiftBillItem,
    onInlineQuantityUpdate,
    onInlineUnitUpdate,
    onInlineRateUpdate,
    onItemDragStart,
    onPointerDragStart,
    onPointerDragHover,
    onItemDragEnd,
    onItemDrop,
    onStandardsDropToDestination,
    pointerDraggedItemState,
    pointerDropIndicatorState,
    isCostItem,
    getRowStyles,
    getTextStyles,
    getRowInlineStyle,
    getDescriptionInlineStyle,
    getDisplayRef,
    isCollapsed,
    onToggleCollapse,
    isPageCollapsed,
    onTogglePageCollapse,
    onExportSection,
    onSaveSectionAssembly,
    onDeleteSection,
    onMoveSectionUp,
    onMoveSectionDown,
    onCopySection,
    onCopyPage,
    onDeletePage,
    onClearSectionValues,
    onClearPageValues,
    isBillLevel,
    pageCardRefs,
    isCleanWorkspace = false,
    isWorkspaceMaximized = false,
    workspaceZoom = 100,
    isStandardsDragActive = false,
  } = p;
  const sectionScrollRef = useRef<HTMLDivElement>(null);
  const getRecentlyInsertedRowClass = React.useCallback((itemId: string) => (
    recentlyInsertedItemIds?.has(itemId) ? RECENTLY_INSERTED_ROW_CLASS : ''
  ), [recentlyInsertedItemIds]);
  const hasPages = Boolean(section.pages && section.pages.length > 0);
  const itemsSource = hasPages ? (section.pages || []).flatMap((page: BoQPage) => (page.items || [])) : (section.items || []);
  const isTradeFilterActive = Boolean(selectedTradeFilter) && selectedTradeFilter !== 'ALL';
  const itemMatchesSelectedTrade = React.useCallback((item: BoQItem) => {
    if (!isTradeFilterActive || !isCostItem(item.type)) return false;
    if (selectedTradeFilter === 'UNASSIGNED') return !item.tradePackageId;
    return item.tradePackageId === selectedTradeFilter;
  }, [isCostItem, isTradeFilterActive, selectedTradeFilter]);
  const filterItemsForSelectedTrade = React.useCallback((items: BoQItem[]) => {
    if (!isTradeFilterActive) return items;
    const hasMatchingCommercialRow = items.some(itemMatchesSelectedTrade);
    if (!hasMatchingCommercialRow && items.some((item) => isCostItem(item.type))) return [];

    return items.filter((item) => {
      if (!isCostItem(item.type)) return true;
      return itemMatchesSelectedTrade(item);
    });
  }, [isCostItem, isTradeFilterActive, itemMatchesSelectedTrade]);
  const filteredItems = filterItemsForSelectedTrade(itemsSource);
  const itemsToRender = visibleBillItems(filteredItems, collapsedHeadingIds);
  const pricedItems = itemsSource.filter((item: BoQItem) => isCostItem(item.type));
  const visiblePricedItems = itemsToRender.filter((item: BoQItem) => isCostItem(item.type));
  const sectionTotal = filteredItems.reduce((acc: number, item: BoQItem) => safeAdd(acc, (isCostItem(item.type) ? item.total : 0)), 0);
  const sectionNumber = sectionIndex + 1;
  const displaySectionName = normalizeWorkspaceName(section.name, `Section ${sectionNumber}`);
  const sectionItemCount = pricedItems.length;
  const visibleSectionItemCount = visiblePricedItems.length;
  const assignedItemCount = pricedItems.filter((item: BoQItem) => Boolean(item.tradePackageId)).length;
  const unassignedItemCount = Math.max(sectionItemCount - assignedItemCount, 0);
  const sectionPageCount = section.pages?.length || 0;
  const pagesToRender = section.pages || [];
  const canStartPages = !hasPages && !isBillLevel;
  const sectionStructureLabel = hasPages ? `Paged section - ${sectionPageCount} page${sectionPageCount === 1 ? '' : 's'}` : 'Direct section items';
  const sectionStructureDetail = hasPages
    ? 'Items in this section now live inside pages. Add new lines inside a page so the breakdown stays tidy.'
    : 'Items are currently added straight into this section. Start pages if you want page-by-page grouping and numbering.';
  const sectionStatusClasses = sectionItemCount === 0
    ? 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
    : unassignedItemCount > 0
      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300';
  const sectionStatusLabel = sectionItemCount === 0
    ? 'Awaiting first priced item'
    : unassignedItemCount > 0
      ? `${unassignedItemCount} item${unassignedItemCount === 1 ? '' : 's'} need trade allocation`
      : 'Trade structure complete';
  const sectionStatusDetail = sectionItemCount === 0
    ? 'Add the first measured line or use AI fill to start structuring this section.'
    : unassignedItemCount > 0
      ? 'Assign the remaining items to a trade package before tender comparison.'
      : hasPages
        ? 'Every priced item is allocated and the paged structure is ready for tender review.'
        : 'Every priced item is allocated and this section is ready for tender review.';
  const showFilteredSectionSummary = isTradeFilterActive && visiblePricedItems.length !== sectionItemCount;
  const sectionSurfaceClass = isCleanWorkspace
    ? 'border-b border-slate-300/90 pb-6 dark:border-slate-700/90'
    : 'bg-surface dark:bg-surface-900 rounded-app-lg border border-slate-200/80 dark:border-slate-700 overflow-hidden shadow-card';
  const sectionHeaderClass = isCleanWorkspace
    ? 'border-b border-slate-300/90 pb-3 dark:border-slate-700/90'
    : 'border-b border-slate-200 dark:border-slate-700 bg-surface-muted dark:bg-surface-800';
  const sectionHeaderInnerClass = isCleanWorkspace ? 'px-4 py-0 flex flex-col gap-3' : 'px-4 py-3 flex flex-col gap-3';
  const pageSurfaceClass = isCleanWorkspace
    ? 'border-t border-slate-200/90 pt-4 dark:border-slate-700/80'
    : 'border border-slate-200 dark:border-slate-700 rounded-app-lg overflow-hidden bg-surface dark:bg-surface-900';
  const tableWorkspaceScale = Math.max(workspaceZoom / 100, 0.5);
  const tableScaleStyle: React.CSSProperties = tableWorkspaceScale !== 1
    ? {
        zoom: tableWorkspaceScale,
      }
    : {};
  const pageHeaderClass = isCleanWorkspace
    ? 'border-b border-slate-200/90 px-0 pb-2 dark:border-slate-700/80'
    : 'border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80';
  const tableHeadClass = isCleanWorkspace
    ? 'sticky top-0 z-20 bg-slate-200/95 dark:bg-slate-800/95 border-b-2 border-slate-300 dark:border-slate-600 shadow-sm backdrop-blur'
    : 'sticky top-0 z-20 bg-slate-100 dark:bg-slate-800/95 border-b-2 border-slate-200 dark:border-slate-600 shadow-sm';
  const pageTableHeadClass = isCleanWorkspace
    ? 'sticky top-0 z-10 bg-slate-200/95 dark:bg-slate-800/95 border-b-2 border-slate-300 dark:border-slate-600 backdrop-blur'
    : 'sticky top-0 z-10 bg-slate-100 dark:bg-slate-800/95 border-b-2 border-slate-200 dark:border-slate-600';
  const tableHeadRowClass = isCleanWorkspace
    ? 'text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-200'
    : 'text-xs font-semibold text-slate-600 dark:text-slate-300';
  const tableFootClass = isCleanWorkspace
    ? 'bg-slate-100/90 dark:bg-slate-800/75 border-t border-slate-300 dark:border-slate-600'
    : 'bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-600';
  const emptyTableRowClass = isCleanWorkspace
    ? 'px-3 py-3 text-left text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-surface-900/60 border-b border-slate-200/70 dark:border-slate-700/70'
    : 'px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500';
  const workspaceMetaChipClass = 'rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300';
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [standardsDropIndicator, setStandardsDropIndicator] = useState<StandardsDropIndicator | null>(null);
  React.useEffect(() => {
    if (!isStandardsDragActive) {
      setStandardsDropIndicator(null);
      return;
    }
    const handlePoint = (event: MouseEvent) => {
      const row = (document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null)?.closest<HTMLElement>('[data-bill-row-id]');
      if (!row || row.dataset.billSectionId !== section.id || !row.dataset.billRowId) {
        setStandardsDropIndicator((current) => current?.kind === 'row' ? null : current);
        return;
      }
      setStandardsDropIndicator({ kind: 'row', targetItemId: row.dataset.billRowId, sectionId: section.id, pageId: row.dataset.billPageId || null, placement: resolveRowDropPlacement() });
    };
    window.addEventListener('mousemove', handlePoint);
    window.addEventListener('dragover', handlePoint);
    return () => {
      window.removeEventListener('mousemove', handlePoint);
      window.removeEventListener('dragover', handlePoint);
    };
  }, [isStandardsDragActive, section.id]);

  const isSameDropScope = (sectionId: string, pageId?: string | null) => (
    standardsDropIndicator?.sectionId === sectionId &&
    (standardsDropIndicator.pageId || null) === (pageId || null)
  );

  const getStandardsRowDropClass = (itemId: string, sectionId: string, pageId?: string | null) => {
    if (
      standardsDropIndicator?.kind !== 'row' ||
      standardsDropIndicator.targetItemId !== itemId ||
      !isSameDropScope(sectionId, pageId)
    ) {
      return '';
    }
    return standardsDropIndicator.placement === 'before'
      ? 'border-t-4 border-t-emerald-500 bg-emerald-50/80 shadow-[inset_0_3px_0_rgba(16,185,129,0.2)] dark:bg-emerald-950/30'
      : 'border-b-4 border-b-emerald-500 bg-emerald-50/80 shadow-[inset_0_-3px_0_rgba(16,185,129,0.2)] dark:bg-emerald-950/30';
  };

  const getStandardsRowDropLabel = (itemId: string, sectionId: string, pageId?: string | null) => {
    if (
      standardsDropIndicator?.kind !== 'row' ||
      standardsDropIndicator.targetItemId !== itemId ||
      !isSameDropScope(sectionId, pageId)
    ) {
      return null;
    }
    return standardsDropIndicator.placement === 'before' ? 'Insert standards before this row' : 'Insert standards after this row';
  };

  const getStandardsDestinationDropClass = (sectionId: string, pageId?: string | null) => (
    standardsDropIndicator?.kind === 'destination' && isSameDropScope(sectionId, pageId)
      ? 'border-emerald-400 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-200/80 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100 dark:ring-emerald-900/70'
      : isStandardsDragActive
        ? 'border-emerald-200 bg-emerald-50/35 ring-1 ring-emerald-100/80 dark:border-emerald-900/50 dark:bg-emerald-950/15 dark:ring-emerald-900/40'
      : ''
  );

  const showStandardsDropHint = (sectionId: string, pageId?: string | null) => (
    isStandardsDragActive || (standardsDropIndicator?.kind === 'destination' && isSameDropScope(sectionId, pageId))
  );

  const getStandardsDropHint = (scope: 'section' | 'page') => (
    standardsDropIndicator?.kind === 'destination'
      ? `Release to append standards to this ${scope}`
      : `Drop on this ${scope} to append. ${ROW_DROP_HINT}`
  );

  const handleBillRowDragOver = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    if (!hasLibraryInsertDragPayload(event.dataTransfer)) {
      event.dataTransfer.dropEffect = 'move';
      setStandardsDropIndicator(null);
      return;
    }

    event.dataTransfer.dropEffect = 'copy';
    event.stopPropagation();
    const row = event.currentTarget.closest<HTMLTableRowElement>('[data-bill-row-id]');
    const targetItemId = row?.dataset.billRowId;
    if (!row || !targetItemId) return;
    setStandardsDropIndicator({
      kind: 'row',
      targetItemId,
      sectionId: row.dataset.billSectionId || '',
      pageId: row.dataset.billPageId || null,
      placement: resolveRowDropPlacement(),
    });
  };

  const handleStandardsDestinationDragOver = (
    event: React.DragEvent<HTMLElement>,
    sectionId: string,
    pageId?: string | null,
  ) => {
    if (!hasLibraryInsertDragPayload(event.dataTransfer)) {
      preventRowDragOver(event);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
    setStandardsDropIndicator({ kind: 'destination', sectionId, pageId: pageId || null });
  };

  const handleStandardsDestinationDrop = (
    event: React.DragEvent<HTMLElement>,
    sectionId: string,
    pageId?: string | null,
  ) => {
    if (!hasLibraryInsertDragPayload(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    clearStandardsDropIndicator();
    onStandardsDropToDestination?.(event, sectionId, pageId);
  };

  const clearStandardsDropIndicator = () => setStandardsDropIndicator(null);

  const openContextMenu = (
    event: React.MouseEvent<HTMLElement>,
    label: string,
    items: ContextMenuEntry[],
  ) => {
    if (shouldUseNativeContextMenu(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      label,
      items: items.filter((item) => !('type' in item && item.type === 'separator') && !['row-add-section-after', 'row-add-page-after', 'section-add-section-after', 'section-add-page'].includes(item.id)),
    });
  };

  const rowContextItems = (
    item: BoQItem,
    index: number,
    itemCount: number,
    pageId?: string | null,
  ): ContextMenuEntry[] => {
    const existing = buildBillRowActionItems({
    item,
    itemTypeLabel: getBillItemTypeLabel(item.type),
    index,
    itemCount,
    onEdit: () => onOpenEditor(activeBill.id, section.id, item, undefined, pageId),
    onAddAfter: () => onOpenEditor(activeBill.id, section.id, undefined, 'PRICED', pageId, item.id),
    onAddHeadingAfter: () => onOpenEditor(activeBill.id, section.id, undefined, getNextHeadingItemType(item.type), pageId, item.id),
    onAddCommentAfter: () => onOpenEditor(activeBill.id, section.id, undefined, getNextCommentItemType(item.type), pageId, item.id),
    onAddPageAfter: () => onOpenPrompt('ADD_PAGE', { billId: activeBill.id, sectionId: section.id, afterPageId: pageId || undefined }),
    onAddSectionAfter: () => onOpenPrompt('ADD_SECTION', { billId: activeBill.id, afterSectionId: section.id }),
    onOpenStandardsInsert: onOpenStandardsInsert
      ? () => {
          setSelectedItemIds(new Set([item.id]));
          onOpenStandardsInsert();
        }
      : undefined,
    onOpenLibrary: () => onOpenLibrary(true),
    onMoveUp: () => onShiftBillItem(item.id, 'UP', section.id, pageId),
    onMoveDown: () => onShiftBillItem(item.id, 'DOWN', section.id, pageId),
    onDelete: () => onDeleteBillItem(section.id, item.id, pageId),
    });
    if (!onQuickAdd) return existing;
    const quickTypes: Array<[ItemType, string]> = [
      ['GENERAL_HEADING', 'H1'], ['MAJOR_HEADING', 'H2'], ['SUB_SECTION', 'H3'],
      ['MINOR_HEADING', 'H4'], ['COMMENT', 'Comment'], ['SUB_COMMENT', 'Sub-comment'], ['PRICED', 'Priced item'],
    ];
    return [
      { id: 'row-quick-add-label', type: 'label', label: 'Quick add below' },
      ...quickTypes.map(([type, label], shortcut) => ({ id: `row-quick-${type}`, label: `Add ${label} (${shortcut + 1})`, icon: <Plus className="h-4 w-4" />, onSelect: () => onQuickAdd(type, section.id, pageId, item.id, false) })),
      { id: 'row-quick-name', label: 'Add and name…', icon: <Plus className="h-4 w-4" />, onSelect: () => onQuickAdd(null, section.id, pageId, item.id, true) },
      ...existing.filter((entry) => !['row-add-label', 'row-add-after', 'row-add-heading-after', 'row-add-comment-after'].includes(entry.id)),
    ];
  };
  const sectionAppendItems = hasPages ? [] : (section.items || []);
  const sectionAppendAnchor = sectionAppendItems[sectionAppendItems.length - 1] || null;
  const sectionContextPage = hasPages ? section.pages?.[section.pages.length - 1] : null;
  const appendQuickItems = (pageId: string | null | undefined, anchorItemId: string | null): ContextMenuEntry[] => onQuickAdd ? [
    { id: 'blank-quick-label', type: 'label', label: 'Quick add at end' },
    ...([['GENERAL_HEADING', 'H1'], ['MAJOR_HEADING', 'H2'], ['SUB_SECTION', 'H3'], ['MINOR_HEADING', 'H4'], ['COMMENT', 'Comment'], ['SUB_COMMENT', 'Sub-comment'], ['PRICED', 'Priced item']] as Array<[ItemType, string]>).map(([type, label], index) => ({ id: `blank-quick-${type}`, label: `Add ${label} (${index + 1})`, icon: <Plus className="h-4 w-4" />, onSelect: () => onQuickAdd(type, section.id, pageId, anchorItemId, false) })),
    { id: 'blank-quick-name', label: 'Add and name…', icon: <Plus className="h-4 w-4" />, onSelect: () => onQuickAdd(null, section.id, pageId, anchorItemId, true) },
  ] : [];
  const sectionActionItems = buildBillSectionActionItems({
    onAddItem: () => onOpenEditor(activeBill.id, section.id, undefined, 'PRICED', undefined, null),
    onAddHeading: hasPages ? undefined : () => onOpenEditor(activeBill.id, section.id, undefined, getNextHeadingItemType(sectionAppendAnchor?.type), undefined, sectionAppendAnchor?.id ?? null),
    onAddComment: hasPages ? undefined : () => onOpenEditor(activeBill.id, section.id, undefined, getNextCommentItemType(sectionAppendAnchor?.type), undefined, sectionAppendAnchor?.id ?? null),
    onAddSection: () => onOpenPrompt('ADD_SECTION', { billId: activeBill.id, afterSectionId: section.id }),
    onAiFill: () => onOpenPrompt('AI_GENERATE_HIERARCHY', { billId: activeBill.id, sectionId: section.id }),
    onSaveAssembly: onSaveSectionAssembly,
    onRename: () => onOpenPrompt('RENAME_SECTION', { id: section.id, name: section.name }),
    onCopy: onCopySection,
    onOpenStandardsInsert,
    onOpenLibrary: () => onOpenLibrary(true),
    onAddPage: () => onOpenPrompt('ADD_PAGE', { billId: activeBill.id, sectionId: section.id }),
    onImportJson: onImportJsonToSection ? () => onImportJsonToSection(section.id) : undefined,
    onExportSection: onExportSection ? () => onExportSection(section) : undefined,
    onMoveUp: onMoveSectionUp,
    onMoveDown: onMoveSectionDown,
    onClearValues: onClearSectionValues,
    onDelete: onDeleteSection,
  });

  return (
    <div id={section.id} className="relative">
      {sectionIndex > 0 && (
        <div className="absolute -top-4 left-0 right-0 h-px bg-slate-200 dark:bg-slate-700" aria-hidden />
      )}
      <div
        className={sectionSurfaceClass}
        data-standards-drop-destination="true"
        data-bill-section-id={section.id}
        onDragOver={(event) => handleStandardsDestinationDragOver(event, section.id, undefined)}
        onDragLeave={clearStandardsDropIndicator}
        onDrop={(event) => handleStandardsDestinationDrop(event, section.id, undefined)}
      >
        <div
          className={`${sectionHeaderClass} ${getStandardsDestinationDropClass(section.id, undefined)}`}
          data-standards-drop-destination="true"
          data-bill-section-id={section.id}
          onDragOver={(event) => handleStandardsDestinationDragOver(event, section.id, undefined)}
          onDragLeave={clearStandardsDropIndicator}
          onDrop={(event) => handleStandardsDestinationDrop(event, section.id, undefined)}
          onContextMenu={(event) => openContextMenu(event, `${displaySectionName} actions`, [...appendQuickItems(sectionContextPage?.id, sectionContextPage?.items?.[sectionContextPage.items.length - 1]?.id || sectionAppendAnchor?.id || null), ...sectionActionItems])}
        >
          <div className={sectionHeaderInnerClass}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {isCleanWorkspace && (
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                    Section {sectionNumber}
                  </div>
                )}
                <h3 className={`min-w-0 flex items-center ${isCleanWorkspace ? 'gap-2 text-[15px] font-semibold text-slate-950 dark:text-slate-50' : 'gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100'} tracking-tight`}>
                  <button
                    type="button"
                    onClick={onToggleCollapse}
                    className={`rounded-full text-slate-500 dark:text-slate-400 ${isCleanWorkspace ? 'p-1 hover:bg-slate-100 dark:hover:bg-slate-800' : 'p-1 hover:bg-slate-200/70 dark:hover:bg-slate-700/70'}`}
                    aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${isBillLevel ? 'bill' : 'section'}`}
                    aria-expanded={!isCollapsed}
                  >
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${
                        isCollapsed ? '-rotate-90' : 'rotate-0'
                      }`}
                    />
                  </button>
                  <span className={`flex items-center justify-center shrink-0 font-bold ${isCleanWorkspace ? 'h-6 min-w-6 rounded-app-sm border border-slate-300 bg-slate-100 px-1.5 text-[10px] text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200' : 'w-6 h-6 rounded bg-emerald-800 text-white text-xs dark:bg-emerald-700 dark:text-white'}`}>
                    {sectionNumber}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{displaySectionName}</span>
                </h3>
                {showStandardsDropHint(section.id, undefined) ? (
                  <div className="mt-2 inline-flex rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm dark:border-emerald-900/60 dark:bg-surface-900 dark:text-emerald-200">
                    {getStandardsDropHint('section')}
                  </div>
                ) : null}
              {!isCleanWorkspace && (
                  <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {sectionStatusDetail}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!isBillLevel && onClearSectionValues && sectionItemCount > 0 && <PopoverMenu ariaLabel={`Clear ${section.name} values`} width={260} estimatedHeight={220} trigger={({ ref, isOpen, toggle }) => <button ref={ref} type="button" onClick={toggle} className="workspace-secondary-btn px-2 py-1 text-xs" aria-haspopup="menu" aria-expanded={isOpen} title={`Clear rates or quantities in ${section.name}`}><Eraser className="h-3.5 w-3.5" />Clear values</button>}>
                  {(close) => <ClearValuesMenuGroup onClear={onClearSectionValues} close={close} />}
                </PopoverMenu>}
                {!isBillLevel && !isCleanWorkspace && (
                  <TradeAssignDropdown
                    trades={trades}
                    onSelect={(tId: string) => onSectionTradeAssign(activeBill.id, section.id, tId)}
                    label="Trade"
                    selectionCount={unassignedItemCount > 0 ? unassignedItemCount : sectionItemCount}
                    helperText={
                      sectionItemCount === 0
                        ? 'This section needs priced items before a trade package can be assigned.'
                        : unassignedItemCount > 0
                          ? `Assign a trade package to complete the ${section.name} section. ${unassignedItemCount} priced item${unassignedItemCount === 1 ? '' : 's'} are still unassigned.`
                          : `Reassign the ${section.name} section if you want to move all priced items to a different trade package.`
                    }
                    onCreateTrade={() => onOpenPrompt('CREATE_TRADE')}
                  />
                )}
                {!isBillLevel && (
                  <>
                    {isCleanWorkspace && (
                      <AddLineMenu
                        activeItemId={activeItemId}
                        activeBill={activeBill}
                        selectedItemIds={selectedItemIds}
                        defaultSectionId={section.id}
                        compact
                        label="Add"
                        onOpenEditor={onOpenEditor}
                        onOpenPrompt={onOpenPrompt}
                        onOpenStandards={onOpenStandardsInsert}
                      />
                    )}
                    <PopoverMenu
                      ariaLabel={`${section.name} actions`}
                      width={270}
                      estimatedHeight={520}
                      trigger={({ ref, isOpen, toggle }) => (
                        <button
                          ref={ref}
                          type="button"
                          onClick={toggle}
                          className="p-1.5 rounded-app-sm border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-surface-200 dark:hover:bg-surface-800"
                          title="Section actions"
                          aria-label="Section actions"
                          aria-haspopup="menu"
                          aria-expanded={isOpen}
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      )}
                    >
                      {(close) => (
                        <MenuActionList
                          items={sectionActionItems}
                          close={close}
                          itemTextSize="text-xs"
                        />
                      )}
                    </PopoverMenu>
                  </>
                )}
              </div>
            </div>

            <div className={`flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between ${isCleanWorkspace ? 'pb-0.5' : ''}`}>
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium">
                {!isCleanWorkspace && (
                  <span className={`${workspaceMetaChipClass} uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400`}>
                    {sectionStructureLabel}
                  </span>
                )}
                <span className={isCleanWorkspace ? 'rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300' : workspaceMetaChipClass}>
                  {sectionItemCount} priced item{sectionItemCount === 1 ? '' : 's'}
                </span>
                <span className={`rounded-full border px-2.5 py-1 ${isCleanWorkspace ? 'border-emerald-800 bg-emerald-800 text-white dark:border-emerald-700 dark:bg-emerald-900 dark:text-emerald-50' : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200'}`}>
                  Total {formatCurrency(sectionTotal)}
                </span>
                {showFilteredSectionSummary && (
                  <span className="rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-primary-700 dark:border-primary-900/70 dark:bg-primary-950/30 dark:text-primary-300">
                    Showing {visibleSectionItemCount} of {sectionItemCount} priced items
                  </span>
                )}
                {!isBillLevel && sectionItemCount > 0 && (
                  <span className={`rounded-full border px-2.5 py-1 ${sectionStatusClasses}`}>
                    {sectionStatusLabel}
                  </span>
                )}
              </div>

              {!isBillLevel && !isCleanWorkspace && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenPrompt('AI_GENERATE_HIERARCHY', { billId: activeBill.id, sectionId: section.id })}
                    className={`inline-flex items-center justify-center gap-2 rounded-app-sm border px-3 py-2 text-xs font-medium transition-colors ${isCleanWorkspace ? 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200 dark:hover:bg-surface-800'}`}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    AI fill
                  </button>
                  {hasPages ? null : (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenEditor(activeBill.id, section.id, undefined, 'PRICED')}
                        className="workspace-primary-btn px-3 py-2 text-xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add priced item
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenPrompt('ADD_PAGE', { billId: activeBill.id, sectionId: section.id })}
                        className="workspace-secondary-btn px-3 py-2 text-xs"
                        title={section.items.length > 0 ? 'Create Page 01 and move the current section items into it.' : 'Start page-based breakdown for this section.'}
                      >
                        <Layers className="h-3.5 w-3.5" />
                        Start pages
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            {!isBillLevel && !isCleanWorkspace && !isWorkspaceMaximized && (
              <div className="rounded-app border border-slate-200/80 bg-white/70 px-3 py-2 text-xs leading-5 text-slate-500 dark:border-slate-700 dark:bg-surface-900/80 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-200">Structure:</span> {sectionStructureDetail}
                {canStartPages && section.items.length > 0 && (
                  <span className="block mt-1 text-slate-400 dark:text-slate-500">
                    Starting pages will create Page 01 and move the current section items into it.
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        {!isCollapsed && (
          hasPages ? (
            <div className={`${isCleanWorkspace ? 'space-y-4 pt-2.5' : 'space-y-6 px-4 pb-4'}`}>
              {!isCleanWorkspace && !isWorkspaceMaximized && (
              <div className="rounded-app border border-primary-100 bg-primary-50/70 px-4 py-3 text-xs leading-5 text-primary-800 dark:border-primary-900/60 dark:bg-primary-950/20 dark:text-primary-200">
                Page mode is active for this section. Add items inside a page so numbering, totals, and tender handoff stay grouped correctly.
              </div>
              )}
              {pagesToRender.map((page: BoQPage, pageIdx: number) => {
                const pageItems = (page.items || []);
  const pageFilteredItems = filterItemsForSelectedTrade(pageItems);
  const pageItemsToRender = visibleBillItems(pageFilteredItems, collapsedHeadingIds);
                const pagePricedItems = pageItems.filter((item: BoQItem) => isCostItem(item.type));
                const visiblePagePricedItems = pageItemsToRender.filter((item: BoQItem) => isCostItem(item.type));
                const pageTotal = pageFilteredItems.reduce((acc: number, item: BoQItem) => safeAdd(acc, isCostItem(item.type) ? item.total : 0), 0);
                const displayPageName = normalizeWorkspaceName(page.name || '', `Page ${pageIdx + 1}`);
                const pageAssignedCount = pagePricedItems.filter((item: BoQItem) => Boolean(item.tradePackageId)).length;
                const pageUnassignedCount = Math.max(pagePricedItems.length - pageAssignedCount, 0);
                const uniquePageTradeIds = Array.from(new Set(pagePricedItems.map((item: BoQItem) => item.tradePackageId).filter(Boolean))) as string[];
                const pageSingleTrade = uniquePageTradeIds.length === 1 ? trades.find((trade) => trade.id === uniquePageTradeIds[0]) : null;
  const showFilteredPageSummary = isTradeFilterActive && visiblePagePricedItems.length !== pagePricedItems.length;
                return (
                  <div
                    key={page.id}
                    id={page.id}
                    ref={(node) => {
                      if (pageCardRefs) pageCardRefs.current[page.id] = node;
                    }}
                    className={pageSurfaceClass}
                    data-standards-drop-destination="true"
                    data-bill-section-id={section.id}
                    data-bill-page-id={page.id}
                    onDragOver={(event) => handleStandardsDestinationDragOver(event, section.id, page.id)}
                    onDragLeave={clearStandardsDropIndicator}
                    onDrop={(event) => handleStandardsDestinationDrop(event, section.id, page.id)}
                  >
                    <div
                      className={`${pageHeaderClass} ${getStandardsDestinationDropClass(section.id, page.id)}`}
                      data-standards-drop-destination="true"
                      data-bill-section-id={section.id}
                      data-bill-page-id={page.id}
                      onDragOver={(event) => handleStandardsDestinationDragOver(event, section.id, page.id)}
                      onDragLeave={clearStandardsDropIndicator}
                      onDrop={(event) => handleStandardsDestinationDrop(event, section.id, page.id)}
                      onContextMenu={(event) => openContextMenu(event, `${displayPageName} actions`, [
                        ...appendQuickItems(page.id, pageItems[pageItems.length - 1]?.id || null),
                        { id: 'page-add-label', type: 'label', label: 'Add' },
                        {
                          id: 'page-add-line',
                          label: 'Add line',
                          icon: <Plus className="h-4 w-4" />,
                          onSelect: () => onOpenEditor(activeBill.id, section.id, undefined, 'PRICED', page.id),
                        },
                        ...buildBillPageActionItems({
                          onRename: () => onOpenPrompt('RENAME_PAGE', {
                            billId: activeBill.id,
                            sectionId: section.id,
                            pageId: page.id,
                            name: displayPageName,
                          }),
                          onCopy: onCopyPage ? () => onCopyPage(activeBill.id, section.id, page.id) : undefined,
                          onImportJson: onImportJsonToPage ? () => onImportJsonToPage(section.id, page.id) : undefined,
                          onClearValues: onClearPageValues ? (mode) => onClearPageValues(activeBill.id, section.id, page.id, mode) : undefined,
                          onDelete: onDeletePage ? () => onDeletePage(activeBill.id, section.id, page.id) : undefined,
                        }),
                      ])}
                    >
                      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                            Page {pageIdx + 1}
                          </div>
                          <div className="mt-1 flex min-w-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onTogglePageCollapse?.(page.id)}
                              aria-label={`${isPageCollapsed?.(page.id) ? 'Expand' : 'Collapse'} ${displayPageName}`}
                              aria-expanded={!isPageCollapsed?.(page.id)}
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-surface-800"
                            >
                              <ChevronDown className={`h-4 w-4 transition-transform ${isPageCollapsed?.(page.id) ? '-rotate-90' : ''}`} />
                            </button>
                            <div className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {displayPageName}
                            </div>
                            <BillPageActionsMenu
                              pageName={displayPageName}
                              pricedItemCount={pagePricedItems.length}
                              trades={trades}
                              tradeLabel={
                                pageSingleTrade
                                  ? `Page trade: ${pageSingleTrade.name}`
                                  : pageAssignedCount > 0
                                    ? 'Set full page trade'
                                    : 'Assign full page trade'
                              }
                              tradeHelperText={
                                pageSingleTrade
                                  ? `${displayPageName} is currently aligned to ${pageSingleTrade.name}. Choose another trade to reassign all ${pagePricedItems.length} priced item${pagePricedItems.length === 1 ? '' : 's'} on this page.`
                                  : pageAssignedCount > 0
                                    ? `Apply one trade package to every priced item on ${displayPageName}. This will replace mixed item-level assignments across ${pagePricedItems.length} priced line${pagePricedItems.length === 1 ? '' : 's'}.`
                                    : `Assign one trade package to all ${pagePricedItems.length} priced item${pagePricedItems.length === 1 ? '' : 's'} on ${displayPageName}.`
                              }
                              onRename={() => onOpenPrompt('RENAME_PAGE', {
                                billId: activeBill.id,
                                sectionId: section.id,
                                pageId: page.id,
                                name: displayPageName,
                              })}
                              onCopy={onCopyPage ? () => onCopyPage(activeBill.id, section.id, page.id) : undefined}
                              onImportJson={onImportJsonToPage ? () => onImportJsonToPage(section.id, page.id) : undefined}
                              onAssignTrade={onPageTradeAssign ? (tradeId) => onPageTradeAssign(activeBill.id, section.id, page.id, tradeId) : undefined}
                              onCreateTrade={() => onOpenPrompt('CREATE_TRADE')}
                              onClearValues={onClearPageValues ? (mode) => onClearPageValues(activeBill.id, section.id, page.id, mode) : undefined}
                              onDelete={onDeletePage ? () => onDeletePage(activeBill.id, section.id, page.id) : undefined}
                            />
                            </div>
                          {showStandardsDropHint(section.id, page.id) ? (
                            <div className="mt-2 inline-flex rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm dark:border-emerald-900/60 dark:bg-surface-900 dark:text-emerald-200">
                              {getStandardsDropHint('page')}
                            </div>
                          ) : null}
                          {!isCleanWorkspace && (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {pagePricedItems.length === 0
                                ? 'Add measured items to start this page.'
                                : pageUnassignedCount > 0
                                  ? `${pageUnassignedCount} item${pageUnassignedCount === 1 ? '' : 's'} still need a trade allocation on this page.`
                                  : 'Trade allocation is complete for this page.'}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium">
                          <AddLineMenu
                        activeItemId={activeItemId}
                            activeBill={activeBill}
                            selectedItemIds={selectedItemIds}
                            defaultSectionId={section.id}
                            defaultPageId={page.id}
                            compact
                            label="Add"
                            onOpenEditor={onOpenEditor}
                            onOpenPrompt={onOpenPrompt}
                            onOpenStandards={onOpenStandardsInsert}
                          />
                          <span className={workspaceMetaChipClass}>
                            {pagePricedItems.length} priced item{pagePricedItems.length === 1 ? '' : 's'}
                          </span>
                          <span className={`rounded-full border px-2.5 py-1 ${isCleanWorkspace ? 'border-emerald-800 bg-emerald-800 text-white dark:border-emerald-700 dark:bg-emerald-900 dark:text-emerald-50' : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200'}`}>
                            Total {formatCurrency(pageTotal)}
                          </span>
                          {showFilteredPageSummary && (
                            <span className="rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-primary-700 dark:border-primary-900/70 dark:bg-primary-950/30 dark:text-primary-300">
                              Showing {visiblePagePricedItems.length} of {pagePricedItems.length}
                            </span>
                          )}
                          <span className={`rounded-full border px-2.5 py-1 ${
                            pagePricedItems.length === 0
                              ? 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                              : pageUnassignedCount > 0
                                ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300'
                          }`}>
                            {pagePricedItems.length === 0
                              ? 'Awaiting pricing'
                              : pageUnassignedCount > 0
                                ? `${pageUnassignedCount} unassigned`
                                : 'Ready for tender'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {!isPageCollapsed?.(page.id) && <div className={`overflow-x-auto overflow-y-auto overscroll-y-contain ${isCleanWorkspace ? 'max-h-[60vh]' : 'max-h-[50vh]'}`}>
                      <div className="origin-top-left" style={tableScaleStyle}>
                      <table className="w-full min-w-[68rem] text-left border-collapse table-fixed">
                        <thead className={pageTableHeadClass}>
                          <tr className={tableHeadRowClass}>
                            <th className="px-3 py-2 w-9 text-center">
                              <button
                                type="button"
                                onClick={() => toggleSelectedBillItems(pageItemsToRender.map((entry) => entry.id), setSelectedItemIds)}
                                disabled={pageItemsToRender.length === 0}
                                aria-label={`${pageItemsToRender.every((entry) => selectedItemIds.has(entry.id)) ? 'Deselect' : 'Select'} all visible rows on ${displayPageName}`}
                                className="inline-flex items-center justify-center rounded-app-sm p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-500 dark:hover:bg-surface-800 dark:hover:text-primary-400"
                              >
                                {pageItemsToRender.length > 0 && pageItemsToRender.every((entry) => selectedItemIds.has(entry.id))
                                  ? <CheckSquare className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                                  : <Square className="h-4 w-4" />}
                              </button>
                            </th>
                            <th className="px-3 py-2 w-14 font-mono">Ref</th>
                            <th className="px-3 py-2">Description</th>
                            <th className="px-3 py-2 w-20 text-right tabular-nums">Qty</th>
                            <th className="px-2 py-2 w-20 text-center">Unit</th>
                            <th className="px-3 py-2 w-24 text-right tabular-nums">Rate</th>
                            <th className="px-3 py-2 w-24 text-right tabular-nums">Value</th>
                            <th className="px-3 py-2 w-28">Trade</th>
                            <th className="px-3 py-2 w-24 text-center">State</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageItemsToRender.length === 0 ? (
                            <tr>
                            <td
                              colSpan={9}
                              className={`${emptyTableRowClass} border-2 border-dashed border-transparent hover:border-emerald-200 hover:bg-emerald-50/50 dark:hover:border-emerald-900/60 dark:hover:bg-emerald-950/20 ${getStandardsDestinationDropClass(section.id, page.id)}`}
                              data-standards-drop-destination="true"
                              data-bill-section-id={section.id}
                              data-bill-page-id={page.id}
                              onDragOver={(event) => handleStandardsDestinationDragOver(event, section.id, page.id)}
                                onDragLeave={clearStandardsDropIndicator}
                                onDrop={(event) => handleStandardsDestinationDrop(event, section.id, page.id)}
                              >
                                {isStandardsDragActive ? 'Release here to append standards to this page.' : isTradeFilterActive && pageItems.length > 0
                                  ? <span>No rows match this trade filter. <button type="button" className="font-semibold text-primary-700 underline" onClick={() => onChangeTradeFilter?.('ALL')}>Show all rows</button></span>
                                  : 'No items yet - drop standards here or use Add item to begin this page.'}
                              </td>
                            </tr>
                          ) : pageItemsToRender.map((item: BoQItem, idx: number) => {
                            const trade = trades.find(t => t.id === item.tradePackageId);
                            const isActive = activeItemId === item.id;
                            const isSelected = selectedItemIds.has(item.id);
                            const canAssignTrade = isCostItem(item.type);
                            const winnerName = item.tradePackageId ? tenderAwards?.[item.tradePackageId]?.contractorName || null : null;
                            const costRowIndex = pageItemsToRender.slice(0, idx + 1).filter((i: BoQItem) => isCostItem(i.type)).length - 1;
                            const headingLevel = billHeadingLevel(item);
                            const isHeadingCollapsed = headingLevel != null && collapsedHeadingIds.has(item.id);
                            return (
                              <tr
                                key={item.id}
                                data-bill-row-id={item.id}
                                data-bill-section-id={section.id}
                                data-bill-page-id={page.id}
                                data-bill-insert-anchor={activeInsertAnchorId === item.id || undefined}
                                className={`${getRowStyles(item.type, isActive, isSelected, canAssignTrade && !trade, isCostItem(item.type) ? costRowIndex : undefined)} ${pointerDraggedItemState?.itemId === item.id && pointerDraggedItemState.sectionId === section.id && (pointerDraggedItemState.pageId || null) === page.id ? 'opacity-55 bg-primary-50/70 dark:bg-primary-900/20' : ''} ${pointerDropIndicatorState?.targetItemId === item.id && pointerDropIndicatorState.sectionId === section.id && (pointerDropIndicatorState.pageId || null) === page.id ? (pointerDropIndicatorState.placement === 'before' ? 'border-t-2 border-t-primary-500' : 'border-b-2 border-b-primary-500') : ''} ${getStandardsRowDropClass(item.id, section.id, page.id)} ${getRecentlyInsertedRowClass(item.id)}`}
                                style={getRowInlineStyle(item.type, isActive, isSelected)}
                                onDragOver={handleBillRowDragOver}
                                onDragLeave={clearStandardsDropIndicator}
                                onDrop={(event) => {
                                  clearStandardsDropIndicator();
                                  onItemDrop(event, item.id, section.id, page.id);
                                }}
                                onMouseMove={(event) => onPointerDragHover(event, item.id, section.id, page.id)}
                                onContextMenu={(event) => openContextMenu(event, `${getItemAccessibilityLabel(item, getDisplayRef)} actions`, rowContextItems(item, idx, pageItemsToRender.length, page.id))}
                              >
                                <td className="px-3 py-1.5 align-top text-center">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <div draggable onMouseDown={(event) => onPointerDragStart(event, item.id, section.id, page.id)} onDragStart={(event) => onItemDragStart(event, item.id, section.id, page.id)} onDragEnd={onItemDragEnd} className="flex cursor-grab justify-center rounded-app-sm p-0.5 text-slate-300 transition hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing dark:text-slate-500 dark:hover:bg-surface-800 dark:hover:text-slate-300" title="Drag to reorder item">
                                      <GripVertical className="h-3.5 w-3.5" />
                                    </div>
                                    <button
                                      type="button"
                                      data-bill-select-row="true"
                                      onClick={() => toggleSelectedBillItem(item.id, setSelectedItemIds)}
                                      aria-pressed={isSelected}
                                      aria-label={`${isSelected ? 'Deselect' : 'Select'} ${getItemAccessibilityLabel(item, getDisplayRef)}`}
                                      className="flex justify-center rounded-app-sm p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-slate-500 dark:hover:bg-surface-800 dark:hover:text-primary-400"
                                    >
                                      {isSelected ? <CheckSquare className="w-4 h-4 text-primary-600 dark:text-primary-400" /> : <Square className="w-4 h-4 text-slate-300 dark:text-slate-500" />}
                                    </button>
                                  </div>
                                </td>
                                <td className="px-3 py-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 font-mono align-top pt-2">{getDisplayRef(item)}</td>
                                <td className="relative px-3 py-1.5 align-top">
                                  {getStandardsRowDropLabel(item.id, section.id, page.id) && (
                                    <span className="absolute right-12 top-1.5 z-10 rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-700 shadow-sm dark:border-emerald-900/60 dark:bg-surface-900 dark:text-emerald-200">
                                      {getStandardsRowDropLabel(item.id, section.id, page.id)}
                                    </span>
                                  )}
                                  {headingLevel != null ? (
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setCollapsedHeadingIds((current) => {
                                          const next = new Set(current);
                                          if (next.has(item.id)) next.delete(item.id);
                                          else next.add(item.id);
                                          return next;
                                        });
                                      }}
                                      className="absolute left-1 top-2 z-10 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-surface-800 dark:hover:text-slate-200"
                                      aria-label={isHeadingCollapsed ? 'Expand heading' : 'Collapse heading'}
                                      title={isHeadingCollapsed ? 'Expand rows below' : 'Collapse rows below'}
                                    >
                                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isHeadingCollapsed ? '-rotate-90' : ''}`} />
                                    </button>
                                  ) : null}
                                  <button
                                    type="button"
                                    data-bill-description="true"
                                    aria-label={`Select ${getItemAccessibilityLabel(item, getDisplayRef)}; double-click or press Enter to edit`}
                                    className={`flex w-full items-start gap-2 rounded-app-sm px-1 py-0 text-left transition hover:bg-slate-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-surface-800/80 ${headingLevel != null ? 'pl-5' : ''}`}
                                  >
                                    {item.type === 'PROVISIONAL_SUM' && <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />}
                                    {item.type === 'PC_SUM' && <Banknote className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />}
                                    <div className="min-w-0 flex-1">
                                      {renderBillDescription(item.description, `leading-[1.25] py-0 ${getTextStyles(item.type, getPriorCommentContextType(pageItemsToRender, idx))}`, getDescriptionInlineStyle(item.type), item.type)}
                                    </div>
                                  </button>
                                </td>
                                <td className="px-3 py-1.5 text-right text-sm font-medium text-slate-600 dark:text-slate-400 align-top pt-2 font-mono tabular-nums">
                                  {isCostItem(item.type) ? (
                                    <InlineQuantityEditor
                                      item={item}
                                      onSave={(itemId, quantity) => onInlineQuantityUpdate(itemId, quantity, section.id, page.id)}
                                    />
                                  ) : ''}
                                </td>
                                <td className="px-2 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 align-top text-center pt-2 whitespace-nowrap" title={isCostItem(item.type) ? normalizeUnit(item.unit) : ''}>
                                  {isCostItem(item.type) ? (
                                    <InlineUnitEditor
                                      item={item}
                                      onSave={(itemId, unit) => onInlineUnitUpdate(itemId, unit, section.id, page.id)}
                                    />
                                  ) : ''}
                                </td>
                                <td className="px-3 py-1.5 text-right text-sm font-medium text-slate-500 dark:text-slate-400 align-top pt-2 tabular-nums">
                                  {isCostItem(item.type) ? (
                                    <InlineRateEditor
                                      item={item}
                                      onSave={(itemId, rate) => onInlineRateUpdate(itemId, rate, section.id, page.id)}
                                    />
                                  ) : ''}
                                </td>
                                <td className="px-3 py-1.5 text-right text-sm font-semibold text-slate-900 dark:text-slate-100 align-top pt-2 tabular-nums">{isCostItem(item.type) ? formatCurrency(item.total) : ''}</td>
                                <td className="px-3 py-1.5 align-top pt-1.5">
                                  {canAssignTrade ? (
                                    <div className="flex flex-col gap-1 items-start">
                                      <TradeAssignDropdown
                                        trades={trades}
                                        onSelect={(tradeId) => onSingleItemTradeAssign(item.id, tradeId)}
                                        label={getTradeAssignmentLabel(item, trade)}
                                        helperText={getTradeAssignmentHelperText(item, trade)}
                                        triggerClassName={trade
                                          ? `${getTradeColor(trade.id)} inline-flex max-w-full items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase`
                                          : 'inline-flex items-center gap-1 rounded border border-dashed border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-amber-700 dark:border-amber-700 dark:bg-amber-950/20 dark:text-amber-300'}
                                      />
                                      {winnerName && <div className="bg-emerald-50 text-emerald-700 text-[8px] font-medium uppercase px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-1 w-fit truncate max-w-full"><Award className="w-2.5 h-2.5" /> {winnerName}</div>}
                                    </div>
                                  ) : null}
                                </td>
                                <td className="px-3 py-1.5 text-center align-top pt-1.5">
                                  {canAssignTrade && (
                                    <div className={`h-full flex items-start justify-end transition-opacity ${isSelected || isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'}`}>
                                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${trade ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300' : 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300'}`}>
                                        {trade ? 'Assigned' : 'Unassigned'}
                                      </span>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className={tableFootClass}>
                          <tr>
                            <td colSpan={6} className={`px-4 py-2 text-right ${isCleanWorkspace ? 'text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400' : 'text-xs font-medium text-slate-500 dark:text-slate-400'}`}>Page total</td>
                            <td className={`px-4 py-2 text-right tabular-nums ${isCleanWorkspace ? 'text-base font-semibold text-slate-950 dark:text-slate-50' : 'text-sm font-semibold text-slate-900 dark:text-slate-100'}`}>{formatCurrency(pageTotal)}</td>
                            <td colSpan={2}></td>
                          </tr>
                        </tfoot>
                      </table>
                      </div>
                    </div>}
                  </div>
                );
              })}
            </div>
          ) : (
          <div ref={sectionScrollRef} className={`overflow-x-auto overflow-y-auto overscroll-y-contain ${isCleanWorkspace ? 'max-h-[68vh]' : 'max-h-[65vh]'}`}>
            <div className="origin-top-left" style={tableScaleStyle}>
            <table className="w-full min-w-[68rem] text-left border-collapse table-fixed">
              <thead className={tableHeadClass}>
                <tr className={tableHeadRowClass}>
                  <th className="px-3 py-2.5 w-9 text-center">
                    <button
                      type="button"
                      onClick={() => toggleSelectedBillItems(itemsToRender.map((entry) => entry.id), setSelectedItemIds)}
                      disabled={itemsToRender.length === 0}
                      aria-label={`${itemsToRender.every((entry) => selectedItemIds.has(entry.id)) ? 'Deselect' : 'Select'} all visible rows in ${displaySectionName}`}
                      className="inline-flex items-center justify-center rounded-app-sm p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-500 dark:hover:bg-surface-800 dark:hover:text-primary-400"
                    >
                      {itemsToRender.length > 0 && itemsToRender.every((entry) => selectedItemIds.has(entry.id))
                        ? <CheckSquare className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                        : <Square className="h-4 w-4" />}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 w-14 font-mono">Ref</th>
                  <th className="px-3 py-2.5">Description</th>
                  <th className="px-3 py-2.5 w-20 text-right tabular-nums">Qty</th>
                  <th className="px-2 py-2.5 w-20 text-center">Unit</th>
                  <th className="px-3 py-2.5 w-24 text-right tabular-nums">Rate</th>
                  <th className="px-3 py-2.5 w-24 text-right tabular-nums">Value</th>
                  <th className="px-3 py-2.5 w-28">Trade</th>
                  <th className="px-3 py-2.5 w-24 text-center">State</th>
                </tr>
              </thead>
              <tbody>
                {itemsToRender.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className={`${emptyTableRowClass} border-2 border-dashed border-transparent hover:border-emerald-200 hover:bg-emerald-50/50 dark:hover:border-emerald-900/60 dark:hover:bg-emerald-950/20 ${getStandardsDestinationDropClass(section.id, undefined)}`}
                      data-standards-drop-destination="true"
                      data-bill-section-id={section.id}
                      onDragOver={(event) => handleStandardsDestinationDragOver(event, section.id, undefined)}
                      onDragLeave={clearStandardsDropIndicator}
                      onDrop={(event) => handleStandardsDestinationDrop(event, section.id, undefined)}
                    >
                      {isStandardsDragActive ? 'Release here to append standards to this section.' : isTradeFilterActive && itemsSource.length > 0
                        ? <span>No rows match this trade filter. <button type="button" className="font-semibold text-primary-700 underline" onClick={() => onChangeTradeFilter?.('ALL')}>Show all rows</button></span>
                        : 'No items yet - drop standards here or use Add item to begin this section.'}
                    </td>
                  </tr>
                ) : itemsToRender.length >= VIRTUALIZE_ITEMS_THRESHOLD && collapsedHeadingIds.size === 0 ? (
                  <VirtualizedSectionRows
                    scrollRef={sectionScrollRef}
                    itemsToRender={itemsToRender}
                    section={section}
                    activeBill={activeBill}
                    trades={trades}
                    tenderAwards={tenderAwards}
                    selectedItemIds={selectedItemIds}
                    setSelectedItemIds={setSelectedItemIds}
                    activeItemId={activeItemId}
                    activeInsertAnchorId={activeInsertAnchorId}
                    isCostItem={isCostItem}
                    getRowStyles={getRowStyles}
                    getTextStyles={getTextStyles}
                    getRowInlineStyle={getRowInlineStyle}
                    getDescriptionInlineStyle={getDescriptionInlineStyle}
                    onOpenEditor={onOpenEditor}
                    onSingleItemTradeAssign={onSingleItemTradeAssign}
                    onDeleteBillItem={onDeleteBillItem}
                    onShiftBillItem={onShiftBillItem}
                    onInlineQuantityUpdate={onInlineQuantityUpdate}
                    onInlineUnitUpdate={onInlineUnitUpdate}
                    onInlineRateUpdate={onInlineRateUpdate}
                    onItemDragStart={onItemDragStart}
                    onPointerDragStart={onPointerDragStart}
                    onPointerDragHover={onPointerDragHover}
                    onRowContextMenu={(event, item, index, itemPageId) => openContextMenu(event, `${getItemAccessibilityLabel(item, getDisplayRef)} actions`, rowContextItems(item, index, itemsToRender.length, itemPageId))}
                    onItemDragOver={handleBillRowDragOver}
                    onItemDragEnd={onItemDragEnd}
                    onItemDrop={(event, targetItemId, rowSectionId, rowPageId) => {
                      clearStandardsDropIndicator();
                      onItemDrop(event, targetItemId, rowSectionId, rowPageId);
                    }}
                    getAdditionalRowClass={(item, rowSectionId, rowPageId) => `${getStandardsRowDropClass(item.id, rowSectionId, rowPageId)} ${getRecentlyInsertedRowClass(item.id)}`}
                    getAdditionalRowLabel={(item, rowSectionId, rowPageId) => getStandardsRowDropLabel(item.id, rowSectionId, rowPageId)}
                    getDisplayRef={getDisplayRef}
                    pageId={undefined}
                    pointerDraggedItemState={pointerDraggedItemState}
                    pointerDropIndicatorState={pointerDropIndicatorState}
                  />
                ) : (
                  itemsToRender.map((item, idx) => {
                    const trade = trades.find(t => t.id === item.tradePackageId);
                    const isActive = activeItemId === item.id;
                    const isSelected = selectedItemIds.has(item.id);
                    const canAssignTrade = isCostItem(item.type);
                    const winnerName = item.tradePackageId ? tenderAwards?.[item.tradePackageId]?.contractorName || null : null;
                    const costRowIndex = itemsToRender.slice(0, idx + 1).filter(i => isCostItem(i.type)).length - 1;
                    const headingLevel = billHeadingLevel(item);
                    const isHeadingCollapsed = headingLevel != null && collapsedHeadingIds.has(item.id);
                    return (
                      <tr
                        key={item.id}
                        data-bill-row-id={item.id}
                        data-bill-section-id={section.id}
                        data-bill-insert-anchor={activeInsertAnchorId === item.id || undefined}
                        className={`${getRowStyles(item.type, isActive, isSelected, canAssignTrade && !trade, isCostItem(item.type) ? costRowIndex : undefined)} ${pointerDraggedItemState?.itemId === item.id && pointerDraggedItemState.sectionId === section.id && !pointerDraggedItemState.pageId ? 'opacity-55 bg-primary-50/70 dark:bg-primary-900/20' : ''} ${pointerDropIndicatorState?.targetItemId === item.id && pointerDropIndicatorState.sectionId === section.id && !pointerDropIndicatorState.pageId ? (pointerDropIndicatorState.placement === 'before' ? 'border-t-2 border-t-primary-500' : 'border-b-2 border-b-primary-500') : ''} ${getStandardsRowDropClass(item.id, section.id, undefined)} ${getRecentlyInsertedRowClass(item.id)}`}
                        style={getRowInlineStyle(item.type, isActive, isSelected)}
                        onDragOver={handleBillRowDragOver}
                        onDragLeave={clearStandardsDropIndicator}
                        onDrop={(event) => {
                          clearStandardsDropIndicator();
                          onItemDrop(event, item.id, section.id, undefined);
                        }}
                        onMouseMove={(event) => onPointerDragHover(event, item.id, section.id, undefined)}
                        onContextMenu={(event) => openContextMenu(event, `${getItemAccessibilityLabel(item, getDisplayRef)} actions`, rowContextItems(item, idx, itemsToRender.length, undefined))}
                      >
                        <td className="px-3 py-1.5 align-top text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            <div draggable onMouseDown={(event) => onPointerDragStart(event, item.id, section.id, undefined)} onDragStart={(event) => onItemDragStart(event, item.id, section.id, undefined)} onDragEnd={onItemDragEnd} className="flex cursor-grab justify-center rounded-app-sm p-0.5 text-slate-300 transition hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing dark:text-slate-500 dark:hover:bg-surface-800 dark:hover:text-slate-300" title="Drag to reorder item">
                              <GripVertical className="h-3.5 w-3.5" />
                            </div>
                            <button
                              type="button"
                              data-bill-select-row="true"
                              onClick={() => toggleSelectedBillItem(item.id, setSelectedItemIds)}
                              aria-pressed={isSelected}
                              aria-label={`${isSelected ? 'Deselect' : 'Select'} ${getItemAccessibilityLabel(item, getDisplayRef)}`}
                              className="flex justify-center rounded-app-sm p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-slate-500 dark:hover:bg-surface-800 dark:hover:text-primary-400"
                            >
                              {isSelected ? <CheckSquare className="w-4 h-4 text-primary-600 dark:text-primary-400" /> : <Square className="w-4 h-4 text-slate-300 dark:text-slate-500" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 font-mono align-top pt-2">
                          {getDisplayRef(item)}
                        </td>
                        <td className="relative px-3 py-1.5 align-top">
                          {getStandardsRowDropLabel(item.id, section.id, undefined) && (
                            <span className="absolute right-12 top-1.5 z-10 rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-700 shadow-sm dark:border-emerald-900/60 dark:bg-surface-900 dark:text-emerald-200">
                              {getStandardsRowDropLabel(item.id, section.id, undefined)}
                            </span>
                          )}
                          {headingLevel != null ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setCollapsedHeadingIds((current) => {
                                  const next = new Set(current);
                                  if (next.has(item.id)) next.delete(item.id);
                                  else next.add(item.id);
                                  return next;
                                });
                              }}
                              className="absolute left-1 top-2 z-10 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-surface-800 dark:hover:text-slate-200"
                              aria-label={isHeadingCollapsed ? 'Expand heading' : 'Collapse heading'}
                              title={isHeadingCollapsed ? 'Expand rows below' : 'Collapse rows below'}
                            >
                              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isHeadingCollapsed ? '-rotate-90' : ''}`} />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            data-bill-description="true"
                            aria-label={`Select ${getItemAccessibilityLabel(item, getDisplayRef)}; double-click or press Enter to edit`}
                            className={`flex w-full items-start gap-2 rounded-app-sm px-1 py-0 text-left transition hover:bg-slate-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-surface-800/80 ${headingLevel != null ? 'pl-5' : ''}`}
                          >
                            {item.type === 'PROVISIONAL_SUM' && <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />}
                            {item.type === 'PC_SUM' && <Banknote className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />}
                            <div className="min-w-0 flex-1">
                              {renderBillDescription(item.description, `leading-[1.25] py-0 ${getTextStyles(item.type, getPriorCommentContextType(itemsToRender, idx))}`, getDescriptionInlineStyle(item.type), item.type)}
                            </div>
                          </button>
                        </td>
                        <td className="px-3 py-1.5 text-right text-sm font-medium text-slate-600 dark:text-slate-400 align-top pt-2 font-mono tabular-nums">
                          {isCostItem(item.type) ? (
                            <InlineQuantityEditor
                              item={item}
                              onSave={(itemId, quantity) => onInlineQuantityUpdate(itemId, quantity, section.id, undefined)}
                            />
                          ) : ''}
                        </td>
                        <td className="px-2 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 align-top text-center pt-2 whitespace-nowrap" title={isCostItem(item.type) ? normalizeUnit(item.unit) : ''}>
                          {isCostItem(item.type) ? (
                            <InlineUnitEditor
                              item={item}
                              onSave={(itemId, unit) => onInlineUnitUpdate(itemId, unit, section.id, undefined)}
                            />
                          ) : ''}
                        </td>
                          <td className="px-3 py-1.5 text-right text-sm font-medium text-slate-500 dark:text-slate-400 align-top pt-2 tabular-nums">
                            {isCostItem(item.type) ? (
                              <InlineRateEditor
                                item={item}
                                onSave={(itemId, rate) => onInlineRateUpdate(itemId, rate, section.id, undefined)}
                              />
                            ) : ''}
                          </td>
                        <td className="px-3 py-1.5 text-right text-sm font-semibold text-slate-900 dark:text-slate-100 align-top pt-2 tabular-nums">{isCostItem(item.type) ? formatCurrency(item.total) : ''}</td>
                        <td className="px-3 py-1.5 align-top pt-1.5">
                          {canAssignTrade ? (
                            <div className="flex flex-col gap-1 items-start">
                              <TradeAssignDropdown
                                trades={trades}
                                onSelect={(tradeId) => onSingleItemTradeAssign(item.id, tradeId)}
                                label={getTradeAssignmentLabel(item, trade)}
                                helperText={getTradeAssignmentHelperText(item, trade)}
                                triggerClassName={trade
                                  ? `${getTradeColor(trade.id)} inline-flex max-w-full items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase`
                                  : 'inline-flex items-center gap-1 rounded border border-dashed border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-amber-700 dark:border-amber-700 dark:bg-amber-950/20 dark:text-amber-300'}
                              />
                              {winnerName && <div className="bg-emerald-50 text-emerald-700 text-[8px] font-medium uppercase px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-1 w-fit truncate max-w-full"><Award className="w-2.5 h-2.5" /> {winnerName}</div>}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-1.5 text-center align-top pt-1.5">
                          {canAssignTrade && (
                            <div className={`h-full flex items-start justify-end transition-opacity ${isSelected || isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'}`}>
                              <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${trade ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300' : 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300'}`}>
                                {trade ? 'Assigned' : 'Unassigned'}
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className={tableFootClass}>
                <tr>
                  <td colSpan={6} className={`px-4 py-2.5 text-right ${isCleanWorkspace ? 'text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400' : 'text-xs font-medium text-slate-500 dark:text-slate-400'}`}>Section total</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${isCleanWorkspace ? 'text-base font-semibold text-slate-950 dark:text-slate-50' : 'text-sm font-semibold text-slate-900 dark:text-slate-100'}`}>{formatCurrency(sectionTotal)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
            </div>
          </div>
          )
        )}
      </div>
      <ContextMenu state={contextMenu} onClose={() => setContextMenu(null)} />
    </div>
  );
}
