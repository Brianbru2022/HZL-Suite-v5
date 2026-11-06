import type { AppraisalSiteStatus, DevelopmentAppraisal, WorkspaceFolder } from '../types';
import { parseAppraisalReference } from './appraisal';

export function appraisalSiteGroupKey(appraisal: DevelopmentAppraisal): string {
  const site = (appraisal.site || '').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
  if (site) return `site:${site}`;
  const reference = parseAppraisalReference(appraisal.reference)?.baseReference;
  return reference ? `reference:${reference.toLocaleLowerCase()}` : `appraisal:${appraisal.id}`;
}

export function isBidLostFolderName(name: string | undefined): boolean {
  return /^(bid lost|bids lost|lost bids)$/i.test((name || '').trim().replace(/\s+/g, ' '));
}

/** Bring existing sites filed as Bid Lost into line without changing frozen figures. */
export function reconcileBidLostFolderStatuses(
  appraisals: DevelopmentAppraisal[],
  folders: WorkspaceFolder[],
): DevelopmentAppraisal[] {
  const folderIds = new Set(folders.filter((folder) => folder.module === 'APPRAISALS' && isBidLostFolderName(folder.name)).map((folder) => folder.id));
  if (!folderIds.size) return appraisals;
  const siteKeys = new Set(appraisals.filter((appraisal) => folderIds.has(appraisal.appraisalFolderId || '')).map(appraisalSiteGroupKey));
  if (!siteKeys.size) return appraisals;
  let changed = false;
  const next = appraisals.map((appraisal) => {
    if (!siteKeys.has(appraisalSiteGroupKey(appraisal)) || (appraisal.siteStatus === 'BID_LOST' && !appraisal.unviableMarkedAt)) return appraisal;
    changed = true;
    return { ...appraisal, siteStatus: 'BID_LOST' as const, unviableMarkedAt: undefined };
  });
  return changed ? next : appraisals;
}

/** Site disposition is operational metadata; changing it does not change a frozen price snapshot. */
export function setSiteStatusAcrossVersions(
  appraisals: DevelopmentAppraisal[],
  appraisalId: string,
  status: AppraisalSiteStatus,
): DevelopmentAppraisal[] {
  const selected = appraisals.find((appraisal) => appraisal.id === appraisalId);
  if (!selected) return appraisals;
  const groupKey = appraisalSiteGroupKey(selected);
  return appraisals.map((appraisal) => (
    appraisalSiteGroupKey(appraisal) === groupKey && (appraisal.siteStatus !== status || (status !== 'NOT_VIABLE' && appraisal.unviableMarkedAt))
      ? { ...appraisal, siteStatus: status, unviableMarkedAt: status === 'NOT_VIABLE' ? appraisal.unviableMarkedAt : undefined }
      : appraisal
  ));
}

export function markSiteUnviableAcrossVersions(
  appraisals: DevelopmentAppraisal[],
  appraisalId: string,
  markedAt: string = new Date().toISOString(),
): DevelopmentAppraisal[] {
  const selected = appraisals.find((appraisal) => appraisal.id === appraisalId);
  if (!selected) return appraisals;
  const groupKey = appraisalSiteGroupKey(selected);
  return appraisals.map((appraisal) => (
    appraisalSiteGroupKey(appraisal) === groupKey
      ? { ...appraisal, siteStatus: 'NOT_VIABLE', unviableMarkedAt: markedAt }
      : appraisal
  ));
}
