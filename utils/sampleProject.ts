import type { BoQItem, BoQPage, BoQSection, ItemLibrary, LibrarySection, Project } from '../types';
import { safeMul } from './calculations';
import { generateId } from './generateId';
import { DEFAULT_APP_SETTINGS, buildNewProjectSettingsFromDefaults, type AppSettings } from './appSettings';
import {
  listLibraryItems,
  listLibrarySampleSections,
  type LibraryItemsResult,
  type LibrarySampleSectionRef,
  type ListLibraryItemsOptions,
} from './libraryRepository';

type SampleSource = 'smm7' | 'fallback';

type SectionCandidate = {
  folderName: string;
  section: LibrarySection;
  depth: number;
};

export type LibraryItemFetcher = (options: ListLibraryItemsOptions) => Promise<LibraryItemsResult>;
export type LibrarySampleSectionFetcher = (libraryId: string, limit?: number) => Promise<LibrarySampleSectionRef[]>;

export type SampleProjectResult = {
  project: Project;
  source: SampleSource;
  message: string;
};

const SAMPLE_SECTION_LIMIT = 3;
const SAMPLE_TOTAL_ITEM_LIMIT = 90;
const SAMPLE_SECTION_ITEM_LIMIT = 28;
const SAMPLE_PAGE_LIMIT = 2;
const PRICED_TYPES = new Set<BoQItem['type']>(['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM']);

function cleanName(value?: string | null) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

export function findSmm7Library(libraries: ItemLibrary[]) {
  return libraries.find((library) => {
    const name = cleanName(library.name).toLowerCase();
    return name === 'smm7 (official edition)' || (name.includes('smm7') && name.includes('official'));
  }) || libraries.find((library) => cleanName(library.name).toLowerCase().includes('smm7'));
}

function flattenLibrarySections(sections: LibrarySection[] = [], folderName: string, depth = 0): SectionCandidate[] {
  return sections.flatMap((section) => [
    { folderName, section, depth },
    ...flattenLibrarySections(section.subSections || [], folderName, depth + 1),
  ]);
}

function getSectionItemSignal(section: LibrarySection) {
  const pageSignal = (section.pages || []).reduce((sum, page) => sum + (page.pricedCount || page.itemCount || 0), 0);
  return section.pricedCount || section.itemCount || pageSignal || 0;
}

function getCandidates(library: ItemLibrary) {
  return (library.folders || [])
    .flatMap((folder) => flattenLibrarySections(folder.sections || [], cleanName(folder.name)))
    .filter(({ section }) => getSectionItemSignal(section) > 0)
    .sort((a, b) => {
      const aPriced = a.section.pricedCount || 0;
      const bPriced = b.section.pricedCount || 0;
      if (aPriced !== bPriced) return bPriced - aPriced;
      return a.depth - b.depth;
    });
}

function cloneBillItem(item: BoQItem): BoQItem {
  const isPriced = PRICED_TYPES.has(item.type);
  const quantity = isPriced && (!Number.isFinite(item.quantity) || item.quantity <= 0)
    ? 1
    : Number(item.quantity) || 0;
  const rate = Number(item.rate) || 0;
  return {
    ...item,
    id: generateId(),
    quantity,
    rate,
    total: isPriced ? safeMul(quantity, rate) : 0,
    dimensionRows: item.dimensionRows?.map((row) => ({ ...row, id: generateId() })),
    aiLocks: item.aiLocks ? { ...item.aiLocks } : undefined,
  };
}

async function loadSectionItems(section: LibrarySection, fetchItems: LibraryItemFetcher) {
  const loadedPages: BoQPage[] = [];
  const pagesWithItems = (section.pages || [])
    .filter((page) => (page.itemCount || page.pricedCount || 0) > 0)
    .slice(0, SAMPLE_PAGE_LIMIT);

  if (pagesWithItems.length > 0) {
    for (const page of pagesWithItems) {
      const result = await fetchItems({
        sectionId: section.id,
        pageId: page.id,
        limit: Math.max(8, Math.floor(SAMPLE_SECTION_ITEM_LIMIT / pagesWithItems.length)),
      });
      const items = result.items.map(cloneBillItem);
      if (items.length > 0) {
        loadedPages.push({
          id: generateId(),
          name: cleanName([page.orderRef, page.name].filter(Boolean).join(' ')) || 'Sample page',
          items,
        });
      }
    }
    if (loadedPages.length > 0) return { items: [] as BoQItem[], pages: loadedPages };
  }

  const directResult = await fetchItems({ sectionId: section.id, limit: SAMPLE_SECTION_ITEM_LIMIT });
  return { items: directResult.items.map(cloneBillItem), pages: [] as BoQPage[] };
}

