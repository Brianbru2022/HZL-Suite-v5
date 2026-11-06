import { describe, expect, it } from 'vitest';
import { createDefaultAppraisalOption, createDefaultCostLine } from './appraisal';
import { notAllowedAbnormalRows } from './appraisalNotAllowedAbnormals';

describe('abnormal exclusions disclosure', () => {
  it('combines excluded Prelims reports and unpriced Abnormals, leaving priced and cleared costs out', () => {
    const option = createDefaultAppraisalOption('RESIDENTIAL_SALES');
    option.surveyReports = { confirmedAt: '2026-10-13T00:00:00.000Z', items: { noise: { included: false } } };
    option.costLines = [
      createDefaultCostLine('ABNORMALS', 12, { id: 'rock', title: 'Rock excavation', amount: 0 }),
      createDefaultCostLine('ABNORMALS', 12, { id: 'priced', title: 'Remediation', amount: 10000 }),
      createDefaultCostLine('ABNORMALS', 12, { id: 'cleared', title: 'Unused item', amount: 0, siteCost: { allocation: 'ABNORMALS', status: 'CLEARED', includeInLandOffer: false, clearanceReason: 'Not present', history: [] } }),
      createDefaultCostLine('ABNORMALS', 12, { id: 'site-specific', title: 'SuDS', amount: 0, siteCost: { allocation: 'SITE_SPECIFIC', status: 'TO_BE_ASSESSED', includeInLandOffer: false, history: [] } }),
    ];
    const rows = notAllowedAbnormalRows(option);
    expect(rows.map(row => row.kind)).toEqual(['REPORT', 'WORK', 'ABNORMAL']);
    expect(rows.at(-1)?.title).toBe('Rock excavation');
    expect(rows.at(-1)?.qualification).toContain('No cost allowance');
  });

  it('shows draft survey exclusions on screen but only applied exclusions in reports', () => {
    const option = createDefaultAppraisalOption('RESIDENTIAL_SALES');
    option.surveyReports = { items: { noise: { included: false } } };
    expect(notAllowedAbnormalRows(option)).toHaveLength(0);
    expect(notAllowedAbnormalRows(option, true)).toHaveLength(2);
  });
});
