import { describe, expect, it } from 'vitest';
import { calculateSiteDimensionBaseTotal, calculateSiteDimensionTotal, createDefaultAppraisalOption, createManualHouseTypeScheduleRow, createSiteDimensionRow, normalizeDevelopmentAppraisalOption, surveyReportsReview, syncSurveyReportBillRows, PRELIMS_SURVEY_RATE_PREFIX } from './appraisal';
import { AWD_PRELIMS_RATE_DEFINITIONS } from './appraisalInfrastructureRatePacks';
import { SURVEY_REPORT_CATALOG, calculateSurveyReportSchedule, excludedSurveyAbnormalItems, surveyReportBudget } from './appraisalSurveyReports';

describe('Prelims surveys and reports', () => {
  it('uses a site-area budget with an explicit minimum and separate scope choices', () => {
    expect(SURVEY_REPORT_CATALOG.length).toBeGreaterThanOrEqual(25);
    expect(new Set(SURVEY_REPORT_CATALOG.map(item => item.id)).size).toBe(SURVEY_REPORT_CATALOG.length);
    expect(surveyReportBudget(3557, 700, 0.18)).toBe(1340.26);
    const all = calculateSurveyReportSchedule(3557);
    expect(all.total).toBeGreaterThan(0);
    expect(all.includedCount).toBe(SURVEY_REPORT_CATALOG.length);
    const selected = calculateSurveyReportSchedule(3557, { items: {
      topographical: { manualFee: 1700, quote: { id: 'quote-1', fileName: 'topo-quote.pdf', mimeType: 'application/pdf', size: 4, uploadedAt: '2026-10-13T00:00:00.000Z', dataUrl: 'data:application/pdf;base64,dGVzdA==' } },
      asbestos: { included: false },
    } });
    expect(selected.rows.find(item => item.id === 'topographical')?.amount).toBe(1700);
    expect(selected.rows.find(item => item.id === 'topographical')?.amountBasis).toBe('QUOTE');
    expect(selected.rows.find(item => item.id === 'asbestos')?.amount).toBe(0);
    expect(selected.total).toBeCloseTo(all.total - all.rows.find(item => item.id === 'topographical')!.budget + 1700 - all.rows.find(item => item.id === 'asbestos')!.budget, 2);
  });

  it('uses the budget until quote evidence and a quoted value are both supplied, including after reopen', () => {
    const budget = surveyReportBudget(3557, 700, 0.18);
    const noQuote = calculateSurveyReportSchedule(3557, { items: { topographical: { manualFee: 1700 } } });
    expect(noQuote.rows.find(row => row.id === 'topographical')?.amount).toBe(budget);
    const quote = { id: 'quote-1', fileName: 'topo.pdf', mimeType: 'application/pdf', size: 10,
      uploadedAt: '2026-10-13T00:00:00.000Z', storageMode: 'MANAGED_LOCAL' as const, localEvidencePath: 'evidence/quote-1.pdf' };
    const noValue = calculateSurveyReportSchedule(3557, { items: { topographical: { quote } } });
    expect(noValue.rows.find(row => row.id === 'topographical')?.amount).toBe(budget);
    const original = createDefaultAppraisalOption('RESIDENTIAL_SALES');
    const option = syncSurveyReportBillRows({ ...original,
      siteDimensions: [...(original.siteDimensions || []).map(row => row.costDriver === 'SITE_AREA_M2' ? { ...row, quantity: 3557 } : row)],
      surveyReports: { confirmedAt: '2026-10-13T00:00:00.000Z', items: { topographical: { quote, manualFee: 1700 } } },
    });
    const reopened = normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(option)));
    expect(reopened.surveyReports?.items?.topographical?.quote?.localEvidencePath).toBe('evidence/quote-1.pdf');
    const row = reopened.siteDimensions?.find(item => item.libraryRateId === `${PRELIMS_SURVEY_RATE_PREFIX}topographical`);
    expect(row && calculateSiteDimensionBaseTotal(row, reopened)).toBe(1700);
    const removed = syncSurveyReportBillRows({ ...reopened, surveyReports: { ...reopened.surveyReports,
      items: { ...reopened.surveyReports?.items, topographical: { quote: undefined, manualFee: undefined } } } });
    const restoredRow = removed.siteDimensions?.find(item => item.libraryRateId === `${PRELIMS_SURVEY_RATE_PREFIX}topographical`);
    expect(restoredRow && calculateSiteDimensionBaseTotal(restoredRow, removed)).toBe(budget);
  });

  it('replaces the old Site Investigations line with one fixed bill line per included report', () => {
    expect(AWD_PRELIMS_RATE_DEFINITIONS.some(rate => rate.id === 'awd-prelims-site-investigations')).toBe(false);
    const original = createDefaultAppraisalOption('RESIDENTIAL_SALES');
    const siteInvestigations = createSiteDimensionRow({ libraryRateId: 'awd-prelims-site-investigations', label: 'Site Investigations', costDriver: 'TOTAL_UNITS', unit: 'nr', rate: 500, priceIndex: 233, manualAdjustment: -100 });
    const option = {
      ...original,
      houseTypeSchedule: [createManualHouseTypeScheduleRow({ quantity: 4 })],
      siteDimensions: [...(original.siteDimensions || []).map(row => row.costDriver === 'SITE_AREA_M2' ? { ...row, quantity: 3557 } : row), siteInvestigations],
      surveyReports: { items: Object.fromEntries(SURVEY_REPORT_CATALOG.map(item => [item.id, { included: item.id === 'topographical' }])) },
    };
    expect(calculateSiteDimensionBaseTotal(siteInvestigations, option)).toBe(2000);
    const applied = syncSurveyReportBillRows({ ...option, surveyReports: { ...option.surveyReports, confirmedAt: '2026-10-13T00:00:00.000Z' } });
    expect(surveyReportsReview(applied).siteAreaM2).toBe(3557);
    expect(surveyReportsReview(applied).total).toBe(1340.26);
    expect(applied.siteDimensions?.some(row => row.libraryRateId === 'awd-prelims-site-investigations')).toBe(false);
    const reportRows = applied.siteDimensions!.filter(row => row.libraryRateId?.startsWith(PRELIMS_SURVEY_RATE_PREFIX));
    expect(reportRows.map(row => row.label)).toEqual(['Topographical survey', 'Surveys and reports — carried manual adjustment']);
    expect(reportRows.reduce((total, row) => total + calculateSiteDimensionTotal(row, applied), 0)).toBeCloseTo(1240.26, 2);
    expect(syncSurveyReportBillRows(applied).siteDimensions?.filter(row => row.libraryRateId?.startsWith(PRELIMS_SURVEY_RATE_PREFIX))).toHaveLength(2);
    const reopened = normalizeDevelopmentAppraisalOption(JSON.parse(JSON.stringify(applied)));
    expect(reopened.surveyReports?.confirmedAt).toBe(applied.surveyReports.confirmedAt);
    expect(surveyReportsReview(reopened).total).toBe(1340.26);
    expect(reopened.siteDimensions?.filter(row => row.libraryRateId?.startsWith(PRELIMS_SURVEY_RATE_PREFIX))).toHaveLength(2);
    expect(reopened.siteDimensions?.some(row => row.libraryRateId === 'awd-prelims-site-investigations')).toBe(false);
    const excluded = syncSurveyReportBillRows({ ...reopened, surveyReports: { ...reopened.surveyReports, items: { ...reopened.surveyReports?.items, topographical: { included: false } } } });
    expect(excluded.siteDimensions?.filter(row => row.libraryRateId?.startsWith(PRELIMS_SURVEY_RATE_PREFIX))).toHaveLength(1);
    const reIncluded = syncSurveyReportBillRows({ ...excluded, surveyReports: { ...excluded.surveyReports, items: { ...excluded.surveyReports?.items, topographical: { included: true } } } });
    expect(reIncluded.siteDimensions?.filter(row => row.libraryRateId === `${PRELIMS_SURVEY_RATE_PREFIX}topographical`)).toHaveLength(1);
  });

  it('preserves unreviewed legacy cost until the survey schedule is applied', () => {
    const original = createDefaultAppraisalOption('RESIDENTIAL_SALES');
    const legacy = createSiteDimensionRow({ libraryRateId: 'awd-prelims-site-investigations', label: 'Site Investigations', costDriver: 'TOTAL_UNITS', unit: 'nr', rate: 500 });
    const unreviewed = syncSurveyReportBillRows({ ...original, siteDimensions: [...(original.siteDimensions || []), legacy] });
    expect(unreviewed.siteDimensions?.find(row => row.id === legacy.id)?.label).toBe('Surveys and reports — prior allowance (review required)');
  });

  it('includes site-specific additional reports and zero-cost exclusions without mutating the catalogue', () => {
    const custom = { id: 'custom-test-1', label: 'Marine sediment sampling', category: 'Other', baseFee: 800, ratePerM2: 0.05, included: true };
    const result = calculateSurveyReportSchedule(2000, { custom: [custom], items: { 'archaeology-trench': { included: false } } });
    expect(result.rows.find(row => row.id === custom.id)?.amount).toBe(900);
    expect(result.rows.filter(row => row.id === custom.id)).toHaveLength(1);
    expect(SURVEY_REPORT_CATALOG.some(row => row.id === custom.id)).toBe(false);
  });

  it('turns each applied exclusion into separate unpriced report and conditional-work land-offer qualifications', () => {
    const original = createDefaultAppraisalOption('RESIDENTIAL_SALES');
    const choices = Object.fromEntries(SURVEY_REPORT_CATALOG.map(item => [item.id, { included: item.id !== 'noise' }]));
    const draft = { ...original, surveyReports: { items: choices } };
    expect(excludedSurveyAbnormalItems(draft)).toEqual([]);
    const applied = { ...draft, surveyReports: { ...draft.surveyReports, confirmedAt: '2026-10-13T00:00:00.000Z' } };
    const exclusions = excludedSurveyAbnormalItems(applied);
    expect(exclusions).toHaveLength(2);
    expect(exclusions.map(item => item.kind)).toEqual(['REPORT', 'WORK']);
    expect(exclusions[0].title).toBe('Noise survey and assessment');
    expect(exclusions[1].title).toMatch(/Acoustic barriers/);
    expect(exclusions.every(item => item.qualification.includes('not allowed for'))).toBe(true);
    const reIncluded = { ...applied, surveyReports: { ...applied.surveyReports, items: { ...choices, noise: { included: true } } } };
    expect(excludedSurveyAbnormalItems(reIncluded)).toEqual([]);
    const allExcluded = { ...applied, surveyReports: { ...applied.surveyReports, items: Object.fromEntries(SURVEY_REPORT_CATALOG.map(item => [item.id, { included: false }])) } };
    expect(excludedSurveyAbnormalItems(allExcluded)).toHaveLength(SURVEY_REPORT_CATALOG.length * 2);
    expect(excludedSurveyAbnormalItems(allExcluded).filter(item => item.kind === 'WORK').every(item => !item.title.startsWith('Additional investigation'))).toBe(true);
  });
});
