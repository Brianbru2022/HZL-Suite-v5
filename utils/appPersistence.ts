import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import type Database from '@tauri-apps/plugin-sql';
import type { AppraisalHouseTypeLibraryItem, AppraisalRateLibraryItem, DevelopmentAppraisal, ItemLibrary, Project, TradePackage, WorkspaceFolder } from '../types';
import { DEFAULT_APP_SETTINGS, normalizeAppSettings, type AppSettings } from './appSettings';
import {
  APPRAISALS_LOCAL_STORAGE_KEY,
  APPRAISAL_HOUSE_TYPES_LOCAL_STORAGE_KEY,
  APPRAISAL_RATES_LOCAL_STORAGE_KEY,
  normalizeAppraisalHouseTypeLibraryItems,
  normalizeAppraisalRateLibraryItems,
  normalizeDevelopmentAppraisals,
} from './appraisal';
import { normalizeWorkspaceFolders, WORKSPACE_FOLDERS_LOCAL_STORAGE_KEY } from './workspaceFolders';
import { AGREED_APPRAISAL_RATE_BASIS_VERSION } from './appraisalInfrastructureRatePacks';

const STORAGE_VERSION = 11;
const NORMALIZED_LIBRARY_SCHEMA_VERSION = 1;
const MAX_STARTUP_LIBRARY_MIGRATION_BYTES = 5_000_000;
export const PERSISTENCE_DB_PATH = 'sqlite:qs-pro.db';
const DB_PATH = PERSISTENCE_DB_PATH;
const STATE_BLOB_KEY = 'workspace';
const SESSION_STATE_KEY = 'session_state';
const APP_SETTINGS_META_KEY = 'app_settings_v1';
const APP_SETTINGS_LOCAL_KEY = 'qs-pro-app-settings-v1';
const PERSISTED_KEYS = {
  projects: `qs-pro-projects-v${STORAGE_VERSION}`,
  libraries: `qs-pro-libraries-v${STORAGE_VERSION}`,
  trades: `qs-pro-trades-v${STORAGE_VERSION}`,
  appraisals: APPRAISALS_LOCAL_STORAGE_KEY,
  appraisalHouseTypes: APPRAISAL_HOUSE_TYPES_LOCAL_STORAGE_KEY,
  appraisalRates: APPRAISAL_RATES_LOCAL_STORAGE_KEY,
  workspaceFolders: WORKSPACE_FOLDERS_LOCAL_STORAGE_KEY,
};
const PREVIOUS_KEYS = {
  projects: `qs-pro-projects-v${STORAGE_VERSION - 1}`,
  libraries: `qs-pro-libraries-v${STORAGE_VERSION - 1}`,
  trades: `qs-pro-trades-v${STORAGE_VERSION - 1}`,
};
const STATE_ROW_KEYS = ['projects', 'libraries', 'trades', 'appraisals', 'appraisalHouseTypes', 'appraisalRates', 'workspaceFolders'] as const;
const ENTITY_TABLES = {
  projects: 'projects_state',
  libraries: 'libraries_state',
  trades: 'trades_state',
  appraisals: 'appraisals_state',
  appraisalHouseTypes: 'appraisal_house_types_state',
  appraisalRates: 'appraisal_rates_state',
  workspaceFolders: 'workspace_folders_state',
} as const;

export type PersistedStateKey = typeof STATE_ROW_KEYS[number];

export type PersistenceBackend = 'sqlite' | 'localStorage';

export interface PersistedAppState {
  projects: Project[];
  libraries: ItemLibrary[];
  trades: TradePackage[];
  appraisals: DevelopmentAppraisal[];
  appraisalHouseTypes: AppraisalHouseTypeLibraryItem[];
  appraisalRates: AppraisalRateLibraryItem[];
  workspaceFolders: WorkspaceFolder[];
  backend: PersistenceBackend;
  migratedFromLocalStorage: boolean;
  /** Editable records whose saved pricing schedule predates the agreed-rate migration. */
  appraisalRateBasisMigrationIds?: string[];
}

export interface PersistedSessionState {
  lastProjectId: string | null;
  lastBillId: string | null;
  wasOpen: boolean;
  updatedAt: string;
}

interface StateRow {
  key: PersistedStateKey;
  value: string;
}

interface MetaRow {
  value: string;
}

interface EntityRow {
  id: string;
  position: number;
  value: string;
}

interface LibraryCatalogRow {
  id: string;
  position: number;
  name: string;
  export_locked: number;
  favorite?: number;
  allow_export_all?: number;
  allow_export_folders?: number;
  allow_export_sections?: number;
  allow_library_editing?: number;
  governance_json?: string | null;
  item_count: number;
  priced_count: number;
  section_count: number;
  folder_count: number;
  stats_library_id?: string | null;
}

interface LibraryFolderRow {
  id: string;
  library_id: string;
  position: number;
  order_ref?: string | null;
  name: string;
  item_count: number;
  priced_count: number;
  section_count: number;
}

interface LibrarySectionRow {
  id: string;
  folder_id: string;
  parent_section_id?: string | null;
  position: number;
  order_ref?: string | null;
  name: string;
  item_count: number;
  priced_count: number;
  page_count: number;
}

interface LibraryPageRow {
  id: string;
  section_id: string;
  position: number;
  order_ref?: string | null;
  name?: string | null;
  item_count: number;
  priced_count: number;
}

interface PersistableState {
  projects: Project[];
  libraries: ItemLibrary[];
  trades: TradePackage[];
  appraisals: DevelopmentAppraisal[];
  appraisalHouseTypes: AppraisalHouseTypeLibraryItem[];
  appraisalRates: AppraisalRateLibraryItem[];
  workspaceFolders: WorkspaceFolder[];
}

export interface EntityMutation {
  upsertIds?: string[];
  deleteIds?: string[];
  /** Use the existing full reconciliation path when rows were inserted, deleted, or reordered. */
  reconcile?: boolean;
}

export interface PersistStateOptions {
  changedKeys?: PersistedStateKey[];
  entityMutations?: Partial<Record<PersistedStateKey, EntityMutation>>;
}

type PersistableEntity = Project | ItemLibrary | TradePackage | DevelopmentAppraisal | AppraisalHouseTypeLibraryItem | AppraisalRateLibraryItem | WorkspaceFolder;

let databasePromise: Promise<Database | null> | null = null;
let databaseInstance: Database | null = null;
let sqliteWriteQueue: Promise<void> = Promise.resolve();

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripJsonByteOrderMark(raw: string): string {
  return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
}

export function parseStoredJson<T>(raw: string): T {
  const normalizedRaw = stripJsonByteOrderMark(raw);
  try {
    return JSON.parse(normalizedRaw) as T;
  } catch {
    const decompressed = decompressFromUTF16(normalizedRaw);
    if (typeof decompressed === 'string' && decompressed.trim()) {
      return JSON.parse(stripJsonByteOrderMark(decompressed)) as T;
    }
    throw new Error('Stored data could not be parsed');
  }
}

function hasLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readLocalStorageItem(key: string) {
  if (!hasLocalStorage()) return null;
  return window.localStorage.getItem(key);
}

function writeLocalStorageItem(key: string, value: unknown) {
  if (!hasLocalStorage()) return;
  window.localStorage.setItem(key, compressToUTF16(JSON.stringify(value)));
}

function readWithMigration<T>(currentKey: string, previousKey: string, parse: (s: string) => T): T | null {
  try {
    const current = readLocalStorageItem(currentKey);
    if (current) return parse(current);

    const previous = readLocalStorageItem(previousKey);
    if (previous) {
      const data = parse(previous);
      writeLocalStorageItem(currentKey, data);
      return data;
    }
  } catch (error) {
    console.warn('Storage read/migrate failed', error);
  }

  return null;
}

function readLocalAppraisals(): DevelopmentAppraisal[] {
  try {
    const raw = readLocalStorageItem(PERSISTED_KEYS.appraisals);
    return raw ? normalizeDevelopmentAppraisals(parseStoredJson<DevelopmentAppraisal[]>(raw)) : [];
  } catch (error) {
    console.warn('Appraisals local storage read failed', error);
    return [];
  }
}

function readLocalAppraisalHouseTypes(): AppraisalHouseTypeLibraryItem[] {
  try {
    const raw = readLocalStorageItem(PERSISTED_KEYS.appraisalHouseTypes);
    return raw ? normalizeAppraisalHouseTypeLibraryItems(parseStoredJson<AppraisalHouseTypeLibraryItem[]>(raw)) : [];
  } catch (error) {
    console.warn('Appraisal house types local storage read failed', error);
    return [];
  }
}

function readLocalAppraisalRates(): AppraisalRateLibraryItem[] {
  try {
    const raw = readLocalStorageItem(PERSISTED_KEYS.appraisalRates);
    return raw ? normalizeAppraisalRateLibraryItems(parseStoredJson<AppraisalRateLibraryItem[]>(raw)) : [];
  } catch (error) {
    console.warn('Appraisal rates local storage read failed', error);
    return [];
  }
}

function readLocalWorkspaceFolders(): WorkspaceFolder[] {
  try {
    const raw = readLocalStorageItem(PERSISTED_KEYS.workspaceFolders);
    return raw ? normalizeWorkspaceFolders(parseStoredJson<WorkspaceFolder[]>(raw)) : [];
  } catch (error) {
    console.warn('Workspace folders local storage read failed', error);
    return [];
  }
}

function readLegacyLocalState(): PersistableState {
  return {
    projects: readWithMigration(PERSISTED_KEYS.projects, PREVIOUS_KEYS.projects, (s) => parseStoredJson<Project[]>(s)) ?? [],
    libraries: readWithMigration(PERSISTED_KEYS.libraries, PREVIOUS_KEYS.libraries, (s) => parseStoredJson<ItemLibrary[]>(s)) ?? [],
    trades: readWithMigration(PERSISTED_KEYS.trades, PREVIOUS_KEYS.trades, (s) => parseStoredJson<TradePackage[]>(s)) ?? [],
    appraisals: readLocalAppraisals(),
    appraisalHouseTypes: readLocalAppraisalHouseTypes(),
    appraisalRates: readLocalAppraisalRates(),
    workspaceFolders: readLocalWorkspaceFolders(),
  };
}

function hasMeaningfulState(state: PersistableState) {
  return state.projects.length > 0 ||
    state.libraries.length > 0 ||
    state.trades.length > 0 ||
    state.appraisals.length > 0 ||
    state.appraisalHouseTypes.length > 0 ||
    state.appraisalRates.length > 0 ||
    state.workspaceFolders.length > 0;
}

function emptyState(): PersistableState {
  return { projects: [], libraries: [], trades: [], appraisals: [], appraisalHouseTypes: [], appraisalRates: [], workspaceFolders: [] };
}

function rowsToState(rows: StateRow[]): PersistableState {
  const state = emptyState();

  for (const row of rows) {
    if (row.key === 'projects') {
      state.projects = parseStoredJson<Project[]>(row.value);
    } else if (row.key === 'libraries') {
      state.libraries = parseStoredJson<ItemLibrary[]>(row.value);
    } else if (row.key === 'trades') {
      state.trades = parseStoredJson<TradePackage[]>(row.value);
    } else if (row.key === 'appraisals') {
      state.appraisals = normalizeDevelopmentAppraisals(parseStoredJson(row.value));
    } else if (row.key === 'appraisalHouseTypes') {
      state.appraisalHouseTypes = normalizeAppraisalHouseTypeLibraryItems(parseStoredJson(row.value));
    } else if (row.key === 'appraisalRates') {
      state.appraisalRates = normalizeAppraisalRateLibraryItems(parseStoredJson(row.value));
    } else if (row.key === 'workspaceFolders') {
      state.workspaceFolders = normalizeWorkspaceFolders(parseStoredJson(row.value));
    }
  }

  return state;
}

