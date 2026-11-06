import React from 'react';
import type { AppraisalSkipWasteAssumptions, DevelopmentAppraisalOption } from '../../types';
import { normalizeSkipWasteAssumptions, skipWasteReview } from '../../utils/appraisalSkipWaste';

const money = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(value);

export function PrelimsSkipWastePanel({ option, updateOption }: {
  option: DevelopmentAppraisalOption;
  updateOption: (id: string, recipe: (current: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const review = skipWasteReview(option);
  const set = <K extends keyof AppraisalSkipWasteAssumptions>(key: K, value: AppraisalSkipWasteAssumptions[K]) =>
    updateOption(option.id, current => ({ ...current, skipWasteAssumptions: { ...normalizeSkipWasteAssumptions(current.skipWasteAssumptions), [key]: value } }));
  const setAmount = (key: 'mixedRatePerLoad' | 'segregatedRatePerLoad' | 'segregationHandlingPerDwelling' | 'segregationSetupCost', raw: string) => {
    if (raw.trim() === '') return;
    const value = Number(raw);
    if (Number.isFinite(value) && value >= 0) set(key, value);
  };
  const setLoads = (houseTypeId: string, raw: string) => {
    const value = raw.trim() === '' ? undefined : Number(raw);
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) return;
    updateOption(option.id, current => ({
      ...current,
      houseTypeSchedule: current.houseTypeSchedule?.map(row => row.id === houseTypeId ? { ...row, skipLoadsPerDwelling: value } : row),
    }));
  };

  return <div data-smoke="appraisals-prelims-skip-waste" className="space-y-3 text-sm">
    <p className="text-slate-600 dark:text-slate-300">Count equivalent 8-yard loads collected, based on each house type’s GIFA and construction quantity. Default mixed-waste budget: £325 per load excluding VAT. This covers ordinary house-building waste, offcuts, packaging and final clearance; excavated soil, demolition, bulk groundwork and hazardous waste are separate. The Mini Skips line covers site-wide management waste and should be checked for overlap with this collection scope.</p>
    <label className="flex items-center gap-2"><input type="checkbox" checked={review.assumptions.centralCollection} onChange={event => set('centralCollection', event.target.checked)} />Provide central waste collection for the trades</label>
    {!review.assumptions.centralCollection && <p className="text-amber-700 dark:text-amber-300">The central Skips allowance is zero. Check that each trade package includes its own off-site waste disposal.</p>}
    <div className="overflow-x-auto rounded-app-sm border border-slate-200 dark:border-slate-700">
      <table className="min-w-[760px] w-full text-left text-xs">
        <thead className="bg-slate-100 dark:bg-surface-800"><tr><th className="px-2 py-2">House type</th><th className="px-2 py-2 text-right">GIFA m²</th><th className="px-2 py-2 text-right">Homes</th><th className="px-2 py-2 text-right">Calculated loads/home</th><th className="px-2 py-2">Override loads/home</th><th className="px-2 py-2 text-right">Equivalent loads</th><th className="px-2 py-2 text-right">Collection cost</th></tr></thead>
        <tbody>{review.houseTypes.map(row => <tr key={row.id} className="border-t border-slate-200 align-top dark:border-slate-700">
          <td className="px-2 py-2"><div>{row.name}</div>{row.reviewReason && !row.override && <div className="mt-1 text-amber-700 dark:text-amber-300">{row.reviewReason}</div>}</td>
          <td className="px-2 py-2 text-right">{row.areaM2 || '—'}{row.areaM2 > 0 && row.calculationAreaM2 !== row.areaM2 && <div className="text-[10px] text-slate-500">70 used for skips</div>}</td><td className="px-2 py-2 text-right">{row.dwellings}</td><td className="px-2 py-2 text-right">{row.calculatedLoadsPerDwelling}</td>
          <td className="px-2 py-2"><input aria-label={`Override skip loads per home for ${row.name}`} type="number" min="0" step="0.25" value={row.override ? row.loadsPerDwelling : ''} placeholder={String(row.calculatedLoadsPerDwelling)} onChange={event => setLoads(row.id, event.target.value)} className="w-28 rounded-app-sm border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-surface-950" /></td>
          <td className="px-2 py-2 text-right">{row.equivalentLoads}</td><td className="px-2 py-2 text-right">{money(review.assumptions.centralCollection ? row.equivalentLoads * review.ratePerLoad : 0)}</td>
        </tr>)}</tbody>
      </table>
      {review.houseTypes.length === 0 && <p className="p-3 text-slate-500">Add house types and their floor areas to calculate the Skips allowance.</p>}
    </div>
    <p className="text-xs text-slate-500">Default loads per home: up to 89 m² — 3; 90–129 m² — 4; 130–154 m² — 5; 155–180 m² — 6. Positive GIFA below 70 m² is treated as 70 m² for this calculation. Above 180 m² and missing GIFA are flagged for review. Enter zero where a type’s disposal is already fully included in trade prices. Convert larger containers to equivalent 8-yard loads before entering an override.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1">Mixed-waste rate per equivalent load (£)<input type="number" min="0" step="0.01" value={review.assumptions.mixedRatePerLoad} onChange={event => setAmount('mixedRatePerLoad', event.target.value)} className="rounded-app-sm border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-surface-950" /></label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={review.assumptions.segregatedCollection} onChange={event => set('segregatedCollection', event.target.checked)} />Use segregated collection budget instead</label>
    </div>
    {review.assumptions.segregatedCollection && <div className="grid gap-3 sm:grid-cols-3">
      <label className="grid gap-1">Blended collection rate/load (£)<input type="number" min="0" step="0.01" value={review.assumptions.segregatedRatePerLoad} onChange={event => setAmount('segregatedRatePerLoad', event.target.value)} className="rounded-app-sm border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-surface-950" /></label>
      <label className="grid gap-1">Handling per home (£)<input type="number" min="0" step="0.01" value={review.assumptions.segregationHandlingPerDwelling} onChange={event => setAmount('segregationHandlingPerDwelling', event.target.value)} className="rounded-app-sm border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-surface-950" /></label>
      <label className="grid gap-1">One-off setup (£)<input type="number" min="0" step="0.01" value={review.assumptions.segregationSetupCost} onChange={event => setAmount('segregationSetupCost', event.target.value)} className="rounded-app-sm border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-surface-950" /></label>
    </div>}
    <label className="grid gap-1">Supplier quotation and scope notes<textarea value={review.assumptions.notes || ''} onChange={event => set('notes', event.target.value)} rows={2} className="rounded-app-sm border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-surface-950" /></label>
    <p className="text-xs text-slate-500">The segregated rates (£275 per load, £50 handling per home and £500 setup) are illustrative only. Confirm delivery, exchanges, collection, disposal, included weight, rental period and separate plasterboard arrangements with the supplier before using this option.</p>
    <div className="rounded-app-sm bg-slate-50 p-3 dark:bg-surface-950">
      <div>{review.activeLoads} equivalent loads × {money(review.ratePerLoad)} = {money(review.loadCost)}.</div>
      {review.assumptions.segregatedCollection && review.assumptions.centralCollection && <div>Handling {money(review.handlingCost)} + setup {money(review.setupCost)}. Mixed-waste comparison: {money(review.mixedComparison)}.</div>}
      <div className="font-semibold">Central skip-waste total: {money(review.total)}.</div>
    </div>
  </div>;
}
