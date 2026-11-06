import type { BoQItem, ItemType } from '../types';
import { generateId } from './generateId';
import { loadExcelJS } from './excelJsRuntime';

export type WorkbookColumnMap = { description: number; quantity?: number; unit?: number; rate?: number; value?: number; reference?: number };
export type WorkbookImportLine = { rowNumber: number; type: ItemType; reference: string; description: string; quantity: number; unit: string; rate: number; total: number };
export type WorkbookImportPreview = { sheets: string[]; headers: string[]; lines: WorkbookImportLine[]; sourceTotal: number; importedTotal: number; mismatch: number };

const heading = (text: string) => /^(?:section|bill|[A-Z0-9 .,&/-]{4,})$/.test(text.trim()) && !/\d+[.,]\d{2}/.test(text);
const comment = (text: string) => /^(?:note|comment|assumption|allowance)\b/i.test(text.trim());
const numeric = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[£,]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};
const cellText = (cell: { text?: string; value?: unknown }) => String(cell.text ?? cell.value ?? '').trim();

export async function inspectBoqWorkbook(file: File, sheetName?: string, mapping?: WorkbookColumnMap): Promise<WorkbookImportPreview> {
  const ExcelJS = await loadExcelJS(); const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await file.arrayBuffer());
  const sheets = workbook.worksheets.map((sheet) => sheet.name); const sheet = workbook.getWorksheet(sheetName || sheets[0]);
  if (!sheet) throw new Error('The selected worksheet is unavailable.');
  const headers = (sheet.getRow(1).values as unknown[]).slice(1).map((value) => String(value ?? '').trim());
  const auto = (names: string[]) => Math.max(0, headers.findIndex((header) => names.some((name) => header.toLowerCase().includes(name))) + 1);
  const map = mapping || { description: auto(['description', 'item', 'particular']), quantity: auto(['qty', 'quantity']), unit: auto(['unit']), rate: auto(['rate']), value: auto(['value', 'total', 'amount']), reference: auto(['ref', 'item no']) };
  if (!map.description) throw new Error('Map a description column before importing this worksheet.');
  const lines: WorkbookImportLine[] = []; let sourceTotal = 0;
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const description = cellText(row.getCell(map.description)); if (!description) return;
    const quantity = map.quantity ? numeric(row.getCell(map.quantity).value) : 0; const rate = map.rate ? numeric(row.getCell(map.rate).value) : 0;
    const value = map.value ? numeric(row.getCell(map.value).value) : 0; const total = value || quantity * rate;
    sourceTotal += value;
    const type: ItemType = comment(description) ? 'COMMENT' : heading(description) && !quantity && !rate && !value ? 'MAJOR_HEADING' : 'PRICED';
    lines.push({ rowNumber, type, reference: map.reference ? cellText(row.getCell(map.reference)) : '', description, quantity, unit: map.unit ? cellText(row.getCell(map.unit)).toLowerCase() : '', rate, total });
  });
  const importedTotal = lines.filter((line) => line.type === 'PRICED').reduce((total, line) => total + line.total, 0);
  return { sheets, headers, lines, sourceTotal, importedTotal, mismatch: importedTotal - sourceTotal };
}

export function createBoqItemsFromWorkbookLines(lines: WorkbookImportLine[]): BoQItem[] {
  return lines.map((line) => ({ id: generateId(), type: line.type, reference: line.reference, description: line.description, unit: line.type === 'PRICED' ? line.unit : '', quantity: line.type === 'PRICED' ? line.quantity : 0, rate: line.type === 'PRICED' ? line.rate : 0, total: line.type === 'PRICED' ? line.total : 0, quantityDecimals: 3 }));
}
