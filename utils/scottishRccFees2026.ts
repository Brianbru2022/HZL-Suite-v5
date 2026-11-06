import type { AppraisalRccFees } from '../types';
import { RCC_PUBLISHED_SCHEDULES } from './scottishRccSchedules2026';

export const PERTH_KINROSS_RCC_2026_SOURCE = 'https://www.pkc.gov.uk/media/53903/Perth-and-Kinross-Council-Scheme-of-Charges-2026-to-2027/pdf/PKC_Scheme_of_Charges_2026-2027.pdf?m=1775033195597';
export const EAST_LOTHIAN_RCC_2026_SOURCE = 'https://www.eastlothian.gov.uk/roads-parking-and-transport/transport-infrastructure-new-developments/part-1-process-and-authority/14-apply-road-construction-consent';

const optionalAmount = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;

export function normalizeScottishRccFees(value: unknown): AppraisalRccFees | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const authority = ['UNCONFIRMED', 'PERTH_KINROSS', 'EAST_LOTHIAN', 'OTHER', 'NOT_REQUIRED'].includes(String(source.authority))
    ? source.authority as AppraisalRccFees['authority'] : 'UNCONFIRMED';
  return {
    authority,
    otherAuthorityName: typeof source.otherAuthorityName === 'string' ? source.otherAuthorityName : undefined,
    officerHours: optionalAmount(source.officerHours),
    roadLengthM: optionalAmount(source.roadLengthM),
    footpathLengthM: optionalAmount(source.footpathLengthM),
    roadWidthM: optionalAmount(source.roadWidthM),
    footpathWidthM: optionalAmount(source.footpathWidthM),
    inspectionHours: optionalAmount(source.inspectionHours),
    roadBondValue: optionalAmount(source.roadBondValue),
    roadConstructionCost: optionalAmount(source.roadConstructionCost),
    inspectionVisits: optionalAmount(source.inspectionVisits),
    inspectionHoursPerVisit: optionalAmount(source.inspectionHoursPerVisit),
    budgetHourlyRate: optionalAmount(source.budgetHourlyRate),
    manualFee: optionalAmount(source.manualFee),
    manualApplicationFee: optionalAmount(source.manualApplicationFee),
    manualInspectionFee: optionalAmount(source.manualInspectionFee),
    note: typeof source.note === 'string' ? source.note : undefined,
    legacyAllowance: optionalAmount(source.legacyAllowance),
  };
}

export type ScottishRccFeeReview = {
  fee: number;
  status: 'PROVISIONAL' | 'INPUT_REQUIRED' | 'CALCULATED' | 'MANUAL' | 'NOT_REQUIRED' | 'BUDGET';
  detail: string;
  sourceUrl?: string;
  applicationFee?: number;
  inspectionFee?: number;
};

const round = (n: number) => Math.round(n * 100) / 100;

export const RCC_DEFAULT_ROAD_WIDTH_M = 5.5;
export const RCC_DEFAULT_FOOTPATH_WIDTH_M = 2;

/** Area/width is a budget length only; actual designed centreline lengths override it. */
export function estimateRccLengths(settings: AppraisalRccFees | undefined, roadAreaM2: number, footpathAreaM2: number) {
  const roadWidthM = settings?.roadWidthM && settings.roadWidthM > 0 ? settings.roadWidthM : RCC_DEFAULT_ROAD_WIDTH_M;
  const footpathWidthM = settings?.footpathWidthM && settings.footpathWidthM > 0 ? settings.footpathWidthM : RCC_DEFAULT_FOOTPATH_WIDTH_M;
  return {
    roadAreaM2: Math.max(0, roadAreaM2), footpathAreaM2: Math.max(0, footpathAreaM2),
    roadWidthM, footpathWidthM,
    roadLengthM: settings?.roadLengthM ?? (roadAreaM2 > 0 ? roadAreaM2 / roadWidthM : 0),
    footpathLengthM: settings?.footpathLengthM ?? (footpathAreaM2 > 0 ? footpathAreaM2 / footpathWidthM : 0),
    roadLengthEstimated: settings?.roadLengthM === undefined,
    footpathLengthEstimated: settings?.footpathLengthM === undefined,
  };
}

