import React from 'react';
import type { AppraisalScottishStatutoryFees, DevelopmentAppraisalOption } from '../../types';
import { calculateScottishStatutoryFees2026 } from '../../utils/appraisal';
import { SCOTTISH_PLANNING_2026_SOURCE, SCOTTISH_PLANNING_PPP_2026_SOURCE, SCOTTISH_WARRANT_2026_SOURCE } from '../../utils/scottishStatutoryFees2026';

const money = (amount: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
const field = 'mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-surface-900';
const certificateLabels: Array<[keyof NonNullable<AppraisalScottishStatutoryFees['warrantCertificates']>, string]> = [
  ['structure', 'Certified structural design'], ['energy', 'Certified energy design'],
  ['electrical', 'Certified electrical construction'], ['drainage', 'Certified drainage, heating and plumbing construction'],
];

export function ScottishStatutoryFeesPanel({ option, updateOption }: {
  option: DevelopmentAppraisalOption;
  updateOption: (id: string, recipe: (current: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const settings = option.scottishStatutoryFees || {};
  const fees = calculateScottishStatutoryFees2026(option);
  const update = (patch: Partial<AppraisalScottishStatutoryFees>) => updateOption(option.id, current => ({
    ...current, scottishStatutoryFees: { ...current.scottishStatutoryFees, ...patch },
  }));
  return <section data-smoke="appraisals-scottish-fees-2026" className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
    <h3 className="font-semibold">Scottish statutory fees — 2026</h3>
    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Planning and warrant fees below feed the two fixed Prelims lines. The rates took effect on 1 April 2026 and are not uplifted by the construction price index. This assumes one planning application and one building warrant application for the whole site.</p>
    <div className="mt-4 grid gap-5 lg:grid-cols-2">
      <div className="space-y-3">
        <h4 className="font-medium">Planning application</h4>
        <label className="block text-sm">Application type
          <select aria-label="Planning application type" className={field} value={fees.planningApplication} onChange={event => update({ planningApplication: event.target.value as AppraisalScottishStatutoryFees['planningApplication'] })}>
            <option value="FULL_NEW_DWELLINGS">Full application — new dwellings</option>
            <option value="PPP_NEW_DWELLINGS">Permission in principle — new dwellings</option>
            <option value="MANUAL">Other application — enter fee</option>
          </select>
        </label>
        {fees.planningApplication === 'MANUAL' && <label className="block text-sm">Planning fee allowance (£)
          <input aria-label="Planning fee allowance (£)" key={`planning-${settings.planningManualFee ?? ''}`} type="number" min="0" step="0.01" className={field} defaultValue={settings.planningManualFee ?? ''} onBlur={event => update({ planningManualFee: event.target.value === '' ? undefined : Math.max(0, Number(event.target.value) || 0) })} />
        </label>}
        <p className="text-sm">{fees.dwellings} dwellings{fees.planningApplication === 'PPP_NEW_DWELLINGS' ? `; ${fees.siteAreaM2.toLocaleString('en-GB')} m² measured site area` : ''}. <strong>Fee: {money(fees.planningFee)}</strong></p>
        {fees.planningApplication === 'PPP_NEW_DWELLINGS' && fees.dwellings > 1 && !fees.siteAreaM2 && <p className="text-sm text-amber-700">Enter the site area in Base measures to calculate the permission-in-principle fee.</p>}
        {fees.planningApplication === 'PPP_NEW_DWELLINGS' && <p className="text-xs text-amber-700">This is the permission-in-principle application fee only. Allow separately for any later approval of matters specified in conditions.</p>}
        <p className="text-xs text-slate-500">The full-application residential scale is £742 for each of the first 10 dwellings, £557 for dwellings 11–49 and £310 thereafter, capped at £185,524. Other application categories require a separate assessment.</p>
        <a href={fees.planningApplication === 'PPP_NEW_DWELLINGS' ? SCOTTISH_PLANNING_PPP_2026_SOURCE : SCOTTISH_PLANNING_2026_SOURCE} target="_blank" rel="noreferrer" className="text-xs underline">Scottish Government planning fee circular</a>
      </div>
      <div className="space-y-3">
        <h4 className="font-medium">Building warrant application</h4>
        <label className="block text-sm">Declared value of warrantable works (£)
          <input aria-label="Declared warrantable value of works (£)" key={`warrant-${settings.warrantValueOfWorks ?? 'proxy'}`} type="number" min="0" step="0.01" className={field} defaultValue={settings.warrantValueOfWorks ?? ''} placeholder={String(Math.round(fees.warrant.valueOfWorks))} onBlur={event => update({ warrantValueOfWorks: event.target.value === '' ? undefined : Math.max(0, Number(event.target.value) || 0) })} />
        </label>
        <p className="text-xs text-slate-500">{fees.warrantSource === 'MANUAL' ? 'Using the declared project value.' : fees.warrantSource === 'BASE_MEASURE' ? `Using the saved building-warrant cost basis of ${money(fees.warrant.valueOfWorks)}.` : `Using a provisional house-construction proxy of ${money(fees.warrantProxyValue)}.`} Confirm the normal market value of all works covered by the single warrant, including relevant temporary works and preliminaries; exclude works outside the warrant. A blank field uses the saved warrant cost basis where available, otherwise the construction proxy.</p>
        <fieldset><legend className="text-sm font-medium">Approved-certifier discounts, only when arranged for this application</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">{certificateLabels.map(([key, label]) => <label key={key} className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={settings.warrantCertificates?.[key] === true} onChange={event => update({ warrantCertificates: { ...settings.warrantCertificates, [key]: event.target.checked } })} />{label}</label>)}</div>
        </fieldset>
        <p className="text-sm">Gross {money(fees.warrant.grossFee)} − certification discount {money(fees.warrant.discount)} = <strong>{money(fees.warrant.payable)}</strong></p>
        <p className="text-xs text-slate-500">{fees.warrant.basis}. Fees are calculated for one ordinary, timely building warrant application. Amendments, late applications and separate warrants require their own allowance.</p>
        <a href={SCOTTISH_WARRANT_2026_SOURCE} target="_blank" rel="noreferrer" className="text-xs underline">Scottish Government building warrant fee table</a>
      </div>
    </div>
  </section>;
}
