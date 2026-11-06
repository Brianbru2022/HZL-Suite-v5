import type {
  AppraisalHouseTypeCostComponent,
  AppraisalHouseTypeCostComponentKey,
  AppraisalHouseTypeConfiguration,
  AppraisalHouseTypeLibraryItem,
  AppraisalHouseTypeStyle,
} from '../types';
import {
  APPRAISAL_HOUSE_TYPE_COST_LABELS,
  APPRAISAL_HOUSE_TYPE_STANDARD_COMPONENT_AMOUNTS,
  calculateHouseTypeCostBreakdownTotal,
  createDefaultAppraisalHouseType,
  isOptionalHouseTypeCostComponent,
  normalizeAppraisalHouseTypeLibraryItems,
} from './appraisal';
import {
  APPRAISAL_HOUSE_TYPE_DEFAULT_BUILD_MONTHS,
  APPRAISAL_HOUSE_TYPE_DEFAULT_PRICE_INDEX,
  resolveAppraisalStandardHouseTypeName,
} from './appraisalHouseTypeLibraryStandards';

export {
  APPRAISAL_HOUSE_TYPE_DEFAULT_BUILD_MONTHS,
  APPRAISAL_HOUSE_TYPE_DEFAULT_PRICE_INDEX,
} from './appraisalHouseTypeLibraryStandards';

const SOURCE_COMPONENT_KEYS: AppraisalHouseTypeCostComponentKey[] = [
  'GROUNDWORK',
  'BRICK_LAB',
  'BRICK_MAT',
  'KIT',
  'JOINER',
  'WINDOWS_DOORS',
  'METALWORK',
  'STEEL',
  'SECOND_STEEL',
  'ROOFING',
  'PV',
  'ROUGHCAST',
  'ELECTRICAL',
  'PLUMBING',
  'GARAGE_DOORS',
  'CERAMIC_TILING',
  'DECORATION',
  'SEALANTS',
  'KITCHEN',
  'CLEANING',
  'SCAFFOLD',
  'FIRE_PROTECTION',
];

export interface AppraisalHouseTypeDetailedDefault {
  name: string;
  sourceName?: string;
  gifaM2: number;
  garage: boolean;
  privateDrive: boolean;
  bedrooms: number;
  storeys: number;
  style: AppraisalHouseTypeStyle;
  configuration: AppraisalHouseTypeConfiguration;
  totalCost: number;
  sourceUnits: number;
  costs: number[];
}

type AppraisalHouseTypeBaseCostDefault = Omit<AppraisalHouseTypeDetailedDefault, 'gifaM2' | 'garage' | 'privateDrive' | 'bedrooms' | 'storeys' | 'style' | 'configuration' | 'sourceName'>;

