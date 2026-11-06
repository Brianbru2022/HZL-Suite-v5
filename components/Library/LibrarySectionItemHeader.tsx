import { ClipboardPaste, ChevronRight, Download, Loader2, Pencil, Plus, RotateCcw, Sparkles, Trash2, Upload } from 'lucide-react';
import type React from 'react';
import { itemTypeOptions } from '../UI/ItemTypeDropdown';
import type { BoQItem, ItemLibrary, LibraryFolder, LibrarySection } from '../../types';
import { canExportLibrarySections } from '../../utils/libraryViewModel';

type LibrarySectionItemHeaderProps = {
  activeLib: ItemLibrary;
  activeFolder: LibraryFolder;
  activeSection: LibrarySection;
  activeLibCanEdit: boolean;
  displayLibraryName: string | null;
  displayFolderName: string | null;
  displaySectionName: string | null;
  sectionStats: {
    itemCount: number;
    pricedCount: number;
    pageCount: number;
  };
  hasPages: boolean;
  childCount: number;
  workspaceMetaChipClass: string;
  openLibraryOptionsMenu: string | null;
  setOpenLibraryOptionsMenu: React.Dispatch<React.SetStateAction<string | null>>;
  LibraryOptionsMenu: React.ComponentType<any>;
  isAiLoading: boolean;
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
  handlePasteLibraryRows: () => Promise<void>;
  canUndoLibraryItemRevision: boolean;
  handleUndoLibraryItemRevision: () => Promise<void>;
  handleExportSection: (folder: LibraryFolder, section: LibrarySection) => Promise<void>;
  handleClearSectionContent: (sectionId: string, sectionLabel: string) => Promise<void>;
  handleDeleteSection: (folderId: string, sectionId: string, sectionLabel: string) => Promise<void>;
};

