export const APPRAISAL_HOUSE_TYPE_DEFAULT_PRICE_INDEX = 233;
export const APPRAISAL_HOUSE_TYPE_DEFAULT_BUILD_MONTHS = 4;

export const APPRAISAL_STANDARD_HOUSE_TYPE_NAMES = [
  'Arisaig',
  'Arrochar',
  'Killiecrankie',
  'Cheviot',
  'Clyde',
  'Cuillin',
  'Devon',
  'Fintry',
  'Morar',
  'Nevis',
  'Ochil',
  'Sidlaw',
  'Tay',
  'Kintail Mid',
  'Lewis',
  'Cairngorm',
  'Galloway',
  'F4-6 End Terrace',
  'F4-6 Mid Terrace',
  'K3-5 End Terrace',
  'K3-5 Mid Terrace',
  'A2-4',
  'E3-5 End Terrace',
  'E3-5 Mid Terrace',
  'D2-4 End Terrace',
  'D2-4 Mid Terrace',
  'G4-6 End Terrace',
  'G4-6 Mid Terrace',
  'CF2-4L',
  'CF2-4U',
  'J5-8 End Terrace',
  'J5-8 Mid Terrace',
  'Kintail End',
  'Morven Mid',
  'Morven End',
];

const standardNameByKey = new Map(APPRAISAL_STANDARD_HOUSE_TYPE_NAMES.map((name) => [name.toLowerCase(), name]));
const legacyXPrefixedNameByKey = new Map(APPRAISAL_STANDARD_HOUSE_TYPE_NAMES.map((name) => [`x${name}`.toLowerCase(), name]));
const legacyNameAliases = new Map<string, string>([
  ['cairrngorm', 'Cairngorm'],
  ['f4-6', 'F4-6 Mid Terrace'],
  ['xf4-6', 'F4-6 Mid Terrace'],
  ['k3-5', 'K3-5 Mid Terrace'],
  ['xk3-5', 'K3-5 Mid Terrace'],
  ['e3-5', 'E3-5 Mid Terrace'],
  ['xe3-5', 'E3-5 Mid Terrace'],
  ['d2-4', 'D2-4 Mid Terrace'],
  ['xd2-4', 'D2-4 Mid Terrace'],
  ['g4-6', 'G4-6 Mid Terrace'],
  ['xg4-6', 'G4-6 Mid Terrace'],
  ['5-8', 'J5-8 Mid Terrace'],
  ['x5-8', 'J5-8 Mid Terrace'],
  ['j5-8', 'J5-8 Mid Terrace'],
  ['xj5-8', 'J5-8 Mid Terrace'],
]);

export function resolveAppraisalStandardHouseTypeName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const key = value.trim().toLowerCase();
  return standardNameByKey.get(key) || legacyNameAliases.get(key) || legacyXPrefixedNameByKey.get(key) || null;
}