// Comparable 2026/27 council inspection rates, expressed as the same two-hour
// budget visit. Midlothian's published £103 unit is ambiguous, so exclude it
// until its charging unit is confirmed. This is a QS benchmark, not a tariff.
export const RCC_REGIONAL_INSPECTION_BENCHMARKS = [
  { authority: 'Perth & Kinross', hourlyRate: 90 },
  { authority: 'East Lothian', hourlyRate: 76.60 },
  { authority: 'Angus', hourlyRate: 108.25 },
  { authority: 'Fife', hourlyRate: 119.12 },
  { authority: 'Scottish Borders', hourlyRate: 57.26 },
] as const;
export const RCC_AVERAGE_INSPECTION_HOURLY_RATE =
  RCC_REGIONAL_INSPECTION_BENCHMARKS.reduce((sum, item) => sum + item.hourlyRate, 0) / RCC_REGIONAL_INSPECTION_BENCHMARKS.length;

export function estimateRegionalRccBenchmark(settings: AppraisalRccFees, roadAreaM2: number, footpathAreaM2: number, dwellings: number) {
  const lengths = estimateRccLengths(settings, roadAreaM2, footpathAreaM2);
  const visits = settings.inspectionVisits ?? Math.max(6, Math.ceil(roadAreaM2 / 250));
  const hoursPerVisit = settings.inspectionHoursPerVisit ?? 2;
  const hourlyRate = settings.budgetHourlyRate ?? RCC_AVERAGE_INSPECTION_HOURLY_RATE;
  const inspectionFee = round(visits * hoursPerVisit * hourlyRate);
  // East Lothian is the only verified 2026/27 RCC consent scale by road/path
  // length. Use it as a disclosed comparator, never as another council's fee.
  const comparableConsentFee = round(525 + Math.min(lengths.roadLengthM, 100) * 37
    + Math.max(lengths.roadLengthM - 100, 0) * 21 + lengths.footpathLengthM * 6);
  return { ...lengths, visits, hoursPerVisit, hourlyRate, inspectionFee, comparableConsentFee,
    inspectionPerDwelling: dwellings > 0 ? round(inspectionFee / dwellings) : undefined,
    inspectionPerRoadM: lengths.roadLengthM > 0 ? round(inspectionFee / lengths.roadLengthM) : undefined };
}

/** Provisional QS assumption, not a council tariff. Visit count and time can be edited. */
export function estimateRccInspectionBudget(settings: AppraisalRccFees, roadAreaM2 = 0, hourlyRate?: number) {
  const visits = settings.inspectionVisits ?? Math.max(6, Math.ceil(roadAreaM2 / 250));
  const hoursPerVisit = settings.inspectionHoursPerVisit ?? 2;
  const rate = settings.budgetHourlyRate ?? hourlyRate ?? 90;
  return { visits, hoursPerVisit, rate, fee: round(visits * hoursPerVisit * rate) };
}

