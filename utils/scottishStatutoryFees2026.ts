import type { AppraisalScottishStatutoryFees } from '../types';

/** Rates in force from 1 April 2026. These are application fees, not cost-indexed allowances.
 * Planning: https://www.gov.scot/publications/circular-1-2026-planning-fees-applications-local-reviews-appeals/pages/8/
 * Warrant: https://www.gov.scot/publications/building-standards-procedural-handbook-third-edition-version-1-9/pages/3/
 */
export const SCOTTISH_STATUTORY_FEES_2026_EFFECTIVE_DATE = '2026-04-01';
export const SCOTTISH_PLANNING_2026_SOURCE = 'https://www.gov.scot/publications/circular-1-2026-planning-fees-applications-local-reviews-appeals/pages/8/';
export const SCOTTISH_PLANNING_PPP_2026_SOURCE = 'https://www.gov.scot/publications/circular-1-2026-planning-fees-applications-local-reviews-appeals/pages/7/';
export const SCOTTISH_WARRANT_2026_SOURCE = 'https://www.gov.scot/publications/building-standards-procedural-handbook-third-edition-version-1-9/pages/3/';

const nonnegative = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
const whole = (value: number) => Math.floor(nonnegative(value));
const optionalAmount = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;

export function normalizeScottishStatutoryFees(value: unknown): AppraisalScottishStatutoryFees | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  const certificates = source.warrantCertificates && typeof source.warrantCertificates === 'object'
    ? source.warrantCertificates as Record<string, unknown> : {};
  return {
    planningApplication: source.planningApplication === 'PPP_NEW_DWELLINGS' || source.planningApplication === 'MANUAL'
      ? source.planningApplication : 'FULL_NEW_DWELLINGS',
    planningManualFee: optionalAmount(source.planningManualFee),
    warrantValueOfWorks: optionalAmount(source.warrantValueOfWorks),
    warrantCertificates: {
      structure: certificates.structure === true,
      energy: certificates.energy === true,
      electrical: certificates.electrical === true,
      drainage: certificates.drainage === true,
    },
  };
}

/** Category 1, full application to erect new dwellinghouses. */
export function scottishResidentialPlanningFee2026(dwellings: number): number {
  const count = whole(dwellings);
  return Math.min(185524, Math.min(count, 10) * 742
    + Math.min(Math.max(count - 10, 0), 39) * 557
    + Math.max(count - 49, 0) * 310);
}

/** Residential planning permission in principle, one site and one application. */
export function scottishResidentialPppFee2026(dwellings: number, siteAreaM2: number): number {
  const count = whole(dwellings);
  if (!count) return 0;
  if (count === 1) return 742;
  const tenthsOfHectare = Math.ceil(nonnegative(siteAreaM2) / 1000);
  if (!tenthsOfHectare) return 0; // The area must be measured before a fee can be assessed.
  return Math.min(92762, Math.min(tenthsOfHectare, 25) * 742 + Math.max(tenthsOfHectare - 25, 0) * 371);
}

type WarrantBand = { upper: number; fee: number; designDiscount: number; constructionDiscount: number };

/** Table 1a of the 2026 Scottish Building Standards Procedural Handbook. */
const WARRANT_BANDS_TO_100K: WarrantBand[] = [
  { upper: 5000, fee: 215, designDiscount: 45, constructionDiscount: 25 },
  ...Array.from({ length: 10 }, (_, index) => ({ upper: 5500 + index * 500, fee: 237 + index * 22, designDiscount: 55, constructionDiscount: 25 })),
  ...Array.from({ length: 5 }, (_, index) => ({ upper: 11000 + index * 1000, fee: 461 + index * 26, designDiscount: 65, constructionDiscount: 30 })),
  ...Array.from({ length: 5 }, (_, index) => ({ upper: 16000 + index * 1000, fee: 591 + index * 26, designDiscount: 80, constructionDiscount: 35 })),
  ...Array.from({ length: 3 }, (_, index) => ({ upper: 30000 + index * 10000, fee: 780 + index * 85, designDiscount: 105, constructionDiscount: 40 })),
  ...Array.from({ length: 5 }, (_, index) => ({ upper: 60000 + index * 10000, fee: 1035 + index * 85, designDiscount: 130, constructionDiscount: 45 })),
];

export type ScottishWarrant2026Fee = { valueOfWorks: number; grossFee: number; discount: number; payable: number; basis: string };

/** One ordinary building warrant for construction work; certificate discounts are optional. */
export function scottishBuildingWarrantFee2026(
  valueOfWorks: number,
  certificates: AppraisalScottishStatutoryFees['warrantCertificates'] = {},
): ScottishWarrant2026Fee {
  const value = nonnegative(valueOfWorks);
  if (value === 0) return { valueOfWorks: 0, grossFee: 0, discount: 0, payable: 0, basis: 'Value of works required' };
  const small = WARRANT_BANDS_TO_100K.find(band => value <= band.upper);
  const grossFee = small ? small.fee : value <= 500000
    ? 1375 + Math.ceil((value - 100000) / 20000) * 138
    : value <= 1000000
      ? 4135 + Math.ceil((value - 500000) / 50000) * 239
      : 6525 + Math.ceil((value - 1000000) / 100000) * 339;
  const designCount = Number(!!certificates?.structure) + Number(!!certificates?.energy);
  const constructionCount = Number(!!certificates?.electrical) + Number(!!certificates?.drainage);
  const discount = small
    ? designCount * small.designDiscount + constructionCount * small.constructionDiscount
    : Math.round((grossFee * (designCount * 0.1 + constructionCount * 0.03)) * 100) / 100;
  return { valueOfWorks: value, grossFee, discount, payable: Math.max(0, grossFee - discount),
    basis: small ? `Table 1a: value of works up to £${small.upper.toLocaleString('en-GB')}` : value <= 1000000 ? 'Table 1b: value-of-works band' : 'Table 1b: £6,525 plus £339 per £100,000 or part over £1m' };
}
