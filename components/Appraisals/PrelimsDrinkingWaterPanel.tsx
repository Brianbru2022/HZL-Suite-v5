import React from 'react';
import type { AppraisalDrinkingWaterAssumptions, DevelopmentAppraisalOption } from '../../types';
import { siteAccommodationWaterReview } from '../../utils/appraisal';
import { normalizeDrinkingWater } from '../../utils/appraisalDrinkingWater';

const currency = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(value);
const arrangements: Array<{ value: AppraisalDrinkingWaterAssumptions['connectionArrangement']; label: string }> = [
  { value: 'SITE_BRANCH', label: 'Branch from approved site potable supply' },
  { value: 'PUBLIC_MAIN', label: 'Separate connection from public main' },
  { value: 'COMPLEX_CONNECTION', label: 'Long run or road crossing' },
  { value: 'NO_MAINS', label: 'No potable mains connection available' },
];

export function PrelimsDrinkingWaterPanel({ option, updateOption }: {
  option: DevelopmentAppraisalOption;
  updateOption: (id: string, recipe: (current: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const settings = normalizeDrinkingWater(option.drinkingWater);
  const review = siteAccommodationWaterReview(option);
  const set = (patch: Partial<AppraisalDrinkingWaterAssumptions>) => updateOption(option.id, current => ({
    ...current, drinkingWater: { ...normalizeDrinkingWater(current.drinkingWater), ...patch },
  }));
  const numeric: Array<{ key: Exclude<keyof AppraisalDrinkingWaterAssumptions, 'bottledMonthlyOverride' | 'connectionArrangement'>; label: string }> = [
    { key: 'averagePeople', label: 'Average people using cabins' },
    { key: 'mainsAvailableMonth', label: 'Potable mains commissioned in month' },
    { key: 'siteBranchCost', label: 'Site branch connection (£)' },
    { key: 'publicMainCost', label: 'Separate public-main connection (£)' },
    { key: 'complexConnectionCost', label: 'Long run / road crossing connection (£)' },
    { key: 'mainsMonthlyCost', label: 'Mains standing and usage budget (£/month)' },
  ];
  return <div data-smoke="appraisals-prelims-drinking-water" className="space-y-3 text-sm">
    <p className="text-slate-600 dark:text-slate-300">The default is three people in the cabins, giving £100/month for bottled drinking water and dispenser hire. Current bottled budget: {currency(review.bottleRate)}/month. Select the potable connection actually feasible for this site. The appraisal uses whichever feasible route has the lower total cost over the site programme.</p>
    <label className="grid max-w-xl gap-1">Potable water connection arrangement
      <select value={settings.connectionArrangement} onChange={event => set({ connectionArrangement: event.target.value as AppraisalDrinkingWaterAssumptions['connectionArrangement'] })} className="rounded-app-sm border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-surface-950">{arrangements.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
    </label>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{numeric.map(({ key, label }) => <label key={key} className="grid gap-1">{label}
      <input type="number" min="0" step={key === 'averagePeople' ? '1' : key === 'mainsAvailableMonth' ? '0.5' : '0.01'} value={settings[key]} onChange={event => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= 0) set({ [key]: value }); }} className="rounded-app-sm border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-surface-950" />
    </label>)}</div>
    <label className="grid max-w-xs gap-1">Quoted bottled-water allowance (£/month; blank uses occupancy calculation)
      <input type="number" min="0" step="0.01" value={settings.bottledMonthlyOverride ?? ''} onChange={event => { const raw = event.target.value; if (raw === '') set({ bottledMonthlyOverride: undefined }); else { const value = Number(raw); if (Number.isFinite(value) && value >= 0) set({ bottledMonthlyOverride: value }); } }} placeholder={String(review.bottleRate)} className="rounded-app-sm border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-surface-950" />
    </label>
    <p className="text-slate-500">Bottled budget: 2 litres × 22 working days per person, 18.9-litre bottles at £9 plus £25 monthly dispenser hire, rounded up in £50 increments. Mains standing/usage is a provisional site-accommodation budget and is separate from the development building-water charge; replace it with the actual supply quotation.</p>
    <div className="grid gap-1 rounded-app-sm bg-slate-50 p-3 dark:bg-surface-950">
      <div>All programme on bottles: {currency(review.bottleOnlyCost)}.</div>
      <div>Bottles until mains + connection + ongoing mains: {review.mainsOptionCost === null ? 'Unavailable' : currency(review.mainsOptionCost)}.</div>
      <div className="font-semibold text-emerald-700 dark:text-emerald-400">Selected: {review.method === 'BOTTLED_THEN_MAINS' ? 'bottles then potable mains' : 'bottles for the programme'} — {currency(review.total)}.</div>
      <div className="text-slate-500">Bill split: bottles {currency(review.bottledCost)}, connection {currency(review.connectionCost)}, ongoing mains {currency(review.mainsServiceCost)}.</div>
    </div>
  </div>;
}
