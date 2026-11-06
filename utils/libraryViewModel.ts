import type { BoQItem, ItemLibrary, LibraryFolder, LibraryPage, LibrarySection } from '../types';

export const LIBRARY_COLLAPSIBLE_HEADING_TYPES = new Set<BoQItem['type']>(['GENERAL_HEADING', 'MAJOR_HEADING', 'SUB_SECTION', 'MINOR_HEADING', 'COMMENT', 'SUB_COMMENT']);
export const PRICED_TYPES = new Set<BoQItem['type']>(['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM']);

export type VisibleLibraryRow = { item: BoQItem; idx: number };
export type LibrarySectionContext = { section: LibrarySection; depth: number; parent: LibrarySection | null };
export type LibrarySectionDepth = { section: LibrarySection; depth: number };

type LibraryWithFolders = Pick<ItemLibrary, 'folders' | 'permissions' | 'exportLocked' | 'pricedCount'>;
type PricedTypeLike = { type: BoQItem['type'] };

export function compareOrderRef(a?: string, b?: string) {
  const left = (a || '').trim();
  const right = (b || '').trim();
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}

export function sortLibraryNodes<T extends { position?: number; orderRef?: string; name?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (typeof a.position === 'number' && typeof b.position === 'number' && a.position !== b.position) {
      return a.position - b.position;
    }
    const byOrderRef = compareOrderRef(a.orderRef, b.orderRef);
    if (byOrderRef !== 0) return byOrderRef;
    return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' });
  });
}

function compareLibrarySections(a: LibrarySection, b: LibrarySection) {
  const byOrderRef = compareOrderRef(a.orderRef, b.orderRef);
  if (byOrderRef !== 0) return byOrderRef;
  if (typeof a.position === 'number' && typeof b.position === 'number' && a.position !== b.position) {
    return a.position - b.position;
  }
  return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' });
}

export function sortLibrarySections(sections: LibrarySection[] = []): LibrarySection[] {
  return [...sections].sort(compareLibrarySections).map((section) => ({
    ...section,
    subSections: sortLibrarySections(section.subSections || []),
  }));
}

export function flattenLibrarySections(sections: LibrarySection[] = []): LibrarySection[] {
  return (sections || []).flatMap((section) => [section, ...flattenLibrarySections(section.subSections || [])]);
}

export function flattenLibrarySectionsWithDepth(sections: LibrarySection[] = [], depth = 0): LibrarySectionDepth[] {
  return (sections || []).flatMap((section) => [
    { section, depth },
    ...flattenLibrarySectionsWithDepth(section.subSections || [], depth + 1),
  ]);
}

export function flattenLibrarySectionsWithContext(
  sections: LibrarySection[] = [],
  depth = 0,
  parent: LibrarySection | null = null,
): LibrarySectionContext[] {
  return (sections || []).flatMap((section) => [
    { section, depth, parent },
    ...flattenLibrarySectionsWithContext(section.subSections || [], depth + 1, section),
  ]);
}

export function getLibrarySectionLevelLabel(depth: number) {
  return `Level ${depth + 1}`;
}

export function normalizeSectionOrderRef(value?: string) {
  return (value || '').trim().replace(/\s+/g, '').toLowerCase();
}

export function inferParentSectionOrderRef(orderRef?: string) {
  const ref = normalizeSectionOrderRef(orderRef);
  if (!ref) return '';

  const dottedLetter = ref.match(/^(.+\.\d+)(?:\(([a-z])\)|([a-z]))$/i);
  if (dottedLetter) return dottedLetter[1];

  const dottedNumber = ref.match(/^(.+)\.(\d+)$/);
  if (dottedNumber) {
    const prefix = dottedNumber[1];
    const decimals = dottedNumber[2];
    if (decimals.length <= 2) return prefix;
    return `${prefix}.${decimals.slice(0, -1)}`;
  }

  const prefixedSubSub = ref.match(/^([a-z]+)(\d{3})([a-z])$/i);
  if (prefixedSubSub) return `${prefixedSubSub[1]}${prefixedSubSub[2]}`;

  const prefixedSub = ref.match(/^([a-z]+)(\d{2})\d$/i);
  if (prefixedSub) return `${prefixedSub[1]}${prefixedSub[2]}`;

  const numericSubSub = ref.match(/^(\d{3})([a-z])$/i);
  if (numericSubSub) return numericSubSub[1];

  const numericSub = ref.match(/^(\d{2})\d$/);
  if (numericSub) return numericSub[1];

  return '';
}

