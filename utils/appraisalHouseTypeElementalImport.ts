import type { AppraisalHouseTypeConfiguration, AppraisalHouseTypeCostComponent, AppraisalHouseTypeCostComponentKey, AppraisalHouseTypeLibraryItem, AppraisalHouseTypeStyle } from '../types';
import { calculateHouseTypeCostBreakdownTotal, createDefaultHouseTypeCostBreakdown } from './appraisal';
import { loadExcelJS } from './excelJsRuntime';
import { resolveAppraisalStandardHouseTypeName } from './appraisalHouseTypeLibraryStandards';

export const HOUSE_TYPE_ELEMENTAL_IMPORT_PRICE_INDEX = 233;
const WORKBOOK_PRICE_INDEX = 227;

export type HouseTypeElementalImportProposal = {
  id: string;
  houseTypeId: string;
  houseTypeName: string;
  sourceName: string;
  currentTotal: number;
  proposedTotal: number;
  currentRatePerM2: number;
  proposedRatePerM2: number;
  costBreakdown: AppraisalHouseTypeCostComponent[];
  notes: string;
  gifaM2: number;
  bedrooms?: number;
  storeys?: number;
  style?: AppraisalHouseTypeStyle;
  configuration?: AppraisalHouseTypeConfiguration;
  applied?: boolean;
};

type SourceRow = {
  name: string;
  values: Map<string, number>;
  gsh: number;
  ashp: number;
  gifaM2: number;
  bedrooms?: number;
  storeys?: number;
  style?: AppraisalHouseTypeStyle;
  configuration?: AppraisalHouseTypeConfiguration;
};

function textValue(value: unknown) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object' && 'text' in value && typeof value.text === 'string') return value.text.trim();
  return '';
}

function numericValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object' && 'result' in value && typeof value.result === 'number' && Number.isFinite(value.result)) return value.result;
  return 0;
}

function keyFor(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function canonicalSourceName(value: string) {
  const normalized = keyFor(value);
  const aliases: Record<string, string> = {
    d24e: 'D2-4 End Terrace', d24m: 'D2-4 Mid Terrace',
    e35: 'E3-5 Mid Terrace', g46e: 'G4-6 End Terrace', g46m: 'G4-6 Mid Terrace',
    j58: 'J5-8 Mid Terrace', k35e: 'K3-5 End Terrace', k35m: 'K3-5 Mid Terrace',
    kintaile: 'Kintail End', kintailm: 'Kintail Mid', morvene: 'Morven End', morvenm: 'Morven Mid',
    cf24l: 'CF2-4L', cf24u: 'CF2-4U', a24: 'A2-4',
  };
  return aliases[normalized] || resolveAppraisalStandardHouseTypeName(value) || value.trim();
}

function sourceStoreys(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'single' || normalized === 'ground') return 1;
  if (normalized === 'double' || normalized === 'first') return 2;
  if (normalized === 'triple' || normalized === 'attic') return 3;
  return undefined;
}

function sourceHouseForm(value: string): Pick<SourceRow, 'style' | 'configuration'> {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'detached') return { style: 'VILLA', configuration: 'DETACHED' };
  if (normalized === 'semi detached') return { style: 'VILLA', configuration: 'SEMI_DETACHED' };
  if (normalized === 'end terrace') return { style: 'VILLA', configuration: 'END_TERRACE' };
  if (normalized === 'mid terrace') return { style: 'VILLA', configuration: 'MID_TERRACE' };
  if (normalized === 'apartment') return { style: 'FLAT', configuration: 'OTHER' };
  return {};
}

function patchComponent(
  components: AppraisalHouseTypeCostComponent[],
  key: AppraisalHouseTypeCostComponentKey,
  amount: number,
  notes: string,
) {
  const component = components.find((entry) => entry.key === key);
  if (!component) return;
  component.amount = Math.max(0, amount * HOUSE_TYPE_ELEMENTAL_IMPORT_PRICE_INDEX / WORKBOOK_PRICE_INDEX);
  component.priceIndex = HOUSE_TYPE_ELEMENTAL_IMPORT_PRICE_INDEX;
  component.included = true;
  component.notes = notes;
}

