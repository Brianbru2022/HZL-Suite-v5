import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { Banknote, ChevronDown, ChevronRight, Coins, Pencil, Trash2 } from 'lucide-react';
import { LibraryItemDescription } from './LibraryItemDescription';
import type { BoQItem, ItemLibrary, LibraryFolder, LibraryPage, LibrarySection } from '../../types';
import { listLibraryItems } from '../../utils/libraryRepository';
import { buildLibraryCommentMarkers } from '../../utils/libraryCommentMarkers';
import {
  getLibraryItemLabel,
  getLibraryItemReference,
  getVisibleLibraryRows,
  isLibraryHeadingType,
  PRICED_TYPES,
} from '../../utils/libraryViewModel';
import { formatCurrency } from '../../utils/formatting';

const LIBRARY_ITEM_PAGE_SIZE = 500;

type LibraryPageRowsProps = {
  page: LibraryPage;
  activeLib: ItemLibrary;
  activeFolder: LibraryFolder;
  activeSection: LibrarySection;
  canEdit: boolean;
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
  onDeleteLibraryItem: (itemId: string, itemLabel: string, pageId?: string) => void | Promise<void>;
  onRowContextMenu?: (event: React.MouseEvent<HTMLTableRowElement>, item: BoQItem, index: number, sourceItems: BoQItem[], pageId?: string) => void;
  getRowStyles: (type: string) => string;
  getTextStyles: (type: string) => string;
  collapsedHeadingIds: Record<string, boolean>;
  toggleHeadingCollapsed: (itemId: string) => void;
  libraryItemsRevision?: number;
};

export function LibraryPageRows({
  page,
  activeLib,
  activeFolder,
  activeSection,
  canEdit,
  openEditor,
  onUseInProject,
  onDeleteLibraryItem,
  onRowContextMenu,
  getRowStyles,
  getTextStyles,
  collapsedHeadingIds,
  toggleHeadingCollapsed,
  libraryItemsRevision = 0,
}: LibraryPageRowsProps) {
  const [items, setItems] = useState<BoQItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const result = await listLibraryItems({ sectionId: activeSection.id, pageId: page.id, limit: LIBRARY_ITEM_PAGE_SIZE });
        if (!cancelled) {
          setItems(result.items);
          setTotalCount(result.totalCount);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [activeSection.id, libraryItemsRevision, page.id]);

  const visibleRows = useMemo(() => getVisibleLibraryRows(items, collapsedHeadingIds), [items, collapsedHeadingIds]);
  const commentMarkers = useMemo(() => buildLibraryCommentMarkers(items), [items]);

  if (isLoading) {
    return (
      <tr>
        <td colSpan={5} className="bg-slate-50/70 px-6 py-8 text-center text-sm text-slate-500 dark:bg-surface-900/60 dark:text-slate-400">
          Loading library rows...
        </td>
      </tr>
    );
  }

  return (
    <>
      {visibleRows.map(({ item, idx }) => {
        const isHeading = isLibraryHeadingType(item.type);
        const isCollapsed = isHeading ? !!collapsedHeadingIds[item.id] : false;
        return (
          <tr
            key={item.id ?? idx}
            className={getRowStyles(item.type)}
            onContextMenu={(event) => onRowContextMenu?.(event, item, idx, items, page.id)}
          >
            <td className="px-3 py-2 pt-2.5 text-center text-[10px] font-bold font-mono text-slate-400 align-top">{getLibraryItemReference(item, idx)}</td>
            <td className="px-3 py-2 align-top">
              <div className="flex items-start gap-2">
                <button type="button" onClick={() => { if (isHeading) toggleHeadingCollapsed(item.id); else if (canEdit) openEditor(null, null, null, item.type, activeLib.id, activeFolder.id, activeSection.id, idx, page.id); }} aria-label={isHeading ? `${isCollapsed ? 'Expand' : 'Collapse'} ${getLibraryItemLabel(item, idx)}` : `Open ${getLibraryItemLabel(item, idx)} in library editor`} aria-expanded={isHeading ? !isCollapsed : undefined} className="flex min-w-0 flex-1 items-start gap-2 rounded-app-sm px-1 py-0.5 text-left transition hover:bg-slate-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-surface-800/80">
                  {isHeading ? (isCollapsed ? <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" /> : <ChevronDown className="mt-0.5 h-4 w-4 shrink-0" />) : null}
                  {item.type === 'PROVISIONAL_SUM' && <Coins className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
                  {item.type === 'PC_SUM' && <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" />}
                  <LibraryItemDescription
                    item={item}
                    marker={commentMarkers[item.id]}
                    className={`min-w-0 whitespace-pre-wrap py-0.5 leading-snug ${getTextStyles(item.type)}`}
                  />
                </button>
              </div>
            </td>
            <td className="max-w-[4rem] truncate px-3 py-2 pt-2.5 text-center text-[10px] font-medium uppercase text-slate-500 align-top dark:text-slate-400">{PRICED_TYPES.has(item.type) ? item.unit : ''}</td>
            <td className="px-3 py-2 pt-2.5 text-right text-xs font-medium tabular-nums text-slate-500 align-top dark:text-slate-400">{PRICED_TYPES.has(item.type) ? formatCurrency(item.rate) : ''}</td>
            <td className="px-3 py-2 pt-1.5 text-center align-top">
              <div className="flex items-center justify-center gap-2 opacity-0 transition-all group-hover:opacity-100 focus-within:opacity-100">
                {canEdit && <button type="button" aria-label={`Rename ${getLibraryItemLabel(item, idx)} in library page`} onClick={() => openEditor(null, null, null, item.type, activeLib.id, activeFolder.id, activeSection.id, idx, page.id)} className="workspace-secondary-btn px-2 py-1.5 text-[11px]"><Pencil className="h-3.5 w-3.5" /></button>}
                <button type="button" aria-label={`Use ${getLibraryItemLabel(item, idx)} in project`} onClick={() => onUseInProject(item, items)} className="workspace-compact-btn px-2.5 py-1.5 text-[11px]">Use</button>
                {canEdit && <button type="button" aria-label={`Delete ${getLibraryItemLabel(item, idx)} from library page`} onClick={() => { void onDeleteLibraryItem(item.id, getLibraryItemLabel(item, idx), page.id); }} className="workspace-secondary-btn px-2 py-1.5 text-[11px]"><Trash2 className="h-3.5 w-3.5" /></button>}
              </div>
            </td>
          </tr>
        );
      })}
      {totalCount > items.length && (
        <tr>
          <td colSpan={5} className="bg-slate-50/70 px-6 py-4 text-center text-xs font-medium text-slate-500 dark:bg-surface-900/60 dark:text-slate-400">
            Showing {items.length.toLocaleString()} of {totalCount.toLocaleString()} rows.
          </td>
        </tr>
      )}
    </>
  );
}
