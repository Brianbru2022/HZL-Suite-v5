import type { WorkspaceFolder, WorkspaceFolderModule } from '../types';
import { generateId } from './generateId';

export const WORKSPACE_FOLDERS_LOCAL_STORAGE_KEY = 'qs-pro-workspace-folders-v1';
export const ALL_WORKSPACE_FOLDERS_ID = '__all_folders__';
export const ALL_WORKSPACE_YEARS_ID = '__all_years__';
export const UNFILED_ESTIMATE_FOLDER_ID = '__unfiled_estimates__';
export const UNFILED_APPRAISAL_FOLDER_ID = '__unfiled_appraisals__';
export const UNFILED_ESTIMATE_FOLDER_NAME = 'Unfiled estimates';
export const UNFILED_APPRAISAL_FOLDER_NAME = 'Unfiled appraisals';
export const UNDATED_YEAR = 'Undated';

export function createWorkspaceFolder(module: WorkspaceFolderModule, name: string): WorkspaceFolder {
  const timestamp = new Date().toISOString();
  return {
    id: generateId(),
    module,
    name: name.trim() || (module === 'APPRAISALS' ? 'New appraisal folder' : 'New estimate folder'),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function normalizeWorkspaceFolders(value: unknown): WorkspaceFolder[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  return value.reduce<WorkspaceFolder[]>((folders, entry) => {
    if (!entry || typeof entry !== 'object') return folders;
    const source = entry as Record<string, unknown>;
    const id = typeof source.id === 'string' && source.id.trim() ? source.id : generateId();
    const module = source.module === 'ESTIMATING' || source.module === 'APPRAISALS' ? source.module : null;
    const name = typeof source.name === 'string' ? source.name.trim() : '';
    if (!module || !name || seen.has(id)) return folders;

    seen.add(id);
    const timestamp = new Date().toISOString();
    folders.push({
      id,
      module,
      name,
      createdAt: typeof source.createdAt === 'string' ? source.createdAt : timestamp,
      updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : timestamp,
    });
    return folders;
  }, []);
}

export function folderYearFromRevision(updatedAt: string | undefined) {
  const timestamp = Date.parse(updatedAt || '');
  if (!Number.isFinite(timestamp)) return UNDATED_YEAR;
  return String(new Date(timestamp).getFullYear());
}

export function compareFolderYearsDesc(a: string, b: string) {
  if (a === UNDATED_YEAR && b === UNDATED_YEAR) return 0;
  if (a === UNDATED_YEAR) return 1;
  if (b === UNDATED_YEAR) return -1;
  return Number(b) - Number(a);
}

export function compareRevisionDesc<T extends { name?: string; updatedAt?: string }>(a: T, b: T) {
  const dateDelta = (Date.parse(b.updatedAt || '') || 0) - (Date.parse(a.updatedAt || '') || 0);
  if (dateDelta !== 0) return dateDelta;
  return (a.name || '').localeCompare(b.name || '');
}

export function getUnfiledFolder(module: WorkspaceFolderModule): Pick<WorkspaceFolder, 'id' | 'module' | 'name'> {
  return module === 'APPRAISALS'
    ? { id: UNFILED_APPRAISAL_FOLDER_ID, module, name: UNFILED_APPRAISAL_FOLDER_NAME }
    : { id: UNFILED_ESTIMATE_FOLDER_ID, module, name: UNFILED_ESTIMATE_FOLDER_NAME };
}
