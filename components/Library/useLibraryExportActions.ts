import type React from 'react';
import type { ItemLibrary, LibraryFolder, LibrarySection } from '../../types';
import {
  exportLibraryFolderFromRepository,
  exportLibrarySectionFromRepository,
} from '../../utils/libraryRepository';
import {
  canExportLibraryFolders,
  canExportLibrarySections,
  flattenLibrarySections,
  formatOrderedLabel,
  normalizeLibraryLabel,
  safeExportFilename,
  sortLibraryNodes,
  sortLibrarySections,
} from '../../utils/libraryViewModel';
import { APP_NAME } from '../../utils/branding';
import { recordOperationLogEntry } from '../../utils/operationLog';
import type { LibraryOperationStatusModel } from './LibraryOperationStatus';

type ToastOptions = { type: 'success' | 'error' | 'info'; message: string; duration?: number };

type UseLibraryExportActionsParams = {
  activeLib: ItemLibrary | undefined;
  isExportingFolderSectionsJson: boolean;
  isExportingLibrarySectionsJson: boolean;
  setIsExportingFolderSectionsJson: React.Dispatch<React.SetStateAction<boolean>>;
  setIsExportingLibrarySectionsJson: React.Dispatch<React.SetStateAction<boolean>>;
  cancelLibraryOperationRef: React.MutableRefObject<boolean>;
  onExport: (data: unknown, filename: string) => void;
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

export function useLibraryExportActions({
  activeLib,
  isExportingFolderSectionsJson,
  isExportingLibrarySectionsJson,
  setIsExportingFolderSectionsJson,
  setIsExportingLibrarySectionsJson,
  cancelLibraryOperationRef,
  onExport,
  showToast,
  startLibraryOperation,
  updateLibraryOperation,
  finishLibraryOperation,
}: UseLibraryExportActionsParams) {
  const buildScopedLibraryJsonPayload = (library: ItemLibrary) => ({
    format: 'QS_PRO_LIBRARY_EXPORT',
    version: 1 as const,
    markImportedLibrariesAsLocked: library.permissions?.allowExportAll === false,
    permissions: library.permissions,
    libraries: [library],
  });

  const safeExportPathSegment = (value: string | undefined, fallback: string) => {
    const safe = safeExportFilename(value || fallback).slice(0, 90);
    return safe || safeExportFilename(fallback);
  };

  const exportScopedLibraryJson = async (library: ItemLibrary, filenameParts: string[], successLabel: string) => {
    const payload = buildScopedLibraryJsonPayload(library);
    const filename = `${filenameParts.map(safeExportFilename).filter(Boolean).join('-')}-${new Date().toISOString().split('T')[0]}.json`;
    let outputPath = filename;

    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      const path = await save({
        defaultPath: filename,
        filters: [{ name: `${APP_NAME} library JSON`, extensions: ['json'] }],
      });
      if (!path) {
        recordOperationLogEntry({
          kind: 'export',
          status: 'cancelled',
          subject: 'Library JSON export',
          message: `Export of ${successLabel} was cancelled before choosing a destination.`,
          counts: { libraries: 1 },
        });
        return;
      }
      await writeTextFile(path, JSON.stringify(payload, null, 2));
      outputPath = path;
    } catch (error) {
      console.warn('Native library JSON save failed, falling back to browser download', error);
      onExport(payload, filename);
    }

    showToast({ type: 'success', message: `Exported ${successLabel}.` });
    recordOperationLogEntry({
      kind: 'export',
      status: 'success',
      subject: 'Library JSON export',
      message: `Exported ${successLabel}.`,
      path: outputPath,
      counts: { libraries: 1 },
      nextStep: 'Use Import JSON only for small or compatibility transfers. Use Export pack for large libraries.',
    });
  };

  const writeScopedLibraryJson = async (
    outputPath: string,
    filename: string,
    library: ItemLibrary,
    writeTextFile: (path: string, contents: string) => Promise<void>,
    join: (...paths: string[]) => Promise<string>
  ) => {
    const payload = buildScopedLibraryJsonPayload(library);
    await writeTextFile(await join(outputPath, filename), JSON.stringify(payload, null, 2));
  };

  const buildSectionNameIndexPayload = (library: ItemLibrary, folders: LibraryFolder[]) => ({
    format: 'QS_PRO_LIBRARY_SECTION_INDEX',
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    library: {
      id: library.id,
      name: normalizeLibraryLabel(library.name, 'Library'),
    },
    folders: sortLibraryNodes(folders || []).map((folder) => ({
      id: folder.id,
      orderRef: folder.orderRef || '',
      name: normalizeLibraryLabel(folder.name, 'Folder'),
      sections: flattenLibrarySections(sortLibrarySections(folder.sections || [])).map((section) => ({
        id: section.id,
        orderRef: section.orderRef || '',
        name: normalizeLibraryLabel(section.name, 'Section'),
        parentSectionId: section.parentSectionId || '',
      })),
    })),
  });

  const saveSectionNameIndexJson = async (library: ItemLibrary, folders: LibraryFolder[], filenameParts: string[], successLabel: string) => {
    const payload = buildSectionNameIndexPayload(library, folders);
    const filename = `${filenameParts.map(safeExportFilename).filter(Boolean).join('-')}-${new Date().toISOString().split('T')[0]}.json`;
    let outputPath = filename;

    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      const path = await save({
        defaultPath: filename,
        filters: [{ name: `${APP_NAME} section index JSON`, extensions: ['json'] }],
      });
      if (!path) {
        recordOperationLogEntry({
          kind: 'export',
          status: 'cancelled',
          subject: 'Section names JSON export',
          message: `Export of ${successLabel} was cancelled before choosing a destination.`,
          counts: { folders: folders.length },
        });
        return;
      }
      await writeTextFile(path, JSON.stringify(payload, null, 2));
      outputPath = path;
    } catch (error) {
      console.warn('Native section index save failed, falling back to browser download', error);
      onExport(payload, filename);
    }

    showToast({ type: 'success', message: `Exported ${successLabel}.` });
    recordOperationLogEntry({
      kind: 'export',
      status: 'success',
      subject: 'Section names JSON export',
      message: `Exported ${successLabel}.`,
      path: outputPath,
      counts: {
        folders: folders.length,
        sections: folders.reduce((count, folder) => count + flattenLibrarySections(folder.sections || []).length, 0),
      },
    });
  };

  const exportLibrarySectionsToDirectory = async (
    library: ItemLibrary,
    outputPath: string,
    folders: LibraryFolder[],
    options: { includeLibraryDirectory: boolean }
  ) => {
    const { mkdir, writeTextFile } = await import('@tauri-apps/plugin-fs');
    const { join } = await import('@tauri-apps/api/path');
    const rootPath = options.includeLibraryDirectory
      ? await join(outputPath, safeExportPathSegment(normalizeLibraryLabel(library.name, 'Library'), 'library'))
      : outputPath;

    await mkdir(rootPath, { recursive: true });

    const failures: Array<{ folder: string; section: string; reason: string }> = [];
    let exportedCount = 0;
    let cancelled = false;
    const totalSections = folders.reduce((count, folder) => count + flattenLibrarySections(folder.sections || []).length, 0);

    for (const folder of sortLibraryNodes(folders || [])) {
      if (cancelLibraryOperationRef.current) {
        cancelled = true;
        break;
      }

      const folderLabel = formatOrderedLabel(folder.orderRef, folder.name, 'Folder');
      const folderPath = await join(rootPath, safeExportPathSegment(folderLabel, 'folder'));
      await mkdir(folderPath, { recursive: true });

      const writtenNames = new Map<string, number>();
      for (const section of flattenLibrarySections(sortLibrarySections(folder.sections || []))) {
        if (cancelLibraryOperationRef.current) {
          cancelled = true;
          break;
        }

        const sectionLabel = formatOrderedLabel(section.orderRef, section.name, 'Section');
        updateLibraryOperation({
          detail: `Exporting ${exportedCount + 1} of ${totalSections.toLocaleString()} section JSON files...`,
          completedCount: exportedCount,
          totalCount: totalSections,
          destination: rootPath,
        });

        try {
          const exportedLibrary = await exportLibrarySectionFromRepository(library.id, folder.id, section.id, library.permissions);
          if (!exportedLibrary) {
            throw new Error('Repository did not return section data.');
          }

          const baseName = safeExportPathSegment(sectionLabel, 'section');
          const usedCount = writtenNames.get(baseName) || 0;
          writtenNames.set(baseName, usedCount + 1);
          const filename = `${baseName}${usedCount > 0 ? `-${usedCount + 1}` : ''}.json`;
          await writeScopedLibraryJson(folderPath, filename, exportedLibrary, writeTextFile, join);
          exportedCount += 1;
        } catch (error) {
          console.error('Section JSON export failed', { library: library.name, folder: folderLabel, section: sectionLabel, error });
          failures.push({
            folder: folderLabel,
            section: sectionLabel,
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    if (failures.length > 0 || cancelled) {
      const manifest = {
        exportedAt: new Date().toISOString(),
        library: library.name,
        exportedCount,
        failedCount: failures.length,
        cancelled,
        failures,
      };
      await writeTextFile(
        await join(rootPath, '_section-export-errors.json'),
        JSON.stringify(manifest, null, 2)
      );
    }

    return { exportedCount, failedCount: failures.length, cancelled, rootPath };
  };

  const handleExportFolder = async (folder: LibraryFolder) => {
    if (!activeLib) return;
    if (!canExportLibraryFolders(activeLib)) {
      showToast({ type: 'error', message: 'Folder export is disabled for this imported library.' });
      return;
    }

    const exportedLibrary = await exportLibraryFolderFromRepository(activeLib.id, folder.id, activeLib.permissions);
    if (!exportedLibrary) {
      showToast({ type: 'error', message: 'That folder could not be exported.' });
      return;
    }

    await exportScopedLibraryJson(
      exportedLibrary,
      ['qs-library-folder', activeLib.name, folder.orderRef || folder.name],
      `folder "${formatOrderedLabel(folder.orderRef, folder.name, 'Folder')}"`
    );
  };

  const handleExportFolderSectionNames = async (folder: LibraryFolder) => {
    if (!activeLib) return;
    if (flattenLibrarySections(folder.sections || []).length === 0) {
      showToast({ type: 'info', message: 'That folder does not contain any section names to export.' });
      return;
    }

    await saveSectionNameIndexJson(
      activeLib,
      [folder],
      ['qs-section-index', activeLib.name, folder.orderRef || folder.name],
      `section names for "${formatOrderedLabel(folder.orderRef, folder.name, 'Folder')}"`
    );
  };

  const handleExportSection = async (folder: LibraryFolder, section: LibrarySection) => {
    if (!activeLib) return;
    if (!canExportLibrarySections(activeLib)) {
      showToast({ type: 'error', message: 'Section export is disabled for this imported library.' });
      return;
    }

    const exportedLibrary = await exportLibrarySectionFromRepository(activeLib.id, folder.id, section.id, activeLib.permissions);
    if (!exportedLibrary) {
      showToast({ type: 'error', message: 'That section could not be exported.' });
      return;
    }

    await exportScopedLibraryJson(
      exportedLibrary,
      ['qs-library-section', activeLib.name, folder.orderRef || folder.name, section.orderRef || section.name],
      `section "${formatOrderedLabel(section.orderRef, section.name, 'Section')}"`
    );
  };

  const handleExportFolderSections = async (folder: LibraryFolder) => {
    if (!activeLib || isExportingFolderSectionsJson) return;
    if (!canExportLibrarySections(activeLib)) {
      showToast({ type: 'error', message: 'Section export is disabled for this imported library.' });
      return;
    }
    if (flattenLibrarySections(folder.sections || []).length === 0) {
      showToast({ type: 'info', message: 'That folder does not contain any sections to export.' });
      return;
    }

    setIsExportingFolderSectionsJson(true);
    startLibraryOperation('Exporting folder sections as JSON', {
      detail: 'Choosing output folder...',
      totalCount: flattenLibrarySections(folder.sections || []).length,
      cancelable: true,
    });

    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const outputDirectory = await open({ directory: true, multiple: false });
      const outputPath = Array.isArray(outputDirectory) ? outputDirectory[0] : outputDirectory;
      if (!outputPath || typeof outputPath !== 'string') {
        finishLibraryOperation('cancelled', { detail: 'Folder section JSON export cancelled before choosing an output folder.' });
        recordOperationLogEntry({
          kind: 'export',
          status: 'cancelled',
          subject: 'Folder section JSON export',
          message: `Export of individual section JSON files from "${formatOrderedLabel(folder.orderRef, folder.name, 'Folder')}" was cancelled before choosing an output folder.`,
          counts: { sections: flattenLibrarySections(folder.sections || []).length },
        });
        return;
      }

      const { exportedCount, failedCount, cancelled, rootPath } = await exportLibrarySectionsToDirectory(
        activeLib,
        outputPath,
        [folder],
        { includeLibraryDirectory: false }
      );

      finishLibraryOperation(cancelled ? 'cancelled' : 'complete', {
        detail: `${cancelled ? 'Stopped after exporting' : 'Exported'} ${exportedCount.toLocaleString()} section JSON file${exportedCount === 1 ? '' : 's'}${failedCount > 0 ? `; ${failedCount.toLocaleString()} failed and were logged` : ''}.`,
        completedCount: exportedCount,
        totalCount: flattenLibrarySections(folder.sections || []).length,
        failedCount,
        destination: rootPath,
        nextSteps: failedCount > 0
          ? ['Open _section-export-errors.json', 'Retry failed sections', 'Use Export pack for large transfers']
          : ['Open the destination folder', 'Import section JSON where needed', 'Use Export pack for full backup'],
      });
      showToast({
        type: cancelled || failedCount > 0 ? 'info' : 'success',
        message: `${cancelled ? 'Stopped after exporting' : 'Exported'} ${exportedCount.toLocaleString()} section JSON file${exportedCount === 1 ? '' : 's'} from "${formatOrderedLabel(folder.orderRef, folder.name, 'Folder')}"${failedCount > 0 ? `; ${failedCount.toLocaleString()} failed and were logged.` : '.'}`,
      });
      recordOperationLogEntry({
        kind: 'export',
        status: cancelled ? 'cancelled' : failedCount > 0 ? 'info' : 'success',
        subject: 'Folder section JSON export',
        message: `${cancelled ? 'Stopped after exporting' : 'Exported'} ${exportedCount.toLocaleString()} section JSON file${exportedCount === 1 ? '' : 's'} from "${formatOrderedLabel(folder.orderRef, folder.name, 'Folder')}"${failedCount > 0 ? `; ${failedCount.toLocaleString()} failed and were logged.` : '.'}`,
        path: rootPath,
        counts: {
          sections: flattenLibrarySections(folder.sections || []).length,
          files: exportedCount,
          failed: failedCount,
        },
        nextStep: failedCount > 0
          ? 'Open _section-export-errors.json in the destination folder to see which sections failed.'
          : 'Use the exported section files as individual JSON imports where needed.',
      });
    } catch (error) {
      console.error('Folder section JSON export failed', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      finishLibraryOperation('error', {
        detail: 'Could not export the folder sections as JSON files.',
        error: errorMessage,
        nextSteps: ['Check output folder permissions', 'Try a smaller scope', 'Use Export pack for full libraries'],
      });
      recordOperationLogEntry({
        kind: 'export',
        status: 'error',
        subject: 'Folder section JSON export',
        message: `Could not export section JSON files from "${formatOrderedLabel(folder.orderRef, folder.name, 'Folder')}".`,
        error: errorMessage,
        counts: { sections: flattenLibrarySections(folder.sections || []).length },
        nextStep: 'Check output folder permissions and try again. For large transfers, use Export pack instead.',
      });
      showToast({
        type: 'error',
        message: 'Could not export the folder sections as JSON files. Check the output folder permissions and try again.',
      });
    } finally {
      setIsExportingFolderSectionsJson(false);
    }
  };

  const handleExportLibrarySections = async (library: ItemLibrary) => {
    if (!library || isExportingLibrarySectionsJson) return;
    if (!canExportLibrarySections(library)) {
      showToast({ type: 'error', message: 'Section export is disabled for this imported library.' });
      return;
    }

    const folders = sortLibraryNodes(library.folders || []);
    const sectionCount = folders.reduce((count, folder) => count + flattenLibrarySections(folder.sections || []).length, 0);
    if (sectionCount === 0) {
      showToast({ type: 'info', message: 'That library does not contain any sections to export.' });
      return;
    }

    setIsExportingLibrarySectionsJson(true);
    startLibraryOperation('Exporting library sections as JSON', {
      detail: 'Choosing output folder...',
      totalCount: sectionCount,
      cancelable: true,
    });

    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const outputDirectory = await open({ directory: true, multiple: false });
      const outputPath = Array.isArray(outputDirectory) ? outputDirectory[0] : outputDirectory;
      if (!outputPath || typeof outputPath !== 'string') {
        finishLibraryOperation('cancelled', { detail: 'Library section JSON export cancelled before choosing an output folder.' });
        recordOperationLogEntry({
          kind: 'export',
          status: 'cancelled',
          subject: 'Library section JSON export',
          message: `Export of individual section JSON files from "${normalizeLibraryLabel(library.name, 'Library')}" was cancelled before choosing an output folder.`,
          counts: { sections: sectionCount },
        });
        return;
      }

      const { exportedCount, failedCount, cancelled, rootPath } = await exportLibrarySectionsToDirectory(
        library,
        outputPath,
        folders,
        { includeLibraryDirectory: true }
      );

      finishLibraryOperation(cancelled ? 'cancelled' : 'complete', {
        detail: `${cancelled ? 'Stopped after exporting' : 'Exported'} ${exportedCount.toLocaleString()} section JSON file${exportedCount === 1 ? '' : 's'}${failedCount > 0 ? `; ${failedCount.toLocaleString()} failed and were logged` : ''}.`,
        completedCount: exportedCount,
        totalCount: sectionCount,
        failedCount,
        destination: rootPath,
        nextSteps: failedCount > 0
          ? ['Open _section-export-errors.json', 'Retry failed sections', 'Use Export pack for large transfers']
          : ['Open the destination folder', 'Import section JSON where needed', 'Use Export pack for full backup'],
      });
      showToast({
        type: cancelled || failedCount > 0 ? 'info' : 'success',
        message: `${cancelled ? 'Stopped after exporting' : 'Exported'} ${exportedCount.toLocaleString()} section JSON file${exportedCount === 1 ? '' : 's'} from "${normalizeLibraryLabel(library.name, 'Library')}"${failedCount > 0 ? `; ${failedCount.toLocaleString()} failed and were logged.` : '.'}`,
      });
      recordOperationLogEntry({
        kind: 'export',
        status: cancelled ? 'cancelled' : failedCount > 0 ? 'info' : 'success',
        subject: 'Library section JSON export',
        message: `${cancelled ? 'Stopped after exporting' : 'Exported'} ${exportedCount.toLocaleString()} section JSON file${exportedCount === 1 ? '' : 's'} from "${normalizeLibraryLabel(library.name, 'Library')}"${failedCount > 0 ? `; ${failedCount.toLocaleString()} failed and were logged.` : '.'}`,
        path: rootPath,
        counts: {
          sections: sectionCount,
          files: exportedCount,
          failed: failedCount,
        },
        nextStep: failedCount > 0
          ? 'Open _section-export-errors.json in the destination folder to see which sections failed.'
          : 'Use the exported section files as individual JSON imports where needed.',
      });
    } catch (error) {
      console.error('Library section JSON export failed', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      finishLibraryOperation('error', {
        detail: 'Could not export the library sections as JSON files.',
        error: errorMessage,
        nextSteps: ['Check output folder permissions', 'Try one folder first', 'Use Export pack for full libraries'],
      });
      recordOperationLogEntry({
        kind: 'export',
        status: 'error',
        subject: 'Library section JSON export',
        message: `Could not export individual section JSON files from "${normalizeLibraryLabel(library.name, 'Library')}".`,
        error: errorMessage,
        counts: { sections: sectionCount },
        nextStep: 'Check output folder permissions and try again. For large transfers, use Export pack instead.',
      });
      showToast({
        type: 'error',
        message: 'Could not export the library sections as JSON files. Check the output folder permissions and try again.',
      });
    } finally {
      setIsExportingLibrarySectionsJson(false);
    }
  };

  const handleExportLibrarySectionNames = async (library: ItemLibrary) => {
    if (!library) return;
    const folders = sortLibraryNodes(library.folders || []);
    const sectionCount = folders.reduce((count, folder) => count + flattenLibrarySections(folder.sections || []).length, 0);
    if (sectionCount === 0) {
      showToast({ type: 'info', message: 'That library does not contain any section names to export.' });
      return;
    }

    await saveSectionNameIndexJson(
      library,
      folders,
      ['qs-section-index', library.name],
      `section names for "${normalizeLibraryLabel(library.name, 'Library')}"`
    );
  };

  return {
    handleExportFolder,
    handleExportFolderSectionNames,
    handleExportSection,
    handleExportFolderSections,
    handleExportLibrarySections,
    handleExportLibrarySectionNames,
  };
}
