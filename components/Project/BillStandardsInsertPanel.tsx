import React from 'react';
import { Check, ChevronDown, ChevronRight, FolderTree, GripVertical, Library, ListTree, Loader2, Maximize2, PanelLeft, PanelRight, Pin, Search, SlidersHorizontal, X } from 'lucide-react';
import type { BoQBill, BoQItem, ItemLibrary, LibraryFolder, LibraryInsertDestination, LibraryInsertMode, LibraryInsertPlacement, LibrarySection } from '../../types';
import { listLibraryItemContext, listLibraryItemOutline, listLibraryItems, listLibraryItemsInPositionRange, listLibraryRootHeadings, searchLibraryItems } from '../../utils/libraryRepository';
import type { LibraryItemOutlineRow, LibraryRootHeadingRow } from '../../utils/libraryRepository';
import {
  buildBillItemsFromLibraryInsert,
  getParentContextItems,
  beginLibraryInsertDrag,
  clearLibraryInsertDrag,
  dispatchLibraryInsertPointerDrop,
  getLibraryInsertModeLabel,
  type LibraryInsertDragPayload,
} from '../../utils/libraryInsert';
import {
  flattenLibrarySectionsWithDepth,
  formatOrderedLabel,
  getLibraryHeadingLevel,
  getLibraryItemReference,
  isLibraryHeadingType,
  normalizeLibraryLabel,
  PRICED_TYPES,
  sortLibrarySections,
} from '../../utils/libraryViewModel';
import { stripRichText } from '../../utils/richText';
import { isBillInsertDestinationValid, resolveHighlightedRow, LIBRARY_DROP_HINT } from '../../utils/billPlacement';
import { formatCurrency } from '../../utils/formatting';

type Destination = {
  key: string;
  label: string;
  sectionId?: string;
  pageId?: string | null;
  items: BoQItem[];
};

type BillStandardsInsertPanelProps = {
  activeBill: BoQBill;
  activeItemId?: string | null;
  libraries: ItemLibrary[];
  selectedItemIds: Set<string>;
  selectedSectionId?: string | null;
  onClose: () => void;
  onInsert: (items: BoQItem[], destination: LibraryInsertDestination) => void;
  onOpenFullLibrary: () => void;
};

function flattenSections(folder: LibraryFolder | null) {
  return flattenLibrarySectionsWithDepth(sortLibrarySections(folder?.sections || []));
}

function headingKey(value: string) {
  return stripRichText(value).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');
}

function headingWithoutSectionRef(value: string, section: LibrarySection) {
  const label = stripRichText(value).trim();
  const ref = section.orderRef?.trim();
  if (!ref || !label.toLowerCase().startsWith(ref.toLowerCase())) return label;
  const suffix = label.slice(ref.length);
  return /^[\s:.,–—-]/.test(suffix) ? suffix.replace(/^[\s:.,–—-]+/, '').trim() : label;
}

function isRepeatedFolderHeading(root: LibraryRootHeadingRow, folder: LibraryFolder) {
  return headingKey(root.description) === headingKey(formatOrderedLabel(folder.orderRef, folder.name, 'Folder'))
    || headingKey(root.description) === headingKey(folder.name);
}

function isRepeatedRootHeading(root: LibraryRootHeadingRow, folder: LibraryFolder, section: LibrarySection) {
  return isRepeatedFolderHeading(root, folder)
    || headingKey(root.description) === headingKey(formatOrderedLabel(section.orderRef, section.name, 'Section'))
    || headingKey(root.description) === headingKey(section.name);
}

function isRepeatedSectionHeading(row: LibraryItemOutlineRow, section: LibrarySection) {
  return row.type === 'MAJOR_HEADING'
    && headingKey(headingWithoutSectionRef(row.description, section)) === headingKey(section.name);
}

function destinationKey(sectionId?: string, pageId?: string | null) {
  return `${sectionId || '__bill__'}::${pageId || '__direct__'}`;
}

function buildDestinations(activeBill: BoQBill): Destination[] {
  if (!activeBill.sections.length) {
    return [{ key: destinationKey(), label: `${activeBill.name} - bill level`, items: activeBill.items || [] }];
  }

  return activeBill.sections.flatMap((section, sectionIndex) => {
    if (section.pages?.length) {
      return section.pages.map((page, pageIndex) => ({
        key: destinationKey(section.id, page.id),
        label: `Section ${sectionIndex + 1} / Page ${pageIndex + 1}: ${page.name || 'Unnamed page'}`,
        sectionId: section.id,
        pageId: page.id,
        items: page.items || [],
      }));
    }

    return [{
      key: destinationKey(section.id),
      label: `Section ${sectionIndex + 1}: ${section.name}`,
      sectionId: section.id,
      pageId: null,
      items: section.items || [],
    }];
  });
}

const INSERT_MODES: LibraryInsertMode[] = [
  'ITEM_ONLY',
  'WITH_MISSING_PARENTS',
  'FROM_HEADING',
  'FROM_COMMENT',
  'FULL_SECTION',
];

const DEFAULT_PANEL_SIZE = { width: 460, height: 620 };
const MIN_PANEL_SIZE = { width: 400, height: 440 };
const MAX_DRAG_RANGE_ROWS = 5000;

function clampSize(size: { width: number; height: number }) {
  if (typeof window === 'undefined') return size;
  return {
    width: Math.min(Math.max(MIN_PANEL_SIZE.width, size.width), Math.max(MIN_PANEL_SIZE.width, window.innerWidth - 32)),
    height: Math.min(Math.max(MIN_PANEL_SIZE.height, size.height), Math.max(MIN_PANEL_SIZE.height, window.innerHeight - 32)),
  };
}

function defaultPosition(size = DEFAULT_PANEL_SIZE) {
  if (typeof window === 'undefined') return { x: 96, y: 96 };
  return {
    x: Math.max(16, window.innerWidth - size.width - 32),
    y: 96,
  };
}

function clampPosition(position: { x: number; y: number }, size: { width: number; height: number }) {
  if (typeof window === 'undefined') return position;
  return {
    x: Math.min(Math.max(16, position.x), Math.max(16, window.innerWidth - size.width - 16)),
    y: Math.min(Math.max(16, position.y), Math.max(16, window.innerHeight - size.height - 16)),
  };
}

function getInsertModeDetail(mode: LibraryInsertMode) {
  switch (mode) {
    case 'ITEM_ONLY':
      return 'Use this when you only want the exact row you clicked or dragged.';
    case 'WITH_MISSING_PARENTS':
      return 'Best for priced items: keeps the bill readable without duplicating existing headings.';
    case 'FROM_HEADING':
      return 'Use this when a heading represents a useful block of standards content.';
    case 'FROM_COMMENT':
      return 'Use this when the comment is the starting point for related rows below it.';
    case 'FULL_SECTION':
      return 'Use this only when you want the whole currently loaded section/page scope.';
    default:
      return '';
  }
}

function getInsertModePlainTitle(mode: LibraryInsertMode) {
  switch (mode) {
    case 'ITEM_ONLY':
      return 'Selected row only';
    case 'WITH_MISSING_PARENTS':
      return 'Priced item with missing headings';
    case 'FROM_HEADING':
      return 'Heading plus rows below';
    case 'FROM_COMMENT':
      return 'Comment plus rows below';
    case 'FULL_SECTION':
      return 'Whole loaded section/page';
    default:
      return getLibraryInsertModeLabel(mode);
  }
}

function getInsertModeResult(mode: LibraryInsertMode) {
  switch (mode) {
    case 'ITEM_ONLY':
      return 'Inserts 1 row.';
    case 'WITH_MISSING_PARENTS':
      return 'Inserts the item and any missing parent headings.';
    case 'FROM_HEADING':
      return 'Inserts the heading and its loaded child rows.';
    case 'FROM_COMMENT':
      return 'Inserts the comment and loaded related rows below.';
    case 'FULL_SECTION':
      return 'Inserts every row in the current loaded scope.';
    default:
      return '';
  }
}

