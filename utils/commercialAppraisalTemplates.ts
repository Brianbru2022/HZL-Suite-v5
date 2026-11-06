import type {
  AppraisalCashflowProfile,
  AppraisalCostCategory,
  AppraisalCostLine,
  AppraisalRevenueLine,
  DevelopmentAppraisalOption,
} from '../types';

export type CommercialTemplateMeasureUnit = 'm2' | 'ft2' | 'nr' | 'spaces' | 'months';
export type CommercialTemplateRateBasis = 'm2' | 'ft2' | 'nr' | 'space' | 'month' | 'sum' | 'percent';

export type CommercialTemplateMeasure = {
  key: string;
  label: string;
  unit: CommercialTemplateMeasureUnit;
  defaultValue: number;
  helper: string;
};

export type CommercialTemplateCostElement = {
  key: string;
  title: string;
  category: AppraisalCostCategory;
  quantityKey?: string;
  quantityMultiplier?: number;
  rate: number;
  basis: CommercialTemplateRateBasis;
  percentageOf?: 'CONSTRUCTION_AND_EXTERNALS' | 'CONSTRUCTION_ONLY' | 'GDV';
  timing?: AppraisalCashflowProfile['type'];
  notes: string;
};

export type CommercialTemplateRevenue = {
  title: string;
  areaKey: string;
  rentRate: number;
  yieldPercent: number;
  voidPercent?: number;
  incentivePercent?: number;
  notes: string;
};

export type CommercialAppraisalTemplate = {
  id: string;
  name: string;
  shortName: string;
  sector: string;
  description: string;
  createdAt: string;
  priceIndex: number;
  indexLabel: string;
  measures: CommercialTemplateMeasure[];
  revenue: CommercialTemplateRevenue;
  costElements: CommercialTemplateCostElement[];
};

export const COMMERCIAL_TEMPLATE_LINE_PREFIX = 'commercial-template:';

