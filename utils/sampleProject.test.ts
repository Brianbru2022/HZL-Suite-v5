import { describe, expect, it, vi } from 'vitest';
import type { BoQItem, ItemLibrary } from '../types';
import { buildSyntheticSampleProject, createSampleProjectFromLibraries, findSmm7Library } from './sampleProject';

function pricedItem(id: string, overrides: Partial<BoQItem> = {}): BoQItem {
  return {
    id,
    type: 'PRICED',
    reference: id.toUpperCase(),
    description: `Measured item ${id}`,
    unit: 'nr',
    quantity: 0,
    rate: 25,
    total: 0,
    ...overrides,
  };
}

function library(overrides: Partial<ItemLibrary> = {}): ItemLibrary {
  return {
    id: 'smm7',
    name: 'SMM7 (Official Edition)',
    folders: [{
      id: 'folder-a',
      name: 'A Preliminaries',
      sections: [{
        id: 'section-a',
        orderRef: 'A10',
        name: 'Project particulars',
        items: [],
        itemCount: 2,
        pricedCount: 2,
      }],
      itemCount: 2,
      pricedCount: 2,
      sectionCount: 1,
    }],
    storageMode: 'sqlite',
    ...overrides,
  };
}

describe('sampleProject', () => {
  it('finds the installed SMM7 library by official name', () => {
    expect(findSmm7Library([library({ id: 'x' })])?.id).toBe('x');
    expect(findSmm7Library([library({ id: 'y', name: 'My SMM7 copy' })])?.id).toBe('y');
  });

  it('builds a small sample project from SMM7 without loading every item', async () => {
    const fetchItems = vi.fn().mockResolvedValue({
      totalCount: 2000,
      pricedCount: 2000,
      items: [pricedItem('one'), pricedItem('two', { quantity: 3 })],
    });

    const fetchSampleSections = vi.fn().mockResolvedValue([]);

    const result = await createSampleProjectFromLibraries([library()], fetchItems, fetchSampleSections);

    expect(result.source).toBe('smm7');
    expect(result.project.name).toBe('SMM7 Sample Project');
    expect(result.project.bills[0].sections).toHaveLength(1);
    expect(result.project.bills[0].sections[0].items).toHaveLength(2);
    expect(result.project.bills[0].sections[0].items[0].quantity).toBe(1);
    expect(fetchItems).toHaveBeenCalledWith({ sectionId: 'section-a', limit: 28 });
  });

  it('uses SQLite sample section refs when metadata item counts are omitted', async () => {
    const fetchItems = vi.fn().mockResolvedValue({
      totalCount: 10,
      pricedCount: 8,
      items: [pricedItem('page-one')],
    });
    const fetchSampleSections = vi.fn().mockResolvedValue([{
      libraryId: 'smm7',
      folderId: 'folder-b',
      folderName: 'B Complete buildings',
      sectionId: 'section-b',
      sectionOrderRef: 'B10',
      sectionName: 'General items',
      pageId: 'page-b',
      pageOrderRef: '1',
      pageName: 'Measured works',
      itemCount: 10,
      pricedCount: 8,
    }]);

    const result = await createSampleProjectFromLibraries(
      [library({ folders: [{ id: 'folder-b', name: 'B Complete buildings', sections: [] }] })],
      fetchItems,
      fetchSampleSections
    );

    expect(result.source).toBe('smm7');
    expect(result.project.bills[0].sections[0].pages?.[0].items).toHaveLength(1);
    expect(fetchItems).toHaveBeenCalledWith({ sectionId: 'section-b', pageId: 'page-b', limit: 28 });
  });

  it('falls back to a synthetic sample project when SMM7 is missing', async () => {
    const result = await createSampleProjectFromLibraries([]);

    expect(result.source).toBe('fallback');
    expect(result.project.bills[0].sections.length).toBeGreaterThan(0);
    expect(result.message).toContain('synthetic sample project');
  });

  it('can build the synthetic sample directly', () => {
    const result = buildSyntheticSampleProject();

    expect(result.project.reference).toBe('HZL-SAMPLE');
    expect(result.project.showStickyBillTotals).toBe(true);
    expect(result.project.bills[0].sections[0].items.some((item) => item.type === 'COMMENT')).toBe(true);
  });
});
