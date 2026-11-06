/**
 * Centralized app actions (handlers) for bills, library, editor, modals, and import/export.
 * Uses utils/billUpdates for all bill and library section updates.
 */
import React, { useCallback, useState } from 'react';
import type { Project, BoQItem, BoQBill, BoQSection, ItemType, DimensionRow, PromptType, ItemLibrary, TradePackage, AiGenerationOptions, PromptConfigContext, PromptSubmitMeta, ClearValuesMode } from '../types';
import { UnitType } from '../types';
import { safeMul } from '../utils/calculations';
import { applyRateBuildUp, normaliseRateBuildUp } from '../utils/rateBuildUp';
import { updateBillSectionItems, updateBillItems, updateBillSectionPageItems, updateLibrarySectionItems, updateLibrarySectionPageItems, findLibrarySection, findLibraryPage } from '../utils/billUpdates';
import { reindexBillReferences } from '../utils/calculations';
import { normalizeUnit } from '../utils/formatting';
import type { EditorConfig, EditFormState } from '../types';
import type { AIClarification, AISuggestion } from '../types';
import { generateId } from '../utils/generateId';
import { useConfirm } from '../contexts/ConfirmContext';
import { feedbackError, feedbackSaved, feedbackSuccess } from '../utils/feedback';
import { getPreferredBillId } from '../utils/projectSelection';
import { resolveHighlightedRow } from '../utils/billPlacement';
import { createSnapshotEntry, prependSnapshot, shouldAutoSnapshot, withAutoSnapshot } from '../utils/projectSnapshots';
import { compileCostPlan, getDefaultContingencyForDrawingBasis } from '../utils/costPlan';
import { recordOperationLogEntry } from '../utils/operationLog';
import { buildNewProjectSettingsFromDefaults, type AppSettings } from '../utils/appSettings';
import { assignEstimateReferences, buildNextEstimateReference, ensureEstimateReference } from '../utils/estimateReferences';
import { getNextCommentItemType, getNextHeadingItemType, isCommentItemType, isHeadingItemType } from '../utils/billStructure';
import {
  appendLibraryItems,
  createFolder,
  createLibrary,
  createPage,
  createSection,
  importLibrariesToRepository,
  renameFolder,
  renameLibrary,
  renamePage,
  renameSection,
  upsertLibraryItem,
} from '../utils/libraryRepository';

export interface UseAppActionsParams {
  projects: Project[];
  currentProject: Project | null;
  activeBill: BoQBill | null;
  activeBillId: string | null;
  libraries: ItemLibrary[];
  trades: { id: string; name: string; contractors: unknown[]; winnerId?: string }[];
  appSettings: AppSettings;
  updateProject: (id: string, updates: Partial<Project>) => void;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setLibraries: React.Dispatch<React.SetStateAction<ItemLibrary[]>>;
  setTrades: React.Dispatch<React.SetStateAction<{ id: string; name: string; contractors: unknown[]; winnerId?: string }[]>>;
  setCurrentProjectId: (id: string | null) => void;
  setActiveBillId: (id: string | null) => void;
  editorConfig: EditorConfig;
  setEditorConfig: React.Dispatch<React.SetStateAction<EditorConfig>>;
  editFormData: EditFormState;
  setEditFormData: React.Dispatch<React.SetStateAction<EditFormState>>;
  selectedItemIds: Set<string>;
  setSelectedItemIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setIsEditorOpen: (v: boolean) => void;
  setIsPromptOpen: (v: boolean) => void;
  setIsAskingAiQuestions: (v: boolean) => void;
  setAiClarification: (v: AIClarification | null) => void;
  setIsAiLoading: (v: boolean) => void;
  setAiAnswers: (v: string) => void;
  setAiFiles: (v: { name: string; mimeType: string; data: string }[] | ((prev: { name: string; mimeType: string; data: string }[]) => { name: string; mimeType: string; data: string }[])) => void;
  resetAiWorkflowFiles: () => void;
  setAiClarificationPhase: (phase: 'items' | 'measurements') => void;
  setPromptConfig: React.Dispatch<React.SetStateAction<{
    type: PromptType; title: string; placeholder: string; defaultValue: string; context?: PromptConfigContext; showStandardToggle?: boolean; defaultStandard?: 'SMM7' | 'NRM2';
  }>>;
  promptConfig: { type: PromptType; context?: PromptConfigContext; defaultValue: string };
  handleAiHierarchyGeneration: (prompt: string, answers: string, standardOverride?: 'SMM7' | 'NRM2', history?: string[], files?: { name: string; mimeType: string; data: string }[], aiOptions?: AiGenerationOptions) => Promise<void>;
  submitAiClarification: (combinedAnswers?: string) => Promise<void>;
  showToast: (opts: { type: 'success' | 'error' | 'info'; message: string; duration?: number }) => void;
  setAiSuggestions?: (v: AISuggestion[]) => void;
  setAiConversationHistory?: (v: string[] | ((prev: string[]) => string[])) => void;
}

export interface AppActions {
  openPrompt: (type: PromptType, context?: Record<string, unknown>) => void;
  openEditor: (billId: string | null, sectionId: string | null, item?: BoQItem | null, type?: ItemType, libId?: string, folderId?: string, libSectionId?: string, itemIdx?: number, pageId?: string | null, insertAfterItemId?: string | null) => void;
  handlePromptSubmit: (value: string, standard?: 'SMM7' | 'NRM2', aiOptions?: AiGenerationOptions, meta?: PromptSubmitMeta) => Promise<void>;
  handleSaveItem: () => void;
  handleSaveItemAndContinue: () => void;
  handleSaveMultipleItems: (newItems: BoQItem[], continueAdding?: boolean) => void;
  handleBatchAssign: (tradeId: string) => void;
  handleDuplicateSelectedItems: () => void;
  handlePasteCopiedItems: () => void;
  copiedBillItemsCount: number;
  handleDeleteSelectedItems: () => void;
  handleClearSelectedValues: (mode: ClearValuesMode) => void;
  handleSingleItemTradeAssign: (itemId: string, tradeId: string) => void;
  handleBillTradeAssign: (billId: string, tradeId: string) => void;
  handleSectionTradeAssign: (billId: string, sectionId: string, tradeId: string) => void;
    handlePageTradeAssign: (billId: string, sectionId: string, pageId: string, tradeId: string) => void;
    handleDeleteItem: (sectionId: string, itemId: string, pageId?: string | null) => void;
    handleDeleteSection: (billId: string, sectionId: string) => void;
    handleDeletePage: (billId: string, sectionId: string, pageId: string) => void;
    handleClearBillValues: (billId: string, mode: ClearValuesMode) => void;
    handleClearSectionValues: (billId: string, sectionId: string, mode: ClearValuesMode) => void;
    handleClearPageValues: (billId: string, sectionId: string, pageId: string, mode: ClearValuesMode) => void;
    handleClearBillRatesAndQuantities: (billId: string) => void;
    handleClearSectionRatesAndQuantities: (billId: string, sectionId: string) => void;
    handleClearPageRatesAndQuantities: (billId: string, sectionId: string, pageId: string) => void;
    handleMoveSection: (billId: string, sectionId: string, direction: 'UP' | 'DOWN') => void;
  onUseInProject: (item: BoQItem, sectionItems?: BoQItem[]) => void;
  handlePaletteSelect: (item: BoQItem, _libName: string, _path: string) => void;
  handleExportPdf: () => Promise<void>;
  downloadJson: (data: unknown, filename: string) => void;
  handleImport: (setter: (fn: (prev: unknown) => unknown) => void, expectedKey: string) => void;
  handleCiteImport: (project: Project) => void;
  handleWindowDrop: (e: React.DragEvent) => void;
  handleWindowDragOver: (e: React.DragEvent) => void;
  handleIntervalExpandAndSave: (interval: number, max: number) => Promise<void>;
  handleAiFetchSuggestions: () => Promise<void>;
  onSuggestionSelect: (s: AISuggestion) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasStringId(value: unknown): value is { id: string } {
  return isRecord(value) && typeof value.id === 'string' && value.id.length > 0;
}

function loadGeminiService() {
  return import('../services/geminiService');
}

function parseOrderableName(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^([^|:]+?)\s*[|:]\s*(.+)$/);
  if (!match) {
    return { orderRef: '', name: trimmed };
  }
  return {
    orderRef: match[1].trim(),
    name: match[2].trim(),
  };
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
  structure?: Record<string, string>;
  items: CustomLibraryImportRow[];
};

type LibraryExportEnvelope = {
  format: 'QS_PRO_LIBRARY_EXPORT';
  version: 1;
  markImportedLibrariesAsLocked?: boolean;
  permissions?: ItemLibrary['permissions'];
  libraries: ItemLibrary[];
};

function isCustomLibraryImportShape(value: unknown): value is CustomLibraryImportShape {
  return isRecord(value)
    && Array.isArray((value as CustomLibraryImportShape).items)
    && typeof (value as CustomLibraryImportShape).library_name === 'string'
    && typeof (value as CustomLibraryImportShape).section === 'string';
}

function isLibraryExportEnvelope(value: unknown): value is LibraryExportEnvelope {
  return isRecord(value)
    && value.format === 'QS_PRO_LIBRARY_EXPORT'
    && Array.isArray((value as LibraryExportEnvelope).libraries);
}

function createImportedLibraryLine(
  type: BoQItem['type'],
  description: string,
  unit = '',
  reference = ''
): Omit<BoQItem, 'total' | 'quantity' | 'id'> {
  return {
    type,
    reference,
    description,
    unit,
    rate: 0,
  };
}

const COMMERCIAL_ITEM_TYPES: ItemType[] = ['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'];

function isCommercialItem(item: BoQItem) {
  return COMMERCIAL_ITEM_TYPES.includes(item.type);
}

function getContinuationItemType(savedType: ItemType): ItemType {
  if (isHeadingItemType(savedType)) return getNextHeadingItemType(savedType);
  if (isCommentItemType(savedType)) return getNextCommentItemType(savedType);
  return savedType || 'PRICED';
}

function clearCommercialValues(item: BoQItem, mode: ClearValuesMode): BoQItem {
  if (!isCommercialItem(item)) return item;
  const next: BoQItem = { ...item, total: 0 };
  if (mode === 'RATES' || mode === 'RATES_AND_QUANTITIES') {
    next.rate = 0;
  }
  if (mode === 'QUANTITIES' || mode === 'RATES_AND_QUANTITIES') {
    next.quantity = 0;
  }
  return next;
}

function getClearValuesLabels(mode: ClearValuesMode) {
  if (mode === 'RATES') {
    return {
      title: 'Clear rates',
      action: 'rates',
      result: 'rates',
      kept: 'quantities, measurement rows',
    };
  }
  if (mode === 'QUANTITIES') {
    return {
      title: 'Clear quantities',
      action: 'quantities',
      result: 'quantities',
      kept: 'rates, measurement rows',
    };
  }
  return {
    title: 'Clear rates and quantities',
    action: 'rates and quantities',
    result: 'rates and quantities',
    kept: 'measurement rows',
  };
}

function countCommercialItems(items: BoQItem[]) {
  return items.filter(isCommercialItem).length;
}

function describeBillScope(project: Project, billId: string, sectionId?: string | null, pageId?: string | null) {
  const bill = project.bills.find((entry) => entry.id === billId);
  const section = sectionId ? bill?.sections.find((entry) => entry.id === sectionId) : null;
  const page = pageId ? section?.pages?.find((entry) => entry.id === pageId) : null;
  return [project.name, bill?.name, section?.name, page?.name].filter(Boolean).join(' / ') || project.name;
}

function recordBillAuditEntry({
  project,
  billId,
  sectionId,
  pageId,
  subject,
  message,
  items,
}: {
  project: Project;
  billId: string;
  sectionId?: string | null;
  pageId?: string | null;
  subject: string;
  message: string;
  items?: number;
}) {
  const bill = project.bills.find((entry) => entry.id === billId);
  recordOperationLogEntry({
    kind: 'bill',
    status: 'success',
    subject,
    message: `${message} Scope: ${describeBillScope(project, billId, sectionId, pageId)}.`,
    projectId: project.id,
    projectName: project.name,
    billId,
    billName: bill?.name,
    counts: items !== undefined ? { items } : undefined,
  });
}