function makeSectionName(candidate: SectionCandidate) {
  const ref = cleanName(candidate.section.orderRef);
  const name = cleanName(candidate.section.name);
  return cleanName([candidate.folderName, [ref, name].filter(Boolean).join(' ')].filter(Boolean).join(' / ')) || 'Sample works';
}

function makeSectionNameFromRef(ref: LibrarySampleSectionRef) {
  const sectionLabel = [cleanName(ref.sectionOrderRef), cleanName(ref.sectionName)].filter(Boolean).join(' ');
  return cleanName([cleanName(ref.folderName), sectionLabel].filter(Boolean).join(' / ')) || 'Sample works';
}

async function buildSectionsFromSampleRefs(refs: LibrarySampleSectionRef[], fetchItems: LibraryItemFetcher) {
  const sections: BoQSection[] = [];
  let totalLoadedItems = 0;
  const grouped = new Map<string, LibrarySampleSectionRef[]>();

  refs.forEach((ref) => {
    const rows = grouped.get(ref.sectionId) || [];
    rows.push(ref);
    grouped.set(ref.sectionId, rows);
  });

  for (const sectionRefs of grouped.values()) {
    if (sections.length >= SAMPLE_SECTION_LIMIT || totalLoadedItems >= SAMPLE_TOTAL_ITEM_LIMIT) break;
    const firstRef = sectionRefs[0];
    if (!firstRef) continue;
    const pageRefs = sectionRefs.filter((ref) => ref.pageId).slice(0, SAMPLE_PAGE_LIMIT);

    if (pageRefs.length > 0) {
      const pages: BoQPage[] = [];
      for (const ref of pageRefs) {
        const result = await fetchItems({
          sectionId: ref.sectionId,
          pageId: ref.pageId || null,
          limit: Math.max(8, Math.floor(SAMPLE_SECTION_ITEM_LIMIT / pageRefs.length)),
        });
        const items = result.items.map(cloneBillItem);
        if (items.length > 0) {
          pages.push({
            id: generateId(),
            name: cleanName([ref.pageOrderRef, ref.pageName].filter(Boolean).join(' ')) || 'Sample page',
            items,
          });
          totalLoadedItems += items.length;
        }
      }
      if (pages.length > 0) {
        sections.push({
          id: generateId(),
          name: makeSectionNameFromRef(firstRef),
          items: [],
          pages,
        });
      }
      continue;
    }

    const result = await fetchItems({ sectionId: firstRef.sectionId, limit: SAMPLE_SECTION_ITEM_LIMIT });
    const items = result.items.map(cloneBillItem);
    if (items.length === 0) continue;
    totalLoadedItems += items.length;
    sections.push({
      id: generateId(),
      name: makeSectionNameFromRef(firstRef),
      items,
    });
  }

  return { sections, totalLoadedItems };
}

function makeProjectFromSections(sections: BoQSection[], source: SampleSource, appSettings: AppSettings = DEFAULT_APP_SETTINGS): Project {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: source === 'smm7' ? 'SMM7 Sample Project' : 'Sample QS Project',
    client: 'Sample client',
    location: 'Sample site',
    reference: source === 'smm7' ? 'HZL-SAMPLE-SMM7' : 'HZL-SAMPLE',
    updatedAt: now,
    ...buildNewProjectSettingsFromDefaults(appSettings),
    bills: [{
      id: generateId(),
      name: source === 'smm7' ? 'SMM7 sample bill' : 'Sample bill',
      sections,
    }],
  };
}

