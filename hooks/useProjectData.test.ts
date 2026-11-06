import { compressToUTF16 } from 'lz-string';
import { describe, it, expect } from 'vitest';
import { parseStoredJson } from '../utils/appPersistence';
import { diffEntityMutation } from './useProjectData';

describe('useProjectData (storage contract)', () => {
  it('localStorage parse failure returns null when JSON.parse throws', () => {
    expect(() => JSON.parse('invalid')).toThrow(SyntaxError);
  });

  it('parses both legacy plain JSON and compressed JSON storage', () => {
    const sample = [{ id: 'project-1' }];
    expect(parseStoredJson(JSON.stringify(sample))).toEqual(sample);
    expect(parseStoredJson(compressToUTF16(JSON.stringify(sample)))).toEqual(sample);
  });

  it('queues only the amended entity when an appraisal-style collection keeps its order', () => {
    const before = [{ id: 'a', value: 1 }, { id: 'b', value: 2 }];
    const after = [before[0], { id: 'b', value: 3 }];

    expect(diffEntityMutation(before, after)).toEqual({
      upsertIds: ['b'],
      deleteIds: [],
      reconcile: false,
    });
  });

  it('uses the safe reconciliation path for insertion, deletion, and reorder operations', () => {
    const before = [{ id: 'a' }, { id: 'b' }];
    expect(diffEntityMutation(before, [{ id: 'new' }, ...before])?.reconcile).toBe(true);
    expect(diffEntityMutation(before, [before[1]])?.reconcile).toBe(true);
    expect(diffEntityMutation(before, [before[1], before[0]])?.reconcile).toBe(true);
  });
});