function cloneBillItemForDuplicate(item: BoQItem): BoQItem {
  return {
    ...item,
    id: generateId(),
    dimensionRows: (item.dimensionRows || []).map((row) => ({
      ...row,
      id: generateId(),
    })),
  };
}

function getSectionItems(section: BoQSection | undefined) {
  if (!section) return [];
  return section.pages?.length
    ? section.pages.flatMap((page) => page.items || [])
    : section.items;
}

function getBillItems(bill: BoQBill | undefined) {
  if (!bill) return [];
  return [
    ...(bill.items || []),
    ...(bill.sections || []).flatMap(getSectionItems),
  ];
}

function buildImportedLibraryLines(data: CustomLibraryImportShape): Omit<BoQItem, 'total' | 'quantity' | 'id'>[] {
  const items: Omit<BoQItem, 'total' | 'quantity' | 'id'>[] = [];
  let lastGeneralHeading = '';
  let lastMajorHeading = '';
  let lastSubsection = '';
  let lastComment = '';

  data.items.forEach((row) => {
    const generalHeading = (row['General Heading'] || '').trim();
    const majorHeading = (row['Major heading'] || '').trim();
    const subsection = (row.subsection || '').trim();
    const comment = (row.comment || '').trim();
    const description = (row['item description'] || '').trim();
    const reference = (row.code || '').trim();
    const unit = normalizeUnit((row.Unit || '').trim());
    const isMeasured = !!unit && unit !== 'item';

    if (generalHeading && generalHeading !== lastGeneralHeading) {
      items.push(createImportedLibraryLine('GENERAL_HEADING', generalHeading));
      lastGeneralHeading = generalHeading;
      lastMajorHeading = '';
      lastSubsection = '';
      lastComment = '';
    }

    if (majorHeading && majorHeading !== lastMajorHeading) {
      items.push(createImportedLibraryLine('MAJOR_HEADING', majorHeading));
      lastMajorHeading = majorHeading;
      lastSubsection = '';
      lastComment = '';
    }

    if (subsection && subsection !== lastSubsection) {
      items.push(createImportedLibraryLine('SUB_SECTION', subsection));
      lastSubsection = subsection;
      lastComment = '';
    }

    if (comment && comment !== lastComment) {
      items.push(createImportedLibraryLine('COMMENT', comment));
      lastComment = comment;
    }

    if (description) {
      items.push(
        createImportedLibraryLine(
          isMeasured ? 'PRICED' : 'COMMENT',
          description,
          isMeasured ? unit : '',
          isMeasured ? reference : ''
        )
      );
    }
  });

  return items;
}

function convertCustomLibraryImportToLibrary(data: CustomLibraryImportShape): ItemLibrary {
  const libraryName = (data.library_name || data.section || 'Imported library').trim();
  const sectionName = (data.section || libraryName).trim();
  const folderName = (data.standard || 'Imported').trim();

  return {
    id: generateId(),
    name: libraryName,
    folders: [
      {
        id: generateId(),
        name: folderName,
        sections: [
          {
            id: generateId(),
            name: sectionName,
            items: buildImportedLibraryLines(data),
          },
        ],
      },
    ],
  };
}

function validateProjectsImport(data: unknown): Project[] {
  const values = Array.isArray(data) ? data : [data];
  if (values.length === 0 || !values.every((value) => hasStringId(value) && Array.isArray((value as Project).bills) && typeof (value as Project).name === 'string')) {
    throw new Error('This JSON does not look like a QS Pro project export.');
  }
  return values as Project[];
}

function validateLibrariesImport(data: unknown): ItemLibrary[] {
  if (isLibraryExportEnvelope(data)) {
    const values = data.libraries;
    if (values.length === 0 || !values.every((value) => hasStringId(value) && Array.isArray((value as ItemLibrary).folders) && typeof (value as ItemLibrary).name === 'string')) {
      throw new Error('This JSON does not look like a library export.');
    }
    return values.map((library) => ({
      ...library,
      exportLocked: data.markImportedLibrariesAsLocked || data.permissions?.allowExportAll === false ? true : !!library.exportLocked,
      permissions: {
        ...(library.permissions || {}),
        ...(data.permissions || {}),
        allowExportAll: data.markImportedLibrariesAsLocked ? false : (data.permissions?.allowExportAll ?? library.permissions?.allowExportAll ?? !library.exportLocked),
      },
    }));
  }
  if (isCustomLibraryImportShape(data)) {
    return [convertCustomLibraryImportToLibrary(data)];
  }
  const values = Array.isArray(data) ? data : [data];
  if (values.length === 0) {
    throw new Error('This JSON does not look like a library export.');
  }
  if (values.every(isCustomLibraryImportShape)) {
    return values.map(convertCustomLibraryImportToLibrary);
  }
  if (!values.every((value) => hasStringId(value) && Array.isArray((value as ItemLibrary).folders) && typeof (value as ItemLibrary).name === 'string')) {
    throw new Error('This JSON does not look like a library export.');
  }
  return values as ItemLibrary[];
}

function validateTradesImport(data: unknown): TradePackage[] {
  const values = Array.isArray(data) ? data : [data];
  if (values.length === 0 || !values.every((value) => hasStringId(value) && Array.isArray((value as TradePackage).contractors) && typeof (value as TradePackage).name === 'string')) {
    throw new Error('This JSON does not look like a trade directory export.');
  }
  return values as TradePackage[];
}

function mergeUniqueById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const existingIds = new Set(existing.map((item) => item.id));
  return [...existing, ...incoming.filter((item) => !existingIds.has(item.id))];
}

function insertItemAtPosition(items: BoQItem[], newItem: BoQItem, insertAfterItemId?: string | null): BoQItem[] {
  const nextItems = [...items];
  if (!insertAfterItemId) {
    return [newItem, ...nextItems];
  }
  const targetIndex = nextItems.findIndex((entry) => entry.id === insertAfterItemId);
  if (targetIndex === -1) {
    return [...nextItems, newItem];
  }
  nextItems.splice(targetIndex + 1, 0, newItem);
  return nextItems;
}

function summarizeImport(subject: string, added: number, skipped: number): string {
  if (added === 0 && skipped > 0) {
    return `${subject} import skipped. ${skipped} duplicate entr${skipped === 1 ? 'y was' : 'ies were'} already in the workspace.`;
  }
  if (skipped > 0) {
    return `${subject} import complete. ${added} added, ${skipped} skipped as duplicate${skipped === 1 ? '' : 's'}.`;
  }
  return feedbackSuccess(`${subject} import`, `${added} entr${added === 1 ? 'y' : 'ies'} added`);
}

