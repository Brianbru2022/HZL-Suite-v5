import React, { useState } from 'react';
import type { AppraisalCostLine, AppraisalSiteCostAllocation, AppraisalSiteCostStatus, DevelopmentAppraisalOption } from '../../types';
import { SITE_COST_ALLOCATION_LABELS, SITE_COST_STATUS_LABELS, siteCostMetadata, siteCostSummary } from '../../utils/appraisalSiteCosts';
import { calculateCostLineAmount } from '../../utils/appraisal';
import { excludedSurveyAbnormalItems } from '../../utils/appraisalSurveyReports';
const field = 'rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-surface-900';
const money = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);

export function NotAllowedSurveyAbnormals({ option, includeDraft = false, onExport }: { option: DevelopmentAppraisalOption; includeDraft?: boolean; onExport?: () => void }) {
  const rows = excludedSurveyAbnormalItems(option, includeDraft);
  if (!rows.length) return null;
  const draft = !option.surveyReports?.confirmedAt;
  return <details data-smoke="appraisals-not-allowed-surveys" className="rounded border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-surface-900">
    <summary className="cursor-pointer font-semibold">Abnormal items not allowed for — excluded surveys and resulting work ({rows.length}){draft ? ' · draft' : ''}</summary>
    <p className="mt-2 text-slate-700 dark:text-slate-300">Each excluded survey creates two separate land-offer qualifications: the report itself and possible work arising from its findings. These items are unpriced and add no cost to the appraisal. Work is conditional and excludes anything expressly allowed elsewhere. {draft ? 'Apply the survey schedule before issuing this list.' : 'This list is included in the land-offer exclusions schedule.'}</p>
    {onExport && !draft && <button type="button" className="my-2 rounded border border-amber-500 px-3 py-1.5 font-medium text-amber-950 dark:text-amber-200" onClick={onExport}>Download exclusions PDF</button>}
    <div className="mt-2 overflow-x-auto"><table className="w-full text-left"><thead><tr><th className="p-2">Type</th><th className="p-2">Not allowed for</th><th className="p-2">Offer qualification</th></tr></thead><tbody>
      {rows.map(row => <tr key={row.id} className="border-t border-amber-200 align-top dark:border-amber-900"><td className="p-2">{row.kind === 'REPORT' ? 'Survey / report' : 'Conditional work'}</td><td className="p-2 font-medium">{row.title}</td><td className="p-2">{row.qualification}</td></tr>)}
    </tbody></table></div>
  </details>;
}

export function SiteCostSummary({ option, infrastructureBase, plotWorksBase, onBaseChange }: {
  option: DevelopmentAppraisalOption; infrastructureBase: number; plotWorksBase: number; onBaseChange?: (amount: number) => void;
}) {
  const summary = siteCostSummary(option, line => calculateCostLineAmount(line, option));
  const bases = { INFRASTRUCTURE: infrastructureBase, PLOT_WORKS: plotWorksBase, SITE_SPECIFIC: 0, ABNORMALS: summary.abnormalBase };
  const baseTotal = Object.values(bases).reduce((sum, value) => sum + value, 0);
  return <section aria-label="Site costs summary" className="rounded border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
    <h3 className="font-semibold">Base allowances and additional elements</h3>
    <p className="my-2 text-sm">Base allowances stay separate. Additional elements are included once; land-offer disclosure does not add another deduction.</p>
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="text-left">Cost heading</th><th>Base allowance</th><th>Additional elements</th><th>Combined total</th></tr></thead><tbody>
      {(Object.keys(bases) as AppraisalSiteCostAllocation[]).map(key => <tr key={key}><th className="text-left">{SITE_COST_ALLOCATION_LABELS[key]}</th><td className="p-2 text-right">{key === 'ABNORMALS' && onBaseChange ? <input aria-label="Abnormals base allowance" type="number" min="0" step="0.01" key={bases[key]} defaultValue={bases[key]} className={field} onBlur={event => { const n = Number(event.target.value); if (Number.isFinite(n) && n >= 0) onBaseChange(n); }} /> : money(bases[key])}</td><td className="text-right">{money(summary.additions[key])}</td><td className="text-right">{money(bases[key] + summary.additions[key])}</td></tr>)}
      <tr className="font-semibold"><th className="text-left">Total</th><td className="text-right">{money(baseTotal)}</td><td className="text-right">{money(summary.additionsTotal)}</td><td className="text-right">{money(baseTotal + summary.additionsTotal)}</td></tr>
    </tbody></table></div>
    <p className="mt-3 text-sm">To be assessed: {summary.unresolvedCount}; unpriced: {summary.unpricedCount}; unresolved allowances included: {money(summary.unresolvedAllowance)}; cleared: {summary.clearedCount}.</p>
    <details className="mt-3"><summary className="cursor-pointer font-medium">Land-offer schedule ({summary.landOfferRows.length})</summary>
      <p className="my-2 text-sm">Disclosed subset already included in appraisal costs: {money(summary.landOfferTotal)}. Unpriced matters remain offer qualifications.</p>
      {summary.landOfferRows.map(({ line, metadata, amount }) => <div key={line.id} className="border-t py-2 text-sm"><strong>{line.title}</strong> — {SITE_COST_ALLOCATION_LABELS[metadata.allocation]} / {SITE_COST_STATUS_LABELS[metadata.status]} / {amount ? money(amount) : metadata.status === 'CLEARED' ? 'No cost' : 'Unpriced'}<p>{metadata.offerQualification || 'No qualification recorded.'}</p><p>{[line.notes, line.pricedItemsInformationNotes, line.nonPricedItemsInformationNotes, line.sourceLabel, ...(line.formalQuotations || []).map(q => q.fileName)].filter(Boolean).join(' | ')}</p></div>)}
    </details>
  </section>;
}

