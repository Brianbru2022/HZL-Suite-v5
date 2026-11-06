import type { ItemLibrary } from '../types';
import { getDatabase } from './appPersistence';
import { deleteLibrary, importLibrariesToRepository, renameLibrary } from './libraryRepository';

export const AH_SMM7_WORK_LIBRARY_ID = 'builtin-smm7-work-ah-edition';
export const AH_SMM7_RATES_LIBRARY_ID = 'builtin-franklin-andrews-smm-ah-edition';
const LEGACY_LIBRARY_ID = 'builtin-smm7-ah-edition';
const LEGACY_ITEM_COUNT = 12955;
const EXPECTED_COUNTS: Record<string, number> = {
  [AH_SMM7_WORK_LIBRARY_ID]: 376,
  [AH_SMM7_RATES_LIBRARY_ID]: 13132,
};

let pending: Promise<ItemLibrary[] | null> | null = null;

/** Install the two bundled AH sources without overwriting user edits. */
export function ensureAhSmm7Library(): Promise<ItemLibrary[] | null> {
  if (pending) return pending;
  pending = (async () => {
    const db = await getDatabase();
    if (!db) return null;
    const existing = await db.select<Array<{ id: string; name: string; item_count: number }>>(
      `SELECT c.id, c.name, (SELECT COUNT(*) FROM library_items i WHERE i.library_id = c.id) AS item_count
       FROM library_catalogs c WHERE c.id IN (?, ?, ?)`,
      [AH_SMM7_WORK_LIBRARY_ID, AH_SMM7_RATES_LIBRARY_ID, LEGACY_LIBRARY_ID],
    );
    const existingCounts = new Map(existing.map((row) => [row.id, row.item_count]));
    const preservedLegacy = existing.find((row) => row.id === LEGACY_LIBRARY_ID)?.name === 'Previous combined SMM7 [AH Edition]';
    if (Object.entries(EXPECTED_COUNTS).every(([id, count]) => existingCounts.get(id) === count)
      && (!existingCounts.has(LEGACY_LIBRARY_ID) || preservedLegacy)) return null;

    // Keep the historical data out of the initial Home bundle and normal starts.
    const { default: bundled } = await import('../data/smm7-ah-edition.json');
    const libraries = bundled as ItemLibrary[];
    const missing = libraries.filter((library) => existingCounts.get(library.id) !== EXPECTED_COUNTS[library.id]);
    let result: ItemLibrary[] | null = null;
    if (missing.length) result = await importLibrariesToRepository(missing, false);

    if (existingCounts.has(LEGACY_LIBRARY_ID)) {
      const counts = await db.select<Array<{ item_count: number; folder_count: number; catalog_updated_at: string; last_item_updated_at: string | null }>>(
        `SELECT
          (SELECT COUNT(*) FROM library_items WHERE library_id = ?) AS item_count,
          (SELECT COUNT(*) FROM library_folders WHERE library_id = ?) AS folder_count,
          (SELECT updated_at FROM library_catalogs WHERE id = ?) AS catalog_updated_at,
          (SELECT MAX(updated_at) FROM library_items WHERE library_id = ?) AS last_item_updated_at`,
        [LEGACY_LIBRARY_ID, LEGACY_LIBRARY_ID, LEGACY_LIBRARY_ID, LEGACY_LIBRARY_ID],
      );
      const importDurationMs = Date.parse(counts[0]?.last_item_updated_at || '') - Date.parse(counts[0]?.catalog_updated_at || '');
      // A later row edit changes its timestamp. Keep modified legacy copies for review.
      result = counts[0]?.item_count === LEGACY_ITEM_COUNT && counts[0]?.folder_count === 2
        && importDurationMs >= 0 && importDurationMs < 10 * 60_000
        ? await deleteLibrary(LEGACY_LIBRARY_ID)
        : await renameLibrary(LEGACY_LIBRARY_ID, 'Previous combined SMM7 [AH Edition]');
    }
    return result;
  })().catch((error) => {
    pending = null;
    throw error;
  });
  return pending;
}
