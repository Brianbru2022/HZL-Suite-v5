/**
 * Layout when a project is open: Rail, TopBar, BillView, InspectorPanel, and modals.
 */
import React from 'react';
import { ChevronLeft, ChevronRight, Copy, Edit2, Layers, Plus, Trash2 } from 'lucide-react';
import { TitleBar } from './TitleBar';
import { Rail } from './Rail';
import { TopBar } from './TopBar';
import { HelpPanel } from '../Help/HelpPanel';
import { BillView } from '../Project/BillView';
import { applyLiveRatesToBill, type BillAiRateUpdate } from '../../utils/billAiRateSelection';
import { BillStandardsInsertPanel } from '../Project/BillStandardsInsertPanel';
import { ProjectList } from '../Project/ProjectList';
import { InspectorPanel } from './InspectorPanel';
import type { CommandPaletteAction } from '../Modals/CommandPalette';
import { useAppContext } from '../../contexts/AppContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useToast } from '../../contexts/ToastContext';
import { reindexBillReferences, safeMul } from '../../utils/calculations';
import { formatCurrency, normalizeUnit } from '../../utils/formatting';
import { updateBillItems, updateBillSectionItems, updateBillSectionPageItems } from '../../utils/billUpdates';
import { insertItemsAtPlacement } from '../../utils/libraryInsert';
import { isBillInsertDestinationValid } from '../../utils/billPlacement';
import { feedbackError, feedbackSuccess } from '../../utils/feedback';
import { generateId } from '../../utils/generateId';
import { getPreferredBillId } from '../../utils/projectSelection';
import { createSnapshotEntry, prependSnapshot, shouldAutoSnapshot } from '../../utils/projectSnapshots';
import type { Project, BoQItem, SectionAssembly, TenderApplySummary, TenderAwardRecord, TenderResponseState } from '../../types';
import { stripRichText } from '../../utils/richText';
import { buildSectionAssembly, cloneAssemblySection } from '../../utils/assemblies';
import type { BoQBill, BoQSection, BoQPage, ItemLibrary } from '../../types';
import type { CopySourceKind, CopyContentSubmitPayload, CopyTargetProjectOption, CopyTargetLibraryOption } from '../Modals/CopyContentModal';
import { useHelpContext } from '../../hooks/useHelpContext';
import { getHelpArticle } from '../../utils/helpContent';
import { appendLibraryItems, createSection, listLibraryCatalogs } from '../../utils/libraryRepository';
import { APP_NAME } from '../../utils/branding';
import { ESTIMATE_ONLY } from '../../utils/buildEdition';
import { WORKSPACE_VIEW_PRESETS } from '../../utils/appUi';
import { ContextMenu, shouldUseNativeContextMenu } from '../UI/ContextMenu';
import type { ContextMenuEntry, ContextMenuState } from '../UI/ContextMenu';
import { buildClearValuesActionItems } from '../Project/billActionMenuItems';
import { recordOperationLogEntry } from '../../utils/operationLog';
import { getEffectiveProjectSettings } from '../../utils/appSettings';
import { collectRevisionStats, createBoqRevisionPoint } from '../../utils/boqRevisionPoints';
import { applyRateBuildUp, normaliseRateBuildUp } from '../../utils/rateBuildUp';
import type { BoqRevisionPointDetails } from '../../utils/boqRevisionPoints';
import { assignEstimateReferences } from '../../utils/estimateReferences';
import { createBoqItemsFromWorkbookLines, inspectBoqWorkbook } from '../../utils/boqWorkbookImport';
import { getAdjacentBillRow, getBillNavigationRows } from '../../utils/billNavigation';

const DEFAULT_FLOATING_INSPECTOR_SIZE = { width: 420, height: 560 };
const MIN_FLOATING_INSPECTOR_SIZE = { width: 320, height: 360 };

function getDefaultInspectorFloatPosition(size = DEFAULT_FLOATING_INSPECTOR_SIZE) {
  if (typeof window === 'undefined') return { x: 96, y: 96 };
  return {
    x: Math.max(16, window.innerWidth - size.width - 32),
    y: 104,
  };
}

function clampInspectorFloatSize(size: { width: number; height: number }) {
  if (typeof window === 'undefined') return size;
  const maxWidth = Math.max(MIN_FLOATING_INSPECTOR_SIZE.width, window.innerWidth - 32);
  const maxHeight = Math.max(MIN_FLOATING_INSPECTOR_SIZE.height, window.innerHeight - 32);
  return {
    width: Math.min(Math.max(MIN_FLOATING_INSPECTOR_SIZE.width, size.width), maxWidth),
    height: Math.min(Math.max(MIN_FLOATING_INSPECTOR_SIZE.height, size.height), maxHeight),
  };
}

function clampInspectorFloatPosition(position: { x: number; y: number }, size = DEFAULT_FLOATING_INSPECTOR_SIZE) {
  if (typeof window === 'undefined') return position;
  const maxX = Math.max(16, window.innerWidth - size.width - 16);
  const maxY = Math.max(16, window.innerHeight - size.height - 16);
  return {
    x: Math.min(Math.max(16, position.x), maxX),
    y: Math.min(Math.max(16, position.y), maxY),
  };
}

const CommandPalette = React.lazy(() =>
  import('../Modals/CommandPalette').then((module) => ({ default: module.CommandPalette }))
);
const LibraryWindow = React.lazy(() =>
  import('../Library/LibraryWindow').then((module) => ({ default: module.LibraryWindow }))
);
const TradesWindow = React.lazy(() =>
  import('../Trades/TradesWindow').then((module) => ({ default: module.TradesWindow }))
);
const TenderComparisonView = React.lazy(() =>
  import('../Tender/TenderComparisonView').then((module) => ({ default: module.TenderComparisonView }))
);
const AnalyticsModal = React.lazy(() =>
  import('../Modals/AnalyticsModal').then((module) => ({ default: module.AnalyticsModal }))
);
const CostPlanModal = React.lazy(() =>
  import('../Modals/CostPlanModal').then((module) => ({ default: module.CostPlanModal }))
);
const CostReportsHubModal = React.lazy(() =>
  import('../Modals/CostReportsHubModal').then((module) => ({ default: module.CostReportsHubModal }))
);
const AskAiModal = React.lazy(() =>
  import('../Modals/AskAiModal').then((module) => ({ default: module.AskAiModal }))
);
const AssembliesModal = React.lazy(() =>
  import('../Modals/AssembliesModal').then((module) => ({ default: module.AssembliesModal }))
);
const BillSettingsModal = React.lazy(() =>
  import('../Modals/BillSettingsModal').then((module) => ({ default: module.BillSettingsModal }))
);
const AppSettingsWorkspace = React.lazy(() =>
  import('../Settings/AppSettingsWorkspace').then((module) => ({ default: module.AppSettingsWorkspace }))
);
const AppraisalsWorkspace = React.lazy(() =>
  import('../Appraisals/AppraisalsWorkspace').then((module) => ({ default: module.AppraisalsWorkspace }))
);
const LandFinderWorkspace = React.lazy(() =>
  import('../LandFinder/LandFinderWorkspace').then((module) => ({ default: module.LandFinderWorkspace }))
);
const ProjectSummaryModal = React.lazy(() =>
  import('../Modals/ProjectSummaryModal').then((module) => ({ default: module.ProjectSummaryModal }))
);
const PromptModal = React.lazy(() =>
  import('../Modals/PromptModal').then((module) => ({ default: module.PromptModal }))
);
const ItemEditorModal = React.lazy(() =>
  import('../Modals/ItemEditorModal').then((module) => ({ default: module.ItemEditorModal }))
);
const VersionHistoryModal = React.lazy(() =>
  import('../Modals/VersionHistoryModal').then((module) => ({ default: module.VersionHistoryModal }))
);
const BoqRevisionPointModal = React.lazy(() =>
  import('../Modals/BoqRevisionPointModal').then((module) => ({ default: module.BoqRevisionPointModal }))
);
const KeyboardShortcutsModal = React.lazy(() =>
  import('../Modals/KeyboardShortcutsModal').then((module) => ({ default: module.KeyboardShortcutsModal }))
);
const AppDiagnosticsModal = React.lazy(() =>
  import('../Modals/AppDiagnosticsModal').then((module) => ({ default: module.AppDiagnosticsModal }))
);
const AuditTrailModal = React.lazy(() =>
  import('../Modals/AuditTrailModal').then((module) => ({ default: module.AuditTrailModal }))
);
const FutureModulesModal = React.lazy(() =>
  import('../Modals/FutureModulesModal').then((module) => ({ default: module.FutureModulesModal }))
);
const CopyContentModal = React.lazy(() =>
  import('../Modals/CopyContentModal').then((module) => ({ default: module.CopyContentModal }))
);
const ImportBillLinesModal = React.lazy(() =>
  import('../Modals/ImportBillLinesModal').then((module) => ({ default: module.ImportBillLinesModal }))
);
const ProjectExcelExportModal = React.lazy(() =>
  import('../Modals/ProjectExcelExportModal').then((module) => ({ default: module.ProjectExcelExportModal }))
);

async function loadExcelExports() {
  return import('../../utils/excelExport');
}

type CopySourceState = {
  kind: CopySourceKind;
  billId: string;
  sectionId?: string;
  pageId?: string;
  label: string;
};

function cloneDimensionRows(rows?: BoQItem['dimensionRows']) {
  return (rows || []).map((row) => ({ ...row, id: generateId() }));
}

function cloneBoQItem(item: BoQItem): BoQItem {
  return {
    ...item,
    id: generateId(),
    dimensionRows: cloneDimensionRows(item.dimensionRows),
  };
}

function cloneBoQPage(page: BoQPage, nameOverride?: string): BoQPage {
  return {
    ...page,
    id: generateId(),
    name: nameOverride || page.name,
    items: (page.items || []).map(cloneBoQItem),
  };
}

function cloneBoQSection(section: BoQSection, nameOverride?: string): BoQSection {
  return {
    ...section,
    id: generateId(),
    name: nameOverride || section.name,
    items: (section.items || []).map(cloneBoQItem),
    pages: section.pages?.map((page) => cloneBoQPage(page)),
  };
}

function appendPageToSection(section: BoQSection, page: BoQPage, pageName?: string): BoQSection {
  const copiedPage = cloneBoQPage(page, pageName || page.name);
  if (section.pages?.length) {
    return {
      ...section,
      pages: [...section.pages, copiedPage],
    };
  }

  const carriedItems = (section.items || []).map((item) => ({ ...item }));
  const starterPages: BoQPage[] = carriedItems.length > 0
    ? [{
        id: generateId(),
        name: 'Page 01',
        items: carriedItems,
      }]
    : [];

  return {
    ...section,
    items: [],
    pages: [...starterPages, copiedPage],
  };
}

function cloneBoQBill(bill: BoQBill, nameOverride?: string): BoQBill {
  return {
    ...bill,
    id: generateId(),
    name: nameOverride || bill.name,
    sections: (bill.sections || []).map((section) => cloneBoQSection(section)),
    items: (bill.items || []).map(cloneBoQItem),
  };
}

function createHeadingItem(type: BoQItem['type'], description: string): BoQItem {
  return {
    id: generateId(),
    type,
    reference: '',
    description,
    unit: '',
    quantity: 0,
    rate: 0,
    total: 0,
    dimensionRows: [],
    aiLocks: {
      description: false,
      rate: false,
      measurements: false,
    },
  };
}

function flattenPageToItems(page: BoQPage, options?: { includePageHeading?: boolean }): BoQItem[] {
  const items: BoQItem[] = [];
  if (options?.includePageHeading && page.name) {
    items.push(createHeadingItem('SUB_SECTION', page.name));
  }
  items.push(...(page.items || []).map(cloneBoQItem));
  return items;
}

function flattenSectionToItems(section: BoQSection, options?: { includeSectionHeading?: boolean; includePageHeadings?: boolean }): BoQItem[] {
  const items: BoQItem[] = [];
  if (options?.includeSectionHeading) {
    items.push(createHeadingItem('MAJOR_HEADING', section.name));
  }
  if (section.pages?.length) {
    section.pages.forEach((page) => {
      items.push(...flattenPageToItems(page, { includePageHeading: options?.includePageHeadings !== false }));
    });
    return items;
  }
  items.push(...(section.items || []).map(cloneBoQItem));
  return items;
}

function flattenBillToItems(bill: BoQBill, options?: { includeBillHeading?: boolean; includeSectionHeadings?: boolean; includePageHeadings?: boolean }): BoQItem[] {
  const items: BoQItem[] = [];
  if (options?.includeBillHeading) {
    items.push(createHeadingItem('GENERAL_HEADING', bill.name));
  }
  if (bill.items?.length) {
    items.push(...bill.items.map(cloneBoQItem));
  }
  bill.sections.forEach((section) => {
    items.push(...flattenSectionToItems(section, {
      includeSectionHeading: options?.includeSectionHeadings !== false,
      includePageHeadings: options?.includePageHeadings !== false,
    }));
  });
  return items;
}

