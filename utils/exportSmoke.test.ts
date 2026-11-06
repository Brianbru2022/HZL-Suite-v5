import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppraisalRateLibraryItem, BoQBill, BoQItem, BoQSection, CostPlan, DevelopmentAppraisal, Project, TradePackage } from '../types';
import { UnitType } from '../types';
import {
  exportAppraisalDecisionPackToExcelBlob,
  exportAwdRateLibraryReportToExcelBlob,
  exportAppraisalDecisionPackToPdf,
  exportAppraisalFinalReportToDocxBlob,
  exportAppraisalLandownerViabilityToPdf,
  exportAppraisalLandOfferExclusionsToPdf,
  exportAppraisalRevenueCostSummaryToExcelBlob,
  exportAppraisalRevenueCostSummaryToPdf,
  exportCommercialPreliminaryAssessmentToPdf,
} from './appraisalExport';
import { exportCostPlanToExcel, exportCostPlanToPdf } from './costPlanExport';
import { exportBillToExcel, exportProjectToExcelWithOptions, exportSectionToExcel } from './excelExport';
import { exportBillToPdf } from './pdfExport';
import { buildProjectSummary } from './projectSummary';
import { syncSurveyReportBillRows } from './appraisal';
import { exportProjectSummaryToExcel, exportProjectSummaryToPdf } from './projectSummaryExport';

type DownloadMock = {
  anchor: {
    href: string;
    download: string;
    click: ReturnType<typeof vi.fn>;
  };
  createObjectURL: ReturnType<typeof vi.fn>;
  revokeObjectURL: ReturnType<typeof vi.fn>;
};

const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
const originalDocumentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');

function restoreGlobal(name: 'window' | 'document', descriptor: PropertyDescriptor | undefined) {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor);
    return;
  }

  delete (globalThis as Record<string, unknown>)[name];
}

function installDownloadMocks(): DownloadMock {
  const anchor = {
    href: '',
    download: '',
    click: vi.fn(),
  };
  const createObjectURL = vi.fn(() => 'blob:export-smoke');
  const revokeObjectURL = vi.fn();

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      URL: {
        createObjectURL,
        revokeObjectURL,
      },
    },
  });

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement: vi.fn(() => anchor),
    },
  });

  return {
    anchor,
    createObjectURL,
    revokeObjectURL,
  };
}

async function loadWorkbookFromBlob(blob: Blob) {
  const ExcelJSRuntime = await import('exceljs');
  const workbook = new ExcelJSRuntime.Workbook();
  await workbook.xlsx.load(await blob.arrayBuffer());
  return workbook;
}

async function loadDocxXmlFromBlob(blob: Blob, fileName: string) {
  const jsZipModule = await import('jszip');
  const zip = await jsZipModule.default.loadAsync(await blob.arrayBuffer());
  const file = zip.file(fileName);
  if (!file) throw new Error(`${fileName} was not found in generated docx.`);
  return file.async('string');
}

function makeItem(overrides: Partial<BoQItem>): BoQItem {
  return {
    id: overrides.id ?? 'item-1',
    type: overrides.type ?? 'PRICED',
    reference: overrides.reference ?? 'A10/1',
    description: overrides.description ?? 'Excavate reduced level dig',
    unit: overrides.unit ?? UnitType.M3,
    quantity: overrides.quantity ?? 2,
    rate: overrides.rate ?? 125,
    total: overrides.total ?? 250,
    dimensionRows: overrides.dimensionRows ?? [],
    ...overrides,
  };
}

