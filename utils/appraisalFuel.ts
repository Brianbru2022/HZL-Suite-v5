import type { AppraisalFuelAssumptions } from '../types';

export const FUEL_ROW_IDS = {
  telehandler: 'awd-prelims-fuel',
  accommodationGenerator: 'awd-prelims-accommodation-generator-fuel',
  siloGenerator: 'awd-prelims-silo-generator-fuel',
} as const;

export const DEFAULT_FUEL_ASSUMPTIONS: AppraisalFuelAssumptions = {
  telehandlerMonthly: 600,
  accommodationGeneratorMonthly: 850,
  siloGeneratorMonthly: 330,
};

export function normalizeFuelAssumptions(value: unknown): AppraisalFuelAssumptions {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const amount = (key: keyof AppraisalFuelAssumptions) => {
    const given = source[key];
    return typeof given === 'number' && Number.isFinite(given) && given >= 0 ? given : DEFAULT_FUEL_ASSUMPTIONS[key];
  };
  return {
    telehandlerMonthly: amount('telehandlerMonthly'),
    accommodationGeneratorMonthly: amount('accommodationGeneratorMonthly'),
    siloGeneratorMonthly: amount('siloGeneratorMonthly'),
  };
}