const APPRAISAL_HOUSE_TYPE_BASE_COST_DEFAULTS: AppraisalHouseTypeBaseCostDefault[] = [
  {
    name: 'Morven Mid',
    totalCost: 71650,
    sourceUnits: 9,
    costs: [13283, 2107, 1828, 15849, 7411, 3693, 0, 0, 16, 1512, 1390, 912, 2621, 7757, 0, 164, 2960, 202, 3744, 360, 5841, 0],
  },
  {
    name: 'Morven End',
    totalCost: 77308,
    sourceUnits: 32,
    costs: [15017, 3961, 3203, 14149, 7411, 4336, 0, 0, 16, 1670, 1390, 2456, 2621, 7757, 0, 164, 2960, 250, 3744, 360, 5841, 0],
  },
  {
    name: 'Kintail End',
    totalCost: 90208,
    sourceUnits: 0,
    costs: [13804, 4938, 3984, 19234, 8991, 4186, 0, 0, 16, 3241, 1747, 2478, 2930, 8833, 0, 382, 3842, 314, 3914, 377, 6997, 0],
  },
  {
    name: 'Kintail Mid',
    totalCost: 82108,
    sourceUnits: 17,
    costs: [12212, 2626, 1940, 19272, 8991, 4186, 0, 0, 16, 2223, 1747, 1231, 2930, 8833, 0, 382, 3842, 360, 3914, 377, 7026, 0],
  },
  {
    name: 'Arrochar',
    totalCost: 93075,
    sourceUnits: 4,
    costs: [13869, 5361, 4359, 18406, 8681, 4643, 0, 0, 16, 2847, 2077, 2266, 3063, 10587, 0, 470, 3999, 332, 4702, 380, 7017, 0],
  },
  {
    name: 'Killiecrankie',
    totalCost: 113726,
    sourceUnits: 0,
    costs: [26290, 3811, 3099, 13084, 12342, 4643, 0, 0, 23, 5397, 2953, 1611, 4355, 15051, 0, 668, 5685, 472, 6685, 540, 7017, 0],
  },
  {
    name: 'Nevis',
    totalCost: 97899,
    sourceUnits: 14,
    costs: [15251, 6924, 5605, 18580, 8733, 4638, 0, 0, 16, 3297, 2077, 3764, 3039, 10641, 0, 406, 4324, 382, 4604, 380, 5237, 0],
  },
  {
    name: 'Cheviot',
    totalCost: 120658,
    sourceUnits: 3,
    costs: [19735, 7353, 5986, 23573, 11454, 5879, 450, 715, 16, 4689, 2077, 5053, 3234, 12214, 631, 780, 4580, 466, 5406, 369, 5997, 0],
  },
  {
    name: 'Sidlaw',
    totalCost: 113317,
    sourceUnits: 12,
    costs: [16979, 7138, 5779, 22032, 14138, 6173, 0, 0, 16, 3703, 2412, 3872, 3234, 11286, 0, 758, 4608, 482, 4920, 392, 5395, 0],
  },
  {
    name: 'Ochil',
    totalCost: 120172,
    sourceUnits: 0,
    costs: [18430, 7257, 5909, 25478, 11372, 6743, 0, 714, 16, 4348, 2417, 4521, 3354, 11777, 631, 774, 4654, 523, 4647, 427, 6181, 0],
  },
  {
    name: 'Fintry',
    totalCost: 113261,
    sourceUnits: 0,
    costs: [16616, 6106, 5419, 24080, 10837, 6414, 0, 0, 16, 3941, 2077, 4464, 3386, 12408, 0, 651, 5046, 485, 5276, 427, 5613, 0],
  },
  {
    name: 'Arisaig',
    totalCost: 147584,
    sourceUnits: 0,
    costs: [24587, 8316, 6756, 31475, 13408, 8527, 0, 1086, 16, 5957, 2417, 4819, 3885, 15191, 631, 988, 5277, 644, 5982, 504, 7120, 0],
  },
  {
    name: 'Lewis',
    totalCost: 142918,
    sourceUnits: 0,
    costs: [19592, 8574, 7102, 33227, 16572, 11176, 0, 1103, 16, 5355, 2141, 4683, 4775, 11731, 631, 646, 6567, 643, 3688, 538, 4157, 0],
  },
  {
    name: 'Cuillin',
    totalCost: 135880,
    sourceUnits: 9,
    costs: [20950, 7467, 6007, 31042, 14139, 7579, 0, 640, 16, 4794, 2417, 4666, 3549, 13292, 631, 780, 5472, 570, 4600, 438, 6831, 0],
  },
  {
    name: 'Morar',
    totalCost: 140165,
    sourceUnits: 0,
    costs: [19180, 9670, 6293, 30602, 15055, 10378, 0, 0, 16, 5673, 2570, 5528, 5083, 12619, 0, 722, 6725, 716, 4871, 577, 3888, 0],
  },
  {
    name: 'Cairngorm',
    totalCost: 134872,
    sourceUnits: 0,
    costs: [24203, 7356, 6054, 33019, 14934, 6429, 0, 0, 16, 4016, 2598, 4678, 4425, 10573, 0, 622, 5940, 379, 4500, 394, 4734, 0],
  },
  {
    name: 'Galloway',
    totalCost: 158120,
    sourceUnits: 10,
    costs: [29010, 8981, 7133, 39813, 17575, 7018, 0, 1246, 16, 5146, 2598, 4730, 4778, 11616, 631, 886, 6895, 523, 4046, 462, 5017, 0],
  },
  {
    name: 'Devon',
    totalCost: 148158,
    sourceUnits: 24,
    costs: [23952, 7313, 4522, 38399, 16532, 9617, 0, 0, 16, 7885, 2138, 3180, 6196, 12018, 0, 899, 6448, 653, 5164, 441, 2786, 0],
  },
  {
    name: 'Clyde',
    totalCost: 138291,
    sourceUnits: 15,
    costs: [23120, 5713, 4502, 35699, 15118, 9220, 0, 0, 16, 7722, 1839, 2837, 6405, 10802, 0, 691, 5915, 623, 4713, 416, 2939, 0],
  },
  {
    name: 'Spey',
    totalCost: 119077,
    sourceUnits: 0,
    costs: [18188, 4971, 2887, 34443, 13256, 6910, 0, 0, 16, 5720, 1530, 1793, 5790, 10331, 0, 511, 5180, 397, 4368, 367, 2419, 0],
  },
  {
    name: 'Tay',
    totalCost: 119930,
    sourceUnits: 6,
    costs: [19121, 5822, 3181, 28882, 13256, 7294, 0, 0, 16, 6302, 1530, 4785, 5906, 10268, 0, 511, 5180, 508, 4368, 367, 2633, 0],
  },
  {
    name: '5-8',
    totalCost: 129986,
    sourceUnits: 0,
    costs: [16576, 8265, 3292, 32451, 14109, 6411, 0, 0, 16, 4020, 2342, 3882, 4130, 11145, 0, 564, 5327, 443, 2483, 559, 7055, 6917],
  },
  {
    name: 'F4-6',
    totalCost: 111345,
    sourceUnits: 0,
    costs: [14462, 4848, 6026, 24311, 12155, 6218, 0, 0, 16, 3036, 2342, 1556, 4021, 10895, 0, 486, 4893, 384, 2212, 489, 6078, 6917],
  },
  {
    name: 'K3-5',
    totalCost: 91098,
    sourceUnits: 0,
    costs: [12667, 4200, 2956, 20187, 10093, 4375, 0, 0, 16, 2185, 1515, 983, 3695, 9791, 0, 404, 3550, 258, 1794, 465, 5047, 6917],
  },
  {
    name: 'A2-4',
    totalCost: 82860,
    sourceUnits: 0,
    costs: [15121, 2995, 6099, 17224, 7489, 3744, 0, 0, 16, 3744, 1423, 1048, 2621, 6740, 0, 300, 2995, 225, 1348, 374, 3744, 5610],
  },
  {
    name: 'E3-5',
    totalCost: 92803,
    sourceUnits: 0,
    costs: [11871, 4037, 5245, 20187, 10093, 5047, 0, 0, 16, 2523, 1918, 1413, 3533, 9084, 0, 404, 4037, 303, 1817, 505, 5047, 5724],
  },
  {
    name: 'D2-4',
    totalCost: 89266,
    sourceUnits: 0,
    costs: [11233, 3820, 4751, 19101, 9551, 4775, 0, 0, 16, 2388, 1815, 1337, 3343, 8596, 0, 382, 3820, 287, 1719, 478, 4775, 7079],
  },
  {
    name: 'G4-6',
    totalCost: 129260,
    sourceUnits: 0,
    costs: [17360, 5904, 3990, 29520, 14760, 7380, 0, 0, 16, 3690, 2804, 2066, 5166, 13284, 0, 590, 5904, 443, 2657, 590, 5904, 7228],
  },
  {
    name: 'CF2-4L',
    totalCost: 80923,
    sourceUnits: 0,
    costs: [19683, 3082, 3832, 15411, 7706, 3853, 0, 0, 16, 0, 1464, 1079, 2697, 6935, 0, 308, 3082, 231, 1387, 385, 3082, 6689],
  },
  {
    name: 'CF2-4U',
    totalCost: 68413,
    sourceUnits: 0,
    costs: [0, 3430, 1831, 17148, 8574, 4287, 0, 0, 16, 3853, 1629, 1200, 3001, 7717, 0, 600, 3430, 257, 1543, 429, 3430, 6039],
  },
];

