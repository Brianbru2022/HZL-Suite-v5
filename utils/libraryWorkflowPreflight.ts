import type { ItemLibrary, LibraryPermissions } from '../types';
import {
  canEditLibrary,
  canExportLibraryAll,
  getLibraryStats,
  normalizeLibraryLabel,
} from './libraryViewModel';

export type LibraryWorkflowSeverity = 'success' | 'info' | 'warning' | 'danger';

export type LibraryWorkflowCheck = {
  id: string;
  label: string;
  detail: string;
  severity: LibraryWorkflowSeverity;
};

export type LibraryWorkflowMetric = {
  id: string;
  label: string;
  value: number;
};

export type LibraryExportPreflight = {
  selectedLibraryCount: number;
  exportableLibraryCount: number;
  lockedLibraryCount: number;
  metrics: LibraryWorkflowMetric[];
  itemCount: number;
  sectionCount: number;
  recommendedFormat: 'pack' | 'json';
  checks: LibraryWorkflowCheck[];
};

type BuildLibraryExportPreflightOptions = {
  libraries: ItemLibrary[];
  selectedLibraryIds?: Record<string, boolean>;
  exportPermissions?: LibraryPermissions;
};

function sectionHasSqliteBackedRows(section: ItemLibrary['folders'][number]['sections'][number]): boolean {
  return section.storageMode === 'sqlite' || (section.subSections || []).some(sectionHasSqliteBackedRows);
}

function hasSqliteBackedRows(library: ItemLibrary) {
  return library.storageMode === 'sqlite' || (library.folders || []).some((folder) =>
    (folder.sections || []).some(sectionHasSqliteBackedRows)
  );
}

export function buildLibraryExportPreflight({
  libraries,
  selectedLibraryIds,
  exportPermissions,
}: BuildLibraryExportPreflightOptions): LibraryExportPreflight {
  const exportableLibraries = libraries.filter(canExportLibraryAll);
  const selectedLibraries = selectedLibraryIds
    ? exportableLibraries.filter((library) => selectedLibraryIds[library.id])
    : exportableLibraries;
  const lockedLibraryCount = libraries.length - exportableLibraries.length;
  const totals = selectedLibraries.reduce(
    (current, library) => {
      const stats = getLibraryStats(library);
      return {
        folders: current.folders + stats.folders,
        sections: current.sections + stats.sections,
        pages: current.pages + stats.pages,
        items: current.items + stats.items,
      };
    },
    { folders: 0, sections: 0, pages: 0, items: 0 }
  );
  const hasSqliteRows = selectedLibraries.some(hasSqliteBackedRows);
  const isLargeExport = totals.items > 25000 || totals.sections > 500 || selectedLibraries.length > 3;
  const recommendedFormat = hasSqliteRows || isLargeExport ? 'pack' : 'json';
  const willProtectRecipientCopy = exportPermissions?.allowExportAll === false;

  const checks: LibraryWorkflowCheck[] = [
    selectedLibraries.length > 0
      ? {
          id: 'selection',
          label: `${selectedLibraries.length.toLocaleString()} selected`,
          detail: `${selectedLibraries.map((library) => normalizeLibraryLabel(library.name, 'Library')).slice(0, 3).join(', ')}${selectedLibraries.length > 3 ? '...' : ''}`,
          severity: 'success',
        }
      : {
          id: 'selection',
          label: 'No libraries selected',
          detail: 'Select at least one exportable library before choosing an export format.',
          severity: 'danger',
        },
    lockedLibraryCount > 0
      ? {
          id: 'protected',
          label: `${lockedLibraryCount.toLocaleString()} protected skipped`,
          detail: 'Protected imported libraries stay usable locally, but are not included in full exports.',
          severity: 'warning',
        }
      : {
          id: 'protected',
          label: 'No protected libraries skipped',
          detail: 'Every library in this catalog can be included if selected.',
          severity: 'success',
        },
    isLargeExport
      ? {
          id: 'volume',
          label: 'Large transfer',
          detail: 'Use a SQLite pack for this volume; JSON may be slow and harder to recover from if interrupted.',
          severity: 'warning',
        }
      : {
          id: 'volume',
          label: 'Small transfer',
          detail: 'JSON is suitable for compatibility. SQLite pack is still best for complete backups.',
          severity: 'info',
        },
    willProtectRecipientCopy
      ? {
          id: 'permissions',
          label: 'Recipient copy protected',
          detail: 'Imported copies will be usable for bill insertion but blocked from full re-export unless permissions are changed.',
          severity: 'info',
        }
      : {
          id: 'permissions',
          label: 'Recipient can re-export',
          detail: 'The exported copy keeps full library export permission.',
          severity: 'success',
        },
  ];

  if (hasSqliteRows) {
    checks.push({
      id: 'storage',
      label: 'SQLite-backed rows detected',
      detail: 'Pack export preserves large SQLite-backed standards most reliably.',
      severity: 'info',
    });
  }

  return {
    selectedLibraryCount: selectedLibraries.length,
    exportableLibraryCount: exportableLibraries.length,
    lockedLibraryCount,
    itemCount: totals.items,
    sectionCount: totals.sections,
    recommendedFormat,
    checks,
    metrics: [
      { id: 'libraries', label: 'Libraries', value: selectedLibraries.length },
      { id: 'folders', label: 'Folders', value: totals.folders },
      { id: 'sections', label: 'Sections', value: totals.sections },
      { id: 'items', label: 'Items', value: totals.items },
    ],
  };
}

