import type { Project, TenderApplySummary, TenderAwardRecord } from '../types';
import type { OperationLogEntry, OperationLogKind, OperationLogStatus } from './operationLog';

export type ProjectEvidenceTone = 'neutral' | 'success' | 'info' | 'warning' | 'danger' | 'ai';
export type ProjectEvidenceCategory = 'operation' | 'snapshot' | 'tender-award' | 'apply-back';
export type ProjectEvidenceSource = 'Bill' | 'Tender' | 'Library' | 'Reports' | 'Audit' | 'Version History' | 'AI' | 'System';
export type ProjectEvidenceTarget = 'bill' | 'tender' | 'library' | 'reports' | 'audit' | 'version-history' | 'ai';

export interface ProjectEvidenceMetric {
  id: 'restore-points' | 'audit-events' | 'data-movement' | 'tender-control' | 'exceptions';
  label: string;
  value: string;
  detail: string;
  tone: ProjectEvidenceTone;
}

export interface ProjectEvidenceItem {
  id: string;
  category: ProjectEvidenceCategory;
  title: string;
  detail: string;
  timestamp?: string;
  source: ProjectEvidenceSource;
  tone: ProjectEvidenceTone;
  actionTarget?: ProjectEvidenceTarget;
  billId?: string;
  meta: string[];
}

export interface ProjectEvidenceSummary {
  projectId?: string;
  metrics: ProjectEvidenceMetric[];
  items: ProjectEvidenceItem[];
  counts: {
    snapshots: number;
    operations: number;
    imports: number;
    exports: number;
    tenderAwards: number;
    applyBacks: number;
    exceptions: number;
  };
  hasData: boolean;
}

export interface ProjectEvidenceOptions {
  limit?: number;
}

const DEFAULT_ITEM_LIMIT = 8;

const OPERATION_SOURCE_BY_KIND: Record<OperationLogKind, ProjectEvidenceSource> = {
  bill: 'Bill',
  tender: 'Tender',
  library: 'Library',
  import: 'Library',
  export: 'Reports',
  save: 'Audit',
  backup: 'Audit',
  ai: 'AI',
  system: 'System',
};

const OPERATION_TARGET_BY_KIND: Partial<Record<OperationLogKind, ProjectEvidenceTarget>> = {
  bill: 'bill',
  tender: 'tender',
  library: 'library',
  import: 'library',
  export: 'reports',
  save: 'audit',
  backup: 'audit',
  ai: 'ai',
};

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function timestampValue(value?: string) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function shortDate(value?: string) {
  if (!value) return 'No date recorded';
  return value.slice(0, 10);
}

function plural(count: number, singular: string, pluralLabel = `${singular}s`) {
  return `${count.toLocaleString()} ${count === 1 ? singular : pluralLabel}`;
}

function matchesProject(entry: OperationLogEntry, project?: Project | null) {
  if (!project) return true;
  if (entry.projectId === project.id) return true;
  return !entry.projectId && Boolean(entry.projectName) && entry.projectName === project.name;
}

function operationTone(status: OperationLogStatus, kind: OperationLogKind): ProjectEvidenceTone {
  if (status === 'error') return 'danger';
  if (status === 'cancelled') return 'warning';
  if (kind === 'ai') return 'ai';
  if (status === 'success') return kind === 'save' || kind === 'backup' ? 'success' : 'info';
  return 'neutral';
}

function awardTone(award: TenderAwardRecord): ProjectEvidenceTone {
  if (award.approvalStatus === 'REJECTED') return 'danger';
  if (award.approvalStatus === 'APPROVED' || award.approvalStatus === 'SIGNED_APPROVAL_UPLOADED') return 'success';
  if (award.approvalStatus === 'APPROVAL_FORM_CREATED') return 'warning';
  return 'info';
}

function operationToEvidence(entry: OperationLogEntry): ProjectEvidenceItem {
  const source = OPERATION_SOURCE_BY_KIND[entry.kind];
  return {
    id: `operation-${entry.id}`,
    category: 'operation',
    title: entry.subject,
    detail: entry.message,
    timestamp: entry.timestamp,
    source,
    tone: operationTone(entry.status, entry.kind),
    actionTarget: OPERATION_TARGET_BY_KIND[entry.kind],
    billId: entry.billId,
    meta: [
      titleCase(entry.status),
      titleCase(entry.kind),
      entry.billName || '',
    ].filter(Boolean),
  };
}

function awardToEvidence(award: TenderAwardRecord): ProjectEvidenceItem {
  const applyCount = (award.billApplyHistory || []).length;
  return {
    id: `tender-award-${award.tradeId}`,
    category: 'tender-award',
    title: `Award selected: ${award.contractorName}`,
    detail: `${award.sourceTenderPackageName || 'Tender package'} is marked ${titleCase(award.approvalStatus || 'winner selected')}.`,
    timestamp: award.selectedAt,
    source: 'Tender',
    tone: awardTone(award),
    actionTarget: 'tender',
    meta: [
      titleCase(award.approvalStatus || 'WINNER_SELECTED'),
      applyCount > 0 ? plural(applyCount, 'apply-back') : 'Not applied back',
    ],
  };
}

