import type { BoQItem, LibraryInsertMode, LibraryInsertPlacement } from '../types';
import { generateId } from './generateId';
import { PRICED_TYPES, getLibraryHeadingLevel, isLibraryHeadingType } from './libraryViewModel';
import { stripRichText } from './richText';

export const LIBRARY_INSERT_DRAG_MIME = 'application/x-hzl-library-insert';
export const LIBRARY_INSERT_DRAG_JSON_MIME = 'application/json';
export const LIBRARY_INSERT_POINTER_DROP_EVENT = 'hzl-library-insert-pointer-drop';
export const LIBRARY_INSERT_DRAG_STATE_EVENT = 'hzl-library-insert-drag-state';
const LIBRARY_INSERT_TEXT_PREFIX = 'HZL_LIBRARY_INSERT:';
let activeLibraryInsertDragPayload: LibraryInsertDragPayload | null = null;

export interface LibraryInsertDragPayload {
  kind: 'HZL_LIBRARY_INSERT';
  selectedItemId: string | null;
  selectedItemType?: BoQItem['type'];
  sourceItems: BoQItem[];
  defaultMode: LibraryInsertMode;
  label?: string;
}

export function resolveLibraryDropPayload(payload: LibraryInsertDragPayload, ctrlKey: boolean): LibraryInsertDragPayload {
  if (!ctrlKey) return payload;
  const selected = payload.sourceItems.find((item) => item.id === payload.selectedItemId) || payload.sourceItems[0];
  return { ...payload, selectedItemId: selected?.id || null, sourceItems: selected ? [selected] : [], defaultMode: 'ITEM_ONLY' };
}

export interface LibraryInsertPointerDropDetail {
  payload: LibraryInsertDragPayload;
  clientX: number;
  clientY: number;
  ctrlKey: boolean;
  payloadPromise?: Promise<LibraryInsertDragPayload>;
}

export interface LibraryInsertDragStateDetail {
  active: boolean;
  payload?: LibraryInsertDragPayload | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normaliseDragType(value: string) {
  return value.trim().toLowerCase();
}

function validateLibraryInsertDragPayload(value: unknown): LibraryInsertDragPayload | null {
  if (!isRecord(value)) return null;
  const parsed = value as Partial<LibraryInsertDragPayload>;
  if (
    parsed.kind !== 'HZL_LIBRARY_INSERT' ||
    !Array.isArray(parsed.sourceItems) ||
    !parsed.defaultMode
  ) {
    return null;
  }

  return {
    kind: 'HZL_LIBRARY_INSERT',
    selectedItemId: parsed.selectedItemId || null,
    selectedItemType: parsed.selectedItemType,
    sourceItems: parsed.sourceItems,
    defaultMode: parsed.defaultMode,
    label: parsed.label,
  };
}

export function serializeLibraryInsertDragPayload(payload: LibraryInsertDragPayload) {
  return `${LIBRARY_INSERT_TEXT_PREFIX}${JSON.stringify(payload)}`;
}

export function beginLibraryInsertDrag(payload: LibraryInsertDragPayload) {
  activeLibraryInsertDragPayload = payload;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<LibraryInsertDragStateDetail>(LIBRARY_INSERT_DRAG_STATE_EVENT, {
      detail: { active: true, payload },
    }));
  }
}

export function clearLibraryInsertDrag(payload?: LibraryInsertDragPayload | null) {
  if (!payload || activeLibraryInsertDragPayload === payload) {
    activeLibraryInsertDragPayload = null;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent<LibraryInsertDragStateDetail>(LIBRARY_INSERT_DRAG_STATE_EVENT, {
        detail: { active: false, payload: null },
      }));
    }
  }
}

export function getActiveLibraryInsertDragPayload() {
  return activeLibraryInsertDragPayload;
}

export function dispatchLibraryInsertPointerDrop(payload: LibraryInsertDragPayload, clientX: number, clientY: number, ctrlKey = false, payloadPromise?: Promise<LibraryInsertDragPayload>) {
  window.dispatchEvent(new CustomEvent<LibraryInsertPointerDropDetail>(LIBRARY_INSERT_POINTER_DROP_EVENT, {
    detail: { payload, clientX, clientY, ctrlKey, payloadPromise },
  }));
}

