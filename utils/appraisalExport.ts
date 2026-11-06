import { isAbnormalRemovalRow } from './appraisalSiteCosts';
import { isSiteCostElement } from './appraisalSiteCosts';
import type * as ExcelJS from 'exceljs';
import type { AppraisalApprovedReportIssue, AppraisalPricingReport, AppraisalRateLibraryItem, DevelopmentAppraisal, Project } from '../types';
import {
  APPRAISAL_INFRASTRUCTURE_COST_DRIVER_LABELS,
  APPRAISAL_MODE_LABELS,
  APPRAISAL_TEMPLATE_LABELS,
  buildMonthlyCashflow,
  calculateAppraisalOption,
  calculateCostLines,
  calculateFinalReportMetrics,
  calculateHouseTypeConstructionTotal,
  calculateHouseTypeGdv,
  calculateHouseTypeSalesQuantity,
  calculateHouseTypeScheduleBuildCostPerM2,
  calculateSellerLandPriceMetrics,
  calculateSiteDimensionBaseTotal,
  calculateSiteDimensionManualAdjustment,
  calculateSiteDimensionTotal,
  compareAppraisalOptions,
  resolveSiteDimensionQuantity,
  temporaryPowerLinePresentation,
  siteAccommodationLinePresentation,
  fuelLinePresentation,
  safetyPlantLinePresentation,
  miniSkipsLinePresentation,
  skipWasteLinePresentation,
  plotHeatingLinePresentation,
  herasFencingLinePresentation,
  siloGeneratorLinePresentation,
  salesPrelimsLinePresentation,
  rccFeeReview,
  surveyReportsReview,
  PRELIMS_SURVEY_RATE_PREFIX,
  summariseHouseBuildingOption,
} from './appraisal';
import { buildFinalReportData, extractFinalReportNarrativeSection } from './appraisalFinalReport';
import { currentArchitectFeasibilityLayout, renderArchitectFeasibilityLayout } from './appraisalLayoutPreview';
import { dataUrlToArrayBuffer } from './appraisalEvidenceExtraction';
import { resolveAppraisalEvidenceDataUrl } from './appraisalEvidenceStorage';
import { createExcelWorkbook } from './excelJsRuntime';
import { assertExportArtifact } from './exportArtifactVerification';
import { recordOperationLogEntry } from './operationLog';
import { appraisalFromApprovedReportIssue, issueControl, type ReportIssueControl } from './appraisalReportIssue';
import { isAwdInfrastructureRate, isAwdPlotWorksRate } from './appraisalInfrastructureRatePacks';

type PdfRuntime = {
  jsPDF: typeof import('jspdf').jsPDF;
  autoTable: typeof import('jspdf-autotable').default;
};

let pdfRuntimePromise: Promise<PdfRuntime> | null = null;

function loadPdfRuntime() {
  pdfRuntimePromise ??= Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]).then(([jspdfModule, autoTableModule]) => ({
    jsPDF: jspdfModule.jsPDF,
    autoTable: autoTableModule.default,
  }));

  return pdfRuntimePromise;
}

function safeFilename(value: string) {
  return (value || 'development-appraisal').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'development-appraisal';
}

