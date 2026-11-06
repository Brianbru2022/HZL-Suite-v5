import React from 'react';
import { Library as LibraryIcon, Loader2, Sparkles, Upload } from 'lucide-react';
import { ItemTypeDropdown } from '../UI/ItemTypeDropdown';
import type { BoQItem, ItemLibrary, LibraryFolder, LibrarySection } from '../../types';
import { PRICED_TYPES, type VisibleLibraryRow } from '../../utils/libraryViewModel';

type LibrarySectionItemsTableProps = {
  activeLib: ItemLibrary;
  activeFolder: LibraryFolder;
  activeSection: LibrarySection;
  displaySectionName: string | null;
  activeLibCanEdit: boolean;
  rows: VisibleLibraryRow[];
  loadedSectionItems: BoQItem[];
  loadedItemTotalCount: number;
  isLoadingLibraryItems: boolean;
  virtualizeThreshold: number;
  pageSize: number;
  scrollRef: React.RefObject<HTMLDivElement>;
  collapsedHeadingIds: Record<string, boolean>;
  isAiLoading: boolean;
  getRowStyles: (type: string) => string;
  getTextStyles: (type: string) => string;
  getLibraryItemLabel: (item: BoQItem, index: number) => string;
  getLibraryItemReference: (item: BoQItem, index: number) => string;
  isLibraryHeadingType: (type: string) => boolean;
  toggleHeadingCollapsed: (itemId: string) => void;
  openEditor: (
    billId: string | null,
    billSectionId: string | null,
    item?: BoQItem | null,
    itemType?: BoQItem['type'],
    libId?: string,
    folderId?: string,
    libSectionId?: string,
    libraryItemIndex?: number,
    pageId?: string | null,
  ) => void;
  onUseInProject: (item: BoQItem, sourceItems: BoQItem[]) => void;
  onDeleteLibraryItem: (itemId: string, itemLabel: string) => void | Promise<void>;
  onRowContextMenu?: (event: React.MouseEvent<HTMLTableRowElement>, item: BoQItem, index: number, sourceItems: BoQItem[], pageId?: string) => void;
  renderLibraryItemRow: (item: BoQItem, idx: number, sourceItems: BoQItem[], pageId?: string) => React.ReactNode;
  loadSectionItems: (offset?: number, limit?: number) => Promise<void>;
  handleImportJsonIntoLibraryScope: (options?: { pageId?: string }) => Promise<void>;
  openPrompt: (type: string, context?: any) => void;
  LibraryVirtualizedRows: React.ComponentType<any>;
};

