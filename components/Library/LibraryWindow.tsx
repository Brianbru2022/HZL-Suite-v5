import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardPaste, Coins, Copy, Download, Folder, Info, Library as LibraryIcon, Loader2, MoreVertical, Pencil, Plus, RotateCcw, Sparkles, Star, Upload, X, Banknote, Trash2 } from 'lucide-react';
import { ItemTypeDropdown, itemTypeOptions } from '../UI/ItemTypeDropdown';
import { ContextMenu, shouldUseNativeContextMenu } from '../UI/ContextMenu';
import type { ContextMenuEntry, ContextMenuState } from '../UI/ContextMenu';
import { MenuActionList } from '../UI/MenuActionList';
import { PopoverMenu } from '../UI/PopoverMenu';
import { LibraryDiagnosticsDialog } from './LibraryDiagnosticsDialog';
import { LibraryEmptyState } from './LibraryEmptyState';
import { LibraryExportDialog } from './LibraryExportDialog';
import { LibraryImportDialog } from './LibraryImportDialog';
import { LibraryGovernanceDialog } from './LibraryGovernanceDialog';
import { LibraryItemDescription } from './LibraryItemDescription';
import { LibraryItemPreviewPanel } from './LibraryItemPreviewPanel';
import { LibraryItemSearchResults } from './LibraryItemSearchResults';
import { LibraryMoveUnderDialog } from './LibraryMoveUnderDialog';
import { LibraryOutlineHeader } from './LibraryOutlineHeader';
import { LibraryOutlineTable } from './LibraryOutlineTable';
import { LibraryOutlineCreateDialog, type OutlineCreateDraft, type OutlineCreateMode } from './LibraryOutlineCreateDialog';
import { LibraryOperationStatus, type LibraryOperationPhase, type LibraryOperationStatusModel } from './LibraryOperationStatus';
import { LibraryPageItemsSection } from './LibraryPageItemsSection';
import { LibraryPageRows } from './LibraryPageRows';
import { LibrarySectionItemHeader } from './LibrarySectionItemHeader';
import { LibrarySectionItemsTable } from './LibrarySectionItemsTable';
import { LibraryToolbar } from './LibraryToolbar';
import { LibraryVirtualizedRows } from './LibraryVirtualizedRows';
import { useLibraryExportActions } from './useLibraryExportActions';
import { useLibraryImportJsonActions } from './useLibraryImportJsonActions';
import { useLibraryPackActions } from './useLibraryPackActions';
import { useLibrarySplitJsonActions } from './useLibrarySplitJsonActions';
import { formatCurrency, normalizeUnit } from '../../utils/formatting';
import { buildLibraryCommentMarkers } from '../../utils/libraryCommentMarkers';
import { useHelpContext } from '../../hooks/useHelpContext';
import { useAppContextOptional } from '../../contexts/AppContext';
import { HelpButton } from '../Help/HelpButton';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useToast } from '../../contexts/ToastContext';
import { generateId } from '../../utils/generateId';
import type { BoQBill, BoQItem, BoQPage, BoQSection, DimensionRow, ItemLibrary, LibraryFolder, LibraryPage, LibrarySection, Project } from '../../types';
import {
  clearSectionContent,
  countLibraryPricedItems,
  deleteFolder,
  deleteLibrary,
  deleteLibraryItem,
  deletePage,
  deleteSection,
  exportLibrariesFromRepository,
  bulkMoveLibrarySections,
  appendLibraryItems,
  inferLibrarySectionHierarchy,
  insertLibrarySection,
  listLibraryCatalogs,
  listLibraryItems,
  moveLibrarySection,
  renameSection,
  reorderLibrarySections,
  replaceLibraryItems,
  searchLibraryItems,
  setLibraryFavorite,
  updateLibraryGovernance,
  type LibrarySearchResult,
} from '../../utils/libraryRepository';
import {
  PRICED_TYPES,
  canEditLibrary,
  canExportLibraryAll,
  filterLibrarySectionsForSearch,
  findLibrarySectionNode,
  findLibrarySectionParentContext,
  flattenLibrarySections,
  flattenLibrarySectionsWithContext,
  flattenLibrarySectionsWithDepth,
  formatOrderedLabel,
  getLibraryHeadingLevel,
  getLibraryItemLabel,
  getLibraryItemReference,
  getLibraryPricedCount,
  getLibrarySectionLevelLabel,
  getLibraryStats,
  getVisibleLibraryRows,
  inferParentSectionOrderRefCandidates,
  isLibraryHeadingType,
  isLibrarySectionDescendant,
  normalizeLibraryLabel,
  sortLibrariesForDisplay,
  sortLibraryNodes,
  sortLibrarySections,
  type VisibleLibraryRow,
} from '../../utils/libraryViewModel';
import { APP_NAME } from '../../utils/branding';

const LIBRARY_ROW_ESTIMATE = 52;
const LIBRARY_VIRTUALIZE_THRESHOLD = 180;
const LIBRARY_ITEM_PAGE_SIZE = 500;

type LibraryWindowProps = {
  libraries: ItemLibrary[];
  setLibraries: React.Dispatch<React.SetStateAction<ItemLibrary[]>>;
  openPrompt: (type: string, context?: Record<string, unknown>) => void;
  openEditor: (
    billId: string | null,
    sectionId: string | null,
    item?: BoQItem | null,
    type?: BoQItem['type'],
    libId?: string,
    folderId?: string,
    libSectionId?: string,
    itemIdx?: number,
    pageId?: string | null,
  ) => void;
  isAiLoading: boolean;
  onImport: () => void;
  onExport: (data: unknown, filename: string) => void;
  onUseInProject: (item: BoQItem, sourceItems: BoQItem[]) => void;
  onClose: () => void;
  embedded?: boolean;
};

type OutlineMoveContext = { section: LibrarySection; depth: number; parent: LibrarySection | null };
type LibraryItemRevision = {
  ids: { libraryId: string; folderId: string; sectionId: string; pageId?: string | null };
  items: BoQItem[];
  pageId?: string;
  action: string;
};

const workspaceMetaChipClass = 'rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-emerald-900/40 dark:bg-[rgb(24_36_32_/_0.92)] dark:text-slate-200';

function LibraryOptionsMenu({
  menuKey,
  openMenuKey,
  setOpenMenuKey,
  label,
  trigger,
  buttonClassName,
  children,
}: {
  menuKey: string;
  openMenuKey: string | null;
  setOpenMenuKey: React.Dispatch<React.SetStateAction<string | null>>;
  label: string;
  trigger?: React.ReactNode;
  buttonClassName?: string;
  children: React.ReactNode;
}) {
  const isOpen = openMenuKey === menuKey;

  return (
    <PopoverMenu
      ariaLabel={label}
      width={256}
      estimatedHeight={360}
      open={isOpen}
      onOpenChange={(nextOpen) => setOpenMenuKey(nextOpen ? menuKey : null)}
      menuClassName="workspace-popover-menu p-1"
      trigger={({ ref, isOpen: menuIsOpen, toggle }) => (
        <button
          ref={ref}
          type="button"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={menuIsOpen}
          onClick={toggle}
          className={buttonClassName || 'workspace-secondary-btn px-2.5 py-2'}
        >
          {trigger || <MoreVertical className="h-4 w-4" />}
        </button>
      )}
    >
      {() => children}
    </PopoverMenu>
  );
}

function cloneDimensionRows(rows: DimensionRow[] | undefined): DimensionRow[] | undefined {
  return rows?.map((row) => ({ ...row, id: generateId() }));
}

function cloneBoQItem(item: BoQItem): BoQItem {
  return {
    ...item,
    id: generateId(),
    reference: '',
    dimensionRows: cloneDimensionRows(item.dimensionRows),
    rateBuildUp: item.rateBuildUp ? structuredClone(item.rateBuildUp) : undefined,
  };
}

function cloneImportedBoQItem(item: BoQItem): BoQItem {
  return {
    ...item,
    id: generateId(),
    type: item.type || 'PRICED',
    reference: item.reference || '',
    description: item.description || '',
    unit: normalizeUnit(item.unit || ''),
    quantity: item.quantity || 0,
    rate: item.rate || 0,
    total: item.total || 0,
    dimensionRows: cloneDimensionRows(item.dimensionRows),
  };
}

function flattenPageToItems(page: BoQPage, options?: { includePageHeading?: boolean }): BoQItem[] {
  const items: BoQItem[] = [];
  if (options?.includePageHeading) {
    items.push({
      id: generateId(),
      type: 'MAJOR_HEADING',
      reference: '',
      description: page.name || 'Page',
      unit: '',
      quantity: 0,
      rate: 0,
      total: 0,
    });
  }
  items.push(...(page.items || []).map(cloneImportedBoQItem));
  return items;
}

function flattenSectionToItems(section: BoQSection, options?: { includeSectionHeading?: boolean; includePageHeadings?: boolean }): BoQItem[] {
  const items: BoQItem[] = [];
  if (options?.includeSectionHeading) {
    items.push({
      id: generateId(),
      type: 'GENERAL_HEADING',
      reference: '',
      description: section.name,
      unit: '',
      quantity: 0,
      rate: 0,
      total: 0,
    });
  }

  if (section.pages?.length) {
    section.pages.forEach((page) => {
      items.push(...flattenPageToItems(page, { includePageHeading: options?.includePageHeadings }));
    });
    return items;
  }

  items.push(...(section.items || []).map(cloneImportedBoQItem));
  return items;
}

function flattenBillToItems(bill: BoQBill, options?: { includeBillHeading?: boolean; includeSectionHeadings?: boolean; includePageHeadings?: boolean }): BoQItem[] {
  const items: BoQItem[] = [];
  if (options?.includeBillHeading) {
    items.push({
      id: generateId(),
      type: 'GENERAL_HEADING',
      reference: '',
      description: bill.name,
      unit: '',
      quantity: 0,
      rate: 0,
      total: 0,
    });
  }

  if (bill.sections?.length) {
    bill.sections.forEach((section) => {
      items.push(...flattenSectionToItems(section, {
        includeSectionHeading: options?.includeSectionHeadings,
        includePageHeadings: options?.includePageHeadings,
      }));
    });
    return items;
  }

  items.push(...(bill.items || []).map(cloneImportedBoQItem));
  return items;
}

function flattenLibrarySectionToImportPages(library: ItemLibrary, folder: LibraryFolder, section: LibrarySection): Array<{ name: string; items: BoQItem[] }> {
  const sectionLabel = [library.name, folder.orderRef || folder.name, section.orderRef || section.name]
    .filter(Boolean)
    .join(' / ');

  if (section.pages?.length) {
    return section.pages.map((page) => ({
      name: [sectionLabel, page.orderRef || page.name].filter(Boolean).join(' / '),
      items: ((page.items || []) as BoQItem[]).map(cloneImportedBoQItem),
    }));
  }

  return [{
    name: sectionLabel || section.name || library.name,
    items: ((section.items || []) as BoQItem[]).map(cloneImportedBoQItem),
  }];
}

function flattenLibrariesToImportPages(libraries: ItemLibrary[]): Array<{ name: string; items: BoQItem[] }> {
  return libraries.flatMap((library) =>
    (library.folders || []).flatMap((folder) =>
      (folder.sections || []).flatMap((section) =>
        flattenLibrarySectionToImportPages(library, folder, section)
      )
    )
  ).filter((page) => page.items.length > 0);
}

function isProjectImportShape(value: unknown): value is Project {
  return typeof value === 'object'
    && value !== null
    && typeof (value as Project).id === 'string'
    && typeof (value as Project).name === 'string'
    && Array.isArray((value as Project).bills);
}

function parseProjectJsonImport(data: unknown): Project[] {
  const values = Array.isArray(data) ? data : [data];
  if (values.length === 0 || !values.every(isProjectImportShape)) {
    throw new Error(`This JSON does not look like an ${APP_NAME} project export.`);
  }
  return values as Project[];
}

function isItemLibraryImportShape(value: unknown): value is ItemLibrary {
  return typeof value === 'object'
    && value !== null
    && typeof (value as ItemLibrary).id === 'string'
    && typeof (value as ItemLibrary).name === 'string'
    && Array.isArray((value as ItemLibrary).folders);
}

function parseLibraryJsonImport(data: unknown): ItemLibrary[] {
  if (
    typeof data === 'object'
    && data !== null
    && Array.isArray((data as { libraries?: unknown }).libraries)
  ) {
    const libraries = (data as { libraries: unknown[] }).libraries;
    if (libraries.length > 0 && libraries.every(isItemLibraryImportShape)) {
      return libraries as ItemLibrary[];
    }
  }

  const values = Array.isArray(data) ? data : [data];
  if (values.length === 0 || !values.every(isItemLibraryImportShape)) {
    throw new Error(`This JSON does not look like an ${APP_NAME} library export.`);
  }
  return values as ItemLibrary[];
}

function isBoQItemImportShape(value: unknown): value is BoQItem {
  return typeof value === 'object'
    && value !== null
    && typeof (value as BoQItem).description === 'string'
    && (
      typeof (value as BoQItem).type === 'string'
      || typeof (value as BoQItem).unit === 'string'
      || typeof (value as BoQItem).reference === 'string'
    );
}

function parseBoQItemsJsonImport(data: unknown): BoQItem[] | null {
  const sourceItems = (() => {
    if (Array.isArray(data)) return data;
    if (
      typeof data === 'object'
      && data !== null
      && Array.isArray((data as { items?: unknown }).items)
    ) {
      return (data as { items: unknown[] }).items;
    }
    return null;
  })();

  if (!sourceItems || sourceItems.length === 0 || !sourceItems.every(isBoQItemImportShape)) {
    return null;
  }

  return (sourceItems as BoQItem[]).map(cloneImportedBoQItem);
}

type CustomLibraryImportRow = {
  code?: string;
  'General Heading'?: string;
  'Major heading'?: string;
  subsection?: string;
  Unit?: string;
  comment?: string;
  'item description'?: string;
};

type CustomLibraryImportShape = {
  library_name?: string;
  standard?: string;
  section?: string;
  item_count?: number;
  structure?: string[];
  items: CustomLibraryImportRow[];
};