/** Local roads-authority fees; construction index and road-bond security are excluded. */
function calculateScottishRccFeeInternal(settings?: AppraisalRccFees, roadAreaM2 = 0, footpathAreaM2 = 0, dwellings = 0, roadCostProxy = 0): ScottishRccFeeReview {
  const provisional = (detail: string, status: ScottishRccFeeReview['status'] = 'INPUT_REQUIRED'): ScottishRccFeeReview => ({
    fee: settings?.legacyAllowance ?? 0,
    status: settings?.legacyAllowance === undefined ? status : 'PROVISIONAL',
    detail: settings?.legacyAllowance === undefined ? detail : `${detail} Existing allowance £${settings.legacyAllowance.toFixed(2)} retained provisionally.`,
  });
  if (settings && settings.authority !== 'UNCONFIRMED' && settings.authority !== 'NOT_REQUIRED' && settings.manualFee !== undefined) return {
    fee: settings.manualFee, applicationFee: settings.manualFee, inspectionFee: 0, status: 'MANUAL',
    detail: `${settings.authority === 'PERTH_KINROSS' ? 'Perth & Kinross' : settings.authority === 'EAST_LOTHIAN' ? 'East Lothian' : settings.otherAuthorityName || 'Roads authority'}: legacy combined manual RCC fee; no separate inspection allowance. Split this into the two component overrides when the council quote is available. ${settings.note || 'Record the council quote and scope before issue.'}`,
  };
  switch (settings?.authority) {
    case 'NOT_REQUIRED':
      return { fee: 0, status: 'NOT_REQUIRED', detail: `No RCC allowance required${settings.note ? `: ${settings.note}` : '; record the reason before issue'}.` };
    case 'PERTH_KINROSS':
      if (settings.officerHours === undefined) {
        if (settings.legacyAllowance !== undefined) return provisional('Enter estimated Perth & Kinross officer hours.');
        const lengths = estimateRccLengths(settings, roadAreaM2, footpathAreaM2);
        if (!lengths.roadLengthM && !lengths.footpathLengthM && settings.inspectionVisits === undefined)
          return { fee: 0, applicationFee: 0, inspectionFee: 0, status: 'INPUT_REQUIRED', sourceUrl: PERTH_KINROSS_RCC_2026_SOURCE,
            detail: 'Perth & Kinross: enter adoptable road/footpath areas or measured lengths to budget chargeable officer time.' };
        // The council publishes an hourly charge, but not a fixed number of
        // processing hours per metre. This site-measure proxy remains editable.
        const processingHours = Math.max(6, Math.ceil(lengths.roadLengthM / 50));
        const inspectionHours = settings.inspectionHours ?? estimateRccInspectionBudget(settings, roadAreaM2).visits * (settings.inspectionHoursPerVisit ?? 2);
        const applicationFee = round(processingHours * 90);
        const inspectionFee = round(inspectionHours * 90);
        return { fee: round(applicationFee + inspectionFee), applicationFee, inspectionFee, status: 'BUDGET',
          detail: `Perth & Kinross 2026/27: provisional RCC processing ${processingHours} officer-hours (estimated ${round(lengths.roadLengthM)} m road ÷ 50 m/hour, minimum 6 hours) × £90; separate construction inspections ${inspectionHours} hours × £90. The hours-per-metre and inspection-visit assumptions are QS budgets, not council tariffs. Replace with chargeable hours confirmed by the authority.`,
          sourceUrl: PERTH_KINROSS_RCC_2026_SOURCE };
      }
      {
        const applicationFee = settings.officerHours * 90;
        const inspectionHours = settings.inspectionHours ?? estimateRccInspectionBudget(settings, roadAreaM2).visits * (settings.inspectionHoursPerVisit ?? 2);
        const inspectionFee = inspectionHours * 90;
        return { fee: round(applicationFee + inspectionFee), applicationFee, inspectionFee, status: settings.inspectionHours === undefined ? 'BUDGET' : 'CALCULATED', detail: `Perth & Kinross 2026/27: ${settings.officerHours} RCC processing officer-hours × £90 plus ${inspectionHours} separate inspection hours × £90. ${settings.inspectionHours === undefined ? 'Inspection time is a provisional budget; confirm that it is separately chargeable.' : 'Confirm the split and chargeable hours with the authority.'}`, sourceUrl: PERTH_KINROSS_RCC_2026_SOURCE };
      }
    case 'EAST_LOTHIAN': {
      const { roadLengthM, footpathLengthM, roadLengthEstimated, footpathLengthEstimated } = estimateRccLengths(settings, roadAreaM2, footpathAreaM2);
      const { inspectionHours } = settings;
      if (!roadLengthM && settings.roadLengthM === undefined && !footpathLengthM && settings.footpathLengthM === undefined)
        return settings.legacyAllowance === undefined ? regionalBudgetReview(settings, 'East Lothian', roadAreaM2, footpathAreaM2, dwellings, 'Enter road/footpath areas or actual lengths.', false, EAST_LOTHIAN_RCC_2026_SOURCE) : provisional('Enter road/footpath areas or actual lengths for East Lothian.');
      const applicationFee = 525 + Math.min(roadLengthM, 100) * 37 + Math.max(roadLengthM - 100, 0) * 21 + footpathLengthM * 6;
      const inspectionFee = (inspectionHours ?? estimateRccInspectionBudget(settings, roadAreaM2).visits * (settings.inspectionHoursPerVisit ?? 2)) * 76.60;
      return { fee: round(applicationFee + inspectionFee), applicationFee: round(applicationFee), inspectionFee: round(inspectionFee), status: inspectionHours === undefined || roadLengthEstimated || footpathLengthEstimated ? 'BUDGET' : 'CALCULATED', detail: `East Lothian 2026/27: road ${round(roadLengthM)} m${roadLengthEstimated ? ` estimated from ${round(roadAreaM2)} m² / ${settings.roadWidthM || RCC_DEFAULT_ROAD_WIDTH_M} m width` : ' entered'}, footpath ${round(footpathLengthM)} m${footpathLengthEstimated ? ` estimated from ${round(footpathAreaM2)} m² / ${settings.footpathWidthM || RCC_DEFAULT_FOOTPATH_WIDTH_M} m width` : ' entered'}; one application £${round(applicationFee).toFixed(2)} plus inspection £${round(inspectionFee).toFixed(2)} at £76.60/hour${inspectionHours === undefined ? ' based on provisional estimated visits and hours' : ''}; VAT-exclusive.`, sourceUrl: EAST_LOTHIAN_RCC_2026_SOURCE };
    }
    case 'OTHER':
      return calculateOtherCouncilRccFee(settings, roadAreaM2, footpathAreaM2, dwellings, roadCostProxy, provisional);
    default:
      return provisional('Select the roads authority for this appraisal.', 'PROVISIONAL');
  }
}

