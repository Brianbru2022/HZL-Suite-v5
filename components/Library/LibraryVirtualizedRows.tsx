import { useVirtualizer } from '@tanstack/react-virtual';
import { useMemo } from 'react';
import type React from 'react';
import { Banknote, ChevronDown, ChevronRight, Coins, Pencil, Trash2 } from 'lucide-react';
import { LibraryItemDescription } from './LibraryItemDescription';
import type { BoQItem, ItemLibrary, LibraryFolder, LibrarySection } from '../../types';
import { canEditLibrary, type VisibleLibraryRow } from '../../utils/libraryViewModel';
import { buildLibraryCommentMarkers } from '../../utils/libraryCommentMarkers';
import { formatCurrency } from '../../utils/formatting';

const LIBRARY_ROW_ESTIMATE = 52;

type LibraryVirtualizedRowsProps = {
  scrollRef: React.RefObject<HTMLDivElement>;
  rows: VisibleLibraryRow[];
  sourceItems: BoQItem[];
  pageId?: string;
  activeLib: ItemLibrary;
  activeFolder: LibraryFolder;
  activeSection: LibrarySection;
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
  getLibraryItemLabel: (item: BoQItem, index: number) => string;
  getLibraryItemReference: (item: BoQItem, index: number) => string;
  isLibraryHeadingType: (type: string) => boolean;
  collapsedHeadingIds: Record<string, boolean>;
  toggleHeadingCollapsed: (itemId: string) => void;
};

export function LibraryVirtualizedRows({
  scrollRef,
  rows,
  sourceItems,
  pageId,
  activeLib,
  activeFolder,
  activeSection,
  openEditor,
  onUseInProject,
  onDeleteLibraryItem,
  onRowContextMenu,
  getRowStyles,
  getTextStyles,
  getLibraryItemLabel,
  getLibraryItemReference,
  isLibraryHeadingType,
  collapsedHeadingIds,
  toggleHeadingCollapsed,
}: LibraryVirtualizedRowsProps) {
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => LIBRARY_ROW_ESTIMATE,
    overscan: 5,
  });
  const totalSize = virtualizer.getTotalSize();
  const virtualItems = virtualizer.getVirtualItems();
  const paddingStart = virtualItems[0]?.start ?? 0;
  const paddingEnd = totalSize - (virtualItems[virtualItems.length - 1]?.end ?? 0);
  const canEdit = canEditLibrary(activeLib);
  const commentMarkers = useMemo(() => buildLibraryCommentMarkers(sourceItems), [sourceItems]);

  return (
    <>
      {paddingStart > 0 && <tr><td colSpan={5} style={{ height: `${paddingStart}px`, padding: 0, lineHeight: 0, border: 'none' }} aria-hidden /></tr>}
      {virtualItems.map((virtualRow: any) => {
        const { item, idx } = rows[virtualRow.index];
        const isHeading = isLibraryHeadingType(item.type);
        const isCollapsed = isHeading ? !!collapsedHeadingIds[item.id] : false;
        return (
          <tr
            key={item.id ?? idx}
            className={getRowStyles(item.type)}
            style={{ height: `${virtualRow.size}px` }}
            onContextMenu={(event) => onRowContextMenu?.(event, item, idx, sourceItems, pageId)}
          >
            <td className="px-3 py-2 pt-2.5 text-center text-[10px] font-bold font-mono text-slate-400 align-top">{getLibraryItemReference(item, idx)}</td>
            <td className="px-3 py-2 align-top">
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => { if (isHeading) toggleHeadingCollapsed(item.id); else openEditor(null, null, null, item.type, activeLib.id, activeFolder.id, activeSection.id, idx, pageId); }}
                  aria-label={isHeading ? `${isCollapsed ? 'Expand' : 'Collapse'} ${getLibraryItemLabel(item, idx)}` : `Open ${getLibraryItemLabel(item, idx)} in library editor`} aria-expanded={isHeading ? !isCollapsed : undefined}
                  className="flex min-w-0 flex-1 items-start gap-2 rounded-app-sm px-1 py-0.5 text-left transition hover:bg-slate-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-surface-800/80"
                >
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
            <td className="max-w-[4rem] truncate px-3 py-2 pt-2.5 text-center text-[10px] font-medium uppercase text-slate-500 align-top dark:text-slate-400" title={['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(item.type) ? item.unit : ''}>
              {['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(item.type) ? item.unit : ''}
            </td>
            <td className="px-3 py-2 pt-2.5 text-right text-xs font-medium tabular-nums text-slate-500 align-top dark:text-slate-400">
              {['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(item.type) ? formatCurrency(item.rate) : ''}
            </td>
            <td className="px-3 py-2 pt-1.5 text-center align-top">
              <div className="flex items-center justify-center gap-2 opacity-0 transition-all group-hover:opacity-100 focus-within:opacity-100">
                {canEdit && (
                  <button
                    type="button"
                    aria-label={`Rename ${getLibraryItemLabel(item, idx)} in library ${pageId ? 'page' : 'section'}`}
                    onClick={() => openEditor(null, null, null, item.type, activeLib.id, activeFolder.id, activeSection.id, idx, pageId)}
                    className="workspace-secondary-btn px-2 py-1.5 text-[11px]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                <button type="button" aria-label={`Use ${getLibraryItemLabel(item, idx)} in project`} onClick={() => onUseInProject(item, sourceItems)} className="workspace-compact-btn px-2.5 py-1.5 text-[11px]">
                  Use
                </button>
                {canEdit && (
                  <button
                    type="button"
                    aria-label={`Delete ${getLibraryItemLabel(item, idx)} from library ${pageId ? 'page' : 'section'}`}
                    onClick={() => { void onDeleteLibraryItem(item.id, getLibraryItemLabel(item, idx), pageId); }}
                    className="workspace-secondary-btn px-2 py-1.5 text-[11px]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </td>
          </tr>
        );
      })}
      {paddingEnd > 0 && <tr><td colSpan={5} style={{ height: `${paddingEnd}px`, padding: 0, lineHeight: 0, border: 'none' }} aria-hidden /></tr>}
    </>
  );
}
