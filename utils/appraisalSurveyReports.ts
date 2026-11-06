import type { AppraisalCustomSurveyReport, AppraisalPricingReport, AppraisalSurveyReportAssumptions, AppraisalSurveyReportItemChoice, DevelopmentAppraisalOption } from '../types';

export interface SurveyReportDefinition {
  id: string;
  category: string;
  label: string;
  scope: string;
  trigger: string;
  baseFee: number;
  ratePerM2: number;
  sourceUrl: string;
  sourceLabel: string;
  /** Area is only a budgeting proxy for these scopes; confirm a supplier quote. */
  proxy?: boolean;
  possibleAbnormal?: boolean;
}

// October 2026 UK budget allowances, ex VAT. Each formula is an estimating
// judgement calibrated to the cited supplier's published range or starting fee;
// the source does not publish this exact £/m² formula. Scope, site conditions,
// number of features/visits and statutory requirements govern the actual fee.
export const SURVEY_REPORT_CATALOG: SurveyReportDefinition[] = [
  { id: 'topographical', category: 'Land and existing assets', label: 'Topographical survey', scope: 'Measured levels, boundaries and visible features with CAD plan; excludes underground services.', trigger: 'Base design information needed.', baseFee: 700, ratePerM2: 0.18, sourceUrl: 'https://icelabz.co.uk/surveys/topographical-survey/pricing-fee-builder', sourceLabel: 'Icelabz 2026 topographical fee bands' },
  { id: 'utilities', category: 'Land and existing assets', label: 'PAS 128 underground utility survey', scope: 'Records search, GPR/EML detection and surveyed Type B utility plan; excludes trial-hole verification.', trigger: 'Buried services or excavation interfaces.', baseFee: 750, ratePerM2: 0.22, sourceUrl: 'https://www.utilitylocate.co.uk/services/utility-mapping-pas-128', sourceLabel: 'Utility Locate Scottish survey fee bands' },
  { id: 'cctv', category: 'Land and existing assets', label: 'Existing drainage CCTV survey', scope: 'Accessible existing sewer runs, coded condition report and footage; excludes jetting and traffic management.', trigger: 'Existing drainage to retain, connect to or build near.', baseFee: 650, ratePerM2: 0.12, sourceUrl: 'https://sewerfix.co.uk/guides/cctv-drain-survey-cost/', sourceLabel: 'Sewerfix published CCTV survey price', proxy: true },
  { id: 'asbestos', category: 'Land and existing assets', label: 'Asbestos refurbishment/demolition survey', scope: 'Intrusive survey and samples of affected existing buildings; excludes removal and clearance.', trigger: 'Existing structures may be altered or demolished.', baseFee: 500, ratePerM2: 0.15, sourceUrl: 'https://www.asbestos-survey-monitoring.co.uk/demolition-asbestos-survey-uk', sourceLabel: 'ASM 2026 demolition survey starting fee', proxy: true, possibleAbnormal: true },
  { id: 'measured-building', category: 'Land and existing assets', label: 'Measured building survey', scope: 'Measured plans and elevations of one affected existing building; further buildings and 3D modelling by quote.', trigger: 'Existing buildings will be altered, retained or recorded.', baseFee: 850, ratePerM2: 0.18, sourceUrl: 'https://www.aknengineering.co.uk/measured-building-surveys', sourceLabel: 'AKN Engineering 2026 building-survey guide prices', proxy: true, possibleAbnormal: true },
  { id: 'condition', category: 'Land and existing assets', label: 'Existing building/asset condition survey', scope: 'Baseline visual condition record of affected buildings or third-party assets; excludes destructive testing.', trigger: 'Existing or neighbouring assets need protection or handback evidence.', baseFee: 750, ratePerM2: 0.10, sourceUrl: 'https://www.asbestos-survey-monitoring.co.uk/asbestos-survey-cost', sourceLabel: 'ASM survey fee benchmarks, used as site-visit proxy', proxy: true, possibleAbnormal: true },
  { id: 'ground-investigation', category: 'Ground and contamination', label: 'Geotechnical site investigation', scope: 'Scoped trial pits/boreholes, basic geotechnical laboratory tests and interpretative report; excludes contamination remediation.', trigger: 'Ground and foundation design information needed.', baseFee: 2500, ratePerM2: 0.50, sourceUrl: 'https://www.rcbgroup.co.uk/knowledge/site-investigation-guide', sourceLabel: 'rcbGroup 2025 investigation cost bands', possibleAbnormal: true },
  { id: 'phase-one', category: 'Ground and contamination', label: 'Phase 1 contamination desk study', scope: 'Historical records, site walkover, conceptual site model and preliminary risk assessment.', trigger: 'Previous use or planning condition requires contamination screening.', baseFee: 850, ratePerM2: 0.025, sourceUrl: 'https://www.groundandwater.co.uk/product/desktop-study/', sourceLabel: 'Ground & Water published Phase 1 price' },
  { id: 'phase-two', category: 'Ground and contamination', label: 'Phase 2 contamination testing', scope: 'Targeted soil/groundwater sampling, laboratory testing and interpretative contamination report; excludes remediation.', trigger: 'Phase 1 identifies a plausible pollutant linkage.', baseFee: 2500, ratePerM2: 0.35, sourceUrl: 'https://www.rcbgroup.co.uk/knowledge/site-investigation-guide', sourceLabel: 'rcbGroup 2025 Phase 2 investigation band', possibleAbnormal: true },
  { id: 'ground-gas', category: 'Ground and contamination', label: 'Ground-gas/radon monitoring', scope: 'Initial monitoring and risk report; additional rounds and protection design to be quoted.', trigger: 'Ground conditions, made ground or desk study indicate gas/radon risk.', baseFee: 900, ratePerM2: 0.10, sourceUrl: 'https://www.rcbgroup.co.uk/knowledge/site-investigation-guide', sourceLabel: 'rcbGroup investigation fee range, used as proxy', proxy: true, possibleAbnormal: true },
  { id: 'peat', category: 'Ground and contamination', label: 'Peat depth and condition survey', scope: 'Provisional peat probing and mapped depth/condition report; excludes peat management design and extensive laboratory tests.', trigger: 'Peatland or suspected peat in the site footprint.', baseFee: 1200, ratePerM2: 0.25, sourceUrl: 'https://www.rcbgroup.co.uk/knowledge/site-investigation-guide', sourceLabel: 'rcbGroup ground-investigation range, used only as a fee proxy', proxy: true, possibleAbnormal: true },
  { id: 'coal-mining', category: 'Ground and contamination', label: 'Coal-mining risk assessment', scope: 'Desk assessment of mining records and development risk; excludes intrusive mining investigation.', trigger: 'Site falls within a coal-mining development high-risk area.', baseFee: 650, ratePerM2: 0.03, sourceUrl: 'https://www2.groundstability.com/', sourceLabel: 'Mining Remediation Authority risk-assessment trigger; fee is desk-study proxy', proxy: true, possibleAbnormal: true },
  { id: 'topsoil', category: 'Ground and contamination', label: 'Topsoil/agronomic suitability testing', scope: 'Representative soil sampling and laboratory report for reuse or landscaping; excludes treatment/import.', trigger: 'Site topsoil quality or reuse needs confirmation.', baseFee: 400, ratePerM2: 0.07, sourceUrl: 'https://www.rcbgroup.co.uk/knowledge/site-investigation-guide', sourceLabel: 'rcbGroup sampling investigation range, used as proxy', proxy: true },
  { id: 'infiltration', category: 'Water and drainage', label: 'BRE 365 infiltration testing', scope: 'Trial-pit soakage tests and report; excludes permanent SuDS works and drainage design.', trigger: 'Infiltration drainage or SuDS is proposed.', baseFee: 650, ratePerM2: 0.12, sourceUrl: 'https://bre365test.co.uk/', sourceLabel: 'Nimbus BRE 365 testing scope and starting cost', proxy: true },
  { id: 'flood-risk', category: 'Water and drainage', label: 'Flood risk assessment', scope: 'Site-specific flood risk report; excludes hydraulic modelling or detailed mitigation design.', trigger: 'Flood risk screening or planning authority calls for assessment.', baseFee: 600, ratePerM2: 0.10, sourceUrl: 'https://www.floodrisk-environmental.co.uk/pricing/', sourceLabel: 'Flood Risk Environmental 2026 fee bands', proxy: true },
  { id: 'trees', category: 'Trees and ecology', label: 'BS 5837 tree survey and constraints plan', scope: 'Tree schedule, condition categories, root protection areas and constraints drawing; excludes full arboricultural impact/method statement.', trigger: 'On-site or adjacent trees may affect layout or works.', baseFee: 550, ratePerM2: 0.10, sourceUrl: 'https://www.hart.gov.uk/sites/default/files/2025-04/Fees-and-Charges-24-25.pdf', sourceLabel: 'Hart District Council arboricultural day-rate schedule', proxy: true },
  { id: 'arboricultural-impact', category: 'Trees and ecology', label: 'Arboricultural impact/protection report', scope: 'Impact assessment, tree protection plan and preliminary method statement following a tree survey.', trigger: 'Retained trees interface with development.', baseFee: 650, ratePerM2: 0.09, sourceUrl: 'https://www.hart.gov.uk/sites/default/files/2025-04/Fees-and-Charges-24-25.pdf', sourceLabel: 'Hart District Council AIA/method statement day rates', proxy: true },
  { id: 'pea', category: 'Trees and ecology', label: 'Preliminary ecological appraisal', scope: 'Desk review, habitat walkover and constraints report; excludes follow-up protected-species surveys.', trigger: 'Initial ecology screening needed for planning or site risk.', baseFee: 650, ratePerM2: 0.12, sourceUrl: 'https://smartecology.co.uk/services/pea', sourceLabel: 'Smart Ecology PEA starting price' },
  { id: 'bats', category: 'Trees and ecology', label: 'Bat roost/emergence surveys', scope: 'Initial roost appraisal and provisional follow-up visit/report; confirm building count and survey season.', trigger: 'Buildings or trees offer bat roost potential.', baseFee: 600, ratePerM2: 0.15, sourceUrl: 'https://www.ecologybydesign.co.uk/ecology-resources/costs-of-an-ecological-impact-assessment', sourceLabel: 'Ecology by Design protected-species survey cost guidance', proxy: true, possibleAbnormal: true },
  { id: 'newts', category: 'Trees and ecology', label: 'Great crested newt survey/eDNA', scope: 'Provisional waterbody assessment and eDNA or field survey report; confirm pond count and season.', trigger: 'Suitable ponds occur on or near the site.', baseFee: 600, ratePerM2: 0.10, sourceUrl: 'https://www.astuteecology.co.uk/', sourceLabel: 'Astute Ecology protected-species starting fees', proxy: true, possibleAbnormal: true },
  { id: 'reptiles', category: 'Trees and ecology', label: 'Reptile presence survey', scope: 'Refugia deployment, repeat visits and report; excludes translocation or mitigation.', trigger: 'Suitable unmanaged grassland, scrub or edge habitat.', baseFee: 1000, ratePerM2: 0.25, sourceUrl: 'https://www.ecologybydesign.co.uk/ecology-resources/costs-of-an-ecological-impact-assessment', sourceLabel: 'Ecology by Design reptile survey £2k–£4k range', possibleAbnormal: true },
  { id: 'badgers', category: 'Trees and ecology', label: 'Badger sett survey', scope: 'Targeted sett and activity survey with report; excludes bait marking and mitigation.', trigger: 'PEA indicates badger activity or suitable habitat.', baseFee: 600, ratePerM2: 0.08, sourceUrl: 'https://www.ecologybydesign.co.uk/ecology-resources/costs-of-an-ecological-impact-assessment', sourceLabel: 'Ecology by Design small-site badger survey guide', possibleAbnormal: true },
  { id: 'birds', category: 'Trees and ecology', label: 'Breeding bird survey', scope: 'Provisional multi-visit breeding bird survey and report; excludes wintering bird season.', trigger: 'Habitat supports breeding birds and planning requires evidence.', baseFee: 750, ratePerM2: 0.12, sourceUrl: 'https://www.ecologybydesign.co.uk/ecology-resources/costs-of-an-ecological-impact-assessment', sourceLabel: 'Ecology by Design breeding bird survey guide', proxy: true, possibleAbnormal: true },
  { id: 'water-vole-otter', category: 'Trees and ecology', label: 'Water vole/otter survey', scope: 'Initial watercourse walkover and targeted evidence report; confirm watercourse length and repeat visits.', trigger: 'Watercourse or ditch on or next to site.', baseFee: 600, ratePerM2: 0.10, sourceUrl: 'https://arbtech.co.uk/protected-species/', sourceLabel: 'Arbtech protected-species survey starting price', proxy: true, possibleAbnormal: true },
  { id: 'invasive-species', category: 'Trees and ecology', label: 'Invasive species survey', scope: 'Walkover and mapped report for invasive plants; excludes treatment or management.', trigger: 'Site history or walkover indicates invasive species.', baseFee: 500, ratePerM2: 0.08, sourceUrl: 'https://www.astuteecology.co.uk/', sourceLabel: 'Astute Ecology habitat-survey starting fees, used as proxy', proxy: true, possibleAbnormal: true },
  { id: 'noise', category: 'Planning and environment', label: 'Noise survey and assessment', scope: 'Representative unattended measurements and written planning assessment; extra monitoring locations by quote.', trigger: 'Traffic, rail, industrial or construction noise constraint.', baseFee: 1300, ratePerM2: 0.18, sourceUrl: 'https://www.murrayacoustics.com/insights/noise-survey-cost-uk', sourceLabel: 'Murray Acoustics 2026 £1,450–£2,500 planning survey band', proxy: true },
  { id: 'vibration', category: 'Planning and environment', label: 'Vibration survey and assessment', scope: 'Provisional monitoring at one location and planning assessment; monitoring duration and extra locations by quote.', trigger: 'Rail, industrial, piling or other vibration-sensitive interface.', baseFee: 1300, ratePerM2: 0.18, sourceUrl: 'https://www.murrayacoustics.com/services/vibration', sourceLabel: 'Murray Acoustics vibration survey scope; budget uses noise-survey fee as proxy', proxy: true, possibleAbnormal: true },
  { id: 'air-quality', category: 'Planning and environment', label: 'Air quality assessment', scope: 'Qualitative planning assessment; detailed dispersion modelling is extra.', trigger: 'Traffic/emissions or air-quality management area concern.', baseFee: 700, ratePerM2: 0.12, sourceUrl: 'https://www.airandfloodconsultants.co.uk/air-quality-assessment-cost', sourceLabel: 'Air & Flood Consultants £650 qualitative starting fee', proxy: true },
  { id: 'transport', category: 'Planning and environment', label: 'Transport statement and traffic surveys', scope: 'Initial transport statement and modest traffic counts; excludes strategic modelling and authority monitoring fees.', trigger: 'Road access or trip generation requires transport evidence.', baseFee: 1200, ratePerM2: 0.20, sourceUrl: 'https://www.deal.gov.uk/_UserFiles/Files/_Other/190007-Highway_Information_Pack_2024-25_1.pdf', sourceLabel: 'Deal Town Council ATC cost example; report fee is a proxy', proxy: true },
  { id: 'archaeology-desk', category: 'Planning and environment', label: 'Archaeological desk-based assessment', scope: 'Historic-environment records and archaeological potential report; excludes evaluation trenches.', trigger: 'Archaeological sensitivity or planning consultation.', baseFee: 1350, ratePerM2: 0.06, sourceUrl: 'https://www.drparchaeology.com/price-guide', sourceLabel: 'DRP Archaeology desk-based assessment price list' },
  { id: 'archaeology-trench', category: 'Planning and environment', label: 'Archaeological trial-trench evaluation', scope: 'Provisional targeted trial trenches and report; excludes full excavation, post-excavation and archive.', trigger: 'Archaeology authority requires intrusive evaluation.', baseFee: 3000, ratePerM2: 0.80, sourceUrl: 'https://www.oakfordarch.co.uk/what-does-an-archaeological-desk-based-assessment-cost/', sourceLabel: 'Oakford Archaeology staged evaluation guidance; fee is proxy', proxy: true, possibleAbnormal: true },
  { id: 'heritage', category: 'Planning and environment', label: 'Heritage impact assessment', scope: 'Heritage significance and setting assessment; excludes detailed measured building record.', trigger: 'Listed building, conservation area or other heritage asset.', baseFee: 1000, ratePerM2: 0.08, sourceUrl: 'https://www.drparchaeology.com/price-guide', sourceLabel: 'DRP Archaeology heritage-statement price list', proxy: true, possibleAbnormal: true },
  { id: 'landscape-visual', category: 'Planning and environment', label: 'Landscape and visual impact assessment', scope: 'Landscape baseline, representative viewpoints, site photography and effects report; excludes photomontages beyond the agreed scope.', trigger: 'Sensitive landscape, major proposal or planning authority requests LVIA.', baseFee: 2500, ratePerM2: 0.15, sourceUrl: 'https://lvia.uk/', sourceLabel: 'LVIA UK published £2,500 starting fee', proxy: true, possibleAbnormal: true },
  { id: 'daylight', category: 'Planning and environment', label: 'Daylight and sunlight assessment', scope: 'Initial neighbouring-window and proposed-room modelling/report; major design revisions extra.', trigger: 'Nearby buildings or sensitive neighbours create daylight risk.', baseFee: 900, ratePerM2: 0.15, sourceUrl: 'https://sunlightassessment.co.uk/daylight-sunlight-assessment-cost/', sourceLabel: 'Sunlight Assessment 2026 fee ranges', proxy: true },
  { id: 'eia-screening', category: 'Planning and environment', label: 'EIA screening/scoping report', scope: 'Initial environmental screening/scoping only; excludes Environmental Statement and specialist chapters.', trigger: 'Project may cross EIA thresholds or have sensitive setting.', baseFee: 1800, ratePerM2: 0.10, sourceUrl: 'https://www.airandfloodconsultants.co.uk/air-quality-assessment-cost', sourceLabel: 'Environmental consultant report fee used as proxy', proxy: true, possibleAbnormal: true },
];

