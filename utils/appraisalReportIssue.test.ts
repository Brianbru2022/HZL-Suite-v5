import { describe, expect, it } from 'vitest';
import type { DevelopmentAppraisal, DevelopmentAppraisalOption } from '../types';
import { appraisalFromApprovedReportIssue, commercialReportIssueRequirements, createApprovedReportIssue, stableReportIssueSource } from './appraisalReportIssue';

function commercialOption(): DevelopmentAppraisalOption {
  return {
    id: 'commercial-option', name: 'Commercial option', template: 'COMMERCIAL_INCOME', commercialAssessmentStage: 'MODELLED', calculationMode: 'RESIDUAL_LAND_VALUE', durationMonths: 24,
    targetProfitOnGdvPercent: 20, financeAnnualRatePercent: 8, revenueLines: [], costLines: [], commercialAssets: [{ id: 'asset', title: 'Food store', source: 'MANUAL', included: true, revenueModel: 'LEASE', revenueLineIds: [], costLineIds: [], rationale: 'Supported by the reviewed site brief.', createdAt: '', updatedAt: '' }],
    commercialInitialAssessmentBriefs: [{ id: 'brief', fileName: 'brief.pdf', mimeType: 'application/pdf', size: 100, uploadedAt: '', integrityStatus: 'VERIFIED' }],
    finalReportExecutiveSummary: 'Reviewed report', finalReportSourceSignature: '', recommended: true, assumptions: '', decisionNote: '', createdAt: '', updatedAt: '',
  };
}

function appraisal(option: DevelopmentAppraisalOption): DevelopmentAppraisal {
  return { id: 'appraisal', kind: 'COMMERCIAL', name: 'Commercial pilot', status: 'DRAFT', selectedOptionId: option.id, options: [option], createdAt: '', updatedAt: '' };
}

describe('approved commercial report issues', () => {
  it('uses a deterministic source representation regardless of object key order', () => {
    expect(stableReportIssueSource({ b: 2, a: { d: 4, c: 3 } })).toBe(stableReportIssueSource({ a: { c: 3, d: 4 }, b: 2 }));
  });

  it('requires usable evidence and both approval justifications', () => {
    const option = commercialOption();
    expect(commercialReportIssueRequirements(option)).toEqual(expect.arrayContaining([
      'Record how the evidence was reviewed and applied to the report.',
      'Record the basis used to allocate shared site costs between assets.',
    ]));
    expect(commercialReportIssueRequirements(option, 'Brief reviewed against scope.', 'Shared costs allocated by site area.')).toEqual([]);
  });

  it('freezes a selected commercial option with a SHA-256 source hash', async () => {
    const option = commercialOption();
    const issue = await createApprovedReportIssue({
      appraisal: appraisal(option), option, reviewer: 'Reviewer', approvedAt: '2026-08-31', evidenceJustification: 'Brief reviewed against scope.', allocationJustification: 'Shared costs allocated by site area.',
    });
    expect(issue.issueNumber).toBe(1);
    expect(issue.sourceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(issue.outputs.map((output) => output.status)).toEqual(['LOCKED', 'LOCKED']);
    expect(appraisalFromApprovedReportIssue(issue).selectedOptionId).toBe(option.id);
  });
});