export function inferParentSectionOrderRefCandidates(orderRef?: string) {
  const refs: string[] = [];
  let current = inferParentSectionOrderRef(orderRef);
  while (current && !refs.includes(current)) {
    refs.push(current);
    current = inferParentSectionOrderRef(current);
  }
  const firstNumber = normalizeSectionOrderRef(orderRef).match(/^(\d+)/)?.[1];
  if (firstNumber && !refs.includes(firstNumber)) refs.push(firstNumber);
  return refs;
}

export function findLibrarySectionNode(sections: LibrarySection[] = [], sectionId?: string | null): LibrarySection | undefined {
  if (!sectionId) return undefined;
  for (const section of sections || []) {
    if (section.id === sectionId) return section;
    const nested = findLibrarySectionNode(section.subSections || [], sectionId);
    if (nested) return nested;
  }
  return undefined;
}

export function findLibrarySectionParentContext(
  sections: LibrarySection[] = [],
  sectionId?: string | null,
  parent: LibrarySection | null = null,
): { section: LibrarySection; parent: LibrarySection | null } | null {
  if (!sectionId) return null;
  for (const section of sections || []) {
    if (section.id === sectionId) return { section, parent };
    const nested = findLibrarySectionParentContext(section.subSections || [], sectionId, section);
    if (nested) return nested;
  }
  return null;
}

export function isLibrarySectionDescendant(candidate: LibrarySection | null | undefined, possibleDescendantId: string): boolean {
  return (candidate?.subSections || []).some((child) => (
    child.id === possibleDescendantId || isLibrarySectionDescendant(child, possibleDescendantId)
  ));
}

export function normalizeLibraryLabel(value: string | undefined, fallback: string) {
  const next = (value || '').trim();
  if (!next) return fallback;
  return next.replace(/\b(Section|Folder|Library|Page|Bill)([A-Z0-9]+)/g, '$1 $2');
}

export function formatOrderedLabel(orderRef: string | undefined, name: string | undefined, fallback: string) {
  const cleanName = normalizeLibraryLabel(name, fallback);
  return orderRef?.trim() ? `${orderRef.trim()} ${cleanName}` : cleanName;
}

export function filterLibrarySectionsForSearch(sections: LibrarySection[] = [], query: string): LibrarySection[] {
  if (!query) return sections;
  return (sections || []).reduce<LibrarySection[]>((matches, section) => {
    const nestedMatches = filterLibrarySectionsForSearch(section.subSections || [], query);
    const isMatch = formatOrderedLabel(section.orderRef, section.name, 'Section').toLowerCase().includes(query);
    if (isMatch || nestedMatches.length > 0) {
      matches.push({ ...section, subSections: isMatch ? sortLibrarySections(section.subSections || []) : nestedMatches });
    }
    return matches;
  }, []);
}

export function getLibraryItemLabel(item: Partial<BoQItem>, idx: number) {
  return item.description?.trim() || `library item ${idx + 1}`;
}

export function getLibraryItemReference(item: Partial<BoQItem>, idx: number) {
  return item.reference?.trim() || String(idx + 1);
}

export function isLibraryHeadingType(type: BoQItem['type']) {
  return LIBRARY_COLLAPSIBLE_HEADING_TYPES.has(type);
}

export function getLibraryHeadingLevel(type: BoQItem['type']) {
  switch (type) {
    case 'GENERAL_HEADING': return 1;
    case 'MAJOR_HEADING': return 2;
    case 'SUB_SECTION': return 3;
    case 'MINOR_HEADING': return 4;
    case 'COMMENT': return 5;
    case 'SUB_COMMENT': return 6;
    default: return Number.MAX_SAFE_INTEGER;
  }
}