export interface SurveyReportReviewRow extends SurveyReportDefinition {
  included: boolean;
  manualFee?: number;
  quote?: AppraisalPricingReport;
  amountBasis: 'QUOTE' | 'BUDGET';
  note: string;
  budget: number;
  amount: number;
  custom?: boolean;
}

export function surveyReportBudget(siteAreaM2: number, baseFee: number, ratePerM2: number): number {
  if (!Number.isFinite(siteAreaM2) || siteAreaM2 <= 0) return 0;
  return Math.round((baseFee + siteAreaM2 * ratePerM2) * 100) / 100;
}

export function calculateSurveyReportSchedule(siteAreaM2: number, assumptions?: AppraisalSurveyReportAssumptions) {
  const custom: SurveyReportDefinition[] = (assumptions?.custom || []).map(row => ({
    id: row.id, category: row.category, label: row.label, scope: row.note || 'Project-specific survey or report; confirm scope with the supplier.',
    trigger: 'Project-specific requirement.', baseFee: row.baseFee, ratePerM2: row.ratePerM2,
    sourceUrl: '', sourceLabel: 'User-entered allowance', proxy: true,
  }));
  const rows: SurveyReportReviewRow[] = [...SURVEY_REPORT_CATALOG, ...custom].map(definition => {
    const customChoice = assumptions?.custom?.find(row => row.id === definition.id);
    const choice: AppraisalSurveyReportItemChoice = customChoice || assumptions?.items?.[definition.id] || {};
    const budget = surveyReportBudget(siteAreaM2, definition.baseFee, definition.ratePerM2);
    const manualFee = typeof choice.manualFee === 'number' && Number.isFinite(choice.manualFee) && choice.manualFee >= 0 ? choice.manualFee : undefined;
    const included = choice.included !== false;
    const quote = choice.quote;
    const amountBasis = quote && manualFee !== undefined ? 'QUOTE' : 'BUDGET';
    return { ...definition, included, manualFee, quote, amountBasis, note: choice.note || '', budget,
      amount: included ? (amountBasis === 'QUOTE' ? manualFee! : budget) : 0, custom: Boolean(customChoice) };
  });
  return {
    siteAreaM2: Number.isFinite(siteAreaM2) ? Math.max(0, siteAreaM2) : 0,
    rows,
    total: rows.reduce((sum, row) => sum + row.amount, 0),
    includedCount: rows.filter(row => row.included).length,
    excludedCount: rows.filter(row => !row.included).length,
    unverifiedCount: rows.filter(row => row.included && row.proxy && row.amountBasis === 'BUDGET').length,
  };
}