export const COMMERCIAL_APPRAISAL_TEMPLATES: CommercialAppraisalTemplate[] = [
  {
    id: 'HOTEL_TRAVELODGE_STYLE',
    name: 'Hotel - Travelodge style',
    shortName: 'Travelodge style hotel',
    sector: 'Hotel',
    description: 'Budget hotel cost-plan template using bedroom count, gross floor area, site area, parking spaces, and programme duration.',
    createdAt: '2026-07-02',
    priceIndex: 260,
    indexLabel: 'Template index 260 at July 2026',
    measures: [
      { key: 'bedrooms', label: 'Bedrooms', unit: 'nr', defaultValue: 80, helper: 'Lettable hotel bedrooms.' },
      { key: 'grossFloorAreaM2', label: 'Gross floor area', unit: 'm2', defaultValue: 3600, helper: 'Total internal hotel floor area.' },
      { key: 'siteAreaM2', label: 'Site area', unit: 'm2', defaultValue: 6800, helper: 'Whole commercial site area.' },
      { key: 'parkingSpaces', label: 'Car parking spaces', unit: 'spaces', defaultValue: 80, helper: 'Parking spaces serving the hotel.' },
      { key: 'programmeMonths', label: 'Programme', unit: 'months', defaultValue: 14, helper: 'Construction period used for prelims.' },
    ],
    revenue: {
      title: 'Hotel investment value',
      areaKey: 'grossFloorAreaM2',
      rentRate: 165,
      yieldPercent: 5.75,
      voidPercent: 0,
      incentivePercent: 0,
      notes: 'Capitalised rental valuation generated from the template floor area, rent, and yield assumptions.',
    },
    costElements: [
      { key: 'building', title: 'Hotel building works', category: 'CONSTRUCTION', quantityKey: 'grossFloorAreaM2', rate: 1850, basis: 'm2', notes: 'Substructure, superstructure, envelope, MEP, and standard hotel fit-out allowance.' },
      { key: 'ff&e', title: 'Bedroom FF&E allowance', category: 'CONSTRUCTION', quantityKey: 'bedrooms', rate: 8500, basis: 'nr', notes: 'Loose furniture, bedroom equipment, signage, and operational fit-out allowance.' },
      { key: 'externals-site', title: 'External works - site works', category: 'EXTERNAL_WORKS', quantityKey: 'siteAreaM2', rate: 95, basis: 'm2', notes: 'General site preparation, drainage, services, hard landscaping, and external finishes.' },
      { key: 'externals-parking', title: 'External works - car parking', category: 'EXTERNAL_WORKS', quantityKey: 'parkingSpaces', rate: 2750, basis: 'space', notes: 'Car parking bay construction, kerbs, markings, lighting distribution, and local drainage.' },
      { key: 'prelims', title: 'Preliminaries', category: 'OTHER', quantityKey: 'programmeMonths', rate: 82000, basis: 'month', notes: 'Site management, welfare, temporary services, supervision, and temporary works over the programme.' },
      { key: 'design', title: 'Design and professional fees', category: 'PROFESSIONAL_FEES', rate: 8, basis: 'percent', percentageOf: 'CONSTRUCTION_AND_EXTERNALS', timing: 'EVEN', notes: 'Architect, engineer, M&E, planning, QS, and statutory design support allowance.' },
      { key: 'contingency', title: 'Commercial contingency', category: 'CONTINGENCY', rate: 5, basis: 'percent', percentageOf: 'CONSTRUCTION_AND_EXTERNALS', timing: 'EVEN', notes: 'Commercial risk allowance applied to construction and external works.' },
    ],
  },
  {
    id: 'HOTEL_PREMIER_INN_STYLE',
    name: 'Hotel - Premier Inn style',
    shortName: 'Premier Inn style hotel',
    sector: 'Hotel',
    description: 'Budget-plus hotel template with a higher fit-out and external works allowance than the base budget hotel profile.',
    createdAt: '2026-07-02',
    priceIndex: 260,
    indexLabel: 'Template index 260 at July 2026',
    measures: [
      { key: 'bedrooms', label: 'Bedrooms', unit: 'nr', defaultValue: 90, helper: 'Lettable hotel bedrooms.' },
      { key: 'grossFloorAreaM2', label: 'Gross floor area', unit: 'm2', defaultValue: 4300, helper: 'Total internal hotel floor area.' },
      { key: 'siteAreaM2', label: 'Site area', unit: 'm2', defaultValue: 7600, helper: 'Whole commercial site area.' },
      { key: 'parkingSpaces', label: 'Car parking spaces', unit: 'spaces', defaultValue: 95, helper: 'Parking spaces serving the hotel.' },
      { key: 'programmeMonths', label: 'Programme', unit: 'months', defaultValue: 15, helper: 'Construction period used for prelims.' },
    ],
    revenue: {
      title: 'Hotel investment value',
      areaKey: 'grossFloorAreaM2',
      rentRate: 175,
      yieldPercent: 5.5,
      notes: 'Capitalised rental valuation generated from the template floor area, rent, and yield assumptions.',
    },
    costElements: [
      { key: 'building', title: 'Hotel building works', category: 'CONSTRUCTION', quantityKey: 'grossFloorAreaM2', rate: 1975, basis: 'm2', notes: 'Substructure, superstructure, envelope, MEP, and enhanced budget hotel fit-out allowance.' },
      { key: 'ff&e', title: 'Bedroom FF&E allowance', category: 'CONSTRUCTION', quantityKey: 'bedrooms', rate: 9800, basis: 'nr', notes: 'Bedroom furniture, operational equipment, signage, and brand fit-out allowance.' },
      { key: 'externals-site', title: 'External works - site works', category: 'EXTERNAL_WORKS', quantityKey: 'siteAreaM2', rate: 105, basis: 'm2', notes: 'General external works including drainage, services, access, and hard landscaping.' },
      { key: 'externals-parking', title: 'External works - car parking', category: 'EXTERNAL_WORKS', quantityKey: 'parkingSpaces', rate: 3000, basis: 'space', notes: 'Car parking bay construction, markings, lighting distribution, and local drainage.' },
      { key: 'prelims', title: 'Preliminaries', category: 'OTHER', quantityKey: 'programmeMonths', rate: 90000, basis: 'month', notes: 'Site management, welfare, temporary services, supervision, and temporary works over the programme.' },
      { key: 'design', title: 'Design and professional fees', category: 'PROFESSIONAL_FEES', rate: 8.5, basis: 'percent', percentageOf: 'CONSTRUCTION_AND_EXTERNALS', notes: 'Professional team and statutory design allowance.' },
      { key: 'contingency', title: 'Commercial contingency', category: 'CONTINGENCY', rate: 5, basis: 'percent', percentageOf: 'CONSTRUCTION_AND_EXTERNALS', notes: 'Commercial risk allowance applied to construction and external works.' },
    ],
  },
  {
    id: 'HOTEL_UPPER_MIDSCALE',
    name: 'Hotel - upper midscale',
    shortName: 'Upper midscale hotel',
    sector: 'Hotel',
    description: 'Higher specification hotel template with higher building, fit-out, professional fee, and contingency allowances.',
    createdAt: '2026-07-02',
    priceIndex: 260,
    indexLabel: 'Template index 260 at July 2026',
    measures: [
      { key: 'bedrooms', label: 'Bedrooms', unit: 'nr', defaultValue: 110, helper: 'Lettable hotel bedrooms.' },
      { key: 'grossFloorAreaM2', label: 'Gross floor area', unit: 'm2', defaultValue: 6200, helper: 'Total internal hotel floor area.' },
      { key: 'siteAreaM2', label: 'Site area', unit: 'm2', defaultValue: 9000, helper: 'Whole commercial site area.' },
      { key: 'parkingSpaces', label: 'Car parking spaces', unit: 'spaces', defaultValue: 120, helper: 'Parking spaces serving the hotel.' },
      { key: 'programmeMonths', label: 'Programme', unit: 'months', defaultValue: 18, helper: 'Construction period used for prelims.' },
    ],
    revenue: {
      title: 'Hotel investment value',
      areaKey: 'grossFloorAreaM2',
      rentRate: 225,
      yieldPercent: 5.25,
      notes: 'Capitalised rental valuation generated from the template floor area, rent, and yield assumptions.',
    },
    costElements: [
      { key: 'building', title: 'Hotel building works', category: 'CONSTRUCTION', quantityKey: 'grossFloorAreaM2', rate: 2450, basis: 'm2', notes: 'Higher specification hotel shell, MEP, public areas, and fitted rooms allowance.' },
      { key: 'ff&e', title: 'Bedroom FF&E allowance', category: 'CONSTRUCTION', quantityKey: 'bedrooms', rate: 14500, basis: 'nr', notes: 'Enhanced loose furniture, equipment, signage, and operational fit-out allowance.' },
      { key: 'externals-site', title: 'External works - site works', category: 'EXTERNAL_WORKS', quantityKey: 'siteAreaM2', rate: 135, basis: 'm2', notes: 'Enhanced siteworks, drainage, services, hard landscaping, and external finishes.' },
      { key: 'externals-parking', title: 'External works - car parking', category: 'EXTERNAL_WORKS', quantityKey: 'parkingSpaces', rate: 3400, basis: 'space', notes: 'Car parking bay construction, markings, lighting distribution, and local drainage.' },
      { key: 'prelims', title: 'Preliminaries', category: 'OTHER', quantityKey: 'programmeMonths', rate: 112000, basis: 'month', notes: 'Site management, welfare, temporary services, supervision, and temporary works over the programme.' },
      { key: 'design', title: 'Design and professional fees', category: 'PROFESSIONAL_FEES', rate: 10, basis: 'percent', percentageOf: 'CONSTRUCTION_AND_EXTERNALS', notes: 'Professional team and statutory design allowance for a higher specification hotel.' },
      { key: 'contingency', title: 'Commercial contingency', category: 'CONTINGENCY', rate: 6, basis: 'percent', percentageOf: 'CONSTRUCTION_AND_EXTERNALS', notes: 'Commercial risk allowance applied to construction and external works.' },
    ],
  },
  {
    id: 'DRIVE_THRU_RESTAURANT',
    name: 'Drive-through restaurant',
    shortName: 'Drive-through restaurant',
    sector: 'Drive-through',
    description: 'Drive-through restaurant template using gross internal area, site area, parking spaces, drive-through lanes, and programme.',
    createdAt: '2026-07-02',
    priceIndex: 260,
    indexLabel: 'Template index 260 at July 2026',
    measures: [
      { key: 'grossFloorAreaM2', label: 'Gross floor area', unit: 'm2', defaultValue: 320, helper: 'Restaurant building gross internal area.' },
      { key: 'siteAreaM2', label: 'Site area', unit: 'm2', defaultValue: 2300, helper: 'Whole site including building, parking, lanes, and landscaping.' },
      { key: 'parkingSpaces', label: 'Car parking spaces', unit: 'spaces', defaultValue: 32, helper: 'Customer and staff parking spaces.' },
      { key: 'driveThruLanes', label: 'Drive-through lanes', unit: 'nr', defaultValue: 1, helper: 'Ordering and collection lanes.' },
      { key: 'programmeMonths', label: 'Programme', unit: 'months', defaultValue: 6, helper: 'Construction period used for prelims.' },
    ],
    revenue: {
      title: 'Drive-through investment value',
      areaKey: 'grossFloorAreaM2',
      rentRate: 420,
      yieldPercent: 5.25,
      notes: 'Capitalised rental valuation generated from the template floor area, rent, and yield assumptions.',
    },
    costElements: [
      { key: 'building', title: 'Restaurant building works', category: 'CONSTRUCTION', quantityKey: 'grossFloorAreaM2', rate: 2850, basis: 'm2', notes: 'Restaurant shell, envelope, services, kitchen shell provision, and base fit-out allowance.' },
      { key: 'externals-site', title: 'External works - site works', category: 'EXTERNAL_WORKS', quantityKey: 'siteAreaM2', rate: 155, basis: 'm2', notes: 'General external works, service yards, hard landscaping, drainage, and incoming services.' },
      { key: 'externals-parking', title: 'External works - car parking', category: 'EXTERNAL_WORKS', quantityKey: 'parkingSpaces', rate: 3250, basis: 'space', notes: 'Parking bay construction, kerbing, markings, lighting distribution, and local drainage.' },
      { key: 'drive-lanes', title: 'Drive-through lane works', category: 'EXTERNAL_WORKS', quantityKey: 'driveThruLanes', rate: 95000, basis: 'nr', notes: 'Lane construction, order point civils, collection point civils, markings, and local services allowance.' },
      { key: 'prelims', title: 'Preliminaries', category: 'OTHER', quantityKey: 'programmeMonths', rate: 42000, basis: 'month', notes: 'Site management, welfare, temporary services, supervision, and temporary works over the programme.' },
      { key: 'design', title: 'Design and professional fees', category: 'PROFESSIONAL_FEES', rate: 9, basis: 'percent', percentageOf: 'CONSTRUCTION_AND_EXTERNALS', notes: 'Professional team, planning support, engineering, and statutory design allowance.' },
      { key: 'contingency', title: 'Commercial contingency', category: 'CONTINGENCY', rate: 6, basis: 'percent', percentageOf: 'CONSTRUCTION_AND_EXTERNALS', notes: 'Commercial risk allowance applied to construction and external works.' },
    ],
  },
];

