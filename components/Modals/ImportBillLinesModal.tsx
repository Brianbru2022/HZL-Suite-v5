import React from 'react';
import { ArrowRight, Copy, X } from 'lucide-react';
import { useHelpContext } from '../../hooks/useHelpContext';
import { useAppContextOptional } from '../../contexts/AppContext';
import { HelpButton } from '../Help/HelpButton';
import { inspectBoqWorkbook } from '../../utils/boqWorkbookImport';

type ImportLineOption = {
  id: string;
  label: string;
  typeLabel: string;
  description: string;
};

type ImportBillOption = {
  id: string;
  name: string;
  lines: ImportLineOption[];
};

type ImportProjectOption = {
  id: string;
  name: string;
  bills: ImportBillOption[];
};

interface ImportBillLinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    sourceProjectId: string;
    sourceBillId: string;
    lineIds: string[];
    targetValue: string;
  }) => void;
  projects: ImportProjectOption[];
  currentProjectId?: string | null;
  targetOptions: Array<{ value: string; label: string }>;
  defaultTargetValue?: string;
  onWorkbookImport?: (file: File, sheetName: string, targetValue: string) => Promise<void>;
}

export const ImportBillLinesModal: React.FC<ImportBillLinesModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  projects,
  currentProjectId,
  targetOptions,
  defaultTargetValue,
  onWorkbookImport,
}) => {
  const app = useAppContextOptional();
  useHelpContext('IMPORT_BILL_LINES');
  const [sourceProjectId, setSourceProjectId] = React.useState(currentProjectId || projects[0]?.id || '');
  const [sourceBillId, setSourceBillId] = React.useState('');
  const [targetValue, setTargetValue] = React.useState(defaultTargetValue || targetOptions[0]?.value || '');
  const [selectedLineIds, setSelectedLineIds] = React.useState<string[]>([]);
  const [workbookFile, setWorkbookFile] = React.useState<File | null>(null);
  const [workbookSheets, setWorkbookSheets] = React.useState<string[]>([]);
  const [workbookSheet, setWorkbookSheet] = React.useState('');
  const [workbookSummary, setWorkbookSummary] = React.useState('');

  const activeProject = React.useMemo(
    () => projects.find((project) => project.id === sourceProjectId) || null,
    [projects, sourceProjectId],
  );
  const activeBill = React.useMemo(
    () => activeProject?.bills.find((bill) => bill.id === sourceBillId) || null,
    [activeProject, sourceBillId],
  );

  React.useEffect(() => {
    if (!isOpen) return;
    const nextProjectId = currentProjectId || projects[0]?.id || '';
    const nextBillId = projects.find((project) => project.id === nextProjectId)?.bills[0]?.id || '';
    setSourceProjectId(nextProjectId);
    setSourceBillId(nextBillId);
    setTargetValue(defaultTargetValue || targetOptions[0]?.value || '');
    setSelectedLineIds([]);
    setWorkbookFile(null); setWorkbookSheets([]); setWorkbookSheet(''); setWorkbookSummary('');
  }, [currentProjectId, defaultTargetValue, isOpen, projects, targetOptions]);

  React.useEffect(() => {
    const nextBillId = activeProject?.bills[0]?.id || '';
    if (!sourceBillId || !activeProject?.bills.some((bill) => bill.id === sourceBillId)) {
      setSourceBillId(nextBillId);
      setSelectedLineIds([]);
    }
  }, [activeProject, sourceBillId]);

  if (!isOpen) return null;

  const canSubmit = Boolean(sourceProjectId && sourceBillId && targetValue && selectedLineIds.length > 0);
  const inspectWorkbook = async (file: File) => {
    setWorkbookFile(file); setWorkbookSummary('Reading workbook...');
    try { const preview = await inspectBoqWorkbook(file); setWorkbookSheets(preview.sheets); setWorkbookSheet(preview.sheets[0] || ''); setWorkbookSummary(`${preview.lines.length} lines classified. Source ${preview.sourceTotal.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })}; imported ${preview.importedTotal.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })}.`); }
    catch (error) { setWorkbookFile(null); setWorkbookSummary(error instanceof Error ? error.message : 'The workbook could not be read.'); }
  };

  return (
    <div className="fixed inset-0 z-[145] flex items-center justify-center bg-slate-950/55 px-4 py-6">
      <div className="absolute inset-0" aria-hidden onClick={onClose} />
      <div data-help-id="help-import-bill-lines" className="relative z-10 flex w-full max-w-3xl max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-app-xl border border-slate-200 bg-white shadow-app-lg dark:border-slate-700 dark:bg-surface-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-700">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
              Import lines
            </div>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Copy lines from another bill
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Choose a source bill, tick the lines to import, then place them into the current bill structure.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <HelpButton compact onClick={() => app?.openHelp('IMPORT_BILL_LINES')} />
            <button type="button" onClick={onClose} className="workspace-secondary-btn px-3 py-2 text-xs">
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Source project
              </label>
              <select
                value={sourceProjectId}
                onChange={(event) => setSourceProjectId(event.target.value)}
                className="mt-2 w-full rounded-app border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Source bill
              </label>
              <select
                value={sourceBillId}
                onChange={(event) => {
                  setSourceBillId(event.target.value);
                  setSelectedLineIds([]);
                }}
                className="mt-2 w-full rounded-app border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100"
              >
                {(activeProject?.bills || []).map((bill) => (
                  <option key={bill.id} value={bill.id}>{bill.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Destination location
            </label>
            <select
              value={targetValue}
              onChange={(event) => setTargetValue(event.target.value)}
              className="mt-2 w-full rounded-app border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-surface-900 dark:text-slate-100"
            >
              {targetOptions.map((target) => (
                <option key={target.value} value={target.value}>{target.label}</option>
              ))}
            </select>
          </div>

          <div className="mt-5 rounded-app-lg border border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-surface-800/70">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Bill lines
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {selectedLineIds.length} selected
              </div>
            </div>
            <div className="max-h-[24rem] overflow-y-auto p-3">
              {!activeBill || activeBill.lines.length === 0 ? (
                <div className="workspace-empty text-sm text-slate-500 dark:text-slate-400">
                  No bill lines available to import from this source.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeBill.lines.map((line) => {
                    const isSelected = selectedLineIds.includes(line.id);
                    return (
                      <label
                        key={line.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-app border px-3 py-3 transition ${
                          isSelected
                            ? 'border-primary-300 bg-primary-50/80 dark:border-primary-700 dark:bg-primary-950/20'
                            : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-surface-900'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(event) => {
                            setSelectedLineIds((prev) => (
                              event.target.checked
                                ? [...prev, line.id]
                                : prev.filter((entry) => entry !== line.id)
                            ));
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-700 dark:bg-surface-800 dark:text-slate-400">
                              {line.typeLabel}
                            </span>
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {line.label}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                            {line.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          {onWorkbookImport && <div className="mt-5 rounded-app-lg border border-primary-200 bg-primary-50/40 p-4 dark:border-primary-900/60 dark:bg-primary-950/20">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Import a BoQ workbook</div><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Preview classifications and reconciliation before appending the workbook to the selected destination.</p>
            <input type="file" accept=".xlsx,.xlsm,.csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void inspectWorkbook(file); }} className="mt-3 block w-full text-xs" />
            {workbookSheets.length > 1 && <select value={workbookSheet} onChange={(event) => setWorkbookSheet(event.target.value)} className="mt-3 w-full rounded-app border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-surface-900">{workbookSheets.map((sheet) => <option key={sheet} value={sheet}>{sheet}</option>)}</select>}
            {workbookSummary && <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">{workbookSummary}</div>}
            <button type="button" disabled={!workbookFile || !workbookSheet} onClick={() => workbookFile && void onWorkbookImport(workbookFile, workbookSheet, targetValue)} className="workspace-primary-btn mt-3 px-3 py-2 text-xs disabled:opacity-50">Append workbook lines</button>
          </div>}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Copy className="h-3.5 w-3.5" />
            Imported lines get fresh ids so the source bill stays unchanged.
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="workspace-secondary-btn px-4 py-2 text-xs">
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => onSubmit({ sourceProjectId, sourceBillId, lineIds: selectedLineIds, targetValue })}
              className="workspace-primary-btn px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
            >
              Import selected lines
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
