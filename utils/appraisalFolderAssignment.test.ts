import { describe, expect, it } from 'vitest';
import { createDefaultAppraisal } from './appraisal';
import { assignAppraisalFolderAcrossVersions } from './appraisalFolderAssignment';
import { freezeAppraisalVersion, preserveFrozenAppraisals } from './appraisalFreeze';
import { markSiteUnviableAcrossVersions } from './appraisalSiteStatus';

describe('appraisal folder assignment', () => {
  it('moves every version while retaining frozen and unviable appraisal content', () => {
    const frozen = freezeAppraisalVersion({
      ...createDefaultAppraisal(), id: 'a', reference: '2026.016.A', appraisalFolderId: 'old',
    });
    const revision = {
      ...createDefaultAppraisal(), id: 'b', reference: '2026.016.B', appraisalFolderId: 'old',
    };
    const unrelated = { ...createDefaultAppraisal(), id: 'c', reference: '2026.017.A', appraisalFolderId: 'old' };
    const marked = markSiteUnviableAcrossVersions([frozen, revision, unrelated], frozen.id);
    const moved = assignAppraisalFolderAcrossVersions(marked, revision.id, 'new');

    expect(moved.map((appraisal) => appraisal.appraisalFolderId)).toEqual(['new', 'new', 'old']);
    expect(moved[0].options).toBe(marked[0].options);
    expect(moved[0].frozenAt).toBe(marked[0].frozenAt);
    expect(moved[0].unviableMarkedAt).toBe(marked[0].unviableMarkedAt);
    expect(moved[0].updatedAt).toBe(marked[0].updatedAt);
    expect(moved[2]).toBe(marked[2]);

    const attemptedEdit = moved.map((appraisal) => appraisal.id === revision.id ? { ...appraisal, name: 'Changed' } : appraisal);
    expect(preserveFrozenAppraisals(moved, attemptedEdit)[1]).toBe(moved[1]);
    expect(assignAppraisalFolderAcrossVersions(moved, frozen.id, '')[0].appraisalFolderId).toBeUndefined();
  });
});
