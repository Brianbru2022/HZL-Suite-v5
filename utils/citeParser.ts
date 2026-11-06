import { Project, BoQBill, BoQSection, BoQItem, BoQPage, UnitType, ItemType, ImportQaSummary } from '../types';
import { generateId } from './generateId';

export interface ColumnMapping {
  hasHeader: boolean;
  map: {
    reference: number;
    description: number;
    unit: number;
    quantity: number;
    rate: number;
    type: number;
  };
}

export type CiteParseStrategy = 'mapped' | 'cite' | 'structured' | 'heuristic';

export interface ParseCiteResult {
  project: Project;
  strategy: CiteParseStrategy;
  summary: ImportQaSummary;
}

type LegacyBillState = {
  bill: BoQBill;
  section: BoQSection;
  pages: Map<string, BoQPage>;
};

type StructuredCsvSectionState = {
  section: BoQSection;
  pages: Map<string, BoQPage>;
};

type StructuredCsvBillState = {
  bill: BoQBill;
  sections: Map<string, StructuredCsvSectionState>;
  currentSectionKey: string;
};

const LEGACY_NUMERIC_RECORD_RE = /^\s*([123459LP])\s+/;
const LEGACY_HEADER_RE = /^[A-Z0-9]{2,12}=/;
const LEGACY_CODE_RE = /^[A-Z]\.[A-Z0-9.]+$/;

export const parseCiteFile = async (files: FileList | File[], mapping?: ColumnMapping): Promise<ParseCiteResult | null> => {
  const fileArray = Array.from(files);
  if (fileArray.length === 0) return null;

  const readFileWithEncoding = (file: File, encoding = 'windows-1252'): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve((event.target?.result as string) || '');
      reader.onerror = (event) => reject(event);
      reader.readAsText(file, encoding);
    });

  let ebqContent = '';
  let ebcContent = '';
  let mainFileName = '';

  for (const file of fileArray) {
    const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : '';
    const content = await readFileWithEncoding(file, 'windows-1252');
    const normalizedContent = cleanImportedText(content);
    const looksLikeScheduleText =
      looksLikeStructuredLegacyCsv(normalizedContent)
      || looksLikeLegacyNumericCite(normalizedContent)
      || looksLikeLetteredCite(normalizedContent)
      || normalizedContent.startsWith('"Bill","Page","Item","Section","Description"')
      || normalizedContent.startsWith('Bill,Page,Item,Section,Description');

    if (ext === 'ebq' || ext === 'csv' || ext === 'txt' || ext === 'tsv' || (!ext && looksLikeScheduleText)) {
      ebqContent = content;
      mainFileName = file.name;
    } else if (ext === 'ebc') {
      ebcContent = content;
    }
  }

  if (!ebqContent) return null;

  const project = createImportedProject(mainFileName);

  if (mapping) {
    const mappedProject = parseMappedCSV(ebqContent, mapping, project);
    return { project: mappedProject, strategy: 'mapped', summary: buildImportQaSummary(mappedProject) };
  }

  if (looksLikeStructuredLegacyCsv(ebqContent)) {
    const { project: structuredProject, summary } = parseStructuredLegacyCsvWithSummary(ebqContent, project);
    if (hasImportedContent(structuredProject)) {
      return { project: structuredProject, strategy: 'structured', summary };
    }
  }

  const descriptionLib = parseDescriptionLibrary(ebcContent);

  if (looksLikeLegacyNumericCite(ebqContent)) {
    const legacyProject = parseLegacyNumericCite42(ebqContent, project);
    if (hasImportedContent(legacyProject)) {
      return {
        project: legacyProject,
        strategy: 'cite',
        summary: buildImportQaSummary(legacyProject, { headingsPromoted: countHeadingLikeItems(legacyProject) }),
      };
    }
  }

  if (looksLikeLetteredCite(ebqContent)) {
    const citeProject = parseLetteredCite(ebqContent, project, descriptionLib);
    if (hasImportedContent(citeProject)) {
      return {
        project: citeProject,
        strategy: 'cite',
        summary: buildImportQaSummary(citeProject, { headingsPromoted: countHeadingLikeItems(citeProject) }),
      };
    }
  }

  const heuristicProject = parseHeuristicCSV(ebqContent, project);
  if (!hasImportedContent(heuristicProject)) return null;
  return { project: heuristicProject, strategy: 'heuristic', summary: buildImportQaSummary(heuristicProject) };
};

