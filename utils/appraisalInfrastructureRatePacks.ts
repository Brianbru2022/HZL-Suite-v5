import { PLOT_BASE_ALLOWANCES, PLOT_GARDEN_ALLOWANCES, LANDSCAPING_FENCING_COMPOUND_ALLOWANCES, LANDSCAPING_COMMENT, SERVICES_LIGHTING_ALLOWANCES, SERVICES_COMMENT, ROADS_PATHS_ALLOWANCES, ROADS_PATHS_COMMENT, DRAINAGE_COMMENT } from './appraisalInfrastructureBill';
import type {
  AppraisalInfrastructureCostDriver,
  AppraisalRateFormulaComponent,
  AppraisalRateLibraryItem,
  AppraisalSiteDimensionUnit,
  DevelopmentAppraisalOption,
} from '../types';
import {
  infrastructureCostDriverToCategory,
  createDefaultAppraisalRate,
  createSiteDimensionRowFromRate,
  normalizeAppraisalRateLibraryItems,
} from './appraisal';
import { isAbnormalRemovalRow } from './appraisalSiteCosts';

export const AWD_INFRASTRUCTURE_RATE_PACK_NAME = 'AWD Infrastructure Pack';
export const AWD_INFRASTRUCTURE_RATE_PACK_PREFIX = 'awd-infrastructure';
export const AWD_INFRASTRUCTURE_RATE_PACK_PRICE_INDEX = 233;
export const AWD_PLOT_WORKS_RATE_PACK_NAME = 'AWD Plot Works Pack';
export const AWD_PLOT_WORKS_RATE_PACK_PREFIX = 'awd-plot-works';
export const AWD_PLOT_WORKS_RATE_PACK_PRICE_INDEX = 233;
export const AWD_PRELIMS_RATE_PACK_NAME = 'AWD Prelims Pack';
export const AWD_PRELIMS_RATE_PACK_PREFIX = 'awd-prelims';
export const AWD_PRELIMS_RATE_PACK_PRICE_INDEX = 233;
export const AGREED_APPRAISAL_RATE_BASIS_VERSION = 2;

export type AwdPrelimsSectionId =
  | 'DESIGN_COSTS'
  | 'STATUTORY_FEES'
  | 'REPORTS'
  | 'STAFFING'
  | 'SITE_ACCOMMODATION'
  | 'SITE_PRELIMS'
  | 'SITE_SECURITY'
  | 'LEGAL'
  | 'SALES';

export const AWD_PRELIMS_RATE_SECTIONS: Array<{ id: AwdPrelimsSectionId; label: string }> = [
  { id: 'DESIGN_COSTS', label: 'Design Costs' },
  { id: 'STATUTORY_FEES', label: 'Statutory Fees' },
  { id: 'REPORTS', label: 'Reports' },
  { id: 'STAFFING', label: 'Staffing' },
  { id: 'SITE_ACCOMMODATION', label: 'Site Accommodation' },
  { id: 'SITE_PRELIMS', label: 'Site Prelims' },
  { id: 'SITE_SECURITY', label: 'Site Security' },
  { id: 'LEGAL', label: 'Legal' },
  { id: 'SALES', label: 'Sales' },
];

type AwdInfrastructureRateDefinition = {
  id: string;
  label: string;
  costDriver: AppraisalInfrastructureCostDriver;
  unit: AppraisalSiteDimensionUnit;
  rate: number;
  formula: string;
  sourceRow: string;
  basis: string;
};

type AwdPlotWorksRateDefinition = AwdInfrastructureRateDefinition;
type AwdPrelimsRateDefinition = AwdInfrastructureRateDefinition & {
  section: AwdPrelimsSectionId;
  formulaComponents?: AppraisalRateFormulaComponent[];
};

export const AWD_ENGINEERS_FEES_FORMULA_COMPONENTS: AppraisalRateFormulaComponent[] = [
  {
    id: 'awd-engineers-fixed-allowances',
    label: 'Fixed engineering allowances',
    quantity: 1,
    rate: 14600,
    sourceFormula: '250 + 1000 + 250 + 750 + 2500 + 4500 + 1500 + 750 + 1250 + 350 + 1500',
    notes: 'Base fixed allowances from Prelims!B6.',
  },
  {
    id: 'awd-engineers-unit-allowance',
    label: 'Per-unit engineering allowance',
    costDriver: 'TOTAL_UNITS',
    rate: 530,
    sourceFormula: "(500 * 'Project Data'!B8) + (30 * 'Project Data'!B8)",
    notes: 'Uses the site total unit count.',
  },
  {
    id: 'awd-engineers-standard-house-types',
    label: 'Standard house type count allowance',
    costDriver: 'STANDARD_HOUSE_TYPE_COUNT',
    rate: 1,
    sourceFormula: "COUNT('Project Data'!D29:D89)",
    notes: 'Uses the number of standard house type rows for the site.',
  },
  {
    id: 'awd-engineers-non-standard-house-types',
    label: 'Non-standard house type count allowance',
    costDriver: 'NON_STANDARD_HOUSE_TYPE_COUNT',
    rate: 1200,
    sourceFormula: "COUNT('Project Data'!E93:E127) * 1200",
    notes: 'Enter the non-standard house type count for the site where needed.',
  },
  {
    id: 'awd-engineers-programme-allowance',
    label: 'Programme duration allowance',
    costDriver: 'PROGRAMME_MONTHS',
    rate: 150,
    sourceFormula: "300 * ('Project Data'!E21 / 2)",
    notes: 'Uses the site programme period in months.',
  },
];

