import { describe, expect, it } from 'vitest';
import type { DevelopmentAppraisalOption } from '../types';
import {
  applyCommercialTemplateToOption,
  COMMERCIAL_APPRAISAL_TEMPLATES,
  commercialTemplateInputsForOption,
  defaultCommercialTemplateInputs,
  getCommercialTemplateSectors,
  getCommercialTemplatesBySector,
  isCommercialTemplateLine,
} from './commercialAppraisalTemplates';

function baseCommercialOption(): DevelopmentAppraisalOption {
  return {
    id: 'option-1',
    name: 'Base option',
    template: 'COMMERCIAL_INCOME',
    calculationMode: 'RESIDUAL_LAND_VALUE',
    durationMonths: 12,
    targetProfitOnGdvPercent: 20,
    financeAnnualRatePercent: 0,
    knownLandValue: 0,
    sellerMinimumLandValue: 0,
    revenueLines: [],
    costLines: [],
    recommended: false,
    assumptions: '',
    decisionNote: '',
    finalReportExecutiveSummary: '',
    finalReportSourceSignature: '',
    createdAt: '2026-07-02T00:00:00.000Z',
    updatedAt: '2026-07-02T00:00:00.000Z',
  };
}

describe('commercial appraisal templates', () => {
  it('provides self-contained commercial template rates and measurement bases', () => {
    expect(COMMERCIAL_APPRAISAL_TEMPLATES.length).toBeGreaterThanOrEqual(4);

    const template = COMMERCIAL_APPRAISAL_TEMPLATES.find((entry) => entry.id === 'HOTEL_TRAVELODGE_STYLE');
    expect(template).toBeTruthy();
    expect(template?.createdAt).toBe('2026-07-02');
    expect(template?.priceIndex).toBeGreaterThan(0);
    expect(template?.measures.map((measure) => measure.key)).toContain('grossFloorAreaM2');
    expect(template?.costElements.some((element) => element.category === 'EXTERNAL_WORKS' && element.basis === 'space')).toBe(true);
  });

  it('groups commercial templates by commercial type for scalable selection', () => {
    expect(getCommercialTemplateSectors()).toEqual(['Drive-through', 'Hotel']);
    expect(getCommercialTemplatesBySector('Hotel').map((template) => template.id)).toContain('HOTEL_TRAVELODGE_STYLE');
    expect(getCommercialTemplatesBySector('Drive-through').map((template) => template.id)).toEqual(['DRIVE_THRU_RESTAURANT']);
  });

  it('applies template-owned rows without using house types or rate-library rows', () => {
    const template = COMMERCIAL_APPRAISAL_TEMPLATES[0];
    const inputs = defaultCommercialTemplateInputs(template);
    const option = applyCommercialTemplateToOption(baseCommercialOption(), template.id, inputs);

    expect(option.commercialTemplateId).toBe(template.id);
    expect(option.commercialTemplateInputs).toEqual(inputs);
    expect(option.revenueLines).toHaveLength(1);
    expect(option.costLines.length).toBeGreaterThan(4);
    expect(option.revenueLines.every(isCommercialTemplateLine)).toBe(true);
    expect(option.costLines.every(isCommercialTemplateLine)).toBe(true);
    expect(option.costLines.some((line) => line.sourceLabel?.includes(template.indexLabel))).toBe(true);
    expect(option.houseTypeSchedule).toBeUndefined();
    expect(option.siteDimensions).toBeUndefined();
  });

  it('keeps edited commercial template inputs when rebuilding row values', () => {
    const template = COMMERCIAL_APPRAISAL_TEMPLATES[0];
    const option = applyCommercialTemplateToOption(baseCommercialOption(), template.id, {
      ...defaultCommercialTemplateInputs(template),
      bedrooms: 100,
    });

    const inputs = commercialTemplateInputsForOption(option);
    expect(inputs.bedrooms).toBe(100);
    expect(option.costLines.find((line) => line.title === 'Bedroom FF&E allowance')?.amount).toBe(850000);
  });
});