function createImportedProject(mainFileName: string): Project {
  return {
    id: generateId(),
    name: mainFileName.replace(/\.[^/.]+$/, '') || 'Imported Project',
    client: 'Imported CITE Project',
    location: '',
    reference: 'IMP',
    updatedAt: new Date().toISOString(),
    measurementStandard: 'SMM7',
    ohpPercentage: 0,
    bills: [],
    billWorkspaceLayout: 'FULL_BILL',
    showStickyBillTotals: true,
  };
}

function parseDescriptionLibrary(content: string): Map<string, string> {
  const descriptionLib = new Map<string, string>();
  if (!content) return descriptionLib;

  const lines = cleanImportedText(content).split(/\r?\n/);
  for (const line of lines) {
    const parts = parseCiteLine(line);
    if (parts[0] === 'D' && parts[1]) {
      descriptionLib.set(parts[1], parts[2] || '');
    }
  }

  return descriptionLib;
}

function looksLikeStructuredLegacyCsv(content: string): boolean {
  const rows = parseDelimitedTable(content, ',').slice(0, 3);
  if (rows.length === 0) return false;
  const header = rows[0].map(normalizeHeaderCell);
  return ['bill', 'page', 'item', 'description', 'quantity'].every((key) => header.includes(key));
}

function looksLikeLegacyNumericCite(content: string): boolean {
  const cleaned = cleanImportedText(content);
  return cleaned.includes('VER=CITE42') && /(?:^|\n)\s*9\s+\d+\/\d+\/[A-Z0-9]+/m.test(cleaned);
}

function looksLikeLetteredCite(content: string): boolean {
  const lines = cleanImportedText(content).split(/\r?\n/);
  let hasBill = false;
  let hasItemOrSection = false;

  for (let i = 0; i < Math.min(lines.length, 50); i += 1) {
    const line = lines[i].trim();
    if (!line || LEGACY_HEADER_RE.test(line)) continue;
    const parts = parseCiteLine(line);
    const code = (parts[0] || '').toUpperCase();
    if (parts[0]?.length === 1) {
      if (code === 'B') hasBill = true;
      if (code === 'C' || code === 'E') hasItemOrSection = true;
    }
  }

  return hasBill && hasItemOrSection;
}

export function parseStructuredLegacyCsvWithSummary(content: string, project: Project): { project: Project; summary: ImportQaSummary } {
  const rows = parseDelimitedTable(content, ',');
  if (rows.length === 0) {
    return { project, summary: buildImportQaSummary(project) };
  }

  const header = rows[0].map(normalizeHeaderCell);
  const billIdx = header.indexOf('bill');
  const pageIdx = header.indexOf('page');
  const itemIdx = header.indexOf('item');
  const sectionIdx = header.indexOf('section');
  const descriptionIdx = header.indexOf('description');
  const quantityIdx = header.indexOf('quantity');
  const unitIdx = header.indexOf('units');
  const rateIdx = header.indexOf('net rate');
  const valueIdx = header.indexOf('net value');

  if ([billIdx, pageIdx, itemIdx, descriptionIdx, quantityIdx, unitIdx].some((idx) => idx === -1)) {
    return { project, summary: buildImportQaSummary(project, { rowsSkipped: Math.max(rows.length - 1, 0) }) };
  }

  const bills = new Map<string, StructuredCsvBillState>();
  let rowsSkipped = 0;
  let headingsPromoted = 0;
  let sectionsInferred = 0;

  for (const row of rows.slice(1)) {
    const billCode = getRowValue(row, billIdx);
    if (!billCode) {
      rowsSkipped += 1;
      continue;
    }

    const billState = ensureStructuredCsvBillState(
      bills,
      billCode,
      `${billCode} - Imported schedule`
    );

    const pageCode = getRowValue(row, pageIdx) || '1';
    const itemRef = getRowValue(row, itemIdx);
    const description = getRowValue(row, descriptionIdx);
    const sectionHint = sectionIdx > -1 ? getRowValue(row, sectionIdx) : '';
    const sectionKeyFromHint = normalizeStructuredSectionKey(sectionHint);
    const qty = parseNumber(getRowValue(row, quantityIdx));
    const rate = parseNumber(getRowValue(row, rateIdx));
    const importedTotal = parseNumber(getRowValue(row, valueIdx));
    const unitRaw = getRowValue(row, unitIdx);

    if (!itemRef) {
      const headingText = description || sectionHint;
      if (!headingText) {
        rowsSkipped += 1;
        continue;
      }
      if (billState.bill.name.endsWith('Imported schedule') && isLikelyBillTitle(headingText)) {
        billState.bill.name = `${billCode} - ${headingText}`;
        continue;
      }

      const sectionResult = ensureStructuredCsvSectionState(
        billState,
        sectionKeyFromHint || billState.currentSectionKey,
        sectionHint || 'Imported schedule'
      );
      if (sectionResult.created && sectionKeyFromHint) sectionsInferred += 1;
      const page = ensureStructuredCsvPage(sectionResult.state, pageCode);
      page.items.push(makeHeadingOrCommentItem(headingText));
      headingsPromoted += 1;
      continue;
    }

    const sectionKey = sectionKeyFromHint || billState.currentSectionKey;
    const sectionResult = ensureStructuredCsvSectionState(
      billState,
      sectionKey,
      sectionHint || 'Imported schedule'
    );
    if (sectionResult.created && sectionKeyFromHint) sectionsInferred += 1;
    billState.currentSectionKey = sectionKey;
    const page = ensureStructuredCsvPage(sectionResult.state, pageCode);
    const normalizedRef = `${billCode}/${pageCode}/${itemRef}`;
    page.items.push({
      id: generateId(),
      type: deriveStructuredCsvItemType(unitRaw, qty, rate, importedTotal),
      reference: normalizedRef,
      description: description || normalizedRef,
      unit: mapUnit(unitRaw),
      quantity: qty,
      rate,
      total: importedTotal || safeMul(qty, rate),
      dimensionRows: [],
    });
  }

  project.bills = Array.from(bills.values())
    .map(({ bill }) => ({
      ...bill,
      sections: bill.sections.filter((section) => getSectionItems(section).length > 0),
    }))
    .filter((bill) => bill.sections.length > 0);
  return {
    project,
    summary: buildImportQaSummary(project, {
      rowsSkipped,
      headingsPromoted,
      sectionsInferred,
    }),
  };
}

