import type { DevelopmentAppraisal, DevelopmentAppraisalKind, WorkspaceFolder } from '../types';
import { parseAppraisalReference } from './appraisal';
import {
  ALL_WORKSPACE_FOLDERS_ID,
  ALL_WORKSPACE_YEARS_ID,
  compareFolderYearsDesc,
  compareRevisionDesc,
  folderYearFromRevision,
  UNFILED_APPRAISAL_FOLDER_ID,
  UNFILED_APPRAISAL_FOLDER_NAME,
} from './workspaceFolders';

export type AppraisalRegisterFolderOption = {
  id: string;
  label: string;
  count: number;
  isUnfiled?: boolean;
};

export type AppraisalRegisterFilters = {
  kind: DevelopmentAppraisalKind | 'ALL';
  showArchived: boolean;
  folderId: string;
  year: string;
  search: string;
};

export type AppraisalRegisterView = {
  selectedFolderId: string;
  selectedYear: string;
  folderOptions: AppraisalRegisterFolderOption[];
  yearOptions: string[];
  appraisals: DevelopmentAppraisal[];
};

function matchesKind(appraisal: DevelopmentAppraisal, kind: DevelopmentAppraisalKind | 'ALL') {
  if (kind === 'ALL') return true;
  return kind === 'COMMERCIAL'
    ? appraisal.kind === 'COMMERCIAL'
    : appraisal.kind !== 'COMMERCIAL';
}

function resolveAppraisalFolderId(appraisal: DevelopmentAppraisal, appraisalFolders: WorkspaceFolder[]) {
  if (!appraisal.appraisalFolderId) return UNFILED_APPRAISAL_FOLDER_ID;
  return appraisalFolders.some((folder) => folder.id === appraisal.appraisalFolderId)
    ? appraisal.appraisalFolderId
    : UNFILED_APPRAISAL_FOLDER_ID;
}

function appraisalRegisterGroupKey(appraisal: DevelopmentAppraisal) {
  return parseAppraisalReference(appraisal.reference)?.baseReference || appraisal.id;
}

function countAppraisalGroups(appraisals: DevelopmentAppraisal[]) {
  return new Set(appraisals.map(appraisalRegisterGroupKey)).size;
}

export function buildAppraisalRegisterView(
  appraisals: DevelopmentAppraisal[],
  workspaceFolders: WorkspaceFolder[] = [],
  filters: Partial<AppraisalRegisterFilters> = {}
): AppraisalRegisterView {
  const kind = filters.kind || 'HOUSE_BUILDING';
  const appraisalFolders = workspaceFolders.filter((folder) => folder.module === 'APPRAISALS');
  const visibleAppraisals = appraisals.filter((appraisal) => (
    matchesKind(appraisal, kind)
    && (filters.showArchived || appraisal.status !== 'ARCHIVED')
  ));
  const folderCounts = new Map<string, Set<string>>();
  visibleAppraisals.forEach((appraisal) => {
    const folderId = resolveAppraisalFolderId(appraisal, appraisalFolders);
    const current = folderCounts.get(folderId) || new Set<string>();
    current.add(appraisalRegisterGroupKey(appraisal));
    folderCounts.set(folderId, current);
  });

  const folderOptions: AppraisalRegisterFolderOption[] = [
    { id: ALL_WORKSPACE_FOLDERS_ID, label: 'All folders', count: countAppraisalGroups(visibleAppraisals) },
    ...appraisalFolders
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((folder) => ({
        id: folder.id,
        label: folder.name,
        count: folderCounts.get(folder.id)?.size || 0,
      })),
    {
      id: UNFILED_APPRAISAL_FOLDER_ID,
      label: UNFILED_APPRAISAL_FOLDER_NAME,
      count: folderCounts.get(UNFILED_APPRAISAL_FOLDER_ID)?.size || 0,
      isUnfiled: true,
    },
  ];
  const selectedFolderId = folderOptions.some((option) => option.id === filters.folderId)
    ? filters.folderId!
    : ALL_WORKSPACE_FOLDERS_ID;
  const folderFilteredAppraisals = selectedFolderId === ALL_WORKSPACE_FOLDERS_ID
    ? visibleAppraisals
    : visibleAppraisals.filter((appraisal) => resolveAppraisalFolderId(appraisal, appraisalFolders) === selectedFolderId);
  const yearOptions = Array.from(new Set(folderFilteredAppraisals.map((appraisal) => folderYearFromRevision(appraisal.updatedAt))))
    .sort(compareFolderYearsDesc);
  const selectedYear = filters.year && filters.year !== ALL_WORKSPACE_YEARS_ID && yearOptions.includes(filters.year)
    ? filters.year
    : ALL_WORKSPACE_YEARS_ID;
  const search = (filters.search || '').trim().toLowerCase();
  const searchedAppraisals = search
    ? folderFilteredAppraisals.filter((appraisal) => (
        appraisal.name.toLowerCase().includes(search)
        || (appraisal.client || '').toLowerCase().includes(search)
        || (appraisal.site || '').toLowerCase().includes(search)
        || (appraisal.reference || '').toLowerCase().includes(search)
      ))
    : folderFilteredAppraisals;
  const appraisalsForYear = selectedYear === ALL_WORKSPACE_YEARS_ID
    ? searchedAppraisals
    : searchedAppraisals.filter((appraisal) => folderYearFromRevision(appraisal.updatedAt) === selectedYear);

  return {
    selectedFolderId,
    selectedYear,
    folderOptions,
    yearOptions,
    appraisals: [...appraisalsForYear].sort(compareRevisionDesc),
  };
}
