import type Database from '@tauri-apps/plugin-sql';
import type { BoQItem, ItemLibrary, LibraryFolder, LibraryGovernance, LibraryPage, LibrarySection } from '../types';
import { getDatabase, readNormalizedLibraries } from './appPersistence';
import { getParentContextItems } from './libraryInsert';
import { applyRateBuildUp, normaliseRateBuildUp } from './rateBuildUp';

const PRICED_TYPES = new Set(['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM']);

export interface LibraryItemsResult {
  items: BoQItem[];
  totalCount: number;
  pricedCount: number;
}

export interface LibraryItemOutlineRow extends BoQItem {
  position: number;
  childEndPosition: number | null;
}

export interface LibraryRootHeadingRow extends LibraryItemOutlineRow {
  folderId: string;
  folderOrderRef?: string;
  folderName: string;
  sectionId: string;
  sectionOrderRef?: string;
  sectionName: string;
  pageId?: string | null;
}

export interface LibrarySearchResult extends BoQItem {
  libraryId: string;
  folderId: string;
  folderName: string;
  sectionId: string;
  sectionName: string;
  pageId?: string | null;
  pageName?: string | null;
}

export interface SearchLibraryItemsOptions {
  query: string;
  libraryId: string;
  folderId?: string | null;
  sectionId?: string | null;
  includeLibrary?: boolean;
  includeFolder?: boolean;
  includeSection?: boolean;
  offset?: number;
  limit?: number;
}

export interface ListLibraryItemsOptions {
  sectionId: string;
  pageId?: string | null;
  offset?: number;
  limit?: number;
  query?: string;
}

export interface ListLibraryItemOutlineOptions {
  sectionId: string;
  pageId?: string | null;
}

export interface ListLibraryItemsInPositionRangeOptions extends ListLibraryItemsOptions {
  startPosition: number;
  endPosition?: number | null;
}

export interface LibrarySampleSectionRef {
  libraryId: string;
  folderId: string;
  folderName: string;
  sectionId: string;
  sectionOrderRef?: string | null;
  sectionName: string;
  pageId?: string | null;
  pageOrderRef?: string | null;
  pageName?: string | null;
  itemCount: number;
  pricedCount: number;
}

type ItemRow = {
  id: string;
  type: BoQItem['type'];
  reference: string;
  description: string;
  unit: string;
  quantity: number;
  quantity_decimals?: number | null;
  rate: number;
  total: number;
  dimension_rows?: string | null;
  trade_package_id?: string | null;
  rate_source?: string | null;
  ai_locks?: string | null;
  rate_build_up?: string | null;
};

type SearchItemRow = ItemRow & {
  library_id: string;
  folder_id: string;
  folder_name: string;
  section_id: string;
  section_name: string;
  page_id?: string | null;
  page_name?: string | null;
  total_count: number;
};

async function requireDb(): Promise<Database> {
  const db = await getDatabase();
  if (!db) throw new Error('SQLite storage is required for large library operations.');
  return db;
}