function formatMoney(value: number) {
  return `£${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCompactMoney(value: number) {
  const abs = Math.abs(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
  return `${value < 0 ? '-' : ''}£${abs}`;
}

function formatPercent(value: number) {
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function formatRate(value: number) {
  return `${formatMoney(value)}/ft2`;
}

function formatReportValue(row: { value: number; isPercent?: boolean }) {
  return row.isPercent ? formatPercent(row.value) : formatMoney(row.value);
}

function finalReportRecommendation(option: DevelopmentAppraisal['options'][number]) {
  const metrics = calculateFinalReportMetrics(option).metrics;
  if (metrics.profitOnGdvPercent > 18) {
    return {
      label: 'Recommended',
      shortLabel: 'Recommended',
      tone: 'good' as const,
      basis: `${formatPercent(metrics.profitOnGdvPercent)} profit on GDV/GSV is above the 18.0% recommended threshold.`,
    };
  }
  if (metrics.profitOnGdvPercent >= 12) {
    return {
      label: 'To Consider',
      shortLabel: 'To Consider',
      tone: 'watch' as const,
      basis: `${formatPercent(metrics.profitOnGdvPercent)} profit on GDV/GSV sits between 12.0% and 18.0%.`,
    };
  }
  return {
    label: 'Not Recommended',
    shortLabel: 'Not Recommended',
    tone: 'bad' as const,
    basis: `${formatPercent(metrics.profitOnGdvPercent)} profit on GDV/GSV is below the 12.0% minimum threshold.`,
  };
}

function summaryRecommendationText(summary: string, fallback: string) {
  const lines = (summary || '').split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const headingIndex = lines.findIndex((line) => /^summary and recommendation:?$/i.test(line));
  if (headingIndex >= 0) {
    const nextHeadingIndex = lines.findIndex((line, index) => index > headingIndex && /^[A-Z][A-Za-z\s/&-]{2,}:?$/.test(line) && line.length < 60);
    return lines.slice(headingIndex + 1, nextHeadingIndex >= 0 ? nextHeadingIndex : undefined).join(' ').trim() || fallback;
  }
  const recommendationLine = lines.find((line) => /recommended|consider|discount|not recommended/i.test(line));
  return recommendationLine || fallback;
}

function recommendationLabel(value: string) {
  if (value === 'WATCH') return 'Consider depending on requirement';
  if (value === 'UNVIABLE') return 'Subject to discount';
  if (value === 'RECOMMENDED' || value === 'VIABLE') return 'Recommended';
  return value;
}

async function createWorkbook() {
  return createExcelWorkbook();
}

async function addApprovedIssueControlSheet(workbook: ExcelJS.Workbook, control?: ReportIssueControl) {
  if (!control) return;
  const sheet = workbook.addWorksheet('Issue control');
  sheet.columns = [{ header: 'Control item', key: 'item', width: 30 }, { header: 'Value', key: 'value', width: 76 }];
  styleHeader(sheet.getRow(1));
  sheet.addRows([
    { item: 'Issue status', value: 'APPROVED - LOCKED ISSUE OUTPUT' },
    { item: 'Issue number', value: control.issueNumber },
    { item: 'Reviewer', value: control.reviewer },
    { item: 'Approval date', value: control.approvedAt },
    { item: 'Immutable source SHA-256', value: control.sourceHash },
    { item: 'Use', value: 'This workbook was generated from the approved source snapshot. Amendments require a new approved issue.' },
  ]);
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', wrapText: true };
    });
  });
  await sheet.protect('', { selectLockedCells: false, selectUnlockedCells: false });
}

async function lockApprovedIssueWorkbook(workbook: ExcelJS.Workbook, control?: ReportIssueControl) {
  if (!control) return;
  const password = control.sourceHash.slice(0, 24);
  await Promise.all(workbook.worksheets.map((sheet) => sheet.protect(password, {
    selectLockedCells: true,
    selectUnlockedCells: false,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    deleteColumns: false,
    deleteRows: false,
    sort: false,
    autoFilter: false,
    pivotTables: false,
  })));
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
}

function styleNegativeNumbers(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    if (typeof cell.value === 'number' && cell.value < 0) {
      cell.font = { ...(cell.font || {}), color: { argb: 'FFB91C1C' } };
    }
  });
}

function pdfNegativeCellHook(data: any) {
  if (data?.section !== 'body' || !data.cell) return;
  const raw = String(data.cell.raw ?? '');
  if (/(GBP\s*-|-£|-?\d+\.\d%|-?\d+%)/.test(raw) && raw.includes('-')) {
    if (data.cell.styles) data.cell.styles.textColor = [185, 28, 28];
  }
}

function costSummaryRowTitle(data: any) {
  const rawRow = data?.row?.raw;
  return Array.isArray(rawRow) ? String(rawRow[0] ?? '') : '';
}

function pdfCostSummaryCellHook(data: any) {
  pdfNegativeCellHook(data);
  if (data?.section !== 'body' || !data.cell?.styles) return;

  const title = costSummaryRowTitle(data);
  if (title === 'Subtotal before land' || title === 'Total cost') {
    data.cell.styles.fontStyle = 'bold';
    data.cell.styles.fillColor = title === 'Total cost' ? [241, 245, 249] : [248, 250, 252];
  }
}

function pdfCostSummaryRuleHook(data: any) {
  if (data?.section !== 'body' || !data.cell || !data.doc) return;
  const title = costSummaryRowTitle(data);
  if (title !== 'Subtotal before land' && title !== 'Total cost') return;

  data.doc.setDrawColor(15, 23, 42);
  data.doc.setLineWidth(title === 'Total cost' ? 0.65 : 0.35);
  data.doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
}

function linkedProjectName(appraisal: DevelopmentAppraisal, projects: Project[]) {
  if (!appraisal.projectId) return 'Unlinked';
  return projects.find((project) => project.id === appraisal.projectId)?.name || 'Linked project unavailable';
}

function addComparisonSheet(workbook: ExcelJS.Workbook, appraisal: DevelopmentAppraisal) {
  const sheet = workbook.addWorksheet('Option Comparison');
  sheet.columns = [
    { header: 'Option', key: 'option', width: 28 },
    { header: 'Template', key: 'template', width: 20 },
    { header: 'Mode', key: 'mode', width: 28 },
    { header: 'GDV', key: 'gdv', width: 16 },
    { header: 'Non-land cost', key: 'nonLandCost', width: 18 },
    { header: 'Finance', key: 'financeCost', width: 16 },
    { header: 'Land value', key: 'landValue', width: 16 },
    { header: 'Total cost', key: 'totalCost', width: 16 },
    { header: 'Profit', key: 'profit', width: 16 },
    { header: 'Profit on GDV', key: 'profitOnGdvPercent', width: 16 },
    { header: 'Seller land', key: 'sellerLandValue', width: 16 },
    { header: 'Seller profit', key: 'sellerProfit', width: 16 },
    { header: 'Seller profit on GDV', key: 'sellerProfitOnGdvPercent', width: 20 },
    { header: 'Residual / surplus', key: 'residualOrSurplus', width: 18 },
    { header: 'Recommendation', key: 'recommendation', width: 16 },
    { header: 'Selected report option', key: 'selectedReportOption', width: 22 },
  ];
  styleHeader(sheet.getRow(1));

  compareAppraisalOptions(appraisal).forEach(({ option, isRecommended }) => {
    const finalReportMetrics = calculateFinalReportMetrics(option);
    const metrics = finalReportMetrics.metrics;
    const originalMetrics = finalReportMetrics.originalMetrics;
    const sellerMetrics = calculateSellerLandPriceMetrics(option);
    const row = sheet.addRow({
      option: option.name,
      template: APPRAISAL_TEMPLATE_LABELS[option.template],
      mode: APPRAISAL_MODE_LABELS[option.calculationMode],
      gdv: metrics.gdv,
      nonLandCost: metrics.nonLandCost,
      financeCost: metrics.financeCost,
      landValue: metrics.landValue,
      totalCost: metrics.totalCost,
      profit: metrics.profit,
      profitOnGdvPercent: metrics.profitOnGdvPercent / 100,
      sellerLandValue: sellerMetrics?.landValue || 0,
      sellerProfit: sellerMetrics?.profit || 0,
      sellerProfitOnGdvPercent: sellerMetrics ? sellerMetrics.profitOnGdvPercent / 100 : 0,
      residualOrSurplus: metrics.residualOrSurplus,
      recommendation: recommendationLabel(metrics.recommendation),
      selectedReportOption: isRecommended ? 'Yes' : '',
    });
    if (finalReportMetrics.hasNegativeResidualLand) {
      row.getCell('landValue').value = {
        richText: [
          { text: formatMoney(originalMetrics.landValue), font: { strike: true, color: { argb: 'FFB91C1C' } } },
          { text: ` ${formatMoney(metrics.landValue)}` },
        ],
      };
      row.getCell('profit').value = {
        richText: [
          { text: formatMoney(originalMetrics.profit), font: { strike: true, color: { argb: 'FFB91C1C' } } },
          { text: ` ${formatMoney(metrics.profit)}` },
        ],
      };
      row.getCell('profitOnGdvPercent').value = {
        richText: [
          { text: formatPercent(originalMetrics.profitOnGdvPercent), font: { strike: true, color: { argb: 'FFB91C1C' } } },
          { text: ` ${formatPercent(metrics.profitOnGdvPercent)}` },
        ],
      };
      row.getCell('recommendation').note = 'Residual land value was below zero. Final report caps land at £0 and recalculates profit and profit/GDV.';
    }
    styleNegativeNumbers(row);
  });

  ['gdv', 'nonLandCost', 'financeCost', 'landValue', 'totalCost', 'profit', 'sellerLandValue', 'sellerProfit', 'residualOrSurplus'].forEach((key) => {
    sheet.getColumn(key).numFmt = '"£"#,##0.00';
  });
  sheet.getColumn('profitOnGdvPercent').numFmt = '0.0%';
  sheet.getColumn('sellerProfitOnGdvPercent').numFmt = '0.0%';
}

function addHouseBuildingSheets(workbook: ExcelJS.Workbook, appraisal: DevelopmentAppraisal) {
  if (appraisal.kind !== 'HOUSE_BUILDING') return;

  const houseTypes = workbook.addWorksheet('House Types');
  houseTypes.columns = [
    { header: 'Option', key: 'option', width: 26 },
    { header: 'House type', key: 'houseType', width: 26 },
    { header: 'Construction qty', key: 'quantity', width: 16 },
    { header: 'Construction unit', key: 'constructionQuantityLabel', width: 18 },
    { header: 'Sales qty', key: 'salesQuantity', width: 12 },
    { header: 'Sales unit', key: 'salesQuantityLabel', width: 16 },
    { header: 'GIFA m2', key: 'gifaM2', width: 12 },
    { header: 'Build cost/m2', key: 'buildCostPerM2', width: 16 },
    { header: 'Construction total', key: 'constructionTotal', width: 20 },
    { header: 'Sale/unit', key: 'saleValuePerUnit', width: 16 },
    { header: 'Sale rate/m2', key: 'saleRatePerM2', width: 16 },
    { header: 'GDV', key: 'gdv', width: 18 },
    { header: 'Notes', key: 'notes', width: 36 },
  ];
  styleHeader(houseTypes.getRow(1));
  appraisal.options.forEach((option) => {
    (option.houseTypeSchedule || []).forEach((row) => {
      houseTypes.addRow({
        option: option.name,
        houseType: row.houseTypeName,
        quantity: row.quantity,
        constructionQuantityLabel: row.constructionQuantityLabel || '',
        salesQuantity: calculateHouseTypeSalesQuantity(row),
        salesQuantityLabel: row.salesQuantityLabel || '',
        gifaM2: row.gifaM2,
        buildCostPerM2: row.buildCostPerM2,
        constructionTotal: calculateHouseTypeConstructionTotal(row),
        saleValuePerUnit: row.saleValuePerUnit || 0,
        saleRatePerM2: row.saleRatePerM2 || 0,
        gdv: calculateHouseTypeGdv(row),
        notes: [row.notes, row.quantitySeparationNotes].filter(Boolean).join('\n\n'),
      });
    });
  });
  ['buildCostPerM2', 'constructionTotal', 'saleValuePerUnit', 'saleRatePerM2', 'gdv'].forEach((key) => {
    houseTypes.getColumn(key).numFmt = '"£"#,##0.00';
  });

  const siteMetrics = workbook.addWorksheet('Site Metrics');
  siteMetrics.columns = [
    { header: 'Option', key: 'option', width: 26 },
    { header: 'Cost driver', key: 'costDriver', width: 28 },
    { header: 'Label', key: 'label', width: 28 },
    { header: 'Cost section', key: 'costSection', width: 28 },
    { header: 'Unit', key: 'unit', width: 10 },
    { header: 'Quantity', key: 'quantity', width: 14 },
    { header: 'Rate', key: 'rate', width: 14 },
    { header: 'Base cost', key: 'baseCost', width: 18 },
    { header: 'Manual adjustment (£)', key: 'manualAdjustment', width: 22 },
    { header: 'Total', key: 'total', width: 18 },
    { header: 'Notes', key: 'notes', width: 36 },
  ];
  styleHeader(siteMetrics.getRow(1));
  appraisal.options.forEach((option) => {
    (option.siteDimensions || []).forEach((row) => {
      const powerLine = temporaryPowerLinePresentation(row, option) ?? siteAccommodationLinePresentation(row, option) ?? fuelLinePresentation(row, option) ?? siloGeneratorLinePresentation(row, option) ?? safetyPlantLinePresentation(row, option) ?? miniSkipsLinePresentation(row, option) ?? skipWasteLinePresentation(row, option) ?? plotHeatingLinePresentation(row, option) ?? herasFencingLinePresentation(row, option) ?? salesPrelimsLinePresentation(row, option);
      siteMetrics.addRow({
        option: option.name,
        costDriver: row.costDriver ? APPRAISAL_INFRASTRUCTURE_COST_DRIVER_LABELS[row.costDriver] : 'Manual quantity',
        label: powerLine?.label ?? row.label,
        unit: powerLine?.unit ?? row.unit,
        quantity: powerLine?.quantity ?? resolveSiteDimensionQuantity(row, option),
        rate: powerLine?.rate ?? (row.libraryRateId?.startsWith(PRELIMS_SURVEY_RATE_PREFIX) ? calculateSiteDimensionBaseTotal(row, option) : row.rate),
        baseCost: calculateSiteDimensionBaseTotal(row, option),
        manualAdjustment: calculateSiteDimensionManualAdjustment(row, option),
        total: calculateSiteDimensionTotal(row, option),
        notes: powerLine?.notes ?? (row.costDriver === 'RCC_FEES_FORMULA' ? rccFeeReview(option).detail : row.notes || ''),
      });
    });
  });
  ['rate', 'baseCost', 'manualAdjustment', 'total'].forEach((key) => {
    siteMetrics.getColumn(key).numFmt = '"£"#,##0.00';
  });

  const surveySheet = workbook.addWorksheet('Surveys & Reports');
  surveySheet.columns = [
    { header: 'Option', key: 'option', width: 25 },
    { header: 'Applied to Prelims', key: 'applied', width: 19 },
    { header: 'Site area m²', key: 'siteArea', width: 15 },
    { header: 'Category', key: 'category', width: 24 },
    { header: 'Survey or report', key: 'label', width: 38 },
    { header: 'Included', key: 'included', width: 12 },
    { header: 'Fixed fee', key: 'baseFee', width: 16 },
    { header: 'Rate £/m²', key: 'ratePerM2', width: 15 },
    { header: 'Area budget', key: 'budget', width: 17 },
    { header: 'Quoted amount', key: 'manualFee', width: 20 },
    { header: 'Pricing basis', key: 'amountBasis', width: 16 },
    { header: 'Quote file', key: 'quoteFile', width: 34 },
    { header: 'Quote uploaded', key: 'quoteDate', width: 21 },
    { header: 'Selected cost', key: 'amount', width: 18 },
    { header: 'Scope / source / note', key: 'notes', width: 72 },
  ];
  styleHeader(surveySheet.getRow(1));
  appraisal.options.forEach(option => {
    const review = surveyReportsReview(option);
    review.rows.forEach(row => surveySheet.addRow({ option: option.name, applied: option.surveyReports?.confirmedAt ? 'Yes' : 'Draft only', siteArea: review.siteAreaM2,
      category: row.category, label: row.label, included: row.included ? 'Yes' : 'No', baseFee: row.baseFee, ratePerM2: row.ratePerM2,
      budget: row.budget, manualFee: row.quote ? row.manualFee ?? '' : '', amountBasis: row.amountBasis === 'QUOTE' ? 'Quote' : 'Budget',
      quoteFile: row.quote?.fileName || '', quoteDate: row.quote?.uploadedAt || '', amount: row.amount,
      notes: [row.scope, row.sourceUrl, row.note].filter(Boolean).join(' | ') }));
  });
  ['baseFee', 'ratePerM2', 'budget', 'manualFee', 'amount'].forEach(key => { surveySheet.getColumn(key).numFmt = '"£"#,##0.00'; });
}

function addGeneratedFinalReportSheets(workbook: ExcelJS.Workbook, appraisal: DevelopmentAppraisal) {
  const activeOption = compareAppraisalOptions(appraisal).find((entry) => entry.isRecommended)?.option || appraisal.options[0];
  if (!activeOption) return;
  const report = buildFinalReportData(activeOption);
  const recommendation = finalReportRecommendation(activeOption);
  const recommendationText = summaryRecommendationText(activeOption.finalReportExecutiveSummary || '', recommendation.basis);

  const finalSummary = workbook.addWorksheet('Generated Final Report');
  finalSummary.columns = [
    { header: 'Section', key: 'section', width: 28 },
    { header: 'Item', key: 'item', width: 34 },
    { header: 'Value', key: 'value', width: 18 },
    { header: 'Notes', key: 'notes', width: 60 },
  ];
  styleHeader(finalSummary.getRow(1));
  finalSummary.addRow({
    section: 'Executive summary',
    item: 'AI / report summary',
    value: '',
    notes: activeOption.finalReportExecutiveSummary || 'No executive summary generated.',
  });
  finalSummary.addRow({
    section: 'Summary and recommendation',
    item: recommendation.label,
    value: report.currentScenario.profitOnGdvPercent / 100,
    notes: recommendationText,
  });
  report.gdvRows.forEach((row) => {
    finalSummary.addRow({ section: 'GDV/GSV breakdown', item: row.title, value: row.gdv, notes: `${row.units} units` });
  });
  report.costSummaryRows.forEach((row) => {
    finalSummary.addRow({ section: 'Cost breakdown', item: row.title, value: row.amount, notes: row.notes || '' });
  });
  report.baseSummaryRows.forEach((row) => {
    finalSummary.addRow({
      section: 'Base appraisal before adjustments',
      item: row.label,
      value: row.isPercent ? row.value / 100 : row.value,
      notes: row.isPercent ? 'Profit as percentage of GDV/GSV' : '',
    });
  });
  report.profitMarginRows.forEach((row) => {
    finalSummary.addRow({
      section: 'RICS House Builders Profit Margins',
      item: `${row.label} (${row.operatingAndProfitPercent.toFixed(1)}% O&P)`,
      value: row.landValue,
      notes: `Overheads ${formatPercent(row.overheadPercent)} | Profit ${formatMoney(row.profit)} | Profit/GDV ${formatPercent(row.profitOnGdvPercent)} | ${row.justification}`,
    });
  });
  [report.zeroLandScenario, report.sellerScenario].filter(Boolean).forEach((scenario) => {
    scenario?.rows.forEach((row) => {
      finalSummary.addRow({ section: scenario.title, item: row.label, value: row.value, notes: row.note || '' });
    });
  });
  finalSummary.addRow({ section: 'Sales basis', item: 'Narrative', value: '', notes: report.salesBasisNarrative });
  finalSummary.addRow({ section: 'GDV improvement considerations', item: 'Narrative', value: '', notes: report.gdvImprovementNarrative });
  finalSummary.getColumn('value').numFmt = '"£"#,##0.00';
  finalSummary.eachRow((row, rowNumber) => {
    if (rowNumber > 1 && row.getCell('section').value === 'Base appraisal before adjustments' && row.getCell('item').value === 'Profit %') {
      row.getCell('value').numFmt = '0.0%';
    }
    if (rowNumber > 1 && row.getCell('section').value === 'Summary and recommendation') {
      row.getCell('value').numFmt = '0.0%';
      row.font = { ...(row.font || {}), bold: true, color: { argb: recommendation.tone === 'good' ? 'FF166534' : recommendation.tone === 'watch' ? 'FF92400E' : 'FFB91C1C' } };
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: recommendation.tone === 'good' ? 'FFDCFCE7' : recommendation.tone === 'watch' ? 'FFFEF3C7' : 'FFFEE2E2' } };
    }
    styleNegativeNumbers(row);
  });

  const sales = workbook.addWorksheet('Report House Sales');
  sales.columns = [
    { header: 'House type', key: 'houseType', width: 28 },
    { header: 'Quantity', key: 'quantity', width: 12 },
    { header: 'GIFA ft2', key: 'gifaFt2', width: 14 },
    { header: 'Base sale price', key: 'saleValuePerUnit', width: 20 },
    { header: 'Index uplift/unit', key: 'indexUpliftPerUnit', width: 18 },
    { header: 'Indexed sale price', key: 'indexedSaleValuePerUnit', width: 20 },
    { header: 'Indexed £/ft2', key: 'indexedSaleRateFt2', width: 18 },
    { header: 'Base GDV', key: 'gdv', width: 18 },
    { header: 'Indexed GDV', key: 'indexedGdv', width: 18 },
  ];
  styleHeader(sales.getRow(1));
  report.houseTypeRows.forEach((row) => sales.addRow({
    houseType: row.houseTypeName,
    quantity: row.quantity,
    gifaFt2: row.gifaFt2,
    saleValuePerUnit: row.saleValuePerUnit,
    indexUpliftPerUnit: row.indexUpliftPerUnit,
    indexedSaleValuePerUnit: row.indexedSaleValuePerUnit,
    indexedSaleRateFt2: row.indexedSaleRateFt2,
    gdv: row.gdv,
    indexedGdv: row.indexedGdv,
  }));
  sales.addRow({ houseType: 'Site average', indexedSaleRateFt2: report.averageSaleRateFt2, gdv: report.baseSalesGdv, indexedGdv: report.indexedSalesGdv });
  ['saleValuePerUnit', 'indexUpliftPerUnit', 'indexedSaleValuePerUnit', 'indexedSaleRateFt2', 'gdv', 'indexedGdv'].forEach((key) => {
    sales.getColumn(key).numFmt = '"£"#,##0.00';
  });
  sales.eachRow((row) => styleNegativeNumbers(row));

  const sensitivity = workbook.addWorksheet('Sales Sensitivity');
  sensitivity.columns = [
    { header: 'Movement £/ft2', key: 'deltaRateFt2', width: 18 },
    { header: 'Average £/ft2', key: 'averageRateFt2', width: 18 },
    { header: 'GDV', key: 'gdv', width: 18 },
    { header: 'Land value', key: 'landValue', width: 18 },
    { header: 'Profit', key: 'profit', width: 18 },
    { header: 'Profit/GDV', key: 'profitOnGdvPercent', width: 14 },
  ];
  styleHeader(sensitivity.getRow(1));
  report.sensitivityRows.forEach((row) => sensitivity.addRow({
    ...row,
    profitOnGdvPercent: row.profitOnGdvPercent / 100,
  }));
  ['averageRateFt2', 'gdv', 'landValue', 'profit'].forEach((key) => {
    sensitivity.getColumn(key).numFmt = '"£"#,##0.00';
  });
  sensitivity.getColumn('profitOnGdvPercent').numFmt = '0.0%';
  sensitivity.eachRow((row) => styleNegativeNumbers(row));

  const profitMargins = workbook.addWorksheet('RICS Profit Margins');
  profitMargins.columns = [
    { header: 'Risk case', key: 'label', width: 24 },
    { header: 'O&P', key: 'operatingAndProfitPercent', width: 14 },
    { header: 'Overheads', key: 'overheadPercent', width: 14 },
    { header: 'Profit', key: 'profit', width: 18 },
    { header: 'Profit/GDV', key: 'profitOnGdvPercent', width: 16 },
    { header: 'Residual land value', key: 'landValue', width: 22 },
    { header: 'Justification', key: 'justification', width: 90 },
  ];
  styleHeader(profitMargins.getRow(1));
  report.profitMarginRows.forEach((row) => profitMargins.addRow({
    ...row,
    operatingAndProfitPercent: row.operatingAndProfitPercent / 100,
    overheadPercent: row.overheadPercent / 100,
    profitOnGdvPercent: row.profitOnGdvPercent / 100,
  }));
  ['profit', 'landValue'].forEach((key) => { profitMargins.getColumn(key).numFmt = '"Â£"#,##0.00'; });
  ['operatingAndProfitPercent', 'overheadPercent', 'profitOnGdvPercent'].forEach((key) => { profitMargins.getColumn(key).numFmt = '0.0%'; });
  profitMargins.eachRow((row) => styleNegativeNumbers(row));

  addSiteCostRegisterSheets(workbook, report);
}

function addSiteCostRegisterSheets(workbook: ExcelJS.Workbook, report: ReturnType<typeof buildFinalReportData>) {
  if (report.engineeringScope) {
    const fees=workbook.addWorksheet('Engineers Scope');
    fees.columns=[{header:'Reference',key:'reference',width:16},{header:'Scope',key:'title',width:38},{header:'Status',key:'status',width:20},{header:'Destination',key:'destination',width:22},{header:'Pricing mechanism',key:'mechanism',width:65},{header:'Appraisal contribution',key:'amount',width:22},{header:'Scope allowance before register status',key:'scopeAllowance',width:24},{header:'Decision notes',key:'note',width:40},{header:'Full scope',key:'scope',width:80},{header:'Source range',key:'source',width:30}];
    styleHeader(fees.getRow(1));report.engineeringScope.rows.forEach(row=>fees.addRow(row));fees.getColumn('amount').numFmt='"£"#,##0.00';fees.getColumn('scopeAllowance').numFmt='"£"#,##0.00';
    fees.addRow(['Normal fee in Prelims',report.engineeringScope.normal]);fees.addRow(['Source',report.engineeringScope.source]);fees.addRow(['Basis',report.engineeringScope.notes]);fees.addRow(['Confirmed',report.engineeringScope.confirmedAt]);
    fees.eachRow(row=>row.eachCell(cell=>{cell.alignment={wrapText:true,vertical:'top'};}));
  }
  const abnormals = workbook.addWorksheet('Report Site Elements');
  abnormals.columns = [
    { header: 'Element', key: 'title', width: 28 },
    { header: 'Allocation', key: 'allocation', width: 20 },
    { header: 'Assessment status', key: 'assessmentStatus', width: 24 },
    { header: 'Include in land offer', key: 'includeInLandOffer', width: 22 },
    { header: 'Offer qualification', key: 'offerQualification', width: 50 },
    { header: 'Responsible person', key: 'responsiblePerson', width: 22 },
    { header: 'Base overlap review', key: 'baseOverlapNote', width: 35 },
    { header: 'Retained estimate', key: 'retainedEstimate', width: 18 },
    { header: 'Clearance reason', key: 'clearanceReason', width: 35 },
    { header: 'Amount', key: 'amount', width: 18 },
    { header: 'Evidence narrative', key: 'evidenceNarrative', width: 80 },
    { header: 'Known costs', key: 'knownCostNotes', width: 45 },
    { header: 'Estimated costs', key: 'estimatedCostNotes', width: 45 },
    { header: 'Unknowns / information required', key: 'unknownCostNotes', width: 45 },
    { header: 'Formal quotations', key: 'quotationCount', width: 18 },
  ];
  styleHeader(abnormals.getRow(1));
  if (report.abnormalConstraintsNarrative) {
    abnormals.addRow({
      title: 'Constraints report summary',
      amount: '',
      evidenceNarrative: report.abnormalConstraintsNarrative,
      knownCostNotes: '',
      estimatedCostNotes: '',
      unknownCostNotes: '',
      quotationCount: '',
    });
  }
  report.abnormalRows.forEach((row) => abnormals.addRow(row));
  abnormals.getColumn('amount').numFmt = '"£"#,##0.00';
  abnormals.eachRow((row) => styleNegativeNumbers(row));
  const siteCosts = workbook.addWorksheet('Site costs and allowances');
  siteCosts.columns = [{ header: 'Cost heading', key: 'title', width: 30 }, { header: 'Base allowance', key: 'base', width: 20 }, { header: 'Additional elements', key: 'additions', width: 22 }, { header: 'Combined total', key: 'total', width: 22 }];
  styleHeader(siteCosts.getRow(1));
  report.siteCostSummaryRows.forEach(row => siteCosts.addRow(row));
  siteCosts.addRow({ title: 'Total', base: report.siteCostSummaryRows.reduce((sum, row) => sum + row.base, 0), additions: report.siteCostSummaryRows.reduce((sum, row) => sum + row.additions, 0), total: report.siteCostSummaryRows.reduce((sum, row) => sum + row.total, 0) });
  siteCosts.addRow([report.siteCostRegisterSummary]);
  ['base', 'additions', 'total'].forEach(key => { siteCosts.getColumn(key).numFmt = '"£"#,##0.00'; });
  const offer = workbook.addWorksheet('Land offer schedule');
  offer.columns = [{ header: 'Element', key: 'title', width: 30 }, { header: 'Amount already counted', key: 'amount', width: 24 }, { header: 'Allocation', key: 'allocation', width: 20 }, { header: 'Status', key: 'assessmentStatus', width: 24 }, { header: 'Qualification', key: 'offerQualification', width: 50 }, { header: 'Evidence', key: 'evidenceNarrative', width: 80 }];
  styleHeader(offer.getRow(1));
  report.landOfferRows.forEach(row => offer.addRow(row));
  offer.addRow({ title: 'Disclosed subset already counted', amount: report.landOfferDisclosureTotal });
  offer.getColumn('amount').numFmt = '"£"#,##0.00';
  const exclusions = workbook.addWorksheet('Land offer exclusions');
  exclusions.columns = [{ header: 'Type', key: 'kind', width: 22 }, { header: 'Not allowed for', key: 'title', width: 55 }, { header: 'Category', key: 'category', width: 28 }, { header: 'Land-offer qualification', key: 'qualification', width: 110 }];
  styleHeader(exclusions.getRow(1));
  if (!report.notAllowedAbnormalRows.length) exclusions.addRow({ title: 'No excluded surveys or unpriced Abnormals elements.' });
  report.notAllowedAbnormalRows.forEach(row => exclusions.addRow({ ...row, kind: row.kind === 'REPORT' ? 'Survey / report' : row.kind === 'WORK' ? 'Conditional work' : 'Unpriced abnormal' }));
  exclusions.eachRow(row => row.eachCell(cell => { cell.alignment = { wrapText: true, vertical: 'top' }; }));
  const history = workbook.addWorksheet('Site cost change history');
  history.addRow(['Element', 'Date', 'Action', 'Reason', 'Before', 'After']);
  styleHeader(history.getRow(1));
  report.abnormalRows.forEach(row => (row.changeHistory?.history || []).forEach(entry => history.addRow([row.title, entry.at, entry.action, entry.reason || '', entry.before, entry.after])));

}

export async function exportAppraisalHouseTypeScheduleToExcelBlob(appraisal: DevelopmentAppraisal) {
  const workbook = await createWorkbook();
  const activeOption = appraisal.options.find((option) => option.id === appraisal.selectedOptionId) || appraisal.options[0];
  const usedHouseTypeRows = (activeOption?.houseTypeSchedule || []).filter((row) => (
    Math.max(0, row.quantity || 0) > 0 || calculateHouseTypeSalesQuantity(row) > 0
  ));
  const exportOption = activeOption ? { ...activeOption, houseTypeSchedule: usedHouseTypeRows } : null;
  const summary = exportOption ? summariseHouseBuildingOption(exportOption) : null;

  const overview = workbook.addWorksheet('Summary');
  overview.columns = [
    { header: 'Item', key: 'item', width: 34 },
    { header: 'Value', key: 'value', width: 36 },
  ];
  styleHeader(overview.getRow(1));
  overview.addRow({ item: 'Appraisal', value: appraisal.name });
  overview.addRow({ item: 'Reference', value: appraisal.reference || '-' });
  overview.addRow({ item: 'Option', value: activeOption?.name || '-' });
  overview.addRow({ item: 'Appraisal date', value: appraisal.appraisalDate || '-' });
  overview.addRow({ item: 'Total sales units', value: summary?.totalUnits || 0 });
  overview.addRow({ item: 'Private sales units', value: summary?.privateUnits || 0 });
  overview.addRow({ item: 'Affordable sales units', value: summary?.affordableUnits || 0 });
  overview.addRow({ item: 'Private house construction cost (base)', value: summary?.basePrivateHouseConstructionCost || 0 });
  overview.addRow({ item: 'Affordable house construction cost (base)', value: summary?.baseAffordableHouseConstructionCost || 0 });
  overview.addRow({ item: 'Total construction cost (base)', value: summary?.baseHouseConstructionCost || 0 });
  overview.addRow({ item: 'Price-index contingency to site start', value: summary?.constructionContingency || 0 });
  overview.addRow({ item: 'GDV/GSV', value: summary?.gdv || 0 });
  overview.addRow({ item: 'Average sale value/unit', value: summary?.averageSaleValuePerUnit || 0 });
  overview.addRow({ item: 'Average sale value/m2', value: summary?.averageSaleValuePerM2 || 0 });
  [9, 10, 11, 12, 13, 14, 15].forEach((rowNumber) => {
    overview.getRow(rowNumber).getCell(2).numFmt = '"£"#,##0.00';
  });

  const schedule = workbook.addWorksheet('House Type Schedule');
  schedule.columns = [
    { header: 'Source', key: 'source', width: 14 },
    { header: 'House type', key: 'houseType', width: 28 },
    { header: 'Tenure', key: 'tenure', width: 14 },
    { header: 'Style', key: 'style', width: 16 },
    { header: 'Configuration', key: 'configuration', width: 18 },
    { header: 'Bedrooms', key: 'bedrooms', width: 12 },
    { header: 'Storeys', key: 'storeys', width: 12 },
    { header: 'Garage', key: 'garage', width: 12 },
    { header: 'Private drive', key: 'privateDrive', width: 14 },
    { header: 'Construction qty', key: 'constructionQuantity', width: 16 },
    { header: 'Construction unit', key: 'constructionQuantityLabel', width: 18 },
    { header: 'Sales qty', key: 'salesQuantity', width: 12 },
    { header: 'Sales unit', key: 'salesQuantityLabel', width: 14 },
    { header: 'GIFA m2', key: 'gifaM2', width: 12 },
    { header: 'Build cost/m2', key: 'buildCostPerM2', width: 16 },
    { header: 'Build months', key: 'buildPeriodMonths', width: 14 },
    { header: 'Construction total', key: 'constructionTotal', width: 20 },
    { header: 'Sale/unit', key: 'saleValuePerUnit', width: 16 },
    { header: 'Sale rate/m2', key: 'saleRatePerM2', width: 16 },
    { header: 'GDV/GSV', key: 'gdv', width: 18 },
    { header: 'Separation notes', key: 'quantitySeparationNotes', width: 48 },
    { header: 'Comments', key: 'notes', width: 48 },
  ];
  styleHeader(schedule.getRow(1));
  usedHouseTypeRows.forEach((row) => {
    schedule.addRow({
      source: row.libraryHouseTypeId ? 'Library' : 'Custom',
      houseType: row.houseTypeName,
      tenure: row.tenure === 'AFFORDABLE' ? 'Affordable' : 'Private',
      style: row.style || '',
      configuration: row.configuration || '',
      bedrooms: row.bedrooms || '',
      storeys: row.storeys || '',
      garage: row.garage === undefined ? '' : row.garage ? 'Yes' : 'No',
      privateDrive: row.privateDrive === undefined ? '' : row.privateDrive ? 'Yes' : 'No',
      constructionQuantity: row.quantity,
      constructionQuantityLabel: row.constructionQuantityLabel || '',
      salesQuantity: calculateHouseTypeSalesQuantity(row),
      salesQuantityLabel: row.salesQuantityLabel || '',
      gifaM2: row.gifaM2,
      buildCostPerM2: calculateHouseTypeScheduleBuildCostPerM2(row),
      buildPeriodMonths: row.buildPeriodMonths || 0,
      constructionTotal: calculateHouseTypeConstructionTotal(row),
      saleValuePerUnit: row.saleValuePerUnit || 0,
      saleRatePerM2: row.saleRatePerM2 || 0,
      gdv: calculateHouseTypeGdv(row),
      quantitySeparationNotes: row.quantitySeparationNotes || '',
      notes: row.notes || '',
    });
  });
  ['buildCostPerM2', 'constructionTotal', 'saleValuePerUnit', 'saleRatePerM2', 'gdv'].forEach((key) => {
    schedule.getColumn(key).numFmt = '"£"#,##0.00';
  });
  schedule.eachRow((row) => {
    row.alignment = { vertical: 'top', wrapText: true };
    styleNegativeNumbers(row);
  });
  schedule.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    blob: new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename: `${safeFilename(appraisal.name)}-house-type-schedule.xlsx`,
  };
}

export async function exportAppraisalDecisionPackToExcelBlob(appraisal: DevelopmentAppraisal, projects: Project[] = [], issue?: ReportIssueControl) {
  const workbook = await createWorkbook();
  const comparison = compareAppraisalOptions(appraisal);

  const summary = workbook.addWorksheet('Summary');
  summary.columns = [
    { header: 'Item', key: 'item', width: 32 },
    { header: 'Value', key: 'value', width: 36 },
  ];
  styleHeader(summary.getRow(1));
  summary.addRow({ item: 'Appraisal', value: appraisal.name });
  summary.addRow({ item: 'Reference', value: appraisal.reference || '-' });
  summary.addRow({ item: 'Client', value: appraisal.client || '-' });
  summary.addRow({ item: 'Site', value: appraisal.site || '-' });
  summary.addRow({ item: 'Linked project', value: linkedProjectName(appraisal, projects) });
  summary.addRow({ item: 'Status', value: appraisal.status });
  summary.addRow({ item: 'Options', value: appraisal.options.length });
  const activeFinalReportOption = comparison.find((entry) => entry.isRecommended)?.option || appraisal.options[0];
  const activeRecommendation = activeFinalReportOption ? finalReportRecommendation(activeFinalReportOption) : null;
  summary.addRow({ item: 'Recommended option', value: comparison.find((entry) => entry.isRecommended)?.option.name || '-' });
  summary.addRow({ item: 'Final report recommendation', value: activeRecommendation?.label || '-' });

  const inputs = workbook.addWorksheet('Inputs');
  inputs.columns = [
    { header: 'Option', key: 'option', width: 26 },
    { header: 'Input type', key: 'inputType', width: 16 },
    { header: 'Title', key: 'title', width: 32 },
    { header: 'Category', key: 'category', width: 22 },
    { header: 'Amount/value', key: 'value', width: 18 },
    { header: 'Timing', key: 'timing', width: 18 },
    { header: 'Notes', key: 'notes', width: 40 },
  ];
  styleHeader(inputs.getRow(1));
  appraisal.options.forEach((option) => {
    option.revenueLines.forEach((line) => {
      inputs.addRow({
        option: option.name,
        inputType: 'Revenue',
        title: line.title,
        category: APPRAISAL_TEMPLATE_LABELS[line.template],
        value: line.template === 'COMMERCIAL_INCOME'
          ? `${line.area || 0} area at ${line.rentRate || 0}, yield ${line.yieldPercent || 0}%`
          : `${line.units || 0} units at ${line.saleValuePerUnit || 0}`,
        timing: line.cashflow.type,
        notes: line.notes || '',
      });
    });
    option.costLines.forEach((line) => {
      inputs.addRow({
        option: option.name,
        inputType: 'Cost',
        title: line.title,
        category: line.category,
        value: line.percentageBasis && line.percentageBasis !== 'NONE'
          ? `${line.percentageValue || 0}% of ${line.percentageBasis}`
          : line.amount,
        timing: line.cashflow.type,
        notes: line.notes || line.sourceLabel || '',
      });
    });
  });

  addComparisonSheet(workbook, appraisal);
  addHouseBuildingSheets(workbook, appraisal);
  addGeneratedFinalReportSheets(workbook, appraisal);

  appraisal.options.forEach((option, index) => {
    const metrics = calculateFinalReportMetrics(option).metrics;
    const cashflow = buildMonthlyCashflow(option, metrics.landValue);
    const sheetName = `Cashflow ${index + 1}`.slice(0, 31);
    const sheet = workbook.addWorksheet(sheetName);
    sheet.columns = [
      { header: 'Month', key: 'month', width: 10 },
      { header: 'Inflows', key: 'inflow', width: 16 },
      { header: 'Outflows before finance', key: 'outflowBeforeFinance', width: 24 },
      { header: 'Finance', key: 'financeCost', width: 16 },
      { header: 'Net movement', key: 'netMovement', width: 18 },
      { header: 'Cumulative balance', key: 'cumulativeBalance', width: 20 },
    ];
    styleHeader(sheet.getRow(1));
    cashflow.rows.forEach((row) => sheet.addRow(row));
    ['inflow', 'outflowBeforeFinance', 'financeCost', 'netMovement', 'cumulativeBalance'].forEach((key) => {
      sheet.getColumn(key).numFmt = '"£"#,##0.00';
    });
  });

  const assumptions = workbook.addWorksheet('Assumptions');
  assumptions.columns = [
    { header: 'Option', key: 'option', width: 26 },
    { header: 'Duration', key: 'duration', width: 14 },
    { header: 'Target profit on GDV', key: 'target', width: 22 },
    { header: 'Finance rate', key: 'finance', width: 16 },
    { header: 'Known land value', key: 'knownLandValue', width: 18 },
    { header: 'Likely lowest seller land price', key: 'sellerMinimumLandValue', width: 28 },
    { header: 'House prices comments', key: 'housePricesComment', width: 52 },
    { header: 'Assumptions', key: 'assumptions', width: 52 },
    { header: 'Decision note', key: 'decisionNote', width: 52 },
    { header: 'Executive summary', key: 'finalReportExecutiveSummary', width: 72 },
  ];
  styleHeader(assumptions.getRow(1));
  appraisal.options.forEach((option) => {
    assumptions.addRow({
      option: option.name,
      duration: option.durationMonths,
      target: option.targetProfitOnGdvPercent / 100,
      finance: option.financeAnnualRatePercent / 100,
      knownLandValue: option.knownLandValue || 0,
      sellerMinimumLandValue: option.sellerMinimumLandValue || 0,
      housePricesComment: option.housePricesComment || '',
      assumptions: option.assumptions || '',
      decisionNote: option.decisionNote || '',
      finalReportExecutiveSummary: option.finalReportExecutiveSummary || '',
    });
  });
  assumptions.getColumn('target').numFmt = '0.0%';
  assumptions.getColumn('finance').numFmt = '0.0%';
  assumptions.getColumn('knownLandValue').numFmt = '"£"#,##0.00';
  assumptions.getColumn('sellerMinimumLandValue').numFmt = '"£"#,##0.00';

  await addApprovedIssueControlSheet(workbook, issue);
  await lockApprovedIssueWorkbook(workbook, issue);
  const buffer = await workbook.xlsx.writeBuffer();
  return {
    blob: new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename: `${safeFilename(appraisal.name)}-appraisal-decision-pack.xlsx`,
  };
}

export async function exportAppraisalRevenueCostSummaryToPdf(appraisal: DevelopmentAppraisal, projects: Project[] = []) {
  const { jsPDF, autoTable } = await loadPdfRuntime();
  const comparison = compareAppraisalOptions(appraisal);
  const option = comparison.find((entry) => entry.isRecommended)?.option
    || appraisal.options.find((entry) => entry.id === appraisal.selectedOptionId)
    || appraisal.options[0];
  if (!option) throw new Error('No appraisal option is available for summary export.');

  const report = buildFinalReportData(option);
  const finalReportMetrics = calculateFinalReportMetrics(option);
  const baseMetrics = finalReportMetrics.originalMetrics;
  const baseCost = baseMetrics.totalCost;
  const doc = new jsPDF({ format: 'a4', orientation: 'landscape', unit: 'mm' });
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - (margin * 2);
  const halfWidth = (contentWidth / 2) - 4;
  const lastTableY = () => (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? margin;
  const negativeHook = (data: any) => {
    if (data?.section !== 'body' || !data.cell) return;
    const raw = Array.isArray(data.cell.raw) ? data.cell.raw.join(' ') : String(data.cell.raw ?? '');
    if (raw.includes('-') && data.cell.styles) data.cell.styles.textColor = [185, 28, 28];
  };
  const scenarioMetrics = (landValue: number) => landValue === 0 && option.frozenZeroLandMetrics
    ? option.frozenZeroLandMetrics
    : calculateAppraisalOption({
      ...option,
      calculationMode: 'KNOWN_LAND_PROFIT_ON_GDV',
      knownLandValue: Math.max(0, landValue),
    });
  const compactScenarios: Array<{
    label: string;
    landValue: number;
    totalCost: number;
    profit: number;
    profitOnGdvPercent: number;
  }> = [];
  if (baseMetrics.landValue < 0) {
    compactScenarios.push({
      label: 'Land adjusted to zero',
      landValue: finalReportMetrics.metrics.landValue,
      totalCost: finalReportMetrics.metrics.totalCost,
      profit: finalReportMetrics.metrics.profit,
      profitOnGdvPercent: finalReportMetrics.metrics.profitOnGdvPercent,
    });
  } else if (baseMetrics.landValue > 0) {
    const zeroLand = scenarioMetrics(0);
    compactScenarios.push({
      label: 'Land at zero',
      landValue: zeroLand.landValue,
      totalCost: zeroLand.totalCost,
      profit: zeroLand.profit,
      profitOnGdvPercent: zeroLand.profitOnGdvPercent,
    });
  }
  const sellerMetrics = calculateSellerLandPriceMetrics(option);
  if (sellerMetrics && (baseMetrics.landValue <= 0 || sellerMetrics.landValue <= baseMetrics.landValue)) {
    compactScenarios.push({
      label: 'Landowner expected receipt',
      landValue: sellerMetrics.landValue,
      totalCost: sellerMetrics.totalCost,
      profit: sellerMetrics.profit,
      profitOnGdvPercent: sellerMetrics.profitOnGdvPercent,
    });
  }

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Revenue And Cost Summary', margin, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`${appraisal.name} | ${option.name} | ${linkedProjectName(appraisal, projects)}`, margin, 21);

  let y = 38;
  autoTable(doc, {
    startY: y,
    head: [['Revenue', 'Units', 'Value']],
    body: [
      ...(report.gdvRows.length > 0
        ? report.gdvRows.map((row) => [row.title, row.units.toLocaleString(), formatCompactMoney(row.gdv)])
        : [['GDV/GSV', '', formatCompactMoney(report.indexedSalesGdv)]]),
      ['Indexed revenue', report.houseTypeRows.reduce((total, row) => total + row.quantity, 0).toLocaleString(), formatCompactMoney(report.indexedSalesGdv)],
    ],
    margin: { left: margin },
    tableWidth: halfWidth,
    styles: { fontSize: 8, cellPadding: 2.2 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      1: { halign: 'right', cellWidth: 22 },
      2: { halign: 'right', cellWidth: 36 },
    },
    didParseCell: negativeHook,
  });
  const revenueEndY = lastTableY();

  autoTable(doc, {
    startY: y,
    head: [['Cost', 'Value']],
    body: [
      ...report.costSummaryRows.map((row) => [row.title, formatCompactMoney(row.amount)]),
    ],
    margin: { left: margin + halfWidth + 8 },
    tableWidth: halfWidth,
    styles: { fontSize: 8, cellPadding: 2.2 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      1: { halign: 'right', cellWidth: 40 },
    },
    didParseCell: pdfCostSummaryCellHook,
    didDrawCell: pdfCostSummaryRuleHook,
  });
  y = Math.max(revenueEndY, lastTableY()) + 9;

  autoTable(doc, {
    startY: y,
    head: [['Indexed revenue', 'Total cost', 'Residual land value', 'Profit', 'Margin']],
    body: [[
      formatCompactMoney(report.indexedSalesGdv),
      formatCompactMoney(baseCost),
      formatCompactMoney(baseMetrics.landValue),
      formatCompactMoney(baseMetrics.profit),
      formatPercent(baseMetrics.profitOnGdvPercent),
    ]],
    margin: { left: margin, right: margin },
    styles: { fontSize: 10, cellPadding: 3, halign: 'right', fontStyle: 'bold' },
    headStyles: { fillColor: [8, 145, 178], textColor: [255, 255, 255], halign: 'right' },
    bodyStyles: { fillColor: [236, 253, 245], textColor: [15, 23, 42] },
    didParseCell: negativeHook,
  });
  y = lastTableY() + 9;

  if (compactScenarios.length > 0) {
    if (y > pageHeight - 38) {
      doc.addPage();
      y = margin;
    }
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Land scenario summary', margin, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Scenario', 'Land price', 'Total cost', 'Profit', 'Margin']],
      body: compactScenarios.map((row) => [
        row.label,
        formatCompactMoney(row.landValue),
        formatCompactMoney(row.totalCost),
        formatCompactMoney(row.profit),
        formatPercent(row.profitOnGdvPercent),
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2.2 },
      headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
      didParseCell: negativeHook,
    });
  }

  doc.addPage();
  doc.setFontSize(14);
  doc.text('Base allowances and additional site costs', margin, 20);
  autoTable(doc, { startY: 28, head: [['Cost heading', 'Base allowance', 'Additional elements', 'Combined total']], body: report.siteCostSummaryRows.map(row => [row.title, formatMoney(row.base), formatMoney(row.additions), formatMoney(row.total)]), margin: { left: margin, right: margin }, styles: { fontSize: 9 } });
  autoTable(doc, { startY: lastTableY() + 8, head: [['Assessment position']], body: [[report.siteCostRegisterSummary]], margin: { left: margin, right: margin }, styles: { fontSize: 9 } });
  autoTable(doc, { startY: lastTableY() + 8, head: [['Element', 'Allocation', 'Status', 'Amount already counted', 'Land-offer qualification / evidence']], body: report.landOfferRows.length ? report.landOfferRows.map(row => [row.title, row.allocation || '', row.assessmentStatus || '', formatMoney(row.amount), [row.offerQualification, row.evidenceNarrative].filter(Boolean).join(' | ')]) : [['No elements flagged for land-offer disclosure', '', '', '', '']], margin: { left: margin, right: margin }, styles: { fontSize: 8 } });
  if (report.notAllowedAbnormalRows.length) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Abnormal items not allowed for in the land offer', margin, 20);
    autoTable(doc, { startY: 28, head: [['Type', 'Not allowed for', 'Land-offer qualification']], body: report.notAllowedAbnormalRows.map(row => [row.kind === 'REPORT' ? 'Report' : row.kind === 'WORK' ? 'Conditional work' : 'Abnormal', row.title, row.qualification]), margin: { left: margin, right: margin }, styles: { fontSize: 8 }, rowPageBreak: 'avoid' });
  }
  if (report.engineeringScope) {
    doc.addPage();doc.setFontSize(14);doc.text('Engineer’s scope and pricing',margin,20);
    autoTable(doc,{startY:28,head:[['Source and basis']],body:[[`${report.engineeringScope.source}. ${report.engineeringScope.notes}. Normal fee before Prelims adjustment: ${formatMoney(report.engineeringScope.normal)}.`]],margin:{left:margin,right:margin},styles:{fontSize:8}});
    autoTable(doc,{startY:lastTableY()+5,head:[['Ref','Scope / decision','Destination','Pricing mechanism','Appraisal cost']],body:report.engineeringScope.rows.map(row=>[row.reference,`${row.title}\n${row.status}\n${row.scope}\n${row.note}\n${row.source}`,row.destination,`${row.mechanism}\nScope allowance ${formatMoney(row.scopeAllowance)}`,formatMoney(row.amount)]),margin:{left:margin,right:margin},styles:{fontSize:7,cellPadding:2},rowPageBreak:'avoid',headStyles:{fillColor:[4,120,87]}});
  }
  return {
    blob: doc.output('blob'),
    filename: `${safeFilename(appraisal.name)}-revenue-cost-summary.pdf`,
  };
}

function appraisalRateBasis(rate: AppraisalRateLibraryItem) {
  const match = (rate.notes || '').match(/\.\s*([^.]*)\.\s*Base formula:/i);
  return match?.[1]?.trim() || '';
}

function addAwdRateLibraryWorksheet(
  workbook: ExcelJS.Workbook,
  title: string,
  rates: AppraisalRateLibraryItem[],
) {
  const sheet = workbook.addWorksheet(title);
  sheet.columns = [
    { header: 'Item', key: 'item', width: 34 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Rate basis', key: 'basis', width: 30 },
    { header: 'Cost driver', key: 'driver', width: 28 },
    { header: 'Unit', key: 'unit', width: 10 },
    { header: 'Library rate', key: 'rate', width: 15 },
    { header: 'Price index', key: 'priceIndex', width: 12 },
    { header: 'Source formula', key: 'formula', width: 60 },
  ];
  styleHeader(sheet.getRow(1));
  rates.forEach((rate) => {
    sheet.addRow({
      item: rate.label,
      category: rate.category.replace(/_/g, ' '),
      basis: appraisalRateBasis(rate),
      driver: rate.costDriver ? APPRAISAL_INFRASTRUCTURE_COST_DRIVER_LABELS[rate.costDriver] : '',
      unit: rate.unit,
      rate: rate.rate,
      priceIndex: rate.priceIndex || 0,
      formula: rate.sourceFormula || '',
    });
  });
  sheet.getColumn('rate').numFmt = '"£"#,##0.00;("£"#,##0.00);-';
  sheet.getColumn('priceIndex').numFmt = '#,##0';
  sheet.eachRow((row, rowNumber) => {
    row.alignment = { vertical: 'top', wrapText: true };
    if (rowNumber > 1) row.getCell('item').font = { bold: true };
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  return sheet;
}

export async function exportAwdRateLibraryReportToExcelBlob(rates: AppraisalRateLibraryItem[]) {
  const workbook = await createWorkbook();
  const infrastructure = rates.filter(isAwdInfrastructureRate);
  const plotWorks = rates.filter(isAwdPlotWorksRate);
  const summary = workbook.addWorksheet('Summary');
  summary.columns = [
    { header: 'Item', key: 'item', width: 30 },
    { header: 'Value', key: 'value', width: 62 },
  ];
  styleHeader(summary.getRow(1));
  summary.addRows([
    { item: 'Report', value: 'AWD Plot Works and Infrastructure Rate Library' },
    { item: 'Scope', value: 'Reusable base rates only. Project quantities, extended allowances and project-specific adjustments are excluded.' },
    { item: 'Infrastructure items', value: infrastructure.length },
    { item: 'Plot Works items', value: plotWorks.length },
    { item: 'Base price index', value: infrastructure[0]?.priceIndex || plotWorks[0]?.priceIndex || 0 },
  ]);
  summary.eachRow((row) => {
    row.alignment = { vertical: 'top', wrapText: true };
  });
  summary.getRow(3).height = 36;
  summary.getColumn('value').alignment = { wrapText: true, vertical: 'top' };
  addAwdRateLibraryWorksheet(workbook, 'Infrastructure', infrastructure);
  addAwdRateLibraryWorksheet(workbook, 'Plot Works', plotWorks);
  const buffer = await workbook.xlsx.writeBuffer();
  return {
    blob: new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename: 'AWD-plotworks-infrastructure-rate-library.xlsx',
  };
}

export async function downloadAwdRateLibraryReportExcel(rates: AppraisalRateLibraryItem[]) {
  const startedAt = performance.now();
  const result = await exportAwdRateLibraryReportToExcelBlob(rates);
  const saved = await downloadBlob(result.blob, result.filename, [{ name: 'Excel Workbook', extensions: ['xlsx'] }]);
  if (saved) {
    recordOperationLogEntry({
      kind: 'export',
      status: 'success',
      subject: 'AWD plot works and infrastructure rate library Excel',
      message: 'Exported the AWD Plot Works and Infrastructure Rate Library workbook.',
      path: result.filename,
      counts: { files: 1 },
      durationMs: Math.round(performance.now() - startedAt),
    });
  }
  return saved;
}

/**
 * A deliberately concise, externally shareable viability summary. The selected
 * land value is used only to calculate this export; it never updates the saved
 * appraisal option or its underlying residual-land calculation.
 */
export async function exportAppraisalLandownerViabilityToPdf(
  appraisal: DevelopmentAppraisal,
  projects: Project[] = [],
  reportLandValue = 0,
) {
  const { jsPDF, autoTable } = await loadPdfRuntime();
  const comparison = compareAppraisalOptions(appraisal);
  const option = comparison.find((entry) => entry.isRecommended)?.option
    || appraisal.options.find((entry) => entry.id === appraisal.selectedOptionId)
    || appraisal.options[0];
  if (!option) throw new Error('No appraisal option is available for landowner viability export.');

  const landValue = Number.isFinite(reportLandValue) ? Math.max(0, reportLandValue) : 0;
  const metrics = calculateAppraisalOption({
    ...option,
    calculationMode: 'KNOWN_LAND_PROFIT_ON_GDV',
    knownLandValue: landValue,
  });
  const abnormalRows = calculateCostLines(option, metrics.gdv)
    .filter(({ line }) => isSiteCostElement(line))
    .map(({ line, amount }) => ({ title: line.title || 'Abnormal allowance', amount }));
  const totalAbnormals = abnormalRows.reduce((total, row) => total + row.amount, 0);
  const costBeforeAbnormals = Math.max(0, metrics.nonLandCost - totalAbnormals);
  const homeCount = (option.houseTypeSchedule || []).reduce((total, row) => total + calculateHouseTypeSalesQuantity(row), 0);

  const doc = new jsPDF({ format: 'a4', orientation: 'portrait', unit: 'mm' });
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - (margin * 2);
  const cardGap = 4;
  const cardWidth = (contentWidth - (cardGap * 2)) / 3;
  const drawMetric = (x: number, y: number, label: string, value: string, note: string, accent: [number, number, number]) => {
    doc.setFillColor(238, 244, 247);
    doc.roundedRect(x, y, cardWidth, 21, 2, 2, 'F');
    doc.setFillColor(...accent);
    doc.roundedRect(x, y, 2.2, 21, 1, 1, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    doc.text(label.toUpperCase(), x + 5, y + 5.4);
    doc.setTextColor(15, 35, 55);
    doc.setFontSize(13.5);
    doc.text(value, x + 5, y + 12.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.7);
    doc.text(note, x + 5, y + 17.7);
  };

  doc.setFillColor(19, 38, 58);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setFillColor(199, 107, 42);
  doc.rect(pageWidth - 56, 0, 56, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('HZL  |  DEVELOPMENT VIABILITY REPORT', margin, 10);
  doc.setFontSize(17);
  doc.text(appraisal.name || 'Development appraisal', margin, 20.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.text(`${homeCount.toLocaleString()} home indicative residential scheme`, margin, 26.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('REPORT LAND COST BASIS', pageWidth - 28, 10, { align: 'center' });
  doc.setFontSize(14);
  doc.text(formatCompactMoney(landValue), pageWidth - 28, 19, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.text('All report figures use this land cost', pageWidth - 28, 25.5, { align: 'center' });

  doc.setTextColor(30, 72, 96);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('SITE OVERVIEW', margin, 42);
  doc.setTextColor(38, 55, 70);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  const overview = `The current feasibility appraisal provides for a ${homeCount.toLocaleString()}-home residential development${appraisal.site ? ` at ${appraisal.site}` : ''}. The figures below are a high-level summary for discussion and exclude detailed rate, sales and construction-cost information.`;
  const overviewLines = doc.splitTextToSize(overview, contentWidth);
  doc.text(overviewLines, margin, 47);

  let y = 57 + Math.max(0, (overviewLines.length - 1) * 4);
  drawMetric(margin, y, 'Total sales value', formatCompactMoney(metrics.gdv), 'Indexed appraisal sales value', [43, 140, 137]);
  drawMetric(margin + cardWidth + cardGap, y, 'Cost before additions', formatCompactMoney(costBeforeAbnormals), 'Non-land cost before additional elements', [31, 93, 122]);
  drawMetric(margin + 2 * (cardWidth + cardGap), y, 'Cost after additions', formatCompactMoney(metrics.nonLandCost), 'Non-land cost including additional elements', [199, 107, 42]);
  y += 25;
  drawMetric(margin, y, 'Additional site elements', formatCompactMoney(totalAbnormals), 'Headline risk provision', [199, 107, 42]);
  drawMetric(margin + cardWidth + cardGap, y, 'Profit after additions', formatCompactMoney(metrics.profit), `At ${formatCompactMoney(landValue)} land cost`, [43, 140, 137]);
  drawMetric(margin + 2 * (cardWidth + cardGap), y, 'Profit on sales value', formatPercent(metrics.profitOnGdvPercent), `At ${formatCompactMoney(landValue)} land cost`, [199, 107, 42]);
  y += 29;

  doc.setTextColor(30, 72, 96);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('ADDITIONAL SITE-COST ALLOWANCES', margin, y);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.text('Individual headline allowances from the current appraisal', pageWidth - margin, y, { align: 'right' });
  y += 3;
  autoTable(doc, {
    startY: y,
    head: [['Additional site element', 'Allowance']],
    body: abnormalRows.map((row) => [row.title, formatCompactMoney(row.amount)]),
    margin: { left: margin, right: margin },
    styles: { fontSize: 7, cellPadding: 1.55 },
    headStyles: { fillColor: [31, 93, 122], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 248, 250] },
    columnStyles: { 1: { halign: 'right', cellWidth: 34, fontStyle: 'bold' } },
  });
  const endY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  const conclusionY = Math.min(endY + 8, pageHeight - 42);
  doc.setFillColor(255, 242, 233);
  doc.roundedRect(margin, conclusionY, contentWidth, 21, 2, 2, 'F');
  doc.setTextColor(199, 107, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Viability conclusion', margin + 4, conclusionY + 6);
  doc.setTextColor(38, 55, 70);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const affordableLandValue = calculateAppraisalOption({ ...option, calculationMode: 'RESIDUAL_LAND_VALUE' }).landValue;
  const conclusion = affordableLandValue <= 0
    ? 'The present appraisal does not support a positive land payment at the stated target profit and assumptions.'
    : `The present appraisal supports an indicative land value of ${formatCompactMoney(affordableLandValue)} at the stated target profit and assumptions. Additional site costs are already included.`;
  doc.text(doc.splitTextToSize(conclusion, contentWidth - 8), margin + 4, conclusionY + 12);

  doc.setDrawColor(215, 224, 229);
  doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(5.4);
  const footer = 'This is a high-level development appraisal summary prepared for discussion purposes only. It is not a valuation, formal offer or commitment to acquire. All figures remain subject to technical, planning, legal and commercial verification.';
  doc.text(doc.splitTextToSize(footer, contentWidth), margin, pageHeight - 9.5);

  const offerReport = buildFinalReportData(option);
  if (offerReport.landOfferRows.length > 0 || offerReport.notAllowedAbnormalRows.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Land-offer qualifications', margin, 20);
    if (offerReport.landOfferRows.length) {
      autoTable(doc, { startY: 28, head: [['Already-counted disclosure']], body: [[`Disclosed subset: ${formatMoney(offerReport.landOfferDisclosureTotal)}. This schedule creates no additional deduction.`]], margin: { left: margin, right: margin }, styles: { fontSize: 9 } });
      autoTable(doc, { startY: ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 28) + 8, head: [['Element / allocation / status', 'Amount', 'Qualification and evidence']], body: offerReport.landOfferRows.map(row => [`${row.title} / ${row.allocation} / ${row.assessmentStatus}`, row.assessmentStatus === 'To be assessed' && row.amount === 0 ? 'Unpriced' : formatMoney(row.amount), [row.offerQualification, row.evidenceNarrative].filter(Boolean).join(' | ')]), margin: { left: margin, right: margin }, styles: { fontSize: 8 } });
    }
    if (offerReport.notAllowedAbnormalRows.length) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Abnormal items not allowed for', margin, 20);
      autoTable(doc, { startY: 28, head: [['Type', 'Not allowed for', 'Qualification']], body: offerReport.notAllowedAbnormalRows.map(row => [row.kind === 'REPORT' ? 'Report' : row.kind === 'WORK' ? 'Conditional work' : 'Abnormal', row.title, row.qualification]), margin: { left: margin, right: margin }, styles: { fontSize: 8 }, rowPageBreak: 'avoid' });
    }
  }
  return {
    blob: doc.output('blob'),
    filename: `${safeFilename(appraisal.site || appraisal.name)}-${new Date().toISOString().slice(0, 10)}-high-level-overview.pdf`,
  };
}

export async function exportAppraisalRevenueCostSummaryToExcelBlob(appraisal: DevelopmentAppraisal, projects: Project[] = []) {
  const workbook = await createWorkbook();
  workbook.calcProperties.fullCalcOnLoad = true;
  (workbook.calcProperties as ExcelJS.Workbook['calcProperties'] & { calcMode?: string }).calcMode = 'auto';
  const comparison = compareAppraisalOptions(appraisal);
  const option = comparison.find((entry) => entry.isRecommended)?.option
    || appraisal.options.find((entry) => entry.id === appraisal.selectedOptionId)
    || appraisal.options[0];
  if (!option) throw new Error('No appraisal option is available for summary export.');

  const report = buildFinalReportData(option);
  const finalReportMetrics = calculateFinalReportMetrics(option);
  const baseMetrics = finalReportMetrics.originalMetrics;
  const scenarioMetrics = (landValue: number) => landValue === 0 && option.frozenZeroLandMetrics
    ? option.frozenZeroLandMetrics
    : calculateAppraisalOption({
      ...option,
      calculationMode: 'KNOWN_LAND_PROFIT_ON_GDV',
      knownLandValue: Math.max(0, landValue),
    });
  const compactScenarios: Array<{
    label: string;
    landValue: number;
    totalCost: number;
    profit: number;
    profitOnGdvPercent: number;
  }> = [];
  if (baseMetrics.landValue < 0) {
    compactScenarios.push({
      label: 'Land adjusted to zero',
      landValue: finalReportMetrics.metrics.landValue,
      totalCost: finalReportMetrics.metrics.totalCost,
      profit: finalReportMetrics.metrics.profit,
      profitOnGdvPercent: finalReportMetrics.metrics.profitOnGdvPercent,
    });
  } else if (baseMetrics.landValue > 0) {
    const zeroLand = scenarioMetrics(0);
    compactScenarios.push({
      label: 'Land at zero',
      landValue: zeroLand.landValue,
      totalCost: zeroLand.totalCost,
      profit: zeroLand.profit,
      profitOnGdvPercent: zeroLand.profitOnGdvPercent,
    });
  }
  const sellerMetrics = calculateSellerLandPriceMetrics(option);
  if (sellerMetrics && (baseMetrics.landValue <= 0 || sellerMetrics.landValue <= baseMetrics.landValue)) {
    compactScenarios.push({
      label: 'Landowner expected receipt',
      landValue: sellerMetrics.landValue,
      totalCost: sellerMetrics.totalCost,
      profit: sellerMetrics.profit,
      profitOnGdvPercent: sellerMetrics.profitOnGdvPercent,
    });
  }

  const sheet = workbook.addWorksheet('Revenue Cost Summary', {
    views: [{ showGridLines: false }],
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: { left: 0.35, right: 0.35, top: 0.45, bottom: 0.45, header: 0.2, footer: 0.2 },
    },
  });
  sheet.columns = [
    { key: 'a', width: 36 },
    { key: 'b', width: 14 },
    { key: 'c', width: 22 },
    { key: 'd', width: 3 },
    { key: 'e', width: 22 },
    { key: 'f', width: 38 },
    { key: 'g', width: 20 },
    { key: 'h', width: 22 },
    { key: 'i', width: 16 },
    { key: 'j', width: 30 },
    { key: 'k', width: 24 },
  ];
  sheet.properties.defaultRowHeight = 19;

  const border = { style: 'thin' as const, color: { argb: 'FFE2E8F0' } };
  const moneyFormat = '£#,##0;[Red]-£#,##0';
  const percentFormat = '0.0%;[Red]-0.0%';
  const titleFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF0F172A' } };
  const headerFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1E293B' } };
  const tealFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF0891B2' } };
  const lightFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF8FAFC' } };
  const summaryFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFDCFCE7' } };
  const inputFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFDBEAFE' } };
  const styleHeaderCells = (rowNumber: number, from: number, to: number, fill = headerFill) => {
    for (let column = from; column <= to; column += 1) {
      const cell = sheet.getCell(rowNumber, column);
      cell.fill = fill;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle' };
      cell.border = { top: border, bottom: border, left: border, right: border };
    }
  };
  const styleBodyRow = (rowNumber: number, from: number, to: number, fill?: typeof lightFill) => {
    for (let column = from; column <= to; column += 1) {
      const cell = sheet.getCell(rowNumber, column);
      if (fill) cell.fill = fill;
      cell.border = { top: border, bottom: border, left: border, right: border };
      cell.alignment = { vertical: 'middle' };
      if (typeof cell.value === 'number' && cell.value < 0) {
        cell.font = { ...(cell.font || {}), color: { argb: 'FFB91C1C' } };
      }
    }
  };

  sheet.mergeCells('A1:K1');
  sheet.getCell('A1').value = 'Revenue And Cost Summary';
  sheet.getCell('A1').fill = titleFill;
  sheet.getCell('A1').font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
  sheet.getCell('A1').alignment = { vertical: 'middle' };
  sheet.getRow(1).height = 28;

  sheet.mergeCells('A2:K2');
  sheet.getCell('A2').value = `${appraisal.name} | ${option.name} | ${linkedProjectName(appraisal, projects)}`;
  sheet.getCell('A2').font = { color: { argb: 'FF475569' } };
  sheet.getCell('A2').alignment = { vertical: 'middle' };
  sheet.getRow(2).height = 22;

  sheet.getRow(4).values = ['Revenue', 'Units', 'Value', '', '', 'Cost', '', 'Value'];
  styleHeaderCells(4, 1, 3);
  styleHeaderCells(4, 6, 8);
  sheet.getCell('J4').value = 'Base assumptions';
  sheet.getCell('K4').value = 'Input';
  styleHeaderCells(4, 10, 11, tealFill);

  const assumptionRows: Array<[string, number | string, 'money' | 'percent' | 'text']> = [
    ['Sales index uplift %', (option.salesIndexationPercent || 0) / 100, 'percent'],
    ['Cost adjustment %', 0, 'percent'],
    ['Finance cost', baseMetrics.financeCost, 'money'],
    ['Land value input', Math.max(0, baseMetrics.landValue), 'money'],
    ['Target profit on GDV/GSV %', (option.targetProfitOnGdvPercent || 0) / 100, 'percent'],
    ['Likely seller land price', Math.max(0, option.sellerMinimumLandValue || 0), 'money'],
    ['Calculation basis', APPRAISAL_MODE_LABELS[option.calculationMode], 'text'],
  ];
  assumptionRows.forEach(([label, value, format], index) => {
    const rowNumber = 5 + index;
    sheet.getCell(rowNumber, 10).value = label;
    sheet.getCell(rowNumber, 11).value = value;
    sheet.getCell(rowNumber, 11).fill = inputFill;
    sheet.getCell(rowNumber, 11).font = { bold: true, color: { argb: 'FF0F172A' } };
    if (format === 'money') sheet.getCell(rowNumber, 11).numFmt = moneyFormat;
    if (format === 'percent') sheet.getCell(rowNumber, 11).numFmt = percentFormat;
    styleBodyRow(rowNumber, 10, 11);
  });
  sheet.getCell('J13').value = 'Editable cells';
  sheet.getCell('K13').value = 'Change blue inputs and revenue/cost row values to test impact.';
  sheet.getCell('K13').alignment = { wrapText: true, vertical: 'middle' };
  styleBodyRow(13, 10, 11, lightFill);

  const sourceRevenueRows: Array<{ id: string; title: string; units: string | number; value: number }> = report.gdvRows.length > 0
    ? report.gdvRows.map((row) => ({ id: row.id, title: row.title, units: row.units, value: row.gdv }))
    : [{ id: 'gdv-gsv', title: 'GDV/GSV', units: '', value: report.indexedSalesGdv }];
  const existingSalesIndexRow = sourceRevenueRows.find((row) => row.id === 'sales-indexation-uplift');
  const revenueRows = sourceRevenueRows.filter((row) => row.id !== 'sales-indexation-uplift');
  revenueRows.push(existingSalesIndexRow || {
    id: 'sales-indexation-uplift',
    title: 'Sales indexation uplift',
    units: 0,
    value: 0,
  });
  revenueRows.push({
    id: 'indexed-revenue-total',
    title: 'Indexed revenue',
    units: report.houseTypeRows.reduce((total, row) => total + row.quantity, 0),
    value: report.indexedSalesGdv,
  });
  type RevenueCostSummaryCostRow = {
    title: string;
    amount: number;
    role: 'COMPONENT' | 'FINANCE' | 'SUBTOTAL' | 'LAND' | 'TOTAL';
  };
  const costRows: RevenueCostSummaryCostRow[] = [
    ...report.groupedCostRows.map((row) => ({ title: row.title, amount: row.amount, role: 'COMPONENT' as const })),
    { title: 'Finance', amount: baseMetrics.financeCost, role: 'FINANCE' },
    { title: 'Subtotal before land', amount: baseMetrics.nonLandCost + baseMetrics.financeCost, role: 'SUBTOTAL' },
    {
      title: option.calculationMode === 'RESIDUAL_LAND_VALUE' ? 'Residual land value' : 'Land value',
      amount: baseMetrics.landValue,
      role: 'LAND',
    },
    { title: 'Total cost', amount: baseMetrics.totalCost, role: 'TOTAL' },
  ];
  const tableLength = Math.max(revenueRows.length, costRows.length);
  const indexableRevenueValueRows: number[] = [];
  const componentCostValueRows: number[] = [];
  let financeCostRowNumber = 0;
  let subtotalBeforeLandRowNumber = 0;
  let landValueRowNumber = 0;
  let indexedRevenueRowNumber = 0;
  let totalCostRowNumber = 0;
  for (let index = 0; index < tableLength; index += 1) {
    const rowNumber = 5 + index;
    const revenueRow = revenueRows[index];
    const costRow = costRows[index];
    if (revenueRow) {
      sheet.getCell(rowNumber, 1).value = revenueRow.title;
      sheet.getCell(rowNumber, 2).value = revenueRow.units;
      if (revenueRow.id === 'sales-indexation-uplift') {
        const formulaBaseRows = indexableRevenueValueRows.length > 0
          ? indexableRevenueValueRows.map((entry) => `C${entry}`).join(',')
          : '0';
        sheet.getCell(rowNumber, 3).value = { formula: `SUM(${formulaBaseRows})*$K$5`, result: revenueRow.value };
      } else if (revenueRow.id === 'indexed-revenue-total') {
        indexedRevenueRowNumber = rowNumber;
        sheet.getCell(rowNumber, 3).value = { formula: `SUM(C5:C${rowNumber - 1})`, result: revenueRow.value };
      } else {
        sheet.getCell(rowNumber, 3).value = revenueRow.value;
        if (revenueRow.id !== 'custom-gdv-addition') indexableRevenueValueRows.push(rowNumber);
        sheet.getCell(rowNumber, 3).fill = inputFill;
      }
      sheet.getCell(rowNumber, 2).alignment = { horizontal: 'right' };
      sheet.getCell(rowNumber, 3).numFmt = moneyFormat;
      sheet.getCell(rowNumber, 3).alignment = { horizontal: 'right' };
    }
    if (costRow) {
      sheet.getCell(rowNumber, 6).value = costRow.title;
      if (costRow.role === 'COMPONENT') {
        sheet.getCell(rowNumber, 8).value = costRow.amount;
        componentCostValueRows.push(rowNumber);
        sheet.getCell(rowNumber, 8).fill = inputFill;
      } else if (costRow.role === 'FINANCE') {
        financeCostRowNumber = rowNumber;
        sheet.getCell(rowNumber, 8).value = { formula: '$K$7', result: costRow.amount };
      } else if (costRow.role === 'SUBTOTAL') {
        subtotalBeforeLandRowNumber = rowNumber;
        const componentCostFormula = componentCostValueRows.length > 0
          ? `SUM(${componentCostValueRows.map((entry) => `H${entry}`).join(',')})`
          : '0';
        sheet.getCell(rowNumber, 8).value = {
          formula: `${componentCostFormula}*(1+$K$6)+${financeCostRowNumber ? `H${financeCostRowNumber}` : '$K$7'}`,
          result: costRow.amount,
        };
      } else if (costRow.role === 'LAND') {
        landValueRowNumber = rowNumber;
        const residualLandFormula = indexedRevenueRowNumber && subtotalBeforeLandRowNumber
          ? `C${indexedRevenueRowNumber}-H${subtotalBeforeLandRowNumber}-(C${indexedRevenueRowNumber}*$K$9)`
          : '0';
        sheet.getCell(rowNumber, 8).value = {
          formula: option.calculationMode === 'RESIDUAL_LAND_VALUE' ? residualLandFormula : '$K$8',
          result: costRow.amount,
        };
      } else {
        totalCostRowNumber = rowNumber;
        sheet.getCell(rowNumber, 8).value = {
          formula: `${subtotalBeforeLandRowNumber ? `H${subtotalBeforeLandRowNumber}` : '0'}+${landValueRowNumber ? `H${landValueRowNumber}` : '$K$8'}`,
          result: costRow.amount,
        };
      }
      sheet.getCell(rowNumber, 8).numFmt = moneyFormat;
      sheet.getCell(rowNumber, 8).alignment = { horizontal: 'right' };
    }
    const fill = index % 2 === 1 ? lightFill : undefined;
    styleBodyRow(rowNumber, 1, 3, fill);
    styleBodyRow(rowNumber, 6, 8, fill);
    if (revenueRow && !['sales-indexation-uplift', 'indexed-revenue-total'].includes(revenueRow.id)) {
      sheet.getCell(rowNumber, 3).fill = inputFill;
    }
    if (costRow?.role === 'COMPONENT') sheet.getCell(rowNumber, 8).fill = inputFill;
    if (index === revenueRows.length - 1) sheet.getRow(rowNumber).font = { ...(sheet.getRow(rowNumber).font || {}), bold: true };
    if (costRow && ['SUBTOTAL', 'LAND', 'TOTAL'].includes(costRow.role)) {
      sheet.getRow(rowNumber).font = { ...(sheet.getRow(rowNumber).font || {}), bold: true };
    }
  }

  const summaryHeaderRow = 7 + tableLength;
  sheet.getRow(summaryHeaderRow).values = ['Indexed revenue', '', 'Total cost', '', 'Residual land value', '', 'Profit', '', 'Margin'];
  styleHeaderCells(summaryHeaderRow, 1, 9, tealFill);
  const summaryValueRow = summaryHeaderRow + 1;
  const indexedRevenueCell = indexedRevenueRowNumber ? `C${indexedRevenueRowNumber}` : '0';
  const totalCostCell = totalCostRowNumber ? `H${totalCostRowNumber}` : '0';
  sheet.getRow(summaryValueRow).values = [
    { formula: indexedRevenueCell, result: report.indexedSalesGdv },
    '',
    { formula: totalCostCell, result: baseMetrics.totalCost },
    '',
    { formula: landValueRowNumber ? `H${landValueRowNumber}` : '0', result: baseMetrics.landValue },
    '',
    { formula: `A${summaryValueRow}-C${summaryValueRow}`, result: baseMetrics.profit },
    '',
    { formula: `IFERROR(G${summaryValueRow}/A${summaryValueRow},0)`, result: baseMetrics.profitOnGdvPercent / 100 },
  ];
  [1, 3, 5, 7].forEach((column) => {
    sheet.getCell(summaryValueRow, column).numFmt = moneyFormat;
    sheet.getCell(summaryValueRow, column).alignment = { horizontal: 'right' };
  });
  sheet.getCell(summaryValueRow, 9).numFmt = percentFormat;
  sheet.getCell(summaryValueRow, 9).alignment = { horizontal: 'right' };
  styleBodyRow(summaryValueRow, 1, 9, summaryFill);
  sheet.getRow(summaryValueRow).font = { bold: true };

  if (compactScenarios.length > 0) {
    const scenarioTitleRow = summaryValueRow + 3;
    sheet.mergeCells(scenarioTitleRow, 1, scenarioTitleRow, 9);
    sheet.getCell(scenarioTitleRow, 1).value = 'Land scenario summary';
    sheet.getCell(scenarioTitleRow, 1).font = { bold: true, size: 12, color: { argb: 'FF0F172A' } };
    const scenarioHeaderRow = scenarioTitleRow + 1;
    sheet.getRow(scenarioHeaderRow).values = ['Scenario', 'Land price', 'Total cost', 'Profit', 'Margin'];
    styleHeaderCells(scenarioHeaderRow, 1, 5, headerFill);
    compactScenarios.forEach((row, index) => {
      const rowNumber = scenarioHeaderRow + 1 + index;
      sheet.getRow(rowNumber).values = [
        row.label,
        row.landValue,
        { formula: `$C$${summaryValueRow}-$K$8+B${rowNumber}`, result: row.totalCost },
        { formula: `$A$${summaryValueRow}-C${rowNumber}`, result: row.profit },
        { formula: `IFERROR(D${rowNumber}/$A$${summaryValueRow},0)`, result: row.profitOnGdvPercent / 100 },
      ];
      [2, 3, 4].forEach((column) => {
        sheet.getCell(rowNumber, column).numFmt = moneyFormat;
        sheet.getCell(rowNumber, column).alignment = { horizontal: 'right' };
      });
      sheet.getCell(rowNumber, 5).numFmt = percentFormat;
      sheet.getCell(rowNumber, 5).alignment = { horizontal: 'right' };
      styleBodyRow(rowNumber, 1, 5, index % 2 === 1 ? lightFill : undefined);
    });
  }

  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { ...(cell.alignment || {}), vertical: 'middle' };
    });
  });

  addSiteCostRegisterSheets(workbook, report);
  const buffer = await workbook.xlsx.writeBuffer();
  return {
    blob: new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename: `${safeFilename(appraisal.name)}-revenue-cost-summary.xlsx`,
  };
}

export async function exportAppraisalDecisionPackToPdf(appraisal: DevelopmentAppraisal, projects: Project[] = [], issue?: ReportIssueControl) {
  const { jsPDF, autoTable } = await loadPdfRuntime();
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const margin = 16;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - (margin * 2);
  let y = margin;

  const lastTableY = () => (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };
  const sectionTitle = (title: string) => {
    ensureSpace(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin, y);
    y += 6;
  };
  const underlinedSectionTitle = (title: string) => {
    ensureSpace(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin, y);
    doc.setDrawColor(15, 23, 42);
    doc.line(margin, y + 1.5, margin + Math.min(contentWidth, doc.getTextWidth(title)), y + 1.5);
    y += 6;
  };
  const paragraph = (text: string, maxLines = Number.POSITIVE_INFINITY) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.splitTextToSize(text, contentWidth).slice(0, maxLines).forEach((line: string) => {
      ensureSpace(5);
      doc.text(line, margin, y);
      y += 4;
    });
    y += 2;
  };
  const executiveSummaryParagraphs = (text: string) => {
    const headingPattern = /^(overview|sales prices? and basis|costs? and abnormals?|gdv improvement considerations|summary and recommendation|recommendation)$/i;
    text.split(/\n+/).map((line) => line.trim()).filter(Boolean).forEach((line) => {
      if (headingPattern.test(line.replace(/:$/, ''))) {
        ensureSpace(8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(line.replace(/:$/, ''), margin, y);
        const width = Math.min(contentWidth, doc.getTextWidth(line.replace(/:$/, '')));
        doc.setDrawColor(15, 23, 42);
        doc.line(margin, y + 1.2, margin + width, y + 1.2);
        y += 6;
        return;
      }
      paragraph(line);
    });
  };
  const recommendationStatus = (recommendation: ReturnType<typeof finalReportRecommendation>) => {
    const color = recommendation.tone === 'good' ? [22, 101, 52] : recommendation.tone === 'watch' ? [146, 64, 14] : [185, 28, 28];
    // A report outcome, not a UI control: retain a clear visual hierarchy with
    // a compact status marker and an explicit assessment label.
    const label = recommendation.shortLabel.toUpperCase();
    const rightEdge = pageWidth - margin;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('ASSESSMENT', rightEdge, 15.5, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const labelWidth = doc.getTextWidth(label);
    const dotX = rightEdge - labelWidth - 5;
    doc.setFillColor(color[0], color[1], color[2]);
    doc.circle(dotX, 23.1, 1.35, 'F');
    doc.setTextColor(241, 245, 249);
    doc.text(label, rightEdge, 24.3, { align: 'right' });
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(appraisal.name, margin, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Status: ${appraisal.status} | Linked project: ${linkedProjectName(appraisal, projects)}`, margin, y);
  y += 10;

  const comparison = compareAppraisalOptions(appraisal);
  const activeOption = comparison.find((entry) => entry.isRecommended)?.option || appraisal.options[0];
  if (activeOption) {
    const report = buildFinalReportData(activeOption);
    const salesBasisNarrative = extractFinalReportNarrativeSection(activeOption.finalReportExecutiveSummary, 'Sales prices and basis') || report.salesBasisNarrative;
    const gdvImprovementNarrative = extractFinalReportNarrativeSection(activeOption.finalReportExecutiveSummary, 'GDV improvement considerations') || report.gdvImprovementNarrative;
    const totalGdv = report.currentScenario.rows.find((row) => row.label === 'GDV')?.value || 0;
    const totalCost = report.currentScenario.rows.find((row) => row.label === 'Total cost')?.value || 0;
    const recommendation = finalReportRecommendation(activeOption);
    const recommendationText = summaryRecommendationText(activeOption.finalReportExecutiveSummary || '', recommendation.basis);

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 36, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Final Appraisal Report', margin, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${appraisal.name} | ${linkedProjectName(appraisal, projects)}`, margin, 27);
    recommendationStatus(recommendation);
    doc.setTextColor(241, 245, 249);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(36);
    doc.text(recommendation.shortLabel.toUpperCase(), pageWidth / 2, 95, { align: 'center', angle: -24 });
    y = 46;

    sectionTitle('Executive summary');
    const summaryText = activeOption.finalReportExecutiveSummary || 'No executive summary has been generated yet.';
    executiveSummaryParagraphs(summaryText);

    const recommendationLines = doc.splitTextToSize(recommendationText, contentWidth - 6);
    const recommendationHeight = Math.max(22, 12 + (recommendationLines.length * 4));
    ensureSpace(recommendationHeight + 4);
    doc.setFillColor(recommendation.tone === 'good' ? 220 : recommendation.tone === 'watch' ? 254 : 254, recommendation.tone === 'good' ? 252 : recommendation.tone === 'watch' ? 243 : 226, recommendation.tone === 'good' ? 231 : recommendation.tone === 'watch' ? 199 : 226);
    doc.roundedRect(margin, y, contentWidth, recommendationHeight, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(recommendation.tone === 'good' ? 22 : recommendation.tone === 'watch' ? 146 : 185, recommendation.tone === 'good' ? 101 : recommendation.tone === 'watch' ? 64 : 28, recommendation.tone === 'good' ? 52 : recommendation.tone === 'watch' ? 14 : 28);
    doc.text(`Summary and recommendation: ${recommendation.label}`, margin + 3, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(recommendationLines, margin + 3, y + 12);
    y += recommendationHeight + 6;

    const attachedLayout = currentArchitectFeasibilityLayout(activeOption);
    let sitePlan = null;
    if (attachedLayout) {
      try {
        sitePlan = await renderArchitectFeasibilityLayout(attachedLayout);
      } catch (error) {
        // Keep the decision pack usable while making a failed layout render
        // explicit instead of silently omitting the evidence page.
        console.warn('Unable to render architect feasibility layout for PDF export.', error);
      }
    }
    if (sitePlan) {
      doc.addPage();
      y = margin;
      sectionTitle('Architect feasibility layout');
      paragraph('Current site plan used to support the site arrangement, capacity and development assumptions.', 4);
      const availableHeight = pageHeight - y - margin;
      const planScale = Math.min(contentWidth / Math.max(sitePlan.width, 1), availableHeight / Math.max(sitePlan.height, 1));
      const planWidth = sitePlan.width * planScale;
      const planHeight = sitePlan.height * planScale;
      doc.addImage(sitePlan.dataUrl, sitePlan.format, margin + ((contentWidth - planWidth) / 2), y, planWidth, planHeight);
    } else if (attachedLayout) {
      doc.addPage();
      y = margin;
      sectionTitle('Architect feasibility layout');
      paragraph('A feasibility layout has been recorded for this appraisal but could not be rendered into this PDF. Re-export after reopening the appraisal; the underlying evidence remains attached to the appraisal.', 4);
    }

    doc.addPage();
    y = margin;
    sectionTitle('GDV/GSV and cost summary');
    const tableStartY = y;
    const halfWidth = (contentWidth / 2) - 2;
    autoTable(doc, {
      startY: tableStartY,
      head: [['GDV/GSV breakdown', 'Units', 'Value']],
      body: [
        ...report.gdvRows.map((row) => [row.title, row.units.toLocaleString(), formatMoney(row.gdv)]),
        ['Indexed GDV/GSV', report.houseTypeRows.reduce((total, row) => total + row.quantity, 0).toLocaleString(), formatMoney(totalGdv)],
      ],
      margin: { left: margin },
      tableWidth: halfWidth,
      pageBreak: 'avoid',
      headStyles: { fillColor: [15, 23, 42] },
      bodyStyles: { fontSize: 7 },
      didParseCell: pdfNegativeCellHook,
    });
    const leftTableY = lastTableY();

    autoTable(doc, {
      startY: tableStartY,
      head: [['Cost breakdown', 'Value']],
      body: [
        ...report.costSummaryRows.map((row) => [row.title, formatMoney(row.amount)]),
      ],
      margin: { left: margin + halfWidth + 4 },
      tableWidth: halfWidth,
      pageBreak: 'avoid',
      headStyles: { fillColor: [30, 41, 59] },
      bodyStyles: { fontSize: 7 },
      didParseCell: pdfCostSummaryCellHook,
      didDrawCell: pdfCostSummaryRuleHook,
    });
    y = Math.max(leftTableY, lastTableY()) + 7;

    autoTable(doc, {
      startY: y,
      head: [['Base appraisal before adjustments', 'Value']],
      body: report.baseSummaryRows.map((row) => [row.label, formatReportValue(row)]),
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [8, 145, 178] },
      bodyStyles: { fontSize: 8 },
      didParseCell: pdfNegativeCellHook,
    });
    y = lastTableY() + 8;

    [report.zeroLandScenario, report.sellerScenario].filter(Boolean).forEach((scenario) => {
      sectionTitle(scenario!.title);
      autoTable(doc, {
        startY: y,
        head: [['Item', 'Value', 'Notes']],
        body: scenario!.rows.map((row) => [row.label, formatMoney(row.value), row.note || '']),
        margin: { left: margin, right: margin },
        headStyles: { fillColor: [30, 64, 175] },
        bodyStyles: { fontSize: 7 },
        didParseCell: pdfNegativeCellHook,
      });
      y = lastTableY() + 8;
    });

    doc.addPage();
    y = margin;
    sectionTitle('Land price profitability sensitivity');
    autoTable(doc, {
      startY: y,
      head: [['Basis', 'Land price', 'Finance', 'Total cost', 'Profit', 'Profit/GDV', 'Movement']],
      body: report.landPriceSensitivityRows.map((row, index) => [
        row.label || `Increment ${index + 1}`,
        formatMoney(row.landValue),
        formatMoney(row.financeCost),
        formatMoney(row.totalCost),
        formatMoney(row.profit),
        formatPercent(row.profitOnGdvPercent),
        formatMoney(row.profitMovement),
      ]),
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [15, 118, 110] },
      bodyStyles: { fontSize: 7 },
      didParseCell: pdfNegativeCellHook,
    });
    y = lastTableY() + 8;

    doc.addPage();
    y = margin;
    sectionTitle('Sales prices and basis');
    paragraph(salesBasisNarrative, 18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`House type sales summary | Indexed average ${formatRate(report.averageSaleRateFt2)}`, margin, y);
    y += 5;
    autoTable(doc, {
      startY: y,
      head: [['House type', 'Qty', 'GIFA ft2', 'Base sale', 'Index uplift', 'Indexed sale', 'Indexed £/ft2', 'Indexed GDV']],
      body: report.houseTypeRows.map((row) => [
        row.houseTypeName,
        row.quantity,
        row.gifaFt2.toLocaleString(undefined, { maximumFractionDigits: 0 }),
        formatMoney(row.saleValuePerUnit),
        formatMoney(row.indexUpliftPerUnit),
        formatMoney(row.indexedSaleValuePerUnit),
        formatRate(row.indexedSaleRateFt2),
        formatMoney(row.indexedGdv),
      ]),
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [15, 23, 42] },
      bodyStyles: { fontSize: 7 },
      didParseCell: pdfNegativeCellHook,
    });
    doc.addPage();
    y = margin;
    underlinedSectionTitle('GDV improvement considerations');
    paragraph(gdvImprovementNarrative);

    sectionTitle('Indexed sales sensitivity');
    autoTable(doc, {
      startY: y,
      head: [['Movement', 'Average £/ft2', 'GDV', 'Land value', 'Profit', 'Profit/GDV']],
      body: report.sensitivityRows.map((row) => [
        `${row.deltaRateFt2 > 0 ? '+' : ''}${row.deltaRateFt2}/ft2`,
        formatRate(row.averageRateFt2),
        formatMoney(row.gdv),
        formatMoney(row.landValue),
        formatMoney(row.profit),
        formatPercent(row.profitOnGdvPercent),
      ]),
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [30, 64, 175] },
      bodyStyles: { fontSize: 7 },
      didParseCell: pdfNegativeCellHook,
    });
    y = lastTableY() + 8;

    doc.addPage();
    y = margin;
    if (report.engineeringScope) {
      sectionTitle('Engineer’s scope and pricing');paragraph(report.engineeringScope.notes,8);
      autoTable(doc,{startY:y,head:[['Ref','Scope / decision','Destination','Pricing mechanism','Appraisal cost']],body:report.engineeringScope.rows.map(row=>[row.reference,`${row.title}\n${row.status}\n${row.scope}\n${row.note}\n${row.source}`,row.destination,`${row.mechanism}\nScope allowance ${formatMoney(row.scopeAllowance)}`,formatMoney(row.amount)]),margin:{left:margin,right:margin},styles:{fontSize:7,cellPadding:2},rowPageBreak:'avoid',headStyles:{fillColor:[4,120,87]}});
      doc.addPage();y=margin;
    }
    sectionTitle('Site costs and abnormals');
    paragraph(report.siteCostRegisterSummary, 8);
    autoTable(doc, { startY: y, head: [['Cost heading', 'Base allowance', 'Additional elements', 'Combined total']], body: report.siteCostSummaryRows.map(row => [row.title, formatMoney(row.base), formatMoney(row.additions), formatMoney(row.total)]), margin: { left: margin, right: margin }, styles: { fontSize: 8 } });
    y = lastTableY() + 8;
    paragraph(`Land-offer schedule: disclosed subset already counted ${formatMoney(report.landOfferDisclosureTotal)}.`, 8);
    report.landOfferRows.forEach(row => paragraph(`${row.title}: ${row.assessmentStatus}; ${formatMoney(row.amount)}. ${row.offerQualification || 'Qualification not recorded.'} ${row.amount === 0 && row.assessmentStatus !== 'Cleared — no cost' ? 'Unpriced matter.' : ''}`, 8));
    if (report.notAllowedAbnormalRows.length) {
      doc.addPage(); y = margin;
      sectionTitle('Abnormal items not allowed for in the land offer');
      paragraph('Excluded surveys, possible resulting works and unpriced Abnormals elements do not contribute to appraisal costs. Conditional work excludes anything expressly allowed elsewhere.', 8);
      autoTable(doc, { startY: y, head: [['Type', 'Not allowed for', 'Offer qualification']], body: report.notAllowedAbnormalRows.map(row => [row.kind === 'REPORT' ? 'Report' : row.kind === 'WORK' ? 'Conditional work' : 'Abnormal', row.title, row.qualification]), margin: { left: margin, right: margin }, styles: { fontSize: 7.5 }, rowPageBreak: 'avoid' });
      y = lastTableY() + 8;
    }
    if (report.abnormalConstraintsNarrative) {
      ensureSpace(24);
      doc.setFillColor(239, 246, 255);
      doc.rect(margin, y - 4, contentWidth, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 64, 175);
      doc.text('Constraints report summary', margin + 2, y + 2);
      y += 9;
      paragraph(report.abnormalConstraintsNarrative, 8);
    }
    if (report.abnormalRows.length > 0) {
      report.abnormalRows.forEach((row) => {
        ensureSpace(26);
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 4, contentWidth, 10, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(row.title, margin + 2, y + 2);
        doc.text(formatMoney(row.amount), pageWidth - margin - 2, y + 2, { align: 'right' });
        y += 9;
        paragraph(row.evidenceNarrative, 8);
      });
    } else if (!report.abnormalConstraintsNarrative) {
      paragraph('No additional site elements have been added yet.', 3);
    }

    doc.addPage();
    y = margin;
    sectionTitle('RICS House Builders Profit Margins');
    paragraph('The current appraisal is shown unchanged for comparison. Separate RICS scenarios use a fixed 5.0% overhead allowance and profit on GDV of 12.5% for greenfield, 15.0% for normal risk, 17.5% for moderate risk and 20.0% for high risk.', 8);
    autoTable(doc, {
      startY: y,
      head: [['Risk case', 'O&P', 'Overheads', 'Profit %', 'Profit £', 'Residual land value', 'Justification']],
      body: report.profitMarginRows.map((row) => [
        row.label,
        formatPercent(row.operatingAndProfitPercent),
        formatPercent(row.overheadPercent),
        formatPercent(row.profitOnGdvPercent),
        formatMoney(row.profit),
        formatMoney(row.landValue),
        row.justification,
      ]),
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [30, 64, 175] },
      bodyStyles: { fontSize: 7 },
      didParseCell: pdfNegativeCellHook,
    });

    doc.addPage();
    y = margin;
  }

  autoTable(doc, {
    startY: y,
    head: [['Option', 'GDV', 'Cost', 'Finance', 'Land', 'Profit', 'Profit/GDV', 'Position', 'Selected']],
    body: comparison.map(({ option, isRecommended }) => {
      const finalReportMetrics = calculateFinalReportMetrics(option);
      const metrics = finalReportMetrics.metrics;
      const originalMetrics = finalReportMetrics.originalMetrics;
      return [
        option.name,
        formatMoney(metrics.gdv),
        formatMoney(metrics.nonLandCost),
        formatMoney(metrics.financeCost),
        finalReportMetrics.hasNegativeResidualLand ? `${formatMoney(metrics.landValue)}\n(was ${formatMoney(originalMetrics.landValue)})` : formatMoney(metrics.landValue),
        finalReportMetrics.hasNegativeResidualLand ? `${formatMoney(metrics.profit)}\n(was ${formatMoney(originalMetrics.profit)})` : formatMoney(metrics.profit),
        finalReportMetrics.hasNegativeResidualLand ? `${formatPercent(metrics.profitOnGdvPercent)}\n(was ${formatPercent(originalMetrics.profitOnGdvPercent)})` : formatPercent(metrics.profitOnGdvPercent),
        recommendationLabel(metrics.recommendation),
        isRecommended ? 'Yes' : '',
      ];
    }),
    margin: { left: margin, right: margin },
    headStyles: { fillColor: [15, 23, 42] },
    bodyStyles: { fontSize: 8 },
    didParseCell: pdfNegativeCellHook,
  });

  const tableMeta = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  y = (tableMeta?.finalY ?? y) + 10;

  if (comparison.some(({ option }) => calculateFinalReportMetrics(option).hasNegativeResidualLand)) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9);
    doc.text('Negative residual land values are capped at £0 in this final report; profit and profit/GDV are recalculated on that basis.', margin, y);
    doc.setTextColor(15, 23, 42);
    y += 8;
  }

  const sellerRows = comparison
    .map(({ option }) => {
      const sellerMetrics = calculateSellerLandPriceMetrics(option);
      return sellerMetrics ? {
        optionName: option.name,
        metrics: sellerMetrics,
      } : null;
    })
    .filter((entry): entry is { optionName: string; metrics: NonNullable<ReturnType<typeof calculateSellerLandPriceMetrics>> } => Boolean(entry));

  if (sellerRows.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Option', 'Seller land price', 'Profit at seller price', 'Profit/GDV at seller price']],
      body: sellerRows.map(({ optionName, metrics }) => [
        optionName,
        formatMoney(metrics.landValue),
        formatMoney(metrics.profit),
        formatPercent(metrics.profitOnGdvPercent),
      ]),
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [30, 64, 175] },
      bodyStyles: { fontSize: 8 },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 10;
  }

  if (appraisal.kind === 'HOUSE_BUILDING') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('House-building summary', margin, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Option', 'Units', 'GIFA', 'Private houses', 'Affordable houses', 'Infrastructure', 'Plot works', 'Prelims', 'GDV']],
      body: appraisal.options.map((option) => {
        const summary = summariseHouseBuildingOption(option);
        const report = buildFinalReportData(option);
        const costAmount = (title: string) => report.groupedCostRows.find((row) => row.title === title)?.amount || 0;
        return [
          option.name,
          summary.totalUnits.toLocaleString(),
          `${summary.totalGifa.toLocaleString()} m2`,
          formatMoney(summary.basePrivateHouseConstructionCost),
          formatMoney(summary.baseAffordableHouseConstructionCost),
          formatMoney(costAmount('Infrastructure')),
          formatMoney(costAmount('Plot Works')),
          formatMoney(costAmount('Prelims')),
          formatMoney(summary.gdv),
        ];
      }),
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [15, 23, 42] },
      bodyStyles: { fontSize: 8 },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8;

    const activeOption = comparison.find((entry) => entry.isRecommended)?.option || appraisal.options[0];
    if (activeOption && y < 250) {
      autoTable(doc, {
        startY: y,
        head: [['House type', 'Qty', 'GIFA', 'Cost/m2', 'Construction', 'Sale/unit', 'GDV']],
        body: (activeOption.houseTypeSchedule || []).slice(0, 12).map((row) => [
          row.houseTypeName,
          row.quantity,
          row.gifaM2,
          formatMoney(row.buildCostPerM2),
          formatMoney(calculateHouseTypeConstructionTotal(row)),
          formatMoney(row.saleValuePerUnit || 0),
          formatMoney(calculateHouseTypeGdv(row)),
        ]),
        margin: { left: margin, right: margin },
        headStyles: { fillColor: [30, 41, 59] },
        bodyStyles: { fontSize: 7 },
      });
      y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 10;
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  ensureSpace(14);
  doc.text('Key assumptions', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  appraisal.options.slice(0, 4).forEach((option) => {
    const metrics = calculateFinalReportMetrics(option).metrics;
    const noteParts = [
      option.assumptions,
      option.housePricesComment ? `House prices: ${option.housePricesComment}` : '',
      option.decisionNote,
    ].filter(Boolean);
    const lines = [
      `${option.name}: ${APPRAISAL_TEMPLATE_LABELS[option.template]}, ${APPRAISAL_MODE_LABELS[option.calculationMode]}`,
      `Duration ${option.durationMonths} months, target profit ${formatPercent(option.targetProfitOnGdvPercent)}, finance ${formatPercent(option.financeAnnualRatePercent)}`,
      `Peak funding ${formatMoney(metrics.peakFunding)}. ${noteParts.join(' | ') || 'No notes recorded.'}`,
    ];
    lines.forEach((line) => {
      doc.splitTextToSize(line, contentWidth).forEach((wrappedLine: string) => {
        ensureSpace(5);
        doc.text(wrappedLine, margin, y);
        y += 4;
      });
      y += 1;
    });
    y += 2;
  });

  if (issue) {
    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(148, 163, 184);
      doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Approved issue ${issue.issueNumber} | Reviewer: ${issue.reviewer} | ${issue.approvedAt} | SHA-256: ${issue.sourceHash}`, margin, pageHeight - 8);
    }
  }

  return {
    blob: doc.output('blob'),
    filename: `${safeFilename(appraisal.name)}-appraisal-decision-pack.pdf`,
  };
}

function activeReportOption(appraisal: DevelopmentAppraisal) {
  return compareAppraisalOptions(appraisal).find((entry) => entry.isRecommended)?.option || appraisal.options[0];
}

function xmlEscape(value: string | number) {
  return String(value ?? '')
    .replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD]/g, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

type DocxParagraphStyle = 'Title' | 'Subtitle' | 'Heading1' | 'Heading2' | 'BodyText' | 'SmallText' | 'CoverMeta';
type DocxAlign = 'left' | 'right' | 'center';
type DocxCellInput = string | number | {
  text: string | number;
  align?: DocxAlign;
  bold?: boolean;
  fill?: string;
  color?: string;
  size?: number;
};

const DOCX_NAVY = '0F172A';
const DOCX_BLUE = '1E3A8A';
const DOCX_TEAL = '0F766E';
const DOCX_SLATE = '475569';
const DOCX_MUTED = '64748B';
const DOCX_LIGHT = 'F8FAFC';
const DOCX_ROW = 'F1F5F9';
const DOCX_NEGATIVE = 'B91C1C';

function docxColor(value: string) {
  return value.replace('#', '').toUpperCase();
}

function docxSpacing(before = 0, after = 120, line = 276) {
  return `<w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="auto"/>`;
}

function formatDocxMoney(value: number) {
  const rounded = Math.round(value || 0);
  return `${rounded < 0 ? '-' : ''}£${Math.abs(rounded).toLocaleString()}`;
}

function formatDocxNumber(value: number) {
  return Math.round(value || 0).toLocaleString();
}

function formatDocxRate(value: number) {
  return `${formatDocxMoney(value)}/ft2`;
}

function docxReportValue(row: { value: number; isPercent?: boolean }) {
  return row.isPercent ? formatPercent(row.value) : formatDocxMoney(row.value);
}

function normalizeDocxText(value: string | number) {
  return String(value ?? '')
    .replace(/GBP\s*(-?[\d,]+)(?:\.\d+)?\/ft2/g, (_, amount: string) => `${amount.startsWith('-') ? '-' : ''}£${amount.replace('-', '')}/ft2`)
    .replace(/GBP\s*(-?[\d,]+)(?:\.\d+)?/g, (_, amount: string) => `${amount.startsWith('-') ? '-' : ''}£${amount.replace('-', '')}`)
    .replace(/Average GBP\/ft2/g, 'Average £/ft2')
    .replace(/GBP\/ft2/g, '£/ft2')
    .replace(/gross development value/g, 'gross development value');
}

function docxRun(text: string | number, options: { bold?: boolean; color?: string; size?: number; italic?: boolean; underline?: boolean; highlight?: string } = {}) {
  const properties = [
    '<w:rFonts w:ascii="Aptos Display" w:hAnsi="Aptos Display"/>',
    options.bold ? '<w:b/>' : '',
    options.italic ? '<w:i/>' : '',
    options.underline ? '<w:u w:val="single"/>' : '',
    options.color ? `<w:color w:val="${docxColor(options.color)}"/>` : '',
    options.highlight ? `<w:highlight w:val="${options.highlight}"/>` : '',
    options.size ? `<w:sz w:val="${options.size}"/>` : '',
  ].filter(Boolean).join('');
  return `<w:r>${properties ? `<w:rPr>${properties}</w:rPr>` : ''}<w:t xml:space="preserve">${xmlEscape(normalizeDocxText(text))}</w:t></w:r>`;
}

function docxParagraph(
  text: string | number,
  style: DocxParagraphStyle = 'BodyText',
  options: { align?: DocxAlign; bold?: boolean; color?: string; before?: number; after?: number; pageBreakBefore?: boolean; keepNext?: boolean; size?: number; border?: boolean; shading?: string; underline?: boolean } = {},
) {
  const directStyle = {
    Title: { size: 48, color: DOCX_NAVY, bold: true, before: 360, after: 180, underline: false },
    Subtitle: { size: 28, color: DOCX_SLATE, bold: false, before: 0, after: 180, underline: false },
    Heading1: { size: 31, color: DOCX_NAVY, bold: true, before: 280, after: 140, keepNext: true, border: true, underline: false },
    Heading2: { size: 24, color: DOCX_BLUE, bold: true, before: 180, after: 80, keepNext: true, underline: true },
    BodyText: { size: 20, color: '1E293B', bold: false, before: 0, after: 140, underline: false },
    SmallText: { size: 17, color: DOCX_MUTED, bold: false, before: 0, after: 80, underline: false },
    CoverMeta: { size: 18, color: DOCX_TEAL, bold: true, before: 0, after: 80, underline: false },
  }[style];
  const alignXml = options.align && options.align !== 'left' ? `<w:jc w:val="${options.align}"/>` : '';
  const breakXml = options.pageBreakBefore ? '<w:pageBreakBefore/>' : '';
  const keepNextXml = (options.keepNext ?? directStyle.keepNext) ? '<w:keepNext/>' : '';
  const borderXml = (options.border ?? directStyle.border)
    ? '<w:pBdr><w:bottom w:val="single" w:sz="12" w:space="4" w:color="0F766E"/></w:pBdr>'
    : '';
  const shadingXml = options.shading ? `<w:shd w:val="clear" w:color="auto" w:fill="${docxColor(options.shading)}"/>` : '';
  const properties = `<w:pPr><w:pStyle w:val="${style}"/>${breakXml}${keepNextXml}${docxSpacing(options.before ?? directStyle.before, options.after ?? directStyle.after)}${alignXml}${borderXml}${shadingXml}</w:pPr>`;
  return `<w:p>${properties}${docxRun(text, {
    bold: options.bold ?? directStyle.bold,
    color: options.color ?? directStyle.color,
    size: options.size ?? directStyle.size,
    underline: options.underline ?? directStyle.underline,
  })}</w:p>`;
}

function docxPageBreak() {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

function docxHorizontalRule() {
  return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="1" w:color="94A3B8"/></w:pBdr></w:pPr></w:p>';
}

function isNegativeReportValue(value: string | number) {
  const text = String(value);
  return /(^|[\s(])(?:GBP\s*)?-/.test(text) || /-£/.test(text) || /-\d+(?:\.\d+)?%/.test(text);
}

function resolveDocxCell(cell: DocxCellInput): Required<Pick<Extract<DocxCellInput, object>, 'text'>> & {
  align?: DocxAlign;
  bold?: boolean;
  fill?: string;
  color?: string;
  size?: number;
} {
  return typeof cell === 'object' && cell !== null
    ? { text: cell.text, align: cell.align, bold: cell.bold, fill: cell.fill, color: cell.color, size: cell.size }
    : { text: cell as string | number };
}

function docxCell(cell: DocxCellInput, width: number, options: { header?: boolean; shaded?: boolean; align?: DocxAlign } = {}) {
  const resolved = resolveDocxCell(cell);
  const align = resolved.align || options.align || (typeof resolved.text === 'number' || /^(GBP|£|[-+]?\d)/.test(String(resolved.text)) ? 'right' : 'left');
  const fill = resolved.fill || (options.header ? DOCX_NAVY : options.shaded ? DOCX_ROW : 'FFFFFF');
  const color = resolved.color || (options.header ? 'FFFFFF' : isNegativeReportValue(resolved.text) ? DOCX_NEGATIVE : DOCX_NAVY);
  const bold = resolved.bold || options.header || false;
  return `<w:tc>
    <w:tcPr>
      <w:tcW w:w="${width}" w:type="dxa"/>
      <w:shd w:val="clear" w:color="auto" w:fill="${docxColor(fill)}"/>
      <w:tcMar><w:top w:w="90" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar>
    </w:tcPr>
    <w:p><w:pPr>${docxSpacing(0, 40, 240)}${align !== 'left' ? `<w:jc w:val="${align}"/>` : ''}</w:pPr>${docxRun(resolved.text, { bold, color, size: resolved.size || (options.header ? 19 : 18), underline: resolved.bold && !options.header })}</w:p>
  </w:tc>`;
}

function docxTable(rows: Array<Array<DocxCellInput>>, widths: number[] = [], options: { header?: boolean; compact?: boolean } = {}) {
  const columnCount = Math.max(...rows.map((row) => row.length), 1);
  const tableWidth = widths.reduce((total, width) => total + width, 0) || 9360;
  const resolvedWidths = widths.length === columnCount
    ? widths
    : Array.from({ length: columnCount }, () => Math.floor(tableWidth / columnCount));
  const body = rows.map((row, rowIndex) => {
    const isHeader = options.header !== false && rowIndex === 0;
    const shaded = !isHeader && rowIndex % 2 === 0;
    return `<w:tr><w:trPr><w:cantSplit/></w:trPr>${row.map((cell, cellIndex) => docxCell(cell, resolvedWidths[cellIndex] || 2200, { header: isHeader, shaded })).join('')}</w:tr>`;
  }).join('');
  return `<w:tbl>
    <w:tblPr>
      <w:tblStyle w:val="ProfessionalTable"/>
      <w:tblW w:w="${tableWidth}" w:type="dxa"/>
      <w:tblLayout w:type="fixed"/>
      <w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar>
    </w:tblPr>
    <w:tblGrid>${resolvedWidths.map((width) => `<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>
    ${body}
  </w:tbl>${options.compact ? '' : docxParagraph('', 'SmallText', { after: 80 })}`;
}

function docxMetricCards(rows: Array<{ label: string; value: string; color?: string }>) {
  const cells = rows.map((row) => ({
    text: `${row.label}: ${row.value}`,
    bold: true,
    color: row.color || DOCX_NAVY,
    fill: row.color === DOCX_NEGATIVE ? 'FEF2F2' : 'ECFEFF',
    align: 'center' as DocxAlign,
  }));
  return docxTable([cells], Array.from({ length: rows.length }, () => Math.floor(9360 / Math.max(rows.length, 1))), { header: false, compact: true });
}

function docxRecommendationBanner(recommendation: ReturnType<typeof finalReportRecommendation>, narrative: string) {
  const color = recommendation.tone === 'good' ? '166534' : recommendation.tone === 'watch' ? '92400E' : DOCX_NEGATIVE;
  const fill = recommendation.tone === 'good' ? 'DCFCE7' : recommendation.tone === 'watch' ? 'FEF3C7' : 'FEE2E2';
  return [
    docxTable([
      [
        { text: recommendation.shortLabel.toUpperCase(), bold: true, color, fill, align: 'center', size: 22 },
        { text: narrative, color: DOCX_NAVY, fill: 'FFFFFF', size: 19 },
      ],
    ], [2200, 7160], { header: false, compact: true }),
    docxParagraph('', 'SmallText', { after: 40 }),
  ].join('');
}

function docxAbnormalBasis(row: ReturnType<typeof buildFinalReportData>['abnormalRows'][number]) {
  if (row.quotationCount > 0) {
    return row.quotationCount === 1 ? 'Basis: formal quotation received' : `Basis: ${row.quotationCount} formal quotations received`;
  }
  if (/linked source/i.test(row.knownCostNotes) || /priced abnormal source/i.test(row.evidenceNarrative)) {
    return 'Basis: calculated from linked estimate/rates';
  }
  return 'Basis: allowance only - no quote or source rate recorded';
}

function docxCoverPage(appraisal: DevelopmentAppraisal, option: NonNullable<ReturnType<typeof activeReportOption>>, projects: Project[], recommendation: ReturnType<typeof finalReportRecommendation>) {
  const generatedOn = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const linkedProject = linkedProjectName(appraisal, projects);
  return [
    docxParagraph('Final Appraisal Report', 'Title', { after: 80 }),
    docxParagraph(recommendation.shortLabel.toUpperCase(), 'Subtitle', { align: 'center', color: recommendation.tone === 'good' ? '166534' : recommendation.tone === 'watch' ? '92400E' : DOCX_NEGATIVE, before: 0, after: 80 }),
    docxParagraph(appraisal.name, 'Subtitle', { after: 260 }),
    docxHorizontalRule(),
    docxParagraph('Prepared for residual land value and profitability review.', 'BodyText', { color: DOCX_SLATE, after: 260 }),
    docxTable([
      ['Reference', appraisal.reference || '-'],
      ['Option', option.name],
      ['Linked project', linkedProject],
      ['Generated', generatedOn],
      ['Status', appraisal.status || '-'],
    ], [2600, 6760], { header: false }),
    docxParagraph('This report is generated from the live appraisal data and reflects the costs, sales values, abnormals, scenarios and supporting notes currently held in the QS Suite.', 'SmallText', { color: DOCX_MUTED, before: 320 }),
    docxPageBreak(),
  ].join('');
}

function docxExecutiveSummary(summary: string) {
  const lines = (summary || 'No executive summary has been generated yet.')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const headingPattern = /^(overview|sales prices? and basis|costs? and abnormals?|gdv improvement considerations|summary and recommendation|recommendation)$/i;
  return [
    docxParagraph('Executive Summary', 'Heading1'),
    ...lines.map((line) => headingPattern.test(line.replace(/:$/, ''))
      ? docxParagraph(line.replace(/:$/, ''), 'Heading2', { before: 120, after: 80 })
      : docxParagraph(line, 'BodyText')),
  ].join('');
}

function scenarioTableRows(scenario: NonNullable<ReturnType<typeof buildFinalReportData>['zeroLandScenario']>) {
  return [
    ['Item', 'Value', 'Notes'],
    ...scenario.rows.map((row) => [row.label, docxReportValue(row), row.note || '']),
  ];
}

async function createDocxBlob(documentXml: string) {
  const jsZipModule = await import('jszip');
  const zip = new jsZipModule.default();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);
  zip.folder('_rels')?.file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.folder('word')?.file('styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:color w:val="0F172A"/><w:sz w:val="20"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:color w:val="0F172A"/><w:sz w:val="20"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="480" w:after="140"/></w:pPr><w:rPr><w:b/><w:color w:val="0F172A"/><w:sz w:val="46"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:rPr><w:color w:val="334155"/><w:sz w:val="26"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="260" w:after="120"/><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="3" w:color="0F766E"/></w:pBdr></w:pPr><w:rPr><w:b/><w:color w:val="0F172A"/><w:sz w:val="30"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="160" w:after="80"/></w:pPr><w:rPr><w:b/><w:color w:val="1E3A8A"/><w:sz w:val="23"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="BodyText"><w:name w:val="Body Text"/><w:basedOn w:val="Normal"/><w:rPr><w:color w:val="1E293B"/><w:sz w:val="20"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="SmallText"><w:name w:val="Small Text"/><w:basedOn w:val="Normal"/><w:rPr><w:color w:val="64748B"/><w:sz w:val="17"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="CoverMeta"><w:name w:val="Cover Meta"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="0F766E"/><w:sz w:val="18"/></w:rPr></w:style>
  <w:style w:type="table" w:styleId="ProfessionalTable"><w:name w:val="Professional Table"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="CBD5E1"/><w:left w:val="single" w:sz="4" w:color="CBD5E1"/><w:bottom w:val="single" w:sz="4" w:color="CBD5E1"/><w:right w:val="single" w:sz="4" w:color="CBD5E1"/><w:insideH w:val="single" w:sz="4" w:color="E2E8F0"/><w:insideV w:val="single" w:sz="4" w:color="E2E8F0"/></w:tblBorders></w:tblPr></w:style>
</w:styles>`);
  zip.folder('word')?.file('document.xml', documentXml);
  const buffer = await zip.generateAsync({ type: 'arraybuffer' });
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

export async function exportAppraisalFinalReportToDocxBlob(appraisal: DevelopmentAppraisal, projects: Project[] = []) {
  const option = activeReportOption(appraisal);
  if (!option) throw new Error('No appraisal option is available for final report export.');
  const report = buildFinalReportData(option);
  const salesBasisNarrative = extractFinalReportNarrativeSection(option.finalReportExecutiveSummary, 'Sales prices and basis') || report.salesBasisNarrative;
  const gdvImprovementNarrative = extractFinalReportNarrativeSection(option.finalReportExecutiveSummary, 'GDV improvement considerations') || report.gdvImprovementNarrative;
  const recommendation = finalReportRecommendation(option);
  const recommendationText = summaryRecommendationText(option.finalReportExecutiveSummary || '', recommendation.basis);
  const totalUnits = report.houseTypeRows.reduce((total, row) => total + row.quantity, 0);
  const totalCost = report.currentScenario.rows.find((row) => row.label === 'Total cost')?.value || 0;
  const residualLandValue = report.currentScenario.landValue;
  const baseSummaryCards = report.baseSummaryRows.map((row) => ({
    label: row.label,
    value: docxReportValue(row),
    color: row.value < 0 ? DOCX_NEGATIVE : row.label === 'Residual Land Value' ? DOCX_TEAL : DOCX_NAVY,
  }));

  const sections: string[] = [
    docxCoverPage(appraisal, option, projects, recommendation),
    docxExecutiveSummary(option.finalReportExecutiveSummary || 'No executive summary has been generated yet.'),
    docxParagraph('Summary And Recommendation', 'Heading1'),
    docxRecommendationBanner(recommendation, recommendationText),
    docxPageBreak(),
    docxParagraph('GDV/GSV And Cost Summary', 'Heading1'),
    docxMetricCards(baseSummaryCards),
    docxParagraph('The appraisal summary below presents the residual land value as a primary output, alongside the total GDV/GSV, total cost, profit and profit return.', 'BodyText', { color: DOCX_SLATE }),
    docxTable([
      ['Metric', 'Value'],
      ...report.baseSummaryRows.map((row) => [
        row.label,
        docxReportValue(row),
      ]),
    ], [4700, 4660]),
    docxParagraph('GDV/GSV Breakdown', 'Heading2'),
    docxTable([
      ['Item', 'Units', 'Value'],
      ...report.gdvRows.map((row) => [row.title, formatDocxNumber(row.units), formatDocxMoney(row.gdv)]),
      [{ text: 'Indexed GDV/GSV', bold: true }, { text: formatDocxNumber(totalUnits), bold: true }, { text: formatDocxMoney(report.currentScenario.rows.find((row) => row.label === 'GDV')?.value || 0), bold: true }],
    ], [4600, 1800, 2960]),
    docxParagraph('Cost Breakdown', 'Heading2'),
    docxTable([
      ['Item', 'Value'],
      ...report.costSummaryRows.map((row) => [
        {
          text: row.title,
          bold: row.role === 'SUBTOTAL' || row.role === 'LAND' || row.role === 'TOTAL',
          color: row.amount < 0 ? DOCX_NEGATIVE : row.role === 'LAND' ? DOCX_TEAL : undefined,
        },
        {
          text: formatDocxMoney(row.amount),
          bold: row.role === 'SUBTOTAL' || row.role === 'LAND' || row.role === 'TOTAL',
          color: row.amount < 0 ? DOCX_NEGATIVE : row.role === 'LAND' ? DOCX_TEAL : undefined,
        },
      ]),
    ], [5600, 3760]),
  ];

  const scenarios = [report.zeroLandScenario, report.sellerScenario].filter(Boolean);
  if (scenarios.length > 0) {
    sections.push(docxParagraph('Adjustment Scenarios', 'Heading1'));
    scenarios.forEach((scenario) => {
      sections.push(docxParagraph(scenario!.title, 'Heading2'));
      sections.push(docxTable(scenarioTableRows(scenario!), [3300, 2600, 3460]));
    });
  }

  sections.push(
    docxPageBreak(),
    docxParagraph('Land Price Profitability Sensitivity', 'Heading1'),
    docxParagraph('The table below shows how profit changes as the land price moves between the base appraisal and the landowner expected receipt, or in 2% steps around the base land appraisal where no receipt has been entered.', 'BodyText', { color: DOCX_SLATE }),
    docxTable([
      ['Basis', 'Land price', 'Finance', 'Total cost', 'Profit', 'Profit/GDV', 'Movement'],
      ...report.landPriceSensitivityRows.map((row, index) => [
        row.label || `Increment ${index + 1}`,
        formatDocxMoney(row.landValue),
        formatDocxMoney(row.financeCost),
        formatDocxMoney(row.totalCost),
        formatDocxMoney(row.profit),
        formatPercent(row.profitOnGdvPercent),
        formatDocxMoney(row.profitMovement),
      ]),
    ], [1300, 1350, 1050, 1450, 1350, 850, 2010]),
    docxPageBreak(),
    docxParagraph('Sales Prices And Basis', 'Heading1'),
    docxParagraph(salesBasisNarrative, 'BodyText'),
    docxTable([
      ['House type', 'Qty', 'Base sale', 'Index uplift', 'Indexed sale', 'Indexed £/ft2', 'Indexed GDV'],
      ...report.houseTypeRows.map((row) => [
        row.houseTypeName,
        formatDocxNumber(row.quantity),
        formatDocxMoney(row.saleValuePerUnit),
        formatDocxMoney(row.indexUpliftPerUnit),
        formatDocxMoney(row.indexedSaleValuePerUnit),
        formatDocxRate(row.indexedSaleRateFt2),
        formatDocxMoney(row.indexedGdv),
      ]),
      [{ text: 'Site average', bold: true }, '', { text: formatDocxMoney(report.baseSalesGdv), bold: true }, { text: formatDocxMoney(report.salesIndexUplift), bold: true }, { text: formatDocxMoney(report.indexedSalesGdv), bold: true }, { text: formatDocxRate(report.averageSaleRateFt2), bold: true }, { text: formatDocxMoney(report.indexedSalesGdv), bold: true }],
    ], [2100, 700, 1300, 1300, 1400, 1250, 1310]),
    docxPageBreak(),
    docxParagraph('GDV Improvement Considerations', 'Heading1', { underline: true }),
    docxParagraph(gdvImprovementNarrative, 'BodyText'),
    docxPageBreak(),
    docxParagraph('Indexed Sales Sensitivity', 'Heading1'),
    docxParagraph('The sensitivity table shows the effect of changing the average sales rate in £5/ft2 steps around the indexed appraisal basis, including any sales index uplift.', 'BodyText', { color: DOCX_SLATE }),
    docxTable([
      ['Movement', 'Average £/ft2', 'GDV', 'Residual land value', 'Profit', 'Profit/GDV'],
      ...report.sensitivityRows.map((row) => [
        `${row.deltaRateFt2 > 0 ? '+' : ''}${row.deltaRateFt2}/ft2`,
        formatDocxRate(row.averageRateFt2),
        formatDocxMoney(row.gdv),
        formatDocxMoney(row.landValue),
        formatDocxMoney(row.profit),
        formatPercent(row.profitOnGdvPercent),
      ]),
    ], [1200, 1750, 1700, 2050, 1600, 1060]),
    docxPageBreak(),
    docxParagraph('Site Costs And Abnormals', 'Heading1'),
    docxParagraph(report.siteCostRegisterSummary, 'BodyText'),
    docxTable([['Cost heading', 'Base allowance', 'Additional elements', 'Combined total'], ...report.siteCostSummaryRows.map(row => [row.title, formatDocxMoney(row.base), formatDocxMoney(row.additions), formatDocxMoney(row.total)])], [2700, 2200, 2260, 2200]),
    docxParagraph(`Land-offer schedule: disclosed subset already counted ${formatDocxMoney(report.landOfferDisclosureTotal)}.`, 'BodyText'),
    ...report.landOfferRows.map(row => docxParagraph(`${row.title}: ${row.assessmentStatus}; ${formatDocxMoney(row.amount)}. ${row.offerQualification || 'Qualification not recorded.'}`, 'BodyText')),
  );

  if (report.notAllowedAbnormalRows.length) {
    sections.push(docxParagraph('Abnormal Items Not Allowed For In The Land Offer', 'Heading2'));
    sections.push(docxParagraph('The following excluded survey reports, conditional follow-on works and unpriced Abnormals elements do not contribute to appraisal costs. Work expressly allowed elsewhere remains included.', 'BodyText'));
    sections.push(docxTable([['Type', 'Not allowed for', 'Offer qualification'], ...report.notAllowedAbnormalRows.map(row => [row.kind === 'REPORT' ? 'Report' : row.kind === 'WORK' ? 'Conditional work' : 'Abnormal', row.title, row.qualification])], [1200, 3900, 4260]));
  }

  if (report.engineeringScope) {
    sections.push(docxPageBreak(),docxParagraph('Engineer’s Scope And Pricing','Heading1'),docxParagraph(report.engineeringScope.notes,'BodyText'),docxTable([['Ref','Scope and decision','Destination','Pricing mechanism','Allowance'],...report.engineeringScope.rows.map(row=>[row.reference,`${row.title}\n${row.status}\n${row.scope}\n${row.note}\n${row.source}`,row.destination,`${row.mechanism}\nScope allowance ${formatDocxMoney(row.scopeAllowance)}`,formatDocxMoney(row.amount)])],[800,3300,1500,2200,1560]));
  }

  if (report.abnormalConstraintsNarrative) {
    sections.push(docxParagraph('Constraints Report Summary', 'Heading2'));
    sections.push(docxParagraph(report.abnormalConstraintsNarrative, 'BodyText'));
  }

  if (report.abnormalRows.length === 0) {
    if (!report.abnormalConstraintsNarrative) {
    sections.push(docxParagraph('No additional site elements have been added yet.', 'BodyText'));
    }
  } else {
    sections.push(docxTable([
      ['Site element', 'Formal quotes', 'Amount'],
      ...report.abnormalRows.map((row) => [
        row.title,
        row.quotationCount.toLocaleString(),
        formatDocxMoney(row.amount),
      ]),
    ], [5700, 1600, 2060]));
    report.abnormalRows.forEach((row) => {
      sections.push(docxParagraph(row.title, 'Heading2'));
      sections.push(docxTable([
        ['Amount', 'Formal quotes recorded'],
        [formatDocxMoney(row.amount), row.quotationCount.toLocaleString()],
      ], [4680, 4680], { compact: true }));
      sections.push(docxParagraph(docxAbnormalBasis(row), 'SmallText', { bold: true, color: DOCX_TEAL, keepNext: true, shading: 'ECFEFF' }));
      sections.push(docxParagraph(row.evidenceNarrative || 'No evidence narrative has been generated for this site element yet.', 'BodyText'));
    });
  }
  sections.push(
    docxPageBreak(),
    docxParagraph('RICS House Builders Profit Margins', 'Heading1'),
    docxParagraph('The current appraisal is shown unchanged for comparison. Separate RICS scenarios use a fixed 5.0% overhead allowance and profit on GDV of 12.5% for greenfield, 15.0% for normal risk, 17.5% for moderate risk and 20.0% for high risk.', 'BodyText', { color: DOCX_SLATE }),
    docxTable([
      ['Risk case', 'O&P', 'Overheads', 'Profit %', 'Profit £', 'Residual land value', 'Justification'],
      ...report.profitMarginRows.map((row) => [
        row.label,
        formatPercent(row.operatingAndProfitPercent),
        formatPercent(row.overheadPercent),
        formatPercent(row.profitOnGdvPercent),
        formatDocxMoney(row.profit),
        formatDocxMoney(row.landValue),
        row.justification,
      ]),
    ], [1200, 750, 900, 850, 1250, 1500, 3050]),
  );
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${sections.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/></w:sectPr></w:body>
</w:document>`;
  return {
    blob: await createDocxBlob(documentXml),
    filename: `${safeFilename(appraisal.name)}-final-report.docx`,
  };
}

function cleanPreliminaryAssessmentText(value: string | undefined) {
  const text = (value || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
    .replace(/[\uFFFD]/g, ' ')
    .replace(/[^\p{L}\p{N}\p{P}\p{Z}\r\n\u00A3]/gu, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!text || /(?:[A-Za-z0-9]{1,2}\s*){40,}/.test(text) && text.length > 5000) return '';
  return text;
}

/** Export a document-led commercial appraisal before a cost or revenue model has been started. */
export async function exportCommercialPreliminaryAssessmentToPdf(
  appraisal: DevelopmentAppraisal,
  projects: Project[] = [],
  exportName?: string,
) {
  const { jsPDF } = await loadPdfRuntime();
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const margin = 16;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - (margin * 2);
  const option = appraisal.options.find((entry) => entry.id === appraisal.selectedOptionId) || appraisal.options[0];
  const briefs = option?.commercialInitialAssessmentBriefs || [];
  let y = margin;

  const addPage = () => {
    doc.addPage();
    y = margin;
  };
  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - margin) addPage();
  };
  const heading = (title: string) => {
    ensureSpace(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin, y);
    doc.setDrawColor(14, 116, 144);
    doc.setLineWidth(0.45);
    doc.line(margin, y + 2, pageWidth - margin, y + 2);
    y += 8;
  };
  const paragraph = (value: string, fontSize = 8.5) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(value, contentWidth) as string[];
    lines.forEach((line) => {
      ensureSpace(5);
      doc.text(line, margin, y);
      y += 4.2;
    });
    y += 2.5;
  };

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 50, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text('Preliminary Commercial Assessment', margin, 21);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(appraisal.name, margin, 30);
  doc.text(`Reference: ${appraisal.reference || 'Not assigned'}  |  Date: ${appraisal.appraisalDate || 'Not recorded'}`, margin, 37);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(14, 116, 144);
  doc.text('PRELIMINARY - AWAITING FURTHER INFORMATION', margin, 44);
  y = 62;

  heading('Assessment status');
  paragraph('This appraisal has been retained at the preliminary assessment stage. No commercial template, development cost plan, revenue model, lifecycle forecast or exit valuation has been applied. The assessment should remain under review until the required scope, commercial, cost and revenue information is available.');

  heading('Site and appointment details');
  const siteRows = [
    `Location: ${option?.commercialLocation || appraisal.site || 'Not recorded'}`,
    `Land value: ${option ? formatCompactMoney(option.knownLandValue || 0) : 'Not recorded'}`,
    `Linked project: ${linkedProjectName(appraisal, projects)}`,
    `Preliminary assessment documents: ${briefs.length || 0}`,
  ];
  siteRows.forEach((row) => paragraph(row, 9));

  heading('Information currently available');
  if (!briefs.length) {
    paragraph('No preliminary assessment document has been recorded. Upload the assessment PDF before issuing this report.');
  } else {
    briefs.forEach((brief, index) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      ensureSpace(7);
      doc.text(`${index + 1}. ${brief.fileName}`, margin, y);
      y += 5;
      const note = brief.notes?.trim();
      if (note) paragraph(note);
      paragraph(brief.extractionStatus === 'EXTRACTED'
        ? 'The document has been retained as the current preliminary assessment evidence and its readable content is reproduced in the appendix.'
        : 'The document has been retained as preliminary assessment evidence. Its readable text could not be extracted reliably, so the original PDF should be reviewed alongside this report.');
    });
  }

  addPage();
  heading('Outstanding information and next assessment stage');
  paragraph('Before a detailed commercial appraisal is prepared, confirm the proposed uses, site capacity, accommodation, access and servicing requirements, development and external works scope, operating model, revenue basis, funding assumptions, lifecycle obligations and exit strategy. Once these are available, the preliminary assessment can be progressed into the detailed commercial model without replacing the evidence recorded here.');

  const readableBriefs = briefs
    .map((brief) => ({ brief, text: cleanPreliminaryAssessmentText(brief.extractedText) }))
    .filter((entry) => entry.text);
  if (readableBriefs.length) {
    readableBriefs.forEach(({ brief, text }) => {
      addPage();
      heading(`Appendix: ${brief.fileName}`);
      paragraph('Readable document content reproduced for the preliminary assessment record.', 8);
      text.split(/\n\s*\n/).map((entry) => entry.trim()).filter(Boolean).forEach((entry) => paragraph(entry, 8));
    });
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`${appraisal.name} | Preliminary commercial assessment | Page ${page} of ${totalPages}`, margin, pageHeight - 8);
  }

  return {
    blob: doc.output('blob'),
    filename: `${safeFilename(exportName || `${appraisal.name}-preliminary-commercial-assessment`)}.pdf`,
  };
}

