import { Info } from 'lucide-react';
import type { BoQItem, ItemLibrary, LibraryFolder, LibrarySection } from '../../types';
import { canEditLibrary, getLibraryItemLabel, getLibraryItemReference, PRICED_TYPES } from '../../utils/libraryViewModel';
import type { LibrarySearchResult } from '../../utils/libraryRepository';

type LibraryItemSearchResultsProps = {
  query: string;
  searchScopes: {
    library: boolean;
    folder: boolean;
    section: boolean;
  };
  activeFolder: LibraryFolder | null;
  activeSection: LibrarySection | null;
  libraries: ItemLibrary[];
  searchResults: LibrarySearchResult[];
  searchResultCount: number;
  isSearching: boolean;
  getRowStyles: (type: string) => string;
  getTextStyles: (type: string) => string;
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
};

export function LibraryItemSearchResults({
  query,
  searchScopes,
  activeFolder,
  activeSection,
  libraries,
  searchResults,
  searchResultCount,
  isSearching,
  getRowStyles,
  getTextStyles,
  openEditor,
  onUseInProject,
}: LibraryItemSearchResultsProps) {
  return (
    <>
      <div className="border-b border-slate-200/80 px-6 py-5 dark:border-slate-700/80">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="workspace-chip mb-3">
              <Info className="h-3.5 w-3.5" />
              Item search
            </div>
            <h3 className="text-[1.35rem] font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              {`Search results for "${query}"`}
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Searching {searchScopes.library ? 'whole library' : ''}{searchScopes.library && (searchScopes.folder || searchScopes.section) ? ', ' : ''}{searchScopes.folder && activeFolder ? 'current folder' : ''}{searchScopes.folder && searchScopes.section && activeSection ? ', ' : ''}{searchScopes.section && activeSection ? 'current section' : ''}.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="rounded-app border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300">
              {isSearching ? 'Searching...' : `${searchResultCount.toLocaleString()} match${searchResultCount === 1 ? '' : 'es'}`}
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-auto px-6 py-5">
        <div className="overflow-hidden rounded-app-lg border border-slate-200/80 shadow-sm dark:border-slate-700/80">
          <table className="w-full table-fixed border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-slate-100/97 shadow-sm backdrop-blur dark:bg-slate-800/97">
              <tr className="border-b-2 border-slate-300 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700 dark:border-slate-600 dark:text-slate-200">
                <th className="w-20 px-3 py-3 text-center">Ref</th>
                <th className="px-3 py-3">Description</th>
                <th className="w-56 px-3 py-3">Location</th>
                <th className="w-20 px-3 py-3 text-center">Unit</th>
                <th className="w-28 px-3 py-3 text-center">Use</th>
              </tr>
            </thead>
            <tbody>
              {searchResults.map((item, idx) => (
                <tr key={`${item.id}-${idx}`} className={getRowStyles(item.type)}>
                  <td className="px-3 py-2 pt-2.5 text-center text-[10px] font-bold font-mono text-slate-400 align-top">{getLibraryItemReference(item, idx)}</td>
                  <td className="px-3 py-2 align-top">
                    <button
                      type="button"
                      onClick={() => {
                        const sourceLibrary = libraries.find((library: any) => library.id === item.libraryId);
                        if (canEditLibrary(sourceLibrary)) {
                          openEditor(null, null, null, item.type, item.libraryId, item.folderId, item.sectionId, idx, item.pageId);
                        }
                      }}
                      aria-label={`Open ${getLibraryItemLabel(item, idx)} in library editor`}
                      className="flex min-w-0 items-start gap-2 rounded-app-sm px-1 py-0.5 text-left transition hover:bg-slate-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-surface-800/80"
                    >
                      <div className={`min-w-0 whitespace-pre-wrap py-0.5 leading-snug ${getTextStyles(item.type)}`}>{item.description}</div>
                    </button>
                  </td>
                  <td className="px-3 py-2 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                    <div className="truncate font-medium text-slate-700 dark:text-slate-200">{item.folderName}</div>
                    <div className="truncate">{item.sectionName}{item.pageName ? ` / ${item.pageName}` : ''}</div>
                  </td>
                  <td className="max-w-[4rem] truncate px-3 py-2 pt-2.5 text-center text-[10px] font-medium uppercase text-slate-500 align-top dark:text-slate-400">{PRICED_TYPES.has(item.type) ? item.unit : ''}</td>
                  <td className="px-3 py-2 pt-1.5 text-center align-top">
                    <button type="button" aria-label={`Use ${getLibraryItemLabel(item, idx)} in project`} onClick={() => onUseInProject(item, searchResults as BoQItem[])} className="workspace-compact-btn px-2.5 py-1.5 text-[11px]">
                      Use
                    </button>
                  </td>
                </tr>
              ))}
              {!isSearching && searchResults.length === 0 && (
                <tr>
                  <td colSpan={5} className="bg-slate-50/70 px-6 py-12 text-center text-sm text-slate-500 dark:bg-surface-900/60 dark:text-slate-400">
                    No item rows match this search and scope.
                  </td>
                </tr>
              )}
              {searchResultCount > searchResults.length && (
                <tr>
                  <td colSpan={5} className="bg-slate-50/70 px-6 py-4 text-center text-xs font-medium text-slate-500 dark:bg-surface-900/60 dark:text-slate-400">
                    Showing {searchResults.length.toLocaleString()} of {searchResultCount.toLocaleString()} matches. Refine the search to narrow results.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
