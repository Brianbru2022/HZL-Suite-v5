import { describe, expect, it } from 'vitest';
import { calculateSiteDimensionBaseTotal, createDefaultAppraisalOption, createManualHouseTypeScheduleRow, createSiteDimensionRowFromRate, normalizeDevelopmentAppraisalOption, temporaryPowerReview } from './appraisal';
import { createAwdPrelimsRatePack } from './appraisalInfrastructureRatePacks';
import { DEFAULT_FUEL_ASSUMPTIONS, FUEL_ROW_IDS } from './appraisalFuel';
import { TEMPORARY_POWER_ROW_IDS } from './appraisalTemporaryPower';

describe('Prelims diesel fuel', () => {
  const pack = createAwdPrelimsRatePack();
  const row = (id: string) => createSiteDimensionRowFromRate(pack.find(item => item.id === id)!);

  it('uses active telehandler months and generator diesel months independently', () => {
    const telehandler = row(FUEL_ROW_IDS.telehandler);
    const generatorFuel = row(FUEL_ROW_IDS.accommodationGenerator);
    const powerRows = Object.values(TEMPORARY_POWER_ROW_IDS).map(row);
    const option = normalizeDevelopmentAppraisalOption({
      ...createDefaultAppraisalOption('RESIDENTIAL_SALES'),
      durationMonths: 12,
      programme: { leadInMonths: 2 },
      houseTypeSchedule: [createManualHouseTypeScheduleRow({ buildPeriodMonths: 10 })],
      prelimsResourceCounts: { forklifts: 2 },
      fuelAssumptions: DEFAULT_FUEL_ASSUMPTIONS,
      siteDimensions: [telehandler, generatorFuel, ...powerRows],
    });
    expect(temporaryPowerReview(option).dieselMonths).toBe(6);
    expect(calculateSiteDimensionBaseTotal(telehandler, option)).toBe(2 * 10 * 600);
    expect(calculateSiteDimensionBaseTotal(generatorFuel, option)).toBe(6 * 850);
    const reopened = normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(option)));
    expect(reopened.siteDimensions!.filter(item => item.libraryRateId === FUEL_ROW_IDS.accommodationGenerator)).toHaveLength(1);
    expect(calculateSiteDimensionBaseTotal(reopened.siteDimensions!.find(item => item.libraryRateId === FUEL_ROW_IDS.telehandler)!, reopened)).toBe(12000);
  });

  it('stops telehandler fuel when no forklifts are selected and retains generator fuel without mains', () => {
    const telehandler = row(FUEL_ROW_IDS.telehandler);
    const generatorFuel = row(FUEL_ROW_IDS.accommodationGenerator);
    const powerRows = Object.values(TEMPORARY_POWER_ROW_IDS).map(row);
    const option = normalizeDevelopmentAppraisalOption({
      ...createDefaultAppraisalOption('RESIDENTIAL_SALES'), durationMonths: 12,
      prelimsResourceCounts: { forklifts: 0 },
      temporaryPower: { generatorPurchase: 9000, tankPurchase: 3000, generatorHirePerWeek: 250, tankHirePerWeek: 50, mainsAvailable: false, mainsAvailableMonth: 6, permanentPowerCost: 3000 },
      siteDimensions: [telehandler, generatorFuel, ...powerRows],
    });
    expect(calculateSiteDimensionBaseTotal(telehandler, option)).toBe(0);
    expect(temporaryPowerReview(option).dieselMonths).toBe(12);
    expect(calculateSiteDimensionBaseTotal(generatorFuel, option)).toBe(10200);
  });
});