async function ensureSchema(db: Database) {
  await db.execute('PRAGMA journal_mode = WAL');
  await db.execute('PRAGMA synchronous = NORMAL');
  await db.execute('PRAGMA foreign_keys = ON');
  await db.execute('PRAGMA busy_timeout = 15000');
  await db.execute(
    `CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`
  );
  await db.execute(
    `CREATE TABLE IF NOT EXISTS projects_state (
      id TEXT PRIMARY KEY,
      position INTEGER NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`
  );
  await db.execute(
    `CREATE TABLE IF NOT EXISTS libraries_state (
      id TEXT PRIMARY KEY,
      position INTEGER NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`
  );
  await db.execute(
    `CREATE TABLE IF NOT EXISTS trades_state (
      id TEXT PRIMARY KEY,
      position INTEGER NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`
  );
  await db.execute(
    `CREATE TABLE IF NOT EXISTS appraisals_state (
      id TEXT PRIMARY KEY,
      position INTEGER NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`
  );
  await db.execute(
    `CREATE TABLE IF NOT EXISTS appraisal_house_types_state (
      id TEXT PRIMARY KEY,
      position INTEGER NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`
  );
  await db.execute(
    `CREATE TABLE IF NOT EXISTS appraisal_rates_state (
      id TEXT PRIMARY KEY,
      position INTEGER NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`
  );
  await db.execute(
    `CREATE TABLE IF NOT EXISTS workspace_folders_state (
      id TEXT PRIMARY KEY,
      position INTEGER NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`
  );
  await db.execute(
    `CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`
  );
  await db.execute(
    `CREATE TABLE IF NOT EXISTS library_catalogs (
      id TEXT PRIMARY KEY,
      position INTEGER NOT NULL,
      name TEXT NOT NULL,
      export_locked INTEGER NOT NULL DEFAULT 0,
      favorite INTEGER NOT NULL DEFAULT 0,
      allow_export_all INTEGER NOT NULL DEFAULT 1,
      allow_export_folders INTEGER NOT NULL DEFAULT 1,
      allow_export_sections INTEGER NOT NULL DEFAULT 1,
      allow_library_editing INTEGER NOT NULL DEFAULT 1,
      governance_json TEXT,
      updated_at TEXT NOT NULL
    )`
  );
  const catalogColumns = await db.select<Array<{ name: string }>>('PRAGMA table_info(library_catalogs)');
  if (!catalogColumns.some((column) => column.name === 'favorite')) {
    await db.execute('ALTER TABLE library_catalogs ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0');
  }
  const ensureCatalogColumn = async (name: string) => {
    if (!catalogColumns.some((column) => column.name === name)) {
      await db.execute(`ALTER TABLE library_catalogs ADD COLUMN ${name} INTEGER NOT NULL DEFAULT 1`);
    }
  };
  await ensureCatalogColumn('allow_export_all');
  await ensureCatalogColumn('allow_export_folders');
  await ensureCatalogColumn('allow_export_sections');
  await ensureCatalogColumn('allow_library_editing');
  if (!catalogColumns.some((column) => column.name === 'governance_json')) {
    await db.execute('ALTER TABLE library_catalogs ADD COLUMN governance_json TEXT');
  }
  await db.execute(
    `CREATE TABLE IF NOT EXISTS library_folders (
      id TEXT PRIMARY KEY,
      library_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      order_ref TEXT,
      name TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(library_id) REFERENCES library_catalogs(id) ON DELETE CASCADE
    )`
  );
  await db.execute(
    `CREATE TABLE IF NOT EXISTS library_sections (
      id TEXT PRIMARY KEY,
      library_id TEXT NOT NULL,
      folder_id TEXT NOT NULL,
      parent_section_id TEXT,
      position INTEGER NOT NULL,
      order_ref TEXT,
      name TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(library_id) REFERENCES library_catalogs(id) ON DELETE CASCADE,
      FOREIGN KEY(folder_id) REFERENCES library_folders(id) ON DELETE CASCADE,
      FOREIGN KEY(parent_section_id) REFERENCES library_sections(id) ON DELETE CASCADE
    )`
  );
  const sectionColumns = await db.select<Array<{ name: string }>>('PRAGMA table_info(library_sections)');
  if (!sectionColumns.some((column) => column.name === 'parent_section_id')) {
    await db.execute('ALTER TABLE library_sections ADD COLUMN parent_section_id TEXT');
  }
  await db.execute(
    `CREATE TABLE IF NOT EXISTS library_pages (
      id TEXT PRIMARY KEY,
      library_id TEXT NOT NULL,
      folder_id TEXT NOT NULL,
      section_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      order_ref TEXT,
      name TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(library_id) REFERENCES library_catalogs(id) ON DELETE CASCADE,
      FOREIGN KEY(folder_id) REFERENCES library_folders(id) ON DELETE CASCADE,
      FOREIGN KEY(section_id) REFERENCES library_sections(id) ON DELETE CASCADE
    )`
  );
  await db.execute(
    `CREATE TABLE IF NOT EXISTS library_items (
      id TEXT PRIMARY KEY,
      library_id TEXT NOT NULL,
      folder_id TEXT NOT NULL,
      section_id TEXT NOT NULL,
      page_id TEXT,
      position INTEGER NOT NULL,
      type TEXT NOT NULL,
      reference TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      unit TEXT NOT NULL DEFAULT '',
      quantity REAL NOT NULL DEFAULT 0,
      quantity_decimals INTEGER,
      rate REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      dimension_rows TEXT,
      trade_package_id TEXT,
      rate_source TEXT,
      ai_locks TEXT,
      rate_build_up TEXT,
      search_text TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      FOREIGN KEY(library_id) REFERENCES library_catalogs(id) ON DELETE CASCADE,
      FOREIGN KEY(folder_id) REFERENCES library_folders(id) ON DELETE CASCADE,
      FOREIGN KEY(section_id) REFERENCES library_sections(id) ON DELETE CASCADE,
      FOREIGN KEY(page_id) REFERENCES library_pages(id) ON DELETE CASCADE
    )`
  );
  const itemColumns = await db.select<Array<{ name: string }>>('PRAGMA table_info(library_items)');
  if (!itemColumns.some((column) => column.name === 'rate_build_up')) {
    await db.execute('ALTER TABLE library_items ADD COLUMN rate_build_up TEXT');
  }
  await db.execute(
    `CREATE TABLE IF NOT EXISTS library_stats (
      library_id TEXT PRIMARY KEY,
      folder_count INTEGER NOT NULL DEFAULT 0,
      section_count INTEGER NOT NULL DEFAULT 0,
      item_count INTEGER NOT NULL DEFAULT 0,
      priced_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(library_id) REFERENCES library_catalogs(id) ON DELETE CASCADE
    )`
  );
  await db.execute('CREATE INDEX IF NOT EXISTS idx_library_folders_library ON library_folders(library_id, position)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_library_sections_folder ON library_sections(folder_id, parent_section_id, position)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_library_pages_section ON library_pages(section_id, position)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_library_items_section ON library_items(section_id, page_id, position)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_library_items_library ON library_items(library_id)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_library_items_library_type ON library_items(library_id, type)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_library_items_folder ON library_items(folder_id)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_library_items_folder_type ON library_items(folder_id, type)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_library_items_page ON library_items(page_id)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_library_items_section_type ON library_items(section_id, type)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_library_items_section_page_type ON library_items(section_id, page_id, type)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_library_items_search ON library_items(section_id, search_text)');
}

export async function getDatabase(): Promise<Database | null> {
  if (databaseInstance) return databaseInstance;

  if (!databasePromise) {
    databasePromise = (async () => {
      try {
        const { default: Database } = await import('@tauri-apps/plugin-sql');
        const db = await Database.load(DB_PATH);
        await ensureSchema(db);
        databaseInstance = db;
        return db;
      } catch (error) {
        console.warn('SQLite unavailable, falling back to localStorage', error);
        databasePromise = null;
        return null;
      }
    })();
  }

  return databasePromise;
}

async function readEntityTable<T extends PersistableEntity>(db: Database, table: string): Promise<T[]> {
  const rows = await db.select<EntityRow[]>(
    `SELECT id, position, value FROM ${table} ORDER BY position ASC, updated_at ASC`
  );
  return rows.map((row) => parseStoredJson<T>(row.value));
}

