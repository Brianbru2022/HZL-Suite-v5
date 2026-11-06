import type { AppraisalPlotHeatingAssumptions, DevelopmentAppraisalOption } from '../types';

export const PLOT_HEATING_ROW_IDS = {
  purchase: 'awd-prelims-heaters',
  hire: 'awd-prelims-heater-hire',
  electricity: 'awd-prelims-heater-electricity',
} as const;

export const DEFAULT_PLOT_HEATING_ASSUMPTIONS: AppraisalPlotHeatingAssumptions = {
  weeksPerHouse: 6,
  heatersPerHouse: 2,
  sparePercent: 10,
  purchasePerHeater: 200,
  hirePerHeaterWeek: 25,
  heaterKw: 3,
  hoursPerDay: 24,
  thermostatDutyPercent: 50,
  electricityPerKwh: 0.25,
};

export function normalizePlotHeatingAssumptions(value?: Partial<AppraisalPlotHeatingAssumptions>): AppraisalPlotHeatingAssumptions {
  const result = { ...DEFAULT_PLOT_HEATING_ASSUMPTIONS, ...value };
  for (const key of Object.keys(DEFAULT_PLOT_HEATING_ASSUMPTIONS) as (keyof Omit<AppraisalPlotHeatingAssumptions, 'notes'>)[]) {
    const amount = Number(result[key]);
    result[key] = Number.isFinite(amount) && amount >= 0 ? amount : DEFAULT_PLOT_HEATING_ASSUMPTIONS[key];
  }
  result.sparePercent = Math.min(100, result.sparePercent);
  result.heatersPerHouse = Math.floor(Math.min(20, result.heatersPerHouse));
  result.weeksPerHouse = Math.min(52, result.weeksPerHouse);
  result.thermostatDutyPercent = Math.min(100, result.thermostatDutyPercent);
  result.hoursPerDay = Math.min(24, result.hoursPerDay);
  result.notes = typeof value?.notes === 'string' ? value.notes : undefined;
  return result;
}

const MS_PER_DAY = 86_400_000;
function parseDate(date?: string): Date | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? parsed : null;
}

function addMonths(date: Date, months: number): Date {
  const first = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(date.getUTCDate(), lastDay)));
}