async function downloadBlob(blob: Blob, filename: string, filters: Array<{ name: string; extensions: string[] }>) {
  await assertExportArtifact(blob, filename);
  const tauri = typeof window !== 'undefined' ? (window as unknown as { __TAURI__?: unknown }).__TAURI__ : undefined;
  if (tauri) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      const path = await save({ defaultPath: filename, filters });
      if (!path) return false;
      await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
      return true;
    } catch (error) {
      console.warn('Tauri appraisal export save failed, falling back to browser download', error);
    }
  }

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
  return true;
}

/**
 * Tauri's WebView can reject fetches to a data: URL under the production CSP.
 * Evidence is already held as a base64 data URL, so decode it directly instead
 * of treating it as a network request before handing it to the save dialog.
 */
function evidenceDataUrlToBlob(dataUrl: string, fallbackMimeType: string) {
  const mimeType = dataUrl.match(/^data:([^;,]+)/i)?.[1] || fallbackMimeType || 'application/octet-stream';
  return new Blob([dataUrlToArrayBuffer(dataUrl)], { type: mimeType });
}

export async function downloadAppraisalEvidenceAttachment(report: AppraisalPricingReport, exportName?: string) {
  const dataUrl = await resolveAppraisalEvidenceDataUrl(report);
  if (!dataUrl) throw new Error('The uploaded evidence is missing. Re-upload it to relink the appraisal evidence.');
  const blob = evidenceDataUrlToBlob(dataUrl, report.mimeType);
  const requestedName = exportName?.trim() || report.fileName;
  const extension = requestedName.split('.').pop()?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
  return downloadBlob(blob, requestedName, [{ name: 'Evidence file', extensions: [extension] }]);
}

