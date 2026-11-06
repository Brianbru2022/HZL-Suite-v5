
import type * as ExcelJS from 'exceljs';
import { Project, TradePackage, BoQBill, BoQSection, BoQItem, TenderAwardRecord } from '../types';
import { getSectionItems, safeAdd, safeMul } from './calculations';
import { createExcelWorkbook } from './excelJsRuntime';
import { recordOperationLogEntry } from './operationLog';
import { richTextToExcelValue, stripRichText } from './richText';

const CURRENCY_NUM_FMT = '"£"#,##0.00';
const COST_ITEM_TYPES = new Set<BoQItem['type']>(['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM']);
const CONTEXT_ITEM_TYPES = new Set<BoQItem['type']>(['GENERAL_HEADING', 'MAJOR_HEADING', 'SUB_SECTION', 'MINOR_HEADING', 'COMMENT', 'SUB_COMMENT']);

function getQuantityDecimals(item: Pick<BoQItem, 'quantityDecimals'>) {
  const decimals = Number(item.quantityDecimals);
  return Number.isFinite(decimals) ? Math.max(0, Math.min(6, Math.trunc(decimals))) : 0;
}

function getQuantityNumFmt(item: Pick<BoQItem, 'quantityDecimals'>) {
  const decimals = getQuantityDecimals(item);
  return decimals > 0 ? `#,##0.${'0'.repeat(decimals)}` : '#,##0';
}

