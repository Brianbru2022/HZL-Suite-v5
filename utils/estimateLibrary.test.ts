import { describe, expect, it } from 'vitest';
import type { Project, WorkspaceFolder } from '../types';
import { buildEstimateLibraryDropdownView, buildEstimateLibraryFolders } from './estimateLibrary';
import { ALL_WORKSPACE_FOLDERS_ID, ALL_WORKSPACE_YEARS_ID, UNFILED_ESTIMATE_FOLDER_ID } from './workspaceFolders';

function makeProject(id: string, overrides: Partial<Project>): Project {
  return {
    id,
    name: id,
    client: '',
    location: '',
    reference: '',
    updatedAt: '',
    measurementStandard: 'SMM7',
    ohpPercentage: 0,
    bills: [],
    ...overrides,
  };
}

describe('estimate library folders', () => {
  const estimateFolders: WorkspaceFolder[] = [
    {
      id: 'folder-acme',
      module: 'ESTIMATING',
      name: 'Acme folder',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'folder-beta',
      module: 'ESTIMATING',
      name: 'Beta folder',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  it('groups estimates by assigned folder and then automatic revision year', () => {
    const folders = buildEstimateLibraryFolders([
      makeProject('p1', { name: 'Older A', estimateFolderId: 'folder-acme', updatedAt: '2025-03-01T00:00:00.000Z' }),
      makeProject('p2', { name: 'Newer A', estimateFolderId: 'folder-acme', updatedAt: '2026-01-01T00:00:00.000Z' }),
      makeProject('p3', { name: 'Customer B', estimateFolderId: 'folder-beta', updatedAt: '2026-05-01T00:00:00.000Z' }),
      makeProject('p4', { name: 'No client', client: '', updatedAt: '' }),
    ], estimateFolders);

    expect(folders.map((folder) => folder.folderName)).toEqual(['Acme folder', 'Beta folder', 'Unfiled estimates']);
    expect(folders[0].projectCount).toBe(2);
    expect(folders[0].years.map((folder) => folder.year)).toEqual(['2026', '2025']);
    expect(folders[0].years[0].projects.map((project) => project.name)).toEqual(['Newer A']);
    expect(folders[2].years[0].year).toBe('Undated');
  });

  it('sorts estimates newest first inside a year folder', () => {
    const folders = buildEstimateLibraryFolders([
      makeProject('p1', { name: 'First', estimateFolderId: 'folder-acme', updatedAt: '2026-01-01T00:00:00.000Z' }),
      makeProject('p2', { name: 'Second', estimateFolderId: 'folder-acme', updatedAt: '2026-06-01T00:00:00.000Z' }),
    ], estimateFolders);

    expect(folders[0].years[0].projects.map((project) => project.name)).toEqual(['Second', 'First']);
  });

  it('builds a filtered dropdown view by folder, year, and search', () => {
    const view = buildEstimateLibraryDropdownView([
      makeProject('p1', { name: 'Older A', estimateFolderId: 'folder-acme', updatedAt: '2025-03-01T00:00:00.000Z' }),
      makeProject('p2', { name: 'Newer A', estimateFolderId: 'folder-acme', updatedAt: '2026-01-01T00:00:00.000Z' }),
      makeProject('p3', { name: 'Beta project', estimateFolderId: 'folder-beta', updatedAt: '2026-05-01T00:00:00.000Z' }),
      makeProject('p4', { name: 'Loose estimate', updatedAt: '2026-02-01T00:00:00.000Z' }),
    ], estimateFolders, {
      folderId: 'folder-acme',
      year: '2026',
      search: 'newer',
    });

    expect(view.selectedFolderId).toBe('folder-acme');
    expect(view.selectedYear).toBe('2026');
    expect(view.folderOptions.map((option) => option.id)).toEqual([
      ALL_WORKSPACE_FOLDERS_ID,
      'folder-acme',
      'folder-beta',
      UNFILED_ESTIMATE_FOLDER_ID,
    ]);
    expect(view.yearOptions).toEqual(['2026', '2025']);
    expect(view.projects.map((project) => project.name)).toEqual(['Newer A']);
  });

  it('falls back to all years when a selected year is not available for a folder', () => {
    const view = buildEstimateLibraryDropdownView([
      makeProject('p1', { name: 'Only 2026', estimateFolderId: 'folder-acme', updatedAt: '2026-03-01T00:00:00.000Z' }),
    ], estimateFolders, {
      folderId: 'folder-acme',
      year: '2025',
      search: '',
    });

    expect(view.selectedYear).toBe(ALL_WORKSPACE_YEARS_ID);
    expect(view.projects.map((project) => project.name)).toEqual(['Only 2026']);
  });
});
