import { describe, expect, it } from 'vitest';
import type { BoQItem, ItemLibrary } from '../types';
import bundled from '../data/smm7-e2018-edition.json';
import { getLibraryInsertItems } from './libraryInsert';

const library = bundled as ItemLibrary;

describe('bundled 2018r1 SMM7 library', () => {
  it('preserves the supplied hierarchy, item counts and historical rates', () => {
    const sections = library.folders.flatMap((folder) => folder.sections);
    const rows = sections.flatMap((section) => section.items as BoQItem[]);
    const priced = rows.filter((row) => row.type === 'PRICED');

    expect(library.name).toBe('SMM7 Library [E2018-Edition]');
    expect(library.folders).toHaveLength(17);
    expect(sections).toHaveLength(96);
    expect(rows).toHaveLength(13247);
    expect(priced).toHaveLength(10458);
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
    expect(new Set(priced.map((row) => row.reference)).size).toBe(priced.length);
    expect(sections.every((section) => section.items[0]?.type === 'GENERAL_HEADING')).toBe(true);
    expect(rows.every((row) => row.quantity === 0 && row.total === 0)).toBe(true);
    expect(library.governance?.rateDate).toBe('2017-10-24');
  });

  it('brings the source heading and comment with a priced item', () => {
    const rows = library.folders[0].sections[0].items as BoQItem[];
    const priced = rows.find((row) => row.type === 'PRICED');
    expect(priced).toBeDefined();
    expect(getLibraryInsertItems(rows, priced!.id, 'WITH_MISSING_PARENTS').map((row) => row.type)).toEqual([
      'GENERAL_HEADING', 'MAJOR_HEADING', 'COMMENT', 'PRICED',
    ]);
  });
});
