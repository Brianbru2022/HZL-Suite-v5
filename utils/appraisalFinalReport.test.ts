import { describe, expect, it } from 'vitest';
import type { DevelopmentAppraisalOption } from '../types';
import { buildFinalReportAiContext, buildFinalReportData, extractFinalReportNarrativeSection } from './appraisalFinalReport';

const HOUSE_TYPE_ROWS = [
  { id: 'house-1', libraryHouseTypeId: 'type-1', houseTypeName: 'Type A', quantity: 40, gifaM2: 80, buildCostPerM2: 1000, saleValuePerUnit: 250000 },
  { id: 'house-2', libraryHouseTypeId: 'type-2', houseTypeName: 'Type B', quantity: 40, gifaM2: 90, buildCostPerM2: 1000, saleValuePerUnit: 300000 },
];

function makeReportOption(overrides: Partial<DevelopmentAppraisalOption> = {}): DevelopmentAppraisalOption {
  return {
    id: 'option-1',
    name: 'Base option',
    template: 'RESIDENTIAL_SALES',
    calculationMode: 'RESIDUAL_LAND_VALUE',
    durationMonths: 12,
    targetProfitOnGdvPercent: 20,
    financeAnnualRatePercent: 0,
    revenueLines: [
      {
        id: 'revenue-1',
        title: 'Sales',
        template: 'RESIDENTIAL_SALES',
        units: 1,
        saleValuePerUnit: 1000000,
        cashflow: { type: 'END', startMonth: 12, endMonth: 12 },
      },
    ],
    costLines: [
      {
        id: 'cost-1',
        title: 'Build cost',
        category: 'CONSTRUCTION',
        amount: 400000,
        percentageBasis: 'NONE',
        percentageValue: 0,
        cashflow: { type: 'EVEN', startMonth: 1, endMonth: 12 },
      },
    ],
    houseTypeSchedule: HOUSE_TYPE_ROWS,
    createdAt: '2026-07-06T00:00:00.000Z',
    updatedAt: '2026-07-06T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildFinalReportData land price sensitivity', () => {
  it('uses five £500k land-price movements each side of the base and caps rows at the landowner receipt', () => {
    const report = buildFinalReportData(makeReportOption({ sellerMinimumLandValue: 12000000 }));
    const baseRow = report.landPriceSensitivityRows.find((row) => row.label === 'Base land appraisal');

    expect(baseRow).toBeDefined();
    expect(report.landPriceSensitivityRows).toContainEqual(expect.objectContaining({ landValue: Math.round((baseRow?.landValue || 0) - 500000) }));
    expect(report.landPriceSensitivityRows).toContainEqual(expect.objectContaining({ landValue: Math.round((baseRow?.landValue || 0) + 500000) }));
    expect(Math.max(...report.landPriceSensitivityRows.map((row) => row.landValue))).toBeLessThanOrEqual(12000000);
  });

  it('uses five £500k chunks each side of the base land appraisal when no seller receipt is recorded', () => {
    const report = buildFinalReportData(makeReportOption());
    const baseLand = report.currentScenario.landValue;

    expect(report.landPriceSensitivityRows).toHaveLength(11);
    expect(report.landPriceSensitivityRows[5].landValue).toBe(Math.max(0, Math.round(baseLand)));
    expect(report.landPriceSensitivityRows[5].label).toBe('Base land appraisal');
    expect(report.landPriceSensitivityRows[0].landValue).toBeLessThan(report.landPriceSensitivityRows[5].landValue);
    expect(report.landPriceSensitivityRows[10].landValue).toBeGreaterThan(report.landPriceSensitivityRows[5].landValue);
    expect(report.landPriceSensitivityRows[6].landValue - report.landPriceSensitivityRows[5].landValue).toBe(500000);
  });

  it('uses five equal intervals down to zero when the base land value is below £2.5m', () => {
    const report = buildFinalReportData(makeReportOption({
      houseTypeSchedule: [],
      revenueLines: [{
        id: 'sales',
        title: 'Sales',
        template: 'RESIDENTIAL_SALES',
        units: 1,
        saleValuePerUnit: 1000000,
        cashflow: { type: 'END', startMonth: 12, endMonth: 12 },
      }],
      costLines: [{
        id: 'build',
        title: 'Build',
        category: 'CONSTRUCTION',
        amount: 400000,
        percentageBasis: 'NONE',
        percentageValue: 0,
        cashflow: { type: 'EVEN', startMonth: 1, endMonth: 12 },
      }],
    }));

    expect(report.landPriceSensitivityRows).toHaveLength(11);
    expect(report.landPriceSensitivityRows[0].landValue).toBe(0);
    expect(report.landPriceSensitivityRows[5].label).toBe('Base land appraisal');
    expect(report.landPriceSensitivityRows[1].landValue - report.landPriceSensitivityRows[0].landValue)
      .toBeCloseTo(report.landPriceSensitivityRows[5].landValue / 5, 0);
  });

  it('provides four live residual land and profit-margin cases, including high-risk justification', () => {
    const report = buildFinalReportData(makeReportOption({
      assumptions: 'Retaining works and off-site drainage remain subject to confirmation.',
    }));

    const ricsRows = report.profitMarginRows.filter((row) => !row.isCurrentAppraisal);
    expect(report.profitMarginRows[0]).toEqual(expect.objectContaining({ label: 'Current appraisal', isCurrentAppraisal: true }));
    expect(ricsRows.map((row) => row.operatingAndProfitPercent)).toEqual([17.5, 20, 22.5, 25]);
    expect(ricsRows.map((row) => row.overheadPercent)).toEqual([5, 5, 5, 5]);
    expect(ricsRows.map((row) => row.targetProfitOnGdvPercent)).toEqual([12.5, 15, 17.5, 20]);
    ricsRows.forEach((row) => {
      expect(row.profitOnGdvPercent).toBeCloseTo(row.targetProfitOnGdvPercent, 6);
    });
    expect(report.profitMarginRows.find((row) => row.id === 'profit-margin-high')?.justification).toContain('Retaining works');
  });

  it('normalises obvious unit-count typos in the sales basis narrative', () => {
    const report = buildFinalReportData(makeReportOption({
      pricingReport: {
        id: 'pricing-report-1',
        fileName: 'Pricing report.pdf',
        mimeType: 'application/pdf',
        size: 1000,
        uploadedAt: '2026-07-06T00:00:00.000Z',
        dataUrl: 'data:application/pdf;base64,',
        notes: 'Based on 80g.',
      },
    }));

    expect(report.salesBasisNarrative).toContain('Based on 80 units.');
    expect(report.salesBasisNarrative).not.toContain('80g');
  });

  it('reports base sales plus index uplift as indexed sales', () => {
    const report = buildFinalReportData(makeReportOption({
      salesIndexationEnabled: true,
      salesIndexationPercent: 5,
      programme: { expectedStartDate: '2027-07-01' },
    }));

    expect(report.salesIndexUplift).toBeCloseTo(report.baseSalesGdv * 0.05, 2);
    expect(report.indexedSalesGdv).toBeCloseTo(report.baseSalesGdv + report.salesIndexUplift, 2);
    expect(report.salesBasisNarrative).toContain('Sales indexation adds');
    expect(report.houseTypeRows[0].indexedSaleValuePerUnit).toBeGreaterThan(report.houseTypeRows[0].saleValuePerUnit);
    expect(report.sensitivityRows[0].gdv).toBeGreaterThan(0);
  });

  it('makes trade-index contingency explicit to report narrative without presenting it as a cost discrepancy', () => {
    const context = buildFinalReportAiContext(makeReportOption({
      programme: { appraisalPriceIndex: 232, startPriceIndex: 242 },
      houseTypeSchedule: [{
        ...HOUSE_TYPE_ROWS[0],
        costBreakdown: [{
          id: 'groundwork',
          key: 'GROUNDWORK',
          label: 'Groundwork',
          amount: 80000,
          priceIndex: 215,
          included: true,
          notes: '',
        }],
      }],
    }));

    expect(context.reportNarrativeSchemaVersion).toBe('2026-10-13-unpriced-abnormal-land-offer-exclusions');
    expect(context.constructionCostBasis.constructionContingencyToSiteStart).toBeGreaterThan(0);
    expect(context.constructionCostBasis.statement).toContain('not a discrepancy');
    expect(context.houseCostChecks[0]).toEqual(expect.objectContaining({
      baseConstructionTotal: 3200000,
      baseBuildCostPerM2: 1000,
    }));
  });

  it('extracts the AI sales and GDV sections without displaying the other report headings', () => {
    const summary = `Overview\nCurrent position.\n\nSales prices and basis\nThe sales schedule is evidence-led.\n\nCosts and abnormals\nCosts follow.\n\nGDV improvement considerations\nTest the mix and layout against delivery costs.\n\nSummary and recommendation\nConclusion.`;

    expect(extractFinalReportNarrativeSection(summary, 'Sales prices and basis')).toBe('The sales schedule is evidence-led.');
    expect(extractFinalReportNarrativeSection(summary, 'GDV improvement considerations')).toBe('Test the mix and layout against delivery costs.');
  });

  it('keeps private and affordable construction as separate cost rows', () => {
    const report = buildFinalReportData(makeReportOption({
      costLines: [],
      houseTypeSchedule: [
        { ...HOUSE_TYPE_ROWS[0], tenure: 'PRIVATE' },
        { ...HOUSE_TYPE_ROWS[1], tenure: 'AFFORDABLE' },
      ],
    }));

    expect(report.groupedCostRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Private house construction', amount: 3200000 }),
      expect.objectContaining({ title: 'Affordable house construction', amount: 3600000 }),
    ]));
  });

  it('reconciles the cost breakdown through subtotal before land to total cost', () => {
    const report = buildFinalReportData(makeReportOption());
    const subtotal = report.costSummaryRows.find((row) => row.role === 'SUBTOTAL');
    const land = report.costSummaryRows.find((row) => row.role === 'LAND');
    const total = report.costSummaryRows.find((row) => row.role === 'TOTAL');

    expect(subtotal?.title).toBe('Subtotal before land');
    expect(land?.title).toBe('Residual land value');
    expect(total?.title).toBe('Total cost');
    expect((subtotal?.amount || 0) + (land?.amount || 0)).toBeCloseTo(total?.amount || 0, 2);
  });

  it('reports excluded surveys and conditional works as unpriced land-offer exclusions without changing financial totals', () => {
    const baseline = makeReportOption();
    const withExclusion = makeReportOption({ surveyReports: { confirmedAt: '2026-10-13T00:00:00.000Z', items: { noise: { included: false } } } });
    const before = buildFinalReportData(baseline);
    const after = buildFinalReportData(withExclusion);
    expect(after.notAllowedAbnormalRows).toHaveLength(2);
    expect(after.notAllowedAbnormalRows.map(row => row.kind)).toEqual(['REPORT', 'WORK']);
    expect(after.landOfferRows).toHaveLength(before.landOfferRows.length);
    expect(after.currentScenario.landValue).toBe(before.currentScenario.landValue);
    expect(after.currentScenario.profit).toBe(before.currentScenario.profit);
    expect(buildFinalReportAiContext(withExclusion).option.notAllowedAbnormalRows).toHaveLength(2);
  });

  it('provides readable documentary extracts, including formal quotations, to the report narrative', () => {
    const context = buildFinalReportAiContext(makeReportOption({
      pricingReport: {
        id: 'pricing-docx',
        fileName: 'Market pricing evidence.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1000,
        uploadedAt: '2026-07-06T00:00:00.000Z',
        dataUrl: 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,',
        extractedText: 'Comparable evidence supports a premium of £15,000 for south-facing plots with private driveways. The evidence also supports a base sales rate of £295 per square foot across the private housing mix, subject to the recorded specification.',
        extractionStatus: 'EXTRACTED',
      },
      costLines: [{
        id: 'abnormal-1',
        title: 'Retaining walls',
        category: 'ABNORMALS',
        amount: 120000,
        percentageBasis: 'NONE',
        percentageValue: 0,
        cashflow: { type: 'EVEN', startMonth: 1, endMonth: 12 },
        formalQuotations: [{
          id: 'quote-docx',
          fileName: 'Retaining wall quotation.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: 1000,
          uploadedAt: '2026-07-06T00:00:00.000Z',
          dataUrl: 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,',
          extractedText: 'The retaining wall allowance includes excavation, reinforced concrete foundations, engineered backfill and drainage. The quoted value is £120,000 excluding VAT.',
          extractionStatus: 'EXTRACTED',
        }],
      }],
    }));

    const evidence = context.option.documentaryEvidence;
    expect(evidence.salesAndPricing[0]?.extract).toContain('£15,000');
    expect(evidence.abnormalCostEvidence[0]?.quotationExtracts[0]?.extract).toContain('engineered backfill');
    expect(JSON.stringify(evidence)).not.toContain('Market pricing evidence.docx');
    expect(JSON.stringify(evidence)).not.toContain('Retaining wall quotation.docx');
  });
});
