import React from 'react';
import type { AppraisalTemporaryPowerAssumptions, DevelopmentAppraisalOption } from '../../types';
import { temporaryPowerReview } from '../../utils/appraisal';
import { normalizeTemporaryPower } from '../../utils/appraisalTemporaryPower';

const labels: Record<keyof AppraisalTemporaryPowerAssumptions, string> = {
  generatorPurchase: 'Generator purchase and setup (£)',
  tankPurchase: 'Bunded tank purchase and setup (£)',
  generatorHirePerWeek: 'Generator hire (£/week)',
  tankHirePerWeek: 'Bunded tank hire (£/week)',
  mainsAvailable: 'Mains power available',
  mainsAvailableMonth: 'Target mains connection (programme month)',
  permanentPowerCost: 'Permanent power connection (£)',
  mainsElectricityKwhPerMonth: 'Site-office mains electricity (kWh/month)',
  mainsElectricityRatePerKwh: 'Site-office mains electricity tariff (£/kWh)',
};
const strategyLabels = {
  PURCHASE_FULL: 'Purchase generator and tank for whole site',
  HIRE_FULL: 'Hire generator and tank for whole site',
  PURCHASE_THEN_MAINS: 'Purchase both, then connect mains',
  HIRE_THEN_MAINS: 'Hire both, then connect mains',
};
const currency = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(value);

export function PrelimsTemporaryPowerPanel({ option, updateOption }: {
  option: DevelopmentAppraisalOption;
  updateOption: (id: string, recipe: (current: DevelopmentAppraisalOption) => DevelopmentAppraisalOption) => void;
}) {
  const settings = normalizeTemporaryPower(option.temporaryPower);
  const review = temporaryPowerReview(option);
  const setField = (key: keyof AppraisalTemporaryPowerAssumptions, value: number | boolean) => updateOption(option.id, current => ({
    ...current,
    temporaryPower: { ...normalizeTemporaryPower(current.temporaryPower), [key]: value },
  }));
  const numericKeys: Array<Exclude<keyof AppraisalTemporaryPowerAssumptions, 'mainsAvailable'>> = [
    'generatorPurchase', 'tankPurchase', 'generatorHirePerWeek', 'tankHirePerWeek', 'mainsAvailableMonth', 'permanentPowerCost', 'mainsElectricityKwhPerMonth', 'mainsElectricityRatePerKwh',
  ];
  return <div data-smoke="appraisals-prelims-temporary-power" className="space-y-3 text-sm">
    <p className="text-slate-600 dark:text-slate-300">A 20 kVA generator and 1,000-litre static bunded tank are costed together for the site offices. The lowest whole-package option includes cabin-generator fuel before mains, and site-office electricity after a selected connection. Fuel and mains usage have separate bill lines; plot-heating electricity is separate.</p>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {numericKeys.map(key => <label key={key} className="grid gap-1">{labels[key]}
        <input type="number" min="0" step={key === 'mainsAvailableMonth' ? '0.5' : '0.01'} value={settings[key]} onChange={event => {
          const parsed = Number(event.target.value);
          if (Number.isFinite(parsed) && parsed >= 0) setField(key, parsed);
        }} className="rounded-app-sm border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-surface-950" />
      </label>)}
    </div>
    <label className="flex items-center gap-2"><input type="checkbox" checked={settings.mainsAvailable} onChange={event => setField('mainsAvailable', event.target.checked)} />{labels.mainsAvailable}</label>
    <p className="text-slate-500">Hire uses 52 ÷ 12 weeks per programme month. Mains is selected only when it reduces the combined generator, tank, fuel, connection and ongoing electricity cost. The provisional office-electricity budget is 1,200 kWh/month × £0.25/kWh = £300/month, excluding VAT; use site-meter and tariff evidence when available. Purchase is a full upfront cost with no resale credit.</p>
    <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b border-slate-200 dark:border-slate-700"><th className="py-2">Package route</th><th className="py-2 text-right">Cost</th></tr></thead><tbody>{review.candidates.map(candidate => <tr key={candidate.strategy} className={candidate.strategy === review.strategy ? 'font-semibold text-emerald-700 dark:text-emerald-400' : ''}><td className="py-1">{strategyLabels[candidate.strategy]}{candidate.strategy === review.strategy ? ' — selected' : ''}</td><td className="py-1 text-right tabular-nums">{currency(candidate.total)}</td></tr>)}</tbody></table></div>
    <p className="font-medium">Selected route: {review.dieselMonths} generator months, then {review.mainsMonths} mains months. Generator {currency(review.generator)} + tank {currency(review.tank)} + permanent power connection {currency(review.mains)} + generator fuel {currency(review.generatorFuel)} + site-office mains electricity {currency(review.mainsElectricity)} = {currency(review.total)}.</p>
  </div>;
}
