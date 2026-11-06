import type * as ExcelJS from 'exceljs';
import type { CostPlan, Project } from '../types';
import { getContingencyModeLabel, getCostPlanSourceLabel, getDrawingBasisLabel, summariseCostPlan } from './costPlan';
import { createExcelWorkbook } from './excelJsRuntime';
import { recordOperationLogEntry } from './operationLog';

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

async function createWorkbook() {
  return createExcelWorkbook();
}

async function downloadExcelWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const startedAt = performance.now();
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
  recordOperationLogEntry({
    kind: 'export',
    status: 'success',
    subject: 'Cost plan Excel export',
    message: `Downloaded ${filename}.`,
    path: filename,
    counts: { files: 1 },
    durationMs: Math.round(performance.now() - startedAt),
  });
}

export async function exportCostPlanToExcel(project: Project, plan: CostPlan) {
  const workbook = await createWorkbook();

  const summary = summariseCostPlan(plan);
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Item', key: 'item', width: 28 },
    { header: 'Value', key: 'value', width: 20 },
  ];
  summarySheet.addRow({ item: 'Project', value: project.name });
  summarySheet.addRow({ item: 'Cost plan source', value: getCostPlanSourceLabel(plan.source) });
  summarySheet.addRow({ item: 'Drawing basis', value: getDrawingBasisLabel(plan.drawingBasis) });
  summarySheet.addRow({ item: 'Contingency display', value: getContingencyModeLabel(plan.contingencyMode) });
  summarySheet.addRow({ item: 'Contingency %', value: plan.contingencyPercentage / 100 });
  summarySheet.addRow({});
  summarySheet.addRow({ item: 'Base total', value: summary.baseTotal });
  summarySheet.addRow({ item: 'Contingency total', value: summary.contingencyTotal });
  summarySheet.addRow({ item: 'Cost plan total', value: summary.total });
  summarySheet.getColumn('value').numFmt = '"£"#,##0.00';
  summarySheet.getCell('B5').numFmt = '0.0%';

  const sheet = workbook.addWorksheet('Cost Plan');
  sheet.columns = [
    { header: 'Cost plan line', key: 'title', width: 38 },
    { header: 'Source', key: 'source', width: 14 },
    { header: 'Notes', key: 'notes', width: 42 },
    { header: 'Base value (£)', key: 'baseValue', width: 18 },
    { header: 'Contingency (£)', key: 'contingencyValue', width: 18 },
    { header: 'Total (£)', key: 'totalValue', width: 18 },
  ];
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

  plan.lines.forEach((line) => {
    sheet.addRow({
      title: line.title,
      source: line.source,
      notes: line.notes || '',
      baseValue: line.baseValue,
      contingencyValue: line.contingencyValue,
      totalValue: line.totalValue,
    });
  });

  sheet.getColumn('baseValue').numFmt = '"£"#,##0.00';
  sheet.getColumn('contingencyValue').numFmt = '"£"#,##0.00';
  sheet.getColumn('totalValue').numFmt = '"£"#,##0.00';

  const totalRow = sheet.addRow({
    title: 'Total cost plan value',
    totalValue: summary.total,
  });
  totalRow.font = { bold: true, size: 12 };
  totalRow.getCell('totalValue').numFmt = '"£"#,##0.00';

  await downloadExcelWorkbook(workbook, `${project.name.replace(/\s+/g, '_')}-cost-plan.xlsx`);
}

export async function exportCostPlanToPdf(project: Project, plan: CostPlan): Promise<{ blob: Blob; filename: string }> {
  const { jsPDF, autoTable } = await loadPdfRuntime();
  const summary = summariseCostPlan(plan);
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(project.name, margin, y);
  y += 8;

  doc.setFontSize(11);
  doc.text('Cost plan', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Source: ${getCostPlanSourceLabel(plan.source)} | Drawing basis: ${getDrawingBasisLabel(plan.drawingBasis)} | Contingency: ${plan.contingencyPercentage.toFixed(1)}% (${getContingencyModeLabel(plan.contingencyMode)})`, margin, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [['Cost plan line', 'Source', 'Base', 'Contingency', 'Total']],
    body: plan.lines.map((line) => [
      line.title,
      line.source,
      `£${line.baseValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `£${line.contingencyValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `£${line.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    ]),
    margin: { left: margin, right: margin },
    headStyles: { fillColor: [30, 41, 59] },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 20 },
      2: { halign: 'right', cellWidth: 28 },
      3: { halign: 'right', cellWidth: 28 },
      4: { halign: 'right', cellWidth: 28 },
    },
  });

  const tableMeta = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  y = (tableMeta?.finalY ?? y) + 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Base total: £${summary.baseTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin, y);
  y += 6;
  doc.text(`Contingency total: £${summary.contingencyTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin, y);
  y += 6;
  doc.setFontSize(12);
  doc.text(`Cost plan total: £${summary.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin, y);

  return {
    blob: doc.output('blob'),
    filename: `${project.name.replace(/\s+/g, '_')}-cost-plan.pdf`,
  };
}
