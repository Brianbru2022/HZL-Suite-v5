import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearLocalCrashReports,
  formatLocalCrashReportsForSupport,
  listLocalCrashReports,
  recordLocalCrashReport,
  setLocalCrashReportingConsent,
} from './crashReporting';

describe('local crash reporting', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => values.get(key) || null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });
  });

  afterEach(() => {
    setLocalCrashReportingConsent(false);
    clearLocalCrashReports();
    vi.unstubAllGlobals();
  });

  it('does not retain a report without explicit consent', () => {
    recordLocalCrashReport({ source: 'window-error', message: 'No consent' });
    expect(listLocalCrashReports()).toEqual([]);
  });

  it('retains opted-in reports for inclusion in diagnostics', () => {
    setLocalCrashReportingConsent(true);
    recordLocalCrashReport({ source: 'react-boundary', message: 'Render failed', stack: 'stack trace' });

    expect(listLocalCrashReports()).toHaveLength(1);
    expect(formatLocalCrashReportsForSupport()).toContain('Render failed');
  });
});