function searchText(item: Partial<BoQItem>) {
  return [item.reference, item.description, item.unit, item.type]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function toDbItemRow(item: BoQItem, ids: { libraryId: string; folderId: string; sectionId: string; pageId?: string | null }, position: number, updatedAt: string) {
  return [
    item.id,
    ids.libraryId,
    ids.folderId,
    ids.sectionId,
    ids.pageId || null,
    position,
    item.type,
    item.reference || '',
    item.description || '',
    item.unit || '',
    item.quantity || 0,
    item.quantityDecimals ?? null,
    item.rate || 0,
    item.total || 0,
    item.dimensionRows ? JSON.stringify(item.dimensionRows) : null,
    item.tradePackageId || null,
    item.rateSource || null,
    item.aiLocks ? JSON.stringify(item.aiLocks) : null,
    item.rateBuildUp ? JSON.stringify(normaliseRateBuildUp(item.rateBuildUp)) : null,
    searchText(item),
    updatedAt,
  ];
}

function fromItemRow(row: ItemRow): BoQItem {
  return applyRateBuildUp({
    id: row.id,
    type: row.type,
    reference: row.reference || '',
    description: row.description || '',
    unit: row.unit || '',
    quantity: row.quantity || 0,
    quantityDecimals: row.quantity_decimals ?? undefined,
    rate: row.rate || 0,
    total: row.total || 0,
    dimensionRows: row.dimension_rows ? JSON.parse(row.dimension_rows) : undefined,
    tradePackageId: row.trade_package_id || undefined,
    rateSource: row.rate_source || undefined,
    aiLocks: row.ai_locks ? JSON.parse(row.ai_locks) : undefined,
    rateBuildUp: row.rate_build_up ? JSON.parse(row.rate_build_up) : undefined,
  });
}

function getHeadingLevel(type: BoQItem['type']) {
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

async function refreshLibrariesFromDb(db: Database): Promise<ItemLibrary[]> {
  return readNormalizedLibraries(db, { includeItemCounts: false });
}

async function refreshLibraryStats(db: Database, libraryIds?: string[]): Promise<void> {
  const ids = libraryIds?.length
    ? [...new Set(libraryIds)].filter(Boolean)
    : (await db.select<Array<{ id: string }>>('SELECT id FROM library_catalogs')).map((row) => row.id);
  const updatedAt = new Date().toISOString();

  for (const libraryId of ids) {
    const [folderRows, sectionRows, itemRows] = await Promise.all([
      db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM library_folders WHERE library_id = ?', [libraryId]),
      db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM library_sections WHERE library_id = ?', [libraryId]),
      db.select<Array<{ item_count: number; priced_count: number }>>(
        `SELECT COUNT(*) AS item_count,
           SUM(CASE WHEN type IN ('PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM') THEN 1 ELSE 0 END) AS priced_count
         FROM library_items
         WHERE library_id = ?`,
        [libraryId]
      ),
    ]);

    await db.execute(
      `INSERT INTO library_stats (library_id, folder_count, section_count, item_count, priced_count, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(library_id) DO UPDATE SET
         folder_count = excluded.folder_count,
         section_count = excluded.section_count,
         item_count = excluded.item_count,
         priced_count = excluded.priced_count,
         updated_at = excluded.updated_at`,
      [
        libraryId,
        folderRows[0]?.count || 0,
        sectionRows[0]?.count || 0,
        itemRows[0]?.item_count || 0,
        itemRows[0]?.priced_count || 0,
        updatedAt,
      ]
    );
  }
}

async function refreshChangedLibraries(db: Database, libraryIds: string[]): Promise<ItemLibrary[]> {
  await refreshLibraryStats(db, libraryIds);
  return refreshLibrariesFromDb(db);
}

async function backfillMissingLibraryStats(db: Database): Promise<void> {
  const missingRows = await db.select<Array<{ id: string }>>(
    `SELECT c.id
     FROM library_catalogs c
     LEFT JOIN library_stats st ON st.library_id = c.id
     WHERE st.library_id IS NULL`
  );
  if (missingRows.length === 0) return;
  await refreshLibraryStats(db, missingRows.map((row) => row.id));
}

function normalizeSectionRef(value?: string | null) {
  return (value || '').trim().replace(/\s+/g, '').toLowerCase();
}

function inferParentSectionRef(orderRef?: string | null) {
  const ref = normalizeSectionRef(orderRef);
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

  const prefixedLetter = ref.match(/^([a-z]+\d+)([a-z])$/i);
  if (prefixedLetter) return prefixedLetter[1];

  const prefixedNumber = ref.match(/^([a-z]+)(\d{2,})$/i);
  if (prefixedNumber) {
    const prefix = prefixedNumber[1];
    const digits = prefixedNumber[2];
    if (digits.length <= 2) return prefix;
    return `${prefix}${digits.slice(0, -1)}`;
  }

  const numericLetter = ref.match(/^(\d+)([a-z])$/i);
  if (numericLetter) return numericLetter[1];

  return '';
}

function inferParentSectionRefCandidates(orderRef?: string | null) {
  const refs: string[] = [];
  let current = inferParentSectionRef(orderRef);
  while (current && !refs.includes(current)) {
    refs.push(current);
    current = inferParentSectionRef(current);
  }
  const firstNumber = normalizeSectionRef(orderRef).match(/^(\d+)/)?.[1];
  if (firstNumber && !refs.includes(firstNumber)) refs.push(firstNumber);
  return refs;
}

async function isDescendantSection(db: Database, sectionId: string, possibleDescendantId: string) {
  const rows = await db.select<Array<{ id: string }>>(
    `WITH RECURSIVE descendants(id) AS (
      SELECT id FROM library_sections WHERE parent_section_id = ?
      UNION ALL
      SELECT s.id FROM library_sections s INNER JOIN descendants d ON s.parent_section_id = d.id
    ) SELECT id FROM descendants WHERE id = ?`,
    [sectionId, possibleDescendantId]
  );
  return rows.length > 0;
}

async function getSectionRow(db: Database, sectionId: string) {
  const rows = await db.select<Array<{ id: string; library_id: string; folder_id: string; parent_section_id?: string | null; position: number; order_ref?: string | null }>>(
    'SELECT id, library_id, folder_id, parent_section_id, position, order_ref FROM library_sections WHERE id = ?',
    [sectionId]
  );
  return rows[0] || null;
}

async function countSiblingSections(db: Database, folderId: string, parentSectionId?: string | null) {
  const rows = parentSectionId
    ? await db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM library_sections WHERE folder_id = ? AND parent_section_id = ?', [folderId, parentSectionId])
    : await db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM library_sections WHERE folder_id = ? AND parent_section_id IS NULL', [folderId]);
  return rows[0]?.count || 0;
}

async function updateSectionTreeFolder(db: Database, sectionId: string, targetFolderId: string, updatedAt: string) {
  await db.execute(
    `WITH RECURSIVE descendants(id) AS (
      SELECT id FROM library_sections WHERE id = ?
      UNION ALL
      SELECT s.id FROM library_sections s INNER JOIN descendants d ON s.parent_section_id = d.id
    )
    UPDATE library_sections SET folder_id = ?, updated_at = ? WHERE id IN (SELECT id FROM descendants)`,
    [sectionId, targetFolderId, updatedAt]
  );
  await db.execute('UPDATE library_pages SET folder_id = ?, updated_at = ? WHERE section_id IN (WITH RECURSIVE descendants(id) AS (SELECT id FROM library_sections WHERE id = ? UNION ALL SELECT s.id FROM library_sections s INNER JOIN descendants d ON s.parent_section_id = d.id) SELECT id FROM descendants)', [targetFolderId, updatedAt, sectionId]);
  await db.execute('UPDATE library_items SET folder_id = ?, updated_at = ? WHERE section_id IN (WITH RECURSIVE descendants(id) AS (SELECT id FROM library_sections WHERE id = ? UNION ALL SELECT s.id FROM library_sections s INNER JOIN descendants d ON s.parent_section_id = d.id) SELECT id FROM descendants)', [targetFolderId, updatedAt, sectionId]);
}

export async function listLibraryCatalogs(): Promise<ItemLibrary[]> {
  const db = await requireDb();
  await backfillMissingLibraryStats(db);
  return refreshLibrariesFromDb(db);
}

export async function countLibraryPricedItems(libraryId: string): Promise<number> {
  const db = await requireDb();
  const cachedRows = await db.select<Array<{ priced_count: number }>>(
    'SELECT priced_count FROM library_stats WHERE library_id = ? LIMIT 1',
    [libraryId]
  );
  if (cachedRows.length > 0) return cachedRows[0]?.priced_count || 0;

  const rows = await db.select<Array<{ count: number }>>(
    `SELECT COUNT(*) AS count
     FROM library_items
     WHERE library_id = ?
       AND type IN ('PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM')`,
    [libraryId]
  );
  await refreshLibraryStats(db, [libraryId]);
  return rows[0]?.count || 0;
}

export async function createLibrary(library: ItemLibrary): Promise<ItemLibrary[]> {
  const db = await requireDb();
  const updatedAt = new Date().toISOString();
  const countRows = await db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM library_catalogs');
  await db.execute(
    `INSERT INTO library_catalogs (
      id, position, name, export_locked, favorite,
      allow_export_all, allow_export_folders, allow_export_sections, allow_library_editing,
      governance_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      library.id,
      countRows[0]?.count || 0,
      library.name,
      library.exportLocked ? 1 : 0,
      library.favorite ? 1 : 0,
      library.permissions?.allowExportAll === false ? 0 : (library.exportLocked ? 0 : 1),
      library.permissions?.allowExportFolders === false ? 0 : 1,
      library.permissions?.allowExportSections === false ? 0 : 1,
      library.permissions?.allowLibraryEditing === false ? 0 : 1,
      library.governance ? JSON.stringify(library.governance) : null,
      updatedAt,
    ]
  );
  return refreshChangedLibraries(db, [library.id]);
}

export async function updateLibraryGovernance(libraryId: string, governance: LibraryGovernance): Promise<ItemLibrary[]> {
  const db = await requireDb();
  await db.execute(
    'UPDATE library_catalogs SET governance_json = ?, updated_at = ? WHERE id = ?',
    [JSON.stringify(governance), new Date().toISOString(), libraryId],
  );
  return refreshLibrariesFromDb(db);
}

export async function renameLibrary(libraryId: string, name: string): Promise<ItemLibrary[]> {
  const db = await requireDb();
  await db.execute('UPDATE library_catalogs SET name = ?, updated_at = ? WHERE id = ?', [name, new Date().toISOString(), libraryId]);
  return refreshLibrariesFromDb(db);
}

export async function setLibraryFavorite(libraryId: string, favorite: boolean): Promise<ItemLibrary[]> {
  const db = await requireDb();
  await db.execute('UPDATE library_catalogs SET favorite = ?, updated_at = ? WHERE id = ?', [favorite ? 1 : 0, new Date().toISOString(), libraryId]);
  return refreshLibrariesFromDb(db);
}

function applyLibraryPermissions(library: ItemLibrary, permissions?: ItemLibrary['permissions']): ItemLibrary {
  const resolved = {
    allowExportAll: permissions?.allowExportAll ?? !library.exportLocked,
    allowExportFolders: permissions?.allowExportFolders ?? true,
    allowExportSections: permissions?.allowExportSections ?? true,
    allowLibraryEditing: permissions?.allowLibraryEditing ?? true,
  };
  return {
    ...library,
    exportLocked: !resolved.allowExportAll,
    permissions: resolved,
  };
}

export async function deleteLibrary(libraryId: string): Promise<ItemLibrary[]> {
  const db = await requireDb();
  await db.execute('DELETE FROM library_catalogs WHERE id = ?', [libraryId]);
  await db.execute('DELETE FROM library_stats WHERE library_id = ?', [libraryId]);
  return refreshLibrariesFromDb(db);
}

export async function createFolder(libraryId: string, folder: LibraryFolder): Promise<ItemLibrary[]> {
  const db = await requireDb();
  const rows = await db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM library_folders WHERE library_id = ?', [libraryId]);
  await db.execute(
    'INSERT INTO library_folders (id, library_id, position, order_ref, name, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [folder.id, libraryId, rows[0]?.count || 0, folder.orderRef || null, folder.name, new Date().toISOString()]
  );
  return refreshChangedLibraries(db, [libraryId]);
}

export async function renameFolder(folderId: string, orderRef: string | undefined, name: string): Promise<ItemLibrary[]> {
  const db = await requireDb();
  await db.execute('UPDATE library_folders SET order_ref = ?, name = ?, updated_at = ? WHERE id = ?', [orderRef || null, name, new Date().toISOString(), folderId]);
  return refreshLibrariesFromDb(db);
}

export async function deleteFolder(folderId: string): Promise<ItemLibrary[]> {
  const db = await requireDb();
  const rows = await db.select<Array<{ library_id: string }>>('SELECT library_id FROM library_folders WHERE id = ? LIMIT 1', [folderId]);
  await db.execute('DELETE FROM library_folders WHERE id = ?', [folderId]);
  return refreshChangedLibraries(db, rows[0]?.library_id ? [rows[0].library_id] : []);
}

export async function createSection(libraryId: string, folderId: string, section: LibrarySection): Promise<ItemLibrary[]> {
  const db = await requireDb();
  const parentSectionId = section.parentSectionId || null;
  const rows = parentSectionId
    ? await db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM library_sections WHERE folder_id = ? AND parent_section_id = ?', [folderId, parentSectionId])
    : await db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM library_sections WHERE folder_id = ? AND parent_section_id IS NULL', [folderId]);
  await db.execute(
    'INSERT INTO library_sections (id, library_id, folder_id, parent_section_id, position, order_ref, name, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [section.id, libraryId, folderId, parentSectionId, rows[0]?.count || 0, section.orderRef || null, section.name, new Date().toISOString()]
  );
  return refreshChangedLibraries(db, [libraryId]);
}

export async function insertLibrarySection(libraryId: string, folderId: string, section: LibrarySection): Promise<LibrarySection> {
  const db = await requireDb();
  const parentSectionId = section.parentSectionId || null;
  const rows = parentSectionId
    ? await db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM library_sections WHERE folder_id = ? AND parent_section_id = ?', [folderId, parentSectionId])
    : await db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM library_sections WHERE folder_id = ? AND parent_section_id IS NULL', [folderId]);
  const position = rows[0]?.count || 0;
  const updatedAt = new Date().toISOString();
  await db.execute(
    'INSERT INTO library_sections (id, library_id, folder_id, parent_section_id, position, order_ref, name, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [section.id, libraryId, folderId, parentSectionId, position, section.orderRef || null, section.name, updatedAt]
  );
  await db.execute(
    `INSERT INTO library_stats (library_id, folder_count, section_count, item_count, priced_count, updated_at)
     VALUES (
       ?,
       (SELECT COUNT(*) FROM library_folders WHERE library_id = ?),
       1,
       COALESCE((SELECT item_count FROM library_stats WHERE library_id = ?), 0),
       COALESCE((SELECT priced_count FROM library_stats WHERE library_id = ?), 0),
       ?
     )
     ON CONFLICT(library_id) DO UPDATE SET
       section_count = library_stats.section_count + 1,
       updated_at = excluded.updated_at`,
    [libraryId, libraryId, libraryId, libraryId, updatedAt]
  );
  return {
    ...section,
    parentSectionId: parentSectionId || undefined,
    position,
    items: [],
    pages: [],
    subSections: section.subSections || [],
    itemCount: 0,
    pricedCount: 0,
    pageCount: 0,
    storageMode: 'sqlite',
  };
}

export async function moveLibrarySection(sectionId: string, targetFolderId: string, targetParentSectionId?: string | null): Promise<ItemLibrary[]> {
  const db = await requireDb();
  const row = await getSectionRow(db, sectionId);
  if (!row) return refreshLibrariesFromDb(db);
  if (targetParentSectionId === sectionId) {
    return refreshLibrariesFromDb(db);
  }
  if (targetParentSectionId && await isDescendantSection(db, sectionId, targetParentSectionId)) {
    return refreshLibrariesFromDb(db);
  }

  const nextPosition = await countSiblingSections(db, targetFolderId, targetParentSectionId);
  const updatedAt = new Date().toISOString();

  await db.execute('UPDATE library_sections SET folder_id = ?, parent_section_id = ?, position = ?, updated_at = ? WHERE id = ?', [
    targetFolderId,
    targetParentSectionId || null,
    nextPosition,
    updatedAt,
    sectionId,
  ]);
  await updateSectionTreeFolder(db, sectionId, targetFolderId, updatedAt);
  return refreshChangedLibraries(db, [row.library_id]);
}

export async function reorderLibrarySections(folderId: string, parentSectionId: string | null | undefined, orderedSectionIds: string[]): Promise<ItemLibrary[]> {
  const db = await requireDb();
  const updatedAt = new Date().toISOString();
  for (const [position, sectionId] of orderedSectionIds.entries()) {
    if (parentSectionId) {
      await db.execute(
        'UPDATE library_sections SET position = ?, updated_at = ? WHERE id = ? AND folder_id = ? AND parent_section_id = ?',
        [position, updatedAt, sectionId, folderId, parentSectionId]
      );
    } else {
      await db.execute(
        'UPDATE library_sections SET position = ?, updated_at = ? WHERE id = ? AND folder_id = ? AND parent_section_id IS NULL',
        [position, updatedAt, sectionId, folderId]
      );
    }
  }
  const libraryRows = await db.select<Array<{ library_id: string }>>('SELECT library_id FROM library_folders WHERE id = ? LIMIT 1', [folderId]);
  return refreshChangedLibraries(db, libraryRows[0]?.library_id ? [libraryRows[0].library_id] : []);
}

export async function bulkMoveLibrarySections(sectionIds: string[], targetFolderId: string, targetParentSectionId?: string | null): Promise<ItemLibrary[]> {
  const db = await requireDb();
  const uniqueSectionIds = [...new Set(sectionIds)].filter(Boolean);
  if (uniqueSectionIds.length === 0) return refreshLibrariesFromDb(db);
  const libraryRows = await db.select<Array<{ library_id: string }>>('SELECT library_id FROM library_folders WHERE id = ? LIMIT 1', [targetFolderId]);
  let nextPosition = await countSiblingSections(db, targetFolderId, targetParentSectionId);
  const updatedAt = new Date().toISOString();

  for (const sectionId of uniqueSectionIds) {
    if (targetParentSectionId === sectionId) continue;
    if (targetParentSectionId && await isDescendantSection(db, sectionId, targetParentSectionId)) continue;
    await db.execute(
      'UPDATE library_sections SET folder_id = ?, parent_section_id = ?, position = ?, updated_at = ? WHERE id = ?',
      [targetFolderId, targetParentSectionId || null, nextPosition++, updatedAt, sectionId]
    );
    await updateSectionTreeFolder(db, sectionId, targetFolderId, updatedAt);
  }

  return refreshChangedLibraries(db, libraryRows[0]?.library_id ? [libraryRows[0].library_id] : []);
}

export async function inferLibrarySectionHierarchy(libraryId: string, folderId: string, sectionIds?: string[]): Promise<{ libraries: ItemLibrary[]; movedCount: number; missingParentCount: number }> {
  const db = await requireDb();
  const selectedIds = sectionIds?.length ? [...new Set(sectionIds)] : null;
  const rows = await db.select<Array<{ id: string; order_ref?: string | null; parent_section_id?: string | null }>>(
    selectedIds
      ? `SELECT id, order_ref, parent_section_id FROM library_sections WHERE library_id = ? AND folder_id = ? AND id IN (${selectedIds.map(() => '?').join(',')}) ORDER BY position ASC`
      : 'SELECT id, order_ref, parent_section_id FROM library_sections WHERE library_id = ? AND folder_id = ? ORDER BY position ASC',
    selectedIds ? [libraryId, folderId, ...selectedIds] : [libraryId, folderId]
  );
  const allRows = await db.select<Array<{ id: string; order_ref?: string | null }>>(
    'SELECT id, order_ref FROM library_sections WHERE library_id = ? AND folder_id = ?',
    [libraryId, folderId]
  );
  const byRef = new Map<string, string>();
  allRows.forEach((row) => {
    const ref = normalizeSectionRef(row.order_ref);
    if (ref && !byRef.has(ref)) byRef.set(ref, row.id);
  });

  let movedCount = 0;
  let missingParentCount = 0;
  const updatedAt = new Date().toISOString();

  for (const row of rows) {
    const parentRefs = inferParentSectionRefCandidates(row.order_ref);
    if (!parentRefs.length) continue;
    let parentId: string | undefined;
    for (const parentRef of parentRefs) {
      parentId = byRef.get(parentRef);
      if (parentId) break;
      const firstNumber = parentRef.match(/^(\d+)/)?.[1];
      if (firstNumber) {
        parentId = allRows.find((candidate) => normalizeSectionRef(candidate.order_ref).match(new RegExp(`^${firstNumber}[a-z]$`, 'i')))?.id;
        if (parentId) break;
      }
    }
    if (!parentId || parentId === row.id) {
      missingParentCount += 1;
      continue;
    }
    if (await isDescendantSection(db, row.id, parentId)) continue;
    if (row.parent_section_id === parentId) continue;
    const nextPosition = await countSiblingSections(db, folderId, parentId);
    await db.execute(
      'UPDATE library_sections SET parent_section_id = ?, position = ?, updated_at = ? WHERE id = ?',
      [parentId, nextPosition, updatedAt, row.id]
    );
    movedCount += 1;
  }

  return { libraries: await refreshChangedLibraries(db, [libraryId]), movedCount, missingParentCount };
}

export async function renameSection(sectionId: string, orderRef: string | undefined, name: string): Promise<ItemLibrary[]> {
  const db = await requireDb();
  await db.execute('UPDATE library_sections SET order_ref = ?, name = ?, updated_at = ? WHERE id = ?', [orderRef || null, name, new Date().toISOString(), sectionId]);
  return refreshLibrariesFromDb(db);
}

export async function deleteSection(sectionId: string): Promise<ItemLibrary[]> {
  const db = await requireDb();
  const row = await getSectionRow(db, sectionId);
  await db.execute('DELETE FROM library_sections WHERE id = ?', [sectionId]);
  return refreshChangedLibraries(db, row?.library_id ? [row.library_id] : []);
}

export async function clearSectionContent(sectionId: string): Promise<ItemLibrary[]> {
  const db = await requireDb();
  const row = await getSectionRow(db, sectionId);
  const updatedAt = new Date().toISOString();
  await db.execute('DELETE FROM library_items WHERE section_id = ?', [sectionId]);
  await db.execute('DELETE FROM library_pages WHERE section_id = ?', [sectionId]);
  await db.execute('UPDATE library_sections SET updated_at = ? WHERE id = ?', [updatedAt, sectionId]);
  return refreshChangedLibraries(db, row?.library_id ? [row.library_id] : []);
}

export async function createPage(libraryId: string, folderId: string, sectionId: string, page: LibraryPage): Promise<ItemLibrary[]> {
  const db = await requireDb();
  const rows = await db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM library_pages WHERE section_id = ?', [sectionId]);
  await db.execute(
    'INSERT INTO library_pages (id, library_id, folder_id, section_id, position, order_ref, name, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [page.id, libraryId, folderId, sectionId, rows[0]?.count || 0, page.orderRef || null, page.name || null, new Date().toISOString()]
  );
  if (page.items?.length) {
    await appendLibraryItems({ libraryId, folderId, sectionId, pageId: page.id }, page.items as BoQItem[]);
  }
  return refreshChangedLibraries(db, [libraryId]);
}

export async function renamePage(pageId: string, orderRef: string | undefined, name: string): Promise<ItemLibrary[]> {
  const db = await requireDb();
  await db.execute('UPDATE library_pages SET order_ref = ?, name = ?, updated_at = ? WHERE id = ?', [orderRef || null, name, new Date().toISOString(), pageId]);
  return refreshLibrariesFromDb(db);
}

export async function deletePage(pageId: string): Promise<ItemLibrary[]> {
  const db = await requireDb();
  const rows = await db.select<Array<{ library_id: string }>>('SELECT library_id FROM library_pages WHERE id = ? LIMIT 1', [pageId]);
  await db.execute('DELETE FROM library_pages WHERE id = ?', [pageId]);
  return refreshChangedLibraries(db, rows[0]?.library_id ? [rows[0].library_id] : []);
}

export async function listLibraryItems(options: ListLibraryItemsOptions): Promise<LibraryItemsResult> {
  const db = await requireDb();
  const limit = options.limit ?? 250;
  const offset = options.offset ?? 0;
  const query = options.query?.trim().toLowerCase();
  const pageClause = options.pageId === undefined
    ? 'page_id IS NULL'
    : options.pageId
      ? 'page_id = ?'
      : 'page_id IS NULL';
  const params: unknown[] = options.pageId ? [options.sectionId, options.pageId] : [options.sectionId];
  const queryClause = query ? ' AND search_text LIKE ?' : '';
  if (query) params.push(`%${query}%`);
  const countRows = await db.select<Array<{ count: number; priced_count: number }>>(
    `SELECT COUNT(*) AS count,
       SUM(CASE WHEN type IN ('PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM') THEN 1 ELSE 0 END) AS priced_count
     FROM library_items WHERE section_id = ? AND ${pageClause}${queryClause}`,
    params
  );
  const rows = await db.select<ItemRow[]>(
    `SELECT id, type, reference, description, unit, quantity, quantity_decimals, rate, total,
       dimension_rows, trade_package_id, rate_source, ai_locks
     FROM library_items WHERE section_id = ? AND ${pageClause}${queryClause}
     ORDER BY position ASC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return {
    items: rows.map(fromItemRow),
    totalCount: countRows[0]?.count || 0,
    pricedCount: countRows[0]?.priced_count || 0,
  };
}

export async function listLibraryItemOutline(options: ListLibraryItemOutlineOptions): Promise<{ items: LibraryItemOutlineRow[]; totalCount: number }> {
  const db = await requireDb();
  const pageClause = options.pageId === undefined
    ? 'page_id IS NULL'
    : options.pageId
      ? 'page_id = ?'
      : 'page_id IS NULL';
  const params: unknown[] = options.pageId ? [options.sectionId, options.pageId] : [options.sectionId];
  const rows = await db.select<Array<ItemRow & { position: number; total_count: number }>>(
    `SELECT id, type, reference, description, unit, quantity, quantity_decimals, rate, total,
       dimension_rows, trade_package_id, rate_source, ai_locks, position,
       COUNT(*) OVER() AS total_count
     FROM library_items
     WHERE section_id = ? AND ${pageClause}
       AND type IN ('GENERAL_HEADING', 'MAJOR_HEADING', 'SUB_SECTION', 'MINOR_HEADING', 'COMMENT', 'SUB_COMMENT')
     ORDER BY position ASC`,
    params
  );
  const outlineItems = rows.map((row, index) => {
    const level = getHeadingLevel(row.type);
    const next = rows.slice(index + 1).find((candidate) => getHeadingLevel(candidate.type) <= level);
    return {
      ...fromItemRow(row),
      position: row.position,
      childEndPosition: next ? next.position : null,
    };
  });
  return {
    items: outlineItems,
    totalCount: rows[0]?.total_count || 0,
  };
}

/** Lightweight library-wide H1 index; the child outline is loaded only when a root is opened. */
export async function listLibraryRootHeadings(libraryId: string): Promise<LibraryRootHeadingRow[]> {
  const db = await requireDb();
  const rows = await db.select<Array<ItemRow & {
    position: number;
    child_end_position: number | null;
    folder_id: string;
    folder_order_ref: string | null;
    folder_name: string;
    section_id: string;
    section_order_ref: string | null;
    section_name: string;
    page_id: string | null;
  }>>(
    `SELECT i.id, i.type, i.reference, i.description, i.unit, i.quantity, i.quantity_decimals,
       i.rate, i.total, i.dimension_rows, i.trade_package_id, i.rate_source, i.ai_locks,
       i.position, i.folder_id, f.order_ref AS folder_order_ref, f.name AS folder_name,
       i.section_id, s.order_ref AS section_order_ref, s.name AS section_name, i.page_id,
       (SELECT MIN(next.position) FROM library_items next
        WHERE next.section_id = i.section_id AND next.page_id IS i.page_id
          AND next.type = 'GENERAL_HEADING' AND next.position > i.position) AS child_end_position
     FROM library_items i
     JOIN library_folders f ON f.id = i.folder_id
     JOIN library_sections s ON s.id = i.section_id
     WHERE i.library_id = ? AND i.type = 'GENERAL_HEADING'
     ORDER BY f.position ASC, s.position ASC, i.position ASC`,
    [libraryId],
  );
  return rows.map((row) => ({
    ...fromItemRow(row),
    position: row.position,
    childEndPosition: row.child_end_position,
    folderId: row.folder_id,
    folderOrderRef: row.folder_order_ref || undefined,
    folderName: row.folder_name,
    sectionId: row.section_id,
    sectionOrderRef: row.section_order_ref || undefined,
    sectionName: row.section_name,
    pageId: row.page_id,
  }));
}

/** Resolve parents from stored order, independent of search filters or lazy ranges. */
export async function listLibraryItemContext(itemId: string): Promise<BoQItem[]> {
  const db = await requireDb();
  const rows = await db.select<ItemRow[]>(
    `SELECT i.* FROM library_items i
     JOIN library_items selected ON selected.id = ?
     WHERE i.section_id = selected.section_id
       AND i.page_id IS selected.page_id AND i.position <= selected.position
       AND (i.id = selected.id OR i.type IN
         ('GENERAL_HEADING', 'MAJOR_HEADING', 'SUB_SECTION', 'MINOR_HEADING', 'COMMENT', 'SUB_COMMENT'))
     ORDER BY i.position ASC`,
    [itemId]
  );
  const items = rows.map(fromItemRow);
  const selectedIndex = items.findIndex((item) => item.id === itemId);
  if (selectedIndex < 0) throw new Error('The selected library item is no longer available.');
  return [...getParentContextItems(items, selectedIndex), items[selectedIndex]];
}

export async function listLibraryItemsInPositionRange(options: ListLibraryItemsInPositionRangeOptions): Promise<LibraryItemsResult> {
  const db = await requireDb();
  const limit = options.limit ?? 250;
  const offset = options.offset ?? 0;
  const query = options.query?.trim().toLowerCase();
  const pageClause = options.pageId === undefined
    ? 'page_id IS NULL'
    : options.pageId
      ? 'page_id = ?'
      : 'page_id IS NULL';
  const params: unknown[] = options.pageId ? [options.sectionId, options.pageId] : [options.sectionId];
  const rangeClause = options.endPosition == null
    ? 'position >= ?'
    : 'position >= ? AND position < ?';
  params.push(options.startPosition);
  if (options.endPosition != null) params.push(options.endPosition);
  const queryClause = query ? ' AND search_text LIKE ?' : '';
  if (query) params.push(`%${query}%`);
  const countRows = await db.select<Array<{ count: number; priced_count: number }>>(
    `SELECT COUNT(*) AS count,
       SUM(CASE WHEN type IN ('PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM') THEN 1 ELSE 0 END) AS priced_count
     FROM library_items WHERE section_id = ? AND ${pageClause} AND ${rangeClause}${queryClause}`,
    params
  );
  const rows = await db.select<ItemRow[]>(
    `SELECT id, type, reference, description, unit, quantity, quantity_decimals, rate, total,
       dimension_rows, trade_package_id, rate_source, ai_locks
     FROM library_items WHERE section_id = ? AND ${pageClause} AND ${rangeClause}${queryClause}
     ORDER BY position ASC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return {
    items: rows.map(fromItemRow),
    totalCount: countRows[0]?.count || 0,
    pricedCount: countRows[0]?.priced_count || 0,
  };
}

export async function listLibrarySampleSections(libraryId: string, limit = 12): Promise<LibrarySampleSectionRef[]> {
  const db = await requireDb();
  const rows = await db.select<Array<{
    library_id: string;
    folder_id: string;
    folder_name: string;
    section_id: string;
    section_order_ref?: string | null;
    section_name: string;
    page_id?: string | null;
    page_order_ref?: string | null;
    page_name?: string | null;
    item_count: number;
    priced_count: number;
  }>>(
    `SELECT i.library_id,
       i.folder_id,
       f.name AS folder_name,
       i.section_id,
       s.order_ref AS section_order_ref,
       s.name AS section_name,
       i.page_id,
       p.order_ref AS page_order_ref,
       p.name AS page_name,
       COUNT(*) AS item_count,
       SUM(CASE WHEN i.type IN ('PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM') THEN 1 ELSE 0 END) AS priced_count
     FROM library_items i
     INNER JOIN library_folders f ON f.id = i.folder_id
     INNER JOIN library_sections s ON s.id = i.section_id
     LEFT JOIN library_pages p ON p.id = i.page_id
     WHERE i.library_id = ?
     GROUP BY i.library_id, i.folder_id, f.name, i.section_id, s.order_ref, s.name, i.page_id, p.order_ref, p.name
     ORDER BY priced_count DESC, item_count DESC, f.position ASC, s.position ASC, COALESCE(p.position, -1) ASC
     LIMIT ?`,
    [libraryId, limit]
  );

  return rows.map((row) => ({
    libraryId: row.library_id,
    folderId: row.folder_id,
    folderName: row.folder_name,
    sectionId: row.section_id,
    sectionOrderRef: row.section_order_ref || undefined,
    sectionName: row.section_name,
    pageId: row.page_id || null,
    pageOrderRef: row.page_order_ref || undefined,
    pageName: row.page_name || undefined,
    itemCount: row.item_count || 0,
    pricedCount: row.priced_count || 0,
  }));
}

export async function searchLibraryItems(options: SearchLibraryItemsOptions): Promise<{ items: LibrarySearchResult[]; totalCount: number }> {
  const db = await requireDb();
  const query = options.query.trim().toLowerCase();
  if (!query) return { items: [], totalCount: 0 };

  const scopeClauses: string[] = [];
  const scopeParams: unknown[] = [];
  if (options.includeLibrary) {
    scopeClauses.push('i.library_id = ?');
    scopeParams.push(options.libraryId);
  }
  if (options.includeFolder && options.folderId) {
    scopeClauses.push('i.folder_id = ?');
    scopeParams.push(options.folderId);
  }
  if (options.includeSection && options.sectionId) {
    scopeClauses.push('i.section_id = ?');
    scopeParams.push(options.sectionId);
  }
  if (scopeClauses.length === 0) {
    scopeClauses.push('i.library_id = ?');
    scopeParams.push(options.libraryId);
  }

  const where = `(${scopeClauses.join(' OR ')}) AND i.search_text LIKE ?`;
  const params = [...scopeParams, `%${query}%`];
  const limit = options.limit ?? 200;
  const offset = options.offset ?? 0;
  const rows = await db.select<SearchItemRow[]>(
    `SELECT i.id, i.library_id, i.folder_id, f.name AS folder_name, i.section_id, s.name AS section_name,
       i.page_id, p.name AS page_name, i.type, i.reference, i.description, i.unit, i.quantity,
       i.quantity_decimals, i.rate, i.total, i.dimension_rows, i.trade_package_id, i.rate_source,
       i.ai_locks, COUNT(*) OVER() AS total_count
     FROM library_items i
     INNER JOIN library_folders f ON f.id = i.folder_id
     INNER JOIN library_sections s ON s.id = i.section_id
     LEFT JOIN library_pages p ON p.id = i.page_id
     WHERE ${where}
     ORDER BY f.position ASC, s.position ASC, COALESCE(p.position, -1) ASC, i.position ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    totalCount: rows[0]?.total_count || 0,
    items: rows.map((row) => ({
      ...fromItemRow(row),
      libraryId: row.library_id,
      folderId: row.folder_id,
      folderName: row.folder_name,
      sectionId: row.section_id,
      sectionName: row.section_name,
      pageId: row.page_id || null,
      pageName: row.page_name || null,
    })),
  };
}

export async function appendLibraryItems(ids: { libraryId: string; folderId: string; sectionId: string; pageId?: string | null }, items: BoQItem[], refreshStats = true): Promise<void> {
  if (items.length === 0) return;
  const db = await requireDb();
  const rows = await db.select<Array<{ max_position: number | null }>>(
    'SELECT MAX(position) AS max_position FROM library_items WHERE section_id = ? AND page_id IS ?',
    [ids.sectionId, ids.pageId || null]
  );
  let position = (rows[0]?.max_position ?? -1) + 1;
  const updatedAt = new Date().toISOString();
  const columns = `(
    id, library_id, folder_id, section_id, page_id, position, type, reference, description,
    unit, quantity, quantity_decimals, rate, total, dimension_rows, trade_package_id,
    rate_source, ai_locks, rate_build_up, search_text, updated_at
  )`;
  const rowsToInsert = items.map((item) => toDbItemRow(item, ids, position++, updatedAt));
  for (let start = 0; start < rowsToInsert.length; start += 40) {
    const chunk = rowsToInsert.slice(start, start + 40);
    const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    await db.execute(
      `INSERT INTO library_items ${columns} VALUES ${placeholders}`,
      chunk.flat()
    );
  }
  if (refreshStats) await refreshLibraryStats(db, [ids.libraryId]);
}

export async function upsertLibraryItem(ids: { libraryId: string; folderId: string; sectionId: string; pageId?: string | null }, item: BoQItem, itemIdx?: number): Promise<void> {
  const db = await requireDb();
  const position = itemIdx ?? ((await db.select<Array<{ max_position: number | null }>>(
    'SELECT MAX(position) AS max_position FROM library_items WHERE section_id = ? AND page_id IS ?',
    [ids.sectionId, ids.pageId || null]
  ))[0]?.max_position ?? -1) + 1;
  await db.execute(
    `INSERT INTO library_items (
      id, library_id, folder_id, section_id, page_id, position, type, reference, description,
      unit, quantity, quantity_decimals, rate, total, dimension_rows, trade_package_id,
      rate_source, ai_locks, rate_build_up, search_text, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      type = excluded.type, reference = excluded.reference, description = excluded.description,
      unit = excluded.unit, quantity = excluded.quantity, quantity_decimals = excluded.quantity_decimals,
      rate = excluded.rate, total = excluded.total, dimension_rows = excluded.dimension_rows,
      trade_package_id = excluded.trade_package_id, rate_source = excluded.rate_source,
      ai_locks = excluded.ai_locks, rate_build_up = excluded.rate_build_up, search_text = excluded.search_text, updated_at = excluded.updated_at`,
    toDbItemRow(item, ids, position, new Date().toISOString())
  );
  await refreshLibraryStats(db, [ids.libraryId]);
}

export async function deleteLibraryItem(itemId: string): Promise<void> {
  const db = await requireDb();
  const rows = await db.select<Array<{ library_id: string }>>('SELECT library_id FROM library_items WHERE id = ? LIMIT 1', [itemId]);
  await db.execute('DELETE FROM library_items WHERE id = ?', [itemId]);
  if (rows[0]?.library_id) await refreshLibraryStats(db, [rows[0].library_id]);
}

export async function replaceLibraryItems(ids: { libraryId: string; folderId: string; sectionId: string; pageId?: string | null }, items: BoQItem[]): Promise<void> {
  const db = await requireDb();
  await db.execute('DELETE FROM library_items WHERE section_id = ? AND page_id IS ?', [ids.sectionId, ids.pageId || null]);
  await appendLibraryItems(ids, items);
  await refreshLibraryStats(db, [ids.libraryId]);
}

export async function importLibrariesToRepository(libraries: ItemLibrary[], lockImported: boolean): Promise<ItemLibrary[]> {
  const db = await requireDb();
  for (let index = 0; index < libraries.length; index += 1) {
    const library = libraries[index];
    const updatedAt = new Date().toISOString();
    await db.execute('DELETE FROM library_catalogs WHERE id = ?', [library.id]);
    const countRows = await db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM library_catalogs');
    const resolvedPermissions = {
      allowExportAll: lockImported ? false : (library.permissions?.allowExportAll ?? !library.exportLocked),
      allowExportFolders: library.permissions?.allowExportFolders ?? true,
      allowExportSections: library.permissions?.allowExportSections ?? true,
      allowLibraryEditing: library.permissions?.allowLibraryEditing ?? true,
    };
    await db.execute(
      `INSERT INTO library_catalogs (
        id, position, name, export_locked, favorite,
        allow_export_all, allow_export_folders, allow_export_sections, allow_library_editing,
        governance_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        library.id,
        countRows[0]?.count || 0,
        library.name,
        resolvedPermissions.allowExportAll ? 0 : 1,
        library.favorite ? 1 : 0,
        resolvedPermissions.allowExportAll ? 1 : 0,
        resolvedPermissions.allowExportFolders ? 1 : 0,
        resolvedPermissions.allowExportSections ? 1 : 0,
        resolvedPermissions.allowLibraryEditing ? 1 : 0,
        library.governance ? JSON.stringify(library.governance) : null,
        updatedAt,
      ]
    );
    for (let folderIndex = 0; folderIndex < (library.folders || []).length; folderIndex += 1) {
      const folder = library.folders[folderIndex];
      await db.execute(
        'INSERT INTO library_folders (id, library_id, position, order_ref, name, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [folder.id, library.id, folderIndex, folder.orderRef || null, folder.name, updatedAt]
      );
      const insertSectionTree = async (section: LibrarySection, sectionIndex: number, parentSectionId?: string) => {
        await db.execute(
          'INSERT INTO library_sections (id, library_id, folder_id, parent_section_id, position, order_ref, name, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [section.id, library.id, folder.id, parentSectionId || section.parentSectionId || null, sectionIndex, section.orderRef || null, section.name, updatedAt]
        );
        if (section.pages?.length) {
          for (let pageIndex = 0; pageIndex < section.pages.length; pageIndex += 1) {
            const page = section.pages[pageIndex];
            await db.execute(
              'INSERT INTO library_pages (id, library_id, folder_id, section_id, position, order_ref, name, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [page.id, library.id, folder.id, section.id, pageIndex, page.orderRef || null, page.name || null, updatedAt]
            );
            await appendLibraryItems({ libraryId: library.id, folderId: folder.id, sectionId: section.id, pageId: page.id }, page.items as BoQItem[], false);
          }
        } else if (section.items?.length) {
          await appendLibraryItems({ libraryId: library.id, folderId: folder.id, sectionId: section.id }, section.items as BoQItem[], false);
        }
        for (let childIndex = 0; childIndex < (section.subSections || []).length; childIndex += 1) {
          await insertSectionTree(section.subSections![childIndex], childIndex, section.id);
        }
      };
      for (let sectionIndex = 0; sectionIndex < (folder.sections || []).length; sectionIndex += 1) {
        await insertSectionTree(folder.sections[sectionIndex], sectionIndex);
      }
    }
    await refreshLibraryStats(db, [library.id]);
  }
  return refreshLibrariesFromDb(db);
}

export async function exportLibrariesFromRepository(libraryIds: string[], permissions?: ItemLibrary['permissions']): Promise<ItemLibrary[]> {
  const catalogs = await listLibraryCatalogs();
  const selected = catalogs.filter((library) => libraryIds.includes(library.id));
  const rebuilt: ItemLibrary[] = [];
  for (const library of selected) {
    const folders: LibraryFolder[] = [];
    for (const folder of library.folders || []) {
      const sections: LibrarySection[] = [];
      for (const section of folder.sections || []) {
        sections.push(await rebuildSection(section));
      }
      folders.push({ ...folder, sections });
    }
    rebuilt.push(applyLibraryPermissions({ ...library, folders }, permissions));
  }
  return rebuilt;
}

async function rebuildSection(section: LibrarySection): Promise<LibrarySection> {
  const pages: LibraryPage[] = [];
  for (const page of section.pages || []) {
    const result = await listLibraryItems({ sectionId: section.id, pageId: page.id, limit: 2147483647 });
    pages.push({ ...page, items: result.items as any });
  }
  const sectionItems = pages.length
    ? []
    : (await listLibraryItems({ sectionId: section.id, limit: 2147483647 })).items;
  const subSections: LibrarySection[] = [];
  for (const child of section.subSections || []) {
    subSections.push(await rebuildSection(child));
  }
  return { ...section, items: sectionItems as any, pages, subSections };
}

export async function exportLibraryFolderFromRepository(libraryId: string, folderId: string, permissions?: ItemLibrary['permissions']): Promise<ItemLibrary | null> {
  const catalogs = await listLibraryCatalogs();
  const library = catalogs.find((entry) => entry.id === libraryId);
  const folder = library?.folders?.find((entry) => entry.id === folderId);
  if (!library || !folder) return null;

  const sections: LibrarySection[] = [];
  for (const section of folder.sections || []) {
    sections.push(await rebuildSection(section));
  }

  return applyLibraryPermissions({
    ...library,
    folders: [{ ...folder, sections }],
  }, permissions);
}

export async function exportLibrarySectionFromRepository(libraryId: string, folderId: string, sectionId: string, permissions?: ItemLibrary['permissions']): Promise<ItemLibrary | null> {
  const catalogs = await listLibraryCatalogs();
  const library = catalogs.find((entry) => entry.id === libraryId);
  const folder = library?.folders?.find((entry) => entry.id === folderId);
  const section = folder?.sections?.find((entry) => entry.id === sectionId);
  if (!library || !folder || !section) return null;

  return applyLibraryPermissions({
    ...library,
    folders: [{
      ...folder,
      sections: [await rebuildSection(section)],
    }],
  }, permissions);
}

export function isPricedLibraryItem(item: BoQItem) {
  return PRICED_TYPES.has(item.type);
}
