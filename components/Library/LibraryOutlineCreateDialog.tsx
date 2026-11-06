import type { Dispatch, SetStateAction } from 'react';
import { Plus, X } from 'lucide-react';
import {
  formatOrderedLabel,
  getLibrarySectionLevelLabel,
} from '../../utils/libraryViewModel';
import type { LibraryFolder, LibrarySection } from '../../types';

export type OutlineCreateMode = 'level1' | 'same' | 'child' | 'custom';

export type OutlineCreateDraft = {
  folderId: string;
  parentSectionId: string;
  orderRef: string;
  name: string;
  mode: OutlineCreateMode;
};

type ParentRow = { section: LibrarySection; depth: number };

type LibraryOutlineCreateDialogProps = {
  draft: OutlineCreateDraft;
  sortedFolders: LibraryFolder[];
  createDialogFolder: LibraryFolder | null;
  createDialogParentRows: ParentRow[];
  activeSection: LibrarySection | undefined;
  onDraftChange: Dispatch<SetStateAction<OutlineCreateDraft | null>>;
  onModeChange: (mode: OutlineCreateMode) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function LibraryOutlineCreateDialog({
  draft,
  sortedFolders,
  createDialogFolder,
  createDialogParentRows,
  activeSection,
  onDraftChange,
  onModeChange,
  onSubmit,
  onClose,
}: LibraryOutlineCreateDialogProps) {
  const parentSection = createDialogParentRows.find((entry) => entry.section.id === draft.parentSectionId)?.section;

  return (
    <div className="fixed inset-0 z-[145] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
      <div className="workspace-shell flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden p-0">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 bg-white/92 px-6 py-5 dark:border-slate-700/80 dark:bg-[rgb(16_24_30_/_0.98)]">
          <div className="min-w-0">
            <div className="workspace-chip mb-3">
              <Plus className="h-3.5 w-3.5" />
              Library outline
            </div>
            <h3 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Add section or subsection</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
              Choose the folder and parent explicitly. References are saved as typed and will not move the row unless you run Infer.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="workspace-secondary-btn px-3 py-2 text-xs"
            aria-label="Close add outline row dialog"
          >
            <X className="h-4 w-4" />
            Close
          </button>
        </div>
        <div className="space-y-5 overflow-y-auto bg-white/88 px-6 py-6 dark:bg-[rgb(16_24_30_/_0.96)]">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Folder</span>
              <select
                value={draft.folderId}
                onChange={(event) => onDraftChange((current) => current ? {
                  ...current,
                  folderId: event.target.value,
                  parentSectionId: '',
                  mode: 'level1',
                } : current)}
                className="workspace-input text-sm"
              >
                {sortedFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {formatOrderedLabel(folder.orderRef, folder.name, 'Folder')}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Parent</span>
              <select
                value={draft.parentSectionId}
                onChange={(event) => onDraftChange((current) => current ? {
                  ...current,
                  parentSectionId: event.target.value,
                  mode: event.target.value ? 'custom' : 'level1',
                } : current)}
                className="workspace-input text-sm"
              >
                <option value="">Folder level / Level 1</option>
                {createDialogParentRows.map(({ section, depth }) => (
                  <option key={section.id} value={section.id}>
                    {`${'  '.repeat(Math.min(depth, 6))}${formatOrderedLabel(section.orderRef, section.name, getLibrarySectionLevelLabel(depth))}`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Placement shortcut</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onModeChange('level1')}
                className={`workspace-secondary-btn px-3 py-2 text-xs ${draft.mode === 'level1' ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-200' : ''}`}
              >
                Level 1
              </button>
              <button
                type="button"
                onClick={() => onModeChange('same')}
                disabled={!activeSection}
                className={`workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-50 ${draft.mode === 'same' ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-200' : ''}`}
              >
                Same level as selected
              </button>
              <button
                type="button"
                onClick={() => onModeChange('child')}
                disabled={!activeSection}
                className={`workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-50 ${draft.mode === 'child' ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-200' : ''}`}
              >
                Child of selected
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[12rem_minmax(0,1fr)]">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Reference</span>
              <input
                autoFocus
                value={draft.orderRef}
                onChange={(event) => onDraftChange((current) => current ? { ...current, orderRef: event.target.value } : current)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') onClose();
                  if (event.key === 'Enter') onSubmit();
                }}
                placeholder="e.g. 3.090"
                className="workspace-input text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Title</span>
              <input
                value={draft.name}
                onChange={(event) => onDraftChange((current) => current ? { ...current, name: event.target.value } : current)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') onClose();
                  if (event.key === 'Enter') onSubmit();
                }}
                placeholder="Section or subsection title"
                className="workspace-input text-sm"
              />
            </label>
          </div>

          <div className="rounded-app border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300">
            New row will be added to <strong>{formatOrderedLabel(createDialogFolder?.orderRef, createDialogFolder?.name, 'Folder')}</strong>
            {draft.parentSectionId
              ? <> under <strong>{formatOrderedLabel(parentSection?.orderRef, parentSection?.name, 'Section')}</strong>.</>
              : <> at folder level.</>}
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200/80 bg-white/92 px-6 py-4 dark:border-slate-700/80 dark:bg-[rgb(16_24_30_/_0.98)]">
          <button type="button" onClick={onClose} className="workspace-secondary-btn px-4 py-2 text-sm">Cancel</button>
          <button type="button" onClick={onSubmit} className="workspace-primary-btn px-4 py-2 text-sm">
            <Plus className="h-4 w-4" />
            Add row
          </button>
        </div>
      </div>
    </div>
  );
}
