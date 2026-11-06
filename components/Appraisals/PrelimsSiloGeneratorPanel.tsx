import React from 'react';
import type { AppraisalSiloGeneratorAssumptions, DevelopmentAppraisalOption } from '../../types';
import { siloGeneratorReview } from '../../utils/appraisal';
import { normalizeSiloGeneratorAssumptions } from '../../utils/appraisalSiloGenerator';
import { normalizeTemporaryPower } from '../../utils/appraisalTemporaryPower';

const money = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(value);

export function PrelimsSiloGeneratorPanel({ option, updateOption }: {
  option: DevelopmentAppraisalOption;
  updateOption: (id: string, recipe: (current: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const review = siloGeneratorReview(option);
  const a = review.assumptions;
  const siteOfficePower = normalizeTemporaryPower(option.temporaryPower);
  const suggestedMainsMonth = siteOfficePower.mainsAvailable ? siteOfficePower.mainsAvailableMonth : undefined;
  const set = (key: keyof AppraisalSiloGeneratorAssumptions, raw: string) => {
    const optional = key === 'constructionMonths' || key === 'activeMortarMonths' || key === 'suitableMainsFromSiteMonth';
    const value = optional && raw === '' ? undefined : Number(raw);
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) return;
    updateOption(option.id, current => ({
      ...current,
      siloGeneratorAssumptions: normalizeSiloGeneratorAssumptions({
        ...normalizeSiloGeneratorAssumptions(current.siloGeneratorAssumptions), [key]: value,
      }),
    }));
  };
  const inputClass = 'rounded-app-sm border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-surface-950';
  const reset = (key: 'constructionMonths' | 'activeMortarMonths' | 'suitableMainsFromSiteMonth') => set(key, '');
  return <div data-smoke="appraisals-prelims-silo-generator" className="space-y-3 text-sm">
    <p className="text-slate-600 dark:text-slate-300">The construction period follows the dwelling count and build rate, excluding lead-in. The generator is provisionally required for 75% of that period. Enter actual mortar-working months or the month a suitable dedicated mains supply becomes available when known. Fuel is costed separately.</p>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="grid gap-1">
        <label className="grid gap-1">Construction months (optional override)
          <input type="number" min="0" step="0.1" value={a.constructionMonths ?? review.constructionMonths} onChange={event => set('constructionMonths', event.target.value)} className={inputClass} />
        </label>
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500"><span>{a.constructionMonths === undefined ? 'Calculated from house types, build rate and programme.' : 'Manual override.'}</span>{a.constructionMonths !== undefined && <button type="button" onClick={() => reset('constructionMonths')} className="underline">Use appraisal value</button>}</div>
      </div>
      <div className="grid gap-1">
        <label className="grid gap-1">Mortar-working months (optional override)
          <input type="number" min="0" step="0.1" value={a.activeMortarMonths ?? review.provisionalMortarMonths} onChange={event => set('activeMortarMonths', event.target.value)} className={inputClass} />
        </label>
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500"><span>{a.activeMortarMonths === undefined ? `${a.activePercent}% of construction months.` : 'Manual override.'}</span>{a.activeMortarMonths !== undefined && <button type="button" onClick={() => reset('activeMortarMonths')} className="underline">Use appraisal value</button>}</div>
      </div>
      <div className="grid gap-1">
        <label className="grid gap-1">Suitable mains from site month (optional)
          <input type="number" min="0" step="0.1" value={a.suitableMainsFromSiteMonth ?? suggestedMainsMonth ?? ''} onChange={event => set('suitableMainsFromSiteMonth', event.target.value)} className={inputClass} />
        </label>
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
          <span>{a.suitableMainsFromSiteMonth !== undefined ? 'Confirmed suitable for the silo; generator stops at this month.' : suggestedMainsMonth === undefined ? 'No site-office mains target is available.' : 'Site-office target only; generator continues until silo supply is confirmed.'}</span>
          {a.suitableMainsFromSiteMonth !== undefined ? <button type="button" onClick={() => reset('suitableMainsFromSiteMonth')} className="underline">Remove confirmation</button> : suggestedMainsMonth !== undefined && <button type="button" onClick={() => set('suitableMainsFromSiteMonth', String(suggestedMainsMonth))} className="underline">Confirm suitable supply</button>}
        </div>
      </div>
      <label className="grid gap-1">Provisional active period (%)
        <input type="number" min="0" max="100" step="1" value={a.activePercent} onChange={event => set('activePercent', event.target.value)} className={inputClass} />
      </label>
      <label className="grid gap-1">Purchase ready for site (£)
        <input type="number" min="0" step="1" value={a.readyToUsePurchaseCost} onChange={event => set('readyToUsePurchaseCost', event.target.value)} className={inputClass} />
      </label>
      <label className="grid gap-1">Residual/reuse value (£)
        <input type="number" min="0" step="1" value={a.residualValue} onChange={event => set('residualValue', event.target.value)} className={inputClass} />
      </label>
      <label className="grid gap-1">Productive reuse months across sites
        <input type="number" min="1" step="1" value={a.productiveReuseMonths ?? 24} onChange={event => set('productiveReuseMonths', event.target.value)} className={inputClass} />
      </label>
      <label className="grid gap-1">Other ownership cost per active month (£)
        <input type="number" min="0" step="0.01" value={Number(a.ownershipMonthlyOtherCost.toFixed(2))} onChange={event => set('ownershipMonthlyOtherCost', event.target.value)} className={inputClass} />
      </label>
      <label className="grid gap-1">Hire per active month (£)
        <input type="number" min="0" step="1" value={a.hirePerActiveMonth} onChange={event => set('hirePerActiveMonth', event.target.value)} className={inputClass} />
      </label>
    </div>
    <div className="rounded-app-sm bg-slate-50 p-3 dark:bg-surface-950">
      <div>{review.dwellings} dwellings; {review.buildRate || 'no'} units/month build-rate proxy; {review.constructionMonths} construction months after lead-in; {review.activeGeneratorMonths} active generator months.</div>
      <div>Purchase/reuse ownership {money(review.purchaseCost)} versus hire {money(review.hireCost)}.</div>
      <div className="font-semibold">{review.route === 'NONE' ? 'No silo-generator period assessed.' : `${review.route === 'PURCHASE' ? 'Purchase/reuse' : 'Hire'} selected: ${money(review.selectedCost)} plus ${money(review.fuelCost)} silo diesel.`}</div>
    </div>
    <p className="text-slate-500">{review.legacyPurchaseCostBasis ? 'This frozen version retains its original one-site purchase calculation. ' : 'Purchase/reuse shares the net £5,000 capital cost across 24 productive months and adds £325 per active month for servicing, repairs, insurance and movements. At 75% active use this gives £400 per construction month. '}Hire is a £1,200-per-active-month comparison and is allowed only when it costs less. Diesel is separate. Confirm at least 15 kVA per silo and the required dedicated supply with the mortar supplier.</p>
  </div>;
}