export function parseStructuredLegacyCsv(content: string, project: Project): Project {
  return parseStructuredLegacyCsvWithSummary(content, project).project;
}

export function parseLegacyNumericCite42(content: string, project: Project): Project {
  const records = groupLegacyNumericRecords(content);
  let currentBillState: LegacyBillState | null = null;
  let currentPageCode = '1';

  for (const record of records) {
    const text = collapseRecordText(record.lines).replace(new RegExp(`^${record.code}\\s+`), '');

    if (record.code === '1') {
      currentBillState = ensureLegacyBillState(
        new Map<string, LegacyBillState>(project.bills.map((bill) => [bill.name, {
          bill,
          section: bill.sections[0],
          pages: new Map((bill.sections[0].pages || []).map((page) => [page.name || '1', page])),
        }])),
        text || `Imported bill ${project.bills.length + 1}`,
        () => text || `Imported bill ${project.bills.length + 1}`,
        () => 'Imported schedule'
      );
      if (!project.bills.includes(currentBillState.bill)) {
        project.bills.push(currentBillState.bill);
      }
      currentPageCode = '1';
      ensureLegacyPage(currentBillState, currentPageCode);
      continue;
    }

    if (!currentBillState) {
      currentBillState = {
        bill: { id: generateId(), name: 'Imported bill', sections: [] },
        section: { id: generateId(), name: 'Imported schedule', items: [], pages: [] },
        pages: new Map<string, BoQPage>(),
      };
      currentBillState.bill.sections.push(currentBillState.section);
      project.bills.push(currentBillState.bill);
      ensureLegacyPage(currentBillState, currentPageCode);
    }

    if (record.code === '9') {
      const parsed = parseLegacyNumericItem(record.lines);
      if (!parsed) continue;
      currentPageCode = parsed.pageCode || currentPageCode;
      const page = ensureLegacyPage(currentBillState, currentPageCode);
      page.items.push(parsed.item);
      continue;
    }

    const page = ensureLegacyPage(currentBillState, currentPageCode);
    if (record.code === '2' || record.code === '3') {
      page.items.push({
        id: generateId(),
        type: record.code === '2' ? 'MAJOR_HEADING' : 'GENERAL_HEADING',
        reference: '',
        description: text,
        unit: '',
        quantity: 0,
        rate: 0,
        total: 0,
        dimensionRows: [],
      });
    } else if (record.code === '4' || record.code === '5') {
      page.items.push({
        id: generateId(),
        type: 'COMMENT',
        reference: '',
        description: text,
        unit: '',
        quantity: 0,
        rate: 0,
        total: 0,
        dimensionRows: [],
      });
    }
  }

  project.bills = project.bills.filter((bill) => bill.sections.some((section) => getSectionItems(section).length > 0));
  return project;
}