function profile(type: AppraisalCashflowProfile['type'], durationMonths: number): AppraisalCashflowProfile {
  return {
    type,
    startMonth: 1,
    endMonth: Math.max(1, Math.round(durationMonths || 1)),
  };
}

function inputValue(template: CommercialAppraisalTemplate, inputs: Record<string, number> | undefined, key: string): number {
  const source = inputs?.[key];
  if (Number.isFinite(source) && source > 0) return source;
  return template.measures.find((measure) => measure.key === key)?.defaultValue || 0;
}

function elementQuantity(template: CommercialAppraisalTemplate, element: CommercialTemplateCostElement, inputs: Record<string, number> | undefined): number {
  if (!element.quantityKey) return 1;
  return inputValue(template, inputs, element.quantityKey) * (element.quantityMultiplier || 1);
}

function fixedCostElements(template: CommercialAppraisalTemplate, inputs: Record<string, number> | undefined) {
  return template.costElements.filter((element) => !element.percentageOf).map((element) => {
    const quantity = elementQuantity(template, element, inputs);
    return {
      element,
      quantity,
      amount: quantity * element.rate,
    };
  });
}

function percentageBasisAmount(template: CommercialAppraisalTemplate, inputs: Record<string, number> | undefined, basis: CommercialTemplateCostElement['percentageOf']): number {
  const fixedRows = fixedCostElements(template, inputs);
  if (basis === 'CONSTRUCTION_ONLY') {
    return fixedRows.filter((row) => row.element.category === 'CONSTRUCTION').reduce((total, row) => total + row.amount, 0);
  }
  if (basis === 'CONSTRUCTION_AND_EXTERNALS') {
    return fixedRows
      .filter((row) => row.element.category === 'CONSTRUCTION' || row.element.category === 'EXTERNAL_WORKS')
      .reduce((total, row) => total + row.amount, 0);
  }
  return 0;
}

