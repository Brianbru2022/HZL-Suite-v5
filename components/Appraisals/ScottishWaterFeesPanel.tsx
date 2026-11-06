import React from 'react';
import type { AppraisalScottishWaterFees, DevelopmentAppraisalOption } from '../../types';
import { calculateScottishWaterFees2026, SCOTTISH_WATER_2026 } from '../../utils/scottishWaterFees2026';
import { calculateHouseTypeSalesQuantity, deriveScottishWaterBuildingWaterMix } from '../../utils/appraisal';

const money = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
const field = 'mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-surface-900';

export function ScottishWaterFeesPanel({ option, updateOption }: {
  option: DevelopmentAppraisalOption;
  updateOption: (id: string, recipe: (current: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const settings = option.scottishWaterFees || {};
  const dwellings = (option.houseTypeSchedule || []).reduce((total, row) => total + calculateHouseTypeSalesQuantity(row), 0);
  const review = calculateScottishWaterFees2026(dwellings, settings, deriveScottishWaterBuildingWaterMix(option));
  const siteSpecificContribution = review.contributionBasis === 'BUDGET' || review.contributionBasis === 'AGREED';
  const update = (patch: Partial<AppraisalScottishWaterFees>) => updateOption(option.id, current => ({
    ...current, scottishWaterFees: { ...current.scottishWaterFees, ...patch },
  }));
  const numberField = (label: string, key: Exclude<keyof AppraisalScottishWaterFees, 'contributionBasis' | 'inspectionMethod' | 'note'>, fallback: number, step = '1') =>
    <label className="block text-sm" key={key}>{label}
      <input aria-label={label} key={`${key}-${settings[key] ?? 'default'}`} type="number" min="0" step={step} className={field}
        defaultValue={settings[key] ?? fallback}
        onBlur={event => update({ [key]: event.target.value === '' ? undefined : Math.max(0, Number(event.target.value) || 0) })} />
    </label>;

  return <section data-smoke="appraisals-scottish-water-fees" className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
    <h3 className="font-semibold">Scottish Water charges · 2026/27</h3>
    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Building water follows the flat, semi/terraced and detached counts in House Types. Foul-water infrastructure, building water, applications and inspections feed Prelims. Fresh-water infrastructure and physical water connections remain in the separate services allowance.</p>
    <div className="mt-3 overflow-x-auto rounded border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm"><thead className="bg-slate-100 text-left dark:bg-slate-800"><tr><th className="px-2 py-1">Building water</th><th className="px-2 py-1 text-right">House Types</th><th className="px-2 py-1 text-right">2026/27 rate</th><th className="px-2 py-1 text-right">Cost</th></tr></thead><tbody>
        {([['Flats', review.flatHomes, SCOTTISH_WATER_2026.buildingWaterFlat], ['Semi-detached / terraced', review.semiTerracedHomes, SCOTTISH_WATER_2026.buildingWaterSemiTerraced], ['Detached', review.detachedHomes, SCOTTISH_WATER_2026.buildingWaterDetached], ['Unclassified — provisional average', review.unclassifiedHomes, SCOTTISH_WATER_2026.buildingWaterUnclassifiedAverage]] as const).map(([label, quantity, rate]) => <tr key={label} className="border-t border-slate-200 dark:border-slate-700"><td className="px-2 py-1">{label}</td><td className="px-2 py-1 text-right">{quantity}</td><td className="px-2 py-1 text-right">{money(rate)}</td><td className="px-2 py-1 text-right">{money(quantity * rate)}</td></tr>)}
      </tbody><tfoot className="border-t border-slate-200 font-semibold dark:border-slate-700"><tr><td className="px-2 py-1">Building water total</td><td className="px-2 py-1 text-right">{review.flatHomes + review.semiTerracedHomes + review.detachedHomes + review.unclassifiedHomes}</td><td /><td className="px-2 py-1 text-right">{money(review.buildingWaterCharges)}</td></tr></tfoot></table>
    </div>
    {review.unclassifiedHomes > 0 && <p className="mt-1 text-xs text-amber-700">Classify {review.unclassifiedHomes} home{review.unclassifiedHomes === 1 ? '' : 's'} in House Types to replace the provisional £238 average with the applicable flat, semi/terraced or detached rate.</p>}
    <div className="mt-3 grid gap-3 md:grid-cols-3">
      {numberField('New homes charged for foul-water infrastructure', 'wastewaterDwellings', review.dwellings)}
      <div className="rounded border border-slate-200 p-2 text-sm dark:border-slate-700">£{SCOTTISH_WATER_2026.infrastructureWastewaterPerDwelling.toFixed(2)} per connected home<br/><strong>Foul-water infrastructure: {money(review.wastewaterCharges)}</strong><br/><strong>Charges carried to Prelims: {money(review.charges)}</strong></div>
    </div>
    <div className="mt-3 grid gap-3 md:grid-cols-3">
      <label className="block text-sm">Foul-water rebate basis
        <select aria-label="Scottish Water contribution basis" className={field} value={settings.contributionBasis || 'DEFAULT_50_PERCENT'} onChange={event => update({ contributionBasis: event.target.value as AppraisalScottishWaterFees['contributionBasis'] })}>
          <option value="DEFAULT_50_PERCENT">Default budget — 50% of foul-water charge</option>
          <option value="NONE">No rebate</option><option value="BUDGET">Site-specific evidenced budget</option><option value="AGREED">Scottish Water agreed amount</option>
        </select>
      </label>
      {siteSpecificContribution && <>
        {numberField('Eligible foul-water local-network works (£)', 'eligibleWastewaterWorksCost', 0, '0.01')}
        {numberField('Foul-water contribution to allow (£)', 'wastewaterContribution', 0, '0.01')}
      </>}
    </div>
    <p className="mt-1 text-xs text-slate-500">The 50% default is an appraisal assumption, not a published entitlement. An evidenced or agreed credit is limited to eligible works, the allowed contribution and the 2026/27 foul-water cap of {money(review.wastewaterCap)}. Rebate in Prelims: <strong>{money(review.rebate)}</strong>.</p>
    <div className="mt-3 grid gap-3 md:grid-cols-3">
      {numberField('Scottish Water applications', 'applicationCount', review.dwellings > 0 ? 1 : 0)}
      {numberField('Building-water / plot inspection visits', 'waterInspections', review.waterInspections)}
      {numberField(review.inspectionMethod === 'ONSITE' ? 'Public sewer inspection visits to budget' : 'Public sewer desktop inspections (connections)', 'wastewaterInspections', review.wastewaterInspections)}
      {numberField('Quoted additional foul-water connection charges (£)', 'quotedWastewaterConnectionCost', 0, '0.01')}
      <label className="block text-sm">Inspection basis
        <select aria-label="Scottish Water inspection basis" className={field} value={settings.inspectionMethod || 'ONSITE'} onChange={event => update({ inspectionMethod: event.target.value as AppraisalScottishWaterFees['inspectionMethod'] })}>
          <option value="ONSITE">Onsite, first hour · £155.80</option><option value="DESKTOP">Desktop, if accepted · £50.60</option>
        </select>
      </label>
      <div className="rounded border border-slate-200 p-2 text-sm dark:border-slate-700">{review.applicationCount} × {money(SCOTTISH_WATER_2026.application)} applications<br/>{review.waterInspections} × {money(review.inspectionRate)} building-water inspections<br/>{review.wastewaterInspections} × {money(review.inspectionRate)} public-sewer inspections<br/><strong>Applications, inspections and quoted foul costs: {money(review.connections)}</strong></div>
    </div>
    <label className="mt-3 block text-sm">Scottish Water quotation, contribution evidence and scope notes
      <textarea aria-label="Scottish Water fee evidence" key={settings.note || ''} className={field} rows={2} defaultValue={settings.note || ''} onBlur={event => update({ note: event.target.value })} />
    </label>
    <p className="mt-2 text-xs text-slate-500">The building-water inspection budget defaults to one visit per dwelling and can be changed to the quoted visit count. Public-sewer inspections default to two site connection points. Both use the selected published inspection rate. Additional hours and abortive visits require separate evidence. Confirm the application count, VAT and final quotation before issue.</p>
    <a className="mt-2 inline-block text-xs underline" href="https://www.scottishwater.co.uk/-/media/scottishwater/document-hub/your-home/charges/2026/your-charges-explained-2026-27.pdf" target="_blank" rel="noreferrer">Scottish Water 2026/27 charges</a>
    {' · '}<a className="text-xs underline" href="https://www.scottishwater.co.uk/-/media/scottishwater/document-hub/business-and-developers/connecting-to-our-network/all-connections-information/1802262026-27-rcc-information-note-dwellings.pdf" target="_blank" rel="noreferrer">2026/27 contribution limits</a>
  </section>;
}
