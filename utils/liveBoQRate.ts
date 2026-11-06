export interface LiveDirectRateBuildUp {
  materials: number;
  labourHours: number;
  labourHourlyCost: number;
  plant: number;
  waste: number;
  otherDirect: number;
  labourBasis: string;
  rationale: string;
}

/** The live bill rate is a direct cost. No preliminaries or O&P field is accepted. */
export function calculateLiveDirectRate(value: LiveDirectRateBuildUp): { rate: number; labour: number } | null {
  const numbers = [value.materials, value.labourHours, value.labourHourlyCost, value.plant, value.waste, value.otherDirect];
  if (numbers.some((number) => !Number.isFinite(number) || number < 0)) return null;
  if ((value.labourHours > 0) !== (value.labourHourlyCost > 0)) return null;
  if (value.labourHours > 0 && !value.labourBasis?.trim()) return null;
  if (!value.rationale?.trim()) return null;
  const labour = value.labourHours * value.labourHourlyCost;
  const rate = value.materials + labour + value.plant + value.waste + value.otherDirect;
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return { rate: Math.round(rate * 100) / 100, labour: Math.round(labour * 100) / 100 };
}

export function isHalfBrickWallRate(description: string, unit: string): boolean {
  return /half[\s-]?brick/i.test(description)
    && /^(m2|m²|sqm)$/i.test(unit.trim());
}

/** Flag a gross labour outlier for ordinary half-brick walling for manual review. */
export function hasHalfBrickLabourOutlier(description: string, unit: string, labourPerUnit: number): boolean {
  return isHalfBrickWallRate(description, unit) && labourPerUnit > 75;
}
