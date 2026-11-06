import { describe, expect, it } from 'vitest';
import {
  createWorkspaceFolder,
  folderYearFromRevision,
  normalizeWorkspaceFolders,
} from './workspaceFolders';

describe('workspace folders', () => {
  it('creates a named module folder', () => {
    const folder = createWorkspaceFolder('ESTIMATING', 'HZL');

    expect(folder.module).toBe('ESTIMATING');
    expect(folder.name).toBe('HZL');
    expect(folder.id).toBeTruthy();
    expect(folder.createdAt).toBeTruthy();
  });

  it('normalizes valid folder records and drops invalid entries', () => {
    const folders = normalizeWorkspaceFolders([
      { id: 'estimate-folder', module: 'ESTIMATING', name: 'Estimates', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      { id: 'bad-folder', module: 'UNKNOWN', name: 'Bad' },
      { id: 'blank-folder', module: 'APPRAISALS', name: '' },
    ]);

    expect(folders).toHaveLength(1);
    expect(folders[0]).toMatchObject({ id: 'estimate-folder', module: 'ESTIMATING', name: 'Estimates' });
  });

  it('derives automatic year buckets from revision dates', () => {
    expect(folderYearFromRevision('2026-06-25T10:00:00.000Z')).toBe('2026');
    expect(folderYearFromRevision('')).toBe('Undated');
  });
});