export function buildSyntheticSampleProject(appSettings: AppSettings = DEFAULT_APP_SETTINGS): SampleProjectResult {
  const makeItem = (type: BoQItem['type'], reference: string, description: string, unit = '', quantity = 0, rate = 0): BoQItem => ({
    id: generateId(),
    type,
    reference,
    description,
    unit,
    quantity,
    rate,
    total: PRICED_TYPES.has(type) ? safeMul(quantity, rate) : 0,
  });

  const sections: BoQSection[] = [
    {
      id: generateId(),
      name: 'Preliminaries and site setup',
      items: [
        makeItem('GENERAL_HEADING', '', 'Preliminaries'),
        makeItem('COMMENT', '', 'Sample content only. Import SMM7 to create a standards-backed sample bill.'),
        makeItem('PRICED', 'A-01-01-01', 'Temporary welfare and site establishment', 'sum', 1, 4500),
        makeItem('PRICED', 'A-01-01-02', 'Site management allowance', 'wk', 6, 650),
      ],
    },
    {
      id: generateId(),
      name: 'External works sample',
      items: [
        makeItem('GENERAL_HEADING', '', 'External works'),
        makeItem('MAJOR_HEADING', '', 'Preparation and excavation'),
        makeItem('PRICED', 'A-02-01-01', 'Excavate reduced levels and cart away surplus', 'm3', 120, 18.5),
        makeItem('PRICED', 'A-02-01-02', 'Imported granular sub-base', 'm3', 45, 42),
      ],
    },
  ];

  return {
    project: makeProjectFromSections(sections, 'fallback', appSettings),
    source: 'fallback',
    message: 'Created a synthetic sample project because an installed SMM7 library was not available.',
  };
}

export async function createSampleProjectFromLibraries(
  libraries: ItemLibrary[],
  fetchItems: LibraryItemFetcher = listLibraryItems,
  fetchSampleSections: LibrarySampleSectionFetcher = listLibrarySampleSections,
  appSettings: AppSettings = DEFAULT_APP_SETTINGS,
): Promise<SampleProjectResult> {
  const smm7 = findSmm7Library(libraries);
  if (!smm7) return buildSyntheticSampleProject(appSettings);

  let sections: BoQSection[] = [];
  let totalLoadedItems = 0;

  try {
    const sampleRefs = await fetchSampleSections(smm7.id, SAMPLE_SECTION_LIMIT * SAMPLE_PAGE_LIMIT * 2);
    if (sampleRefs.length > 0) {
      const sample = await buildSectionsFromSampleRefs(sampleRefs, fetchItems);
      sections = sample.sections;
      totalLoadedItems = sample.totalLoadedItems;
    }
  } catch {
    // Some fallback/browser modes cannot query normalized SQLite; try metadata traversal below.
  }

  if (sections.length > 0) {
    return {
      project: makeProjectFromSections(sections, 'smm7', appSettings),
      source: 'smm7',
      message: `Created a sample bill from ${smm7.name} using ${sections.length} section${sections.length === 1 ? '' : 's'} and ${totalLoadedItems} loaded row${totalLoadedItems === 1 ? '' : 's'}.`,
    };
  }

  const usedFolderNames = new Set<string>();

  for (const candidate of getCandidates(smm7)) {
    if (sections.length >= SAMPLE_SECTION_LIMIT || totalLoadedItems >= SAMPLE_TOTAL_ITEM_LIMIT) break;
    if (usedFolderNames.has(candidate.folderName) && sections.length < SAMPLE_SECTION_LIMIT - 1) continue;

    try {
      const loaded = await loadSectionItems(candidate.section, fetchItems);
      const itemCount = loaded.items.length + loaded.pages.reduce((sum, page) => sum + page.items.length, 0);
      if (itemCount === 0) continue;
      sections.push({
        id: generateId(),
        name: makeSectionName(candidate),
        items: loaded.items,
        pages: loaded.pages.length > 0 ? loaded.pages : undefined,
      });
      totalLoadedItems += itemCount;
      usedFolderNames.add(candidate.folderName);
    } catch {
      // Skip individual sections that cannot be read; fallback below if nothing usable was loaded.
    }
  }

  if (sections.length === 0) {
    return {
      ...buildSyntheticSampleProject(appSettings),
      message: 'SMM7 was found, but no sample rows could be read. Created a synthetic sample project instead.',
    };
  }

  return {
    project: makeProjectFromSections(sections, 'smm7', appSettings),
    source: 'smm7',
    message: `Created a sample bill from ${smm7.name} using ${sections.length} section${sections.length === 1 ? '' : 's'} and ${totalLoadedItems} loaded row${totalLoadedItems === 1 ? '' : 's'}.`,
  };
}