export function getVisibleLibraryRows(items: BoQItem[], collapsedHeadingIds: Record<string, boolean>): VisibleLibraryRow[] {
  const visibleRows: VisibleLibraryRow[] = [];
  const collapsedAncestorLevels: number[] = [];

  items.forEach((item, idx) => {
    if (isLibraryHeadingType(item.type)) {
      const level = getLibraryHeadingLevel(item.type);
      while (collapsedAncestorLevels.length && collapsedAncestorLevels[collapsedAncestorLevels.length - 1] >= level) {
        collapsedAncestorLevels.pop();
      }
      const isHiddenByCollapsedAncestor = collapsedAncestorLevels.length > 0;
      if (!isHiddenByCollapsedAncestor) {
        visibleRows.push({ item, idx });
      }
      if (!isHiddenByCollapsedAncestor && collapsedHeadingIds[item.id]) {
        collapsedAncestorLevels.push(level);
      }
      return;
    }

    if (collapsedAncestorLevels.length === 0) {
      visibleRows.push({ item, idx });
    }
  });

  return visibleRows;
}

export function safeExportFilename(value: string) {
  return value
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120)
    .toLowerCase() || 'library-export';
}

export function sortLibrariesForDisplay(items: ItemLibrary[]): ItemLibrary[] {
  return [...items].sort((a, b) => {
    if (Boolean(a.favorite) !== Boolean(b.favorite)) return a.favorite ? -1 : 1;
    return normalizeLibraryLabel(a.name, 'Library').localeCompare(normalizeLibraryLabel(b.name, 'Library'), undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });
}

export function canExportLibraryAll(library: Pick<ItemLibrary, 'exportLocked' | 'permissions'> | null | undefined) {
  return !library?.exportLocked && library?.permissions?.allowExportAll !== false;
}

export function canExportLibraryFolders(library: Pick<ItemLibrary, 'permissions'> | null | undefined) {
  return library?.permissions?.allowExportFolders !== false;
}

export function canExportLibrarySections(library: Pick<ItemLibrary, 'permissions'> | null | undefined) {
  return library?.permissions?.allowExportSections !== false;
}

export function canEditLibrary(library: Pick<ItemLibrary, 'permissions'> | null | undefined) {
  return library?.permissions?.allowLibraryEditing !== false;
}

export function getLibrarySectionCount(library: Pick<ItemLibrary, 'folders'> | null | undefined) {
  return (library?.folders || []).reduce((count: number, folder: LibraryFolder) => count + flattenLibrarySections(folder.sections || []).length, 0);
}

export function getLibraryPageCount(library: Pick<ItemLibrary, 'folders'> | null | undefined) {
  return (library?.folders || []).reduce(
    (count: number, folder: LibraryFolder) =>
      count +
      flattenLibrarySections(folder.sections || []).reduce(
        (sectionCount: number, section: LibrarySection) =>
          sectionCount + (section.pageCount ?? section.pages?.length ?? 0),
        0
      ),
    0
  );
}

export function getLibraryItemCount(library: Pick<ItemLibrary, 'folders'> | null | undefined) {
  return (library?.folders || []).reduce(
    (count: number, folder: LibraryFolder) =>
      count +
      flattenLibrarySections(folder.sections || []).reduce(
        (sectionCount: number, section: LibrarySection) => {
          if (typeof section.itemCount === 'number') {
            return sectionCount + section.itemCount;
          }
          if (section.pages?.length) {
            return sectionCount + section.pages.reduce(
              (pageCount: number, page: LibraryPage) => pageCount + (page.itemCount ?? page.items?.length ?? 0),
              0
            );
          }
          return sectionCount + (section.items?.length || 0);
        },
        0
      ),
    0
  );
}

export function getLibraryPricedCount(library: Pick<ItemLibrary, 'folders' | 'pricedCount'> | null | undefined) {
  if (typeof library?.pricedCount === 'number') return library.pricedCount;
  return (library?.folders || []).reduce(
    (count: number, folder: LibraryFolder) =>
      count +
      flattenLibrarySections(folder.sections || []).reduce(
        (sectionCount: number, section: LibrarySection) => {
          if (typeof section.pricedCount === 'number') {
            return sectionCount + section.pricedCount;
          }
          const items: PricedTypeLike[] = section.pages?.length
            ? section.pages.flatMap((page) => page.items || [])
            : (section.items || []);
          return sectionCount + items.filter((item) => PRICED_TYPES.has(item.type)).length;
        },
        0
      ),
    0
  );
}

export function getLibraryStats(library: LibraryWithFolders | null | undefined) {
  return {
    folders: library?.folders?.length || 0,
    sections: getLibrarySectionCount(library),
    pages: getLibraryPageCount(library),
    items: getLibraryItemCount(library),
  };
}
