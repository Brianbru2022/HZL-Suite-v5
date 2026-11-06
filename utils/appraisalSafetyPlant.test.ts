import { describe, expect, it } from 'vitest';
import { calculateSiteDimensionBaseTotal, createDefaultAppraisalOption, createSiteDimensionRowFromRate, normalizeDevelopmentAppraisalOption, resolveSiteDimensionQuantity, SAFETY_PLANT_ROW_IDS, safetyPlantLinePresentation, safetyPlantReview, siteAccommodationLinePresentation } from './appraisal';
import { createAwdPrelimsRatePack } from './appraisalInfrastructureRatePacks';

describe('Prelims H&S and small-plant allowances', () => {
  const pack = createAwdPrelimsRatePack();
  const row = (id: string) => createSiteDimensionRowFromRate(pack.find(item => item.id === id)!);

  it('does not recalculate the programme for unrelated appraisal rows', () => {
    const unrelated = { ...row(SAFETY_PLANT_ROW_IDS.smallPlant), libraryRateId: 'awd-prelims-cabins' };
    const inaccessibleOption = new Proxy({} as ReturnType<typeof createDefaultAppraisalOption>, {
      get: () => { throw new Error('Unrelated rows must not read programme data'); },
    });
    expect(safetyPlantLinePresentation(unrelated, inaccessibleOption)).toBeNull();
    expect(siteAccommodationLinePresentation(unrelated, inaccessibleOption)).toBeNull();
  });

  it('updates legacy H&S to £200/month, retains £150/month plant, and leaves external visits unselected', () => {
    const legacySafety = { ...row(SAFETY_PLANT_ROW_IDS.healthAndSafety), rate: 637.5 };
    const smallPlant = row(SAFETY_PLANT_ROW_IDS.smallPlant);
    const option = normalizeDevelopmentAppraisalOption({
      ...createDefaultAppraisalOption('RESIDENTIAL_SALES'),
      durationMonths: 63,
      siteDimensions: [legacySafety, smallPlant],
    });
    const inspectionRows = option.siteDimensions!.filter(item => item.libraryRateId === SAFETY_PLANT_ROW_IDS.externalInspections);
    expect(inspectionRows).toHaveLength(1);
    expect(safetyPlantReview(option).months).toBe(63);
    expect(calculateSiteDimensionBaseTotal(legacySafety, option)).toBe(12600);
    expect(calculateSiteDimensionBaseTotal(smallPlant, option)).toBe(9450);
    expect(calculateSiteDimensionBaseTotal(inspectionRows[0], option)).toBe(0);
    expect(12600 + 9450).toBe(22050);
    const reopened = normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(option)));
    expect(reopened.siteDimensions!.filter(item => item.libraryRateId === SAFETY_PLANT_ROW_IDS.externalInspections)).toHaveLength(1);
  });

  it('does not retain a separate £637.50/month generic consumables charge alongside H&S and Small Plant', () => {
    const consumables = { ...row('awd-prelims-consumables'), rate: 637.5 };
    const option = normalizeDevelopmentAppraisalOption({
      ...createDefaultAppraisalOption('RESIDENTIAL_SALES'),
      durationMonths: 12,
      siteDimensions: [consumables, row(SAFETY_PLANT_ROW_IDS.healthAndSafety), row(SAFETY_PLANT_ROW_IDS.smallPlant)],
    });
    const corrected = option.siteDimensions!.find(item => item.libraryRateId === 'awd-prelims-consumables')!;
    expect(corrected.rate).toBe(0);
    expect(calculateSiteDimensionBaseTotal(corrected, option)).toBe(0);
    expect(calculateSiteDimensionBaseTotal(option.siteDimensions!.find(item => item.libraryRateId === SAFETY_PLANT_ROW_IDS.healthAndSafety)!, option)).toBe(2_400);
  });

  it('charges selected visits separately and preserves edited frequency and rate after reopen', () => {
    const option = normalizeDevelopmentAppraisalOption({
      ...createDefaultAppraisalOption('RESIDENTIAL_SALES'), durationMonths: 12,
      siteDimensions: [row(SAFETY_PLANT_ROW_IDS.healthAndSafety), row(SAFETY_PLANT_ROW_IDS.smallPlant)],
      safetyPlantAssumptions: { externalInspectionsRequired: true, inspectionVisitsPerMonth: 2, inspectionRatePerVisit: 225 },
    });
    const inspection = option.siteDimensions!.find(item => item.libraryRateId === SAFETY_PLANT_ROW_IDS.externalInspections)!;
    expect(resolveSiteDimensionQuantity(inspection, option)).toBe(24);
    expect(calculateSiteDimensionBaseTotal(inspection, option)).toBe(5400);
    const reopened = normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(option)));
    expect(reopened.safetyPlantAssumptions).toEqual({ externalInspectionsRequired: true, inspectionVisitsPerMonth: 2, inspectionRatePerVisit: 225 });
    expect(calculateSiteDimensionBaseTotal(reopened.siteDimensions!.find(item => item.libraryRateId === SAFETY_PLANT_ROW_IDS.externalInspections)!, reopened)).toBe(5400);
  });
});
