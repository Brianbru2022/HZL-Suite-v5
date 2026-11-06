import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BoQItem } from '../types';

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  readNormalizedLibraries: vi.fn(),
}));

vi.mock('./appPersistence', () => ({
  getDatabase: mocks.getDatabase,
  readNormalizedLibraries: mocks.readNormalizedLibraries,
}));

import {
  appendLibraryItems,
  clearSectionContent,
  countLibraryPricedItems,
  exportLibrariesFromRepository,
  exportLibrarySectionFromRepository,
  importLibrariesToRepository,
  insertLibrarySection,
  listLibraryItemOutline,
  listLibraryItemContext,
  listLibraryItems,
  listLibraryItemsInPositionRange,
  moveLibrarySection,
  reorderLibrarySections,
  searchLibraryItems,
} from './libraryRepository';

function createDbMock() {
  return {
    select: vi.fn(),
    execute: vi.fn().mockResolvedValue(undefined),
  };
}

function pricedItem(id: string, description = id): BoQItem {
  return {
    id,
    type: 'PRICED',
    reference: id.toUpperCase(),
    description,
    unit: 'nr',
    quantity: 1,
    rate: 10,
    total: 10,
  };
}

describe('libraryRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readNormalizedLibraries.mockResolvedValue([]);
  });

  it('resolves filtered or lazily loaded items against their stored family context', async () => {
    const db = createDbMock();
    mocks.getDatabase.mockResolvedValue(db);
    db.select.mockResolvedValue([
      { ...pricedItem('section'), type: 'GENERAL_HEADING' },
      { ...pricedItem('old-family'), type: 'MAJOR_HEADING' },
      { ...pricedItem('old-comment'), type: 'COMMENT' },
      { ...pricedItem('new-family'), type: 'MAJOR_HEADING' },
      { ...pricedItem('new-comment'), type: 'COMMENT' },
      pricedItem('selected'),
    ]);
    expect((await listLibraryItemContext('selected')).map((r) => r.id)).toEqual(['section', 'new-family', 'new-comment', 'selected']);
    expect(db.select).toHaveBeenCalledWith(expect.stringContaining('i.page_id IS selected.page_id'), ['selected']);
  });

  it('fails clearly when the selected stored item has disappeared', async () => {
    const db = createDbMock();
    mocks.getDatabase.mockResolvedValue(db);
    db.select.mockResolvedValue([]);
    await expect(listLibraryItemContext('missing')).rejects.toThrow('no longer available');
  });

  it('prevents moving a section under one of its descendants', async () => {
    const db = createDbMock();
    mocks.getDatabase.mockResolvedValue(db);
    db.select
      .mockResolvedValueOnce([{ id: 'parent', library_id: 'lib', folder_id: 'folder', parent_section_id: null, position: 0 }])
      .mockResolvedValueOnce([{ id: 'child' }]);

    await moveLibrarySection('parent', 'folder', 'child');

    expect(db.execute).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE library_sections SET folder_id = ?'),
      expect.anything()
    );
    expect(mocks.readNormalizedLibraries).toHaveBeenCalledWith(db, { includeItemCounts: false });
  });

  it('reorders sibling sections by writing their requested positions', async () => {
    const db = createDbMock();
    mocks.getDatabase.mockResolvedValue(db);
    db.select
      .mockResolvedValueOnce([{ library_id: 'lib' }])
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ count: 2 }])
      .mockResolvedValueOnce([{ item_count: 3, priced_count: 2 }]);

    await reorderLibrarySections('folder', null, ['b', 'a']);

    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE library_sections SET position = ?, updated_at = ? WHERE id = ? AND folder_id = ? AND parent_section_id IS NULL'),
      [0, expect.any(String), 'b', 'folder']
    );
    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE library_sections SET position = ?, updated_at = ? WHERE id = ? AND folder_id = ? AND parent_section_id IS NULL'),
      [1, expect.any(String), 'a', 'folder']
    );
  });

  it('clears a section contents without deleting the section row', async () => {
    const db = createDbMock();
    mocks.getDatabase.mockResolvedValue(db);
    db.select
      .mockResolvedValueOnce([{ id: 'section', library_id: 'lib', folder_id: 'folder', parent_section_id: null, position: 0 }])
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ count: 2 }])
      .mockResolvedValueOnce([{ item_count: 0, priced_count: 0 }]);

    await clearSectionContent('section');

    expect(db.execute).toHaveBeenCalledWith('DELETE FROM library_items WHERE section_id = ?', ['section']);
    expect(db.execute).toHaveBeenCalledWith('DELETE FROM library_pages WHERE section_id = ?', ['section']);
    expect(db.execute).toHaveBeenCalledWith('UPDATE library_sections SET updated_at = ? WHERE id = ?', [expect.any(String), 'section']);
    expect(db.execute).not.toHaveBeenCalledWith('DELETE FROM library_sections WHERE id = ?', expect.anything());
  });

  it('inserts a library section without reloading the full normalized library tree', async () => {
    const db = createDbMock();
    mocks.getDatabase.mockResolvedValue(db);
    db.select.mockResolvedValueOnce([{ count: 4 }]);

    const inserted = await insertLibrarySection('lib', 'folder', {
      id: 'section-new',
      parentSectionId: 'parent',
      orderRef: 'A.05',
      name: 'New subsection',
      items: [],
      pages: [],
      subSections: [],
    });

    expect(db.select).toHaveBeenCalledWith(
      'SELECT COUNT(*) AS count FROM library_sections WHERE folder_id = ? AND parent_section_id = ?',
      ['folder', 'parent']
    );
    expect(db.execute).toHaveBeenCalledWith(
      'INSERT INTO library_sections (id, library_id, folder_id, parent_section_id, position, order_ref, name, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['section-new', 'lib', 'folder', 'parent', 4, 'A.05', 'New subsection', expect.any(String)]
    );
    expect(mocks.readNormalizedLibraries).not.toHaveBeenCalled();
    expect(inserted).toMatchObject({
      id: 'section-new',
      parentSectionId: 'parent',
      position: 4,
      itemCount: 0,
      pricedCount: 0,
      storageMode: 'sqlite',
    });
  });

  it('paginates section item listing and returns priced counts', async () => {
    const db = createDbMock();
    mocks.getDatabase.mockResolvedValue(db);
    db.select
      .mockResolvedValueOnce([{ count: 2, priced_count: 1 }])
      .mockResolvedValueOnce([
        {
          id: 'i1',
          type: 'PRICED',
          reference: 'A1',
          description: 'Measured item',
          unit: 'nr',
          quantity: 1,
          rate: 10,
          total: 10,
        },
      ]);

    const result = await listLibraryItems({ sectionId: 'section', offset: 50, limit: 25, query: 'measured' });

    expect(db.select).toHaveBeenLastCalledWith(
      expect.stringContaining('ORDER BY position ASC LIMIT ? OFFSET ?'),
      ['section', '%measured%', 25, 50]
    );
    expect(result.totalCount).toBe(2);
    expect(result.pricedCount).toBe(1);
    expect(result.items[0].description).toBe('Measured item');
  });

  it('lists a heading outline with child range end positions', async () => {
    const db = createDbMock();
    mocks.getDatabase.mockResolvedValue(db);
    db.select.mockResolvedValueOnce([
      {
        id: 'h1',
        type: 'GENERAL_HEADING',
        reference: 'A',
        description: 'Groundworks',
        unit: '',
        quantity: 0,
        rate: 0,
        total: 0,
        position: 0,
        total_count: 2,
      },
      {
        id: 'h2',
        type: 'MAJOR_HEADING',
        reference: 'A10',
        description: 'Excavation',
        unit: '',
        quantity: 0,
        rate: 0,
        total: 0,
        position: 12,
        total_count: 2,
      },
      {
        id: 'h1b',
        type: 'GENERAL_HEADING',
        reference: 'B',
        description: 'Concrete',
        unit: '',
        quantity: 0,
        rate: 0,
        total: 0,
        position: 40,
        total_count: 3,
      },
    ]);

    const result = await listLibraryItemOutline({ sectionId: 'section' });

    expect(db.select).toHaveBeenCalledWith(
      expect.stringContaining("type IN ('GENERAL_HEADING', 'MAJOR_HEADING', 'SUB_SECTION', 'MINOR_HEADING', 'COMMENT', 'SUB_COMMENT')"),
      ['section']
    );
    expect(result.items.map((entry) => [entry.id, entry.position, entry.childEndPosition])).toEqual([
      ['h1', 0, 40],
      ['h2', 12, 40],
      ['h1b', 40, null],
    ]);
  });

  it('loads library items inside a position range', async () => {
    const db = createDbMock();
    mocks.getDatabase.mockResolvedValue(db);
    db.select
      .mockResolvedValueOnce([{ count: 3, priced_count: 2 }])
      .mockResolvedValueOnce([{
        id: 'p1',
        type: 'PRICED',
        reference: '1',
        description: 'Measured row',
        unit: 'nr',
        quantity: 1,
        rate: 5,
        total: 5,
      }]);

    const result = await listLibraryItemsInPositionRange({
      sectionId: 'section',
      startPosition: 12,
      endPosition: 40,
      offset: 25,
      limit: 10,
    });

    expect(db.select).toHaveBeenLastCalledWith(
      expect.stringContaining('position >= ? AND position < ?'),
      ['section', 12, 40, 10, 25]
    );
    expect(result.totalCount).toBe(3);
    expect(result.pricedCount).toBe(2);
  });

  it('searches across the requested library/folder/section scopes', async () => {
    const db = createDbMock();
    mocks.getDatabase.mockResolvedValue(db);
    db.select.mockResolvedValueOnce([
      {
        id: 'i1',
        library_id: 'lib',
        folder_id: 'folder',
        folder_name: 'Folder',
        section_id: 'section',
        section_name: 'Section',
        page_id: null,
        page_name: null,
        type: 'PRICED',
        reference: 'A1',
        description: 'Concrete',
        unit: 'm3',
        quantity: 1,
        rate: 10,
        total: 10,
        total_count: 1,
      },
    ]);

    const result = await searchLibraryItems({
      query: 'concrete',
      libraryId: 'lib',
      folderId: 'folder',
      sectionId: 'section',
      includeLibrary: true,
      includeFolder: true,
      includeSection: true,
      limit: 10,
      offset: 5,
    });

    expect(db.select).toHaveBeenCalledWith(
      expect.stringContaining('(i.library_id = ? OR i.folder_id = ? OR i.section_id = ?) AND i.search_text LIKE ?'),
      ['lib', 'folder', 'section', '%concrete%', 10, 5]
    );
    expect(result.totalCount).toBe(1);
    expect(result.items[0].folderName).toBe('Folder');
  });

  it('uses cached priced item totals before falling back to a full count', async () => {
    const cachedDb = createDbMock();
    mocks.getDatabase.mockResolvedValue(cachedDb);
    cachedDb.select.mockResolvedValueOnce([{ priced_count: 123 }]);

    await expect(countLibraryPricedItems('lib')).resolves.toBe(123);
    expect(cachedDb.select).toHaveBeenCalledTimes(1);

    const fallbackDb = createDbMock();
    mocks.getDatabase.mockResolvedValue(fallbackDb);
    fallbackDb.select
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: 7 }])
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ count: 2 }])
      .mockResolvedValueOnce([{ item_count: 10, priced_count: 7 }]);

    await expect(countLibraryPricedItems('lib')).resolves.toBe(7);
    expect(fallbackDb.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO library_stats'),
      ['lib', 1, 2, 10, 7, expect.any(String)]
    );
  });

  it('appends items in position order and refreshes stats', async () => {
    const db = createDbMock();
    mocks.getDatabase.mockResolvedValue(db);
    db.select
      .mockResolvedValueOnce([{ max_position: 4 }])
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ item_count: 2, priced_count: 2 }]);

    await appendLibraryItems(
      { libraryId: 'lib', folderId: 'folder', sectionId: 'section' },
      [pricedItem('i1'), pricedItem('i2')]
    );

    const insertCall = db.execute.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO library_items'));
    expect(insertCall).toBeTruthy();
    expect(insertCall?.[1]).toEqual(expect.arrayContaining(['i1', 'lib', 'folder', 'section', null, 5]));
    expect(insertCall?.[1]).toEqual(expect.arrayContaining(['i2', 'lib', 'folder', 'section', null, 6]));
  });

  it('reconstructs a protected section export with page items and child section items', async () => {
    const db = createDbMock();
    mocks.getDatabase.mockResolvedValue(db);
    mocks.readNormalizedLibraries.mockResolvedValue([
      {
        id: 'lib',
        name: 'Library',
        folders: [{
          id: 'folder',
          name: 'Folder',
          sections: [{
            id: 'section',
            name: 'Section',
            items: [],
            pages: [{ id: 'page', name: 'Page', items: [] }],
            subSections: [{ id: 'child', name: 'Child', items: [], pages: [], subSections: [] }],
          }],
        }],
      },
    ]);
    db.select.mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes('LEFT JOIN library_stats')) return Promise.resolve([]);
      if (sql.includes('COUNT(*) AS count') && sql.includes('FROM library_items')) {
        return Promise.resolve([{ count: 1, priced_count: 1 }]);
      }
      if (sql.includes('FROM library_items') && sql.includes('ORDER BY position ASC')) {
        const sectionId = params?.[0];
        return Promise.resolve([{
          id: sectionId === 'child' ? 'child-item' : 'page-item',
          type: 'PRICED',
          reference: 'A1',
          description: sectionId === 'child' ? 'Child item' : 'Page item',
          unit: 'nr',
          quantity: 1,
          rate: 10,
          total: 10,
        }]);
      }
      return Promise.resolve([]);
    });

    const exported = await exportLibrarySectionFromRepository('lib', 'folder', 'section', {
      allowExportAll: false,
      allowExportFolders: false,
      allowExportSections: true,
      allowLibraryEditing: false,
    });

    expect(exported?.exportLocked).toBe(true);
    expect(exported?.permissions).toEqual({
      allowExportAll: false,
      allowExportFolders: false,
      allowExportSections: true,
      allowLibraryEditing: false,
    });
    expect(exported?.folders).toHaveLength(1);
    expect(exported?.folders[0].sections[0].pages?.[0].items[0].description).toBe('Page item');
    expect(exported?.folders[0].sections[0].subSections?.[0].items[0].description).toBe('Child item');
  });

  it('exports only selected libraries and applies export permissions', async () => {
    const db = createDbMock();
    mocks.getDatabase.mockResolvedValue(db);
    mocks.readNormalizedLibraries.mockResolvedValue([
      { id: 'keep', name: 'Keep', exportLocked: false, folders: [] },
      { id: 'skip', name: 'Skip', exportLocked: false, folders: [] },
    ]);
    db.select.mockResolvedValue([]);

    const exported = await exportLibrariesFromRepository(['keep'], {
      allowExportAll: false,
      allowExportFolders: true,
      allowExportSections: false,
      allowLibraryEditing: false,
    });

    expect(exported.map((library) => library.id)).toEqual(['keep']);
    expect(exported[0].exportLocked).toBe(true);
    expect(exported[0].permissions?.allowExportSections).toBe(false);
  });

  it('imports protected libraries with nested sections and page item rows', async () => {
    const db = createDbMock();
    mocks.getDatabase.mockResolvedValue(db);
    db.select.mockImplementation((sql: string) => {
      if (sql.includes('SELECT COUNT(*) AS count FROM library_catalogs')) return Promise.resolve([{ count: 0 }]);
      if (sql.includes('SELECT MAX(position) AS max_position')) return Promise.resolve([{ max_position: null }]);
      if (sql.includes('SELECT COUNT(*) AS count FROM library_folders')) return Promise.resolve([{ count: 1 }]);
      if (sql.includes('SELECT COUNT(*) AS count FROM library_sections')) return Promise.resolve([{ count: 2 }]);
      if (sql.includes('FROM library_items') && sql.includes('SUM(CASE')) return Promise.resolve([{ item_count: 2, priced_count: 2 }]);
      return Promise.resolve([]);
    });

    await importLibrariesToRepository([{
      id: 'lib',
      name: 'Library',
      favorite: true,
      permissions: { allowExportAll: true, allowExportFolders: true, allowExportSections: true, allowLibraryEditing: true },
      folders: [{
        id: 'folder',
        name: 'Folder',
        sections: [{
          id: 'section',
          name: 'Section',
          items: [],
          pages: [{ id: 'page', name: 'Page', items: [pricedItem('page-item')] }],
          subSections: [{ id: 'child', name: 'Child', items: [pricedItem('child-item')], pages: [], subSections: [] }],
        }],
      }],
    } as any], true);

    expect(db.execute).toHaveBeenCalledWith('DELETE FROM library_catalogs WHERE id = ?', ['lib']);
    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO library_catalogs'),
      ['lib', 0, 'Library', 1, 1, 0, 1, 1, 1, null, expect.any(String)]
    );
    expect(db.execute).toHaveBeenCalledWith(
      'INSERT INTO library_sections (id, library_id, folder_id, parent_section_id, position, order_ref, name, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['child', 'lib', 'folder', 'section', 0, null, 'Child', expect.any(String)]
    );
    expect(db.execute.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO library_items'))).toHaveLength(2);
  });
});
