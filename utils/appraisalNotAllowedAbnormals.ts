import type { DevelopmentAppraisalOption } from '../types';
import { calculateCostLineAmount } from './appraisal';
import { excludedSurveyAbnormalItems } from './appraisalSurveyReports';
import { isSiteCostElement, siteCostMetadata } from './appraisalSiteCosts';

export type NotAllowedAbnormalRow = {
  id: string;
  category: string;
  kind: 'REPORT' | 'WORK' | 'ABNORMAL';
  title: string;
  qualification: string;
};

/** Disclosure only: neither this schedule nor its rows alter appraisal costs. */
export function notAllowedAbnormalRows(option: DevelopmentAppraisalOption, includeDraftSurveys = false): NotAllowedAbnormalRow[] {
  const surveyRows = excludedSurveyAbnormalItems(option, includeDraftSurveys);
  const unpricedAbnormals: NotAllowedAbnormalRow[] = (option.costLines || [])
    .filter(isSiteCostElement)
    .filter(line => {
      const metadata = siteCostMetadata(line);
      return metadata.allocation === 'ABNORMALS' && metadata.status !== 'CLEARED'
        && calculateCostLineAmount(line, option) <= 0;
    })
    .map(line => {
      const metadata = siteCostMetadata(line);
      return {
        id: `abnormal-unpriced:${line.id}`,
        category: line.abnormalElement?.categoryLabel || 'Abnormals register',
        kind: 'ABNORMAL' as const,
        title: line.title || 'Untitled abnormal element',
        qualification: metadata.offerQualification?.trim()
          || `No cost allowance is included for this abnormal element. Confirm its scope and price before the land offer.${line.notes?.trim() ? ` Assessment note: ${line.notes.trim()}` : ''}`,
      };
    });
  return [...surveyRows, ...unpricedAbnormals];
}
