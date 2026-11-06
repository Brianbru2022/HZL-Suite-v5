
import { Project, BoQBill, BoQSection, BoQPage, UnitType, BoQItem, DimensionRow } from '../types';

// Precision Math Helpers to avoid IEEE 754 floating point errors
const PRECISION = 1000000;

export const safeAdd = (a: number, b: number): number => Math.round((a + b) * PRECISION) / PRECISION;
export const safeSub = (a: number, b: number): number => Math.round((a - b) * PRECISION) / PRECISION;
export const safeMul = (a: number, b: number): number => Math.round((a * b) * PRECISION) / PRECISION;
export const safeDiv = (a: number, b: number): number => b === 0 ? 0 : Math.round((a / b) * PRECISION) / PRECISION;

export const calculateRowValue = (row: DimensionRow, unit: string): number => {
  let val = row.multiplier ?? 1;
  
  // Logic based on unit type
  if (unit === UnitType.M) {
    val = safeMul(val, row.length);
  } else if (unit === UnitType.M2) {
    // Area: support both QS conventions.
    // - Length × height: common for wall/floor areas (length along run, height).
    // - Length × width when height is 0: common for plan area (e.g. slab, paving).
    const height = row.height ?? 0;
    const width = row.width ?? 0;
    const areaDim2 = height > 0 ? height : width;
    val = safeMul(val, safeMul(row.length, areaDim2));
  } else if (unit === UnitType.M3) {
    // Volume: L * W * H
    val = safeMul(val, safeMul(row.length, safeMul(row.width, row.height)));
  } else if (unit === UnitType.NR) {
     // Number: Just the multiplier (or 'Times')
     // Sometimes users put 1 in 'L', but strictly 'nr' is usually just the count.
     // However, to be flexible, if they entered dimensions, we might ignore them OR
     // treat 'L' as a quantity if multiplier is 1. 
     // Standard practice: Just return multiplier.
  }
  
  return val;
};

export const calculateItemQuantity = (dimensionRows: DimensionRow[], unit: string): number => {
  if (!dimensionRows || dimensionRows.length === 0) return 0;
  
  let total = 0;
  
  dimensionRows.forEach(row => {
    const rowVal = calculateRowValue(row, unit);
    if (row.isDeduction) {
      total = safeSub(total, rowVal);
    } else {
      total = safeAdd(total, rowVal);
    }
  });

  return total;
};

export const calculateProjectTotal = (project: Project): number => {
  return (project.bills || []).reduce((acc, bill) => {
    // Bill-level items when no sections
    let billTotal = 0;
    if ((bill.sections || []).length === 0 && (bill.items || []).length > 0) {
      billTotal = (bill.items || []).reduce((iAcc: number, item: BoQItem) => {
        return safeAdd(iAcc, ['PRICED', 'EXTRA_OVER_ITEM'].includes(item.type) ? (item.total || 0) : 0);
      }, 0);
    }
    const sectionTotal = (bill.sections || []).reduce((sAcc, section: BoQSection) => {
      const items = (section.pages && section.pages.length > 0)
        ? (section.pages || []).flatMap((p: BoQPage) => p.items || [])
        : (section.items || []);
      return safeAdd(sAcc, items.reduce((iAcc: number, item: BoQItem) => {
        return safeAdd(iAcc, ['PRICED', 'EXTRA_OVER_ITEM'].includes(item.type) ? (item.total || 0) : 0);
      }, 0));
    }, 0);
    return safeAdd(acc, safeAdd(billTotal, sectionTotal));
  }, 0);
};

export const getSectionItems = (section: BoQSection): BoQItem[] => {
  if (section.pages && section.pages.length > 0) {
    return (section.pages || []).flatMap((page: BoQPage) => page.items || []);
  }
  return section.items || [];
};

export const getBillItems = (bill: BoQBill): BoQItem[] => {
  if ((bill.sections || []).length > 0) {
    return bill.sections.flatMap((section) => getSectionItems(section));
  }
  return bill.items || [];
};

export const calculateSectionBaseTotal = (section: BoQSection): number => {
  return getSectionItems(section).reduce((acc, item) => {
    return safeAdd(acc, ['PRICED', 'EXTRA_OVER_ITEM'].includes(item.type) ? (item.total || 0) : 0);
  }, 0);
};

export const getBillQuantityMultiplier = (bill: BoQBill): number => {
  if (bill.billType === 'HOUSE_TYPE') {
    return Math.max(1, Number(bill.houseTypeQuantity) || 1);
  }
  return 1;
};