function makeSection(): BoQSection {
  return {
    id: 'section-1',
    name: 'Groundworks',
    items: [
      makeItem({
        id: 'heading-1',
        type: 'GENERAL_HEADING',
        reference: '',
        description: 'Groundworks preliminaries',
        unit: '',
        quantity: 0,
        rate: 0,
        total: 0,
      }),
      makeItem({
        id: 'comment-1',
        type: 'COMMENT',
        reference: '',
        description: 'Allow for maintaining safe access during the works.',
        unit: '',
        quantity: 0,
        rate: 0,
        total: 0,
      }),
      makeItem({
        id: 'item-1',
        type: 'PRICED',
        reference: 'A10/1',
        description: 'Excavate trench for foundation',
        unit: UnitType.M3,
        quantity: 2,
        rate: 125,
        total: 250,
      }),
      makeItem({
        id: 'item-2',
        type: 'PROVISIONAL_SUM',
        reference: 'A10/2',
        description: 'Provisional sum for unknown obstructions',
        unit: UnitType.SUM,
        quantity: 1,
        rate: 500,
        total: 500,
      }),
    ],
  };
}

function makeProjectFixture(): { project: Project; bill: BoQBill; section: BoQSection; trades: TradePackage[] } {
  const section = makeSection();
  const bill: BoQBill = {
    id: 'bill-1',
    name: 'Main bill',
    billType: 'STANDARD',
    sections: [section],
    items: [],
  };
  const project: Project = {
    id: 'project-1',
    name: 'Smoke Project',
    client: 'Example Client',
    location: 'Example Site',
    reference: 'SMK-001',
    updatedAt: '2026-06-15T00:00:00.000Z',
    measurementStandard: 'SMM7',
    ohpPercentage: 5,
    bills: [bill],
  };
  const trades: TradePackage[] = [
    {
      id: 'trade-1',
      name: 'Groundworks',
      contractors: [],
    },
  ];

  return { project, bill, section, trades };
}

function makeBillLevelProjectFixture(): { project: Project; bill: BoQBill; trades: TradePackage[] } {
  const trades: TradePackage[] = [{ id: 'trade-1', name: 'Groundworks', contractors: [] }];
  const bill: BoQBill = {
    id: 'bill-direct',
    name: 'Direct bill',
    billType: 'STANDARD',
    sections: [],
    items: [
      makeItem({
        id: 'direct-heading',
        type: 'GENERAL_HEADING',
        reference: '',
        description: 'Direct bill items',
        unit: '',
        quantity: 0,
        rate: 0,
        total: 0,
      }),
      makeItem({
        id: 'direct-priced',
        type: 'PRICED',
        reference: 'D/1',
        description: 'Direct priced bill row',
        unit: UnitType.NR,
        quantity: 2,
        quantityDecimals: 3,
        rate: 500,
        total: 0,
        tradePackageId: 'trade-1',
      }),
    ],
  };
  const project: Project = {
    id: 'project-direct',
    name: 'Direct Bill Project',
    client: 'Example Client',
    location: 'Example Site',
    reference: 'DIR-001',
    updatedAt: '2026-06-15T00:00:00.000Z',
    measurementStandard: 'SMM7',
    ohpPercentage: 5,
    bills: [bill],
  };

  return { project, bill, trades };
}

function makeCostPlanFixture(): CostPlan {
  return {
    id: 'cost-plan-1',
    title: 'Smoke cost plan',
    source: 'BILL_SECTIONS',
    drawingBasis: 'OUTLINE_DRAWINGS',
    contingencyMode: 'SEPARATE',
    contingencyPercentage: 10,
    createdAt: '2026-06-15T00:00:00.000Z',
    updatedAt: '2026-06-15T00:00:00.000Z',
    lines: [
      {
        id: 'cost-plan-line-1',
        title: 'Groundworks',
        source: 'SECTION',
        sourceBillId: 'bill-1',
        sourceSectionId: 'section-1',
        baseValue: 750,
        contingencyValue: 75,
        totalValue: 825,
      },
    ],
  };
}