/** Save an original uploaded PDF through the desktop save dialog rather than relying on a data URL link. */
export async function downloadAppraisalPdfAttachment(report: AppraisalPricingReport, exportName?: string) {
  const dataUrl = await resolveAppraisalEvidenceDataUrl(report);
  if (!dataUrl) throw new Error('The uploaded PDF is missing. Re-upload it to relink the appraisal evidence.');
  const blob = evidenceDataUrlToBlob(dataUrl, report.mimeType);
  if (blob.type && blob.type !== 'application/pdf') {
    throw new Error('Only uploaded PDF files can be exported as the original report.');
  }
  const requestedName = exportName?.trim() || report.fileName;
  const filename = requestedName.toLowerCase().endsWith('.pdf')
    ? requestedName
    : `${requestedName}.pdf`;
  return downloadBlob(blob, filename, [{ name: 'PDF', extensions: ['pdf'] }]);
}

/** Standalone schedule of excluded surveys and unpriced abnormal elements. */
export async function exportAppraisalLandOfferExclusionsToPdf(option: DevelopmentAppraisal['options'][number], appraisalName: string) {
  const rows = buildFinalReportData(option).notAllowedAbnormalRows;
  if (!rows.length) throw new Error('No excluded surveys or unpriced Abnormals elements are recorded.');
  const { jsPDF, autoTable } = await loadPdfRuntime();
  const doc = new jsPDF({ format: 'a4', orientation: 'landscape', unit: 'mm' });
  const margin = 14;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
  doc.text('Abnormal items not allowed for in the land offer', margin, 20);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(`${appraisalName} · ${option.name} · ${new Date().toLocaleDateString('en-GB')}`, margin, 27);
  doc.text('Excluded surveys, conditional work and unpriced Abnormals elements do not contribute to appraisal costs.', margin, 33);
  autoTable(doc, { startY: 40, head: [['Type', 'Not allowed for', 'Land-offer qualification']],
    body: rows.map(row => [row.kind === 'REPORT' ? 'Survey / report' : row.kind === 'WORK' ? 'Conditional work' : 'Unpriced abnormal', row.title, row.qualification]),
    margin: { left: margin, right: margin }, styles: { fontSize: 8 }, rowPageBreak: 'avoid',
    headStyles: { fillColor: [4, 120, 87], textColor: [255, 255, 255] } });
  return { blob: doc.output('blob'), filename: `${safeFilename(appraisalName)}-${safeFilename(option.name)}-land-offer-exclusions.pdf` };
}