function proposalFor(source: SourceRow, houseType: AppraisalHouseTypeLibraryItem): HouseTypeElementalImportProposal {
  const components = (houseType.costBreakdown?.length ? houseType.costBreakdown : createDefaultHouseTypeCostBreakdown())
    .map((component) => ({ ...component, detailRows: component.detailRows?.map((row) => ({ ...row })) }));
  const summaryMappings: Array<[AppraisalHouseTypeCostComponentKey, string, string]> = [
    ['GROUNDWORK', 'Groundwork', 'Imported from Summary / Groundwork.'],
    ['BRICK_MAT', '450mm Underbuild', 'Imported from 450mm Brickwork substructure basis. The 675mm alternative is excluded.'],
    ['BRICK_LAB', 'Brick Superstructure', 'Imported from Summary / Brick Superstructure; retained as the brickwork labour heading for the library build-up.'],
    ['SCAFFOLD', 'Scaffold', 'Imported from Summary / Scaffold.'],
    ['KIT', 'Timber Kit', 'Imported from Summary / Timber Kit.'],
    ['JOINER', 'Joinery', 'Imported from Summary / Joinery.'],
    ['WINDOWS_DOORS', 'Windows & Doors', 'Imported from Summary / Windows & Doors.'],
    ['ROOFING', 'Roof Coverings', 'Imported from Summary / Roof Coverings.'],
    ['PV', 'Solar Pv', 'Imported from Summary / Solar Pv.'],
    ['ROUGHCAST', 'Roughcasting', 'Imported from Summary / Roughcasting.'],
    ['FIRE_PROTECTION', 'Sprinkler System', 'Imported from Summary / Sprinkler System.'],
    ['ELECTRICAL', 'Electrical', 'Imported from Summary / Electrical.'],
    ['KITCHEN', 'Kitchen', 'Imported from Summary / Kitchen.'],
    ['DECORATION', 'Decoration', 'Imported from Summary / Decoration.'],
    ['CERAMIC_TILING', 'Ceramic Tiling', 'Imported from Summary / Ceramic Tiling.'],
    ['CLEANING', 'Cleaning', 'Imported from Summary / Cleaning.'],
    ['SEALANTS', 'Sealant', 'Imported from Summary / Sealant.'],
  ];
  summaryMappings.forEach(([key, heading, notes]) => patchComponent(components, key, source.values.get(heading) || 0, notes));

  const ashpPremium = Math.max(0, source.ashp - source.gsh);
  patchComponent(
    components,
    'PLUMBING',
    source.gsh || source.values.get('Plumbing & Heating') || 0,
    source.gsh > 0 ? 'Imported as the GSH-equivalent plumbing and heating base, excluding the ASHP premium.' : 'Imported from Summary / Plumbing & Heating.',
  );
  patchComponent(
    components,
    'AIR_SOURCE_HEAT_PUMPS',
    ashpPremium,
    ashpPremium > 0
      ? 'ASHP premium derived from the workbook ASHP rate less the GSH-equivalent plumbing and heating rate.'
      : 'No separate ASHP premium was identified in the source workbook.',
  );

  const proposedTotal = calculateHouseTypeCostBreakdownTotal(components);
  const currentTotal = calculateHouseTypeCostBreakdownTotal(houseType.costBreakdown);
  return {
    id: `${houseType.id}-${keyFor(source.name)}`,
    houseTypeId: houseType.id,
    houseTypeName: houseType.name,
    sourceName: source.name,
    currentTotal,
    proposedTotal,
    currentRatePerM2: houseType.gifaM2 > 0 ? currentTotal / houseType.gifaM2 : 0,
    proposedRatePerM2: (houseType.gifaM2 || source.gifaM2) > 0 ? proposedTotal / (houseType.gifaM2 || source.gifaM2) : 0,
    costBreakdown: components,
    gifaM2: source.gifaM2,
    bedrooms: source.bedrooms,
    storeys: source.storeys,
    style: source.style,
    configuration: source.configuration,
    notes: `Imported at base cost index ${HOUSE_TYPE_ELEMENTAL_IMPORT_PRICE_INDEX}. Source workbook values were indexed from ${WORKBOOK_PRICE_INDEX}. Substructure uses the 450mm Brickwork tab basis; 675mm underbuild is excluded. ASHP is split from plumbing and heating as the source ASHP less GSH-equivalent premium.`,
  };
}

export async function buildHouseTypeElementalImportProposals(file: File, houseTypes: AppraisalHouseTypeLibraryItem[]) {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const summary = workbook.getWorksheet('Summary');
  const plumbing = workbook.getWorksheet('Plumbing & Heating');
  if (!summary || !plumbing) throw new Error('This import requires the Summary and Plumbing & Heating sheets from the House Type Elemental Appraisal Value workbook.');

  const headings = new Map<string, number>();
  summary.getRow(3).eachCell((cell, columnNumber) => {
    const heading = textValue(cell.value);
    if (heading) headings.set(heading, columnNumber);
  });
  if (!headings.has('House Name') || !headings.has('450mm Underbuild')) {
    throw new Error('The Summary sheet does not contain the expected house type and 450mm Underbuild columns.');
  }
  const plumbingByName = new Map<string, { gsh: number; ashp: number }>();
  for (let rowNumber = 5; rowNumber <= plumbing.rowCount; rowNumber += 1) {
    const row = plumbing.getRow(rowNumber);
    const name = textValue(row.getCell(2).value);
    if (name) plumbingByName.set(keyFor(name), { gsh: numericValue(row.getCell(19).value), ashp: numericValue(row.getCell(22).value) });
  }
  const sources: SourceRow[] = [];
  for (let rowNumber = 4; rowNumber <= summary.rowCount; rowNumber += 1) {
    const row = summary.getRow(rowNumber);
    const name = textValue(row.getCell(headings.get('House Name') || 2).value);
    if (!name) continue;
    const values = new Map<string, number>();
    headings.forEach((column, heading) => values.set(heading, numericValue(row.getCell(column).value)));
    const plumbingValues = plumbingByName.get(keyFor(name)) || { gsh: 0, ashp: 0 };
    const houseForm = sourceHouseForm(textValue(row.getCell(headings.get('House Type') || 0).value));
    sources.push({
      name,
      values,
      ...plumbingValues,
      gifaM2: numericValue(row.getCell(headings.get('GIF') || 0).value),
      bedrooms: Math.max(0, Math.round(numericValue(row.getCell(headings.get('Beds') || 0).value))) || undefined,
      storeys: sourceStoreys(textValue(row.getCell(headings.get('Storey') || 0).value)),
      ...houseForm,
    });
  }
  const currentByStandardName = new Map<string, AppraisalHouseTypeLibraryItem>();
  houseTypes.forEach((houseType) => {
    const canonical = resolveAppraisalStandardHouseTypeName(houseType.name) || houseType.name;
    currentByStandardName.set(keyFor(canonical), houseType);
  });
  return sources.flatMap((source) => {
    const current = currentByStandardName.get(keyFor(canonicalSourceName(source.name)));
    return current ? [proposalFor(source, current)] : [];
  });
}
