import type { AppraisalApprovedReportIssue, DevelopmentAppraisal, DevelopmentAppraisalOption } from '../types';
import { getCommercialAssets, getCommercialSiteWideCostLines } from './commercialAssets';
import { generateId } from './generateId';

export type ReportIssueControl = Pick<AppraisalApprovedReportIssue, 'issueNumber' | 'reviewer' | 'approvedAt' | 'sourceHash'>;

function canonicalise(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalise);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalise(entry)]),
    );
  }
  return value;
}

export function stableReportIssueSource(value: unknown) {
  return JSON.stringify(canonicalise(value));
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function commercialReportIssueRequirements(option: DevelopmentAppraisalOption, evidenceJustification = '', allocationJustification = '') {
  if (option.template !== 'COMMERCIAL_INCOME') return [];
  const requirements: string[] = [];
  const usableEvidence = (option.commercialInitialAssessmentBriefs || []).some((brief) => brief.fileName.trim() && brief.integrityStatus !== 'MISSING' && brief.integrityStatus !== 'CHANGED');
  if (!usableEvidence) requirements.push('Attach at least one reviewed commercial brief or preliminary assessment.');
  if (!evidenceJustification.trim()) requirements.push('Record how the evidence was reviewed and applied to the report.');
  if (!allocationJustification.trim()) requirements.push('Record the basis used to allocate shared site costs between assets.');
  getCommercialSiteWideCostLines(option)
    .filter((line) => Number(line.amount) > 0 && !line.notes?.trim())
    .forEach((line) => requirements.push(`${line.title || 'A shared site cost'} needs an allocation note.`));
  getCommercialAssets(option)
    .filter((asset) => asset.included && !asset.rationale?.trim())
    .forEach((asset) => requirements.push(`${asset.title} needs an inclusion rationale.`));
  return requirements;
}

function frozenAppraisal(appraisal: DevelopmentAppraisal, option: DevelopmentAppraisalOption) {
  return {
    ...appraisal,
    selectedOptionId: option.id,
    options: appraisal.options.map((entry) => ({
      ...entry,
      recommended: entry.id === option.id,
      approvedReportIssues: entry.id === option.id ? undefined : entry.approvedReportIssues,
    })),
  };
}

export async function createApprovedReportIssue({
  appraisal,
  option,
  reviewer,
  approvedAt,
  evidenceJustification,
  allocationJustification,
}: {
  appraisal: DevelopmentAppraisal;
  option: DevelopmentAppraisalOption;
  reviewer: string;
  approvedAt: string;
  evidenceJustification: string;
  allocationJustification: string;
}): Promise<AppraisalApprovedReportIssue> {
  const sourceSnapshot = stableReportIssueSource({
    kind: 'APPROVED_COMMERCIAL_REPORT_ISSUE',
    appraisal: frozenAppraisal(appraisal, option),
    optionId: option.id,
  });
  const sourceHash = await sha256(sourceSnapshot);
  const issueNumber = (option.approvedReportIssues || []).reduce((highest, issue) => Math.max(highest, issue.issueNumber || 0), 0) + 1;
  const createdAt = new Date().toISOString();
  const sourceLabel = `${appraisal.name}-approved-issue-${issueNumber}`.replace(/[^\w.-]+/g, '_');
  return {
    id: generateId(),
    issueNumber,
    reviewer: reviewer.trim(),
    approvedAt,
    sourceHash,
    sourceSnapshot,
    evidenceJustification: evidenceJustification.trim(),
    allocationJustification: allocationJustification.trim(),
    createdAt,
    outputs: [
      { format: 'PDF', status: 'LOCKED', fileName: `${sourceLabel}.pdf` },
      { format: 'EXCEL', status: 'LOCKED', fileName: `${sourceLabel}.xlsx` },
    ],
  };
}

export function issueControl(issue: AppraisalApprovedReportIssue): ReportIssueControl {
  return {
    issueNumber: issue.issueNumber,
    reviewer: issue.reviewer,
    approvedAt: issue.approvedAt,
    sourceHash: issue.sourceHash,
  };
}

export function appraisalFromApprovedReportIssue(issue: AppraisalApprovedReportIssue): DevelopmentAppraisal {
  const parsed = JSON.parse(issue.sourceSnapshot) as { appraisal?: DevelopmentAppraisal };
  if (!parsed.appraisal?.id || !Array.isArray(parsed.appraisal.options)) throw new Error('This approved report issue has an invalid source snapshot.');
  return parsed.appraisal;
}
