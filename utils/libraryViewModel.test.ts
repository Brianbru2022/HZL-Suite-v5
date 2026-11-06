import { describe, expect, it } from 'vitest';
import type { BoQItem, LibrarySection } from '../types';
import {
  canEditLibrary,
  filterLibrarySectionsForSearch,
  findLibrarySectionNode,
  findLibrarySectionParentContext,
  flattenLibrarySections,
  flattenLibrarySectionsWithContext,
  getLibraryPricedCount,
  isLibrarySectionDescendant,
  getVisibleLibraryRows,
  inferParentSectionOrderRefCandidates,
  safeExportFilename,
  sortLibrariesForDisplay,
  sortLibraryNodes,
  sortLibrarySections,
} from './libraryViewModel';

const item = (id: string, type: BoQItem['type'], description = id): BoQItem => ({
  id,
  type,
  reference: '',
  description,
  unit: '',
  quantity: 0,
  rate: 0,
  total: 0,
});

const section = (id: string, overrides: Partial<LibrarySection> = {}): LibrarySection => ({
  id,
  name: id,
  items: [],
  subSections: [],
  ...overrides,
});

describe('libraryViewModel helpers', () => {
  it('sorts nodes by explicit position before order reference/name', () => {
    const sorted = sortLibraryNodes([
      { id: 'b', position: 2, orderRef: '1' },
      { id: 'a', position: 1, orderRef: '99' },
    ]);
    expect(sorted.map((entry) => entry.id)).toEqual(['a', 'b']);
  });

  it('sorts library sections by reference before saved position', () => {
    const sorted = sortLibrarySections([
      section('203.120', {
        orderRef: '203.120',
        position: 1,
        subSections: [
          section('203.120.020', { orderRef: '203.120.020', position: 1 }),
          section('203.120.010', { orderRef: '203.120.010', position: 2 }),
        ],
      }),
      section('203.110', { orderRef: '203.110', position: 2 }),
    ]);

    expect(sorted.map((entry) => entry.id)).toEqual(['203.110', '203.120']);
    expect(sorted[1].subSections?.map((entry) => entry.id)).toEqual(['203.120.010', '203.120.020']);
  });

  it('flattens nested sections with parent context', () => {
    const sections = [
      section('3A', { subSections: [section('3.010')] }),
      section('3B'),
    ];
    expect(flattenLibrarySections(sections).map((section) => section.id)).toEqual(['3A', '3.010', '3B']);
    const contexts = flattenLibrarySectionsWithContext(sections);
    expect(contexts.map((entry) => [entry.section.id, entry.depth, entry.parent?.id || null])).toEqual([
      ['3A', 0, null],
      ['3.010', 1, '3A'],
      ['3B', 0, null],
    ]);
  });

  it('finds nested sections and parent contexts without flattening the tree', () => {
    const sections = [
      section('3A', { subSections: [section('3.010', { subSections: [section('3.011')] })] }),
      section('3B'),
    ];

    expect(findLibrarySectionNode(sections, '3.011')?.id).toBe('3.011');
    expect(findLibrarySectionParentContext(sections, '3.011')?.parent?.id).toBe('3.010');
    expect(findLibrarySectionNode(sections, 'missing')).toBeUndefined();
  });

  it('detects descendant sections for circular move prevention', () => {
    const root = section('3A', { subSections: [section('3.010', { subSections: [section('3.011')] })] });

    expect(isLibrarySectionDescendant(root, '3.011')).toBe(true);
    expect(isLibrarySectionDescendant(root, '3B')).toBe(false);
  });

  it('derives reference parent candidates for nested QSP style refs', () => {
    expect(inferParentSectionOrderRefCandidates('3.011A')).toEqual(['3.011', '3.01', '3']);
    expect(inferParentSectionOrderRefCandidates('3.011')).toEqual(['3.01', '3']);
  });

  it('keeps child heading rows hidden when a parent heading is collapsed', () => {
    const rows = [
      item('general', 'GENERAL_HEADING'),
      item('major', 'MAJOR_HEADING'),
      item('priced', 'PRICED'),
      item('next', 'GENERAL_HEADING'),
    ];
    expect(getVisibleLibraryRows(rows, { general: true }).map((row) => row.item.id)).toEqual(['general', 'next']);
  });

  it('counts priced items from metadata before falling back to loaded items', () => {
    const library = {
      folders: [{
        id: 'folder',
        name: 'Folder',
        sections: [
          section('a', { pricedCount: 12 }),
          section('b', { items: [item('p', 'PRICED'), item('c', 'COMMENT')] }),
        ],
      }],
    };
    expect(getLibraryPricedCount(library)).toBe(13);
  });

  it('sorts favourite libraries first and normalizes compact names', () => {
    const sorted = sortLibrariesForDisplay([
      { id: 'b', name: 'LibraryB', folders: [] },
      { id: 'a', name: 'LibraryA', favorite: true, folders: [] },
    ] as any);
    expect(sorted.map((library) => library.id)).toEqual(['a', 'b']);
  });

  it('filters sections while preserving matching ancestors', () => {
    const result = filterLibrarySectionsForSearch([
      section('root', { orderRef: '3A', name: 'Site readiness', subSections: [section('child', { orderRef: '3.010', name: 'Access readiness' })] }),
    ], 'access');
    expect(result).toHaveLength(1);
    expect(result[0].subSections?.map((section) => section.id)).toEqual(['child']);
  });

  it('normalizes export file names and library edit permissions', () => {
    expect(safeExportFilename('Folder: 3 / Site * Prep')).toBe('folder-3-site-prep');
    expect(canEditLibrary({ permissions: { allowLibraryEditing: false } })).toBe(false);
    expect(canEditLibrary({ permissions: {} })).toBe(true);
  });
});
