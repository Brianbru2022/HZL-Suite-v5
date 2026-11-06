import type { DevelopmentAppraisal } from '../types';
import { parseAppraisalReference } from './appraisal';

/** Move the register's version group without changing any appraisal input or price snapshot. */
export function assignAppraisalFolderAcrossVersions(
  appraisals: DevelopmentAppraisal[],
  appraisalId: string,
  folderId: string,
): DevelopmentAppraisal[] {
  const selected = appraisals.find((appraisal) => appraisal.id === appraisalId);
  if (!selected) return appraisals;
  const baseReference = parseAppraisalReference(selected.reference)?.baseReference;
  const nextFolderId = folderId || undefined;
  return appraisals.map((appraisal) => {
    const matches = baseReference
      ? parseAppraisalReference(appraisal.reference)?.baseReference === baseReference
      : appraisal.id === appraisalId;
    return matches && appraisal.appraisalFolderId !== nextFolderId
      ? { ...appraisal, appraisalFolderId: nextFolderId }
      : appraisal;
  });
}
