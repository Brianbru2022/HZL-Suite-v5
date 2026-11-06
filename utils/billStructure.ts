import type { BoQItem, ItemType } from '../types';

const HEADING_TYPES = new Set<ItemType>(['GENERAL_HEADING', 'MAJOR_HEADING', 'SUB_SECTION', 'MINOR_HEADING']);
const COMMENT_TYPES = new Set<ItemType>(['COMMENT', 'SUB_COMMENT']);

export function isHeadingItemType(type: ItemType) {
  return HEADING_TYPES.has(type);
}

export function isCommentItemType(type: ItemType) {
  return COMMENT_TYPES.has(type);
}

export function getNextHeadingItemType(anchorType?: ItemType | null): ItemType {
  switch (anchorType) {
    case 'GENERAL_HEADING':
      return 'MAJOR_HEADING';
    case 'MAJOR_HEADING':
      return 'SUB_SECTION';
    case 'SUB_SECTION':
    case 'MINOR_HEADING':
      return 'MINOR_HEADING';
    default:
      return 'GENERAL_HEADING';
  }
}

export function getNextCommentItemType(anchorType?: ItemType | null): ItemType {
  return anchorType === 'COMMENT' || anchorType === 'SUB_COMMENT' ? 'SUB_COMMENT' : 'COMMENT';
}

export function getPriorCommentContextType(items: BoQItem[], itemIndex: number): ItemType | null {
  for (let index = itemIndex - 1; index >= 0; index -= 1) {
    const type = items[index]?.type;
    if (!type) continue;
    if (isCommentItemType(type)) return type;
    if (isHeadingItemType(type)) return null;
  }
  return null;
}
