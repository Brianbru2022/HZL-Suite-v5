import type { Project } from '../types';

const ESTIMATE_REFERENCE_PATTERN = /^EST-(\d{4})-(\d{3})$/i;
const PLACEHOLDER_REFERENCES = new Set(['', 'REF', 'IMP']);

function referenceYear(date?: string) {
  const parsed = date ? new Date(date) : new Date();
  const year = Number.isFinite(parsed.getTime()) ? parsed.getFullYear() : new Date().getFullYear();
  return String(year);
}

export function parseEstimateReference(reference?: string) {
  const match = String(reference || '').trim().match(ESTIMATE_REFERENCE_PATTERN);
  if (!match) return null;
  return {
    reference: `EST-${match[1]}-${match[2]}`,
    year: match[1],
    sequence: Number(match[2]),
  };
}

export function isEstimateReferencePlaceholder(reference?: string) {
  return PLACEHOLDER_REFERENCES.has(String(reference || '').trim().toUpperCase());
}

export function buildNextEstimateReference(projects: Pick<Project, 'reference'>[] = [], date?: string) {
  const year = referenceYear(date);
  const maxSequence = projects.reduce((max, project) => {
    const parsed = parseEstimateReference(project.reference);
    return parsed?.year === year ? Math.max(max, parsed.sequence) : max;
  }, 0);
  return `EST-${year}-${String(maxSequence + 1).padStart(3, '0')}`;
}

export function ensureEstimateReference(project: Project, existingProjects: Pick<Project, 'reference'>[] = []) {
  if (!isEstimateReferencePlaceholder(project.reference)) return project;
  return {
    ...project,
    reference: buildNextEstimateReference(existingProjects, project.updatedAt),
  };
}

export function assignEstimateReferences(projects: Project[], existingProjects: Pick<Project, 'reference'>[] = []) {
  const assigned: Project[] = [];
  projects.forEach((project) => {
    const next = ensureEstimateReference(project, [...existingProjects, ...assigned]);
    assigned.push(next);
  });
  return assigned;
}

export function buildEstimateReferenceUpdates(projects: Project[]) {
  const assigned = assignEstimateReferences(projects);
  return assigned
    .filter((project, index) => project.reference !== projects[index]?.reference)
    .map((project) => ({ id: project.id, reference: project.reference }));
}
