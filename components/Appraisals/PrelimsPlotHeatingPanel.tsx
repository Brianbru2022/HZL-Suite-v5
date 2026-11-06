import React from 'react';
import type { AppraisalPlotHeatingAssumptions, DevelopmentAppraisalOption } from '../../types';
import { normalizePlotHeatingAssumptions, plotHeatingReview } from '../../utils/appraisalPlotHeating';

const money = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(value);

const inputs: { key: keyof Omit<AppraisalPlotHeatingAssumptions, 'notes'>; label: string; suffix: string; max?: number }[] = [
  { key: 'weeksPerHouse', label: 'Temporary heating per house', suffix: 'weeks' },
  { key: 'heatersPerHouse', label: 'Heaters per heated house', suffix: 'nr' },
  { key: 'sparePercent', label: 'Purchased fleet spares', suffix: '%', max: 100 },
  { key: 'purchasePerHeater', label: 'Purchase price per heater', suffix: '£' },
  { key: 'hirePerHeaterWeek', label: 'Hire per heater per week', suffix: '£' },
  { key: 'heaterKw', label: 'Rating per heater', suffix: 'kW' },
  { key: 'hoursPerDay', label: 'Available hours per day', suffix: 'hours', max: 24 },
  { key: 'thermostatDutyPercent', label: 'Thermostat duty', suffix: '%', max: 100 },
  { key: 'electricityPerKwh', label: 'Plot electricity tariff', suffix: '£/kWh' },
];

export function PrelimsPlotHeatingPanel({ option, updateOption }: {
  option: DevelopmentAppraisalOption;
  updateOption: (id: string, recipe: (current: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const review = plotHeatingReview(option);
  const set = (key: keyof AppraisalPlotHeatingAssumptions, value: number | string) =>
    updateOption(option.id, current => ({ ...current, plotHeatingAssumptions: {
      ...normalizePlotHeatingAssumptions(current.plotHeatingAssumptions), [key]: value,
    } }));
  return <div data-smoke="appraisals-prelims-plot-heating" className="space-y-3 text-sm">
    <p className="text-slate-600 dark:text-slate-300">Plot heaters are needed only during November–March and for the six weeks before each evenly phased house completion. The calculation uses construction quantities, the monthly site build rate, house-type build periods, site start date and lead-in. It compares buying a core fleet (with spares) against hiring additional heaters or hiring all heaters.</p>
    {review.provisional && <p className="text-amber-700 dark:text-amber-300">Enter the expected site start date in Programme to calculate actual winter overlap. Until then, 5/12 of the build period is treated as winter exposure.</p>}
    {!review.buildMonths && <p className="text-amber-700 dark:text-amber-300">Enter house-type build periods or a sale rate in Programme to calculate the heating allowance.</p>}
    <div className="grid gap-3 sm:grid-cols-3">
      {inputs.map(input => <label key={input.key} className="grid gap-1">{input.label} ({input.suffix})
        <input aria-label={input.label} type="number" min="0" max={input.max} step={input.key === 'electricityPerKwh' ? '0.001' : '0.1'} value={review.assumptions[input.key]} onChange={event => {
          if (event.target.value === '') return;
          const number = Number(event.target.value);
          if (Number.isFinite(number) && number >= 0 && (input.max === undefined || number <= input.max)) set(input.key, number);
        }} className="rounded-app-sm border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-surface-950" />
      </label>)}
    </div>
    <label className="grid gap-1">Quotation and heating assumptions notes<textarea rows={2} value={review.assumptions.notes || ''} onChange={event => set('notes', event.target.value)} className="rounded-app-sm border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-surface-950" /></label>
    <div className="rounded-app-sm bg-slate-50 p-3 dark:bg-surface-950">
      <p>{review.dwellings} houses over {review.buildMonths} construction months; average build rate {review.buildRate.toFixed(2)} houses/month. Peak winter demand: {review.peakHouses} houses, {review.peakHeaters} heaters.</p>
      <p>Selected equipment: {review.coreHeaters} bought working heaters + spares = {review.purchaseFleet} purchased; {review.hireHeaterWeeks} hired heater-weeks. Buy {money(review.purchaseCost)} + hire {money(review.hireCost)}. All-hire comparison {money(review.hireAllComparison)}; all-buy comparison {money(review.buyAllComparison)}.</p>
      <p>Heating electricity: {review.electricityKwh.toLocaleString('en-GB')} kWh × {money(review.assumptions.electricityPerKwh)}/kWh = {money(review.electricityCost)}.</p>
      <p className="font-semibold">Total plot-heating allowance: {money(review.total)}.</p>
    </div>
    <p className="text-xs text-slate-500">Budget rates exclude VAT. Confirm heater specification, electrical capacity, distribution, delivery, testing, repairs and the actual tariff; these are not included in this heater allowance. Plot-heating electricity is separate from site-accommodation generator fuel.</p>
  </div>;
}
