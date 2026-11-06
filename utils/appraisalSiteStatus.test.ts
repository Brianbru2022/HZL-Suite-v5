import { describe, expect, it } from 'vitest';
import { createDefaultAppraisal } from './appraisal';
import { freezeAppraisalVersion } from './appraisalFreeze';
import { markSiteUnviableAcrossVersions, reconcileBidLostFolderStatuses, setSiteStatusAcrossVersions } from './appraisalSiteStatus';

describe('site viability across appraisal versions', () => {
  it('changes the site decision without changing frozen pricing or other sites', () => {
    const original = freezeAppraisalVersion({
      ...createDefaultAppraisal(), id: 'original', site: 'Helensfield, Alloa', reference: '2026.016.A',
    });
    const revision = {
      ...createDefaultAppraisal(), id: 'revision', site: ' Helensfield,  Alloa ', reference: '2026.016.B',
    };
    const other = { ...createDefaultAppraisal(), id: 'other', site: 'Another site', reference: '2026.017.A' };

    const statusOnly = setSiteStatusAcrossVersions([original, revision, other], original.id, 'NOT_VIABLE');
    expect(statusOnly[0].unviableMarkedAt).toBeUndefined();
    const updated = markSiteUnviableAcrossVersions(statusOnly, original.id, '2026-10-14T12:00:00.000Z');
    expect(updated.map((appraisal) => appraisal.siteStatus)).toEqual(['NOT_VIABLE', 'NOT_VIABLE', other.siteStatus]);
    expect(updated[0].unviableMarkedAt).toBe('2026-10-14T12:00:00.000Z');
    expect(updated[1].unviableMarkedAt).toBe('2026-10-14T12:00:00.000Z');
    expect(updated[0].options).toBe(original.options);
    expect(updated[0].frozenAt).toBe(original.frozenAt);
    expect(updated[0].updatedAt).toBe(original.updatedAt);
    expect(updated[2]).toBe(other);

    const reopened = setSiteStatusAcrossVersions(updated, revision.id, 'APPRAISAL_IN_PROGRESS');
    expect(reopened[0].siteStatus).toBe('APPRAISAL_IN_PROGRESS');
    expect(reopened[1].siteStatus).toBe('APPRAISAL_IN_PROGRESS');
    expect(reopened[0].unviableMarkedAt).toBeUndefined();

    const lost = setSiteStatusAcrossVersions(reopened, revision.id, 'BID_LOST');
    expect(lost.map((appraisal) => appraisal.siteStatus)).toEqual(['BID_LOST', 'BID_LOST', other.siteStatus]);
    expect(lost[0].frozenAt).toBe(original.frozenAt);
    expect(lost[0].options).toBe(original.options);
  });

  it('corrects existing unviable versions filed under Bid Lost without changing their figures', () => {
    const frozen = freezeAppraisalVersion({ ...createDefaultAppraisal(), id: 'a', site: 'Netherburn', reference: '2026.001.A', appraisalFolderId: 'lost' });
    const revision = { ...createDefaultAppraisal(), id: 'b', site: 'Netherburn', reference: '2026.001.B', appraisalFolderId: 'lost' };
    const marked = markSiteUnviableAcrossVersions([frozen, revision], frozen.id);
    const corrected = reconcileBidLostFolderStatuses(marked, [{ id: 'lost', module: 'APPRAISALS', name: 'Bid Lost', createdAt: '', updatedAt: '' }]);
    expect(corrected.map((entry) => entry.siteStatus)).toEqual(['BID_LOST', 'BID_LOST']);
    expect(corrected.every((entry) => !entry.unviableMarkedAt)).toBe(true);
    expect(corrected[0].options).toBe(marked[0].options);
    expect(corrected[0].frozenAt).toBe(marked[0].frozenAt);
    expect(reconcileBidLostFolderStatuses(corrected, [{ id: 'lost', module: 'APPRAISALS', name: 'Bid Lost', createdAt: '', updatedAt: '' }])).toBe(corrected);
  });
});
