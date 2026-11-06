import React from 'react';
import type { AppraisalRccFees, DevelopmentAppraisalOption } from '../../types';
import { rccFeeReview, rccRoadConstructionCostProxy } from '../../utils/appraisal';
import { RCC_AUTHORITY_STYLES, RCC_PUBLISHED_SCHEDULES, SCOTTISH_RCC_AUTHORITIES } from '../../utils/scottishRccSchedules2026';
import { EAST_LOTHIAN_RCC_2026_SOURCE, estimateRccLengths } from '../../utils/scottishRccFees2026';

const money = (amount: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
const field = 'mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-surface-900';
export function RccFeesPanel({ option, updateOption, siteCounty }: {
  option: DevelopmentAppraisalOption;
  siteCounty?: string;
  updateOption: (id: string, recipe: (current: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const settings = option.rccFees || { authority: 'UNCONFIRMED' as const };
  const authoritySelection = settings.authority === 'OTHER' && SCOTTISH_RCC_AUTHORITIES.includes(settings.otherAuthorityName as typeof SCOTTISH_RCC_AUTHORITIES[number])
    ? `OTHER:${settings.otherAuthorityName}` : settings.authority;
  const review = rccFeeReview(option);
  const roadAreaM2 = (option.siteDimensions || []).find(row => row.isCostDriverInput && row.costDriver === 'ROADS_M2')?.quantity || 0;
  const footpathAreaM2 = (option.siteDimensions || []).find(row => row.isCostDriverInput && row.costDriver === 'PATHS_M2')?.quantity || 0;
  const lengths = estimateRccLengths(settings, roadAreaM2, footpathAreaM2);
  const roadCostProxy = rccRoadConstructionCostProxy(option);
  const councilName = settings.authority === 'OTHER' ? settings.otherAuthorityName || '' : '';
  const schedule = RCC_PUBLISHED_SCHEDULES[councilName];
  const oneOffInspection = (schedule?.basis === 'BOND' && !['Dundee City', 'West Lothian'].includes(councilName))
    || (schedule?.basis === 'COST' && councilName === 'North Lanarkshire');
  const missingPublishedDriver = roadCostProxy <= 0 && ((schedule?.basis === 'BOND' && settings.roadBondValue === undefined)
    || (schedule?.basis === 'COST' && settings.roadConstructionCost === undefined));
  const needsBudgetFields = (!oneOffInspection || missingPublishedDriver)
    && (review.status === 'BUDGET' || (review.status === 'PROVISIONAL' && settings.authority !== 'UNCONFIRMED'));
  const publishedInspectionRate = settings.authority === 'PERTH_KINROSS' || settings.authority === 'EAST_LOTHIAN'
    || schedule?.basis === 'HOURLY' || councilName === 'West Lothian' || schedule?.basis === 'VISIT';
  const update = (patch: Partial<AppraisalRccFees>) => updateOption(option.id, current => ({
    ...current, rccFees: { authority: current.rccFees?.authority || 'UNCONFIRMED', ...current.rccFees, ...patch },
    siteDimensions: patch.authority === 'NOT_REQUIRED'
      ? current.siteDimensions?.map(row => row.costDriver === 'RCC_FEES_FORMULA' ? { ...row, manualAdjustment: 0 } : row)
      : current.siteDimensions,
  }));
  const numberField = (label: string, key: 'officerHours' | 'roadLengthM' | 'footpathLengthM' | 'roadWidthM' | 'footpathWidthM' | 'inspectionHours' | 'manualFee' | 'manualApplicationFee' | 'manualInspectionFee' | 'roadBondValue' | 'roadConstructionCost' | 'inspectionVisits' | 'inspectionHoursPerVisit' | 'budgetHourlyRate', step = '1') =>
    <label className="block text-sm" key={key}>{label}
      <input aria-label={label} key={`${key}-${settings[key] ?? 'blank'}`} type="number" min={key === 'roadWidthM' || key === 'footpathWidthM' ? '0.1' : '0'} step={step} className={field} defaultValue={settings[key] ?? ''}
        onBlur={event => {
          const value = Number(event.target.value);
          update({ [key]: event.target.value === '' || ((key === 'roadWidthM' || key === 'footpathWidthM') && value <= 0) ? undefined : Math.max(0, value || 0) });
        }} />
    </label>;
  return <section data-smoke="appraisals-rcc-fees" className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-surface-900">
    <h3 className="font-semibold">Road Construction Consent (RCC)</h3>
    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Choose the roads authority. RCC application or consent fees and construction inspection charges feed separate Prelims lines. Confirm each fee basis and scope before issue.</p>
    {siteCounty && <p className="mt-2 text-xs text-slate-500">Site county recorded as {siteCounty}; verify the actual roads authority before selection.</p>}
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <label className="block text-sm">Roads authority / RCC basis
        <select aria-label="RCC roads authority" className={field} value={authoritySelection} onChange={event => {
          const selection = event.target.value;
          update(selection.startsWith('OTHER:')
            ? { authority: 'OTHER', otherAuthorityName: selection.slice(6), legacyAllowance: undefined, manualFee: undefined, manualApplicationFee: undefined, manualInspectionFee: undefined, roadBondValue: undefined, roadConstructionCost: undefined, inspectionHours: undefined, officerHours: undefined, inspectionVisits: undefined, inspectionHoursPerVisit: undefined, budgetHourlyRate: undefined }
            : { authority: selection as AppraisalRccFees['authority'], otherAuthorityName: undefined, legacyAllowance: undefined, manualFee: undefined, manualApplicationFee: undefined, manualInspectionFee: undefined, roadBondValue: undefined, roadConstructionCost: undefined, inspectionHours: undefined, officerHours: undefined, inspectionVisits: undefined, inspectionHoursPerVisit: undefined, budgetHourlyRate: undefined });
        }}>
          <option value="UNCONFIRMED">To be confirmed — existing provisional allowance</option>
          <option value="PERTH_KINROSS">Perth &amp; Kinross — officer hours (£90/hour)</option>
          <option value="EAST_LOTHIAN">East Lothian — road and path lengths + inspections</option>
          <optgroup label="Other Scottish councils — published fee or provisional inspection budget">
            {SCOTTISH_RCC_AUTHORITIES.map(name => <option key={name} value={`OTHER:${name}`}>{name} — {RCC_AUTHORITY_STYLES[name]}</option>)}
          </optgroup>
          <option value="OTHER">Other roads authority — enter name and fee</option>
          <option value="NOT_REQUIRED">RCC not required</option>
        </select>
      </label>
      {settings.authority === 'PERTH_KINROSS' && <>
        {numberField('Estimated RCC processing officer-hours, excluding separate inspections', 'officerHours', '0.5')}
        {numberField('Separate construction inspection hours, if confirmed', 'inspectionHours', '0.5')}
      </>}
      {settings.authority === 'EAST_LOTHIAN' && <>
        {numberField('Road-construction inspection hours, if applicable', 'inspectionHours', '0.5')}
      </>}
      {settings.authority === 'OTHER' && <>
        {authoritySelection === 'OTHER' && <label className="block text-sm">Roads authority name
          <input aria-label="RCC roads authority name" key={settings.otherAuthorityName || ''} className={field} defaultValue={settings.otherAuthorityName || ''} onBlur={event => update({ otherAuthorityName: event.target.value.trim() })} />
        </label>}
        {schedule?.basis === 'BOND' && numberField('Council road bond value (£; blank uses appraised roads/path cost proxy)', 'roadBondValue', '0.01')}
        {schedule?.basis === 'COST' && numberField('Road construction value (£; blank uses appraised roads/path cost proxy)', 'roadConstructionCost', '0.01')}
        {schedule?.basis === 'HOURLY' && numberField('Estimated chargeable inspection hours', 'inspectionHours', '0.5')}
        {['Dundee City', 'Highland', 'Orkney Islands', 'West Lothian'].includes(councilName) && numberField('Separate construction inspection hours, if confirmed', 'inspectionHours', '0.5')}
        {councilName === 'Fife' && numberField('Fife RCC administration hours, if chargeable', 'officerHours', '0.25')}
        {councilName === 'Fife' && review.status !== 'BUDGET' && numberField('Inspection visits (one-hour minimum each)', 'inspectionVisits')}
      </>}
      {needsBudgetFields && <>
        {numberField('Estimated inspection visits (blank uses road-area formula)', 'inspectionVisits')}
        {schedule?.basis !== 'VISIT' && numberField('Estimated hours per visit (blank: 2)', 'inspectionHoursPerVisit', '0.5')}
        {!publishedInspectionRate && numberField('Budget inspection rate (£/hour; blank uses five-council average)', 'budgetHourlyRate', '0.01')}
      </>}
      {settings.authority !== 'UNCONFIRMED' && settings.authority !== 'NOT_REQUIRED' && <div className="md:col-span-2 rounded border border-slate-200 p-2 text-sm dark:border-slate-700">
        <strong>Confirmed fee overrides</strong><p className="text-xs text-slate-500">Leave blank to use the council schedule or provisional inspection budget. Each entry replaces only its matching component. Clear an older combined manual total before entering split fees.</p>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {numberField('Confirmed RCC application / consent fee (£)', 'manualApplicationFee', '0.01')}
          {numberField('Confirmed construction inspection fee (£)', 'manualInspectionFee', '0.01')}
        </div>
        {settings.manualFee !== undefined && <div className="mt-2">{numberField('Older combined manual total (£; clear to split fees)', 'manualFee', '0.01')}</div>}
      </div>}
      {(settings.authority === 'OTHER' || settings.authority === 'NOT_REQUIRED') && <label className="block text-sm md:col-span-2">Source, fee basis or reason
        <textarea aria-label="RCC fee evidence or reason" key={settings.note || ''} className={field} rows={2} defaultValue={settings.note || ''} onBlur={event => update({ note: event.target.value })} />
      </label>}
    </div>
    {settings.authority !== 'UNCONFIRMED' && settings.authority !== 'NOT_REQUIRED' && <div className="mt-3 rounded border border-slate-200 p-3 text-sm dark:border-slate-700">
      <strong>Road and footpath quantities from Base measures</strong>
      <p className="mt-1">Roads {roadAreaM2.toLocaleString('en-GB')} m² ÷ {lengths.roadWidthM} m = <strong>{Math.round(lengths.roadLengthM * 10) / 10} m</strong>{lengths.roadLengthEstimated ? ' estimated' : ' entered'}; footpaths {footpathAreaM2.toLocaleString('en-GB')} m² ÷ {lengths.footpathWidthM} m = <strong>{Math.round(lengths.footpathLengthM * 10) / 10} m</strong>{lengths.footpathLengthEstimated ? ' estimated' : ' entered'}.</p>
      <p className="mt-1 text-xs text-slate-500">Area ÷ average width is a budget centreline length. Change the width for the site layout, or enter a measured design length. Only adoptable road and footpath areas should be included for RCC.</p>
      {(schedule?.basis === 'BOND' || schedule?.basis === 'COST') && <p className="mt-1 text-xs text-slate-500">Appraised roads/path construction-cost proxy: <strong>{money(roadCostProxy)}</strong>. It excludes road markings and is used only until the council bond or roadworks value is entered. Check adoption scope before issue.</p>}
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        {numberField('Assumed average road width (m; blank: 5.5)', 'roadWidthM', '0.1')}
        {numberField('Assumed average footpath width (m; blank: 2)', 'footpathWidthM', '0.1')}
        {numberField('Actual road length (m; blank uses area ÷ width)', 'roadLengthM', '0.1')}
        {numberField('Actual footpath length (m; blank uses area ÷ width)', 'footpathLengthM', '0.1')}
      </div>
    </div>}
    <p className="mt-3 text-sm"><strong>Combined Prelims allowance: {money(review.fee)}</strong> · {review.status.replace('_', ' ').toLowerCase()}</p>
    <p className="mt-1 text-xs text-slate-600">RCC application / consent line: {money(review.applicationFee ?? review.fee)} · Construction inspection line: {money(review.inspectionFee || 0)}</p>
    {councilName === 'Scottish Borders' && settings.manualApplicationFee === undefined && <p className="mt-1 text-sm text-amber-700">The application line is an estimate using East Lothian’s published road/path-length scale. Scottish Borders has not published a separate RCC application tariff in its 2026/27 schedule. Replace the estimate if the council quotes a charge.</p>}
    <p className={review.status === 'PROVISIONAL' || review.status === 'INPUT_REQUIRED' ? 'mt-1 text-sm text-amber-700' : 'mt-1 text-sm text-slate-600 dark:text-slate-300'}>{review.detail}</p>
    {review.sourceUrl && <a href={review.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs underline">Council RCC fee source</a>}
    {councilName === 'Scottish Borders' && <a href={EAST_LOTHIAN_RCC_2026_SOURCE} target="_blank" rel="noreferrer" className="ml-3 mt-2 inline-block text-xs underline">Application estimate source: East Lothian</a>}
    <p className="mt-2 text-xs text-slate-500">Published fees have no construction-index uplift. Bond security is separate. A one-off charge that includes inspections replaces the visit budget; a consent-only charge does not. Where a current local tariff is unverified, the app budgets inspection time using the average of five published council hourly rates and assumes no application fee. Confirm the authority's charge, adoption scope and VAT treatment before issue.</p>
  </section>;
}
