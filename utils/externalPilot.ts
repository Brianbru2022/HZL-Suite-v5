export const EXTERNAL_PILOT_STORAGE_KEY = 'hzl-external-pilot-programme-v1';

export const EXTERNAL_PILOT_CHECKPOINTS = [
  { id: 'INSTALL', label: 'Install', detail: 'Install the signed desktop package on the pilot user\'s own Windows profile.' },
  { id: 'APPRAISAL', label: 'Appraisal', detail: 'Create or amend a representative appraisal and save it.' },
  { id: 'EXPORT', label: 'Export', detail: 'Open the exported PDF and Excel outputs and confirm they agree with the live screen.' },
  { id: 'BACKUP', label: 'Backup', detail: 'Create a verified .qsbackup from the pilot profile.' },
  { id: 'RESTORE', label: 'Restore', detail: 'Restore the backup into a clean/disposable profile and reopen the retained data.' },
  { id: 'UPGRADE', label: 'Upgrade', detail: 'Install the next signed build over the pilot install and confirm work reopens.' },
] as const;

export type ExternalPilotCheckpointId = typeof EXTERNAL_PILOT_CHECKPOINTS[number]['id'];
export type ExternalPilotCheckpointStatus = 'PENDING' | 'PASSED' | 'FAILED';
export type ExternalPilotDefectSeverity = 'S1' | 'S2' | 'S3' | 'S4';
export type ExternalPilotDefectStatus = 'OPEN' | 'FIXED' | 'ACCEPTED';

export interface ExternalPilotUser {
  id: string;
  name: string;
  organisation?: string;
  addedAt: string;
  checkpoints: Partial<Record<ExternalPilotCheckpointId, ExternalPilotCheckpointStatus>>;
  notes?: string;
}

export interface ExternalPilotDefect {
  id: string;
  pilotUserId?: string;
  title: string;
  severity: ExternalPilotDefectSeverity;
  status: ExternalPilotDefectStatus;
  raisedAt: string;
  resolvedAt?: string;
  notes?: string;
}

export interface ExternalPilotProgramme {
  users: ExternalPilotUser[];
  defects: ExternalPilotDefect[];
  updatedAt?: string;
}

export const EMPTY_EXTERNAL_PILOT_PROGRAMME: ExternalPilotProgramme = { users: [], defects: [] };

function storage() {
  return typeof window === 'undefined' ? null : window.localStorage;
}

function validCheckpointStatus(value: unknown): value is ExternalPilotCheckpointStatus {
  return value === 'PENDING' || value === 'PASSED' || value === 'FAILED';
}

function validSeverity(value: unknown): value is ExternalPilotDefectSeverity {
  return value === 'S1' || value === 'S2' || value === 'S3' || value === 'S4';
}

function validDefectStatus(value: unknown): value is ExternalPilotDefectStatus {
  return value === 'OPEN' || value === 'FIXED' || value === 'ACCEPTED';
}

export function readExternalPilotProgramme(): ExternalPilotProgramme {
  const local = storage();
  if (!local) return EMPTY_EXTERNAL_PILOT_PROGRAMME;
  try {
    const parsed = JSON.parse(local.getItem(EXTERNAL_PILOT_STORAGE_KEY) || '{}') as Partial<ExternalPilotProgramme>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users.flatMap((user) => user && typeof user.id === 'string' && typeof user.name === 'string' ? [{
        id: user.id, name: user.name, organisation: typeof user.organisation === 'string' ? user.organisation : '', addedAt: typeof user.addedAt === 'string' ? user.addedAt : '', notes: typeof user.notes === 'string' ? user.notes : '',
        checkpoints: Object.fromEntries(EXTERNAL_PILOT_CHECKPOINTS.flatMap((checkpoint) => validCheckpointStatus(user.checkpoints?.[checkpoint.id]) ? [[checkpoint.id, user.checkpoints?.[checkpoint.id]]] : [])),
      }] : []) : [],
      defects: Array.isArray(parsed.defects) ? parsed.defects.flatMap((defect) => defect && typeof defect.id === 'string' && typeof defect.title === 'string' && validSeverity(defect.severity) && validDefectStatus(defect.status) ? [{
        id: defect.id, pilotUserId: typeof defect.pilotUserId === 'string' ? defect.pilotUserId : undefined, title: defect.title, severity: defect.severity, status: defect.status, raisedAt: typeof defect.raisedAt === 'string' ? defect.raisedAt : '', resolvedAt: typeof defect.resolvedAt === 'string' ? defect.resolvedAt : undefined, notes: typeof defect.notes === 'string' ? defect.notes : '',
      }] : []) : [],
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : undefined,
    };
  } catch {
    return EMPTY_EXTERNAL_PILOT_PROGRAMME;
  }
}

