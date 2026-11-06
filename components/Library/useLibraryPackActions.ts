import { useEffect } from 'react';
import type React from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ItemLibrary, LibraryPermissions } from '../../types';
import { listLibraryCatalogs } from '../../utils/libraryRepository';
import { APP_NAME } from '../../utils/branding';
import { recordOperationLogEntry } from '../../utils/operationLog';
import type { LibraryOperationStatusModel } from './LibraryOperationStatus';

type ToastOptions = { type: 'success' | 'error' | 'info'; message: string; duration?: number };

type LibraryPackProgressEvent = {
  operation: 'export' | 'import';
  phase: string;
  detail: string;
  completedLibraries: number;
  totalLibraries: number;
  completedItems: number;
  totalItems: number;
};

type LibraryPackExportResult = {
  exportedLibraries: number;
  exportedItems: number;
  destinationPath: string;
};

type LibraryPackImportResult = {
  importedLibraries: number;
  importedItems: number;
};

type UseLibraryPackActionsParams = {
  exportableLibraries: ItemLibrary[];
  lockedLibraryCount: number;
  selectedExportLibraries: ItemLibrary[];
  exportPermissions: LibraryPermissions;
  isExportingLibraries: boolean;
  isImportingLibraryPack: boolean;
  setIsExportingLibraries: React.Dispatch<React.SetStateAction<boolean>>;
  setIsImportingLibraryPack: React.Dispatch<React.SetStateAction<boolean>>;
  setIsExportDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setLibraries: React.Dispatch<React.SetStateAction<ItemLibrary[]>>;
  setLibraryOperationStatus: React.Dispatch<React.SetStateAction<LibraryOperationStatusModel | null>>;
  setLibraryPackProgress: React.Dispatch<React.SetStateAction<string>>;
  showToast: (options: ToastOptions) => void;
  startLibraryOperation: (
    label: string,
    options?: Partial<Omit<LibraryOperationStatusModel, 'label' | 'phase' | 'startedAt'>>
  ) => void;
  updateLibraryOperation: (patch: Partial<LibraryOperationStatusModel>) => void;
  finishLibraryOperation: (
    phase: Exclude<LibraryOperationStatusModel['phase'], 'running'>,
    patch?: Partial<LibraryOperationStatusModel>
  ) => void;
};