export function isLibraryInsertPointerDropEvent(event: Event): event is CustomEvent<LibraryInsertPointerDropDetail> {
  if (event.type !== LIBRARY_INSERT_POINTER_DROP_EVENT) return false;
  const detail = (event as CustomEvent<LibraryInsertPointerDropDetail>).detail;
  return Boolean(
    detail &&
    detail.payload?.kind === 'HZL_LIBRARY_INSERT' &&
    Number.isFinite(detail.clientX) &&
    Number.isFinite(detail.clientY),
  );
}

function parseLibraryInsertDragText(rawPayload: string) {
  if (!rawPayload) return null;
  const jsonPayload = rawPayload.startsWith(LIBRARY_INSERT_TEXT_PREFIX)
    ? rawPayload.slice(LIBRARY_INSERT_TEXT_PREFIX.length)
    : rawPayload;

  try {
    return validateLibraryInsertDragPayload(JSON.parse(jsonPayload));
  } catch {
    return null;
  }
}

function normaliseKey(value?: string | null) {
  return stripRichText(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function itemKey(item: Pick<BoQItem, 'reference' | 'description' | 'type'>) {
  return `${item.type}|${normaliseKey(item.reference)}|${normaliseKey(item.description)}`;
}

function isDuplicateStructureItem(candidate: BoQItem, existingItems: BoQItem[]) {
  if (PRICED_TYPES.has(candidate.type)) return false;
  const key = itemKey(candidate);
  return existingItems.some((item) => !PRICED_TYPES.has(item.type) && itemKey(item) === key);
}

function cloneForBill(item: BoQItem): BoQItem {
  const isPriced = PRICED_TYPES.has(item.type);
  return {
    ...item,
    id: generateId(),
    quantity: isPriced ? 1 : 0,
    rate: 0,
    total: 0,
    dimensionRows: [],
    tradePackageId: undefined,
  };
}

export function getLibraryInsertModeLabel(mode: LibraryInsertMode) {
  switch (mode) {
    case 'ITEM_ONLY':
      return 'Item only';
    case 'WITH_MISSING_PARENTS':
      return 'Item with missing parent headings';
    case 'FROM_HEADING':
      return 'From selected heading';
    case 'FROM_COMMENT':
      return 'From selected comment';
    case 'FULL_SECTION':
      return 'Full section';
    default:
      return 'Library insert';
  }
}

export function getParentContextItems(sourceItems: BoQItem[], selectedIndex: number) {
  const selected = sourceItems[selectedIndex];
  if (!selected) return [];
  const selectedLevel = isLibraryHeadingType(selected.type)
    ? getLibraryHeadingLevel(selected.type)
    : Number.MAX_SAFE_INTEGER;
  const parents: BoQItem[] = [];

  for (let index = selectedIndex - 1; index >= 0; index -= 1) {
    const candidate = sourceItems[index];
    if (!isLibraryHeadingType(candidate.type)) continue;
    const candidateLevel = getLibraryHeadingLevel(candidate.type);
    const currentNearestLevel = parents.length > 0
      ? Math.min(...parents.map((item) => getLibraryHeadingLevel(item.type)))
      : selectedLevel;
    if (candidateLevel < currentNearestLevel) {
      parents.unshift(candidate);
    }
  }

  return parents;
}

export function getLibraryInsertItems(sourceItems: BoQItem[], selectedItemId: string | null, mode: LibraryInsertMode) {
  const selectedIndex = selectedItemId
    ? sourceItems.findIndex((item) => item.id === selectedItemId)
    : -1;
  const selected = selectedIndex >= 0 ? sourceItems[selectedIndex] : null;

  if (mode === 'FULL_SECTION') return sourceItems;
  if (!selected) return [];
  if (mode === 'ITEM_ONLY') return [selected];

  if (mode === 'WITH_MISSING_PARENTS') {
    return [...getParentContextItems(sourceItems, selectedIndex), selected];
  }

  if (mode === 'FROM_COMMENT') {
    if (selected.type !== 'COMMENT' && selected.type !== 'SUB_COMMENT') return [selected];
    const endIndex = sourceItems.findIndex((item, index) => (
      index > selectedIndex &&
      (isLibraryHeadingType(item.type) || item.type === 'COMMENT' || item.type === 'SUB_COMMENT')
    ));
    return [
      ...getParentContextItems(sourceItems, selectedIndex),
      ...sourceItems.slice(selectedIndex, endIndex === -1 ? undefined : endIndex),
    ];
  }

  if (mode === 'FROM_HEADING') {
    if (!isLibraryHeadingType(selected.type)) return [selected];
    const selectedLevel = getLibraryHeadingLevel(selected.type);
    const endIndex = sourceItems.findIndex((item, index) => (
      index > selectedIndex &&
      isLibraryHeadingType(item.type) &&
      getLibraryHeadingLevel(item.type) <= selectedLevel
    ));
    return [
      ...getParentContextItems(sourceItems, selectedIndex),
      ...sourceItems.slice(selectedIndex, endIndex === -1 ? undefined : endIndex),
    ];
  }

  return [selected];
}

export function parseLibraryInsertDragPayload(dataTransfer: DataTransfer): LibraryInsertDragPayload | null {
  const payloadCandidates = [
    dataTransfer.getData(LIBRARY_INSERT_DRAG_MIME),
    dataTransfer.getData(LIBRARY_INSERT_DRAG_JSON_MIME),
    dataTransfer.getData('text/plain'),
  ].filter(Boolean);

  for (const rawPayload of payloadCandidates) {
    const parsed = parseLibraryInsertDragText(rawPayload);
    if (parsed) return parsed;
  }

  return activeLibraryInsertDragPayload;
}

export function hasLibraryInsertDragPayload(dataTransfer: DataTransfer) {
  if (activeLibraryInsertDragPayload) return true;
  const types = Array.from(dataTransfer.types || []).map(normaliseDragType);
  if (types.includes(normaliseDragType(LIBRARY_INSERT_DRAG_MIME))) return true;
  if (types.includes(normaliseDragType(LIBRARY_INSERT_DRAG_JSON_MIME)) && !types.includes('application/x-qs-bill-item')) return true;
  return false;
}

export function buildBillItemsFromLibraryInsert(
  sourceItems: BoQItem[],
  selectedItemId: string | null,
  mode: LibraryInsertMode,
  existingItems: BoQItem[],
  placement: { placement: LibraryInsertPlacement; anchorItemId?: string | null } = { placement: 'BOTTOM' },
) {
  const items = getLibraryInsertItems(sourceItems, selectedItemId, mode);
  let precedingItems = existingItems;
  if (placement.placement === 'TOP') precedingItems = [];
  else if (placement.placement !== 'BOTTOM') {
    const anchorIndex = existingItems.findIndex((item) => item.id === placement.anchorItemId);
    if (anchorIndex >= 0) precedingItems = existingItems.slice(0, anchorIndex + (placement.placement === 'AFTER_SELECTED' ? 1 : 0));
  }
  const lastIndex = precedingItems.length - 1;
  const activeContext = lastIndex < 0 ? [] : getParentContextItems(precedingItems, lastIndex);
  if (lastIndex >= 0 && isLibraryHeadingType(precedingItems[lastIndex].type)) activeContext.push(precedingItems[lastIndex]);
  return items
    .filter((item) => {
      if (mode === 'FULL_SECTION' || mode === 'ITEM_ONLY') return true;
      if (PRICED_TYPES.has(item.type)) return true;
      if (isDuplicateStructureItem(item, activeContext)) return false;
      const level = getLibraryHeadingLevel(item.type);
      while (activeContext.length && getLibraryHeadingLevel(activeContext[activeContext.length - 1].type) >= level) activeContext.pop();
      activeContext.push(item);
      return true;
    })
    .map(cloneForBill);
}

export function insertItemsAtPlacement(
  existingItems: BoQItem[],
  insertItems: BoQItem[],
  placement: 'TOP' | 'BOTTOM' | 'AFTER_SELECTED' | 'BEFORE_SELECTED',
  anchorItemId?: string | null,
) {
  if (insertItems.length === 0) return existingItems;
  if (placement === 'TOP') return [...insertItems, ...existingItems];
  if (placement === 'BOTTOM' || !anchorItemId) return [...existingItems, ...insertItems];
  const anchorIndex = existingItems.findIndex((item) => item.id === anchorItemId);
  if (anchorIndex === -1) return [...existingItems, ...insertItems];
  const insertIndex = placement === 'BEFORE_SELECTED' ? anchorIndex : anchorIndex + 1;
  return [
    ...existingItems.slice(0, insertIndex),
    ...insertItems,
    ...existingItems.slice(insertIndex),
  ];
}
