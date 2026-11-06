/**
 * Centralized helpers for updating bill sections and library sections.
 * Used by App, useAppActions, and useAiAssistant to avoid duplicated deep-update logic.
 */
import type { Project, BoQBill, BoQItem, BoQSection, BoQPage, ItemLibrary, LibraryFolder, LibrarySection, LibraryPage } from '../types';
import { reindexBillReferences } from './calculations';

export type BillSectionItemsUpdater = (items: BoQItem[]) => BoQItem[];

/**
 * Update bill-level items (when bill has no sections). Reindexes the bill.
 */
export function updateBillItems(
  project: Project,
  billId: string,
  updater: BillSectionItemsUpdater
): BoQBill[] {
  const updatedBills = project.bills.map((bill) => {
    if (bill.id !== billId) return bill;
    const nextItems = updater([...(bill.items || [])]);
    return { ...bill, items: nextItems };
  });
  const billIndex = updatedBills.findIndex((b) => b.id === billId);
  if (billIndex !== -1) {
    updatedBills[billIndex] = reindexBillReferences(updatedBills[billIndex], billIndex);
  }
  return updatedBills;
}

/**
 * Returns a new bills array for the project with the specified section's items updated.
 * The modified bill is reindexed (references updated).
 */
export function updateBillSectionItems(
  project: Project,
  billId: string,
  sectionId: string,
  updater: BillSectionItemsUpdater
): BoQBill[] {
  const updatedBills = project.bills.map((bill) => {
    if (bill.id !== billId) return bill;
    return {
      ...bill,
      sections: bill.sections.map((section) => {
        if (section.id !== sectionId) return section;
        const nextItems = updater([...section.items]);
        return { ...section, items: nextItems };
      }),
    };
  });
  const billIndex = updatedBills.findIndex((b) => b.id === billId);
  if (billIndex !== -1) {
    updatedBills[billIndex] = reindexBillReferences(updatedBills[billIndex], billIndex);
  }
  return updatedBills;
}

/**
 * Update items in a section's page (when section has pages). Reindexes the bill.
 */
export function updateBillSectionPageItems(
  project: Project,
  billId: string,
  sectionId: string,
  pageId: string,
  updater: BillSectionItemsUpdater
): BoQBill[] {
  const updatedBills = project.bills.map((bill) => {
    if (bill.id !== billId) return bill;
    return {
      ...bill,
      sections: (bill.sections || []).map((section: BoQSection) => {
        if (section.id !== sectionId || !section.pages) return section;
        return {
          ...section,
          pages: section.pages.map((page: BoQPage) => {
            if (page.id !== pageId) return page;
            return { ...page, items: updater([...(page.items || [])]) };
          }),
        };
      }),
    };
  });
  const billIndex = updatedBills.findIndex((b) => b.id === billId);
  if (billIndex !== -1) {
    updatedBills[billIndex] = reindexBillReferences(updatedBills[billIndex], billIndex);
  }
  return updatedBills;
}

export type LibrarySectionItemsUpdater = (items: BoQItem[]) => BoQItem[];

/**
 * Returns a new libraries array with the specified section's items updated.
 */
export function updateLibrarySectionItems(
  libraries: ItemLibrary[],
  libId: string,
  folderId: string,
  sectionId: string,
  updater: LibrarySectionItemsUpdater
): ItemLibrary[] {
  const updateSections = (sections: LibrarySection[]): LibrarySection[] => sections.map((section) => {
    if (section.id === sectionId) {
      const nextItems = updater([...(section.items || []) as BoQItem[]]);
      return { ...section, items: nextItems };
    }
    return { ...section, subSections: updateSections(section.subSections || []) };
  });
  return libraries.map((lib) => {
    if (lib.id !== libId) return lib;
    return {
      ...lib,
      folders: lib.folders.map((folder: LibraryFolder) => {
        if (folder.id !== folderId) return folder;
        return {
          ...folder,
          sections: updateSections(folder.sections),
        };
      }),
    };
  });
}

export function updateLibrarySectionPageItems(
  libraries: ItemLibrary[],
  libId: string,
  folderId: string,
  sectionId: string,
  pageId: string,
  updater: LibrarySectionItemsUpdater
): ItemLibrary[] {
  const updateSections = (sections: LibrarySection[]): LibrarySection[] => sections.map((section) => {
    if (section.id === sectionId) {
      return {
        ...section,
        pages: (section.pages || []).map((page: LibraryPage) => (
          page.id !== pageId
            ? page
            : { ...page, items: updater([...(page.items || []) as BoQItem[]]) }
        )),
      };
    }
    return { ...section, subSections: updateSections(section.subSections || []) };
  });
  return libraries.map((lib) => {
    if (lib.id !== libId) return lib;
    return {
      ...lib,
      folders: lib.folders.map((folder: LibraryFolder) => {
        if (folder.id !== folderId) return folder;
        return {
          ...folder,
          sections: updateSections(folder.sections),
        };
      }),
    };
  });
}

/**
 * Find a library section by path (libId, folderId, sectionId). Returns undefined if not found.
 */
export function findLibrarySection(
  libraries: ItemLibrary[],
  libId: string,
  folderId: string,
  sectionId: string
): LibrarySection | undefined {
  const lib = libraries.find((l) => l.id === libId);
  const folder = lib?.folders.find((f) => f.id === folderId);
  const findInSections = (sections: LibrarySection[]): LibrarySection | undefined => {
    for (const section of sections) {
      if (section.id === sectionId) return section;
      const nested = findInSections(section.subSections || []);
      if (nested) return nested;
    }
    return undefined;
  };
  return findInSections(folder?.sections || []);
}

export function findLibraryPage(
  libraries: ItemLibrary[],
  libId: string,
  folderId: string,
  sectionId: string,
  pageId: string
) {
  return findLibrarySection(libraries, libId, folderId, sectionId)?.pages?.find((page) => page.id === pageId);
}
