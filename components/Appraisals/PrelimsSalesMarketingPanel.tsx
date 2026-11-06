import React from 'react';
import type { AppraisalSalesMarketingAssumptions, DevelopmentAppraisalOption } from '../../types';
import { salesMarketingReview } from '../../utils/appraisal';
import { normalizeSalesMarketingAssumptions } from '../../utils/appraisalSalesMarketing';

const money = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(value);

export function PrelimsSalesMarketingPanel({ option, updateOption }: {
  option: DevelopmentAppraisalOption;
  updateOption: (id: string, recipe: (current: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const review = salesMarketingReview(option);
  const a = review.assumptions;
  const set = (patch: Partial<AppraisalSalesMarketingAssumptions>) => updateOption(option.id, current => ({
    ...current,
    salesMarketingAssumptions: normalizeSalesMarketingAssumptions({
      ...normalizeSalesMarketingAssumptions(current.salesMarketingAssumptions), ...patch,
    }),
  }));
  const setNumber = (key: 'campaignStartMonth' | 'campaignEndMonth' | 'monthlyMarketingRate', raw: string) => {
    const value = raw === '' && (key === 'campaignStartMonth' || key === 'campaignEndMonth') ? undefined : Number(raw);
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) return;
    set({ [key]: value });
  };
  const inputClass = 'rounded-app-sm border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-surface-950';
  return <div data-smoke="appraisals-prelims-sales-marketing" className="space-y-4 text-sm">
    <p className="text-slate-600 dark:text-slate-300">Advertising is allowed at £3,000 per month from the start of sales, after lead-in and four months to build the showhome. It runs until the selected campaign end. No separate upfront advertising charge is included.</p>
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="grid gap-1"><label className="grid gap-1">Advertising starts in site month
        <input type="number" min={review.defaultCampaignStartMonth} step="1" value={review.campaignStartMonth} onChange={event => setNumber('campaignStartMonth', event.target.value)} className={inputClass} />
      </label>{a.campaignStartMonth !== undefined && <button type="button" onClick={() => set({ campaignStartMonth: undefined })} className="text-left text-xs underline">Use sales start</button>}</div>
      <div className="grid gap-1"><label className="grid gap-1">Campaign ends in site month
        <input type="number" min="0" step="1" value={a.campaignEndMonth ?? review.programmeMonths} onChange={event => setNumber('campaignEndMonth', event.target.value)} className={inputClass} />
      </label>{a.campaignEndMonth !== undefined && <button type="button" onClick={() => set({ campaignEndMonth: undefined })} className="text-left text-xs underline">Use programme completion</button>}</div>
      <label className="grid gap-1">Advertising per month (£)
        <input type="number" min="0" step="1" value={a.monthlyMarketingRate} onChange={event => setNumber('monthlyMarketingRate', event.target.value)} className={inputClass} />
      </label>
    </div>
    <div className="flex flex-wrap gap-5">
      <label className="flex items-center gap-2"><input type="checkbox" checked={a.includeShowhomeFloorCoverings} onChange={event => set({ includeShowhomeFloorCoverings: event.target.checked })} />Include £6,000 showhome floor coverings (not in plot cost)</label>
    </div>
    <div className="rounded-app-sm bg-slate-50 p-3 dark:bg-surface-950">
      <div>Showhome fitout {money(review.showhomeFitout)} + {review.campaignMonths} advertising months × {money(a.monthlyMarketingRate)} = <strong>{money(review.total)}</strong>.</div>
      <div className="mt-1 text-xs text-slate-500">Fitout includes furniture £14,000, curtains/blinds £6,000, artwork/soft furnishings £4,000 and feature decoration/lighting £2,000; floor coverings add £6,000 only when selected. Interior design, delivery, assembly, installation and buffer are excluded. Marketing excludes sales salaries, sundries, incentives and agent commission.</div>
    </div>
  </div>;
}