function formatCurrencyForWidth(value: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getCellTextForWidth(cell: ExcelJS.Cell, options?: { currency?: boolean }) {
  const value = cell.value;
  const recordValue = value && typeof value === 'object' ? value as unknown as Record<string, unknown> : null;
  const measuredValue = recordValue && 'result' in recordValue ? recordValue.result : value;

  if (typeof measuredValue === 'number') {
    return options?.currency ? formatCurrencyForWidth(measuredValue) : String(measuredValue);
  }
  if (measuredValue instanceof Date) return measuredValue.toLocaleDateString();
  if (measuredValue && typeof measuredValue === 'object') {
    const measuredRecord = measuredValue as Record<string, unknown>;
    if (Array.isArray(measuredRecord.richText)) {
      return measuredRecord.richText
        .map((part) => typeof part === 'object' && part && 'text' in part ? String((part as { text?: unknown }).text || '') : '')
        .join('');
    }
    if ('text' in measuredRecord) return String(measuredRecord.text || '');
  }
  return measuredValue == null ? '' : String(measuredValue);
}

function autoFitWorksheetColumns(
  sheet: ExcelJS.Worksheet,
  columns: Array<{ index: number; min: number; max: number; padding?: number; currency?: boolean }>
) {
  columns.forEach(({ index, min, max, padding = 2, currency = false }) => {
    let longest = 0;
    sheet.getColumn(index).eachCell({ includeEmpty: false }, (cell) => {
      longest = Math.max(longest, getCellTextForWidth(cell, { currency }).length);
    });
    sheet.getColumn(index).width = Math.min(max, Math.max(min, longest + padding));
  });
}

function autoFitSummaryColumns(sheet: ExcelJS.Worksheet) {
  autoFitWorksheetColumns(sheet, [
    { index: 2, min: 22, max: 120, padding: 3 },
    { index: 5, min: 18, max: 50, padding: 3 },
  ]);
}

function autoFitBoqTotalColumn(sheet: ExcelJS.Worksheet) {
  autoFitWorksheetColumns(sheet, [{ index: 6, min: 18, max: 32, padding: 2, currency: true }]);
}

async function createWorkbook() {
  return createExcelWorkbook();
}

function isCostItemType(type: BoQItem['type']) {
  return COST_ITEM_TYPES.has(type);
}

function getCostItemExportTotal(item: BoQItem) {
  if (!isCostItemType(item.type)) return 0;
  const quantity = Number(item.quantity) || 0;
  const rate = Number(item.rate) || 0;
  const calculatedTotal = safeMul(quantity, rate);
  const storedTotal = Number(item.total) || 0;
  return storedTotal !== 0 ? storedTotal : calculatedTotal;
}

function isContextItemType(type: BoQItem['type']) {
  return CONTEXT_ITEM_TYPES.has(type);
}

function applyContextItemFont(row: ExcelJS.Row, type: BoQItem['type']) {
  if (type === 'GENERAL_HEADING') row.font = { bold: true, underline: true };
  else if (type === 'MAJOR_HEADING' || type === 'SUB_SECTION' || type === 'MINOR_HEADING') row.font = { bold: true };
  else if (type === 'COMMENT' || type === 'SUB_COMMENT') row.font = { italic: true, color: { argb: 'FF64748B' } };
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

async function chooseDirectoryPath(defaultPath: string) {
  const tauri = typeof window !== 'undefined' ? (window as unknown as { __TAURI__?: unknown }).__TAURI__ : undefined;
  if (!tauri) return null;

  const { open } = await import('@tauri-apps/plugin-dialog');
  const directory = await open({
    defaultPath,
    directory: true,
    multiple: false,
  });
  return typeof directory === 'string' ? directory : null;
}

function escapeSheetFormulaName(name: string) {
  return name.replace(/'/g, "''");
}

function buildUniqueSheetName(name: string, used: Set<string>, fallback: string) {
  const base = (name || fallback).replace(/[:\\/?*\[\]]/g, ' ').replace(/\s+/g, ' ').trim() || fallback;
  let next = base.slice(0, 31);
  let counter = 2;
  while (used.has(next)) {
    const suffix = ` ${counter++}`;
    next = `${base.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
  }
  used.add(next);
  return next;
}

function configureBoqSheet(sheet: ExcelJS.Worksheet) {
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    margins: {
      left: 0.35,
      right: 0.35,
      top: 0.5,
      bottom: 0.5,
      header: 0.2,
      footer: 0.2,
    },
  };
  sheet.columns = [
    { header: 'Ref', key: 'ref', width: 11, style: { alignment: { vertical: 'top', horizontal: 'center' } } },
    { header: 'Description', key: 'desc', width: 56, style: { alignment: { wrapText: true, vertical: 'top', horizontal: 'left' } } },
    { header: 'Unit', key: 'unit', width: 10, style: { alignment: { vertical: 'top', horizontal: 'center' } } },
    { header: 'Qty', key: 'qty', width: 12, style: { alignment: { vertical: 'top', horizontal: 'right' } } },
    { header: 'Rate (£)', key: 'rate', width: 15, style: { alignment: { vertical: 'top', horizontal: 'right' } } },
    { header: 'Total (£)', key: 'total', width: 18, style: { alignment: { vertical: 'top', horizontal: 'right' } } },
    { header: 'Trade Package', key: 'trade', width: 22, style: { alignment: { vertical: 'top', horizontal: 'left' } } },
    { header: 'Notes', key: 'notes', width: 24, style: { alignment: { wrapText: true, vertical: 'top', horizontal: 'left' } } },
  ];
  const headerRow = sheet.getRow(1);
  headerRow.height = 24;
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0F172A' } },
      bottom: { style: 'thin', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FF0F172A' } },
    };
  });
  sheet.autoFilter = 'A1:H1';
}

function setDescriptionCellValue(cell: ExcelJS.Cell, value: string | undefined | null) {
  const richValue = richTextToExcelValue(value);
  cell.value = richValue as ExcelJS.CellValue;
  cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
}

function styleProjectSummarySheet(sheet: ExcelJS.Worksheet, project: Project, billSummaries: Array<{ bill: BoQBill; sheetName: string; finalTotalRow?: number; finalTotalValue?: number }>) {
  sheet.views = [{ showGridLines: false }];
  sheet.columns = [
    { key: 'a', width: 10 },
    { key: 'b', width: 30 },
    { key: 'c', width: 18 },
    { key: 'd', width: 18 },
    { key: 'e', width: 18 },
  ];

  sheet.mergeCells('A1:E1');
  sheet.getCell('A1').value = 'Project Workbook';
  sheet.getCell('A1').font = { bold: true, size: 18, color: { argb: 'FF0F172A' } };
  sheet.getCell('A1').alignment = { horizontal: 'left', vertical: 'middle' };

  sheet.mergeCells('A2:E2');
  sheet.getCell('A2').value = `${project.name}  |  ${new Date().toLocaleDateString()}`;
  sheet.getCell('A2').font = { size: 10, color: { argb: 'FF64748B' } };

  sheet.mergeCells('A4:B4');
  sheet.getCell('A4').value = 'Project';
  sheet.getCell('A4').font = { bold: true, color: { argb: 'FF475569' } };
  sheet.getCell('C4').value = project.name;

  sheet.mergeCells('A5:B5');
  sheet.getCell('A5').value = 'Bills included';
  sheet.getCell('A5').font = { bold: true, color: { argb: 'FF475569' } };
  sheet.getCell('C5').value = billSummaries.length;
  sheet.getCell('C5').alignment = { horizontal: 'center' };

  const headerRow = 8;
  ['Bill nr', 'Bill', 'Sections', 'Gross total', 'Sheet'].forEach((label, index) => {
    const cell = sheet.getCell(headerRow, index + 1);
    cell.value = label;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { horizontal: index === 1 || index === 4 ? 'left' : 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF1E293B' } },
      bottom: { style: 'thin', color: { argb: 'FF1E293B' } },
      left: { style: 'thin', color: { argb: 'FF1E293B' } },
      right: { style: 'thin', color: { argb: 'FF1E293B' } },
    };
  });

  billSummaries.forEach(({ bill, sheetName, finalTotalRow, finalTotalValue }, index) => {
    const rowNumber = headerRow + 1 + index;
    const targetSheet = escapeSheetFormulaName(sheetName);
    sheet.getCell(`A${rowNumber}`).value = index + 1;
    sheet.getCell(`B${rowNumber}`).value = {
      text: bill.name,
      hyperlink: `#'${targetSheet}'!A1`,
      tooltip: `Open ${sheetName}`,
    };
    sheet.getCell(`B${rowNumber}`).font = { color: { argb: 'FF2563EB' }, underline: true, bold: true };
    sheet.getCell(`C${rowNumber}`).value = bill.sections.length;
    if (finalTotalRow) {
      sheet.getCell(`D${rowNumber}`).value = { formula: `'${targetSheet}'!F${finalTotalRow}`, result: finalTotalValue ?? 0 };
      sheet.getCell(`D${rowNumber}`).numFmt = CURRENCY_NUM_FMT;
    }
    sheet.getCell(`E${rowNumber}`).value = sheetName;
    ['A', 'B', 'C', 'D', 'E'].forEach((column) => {
      const cell = sheet.getCell(`${column}${rowNumber}`);
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: column === 'B' || column === 'E' ? 'left' : 'center',
      };
    });
    if (index % 2 === 0) {
      ['A', 'B', 'C', 'D', 'E'].forEach((column) => {
        sheet.getCell(`${column}${rowNumber}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });
    }
  });

  const totalRow = headerRow + billSummaries.length + 2;
  sheet.getCell(`A${totalRow}`).value = 'Total project value';
  sheet.getCell(`A${totalRow}`).font = { bold: true, color: { argb: 'FF0F172A' } };
  const projectTotalValue = billSummaries.reduce((sum, entry) => safeAdd(sum, entry.finalTotalValue || 0), 0);
  sheet.getCell(`D${totalRow}`).value = billSummaries.length > 0 ? { formula: `SUM(D${headerRow + 1}:D${headerRow + billSummaries.length})`, result: projectTotalValue } : 0;
  sheet.getCell(`D${totalRow}`).numFmt = CURRENCY_NUM_FMT;
  sheet.getCell(`D${totalRow}`).font = { bold: true, size: 12, color: { argb: 'FF0F172A' } };
  ['A', 'B', 'C', 'D', 'E'].forEach((column) => {
    const cell = sheet.getCell(`${column}${totalRow}`);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  for (let row = 1; row <= totalRow; row += 1) {
    sheet.getRow(row).height = sheet.getRow(row).height || 22;
  }
  autoFitSummaryColumns(sheet);
}

function styleBillSummarySheet(
  sheet: ExcelJS.Worksheet,
  project: Project,
  bill: BoQBill,
  sectionSummaries: Array<{ section: BoQSection; sheetName: string; totalRow?: number; totalValue?: number }>
) {
  sheet.views = [{ showGridLines: false }];
  sheet.columns = [
    { key: 'a', width: 22 },
    { key: 'b', width: 28 },
    { key: 'c', width: 18 },
    { key: 'd', width: 18 },
  ];

  sheet.mergeCells('A1:D1');
  sheet.getCell('A1').value = 'Bill Workbook';
  sheet.getCell('A1').font = { bold: true, size: 18, color: { argb: 'FF0F172A' } };

  sheet.mergeCells('A2:D2');
  sheet.getCell('A2').value = `${project.name}  |  ${bill.name}`;
  sheet.getCell('A2').font = { size: 10, color: { argb: 'FF64748B' } };

  sheet.getCell('A4').value = 'Project';
  sheet.getCell('A4').font = { bold: true, color: { argb: 'FF475569' } };
  sheet.getCell('B4').value = project.name;

  sheet.getCell('A5').value = 'Bill';
  sheet.getCell('A5').font = { bold: true, color: { argb: 'FF475569' } };
  sheet.getCell('B5').value = bill.name;

  sheet.getCell('A6').value = 'Sections included';
  sheet.getCell('A6').font = { bold: true, color: { argb: 'FF475569' } };
  sheet.getCell('B6').value = sectionSummaries.length;
  sheet.getCell('B6').alignment = { horizontal: 'center' };

  const headerRow = 9;
  ['Section', 'Pages', 'Section total', 'Sheet'].forEach((label, index) => {
    const cell = sheet.getCell(headerRow, index + 1);
    cell.value = label;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { horizontal: index === 0 || index === 3 ? 'left' : 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF1E293B' } },
      bottom: { style: 'thin', color: { argb: 'FF1E293B' } },
      left: { style: 'thin', color: { argb: 'FF1E293B' } },
      right: { style: 'thin', color: { argb: 'FF1E293B' } },
    };
  });

  sectionSummaries.forEach(({ section, sheetName, totalRow, totalValue }, index) => {
    const rowNumber = headerRow + 1 + index;
    sheet.getCell(`A${rowNumber}`).value = section.name;
    sheet.getCell(`B${rowNumber}`).value = section.pages?.length || 0;
    if (totalRow) {
      sheet.getCell(`C${rowNumber}`).value = { formula: `'${escapeSheetFormulaName(sheetName)}'!F${totalRow}`, result: totalValue ?? 0 };
      sheet.getCell(`C${rowNumber}`).numFmt = CURRENCY_NUM_FMT;
    }
    sheet.getCell(`D${rowNumber}`).value = sheetName;
    ['A', 'B', 'C', 'D'].forEach((column) => {
      const cell = sheet.getCell(`${column}${rowNumber}`);
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: column === 'A' || column === 'D' ? 'left' : 'center',
      };
    });
    if (index % 2 === 0) {
      ['A', 'B', 'C', 'D'].forEach((column) => {
        sheet.getCell(`${column}${rowNumber}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });
    }
  });

  const totalRow = headerRow + sectionSummaries.length + 2;
  sheet.getCell(`A${totalRow}`).value = 'Bill total';
  sheet.getCell(`A${totalRow}`).font = { bold: true, color: { argb: 'FF0F172A' } };
  const billSummaryTotal = sectionSummaries.reduce((sum, entry) => safeAdd(sum, entry.totalValue || 0), 0);
  sheet.getCell(`C${totalRow}`).value = sectionSummaries.length > 0 ? { formula: `SUM(C${headerRow + 1}:C${headerRow + sectionSummaries.length})`, result: billSummaryTotal } : 0;
  sheet.getCell(`C${totalRow}`).numFmt = CURRENCY_NUM_FMT;
  sheet.getCell(`C${totalRow}`).font = { bold: true, size: 12, color: { argb: 'FF0F172A' } };
  ['A', 'B', 'C', 'D'].forEach((column) => {
    const cell = sheet.getCell(`${column}${totalRow}`);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });
  autoFitSummaryColumns(sheet);
}

export const exportProjectToExcel = async (project: Project, trades: TradePackage[]) => {
  return exportProjectToExcelWithOptions(project, trades, { mode: 'bill-tabs' });
};

function addSectionSheetContent(
  sheet: ExcelJS.Worksheet,
  bill: BoQBill,
  section: BoQSection,
  trades: TradePackage[]
): { sectionTotalRow: ExcelJS.Row; sectionTotal: number } {
  const addItemRow = (item: BoQItem) => {
    const trade = trades.find((t) => t.id === item.tradePackageId)?.name || '';
    const isCost = isCostItemType(item.type);
    const exportTotal = getCostItemExportTotal(item);
    const row = sheet.addRow({
      ref: isCost ? item.reference : '',
      desc: item.description,
      unit: isCost ? item.unit : '',
      qty: isCost ? item.quantity : '',
      rate: isCost ? item.rate : '',
      total: '',
      trade,
      notes: '',
    });
    setDescriptionCellValue(row.getCell('desc'), item.description);

    if (item.type === 'GENERAL_HEADING') {
      row.font = { bold: true, size: 11, underline: true };
    } else if (isContextItemType(item.type)) {
      applyContextItemFont(row, item.type);
    } else if (isCost) {
      row.getCell('unit').value = String(item.unit || '').toLowerCase();
      row.getCell('total').value = { formula: `D${row.number}*E${row.number}`, result: exportTotal };
      row.getCell('qty').numFmt = getQuantityNumFmt(item);
      row.getCell('rate').numFmt = CURRENCY_NUM_FMT;
      row.getCell('total').numFmt = CURRENCY_NUM_FMT;
      row.eachCell((cell) => {
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } };
      });
    }
    return { row, isCost, total: exportTotal };
  };

  sheet.addRow({ desc: bill.name.toUpperCase() }).font = { bold: true, size: 12 };
  const sectionHeader = sheet.addRow({ desc: section.name });
  sectionHeader.font = { bold: true, color: { argb: 'FF475569' } };
  sectionHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

  const itemTotalRows: number[] = [];
  let sectionTotal = 0;
  if (section.pages?.length) {
    section.pages.forEach((page, pageIndex) => {
      const pageName = page.name || `Page ${pageIndex + 1}`;
      const pageHeaderRow = sheet.addRow({ desc: pageName.toUpperCase() });
      pageHeaderRow.font = { bold: true, color: { argb: 'FF64748B' } };
      pageHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      const pageCostRows: number[] = [];
      let pageTotal = 0;

      (page.items || []).forEach((item) => {
        const { row, isCost, total } = addItemRow(item);
        if (isCost) {
          pageCostRows.push(row.number);
          itemTotalRows.push(row.number);
          pageTotal = safeAdd(pageTotal, total);
          sectionTotal = safeAdd(sectionTotal, total);
        }
      });

      const pageTotalRow = sheet.addRow({
        desc: `PAGE TOTAL: ${pageName}`.toUpperCase(),
        total: pageCostRows.length > 0
          ? { formula: `SUM(${pageCostRows.map((rowNumber) => `F${rowNumber}`).join(',')})`, result: pageTotal }
          : 0,
      });
      pageTotalRow.font = { bold: true, color: { argb: 'FF0F172A' } };
      pageTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      pageTotalRow.getCell('total').numFmt = CURRENCY_NUM_FMT;
      pageTotalRow.getCell('desc').alignment = { horizontal: 'right' };
    });
  } else {
    getSectionItems(section).forEach((item) => {
      const { row, isCost, total } = addItemRow(item);
      if (isCost) {
        itemTotalRows.push(row.number);
        sectionTotal = safeAdd(sectionTotal, total);
      }
    });
  }

  const sectionTotalRow = sheet.addRow({
    desc: `SUB-TOTAL: ${section.name}`.toUpperCase(),
    total: itemTotalRows.length > 0
      ? { formula: `SUM(${itemTotalRows.map((rowNumber) => `F${rowNumber}`).join(',')})`, result: sectionTotal }
      : 0,
  });
  sectionTotalRow.font = { bold: true, size: 11 };
  sectionTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  sectionTotalRow.getCell('total').numFmt = CURRENCY_NUM_FMT;
  sectionTotalRow.getCell('desc').alignment = { horizontal: 'right' };

  autoFitBoqTotalColumn(sheet);
  return { sectionTotalRow, sectionTotal };
}

function getBillExportSections(bill: BoQBill): BoQSection[] {
  if ((bill.sections || []).length > 0) return bill.sections || [];
  if ((bill.items || []).length === 0) return [];
  return [{
    id: `${bill.id}-bill-items`,
    name: 'Bill items',
    items: bill.items || [],
  }];
}

