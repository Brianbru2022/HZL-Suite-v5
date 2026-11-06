import type { BoQItem, BoQPage, BoQSection, Project, SectionAssembly } from '../types';
import { generateId } from './generateId';

function cloneDimensionRows(item: BoQItem) {
  return (item.dimensionRows || []).map((row) => ({
    ...row,
    id: generateId(),
  }));
}

function cloneItems(items: BoQItem[]): BoQItem[] {
  return items.map((item) => ({
    ...item,
    id: generateId(),
    reference: '',
    dimensionRows: cloneDimensionRows(item),
  }));
}

function clonePages(pages: BoQPage[]): BoQPage[] {
  return pages.map((page) => ({
    ...page,
    id: generateId(),
    items: cloneItems(page.items || []),
  }));
}

export function cloneAssemblySection(section: BoQSection): BoQSection {
  return {
    ...section,
    id: generateId(),
    items: cloneItems(section.items || []),
    pages: section.pages?.length ? clonePages(section.pages) : undefined,
  };
}

export function buildSectionAssembly(project: Project, section: BoQSection, sourceBillId?: string): SectionAssembly {
  const sourceBill = project.bills.find((bill) => bill.id === sourceBillId);

  return {
    id: generateId(),
    name: section.name,
    description: `Assembly saved from ${sourceBill?.name || project.name}.`,
    createdAt: new Date().toISOString(),
    sourceBillId,
    sourceBillName: sourceBill?.name,
    sourceSectionId: section.id,
    sourceSectionName: section.name,
    section: cloneAssemblySection(section),
  };
}
