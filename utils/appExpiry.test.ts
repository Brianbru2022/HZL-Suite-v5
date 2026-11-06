import { describe, expect, it } from 'vitest';
import { evaluateFallbackExpiryStatus, EXPIRY_TIME } from './appExpiry';

describe('app expiry helper', () => {
  it('allows launches before expiry', () => {
    const status = evaluateFallbackExpiryStatus(EXPIRY_TIME - 1, null);
    expect(status.locked).toBe(false);
    expect(status.reason).toBe('valid');
  });

  it('blocks at and after expiry', () => {
    const status = evaluateFallbackExpiryStatus(EXPIRY_TIME, null);
    expect(status.locked).toBe(true);
    expect(status.expired).toBe(true);
    expect(status.reason).toBe('expired');
  });

  it('blocks clear clock rollback', () => {
    const status = evaluateFallbackExpiryStatus(2_000_000, 2_000_000 + (16 * 60 * 1000));
    expect(status.locked).toBe(true);
    expect(status.clockRollbackDetected).toBe(true);
    expect(status.reason).toBe('clock_rollback');
  });

  it('allows small clock drift inside the grace window', () => {
    const status = evaluateFallbackExpiryStatus(2_000_000, 2_000_000 + (15 * 60 * 1000));
    expect(status.locked).toBe(false);
    expect(status.reason).toBe('valid');
  });
});
