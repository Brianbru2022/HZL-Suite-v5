import type { ItemLibrary } from '../types';
import { getDatabase } from './appPersistence';
import { importLibrariesToRepository, renameLibrary } from './libraryRepository';

export const E_NRM2_LIBRARY_ID = 'builtin-nrm2-e-edition';
export const E_NRM2_LIBRARY_NAME = 'NRM2 [E-Edition]';
const EXPECTED_ITEM_COUNT = 12911;
const EXPECTED_FOLDER_COUNT = 34;
const EXPECTED_SECTION_COUNT = 221;

let pending: Promise<ItemLibrary[] | null> | null = null;

/** Install the supplied 2021 CES library once without replacing later item edits. */
export function ensureENrm2Library(): Promise<ItemLibrary[] | null> {
  if (pending) return pending;
  pending = (async () => {
    const db = await getDatabase();
    if (!db) return null;
    const rows = await db.select<Array<{
      name: string;
      item_count: number;
      folder_count: number;
      section_count: number;
      catalog_updated_at: string;
      last_item_updated_at: string | null;
    }>>(
      `SELECT c.name, c.updated_at AS catalog_updated_at,
         (SELECT COUNT(*) FROM library_items WHERE library_id = c.id) AS item_count,
         (SELECT COUNT(*) FROM library_folders WHERE library_id = c.id) AS folder_count,
         (SELECT COUNT(*) FROM library_sections WHERE library_id = c.id) AS section_count,
         (SELECT MAX(updated_at) FROM library_items WHERE library_id = c.id) AS last_item_updated_at
       FROM library_catalogs c WHERE c.id = ?`,
      [E_NRM2_LIBRARY_ID],
    );
    const existing = rows[0];
    if (existing?.item_count === EXPECTED_ITEM_COUNT
      && existing.folder_count === EXPECTED_FOLDER_COUNT
      && existing.section_count === EXPECTED_SECTION_COUNT) {
      return existing.name === E_NRM2_LIBRARY_NAME
        ? null
        : renameLibrary(E_NRM2_LIBRARY_ID, E_NRM2_LIBRARY_NAME);
    }
    if (existing) {
      const importDurationMs = Date.parse(existing.last_item_updated_at || '') - Date.parse(existing.catalog_updated_at || '');
      // Retry an interrupted initial seed; leave later user-edited content in place.
      if (!(importDurationMs >= 0 && importDurationMs < 10 * 60_000)) return null;
    }
    const { default: bundled } = await import('../data/nrm2-e-edition.json');
    return importLibrariesToRepository([bundled as ItemLibrary], false);
  })().catch((error) => {
    pending = null;
    throw error;
  });
  return pending;
}