function parseLetteredCite(content: string, project: Project, descriptionLib: Map<string, string>): Project {
  const lines = cleanImportedText(content).split(/\r?\n/);
  let currentBill: BoQBill | null = null;
  let currentSection: BoQSection | null = null;
  let lastItem: BoQItem | null = null;

  const ensureHierarchy = (billName = 'Main Bill', sectionName = 'General Works') => {
    if (!currentBill) {
      currentBill = { id: generateId(), name: billName, sections: [] };
      project.bills.push(currentBill);
    }
    if (!currentSection) {
      currentSection = { id: generateId(), name: sectionName, items: [] };
      currentBill.sections.push(currentSection);
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line || LEGACY_HEADER_RE.test(line)) continue;

    const parts = parseCiteLine(line);
    const type = (parts[0] || '').toUpperCase();

    if (!['A', 'B', 'C', 'D', 'E', 'T', 'Z'].includes(type) && lastItem) {
      lastItem.description = `${lastItem.description} ${line.replace(/^"|"$/g, '')}`.trim();
      continue;
    }

    switch (type) {
      case 'A':
        if (parts[2]) project.name = parts[2];
        break;
      case 'B':
        currentBill = { id: generateId(), name: parts[2] || parts[1] || `Bill ${project.bills.length + 1}`, sections: [] };
        project.bills.push(currentBill);
        currentSection = null;
        lastItem = null;
        break;
      case 'C': {
        const headingRef = parts[1];
        const headingDesc = parts[2] || descriptionLib.get(headingRef) || 'Heading';
        ensureHierarchy();
        if (!currentSection || headingRef.length <= 2) {
          currentSection = { id: generateId(), name: `${headingRef} - ${headingDesc}`, items: [] };
          currentBill!.sections.push(currentSection);
          lastItem = null;
        } else {
          const subHeading: BoQItem = {
            id: generateId(),
            type: headingRef.length > 4 ? 'GENERAL_HEADING' : 'MAJOR_HEADING',
            reference: headingRef,
            description: headingDesc,
            unit: '',
            quantity: 0,
            rate: 0,
            total: 0,
            dimensionRows: [],
          };
          currentSection.items.push(subHeading);
          lastItem = subHeading;
        }
        break;
      }
      case 'E': {
        ensureHierarchy();
        const itemRef = parts[1];
        const unitRaw = parts[2];
        const qty = parseNumber(parts[3]);
        const rate = parseNumber(parts[4]);
        const itemDesc = parts[5] || descriptionLib.get(itemRef) || 'Item';
        const item: BoQItem = {
          id: generateId(),
          type: 'PRICED',
          reference: itemRef,
          description: itemDesc,
          unit: mapUnit(unitRaw),
          quantity: qty,
          rate,
          total: safeMul(qty, rate),
          dimensionRows: [],
        };
        currentSection!.items.push(item);
        lastItem = item;
        break;
      }
      case 'T': {
        ensureHierarchy();
        const note: BoQItem = {
          id: generateId(),
          type: 'COMMENT',
          reference: '',
          description: parts.slice(1).join(' '),
          unit: '',
          quantity: 0,
          rate: 0,
          total: 0,
          dimensionRows: [],
        };
        currentSection!.items.push(note);
        lastItem = note;
        break;
      }
      default:
        break;
    }
  }

  project.bills = project.bills.filter((bill) => bill.sections.some((section) => section.items.length > 0));
  return project;
}

const parseMappedCSV = (content: string, mapping: ColumnMapping, project: Project): Project => {
  const rows = parseDelimitedTable(content, detectDelimiter(content));
  const bill: BoQBill = { id: generateId(), name: 'Imported Data', sections: [] };
  const section: BoQSection = { id: generateId(), name: 'General Items', items: [] };
  bill.sections.push(section);
  project.bills.push(bill);

  const startIndex = mapping.hasHeader ? 1 : 0;

  for (let i = startIndex; i < rows.length; i += 1) {
    const row = rows[i];
    const ref = mapping.map.reference > -1 ? getRowValue(row, mapping.map.reference) : '';
    const desc = mapping.map.description > -1 ? getRowValue(row, mapping.map.description) : '';
    const unitRaw = mapping.map.unit > -1 ? getRowValue(row, mapping.map.unit) : '';
    const qty = mapping.map.quantity > -1 ? parseNumber(getRowValue(row, mapping.map.quantity)) : 0;
    const rate = mapping.map.rate > -1 ? parseNumber(getRowValue(row, mapping.map.rate)) : 0;
    const typeRaw = mapping.map.type > -1 ? getRowValue(row, mapping.map.type) : '';

    if (!desc && !ref && qty === 0) continue;

    section.items.push({
      id: generateId(),
      type: mapItemType(typeRaw, qty, rate, unitRaw),
      reference: ref,
      description: desc || 'Item',
      unit: mapUnit(unitRaw),
      quantity: qty,
      rate,
      total: safeMul(qty, rate),
      dimensionRows: [],
    });
  }

  return project;
};

