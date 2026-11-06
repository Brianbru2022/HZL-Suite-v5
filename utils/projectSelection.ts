import type { BoQBill, Project } from '../types';

function getBillPageCount(bill: BoQBill): number {
  const pageCount = bill.sections.reduce((sum, section) => sum + (section.pages?.length || 0), 0);
  return pageCount > 0 ? pageCount : 1;
}

function getBillItemCount(bill: BoQBill): number {
  if (bill.sections.length === 0) return bill.items?.length || 0;
  return bill.sections.reduce((sum, section) => {
    if (section.pages?.length) {
      return sum + section.pages.reduce((pageSum, page) => pageSum + (page.items?.length || 0), 0);
    }
    return sum + (section.items?.length || 0);
  }, 0);
}

export function getPreferredBillId(project: Project | null | undefined): string | null {
  if (!project?.bills?.length) return null;

  const rankedBills = [...project.bills].sort((a, b) => {
    const pageDelta = getBillPageCount(b) - getBillPageCount(a);
    if (pageDelta !== 0) return pageDelta;

    const itemDelta = getBillItemCount(b) - getBillItemCount(a);
    if (itemDelta !== 0) return itemDelta;

    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });

  return rankedBills[0]?.id || project.bills[0]?.id || null;
}