export function LibrarySectionItemsTable({
  activeLib,
  activeFolder,
  activeSection,
  displaySectionName,
  activeLibCanEdit,
  rows,
  loadedSectionItems,
  loadedItemTotalCount,
  isLoadingLibraryItems,
  virtualizeThreshold,
  pageSize,
  scrollRef,
  collapsedHeadingIds,
  isAiLoading,
  getRowStyles,
  getTextStyles,
  getLibraryItemLabel,
  getLibraryItemReference,
  isLibraryHeadingType,
  toggleHeadingCollapsed,
  openEditor,
  onUseInProject,
  onDeleteLibraryItem,
  onRowContextMenu,
  renderLibraryItemRow,
  loadSectionItems,
  handleImportJsonIntoLibraryScope,
  openPrompt,
  LibraryVirtualizedRows,
}: LibrarySectionItemsTableProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-app border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-400">
        <span className="min-w-0 truncate">
          Loading scope: {activeLib.name} / {activeFolder.name} / {displaySectionName || activeSection.name}
        </span>
        <span className="shrink-0">
          {isLoadingLibraryItems ? 'Loading rows...' : `${loadedSectionItems.length.toLocaleString()} of ${loadedItemTotalCount.toLocaleString()} rows loaded`}
        </span>
      </div>
      <div className="overflow-hidden rounded-app-lg border border-slate-200/80 shadow-sm dark:border-slate-700/80">
        <table className="w-full table-fixed border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-slate-100/97 shadow-sm backdrop-blur dark:bg-slate-800/97">
          <tr className="border-b-2 border-slate-300 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700 dark:border-slate-600 dark:text-slate-200">
            <th className="w-20 px-3 py-3 text-center">Ref</th>
            <th className="px-3 py-3">Description</th>
            <th className="w-20 px-3 py-3 text-center">Unit</th>
            <th className="w-28 px-3 py-3 text-right">Est. rate</th>
            <th className="w-28 px-3 py-3 text-center">Use</th>
          </tr>
        </thead>
        <tbody>
          {rows.length >= virtualizeThreshold ? (
            <LibraryVirtualizedRows
              scrollRef={scrollRef}
              rows={rows}
              sourceItems={loadedSectionItems}
              pageId={undefined}
              activeLib={activeLib}
              activeFolder={activeFolder}
              activeSection={activeSection}
              openEditor={openEditor}
              onUseInProject={onUseInProject}
              onDeleteLibraryItem={onDeleteLibraryItem}
              onRowContextMenu={onRowContextMenu}
              getRowStyles={getRowStyles}
              getTextStyles={getTextStyles}
              getLibraryItemLabel={getLibraryItemLabel}
              getLibraryItemReference={getLibraryItemReference}
              isLibraryHeadingType={isLibraryHeadingType}
              collapsedHeadingIds={collapsedHeadingIds}
              toggleHeadingCollapsed={toggleHeadingCollapsed}
            />
          ) : (
            rows.map(({ item, idx }) =>
              renderLibraryItemRow(item, idx, loadedSectionItems)
            )
          )}
          {isLoadingLibraryItems && (
            <tr>
              <td colSpan={5} className="bg-slate-50/70 px-6 py-8 text-center text-sm text-slate-500 dark:bg-surface-900/60 dark:text-slate-400">
                Loading library rows...
              </td>
            </tr>
          )}
          {!isLoadingLibraryItems && loadedItemTotalCount > loadedSectionItems.length && (
            <tr>
              <td colSpan={5} className="border-t border-slate-200 bg-white px-4 py-3 text-center text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-surface-900/80 dark:text-slate-400">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>Showing {loadedSectionItems.length.toLocaleString()} of {loadedItemTotalCount.toLocaleString()} rows.</span>
                  <div className="flex shrink-0 flex-wrap items-center justify-center gap-2">
                    <button type="button" className="workspace-compact-btn px-3 py-1.5 text-[11px]" onClick={() => { void loadSectionItems(loadedSectionItems.length); }}>
                      Load next {Math.min(pageSize, loadedItemTotalCount - loadedSectionItems.length).toLocaleString()}
                    </button>
                    <button type="button" className="workspace-compact-btn px-3 py-1.5 text-[11px]" onClick={() => { void loadSectionItems(0, loadedItemTotalCount); }}>
                      Load all
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          )}
          {!isLoadingLibraryItems && loadedItemTotalCount === 0 && (
            <tr>
              <td colSpan={5} className="bg-slate-50/70 px-5 py-8 dark:bg-surface-900/60">
                <div className="flex flex-col items-center justify-center text-center">
                  <LibraryIcon className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                  <div className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{displaySectionName} has no own items</div>
                  <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500 dark:text-slate-400">This section can still contain child sections in the outline.</p>
                  {activeLibCanEdit && (
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <ItemTypeDropdown onSelect={(type: any) => openEditor(null, null, undefined, type, activeLib.id, activeFolder.id, activeSection.id)} />
                      <button type="button" onClick={() => { void handleImportJsonIntoLibraryScope({}); }} className="workspace-secondary-btn px-3 py-2 text-xs">
                        <Upload className="h-4 w-4" />
                        Import JSON
                      </button>
                      <button type="button" onClick={() => openPrompt('AI_GENERATE_HIERARCHY', { libId: activeLib.id, folderId: activeFolder.id, sectionId: activeSection.id })} className="workspace-secondary-btn px-3 py-2 text-xs">
                        {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        AI fill section
                      </button>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          )}
        </tbody>
        </table>
      </div>
    </div>
  );
}