const APPRAISAL_RETIRED_HOUSE_TYPE_NAMES = ['Spey'];

interface AppraisalHouseTypeWorkbookMetadata {
  name: string;
  sourceName?: string;
  gifaM2: number;
  garage: boolean;
  privateDrive: boolean;
  bedrooms: number;
  storeys: number;
  style: AppraisalHouseTypeStyle;
  configuration: AppraisalHouseTypeConfiguration;
}

const APPRAISAL_HOUSE_TYPE_WORKBOOK_METADATA: AppraisalHouseTypeWorkbookMetadata[] = [
  { name: 'Arisaig', gifaM2: 129, garage: false, privateDrive: true, bedrooms: 4, style: 'VILLA', storeys: 2, configuration: 'DETACHED' },
  { name: 'Arrochar', gifaM2: 83, garage: false, privateDrive: true, bedrooms: 3, style: 'VILLA', storeys: 2, configuration: 'SEMI_DETACHED' },
  { name: 'Killiecrankie', gifaM2: 118, garage: false, privateDrive: true, bedrooms: 3, style: 'VILLA', storeys: 1.5, configuration: 'SEMI_DETACHED' },
  { name: 'Cheviot', gifaM2: 98, garage: true, privateDrive: true, bedrooms: 3, style: 'VILLA', storeys: 2, configuration: 'DETACHED' },
  { name: 'Clyde', gifaM2: 128, garage: false, privateDrive: true, bedrooms: 3, style: 'BUNGALOW', storeys: 1, configuration: 'DETACHED' },
  { name: 'Cuillin', gifaM2: 122, garage: true, privateDrive: true, bedrooms: 4, style: 'VILLA', storeys: 2, configuration: 'DETACHED' },
  { name: 'Devon', gifaM2: 140, garage: false, privateDrive: true, bedrooms: 4, style: 'BUNGALOW', storeys: 1, configuration: 'DETACHED' },
  { name: 'Fintry', gifaM2: 111, garage: false, privateDrive: true, bedrooms: 4, style: 'VILLA', storeys: 2, configuration: 'DETACHED' },
  { name: 'Morar', gifaM2: 150, garage: false, privateDrive: true, bedrooms: 5, style: 'VILLA', storeys: 2, configuration: 'DETACHED' },
  { name: 'Nevis', gifaM2: 83, garage: false, privateDrive: true, bedrooms: 3, style: 'VILLA', storeys: 2, configuration: 'DETACHED' },
  { name: 'Ochil', gifaM2: 104, garage: true, privateDrive: true, bedrooms: 4, style: 'VILLA', storeys: 2, configuration: 'DETACHED' },
  { name: 'Sidlaw', gifaM2: 101, garage: false, privateDrive: true, bedrooms: 3, style: 'VILLA', storeys: 2, configuration: 'DETACHED' },
  { name: 'Tay', gifaM2: 112, garage: false, privateDrive: true, bedrooms: 3, style: 'BUNGALOW', storeys: 1, configuration: 'DETACHED' },
  { name: 'Kintail Mid', gifaM2: 82, garage: false, privateDrive: false, bedrooms: 3, style: 'VILLA', storeys: 2, configuration: 'MID_TERRACE' },
  { name: 'Lewis', gifaM2: 133, garage: false, privateDrive: true, bedrooms: 4, style: 'VILLA', storeys: 2, configuration: 'DETACHED' },
  { name: 'Cairngorm', gifaM2: 137, garage: false, privateDrive: true, bedrooms: 4, style: 'VILLA', storeys: 2, configuration: 'DETACHED' },
  { name: 'Galloway', gifaM2: 160, garage: true, privateDrive: true, bedrooms: 5, style: 'VILLA', storeys: 2, configuration: 'DETACHED' },
  { name: 'F4-6 End Terrace', sourceName: 'F4-6', gifaM2: 112, garage: false, privateDrive: false, bedrooms: 4, style: 'VILLA', storeys: 2, configuration: 'END_TERRACE' },
  { name: 'F4-6 Mid Terrace', sourceName: 'F4-6', gifaM2: 112, garage: false, privateDrive: false, bedrooms: 4, style: 'VILLA', storeys: 2, configuration: 'MID_TERRACE' },
  { name: 'K3-5 End Terrace', sourceName: 'K3-5', gifaM2: 93, garage: false, privateDrive: false, bedrooms: 3, style: 'VILLA', storeys: 2, configuration: 'END_TERRACE' },
  { name: 'K3-5 Mid Terrace', sourceName: 'K3-5', gifaM2: 93, garage: false, privateDrive: false, bedrooms: 3, style: 'VILLA', storeys: 2, configuration: 'MID_TERRACE' },
  { name: 'A2-4', gifaM2: 69, garage: false, privateDrive: false, bedrooms: 2, style: 'BUNGALOW', storeys: 1, configuration: 'SEMI_DETACHED' },
  { name: 'E3-5 End Terrace', sourceName: 'E3-5', gifaM2: 93, garage: false, privateDrive: false, bedrooms: 3, style: 'VILLA', storeys: 2, configuration: 'END_TERRACE' },
  { name: 'E3-5 Mid Terrace', sourceName: 'E3-5', gifaM2: 93, garage: false, privateDrive: false, bedrooms: 3, style: 'VILLA', storeys: 2, configuration: 'MID_TERRACE' },
  { name: 'D2-4 End Terrace', sourceName: 'D2-4', gifaM2: 88, garage: false, privateDrive: false, bedrooms: 2, style: 'VILLA', storeys: 2, configuration: 'END_TERRACE' },
  { name: 'D2-4 Mid Terrace', sourceName: 'D2-4', gifaM2: 88, garage: false, privateDrive: false, bedrooms: 2, style: 'VILLA', storeys: 2, configuration: 'MID_TERRACE' },
  { name: 'G4-6 End Terrace', sourceName: 'G4-6', gifaM2: 136, garage: false, privateDrive: false, bedrooms: 4, style: 'VILLA', storeys: 3, configuration: 'END_TERRACE' },
  { name: 'G4-6 Mid Terrace', sourceName: 'G4-6', gifaM2: 136, garage: false, privateDrive: false, bedrooms: 4, style: 'VILLA', storeys: 3, configuration: 'MID_TERRACE' },
  { name: 'CF2-4L', gifaM2: 71, garage: false, privateDrive: false, bedrooms: 2, style: 'COTTAGE_FLAT', storeys: 2, configuration: 'COTTAGE_FLAT' },
  { name: 'CF2-4U', gifaM2: 79, garage: false, privateDrive: false, bedrooms: 2, style: 'COTTAGE_FLAT', storeys: 2, configuration: 'COTTAGE_FLAT' },
  { name: 'J5-8 End Terrace', sourceName: '5-8', gifaM2: 130, garage: false, privateDrive: false, bedrooms: 5, style: 'VILLA', storeys: 2, configuration: 'END_TERRACE' },
  { name: 'J5-8 Mid Terrace', sourceName: '5-8', gifaM2: 130, garage: false, privateDrive: false, bedrooms: 5, style: 'VILLA', storeys: 2, configuration: 'MID_TERRACE' },
  { name: 'Kintail End', gifaM2: 82, garage: false, privateDrive: false, bedrooms: 3, style: 'VILLA', storeys: 2, configuration: 'END_TERRACE' },
  { name: 'Morven Mid', gifaM2: 69, garage: false, privateDrive: false, bedrooms: 3, style: 'VILLA', storeys: 2, configuration: 'MID_TERRACE' },
  { name: 'Morven End', gifaM2: 69, garage: false, privateDrive: false, bedrooms: 3, style: 'VILLA', storeys: 2, configuration: 'END_TERRACE' },
];