function calculatePlotHeatingReview(option: DevelopmentAppraisalOption) {
  const assumptions = normalizePlotHeatingAssumptions(option.plotHeatingAssumptions);
  const rows = (option.houseTypeSchedule || []).filter(row => row.quantity > 0);
  const dwellings = rows.reduce((sum, row) => sum + Math.max(0, Math.floor(row.quantity)), 0);
  const enteredMonths = Math.max(0, ...rows.map(row => Math.floor(row.buildPeriodMonths || 0)));
  const manualBuildRate = (option.siteDimensions || []).find(row =>
    row.isCostDriverInput && row.costDriver === 'BUILD_RATE_UNITS_PER_MONTH',
  )?.quantity;
  const buildRate = Number(manualBuildRate) > 0 ? Number(manualBuildRate) : Number(option.programme?.saleRateUnitsPerMonth) || 0;
  const productionMonths = buildRate > 0 ? Math.ceil(dwellings / buildRate) : 0;
  // A house-type build period is the time to complete one house, not the time to build every house on site.
  const buildMonths = Math.min(240, enteredMonths + productionMonths || enteredMonths);
  const siteStart = parseDate(option.programme?.expectedStartDate);
  const buildStart = siteStart ? addMonths(siteStart, Math.max(0, Math.floor(option.programme?.leadInMonths || 0))) : null;
  const buildDays = buildStart
    ? Math.max(1, Math.round((addMonths(buildStart, buildMonths).getTime() - buildStart.getTime()) / MS_PER_DAY))
    : Math.max(1, Math.round(buildMonths * 365.25 / 12));
  const provisional = !buildStart;
  if (!dwellings || !buildMonths || assumptions.weeksPerHouse <= 0 || assumptions.heatersPerHouse <= 0) {
    return { assumptions, dwellings, buildMonths, buildRate: buildMonths ? dwellings / buildMonths : 0, provisional,
      winterDays: 0, heaterDays: 0, peakHouses: 0, peakHeaters: 0, coreHeaters: 0, purchaseFleet: 0,
      hireHeaterWeeks: 0, electricityKwh: 0, purchaseCost: 0, hireCost: 0, electricityCost: 0, total: 0,
      hireAllComparison: 0, buyAllComparison: 0 };
  }
  const deltas = new Int32Array(buildDays + 1);
  const heatDays = Math.max(1, Math.round(assumptions.weeksPerHouse * 7));
  for (const row of rows) {
    const count = Math.min(100_000, Math.floor(row.quantity));
    const rowMonths = Math.max(0, Math.floor(row.buildPeriodMonths || 0));
    const firstCompletionDay = productionMonths > 0
      ? Math.min(buildDays, Math.round(rowMonths / buildMonths * buildDays)) : 0;
    const productionDays = buildDays - firstCompletionDay;
    for (let index = 0; index < count; index++) {
      const completion = Math.min(buildDays, Math.max(1,
        firstCompletionDay + Math.ceil((index + 0.5) / count * productionDays)));
      deltas[Math.max(0, completion - heatDays)]++;
      deltas[completion]--;
    }
  }
  const dailyDemand: number[] = [];
  let houses = 0;
  let peakHouses = 0;
  let winterDays = 0;
  let heaterDays = 0;
  for (let day = 0; day < buildDays; day++) {
    houses += deltas[day];
    const date = buildStart ? new Date(buildStart.getTime() + day * MS_PER_DAY) : null;
    const winterWeight = date ? ([10, 11, 0, 1, 2].includes(date.getUTCMonth()) ? 1 : 0) : 5 / 12;
    const demand = houses * assumptions.heatersPerHouse;
    dailyDemand.push(demand * winterWeight);
    if (!winterWeight) continue;
    winterDays += winterWeight;
    heaterDays += demand * winterWeight;
    if (houses > peakHouses) peakHouses = houses;
  }
  const peakHeaters = peakHouses * assumptions.heatersPerHouse;
  const costForCore = (core: number) => {
    const purchaseFleet = core ? Math.ceil(core * (1 + assumptions.sparePercent / 100)) : 0;
    let hireHeaterWeeks = 0;
    if (provisional) {
      hireHeaterWeeks = Math.ceil(dailyDemand.reduce((sum, demand) => sum + Math.max(0, demand - core * 5 / 12), 0) / 7);
    } else {
      for (let day = 0; day < dailyDemand.length; day += 7)
        hireHeaterWeeks += Math.max(0, ...dailyDemand.slice(day, day + 7).map(demand => Math.ceil(demand - core)));
    }
    return { core, purchaseFleet, hireHeaterWeeks,
      equipmentCost: purchaseFleet * assumptions.purchasePerHeater + hireHeaterWeeks * assumptions.hirePerHeaterWeek };
  };
  let chosen = costForCore(0);
  for (let core = 1; core <= peakHeaters; core++) {
    const candidate = costForCore(core);
    if (candidate.equipmentCost < chosen.equipmentCost) chosen = candidate;
  }
  const electricityKwh = Math.round(heaterDays * assumptions.heaterKw * assumptions.hoursPerDay * assumptions.thermostatDutyPercent / 100);
  const electricityCost = electricityKwh * assumptions.electricityPerKwh;
  return { assumptions, dwellings, buildMonths, buildRate: dwellings / buildMonths, provisional,
    winterDays, heaterDays, peakHouses, peakHeaters, coreHeaters: chosen.core,
    purchaseFleet: chosen.purchaseFleet, hireHeaterWeeks: chosen.hireHeaterWeeks, electricityKwh,
    purchaseCost: chosen.purchaseFleet * assumptions.purchasePerHeater,
    hireCost: chosen.hireHeaterWeeks * assumptions.hirePerHeaterWeek,
    electricityCost, total: chosen.equipmentCost + electricityCost,
    hireAllComparison: costForCore(0).equipmentCost, buyAllComparison: costForCore(peakHeaters).equipmentCost };
}

const reviewCache = new WeakMap<DevelopmentAppraisalOption, ReturnType<typeof calculatePlotHeatingReview>>();
export function plotHeatingReview(option: DevelopmentAppraisalOption) {
  const cached = reviewCache.get(option);
  if (cached) return cached;
  const review = calculatePlotHeatingReview(option);
  reviewCache.set(option, review);
  return review;
}