export async function downloadAppraisalLandOfferExclusionsPdf(option: DevelopmentAppraisal['options'][number], appraisalName: string) {
  const result = await exportAppraisalLandOfferExclusionsToPdf(option, appraisalName);
  return downloadBlob(result.blob, result.filename, [{ name: 'PDF', extensions: ['pdf'] }]);
}

export async function downloadAppraisalDecisionPackPdf(appraisal: DevelopmentAppraisal, projects: Project[] = []) {
  const startedAt = performance.now();
  const result = await exportAppraisalDecisionPackToPdf(appraisal, projects);
  const saved = await downloadBlob(result.blob, result.filename, [{ name: 'PDF', extensions: ['pdf'] }]);
  if (saved) {
    recordOperationLogEntry({
      kind: 'export',
      status: 'success',
      subject: 'Appraisal PDF decision pack',
      message: `Exported appraisal decision pack for ${appraisal.name}.`,
      projectId: appraisal.projectId,
      projectName: projects.find((project) => project.id === appraisal.projectId)?.name,
      path: result.filename,
      counts: { files: 1 },
      durationMs: Math.round(performance.now() - startedAt),
    });
  }
  return saved;
}

export async function downloadCommercialPreliminaryAssessmentPdf(appraisal: DevelopmentAppraisal, projects: Project[] = [], exportName?: string) {
  const startedAt = performance.now();
  const result = await exportCommercialPreliminaryAssessmentToPdf(appraisal, projects, exportName);
  const saved = await downloadBlob(result.blob, result.filename, [{ name: 'PDF', extensions: ['pdf'] }]);
  if (saved) {
    recordOperationLogEntry({
      kind: 'export',
      status: 'success',
      subject: 'Commercial preliminary assessment PDF',
      message: `Exported preliminary commercial assessment for ${appraisal.name}.`,
      projectId: appraisal.projectId,
      projectName: projects.find((project) => project.id === appraisal.projectId)?.name,
      path: result.filename,
      counts: { files: 1 },
      durationMs: Math.round(performance.now() - startedAt),
    });
  }
  return saved;
}

