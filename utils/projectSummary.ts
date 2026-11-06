import type { BoQBill, Project, ProjectSummaryMode } from '../types';
import { calculateBillBaseTotal, calculateBillSummaryTotal, calculateSectionBaseTotal, getBillQuantityMultiplier, safeAdd, safeMul } from './calculations';

export interface ProjectSummaryRow {
  id: string;
  billId: string;
  billName: string;
  billType: 'STANDARD' | 'HOUSE_TYPE';
  sectionId?: string;
  sectionName?: string;
  unitCount: number;
  baseValue: number;
  summaryValue: number;
}

export interface ProjectSummaryData {
  mode: ProjectSummaryMode;
  rows: ProjectSummaryRow[];
  baseTotal: number;
  summaryTotal: number;
  houseTypeCount: number;
}

function getBillType(bill: BoQBill): 'STANDARD' | 'HOUSE_TYPE' {
  return bill.billType === 'HOUSE_TYPE' ? 'HOUSE_TYPE' : 'STANDARD';
}

function getSummaryBillName(bill: BoQBill): string {
  if (bill.billType === 'HOUSE_TYPE') {
    return bill.houseTypeName?.trim() || bill.name;
  }
  return bill.name;
}

export function buildProjectSummary(project: Project, mode: ProjectSummaryMode): ProjectSummaryData {
  const rows: ProjectSummaryRow[] = [];

  for (const bill of project.bills || []) {
    const unitCount = getBillQuantityMultiplier(bill);
    const billType = getBillType(bill);

    if (mode === 'BILLS' || (bill.sections || []).length === 0) {
      const baseValue = calculateBillBaseTotal(bill);
      rows.push({
        id: bill.id,
        billId: bill.id,
        billName: getSummaryBillName(bill),
        billType,
        unitCount,
        baseValue,
        summaryValue: calculateBillSummaryTotal(bill),
      });
      continue;
    }

    for (const section of bill.sections || []) {
      const baseValue = calculateSectionBaseTotal(section);
      rows.push({
        id: `${bill.id}:${section.id}`,
        billId: bill.id,
        billName: getSummaryBillName(bill),
        billType,
        sectionId: section.id,
        sectionName: section.name,
        unitCount,
        baseValue,
        summaryValue: safeMul(baseValue, unitCount),
      });
    }
  }

  const baseTotal = rows.reduce((acc, row) => safeAdd(acc, row.baseValue), 0);
  const summaryTotal = rows.reduce((acc, row) => safeAdd(acc, row.summaryValue), 0);
  const houseTypeCount = project.bills.filter((bill) => bill.billType === 'HOUSE_TYPE').length;

  return {
    mode,
    rows,
    baseTotal,
    summaryTotal,
    houseTypeCount,
  };
}