export function LibrarySectionItemHeader({
  activeLib,
  activeFolder,
  activeSection,
  activeLibCanEdit,
  displayLibraryName,
  displayFolderName,
  displaySectionName,
  sectionStats,
  hasPages,
  childCount,
  workspaceMetaChipClass,
  openLibraryOptionsMenu,
  setOpenLibraryOptionsMenu,
  LibraryOptionsMenu,
  isAiLoading,
  openPrompt,
  openEditor,
  handleImportJsonIntoLibraryScope,
  handlePasteLibraryRows,
  canUndoLibraryItemRevision,
  handleUndoLibraryItemRevision,
  handleExportSection,
  handleClearSectionContent,
  handleDeleteSection,
}: LibrarySectionItemHeaderProps) {
  return (
    <div className="border-b border-slate-200/80 px-4 py-4 dark:border-slate-700/80">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5 truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">
            <span className="truncate text-slate-700 dark:text-slate-200">{displayLibraryName}</span>
            <ChevronRight className="h-3 w-3" />
            <span className="truncate">{displayFolderName}</span>
          </div>
          <div className="mt-1.5 flex min-w-0 items-center gap-2">
            <h3 className="truncate text-base font-semibold tracking-tight text-slate-950 dark:text-slate-50" title={displaySectionName || undefined}>{displaySectionName}</h3>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-slate-500 dark:text-slate-400">
            <span className={workspaceMetaChipClass}>
              {sectionStats.itemCount.toLocaleString()} own item{sectionStats.itemCount === 1 ? '' : 's'}
            </span>
            <span className={workspaceMetaChipClass}>
              {sectionStats.pricedCount.toLocaleString()} priced
            </span>
            <span className={workspaceMetaChipClass}>
              {childCount.toLocaleString()} child section{childCount === 1 ? '' : 's'}
            </span>
            {sectionStats.pageCount > 0 && (
              <span className={workspaceMetaChipClass}>{sectionStats.pageCount.toLocaleString()} page{sectionStats.pageCount === 1 ? '' : 's'}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LibraryOptionsMenu
            menuKey={`section-${activeSection.id}`}
            openMenuKey={openLibraryOptionsMenu}
            setOpenMenuKey={setOpenLibraryOptionsMenu}
            label={`Open options for ${displaySectionName || 'section'}`}
          >
            {activeLibCanEdit && (
              <>
                <button type="button" role="menuitem" onClick={() => { setOpenLibraryOptionsMenu(null); openPrompt('AI_GENERATE_HIERARCHY', { libId: activeLib.id, folderId: activeFolder.id, sectionId: activeSection.id }); }} className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-surface-800">
                  {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  AI fill
                </button>
                <button type="button" role="menuitem" onClick={() => { setOpenLibraryOptionsMenu(null); openPrompt('AI_GENERATE_HIERARCHY', { libId: activeLib.id, folderId: activeFolder.id, sectionId: activeSection.id, defaultValue: 'Tidy and normalize the existing imported library section. Keep the current section intent, preserve real measurable items, improve headings/comments, and clean duplicated or messy wording.' }); }} className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-surface-800">
                  <Sparkles className="h-4 w-4" />
                  AI tidy
                </button>
                <button type="button" role="menuitem" onClick={() => { setOpenLibraryOptionsMenu(null); void handleImportJsonIntoLibraryScope({}); }} className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-surface-800">
                  <Upload className="h-4 w-4" />
                  Import JSON
                </button>
                {!hasPages && (
                  <button type="button" role="menuitem" onClick={() => { setOpenLibraryOptionsMenu(null); void handlePasteLibraryRows(); }} className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-surface-800">
                    <ClipboardPaste className="h-4 w-4" />
                    Paste rows
                  </button>
                )}
                {canUndoLibraryItemRevision && (
                  <button type="button" role="menuitem" onClick={() => { setOpenLibraryOptionsMenu(null); void handleUndoLibraryItemRevision(); }} className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-surface-800">
                    <RotateCcw className="h-4 w-4" />
                    Undo last item change
                  </button>
                )}
              </>
            )}
            {canExportLibrarySections(activeLib) && (
              <button type="button" role="menuitem" onClick={() => { setOpenLibraryOptionsMenu(null); void handleExportSection(activeFolder, activeSection); }} className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-surface-800">
                <Download className="h-4 w-4" />
                Export JSON
              </button>
            )}
            {activeLibCanEdit && (
              <>
                <button type="button" role="menuitem" onClick={() => { setOpenLibraryOptionsMenu(null); openPrompt('CREATE_LIB_PAGE', { libId: activeLib.id, folderId: activeFolder.id, sectionId: activeSection.id }); }} className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-surface-800">
                  <Plus className="h-4 w-4" />
                  Add page
                </button>
                <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                {itemTypeOptions.map((option) => (
                  <button key={option.type} type="button" role="menuitem" onClick={() => { setOpenLibraryOptionsMenu(null); openEditor(null, null, undefined, option.type, activeLib.id, activeFolder.id, activeSection.id); }} className={`flex w-full items-center gap-3 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-surface-800 ${option.type === 'EXTRA_OVER_ITEM' ? 'pl-7' : ''}`}>
                    <option.icon className={`h-4 w-4 ${option.color}`} />
                    {option.label}
                  </button>
                ))}
                <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                <button type="button" role="menuitem" onClick={() => { setOpenLibraryOptionsMenu(null); openPrompt('RENAME_LIB_SECTION', { libId: activeLib.id, folderId: activeFolder.id, sectionId: activeSection.id, name: activeSection.name, orderRef: activeSection.orderRef }); }} className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-surface-800">
                  <Pencil className="h-4 w-4" />
                  Rename section
                </button>
                <button type="button" role="menuitem" onClick={() => { setOpenLibraryOptionsMenu(null); void handleClearSectionContent(activeSection.id, displaySectionName || 'Section'); }} className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs font-semibold text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/30">
                  <Trash2 className="h-4 w-4" />
                  Clear content only
                </button>
                <button type="button" role="menuitem" onClick={() => { setOpenLibraryOptionsMenu(null); void handleDeleteSection(activeFolder.id, activeSection.id, displaySectionName || 'Section'); }} className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30">
                  <Trash2 className="h-4 w-4" />
                  Delete section
                </button>
              </>
            )}
          </LibraryOptionsMenu>
        </div>
      </div>
    </div>
  );
}