export async function downloadAppraisalRevenueCostSummaryPdf(appraisal: DevelopmentAppraisal, projects: Project[] = []) {
  const startedAt = performance.now();
  const result = await exportAppraisalRevenueCostSummaryToPdf(appraisal, projects);
  const saved = await downloadBlob(result.blob, result.filename, [{ name: 'PDF', extensions: ['pdf'] }]);
  if (saved) {
    recordOperationLogEntry({
      kind: 'export',
      status: 'success',
      subject: 'Appraisal revenue and cost summary',
      message: `Exported revenue and cost summary for ${appraisal.name}.`,
      projectId: appraisal.projectId,
      projectName: projects.find((project) => project.id === appraisal.projectId)?.name,
      path: result.filename,
      counts: { files: 1 },
      durationMs: Math.round(performance.now() - startedAt),
    });
  }
  return saved;
}

export async function downloadAppraisalLandownerViabilityPdf(
  appraisal: DevelopmentAppraisal,
  projects: Project[] = [],
  reportLandValue = 0,
) {
  const startedAt = performance.now();
  const result = await exportAppraisalLandownerViabilityToPdf(appraisal, projects, reportLandValue);
  const saved = await downloadBlob(result.blob, result.filename, [{ name: 'PDF', extensions: ['pdf'] }]);
  if (saved) {
    recordOperationLogEntry({
      kind: 'export',
      status: 'success',
      subject: 'Landowner viability PDF',
      message: `Exported landowner viability PDF for ${appraisal.name} at ${formatCompactMoney(Math.max(0, reportLandValue))} land cost.`,
      projectId: appraisal.projectId,
      projectName: projects.find((project) => project.id === appraisal.projectId)?.name,
      path: result.filename,
      counts: { files: 1 },
      durationMs: Math.round(performance.now() - startedAt),
    });
  }
  return saved;
}