function stripLibraryItems(library: ItemLibrary): ItemLibrary {
  let libraryItemCount = 0;
  let librarySectionCount = 0;
  return {
    ...library,
    storageMode: 'sqlite',
    folders: (library.folders || []).map((folder) => ({
      ...folder,
      sectionCount: (folder.sections || []).length,
      sections: (folder.sections || []).map((section) => {
        librarySectionCount += 1;
        const pages = section.pages || [];
        const sectionItemCount = pages.length
          ? pages.reduce((count, page) => count + (page.items?.length || 0), 0)
          : (section.items?.length || 0);
        libraryItemCount += sectionItemCount;
        return {
          ...section,
          itemCount: sectionItemCount,
          pricedCount: getLegacyPricedCount(section),
          pageCount: pages.length,
          items: [],
          pages: pages.map((page) => {
            const pageItemCount = page.items?.length || 0;
            return {
              ...page,
              itemCount: pageItemCount,
              pricedCount: (page.items || []).filter((item: any) => ['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(item.type)).length,
              items: [],
            };
          }),
        };
      }),
    })).map((folder) => ({
      ...folder,
      itemCount: (folder.sections || []).reduce((count, section) => count + (section.itemCount || 0), 0),
    })),
    itemCount: libraryItemCount,
    sectionCount: librarySectionCount,
  };
}

function getLegacyPricedCount(section: any) {
  const items = section?.pages?.length
    ? section.pages.flatMap((page: any) => page.items || [])
    : (section?.items || []);
  return items.filter((item: any) => ['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(item.type)).length;
}

function itemSearchText(item: any) {
  return [item.reference, item.description, item.unit, item.type]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

async function insertLibraryItemBatch(db: Database, rows: any[][]) {
  if (rows.length === 0) return;
  const columns = `(
    id, library_id, folder_id, section_id, page_id, position, type, reference, description,
    unit, quantity, quantity_decimals, rate, total, dimension_rows, trade_package_id,
    rate_source, ai_locks, rate_build_up, search_text, updated_at
  )`;
  await db.execute('BEGIN IMMEDIATE');
  try {
    for (let start = 0; start < rows.length; start += 40) {
      const chunk = rows.slice(start, start + 40);
      const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      await db.execute(
        `INSERT INTO library_items ${columns} VALUES ${placeholders}
        ON CONFLICT(id) DO UPDATE SET
          library_id = excluded.library_id,
          folder_id = excluded.folder_id,
          section_id = excluded.section_id,
          page_id = excluded.page_id,
          position = excluded.position,
          type = excluded.type,
          reference = excluded.reference,
          description = excluded.description,
          unit = excluded.unit,
          quantity = excluded.quantity,
          quantity_decimals = excluded.quantity_decimals,
          rate = excluded.rate,
          total = excluded.total,
          dimension_rows = excluded.dimension_rows,
          trade_package_id = excluded.trade_package_id,
          rate_source = excluded.rate_source,
          ai_locks = excluded.ai_locks,
          rate_build_up = excluded.rate_build_up,
          search_text = excluded.search_text,
          updated_at = excluded.updated_at`,
        chunk.flat()
      );
    }
    await db.execute('COMMIT');
  } catch (error) {
    await db.execute('ROLLBACK');
    throw error;
  }
}

async function refreshMissingLibraryStats(db: Database, libraryIds: string[]) {
  const ids = [...new Set(libraryIds)].filter(Boolean);
  if (ids.length === 0) return;
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

async function migrateLibraryBlobToNormalized(db: Database, library: ItemLibrary, position: number) {
  const updatedAt = new Date().toISOString();
  await db.execute('DELETE FROM library_catalogs WHERE id = ?', [library.id]);
  await db.execute(
    `INSERT INTO library_catalogs (
      id, position, name, export_locked, favorite,
      allow_export_all, allow_export_folders, allow_export_sections, allow_library_editing,
      governance_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      library.id,
      position,
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

  let itemRows: any[][] = [];
  const flushItems = async () => {
    await insertLibraryItemBatch(db, itemRows);
    itemRows = [];
  };

  for (let folderIndex = 0; folderIndex < (library.folders || []).length; folderIndex += 1) {
    const folder = library.folders[folderIndex];
    await db.execute(
      'INSERT INTO library_folders (id, library_id, position, order_ref, name, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [folder.id, library.id, folderIndex, folder.orderRef || null, folder.name, updatedAt]
    );

    const insertSectionTree = async (section: any, sectionIndex: number, parentSectionId?: string) => {
      await db.execute(
        'INSERT INTO library_sections (id, library_id, folder_id, parent_section_id, position, order_ref, name, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [section.id, library.id, folder.id, parentSectionId || section.parentSectionId || null, sectionIndex, section.orderRef || null, section.name, updatedAt]
      );

      const sectionItems = section.items || [];
      for (let itemIndex = 0; itemIndex < sectionItems.length; itemIndex += 1) {
        const item: any = sectionItems[itemIndex];
        const rowId = item.id || `${section.id}-item-${itemIndex}`;
        itemRows.push([
          rowId,
          library.id,
          folder.id,
          section.id,
          null,
          itemIndex,
          item.type || 'PRICED',
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
          item.rateBuildUp ? JSON.stringify(item.rateBuildUp) : null,
          itemSearchText(item),
          updatedAt,
        ]);
        if (itemRows.length >= 1000) await flushItems();
      }

      for (let pageIndex = 0; pageIndex < (section.pages || []).length; pageIndex += 1) {
        const page = section.pages![pageIndex];
        await db.execute(
          'INSERT INTO library_pages (id, library_id, folder_id, section_id, position, order_ref, name, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [page.id, library.id, folder.id, section.id, pageIndex, page.orderRef || null, page.name || null, updatedAt]
        );
        const pageItems = page.items || [];
        for (let itemIndex = 0; itemIndex < pageItems.length; itemIndex += 1) {
          const item: any = pageItems[itemIndex];
          const rowId = item.id || `${page.id}-item-${itemIndex}`;
          itemRows.push([
            rowId,
            library.id,
            folder.id,
            section.id,
            page.id,
            itemIndex,
            item.type || 'PRICED',
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
          item.rateBuildUp ? JSON.stringify(item.rateBuildUp) : null,
          itemSearchText(item),
            updatedAt,
          ]);
          if (itemRows.length >= 1000) await flushItems();
        }
      }
      for (let childIndex = 0; childIndex < (section.subSections || []).length; childIndex += 1) {
        await insertSectionTree(section.subSections[childIndex], childIndex, section.id);
      }
    };

    for (let sectionIndex = 0; sectionIndex < (folder.sections || []).length; sectionIndex += 1) {
      await insertSectionTree(folder.sections[sectionIndex], sectionIndex);
    }
  }
  await flushItems();
}

export async function readNormalizedLibraries(db: Database, options: { includeItemCounts?: boolean } = {}): Promise<ItemLibrary[]> {
  const includeItemCounts = options.includeItemCounts ?? true;
  const catalogRows = await db.select<LibraryCatalogRow[]>(
    `SELECT c.id, c.position, c.name, c.export_locked, c.favorite,
       c.allow_export_all, c.allow_export_folders, c.allow_export_sections, c.allow_library_editing, c.governance_json,
       COALESCE(st.item_count, 0) AS item_count,
       COALESCE(st.priced_count, 0) AS priced_count,
       COALESCE(st.section_count, 0) AS section_count,
       COALESCE(st.folder_count, 0) AS folder_count,
       st.library_id AS stats_library_id
     FROM library_catalogs c
     LEFT JOIN library_stats st ON st.library_id = c.id
     ORDER BY c.position ASC`
  );
  if (catalogRows.length === 0) return [];
  const missingStatsLibraryIds = includeItemCounts
    ? []
    : catalogRows.filter((row) => !row.stats_library_id).map((row) => row.id);
  if (missingStatsLibraryIds.length > 0) {
    await refreshMissingLibraryStats(db, missingStatsLibraryIds);
    return readNormalizedLibraries(db, options);
  }

  const [
    folderRows,
    sectionRows,
    pageRows,
    sectionCountRows,
    pageItemCountRows,
  ] = await Promise.all([
    db.select<LibraryFolderRow[]>(
      `SELECT f.id, f.library_id, f.position, f.order_ref, f.name,
         0 AS item_count,
         0 AS priced_count,
         0 AS section_count
       FROM library_folders f
       ORDER BY f.position ASC`
    ),
    db.select<LibrarySectionRow[]>(
      `SELECT s.id, s.folder_id, s.parent_section_id, s.position, s.order_ref, s.name,
         0 AS item_count,
         0 AS priced_count,
         COALESCE(pc.page_count, 0) AS page_count
       FROM library_sections s
       LEFT JOIN (
         SELECT section_id, COUNT(*) AS page_count
         FROM library_pages
         GROUP BY section_id
       ) pc ON pc.section_id = s.id
       ORDER BY s.position ASC`
    ),
    db.select<LibraryPageRow[]>(
      `SELECT p.id, p.section_id, p.position, p.order_ref, p.name,
         0 AS item_count,
         0 AS priced_count
       FROM library_pages p
       ORDER BY p.position ASC`
    ),
    includeItemCounts
      ? db.select<Array<{ section_id: string; item_count: number; priced_count: number }>>(
          `SELECT section_id,
             COUNT(*) AS item_count,
             SUM(CASE WHEN type IN ('PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM') THEN 1 ELSE 0 END) AS priced_count
           FROM library_items
           GROUP BY section_id`
        )
      : Promise.resolve([]),
    includeItemCounts
      ? db.select<Array<{ page_id: string; item_count: number; priced_count: number }>>(
          `SELECT page_id,
             COUNT(*) AS item_count,
             SUM(CASE WHEN type IN ('PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM') THEN 1 ELSE 0 END) AS priced_count
           FROM library_items
           WHERE page_id IS NOT NULL
           GROUP BY page_id`
        )
      : Promise.resolve([]),
  ]);

  const sectionCountsById = new Map<string, { itemCount: number; pricedCount: number }>();
  sectionCountRows.forEach((row) => {
    sectionCountsById.set(row.section_id, {
      itemCount: row.item_count || 0,
      pricedCount: row.priced_count || 0,
    });
  });

  const pageCountsById = new Map<string, { itemCount: number; pricedCount: number }>();
  pageItemCountRows.forEach((row) => {
    pageCountsById.set(row.page_id, {
      itemCount: row.item_count || 0,
      pricedCount: row.priced_count || 0,
    });
  });

  const pagesBySection = new Map<string, any[]>();
  pageRows.forEach((page) => {
    const rows = pagesBySection.get(page.section_id) || [];
    const counts = pageCountsById.get(page.id);
    rows.push({
      id: page.id,
      position: page.position,
      orderRef: page.order_ref || undefined,
      name: page.name || undefined,
      items: [],
      itemCount: counts?.itemCount || 0,
      pricedCount: counts?.pricedCount || 0,
    });
    pagesBySection.set(page.section_id, rows);
  });

  const sectionEntriesById = new Map<string, any>();
  const rootSectionsByFolder = new Map<string, any[]>();
  const folderCountsById = new Map<string, { itemCount: number; pricedCount: number; sectionCount: number }>();
  sectionRows.forEach((section) => {
    const counts = sectionCountsById.get(section.id);
    const itemCount = counts?.itemCount || 0;
    const pricedCount = counts?.pricedCount || 0;
    const entry = {
      id: section.id,
      position: section.position,
      parentSectionId: section.parent_section_id || undefined,
      orderRef: section.order_ref || undefined,
      name: section.name,
      items: [],
      pages: pagesBySection.get(section.id) || [],
      subSections: [],
      itemCount,
      pricedCount,
      pageCount: section.page_count || 0,
    };
    sectionEntriesById.set(section.id, entry);
    const folderCounts = folderCountsById.get(section.folder_id) || { itemCount: 0, pricedCount: 0, sectionCount: 0 };
    folderCounts.itemCount += itemCount;
    folderCounts.pricedCount += pricedCount;
    folderCounts.sectionCount += 1;
    folderCountsById.set(section.folder_id, folderCounts);
  });
  sectionRows.forEach((section) => {
    const entry = sectionEntriesById.get(section.id);
    if (!entry) return;
    if (section.parent_section_id && sectionEntriesById.has(section.parent_section_id)) {
      sectionEntriesById.get(section.parent_section_id).subSections.push(entry);
      return;
    }
    const rows = rootSectionsByFolder.get(section.folder_id) || [];
    rows.push(entry);
    rootSectionsByFolder.set(section.folder_id, rows);
  });

  const foldersByLibrary = new Map<string, any[]>();
  const catalogCountsById = new Map<string, { itemCount: number; pricedCount: number; sectionCount: number }>();
  folderRows.forEach((folder) => {
    const rows = foldersByLibrary.get(folder.library_id) || [];
    const counts = folderCountsById.get(folder.id) || { itemCount: 0, pricedCount: 0, sectionCount: 0 };
    rows.push({
      id: folder.id,
      position: folder.position,
      orderRef: folder.order_ref || undefined,
      name: folder.name,
      sections: rootSectionsByFolder.get(folder.id) || [],
      itemCount: counts.itemCount,
      pricedCount: counts.pricedCount,
      sectionCount: counts.sectionCount,
    });
    foldersByLibrary.set(folder.library_id, rows);
    const catalogCounts = catalogCountsById.get(folder.library_id) || { itemCount: 0, pricedCount: 0, sectionCount: 0 };
    catalogCounts.itemCount += counts.itemCount;
    catalogCounts.pricedCount += counts.pricedCount;
    catalogCounts.sectionCount += counts.sectionCount;
    catalogCountsById.set(folder.library_id, catalogCounts);
  });

  return catalogRows.map((catalog) => ({
    id: catalog.id,
    position: catalog.position,
    name: catalog.name,
    governance: catalog.governance_json ? parseStoredJson(catalog.governance_json) : undefined,
    exportLocked: Boolean(catalog.export_locked),
    favorite: Boolean(catalog.favorite),
    permissions: {
      allowExportAll: catalog.allow_export_all !== 0 && !catalog.export_locked,
      allowExportFolders: catalog.allow_export_folders !== 0,
      allowExportSections: catalog.allow_export_sections !== 0,
      allowLibraryEditing: catalog.allow_library_editing !== 0,
    },
    storageMode: 'sqlite',
    itemCount: includeItemCounts ? (catalogCountsById.get(catalog.id)?.itemCount || 0) : (catalog.item_count || 0),
    pricedCount: includeItemCounts ? (catalogCountsById.get(catalog.id)?.pricedCount || 0) : (catalog.priced_count || 0),
    sectionCount: includeItemCounts ? (catalogCountsById.get(catalog.id)?.sectionCount || 0) : (catalog.section_count || 0),
    folders: foldersByLibrary.get(catalog.id) || [],
  }));
}

async function migrateLibrariesToNormalizedIfNeeded(db: Database, options: { includeItemCounts?: boolean } = {}): Promise<ItemLibrary[] | null> {
  const schemaRows = await db.select<Array<{ value: string }>>(
    'SELECT value FROM app_meta WHERE key = ? LIMIT 1',
    ['normalized_library_schema_version']
  );
  const catalogCountRows = await db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM library_catalogs');
  const hasCatalogs = (catalogCountRows[0]?.count || 0) > 0;
  const schemaVersion = schemaRows[0]?.value ? parseStoredJson(schemaRows[0].value) : null;
  if (schemaVersion === String(NORMALIZED_LIBRARY_SCHEMA_VERSION) && hasCatalogs) {
    return readNormalizedLibraries(db, options);
  }

  const legacyRows = await db.select<EntityRow[]>(
    `SELECT id, position, value FROM ${ENTITY_TABLES.libraries} ORDER BY position ASC, updated_at ASC`
  );
  if (legacyRows.length === 0) {
    await writeMetaRow(db, 'normalized_library_schema_version', String(NORMALIZED_LIBRARY_SCHEMA_VERSION));
    return hasCatalogs ? readNormalizedLibraries(db, options) : null;
  }

  const hasLargeLegacyLibraries = legacyRows.some((row) => row.value.length > MAX_STARTUP_LIBRARY_MIGRATION_BYTES);
  if (hasLargeLegacyLibraries) {
    const normalizedLibraries = schemaVersion === String(NORMALIZED_LIBRARY_SCHEMA_VERSION) && hasCatalogs ? await readNormalizedLibraries(db) : [];
    const normalizedIds = new Set(normalizedLibraries.map((library) => library.id));
    const legacyMetadata = legacyRows
      .map((row) => stripLibraryItems(parseStoredJson<ItemLibrary>(row.value)))
      .filter((library) => !normalizedIds.has(library.id));
    return [...normalizedLibraries, ...legacyMetadata].sort((a, b) => {
      const aRow = legacyRows.find((row) => row.id === a.id);
      const bRow = legacyRows.find((row) => row.id === b.id);
      return (aRow?.position ?? 0) - (bRow?.position ?? 0);
    });
  }

  for (const row of legacyRows) {
    const existingRows = await db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM library_catalogs WHERE id = ?', [row.id]);
    if ((existingRows[0]?.count || 0) > 0) continue;
    const library = parseStoredJson<ItemLibrary>(row.value);
    await migrateLibraryBlobToNormalized(db, library, row.position);
  }
  await writeEntityTable(db, ENTITY_TABLES.libraries, legacyRows.map((row) => stripLibraryItems(parseStoredJson<ItemLibrary>(row.value))));
  await writeMetaRow(db, 'normalized_library_schema_version', String(NORMALIZED_LIBRARY_SCHEMA_VERSION));
  return readNormalizedLibraries(db, options);
}

async function writeEntityTable<T extends PersistableEntity>(db: Database, table: string, entities: T[]) {
  const updatedAt = new Date().toISOString();
  const existingRows = await db.select<Array<{ id: string; position: number; value: string }>>(
    `SELECT id, position, value FROM ${table}`,
  );
  const existingById = new Map(existingRows.map((row) => [row.id, row]));

  for (let index = 0; index < entities.length; index += 1) {
    const entity = table === ENTITY_TABLES.libraries ? stripLibraryItems(entities[index] as ItemLibrary) as T : entities[index];
    const value = JSON.stringify(entity);
    const existing = existingById.get(entity.id);
    if (existing?.position === index && existing.value === value) continue;
    await db.execute(
      `INSERT INTO ${table} (id, position, value, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         position = excluded.position,
         value = excluded.value,
         updated_at = excluded.updated_at`,
      [entity.id, index, value, updatedAt]
    );
  }

  if (entities.length === 0) {
    await db.execute(`DELETE FROM ${table}`);
    return;
  }

  const placeholders = entities.map(() => '?').join(', ');
  await db.execute(
    `DELETE FROM ${table} WHERE id NOT IN (${placeholders})`,
    entities.map((entity) => entity.id)
  );
}

function entityTableForKey(key: PersistedStateKey) {
  return ENTITY_TABLES[key];
}

function entitiesForKey(state: PersistableState, key: PersistedStateKey): PersistableEntity[] {
  if (key === 'projects') return state.projects;
  if (key === 'libraries') return state.libraries.map(stripLibraryItems);
  if (key === 'trades') return state.trades;
  if (key === 'appraisals') return normalizeDevelopmentAppraisals(state.appraisals);
  if (key === 'appraisalHouseTypes') return normalizeAppraisalHouseTypeLibraryItems(state.appraisalHouseTypes);
  if (key === 'appraisalRates') return normalizeAppraisalRateLibraryItems(state.appraisalRates);
  return normalizeWorkspaceFolders(state.workspaceFolders);
}

async function writeEntityMutation(
  db: Database,
  key: PersistedStateKey,
  state: PersistableState,
  mutation?: EntityMutation,
) {
  const entities = entitiesForKey(state, key);
  const table = entityTableForKey(key);
  if (!mutation?.upsertIds?.length && !mutation?.deleteIds?.length) {
    await writeEntityTable(db, table, entities);
    return;
  }

  if (mutation.reconcile) {
    await writeEntityTable(db, table, entities);
    return;
  }

  const updatedAt = new Date().toISOString();
  const byId = new Map(entities.map((entity, position) => [entity.id, { entity, position }]));
  const deletedIds = [...new Set(mutation.deleteIds || [])];
  for (const id of deletedIds) {
    await db.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
  }

  const deletedIdSet = new Set(deletedIds);
  for (const id of new Set(mutation.upsertIds || [])) {
    if (deletedIdSet.has(id)) continue;
    const entry = byId.get(id);
    if (!entry) {
      await db.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
      continue;
    }
    await db.execute(
      `INSERT INTO ${table} (id, position, value, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         position = excluded.position,
         value = excluded.value,
         updated_at = excluded.updated_at`,
      [entry.entity.id, entry.position, JSON.stringify(entry.entity), updatedAt]
    );
  }
}

function queueSqliteMutation<T>(operation: () => Promise<T>): Promise<T> {
  const nextOperation = sqliteWriteQueue
    .catch(() => undefined)
    .then(operation);

  sqliteWriteQueue = nextOperation.then(
    () => undefined,
    () => undefined
  );

  return nextOperation;
}

async function writeMetaRow(db: Database, key: string, value: unknown) {
  const updatedAt = new Date().toISOString();
  await db.execute(
    'INSERT INTO app_meta (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
    [key, JSON.stringify(value), updatedAt]
  );
}

async function readMetaRow<T>(db: Database, key: string): Promise<T | null> {
  const rows = await db.select<MetaRow[]>('SELECT value FROM app_meta WHERE key = ? LIMIT 1', [key]);
  if (rows.length === 0) return null;
  return parseStoredJson<T>(rows[0].value);
}

async function hydrateEntityTablesIfNeeded(db: Database): Promise<PersistableState | null> {
  const existingProjects = await db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM projects_state');
  const existingLibraries = await db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM libraries_state');
  const existingTrades = await db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM trades_state');
  const existingAppraisals = await db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM appraisals_state');
  const existingAppraisalHouseTypes = await db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM appraisal_house_types_state');
  const existingAppraisalRates = await db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM appraisal_rates_state');
  const existingWorkspaceFolders = await db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM workspace_folders_state');
  const hasEntityRows =
    (existingProjects[0]?.count || 0) > 0 ||
    (existingLibraries[0]?.count || 0) > 0 ||
    (existingTrades[0]?.count || 0) > 0 ||
    (existingAppraisals[0]?.count || 0) > 0 ||
    (existingAppraisalHouseTypes[0]?.count || 0) > 0 ||
    (existingAppraisalRates[0]?.count || 0) > 0 ||
    (existingWorkspaceFolders[0]?.count || 0) > 0;

  if (hasEntityRows) return null;

  const legacyRows = await db.select<StateRow[]>(
    `SELECT key, value FROM app_state WHERE key IN (${STATE_ROW_KEYS.map(() => '?').join(', ')})`,
    [...STATE_ROW_KEYS]
  );
  if (legacyRows.length > 0) {
    const state = rowsToState(legacyRows);
    await writeEntityTable(db, ENTITY_TABLES.projects, state.projects);
    await writeEntityTable(db, ENTITY_TABLES.libraries, state.libraries);
    await writeEntityTable(db, ENTITY_TABLES.trades, state.trades);
    await writeEntityTable(db, ENTITY_TABLES.appraisals, state.appraisals);
    await writeEntityTable(db, ENTITY_TABLES.appraisalHouseTypes, state.appraisalHouseTypes);
    await writeEntityTable(db, ENTITY_TABLES.appraisalRates, state.appraisalRates);
    await writeEntityTable(db, ENTITY_TABLES.workspaceFolders, state.workspaceFolders);
    return state;
  }

  const blobRows = await db.select<Array<{ value: string }>>(
    'SELECT value FROM app_state WHERE key = ? LIMIT 1',
    [STATE_BLOB_KEY]
  );
  if (blobRows.length > 0) {
    const parsedState = parseStoredJson<Partial<PersistableState>>(blobRows[0].value);
    const state: PersistableState = {
      projects: parsedState.projects || [],
      libraries: parsedState.libraries || [],
      trades: parsedState.trades || [],
      appraisals: normalizeDevelopmentAppraisals(parsedState.appraisals || []),
      appraisalHouseTypes: normalizeAppraisalHouseTypeLibraryItems(parsedState.appraisalHouseTypes || []),
      appraisalRates: normalizeAppraisalRateLibraryItems(parsedState.appraisalRates || []),
      workspaceFolders: normalizeWorkspaceFolders(parsedState.workspaceFolders || []),
    };
    await writeEntityTable(db, ENTITY_TABLES.projects, state.projects);
    await writeEntityTable(db, ENTITY_TABLES.libraries, state.libraries);
    await writeEntityTable(db, ENTITY_TABLES.trades, state.trades);
    await writeEntityTable(db, ENTITY_TABLES.appraisals, state.appraisals);
    await writeEntityTable(db, ENTITY_TABLES.appraisalHouseTypes, state.appraisalHouseTypes);
    await writeEntityTable(db, ENTITY_TABLES.appraisalRates, state.appraisalRates);
    await writeEntityTable(db, ENTITY_TABLES.workspaceFolders, state.workspaceFolders);
    return state;
  }

  const localState = readLegacyLocalState();
  if (hasMeaningfulState(localState)) {
    await writeEntityTable(db, ENTITY_TABLES.projects, localState.projects);
    await writeEntityTable(db, ENTITY_TABLES.libraries, localState.libraries);
    await writeEntityTable(db, ENTITY_TABLES.trades, localState.trades);
    await writeEntityTable(db, ENTITY_TABLES.appraisals, localState.appraisals);
    await writeEntityTable(db, ENTITY_TABLES.appraisalHouseTypes, localState.appraisalHouseTypes);
    await writeEntityTable(db, ENTITY_TABLES.appraisalRates, localState.appraisalRates);
    await writeEntityTable(db, ENTITY_TABLES.workspaceFolders, localState.workspaceFolders);
    return localState;
  }

  return null;
}

async function queueSqliteWrite(
  db: Database,
  state: PersistableState,
  changedKeys: PersistedStateKey[],
  entityMutations: Partial<Record<PersistedStateKey, EntityMutation>> = {},
) {
  await queueSqliteMutation(async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        for (const key of changedKeys) {
          await writeEntityMutation(db, key, state, entityMutations[key]);
        }
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
        const isRetryableLock = message.includes('locked') || message.includes('busy');
        if (!isRetryableLock || attempt === 2) {
          throw error;
        }
        await wait(250 * (attempt + 1));
      }
    }
  });
}

export async function loadPersistedAppState(): Promise<PersistedAppState> {
  const db = await getDatabase();

  if (!db) {
    const localState = readLegacyLocalState();
    return { ...localState, backend: 'localStorage', migratedFromLocalStorage: false };
  }

  try {
    const migratedState = await hydrateEntityTablesIfNeeded(db);
    if (migratedState) {
      const libraries = await migrateLibrariesToNormalizedIfNeeded(db, { includeItemCounts: false }) || migratedState.libraries.map(stripLibraryItems);
      return {
        ...migratedState,
        libraries,
        backend: 'sqlite',
        migratedFromLocalStorage: !(
          migratedState.projects.length === 0 &&
          migratedState.libraries.length === 0 &&
          migratedState.trades.length === 0 &&
          migratedState.appraisals.length === 0 &&
          migratedState.appraisalHouseTypes.length === 0 &&
          migratedState.appraisalRates.length === 0 &&
          migratedState.workspaceFolders.length === 0
        ),
      };
    }

    const normalizedLibraries = await migrateLibrariesToNormalizedIfNeeded(db, { includeItemCounts: false });
    const [projects, blobLibraries, trades, appraisals, appraisalHouseTypes, appraisalRates, workspaceFolders] = await Promise.all([
      readEntityTable<Project>(db, ENTITY_TABLES.projects),
      normalizedLibraries ? Promise.resolve([] as ItemLibrary[]) : readEntityTable<ItemLibrary>(db, ENTITY_TABLES.libraries),
      readEntityTable<TradePackage>(db, ENTITY_TABLES.trades),
      readEntityTable<DevelopmentAppraisal>(db, ENTITY_TABLES.appraisals),
      readEntityTable<AppraisalHouseTypeLibraryItem>(db, ENTITY_TABLES.appraisalHouseTypes),
      readEntityTable<AppraisalRateLibraryItem>(db, ENTITY_TABLES.appraisalRates),
      readEntityTable<WorkspaceFolder>(db, ENTITY_TABLES.workspaceFolders),
    ]);
    const libraries = normalizedLibraries || blobLibraries.map(stripLibraryItems);
    const appraisalRateBasisMigrationIds = appraisals
      .filter(appraisal => !appraisal.frozenAt && !appraisal.unviableMarkedAt
        && (appraisal.kind || 'HOUSE_BUILDING') === 'HOUSE_BUILDING'
        && appraisal.options?.some(option => option.agreedRateBasisVersion !== AGREED_APPRAISAL_RATE_BASIS_VERSION))
      .map(appraisal => appraisal.id);
    let resolvedAppraisals = normalizeDevelopmentAppraisals(appraisals);
    let resolvedAppraisalHouseTypes = normalizeAppraisalHouseTypeLibraryItems(appraisalHouseTypes);
    let resolvedAppraisalRates = normalizeAppraisalRateLibraryItems(appraisalRates);
    let resolvedWorkspaceFolders = normalizeWorkspaceFolders(workspaceFolders);
    if (resolvedAppraisals.length === 0) {
      const localAppraisals = readLocalAppraisals();
      if (localAppraisals.length > 0) {
        await writeEntityTable(db, ENTITY_TABLES.appraisals, localAppraisals);
        resolvedAppraisals = localAppraisals;
      }
    }
    if (resolvedAppraisalHouseTypes.length === 0) {
      const localHouseTypes = readLocalAppraisalHouseTypes();
      if (localHouseTypes.length > 0) {
        await writeEntityTable(db, ENTITY_TABLES.appraisalHouseTypes, localHouseTypes);
        resolvedAppraisalHouseTypes = localHouseTypes;
      }
    }
    if (resolvedAppraisalRates.length === 0) {
      const localRates = readLocalAppraisalRates();
      if (localRates.length > 0) {
        await writeEntityTable(db, ENTITY_TABLES.appraisalRates, localRates);
        resolvedAppraisalRates = localRates;
      }
    }
    if (resolvedWorkspaceFolders.length === 0) {
      const localFolders = readLocalWorkspaceFolders();
      if (localFolders.length > 0) {
        await writeEntityTable(db, ENTITY_TABLES.workspaceFolders, localFolders);
        resolvedWorkspaceFolders = localFolders;
      }
    }

    return {
      projects,
      libraries,
      trades,
      appraisals: resolvedAppraisals,
      appraisalHouseTypes: resolvedAppraisalHouseTypes,
      appraisalRates: resolvedAppraisalRates,
      workspaceFolders: resolvedWorkspaceFolders,
      backend: 'sqlite',
      migratedFromLocalStorage: false,
      appraisalRateBasisMigrationIds,
    };
  } catch (error) {
    console.warn('SQLite read failed, using localStorage fallback', error);
    const localState = readLegacyLocalState();
    return { ...localState, backend: 'localStorage', migratedFromLocalStorage: false };
  }
}

export async function persistAppState(state: PersistableState, options: PersistStateOptions = {}): Promise<PersistenceBackend> {
  const db = await getDatabase();
  const changedKeys = options.changedKeys?.length ? options.changedKeys : [...STATE_ROW_KEYS];

  if (db) {
    try {
      await queueSqliteWrite(db, state, changedKeys, options.entityMutations);
      return 'sqlite';
    } catch (error) {
      console.warn('SQLite write failed, using localStorage fallback', error);
    }
  }

  for (const key of changedKeys) {
    if (key === 'projects') writeLocalStorageItem(PERSISTED_KEYS.projects, state.projects);
    if (key === 'libraries') writeLocalStorageItem(PERSISTED_KEYS.libraries, state.libraries);
    if (key === 'trades') writeLocalStorageItem(PERSISTED_KEYS.trades, state.trades);
    if (key === 'appraisals') writeLocalStorageItem(PERSISTED_KEYS.appraisals, normalizeDevelopmentAppraisals(state.appraisals));
    if (key === 'appraisalHouseTypes') writeLocalStorageItem(PERSISTED_KEYS.appraisalHouseTypes, normalizeAppraisalHouseTypeLibraryItems(state.appraisalHouseTypes));
    if (key === 'appraisalRates') writeLocalStorageItem(PERSISTED_KEYS.appraisalRates, normalizeAppraisalRateLibraryItems(state.appraisalRates));
    if (key === 'workspaceFolders') writeLocalStorageItem(PERSISTED_KEYS.workspaceFolders, normalizeWorkspaceFolders(state.workspaceFolders));
  }
  return 'localStorage';
}

export async function loadPersistedSessionState(): Promise<PersistedSessionState | null> {
  const db = await getDatabase();
  if (!db) return null;

  try {
    return await readMetaRow<PersistedSessionState>(db, SESSION_STATE_KEY);
  } catch (error) {
    console.warn('Session metadata read failed', error);
    return null;
  }
}

export async function persistSessionState(state: PersistedSessionState): Promise<void> {
  const db = await getDatabase();
  if (!db) return;

  try {
    await queueSqliteMutation(() => writeMetaRow(db, SESSION_STATE_KEY, state));
  } catch (error) {
    console.warn('Session metadata write failed', error);
  }
}

export async function loadPersistedAppSettings(): Promise<AppSettings> {
  const db = await getDatabase();
  if (db) {
    try {
      const settings = await readMetaRow<AppSettings>(db, APP_SETTINGS_META_KEY);
      if (settings) return normalizeAppSettings(settings);
    } catch (error) {
      console.warn('App settings metadata read failed', error);
    }
  }

  try {
    const local = readLocalStorageItem(APP_SETTINGS_LOCAL_KEY);
    if (local) return normalizeAppSettings(parseStoredJson<AppSettings>(local));
  } catch (error) {
    console.warn('App settings local read failed', error);
  }

  return DEFAULT_APP_SETTINGS;
}

export async function persistAppSettings(settings: AppSettings): Promise<PersistenceBackend> {
  const normalized = normalizeAppSettings(settings);
  const db = await getDatabase();

  if (db) {
    try {
      await queueSqliteMutation(() => writeMetaRow(db, APP_SETTINGS_META_KEY, normalized));
      return 'sqlite';
    } catch (error) {
      console.warn('App settings metadata write failed, using localStorage fallback', error);
    }
  }

  writeLocalStorageItem(APP_SETTINGS_LOCAL_KEY, normalized);
  return 'localStorage';
}