function flattenBillToImportLines(bill: BoQBill): BoQItem[] {
  const items: BoQItem[] = [];
  if (bill.items?.length) {
    items.push(...bill.items);
  }
  bill.sections.forEach((section) => {
    if (section.pages?.length) {
      section.pages.forEach((page) => {
        items.push(...(page.items || []));
      });
      return;
    }
    items.push(...(section.items || []));
  });
  return items;
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

function toLibraryItems(items: BoQItem[]): ItemLibrary['folders'][number]['sections'][number]['items'] {
  return items.map((item) => ({
    type: item.type,
    reference: item.reference,
    description: item.description,
      unit: normalizeUnit(item.unit),
    rate: item.rate,
    dimensionRows: cloneDimensionRows(item.dimensionRows),
    tradePackageId: item.tradePackageId,
    rateSource: item.rateSource,
    aiLocks: item.aiLocks ? { ...item.aiLocks } : undefined,
  }));
}

function createProjectFromSource(projectName: string, bill: BoQBill): Project {
  return {
    id: generateId(),
    name: projectName,
    client: '',
    location: '',
    reference: 'REF',
    updatedAt: new Date().toISOString(),
    measurementStandard: 'SMM7',
    ohpPercentage: 0,
    bills: [bill],
    billWorkspaceLayout: 'FULL_BILL',
    billWorkspaceMode: 'CLEAN',
      renumberNumericBillsOnReorder: true,
      showWorkflowGuidance: false,
      showStickyBillTotals: true,
      headingDisplayStyle: 'BOLD',
      commentDisplayStyle: 'MUTED_ITALIC',
      billLineStyles: {},
    };
}

export function ProjectView() {
  const [billSectionJumpTarget, setBillSectionJumpTarget] = React.useState<string | null>(null);
  const [billPageJumpTarget, setBillPageJumpTarget] = React.useState<string | null>(null);
  const [activeSectionSidebarId, setActiveSectionSidebarId] = React.useState<string | null>(null);
  const [activePageSidebarId, setActivePageSidebarId] = React.useState<string | null>(null);
  const [draggedSectionId, setDraggedSectionId] = React.useState<string | null>(null);
  const [sectionDropTargetId, setSectionDropTargetId] = React.useState<string | null>(null);
  const sectionPointerDragRef = React.useRef<{
    sectionId: string;
    startX: number;
    startY: number;
    pointerId: number;
    isDragging: boolean;
  } | null>(null);
  const suppressSectionClickRef = React.useRef(false);
  const [isAssembliesOpen, setIsAssembliesOpen] = React.useState(false);
  const [isBillSettingsOpen, setIsBillSettingsOpen] = React.useState(false);
  const [isProjectSummaryOpen, setIsProjectSummaryOpen] = React.useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = React.useState(false);
  const [isAuditTrailOpen, setIsAuditTrailOpen] = React.useState(false);
  const [isLandFinderOpen, setIsLandFinderOpen] = React.useState(false);
  const [isAppraisalsOpen, setIsAppraisalsOpen] = React.useState(false);
  const [isEstimateRegisterOpen, setIsEstimateRegisterOpen] = React.useState(false);
  const [appraisalsInitialWorkspace, setAppraisalsInitialWorkspace] = React.useState<'REGISTER' | 'HOUSE_BUILDING' | 'COMMERCIAL' | 'LIBRARY'>('REGISTER');
  const [appraisalsResetKey, setAppraisalsResetKey] = React.useState(0);
  const [estimateRegisterResetKey, setEstimateRegisterResetKey] = React.useState(0);
  const [isFutureModulesOpen, setIsFutureModulesOpen] = React.useState(false);
  const [copySource, setCopySource] = React.useState<CopySourceState | null>(null);
  const [isImportLinesOpen, setIsImportLinesOpen] = React.useState(false);
  const [isProjectExcelExportOpen, setIsProjectExcelExportOpen] = React.useState(false);
  const [isStandardsInsertOpen, setIsStandardsInsertOpen] = React.useState(false);
  const [isBoqRevisionPointOpen, setIsBoqRevisionPointOpen] = React.useState(false);
  const [navigatorContextMenu, setNavigatorContextMenu] = React.useState<ContextMenuState>(null);
  const [billWorkspaceZoom, setBillWorkspaceZoom] = React.useState<number>(100);
  const [isBillWorkspaceFocused, setIsBillWorkspaceFocused] = React.useState<boolean>(false);
  const [activeWorkspacePresetId, setActiveWorkspacePresetId] = React.useState<string>('clean-bill');
  const [isBillNavigatorCollapsed, setIsBillNavigatorCollapsed] = React.useState<boolean>(false);
  const [isInspectorFloating, setIsInspectorFloating] = React.useState<boolean>(false);
  const [isDraggingInspector, setIsDraggingInspector] = React.useState<boolean>(false);
  const [isResizingInspector, setIsResizingInspector] = React.useState<boolean>(false);
  const [inspectorFloatPosition, setInspectorFloatPosition] = React.useState(() => getDefaultInspectorFloatPosition());
  const [inspectorFloatSize, setInspectorFloatSize] = React.useState(() => DEFAULT_FLOATING_INSPECTOR_SIZE);
  const [recentlyInsertedItemIds, setRecentlyInsertedItemIds] = React.useState<Set<string>>(new Set());
  const recentlyInsertedClearTimerRef = React.useRef<number | null>(null);
  const inspectorDragOffsetRef = React.useRef({ x: 0, y: 0 });
  const inspectorResizeStartRef = React.useRef({
    mouseX: 0,
    mouseY: 0,
    width: DEFAULT_FLOATING_INSPECTOR_SIZE.width,
    height: DEFAULT_FLOATING_INSPECTOR_SIZE.height,
  });
  const {
    projects,
    setProjects,
    currentProject,
    saveStatus,
    lastSavedAt,
    lastManualSaveAt,
    saveNow,
    persistenceBackend,
    appSettings,
    setAppSettings,
    appNotices,
    workspaceFolders,
    setWorkspaceFolders,
    activeBill,
    activeBillId,
    setActiveBillId,
    setCurrentProjectId,
    libraries,
    trades,
    setLibraries,
    setTrades,
    updateProject,
    selectedTradeFilter,
    setSelectedTradeFilter,
    selectedItemIds,
    setSelectedItemIds,
    editorConfig,
    setEditorConfig,
    editFormData,
    setEditFormData,
    isEditorOpen,
    setIsEditorOpen,
    isPaletteOpen,
    setIsPaletteOpen,
    isLibraryWindowOpen,
    setIsLibraryWindowOpen,
    isTradesWindowOpen,
    setIsTradesWindowOpen,
    isTenderViewOpen,
    setIsTenderViewOpen,
    isAnalyticsOpen,
    setIsAnalyticsOpen,
    isCostReportsHubOpen,
    setIsCostReportsHubOpen,
    isCostPlanOpen,
    setIsCostPlanOpen,
    isAskAiOpen,
    setIsAskAiOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isPromptOpen,
    setIsPromptOpen,
    isExporting,
    setIsExporting,
    isVersionHistoryOpen,
    setIsVersionHistoryOpen,
    isShortcutsOpen,
    setIsShortcutsOpen,
    helpContextId,
    isHelpOpen,
    openHelp,
    closeHelp,
    startWalkthrough,
    isAiLoading,
    aiSuggestions,
    promptConfig,
    actions,
  } = useAppContext();
  const { askConfirm } = useConfirm();
  const { showToast } = useToast();
  const lazyModalFallback = null;
  useHelpContext('BILL_WORKSPACE');

  React.useEffect(() => {
    if (!ESTIMATE_ONLY) return;
    if (isLibraryWindowOpen) setIsLibraryWindowOpen(false);
    if (isTradesWindowOpen) setIsTradesWindowOpen(false);
    if (isTenderViewOpen) setIsTenderViewOpen(false);
    if (isAnalyticsOpen) setIsAnalyticsOpen(false);
    if (isCostReportsHubOpen) setIsCostReportsHubOpen(false);
    if (isCostPlanOpen) setIsCostPlanOpen(false);
    if (isLandFinderOpen) setIsLandFinderOpen(false);
    if (isAppraisalsOpen) setIsAppraisalsOpen(false);
    if (isAuditTrailOpen) setIsAuditTrailOpen(false);
    if (isFutureModulesOpen) setIsFutureModulesOpen(false);
  }, [isLibraryWindowOpen, isTradesWindowOpen, isTenderViewOpen, isAnalyticsOpen, isCostReportsHubOpen, isCostPlanOpen, isLandFinderOpen, isAppraisalsOpen, isAuditTrailOpen, isFutureModulesOpen, setIsLibraryWindowOpen, setIsTradesWindowOpen, setIsTenderViewOpen, setIsAnalyticsOpen, setIsCostReportsHubOpen, setIsCostPlanOpen]);

  React.useEffect(() => () => {
    if (recentlyInsertedClearTimerRef.current !== null) {
      window.clearTimeout(recentlyInsertedClearTimerRef.current);
    }
  }, []);

  if (!currentProject) return null;
  const effectiveProjectSettings = getEffectiveProjectSettings(currentProject, appSettings);
  const billWorkspaceLayout = effectiveProjectSettings.billWorkspaceLayout;
  const effectiveBillViewMode = effectiveProjectSettings.billWorkspaceMode === 'CLEAN' ? 'trade' : 'standard';

  React.useEffect(() => {
    if (!activeBill?.sections?.length) {
      setActiveSectionSidebarId(null);
      return;
    }

    if (!activeSectionSidebarId || !activeBill.sections.some((section) => section.id === activeSectionSidebarId)) {
      setActiveSectionSidebarId(activeBill.sections[0].id);
    }
  }, [activeBill, activeSectionSidebarId]);

  React.useEffect(() => {
    if (!billSectionJumpTarget) return;
    setActiveSectionSidebarId(billSectionJumpTarget);
    setActivePageSidebarId(null);
    setBillPageJumpTarget(null);
  }, [billSectionJumpTarget]);

  const parseNumberedBillName = React.useCallback((name?: string | null) => {
    const match = (name || '').trim().match(/^(.*\D)\s*(\d+)$/);
    if (!match) return null;
    return {
      prefix: match[1].trim().replace(/\s+/g, ' '),
      number: Number(match[2]),
    };
  }, []);

  const handleReorderBills = React.useCallback((draggedBillId: string, targetBillId: string) => {
    if (!currentProject || draggedBillId === targetBillId) return;

    const currentBills = [...currentProject.bills];
    const draggedIndex = currentBills.findIndex((bill) => bill.id === draggedBillId);
    const targetIndex = currentBills.findIndex((bill) => bill.id === targetBillId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const draggedBill = currentBills[draggedIndex];
    const targetBill = currentBills[targetIndex];
    const draggedPattern = parseNumberedBillName(draggedBill?.name);
    const targetPattern = parseNumberedBillName(targetBill?.name);
    if (!draggedPattern || !targetPattern || draggedPattern.prefix !== targetPattern.prefix) return;

    const [movedBill] = currentBills.splice(draggedIndex, 1);
    currentBills.splice(targetIndex, 0, movedBill);

    const shouldRenumber = currentProject.renumberNumericBillsOnReorder !== false;
    const renumberedBills = shouldRenumber
      ? (() => {
          let nextNumber = 1;
          return currentBills.map((bill) => {
            const pattern = parseNumberedBillName(bill.name);
            if (!pattern || pattern.prefix !== draggedPattern.prefix) return bill;
            return { ...bill, name: `${draggedPattern.prefix} ${nextNumber++}` };
          });
        })()
      : currentBills;

    updateProject(currentProject.id, { bills: renumberedBills });
    showToast({ type: 'success', message: 'Reordered bills.', duration: 2500 });
  }, [currentProject, parseNumberedBillName, showToast, updateProject]);

  const handleReorderSections = React.useCallback((draggedSectionId: string, targetSectionId: string) => {
    if (!currentProject || !activeBill || draggedSectionId === targetSectionId) return;

    const sourceIndex = activeBill.sections.findIndex((section) => section.id === draggedSectionId);
    const targetIndex = activeBill.sections.findIndex((section) => section.id === targetSectionId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const nextSections = [...activeBill.sections];
    const [movedSection] = nextSections.splice(sourceIndex, 1);
    nextSections.splice(targetIndex, 0, movedSection);

    const nextBills = currentProject.bills.map((bill, billIndex) => (
      bill.id === activeBill.id
        ? reindexBillReferences({ ...bill, sections: nextSections }, billIndex)
        : bill
    ));

    updateProject(currentProject.id, { bills: nextBills });
    setActiveSectionSidebarId(draggedSectionId);
    setBillSectionJumpTarget(draggedSectionId);
    setActivePageSidebarId(null);
    setBillPageJumpTarget(null);
    showToast({ type: 'success', message: 'Reordered sections.', duration: 2200 });
  }, [activeBill, currentProject, showToast, updateProject]);

  const activeSectionForNavigation = React.useMemo(() => {
    if (!activeBill?.sections?.length) return null;
    return activeBill.sections.find((section) => section.id === activeSectionSidebarId) || activeBill.sections[0] || null;
  }, [activeBill, activeSectionSidebarId]);

  const activeSectionPages = React.useMemo(
    () => (activeSectionForNavigation?.pages || []).map((page) => ({ id: page.id, name: page.name || 'Unnamed page' })),
    [activeSectionForNavigation]
  );

  const activePageForNavigation = React.useMemo(() => {
    if (!activeSectionForNavigation?.pages?.length) return null;
    return activeSectionForNavigation.pages.find((page) => page.id === activePageSidebarId) || null;
  }, [activePageSidebarId, activeSectionForNavigation]);

  const workspaceLocationLabel = React.useMemo(() => {
    if (!activeBill) return undefined;
    const parts = [activeBill.name || 'Bill'];
    if (activeSectionForNavigation) {
      const sectionIndex = activeBill.sections.findIndex((section) => section.id === activeSectionForNavigation.id);
      parts.push(`Section ${sectionIndex + 1}`);
    }
    if (activePageForNavigation) {
      const pageIndex = activeSectionForNavigation?.pages?.findIndex((page) => page.id === activePageForNavigation.id) ?? -1;
      parts.push(`Page ${pageIndex + 1}`);
    } else if (activeSectionForNavigation?.pages?.length) {
      parts.push('Page workspace');
    }
    return parts.join(' > ');
  }, [activeBill, activePageForNavigation, activeSectionForNavigation]);

  const copyTargetProjects = React.useMemo<CopyTargetProjectOption[]>(() => (
    projects.map((project) => ({
      id: project.id,
      name: project.name,
      bills: project.bills.map((bill) => ({
        id: bill.id,
        name: bill.name,
        sections: bill.sections.map((section) => ({
          id: section.id,
          name: section.name,
          hasPages: Boolean(section.pages?.length),
          pages: (section.pages || []).map((page) => ({
            id: page.id,
            name: page.name || 'Unnamed page',
          })),
        })),
      })),
    }))
  ), [projects]);

  const copyTargetLibraries = React.useMemo<CopyTargetLibraryOption[]>(() => (
    libraries.map((library) => ({
      id: library.id,
      name: library.name,
      folders: library.folders.map((folder) => ({ id: folder.id, name: folder.name })),
    }))
  ), [libraries]);

  const openCopyModal = React.useCallback((source: CopySourceState) => {
    setCopySource(source);
  }, []);

  const handleInsertStandardsItems = React.useCallback((
    items: BoQItem[],
    destination: { billId?: string; sectionId?: string; pageId?: string | null; placement: 'TOP' | 'BOTTOM' | 'AFTER_SELECTED' | 'BEFORE_SELECTED'; anchorItemId?: string | null },
  ) => {
    if (!currentProject || !activeBill || items.length === 0) return;
    if ((destination.billId && destination.billId !== activeBill.id) || !isBillInsertDestinationValid(activeBill, destination)) {
      showToast({ type: 'error', message: 'The insertion destination changed. Select a destination row and try again.' });
      return;
    }

    const applyInsert = (existingItems: BoQItem[]) => insertItemsAtPlacement(
      existingItems,
      items,
      destination.placement,
      destination.anchorItemId,
    );

    let bills: BoQBill[];
    if (destination.sectionId && destination.pageId) {
      bills = updateBillSectionPageItems(currentProject, activeBill.id, destination.sectionId, destination.pageId, applyInsert);
    } else if (destination.sectionId) {
      bills = updateBillSectionItems(currentProject, activeBill.id, destination.sectionId, applyInsert);
    } else {
      bills = updateBillItems(currentProject, activeBill.id, applyInsert);
    }

    updateProject(currentProject.id, { bills });
    const pricedCount = items.filter((item) => ['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(item.type)).length;
    const headingOrCommentCount = items.length - pricedCount;
    const destinationSection = destination.sectionId
      ? activeBill.sections.find((section) => section.id === destination.sectionId)
      : null;
    const destinationPage = destination.pageId
      ? destinationSection?.pages?.find((page) => page.id === destination.pageId)
      : null;
    const destinationLabel = [activeBill.name, destinationSection?.name, destinationPage?.name]
      .filter(Boolean)
      .join(' / ');
    recordOperationLogEntry({
      kind: 'bill',
      status: 'success',
      subject: 'Inserted Standards rows',
      message: `Inserted ${items.length.toLocaleString()} Standards row${items.length === 1 ? '' : 's'} into ${destinationLabel || activeBill.name} (${destination.placement.toLowerCase().replace(/_/g, ' ')}).`,
      projectId: currentProject.id,
      projectName: currentProject.name,
      billId: activeBill.id,
      billName: activeBill.name,
      counts: {
        items: items.length,
        added: items.length,
        pricedItems: pricedCount,
        structureRows: headingOrCommentCount,
      },
    });
    const insertedItemIds = items.map((item) => item.id);
    if (insertedItemIds.length > 0) {
      setSelectedItemIds(new Set(insertedItemIds));
      setRecentlyInsertedItemIds(new Set(insertedItemIds));

      if (recentlyInsertedClearTimerRef.current !== null) {
        window.clearTimeout(recentlyInsertedClearTimerRef.current);
      }
      recentlyInsertedClearTimerRef.current = window.setTimeout(() => {
        setRecentlyInsertedItemIds(new Set());
        recentlyInsertedClearTimerRef.current = null;
      }, 4500);

      if (destination.sectionId) {
        setActiveSectionSidebarId(destination.sectionId);
        setBillSectionJumpTarget(destination.sectionId);
      }
      if (destination.pageId) {
        setBillPageJumpTarget(destination.pageId);
      }

      window.setTimeout(() => {
        const billRows = Array.from(document.querySelectorAll<HTMLElement>('[data-bill-row-id]'));
        const targetRow = billRows.find((row) => insertedItemIds.includes(row.dataset.billRowId || ''));
        targetRow?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 180);
    }
    showToast({
      type: 'success',
      message: `Inserted ${items.length.toLocaleString()} standard row${items.length === 1 ? '' : 's'} into ${activeBill.name}. New rows are selected.`,
      duration: 3000,
    });
  }, [activeBill, currentProject, setSelectedItemIds, showToast, updateProject]);

  const openNavigatorSectionContextMenu = React.useCallback((
    event: React.MouseEvent<HTMLElement>,
    section: BoQSection,
    sectionIndex: number,
  ) => {
    if (!activeBill || shouldUseNativeContextMenu(event.target)) return;
    event.preventDefault();
    event.stopPropagation();

    const sectionItems = section.pages?.length
      ? section.pages.flatMap((page) => page.items || [])
      : section.items || [];
    const sectionPricedCount = sectionItems.filter((item) => (
      item.type === 'PRICED' ||
      item.type === 'EXTRA_OVER_ITEM' ||
      item.type === 'PROVISIONAL_SUM' ||
      item.type === 'PC_SUM'
    )).length;
    const items: ContextMenuEntry[] = [
      { id: 'navigator-section-label', type: 'label', label: 'Navigation' },
      {
        id: 'navigator-section-jump',
        label: 'Jump to section',
        description: section.name,
        icon: <ChevronRight className="h-4 w-4" />,
        onSelect: () => {
          setActiveSectionSidebarId(section.id);
          setBillSectionJumpTarget(section.id);
        },
      },
      { id: 'navigator-section-add-label', type: 'label', label: 'Add' },
      {
        id: 'navigator-section-add-item',
        label: 'Add priced item',
        icon: <Plus className="h-4 w-4" />,
        onSelect: () => actions.openEditor(activeBill.id, section.id, undefined, 'PRICED'),
      },
      { id: 'navigator-section-edit-label', type: 'label', label: 'Edit' },
      {
        id: 'navigator-section-rename',
        label: 'Rename section',
        icon: <Edit2 className="h-4 w-4" />,
        onSelect: () => actions.openPrompt('RENAME_SECTION', { id: section.id, name: section.name }),
      },
      {
        id: 'navigator-section-copy',
        label: 'Copy section',
        icon: <Copy className="h-4 w-4" />,
        onSelect: () => openCopyModal({
          kind: 'SECTION',
          billId: activeBill.id,
          sectionId: section.id,
          label: section.name,
        }),
      },
      { id: 'navigator-section-move-label', type: 'label', label: 'Move' },
      {
        id: 'navigator-section-move-up',
        label: 'Move up',
        disabled: sectionIndex <= 0,
        onSelect: () => actions.handleMoveSection(activeBill.id, section.id, 'UP'),
      },
      {
        id: 'navigator-section-move-down',
        label: 'Move down',
        disabled: sectionIndex >= activeBill.sections.length - 1,
        onSelect: () => actions.handleMoveSection(activeBill.id, section.id, 'DOWN'),
      },
      ...(sectionPricedCount > 0
        ? buildClearValuesActionItems((mode) => actions.handleClearSectionValues(activeBill.id, section.id, mode))
        : []),
      { id: 'navigator-section-danger-label', type: 'label', label: 'Danger' },
      {
        id: 'navigator-section-delete',
        label: 'Delete section',
        icon: <Trash2 className="h-4 w-4" />,
        tone: 'danger',
        onSelect: () => actions.handleDeleteSection(activeBill.id, section.id),
      },
    ];

    setNavigatorContextMenu({
      x: event.clientX,
      y: event.clientY,
      label: `${section.name} actions`,
      items,
    });
  }, [activeBill, actions, openCopyModal]);

  const handleProjectExcelExport = React.useCallback(async (mode: 'bill-tabs' | 'separate-bill-workbooks') => {
    if (!currentProject) return;
    setIsExporting(true);
    try {
      const { exportProjectToExcelWithOptions } = await loadExcelExports();
      const didExport = await exportProjectToExcelWithOptions(currentProject, trades, { mode });
      if (!didExport) return;
      showToast({
        type: 'success',
        message: feedbackSuccess(
          mode === 'bill-tabs' ? 'Project Excel export' : 'Separate bill Excel exports'
        ),
        duration: 3000,
      });
    } catch (e) {
      showToast({
        type: 'error',
        message: feedbackError(
          mode === 'bill-tabs' ? 'Project Excel export' : 'Separate bill Excel exports',
          e,
          'Please try the export again.'
        ),
      });
    } finally {
      setIsExporting(false);
      setIsProjectExcelExportOpen(false);
    }
  }, [currentProject, setIsExporting, showToast, trades]);

  const getCopyBill = React.useCallback((source: CopySourceState, requestedName?: string) => {
    const sourceBill = currentProject.bills.find((bill) => bill.id === source.billId);
    if (!sourceBill) return null;

    if (source.kind === 'BILL') {
      return cloneBoQBill(sourceBill, requestedName || sourceBill.name);
    }

    if (source.kind === 'SECTION') {
      const section = sourceBill.sections.find((entry) => entry.id === source.sectionId);
      if (!section) return null;
      return {
        id: generateId(),
        name: requestedName || section.name,
        billType: 'STANDARD',
        houseTypeName: undefined,
        houseTypeQuantity: 1,
        sections: [cloneBoQSection(section)],
        items: [],
      };
    }

    const section = sourceBill.sections.find((entry) => entry.id === source.sectionId);
    const page = section?.pages?.find((entry) => entry.id === source.pageId);
    if (!section || !page) return null;
    return {
      id: generateId(),
      name: requestedName || (page.name || `${section.name} page`),
      billType: 'STANDARD',
      houseTypeName: undefined,
      houseTypeQuantity: 1,
      sections: [{
        id: generateId(),
        name: section.name,
        items: [],
        pages: [cloneBoQPage(page)],
      }],
      items: [],
    };
  }, [currentProject]);

  const getFlattenedCopyItems = React.useCallback((source: CopySourceState) => {
    const sourceBill = currentProject.bills.find((bill) => bill.id === source.billId);
    if (!sourceBill) return [] as BoQItem[];
    if (source.kind === 'BILL') {
      return flattenBillToItems(sourceBill, {
        includeBillHeading: true,
        includeSectionHeadings: true,
        includePageHeadings: true,
      });
    }
    if (source.kind === 'SECTION') {
      const section = sourceBill.sections.find((entry) => entry.id === source.sectionId);
      return section ? flattenSectionToItems(section, { includeSectionHeading: true, includePageHeadings: true }) : [];
    }
    const section = sourceBill.sections.find((entry) => entry.id === source.sectionId);
    const page = section?.pages?.find((entry) => entry.id === source.pageId);
    return page ? flattenPageToItems(page, { includePageHeading: true }) : [];
  }, [currentProject]);

  const handleCopyContent = React.useCallback((payload: CopyContentSubmitPayload) => {
    if (!copySource) return;

    const copiedBill = getCopyBill(copySource, payload.newName);
    const flattenedItems = getFlattenedCopyItems(copySource);

    if (payload.destination === 'NEW_PROJECT') {
      if (!copiedBill || !payload.newName) return;
      const nextProject = createProjectFromSource(payload.newName, copiedBill);
      setProjects((prev) => [...prev, nextProject]);
      setCurrentProjectId(nextProject.id);
      setActiveBillId(nextProject.bills[0]?.id || null);
      setCopySource(null);
      showToast({ type: 'success', message: `Copied ${copySource.label} into a new project.`, duration: 3000 });
      return;
    }

    if (payload.destination === 'PROJECT') {
      if (!payload.targetProjectId || !copiedBill || !payload.newName) return;
      const targetProject = projects.find((project) => project.id === payload.targetProjectId);
      if (!targetProject) return;
      updateProject(targetProject.id, { bills: [...targetProject.bills, copiedBill] });
      setCopySource(null);
      showToast({ type: 'success', message: `Copied ${copySource.label} into ${targetProject.name}.`, duration: 3000 });
      return;
    }

    if (payload.destination === 'BILL') {
      if (!payload.targetProjectId || !payload.targetBillId) return;
      const targetProject = projects.find((project) => project.id === payload.targetProjectId);
      const targetBillIndex = targetProject?.bills.findIndex((bill) => bill.id === payload.targetBillId) ?? -1;
      if (!targetProject || targetBillIndex === -1) return;
      const targetBill = targetProject.bills[targetBillIndex];
      let mergedBill: BoQBill = targetBill;
      if (copySource.kind === 'SECTION') {
        const sourceBill = currentProject.bills.find((bill) => bill.id === copySource.billId);
        const sourceSection = sourceBill?.sections.find((section) => section.id === copySource.sectionId);
        if (!sourceSection) return;
        mergedBill = {
          ...targetBill,
          sections: [...targetBill.sections, cloneBoQSection(sourceSection, payload.newName || sourceSection.name)],
        };
      } else if (copySource.kind === 'PAGE') {
        const sourceBill = currentProject.bills.find((bill) => bill.id === copySource.billId);
        const sourceSection = sourceBill?.sections.find((section) => section.id === copySource.sectionId);
        const sourcePage = sourceSection?.pages?.find((page) => page.id === copySource.pageId);
        if (!sourceSection || !sourcePage) return;
        mergedBill = {
          ...targetBill,
          sections: [...targetBill.sections, {
            id: generateId(),
            name: payload.newName || sourceSection.name,
            items: [],
            pages: [cloneBoQPage(sourcePage)],
          }],
        };
      } else {
        return;
      }
      const nextBills = targetProject.bills.map((bill, index) => (
        index === targetBillIndex ? reindexBillReferences(mergedBill, index) : bill
      ));
      updateProject(targetProject.id, { bills: nextBills });
      setCopySource(null);
      showToast({ type: 'success', message: `Copied ${copySource.label} into ${targetBill.name}.`, duration: 3000 });
      return;
    }

    if (payload.destination === 'SECTION') {
      if (!payload.targetProjectId || !payload.targetBillId || !payload.targetSectionId) return;
      if (copySource.kind !== 'PAGE') return;
      const targetProject = projects.find((project) => project.id === payload.targetProjectId);
      const targetBillIndex = targetProject?.bills.findIndex((bill) => bill.id === payload.targetBillId) ?? -1;
      if (!targetProject || targetBillIndex === -1) return;
      const sourceBill = currentProject.bills.find((bill) => bill.id === copySource.billId);
      const sourceSection = sourceBill?.sections.find((section) => section.id === copySource.sectionId);
      const sourcePage = sourceSection?.pages?.find((page) => page.id === copySource.pageId);
      if (!sourceSection || !sourcePage) return;

      const nextBills = targetProject.bills.map((bill, index) => {
        if (bill.id !== payload.targetBillId) return bill;
        const nextSections = bill.sections.map((section) => {
          if (section.id !== payload.targetSectionId) return section;
          return appendPageToSection(section, sourcePage, payload.newName || sourcePage.name || copySource.label);
        });
        return reindexBillReferences({ ...bill, sections: nextSections }, index);
      });

      updateProject(targetProject.id, { bills: nextBills });
      setCopySource(null);
      showToast({ type: 'success', message: `Copied ${copySource.label} into the selected section.`, duration: 3000 });
      return;
    }

    if (payload.destination === 'LIBRARY') {
      if (!payload.targetLibraryId || !payload.targetFolderId) return;
      const libraryItems = toLibraryItems(flattenedItems);
      const sectionId = generateId();
      void createSection(payload.targetLibraryId, payload.targetFolderId, {
        id: sectionId,
        name: payload.newName || copySource.label,
        items: [],
      }).then(async () => {
        await appendLibraryItems({
          libraryId: payload.targetLibraryId!,
          folderId: payload.targetFolderId!,
          sectionId,
        }, libraryItems as BoQItem[]);
        setLibraries(await listLibraryCatalogs());
      });
      setCopySource(null);
      showToast({ type: 'success', message: `Copied ${copySource.label} into the library.`, duration: 3000 });
    }
  }, [copySource, currentProject, getCopyBill, getFlattenedCopyItems, projects, setActiveBillId, setCurrentProjectId, setLibraries, setProjects, showToast, updateProject]);

  const handleCreateSnapshot = React.useCallback(() => {
    const label = `Restore point ${new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`;
    const summary = activeBill ? `Captured while working in ${activeBill.name}.` : 'Manual restore point.';
    const snapshot = createSnapshotEntry(currentProject, label, summary);
    const nextSnapshots = prependSnapshot(currentProject.snapshots, snapshot);

    updateProject(currentProject.id, { snapshots: nextSnapshots });
    showToast({ type: 'success', message: `Created restore point "${label}".`, duration: 3000 });
  }, [activeBill, createSnapshotEntry, currentProject, showToast, updateProject]);

  const handleCreateBoqRevisionPoint = React.useCallback((details?: BoqRevisionPointDetails) => {
    const snapshot = createBoqRevisionPoint(currentProject, activeBill, details);
    const nextSnapshots = prependSnapshot(currentProject.snapshots, snapshot);
    const stats = collectRevisionStats(currentProject, snapshot.scope);

    updateProject(currentProject.id, { snapshots: nextSnapshots });
    recordOperationLogEntry({
      kind: 'bill',
      status: 'success',
      subject: 'BoQ revision point created',
      message: `Recorded ${snapshot.scope?.type === 'BILL' ? snapshot.scope.billName || 'the active bill' : currentProject.name} as a BoQ revision point.`,
      projectId: currentProject.id,
      projectName: currentProject.name,
      billId: snapshot.scope?.billId,
      billName: snapshot.scope?.billName,
      counts: {
        bills: stats.bills,
        sections: stats.sections,
        pages: stats.pages,
        items: stats.items,
        pricedItems: stats.pricedItems,
      },
      nextStep: 'Use Version history to compare live BoQ changes or revert to this revision point.',
    });
    setIsBoqRevisionPointOpen(false);
    showToast({ type: 'success', message: `Recorded BoQ revision point for ${snapshot.scope?.billName || currentProject.name}.`, duration: 3200 });
  }, [activeBill, currentProject, showToast, updateProject]);

  const handleAdjustBillWorkspaceZoom = React.useCallback((direction: -1 | 1) => {
    setBillWorkspaceZoom((current) => {
      const next = current + direction * 10;
      return Math.max(50, Math.min(130, next));
    });
  }, []);

  const handleApplyWorkspacePreset = React.useCallback((presetId: string) => {
    const preset = WORKSPACE_VIEW_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) return;

    setActiveWorkspacePresetId(presetId);
    setBillWorkspaceZoom(100);
    setIsBillWorkspaceFocused(preset.focusMode);
    setIsInspectorFloating(false);
    setIsLibraryWindowOpen(false);
    setIsTenderViewOpen(false);
    setIsCostReportsHubOpen(false);
    setIsAuditTrailOpen(false);
    setIsStandardsInsertOpen(false);

    if (presetId === 'clean-bill') {
      updateProject(currentProject.id, {
        billWorkspaceLayout: 'FULL_BILL',
        billWorkspaceMode: 'CLEAN',
        showWorkflowGuidance: false,
      });
      setIsBillNavigatorCollapsed(false);
      setSelectedTradeFilter('ALL');
    } else if (presetId === 'trade-allocation') {
      updateProject(currentProject.id, {
        billWorkspaceLayout: 'FULL_BILL',
        billWorkspaceMode: 'CLEAN',
        showWorkflowGuidance: false,
      });
      setIsBillNavigatorCollapsed(false);
      setSelectedTradeFilter('ALL');
    } else if (presetId === 'tender-prep') {
      updateProject(currentProject.id, {
        billWorkspaceLayout: 'FULL_BILL',
        billWorkspaceMode: 'GUIDED',
        showWorkflowGuidance: true,
      });
      setIsBillNavigatorCollapsed(false);
      setIsStandardsInsertOpen(true);
    } else if (presetId === 'review-audit') {
      updateProject(currentProject.id, {
        billWorkspaceLayout: 'FULL_BILL',
        billWorkspaceMode: 'CLEAN',
        showWorkflowGuidance: false,
      });
      setIsBillNavigatorCollapsed(true);
      setSelectedTradeFilter('ALL');
    }

    showToast({ type: 'success', message: `Workspace view set to ${preset.label}.`, duration: 2500 });
  }, [
    currentProject.id,
    setIsCostReportsHubOpen,
    setIsLibraryWindowOpen,
    setIsTenderViewOpen,
    setSelectedTradeFilter,
    showToast,
    updateProject,
  ]);

  const handleStartInspectorFloatDrag = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('button,input,select,textarea,a,[role="button"],[contenteditable="true"]')) return;

    event.preventDefault();
    inspectorDragOffsetRef.current = {
      x: event.clientX - inspectorFloatPosition.x,
      y: event.clientY - inspectorFloatPosition.y,
    };
    setIsDraggingInspector(true);
  }, [inspectorFloatPosition]);

  React.useEffect(() => {
    if (!isDraggingInspector) return undefined;

    const handleMouseMove = (event: MouseEvent) => {
      setInspectorFloatPosition(clampInspectorFloatPosition({
        x: event.clientX - inspectorDragOffsetRef.current.x,
        y: event.clientY - inspectorDragOffsetRef.current.y,
      }, inspectorFloatSize));
    };

    const handleMouseUp = () => {
      setIsDraggingInspector(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [inspectorFloatSize, isDraggingInspector]);

  const handleStartInspectorResize = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    inspectorResizeStartRef.current = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      width: inspectorFloatSize.width,
      height: inspectorFloatSize.height,
    };
    setIsResizingInspector(true);
  }, [inspectorFloatSize]);

  React.useEffect(() => {
    if (!isResizingInspector) return undefined;

    const handleMouseMove = (event: MouseEvent) => {
      const nextSize = clampInspectorFloatSize({
        width: inspectorResizeStartRef.current.width + (event.clientX - inspectorResizeStartRef.current.mouseX),
        height: inspectorResizeStartRef.current.height + (event.clientY - inspectorResizeStartRef.current.mouseY),
      });
      setInspectorFloatSize(nextSize);
      setInspectorFloatPosition((current) => clampInspectorFloatPosition(current, nextSize));
    };

    const handleMouseUp = () => {
      setIsResizingInspector(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingInspector]);

  const handleSaveSectionAssembly = React.useCallback((sectionId: string) => {
    if (!currentProject || !activeBill) return;
    const section = activeBill.sections.find((entry) => entry.id === sectionId);
    if (!section) return;

    const assembly = buildSectionAssembly(currentProject, section, activeBill.id);
    updateProject(currentProject.id, {
      sectionAssemblies: [...(currentProject.sectionAssemblies || []), assembly],
    });
    showToast({ type: 'success', message: `Saved "${section.name}" as a reusable assembly.`, duration: 3000 });
  }, [activeBill, currentProject, showToast, updateProject]);

  const handleApplyAssembly = React.useCallback((assembly: SectionAssembly) => {
    if (!currentProject || !activeBill) return;
    const clonedSection = cloneAssemblySection(assembly.section);
    const billIndex = currentProject.bills.findIndex((entry) => entry.id === activeBill.id);
    if (billIndex === -1) return;

    const updatedBill = reindexBillReferences(
      {
        ...activeBill,
        sections: [...activeBill.sections, clonedSection],
      },
      billIndex
    );

    updateProject(currentProject.id, {
      bills: currentProject.bills.map((bill) => (bill.id === activeBill.id ? updatedBill : bill)),
    });
    setActiveSectionSidebarId(clonedSection.id);
    setBillSectionJumpTarget(clonedSection.id);
    setIsAssembliesOpen(false);
    showToast({ type: 'success', message: `Applied "${assembly.name}" to ${activeBill.name}.`, duration: 3000 });
  }, [activeBill, currentProject, showToast, updateProject]);

  const handleDeleteAssembly = React.useCallback((assemblyId: string) => {
    if (!currentProject) return;
    updateProject(currentProject.id, {
      sectionAssemblies: (currentProject.sectionAssemblies || []).filter((entry) => entry.id !== assemblyId),
    });
    showToast({ type: 'success', message: 'Assembly removed.', duration: 2500 });
  }, [currentProject, showToast, updateProject]);

  const handleRestoreSnapshot = React.useCallback(async (snapshotId: string, options?: { skipConfirm?: boolean }) => {
    const snapshot = (currentProject.snapshots || []).find((entry) => entry.id === snapshotId);
    if (!snapshot) return;
    const isBoqRevision = snapshot.kind === 'BOQ_REVISION';

    if (!options?.skipConfirm) {
      const ok = await askConfirm({
        title: isBoqRevision ? 'Revert to BoQ revision point' : 'Restore project snapshot',
        message: `${isBoqRevision ? 'Revert to' : 'Restore'} "${snapshot.label}"? The current project state will be saved as a new restore point first, then the live project will roll back to the selected point.`,
        confirmLabel: isBoqRevision ? 'Revert' : 'Restore',
        cancelLabel: 'Cancel',
      });
      if (!ok) return;
    }

    const preRestoreSnapshot = createSnapshotEntry(
      currentProject,
      `Before restore ${new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`,
      `Automatic restore point created before rolling back to "${snapshot.label}".`,
    );
    const nextSnapshots = prependSnapshot(currentProject.snapshots, preRestoreSnapshot);

    updateProject(currentProject.id, {
      ...snapshot.projectData,
      snapshots: nextSnapshots,
    });
    recordOperationLogEntry({
      kind: isBoqRevision ? 'bill' : 'system',
      status: 'success',
      subject: isBoqRevision ? 'BoQ revision point reverted' : 'Project snapshot restored',
      message: `${isBoqRevision ? 'Reverted to' : 'Restored'} "${snapshot.label}". A pre-restore snapshot was saved automatically.`,
      projectId: currentProject.id,
      projectName: currentProject.name,
      billId: snapshot.scope?.billId,
      billName: snapshot.scope?.billName,
    });
    showToast({ type: 'success', message: `${isBoqRevision ? 'Reverted to' : 'Restored'} "${snapshot.label}". A pre-restore snapshot was saved automatically.`, duration: 3500 });
    setIsVersionHistoryOpen(false);
  }, [askConfirm, createSnapshotEntry, currentProject, setIsVersionHistoryOpen, showToast, updateProject]);

  const activeItemId =
    (editorConfig.billId && !editorConfig.libId) || isEditorOpen
      ? editorConfig.item?.id ?? null
      : null;

  const buildDraftFromItem = React.useCallback((item?: BoQItem | null, fallbackType?: string) => ({
    description: item?.description || '',
    unit: normalizeUnit(String(item?.unit || '')),
    quantity: item?.quantity ?? 0,
    quantityDecimals: item?.quantityDecimals ?? 0,
    rate: item?.rate ?? 0,
    reference: item?.reference || '',
    tradePackageId: item?.tradePackageId || '',
    dimensionRows: item?.dimensionRows || [],
    rateBuildUp: normaliseRateBuildUp(item?.rateBuildUp),
    type: (fallbackType || item?.type || 'PRICED') as BoQItem['type'],
    aiLocks: item?.aiLocks || { description: false, rate: false, measurements: false },
  }), []);

  const editorContext = React.useMemo(() => {
    if (editorConfig.libId) {
      const library = libraries.find((lib) => lib.id === editorConfig.libId);
      const folder = library?.folders.find((entry) => entry.id === editorConfig.folderId);
      const section = folder?.sections.find((entry) => entry.id === editorConfig.libSectionId);
      const page = section?.pages?.find((entry) => entry.id === editorConfig.pageId);

      return {
        title: library ? `${library.name}${folder ? ` / ${folder.name}` : ''}` : 'Library workspace',
        detail: page
          ? `Editing standard item on ${page.name || 'selected library page'} in ${section?.name || 'this section'}.`
          : section
            ? `Editing standard item in ${section.name}.`
            : 'Editing a reusable library item.',
      };
    }

    if (!currentProject || !editorConfig.billId) {
      return { title: undefined, detail: undefined };
    }

    const bill = currentProject.bills.find((entry) => entry.id === editorConfig.billId);
    const section = bill?.sections.find((entry) => entry.id === editorConfig.sectionId);
    const page = section?.pages?.find((entry) => entry.id === editorConfig.pageId);

    const titleParts = [currentProject.name, bill?.name, section?.name].filter(Boolean);
    const detail = page
      ? `Editing item on ${page.name || 'selected page'}. Save here to keep the page breakdown intact.`
      : section
        ? 'Editing an item directly inside this section.'
        : 'Editing an item in the current project workspace.';

    return {
      title: titleParts.join(' / '),
      detail,
    };
  }, [currentProject, editorConfig, libraries]);

  const quickAddTargets = React.useMemo(() => {
    if (!currentProject || !editorConfig.billId || editorConfig.libId) return [];
    const bill = currentProject.bills.find((entry) => entry.id === editorConfig.billId);
    if (!bill) return [];
    const targets: Array<{ value: string; label: string; sectionId: string; pageId?: string | null; insertAfterItemId?: string | null }> = [];

    const buildPlacementTargets = (
      labelPrefix: string,
      items: BoQItem[],
      sectionId: string,
      pageId?: string | null,
    ) => {
      if (items.length === 0) {
        targets.push({
          value: `${sectionId || '__bill__'}::${pageId || '__page__'}::__top__`,
          label: `${labelPrefix} - First item`,
          sectionId,
          pageId,
          insertAfterItemId: null,
        });
        return;
      }

      const describeItem = (item: BoQItem, index: number) => item.reference || stripRichText(item.description).trim() || `Item ${index + 1}`;

      targets.push({
        value: `${sectionId || '__bill__'}::${pageId || '__page__'}::__top__`,
        label: `${labelPrefix} - Before ${describeItem(items[0], 0)}`,
        sectionId,
        pageId,
        insertAfterItemId: null,
      });

      items.forEach((item, index) => {
        const currentLabel = describeItem(item, index);
        const nextItem = items[index + 1];
        targets.push({
          value: `${sectionId || '__bill__'}::${pageId || '__page__'}::${item.id}`,
          label: nextItem
            ? `${labelPrefix} - After ${currentLabel} / Before ${describeItem(nextItem, index + 1)}`
            : `${labelPrefix} - After ${currentLabel}`,
          sectionId,
          pageId,
          insertAfterItemId: item.id,
        });
      });
    };

    buildPlacementTargets(`${bill.name} - Bill level`, bill.items || [], '', undefined);

    bill.sections.forEach((section, sectionIndex) => {
      if (section.pages?.length) {
        section.pages.forEach((page, pageIndex) => {
          buildPlacementTargets(
            `Section ${sectionIndex + 1} - Page ${pageIndex + 1}`,
            page.items || [],
            section.id,
            page.id,
          );
        });
      } else {
        buildPlacementTargets(
          `Section ${sectionIndex + 1} - ${section.name}`,
          section.items || [],
          section.id,
          undefined,
        );
      }
    });

    return targets;
  }, [currentProject, editorConfig.billId, editorConfig.libId]);

  const importLineTargets = React.useMemo(() => {
    if (!activeBill) return [] as Array<{ value: string; label: string; sectionId: string; pageId?: string | null; insertAfterItemId?: string | null }>;
    const targets: Array<{ value: string; label: string; sectionId: string; pageId?: string | null; insertAfterItemId?: string | null }> = [];

    const buildPlacementTargets = (
      labelPrefix: string,
      items: BoQItem[],
      sectionId: string,
      pageId?: string | null,
    ) => {
      if (items.length === 0) {
        targets.push({
          value: `${sectionId || '__bill__'}::${pageId || '__page__'}::__top__`,
          label: `${labelPrefix} - First item`,
          sectionId,
          pageId,
          insertAfterItemId: null,
        });
        return;
      }

      const describeItem = (item: BoQItem, index: number) => item.reference || stripRichText(item.description).trim() || `Item ${index + 1}`;

      targets.push({
        value: `${sectionId || '__bill__'}::${pageId || '__page__'}::__top__`,
        label: `${labelPrefix} - Before ${describeItem(items[0], 0)}`,
        sectionId,
        pageId,
        insertAfterItemId: null,
      });

      items.forEach((item, index) => {
        const currentLabel = describeItem(item, index);
        const nextItem = items[index + 1];
        targets.push({
          value: `${sectionId || '__bill__'}::${pageId || '__page__'}::${item.id}`,
          label: nextItem
            ? `${labelPrefix} - After ${currentLabel} / Before ${describeItem(nextItem, index + 1)}`
            : `${labelPrefix} - After ${currentLabel}`,
          sectionId,
          pageId,
          insertAfterItemId: item.id,
        });
      });
    };

    buildPlacementTargets(`${activeBill.name} - Bill level`, activeBill.items || [], '', undefined);
    activeBill.sections.forEach((section, sectionIndex) => {
      if (section.pages?.length) {
        section.pages.forEach((page, pageIndex) => {
          buildPlacementTargets(`Section ${sectionIndex + 1} - Page ${pageIndex + 1}`, page.items || [], section.id, page.id);
        });
      } else {
        buildPlacementTargets(`Section ${sectionIndex + 1} - ${section.name}`, section.items || [], section.id, undefined);
      }
    });
    return targets;
  }, [activeBill]);

  const importLineProjects = React.useMemo(() => (
    projects.map((project) => ({
      id: project.id,
      name: project.name,
      bills: project.bills.map((bill) => ({
        id: bill.id,
        name: bill.name,
        lines: flattenBillToImportLines(bill).map((item, index) => ({
          id: item.id,
          label: item.reference || stripRichText(item.description).trim() || `Line ${index + 1}`,
          typeLabel: item.type.replace(/_/g, ' ').toLowerCase(),
          description: stripRichText(item.description),
        })),
      })),
    }))
  ), [projects]);

  const handleImportLines = React.useCallback((payload: {
    sourceProjectId: string;
    sourceBillId: string;
    lineIds: string[];
    targetValue: string;
  }) => {
    if (!currentProject || !activeBill) return;
    const sourceProject = projects.find((project) => project.id === payload.sourceProjectId);
    const sourceBill = sourceProject?.bills.find((bill) => bill.id === payload.sourceBillId);
    if (!sourceBill) return;

    const sourceItems = flattenBillToImportLines(sourceBill)
      .filter((item) => payload.lineIds.includes(item.id))
      .map(cloneBoQItem);
    if (sourceItems.length === 0) return;

    const target = importLineTargets.find((entry) => entry.value === payload.targetValue);
    if (!target) return;

    const insertImportedItems = (items: BoQItem[]) => {
      if (!target.insertAfterItemId) {
        return [...sourceItems, ...items];
      }
      const nextItems = [...items];
      const targetIndex = nextItems.findIndex((entry) => entry.id === target.insertAfterItemId);
      if (targetIndex === -1) {
        return [...nextItems, ...sourceItems];
      }
      nextItems.splice(targetIndex + 1, 0, ...sourceItems);
      return nextItems;
    };

    let updatedBills = currentProject.bills;
    if (!target.sectionId) {
      updatedBills = updateBillItems(currentProject, activeBill.id, insertImportedItems);
    } else if (target.pageId) {
      updatedBills = updateBillSectionPageItems(currentProject, activeBill.id, target.sectionId, target.pageId, insertImportedItems);
    } else {
      updatedBills = updateBillSectionItems(currentProject, activeBill.id, target.sectionId, insertImportedItems);
    }

    updateProject(currentProject.id, { bills: updatedBills });
    setIsImportLinesOpen(false);
    showToast({
      type: 'success',
      message: `Imported ${sourceItems.length} line${sourceItems.length === 1 ? '' : 's'} from ${sourceBill.name}.`,
      duration: 3000,
    });
  }, [activeBill, currentProject, importLineTargets, projects, showToast, updateProject]);

  const handleWorkbookImport = React.useCallback(async (file: File, sheetName: string, targetValue: string) => {
    if (!currentProject || !activeBill) return;
    const preview = await inspectBoqWorkbook(file, sheetName);
    const target = importLineTargets.find((entry) => entry.value === targetValue);
    if (!target || preview.lines.length === 0) return;
    const confirmed = await askConfirm({ title: 'Append workbook lines?', message: `Import ${preview.lines.length} classified line${preview.lines.length === 1 ? '' : 's'} from ${file.name} / ${sheetName} into ${target.label}? Workbook total: ${formatCurrency(preview.sourceTotal)}. Imported total: ${formatCurrency(preview.importedTotal)}. A BoQ revision point will be created first.`, confirmLabel: 'Append lines', cancelLabel: 'Cancel' });
    if (!confirmed) return;
    const snapshot = createBoqRevisionPoint(currentProject, activeBill, { label: `Workbook import - ${file.name} / ${sheetName}`, note: `Destination: ${target.label}; lines: ${preview.lines.length}; imported total: ${formatCurrency(preview.importedTotal)}.` });
    const imported = createBoqItemsFromWorkbookLines(preview.lines);
    const append = (items: BoQItem[]) => [...items, ...imported];
    const bills = !target.sectionId ? updateBillItems(currentProject, activeBill.id, append) : target.pageId ? updateBillSectionPageItems(currentProject, activeBill.id, target.sectionId, target.pageId, append) : updateBillSectionItems(currentProject, activeBill.id, target.sectionId, append);
    updateProject(currentProject.id, { bills, snapshots: prependSnapshot(currentProject.snapshots || [], snapshot) });
    recordOperationLogEntry({ kind: 'import', status: 'success', subject: 'BoQ workbook import', message: `${file.name} / ${sheetName} appended to ${target.label}.`, counts: { items: imported.length }, path: file.name });
    setIsImportLinesOpen(false); showToast({ type: 'success', message: `Imported ${imported.length} workbook lines into ${target.label}.`, duration: 3500 });
  }, [activeBill, askConfirm, currentProject, importLineTargets, showToast, updateProject]);

  const handleImportJsonIntoScope = React.useCallback(async (payload: { sectionId: string; pageId?: string | null }) => {
    if (!currentProject || !activeBill) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importedProjects = parseProjectJsonImport(JSON.parse(text));
        const importedItems = importedProjects.flatMap((project, projectIndex) =>
          project.bills.flatMap((bill, billIndex) =>
            flattenBillToItems(bill, {
              includeBillHeading: importedProjects.length > 1 || project.bills.length > 1 || projectIndex > 0 || billIndex > 0,
              includeSectionHeadings: true,
              includePageHeadings: true,
            })
          )
        );

        if (importedItems.length === 0) {
          showToast({ type: 'info', message: 'No bill items were found in that JSON export.' });
          return;
        }

        const scopeLabel = payload.pageId ? 'page' : 'section';
        const ok = await askConfirm({
          title: `Import JSON into ${scopeLabel}`,
          message: `Import ${importedItems.length} line${importedItems.length === 1 ? '' : 's'} from "${file.name}" into this ${scopeLabel}?`,
          confirmLabel: 'Import',
          cancelLabel: 'Cancel',
        });
        if (!ok) return;

        if (shouldAutoSnapshot(currentProject)) {
          const snapshot = createSnapshotEntry(
            currentProject,
            `Before JSON import ${new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`,
            `Automatic restore point created before importing JSON lines into a ${scopeLabel}.`
          );
          updateProject(currentProject.id, { snapshots: prependSnapshot(currentProject.snapshots, snapshot) });
        }

        const appendItems = (items: BoQItem[]) => [...items, ...importedItems];
        const updatedBills = payload.pageId
          ? updateBillSectionPageItems(currentProject, activeBill.id, payload.sectionId, payload.pageId, appendItems)
          : updateBillSectionItems(currentProject, activeBill.id, payload.sectionId, appendItems);

        updateProject(currentProject.id, { bills: updatedBills });
        showToast({
          type: 'success',
          message: feedbackSuccess(`JSON import to ${scopeLabel}`, `${importedItems.length} line${importedItems.length === 1 ? '' : 's'} added`),
        });
      } catch (error) {
        showToast({
          type: 'error',
          message: feedbackError('JSON import', error, `The JSON file could not be read or does not match an ${APP_NAME} project export.`),
        });
      }
    };
    input.click();
  }, [activeBill, askConfirm, currentProject, showToast, updateProject]);

  const quickAddTargetValue = React.useMemo(() => {
    return `${editorConfig.sectionId || '__bill__'}::${editorConfig.pageId || '__page__'}::${editorConfig.insertAfterItemId || '__top__'}`;
  }, [editorConfig.insertAfterItemId, editorConfig.pageId, editorConfig.sectionId]);

  const handleQuickAddTargetChange = React.useCallback((targetValue: string) => {
    const target = quickAddTargets.find((entry) => entry.value === targetValue);
    if (!target) return;
    setEditorConfig((prev) => ({
      ...prev,
      sectionId: target.sectionId,
      pageId: target.pageId ?? undefined,
      insertAfterItemId: target.insertAfterItemId ?? null,
    }));
  }, [quickAddTargets, setEditorConfig]);

  const editorItems = React.useMemo<BoQItem[]>(() => {
    if (!currentProject || !editorConfig.billId || editorConfig.libId) return [];
    const bill = currentProject.bills.find((entry) => entry.id === editorConfig.billId);
    if (!bill) return [];

    if (editorConfig.sectionId === '' || !editorConfig.sectionId) {
      return bill.items || [];
    }

    const section = bill.sections.find((entry) => entry.id === editorConfig.sectionId);
    if (!section) return [];

    if (editorConfig.pageId) {
      return section.pages?.find((entry) => entry.id === editorConfig.pageId)?.items || [];
    }

    return section.items || [];
  }, [currentProject, editorConfig]);

  const quickAddAnchorInfo = React.useMemo(() => {
    const selectedScopeItems = editorItems.filter((entry) => selectedItemIds.has(entry.id));
    if (selectedScopeItems.length !== 1) return null;
    const anchorItem = selectedScopeItems[0];
    const anchorIndex = editorItems.findIndex((entry) => entry.id === anchorItem.id);
    if (anchorIndex === -1) return null;
    const previousItem = anchorIndex > 0 ? editorItems[anchorIndex - 1] : null;
    const anchorLabel = anchorItem.reference || stripRichText(anchorItem.description).trim() || `Item ${anchorIndex + 1}`;
    return {
      anchorItemId: anchorItem.id,
      anchorLabel,
      previousItemId: previousItem?.id ?? null,
      placement: editorConfig.insertAfterItemId === anchorItem.id ? 'after' as const : 'before' as const,
    };
  }, [editorConfig.insertAfterItemId, editorItems, selectedItemIds]);

  const handleQuickAddPlacementChange = React.useCallback((placement: 'before' | 'after') => {
    if (!quickAddAnchorInfo) return;
    setEditorConfig((prev) => ({
      ...prev,
      insertAfterItemId: placement === 'after' ? quickAddAnchorInfo.anchorItemId : quickAddAnchorInfo.previousItemId,
    }));
  }, [quickAddAnchorInfo, setEditorConfig]);

  const editorLocationContext = React.useMemo(() => {
    if (editorConfig.libId) {
      return {
        modeLabel: editorConfig.item ? 'Editing existing library row' : 'Creating new library row',
        scopeLabel: editorContext.title,
        placementLabel: editorContext.detail,
      };
    }

    if (!currentProject || !editorConfig.billId) return null;
    const bill = currentProject.bills.find((entry) => entry.id === editorConfig.billId);
    if (!bill) return null;
    const sectionIndex = bill.sections.findIndex((entry) => entry.id === editorConfig.sectionId);
    const section = sectionIndex >= 0 ? bill.sections[sectionIndex] : null;
    const pageIndex = section?.pages?.findIndex((entry) => entry.id === editorConfig.pageId) ?? -1;
    const page = pageIndex >= 0 ? section?.pages?.[pageIndex] : null;
    const scopeLabel = [
      bill.name,
      section ? `Section ${sectionIndex + 1}: ${section.name}` : 'Bill level',
      page ? `Page ${pageIndex + 1}: ${page.name || 'Unnamed page'}` : null,
    ].filter(Boolean).join(' / ');
    const describeItem = (item: BoQItem, index: number) => item.reference || stripRichText(item.description).trim() || `row ${index + 1}`;

    if (editorConfig.item) {
      const itemIndex = editorItems.findIndex((entry) => entry.id === editorConfig.item?.id);
      return {
        modeLabel: 'Editing existing bill row',
        scopeLabel,
        placementLabel: itemIndex >= 0
          ? `Row ${itemIndex + 1} of ${editorItems.length}.`
          : 'This row is already in the selected bill scope.',
        rowLabel: itemIndex >= 0 ? describeItem(editorItems[itemIndex], itemIndex) : stripRichText(editorConfig.item.description).trim(),
      };
    }

    let placementLabel = 'Will save as the first row in this destination.';
    if (quickAddAnchorInfo) {
      placementLabel = `Will save ${quickAddAnchorInfo.placement} ${quickAddAnchorInfo.anchorLabel}.`;
    } else if (editorConfig.insertAfterItemId) {
      const anchorIndex = editorItems.findIndex((entry) => entry.id === editorConfig.insertAfterItemId);
      if (anchorIndex >= 0) placementLabel = `Will save after ${describeItem(editorItems[anchorIndex], anchorIndex)}.`;
    } else if (editorItems.length > 0) {
      placementLabel = `Will save before ${describeItem(editorItems[0], 0)}.`;
    }

    return {
      modeLabel: 'Creating new bill row',
      scopeLabel,
      placementLabel,
    };
  }, [currentProject, editorConfig, editorContext.detail, editorContext.title, editorItems, quickAddAnchorInfo]);

  const activeEditorItemIndex = React.useMemo(
    () => (editorConfig.item ? editorItems.findIndex((entry) => entry.id === editorConfig.item?.id) : -1),
    [editorItems, editorConfig.item]
  );

  const billNavigationRows = React.useMemo(() => {
    if (!currentProject || !editorConfig.billId || editorConfig.libId) return [];
    const bill = currentProject.bills.find((entry) => entry.id === editorConfig.billId);
    return bill ? getBillNavigationRows(bill) : [];
  }, [currentProject, editorConfig.billId, editorConfig.libId]);
  const billNavigationIndex = billNavigationRows.findIndex((row) => row.item.id === editorConfig.item?.id);
  const previousPricedRow = editorConfig.item ? getAdjacentBillRow(billNavigationRows, editorConfig.item.id, -1, true) : null;
  const nextPricedRow = editorConfig.item ? getAdjacentBillRow(billNavigationRows, editorConfig.item.id, 1, true) : null;

  const liveEditorItem = React.useMemo(
    () => (activeEditorItemIndex !== -1 ? editorItems[activeEditorItemIndex] : editorConfig.item || null),
    [activeEditorItemIndex, editorItems, editorConfig.item]
  );

  // Inserting or moving rows can renumber the highlighted row. Keep an unchanged
  // reference draft in sync so inspector autosave does not keep restoring the old
  // reference and prevent the project save from settling.
  const previousEditorReferenceRef = React.useRef<{ id: string; reference: string } | null>(null);
  React.useEffect(() => {
    const previous = previousEditorReferenceRef.current;
    previousEditorReferenceRef.current = liveEditorItem
      ? { id: liveEditorItem.id, reference: liveEditorItem.reference || '' }
      : null;
    if (!liveEditorItem || previous?.id !== liveEditorItem.id || previous.reference === (liveEditorItem.reference || '')) return;
    setEditFormData((draft) => draft.reference === previous.reference
      ? { ...draft, reference: liveEditorItem.reference || '' }
      : draft);
  }, [liveEditorItem, setEditFormData]);

  const isEditorDirty = React.useMemo(() => {
    if (editorConfig.libId || !liveEditorItem) return false;

    const source = buildDraftFromItem(liveEditorItem, liveEditorItem.type);

    const draft = {
      description: editFormData.description,
      unit: editFormData.unit,
      quantity: editFormData.quantity,
      quantityDecimals: editFormData.quantityDecimals,
      rate: editFormData.rate,
      reference: editFormData.reference,
      tradePackageId: editFormData.tradePackageId,
      dimensionRows: editFormData.dimensionRows,
      rateBuildUp: editFormData.rateBuildUp,
      type: editFormData.type,
      aiLocks: editFormData.aiLocks,
    };

    return JSON.stringify(source) !== JSON.stringify(draft);
  }, [buildDraftFromItem, editorConfig.libId, editFormData, liveEditorItem]);

  const persistActiveEditorItem = React.useCallback(() => {
    if (!currentProject || editorConfig.libId || !editorConfig.billId) return;

    const { billId, sectionId, pageId, item, type } = editorConfig;
    const newItem = applyRateBuildUp({
      ...(item || {}),
      id: item?.id || generateId(),
      type: (type || item?.type || 'PRICED'),
      ...editFormData,
      quantityDecimals: editFormData.quantityDecimals,
      unit: normalizeUnit(editFormData.unit),
      total: safeMul(editFormData.quantity, editFormData.rate),
      ...(item && editFormData.rate !== item.rate
        ? { liveRateEvidence: undefined, rateSource: item.rateSource === 'AI_LIVE' ? undefined : item.rateSource }
        : {}),
    } as BoQItem);

    if (sectionId === '' || !sectionId) {
      const updatedBills = updateBillItems(currentProject, billId, (items) => (
        item ? items.map((entry) => (entry.id === item.id ? newItem : entry)) : [...items, newItem]
      ));
      updateProject(currentProject.id, { bills: updatedBills });
      return;
    }

    if (pageId) {
      const updatedBills = updateBillSectionPageItems(currentProject, billId, sectionId, pageId, (items) => (
        item ? items.map((entry) => (entry.id === item.id ? newItem : entry)) : [...items, newItem]
      ));
      updateProject(currentProject.id, { bills: updatedBills });
      return;
    }

    const updatedBills = updateBillSectionItems(currentProject, billId, sectionId, (items) => (
      item ? items.map((entry) => (entry.id === item.id ? newItem : entry)) : [...items, newItem]
    ));
    updateProject(currentProject.id, { bills: updatedBills });
    setEditorConfig((prev) => ({ ...prev, item: newItem, type: newItem.type }));
  }, [currentProject, editorConfig, editFormData, setEditorConfig, updateProject]);

  const handleInlineQuantityUpdate = React.useCallback((itemId: string, quantity: number, sectionId: string, pageId?: string | null) => {
    if (!currentProject || !activeBill?.id) return;

    const applyQuantity = (items: BoQItem[]) => items.map((entry) => (
      entry.id === itemId
        ? { ...entry, quantity, total: safeMul(quantity, entry.rate) }
        : entry
    ));

    let updatedBills = currentProject.bills;

    if (!sectionId) {
      updatedBills = updateBillItems(currentProject, activeBill.id, applyQuantity);
    } else if (pageId) {
      updatedBills = updateBillSectionPageItems(currentProject, activeBill.id, sectionId, pageId, applyQuantity);
    } else {
      updatedBills = updateBillSectionItems(currentProject, activeBill.id, sectionId, applyQuantity);
    }

    updateProject(currentProject.id, { bills: updatedBills });
  }, [activeBill?.id, currentProject, updateProject]);

  const handleInlineDescriptionUpdate = React.useCallback((itemId: string, description: string, sectionId: string, pageId?: string | null) => {
    if (!currentProject || !activeBill?.id) return;
    const applyDescription = (items: BoQItem[]) => items.map((entry) => entry.id === itemId ? { ...entry, description } : entry);
    const updatedBills = !sectionId
      ? updateBillItems(currentProject, activeBill.id, applyDescription)
      : pageId
        ? updateBillSectionPageItems(currentProject, activeBill.id, sectionId, pageId, applyDescription)
        : updateBillSectionItems(currentProject, activeBill.id, sectionId, applyDescription);
    updateProject(currentProject.id, { bills: updatedBills });
  }, [activeBill?.id, currentProject, updateProject]);

  const handleInlineRowUpdate = React.useCallback((itemId: string, fields: Partial<BoQItem>, sectionId: string, pageId?: string | null) => {
    if (!currentProject || !activeBill?.id) return;
    const applyFields = (items: BoQItem[]) => items.map((entry) => {
      if (entry.id !== itemId) return entry;
      const next = { ...entry, ...fields };
      if (fields.rate !== undefined && fields.rate !== entry.rate) {
        next.liveRateEvidence = undefined;
        if (next.rateSource === 'AI_LIVE') next.rateSource = undefined;
      }
      return { ...next, total: safeMul(next.quantity, next.rate) };
    });
    const updatedBills = !sectionId
      ? updateBillItems(currentProject, activeBill.id, applyFields)
      : pageId
        ? updateBillSectionPageItems(currentProject, activeBill.id, sectionId, pageId, applyFields)
        : updateBillSectionItems(currentProject, activeBill.id, sectionId, applyFields);
    updateProject(currentProject.id, { bills: updatedBills });
  }, [activeBill?.id, currentProject, updateProject]);

  const handleInlineUnitUpdate = React.useCallback((itemId: string, unit: string, sectionId: string, pageId?: string | null) => {
    if (!currentProject || !activeBill?.id) return;

    const normalizedUnit = normalizeUnit(unit);
    const applyUnit = (items: BoQItem[]) => items.map((entry) => (
      entry.id === itemId
        ? { ...entry, unit: normalizedUnit }
        : entry
    ));

    let updatedBills = currentProject.bills;

    if (!sectionId) {
      updatedBills = updateBillItems(currentProject, activeBill.id, applyUnit);
    } else if (pageId) {
      updatedBills = updateBillSectionPageItems(currentProject, activeBill.id, sectionId, pageId, applyUnit);
    } else {
      updatedBills = updateBillSectionItems(currentProject, activeBill.id, sectionId, applyUnit);
    }

    updateProject(currentProject.id, { bills: updatedBills });
  }, [activeBill?.id, currentProject, updateProject]);

  const handleInlineRateUpdate = React.useCallback((itemId: string, rate: number, sectionId: string, pageId?: string | null) => {
    if (!currentProject || !activeBill?.id) return;

    const normalizedRate = Math.max(0, Number.isFinite(rate) ? rate : 0);
    const applyRate = (items: BoQItem[]) => items.map((entry) => (
      entry.id === itemId
        ? { ...entry, rate: normalizedRate, total: safeMul(entry.quantity, normalizedRate),
            ...(normalizedRate !== entry.rate ? { liveRateEvidence: undefined, rateSource: entry.rateSource === 'AI_LIVE' ? undefined : entry.rateSource } : {}) }
        : entry
    ));

    let updatedBills = currentProject.bills;

    if (!sectionId) {
      updatedBills = updateBillItems(currentProject, activeBill.id, applyRate);
    } else if (pageId) {
      updatedBills = updateBillSectionPageItems(currentProject, activeBill.id, sectionId, pageId, applyRate);
    } else {
      updatedBills = updateBillSectionItems(currentProject, activeBill.id, sectionId, applyRate);
    }

    updateProject(currentProject.id, { bills: updatedBills });
  }, [activeBill?.id, currentProject, updateProject]);

  const handleApplyLiveRates = React.useCallback((updates: BillAiRateUpdate[]) => {
    if (!currentProject || !activeBill?.id || updates.length === 0) return;
    const bills = currentProject.bills.map((bill) => bill.id === activeBill.id ? applyLiveRatesToBill(bill, updates) : bill);
    updateProject(currentProject.id, { bills });
  }, [activeBill?.id, currentProject, updateProject]);

  const handleMoveBillItem = React.useCallback((
    draggedItemId: string,
    targetItemId: string,
    placement: 'before' | 'after',
    sectionId: string,
    pageId?: string | null,
  ) => {
    if (!currentProject || !activeBill?.id || draggedItemId === targetItemId) return;

    const moveItems = (items: BoQItem[]) => {
      const sourceIndex = items.findIndex((entry) => entry.id === draggedItemId);
      const targetIndex = items.findIndex((entry) => entry.id === targetItemId);
      if (sourceIndex === -1 || targetIndex === -1) return items;

      const nextItems = [...items];
      const [movedItem] = nextItems.splice(sourceIndex, 1);
      const adjustedTargetIndex = nextItems.findIndex((entry) => entry.id === targetItemId);
      if (adjustedTargetIndex === -1) return items;
      const insertionIndex = placement === 'after' ? adjustedTargetIndex + 1 : adjustedTargetIndex;
      nextItems.splice(insertionIndex, 0, movedItem);
      return nextItems;
    };

    let updatedBills = currentProject.bills;
    if (sectionId === '' || !sectionId) {
      updatedBills = updateBillItems(currentProject, activeBill.id, moveItems);
    } else if (pageId) {
      updatedBills = updateBillSectionPageItems(currentProject, activeBill.id, sectionId, pageId, moveItems);
    } else {
      updatedBills = updateBillSectionItems(currentProject, activeBill.id, sectionId, moveItems);
    }

    updateProject(currentProject.id, { bills: updatedBills });
  }, [activeBill?.id, currentProject, updateProject]);

  const handleShiftBillItem = React.useCallback((
    itemId: string,
    direction: 'UP' | 'DOWN',
    sectionId: string,
    pageId?: string | null,
  ) => {
    if (!currentProject || !activeBill?.id) return;

    const moveItems = (items: BoQItem[]) => {
      const sourceIndex = items.findIndex((entry) => entry.id === itemId);
      if (sourceIndex === -1) return items;
      const targetIndex = direction === 'UP' ? sourceIndex - 1 : sourceIndex + 1;
      if (targetIndex < 0 || targetIndex >= items.length) return items;

      const nextItems = [...items];
      const [movedItem] = nextItems.splice(sourceIndex, 1);
      nextItems.splice(targetIndex, 0, movedItem);
      return nextItems;
    };

    let updatedBills = currentProject.bills;
    if (sectionId === '' || !sectionId) {
      updatedBills = updateBillItems(currentProject, activeBill.id, moveItems);
    } else if (pageId) {
      updatedBills = updateBillSectionPageItems(currentProject, activeBill.id, sectionId, pageId, moveItems);
    } else {
      updatedBills = updateBillSectionItems(currentProject, activeBill.id, sectionId, moveItems);
    }

    updateProject(currentProject.id, { bills: updatedBills });
  }, [activeBill?.id, currentProject, updateProject]);

  const resetEditorDraftToLiveItem = React.useCallback(() => {
    if (editorConfig.libId) return;
    setEditFormData(buildDraftFromItem(liveEditorItem || editorConfig.item || null, editorConfig.type));
  }, [buildDraftFromItem, editorConfig.item, editorConfig.libId, editorConfig.type, liveEditorItem, setEditFormData]);

  const openSiblingEditorItem = React.useCallback((direction: -1 | 1) => {
    if (!editorConfig.billId) return;
    const nextIndex = activeEditorItemIndex + direction;
    if (nextIndex < 0 || nextIndex >= editorItems.length) return;
    const nextItem = editorItems[nextIndex];
    if (!nextItem) return;

    actions.openEditor(
      editorConfig.billId,
      editorConfig.sectionId ?? '',
      nextItem,
      nextItem.type,
      undefined,
      undefined,
        undefined,
        undefined,
        editorConfig.pageId
      );
  }, [actions, activeEditorItemIndex, editorConfig.billId, editorConfig.pageId, editorConfig.sectionId, editorItems]);

  const handleNavigateEditorItem = React.useCallback(async (direction: -1 | 1, pricedOnly = false) => {
    if (!editorConfig.item || !editorConfig.billId) return;
    const target = getAdjacentBillRow(billNavigationRows, editorConfig.item.id, direction, pricedOnly);
    if (!target) return;

    if (isEditorDirty) {
      const shouldSave = await askConfirm({
        title: 'Save changes before moving?',
        message: 'This item has unsaved changes. Save them before moving to the next item?',
        confirmLabel: 'Save changes',
        cancelLabel: 'Stay here',
      });

      if (shouldSave) {
        persistActiveEditorItem();
      } else {
        const discard = await askConfirm({
          title: 'Move without saving?',
          message: 'Your edits to this item will be discarded if you move now.',
          confirmLabel: 'Move without saving',
          cancelLabel: 'Stay here',
          variant: 'danger',
        });
        if (!discard) return;
      }
    }

    setIsEditorOpen(true);
    actions.openEditor(editorConfig.billId, target.sectionId, target.item, target.item.type, undefined, undefined, undefined, undefined, target.pageId);
  }, [actions, askConfirm, billNavigationRows, editorConfig.billId, editorConfig.item, isEditorDirty, persistActiveEditorItem, setIsEditorOpen]);

  const handleNavigateInspectorItem = React.useCallback(async (direction: -1 | 1) => {
    if (activeEditorItemIndex === -1) return;

    if (isEditorDirty) {
      const shouldSave = await askConfirm({
        title: 'Save changes before moving?',
        message: 'This item has unsaved changes. Save them before moving to the next item?',
        confirmLabel: 'Save changes',
        cancelLabel: 'Stay here',
      });

      if (shouldSave) {
        persistActiveEditorItem();
      } else {
        const discard = await askConfirm({
          title: 'Move without saving?',
          message: 'Your edits to this item will be discarded if you move now.',
          confirmLabel: 'Move without saving',
          cancelLabel: 'Stay here',
          variant: 'danger',
        });
        if (!discard) return;
      }
    }

    setIsEditorOpen(false);
    openSiblingEditorItem(direction);
  }, [activeEditorItemIndex, askConfirm, isEditorDirty, openSiblingEditorItem, persistActiveEditorItem, setIsEditorOpen]);

  React.useEffect(() => {
    if (isEditorOpen || !editorConfig.billId || editorConfig.libId || !liveEditorItem) return;

    const source = JSON.stringify(buildDraftFromItem(liveEditorItem, liveEditorItem.type));
    const draft = JSON.stringify({
      description: editFormData.description,
      unit: editFormData.unit,
      quantity: editFormData.quantity,
      quantityDecimals: editFormData.quantityDecimals,
      rate: editFormData.rate,
      reference: editFormData.reference,
      tradePackageId: editFormData.tradePackageId,
      dimensionRows: editFormData.dimensionRows,
      rateBuildUp: editFormData.rateBuildUp,
      type: editFormData.type,
      aiLocks: editFormData.aiLocks,
    });

    if (source === draft) return;

    const timeoutId = window.setTimeout(() => {
      persistActiveEditorItem();
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [buildDraftFromItem, editFormData, editorConfig.billId, editorConfig.libId, editorConfig.sectionId, isEditorOpen, liveEditorItem, persistActiveEditorItem]);

  const handleCloseFullEditor = React.useCallback(async () => {
    if (isEditorDirty) {
      const discard = await askConfirm({
        title: 'Discard changes?',
        message: 'Close the detailed editor and discard the unsaved changes made there?',
        confirmLabel: 'Discard changes',
        cancelLabel: 'Keep editing',
        variant: 'danger',
      });
      if (!discard) return false;
      resetEditorDraftToLiveItem();
    }

    setIsEditorOpen(false);
    return true;
  }, [askConfirm, isEditorDirty, resetEditorDraftToLiveItem, setIsEditorOpen]);

  React.useEffect(() => {
    if (isEditorOpen || !editorConfig.billId || editorConfig.libId || activeEditorItemIndex === -1) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName;
        const isEditable =
          target.isContentEditable ||
          tagName === 'INPUT' ||
          tagName === 'TEXTAREA' ||
          tagName === 'SELECT';
        if (isEditable) return;
      }

      if (event.key === 'ArrowUp' && activeEditorItemIndex > 0) {
        event.preventDefault();
        void handleNavigateInspectorItem(-1);
      }

      if (event.key === 'ArrowDown' && activeEditorItemIndex < editorItems.length - 1) {
        event.preventDefault();
        void handleNavigateInspectorItem(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeEditorItemIndex, editorConfig.billId, editorConfig.libId, editorConfig.sectionId, editorItems.length, handleNavigateInspectorItem, isEditorOpen]);

  const commandPaletteActions = React.useMemo<CommandPaletteAction[]>(() => {
    const actionsList: CommandPaletteAction[] = [
      {
        id: 'open-future-modules',
        title: 'Open future workflow modules',
        description: 'Preview planned take-off, appointments, valuations, variations, final account, and audit trail modules.',
        keywords: ['modules', 'takeoff', 'take-off', 'valuation', 'variation', 'final account', 'audit'],
        onSelect: () => setIsFutureModulesOpen(true),
      },
      {
        id: 'open-library',
        title: 'Open standards library',
        description: 'Browse reusable standards and insert them into the live bill.',
        keywords: ['library', 'standards', 'insert item'],
        onSelect: () => setIsLibraryWindowOpen(true),
      },
      {
        id: 'open-trades',
        title: 'Open Trade & Contractor Library',
        description: 'Manage trade packages and contractor lists.',
        keywords: ['trades', 'contractors', 'trade library', 'contractor library'],
        onSelect: () => setIsTradesWindowOpen(true),
      },
      {
        id: 'create-restore-point',
        title: 'Create restore point',
        description: 'Save the current project as a manual rollback point before major changes.',
        keywords: ['snapshot', 'restore point', 'backup'],
        onSelect: handleCreateSnapshot,
      },
      {
        id: 'create-boq-revision-point',
        title: 'Record BoQ revision point',
        description: 'Capture the current bill of quantities state so later bill changes can be compared or reverted.',
        keywords: ['boq revision', 'change point', 'variation point', 'bill history', 'revert bill'],
        onSelect: () => setIsBoqRevisionPointOpen(true),
      },
      {
        id: 'open-cost-plan',
        title: 'Open cost plan',
        description: 'Compile or export a project-level cost plan with contingency handling.',
        keywords: ['cost plan', 'cost planning', 'contingency'],
        onSelect: () => setIsCostPlanOpen(true),
      },
      {
        id: 'open-assemblies',
        title: 'Open section assemblies',
        description: 'Apply or manage reusable section templates saved from live bills.',
        keywords: ['assemblies', 'templates', 'section template'],
        onSelect: () => setIsAssembliesOpen(true),
      },
    ];

    if (activeBill) {
      actionsList.unshift({
        id: 'new-section',
        title: 'Add section',
        description: `Create a new section in ${activeBill.name}.`,
        keywords: ['section', 'bill structure', 'new section'],
        onSelect: () => actions.openPrompt('ADD_SECTION'),
      });
    } else {
      actionsList.unshift({
        id: 'new-bill',
        title: 'Create first bill',
        description: 'Add the first live bill to this project before building sections or items.',
        keywords: ['bill', 'new bill', 'first bill'],
        onSelect: () => actions.openPrompt('ADD_BILL'),
      });
    }

    if (activeBill) {
      const targetSection = activeBill.sections.length > 0 ? activeBill.sections[activeBill.sections.length - 1] : null;
      const targetPage = targetSection?.pages && targetSection.pages.length > 0
        ? targetSection.pages[targetSection.pages.length - 1]
        : null;

      actionsList.push(
        {
          id: 'add-priced-item',
          title: 'Add priced item',
          description: `Open the editor and add a new priced item in ${activeBill.name}.`,
          keywords: ['item', 'priced item', 'new line'],
          onSelect: () => actions.openEditor(activeBill.id, targetSection?.id ?? '', undefined, 'PRICED', undefined, undefined, undefined, undefined, targetPage?.id),
        },
        {
          id: 'open-tender-analysis',
          title: 'Open tender analysis',
          description: 'Review invites, returns, and apply tender rates back into the active bill.',
          keywords: ['tender', 'analysis', 'returns', 'winner'],
          onSelect: () => setIsTenderViewOpen(true),
        },
      );
    }

    if (activeBill && currentProject) {
      actionsList.push(
        {
          id: 'export-bill-pdf',
          title: 'Export bill PDF',
          description: `Generate a presentation-ready PDF for ${activeBill.name}.`,
          keywords: ['pdf', 'export', 'bill pdf'],
          onSelect: async () => {
            setIsExporting(true);
            try {
              await actions.handleExportPdf();
            } finally {
              setIsExporting(false);
            }
          },
        },
        {
          id: 'export-bill-workbook',
          title: 'Export current bill workbook',
          description: `Export ${activeBill.name} to Excel as a focused working workbook.`,
          keywords: ['excel', 'workbook', 'current bill'],
          onSelect: async () => {
            setIsExporting(true);
            try {
              const { exportBillToExcel } = await loadExcelExports();
              await exportBillToExcel(currentProject, activeBill, trades);
              showToast({ type: 'success', message: feedbackSuccess(`Bill "${activeBill.name}" Excel export`), duration: 3000 });
            } catch (e) {
              showToast({ type: 'error', message: feedbackError(`Bill "${activeBill.name}" Excel export`, e, 'Please try the export again.') });
            } finally {
              setIsExporting(false);
            }
          },
        },
      );
    }

    return ESTIMATE_ONLY
      ? actionsList.filter((action) => !['open-future-modules', 'open-library', 'open-trades', 'open-cost-plan', 'open-tender-analysis'].includes(action.id))
      : actionsList;
  }, [
    activeBill,
    actions,
    currentProject,
    handleCreateBoqRevisionPoint,
    handleCreateSnapshot,
    setIsLibraryWindowOpen,
    setIsTenderViewOpen,
    setIsTradesWindowOpen,
    setIsExporting,
    showToast,
    trades,
  ]);

  const closeModuleSurfaces = React.useCallback(async () => {
    if (isEditorOpen) {
      const canCloseEditor = await handleCloseFullEditor();
      if (!canCloseEditor) return false;
    }

    setIsLibraryWindowOpen(false);
    setIsTradesWindowOpen(false);
    setIsTenderViewOpen(false);
    setIsAnalyticsOpen(false);
    setIsCostReportsHubOpen(false);
    setIsCostPlanOpen(false);
    setIsProjectSummaryOpen(false);
    setIsLandFinderOpen(false);
    setIsAppraisalsOpen(false);
    setIsEstimateRegisterOpen(false);
    setIsFutureModulesOpen(false);
    setIsAuditTrailOpen(false);
    setIsSettingsOpen(false);
    setIsProjectExcelExportOpen(false);
    setIsStandardsInsertOpen(false);
    setIsImportLinesOpen(false);
    setIsAssembliesOpen(false);
    setIsAskAiOpen(false);
    setIsBillSettingsOpen(false);
    setIsPromptOpen(false);
    setIsPaletteOpen(false);
    setIsVersionHistoryOpen(false);
    setIsShortcutsOpen(false);
    setIsDiagnosticsOpen(false);
    setCopySource(null);
    setNavigatorContextMenu(null);
    closeHelp();
    return true;
  }, [
    closeHelp,
    handleCloseFullEditor,
    isEditorOpen,
    setIsAnalyticsOpen,
    setIsCostPlanOpen,
    setIsCostReportsHubOpen,
    setIsLibraryWindowOpen,
    setIsPaletteOpen,
    setIsPromptOpen,
    setIsSettingsOpen,
    setIsShortcutsOpen,
    setIsTenderViewOpen,
    setIsTradesWindowOpen,
    setIsVersionHistoryOpen,
  ]);

  const renderWorkspaceModulesInline = true;
  const isBillWorkspaceSurfaceActive = !(
    isLibraryWindowOpen
    || isTenderViewOpen
    || isCostReportsHubOpen
    || isAuditTrailOpen
    || isAnalyticsOpen
    || isCostPlanOpen
    || isProjectSummaryOpen
    || isLandFinderOpen
    || isAppraisalsOpen
    || isEstimateRegisterOpen
    || isFutureModulesOpen
    || isSettingsOpen
  );

  React.useEffect(() => {
    if (!activeBill || !isBillWorkspaceSurfaceActive || isEditorOpen || isPromptOpen || isPaletteOpen || isShortcutsOpen) return;

    const toggleStandardsWithCtrlL = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.isComposing || !event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.key.toLowerCase() !== 'l') return;
      if (document.querySelector('[role="dialog"], [role="menu"], [aria-modal="true"]')) return;
      event.preventDefault();
      setIsStandardsInsertOpen((open) => !open);
    };

    window.addEventListener('keydown', toggleStandardsWithCtrlL);
    return () => window.removeEventListener('keydown', toggleStandardsWithCtrlL);
  }, [activeBill, isBillWorkspaceSurfaceActive, isEditorOpen, isPromptOpen, isPaletteOpen, isShortcutsOpen, isStandardsInsertOpen]);

  React.useEffect(() => {
    if (!activeBill || !isBillWorkspaceSurfaceActive || isEditorOpen || isPromptOpen || isPaletteOpen || isShortcutsOpen) return;
    const addPageWithAltP = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.isComposing || !event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.key.toLowerCase() !== 'p') return;
      if (document.querySelector('[role="dialog"], [role="menu"], [aria-modal="true"]')) return;
      const section = activeSectionForNavigation || activeBill.sections[0];
      if (!section) return;
      event.preventDefault();
      actions.openPrompt('ADD_PAGE', { billId: activeBill.id, sectionId: section.id, afterPageId: activePageForNavigation?.id });
    };
    window.addEventListener('keydown', addPageWithAltP);
    return () => window.removeEventListener('keydown', addPageWithAltP);
  }, [activeBill, activeSectionForNavigation, activePageForNavigation, isBillWorkspaceSurfaceActive, isEditorOpen, isPromptOpen, isPaletteOpen, isShortcutsOpen, actions.openPrompt]);

  return (
    <div
      className="flex flex-col h-screen bg-surface-50 dark:bg-surface-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans"
      onDragOver={actions.handleWindowDragOver}
      onDrop={actions.handleWindowDrop}
    >
      <TitleBar />
      <div className="flex flex-1 min-h-0">
        <Rail
          onGoHome={async () => {
            const canNavigate = await closeModuleSurfaces();
            if (!canNavigate) return;
            setCurrentProjectId(null);
            setActiveBillId(null);
          }}
          onOpenLibrary={async () => {
            const canNavigate = await closeModuleSurfaces();
            if (!canNavigate) return;
            setIsLibraryWindowOpen(true);
          }}
          onOpenLandFinder={async () => {
            const canNavigate = await closeModuleSurfaces();
            if (!canNavigate) return;
            setIsLandFinderOpen(true);
          }}
          onOpenAppraisals={async () => {
            const canNavigate = await closeModuleSurfaces();
            if (!canNavigate) return;
            setAppraisalsInitialWorkspace('REGISTER');
            setAppraisalsResetKey((value) => value + 1);
            setIsAppraisalsOpen(true);
          }}
          onOpenEstimating={async () => {
            const canNavigate = await closeModuleSurfaces();
            if (!canNavigate) return;
            setEstimateRegisterResetKey((value) => value + 1);
            setIsEstimateRegisterOpen(true);
          }}
          onOpenTender={async () => {
            const canNavigate = await closeModuleSurfaces();
            if (!canNavigate) return;
            setIsTenderViewOpen(true);
          }}
          onOpenContracts={async () => {
            const canNavigate = await closeModuleSurfaces();
            if (!canNavigate) return;
            setIsFutureModulesOpen(true);
          }}
          onOpenValuations={async () => {
            const canNavigate = await closeModuleSurfaces();
            if (!canNavigate) return;
            setIsFutureModulesOpen(true);
          }}
          onOpenFinalAccounts={async () => {
            const canNavigate = await closeModuleSurfaces();
            if (!canNavigate) return;
            setIsFutureModulesOpen(true);
          }}
          onOpenReports={async () => {
            const canNavigate = await closeModuleSurfaces();
            if (!canNavigate) return;
            setIsCostReportsHubOpen(true);
          }}
          onOpenAudits={async () => {
            const canNavigate = await closeModuleSurfaces();
            if (!canNavigate) return;
            setIsAuditTrailOpen(true);
          }}
          onOpenSettings={async () => {
            const canNavigate = await closeModuleSurfaces();
            if (!canNavigate) return;
            setIsSettingsOpen(true);
          }}
          currentProject={currentProject}
          activeLocation={
            isLibraryWindowOpen ? 'LIBRARY'
              : isTradesWindowOpen ? 'LIBRARY'
                : isAppraisalsOpen ? 'APPRAISALS'
                  : isLandFinderOpen ? 'LAND_FINDER'
                  : isEstimateRegisterOpen ? 'ESTIMATING'
                    : isTenderViewOpen ? 'TENDER'
                      : isCostReportsHubOpen || isAnalyticsOpen || isCostPlanOpen || isProjectSummaryOpen ? 'REPORTS'
                        : isAuditTrailOpen ? 'AUDITS'
                        : isFutureModulesOpen ? 'ROADMAP'
                          : isSettingsOpen ? 'SETTINGS'
                            : 'ESTIMATING'
          }
        />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar
            activeItemId={activeItemId}
            isHome={false}
            projects={projects}
            currentProject={currentProject}
            activeBill={activeBill}
            activeBillId={activeBillId}
            selectedItemIds={selectedItemIds}
            activeBillSections={(activeBill?.sections || []).map((section) => ({ id: section.id, name: section.name }))}
            activeBillPages={activeSectionPages}
            selectedSectionId={activeSectionForNavigation?.id || null}
            workspaceLocationLabel={workspaceLocationLabel}
            activeBillTradeTargets={
              activeBill
                ? [
                    { id: activeBill.id, label: activeBill.name, kind: 'BILL' as const },
                    ...(activeBill.sections || []).map((section, index) => ({
                      id: section.id,
                      label: `Section ${index + 1}: ${section.name}`,
                      kind: 'SECTION' as const,
                      sectionId: section.id,
                    })),
                    ...(activeBill.sections || []).flatMap((section, sectionIndex) =>
                      (section.pages || []).map((page, pageIndex) => ({
                        id: page.id,
                        label: `Section ${sectionIndex + 1} / Page ${pageIndex + 1}: ${page.name || `Page ${pageIndex + 1}`}`,
                        kind: 'PAGE' as const,
                        sectionId: section.id,
                        pageId: page.id,
                      }))
                    ),
                  ]
                : []
            }
            availableTrades={trades.map((trade) => ({ id: trade.id, name: trade.name }))}
            setActiveBillId={setActiveBillId}
            onReorderBills={handleReorderBills}
            onJumpToSection={(sectionId: string) => {
              setActiveSectionSidebarId(sectionId);
              setActivePageSidebarId(null);
              setBillSectionJumpTarget(sectionId);
            }}
            onJumpToPage={(pageId: string) => {
              setActivePageSidebarId(pageId);
              setBillPageJumpTarget(pageId);
            }}
            onBackToProjects={() => {
              setCurrentProjectId(null);
              setActiveBillId(null);
            }}
            onSelectProject={(id: string) => {
              const proj = projects.find((p) => p.id === id);
              setCurrentProjectId(id);
              setActiveBillId(getPreferredBillId(proj));
            }}
          onExportPdf={async () => {
            setIsExporting(true);
            await actions.handleExportPdf();
            setIsExporting(false);
            }}
            isExporting={isExporting}
            onOpenVersionHistory={() => setIsVersionHistoryOpen(true)}
            onOpenPrompt={actions.openPrompt}
            onOpenEditor={(billId, sectionId, item?, type?, pageId?, insertAfterItemId?) =>
              actions.openEditor(billId, sectionId, item, type, undefined, undefined, undefined, undefined, pageId, insertAfterItemId)
            }
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenAnalytics={() => setIsAnalyticsOpen(true)}
            onOpenCostPlan={() => setIsCostPlanOpen(true)}
            onOpenAssemblies={() => setIsAssembliesOpen(true)}
            onOpenFutureModules={() => setIsFutureModulesOpen(true)}
            onOpenBillSettings={() => setIsBillSettingsOpen(true)}
            onCopyBill={() => {
              if (!activeBill) return;
              openCopyModal({
                kind: 'BILL',
                billId: activeBill.id,
                label: activeBill.name,
              });
            }}
            onOpenImportLines={() => setIsImportLinesOpen(true)}
            onClearBillValues={actions.handleClearBillValues}
            onOpenProjectSummary={() => setIsProjectSummaryOpen(true)}
            onOpenAskAi={() => setIsAskAiOpen(true)}
            onOpenStandardsInsert={() => setIsStandardsInsertOpen(true)}
            onOpenTenderView={() => setIsTenderViewOpen(true)}
            onApplyTradeScope={(target, tradeId) => {
              if (!activeBill) return;
              if (target.kind === 'BILL') {
                void actions.handleBillTradeAssign(activeBill.id, tradeId);
                return;
              }
              if (target.kind === 'SECTION' && target.sectionId) {
                void actions.handleSectionTradeAssign(activeBill.id, target.sectionId, tradeId);
                return;
              }
              if (target.kind === 'PAGE' && target.sectionId && target.pageId) {
                void actions.handlePageTradeAssign(activeBill.id, target.sectionId, target.pageId, tradeId);
              }
            }}
            onDownloadProject={() =>
              currentProject && actions.downloadJson(currentProject, `project-${currentProject.name.replace(/\s+/g, '-').toLowerCase()}.json`)
            }
            onExportExcel={async () => {
              setIsProjectExcelExportOpen(true);
            }}
            onExportExcelCurrentBill={
              activeBill
                ? async () => {
                    if (!currentProject || !activeBill) return;
                    setIsExporting(true);
                    try {
                      const { exportBillToExcel } = await loadExcelExports();
                      await exportBillToExcel(currentProject, activeBill, trades);
                      showToast({ type: 'success', message: feedbackSuccess(`Bill "${activeBill.name}" Excel export`), duration: 3000 });
                    } catch (e) {
                      showToast({ type: 'error', message: feedbackError(`Bill "${activeBill.name}" Excel export`, e, 'Please try the export again.') });
                    } finally {
                      setIsExporting(false);
                    }
                  }
                : undefined
            }
            selectedTradeFilter={selectedTradeFilter}
            isAiLoading={isAiLoading}
            saveStatus={saveStatus}
            lastSavedAt={lastSavedAt}
            lastManualSaveAt={lastManualSaveAt}
            onSaveNow={saveNow}
            persistenceBackend={persistenceBackend}
            systemNotices={appNotices}
            workspaceZoom={billWorkspaceZoom}
            onZoomOutWorkspace={() => handleAdjustBillWorkspaceZoom(-1)}
            onZoomResetWorkspace={() => setBillWorkspaceZoom(100)}
            onZoomInWorkspace={() => handleAdjustBillWorkspaceZoom(1)}
            isWorkspaceFocused={isBillWorkspaceFocused}
            onToggleWorkspaceFocus={() => setIsBillWorkspaceFocused((current) => !current)}
            activeWorkspacePresetId={activeWorkspacePresetId}
            onApplyWorkspacePreset={handleApplyWorkspacePreset}
            onOpenHelp={() => openHelp('BILL_WORKSPACE')}
            onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
          />
          <HelpPanel
            isOpen={isHelpOpen}
            article={getHelpArticle(helpContextId)}
            onClose={closeHelp}
            onStartWalkthrough={(stepId) => startWalkthrough(helpContextId, stepId)}
          />
          <div className="flex flex-1 min-h-0">
            <main className="relative flex-1 flex flex-col overflow-hidden bg-surface-50 dark:bg-surface-950 min-w-0">
              {renderWorkspaceModulesInline && (isLibraryWindowOpen || isTenderViewOpen || isCostReportsHubOpen || isAuditTrailOpen || isSettingsOpen || isLandFinderOpen || isAppraisalsOpen || isEstimateRegisterOpen) && (
                <div className="absolute inset-0 z-40 min-h-0 bg-surface-50 p-4 dark:bg-surface-950">
                  <React.Suspense fallback={lazyModalFallback}>
                  {isEstimateRegisterOpen && (
                    <ProjectList
                      projects={projects}
                      onSelectProject={(id: string) => {
                        const project = projects.find((entry) => entry.id === id);
                        setCurrentProjectId(id);
                        setActiveBillId(getPreferredBillId(project));
                        setIsEstimateRegisterOpen(false);
                      }}
                      onImportProject={(data: Project | Project[]) => {
                        const incoming = Array.isArray(data) ? data : [data];
                        const existingIds = new Set(projects.map((project) => project.id));
                        const freshProjects = assignEstimateReferences(
                          incoming.filter((project) => !existingIds.has(project.id)),
                          projects
                        );
                        const skipped = incoming.length - freshProjects.length;
                        if (freshProjects.length > 0) {
                          setProjects((prev) => [...prev, ...freshProjects]);
                        }
                        return { added: freshProjects.length, skipped };
                      }}
                      onUpdateProject={(id, updates) => updateProject(id, updates)}
                      workspaceFolders={workspaceFolders}
                      setWorkspaceFolders={setWorkspaceFolders}
                      onDeleteProject={(id: string) => setProjects((prev) => prev.filter((project) => project.id !== id))}
                      onDownloadProject={(project: Project) => actions.downloadJson(project, `project-${project.name.replace(/\s+/g, '-').toLowerCase()}.json`)}
                      onNewProject={() => actions.openPrompt('CREATE_PROJECT')}
                      onOpenLibrary={() => {
                        setIsEstimateRegisterOpen(false);
                        setIsLibraryWindowOpen(true);
                      }}
                      onOpenTrades={() => setIsTradesWindowOpen(true)}
                      onOpenShortcuts={() => setIsShortcutsOpen(true)}
                      onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
                      onOpenAuditTrail={() => setIsAuditTrailOpen(true)}
                      onOpenWorkflowModule={(moduleId, projectId) => {
                        if (ESTIMATE_ONLY && moduleId !== 'ESTIMATING') return;
                        const project = projectId ? projects.find((entry) => entry.id === projectId) : null;
                        if (project) {
                          setCurrentProjectId(project.id);
                          setActiveBillId(getPreferredBillId(project));
                        }
                        setIsEstimateRegisterOpen(false);
                        if (moduleId === 'TENDER_ANALYSIS') setIsTenderViewOpen(true);
                        if (moduleId === 'COST_REPORTS') setIsCostReportsHubOpen(true);
                      }}
                      embedInShell
                      requestedModuleHub="ESTIMATING"
                      resetSignal={estimateRegisterResetKey}
                      onCloseEstimateRegister={() => setIsEstimateRegisterOpen(false)}
                    />
                  )}
                  {isSettingsOpen && (
                    <AppSettingsWorkspace
                      onClose={() => setIsSettingsOpen(false)}
                      onOpenShortcuts={() => setIsShortcutsOpen(true)}
                      onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
                      onOpenBillSettings={
                        activeBill ? () => setIsBillSettingsOpen(true) : undefined
                      }
                    />
                  )}
                  {isAppraisalsOpen && (
                    <AppraisalsWorkspace
                      key={`appraisals-${appraisalsResetKey}`}
                      initialWorkspace={appraisalsInitialWorkspace}
                      onClose={() => setIsAppraisalsOpen(false)}
                    />
                  )}
                  {isLandFinderOpen && (
                    <LandFinderWorkspace
                      onClose={() => setIsLandFinderOpen(false)}
                      onOpenAppraisals={() => {
                        setIsLandFinderOpen(false);
                        setAppraisalsInitialWorkspace('REGISTER');
                        setAppraisalsResetKey((value) => value + 1);
                        setIsAppraisalsOpen(true);
                      }}
                    />
                  )}
                  {isLibraryWindowOpen && (
                    <LibraryWindow
                      embedded
                      libraries={libraries}
                      setLibraries={setLibraries}
                      openPrompt={actions.openPrompt}
                      openEditor={actions.openEditor}
                      isAiLoading={isAiLoading}
                      onImport={() => actions.handleImport(setLibraries, 'Libraries')}
                      onExport={(data: unknown, filename: string) => actions.downloadJson(data, filename)}
                      onUseInProject={actions.onUseInProject}
                      onClose={() => setIsLibraryWindowOpen(false)}
                    />
                  )}
                  {isTenderViewOpen && currentProject && (
                    <TenderComparisonView
                      embedded
                      project={currentProject}
                      trades={trades}
                      onClose={() => setIsTenderViewOpen(false)}
                      onUpdateRates={(updates) => {
                        if (!activeBillId) return;
                        const snapshotPatch = shouldAutoSnapshot(currentProject)
                          ? {
                              snapshots: prependSnapshot(
                                currentProject.snapshots,
                                createSnapshotEntry(
                                  currentProject,
                                  `Before tender apply-back ${new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`,
                                  'Automatic restore point created before tender rates were applied back into the active bill.'
                                )
                              ),
                            }
                          : {};
                        updateProject(currentProject.id, {
                          ...snapshotPatch,
                          bills: currentProject.bills.map((b) =>
                            b.id !== activeBillId
                              ? b
                              : {
                                  ...b,
                                  sections: b.sections.map((s) => ({
                                    ...s,
                                    items: s.items.map((i) => {
                                      const up = updates.find((u) => u.id === i.id);
                                      if (up) return { ...i, rate: up.rate, rateSource: up.rateSource, total: safeMul(i.quantity, up.rate) };
                                      return i;
                                    }),
                                    pages: (s.pages || []).map((page) => ({
                                      ...page,
                                      items: (page.items || []).map((i) => {
                                        const up = updates.find((u) => u.id === i.id);
                                        if (up) return { ...i, rate: up.rate, rateSource: up.rateSource, total: safeMul(i.quantity, up.rate) };
                                        return i;
                                      }),
                                    })),
                                  })),
                                }
                          ),
                        });
                      }}
                      onUpdateTenderData={(newData, newAttrs) => updateProject(currentProject.id, { tenderData: newData, tenderAttributes: newAttrs })}
                      onSetWinner={(tradeId, winnerId, awardDetails) => {
                        const trade = trades.find((entry) => entry.id === tradeId);
                        const existingAward = currentProject.tenderAwards?.[tradeId];
                        const contractorName =
                          awardDetails?.contractorName ||
                          trade?.contractors.find((contractor) => contractor.id === winnerId)?.name ||
                          existingAward?.contractorName ||
                          'Selected contractor';
                        const selectedAt = awardDetails?.selectedAt || new Date().toISOString();
                        const sourceTenderPackageName = awardDetails?.sourceTenderPackageName || trade?.name || existingAward?.sourceTenderPackageName || 'Tender package';
                        const nextAward: TenderAwardRecord = {
                          tradeId,
                          contractorId: winnerId,
                          contractorName,
                          selectedAt,
                          sourceTenderPackageId: tradeId,
                          sourceTenderPackageName,
                          approvalStatus: existingAward?.approvalStatus === 'APPROVED' || existingAward?.approvalStatus === 'SIGNED_APPROVAL_UPLOADED' || existingAward?.approvalStatus === 'APPROVAL_FORM_CREATED' || existingAward?.approvalStatus === 'REJECTED'
                            ? existingAward.approvalStatus
                            : 'WINNER_SELECTED',
                          preparedBy: existingAward?.preparedBy,
                          checkedBy: existingAward?.checkedBy,
                          approvedBy: existingAward?.approvedBy,
                          approvedAt: existingAward?.approvedAt,
                          rejectedBy: existingAward?.rejectedBy,
                          rejectedAt: existingAward?.rejectedAt,
                          rejectionReason: existingAward?.rejectionReason,
                          approvalFormCreatedAt: existingAward?.approvalFormCreatedAt,
                          approvalWorkbookFileName: existingAward?.approvalWorkbookFileName,
                          signedApproval: existingAward?.signedApproval,
                          billApplyHistory: existingAward?.billApplyHistory || [],
                        };

                        const derivedResponseState: TenderResponseState = winnerId ? 'WINNER_SELECTED' : 'RETURNS_RECEIVED';
                        updateProject(currentProject.id, {
                          tenderAwards: {
                            ...(currentProject.tenderAwards || {}),
                            [tradeId]: nextAward,
                          },
                          tenderTradeStatus: {
                            ...(currentProject.tenderTradeStatus || {}),
                            [tradeId]: {
                              ...(currentProject.tenderTradeStatus?.[tradeId] || {}),
                              responseState: derivedResponseState,
                            },
                          },
                        });
                        recordOperationLogEntry({
                          kind: 'tender',
                          status: 'success',
                          subject: 'Tender award',
                          message: `Selected ${contractorName} as winner for ${sourceTenderPackageName}.`,
                          projectId: currentProject.id,
                          projectName: currentProject.name,
                          billId: activeBill?.id,
                          billName: activeBill?.name,
                        });
                      }}
                      onUpdateTenderAward={(tradeId, updates) => {
                        const existingAward = currentProject.tenderAwards?.[tradeId];
                        if (!existingAward) return;
                        updateProject(currentProject.id, {
                          tenderAwards: {
                            ...(currentProject.tenderAwards || {}),
                            [tradeId]: {
                              ...existingAward,
                              ...updates,
                            },
                          },
                        });
                      }}
                      onRecordTenderBillApply={(tradeId, summary: TenderApplySummary) => {
                        const existingAward = currentProject.tenderAwards?.[tradeId];
                        if (!existingAward) return;
                        updateProject(currentProject.id, {
                          tenderAwards: {
                            ...(currentProject.tenderAwards || {}),
                            [tradeId]: {
                              ...existingAward,
                              billApplyHistory: [summary, ...(existingAward.billApplyHistory || [])],
                            },
                          },
                        });
                        recordOperationLogEntry({
                          kind: 'tender',
                          status: 'success',
                          subject: 'Tender apply-back',
                          message: `Applied tender return for ${existingAward.sourceTenderPackageName || tradeId} back to the bill.`,
                          projectId: currentProject.id,
                          projectName: currentProject.name,
                          billId: activeBill?.id,
                          billName: activeBill?.name,
                          counts: {
                            items: summary.itemsUpdated,
                            pricedItems: summary.itemsUpdated,
                            skipped: summary.itemsSkipped + summary.itemsWithNoContractorRate,
                          },
                        });
                      }}
                      onUpdateTenderContractors={(tradeId, contractorIds) =>
                        updateProject(currentProject.id, {
                          tenderContractors: { ...(currentProject.tenderContractors || {}), [tradeId]: contractorIds },
                        })
                      }
                      onUpdateTenderTradeStatus={(tradeId, statusUpdates) =>
                        updateProject(currentProject.id, {
                          tenderTradeStatus: {
                            ...(currentProject.tenderTradeStatus || {}),
                            [tradeId]: {
                              ...(currentProject.tenderTradeStatus?.[tradeId] || {}),
                              ...statusUpdates,
                            },
                          },
                        })
                      }
                    />
                  )}
                  {isCostReportsHubOpen && currentProject && (
                    <CostReportsHubModal
                      embedded
                      isOpen={isCostReportsHubOpen}
                      project={currentProject}
                      trades={trades}
                      onClose={() => setIsCostReportsHubOpen(false)}
                      onOpenAnalytics={() => setIsAnalyticsOpen(true)}
                      onOpenProjectSummary={() => setIsProjectSummaryOpen(true)}
                      onOpenCostPlan={() => setIsCostPlanOpen(true)}
                      onOpenProjectExcelExport={() => setIsProjectExcelExportOpen(true)}
                      onOpenTenderAnalysis={() => setIsTenderViewOpen(true)}
                      onOpenAuditTrail={() => setIsAuditTrailOpen(true)}
                      onOpenVersionHistory={() => setIsVersionHistoryOpen(true)}
                      onOpenBill={(billId) => {
                        if (billId) setActiveBillId(billId);
                      }}
                    />
                  )}
                  {isAuditTrailOpen && (
                    <AuditTrailModal
                      embedded
                      isOpen={isAuditTrailOpen}
                      onClose={() => setIsAuditTrailOpen(false)}
                      initialProjectId={currentProject.id}
                      project={currentProject}
                      onOpenBill={(billId) => {
                        if (billId) setActiveBillId(billId);
                      }}
                      onOpenTenderAnalysis={() => setIsTenderViewOpen(true)}
                      onOpenReports={() => setIsCostReportsHubOpen(true)}
                      onOpenLibrary={() => setIsLibraryWindowOpen(true)}
                      onOpenVersionHistory={() => setIsVersionHistoryOpen(true)}
                    />
                  )}
                  </React.Suspense>
                </div>
              )}
              <div className="flex flex-1 min-h-0 items-stretch overflow-hidden">
                {activeBill && activeBill.sections.length > 1 && (
                  isBillNavigatorCollapsed ? (
                    <aside className="hidden lg:flex w-12 shrink-0 flex-col items-center gap-3 border-r border-slate-200/80 bg-surface/86 py-4 dark:border-slate-700/80 dark:bg-[rgb(14_22_27_/_0.94)]">
                      <button
                        type="button"
                        onClick={() => setIsBillNavigatorCollapsed(false)}
                        className="workspace-icon-btn"
                        aria-label="Expand bill navigator"
                        title="Expand bill navigator"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <div className="mt-2 rotate-180 [writing-mode:vertical-rl] text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Sections
                      </div>
                    </aside>
                  ) : (
                    <aside className="hidden lg:block w-[260px] shrink-0 border-r border-slate-200/80 bg-surface/86 p-4 dark:border-slate-700/80 dark:bg-[rgb(14_22_27_/_0.94)]">
                      <div className="sticky top-0 rounded-app-lg border border-slate-200/80 bg-white/92 p-4 shadow-card dark:border-slate-700/80 dark:bg-[rgb(16_24_30_/_0.98)]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                              Sections
                            </div>
                            <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                              Navigate this bill
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsBillNavigatorCollapsed(true)}
                            className="workspace-icon-btn"
                            aria-label="Collapse bill navigator"
                            title="Collapse bill navigator"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          Jump between sections without losing space in the main schedule.
                        </p>
                        <div className="mt-4 max-h-[calc(100vh-240px)] space-y-2 overflow-y-auto pr-1">
                          {activeBill.sections.map((section, sectionIndex) => {
                            const sectionItems = section.pages?.length
                              ? section.pages.flatMap((page) => page.items || [])
                              : section.items || [];
                            const sectionTotal = sectionItems.reduce((sum, item) => sum + (item.total || 0), 0);
                            const isActive = activeSectionSidebarId === section.id;

                            const isDragging = draggedSectionId === section.id;
                            const isDropTarget = Boolean(sectionDropTargetId === section.id && draggedSectionId !== section.id);

                            return (
                              <div
                                key={section.id}
                                data-section-nav-id={section.id}
                                title="Drag to reorder section"
                              >
                                <button
                                  type="button"
                                  onPointerDown={(event) => {
                                    if (event.button !== 0) return;
                                    sectionPointerDragRef.current = {
                                      sectionId: section.id,
                                      startX: event.clientX,
                                      startY: event.clientY,
                                      pointerId: event.pointerId,
                                      isDragging: false,
                                    };
                                    event.currentTarget.setPointerCapture(event.pointerId);
                                  }}
                                  onPointerMove={(event) => {
                                    const dragState = sectionPointerDragRef.current;
                                    if (!dragState || dragState.pointerId !== event.pointerId) return;
                                    const distance = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY);
                                    if (!dragState.isDragging) {
                                      if (distance < 6) return;
                                      dragState.isDragging = true;
                                      suppressSectionClickRef.current = true;
                                      setDraggedSectionId(dragState.sectionId);
                                    }
                                    event.preventDefault();
                                    const targetElement = document
                                      .elementFromPoint(event.clientX, event.clientY)
                                      ?.closest<HTMLElement>('[data-section-nav-id]');
                                    const targetSectionId = targetElement?.dataset.sectionNavId;
                                    setSectionDropTargetId(
                                      targetSectionId && targetSectionId !== dragState.sectionId
                                        ? targetSectionId
                                        : null,
                                    );
                                  }}
                                  onPointerUp={(event) => {
                                    const dragState = sectionPointerDragRef.current;
                                    if (dragState?.pointerId === event.pointerId) {
                                      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                        event.currentTarget.releasePointerCapture(event.pointerId);
                                      }
                                      const targetElement = document
                                        .elementFromPoint(event.clientX, event.clientY)
                                        ?.closest<HTMLElement>('[data-section-nav-id]');
                                      const targetSectionId = targetElement?.dataset.sectionNavId || sectionDropTargetId;
                                      if (dragState.isDragging && targetSectionId && targetSectionId !== dragState.sectionId) {
                                        handleReorderSections(dragState.sectionId, targetSectionId);
                                      }
                                      sectionPointerDragRef.current = null;
                                    }
                                    setDraggedSectionId(null);
                                    setSectionDropTargetId(null);
                                  }}
                                  onPointerCancel={(event) => {
                                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                      event.currentTarget.releasePointerCapture(event.pointerId);
                                    }
                                    sectionPointerDragRef.current = null;
                                    setDraggedSectionId(null);
                                    setSectionDropTargetId(null);
                                  }}
                                  onClick={() => {
                                    if (suppressSectionClickRef.current) {
                                      suppressSectionClickRef.current = false;
                                      return;
                                    }
                                    setActiveSectionSidebarId(section.id);
                                    setBillSectionJumpTarget(section.id);
                                  }}
                                  onContextMenu={(event) => openNavigatorSectionContextMenu(event, section, sectionIndex)}
                                  className={`w-full cursor-grab select-none rounded-app border px-3 py-3 text-left transition active:cursor-grabbing ${
                                    isActive
                                      ? 'border-emerald-700 bg-emerald-800 text-white shadow-app dark:border-emerald-600 dark:bg-emerald-900 dark:text-emerald-50'
                                      : 'border-slate-200 bg-surface text-slate-700 hover:border-slate-300 hover:bg-surface-muted dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-surface-800'
                                  } ${isDragging ? 'opacity-55' : ''} ${isDropTarget ? 'border-primary-400 ring-2 ring-primary-300 dark:border-primary-400 dark:ring-primary-700' : ''}`}
                                  aria-pressed={isActive}
                                  aria-grabbed={isDragging}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${isActive ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500'}`}>
                                        Section {sectionIndex + 1}
                                      </div>
                                      <div className="mt-1 truncate text-sm font-semibold">
                                        {section.name}
                                      </div>
                                    </div>
                                    <div className={`rounded-full px-2 py-1 text-[10px] font-semibold ${isActive ? 'bg-white/12 text-white dark:bg-emerald-950/55 dark:text-emerald-50' : 'bg-slate-100 text-slate-500 dark:bg-surface-800 dark:text-slate-400'}`}>
                                      {sectionItems.filter((item) => item.type === 'PRICED' || item.type === 'PROVISIONAL_SUM' || item.type === 'PC_SUM').length}
                                    </div>
                                  </div>
                                  <div className={`mt-3 flex items-center justify-between text-[11px] ${isActive ? 'text-slate-200 dark:text-slate-700' : 'text-slate-500 dark:text-slate-400'}`}>
                                    <span>{section.pages?.length ? `${section.pages.length} page${section.pages.length === 1 ? '' : 's'}` : 'Direct items'}</span>
                                    <span>{formatCurrency(sectionTotal)}</span>
                                  </div>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </aside>
                  )
                )}
                <div className="order-2 flex-1 overflow-y-auto p-6 bg-surface-50 dark:bg-surface-950 min-w-0">
                  <BillView
                    activeBill={activeBill}
                    activeProject={currentProject}
                    onUpdateLineStyle={(key, style) => updateProject(currentProject.id, { billLineStyles: { ...currentProject.billLineStyles, [key]: style } })}
                    onSaveLineStylesDefault={() => {
                      setAppSettings((previous) => ({ ...previous, projectDefaults: { ...previous.projectDefaults, billLineStyles: { ...previous.projectDefaults.billLineStyles, ...currentProject.billLineStyles } } }));
                      showToast({ type: 'success', message: 'Bill appearance saved as the default for new projects.' });
                    }}
                    selectedPageId={activePageSidebarId}
                    viewMode={effectiveBillViewMode}
                    selectedTradeFilter={selectedTradeFilter}
                    trades={trades}
                    selectedItemIds={selectedItemIds}
                    setSelectedItemIds={setSelectedItemIds}
                    recentlyInsertedItemIds={recentlyInsertedItemIds}
                    onOpenEditor={(billId, sectionId, item?, type?, pageId?, insertAfterItemId?) =>
                      actions.openEditor(billId, sectionId, item, type, undefined, undefined, undefined, undefined, pageId, insertAfterItemId)
                    }
                    onExpandEditor={() => setIsEditorOpen(true)}
                    onOpenPrompt={actions.openPrompt}
                    onOpenLibrary={(open) => { if (!ESTIMATE_ONLY) setIsLibraryWindowOpen(open); }}
                    onOpenStandardsInsert={() => setIsStandardsInsertOpen(true)}
                    onOpenImportLines={() => setIsImportLinesOpen(true)}
                    onImportJsonToSection={(sectionId) => {
                      void handleImportJsonIntoScope({ sectionId });
                    }}
                    onImportJsonToPage={(sectionId, pageId) => {
                      void handleImportJsonIntoScope({ sectionId, pageId });
                    }}
                    onDeleteBillItem={actions.handleDeleteItem}
                      onMoveBillItem={handleMoveBillItem}
                    onInsertStandardsItems={handleInsertStandardsItems}
                    onQuickInsertLine={(item, destination) => {
                      const place = (items: BoQItem[]) => insertItemsAtPlacement(items, [item], destination.anchorItemId ? 'AFTER_SELECTED' : 'BOTTOM', destination.anchorItemId);
                      const bills = destination.sectionId && destination.pageId
                        ? updateBillSectionPageItems(currentProject, activeBill.id, destination.sectionId, destination.pageId, place)
                        : destination.sectionId
                          ? updateBillSectionItems(currentProject, activeBill.id, destination.sectionId, place)
                          : updateBillItems(currentProject, activeBill.id, place);
                      updateProject(currentProject.id, { bills });
                    }}
                      onShiftBillItem={handleShiftBillItem}
                    onInlineQuantityUpdate={handleInlineQuantityUpdate}
                    onInlineDescriptionUpdate={handleInlineDescriptionUpdate}
                    onInlineRowUpdate={handleInlineRowUpdate}
                    onInlineUnitUpdate={handleInlineUnitUpdate}
                    onInlineRateUpdate={handleInlineRateUpdate}
                    onApplyLiveRates={handleApplyLiveRates}
                    onBatchAssign={actions.handleBatchAssign}
                    onDuplicateSelectedItems={actions.handleDuplicateSelectedItems}
                    onPasteCopiedItems={actions.handlePasteCopiedItems}
                    copiedBillItemsCount={actions.copiedBillItemsCount}
                    onDeleteSelectedItems={actions.handleDeleteSelectedItems}
                    onClearSelectedValues={actions.handleClearSelectedValues}
                    onSingleItemTradeAssign={actions.handleSingleItemTradeAssign}
                    onBillTradeAssign={actions.handleBillTradeAssign}
                    onSectionTradeAssign={actions.handleSectionTradeAssign}
                    onPageTradeAssign={actions.handlePageTradeAssign}
                    activeItemId={activeItemId}
                    onChangeTradeFilter={setSelectedTradeFilter}
                    onRecordRevisionPoint={() => setIsBoqRevisionPointOpen(true)}
                    onOpenTenderView={ESTIMATE_ONLY ? undefined : () => setIsTenderViewOpen(true)}
                    onExportSection={
                      activeBill && currentProject
                        ? async (section) => {
                            setIsExporting(true);
                            try {
                              const { exportSectionToExcel } = await loadExcelExports();
                              await exportSectionToExcel(currentProject, activeBill, section, trades);
                              showToast({ type: 'success', message: feedbackSuccess(`Section "${section.name}" Excel export`), duration: 3000 });
                            } catch (e) {
                              showToast({ type: 'error', message: feedbackError(`Section "${section.name}" Excel export`, e, 'Please try the export again.') });
                            } finally {
                              setIsExporting(false);
                            }
                          }
                        : undefined
                    }
                    onDeleteSection={actions.handleDeleteSection}
                    onMoveSection={actions.handleMoveSection}
                    onClearBillValues={actions.handleClearBillValues}
                    onClearSectionValues={actions.handleClearSectionValues}
                    onClearPageValues={actions.handleClearPageValues}
                    onExportBillPdf={
                      activeBill && currentProject
                        ? async () => {
                            setIsExporting(true);
                            try {
                              await actions.handleExportPdf();
                            } finally {
                              setIsExporting(false);
                            }
                          }
                        : undefined
                    }
                    onExportBillExcel={
                      activeBill && currentProject
                        ? async () => {
                            setIsExporting(true);
                            try {
                              const { exportBillToExcel } = await loadExcelExports();
                              await exportBillToExcel(currentProject, activeBill, trades);
                              showToast({ type: 'success', message: feedbackSuccess(`Bill "${activeBill.name}" Excel export`), duration: 3000 });
                            } catch (e) {
                              showToast({ type: 'error', message: feedbackError(`Bill "${activeBill.name}" Excel export`, e, 'Please try the export again.') });
                            } finally {
                              setIsExporting(false);
                            }
                          }
                        : undefined
                    }
                    isExporting={isExporting}
                    onCopySection={(billId, sectionId) => {
                      const section = activeBill?.sections.find((entry) => entry.id === sectionId);
                      if (!section) return;
                      openCopyModal({
                        kind: 'SECTION',
                        billId,
                        sectionId,
                        label: section.name,
                      });
                    }}
                    onCopyPage={(billId, sectionId, pageId) => {
                      const section = activeBill?.sections.find((entry) => entry.id === sectionId);
                      const page = section?.pages?.find((entry) => entry.id === pageId);
                      if (!section || !page) return;
                      openCopyModal({
                        kind: 'PAGE',
                        billId,
                        sectionId,
                        pageId,
                        label: page.name || `Page in ${section.name}`,
                      });
                    }}
                    onDeletePage={actions.handleDeletePage}
                    onSaveSectionAssembly={handleSaveSectionAssembly}
                    selectedSectionId={activeSectionSidebarId}
                    onSelectSection={(sectionId) => {
                      setActiveSectionSidebarId(sectionId);
                      setBillSectionJumpTarget(sectionId);
                    }}
                    jumpToSectionId={billSectionJumpTarget}
                    jumpToPageId={billPageJumpTarget}
                    onJumpHandled={() => setBillSectionJumpTarget(null)}
                    onPageJumpHandled={() => setBillPageJumpTarget(null)}
                    workspaceLayout={billWorkspaceLayout}
                    workspaceZoom={billWorkspaceZoom}
                    isWorkspaceMaximized={isBillWorkspaceFocused}
                    isWorkspaceSurfaceActive={isBillWorkspaceSurfaceActive}
                    showStickyTotalsInWorkspace={isBillWorkspaceSurfaceActive}
                  />
                </div>
                {activeBill && isStandardsInsertOpen && (
                  <BillStandardsInsertPanel
                    activeItemId={activeItemId}
                    activeBill={activeBill}
                    libraries={libraries}
                    selectedItemIds={selectedItemIds}
                    selectedSectionId={activeSectionSidebarId}
                    onClose={() => setIsStandardsInsertOpen(false)}
                    onOpenFullLibrary={() => {
                      setIsStandardsInsertOpen(false);
                      setIsLibraryWindowOpen(true);
                    }}
                    onInsert={handleInsertStandardsItems}
                  />
                )}
                {false && editorConfig.billId && !editorConfig.libId && !isEditorOpen && !isInspectorFloating && (
                  <div className="h-full max-h-full shrink-0 overflow-hidden">
                    <InspectorPanel
                      config={editorConfig}
                      contextTitle={editorContext.title}
                      contextDetail={editorContext.detail}
                      editorLocationContext={editorLocationContext}
                      formData={editFormData}
                      setFormData={setEditFormData}
                      trades={trades}
                      onClose={() => setEditorConfig({ billId: '', sectionId: '' })}
                      onOpenFullEditor={() => setIsEditorOpen(true)}
                      onPreviousItem={() => { void handleNavigateInspectorItem(-1); }}
                      onNextItem={() => { void handleNavigateInspectorItem(1); }}
                      canGoPrevious={activeEditorItemIndex > 0}
                      canGoNext={activeEditorItemIndex !== -1 && activeEditorItemIndex < editorItems.length - 1}
                      itemPositionLabel={activeEditorItemIndex !== -1 ? `Item ${activeEditorItemIndex + 1} of ${editorItems.length}` : undefined}
                      isFloating={false}
                      onToggleFloating={() => {
                        const nextSize = clampInspectorFloatSize(inspectorFloatSize);
                        setInspectorFloatSize(nextSize);
                        setInspectorFloatPosition(clampInspectorFloatPosition(getDefaultInspectorFloatPosition(nextSize), nextSize));
                        setIsInspectorFloating(true);
                      }}
                    />
                  </div>
                )}
              </div>
              {false && editorConfig.billId && !editorConfig.libId && !isEditorOpen && isInspectorFloating && (
                <div
                  className="fixed z-[120] overflow-hidden"
                  style={{
                    left: inspectorFloatPosition.x,
                    top: inspectorFloatPosition.y,
                    width: inspectorFloatSize.width,
                    height: inspectorFloatSize.height,
                    maxWidth: 'calc(100vw - 2rem)',
                    maxHeight: 'calc(100vh - 2rem)',
                  }}
                >
                  <InspectorPanel
                    config={editorConfig}
                    contextTitle={editorContext.title}
                    contextDetail={editorContext.detail}
                    editorLocationContext={editorLocationContext}
                    formData={editFormData}
                    setFormData={setEditFormData}
                    trades={trades}
                    onClose={() => setEditorConfig({ billId: '', sectionId: '' })}
                    onOpenFullEditor={() => setIsEditorOpen(true)}
                    onPreviousItem={() => { void handleNavigateInspectorItem(-1); }}
                    onNextItem={() => { void handleNavigateInspectorItem(1); }}
                    canGoPrevious={activeEditorItemIndex > 0}
                    canGoNext={activeEditorItemIndex !== -1 && activeEditorItemIndex < editorItems.length - 1}
                    itemPositionLabel={activeEditorItemIndex !== -1 ? `Item ${activeEditorItemIndex + 1} of ${editorItems.length}` : undefined}
                    isFloating
                    onToggleFloating={() => setIsInspectorFloating(false)}
                    onFloatDragStart={handleStartInspectorFloatDrag}
                    isDraggingFloat={isDraggingInspector}
                  />
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize inspector"
                    title="Drag to resize inspector"
                    onMouseDown={handleStartInspectorResize}
                    className={`absolute bottom-0 right-0 h-6 w-6 cursor-nwse-resize rounded-br-app-xl ${
                      isResizingInspector ? 'bg-primary-500/20' : 'bg-transparent hover:bg-primary-500/10'
                    }`}
                  >
                    <div className="absolute bottom-1.5 right-1.5 h-3 w-3 border-b-2 border-r-2 border-slate-400/80 dark:border-slate-500" />
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>

      {/* Modals */}
      <React.Suspense fallback={lazyModalFallback}>
        {isPaletteOpen && (
          <CommandPalette
            libraries={libraries}
            quickActions={commandPaletteActions}
            isOpen={isPaletteOpen}
            onClose={() => setIsPaletteOpen(false)}
            onSelect={actions.handlePaletteSelect}
          />
        )}
        {isProjectExcelExportOpen && (
          <React.Suspense fallback={lazyModalFallback}>
            <ProjectExcelExportModal
              projectName={currentProject.name}
              onClose={() => setIsProjectExcelExportOpen(false)}
              onConfirm={(mode) => { void handleProjectExcelExport(mode); }}
            />
          </React.Suspense>
        )}
        {!renderWorkspaceModulesInline && isCostReportsHubOpen && currentProject && (
          <React.Suspense fallback={lazyModalFallback}>
            <CostReportsHubModal
              isOpen={isCostReportsHubOpen}
              project={currentProject}
              trades={trades}
              onClose={() => setIsCostReportsHubOpen(false)}
              onOpenAnalytics={() => setIsAnalyticsOpen(true)}
              onOpenProjectSummary={() => setIsProjectSummaryOpen(true)}
              onOpenCostPlan={() => setIsCostPlanOpen(true)}
              onOpenProjectExcelExport={() => setIsProjectExcelExportOpen(true)}
              onOpenTenderAnalysis={() => setIsTenderViewOpen(true)}
              onOpenAuditTrail={() => setIsAuditTrailOpen(true)}
              onOpenVersionHistory={() => setIsVersionHistoryOpen(true)}
              onOpenBill={(billId) => {
                if (billId) setActiveBillId(billId);
              }}
            />
          </React.Suspense>
        )}
        {!renderWorkspaceModulesInline && isLibraryWindowOpen && (
          <LibraryWindow
            libraries={libraries}
            setLibraries={setLibraries}
            openPrompt={actions.openPrompt}
            openEditor={actions.openEditor}
            isAiLoading={isAiLoading}
            onImport={() => actions.handleImport(setLibraries, 'Libraries')}
            onExport={(data: unknown, filename: string) => actions.downloadJson(data, filename)}
            onUseInProject={actions.onUseInProject}
            onClose={() => setIsLibraryWindowOpen(false)}
          />
        )}
        {copySource && (
          <CopyContentModal
            isOpen={Boolean(copySource)}
            onClose={() => setCopySource(null)}
            onSubmit={handleCopyContent}
            sourceKind={copySource.kind}
            sourceLabel={copySource.label}
            projects={copyTargetProjects}
            libraries={copyTargetLibraries}
            currentProjectId={currentProject.id}
          />
        )}
        {isImportLinesOpen && (
          <ImportBillLinesModal
            isOpen={isImportLinesOpen}
            onClose={() => setIsImportLinesOpen(false)}
            onSubmit={handleImportLines}
            projects={importLineProjects}
            currentProjectId={currentProject.id}
            targetOptions={importLineTargets.map((target) => ({ value: target.value, label: target.label }))}
            defaultTargetValue={importLineTargets[0]?.value}
            onWorkbookImport={handleWorkbookImport}
          />
        )}
        {isTradesWindowOpen && (
          <TradesWindow
            trades={trades}
            setTrades={setTrades}
            tenderTradeStatus={currentProject?.tenderTradeStatus}
            showProjectTenderContext
            onClose={() => setIsTradesWindowOpen(false)}
            onImport={() => actions.handleImport(setTrades, 'Trade Directory')}
            onExport={() => actions.downloadJson(trades, `qs-trades-${new Date().toISOString().split('T')[0]}.json`)}
            onNewTrade={() => actions.openPrompt('CREATE_TRADE')}
            onAddContractor={(tradeId: string) => actions.openPrompt('ADD_CONTRACTOR', { tradeId })}
            onOpenTenderView={() => setIsTenderViewOpen(true)}
            onExportTradeBoQ={
              currentProject
                ? async (trade) => {
                    setIsExporting(true);
                    try {
                      const { exportTradeBoQToExcel } = await loadExcelExports();
                      await exportTradeBoQToExcel(currentProject, trade);
                      showToast({ type: 'success', message: feedbackSuccess(`Trade BoQ export for "${trade.name}"`), duration: 3000 });
                    } catch (e) {
                      showToast({ type: 'error', message: feedbackError(`Trade BoQ export for "${trade.name}"`, e, 'Please try the export again.') });
                    } finally {
                      setIsExporting(false);
                    }
                  }
                : undefined
            }
            onExportBlankTender={
              currentProject
                ? async (trade) => {
                  try {
                    const { exportBlankTenderTemplate } = await loadExcelExports();
                    await exportBlankTenderTemplate(currentProject, trade);
                    showToast({ type: 'success', message: feedbackSuccess(`Blank tender template for "${trade.name}"`), duration: 3000 });
                  } catch (e) {
                      showToast({ type: 'error', message: feedbackError(`Blank tender template for "${trade.name}"`, e, 'Please try the export again.') });
                    }
                  }
                : undefined
            }
            onExportTenderSheets={
              currentProject
                ? async (trade) => {
                  try {
                    const { exportTenderSheetsTemplate } = await loadExcelExports();
                    await exportTenderSheetsTemplate(currentProject, trade);
                    showToast({ type: 'success', message: feedbackSuccess(`Tender sheets for "${trade.name}"`), duration: 3000 });
                  } catch (e) {
                      showToast({ type: 'error', message: feedbackError(`Tender sheets for "${trade.name}"`, e, 'Please try the export again.') });
                    }
                  }
                : undefined
            }
          />
        )}
        {!renderWorkspaceModulesInline && isTenderViewOpen && currentProject && (
          <TenderComparisonView
          project={currentProject}
          trades={trades}
          onClose={() => setIsTenderViewOpen(false)}
          onUpdateRates={(updates) => {
            if (!activeBillId) return;
            const snapshotPatch = shouldAutoSnapshot(currentProject)
              ? {
                  snapshots: prependSnapshot(
                    currentProject.snapshots,
                    createSnapshotEntry(
                      currentProject,
                      `Before tender apply-back ${new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`,
                      'Automatic restore point created before tender rates were applied back into the active bill.'
                    )
                  ),
                }
              : {};
            updateProject(currentProject.id, {
              ...snapshotPatch,
              bills: currentProject.bills.map((b) =>
                b.id !== activeBillId
                  ? b
                  : {
                      ...b,
                      sections: b.sections.map((s) => ({
                        ...s,
                        items: s.items.map((i) => {
                          const up = updates.find((u) => u.id === i.id);
                          if (up) return { ...i, rate: up.rate, rateSource: up.rateSource, total: safeMul(i.quantity, up.rate) };
                          return i;
                        }),
                        pages: (s.pages || []).map((page) => ({
                          ...page,
                          items: (page.items || []).map((i) => {
                            const up = updates.find((u) => u.id === i.id);
                            if (up) return { ...i, rate: up.rate, rateSource: up.rateSource, total: safeMul(i.quantity, up.rate) };
                            return i;
                          }),
                        })),
                      })),
                    }
              ),
            });
          }}
          onUpdateTenderData={(newData, newAttrs) => updateProject(currentProject.id, { tenderData: newData, tenderAttributes: newAttrs })}
          onSetWinner={(tradeId, winnerId, awardDetails) => {
            const trade = trades.find((entry) => entry.id === tradeId);
            const existingAward = currentProject.tenderAwards?.[tradeId];
            const contractorName =
              awardDetails?.contractorName ||
              trade?.contractors.find((contractor) => contractor.id === winnerId)?.name ||
              existingAward?.contractorName ||
              'Selected contractor';
            const selectedAt = awardDetails?.selectedAt || new Date().toISOString();
            const sourceTenderPackageName = awardDetails?.sourceTenderPackageName || trade?.name || existingAward?.sourceTenderPackageName || 'Tender package';
            const nextAward: TenderAwardRecord = {
              tradeId,
              contractorId: winnerId,
              contractorName,
              selectedAt,
              sourceTenderPackageId: tradeId,
              sourceTenderPackageName,
              approvalStatus: existingAward?.approvalStatus === 'APPROVED' || existingAward?.approvalStatus === 'SIGNED_APPROVAL_UPLOADED' || existingAward?.approvalStatus === 'APPROVAL_FORM_CREATED' || existingAward?.approvalStatus === 'REJECTED'
                ? existingAward.approvalStatus
                : 'WINNER_SELECTED',
              preparedBy: existingAward?.preparedBy,
              checkedBy: existingAward?.checkedBy,
              approvedBy: existingAward?.approvedBy,
              approvedAt: existingAward?.approvedAt,
              rejectedBy: existingAward?.rejectedBy,
              rejectedAt: existingAward?.rejectedAt,
              rejectionReason: existingAward?.rejectionReason,
              approvalFormCreatedAt: existingAward?.approvalFormCreatedAt,
              approvalWorkbookFileName: existingAward?.approvalWorkbookFileName,
              signedApproval: existingAward?.signedApproval,
              billApplyHistory: existingAward?.billApplyHistory || [],
            };

            const derivedResponseState: TenderResponseState = winnerId ? 'WINNER_SELECTED' : 'RETURNS_RECEIVED';
            updateProject(currentProject.id, {
              tenderAwards: {
                ...(currentProject.tenderAwards || {}),
                [tradeId]: nextAward,
              },
              tenderTradeStatus: {
                ...(currentProject.tenderTradeStatus || {}),
                [tradeId]: {
                  ...(currentProject.tenderTradeStatus?.[tradeId] || {}),
                  responseState: derivedResponseState,
                },
              },
            });
            recordOperationLogEntry({
              kind: 'tender',
              status: 'success',
              subject: 'Tender award',
              message: `Selected ${contractorName} as winner for ${sourceTenderPackageName}.`,
              projectId: currentProject.id,
              projectName: currentProject.name,
              billId: activeBill?.id,
              billName: activeBill?.name,
            });
          }}
          onUpdateTenderAward={(tradeId, updates) => {
            const existingAward = currentProject.tenderAwards?.[tradeId];
            if (!existingAward) return;
            updateProject(currentProject.id, {
              tenderAwards: {
                ...(currentProject.tenderAwards || {}),
                [tradeId]: {
                  ...existingAward,
                  ...updates,
                },
              },
            });
          }}
          onRecordTenderBillApply={(tradeId, summary: TenderApplySummary) => {
            const existingAward = currentProject.tenderAwards?.[tradeId];
            if (!existingAward) return;
            updateProject(currentProject.id, {
              tenderAwards: {
                ...(currentProject.tenderAwards || {}),
                [tradeId]: {
                  ...existingAward,
                  billApplyHistory: [summary, ...(existingAward.billApplyHistory || [])],
                },
              },
            });
            recordOperationLogEntry({
              kind: 'tender',
              status: 'success',
              subject: 'Tender apply-back',
              message: `Applied tender return for ${existingAward.sourceTenderPackageName || tradeId} back to the bill.`,
              projectId: currentProject.id,
              projectName: currentProject.name,
              billId: activeBill?.id,
              billName: activeBill?.name,
              counts: {
                items: summary.itemsUpdated,
                pricedItems: summary.itemsUpdated,
                skipped: summary.itemsSkipped + summary.itemsWithNoContractorRate,
              },
            });
          }}
          onUpdateTenderContractors={(tradeId, contractorIds) =>
            updateProject(currentProject.id, {
              tenderContractors: { ...(currentProject.tenderContractors || {}), [tradeId]: contractorIds },
            })
          }
          onUpdateTenderTradeStatus={(tradeId, statusUpdates) =>
            updateProject(currentProject.id, {
              tenderTradeStatus: {
                ...(currentProject.tenderTradeStatus || {}),
                [tradeId]: {
                  ...(currentProject.tenderTradeStatus?.[tradeId] || {}),
                  ...statusUpdates,
                },
              },
            })
          }
          />
        )}
        {isAnalyticsOpen && currentProject && (
          <AnalyticsModal
            project={currentProject}
            trades={trades}
            onClose={() => setIsAnalyticsOpen(false)}
            onOpenPrompt={actions.openPrompt}
            onOpenTrades={() => {
              setIsAnalyticsOpen(false);
              setIsTradesWindowOpen(true);
            }}
            onOpenTenderView={() => {
              setIsAnalyticsOpen(false);
              setIsTenderViewOpen(true);
            }}
          />
        )}
        {isCostPlanOpen && currentProject && (
          <CostPlanModal
          isOpen={isCostPlanOpen}
          project={currentProject}
          onClose={() => setIsCostPlanOpen(false)}
          onSave={(plan) => {
            const previousPlan = currentProject.costPlan;
            const nextHistory = previousPlan && JSON.stringify(previousPlan) !== JSON.stringify(plan)
              ? [previousPlan, ...(currentProject.costPlanHistory || [])].slice(0, 10)
              : (currentProject.costPlanHistory || []);
            updateProject(currentProject.id, { costPlan: plan, costPlanHistory: nextHistory });
          }}
          showToast={showToast}
          />
        )}
        {isAssembliesOpen && currentProject && (
          <AssembliesModal
          isOpen={isAssembliesOpen}
          project={currentProject}
          activeBill={activeBill}
          onClose={() => setIsAssembliesOpen(false)}
          onApplyAssembly={handleApplyAssembly}
          onDeleteAssembly={handleDeleteAssembly}
          />
        )}
        {isAskAiOpen && (
          <AskAiModal
          isOpen={isAskAiOpen}
          project={currentProject}
          libraries={libraries}
          trades={trades}
          activeBillId={activeBillId}
          onClose={() => setIsAskAiOpen(false)}
          showToast={showToast}
          />
        )}
        {isProjectSummaryOpen && currentProject && (
          <ProjectSummaryModal
          isOpen={isProjectSummaryOpen}
          project={currentProject}
          showToast={showToast}
          onClose={() => setIsProjectSummaryOpen(false)}
          />
        )}
        <FutureModulesModal
          isOpen={isFutureModulesOpen}
          project={currentProject}
          onClose={() => setIsFutureModulesOpen(false)}
        />
        {isBillSettingsOpen && currentProject && activeBill && (
          <BillSettingsModal
          bill={activeBill}
          onClose={() => setIsBillSettingsOpen(false)}
          onSave={(updates) => {
            updateProject(currentProject.id, {
              bills: currentProject.bills.map((bill) => (bill.id === activeBill.id ? { ...bill, ...updates } : bill)),
            });
            showToast({ type: 'success', message: `Saved bill settings for "${activeBill.name}".`, duration: 3000 });
          }}
          />
        )}
        {isEditorOpen && (
          <ItemEditorModal
          config={editorConfig}
          contextTitle={editorContext.title}
          contextDetail={editorContext.detail}
          editorLocationContext={editorLocationContext}
            trades={trades}
            formData={editFormData}
            setFormData={setEditFormData}
            onSave={actions.handleSaveItem}
            onSaveAndAddAnother={actions.handleSaveItemAndContinue}
            onSaveMultiple={actions.handleSaveMultipleItems}
            onClose={() => { void handleCloseFullEditor(); }}
            onAiFetch={actions.handleAiFetchSuggestions}
          isAiLoading={isAiLoading}
          aiSuggestions={aiSuggestions}
          onSuggestionSelect={actions.onSuggestionSelect}
          onIntervalExpand={actions.handleIntervalExpandAndSave}
          onPreviousItem={() => { void handleNavigateEditorItem(-1); }}
          onNextItem={() => { void handleNavigateEditorItem(1); }}
          onPreviousPricedItem={() => { void handleNavigateEditorItem(-1, true); }}
          onNextPricedItem={() => { void handleNavigateEditorItem(1, true); }}
          canGoPrevious={billNavigationIndex > 0}
          canGoNext={billNavigationIndex !== -1 && billNavigationIndex < billNavigationRows.length - 1}
          canGoPreviousPriced={Boolean(previousPricedRow)}
          canGoNextPriced={Boolean(nextPricedRow)}
          itemPositionLabel={billNavigationIndex !== -1 ? `Row ${billNavigationIndex + 1} of ${billNavigationRows.length}` : undefined}
          quickAddTargets={quickAddTargets}
          quickAddTargetValue={quickAddTargetValue}
          onQuickAddTargetChange={handleQuickAddTargetChange}
          quickAddAnchorLabel={quickAddAnchorInfo?.anchorLabel}
          quickAddPlacement={quickAddAnchorInfo?.placement}
          onQuickAddPlacementChange={quickAddAnchorInfo ? handleQuickAddPlacementChange : undefined}
          />
        )}
        {isPromptOpen && (
          <PromptModal config={promptConfig} onSubmit={actions.handlePromptSubmit} onClose={() => setIsPromptOpen(false)} />
        )}
        <VersionHistoryModal
          isOpen={isVersionHistoryOpen}
          currentProject={currentProject}
          onCreateSnapshot={handleCreateSnapshot}
          onCreateBoqRevisionPoint={() => setIsBoqRevisionPointOpen(true)}
          onRestoreSnapshot={handleRestoreSnapshot}
          onClose={() => setIsVersionHistoryOpen(false)}
        />
        <BoqRevisionPointModal
          isOpen={isBoqRevisionPointOpen}
          scopeLabel={activeBill?.name || currentProject.name}
          onSubmit={handleCreateBoqRevisionPoint}
          onClose={() => setIsBoqRevisionPointOpen(false)}
        />
        <KeyboardShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
        <AppDiagnosticsModal
          isOpen={isDiagnosticsOpen}
          onClose={() => setIsDiagnosticsOpen(false)}
          onOpenSettings={() => {
            setIsDiagnosticsOpen(false);
            setIsSettingsOpen(true);
          }}
          onOpenVersionHistory={() => {
            setIsDiagnosticsOpen(false);
            setIsVersionHistoryOpen(true);
          }}
        />
        {!renderWorkspaceModulesInline && (
          <AuditTrailModal
            isOpen={isAuditTrailOpen}
            onClose={() => setIsAuditTrailOpen(false)}
            initialProjectId={currentProject.id}
            project={currentProject}
            onOpenBill={(billId) => {
              if (billId) setActiveBillId(billId);
            }}
            onOpenTenderAnalysis={() => setIsTenderViewOpen(true)}
            onOpenReports={() => setIsCostReportsHubOpen(true)}
            onOpenLibrary={() => setIsLibraryWindowOpen(true)}
            onOpenVersionHistory={() => setIsVersionHistoryOpen(true)}
          />
        )}
        <ContextMenu state={navigatorContextMenu} onClose={() => setNavigatorContextMenu(null)} />
      </React.Suspense>
    </div>
  );
}