function addRateBuildUpsSheet(workbook: ExcelJS.Workbook, bills: BoQBill[]) {
  const rows = bills.flatMap((bill) => getBillExportSections(bill).flatMap((section) => getSectionItems(section)
    .filter((item) => item.rateBuildUp?.mode === 'DERIVED')
    .flatMap((item) => (item.rateBuildUp?.components || []).map((component) => ({ bill, section, item, component }))))) as Array<{ bill: BoQBill; section: BoQSection; item: BoQItem; component: NonNullable<BoQItem['rateBuildUp']>['components'][number] }>;
  if (rows.length === 0) return;
  const sheet = workbook.addWorksheet('Rate Build-ups');
  sheet.columns = [
    { header: 'Bill', key: 'bill', width: 24 }, { header: 'Section', key: 'section', width: 28 }, { header: 'Ref', key: 'ref', width: 12 },
    { header: 'Item', key: 'item', width: 42 }, { header: 'Category', key: 'category', width: 18 }, { header: 'Component', key: 'component', width: 38 },
    { header: 'Qty', key: 'qty', width: 12 }, { header: 'Unit', key: 'unit', width: 12 }, { header: 'Rate', key: 'rate', width: 16 }, { header: 'Component total', key: 'total', width: 18 }, { header: 'Note', key: 'note', width: 40 },
  ];
  const header = sheet.getRow(1); header.font = { bold: true, color: { argb: 'FFFFFFFF' } }; header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  rows.forEach(({ bill, section, item, component }) => {
    const row = sheet.addRow({ bill: bill.name, section: section.name, ref: item.reference, item: stripRichText(item.description), category: component.categoryLabel || component.category, component: component.description, qty: component.quantity, unit: component.unit, rate: component.rate, total: component.included === false ? 0 : component.quantity * component.rate, note: component.note || '' });
    row.getCell('rate').numFmt = CURRENCY_NUM_FMT; row.getCell('total').numFmt = CURRENCY_NUM_FMT;
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

async function buildBillWorkbook(project: Project, bill: BoQBill, trades: TradePackage[]) {
  const workbook = await createWorkbook();

  const summarySheet = workbook.addWorksheet('Bill Summary');
  const usedSheetNames = new Set<string>(['Bill Summary']);
  const exportSections = getBillExportSections(bill);
  const sectionSummaries = exportSections.map((section, index) => {
    const sheetName = buildUniqueSheetName(`${index + 1}. ${section.name === 'Bill items' ? bill.name : section.name}`, usedSheetNames, `Section ${index + 1}`);
    const sectionSheet = workbook.addWorksheet(sheetName);
    configureBoqSheet(sectionSheet);
    const { sectionTotalRow, sectionTotal } = addSectionSheetContent(sectionSheet, bill, section, trades);
    return { section, sheetName, totalRow: sectionTotalRow.number, totalValue: sectionTotal };
  });
  styleBillSummarySheet(summarySheet, project, bill, sectionSummaries);
  addRateBuildUpsSheet(workbook, [bill]);
  return workbook;
}

function addTenderBlankSectionSheetContent(
  sheet: ExcelJS.Worksheet,
  bill: BoQBill,
  section: BoQSection,
  trade: TradePackage
) {
  const relevantRows: Array<BoQItem> = [];
  const pushItems = (items: BoQItem[]) => {
    let pendingHeaders: BoQItem[] = [];
    items.forEach((item) => {
      if (isContextItemType(item.type)) {
        pendingHeaders.push(item);
        return;
      }
      if (isCostItemType(item.type) && item.tradePackageId === trade.id) {
        relevantRows.push(...pendingHeaders);
        pendingHeaders = [];
        relevantRows.push(item);
      }
    });
  };

  sheet.addRow({ desc: bill.name.toUpperCase() }).font = { bold: true, size: 12 };
  const sectionHeader = sheet.addRow({ desc: section.name });
  sectionHeader.font = { bold: true, color: { argb: 'FF475569' } };
  sectionHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

  if (section.pages?.length) {
    section.pages.forEach((page, pageIndex) => {
      const pageName = page.name || `Page ${pageIndex + 1}`;
      const pageItems = page.items || [];
      const hasRelevantItems = pageItems.some((item) => isCostItemType(item.type) && item.tradePackageId === trade.id);
      if (!hasRelevantItems) return;
      const pageHeader = sheet.addRow({ desc: pageName.toUpperCase() });
      pageHeader.font = { bold: true, color: { argb: 'FF64748B' } };
      pageHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      pushItems(pageItems);
    });
  } else {
    pushItems(getSectionItems(section));
  }

  relevantRows.forEach((item) => {
    if (isContextItemType(item.type)) {
      const row = sheet.addRow({ ref: '', desc: item.description, unit: '', qty: '', rate: '', total: '' });
      setDescriptionCellValue(row.getCell('desc'), item.description);
      applyContextItemFont(row, item.type);
      return;
    }

    const row = sheet.addRow({
      ref: item.reference,
      desc: item.description,
      unit: String(item.unit || '').toLowerCase(),
      qty: item.quantity,
      rate: '',
      total: '',
    });
    setDescriptionCellValue(row.getCell('desc'), item.description);
    row.getCell('qty').numFmt = getQuantityNumFmt(item);
  });
}

export const exportProjectToExcelWithOptions = async (
  project: Project,
  trades: TradePackage[],
  options: { mode: 'bill-tabs' | 'separate-bill-workbooks' }
) => {
  if (options.mode === 'separate-bill-workbooks') {
    const directory = await chooseDirectoryPath(project.name.replace(/\s+/g, '_'));
    if (!directory) return false;

    const tauri = typeof window !== 'undefined' ? (window as unknown as { __TAURI__?: unknown }).__TAURI__ : undefined;
    const { writeFile } = tauri ? await import('@tauri-apps/plugin-fs') : { writeFile: null };

    for (const bill of project.bills) {
      const workbook = await buildBillWorkbook(project, bill, trades);
      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `BoQ-${project.name.replace(/\s+/g, '_')}-${bill.name.replace(/\s+/g, '_')}.xlsx`;
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      if (tauri && writeFile) {
        await writeFile(`${directory}\\${filename}`, new Uint8Array(buffer));
      } else {
        await saveBlobToFile(blob, filename, [{ name: 'Excel workbook', extensions: ['xlsx'] }]);
      }
    }
    return true;
  }

  const workbook = await createWorkbook();

  const summarySheet = workbook.addWorksheet('Project Summary');
  const usedSheetNames = new Set<string>(['Project Summary']);
  const billSummaries = project.bills.map((bill, index) => {
    const sheetName = buildUniqueSheetName(`${index + 1}. ${bill.name}`, usedSheetNames, `Bill ${index + 1}`);
    const billSheet = workbook.addWorksheet(sheetName);
    configureBoqSheet(billSheet);
    const { finalTotalRow, finalTotalValue } = addBoqSheetContent(billSheet, [bill], trades, project.ohpPercentage);
    return { bill, sheetName, finalTotalRow: finalTotalRow?.number, finalTotalValue };
  });
  styleProjectSummarySheet(summarySheet, project, billSummaries);

  return downloadExcelWorkbook(workbook, `BoQ-${project.name.replace(/\s+/g, '_')}.xlsx`);
};

/** Build BoQ worksheet content for one or more bills (shared styling and columns). */
function addBoqSheetContent(
  boqSheet: ExcelJS.Worksheet,
  bills: BoQBill[],
  trades: TradePackage[],
  projectOhpPercentage: number
): { billTotalRows: number[]; grandTotalRow?: ExcelJS.Row; ohpRow?: ExcelJS.Row; finalTotalRow?: ExcelJS.Row; grandTotalValue: number; ohpValue: number; finalTotalValue: number } {
  const billTotalRows: number[] = [];
  const billTotalValues: number[] = [];
  const addItemRow = (item: BoQItem) => {
    const trade = trades.find(t => t.id === item.tradePackageId)?.name || '';
    const isCost = isCostItemType(item.type);
    const exportTotal = getCostItemExportTotal(item);
    const rowData = {
      ref: isCost ? item.reference : '',
      desc: item.description,
      unit: isCost ? item.unit : '',
      qty: isCost ? item.quantity : '',
      rate: isCost ? item.rate : '',
      total: '',
      trade: trade,
      notes: ''
    };
    const row = boqSheet.addRow(rowData);
    const rowNum = row.number;
    setDescriptionCellValue(row.getCell('desc'), item.description);

    if (item.type === 'GENERAL_HEADING') {
      row.font = { bold: true, size: 11, underline: true };
    } else if (isContextItemType(item.type)) {
      applyContextItemFont(row, item.type);
    } else if (isCost) {
      row.getCell('unit').value = String(item.unit || '').toLowerCase();
      row.getCell('total').value = { formula: `D${rowNum}*E${rowNum}`, result: exportTotal };
      row.getCell('qty').numFmt = getQuantityNumFmt(item);
      row.getCell('rate').numFmt = CURRENCY_NUM_FMT;
      row.getCell('total').numFmt = CURRENCY_NUM_FMT;
      row.eachCell((cell) => {
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } };
      });
    }
    return { row, isCost, total: exportTotal };
  };

  bills.forEach(bill => {
    // Bill Header
    const billRow = boqSheet.addRow({ desc: bill.name.toUpperCase() });
    billRow.font = { bold: true, size: 12 };
    billRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; // Slate 200
    
    const sectionTotalRows: number[] = [];
    const billLevelItemTotalRows: number[] = [];
    let billTotalValue = 0;

    if ((bill.sections || []).length === 0) {
      (bill.items || []).forEach((item) => {
        const { row, isCost, total } = addItemRow(item);
        if (isCost) {
          billLevelItemTotalRows.push(row.number);
          billTotalValue = safeAdd(billTotalValue, total);
        }
      });
    }

    (bill.sections || []).forEach(section => {
      // Section Header
      const sectionRow = boqSheet.addRow({ desc: section.name });
      sectionRow.font = { bold: true, color: { argb: 'FF475569' } }; // Slate 600
      sectionRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; // Slate 100

      const itemTotalRows: number[] = [];
      let sectionTotalValue = 0;
      if (section.pages?.length) {
        section.pages.forEach((page, pageIndex) => {
          const pageName = page.name || `Page ${pageIndex + 1}`;
          const pageHeaderRow = boqSheet.addRow({ desc: pageName.toUpperCase() });
          pageHeaderRow.font = { bold: true, color: { argb: 'FF64748B' } };
          pageHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          const pageCostRows: number[] = [];
          let pageTotalValue = 0;

          (page.items || []).forEach((item) => {
            const { row, isCost, total } = addItemRow(item);
            if (isCost) {
              pageCostRows.push(row.number);
              itemTotalRows.push(row.number);
              pageTotalValue = safeAdd(pageTotalValue, total);
              sectionTotalValue = safeAdd(sectionTotalValue, total);
            }
          });

          const pageTotalRow = boqSheet.addRow({
            desc: `PAGE TOTAL: ${pageName}`.toUpperCase(),
            total: pageCostRows.length > 0
              ? { formula: `SUM(${pageCostRows.map((rowNumber) => `F${rowNumber}`).join(',')})`, result: pageTotalValue }
              : 0,
          });
          pageTotalRow.font = { bold: true, color: { argb: 'FF0F172A' } };
          pageTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          pageTotalRow.getCell('total').numFmt = CURRENCY_NUM_FMT;
          pageTotalRow.getCell('desc').alignment = { horizontal: 'right' };
        });
      } else {
        getSectionItems(section).forEach((item) => {
          const { row, isCost, total } = addItemRow(item);
          if (isCost) {
            itemTotalRows.push(row.number);
            sectionTotalValue = safeAdd(sectionTotalValue, total);
          }
        });
      }

      // Section Sub-total Row
      const subTotalRow = boqSheet.addRow({
        desc: `SUB-TOTAL: ${section.name}`.toUpperCase(),
        total: itemTotalRows.length > 0 
          ? { formula: `SUM(${itemTotalRows.map(r => `F${r}`).join(',')})`, result: sectionTotalValue }
          : 0
      });
      subTotalRow.font = { bold: true };
      subTotalRow.getCell('total').numFmt = CURRENCY_NUM_FMT;
      subTotalRow.getCell('desc').alignment = { horizontal: 'right' };
      sectionTotalRows.push(subTotalRow.number);
      billTotalValue = safeAdd(billTotalValue, sectionTotalValue);
    });

    // Bill Total Row
    const billTotalFormulaRows = sectionTotalRows.length > 0 ? sectionTotalRows : billLevelItemTotalRows;
    const billTotalRow = boqSheet.addRow({
      desc: `TOTAL FOR ${bill.name}`.toUpperCase(),
      total: billTotalFormulaRows.length > 0
        ? { formula: `SUM(${billTotalFormulaRows.map(r => `F${r}`).join(',')})`, result: billTotalValue }
        : 0
    });
    billTotalRow.font = { bold: true, size: 11 };
    billTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    billTotalRow.getCell('total').numFmt = CURRENCY_NUM_FMT;
    billTotalRow.getCell('desc').alignment = { horizontal: 'right' };
    billTotalRows.push(billTotalRow.number);
    billTotalValues.push(billTotalValue);
    
    boqSheet.addRow({}); // spacer
  });

  // Grand Total Row
  const grandTotalValue = billTotalValues.reduce((sum, value) => safeAdd(sum, value), 0);
  const grandTotalRow = boqSheet.addRow({
    desc: 'GRAND TOTAL (NET)',
    total: billTotalRows.length > 0
      ? { formula: `SUM(${billTotalRows.map(r => `F${r}`).join(',')})`, result: grandTotalValue }
      : 0
  });
  grandTotalRow.font = { bold: true, size: 12 };
  grandTotalRow.getCell('total').numFmt = CURRENCY_NUM_FMT;
  grandTotalRow.getCell('desc').alignment = { horizontal: 'right' };

  // OH&P Row
  const ohpValue = safeMul(grandTotalValue, projectOhpPercentage / 100);
  const ohpRow = boqSheet.addRow({
    desc: `OVERHEADS & PROFIT (${projectOhpPercentage}%)`,
    total: { formula: `F${grandTotalRow.number}*${projectOhpPercentage / 100}`, result: ohpValue }
  });
  ohpRow.font = { bold: true, color: { argb: 'FFD97706' } }; // Amber 600
  ohpRow.getCell('total').numFmt = CURRENCY_NUM_FMT;
  ohpRow.getCell('desc').alignment = { horizontal: 'right' };

  // Final Total Row
  const finalTotalValue = safeAdd(grandTotalValue, ohpValue);
  const finalTotalRow = boqSheet.addRow({
    desc: 'TOTAL PROJECT VALUE (GROSS)',
    total: { formula: `F${grandTotalRow.number}+F${ohpRow.number}`, result: finalTotalValue }
  });
  finalTotalRow.font = { bold: true, size: 14 };
  finalTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } }; // Blue 50
  finalTotalRow.getCell('total').numFmt = CURRENCY_NUM_FMT;
  finalTotalRow.getCell('desc').alignment = { horizontal: 'right' };

  autoFitBoqTotalColumn(boqSheet);
  return { billTotalRows, grandTotalRow, ohpRow, finalTotalRow, grandTotalValue, ohpValue, finalTotalValue };
}