const parseHeuristicCSV = (content: string, project: Project): Project => {
  const cleaned = cleanImportedText(content);
  const lines = cleaned.split(/\r?\n/).filter((line) => line.trim().length > 0 && !LEGACY_HEADER_RE.test(line.trim()));
  if (lines.length === 0) return project;

  const delimiter = detectDelimiter(cleaned);
  const rows = lines.map((line) => parseCiteLine(line, delimiter));
  const colCount = Math.max(...rows.map((row) => row.length));
  const colScores: { desc: number; qty: number; rate: number; unit: number }[] = Array.from({ length: colCount }, () => ({
    desc: 0,
    qty: 0,
    rate: 0,
    unit: 0,
  }));

  rows.slice(0, 10).forEach((row) => {
    row.forEach((cell, idx) => {
      const value = getRowValue(row, idx);
      if (!value) return;
      const numberValue = parseNumber(value);
      const looksNumeric = numberValue !== 0 || /^-?[\d,.]+$/.test(value);
      const lower = value.toLowerCase();

      if (['m', 'm2', 'm3', 'nr', 'kg', 't', 'item', 'sum', 'hrs'].includes(lower)) {
        colScores[idx].unit += 10;
      } else if (looksNumeric) {
        colScores[idx].qty += 1;
        colScores[idx].rate += 1;
      } else if (value.length > 10 || value.includes(' ')) {
        colScores[idx].desc += 2;
      }
    });
  });

  const getBestIdx = (prop: 'desc' | 'qty' | 'rate' | 'unit', exclude: number[] = []) => {
    let bestIdx = -1;
    let maxScore = 0;
    colScores.forEach((score, idx) => {
      if (exclude.includes(idx)) return;
      if (score[prop] > maxScore) {
        maxScore = score[prop];
        bestIdx = idx;
      }
    });
    return bestIdx;
  };

  const descIdx = getBestIdx('desc');
  const unitIdx = getBestIdx('unit', [descIdx]);
  const qtyIdx = getBestIdx('qty', [descIdx, unitIdx]);
  const rateIdx = getBestIdx('rate', [descIdx, unitIdx, qtyIdx]);
  const finalDescIdx = descIdx === -1 && colCount > 0 ? 0 : descIdx;

  const bill: BoQBill = { id: generateId(), name: 'Auto-Detected Data', sections: [] };
  const section: BoQSection = { id: generateId(), name: 'Imported Items', items: [] };
  bill.sections.push(section);
  project.bills.push(bill);

  const headerKeywords = ['ref', 'description', 'desc', 'qty', 'quantity', 'rate', 'unit', 'total', 'value', 'item', 'code'];
  const firstRow = rows[0] ?? [];
  const firstRowLower = firstRow.map((cell) => getRowValue([cell], 0).toLowerCase());
  let startIndex = firstRowLower.some((cell) => headerKeywords.some((keyword) => cell === keyword || cell.startsWith(`${keyword} `) || cell.includes(` ${keyword}`))) ? 1 : 0;
  if (qtyIdx > -1) {
    const firstQty = getRowValue(firstRow, qtyIdx);
    if (firstQty && Number.isNaN(Number(firstQty.replace(/,/g, '')))) startIndex = 1;
  }

  for (let i = startIndex; i < rows.length; i += 1) {
    const row = rows[i];
    const description = finalDescIdx > -1 ? getRowValue(row, finalDescIdx) : row.join(' ');
    const unitRaw = unitIdx > -1 ? getRowValue(row, unitIdx) : '';
    const qty = qtyIdx > -1 ? parseNumber(getRowValue(row, qtyIdx)) : 0;
    const rate = rateIdx > -1 ? parseNumber(getRowValue(row, rateIdx)) : 0;
    if (!description && qty === 0) continue;

    section.items.push({
      id: generateId(),
      type: qty > 0 || rate > 0 ? 'PRICED' : 'COMMENT',
      reference: '',
      description,
      unit: mapUnit(unitRaw),
      quantity: qty,
      rate,
      total: safeMul(qty, rate),
      dimensionRows: [],
    });
  }

  if (section.items.length === 0) project.bills = [];
  return project;
};

