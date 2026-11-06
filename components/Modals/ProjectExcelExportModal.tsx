import React from 'react';
import { FileSpreadsheet, FolderArchive, X } from 'lucide-react';

type ProjectExcelExportMode = 'bill-tabs' | 'separate-bill-workbooks';

interface ProjectExcelExportModalProps {
  projectName: string;
  onClose: () => void;
  onConfirm: (mode: ProjectExcelExportMode) => void;
}

const optionClass = (selected: boolean) =>
  selected
    ? 'rounded-app-lg border border-primary-300 bg-primary-50 p-4 text-left shadow-sm dark:border-primary-700 dark:bg-primary-900/25'
    : 'rounded-app-lg border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 dark:border-slate-700 dark:bg-surface-900 dark:hover:border-slate-600';

export const ProjectExcelExportModal: React.FC<ProjectExcelExportModalProps> = ({ projectName, onClose, onConfirm }) => {
  const [mode, setMode] = React.useState<ProjectExcelExportMode>('bill-tabs');

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/60 p-4 dark:bg-black/70">
      <div className="w-full max-w-2xl rounded-app-lg border border-slate-300 bg-white shadow-[0_28px_72px_-24px_rgba(15,23,42,0.5)] dark:border-slate-700 dark:bg-surface-900">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Excel export</div>
            <div className="mt-1 text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              Export {projectName}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Choose whether the full project should export as one workbook with bill tabs, or as separate bill workbooks with section tabs.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close export options" className="workspace-secondary-btn px-3 py-2 text-xs">
            <X className="h-4 w-4" />
            Close
          </button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          <button type="button" onClick={() => setMode('bill-tabs')} className={optionClass(mode === 'bill-tabs')}>
            <div className="flex items-center gap-3">
              <div className="rounded-app bg-slate-100 p-2.5 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">One workbook with bill tabs</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Best when you want one project file with a tab per bill.</div>
              </div>
            </div>
            <ul className="mt-4 space-y-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
              <li>Project summary sheet first</li>
              <li>One worksheet for each bill</li>
              <li>Good for a full project handover workbook</li>
            </ul>
          </button>

          <button type="button" onClick={() => setMode('separate-bill-workbooks')} className={optionClass(mode === 'separate-bill-workbooks')}>
            <div className="flex items-center gap-3">
              <div className="rounded-app bg-slate-100 p-2.5 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <FolderArchive className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Separate bill workbooks</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Best when each bill needs its own workbook with section tabs.</div>
              </div>
            </div>
            <ul className="mt-4 space-y-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
              <li>Choose a folder destination</li>
              <li>One workbook per bill</li>
              <li>Each workbook contains section worksheets</li>
            </ul>
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
          <button type="button" onClick={onClose} className="workspace-secondary-btn px-4 py-2 text-xs">
            Cancel
          </button>
          <button type="button" onClick={() => onConfirm(mode)} className="workspace-primary-btn px-4 py-2 text-xs">
            Export
          </button>
        </div>
      </div>
    </div>
  );
};