export function writeExternalPilotProgramme(programme: ExternalPilotProgramme) {
  const local = storage();
  if (!local) return;
  try {
    local.setItem(EXTERNAL_PILOT_STORAGE_KEY, JSON.stringify({ ...programme, updatedAt: new Date().toISOString() }));
  } catch {
    // Pilot tracking must never interrupt the estimating workspace.
  }
}

export function externalPilotProgress(programme: ExternalPilotProgramme) {
  const total = programme.users.length * EXTERNAL_PILOT_CHECKPOINTS.length;
  const statuses = programme.users.flatMap((user) => EXTERNAL_PILOT_CHECKPOINTS.map((checkpoint) => user.checkpoints[checkpoint.id] || 'PENDING'));
  const openCriticalDefects = programme.defects.filter((defect) => defect.status !== 'FIXED' && (defect.severity === 'S1' || defect.severity === 'S2'));
  return {
    total,
    passed: statuses.filter((status) => status === 'PASSED').length,
    failed: statuses.filter((status) => status === 'FAILED').length,
    pending: statuses.filter((status) => status === 'PENDING').length,
    openCriticalDefects,
  };
}

export function externalPilotReleaseGate(programme: ExternalPilotProgramme) {
  const progress = externalPilotProgress(programme);
  const reasons: string[] = [];
  if (programme.users.length < 3) reasons.push('At least three named pilot users are required.');
  if (programme.users.length > 5) reasons.push('The controlled pilot is limited to five named users.');
  if (progress.pending > 0 || progress.failed > 0) reasons.push('Every pilot checkpoint must pass for every named user.');
  if (progress.openCriticalDefects.length > 0) reasons.push(`${progress.openCriticalDefects.length} S1/S2 defect${progress.openCriticalDefects.length === 1 ? '' : 's'} must be fixed before commercial availability.`);
  return { ready: reasons.length === 0, reasons, progress };
}

export function formatExternalPilotReport(programme: ExternalPilotProgramme, generatedAt = new Date().toISOString()) {
  const gate = externalPilotReleaseGate(programme);
  const lines = [
    '# External Pilot Register',
    '',
    `Generated: ${generatedAt}`,
    `Commercial release gate: ${gate.ready ? 'READY' : 'NOT READY'}`,
    '',
    '## Gate',
    '',
    ...(gate.reasons.length ? gate.reasons.map((reason) => `- ${reason}`) : ['- All named pilot users have completed every checkpoint and no S1/S2 defects remain open.']),
    '',
    '## Pilot Users',
    '',
  ];
  programme.users.forEach((user) => {
    lines.push(`### ${user.name}${user.organisation ? ` (${user.organisation})` : ''}`);
    EXTERNAL_PILOT_CHECKPOINTS.forEach((checkpoint) => lines.push(`- ${checkpoint.label}: ${user.checkpoints[checkpoint.id] || 'PENDING'}`));
    if (user.notes) lines.push(`- Notes: ${user.notes}`);
    lines.push('');
  });
  lines.push('## Defects', '');
  if (programme.defects.length === 0) lines.push('- None recorded.');
  programme.defects.forEach((defect) => lines.push(`- ${defect.severity} ${defect.status}: ${defect.title}${defect.notes ? ` - ${defect.notes}` : ''}`));
  return lines.join('\n');
}
