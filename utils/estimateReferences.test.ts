import { describe, expect, it } from 'vitest';
import type { Project } from '../types';
import {
  assignEstimateReferences,
  buildEstimateReferenceUpdates,
  buildNextEstimateReference,
  isEstimateReferencePlaceholder,
  parseEstimateReference,
} from './estimateReferences';

function project(id: string, reference: string, updatedAt = '2026-07-01T09:00:00.000Z'): Project {
  return {
    id,
    name: id,
    client: '',
    location: '',
    reference,
    updatedAt,
    measurementStandard: 'SMM7',
    ohpPercentage: 0,
    bills: [],
  };
}

describe('estimate reference generation', () => {
  it('creates the next EST reference for the same year', () => {
    expect(buildNextEstimateReference([
      { reference: 'EST-2026-001' },
      { reference: 'EST-2026-004' },
      { reference: 'EST-2025-099' },
      { reference: 'REF' },
    ], '2026-07-01')).toBe('EST-2026-005');
  });

  it('parses estimate references and detects placeholders', () => {
    expect(parseEstimateReference('est-2026-003')).toEqual({ reference: 'EST-2026-003', year: '2026', sequence: 3 });
    expect(isEstimateReferencePlaceholder('REF')).toBe(true);
    expect(isEstimateReferencePlaceholder('IMP')).toBe(true);
    expect(isEstimateReferencePlaceholder('EST-2026-001')).toBe(false);
  });

  it('assigns references only to placeholder projects', () => {
    const assigned = assignEstimateReferences([
      project('p1', 'REF'),
      project('p2', 'IMP'),
      project('p3', 'CLIENT-REF'),
    ], [
      { reference: 'EST-2026-002' },
    ]);

    expect(assigned.map((entry) => entry.reference)).toEqual(['EST-2026-003', 'EST-2026-004', 'CLIENT-REF']);
  });

  it('returns updates for projects that need backfilled references', () => {
    expect(buildEstimateReferenceUpdates([
      project('p1', 'REF'),
      project('p2', 'EST-2026-006'),
    ])).toEqual([{ id: 'p1', reference: 'EST-2026-001' }]);
  });
});
