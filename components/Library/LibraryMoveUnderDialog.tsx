import { ChevronRight, X } from 'lucide-react';
import {
  formatOrderedLabel,
  getLibrarySectionLevelLabel,
  normalizeLibraryLabel,
} from '../../utils/libraryViewModel';
import type { LibraryFolder, LibrarySection } from '../../types';

export type MoveUnderRow = {
  section: LibrarySection;
  depth: number;
  parent: LibrarySection | null;
};

type LibraryMoveUnderDialogProps = {
  selectedCount: number;
  activeFolder: LibraryFolder;
  query: string;
  rows: MoveUnderRow[];
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onMoveToLevel1: () => void;
  onMoveUnder: (section: LibrarySection, depth: number) => void;
};

export function LibraryMoveUnderDialog({
  selectedCount,
  activeFolder,
  query,
  rows,
  onQueryChange,
  onClose,
  onMoveToLevel1,
  onMoveUnder,
}: LibraryMoveUnderDialogProps) {
  return (
    <div className="fixed inset-0 z-[145] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
      <div className="workspace-shell flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden p-0">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 bg-white/92 px-6 py-5 dark:border-slate-700/80 dark:bg-[rgb(16_24_30_/_0.98)]">
          <div className="min-w-0">
            <div className="workspace-chip mb-3">
              <ChevronRight className="h-3.5 w-3.5" />
              Move outline rows
            </div>
            <h3 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Move selected rows under another section</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
              Moving {selectedCount.toLocaleString()} selected row{selectedCount === 1 ? '' : 's'} in {formatOrderedLabel(activeFolder.orderRef, activeFolder.name, 'Folder')}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="workspace-secondary-btn px-3 py-2 text-xs"
            aria-label="Close move under dialog"
          >
            <X className="h-4 w-4" />
            Close
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden bg-white/88 px-6 py-6 dark:bg-[rgb(16_24_30_/_0.96)]">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search by reference, title, level, or parent..."
              className="workspace-input text-sm"
            />
            <button
              type="button"
              className="workspace-secondary-btn px-4 py-2 text-sm"
              onClick={onMoveToLevel1}
            >
              Move to Level 1
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-app-lg border border-slate-200/80 bg-white/90 dark:border-slate-700/80 dark:bg-[rgb(20_30_38_/_0.96)]">
            {rows.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map(({ section, depth, parent }) => {
                  const ownItems = section.itemCount ?? section.items?.length ?? 0;
                  const childCount = section.subSections?.length || 0;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => onMoveUnder(section, depth)}
                      className="grid w-full grid-cols-[minmax(4rem,8rem)_minmax(0,1fr)_6rem_7rem_7rem] items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-surface-800"
                    >
                      <span className="truncate font-mono text-xs font-semibold text-slate-500 dark:text-slate-400" style={{ paddingLeft: Math.min(depth, 6) * 12 }}>
                        {section.orderRef || '-'}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900 dark:text-slate-100">{normalizeLibraryLabel(section.name, 'Section')}</span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                          Parent: {parent ? formatOrderedLabel(parent.orderRef, parent.name, 'Parent') : 'Folder level'}
                        </span>
                      </span>
                      <span className="justify-self-start rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                        {getLibrarySectionLevelLabel(depth)}
                      </span>
                      <span className="text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">{ownItems.toLocaleString()} own</span>
                      <span className="text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">{childCount.toLocaleString()} child{childCount === 1 ? '' : 'ren'}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                No valid move targets match this search.
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end border-t border-slate-200/80 bg-white/92 px-6 py-4 dark:border-slate-700/80 dark:bg-[rgb(16_24_30_/_0.98)]">
          <button type="button" onClick={onClose} className="workspace-secondary-btn px-4 py-2 text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}
