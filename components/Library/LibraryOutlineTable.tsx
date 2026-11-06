import React from 'react';
import { ArrowDown, ArrowUp, BookOpen, ChevronRight, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { getLibrarySectionLevelLabel } from '../../utils/libraryViewModel';
import type { ItemLibrary, LibraryFolder, LibrarySection } from '../../types';
import { LibraryEmptyState } from './LibraryEmptyState';

type LibraryOutlineTableProps = {
  activeLib: ItemLibrary | null;
  activeFolder: LibraryFolder | null;
  activeLibCanEdit: boolean;
  selectedOutlineIds: string[];
  selectedOutlineContexts: Array<{ section: LibrarySection; depth: number; parent: LibrarySection | null }>;
  sortedRootSections: LibrarySection[];
  renderSectionNode: (folder: LibraryFolder, section: LibrarySection, depth?: number) => React.ReactNode;
  onPromote: (sectionId: string) => void;
  onDemote: (sectionId: string) => void;
  onMoveToLevel1: () => void;
  onMoveUp: (sectionId: string) => void;
  onMoveDown: (sectionId: string) => void;
  onOpenMoveUnder: () => void;
  onInferSelected: () => void;
  onInferFolder: () => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
  onDropToRoot: () => void;
  canDropToRoot: boolean;
  onAddLevel1: () => void;
};

export function LibraryOutlineTable({
  activeLib,
  activeFolder,
  activeLibCanEdit,
  selectedOutlineIds,
  selectedOutlineContexts,
  sortedRootSections,
  renderSectionNode,
  onPromote,
  onDemote,
  onMoveToLevel1,
  onMoveUp,
  onMoveDown,
  onOpenMoveUnder,
  onInferSelected,
  onInferFolder,
  onDeleteSelected,
  onClearSelection,
  onDropToRoot,
  canDropToRoot,
  onAddLevel1,
}: LibraryOutlineTableProps) {
  return (
    <>
      {activeLibCanEdit && activeFolder && selectedOutlineIds.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-app-lg border border-primary-200 bg-primary-50/80 px-3 py-2 dark:border-primary-900/60 dark:bg-primary-950/20">
          <span className="mr-1 text-xs font-semibold text-primary-800 dark:text-primary-200">
            {selectedOutlineIds.length} selected
            {selectedOutlineContexts.length === 1
              ? ` | ${getLibrarySectionLevelLabel(selectedOutlineContexts[0].depth)} | ${selectedOutlineContexts[0].section.itemCount || 0} own | ${(selectedOutlineContexts[0].section.subSections || []).length} child${(selectedOutlineContexts[0].section.subSections || []).length === 1 ? '' : 'ren'}`
              : selectedOutlineContexts.length > 1
                ? ` | ${new Set(selectedOutlineContexts.map((entry) => `${entry.parent?.id || 'root'}:${entry.depth}`)).size === 1 ? 'same level' : 'mixed levels'}`
                : ''}
          </span>
          <button type="button" className="workspace-secondary-btn px-2.5 py-1.5 text-[11px]" onClick={() => onPromote(selectedOutlineIds[0])}>Promote</button>
          <button type="button" className="workspace-secondary-btn px-2.5 py-1.5 text-[11px]" onClick={() => onDemote(selectedOutlineIds[0])}>Demote</button>
          <button type="button" className="workspace-secondary-btn px-2.5 py-1.5 text-[11px]" onClick={onMoveToLevel1}>Move to top level</button>
          <button type="button" className="workspace-secondary-btn px-2.5 py-1.5 text-[11px]" onClick={() => onMoveUp(selectedOutlineIds[0])}><ArrowUp className="h-3.5 w-3.5" />Up</button>
          <button type="button" className="workspace-secondary-btn px-2.5 py-1.5 text-[11px]" onClick={() => onMoveDown(selectedOutlineIds[0])}><ArrowDown className="h-3.5 w-3.5" />Down</button>
          <button type="button" className="workspace-secondary-btn px-2.5 py-1.5 text-[11px]" onClick={onOpenMoveUnder}>
            <ChevronRight className="h-3.5 w-3.5" />
            Move under
          </button>
          <button type="button" className="workspace-secondary-btn px-2.5 py-1.5 text-[11px]" onClick={onInferSelected}><Sparkles className="h-3.5 w-3.5" />Infer selected</button>
          <button type="button" className="workspace-secondary-btn px-2.5 py-1.5 text-[11px]" onClick={onInferFolder}><Sparkles className="h-3.5 w-3.5" />Infer hierarchy for folder</button>
          <button type="button" className="workspace-secondary-btn px-2.5 py-1.5 text-[11px] text-red-600 dark:text-red-300" onClick={onDeleteSelected}><Trash2 className="h-3.5 w-3.5" />Delete</button>
          <button type="button" className="workspace-secondary-btn px-2.5 py-1.5 text-[11px]" onClick={onClearSelection}><X className="h-3.5 w-3.5" />Clear</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto overflow-x-auto">
        {activeFolder ? (
          <div
            className="min-w-[64rem]"
            onDragOver={(event) => {
              if (!activeLibCanEdit || !canDropToRoot) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(event) => {
              if (!activeLibCanEdit || !canDropToRoot) return;
              event.preventDefault();
              onDropToRoot();
            }}
          >
            <div className="sticky top-0 z-10 grid grid-cols-[2rem_2rem_minmax(6rem,10rem)_minmax(14rem,1fr)_5.5rem_6rem_6rem_2.5rem] gap-2 border-b border-slate-200 bg-slate-50/95 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 backdrop-blur dark:border-slate-700 dark:bg-[rgb(20_30_38_/_0.96)] dark:text-slate-400">
              <span />
              <span />
              <span>Ref</span>
              <span>Name</span>
              <span>Level</span>
              <span>Items</span>
              <span>Children</span>
              <span />
            </div>
            {sortedRootSections.map((section) => renderSectionNode(activeFolder, section))}
            {activeLibCanEdit && (
              <button type="button" onClick={onAddLevel1} className="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-3 text-left text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-surface-900 dark:hover:text-slate-100">
                <Plus className="h-3.5 w-3.5" />
                Add top-level row
              </button>
            )}
          </div>
        ) : activeLib?.folders.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6">
            <LibraryEmptyState
              icon={<BookOpen className="h-12 w-12 text-slate-300 dark:text-slate-600" />}
              title="Create a folder"
              description="Folders keep standards sections grouped before you start building the outline."
            />
          </div>
        ) : activeLib ? (
          <div className="flex h-full items-center justify-center p-6">
            <LibraryEmptyState
              icon={<BookOpen className="h-12 w-12 text-slate-300 dark:text-slate-600" />}
              title="Choose a folder"
              description="Select a folder above to edit its section and subsection outline."
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <LibraryEmptyState
              icon={<BookOpen className="h-12 w-12 text-slate-300 dark:text-slate-600" />}
              title="Choose a library"
              description="Select a standards library to browse folders, sections, and reusable bill items."
            />
          </div>
        )}
      </div>
    </>
  );
}