const baseCostDefaultsByName = new Map(APPRAISAL_HOUSE_TYPE_BASE_COST_DEFAULTS.map((row) => [row.name, row]));

export const APPRAISAL_HOUSE_TYPE_DETAILED_DEFAULTS: AppraisalHouseTypeDetailedDefault[] = APPRAISAL_HOUSE_TYPE_WORKBOOK_METADATA.map((metadata) => {
  const costRow = baseCostDefaultsByName.get(metadata.sourceName || metadata.name);
  if (!costRow) {
    throw new Error(`Missing AWD house type cost defaults for ${metadata.name}`);
  }
  return {
    ...costRow,
    ...metadata,
  };
});

function normaliseName(value: string) {
  return value.trim().toLowerCase();
}

function slugName(value: string) {
  return normaliseName(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'house-type';
}

function legacyXPrefixedName(value: string) {
  return `x${value}`;
}

function terraceVariantName(name: string, variant: 'End' | 'Mid') {
  const baseName = name.replace(/\s+terrace$/i, '').trim();
  return `${baseName} ${variant} Terrace`;
}

function createTerraceVariants(houseType: AppraisalHouseTypeLibraryItem, timestamp: string): AppraisalHouseTypeLibraryItem[] {
  if (houseType.configuration !== 'TERRACE') return [houseType];
  const componentTotal = calculateHouseTypeCostBreakdownTotal(houseType.costBreakdown);
  return ([
    ['END_TERRACE', terraceVariantName(houseType.name, 'End')],
    ['MID_TERRACE', terraceVariantName(houseType.name, 'Mid')],
  ] as const).map(([configuration, name]) => ({
    ...houseType,
    id: `${houseType.id}-${configuration.toLowerCase().replace(/_/g, '-')}`,
    name,
    configuration,
    buildCostPerM2: houseType.gifaM2 > 0 && componentTotal > 0 ? componentTotal / houseType.gifaM2 : houseType.buildCostPerM2,
    updatedAt: timestamp,
  }));
}

export function buildDetailedDefaultCostBreakdown(row: AppraisalHouseTypeDetailedDefault): AppraisalHouseTypeCostComponent[] {
  return Object.keys(APPRAISAL_HOUSE_TYPE_COST_LABELS).map((keyValue) => {
    const key = keyValue as AppraisalHouseTypeCostComponentKey;
    const sourceIndex = SOURCE_COMPONENT_KEYS.indexOf(key);
    const amount = sourceIndex >= 0
      ? Math.max(0, row.costs[sourceIndex] || 0)
      : APPRAISAL_HOUSE_TYPE_STANDARD_COMPONENT_AMOUNTS[key] || 0;
    return {
      id: `seed-${slugName(row.name)}-${key.toLowerCase()}`,
      key,
      label: APPRAISAL_HOUSE_TYPE_COST_LABELS[key],
      amount,
      priceIndex: APPRAISAL_HOUSE_TYPE_DEFAULT_PRICE_INDEX,
      included: isOptionalHouseTypeCostComponent(key) ? amount > 0 : true,
      notes: '',
    };
  });
}

export function mergeAppraisalHouseTypeCostDefaults(current: AppraisalHouseTypeLibraryItem[]): {
  houseTypes: AppraisalHouseTypeLibraryItem[];
  inserted: number;
  updated: number;
} {
  const legacyCurrentIds = new Set(
    current
      .filter((houseType) => normaliseName(houseType.name).startsWith('x') && resolveAppraisalStandardHouseTypeName(houseType.name))
      .map((houseType) => houseType.id)
  );
  const normalizedCurrent = normalizeAppraisalHouseTypeLibraryItems(current);
  const byName = new Map<string, AppraisalHouseTypeLibraryItem>();
  normalizedCurrent.forEach((houseType) => {
    const key = normaliseName(resolveAppraisalStandardHouseTypeName(houseType.name) || houseType.name);
    if (!byName.has(key)) byName.set(key, houseType);
  });
  const handledExistingIds = new Set<string>();
  const legacySeedNames = new Set(
    APPRAISAL_HOUSE_TYPE_DETAILED_DEFAULTS.map((row) => normaliseName(legacyXPrefixedName(row.name)))
  );
  const timestamp = new Date().toISOString();
  let inserted = 0;
  let updated = 0;

  const seededHouseTypes = APPRAISAL_HOUSE_TYPE_DETAILED_DEFAULTS.map((row) => {
    const key = normaliseName(row.name);
    const legacyKey = normaliseName(legacyXPrefixedName(row.name));
    const existing = byName.get(key) || byName.get(legacyKey);
    const costBreakdown = buildDetailedDefaultCostBreakdown(row);
    const componentTotal = calculateHouseTypeCostBreakdownTotal(costBreakdown);

    if (existing) {
      handledExistingIds.add(existing.id);
      updated += 1;
      return {
        ...existing,
        name: row.name,
        style: row.style,
        configuration: row.configuration,
        storeys: row.storeys,
        bedrooms: row.bedrooms,
        garage: row.garage,
        privateDrive: row.privateDrive,
        gifaM2: row.gifaM2,
        costBreakdown,
        buildCostPerM2: row.gifaM2 > 0 ? componentTotal / row.gifaM2 : 0,
        priceIndex: 0,
        buildPeriodMonths: APPRAISAL_HOUSE_TYPE_DEFAULT_BUILD_MONTHS,
        notes: existing.notes,
        updatedAt: timestamp,
      };
    }

    inserted += 1;
    return createDefaultAppraisalHouseType({
      name: row.name,
      style: row.style,
      configuration: row.configuration,
      storeys: row.storeys,
      bedrooms: row.bedrooms,
      garage: row.garage,
      privateDrive: row.privateDrive,
      gifaM2: row.gifaM2,
      buildCostPerM2: row.gifaM2 > 0 ? componentTotal / row.gifaM2 : 0,
      costBreakdown,
      priceIndex: 0,
      buildPeriodMonths: APPRAISAL_HOUSE_TYPE_DEFAULT_BUILD_MONTHS,
      notes: row.sourceUnits > 0 ? `Source units: ${row.sourceUnits}` : '',
      updatedAt: timestamp,
    });
  });

  const untouchedHouseTypes = normalizedCurrent
    .filter((houseType) => (
      !handledExistingIds.has(houseType.id)
      && !legacyCurrentIds.has(houseType.id)
      && !legacySeedNames.has(normaliseName(houseType.name))
      && !APPRAISAL_RETIRED_HOUSE_TYPE_NAMES.some((name) => normaliseName(name) === normaliseName(houseType.name))
    ))
    .flatMap((houseType) => createTerraceVariants(houseType, timestamp));
  return {
    houseTypes: normalizeAppraisalHouseTypeLibraryItems([...seededHouseTypes, ...untouchedHouseTypes]),
    inserted,
    updated,
  };
}