async function downloadExcelWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const startedAt = performance.now();
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const saved = await saveBlobToFile(blob, filename, [{ name: 'Excel workbook', extensions: ['xlsx'] }]);
  recordOperationLogEntry({
    kind: 'export',
    status: saved ? 'success' : 'cancelled',
    subject: 'Excel export',
    message: saved ? `Saved or downloaded ${filename}.` : `Excel export for ${filename} was cancelled before saving.`,
    path: filename,
    counts: { files: saved ? 1 : 0 },
    durationMs: Math.round(performance.now() - startedAt),
    nextStep: saved ? 'Open the workbook and check totals, rates, and tender columns before issuing.' : undefined,
  });
  return saved;
}

export const exportBillToExcel = async (project: Project, bill: BoQBill, trades: TradePackage[]) => {
  const workbook = await buildBillWorkbook(project, bill, trades);

  await downloadExcelWorkbook(
    workbook,
    `BoQ-${project.name.replace(/\s+/g, '_')}-${bill.name.replace(/\s+/g, '_')}.xlsx`
  );
};

/** Export a single section to Excel (formatted BoQ for that section only). */
export const exportSectionToExcel = async (
  project: Project,
  bill: BoQBill,
  section: BoQSection,
  trades: TradePackage[]
) => {
  const workbook = await createWorkbook();

  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Item', key: 'item', width: 30 },
    { header: 'Value', key: 'value', width: 20 },
  ];
  summarySheet.addRow({ item: 'Project', value: project.name });
  summarySheet.addRow({ item: 'Bill', value: bill.name });
  summarySheet.addRow({ item: 'Section', value: section.name });
  summarySheet.addRow({ item: 'Date', value: new Date().toLocaleDateString() });
  summarySheet.addRow({});
  summarySheet.addRow({ item: 'SECTION TOTAL (NET)', value: 0 });
  summarySheet.getRow(1).font = { bold: true, size: 14 };
  summarySheet.getRow(6).font = { bold: true, size: 12 };
  summarySheet.getCell('B6').numFmt = '"£"#,##0.00';

  const boqSheet = workbook.addWorksheet('Bill of Quantities');
  boqSheet.columns = [
    { header: 'Ref', key: 'ref', width: 10, style: { alignment: { vertical: 'top' } } },
    { header: 'Description', key: 'desc', width: 60, style: { alignment: { wrapText: true, vertical: 'top' } } },
    { header: 'Unit', key: 'unit', width: 10, style: { alignment: { vertical: 'top', horizontal: 'center' } } },
    { header: 'Qty', key: 'qty', width: 12, style: { alignment: { vertical: 'top', horizontal: 'right' } } },
    { header: 'Rate (£)', key: 'rate', width: 15, style: { alignment: { vertical: 'top', horizontal: 'right' } } },
    { header: 'Total (£)', key: 'total', width: 15, style: { alignment: { vertical: 'top', horizontal: 'right' } } },
    { header: 'Trade Package', key: 'trade', width: 20, style: { alignment: { vertical: 'top' } } },
    { header: 'Notes', key: 'notes', width: 30, style: { alignment: { wrapText: true, vertical: 'top' } } },
  ];
  const headerRow = boqSheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  const syntheticBill: BoQBill = { id: bill.id, name: bill.name, sections: [section] };
  const { finalTotalRow, finalTotalValue } = addBoqSheetContent(boqSheet, [syntheticBill], trades, project.ohpPercentage ?? 0);
  if (finalTotalRow) {
    summarySheet.getCell('B6').value = { formula: `'Bill of Quantities'!F${finalTotalRow.number}`, result: finalTotalValue };
  }

  const safeName = section.name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_') || 'Section';
  await downloadExcelWorkbook(
    workbook,
    `BoQ-${project.name.replace(/\s+/g, '_')}-${bill.name.replace(/\s+/g, '_')}-${safeName}.xlsx`
  );
};

