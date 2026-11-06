import React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Award, Banknote, CheckSquare, Coins, GripVertical, Square } from 'lucide-react';
import type { BoQBill, BoQItem, BoQSection, ItemType, TenderAwardRecord, TradePackage } from '../../types';
import { formatCurrency, getTradeColor, normalizeUnit } from '../../utils/formatting';
import { getPriorCommentContextType } from '../../utils/billStructure';
import { TradeAssignDropdown } from '../UI/TradeAssignDropdown';
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
} from './billRowHelpers';

// Descriptions often wrap when the application shares a screen. This is only
// a starting point: rendered rows are measured below so virtual scroll space
// stays in step with their real height.
const ROW_ESTIMATE_HEIGHT = 38;

export interface VirtualizedSectionRowsProps {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  itemsToRender: BoQItem[];
  section: BoQSection;
  activeBill: BoQBill;
  trades: TradePackage[];
  tenderAwards?: Record<string, TenderAwardRecord>;
  selectedItemIds: Set<string>;
  setSelectedItemIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  activeItemId: string | null;
  activeInsertAnchorId?: string | null;
  isCostItem: (type: string) => boolean;
  getRowStyles: (type: string, isActive: boolean, isSelected?: boolean, isUnassigned?: boolean, costRowIndex?: number) => string;
  getTextStyles: (type: string, previousType?: string | null) => string;
  getRowInlineStyle: (type: string, isActive: boolean, isSelected?: boolean) => React.CSSProperties | undefined;
  getDescriptionInlineStyle: (type: string) => React.CSSProperties | undefined;
  onOpenEditor: (billId: string, sectionId: string, item?: BoQItem, type?: ItemType, pageId?: string | null, insertAfterItemId?: string | null) => void;
  onSingleItemTradeAssign: (itemId: string, tradeId: string) => void;
  onDeleteBillItem: (sectionId: string, itemId: string, pageId?: string | null) => void;
  onShiftBillItem: (itemId: string, direction: 'UP' | 'DOWN', sectionId: string, pageId?: string | null) => void;
  onInlineQuantityUpdate: (itemId: string, quantity: number, sectionId: string, pageId?: string | null) => void;
  onInlineUnitUpdate: (itemId: string, unit: string, sectionId: string, pageId?: string | null) => void;
  onInlineRateUpdate: (itemId: string, rate: number, sectionId: string, pageId?: string | null) => void;
  onItemDragStart: (event: React.DragEvent<HTMLElement>, itemId: string, sectionId: string, pageId?: string | null) => void;
  onPointerDragStart: (event: React.MouseEvent<HTMLElement>, itemId: string, sectionId: string, pageId?: string | null) => void;
  onPointerDragHover: (event: React.MouseEvent<HTMLTableRowElement>, targetItemId: string, sectionId: string, pageId?: string | null) => void;
  onRowContextMenu?: (event: React.MouseEvent<HTMLTableRowElement>, item: BoQItem, index: number, pageId?: string | null) => void;
  onItemDragOver: (event: React.DragEvent<HTMLElement>) => void;
  onItemDragEnd: () => void;
  onItemDrop: (event: React.DragEvent<HTMLTableRowElement>, targetItemId: string, sectionId: string, pageId?: string | null) => void;
  getAdditionalRowClass?: (item: BoQItem, sectionId: string, pageId?: string | null) => string;
  getAdditionalRowLabel?: (item: BoQItem, sectionId: string, pageId?: string | null) => string | null;
  getDisplayRef: (item: BoQItem) => string;
  pageId?: string | null;
  pointerDraggedItemState: { itemId: string; sectionId: string; pageId?: string | null } | null;
  pointerDropIndicatorState: { targetItemId: string; sectionId: string; pageId?: string | null; placement: 'before' | 'after' } | null;
}

