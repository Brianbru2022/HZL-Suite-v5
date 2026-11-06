import type { BoQItem, RateBuildUp, RateBuildUpCategory, RateBuildUpComponent } from '../types';

export const RATE_BUILD_UP_CATEGORIES: Array<{ value: RateBuildUpCategory; label: string }> = [
  { value: 'LABOUR', label: 'Labour' },
  { value: 'PLANT', label: 'Plant' },
  { value: 'MATERIALS', label: 'Materials' },
  { value: 'PRELIMINARIES', label: 'Preliminaries' },
  { value: 'SUBCONTRACTOR', label: 'Subcontractor' },
  { value: 'CUSTOM', label: 'Custom' },
];

export function componentTotal(component: Partial<RateBuildUpComponent>): number {
  if (component.included === false) return 0;
  const quantity = Number(component.quantity);
  const rate = Number(component.rate);
  return Number.isFinite(quantity) && Number.isFinite(rate) ? quantity * rate : 0;
}

export function derivedRate(buildUp?: RateBuildUp | null): number {
  if (!buildUp || buildUp.mode !== 'DERIVED') return 0;
  return buildUp.components.reduce((total, component) => total + componentTotal(component), 0);
}

export function effectiveItemRate(item: Pick<BoQItem, 'rate' | 'rateBuildUp'>): number {
  return item.rateBuildUp?.mode === 'DERIVED' ? derivedRate(item.rateBuildUp) : Number(item.rate) || 0;
}

export function normaliseRateBuildUp(buildUp?: RateBuildUp): RateBuildUp | undefined {
  if (!buildUp) return undefined;
  return {
    mode: buildUp.mode === 'DERIVED' ? 'DERIVED' : 'SINGLE_RATE',
    updatedAt: buildUp.updatedAt || new Date().toISOString(),
    components: (buildUp.components || []).map((component, index) => ({
      id: component.id || `rate-component-${index + 1}`,
      category: component.category || 'CUSTOM',
      categoryLabel: component.categoryLabel || undefined,
      description: component.description || '',
      quantity: Number(component.quantity) || 0,
      unit: component.unit || '',
      rate: Number(component.rate) || 0,
      total: componentTotal(component),
      note: component.note || undefined,
      included: component.included !== false,
      position: Number.isFinite(component.position) ? component.position : index,
    })),
  };
}

export function applyRateBuildUp<T extends Pick<BoQItem, 'quantity' | 'rate' | 'total' | 'rateBuildUp'>>(item: T): T {
  const rateBuildUp = normaliseRateBuildUp(item.rateBuildUp);
  const rate = rateBuildUp?.mode === 'DERIVED' ? derivedRate(rateBuildUp) : Number(item.rate) || 0;
  const quantity = Number(item.quantity) || 0;
  return { ...item, rate, total: quantity * rate, rateBuildUp };
}

export function createRateBuildUpComponent(position: number, category: RateBuildUpCategory = 'CUSTOM'): RateBuildUpComponent {
  return { id: `rate-component-${Date.now()}-${position}`, category, description: '', quantity: 1, unit: '', rate: 0, included: true, position };
}
