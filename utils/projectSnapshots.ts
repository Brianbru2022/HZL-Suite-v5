import type { Project, ProjectSnapshot } from '../types';
import { generateId } from './generateId';

export const MAX_PROJECT_SNAPSHOTS = 12;

export function buildSnapshotProjectData(project: Project): Omit<Project, 'snapshots'> {
  const { snapshots: _snapshots, ...projectData } = project;
  return JSON.parse(JSON.stringify(projectData)) as Omit<Project, 'snapshots'>;
}

export function createSnapshotEntry(project: Project, label: string, summary?: string): ProjectSnapshot {
  return {
    id: generateId(),
    label,
    createdAt: new Date().toISOString(),
    summary,
    projectData: buildSnapshotProjectData(project),
  };
}

export function prependSnapshot(
  existingSnapshots: ProjectSnapshot[] | undefined,
  snapshot: ProjectSnapshot,
  maxSnapshots = MAX_PROJECT_SNAPSHOTS
): ProjectSnapshot[] {
  return [snapshot, ...(existingSnapshots || [])].slice(0, maxSnapshots);
}

export function shouldAutoSnapshot(project: Project): boolean {
  return project.autoSnapshotsEnabled !== false;
}

export function withAutoSnapshot(project: Project, label: string, summary?: string): Project {
  if (!shouldAutoSnapshot(project)) return project;
  const snapshot = createSnapshotEntry(project, label, summary);
  return {
    ...project,
    snapshots: prependSnapshot(project.snapshots, snapshot),
  };
}