function formatTemplateQuantity(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: value % 1 === 0 ? 0 : 2 });
}

function formatTemplateRate(value: number, basis: CommercialTemplateRateBasis) {
  if (basis === 'percent') return `${formatTemplateQuantity(value)}%`;
  return `GBP ${formatTemplateQuantity(value)} / ${basis}`;
}

function lineId(template: CommercialAppraisalTemplate, kind: 'revenue' | 'cost', key: string) {
  return `${COMMERCIAL_TEMPLATE_LINE_PREFIX}${template.id}:${kind}:${key}`;
}

export function getCommercialAppraisalTemplate(templateId: string | undefined): CommercialAppraisalTemplate {
  return COMMERCIAL_APPRAISAL_TEMPLATES.find((template) => template.id === templateId) || COMMERCIAL_APPRAISAL_TEMPLATES[0];
}

export function getCommercialTemplateSectors(): string[] {
  return Array.from(new Set(COMMERCIAL_APPRAISAL_TEMPLATES.map((template) => template.sector))).sort((a, b) => a.localeCompare(b));
}

export function getCommercialTemplatesBySector(sector: string | undefined): CommercialAppraisalTemplate[] {
  const sectors = getCommercialTemplateSectors();
  const selectedSector = sector && sectors.includes(sector) ? sector : sectors[0];
  return COMMERCIAL_APPRAISAL_TEMPLATES.filter((template) => template.sector === selectedSector);
}

