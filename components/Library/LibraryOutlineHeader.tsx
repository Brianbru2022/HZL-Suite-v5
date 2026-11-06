import { useState } from 'react';
import type React from 'react';
import { ChevronDown, ChevronLeft, Download, Folder, Pencil, Plus, Trash2 } from 'lucide-react';
import { ContextMenu, shouldUseNativeContextMenu } from '../UI/ContextMenu';
import type { ContextMenuEntry, ContextMenuState } from '../UI/ContextMenu';
import { MenuActionList } from '../UI/MenuActionList';
import { formatOrderedLabel } from '../../utils/libraryViewModel';
import type { ItemLibrary, LibraryFolder, LibrarySection } from '../../types';

type SearchScopes = {
  section: boolean;
  folder: boolean;
  library: boolean;
};

type LibraryOutlineHeaderProps = {
  activeLib: ItemLibrary;
  activeFolder: LibraryFolder | null;
  activeSection: LibrarySection | null;
  activeLibCanEdit: boolean;
  displayLibraryName: string | null;
  sortedFolders: LibraryFolder[];
  selectedFolderId: string | null;
  searchQuery: string;
  searchScopes: SearchScopes;
  openLibraryOptionsMenu: string | null;
  setOpenLibraryOptionsMenu: React.Dispatch<React.SetStateAction<string | null>>;
  LibraryOptionsMenu: React.ComponentType<any>;
  onCollapse: () => void;
  onSearchQueryChange: (query: string) => void;
  onSearchScopesChange: React.Dispatch<React.SetStateAction<SearchScopes>>;
  onSelectFolder: (folderId: string | null) => void;
  onExportFolder: (folder: LibraryFolder) => void;
  onExportFolderSections: (folder: LibraryFolder) => void;
  onExportFolderSectionNames: (folder: LibraryFolder) => void;
  onRenameFolder: (folder: LibraryFolder) => void;
  onDeleteFolder: (folder: LibraryFolder) => void;
  onCreateFolder: () => void;
  onAddLevel1: () => void;
  onAddSameLevel: () => void;
  onAddChild: () => void;
};

function countSectionNodes(sections: LibrarySection[] = []): number {
  return sections.reduce((total, section) => total + 1 + countSectionNodes(section.subSections || []), 0);
}

