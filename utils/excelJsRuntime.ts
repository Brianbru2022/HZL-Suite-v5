import type * as ExcelJS from 'exceljs';
import { APP_EXPORT_CREATOR } from './branding';

type ExcelJSRuntime = typeof import('exceljs');

let excelJsRuntimePromise: Promise<ExcelJSRuntime> | null = null;

function resolveExcelJSRuntime(module: unknown): ExcelJSRuntime {
  const directRuntime = module as Partial<ExcelJSRuntime>;
  if (typeof directRuntime.Workbook === 'function') {
    return directRuntime as ExcelJSRuntime;
  }

  const defaultRuntime = (module as { default?: Partial<ExcelJSRuntime> }).default;
  if (typeof defaultRuntime?.Workbook === 'function') {
    return defaultRuntime as ExcelJSRuntime;
  }

  throw new Error('Excel export runtime could not be loaded.');
}

export function loadExcelJS() {
  excelJsRuntimePromise ??= import('exceljs').then(resolveExcelJSRuntime);
  return excelJsRuntimePromise;
}

export async function createExcelWorkbook(): Promise<ExcelJS.Workbook> {
  const ExcelJSRuntime = await loadExcelJS();
  const workbook = new ExcelJSRuntime.Workbook();
  workbook.creator = APP_EXPORT_CREATOR;
  workbook.lastModifiedBy = APP_EXPORT_CREATOR;
  workbook.created = new Date();
  workbook.modified = new Date();
  return workbook;
}
