
import React, { useEffect, useRef, useState } from 'react';
import { Layers, Plus, Edit2, Library as LibraryIcon, Trash2, Tag, CheckSquare, Square, ArrowRight, CheckCircle2, Circle, BarChart3, Copy, ClipboardPaste, Eraser, Trophy, Users, X, Move, FileDown, History, Minimize2, ReceiptText, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../utils/formatting';
import { TradeAssignDropdown } from '../UI/TradeAssignDropdown';
import { BillStructureMenu } from './BillStructureMenu';
import { BillAppearanceMenu } from './BillAppearanceMenu';
import { BillSectionCard } from './BillSectionCard';
import { buildClearValuesActionItems, ClearValuesMenuGroup } from './billActionMenuItems';
import { PopoverMenu } from '../UI/PopoverMenu';
import { ContextMenu, shouldUseNativeContextMenu } from '../UI/ContextMenu';
import type { ContextMenuEntry, ContextMenuState } from '../UI/ContextMenu';
import { getBillItems, safeAdd, safeMul } from '../../utils/calculations';
import {
  buildBillItemsFromLibraryInsert,
  clearLibraryInsertDrag,
  resolveLibraryDropPayload,
  getActiveLibraryInsertDragPayload,
  getLibraryInsertModeLabel,
  hasLibraryInsertDragPayload,
  isLibraryInsertPointerDropEvent,
  LIBRARY_INSERT_DRAG_STATE_EVENT,
  LIBRARY_INSERT_POINTER_DROP_EVENT,
  parseLibraryInsertDragPayload,
  type LibraryInsertDragStateDetail,
  type LibraryInsertDragPayload,
} from '../../utils/libraryInsert';
import { getLibraryHeadingLevel, isLibraryHeadingType, PRICED_TYPES } from '../../utils/libraryViewModel';
import { stripRichText } from '../../utils/richText';
import { getBillDestinationItems, isBillInsertDestinationValid, resolveRowDropPlacement, ROW_DROP_HINT, LIBRARY_DROP_HINT } from '../../utils/billPlacement';
import { useToast } from '../../contexts/ToastContext';
import { getNextCommentItemType, getNextHeadingItemType } from '../../utils/billStructure';
import { DEFAULT_BILL_LINE_STYLES } from '../../utils/appSettings';
import { generateId } from '../../utils/generateId';
import { getAdjacentBillRow, getBillNavigationRows } from '../../utils/billNavigation';
import { getAiRateRowContext, getSelectedAiRateRows, type BillAiRateUpdate } from '../../utils/billAiRateSelection';
import { BillAiRateDialog, type BillAiRateTarget } from './BillAiRateDialog';
import { formatProjectSiteLocation } from '../../utils/siteLocation';
import type { BoQBill, BoQSection, BoQPage, BoQItem, TradePackage, Project, ItemType, BillWorkspaceLayout, BillLineStyleConfig, BillLineStyleKey, ClearValuesMode, LibraryInsertMode, LibraryInsertPlacement } from '../../types';

type StandardsDropDestination = {
  billId: string;
  sectionId: string;
  pageId?: string | null;
  placement: LibraryInsertPlacement;
  anchorItemId?: string | null;
  label: string;
  existingItems: BoQItem[];
};

type StandardsDropState = {
  payload: LibraryInsertDragPayload;
  selectedItem: BoQItem | null;
  destination: StandardsDropDestination;
};

type FloatingWidgetPosition = {
  x: number;
  y: number;
};

const FLOATING_WIDGET_PADDING = 12;
const STICKY_TOTALS_FALLBACK_SIZE = { width: 480, height: 164 };
const QUICK_LINE_TYPES: Array<[ItemType, string]> = [
  ['GENERAL_HEADING', 'H1'], ['MAJOR_HEADING', 'H2'],
  ['SUB_SECTION', 'H3'], ['MINOR_HEADING', 'H4'],
  ['COMMENT', 'Comment'], ['SUB_COMMENT', 'Sub-comment'], ['PRICED', 'Priced item'],
];

function getBillLineStyleConfig(project: Project | null | undefined, type: string): BillLineStyleConfig | null {
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_BILL_LINE_STYLES, type)) return null;
  const key = type as BillLineStyleKey;
  return {
    ...DEFAULT_BILL_LINE_STYLES[key],
    ...(project?.billLineStyles?.[key] || {}),
  };
}

function describeBillItem(item: BoQItem | null) {
  if (!item) return 'Selected standard';
  const description = stripRichText(item.description || '').trim();
  return [item.reference, description].filter(Boolean).join(' - ') || item.type;
}

function getStandardsPreviewTypeLabel(item: BoQItem) {
  if (PRICED_TYPES.has(item.type)) {
    if (item.type === 'EXTRA_OVER_ITEM') return 'Extra';
    if (item.type === 'PROVISIONAL_SUM') return 'PS';
    if (item.type === 'PC_SUM') return 'PC';
    return 'Priced';
  }
  if (item.type === 'COMMENT') return 'Comment';
  if (item.type === 'SUB_COMMENT') return 'Sub-comment';
  if (isLibraryHeadingType(item.type)) return 'Heading';
  return item.type;
}

function getStandardsPreviewDetailLabel(item: BoQItem) {
  if (PRICED_TYPES.has(item.type)) {
    if (item.type === 'EXTRA_OVER_ITEM') return 'Extra-over item';
    if (item.type === 'PROVISIONAL_SUM') return 'Provisional sum';
    if (item.type === 'PC_SUM') return 'PC sum';
    return 'Priced item';
  }
  switch (item.type) {
    case 'GENERAL_HEADING':
      return 'H1 heading';
    case 'MAJOR_HEADING':
      return 'H2 heading';
    case 'SUB_SECTION':
      return 'H3 heading';
    case 'MINOR_HEADING':
      return 'H4 heading';
    case 'COMMENT':
      return 'Comment';
    case 'SUB_COMMENT':
      return 'Sub-comment';
    default:
      return item.type;
  }
}

function getStandardsPreviewIndent(item: BoQItem) {
  if (PRICED_TYPES.has(item.type)) return 42;
  if (item.type === 'COMMENT') return 28;
  if (item.type === 'SUB_COMMENT') return 38;
  if (isLibraryHeadingType(item.type)) return Math.min(8 + (getLibraryHeadingLevel(item.type) - 1) * 12, 48);
  return 24;
}

function summariseStandardsDropItems(items: BoQItem[]) {
  return items.reduce(
    (summary, item) => {
      if (PRICED_TYPES.has(item.type)) summary.priced += 1;
      else if (item.type === 'COMMENT' || item.type === 'SUB_COMMENT') summary.comments += 1;
      else if (isLibraryHeadingType(item.type)) summary.headings += 1;
      else summary.other += 1;
      return summary;
    },
    { priced: 0, headings: 0, comments: 0, other: 0 },
  );
}

function getStandardsDropModeOptions(selected: BoQItem | null, defaultMode: LibraryInsertMode, sourceItemCount: number) {
  const optionMap = new Map<LibraryInsertMode, { mode: LibraryInsertMode; detail: string; disabled?: boolean; recommended?: boolean }>();
  const addOption = (mode: LibraryInsertMode, detail: string, disabled = false, recommended = false) => {
    optionMap.set(mode, { mode, detail, disabled, recommended });
  };

  if (selected && PRICED_TYPES.has(selected.type)) {
    addOption('WITH_MISSING_PARENTS', 'Insert the priced item plus missing parent headings/comments above it.', false, true);
    addOption('ITEM_ONLY', 'Insert only this priced item.', false);
  } else if (selected && isLibraryHeadingType(selected.type)) {
    addOption(
      'FROM_HEADING',
      sourceItemCount > 1
        ? 'Insert this heading and the loaded rows beneath it.'
        : 'Expand this heading in the Standards panel first to include rows beneath it.',
      sourceItemCount <= 1,
      sourceItemCount > 1,
    );
    addOption('ITEM_ONLY', 'Insert only this heading row.', false, sourceItemCount <= 1);
  } else if (selected?.type === 'COMMENT' || selected?.type === 'SUB_COMMENT') {
    addOption(
      'FROM_COMMENT',
      sourceItemCount > 1
        ? 'Insert this comment and the loaded rows beneath it.'
        : 'Only this comment is loaded, so there are no lower rows to include.',
      sourceItemCount <= 1,
      sourceItemCount > 1,
    );
    addOption('ITEM_ONLY', 'Insert only this comment row.', false, sourceItemCount <= 1);
  } else {
    addOption('ITEM_ONLY', 'Insert only the selected row.', false, true);
  }

  if (!optionMap.has(defaultMode)) {
    addOption(defaultMode, 'Use the current Standards panel insert mode.', false);
  }

  return Array.from(optionMap.values());
}

