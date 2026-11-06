import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearOperationLogEntries,
  formatOperationLogForClipboard,
  listOperationLogEntries,
  recordOperationLogEntry,
  subscribeToOperationLog,
} from './operationLog';

const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
const originalCustomEventDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'CustomEvent');

function installBrowserStorageMock() {
  const storage = new Map<string, string>();
  const listeners = new Map<string, Set<(event: Event) => void>>();

  class TestCustomEvent extends Event {
    constructor(type: string) {
      super(type);
    }
  }

  Object.defineProperty(globalThis, 'CustomEvent', {
    configurable: true,
    value: TestCustomEvent,
  });

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: vi.fn((key: string) => storage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
          storage.set(key, value);
        }),
      },
      addEventListener: vi.fn((eventName: string, listener: (event: Event) => void) => {
        const eventListeners = listeners.get(eventName) ?? new Set();
        eventListeners.add(listener);
        listeners.set(eventName, eventListeners);
      }),
      removeEventListener: vi.fn((eventName: string, listener: (event: Event) => void) => {
        listeners.get(eventName)?.delete(listener);
      }),
      dispatchEvent: vi.fn((event: Event) => {
        listeners.get(event.type)?.forEach((listener) => listener(event));
        return true;
      }),
    },
  });
}

function restoreGlobal(name: 'window' | 'CustomEvent', descriptor: PropertyDescriptor | undefined) {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor);
    return;
  }
  delete (globalThis as Record<string, unknown>)[name];
}

describe('operationLog', () => {
  beforeEach(() => {
    installBrowserStorageMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    restoreGlobal('window', originalWindowDescriptor);
    restoreGlobal('CustomEvent', originalCustomEventDescriptor);
  });

  it('records rich operation details in most-recent-first order', () => {
    recordOperationLogEntry({
      kind: 'export',
      status: 'success',
      subject: 'Library pack export',
      message: 'Exported a pack.',
      path: 'C:/Exports/library.qsplib',
      counts: { projects: 1, libraries: 1, trades: 2, items: 25 },
      nextStep: 'Import this pack on the receiving machine.',
    });
    recordOperationLogEntry({
      kind: 'import',
      status: 'error',
      subject: 'JSON import',
      message: 'The JSON file could not be parsed.',
      error: 'Unexpected token',
    });

    const entries = listOperationLogEntries();

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      kind: 'import',
      status: 'error',
      subject: 'JSON import',
      error: 'Unexpected token',
    });
    expect(entries[1]).toMatchObject({
      path: 'C:/Exports/library.qsplib',
      counts: { projects: 1, libraries: 1, trades: 2, items: 25 },
      nextStep: 'Import this pack on the receiving machine.',
    });
  });

  it('keeps bill audit entries and detailed row counts', () => {
    recordOperationLogEntry({
      kind: 'bill',
      status: 'success',
      subject: 'Inserted Standards rows',
      message: 'Inserted standards rows into Bill 1.',
      projectId: 'project-1',
      projectName: 'Sample project',
      billId: 'bill-1',
      billName: 'Bill 1',
      counts: { items: 10, pricedItems: 6, structureRows: 4, added: 10 },
    });

    expect(listOperationLogEntries()[0]).toMatchObject({
      kind: 'bill',
      subject: 'Inserted Standards rows',
      projectId: 'project-1',
      projectName: 'Sample project',
      billId: 'bill-1',
      billName: 'Bill 1',
      counts: { items: 10, pricedItems: 6, structureRows: 4, added: 10 },
    });
  });

  it('formats operation history for copying into diagnostics', () => {
    recordOperationLogEntry({
      kind: 'export',
      status: 'success',
      subject: 'PDF export',
      message: 'Saved Bill.pdf',
      projectName: 'Sample project',
      billName: 'Bill 1',
      counts: { files: 1 },
      durationMs: 1234,
    });

    const text = formatOperationLogForClipboard(listOperationLogEntries());

    expect(text).toContain('SUCCESS export: PDF export');
    expect(text).toContain('Saved Bill.pdf');
    expect(text).toContain('Scope: Sample project / Bill 1');
    expect(text).toContain('files: 1');
    expect(text).toContain('Duration: 1,234ms');
  });

  it('notifies subscribers when history changes and can clear entries', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToOperationLog(listener);

    recordOperationLogEntry({
      kind: 'system',
      status: 'info',
      subject: 'Storage',
      message: 'SQLite restored.',
    });
    clearOperationLogEntries();
    unsubscribe();
    recordOperationLogEntry({
      kind: 'system',
      status: 'info',
      subject: 'Storage',
      message: 'Another event.',
    });

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listOperationLogEntries()).toHaveLength(1);
  });
});
