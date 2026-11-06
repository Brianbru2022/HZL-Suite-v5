import React from 'react';
import { ClipboardPaste, ChevronDown, ChevronRight, Info, Loader2, Pencil, Plus, RotateCcw, Sparkles, Trash2, Upload } from 'lucide-react';
import { itemTypeOptions } from '../UI/ItemTypeDropdown';
import type { BoQItem, ItemLibrary, LibraryFolder, LibraryPage, LibrarySection } from '../../types';
import { formatOrderedLabel } from '../../utils/libraryViewModel';

type LibraryPageItemsSectionProps = {
  pages: LibraryPage[];
  activeLib: ItemLibrary;
  activeFolder: LibraryFolder;
  activeSection: LibrarySection;
  activeLibCanEdit: boolean;
  collapsedPageIds: Record<string, boolean>;
  workspaceMetaChipClass: string;
  openLibraryOptionsMenu: string | null;
  setOpenLibraryOptionsMenu: React.Dispatch<React.SetStateAction<string | null>>;
  isAiLoading: boolean;
  togglePageCollapsed: (pageId: string) => void;
  openPrompt: (type: string, context?: any) => void;
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
  handleImportJsonIntoLibraryScope: (options?: { pageId?: string }) => Promise<void>;
  handlePasteLibraryRows: (pageId: string) => Promise<void>;
  canUndoLibraryItemRevision: boolean;
  handleUndoLibraryItemRevision: () => Promise<void>;
  handleDeletePage: (pageId: string, pageLabel: string) => Promise<void>;
  LibraryOptionsMenu: React.ComponentType<any>;
  LibraryPageRows: React.ComponentType<any>;
  pageRowsProps: Record<string, unknown>;
};