function StandardsDropOptionsDialog({
  state,
  onClose,
  onConfirm,
}: {
  state: StandardsDropState;
  onClose: () => void;
  onConfirm: (items: BoQItem[], destination: StandardsDropDestination) => void;
}) {
  const options = React.useMemo(
    () => getStandardsDropModeOptions(state.selectedItem, state.payload.defaultMode, state.payload.sourceItems.length),
    [state.payload.defaultMode, state.payload.sourceItems.length, state.selectedItem],
  );
  const initialMode = React.useMemo(() => (
    options.find((option) => option.recommended && !option.disabled)?.mode ||
    options.find((option) => !option.disabled)?.mode ||
    'ITEM_ONLY'
  ), [options]);
  const [mode, setMode] = React.useState<LibraryInsertMode>(initialMode);

  React.useEffect(() => {
    setMode(initialMode);
  }, [initialMode, state]);

  const insertItems = React.useMemo(() => buildBillItemsFromLibraryInsert(
    state.payload.sourceItems,
    state.payload.selectedItemId,
    mode,
    state.destination.existingItems,
    { placement: state.destination.placement, anchorItemId: state.destination.anchorItemId },
  ), [mode, state.destination, state.payload.selectedItemId, state.payload.sourceItems]);
  const dropSummary = React.useMemo(() => summariseStandardsDropItems(insertItems), [insertItems]);
  const previewRows = insertItems.slice(0, 6);
  const hiddenPreviewCount = Math.max(0, insertItems.length - previewRows.length);
  const selectedLabel = describeBillItem(state.selectedItem);
  const isContextInsert = mode === 'FROM_HEADING' || mode === 'FROM_COMMENT' || mode === 'FULL_SECTION';

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl overflow-hidden rounded-app-xl border border-slate-200 bg-white shadow-[0_24px_80px_-30px_rgba(15,23,42,0.65)] dark:border-slate-700 dark:bg-surface-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
              <LibraryIcon className="h-3.5 w-3.5" />
              Library drop options
            </div>
            <h2 className="mt-3 text-base font-semibold text-slate-950 dark:text-slate-50">Choose what to insert</h2>
            <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{selectedLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="workspace-icon-btn" aria-label="Cancel library drop">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-app border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-300">
            <div className="font-semibold text-slate-800 dark:text-slate-100">Destination</div>
            <div className="mt-1 leading-5">{state.destination.label}</div>
          </div>

          <div className="space-y-2">
            {options.map((option) => {
              const isActive = mode === option.mode;
              return (
                <button
                  key={option.mode}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => setMode(option.mode)}
                  className={`flex w-full items-start gap-3 rounded-app border px-3 py-2.5 text-left transition ${
                    isActive
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200 dark:hover:bg-surface-800'
                  } ${option.disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${isActive ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 dark:border-slate-600'}`}>
                    {isActive ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {getLibraryInsertModeLabel(option.mode)}
                      {option.recommended && !option.disabled ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">Suggested</span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{option.detail}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className={`rounded-app border px-3 py-2 text-xs leading-5 ${
            insertItems.length > 0
              ? 'border-emerald-100 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100'
              : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200'
          }`}>
            {insertItems.length > 0 ? (
              <>
                <div className="font-semibold">Ready to insert {insertItems.length.toLocaleString()} row{insertItems.length === 1 ? '' : 's'}</div>
                <div>
                  {dropSummary.priced.toLocaleString()} priced, {dropSummary.headings.toLocaleString()} heading, {dropSummary.comments.toLocaleString()} comment
                  {dropSummary.other ? `, ${dropSummary.other.toLocaleString()} other` : ''} rows.
                </div>
                {isContextInsert ? (
                  <div className="mt-1 text-emerald-800/80 dark:text-emerald-100/75">
                    This scope includes the selected row and loaded rows below it. Expand the heading in Standards first if you need more lower-level rows available.
                  </div>
                ) : null}
              </>
            ) : (
              <div>No new rows will be inserted. The selected structure may already exist at this destination.</div>
            )}
          </div>

          {previewRows.length > 0 ? (
            <div className="overflow-hidden rounded-app border border-slate-200 bg-white dark:border-slate-700 dark:bg-surface-950">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <span>Insert preview</span>
                <span>{insertItems.length.toLocaleString()} total</span>
              </div>
              <div className="max-h-52 overflow-y-auto">
                {previewRows.map((item) => {
                  const description = stripRichText(item.description || '').trim();
                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-[88px_minmax(0,1fr)_86px] gap-3 border-b border-slate-100 px-3 py-2 text-xs last:border-b-0 dark:border-slate-800"
                      style={{ paddingLeft: getStandardsPreviewIndent(item) }}
                    >
                      <span className="truncate font-mono text-slate-500 dark:text-slate-400">{item.reference || '-'}</span>
                      <span className="min-w-0" title={description}>
                        <span className="block truncate font-medium text-slate-800 dark:text-slate-100">{description || item.type}</span>
                        <span className="block truncate text-[10px] text-slate-400 dark:text-slate-500">{getStandardsPreviewDetailLabel(item)}</span>
                      </span>
                      <span className="justify-self-end rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300">
                        {getStandardsPreviewTypeLabel(item)}
                      </span>
                    </div>
                  );
                })}
              </div>
              {hiddenPreviewCount > 0 ? (
                <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-400">
                  Plus {hiddenPreviewCount.toLocaleString()} more row{hiddenPreviewCount === 1 ? '' : 's'} in this insert.
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
          <button type="button" onClick={onClose} className="workspace-secondary-btn px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            disabled={insertItems.length === 0}
            onClick={() => onConfirm(insertItems, state.destination)}
            className="workspace-primary-btn px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Insert {insertItems.length.toLocaleString()} row{insertItems.length === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
}

export interface BillViewProps {
  activeBill: BoQBill | null;
  activeProject?: Project | null;
  onUpdateLineStyle?: (key: BillLineStyleKey, style: BillLineStyleConfig) => void;
  onSaveLineStylesDefault?: () => void;
  viewMode: 'standard' | 'trade';
  selectedTradeFilter: string;
  trades: TradePackage[];
  selectedItemIds: Set<string>;
  setSelectedItemIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  recentlyInsertedItemIds?: Set<string>;
  onOpenEditor: (billId: string, sectionId: string, item?: BoQItem, type?: ItemType, pageId?: string | null, insertAfterItemId?: string | null) => void;
  onExpandEditor?: () => void;
  onOpenPrompt: (type: string, context?: Record<string, unknown> | BoQBill) => void;
  onOpenLibrary: (open: boolean) => void;
  onOpenStandardsInsert?: () => void;
  onOpenImportLines?: () => void;
  onImportJsonToSection?: (sectionId: string) => void;
  onImportJsonToPage?: (sectionId: string, pageId: string) => void;
  onDeleteBillItem: (sectionId: string, itemId: string, pageId?: string | null) => void;
  onMoveBillItem: (draggedItemId: string, targetItemId: string, placement: 'before' | 'after', sectionId: string, pageId?: string | null) => void;
  onInsertStandardsItems?: (items: BoQItem[], destination: { billId?: string; sectionId?: string; pageId?: string | null; placement: LibraryInsertPlacement; anchorItemId?: string | null }) => void;
  onQuickInsertLine?: (item: BoQItem, destination: { sectionId?: string; pageId?: string | null; anchorItemId?: string | null }) => void;
  onShiftBillItem: (itemId: string, direction: 'UP' | 'DOWN', sectionId: string, pageId?: string | null) => void;
  onInlineQuantityUpdate: (itemId: string, quantity: number, sectionId: string, pageId?: string | null) => void;
  onInlineUnitUpdate: (itemId: string, unit: string, sectionId: string, pageId?: string | null) => void;
  onInlineRateUpdate: (itemId: string, rate: number, sectionId: string, pageId?: string | null) => void;
  onApplyLiveRates?: (updates: BillAiRateUpdate[]) => void;
  onInlineDescriptionUpdate?: (itemId: string, description: string, sectionId: string, pageId?: string | null) => void;
  onInlineRowUpdate?: (itemId: string, fields: Partial<BoQItem>, sectionId: string, pageId?: string | null) => void;
  onBatchAssign: (tradeId: string) => void;
  onDuplicateSelectedItems?: () => void;
  onPasteCopiedItems?: () => void;
  copiedBillItemsCount?: number;
  onDeleteSelectedItems?: () => void;
  onClearSelectedValues?: (mode: ClearValuesMode) => void;
  onSingleItemTradeAssign: (itemId: string, tradeId: string) => void;
  onBillTradeAssign?: (billId: string, tradeId: string) => void;
  onSectionTradeAssign: (billId: string, sectionId: string, tradeId: string) => void;
  onPageTradeAssign?: (billId: string, sectionId: string, pageId: string, tradeId: string) => void;
  onDeleteItem?: (sectionId: string, itemId: string) => void;
  activeItemId: string | null;
  onChangeTradeFilter: (tradeId: string) => void;
  onRecordRevisionPoint?: () => void;
  onOpenTenderView?: () => void;
  onExportSection?: (section: BoQSection) => void;
  onSaveSectionAssembly?: (sectionId: string) => void;
  onDeleteSection?: (billId: string, sectionId: string) => void;
  onMoveSection?: (billId: string, sectionId: string, direction: 'UP' | 'DOWN') => void;
  onCopySection?: (billId: string, sectionId: string) => void;
  onCopyPage?: (billId: string, sectionId: string, pageId: string) => void;
  onDeletePage?: (billId: string, sectionId: string, pageId: string) => void;
  onClearBillValues?: (billId: string, mode: ClearValuesMode) => void;
  onClearSectionValues?: (billId: string, sectionId: string, mode: ClearValuesMode) => void;
  onClearPageValues?: (billId: string, sectionId: string, pageId: string, mode: ClearValuesMode) => void;
  onExportBillPdf?: () => void | Promise<void>;
  onExportBillExcel?: () => void | Promise<void>;
  isExporting?: boolean;
  selectedSectionId?: string | null;
  onSelectSection?: (sectionId: string) => void;
  selectedPageId?: string | null;
  jumpToSectionId?: string | null;
  jumpToPageId?: string | null;
  onJumpHandled?: () => void;
  onPageJumpHandled?: () => void;
  workspaceLayout?: BillWorkspaceLayout;
  workspaceZoom?: number;
  isWorkspaceMaximized?: boolean;
  isWorkspaceSurfaceActive?: boolean;
  showStickyTotalsInWorkspace?: boolean;
}

export const BillView = ({
  activeBill,
  activeProject,
  onUpdateLineStyle,
  onSaveLineStylesDefault,
  viewMode: legacyWorkspaceMode,
  selectedTradeFilter: _selectedTradeFilter,
  trades,
  selectedItemIds,
  setSelectedItemIds,
  recentlyInsertedItemIds,
  onOpenEditor,
  onExpandEditor,
  onOpenPrompt,
  onOpenLibrary,
  onOpenStandardsInsert,
  onOpenImportLines,
  onImportJsonToSection,
  onImportJsonToPage,
  onDeleteBillItem,
  onMoveBillItem,
  onInsertStandardsItems,
  onQuickInsertLine,
  onShiftBillItem,
  onInlineQuantityUpdate,
  onInlineUnitUpdate,
  onInlineRateUpdate,
  onApplyLiveRates,
  onInlineDescriptionUpdate,
  onInlineRowUpdate,
  onBatchAssign,
  onDuplicateSelectedItems,
  onPasteCopiedItems,
  copiedBillItemsCount = 0,
  onDeleteSelectedItems,
  onClearSelectedValues,
  onSingleItemTradeAssign,
  onBillTradeAssign,
  onSectionTradeAssign,
  onPageTradeAssign,
  onDeleteItem,
  activeItemId,
  onChangeTradeFilter: _onChangeTradeFilter,
  onRecordRevisionPoint,
  onOpenTenderView,
  onExportSection,
  onSaveSectionAssembly,
  onDeleteSection,
  onMoveSection,
  onCopySection,
  onCopyPage,
  onDeletePage,
  onClearBillValues,
  onClearSectionValues,
  onClearPageValues,
  onExportBillPdf,
  onExportBillExcel,
  isExporting = false,
  selectedSectionId,
  onSelectSection,
  selectedPageId,
  jumpToSectionId,
  jumpToPageId,
  onJumpHandled,
  onPageJumpHandled,
  workspaceLayout = 'FOCUSED_SECTION',
  workspaceZoom = 100,
  isWorkspaceMaximized = false,
  isWorkspaceSurfaceActive = true,
  showStickyTotalsInWorkspace = true,
}: BillViewProps) => {
  const sectionCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pageCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const billWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const [selectionDockGeometry, setSelectionDockGeometry] = useState(() => ({ center: window.innerWidth / 2, width: Math.max(280, window.innerWidth - 24) }));
  const [isSelectionDockHovered, setIsSelectionDockHovered] = useState(false);
  const [isSelectionDockPinned, setIsSelectionDockPinned] = useState(false);
  const isSelectionDockOpen = isSelectionDockHovered || isSelectionDockPinned;
  useEffect(() => {
    const element = billWorkspaceRef.current;
    if (!element || !isWorkspaceSurfaceActive) return;
    const update = () => {
      const rect = element.getBoundingClientRect();
      const width = Math.max(240, Math.min(rect.width, window.innerWidth - 24));
      const center = Math.max(width / 2 + 12, Math.min(rect.left + rect.width / 2, window.innerWidth - width / 2 - 12));
      setSelectionDockGeometry((current) => current.center === center && current.width === width ? current : { center, width });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    const panelObserver = new MutationObserver(update);
    const layoutContainer = element.parentElement?.parentElement;
    let observedPanel: Element | null = null;
    const observePanel = () => {
      const panel = layoutContainer?.querySelector('[data-standards-insert-panel]') || null;
      if (panel === observedPanel) return;
      panelObserver.disconnect();
      observedPanel = panel;
      if (panel) panelObserver.observe(panel, { attributes: true, attributeFilter: ['class', 'style', 'data-panel-mode'] });
    };
    const layoutObserver = new MutationObserver(() => { observePanel(); update(); });
    if (layoutContainer) {
      layoutObserver.observe(layoutContainer, { attributes: true, attributeFilter: ['class', 'style'], childList: true });
      observePanel();
    }
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      observer.disconnect();
      layoutObserver.disconnect();
      panelObserver.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [isWorkspaceSurfaceActive]);
  useEffect(() => {
    if (selectedItemIds.size) return;
    setIsSelectionDockHovered(false);
    setIsSelectionDockPinned(false);
  }, [selectedItemIds.size]);
  const stickyTotalsRef = useRef<HTMLDivElement | null>(null);
  const stickyTotalsDragOffsetRef = useRef({ x: 0, y: 0 });
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [collapsedBillIds, setCollapsedBillIds] = useState<Set<string>>(new Set());
  const [collapsedPageIds, setCollapsedPageIds] = useState<Set<string>>(new Set());
  const [draggedItemState, setDraggedItemState] = useState<{ itemId: string; sectionId: string; pageId?: string | null } | null>(null);
  const draggedItemRef = useRef<{ itemId: string; sectionId: string; pageId?: string | null } | null>(null);
  const [pointerDraggedItemState, setPointerDraggedItemState] = useState<{ itemId: string; sectionId: string; pageId?: string | null } | null>(null);
  const [pointerDropIndicatorState, setPointerDropIndicatorState] = useState<{ targetItemId: string; sectionId: string; pageId?: string | null; placement: 'before' | 'after' } | null>(null);
  const pointerDropTargetRef = useRef<{ targetItemId: string; sectionId: string; pageId?: string | null; placement: 'before' | 'after' } | null>(null);
  const [workspaceContextMenu, setWorkspaceContextMenu] = useState<ContextMenuState>(null);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [activeInsertAnchor, setActiveInsertAnchor] = useState<{ itemId: string; sectionId: string; pageId?: string | null } | null>(null);
  const [isQuickPaletteOpen, setIsQuickPaletteOpen] = useState(false);
  const [aiRateTargets, setAiRateTargets] = useState<BillAiRateTarget[] | null>(null);
  const [quickPalettePosition, setQuickPalettePosition] = useState(() => ({ left: Math.max(12, window.innerWidth - 340), top: 150 }));
  const [quickPaletteSize, setQuickPaletteSize] = useState({ width: 300, height: 310 });
  const quickPaletteRef = useRef<HTMLElement | null>(null);
  const quickPaletteDragRef = useRef<{ x: number; y: number; left: number; top: number; nextLeft: number; nextTop: number } | null>(null);
  const quickPaletteResizeRef = useRef<{ x: number; y: number; width: number; height: number; nextWidth: number; nextHeight: number } | null>(null);
  const startQuickPaletteDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    quickPaletteDragRef.current = { x: event.clientX, y: event.clientY, left: quickPalettePosition.left, top: quickPalettePosition.top, nextLeft: quickPalettePosition.left, nextTop: quickPalettePosition.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveQuickPaletteDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = quickPaletteDragRef.current;
    const panel = quickPaletteRef.current;
    if (!drag || !panel) return;
    drag.nextLeft = Math.max(12, Math.min(window.innerWidth - panel.offsetWidth - 12, drag.left + event.clientX - drag.x));
    drag.nextTop = Math.max(12, Math.min(window.innerHeight - panel.offsetHeight - 12, drag.top + event.clientY - drag.y));
    panel.style.left = `${drag.nextLeft}px`;
    panel.style.top = `${drag.nextTop}px`;
  };
  const stopQuickPaletteDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = quickPaletteDragRef.current;
    quickPaletteDragRef.current = null;
    if (drag) setQuickPalettePosition({ left: drag.nextLeft, top: drag.nextTop });
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const startQuickPaletteResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const panel = quickPaletteRef.current;
    if (!panel) return;
    quickPaletteResizeRef.current = { x: event.clientX, y: event.clientY, width: panel.offsetWidth, height: panel.offsetHeight, nextWidth: panel.offsetWidth, nextHeight: panel.offsetHeight };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveQuickPaletteResize = (event: React.PointerEvent<HTMLDivElement>) => {
    const resize = quickPaletteResizeRef.current;
    const panel = quickPaletteRef.current;
    if (!resize || !panel) return;
    resize.nextWidth = Math.max(260, Math.min(window.innerWidth - quickPalettePosition.left - 12, resize.width + event.clientX - resize.x));
    resize.nextHeight = Math.max(220, Math.min(window.innerHeight - quickPalettePosition.top - 12, resize.height + event.clientY - resize.y));
    panel.style.width = `${resize.nextWidth}px`;
    panel.style.height = `${resize.nextHeight}px`;
  };
  const stopQuickPaletteResize = (event: React.PointerEvent<HTMLDivElement>) => {
    const resize = quickPaletteResizeRef.current;
    quickPaletteResizeRef.current = null;
    if (resize) setQuickPaletteSize({ width: resize.nextWidth, height: resize.nextHeight });
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  useEffect(() => {
    if (!activeBill || !isWorkspaceSurfaceActive) return;
    const toggleQuickAdd = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.isComposing || !event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.key.toLowerCase() !== 'q') return;
      if (document.querySelector('[role="dialog"], [role="menu"], [aria-modal="true"]')) return;
      event.preventDefault();
      setIsQuickPaletteOpen((open) => !open);
    };
    window.addEventListener('keydown', toggleQuickAdd);
    return () => window.removeEventListener('keydown', toggleQuickAdd);
  }, [activeBill, isWorkspaceSurfaceActive]);
  const [quickEntry, setQuickEntry] = useState<{ type: ItemType | null; sectionId: string; pageId?: string | null; anchorItemId?: string | null } | null>(null);
  const [quickEntryText, setQuickEntryText] = useState('');
  const [inlineDescriptionDraft, setInlineDescriptionDraft] = useState<{ itemId: string; sectionId: string; pageId?: string | null; text: string; left: number; top: number; width: number } | null>(null);
  const hadInlineDescriptionDraftRef = useRef(false);
  useEffect(() => {
    if (inlineDescriptionDraft) { hadInlineDescriptionDraftRef.current = true; return; }
    if (!hadInlineDescriptionDraftRef.current) return;
    hadInlineDescriptionDraftRef.current = false;
    window.requestAnimationFrame(() => {
      if (document.activeElement === document.body) document.querySelector<HTMLElement>('[data-smoke="bill-workspace"]')?.focus({ preventScroll: true });
    });
  }, [inlineDescriptionDraft]);
  const [fieldEditor, setFieldEditor] = useState<{ item: BoQItem; sectionId: string; pageId?: string | null; reference: string; description: string; quantity: string; unit: string; rate: string; tradePackageId: string } | null>(null);
  const billNavigationRows = React.useMemo(() => activeBill ? getBillNavigationRows(activeBill) : [], [activeBill]);
  const selectionAnchorRef = useRef<string | null>(null);
  useEffect(() => { selectionAnchorRef.current = null; }, [activeBill?.id]);
  const selectBillRow = (itemId: string, event: React.MouseEvent) => {
    if (event.shiftKey) {
      const anchorId = selectionAnchorRef.current || [...selectedItemIds][0];
      const start = billNavigationRows.findIndex((entry) => entry.item.id === anchorId);
      const end = billNavigationRows.findIndex((entry) => entry.item.id === itemId);
      if (start >= 0 && end >= 0) {
        const range = billNavigationRows.slice(Math.min(start, end), Math.max(start, end) + 1).map((entry) => entry.item.id);
        setSelectedItemIds((previous) => new Set(event.ctrlKey || event.metaKey ? [...previous, ...range] : range));
        return;
      }
    }
    selectionAnchorRef.current = itemId;
    if (event.ctrlKey || event.metaKey) {
      setSelectedItemIds((previous) => {
        const next = new Set(previous);
        if (next.has(itemId)) next.delete(itemId);
        else next.add(itemId);
        return next;
      });
    } else {
      setSelectedItemIds(new Set([itemId]));
    }
  };
  const startQuickEntry = (type: ItemType | null, sectionId: string, pageId: string | null | undefined, anchorItemId: string | null | undefined) => {
    setQuickEntryText('');
    setQuickEntry({ type, sectionId, pageId, anchorItemId });
  };
  const insertQuickLine = (type: ItemType, sectionId: string, pageId: string | null | undefined, anchorItemId: string | null | undefined, description = '') => {
    if (!onQuickInsertLine) return;
    const id = generateId();
    onQuickInsertLine({ id, type, reference: '', description, unit: type === 'PRICED' ? 'nr' : '', quantity: 0, rate: 0, total: 0 }, { sectionId, pageId, anchorItemId });
    setActiveInsertAnchor({ itemId: id, sectionId, pageId });
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-smoke="bill-workspace"]')?.focus({ preventScroll: true }));
  };
  const saveQuickEntry = () => {
    const description = quickEntryText.trim();
    if (!quickEntry || !quickEntry.type || !description) return;
    insertQuickLine(quickEntry.type, quickEntry.sectionId, quickEntry.pageId, quickEntry.anchorItemId, description);
    setQuickEntry(null);
  };
  useEffect(() => {
    setActiveInsertAnchor(null);
    _onChangeTradeFilter('ALL');
  }, [activeBill?.id, _onChangeTradeFilter]);
  useEffect(() => { setAiRateTargets(null); }, [activeBill?.id]);
  useEffect(() => { setActiveInsertAnchor(null); }, [_selectedTradeFilter]);
  const quickAddAt = (type: ItemType | null, sectionId: string, pageId: string | null | undefined, anchorItemId: string | null | undefined, nameFirst: boolean) => {
    if (nameFirst || !type) startQuickEntry(type, sectionId, pageId, anchorItemId);
    else insertQuickLine(type, sectionId, pageId, anchorItemId);
  };
  const getRowFromEvent = (target: EventTarget | null) =>
    target instanceof HTMLElement ? target.closest<HTMLTableRowElement>('[data-bill-row-id]') : null;
  const canActivateRow = (target: EventTarget | null) =>
    target instanceof HTMLElement && !target.closest('input,select,textarea,a,[contenteditable="true"],[draggable="true"],button:not([data-bill-description])');
  const findRowItem = (row: HTMLTableRowElement) => {
    const sectionId = row.dataset.billSectionId || '';
    const pageId = row.dataset.billPageId || null;
    const section = activeBill.sections.find((entry) => entry.id === sectionId);
    const items = section ? (pageId ? section.pages?.find((page) => page.id === pageId)?.items : section.items) : activeBill.items;
    return { item: items?.find((entry) => entry.id === row.dataset.billRowId), sectionId, pageId };
  };
  const openBillEditor = (billId: string, sectionId: string, item?: BoQItem, type?: ItemType, pageId?: string | null, insertAfterItemId?: string | null) => {
    onOpenEditor(billId, sectionId, item, type, pageId, insertAfterItemId);
    if (item) onExpandEditor?.();
  };
  const openRowFieldEditor = (row: HTMLTableRowElement) => {
    const { item, sectionId, pageId } = findRowItem(row);
    if (item) setFieldEditor({ item, sectionId, pageId, reference: item.reference || '', description: stripRichText(item.description), quantity: String(item.quantity ?? 0), unit: item.unit || '', rate: String(item.rate ?? 0), tradePackageId: item.tradePackageId || '' });
  };
  const handleBillKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const isEditingControl = Boolean(target?.closest('input,textarea,select,[contenteditable="true"],[role="dialog"],[role="menu"],[data-bill-quick-control],[data-standards-insert-panel]'));
    const hasOpenDialog = Boolean(document.querySelector('[role="dialog"], [aria-modal="true"]'));
    if (isWorkspaceSurfaceActive && !event.repeat && !event.isComposing && !quickEntry && !fieldEditor && !inlineDescriptionDraft && !isEditingControl && !hasOpenDialog) {
      if (event.key === 'Delete' && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey && selectedItemIds.size > 0 && onDeleteSelectedItems) {
        event.preventDefault();
        event.stopPropagation();
        onDeleteSelectedItems();
        return;
      }
      if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey && (event.key.toLowerCase() === 'c' || event.key.toLowerCase() === 'v') && !window.getSelection()?.toString()) {
        if (event.key.toLowerCase() === 'c' && selectedItemIds.size > 0 && onDuplicateSelectedItems) {
          event.preventDefault();
          event.stopPropagation();
          onDuplicateSelectedItems();
          return;
        }
        if (event.key.toLowerCase() === 'v' && selectedItemIds.size === 1 && copiedBillItemsCount > 0 && onPasteCopiedItems) {
          event.preventDefault();
          event.stopPropagation();
          onPasteCopiedItems();
          return;
        }
      }
    }
    if (event.key === 'Enter' && target?.matches('[data-bill-description]')) {
      const row = getRowFromEvent(target);
      if (row) { event.preventDefault(); openRowFieldEditor(row); }
      return;
    }
    if (event.key === 'Escape' && activeInsertAnchor && !quickEntry) { setActiveInsertAnchor(null); return; }
    if (!event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown') && activeInsertAnchor && isWorkspaceSurfaceActive && !quickEntry && !fieldEditor && !inlineDescriptionDraft) {
      if (target?.closest('input,textarea,select,[contenteditable="true"],[role="dialog"],[role="menu"],[data-bill-quick-control],[data-standards-insert-panel]')) return;
      const next = getAdjacentBillRow(billNavigationRows, activeInsertAnchor.itemId, event.key === 'ArrowUp' ? -1 : 1);
      if (!next) return;
      event.preventDefault();
      setActiveInsertAnchor({ itemId: next.item.id, sectionId: next.sectionId, pageId: next.pageId });
      if (next.sectionId && next.sectionId !== activeInsertAnchor.sectionId) onSelectSection?.(next.sectionId);
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        document.querySelector<HTMLTableRowElement>(`[data-bill-row-id="${CSS.escape(next.item.id)}"]`)?.scrollIntoView({ block: 'nearest' });
        document.querySelector<HTMLElement>('[data-smoke="bill-workspace"]')?.focus({ preventScroll: true });
      }));
      return;
    }
    if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown') && activeInsertAnchor && isWorkspaceSurfaceActive) {
      if (target?.closest('input,textarea,select,[contenteditable="true"],[role="dialog"],[role="menu"],[data-bill-quick-control],[data-standards-insert-panel]')) return;
      const section = activeBill?.sections.find((entry) => entry.id === activeInsertAnchor.sectionId);
      const scopeItems = section
        ? activeInsertAnchor.pageId
          ? section.pages?.find((page) => page.id === activeInsertAnchor.pageId)?.items || []
          : section.items || []
        : activeBill?.items || [];
      const index = scopeItems.findIndex((item) => item.id === activeInsertAnchor.itemId);
      const nextIndex = index + (event.key === 'ArrowUp' ? -1 : 1);
      if (index < 0 || nextIndex < 0 || nextIndex >= scopeItems.length) return;
      event.preventDefault();
      onShiftBillItem(activeInsertAnchor.itemId, event.key === 'ArrowUp' ? 'UP' : 'DOWN', activeInsertAnchor.sectionId, activeInsertAnchor.pageId);
      return;
    }
    if (!isWorkspaceSurfaceActive || !activeInsertAnchor || !onQuickInsertLine || quickEntry || inlineDescriptionDraft || event.repeat || event.isComposing || event.altKey || event.metaKey) return;
    if (target?.closest('input,textarea,select,[contenteditable="true"],[role="dialog"],[role="menu"],[data-bill-quick-control], [data-standards-insert-panel]')) return;
    const selectedRow = document.querySelector<HTMLTableRowElement>(`[data-bill-row-id="${CSS.escape(activeInsertAnchor.itemId)}"]`);
    const selectedItem = selectedRow ? findRowItem(selectedRow).item : null;
    if (!event.ctrlKey && !event.shiftKey && event.key.length === 1 && selectedItem && !stripRichText(selectedItem.description).trim() && onInlineDescriptionUpdate) {
      const description = selectedRow?.querySelector<HTMLElement>('[data-bill-description]');
      const rect = description?.getBoundingClientRect();
      if (rect) {
        event.preventDefault();
        setInlineDescriptionDraft({ itemId: selectedItem.id, sectionId: activeInsertAnchor.sectionId, pageId: activeInsertAnchor.pageId, text: event.key, left: rect.left, top: rect.top, width: rect.width });
      }
      return;
    }
    if (!event.ctrlKey || event.shiftKey) return;
    const digit = /^[1-7]$/.test(event.key) ? Number(event.key) : /^Numpad[1-7]$/.test(event.code) ? Number(event.code.slice(-1)) : 0;
    const type = QUICK_LINE_TYPES[digit - 1]?.[0];
    if (!type) return;
    const itemStillExists = activeBill.sections.length
      ? activeBill.sections.some((section) => [...(section.items || []), ...(section.pages || []).flatMap((page) => page.items || [])].some((item) => item.id === activeInsertAnchor.itemId))
      : (activeBill.items || []).some((item) => item.id === activeInsertAnchor.itemId);
    if (!itemStillExists) return;
    event.preventDefault();
    quickAddAt(type, activeInsertAnchor.sectionId, activeInsertAnchor.pageId, activeInsertAnchor.itemId, false);
  };
  const [billDensity, setBillDensity] = useState<'compact' | 'comfortable'>(() => {
    try { return window.localStorage.getItem('qs-bill-density') === 'comfortable' ? 'comfortable' : 'compact'; } catch { return 'compact'; }
  });
  const changeBillDensity = (density: 'compact' | 'comfortable') => {
    setBillDensity(density);
    try { window.localStorage.setItem('qs-bill-density', density); } catch { /* storage can be unavailable */ }
  };
  const [standardsDropState, setStandardsDropState] = useState<StandardsDropState | null>(null);
  const [standardsDropNotice, setStandardsDropNotice] = useState<string | null>(null);
  const { showToast } = useToast();
  const pendingDropRef = useRef(0);
  const openDropDialogRef = useRef<((payload: LibraryInsertDragPayload, destination: StandardsDropDestination) => void) | null>(null);
  useEffect(() => () => { pendingDropRef.current += 1; }, []);
  const [standardsDragActive, setStandardsDragActive] = useState(false);
  const [stickyTotalsPosition, setStickyTotalsPosition] = useState<FloatingWidgetPosition | null>(null);
  const [isDraggingStickyTotals, setIsDraggingStickyTotals] = useState(false);
  const [isStickyTotalsMinimized, setIsStickyTotalsMinimized] = useState(true);

  const focusSection = (sectionId: string, onComplete?: () => void) => {
    setCollapsedSections((prev) => {
      if (!prev.has(sectionId)) return prev;
      const next = new Set(prev);
      next.delete(sectionId);
      return next;
    });

    window.requestAnimationFrame(() => {
      sectionCardRefs.current[sectionId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      onComplete?.();
    });
  };

  const focusPage = (pageId: string, onComplete?: () => void) => {
    window.requestAnimationFrame(() => {
      pageCardRefs.current[pageId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      onComplete?.();
    });
  };

  useEffect(() => {
    if (!activeBill || !jumpToSectionId) return;
    focusSection(jumpToSectionId, onJumpHandled);
  }, [activeBill, jumpToSectionId, onJumpHandled]);

  useEffect(() => {
    if (!activeBill || !jumpToPageId) return;
    focusPage(jumpToPageId, onPageJumpHandled);
  }, [activeBill, jumpToPageId, onPageJumpHandled]);

  const handleItemDragStart = (event: React.DragEvent<HTMLElement>, itemId: string, sectionId: string, pageId?: string | null) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    const normalizedPageId = pageId || null;
    const payload = JSON.stringify({
      itemId,
      sectionId,
      pageId: normalizedPageId,
    });
    event.dataTransfer.setData('text/plain', payload);
    event.dataTransfer.setData('application/x-qs-bill-item', payload);
    draggedItemRef.current = { itemId, sectionId, pageId: normalizedPageId };
    setDraggedItemState({ itemId, sectionId, pageId: normalizedPageId });
  };

  const handlePointerDragStart = (event: React.MouseEvent<HTMLElement>, itemId: string, sectionId: string, pageId?: string | null) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const normalizedPageId = pageId || null;
    setPointerDraggedItemState({ itemId, sectionId, pageId: normalizedPageId });
    setPointerDropIndicatorState(null);
    pointerDropTargetRef.current = null;
  };

  const handlePointerDragHover = (
    event: React.MouseEvent<HTMLTableRowElement>,
    targetItemId: string,
    sectionId: string,
    pageId?: string | null,
  ) => {
    if (!pointerDraggedItemState || event.buttons !== 1) return;
    const normalizedPageId = pageId || null;
    if (
      pointerDraggedItemState.sectionId !== sectionId ||
      (pointerDraggedItemState.pageId || null) !== normalizedPageId ||
      pointerDraggedItemState.itemId === targetItemId
    ) {
      return;
    }
    const placement = resolveRowDropPlacement();
    pointerDropTargetRef.current = {
      targetItemId,
      sectionId,
      pageId: normalizedPageId,
      placement,
    };
    setPointerDropIndicatorState({
      targetItemId,
      sectionId,
      pageId: normalizedPageId,
      placement,
    });
  };

  const handleItemDragEnd = () => {
    pointerDropTargetRef.current = null;
    setPointerDropIndicatorState(null);
    window.setTimeout(() => {
      draggedItemRef.current = null;
      setDraggedItemState(null);
    }, 120);
  };

  const getStickyTotalsWidgetSize = React.useCallback(() => {
    const rect = stickyTotalsRef.current?.getBoundingClientRect();
    return {
      width: rect?.width || Math.min(STICKY_TOTALS_FALLBACK_SIZE.width, Math.max(280, window.innerWidth - FLOATING_WIDGET_PADDING * 2)),
      height: rect?.height || STICKY_TOTALS_FALLBACK_SIZE.height,
    };
  }, []);

  const clampStickyTotalsPosition = React.useCallback((position: FloatingWidgetPosition): FloatingWidgetPosition => {
    if (typeof window === 'undefined') return position;
    const size = getStickyTotalsWidgetSize();
    return {
      x: Math.min(
        Math.max(FLOATING_WIDGET_PADDING, position.x),
        Math.max(FLOATING_WIDGET_PADDING, window.innerWidth - size.width - FLOATING_WIDGET_PADDING),
      ),
      y: Math.min(
        Math.max(FLOATING_WIDGET_PADDING, position.y),
        Math.max(FLOATING_WIDGET_PADDING, window.innerHeight - size.height - FLOATING_WIDGET_PADDING),
      ),
    };
  }, [getStickyTotalsWidgetSize]);

  const handleStartStickyTotalsDrag = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('button,input,select,textarea,a,[role="button"],[contenteditable="true"]')) return;
    const rect = stickyTotalsRef.current?.getBoundingClientRect();
    if (!rect) return;

    event.preventDefault();
    stickyTotalsDragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    setStickyTotalsPosition(clampStickyTotalsPosition({ x: rect.left, y: rect.top }));
    setIsDraggingStickyTotals(true);
  }, [clampStickyTotalsPosition]);

  useEffect(() => {
    if (!isDraggingStickyTotals) return undefined;

    const handlePointerMove = (event: PointerEvent) => {
      setStickyTotalsPosition(clampStickyTotalsPosition({
        x: event.clientX - stickyTotalsDragOffsetRef.current.x,
        y: event.clientY - stickyTotalsDragOffsetRef.current.y,
      }));
    };
    const handlePointerUp = () => setIsDraggingStickyTotals(false);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [clampStickyTotalsPosition, isDraggingStickyTotals]);

  useEffect(() => {
    if (!stickyTotalsPosition) return undefined;
    const handleResize = () => {
      setStickyTotalsPosition((current) => (current ? clampStickyTotalsPosition(current) : current));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampStickyTotalsPosition, stickyTotalsPosition]);

  const getDestinationItems = (sectionId: string, pageId?: string | null): BoQItem[] => (
    activeBill ? getBillDestinationItems(activeBill, sectionId, pageId) || [] : []
  );

  const getStandardsDropDestinationLabel = (
    sectionId: string,
    pageId: string | null | undefined,
    placement: LibraryInsertPlacement,
    anchorItemId?: string | null,
  ) => {
    const section = sectionId ? activeBill?.sections.find((entry) => entry.id === sectionId) : null;
    const page = pageId ? section?.pages?.find((entry) => entry.id === pageId) : null;
    const scope = [
      activeBill?.name || 'Current bill',
      section?.name,
      page?.name,
    ].filter(Boolean).join(' / ');
    if (!anchorItemId) return `Bottom of ${scope}`;

    const anchorItem = getDestinationItems(sectionId, pageId).find((item) => item.id === anchorItemId) || null;
    const anchorLabel = describeBillItem(anchorItem);
    return `${placement === 'BEFORE_SELECTED' ? 'Before' : 'After'} ${anchorLabel} in ${scope}`;
  };

  const openStandardsDropDialog = (
    payload: LibraryInsertDragPayload,
    destination: Omit<StandardsDropDestination, 'label' | 'existingItems' | 'billId'> & { billId?: string },
  ) => {
    if (!activeBill || (destination.billId && destination.billId !== activeBill.id) || !isBillInsertDestinationValid(activeBill, destination)) {
      showToast({ type: 'error', message: 'The insertion destination changed. Select a destination row and try again.' });
      return;
    }
    pendingDropRef.current += 1;
    const existingItems = getDestinationItems(destination.sectionId, destination.pageId);
    setStandardsDropState({
      payload,
      selectedItem: payload.sourceItems.find((item) => item.id === payload.selectedItemId) || null,
      destination: {
        ...destination,
        billId: activeBill.id,
        label: getStandardsDropDestinationLabel(
          destination.sectionId,
          destination.pageId,
          destination.placement,
          destination.anchorItemId,
        ),
        existingItems,
      },
    });
  };
  openDropDialogRef.current = openStandardsDropDialog;

  const handleStandardsItemDrop = (
    event: React.DragEvent<HTMLTableRowElement>,
    targetItemId: string,
    sectionId: string,
    pageId?: string | null,
  ) => {
    if (!onInsertStandardsItems) return false;
    const payload = parseLibraryInsertDragPayload(event.dataTransfer);
    if (!payload) return false;

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';

    const placement: LibraryInsertPlacement = 'AFTER_SELECTED';
    openStandardsDropDialog(resolveLibraryDropPayload(payload, event.ctrlKey), {
      sectionId,
      pageId: pageId || null,
      placement,
      anchorItemId: targetItemId,
    });
    return true;
  };

  const handleStandardsDestinationDrop = (
    event: React.DragEvent<HTMLElement>,
    sectionId: string,
    pageId?: string | null,
  ) => {
    if (!onInsertStandardsItems) return;
    const payload = parseLibraryInsertDragPayload(event.dataTransfer);
    if (!payload) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
    openStandardsDropDialog(resolveLibraryDropPayload(payload, event.ctrlKey), {
      sectionId,
      pageId: pageId || null,
      placement: 'BOTTOM',
      anchorItemId: null,
    });
  };

  const openStandardsDropFromPoint = (
    payload: LibraryInsertDragPayload,
    clientX: number,
    clientY: number,
    ctrlKey: boolean,
    payloadPromise?: Promise<LibraryInsertDragPayload>,
  ) => {
    if (!onInsertStandardsItems || !activeBill) return false;
    const element = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    if (!element) return false;

    const row = element.closest<HTMLTableRowElement>('[data-bill-row-id]');
    const targetItemId = row?.dataset.billRowId;
    const surface = row || element.closest<HTMLElement>('[data-standards-drop-destination="true"]');
    if (!surface) return false;
    const destination: StandardsDropDestination = {
      billId: activeBill.id,
      sectionId: surface.dataset.billSectionId || '',
      pageId: surface.dataset.billPageId || null,
      placement: targetItemId ? ('AFTER_SELECTED') : 'BOTTOM',
      anchorItemId: targetItemId || null,
      label: '',
      existingItems: [],
    };
    const requestId = ++pendingDropRef.current;
    void (payloadPromise || Promise.resolve(payload)).then((loadedPayload) => {
      if (pendingDropRef.current !== requestId) return;
      openDropDialogRef.current?.(resolveLibraryDropPayload(loadedPayload, ctrlKey), destination);
    }).catch((error) => {
      if (pendingDropRef.current === requestId) showToast({ type: 'error', message: error instanceof Error ? error.message : 'Could not load shared requirements.' });
    });
    return true;
  };

  const confirmStandardsDrop = (items: BoQItem[], destination: StandardsDropDestination) => {
    if (!onInsertStandardsItems) return;
    if (!activeBill || activeBill.id !== destination.billId || !isBillInsertDestinationValid(activeBill, destination)) {
      showToast({ type: 'error', message: 'The insertion destination changed. Select a destination row and try again.' });
      setStandardsDropState(null);
      return;
    }
    onInsertStandardsItems(items, {
      billId: destination.billId,
      sectionId: destination.sectionId || undefined,
      pageId: destination.pageId || null,
      placement: destination.placement,
      anchorItemId: destination.anchorItemId || null,
    });
    setStandardsDropState(null);
    clearLibraryInsertDrag();
    draggedItemRef.current = null;
    setDraggedItemState(null);
  };

  useEffect(() => {
    const handlePointerStandardsDrop = (event: Event) => {
      if (!isLibraryInsertPointerDropEvent(event)) return;
      const didOpen = openStandardsDropFromPoint(
        event.detail.payload,
        event.detail.clientX,
        event.detail.clientY,
        event.detail.ctrlKey || false,
        event.detail.payloadPromise,
      );
      if (didOpen) {
        event.stopPropagation();
      }
    };

    window.addEventListener(LIBRARY_INSERT_POINTER_DROP_EVENT, handlePointerStandardsDrop);
    return () => {
      window.removeEventListener(LIBRARY_INSERT_POINTER_DROP_EVENT, handlePointerStandardsDrop);
    };
  });

  useEffect(() => {
    let idleTimer: number | null = null;
    const clearIdleTimer = () => {
      if (!idleTimer) return;
      window.clearTimeout(idleTimer);
      idleTimer = null;
    };
    const markActive = () => {
      clearIdleTimer();
      setStandardsDragActive(true);
    };
    const markInactive = () => {
      clearIdleTimer();
      setStandardsDragActive(false);
    };
    const handleDragState = (event: Event) => {
      const detail = (event as CustomEvent<LibraryInsertDragStateDetail>).detail;
      if (detail?.active) markActive();
      else markInactive();
    };
    const handleNativeDragOver = (event: DragEvent) => {
      if (!event.dataTransfer || !hasLibraryInsertDragPayload(event.dataTransfer)) return;
      markActive();
      idleTimer = window.setTimeout(() => {
        if (!getActiveLibraryInsertDragPayload()) setStandardsDragActive(false);
      }, 450);
    };
    const handleMouseUp = () => {
      clearIdleTimer();
      idleTimer = window.setTimeout(() => {
        if (!getActiveLibraryInsertDragPayload()) setStandardsDragActive(false);
      }, 250);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') markInactive();
    };

    window.addEventListener(LIBRARY_INSERT_DRAG_STATE_EVENT, handleDragState);
    window.addEventListener('dragover', handleNativeDragOver);
    window.addEventListener('dragend', markInactive);
    window.addEventListener('drop', markInactive);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleEscape);
    return () => {
      clearIdleTimer();
      window.removeEventListener(LIBRARY_INSERT_DRAG_STATE_EVENT, handleDragState);
      window.removeEventListener('dragover', handleNativeDragOver);
      window.removeEventListener('dragend', markInactive);
      window.removeEventListener('drop', markInactive);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleStandardsDestinationDragOver = (event: React.DragEvent<HTMLElement>) => {
    if (!hasLibraryInsertDragPayload(event.dataTransfer)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  useEffect(() => {
    const activeDrag = pointerDraggedItemState || draggedItemState;
    if (!activeDrag) return;

    const handlePointerMove = (event: MouseEvent) => {
      const row = (document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null)?.closest<HTMLTableRowElement>('[data-bill-row-id]');
      if (!row) {
        pointerDropTargetRef.current = null;
        setPointerDropIndicatorState(null);
        return;
      }

      const targetItemId = row.dataset.billRowId;
      const sectionId = row.dataset.billSectionId ?? '';
      const pageId = row.dataset.billPageId || null;
      if (!targetItemId) return;

      if (
        activeDrag.sectionId !== sectionId ||
        (activeDrag.pageId || null) !== pageId ||
        activeDrag.itemId === targetItemId
      ) {
        pointerDropTargetRef.current = null;
        setPointerDropIndicatorState(null);
        return;
      }

      const placement = resolveRowDropPlacement();
      const dropTarget = { targetItemId, sectionId, pageId, placement };
      pointerDropTargetRef.current = dropTarget;
      setPointerDropIndicatorState(dropTarget);
    };


    const handlePointerRelease = (event: MouseEvent) => {
      if (!pointerDraggedItemState) return;
      const dropTarget = pointerDropTargetRef.current;
      if (
        dropTarget &&
        (pointerDraggedItemState.pageId || null) === (dropTarget.pageId || null) &&
        pointerDraggedItemState.sectionId === dropTarget.sectionId &&
        pointerDraggedItemState.itemId !== dropTarget.targetItemId
      ) {
        onMoveBillItem(
          pointerDraggedItemState.itemId,
          dropTarget.targetItemId,
          resolveRowDropPlacement(),
          dropTarget.sectionId,
          dropTarget.pageId,
        );
      }
      pointerDropTargetRef.current = null;
      setPointerDropIndicatorState(null);
      setPointerDraggedItemState(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      pointerDropTargetRef.current = null;
      setPointerDropIndicatorState(null);
      setPointerDraggedItemState(null);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('dragover', handlePointerMove);
    window.addEventListener('mouseup', handlePointerRelease);
    window.addEventListener('keydown', handleEscape);
    document.body.classList.add('cursor-grabbing');

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('dragover', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerRelease);
      window.removeEventListener('keydown', handleEscape);
      document.body.classList.remove('cursor-grabbing');
    };
  }, [draggedItemState, onMoveBillItem, pointerDraggedItemState]);

  useEffect(() => {
    if (!isWorkspaceSurfaceActive || selectedItemIds.size === 0) return undefined;

    const handleSelectionEscape = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== 'Escape') return;
      const target = event.target as HTMLElement | null;
      const isEditingText = target?.isContentEditable
        || target?.tagName === 'INPUT'
        || target?.tagName === 'TEXTAREA'
        || target?.tagName === 'SELECT';
      if (isEditingText) return;
      if (document.querySelector('[role="dialog"], [role="menu"]')) return;

      event.preventDefault();
      setSelectedItemIds(new Set());
    };

    window.addEventListener('keydown', handleSelectionEscape);
    return () => window.removeEventListener('keydown', handleSelectionEscape);
  }, [isWorkspaceSurfaceActive, selectedItemIds.size, setSelectedItemIds]);

  const handleItemDrop = (
    event: React.DragEvent<HTMLTableRowElement>,
    targetItemId: string,
    sectionId: string,
    pageId?: string | null,
  ) => {
    if (handleStandardsItemDrop(event, targetItemId, sectionId, pageId)) {
      draggedItemRef.current = null;
      setDraggedItemState(null);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    let dragState = draggedItemRef.current || draggedItemState;
    if (!dragState) {
      const rawPayload = event.dataTransfer.getData('application/x-qs-bill-item');
      const fallbackPayload = rawPayload || event.dataTransfer.getData('text/plain');
      if (fallbackPayload) {
        try {
          const parsed = JSON.parse(fallbackPayload) as { itemId?: string; sectionId?: string; pageId?: string | null };
          if (parsed.itemId && typeof parsed.sectionId === 'string') {
            dragState = {
              itemId: parsed.itemId,
              sectionId: parsed.sectionId,
              pageId: parsed.pageId || null,
            };
          }
        } catch {
          if (fallbackPayload) {
            dragState = {
              itemId: fallbackPayload,
              sectionId,
              pageId: pageId || null,
            };
          }
        }
      }
    }
    if (!dragState) return;
    if (dragState.sectionId !== sectionId || (dragState.pageId || null) !== (pageId || null)) {
      setDraggedItemState(null);
      return;
    }

    const placement = resolveRowDropPlacement();
    onMoveBillItem(dragState.itemId, targetItemId, placement, sectionId, pageId);
    draggedItemRef.current = null;
    setDraggedItemState(null);
    pointerDropTargetRef.current = null;
    setPointerDropIndicatorState(null);
  };

  if (!activeBill) {
    return (
      <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 py-8 sm:py-10">
        <div className="overflow-hidden rounded-app-xl border border-slate-200/80 bg-white/92 shadow-card dark:border-slate-700 dark:bg-surface-900/95">
          <div className="border-b border-slate-200/80 bg-gradient-to-br from-surface-muted via-surface to-white px-8 py-10 dark:border-slate-700/80 dark:from-surface-800 dark:via-surface-900 dark:to-surface-900">
            <div className="max-w-3xl">
              <div className="workspace-chip">
                <Layers className="h-3.5 w-3.5" />
                First bill setup
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Start the project with a live bill</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                A project is open, but there is no active bill yet. Create the first bill now, then add items or sections, allocate trades, and move into tender review once the scope is priced.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => onOpenPrompt('ADD_BILL')}
                  className="workspace-primary-btn px-5 py-2.5"
                >
                  <Plus className="h-4 w-4" />
                  Create first bill
                </button>
                <button
                  type="button"
                  onClick={() => onOpenPrompt('ADD_SECTION')}
                  className="workspace-secondary-btn px-5 py-2.5"
                  title="You can also create a section first if you already know the structure you want."
                >
                  <Layers className="h-4 w-4" />
                  Add first section
                </button>
              </div>
            </div>
          </div>
          <div className="grid gap-4 px-8 py-8 md:grid-cols-3">
            <div className="rounded-app border border-slate-200 dark:border-slate-700 bg-surface-muted/40 p-4 dark:bg-surface-800/40">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Step 1</div>
              <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Create the bill shell</div>
              <div className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">Bills are your working packages. Most projects start with one live bill, then grow into multiple packages later.</div>
            </div>
            <div className="rounded-app border border-slate-200 dark:border-slate-700 bg-surface-muted/40 p-4 dark:bg-surface-800/40">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Step 2</div>
              <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Add sections or items</div>
              <div className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">Work directly with items for quick starts, or introduce sections when you want cleaner structure and trade allocation.</div>
            </div>
            <div className="rounded-app border border-slate-200 dark:border-slate-700 bg-surface-muted/40 p-4 dark:bg-surface-800/40">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Step 3</div>
              <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Tender once pricing is ready</div>
              <div className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">After pricing and trade allocation, invite contractors, compare live returns, and apply the winning rates back into the bill.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Helper to check if item has cost
  const isCostItem = (type: string) => ['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(type);

  const getRowStyles = (type: string, isActive: boolean, isSelected = false, isUnassigned = false, costRowIndex?: number) => {
    const customLineStyle = getBillLineStyleConfig(activeProject, type);
    const base = 'transition-colors border-b border-slate-100 group text-sm dark:border-slate-800';
    if (isActive) return `${base} bg-primary-50/80 dark:bg-primary-900/20 border-l-2 border-l-primary-500`;
    if (isSelected && isUnassigned) return `${base} bg-primary-50/60 border-l-2 border-l-amber-400 dark:bg-primary-900/15`;
    if (isSelected) return `${base} bg-primary-50/60 border-l-2 border-l-primary-400 dark:bg-primary-900/15`;
    if (customLineStyle) {
      const darkRowClassMap: Partial<Record<BillLineStyleKey, string>> = {
        GENERAL_HEADING: 'dark:!bg-emerald-800/90 dark:hover:!bg-emerald-700/90',
        MAJOR_HEADING: 'dark:!bg-surface-900 dark:hover:!bg-surface-800',
        SUB_SECTION: 'dark:!bg-surface-950 dark:hover:!bg-surface-900',
        MINOR_HEADING: 'dark:!bg-surface-950 dark:hover:!bg-surface-900',
        COMMENT: 'dark:!bg-surface-950 dark:hover:!bg-surface-900',
        SUB_COMMENT: 'dark:!bg-surface-950 dark:hover:!bg-surface-900',
        PRICED: 'dark:!bg-surface-950 dark:hover:!bg-surface-900',
        EXTRA_OVER_ITEM: 'dark:!bg-surface-950 dark:hover:!bg-surface-900',
        PROVISIONAL_SUM: 'dark:!bg-amber-950/25 dark:hover:!bg-amber-950/35',
        PC_SUM: 'dark:!bg-purple-950/25 dark:hover:!bg-purple-950/35',
      };
      return `${base} hover:bg-slate-50/50 ${darkRowClassMap[type as BillLineStyleKey] || 'dark:hover:!bg-surface-900'}`;
    }

    const stripe = isUnassigned
      ? 'bg-amber-50/20 dark:bg-amber-950/10'
      : costRowIndex !== undefined && costRowIndex % 2 === 1
          ? 'bg-slate-50/50 dark:bg-surface-900/70'
          : 'bg-white dark:bg-surface-950';
    return `${base} ${stripe} hover:bg-slate-50/70 dark:hover:bg-surface-900`;
  };

  const getTextStyles = (type: string, commentContextType?: string | null) => {
    const customLineStyle = getBillLineStyleConfig(activeProject, type);
    if (customLineStyle) {
      const sizeClassMap = {
        xs: 'text-xs',
        sm: 'text-sm',
        base: 'text-base',
        lg: 'text-lg',
      } as const;
      const familyClassMap = {
        sans: 'font-sans',
        'aptos-narrow': 'font-bill-aptos-narrow',
        serif: 'font-serif',
        mono: 'font-mono',
      } as const;
      const indentClassMap: Record<BillLineStyleKey, string> = {
        GENERAL_HEADING: 'pl-3',
        MAJOR_HEADING: 'pl-3',
        SUB_SECTION: 'pl-5',
        MINOR_HEADING: 'pl-7',
        COMMENT: 'pl-9',
        SUB_COMMENT: 'pl-10',
        PRICED: 'pl-14',
        EXTRA_OVER_ITEM: 'pl-20',
        PROVISIONAL_SUM: 'pl-14',
        PC_SUM: 'pl-14',
      };
      const darkTextClassMap: Partial<Record<BillLineStyleKey, string>> = {
        GENERAL_HEADING: 'dark:!text-white',
        MAJOR_HEADING: 'dark:!text-slate-100',
        SUB_SECTION: 'dark:!text-slate-200',
        MINOR_HEADING: 'dark:!text-slate-300',
        COMMENT: 'dark:!text-slate-300',
        SUB_COMMENT: 'dark:!text-slate-400',
        PRICED: 'dark:!text-slate-200',
        EXTRA_OVER_ITEM: 'dark:!text-slate-300',
        PROVISIONAL_SUM: 'dark:!text-amber-200',
        PC_SUM: 'dark:!text-purple-200',
      };
      const indentClass = type === 'PRICED' && commentContextType === 'SUB_COMMENT'
        ? 'pl-16'
        : indentClassMap[type as BillLineStyleKey] || 'pl-14';
      return `${familyClassMap[customLineStyle.fontFamily]} ${sizeClassMap[customLineStyle.fontSize]} ${customLineStyle.bold ? 'font-semibold' : 'font-normal'} ${customLineStyle.italic ? 'italic' : ''} ${customLineStyle.underline ? 'underline underline-offset-4' : ''} ${customLineStyle.uppercase ? 'uppercase tracking-[0.08em]' : ''} ${indentClass} ${darkTextClassMap[type as BillLineStyleKey] || 'dark:!text-slate-200'}`.trim();
    }
    if (type === 'EXTRA_OVER_ITEM') return 'font-medium text-sm text-slate-700 pl-20 dark:text-slate-300';
    if (type === 'PRICED' && commentContextType === 'SUB_COMMENT') return 'font-medium text-sm text-slate-700 pl-16 dark:text-slate-200';
    return 'font-medium text-sm text-slate-700 pl-14 dark:text-slate-200';
  };

  const getRowInlineStyle = (type: string, isActive: boolean, isSelected = false): React.CSSProperties | undefined => {
    if (isActive || isSelected) return undefined;
    const customLineStyle = getBillLineStyleConfig(activeProject, type);
    if (!customLineStyle) return undefined;
    return {
      backgroundColor: customLineStyle.backgroundColor !== 'transparent' ? customLineStyle.backgroundColor : undefined,
    };
  };

  const getDescriptionInlineStyle = (type: string): React.CSSProperties | undefined => {
    const customLineStyle = getBillLineStyleConfig(activeProject, type);
    if (!customLineStyle) return undefined;
    return {
      color: customLineStyle.fontColor,
    };
  };

  const calculateBillNetTotal = (bill: BoQBill) => (
    getBillItems(bill).reduce((acc: number, item: BoQItem) => (isCostItem(item.type) ? safeAdd(acc, item.total || 0) : acc), 0)
  );
  const netTotal = calculateBillNetTotal(activeBill);
  const ohp = activeProject ? safeMul(netTotal, (activeProject.ohpPercentage || 0) / 100) : 0;
  const grossTotal = safeAdd(netTotal, ohp);
  const projectNetTotal = activeProject
    ? (activeProject.bills || []).reduce((acc: number, bill: BoQBill) => safeAdd(acc, calculateBillNetTotal(bill)), 0)
    : netTotal;
  const projectOhp = activeProject ? safeMul(projectNetTotal, (activeProject.ohpPercentage || 0) / 100) : 0;
  const projectGrossTotal = safeAdd(projectNetTotal, projectOhp);
  const projectBillCount = activeProject?.bills?.length || 1;

  const selectedItemsTotal = (() => {
    let total = 0;
    if ((activeBill.sections || []).length === 0) {
      total = (activeBill.items || []).reduce((s: number, item: BoQItem) => (isCostItem(item.type) && selectedItemIds.has(item.id) ? safeAdd(s, item.total) : s), 0);
    }
    return (activeBill.sections || []).reduce((sum: number, section: BoQSection) => {
      const items = (section.pages && section.pages.length > 0)
        ? (section.pages || []).flatMap((p: BoQPage) => p.items || [])
        : (section.items || []);
      return sum + items.reduce((s: number, item: BoQItem) => (isCostItem(item.type) && selectedItemIds.has(item.id) ? safeAdd(s, item.total) : s), 0);
    }, total);
  })();

  const getDisplayRef = (item: BoQItem): string => {
    if (!isCostItem(item.type) || !item.reference) return '';
    const parts = String(item.reference).split('-');
    return parts[parts.length - 1] || '';
  };

  const allBillItems = activeBill.sections.length === 0
    ? (activeBill.items || [])
    : activeBill.sections.flatMap((section: BoQSection) => (
        section.pages && section.pages.length > 0
          ? section.pages.flatMap((page: BoQPage) => page.items || [])
          : section.items || []
      ));
  const selectedBillItems = allBillItems.filter((item: BoQItem) => selectedItemIds.has(item.id));
  const openLiveRateReview = () => {
    const candidates = getSelectedAiRateRows(activeBill, selectedItemIds);
    const targets = candidates.map((row): BillAiRateTarget => {
      const item = row.item;
      const skipReason = item.aiLocks?.rate ? 'Rate locked'
        : item.rateBuildUp?.mode === 'DERIVED' ? 'Derived rate: switch to single rate first'
        : !stripRichText(item.description).trim() ? 'Description needed'
        : !item.unit?.trim() ? 'Unit needed'
        : undefined;
      return { row, context: [activeProject ? `Site: ${formatProjectSiteLocation(activeProject) || 'United Kingdom, Scotland (county unconfirmed)'}` : '', activeBill.name, getAiRateRowContext(billNavigationRows, item.id)].filter(Boolean).join(' · '), skipReason };
    });
    setAiRateTargets(targets);
  };
  const selectedCommercialItems = selectedBillItems.filter((item: BoQItem) => isCostItem(item.type));
  const selectedNonCommercialCount = Math.max(selectedBillItems.length - selectedCommercialItems.length, 0);
  const selectedUnassignedCommercialCount = selectedCommercialItems.filter((item: BoQItem) => !item.tradePackageId).length;
  const selectedAssignedTradeIds = Array.from(new Set(selectedCommercialItems.map((item: BoQItem) => item.tradePackageId).filter(Boolean))) as string[];
  const selectedTradePackageCount = selectedAssignedTradeIds.length;
  const selectedValueLabel = selectedCommercialItems.length > 0 ? formatCurrency(selectedItemsTotal) : 'No priced value';
  const selectedTradeCoverageLabel = selectedCommercialItems.length === 0
    ? 'Headings/comments only'
    : selectedUnassignedCommercialCount > 0
      ? `${selectedUnassignedCommercialCount} need trade`
      : `${selectedTradePackageCount} trade package${selectedTradePackageCount === 1 ? '' : 's'}`;
  const pricedItems = allBillItems.filter((item: BoQItem) => isCostItem(item.type));
  const assignedItemsCount = pricedItems.filter((item: BoQItem) => Boolean(item.tradePackageId)).length;
  const unassignedItemsCount = Math.max(pricedItems.length - assignedItemsCount, 0);
  const tradeIdsInBill = Array.from(new Set(pricedItems.map((item: BoQItem) => item.tradePackageId).filter(Boolean))) as string[];
  const invitedTradeCount = tradeIdsInBill.filter((tradeId) => (activeProject?.tenderContractors?.[tradeId] || []).length > 0).length;
  const returnedTradeCount = tradeIdsInBill.filter((tradeId) => {
    const invitedContractors = activeProject?.tenderContractors?.[tradeId] || [];
    if (invitedContractors.length === 0) return false;
    const itemIds = pricedItems.filter((item: BoQItem) => item.tradePackageId === tradeId).map((item: BoQItem) => item.id);
    return itemIds.some((itemId) =>
      invitedContractors.some((contractorId) => (activeProject?.tenderData?.[itemId]?.[contractorId] || 0) > 0),
    );
  }).length;
  const tradesAwaitingInviteCount = Math.max(tradeIdsInBill.length - invitedTradeCount, 0);
  const winnerCount = tradeIdsInBill.filter((tradeId) => Boolean(activeProject?.tenderAwards?.[tradeId]?.contractorId)).length;
  const billStatusDetail = pricedItems.length === 0
    ? 'Add priced items before assigning a bill-level trade package.'
    : unassignedItemsCount > 0
      ? `${unassignedItemsCount} priced item${unassignedItemsCount === 1 ? '' : 's'} still need a trade package in this bill.`
      : 'Every priced item in this bill is allocated and ready for tender review.';
  const billLevelStandardsDropClass = standardsDragActive
    ? 'border-emerald-300 bg-emerald-50/45 ring-1 ring-emerald-200 dark:border-emerald-900/70 dark:bg-emerald-950/20 dark:ring-emerald-900/60'
    : '';
  const tradeTenderPipeline = tradeIdsInBill
    .map((tradeId) => {
      const trade = trades.find((entry) => entry.id === tradeId);
      if (!trade) return null;

      const invitedContractorIds = activeProject?.tenderContractors?.[tradeId] || [];
      const tradeItems = pricedItems.filter((item: BoQItem) => item.tradePackageId === tradeId);
      const tradeItemIds = tradeItems.map((item: BoQItem) => item.id);
      const contractorsWithReturns = invitedContractorIds.filter((contractorId) =>
        tradeItemIds.some((itemId) => (activeProject?.tenderData?.[itemId]?.[contractorId] || 0) > 0),
      );
      const winnerName = activeProject?.tenderAwards?.[tradeId]?.contractorName || null;

      let statusTone = 'slate';
      let statusLabel = 'Invite contractors';
      let statusDetail = 'No contractors are linked to this trade in tender analysis yet.';
      let actionLabel = 'Open tender analysis to invite';
      let statusIcon: typeof Users | typeof BarChart3 | typeof Trophy = Users;

      if (winnerName) {
        statusTone = 'emerald';
        statusLabel = 'Winner selected';
        statusDetail = `${winnerName} is currently marked as the winning commercial position for this trade.`;
        actionLabel = 'Review or apply in tender analysis';
        statusIcon = Trophy;
      } else if (contractorsWithReturns.length > 0) {
        statusTone = 'primary';
        statusLabel = 'Ready for review';
        statusDetail = `${contractorsWithReturns.length} contractor${contractorsWithReturns.length === 1 ? '' : 's'} have submitted live rates for review.`;
        actionLabel = 'Compare returns and choose a winner';
        statusIcon = BarChart3;
      } else if (invitedContractorIds.length > 0) {
        statusTone = 'amber';
        statusLabel = 'Awaiting returns';
        statusDetail = `${invitedContractorIds.length} contractor${invitedContractorIds.length === 1 ? '' : 's'} invited, but no live rates are recorded yet.`;
        actionLabel = 'Capture the first live return';
        statusIcon = BarChart3;
      }

      return {
        id: trade.id,
        name: trade.name,
        itemCount: tradeItems.length,
        invitedCount: invitedContractorIds.length,
        returnCount: contractorsWithReturns.length,
        winnerName,
        statusTone,
        statusLabel,
        statusDetail,
        actionLabel,
        statusIcon,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => {
      const order = { slate: 0, amber: 1, primary: 2, emerald: 3 } as const;
      return order[a.statusTone as keyof typeof order] - order[b.statusTone as keyof typeof order];
    });
  const resolvedFocusedSectionId = workspaceLayout === 'FOCUSED_SECTION'
    ? (
        selectedSectionId && activeBill.sections.some((section) => section.id === selectedSectionId)
          ? selectedSectionId
          : activeBill.sections[0]?.id || null
      )
    : null;
  const visibleSections = resolvedFocusedSectionId
    ? activeBill.sections.filter((section) => section.id === resolvedFocusedSectionId)
    : activeBill.sections;
  const shownPageIds = visibleSections.flatMap((section) => (section.pages || []).map((page) => page.id));
  const allShownCollapsed = activeBill.sections.length === 0
    ? collapsedBillIds.has(activeBill.id)
    : visibleSections.length > 0 && visibleSections.every((section) => collapsedSections.has(section.id) || (
      (section.pages || []).length > 0 && (section.pages || []).every((page) => collapsedPageIds.has(page.id))
    ));
  const toggleShownCollapse = () => {
    const collapse = !allShownCollapsed;
    if (activeBill.sections.length === 0) {
      setCollapsedBillIds((previous) => {
        const next = new Set(previous);
        if (collapse) next.add(activeBill.id); else next.delete(activeBill.id);
        return next;
      });
      return;
    }
    setCollapsedSections((previous) => {
      const next = new Set(previous);
      visibleSections.forEach((section) => { if (collapse) next.add(section.id); else next.delete(section.id); });
      return next;
    });
    setCollapsedPageIds((previous) => {
      const next = new Set(previous);
      shownPageIds.forEach((id) => { if (collapse) next.add(id); else next.delete(id); });
      return next;
    });
  };
  const selectedSection = activeBill.sections.find((section) => section.id === (resolvedFocusedSectionId || selectedSectionId)) || activeBill.sections[0] || null;
  const paletteSection = activeInsertAnchor
    ? activeBill.sections.find((section) => section.id === activeInsertAnchor.sectionId) || null
    : selectedSection;
  const palettePage = paletteSection?.pages?.find((page) => page.id === (activeInsertAnchor?.pageId || selectedPageId))
    || paletteSection?.pages?.[paletteSection.pages.length - 1];
  const paletteItems = palettePage?.items || paletteSection?.items || activeBill.items || [];
  const paletteAnchorId = activeInsertAnchor?.itemId || paletteItems[paletteItems.length - 1]?.id || null;
  const paletteSectionId = activeInsertAnchor?.sectionId ?? paletteSection?.id ?? '';
  const palettePageId = activeInsertAnchor?.pageId ?? palettePage?.id ?? null;
  const paletteTarget = activeInsertAnchor
    ? `After ${paletteItems.find((item) => item.id === activeInsertAnchor.itemId)?.reference || 'selected row'}`
    : palettePage ? `End of ${palettePage.name || 'page'}` : paletteSection ? `End of ${paletteSection.name}` : 'End of bill';
  const openQuickPalette = () => setIsQuickPaletteOpen(true);
  const fieldEditorFields = fieldEditor ? {
    reference: fieldEditor.reference,
    description: fieldEditor.description,
    quantity: Math.max(0, Number(fieldEditor.quantity) || 0),
    unit: fieldEditor.unit,
    rate: Math.max(0, Number(fieldEditor.rate) || 0),
    tradePackageId: fieldEditor.tradePackageId || undefined,
  } : null;
  const saveFieldEditor = () => {
    if (!fieldEditor || !fieldEditorFields) return;
    onInlineRowUpdate?.(fieldEditor.item.id, fieldEditorFields, fieldEditor.sectionId, fieldEditor.pageId);
    setFieldEditor(null);
  };
  const navigateFieldEditor = (direction: -1 | 1, pricedOnly = false) => {
    if (!fieldEditor) return;
    const target = getAdjacentBillRow(billNavigationRows, fieldEditor.item.id, direction, pricedOnly);
    if (!target) return;
    const changed = fieldEditorFields && (
      fieldEditorFields.reference !== (fieldEditor.item.reference || '') ||
      fieldEditorFields.description !== stripRichText(fieldEditor.item.description) ||
      fieldEditorFields.quantity !== (fieldEditor.item.quantity ?? 0) ||
      fieldEditorFields.unit !== (fieldEditor.item.unit || '') ||
      fieldEditorFields.rate !== (fieldEditor.item.rate ?? 0) ||
      fieldEditorFields.tradePackageId !== fieldEditor.item.tradePackageId
    );
    if (changed && fieldEditorFields) onInlineRowUpdate?.(fieldEditor.item.id, fieldEditorFields, fieldEditor.sectionId, fieldEditor.pageId);
    const item = target.item;
    setFieldEditor({ item, sectionId: target.sectionId, pageId: target.pageId, reference: item.reference || '', description: stripRichText(item.description), quantity: String(item.quantity ?? 0), unit: item.unit || '', rate: String(item.rate ?? 0), tradePackageId: item.tradePackageId || '' });
    setActiveInsertAnchor({ itemId: item.id, sectionId: target.sectionId, pageId: target.pageId });
  };
  const previousFieldRow = fieldEditor ? getAdjacentBillRow(billNavigationRows, fieldEditor.item.id, -1) : null;
  const nextFieldRow = fieldEditor ? getAdjacentBillRow(billNavigationRows, fieldEditor.item.id, 1) : null;
  const previousFieldPriced = fieldEditor ? getAdjacentBillRow(billNavigationRows, fieldEditor.item.id, -1, true) : null;
  const nextFieldPriced = fieldEditor ? getAdjacentBillRow(billNavigationRows, fieldEditor.item.id, 1, true) : null;
  const workspaceContextItems = (contextSection: BoQSection | null = selectedSection): ContextMenuEntry[] => {
    const targetSectionId = contextSection?.id || '';
    const targetPage = contextSection?.pages?.find((page) => page.id === selectedPageId) || contextSection?.pages?.[contextSection.pages.length - 1];
    const targetSectionItems = targetPage?.items || contextSection?.items || activeBill.items || [];
    const targetAppendAnchor = targetSectionItems[targetSectionItems.length - 1] || null;
    const quickAddAtEnd = (type: ItemType | null, nameFirst = false) => quickAddAt(type, targetSectionId, targetPage?.id, targetAppendAnchor?.id, nameFirst);
    const items: ContextMenuEntry[] = [
      { id: 'workspace-add-label', type: 'label', label: 'Add' },
      ...QUICK_LINE_TYPES.map(([type, label], index) => ({
        id: `workspace-add-${type.toLowerCase()}`, label: `Add ${label} (${index + 1})`, icon: <Plus className="h-4 w-4" />, onSelect: () => quickAddAtEnd(type),
      })),
      { id: 'workspace-add-and-name', label: 'Add and name…', icon: <Edit2 className="h-4 w-4" />, onSelect: () => quickAddAtEnd(null, true) },
      {
        id: 'workspace-add-section',
        label: 'Add section',
        icon: <Layers className="h-4 w-4" />,
        onSelect: () => onOpenPrompt('ADD_SECTION', { billId: activeBill.id }),
      },
      ...(targetSectionId
        ? [{
            id: 'workspace-add-page',
            label: 'Add page',
            description: `Add to ${contextSection?.name || 'selected section'}.`,
            icon: <Layers className="h-4 w-4" />,
            onSelect: () => onOpenPrompt('ADD_PAGE', { billId: activeBill.id, sectionId: targetSectionId }),
          }]
        : []),
      { id: 'workspace-standards-label', type: 'label', label: 'Standards' },
      {
        id: 'workspace-open-standards',
        label: 'Open standards library',
        icon: <LibraryIcon className="h-4 w-4" />,
        onSelect: () => onOpenLibrary(true),
      },
      { id: 'workspace-import-label', type: 'label', label: 'Import' },
      ...(onOpenImportLines
        ? [{
            id: 'workspace-import-lines',
            label: 'Import lines',
            description: 'Bring external bill lines into this project.',
            icon: <Copy className="h-4 w-4" />,
            onSelect: onOpenImportLines,
          }]
        : []),
      ...(onClearBillValues && pricedItems.length > 0
        ? buildClearValuesActionItems((mode) => onClearBillValues(activeBill.id, mode))
        : []),
      ...(onRecordRevisionPoint
        ? [
            { id: 'workspace-review-label', type: 'label' as const, label: 'Review' },
            {
              id: 'workspace-record-revision-point',
              label: 'Record revision point',
              description: 'Capture this bill state before controlled changes.',
              icon: <History className="h-4 w-4" />,
              onSelect: onRecordRevisionPoint,
            },
          ]
        : []),
      { id: 'workspace-edit-label', type: 'label', label: 'Edit' },
      ...(onUpdateLineStyle ? [{ id: 'workspace-appearance', label: 'Bill appearance', icon: <Edit2 className="h-4 w-4" />, onSelect: () => setAppearanceOpen(true) }] : []),
      {
        id: 'workspace-rename-bill',
        label: 'Rename current bill',
        icon: <Edit2 className="h-4 w-4" />,
        onSelect: () => onOpenPrompt('RENAME_BILL', activeBill),
      },
    ];
    return items.filter((entry) => !['workspace-add-section', 'workspace-add-page'].includes(entry.id));
  };

  const openWorkspaceContextMenu = (event: React.MouseEvent<HTMLElement>) => {
    if (shouldUseNativeContextMenu(event.target)) return;
    event.preventDefault();
    const target = event.target instanceof HTMLElement ? event.target : null;
    const clickedSectionElement = target?.closest<HTMLElement>('[data-bill-section-id]');
    const clickedSectionId = clickedSectionElement?.dataset.billSectionId;
    const contextSection = clickedSectionElement
      ? (clickedSectionId ? activeBill.sections.find((section) => section.id === clickedSectionId) || selectedSection : null)
      : selectedSection;
    setWorkspaceContextMenu({
      x: event.clientX,
      y: event.clientY,
      label: contextSection ? `${contextSection.name || 'Section'} actions` : 'Bill workspace actions',
      items: workspaceContextItems(contextSection),
    });
  };
  const tenderReadinessCards = [
    {
      id: 'invited',
      icon: Users,
      label: 'Trades invited',
      value: `${invitedTradeCount}/${tradeIdsInBill.length || 0}`,
      tone: invitedTradeCount === tradeIdsInBill.length && tradeIdsInBill.length > 0 ? 'emerald' : 'slate',
      detail: tradeIdsInBill.length > 0 ? `${tradesAwaitingInviteCount} still need contractor invites` : 'Invites begin after trade allocation',
    },
    {
      id: 'returns',
      icon: BarChart3,
      label: 'Trades with returns',
      value: `${returnedTradeCount}/${tradeIdsInBill.length || 0}`,
      tone: returnedTradeCount > 0 ? 'primary' : 'slate',
      detail: returnedTradeCount > 0 ? 'At least one invited contractor has submitted rates' : 'No live tender returns yet',
    },
    {
      id: 'winner',
      icon: Trophy,
      label: 'Winners selected',
      value: `${winnerCount}/${tradeIdsInBill.length || 0}`,
      tone: winnerCount > 0 ? 'emerald' : 'slate',
      detail: winnerCount > 0 ? 'Commercial position is starting to lock in' : 'Select winners once returns are reviewed',
    },
  ] as const;
  const workflowSteps = [
    {
      id: 'project',
      label: 'Project',
      detail: activeProject?.name ? `Working in ${activeProject.name}` : 'Project context',
      complete: Boolean(activeProject),
    },
    {
      id: 'bill',
      label: 'Bill',
      detail: activeBill.name,
      complete: true,
    },
    {
      id: 'structure',
      label: 'Section / page',
      detail: activeBill.sections.length > 0
        ? `${activeBill.sections.length} sections${activeBill.sections.some((section) => (section.pages?.length || 0) > 0) ? ', page mode active' : ''}`
        : pricedItems.length > 0
          ? `${pricedItems.length} direct items added`
          : 'No bill structure yet',
      complete: activeBill.sections.length > 0 || pricedItems.length > 0,
    },
    {
      id: 'trade',
      label: 'Trade',
      detail: pricedItems.length > 0 ? `${assignedItemsCount}/${pricedItems.length} items assigned` : 'Assign trades after pricing',
      complete: pricedItems.length > 0 && assignedItemsCount === pricedItems.length,
    },
    {
      id: 'tender',
      label: 'Tender',
      detail: tradeIdsInBill.length > 0 ? `${invitedTradeCount} trades invited, ${winnerCount} winners selected` : 'Tender review starts after trade allocation',
      complete: tradeIdsInBill.length > 0 && invitedTradeCount > 0,
    },
    {
      id: 'export',
      label: 'Export',
      detail: pricedItems.length > 0 ? 'Bill, workbook, and tender issue outputs ready' : 'Exports become useful once pricing exists',
      complete: pricedItems.length > 0,
    },
  ];
  const currentWorkflowStepId = pricedItems.length === 0
    ? 'bill'
    : activeBill.sections.length === 0
      ? 'structure'
      : unassignedItemsCount > 0
        ? 'trade'
        : tradeIdsInBill.length > 0 && invitedTradeCount === 0
          ? 'tender'
          : tradeIdsInBill.length > 0
            ? 'export'
            : 'structure';
  const workspaceModeLabel = workspaceLayout === 'FULL_BILL' ? 'Full bill workspace' : 'Focused section workspace';
  const workspaceModeDetail = workspaceLayout === 'FULL_BILL'
    ? `Showing all ${activeBill.sections.length} section${activeBill.sections.length === 1 ? '' : 's'} in one continuous bill view.`
    : selectedSection
      ? `Showing only ${selectedSection.name}, so you can work section-by-section without the rest of the bill competing for attention.`
      : 'Select a section from the sidebar to focus this workspace.';
  const workspaceVariant: 'guided' | 'clean' = legacyWorkspaceMode === 'trade' ? 'clean' : 'guided';
  const isCleanWorkspace = workspaceVariant === 'clean';
  const showWorkflowGuidance = activeProject?.showWorkflowGuidance !== false && !isCleanWorkspace;
  const showGuidancePanels = showWorkflowGuidance && !isWorkspaceMaximized;
  const showSelectedBillCommandBar = isWorkspaceSurfaceActive && selectedBillItems.length > 0;
  const showStickyBillTotals = isWorkspaceSurfaceActive && showStickyTotalsInWorkspace && activeProject?.showStickyBillTotals !== false && pricedItems.length > 0;
  const stickyTotalsPositionClass = stickyTotalsPosition ? '' : isSelectionDockOpen ? 'right-4 bottom-[27rem]' : showSelectedBillCommandBar ? 'right-4 bottom-16' : 'right-4 bottom-4';
  const stickyTotalsStyle = stickyTotalsPosition
    ? { left: `${stickyTotalsPosition.x}px`, top: `${stickyTotalsPosition.y}px` }
    : undefined;
  const showStickyTotalsRestore = showStickyBillTotals && isStickyTotalsMinimized && !showSelectedBillCommandBar;
  const stickyTotalsRestorePositionClass = isSelectionDockOpen ? 'right-4 bottom-[27rem]' : showSelectedBillCommandBar ? 'right-4 bottom-16' : 'right-4 bottom-4';
  const nextAction = (() => {
    if (pricedItems.length === 0) {
      return {
        title: 'Start by adding the first measured item',
        detail: 'Once the bill has at least one priced line, the rest of the workflow becomes much easier to follow.',
        primaryLabel: 'Add first item',
        primaryAction: () => onOpenEditor(activeBill.id, '', undefined, 'PRICED'),
        secondaryLabel: 'Open standards',
        secondaryAction: () => onOpenLibrary(true),
      };
    }

    if (activeBill.sections.length === 0) {
      return {
        title: 'Consider adding sections before the bill gets crowded',
        detail: 'Sections make trade allocation, exporting, and tender review easier once you have more than a few items.',
        primaryLabel: 'Add section',
        primaryAction: () => onOpenPrompt('ADD_SECTION'),
        secondaryLabel: 'Keep adding items',
        secondaryAction: () => onOpenEditor(activeBill.id, '', undefined, 'PRICED'),
      };
    }

    if (unassignedItemsCount > 0) {
      return {
        title: 'Assign trades to complete the commercial structure',
        detail: `${unassignedItemsCount} priced item${unassignedItemsCount === 1 ? '' : 's'} still need a trade package before tender comparison will be meaningful.`,
        primaryLabel: 'Open tender analysis',
        primaryAction: () => onOpenTenderView?.(),
        secondaryLabel: 'Add section',
        secondaryAction: () => onOpenPrompt('ADD_SECTION'),
      };
    }

    if (tradeIdsInBill.length > 0 && invitedTradeCount === 0) {
      return {
        title: 'Invite contractors before tender analysis can do useful work',
        detail: `You have ${tradeIdsInBill.length} trade package${tradeIdsInBill.length === 1 ? '' : 's'} allocated, but none of them have invited contractors yet.`,
        primaryLabel: 'Open tender analysis',
        primaryAction: () => onOpenTenderView?.(),
        secondaryLabel: 'Open standards',
        secondaryAction: () => onOpenLibrary(true),
      };
    }

    if (tradeIdsInBill.length > 0 && returnedTradeCount === 0) {
      return {
        title: 'Tender setup is in place - now collect the first live returns',
        detail: `${invitedTradeCount} trade package${invitedTradeCount === 1 ? '' : 's'} already have invited contractors, but no submitted rates are recorded yet.`,
        primaryLabel: 'Open tender analysis',
        primaryAction: () => onOpenTenderView?.(),
        secondaryLabel: 'Add priced item',
        secondaryAction: () => onOpenEditor(activeBill.id, '', undefined, 'PRICED'),
      };
    }

    return {
      title: 'This bill is ready for tender comparison',
      detail: winnerCount > 0
        ? 'Tender returns are active and at least one winning commercial position has already been selected.'
        : 'Tender returns are now in play. Use tender analysis to compare contractors and lock a winning commercial position.',
      primaryLabel: 'Open tender analysis',
      primaryAction: () => onOpenTenderView?.(),
      secondaryLabel: 'Add priced item',
      secondaryAction: () => onOpenEditor(activeBill.id, '', undefined, 'PRICED'),
    };
  })();

  return (
    <div
      ref={billWorkspaceRef}
      data-help-id="help-bill-table"
      data-smoke="bill-workspace"
      data-bill-density={billDensity}
      tabIndex={-1}
      onContextMenu={openWorkspaceContextMenu}
      onClickCapture={(event) => {
        const row = getRowFromEvent(event.target);
        if (!row) return;
        const target = event.target as HTMLElement;
        if (target.closest('[data-bill-select-row]')) {
          selectionAnchorRef.current ||= row.dataset.billRowId!;
          if (event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
            selectBillRow(row.dataset.billRowId!, event);
          } else {
            selectionAnchorRef.current = row.dataset.billRowId!;
          }
          return;
        }
        if (!canActivateRow(event.target)) return;
        setActiveInsertAnchor({ itemId: row.dataset.billRowId!, sectionId: row.dataset.billSectionId || '', pageId: row.dataset.billPageId || null });
        selectBillRow(row.dataset.billRowId!, event);
        if (!target.closest('button')) event.currentTarget.focus({ preventScroll: true });
      }}
      onContextMenuCapture={(event) => {
        const row = getRowFromEvent(event.target);
        if (row) setActiveInsertAnchor({ itemId: row.dataset.billRowId!, sectionId: row.dataset.billSectionId || '', pageId: row.dataset.billPageId || null });
      }}
      onDoubleClickCapture={(event) => {
        if (!canActivateRow(event.target)) return;
        const row = getRowFromEvent(event.target);
        if (row) { event.preventDefault(); openRowFieldEditor(row); }
      }}
      onKeyDownCapture={handleBillKeyDown}
      className={`w-full min-w-0 mx-auto animate-in fade-in duration-300 ${isWorkspaceMaximized ? 'px-3 sm:px-4 py-3 sm:py-4 pb-16' : isCleanWorkspace ? 'px-3 sm:px-4 xl:px-6 py-6 sm:py-7 pb-24' : 'px-4 sm:px-6 xl:px-8 py-8 sm:py-10 pb-28'} ${(showStickyBillTotals && !isStickyTotalsMinimized) || isSelectionDockOpen ? 'pb-44' : ''}`}
    >
      {/* Bill title bar */}
      {!isWorkspaceMaximized && (
      <div className={`sticky top-0 z-20 flex min-w-0 flex-col gap-2 border-b border-slate-200 bg-surface/95 px-4 dark:border-slate-700 dark:bg-surface-950/95 ${isCleanWorkspace ? 'pb-2 mb-1.5' : 'pb-3 mb-2'}`}>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="group flex min-w-0 items-center gap-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Bill workspace</div>
            <h2 className={`${isCleanWorkspace ? 'mt-0.5 text-[1.15rem]' : 'mt-0.5 text-xl'} min-w-0 truncate font-semibold tracking-tight text-slate-900 dark:text-slate-100`}>
              {activeBill.name}
            </h2>
          </div>
        <button
          onClick={() => onOpenPrompt('RENAME_BILL', activeBill)}
          className="p-1.5 text-slate-400 hover:text-primary-500 dark:hover:text-primary-400 opacity-0 group-hover:opacity-100 transition-all rounded-app-sm"
          aria-label="Rename bill"
        >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
        {activeBill.sections.length > 0 && (
          <label className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <span>Section</span>
            <select
              aria-label="Jump to bill section"
              value={selectedSection?.id || ''}
              onChange={(event) => { onSelectSection?.(event.target.value); focusSection(event.target.value); }}
              className="workspace-input w-[min(20rem,50vw)] min-w-0 py-1.5 text-xs"
            >
              {activeBill.sections.map((section, index) => <option key={section.id} value={section.id}>{index + 1}. {section.name}</option>)}
            </select>
            <span className="whitespace-nowrap text-slate-400">of {activeBill.sections.length}</span>
          </label>
        )}
        </div>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
          <label className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            Rows
            <select aria-label="Filter bill rows by trade" value={_selectedTradeFilter} onChange={(event) => _onChangeTradeFilter(event.target.value)} className="workspace-input max-w-40 py-1 text-xs">
              <option value="ALL">All rows</option>
              <option value="UNASSIGNED">Unassigned</option>
              {trades.map((trade) => <option key={trade.id} value={trade.id}>{trade.name}</option>)}
            </select>
          </label>
          {onRecordRevisionPoint && (
            <button
              type="button"
              onClick={onRecordRevisionPoint}
              className="workspace-secondary-btn px-3 py-2 text-xs"
              title="Record a BoQ revision point for the current bill"
            >
              <History className="h-3.5 w-3.5" />
              Revision point
            </button>
          )}
          {!isCleanWorkspace && onOpenImportLines && (
            <button
              type="button"
              onClick={onOpenImportLines}
              className="workspace-secondary-btn px-3 py-2 text-xs"
            >
              <Copy className="h-3.5 w-3.5" />
              Import lines
            </button>
          )}
          {onClearBillValues && pricedItems.length > 0 && (
            <PopoverMenu
              ariaLabel="Clear bill values"
              width={260}
              estimatedHeight={220}
              trigger={({ ref, isOpen, toggle }) => (
                <button
                  ref={ref}
                  type="button"
                  onClick={toggle}
                  className="workspace-secondary-btn px-3 py-2 text-xs text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
                  title="Clear rates, quantities, or both from all priced items in this bill"
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                >
                  <Eraser className="h-3.5 w-3.5" />
                  Clear values
                </button>
              )}
            >
              {(close) => (
                <ClearValuesMenuGroup
                  onClear={(mode) => onClearBillValues(activeBill.id, mode)}
                  close={close}
                />
              )}
            </PopoverMenu>
          )}
          {!isCleanWorkspace && activeBill && onBillTradeAssign && pricedItems.length > 0 && (
            <TradeAssignDropdown
              trades={trades}
              onSelect={(tradeId: string) => onBillTradeAssign(activeBill.id, tradeId)}
              label="Bill trade"
              selectionCount={pricedItems.length}
              helperText={billStatusDetail}
              onCreateTrade={() => onOpenPrompt('CREATE_TRADE')}
            />
          )}
          <button type="button" onClick={openQuickPalette} className="workspace-secondary-btn px-3 py-2 text-xs" aria-label="Open quick add"><Plus className="h-4 w-4" />Add line</button>
          <button type="button" onClick={toggleShownCollapse} className="workspace-secondary-btn px-3 py-2 text-xs">{allShownCollapsed ? 'Expand shown' : 'Collapse shown'}</button>
          <BillStructureMenu bill={activeBill} sectionId={selectedSection?.id} pageId={selectedPageId} onOpenPrompt={onOpenPrompt} />
          {onUpdateLineStyle && onSaveLineStylesDefault && <BillAppearanceMenu getStyle={(key) => getBillLineStyleConfig(activeProject, key)!} onChange={onUpdateLineStyle} onSaveDefault={onSaveLineStylesDefault} open={appearanceOpen} onOpenChange={setAppearanceOpen} />}
          <button type="button" className="workspace-secondary-btn px-3 py-2 text-xs" onClick={() => changeBillDensity(billDensity === 'compact' ? 'comfortable' : 'compact')} aria-label={`Switch to ${billDensity === 'compact' ? 'comfortable' : 'compact'} bill rows`}>
            {billDensity === 'compact' ? 'Compact' : 'Comfortable'}
          </button>
        </div>
      </div>
      )}
      {isWorkspaceMaximized && <div className="sticky top-0 z-20 flex flex-wrap justify-end gap-2 bg-surface/95 py-2 dark:bg-surface-950/95">
        <label className="flex items-center gap-1 text-xs">Rows <select aria-label="Filter bill rows by trade" value={_selectedTradeFilter} onChange={(event) => _onChangeTradeFilter(event.target.value)} className="workspace-input max-w-40 py-1 text-xs"><option value="ALL">All rows</option><option value="UNASSIGNED">Unassigned</option>{trades.map((trade) => <option key={trade.id} value={trade.id}>{trade.name}</option>)}</select></label>
        <button type="button" onClick={openQuickPalette} className="workspace-secondary-btn px-3 py-2 text-xs" aria-label="Open quick add"><Plus className="h-4 w-4" />Add line</button>
        <button type="button" onClick={toggleShownCollapse} className="workspace-secondary-btn px-3 py-2 text-xs">{allShownCollapsed ? 'Expand shown' : 'Collapse shown'}</button>
        {onClearBillValues && pricedItems.length > 0 && <PopoverMenu ariaLabel="Clear bill values" width={260} estimatedHeight={220} trigger={({ ref, isOpen, toggle }) => <button ref={ref} type="button" onClick={toggle} className="workspace-secondary-btn px-2 py-2 text-xs" aria-haspopup="menu" aria-expanded={isOpen}><Eraser className="h-3.5 w-3.5" />Clear values</button>}>
          {(close) => <ClearValuesMenuGroup onClear={(mode) => onClearBillValues(activeBill.id, mode)} close={close} />}
        </PopoverMenu>}
        <BillStructureMenu bill={activeBill} sectionId={selectedSection?.id} pageId={selectedPageId} onOpenPrompt={onOpenPrompt} />
        {onUpdateLineStyle && onSaveLineStylesDefault && <BillAppearanceMenu getStyle={(key) => getBillLineStyleConfig(activeProject, key)!} onChange={onUpdateLineStyle} onSaveDefault={onSaveLineStylesDefault} open={appearanceOpen} onOpenChange={setAppearanceOpen} />}
        <button type="button" className="workspace-secondary-btn px-3 py-2 text-xs" onClick={() => changeBillDensity(billDensity === 'compact' ? 'comfortable' : 'compact')}>{billDensity === 'compact' ? 'Compact' : 'Comfortable'}</button>
      </div>}

      {!isWorkspaceMaximized && !isCleanWorkspace && (
        <div className="rounded-app-lg border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-surface-900/92">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Current workspace
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">
                {workspaceModeLabel}
              </div>
              <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500 dark:text-slate-400">
                {workspaceModeDetail}
              </p>
            </div>
            {selectedSection && workspaceLayout === 'FOCUSED_SECTION' && activeBill.sections.length > 1 && (
              <div className="rounded-app border border-slate-200 bg-surface px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-surface-800 dark:text-slate-300">
                Section {activeBill.sections.findIndex((section) => section.id === selectedSection.id) + 1} of {activeBill.sections.length}
              </div>
            )}
          </div>
        </div>
      )}
      <div
        className={`${isWorkspaceMaximized ? 'space-y-4' : isCleanWorkspace ? 'space-y-6' : 'space-y-10'} min-w-0`}
      >

      {showGuidancePanels && (
        <div className="rounded-app-xl border border-slate-200/80 bg-white/92 shadow-card dark:border-slate-700 dark:bg-surface-900/95 overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[1.35fr_0.95fr]">
          <div className="px-6 py-6 sm:px-8 border-b border-slate-200/80 dark:border-slate-700/80 lg:border-b-0 lg:border-r">
            <div className="workspace-chip mb-4">
              <Layers className="h-3.5 w-3.5" />
              Workflow guide
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {workflowSteps.map((step, index) => {
                const isCurrent = step.id === currentWorkflowStepId;
                return (
                  <div
                    key={`${step.id}-spine`}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium ${
                      isCurrent
                        ? 'border-emerald-800 bg-emerald-800 text-white dark:border-emerald-700 dark:bg-emerald-700 dark:text-white'
                        : step.complete
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300'
                          : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-400'
                    }`}
                  >
                    <span className="text-[10px] uppercase tracking-[0.16em] opacity-70">{index + 1}</span>
                    <span>{step.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {workflowSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`rounded-app border p-4 ${
                    step.id === currentWorkflowStepId
                      ? 'border-emerald-800 bg-emerald-800 text-white dark:border-emerald-700 dark:bg-emerald-700 dark:text-white'
                      : step.complete
                        ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/70 dark:bg-emerald-900/20'
                        : 'border-slate-200 bg-surface dark:border-slate-700 dark:bg-surface-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
                      step.id === currentWorkflowStepId
                        ? 'text-white/80 dark:text-emerald-100/80'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}>Step {index + 1}</span>
                    {step.id === currentWorkflowStepId ? (
                      <ArrowRight className="h-4 w-4 text-white dark:text-emerald-100" />
                    ) : step.complete ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                    ) : (
                      <Circle className="h-4 w-4 text-slate-300 dark:text-slate-500" />
                    )}
                  </div>
                  <div className={`mt-3 text-sm font-semibold ${
                    step.id === currentWorkflowStepId ? 'text-white dark:text-slate-900' : 'text-slate-900 dark:text-slate-100'
                  }`}>{step.label}</div>
                  <div className={`mt-2 text-xs leading-5 ${
                    step.id === currentWorkflowStepId ? 'text-white/80 dark:text-slate-700' : 'text-slate-500 dark:text-slate-400'
                  }`}>{step.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8 bg-surface-muted/50 dark:bg-surface-800/40">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Next best step</div>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{nextAction.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{nextAction.detail}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={nextAction.primaryAction}
                className="workspace-primary-btn px-4 py-2.5"
              >
                {nextAction.primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={nextAction.secondaryAction}
                className="inline-flex items-center gap-2 rounded-app-sm border border-slate-200 bg-surface px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-surface-muted dark:border-slate-600 dark:bg-surface-800 dark:text-slate-200 dark:hover:bg-surface-900"
              >
                {nextAction.secondaryLabel}
              </button>
            </div>
          </div>
        </div>
        </div>
      )}

      {showGuidancePanels && tradeIdsInBill.length > 0 && unassignedItemsCount === 0 && (
        <div className="rounded-app-xl border border-slate-200/80 bg-white/92 shadow-card dark:border-slate-700 dark:bg-surface-900/95 overflow-hidden">
          <div className="flex flex-col gap-5 px-6 py-6 sm:px-8 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="workspace-chip">
                <BarChart3 className="h-3.5 w-3.5" />
                Tender readiness
              </div>
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                Commercial handoff is visible now
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Every priced item is allocated. The remaining question is whether each trade package has invited contractors,
                live returns, and a selected winner.
              </p>
            </div>
            {onOpenTenderView && (
              <button
                type="button"
                onClick={onOpenTenderView}
                className="workspace-primary-btn px-4 py-2.5"
              >
                Open tender analysis
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="grid gap-3 border-t border-slate-200/80 px-6 py-6 sm:px-8 md:grid-cols-3 dark:border-slate-700/80">
            {tenderReadinessCards.map((card) => {
              const toneClasses = card.tone === 'emerald'
                ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/70 dark:bg-emerald-950/20'
                : card.tone === 'primary'
                  ? 'border-primary-200 bg-primary-50/80 dark:border-primary-900/70 dark:bg-primary-950/20'
                  : 'border-slate-200 bg-surface dark:border-slate-700 dark:bg-surface-800';
              const Icon = card.icon;

              return (
                <div key={card.id} className={`rounded-app border p-4 ${toneClasses}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                        {card.label}
                      </div>
                      <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                        {card.value}
                      </div>
                    </div>
                    <Icon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {card.detail}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="border-t border-slate-200/80 px-6 py-6 sm:px-8 dark:border-slate-700/80">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                  Trade-by-trade handoff
                </div>
                <h4 className="mt-2 text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                  What each trade needs next
                </h4>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Use this as the bridge between allocation and tendering. Each trade below tells you whether it needs invites, live returns, or final commercial selection.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {tradeTenderPipeline.map((tradeSummary) => {
                const toneClasses = tradeSummary.statusTone === 'emerald'
                  ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/70 dark:bg-emerald-950/20'
                  : tradeSummary.statusTone === 'primary'
                    ? 'border-primary-200 bg-primary-50/70 dark:border-primary-900/70 dark:bg-primary-950/20'
                    : tradeSummary.statusTone === 'amber'
                      ? 'border-amber-200 bg-amber-50/70 dark:border-amber-900/70 dark:bg-amber-950/20'
                      : 'border-slate-200 bg-surface dark:border-slate-700 dark:bg-surface-800';
                const StatusIcon = tradeSummary.statusIcon;

                return (
                  <div key={tradeSummary.id} className={`rounded-app-lg border p-4 ${toneClasses}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                          {tradeSummary.statusLabel}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <h5 className="text-base font-semibold text-slate-950 dark:text-slate-50">
                            {tradeSummary.name}
                          </h5>
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300">
                            {tradeSummary.itemCount} item{tradeSummary.itemCount === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>
                      <StatusIcon className="mt-1 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {tradeSummary.statusDetail}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-medium">
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300">
                        {tradeSummary.invitedCount} invited
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300">
                        {tradeSummary.returnCount} with returns
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300">
                        {tradeSummary.winnerName ? `Winner: ${tradeSummary.winnerName}` : 'Winner not selected'}
                      </span>
                    </div>
                    {onOpenTenderView && (
                      <button
                        type="button"
                        onClick={onOpenTenderView}
                        className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700 transition hover:text-slate-950 dark:text-slate-200 dark:hover:text-slate-50"
                      >
                        {tradeSummary.actionLabel}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeBill.sections.length === 0 ? (
        <div className="space-y-6">
          {!isCleanWorkspace && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Add items directly to this bill, or add a section (optional) to group them.
            </p>
          )}
          {(activeBill.items || []).length === 0 ? (
            isCleanWorkspace ? (
              <div
                className={`rounded-app-lg border border-dashed border-slate-200/80 bg-white/92 px-6 py-5 shadow-card transition hover:border-emerald-200 hover:bg-emerald-50/35 dark:border-slate-700 dark:bg-surface-900/95 dark:hover:border-emerald-900/60 dark:hover:bg-emerald-950/15 ${billLevelStandardsDropClass}`}
                data-standards-drop-destination="true"
                data-bill-section-id=""
                onDragOver={handleStandardsDestinationDragOver}
                onDrop={(event) => handleStandardsDestinationDrop(event, '', undefined)}
              >
                {standardsDragActive ? (
                  <div className="mb-3 inline-flex rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm dark:border-emerald-900/60 dark:bg-surface-900 dark:text-emerald-200">
                    Drop here to append standards to this bill
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                      Empty bill
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Add the first item or section to begin working.
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={openQuickPalette} className="workspace-primary-btn px-3 py-2 text-xs"><Plus className="h-4 w-4" />Add line</button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`overflow-hidden rounded-app-lg border border-dashed border-slate-200/80 bg-surface shadow-card transition hover:border-emerald-200 hover:bg-emerald-50/35 dark:border-slate-700 dark:bg-surface-900 dark:hover:border-emerald-900/60 dark:hover:bg-emerald-950/15 ${billLevelStandardsDropClass}`}
                data-standards-drop-destination="true"
                data-bill-section-id=""
                onDragOver={handleStandardsDestinationDragOver}
                onDrop={(event) => handleStandardsDestinationDrop(event, '', undefined)}
              >
                <div className="px-6 py-8 sm:px-8 sm:py-10 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-br from-surface-muted via-surface to-white dark:from-surface-800 dark:via-surface-900 dark:to-surface-900">
                  <div className="max-w-2xl">
                    {standardsDragActive ? (
                      <div className="mb-3 inline-flex rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm dark:border-emerald-900/60 dark:bg-surface-900 dark:text-emerald-200">
                        Drop here to append standards to this bill
                      </div>
                    ) : null}
                    <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-800 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-700 dark:text-primary-300">
                      <Layers className="w-3.5 h-3.5" />
                      Start this bill
                    </div>
                    <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                      Build the first draft in one of three ways
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Most bills start with a few direct items, then grow into sections if the scope needs clearer structure.
                      Pick the quickest path below and refine from there.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <button type="button" onClick={openQuickPalette} className="workspace-primary-btn px-3 py-2 text-xs"><Plus className="h-4 w-4" />Add line</button>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 px-6 py-6 sm:px-8 md:grid-cols-3">
                  <div className="rounded-app border border-slate-200 dark:border-slate-700 bg-surface-muted/40 dark:bg-surface-800/40 p-4">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                      <Plus className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      <span className="text-sm font-semibold">Add a first item</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Best when you already know the first measured item and want to start pricing immediately.
                    </p>
                  </div>
                  <div className="rounded-app border border-slate-200 dark:border-slate-700 bg-surface-muted/40 dark:bg-surface-800/40 p-4">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                      <Layers className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      <span className="text-sm font-semibold">Group by section</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Use sections when you want cleaner work packages, page breaks, or more control over trade assignment.
                    </p>
                  </div>
                  <div className="rounded-app border border-slate-200 dark:border-slate-700 bg-surface-muted/40 dark:bg-surface-800/40 p-4">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                      <LibraryIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      <span className="text-sm font-semibold">Reuse standards</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Open your standards library when you want to seed the bill from existing wording instead of typing from scratch.
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpenLibrary(true)}
                      className="mt-4 text-sm font-medium text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200"
                    >
                      Open standards library
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : (
            <BillSectionCard
              key="bill-items"
              section={{ id: '', name: 'Items', items: activeBill.items || [] }}
              sectionIndex={0}
              activeBill={activeBill}
              viewMode={legacyWorkspaceMode}
              selectedTradeFilter={_selectedTradeFilter}
              onChangeTradeFilter={_onChangeTradeFilter}
              trades={trades}
              tenderAwards={activeProject?.tenderAwards}
              selectedItemIds={selectedItemIds}
              setSelectedItemIds={setSelectedItemIds}
              recentlyInsertedItemIds={recentlyInsertedItemIds}
              activeItemId={activeItemId}
              activeInsertAnchorId={activeInsertAnchor?.itemId}
              onQuickAdd={quickAddAt}
              onOpenEditor={(billId, sectionId, item, type, pageId, insertAfterItemId) => openBillEditor(billId, sectionId, item, type, pageId ?? undefined, insertAfterItemId)}
              onOpenPrompt={onOpenPrompt}
              onOpenLibrary={onOpenLibrary}
              onOpenStandardsInsert={onOpenStandardsInsert}
              onImportJsonToSection={onImportJsonToSection}
              onImportJsonToPage={onImportJsonToPage}
              onSingleItemTradeAssign={onSingleItemTradeAssign}
              onSectionTradeAssign={onSectionTradeAssign}
                onDeleteBillItem={(_, itemId) => onDeleteBillItem('', itemId)}
                onMoveBillItem={(draggedItemId, targetItemId, placement) => onMoveBillItem(draggedItemId, targetItemId, placement, '')}
                onShiftBillItem={(itemId, direction) => onShiftBillItem(itemId, direction, '')}
                onInlineQuantityUpdate={(itemId, quantity) => onInlineQuantityUpdate(itemId, quantity, '')}
                onInlineUnitUpdate={(itemId, unit) => onInlineUnitUpdate(itemId, unit, '')}
                onInlineRateUpdate={(itemId, rate) => onInlineRateUpdate(itemId, rate, '')}
                onItemDragStart={(event, itemId) => handleItemDragStart(event, itemId, '', undefined)}
                onPointerDragStart={(event, itemId) => handlePointerDragStart(event, itemId, '', undefined)}
                  onPointerDragHover={(event, targetItemId) => handlePointerDragHover(event, targetItemId, '', undefined)}
                  onItemDragEnd={handleItemDragEnd}
                  onItemDrop={(event, targetItemId) => handleItemDrop(event, targetItemId, '', undefined)}
                  onStandardsDropToDestination={handleStandardsDestinationDrop}
                pointerDraggedItemState={pointerDraggedItemState}
                pointerDropIndicatorState={pointerDropIndicatorState}
                isCostItem={isCostItem}
                getRowStyles={getRowStyles}
                getTextStyles={getTextStyles}
                getRowInlineStyle={getRowInlineStyle}
                getDescriptionInlineStyle={getDescriptionInlineStyle}
                getDisplayRef={getDisplayRef}
              isCollapsed={collapsedBillIds.has(activeBill.id)}
              isPageCollapsed={(pageId) => collapsedPageIds.has(pageId)}
              onTogglePageCollapse={(pageId) => setCollapsedPageIds((previous) => { const next = new Set(previous); if (next.has(pageId)) next.delete(pageId); else next.add(pageId); return next; })}
              onToggleCollapse={() => setCollapsedBillIds((previous) => {
                const next = new Set(previous);
                if (next.has(activeBill.id)) next.delete(activeBill.id);
                else next.add(activeBill.id);
                return next;
              })}
              onClearSectionValues={
                onClearBillValues ? (mode) => onClearBillValues(activeBill.id, mode) : undefined
              }
              isBillLevel
              pageCardRefs={pageCardRefs}
              isCleanWorkspace={isCleanWorkspace}
              isWorkspaceMaximized={isWorkspaceMaximized}
              workspaceZoom={workspaceZoom}
              isStandardsDragActive={standardsDragActive}
            />
          )}
        </div>
      ) : (
        <div className={`${isWorkspaceMaximized ? 'space-y-4' : 'space-y-8'} min-w-0`}>
            {!isWorkspaceMaximized && !isCleanWorkspace && selectedSection && workspaceLayout === 'FOCUSED_SECTION' && activeBill.sections.length > 1 && (
              <div className="rounded-app-lg border border-slate-200/80 bg-white/88 px-4 py-3 text-sm shadow-card dark:border-slate-700 dark:bg-surface-900/92">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                      Focused section view
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Showing {selectedSection.name}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Section {(activeBill.sections.findIndex((section) => section.id === selectedSection.id) + 1)} of {activeBill.sections.length}
                  </div>
                </div>
              </div>
            )}
            {visibleSections.length === 0 ? (
              <div className="rounded-app-lg border border-dashed border-slate-300 bg-white/88 px-6 py-10 text-center shadow-card dark:border-slate-700 dark:bg-surface-900/88">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  No bill rows match this trade filter
                </div>
                <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Choose another trade package, switch back to all bill rows, or assign priced items to this trade before reviewing the contractor scope.
                </p>
              </div>
            ) : visibleSections.map((section) => {
              const sectionIndex = activeBill.sections.findIndex((entry) => entry.id === section.id);
              return (
              <div
                key={section.id}
                ref={(node) => {
                  sectionCardRefs.current[section.id] = node;
                }}
              >
                <BillSectionCard
                  section={section}
                  sectionIndex={sectionIndex}
                  activeBill={activeBill}
                  viewMode={legacyWorkspaceMode}
                  selectedTradeFilter={_selectedTradeFilter}
                  onChangeTradeFilter={_onChangeTradeFilter}
                  trades={trades}
                  tenderAwards={activeProject?.tenderAwards}
                  selectedItemIds={selectedItemIds}
                  setSelectedItemIds={setSelectedItemIds}
                  recentlyInsertedItemIds={recentlyInsertedItemIds}
                  activeItemId={activeItemId}
                  activeInsertAnchorId={activeInsertAnchor?.itemId}
                  onQuickAdd={quickAddAt}
                  onOpenEditor={openBillEditor}
                  onOpenPrompt={onOpenPrompt}
                  onOpenLibrary={onOpenLibrary}
                  onOpenStandardsInsert={onOpenStandardsInsert}
                  onImportJsonToSection={onImportJsonToSection}
                  onImportJsonToPage={onImportJsonToPage}
                  onSingleItemTradeAssign={onSingleItemTradeAssign}
                  onSectionTradeAssign={onSectionTradeAssign}
                    onDeleteBillItem={onDeleteBillItem}
                    onMoveBillItem={onMoveBillItem}
                    onShiftBillItem={onShiftBillItem}
                    onInlineQuantityUpdate={onInlineQuantityUpdate}
                    onInlineUnitUpdate={onInlineUnitUpdate}
                    onInlineRateUpdate={onInlineRateUpdate}
                    onItemDragStart={handleItemDragStart}
                    onPointerDragStart={handlePointerDragStart}
                      onPointerDragHover={handlePointerDragHover}
                      onItemDragEnd={handleItemDragEnd}
                      onItemDrop={handleItemDrop}
                      onStandardsDropToDestination={handleStandardsDestinationDrop}
                    pointerDraggedItemState={pointerDraggedItemState}
                    pointerDropIndicatorState={pointerDropIndicatorState}
                    isCostItem={isCostItem}
                    getRowStyles={getRowStyles}
                    getTextStyles={getTextStyles}
                    getRowInlineStyle={getRowInlineStyle}
                    getDescriptionInlineStyle={getDescriptionInlineStyle}
                    getDisplayRef={getDisplayRef}
                  isCollapsed={collapsedSections.has(section.id)}
                  isPageCollapsed={(pageId) => collapsedPageIds.has(pageId)}
                  onTogglePageCollapse={(pageId) => setCollapsedPageIds((previous) => { const next = new Set(previous); if (next.has(pageId)) next.delete(pageId); else next.add(pageId); return next; })}
                  onToggleCollapse={() =>
                    setCollapsedSections((prev) => {
                      const next = new Set(prev);
                      if (next.has(section.id)) {
                        next.delete(section.id);
                      } else {
                        next.add(section.id);
                      }
                      return next;
                    })
                  }
                  onExportSection={onExportSection}
                  onSaveSectionAssembly={
                    onSaveSectionAssembly ? () => onSaveSectionAssembly(section.id) : undefined
                  }
                  onDeleteSection={
                    onDeleteSection ? () => onDeleteSection(activeBill.id, section.id) : undefined
                  }
                  onMoveSectionUp={
                    onMoveSection && sectionIndex > 0
                      ? () => onMoveSection(activeBill.id, section.id, 'UP')
                      : undefined
                  }
                  onMoveSectionDown={
                    onMoveSection && sectionIndex < activeBill.sections.length - 1
                      ? () => onMoveSection(activeBill.id, section.id, 'DOWN')
                      : undefined
                  }
                  onCopySection={
                    onCopySection ? () => onCopySection(activeBill.id, section.id) : undefined
                  }
                  onDeletePage={onDeletePage}
                  onClearSectionValues={
                    onClearSectionValues ? (mode) => onClearSectionValues(activeBill.id, section.id, mode) : undefined
                  }
                  onClearPageValues={onClearPageValues}
                  pageCardRefs={pageCardRefs}
                  isCleanWorkspace={isCleanWorkspace}
                  isWorkspaceMaximized={isWorkspaceMaximized}
                  workspaceZoom={workspaceZoom}
                  isStandardsDragActive={standardsDragActive}
                  onCopyPage={onCopyPage}
                />
              </div>
            );})}
        </div>
      )}
      </div>

      {showStickyTotalsRestore && (
        <button
          type="button"
          data-testid="restore-sticky-bill-totals"
          className={`fixed ${stickyTotalsRestorePositionClass} z-[70] inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-[0_14px_40px_-22px_rgba(15,23,42,0.6)] backdrop-blur-xl transition hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-slate-700/90 dark:bg-surface-900/95 dark:text-slate-200 dark:hover:bg-surface-800 dark:hover:text-slate-50`}
          onClick={() => setIsStickyTotalsMinimized(false)}
          title="Show bill and project totals"
          aria-label="Show bill and project totals"
        >
          <ReceiptText className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
          Show totals
        </button>
      )}

      {showStickyBillTotals && !isStickyTotalsMinimized && (
        <div
          ref={stickyTotalsRef}
          data-testid="sticky-bill-totals"
          data-smoke="sticky-bill-totals"
          className={`fixed ${stickyTotalsPositionClass} z-40 w-[min(40rem,calc(100vw-2rem))] overflow-hidden rounded-app-lg border border-slate-200/90 bg-white/95 shadow-[0_18px_55px_-24px_rgba(15,23,42,0.55)] backdrop-blur-xl dark:border-slate-700/90 dark:bg-surface-900/95`}
          style={stickyTotalsStyle}
        >
          <div
            className={`flex cursor-move select-none items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3 dark:border-slate-700/80 ${isDraggingStickyTotals ? 'bg-slate-50 dark:bg-surface-800/70' : ''}`}
            onPointerDown={handleStartStickyTotalsDrag}
            title="Drag to move bill totals"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <Move className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  Bill and project totals
                </div>
                <div className="mt-0.5 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {activeBill.name}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                unassignedItemsCount > 0
                  ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-200'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-200'
              }`}>
                {unassignedItemsCount > 0 ? `${unassignedItemsCount} unassigned` : 'Trades assigned'}
              </div>
              {stickyTotalsPosition && (
                <button
                  type="button"
                  onClick={() => setStickyTotalsPosition(null)}
                  onPointerDown={(event) => event.stopPropagation()}
                  className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-400 dark:hover:bg-surface-800 dark:hover:text-slate-100"
                  title="Reset bill totals position"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsStickyTotalsMinimized(true)}
                onPointerDown={(event) => event.stopPropagation()}
                className="inline-flex h-7 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-400 dark:hover:bg-surface-800 dark:hover:text-slate-100"
                title="Minimise bill and project totals"
                aria-label="Minimise bill and project totals"
              >
                <Minimize2 className="h-3.5 w-3.5" />
                <span>Minimise</span>
              </button>
            </div>
          </div>
          <div className="divide-y divide-slate-200/80 dark:divide-slate-700/80">
            <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(6rem,0.8fr)_minmax(5.5rem,0.72fr)_minmax(6.5rem,0.9fr)] bg-slate-50/80 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:bg-surface-800/70 dark:text-slate-500">
              <div>Scope</div>
              <div className="text-right">Net</div>
              <div className="text-right">OHP {activeProject?.ohpPercentage || 0}%</div>
              <div className="text-right text-emerald-700/80 dark:text-emerald-200/80">Gross</div>
            </div>
            <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(6rem,0.8fr)_minmax(5.5rem,0.72fr)_minmax(6.5rem,0.9fr)] items-center gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Current bill</div>
                <div className="mt-0.5 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{activeBill.name}</div>
              </div>
              <div className="text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(netTotal)}</div>
              <div className="text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(ohp)}</div>
              <div className="rounded-app bg-emerald-50/80 px-2 py-1.5 text-right text-base font-semibold tabular-nums text-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-100">{formatCurrency(grossTotal)}</div>
            </div>
            <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(6rem,0.8fr)_minmax(5.5rem,0.72fr)_minmax(6.5rem,0.9fr)] items-center gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Project total</div>
                <div className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">{projectBillCount} bill{projectBillCount === 1 ? '' : 's'} included</div>
              </div>
              <div className="text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(projectNetTotal)}</div>
              <div className="text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(projectOhp)}</div>
              <div className="rounded-app bg-emerald-100/80 px-2 py-1.5 text-right text-base font-semibold tabular-nums text-emerald-950 dark:bg-emerald-900/35 dark:text-emerald-50">{formatCurrency(projectGrossTotal)}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 px-4 py-2.5 text-[11px] text-slate-500 dark:border-slate-700/80 dark:text-slate-400">
            <span>{pricedItems.length} priced row{pricedItems.length === 1 ? '' : 's'}</span>
            <span>{assignedItemsCount}/{pricedItems.length} trade assigned</span>
            <span>{tradeIdsInBill.length} trade package{tradeIdsInBill.length === 1 ? '' : 's'}</span>
            <span>{projectBillCount} project bill{projectBillCount === 1 ? '' : 's'}</span>
          </div>
        </div>
      )}

      {showSelectedBillCommandBar && (
        <div
          className="pointer-events-none fixed bottom-3 z-50 flex -translate-x-1/2 flex-col items-center gap-2"
          style={{ left: selectionDockGeometry.center, width: selectionDockGeometry.width }}
          onPointerEnter={() => setIsSelectionDockHovered(true)}
          onPointerLeave={() => setIsSelectionDockHovered(false)}
          onFocus={() => setIsSelectionDockHovered(true)}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsSelectionDockHovered(false); }}
        >
          {isSelectionDockOpen && <div id="bill-selection-actions" role="toolbar" aria-label="Selected bill row actions" className="pointer-events-auto flex max-h-[min(60vh,24rem)] w-full flex-wrap items-center gap-2 overflow-y-auto rounded-app-lg border border-emerald-200/90 bg-white/98 px-3 py-2 shadow-[0_18px_55px_-24px_rgba(15,23,42,0.55)] backdrop-blur-xl dark:border-emerald-900/60 dark:bg-surface-900/98">
          <div className="flex min-w-[15rem] items-center gap-3 pr-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-sm font-semibold text-white shadow-app dark:bg-emerald-800 dark:text-emerald-50">
              {selectedBillItems.length}
            </div>
            <div className="min-w-0 text-xs font-medium text-slate-600 dark:text-slate-300">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                Selected rows
              </div>
              <div className="mt-0.5 truncate">
                {selectedBillItems.length} row{selectedBillItems.length === 1 ? '' : 's'} selected
              </div>
              <div className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                Esc clears · Del deletes
              </div>
            </div>
          </div>

          <div className="hidden min-w-[18rem] grid-cols-3 overflow-hidden rounded-app border border-slate-200 bg-slate-50/80 text-xs dark:border-slate-700 dark:bg-surface-800/70 2xl:grid">
            <div className="border-r border-slate-200 px-3 py-2 dark:border-slate-700">
              <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Value</div>
              <div className="mt-0.5 truncate font-semibold tabular-nums text-slate-900 dark:text-slate-100">{selectedValueLabel}</div>
            </div>
            <div className="border-r border-slate-200 px-3 py-2 dark:border-slate-700">
              <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Priced</div>
              <div className="mt-0.5 truncate font-semibold text-slate-900 dark:text-slate-100">
                {selectedCommercialItems.length}
                {selectedNonCommercialCount > 0 && <span className="font-medium text-slate-400 dark:text-slate-500"> + {selectedNonCommercialCount} notes</span>}
              </div>
            </div>
            <div className="px-3 py-2">
              <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Trade</div>
              <div className={`mt-0.5 truncate font-semibold ${selectedUnassignedCommercialCount > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-900 dark:text-slate-100'}`}>
                {selectedTradeCoverageLabel}
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1.5 rounded-app border border-slate-200/80 bg-slate-50/70 px-2 py-1.5 dark:border-slate-700 dark:bg-surface-800/60">
              <span className="px-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Allocate</span>
              {selectedCommercialItems.length > 0 ? (
                <TradeAssignDropdown
                  onSelect={onBatchAssign}
                  trades={trades}
                  label="Assign trade"
                  selectionCount={selectedCommercialItems.length}
                  helperText={`Assign the ${selectedCommercialItems.length} selected priced row${selectedCommercialItems.length === 1 ? '' : 's'} to a trade package. Headings and comments stay unchanged.`}
                  onCreateTrade={() => onOpenPrompt('CREATE_TRADE')}
                  triggerClassName="workspace-primary-btn px-3 py-2 text-xs"
                />
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex cursor-not-allowed items-center gap-1.5 rounded-app-sm border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-400 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-500"
                  title="Select at least one priced row to assign a trade package."
                >
                  <Tag className="h-3.5 w-3.5" />
                  Assign trade
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 rounded-app border border-slate-200/80 bg-slate-50/70 px-2 py-1.5 dark:border-slate-700 dark:bg-surface-800/60">
              <span className="px-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Values</span>
              {onApplyLiveRates && <button type="button" onClick={openLiveRateReview} className="workspace-secondary-btn px-3 py-2 text-xs"><Sparkles className="h-3.5 w-3.5" />AI live rates</button>}
              {onClearSelectedValues && <button type="button" disabled={selectedCommercialItems.length === 0} onClick={() => onClearSelectedValues('QUANTITIES')} className="workspace-secondary-btn px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"><Eraser className="h-3.5 w-3.5" />Clear quantities</button>}
              {onClearSelectedValues && selectedCommercialItems.length > 0 ? (
                <PopoverMenu
                  ariaLabel="Clear selected values"
                  width={270}
                  estimatedHeight={230}
                  trigger={({ ref, isOpen, toggle }) => (
                    <button
                      ref={ref}
                      type="button"
                      onClick={toggle}
                      aria-haspopup="menu"
                      aria-expanded={isOpen}
                      className="workspace-secondary-btn px-3 py-2 text-xs text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
                    >
                      <Eraser className="h-3.5 w-3.5" />
                      Clear values
                    </button>
                  )}
                >
                  {(close) => (
                    <ClearValuesMenuGroup
                      onClear={(mode) => onClearSelectedValues(mode)}
                      close={close}
                    />
                  )}
                </PopoverMenu>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex cursor-not-allowed items-center gap-1.5 rounded-app-sm border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-400 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-500"
                  title="Select at least one priced row to clear rates or quantities."
                >
                  <Eraser className="h-3.5 w-3.5" />
                  Clear values
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 rounded-app border border-slate-200/80 bg-slate-50/70 px-2 py-1.5 dark:border-slate-700 dark:bg-surface-800/60">
              <span className="px-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Edit</span>
              {onDuplicateSelectedItems && (
                <button
                  type="button"
                  onClick={onDuplicateSelectedItems}
                  title="Copy selected rows, then tick one destination row and paste below it (Ctrl+C)"
                  className="workspace-secondary-btn px-3 py-2 text-xs"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </button>
              )}
              {onPasteCopiedItems && <button type="button" onClick={onPasteCopiedItems} disabled={copiedBillItemsCount === 0 || selectedBillItems.length !== 1} title={copiedBillItemsCount === 0 ? 'Copy rows with Duplicate or Ctrl+C first' : 'Tick exactly one destination row to paste below it (Ctrl+V)'} className="workspace-secondary-btn px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"><ClipboardPaste className="h-3.5 w-3.5" />Paste{copiedBillItemsCount > 0 ? ` ${copiedBillItemsCount}` : ''}</button>}
              {onDeleteSelectedItems && (
                <button
                  type="button"
                  onClick={onDeleteSelectedItems}
                  className="workspace-secondary-btn px-3 py-2 text-xs text-red-600 hover:text-red-700 dark:text-red-300 dark:hover:text-red-200"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              )}
            </div>

            {showStickyBillTotals && <div className="flex flex-wrap items-center gap-1.5 rounded-app border border-slate-200/80 bg-slate-50/70 px-2 py-1.5 dark:border-slate-700 dark:bg-surface-800/60">
              <span className="px-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Totals</span>
              <button type="button" onClick={() => setIsStickyTotalsMinimized((minimized) => !minimized)} aria-pressed={!isStickyTotalsMinimized} className="workspace-secondary-btn px-3 py-2 text-xs"><ReceiptText className="h-3.5 w-3.5" />{isStickyTotalsMinimized ? 'Show totals' : 'Hide totals'}</button>
            </div>}

            {(onExportBillPdf || onExportBillExcel) && (
              <div className="flex flex-wrap items-center gap-1.5 rounded-app border border-slate-200/80 bg-slate-50/70 px-2 py-1.5 dark:border-slate-700 dark:bg-surface-800/60">
                <span className="px-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Export</span>
                {onExportBillPdf && (
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => { void onExportBillPdf(); }}
                    className="workspace-secondary-btn px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    PDF
                  </button>
                )}
                {onExportBillExcel && (
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => { void onExportBillExcel(); }}
                    className="workspace-secondary-btn px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    Excel
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedItemIds(new Set())}
              className="ml-auto inline-flex items-center gap-1.5 rounded-app-sm px-2.5 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-surface-800 dark:hover:text-red-300"
              title="Clear selected rows (Esc)"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
          </div>}
          <button
            type="button"
            aria-expanded={isSelectionDockOpen}
            aria-controls={isSelectionDockOpen ? 'bill-selection-actions' : undefined}
            aria-label={`${selectedBillItems.length} selected bill rows. ${isSelectionDockOpen ? 'Collapse' : 'Show'} actions`}
            onClick={() => setIsSelectionDockPinned((open) => !open)}
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-emerald-300 bg-white/95 px-4 py-2 text-xs font-semibold text-emerald-900 shadow-lg backdrop-blur-xl transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 dark:border-emerald-700 dark:bg-surface-900/95 dark:text-emerald-100"
          >
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-800 px-1 text-[11px] text-white">{selectedBillItems.length}</span>
            Selected rows
            {isSelectionDockOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
      {fieldEditor && <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/35 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFieldEditor(null); }}>
        <form role="dialog" aria-modal="true" aria-label="Edit bill row fields" className="flex h-[348px] max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-y-auto rounded-app border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-surface-900" onSubmit={(event) => { event.preventDefault(); saveFieldEditor(); }} onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); setFieldEditor(null); } }}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Edit {fieldEditor.item.type.toLowerCase().replaceAll('_', ' ')}</h3><p className="text-xs text-slate-500">Fields only · value updates automatically</p></div>
            <div className="flex items-center gap-1" aria-label="Bill row navigation">
              <button type="button" onClick={() => navigateFieldEditor(-1, true)} disabled={!previousFieldPriced} className="workspace-secondary-btn px-2 py-1 disabled:opacity-40" aria-label="Previous priced item" title="Previous priced item"><ChevronsLeft className="h-4 w-4" /></button>
              <button type="button" onClick={() => navigateFieldEditor(-1)} disabled={!previousFieldRow} className="workspace-secondary-btn px-2 py-1 disabled:opacity-40" aria-label="Previous bill row" title="Previous bill row"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" onClick={() => navigateFieldEditor(1)} disabled={!nextFieldRow} className="workspace-secondary-btn px-2 py-1 disabled:opacity-40" aria-label="Next bill row" title="Next bill row"><ChevronRight className="h-4 w-4" /></button>
              <button type="button" onClick={() => navigateFieldEditor(1, true)} disabled={!nextFieldPriced} className="workspace-secondary-btn px-2 py-1 disabled:opacity-40" aria-label="Next priced item" title="Next priced item"><ChevronsRight className="h-4 w-4" /></button>
              <button type="button" onClick={() => setFieldEditor(null)} aria-label="Close field editor" className="ml-1 rounded p-1 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[8rem_1fr]"><label className="text-xs text-slate-600">Reference<input autoFocus aria-label="Row reference" className="workspace-input mt-1 w-full" value={fieldEditor.reference} onChange={(event) => setFieldEditor({ ...fieldEditor, reference: event.target.value })} /></label><label className="text-xs text-slate-600">Description{fieldEditor.item.type === 'COMMENT' || fieldEditor.item.type === 'SUB_COMMENT' ? <textarea aria-label="Row description" className="workspace-input mt-1 h-28 w-full resize-none" value={fieldEditor.description} onChange={(event) => setFieldEditor({ ...fieldEditor, description: event.target.value })} /> : <input aria-label="Row description" className="workspace-input mt-1 w-full" value={fieldEditor.description} onChange={(event) => setFieldEditor({ ...fieldEditor, description: event.target.value })} />}</label></div>
          {PRICED_TYPES.has(fieldEditor.item.type) && <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"><label className="text-xs text-slate-600">Qty<input type="number" min="0" step="any" aria-label="Row quantity" className="workspace-input mt-1 w-full" value={fieldEditor.quantity} onChange={(event) => setFieldEditor({ ...fieldEditor, quantity: event.target.value })} /></label><label className="text-xs text-slate-600">Unit<input aria-label="Row unit" className="workspace-input mt-1 w-full" value={fieldEditor.unit} onChange={(event) => setFieldEditor({ ...fieldEditor, unit: event.target.value })} /></label><label className="text-xs text-slate-600">Rate (£)<input type="number" min="0" step="any" aria-label="Row rate" className="workspace-input mt-1 w-full" value={fieldEditor.rate} onChange={(event) => setFieldEditor({ ...fieldEditor, rate: event.target.value })} /></label><div className="text-xs text-slate-600">Value<div className="workspace-input mt-1 w-full bg-slate-50 font-semibold tabular-nums dark:bg-surface-800">{formatCurrency(safeMul(fieldEditorFields?.quantity || 0, fieldEditorFields?.rate || 0))}</div></div></div>}
          <label className="mt-2 block text-xs text-slate-600">Trade<select aria-label="Row trade" className="workspace-input mt-1 w-full" value={fieldEditor.tradePackageId} onChange={(event) => setFieldEditor({ ...fieldEditor, tradePackageId: event.target.value })}><option value="">Unassigned</option>{trades.map((trade) => <option key={trade.id} value={trade.id}>{trade.name}</option>)}</select></label>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4"><button type="button" onClick={() => { if (fieldEditorFields) onInlineRowUpdate?.(fieldEditor.item.id, fieldEditorFields, fieldEditor.sectionId, fieldEditor.pageId); openBillEditor(activeBill.id, fieldEditor.sectionId, { ...fieldEditor.item, ...fieldEditorFields }, undefined, fieldEditor.pageId); setFieldEditor(null); }} className="workspace-secondary-btn px-3 py-2 text-xs" aria-label="Open detailed item page"><Edit2 className="h-3.5 w-3.5" />Detailed item page</button><div className="flex gap-2"><button type="button" onClick={() => setFieldEditor(null)} className="workspace-secondary-btn px-3 py-2 text-xs">Cancel</button><button type="submit" className="workspace-primary-btn px-3 py-2 text-xs">Save fields</button></div></div>
        </form>
      </div>}
      {inlineDescriptionDraft && <input autoFocus data-bill-quick-control="true" aria-label="New bill line text" className="fixed z-[125] min-h-7 rounded border border-emerald-500 bg-white px-2 text-sm text-slate-900 shadow-lg outline-none dark:bg-surface-900 dark:text-slate-100" style={{ left: inlineDescriptionDraft.left, top: inlineDescriptionDraft.top, width: inlineDescriptionDraft.width }} defaultValue={inlineDescriptionDraft.text} onKeyDown={(event) => { event.stopPropagation(); if (event.key === 'Enter') { event.preventDefault(); onInlineDescriptionUpdate?.(inlineDescriptionDraft.itemId, event.currentTarget.value, inlineDescriptionDraft.sectionId, inlineDescriptionDraft.pageId); setInlineDescriptionDraft(null); window.requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-smoke=bill-workspace]")?.focus({ preventScroll: true })); } else if (event.key === 'Escape') { event.preventDefault(); setInlineDescriptionDraft(null); } }} onBlur={(event) => { onInlineDescriptionUpdate?.(inlineDescriptionDraft.itemId, event.currentTarget.value, inlineDescriptionDraft.sectionId, inlineDescriptionDraft.pageId); setInlineDescriptionDraft(null); }} />}
      {isQuickPaletteOpen && <section ref={quickPaletteRef} data-bill-quick-control="true" aria-label="Quick add bill lines" className="fixed z-[110] flex max-w-[calc(100vw-24px)] max-h-[calc(100vh-24px)] flex-col overflow-hidden rounded-app border border-emerald-300 bg-white shadow-2xl dark:border-emerald-800 dark:bg-surface-900" style={{ left: quickPalettePosition.left, top: quickPalettePosition.top, width: quickPaletteSize.width, height: quickPaletteSize.height }}>
        <div className="flex cursor-move touch-none items-center justify-between bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100" onPointerDown={startQuickPaletteDrag} onPointerMove={moveQuickPaletteDrag} onPointerUp={stopQuickPaletteDrag} onPointerCancel={stopQuickPaletteDrag}>
          <span>⠿ Quick add <span className="ml-1 font-normal">(drag to move)</span></span>
          <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => setIsQuickPaletteOpen(false)} aria-label="Close quick add" className="rounded p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900"><X className="h-4 w-4" /></button>
        </div>
        <div className="border-b border-slate-100 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">{paletteTarget}. Click another row to change the insertion point.</div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2 pb-4">
          {QUICK_LINE_TYPES.map(([type, label], index) => <div key={type} className="flex items-center gap-1 rounded-app-sm px-1 py-0.5 hover:bg-slate-50 dark:hover:bg-surface-800">
            <span className="min-w-0 flex-1 text-xs font-medium text-slate-700 dark:text-slate-200">{index + 1} · {label}</span>
            <button type="button" onClick={() => quickAddAt(type, paletteSectionId, palettePageId, paletteAnchorId, false)} className="rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:border-emerald-400 dark:border-slate-700 dark:text-slate-300" aria-label={`Add blank ${label}`}>Blank</button>
            <button type="button" onClick={() => quickAddAt(type, paletteSectionId, palettePageId, paletteAnchorId, true)} className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200" aria-label={`Name ${label}`}>Name…</button>
          </div>)}
        </div>
        <div role="separator" aria-label="Resize quick add" title="Drag to resize Quick add" tabIndex={0} className="absolute bottom-0 right-0 flex h-5 w-5 cursor-se-resize touch-none items-end justify-end pr-0.5 text-slate-400 hover:text-emerald-700" onPointerDown={startQuickPaletteResize} onPointerMove={moveQuickPaletteResize} onPointerUp={stopQuickPaletteResize} onPointerCancel={stopQuickPaletteResize}>↘</div>
      </section>}
      {quickEntry && <form data-bill-quick-control="true" role="dialog" aria-label="Add and name bill line" className="fixed left-1/2 top-1/2 z-[130] w-[min(440px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-app border border-emerald-400 bg-white p-4 shadow-2xl dark:bg-surface-900" onSubmit={(event) => { event.preventDefault(); saveQuickEntry(); }} onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); setQuickEntry(null); } }}>
        <div className="mb-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">Add {QUICK_LINE_TYPES.find(([type]) => type === quickEntry.type)?.[1] || 'bill line'} with text</div>
        {!quickEntry.type && <select autoFocus aria-label="New bill line type" className="workspace-input mb-1 w-full" value="" onChange={(event) => setQuickEntry({ ...quickEntry, type: event.target.value as ItemType })}><option value="" disabled>Choose line type</option>{QUICK_LINE_TYPES.map(([type, label]) => <option key={type} value={type}>{label}</option>)}</select>}
        <div className="flex gap-1"><input key={quickEntry.type || 'choose'} autoFocus={Boolean(quickEntry.type)} value={quickEntryText} onChange={(event) => setQuickEntryText(event.target.value)} className="workspace-input min-w-0 flex-1" placeholder={`Type ${QUICK_LINE_TYPES.find(([type]) => type === quickEntry.type)?.[1] || 'line'} text…`} aria-label="New bill line description" /><button type="submit" disabled={!quickEntry.type || !quickEntryText.trim()} className="workspace-primary-btn px-2 py-1 text-xs disabled:opacity-40">Add</button><button type="button" onClick={() => setQuickEntry(null)} className="workspace-secondary-btn px-2 py-1 text-xs">Cancel</button></div>
      </form>}
      {(standardsDragActive || pointerDraggedItemState || draggedItemState) && (
        <div role="status" className="pointer-events-none fixed bottom-5 left-1/2 z-[110] -translate-x-1/2 rounded-app border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-lg dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200">{standardsDragActive ? LIBRARY_DROP_HINT : ROW_DROP_HINT}</div>
      )}
      {standardsDropNotice && <div role="status" className="fixed bottom-5 right-5 z-[110] flex max-w-sm items-center gap-3 rounded-app border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow-lg"><span>{standardsDropNotice}</span><button type="button" onClick={() => setStandardsDropNotice(null)} aria-label="Dismiss Standards drop notice"><X className="h-4 w-4" /></button></div>}
      {aiRateTargets && onApplyLiveRates && <BillAiRateDialog targets={aiRateTargets} onApply={onApplyLiveRates} onClose={() => setAiRateTargets(null)} />}
      {standardsDropState && (
        <StandardsDropOptionsDialog
          state={standardsDropState}
          onClose={() => setStandardsDropState(null)}
          onConfirm={confirmStandardsDrop}
        />
      )}
      <ContextMenu state={workspaceContextMenu} onClose={() => setWorkspaceContextMenu(null)} />
    </div>
  );
};
