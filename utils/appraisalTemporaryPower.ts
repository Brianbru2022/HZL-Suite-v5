import type { AppraisalTemporaryPowerAssumptions } from '../types';

export const DEFAULT_TEMPORARY_POWER: AppraisalTemporaryPowerAssumptions = {
  generatorPurchase: 9000,
  tankPurchase: 3000,
  generatorHirePerWeek: 250,
  tankHirePerWeek: 50,
  mainsAvailable: true,
  mainsAvailableMonth: 6,
  permanentPowerCost: 3000,
  mainsElectricityKwhPerMonth: 1200,
  mainsElectricityRatePerKwh: 0.25,
};

export const TEMPORARY_POWER_ROW_IDS = {
  generator: 'awd-prelims-generator-accommodation',
  tank: 'awd-prelims-bowser-accommodation',
  mains: 'awd-prelims-permanent-power',
  mainsElectricity: 'awd-prelims-site-office-mains-electricity',
} as const;
export const ADDITIONAL_SITE_POWER_ROW_IDS = {
  generator: 'awd-prelims-generator-site-prelims',
  tank: 'awd-prelims-bowser-site-prelims',
} as const;

export function normalizeTemporaryPower(value: unknown): AppraisalTemporaryPowerAssumptions {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const amount = (key: keyof AppraisalTemporaryPowerAssumptions) => {
    const given = source[key];
    return typeof given === 'number' && Number.isFinite(given) && given >= 0
      ? given : DEFAULT_TEMPORARY_POWER[key] as number;
  };
  return {
    generatorPurchase: amount('generatorPurchase'),
    tankPurchase: amount('tankPurchase'),
    generatorHirePerWeek: amount('generatorHirePerWeek'),
    tankHirePerWeek: amount('tankHirePerWeek'),
    mainsAvailable: typeof source.mainsAvailable === 'boolean' ? source.mainsAvailable : true,
    mainsAvailableMonth: amount('mainsAvailableMonth'),
    permanentPowerCost: amount('permanentPowerCost'),
    mainsElectricityKwhPerMonth: amount('mainsElectricityKwhPerMonth'),
    mainsElectricityRatePerKwh: amount('mainsElectricityRatePerKwh'),
  };
}

export type TemporaryPowerStrategy = 'PURCHASE_FULL' | 'HIRE_FULL' | 'PURCHASE_THEN_MAINS' | 'HIRE_THEN_MAINS';

export interface TemporaryPowerReview {
  strategy: TemporaryPowerStrategy;
  dieselMonths: number;
  generator: number;
  tank: number;
  mains: number;
  generatorFuel: number;
  mainsMonths: number;
  mainsElectricity: number;
  equipmentTotal: number;
  total: number;
  candidates: Array<{ strategy: TemporaryPowerStrategy; total: number }>;
}

export function calculateTemporaryPowerReview(
  programmeMonths: number,
  input?: AppraisalTemporaryPowerAssumptions,
  canUseMains = true,
  generatorFuelMonthly = 850,
): TemporaryPowerReview {
  const settings = normalizeTemporaryPower(input);
  const months = Math.max(0, Number.isFinite(programmeMonths) ? programmeMonths : 0);
  const weeklyToMonthly = 52 / 12;
  const dieselMonthsBeforeMains = Math.min(months, settings.mainsAvailableMonth);
  const candidates: Array<{ strategy: TemporaryPowerStrategy; total: number; dieselMonths: number; generator: number; tank: number; mains: number; generatorFuel: number; mainsMonths: number; mainsElectricity: number; equipmentTotal: number }> = [];
  const add = (strategy: TemporaryPowerStrategy, dieselMonths: number, purchase: boolean, switchToMains: boolean) => {
    const generator = purchase ? settings.generatorPurchase : settings.generatorHirePerWeek * weeklyToMonthly * dieselMonths;
    const tank = purchase ? settings.tankPurchase : settings.tankHirePerWeek * weeklyToMonthly * dieselMonths;
    const mains = switchToMains ? settings.permanentPowerCost : 0;
    const generatorFuel = dieselMonths * Math.max(0, generatorFuelMonthly);
    const mainsMonths = switchToMains ? Math.max(0, months - dieselMonths) : 0;
    const mainsElectricity = mainsMonths * settings.mainsElectricityKwhPerMonth * settings.mainsElectricityRatePerKwh;
    const equipmentTotal = generator + tank + mains;
    candidates.push({ strategy, dieselMonths, generator, tank, mains, generatorFuel, mainsMonths, mainsElectricity, equipmentTotal, total: equipmentTotal + generatorFuel + mainsElectricity });
  };
  if (months > 0) {
    add('PURCHASE_FULL', months, true, false);
    add('HIRE_FULL', months, false, false);
    if (canUseMains && settings.mainsAvailable && settings.mainsAvailableMonth > 0 && months > settings.mainsAvailableMonth) {
      add('PURCHASE_THEN_MAINS', dieselMonthsBeforeMains, true, true);
      add('HIRE_THEN_MAINS', dieselMonthsBeforeMains, false, true);
    }
  } else {
    add('HIRE_FULL', 0, false, false);
  }
  // Full-duration options come first. A mains switch must be strictly cheaper.
  const chosen = candidates.reduce((best, item) => item.total < best.total ? item : best);
  return { ...chosen, candidates: candidates.map(({ strategy, total }) => ({ strategy, total })) };
}
