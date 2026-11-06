import { describe, expect, it } from 'vitest';
import type { BoQItem, ItemLibrary } from '../types';
import bundled from '../data/nrm2-e-edition.json';
import costAdviser from '../data/costadviser-smm7-bq.json';
import { getLibraryInsertItems } from './libraryInsert';

const library = bundled as ItemLibrary;

describe('bundled E-Edition NRM2 library', () => {
  it('preserves the source hierarchy, counts and historical rate basis', () => {
    const sections = library.folders.flatMap((folder) => folder.sections);
    const rows = sections.flatMap((section) => section.items as BoQItem[]);
    expect(library.name).toBe('NRM2 [E-Edition]');
    expect(library.folders).toHaveLength(34);
    expect(sections).toHaveLength(221);
    expect(rows).toHaveLength(12911);
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
    expect(rows.filter((row) => row.type === 'PRICED')).toHaveLength(9902);
    expect(sections.every((section) => section.items[0]?.type === 'GENERAL_HEADING')).toBe(true);
    expect(rows.every((row) => row.quantity === 0 && row.total === 0)).toBe(true);
    expect(library.governance?.rateDate).toBe('2021-04-27');
    expect((costAdviser as ItemLibrary).name).toBe('SMM7 [CA-Edition]');
  });

  it('inserts the source heading and comment with a selected priced variant', () => {
    const rows = library.folders[0].sections[0].items as BoQItem[];
    const priced = rows.find((row) => row.type === 'PRICED');
    expect(priced).toBeDefined();
    expect(getLibraryInsertItems(rows, priced!.id, 'WITH_MISSING_PARENTS').map((row) => row.type)).toEqual([
      'GENERAL_HEADING', 'MAJOR_HEADING', 'COMMENT', 'PRICED',
    ]);
    expect(getLibraryInsertItems(rows, rows[2].id, 'FROM_COMMENT').map((row) => row.type)).toEqual([
      'GENERAL_HEADING', 'MAJOR_HEADING', 'COMMENT', 'PRICED', 'PRICED', 'PRICED',
    ]);
  });
});
