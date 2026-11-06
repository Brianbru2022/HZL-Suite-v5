import type { AppraisalDrinkingWaterAssumptions } from '../types';

export const DRINKING_WATER_ROW_IDS = {
  bottled: 'awd-prelims-drinking-water',
  connection: 'awd-prelims-drinking-water-mains-connection',
  mainsService: 'awd-prelims-drinking-water-mains-service',
} as const;

export const DEFAULT_DRINKING_WATER: AppraisalDrinkingWaterAssumptions = {
  averagePeople: 3,
  connectionArrangement: 'SITE_BRANCH',
  mainsAvailableMonth: 6,
  siteBranchCost: 1500,
  publicMainCost: 3750,
  complexConnectionCost: 7500,
  // Provisional rounded site-accommodation fixed and usage budget. The
  // published unmetered fixed charges alone total £8.80/week in 2026/27.
  mainsMonthlyCost: 50,
};

export function normalizeDrinkingWater(value: unknown): AppraisalDrinkingWaterAssumptions {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const amount = (key: keyof AppraisalDrinkingWaterAssumptions) => {
    const given = source[key];
    return typeof given === 'number' && Number.isFinite(given) && given >= 0 ? given : DEFAULT_DRINKING_WATER[key] as number;
  };
  const arrangement = source.connectionArrangement;
  return {
    averagePeople: amount('averagePeople'),
    bottledMonthlyOverride: typeof source.bottledMonthlyOverride === 'number' && Number.isFinite(source.bottledMonthlyOverride) && source.bottledMonthlyOverride >= 0 ? source.bottledMonthlyOverride : undefined,
    connectionArrangement: arrangement === 'PUBLIC_MAIN' || arrangement === 'COMPLEX_CONNECTION' || arrangement === 'NO_MAINS' ? arrangement : 'SITE_BRANCH',
    mainsAvailableMonth: amount('mainsAvailableMonth'),
    siteBranchCost: amount('siteBranchCost'),
    publicMainCost: amount('publicMainCost'),
    complexConnectionCost: amount('complexConnectionCost'),
    mainsMonthlyCost: amount('mainsMonthlyCost'),
  };
}

export function bottledWaterMonthlyCost(settings: AppraisalDrinkingWaterAssumptions): number {
  if (settings.bottledMonthlyOverride !== undefined) return settings.bottledMonthlyOverride;
  if (settings.averagePeople <= 0) return 0;
  const bottles = Math.ceil(settings.averagePeople * 2 * 22 / 18.9);
  return Math.ceil((bottles * 9 + 25) / 50) * 50;
}

export function drinkingWaterReview(programmeMonths: number, input?: AppraisalDrinkingWaterAssumptions) {
  const settings = normalizeDrinkingWater(input);
  const months = Math.max(0, Number.isFinite(programmeMonths) ? programmeMonths : 0);
  const bottleRate = bottledWaterMonthlyCost(settings);
  const bottleOnlyCost = months * bottleRate;
  const connectionCost = settings.connectionArrangement === 'SITE_BRANCH' ? settings.siteBranchCost
    : settings.connectionArrangement === 'PUBLIC_MAIN' ? settings.publicMainCost
    : settings.connectionArrangement === 'COMPLEX_CONNECTION' ? settings.complexConnectionCost : 0;
  const mainsFeasible = settings.connectionArrangement !== 'NO_MAINS' && settings.mainsAvailableMonth >= 0 && months > settings.mainsAvailableMonth;
  const preMainsMonths = Math.min(months, settings.mainsAvailableMonth);
  const mainsMonths = months - preMainsMonths;
  const mainsOptionCost = mainsFeasible ? preMainsMonths * bottleRate + connectionCost + mainsMonths * settings.mainsMonthlyCost : null;
  // Keeping bottles wins a tie, avoiding an unnecessary connection.
  const useMains = mainsOptionCost !== null && mainsOptionCost < bottleOnlyCost;
  const bottledMonths = useMains ? preMainsMonths : months;
  return {
    method: useMains ? 'BOTTLED_THEN_MAINS' as const : 'BOTTLED_FULL' as const,
    bottledMonths,
    mainsMonths: useMains ? mainsMonths : 0,
    bottleRate,
    bottledCost: bottledMonths * bottleRate,
    connectionCost: useMains ? connectionCost : 0,
    mainsServiceCost: useMains ? mainsMonths * settings.mainsMonthlyCost : 0,
    bottleOnlyCost,
    mainsOptionCost,
    total: useMains ? mainsOptionCost! : bottleOnlyCost,
  };
}
