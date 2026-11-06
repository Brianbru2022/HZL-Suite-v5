import { describe, expect, it } from 'vitest';
import { parseStoredJson } from './appPersistence';

describe('app persistence JSON parsing', () => {
  it('accepts a UTF-8 byte-order mark on a stored entity row', () => {
    expect(parseStoredJson<{ id: string }>('\ufeff{"id":"commercial-pilot"}')).toEqual({ id: 'commercial-pilot' });
  });
});
