import { describe, expect, it } from 'vitest';
import type { DevelopmentAppraisal, WorkspaceFolder } from '../types';
import { buildAppraisalRegisterView } from './appraisalRegister';
import { ALL_WORKSPACE_FOLDERS_ID, ALL_WORKSPACE_YEARS_ID, UNFILED_APPRAISAL_FOLDER_ID } from './workspaceFolders';

function makeAppraisal(id: string, overrides: Partial<DevelopmentAppraisal>): DevelopmentAppraisal {
  return {
    id,
    kind: 'HOUSE_BUILDING',
    name: id,
    reference: '',
    client: '',
    site: '',
    appraisalDate: '2026-06-25',
    status: 'DRAFT',
    selectedOptionId: 'option-1',
    options: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const appraisalFolders: WorkspaceFolder[] = [
  {
    id: 'folder-main',
    module: 'APPRAISALS',
    name: 'Main appraisals',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('appraisal register dropdown view', () => {
  it('filters house-building appraisals by folder, year, and search', () => {
    const view = buildAppraisalRegisterView([
      makeAppraisal('a1', { name: 'Older house', appraisalFolderId: 'folder-main', updatedAt: '2025-03-01T00:00:00.000Z' }),
      makeAppraisal('a2', { name: 'New house', appraisalFolderId: 'folder-main', updatedAt: '2026-02-01T00:00:00.000Z' }),
      makeAppraisal('a3', { name: 'Commercial asset', kind: 'COMMERCIAL', appraisalFolderId: 'folder-main', updatedAt: '2026-04-01T00:00:00.000Z' }),
      makeAppraisal('a4', { name: 'Loose house', updatedAt: '2026-05-01T00:00:00.000Z' }),
    ], appraisalFolders, {
      kind: 'HOUSE_BUILDING',
      showArchived: false,
      folderId: 'folder-main',
      year: '2026',
      search: 'new',
    });

    expect(view.selectedFolderId).toBe('folder-main');
    expect(view.selectedYear).toBe('2026');
    expect(view.folderOptions.map((option) => option.id)).toEqual([
      ALL_WORKSPACE_FOLDERS_ID,
      'folder-main',
      UNFILED_APPRAISAL_FOLDER_ID,
    ]);
    expect(view.yearOptions).toEqual(['2026', '2025']);
    expect(view.appraisals.map((appraisal) => appraisal.name)).toEqual(['New house']);
  });

  it('excludes archived appraisals unless requested and resets missing years', () => {
    const view = buildAppraisalRegisterView([
      makeAppraisal('a1', { name: 'Archived', status: 'ARCHIVED', appraisalFolderId: 'folder-main', updatedAt: '2026-03-01T00:00:00.000Z' }),
      makeAppraisal('a2', { name: 'Live', appraisalFolderId: 'folder-main', updatedAt: '2026-02-01T00:00:00.000Z' }),
    ], appraisalFolders, {
      kind: 'HOUSE_BUILDING',
      showArchived: false,
      folderId: 'folder-main',
      year: '2025',
      search: '',
    });

    expect(view.selectedYear).toBe(ALL_WORKSPACE_YEARS_ID);
    expect(view.appraisals.map((appraisal) => appraisal.name)).toEqual(['Live']);
  });

  it('counts multiple revisions of the same appraisal as one folder entry', () => {
    const view = buildAppraisalRegisterView([
      makeAppraisal('a1', { name: 'Sauchie A', reference: '2026.001.A', appraisalFolderId: 'folder-main' }),
      makeAppraisal('a2', { name: 'Sauchie B', reference: '2026.001.B', appraisalFolderId: 'folder-main' }),
      makeAppraisal('a3', { name: 'Other appraisal', reference: '2026.002.A', appraisalFolderId: 'folder-main' }),
    ], appraisalFolders, {
      kind: 'HOUSE_BUILDING',
      showArchived: false,
      folderId: ALL_WORKSPACE_FOLDERS_ID,
      year: ALL_WORKSPACE_YEARS_ID,
      search: '',
    });

    expect(view.folderOptions.find((option) => option.id === ALL_WORKSPACE_FOLDERS_ID)?.count).toBe(2);
    expect(view.folderOptions.find((option) => option.id === 'folder-main')?.count).toBe(2);
    expect(view.appraisals).toHaveLength(3);
  });
});