function groupLegacyNumericRecords(content: string): Array<{ code: string; lines: string[] }> {
  const lines = cleanImportedText(content).split(/\r?\n/);
  const records: Array<{ code: string; lines: string[] }> = [];
  let current: { code: string; lines: string[] } | null = null;

  for (const line of lines) {
    const raw = line.replace(/\u0000/g, '').replace(/\f/g, '').replace(/\r/g, '');
    const trimmed = raw.trim();
    if (!trimmed || LEGACY_HEADER_RE.test(trimmed)) continue;

    const match = raw.match(LEGACY_NUMERIC_RECORD_RE);
    if (match) {
      if (current) records.push(current);
      current = { code: match[1], lines: [raw] };
    } else if (current) {
      current.lines.push(raw);
    }
  }

  if (current) records.push(current);
  return records;
}

function parseLegacyNumericItem(lines: string[]): { pageCode: string; item: BoQItem } | null {
  const merged = collapseRecordText(lines);
  const body = merged.replace(/^9\s+/, '');
  const refMatch = body.match(/^([A-Z0-9]+\/[A-Z0-9]+\/[A-Z0-9]+)\s+(.*)$/i);
  if (!refMatch) return null;

  const reference = refMatch[1];
  const pageCode = reference.split('/')[1] || '1';
  let tokens = refMatch[2].split(/\s+/).map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 0) return null;

  if (LEGACY_CODE_RE.test(tokens[tokens.length - 1])) {
    tokens = tokens.slice(0, -1);
  }

  let quantity = 0;
  let rate = 0;
  let total = 0;
  let unit = '';
  let descriptionTokens = tokens;

  if (
    tokens.length >= 4 &&
    isNumericToken(tokens[tokens.length - 1]) &&
    isNumericToken(tokens[tokens.length - 2]) &&
    isUnitToken(tokens[tokens.length - 3]) &&
    isNumericToken(tokens[tokens.length - 4])
  ) {
    total = parseNumber(tokens[tokens.length - 1]);
    rate = parseNumber(tokens[tokens.length - 2]);
    unit = tokens[tokens.length - 3];
    quantity = parseNumber(tokens[tokens.length - 4]);
    descriptionTokens = tokens.slice(0, -4);
  } else if (
    tokens.length >= 3 &&
    isNumericToken(tokens[tokens.length - 1]) &&
    isUnitToken(tokens[tokens.length - 2]) &&
    isNumericToken(tokens[tokens.length - 3])
  ) {
    rate = parseNumber(tokens[tokens.length - 1]);
    unit = tokens[tokens.length - 2];
    quantity = parseNumber(tokens[tokens.length - 3]);
    descriptionTokens = tokens.slice(0, -3);
  } else if (tokens.length >= 2 && isUnitToken(tokens[tokens.length - 1]) && isNumericToken(tokens[tokens.length - 2])) {
    unit = tokens[tokens.length - 1];
    quantity = parseNumber(tokens[tokens.length - 2]);
    descriptionTokens = tokens.slice(0, -2);
  } else if (isUnitToken(tokens[tokens.length - 1])) {
    unit = tokens[tokens.length - 1];
    descriptionTokens = tokens.slice(0, -1);
  }

  const description = descriptionTokens.join(' ').trim() || reference;
  const normalizedUnit = mapUnit(unit);
  const finalTotal = total || safeMul(quantity, rate);

  return {
    pageCode,
    item: {
      id: generateId(),
      type: deriveStructuredCsvItemType(normalizedUnit, quantity, rate, finalTotal),
      reference,
      description,
      unit: normalizedUnit,
      quantity,
      rate,
      total: finalTotal,
      dimensionRows: [],
    },
  };
}

function ensureLegacyBillState(
  bills: Map<string, LegacyBillState>,
  key: string,
  getBillName: () => string,
  getSectionName: () => string
): LegacyBillState {
  const existing = bills.get(key);
  if (existing) return existing;

  const bill: BoQBill = { id: generateId(), name: getBillName(), sections: [] };
  const section: BoQSection = { id: generateId(), name: getSectionName(), items: [], pages: [] };
  bill.sections.push(section);
  const created: LegacyBillState = { bill, section, pages: new Map<string, BoQPage>() };
  bills.set(key, created);
  return created;
}

function ensureStructuredCsvBillState(
  bills: Map<string, StructuredCsvBillState>,
  key: string,
  billName: string
): StructuredCsvBillState {
  const existing = bills.get(key);
  if (existing) return existing;

  const bill: BoQBill = { id: generateId(), name: billName, sections: [] };
  const sections = new Map<string, StructuredCsvSectionState>();
  const created: StructuredCsvBillState = {
    bill,
    sections,
    currentSectionKey: 'default',
  };

  ensureStructuredCsvSectionState(created, 'default', 'Imported schedule');
  bills.set(key, created);
  return created;
}

