import React from 'react';
import type { DevelopmentAppraisalOption } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { downloadAppraisalLandOfferExclusionsPdf } from '../../utils/appraisalExport';
import { notAllowedAbnormalRows, type NotAllowedAbnormalRow } from '../../utils/appraisalNotAllowedAbnormals';

const KIND_LABELS: Record<NotAllowedAbnormalRow['kind'], string> = {
  REPORT: 'Survey / report',
  WORK: 'Conditional work',
  ABNORMAL: 'Unpriced abnormal',
};

export function NotAllowedAbnormalsStage({ option, appraisalName }: { option: DevelopmentAppraisalOption; appraisalName: string }) {
  const { showToast } = useToast();
  const rows = notAllowedAbnormalRows(option, true);
  const draftSurveyRows = !option.surveyReports?.confirmedAt && rows.some(row => row.kind !== 'ABNORMAL');
  const exportRows = notAllowedAbnormalRows(option);
  const groups = [
    { title: 'Surveys and reports excluded from Prelims', rows: rows.filter(row => row.kind === 'REPORT') },
    { title: 'Conditional work arising from excluded reports', rows: rows.filter(row => row.kind === 'WORK') },
    { title: 'Unpriced elements in Abnormals', rows: rows.filter(row => row.kind === 'ABNORMAL') },
  ].filter(group => group.rows.length);
  const exportSchedule = async () => {
    try {
      const saved = await downloadAppraisalLandOfferExclusionsPdf(option, appraisalName);
      if (saved) showToast({ type: 'success', message: 'Abnormal exclusions PDF saved.' });
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to export exclusions.' });
    }
  };

  return <section data-smoke="appraisals-not-allowed-abnormals" className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold">Abnormal elements not allowed for</h2>
        <p className="mt-1 max-w-4xl text-sm text-slate-600 dark:text-slate-300">Excluded Prelims surveys, their possible follow-on work and unpriced, uncleared Abnormals register elements. These are land-offer qualifications; this schedule adds no cost to the appraisal.</p>
      </div>
      <button type="button" disabled={!exportRows.length || draftSurveyRows} onClick={() => void exportSchedule()} className="rounded-app-sm bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Download exclusions PDF</button>
    </div>
    {draftSurveyRows && <p className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-surface-950 dark:text-amber-200">The survey exclusions are still draft. Apply the Surveys and reports schedule in Prelims assumptions before issuing this list.</p>}
    <p className="mt-3 text-sm font-medium">{rows.length} item{rows.length === 1 ? '' : 's'} not allowed for · {rows.filter(row => row.kind === 'ABNORMAL').length} unpriced abnormal element{rows.filter(row => row.kind === 'ABNORMAL').length === 1 ? '' : 's'}</p>
    {groups.map(group => <div key={group.title} className="mt-4 overflow-x-auto rounded-app-sm border border-slate-200 dark:border-slate-700">
      <h3 className="bg-emerald-700 px-3 py-2 font-semibold text-white">{group.title} ({group.rows.length})</h3>
      <table className="w-full text-left text-sm"><thead className="bg-slate-100 text-xs uppercase tracking-wide dark:bg-surface-800"><tr><th className="w-40 px-3 py-2">Type</th><th className="min-w-64 px-3 py-2">Element</th><th className="min-w-80 px-3 py-2">Land-offer qualification</th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-700">
        {group.rows.map(row => <tr key={row.id}><td className="px-3 py-2 align-top">{KIND_LABELS[row.kind]}</td><td className="px-3 py-2 align-top font-medium">{row.title}<div className="text-xs font-normal text-slate-500">{row.category}</div></td><td className="px-3 py-2 align-top">{row.qualification}</td></tr>)}
      </tbody></table>
    </div>)}
    {!rows.length && <p className="mt-4 rounded border border-slate-200 px-3 py-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">No excluded surveys or unpriced Abnormals elements are recorded for this option.</p>}
  </section>;
}