/** Export BoQ filtered to a single trade (all bills/sections, only items assigned to that trade). */
export const exportTradeBoQToExcel = async (project: Project, trade: TradePackage) => {
  const workbook = await createWorkbook();

  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Item', key: 'item', width: 30 },
    { header: 'Value', key: 'value', width: 20 },
  ];
  summarySheet.addRow({ item: 'Project', value: project.name });
  summarySheet.addRow({ item: 'Trade package', value: trade.name });
  summarySheet.addRow({ item: 'Date', value: new Date().toLocaleDateString() });
  summarySheet.addRow({});
  summarySheet.addRow({ item: 'TRADE TOTAL (NET)', value: 0 });
  summarySheet.getRow(1).font = { bold: true, size: 14 };
  summarySheet.getRow(5).font = { bold: true, size: 12 };
  summarySheet.getCell('B5').numFmt = '"£"#,##0.00';

  const boqSheet = workbook.addWorksheet('Bill of Quantities');
  boqSheet.columns = [
    { header: 'Ref', key: 'ref', width: 10, style: { alignment: { vertical: 'top' } } },
    { header: 'Description', key: 'desc', width: 60, style: { alignment: { wrapText: true, vertical: 'top' } } },
    { header: 'Unit', key: 'unit', width: 10, style: { alignment: { vertical: 'top', horizontal: 'center' } } },
    { header: 'Qty', key: 'qty', width: 12, style: { alignment: { vertical: 'top', horizontal: 'right' } } },
    { header: 'Rate (£)', key: 'rate', width: 15, style: { alignment: { vertical: 'top', horizontal: 'right' } } },
    { header: 'Total (£)', key: 'total', width: 15, style: { alignment: { vertical: 'top', horizontal: 'right' } } },
    { header: 'Trade Package', key: 'trade', width: 20, style: { alignment: { vertical: 'top' } } },
    { header: 'Notes', key: 'notes', width: 30, style: { alignment: { wrapText: true, vertical: 'top' } } },
  ];
  const headerRow = boqSheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  const syntheticSections: BoQSection[] = [];
  project.bills.forEach((bill) => {
    bill.sections.forEach((section) => {
      const pendingHeaders: BoQItem[] = [];
      const tradeItems: BoQItem[] = [];
      getSectionItems(section).forEach((item) => {
        if (isContextItemType(item.type)) {
          pendingHeaders.push(item);
        } else if (isCostItemType(item.type) && item.tradePackageId === trade.id) {
          tradeItems.push(...pendingHeaders, item);
          pendingHeaders.length = 0;
        }
      });
      if (tradeItems.length > 0) {
        syntheticSections.push({
          id: section.id,
          name: `${bill.name} / ${section.name}`,
          items: tradeItems,
        });
      }
    });
  });

  if (syntheticSections.length === 0) {
    boqSheet.addRow({ desc: 'No items assigned to this trade.' });
    await downloadExcelWorkbook(
      workbook,
      `BoQ-${project.name.replace(/\s+/g, '_')}-Trade-${trade.name.replace(/\s+/g, '_')}.xlsx`
    );
    return;
  }

  const syntheticBill: BoQBill = {
    id: 'trade-filtered',
    name: `BoQ - ${trade.name}`,
    sections: syntheticSections,
  };
    const { finalTotalRow, finalTotalValue } = addBoqSheetContent(boqSheet, [syntheticBill], [trade], project.ohpPercentage ?? 0);
    if (finalTotalRow) {
      summarySheet.getCell('B5').value = { formula: `'Bill of Quantities'!F${finalTotalRow.number}`, result: finalTotalValue };
    }

  await downloadExcelWorkbook(
    workbook,
    `BoQ-${project.name.replace(/\s+/g, '_')}-Trade-${trade.name.replace(/\s+/g, '_')}.xlsx`
  );
};

export const exportTenderAnalysisToExcel = async (project: Project, trade: TradePackage) => {
  const workbook = await createWorkbook();

  const contractors = trade.contractors || [];
  
  // 1. Calculate Totals for Ranking
  const analysis = contractors.map(c => {
    let total = 0;
    project.bills.forEach(b => b.sections.forEach(s => getSectionItems(s).forEach(i => {
       if (i.type === 'PRICED' && i.tradePackageId === trade.id) {
           const rate = project.tenderData?.[i.id]?.[c.id] || 0;
           total += (i.quantity * rate);
       }
    })));
    return { id: c.id, name: c.name, total };
  }).sort((a, b) => a.total - b.total);

  const lowestTotal = analysis.length > 0 ? analysis[0].total : 0;

  // --- SHEET 1: TENDER SUMMARY ---
  const summarySheet = workbook.addWorksheet('Tender Summary');
  summarySheet.columns = [
     { header: 'Rank', key: 'rank', width: 10 },
     { header: 'Contractor', key: 'name', width: 40 },
     { header: 'Tender Total (£)', key: 'total', width: 20 },
     { header: 'Variance (£)', key: 'diff', width: 20 },
     { header: 'Variance (%)', key: 'diffPct', width: 15 },
  ];

  // Header Style
  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  
  analysis.forEach((a, idx) => {
     const row = summarySheet.addRow({
        rank: idx + 1,
        name: a.name,
        total: a.total,
        diff: a.total - lowestTotal,
        diffPct: lowestTotal > 0 ? (a.total - lowestTotal) / lowestTotal : 0
     });
     row.getCell('total').numFmt = '£#,##0.00';
     row.getCell('diff').numFmt = '£#,##0.00';
     row.getCell('diffPct').numFmt = '0.00%';
     
     if (idx === 0) row.font = { bold: true, color: { argb: 'FF10B981' } }; // Green for winner
  });

  // --- SHEET 2: COMPARISON ---
  const compareSheet = workbook.addWorksheet('Comparison');
  const compareCols: any[] = [
     { header: 'Ref', key: 'ref', width: 10, style: { alignment: { vertical: 'top' } } },
     { header: 'Description', key: 'desc', width: 50, style: { alignment: { wrapText: true, vertical: 'top' } } },
     { header: 'Unit', key: 'unit', width: 8, style: { alignment: { vertical: 'top', horizontal: 'center' } } },
     { header: 'Qty', key: 'qty', width: 12, style: { alignment: { vertical: 'top', horizontal: 'right' } } },
  ];
  
  // Add columns for each contractor
  analysis.forEach(a => {
      compareCols.push({ header: `${a.name}\nRate`, key: `rate_${a.id}`, width: 15, style: { alignment: { vertical: 'top', horizontal: 'right' } } });
      compareCols.push({ header: `${a.name}\nTotal`, key: `total_${a.id}`, width: 15, style: { alignment: { vertical: 'top', horizontal: 'right' } } });
  });
  compareSheet.columns = compareCols;
  compareSheet.getRow(1).font = { bold: true };
  compareSheet.getRow(1).height = 30; // Taller header

  // --- SHEET 3: NEGOTIATION MIX (selected rates) ---
  const negotiationSheet = workbook.addWorksheet('Negotiation');
  negotiationSheet.columns = [
    { header: 'Ref', key: 'ref', width: 10 },
    { header: 'Description', key: 'desc', width: 50 },
    { header: 'Unit', key: 'unit', width: 8 },
    { header: 'Qty', key: 'qty', width: 12 },
    { header: 'Base Contractor', key: 'baseName', width: 20 },
    { header: 'Base Rate (£)', key: 'baseRate', width: 16 },
    { header: 'Selected From', key: 'selectedFrom', width: 20 },
    { header: 'Selected Rate (£)', key: 'selectedRate', width: 16 },
    { header: 'Selected Total (£)', key: 'selectedTotal', width: 18 },
    { header: 'Source Type', key: 'sourceType', width: 18 },
  ];
  negotiationSheet.getRow(1).font = { bold: true };

  // --- SHEETS 3+: INDIVIDUAL CONTRACTOR BILLS ---
  const contractorSheets: Record<string, ExcelJS.Worksheet> = {};
  analysis.forEach(a => {
     const sheetName = `Bill - ${a.name}`.substring(0, 31);
     const sheet = workbook.addWorksheet(sheetName);
     sheet.columns = [
        { header: 'Ref', key: 'ref', width: 10, style: { alignment: { vertical: 'top' } } },
        { header: 'Description', key: 'desc', width: 60, style: { alignment: { wrapText: true, vertical: 'top' } } },
        { header: 'Unit', key: 'unit', width: 10, style: { alignment: { vertical: 'top', horizontal: 'center' } } },
        { header: 'Qty', key: 'qty', width: 12, style: { alignment: { vertical: 'top', horizontal: 'right' } } },
        { header: 'Rate (£)', key: 'rate', width: 15, style: { alignment: { vertical: 'top', horizontal: 'right' } } },
        { header: 'Total (£)', key: 'total', width: 15, style: { alignment: { vertical: 'top', horizontal: 'right' } } },
     ];
     sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
     sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
     contractorSheets[a.id] = sheet;
  });

  // Populate Data with Context Handling
  project.bills.forEach(bill => {
      // Comparison Sheet Header
      compareSheet.addRow({ desc: bill.name.toUpperCase() }).font = { bold: true };
      
      // Individual Sheets Header
      Object.values(contractorSheets).forEach(s => {
          s.addRow({ desc: bill.name.toUpperCase() }).font = { bold: true };
      });

      bill.sections.forEach(section => {
          // Section headers
          compareSheet.addRow({ desc: section.name }).font = { bold: true, italic: true };
          negotiationSheet.addRow({ desc: section.name }).font = { bold: true, italic: true };
          Object.values(contractorSheets).forEach(s => {
             s.addRow({ desc: section.name }).font = { bold: true, italic: true };
          });

          // State to track printed context headers for this section block
          const contextState = {
             general: null as any,
             major: null as any,
             sub: null as any,
             lastPrintedId: ''
          };

          // Helper to print a non-priced item to all relevant sheets
          const printHeader = (item: any) => {
             if (item.id === contextState.lastPrintedId) return;

             const rowData = { ref: '', desc: item.description, unit: '', qty: '' };
             
             // Comparison
             const cRow = compareSheet.addRow(rowData);
             setDescriptionCellValue(cRow.getCell('desc'), item.description);
             applyContextItemFont(cRow, item.type);

             // Individual
             Object.values(contractorSheets).forEach(s => {
                const row = s.addRow(rowData);
                setDescriptionCellValue(row.getCell('desc'), item.description);
                applyContextItemFont(row, item.type);
             });
             
             contextState.lastPrintedId = item.id;
          };

          getSectionItems(section).forEach(item => {
             // Track Headers
             if (item.type === 'GENERAL_HEADING') { contextState.general = item; contextState.major = null; contextState.sub = null; }
             else if (item.type === 'MAJOR_HEADING') { contextState.major = item; contextState.sub = null; }
             else if (item.type === 'SUB_SECTION' || item.type === 'MINOR_HEADING') { contextState.sub = item; }
             
             // If relevant Priced Item
             if (item.type === 'PRICED' && item.tradePackageId === trade.id) {
                 // Print preceding headers if they exist and haven't been printed "recently"
                 // Note: Ideally we check if they've been printed for *this specific sequence*.
                 // Simplified: If we hit a priced item, ensure its parents are visible.
                 // However, "forEach" is sequential. We just need to ensure we output the current context headers if they were the last ones seen.
                 
                 // Since we are iterating strictly, if we see a header, we store it. When we see a priced item, we check if we should print stored headers.
                 // But wait, if we have mixed trades, we only want to print headers if the NEXT priced item matches.
                 // The easiest way is to print them immediately when encountered IF we know there's a child later? No, that requires lookahead.
                 // Better: When we hit a MATCHING priced item, we check if we have unprinted headers in our buffer.
                 
                 // Let's use a "pending" buffer approach is tricky inside a standard loop without state reset.
                 // Actually, simpler: Just print headers if they are "active" and we haven't printed them since they were set.
                 
                 // Let's modify the loop to be stateful about "unprinted headers".
             }
          });
          
          // Re-iterate with stateful printing
          let pendingHeaders: any[] = [];
          
          getSectionItems(section).forEach(item => {
             if (isContextItemType(item.type)) {
                pendingHeaders.push(item);
             } else if (isCostItemType(item.type)) {
                 if (item.tradePackageId === trade.id) {
                     // Flush pending headers
                     pendingHeaders.forEach(h => printHeader(h));
                     pendingHeaders = [];
                     
                     // Print Priced Item
                     const baseData = {
                        ref: item.reference,
                        desc: item.description,
                        unit: item.unit,
                        qty: item.quantity,
                     };

                     // Comparison
                     const compareRowData: any = { ...baseData };
                     analysis.forEach(a => {
                         const rate = project.tenderData?.[item.id]?.[a.id] || 0;
                         compareRowData[`rate_${a.id}`] = rate;
                         compareRowData[`total_${a.id}`] = item.quantity * rate;
                     });
                     const compareRow = compareSheet.addRow(compareRowData);
                     setDescriptionCellValue(compareRow.getCell('desc'), item.description);
                     compareRow.getCell('qty').numFmt = getQuantityNumFmt(item);

                     // Negotiation sheet row (using NEGOTIATED pseudo-contractor if present)
                     const tenderRow = project.tenderData?.[item.id] || {};
                     const attrRow = project.tenderAttributes?.[item.id] || {};
                     const negAttrs = (attrRow as any).NEGOTIATED as { source?: string } | undefined;
                     const negRate = tenderRow.NEGOTIATED || 0;

                     // Decode negotiation metadata from source string
                     let sourceTypeLabel = '';
                     let baseContractorId: string | undefined;
                     let selectedContractorId: string | undefined;
                     if (negAttrs?.source && typeof negAttrs.source === 'string') {
                       const parts = negAttrs.source.split('|');
                       if (parts[0] === 'NEG_BASE' && parts.length >= 2) {
                         sourceTypeLabel = 'Base contractor';
                         baseContractorId = parts[1];
                         selectedContractorId = parts[1];
                       } else if (parts[0] === 'NEG_CHEAPER' && parts.length >= 3) {
                         sourceTypeLabel = 'Cheaper contractor';
                         baseContractorId = parts[1];
                         selectedContractorId = parts[2];
                       } else if (parts[0] === 'NEG_CHEAPEST_ALL' && parts.length >= 3) {
                         sourceTypeLabel = 'Cheapest of all';
                         baseContractorId = parts[1];
                         selectedContractorId = parts[2];
                       }
                     }

                     const baseContractor = baseContractorId
                       ? contractors.find(c => c.id === baseContractorId)
                       : undefined;
                     const selectedContractor = selectedContractorId
                       ? contractors.find(c => c.id === selectedContractorId)
                       : undefined;

                     const baseRate =
                       baseContractor && tenderRow[baseContractor.id] ? tenderRow[baseContractor.id] : 0;

                     const negotiationRow = negotiationSheet.addRow({
                       ref: item.reference,
                       desc: item.description,
                       unit: item.unit,
                       qty: item.quantity,
                       baseName: baseContractor?.name || '',
                       baseRate,
                       selectedFrom: selectedContractor?.name || '',
                       selectedRate: negRate || '',
                       selectedTotal: negRate ? item.quantity * negRate : '',
                       sourceType: sourceTypeLabel || '',
                     });
                     setDescriptionCellValue(negotiationRow.getCell('desc'), item.description);

                     negotiationRow.getCell('qty').numFmt = getQuantityNumFmt(item);
                     negotiationRow.getCell('baseRate').numFmt = '£#,##0.00';
                     negotiationRow.getCell('selectedRate').numFmt = '£#,##0.00';
                     negotiationRow.getCell('selectedTotal').numFmt = '£#,##0.00';

                     // Highlight selected rate in red if it comes from a cheaper / cheapest comparison
                     if (negAttrs?.source && (negAttrs.source.startsWith('NEG_CHEAPER') || negAttrs.source.startsWith('NEG_CHEAPEST_ALL'))) {
                       const selRateCell = negotiationRow.getCell('selectedRate');
                       selRateCell.fill = {
                         type: 'pattern',
                         pattern: 'solid',
                         fgColor: { argb: 'FFFEE2E2' }, // light red
                       };
                       selRateCell.border = {
                         top: { style: 'thin', color: { argb: 'FFEF4444' } },
                         bottom: { style: 'thin', color: { argb: 'FFEF4444' } },
                         left: { style: 'thin', color: { argb: 'FFEF4444' } },
                         right: { style: 'thin', color: { argb: 'FFEF4444' } },
                       };
                     }
                     
                     // Individual
                     analysis.forEach(a => {
                        const sheet = contractorSheets[a.id];
                        const rate = project.tenderData?.[item.id]?.[a.id] || 0;
                        const row = sheet.addRow({
                           ...baseData,
                           rate: rate,
                           total: item.quantity * rate
                        });
                        setDescriptionCellValue(row.getCell('desc'), item.description);
                        row.getCell('qty').numFmt = getQuantityNumFmt(item);
                        row.getCell('rate').numFmt = '£#,##0.00';
                        row.getCell('total').numFmt = '£#,##0.00';
                     });
                 }
             }
          });
          // Clear pending headers at end of section so they don't bleed to next section
          pendingHeaders = [];
      });
  });

  // Add Summary Totals
  analysis.forEach(a => {
     const sheet = contractorSheets[a.id];
     sheet.addRow({});
     const totalRow = sheet.addRow({
        desc: 'TENDER TOTAL',
        total: a.total
     });
     totalRow.font = { bold: true, size: 12 };
     totalRow.getCell('total').numFmt = '£#,##0.00';
     totalRow.getCell('total').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBAF' } };
  });

  // Export
  await downloadExcelWorkbook(workbook, `TenderAnalysis-${trade.name.replace(/\s+/g, '_')}.xlsx`);
};

