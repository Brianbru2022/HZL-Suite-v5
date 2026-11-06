import { describe, expect, it } from 'vitest';
import { calculateSiteDimensionBaseTotal, createDefaultAppraisalOption, createManualHouseTypeScheduleRow, createSiteDimensionRowFromRate, normalizeDevelopmentAppraisalOption, siteAccommodationLinePresentation } from './appraisal';
import { createAwdPrelimsRatePack } from './appraisalInfrastructureRatePacks';

const ID = 'awd-prelims-general-repairs';

describe('General Repairs preliminary', () => {
  it('uses £200 per programme month for a new site', () => {
    const rate = createAwdPrelimsRatePack().find(item => item.id === ID)!;
    expect(rate).toMatchObject({ rate: 200, unit: 'month', costDriver: 'PROGRAMME_MONTHS' });
    const row = createSiteDimensionRowFromRate(rate);
    const option = { ...createDefaultAppraisalOption('RESIDENTIAL_SALES'),
      programme: { saleRateUnitsPerMonth: 1 },
      houseTypeSchedule: [createManualHouseTypeScheduleRow({ quantity: 1, buildPeriodMonths: 62 })] };
    expect(siteAccommodationLinePresentation(row, option)).toMatchObject({ quantity: 63, rate: 200 });
    expect(calculateSiteDimensionBaseTotal(row, option)).toBe(12_600);
  });

  it('updates an existing £400 row without losing its identity or adjustment', () => {
    const rate = createAwdPrelimsRatePack().find(item => item.id === ID)!;
    const existing = { ...createSiteDimensionRowFromRate(rate), rate: 400, manualAdjustment: -50 };
    const option = normalizeDevelopmentAppraisalOption({ ...createDefaultAppraisalOption('RESIDENTIAL_SALES'),
      programme: { saleRateUnitsPerMonth: 1 },
      houseTypeSchedule: [createManualHouseTypeScheduleRow({ quantity: 1, buildPeriodMonths: 62 })],
      siteDimensions: [existing] });
    const row = option.siteDimensions!.find(item => item.libraryRateId === ID)!;
    expect(row).toMatchObject({ id: existing.id, rate: 200, manualAdjustment: -50 });
    expect(calculateSiteDimensionBaseTotal(row, option)).toBe(12_600);
    const reopened = normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(option)));
    expect(reopened.siteDimensions!.filter(item => item.libraryRateId === ID)).toHaveLength(1);
  });
});