export function LibraryOutlineHeader({
  activeLib,
  activeFolder,
  activeSection,
  activeLibCanEdit,
  displayLibraryName,
  sortedFolders,
  selectedFolderId,
  searchQuery,
  searchScopes,
  openLibraryOptionsMenu,
  setOpenLibraryOptionsMenu,
  LibraryOptionsMenu,
  onCollapse,
  onSearchQueryChange,
  onSearchScopesChange,
  onSelectFolder,
  onExportFolder,
  onExportFolderSections,
  onExportFolderSectionNames,
  onRenameFolder,
  onDeleteFolder,
  onCreateFolder,
  onAddLevel1,
  onAddSameLevel,
  onAddChild,
}: LibraryOutlineHeaderProps) {
  const activeFolderSectionCount = countSectionNodes(activeFolder?.sections || []);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const closeLibraryOptionsMenu = () => setOpenLibraryOptionsMenu(null);
  const folderActionItems: ContextMenuEntry[] = activeFolder ? [
    { id: 'folder-export-label', type: 'label', label: 'Import/export' },
    {
      id: 'folder-export-json',
      label: 'Export JSON',
      icon: <Download className="h-4 w-4" />,
      onSelect: () => onExportFolder(activeFolder),
    },
    {
      id: 'folder-export-sections',
      label: 'Export sections JSON',
      icon: <Download className="h-4 w-4" />,
      onSelect: () => onExportFolderSections(activeFolder),
    },
    {
      id: 'folder-export-names',
      label: 'Export section names',
      icon: <Download className="h-4 w-4" />,
      onSelect: () => onExportFolderSectionNames(activeFolder),
    },
    ...(activeLibCanEdit
      ? [
          { id: 'folder-edit-label', type: 'label' as const, label: 'Edit' },
          {
            id: 'folder-rename',
            label: 'Rename folder',
            icon: <Pencil className="h-4 w-4" />,
            onSelect: () => onRenameFolder(activeFolder),
          },
          { id: 'folder-danger-label', type: 'label' as const, label: 'Danger' },
          {
            id: 'folder-delete',
            label: 'Delete folder',
            icon: <Trash2 className="h-4 w-4" />,
            tone: 'danger' as const,
            onSelect: () => onDeleteFolder(activeFolder),
          },
        ]
      : []),
  ] : [];
  const addOutlineActionItems: ContextMenuEntry[] = [
    { id: 'outline-add-label', type: 'label', label: 'Add new row' },
    {
      id: 'outline-add-level-1',
      label: 'Top-level section',
      icon: <Plus className="h-4 w-4" />,
      onSelect: onAddLevel1,
    },
    ...(activeSection
      ? [
          {
            id: 'outline-add-same-level',
            label: 'Same level as selected',
            icon: <Plus className="h-4 w-4" />,
            onSelect: onAddSameLevel,
          },
          {
            id: 'outline-add-child',
            label: 'Child of selected',
            icon: <Plus className="h-4 w-4" />,
            onSelect: onAddChild,
          },
        ]
      : []),
  ];

  const openFolderContextMenu = (event: React.MouseEvent<HTMLElement>, items: ContextMenuEntry[]) => {
    if (!activeFolder || shouldUseNativeContextMenu(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    setOpenLibraryOptionsMenu(null);
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      label: `${formatOrderedLabel(activeFolder.orderRef, activeFolder.name, 'Folder')} actions`,
      items,
    });
  };

  return (
    <div className="border-b border-slate-200/80 px-4 py-4 dark:border-slate-700/80">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Library outline</div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{displayLibraryName}</span>
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-400">
              {(activeLib.folders || []).length.toLocaleString()} folder{(activeLib.folders || []).length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onCollapse}
          className="workspace-secondary-btn px-2.5 py-2"
          aria-label="Collapse outline pane"
          title="Collapse outline pane"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div
        className="mt-4 flex flex-wrap items-center gap-2 rounded-app-lg border border-slate-200 bg-slate-50/70 p-2 dark:border-slate-700 dark:bg-surface-900/60"
        onContextMenu={(event) => openFolderContextMenu(event, folderActionItems)}
      >
        <label className="flex min-w-[18rem] flex-1 items-center gap-2 rounded-app border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-inner dark:border-slate-700 dark:bg-[rgb(14_22_28_/_0.98)] dark:text-slate-300">
          <Folder className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="sr-only">Folder</span>
          <select
            value={selectedFolderId || ''}
            onChange={(event) => onSelectFolder(event.target.value || null)}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none dark:text-slate-100"
          >
            <option value="">Choose a folder...</option>
            {sortedFolders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {formatOrderedLabel(folder.orderRef, folder.name, 'Folder')}
              </option>
            ))}
          </select>
        </label>
        {activeFolder && (
          <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-400">
            {activeFolderSectionCount.toLocaleString()} node{activeFolderSectionCount === 1 ? '' : 's'}
          </span>
        )}
        {activeFolder && (
          <LibraryOptionsMenu
            menuKey={`folder-row-${activeFolder.id}`}
            openMenuKey={openLibraryOptionsMenu}
            setOpenMenuKey={setOpenLibraryOptionsMenu}
            label={`Open options for folder ${formatOrderedLabel(activeFolder.orderRef, activeFolder.name, 'Folder')}`}
          >
            <MenuActionList items={folderActionItems} close={closeLibraryOptionsMenu} itemTextSize="text-xs" />
          </LibraryOptionsMenu>
        )}
        {activeLibCanEdit && <button type="button" onClick={onCreateFolder} className="workspace-secondary-btn px-3 py-2 text-xs"><Plus className="h-3.5 w-3.5" />New folder</button>}
      </div>

      {activeLibCanEdit && activeFolder && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Structure</span>
          <LibraryOptionsMenu
            menuKey="new-outline-row"
            openMenuKey={openLibraryOptionsMenu}
            setOpenMenuKey={setOpenLibraryOptionsMenu}
            label="Add outline row"
            trigger={<><Plus className="h-3.5 w-3.5" />Add section<ChevronDown className="h-3.5 w-3.5" /></>}
            buttonClassName="workspace-primary-btn px-3 py-2 text-xs"
          >
            <MenuActionList items={addOutlineActionItems} close={closeLibraryOptionsMenu} itemTextSize="text-xs" />
          </LibraryOptionsMenu>
        </div>
      )}

      <div className="mt-3">
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Search folders, sections, or items..."
          className="w-full rounded-app border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-inner focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-[rgb(14_22_28_/_0.98)] dark:text-slate-100 dark:focus:border-primary-500 dark:focus:ring-primary-900/60"
        />
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {[
            ['section', 'Section', Boolean(activeSection)],
            ['folder', 'Folder', Boolean(activeFolder)],
            ['library', 'Library', true],
          ].map(([key, label, enabled]) => (
            <label key={key as string} className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 ${enabled ? 'border-slate-200 bg-white dark:border-slate-700 dark:bg-surface-900' : 'border-slate-200/60 bg-slate-100/70 opacity-50 dark:border-slate-800 dark:bg-surface-950'}`}>
              <input
                type="checkbox"
                disabled={!enabled}
                checked={Boolean(searchScopes[key as keyof SearchScopes]) && Boolean(enabled)}
                onChange={(event) => onSearchScopesChange((current) => ({ ...current, [key as string]: event.target.checked }))}
                className="h-3.5 w-3.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              {label}
            </label>
          ))}
        </div>
      </div>
      <ContextMenu state={contextMenu} onClose={() => setContextMenu(null)} />
    </div>
  );
}
