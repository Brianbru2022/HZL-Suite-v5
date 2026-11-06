import type { ItemLibrary } from '../types';
import { getDatabase } from './appPersistence';
import { importLibrariesToRepository, renameLibrary } from './libraryRepository';

export const COSTADVISER_SMM7_LIBRARY_ID = 'builtin-costadviser-smm7-bq';
export const COSTADVISER_SMM7_LIBRARY_NAME = 'SMM7 [CA-Edition]';
const EXPECTED_ITEM_COUNT = 11483;

let pending: Promise<ItemLibrary[] | null> | null = null;

/** Install the supplied CostAdviser template once; leave user-edited copies alone. */
export function ensureCostAdviserSmm7Library(): Promise<ItemLibrary[] | null> {
  if (pending) return pending;
  pending = (async () => {
    const db = await getDatabase();
    if (!db) return null;
    const rows = await db.select<Array<{
      name: string;
      item_count: number;
      catalog_updated_at: string;
      last_item_updated_at: string | null;
    }>>(
      `SELECT
        (SELECT COUNT(*) FROM library_items WHERE library_id = c.id) AS item_count,
        c.name,
        c.updated_at AS catalog_updated_at,
        (SELECT MAX(updated_at) FROM library_items WHERE library_id = c.id) AS last_item_updated_at
       FROM library_catalogs c WHERE c.id = ?`,
      [COSTADVISER_SMM7_LIBRARY_ID],
    );
    if (rows[0]?.item_count === EXPECTED_ITEM_COUNT) {
      return rows[0].name === COSTADVISER_SMM7_LIBRARY_NAME
        ? null
        : renameLibrary(COSTADVISER_SMM7_LIBRARY_ID, COSTADVISER_SMM7_LIBRARY_NAME);
    }
    if (rows.length) {
      const importDurationMs = Date.parse(rows[0].last_item_updated_at || '') - Date.parse(rows[0].catalog_updated_at || '');
      // Only retry an interrupted initial seed, not a later user edit.
      if (!(importDurationMs >= 0 && importDurationMs < 10 * 60_000)) {
        return rows[0].name === COSTADVISER_SMM7_LIBRARY_NAME
          ? null
          : renameLibrary(COSTADVISER_SMM7_LIBRARY_ID, COSTADVISER_SMM7_LIBRARY_NAME);
      }
    }

    const { default: bundled } = await import('../data/costadviser-smm7-bq.json');
    return importLibrariesToRepository([{ ...(bundled as ItemLibrary), name: COSTADVISER_SMM7_LIBRARY_NAME }], false);
  })().catch((error) => {
    pending = null;
    throw error;
  });
  return pending;
}