export function calculateScottishRccFee(settings?: AppraisalRccFees, roadAreaM2 = 0, footpathAreaM2 = 0, dwellings = 0, roadCostProxy = 0): ScottishRccFeeReview {
  const review = calculateScottishRccFeeInternal(settings, roadAreaM2, footpathAreaM2, dwellings, roadCostProxy);
  if (!settings || settings.authority === 'UNCONFIRMED' || settings.authority === 'NOT_REQUIRED') return review;
  if (settings.manualFee !== undefined) return review;
  if (settings.manualApplicationFee === undefined && settings.manualInspectionFee === undefined) return review;
  const applicationFee = settings.manualApplicationFee ?? review.applicationFee ?? review.fee;
  const inspectionFee = settings.manualInspectionFee ?? review.inspectionFee ?? 0;
  return { ...review, fee: round(applicationFee + inspectionFee), applicationFee, inspectionFee, status: 'MANUAL',
    detail: `${review.detail} ${settings.manualApplicationFee !== undefined ? 'RCC application/consent fee manually overridden.' : ''} ${settings.manualInspectionFee !== undefined ? 'Inspection fee manually overridden.' : ''} ${settings.note || 'Record authority evidence before issue.'}` };
}

function regionalBudgetReview(settings: AppraisalRccFees, name: string, roadAreaM2: number, footpathAreaM2: number,
  dwellings: number, reason: string, includeConsentComparator: boolean, sourceUrl?: string): ScottishRccFeeReview {
  const benchmark = estimateRegionalRccBenchmark(settings, roadAreaM2, footpathAreaM2, dwellings);
  if (!benchmark.roadLengthM && !benchmark.footpathLengthM && settings.inspectionVisits === undefined)
    return { fee: 0, applicationFee: 0, inspectionFee: 0, status: 'INPUT_REQUIRED', sourceUrl,
      detail: `${name}: enter adoptable road/footpath areas in Base measures, actual lengths, or a quoted fee before a regional comparator can be calculated.` };
  const applicationFee = includeConsentComparator && (benchmark.roadLengthM > 0 || benchmark.footpathLengthM > 0)
    ? benchmark.comparableConsentFee : 0;
  const inspectionFee = benchmark.inspectionFee;
  return { fee: round(applicationFee + inspectionFee), applicationFee, inspectionFee, status: 'BUDGET', sourceUrl,
    detail: `${name}: provisional regional comparator because ${reason.toLowerCase()} Road ${round(benchmark.roadLengthM)} m and footpath ${round(benchmark.footpathLengthM)} m from entered lengths or measured areas/assumed widths. ${includeConsentComparator ? `Consent proxy £${applicationFee.toFixed(2)} follows East Lothian's published length scale; it is not this authority's tariff. ` : ''}Inspection proxy: ${benchmark.visits} visits × ${benchmark.hoursPerVisit} hours × £${round(benchmark.hourlyRate).toFixed(2)}/hour, ${settings.budgetHourlyRate === undefined ? 'the arithmetic mean of five published council hourly rates' : 'the user-entered rate'}${benchmark.inspectionPerDwelling === undefined ? '' : ` (£${benchmark.inspectionPerDwelling.toFixed(2)} per home)`}${benchmark.inspectionPerRoadM === undefined ? '' : ` (£${benchmark.inspectionPerRoadM.toFixed(2)} per metre of road)`}. Replace with the authority's quoted fees before issue.` };
}