function applyBackToEvidence(award: TenderAwardRecord, summary: TenderApplySummary, index: number): ProjectEvidenceItem {
  const noRateText = summary.itemsWithNoContractorRate > 0
    ? `, ${plural(summary.itemsWithNoContractorRate, 'missing rate')}`
    : '';
  return {
    id: `apply-back-${award.tradeId}-${summary.appliedAt || index}`,
    category: 'apply-back',
    title: `Applied ${award.contractorName} tender rates`,
    detail: `${plural(summary.itemsUpdated, 'item')} updated, ${plural(summary.itemsSkipped, 'item')} skipped${noRateText}.`,
    timestamp: summary.appliedAt,
    source: 'Bill',
    tone: summary.itemsWithNoContractorRate > 0 ? 'warning' : 'success',
    actionTarget: 'bill',
    meta: [
      summary.sourceTenderPackageName || award.sourceTenderPackageName || 'Tender package',
      'Tender apply-back',
    ],
  };
}

export function buildProjectEvidence(
  project: Project | null | undefined,
  operationEntries: OperationLogEntry[] = [],
  options: ProjectEvidenceOptions = {}
): ProjectEvidenceSummary {
  const limit = options.limit ?? DEFAULT_ITEM_LIMIT;
  const scopedOperations = operationEntries.filter((entry) => matchesProject(entry, project));
  const snapshots = project?.snapshots || [];
  const awards = Object.values(project?.tenderAwards || {});
  const applyBacks = awards.flatMap((award) => award.billApplyHistory || []);
  const importCount = scopedOperations.filter((entry) => entry.kind === 'import').length;
  const exportCount = scopedOperations.filter((entry) => entry.kind === 'export').length;
  const exceptionCount = scopedOperations.filter((entry) => entry.status === 'error' || entry.status === 'cancelled').length;

  const snapshotItems: ProjectEvidenceItem[] = snapshots.map((snapshot) => ({
    id: `snapshot-${snapshot.id}`,
    category: 'snapshot',
    title: snapshot.label || 'Restore point',
    detail: snapshot.summary || `Restore point captured for ${project?.name || 'this project'}.`,
    timestamp: snapshot.createdAt,
    source: 'Version History',
    tone: 'info',
    actionTarget: 'version-history',
    meta: ['Restore point'],
  }));

  const awardItems = awards.map(awardToEvidence);
  const applyBackItems = awards.flatMap((award) => (
    (award.billApplyHistory || []).map((summary, index) => applyBackToEvidence(award, summary, index))
  ));
  const operationItems = scopedOperations.map(operationToEvidence);

  const items = [
    ...snapshotItems,
    ...awardItems,
    ...applyBackItems,
    ...operationItems,
  ].sort((a, b) => timestampValue(b.timestamp) - timestampValue(a.timestamp)).slice(0, limit);

  const latestSnapshot = snapshots
    .slice()
    .sort((a, b) => timestampValue(b.createdAt) - timestampValue(a.createdAt))[0];

  const metrics: ProjectEvidenceMetric[] = [
    {
      id: 'restore-points',
      label: 'Restore points',
      value: snapshots.length.toLocaleString(),
      detail: latestSnapshot ? `Latest ${shortDate(latestSnapshot.createdAt)}` : 'No restore point yet',
      tone: snapshots.length > 0 ? 'success' : 'warning',
    },
    {
      id: 'audit-events',
      label: 'Audit events',
      value: scopedOperations.length.toLocaleString(),
      detail: scopedOperations.length > 0 ? 'Local history available' : 'No local events recorded',
      tone: scopedOperations.length > 0 ? 'info' : 'neutral',
    },
    {
      id: 'data-movement',
      label: 'Imports / exports',
      value: (importCount + exportCount).toLocaleString(),
      detail: `${plural(importCount, 'import')} / ${plural(exportCount, 'export')}`,
      tone: importCount + exportCount > 0 ? 'info' : 'neutral',
    },
    {
      id: 'tender-control',
      label: 'Tender control',
      value: awards.length.toLocaleString(),
      detail: `${plural(applyBacks.length, 'apply-back')} recorded`,
      tone: awards.length > 0 ? 'success' : 'neutral',
    },
    {
      id: 'exceptions',
      label: 'Exceptions',
      value: exceptionCount.toLocaleString(),
      detail: exceptionCount > 0 ? 'Review failed or cancelled events' : 'No logged exceptions',
      tone: exceptionCount > 0 ? 'danger' : 'success',
    },
  ];

  return {
    projectId: project?.id,
    metrics,
    items,
    counts: {
      snapshots: snapshots.length,
      operations: scopedOperations.length,
      imports: importCount,
      exports: exportCount,
      tenderAwards: awards.length,
      applyBacks: applyBacks.length,
      exceptions: exceptionCount,
    },
    hasData: items.length > 0,
  };
}
