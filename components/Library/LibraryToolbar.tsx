import { AlertTriangle, ArrowLeft, ChevronDown, Download, Library as LibraryIcon, ListChecks, Loader2, Pencil, Plus, Star, Trash2, Upload, X } from 'lucide-react';
import type React from 'react';
import { HelpButton } from '../Help/HelpButton';
import { MenuActionList } from '../UI/MenuActionList';
import type { ContextMenuEntry } from '../UI/ContextMenu';
import { normalizeLibraryLabel } from '../../utils/libraryViewModel';
import type { ItemLibrary } from '../../types';

type LibraryToolbarProps = {
  sortedLibraries: ItemLibrary[];
  activeLib: ItemLibrary | null;
  activeLibCanEdit: boolean;
  selectedLibId: string | null;
  displayLibraryName: string | null;
  activeLibraryPricedCount: number | null;
  activeLibraryPricedTotal: number;
  isDebugLogging: boolean;
  isImportingLibraryPack: boolean;
  isSplittingLibraryJson: boolean;
  openLibraryOptionsMenu: string | null;
  setOpenLibraryOptionsMenu: React.Dispatch<React.SetStateAction<string | null>>;
  LibraryOptionsMenu: React.ComponentType<any>;
  onClose: () => void;
  onOpenHelp: () => void;
  onOpenDebug: () => void;
  onToggleDebugLogging: () => void;
  onOpenImportGuide: () => void;
  onImportPack: () => void;
  onImportJson: () => void;
  onSplitJson: () => void;
  onOpenExport: () => void;
  onCreateLibrary: () => void;
  onSelectLibrary: (libraryId: string | null) => void;
  onToggleFavorite: (library: ItemLibrary) => void;
  onExportLibrarySections: (library: ItemLibrary) => void;
  onExportLibrarySectionNames: (library: ItemLibrary) => void;
  onRenameLibrary: (library: ItemLibrary) => void;
  onDeleteLibrary: (library: ItemLibrary) => void;
  onOpenGovernance: () => void;
};

