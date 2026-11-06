import { describe, expect, it } from 'vitest';
import {
  APPRAISAL_HOUSE_TYPE_STANDARD_COMPONENT_AMOUNTS,
  calculateHouseTypeCostBreakdownTotal,
  createDefaultAppraisalHouseType,
} from './appraisal';
import {
  APPRAISAL_HOUSE_TYPE_DEFAULT_BUILD_MONTHS,
  APPRAISAL_HOUSE_TYPE_DETAILED_DEFAULTS,
  APPRAISAL_HOUSE_TYPE_DEFAULT_PRICE_INDEX,
  buildDetailedDefaultCostBreakdown,
  mergeAppraisalHouseTypeCostDefaults,
} from './appraisalHouseTypeDefaults';

describe('appraisal house type detailed defaults', () => {
  const standardLowCarbonTotal = (APPRAISAL_HOUSE_TYPE_STANDARD_COMPONENT_AMOUNTS.EV_CHARGERS || 0)
    + (APPRAISAL_HOUSE_TYPE_STANDARD_COMPONENT_AMOUNTS.AIR_SOURCE_HEAT_PUMPS || 0);

  it('keeps every standard house type within the source-table rounding variance', () => {
    APPRAISAL_HOUSE_TYPE_DETAILED_DEFAULTS.forEach((row) => {
      const componentTotal = calculateHouseTypeCostBreakdownTotal(buildDetailedDefaultCostBreakdown(row));
      expect(Math.abs(componentTotal - (row.totalCost + standardLowCarbonTotal)), row.name).toBeLessThanOrEqual(5);
    });
  });

  it('loads all detailed house type defaults into an empty library', () => {
    const result = mergeAppraisalHouseTypeCostDefaults([]);
    const morvenMid = result.houseTypes.find((houseType) => houseType.name === 'Morven Mid');

    expect(result.inserted).toBe(APPRAISAL_HOUSE_TYPE_DETAILED_DEFAULTS.length);
    expect(result.updated).toBe(0);
    expect(morvenMid).toBeDefined();
    expect(result.houseTypes.some((houseType) => houseType.name.startsWith('x'))).toBe(false);
    expect(result.houseTypes.some((houseType) => houseType.name === 'J5-8 End Terrace')).toBe(true);
    expect(result.houseTypes.some((houseType) => houseType.name === 'J5-8 Mid Terrace')).toBe(true);
    expect(result.houseTypes.some((houseType) => houseType.name === '5-8')).toBe(false);
    expect(result.houseTypes.some((houseType) => houseType.name === 'x5-8')).toBe(false);
    expect(result.houseTypes.some((houseType) => houseType.name === 'Spey')).toBe(false);
    expect(result.houseTypes.every((houseType) => houseType.priceIndex === 0)).toBe(true);
    expect(result.houseTypes.every((houseType) => houseType.costBreakdown?.every(
      (component) => component.priceIndex === APPRAISAL_HOUSE_TYPE_DEFAULT_PRICE_INDEX,
    ))).toBe(true);
    expect(result.houseTypes.every((houseType) => houseType.buildPeriodMonths === APPRAISAL_HOUSE_TYPE_DEFAULT_BUILD_MONTHS)).toBe(true);
    expect(morvenMid?.style).toBe('VILLA');
    expect(morvenMid?.configuration).toBe('MID_TERRACE');
    expect(morvenMid?.storeys).toBe(2);
    expect(morvenMid?.bedrooms).toBe(3);
    expect(morvenMid?.garage).toBe(false);
    expect(morvenMid?.privateDrive).toBe(false);
    expect(morvenMid?.gifaM2).toBe(69);
    expect(calculateHouseTypeCostBreakdownTotal(morvenMid?.costBreakdown)).toBe(76650);
    expect(morvenMid?.costBreakdown?.find((component) => component.key === 'PLUMBING')?.amount).toBe(7757);
    expect(morvenMid?.costBreakdown?.find((component) => component.key === 'EV_CHARGERS')?.amount).toBe(1000);
    expect(morvenMid?.costBreakdown?.find((component) => component.key === 'AIR_SOURCE_HEAT_PUMPS')?.amount).toBe(4000);
    expect(morvenMid?.costBreakdown?.find((component) => component.key === 'EV_CHARGERS')?.included).toBe(true);
    expect(morvenMid?.costBreakdown?.find((component) => component.key === 'AIR_SOURCE_HEAT_PUMPS')?.included).toBe(true);
  });

  it('updates matching house types by name from the AWD workbook while preserving user notes', () => {
    const existing = createDefaultAppraisalHouseType({
      name: 'Morven Mid',
      gifaM2: 69,
      buildCostPerM2: 1600,
      priceIndex: 190,
      buildPeriodMonths: 9,
      notes: 'User note',
    });

    const result = mergeAppraisalHouseTypeCostDefaults([existing]);
    const morvenMid = result.houseTypes.find((houseType) => houseType.name === 'Morven Mid');

    expect(result.inserted).toBe(APPRAISAL_HOUSE_TYPE_DETAILED_DEFAULTS.length - 1);
    expect(result.updated).toBe(1);
    expect(morvenMid?.gifaM2).toBe(69);
    expect(morvenMid?.style).toBe('VILLA');
    expect(morvenMid?.configuration).toBe('MID_TERRACE');
    expect(morvenMid?.bedrooms).toBe(3);
    expect(morvenMid?.priceIndex).toBe(0);
    expect(morvenMid?.costBreakdown?.every(
      (component) => component.priceIndex === APPRAISAL_HOUSE_TYPE_DEFAULT_PRICE_INDEX,
    )).toBe(true);
    expect(morvenMid?.buildPeriodMonths).toBe(APPRAISAL_HOUSE_TYPE_DEFAULT_BUILD_MONTHS);
    expect(morvenMid?.notes).toBe('User note');
    expect(morvenMid?.buildCostPerM2).toBeCloseTo(76650 / 69, 4);
  });

  it('does not remove duplicate user rows that share a seeded house type name', () => {
    const first = createDefaultAppraisalHouseType({ id: 'first', name: 'Morven Mid', gifaM2: 69 });
    const duplicate = createDefaultAppraisalHouseType({ id: 'duplicate', name: 'Morven Mid', gifaM2: 75, notes: 'Duplicate option' });

    const result = mergeAppraisalHouseTypeCostDefaults([first, duplicate]);

    expect(result.houseTypes.some((houseType) => houseType.id === 'duplicate')).toBe(true);
    expect(result.houseTypes.find((houseType) => houseType.id === 'duplicate')?.notes).toBe('Duplicate option');
  });

  it('renames legacy x-prefixed seeded house types when loading defaults again', () => {
    const legacy = createDefaultAppraisalHouseType({
      id: 'legacy-xf4',
      name: 'xF4-6',
      gifaM2: 70,
      priceIndex: 180,
      buildPeriodMonths: 10,
      notes: 'Keep me',
    });

    const result = mergeAppraisalHouseTypeCostDefaults([legacy]);
    const renamed = result.houseTypes.find((houseType) => houseType.id === 'legacy-xf4');

    expect(result.updated).toBe(1);
    expect(renamed?.name).toBe('F4-6 Mid Terrace');
    expect(renamed?.gifaM2).toBe(112);
    expect(result.houseTypes.some((houseType) => houseType.name === 'F4-6 End Terrace')).toBe(true);
    expect(renamed?.priceIndex).toBe(0);
    expect(renamed?.costBreakdown?.every(
      (component) => component.priceIndex === APPRAISAL_HOUSE_TYPE_DEFAULT_PRICE_INDEX,
    )).toBe(true);
    expect(renamed?.buildPeriodMonths).toBe(APPRAISAL_HOUSE_TYPE_DEFAULT_BUILD_MONTHS);
    expect(renamed?.notes).toBe('Keep me');
    expect(result.houseTypes.some((houseType) => houseType.name === 'xF4-6')).toBe(false);
  });

  it('drops old x-prefixed seeded duplicates when the corrected name already exists', () => {
    const corrected = createDefaultAppraisalHouseType({ id: 'corrected', name: 'F4-6 Mid Terrace' });
    const legacy = createDefaultAppraisalHouseType({ id: 'legacy', name: 'xF4-6' });

    const result = mergeAppraisalHouseTypeCostDefaults([corrected, legacy]);

    expect(result.houseTypes.some((houseType) => houseType.id === 'corrected')).toBe(true);
    expect(result.houseTypes.some((houseType) => houseType.id === 'legacy')).toBe(false);
  });

  it('splits any remaining generic terrace library row into end and mid terrace variants', () => {
    const terrace = createDefaultAppraisalHouseType({
      id: 'custom-terrace',
      name: 'Custom Terrace',
      configuration: 'TERRACE',
      gifaM2: 90,
      buildCostPerM2: 1500,
      costBreakdown: [],
    });

    const result = mergeAppraisalHouseTypeCostDefaults([terrace]);

    expect(result.houseTypes.some((houseType) => houseType.name === 'Custom Terrace')).toBe(false);
    expect(result.houseTypes.find((houseType) => houseType.name === 'Custom End Terrace')?.configuration).toBe('END_TERRACE');
    expect(result.houseTypes.find((houseType) => houseType.name === 'Custom Mid Terrace')?.configuration).toBe('MID_TERRACE');
  });
});