export function LibraryPageItemsSection({
  pages,
  activeLib,
  activeFolder,
  activeSection,
  activeLibCanEdit,
  collapsedPageIds,
  workspaceMetaChipClass,
  openLibraryOptionsMenu,
  setOpenLibraryOptionsMenu,
  isAiLoading,
  togglePageCollapsed,
  openPrompt,
  openEditor,
  handleImportJsonIntoLibraryScope,
  handlePasteLibraryRows,
  canUndoLibraryItemRevision,
  handleUndoLibraryItemRevision,
  handleDeletePage,
  LibraryOptionsMenu,
  LibraryPageRows,
  pageRowsProps,
}: LibraryPageItemsSectionProps) {
  return (
    <div className="space-y-5">
      {pages.map((page, pageIndex) => {
        const pageLabel = formatOrderedLabel(page.orderRef, page.name, `Page ${pageIndex + 1}`);
        const isPageCollapsed = collapsedPageIds[page.id] ?? true;
        const itemCount = page.itemCount || page.items?.length || 0;

        return (
          <section key={page.id} className="overflow-hidden rounded-app-lg border border-slate-200/80 shadow-sm dark:border-slate-700/80">
            <div className="border-b border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-slate-700/80 dark:bg-[rgb(24_34_42_/_0.94)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => togglePageCollapsed(page.id)}
                    aria-label={`${isPageCollapsed ? 'Expand' : 'Collapse'} ${pageLabel}`}
                    className="flex min-w-0 items-start gap-2 text-left"
                  >
                    <span className="mt-0.5 inline-flex shrink-0 rounded-full border border-slate-200 bg-white/80 p-1 text-slate-500 transition hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100">
                      {isPageCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Page {pageIndex + 1}</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{pageLabel}</div>
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <div className="relative group/info">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-[rgb(22_32_40_/_0.96)] dark:text-slate-300">
                            <Info className="h-3.5 w-3.5" />
                          </span>
                          <div className="pointer-events-none absolute left-0 top-8 z-20 hidden min-w-[140px] rounded-app border border-slate-200 bg-white p-2 text-left text-[11px] shadow-lg group-hover/info:block dark:border-slate-700 dark:bg-[rgb(18_27_34_/_0.98)]">
                            <div className="flex flex-wrap gap-1.5 text-slate-500 dark:text-slate-400">
                              <span className={workspaceMetaChipClass}>{itemCount} item{itemCount === 1 ? '' : 's'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <LibraryOptionsMenu
                    menuKey={`page-${page.id}`}
                    openMenuKey={openLibraryOptionsMenu}
                    setOpenMenuKey={setOpenLibraryOptionsMenu}
                    label={`Open options for ${pageLabel}`}
                  >
                    {activeLibCanEdit ? (
                      <>
                        <button type="button" role="menuitem" onClick={() => { setOpenLibraryOptionsMenu(null); openPrompt('AI_GENERATE_HIERARCHY', { libId: activeLib.id, folderId: activeFolder.id, sectionId: activeSection.id, pageId: page.id }); }} className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-surface-800">
                          {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                          AI fill
                        </button>
                        <button type="button" role="menuitem" onClick={() => { setOpenLibraryOptionsMenu(null); openPrompt('AI_GENERATE_HIERARCHY', { libId: activeLib.id, folderId: activeFolder.id, sectionId: activeSection.id, pageId: page.id, defaultValue: `Tidy and normalize the existing imported library page "${page.name || `Page ${pageIndex + 1}`}". Keep the current page intent, preserve real measurable items, improve headings/comments, and clean duplicated or messy wording.` }); }} className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-surface-800">
                          <Sparkles className="h-4 w-4" />
                          AI tidy
                        </button>
                        <button type="button" role="menuitem" onClick={() => { setOpenLibraryOptionsMenu(null); void handleImportJsonIntoLibraryScope({ pageId: page.id }); }} className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-surface-800">
                          <Upload className="h-4 w-4" />
                          Import JSON
                        </button>
                        <button type="button" role="menuitem" onClick={() => { setOpenLibraryOptionsMenu(null); void handlePasteLibraryRows(page.id); }} className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-surface-800">
                          <ClipboardPaste className="h-4 w-4" />
                          Paste rows
                        </button>
                        {canUndoLibraryItemRevision && (
                          <button type="button" role="menuitem" onClick={() => { setOpenLibraryOptionsMenu(null); void handleUndoLibraryItemRevision(); }} className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-surface-800">
                            <RotateCcw className="h-4 w-4" />
                            Undo last item change
                          </button>
                        )}
                        <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                        {itemTypeOptions.map((option) => (
                          <button key={option.type} type="button" role="menuitem" onClick={() => { setOpenLibraryOptionsMenu(null); openEditor(null, null, undefined, option.type, activeLib.id, activeFolder.id, activeSection.id, undefined, page.id); }} className={`flex w-full items-center gap-3 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-surface-800 ${option.type === 'EXTRA_OVER_ITEM' ? 'pl-7' : ''}`}>
                            <option.icon className={`h-4 w-4 ${option.color}`} />
                            {option.label}
                          </button>
                        ))}
                        <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                        <button type="button" role="menuitem" onClick={() => { setOpenLibraryOptionsMenu(null); openPrompt('RENAME_LIB_PAGE', { libId: activeLib.id, folderId: activeFolder.id, sectionId: activeSection.id, pageId: page.id, name: page.name, orderRef: page.orderRef }); }} className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-surface-800">
                          <Pencil className="h-4 w-4" />
                          Rename page
                        </button>
                        <button type="button" role="menuitem" onClick={() => { setOpenLibraryOptionsMenu(null); void handleDeletePage(page.id, pageLabel); }} className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30">
                          <Trash2 className="h-4 w-4" />
                          Delete page
                        </button>
                      </>
                    ) : (
                      <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">Library editing is disabled.</div>
                    )}
                  </LibraryOptionsMenu>
                </div>
              </div>
            </div>
            {!isPageCollapsed && (
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
                  <LibraryPageRows
                    page={page}
                    activeLib={activeLib}
                    activeFolder={activeFolder}
                    activeSection={activeSection}
                    {...pageRowsProps}
                  />
                  {itemCount === 0 && (
                    <tr>
                      <td colSpan={5} className="bg-slate-50/70 px-6 py-10 text-center text-sm text-slate-500 dark:bg-surface-900/60 dark:text-slate-400">
                        This page is empty. Add reusable library items here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </section>
        );
      })}
    </div>
  );
}