export function LibraryToolbar({
  sortedLibraries,
  activeLib,
  activeLibCanEdit,
  selectedLibId,
  displayLibraryName,
  activeLibraryPricedCount,
  activeLibraryPricedTotal,
  isDebugLogging,
  isImportingLibraryPack,
  isSplittingLibraryJson,
  openLibraryOptionsMenu,
  setOpenLibraryOptionsMenu,
  LibraryOptionsMenu,
  onClose,
  onOpenHelp,
  onOpenDebug,
  onToggleDebugLogging,
  onOpenImportGuide,
  onImportPack,
  onImportJson,
  onSplitJson,
  onOpenExport,
  onCreateLibrary,
  onSelectLibrary,
  onToggleFavorite,
  onExportLibrarySections,
  onExportLibrarySectionNames,
  onRenameLibrary,
  onDeleteLibrary,
  onOpenGovernance,
}: LibraryToolbarProps) {
  const closeLibraryOptionsMenu = () => setOpenLibraryOptionsMenu(null);
  const importActionItems: ContextMenuEntry[] = [
    {
      id: 'library-import-guide',
      label: 'Import guide',
      icon: <ListChecks className="h-4 w-4" />,
      onSelect: onOpenImportGuide,
    },
    { id: 'library-import-label', type: 'label', label: 'Direct actions' },
    {
      id: 'library-import-pack',
      label: 'Import pack',
      icon: isImportingLibraryPack ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />,
      disabled: isImportingLibraryPack,
      onSelect: onImportPack,
    },
    {
      id: 'library-import-json',
      label: 'Import JSON',
      icon: <Upload className="h-4 w-4" />,
      onSelect: onImportJson,
    },
    {
      id: 'library-split-json',
      label: 'Split JSON file',
      icon: isSplittingLibraryJson ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />,
      disabled: isSplittingLibraryJson,
      onSelect: onSplitJson,
    },
  ];
  const exportActionItems: ContextMenuEntry[] = [
    {
      id: 'library-export-libraries',
      label: 'Export libraries',
      icon: <Download className="h-4 w-4" />,
      onSelect: onOpenExport,
    },
    ...(activeLib
      ? [
          { id: 'library-export-active-label', type: 'label' as const, label: 'Active library' },
          {
            id: 'library-export-sections',
            label: 'Export all sections JSON',
            icon: <Download className="h-4 w-4" />,
            onSelect: () => onExportLibrarySections(activeLib),
          },
          {
            id: 'library-export-section-names',
            label: 'Export section names',
            icon: <Download className="h-4 w-4" />,
            onSelect: () => onExportLibrarySectionNames(activeLib),
          },
        ]
      : []),
  ];
  const diagnosticsActionItems: ContextMenuEntry[] = [
    {
      id: 'library-debug',
      label: 'Debug',
      icon: <AlertTriangle className="h-4 w-4" />,
      onSelect: onOpenDebug,
    },
    {
      id: 'library-toggle-log',
      label: isDebugLogging ? 'Stop log' : 'Start log',
      icon: <AlertTriangle className="h-4 w-4" />,
      onSelect: onToggleDebugLogging,
    },
  ];
  const activeLibraryActionItems: ContextMenuEntry[] = activeLib ? [
    {
      id: 'library-toggle-favourite',
      label: activeLib.favorite ? 'Remove favourite' : 'Add favourite',
      icon: <Star className={`h-4 w-4 ${activeLib.favorite ? 'fill-amber-400 text-amber-500' : ''}`} />,
      onSelect: () => onToggleFavorite(activeLib),
    },
    ...(activeLibCanEdit
      ? [{
          id: 'library-rename',
          label: 'Rename library',
          icon: <Pencil className="h-4 w-4" />,
          onSelect: () => onRenameLibrary(activeLib),
        }]
      : []),
    {
      id: 'library-delete',
      label: 'Delete library',
      icon: <Trash2 className="h-4 w-4" />,
      tone: 'danger',
      onSelect: () => onDeleteLibrary(activeLib),
    },
  ] : [];

  return (
    <div className="shrink-0 border-b border-slate-200/80 bg-[rgb(255_255_255_/_0.9)] px-6 py-5 shadow-app backdrop-blur-xl dark:border-slate-700/80 dark:bg-[rgb(19_27_34_/_0.96)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button type="button" onClick={onClose} aria-label="Back from standard libraries" className="workspace-compact-btn"><ArrowLeft className="h-4 w-4" />Back</button>
          <div className="rounded-app border border-slate-200 bg-white/85 p-3 shadow-sm dark:border-slate-700 dark:bg-surface-800">
            <LibraryIcon className="h-6 w-6 text-slate-700 dark:text-slate-200" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Standards workspace</div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Libraries and reusable items</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Curate standard descriptions, reusable clauses, and bill-ready line items.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <HelpButton compact onClick={onOpenHelp} />
          <LibraryOptionsMenu
            menuKey="toolbar-import"
            openMenuKey={openLibraryOptionsMenu}
            setOpenMenuKey={setOpenLibraryOptionsMenu}
            label="Open import actions"
            trigger={<><Upload className="h-4 w-4" />Import<ChevronDown className="h-3.5 w-3.5" /></>}
            buttonClassName="workspace-compact-btn"
          >
            <MenuActionList items={importActionItems} close={closeLibraryOptionsMenu} itemTextSize="text-xs" />
          </LibraryOptionsMenu>
          <LibraryOptionsMenu
            menuKey="toolbar-export"
            openMenuKey={openLibraryOptionsMenu}
            setOpenMenuKey={setOpenLibraryOptionsMenu}
            label="Open export actions"
            trigger={<><Download className="h-4 w-4" />Export<ChevronDown className="h-3.5 w-3.5" /></>}
            buttonClassName="workspace-primary-btn px-3 py-2 text-xs"
          >
            <MenuActionList items={exportActionItems} close={closeLibraryOptionsMenu} itemTextSize="text-xs" />
          </LibraryOptionsMenu>
          <LibraryOptionsMenu
            menuKey="toolbar-diagnostics"
            openMenuKey={openLibraryOptionsMenu}
            setOpenMenuKey={setOpenLibraryOptionsMenu}
            label="Open diagnostics actions"
            trigger={<><AlertTriangle className="h-4 w-4" />Diagnostics<ChevronDown className="h-3.5 w-3.5" /></>}
            buttonClassName={`workspace-compact-btn ${isDebugLogging ? 'border-emerald-400/60 bg-emerald-50 text-emerald-700 dark:border-emerald-700/70 dark:bg-emerald-950/30 dark:text-emerald-200' : ''}`}
          >
            <MenuActionList items={diagnosticsActionItems} close={closeLibraryOptionsMenu} itemTextSize="text-xs" />
          </LibraryOptionsMenu>
          <button type="button" onClick={onClose} aria-label="Close standard libraries" className="workspace-compact-btn"><X className="h-4 w-4" />Close</button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex min-w-[20rem] flex-1 items-center gap-2 rounded-app-lg border border-slate-200 bg-white/85 px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-surface-900">
          <LibraryIcon className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-300" />
          <select
            value={selectedLibId || ''}
            onChange={(event) => onSelectLibrary(event.target.value || null)}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none dark:text-slate-100"
            aria-label="Select library"
          >
            <option value="">Choose a library...</option>
            {sortedLibraries.map((library) => (
              <option key={library.id} value={library.id}>
                {library.favorite ? '\u2605 ' : ''}{normalizeLibraryLabel(library.name, 'Library')}
              </option>
            ))}
          </select>
          {activeLib && (
            <span className="hidden shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400 lg:inline">
              {activeLibraryPricedCount === null ? 'Counting priced items...' : `${activeLibraryPricedTotal.toLocaleString()} priced items`}
            </span>
          )}
        </div>
        <button type="button" onClick={onCreateLibrary} className="workspace-primary-btn px-3 py-2 text-xs"><Plus className="h-3.5 w-3.5" />New library</button>
        {activeLib && <button type="button" onClick={onOpenGovernance} className="workspace-secondary-btn px-3 py-2 text-xs"><ListChecks className="h-3.5 w-3.5" />Governance</button>}
        {activeLib && (
          <LibraryOptionsMenu
            menuKey={`active-library-${activeLib.id}`}
            openMenuKey={openLibraryOptionsMenu}
            setOpenMenuKey={setOpenLibraryOptionsMenu}
            label={`Open options for ${displayLibraryName || 'library'}`}
            trigger={<><span className="hidden sm:inline">More</span><ChevronDown className="h-3.5 w-3.5" /></>}
            buttonClassName="workspace-secondary-btn px-3 py-2 text-xs"
          >
            <MenuActionList items={activeLibraryActionItems} close={closeLibraryOptionsMenu} itemTextSize="text-xs" />
          </LibraryOptionsMenu>
        )}
      </div>
    </div>
  );
}