function makeAppraisalFixture(): DevelopmentAppraisal {
  return {
    id: 'appraisal-1',
    name: 'Smoke Appraisal',
    kind: 'HOUSE_BUILDING',
    reference: 'APP-001',
    client: 'Example Client',
    site: 'Example Site',
    status: 'DRAFT',
    projectId: 'project-1',
    selectedOptionId: 'option-1',
    createdAt: '2026-06-15T00:00:00.000Z',
    updatedAt: '2026-06-15T00:00:00.000Z',
    options: [
      {
        id: 'option-1',
        name: 'Residential base',
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
            units: 4,
            saleValuePerUnit: 250000,
            cashflow: { type: 'END', startMonth: 12, endMonth: 12 },
          },
        ],
        houseTypeSchedule: [
          {
            id: 'house-row-1',
            libraryHouseTypeId: 'house-type-1',
            houseTypeName: 'Type A',
            quantity: 4,
            gifaM2: 85,
            buildCostPerM2: 1550,
            saleValuePerUnit: 250000,
            saleRatePerM2: 0,
            notes: '',
          },
        ],
        siteDimensions: [
          {
            id: 'site-roads',
            category: 'ROADS',
            label: 'Roads',
            unit: 'm2',
            quantity: 120,
            rate: 75,
            notes: '',
          },
        ],
        costLines: [
          {
            id: 'cost-1',
            title: 'Construction',
            category: 'CONSTRUCTION',
            amount: 500000,
            percentageBasis: 'NONE',
            percentageValue: 0,
            cashflow: { type: 'EVEN', startMonth: 1, endMonth: 12 },
          },
        ],
        createdAt: '2026-06-15T00:00:00.000Z',
        updatedAt: '2026-06-15T00:00:00.000Z',
      },
    ],
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  restoreGlobal('window', originalWindowDescriptor);
  restoreGlobal('document', originalDocumentDescriptor);
});

