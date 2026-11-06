import { describe, expect, it } from 'vitest';
import { assessLibraryGovernance, recordLibraryGovernanceChange } from './libraryGovernance';

describe('library governance', () => {
  it('identifies the mandatory control fields and overdue review dates', () => {
    expect(assessLibraryGovernance({ governance: { approvalStatus: 'DRAFT', reviewDate: '2026-01-01' } }, '2026-08-31').map((issue) => issue.code)).toEqual(expect.arrayContaining(['OWNER', 'SOURCE', 'RATE_DATE', 'INDEX_BASIS', 'REVIEW_OVERDUE']));
  });

  it('retains a bounded local change history', () => {
    const governance = recordLibraryGovernanceChange(undefined, { owner: 'Brian', source: 'Supplier quote', rateDate: '2026-08-01', indexBasis: 'BCIS 233', reviewDate: '2027-02-01', approvalStatus: 'APPROVED' }, 'Initial controlled issue');
    expect(governance.changeHistory).toHaveLength(1);
    expect(governance.changeHistory?.[0].summary).toBe('Initial controlled issue');
  });
});
