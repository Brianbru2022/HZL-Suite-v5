import React, { useMemo, useState } from 'react';
import { FileDown, FileSpreadsheet, Layers3, Save, X } from 'lucide-react';
import type { Project, ProjectSummaryMode } from '../../types';
import { useModalFocus } from '../../hooks/useModalFocus';
import { buildProjectSummary } from '../../utils/projectSummary';
import { feedbackError, feedbackSuccess } from '../../utils/feedback';
import { useHelpContext } from '../../hooks/useHelpContext';
import { useAppContextOptional } from '../../contexts/AppContext';
import { HelpButton } from '../Help/HelpButton';
import { recordOperationLogEntry } from '../../utils/operationLog';

async function loadProjectSummaryExports() {
  return import('../../utils/projectSummaryExport');
}

interface ProjectSummaryModalProps {
  isOpen: boolean;
  project: Project;
  showToast: (opts: { type: 'success' | 'error' | 'info'; message: string; duration?: number }) => void;
  onClose: () => void;
}

function formatMoney(value: number): string {
  return `£${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const ProjectSummaryModal: React.FC<ProjectSummaryModalProps> = ({ isOpen, project, showToast, onClose }) => {
  const app = useAppContextOptional();
  useHelpContext('PROJECT_SUMMARY');
  const [mode, setMode] = useState<ProjectSummaryMode>('BILLS');
  const { contentRef, contentProps } = useModalFocus(isOpen, onClose);
  const summary = useMemo(() => buildProjectSummary(project, mode), [mode, project]);

  if (!isOpen) return null;

  const handleExportExcel = async () => {
    try {
      const { exportProjectSummaryToExcel } = await loadProjectSummaryExports();
      await exportProjectSummaryToExcel(project, summary);
      showToast({ type: 'success', message: feedbackSuccess('Project summary Excel export') });
    } catch (error) {
      recordOperationLogEntry({
        kind: 'export',
        status: 'error',
        subject: 'Project summary Excel export',
        message: 'Project summary Excel export failed.',
        error: error instanceof Error ? error.message : String(error),
        nextStep: 'Try the export again. If it repeats, copy diagnostics from the Diagnostics panel.',
      });
      showToast({ type: 'error', message: feedbackError('Project summary Excel export', error, 'Please try the export again.') });
    }
  };

  const handleExportPdf = async () => {
    try {
      const { exportProjectSummaryToPdf, saveProjectSummaryPdf } = await loadProjectSummaryExports();
      const { blob, filename } = await exportProjectSummaryToPdf(project, summary);
      await saveProjectSummaryPdf(blob, filename);
      showToast({ type: 'success', message: feedbackSuccess('Project summary PDF export') });
    } catch (error) {
      recordOperationLogEntry({
        kind: 'export',
        status: 'error',
        subject: 'Project summary PDF export',
        message: 'Project summary PDF export failed.',
        error: error instanceof Error ? error.message : String(error),
        nextStep: 'Try the export again. If it repeats, copy diagnostics from the Diagnostics panel.',
      });
      showToast({ type: 'error', message: feedbackError('Project summary PDF export', error, 'Please try the export again.') });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md dark:bg-black/60" onClick={onClose}>
      <div
        ref={contentRef}
        {...contentProps}
        data-help-id="help-project-summary"
        className="workspace-shell flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200/80 bg-white/92 px-6 py-5 dark:border-slate-700/80 dark:bg-surface-900/95">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="workspace-chip mb-3">
                <Layers3 className="h-3.5 w-3.5" />
                Project summary
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Summary by bills or sections</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
                House type bills are multiplied by their unit count here, so repeated plots roll up correctly in the project summary.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <HelpButton compact onClick={() => app?.openHelp('PROJECT_SUMMARY')} />
              <button type="button" onClick={onClose} className="workspace-secondary-btn px-3 py-2 text-xs" aria-label="Close project summary">
                <X className="h-4 w-4" />
                Close
              </button>
            </div>
          </div>
        </div>

        <div className="grid flex-1 gap-0 overflow-hidden xl:grid-cols-[0.85fr_1.15fr]">
          <div className="overflow-y-auto border-r border-slate-200/80 bg-white/88 px-6 py-6 dark:border-slate-700/80 dark:bg-surface-900/92">
            <div className="space-y-6">
              <section className="workspace-sidebar p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Summary mode</div>
                <div className="mt-4 grid gap-3">
                  {([
                    {
                      value: 'BILLS' as ProjectSummaryMode,
                      label: 'Bills',
                      hint: 'Show one rolled-up line per bill, multiplying house types by their number of units.',
                    },
                    {
                      value: 'BILLS_AND_SECTIONS' as ProjectSummaryMode,
                      label: 'Bills + Sections',
                      hint: 'Break the summary down by section while still multiplying house types by their unit count.',
                    },
                  ]).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setMode(option.value)}
                      className={`rounded-app border p-4 text-left transition-all ${
                        mode === option.value
                          ? 'border-primary-300 bg-primary-50 shadow-sm dark:border-primary-700 dark:bg-primary-900/30'
                          : 'border-slate-200 bg-surface hover:border-slate-300 dark:border-slate-700 dark:bg-surface-800 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{option.label}</div>
                      <div className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{option.hint}</div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="workspace-sidebar p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Summary totals</div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-app border border-slate-200/80 bg-surface p-4 dark:border-slate-700 dark:bg-surface-800">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Base total</div>
                    <div className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">{formatMoney(summary.baseTotal)}</div>
                  </div>
                  <div className="rounded-app border border-primary-200/80 bg-primary-50/70 p-4 dark:border-primary-900/60 dark:bg-primary-950/20">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-700 dark:text-primary-300">Summary total</div>
                    <div className="mt-2 text-xl font-semibold text-primary-900 dark:text-primary-100">{formatMoney(summary.summaryTotal)}</div>
                  </div>
                </div>
                <div className="mt-4 rounded-app-sm border border-slate-200/80 bg-surface-muted/70 px-4 py-3 text-xs leading-5 text-slate-600 dark:border-slate-700 dark:bg-surface-800/70 dark:text-slate-300">
                  {summary.houseTypeCount > 0
                    ? `${summary.houseTypeCount} house type bill${summary.houseTypeCount === 1 ? '' : 's'} detected. Their summary values are multiplied by unit count.`
                    : 'No house type bills are marked yet. Standard bills are shown at their base value.'}
                </div>
              </section>

              <section className="workspace-sidebar p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Export</div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={handleExportExcel} className="workspace-secondary-btn px-4 py-2.5 text-xs">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel summary
                  </button>
                  <button type="button" onClick={handleExportPdf} className="workspace-secondary-btn px-4 py-2.5 text-xs">
                    <FileDown className="h-4 w-4" />
                    PDF summary
                  </button>
                </div>
              </section>
            </div>
          </div>

          <div className="overflow-y-auto bg-white/92 px-6 py-6 dark:bg-surface-900/95">
            <div className="rounded-app-lg border border-slate-200/80 bg-white/95 p-5 shadow-sm dark:border-slate-700 dark:bg-surface-900/92">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="pb-3 pr-4 text-left font-semibold text-slate-500 dark:text-slate-400">Bill</th>
                      <th className="pb-3 pr-4 text-left font-semibold text-slate-500 dark:text-slate-400">Section</th>
                      <th className="pb-3 pr-4 text-left font-semibold text-slate-500 dark:text-slate-400">Type</th>
                      <th className="pb-3 pr-4 text-right font-semibold text-slate-500 dark:text-slate-400">Units</th>
                      <th className="pb-3 pr-4 text-right font-semibold text-slate-500 dark:text-slate-400">Base value</th>
                      <th className="pb-3 text-right font-semibold text-slate-500 dark:text-slate-400">Summary value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.rows.map((row) => (
                      <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-3 pr-4 align-top text-slate-900 dark:text-slate-100">{row.billName}</td>
                        <td className="py-3 pr-4 align-top text-slate-600 dark:text-slate-300">{row.sectionName || '—'}</td>
                        <td className="py-3 pr-4 align-top text-slate-600 dark:text-slate-300">{row.billType === 'HOUSE_TYPE' ? 'House type' : 'Standard'}</td>
                        <td className="py-3 pr-4 text-right align-top tabular-nums text-slate-600 dark:text-slate-300">
                          {row.billType === 'HOUSE_TYPE' ? row.unitCount : '—'}
                        </td>
                        <td className="py-3 pr-4 text-right align-top tabular-nums text-slate-600 dark:text-slate-300">{formatMoney(row.baseValue)}</td>
                        <td className="py-3 text-right align-top tabular-nums font-semibold text-slate-900 dark:text-slate-100">{formatMoney(row.summaryValue)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="pt-4 pr-4 text-left font-semibold text-slate-900 dark:text-slate-100" colSpan={4}>TOTAL</td>
                      <td className="pt-4 pr-4 text-right tabular-nums font-semibold text-slate-600 dark:text-slate-300">{formatMoney(summary.baseTotal)}</td>
                      <td className="pt-4 text-right tabular-nums font-semibold text-slate-900 dark:text-slate-100">{formatMoney(summary.summaryTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