export function getCommercialTemplateSector(templateId: string | undefined): string {
  return getCommercialAppraisalTemplate(templateId).sector;
}

export function defaultCommercialTemplateInputs(template: CommercialAppraisalTemplate): Record<string, number> {
  return Object.fromEntries(template.measures.map((measure) => [measure.key, measure.defaultValue]));
}

export function commercialTemplateInputsForOption(option: Pick<DevelopmentAppraisalOption, 'commercialTemplateId' | 'commercialTemplateInputs'>): Record<string, number> {
  const template = getCommercialAppraisalTemplate(option.commercialTemplateId);
  return {
    ...defaultCommercialTemplateInputs(template),
    ...(option.commercialTemplateInputs || {}),
  };
}

export function isCommercialTemplateLine(line: Pick<AppraisalCostLine | AppraisalRevenueLine, 'id'>) {
  return line.id.startsWith(COMMERCIAL_TEMPLATE_LINE_PREFIX);
}

export function buildCommercialTemplateRevenueLine(
  template: CommercialAppraisalTemplate,
  inputs: Record<string, number>,
  durationMonths: number
): AppraisalRevenueLine {
  return {
    id: lineId(template, 'revenue', 'income'),
    title: template.revenue.title,
    template: 'COMMERCIAL_INCOME',
    area: inputValue(template, inputs, template.revenue.areaKey),
    rentRate: template.revenue.rentRate,
    yieldPercent: template.revenue.yieldPercent,
    voidPercent: template.revenue.voidPercent || 0,
    incentivePercent: template.revenue.incentivePercent || 0,
    manualValue: 0,
    cashflow: profile('END', durationMonths),
    notes: `${template.revenue.notes} ${template.indexLabel}.`,
  };
}

