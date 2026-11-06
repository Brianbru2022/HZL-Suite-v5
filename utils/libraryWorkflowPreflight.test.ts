import { describe, expect, it } from 'vitest';
import type { ItemLibrary } from '../types';
import {
  buildLibraryCatalogImportGuide,
  buildLibraryExportPreflight,
  buildScopedLibraryImportSummary,
} from './libraryWorkflowPreflight';

const library = (id: string, overrides: Partial<ItemLibrary> = {}): ItemLibrary => ({
  id,
  name: `Library ${id}`,
  folders: [{
    id: `${id}-folder`,
    name: 'Folder',
    sections: [{
      id: `${id}-section`,
      name: 'Section',
      items: [],
      itemCount: 100,
    }],
  }],
  ...overrides,
});

describe('library workflow preflight', () => {
  it('summarizes selected export scope and skips protected libraries', () => {
    const preflight = buildLibraryExportPreflight({
      libraries: [
        library('a'),
        library('b', { exportLocked: true }),
      ],
      selectedLibraryIds: { a: true, b: true },
      exportPermissions: { allowExportAll: false },
    });

    expect(preflight.selectedLibraryCount).toBe(1);
    expect(preflight.lockedLibraryCount).toBe(1);
    expect(preflight.metrics.find((metric) => metric.id === 'items')?.value).toBe(100);
    expect(preflight.checks.map((check) => check.id)).toContain('protected');
    expect(preflight.checks.find((check) => check.id === 'permissions')?.severity).toBe('info');
  });

  it('recommends SQLite pack for large or SQLite-backed library exports', () => {
    expect(buildLibraryExportPreflight({
      libraries: [library('small')],
      selectedLibraryIds: { small: true },
    }).recommendedFormat).toBe('json');

    expect(buildLibraryExportPreflight({
      libraries: [library('sqlite', { storageMode: 'sqlite' })],
      selectedLibraryIds: { sqlite: true },
    }).recommendedFormat).toBe('pack');

    expect(buildLibraryExportPreflight({
      libraries: [library('large', {
        folders: [{
          id: 'large-folder',
          name: 'Folder',
          sections: [{ id: 'large-section', name: 'Section', items: [], itemCount: 26000 }],
        }],
      })],
      selectedLibraryIds: { large: true },
    }).recommendedFormat).toBe('pack');
  });

  it('builds import guide checks and scoped import summaries', () => {
    const guide = buildLibraryCatalogImportGuide({
      libraryCount: 2,
      activeLibrary: library('protected', { permissions: { allowLibraryEditing: false } }),
    });
    expect(guide.recommendedFormat).toBe('pack');
    expect(guide.checks.find((check) => check.id === 'active-permissions')?.severity).toBe('warning');

    expect(buildScopedLibraryImportSummary({
      fileName: 'sample.json',
      scopeLabel: 'library section',
      lineCount: 150,
      pageCount: 3,
      importMode: 'LIBRARY_EXPORT',
      existingPageCount: 1,
    })).toContain('150 lines from library export');
  });
});