function ensureStructuredCsvSectionState(
  billState: StructuredCsvBillState,
  key: string,
  sectionName: string
): { state: StructuredCsvSectionState; created: boolean } {
  const existing = billState.sections.get(key);
  if (existing) {
    if (
      existing.section.name === 'Imported schedule' &&
      sectionName &&
      sectionName !== 'Imported schedule'
    ) {
      existing.section.name = formatStructuredSectionName(sectionName);
    }
    return { state: existing, created: false };
  }

  const section: BoQSection = {
    id: generateId(),
    name: formatStructuredSectionName(sectionName),
    items: [],
    pages: [],
  };
  const created: StructuredCsvSectionState = { section, pages: new Map<string, BoQPage>() };
  billState.bill.sections.push(section);
  billState.sections.set(key, created);
  return { state: created, created: true };
}

function ensureStructuredCsvPage(state: StructuredCsvSectionState, pageCode: string): BoQPage {
  const existing = state.pages.get(pageCode);
  if (existing) return existing;

  const page: BoQPage = {
    id: generateId(),
    name: `Page ${String(pageCode).padStart(2, '0')}`,
    items: [],
  };
  if (!state.section.pages) state.section.pages = [];
  state.section.pages.push(page);
  state.pages.set(pageCode, page);
  return page;
}

function normalizeStructuredSectionKey(sectionHint: string): string | null {
  const trimmed = sectionHint.trim();
  if (!trimmed || trimmed === '[None]-[None]' || trimmed === '000-000') return null;
  return trimmed.toLowerCase();
}

function formatStructuredSectionName(sectionName: string): string {
  const trimmed = sectionName.trim();
  if (!trimmed || trimmed === '[None]-[None]' || trimmed === '000-000') {
    return 'Imported schedule';
  }
  return trimmed;
}

function ensureLegacyPage(state: LegacyBillState, pageCode: string): BoQPage {
  const existing = state.pages.get(pageCode);
  if (existing) return existing;
  const page: BoQPage = {
    id: generateId(),
    name: `Page ${String(pageCode).padStart(2, '0')}`,
    items: [],
  };
  if (!state.section.pages) state.section.pages = [];
  state.section.pages.push(page);
  state.pages.set(pageCode, page);
  return page;
}

function makeHeadingOrCommentItem(text: string): BoQItem {
  return {
    id: generateId(),
    type: isLikelyHeading(text) ? 'GENERAL_HEADING' : 'COMMENT',
    reference: '',
    description: text,
    unit: '',
    quantity: 0,
    rate: 0,
    total: 0,
    dimensionRows: [],
  };
}

function hasImportedContent(project: Project): boolean {
  return project.bills.some((bill) => bill.sections.some((section) => getSectionItems(section).length > 0));
}

function getSectionItems(section: BoQSection): BoQItem[] {
  if (section.pages?.length) {
    return section.pages.flatMap((page) => page.items || []);
  }
  return section.items || [];
}

function deriveStructuredCsvItemType(unitRaw: string, qty: number, rate: number, total: number): ItemType {
  if (qty !== 0 || rate !== 0 || total !== 0 || unitRaw.trim()) {
    const normalizedUnit = unitRaw.toLowerCase();
    if (normalizedUnit.includes('sum') && rate === 0 && total === 0) return 'PROVISIONAL_SUM';
    return 'PRICED';
  }
  return 'COMMENT';
}