export function buildCommercialTemplateCostLines(
  template: CommercialAppraisalTemplate,
  inputs: Record<string, number>,
  durationMonths: number
): AppraisalCostLine[] {
  return template.costElements.map((element) => {
    const quantity = elementQuantity(template, element, inputs);
    const percentageBasis = element.percentageOf;
    const amount = percentageBasis
      ? percentageBasisAmount(template, inputs, percentageBasis) * (element.rate / 100)
      : quantity * element.rate;
    const basisNote = percentageBasis
      ? `${formatTemplateRate(element.rate, element.basis)} applied to ${percentageBasis.toLowerCase().replace(/_/g, ' ')}.`
      : `${formatTemplateQuantity(quantity)} ${element.basis} x ${formatTemplateRate(element.rate, element.basis)}.`;
    return {
      id: lineId(template, 'cost', element.key),
      title: element.title,
      category: element.category,
      amount,
      percentageBasis: 'NONE',
      percentageValue: 0,
      cashflow: profile(element.timing || 'EVEN', durationMonths),
      sourceLabel: `${template.shortName} commercial template - ${template.indexLabel}`,
      notes: `${basisNote} ${element.notes} Template created ${template.createdAt}; base price index ${template.priceIndex}.`,
    };
  });
}

export function applyCommercialTemplateToOption(
  option: DevelopmentAppraisalOption,
  templateId: string,
  inputs: Record<string, number>
): DevelopmentAppraisalOption {
  const template = getCommercialAppraisalTemplate(templateId);
  const mergedInputs = {
    ...defaultCommercialTemplateInputs(template),
    ...inputs,
  };
  const revenueLine = buildCommercialTemplateRevenueLine(template, mergedInputs, option.durationMonths);
  const costLines = buildCommercialTemplateCostLines(template, mergedInputs, option.durationMonths);
  const timestamp = new Date().toISOString();
  const templateAssetId = `commercial-template-asset-${template.id}`;
  return {
    ...option,
    commercialTemplateId: template.id,
    commercialTemplateInputs: mergedInputs,
    revenueLines: [
      ...option.revenueLines.filter((line) => !isCommercialTemplateLine(line)),
      revenueLine,
    ],
    costLines: [
      ...option.costLines.filter((line) => !isCommercialTemplateLine(line)),
      ...costLines,
    ],
    commercialAssets: [
      ...(option.commercialAssets || []).filter((asset) => asset.source !== 'TEMPLATE'),
      {
        id: templateAssetId,
        title: template.shortName,
        description: template.description,
        source: 'TEMPLATE',
        included: true,
        revenueModel: 'LEASE',
        siteAllocationM2: inputValue(template, mergedInputs, 'grossFloorAreaM2'),
        revenueLineIds: [revenueLine.id],
        costLineIds: costLines.map((line) => line.id),
        exitYieldPercent: template.revenue.yieldPercent,
        rationale: template.revenue.notes,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  };
}