function createAiStarterItem(item: {
  type: ItemType;
  description: string;
  unit?: string;
  quantity?: number;
  estimatedRate?: number;
}): BoQItem {
  const resolvedUnit = normalizeUnit(item.unit || (['PRICED', 'EXTRA_OVER_ITEM'].includes(item.type) ? UnitType.SUM : ''));
  const resolvedQuantity = ['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(item.type)
    ? (item.quantity && item.quantity > 0 ? item.quantity : 1)
    : 0;
  const resolvedRate = ['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(item.type)
    ? (item.estimatedRate || 0)
    : 0;

  return {
    id: generateId(),
    type: item.type,
    reference: '',
    description: item.description,
    unit: resolvedUnit,
    quantity: resolvedQuantity,
    rate: resolvedRate,
    total: safeMul(resolvedQuantity, resolvedRate),
    dimensionRows: [],
    aiLocks: {
      description: false,
      rate: false,
      measurements: false,
    },
  };
}

function createAiStarterSection(section: {
  name: string;
  notes?: string;
  items: Array<{
    type: ItemType;
    description: string;
    unit?: string;
    quantity?: number;
    estimatedRate?: number;
  }>;
}): BoQSection {
  const starterItems: BoQItem[] = [];

  if (section.notes?.trim()) {
    starterItems.push({
      id: generateId(),
      type: 'COMMENT',
      reference: '',
      description: section.notes.trim(),
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
    });
  }

  starterItems.push(...section.items.map(createAiStarterItem));

  return {
    id: generateId(),
    name: section.name,
    items: starterItems,
  };
}

export function useAppActions(params: UseAppActionsParams): AppActions {
  const {
    projects,
    currentProject,
    activeBill,
    activeBillId,
    libraries,
    trades,
    appSettings,
    updateProject,
    setProjects,
    setLibraries,
    setTrades,
    setCurrentProjectId,
    setActiveBillId,
    editorConfig,
    setEditorConfig,
    editFormData,
    setEditFormData,
    selectedItemIds,
    setSelectedItemIds,
    setIsEditorOpen,
    setIsPromptOpen,
    setIsAskingAiQuestions,
    setAiClarification,
    setIsAiLoading,
    setAiAnswers,
    setAiFiles,
    resetAiWorkflowFiles,
    setAiClarificationPhase,
    setPromptConfig,
    promptConfig,
    handleAiHierarchyGeneration,
    showToast,
    setAiSuggestions,
    setAiConversationHistory,
  } = params;

  const { askConfirm } = useConfirm();
  const [copiedBillItems, setCopiedBillItems] = useState<{ projectId: string; items: BoQItem[] } | null>(null);

  const openPrompt = useCallback(
    (type: PromptType, context?: Record<string, unknown>) => {
      setIsAskingAiQuestions(false);
      setAiClarification(null);
      setIsAiLoading(false);
      setAiAnswers('');
      resetAiWorkflowFiles();
      setAiClarificationPhase('items');
      let cfg = {
        type,
        context,
        title: '',
        placeholder: '',
        defaultValue: '',
        showStandardToggle: false,
        defaultStandard: (currentProject?.measurementStandard || 'SMM7') as 'SMM7' | 'NRM2',
      };
      switch (type) {
        case 'CREATE_PROJECT': cfg = { ...cfg, title: 'New Project', placeholder: 'Project Name' }; break;
        case 'ADD_BILL': cfg = { ...cfg, title: 'New Bill', placeholder: 'Bill Name' }; break;
        case 'RENAME_PROJECT': cfg = { ...cfg, title: 'Rename Project', placeholder: 'Project Name', defaultValue: (context as { name?: string })?.name || '' }; break;
        case 'ADD_SECTION': cfg = { ...cfg, title: 'New Section', placeholder: 'Section Name' }; break;
        case 'ADD_PAGE': cfg = { ...cfg, title: 'New Page', placeholder: 'Page Name (optional)' }; break;
        case 'RENAME_BILL': cfg = { ...cfg, title: 'Rename Bill', placeholder: 'Enter Name', defaultValue: (context as { name?: string })?.name || '' }; break;
        case 'RENAME_SECTION': cfg = { ...cfg, title: 'Rename Section', placeholder: 'Enter Name', defaultValue: (context as { name?: string })?.name || '' }; break;
        case 'RENAME_PAGE': cfg = { ...cfg, title: 'Rename Page', placeholder: 'Enter Name', defaultValue: (context as { name?: string })?.name || '' }; break;
        case 'CREATE_LIBRARY': cfg = { ...cfg, title: 'New Library', placeholder: 'Library Name (e.g. SMM7)' }; break;
        case 'RENAME_LIBRARY': cfg = { ...cfg, title: 'Rename Library', placeholder: 'Library name', defaultValue: (context as { name?: string })?.name || '' }; break;
        case 'CREATE_FOLDER': cfg = { ...cfg, title: 'New Folder', placeholder: 'Folder name (e.g. Demolition/Alteration)' }; break;
        case 'RENAME_FOLDER': cfg = { ...cfg, title: 'Rename Folder', placeholder: 'Folder name (e.g. Demolition/Alteration)', defaultValue: (context as { name?: string })?.name || '' }; break;
        case 'CREATE_LIB_SECTION': cfg = { ...cfg, title: (context as { parentSectionId?: string })?.parentSectionId ? 'New Subsection' : 'New Section', placeholder: (context as { parentSectionId?: string })?.parentSectionId ? 'Subsection name (e.g. Cavity barriers)' : 'Section name (e.g. Demolishing structures)' }; break;
        case 'RENAME_LIB_SECTION': cfg = { ...cfg, title: 'Rename Section', placeholder: 'Section name (e.g. Demolishing structures)', defaultValue: (context as { name?: string })?.name || '' }; break;
        case 'CREATE_LIB_PAGE': cfg = { ...cfg, title: 'New Page', placeholder: 'Page name (e.g. Whole structures)' }; break;
        case 'RENAME_LIB_PAGE': cfg = { ...cfg, title: 'Rename Page', placeholder: 'Page name (e.g. Whole structures)', defaultValue: (context as { name?: string })?.name || '' }; break;
        case 'CREATE_TRADE': cfg = { ...cfg, title: 'New Trade', placeholder: 'Trade Name' }; break;
        case 'ADD_CONTRACTOR': cfg = { ...cfg, title: 'Add Contractor', placeholder: 'Contractor Name' }; break;
        case 'AI_GENERATE_HIERARCHY':
          cfg = {
            ...cfg,
            title: 'AI Bill Generation',
            placeholder: 'Describe the work scope (e.g. Excavation and Concrete)...',
            defaultValue: typeof (context as { defaultValue?: unknown })?.defaultValue === 'string'
              ? (context as { defaultValue?: string }).defaultValue || ''
              : '',
            showStandardToggle: true,
          };
          break;
      }
      setPromptConfig(cfg);
      setIsPromptOpen(true);
    },
    [currentProject?.measurementStandard, setPromptConfig, setIsPromptOpen, setIsAskingAiQuestions, setAiClarification, setIsAiLoading, setAiAnswers, resetAiWorkflowFiles, setAiClarificationPhase]
  );

  const openEditor = useCallback(
    (billId: string | null, sectionId: string | null, item?: BoQItem | null, type?: ItemType, libId?: string, folderId?: string, libSectionId?: string, itemIdx?: number, pageId?: string | null, insertAfterItemId?: string | null) => {
      const activeItems = (() => {
        if (libId && folderId && libSectionId) {
          if (pageId) return (findLibraryPage(libraries, libId, folderId, libSectionId, pageId)?.items || []) as BoQItem[];
          return (findLibrarySection(libraries, libId, folderId, libSectionId)?.items || []) as BoQItem[];
        }
        if (!currentProject || !billId || libId) return [] as BoQItem[];
        const bill = currentProject.bills.find((entry) => entry.id === billId);
        if (!bill) return [] as BoQItem[];
        if (sectionId === '' || !sectionId) return bill.items || [];
        const section = bill.sections.find((entry) => entry.id === sectionId);
        if (!section) return [] as BoQItem[];
        if (pageId) return section.pages?.find((entry) => entry.id === pageId)?.items || [];
        return section.items || [];
      })();
      const highlightedItem = resolveHighlightedRow(activeItems, selectedItemIds, editorConfig.item?.id);
      const defaultInsertAfterItemId = insertAfterItemId !== undefined
        ? insertAfterItemId
        : item
        ? null
        : highlightedItem
          ? highlightedItem.id
          : (activeItems[activeItems.length - 1]?.id ?? null);

      setEditorConfig({
        billId,
        sectionId,
        pageId: pageId ?? undefined,
        item,
        type,
        insertAfterItemId: defaultInsertAfterItemId,
        libId,
        folderId,
        libSectionId,
        itemIdx,
      });
      let defaultUnit = '';
      if (item?.unit) defaultUnit = normalizeUnit(String(item.unit));
      else if (libId && folderId && libSectionId !== undefined && itemIdx !== undefined) {
        const libItem = findLibrarySection(libraries, libId, folderId, libSectionId)?.items[itemIdx];
        if (libItem?.unit) defaultUnit = normalizeUnit(String(libItem.unit));
      }
      if (!defaultUnit && ['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(type || item?.type || '')) defaultUnit = UnitType.NR;
      let init: EditFormState = {
        description: item?.description || '',
        unit: defaultUnit,
        quantity: item?.quantity ?? 0,
        quantityDecimals: item?.quantityDecimals ?? 0,
        rate: item?.rate ?? 0,
        reference: item?.reference || '',
        tradePackageId: item?.tradePackageId || '',
        dimensionRows: item?.dimensionRows ? [...item.dimensionRows] : [],
        rateBuildUp: normaliseRateBuildUp(item?.rateBuildUp),
        type: (item?.type || type || 'PRICED') as ItemType,
        aiLocks: {
          description: item?.aiLocks?.description ?? false,
          rate: item?.aiLocks?.rate ?? false,
          measurements: item?.aiLocks?.measurements ?? false,
        },
      };
      if (libId && folderId && libSectionId !== undefined && itemIdx !== undefined) {
        const libItem = pageId
          ? findLibraryPage(libraries, libId, folderId, libSectionId, pageId)?.items[itemIdx]
          : findLibrarySection(libraries, libId, folderId, libSectionId)?.items[itemIdx];
        if (libItem) {
          init = {
            ...init,
            description: libItem.description,
            unit: normalizeUnit(libItem.unit || defaultUnit),
            type: libItem.type,
            rate: libItem.rate,
            rateBuildUp: normaliseRateBuildUp(libItem.rateBuildUp),
            aiLocks: { description: false, rate: false, measurements: false },
          };
        }
      }
      setEditFormData(init);
        // Open the complete item page for both existing and new bill rows.
        setIsEditorOpen(true);
    },
    [currentProject, editorConfig.item?.id, libraries, selectedItemIds, setEditorConfig, setEditFormData, setIsEditorOpen]
  );

  const handlePromptSubmit = useCallback(
    async (value: string, standard?: 'SMM7' | 'NRM2', aiOptions?: AiGenerationOptions, meta?: PromptSubmitMeta) => {
      if (!value.trim()) return;
      const nowId = generateId();
      const parsedOrderableName = parseOrderableName(value);
      const resolvedOrderRef = meta?.orderRef?.trim() || parsedOrderableName.orderRef || undefined;
      const resolvedName = value.trim() || parsedOrderableName.name || value;
      const closePromptBeforeAsyncRefresh = [
        'CREATE_LIBRARY',
        'RENAME_LIBRARY',
        'CREATE_FOLDER',
        'RENAME_FOLDER',
        'CREATE_LIB_SECTION',
        'RENAME_LIB_SECTION',
        'CREATE_LIB_PAGE',
        'RENAME_LIB_PAGE',
      ].includes(promptConfig.type);
      if (closePromptBeforeAsyncRefresh) {
        setIsPromptOpen(false);
      }
      switch (promptConfig.type) {
        case 'AI_GENERATE_HIERARCHY': {
          const resolvedAiOptions: AiGenerationOptions = {
            includeRates: aiOptions?.includeRates ?? true,
            includeMeasurements: aiOptions?.includeMeasurements ?? false,
          };
          setIsPromptOpen(false);
          setIsAiLoading(true);
          resetAiWorkflowFiles();
          setAiClarificationPhase('items');
          setAiAnswers('');
          const { analyzeBoQRequest } = await loadGeminiService();
          const analysisResult = await analyzeBoQRequest(value, [], [], resolvedAiOptions, 'items');
          setIsAiLoading(false);
          if ('error' in analysisResult) {
            showToast({ type: 'error', message: analysisResult.error });
            return;
          }
          const analysis = analysisResult.data;
          if (analysis.needsClarification) {
            setAiConversationHistory?.([`Initial Request: ${value}`]);
            setAiClarification({
              needsClarification: true,
              phase: 'items',
              title: 'Phase 1 • Bill items',
              description: 'Use this phase for work scope, specification notes, and item descriptions. Drawings added here are only used for bill-item generation.',
              questions: analysis.questions,
              canSkip: true,
            });
            setPromptConfig((prev) => ({
              ...prev,
              defaultValue: value,
              context: { ...prev.context, standard, aiOptions: resolvedAiOptions, aiPhase: 'items' },
            }));
            setIsAskingAiQuestions(true);
          } else {
            await handleAiHierarchyGeneration(
              value,
              '',
              standard || currentProject?.measurementStandard || 'SMM7',
              [],
              [],
              resolvedAiOptions
            );
          }
          return;
        }
        case 'CREATE_PROJECT':
          if (meta?.projectAiSetup?.enabled) {
            const projectSetup = meta.projectAiSetup;
            if (!projectSetup.brief.trim()) {
              showToast({ type: 'info', message: 'Add the project brief first so AI can build the starter estimate.' });
              return;
            }

            setIsPromptOpen(false);
            setIsAiLoading(true);
            try {
              const { generateAiProjectSetup } = await loadGeminiService();
              const aiResult = await generateAiProjectSetup(
                value.trim(),
                projectSetup.brief,
                projectSetup.drawingBasis,
                projectSetup.conversation
              );

              if ('error' in aiResult) {
                showToast({ type: 'error', message: feedbackError('AI project setup', aiResult.error, 'Please refine the brief and try again.') });
                return;
              }

              const elementalItems = aiResult.data.costPlanLines
                .filter((line) => line.baseValue > 0)
                .map((line) => ({
                  id: generateId(),
                  type: 'PRICED' as const,
                  reference: '',
                  description: line.title,
                  unit: UnitType.SUM,
                  quantity: 1,
                  rate: line.baseValue,
                  total: line.baseValue,
                  dimensionRows: [],
                  aiLocks: { description: false, rate: false, measurements: false },
                  rateSource: line.confidenceLabel ? `AI_${line.confidenceLabel}` : 'AI_CONCEPT',
                }));

              const starterBills: BoQBill[] = elementalItems.length > 0
                ? [{
                    id: generateId(),
                    name: 'Elemental estimate',
                    billType: 'STANDARD',
                    houseTypeName: undefined,
                    houseTypeQuantity: 1,
                    sections: [{
                      id: generateId(),
                      name: 'Elemental cost plan allowances',
                      items: elementalItems,
                    }],
                    items: [],
                  }]
                : aiResult.data.bills.length > 0
                  ? aiResult.data.bills.map((bill) => ({
                      id: generateId(),
                      name: bill.name,
                      billType: 'STANDARD',
                      houseTypeName: undefined,
                      houseTypeQuantity: 1,
                      sections: bill.sections.map(createAiStarterSection),
                      items: [],
                    }))
                  : [{
                      id: generateId(),
                      name: 'Elemental estimate',
                      billType: 'STANDARD',
                      houseTypeName: undefined,
                      houseTypeQuantity: 1,
                      sections: [],
                      items: [],
                    }];

              const nextProject: Project = {
                id: nowId,
                name: value.trim(),
                client: '',
                location: [meta?.siteLocation?.county, meta?.siteLocation?.region].filter(Boolean).join(', '),
                siteCountry: meta?.siteLocation?.country || 'United Kingdom',
                siteRegion: meta?.siteLocation ? meta.siteLocation.region : 'Scotland',
                siteCounty: meta?.siteLocation ? meta.siteLocation.county : '',
                reference: buildNextEstimateReference(projects),
                updatedAt: new Date().toISOString(),
                bills: starterBills,
                ...buildNewProjectSettingsFromDefaults(appSettings),
              };

              const nextCostPlan = compileCostPlan(
                nextProject,
                'AI_CONCEPT',
                projectSetup.drawingBasis,
                getDefaultContingencyForDrawingBasis(projectSetup.drawingBasis),
                'SEPARATE',
                aiResult.data.costPlanLines,
                {
                  assumptions: aiResult.data.assumptions,
                  confidenceSummary: aiResult.data.confidenceSummary || aiResult.data.summary,
                }
              );

              const aiProject = {
                ...nextProject,
                costPlan: nextCostPlan,
              };

              setProjects((prev) => [...prev, aiProject]);
              setCurrentProjectId(aiProject.id);
              setActiveBillId(getPreferredBillId(aiProject));
              setIsEditorOpen(false);
              setEditorConfig({ billId: '', sectionId: '' });
              setIsAskingAiQuestions(false);
              setAiClarification(null);
              showToast({
                type: 'success',
                message: `AI starter estimate created with ${aiProject.bills.length} bill${aiProject.bills.length === 1 ? '' : 's'} and ${nextCostPlan.lines.filter((line) => line.baseValue > 0).length} cost plan line${nextCostPlan.lines.filter((line) => line.baseValue > 0).length === 1 ? '' : 's'}.`,
                duration: 3500,
              });
            } finally {
              setIsAiLoading(false);
            }
            break;
          }

          setProjects((prev) => {
            const updatedAt = new Date().toISOString();
            return [...prev, {
            id: nowId,
            name: value,
            client: '',
            location: [meta?.siteLocation?.county, meta?.siteLocation?.region].filter(Boolean).join(', '),
            siteCountry: meta?.siteLocation?.country || 'United Kingdom',
            siteRegion: meta?.siteLocation ? meta.siteLocation.region : 'Scotland',
            siteCounty: meta?.siteLocation ? meta.siteLocation.county : '',
            reference: buildNextEstimateReference(prev, updatedAt),
            updatedAt,
            bills: [],
            ...buildNewProjectSettingsFromDefaults(appSettings),
            }];
          });
          setCurrentProjectId(nowId);
          setActiveBillId(null);
          setIsEditorOpen(false);
          setEditorConfig({ billId: '', sectionId: '' });
          setIsAskingAiQuestions(false);
          setAiClarification(null);
          break;
        case 'ADD_BILL':
          if (currentProject) {
            updateProject(currentProject.id, {
              bills: [
                ...currentProject.bills,
                {
                  id: nowId,
                  name: value,
                  billType: 'STANDARD',
                  houseTypeName: undefined,
                  houseTypeQuantity: 1,
                  sections: [],
                  items: [],
                },
              ],
            });
            setActiveBillId(nowId);
          }
          break;
        case 'RENAME_PROJECT':
          if (currentProject) {
            updateProject(currentProject.id, { name: value });
          }
          break;
        case 'ADD_SECTION':
          if (currentProject) {
            const ctx = promptConfig.context as { billId?: string; afterSectionId?: string } | undefined;
            const targetBillId = ctx?.billId || activeBillId;
            if (!targetBillId) break;
            const nextBills = currentProject.bills.map((b) => {
              if (b.id !== targetBillId) return b;
              const sections = [...b.sections];
              const insertIndex = ctx?.afterSectionId
                ? sections.findIndex((section) => section.id === ctx.afterSectionId) + 1
                : sections.length;
              const boundedIndex = insertIndex > 0 ? Math.min(insertIndex, sections.length) : sections.length;
              sections.splice(boundedIndex, 0, { id: nowId, name: value, items: [] });
              return { ...b, sections };
            });
            updateProject(currentProject.id, { bills: nextBills });
          }
          break;
        case 'RENAME_BILL':
          if (currentProject && promptConfig.context?.id) {
            updateProject(currentProject.id, { bills: currentProject.bills.map((b) => (b.id === (promptConfig.context as { id: string }).id ? { ...b, name: value } : b)) });
          }
          break;
        case 'RENAME_SECTION':
          if (currentProject && activeBillId && promptConfig.context?.id) {
            updateProject(currentProject.id, { bills: currentProject.bills.map((b) => (b.id === activeBillId ? { ...b, sections: b.sections.map((s) => (s.id === (promptConfig.context as { id: string }).id ? { ...s, name: value } : s)) } : b)) });
          }
          break;
        case 'RENAME_PAGE':
          if (currentProject && promptConfig.context?.billId && promptConfig.context?.sectionId && promptConfig.context?.pageId) {
            const ctx = promptConfig.context as { billId: string; sectionId: string; pageId: string };
            updateProject(currentProject.id, {
              bills: currentProject.bills.map((bill) => (
                bill.id !== ctx.billId
                  ? bill
                  : {
                      ...bill,
                      sections: bill.sections.map((section) => (
                        section.id !== ctx.sectionId
                          ? section
                          : {
                              ...section,
                              pages: (section.pages || []).map((page) => (
                                page.id === ctx.pageId
                                  ? { ...page, name: value }
                                  : page
                              )),
                            }
                      )),
                    }
              )),
            });
          }
          break;
        case 'ADD_PAGE':
          if (currentProject && activeBillId && promptConfig.context?.billId && promptConfig.context?.sectionId) {
            const ctx = promptConfig.context as { billId: string; sectionId: string; afterPageId?: string };
            const pageNum = currentProject.bills.find((b) => b.id === ctx.billId)?.sections?.find((s) => s.id === ctx.sectionId)?.pages?.length ?? 0;
            const newPage = { id: nowId, name: value.trim() || `Page ${String(pageNum + 1).padStart(2, '0')}`, items: [] };
            const nextBills = currentProject.bills.map((b) => {
              if (b.id !== ctx.billId) return b;
              return {
                ...b,
                sections: b.sections.map((s) => {
                  if (s.id !== ctx.sectionId) return s;
                  const pages = [...(s.pages || [])];
                  if (pages.length === 0 && s.items.length > 0) {
                    pages.push({ id: nowId, name: value.trim() || 'Page 01', items: [...s.items] });
                    return { ...s, items: [], pages };
                  }
                  const insertIndex = ctx.afterPageId
                    ? pages.findIndex((page) => page.id === ctx.afterPageId) + 1
                    : pages.length;
                  const boundedIndex = insertIndex > 0 ? Math.min(insertIndex, pages.length) : pages.length;
                  pages.splice(boundedIndex, 0, newPage);
                  return { ...s, pages };
                }),
              };
            });
            const billIndex = nextBills.findIndex((b) => b.id === ctx.billId);
            if (billIndex !== -1) nextBills[billIndex] = reindexBillReferences(nextBills[billIndex], billIndex);
            updateProject(currentProject.id, { bills: nextBills });
          }
          break;
        case 'CREATE_LIBRARY':
          setLibraries(await createLibrary({ id: nowId, name: value, folders: [] }));
          break;
        case 'RENAME_LIBRARY':
          if (promptConfig.context?.libId) {
            setLibraries(await renameLibrary((promptConfig.context as { libId: string }).libId, value.trim() || value));
          }
          break;
        case 'CREATE_FOLDER':
          if (promptConfig.context?.libId) {
            setLibraries(await createFolder((promptConfig.context as { libId: string }).libId, { id: nowId, orderRef: resolvedOrderRef, name: resolvedName, sections: [] }));
          }
          break;
        case 'RENAME_FOLDER':
          if (promptConfig.context?.libId && promptConfig.context?.folderId) {
            const ctx = promptConfig.context as { libId: string; folderId: string };
            void ctx.libId;
            setLibraries(await renameFolder(ctx.folderId, resolvedOrderRef, resolvedName));
          }
          break;
        case 'CREATE_LIB_SECTION':
          if (promptConfig.context?.libId && promptConfig.context?.folderId) {
            const ctx = promptConfig.context as { libId: string; folderId: string; parentSectionId?: string | null };
            const parentSectionId = ctx.parentSectionId ?? null;
            setLibraries(await createSection(ctx.libId, ctx.folderId, { id: nowId, parentSectionId, orderRef: resolvedOrderRef, name: resolvedName, items: [], pages: [] }));
          }
          break;
        case 'RENAME_LIB_SECTION':
          if (promptConfig.context?.libId && promptConfig.context?.folderId && promptConfig.context?.sectionId) {
            const ctx = promptConfig.context as { libId: string; folderId: string; sectionId: string };
            void ctx.libId;
            void ctx.folderId;
            setLibraries(await renameSection(ctx.sectionId, resolvedOrderRef, resolvedName));
          }
          break;
        case 'CREATE_LIB_PAGE':
          if (promptConfig.context?.libId && promptConfig.context?.folderId && promptConfig.context?.sectionId) {
            const ctx = promptConfig.context as { libId: string; folderId: string; sectionId: string };
            const section = findLibrarySection(libraries, ctx.libId, ctx.folderId, ctx.sectionId);
            const pageCount = section?.pages?.length ?? 0;
            setLibraries(await createPage(ctx.libId, ctx.folderId, ctx.sectionId, {
              id: nowId,
              orderRef: resolvedOrderRef,
              name: resolvedName || `Page ${String(pageCount + 1).padStart(2, '0')}`,
              items: [],
            }));
          }
          break;
        case 'RENAME_LIB_PAGE':
          if (promptConfig.context?.libId && promptConfig.context?.folderId && promptConfig.context?.sectionId && promptConfig.context?.pageId) {
            const ctx = promptConfig.context as { libId: string; folderId: string; sectionId: string; pageId: string };
            void ctx.libId;
            void ctx.folderId;
            void ctx.sectionId;
            setLibraries(await renamePage(ctx.pageId, resolvedOrderRef, resolvedName));
          }
          break;
        case 'CREATE_TRADE':
          setTrades((prev) => [...prev, { id: nowId, name: value, contractors: [] }]);
          break;
        case 'ADD_CONTRACTOR':
          if (promptConfig.context?.tradeId) {
            setTrades((prev) => prev.map((t) => (t.id === (promptConfig.context as { tradeId: string }).tradeId ? { ...t, contractors: [...t.contractors, { id: nowId, name: value, address: '', email: '' }] } : t)));
          }
          break;
      }
      setIsPromptOpen(false);
    },
    [promptConfig, currentProject, activeBillId, appSettings, updateProject, setProjects, setLibraries, setTrades, setCurrentProjectId, setActiveBillId, setIsPromptOpen, setIsEditorOpen, setEditorConfig, setIsAskingAiQuestions, setAiClarification, setIsAiLoading, setAiAnswers, resetAiWorkflowFiles, setAiClarificationPhase, setPromptConfig, handleAiHierarchyGeneration]
  );

  const saveEditorItem = useCallback(async (continueAdding = false) => {
      const { billId, sectionId, pageId, item, type, insertAfterItemId, libId, folderId, libSectionId, itemIdx } = editorConfig;
    const newItem = applyRateBuildUp({
      ...(item || {}),
      id: item?.id || generateId(),
      type: (type || item?.type || 'PRICED') as ItemType,
      ...editFormData,
      unit: normalizeUnit(editFormData.unit),
      total: safeMul(editFormData.quantity, editFormData.rate),
      ...(item && editFormData.rate !== item.rate
        ? { liveRateEvidence: undefined, rateSource: item.rateSource === 'AI_LIVE' ? undefined : item.rateSource }
        : {}),
    } as BoQItem);
    if (libId && folderId && libSectionId !== undefined) {
      await upsertLibraryItem({ libraryId: libId, folderId, sectionId: libSectionId, pageId }, newItem, itemIdx);
    } else if (currentProject && billId) {
      if (sectionId === '' || !sectionId) {
        const updatedBills = updateBillItems(currentProject, billId, (items) => (
          item ? items.map((i) => (i.id === item.id ? newItem : i)) : insertItemAtPosition(items, newItem, insertAfterItemId)
        ));
        updateProject(currentProject.id, { bills: updatedBills });
      } else if (pageId) {
        const updatedBills = updateBillSectionPageItems(currentProject, billId, sectionId, pageId, (items) => (
          item ? items.map((i) => (i.id === item.id ? newItem : i)) : insertItemAtPosition(items, newItem, insertAfterItemId)
        ));
        updateProject(currentProject.id, { bills: updatedBills });
      } else {
        const updatedBills = updateBillSectionItems(currentProject, billId, sectionId, (items) => (
          item ? items.map((i) => (i.id === item.id ? newItem : i)) : insertItemAtPosition(items, newItem, insertAfterItemId)
        ));
        updateProject(currentProject.id, { bills: updatedBills });
      }
    }
    if (continueAdding && billId && !libId && !item) {
      const nextType = getContinuationItemType(newItem.type as ItemType);
      const nextUnit = COMMERCIAL_ITEM_TYPES.includes(nextType) ? UnitType.NR : '';
      setEditorConfig((prev) => ({
        ...prev,
        item: undefined,
        type: nextType,
        insertAfterItemId: newItem.id,
      }));
      setEditFormData({
        description: '',
        unit: nextUnit,
        quantity: 0,
        quantityDecimals: 0,
        rate: 0,
        reference: '',
        tradePackageId: COMMERCIAL_ITEM_TYPES.includes(nextType) ? editFormData.tradePackageId : '',
        dimensionRows: [],
        rateBuildUp: undefined,
        type: nextType,
        aiLocks: {
          description: false,
          rate: false,
          measurements: false,
        },
      });
      return;
    }
    setIsEditorOpen(false);
    if (billId && !editorConfig.libId) setEditorConfig({ billId: '', sectionId: '', pageId: undefined });
  }, [editorConfig, editFormData, currentProject, setLibraries, updateProject, setIsEditorOpen, setEditorConfig, setEditFormData]);

  const handleSaveItem = useCallback(() => {
    void saveEditorItem(false);
  }, [saveEditorItem]);

  const handleSaveItemAndContinue = useCallback(() => {
    void saveEditorItem(true);
  }, [saveEditorItem]);

  const handleSaveMultipleItems = useCallback(
    (newItems: BoQItem[], continueAdding = false) => {
      const { billId, sectionId, pageId, item, libId, folderId, libSectionId, itemIdx } = editorConfig;
      if (libId && folderId && libSectionId !== undefined) {
        void appendLibraryItems({ libraryId: libId, folderId, sectionId: libSectionId, pageId }, newItems);
      } else if (currentProject && billId) {
        const doUpdate = (items: BoQItem[]) => {
          if (item) {
            const idx = items.findIndex((i) => i.id === item.id);
            if (idx !== -1) {
              const next = [...items];
              next.splice(idx, 1, ...newItems);
              return next;
            }
          }
          return [...items, ...newItems];
        };
        if (sectionId === '' || !sectionId) {
          const updatedBills = updateBillItems(currentProject, billId, doUpdate);
          updateProject(currentProject.id, { bills: updatedBills });
        } else if (pageId) {
          const updatedBills = updateBillSectionPageItems(currentProject, billId, sectionId, pageId, doUpdate);
          updateProject(currentProject.id, { bills: updatedBills });
        } else {
          const updatedBills = updateBillSectionItems(currentProject, billId, sectionId, doUpdate);
          updateProject(currentProject.id, { bills: updatedBills });
        }
      }
      if (continueAdding && billId && !libId && !item) {
        const lastItem = newItems[newItems.length - 1];
        setEditorConfig((prev) => ({
          ...prev,
          item: undefined,
          type: (prev.type || 'PRICED') as ItemType,
          insertAfterItemId: lastItem?.id ?? prev.insertAfterItemId ?? null,
        }));
        setEditFormData((prev) => ({
          ...prev,
          description: '',
          rate: 0,
          quantity: 0,
          dimensionRows: [],
        }));
        return;
      }
      setIsEditorOpen(false);
    },
    [editorConfig, currentProject, setLibraries, updateProject, setIsEditorOpen]
  );

  const handleBatchAssign = useCallback(
    (tradeId: string) => {
      if (!currentProject || !activeBillId) return;
      const bill = currentProject.bills.find((b) => b.id === activeBillId);
      if (!bill) return;
      updateProject(currentProject.id, {
        bills: currentProject.bills.map((b) => {
          if (b.id !== activeBillId) return b;
          if ((b.sections || []).length === 0) {
            return { ...b, items: (b.items || []).map((i) => (selectedItemIds.has(i.id) && isCommercialItem(i) ? { ...i, tradePackageId: tradeId } : i)) };
          }
          return {
            ...b,
            sections: b.sections.map((s) => {
              if (s.pages && s.pages.length > 0) {
                return {
                  ...s,
                  pages: s.pages.map((p) => ({
                    ...p,
                    items: (p.items || []).map((i) =>
                      selectedItemIds.has(i.id) && isCommercialItem(i) ? { ...i, tradePackageId: tradeId } : i
                    ),
                  })),
                };
              }
              return {
                ...s,
                items: s.items.map((i) =>
                  selectedItemIds.has(i.id) && isCommercialItem(i) ? { ...i, tradePackageId: tradeId } : i
                ),
              };
            }),
          };
        }),
      });
      setSelectedItemIds(new Set());
    },
    [currentProject, activeBillId, selectedItemIds, updateProject, setSelectedItemIds]
  );

  const handleDuplicateSelectedItems = useCallback(
    () => {
      if (!currentProject || !activeBillId || selectedItemIds.size === 0) return;
      const selectedIds = new Set(selectedItemIds);
      const source = currentProject.bills.find((bill) => bill.id === activeBillId);
      const items = getBillItems(source).filter((item) => selectedIds.has(item.id));
      if (items.length === 0) {
        showToast({ type: 'info', message: 'No selected rows were found in the active bill.' });
        setSelectedItemIds(new Set());
        return;
      }
      setCopiedBillItems({ projectId: currentProject.id, items: items.map((item) => ({ ...item, dimensionRows: (item.dimensionRows || []).map((row) => ({ ...row })) })) });
      setSelectedItemIds(new Set());
      showToast({
        type: 'info',
        message: `Copied ${items.length} row${items.length === 1 ? '' : 's'}. Tick one destination row, then Paste to duplicate below it.`,
        duration: 2500,
      });
    },
    [activeBillId, currentProject, selectedItemIds, setSelectedItemIds, showToast]
  );

  const handlePasteCopiedItems = useCallback(
    () => {
      if (!currentProject || !activeBillId || !copiedBillItems || copiedBillItems.projectId !== currentProject.id) return;
      if (selectedItemIds.size !== 1) {
        showToast({ type: 'info', message: 'Tick one destination row to paste the copied rows below it.' });
        return;
      }
      const targetId = Array.from(selectedItemIds)[0];
      const billIndex = currentProject.bills.findIndex((bill) => bill.id === activeBillId);
      if (billIndex < 0) return;
      let pasted = false;
      const pasteAfterTarget = (items: BoQItem[]) => {
        const index = items.findIndex((item) => item.id === targetId);
        if (index < 0) return items;
        pasted = true;
        return [
          ...items.slice(0, index + 1),
          ...copiedBillItems.items.map(cloneBillItemForDuplicate),
          ...items.slice(index + 1),
        ];
      };
      const nextBills = currentProject.bills.map((bill, index) => {
        if (index !== billIndex) return bill;
        return reindexBillReferences({
          ...bill,
          items: pasteAfterTarget(bill.items || []),
          sections: (bill.sections || []).map((section) => ({
            ...section,
            items: pasteAfterTarget(section.items || []),
            pages: section.pages?.map((page) => ({ ...page, items: pasteAfterTarget(page.items || []) })),
          })),
        }, index);
      });
      if (!pasted) {
        showToast({ type: 'info', message: 'The selected destination row is not in the current bill.' });
        return;
      }
      updateProject(currentProject.id, { bills: nextBills });
      setSelectedItemIds(new Set());
      showToast({ type: 'success', message: `Pasted ${copiedBillItems.items.length} row${copiedBillItems.items.length === 1 ? '' : 's'} below the selected row.` });
    },
    [activeBillId, copiedBillItems, currentProject, selectedItemIds, setSelectedItemIds, showToast, updateProject]
  );

  const handleDeleteSelectedItems = useCallback(
    async () => {
      if (!currentProject || !activeBillId || selectedItemIds.size === 0) return;
      const selectedIds = new Set(selectedItemIds);
      const bill = currentProject.bills.find((entry) => entry.id === activeBillId);
      const selectedCount = getBillItems(bill).filter((item) => selectedIds.has(item.id)).length;
      if (selectedCount === 0) {
        setSelectedItemIds(new Set());
        return;
      }

      const ok = await askConfirm({
        title: 'Delete selected rows',
        message: `Delete ${selectedCount} selected bill row${selectedCount === 1 ? '' : 's'}? This removes headings, comments, and priced items that are selected.`,
        confirmLabel: 'Delete rows',
        cancelLabel: 'Cancel',
        variant: 'danger',
      });
      if (!ok) return;

      const nextBills = currentProject.bills.map((entry, index) => {
        if (entry.id !== activeBillId) return entry;
        const updatedBill: BoQBill = (entry.sections || []).length === 0
          ? {
              ...entry,
              items: (entry.items || []).filter((item) => !selectedIds.has(item.id)),
            }
          : {
              ...entry,
              sections: entry.sections.map((section) => (
                section.pages?.length
                  ? {
                      ...section,
                      pages: section.pages.map((page) => ({
                        ...page,
                        items: (page.items || []).filter((item) => !selectedIds.has(item.id)),
                      })),
                    }
                  : {
                      ...section,
                      items: (section.items || []).filter((item) => !selectedIds.has(item.id)),
                    }
              )),
            };
        return reindexBillReferences(updatedBill, index);
      });

      updateProject(currentProject.id, { bills: nextBills });
      setSelectedItemIds(new Set());
      recordBillAuditEntry({
        project: currentProject,
        billId: activeBillId,
        subject: 'Deleted selected bill rows',
        message: `Deleted ${selectedCount} selected bill row${selectedCount === 1 ? '' : 's'}.`,
        items: selectedCount,
      });
      showToast({
        type: 'success',
        message: `Deleted ${selectedCount} selected row${selectedCount === 1 ? '' : 's'}.`,
        duration: 2500,
      });
    },
    [activeBillId, askConfirm, currentProject, selectedItemIds, setSelectedItemIds, showToast, updateProject]
  );

  const handleClearSelectedValues = useCallback(
    async (mode: ClearValuesMode) => {
      if (!currentProject || !activeBillId || selectedItemIds.size === 0) return;
      const selectedIds = new Set(selectedItemIds);
      const bill = currentProject.bills.find((entry) => entry.id === activeBillId);
      const pricedCount = getBillItems(bill).filter((item) => selectedIds.has(item.id) && isCommercialItem(item)).length;
      if (pricedCount === 0) {
        showToast({ type: 'info', message: 'No priced rows are selected.' });
        return;
      }
      const labels = getClearValuesLabels(mode);
      const ok = await askConfirm({
        title: `${labels.title} on selected rows`,
        message: `Clear ${labels.action} and reset totals to 0 for ${pricedCount} selected priced item${pricedCount === 1 ? '' : 's'}? Descriptions, references, units, trade assignments, and ${labels.kept} will be kept.`,
        confirmLabel: 'Clear values',
        cancelLabel: 'Cancel',
        variant: 'danger',
      });
      if (!ok) return;

      const clearSelected = (items: BoQItem[]) => items.map((item) => (
        selectedIds.has(item.id) ? clearCommercialValues(item, mode) : item
      ));
      const nextBills = currentProject.bills.map((entry, index) => {
        if (entry.id !== activeBillId) return entry;
        const updatedBill: BoQBill = (entry.sections || []).length === 0
          ? {
              ...entry,
              items: clearSelected(entry.items || []),
            }
          : {
              ...entry,
              sections: entry.sections.map((section) => (
                section.pages?.length
                  ? {
                      ...section,
                      pages: section.pages.map((page) => ({
                        ...page,
                        items: clearSelected(page.items || []),
                      })),
                    }
                  : {
                      ...section,
                      items: clearSelected(section.items || []),
                    }
              )),
            };
        return reindexBillReferences(updatedBill, index);
      });

      updateProject(currentProject.id, { bills: nextBills });
      recordBillAuditEntry({
        project: currentProject,
        billId: activeBillId,
        subject: `${labels.title} on selected rows`,
        message: `Cleared ${labels.result} on ${pricedCount} selected priced item${pricedCount === 1 ? '' : 's'}.`,
        items: pricedCount,
      });
      showToast({ type: 'success', message: `Cleared ${labels.result} on ${pricedCount} selected item${pricedCount === 1 ? '' : 's'}.`, duration: 2500 });
    },
    [activeBillId, askConfirm, currentProject, selectedItemIds, showToast, updateProject]
  );

  const handleSingleItemTradeAssign = useCallback(
    (itemId: string, tradeId: string) => {
      if (!currentProject || !activeBillId) return;
      updateProject(currentProject.id, {
        bills: currentProject.bills.map((b) => {
          if (b.id !== activeBillId) return b;
          if ((b.sections || []).length === 0) {
            return {
              ...b,
              items: (b.items || []).map((i) => (i.id === itemId ? { ...i, tradePackageId: tradeId } : i)),
            };
          }
          return {
            ...b,
            sections: b.sections.map((s) => {
              if (s.pages && s.pages.length > 0) {
                return {
                  ...s,
                  pages: s.pages.map((p) => ({
                    ...p,
                    items: (p.items || []).map((i) => (i.id === itemId ? { ...i, tradePackageId: tradeId } : i)),
                  })),
                };
              }
              return {
                ...s,
                items: s.items.map((i) => (i.id === itemId ? { ...i, tradePackageId: tradeId } : i)),
              };
            }),
          };
        }),
      });
    },
    [currentProject, activeBillId, updateProject]
  );

  const handleBillTradeAssign = useCallback(
    async (billId: string, tradeId: string) => {
      if (!currentProject) return;
      const bill = currentProject.bills.find((entry) => entry.id === billId);
      if (!bill) return;

      const billItems = bill.sections.length === 0
        ? (bill.items || [])
        : bill.sections.flatMap((section) => (
            section.pages?.length
              ? section.pages.flatMap((page) => page.items || [])
              : section.items
          ));
      const pricedCount = billItems.filter((item) => ['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(item.type)).length;
      const ok = await askConfirm({
        title: 'Assign trade to bill',
        message: pricedCount > 0
          ? `Assign this trade package to all ${pricedCount} priced item${pricedCount === 1 ? '' : 's'} in "${bill.name}"? Existing trade assignments in that bill will be replaced.`
          : `Assign this trade package to "${bill.name}"?`,
        confirmLabel: 'Assign',
        cancelLabel: 'Cancel',
        variant: 'default',
      });
      if (!ok) return;

      updateProject(currentProject.id, {
        bills: currentProject.bills.map((entry) => {
          if (entry.id !== billId) return entry;
          if ((entry.sections || []).length === 0) {
            return {
              ...entry,
              items: (entry.items || []).map((item) => (
                ['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(item.type)
                  ? { ...item, tradePackageId: tradeId }
                  : item
              )),
            };
          }
          return {
            ...entry,
            sections: entry.sections.map((section) => {
              if (section.pages?.length) {
                return {
                  ...section,
                  pages: section.pages.map((page) => ({
                    ...page,
                    items: (page.items || []).map((item) => (
                      ['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(item.type)
                        ? { ...item, tradePackageId: tradeId }
                        : item
                    )),
                  })),
                };
              }
              return {
                ...section,
                items: section.items.map((item) => (
                  ['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(item.type)
                    ? { ...item, tradePackageId: tradeId }
                    : item
                )),
              };
            }),
          };
        }),
      });
    },
    [askConfirm, currentProject, updateProject]
  );

  const handleSectionTradeAssign = useCallback(
    async (billId: string, sectionId: string, tradeId: string) => {
      if (!currentProject) return;
      const bill = currentProject.bills.find((b) => b.id === billId);
      const section = bill?.sections.find((s) => s.id === sectionId);
      const sectionItems = section
        ? section.pages && section.pages.length > 0
          ? section.pages.flatMap((page) => page.items || [])
          : section.items
        : [];
      const pricedCount = sectionItems.filter((item) => ['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(item.type)).length;
      const ok = await askConfirm({
        title: 'Assign trade to section',
        message: pricedCount > 0
          ? `Assign this trade package to all ${pricedCount} priced item${pricedCount === 1 ? '' : 's'} in "${section?.name || 'this section'}"? Existing trade assignments in that section will be replaced.`
          : `Assign this trade package to "${section?.name || 'this section'}"?`,
        confirmLabel: 'Assign',
        cancelLabel: 'Cancel',
        variant: 'default',
      });
      if (ok) {
        updateProject(currentProject.id, {
          bills: currentProject.bills.map((b) => {
            if (b.id !== billId) return b;
            return {
              ...b,
              sections: b.sections.map((s) => {
                if (s.id !== sectionId) return s;
                if (s.pages && s.pages.length > 0) {
                  return {
                    ...s,
                    pages: s.pages.map((p) => ({
                      ...p,
                      items: (p.items || []).map((i) => (['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(i.type) ? { ...i, tradePackageId: tradeId } : i)),
                    })),
                  };
                }
                return { ...s, items: s.items.map((i) => (['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(i.type) ? { ...i, tradePackageId: tradeId } : i)) };
              }),
            };
          }),
        });
      }
    },
    [currentProject, updateProject, askConfirm]
  );

  const handlePageTradeAssign = useCallback(
    async (billId: string, sectionId: string, pageId: string, tradeId: string) => {
      if (!currentProject) return;
      const bill = currentProject.bills.find((entry) => entry.id === billId);
      const section = bill?.sections.find((entry) => entry.id === sectionId);
      const page = section?.pages?.find((entry) => entry.id === pageId);
      const pricedCount = (page?.items || []).filter((item) => ['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(item.type)).length;
      const ok = await askConfirm({
        title: 'Assign trade to page',
        message: pricedCount > 0
          ? `Assign this trade package to all ${pricedCount} priced item${pricedCount === 1 ? '' : 's'} on "${page?.name || 'this page'}"? Existing trade assignments on that page will be replaced.`
          : `Assign this trade package to "${page?.name || 'this page'}"?`,
        confirmLabel: 'Assign',
        cancelLabel: 'Cancel',
        variant: 'default',
      });
      if (!ok) return;

      updateProject(currentProject.id, {
        bills: currentProject.bills.map((entry) => {
          if (entry.id !== billId) return entry;
          return {
            ...entry,
            sections: entry.sections.map((sectionEntry) => {
              if (sectionEntry.id !== sectionId) return sectionEntry;
              return {
                ...sectionEntry,
                pages: (sectionEntry.pages || []).map((pageEntry) => (
                  pageEntry.id !== pageId
                    ? pageEntry
                    : {
                        ...pageEntry,
                        items: (pageEntry.items || []).map((item) => (
                          ['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(item.type)
                            ? { ...item, tradePackageId: tradeId }
                            : item
                        )),
                      }
                )),
              };
            }),
          };
        }),
      });
    },
    [askConfirm, currentProject, updateProject]
  );

  const handleDeleteItem = useCallback(
    async (sectionId: string, itemId: string, pageId?: string | null) => {
      if (!activeBill || !currentProject) return;
      const targetSection = currentProject.bills
        .find((bill) => bill.id === activeBill.id)
        ?.sections.find((section) => section.id === sectionId);
      const targetItem = sectionId === '' || !sectionId
        ? (activeBill.items || []).find((item) => item.id === itemId)
        : pageId
          ? targetSection?.pages?.find((page) => page.id === pageId)?.items.find((item) => item.id === itemId)
          : targetSection?.items.find((item) => item.id === itemId);
      const ok = await askConfirm({
        title: 'Delete item',
        message: `Delete "${targetItem?.description || 'this item'}"? This action cannot be undone.`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        variant: 'danger',
      });
      if (!ok) return;
      if (sectionId === '' || !sectionId) {
        const updatedBills = updateBillItems(currentProject, activeBill.id, (items) => items.filter((i) => i.id !== itemId));
        updateProject(currentProject.id, { bills: updatedBills });
      } else if (pageId) {
        const updatedBills = updateBillSectionPageItems(currentProject, activeBill.id, sectionId, pageId, (items) => items.filter((i) => i.id !== itemId));
        updateProject(currentProject.id, { bills: updatedBills });
      } else {
        const updatedBills = updateBillSectionItems(currentProject, activeBill.id, sectionId, (items) => items.filter((i) => i.id !== itemId));
        updateProject(currentProject.id, { bills: updatedBills });
      }
      recordBillAuditEntry({
        project: currentProject,
        billId: activeBill.id,
        sectionId,
        pageId,
        subject: 'Deleted bill row',
        message: `Deleted "${targetItem?.description || 'this item'}".`,
        items: 1,
      });
    },
    [activeBill, currentProject, updateProject, askConfirm]
  );

  const handleDeleteSection = useCallback(
    async (billId: string, sectionId: string) => {
      if (!currentProject) return;
      const billToDeleteFrom = currentProject.bills.find((bill) => bill.id === billId);
      const targetSection = billToDeleteFrom?.sections.find((section) => section.id === sectionId);
      const sectionItemCount = targetSection
        ? (targetSection.pages && targetSection.pages.length > 0
          ? targetSection.pages.flatMap((page) => page.items || []).length
          : targetSection.items.length)
        : 0;
      const ok = await askConfirm({
        title: 'Delete section',
        message: `Delete "${targetSection?.name || 'this section'}" and its ${sectionItemCount} item${sectionItemCount === 1 ? '' : 's'}? This action cannot be undone.`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        variant: 'danger',
      });
      if (!ok) return;

      const bills = currentProject.bills;
      const billIndex = bills.findIndex((b) => b.id === billId);
      if (billIndex === -1) return;

      const targetBill = bills[billIndex];
      const updatedBill: BoQBill = {
        ...targetBill,
        sections: targetBill.sections.filter((s) => s.id !== sectionId),
      };

      const reindexedBill = reindexBillReferences(updatedBill, billIndex);
      const nextBills = bills.map((b, idx) => (idx === billIndex ? reindexedBill : b));
      updateProject(currentProject.id, { bills: nextBills });
      recordBillAuditEntry({
        project: currentProject,
        billId,
        sectionId,
        subject: 'Deleted bill section',
        message: `Deleted section "${targetSection?.name || 'this section'}" and ${sectionItemCount} row${sectionItemCount === 1 ? '' : 's'}.`,
        items: sectionItemCount,
      });
    },
    [currentProject, updateProject, askConfirm]
  );

  const handleDeletePage = useCallback(
    async (billId: string, sectionId: string, pageId: string) => {
      if (!currentProject) return;
      const bill = currentProject.bills.find((entry) => entry.id === billId);
      const section = bill?.sections.find((entry) => entry.id === sectionId);
      const page = section?.pages?.find((entry) => entry.id === pageId);
      const pageName = page?.name?.trim() || 'this page';
      const pageItemCount = page?.items?.length || 0;

      const ok = await askConfirm({
        title: 'Delete page',
        message: `Delete "${pageName}" and its ${pageItemCount} item${pageItemCount === 1 ? '' : 's'}? This action cannot be undone.`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        variant: 'danger',
      });
      if (!ok) return;

      const bills = currentProject.bills;
      const billIndex = bills.findIndex((entry) => entry.id === billId);
      if (billIndex === -1) return;

      const updatedBill: BoQBill = {
        ...bills[billIndex],
        sections: bills[billIndex].sections.map((entry) => (
          entry.id !== sectionId
            ? entry
            : {
                ...entry,
                pages: (entry.pages || []).filter((pageEntry) => pageEntry.id !== pageId),
              }
        )),
      };

      const reindexedBill = reindexBillReferences(updatedBill, billIndex);
      const nextBills = bills.map((entry, index) => (index === billIndex ? reindexedBill : entry));
      updateProject(currentProject.id, { bills: nextBills });
      recordBillAuditEntry({
        project: currentProject,
        billId,
        sectionId,
        pageId,
        subject: 'Deleted bill page',
        message: `Deleted page "${pageName}" and ${pageItemCount} row${pageItemCount === 1 ? '' : 's'}.`,
        items: pageItemCount,
      });
    },
    [currentProject, updateProject, askConfirm]
  );

  const handleClearPageValues = useCallback(
    async (billId: string, sectionId: string, pageId: string, mode: ClearValuesMode) => {
      if (!currentProject) return;
      const bill = currentProject.bills.find((entry) => entry.id === billId);
      const section = bill?.sections.find((entry) => entry.id === sectionId);
      const page = section?.pages?.find((entry) => entry.id === pageId);
      const pricedCount = countCommercialItems(page?.items || []);
      const pageName = page?.name?.trim() || 'this page';
      const labels = getClearValuesLabels(mode);
      const ok = await askConfirm({
        title: `${labels.title} on page`,
        message: `Clear ${labels.action} and reset totals to 0 for ${pricedCount} priced item${pricedCount === 1 ? '' : 's'} on "${pageName}"? Descriptions, references, units, trade assignments, and ${labels.kept} will be kept.`,
        confirmLabel: 'Clear values',
        cancelLabel: 'Cancel',
        variant: 'danger',
      });
      if (!ok) return;

      const updatedBills = updateBillSectionPageItems(currentProject, billId, sectionId, pageId, (items) => items.map((item) => clearCommercialValues(item, mode)));
      updateProject(currentProject.id, { bills: updatedBills });
      recordBillAuditEntry({
        project: currentProject,
        billId,
        sectionId,
        pageId,
        subject: `${labels.title} on page`,
        message: `Cleared ${labels.result} on "${pageName}".`,
        items: pricedCount,
      });
      showToast({ type: 'success', message: `Cleared ${labels.result} on "${pageName}".`, duration: 2500 });
    },
    [askConfirm, currentProject, showToast, updateProject]
  );

  const handleClearSectionValues = useCallback(
    async (billId: string, sectionId: string, mode: ClearValuesMode) => {
      if (!currentProject) return;
      const bill = currentProject.bills.find((entry) => entry.id === billId);
      const section = bill?.sections.find((entry) => entry.id === sectionId);
      const pricedCount = countCommercialItems(getSectionItems(section));
      const sectionName = section?.name?.trim() || 'this section';
      const labels = getClearValuesLabels(mode);
      const ok = await askConfirm({
        title: `${labels.title} in section`,
        message: `Clear ${labels.action} and reset totals to 0 for ${pricedCount} priced item${pricedCount === 1 ? '' : 's'} in "${sectionName}"? Descriptions, references, units, trade assignments, and ${labels.kept} will be kept.`,
        confirmLabel: 'Clear values',
        cancelLabel: 'Cancel',
        variant: 'danger',
      });
      if (!ok) return;

      const nextBills = currentProject.bills.map((entry) => {
        if (entry.id !== billId) return entry;
        return {
          ...entry,
          sections: entry.sections.map((sectionEntry) => {
            if (sectionEntry.id !== sectionId) return sectionEntry;
            if (sectionEntry.pages?.length) {
              return {
                ...sectionEntry,
                pages: sectionEntry.pages.map((page) => ({
                  ...page,
                  items: (page.items || []).map((item) => clearCommercialValues(item, mode)),
                })),
              };
            }
            return {
              ...sectionEntry,
              items: sectionEntry.items.map((item) => clearCommercialValues(item, mode)),
            };
          }),
        };
      });
      updateProject(currentProject.id, { bills: nextBills });
      recordBillAuditEntry({
        project: currentProject,
        billId,
        sectionId,
        subject: `${labels.title} in section`,
        message: `Cleared ${labels.result} in "${sectionName}".`,
        items: pricedCount,
      });
      showToast({ type: 'success', message: `Cleared ${labels.result} in "${sectionName}".`, duration: 2500 });
    },
    [askConfirm, currentProject, showToast, updateProject]
  );

  const handleClearBillValues = useCallback(
    async (billId: string, mode: ClearValuesMode) => {
      if (!currentProject) return;
      const bill = currentProject.bills.find((entry) => entry.id === billId);
      const pricedCount = countCommercialItems(getBillItems(bill));
      const billName = bill?.name?.trim() || 'this bill';
      const labels = getClearValuesLabels(mode);
      const ok = await askConfirm({
        title: `${labels.title} in bill`,
        message: `Clear ${labels.action} and reset totals to 0 for ${pricedCount} priced item${pricedCount === 1 ? '' : 's'} in "${billName}"? Descriptions, references, units, trade assignments, and ${labels.kept} will be kept.`,
        confirmLabel: 'Clear values',
        cancelLabel: 'Cancel',
        variant: 'danger',
      });
      if (!ok) return;

      const nextBills = currentProject.bills.map((entry) => {
        if (entry.id !== billId) return entry;
        return {
          ...entry,
          items: (entry.items || []).map((item) => clearCommercialValues(item, mode)),
          sections: (entry.sections || []).map((section) => {
            if (section.pages?.length) {
              return {
                ...section,
                pages: section.pages.map((page) => ({
                  ...page,
                  items: (page.items || []).map((item) => clearCommercialValues(item, mode)),
                })),
              };
            }
            return {
              ...section,
              items: section.items.map((item) => clearCommercialValues(item, mode)),
            };
          }),
        };
      });
      updateProject(currentProject.id, { bills: nextBills });
      recordBillAuditEntry({
        project: currentProject,
        billId,
        subject: `${labels.title} in bill`,
        message: `Cleared ${labels.result} in "${billName}".`,
        items: pricedCount,
      });
      showToast({ type: 'success', message: `Cleared ${labels.result} in "${billName}".`, duration: 2500 });
    },
    [askConfirm, currentProject, showToast, updateProject]
  );

  const handleClearPageRatesAndQuantities = useCallback(
    (billId: string, sectionId: string, pageId: string) => {
      void handleClearPageValues(billId, sectionId, pageId, 'RATES_AND_QUANTITIES');
    },
    [handleClearPageValues]
  );

  const handleClearSectionRatesAndQuantities = useCallback(
    (billId: string, sectionId: string) => {
      void handleClearSectionValues(billId, sectionId, 'RATES_AND_QUANTITIES');
    },
    [handleClearSectionValues]
  );

  const handleClearBillRatesAndQuantities = useCallback(
    (billId: string) => {
      void handleClearBillValues(billId, 'RATES_AND_QUANTITIES');
    },
    [handleClearBillValues]
  );

  const handleMoveSection = useCallback(
    (billId: string, sectionId: string, direction: 'UP' | 'DOWN') => {
      if (!currentProject) return;
      const bills = currentProject.bills;
      const billIndex = bills.findIndex((b) => b.id === billId);
      if (billIndex === -1) return;

      const bill = bills[billIndex];
      const sections = [...bill.sections];
      const index = sections.findIndex((s) => s.id === sectionId);
      if (index === -1) return;

      const delta = direction === 'UP' ? -1 : 1;
      const newIndex = index + delta;
      if (newIndex < 0 || newIndex >= sections.length) return;

      const [moved] = sections.splice(index, 1);
      sections.splice(newIndex, 0, moved);

      const updatedBill: BoQBill = { ...bill, sections };
      const reindexedBill = reindexBillReferences(updatedBill, billIndex);
      const nextBills = bills.map((b, idx) => (idx === billIndex ? reindexedBill : b));
      updateProject(currentProject.id, { bills: nextBills });
    },
    [currentProject, updateProject]
  );

  const onUseInProject = useCallback(
    async (item: BoQItem, sectionItems?: BoQItem[]) => {
      if (!activeBill || !currentProject) {
        showToast({ type: 'info', message: 'Please open a project and a bill first.' });
        return;
      }
      const useItems = (items: BoQItem[]) => {
        const newItems = items.map((it) => ({
          ...it,
          id: generateId(),
          quantity: ['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(it.type) ? 1 : 0,
          rate: 0,
          total: 0,
          dimensionRows: [] as DimensionRow[],
        }));
        if ((activeBill.sections || []).length === 0) {
          const updatedBills = updateBillItems(currentProject, activeBillId!, (prev) => [...prev, ...newItems]);
          updateProject(currentProject.id, { bills: updatedBills });
        } else {
          const section = activeBill.sections[0];
          if (section.pages && section.pages.length > 0) {
            const lastPage = section.pages[section.pages.length - 1];
            const updatedBills = updateBillSectionPageItems(currentProject, activeBillId!, section.id, lastPage.id, (prev) => [...prev, ...newItems]);
            updateProject(currentProject.id, { bills: updatedBills });
          } else {
            const updatedBills = updateBillSectionItems(currentProject, activeBillId!, section.id, (prev) => [...prev, ...newItems]);
            updateProject(currentProject.id, { bills: updatedBills });
          }
        }
      };
      if ((item.type === 'PRICED' || item.type === 'EXTRA_OVER_ITEM') && sectionItems && sectionItems.length > 0) {
        const itemIdx = sectionItems.findIndex((i) => i === item);
        const parents = sectionItems.slice(0, itemIdx).filter((i) => i.type !== 'PRICED' && i.type !== 'EXTRA_OVER_ITEM');
        if (parents.length > 0) {
          const ok = await askConfirm({
            title: 'Import with parents',
            message: 'This item has parent headings/comments in the library. Import them as well to maintain structure?',
            confirmLabel: 'Import all',
            cancelLabel: 'Item only',
          });
          if (ok) useItems([...parents, item]);
          else useItems([item]);
        } else useItems([item]);
      } else useItems([item]);
    },
    [activeBill, activeBillId, currentProject, updateProject, showToast, askConfirm]
  );

  const handlePaletteSelect = useCallback(
    (item: BoQItem) => {
      if (!currentProject || !activeBillId) {
        showToast({ type: 'info', message: 'Open a project and bill first!' });
        return;
      }
      const bill = currentProject.bills.find((b) => b.id === activeBillId);
      if (!bill) {
        showToast({ type: 'info', message: 'Create a bill first!' });
        return;
      }
      const newItem: BoQItem = {
        ...item,
        id: generateId(),
        quantity: 1,
        rate: 0,
        total: 0,
        dimensionRows: [],
      };
      if ((bill.sections || []).length === 0) {
        const updatedBills = updateBillItems(currentProject, activeBillId, (prev) => [...prev, newItem]);
        updateProject(currentProject.id, { bills: updatedBills });
      } else {
        const section = bill.sections[bill.sections.length - 1];
        if (section.pages && section.pages.length > 0) {
          const lastPage = section.pages[section.pages.length - 1];
          const updatedBills = updateBillSectionPageItems(currentProject, activeBillId, section.id, lastPage.id, (prev) => [...prev, newItem]);
          updateProject(currentProject.id, { bills: updatedBills });
        } else {
          const updatedBills = updateBillSectionItems(currentProject, activeBillId, section.id, (prev) => [...prev, newItem]);
          updateProject(currentProject.id, { bills: updatedBills });
        }
      }
    },
    [currentProject, activeBillId, updateProject, showToast]
  );

  const handleExportPdf = useCallback(async () => {
    if (!currentProject || !activeBill) return;
    try {
      const { exportBillToPdf } = await import('../utils/pdfExport');
      const { blob, filename } = await exportBillToPdf(currentProject, activeBill);

      // Tauri: use save dialog + fs when available (requires @tauri-apps/plugin-dialog and plugin-fs)
      const tauri = typeof window !== 'undefined' ? (window as unknown as { __TAURI__?: unknown }).__TAURI__ : undefined;
      if (tauri) {
        try {
          const { save } = await import('@tauri-apps/plugin-dialog');
          const { writeFile } = await import('@tauri-apps/plugin-fs');
          const path = await save({
            defaultPath: filename,
            filters: [{ name: 'PDF', extensions: ['pdf'] }],
          });
          if (path) {
            const buf = await blob.arrayBuffer();
            await writeFile(path, new Uint8Array(buf));
            recordOperationLogEntry({
              kind: 'export',
              status: 'success',
              subject: 'PDF export',
              message: `Saved ${filename}`,
            });
            showToast({ type: 'success', message: feedbackSaved('PDF file'), duration: 3000 });
            return;
          }
          // User cancelled
          return;
        } catch (tauriErr) {
          console.warn('Tauri PDF save failed, using browser download', tauriErr);
        }
      }

      // Browser fallback: trigger download via blob URL
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      recordOperationLogEntry({
        kind: 'export',
        status: 'success',
        subject: 'PDF export',
        message: `Downloaded ${filename}`,
      });
      showToast({ type: 'success', message: feedbackSaved('PDF file'), duration: 3000 });
    } catch (error) {
      console.error('Export PDF error', error);
      recordOperationLogEntry({
        kind: 'export',
        status: 'error',
        subject: 'PDF export',
        message: error instanceof Error ? error.message : 'PDF export failed.',
      });
      showToast({ type: 'error', message: feedbackError('PDF export', error, 'Please try the export again.') });
    }
  }, [currentProject, activeBill, showToast]);

  const downloadJson = useCallback((data: unknown, filename: string) => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      recordOperationLogEntry({
        kind: 'export',
        status: 'success',
        subject: 'JSON export',
        message: `Downloaded ${filename}`,
      });
    } catch (error) {
      recordOperationLogEntry({
        kind: 'export',
        status: 'error',
        subject: 'JSON export',
        message: error instanceof Error ? error.message : `Unable to export ${filename}.`,
      });
      throw error;
    }
  }, []);

  const handleImport = useCallback(
    (setter: (fn: (prev: unknown) => unknown) => void, expectedKey: string) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file: File | undefined = target.files?.[0];
        if (!file) return;
        const text: string = await file.text();
        try {
          const data = JSON.parse(text) as unknown;
          const validated =
            expectedKey === 'Libraries'
              ? validateLibrariesImport(data)
              : expectedKey === 'Trade Directory'
                ? validateTradesImport(data)
                : (() => {
                    throw new Error(`Unsupported import type: ${expectedKey}`);
                  })();
          const existing =
            expectedKey === 'Libraries'
              ? libraries
              : expectedKey === 'Trade Directory'
                ? trades
                : [];
          const existingIds = new Set(existing.map((item) => item.id));
          const skipped = validated.filter((item) => existingIds.has(item.id)).length;
          const added = validated.length - skipped;
          const ok = await askConfirm({
            title: 'Import data',
            message: added > 0
              ? `Import ${added} ${expectedKey.toLowerCase()} entr${added === 1 ? 'y' : 'ies'}${skipped > 0 ? ` and skip ${skipped} duplicate${skipped === 1 ? '' : 's'}` : ''}?`
              : `No new ${expectedKey.toLowerCase()} entries were found. ${skipped} duplicate${skipped === 1 ? ' was' : 's were'} detected.`,
            confirmLabel: 'Import',
            cancelLabel: 'Cancel',
          });
          if (ok) {
            if (currentProject && shouldAutoSnapshot(currentProject)) {
              const snapshot = createSnapshotEntry(
                currentProject,
                `Before ${expectedKey} import ${new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`,
                `Automatic restore point created before importing ${expectedKey.toLowerCase()}.`
              );
              updateProject(currentProject.id, { snapshots: prependSnapshot(currentProject.snapshots, snapshot) });
            }
            if (expectedKey === 'Libraries') {
              const incoming = (validated as ItemLibrary[]).filter((item) => !existingIds.has(item.id));
              setLibraries(await importLibrariesToRepository(incoming, false));
            } else {
              setter((prev: unknown) =>
                mergeUniqueById(
                  (Array.isArray(prev) ? prev.filter(hasStringId) : []) as { id: string }[],
                  validated
                ) as unknown
              );
            }
            showToast({ type: added > 0 ? 'success' : 'info', message: summarizeImport(expectedKey, added, skipped) });
            recordOperationLogEntry({
              kind: 'import',
              status: added > 0 ? 'success' : 'info',
              subject: `${expectedKey} import`,
              message: `${file.name}: ${added} added, ${skipped} skipped.`,
            });
          } else {
            recordOperationLogEntry({
              kind: 'import',
              status: 'info',
              subject: `${expectedKey} import`,
              message: `${file.name}: cancelled before import.`,
            });
          }
        } catch (error) {
          recordOperationLogEntry({
            kind: 'import',
            status: 'error',
            subject: `${expectedKey} import`,
            message: error instanceof Error ? `${file.name}: ${error.message}` : `${file.name}: import failed.`,
          });
          showToast({ type: 'error', message: feedbackError(`${expectedKey} import`, error, 'The JSON file could not be read or does not match this import type.') });
        }
      };
      input.click();
    },
    [showToast, askConfirm, currentProject, updateProject, libraries, trades, setLibraries]
  );

  const handleCiteImport = useCallback(
    (project: Project) => {
      const referencedProject = ensureEstimateReference(project, projects);
      const importedProject = withAutoSnapshot(
        referencedProject,
        `Imported schedule ${new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`,
        'Automatic baseline restore point created when this project was imported.'
      );
      setProjects((prev) => [...prev, importedProject]);
      setCurrentProjectId(importedProject.id);
      setActiveBillId(getPreferredBillId(importedProject));
    },
    [projects, setProjects, setCurrentProjectId, setActiveBillId]
  );

  const handleWindowDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer?.files;
      if (!files?.length) return;
      const { parseCiteFile } = await import('../utils/citeParser');
      const fileList: File[] = Array.from(files);
      const jsonFiles = fileList.filter((f) => f.name.toLowerCase().endsWith('.json'));
      const citeFiles: File[] = fileList.filter((f) => /\.(ebq|ebc|csv|txt|tsv)$/i.test(f.name));
      try {
        if (jsonFiles.length > 0) {
          if (currentProject && shouldAutoSnapshot(currentProject)) {
            const snapshot = createSnapshotEntry(
              currentProject,
              `Before dropped import ${new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`,
              'Automatic restore point created before importing dropped files.'
            );
            updateProject(currentProject.id, { snapshots: prependSnapshot(currentProject.snapshots, snapshot) });
          }
          let importedCount = 0;
          let skippedCount = 0;
          const existingProjectIds = new Set(projects.map((project) => project.id));
          const importedReferenceBasis: Pick<Project, 'reference'>[] = [...projects];
          for (const file of jsonFiles) {
            const text = await file.text();
            let importedProjects: Project[];
            try {
              importedProjects = validateProjectsImport(JSON.parse(text));
            } catch (parseErr) {
              showToast({ type: 'error', message: feedbackError('Dropped JSON import', parseErr, 'One of the dropped JSON files is invalid or not a project export.') });
              return;
            }
            const freshProjects = assignEstimateReferences(
              importedProjects.filter((project) => !existingProjectIds.has(project.id)),
              importedReferenceBasis
            )
              .map((project) => withAutoSnapshot(
                project,
                `Imported JSON project ${new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`,
                'Automatic baseline restore point created when this project was imported.'
              ));
            importedCount += freshProjects.length;
            skippedCount += importedProjects.length - freshProjects.length;
            freshProjects.forEach((project) => existingProjectIds.add(project.id));
            importedReferenceBasis.push(...freshProjects);
            if (freshProjects.length > 0) {
              setProjects((prev) => mergeUniqueById(prev, freshProjects));
            }
            if (freshProjects.length > 0 && !currentProject) {
              setCurrentProjectId(freshProjects[0].id);
              setActiveBillId(getPreferredBillId(freshProjects[0]));
            }
          }
          showToast({ type: importedCount > 0 ? 'success' : 'info', message: summarizeImport('Project', importedCount, skippedCount) });
        }
        if (citeFiles.length > 0) {
          const result = await parseCiteFile(citeFiles);
          if (result) {
            const importedProject = result.project;
            if (projects.some((existing) => existing.id === importedProject.id)) {
              showToast({ type: 'info', message: 'CITE import skipped. That project is already in the workspace.' });
            } else {
              handleCiteImport(importedProject);
              showToast({ type: 'success', message: feedbackSuccess('CITE import', `Imported using the ${result.strategy} parser.`) });
            }
          } else {
            showToast({ type: 'error', message: feedbackError('CITE import', undefined, 'No valid CITE data was found in the dropped files.') });
          }
        }
      } catch (err) {
        console.error(err);
        showToast({ type: 'error', message: feedbackError('Dropped file import', err, 'Please check the files and try again.') });
      }
    },
    [currentProject, projects, setProjects, setCurrentProjectId, setActiveBillId, handleCiteImport, showToast, updateProject]
  );

  const handleWindowDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleIntervalExpandAndSave = useCallback(
    async (interval: number, max: number) => {
      const { expandItemIntervals } = await loadGeminiService();
      const result = await expandItemIntervals(editFormData.description, interval, max);
      if ('error' in result) {
        showToast({ type: 'error', message: result.error });
        return;
      }
      const descriptions = result.data;
      const { billId, sectionId, pageId, libId, folderId, libSectionId } = editorConfig;
      const newItems: BoQItem[] = descriptions.map((desc) => ({
        id: generateId(),
        type: (editorConfig.type || editorConfig.item?.type || 'PRICED') as ItemType,
        description: desc,
        unit: editFormData.unit,
        quantity: 1,
        rate: editFormData.rate,
        total: editFormData.rate,
        reference: '',
        dimensionRows: [],
      }));
      if (libId && folderId && libSectionId) {
        void appendLibraryItems({ libraryId: libId, folderId, sectionId: libSectionId, pageId }, newItems);
      } else if (currentProject && billId) {
        if (sectionId === '' || !sectionId) {
          const updatedBills = updateBillItems(currentProject, billId, (items) => [...items, ...newItems]);
          updateProject(currentProject.id, { bills: updatedBills });
        } else if (pageId) {
          const updatedBills = updateBillSectionPageItems(currentProject, billId, sectionId, pageId, (items) => [...items, ...newItems]);
          updateProject(currentProject.id, { bills: updatedBills });
        } else {
          const updatedBills = updateBillSectionItems(currentProject, billId, sectionId, (items) => [...items, ...newItems]);
          updateProject(currentProject.id, { bills: updatedBills });
        }
      }
      setIsEditorOpen(false);
    },
    [editFormData, editorConfig, currentProject, setLibraries, updateProject, setIsEditorOpen]
  );

  const handleAiFetchSuggestions = useCallback(async () => {
    if (editFormData.aiLocks.description) {
      showToast({ type: 'info', message: 'Description is locked against AI overwrite. Unlock it first to fetch AI rewrites.' });
      setAiSuggestions?.([]);
      return;
    }
    setIsAiLoading(true);
    try {
      const { getBoQSuggestions } = await loadGeminiService();
      const res = await getBoQSuggestions(editFormData.description);
      if ('error' in res) {
        showToast({ type: 'error', message: res.error });
        setAiSuggestions?.([]);
        return;
      }
      setAiSuggestions?.(res.data.suggestions);
    } catch (e) {
      console.error(e);
      showToast({ type: 'error', message: feedbackError('AI suggestion fetch', e, 'Please try the request again.') });
      setAiSuggestions?.([]);
    } finally {
      setIsAiLoading(false);
    }
  }, [editFormData.aiLocks.description, editFormData.description, setAiSuggestions, setIsAiLoading, showToast]);

  const onSuggestionSelect = useCallback(
    (s: AISuggestion) => {
      if (editFormData.aiLocks.description) {
        showToast({ type: 'info', message: 'Description is locked. Unlock it before applying AI wording changes.' });
        setAiSuggestions?.([]);
        return;
      }
      setEditFormData((prev) => ({ ...prev, description: s.description, unit: s.unit }));
      setAiSuggestions?.([]);
    },
    [editFormData.aiLocks.description, setEditFormData, setAiSuggestions, showToast]
  );

  return {
    openPrompt,
    openEditor,
    handlePromptSubmit,
    handleSaveItem,
    handleSaveItemAndContinue,
    handleSaveMultipleItems,
    handleBatchAssign,
    handleDuplicateSelectedItems,
    handlePasteCopiedItems,
    copiedBillItemsCount: copiedBillItems && copiedBillItems.projectId === currentProject?.id ? copiedBillItems.items.length : 0,
    handleDeleteSelectedItems,
    handleClearSelectedValues,
    handleSingleItemTradeAssign,
    handleBillTradeAssign,
    handleSectionTradeAssign,
      handlePageTradeAssign,
    handleDeleteItem,
      handleDeleteSection,
      handleDeletePage,
      handleClearBillValues,
      handleClearSectionValues,
      handleClearPageValues,
      handleClearBillRatesAndQuantities,
      handleClearSectionRatesAndQuantities,
      handleClearPageRatesAndQuantities,
      handleMoveSection,
    onUseInProject,
    handlePaletteSelect,
    handleExportPdf,
    downloadJson,
    handleImport,
    handleCiteImport,
    handleWindowDrop,
    handleWindowDragOver,
    handleIntervalExpandAndSave,
    handleAiFetchSuggestions,
    onSuggestionSelect,
  };
}
