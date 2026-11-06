import type React from 'react';
import type { ConfirmOptions } from '../Modals/ConfirmDialog';
import type { BoQItem, ItemLibrary, LibraryFolder, LibrarySection, Project } from '../../types';
import { appendLibraryItems, createPage } from '../../utils/libraryRepository';
import { canEditLibrary } from '../../utils/libraryViewModel';
import { generateId } from '../../utils/generateId';
import { APP_NAME } from '../../utils/branding';
import { recordOperationLogEntry } from '../../utils/operationLog';
import {
  buildScopedLibraryImportSummary,
  type ScopedLibraryImportMode,
} from '../../utils/libraryWorkflowPreflight';
import type { LibraryOperationStatusModel } from './LibraryOperationStatus';

type ToastOptions = { type: 'success' | 'error' | 'info'; message: string; duration?: number };
type ImportPage = { name: string; items: BoQItem[] };
type CustomLibraryImport = { library_name?: string; section?: string };

type UseLibraryImportJsonActionsParams = {
  activeLib: ItemLibrary | undefined;
  activeFolder: LibraryFolder | undefined;
  activeSection: LibrarySection | undefined;
  askConfirm: (options: ConfirmOptions) => Promise<boolean>;
  showToast: (options: ToastOptions) => void;
  parseBoQItemsJsonImport: (data: unknown) => BoQItem[] | null;
  isCustomLibraryImportShape: (data: unknown) => data is CustomLibraryImport;
  buildItemsFromCustomLibraryImport: (data: CustomLibraryImport) => BoQItem[];
  parseLibraryJsonImport: (data: unknown) => ItemLibrary[];
  flattenLibrariesToImportPages: (libraries: ItemLibrary[]) => ImportPage[];
  parseProjectJsonImport: (data: unknown) => Project[];
  flattenBillToItems: (bill: Project['bills'][number], options?: { includeBillHeading?: boolean; includeSectionHeadings?: boolean; includePageHeadings?: boolean }) => BoQItem[];
  loadSectionItems: (offset?: number, limit?: number) => Promise<void>;
  refreshLibraryMetadata: () => Promise<void>;
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

export function useLibraryImportJsonActions({
  activeLib,
  activeFolder,
  activeSection,
  askConfirm,
  showToast,
  parseBoQItemsJsonImport,
  isCustomLibraryImportShape,
  buildItemsFromCustomLibraryImport,
  parseLibraryJsonImport,
  flattenLibrariesToImportPages,
  parseProjectJsonImport,
  flattenBillToItems,
  loadSectionItems,
  refreshLibraryMetadata,
  startLibraryOperation,
  updateLibraryOperation,
  finishLibraryOperation,
}: UseLibraryImportJsonActionsParams) {
  const handleImportJsonIntoLibraryScope = async (payload: { pageId?: string }) => {
    if (!activeLib || !activeFolder || !activeSection) return;
    if (!canEditLibrary(activeLib)) {
      showToast({ type: 'error', message: 'Library editing is disabled for this imported library.' });
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      try {
        startLibraryOperation('Importing section JSON', { detail: `Reading "${file.name}"...` });
        const text = await file.text();
        const parsedJson = JSON.parse(text);
        let importedItems: BoQItem[] = [];
        let importedPages: ImportPage[] = [];
        let importSummaryLabel = `${APP_NAME} project export`;
        let importMode: ScopedLibraryImportMode = 'PROJECT';

        const directBoQItems = parseBoQItemsJsonImport(parsedJson);
        if (directBoQItems) {
          importedItems = directBoQItems;
          importedPages = [{
            name: file.name.replace(/\.json$/i, ''),
            items: importedItems,
          }];
          importSummaryLabel = `${APP_NAME} item JSON`;
          importMode = 'CUSTOM_LIBRARY';
        } else if (isCustomLibraryImportShape(parsedJson)) {
          importedItems = buildItemsFromCustomLibraryImport(parsedJson);
          importedPages = [{
            name: parsedJson.section || parsedJson.library_name || file.name.replace(/\.json$/i, ''),
            items: importedItems,
          }];
          importSummaryLabel = parsedJson.library_name || parsedJson.section || 'custom library JSON';
          importMode = 'CUSTOM_LIBRARY';
        } else {
          try {
            const importedLibraries = parseLibraryJsonImport(parsedJson);
            importedPages = flattenLibrariesToImportPages(importedLibraries);
            importedItems = importedPages.flatMap((page) => page.items);
            importSummaryLabel = importedLibraries.length === 1 ? importedLibraries[0].name : `${importedLibraries.length} libraries`;
            importMode = 'LIBRARY_EXPORT';
          } catch {
            const importedProjects = parseProjectJsonImport(parsedJson);
            importedItems = importedProjects.flatMap((project, projectIndex) =>
              project.bills.flatMap((bill, billIndex) =>
                flattenBillToItems(bill, {
                  includeBillHeading: importedProjects.length > 1 || project.bills.length > 1 || projectIndex > 0 || billIndex > 0,
                  includeSectionHeadings: true,
                  includePageHeadings: true,
                })
              )
            );
            importedPages = [{
              name: file.name.replace(/\.json$/i, ''),
              items: importedItems,
            }];
            importSummaryLabel = `${APP_NAME} project export`;
          }
        }

        if (importedItems.length === 0 && importedPages.length === 0) {
          finishLibraryOperation('complete', {
            detail: `No bill items were found in "${file.name}".`,
            nextSteps: ['Check the JSON source type', 'Try a library export or project export', 'Review diagnostics if needed'],
          });
          recordOperationLogEntry({
            kind: 'import',
            status: 'info',
            subject: 'Library JSON import',
            message: `${file.name}: no bill items were found for the selected library scope.`,
            path: file.name,
            counts: { items: 0 },
            nextStep: 'Check that the JSON contains HZL/QS library, project, or item rows before importing again.',
          });
          showToast({ type: 'info', message: 'No bill items were found in that JSON file.' });
          return;
        }

        const scopeLabel = payload.pageId ? 'library page' : 'library section';
        const importedLineCount = payload.pageId
          ? importedItems.length
          : importedPages.reduce((count, page) => count + page.items.length, 0);
        const preflightSummary = buildScopedLibraryImportSummary({
          fileName: file.name,
          scopeLabel,
          lineCount: importedLineCount,
          pageCount: importedPages.length,
          importMode,
          existingPageCount: activeSection.pages?.length || 0,
        });
        const ok = await askConfirm({
          title: `Import JSON into ${scopeLabel}`,
          message: payload.pageId
            ? `${preflightSummary} Import into this ${scopeLabel}?`
            : `${preflightSummary}${importedPages.length > 1 ? ` The import will create ${importedPages.length.toLocaleString()} pages where needed.` : ''} Continue?`,
          confirmLabel: 'Import',
          cancelLabel: 'Cancel',
        });
        if (!ok) {
          finishLibraryOperation('cancelled', { detail: `Import cancelled for "${file.name}".` });
          recordOperationLogEntry({
            kind: 'import',
            status: 'cancelled',
            subject: 'Library JSON import',
            message: `${file.name}: import into ${scopeLabel} cancelled before changes were made.`,
            path: file.name,
            counts: {
              pages: importedPages.length,
              items: importedLineCount,
            },
          });
          return;
        }

        updateLibraryOperation({
          detail: `Importing ${importedLineCount.toLocaleString()} line${importedLineCount === 1 ? '' : 's'} into ${scopeLabel}...`,
          totalCount: importedLineCount,
        });
        if (payload.pageId) {
          await appendLibraryItems(
            { libraryId: activeLib.id, folderId: activeFolder.id, sectionId: activeSection.id, pageId: payload.pageId },
            importedItems
          );
        } else if ((importMode === 'CUSTOM_LIBRARY' || (importMode === 'LIBRARY_EXPORT' && importedPages.length === 1)) && !(activeSection.pages || []).length) {
          await appendLibraryItems(
            { libraryId: activeLib.id, folderId: activeFolder.id, sectionId: activeSection.id },
            importedItems
          );
          await loadSectionItems(0);
        } else {
          for (let index = 0; index < importedPages.length; index += 1) {
            const page = importedPages[index];
            await createPage(activeLib.id, activeFolder.id, activeSection.id, {
              id: generateId(),
              name: page.name || `Imported page ${index + 1}`,
              items: page.items,
            });
          }
        }
        await refreshLibraryMetadata();

        finishLibraryOperation('complete', {
          detail: payload.pageId
            ? `Imported ${importedItems.length.toLocaleString()} line${importedItems.length === 1 ? '' : 's'} into the ${scopeLabel}.`
            : `Imported ${importedPages.length > 1 ? `${importedPages.length.toLocaleString()} pages` : `${importedLineCount.toLocaleString()} line${importedLineCount === 1 ? '' : 's'}`} into the ${scopeLabel}.`,
          completedCount: importedLineCount,
          totalCount: importedLineCount,
          nextSteps: ['Review the imported rows', 'Check page names and totals', 'Export a backup after review'],
        });
        showToast({
          type: 'success',
          message: payload.pageId
            ? `Imported ${importedItems.length} line${importedItems.length === 1 ? '' : 's'} from ${importSummaryLabel} into the ${scopeLabel}.`
            : `Imported ${importedPages.length > 1 ? `${importedPages.length} pages` : `${importedLineCount} line${importedLineCount === 1 ? '' : 's'}`} from ${importSummaryLabel} into the ${scopeLabel}.`,
        });
        recordOperationLogEntry({
          kind: 'import',
          status: 'success',
          subject: 'Library JSON import',
          message: payload.pageId
            ? `${file.name}: imported ${importedItems.length.toLocaleString()} line${importedItems.length === 1 ? '' : 's'} from ${importSummaryLabel} into the ${scopeLabel}.`
            : `${file.name}: imported ${importedPages.length > 1 ? `${importedPages.length.toLocaleString()} pages` : `${importedLineCount.toLocaleString()} line${importedLineCount === 1 ? '' : 's'}`} from ${importSummaryLabel} into the ${scopeLabel}.`,
          path: file.name,
          counts: {
            pages: importedPages.length,
            items: importedLineCount,
          },
          nextStep: 'Review the selected section/page and save or export a backup once the imported content looks correct.',
        });
      } catch (error) {
        console.error('Library JSON import failed', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        finishLibraryOperation('error', {
          detail: 'The JSON file could not be imported.',
          error: errorMessage,
          nextSteps: [`Use supported ${APP_NAME} project/library JSON`, 'Try Split JSON for large exports', 'Check diagnostics if this repeats'],
        });
        recordOperationLogEntry({
          kind: 'import',
          status: 'error',
          subject: 'Library JSON import',
          message: `${file.name}: the JSON file could not be imported.`,
          path: file.name,
          error: errorMessage,
          nextStep: `Check that the file is a supported ${APP_NAME} project/library export or a valid item JSON file.`,
        });
        showToast({
          type: 'error',
          message: `The JSON file could not be read or does not match a supported ${APP_NAME} or library import format.`,
        });
      }
    };
    input.click();
  };

  return { handleImportJsonIntoLibraryScope };
}
