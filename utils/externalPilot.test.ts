import { describe, expect, it } from 'vitest';
import { EXTERNAL_PILOT_CHECKPOINTS, externalPilotReleaseGate, formatExternalPilotReport, type ExternalPilotProgramme } from './externalPilot';

function completedProgramme(): ExternalPilotProgramme {
  return {
    users: ['Ava', 'Ben', 'Cora'].map((name, index) => ({
      id: String(index), name, addedAt: '', checkpoints: Object.fromEntries(EXTERNAL_PILOT_CHECKPOINTS.map((checkpoint) => [checkpoint.id, 'PASSED'])),
    })),
    defects: [],
  };
}

describe('external pilot release gate', () => {
  it('requires three named users and every checkpoint to pass', () => {
    const programme = completedProgramme();
    expect(externalPilotReleaseGate(programme).ready).toBe(true);
    programme.users.pop();
    expect(externalPilotReleaseGate(programme).reasons).toContain('At least three named pilot users are required.');
  });

  it('blocks commercial availability for an open S1 or S2 defect', () => {
    const programme = completedProgramme();
    programme.defects.push({ id: 'defect', title: 'Save failure', severity: 'S2', status: 'OPEN', raisedAt: '' });
    expect(externalPilotReleaseGate(programme).ready).toBe(false);
    expect(externalPilotReleaseGate(programme).reasons.join(' ')).toContain('S1/S2 defect');
    programme.defects[0].status = 'ACCEPTED';
    expect(externalPilotReleaseGate(programme).ready).toBe(false);
    programme.defects[0].status = 'FIXED';
    expect(externalPilotReleaseGate(programme).ready).toBe(true);
  });

  it('formats a portable named-user pilot record', () => {
    const report = formatExternalPilotReport(completedProgramme(), '2026-08-31T12:00:00.000Z');
    expect(report).toContain('Commercial release gate: READY');
    expect(report).toContain('### Ava');
    expect(report).toContain('- Upgrade: PASSED');
  });
});