export const AWD_INFRASTRUCTURE_RATE_DEFINITIONS: AwdInfrastructureRateDefinition[] = [
  ...LANDSCAPING_FENCING_COMPOUND_ALLOWANCES.map(spec=>({...spec,formula:`USER_LANDSCAPING_FENCING_COMPOUND_V1: ${spec.costDriver} * ${spec.rate}`,sourceRow:'INFRASTRUCTURE_LANDSCAPING_FENCING_COMPOUND_V1',basis:spec.unit==='m2'?LANDSCAPING_COMMENT:`Per ${spec.costDriver==='TOTAL_UNITS'?'site unit':'metre of '+spec.label.toLowerCase()}`})),
  ...SERVICES_LIGHTING_ALLOWANCES.map(spec => ({...spec,formula:`${spec.id==='awd-infrastructure-street-lighting-works'?'USER_STREET_LIGHTING_WORKS_V1':'USER_SERVICES_LIGHTING_V1'}: ${'unpriced' in spec ? 'UNPRICED' : spec.costDriver+' * '+spec.rate}`,sourceRow:'INFRASTRUCTURE_SERVICES_LIGHTING_V1',basis:'unpriced' in spec ? 'Rate to be assessed; excluded from priced totals until assessed.' : SERVICES_COMMENT})),
  ...ROADS_PATHS_ALLOWANCES.map(spec => ({...spec,formula:`USER_ROADS_PATHS_V1: ${spec.costDriver} * ${spec.rate}`,sourceRow:'INFRASTRUCTURE_ROADS_PATHS_V1',basis:ROADS_PATHS_COMMENT})),
  { id: 'awd-infrastructure-topsoil-strip-stockpile', label: 'Topsoil strip and stockpile', costDriver: 'SITE_AREA_M2', unit: 'm2', rate: 0.87, formula: 'USER_SITE_AREA_V1: SITE_AREA_M2 * 0.87', sourceRow: 'INFRASTRUCTURE_CORE_SITE_AREA_V1', basis: 'user-specified rate per gross site area m2; strip and stockpile on site' },
  { id: 'awd-infrastructure-clear-site-vegetation', label: 'Clear site of vegetation', costDriver: 'SITE_AREA_M2', unit: 'm2', rate: 0.25, formula: 'USER_SITE_AREA_V1: SITE_AREA_M2 * 0.25', sourceRow: 'INFRASTRUCTURE_CORE_SITE_AREA_V1', basis: 'user-specified rate per gross site area m2; define vegetation clearance extent; no demolition allowance' },
  {
    id: `${AWD_INFRASTRUCTURE_RATE_PACK_PREFIX}-removal-existing-structures`,
    label: 'Removal of existing structures',
    costDriver: 'TOTAL_UNITS',
    unit: 'nr',
    rate: 6.22,
    formula: "Infrastructure!B4 = 'Project Data'!B8 * 6.22",
    sourceRow: 'Infrastructure!B4',
    basis: 'per total unit',
  },
  {
    id: `${AWD_INFRASTRUCTURE_RATE_PACK_PREFIX}-removal-existing-surfaces`,
    label: 'Removal of existing surfaces',
    costDriver: 'TOTAL_UNITS',
    unit: 'nr',
    rate: 6.22,
    formula: "Infrastructure!B5 = 'Project Data'!B8 * 6.22",
    sourceRow: 'Infrastructure!B5',
    basis: 'per total unit',
  },
  {
    id: `${AWD_INFRASTRUCTURE_RATE_PACK_PREFIX}-alterations`,
    label: 'Alterations',
    costDriver: 'FIXED_SUM',
    unit: 'sum',
    rate: 0,
    formula: 'Infrastructure!B6 = 0',
    sourceRow: 'Infrastructure!B6',
    basis: 'manual allowance',
  },
  {
    id: `${AWD_INFRASTRUCTURE_RATE_PACK_PREFIX}-cut-and-fill`,
    label: 'Cut and fill',
    costDriver: 'SITE_AREA_M2',
    unit: 'm2',
    rate: 3.19,
    formula: 'USER_SITE_AREA_V1: SITE_AREA_M2 * 3.19',
    sourceRow: 'Infrastructure!B7',
    basis: 'per site area m2',
  },
  {
    id: `${AWD_INFRASTRUCTURE_RATE_PACK_PREFIX}-drainage-suds`,
    label: 'Onsite Sewers',
    costDriver: 'ROADS_M2',
    unit: 'm2',
    rate: 56,
    formula: 'USER_DRAINAGE_V1: ROADS_M2 * 56',
    sourceRow: 'Infrastructure!B9',
    basis: 'per roads m2',
  },
  {
    id: 'awd-infrastructure-manholes-chambers', label: 'Manholes and chambers', costDriver: 'ROADS_M2', unit: 'm2', rate: 34.21, formula: 'USER_DRAINAGE_V1: ROADS_M2 * 34.21', sourceRow: 'INFRASTRUCTURE_DRAINAGE_V1', basis: DRAINAGE_COMMENT,
  },



  {
    id: `${AWD_INFRASTRUCTURE_RATE_PACK_PREFIX}-service-strips`,
    label: 'Service strips',
    costDriver: 'ROADS_M2',
    unit: 'm2',
    rate: 0.83,
    formula: "Infrastructure!B18 = 0.83 * 'Project Data'!B139",
    sourceRow: 'Infrastructure!B18',
    basis: 'per roads m2',
  },
  {
    id: `${AWD_INFRASTRUCTURE_RATE_PACK_PREFIX}-ev-charging-with-drives`,
    label: 'EV charging - units with drives',
    costDriver: 'UNITS_WITH_DRIVES',
    unit: 'nr',
    rate: 0,
    formula: 'Infrastructure!B19 excludes drive plot chargers because house types include car charging as standard',
    sourceRow: 'Infrastructure!B19',
    basis: 'included in house type standard cost',
  },

  {
    id: `${AWD_INFRASTRUCTURE_RATE_PACK_PREFIX}-protection`,
    label: 'Protection',
    costDriver: 'ROADS_M2',
    unit: 'm2',
    rate: 0.86,
    formula: 'USER_DRAINAGE_V1: ROADS_M2 * 0.86',
    sourceRow: 'Infrastructure!B25',
    basis: 'per roads m2',
  },
];

export const AWD_PLOT_WORKS_RATE_DEFINITIONS: AwdPlotWorksRateDefinition[] = [
  ...PLOT_BASE_ALLOWANCES.map(spec=>({...spec,formula:`USER_PLOT_BASE_V1: ${spec.costDriver} * ${spec.rate}`,sourceRow:'PLOT_WORKS_BASE_V1',basis:`Per ${spec.unit==='nr'?'site unit':spec.costDriver==='PLOT_WORKS_DRIVES_M2'?'m2 of plot drives':'m2 of plot paths'}`})),
  ...PLOT_GARDEN_ALLOWANCES.map(spec=>({...spec,formula:`USER_PLOT_GARDENS_V1: ${spec.costDriver} * ${spec.rate}`,sourceRow:'PLOT_WORKS_GARDENS_V1',basis:LANDSCAPING_COMMENT})),
];