export const exportTenderApprovalWorkbook = async (
  project: Project,
  trade: TradePackage,
  award: TenderAwardRecord
) => {
  const workbook = await createWorkbook();
  const budgetValue = project.tenderTradeStatus?.[trade.id]?.budgetValue || 0;

  const analysis = (trade.contractors || [])
    .map((contractor) => {
      let total = 0;
      let pricedItems = 0;

      project.bills.forEach((bill) => {
        bill.sections.forEach((section) => {
          getSectionItems(section).forEach((item) => {
            if (item.type === 'PRICED' && item.tradePackageId === trade.id) {
              const rate = project.tenderData?.[item.id]?.[contractor.id] || 0;
              total += item.quantity * rate;
              if (rate > 0) pricedItems += 1;
            }
          });
        });
      });

      return {
        contractorId: contractor.id,
        contractorName: contractor.name,
        total,
        pricedItems,
        budgetVariance: budgetValue > 0 ? total - budgetValue : 0,
        budgetVariancePct: budgetValue > 0 ? (total - budgetValue) / budgetValue : 0,
      };
    })
    .sort((a, b) => a.total - b.total);

  const selectedSummary = analysis.find((entry) => entry.contractorId === award.contractorId);
  const lowestSummary = analysis[0];
  const selectedTotal = selectedSummary?.total || 0;
  const lowestTotal = lowestSummary?.total || 0;
  const variance = selectedTotal - lowestTotal;
  const variancePct = lowestTotal > 0 ? variance / lowestTotal : 0;
  const budgetVariance = budgetValue > 0 ? selectedTotal - budgetValue : 0;
  const budgetVariancePct = budgetValue > 0 ? budgetVariance / budgetValue : 0;
  const winnerRationale = project.tenderTradeStatus?.[trade.id]?.winnerRationale || 'No rationale recorded.';
  const watermarkLabel = award.approvalStatus === 'REJECTED'
    ? 'REJECTED'
    : award.approvalStatus === 'APPROVED'
    ? 'CONFIRMED AND APPROVED'
    : award.approvalStatus === 'SIGNED_APPROVAL_UPLOADED'
      ? 'APPROVAL RETURNED'
      : award.approvalStatus === 'APPROVAL_FORM_CREATED'
        ? 'CHECKED'
        : '';
  const rejectionReason = award.rejectionReason?.trim() || '';

  const summarySheet = workbook.addWorksheet('Tender Approval');
  summarySheet.columns = [
    { header: 'A', key: 'a', width: 22 },
    { header: 'B', key: 'b', width: 18 },
    { header: 'C', key: 'c', width: 18 },
    { header: 'D', key: 'd', width: 22 },
    { header: 'E', key: 'e', width: 18 },
    { header: 'F', key: 'f', width: 18 },
  ];
  summarySheet.views = [{ state: 'frozen', ySplit: 6 }];
  summarySheet.properties.defaultRowHeight = 24;
  summarySheet.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    margins: { left: 0.35, right: 0.35, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };

  summarySheet.mergeCells('A1:C1');
  summarySheet.getCell('A1').value = 'Tender Approval Form';
  summarySheet.getCell('A1').font = { bold: true, size: 20, color: { argb: 'FF0F172A' } };
  summarySheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  summarySheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };

  summarySheet.mergeCells('A2:C2');
  summarySheet.getCell('A2').value = 'Controlled record for tender award, commercial approval, and live bill sign-off.';
  summarySheet.getCell('A2').font = { size: 10, color: { argb: 'FF64748B' } };
  summarySheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'left' };
  if (watermarkLabel) {
    summarySheet.mergeCells('D1:F2');
    summarySheet.getCell('D1').value = watermarkLabel;
    summarySheet.getCell('D1').font = { bold: true, size: 20, color: { argb: award.approvalStatus === 'REJECTED' ? '55DC2626' : '559CA3AF' } };
    summarySheet.getCell('D1').alignment = { horizontal: 'center', vertical: 'middle', textRotation: 15 };
  }

  summarySheet.mergeCells('A4:C4');
  summarySheet.getCell('A4').value = 'Tender and project details';
  summarySheet.getCell('A4').font = { bold: true, color: { argb: 'FF0F172A' } };
  summarySheet.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

  summarySheet.mergeCells('D4:F4');
  summarySheet.getCell('D4').value = 'Commercial summary';
  summarySheet.getCell('D4').font = { bold: true, color: { argb: 'FF0F172A' } };
  summarySheet.getCell('D4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };

  const leftRows: Array<[string, string | number]> = [
    ['Project', project.name],
    ['Trade package', trade.name],
    ['Chosen contractor', award.contractorName],
    ['Budget value', budgetValue > 0 ? budgetValue : 'Not recorded'],
    ['Difference to budget', budgetValue > 0 ? budgetVariance : 'Budget not recorded'],
    ['Difference to budget (%)', budgetValue > 0 ? budgetVariancePct : 'Budget not recorded'],
  ];
  const rightRows: Array<[string, string | number]> = [
    ['Decision', award.approvalStatus === 'REJECTED' ? 'Refused' : award.approvalStatus === 'APPROVED' ? 'Approved' : 'In review'],
    ['Winner selected', new Date(award.selectedAt).toLocaleString()],
    ['Tender due date', project.tenderTradeStatus?.[trade.id]?.dueDate || 'Not recorded'],
    ['Response state', project.tenderTradeStatus?.[trade.id]?.responseState || 'Not recorded'],
    ['Approval form created', award.approvalFormCreatedAt ? new Date(award.approvalFormCreatedAt).toLocaleString() : 'Not yet created'],
    ['Signed approval file', award.signedApproval?.fileName || 'Not uploaded'],
    ['Decision date', award.approvalStatus === 'REJECTED'
      ? (award.rejectedAt ? new Date(award.rejectedAt).toLocaleDateString() : 'Not recorded')
      : (award.approvedAt ? new Date(award.approvedAt).toLocaleDateString() : 'Not recorded')],
  ];

  leftRows.forEach(([field, value], index) => {
    const rowNumber = 5 + index;
    summarySheet.getCell(`A${rowNumber}`).value = field;
    summarySheet.mergeCells(`B${rowNumber}:C${rowNumber}`);
    summarySheet.getCell(`B${rowNumber}`).value = value;
    summarySheet.getCell(`D${rowNumber}`).value = rightRows[index][0];
    summarySheet.mergeCells(`E${rowNumber}:F${rowNumber}`);
    summarySheet.getCell(`E${rowNumber}`).value = rightRows[index][1];
  });

  for (let rowNumber = 5; rowNumber <= 10; rowNumber += 1) {
    ['A', 'D'].forEach((column) => {
      const cell = summarySheet.getCell(`${column}${rowNumber}`);
      cell.font = { bold: true, color: { argb: 'FF334155' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if (column === 'D') {
        cell.border.right = { style: 'thin', color: { argb: 'FFE2E8F0' } };
      }
    });
    ['B', 'E'].forEach((column) => {
      const cell = summarySheet.getCell(`${column}${rowNumber}`);
      cell.alignment = {
        vertical: 'middle',
        wrapText: true,
        horizontal: column === 'B' && rowNumber >= 8 ? 'center' : 'left',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    });
    ['C', 'F'].forEach((column) => {
      const cell = summarySheet.getCell(`${column}${rowNumber}`);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    });
  }
  summarySheet.getCell('B8').numFmt = '"£"#,##0.00';
  if (budgetValue > 0) {
    summarySheet.getCell('B9').numFmt = '"£"#,##0.00';
    summarySheet.getCell('B10').numFmt = '0.00%';
  }

  summarySheet.mergeCells('A12:F12');
  summarySheet.getCell('A12').value = 'Commercial rationale';
  summarySheet.getCell('A12').font = { bold: true, color: { argb: 'FF0F172A' } };
  summarySheet.getCell('A12').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  summarySheet.mergeCells('A13:F16');
  summarySheet.getCell('A13').value = winnerRationale;
  summarySheet.getCell('A13').alignment = { wrapText: true, vertical: 'top' };
  summarySheet.getCell('A13').border = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  const decisionStartRow = 18;
  const approvedOption = award.approvalStatus === 'APPROVED' ? '[X] Approved' : '[ ] Approved';
  const refusedOption = award.approvalStatus === 'REJECTED' ? '[X] Refused' : '[ ] Refused';
  summarySheet.mergeCells(`A${decisionStartRow}:F${decisionStartRow}`);
  summarySheet.getCell(`A${decisionStartRow}`).value = 'Decision';
  summarySheet.getCell(`A${decisionStartRow}`).font = { bold: true, color: { argb: 'FF0F172A' } };
  summarySheet.getCell(`A${decisionStartRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  summarySheet.mergeCells(`A${decisionStartRow + 1}:C${decisionStartRow + 1}`);
  summarySheet.mergeCells(`D${decisionStartRow + 1}:F${decisionStartRow + 1}`);
  summarySheet.getCell(`A${decisionStartRow + 1}`).value = approvedOption;
  summarySheet.getCell(`D${decisionStartRow + 1}`).value = refusedOption;
  summarySheet.getCell(`A${decisionStartRow + 1}`).alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getCell(`D${decisionStartRow + 1}`).alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getCell(`A${decisionStartRow + 1}`).font = { bold: true, color: { argb: award.approvalStatus === 'APPROVED' ? 'FF166534' : 'FF475569' } };
  summarySheet.getCell(`D${decisionStartRow + 1}`).font = { bold: true, color: { argb: award.approvalStatus === 'REJECTED' ? 'FFB91C1C' : 'FF475569' } };
  ['A', 'D'].forEach((column) => {
    const cell = summarySheet.getCell(`${column}${decisionStartRow + 1}`);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: column === 'A' && award.approvalStatus === 'APPROVED' ? 'FFDCFCE7' : column === 'D' && award.approvalStatus === 'REJECTED' ? 'FFFEE2E2' : 'FFFFFFFF' },
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  });

  if (rejectionReason || award.approvalStatus === 'REJECTED') {
    summarySheet.mergeCells(`A${decisionStartRow + 3}:F${decisionStartRow + 3}`);
    summarySheet.getCell(`A${decisionStartRow + 3}`).value = 'Refusal comments';
    summarySheet.getCell(`A${decisionStartRow + 3}`).font = { bold: true, color: { argb: 'FF7F1D1D' } };
    summarySheet.getCell(`A${decisionStartRow + 3}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    summarySheet.mergeCells(`A${decisionStartRow + 4}:F${decisionStartRow + 6}`);
    summarySheet.getCell(`A${decisionStartRow + 4}`).value = rejectionReason || 'No refusal comments recorded.';
    summarySheet.getCell(`A${decisionStartRow + 4}`).alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
    summarySheet.getCell(`A${decisionStartRow + 4}`).border = {
      top: { style: 'thin', color: { argb: 'FFFCA5A5' } },
      bottom: { style: 'thin', color: { argb: 'FFFCA5A5' } },
      left: { style: 'thin', color: { argb: 'FFFCA5A5' } },
      right: { style: 'thin', color: { argb: 'FFFCA5A5' } },
    };
  }

  const signOffStartRow = award.approvalStatus === 'REJECTED' || rejectionReason ? 25 : 21;
  summarySheet.mergeCells(`A${signOffStartRow}:F${signOffStartRow}`);
  summarySheet.getCell(`A${signOffStartRow}`).value = 'Director approval return';
  summarySheet.getCell(`A${signOffStartRow}`).font = { bold: true, color: { argb: 'FF0F172A' } };
  summarySheet.getCell(`A${signOffStartRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

  const signOffRows = [
    ['Returned approval file', award.signedApproval?.fileName || '', 'Director approval 2', award.approvalStatus === 'REJECTED' ? (award.rejectedBy || '') : (award.approvedBy || '')],
    ['Director approval date', award.approvalStatus === 'REJECTED'
      ? (award.rejectedAt ? new Date(award.rejectedAt).toLocaleDateString() : '')
      : (award.approvedAt ? new Date(award.approvedAt).toLocaleDateString() : ''), '', ''],
  ];
  signOffRows.forEach((row, index) => {
    const rowNumber = signOffStartRow + 1 + index;
    summarySheet.getCell(`A${rowNumber}`).value = row[0];
    summarySheet.mergeCells(`B${rowNumber}:C${rowNumber}`);
    summarySheet.getCell(`B${rowNumber}`).value = row[1];
    summarySheet.getCell(`D${rowNumber}`).value = row[2];
    summarySheet.mergeCells(`E${rowNumber}:F${rowNumber}`);
    summarySheet.getCell(`E${rowNumber}`).value = row[3];
    ['A', 'D'].forEach((column) => {
      summarySheet.getCell(`${column}${rowNumber}`).font = { bold: true, color: { argb: 'FF334155' } };
    });
    ['B', 'E'].forEach((column) => {
      const cell = summarySheet.getCell(`${column}${rowNumber}`);
      cell.border = { bottom: { style: 'thin', color: { argb: 'FF94A3B8' } } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
    summarySheet.getRow(rowNumber).height = rowNumber === signOffStartRow + 1 ? 38 : 34;
  });
  const comparisonTitleRow = signOffStartRow + 4;
  summarySheet.mergeCells(`A${comparisonTitleRow}:F${comparisonTitleRow}`);
  summarySheet.getCell(`A${comparisonTitleRow}`).value = 'Tenderer comparison against budget';
  summarySheet.getCell(`A${comparisonTitleRow}`).font = { bold: true, color: { argb: 'FF0F172A' } };
  summarySheet.getCell(`A${comparisonTitleRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

  const comparisonHeaderRow = comparisonTitleRow + 1;
  const comparisonHeaders = ['Selected', 'Tenderer', 'Tender total (£)', 'Budget variance (£)', 'Budget variance (%)', 'Priced items'];
  comparisonHeaders.forEach((header, index) => {
    const cell = summarySheet.getCell(comparisonHeaderRow, index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { horizontal: index === 1 ? 'left' : 'center', vertical: 'middle' };
  });

  analysis.forEach((entry, index) => {
    const rowNumber = comparisonHeaderRow + 1 + index;
    const isSelectedTenderer = entry.contractorId === award.contractorId;
    summarySheet.getCell(`A${rowNumber}`).value = isSelectedTenderer ? 'SELECTED' : '';
    summarySheet.getCell(`B${rowNumber}`).value = entry.contractorName;
    summarySheet.getCell(`C${rowNumber}`).value = entry.total;
    summarySheet.getCell(`D${rowNumber}`).value = budgetValue > 0 ? entry.budgetVariance : 'Budget not recorded';
    summarySheet.getCell(`E${rowNumber}`).value = budgetValue > 0 ? entry.budgetVariancePct : 'Budget not recorded';
    summarySheet.getCell(`F${rowNumber}`).value = entry.pricedItems;
    summarySheet.getCell(`C${rowNumber}`).numFmt = '"£"#,##0.00';
    if (budgetValue > 0) {
      summarySheet.getCell(`D${rowNumber}`).numFmt = '"£"#,##0.00';
      summarySheet.getCell(`E${rowNumber}`).numFmt = '0.00%';
    }
    ['A', 'B', 'C', 'D', 'E', 'F'].forEach((column) => {
      const cell = summarySheet.getCell(`${column}${rowNumber}`);
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
      cell.alignment = {
        vertical: 'middle',
        horizontal:
          column === 'B'
            ? 'left'
            : column === 'A' || column === 'F'
              ? 'center'
              : 'right',
      };
      if ((column === 'D' || column === 'E') && budgetValue > 0) {
        cell.font = {
          ...(cell.font || {}),
          color: { argb: entry.budgetVariance > 0 ? 'FFB91C1C' : entry.budgetVariance < 0 ? 'FF166534' : 'FF334155' },
        };
      }
    });
    if (isSelectedTenderer) {
      ['A', 'B', 'C', 'D', 'E', 'F'].forEach((column) => {
        const cell = summarySheet.getCell(`${column}${rowNumber}`);
        cell.font = { bold: true, color: { argb: 'FF0F172A' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
      });
    }
  });

  const signingTitleRow = comparisonHeaderRow + analysis.length + 3;
  summarySheet.mergeCells(`A${signingTitleRow}:F${signingTitleRow}`);
  summarySheet.getCell(`A${signingTitleRow}`).value = 'Approval signatures';
  summarySheet.getCell(`A${signingTitleRow}`).font = { bold: true, color: { argb: 'FF0F172A' } };
  summarySheet.getCell(`A${signingTitleRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

  const signatureRows = [
    { role: 'Prepared by', name: award.preparedBy || '', date: award.approvalFormCreatedAt ? new Date(award.approvalFormCreatedAt).toLocaleDateString() : '' },
    { role: 'Director approval 1', name: award.checkedBy || '', date: award.approvalFormCreatedAt ? new Date(award.approvalFormCreatedAt).toLocaleDateString() : '' },
    { role: 'Director approval 2', name: award.approvedBy || '', date: award.approvedAt ? new Date(award.approvedAt).toLocaleDateString() : '' },
  ];

  const signatureHeaderRow = signingTitleRow + 1;
  summarySheet.getCell(`A${signatureHeaderRow}`).value = 'Role';
  summarySheet.mergeCells(`B${signatureHeaderRow}:C${signatureHeaderRow}`);
  summarySheet.getCell(`B${signatureHeaderRow}`).value = 'Name';
  summarySheet.mergeCells(`D${signatureHeaderRow}:E${signatureHeaderRow}`);
  summarySheet.getCell(`D${signatureHeaderRow}`).value = 'Signature';
  summarySheet.getCell(`F${signatureHeaderRow}`).value = 'Date';
  ['A', 'B', 'D', 'F'].forEach((column) => {
    const cell = summarySheet.getCell(`${column}${signatureHeaderRow}`);
    cell.font = { bold: true, color: { argb: 'FF475569' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  });
  summarySheet.getRow(signatureHeaderRow).height = 24;

  signatureRows.forEach((entry, index) => {
    const rowNumber = signatureHeaderRow + 1 + index;
    summarySheet.getCell(`A${rowNumber}`).value = entry.role;
    summarySheet.mergeCells(`B${rowNumber}:C${rowNumber}`);
    summarySheet.getCell(`B${rowNumber}`).value = entry.name;
    summarySheet.mergeCells(`D${rowNumber}:E${rowNumber}`);
    summarySheet.getCell(`D${rowNumber}`).value = '';
    summarySheet.getCell(`F${rowNumber}`).value = entry.date;
    ['A'].forEach((column) => {
      summarySheet.getCell(`${column}${rowNumber}`).font = { bold: true, color: { argb: 'FF334155' } };
    });
    ['B', 'D', 'F'].forEach((column) => {
      const cell = summarySheet.getCell(`${column}${rowNumber}`);
      cell.border = { bottom: { style: 'thin', color: { argb: 'FF64748B' } } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
    summarySheet.getRow(rowNumber).height = 48;
  });

  for (let row = 1; row <= signatureHeaderRow + signatureRows.length + 2; row += 1) {
    if (row === 3) {
      summarySheet.getRow(row).height = 8;
      continue;
    }
    summarySheet.getRow(row).height = summarySheet.getRow(row).height || 22;
  }

  const fileName = `Tender-Approval-${project.name.replace(/\s+/g, '_')}-${trade.name.replace(/\s+/g, '_')}.xlsx`;
  await downloadExcelWorkbook(workbook, fileName);
  return fileName;
};

/** Blank tender document: one worksheet with bill/section structure and PRICED items (ref, description, unit, qty only; rate/total empty for contractors to fill). */
export const exportBlankTenderTemplate = async (project: Project, trade: TradePackage) => {
  const workbook = await createWorkbook();

  const summarySheet = workbook.addWorksheet('Tender Summary');
  summarySheet.columns = [
    { key: 'a', width: 22 },
    { key: 'b', width: 30 },
    { key: 'c', width: 18 },
    { key: 'd', width: 18 },
  ];
  summarySheet.mergeCells('A1:D1');
  summarySheet.getCell('A1').value = 'Blank Tender Workbook';
  summarySheet.getCell('A1').font = { bold: true, size: 18, color: { argb: 'FF0F172A' } };
  summarySheet.mergeCells('A2:D2');
  summarySheet.getCell('A2').value = `${project.name}  |  ${trade.name}`;
  summarySheet.getCell('A2').font = { size: 10, color: { argb: 'FF64748B' } };

  const usedSheetNames = new Set<string>(['Tender Summary']);
  const relevantSections = project.bills.flatMap((bill) =>
    bill.sections
      .filter((section) =>
        getSectionItems(section).some(
          (item) => ['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(item.type) && item.tradePackageId === trade.id
        )
      )
      .map((section) => ({ bill, section }))
  );

  const headerRow = 5;
  ['Bill', 'Section', 'Sheet'].forEach((label, index) => {
    const cell = summarySheet.getCell(headerRow, index + 1);
    cell.value = label;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  });

  relevantSections.forEach(({ bill, section }, index) => {
    const sheetName = buildUniqueSheetName(`${bill.name} - ${section.name}`, usedSheetNames, `Section ${index + 1}`);
    const sheet = workbook.addWorksheet(sheetName);
    configureBoqSheet(sheet);
    addTenderBlankSectionSheetContent(sheet, bill, section, trade);

    const rowNumber = headerRow + 1 + index;
    summarySheet.getCell(`A${rowNumber}`).value = bill.name;
    summarySheet.getCell(`B${rowNumber}`).value = section.name;
    summarySheet.getCell(`C${rowNumber}`).value = sheetName;
  });

  await downloadExcelWorkbook(workbook, `Tender-Blank-${trade.name.replace(/\s+/g, '_')}.xlsx`);
};

/** One Excel with one sheet per contractor: same structure, ref/description/unit/qty only (blank rate/total for each contractor to fill). */
export const exportTenderSheetsTemplate = async (project: Project, trade: TradePackage) => {
  const workbook = await createWorkbook();

  const contractors = trade.contractors || [];
  const contractorSheets: Record<string, ExcelJS.Worksheet> = {};

  if (contractors.length === 0) {
    const fallbackSheet = workbook.addWorksheet('Instructions');
    fallbackSheet.addRow(['No contractors in this trade.']).font = { bold: true };
    fallbackSheet.addRow(['Add contractors to the trade, then export again to get one sheet per contractor.']);
    await downloadExcelWorkbook(workbook, `Tender-Sheets-${trade.name.replace(/\s+/g, '_')}.xlsx`);
    return;
  }

  contractors.forEach((c) => {
    const sheetName = `Bill - ${c.name}`.substring(0, 31);
    const sheet = workbook.addWorksheet(sheetName);
    sheet.columns = [
      { header: 'Ref', key: 'ref', width: 10, style: { alignment: { vertical: 'top' } } },
      { header: 'Description', key: 'desc', width: 60, style: { alignment: { wrapText: true, vertical: 'top' } } },
      { header: 'Unit', key: 'unit', width: 10, style: { alignment: { vertical: 'top', horizontal: 'center' } } },
      { header: 'Qty', key: 'qty', width: 12, style: { alignment: { vertical: 'top', horizontal: 'right' } } },
      { header: 'Rate (£)', key: 'rate', width: 15, style: { alignment: { vertical: 'top', horizontal: 'right' } } },
      { header: 'Total (£)', key: 'total', width: 15, style: { alignment: { vertical: 'top', horizontal: 'right' } } },
    ];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
    contractorSheets[c.id] = sheet;
  });

  const printHeader = (item: BoQItem, s: ExcelJS.Worksheet) => {
    const rowData = { ref: '', desc: item.description, unit: '', qty: '' as number | '' };
    const row = s.addRow(rowData);
    setDescriptionCellValue(row.getCell('desc'), item.description);
    applyContextItemFont(row, item.type);
  };

  project.bills.forEach((bill) => {
    Object.values(contractorSheets).forEach((s) => s.addRow({ desc: bill.name.toUpperCase() }).font = { bold: true });
    bill.sections.forEach((section) => {
      Object.values(contractorSheets).forEach((s) => s.addRow({ desc: section.name }).font = { bold: true, italic: true });
      let pendingHeaders: BoQItem[] = [];
      getSectionItems(section).forEach((item) => {
        if (isContextItemType(item.type)) {
          pendingHeaders.push(item);
        } else if (isCostItemType(item.type) && item.tradePackageId === trade.id) {
          pendingHeaders.forEach((h) => Object.values(contractorSheets).forEach((s) => printHeader(h, s)));
          pendingHeaders = [];
          const rowData = {
            ref: item.reference,
            desc: item.description,
            unit: item.unit,
            qty: item.quantity,
            rate: '' as number | '',
            total: '' as number | '',
          };
          Object.values(contractorSheets).forEach((s) => {
            const row = s.addRow(rowData);
            setDescriptionCellValue(row.getCell('desc'), item.description);
            row.getCell('qty').numFmt = getQuantityNumFmt(item);
          });
        }
      });
    });
  });

  await downloadExcelWorkbook(workbook, `Tender-Sheets-${trade.name.replace(/\s+/g, '_')}.xlsx`);
};