export function useLibraryPackActions({
  exportableLibraries,
  lockedLibraryCount,
  selectedExportLibraries,
  exportPermissions,
  isExportingLibraries,
  isImportingLibraryPack,
  setIsExportingLibraries,
  setIsImportingLibraryPack,
  setIsExportDialogOpen,
  setLibraries,
  setLibraryOperationStatus,
  setLibraryPackProgress,
  showToast,
  startLibraryOperation,
  updateLibraryOperation,
  finishLibraryOperation,
}: UseLibraryPackActionsParams) {
  useEffect(() => {
    let isMounted = true;
    let unlisten: (() => void) | undefined;

    const attachListener = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlisten = await listen<LibraryPackProgressEvent>('library-pack-progress', (event) => {
          if (!isMounted) return;
          const progress = event.payload;
          const label = progress.operation === 'export'
            ? 'Exporting SQLite library pack'
            : 'Importing SQLite library pack';
          const totalCount = progress.totalItems || progress.totalLibraries || undefined;
          const completedCount = progress.totalItems ? progress.completedItems : progress.completedLibraries;

          setLibraryOperationStatus((current) => ({
            label,
            phase: current?.phase === 'cancelled' || current?.phase === 'error' ? current.phase : 'running',
            startedAt: current?.startedAt || new Date().toISOString(),
            destination: current?.destination,
            detail: progress.detail,
            completedCount,
            totalCount,
          }));
          setLibraryPackProgress(progress.detail);
        });
      } catch {
        // Browser/localStorage fallback cannot listen for Tauri progress events.
      }
    };

    void attachListener();
    return () => {
      isMounted = false;
      if (unlisten) unlisten();
    };
  }, [setLibraryOperationStatus, setLibraryPackProgress]);

  const handleExportLibraryPack = async () => {
    if (isExportingLibraries) return;
    if (exportableLibraries.length === 0) {
      showToast({
        type: 'info',
        message: lockedLibraryCount > 0
          ? 'All current libraries were imported as protected copies and cannot be exported again.'
          : 'There are no libraries available to export yet.',
      });
      return;
    }
    if (selectedExportLibraries.length === 0) {
      showToast({ type: 'info', message: 'Select at least one library to export.' });
      return;
    }

    setIsExportingLibraries(true);
    startLibraryOperation('Exporting SQLite library pack', {
      detail: 'Choosing destination...',
      totalCount: selectedExportLibraries.length,
    });

    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const path = await save({
        defaultPath: `qs-libraries-${new Date().toISOString().split('T')[0]}${!exportPermissions.allowExportAll ? '-protected' : ''}.qsplib`,
        filters: [
          { name: `${APP_NAME} library pack`, extensions: ['qsplib'] },
        ],
      });
      if (!path) {
        setIsExportingLibraries(false);
        finishLibraryOperation('cancelled', { detail: 'Library pack export cancelled.' });
        recordOperationLogEntry({
          kind: 'export',
          status: 'cancelled',
          subject: 'SQLite library pack export',
          message: 'Library pack export was cancelled before choosing a destination.',
          counts: { libraries: selectedExportLibraries.length },
        });
        return;
      }

      updateLibraryOperation({ detail: 'Copying selected libraries into SQLite pack...', destination: path });
      const result = await invoke<LibraryPackExportResult>('export_library_sqlite_pack', {
        libraryIds: selectedExportLibraries.map((library) => library.id),
        permissions: exportPermissions,
        destinationPath: path,
      });

      setIsExportDialogOpen(false);
      showToast({
        type: 'success',
        message: `Exported ${result.exportedLibraries.toLocaleString()} librar${result.exportedLibraries === 1 ? 'y' : 'ies'} and ${result.exportedItems.toLocaleString()} item row${result.exportedItems === 1 ? '' : 's'} as a SQLite library pack.`,
      });
      finishLibraryOperation('complete', {
        detail: `Exported ${result.exportedLibraries.toLocaleString()} librar${result.exportedLibraries === 1 ? 'y' : 'ies'} and ${result.exportedItems.toLocaleString()} item row${result.exportedItems === 1 ? '' : 's'} as a SQLite pack.`,
        completedCount: result.exportedItems,
        totalCount: result.exportedItems,
        destination: result.destinationPath || path,
        nextSteps: ['Use Import pack on another install', 'Keep this .qsplib with project backups', 'Check Operation Log for the destination'],
      });
      recordOperationLogEntry({
        kind: 'export',
        status: 'success',
        subject: 'SQLite library pack export',
        message: `Exported ${result.exportedLibraries.toLocaleString()} librar${result.exportedLibraries === 1 ? 'y' : 'ies'} and ${result.exportedItems.toLocaleString()} item row${result.exportedItems === 1 ? '' : 's'} as a SQLite pack.`,
        path: result.destinationPath || path,
        counts: {
          libraries: result.exportedLibraries,
          items: result.exportedItems,
        },
        nextStep: 'Use Import pack on another HZL QS Suite installation to restore this library pack.',
      });
    } catch (error) {
      console.error('Library pack export failed', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      finishLibraryOperation('error', {
        detail: 'Library pack export failed.',
        error: errorMessage,
        nextSteps: ['Check destination permissions', 'Try another folder', 'Export JSON only for small compatibility files'],
      });
      recordOperationLogEntry({
        kind: 'export',
        status: 'error',
        subject: 'SQLite library pack export',
        message: 'Library pack export failed.',
        error: errorMessage,
        counts: { libraries: selectedExportLibraries.length },
        nextStep: 'Check that the destination folder is writable and that SQLite is available, then try Export pack again.',
      });
      showToast({
        type: 'error',
        message: 'Library pack export failed. Check that the destination is writable and try again.',
      });
    } finally {
      setIsExportingLibraries(false);
    }
  };

  const handleImportLibraryPack = async () => {
    if (isImportingLibraryPack) return;
    setIsImportingLibraryPack(true);
    startLibraryOperation('Importing SQLite library pack', { detail: 'Choosing library pack...' });

    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        multiple: false,
        filters: [
          { name: `${APP_NAME} library pack`, extensions: ['qsplib'] },
        ],
      });
      const path = Array.isArray(selected) ? selected[0] : selected;
      if (!path || typeof path !== 'string') {
        finishLibraryOperation('cancelled', { detail: 'Library pack import cancelled.' });
        recordOperationLogEntry({
          kind: 'import',
          status: 'cancelled',
          subject: 'SQLite library pack import',
          message: 'Library pack import was cancelled before choosing a file.',
        });
        return;
      }

      updateLibraryOperation({ detail: 'Importing SQLite library pack...', destination: path });
      const result = await invoke<LibraryPackImportResult>('import_library_sqlite_pack', {
        sourcePath: path,
      });
      const nextLibraries = await listLibraryCatalogs();
      setLibraries(nextLibraries);

      showToast({
        type: 'success',
        message: `Imported ${result.importedLibraries.toLocaleString()} librar${result.importedLibraries === 1 ? 'y' : 'ies'} and ${result.importedItems.toLocaleString()} item row${result.importedItems === 1 ? '' : 's'} from the library pack.`,
      });
      finishLibraryOperation('complete', {
        detail: `Imported ${result.importedLibraries.toLocaleString()} librar${result.importedLibraries === 1 ? 'y' : 'ies'} and ${result.importedItems.toLocaleString()} item row${result.importedItems === 1 ? '' : 's'} from the library pack.`,
        completedCount: result.importedItems,
        totalCount: result.importedItems,
        destination: path,
        nextSteps: ['Open the library selector', 'Check priced item counts', 'Export a backup after review'],
      });
      recordOperationLogEntry({
        kind: 'import',
        status: 'success',
        subject: 'SQLite library pack import',
        message: `Imported ${result.importedLibraries.toLocaleString()} librar${result.importedLibraries === 1 ? 'y' : 'ies'} and ${result.importedItems.toLocaleString()} item row${result.importedItems === 1 ? '' : 's'} from the library pack.`,
        path,
        counts: {
          libraries: result.importedLibraries,
          items: result.importedItems,
        },
        nextStep: 'Open the library selector and confirm the imported libraries appear with the expected priced item count.',
      });
    } catch (error) {
      console.error('Library pack import failed', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      finishLibraryOperation('error', {
        detail: 'Library pack import failed.',
        error: errorMessage,
        nextSteps: ['Confirm the file is .qsplib', 'Try Import JSON for old backups', 'Open diagnostics if the issue repeats'],
      });
      recordOperationLogEntry({
        kind: 'import',
        status: 'error',
        subject: 'SQLite library pack import',
        message: 'Library pack import failed.',
        error: errorMessage,
        nextStep: `Check that the selected file is a current ${APP_NAME} .qsplib SQLite pack. Old JSON-lines packs must be re-exported in the latest build.`,
      });
      showToast({
        type: 'error',
        message: `Library pack import failed. Check that this is an ${APP_NAME} .qsplib file.`,
      });
    } finally {
      setIsImportingLibraryPack(false);
    }
  };

  return {
    handleExportLibraryPack,
    handleImportLibraryPack,
  };
}