export const AWD_PRELIMS_RATE_DEFINITIONS: AwdPrelimsRateDefinition[] = [
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-architects-fees`,
    section: 'DESIGN_COSTS',
    label: 'Architects Fees',
    costDriver: 'TOTAL_GDV',
    unit: 'sum',
    rate: 0.006,
    formula: 'Prelims!B5 = total GDV * 0.006',
    sourceRow: 'Prelims!B5',
    basis: '0.6% of total GDV',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-engineers-fees`,
    section: 'DESIGN_COSTS',
    label: 'Engineers Fees',
    costDriver: 'ENGINEERS_FEES_FORMULA',
    unit: 'sum',
    rate: 1,
    formula: '£0 pending confirmation; then the sum of required normal Engineer’s Scope items',
    sourceRow: 'Prelims!B6',
    basis: 'confirmed Engineer’s Scope total; no separate starting fee',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-landscape-fees`,
    section: 'DESIGN_COSTS',
    label: 'Landscape Fees',
    costDriver: 'SITE_AREA_M2',
    unit: 'm2',
    rate: 0.3,
    formula: "Prelims!B7 = 0.3 * 'Project Data'!B138",
    sourceRow: 'Prelims!B7',
    basis: 'per site area m2',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-principal-designer-fees`,
    section: 'DESIGN_COSTS',
    label: 'Principal Designer Fees',
    costDriver: 'FIXED_SUM',
    unit: 'sum',
    rate: 3500,
    formula: 'Prelims!B8 = 3500',
    sourceRow: 'Prelims!B8',
    basis: 'lump sum',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-street-lighting-design-fees`,
    section: 'DESIGN_COSTS',
    label: 'Street Lighting Design Fees',
    costDriver: 'FIXED_SUM',
    unit: 'sum',
    rate: 2500,
    formula: 'Prelims!B9 = 2500',
    sourceRow: 'Prelims!B9',
    basis: 'lump sum',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-planning`,
    section: 'STATUTORY_FEES',
    label: 'Planning',
    costDriver: 'PLANNING_FEES_FORMULA',
    unit: 'sum',
    rate: 1,
    formula: 'Scottish 2026 full new-dwellings application = MIN(185524, 742*MIN(n,10) + 557*MIN(MAX(n-10,0),39) + 310*MAX(n-49,0)); permission in principle uses site area',
    sourceRow: 'Scottish Planning Circular 1/2026, category 1',
    basis: 'statutory 2026 fee per application; not construction-indexed',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-building-warrant`,
    section: 'STATUTORY_FEES',
    label: 'Building Warrant',
    costDriver: 'BUILDING_WARRANT_FORMULA',
    unit: 'sum',
    rate: 1,
    formula: 'Scottish 2026 Building Standards Procedural Handbook v1.9 tables 1a–1b: one warrant fee by declared value of works, less applicable approved-certifier discounts',
    sourceRow: 'Scottish Building Standards Procedural Handbook v1.9, 3.15',
    basis: 'statutory 2026 value-of-works fee; not construction-indexed',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-rcc`,
    section: 'STATUTORY_FEES',
    label: 'RCC application / consent',
    costDriver: 'RCC_FEES_FORMULA',
    unit: 'sum',
    rate: 1,
    formula: 'Select roads authority per appraisal; calculate the application or consent component of the council charge separately from construction inspections',
    sourceRow: 'Roads authority 2026/27 schedule',
    basis: 'local roads-authority application or consent fee; provisional legacy allowance retained until assessed',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-scottish-water-charges`,
    section: 'STATUTORY_FEES',
    label: 'Scottish Water building water and foul infrastructure',
    costDriver: 'TOTAL_UNITS',
    unit: 'sum',
    rate: 1,
    formula: '2026/27 foul-connected dwellings × £549.40 + flats × £187 + semi/terraced homes × £231 + detached homes × £296 + unclassified homes × provisional £238 average building water',
    sourceRow: 'Scottish Water Your Charges Explained 2026/27, pp.15–16',
    basis: 'house mix from House Types; excludes fresh-water infrastructure and physical water connections',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-scottish-water-rebates`,
    section: 'STATUTORY_FEES',
    label: 'Scottish Water foul-water rebate',
    costDriver: 'SCOTTISH_WATER_REBATE_FORMULA',
    unit: 'sum',
    rate: 1,
    formula: 'Default: -50% × foul-water charges. Site-specific: -min(wastewater eligible works, allowed contribution, £2,821.45 × wastewater dwellings)',
    sourceRow: '50% provisional appraisal assumption; Scottish Water Reasonable Cost Contributions: Dwellings 2026/27 for evidenced claims',
    basis: 'negative provisional budget; 50% is not a published entitlement and should be replaced with an evidenced or agreed site-specific contribution',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-scottish-water-connections`,
    section: 'STATUTORY_FEES',
    label: 'Scottish Water applications and inspections',
    costDriver: 'TOTAL_UNITS',
    unit: 'sum',
    rate: 1,
    formula: 'Applications × £113.70 + (building-water inspection visits + public-sewer inspection visits) × £155.80 onsite or £50.60 desktop + quoted additional foul-water costs',
    sourceRow: 'Scottish Water Your Charges Explained 2026/27, pp.17–19',
    basis: 'one application, one building-water inspection per home and up to two public-sewer inspections by default; no fresh-water infrastructure or physical water connections',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-rcc-inspection`,
    section: 'STATUTORY_FEES',
    label: 'RCC construction inspections',
    costDriver: 'RCC_FEES_FORMULA',
    unit: 'sum',
    rate: 1,
    formula: 'Apply the separate published inspection charge once, or an editable visit × hours × rate budget where no applicable fee is confirmed',
    sourceRow: 'Roads authority 2026/27 inspection schedule',
    basis: 'inspection expense separate from RCC application/consent; excludes the road bond security',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-structural-warranty`,
    section: 'STATUTORY_FEES',
    label: 'Structural Warranty',
    costDriver: 'TOTAL_UNITS',
    unit: 'nr',
    rate: 1100,
    formula: "Prelims!B18 = 1100 * 'Project Data'!B8",
    sourceRow: 'Prelims!B18',
    basis: 'per total unit',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-site-manager`,
    section: 'STAFFING',
    label: 'Site Manager',
    costDriver: 'PROGRAMME_MONTHS',
    unit: 'month',
    rate: 6000,
    formula: "Prelims!B22 = 6000 * 'Project Data'!E21",
    sourceRow: 'Prelims!B22',
    basis: 'per programme month',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-assistant-site-manager`,
    section: 'STAFFING',
    label: 'Assistant Site Manager',
    costDriver: 'ASSISTANT_SITE_MANAGER_FORMULA',
    unit: 'month',
    rate: 3750,
    formula: "Prelims!B23 = IF('Project Data'!E20 > 2, 'Project Data'!E21 * 3750, 0)",
    sourceRow: 'Prelims!B23',
    basis: 'required when build rate is more than 2 units/month',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-forklift-driver`,
    section: 'STAFFING',
    label: 'Forklift Driver',
    costDriver: 'FORKLIFT_DRIVER_FORMULA',
    unit: 'month',
    rate: 3400,
    formula: 'Prelims!B24 adapted = MAX(0, programme months - lead-in months) * 3400 * selected forklift-driver count (automatic default: 1 or 2 by build rate)',
    sourceRow: 'Prelims!B24',
    basis: '£3,400 per forklift driver per active programme month, excluding initial lead-in; selected count overrides the automatic build-rate count',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-labourers`,
    section: 'STAFFING',
    label: 'Labourers',
    costDriver: 'LABOURERS_FORMULA',
    unit: 'month',
    rate: 3060,
    formula: "Prelims!B25 = IF('Project Data'!E20 > 2, 'Project Data'!E21 * 3060 * 2, 'Project Data'!E21 * 3060)",
    sourceRow: 'Prelims!B25',
    basis: 'programme months and build rate formula',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-cabins`,
    section: 'SITE_ACCOMMODATION',
    label: 'Cabins',
    costDriver: 'PROGRAMME_MONTHS',
    unit: 'month',
    rate: 2125,
    formula: "Prelims!B27 = 'Project Data'!E21 * 4.25 * 500",
    sourceRow: 'Prelims!B27',
    basis: 'per programme month',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-generator-accommodation`,
    section: 'SITE_ACCOMMODATION',
    label: '20 kVA site office generator',
    costDriver: 'FIXED_SUM',
    unit: 'sum',
    rate: 9000,
    formula: 'Selected with the bunded tank: lower combined purchase/hire and six-month mains strategy',
    sourceRow: 'Prelims!B28',
    basis: 'Purchase or monthly hire from Prelims temporary-power assumptions',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-bowser-accommodation`,
    section: 'SITE_ACCOMMODATION',
    label: '1,000-litre static bunded fuel tank',
    costDriver: 'FIXED_SUM',
    unit: 'sum',
    rate: 3000,
    formula: 'Selected with the generator: lower combined purchase/hire and six-month mains strategy',
    sourceRow: 'Prelims!B29',
    basis: 'Purchase or monthly hire from Prelims temporary-power assumptions',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-permanent-power`,
    section: 'SITE_ACCOMMODATION',
    label: 'Permanent power connection',
    costDriver: 'FIXED_SUM',
    unit: 'sum',
    rate: 3000,
    formula: 'Included only where a mains switch reduces the combined generator, tank and connection cost',
    sourceRow: 'Prelims!B30',
    basis: 'Selected mains connection from Prelims temporary-power assumptions',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-site-office-mains-electricity`,
    section: 'SITE_ACCOMMODATION',
    label: 'Site-office mains electricity',
    costDriver: 'PROGRAMME_MONTHS',
    unit: 'month',
    rate: 300,
    formula: 'Selected mains months × 1,200 kWh/month × £0.25/kWh; quantities and tariff editable in Prelims assumptions',
    sourceRow: 'PRELIMS_SITE_OFFICE_MAINS_ELECTRICITY',
    basis: 'site-office mains electricity after connection only; excludes plot-heating electricity and generator fuel',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-furniture`,
    section: 'SITE_ACCOMMODATION',
    label: 'Furniture',
    costDriver: 'FIXED_SUM',
    unit: 'sum',
    rate: 0,
    formula: 'Furniture included with cabin provision; no separate base allowance',
    sourceRow: 'Prelims!B31',
    basis: 'lump sum',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-rates`,
    section: 'SITE_ACCOMMODATION',
    label: 'Rates',
    costDriver: 'PROGRAMME_MONTHS',
    unit: 'month',
    rate: 150,
    formula: "Prelims!B32 = 150 * 'Project Data'!E21",
    sourceRow: 'Prelims!B32',
    basis: 'per programme month',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-electrical-testing`,
    section: 'SITE_ACCOMMODATION',
    label: 'Electrical Testing',
    costDriver: 'PROGRAMME_MONTHS',
    unit: 'month',
    rate: 50,
    formula: "Prelims!B33 = 'Project Data'!E21 / 4 * 200",
    sourceRow: 'Prelims!B33',
    basis: 'per programme month',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-drinking-water`,
    section: 'SITE_ACCOMMODATION',
    label: 'Drinking Water',
    costDriver: 'PROGRAMME_MONTHS',
    unit: 'month',
    rate: 100,
    formula: 'Bottled water for the selected months, based on average cabin occupancy',
    sourceRow: 'Prelims!B34',
    basis: 'per selected bottled-water month; compare with potable mains connection and ongoing site-accommodation charges',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-drinking-water-mains-connection`,
    section: 'SITE_ACCOMMODATION',
    label: 'Potable mains branch to site cabins',
    costDriver: 'FIXED_SUM',
    unit: 'sum',
    rate: 1500,
    formula: 'Selected connection arrangement; included only when cheaper than bottled water throughout',
    sourceRow: 'PRELIMS_DRINKING_WATER_CONNECTION',
    basis: 'once when the selected potable mains solution is cheaper',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-drinking-water-mains-service`,
    section: 'SITE_ACCOMMODATION',
    label: 'Site-cabin potable mains standing and usage',
    costDriver: 'PROGRAMME_MONTHS',
    unit: 'month',
    rate: 50,
    formula: 'Post-commissioning site-accommodation water and sewerage budget',
    sourceRow: 'PRELIMS_DRINKING_WATER_MAINS_SERVICE',
    basis: 'per selected mains-service month; provisional standing and usage allowance',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-bowser-site-prelims`,
    section: 'SITE_PRELIMS',
    label: 'Bowser',
    costDriver: 'FIXED_SUM',
    unit: 'sum',
    rate: 4500,
    formula: 'Prelims!B36 = 4500',
    sourceRow: 'Prelims!B36',
    basis: 'lump sum',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-generator-site-prelims`,
    section: 'SITE_PRELIMS',
    label: 'Generator',
    costDriver: 'FIXED_SUM',
    unit: 'sum',
    rate: 10000,
    formula: 'Prelims!B37 = 10000',
    sourceRow: 'Prelims!B37',
    basis: 'lump sum',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-consumables`,
    section: 'SITE_PRELIMS',
    label: 'Other site consumables',
    costDriver: 'PROGRAMME_MONTHS',
    unit: 'month',
    rate: 0,
    formula: 'No separate base allowance: management PPE and safety consumables are in Health and Safety; minor shared tools are in Small Plant; trade consumables are in subcontract rates.',
    sourceRow: 'Prelims!B38',
    basis: 'optional separate allowance only where a specific site consumable is not covered elsewhere',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-forklifts`,
    section: 'SITE_PRELIMS',
    label: 'Forklifts',
    costDriver: 'FORKLIFTS_FORMULA',
    unit: 'month',
    rate: 1716,
    formula: 'Prelims!B39 adapted = MAX(0, programme months - lead-in months) * 1716 * IF(build rate > 2 units/month, 2, 1)',
    sourceRow: 'Prelims!B39',
    basis: '£1,716 per forklift per active programme month, excluding initial lead-in; one forklift when build rate is 2 units/month or less, two forklifts above 2 units/month',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-forklift-repairs`,
    section: 'SITE_PRELIMS',
    label: 'Forklift Repairs',
    costDriver: 'FORKLIFTS_FORMULA',
    unit: 'month',
    rate: 212.5,
    formula: 'Active forklift months × selected forklift count × £212.50 per forklift-month; excludes lead-in',
    sourceRow: 'Prelims!B40',
    basis: '£212.50 for each active forklift-month, matching forklift hire duration and count; no charge before forklifts arrive or after they leave',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-fuel`,
    section: 'SITE_PRELIMS',
    label: 'Telehandler diesel fuel',
    costDriver: 'PROGRAMME_MONTHS',
    unit: 'month',
    rate: 600,
    formula: 'Active forklift months × forklift count × £600 per telehandler-month',
    sourceRow: 'Prelims!B41',
    basis: 'per active telehandler-month, excluding programme lead-in',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-accommodation-generator-fuel`,
    section: 'SITE_ACCOMMODATION',
    label: 'Site-accommodation generator diesel fuel',
    costDriver: 'PROGRAMME_MONTHS',
    unit: 'month',
    rate: 850,
    formula: 'Selected generator diesel months × £850 per month',
    sourceRow: 'PRELIMS_GENERATOR_FUEL',
    basis: 'per generator month, stopping at selected mains connection',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-health-and-safety`,
    section: 'SITE_PRELIMS',
    label: 'Health and Safety',
    costDriver: 'PROGRAMME_MONTHS',
    unit: 'month',
    rate: 200,
    formula: 'Programme months × £200 H&S consumables allowance',
    sourceRow: 'Prelims!B42',
    basis: 'per programme month; consumables only, excluding external inspections and management fees',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-external-safety-inspections`,
    section: 'SITE_PRELIMS',
    label: 'External H&S inspection visits',
    costDriver: 'PROGRAMME_MONTHS',
    unit: 'nr',
    rate: 250,
    formula: 'Selected visits per programme month × rate per visit; zero unless required',
    sourceRow: 'PRELIMS_EXTERNAL_SAFETY_INSPECTIONS',
    basis: 'per external inspection visit, when selected in Prelims assumptions',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-small-plant`,
    section: 'SITE_PRELIMS',
    label: 'Small Plant',
    costDriver: 'PROGRAMME_MONTHS',
    unit: 'month',
    rate: 150,
    formula: 'Programme months × £150 shared small-plant allowance',
    sourceRow: 'Prelims!B43',
    basis: 'per programme month; management-team minor plant and tools only',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-fall-arrest`,
    section: 'SITE_PRELIMS',
    label: 'Fall Arrest',
    costDriver: 'FIXED_SUM',
    unit: 'sum',
    rate: 3000,
    formula: 'Prelims!B44 = 3000',
    sourceRow: 'Prelims!B44',
    basis: 'lump sum',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-heaters`,
    section: 'SITE_PRELIMS',
    label: 'Plot heaters — purchase fleet',
    costDriver: 'FIXED_SUM',
    unit: 'nr',
    rate: 200,
    formula: 'Optimised purchased heater fleet including 10% spares × £200',
    sourceRow: 'Prelims!B45',
    basis: 'site-specific winter plot heating; excludes electricity',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-heater-hire`,
    section: 'SITE_PRELIMS',
    label: 'Plot heaters — peak hire',
    costDriver: 'FIXED_SUM',
    unit: 'week',
    rate: 25,
    formula: 'Optimised temporary heater-weeks × £25/week',
    sourceRow: 'PRELIMS_PLOT_HEATER_HIRE',
    basis: 'hired 3 kW heaters needed beyond the purchased core fleet',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-heater-electricity`,
    section: 'SITE_PRELIMS',
    label: 'Plot-heating electricity',
    costDriver: 'FIXED_SUM',
    unit: 'kWh',
    rate: 0.25,
    formula: 'Working heater-days × 3 kW × 24 h/day × 50% duty × £0.25/kWh',
    sourceRow: 'PRELIMS_PLOT_HEATER_ELECTRICITY',
    basis: 'winter plot heating electricity; separate from site-office generator fuel',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-mini-skips`,
    section: 'SITE_PRELIMS',
    label: 'Mini Skips',
    costDriver: 'TOTAL_UNITS',
    unit: 'nr',
    rate: 150,
    formula: '3 skips for 1 dwelling, rising in whole skips to 9 at 20 dwellings; £150 per skip',
    sourceRow: 'Prelims!B46',
    basis: 'site-wide mini skips, £150 each; zero until dwelling count is entered',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-skips`,
    section: 'SITE_PRELIMS',
    label: '8-yard equivalent skip loads',
    costDriver: 'TOTAL_UNITS',
    unit: 'nr',
    rate: 325,
    formula: 'Construction dwellings by house type × size-based equivalent 8-yard loads per dwelling × £325 per load',
    sourceRow: 'Prelims!B47',
    basis: 'per collected equivalent 8-yard load; excludes groundwork, demolition and hazardous waste',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-skip-segregation-handling`,
    section: 'SITE_PRELIMS',
    label: 'Waste segregation handling',
    costDriver: 'TOTAL_UNITS',
    unit: 'nr',
    rate: 50,
    formula: 'Construction dwellings × selected handling allowance; only when segregated collection is selected',
    sourceRow: 'PRELIMS_SKIP_SEGREGATION_HANDLING',
    basis: 'illustrative per dwelling; zero unless segregated collection is selected',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-skip-segregation-setup`,
    section: 'SITE_PRELIMS',
    label: 'Waste segregation setup',
    costDriver: 'FIXED_SUM',
    unit: 'sum',
    rate: 500,
    formula: 'One selected site-wide setup allowance; only when segregated collection is selected',
    sourceRow: 'PRELIMS_SKIP_SEGREGATION_SETUP',
    basis: 'illustrative site-wide setup; zero unless segregated collection is selected',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-general-repairs`,
    section: 'SITE_PRELIMS',
    label: 'General Repairs',
    costDriver: 'PROGRAMME_MONTHS',
    unit: 'month',
    rate: 200,
    formula: 'Programme months × £200 for minor site-accommodation and compound repairs',
    sourceRow: 'Prelims!B48',
    basis: 'per programme month; minor cabin and compound repairs only; excludes house snagging, subcontractor defects, generator servicing and forklift repairs',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-silo-generator`,
    section: 'SITE_PRELIMS',
    label: 'Silo generator — purchase or hire',
    costDriver: 'PROGRAMME_MONTHS',
    unit: 'month',
    rate: 400,
    formula: 'Selected lower cost of purchase/reuse ownership and hire over active mortar months; construction months exclude lead-in and are estimated from site dwellings and build rate; 75% active default',
    sourceRow: 'Prelims!B49',
    basis: 'site-specific active-month allowance; fuel separately measured; suitable dedicated mains supply can shorten generator use',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-silo-generator-fuel`,
    section: 'SITE_PRELIMS',
    label: 'Silo generator diesel fuel',
    costDriver: 'PROGRAMME_MONTHS',
    unit: 'month',
    rate: 330,
    formula: 'Selected active silo-generator months × £330 fuel/month provisional allowance',
    sourceRow: 'Prelims silo generator fuel',
    basis: 'diesel only; separate from telehandler and accommodation generator fuel',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-electricity-phones-bt`,
    section: 'SITE_PRELIMS',
    label: 'Site communications — mobiles and Starlink',
    costDriver: 'PROGRAMME_MONTHS',
    unit: 'month',
    rate: 150,
    formula: 'Programme months × (£70 two company mobiles + £70 Starlink subscription + £10 incidental charges)',
    sourceRow: 'Prelims!B50',
    basis: 'per programme month; excludes site-office and plot electricity, generator fuel, and one-off Starlink equipment or mounting',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-cctv-cameras`,
    section: 'SITE_SECURITY',
    label: 'CCTV Cameras',
    costDriver: 'PROGRAMME_MONTHS',
    unit: 'month',
    rate: 2103.75,
    formula: "Prelims!B52 = 'Project Data'!E21 * 4.25 * 495",
    sourceRow: 'Prelims!B52',
    basis: 'per programme month',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-heras-fencing`,
    section: 'SITE_SECURITY',
    label: 'Heras fencing — new stock purchase',
    costDriver: 'SITE_AREA_M2',
    unit: 'm2',
    rate: 0.2,
    formula: 'Site-specific purchase = 50% of (required 3.5 m bays × (£45 bay + £11 bracing/spares) + £1,250 gates/delivery); required length from estimated or measured perimeter plus internal separation',
    sourceRow: 'Prelims!B53',
    basis: 'dynamic site-area equivalent rate; 50% existing stock by default; excludes erection, relocations and removal',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-purchase-fees`,
    section: 'LEGAL',
    label: 'Purchase Fees',
    costDriver: 'FIXED_SUM',
    unit: 'sum',
    rate: 4125.384917436502,
    formula: 'Prelims!B55 = 4125.384917436502',
    sourceRow: 'Prelims!B55',
    basis: 'lump sum',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-legal-completion-fees`,
    section: 'LEGAL',
    label: 'Legal completion Fees',
    costDriver: 'TOTAL_UNITS',
    unit: 'nr',
    rate: 200,
    formula: "Prelims!B56 = 200 * 'Project Data'!B8",
    sourceRow: 'Prelims!B56',
    basis: 'per total unit',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-lbtt-in-summary`,
    section: 'LEGAL',
    label: 'LBTT (in summary)',
    costDriver: 'FIXED_SUM',
    unit: 'sum',
    rate: 0,
    formula: 'Prelims!B57 is blank; LBTT is handled in summary',
    sourceRow: 'Prelims!B57',
    basis: 'summary placeholder',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-sales-cabins`,
    section: 'SALES',
    label: 'Sales Cabins',
    costDriver: 'PROGRAMME_MONTHS',
    unit: 'month',
    rate: 2975,
    formula: 'Sales presence months = MAX(0, programme months - lead-in months - 4 showhouse months); cost = months * 2975',
    sourceRow: 'Prelims!B59',
    basis: 'per sales presence month after lead-in and showhouse construction',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-sales-assistants`,
    section: 'SALES',
    label: 'Sales Assistants',
    costDriver: 'PROGRAMME_MONTHS',
    unit: 'month',
    rate: 3350,
    formula: 'Sales presence months = MAX(0, programme months - lead-in months - 4 showhouse months); cost = months * 3350',
    sourceRow: 'Prelims!B60',
    basis: 'per sales presence month after lead-in and showhouse construction',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-sales-sundries`,
    section: 'SALES',
    label: 'Sales Sundries',
    costDriver: 'PROGRAMME_MONTHS',
    unit: 'month',
    rate: 250,
    formula: 'Sales presence months = MAX(0, programme months - lead-in months - 4 showhouse months); cost = months * 250',
    sourceRow: 'Prelims!B61',
    basis: '£250 per sales-office operating month after lead-in and showhouse construction: £60 stationery and routine printing, £50 refreshments, £40 cleaning materials and toilet consumables, £50 postage/keys/small sundries, and £50 buffer. Excludes sales staff, facility, utilities, professional cleaning, advertising, brochures and purchaser incentives.',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-show-home-fitout`,
    section: 'SALES',
    label: 'Show Home Fitout',
    costDriver: 'FIXED_SUM',
    unit: 'sum',
    rate: 32000,
    formula: 'Furniture £14,000 + curtains/blinds £6,000 + artwork/soft furnishings £4,000 + feature decoration/lighting £2,000 + floor coverings £6,000 if not included in plot construction',
    sourceRow: 'USER_SHOWHOME_FITOUT_2026',
    basis: 'One 3–4 bedroom showhome; excludes interior design, delivery, assembly, installation and buffer provided in-house. Deduct £6,000 floor coverings when already in plot construction.',
  },
  {
    id: `${AWD_PRELIMS_RATE_PACK_PREFIX}-advertising`,
    section: 'SALES',
    label: 'Ongoing advertising and marketing',
    costDriver: 'PROGRAMME_MONTHS',
    unit: 'month',
    rate: 3000,
    formula: 'Sales operating months from sales start to selected campaign end × £3,000/month',
    sourceRow: 'USER_ONGOING_MARKETING_2026',
    basis: 'Property portals, paid digital advertising and ongoing campaign support from sales start; sales staff, showhome, incentives and selling-agent commission remain separate.',
  },
];

/** Complete the agreed base schedule without replacing saved site selections or adjustments. */
export function addMissingAgreedAppraisalRows(option: DevelopmentAppraisalOption): DevelopmentAppraisalOption {
  if (option.agreedRateBasisVersion === AGREED_APPRAISAL_RATE_BASIS_VERSION) return option;
  const existing = option.siteDimensions || [];
  // Earlier imports retained these exact workbook defaults after the agreed
  // assumptions changed. Match both the source and old price so site-specific
  // edits (including staffing, RCC and sales provision) remain untouched.
  const legacyPrelimsDefaults = new Map<string, number>([
    [`${AWD_PRELIMS_RATE_PACK_PREFIX}-generator-accommodation`, 3525],
    [`${AWD_PRELIMS_RATE_PACK_PREFIX}-bowser-accommodation`, 4500],
    [`${AWD_PRELIMS_RATE_PACK_PREFIX}-furniture`, 1250],
    [`${AWD_PRELIMS_RATE_PACK_PREFIX}-rates`, 390],
    [`${AWD_PRELIMS_RATE_PACK_PREFIX}-drinking-water`, 200],
    [`${AWD_PRELIMS_RATE_PACK_PREFIX}-fuel`, 2000],
    [`${AWD_PRELIMS_RATE_PACK_PREFIX}-health-and-safety`, 637.5],
  ]);
  const prelimsDefinitions = new Map(AWD_PRELIMS_RATE_DEFINITIONS.map(definition => [definition.id, definition]));
  const refreshed = existing.map(row => {
    const definition = row.libraryRateId ? prelimsDefinitions.get(row.libraryRateId) : undefined;
    if (!definition || legacyPrelimsDefaults.get(definition.id) !== row.rate
      || row.sourceRow !== definition.sourceRow
      || !row.notes?.startsWith(`${AWD_PRELIMS_RATE_PACK_NAME}.`)) return row;
    return {
      ...row,
      rate: definition.rate,
      sourceFormula: definition.formula,
      notes: `${AWD_PRELIMS_RATE_PACK_NAME}. ${definition.basis}. Base formula: ${definition.formula}.`,
    };
  });
  const hasMeasuredSite = (option.houseTypeSchedule || []).some(row => (Number(row.quantity) || 0) > 0)
    || existing.some(row => row.isCostDriverInput && (Number(row.quantity) || 0) > 0);
  const isUnpricedOutline = !hasMeasuredSite
    && !existing.some(row => row.libraryRateId?.startsWith('awd-prelims-'));
  const ids = new Set(existing.map(row => row.libraryRateId).filter(Boolean));
  const groups = [
    { name: AWD_INFRASTRUCTURE_RATE_PACK_NAME, definitions: AWD_INFRASTRUCTURE_RATE_DEFINITIONS, index: AWD_INFRASTRUCTURE_RATE_PACK_PRICE_INDEX },
    { name: AWD_PLOT_WORKS_RATE_PACK_NAME, definitions: AWD_PLOT_WORKS_RATE_DEFINITIONS, index: AWD_PLOT_WORKS_RATE_PACK_PRICE_INDEX },
    { name: AWD_PRELIMS_RATE_PACK_NAME, definitions: AWD_PRELIMS_RATE_DEFINITIONS, index: AWD_PRELIMS_RATE_PACK_PRICE_INDEX },
  ];
  const missing = groups.flatMap(group => group.definitions
    .filter(definition => !ids.has(definition.id) && !isAbnormalRemovalRow({ libraryRateId: definition.id }))
    .map(definition => createSiteDimensionRowFromRate(createDefaultAppraisalRate({
      id: definition.id,
      category: infrastructureCostDriverToCategory(definition.costDriver),
      costDriver: definition.costDriver,
      label: definition.label,
      unit: definition.unit,
      rate: definition.rate,
      formulaComponents: 'formulaComponents' in definition ? definition.formulaComponents as AppraisalRateFormulaComponent[] : undefined,
      priceIndex: definition.costDriver === 'PLANNING_FEES_FORMULA'
        || definition.costDriver === 'BUILDING_WARRANT_FORMULA'
        || definition.id === 'awd-prelims-rcc-inspection'
        || definition.id.startsWith('awd-prelims-scottish-water-') ? 0 : group.index,
      sourceFormula: definition.formula,
      sourceRow: definition.sourceRow,
      notes: `${group.name}. ${definition.basis}. Base formula: ${definition.formula}.`,
      status: 'ACTIVE',
      favorite: true,
    }))));
  return {
    ...option,
    agreedRateBasisVersion: AGREED_APPRAISAL_RATE_BASIS_VERSION,
    unpricedOutlineUntilSiteInputs: option.unpricedOutlineUntilSiteInputs === true || isUnpricedOutline,
    siteDimensions: missing.length ? [...refreshed, ...missing] : refreshed,
  };
}

export function isAwdInfrastructureRate(item: Pick<AppraisalRateLibraryItem, 'id'>): boolean {
  return item.id.startsWith(`${AWD_INFRASTRUCTURE_RATE_PACK_PREFIX}-`);
}

export function isAwdPlotWorksRate(item: Pick<AppraisalRateLibraryItem, 'id'>): boolean {
  return item.id.startsWith(`${AWD_PLOT_WORKS_RATE_PACK_PREFIX}-`);
}

export function isAwdPrelimsRate(item: Pick<AppraisalRateLibraryItem, 'id'>): boolean {
  return item.id.startsWith(`${AWD_PRELIMS_RATE_PACK_PREFIX}-`);
}

export function getAwdPrelimsRateSection(item: Pick<AppraisalRateLibraryItem, 'id'>): AwdPrelimsSectionId | undefined {
  return AWD_PRELIMS_RATE_DEFINITIONS.find((definition) => definition.id === item.id)?.section;
}

export function createAwdInfrastructureRatePack(): AppraisalRateLibraryItem[] {
  const timestamp = new Date().toISOString();
  return AWD_INFRASTRUCTURE_RATE_DEFINITIONS.map((definition) =>
    createDefaultAppraisalRate({
      id: definition.id,
      category: infrastructureCostDriverToCategory(definition.costDriver),
      costDriver: definition.costDriver,
      label: definition.label,
      unit: definition.unit,
      rate: definition.rate,
      priceIndex: AWD_INFRASTRUCTURE_RATE_PACK_PRICE_INDEX,
      sourceFormula: definition.formula,
      sourceRow: definition.sourceRow,
      notes: `${AWD_INFRASTRUCTURE_RATE_PACK_NAME}. ${definition.basis}. Base formula: ${definition.formula}. Revised costs ignored.`,
      status: 'ACTIVE',
      favorite: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  );
}

export function createAwdPlotWorksRatePack(): AppraisalRateLibraryItem[] {
  const timestamp = new Date().toISOString();
  return AWD_PLOT_WORKS_RATE_DEFINITIONS.map((definition) =>
    createDefaultAppraisalRate({
      id: definition.id,
      category: infrastructureCostDriverToCategory(definition.costDriver),
      costDriver: definition.costDriver,
      label: definition.label,
      unit: definition.unit,
      rate: definition.rate,
      priceIndex: AWD_PLOT_WORKS_RATE_PACK_PRICE_INDEX,
      sourceFormula: definition.formula,
      sourceRow: definition.sourceRow,
      notes: `${AWD_PLOT_WORKS_RATE_PACK_NAME}. ${definition.basis}. Base formula: ${definition.formula}. Revised costs ignored.`,
      status: 'ACTIVE',
      favorite: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  );
}

export function createAwdPrelimsRatePack(): AppraisalRateLibraryItem[] {
  const timestamp = new Date().toISOString();
  return AWD_PRELIMS_RATE_DEFINITIONS.map((definition) =>
    createDefaultAppraisalRate({
      id: definition.id,
      category: infrastructureCostDriverToCategory(definition.costDriver),
      costDriver: definition.costDriver,
      label: definition.label,
      unit: definition.unit,
      rate: definition.rate,
      formulaComponents: definition.formulaComponents,
      priceIndex: definition.costDriver === 'PLANNING_FEES_FORMULA' || definition.costDriver === 'BUILDING_WARRANT_FORMULA' || definition.id.startsWith('awd-prelims-scottish-water-') ? 0 : AWD_PRELIMS_RATE_PACK_PRICE_INDEX,
      sourceFormula: definition.formula,
      sourceRow: definition.sourceRow,
      notes: `${AWD_PRELIMS_RATE_PACK_NAME}. ${definition.basis}. Base formula: ${definition.formula}. Revised costs ignored.`,
      status: 'ACTIVE',
      favorite: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  );
}

export function mergeAwdInfrastructureRatePack(
  currentRates: AppraisalRateLibraryItem[]
): { rates: AppraisalRateLibraryItem[]; inserted: number; updated: number } {
  const packRates = createAwdInfrastructureRatePack();
  const packIds = new Set(packRates.map((rate) => rate.id));
  const existingPackCount = currentRates.filter((rate) => packIds.has(rate.id)).length;
  const nonPackRates = currentRates.filter((rate) => !packIds.has(rate.id));

  return {
    rates: normalizeAppraisalRateLibraryItems([...packRates, ...nonPackRates]),
    inserted: packRates.length - existingPackCount,
    updated: existingPackCount,
  };
}

export function mergeAwdPlotWorksRatePack(
  currentRates: AppraisalRateLibraryItem[]
): { rates: AppraisalRateLibraryItem[]; inserted: number; updated: number } {
  const packRates = createAwdPlotWorksRatePack();
  const packIds = new Set(packRates.map((rate) => rate.id));
  const existingPackCount = currentRates.filter((rate) => packIds.has(rate.id)).length;
  const nonPackRates = currentRates.filter((rate) => !packIds.has(rate.id));

  return {
    rates: normalizeAppraisalRateLibraryItems([...packRates, ...nonPackRates]),
    inserted: packRates.length - existingPackCount,
    updated: existingPackCount,
  };
}

export function mergeAwdPrelimsRatePack(
  currentRates: AppraisalRateLibraryItem[]
): { rates: AppraisalRateLibraryItem[]; inserted: number; updated: number } {
  const packRates = createAwdPrelimsRatePack();
  const packIds = new Set(packRates.map((rate) => rate.id));
  const existingPackCount = currentRates.filter((rate) => packIds.has(rate.id)).length;
  const nonPackRates = currentRates.filter((rate) => !packIds.has(rate.id));

  return {
    rates: normalizeAppraisalRateLibraryItems([...packRates, ...nonPackRates]),
    inserted: packRates.length - existingPackCount,
    updated: existingPackCount,
  };
}
