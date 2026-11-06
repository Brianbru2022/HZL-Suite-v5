import React from 'react';
import type { AppraisalFuelAssumptions, DevelopmentAppraisalOption } from '../../types';
import { prelimsResourceCount, prelimsResourceMonths, siloGeneratorReview, temporaryPowerReview } from '../../utils/appraisal';
import { normalizeFuelAssumptions } from '../../utils/appraisalFuel';

const money = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(value);

export function PrelimsFuelPanel({ option, updateOption }: {
  option: DevelopmentAppraisalOption;
  updateOption: (id: string, recipe: (current: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const settings = normalizeFuelAssumptions(option.fuelAssumptions);
  const power = temporaryPowerReview(option);
  const silo = siloGeneratorReview(option);
  const forklifts = prelimsResourceCount(option, 'forklifts');
  const forkliftMonths = prelimsResourceMonths(option, 'forklifts');
  const set = (key: keyof AppraisalFuelAssumptions, raw: string) => {
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) return;
    updateOption(option.id, current => ({ ...current, fuelAssumptions: { ...normalizeFuelAssumptions(current.fuelAssumptions), [key]: value } }));
  };
  return <div data-smoke="appraisals-prelims-fuel" className="space-y-3 text-sm">
    <p className="text-slate-600 dark:text-slate-300">Diesel fuel only, excluding VAT. Telehandler fuel follows the active forklifts, cabin-generator fuel follows the temporary-power choice, and silo-generator fuel follows the selected mortar-working period. Each is a separate allowance.</p>
    <div className="grid gap-4 sm:grid-cols-3">
      <label className="grid gap-1">Telehandler fuel per machine-month (£)
        <input type="number" min="0" step="0.01" value={settings.telehandlerMonthly} onChange={event => set('telehandlerMonthly', event.target.value)} className="rounded-app-sm border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-surface-950" />
      </label>
      <label className="grid gap-1">Cabin-generator fuel per diesel month (£)
        <input type="number" min="0" step="0.01" value={settings.accommodationGeneratorMonthly} onChange={event => set('accommodationGeneratorMonthly', event.target.value)} className="rounded-app-sm border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-surface-950" />
      </label>
      <label className="grid gap-1">Silo-generator fuel per active month (£)
        <input type="number" min="0" step="0.01" value={settings.siloGeneratorMonthly} onChange={event => set('siloGeneratorMonthly', event.target.value)} className="rounded-app-sm border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-surface-950" />
      </label>
    </div>
    <p className="text-slate-500">Basis: one telehandler at 3.5 running hours/day × 22 days × 4.6 litres/hour ≈ 354 litres/month; one cabin generator at 10 hours/day × 22 days × 2.2 litres/hour = 484 litres/month; one silo generator provisionally at 4 hours/day × 22 days × 2.2 litres/hour ≈ 194 litres/month. At £1.70/litre ex VAT, rounded monthly allowances are £600, £850 and £330 respectively. Adjust for actual usage and fuel quotes.</p>
    <div className="rounded-app-sm bg-slate-50 p-3 dark:bg-surface-950">
      <div>Telehandlers: {forklifts} × {forkliftMonths} active months × {money(settings.telehandlerMonthly)} = {money(forklifts * forkliftMonths * settings.telehandlerMonthly)}.</div>
      <div>Cabin generator: {power.dieselMonths} diesel months × {money(settings.accommodationGeneratorMonthly)} = {money(power.generatorFuel)}.</div>
      <div>Silo generator: {silo.activeGeneratorMonths} active months × {money(settings.siloGeneratorMonthly)} = {money(silo.fuelCost)}.</div>
      <div className="font-semibold">Fuel total: {money(forklifts * forkliftMonths * settings.telehandlerMonthly + power.generatorFuel + silo.fuelCost)}.</div>
    </div>
  </div>;
}