describe('export smoke tests', () => {
  it('generates a bill PDF blob with the upgraded PDF runtime', async () => {
    const { project, bill } = makeProjectFixture();

    const result = await exportBillToPdf(project, bill);

    expect(result.filename).toBe('Smoke_Project-Main_bill.pdf');
    expect(result.blob.type).toBe('application/pdf');
    expect(result.blob.size).toBeGreaterThan(1000);
  });

  it('generates cost plan and project summary PDF blobs', async () => {
    const { project } = makeProjectFixture();
    const costPlan = makeCostPlanFixture();
    const summary = buildProjectSummary(project, 'BILLS_AND_SECTIONS');

    const costPlanPdf = await exportCostPlanToPdf(project, costPlan);
    const summaryPdf = await exportProjectSummaryToPdf(project, summary);

    expect(costPlanPdf.filename).toBe('Smoke_Project-cost-plan.pdf');
    expect(costPlanPdf.blob.type).toBe('application/pdf');
    expect(costPlanPdf.blob.size).toBeGreaterThan(1000);
    expect(summaryPdf.filename).toBe('Smoke_Project-project-summary.pdf');
    expect(summaryPdf.blob.type).toBe('application/pdf');
    expect(summaryPdf.blob.size).toBeGreaterThan(1000);
  });

  it('generates appraisal PDF and Excel decision pack blobs', async () => {
    const { project } = makeProjectFixture();
    const appraisal = makeAppraisalFixture();
    appraisal.options[0] = syncSurveyReportBillRows({ ...appraisal.options[0], surveyReports: {
      confirmedAt: '2026-10-13T00:00:00.000Z', items: {
        topographical: { manualFee: 1750, quote: { id: 'topo-quote', fileName: 'topo-quote.pdf', mimeType: 'application/pdf', size: 4,
          uploadedAt: '2026-10-13T00:00:00.000Z', dataUrl: 'data:application/pdf;base64,dGVzdA==' } },
      },
    } });

    const pdf = await exportAppraisalDecisionPackToPdf(appraisal, [project]);
    const excel = await exportAppraisalDecisionPackToExcelBlob(appraisal, [project]);

    expect(pdf.filename).toBe('Smoke_Appraisal-appraisal-decision-pack.pdf');
    expect(pdf.blob.type).toBe('application/pdf');
    expect(pdf.blob.size).toBeGreaterThan(1000);
    expect(excel.filename).toBe('Smoke_Appraisal-appraisal-decision-pack.xlsx');
    expect(excel.blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(excel.blob.size).toBeGreaterThan(1000);
    const workbook = await loadWorkbookFromBlob(excel.blob);
    const surveyValues = workbook.getWorksheet('Surveys & Reports')!.getSheetValues().flat(2);
    expect(surveyValues).toContain('topo-quote.pdf');
    expect(surveyValues).toContain('Quote');
    expect(surveyValues).toContain(1750);
    const metricValues = workbook.getWorksheet('Site Metrics')!.getSheetValues().flat(2);
    expect(metricValues).toContain('Topographical survey');
  }, 60000);

  it('generates a compact appraisal revenue and cost summary PDF', async () => {
    const { project } = makeProjectFixture();
    const appraisal = makeAppraisalFixture();
    appraisal.options[0].sellerMinimumLandValue = 250000;
    appraisal.options[0].surveyReports = { confirmedAt: '2026-10-13T00:00:00.000Z', items: { noise: { included: false } } };

    const pdf = await exportAppraisalRevenueCostSummaryToPdf(appraisal, [project]);

    expect(pdf.filename).toBe('Smoke_Appraisal-revenue-cost-summary.pdf');
    expect(pdf.blob.type).toBe('application/pdf');
    expect(pdf.blob.size).toBeGreaterThan(1000);
  }, 60000);

  it('exports a standalone schedule of unpriced report and work exclusions', async () => {
    const option = makeAppraisalFixture().options[0];
    option.surveyReports = { confirmedAt: '2026-10-13T00:00:00.000Z', items: { noise: { included: false } } };
    const pdf = await exportAppraisalLandOfferExclusionsToPdf(option, 'Smoke Appraisal');
    expect(pdf.filename).toBe('Smoke_Appraisal-Residential_base-land-offer-exclusions.pdf');
    expect(pdf.blob.type).toBe('application/pdf');
    expect(pdf.blob.size).toBeGreaterThan(1000);
  });

  it('generates a landowner viability PDF against a report-only land cost', async () => {
    const { project } = makeProjectFixture();
    const appraisal = makeAppraisalFixture();

    const pdf = await exportAppraisalLandownerViabilityToPdf(appraisal, [project], 250000);

    expect(pdf.filename).toMatch(/^Example_Site-\d{4}-\d{2}-\d{2}-high-level-overview\.pdf$/);
    expect(pdf.blob.type).toBe('application/pdf');
    expect(pdf.blob.size).toBeGreaterThan(1000);
  }, 60000);

  it('exports a retained commercial preliminary assessment without requiring a completed model', async () => {
    const appraisal = makeAppraisalFixture();
    appraisal.kind = 'COMMERCIAL';
    appraisal.name = 'Cambuslang Commercial Pilot';
    appraisal.options[0] = {
      ...appraisal.options[0],
      template: 'COMMERCIAL_INCOME',
      commercialAssessmentStage: 'PRELIMINARY',
      commercialLocation: 'Hamilton Road, Cambuslang',
      commercialInitialAssessmentBriefs: [{
        id: 'commercial-brief',
        fileName: 'Cambuslang preliminary assessment.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        uploadedAt: '2026-08-07T00:00:00.000Z',
        dataUrl: 'data:application/pdf;base64,',
        extractedText: 'The submitted site is subject to access, servicing and planning review before a commercial mix is confirmed.',
        extractionStatus: 'EXTRACTED',
        notes: 'Retained pilot evidence.',
      }],
    };

    const pdf = await exportCommercialPreliminaryAssessmentToPdf(appraisal, [], 'Cambuslang commercial pilot preliminary');

    expect(pdf.filename).toBe('Cambuslang_commercial_pilot_preliminary.pdf');
    expect(pdf.blob.type).toBe('application/pdf');
    expect(pdf.blob.size).toBeGreaterThan(1000);
  }, 60000);

  it('generates an appraisal revenue and cost summary with site-cost schedules', async () => {
    const { project } = makeProjectFixture();
    const appraisal = makeAppraisalFixture();
    appraisal.options[0].sellerMinimumLandValue = 250000;
    appraisal.options[0] = syncSurveyReportBillRows({ ...appraisal.options[0], surveyReports: {
      confirmedAt: '2026-10-13T00:00:00.000Z', items: {
        noise: { included: false },
        topographical: { manualFee: 1750, quote: { id: 'topo-quote', fileName: 'topo-quote.pdf', mimeType: 'application/pdf', size: 4,
          uploadedAt: '2026-10-13T00:00:00.000Z', dataUrl: 'data:application/pdf;base64,dGVzdA==' } },
      },
    } });

    appraisal.options[0].costLines.push({ ...appraisal.options[0].costLines[0], id: 'site-specific-suds', title: 'SUDS basin', category: 'ABNORMALS', amount: 12500, percentageBasis: 'NONE', siteCost: { allocation: 'SITE_SPECIFIC', status: 'PROVISIONAL', includeInLandOffer: true, history: [] } });
    const excel = await exportAppraisalRevenueCostSummaryToExcelBlob(appraisal, [project]);
    const workbook = await loadWorkbookFromBlob(excel.blob);
    const sheet = workbook.getWorksheet('Revenue Cost Summary');

    expect(excel.filename).toBe('Smoke_Appraisal-revenue-cost-summary.xlsx');
    expect(excel.blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(workbook.worksheets.map(sheet => sheet.name)).toEqual(expect.arrayContaining(['Revenue Cost Summary', 'Site costs and allowances', 'Report Site Elements', 'Land offer schedule', 'Land offer exclusions', 'Site cost change history']));
    const excludedValues = workbook.getWorksheet('Land offer exclusions')!.getSheetValues().flat(2);
    expect(excludedValues).toContain('Noise survey and assessment');
    expect(excludedValues).toContain('Acoustic barriers, glazing, ventilation or other noise mitigation');
    const siteValues = workbook.getWorksheet('Site costs and allowances')!.getSheetValues().flat(2);
    expect(siteValues).toContain('Site-specific works');
    expect(siteValues).toContain(12500);
    const elementValues = workbook.getWorksheet('Report Site Elements')!.getSheetValues().flat(2);
    expect(elementValues).toContain('SUDS basin');
    expect(elementValues).toContain('Site-specific works');
    expect(sheet).toBeDefined();
    expect(sheet?.getCell('A1').value).toBe('Revenue And Cost Summary');
    expect(sheet?.getCell('A4').value).toBe('Revenue');
    expect(sheet?.getCell('F4').value).toBe('Cost');
    const values = sheet ? Array.from({ length: sheet.rowCount }, (_, index) => sheet.getRow(index + 1).values).flat() : [];
    expect(values).toContain('Indexed revenue');
    expect(values).toContain('Total cost');
    expect(values).toContain('Land scenario summary');
    expect(values).toContain('Base assumptions');
    expect(values).toContain('Sales index uplift %');
    expect(values).toContain('Sales indexation uplift');
    const indexedRevenueRow = sheet?.getColumn(1).values.findIndex((value) => value === 'Indexed revenue') ?? -1;
    const salesIndexationRow = sheet?.getColumn(1).values.findIndex((value) => value === 'Sales indexation uplift') ?? -1;
    const totalCostRow = sheet?.getColumn(6).values.findIndex((value) => value === 'Total cost') ?? -1;
    expect(indexedRevenueRow).toBeGreaterThan(0);
    expect(salesIndexationRow).toBeGreaterThan(0);
    expect(totalCostRow).toBeGreaterThan(0);
    expect(sheet?.getColumn(5).width).toBeGreaterThanOrEqual(20);
    expect(sheet?.getColumn(10).width).toBeGreaterThanOrEqual(28);
    expect(sheet?.getCell(salesIndexationRow, 3).value).toMatchObject({ formula: expect.stringContaining('$K$5') });
    expect(sheet?.getCell(indexedRevenueRow, 3).value).toMatchObject({ formula: expect.any(String) });
    expect(sheet?.getCell(totalCostRow, 8).value).toMatchObject({ formula: expect.any(String) });
  }, 60000);

  it('generates an AWD Plot Works and Infrastructure rate library workbook', async () => {
    const now = '2026-09-15T00:00:00.000Z';
    const rates: AppraisalRateLibraryItem[] = [
      {
        id: 'awd-infrastructure-roads', category: 'ROADS', costDriver: 'ROADS_M2', label: 'Road construction',
        unit: 'm2', rate: 108.83, priceIndex: 215, sourceFormula: 'AWD base formula', notes: 'Infrastructure. Per m2. Base formula: AWD roads.',
        status: 'ACTIVE', createdAt: now, updatedAt: now,
      },
      {
        id: 'awd-plot-works-drives', category: 'DRIVES', costDriver: 'PLOT_WORKS_DRIVES_M2', label: 'Private drives',
        unit: 'm2', rate: 62.50, priceIndex: 215, sourceFormula: 'AWD base formula', notes: 'Plot works. Per m2. Base formula: AWD private drives.',
        status: 'ACTIVE', createdAt: now, updatedAt: now,
      },
    ];

    const excel = await exportAwdRateLibraryReportToExcelBlob(rates);
    const workbook = await loadWorkbookFromBlob(excel.blob);

    expect(excel.filename).toBe('AWD-plotworks-infrastructure-rate-library.xlsx');
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Summary', 'Infrastructure', 'Plot Works']);
    expect(workbook.getWorksheet('Summary')?.getCell('B3').value).toContain('Reusable base rates only');
    expect(workbook.getWorksheet('Infrastructure')?.getCell('A2').value).toBe('Road construction');
    expect(workbook.getWorksheet('Plot Works')?.getCell('A2').value).toBe('Private drives');
  }, 60000);

  it('generates a styled appraisal Word final report', async () => {
    const { project } = makeProjectFixture();
    const appraisal = makeAppraisalFixture();
    appraisal.options[0].finalReportExecutiveSummary = [
      'Overview',
      'The appraisal shows a concise residual land value position at £27,290,000.',
      'Summary and recommendation',
      'Recommended based on the current appraisal return.',
    ].join('\n');
    appraisal.options[0].costLines.push(
      {
        id: 'abnormal-quote',
        title: 'Quoted remediation',
        category: 'ABNORMALS',
        amount: 125000,
        percentageBasis: 'NONE',
        percentageValue: 0,
        cashflow: { type: 'EVEN', startMonth: 1, endMonth: 12 },
        notes: 'Allowance based on formal contractor pricing.',
        formalQuotations: [{
          id: 'quote-1',
          fileName: 'Remediation quote.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          uploadedAt: '2026-06-15T00:00:00.000Z',
          dataUrl: 'data:application/pdf;base64,',
          notes: 'Quoted remediation works.',
        }],
      },
      {
        id: 'abnormal-linked',
        title: 'Linked retaining walls',
        category: 'ABNORMALS',
        amount: 50000,
        percentageBasis: 'NONE',
        percentageValue: 0,
        cashflow: { type: 'EVEN', startMonth: 1, endMonth: 12 },
        sourceLabel: 'Retaining Walls / Specialist Retaining Walls',
        notes: 'Calculated from linked estimate source.',
      },
      {
        id: 'abnormal-allowance',
        title: 'Allowance only item',
        category: 'ABNORMALS',
        amount: 25000,
        percentageBasis: 'NONE',
        percentageValue: 0,
        cashflow: { type: 'EVEN', startMonth: 1, endMonth: 12 },
        notes: 'No quote received yet.',
      },
    );

    const word = await exportAppraisalFinalReportToDocxBlob(appraisal, [project]);
    const documentXml = await loadDocxXmlFromBlob(word.blob, 'word/document.xml');
    const stylesXml = await loadDocxXmlFromBlob(word.blob, 'word/styles.xml');

    expect(word.filename).toBe('Smoke_Appraisal-final-report.docx');
    expect(word.blob.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(word.blob.size).toBeGreaterThan(1000);
    expect(stylesXml).toContain('ProfessionalTable');
    expect(documentXml).toContain('Final Appraisal Report');
    expect(documentXml).toContain('<w:pBdr><w:bottom');
    expect(documentXml).toContain('<w:keepNext/>');
    expect(documentXml).toContain('<w:cantSplit/>');
    expect(documentXml).toContain('GDV/GSV And Cost Summary');
    expect(documentXml).toContain('Residual Land Value');
    expect(documentXml).toContain('Summary And Recommendation');
    expect(documentXml).toContain('Land Price Profitability Sensitivity');
    expect(documentXml).toContain('RICS House Builders Profit Margins');
    expect(documentXml).toContain('Sales Sensitivity');
    expect(documentXml).toMatch(/<w:br w:type="page"\/><\/w:r><\/w:p>\s*<w:p><w:pPr><w:pStyle w:val="Heading1"\/>[\s\S]*?Land Price Profitability Sensitivity/);
    expect(documentXml).toContain('<w:u w:val="single"/>');
    expect(documentXml).toMatch(/RECOMMENDED|TO CONSIDER|NOT RECOMMENDED/);
    expect(documentXml).toContain('£27,290,000');
    expect(documentXml).not.toMatch(/GBP\s/);
    expect(documentXml).not.toMatch(/£[\d,]+\.00/);
    expect(documentXml).toContain('Basis: formal quotation received');
    expect(documentXml).toContain('Basis: calculated from linked estimate/rates');
    expect(documentXml).toContain('Basis: allowance only - no quote or source rate recorded');
    expect(documentXml).toContain('Sales Prices And Basis');
  }, 60000);

  it('downloads bill and section Excel exports through the browser fallback', async () => {
    const { project, bill, section, trades } = makeProjectFixture();
    const download = installDownloadMocks();

    await exportBillToExcel(project, bill, trades);
    await exportSectionToExcel(project, bill, section, trades);

    expect(download.anchor.click).toHaveBeenCalledTimes(2);
    expect(download.createObjectURL).toHaveBeenCalledTimes(2);
    expect(download.revokeObjectURL).toHaveBeenCalledTimes(2);
    expect(download.anchor.download).toBe('BoQ-Smoke_Project-Main_bill-Groundworks.xlsx');
  }, 20000);

  it('exports bill-level priced rows into project workbooks', async () => {
    const { project, bill, trades } = makeBillLevelProjectFixture();
    const download = installDownloadMocks();

    await exportProjectToExcelWithOptions(project, trades, { mode: 'bill-tabs' });

    const exportedBlob = download.createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(exportedBlob).toBeInstanceOf(Blob);

    const workbook = await loadWorkbookFromBlob(exportedBlob);
    const billSheet = workbook.getWorksheet('1. Direct bill');

    expect(billSheet).toBeTruthy();
    expect(billSheet?.getCell('B3').value).toBe('Direct bill items');
    expect(billSheet?.getCell('B4').value).toBe('Direct priced bill row');
    expect(billSheet?.getCell('D4').numFmt).toBe('#,##0.000');
    expect(billSheet?.getCell('E4').value).toBe(500);
    expect(billSheet?.getCell('F4').value).toMatchObject({ formula: 'D4*E4', result: 1000 });
    expect(billSheet?.getCell('F5').value).toMatchObject({ result: 1000 });
    expect(billSheet?.getCell('F9').value).toMatchObject({ result: 1050 });

    download.createObjectURL.mockClear();

    await exportBillToExcel(project, bill, trades);

    const billWorkbookBlob = download.createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(billWorkbookBlob).toBeInstanceOf(Blob);

    const billWorkbook = await loadWorkbookFromBlob(billWorkbookBlob);
    const directBillSheet = billWorkbook.getWorksheet('1. Direct bill');

    expect(directBillSheet).toBeTruthy();
    expect(directBillSheet?.getCell('B4').value).toBe('Direct bill items');
    expect(directBillSheet?.getCell('B5').value).toBe('Direct priced bill row');
    expect(directBillSheet?.getCell('D5').numFmt).toBe('#,##0.000');
    expect(directBillSheet?.getCell('F5').value).toMatchObject({ formula: 'D5*E5', result: 1000 });
    expect(directBillSheet?.getCell('F6').value).toMatchObject({ result: 1000 });
  }, 20000);

  it('fits exported bill summary columns and large total columns', async () => {
    const { project, bill, trades } = makeBillLevelProjectFixture();
    const longBillName = 'Direct bill with a very long workbook summary label';
    bill.name = longBillName;
    const pricedItem = bill.items?.find((item) => item.id === 'direct-priced');
    if (pricedItem) {
      pricedItem.quantity = 123456.7891;
      pricedItem.quantityDecimals = 4;
      pricedItem.rate = 1000;
      pricedItem.total = 0;
    }
    const download = installDownloadMocks();

    await exportProjectToExcelWithOptions(project, trades, { mode: 'bill-tabs' });

    const exportedBlob = download.createObjectURL.mock.calls[0]?.[0] as Blob;
    const workbook = await loadWorkbookFromBlob(exportedBlob);
    const summarySheet = workbook.getWorksheet('Project Summary');
    const billSheet = workbook.worksheets.find((sheet) => sheet.name !== 'Project Summary');

    expect(summarySheet).toBeTruthy();
    expect(billSheet).toBeTruthy();
    expect(summarySheet?.getCell('A8').value).toBe('Bill nr');
    expect(summarySheet?.getCell('A9').value).toBe(1);
    expect(summarySheet?.getCell('B8').value).toBe('Bill');
    expect(summarySheet?.getCell('B9').value).toMatchObject({
      text: longBillName,
      hyperlink: `#'${billSheet?.name}'!A1`,
    });
    expect(summarySheet?.getColumn(2).width || 0).toBeGreaterThanOrEqual(longBillName.length + 3);
    expect(summarySheet?.getColumn(5).width || 0).toBeGreaterThanOrEqual((billSheet?.name.length || 0) + 3);
    expect(billSheet?.getColumn(6).width || 0).toBeGreaterThan(16);
    expect(billSheet?.getCell('D4').numFmt).toBe('#,##0.0000');
    expect(billSheet?.getCell('F9').value).toMatchObject({ result: 129629628.555 });
  }, 20000);

  it('downloads cost plan and project summary Excel exports through the browser fallback', async () => {
    const { project } = makeProjectFixture();
    const costPlan = makeCostPlanFixture();
    const summary = buildProjectSummary(project, 'BILLS_AND_SECTIONS');
    const download = installDownloadMocks();

    await exportCostPlanToExcel(project, costPlan);
    expect(download.anchor.download).toBe('Smoke_Project-cost-plan.xlsx');

    await exportProjectSummaryToExcel(project, summary);
    expect(download.anchor.download).toBe('Smoke_Project-project-summary.xlsx');
    expect(download.anchor.click).toHaveBeenCalledTimes(2);
    expect(download.createObjectURL).toHaveBeenCalledTimes(2);
    expect(download.revokeObjectURL).toHaveBeenCalledTimes(2);
  }, 20000);
});