function calculateOtherCouncilRccFee(settings: AppraisalRccFees, roadAreaM2: number, footpathAreaM2: number, dwellings: number, roadCostProxy: number, provisional: (detail: string) => ScottishRccFeeReview): ScottishRccFeeReview {
  const name = settings.otherAuthorityName?.trim();
  if (!name) return provisional('Select the roads authority.');
  const schedule = RCC_PUBLISHED_SCHEDULES[name];
  if (settings.manualFee !== undefined) return { fee: settings.manualFee, status: 'MANUAL', detail: `${name}: manual RCC fee allowance. ${settings.note || 'Confirm the quoted charge and scope before issue.'}`, sourceUrl: schedule?.sourceUrl };
  const budget = (reason: string, includeConsentComparator = false) => settings.legacyAllowance !== undefined
    ? provisional(`${name}: ${reason}`) : regionalBudgetReview(settings, name, roadAreaM2, footpathAreaM2, dwellings, reason, includeConsentComparator, schedule?.sourceUrl);
  if (!schedule) return budget('No applicable published RCC fee scale was verified. No consent charge is assumed.');
  const calculated = (fee: number, basis: string, applicationFee = 0, inspectionFee = fee): ScottishRccFeeReview => ({
    fee: round(fee), status: schedule.note ? 'BUDGET' : 'CALCULATED', detail: `${name}: ${basis}${schedule.note ? ` ${schedule.note}` : ''}`,
    sourceUrl: schedule.sourceUrl, applicationFee: round(applicationFee), inspectionFee: round(inspectionFee),
  });
  const consentWithInspectionBudget = (consentFee: number, basis: string, rate = 90): ScottishRccFeeReview => {
    const b = estimateRccInspectionBudget(settings, roadAreaM2, rate);
    const inspectionHours = settings.inspectionHours ?? b.visits * b.hoursPerVisit;
    const inspectionFee = round(inspectionHours * b.rate);
    return { ...calculated(consentFee + inspectionFee,
      `${basis} Separately budgeted construction inspections: ${inspectionHours} hours × £${b.rate}/hour; ${settings.inspectionHours === undefined ? 'visit count and hours are provisional QS assumptions' : 'hours entered by user'}. Confirm the authority inspection charge before issue.`, consentFee, inspectionFee),
      status: 'BUDGET' };
  };
  if (schedule.basis === 'HOURLY') {
    const rate = name === 'Angus' ? 108.25 : name === 'Fife' ? 119.12 : 57.26;
    const hours = settings.inspectionHours;
    const visits = settings.inspectionVisits ?? estimateRccInspectionBudget(settings, roadAreaM2).visits;
    const effectiveHours = name === 'Fife' ? Math.max(hours ?? visits * (settings.inspectionHoursPerVisit ?? 2), visits) : hours ?? visits * (settings.inspectionHoursPerVisit ?? 2);
    const inspection = effectiveHours * rate;
    const admin = name === 'Fife' ? Math.max(settings.officerHours ?? .25, .25) * 119.12 : 0;
    if (name === 'Scottish Borders') {
      const lengths = estimateRccLengths(settings, roadAreaM2, footpathAreaM2);
      const applicationFee = lengths.roadLengthM > 0 || lengths.footpathLengthM > 0
        ? estimateRegionalRccBenchmark(settings, roadAreaM2, footpathAreaM2, dwellings).comparableConsentFee : 0;
      return { fee: round(applicationFee + inspection), applicationFee, inspectionFee: round(inspection), status: 'BUDGET',
        detail: `Scottish Borders: no separate RCC application tariff was found in its 2026/27 schedule. Estimated application allowance £${applicationFee.toFixed(2)} uses East Lothian's published 2026/27 scale on ${round(lengths.roadLengthM)} m roads and ${round(lengths.footpathLengthM)} m paths; this is not a Scottish Borders charge. Borders construction inspections: ${effectiveHours} provisional hours × £57.26/hour = £${round(inspection).toFixed(2)}. Replace the application estimate with a council quote before issue.`,
        sourceUrl: schedule.sourceUrl };
    }
    return { ...calculated(inspection + admin, `${effectiveHours} inspection hours at £${rate}/hour${admin ? ` plus £${round(admin).toFixed(2)} Fife administration` : ''}. ${hours === undefined ? 'Inspection time is a provisional visit estimate.' : ''} ${name === 'Fife' ? 'Minimum one hour per visit and 15 minutes administration; charges exclude VAT.' : 'Confirm chargeable time and any specialist/testing fees.'}`, admin, inspection), status: hours === undefined || (name === 'Fife' && settings.officerHours === undefined) ? 'BUDGET' : 'CALCULATED' };
  }
  if (schedule.basis === 'HOURLY_BUDGET' || schedule.basis === 'EXPENSES_BUDGET')
    return budget(schedule.basis === 'HOURLY_BUDGET'
      ? 'The council recovers inspector time and travel but has no verified current hourly rate or bond-linked cap.'
      : 'The council may recover inspection and testing expenses but has no verified current fee scale.');
  if (schedule.basis === 'VISIT') {
    const visits = settings.inspectionVisits ?? Math.max(6, Math.ceil(roadAreaM2 / 250));
    return { ...calculated(visits * 103, `${visits} inspections × published £103 inspection charge.`), status: 'BUDGET' };
  }
  if (schedule.basis === 'BOND') {
    const usingProxy = settings.roadBondValue === undefined && roadCostProxy > 0;
    const bond = settings.roadBondValue ?? (usingProxy ? roadCostProxy : undefined);
    if (bond === undefined) return budget('Enter the estimated road bond value for the published one-off fee.');
    let fee = 0;
    if (name === 'Argyll and Bute') fee = bond / 1000 * 71.67;
    if (name === 'East Dunbartonshire') fee = bond * .06;
    if (name === 'Inverclyde') fee = Math.max(1137.80, bond * .0645);
    if (name === 'Moray') fee = bond * .064;
    if (name === 'North Ayrshire') fee = bond * .015;
    if (name === 'Dundee City') fee = bond <= 100000 ? Math.max(1000, bond * .025) : bond <= 400000 ? Math.max(2500, bond * .02) : Math.max(8000, bond * .015);
    if (name === 'East Ayrshire') fee = bond <= 20000 ? Math.max(341, bond / 1000 * 59.40) : bond <= 100000 ? Math.max(1089, bond / 1000 * 55) : Math.max(4961, bond / 1000 * 45.10);
    if (name === 'South Ayrshire') fee = bond <= 20000 ? Math.max(375.10, bond / 1000 * 64.90) : bond <= 100000 ? Math.max(1197.90, bond / 1000 * 60.50) : Math.max(5457.10, bond / 1000 * 49.50);
    if (name === 'West Lothian') fee = bond <= 50000 ? 2500 : bond <= 500000 ? bond * .05 : bond <= 2000000 ? bond * .045 : bond * .04;
    if (name === 'West Dunbartonshire') fee = bond * .03;
    const bondBasis = usingProxy ? `provisional £${bond.toFixed(2)} road/path construction-cost proxy from this appraisal, used in place of the unconfirmed road bond` : `£${bond.toFixed(2)} estimated road bond`;
    if (name === 'Dundee City' || name === 'West Lothian')
      return consentWithInspectionBudget(fee, `RCC consent fee on ${bondBasis}; road bond security itself is excluded.`,
        name === 'West Lothian' ? 82.24 : 90);
    if (name === 'West Dunbartonshire') {
      const result = calculated(fee, `single published RCC application charge of 3% on ${bondBasis}, covering site inspections. No additional inspection fee is budgeted; road bond security itself is excluded.`, fee, 0);
      return usingProxy ? { ...result, status: 'BUDGET' } : result;
    }
    const result = calculated(fee, `one-off published construction inspection fee on ${bondBasis}. Application fee is not separately evidenced; road bond security itself is excluded.`);
    return usingProxy ? { ...result, status: 'BUDGET' } : result;
  }
  const usingProxy = settings.roadConstructionCost === undefined && roadCostProxy > 0;
  const cost = settings.roadConstructionCost ?? (usingProxy ? roadCostProxy : undefined);
  if (cost === undefined) return budget('Enter estimated road construction cost for the published one-off fee.');
  let fee = 0;
  if (name === 'Highland') fee = cost <= 100000 ? 2500 : cost <= 250000 ? Math.max(2500, cost * .025) : cost <= 500000 ? Math.max(6250, cost * .02) : Math.max(10000, cost * .015);
  if (name === 'Orkney Islands') fee = cost <= 100000 ? 2000 : cost <= 250000 ? Math.max(2500, cost * .025) : cost <= 500000 ? Math.max(6250, cost * .02) : Math.max(10000, cost * .015);
  if (name === 'North Lanarkshire') fee = cost / 1000 * (cost <= 5000 ? 58.70 : cost <= 20000 ? 53.71 : cost <= 100000 ? 47.46 : 34.97);
  if (name === 'Renfrewshire') fee = Math.max(165, cost / 1000 * 20);
  const costBasis = usingProxy ? `provisional £${cost.toFixed(2)} road/path construction-cost proxy from this appraisal` : `£${cost.toFixed(2)} estimated road construction cost`;
  if (name === 'Highland' || name === 'Orkney Islands')
    return consentWithInspectionBudget(fee, `RCC consent fee on ${costBasis}.`);
  const result = calculated(fee, `one-off published construction inspection budget on ${costBasis}. Application fee is not separately evidenced.`);
  return usingProxy ? { ...result, status: 'BUDGET' } : result;
}
