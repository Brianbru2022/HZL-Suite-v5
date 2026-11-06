import type React from 'react';
import type { ItemLibrary } from '../../types';
import { safeExportFilename } from '../../utils/libraryViewModel';
import { APP_NAME } from '../../utils/branding';
import type { LibraryOperationStatusModel } from './LibraryOperationStatus';

type ToastOptions = { type: 'success' | 'error' | 'info'; message: string; duration?: number };

type UseLibrarySplitJsonActionsParams = {
  isSplittingLibraryJson: boolean;
  setIsSplittingLibraryJson: React.Dispatch<React.SetStateAction<boolean>>;
  cancelLibraryOperationRef: React.MutableRefObject<boolean>;
  parseLibraryJsonImport: (data: unknown) => ItemLibrary[];
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

export function useLibrarySplitJsonActions({
  isSplittingLibraryJson,
  setIsSplittingLibraryJson,
  cancelLibraryOperationRef,
  parseLibraryJsonImport,
  showToast,
  startLibraryOperation,
  updateLibraryOperation,
  finishLibraryOperation,
}: UseLibrarySplitJsonActionsParams) {
  const handleSplitLibraryJsonSections = async () => {
    if (isSplittingLibraryJson) return;
    setIsSplittingLibraryJson(true);
    startLibraryOperation('Splitting library JSON', {
      detail: 'Choosing library JSON...',
      cancelable: true,
    });

    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { readTextFile, writeTextFile } = await import('@tauri-apps/plugin-fs');
      const { join } = await import('@tauri-apps/api/path');

      const selectedJson = await open({
        multiple: false,
        filters: [{ name: `${APP_NAME} library JSON`, extensions: ['json'] }],
      });
      const jsonPath = Array.isArray(selectedJson) ? selectedJson[0] : selectedJson;
      if (!jsonPath || typeof jsonPath !== 'string') {
        finishLibraryOperation('cancelled', { detail: 'Split JSON cancelled before choosing a source file.' });
        return;
      }

      const outputDirectory = await open({
        directory: true,
        multiple: false,
      });
      const outputPath = Array.isArray(outputDirectory) ? outputDirectory[0] : outputDirectory;
      if (!outputPath || typeof outputPath !== 'string') {
        finishLibraryOperation('cancelled', { detail: 'Split JSON cancelled before choosing an output folder.' });
        return;
      }

      updateLibraryOperation({ detail: 'Reading library JSON...', destination: outputPath });
      const parsed = JSON.parse(await readTextFile(jsonPath));
      const librariesToSplit = parseLibraryJsonImport(parsed);
      const envelope = typeof parsed === 'object' && parsed !== null ? parsed as {
        permissions?: ItemLibrary['permissions'];
        markImportedLibrariesAsLocked?: boolean;
      } : {};
      const writtenNames = new Map<string, number>();
      let sectionCount = 0;
      let cancelled = false;

      for (const library of librariesToSplit) {
        if (cancelLibraryOperationRef.current) {
          cancelled = true;
          break;
        }
        const resolvedPermissions = {
          ...(library.permissions || {}),
          ...(envelope.permissions || {}),
          allowExportAll: envelope.markImportedLibrariesAsLocked
            ? false
            : (envelope.permissions?.allowExportAll ?? library.permissions?.allowExportAll ?? !library.exportLocked),
        };

        for (const folder of library.folders || []) {
          if (cancelLibraryOperationRef.current) {
            cancelled = true;
            break;
          }
          for (const section of folder.sections || []) {
            if (cancelLibraryOperationRef.current) {
              cancelled = true;
              break;
            }

            const sectionLibrary: ItemLibrary = {
              ...library,
              exportLocked: resolvedPermissions.allowExportAll === false,
              permissions: resolvedPermissions,
              folders: [{
                ...folder,
                sections: [section],
              }],
            };
            const payload = {
              format: 'QS_PRO_LIBRARY_EXPORT',
              version: 1 as const,
              markImportedLibrariesAsLocked: resolvedPermissions.allowExportAll === false,
              permissions: resolvedPermissions,
              libraries: [sectionLibrary],
            };
            const baseName = [
              'qs-library-section',
              library.name,
              folder.orderRef || folder.name,
              section.orderRef || section.name,
            ].map(safeExportFilename).filter(Boolean).join('-');
            const usedCount = writtenNames.get(baseName) || 0;
            writtenNames.set(baseName, usedCount + 1);
            const filename = `${baseName}${usedCount > 0 ? `-${usedCount + 1}` : ''}.json`;
            await writeTextFile(await join(outputPath, filename), JSON.stringify(payload, null, 2));
            sectionCount += 1;
            updateLibraryOperation({
              detail: `Wrote ${sectionCount.toLocaleString()} section JSON file${sectionCount === 1 ? '' : 's'}...`,
              completedCount: sectionCount,
            });
          }
        }
      }

      if (cancelled) {
        finishLibraryOperation('cancelled', {
          detail: `Stopped after writing ${sectionCount.toLocaleString()} section JSON file${sectionCount === 1 ? '' : 's'}.`,
          completedCount: sectionCount,
          destination: outputPath,
          nextSteps: ['Review written section files', 'Resume with the source JSON if needed', 'Use Export pack for full backups'],
        });
        showToast({
          type: 'info',
          message: `Stopped split JSON export after ${sectionCount.toLocaleString()} file${sectionCount === 1 ? '' : 's'}.`,
        });
      } else {
        finishLibraryOperation('complete', {
          detail: `Exported ${sectionCount.toLocaleString()} individual section JSON file${sectionCount === 1 ? '' : 's'}.`,
          completedCount: sectionCount,
          destination: outputPath,
          nextSteps: ['Open the output folder', 'Import section files selectively', 'Archive the original JSON'],
        });
        showToast({
          type: 'success',
          message: `Exported ${sectionCount.toLocaleString()} individual section JSON file${sectionCount === 1 ? '' : 's'}.`,
        });
      }
    } catch (error) {
      console.error('Split library JSON sections failed', error);
      finishLibraryOperation('error', {
        detail: 'Could not split that library JSON into section files.',
        error: error instanceof Error ? error.message : String(error),
        nextSteps: ['Check the JSON format', 'Choose a writable output folder', 'Try Export pack for full libraries'],
      });
      showToast({
        type: 'error',
        message: 'Could not split that library JSON into section files. Check the JSON format and output folder permissions.',
      });
    } finally {
      setIsSplittingLibraryJson(false);
    }
  };

  return { handleSplitLibraryJsonSections };
}