export async function downloadAppraisalRevenueCostSummaryExcel(appraisal: DevelopmentAppraisal, projects: Project[] = []) {
  const startedAt = performance.now();
  const result = await exportAppraisalRevenueCostSummaryToExcelBlob(appraisal, projects);
  const saved = await downloadBlob(result.blob, result.filename, [{ name: 'Excel Workbook', extensions: ['xlsx'] }]);
  if (saved) {
    recordOperationLogEntry({
      kind: 'export',
      status: 'success',
      subject: 'Appraisal revenue and cost summary Excel',
      message: `Exported revenue and cost summary workbook for ${appraisal.name}.`,
      projectId: appraisal.projectId,
      projectName: projects.find((project) => project.id === appraisal.projectId)?.name,
      path: result.filename,
      counts: { files: 1 },
      durationMs: Math.round(performance.now() - startedAt),
    });
  }
  return saved;
}

export async function downloadAppraisalHouseTypeScheduleExcel(appraisal: DevelopmentAppraisal, projects: Project[] = []) {
  const startedAt = performance.now();
  const result = await exportAppraisalHouseTypeScheduleToExcelBlob(appraisal);
  const saved = await downloadBlob(result.blob, result.filename, [{ name: 'Excel Workbook', extensions: ['xlsx'] }]);
  if (saved) {
    recordOperationLogEntry({
      kind: 'export',
      status: 'success',
      subject: 'Appraisal house type schedule Excel',
      message: `Exported house type schedule for ${appraisal.name}.`,
      projectId: appraisal.projectId,
      projectName: projects.find((project) => project.id === appraisal.projectId)?.name,
      path: result.filename,
      counts: { files: 1 },
      durationMs: Math.round(performance.now() - startedAt),
    });
  }
  return saved;
}

