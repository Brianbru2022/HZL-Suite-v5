import type * as ExcelJS from 'exceljs';
import type { ProjectSummaryData } from './projectSummary';
import type { Project } from '../types';
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

async function saveBlobToFile(blob: Blob, filename: string, filters: Array<{ name: string; extensions: string[] }>) {
  const tauri = typeof window !== 'undefined' ? (window as unknown as { __TAURI__?: unknown }).__TAURI__ : undefined;
  if (tauri) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      const path = await save({
        defaultPath: filename,
        filters,
      });
      if (!path) return false;
      const buf = await blob.arrayBuffer();
      await writeFile(path, new Uint8Array(buf));
      return true;
    } catch (error) {
      console.warn('Tauri save failed, falling back to browser download', error);
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

async function downloadExcelWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const startedAt = performance.now();
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const saved = await saveBlobToFile(blob, filename, [{ name: 'Excel workbook', extensions: ['xlsx'] }]);
  recordOperationLogEntry({
    kind: 'export',
    status: saved ? 'success' : 'cancelled',
    subject: 'Project summary Excel export',
    message: saved ? `Saved or downloaded ${filename}.` : `Project summary Excel export for ${filename} was cancelled before saving.`,
    path: filename,
    counts: { files: saved ? 1 : 0 },
    durationMs: Math.round(performance.now() - startedAt),
  });
}

function formatMoney(value: number) {
  return `£${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function exportProjectSummaryToExcel(project: Project, summary: ProjectSummaryData) {
  const workbook = await createWorkbook();

  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Item', key: 'item', width: 30 },
    { header: 'Value', key: 'value', width: 22 },
  ];
  summarySheet.addRow({ item: 'Project', value: project.name });
  summarySheet.addRow({ item: 'Summary mode', value: summary.mode === 'BILLS' ? 'Bills' : 'Bills + Sections' });
  summarySheet.addRow({ item: 'House type bills', value: summary.houseTypeCount });
  summarySheet.addRow({ item: 'Base total', value: summary.baseTotal });
  summarySheet.addRow({ item: 'Summary total', value: summary.summaryTotal });
  summarySheet.getColumn('value').numFmt = '"£"#,##0.00';
  summarySheet.getCell('B3').numFmt = '0';

  const detailSheet = workbook.addWorksheet('Project Summary');
  detailSheet.columns = [
    { header: 'Bill', key: 'bill', width: 28 },
    { header: 'Section', key: 'section', width: 28 },
    { header: 'Type', key: 'type', width: 16 },
    { header: 'Units', key: 'units', width: 12 },
    { header: 'Base value (£)', key: 'baseValue', width: 18 },
    { header: 'Summary value (£)', key: 'summaryValue', width: 18 },
  ];

  const headerRow = detailSheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

  summary.rows.forEach((row) => {
    detailSheet.addRow({
      bill: row.billName,
      section: row.sectionName || '',
      type: row.billType === 'HOUSE_TYPE' ? 'House type' : 'Standard',
      units: row.billType === 'HOUSE_TYPE' ? row.unitCount : '',
      baseValue: row.baseValue,
      summaryValue: row.summaryValue,
    });
  });

  detailSheet.getColumn('baseValue').numFmt = '"£"#,##0.00';
  detailSheet.getColumn('summaryValue').numFmt = '"£"#,##0.00';

  const totalRow = detailSheet.addRow({
    bill: 'TOTAL',
    summaryValue: summary.summaryTotal,
  });
  totalRow.font = { bold: true, size: 12 };
  totalRow.getCell('summaryValue').numFmt = '"£"#,##0.00';

  await downloadExcelWorkbook(workbook, `${project.name.replace(/\s+/g, '_')}-project-summary.xlsx`);
}

export async function exportProjectSummaryToPdf(project: Project, summary: ProjectSummaryData): Promise<{ blob: Blob; filename: string }> {
  const { jsPDF, autoTable } = await loadPdfRuntime();
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const margin = 18;
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(project.name, margin, y);
  y += 8;
  doc.setFontSize(11);
  doc.text('Project Summary', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Mode: ${summary.mode === 'BILLS' ? 'Bills' : 'Bills + Sections'} | House type bills: ${summary.houseTypeCount}`, margin, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [['Bill', 'Section', 'Type', 'Units', 'Base value', 'Summary value']],
    body: summary.rows.map((row) => [
      row.billName,
      row.sectionName || '',
      row.billType === 'HOUSE_TYPE' ? 'House type' : 'Standard',
      row.billType === 'HOUSE_TYPE' ? String(row.unitCount) : '',
      formatMoney(row.baseValue),
      formatMoney(row.summaryValue),
    ]),
    margin: { left: margin, right: margin },
    headStyles: { fillColor: [30, 41, 59] },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 42 },
      2: { cellWidth: 24 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'right', cellWidth: 28 },
    },
  });

  const tableMeta = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  y = (tableMeta?.finalY ?? y) + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Base total: ${formatMoney(summary.baseTotal)}`, margin, y);
  y += 6;
  doc.text(`Summary total: ${formatMoney(summary.summaryTotal)}`, margin, y);

  return {
    blob: doc.output('blob'),
    filename: `${project.name.replace(/\s+/g, '_')}-project-summary.pdf`,
  };
}

export async function saveProjectSummaryPdf(blob: Blob, filename: string) {
  const startedAt = performance.now();
  const saved = await saveBlobToFile(blob, filename, [{ name: 'PDF', extensions: ['pdf'] }]);
  recordOperationLogEntry({
    kind: 'export',
    status: saved ? 'success' : 'cancelled',
    subject: 'Project summary PDF export',
    message: saved ? `Saved or downloaded ${filename}.` : `Project summary PDF export for ${filename} was cancelled before saving.`,
    path: filename,
    counts: { files: saved ? 1 : 0 },
    durationMs: Math.round(performance.now() - startedAt),
  });
}
