import type { BoQBill, BoQItem, BoQPage, BoQSection, Project, ProjectSnapshot, ProjectSnapshotScope } from '../types';
import { formatCurrency } from './formatting';
import { createSnapshotEntry } from './projectSnapshots';
import { stripRichText } from './richText';

const PRICED_TYPES = new Set<BoQItem['type']>(['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM']);

export interface BoqRevisionStats {
  bills: number;
  sections: number;
  pages: number;
  items: number;
  pricedItems: number;
  value: number;
}

export interface BoqRevisionDelta {
  scopeLabel: string;
  before: BoqRevisionStats;
  current: BoqRevisionStats;
  addedItems: number;
  removedItems: number;
  changedItems: number;
  valueDelta: number;
}

export interface BoqRevisionPointDetails {
  label?: string;
  note?: string;
}

type ComparableProject = Pick<Project, 'name' | 'bills'>;

type ComparableItem = {
  fingerprint: string;
};

export function createBoqRevisionPoint(project: Project, bill?: BoQBill | null, details?: BoqRevisionPointDetails): ProjectSnapshot {
  const scope: ProjectSnapshotScope = bill
    ? { type: 'BILL', billId: bill.id, billName: bill.name }
    : { type: 'PROJECT' };
  const scopeLabel = getRevisionScopeLabel(project, scope);
  const stats = collectRevisionStats(project, scope);
  const customLabel = details?.label?.trim();
  const note = details?.note?.trim();
  const label = customLabel || `BoQ revision - ${scopeLabel} - ${new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`;
  const summary = [
    `Recorded ${stats.items.toLocaleString()} bill row${stats.items === 1 ? '' : 's'}`,
    `${stats.pricedItems.toLocaleString()} priced`,
    formatCurrency(stats.value),
  ].join(' / ');

  return {
    ...createSnapshotEntry(project, label, summary),
    kind: 'BOQ_REVISION',
    scope,
    note: note || undefined,
  };
}

export function collectRevisionStats(project: ComparableProject | null | undefined, scope?: ProjectSnapshotScope): BoqRevisionStats {
  const bills = getScopedBills(project, scope);
  return bills.reduce<BoqRevisionStats>(
    (stats, bill) => {
      stats.bills += 1;
      stats.sections += bill.sections.length;
      bill.sections.forEach((section) => {
        stats.pages += section.pages?.length || 0;
        getSectionItems(section).forEach((item) => {
          stats.items += 1;
          if (PRICED_TYPES.has(item.type)) {
            stats.pricedItems += 1;
            stats.value += item.total || 0;
          }
        });
      });
      (bill.items || []).forEach((item) => {
        stats.items += 1;
        if (PRICED_TYPES.has(item.type)) {
          stats.pricedItems += 1;
          stats.value += item.total || 0;
        }
      });
      return stats;
    },
    { bills: 0, sections: 0, pages: 0, items: 0, pricedItems: 0, value: 0 }
  );
}

export function summariseBoqRevisionDelta(snapshot: ProjectSnapshot, currentProject: Project): BoqRevisionDelta {
  const scope = snapshot.scope;
  const beforeProject = snapshot.projectData as ComparableProject;
  const beforeItems = collectComparableItems(beforeProject, scope);
  const currentItems = collectComparableItems(currentProject, scope);
  let addedItems = 0;
  let removedItems = 0;
  let changedItems = 0;

  currentItems.forEach((_item, id) => {
    if (!beforeItems.has(id)) addedItems += 1;
  });
  beforeItems.forEach((item, id) => {
    const current = currentItems.get(id);
    if (!current) {
      removedItems += 1;
      return;
    }
    if (current.fingerprint !== item.fingerprint) changedItems += 1;
  });

  const before = collectRevisionStats(beforeProject, scope);
  const current = collectRevisionStats(currentProject, scope);
  return {
    scopeLabel: getRevisionScopeLabel(currentProject, scope),
    before,
    current,
    addedItems,
    removedItems,
    changedItems,
    valueDelta: current.value - before.value,
  };
}

export function formatRevisionDelta(delta: BoqRevisionDelta) {
  const valueLabel = `${delta.valueDelta >= 0 ? '+' : ''}${formatCurrency(delta.valueDelta)}`;
  return `${delta.addedItems.toLocaleString()} added / ${delta.removedItems.toLocaleString()} removed / ${delta.changedItems.toLocaleString()} changed / ${valueLabel}`;
}

function getScopedBills(project: ComparableProject | null | undefined, scope?: ProjectSnapshotScope): BoQBill[] {
  const bills = project?.bills || [];
  if (scope?.type === 'BILL' && scope.billId) {
    return bills.filter((bill) => bill.id === scope.billId);
  }
  return bills;
}

function getRevisionScopeLabel(project: ComparableProject | null | undefined, scope?: ProjectSnapshotScope) {
  if (scope?.type === 'BILL') {
    const liveName = project?.bills?.find((bill) => bill.id === scope.billId)?.name;
    return liveName || scope.billName || 'Selected bill';
  }
  return project?.name || 'Project BoQ';
}

function getSectionItems(section: BoQSection): BoQItem[] {
  if (section.pages?.length) return section.pages.flatMap((page: BoQPage) => page.items || []);
  return section.items || [];
}

function collectComparableItems(project: ComparableProject | null | undefined, scope?: ProjectSnapshotScope) {
  const items = new Map<string, ComparableItem>();
  getScopedBills(project, scope).forEach((bill) => {
    (bill.items || []).forEach((item) => items.set(item.id, { fingerprint: fingerprintItem(item) }));
    bill.sections.forEach((section) => {
      getSectionItems(section).forEach((item) => items.set(item.id, { fingerprint: fingerprintItem(item) }));
    });
  });
  return items;
}

function fingerprintItem(item: BoQItem) {
  return JSON.stringify({
    type: item.type,
    reference: item.reference || '',
    description: stripRichText(item.description || '').trim(),
    unit: item.unit || '',
    quantity: item.quantity || 0,
    quantityDecimals: item.quantityDecimals || 0,
    rate: item.rate || 0,
    total: item.total || 0,
    tradePackageId: item.tradePackageId || '',
    dimensionRows: item.dimensionRows || [],
  });
}