/** Work potentially triggered by each excluded report. These are offer qualifications, not priced costs. */
const SURVEY_FOLLOW_ON_WORK: Record<string, string> = {
  topographical: 'Additional earthworks, retaining, drainage or level changes identified by the topographical survey',
  utilities: 'Diversion, protection or replacement of existing underground services',
  cctv: 'Repair, renewal or diversion of existing drainage',
  asbestos: 'Asbestos removal, disposal and clearance',
  'measured-building': 'Alterations or remedial work to existing buildings identified by the measured survey',
  condition: 'Protection, repair or reinstatement of existing and neighbouring assets',
  'ground-investigation': 'Ground improvement, exceptional foundations or excavation arising from the investigation',
  'phase-one': 'Contamination investigation or remediation arising from the desk study',
  'phase-two': 'Contamination remediation and verification',
  'ground-gas': 'Ground-gas or radon protection and further monitoring',
  peat: 'Peat excavation, management, disposal or ground improvement',
  'coal-mining': 'Mine workings investigation, treatment or ground stabilisation',
  topsoil: 'Topsoil treatment, disposal or replacement',
  infiltration: 'Additional drainage or SuDS works arising from infiltration test results',
  'flood-risk': 'Flood mitigation, drainage or level changes',
  trees: 'Tree protection, removal or special construction near roots',
  'arboricultural-impact': 'Tree protection and construction methods required by the arboricultural report',
  pea: 'Habitat or protected-species surveys and mitigation arising from the ecological appraisal',
  bats: 'Bat licensing, exclusion, roost replacement or habitat mitigation',
  newts: 'Great crested newt licensing, translocation or habitat mitigation',
  reptiles: 'Reptile translocation or habitat mitigation',
  badgers: 'Badger licensing, sett protection or exclusion',
  birds: 'Breeding bird protection, programme restrictions or habitat mitigation',
  'water-vole-otter': 'Water vole or otter protection, licensing or habitat mitigation',
  'invasive-species': 'Invasive-species treatment, removal or monitoring',
  noise: 'Acoustic barriers, glazing, ventilation or other noise mitigation',
  vibration: 'Vibration isolation, protection or construction mitigation',
  'air-quality': 'Air-quality mitigation, ventilation or additional monitoring',
  transport: 'Access, junction, highway or traffic-management works arising from transport assessment',
  'archaeology-desk': 'Archaeological field evaluation, recording or preservation',
  'archaeology-trench': 'Archaeological excavation, recording, post-excavation or archive work',
  heritage: 'Heritage protection, conservation or design changes',
  'landscape-visual': 'Landscape screening, planting or visual mitigation',
  daylight: 'Design changes or mitigation arising from daylight and sunlight assessment',
  'eia-screening': 'Further environmental assessment or mitigation identified by EIA screening',
};