export function SiteCostElementControls({ line, onChange, baseAllowance = 0 }: { line: AppraisalCostLine; baseAllowance?: number; onChange: (patch: Partial<AppraisalCostLine>, reason?: string, reopenAmount?: number) => void }) {
  const metadata = siteCostMetadata(line);
  const [pendingStatus, setPendingStatus] = useState<AppraisalSiteCostStatus | null>(null);
  const [reason, setReason] = useState('');
  const [reopenAmount, setReopenAmount] = useState(String(line.amount || 0));
  const changeMetadata = (patch: Partial<typeof metadata>) => onChange({ siteCost: { ...metadata, ...patch } });
  return <div className="mb-3 border-b border-slate-200 pb-3 dark:border-slate-700">
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <label>Allocation <select aria-label={`Allocation for ${line.title}`} className={field} value={metadata.allocation} onChange={event => changeMetadata({ allocation: event.target.value as AppraisalSiteCostAllocation })}>{Object.entries(SITE_COST_ALLOCATION_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Status <select aria-label={`Status for ${line.title}`} className={field} value={metadata.status} onChange={event => { const status = event.target.value as AppraisalSiteCostStatus; if (status === 'CLEARED' || metadata.status === 'CLEARED') { setPendingStatus(status); setReason(''); setReopenAmount(String(line.amount || 0)); } else changeMetadata({ status }); }}>{Object.entries(SITE_COST_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label><input type="checkbox" checked={metadata.includeInLandOffer} onChange={event => changeMetadata({ includeInLandOffer: event.target.checked })} /> Include in land offer</label>
    </div>
    {pendingStatus && <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Confirm status change">
      {pendingStatus === 'CLEARED' ? <label>Clearance reason <input className={field} value={reason} onChange={event => setReason(event.target.value)} /></label> : <label>Confirm amount to reinstate <input className={field} type="number" min="0" step="0.01" value={reopenAmount} onChange={event => setReopenAmount(event.target.value)} /></label>}
      <button type="button" className={field} disabled={pendingStatus === 'CLEARED' ? !reason.trim() : !reopenAmount.trim() || !Number.isFinite(Number(reopenAmount)) || Number(reopenAmount) < 0} onClick={() => { onChange({ siteCost: { ...metadata, status: pendingStatus } }, reason, pendingStatus === 'CLEARED' ? undefined : Number(reopenAmount)); setPendingStatus(null); }}>Confirm</button>
      <button type="button" className={field} onClick={() => setPendingStatus(null)}>Cancel</button>
    </div>}
    {line.percentageBasis && line.percentageBasis !== 'NONE' && <p className="mt-2 text-sm">Calculated contribution uses the retained percentage rule: {line.percentageValue || 0}% of {line.percentageBasis.replaceAll('_', ' ').toLowerCase()}. The amount field retains the legacy fixed estimate.</p>}
    {baseAllowance > 0 && metadata.status !== 'CLEARED' && <p className="mt-2 text-sm text-amber-700">Review possible overlap with the {SITE_COST_ALLOCATION_LABELS[metadata.allocation].toLowerCase()} base allowance ({money(baseAllowance)}). This element is additional; any base adjustment must be made explicitly.</p>}
    {metadata.status === 'CLEARED' && <p className="mt-2 text-sm">Excluded from costs. Previous estimate retained: {money(line.amount)}. Reason: {metadata.clearanceReason}</p>}
    <details className="mt-2 text-sm"><summary className="cursor-pointer">Assessment and change history</summary>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label>Responsible person <input className={`${field} w-full`} defaultValue={metadata.responsiblePerson || ''} onBlur={event => changeMetadata({ responsiblePerson: event.target.value })} /></label>
        <label>Possible overlap with base scope <input className={`${field} w-full`} defaultValue={metadata.baseOverlapNote || ''} onBlur={event => changeMetadata({ baseOverlapNote: event.target.value })} /></label>
        <label className="sm:col-span-2">Land-offer qualification <textarea className={`${field} w-full`} defaultValue={metadata.offerQualification || ''} onBlur={event => changeMetadata({ offerQualification: event.target.value })} /></label>
      </div>
      {metadata.baseOverlapNote && <p className="mt-2 text-amber-700">Review base overlap: {metadata.baseOverlapNote}. No automatic base adjustment is made.</p>}
      <ol className="mt-2">{metadata.history.map((entry, i) => <li key={`${entry.at}-${i}`}><details><summary>{new Date(entry.at).toLocaleString()} — {entry.action}{entry.reason ? `: ${entry.reason}` : ''}</summary><pre className="overflow-auto whitespace-pre-wrap">Before: {entry.before}{'\n'}After: {entry.after}</pre></details></li>)}</ol>
    </details>
  </div>;
}
