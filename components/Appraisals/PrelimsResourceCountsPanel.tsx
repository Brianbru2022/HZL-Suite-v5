import React from 'react';
import type { AppraisalPrelimsResourceCounts, DevelopmentAppraisalOption } from '../../types';
import { PRELIMS_RESOURCE_MONTHLY_RATES, prelimsResourceCount, prelimsResourceMonths } from '../../utils/appraisal';

const resources: Array<{ key: keyof AppraisalPrelimsResourceCounts; label: string }> = [
  { key: 'siteManagers', label: 'Site managers' },
  { key: 'assistantSiteManagers', label: 'Assistant site managers' },
  { key: 'forkliftDrivers', label: 'Forklift drivers' },
  { key: 'labourers', label: 'Labourers' },
  { key: 'forklifts', label: 'Forklifts' },
];

const pounds = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(value);

export function PrelimsResourceCountsPanel({ option, updateOption }: {
  option: DevelopmentAppraisalOption;
  updateOption: (id: string, recipe: (current: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const setCount = (key: keyof AppraisalPrelimsResourceCounts, raw: string) => updateOption(option.id, current => {
    const counts = { ...current.prelimsResourceCounts };
    if (raw === '') delete counts[key];
    else {
      const parsed = Number(raw);
      if (!Number.isInteger(parsed) || parsed < 0) return current;
      counts[key] = parsed;
    }
    return { ...current, prelimsResourceCounts: counts };
  });

  return <section data-smoke="appraisals-prelims-resources" className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
    <h3 className="font-semibold text-slate-900 dark:text-white">Site staffing and forklifts</h3>
    <p className="mt-1 text-sm text-slate-500">Choose a quantity for each Prelims allowance. Clear a quantity to return to its automatic build-rate assumption. Zero excludes that allowance.</p>
    <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
      {resources.map(({ key, label }) => {
        const count = prelimsResourceCount(option, key);
        const months = prelimsResourceMonths(option, key);
        const rate = PRELIMS_RESOURCE_MONTHLY_RATES[key];
        const selected = option.prelimsResourceCounts?.[key];
        return <details key={key} data-smoke={`appraisals-prelims-resource-${key}`} className="group py-2">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 font-medium marker:hidden">
            <span><span aria-hidden="true" className="mr-2 inline-block transition group-open:rotate-90">▸</span>{label}</span>
            <span className="text-sm tabular-nums">{count} × {months} months × {pounds(rate)} = {pounds(count * months * rate)}</span>
          </summary>
          <div className="ml-5 mt-3 flex flex-wrap items-end gap-4 text-sm">
            <label className="grid gap-1">Number of {label.toLowerCase()}
              <input type="number" min="0" step="1" inputMode="numeric" aria-label={`Number of ${label.toLowerCase()}`} value={selected ?? ''} placeholder={`Automatic: ${count}`} onChange={event => setCount(key, event.target.value)} className="w-36 rounded-app-sm border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-surface-950" />
            </label>
            <p className="pb-2 text-slate-500">{key === 'forklifts' || key === 'forkliftDrivers' ? 'Costed after the programme lead-in.' : 'Costed for the full programme.'} {selected === undefined ? 'Automatic count.' : 'Selected count.'}</p>
          </div>
        </details>;
      })}
    </div>
  </section>;
}
