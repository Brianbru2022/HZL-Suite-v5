import React from 'react';
import type { AppraisalHerasFencingAssumptions, DevelopmentAppraisalOption } from '../../types';
import { herasFencingReview } from '../../utils/appraisal';
import { normalizeHerasFencingAssumptions } from '../../utils/appraisalHerasFencing';

const money = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(value);
const number = (value: number) => new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format(value);

export function PrelimsHerasFencingPanel({ option, updateOption }: {
  option: DevelopmentAppraisalOption;
  updateOption: (id: string, recipe: (current: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const assumptions = normalizeHerasFencingAssumptions(option.herasFencingAssumptions);
  const review = herasFencingReview(option);
  const set = (key: keyof AppraisalHerasFencingAssumptions, raw: string) => {
    const value = raw === '' && key === 'measuredPerimeterM' ? undefined : Number(raw);
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) return;
    updateOption(option.id, current => ({
      ...current,
      herasFencingAssumptions: normalizeHerasFencingAssumptions({
        ...normalizeHerasFencingAssumptions(current.herasFencingAssumptions),
        [key]: value,
      }),
    }));
  };
  const input = 'rounded-app-sm border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-surface-950';
  return <div data-smoke="appraisals-prelims-heras-fencing" className="space-y-3 text-sm">
    <p className="text-slate-600 dark:text-slate-300">Purchase allowance for open-mesh temporary fencing. The agreed £0.40/m² full-purchase example was for a 49,691 m² site; this site's effective area rate varies with its perimeter and 50% existing stock allowance. Until a boundary is measured, perimeter is estimated as 1.12 × a square site’s perimeter using the Base measures site area. Enter a measured perimeter and any existing secure boundary to refine the estimate. Erection, relocation and removal are separate where required.</p>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="grid gap-1">Measured external perimeter (m; optional)
        <input type="number" min="0" step="0.1" value={assumptions.measuredPerimeterM ?? ''} onChange={event => set('measuredPerimeterM', event.target.value)} className={input} />
      </label>
      <label className="grid gap-1">Existing secure boundary (m)
        <input type="number" min="0" step="0.1" value={assumptions.secureBoundaryM} onChange={event => set('secureBoundaryM', event.target.value)} className={input} />
      </label>
      <label className="grid gap-1">Internal separation and compound (%)
        <input type="number" min="0" max="100" step="1" value={assumptions.internalFencingPercent} onChange={event => set('internalFencingPercent', event.target.value)} className={input} />
      </label>
      <label className="grid gap-1">Existing reusable stock (%)
        <input type="number" min="0" max="100" step="1" value={assumptions.existingStockPercent} onChange={event => set('existingStockPercent', event.target.value)} className={input} />
      </label>
    </div>
    <div className="rounded-app-sm bg-slate-50 p-3 dark:bg-surface-950">
      <div>Site area {number(review.siteAreaM2)} m²; {review.isPerimeterMeasured ? 'measured' : 'estimated'} perimeter {number(review.perimeterM)} m.</div>
      <div>External fencing {number(review.externalFencingM)} m + internal fencing {number(review.internalFencingM)} m = {number(review.requiredFencingM)} m; {review.bayCount} complete 3.5 m bays.</div>
      <div>Full purchase: {review.bayCount} × (£45 bay + £11 bracing, ballast and spares) + {review.bayCount ? '£1,250 gates/delivery' : '£0 gates/delivery'} = {money(review.fullPurchaseCost)}.</div>
      <div className="font-semibold">New purchase at {review.newPurchasePercent}% after existing stock: {money(review.newPurchaseCost)}{review.siteAreaM2 > 0 ? ` (${money(review.effectiveRatePerM2)}/m² of site area)` : ''}.</div>
    </div>
  </div>;
}