function isCustomLibraryImportShape(value: unknown): value is CustomLibraryImportShape {
  if (typeof value !== 'object' || value === null || !Array.isArray((value as CustomLibraryImportShape).items)) {
    return false;
  }
  return (value as CustomLibraryImportShape).items.some((row) => (
    typeof row === 'object'
    && row !== null
    && (
      typeof (row as CustomLibraryImportRow)['item description'] === 'string'
      || typeof (row as CustomLibraryImportRow).code === 'string'
      || typeof (row as CustomLibraryImportRow)['General Heading'] === 'string'
      || typeof (row as CustomLibraryImportRow)['Major heading'] === 'string'
      || typeof (row as CustomLibraryImportRow).subsection === 'string'
    )
  ));
}

function extractUnitFromComment(comment: string | undefined) {
  const match = comment?.match(/Unit:\s*([^;]+)/i);
  return normalizeUnit(match?.[1] || '');
}

function readJsHeapSample() {
  const memory = (performance as Performance & {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }).memory;

  if (!memory) {
    return { sampledAt: new Date().toISOString() };
  }

  return {
    usedJsHeapSize: memory.usedJSHeapSize,
    totalJsHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
    sampledAt: new Date().toISOString(),
  };
}

function rowLooksLikeMeasuredItem(row: CustomLibraryImportRow) {
  const unit = extractUnitFromComment(row.comment);
  const noteText = `${row.comment || ''} ${row['item description'] || ''}`.toLowerCase();
  if (!unit || unit === 'item') {
    return !(
      noteText.includes('not a measured item')
      || noteText.includes('use as heading/spec note')
      || noteText.includes('library note only')
      || noteText.includes('definition / note')
      || noteText.includes('tender information / note')
    );
  }
  return true;
}

function createLineItem(type: BoQItem['type'], description: string, unit = '', reference = ''): BoQItem {
  return {
    id: generateId(),
    type,
    reference,
    description,
    unit,
    quantity: 0,
    rate: 0,
    total: 0,
  };
}

function buildItemsFromCustomLibraryImport(data: CustomLibraryImportShape) {
  const items: BoQItem[] = [];
  let lastGeneralHeading = '';
  let lastMajorHeading = '';
  let lastSubsection = '';
  let lastComment = '';

  data.items.forEach((row) => {
    const generalHeading = (row['General Heading'] || data.section || '').trim();
    const majorHeading = (row['Major heading'] || '').trim();
    const subsection = (row.subsection || '').trim();
    const comment = (row.comment || '').trim();
    const description = (row['item description'] || '').trim();
    const reference = (row.code || '').trim();
    const explicitUnit = normalizeUnit((row.Unit || '').trim());

    if (generalHeading && generalHeading !== lastGeneralHeading) {
      items.push(createLineItem('GENERAL_HEADING', generalHeading));
      lastGeneralHeading = generalHeading;
      lastMajorHeading = '';
      lastSubsection = '';
      lastComment = '';
    }

    if (majorHeading && majorHeading !== lastMajorHeading) {
      items.push(createLineItem('MAJOR_HEADING', majorHeading));
      lastMajorHeading = majorHeading;
      lastSubsection = '';
      lastComment = '';
    }

    if (subsection && subsection !== lastSubsection) {
      items.push(createLineItem('SUB_SECTION', subsection));
      lastSubsection = subsection;
      lastComment = '';
    }

    if (comment && comment !== lastComment) {
      items.push(createLineItem('COMMENT', comment));
      lastComment = comment;
    }

    if (description) {
      const isMeasured = rowLooksLikeMeasuredItem(row);
      const unit = explicitUnit || extractUnitFromComment(row.comment);
      items.push(createLineItem(isMeasured ? 'PRICED' : 'COMMENT', description, isMeasured ? unit : '', isMeasured ? reference : ''));
    }
  });

  return items;
}

