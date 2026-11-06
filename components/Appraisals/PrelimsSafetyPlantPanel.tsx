import React from 'react';
import type { AppraisalSafetyPlantAssumptions, DevelopmentAppraisalOption } from '../../types';
import { normalizeSafetyPlantAssumptions, safetyPlantReview } from '../../utils/appraisal';

const money = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(value);

export function PrelimsSafetyPlantPanel({ option, updateOption }: {
  option: DevelopmentAppraisalOption;
  updateOption: (id: string, recipe: (current: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const review = safetyPlantReview(option);
  const set = <K extends keyof AppraisalSafetyPlantAssumptions>(key: K, value: AppraisalSafetyPlantAssumptions[K]) =>
    updateOption(option.id, current => ({ ...current, safetyPlantAssumptions: { ...normalizeSafetyPlantAssumptions(current.safetyPlantAssumptions), [key]: value } }));
  const setNumber = (key: 'inspectionVisitsPerMonth' | 'inspectionRatePerVisit', raw: string) => {
    const value = Number(raw);
    if (raw.trim() !== '' && Number.isFinite(value) && value >= 0) set(key, value);
  };

  return <div data-smoke="appraisals-prelims-safety-plant" className="space-y-3 text-sm">
    <p className="text-slate-600 dark:text-slate-300">Allow £200 per programme month for H&S consumables and £150 per programme month for minor shared plant, excluding VAT. Management salaries and adviser fees are costed elsewhere; regular identifiable hires and major site-wide protection need separate allowances.</p>
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={review.assumptions.externalInspectionsRequired} onChange={event => set('externalInspectionsRequired', event.target.checked)} />
      Include external H&S inspection visits
    </label>
    {review.assumptions.externalInspectionsRequired && <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1">Inspection visits per programme month
        <input type="number" min="0" step="0.25" value={review.assumptions.inspectionVisitsPerMonth} onChange={event => setNumber('inspectionVisitsPerMonth', event.target.value)} className="rounded-app-sm border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-surface-950" />
      </label>
      <label className="grid gap-1">Allowance per visit (£)
        <input type="number" min="0" step="0.01" value={review.assumptions.inspectionRatePerVisit} onChange={event => setNumber('inspectionRatePerVisit', event.target.value)} className="rounded-app-sm border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-surface-950" />
      </label>
    </div>}
    <p className="text-slate-500">The external visit allowance defaults to £250 per visit, within the £200–£300 budget range. Confirm scope and fee against a site-specific quotation.</p>
    <div className="rounded-app-sm bg-slate-50 p-3 dark:bg-surface-950">
      <div>Health and Safety: {review.months} months × £200 = {money(review.healthAndSafety)}.</div>
      <div>Small Plant: {review.months} months × £150 = {money(review.smallPlant)}.</div>
      {review.assumptions.externalInspectionsRequired && <div>External inspections: {review.inspectionVisits} visits × {money(review.assumptions.inspectionRatePerVisit)} = {money(review.inspections)}.</div>}
      <div className="font-semibold">Combined allowance: {money(review.healthAndSafety + review.smallPlant + review.inspections)}.</div>
    </div>
  </div>;
}