export function VirtualizedSectionRows(props: VirtualizedSectionRowsProps) {
  const {
    scrollRef,
    itemsToRender,
    section,
    activeBill,
    trades,
    tenderAwards,
    selectedItemIds,
    setSelectedItemIds,
    activeItemId,
    activeInsertAnchorId,
    isCostItem,
    getRowStyles,
    getTextStyles,
    getRowInlineStyle,
    getDescriptionInlineStyle,
    onOpenEditor,
    onSingleItemTradeAssign,
    onDeleteBillItem,
    onShiftBillItem,
    onInlineQuantityUpdate,
    onInlineUnitUpdate,
    onInlineRateUpdate,
    onItemDragStart,
    onPointerDragStart,
    onPointerDragHover,
    onRowContextMenu,
    onItemDragOver,
    onItemDragEnd,
    onItemDrop,
    getAdditionalRowClass,
    getAdditionalRowLabel,
    getDisplayRef,
    pageId,
    pointerDraggedItemState,
    pointerDropIndicatorState,
  } = props;
  const virtualizer = useVirtualizer({
    count: itemsToRender.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_ESTIMATE_HEIGHT,
    overscan: 5,
    measureElement: (element) => element.getBoundingClientRect().height,
  });
  const totalSize = virtualizer.getTotalSize();
  const virtualItems = virtualizer.getVirtualItems();
  const paddingStart = virtualItems[0]?.start ?? 0;
  const paddingEnd = totalSize - (virtualItems[virtualItems.length - 1]?.end ?? 0);

  return (
    <>
      {paddingStart > 0 && (
        <tr><td colSpan={9} style={{ height: `${paddingStart}px`, padding: 0, lineHeight: 0, border: 'none' }} aria-hidden /></tr>
      )}
      {virtualItems.map((virtualRow) => {
        const item = itemsToRender[virtualRow.index];
        const idx = virtualRow.index;
        const trade = trades.find(t => t.id === item.tradePackageId);
        const isActive = activeItemId === item.id;
        const isSelected = selectedItemIds.has(item.id);
        const canAssignTrade = isCostItem(item.type);
        const winnerName = item.tradePackageId ? tenderAwards?.[item.tradePackageId]?.contractorName || null : null;
        const costRowIndex = itemsToRender.slice(0, idx + 1).filter(i => isCostItem(i.type)).length - 1;
        return (
          <tr
            key={item.id}
            data-bill-row-id={item.id}
            data-bill-section-id={section.id}
            data-bill-page-id={pageId || undefined}
            data-bill-insert-anchor={activeInsertAnchorId === item.id || undefined}
            className={`${getRowStyles(item.type, isActive, isSelected, canAssignTrade && !trade, isCostItem(item.type) ? costRowIndex : undefined)} ${pointerDraggedItemState?.itemId === item.id && pointerDraggedItemState.sectionId === section.id && (pointerDraggedItemState.pageId || null) === (pageId || null) ? 'opacity-55 bg-primary-50/70 dark:bg-primary-900/20' : ''} ${pointerDropIndicatorState?.targetItemId === item.id && pointerDropIndicatorState.sectionId === section.id && (pointerDropIndicatorState.pageId || null) === (pageId || null) ? (pointerDropIndicatorState.placement === 'before' ? 'border-t-2 border-t-primary-500' : 'border-b-2 border-b-primary-500') : ''} ${getAdditionalRowClass?.(item, section.id, pageId) || ''}`}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={getRowInlineStyle(item.type, isActive, isSelected)}
            onDragOver={onItemDragOver}
            onDrop={(event) => onItemDrop(event, item.id, section.id, pageId)}
            onMouseMove={(event) => onPointerDragHover(event, item.id, section.id, pageId)}
            onContextMenu={(event) => onRowContextMenu?.(event, item, idx, pageId)}
          >
            <td className="px-3 py-1.5 align-top text-center">
              <div className="flex items-center justify-center gap-0.5">
                <div
                  draggable
                  onMouseDown={(event) => onPointerDragStart(event, item.id, section.id, pageId)}
                  onDragStart={(event) => onItemDragStart(event, item.id, section.id, pageId)}
                  onDragEnd={onItemDragEnd}
                  className="flex cursor-grab justify-center rounded-app-sm p-0.5 text-slate-300 transition hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing dark:text-slate-500 dark:hover:bg-surface-800 dark:hover:text-slate-300"
                  title="Drag to reorder item"
                >
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
              {getAdditionalRowLabel?.(item, section.id, pageId) && (
                <span className="absolute right-12 top-1.5 z-10 rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-700 shadow-sm dark:border-emerald-900/60 dark:bg-surface-900 dark:text-emerald-200">
                  {getAdditionalRowLabel(item, section.id, pageId)}
                </span>
              )}
              <button
                type="button"
                data-bill-description="true"
                aria-label={`Select ${getItemAccessibilityLabel(item, getDisplayRef)}; double-click or press Enter to edit`}
                className={`flex w-full items-start gap-2 rounded-app-sm px-1 py-0 text-left transition hover:bg-slate-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-surface-800/80 ${['GENERAL_HEADING', 'MAJOR_HEADING', 'SUB_SECTION', 'MINOR_HEADING'].includes(item.type) ? 'pl-5' : ''}`}
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
                  onSave={(itemId, quantity) => onInlineQuantityUpdate(itemId, quantity, section.id, pageId)}
                />
              ) : ''}
            </td>
            <td className="px-2 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 align-top text-center pt-2 whitespace-nowrap" title={isCostItem(item.type) ? normalizeUnit(item.unit) : ''}>
              {isCostItem(item.type) ? (
                <InlineUnitEditor
                  item={item}
                  onSave={(itemId, unit) => onInlineUnitUpdate(itemId, unit, section.id, pageId)}
                />
              ) : ''}
            </td>
            <td className="px-3 py-1.5 text-right text-sm font-medium text-slate-500 dark:text-slate-400 align-top pt-2 tabular-nums">
              {isCostItem(item.type) ? (
                <InlineRateEditor
                  item={item}
                  onSave={(itemId, rate) => onInlineRateUpdate(itemId, rate, section.id, pageId)}
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
                  {winnerName && (
                    <div className="bg-emerald-50 text-emerald-700 text-[8px] font-medium uppercase px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-1 w-fit truncate max-w-full">
                      <Award className="w-2.5 h-2.5" /> {winnerName}
                    </div>
                  )}
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
      {paddingEnd > 0 && (
        <tr><td colSpan={9} style={{ height: `${paddingEnd}px`, padding: 0, lineHeight: 0, border: 'none' }} aria-hidden /></tr>
      )}
    </>
  );
}
