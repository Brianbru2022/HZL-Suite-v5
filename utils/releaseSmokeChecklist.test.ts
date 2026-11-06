import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RELEASE_SMOKE_CHECKLIST,
  formatReleaseSmokeChecklistReport,
  getReleaseSmokeChecklistProgress,
  readReleaseSmokeChecklistState,
  setReleaseSmokeCheckStatus,
  writeReleaseSmokeChecklistState,
} from './releaseSmokeChecklist';

const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');

function installBrowserStorageMock() {
  const storage = new Map<string, string>();

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: vi.fn((key: string) => storage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
          storage.set(key, value);
        }),
      },
    },
  });

  return storage;
}

function restoreWindow() {
  if (originalWindowDescriptor) {
    Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
    return;
  }
  delete (globalThis as Record<string, unknown>).window;
}

describe('releaseSmokeChecklist', () => {
  beforeEach(() => {
    installBrowserStorageMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    restoreWindow();
  });

  it('tracks checklist progress by status', () => {
    let state = {};
    state = setReleaseSmokeCheckStatus(state, RELEASE_SMOKE_CHECKLIST[0].id, 'passed');
    state = setReleaseSmokeCheckStatus(state, RELEASE_SMOKE_CHECKLIST[1].id, 'issue');

    expect(getReleaseSmokeChecklistProgress(state)).toEqual({
      total: RELEASE_SMOKE_CHECKLIST.length,
      passed: 1,
      issue: 1,
      pending: RELEASE_SMOKE_CHECKLIST.length - 2,
    });
  });

  it('persists only known checklist ids and valid statuses', () => {
    const state = {
      [RELEASE_SMOKE_CHECKLIST[0].id]: 'passed',
      [RELEASE_SMOKE_CHECKLIST[1].id]: 'issue',
      unknown: 'passed',
      [RELEASE_SMOKE_CHECKLIST[2].id]: 'bad-status',
    };

    writeReleaseSmokeChecklistState(state as never);

    expect(readReleaseSmokeChecklistState()).toEqual({
      [RELEASE_SMOKE_CHECKLIST[0].id]: 'passed',
      [RELEASE_SMOKE_CHECKLIST[1].id]: 'issue',
    });
  });

  it('formats a copyable release smoke report', () => {
    const state = setReleaseSmokeCheckStatus({}, RELEASE_SMOKE_CHECKLIST[0].id, 'passed');

    const report = formatReleaseSmokeChecklistReport(state, {
      appName: 'HZL QS Suite',
      releaseLabel: '0.1.11',
      generatedAt: '2026-06-15T12:00:00.000Z',
    });

    expect(report).toContain('HZL QS Suite release smoke checklist');
    expect(report).toContain('Release: 0.1.11');
    expect(report).toContain(`Progress: 1/${RELEASE_SMOKE_CHECKLIST.length} passed`);
    expect(report).toContain('[PASSED] App opens to a usable workspace');
    expect(report).toContain('One-click backup and diagnostics export work');
  });
});