export const calculateBillBaseTotal = (bill: BoQBill): number => {
  if ((bill.sections || []).length > 0) {
    return bill.sections.reduce((acc, section) => safeAdd(acc, calculateSectionBaseTotal(section)), 0);
  }
  return (bill.items || []).reduce((acc, item) => safeAdd(acc, ['PRICED', 'EXTRA_OVER_ITEM'].includes(item.type) ? (item.total || 0) : 0), 0);
};

export const calculateBillSummaryTotal = (bill: BoQBill): number => {
  return safeMul(calculateBillBaseTotal(bill), getBillQuantityMultiplier(bill));
};

/**
 * Defines when a priced item is considered "complete" for progress calculation.
 * Change this rule to match workflow (e.g. require quantity filled, dimensions complete).
 */
export function isItemPricedAndComplete(item: BoQItem): boolean {
  if (item.type !== 'PRICED' && item.type !== 'EXTRA_OVER_ITEM') return false;
  return item.rate > 0;
}

export const calculateProjectProgress = (project: Project): number => {
  let totalPriced = 0;
  let totalCompleted = 0;
  const count = (item: BoQItem) => {
    if (item.type === 'PRICED' || item.type === 'EXTRA_OVER_ITEM') {
      totalPriced++;
      if (isItemPricedAndComplete(item)) totalCompleted++;
    }
  };
  project.bills?.forEach((b) => {
    if ((b.sections || []).length === 0) {
      (b.items || []).forEach(count);
    }
    (b.sections || []).forEach((s: BoQSection) => {
      if (s.pages && s.pages.length > 0) {
        s.pages.forEach((p: BoQPage) => (p.items || []).forEach(count));
      } else {
        (s.items || []).forEach(count);
      }
    });
  });
  return totalPriced === 0 ? 0 : Math.round((totalCompleted / totalPriced) * 100);
};

// Dynamic Reference Generation
// Alphabetic codes: 0→A, 1→B, …, 25→Z, 26→AA, 27→AB, …, 51→AZ, 52→BA, …, 701→ZZ. Indices 702+ need extension.
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const getSectionReference = (sectionIndex: number): string => {
  if (sectionIndex < 26) return ALPHABET[sectionIndex];
  return `${ALPHABET[Math.floor(sectionIndex / 26) - 1]}${ALPHABET[sectionIndex % 26]}`;
};

/**
 * Reindex item references within a bill.
 *
 * Reference pattern: <Bill>-<Section>-<Page>-<OrderOnPage>
 * - When bill has no sections: bill.items use section 01, page 01.
 * - When section has no pages: section.items use page 01.
 * - When section has pages: page.items use page code 01, 02, ...
 */
export const reindexBillReferences = (bill: BoQBill, billIndex: number = 0): BoQBill => {
  const billCode = getSectionReference(billIndex);
  const isCost = (item: BoQItem) => ['PRICED', 'PROVISIONAL_SUM', 'PC_SUM'].includes(item.type);

  const assignRefs = (items: BoQItem[], sectionCode: string, pageCode: string): BoQItem[] => {
    let orderCounter = 0;
    return items.map((item: BoQItem) => {
      if (!isCost(item)) return { ...item, reference: '' };
      orderCounter += 1;
      const orderCode = String(orderCounter).padStart(2, '0');
      return { ...item, reference: `${billCode}-${sectionCode}-${pageCode}-${orderCode}` };
    });
  };

  // Bill-level items (no sections)
  const billItems = (bill.sections || []).length === 0 && (bill.items || []).length > 0
    ? assignRefs([...(bill.items || [])], '01', '01')
    : bill.items;

  const newSections = (bill.sections || []).map((section: BoQSection, sectionIdx: number) => {
    const sectionCode = String(sectionIdx + 1).padStart(2, '0');

    if (section.pages && section.pages.length > 0) {
      const newPages = section.pages.map((page: BoQPage, pageIdx: number) => {
        const pageCode = String(pageIdx + 1).padStart(2, '0');
        return { ...page, items: assignRefs([...(page.items || [])], sectionCode, pageCode) };
      });
      return { ...section, pages: newPages };
    }

    const newItems = assignRefs([...(section.items || [])], sectionCode, '01');
    return { ...section, items: newItems };
  });

  return { ...bill, items: billItems, sections: newSections };
};