function collapseRecordText(lines: string[]): string {
  return lines
    .map((line) => line.replace(/\u0000/g, '').replace(/\f/g, '').replace(/\r/g, '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanImportedText(value: string): string {
  return value.replace(/\u0000/g, '').replace(/\f/g, '\n').replace(/\r\n/g, '\n');
}

function detectDelimiter(content: string): string {
  const sample = cleanImportedText(content).split(/\n/).slice(0, 10);
  const delimiters = [',', '\t', ';', '|', '~'];
  let best = ',';
  let bestScore = 0;

  delimiters.forEach((delimiter) => {
    const score = sample.reduce((total, line) => total + (line.split(delimiter).length - 1), 0);
    if (score > bestScore) {
      best = delimiter;
      bestScore = score;
    }
  });

  return best;
}

function parseDelimitedTable(content: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuote = false;

  const normalized = cleanImportedText(content);

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const next = normalized[i + 1];

    if (char === '"') {
      if (inQuote && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuote = !inQuote;
      }
      continue;
    }

    if (!inQuote && char === delimiter) {
      row.push(cleanCell(cell));
      cell = '';
      continue;
    }

    if (!inQuote && char === '\n') {
      row.push(cleanCell(cell));
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cleanCell(cell));
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function cleanCell(value: string): string {
  return value.replace(/\u0000/g, '').replace(/\f/g, '').trim();
}

function normalizeHeaderCell(value: string): string {
  return cleanCell(value).toLowerCase().replace(/\s+/g, ' ');
}

function getRowValue(row: string[], index: number): string {
  return cleanCell(index > -1 ? row[index] || '' : '');
}

function parseNumber(value: string): number {
  const cleaned = cleanCell(value).replace(/[,£]/g, '').replace(/[^\d.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isNumericToken(value: string): boolean {
  return /^-?[\d,.]+$/.test(value.trim());
}

function isUnitToken(value: string): boolean {
  const normalized = value.toLowerCase().replace(/\./g, '').trim();
  return ['m', 'm2', 'm3', 'm²', 'm³', 'nr', 'no', 'each', 'sum', 'item', 'kg', 't', 'hrs', 'hr'].includes(normalized);
}

function isLikelyHeading(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/^[A-Z]\d{2}:/i.test(trimmed)) return true;
  const letters = trimmed.replace(/[^A-Za-z]/g, '');
  return letters.length > 0 && trimmed === trimmed.toUpperCase();
}

function isLikelyBillTitle(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return isLikelyHeading(trimmed) && trimmed.length < 80;
}

function buildImportQaSummary(project: Project, overrides: Partial<ImportQaSummary> = {}): ImportQaSummary {
  return {
    billsImported: overrides.billsImported ?? project.bills.length,
    sectionsInferred: overrides.sectionsInferred ?? 0,
    rowsSkipped: overrides.rowsSkipped ?? 0,
    headingsPromoted: overrides.headingsPromoted ?? 0,
  };
}

function countHeadingLikeItems(project: Project): number {
  return project.bills.reduce((billTotal, bill) => (
    billTotal + bill.sections.reduce((sectionTotal, section) => (
      sectionTotal + getSectionItems(section).filter((item) => item.type !== 'PRICED').length
    ), 0)
  ), 0);
}


export const parseCiteLine = (line: string, delimiter = ','): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuote = !inQuote;
    } else if (char === delimiter && !inQuote) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result.map((value) => value.replace(/^"|"$/g, ''));
};

const mapItemType = (raw: string, qty: number, rate: number, unit: string): ItemType => {
  const normalized = raw.toLowerCase().trim();
  if (['heading', 'head', 'title', 'section', 'h1'].some((keyword) => normalized.includes(keyword))) return 'GENERAL_HEADING';
  if (['h4', 'minor heading', 'minor'].some((keyword) => normalized.includes(keyword))) return 'MINOR_HEADING';
  if (['sub-comment', 'sub comment', 'subcomment'].some((keyword) => normalized.includes(keyword))) return 'SUB_COMMENT';
  if (['subsection', 'sub-section', 'h3'].some((keyword) => normalized.includes(keyword))) return 'SUB_SECTION';
  if (['subheading', 'h2'].some((keyword) => normalized.includes(keyword))) return 'MAJOR_HEADING';
  if (['note', 'comment', 'info', 'text'].some((keyword) => normalized.includes(keyword))) return 'COMMENT';
  if (['prov', 'provisional', 'ps', 'sum'].some((keyword) => normalized.includes(keyword))) return 'PROVISIONAL_SUM';
  if (['prime', 'pc', 'pc sum'].some((keyword) => normalized.includes(keyword))) return 'PC_SUM';
  if (qty !== 0 || rate !== 0 || unit.trim()) return 'PRICED';
  return 'COMMENT';
};

const mapUnit = (raw: string): string => {
  if (!raw) return '';
  const normalized = raw.toLowerCase().replace(/\./g, '').trim();
  if (normalized === 'm' || normalized === 'lm' || normalized === 'lin m') return UnitType.M;
  if (normalized === 'm2' || normalized === 'sqm' || normalized === 'm²' || normalized === 'mâ²') return UnitType.M2;
  if (normalized === 'm3' || normalized === 'cum' || normalized === 'm³' || normalized === 'mâ³') return UnitType.M3;
  if (normalized === 'nr' || normalized === 'no' || normalized === 'each') return UnitType.NR;
  if (normalized === 'kg') return UnitType.KG;
  if (normalized === 't' || normalized === 'tonne') return UnitType.T;
  if (normalized === 'sum' || normalized === 'item') return UnitType.SUM;
  if (normalized === 'hrs' || normalized === 'hr') return UnitType.HRS;
  return raw.substring(0, 6);
};

const safeMul = (a: number, b: number) => Math.round(a * b * 100) / 100;
