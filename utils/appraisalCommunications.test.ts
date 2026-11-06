import { describe, expect, it } from 'vitest';
import { calculateSiteDimensionBaseTotal, createDefaultAppraisalOption, createManualHouseTypeScheduleRow, createSiteDimensionRowFromRate, normalizeDevelopmentAppraisalOption, siteAccommodationLinePresentation } from './appraisal';
import { createAwdPrelimsRatePack } from './appraisalInfrastructureRatePacks';

const ID = 'awd-prelims-electricity-phones-bt';

describe('site communications preliminary', () => {
  it('prices the two mobiles, Starlink subscription and incidental charges at £150 per programme month', () => {
    const rate = createAwdPrelimsRatePack().find(item => item.id === ID)!;
    expect(rate).toMatchObject({ label: 'Site communications — mobiles and Starlink', rate: 150, unit: 'month', costDriver: 'PROGRAMME_MONTHS' });
    const row = createSiteDimensionRowFromRate(rate);
    const option = { ...createDefaultAppraisalOption('RESIDENTIAL_SALES'),
      programme: { saleRateUnitsPerMonth: 1 },
      houseTypeSchedule: [createManualHouseTypeScheduleRow({ quantity: 1, buildPeriodMonths: 62 })] };
    expect(siteAccommodationLinePresentation(row, option)).toMatchObject({ quantity: 63, rate: 150 });
    expect(calculateSiteDimensionBaseTotal(row, option)).toBe(9_450);
    expect(siteAccommodationLinePresentation(row, option)?.notes).toContain('Excludes site-office and plot electricity');
  });

  it('migrates the old £800 combined line without duplicating it or losing its adjustment', () => {
    const rate = createAwdPrelimsRatePack().find(item => item.id === ID)!;
    const existing = { ...createSiteDimensionRowFromRate(rate), label: 'Electricity, phones, BT etc', rate: 800, manualAdjustment: -100 };
    const option = normalizeDevelopmentAppraisalOption({ ...createDefaultAppraisalOption('RESIDENTIAL_SALES'),
      programme: { saleRateUnitsPerMonth: 1 },
      houseTypeSchedule: [createManualHouseTypeScheduleRow({ quantity: 1, buildPeriodMonths: 62 })],
      siteDimensions: [existing] });
    const row = option.siteDimensions!.find(item => item.libraryRateId === ID)!;
    expect(row).toMatchObject({ id: existing.id, rate: 150, manualAdjustment: -100 });
    expect(calculateSiteDimensionBaseTotal(row, option)).toBe(9_450);
    const reopened = normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(option)));
    expect(reopened.siteDimensions!.filter(item => item.libraryRateId === ID)).toHaveLength(1);
  });
});
