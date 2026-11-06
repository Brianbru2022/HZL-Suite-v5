import type { AppraisalSalesMarketingAssumptions } from '../types';

export const SALES_MARKETING_ROW_IDS = {
  showhome: 'awd-prelims-show-home-fitout',
  launch: 'awd-prelims-marketing-launch',
  ongoing: 'awd-prelims-advertising',
} as const;

export const DEFAULT_SALES_MARKETING_ASSUMPTIONS: AppraisalSalesMarketingAssumptions = {
  monthlyMarketingRate: 3000,
  includeShowhomeFloorCoverings: true,
};

const nonnegative = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : fallback;

export function normalizeSalesMarketingAssumptions(value: unknown): AppraisalSalesMarketingAssumptions {
  const source = value && typeof value === 'object' ? value as Partial<AppraisalSalesMarketingAssumptions> : {};
  return {
    campaignStartMonth: source.campaignStartMonth === undefined || source.campaignStartMonth === null
      ? undefined : nonnegative(source.campaignStartMonth, 0),
    campaignEndMonth: source.campaignEndMonth === undefined || source.campaignEndMonth === null
      ? undefined : nonnegative(source.campaignEndMonth, 0),
    monthlyMarketingRate: source.monthlyMarketingRate === 3500 ? 3000 : nonnegative(source.monthlyMarketingRate, 3000),
    includeShowhomeFloorCoverings: source.includeShowhomeFloorCoverings !== false,
  };
}

export function calculateSalesMarketingReview(args: {
  privateUnits: number;
  programmeMonths: number;
  leadInMonths: number;
  assumptions?: AppraisalSalesMarketingAssumptions;
}) {
  const assumptions = normalizeSalesMarketingAssumptions(args.assumptions);
  const programmeMonths = Math.max(0, args.programmeMonths);
  const defaultCampaignStartMonth = Math.min(programmeMonths, Math.max(0, args.leadInMonths) + 4);
  const campaignStartMonth = Math.min(programmeMonths, Math.max(defaultCampaignStartMonth, assumptions.campaignStartMonth ?? defaultCampaignStartMonth));
  const campaignEndMonth = Math.min(programmeMonths, assumptions.campaignEndMonth ?? programmeMonths);
  const campaignMonths = args.privateUnits > 0 ? Math.max(0, campaignEndMonth - campaignStartMonth) : 0;
  const showhomeFitout = args.privateUnits > 0 ? 26000 + (assumptions.includeShowhomeFloorCoverings ? 6000 : 0) : 0;
  const ongoing = campaignMonths * assumptions.monthlyMarketingRate;
  return {
    assumptions, programmeMonths, defaultCampaignStartMonth, campaignStartMonth, campaignEndMonth,
    campaignMonths, showhomeFitout, ongoing, total: showhomeFitout + ongoing,
  };
}
