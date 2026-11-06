import React from 'react';
import { Plus } from 'lucide-react';
import type { AppraisalSurveyReportItemChoice, DevelopmentAppraisalOption } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { calculateSiteDimensionBaseTotal, surveyReportsReview, syncSurveyReportBillRows } from '../../utils/appraisal';
import { buildAppraisalPricingReportFromFile } from '../../utils/appraisalEvidenceExtraction';
import { downloadAppraisalEvidenceAttachment } from '../../utils/appraisalExport';
import { NotAllowedSurveyAbnormals } from './SiteCostRegister';

const money = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(value);
const categoryOrder = ['Land and existing assets', 'Ground and contamination', 'Water and drainage', 'Trees and ecology', 'Planning and environment', 'Other'];

export function SurveyReportsPanel({ option, updateOption }: {
  option: DevelopmentAppraisalOption;
  updateOption: (id: string, recipe: (current: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const { showToast } = useToast();
  const review = surveyReportsReview(option);
  const [openCategories, setOpenCategories] = React.useState<Record<string, boolean>>({ 'Land and existing assets': true });
  const [customName, setCustomName] = React.useState('');
  const [customBase, setCustomBase] = React.useState('');
  const [customRate, setCustomRate] = React.useState('');
  const [customCategory, setCustomCategory] = React.useState('Other');
  const categories = [...new Set([...categoryOrder, ...review.rows.map(row => row.category)])].filter(category => review.rows.some(row => row.category === category));
  const updateChoice = (id: string, patch: Partial<AppraisalSurveyReportItemChoice>) => updateOption(option.id, current => {
    const assumptions = current.surveyReports || {};
    const custom = assumptions.custom?.find(row => row.id === id);
    const updated = custom
      ? { ...current, surveyReports: { ...assumptions, custom: (assumptions.custom || []).map(row => row.id === id ? { ...row, ...patch } : row) } }
      : { ...current, surveyReports: { ...assumptions, items: { ...assumptions.items, [id]: { ...assumptions.items?.[id], ...patch } } } };
    return syncSurveyReportBillRows(updated);
  });
  const setIncluded = (ids: string[], included: boolean) => updateOption(option.id, current => {
    const assumptions = current.surveyReports || {};
    const customIds = new Set((assumptions.custom || []).map(row => row.id));
    const items = { ...assumptions.items };
    ids.filter(id => !customIds.has(id)).forEach(id => { items[id] = { ...items[id], included }; });
    const custom = (assumptions.custom || []).map(row => ids.includes(row.id) ? { ...row, included } : row);
    return syncSurveyReportBillRows({ ...current, surveyReports: { ...assumptions, items, custom } });
  });
  const addCustom = () => {
    const label = customName.trim();
    const baseFee = Number(customBase || 0);
    const ratePerM2 = Number(customRate || 0);
    if (!label || !Number.isFinite(baseFee) || baseFee < 0 || !Number.isFinite(ratePerM2) || ratePerM2 < 0) return;
    updateOption(option.id, current => syncSurveyReportBillRows({ ...current, surveyReports: { ...current.surveyReports,
      custom: [...(current.surveyReports?.custom || []), { id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, label, category: customCategory, baseFee, ratePerM2, included: true }],
    } }));
    setCustomName(''); setCustomBase(''); setCustomRate('');
  };
  const uploadQuote = async (id: string, file?: File) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      showToast({ type: 'error', message: 'Quote is too large. Upload a file under 50 MB.' });
      return;
    }
    try {
      const quote = await buildAppraisalPricingReportFromFile(file);
      updateChoice(id, { quote, manualFee: undefined });
      showToast({ type: 'success', message: `${file.name} saved. Enter its quoted amount to replace the budget.` });
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Could not save the quote.' });
    }
  };
  const downloadQuote = async (quote: NonNullable<AppraisalSurveyReportItemChoice['quote']>) => {
    try { await downloadAppraisalEvidenceAttachment(quote); }
    catch (error) { showToast({ type: 'error', message: error instanceof Error ? error.message : 'Could not download the quote.' }); }
  };
  const isApplied = Boolean(option.surveyReports?.confirmedAt);
  const existingRow = option.siteDimensions?.find(row => row.libraryRateId === 'awd-prelims-site-investigations');
  const oldAllowance = existingRow && !isApplied ? calculateSiteDimensionBaseTotal(existingRow, option) : 0;

  return <section data-smoke="appraisals-surveys-reports" className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-white">Surveys and reports</h3>
        <p className="mt-1 max-w-4xl text-sm text-slate-600 dark:text-slate-300">Site-area budget allowances for possible investigations and planning reports. All are included in the draft schedule until you exclude them. Upload a quote and enter its value to replace an allowance; without both, the budget applies. Excluding a report creates two unpriced land-offer qualifications: the report and any conditional work arising from it.</p>
      </div>
      <div className="text-right text-sm tabular-nums"><div className="font-semibold">{money(review.total)}</div><div className="text-slate-500">{review.includedCount} included · {review.excludedCount} excluded</div></div>
    </div>
    <p className="mt-3 text-xs text-slate-500">Budget basis: 2026 UK guide prices, excluding VAT; each allowance = fixed minimum + gross site area × £/m². Site area: {review.siteAreaM2.toLocaleString('en-GB')} m². Area is a proxy for work scope, especially for ecology, existing buildings and specialist studies. Obtain site-specific quotations before issue.</p>
    {review.siteAreaM2 <= 0 && <p className="mt-2 text-sm font-medium text-amber-700">Enter gross site area in Base measures before applying this schedule.</p>}
    {review.unverifiedCount > 0 && <p className="mt-2 text-xs text-amber-700">{review.unverifiedCount} included allowances use a broad proxy because the true driver is features, sampling points, visits or survey season. Replace these with quotes when available.</p>}
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => setIncluded(review.rows.map(row => row.id), true)} className="rounded-app-sm border border-slate-300 px-3 py-1.5 text-xs font-medium dark:border-slate-700">Include all</button>
      <button type="button" onClick={() => setIncluded(review.rows.map(row => row.id), false)} className="rounded-app-sm border border-slate-300 px-3 py-1.5 text-xs font-medium dark:border-slate-700">Exclude all</button>
      <span className="ml-auto text-xs text-slate-500">{isApplied ? 'Included reports appear individually in the fixed Prelims bill' : existingRow ? `Prior survey allowance remains until this schedule is applied${oldAllowance > 0 ? ` (${money(oldAllowance)})` : ''}` : 'Apply this schedule to populate the fixed Prelims bill'}</span>
      <button type="button" disabled={review.siteAreaM2 <= 0} data-smoke="appraisals-surveys-apply" onClick={() => updateOption(option.id, current => syncSurveyReportBillRows({
        ...current,
        surveyReports: { ...current.surveyReports, confirmedAt: current.surveyReports?.confirmedAt || new Date().toISOString() },
      }))} className="rounded-app-sm bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{isApplied ? 'Refresh Prelims bill' : 'Apply survey schedule to Prelims'}</button>
    </div>
    {isApplied && <p className="mt-2 text-xs text-slate-500">Each included report has its own Prelims line. Excluded reports appear only in the land-offer exclusions. Any adjustment from the previous allowance remains separately visible for review.</p>}
    <div className="mt-4 space-y-2">
      {categories.map(category => {
        const rows = review.rows.filter(row => row.category === category);
        const open = Boolean(openCategories[category]);
        return <section key={category} className="rounded-app-sm border border-slate-200 dark:border-slate-700" data-smoke={`appraisals-surveys-category-${category.toLowerCase().replace(/[^a-z]+/g, '-')}`}>
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 px-3 py-2 dark:bg-surface-950">
            <button type="button" aria-expanded={open} onClick={() => setOpenCategories(current => ({ ...current, [category]: !current[category] }))} className="flex flex-1 items-center gap-2 text-left text-sm font-semibold"><span aria-hidden="true">{open ? '▾' : '▸'}</span>{category} <span className="font-normal text-slate-500">({rows.length})</span></button>
            <span className="text-sm font-semibold tabular-nums">{money(rows.reduce((sum, row) => sum + row.amount, 0))}</span>
            <button type="button" onClick={() => setIncluded(rows.map(row => row.id), false)} className="ml-2 text-xs text-slate-600 underline dark:text-slate-300">Exclude group</button>
          </div>
          {open && <div className="divide-y divide-slate-200 dark:divide-slate-800">{rows.map(row => <div key={row.id} data-smoke={`appraisals-survey-${row.id}`} className={`p-3 text-sm ${row.included ? '' : 'opacity-65'}`}>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex min-w-56 flex-1 items-center gap-2 font-medium"><input type="checkbox" checked={row.included} onChange={event => updateChoice(row.id, { included: event.target.checked })} aria-label={`Include ${row.label}`} />{row.label}</label>
              {row.possibleAbnormal && <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">Possible abnormal</span>}
              <label className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-app-sm border border-slate-300 text-emerald-700 hover:bg-emerald-50 dark:border-slate-700" title={`Add quote for ${row.label}`} aria-label={`Add quote for ${row.label}`}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg" className="sr-only" aria-label={`Upload quote for ${row.label}`} data-smoke={`appraisals-survey-quote-upload-${row.id}`} onChange={event => { void uploadQuote(row.id, event.target.files?.[0]); event.target.value = ''; }} />
              </label>
              <span className="w-28 text-right tabular-nums font-semibold">{money(row.amount)}</span>
            </div>
            {row.quote && <div className="ml-5 mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span>Quote: {row.quote.fileName}</span>
              <button type="button" onClick={() => void downloadQuote(row.quote!)} className="text-emerald-700 underline">Download</button>
              <button type="button" onClick={() => updateChoice(row.id, { quote: undefined, manualFee: undefined })} className="text-rose-700 underline" aria-label={`Remove quote for ${row.label}`}>Remove quote</button>
              <label className="inline-flex items-center gap-1">Quoted value (£, ex VAT)
                <input type="number" min="0" step="0.01" value={row.manualFee ?? ''} placeholder="Enter value" onChange={event => updateChoice(row.id, { manualFee: event.target.value === '' ? undefined : Math.max(0, Number(event.target.value)) })} aria-label={`Quoted value for ${row.label}`} className="w-28 rounded-app-sm border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-surface-950" />
              </label>
              <span>{row.amountBasis === 'QUOTE' ? 'Quoted value used' : 'Budget used until quoted value is entered'}</span>
            </div>}
            {!row.quote && row.manualFee !== undefined && <p className="ml-5 mt-1 text-xs text-amber-700">Previous manual value {money(row.manualFee)} is not used without a saved quote; the budget applies.</p>}
            <details className="ml-5 mt-1 text-xs text-slate-600 dark:text-slate-300">
              <summary className="cursor-pointer">Scope, pricing and evidence</summary>
              <p className="mt-2">{row.scope} Applicable when: {row.trigger}</p>
              <p className="mt-1">Budget: {money(row.baseFee)} + {review.siteAreaM2.toLocaleString('en-GB')} m² × {money(row.ratePerM2)}/m² = {money(row.budget)}.{row.proxy ? ' Area is a rough proxy; verify the actual survey scope.' : ''}</p>
              {row.sourceUrl ? <p className="mt-1">Evidence: <a href={row.sourceUrl} target="_blank" rel="noreferrer" className="text-emerald-700 underline">{row.sourceLabel}</a>. The formula is an appraisal allowance, not a quoted tariff.</p> : <p className="mt-1">User-entered allowance.</p>}
              <div className="mt-2 flex flex-wrap gap-3">
                {!row.quote && <span className="self-end text-xs text-slate-500">Upload a quote with + to enter a quoted value.</span>}
                <label className="grid min-w-56 flex-1 gap-1">Scope or quote note
                  <input value={row.note} onChange={event => updateChoice(row.id, { note: event.target.value })} aria-label={`Note for ${row.label}`} className="rounded-app-sm border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-surface-950" />
                </label>
                {row.custom && <button type="button" onClick={() => updateOption(option.id, current => syncSurveyReportBillRows({ ...current, surveyReports: { ...current.surveyReports, custom: current.surveyReports?.custom?.filter(item => item.id !== row.id) } }))} className="self-end text-xs text-rose-700 underline">Remove custom item</button>}
              </div>
            </details>
          </div>)}</div>}
        </section>;
      })}
    </div>
    <div className="mt-4"><NotAllowedSurveyAbnormals option={option} includeDraft /></div>
    <details className="mt-4 rounded-app-sm border border-dashed border-slate-300 p-3 dark:border-slate-700">
      <summary className="cursor-pointer text-sm font-medium">Add another survey or report</summary>
      <div className="mt-3 flex flex-wrap items-end gap-2 text-sm">
        <label className="grid gap-1">Description<input value={customName} onChange={event => setCustomName(event.target.value)} aria-label="Custom survey description" className="rounded-app-sm border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-surface-950" /></label>
        <label className="grid gap-1">Category<select value={customCategory} onChange={event => setCustomCategory(event.target.value)} aria-label="Custom survey category" className="rounded-app-sm border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-surface-950">{categoryOrder.map(category => <option key={category}>{category}</option>)}</select></label>
        <label className="grid gap-1">Fixed fee (£)<input type="number" min="0" step="0.01" value={customBase} onChange={event => setCustomBase(event.target.value)} aria-label="Custom survey fixed fee" className="w-28 rounded-app-sm border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-surface-950" /></label>
        <label className="grid gap-1">Rate (£/m²)<input type="number" min="0" step="0.01" value={customRate} onChange={event => setCustomRate(event.target.value)} aria-label="Custom survey rate per square metre" className="w-28 rounded-app-sm border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-surface-950" /></label>
        <button type="button" onClick={addCustom} disabled={!customName.trim()} className="rounded-app-sm bg-emerald-700 px-3 py-1.5 font-semibold text-white disabled:opacity-50">Add</button>
      </div>
    </details>
  </section>;
}