export type LibraryCatalogImportGuide = {
  checks: LibraryWorkflowCheck[];
  recommendedFormat: 'pack' | 'json';
};

export function buildLibraryCatalogImportGuide({
  libraryCount,
  activeLibrary,
}: {
  libraryCount: number;
  activeLibrary?: ItemLibrary | null;
}): LibraryCatalogImportGuide {
  return {
    recommendedFormat: 'pack',
    checks: [
      {
        id: 'catalog',
        label: `${libraryCount.toLocaleString()} libraries already in catalog`,
        detail: 'JSON imports skip duplicate IDs. Packs are better for restoring complete standards.',
        severity: libraryCount > 0 ? 'info' : 'success',
      },
      activeLibrary && !canEditLibrary(activeLibrary)
        ? {
            id: 'active-permissions',
            label: 'Active library is protected',
            detail: 'Catalog imports can still add new libraries, but protected libraries cannot be edited in place.',
            severity: 'warning',
          }
        : {
            id: 'active-permissions',
            label: 'Editing state clear',
            detail: 'Newly imported editable libraries can be selected after import.',
            severity: 'success',
          },
      {
        id: 'format',
        label: 'Pack import recommended',
        detail: 'Use .qsplib for full library backups; use JSON for compatibility or small hand-off files.',
        severity: 'info',
      },
    ],
  };
}

export type ScopedLibraryImportMode = 'PROJECT' | 'CUSTOM_LIBRARY' | 'LIBRARY_EXPORT';

export function buildScopedLibraryImportSummary({
  fileName,
  scopeLabel,
  lineCount,
  pageCount,
  importMode,
  existingPageCount,
}: {
  fileName: string;
  scopeLabel: string;
  lineCount: number;
  pageCount: number;
  importMode: ScopedLibraryImportMode;
  existingPageCount: number;
}) {
  const sourceLabel = importMode === 'LIBRARY_EXPORT'
    ? 'library export'
    : importMode === 'CUSTOM_LIBRARY'
      ? 'item/library JSON'
      : 'project export';
  const destinationLabel = pageCount > 1 && existingPageCount > 0
    ? `${pageCount.toLocaleString()} new pages`
    : scopeLabel;
  const volumeNote = lineCount > 25000
    ? 'Large JSON import; allow time for the library repository to update.'
    : 'Import size is suitable for JSON.';

  return `${fileName}: ${lineCount.toLocaleString()} line${lineCount === 1 ? '' : 's'} from ${sourceLabel}; destination ${destinationLabel}. ${volumeNote}`;
}
