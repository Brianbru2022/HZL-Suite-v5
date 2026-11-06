import type { ItemLibrary, LibraryGovernance, LibraryGovernanceChange } from '../types';
import { generateId } from './generateId';

export type LibraryGovernanceIssue = {
  code: 'OWNER' | 'SOURCE' | 'RATE_DATE' | 'INDEX_BASIS' | 'REVIEW_DATE' | 'APPROVAL' | 'REVIEW_OVERDUE';
  message: string;
};

function clean(value: string | undefined) {
  return value?.trim() || '';
}

export function assessLibraryGovernance(library: Pick<ItemLibrary, 'governance'>, today = new Date().toISOString().slice(0, 10)): LibraryGovernanceIssue[] {
  const governance = library.governance;
  if (!governance) return [
    { code: 'OWNER', message: 'Library owner is not recorded.' },
    { code: 'SOURCE', message: 'Source is not recorded.' },
    { code: 'RATE_DATE', message: 'Rate date is not recorded.' },
    { code: 'INDEX_BASIS', message: 'Index basis is not recorded.' },
    { code: 'REVIEW_DATE', message: 'Review date is not recorded.' },
    { code: 'APPROVAL', message: 'Approval status is not recorded.' },
  ];
  const issues: LibraryGovernanceIssue[] = [];
  if (!clean(governance.owner)) issues.push({ code: 'OWNER', message: 'Library owner is not recorded.' });
  if (!clean(governance.source)) issues.push({ code: 'SOURCE', message: 'Source is not recorded.' });
  if (!clean(governance.rateDate)) issues.push({ code: 'RATE_DATE', message: 'Rate date is not recorded.' });
  if (!clean(governance.indexBasis)) issues.push({ code: 'INDEX_BASIS', message: 'Index basis is not recorded.' });
  if (!clean(governance.reviewDate)) issues.push({ code: 'REVIEW_DATE', message: 'Review date is not recorded.' });
  if (!governance.approvalStatus) issues.push({ code: 'APPROVAL', message: 'Approval status is not recorded.' });
  if (governance.reviewDate && governance.reviewDate < today) issues.push({ code: 'REVIEW_OVERDUE', message: `Review date ${governance.reviewDate} has passed.` });
  return issues;
}

export function recordLibraryGovernanceChange(current: LibraryGovernance | undefined, next: Omit<LibraryGovernance, 'changeHistory'>, summary: string): LibraryGovernance {
  const change: LibraryGovernanceChange = { id: generateId(), changedAt: new Date().toISOString(), summary: clean(summary) || 'Updated library governance.' };
  return { ...next, changeHistory: [...(current?.changeHistory || []), change].slice(-50) };
}