export async function downloadAppraisalDecisionPackExcel(appraisal: DevelopmentAppraisal, projects: Project[] = []) {
  const startedAt = performance.now();
  const result = await exportAppraisalDecisionPackToExcelBlob(appraisal, projects);
  const saved = await downloadBlob(result.blob, result.filename, [{ name: 'Excel Workbook', extensions: ['xlsx'] }]);
  if (saved) {
    recordOperationLogEntry({
      kind: 'export',
      status: 'success',
      subject: 'Appraisal Excel decision pack',
      message: `Exported appraisal workbook for ${appraisal.name}.`,
      projectId: appraisal.projectId,
      projectName: projects.find((project) => project.id === appraisal.projectId)?.name,
      path: result.filename,
      counts: { files: 1 },
      durationMs: Math.round(performance.now() - startedAt),
    });
  }
  return saved;
}

export async function downloadApprovedReportIssuePdf(issue: AppraisalApprovedReportIssue, projects: Project[] = []) {
  const appraisal = appraisalFromApprovedReportIssue(issue);
  const result = await exportAppraisalDecisionPackToPdf(appraisal, projects, issueControl(issue));
  const fileName = issue.outputs.find((output) => output.format === 'PDF')?.fileName || result.filename;
  const saved = await downloadBlob(result.blob, fileName, [{ name: 'Approved issue PDF', extensions: ['pdf'] }]);
  if (saved) recordOperationLogEntry({
    kind: 'export', status: 'success', subject: 'Approved commercial report issue PDF',
    message: `Exported locked issue ${issue.issueNumber} for ${appraisal.name}; source SHA-256 ${issue.sourceHash}.`,
    projectId: appraisal.projectId, projectName: projects.find((project) => project.id === appraisal.projectId)?.name, path: fileName, counts: { files: 1 },
  });
  return saved;
}

export async function downloadApprovedReportIssueExcel(issue: AppraisalApprovedReportIssue, projects: Project[] = []) {
  const appraisal = appraisalFromApprovedReportIssue(issue);
  const result = await exportAppraisalDecisionPackToExcelBlob(appraisal, projects, issueControl(issue));
  const fileName = issue.outputs.find((output) => output.format === 'EXCEL')?.fileName || result.filename;
  const saved = await downloadBlob(result.blob, fileName, [{ name: 'Approved issue Excel workbook', extensions: ['xlsx'] }]);
  if (saved) recordOperationLogEntry({
    kind: 'export', status: 'success', subject: 'Approved commercial report issue Excel',
    message: `Exported locked issue ${issue.issueNumber} for ${appraisal.name}; source SHA-256 ${issue.sourceHash}.`,
    projectId: appraisal.projectId, projectName: projects.find((project) => project.id === appraisal.projectId)?.name, path: fileName, counts: { files: 1 },
  });
  return saved;
}

export async function downloadAppraisalFinalReportDocx(appraisal: DevelopmentAppraisal, projects: Project[] = []) {
  const startedAt = performance.now();
  const result = await exportAppraisalFinalReportToDocxBlob(appraisal, projects);
  const saved = await downloadBlob(result.blob, result.filename, [{ name: 'Word Document', extensions: ['docx'] }]);
  if (saved) {
    recordOperationLogEntry({
      kind: 'export',
      status: 'success',
      subject: 'Appraisal Word final report',
      message: `Exported appraisal Word final report for ${appraisal.name}.`,
      projectId: appraisal.projectId,
      projectName: projects.find((project) => project.id === appraisal.projectId)?.name,
      path: result.filename,
      counts: { files: 1 },
      durationMs: Math.round(performance.now() - startedAt),
    });
  }
  return saved;
}