export interface ExcludedSurveyAbnormalItem {
  id: string;
  surveyId: string;
  category: string;
  kind: 'REPORT' | 'WORK';
  title: string;
  qualification: string;
  sourceUrl: string;
}

/** Derived from choices so re-including a survey removes both exclusions without stale cost lines. */
export function excludedSurveyAbnormalItems(option: DevelopmentAppraisalOption, includeDraft = false): ExcludedSurveyAbnormalItem[] {
  if (!includeDraft && !option.surveyReports?.confirmedAt) return [];
  return calculateSurveyReportSchedule(0, option.surveyReports).rows.filter(row => !row.included).flatMap(row => {
    const note = row.note.trim() ? ` Project note: ${row.note.trim()}` : '';
    const work = SURVEY_FOLLOW_ON_WORK[row.id] || `Additional investigation, design or works arising from ${row.label.toLowerCase()}`;
    return [
      { id: `survey-exclusion:${row.id}:report`, surveyId: row.id, category: row.category, kind: 'REPORT' as const,
        title: row.label, qualification: `The survey/report is not allowed for in the appraisal or current land offer. If required, obtain a separate scope and price.${note}`, sourceUrl: row.sourceUrl },
      { id: `survey-exclusion:${row.id}:work`, surveyId: row.id, category: row.category, kind: 'WORK' as const,
        title: work, qualification: `Conditional follow-on work is unpriced and not allowed for, except to the extent expressly included elsewhere in the appraisal. Confirm need and extent following investigation.${note}`, sourceUrl: row.sourceUrl },
    ];
  });
}