function getSectionPricedCount(section: LibrarySection | null | undefined) {
  const sourceItems = section?.pages?.length
    ? section.pages.flatMap((page) => page.items || [])
    : (section?.items || []);
  return sourceItems.filter((item) => ['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(item.type)).length;
}

function appendSectionToOutlineTree(sections: LibrarySection[], inserted: LibrarySection): LibrarySection[] {
  if (!inserted.parentSectionId) return [...sections, inserted];
  let changed = false;
  const nextSections = sections.map((section) => {
    if (section.id === inserted.parentSectionId) {
      changed = true;
      return {
        ...section,
        subSections: [...(section.subSections || []), inserted],
      };
    }
    if (!section.subSections?.length) return section;
    const nextSubSections = appendSectionToOutlineTree(section.subSections, inserted);
    if (nextSubSections === section.subSections) return section;
    changed = true;
    return {
      ...section,
      subSections: nextSubSections,
    };
  });
  return changed ? nextSections : sections;
}

function addInsertedSectionToLibraries(
  libraries: ItemLibrary[],
  libraryId: string,
  folderId: string,
  inserted: LibrarySection
): ItemLibrary[] {
  return libraries.map((library) => {
    if (library.id !== libraryId) return library;
    return {
      ...library,
      sectionCount: (library.sectionCount || 0) + 1,
      folders: library.folders.map((folder) => {
        if (folder.id !== folderId) return folder;
        return {
          ...folder,
          sectionCount: (folder.sectionCount || 0) + 1,
          sections: appendSectionToOutlineTree(folder.sections || [], inserted),
        };
      }),
    };
  });
}

export const LibraryWindow = ({
  libraries,
  setLibraries,
  openPrompt,
  openEditor,
  isAiLoading,
  onImport,
  onExport,
  onUseInProject,
  onClose,
  embedded = false,
}: LibraryWindowProps) => {
  const app = useAppContextOptional();
  const { askConfirm } = useConfirm();
  const { showToast } = useToast();
  useHelpContext('LIBRARY');
  const [selectedLibId, setSelectedLibId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [librarySectionSearch, setLibrarySectionSearch] = useState('');
  const [collapsedHeadingIds, setCollapsedHeadingIds] = useState<Record<string, boolean>>({});
  const [collapsedPageIds, setCollapsedPageIds] = useState<Record<string, boolean>>({});
  const [collapsedLibrarySectionIds, setCollapsedLibrarySectionIds] = useState<Record<string, boolean>>({});
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isDebugDialogOpen, setIsDebugDialogOpen] = useState(false);
  const [isGovernanceDialogOpen, setIsGovernanceDialogOpen] = useState(false);
  const [isDebugLogging, setIsDebugLogging] = useState(false);
  const [debugLogPath, setDebugLogPath] = useState<string | null>(null);
  const [isExportingLibraries, setIsExportingLibraries] = useState(false);
  const [isImportingLibraryPack, setIsImportingLibraryPack] = useState(false);
  const [isSplittingLibraryJson, setIsSplittingLibraryJson] = useState(false);
  const [isExportingFolderSectionsJson, setIsExportingFolderSectionsJson] = useState(false);
  const [isExportingLibrarySectionsJson, setIsExportingLibrarySectionsJson] = useState(false);
  const [libraryPackProgress, setLibraryPackProgress] = useState('');
  const [libraryOperationStatus, setLibraryOperationStatus] = useState<LibraryOperationStatusModel | null>(null);
  const [isLibraryOperationCancelRequested, setIsLibraryOperationCancelRequested] = useState(false);
  const [exportPermissions, setExportPermissions] = useState({
    allowExportAll: false,
    allowExportFolders: false,
    allowExportSections: false,
    allowLibraryEditing: false,
  });
  const [selectedExportLibraryIds, setSelectedExportLibraryIds] = useState<Record<string, boolean>>({});
  const libraryItemsScrollRef = useRef<HTMLDivElement>(null);
  const debugMetricsRef = useRef<Record<string, unknown>>({});
  const cancelLibraryOperationRef = useRef(false);
  const [loadedSectionItems, setLoadedSectionItems] = useState<BoQItem[]>([]);
  const [libraryItemsRevision, setLibraryItemsRevision] = useState(0);
  const [lastLibraryItemRevision, setLastLibraryItemRevision] = useState<LibraryItemRevision | null>(null);
  const [loadedItemTotalCount, setLoadedItemTotalCount] = useState(0);
  const [loadedItemPricedCount, setLoadedItemPricedCount] = useState(0);
  const [isLoadingLibraryItems, setIsLoadingLibraryItems] = useState(false);
  const [searchScopes, setSearchScopes] = useState({ library: false, folder: true, section: true });
  const [searchResults, setSearchResults] = useState<LibrarySearchResult[]>([]);
  const [searchResultCount, setSearchResultCount] = useState(0);
  const [isSearchingLibraryItems, setIsSearchingLibraryItems] = useState(false);
  const [openLibraryOptionsMenu, setOpenLibraryOptionsMenu] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [draggedLibrarySection, setDraggedLibrarySection] = useState<{ sectionId: string; folderId: string } | null>(null);
  const [selectedOutlineSectionIds, setSelectedOutlineSectionIds] = useState<Record<string, boolean>>({});
  const [editingSectionDrafts, setEditingSectionDrafts] = useState<Record<string, { orderRef: string; name: string }>>({});
  const [outlineCreateDraft, setOutlineCreateDraft] = useState<OutlineCreateDraft | null>(null);
  const [isMoveUnderDialogOpen, setIsMoveUnderDialogOpen] = useState(false);
  const [moveUnderQuery, setMoveUnderQuery] = useState('');
  const [isItemPaneCollapsed, setIsItemPaneCollapsed] = useState(false);
  const [isOutlinePaneCollapsed, setIsOutlinePaneCollapsed] = useState(false);
  const [activeLibraryPricedCount, setActiveLibraryPricedCount] = useState<number | null>(null);
  const [debugSample, setDebugSample] = useState<{
    usedJsHeapSize?: number;
    totalJsHeapSize?: number;
    jsHeapSizeLimit?: number;
    sampledAt: string;
  }>({ sampledAt: new Date().toISOString() });

  const openLibraryContextMenu = (
    event: React.MouseEvent<HTMLElement>,
    label: string,
    items: ContextMenuEntry[],
  ) => {
    if (shouldUseNativeContextMenu(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    setOpenLibraryOptionsMenu(null);
    setContextMenu({ x: event.clientX, y: event.clientY, label, items });
  };

  const libraryStatsById = useMemo(() => {
    const next = new Map<string, { folders: number; sections: number; pages: number; items: number }>();
    libraries.forEach((library: any) => {
      if (library?.id) {
        next.set(library.id, getLibraryStats(library));
      }
    });
    return next;
  }, [libraries]);

  const activeLib = libraries.find((l: any) => l.id === selectedLibId);
  const activeFolder = activeLib?.folders.find((f: any) => f.id === selectedFolderId);
  const activeSection = findLibrarySectionNode(activeFolder?.sections || [], selectedSectionId);
  const sortedFolders = useMemo(
    () => activeLib
      ? sortLibraryNodes((activeLib.folders || []).map((folder: any) => ({
          ...folder,
          sections: sortLibrarySections(folder.sections || []),
        })))
      : [],
    [activeLib]
  );
  const sortedSections = activeFolder ? sortLibrarySections(activeFolder.sections || []) : [];
  const sortedPages = activeSection ? sortLibraryNodes((activeSection.pages || []) as LibraryPage[]) : [];
  const sortedLibraries = useMemo(() => sortLibrariesForDisplay(libraries), [libraries]);
  const startLibraryOperation = (
    label: string,
    options: Partial<Omit<LibraryOperationStatusModel, 'label' | 'phase' | 'startedAt'>> = {}
  ) => {
    cancelLibraryOperationRef.current = false;
    setIsLibraryOperationCancelRequested(false);
    setLibraryOperationStatus({
      label,
      phase: 'running',
      startedAt: new Date().toISOString(),
      ...options,
    });
    setLibraryPackProgress(options.detail || label);
  };
  const updateLibraryOperation = (patch: Partial<LibraryOperationStatusModel>) => {
    setLibraryOperationStatus((current) => current ? { ...current, ...patch } : current);
    if (patch.detail) setLibraryPackProgress(patch.detail);
  };
  const finishLibraryOperation = (
    phase: Exclude<LibraryOperationPhase, 'running'>,
    patch: Partial<LibraryOperationStatusModel> = {}
  ) => {
    setLibraryOperationStatus((current) => current ? {
      ...current,
      ...patch,
      phase,
      finishedAt: new Date().toISOString(),
    } : current);
    setLibraryPackProgress('');
    setIsLibraryOperationCancelRequested(false);
    cancelLibraryOperationRef.current = false;
  };
  const requestCancelLibraryOperation = () => {
    cancelLibraryOperationRef.current = true;
    setIsLibraryOperationCancelRequested(true);
    updateLibraryOperation({ detail: 'Stopping after the current file finishes...' });
  };

  const outlineRows = useMemo(
    () => activeFolder ? flattenLibrarySectionsWithContext(sortLibrarySections(activeFolder.sections || [])) : [],
    [activeFolder]
  );
  const createDialogFolder = outlineCreateDraft && activeLib
    ? activeLib.folders.find((folder: any) => folder.id === outlineCreateDraft.folderId)
    : null;
  const createDialogParentRows = useMemo(
    () => createDialogFolder
      ? flattenLibrarySectionsWithContext(sortLibrarySections(createDialogFolder.sections || []))
      : [],
    [createDialogFolder]
  );
  const selectedOutlineIds = useMemo(
    () => Object.entries(selectedOutlineSectionIds).filter(([, selected]) => selected).map(([id]) => id),
    [selectedOutlineSectionIds]
  );
  const selectedOutlineContexts = useMemo(
    () => selectedOutlineIds
      .map((id) => outlineRows.find((entry) => entry.section.id === id))
      .filter(Boolean) as OutlineMoveContext[],
    [outlineRows, selectedOutlineIds]
  );
  const moveUnderRows = useMemo(() => {
    if (!activeFolder) return [];
    const query = moveUnderQuery.trim().toLowerCase();
    return outlineRows
      .filter((entry) => !selectedOutlineIds.includes(entry.section.id))
      .filter((entry) => !selectedOutlineIds.some((selectedId) => {
        const selected = findLibrarySectionNode(activeFolder.sections || [], selectedId);
        return selected && isLibrarySectionDescendant(selected, entry.section.id);
      }))
      .filter((entry) => {
        if (!query) return true;
        return [
          entry.section.orderRef || '',
          entry.section.name || '',
          getLibrarySectionLevelLabel(entry.depth),
          entry.parent ? formatOrderedLabel(entry.parent.orderRef, entry.parent.name, 'Parent') : 'Level 1',
        ].join(' ').toLowerCase().includes(query);
      });
  }, [activeFolder, moveUnderQuery, outlineRows, selectedOutlineIds]);

  const refreshLibraryMetadata = async () => {
    if (app?.persistenceBackend === 'localStorage') return;
    setLibraries(await listLibraryCatalogs());
  };

  useEffect(() => {
    if (app?.persistenceBackend === 'localStorage') return;
    if (libraries.length > 0) return;
    let cancelled = false;
    const refreshCatalogs = async () => {
      try {
        const catalogs = await listLibraryCatalogs();
        if (!cancelled && catalogs.length > 0) {
          setLibraries(catalogs);
        }
      } catch (error) {
        console.warn('Unable to refresh library catalogs', error);
      }
    };
    void refreshCatalogs();
    return () => {
      cancelled = true;
    };
  }, [app?.persistenceBackend, libraries.length, setLibraries]);

  const loadSectionItems = async (offset = 0, limit = LIBRARY_ITEM_PAGE_SIZE) => {
    if (app?.persistenceBackend === 'localStorage') return;
    if (!activeSection || activeSection.pages?.length) return;
    setIsLoadingLibraryItems(true);
    try {
      const result = await listLibraryItems({ sectionId: activeSection.id, limit, offset });
      setLoadedSectionItems((current) => offset > 0 ? [...current, ...result.items] : result.items);
      setLoadedItemTotalCount(result.totalCount);
      setLoadedItemPricedCount(result.pricedCount);
    } catch (error) {
      console.error('Unable to load library section items', error);
      setLoadedSectionItems(activeSection.items || []);
      setLoadedItemTotalCount(activeSection.itemCount || activeSection.items?.length || 0);
      setLoadedItemPricedCount(activeSection.pricedCount || getSectionPricedCount(activeSection));
    } finally {
      setIsLoadingLibraryItems(false);
    }
  };

  useEffect(() => {
    if (app?.persistenceBackend === 'localStorage') {
      setLoadedSectionItems([]);
      setLoadedItemTotalCount(0);
      setLoadedItemPricedCount(0);
      return;
    }
    if (!activeSection || activeSection.pages?.length) {
      setLoadedSectionItems([]);
      setLoadedItemTotalCount(0);
      setLoadedItemPricedCount(0);
      return;
    }
    let cancelled = false;
    const loadItems = async () => {
      setIsLoadingLibraryItems(true);
      try {
        const result = await listLibraryItems({ sectionId: activeSection.id, limit: LIBRARY_ITEM_PAGE_SIZE });
        if (cancelled) return;
        setLoadedSectionItems(result.items);
        setLoadedItemTotalCount(result.totalCount);
        setLoadedItemPricedCount(result.pricedCount);
      } catch (error) {
        if (!cancelled) {
          console.error('Unable to load library section items', error);
          setLoadedSectionItems(activeSection.items || []);
          setLoadedItemTotalCount(activeSection.itemCount || activeSection.items?.length || 0);
          setLoadedItemPricedCount(activeSection.pricedCount || getSectionPricedCount(activeSection));
        }
      } finally {
        if (!cancelled) setIsLoadingLibraryItems(false);
      }
    };
    void loadItems();
    return () => { cancelled = true; };
  }, [activeSection?.id, activeSection?.pages?.length, app?.persistenceBackend]);

  useEffect(() => {
    if (!activeSection) return;
    const headingIds = new Set<string>();
    const collectHeadingIds = (items: BoQItem[] | undefined) => {
      (items || []).forEach((item) => {
        if (item?.id && isLibraryHeadingType(item.type)) {
          headingIds.add(item.id);
        }
      });
    };

    collectHeadingIds(activeSection.pages?.length ? activeSection.items : loadedSectionItems);
    (activeSection.pages || []).forEach((page: any) => collectHeadingIds(page.items));

    setCollapsedHeadingIds((prev) => {
      const next: Record<string, boolean> = {};
      headingIds.forEach((id) => {
        next[id] = prev[id] ?? true;
      });
      return next;
    });
  }, [activeSection, loadedSectionItems]);

  useEffect(() => {
    if (!activeSection) return;
    const pageIds = new Set<string>((activeSection.pages || []).map((page: any) => page.id).filter(Boolean));
    setCollapsedPageIds((prev) => {
      const next: Record<string, boolean> = {};
      pageIds.forEach((id: string) => {
        next[id] = prev[id] ?? true;
      });
      return next;
    });
  }, [activeSection]);

  useEffect(() => {
    if (!isDebugDialogOpen) return;

    const sample = () => setDebugSample(readJsHeapSample());
    sample();
    const intervalId = window.setInterval(sample, 1500);

    return () => window.clearInterval(intervalId);
  }, [isDebugDialogOpen]);

  useEffect(() => {
    setSelectedOutlineSectionIds({});
    setEditingSectionDrafts({});
  }, [selectedFolderId, selectedLibId]);

  useEffect(() => {
    if (app?.persistenceBackend === 'localStorage') {
      setActiveLibraryPricedCount(null);
      return;
    }
    if (!activeLib?.id) {
      setActiveLibraryPricedCount(null);
      return;
    }
    let cancelled = false;
    if (typeof activeLib.pricedCount === 'number') {
      setActiveLibraryPricedCount(activeLib.pricedCount);
      return;
    }
    setActiveLibraryPricedCount(null);
    const loadPricedCount = async () => {
      try {
        const count = await countLibraryPricedItems(activeLib.id);
        if (!cancelled) setActiveLibraryPricedCount(count);
      } catch (error) {
        console.warn('Unable to count priced library items', error);
        if (!cancelled) setActiveLibraryPricedCount(getLibraryPricedCount(activeLib));
      }
    };
    void loadPricedCount();
    return () => {
      cancelled = true;
    };
  }, [activeLib?.id, activeLib?.pricedCount, app?.persistenceBackend]);

  const activeLibraryPricedTotal = activeLibraryPricedCount ?? (activeLib ? getLibraryPricedCount(activeLib) : 0);
  const exportableLibraries = useMemo(
    () => libraries.filter(canExportLibraryAll),
    [libraries]
  );
  const lockedLibraryCount = libraries.length - exportableLibraries.length;
  const selectedExportLibraries = useMemo(
    () => exportableLibraries.filter((library: any) => selectedExportLibraryIds[library.id]),
    [exportableLibraries, selectedExportLibraryIds]
  );
  const selectedExportItemCount = useMemo(
    () => selectedExportLibraries.reduce((count: number, library: any) => count + getLibraryStats(library).items, 0),
    [selectedExportLibraries]
  );

  useEffect(() => {
    if (!isExportDialogOpen) return;
    setSelectedExportLibraryIds((current) => {
      const next: Record<string, boolean> = {};
      exportableLibraries.forEach((library: any) => {
        next[library.id] = current[library.id] ?? true;
      });
      return next;
    });
  }, [exportableLibraries, isExportDialogOpen]);

  const activeSectionStats = useMemo(() => {
    if (!activeSection) {
      return { pricedCount: 0, pageCount: 0, itemCount: 0 };
    }
    const pageCount = activeSection.pages?.length || 0;
    if (activeSection.storageMode === 'sqlite' || activeSection.itemCount !== undefined) {
      return {
        pricedCount: activeSection.pages?.length ? (activeSection.pricedCount || 0) : loadedItemPricedCount,
        pageCount,
        itemCount: activeSection.pages?.length ? (activeSection.itemCount || 0) : loadedItemTotalCount,
      };
    }
    const itemCount = pageCount
      ? activeSection.pages.reduce((count: number, page: any) => count + (page.items?.length || 0), 0)
      : activeSection.items.length;
    return {
      pricedCount: getSectionPricedCount(activeSection),
      pageCount,
      itemCount,
    };
  }, [activeSection, loadedItemPricedCount, loadedItemTotalCount]);

  const activeSectionPricedCount = activeSectionStats.pricedCount;
  const activeSectionPageCount = activeSectionStats.pageCount;
  const activeLibCanEdit = canEditLibrary(activeLib);
  const displayLibraryName = activeLib ? normalizeLibraryLabel(activeLib.name, 'Library') : null;
  const displayFolderName = activeFolder ? formatOrderedLabel(activeFolder.orderRef, activeFolder.name, 'Folder') : null;
  const displaySectionName = activeSection ? formatOrderedLabel(activeSection.orderRef, activeSection.name, 'Section') : null;
  const normalizedLibrarySectionSearch = librarySectionSearch.trim().toLowerCase();
  const isItemSearchActive = Boolean(activeLib && normalizedLibrarySectionSearch);
  const filteredFolders = useMemo(() => {
    if (!normalizedLibrarySectionSearch) return sortedFolders;
    return sortedFolders
      .map((folder: any) => {
        const folderLabel = formatOrderedLabel(folder.orderRef, folder.name, 'Folder').toLowerCase();
        const matchingSections = filterLibrarySectionsForSearch(folder.sections || [], normalizedLibrarySectionSearch);

        if (folderLabel.includes(normalizedLibrarySectionSearch)) {
          return folder;
        }

        if (matchingSections.length > 0) {
          return { ...folder, sections: matchingSections };
        }

        return null;
      })
      .filter(Boolean) as any[];
  }, [normalizedLibrarySectionSearch, sortedFolders]);

  useEffect(() => {
    if (app?.persistenceBackend === 'localStorage') {
      setSearchResults([]);
      setSearchResultCount(0);
      return;
    }
    if (!activeLib || !normalizedLibrarySectionSearch) {
      setSearchResults([]);
      setSearchResultCount(0);
      return;
    }
    let cancelled = false;
    const runSearch = async () => {
      setIsSearchingLibraryItems(true);
      try {
        const result = await searchLibraryItems({
          query: normalizedLibrarySectionSearch,
          libraryId: activeLib.id,
          folderId: activeFolder?.id || null,
          sectionId: activeSection?.id || null,
          includeLibrary: searchScopes.library,
          includeFolder: searchScopes.folder,
          includeSection: searchScopes.section,
          limit: 200,
        });
        if (!cancelled) {
          setSearchResults(result.items);
          setSearchResultCount(result.totalCount);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Unable to search library items', error);
          setSearchResults([]);
          setSearchResultCount(0);
        }
      } finally {
        if (!cancelled) setIsSearchingLibraryItems(false);
      }
    };
    const timeoutId = window.setTimeout(() => { void runSearch(); }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    activeLib?.id,
    activeFolder?.id,
    activeSection?.id,
    normalizedLibrarySectionSearch,
    searchScopes.library,
    searchScopes.folder,
    searchScopes.section,
    app?.persistenceBackend,
  ]);

  const toggleHeadingCollapsed = (itemId: string) => {
    setCollapsedHeadingIds((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const togglePageCollapsed = (pageId: string) => {
    setCollapsedPageIds((prev) => ({
      ...prev,
      [pageId]: !prev[pageId],
    }));
  };

  const toggleLibrarySectionCollapsed = (sectionId: string) => {
    setCollapsedLibrarySectionIds((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const openExportDialog = () => {
    const next: Record<string, boolean> = {};
    exportableLibraries.forEach((library: any) => {
      next[library.id] = true;
    });
    setSelectedExportLibraryIds(next);
    setIsExportDialogOpen(true);
  };

  const handleExportLibraries = async () => {
    if (isExportingLibraries) return;
    if (exportableLibraries.length === 0) {
      showToast({
        type: 'info',
        message: lockedLibraryCount > 0
          ? 'All current libraries were imported as protected copies and cannot be exported again.'
          : 'There are no libraries available to export yet.',
      });
      return;
    }
    if (selectedExportLibraries.length === 0) {
      showToast({
        type: 'info',
        message: 'Select at least one library to export.',
      });
      return;
    }
    if (selectedExportItemCount > 100000) {
      const ok = await askConfirm({
        title: 'Large JSON export',
        message: `This JSON export contains about ${selectedExportItemCount.toLocaleString()} item rows. JSON can be slow and very large; the SQLite library pack is the safer route for large standards. Continue with JSON?`,
        confirmLabel: 'Export JSON',
        cancelLabel: 'Cancel',
        variant: 'danger',
      });
      if (!ok) return;
    }

    setIsExportingLibraries(true);
    startLibraryOperation('Exporting library JSON', {
      detail: `Rebuilding ${selectedExportLibraries.length.toLocaleString()} selected librar${selectedExportLibraries.length === 1 ? 'y' : 'ies'} from SQLite...`,
      totalCount: selectedExportLibraries.length,
    });
    try {
      const rebuiltLibraries = await exportLibrariesFromRepository(
        selectedExportLibraries.map((library: any) => library.id),
        exportPermissions
      );
      const payload = {
        format: 'QS_PRO_LIBRARY_EXPORT',
        version: 1 as const,
        markImportedLibrariesAsLocked: !exportPermissions.allowExportAll,
        permissions: exportPermissions,
        libraries: rebuiltLibraries,
      };

      onExport(
        payload,
        `qs-libraries-${new Date().toISOString().split('T')[0]}${!exportPermissions.allowExportAll ? '-protected' : ''}.json`
      );
      setIsExportDialogOpen(false);
      showToast({
        type: 'success',
        message: lockedLibraryCount > 0
          ? `Exported ${selectedExportLibraries.length} librar${selectedExportLibraries.length === 1 ? 'y' : 'ies'}. ${lockedLibraryCount} protected librar${lockedLibraryCount === 1 ? 'y was' : 'ies were'} skipped.`
          : `Exported ${selectedExportLibraries.length} librar${selectedExportLibraries.length === 1 ? 'y' : 'ies'}.`,
      });
      finishLibraryOperation('complete', {
        detail: `Exported ${selectedExportLibraries.length.toLocaleString()} librar${selectedExportLibraries.length === 1 ? 'y' : 'ies'} as JSON.`,
        completedCount: selectedExportLibraries.length,
        nextSteps: ['Share or archive the JSON file', 'Use SQLite pack for larger restores', 'Keep protected-copy permissions documented'],
      });
    } catch (error) {
      console.error('Library export failed', error);
      finishLibraryOperation('error', {
        detail: 'Library JSON export failed.',
        error: error instanceof Error ? error.message : String(error),
        nextSteps: ['Try fewer libraries', 'Use Export SQLite pack', 'Check browser download permissions'],
      });
      showToast({
        type: 'error',
        message: 'Library export failed. Try exporting fewer libraries, or export one folder/section at a time for very large standards.',
      });
    } finally {
      setIsExportingLibraries(false);
    }
  };

  const {
    handleExportLibraryPack,
    handleImportLibraryPack,
  } = useLibraryPackActions({
    exportableLibraries,
    lockedLibraryCount,
    selectedExportLibraries,
    exportPermissions,
    isExportingLibraries,
    isImportingLibraryPack,
    setIsExportingLibraries,
    setIsImportingLibraryPack,
    setIsExportDialogOpen,
    setLibraries,
    setLibraryOperationStatus,
    setLibraryPackProgress,
    showToast,
    startLibraryOperation,
    updateLibraryOperation,
    finishLibraryOperation,
  });

  const { handleSplitLibraryJsonSections } = useLibrarySplitJsonActions({
    isSplittingLibraryJson,
    setIsSplittingLibraryJson,
    cancelLibraryOperationRef,
    parseLibraryJsonImport,
    showToast,
    startLibraryOperation,
    updateLibraryOperation,
    finishLibraryOperation,
  });

  const {
    handleExportFolder,
    handleExportFolderSectionNames,
    handleExportSection,
    handleExportFolderSections,
    handleExportLibrarySections,
    handleExportLibrarySectionNames,
  } = useLibraryExportActions({
    activeLib,
    isExportingFolderSectionsJson,
    isExportingLibrarySectionsJson,
    setIsExportingFolderSectionsJson,
    setIsExportingLibrarySectionsJson,
    cancelLibraryOperationRef,
    onExport,
    showToast,
    startLibraryOperation,
    updateLibraryOperation,
    finishLibraryOperation,
  });

  const handleMoveLibrarySection = async (targetFolderId: string, targetParentSectionId?: string | null, explicitSectionId?: string) => {
    const sectionId = explicitSectionId || draggedLibrarySection?.sectionId;
    if (!sectionId || sectionId === targetParentSectionId) return;
    try {
      setLibraries(await moveLibrarySection(sectionId, targetFolderId, targetParentSectionId || null));
      setSelectedFolderId(targetFolderId);
      showToast({ type: 'success', message: targetParentSectionId ? 'Moved section into subsection.' : 'Moved section to folder level.' });
    } catch (error) {
      console.error('Library section move failed', error);
      showToast({ type: 'error', message: 'Could not move that section. Try again.' });
    } finally {
      setDraggedLibrarySection(null);
    }
  };

  const getSectionContext = (sectionId: string) => outlineRows.find((entry) => entry.section.id === sectionId);

  const getActionSectionIds = (sectionId: string) => selectedOutlineIds.includes(sectionId) ? selectedOutlineIds : [sectionId];

  const openOutlineCreateDialog = (mode: OutlineCreateMode = 'level1', section?: any, folderOverride?: any) => {
    if (!activeLib) return;
    const folder = folderOverride || activeFolder || sortedFolders[0];
    if (!folder) {
      showToast({ type: 'info', message: 'Create a folder before adding outline rows.' });
      return;
    }
    const context = section ? getSectionContext(section.id) : (activeSection ? getSectionContext(activeSection.id) : null);
    const parentSectionId = mode === 'child'
      ? (section?.id || activeSection?.id || '')
      : mode === 'same'
        ? (context?.parent?.id || '')
        : '';

    setOutlineCreateDraft({
      folderId: folder.id,
      parentSectionId,
      orderRef: '',
      name: '',
      mode,
    });
  };

  const updateOutlineCreateMode = (mode: OutlineCreateMode) => {
    setOutlineCreateDraft((current) => {
      if (!current) return current;
      const folder = activeLib?.folders.find((entry: any) => entry.id === current.folderId);
      const selectedContext = activeSection ? findLibrarySectionParentContext(folder?.sections || [], activeSection.id) : null;
      return {
        ...current,
        mode,
        parentSectionId: mode === 'child'
          ? (activeSection?.id || current.parentSectionId)
          : mode === 'same'
            ? (selectedContext?.parent?.id || '')
            : mode === 'level1'
              ? ''
              : current.parentSectionId,
      };
    });
  };

  const handleCreateOutlineRow = async () => {
    if (!activeLib || !outlineCreateDraft) return;
    if (!canEditLibrary(activeLib)) {
      showToast({ type: 'error', message: 'Library editing is disabled for this imported library.' });
      return;
    }
    const name = outlineCreateDraft.name.trim();
    if (!name) {
      showToast({ type: 'info', message: 'Enter a section title first.' });
      return;
    }

    const newSectionId = generateId();
    try {
      const insertedSection = await insertLibrarySection(activeLib.id, outlineCreateDraft.folderId, {
        id: newSectionId,
        parentSectionId: outlineCreateDraft.parentSectionId || undefined,
        orderRef: outlineCreateDraft.orderRef.trim() || undefined,
        name,
        items: [],
        pages: [],
        subSections: [],
      });
      setLibraries((current) => addInsertedSectionToLibraries(current, activeLib.id, outlineCreateDraft.folderId, insertedSection));
      setSelectedFolderId(outlineCreateDraft.folderId);
      setSelectedSectionId(newSectionId);
      if (outlineCreateDraft.parentSectionId) {
        setCollapsedLibrarySectionIds((current) => ({ ...current, [outlineCreateDraft.parentSectionId]: false }));
      }
      setOutlineCreateDraft(null);
      showToast({ type: 'success', message: outlineCreateDraft.parentSectionId ? 'Added subsection.' : 'Added section.' });
    } catch (error) {
      console.error('Create outline row failed', error);
      showToast({ type: 'error', message: 'Could not add that outline row.' });
    }
  };

  const toggleOutlineSelection = (sectionId: string, selected: boolean) => {
    setSelectedOutlineSectionIds((current) => {
      const next = { ...current };
      if (selected) next[sectionId] = true;
      else delete next[sectionId];
      return next;
    });
  };

  const handleBulkMoveSections = async (sectionIds: string[], targetFolderId: string, targetParentSectionId?: string | null, successMessage = 'Moved selected outline rows.') => {
    const ids = [...new Set(sectionIds)].filter(Boolean);
    if (!ids.length) return;
    try {
      setLibraries(await bulkMoveLibrarySections(ids, targetFolderId, targetParentSectionId || null));
      setSelectedFolderId(targetFolderId);
      setSelectedOutlineSectionIds(Object.fromEntries(ids.map((id) => [id, true])));
      if (targetParentSectionId) {
        setCollapsedLibrarySectionIds((current) => ({ ...current, [targetParentSectionId]: false }));
      }
      showToast({ type: 'success', message: successMessage });
    } catch (error) {
      console.error('Bulk section move failed', error);
      showToast({ type: 'error', message: 'Could not move the selected outline rows.' });
    }
  };

  const getSelectionSiblingGroup = (ids: string[]) => {
    const contexts = ids.map((id) => getSectionContext(id)).filter(Boolean) as OutlineMoveContext[];
    if (contexts.length !== ids.length || contexts.length === 0) {
      return { contexts, reason: 'Select one or more visible outline rows first.' };
    }
    const parentId = contexts[0].parent?.id || null;
    const depth = contexts[0].depth;
    const mixedLevel = contexts.some((context) => (context.parent?.id || null) !== parentId || context.depth !== depth);
    if (mixedLevel) {
      return { contexts, reason: 'This action needs selected rows from the same level and parent.' };
    }
    const siblings = outlineRows.filter((entry) => (entry.parent?.id || null) === parentId && entry.depth === depth);
    const selectedIndexes = ids
      .map((id) => siblings.findIndex((entry) => entry.section.id === id))
      .filter((index) => index >= 0)
      .sort((a, b) => a - b);
    return { contexts, siblings, selectedIndexes, parentId, depth, reason: '' };
  };

  const handlePromoteSections = async (sectionId: string) => {
    if (!activeFolder) return;
    const ids = getActionSectionIds(sectionId);
    const group = getSelectionSiblingGroup(ids);
    if (group.reason) {
      showToast({ type: 'info', message: group.reason });
      return;
    }
    if (group.contexts.some((context) => !context.parent)) {
      showToast({ type: 'info', message: 'Selected rows are already at Level 1.' });
      return;
    }
    const targetParentId = group.contexts[0].parent?.parentSectionId || null;
    await handleBulkMoveSections(ids, activeFolder.id, targetParentId, targetParentId ? 'Promoted selected rows one level.' : 'Promoted selected rows to folder level.');
  };

  const handleDemoteSections = async (sectionId: string) => {
    if (!activeFolder) return;
    const ids = getActionSectionIds(sectionId);
    const group = getSelectionSiblingGroup(ids);
    if (group.reason || !group.siblings || !group.selectedIndexes) {
      showToast({ type: 'info', message: group.reason || 'Select rows from one level before demoting.' });
      return;
    }
    const previousSibling = group.siblings[group.selectedIndexes[0] - 1]?.section;
    if (!previousSibling) {
      showToast({ type: 'info', message: 'Demote needs a previous sibling to become the parent.' });
      return;
    }
    await handleBulkMoveSections(ids, activeFolder.id, previousSibling.id, 'Demoted selected rows under the previous section.');
  };

  const handleMoveSectionInSiblings = async (sectionId: string, direction: -1 | 1) => {
    if (!activeFolder) return;
    const idsToMove = selectedOutlineIds.includes(sectionId) ? selectedOutlineIds : [sectionId];
    const group = getSelectionSiblingGroup(idsToMove);
    if (group.reason || !group.siblings || !group.selectedIndexes) {
      showToast({ type: 'info', message: group.reason || 'Select rows from one level before reordering.' });
      return;
    }
    const nextOrder = group.siblings.map((entry) => entry.section.id);
    const indexes = group.selectedIndexes;
    if (!indexes.length) return;
    if (direction < 0 && indexes[0] === 0) {
      showToast({ type: 'info', message: 'Selected rows are already at the top of this level.' });
      return;
    }
    if (direction > 0 && indexes[indexes.length - 1] === nextOrder.length - 1) {
      showToast({ type: 'info', message: 'Selected rows are already at the bottom of this level.' });
      return;
    }
    if (direction < 0) {
      indexes.forEach((idx) => {
        [nextOrder[idx - 1], nextOrder[idx]] = [nextOrder[idx], nextOrder[idx - 1]];
      });
    } else {
      [...indexes].reverse().forEach((idx) => {
        [nextOrder[idx], nextOrder[idx + 1]] = [nextOrder[idx + 1], nextOrder[idx]];
      });
    }
    try {
      setLibraries(await reorderLibrarySections(activeFolder.id, group.parentId || null, nextOrder));
      setSelectedOutlineSectionIds(Object.fromEntries(idsToMove.map((id) => [id, true])));
      showToast({ type: 'success', message: direction < 0 ? 'Moved selected rows up.' : 'Moved selected rows down.' });
    } catch (error) {
      console.error('Section reorder failed', error);
      showToast({ type: 'error', message: 'Could not reorder that outline row.' });
    }
  };

  const handleInferFolderHierarchy = async (sectionIds?: string[]) => {
    if (!activeLib || !activeFolder) return;
    try {
      const result = await inferLibrarySectionHierarchy(activeLib.id, activeFolder.id, sectionIds);
      setLibraries(result.libraries);
      setSelectedOutlineSectionIds({});
      showToast({
        type: result.movedCount > 0 ? 'success' : 'info',
        message: result.movedCount === 0 && result.missingParentCount === 0
          ? 'No hierarchy changes were inferred for the selected refs. Choose rows like 3.010 or run infer on the full folder.'
          : result.missingParentCount > 0
          ? `Inferred ${result.movedCount.toLocaleString()} outline move${result.movedCount === 1 ? '' : 's'}; ${result.missingParentCount.toLocaleString()} row${result.missingParentCount === 1 ? '' : 's'} had no matching parent.`
          : `Inferred ${result.movedCount.toLocaleString()} outline move${result.movedCount === 1 ? '' : 's'}.`,
      });
    } catch (error) {
      console.error('Hierarchy inference failed', error);
      showToast({ type: 'error', message: 'Could not infer hierarchy for this folder.' });
    }
  };

  const startInlineSectionEdit = (section: any) => {
    setEditingSectionDrafts((current) => ({
      ...current,
      [section.id]: {
        orderRef: section.orderRef || '',
        name: section.name || '',
      },
    }));
  };

  const cancelInlineSectionEdit = (sectionId: string) => {
    setEditingSectionDrafts((current) => {
      const next = { ...current };
      delete next[sectionId];
      return next;
    });
  };

  const saveInlineSectionEdit = async (section: any) => {
    if (!activeLib || !activeFolder) return;
    const draft = editingSectionDrafts[section.id];
    if (!draft) return;
    const name = draft.name.trim() || section.name;
    const orderRef = draft.orderRef.trim();
    try {
      const nextLibraries = await renameSection(section.id, orderRef || undefined, name);
      setLibraries(nextLibraries);
      cancelInlineSectionEdit(section.id);
      showToast({ type: 'success', message: 'Updated outline row.' });
    } catch (error) {
      console.error('Inline section edit failed', error);
      showToast({ type: 'error', message: 'Could not update that outline row.' });
    }
  };

  const handleDuplicateSectionNode = async (folder: any, section: any) => {
    if (!activeLib) return;
    try {
      const duplicateName = `${normalizeLibraryLabel(section.name, 'Section')} copy`;
      const insertedSection = await insertLibrarySection(activeLib.id, folder.id, {
        id: generateId(),
        parentSectionId: section.parentSectionId,
        orderRef: section.orderRef,
        name: duplicateName,
        items: [],
        pages: [],
        subSections: [],
      });
      setLibraries((current) => addInsertedSectionToLibraries(current, activeLib.id, folder.id, insertedSection));
      showToast({ type: 'success', message: 'Duplicated outline row structure.' });
    } catch (error) {
      console.error('Section duplicate failed', error);
      showToast({ type: 'error', message: 'Could not duplicate that outline row.' });
    }
  };

  const handleDeleteSelectedSections = async () => {
    if (!activeLib || selectedOutlineIds.length === 0) return;
    if (!canEditLibrary(activeLib)) {
      showToast({ type: 'error', message: 'Library editing is disabled for this imported library.' });
      return;
    }
    const ok = await askConfirm({
      title: 'Delete selected outline rows',
      message: `Delete ${selectedOutlineIds.length} selected outline row${selectedOutlineIds.length === 1 ? '' : 's'} and their child rows/items? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      let nextLibraries = libraries;
      for (const sectionId of selectedOutlineIds) {
        nextLibraries = await deleteSection(sectionId);
      }
      setLibraries(nextLibraries);
      setSelectedOutlineSectionIds({});
      if (selectedSectionId && selectedOutlineIds.includes(selectedSectionId)) {
        setSelectedSectionId(null);
      }
      showToast({ type: 'success', message: `Deleted ${selectedOutlineIds.length} selected outline row${selectedOutlineIds.length === 1 ? '' : 's'}.` });
    } catch (error) {
      console.error('Selected section delete failed', error);
      showToast({ type: 'error', message: 'Could not delete the selected outline rows.' });
    }
  };

  const handleStartDebugLogging = async () => {
    try {
      const { mkdir, writeTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const relativePath = `diagnostics/library/library-diagnostics-${timestamp}.ndjson`;
      await mkdir('diagnostics/library', { baseDir: BaseDirectory.AppLocalData, recursive: true });
      await writeTextFile(relativePath, '', { baseDir: BaseDirectory.AppLocalData, create: true });
      setDebugLogPath(relativePath);
      setIsDebugLogging(true);
      showToast({
        type: 'success',
        message: `Library diagnostics logging started. Log file: ${relativePath}`,
      });
    } catch (error) {
      console.error('Unable to start library diagnostics logging', error);
      showToast({
        type: 'error',
        message: 'Could not start Library diagnostics logging. If you are in the desktop app, this is now a real file-write error rather than a desktop detection problem.',
      });
    }
  };

  const handleStopDebugLogging = () => {
    setIsDebugLogging(false);
    showToast({
      type: 'info',
      message: debugLogPath
        ? `Library diagnostics logging stopped. Latest log: ${debugLogPath}`
        : 'Library diagnostics logging stopped.',
    });
  };

  const handleDeleteLibrary = async (libraryId: string, libraryName: string) => {
    const ok = await askConfirm({
      title: 'Delete library',
      message: `Delete "${libraryName}" and all of its folders, sections, pages, and items? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;
    setLibraries(await deleteLibrary(libraryId));
    if (selectedLibId === libraryId) {
      setSelectedLibId(null);
      setSelectedFolderId(null);
      setSelectedSectionId(null);
    }
    showToast({ type: 'success', message: `Deleted library "${libraryName}".` });
  };

  const handleToggleLibraryFavorite = async (library: any) => {
    const nextFavorite = !library.favorite;
    setLibraries(await setLibraryFavorite(library.id, nextFavorite));
    showToast({
      type: 'success',
      message: nextFavorite
        ? `Added "${normalizeLibraryLabel(library.name, 'Library')}" to favourites.`
        : `Removed "${normalizeLibraryLabel(library.name, 'Library')}" from favourites.`,
    });
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (!activeLib) return;
    if (!canEditLibrary(activeLib)) {
      showToast({ type: 'error', message: 'Library editing is disabled for this imported library.' });
      return;
    }
    const ok = await askConfirm({
      title: 'Delete folder',
      message: `Delete "${folderName}" and all of its sections, pages, and items? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;
    setLibraries(await deleteFolder(folderId));
    if (selectedFolderId === folderId) {
      setSelectedFolderId(null);
      setSelectedSectionId(null);
    }
    showToast({ type: 'success', message: `Deleted folder "${folderName}".` });
  };

  const handleDeleteSection = async (folderId: string, sectionId: string, sectionName: string) => {
    if (!activeLib) return;
    if (!canEditLibrary(activeLib)) {
      showToast({ type: 'error', message: 'Library editing is disabled for this imported library.' });
      return;
    }
    const ok = await askConfirm({
      title: 'Delete section',
      message: `Delete "${sectionName}" and all of its items/pages? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;
    setLibraries(await deleteSection(sectionId));
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(null);
    }
    showToast({ type: 'success', message: `Deleted section "${sectionName}".` });
  };

  const handleClearSectionContent = async (sectionId: string, sectionName: string) => {
    if (!activeLib) return;
    if (!canEditLibrary(activeLib)) {
      showToast({ type: 'error', message: 'Library editing is disabled for this imported library.' });
      return;
    }
    const ok = await askConfirm({
      title: 'Clear section content',
      message: `Delete the bill items and pages inside "${sectionName}" while keeping the section and child sections? This action cannot be undone.`,
      confirmLabel: 'Clear content',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;
    startLibraryOperation('Clearing section content', { detail: `Clearing "${sectionName}"...` });
    try {
      setLibraries(await clearSectionContent(sectionId));
      if (selectedSectionId === sectionId) {
        setLoadedSectionItems([]);
        setLoadedItemTotalCount(0);
        setLoadedItemPricedCount(0);
      }
      finishLibraryOperation('complete', { detail: `Cleared content from "${sectionName}".` });
      showToast({ type: 'success', message: `Cleared content from "${sectionName}".` });
    } catch (error) {
      console.error('Clear section content failed', error);
      finishLibraryOperation('error', {
        detail: `Could not clear content from "${sectionName}".`,
        error: error instanceof Error ? error.message : String(error),
      });
      showToast({ type: 'error', message: `Could not clear content from "${sectionName}".` });
    }
  };

  const handleDeletePage = async (pageId: string, pageName: string) => {
    if (!activeLib || !activeFolder || !activeSection) return;
    if (!canEditLibrary(activeLib)) {
      showToast({ type: 'error', message: 'Library editing is disabled for this imported library.' });
      return;
    }
    const ok = await askConfirm({
      title: 'Delete page',
      message: `Delete "${pageName}" and all of its items? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;
    setLibraries(await deletePage(pageId));
    showToast({ type: 'success', message: `Deleted page "${pageName}".` });
  };

  const handleDeleteLibraryItem = async (itemId: string, itemDescription: string, pageId?: string) => {
    if (!activeLib || !activeFolder || !activeSection) return;
    if (!canEditLibrary(activeLib)) {
      showToast({ type: 'error', message: 'Library editing is disabled for this imported library.' });
      return;
    }
    const ok = await askConfirm({
      title: 'Delete library item',
      message: `Delete "${itemDescription || 'this library item'}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;
    await deleteLibraryItem(itemId);
    setLoadedSectionItems((items) => items.filter((item) => item.id !== itemId));
    setLibraryItemsRevision((revision) => revision + 1);
    await refreshLibraryMetadata();
    showToast({ type: 'success', message: 'Library item deleted.' });
  };

  const replaceActiveLibraryItems = async (
    sourceItems: BoQItem[],
    nextItems: BoQItem[],
    action: string,
    pageId?: string,
  ) => {
    if (!activeLib || !activeFolder || !activeSection) return;
    if (!canEditLibrary(activeLib)) {
      showToast({ type: 'error', message: 'Library editing is disabled for this imported library.' });
      return;
    }
    const ids = { libraryId: activeLib.id, folderId: activeFolder.id, sectionId: activeSection.id, pageId: pageId || null };
    await replaceLibraryItems(ids, nextItems);
    setLastLibraryItemRevision({ ids, items: structuredClone(sourceItems), pageId, action });
    if (!pageId) {
      setLoadedSectionItems(nextItems);
      setLoadedItemTotalCount(nextItems.length);
      setLoadedItemPricedCount(nextItems.filter((item) => PRICED_TYPES.has(item.type)).length);
    }
    setLibraryItemsRevision((revision) => revision + 1);
    await refreshLibraryMetadata();
    showToast({ type: 'success', message: `${action} You can undo this while the library remains open.` });
  };

  const loadCompleteActiveLibraryScope = async (pageId?: string) => {
    if (!activeSection) return [];
    const result = await listLibraryItems({
      sectionId: activeSection.id,
      pageId: pageId || null,
      limit: 2147483647,
    });
    return result.items;
  };

  const handleDuplicateLibraryItem = async (item: BoQItem, _itemIndex: number, _sourceItems: BoQItem[], pageId?: string) => {
    const completeItems = await loadCompleteActiveLibraryScope(pageId);
    const completeIndex = completeItems.findIndex((candidate) => candidate.id === item.id);
    if (completeIndex < 0) return;
    const nextItems = [...completeItems];
    nextItems.splice(completeIndex + 1, 0, cloneBoQItem(item));
    await replaceActiveLibraryItems(completeItems, nextItems, 'Duplicated library row.', pageId);
  };

  const handleMoveLibraryItem = async (itemIndex: number, sourceItems: BoQItem[], direction: -1 | 1, pageId?: string) => {
    const item = sourceItems[itemIndex];
    if (!item) return;
    const completeItems = await loadCompleteActiveLibraryScope(pageId);
    const completeIndex = completeItems.findIndex((candidate) => candidate.id === item.id);
    const nextIndex = completeIndex + direction;
    if (completeIndex < 0 || nextIndex < 0 || nextIndex >= completeItems.length) return;
    const nextItems = [...completeItems];
    [nextItems[completeIndex], nextItems[nextIndex]] = [nextItems[nextIndex], nextItems[completeIndex]];
    await replaceActiveLibraryItems(completeItems, nextItems, direction < 0 ? 'Moved library row up.' : 'Moved library row down.', pageId);
  };

  const handlePasteLibraryRows = async (pageId?: string) => {
    if (!activeLib || !activeFolder || !activeSection) return;
    if (!navigator.clipboard?.readText) {
      showToast({ type: 'error', message: 'Clipboard access is not available in this desktop session.' });
      return;
    }
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        showToast({ type: 'info', message: 'The clipboard does not contain any rows to add.' });
        return;
      }
      let items: BoQItem[];
      try {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error('Clipboard JSON must be an array of item rows.');
        items = parsed.map((item) => cloneImportedBoQItem(item as BoQItem));
      } catch {
        items = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
          const [description, quantity, unit, rate] = line.split('\t').map((value) => value.trim());
          const parsedQuantity = Number.parseFloat(quantity || '0');
          const parsedRate = Number.parseFloat((rate || '0').replace(/[£,]/g, ''));
          return {
            id: generateId(),
            type: 'PRICED' as const,
            reference: '',
            description,
            unit: normalizeUnit(unit || 'item'),
            quantity: Number.isFinite(parsedQuantity) ? parsedQuantity : 0,
            rate: Number.isFinite(parsedRate) ? parsedRate : 0,
            total: (Number.isFinite(parsedQuantity) ? parsedQuantity : 0) * (Number.isFinite(parsedRate) ? parsedRate : 0),
          };
        });
      }
      if (items.length === 0) {
        showToast({ type: 'info', message: 'No valid rows were found in the clipboard.' });
        return;
      }
      const confirmed = await askConfirm({
        title: 'Paste library rows',
        message: `Add ${items.length.toLocaleString()} row${items.length === 1 ? '' : 's'} to this ${pageId ? 'page' : 'section'}? Tab-separated rows may use description, quantity, unit, and rate columns.`,
        confirmLabel: 'Add rows',
        cancelLabel: 'Cancel',
      });
      if (!confirmed) return;
      await appendLibraryItems({ libraryId: activeLib.id, folderId: activeFolder.id, sectionId: activeSection.id, pageId: pageId || null }, items);
      if (!pageId) await loadSectionItems(0, Math.max(LIBRARY_ITEM_PAGE_SIZE, loadedSectionItems.length + items.length));
      setLibraryItemsRevision((revision) => revision + 1);
      await refreshLibraryMetadata();
      showToast({ type: 'success', message: `Added ${items.length.toLocaleString()} library row${items.length === 1 ? '' : 's'} from the clipboard.` });
    } catch (error) {
      console.error('Paste library rows failed', error);
      showToast({ type: 'error', message: 'Could not add rows from the clipboard.' });
    }
  };

  const handleUndoLibraryItemRevision = async () => {
    if (!lastLibraryItemRevision) return;
    await replaceLibraryItems(lastLibraryItemRevision.ids, lastLibraryItemRevision.items);
    if (!lastLibraryItemRevision.pageId) {
      setLoadedSectionItems(lastLibraryItemRevision.items);
      setLoadedItemTotalCount(lastLibraryItemRevision.items.length);
      setLoadedItemPricedCount(lastLibraryItemRevision.items.filter((item) => PRICED_TYPES.has(item.type)).length);
    }
    setLibraryItemsRevision((revision) => revision + 1);
    await refreshLibraryMetadata();
    showToast({ type: 'success', message: `Undid: ${lastLibraryItemRevision.action}` });
    setLastLibraryItemRevision(null);
  };

  const { handleImportJsonIntoLibraryScope } = useLibraryImportJsonActions({
    activeLib,
    activeFolder,
    activeSection,
    askConfirm,
    showToast,
    parseBoQItemsJsonImport,
    isCustomLibraryImportShape,
    buildItemsFromCustomLibraryImport,
    parseLibraryJsonImport,
    flattenLibrariesToImportPages,
    parseProjectJsonImport,
    flattenBillToItems,
    loadSectionItems,
    refreshLibraryMetadata,
    startLibraryOperation,
    updateLibraryOperation,
    finishLibraryOperation,
  });

  const getRowStyles = (type: string) => {
    const base = 'group border-b border-slate-200/75 transition-colors dark:border-slate-700/80';
    switch (type) {
      case 'GENERAL_HEADING': return `${base} bg-emerald-800 text-white hover:bg-emerald-900 dark:bg-emerald-900 dark:hover:bg-emerald-800`;
      case 'MAJOR_HEADING': return `${base} bg-slate-100 hover:bg-slate-200/80 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50`;
      case 'SUB_SECTION': return `${base} bg-white hover:bg-slate-50 dark:bg-surface-900 dark:hover:bg-surface-800`;
      case 'MINOR_HEADING': return `${base} bg-white hover:bg-slate-50 dark:bg-surface-900 dark:hover:bg-surface-800`;
      case 'COMMENT': return `${base} bg-white/85 hover:bg-slate-50 dark:bg-surface-900/95 dark:hover:bg-surface-800`;
      case 'SUB_COMMENT': return `${base} bg-white/85 hover:bg-slate-50 dark:bg-surface-900/95 dark:hover:bg-surface-800`;
      case 'PROVISIONAL_SUM': return `${base} bg-amber-50/70 hover:bg-amber-50 dark:bg-amber-950/18 dark:hover:bg-amber-950/28`;
      case 'PC_SUM': return `${base} bg-purple-50/70 hover:bg-purple-50 dark:bg-purple-950/18 dark:hover:bg-purple-950/28`;
      default: return `${base} bg-white hover:bg-slate-50 dark:bg-surface-900 dark:hover:bg-surface-800`;
    }
  };

  const getTextStyles = (type: string) => {
    switch (type) {
      case 'GENERAL_HEADING': return 'pl-2 text-lg font-semibold tracking-wide text-white';
      case 'MAJOR_HEADING': return 'pl-2 text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100';
      case 'SUB_SECTION': return 'pl-4 text-sm font-bold text-slate-900 underline decoration-slate-300 underline-offset-4 dark:text-slate-100 dark:decoration-slate-600';
      case 'MINOR_HEADING': return 'pl-6 text-sm font-semibold text-slate-800 dark:text-slate-200';
      case 'COMMENT': return 'pl-8 text-sm font-medium italic text-slate-500 dark:text-slate-400';
      case 'SUB_COMMENT': return 'pl-10 text-sm font-medium italic text-slate-500 dark:text-slate-400';
      case 'PROVISIONAL_SUM': return 'pl-4 text-sm font-bold text-amber-900 dark:text-amber-200';
      case 'PC_SUM': return 'pl-4 text-sm font-bold text-purple-900 dark:text-purple-200';
      default: return 'pl-8 text-sm font-medium text-slate-700 dark:text-slate-300';
    }
  };

  const activeSectionCommentMarkers = useMemo(
    () => buildLibraryCommentMarkers(loadedSectionItems),
    [loadedSectionItems]
  );

  const buildLibraryItemRowActionItems = (
    item: BoQItem,
    idx: number,
    sourceItems: BoQItem[],
    pageId?: string,
  ): ContextMenuEntry[] => {
    if (!activeLib || !activeFolder || !activeSection) return [];
    const isHeading = isLibraryHeadingType(item.type);
    const isCollapsed = isHeading ? !!collapsedHeadingIds[item.id] : false;
    const canEdit = canEditLibrary(activeLib);
    const itemLabel = getLibraryItemLabel(item, idx);
    return [
      { id: 'library-item-use-label', type: 'label', label: 'Use' },
      {
        id: 'library-item-use',
        label: 'Use in project',
        icon: <Plus className="h-4 w-4" />,
        onSelect: () => onUseInProject(item, sourceItems),
      },
      ...(isHeading
        ? [{
            id: 'library-item-collapse',
            label: isCollapsed ? 'Expand heading' : 'Collapse heading',
            icon: <ChevronRight className="h-4 w-4" />,
            onSelect: () => toggleHeadingCollapsed(item.id),
          }]
        : []),
      ...(canEdit
        ? [
            { id: 'library-item-edit-label', type: 'label' as const, label: 'Edit' },
          {
            id: 'library-item-edit',
            label: 'Edit row',
            icon: <Pencil className="h-4 w-4" />,
            onSelect: () => openEditor(null, null, null, item.type, activeLib.id, activeFolder.id, activeSection.id, idx, pageId),
          },
          {
            id: 'library-item-duplicate',
            label: 'Duplicate row',
            icon: <Copy className="h-4 w-4" />,
            onSelect: () => { void handleDuplicateLibraryItem(item, idx, sourceItems, pageId); },
          },
          {
            id: 'library-item-move-up',
            label: 'Move row up',
            icon: <ArrowUp className="h-4 w-4" />,
            onSelect: () => { void handleMoveLibraryItem(idx, sourceItems, -1, pageId); },
          },
          {
            id: 'library-item-move-down',
            label: 'Move row down',
            icon: <ArrowDown className="h-4 w-4" />,
            onSelect: () => { void handleMoveLibraryItem(idx, sourceItems, 1, pageId); },
          },
          { id: 'library-item-danger-label', type: 'label' as const, label: 'Danger' },
            {
              id: 'library-item-delete',
              label: 'Delete row',
              icon: <Trash2 className="h-4 w-4" />,
              tone: 'danger' as const,
              onSelect: () => { void handleDeleteLibraryItem(item.id, itemLabel, pageId); },
            },
          ]
        : []),
    ];
  };

  const openLibraryItemRowContextMenu = (
    event: React.MouseEvent<HTMLTableRowElement>,
    item: BoQItem,
    idx: number,
    sourceItems: BoQItem[],
    pageId?: string,
  ) => {
    if (!activeLib || !activeFolder || !activeSection) return;
    const itemLabel = getLibraryItemLabel(item, idx);
    openLibraryContextMenu(event, `${itemLabel} actions`, buildLibraryItemRowActionItems(item, idx, sourceItems, pageId));
  };

  const renderLibraryItemRow = (item: BoQItem, idx: number, sourceItems: BoQItem[], pageId?: string) => {
    const isHeading = isLibraryHeadingType(item.type);
    const isCollapsed = isHeading ? !!collapsedHeadingIds[item.id] : false;
    const canEdit = canEditLibrary(activeLib);
    const itemLabel = getLibraryItemLabel(item, idx);

    return (
      <tr
        key={item.id ?? idx}
        className={getRowStyles(item.type)}
        onContextMenu={(event) => openLibraryItemRowContextMenu(event, item, idx, sourceItems, pageId)}
      >
        <td className="px-3 py-2 pt-2.5 text-center text-[10px] font-bold font-mono text-slate-400 align-top">{getLibraryItemReference(item, idx)}</td>
        <td className="px-3 py-2 align-top">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => { if (isHeading) toggleHeadingCollapsed(item.id); else if (canEdit) openEditor(null, null, null, item.type, activeLib.id, activeFolder.id, activeSection.id, idx, pageId); }}
              aria-label={isHeading ? `${isCollapsed ? 'Expand' : 'Collapse'} ${getLibraryItemLabel(item, idx)}` : `Open ${getLibraryItemLabel(item, idx)} in library editor`}
              aria-expanded={isHeading ? !isCollapsed : undefined}
              className="flex min-w-0 flex-1 items-start gap-2 rounded-app-sm px-1 py-0.5 text-left transition hover:bg-slate-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-surface-800/80"
            >
              {isHeading ? (isCollapsed ? <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" /> : <ChevronDown className="mt-0.5 h-4 w-4 shrink-0" />) : null}
              {item.type === 'PROVISIONAL_SUM' && <Coins className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
              {item.type === 'PC_SUM' && <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" />}
              <LibraryItemDescription
                item={item}
                marker={activeSectionCommentMarkers[item.id]}
                className={`min-w-0 whitespace-pre-wrap py-0.5 leading-snug ${getTextStyles(item.type)}`}
              />
            </button>
          </div>
        </td>
        <td className="max-w-[4rem] truncate px-3 py-2 pt-2.5 text-center text-[10px] font-medium uppercase text-slate-500 align-top dark:text-slate-400" title={['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(item.type) ? item.unit : ''}>
          {['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(item.type) ? item.unit : ''}
        </td>
        <td className="px-3 py-2 pt-2.5 text-right text-xs font-medium tabular-nums text-slate-500 align-top dark:text-slate-400">
          {['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(item.type) ? formatCurrency(item.rate) : ''}
        </td>
        <td className="px-3 py-2 pt-1.5 text-center align-top">
          <div className="flex items-center justify-center gap-2 opacity-0 transition-all group-hover:opacity-100 focus-within:opacity-100">
              {canEdit && (
                <button
                  type="button"
                  aria-label={`Rename ${getLibraryItemLabel(item, idx)} in library ${pageId ? 'page' : 'section'}`}
                  onClick={() => openEditor(null, null, null, item.type, activeLib.id, activeFolder.id, activeSection.id, idx, pageId)}
                  className="workspace-secondary-btn px-2 py-1.5 text-[11px]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            <button type="button" aria-label={`Use ${getLibraryItemLabel(item, idx)} in project`} onClick={() => onUseInProject(item, sourceItems)} className="workspace-compact-btn px-2.5 py-1.5 text-[11px]">
              Use
            </button>
              {canEdit && (
                <button
                  type="button"
                  aria-label={`Delete ${getLibraryItemLabel(item, idx)} from library ${pageId ? 'page' : 'section'}`}
                  onClick={() => { void handleDeleteLibraryItem(item.id, getLibraryItemLabel(item, idx), pageId); }}
                  className="workspace-secondary-btn px-2 py-1.5 text-[11px]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
          </div>
        </td>
      </tr>
    );
  };

  const renderLibraryRows = (items: BoQItem[], pageId?: string) =>
    getVisibleLibraryRows(items, collapsedHeadingIds).map(({ item, idx }) =>
      renderLibraryItemRow(item, idx, items, pageId)
    );

  const activeSectionVisibleRows = useMemo(
    () => getVisibleLibraryRows(loadedSectionItems, collapsedHeadingIds),
    [loadedSectionItems, collapsedHeadingIds]
  );

  const libraryDebugMetrics = useMemo(() => {
    const collapsedHeadingCount = Object.values(collapsedHeadingIds).filter(Boolean).length;
    const pageCount = sortedPages.length;
    const collapsedPageCount = sortedPages.filter((page) => collapsedPageIds[page.id] ?? true).length;
    const expandedPageCount = pageCount - collapsedPageCount;
    const rawFlatItemCount = activeSection?.pages?.length ? 0 : loadedItemTotalCount;
    const visibleFlatItemCount = activeSectionVisibleRows.length;
    const virtualizedFlatSection = visibleFlatItemCount >= LIBRARY_VIRTUALIZE_THRESHOLD;
    const totalPageItems = sortedPages.reduce((count: number, page) => count + (page.items?.length || 0), 0);
    const largestPageItemCount = sortedPages.reduce((largest: number, page) => Math.max(largest, page.items?.length || 0), 0);

    return {
      libraryCount: libraries.length,
      activeLibraryFolderCount: sortedFolders.length,
      visibleFolderCount: filteredFolders.length,
      activeFolderSectionCount: sortedSections.length,
      activeSectionItemCount: activeSectionStats.itemCount,
      activeSectionPricedCount: activeSectionStats.pricedCount,
      rawFlatItemCount,
      visibleFlatItemCount,
      virtualizedFlatSection,
      loadedRowCount: loadedSectionItems.length,
      itemPageSize: LIBRARY_ITEM_PAGE_SIZE,
      dbBacked: activeLib?.storageMode === 'sqlite',
      pageCount,
      collapsedPageCount,
      expandedPageCount,
      totalPageItems,
      largestPageItemCount,
      collapsedHeadingCount,
      searchQuery: librarySectionSearch.trim() || 'None',
      selectedLibrary: displayLibraryName || 'None',
      selectedFolder: displayFolderName || 'None',
      selectedSection: displaySectionName || 'None',
      libraryOperation: libraryOperationStatus
        ? `${libraryOperationStatus.label} (${libraryOperationStatus.phase})`
        : 'None',
      libraryOperationDetail: libraryOperationStatus?.detail || 'None',
      libraryOperationCounts: libraryOperationStatus?.totalCount
        ? `${(libraryOperationStatus.completedCount || 0).toLocaleString()} of ${libraryOperationStatus.totalCount.toLocaleString()}${libraryOperationStatus.failedCount ? `, ${libraryOperationStatus.failedCount.toLocaleString()} failed` : ''}`
        : (libraryOperationStatus?.completedCount !== undefined ? libraryOperationStatus.completedCount.toLocaleString() : 'None'),
      libraryOperationDestination: libraryOperationStatus?.destination || 'None',
    };
  }, [
    activeSection,
    activeSectionStats,
    activeSectionVisibleRows.length,
    activeLib?.storageMode,
    collapsedHeadingIds,
    collapsedPageIds,
    displayFolderName,
    displayLibraryName,
    displaySectionName,
    filteredFolders.length,
    libraries.length,
    librarySectionSearch,
    libraryOperationStatus,
    loadedItemTotalCount,
    loadedSectionItems.length,
    sortedFolders.length,
    sortedPages,
    sortedSections.length,
  ]);

  const libraryDebugWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (libraryDebugMetrics.activeSectionItemCount > 5000) {
      warnings.push(`Active section is very large (${libraryDebugMetrics.activeSectionItemCount.toLocaleString()} items).`);
    }
    if (libraryDebugMetrics.pageCount > 0 && libraryDebugMetrics.expandedPageCount > 5) {
      warnings.push(`Many library pages are expanded at once (${libraryDebugMetrics.expandedPageCount}/${libraryDebugMetrics.pageCount}).`);
    }
    if (libraryDebugMetrics.pageCount > 0 && libraryDebugMetrics.largestPageItemCount > 1000) {
      warnings.push(`One library page is especially heavy (${libraryDebugMetrics.largestPageItemCount.toLocaleString()} items).`);
    }
    if (libraryDebugMetrics.rawFlatItemCount > libraryDebugMetrics.loadedRowCount) {
      warnings.push(`Section is DB-backed; ${libraryDebugMetrics.loadedRowCount.toLocaleString()} of ${libraryDebugMetrics.rawFlatItemCount.toLocaleString()} rows are loaded.`);
    } else if (libraryDebugMetrics.rawFlatItemCount > 0 && !libraryDebugMetrics.virtualizedFlatSection) {
      warnings.push('Flat section rendering is using the non-virtualized path because the loaded window is small.');
    }
    if (debugSample.jsHeapSizeLimit && debugSample.usedJsHeapSize) {
      const usage = debugSample.usedJsHeapSize / debugSample.jsHeapSizeLimit;
      if (usage >= 0.7) {
        warnings.push(`Browser heap is already at ${(usage * 100).toFixed(0)}% of the reported limit.`);
      }
    }
    return warnings;
  }, [debugSample.jsHeapSizeLimit, debugSample.usedJsHeapSize, libraryDebugMetrics]);

  useEffect(() => {
    debugMetricsRef.current = libraryDebugMetrics;
  }, [libraryDebugMetrics]);

  useEffect(() => {
    if (!isDebugLogging || !debugLogPath) return;

    let cancelled = false;
    let intervalId: number | null = null;

    const appendSnapshot = async () => {
      try {
        const { writeTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
        const snapshot = {
          sampledAt: new Date().toISOString(),
          heap: readJsHeapSample(),
          metrics: debugMetricsRef.current,
        };
        await writeTextFile(debugLogPath, `${JSON.stringify(snapshot)}\n`, {
          baseDir: BaseDirectory.AppLocalData,
          append: true,
          create: true,
        });
      } catch (error) {
        if (cancelled) return;
        console.error('Library diagnostics logging failed', error);
        showToast({
          type: 'error',
          message: 'Library diagnostics logging stopped because the log file could not be written.',
        });
        setIsDebugLogging(false);
      }
    };

    void appendSnapshot();
    intervalId = window.setInterval(() => {
      void appendSnapshot();
    }, 5000);

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [debugLogPath, isDebugLogging, showToast]);

  const buildLibrarySectionNodeActionItems = (
    folder: LibraryFolder,
    section: LibrarySection,
    sectionKind: string,
  ): ContextMenuEntry[] => [
    { id: 'outline-export-label', type: 'label', label: 'Import/export' },
    {
      id: 'outline-export-json',
      label: 'Export JSON',
      icon: <Download className="h-4 w-4" />,
      onSelect: () => { void handleExportSection(folder, section); },
    },
    ...(canEditLibrary(activeLib)
      ? [
          { id: 'outline-add-label', type: 'label' as const, label: 'Add' },
          {
            id: 'outline-add-same',
            label: 'Add row at this level',
            icon: <Plus className="h-4 w-4" />,
            onSelect: () => openOutlineCreateDialog('same', section, folder),
          },
          {
            id: 'outline-add-child',
            label: 'Add child level',
            icon: <Plus className="h-4 w-4" />,
            onSelect: () => openOutlineCreateDialog('child', section, folder),
          },
          { id: 'outline-edit-label', type: 'label' as const, label: 'Edit' },
          {
            id: 'outline-edit-row',
            label: 'Edit row',
            icon: <Pencil className="h-4 w-4" />,
            onSelect: () => startInlineSectionEdit(section),
          },
          {
            id: 'outline-duplicate',
            label: 'Duplicate row',
            icon: <Copy className="h-4 w-4" />,
            onSelect: () => { void handleDuplicateSectionNode(folder, section); },
          },
          {
            id: 'outline-clear-content',
            label: 'Clear content only',
            description: 'Keep this row and child sections',
            icon: <Trash2 className="h-4 w-4" />,
            tone: 'warning' as const,
            onSelect: () => { void handleClearSectionContent(section.id, formatOrderedLabel(section.orderRef, section.name, sectionKind)); },
          },
          { id: 'outline-danger-label', type: 'label' as const, label: 'Danger' },
          {
            id: 'outline-delete',
            label: 'Delete row',
            icon: <Trash2 className="h-4 w-4" />,
            tone: 'danger' as const,
            onSelect: () => { void handleDeleteSection(folder.id, section.id, formatOrderedLabel(section.orderRef, section.name, sectionKind)); },
          },
        ]
      : []),
  ];

  const renderLibrarySectionNode = (folder: LibraryFolder, section: LibrarySection, depth = 0): React.ReactNode => {
    const isSectionActive = selectedSectionId === section.id;
    const subsectionCount = flattenLibrarySections(section.subSections || []).length;
    const isCollapsed = collapsedLibrarySectionIds[section.id] ?? false;
    const sectionKind = getLibrarySectionLevelLabel(depth);
    const isSelected = Boolean(selectedOutlineSectionIds[section.id]);
    const draft = editingSectionDrafts[section.id];
    const itemCount = section.itemCount || section.items?.length || 0;
    const rowIndent = Math.min(depth * 24, 120);

    return (
      <div key={section.id} className="space-y-0.5">
        <div
          className={`grid min-h-11 grid-cols-[2rem_2rem_minmax(6rem,10rem)_minmax(14rem,1fr)_5.5rem_6rem_6rem_2.5rem] items-center gap-2 border-b border-slate-100 px-3 py-1.5 text-sm transition dark:border-slate-800/80 ${isSectionActive ? 'bg-emerald-50/90 dark:bg-emerald-950/24' : isSelected ? 'bg-primary-50/80 dark:bg-primary-950/20' : 'bg-white hover:bg-slate-50/90 dark:bg-[rgb(18_27_34_/_0.96)] dark:hover:bg-[rgb(24_35_42_/_0.96)]'}`}
          draggable={activeLibCanEdit}
          onDragStart={(event) => {
            if (!activeLibCanEdit) return;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', section.id);
            setDraggedLibrarySection({ sectionId: section.id, folderId: folder.id });
          }}
          onDragEnd={() => setDraggedLibrarySection(null)}
          onDragOver={(event) => {
            if (!activeLibCanEdit || !draggedLibrarySection || draggedLibrarySection.sectionId === section.id) return;
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(event) => {
            if (!activeLibCanEdit || !draggedLibrarySection || draggedLibrarySection.sectionId === section.id) return;
            event.preventDefault();
            event.stopPropagation();
            void handleMoveLibrarySection(folder.id, section.id);
          }}
          onContextMenu={(event) => openLibraryContextMenu(event, `${formatOrderedLabel(section.orderRef, section.name, sectionKind)} actions`, [
            ...buildLibrarySectionNodeActionItems(folder, section, sectionKind),
          ])}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(event) => toggleOutlineSelection(section.id, event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            aria-label={`Select ${formatOrderedLabel(section.orderRef, section.name, sectionKind)}`}
          />
          <div className="flex items-center justify-center">
            {subsectionCount > 0 ? (
              <button
                type="button"
                aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${formatOrderedLabel(section.orderRef, section.name, sectionKind)}`}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleLibrarySectionCollapsed(section.id);
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
              </button>
            ) : (
              <span className="h-7 w-7" />
            )}
          </div>
          {draft ? (
            <>
              <input
                value={draft.orderRef}
                onChange={(event) => setEditingSectionDrafts((current) => ({ ...current, [section.id]: { ...draft, orderRef: event.target.value } }))}
                className="rounded-app-sm border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                aria-label="Section reference"
              />
              <input
                value={draft.name}
                onChange={(event) => setEditingSectionDrafts((current) => ({ ...current, [section.id]: { ...draft, name: event.target.value } }))}
                className="min-w-0 rounded-app-sm border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                aria-label="Section name"
              />
              <div className="col-span-4 flex items-center justify-end gap-1">
                <button type="button" className="workspace-secondary-btn px-2 py-1.5" aria-label="Save row" onClick={() => { void saveInlineSectionEdit(section); }}><Check className="h-3.5 w-3.5" /></button>
                <button type="button" className="workspace-secondary-btn px-2 py-1.5" aria-label="Cancel edit" onClick={() => cancelInlineSectionEdit(section.id)}><X className="h-3.5 w-3.5" /></button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setSelectedFolderId(folder.id);
                  setSelectedSectionId(section.id);
                }}
                className="truncate text-left font-mono text-xs font-semibold text-slate-500 dark:text-slate-400"
                style={{ paddingLeft: rowIndent }}
                title={section.orderRef || ''}
              >
                {section.orderRef || '-'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedFolderId(folder.id);
                  setSelectedSectionId(section.id);
                }}
                className="relative min-w-0 truncate text-left font-medium text-slate-900 dark:text-slate-100"
                style={{ paddingLeft: rowIndent }}
                title={normalizeLibraryLabel(section.name, sectionKind)}
              >
                {depth > 0 && (
                  <>
                    <span
                      aria-hidden="true"
                      className="absolute bottom-[-0.625rem] top-[-0.625rem] w-px bg-slate-200 dark:bg-slate-700"
                      style={{ left: Math.max(rowIndent - 14, 4) }}
                    />
                    <span
                      aria-hidden="true"
                      className="absolute top-1/2 h-px w-3 bg-slate-200 dark:bg-slate-700"
                      style={{ left: Math.max(rowIndent - 14, 4) }}
                    />
                  </>
                )}
                {normalizeLibraryLabel(section.name, sectionKind)}
              </button>
              <span className="justify-self-start rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                {sectionKind}
              </span>
              <span className="text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">
                {itemCount.toLocaleString()} own
              </span>
              <span className="text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">
                {subsectionCount.toLocaleString()} child{subsectionCount === 1 ? '' : 'ren'}
              </span>
            </>
          )}
          <LibraryOptionsMenu
            menuKey={`section-row-${section.id}`}
            openMenuKey={openLibraryOptionsMenu}
            setOpenMenuKey={setOpenLibraryOptionsMenu}
            label={`Open options for section ${formatOrderedLabel(section.orderRef, section.name, 'Section')}`}
          >
            <MenuActionList
              items={buildLibrarySectionNodeActionItems(folder, section, sectionKind)}
              close={() => setOpenLibraryOptionsMenu(null)}
              itemTextSize="text-xs"
            />
          </LibraryOptionsMenu>
        </div>
        {!isCollapsed && sortLibrarySections(section.subSections || []).map((child) => renderLibrarySectionNode(folder, child, depth + 1))}
      </div>
    );
  };

  if (app?.persistenceBackend === 'localStorage') {
    return (
      <div className={`${embedded ? 'flex h-full min-h-0' : 'workspace-rail-panel z-[100] flex min-h-[28rem]'} items-center justify-center overflow-hidden rounded-app-xl border border-amber-200 bg-amber-50/70 p-8 shadow-card dark:border-amber-900/70 dark:bg-amber-950/20`}>
        <div className="max-w-xl text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-600 dark:text-amber-300" />
          <h2 className="mt-4 text-xl font-semibold text-slate-950 dark:text-slate-50">Libraries require desktop storage</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Reusable library data is held in the local SQLite database and is unavailable in browser fallback storage. Restart the installed desktop app and confirm SQLite is available in Status before editing or importing library data.
          </p>
          <button type="button" onClick={onClose} className="workspace-secondary-btn mt-6 px-4 py-2 text-sm">Close library</button>
        </div>
      </div>
    );
  }

  return (
    <div data-smoke="library-workspace" className={`${embedded ? 'flex h-full min-h-0 flex-col' : 'workspace-rail-panel z-[100] flex flex-col animate-in slide-in-from-bottom-10'} overflow-hidden rounded-app-xl border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(71,100,118,0.1),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2f5_100%)] shadow-card dark:border-slate-700/80 dark:bg-[linear-gradient(180deg,#0f161b_0%,#0d1318_100%)]`}>
      <LibraryToolbar
        sortedLibraries={sortedLibraries}
        activeLib={activeLib}
        activeLibCanEdit={activeLibCanEdit}
        selectedLibId={selectedLibId}
        displayLibraryName={displayLibraryName}
        activeLibraryPricedCount={activeLibraryPricedCount}
        activeLibraryPricedTotal={activeLibraryPricedTotal}
        isDebugLogging={isDebugLogging}
        isImportingLibraryPack={isImportingLibraryPack}
        isSplittingLibraryJson={isSplittingLibraryJson}
        openLibraryOptionsMenu={openLibraryOptionsMenu}
        setOpenLibraryOptionsMenu={setOpenLibraryOptionsMenu}
        LibraryOptionsMenu={LibraryOptionsMenu}
        onClose={onClose}
        onOpenHelp={() => app?.openHelp('LIBRARY')}
        onOpenDebug={() => setIsDebugDialogOpen(true)}
        onToggleDebugLogging={() => { void (isDebugLogging ? Promise.resolve(handleStopDebugLogging()) : handleStartDebugLogging()); }}
        onOpenImportGuide={() => setIsImportDialogOpen(true)}
        onImportPack={() => { void handleImportLibraryPack(); }}
        onImportJson={onImport}
        onSplitJson={() => { void handleSplitLibraryJsonSections(); }}
        onOpenExport={openExportDialog}
        onCreateLibrary={() => openPrompt('CREATE_LIBRARY')}
        onSelectLibrary={(libraryId) => {
          setSelectedLibId(libraryId);
          setSelectedFolderId(null);
          setSelectedSectionId(null);
        }}
        onToggleFavorite={(library) => { void handleToggleLibraryFavorite(library); }}
        onExportLibrarySections={(library) => { void handleExportLibrarySections(library); }}
        onExportLibrarySectionNames={(library) => { void handleExportLibrarySectionNames(library); }}
        onRenameLibrary={(library) => openPrompt('RENAME_LIBRARY', { libId: library.id, name: library.name })}
        onDeleteLibrary={(library) => { void handleDeleteLibrary(library.id, normalizeLibraryLabel(library.name, 'Library')); }}
        onOpenGovernance={() => setIsGovernanceDialogOpen(true)}
      />

      {isGovernanceDialogOpen && activeLib && (
        <LibraryGovernanceDialog
          library={activeLib}
          onClose={() => setIsGovernanceDialogOpen(false)}
          onSave={async (governance) => {
            setLibraries(await updateLibraryGovernance(activeLib.id, governance));
            showToast({ type: 'success', message: 'Library governance saved.' });
          }}
        />
      )}

      <LibraryOperationStatus
        status={libraryOperationStatus}
        isCancelRequested={isLibraryOperationCancelRequested}
        onCancel={requestCancelLibraryOperation}
        onDismiss={() => setLibraryOperationStatus(null)}
      />

      {isImportDialogOpen && (
        <LibraryImportDialog
          libraryCount={libraries.length}
          activeLib={activeLib}
          isImportingLibraryPack={isImportingLibraryPack}
          isSplittingLibraryJson={isSplittingLibraryJson}
          libraryPackProgress={libraryPackProgress}
          onClose={() => {
            if (!isImportingLibraryPack && !isSplittingLibraryJson) setIsImportDialogOpen(false);
          }}
          onImportPack={() => {
            setIsImportDialogOpen(false);
            void handleImportLibraryPack();
          }}
          onImportJson={() => {
            setIsImportDialogOpen(false);
            onImport();
          }}
          onSplitJson={() => {
            setIsImportDialogOpen(false);
            void handleSplitLibraryJsonSections();
          }}
        />
      )}

      {isExportDialogOpen && (
        <LibraryExportDialog
          exportableLibraries={exportableLibraries}
          sortedLibraries={sortedLibraries}
          selectedExportLibraries={selectedExportLibraries}
          selectedExportLibraryIds={selectedExportLibraryIds}
          libraryStatsById={libraryStatsById}
          exportPermissions={exportPermissions}
          isExportingLibraries={isExportingLibraries}
          libraryPackProgress={libraryPackProgress}
          onClose={() => {
            if (!isExportingLibraries) setIsExportDialogOpen(false);
          }}
          onSelectExportLibraries={setSelectedExportLibraryIds}
          onChangeExportPermissions={setExportPermissions}
          onExportJson={() => { void handleExportLibraries(); }}
          onExportPack={() => { void handleExportLibraryPack(); }}
        />
      )}

      {outlineCreateDraft && activeLib && (
        <LibraryOutlineCreateDialog
          draft={outlineCreateDraft}
          sortedFolders={sortedFolders}
          createDialogFolder={createDialogFolder}
          createDialogParentRows={createDialogParentRows}
          activeSection={activeSection}
          onDraftChange={setOutlineCreateDraft}
          onModeChange={updateOutlineCreateMode}
          onSubmit={() => { void handleCreateOutlineRow(); }}
          onClose={() => setOutlineCreateDraft(null)}
        />
      )}

      {isMoveUnderDialogOpen && activeLib && activeFolder && selectedOutlineIds.length > 0 && (
        <LibraryMoveUnderDialog
          selectedCount={selectedOutlineIds.length}
          activeFolder={activeFolder}
          query={moveUnderQuery}
          rows={moveUnderRows}
          onQueryChange={setMoveUnderQuery}
          onClose={() => setIsMoveUnderDialogOpen(false)}
          onMoveToLevel1={() => {
            setIsMoveUnderDialogOpen(false);
            void handleBulkMoveSections(selectedOutlineIds, activeFolder.id, null, 'Moved selected rows to Level 1.');
          }}
          onMoveUnder={(section, depth) => {
            setIsMoveUnderDialogOpen(false);
            void handleBulkMoveSections(
              selectedOutlineIds,
              activeFolder.id,
              section.id,
              `Moved selected rows under ${formatOrderedLabel(section.orderRef, section.name, getLibrarySectionLevelLabel(depth))}.`
            );
          }}
        />
      )}

      {isDebugDialogOpen && (
        <LibraryDiagnosticsDialog
          metrics={libraryDebugMetrics}
          warnings={libraryDebugWarnings}
          debugSample={debugSample}
          isDebugLogging={isDebugLogging}
          debugLogPath={debugLogPath}
          onClose={() => setIsDebugDialogOpen(false)}
          onToggleLogging={() => { void (isDebugLogging ? Promise.resolve(handleStopDebugLogging()) : handleStartDebugLogging()); }}
        />
      )}

      <div className="flex flex-1 overflow-hidden bg-[rgb(247_248_248_/_0.78)] dark:bg-[rgb(10_16_20_/_0.98)]">
        <div
          className={`grid flex-1 gap-5 overflow-hidden px-5 py-5 ${
            isOutlinePaneCollapsed && isItemPaneCollapsed
              ? 'grid-cols-[3.25rem_minmax(0,1fr)_3.25rem]'
              : isOutlinePaneCollapsed
                ? 'grid-cols-[3.25rem_minmax(0,1fr)]'
                : isItemPaneCollapsed
                  ? 'grid-cols-[minmax(0,1fr)_3.25rem]'
                  : 'grid-cols-[minmax(0,1.95fr)_minmax(18rem,0.55fr)]'
          }`}
        >
          <aside className="min-h-0 overflow-hidden">
            {isOutlinePaneCollapsed ? (
              <div className="flex h-full flex-col items-center gap-3 rounded-app-xl border border-slate-200/80 bg-white/95 px-2 py-3 shadow-card dark:border-slate-700/80 dark:bg-[rgb(16_24_30_/_0.98)]">
                <button
                  type="button"
                  onClick={() => setIsOutlinePaneCollapsed(false)}
                  className="workspace-secondary-btn px-2 py-2"
                  aria-label="Show outline pane"
                  title="Show outline pane"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="flex rotate-180 items-center whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 [writing-mode:vertical-rl] dark:text-slate-500">
                  Outline
                </div>
              </div>
            ) : (
            <div className="flex h-full flex-col overflow-hidden rounded-app-xl border border-slate-200/80 bg-white/95 shadow-card dark:border-slate-700/80 dark:bg-[rgb(16_24_30_/_0.98)]">
              {activeLib ? (
                <>
                  <LibraryOutlineHeader
                    activeLib={activeLib}
                    activeFolder={activeFolder}
                    activeSection={activeSection}
                    activeLibCanEdit={activeLibCanEdit}
                    displayLibraryName={displayLibraryName}
                    sortedFolders={sortedFolders}
                    selectedFolderId={selectedFolderId}
                    searchQuery={librarySectionSearch}
                    searchScopes={searchScopes}
                    openLibraryOptionsMenu={openLibraryOptionsMenu}
                    setOpenLibraryOptionsMenu={setOpenLibraryOptionsMenu}
                    LibraryOptionsMenu={LibraryOptionsMenu}
                    onCollapse={() => setIsOutlinePaneCollapsed(true)}
                    onSearchQueryChange={setLibrarySectionSearch}
                    onSearchScopesChange={setSearchScopes}
                    onSelectFolder={(folderId) => {
                      setSelectedFolderId(folderId);
                      setSelectedSectionId(null);
                      setSelectedOutlineSectionIds({});
                    }}
                    onExportFolder={(folder) => { void handleExportFolder(folder); }}
                    onExportFolderSections={(folder) => { void handleExportFolderSections(folder); }}
                    onExportFolderSectionNames={(folder) => { void handleExportFolderSectionNames(folder); }}
                    onRenameFolder={(folder) => openPrompt('RENAME_FOLDER', { libId: activeLib.id, folderId: folder.id, name: folder.name, orderRef: folder.orderRef })}
                    onDeleteFolder={(folder) => { void handleDeleteFolder(folder.id, formatOrderedLabel(folder.orderRef, folder.name, 'Folder')); }}
                    onCreateFolder={() => openPrompt('CREATE_FOLDER', { libId: activeLib.id })}
                    onAddLevel1={() => openOutlineCreateDialog('level1')}
                    onAddSameLevel={() => { if (activeSection && activeFolder) openOutlineCreateDialog('same', activeSection, activeFolder); }}
                    onAddChild={() => { if (activeSection && activeFolder) openOutlineCreateDialog('child', activeSection, activeFolder); }}
                  />
                  <LibraryOutlineTable
                    activeLib={activeLib}
                    activeFolder={activeFolder}
                    activeLibCanEdit={activeLibCanEdit}
                    selectedOutlineIds={selectedOutlineIds}
                    selectedOutlineContexts={selectedOutlineContexts}
                    sortedRootSections={sortLibrarySections(activeFolder?.sections || [])}
                    renderSectionNode={renderLibrarySectionNode}
                    onPromote={(sectionId) => { void handlePromoteSections(sectionId); }}
                    onDemote={(sectionId) => { void handleDemoteSections(sectionId); }}
                    onMoveToLevel1={() => { if (activeFolder) void handleBulkMoveSections(selectedOutlineIds, activeFolder.id, null, 'Moved selected rows to top level.'); }}
                    onMoveUp={(sectionId) => { void handleMoveSectionInSiblings(sectionId, -1); }}
                    onMoveDown={(sectionId) => { void handleMoveSectionInSiblings(sectionId, 1); }}
                    onOpenMoveUnder={() => { setMoveUnderQuery(''); setIsMoveUnderDialogOpen(true); }}
                    onInferSelected={() => { void handleInferFolderHierarchy(selectedOutlineIds); }}
                    onInferFolder={() => { void handleInferFolderHierarchy(); }}
                    onDeleteSelected={() => { void handleDeleteSelectedSections(); }}
                    onClearSelection={() => setSelectedOutlineSectionIds({})}
                    onDropToRoot={() => { if (activeFolder) void handleMoveLibrarySection(activeFolder.id, null); }}
                    canDropToRoot={Boolean(draggedLibrarySection)}
                    onAddLevel1={() => openOutlineCreateDialog('level1')}
                  />
                </>
              ) : (
                <div className="flex h-full items-center justify-center p-6">
                  <LibraryEmptyState
                    icon={<BookOpen className="h-12 w-12 text-slate-300 dark:text-slate-600" />}
                    title="Choose a library"
                    description="Select a standards library to browse folders, sections, and reusable bill items."
                  />
                </div>
              )}
            </div>
            )}
          </aside>

          <LibraryItemPreviewPanel
            isCollapsed={isItemPaneCollapsed}
            onShow={() => setIsItemPaneCollapsed(false)}
            onCollapse={() => setIsItemPaneCollapsed(true)}
          >
              {isItemSearchActive ? (
                <LibraryItemSearchResults
                  query={librarySectionSearch.trim()}
                  searchScopes={searchScopes}
                  activeFolder={activeFolder}
                  activeSection={activeSection}
                  libraries={libraries}
                  searchResults={searchResults}
                  searchResultCount={searchResultCount}
                  isSearching={isSearchingLibraryItems}
                  getRowStyles={getRowStyles}
                  getTextStyles={getTextStyles}
                  openEditor={openEditor}
                  onUseInProject={onUseInProject}
                />
              ) : activeSection ? (
                <>
                  <LibrarySectionItemHeader
                    activeLib={activeLib}
                    activeFolder={activeFolder}
                    activeSection={activeSection}
                    activeLibCanEdit={activeLibCanEdit}
                    displayLibraryName={displayLibraryName}
                    displayFolderName={displayFolderName}
                    displaySectionName={displaySectionName}
                    sectionStats={activeSectionStats}
                    hasPages={Boolean(activeSection.pages?.length)}
                    childCount={flattenLibrarySections(activeSection.subSections || []).length}
                    workspaceMetaChipClass={workspaceMetaChipClass}
                    openLibraryOptionsMenu={openLibraryOptionsMenu}
                    setOpenLibraryOptionsMenu={setOpenLibraryOptionsMenu}
                    LibraryOptionsMenu={LibraryOptionsMenu}
                    isAiLoading={isAiLoading}
                    openPrompt={openPrompt}
                    openEditor={openEditor}
                    handleImportJsonIntoLibraryScope={handleImportJsonIntoLibraryScope}
                    handlePasteLibraryRows={() => handlePasteLibraryRows()}
                    canUndoLibraryItemRevision={Boolean(lastLibraryItemRevision)}
                    handleUndoLibraryItemRevision={handleUndoLibraryItemRevision}
                    handleExportSection={handleExportSection}
                    handleClearSectionContent={handleClearSectionContent}
                    handleDeleteSection={handleDeleteSection}
                  />

                  <div ref={libraryItemsScrollRef} className="flex-1 overflow-y-auto overflow-x-auto px-4 py-4">
                    {activeSection.pages?.length ? (
                      <LibraryPageItemsSection
                        pages={sortedPages}
                        activeLib={activeLib}
                        activeFolder={activeFolder}
                        activeSection={activeSection}
                        activeLibCanEdit={activeLibCanEdit}
                        collapsedPageIds={collapsedPageIds}
                        workspaceMetaChipClass={workspaceMetaChipClass}
                        openLibraryOptionsMenu={openLibraryOptionsMenu}
                        setOpenLibraryOptionsMenu={setOpenLibraryOptionsMenu}
                        isAiLoading={isAiLoading}
                        togglePageCollapsed={togglePageCollapsed}
                        openPrompt={openPrompt}
                        openEditor={openEditor}
                        handleImportJsonIntoLibraryScope={handleImportJsonIntoLibraryScope}
                        handlePasteLibraryRows={handlePasteLibraryRows}
                        canUndoLibraryItemRevision={Boolean(lastLibraryItemRevision)}
                        handleUndoLibraryItemRevision={handleUndoLibraryItemRevision}
                        handleDeletePage={handleDeletePage}
                        LibraryOptionsMenu={LibraryOptionsMenu}
                        LibraryPageRows={LibraryPageRows}
                        pageRowsProps={{
                          canEdit: activeLibCanEdit,
                          openEditor,
                          onUseInProject,
                          onDeleteLibraryItem: handleDeleteLibraryItem,
                          onRowContextMenu: openLibraryItemRowContextMenu,
                          getRowStyles,
                          getTextStyles,
                          collapsedHeadingIds,
                          toggleHeadingCollapsed,
                          libraryItemsRevision,
                        }}
                      />
                    ) : (
                    <LibrarySectionItemsTable
                      activeLib={activeLib}
                      activeFolder={activeFolder}
                      activeSection={activeSection}
                      displaySectionName={displaySectionName}
                      activeLibCanEdit={activeLibCanEdit}
                      rows={activeSectionVisibleRows}
                      loadedSectionItems={loadedSectionItems}
                      loadedItemTotalCount={loadedItemTotalCount}
                      isLoadingLibraryItems={isLoadingLibraryItems}
                      virtualizeThreshold={LIBRARY_VIRTUALIZE_THRESHOLD}
                      pageSize={LIBRARY_ITEM_PAGE_SIZE}
                      scrollRef={libraryItemsScrollRef}
                      collapsedHeadingIds={collapsedHeadingIds}
                      isAiLoading={isAiLoading}
                      getRowStyles={getRowStyles}
                      getTextStyles={getTextStyles}
                      getLibraryItemLabel={getLibraryItemLabel}
                      getLibraryItemReference={getLibraryItemReference}
                      isLibraryHeadingType={isLibraryHeadingType}
                      toggleHeadingCollapsed={toggleHeadingCollapsed}
                      openEditor={openEditor}
                      onUseInProject={onUseInProject}
                      onDeleteLibraryItem={handleDeleteLibraryItem}
                      onRowContextMenu={openLibraryItemRowContextMenu}
                      renderLibraryItemRow={renderLibraryItemRow}
                      loadSectionItems={loadSectionItems}
                      handleImportJsonIntoLibraryScope={handleImportJsonIntoLibraryScope}
                      openPrompt={openPrompt}
                      LibraryVirtualizedRows={LibraryVirtualizedRows}
                    />
                    )}
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center p-5">
                  <LibraryEmptyState
                    icon={<LibraryIcon className="h-10 w-10 text-slate-300 dark:text-slate-600" />}
                    title={activeLib ? 'No section selected' : 'Select a library'}
                    titleClassName="text-base font-semibold tracking-tight text-slate-800 dark:text-slate-100"
                    description={activeLib
                      ? "Select an outline row to preview that section's own bill items."
                      : 'Choose a library to browse its folders, sections, and reusable items.'}
                    actions={activeLib && activeLibCanEdit && (
                      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                        <button type="button" onClick={() => openPrompt('CREATE_FOLDER', { libId: activeLib.id })} className="workspace-secondary-btn px-4 py-2 text-sm"><Plus className="h-4 w-4" />New folder</button>
                        {activeFolder && <button type="button" onClick={() => openOutlineCreateDialog('level1')} className="workspace-primary-btn px-4 py-2 text-sm"><Plus className="h-4 w-4" />Add section</button>}
                      </div>
                    )}
                  />
                </div>
              )}
          </LibraryItemPreviewPanel>
        </div>
        <ContextMenu state={contextMenu} onClose={() => setContextMenu(null)} />
      </div>
    </div>
  );
};