function getStandardsRowTypeLabel(item: Pick<BoQItem, 'type'>) {
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

function getHeadingRangeCount(row: LibraryItemOutlineRow) {
  if (row.childEndPosition == null) return null;
  return Math.max(0, row.childEndPosition - row.position);
}

function getPreviewIndent(item: BoQItem) {
  if (PRICED_TYPES.has(item.type)) return 42;
  if (item.type === 'COMMENT') return 28;
  if (item.type === 'SUB_COMMENT') return 38;
  if (isLibraryHeadingType(item.type)) return Math.min(8 + (getLibraryHeadingLevel(item.type) - 1) * 12, 48);
  return 24;
}

function getInsertModeUnavailableReason(mode: LibraryInsertMode) {
  switch (mode) {
    case 'FROM_HEADING':
      return 'Select a heading row first.';
    case 'FROM_COMMENT':
      return 'Select a comment row first.';
    case 'FULL_SECTION':
      return 'Choose a loaded library section first.';
    default:
      return 'Select a library row first.';
  }
}

function summariseInsertRows(items: BoQItem[]) {
  return items.reduce(
    (summary, item) => {
      if (PRICED_TYPES.has(item.type)) summary.priced += 1;
      else if (isCommentLike(item)) summary.comments += 1;
      else if (isLibraryHeadingType(item.type)) summary.headings += 1;
      else summary.other += 1;
      return summary;
    },
    { priced: 0, headings: 0, comments: 0, other: 0 },
  );
}

function isCommentLike(item: Pick<BoQItem, 'type'>) {
  return item.type === 'COMMENT' || item.type === 'SUB_COMMENT';
}

function getRowBadge(item: BoQItem) {
  if (PRICED_TYPES.has(item.type)) {
    return {
      label: item.type === 'EXTRA_OVER_ITEM' ? 'Extra' : item.type === 'PROVISIONAL_SUM' ? 'PS' : item.type === 'PC_SUM' ? 'PC' : 'Item',
      classes: 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300',
    };
  }
  if (isCommentLike(item)) {
    return {
      label: item.type === 'SUB_COMMENT' ? 'Sub-comment' : 'Comment',
      classes: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200',
    };
  }
  if (isLibraryHeadingType(item.type)) {
    const headingLabel = item.type === 'GENERAL_HEADING'
      ? 'H1'
      : item.type === 'MAJOR_HEADING'
        ? 'H2'
        : item.type === 'SUB_SECTION'
          ? 'H3'
          : item.type === 'MINOR_HEADING'
            ? 'H4'
            : `L${getLibraryHeadingLevel(item.type)}`;
    return {
      label: headingLabel,
      classes: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-surface-800 dark:text-slate-300',
    };
  }
  return {
    label: item.type,
    classes: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-surface-800 dark:text-slate-300',
  };
}

function getReadableRowTone(item: BoQItem, isSelected: boolean, nested?: boolean) {
  if (isSelected) {
    return {
      row: 'bg-slate-100 text-slate-950 ring-1 ring-inset ring-slate-200 dark:bg-surface-800 dark:text-slate-100 dark:ring-slate-700',
      ref: 'text-slate-600 dark:text-slate-300',
      description: 'font-semibold text-slate-950 dark:text-slate-100',
      meta: 'text-slate-500 dark:text-slate-400',
    };
  }
  if (isLibraryHeadingType(item.type)) {
    return {
      row: `border-l-4 border-l-slate-300 bg-white hover:bg-slate-50 dark:border-l-slate-600 dark:bg-surface-900 dark:hover:bg-surface-800 ${nested ? 'bg-slate-50/70 dark:bg-surface-900' : ''}`,
      ref: 'text-slate-500 dark:text-slate-400',
      description: 'font-semibold text-slate-950 dark:text-slate-50',
      meta: 'text-slate-500 dark:text-slate-400',
    };
  }
  if (isCommentLike(item)) {
    return {
      row: `border-l-4 border-l-amber-400 bg-amber-50/35 hover:bg-amber-50 dark:bg-amber-950/12 dark:hover:bg-amber-950/24 ${nested ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''}`,
      ref: 'text-amber-700 dark:text-amber-300',
      description: 'font-medium italic text-slate-700 dark:text-slate-200',
      meta: 'text-amber-700/75 dark:text-amber-200/75',
    };
  }
  if (PRICED_TYPES.has(item.type)) {
    return {
      row: `border-l-4 border-l-slate-300 bg-white hover:bg-slate-50 dark:border-l-slate-700 dark:bg-surface-900 dark:hover:bg-surface-800 ${nested ? 'bg-white/70 dark:bg-surface-900/70' : ''}`,
      ref: 'text-slate-500 dark:text-slate-400',
      description: 'font-medium text-slate-800 dark:text-slate-100',
      meta: 'text-slate-400 dark:text-slate-500',
    };
  }
  return {
    row: `border-l-4 border-l-slate-200 bg-white hover:bg-slate-50 dark:border-l-slate-700 dark:bg-surface-900 dark:hover:bg-surface-800 ${nested ? 'bg-white/70 dark:bg-surface-900/70' : ''}`,
    ref: 'text-slate-500 dark:text-slate-400',
    description: 'font-medium text-slate-800 dark:text-slate-100',
    meta: 'text-slate-400 dark:text-slate-500',
  };
}

function shouldConfirmStandardsInsert(mode: LibraryInsertMode, rows: BoQItem[]) {
  if (rows.length > 20) return true;
  return mode === 'FROM_HEADING' || mode === 'FROM_COMMENT' || mode === 'FULL_SECTION';
}

export function BillStandardsInsertPanel({
  activeBill,
  activeItemId,
  libraries,
  selectedItemIds,
  selectedSectionId,
  onClose,
  onInsert,
  onOpenFullLibrary,
}: BillStandardsInsertPanelProps) {
  const initialSize = React.useMemo(() => clampSize(DEFAULT_PANEL_SIZE), []);
  const [panelSize, setPanelSize] = React.useState(initialSize);
  const [panelPosition, setPanelPosition] = React.useState(() => clampPosition(defaultPosition(initialSize), initialSize));
  const [isFloating, setIsFloating] = React.useState(() => {
    try { return window.localStorage.getItem('qs-standards-panel-mode') !== 'docked'; } catch { return true; }
  });
  const [dockSide, setDockSide] = React.useState<'left' | 'right'>(() => {
    try { return window.localStorage.getItem('qs-standards-panel-side') === 'left' ? 'left' : 'right'; } catch { return 'right'; }
  });
  const [isDraggingPanel, setIsDraggingPanel] = React.useState(false);
  const [isResizingPanel, setIsResizingPanel] = React.useState(false);
  const [insertDragPreview, setInsertDragPreview] = React.useState<{
    label: string;
    modeLabel: string;
    rowCount: number;
    x: number;
    y: number;
  } | null>(null);
  const dragOffsetRef = React.useRef({ x: 0, y: 0 });
  const pointerInsertDragRef = React.useRef<{
    payload: LibraryInsertDragPayload;
    payloadPromise?: Promise<LibraryInsertDragPayload>;
    startX: number;
    startY: number;
    hasMoved: boolean;
  } | null>(null);
  const previewCountCacheRef = React.useRef<{ key: string; count: number } | null>(null);
  const headingRangeCacheRef = React.useRef<Map<string, BoQItem[]>>(new Map());
  const suppressNextRowClickRef = React.useRef(false);
  const resizeStartRef = React.useRef({
    mouseX: 0,
    mouseY: 0,
    width: initialSize.width,
    height: initialSize.height,
    mode: 'floating-corner' as 'floating-corner' | 'docked-left' | 'docked-right',
  });
  const sortedLibraries = React.useMemo(() => [...libraries].sort((a, b) => {
    if (Boolean(a.favorite) !== Boolean(b.favorite)) return a.favorite ? -1 : 1;
    return normalizeLibraryLabel(a.name, 'Library').localeCompare(normalizeLibraryLabel(b.name, 'Library'));
  }), [libraries]);
  const [libraryId, setLibraryId] = React.useState(sortedLibraries[0]?.id || '');
  const activeLibrary = sortedLibraries.find((library) => library.id === libraryId) || null;
  const [folderId, setFolderId] = React.useState(activeLibrary?.folders[0]?.id || '');
  const activeFolder = activeLibrary?.folders.find((folder) => folder.id === folderId) || null;
  const sectionOptions = React.useMemo(() => flattenSections(activeFolder), [activeFolder]);
  const [sectionId, setSectionId] = React.useState(sectionOptions[0]?.section.id || '');
  const activeSection = sectionOptions.find((entry) => entry.section.id === sectionId)?.section || null;
  const [pageId, setPageId] = React.useState<string>('');
  const [query, setQuery] = React.useState('');
  const [items, setItems] = React.useState<BoQItem[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [outlineRows, setOutlineRows] = React.useState<LibraryItemOutlineRow[]>([]);
  const [rootHeadings, setRootHeadings] = React.useState<LibraryRootHeadingRow[]>([]);
  const [isRootLoading, setIsRootLoading] = React.useState(false);
  const [rootLoadError, setRootLoadError] = React.useState<string | null>(null);
  const [browseScope, setBrowseScope] = React.useState<'library' | 'section'>('library');
  const [openFolderIds, setOpenFolderIds] = React.useState<Set<string>>(new Set());
  const [openSectionIds, setOpenSectionIds] = React.useState<Set<string>>(new Set());
  const [openPageIds, setOpenPageIds] = React.useState<Set<string>>(new Set());
  const [activeRootHeadingId, setActiveRootHeadingId] = React.useState<string | null>(null);
  const [expandedOutlineId, setExpandedOutlineId] = React.useState<string | null>(null);
  const [openHeadingIds, setOpenHeadingIds] = React.useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = React.useState<BoQItem[]>([]);
  const [expandedTotalCount, setExpandedTotalCount] = React.useState(0);
  const [isRangeLoading, setIsRangeLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [selectedLibraryItemId, setSelectedLibraryItemId] = React.useState<string | null>(null);
  const [insertMode, setInsertMode] = React.useState<LibraryInsertMode>('WITH_MISSING_PARENTS');
  const [resolvedContext, setResolvedContext] = React.useState<{ itemId: string; items: BoQItem[] } | null>(null);
  const [contextError, setContextError] = React.useState<string | null>(null);
  const [insertError, setInsertError] = React.useState<string | null>(null);
  const [keepPanelOpen, setKeepPanelOpen] = React.useState(true);
  const [showLibraryScope, setShowLibraryScope] = React.useState(false);
  const [showBrowseRows, setShowBrowseRows] = React.useState(true);
  const [showInsertOptions, setShowInsertOptions] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [showLibraryPicker, setShowLibraryPicker] = React.useState(false);
  const [pendingInsertPlan, setPendingInsertPlan] = React.useState<{
    rows: BoQItem[];
    mode: LibraryInsertMode;
    destinationLabel: string;
    placementLabel: string;
    destination: LibraryInsertDestination;
  } | null>(null);
  const destinations = React.useMemo(() => buildDestinations(activeBill), [activeBill]);
  const defaultDestinationKey = React.useMemo(() => {
    const selectedDestination = destinations.find((destination) => (
      destination.items.some((item) => selectedItemIds.has(item.id))
    ));
    if (selectedDestination) return selectedDestination.key;
    if (selectedItemIds.size === 0 && activeItemId) {
      const activeDestination = destinations.find((destination) => destination.items.some((item) => item.id === activeItemId));
      if (activeDestination) return activeDestination.key;
    }
    const preferred = destinationKey(selectedSectionId || undefined);
    return destinations.some((destination) => destination.key === preferred) ? preferred : destinations[0]?.key || '';
  }, [activeItemId, destinations, selectedItemIds, selectedSectionId]);
  const [destinationValue, setDestinationValue] = React.useState(defaultDestinationKey);
  const [placement, setPlacement] = React.useState<LibraryInsertPlacement>('BOTTOM');
  const latestDestinationRef = React.useRef({ activeBill, onInsert });
  latestDestinationRef.current = { activeBill, onInsert };

  const librarySectionById = React.useMemo(() => new Map(
    (activeLibrary?.folders || []).flatMap((folder) => flattenSections(folder).map(({ section }) => [section.id, section] as const)),
  ), [activeLibrary]);
  const implicitFolderRoot = browseScope === 'library' && activeFolder && activeRootHeadingId
    ? rootHeadings.find((root) => root.id === activeRootHeadingId && root.sectionId === sectionId && !root.pageId
      && rootHeadings.filter((candidate) => candidate.sectionId === sectionId && !candidate.pageId).length === 1
      && activeSection && isRepeatedRootHeading(root, activeFolder, activeSection))
    : null;
  const hidesImplicitFolderRoot = Boolean(implicitFolderRoot);

  React.useEffect(() => {
    setActiveRootHeadingId(null);
    setOpenFolderIds(new Set());
    setOpenSectionIds(new Set());
    setOpenPageIds(new Set());
    setRootHeadings([]);
    if (!activeLibrary) return;
    let cancelled = false;
    const sectionRank = new Map<string, number>(activeLibrary.folders.flatMap((folder, folderIndex) =>
      flattenSections(folder).map(({ section }, sectionIndex): [string, number] => [section.id, folderIndex * 10000 + sectionIndex])));
    setIsRootLoading(true);
    setRootLoadError(null);
    void listLibraryRootHeadings(activeLibrary.id).then((rows) => {
      if (!cancelled) setRootHeadings([...rows].sort((a, b) =>
        (sectionRank.get(a.sectionId) ?? Number.MAX_SAFE_INTEGER) - (sectionRank.get(b.sectionId) ?? Number.MAX_SAFE_INTEGER)
          || a.position - b.position));
    }).catch((error) => {
      if (cancelled) return;
      const fallback = activeLibrary.folders.flatMap((folder) => flattenSections(folder).flatMap(({ section }) => {
        const scopes = [{ pageId: null as string | null, items: section.items as BoQItem[] },
          ...(section.pages || []).map((page) => ({ pageId: page.id, items: page.items as BoQItem[] }))];
        return scopes.flatMap(({ pageId: sourcePageId, items: sourceItems }) => sourceItems.flatMap((item, position) => {
          if (item.type !== 'GENERAL_HEADING') return [];
          const nextH1 = sourceItems.findIndex((next, nextPosition) => nextPosition > position && next.type === 'GENERAL_HEADING');
          return [{ ...item, id: item.id || `${section.id}:${sourcePageId || 'direct'}:${position}`, position,
            childEndPosition: nextH1 < 0 ? null : nextH1, folderId: folder.id,
            folderOrderRef: folder.orderRef, folderName: folder.name, sectionId: section.id,
            sectionOrderRef: section.orderRef, sectionName: section.name, pageId: sourcePageId } as LibraryRootHeadingRow];
        }));
      }));
      setRootHeadings(fallback);
      if (fallback.length === 0) setRootLoadError(error instanceof Error ? error.message : 'Could not load library H1 headings.');
    }).finally(() => { if (!cancelled) setIsRootLoading(false); });
    return () => { cancelled = true; };
  }, [activeLibrary]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem('qs-standards-panel-mode', isFloating ? 'floating' : 'docked');
      window.localStorage.setItem('qs-standards-panel-side', dockSide);
    } catch { /* Keep docking available when storage is disabled. */ }
  }, [dockSide, isFloating]);

  React.useEffect(() => {
    if (!isFloating || !isDraggingPanel) return undefined;
    const handleMove = (event: MouseEvent) => {
      setPanelPosition(clampPosition({
        x: event.clientX - dragOffsetRef.current.x,
        y: event.clientY - dragOffsetRef.current.y,
      }, panelSize));
    };
    const handleUp = () => setIsDraggingPanel(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDraggingPanel, isFloating, panelSize]);

  React.useEffect(() => {
    if (!isResizingPanel) return undefined;
    const handleMove = (event: MouseEvent) => {
      const nextSize = resizeStartRef.current.mode === 'docked-left'
        ? clampSize({
            width: resizeStartRef.current.width + (resizeStartRef.current.mouseX - event.clientX),
            height: resizeStartRef.current.height,
          })
        : clampSize({
            width: resizeStartRef.current.width + (event.clientX - resizeStartRef.current.mouseX),
            height: resizeStartRef.current.height + (resizeStartRef.current.mode === 'floating-corner' ? event.clientY - resizeStartRef.current.mouseY : 0),
          });
      setPanelSize(nextSize);
      if (resizeStartRef.current.mode === 'floating-corner') {
        setPanelPosition((current) => clampPosition(current, nextSize));
      }
    };
    const handleUp = () => setIsResizingPanel(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isResizingPanel]);

  React.useEffect(() => {
    if (isFloating) return;
    setIsDraggingPanel(false);
    setIsResizingPanel(false);
  }, [isFloating]);

  React.useEffect(() => {
    headingRangeCacheRef.current.clear();
  }, [activeSection?.id, pageId]);

  React.useEffect(() => {
    setLibraryId((current) => sortedLibraries.some((library) => library.id === current) ? current : sortedLibraries[0]?.id || '');
  }, [sortedLibraries]);

  React.useEffect(() => {
    setFolderId((current) => activeLibrary?.folders.some((folder) => folder.id === current) ? current : activeLibrary?.folders[0]?.id || '');
  }, [activeLibrary]);

  React.useEffect(() => {
    setSectionId((current) => sectionOptions.some((entry) => entry.section.id === current) ? current : sectionOptions[0]?.section.id || '');
  }, [sectionOptions]);

  React.useEffect(() => {
    setPageId((current) => activeSection?.pages?.some((page) => page.id === current) ? current : '');
  }, [activeSection]);

  React.useEffect(() => {
    setDestinationValue((current) => destinations.some((destination) => destination.key === current) ? current : defaultDestinationKey);
  }, [defaultDestinationKey, destinations]);
  React.useEffect(() => { setDestinationValue(defaultDestinationKey); }, [activeBill.id, defaultDestinationKey]);

  React.useEffect(() => {
    if (browseScope !== 'library' || query.trim() || pageId || activeRootHeadingId || isRootLoading
      || !activeFolder || !activeSection || !openFolderIds.has(activeFolder.id) || !openSectionIds.has(activeSection.id)) return;
    const sectionRoots = rootHeadings.filter((root) => root.sectionId === activeSection.id && !root.pageId);
    if (sectionRoots.length === 1 && isRepeatedRootHeading(sectionRoots[0], activeFolder, activeSection)) {
      setActiveRootHeadingId(sectionRoots[0].id);
    }
  }, [activeFolder, activeRootHeadingId, activeSection, browseScope, isRootLoading, openFolderIds, openSectionIds, pageId, query, rootHeadings]);

  React.useEffect(() => {
    if (browseScope === 'library' && !activeRootHeadingId && !query.trim()) {
      setItems([]);
      setTotalCount(0);
      setOutlineRows([]);
      setExpandedOutlineId(null);
      setOpenHeadingIds(new Set());
      setExpandedItems([]);
      setSelectedLibraryItemId(null);
      return;
    }
    if (!activeSection) {
      setItems([]);
      setTotalCount(0);
      setOutlineRows([]);
      setExpandedOutlineId(null);
      setOpenHeadingIds(new Set());
      setExpandedItems([]);
      setExpandedTotalCount(0);
      setSelectedLibraryItemId(null);
      return;
    }
    let cancelled = false;
    const search = query.trim();
    setIsLoading(true);
    setLoadError(null);

    if (!search) {
      setExpandedOutlineId(null);
      setOpenHeadingIds(new Set());
      setExpandedItems([]);
      setExpandedTotalCount(0);
      void listLibraryItemOutline({
        sectionId: activeSection.id,
        pageId: pageId || undefined,
      })
        .then((result) => {
          if (cancelled) return;
          const headingRows = result.items.filter((item) => !isCommentLike(item));
          setOutlineRows(result.items);
          setItems(headingRows);
          setTotalCount(result.totalCount);
          const rootMatches = browseScope === 'library' && rootHeadings.some((row) => row.id === activeRootHeadingId
            && row.sectionId === activeSection.id && (row.pageId || '') === pageId);
          const openedRoot = rootMatches ? result.items.find((row) => row.id === activeRootHeadingId) : null;
          const openIds = new Set(openedRoot ? [openedRoot.id] : []);
          if (openedRoot && hidesImplicitFolderRoot) result.items.filter((row) => row.position > openedRoot.position
            && (openedRoot.childEndPosition == null || row.position < openedRoot.childEndPosition)
            && isRepeatedSectionHeading(row, activeSection)).forEach((row) => openIds.add(row.id));
          setOpenHeadingIds(openIds);
          setExpandedOutlineId(openedRoot?.id || null);
          setSelectedLibraryItemId(openedRoot && !hidesImplicitFolderRoot ? openedRoot.id : null);
        })
        .catch((error) => {
          if (cancelled) return;
          const fallbackItems = pageId
            ? activeSection.pages?.find((page) => page.id === pageId)?.items || []
            : activeSection.items || [];
          const fallbackOutline = fallbackItems.flatMap((item, position) => (
            isLibraryHeadingType(item.type) && !isCommentLike(item)
              ? [{ ...item, position, childEndPosition: null } as LibraryItemOutlineRow]
              : []
          )).map((item, index, headings) => ({
            ...item,
            childEndPosition: headings.slice(index + 1).find((candidate) => getLibraryHeadingLevel(candidate.type) <= getLibraryHeadingLevel(item.type))?.position ?? null,
          }));
          setOutlineRows(fallbackOutline);
          setItems(fallbackOutline);
          setTotalCount(fallbackOutline.length);
          const openedRoot = browseScope === 'library'
            ? fallbackOutline.find((row) => row.id === activeRootHeadingId)
            : null;
          const openIds = new Set(openedRoot ? [openedRoot.id] : []);
          if (openedRoot && hidesImplicitFolderRoot) fallbackOutline.filter((row) => row.position > openedRoot.position
            && (openedRoot.childEndPosition == null || row.position < openedRoot.childEndPosition)
            && isRepeatedSectionHeading(row, activeSection)).forEach((row) => openIds.add(row.id));
          setOpenHeadingIds(openIds);
          setExpandedOutlineId(openedRoot?.id || null);
          setSelectedLibraryItemId(openedRoot && !hidesImplicitFolderRoot ? openedRoot.id : null);
          setLoadError(error instanceof Error ? error.message : 'Could not load library outline.');
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }

    setOutlineRows([]);
    setExpandedOutlineId(null);
    setOpenHeadingIds(new Set());
    setExpandedItems([]);
    setExpandedTotalCount(0);
    // Searching is intentionally library-wide: choosing the folder and section
    // first makes a simple "add an item" action needlessly hard.
    void searchLibraryItems({
      libraryId,
      query: search,
      includeLibrary: true,
      includeFolder: false,
      includeSection: false,
      limit: 250,
    })
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setTotalCount(result.totalCount);
        setSelectedLibraryItemId((current) => result.items.some((item) => item.id === current) ? current : result.items[0]?.id || null);
      })
      .catch((error) => {
        if (cancelled) return;
        const fallbackItems = pageId
          ? activeSection.pages?.find((page) => page.id === pageId)?.items || []
          : activeSection.items || [];
        setItems(fallbackItems);
        setTotalCount(fallbackItems.length);
        setSelectedLibraryItemId(fallbackItems[0]?.id || null);
        setLoadError(error instanceof Error ? error.message : 'Could not load library rows.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSection, activeRootHeadingId, browseScope, hidesImplicitFolderRoot, libraryId, pageId, query, rootHeadings]);

  React.useEffect(() => {
    const activeOutlineRow = outlineRows.find((row) => row.id === expandedOutlineId);
    if (!activeSection || !activeOutlineRow || query.trim()) return undefined;
    let cancelled = false;
    setIsRangeLoading(true);
    setLoadError(null);
    void listLibraryItemsInPositionRange({
      sectionId: activeSection.id,
      pageId: pageId || undefined,
      startPosition: activeOutlineRow.position,
      endPosition: activeOutlineRow.childEndPosition ?? undefined,
      offset: 0,
      limit: MAX_DRAG_RANGE_ROWS,
    })
      .then((result) => {
        if (cancelled) return;
        setExpandedItems(result.items);
        setExpandedTotalCount(result.totalCount);
        if (result.totalCount <= result.items.length) {
          headingRangeCacheRef.current.set(`${activeSection.id}::${pageId || '__direct__'}::${activeOutlineRow.position}::${activeOutlineRow.childEndPosition ?? 'end'}`, result.items);
        }
        setSelectedLibraryItemId((current) => result.items.some((item) => item.id === current)
          ? current : hidesImplicitFolderRoot && activeOutlineRow.id === activeRootHeadingId ? null : activeOutlineRow.id);
      })
      .catch((error) => {
        if (cancelled) return;
        const memoryItems = pageId
          ? activeSection.pages?.find((page) => page.id === pageId)?.items || []
          : activeSection.items || [];
        const fallbackItems = memoryItems.slice(activeOutlineRow.position, activeOutlineRow.childEndPosition ?? undefined);
        const rangeItems = fallbackItems.length > 0 ? fallbackItems : [activeOutlineRow];
        setExpandedItems(rangeItems);
        setExpandedTotalCount(rangeItems.length);
        headingRangeCacheRef.current.set(`${activeSection.id}::${pageId || '__direct__'}::${activeOutlineRow.position}::${activeOutlineRow.childEndPosition ?? 'end'}`, rangeItems);
        setSelectedLibraryItemId(hidesImplicitFolderRoot && activeOutlineRow.id === activeRootHeadingId ? null : activeOutlineRow.id);
        setLoadError(error instanceof Error ? error.message : 'Could not load heading rows.');
      })
      .finally(() => {
        if (!cancelled) setIsRangeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeRootHeadingId, activeSection, expandedOutlineId, hidesImplicitFolderRoot, outlineRows, pageId, query]);

  const isOutlineMode = !query.trim();
  const cachedSelectedRange = isOutlineMode && selectedLibraryItemId
    ? (Array.from(headingRangeCacheRef.current.values()) as BoQItem[][]).find((range) => range.some((item) => item.id === selectedLibraryItemId))
    : undefined;
  const insertSourceItems = isOutlineMode
    ? (expandedItems.some((item) => item.id === selectedLibraryItemId) ? expandedItems : cachedSelectedRange || items)
    : items;
  const selectedLibraryItem = insertSourceItems.find((item) => item.id === selectedLibraryItemId) || null;
  React.useEffect(() => {
    setResolvedContext(null);
    setContextError(null);
    if (!selectedLibraryItem || !PRICED_TYPES.has(selectedLibraryItem.type) || !activeSection) return;
    let cancelled = false;
    const memoryItems = pageId
      ? activeSection.pages?.find((page) => page.id === pageId)?.items || []
      : activeSection.items || [];
    const resolve = async () => {
      const index = memoryItems.findIndex((item) => item.id === selectedLibraryItem.id);
      if (activeSection.storageMode !== 'sqlite' && index >= 0) {
        return [...getParentContextItems(memoryItems as BoQItem[], index), selectedLibraryItem];
      }
      return listLibraryItemContext(selectedLibraryItem.id);
    };
    void resolve().then((context) => {
      if (!cancelled) setResolvedContext({ itemId: selectedLibraryItem.id, items: context });
    }).catch((error) => {
      if (!cancelled) setContextError(error instanceof Error ? error.message : 'Could not load shared requirements.');
    });
    return () => { cancelled = true; };
  }, [selectedLibraryItem?.id, activeSection, pageId]);
  const requiresStoredContext = insertMode === 'WITH_MISSING_PARENTS' && Boolean(selectedLibraryItem && PRICED_TYPES.has(selectedLibraryItem.type));
  const contextReady = resolvedContext?.itemId === selectedLibraryItemId;
  const contextualSourceItems = requiresStoredContext && contextReady ? resolvedContext.items : insertSourceItems;
  const activeDestination = destinations.find((destination) => destination.key === destinationValue) || destinations[0];
  const anchorItem = resolveHighlightedRow(activeDestination?.items || [], selectedItemIds, activeItemId);
  React.useEffect(() => { setPlacement(anchorItem ? 'AFTER_SELECTED' : 'BOTTOM'); }, [activeBill.id, activeDestination?.key, anchorItem?.id]);
  const insertItems = requiresStoredContext && !contextReady ? [] : buildBillItemsFromLibraryInsert(contextualSourceItems, selectedLibraryItemId, insertMode, activeDestination?.items || [], { placement, anchorItemId: anchorItem?.id });
  const selectedIsComment = selectedLibraryItem?.type === 'COMMENT' || selectedLibraryItem?.type === 'SUB_COMMENT';
  const selectedIsContextHeading = Boolean(selectedLibraryItem && !PRICED_TYPES.has(selectedLibraryItem.type) && !selectedIsComment);
  const insertSummary = React.useMemo(() => summariseInsertRows(insertItems), [insertItems]);
  const previewRows = insertItems.slice(0, 5);
  const hiddenPreviewCount = Math.max(0, insertItems.length - previewRows.length);
  const suggestedInsertMode: LibraryInsertMode | null = selectedLibraryItem
    ? PRICED_TYPES.has(selectedLibraryItem.type)
      ? 'WITH_MISSING_PARENTS'
      : selectedIsComment
        ? 'FROM_COMMENT'
        : selectedIsContextHeading
          ? 'FROM_HEADING'
          : 'ITEM_ONLY'
    : null;
  const activeRootHeading = rootHeadings.find((row) => row.id === activeRootHeadingId);
  const pathLabel = [
    activeLibrary ? normalizeLibraryLabel(activeLibrary.name, 'Library') : null,
    browseScope === 'section' || activeRootHeading ? activeFolder ? formatOrderedLabel(activeFolder.orderRef, activeFolder.name, 'Folder') : null : null,
    browseScope === 'section' || activeRootHeading ? activeSection ? formatOrderedLabel(activeSection.orderRef, activeSection.name, 'Section') : null : null,
  ].filter(Boolean).join(' / ');
  const targetPlacementLabel = placement === 'TOP'
    ? 'Top'
    : placement === 'BOTTOM'
      ? 'Bottom'
      : placement === 'BEFORE_SELECTED'
        ? 'Before selected row'
        : 'After selected row';
  const anchorLabel = anchorItem
    ? [anchorItem.reference, stripRichText(anchorItem.description)].filter(Boolean).join(' - ')
    : '';
  const modeAvailable = React.useCallback((mode: LibraryInsertMode) => {
    if (mode === 'FROM_HEADING') return selectedIsContextHeading;
    if (mode === 'FROM_COMMENT') return Boolean(selectedIsComment);
    if (mode === 'FULL_SECTION') return insertSourceItems.length > 0;
    return Boolean(selectedLibraryItem);
  }, [insertSourceItems.length, selectedIsComment, selectedIsContextHeading, selectedLibraryItem]);

  React.useEffect(() => {
    if (!selectedLibraryItem) return;
    if (PRICED_TYPES.has(selectedLibraryItem.type)) setInsertMode('WITH_MISSING_PARENTS');
    else setInsertMode(selectedLibraryItem.type === 'COMMENT' || selectedLibraryItem.type === 'SUB_COMMENT' ? 'FROM_COMMENT' : 'FROM_HEADING');
  }, [selectedLibraryItem?.id]);

  const selectedHeadingRangeIncomplete = isOutlineMode && selectedLibraryItemId === expandedOutlineId && Boolean(expandedOutlineId)
    && (isRangeLoading || expandedItems.length === 0 || expandedTotalCount > expandedItems.length);
  const canInsert = Boolean(activeDestination && insertItems.length > 0 && !selectedHeadingRangeIncomplete);
  const headingOutlineRows = React.useMemo(() => outlineRows.filter((item) => isLibraryHeadingType(item.type)), [outlineRows]);
  const visibleOutlineRows = React.useMemo(() => {
    const ancestors: LibraryItemOutlineRow[] = [];
    return headingOutlineRows.filter((row) => {
      const level = getLibraryHeadingLevel(row.type);
      while (ancestors.length > 0 && getLibraryHeadingLevel(ancestors[ancestors.length - 1].type) >= level) ancestors.pop();
      const isVisible = ancestors.every((ancestor) => openHeadingIds.has(ancestor.id));
      ancestors.push(row);
      return isVisible;
    });
  }, [headingOutlineRows, openHeadingIds]);
  const librarySelectorOptions = React.useMemo(() => {
    if (!isOutlineMode) {
      return items.map((item, index) => ({
        value: `item:${item.id}`,
        itemId: item.id,
        label: `${getLibraryItemReference(item, index)} - ${stripRichText(item.description) || getStandardsRowTypeLabel(item)}`,
        detail: getStandardsRowTypeLabel(item),
      }));
    }

    return visibleOutlineRows.flatMap((row, index) => {
      const rangeCount = getHeadingRangeCount(row);
      const headingOption = {
        value: `heading:${row.id}`,
        itemId: row.id,
        outlineId: row.id,
        label: `${getLibraryItemReference(row, row.position ?? index)} - ${stripRichText(row.description) || getStandardsRowTypeLabel(row)}`,
        detail: rangeCount == null
          ? getStandardsRowTypeLabel(row)
          : `${getStandardsRowTypeLabel(row)} - ${rangeCount.toLocaleString()} lower row${rangeCount === 1 ? '' : 's'}`,
      };
      if (expandedOutlineId !== row.id) return [headingOption];
      return [
        headingOption,
        ...expandedItems
          .filter((item) => item.id !== row.id)
          .map((item, childIndex) => ({
            value: `child:${item.id}`,
            itemId: item.id,
            outlineId: row.id,
            label: `${getLibraryItemReference(item, childIndex)} - ${stripRichText(item.description) || getStandardsRowTypeLabel(item)}`,
            detail: getStandardsRowTypeLabel(item),
          })),
      ];
    });
  }, [expandedItems, expandedOutlineId, isOutlineMode, items, visibleOutlineRows]);
  const selectedLibrarySelectorValue = librarySelectorOptions.find((option) => option.itemId === selectedLibraryItemId)?.value || '';
  const handleLibrarySelectorChange = (value: string) => {
    const option = librarySelectorOptions.find((entry) => entry.value === value);
    if (!option) return;
    setSelectedLibraryItemId(option.itemId);
    if (option.outlineId && expandedOutlineId !== option.outlineId) {
      setExpandedItems([]);
      setExpandedOutlineId(option.outlineId);
    }
  };
  const pendingInsertSummary = React.useMemo(
    () => pendingInsertPlan ? summariseInsertRows(pendingInsertPlan.rows) : null,
    [pendingInsertPlan],
  );
  const pendingPreviewRows = pendingInsertPlan?.rows.slice(0, 8) || [];
  const pendingHiddenCount = Math.max(0, (pendingInsertPlan?.rows.length || 0) - pendingPreviewRows.length);
  const insertPreparedRows = React.useCallback((rows: BoQItem[], capturedDestination?: LibraryInsertDestination) => {
    if (!activeDestination || rows.length === 0) return;
    const destination: LibraryInsertDestination = capturedDestination || {
      billId: activeBill.id,
      sectionId: activeDestination.sectionId,
      pageId: activeDestination.pageId,
      placement,
      anchorItemId: anchorItem?.id || null,
    };
    const latest = latestDestinationRef.current;
    if (latest.activeBill.id !== destination.billId || !isBillInsertDestinationValid(latest.activeBill, destination)) {
      setInsertError('The insertion destination changed. Select a destination row and try again.');
      return;
    }
    setInsertError(null);
    latest.onInsert(rows, destination);
    if (!keepPanelOpen) onClose();
  }, [activeBill.id, activeDestination, anchorItem?.id, keepPanelOpen, onClose, placement]);
  const requestInsertRows = React.useCallback((rows: BoQItem[], mode: LibraryInsertMode) => {
    if (!activeDestination || rows.length === 0) return;
    if (shouldConfirmStandardsInsert(mode, rows)) {
      setPendingInsertPlan({
        rows,
        mode,
        destinationLabel: activeDestination.label,
        placementLabel: anchorLabel ? `${targetPlacementLabel}: ${anchorLabel}` : targetPlacementLabel,
        destination: { billId: activeBill.id, sectionId: activeDestination.sectionId, pageId: activeDestination.pageId, placement, anchorItemId: anchorItem?.id || null },
      });
      return;
    }
    insertPreparedRows(rows);
  }, [activeBill.id, activeDestination, anchorItem?.id, anchorLabel, insertPreparedRows, placement, targetPlacementLabel]);

  const renderLibraryRowButton = (
    item: BoQItem,
    index: number,
    options?: {
      nested?: boolean;
      outlineRow?: LibraryItemOutlineRow;
      rootHeading?: LibraryRootHeadingRow;
      showExpandIcon?: boolean;
      treeIndent?: number;
      displayLabel?: string;
    },
  ) => {
    const isSelected = item.id === selectedLibraryItemId;
    const isExpanded = options?.rootHeading
      ? activeRootHeadingId === options.rootHeading.id
      : Boolean(options?.outlineRow && openHeadingIds.has(options.outlineRow.id));
    const sourceSection = options?.rootHeading
      ? librarySectionById.get(options.rootHeading.sectionId) || null
      : activeSection;
    const sourcePageId = options?.rootHeading ? options.rootHeading.pageId || '' : pageId;
    const level = isLibraryHeadingType(item.type) ? getLibraryHeadingLevel(item.type) : 7;
    const tone = getReadableRowTone(item, isSelected, options?.nested);
    const rowTypeLabel = getStandardsRowTypeLabel(item);
    const rangeCount = options?.outlineRow ? getHeadingRangeCount(options.outlineRow) : null;
    const rowIndent = (options?.treeIndent || 0) + (options?.nested
      ? 12 + Math.min(level, 7) * 8
      : isLibraryHeadingType(item.type)
        ? 12 + Math.min(Math.max(level - 1, 0), 5) * 8
        : 12);
    const rangeCacheKey = options?.outlineRow && sourceSection
      ? `${sourceSection.id}::${sourcePageId || '__direct__'}::${options.outlineRow.position}::${options.outlineRow.childEndPosition ?? 'end'}`
      : null;
    const cachedRangeItems = rangeCacheKey ? headingRangeCacheRef.current.get(rangeCacheKey) : undefined;
    const dragSourceItems = options?.outlineRow
      ? (cachedRangeItems || (options.outlineRow.id === expandedOutlineId && expandedItems.length > 0 ? expandedItems : [item]))
      : insertSourceItems;
    const defaultDragMode: LibraryInsertMode = PRICED_TYPES.has(item.type)
      ? 'WITH_MISSING_PARENTS'
      : isCommentLike(item)
        ? 'FROM_COMMENT'
        : isLibraryHeadingType(item.type)
          ? 'FROM_HEADING'
          : 'ITEM_ONLY';
    const loadDragSourceItems = async () => {
      if (PRICED_TYPES.has(item.type)) {
        const memoryItems = sourcePageId
          ? sourceSection?.pages?.find((page) => page.id === sourcePageId)?.items || []
          : sourceSection?.items || [];
        const index = memoryItems.findIndex((entry) => entry.id === item.id);
        if (sourceSection?.storageMode !== 'sqlite' && index >= 0) {
          return [...getParentContextItems(memoryItems as BoQItem[], index), item];
        }
        // Fail rather than produce a drag payload missing the shared requirements.
        return listLibraryItemContext(item.id);
      }
      const outlineRow = options?.outlineRow;
      if (query.trim() && (isLibraryHeadingType(item.type) || isCommentLike(item))) {
        throw new Error('Open this heading or comment in the library browse view before dragging its suggested rows. Hold Ctrl to insert this row only.');
      }
      const memoryItems = sourcePageId
        ? sourceSection?.pages?.find((page) => page.id === sourcePageId)?.items || []
        : sourceSection?.items || [];
      const withParentHeadings = async (range: BoQItem[]) => {
        if (!range.length || !sourceSection) return range;
        const context = await listLibraryItemContext(item.id);
        return [...context.filter((entry) => entry.id !== item.id), ...range];
      };
      if (sourceSection?.storageMode !== 'sqlite' && memoryItems.length) {
        const expectedCount = sourcePageId
          ? sourceSection.pages?.find((page) => page.id === sourcePageId)?.itemCount
          : sourceSection.itemCount;
        if (expectedCount && expectedCount > memoryItems.length) throw new Error('This library scope is not fully loaded. Open it in the desktop library before dragging suggested rows.');
        if (isCommentLike(item)) return memoryItems;
        if (outlineRow) return memoryItems;
      }
      if (isCommentLike(item) && sourceSection) {
        const result = await listLibraryItems({ sectionId: sourceSection.id, pageId: sourcePageId || undefined, limit: MAX_DRAG_RANGE_ROWS });
        if (result.totalCount > result.items.length) throw new Error('This library scope is too large to load completely. Narrow the scope before dragging the comment.');
        return result.items;
      }
      if (!outlineRow || !sourceSection) return dragSourceItems;
      if (outlineRow.id === expandedOutlineId && expandedItems.length > 0 && expandedItems.length >= expandedTotalCount) return withParentHeadings(expandedItems);
      if (cachedRangeItems?.length) return withParentHeadings(cachedRangeItems);

      try {
        const result = await listLibraryItemsInPositionRange({
          sectionId: sourceSection.id,
          pageId: sourcePageId || undefined,
          startPosition: outlineRow.position,
          endPosition: outlineRow.childEndPosition ?? undefined,
          offset: 0,
          limit: MAX_DRAG_RANGE_ROWS,
        });
        if (result.totalCount > result.items.length) throw new Error('This heading is too large to load completely. Narrow the library scope before dragging it.');
        const rangeItems = result.items.length > 0 ? result.items : [item];
        if (rangeCacheKey) headingRangeCacheRef.current.set(rangeCacheKey, rangeItems);
        return withParentHeadings(rangeItems);
      } catch (error) {
        throw error;
      }
    };
    const createDragPayload = async (): Promise<LibraryInsertDragPayload> => {
      const label = stripRichText(item.description) || item.reference || item.type;
      const sourceItems = await loadDragSourceItems();
      return {
        kind: 'HZL_LIBRARY_INSERT',
        selectedItemId: item.id,
        selectedItemType: item.type,
        sourceItems,
        defaultMode: defaultDragMode,
        label,
      };
    };
    const handleClick = () => {
      if (suppressNextRowClickRef.current) {
        suppressNextRowClickRef.current = false;
        return;
      }
      if (options?.rootHeading) {
        const root = options.rootHeading;
        setActiveRootHeadingId((current) => current === root.id ? null : root.id);
        if (activeRootHeadingId !== root.id) {
          setFolderId(root.folderId);
          setSectionId(root.sectionId);
          setPageId(root.pageId || '');
        }
      } else if (options?.outlineRow) toggleOutline();
      else setSelectedLibraryItemId(item.id);
    };
    const toggleOutline = () => {
      if (isExpanded && options?.outlineRow) {
        const closedRow = options.outlineRow;
        setOpenHeadingIds((current) => new Set([...current].filter((id) => {
          const candidate = headingOutlineRows.find((row) => row.id === id);
          return candidate && (candidate.position < closedRow.position || (closedRow.childEndPosition != null && candidate.position >= closedRow.childEndPosition));
        })));
        setSelectedLibraryItemId(null);
        setExpandedOutlineId(null);
        setExpandedItems([]);
        setExpandedTotalCount(0);
        return;
      }
      setOpenHeadingIds((current) => new Set(current).add(item.id));
      setSelectedLibraryItemId(item.id);
      setExpandedItems([]);
      setExpandedTotalCount(0);
      setExpandedOutlineId(item.id);
    };
    const handlePointerDragMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      const initialPayload: LibraryInsertDragPayload = {
        kind: 'HZL_LIBRARY_INSERT',
        selectedItemId: item.id,
        selectedItemType: item.type,
        sourceItems: dragSourceItems,
        defaultMode: defaultDragMode,
        label: stripRichText(item.description) || item.reference || item.type,
      };
      pointerInsertDragRef.current = {
        payload: initialPayload,
        startX: event.clientX,
        startY: event.clientY,
        hasMoved: false,
      };
      previewCountCacheRef.current = null;

      let lastPoint = { clientX: event.clientX, clientY: event.clientY, ctrlKey: event.ctrlKey };
      const refreshPreview = (point: typeof lastPoint) => {
        const session = pointerInsertDragRef.current;
        if (!session?.hasMoved) return;
        const mode: LibraryInsertMode = point.ctrlKey ? 'ITEM_ONLY' : session.payload.defaultMode;
        const dropElement = document.elementsFromPoint(point.clientX, point.clientY).find((candidate) =>
          candidate instanceof HTMLElement && candidate.closest('[data-bill-row-id], [data-standards-drop-destination="true"]'),
        ) as HTMLElement | undefined;
        const dropRow = dropElement?.closest<HTMLTableRowElement>('[data-bill-row-id]');
        const dropScope = dropRow || dropElement?.closest<HTMLElement>('[data-standards-drop-destination="true"]');
        const sectionId = dropScope?.dataset.billSectionId || '';
        const dropPageId = dropScope?.dataset.billPageId || null;
        const section = activeBill.sections.find((entry) => entry.id === sectionId);
        const existingItems = dropPageId
          ? section?.pages?.find((entry) => entry.id === dropPageId)?.items || []
          : sectionId ? section?.items || [] : activeBill.items || [];
        const placement = dropRow
          ? 'AFTER_SELECTED'
          : 'BOTTOM';
        const targetKey = `${mode}:${sectionId}:${dropPageId}:${dropRow?.dataset.billRowId || ''}:${placement}:${session.payload.sourceItems.length}`;
        if (previewCountCacheRef.current?.key !== targetKey) {
          previewCountCacheRef.current = {
            key: targetKey,
            count: buildBillItemsFromLibraryInsert(session.payload.sourceItems, session.payload.selectedItemId, mode, existingItems, { placement, anchorItemId: dropRow?.dataset.billRowId }).length,
          };
        }
        setInsertDragPreview({
          label: session.payload.label || 'Library row',
          modeLabel: point.ctrlKey ? 'One library line' : getInsertModePlainTitle(session.payload.defaultMode),
          rowCount: previewCountCacheRef.current.count,
          x: point.clientX,
          y: point.clientY,
        });
      };
      const handleMouseMove = (moveEvent: MouseEvent) => {
        const session = pointerInsertDragRef.current;
        if (!session) return;
        const distance = Math.hypot(moveEvent.clientX - session.startX, moveEvent.clientY - session.startY);
        if (distance < 5 && !session.hasMoved) return;
        if (!session.hasMoved) {
          session.hasMoved = true;
          beginLibraryInsertDrag(session.payload);
          session.payloadPromise = createDragPayload();
          void session.payloadPromise.then((payload) => {
            if (pointerInsertDragRef.current !== session) return;
            session.payload = payload;
            beginLibraryInsertDrag(payload);
            refreshPreview(lastPoint);
          }).catch((error) => {
            if (pointerInsertDragRef.current === session) setContextError(error instanceof Error ? error.message : 'Could not load shared requirements.');
          });
        }
        moveEvent.preventDefault();
        document.body.classList.add('cursor-copy');
        document.body.style.userSelect = 'none';
        lastPoint = { clientX: moveEvent.clientX, clientY: moveEvent.clientY, ctrlKey: moveEvent.ctrlKey };
        refreshPreview(lastPoint);
      };
      const handleModifier = (keyEvent: KeyboardEvent) => {
        if (keyEvent.key !== 'Control') return;
        lastPoint = { ...lastPoint, ctrlKey: keyEvent.ctrlKey };
        refreshPreview(lastPoint);
      };
      const handleMouseUp = (upEvent: MouseEvent) => {
        const session = pointerInsertDragRef.current;
        pointerInsertDragRef.current = null;
        document.body.classList.remove('cursor-copy');
        document.body.style.userSelect = '';
        setInsertDragPreview(null);
        previewCountCacheRef.current = null;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('keydown', handleModifier);
        window.removeEventListener('keyup', handleModifier);

        if (session?.hasMoved) {
          suppressNextRowClickRef.current = true;
          dispatchLibraryInsertPointerDrop(session.payload, upEvent.clientX, upEvent.clientY, upEvent.ctrlKey, session.payloadPromise);
          clearLibraryInsertDrag();
          return;
        }

        clearLibraryInsertDrag(session?.payload);
      };

      window.addEventListener('mousemove', handleMouseMove, { passive: false });
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('keydown', handleModifier);
      window.addEventListener('keyup', handleModifier);
    };
    const handleDoubleClick = () => {
      void loadDragSourceItems().then((sourceItems) => {
      const mode = defaultDragMode === 'FROM_HEADING' && sourceItems.length <= 1
        ? 'ITEM_ONLY'
        : defaultDragMode === 'FROM_COMMENT' && sourceItems.length <= 1
          ? 'ITEM_ONLY'
          : defaultDragMode;
      const rows = buildBillItemsFromLibraryInsert(sourceItems, item.id, mode, activeDestination?.items || [], { placement, anchorItemId: anchorItem?.id });
      requestInsertRows(rows, mode);
      }).catch((error) => {
        setContextError(error instanceof Error ? error.message : 'Could not load shared requirements.');
      });
    };

    return (
      <div
        key={`${options?.nested ? 'range' : 'outline'}-${item.id}`}
        className={`group flex w-full items-stretch border-b border-slate-100 pr-2 text-left text-sm transition last:border-b-0 dark:border-slate-800 ${tone.row}`}
        style={{ paddingLeft: rowIndent }}
      >
      <button
        type="button"
        onMouseDown={handlePointerDragMouseDown}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        aria-expanded={options?.outlineRow ? isExpanded : undefined}
        aria-label={options?.outlineRow ? `${isExpanded ? 'Close' : 'Open'} ${options.displayLabel || stripRichText(item.description) || 'heading'}` : undefined}
        title={`${rowTypeLabel}${PRICED_TYPES.has(item.type) ? ` · ${item.unit || 'unit'} · ${formatCurrency(item.rate || 0)}` : ''}. Drag to bill; double-click to insert.`}
        className="flex min-w-0 flex-1 cursor-grab items-center gap-1.5 py-1.5 text-left active:cursor-grabbing"
      >
        <span className="flex w-4 shrink-0 items-center justify-center text-slate-400">
          {options?.showExpandIcon ? (isExpanded || isRangeLoading ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : <GripVertical className="h-3.5 w-3.5 opacity-45 transition group-hover:opacity-100" />}
        </span>
        <span className={`min-w-0 flex-1 leading-5 ${tone.description}`}>{options?.displayLabel || stripRichText(item.description) || item.type}</span>
      </button>
      </div>
    );
  };

  const renderOutlineRow = (item: LibraryItemOutlineRow, index: number, rootHeading?: LibraryRootHeadingRow, treeIndent = 0, displayLabel?: string, hideButton = false) => {
    const isOpen = rootHeading ? activeRootHeadingId === item.id : openHeadingIds.has(item.id);
    const rangeKey = activeSection
      ? `${activeSection.id}::${pageId || '__direct__'}::${item.position}::${item.childEndPosition ?? 'end'}`
      : '';
    const range = headingRangeCacheRef.current.get(rangeKey)
      || (expandedOutlineId === item.id ? expandedItems : []);
    const nextHeading = headingOutlineRows.find((candidate) => candidate.position > item.position
      && (item.childEndPosition == null || candidate.position < item.childEndPosition));
    const directCount = Math.max(0, (nextHeading?.position ?? item.childEndPosition ?? (item.position + range.length)) - item.position - 1);
    const directItems = isOpen ? range.slice(1, directCount + 1).filter((entry) => !isLibraryHeadingType(entry.type)) : [];
    return <React.Fragment key={item.id}>
      {!hideButton ? renderLibraryRowButton(item, item.position ?? index, { outlineRow: item, rootHeading, showExpandIcon: true, treeIndent, displayLabel }) : null}
      {isOpen && directItems.length > 0 ? <div className="border-b border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-surface-950/60">
        {directItems.map((entry, childIndex) => renderLibraryRowButton(entry, childIndex, { nested: true, treeIndent }))}
      </div> : null}
      {isOpen && expandedOutlineId === item.id && isRangeLoading && directItems.length === 0 && !nextHeading ? (
        <div className="flex items-center gap-2 px-4 py-3 text-xs text-slate-500 dark:text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading heading rows...</div>
      ) : null}
    </React.Fragment>;
  };

  const renderRootHeading = (root: LibraryRootHeadingRow, index: number, treeIndent: number, hideRoot = false) => <React.Fragment key={root.id}>
    {renderOutlineRow(root, index, root, treeIndent, undefined, hideRoot)}
    {activeRootHeadingId === root.id && outlineRows.some((row) => row.id === root.id)
      ? visibleOutlineRows.filter((row) => row.id !== root.id && row.position > root.position
        && (root.childEndPosition == null || row.position < root.childEndPosition))
        .map((row, childIndex) => {
          const section = librarySectionById.get(root.sectionId);
          const label = section && row.type === 'MAJOR_HEADING' ? headingWithoutSectionRef(row.description, section) : undefined;
          const hidesSectionRow = Boolean(hideRoot && section && isRepeatedSectionHeading(row, section));
          return renderOutlineRow(row, childIndex, undefined, hideRoot ? Math.max(0, treeIndent - 10) : treeIndent, label, hidesSectionRow);
        })
      : null}
  </React.Fragment>;

  const renderSectionTree = (section: LibrarySection, folder: LibraryFolder, depth = 0, ancestors: string[] = []): React.ReactNode => {
    const isOpen = openSectionIds.has(section.id);
    const directRoots = rootHeadings.filter((root) => root.sectionId === section.id && !root.pageId);
    const hidesRoot = directRoots.length === 1 && isRepeatedRootHeading(directRoots[0], folder, section);
    const sectionPages = section.pages || [];
    const childSections = sortLibrarySections(section.subSections || []);
    const indent = 12 + depth * 12;
    return <React.Fragment key={section.id}>
      <button type="button" aria-expanded={isOpen} aria-label={`${isOpen ? 'Close' : 'Open'} section ${formatOrderedLabel(section.orderRef, section.name, 'Section')}`}
        onClick={() => {
          setOpenSectionIds(isOpen ? new Set(ancestors) : new Set([...ancestors, section.id]));
          setFolderId(folder.id);
          setSectionId(section.id);
          setPageId('');
          setActiveRootHeadingId(null);
        }}
        className="flex min-h-8 w-full items-center gap-1.5 border-b border-slate-100 py-1 pr-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-surface-800"
        style={{ paddingLeft: indent }}>
        {isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
        <span className="min-w-0 flex-1 truncate">{formatOrderedLabel(section.orderRef, section.name, 'Section')}</span>
      </button>
      {isOpen ? <>
        {directRoots.map((root, index) => renderRootHeading(root, index, indent + 14, hidesRoot))}
        {hidesRoot && !activeRootHeadingId && isRootLoading ? (
          <div className="py-2 pr-2 text-xs text-slate-400" style={{ paddingLeft: indent + 14 }}>Loading headings...</div>
        ) : null}
        {sectionPages.map((page) => {
          const pageRoots = rootHeadings.filter((root) => root.sectionId === section.id && root.pageId === page.id);
          const pageOpen = openPageIds.has(page.id);
          return <React.Fragment key={page.id}>
            <button type="button" aria-expanded={pageOpen} aria-label={`${pageOpen ? 'Close' : 'Open'} page ${formatOrderedLabel(page.orderRef, page.name, 'Page')}`}
              onClick={() => {
                setOpenPageIds((current) => {
                  const next = new Set(current);
                  if (next.has(page.id)) next.delete(page.id);
                  else next.add(page.id);
                  return next;
                });
                if (pageOpen) setActiveRootHeadingId(null);
              }}
              className="flex min-h-8 w-full items-center gap-1.5 border-b border-slate-100 py-1 pr-2 text-left text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-surface-800"
              style={{ paddingLeft: indent + 14 }}>
              {pageOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
              <span className="min-w-0 flex-1 truncate">{formatOrderedLabel(page.orderRef, page.name, 'Page')}</span>
            </button>
            {pageOpen ? pageRoots.map((root, index) => renderRootHeading(root, index, indent + 28)) : null}
          </React.Fragment>;
        })}
        {childSections.map((child) => renderSectionTree(child, folder, depth + 1, [...ancestors, section.id]))}
        {!isRootLoading && directRoots.length === 0 && sectionPages.length === 0 && childSections.length === 0 ? (
          <div className="py-2 pr-2 text-xs text-slate-400" style={{ paddingLeft: indent + 28 }}>{rootLoadError || 'No H1 headings in this section.'}</div>
        ) : null}
      </> : null}
    </React.Fragment>;
  };

  return (
    <aside
      data-standards-insert-panel="true"
      data-panel-mode={isFloating ? 'floating' : `docked-${dockSide}`}
      className={isFloating
        ? 'fixed z-[130] overflow-hidden rounded-app-xl border border-slate-200 bg-white shadow-[0_28px_80px_-28px_rgba(15,23,42,0.55)] dark:border-slate-700 dark:bg-surface-900'
        : `relative z-[80] h-full shrink-0 overflow-hidden border-slate-200 bg-white dark:border-slate-700 dark:bg-surface-900 ${dockSide === 'left' ? 'order-1 border-r shadow-[18px_0_40px_-32px_rgba(15,23,42,0.35)]' : 'order-3 border-l shadow-[-18px_0_40px_-32px_rgba(15,23,42,0.35)]'}`}
      style={isFloating ? {
        left: panelPosition.x,
        top: panelPosition.y,
        width: panelSize.width,
        height: panelSize.height,
      } : {
        width: panelSize.width,
        maxWidth: '50vw',
      }}
    >
      {!isFloating ? (
        <button
          type="button"
          aria-label="Resize mini library panel"
          title="Drag to resize mini library"
          onMouseDown={(event) => {
            event.preventDefault();
            resizeStartRef.current = {
              mouseX: event.clientX,
              mouseY: event.clientY,
              width: panelSize.width,
              height: panelSize.height,
              mode: dockSide === 'left' ? 'docked-right' : 'docked-left',
            };
            setIsResizingPanel(true);
          }}
          className={`absolute bottom-0 top-0 z-20 w-2 cursor-ew-resize transition ${dockSide === 'left' ? 'right-0' : 'left-0'} ${isResizingPanel ? 'bg-emerald-400/25' : 'bg-transparent hover:bg-emerald-400/15'}`}
        >
          <span className={`absolute top-1/2 h-16 w-px -translate-y-1/2 bg-slate-300 dark:bg-slate-600 ${dockSide === 'left' ? 'right-0' : 'left-0'}`} />
        </button>
      ) : null}
      <div className="flex h-full min-h-0 flex-col">
        <div
          className={`${isFloating ? 'cursor-move' : ''} select-none border-b border-slate-200 px-3 py-2 dark:border-slate-700 ${isDraggingPanel ? 'bg-slate-50 dark:bg-surface-800' : ''}`}
          onMouseDown={(event) => {
            if (!isFloating) return;
            const target = event.target as HTMLElement;
            if (target.closest('button, input, select, textarea')) return;
            dragOffsetRef.current = {
              x: event.clientX - panelPosition.x,
              y: event.clientY - panelPosition.y,
            };
            setIsDraggingPanel(true);
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{isFloating ? <GripVertical className="h-3.5 w-3.5 shrink-0 text-slate-400" /> : null}<Library className="h-4 w-4 shrink-0 text-emerald-600" /> Standards</h2>
            <div className="flex items-center gap-1" role="toolbar" aria-label="Standards panel tools">
              <button type="button" onClick={() => setShowLibraryScope((current) => !current)} className="workspace-icon-btn p-1.5" aria-label="Browse folders and sections" title="Folders and sections" aria-pressed={showLibraryScope}><FolderTree className="h-4 w-4" /></button>
              <button type="button" onClick={() => setShowBrowseRows((current) => !current)} className="workspace-icon-btn p-1.5" aria-label="Show headings and items" title="Show or hide headings and items" aria-pressed={showBrowseRows}><ListTree className="h-4 w-4" /></button>
              <button type="button" onClick={() => setShowInsertOptions((current) => !current)} className="workspace-icon-btn p-1.5" aria-label="Insertion options" title="Insertion options" aria-pressed={showInsertOptions}><SlidersHorizontal className="h-4 w-4" /></button>
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="workspace-icon-btn p-1.5"
                aria-label="Search library"
                title="Search library"
              >
                <Search className="h-4 w-4" />
              </button>
              <button type="button" onClick={onOpenFullLibrary} className="workspace-icon-btn p-1.5" aria-label="Open full library" title="Full library"><Library className="h-4 w-4" /></button>
              <button type="button" onClick={() => { setDockSide('left'); setIsFloating(false); }} className={`workspace-icon-btn p-1.5 ${!isFloating && dockSide === 'left' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : ''}`} aria-label="Dock Standards left" title="Dock left" aria-pressed={!isFloating && dockSide === 'left'}><PanelLeft className="h-4 w-4" /></button>
              <button type="button" onClick={() => { setDockSide('right'); setIsFloating(false); }} className={`workspace-icon-btn p-1.5 ${!isFloating && dockSide === 'right' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : ''}`} aria-label="Dock Standards right" title="Dock right" aria-pressed={!isFloating && dockSide === 'right'}><PanelRight className="h-4 w-4" /></button>
              {!isFloating && <button type="button" onClick={() => {
                const nextSize = clampSize(panelSize);
                setPanelSize(nextSize);
                setPanelPosition((current) => clampPosition(current, nextSize));
                setIsFloating(true);
              }} className="workspace-icon-btn p-1.5" aria-label="Float Standards panel" title="Float panel"><Maximize2 className="h-4 w-4" /></button>}
              <button type="button" onClick={onClose} className="workspace-icon-btn p-1.5" aria-label="Close standards insert">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-slate-200 bg-emerald-50/70 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-emerald-950/18">
          <span className="shrink-0 font-semibold text-emerald-800 dark:text-emerald-200">To:</span>
          <span className="min-w-0 flex-1 truncate font-medium text-emerald-950 dark:text-emerald-50" title={activeDestination?.label}>{activeDestination?.label || 'Choose a bill destination'}</span>
          <span className="shrink-0 text-[11px] text-emerald-700 dark:text-emerald-200">{insertItems.length.toLocaleString()} selected</span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
          <section className="shrink-0 space-y-2 rounded-app-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-surface-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Library</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-surface-800 dark:text-slate-300">
                {(browseScope === 'library' && !query.trim() ? activeLibrary?.folders.length || 0 : totalCount).toLocaleString()} {browseScope === 'library' && !query.trim() ? 'folders' : 'rows'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-app border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-700 dark:bg-surface-950">
              <span className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-200">{normalizeLibraryLabel(activeLibrary?.name || '', 'Library')}</span>
              <button type="button" onClick={() => setShowLibraryPicker((current) => !current)} className="shrink-0 text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100">
                Change
              </button>
            </div>
            {showLibraryPicker ? <label className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Library
              <select value={libraryId} onChange={(event) => { setBrowseScope('library'); setActiveRootHeadingId(null); setLibraryId(event.target.value); setShowLibraryPicker(false); }} className="mt-1 w-full rounded-app border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100">
                {sortedLibraries.map((library) => <option key={library.id} value={library.id}>{normalizeLibraryLabel(library.name, 'Library')}</option>)}
              </select>
            </label> : null}

            {showLibraryScope ? <>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Folder
                <select
                  value={folderId}
                  onChange={(event) => {
                    setBrowseScope('section');
                    setActiveRootHeadingId(null);
                    setFolderId(event.target.value);
                    setShowBrowseRows(true);
                    setExpandedOutlineId(null);
                    setExpandedItems([]);
                  }}
                  className="mt-1 w-full rounded-app border border-slate-200 bg-white px-3 py-2.5 text-sm normal-case tracking-normal text-slate-900 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100"
                >
                  {(activeLibrary?.folders || []).map((folder) => <option key={folder.id} value={folder.id}>{formatOrderedLabel(folder.orderRef, folder.name, 'Folder')}</option>)}
                </select>
              </label>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Section
                <select
                  value={sectionId}
                  onChange={(event) => {
                    setBrowseScope('section');
                    setActiveRootHeadingId(null);
                    setSectionId(event.target.value);
                    setShowBrowseRows(true);
                    setExpandedOutlineId(null);
                    setExpandedItems([]);
                  }}
                  className="mt-1 w-full rounded-app border border-slate-200 bg-white px-3 py-2.5 text-sm normal-case tracking-normal text-slate-900 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100"
                >
                  {sectionOptions.map(({ section, depth }) => <option key={section.id} value={section.id}>{`${'— '.repeat(depth)}${formatOrderedLabel(section.orderRef, section.name, 'Section')}`}</option>)}
                </select>
              </label>
            </div>
            <div className="hidden grid gap-3 md:grid-cols-2">
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Folders</div>
                <div className="max-h-32 overflow-y-auto rounded-app border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-surface-950">
                  {(activeLibrary?.folders || []).map((folder) => {
                    const isSelected = folder.id === folderId;
                    return (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => setFolderId(folder.id)}
                        className={`mb-1 flex w-full items-center justify-between gap-2 rounded-app px-2 py-1.5 text-left text-xs font-bold uppercase tracking-wide last:mb-0 ${isSelected ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-surface-900 dark:text-slate-200 dark:hover:bg-surface-800'}`}
                      >
                        <span className="truncate">{formatOrderedLabel(folder.orderRef, folder.name, 'Folder')}</span>
                        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 dark:bg-surface-800 dark:text-slate-400'}`}>
                          {folder.sections?.length || 0}
                        </span>
                      </button>
                    );
                  })}
                  {!(activeLibrary?.folders || []).length && (
                    <div className="px-3 py-6 text-center text-xs text-slate-500">This library has no folders.</div>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Sections</div>
                <div className="max-h-32 overflow-y-auto rounded-app border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-surface-950">
                  {sectionOptions.map(({ section, depth }) => {
                    const isSelected = section.id === sectionId;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => setSectionId(section.id)}
                        className={`mb-1 flex w-full items-center justify-between gap-2 rounded-app py-1.5 pr-2 text-left text-xs last:mb-0 ${isSelected ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-surface-900 dark:text-slate-200 dark:hover:bg-surface-800'}`}
                        style={{ paddingLeft: 10 + Math.min(depth, 6) * 14 }}
                      >
                        <span className="truncate">{formatOrderedLabel(section.orderRef, section.name, 'Section')}</span>
                        {depth > 0 ? (
                          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 dark:bg-surface-800 dark:text-slate-400'}`}>
                            L{depth + 1}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                  {!sectionOptions.length && (
                    <div className="px-3 py-6 text-center text-xs text-slate-500">Choose a folder with sections.</div>
                  )}
                </div>
              </div>
            </div>

            {activeSection?.pages?.length ? (
              <label className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Page
                <select value={pageId} onChange={(event) => { setBrowseScope('section'); setActiveRootHeadingId(null); setPageId(event.target.value); }} className="mt-1 w-full rounded-app border border-slate-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-900 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100">
                  <option value="">Section own items</option>
                  {activeSection.pages.map((page) => <option key={page.id} value={page.id}>{formatOrderedLabel(page.orderRef, page.name, 'Page')}</option>)}
                </select>
              </label>
            ) : null}
            <button type="button" onClick={() => { setBrowseScope('library'); setActiveRootHeadingId(null); setShowLibraryScope(false); }} className="text-left text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400">Browse library folders</button>
            </> : null}
          </section>

          {(isSearchOpen || showBrowseRows) ? <section className={isSearchOpen
            ? 'fixed inset-8 z-[260] space-y-3 overflow-y-auto rounded-app-xl border border-slate-200 bg-white p-5 shadow-[0_24px_80px_-30px_rgba(15,23,42,0.75)] dark:border-slate-700 dark:bg-surface-900'
            : 'flex min-h-[220px] flex-1 flex-col gap-2 rounded-app-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-surface-900'}>
            {isSearchOpen ? <>
            <div>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Search library</h3>
                <button type="button" onClick={() => { setIsSearchOpen(false); setQuery(''); }} className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-100">Close</button>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Search by reference or description, select the result, then add it to the bill.</p>
            </div>

            <label className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Find item
              <div className="mt-1 flex items-center gap-2 rounded-app border border-slate-200 bg-white px-3 py-2 transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 dark:border-slate-700 dark:bg-surface-900 dark:focus-within:border-emerald-600 dark:focus-within:ring-emerald-950/50">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by ref, description, heading, or comment"
                  className="min-w-0 flex-1 bg-transparent text-sm normal-case tracking-normal text-slate-900 outline-none dark:text-slate-100"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="rounded-app-sm p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-surface-800 dark:hover:text-slate-200"
                    aria-label="Clear item search"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-[11px] font-medium normal-case tracking-normal text-slate-500 dark:text-slate-400">
                <span>{query.trim() ? 'Searching the selected library.' : 'Start typing, or browse the headings if you prefer.'}</span>
                <span className="shrink-0">{items.length.toLocaleString()} shown</span>
              </div>
            </label>
            </> : null}

            {isSearchOpen && !query.trim() && showBrowseRows ? <label className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Quick row selector
              <select
                value={selectedLibrarySelectorValue}
                onChange={(event) => handleLibrarySelectorChange(event.target.value)}
                disabled={librarySelectorOptions.length === 0}
                className="mt-1 w-full rounded-app border border-slate-200 bg-white px-3 py-2.5 text-sm normal-case tracking-normal text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100 dark:focus:border-emerald-600 dark:focus:ring-emerald-950/50"
              >
                <option value="">
                  {isOutlineMode ? 'Choose a heading to expand or insert...' : 'Choose a row to insert...'}
                </option>
                {librarySelectorOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.detail})
                  </option>
                ))}
              </select>
              {isOutlineMode ? (
                <div className="mt-1 text-[11px] font-medium normal-case tracking-normal text-slate-500 dark:text-slate-400">
                  Selecting a heading opens it below; its child rows then appear in this selector.
                </div>
              ) : null}
            </label> : null}

            {query.trim() || showBrowseRows ? <div className="flex min-h-0 flex-1 flex-col rounded-app border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <span>
                  {isOutlineMode && browseScope === 'library'
                    ? `${(activeLibrary?.folders.length || 0).toLocaleString()} folders · open a folder to browse its sections`
                    : isLoading
                      ? 'Loading scope...'
                      : isOutlineMode
                        ? `${visibleOutlineRows.length.toLocaleString()} of ${headingOutlineRows.length.toLocaleString()} headings visible · open a heading to browse its children`
                        : `${items.length.toLocaleString()} of ${totalCount.toLocaleString()} rows loaded`}
                </span>
                {(isRootLoading || isLoading || isRangeLoading) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              </div>
              <div data-standards-browser-list="true" className="min-h-0 flex-1 overflow-y-auto">
                {isOutlineMode ? (
                  <>
                    {browseScope === 'library'
                      ? (activeLibrary?.folders || []).map((folder) => {
                        const isOpen = openFolderIds.has(folder.id);
                        return <React.Fragment key={folder.id}>
                          <button type="button" aria-expanded={isOpen} aria-label={`${isOpen ? 'Close' : 'Open'} folder ${formatOrderedLabel(folder.orderRef, folder.name, 'Folder')}`}
                            onClick={() => {
                              setOpenFolderIds(isOpen ? new Set() : new Set([folder.id]));
                              setOpenSectionIds(new Set());
                              setOpenPageIds(new Set());
                              setActiveRootHeadingId(null);
                            }}
                            className="flex min-h-10 w-full items-center gap-2 border-b border-slate-200 bg-slate-100/85 px-2 py-1.5 text-left text-xs font-bold uppercase tracking-wide text-slate-950 hover:bg-slate-200/70 dark:border-slate-700 dark:bg-surface-800/90 dark:text-slate-50 dark:hover:bg-surface-700">
                            {isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                            <span className="min-w-0 flex-1 truncate">{formatOrderedLabel(folder.orderRef, folder.name, 'Folder')}</span>
                          </button>
                          {isOpen ? sortLibrarySections(folder.sections || []).map((section) => renderSectionTree(section, folder)) : null}
                        </React.Fragment>;
                      })
                      : visibleOutlineRows.map((item, index) => renderOutlineRow(item, index))}
                    {browseScope === 'library' && !(activeLibrary?.folders.length) ? (
                      <div className="px-3 py-6 text-center text-xs text-slate-500">No folders found in this library.</div>
                    ) : null}
                    {!isLoading && browseScope === 'section' && visibleOutlineRows.length === 0 ? (
                      <div className="px-3 py-6 text-center text-xs text-slate-500">No headings found in this scope.</div>
                    ) : null}
                  </>
                ) : (
                  <>
                    {items.map((item, index) => renderLibraryRowButton(item, index))}
                    {!isLoading && items.length === 0 && (
                      <div className="px-3 py-6 text-center text-xs text-slate-500">No rows found in this scope.</div>
                    )}
                  </>
                )}
              </div>
            </div> : (
              <button
                type="button"
                onClick={() => setShowBrowseRows(true)}
                className="w-full rounded-app border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-left text-xs text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-300"
              >
                Browse library folders
              </button>
            )}
            {selectedLibraryItem ? (
              <div className="flex items-center gap-2 rounded-app border border-emerald-100 bg-emerald-50 px-2 py-1.5 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
                <span className="min-w-0 flex-1 truncate font-semibold" title={stripRichText(selectedLibraryItem.description)}>{stripRichText(selectedLibraryItem.description) || selectedLibraryItem.type}</span>
                <button type="button" disabled={!canInsert} onClick={() => requestInsertRows(insertItems, insertMode)} className="workspace-primary-btn shrink-0 px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-50"><Check className="h-3.5 w-3.5" /> Insert</button>
              </div>
            ) : null}
            {insertError && <p role="alert" className="text-xs text-red-700 dark:text-red-300">{insertError}</p>}
            {contextError && <p role="alert" className="text-xs text-amber-700 dark:text-amber-300">Shared requirements could not be loaded. {contextError}</p>}
            {requiresStoredContext && !contextReady && !contextError && <p role="status" className="text-xs text-slate-500">Loading shared requirements…</p>}
            {loadError && (
              <div className="rounded-app border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                SQLite lazy load failed, using any metadata rows available. {loadError}
              </div>
            )}
          </section> : null}

          {selectedLibraryItem || showInsertOptions ? <section className="space-y-1.5 rounded-app-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-surface-900">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>Insertion options</span>
              <span className="shrink-0 font-medium">{insertItems.length.toLocaleString()} row{insertItems.length === 1 ? '' : 's'} ready</span>
            </div>

            {showInsertOptions ? <>
            <div className="grid gap-1" role="group" aria-label="Insertion mode">
              {INSERT_MODES.map((mode) => {
                const isActive = insertMode === mode;
                const isDisabled = !modeAvailable(mode);
                const isSuggested = suggestedInsertMode === mode && !isDisabled;
                return (
                  <button
                    key={mode}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setInsertMode(mode)}
                    aria-pressed={isActive}
                    title={`${isDisabled ? getInsertModeUnavailableReason(mode) : getInsertModeDetail(mode)} ${getInsertModeResult(mode)}`}
                    className={`flex min-h-8 w-full items-center gap-2 rounded-app border px-2 py-1 text-left text-xs transition ${isActive ? 'border-emerald-400 bg-emerald-50 font-semibold text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200 dark:hover:bg-surface-800'} ${isDisabled ? 'cursor-not-allowed opacity-45' : ''}`}
                  >
                    <span className="min-w-0 flex-1 truncate">{getInsertModePlainTitle(mode)}</span>
                    {isSuggested ? <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Suggested</span> : null}
                    {isActive ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
            {selectedLibraryItem ? <p className="text-[11px] leading-4 text-slate-500 dark:text-slate-400">{getInsertModeDetail(insertMode)} {getInsertModeResult(insertMode)}</p> : null}

            <div className="grid grid-cols-2 gap-2">
            <label className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Destination
              <select value={destinationValue} onChange={(event) => setDestinationValue(event.target.value)} className="mt-1 w-full rounded-app border border-slate-200 bg-white px-2 py-1.5 text-xs normal-case tracking-normal text-slate-900 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100">
                {destinations.map((destination) => <option key={destination.key} value={destination.key}>{destination.label}</option>)}
              </select>
            </label>
            <label className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Placement
              <select value={placement} onChange={(event) => setPlacement(event.target.value as LibraryInsertPlacement)} className="mt-1 w-full rounded-app border border-slate-200 bg-white px-2 py-1.5 text-xs normal-case tracking-normal text-slate-900 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100">
                <option value="BOTTOM">Bottom of destination</option>
                <option value="TOP">Top of destination</option>
                <option value="AFTER_SELECTED" disabled={!anchorItem}>After selected bill row</option>
                <option value="BEFORE_SELECTED" disabled={!anchorItem}>Before selected bill row</option>
              </select>
            </label>
            </div>
            {!anchorItem && (placement === 'AFTER_SELECTED' || placement === 'BEFORE_SELECTED') ? (
              <div className="rounded-app border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                Select exactly one bill row in the bill before using before/after placement.
              </div>
            ) : null}
            </> : null}

            {showInsertOptions && previewRows.length > 0 ? <details className="overflow-hidden rounded-app border border-emerald-100 bg-emerald-50 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
              <summary className="cursor-pointer px-2 py-1.5 font-medium hover:bg-emerald-100/50 dark:hover:bg-emerald-950/50">
                Preview {insertItems.length.toLocaleString()} row{insertItems.length === 1 ? '' : 's'} · {insertSummary.priced.toLocaleString()} priced, {insertSummary.headings.toLocaleString()} headings, {insertSummary.comments.toLocaleString()} comments{insertSummary.other ? `, ${insertSummary.other.toLocaleString()} other` : ''}
              </summary>
              {previewRows.length > 0 ? (
                <div className="border-t border-emerald-100 bg-white/70 dark:border-emerald-900/50 dark:bg-surface-950/55">
                  {previewRows.map((item) => {
                    const badge = getRowBadge(item);
                    const description = stripRichText(item.description || '').trim();
                    return (
                      <div
                        key={item.id}
                        className="grid grid-cols-[80px_minmax(0,1fr)_92px] gap-2 border-b border-emerald-50 px-3 py-1.5 text-xs last:border-b-0 dark:border-emerald-950/40"
                        style={{ paddingLeft: getPreviewIndent(item) }}
                      >
                        <span className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">{item.reference || '-'}</span>
                        <span className="min-w-0" title={description}>
                          <span className="block truncate font-medium text-slate-800 dark:text-slate-100">{description || item.type}</span>
                          <span className="block truncate text-[10px] text-slate-400 dark:text-slate-500">{getStandardsRowTypeLabel(item)}</span>
                        </span>
                        <span className={`justify-self-end rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${badge.classes}`}>
                          {badge.label}
                        </span>
                      </div>
                    );
                  })}
                  {hiddenPreviewCount > 0 ? (
                    <div className="border-t border-emerald-100 px-3 py-1.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/50 dark:text-emerald-200">
                      Plus {hiddenPreviewCount.toLocaleString()} more row{hiddenPreviewCount === 1 ? '' : 's'}.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </details> : null}
          </section> : null}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="min-w-0 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            {pathLabel ? <span className="block truncate">{pathLabel}</span> : <span>Choose a library scope.</span>}
            <label className="inline-flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={keepPanelOpen}
                onChange={(event) => setKeepPanelOpen(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-600 dark:bg-surface-900"
              />
              <Pin className="h-3 w-3" />
              Keep open after insert
            </label>
          </div>
          <button
            type="button"
            disabled={!canInsert}
            onClick={() => {
              requestInsertRows(insertItems, insertMode);
            }}
            className="workspace-primary-btn px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Insert into bill
          </button>
        </div>
      </div>
      {pendingInsertPlan && pendingInsertSummary ? (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={(event) => event.stopPropagation()}>
          <div className="w-full max-w-xl overflow-hidden rounded-app-xl border border-slate-200 bg-white shadow-[0_24px_80px_-30px_rgba(15,23,42,0.75)] dark:border-slate-700 dark:bg-surface-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div>
                <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                  Confirm insert plan
                </div>
                <h3 className="mt-3 text-base font-semibold text-slate-950 dark:text-slate-50">
                  Insert {pendingInsertPlan.rows.length.toLocaleString()} standard row{pendingInsertPlan.rows.length === 1 ? '' : 's'}?
                </h3>
                <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                  This insert includes a larger or structured scope. Check the destination and row mix before continuing.
                </p>
              </div>
              <button type="button" onClick={() => setPendingInsertPlan(null)} className="workspace-icon-btn" aria-label="Cancel standards insert plan">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4 text-sm">
              <div className="grid gap-2 rounded-app border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-300">
                <div><span className="font-semibold text-slate-800 dark:text-slate-100">Scope:</span> {getInsertModePlainTitle(pendingInsertPlan.mode)}</div>
                <div><span className="font-semibold text-slate-800 dark:text-slate-100">Destination:</span> {pendingInsertPlan.destinationLabel}</div>
                <div><span className="font-semibold text-slate-800 dark:text-slate-100">Placement:</span> {pendingInsertPlan.placementLabel}</div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="rounded-app border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-surface-950">
                  <div className="font-semibold text-slate-950 dark:text-slate-50">{pendingInsertSummary.priced.toLocaleString()}</div>
                  <div className="text-slate-500 dark:text-slate-400">priced</div>
                </div>
                <div className="rounded-app border border-emerald-200 bg-emerald-50 px-2 py-2 dark:border-emerald-900/60 dark:bg-emerald-950/25">
                  <div className="font-semibold text-emerald-800 dark:text-emerald-100">{pendingInsertSummary.headings.toLocaleString()}</div>
                  <div className="text-emerald-700 dark:text-emerald-200">headings</div>
                </div>
                <div className="rounded-app border border-amber-200 bg-amber-50 px-2 py-2 dark:border-amber-900/60 dark:bg-amber-950/25">
                  <div className="font-semibold text-amber-800 dark:text-amber-100">{pendingInsertSummary.comments.toLocaleString()}</div>
                  <div className="text-amber-700 dark:text-amber-200">comments</div>
                </div>
                <div className="rounded-app border border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-surface-950">
                  <div className="font-semibold text-slate-950 dark:text-slate-50">{pendingInsertPlan.rows.length.toLocaleString()}</div>
                  <div className="text-slate-500 dark:text-slate-400">total</div>
                </div>
              </div>

              <div className="overflow-hidden rounded-app border border-slate-200 dark:border-slate-700">
                <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-400">
                  Preview
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {pendingPreviewRows.map((item) => {
                    const badge = getRowBadge(item);
                    const description = stripRichText(item.description || '').trim();
                    return (
                      <div
                        key={item.id}
                        className="grid grid-cols-[80px_minmax(0,1fr)_92px] gap-2 border-b border-slate-100 px-3 py-2 text-xs last:border-b-0 dark:border-slate-800"
                        style={{ paddingLeft: getPreviewIndent(item) }}
                      >
                        <span className="truncate font-mono text-slate-500 dark:text-slate-400">{item.reference || '-'}</span>
                        <span className="min-w-0" title={description}>
                          <span className="block truncate font-medium text-slate-800 dark:text-slate-100">{description || item.type}</span>
                          <span className="block truncate text-[10px] text-slate-400 dark:text-slate-500">{getStandardsRowTypeLabel(item)}</span>
                        </span>
                        <span className={`justify-self-end rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${badge.classes}`}>
                          {badge.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {pendingHiddenCount > 0 ? (
                  <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-400">
                    Plus {pendingHiddenCount.toLocaleString()} more row{pendingHiddenCount === 1 ? '' : 's'}.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
              <button type="button" onClick={() => setPendingInsertPlan(null)} className="workspace-secondary-btn px-4 py-2 text-sm">
                Change mode
              </button>
              <button
                type="button"
                onClick={() => {
                  const { rows, destination } = pendingInsertPlan;
                  setPendingInsertPlan(null);
                  insertPreparedRows(rows, destination);
                }}
                className="workspace-primary-btn px-4 py-2 text-sm"
              >
                Insert rows
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isFloating ? (
        <button
          type="button"
          aria-label="Resize standards insert panel"
          title="Drag to resize standards insert panel"
          onMouseDown={(event) => {
            event.preventDefault();
            resizeStartRef.current = {
              mouseX: event.clientX,
              mouseY: event.clientY,
              width: panelSize.width,
              height: panelSize.height,
              mode: 'floating-corner',
            };
            setIsResizingPanel(true);
          }}
          className={`absolute bottom-0 right-0 h-6 w-6 cursor-nwse-resize rounded-br-app-xl ${isResizingPanel ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-transparent hover:bg-slate-100 dark:hover:bg-surface-800'}`}
        >
          <span className="absolute bottom-1 right-1 h-3 w-3 border-b-2 border-r-2 border-slate-300 dark:border-slate-600" />
        </button>
      ) : null}
      {insertDragPreview ? (
        <div
          className="pointer-events-none fixed z-[240] max-w-[260px] rounded-app-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 shadow-[0_18px_45px_-18px_rgba(15,23,42,0.45)] dark:border-emerald-800 dark:bg-surface-900 dark:text-emerald-100"
          style={{
            left: insertDragPreview.x + 14,
            top: insertDragPreview.y + 14,
          }}
        >
          <div className="truncate">{insertDragPreview.label}</div>
          <div className="mt-1 text-[11px] font-medium">{LIBRARY_DROP_HINT}</div>
          <div className="mt-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-300">
            {insertDragPreview.modeLabel} | {insertDragPreview.rowCount.toLocaleString()} row{insertDragPreview.rowCount === 1 ? '' : 's'} to insert
          </div>
          <div className="mt-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
            Release to insert here. Hold Ctrl for Item only.
          </div>
        </div>
      ) : null}
    </aside>
  );
}