export function normalizeSurveyReportAssumptions(value: unknown): AppraisalSurveyReportAssumptions | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const rawItems = source.items && typeof source.items === 'object' && !Array.isArray(source.items) ? source.items as Record<string, unknown> : {};
  const items: Record<string, AppraisalSurveyReportItemChoice> = {};
  const normalizeQuote = (value: unknown): AppraisalPricingReport | undefined => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const source = value as Record<string, unknown>;
    if (typeof source.id !== 'string' || typeof source.fileName !== 'string' ||
      (typeof source.dataUrl !== 'string' && typeof source.localEvidencePath !== 'string')) return undefined;
    return {
      id: source.id, fileName: source.fileName,
      mimeType: typeof source.mimeType === 'string' ? source.mimeType : 'application/octet-stream',
      size: typeof source.size === 'number' && Number.isFinite(source.size) ? Math.max(0, source.size) : 0,
      uploadedAt: typeof source.uploadedAt === 'string' ? source.uploadedAt : '',
      dataUrl: typeof source.dataUrl === 'string' ? source.dataUrl : undefined,
      storageMode: source.storageMode === 'MANAGED_LOCAL' ? 'MANAGED_LOCAL' : 'EMBEDDED',
      localEvidencePath: typeof source.localEvidencePath === 'string' ? source.localEvidencePath : undefined,
      contentSha256: typeof source.contentSha256 === 'string' ? source.contentSha256 : undefined,
      integrityStatus: source.integrityStatus === 'VERIFIED' || source.integrityStatus === 'MISSING' || source.integrityStatus === 'CHANGED' || source.integrityStatus === 'UNAVAILABLE' ? source.integrityStatus : undefined,
      integrityCheckedAt: typeof source.integrityCheckedAt === 'string' ? source.integrityCheckedAt : undefined,
      notes: typeof source.notes === 'string' ? source.notes : '',
      extractedText: typeof source.extractedText === 'string' ? source.extractedText : '',
      extractionStatus: source.extractionStatus === 'PENDING' || source.extractionStatus === 'EXTRACTED' || source.extractionStatus === 'WARNING' || source.extractionStatus === 'FAILED' || source.extractionStatus === 'UNSUPPORTED' ? source.extractionStatus : undefined,
      extractedAt: typeof source.extractedAt === 'string' ? source.extractedAt : undefined,
      extractionError: typeof source.extractionError === 'string' ? source.extractionError : '',
    };
  };
  for (const [id, raw] of Object.entries(rawItems)) {
    if (!SURVEY_REPORT_CATALOG.some(entry => entry.id === id) || !raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;
    items[id] = {
      included: item.included !== false,
      manualFee: typeof item.manualFee === 'number' && Number.isFinite(item.manualFee) && item.manualFee >= 0 ? item.manualFee : undefined,
      quote: normalizeQuote(item.quote),
      note: typeof item.note === 'string' ? item.note : '',
    };
  }
  const custom: AppraisalCustomSurveyReport[] = Array.isArray(source.custom) ? source.custom.flatMap(raw => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
    const item = raw as Record<string, unknown>;
    if (typeof item.id !== 'string' || !item.id.startsWith('custom-') || typeof item.label !== 'string' || !item.label.trim()) return [];
    const positive = (number: unknown) => typeof number === 'number' && Number.isFinite(number) && number >= 0 ? number : 0;
    return [{ id: item.id, label: item.label.trim(), category: typeof item.category === 'string' ? item.category : 'Other',
      baseFee: positive(item.baseFee), ratePerM2: positive(item.ratePerM2), included: item.included !== false,
      manualFee: typeof item.manualFee === 'number' && Number.isFinite(item.manualFee) && item.manualFee >= 0 ? item.manualFee : undefined,
      quote: normalizeQuote(item.quote),
      note: typeof item.note === 'string' ? item.note : '' }];
  }) : [];
  return { confirmedAt: typeof source.confirmedAt === 'string' ? source.confirmedAt : undefined, items, custom };
}
