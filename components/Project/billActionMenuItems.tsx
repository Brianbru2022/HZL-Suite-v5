import { ChevronDown, ChevronUp, Copy, Cpu, Edit2, Eraser, FileDown, Layers, Library as LibraryIcon, MessageSquare, Plus, Trash2, Type, Upload } from 'lucide-react';
import type { BoQItem, ClearValuesMode } from '../../types';
import { stripRichText } from '../../utils/richText';
import type { ContextMenuEntry } from '../UI/ContextMenu';
import { MenuActionList } from '../UI/MenuActionList';

const CLEAR_VALUES_OPTIONS: Array<{ mode: ClearValuesMode; label: string; detail: string }> = [
  { mode: 'RATES', label: 'Clear rates only', detail: 'Keep quantities and measurements' },
  { mode: 'QUANTITIES', label: 'Clear quantities only', detail: 'Keep rates and measurements' },
  { mode: 'RATES_AND_QUANTITIES', label: 'Clear rates and quantities', detail: 'Keep measurement rows' },
];

export function ClearValuesMenuGroup({
  onClear,
  close,
  className,
}: {
  onClear?: (mode: ClearValuesMode) => void;
  close?: () => void;
  className?: string;
}) {
  if (!onClear) return null;

  return (
    <div className={className}>
      <MenuActionList items={buildClearValuesActionItems(onClear)} close={close || (() => {})} itemTextSize="text-xs" />
    </div>
  );
}

export function buildClearValuesActionItems(onClear: (mode: ClearValuesMode) => void): ContextMenuEntry[] {
  return [
    { id: 'clear-label', type: 'label', label: 'Clear values' },
    ...CLEAR_VALUES_OPTIONS.map((option) => ({
      id: `clear-${option.mode}`,
      label: option.label,
      description: option.detail,
      tone: 'warning' as const,
      icon: <Eraser className="h-3.5 w-3.5" />,
      onSelect: () => onClear(option.mode),
    })),
  ];
}

export function buildBillRowActionItems({
  item,
  itemTypeLabel,
  index,
  itemCount,
  canMoveUp,
  canMoveDown,
  onEdit,
  onAddAfter,
  onAddHeadingAfter,
  onAddCommentAfter,
  onAddPageAfter,
  onAddSectionAfter,
  onOpenStandardsInsert,
  onOpenLibrary,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  item: BoQItem;
  itemTypeLabel: string;
  index: number;
  itemCount: number;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onEdit: () => void;
  onAddAfter?: () => void;
  onAddHeadingAfter?: () => void;
  onAddCommentAfter?: () => void;
  onAddPageAfter?: () => void;
  onAddSectionAfter?: () => void;
  onOpenStandardsInsert?: () => void;
  onOpenLibrary?: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}): ContextMenuEntry[] {
  const addHereItems: ContextMenuEntry[] = [
    ...(onAddSectionAfter
      ? [{
          id: 'row-add-section-after',
          label: 'Add section after this section',
          description: 'Create the next bill section after the current section.',
          icon: <Layers className="h-4 w-4" />,
          tone: 'section' as const,
          onSelect: onAddSectionAfter,
        }]
      : []),
    ...(onAddPageAfter
      ? [{
          id: 'row-add-page-after',
          label: 'Add page here',
          description: 'Create the next page in this section.',
          icon: <Layers className="h-4 w-4" />,
          tone: 'page' as const,
          onSelect: onAddPageAfter,
        }]
      : []),
    ...(onAddHeadingAfter
      ? [{
          id: 'row-add-heading-after',
          label: 'Add heading after',
          description: 'Create a heading immediately after this row.',
          icon: <Layers className="h-4 w-4" />,
          tone: 'heading' as const,
          onSelect: onAddHeadingAfter,
        }]
      : []),
    ...(onAddCommentAfter
      ? [{
          id: 'row-add-comment-after',
          label: 'Add comment after',
          description: 'Create a comment immediately after this row.',
          icon: <Plus className="h-4 w-4" />,
          tone: 'comment' as const,
          onSelect: onAddCommentAfter,
        }]
      : []),
    ...(onAddAfter
      ? [{
          id: 'row-add-after',
          label: 'Add priced item after',
          description: 'Continue directly after this row.',
          icon: <Plus className="h-4 w-4" />,
          tone: 'priced' as const,
          onSelect: onAddAfter,
        }]
      : []),
  ];
  const standardsItems: ContextMenuEntry[] = [
    ...(onOpenStandardsInsert
      ? [{
          id: 'row-open-standards-insert',
          label: 'Open Standards insert here',
          description: 'Use this row as the insert anchor.',
          icon: <LibraryIcon className="h-4 w-4" />,
          tone: 'standards' as const,
          onSelect: onOpenStandardsInsert,
        }]
      : []),
    ...(onOpenLibrary
      ? [{
          id: 'row-open-library',
          label: 'Open full library',
          icon: <LibraryIcon className="h-4 w-4" />,
          tone: 'standards' as const,
          onSelect: onOpenLibrary,
        }]
      : []),
  ];

  return [
    { id: 'row-edit-label', type: 'label', label: 'Edit' },
    {
      id: 'row-edit',
      label: 'Edit line',
      description: stripRichText(item.description)?.trim() || itemTypeLabel,
      icon: <Edit2 className="h-4 w-4" />,
      onSelect: onEdit,
    },
    ...(addHereItems.length ? [{ id: 'row-add-label', type: 'label' as const, label: 'Add here' }, ...addHereItems] : []),
    ...(standardsItems.length ? [{ id: 'row-standards-label', type: 'label' as const, label: 'Standards' }, ...standardsItems] : []),
    { id: 'row-move-label', type: 'label', label: 'Move' },
    {
      id: 'row-move-up',
      label: 'Move up',
      icon: <ChevronUp className="h-4 w-4" />,
      disabled: canMoveUp === undefined ? index <= 0 : !canMoveUp,
      onSelect: onMoveUp,
    },
    {
      id: 'row-move-down',
      label: 'Move down',
      icon: <ChevronDown className="h-4 w-4" />,
      disabled: canMoveDown === undefined ? index >= itemCount - 1 : !canMoveDown,
      onSelect: onMoveDown,
    },
    { id: 'row-danger-label', type: 'label', label: 'Danger' },
    {
      id: 'row-delete',
      label: 'Delete line',
      icon: <Trash2 className="h-4 w-4" />,
      tone: 'danger',
      onSelect: onDelete,
    },
  ];
}

export function buildBillPageActionItems({
  onRename,
  onCopy,
  onImportJson,
  onClearValues,
  onDelete,
}: {
  onRename: () => void;
  onCopy?: () => void;
  onImportJson?: () => void;
  onClearValues?: (mode: ClearValuesMode) => void;
  onDelete?: () => void;
}): ContextMenuEntry[] {
  return [
    { id: 'page-edit-label', type: 'label', label: 'Edit' },
    {
      id: 'page-rename',
      label: 'Rename page',
      icon: <Edit2 className="h-4 w-4" />,
      onSelect: onRename,
    },
    ...(onCopy
      ? [{
          id: 'page-copy',
          label: 'Copy page',
          icon: <Copy className="h-4 w-4" />,
          onSelect: onCopy,
        }]
      : []),
    { id: 'page-import-label', type: 'label', label: 'Import/export' },
    ...(onImportJson
      ? [{
          id: 'page-import-json',
          label: 'Import JSON',
          icon: <Upload className="h-4 w-4" />,
          onSelect: onImportJson,
        }]
      : []),
    ...(onClearValues ? buildClearValuesActionItems(onClearValues) : []),
    ...(onDelete
      ? [
          { id: 'page-danger-label', type: 'label' as const, label: 'Danger' },
          {
            id: 'page-delete',
            label: 'Delete page',
            icon: <Trash2 className="h-4 w-4" />,
            tone: 'danger' as const,
            onSelect: onDelete,
          },
        ]
      : []),
  ];
}

export function buildBillSectionActionItems({
  onAddItem,
  onAddHeading,
  onAddComment,
  onAddSection,
  onAiFill,
  onSaveAssembly,
  onRename,
  onCopy,
  onOpenStandardsInsert,
  onOpenLibrary,
  onAddPage,
  onImportJson,
  onExportSection,
  onMoveUp,
  onMoveDown,
  onClearValues,
  onDelete,
}: {
  onAddItem: () => void;
  onAddHeading?: () => void;
  onAddComment?: () => void;
  onAddSection?: () => void;
  onAiFill: () => void;
  onSaveAssembly?: () => void;
  onRename: () => void;
  onCopy?: () => void;
  onOpenStandardsInsert?: () => void;
  onOpenLibrary: () => void;
  onAddPage: () => void;
  onImportJson?: () => void;
  onExportSection?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onClearValues?: (mode: ClearValuesMode) => void;
  onDelete?: () => void;
}): ContextMenuEntry[] {
  return [
    { id: 'section-add-label', type: 'label', label: 'Add' },
    {
      id: 'section-add-item',
      label: 'Add priced item',
      icon: <Plus className="h-4 w-4" />,
      onSelect: onAddItem,
    },
    ...(onAddHeading
      ? [{
          id: 'section-add-heading',
          label: 'Add heading',
          icon: <Type className="h-4 w-4" />,
          tone: 'heading' as const,
          onSelect: onAddHeading,
        }]
      : []),
    ...(onAddComment
      ? [{
          id: 'section-add-comment',
          label: 'Add comment',
          icon: <MessageSquare className="h-4 w-4" />,
          tone: 'comment' as const,
          onSelect: onAddComment,
        }]
      : []),
    ...(onAddSection
      ? [{
          id: 'section-add-section-after',
          label: 'Add section',
          description: 'Create another section after this one.',
          icon: <Layers className="h-4 w-4" />,
          tone: 'section' as const,
          onSelect: onAddSection,
        }]
      : []),
    {
      id: 'section-add-page',
      label: 'Add page',
      icon: <Plus className="h-4 w-4" />,
      onSelect: onAddPage,
    },
    { id: 'section-ai-label', type: 'label', label: 'AI' },
    {
      id: 'section-ai-fill',
      label: 'AI fill section',
      icon: <Cpu className="h-4 w-4" />,
      onSelect: onAiFill,
    },
    { id: 'section-edit-label', type: 'label', label: 'Edit' },
    ...(onSaveAssembly
      ? [{
          id: 'section-save-assembly',
          label: 'Save as assembly',
          icon: <Layers className="h-4 w-4" />,
          onSelect: onSaveAssembly,
        }]
      : []),
    {
      id: 'section-rename',
      label: 'Rename section',
      icon: <Edit2 className="h-4 w-4" />,
      onSelect: onRename,
    },
    ...(onCopy
      ? [{
          id: 'section-copy',
          label: 'Copy section',
          icon: <Copy className="h-4 w-4" />,
          onSelect: onCopy,
        }]
      : []),
    { id: 'section-standards-label', type: 'label', label: 'Standards' },
    ...(onOpenStandardsInsert
      ? [{
          id: 'section-open-standards-insert',
          label: 'Insert standards',
          description: 'Open the compact standards insert panel for drag and drop.',
          icon: <LibraryIcon className="h-4 w-4" />,
          tone: 'standards' as const,
          onSelect: onOpenStandardsInsert,
        }]
      : []),
    {
      id: 'section-open-library',
      label: 'Open full library',
      icon: <LibraryIcon className="h-4 w-4" />,
      tone: 'standards',
      onSelect: onOpenLibrary,
    },
    { id: 'section-import-label', type: 'label', label: 'Import/export' },
    ...(onImportJson
      ? [{
          id: 'section-import-json',
          label: 'Import JSON',
          icon: <Upload className="h-4 w-4" />,
          onSelect: onImportJson,
        }]
      : []),
    ...(onExportSection
      ? [{
          id: 'section-export',
          label: 'Export section',
          icon: <FileDown className="h-4 w-4" />,
          onSelect: onExportSection,
        }]
      : []),
    { id: 'section-move-label', type: 'label', label: 'Move' },
    ...(onMoveUp
      ? [{
          id: 'section-move-up',
          label: 'Move up',
          icon: <ChevronUp className="h-4 w-4" />,
          onSelect: onMoveUp,
        }]
      : []),
    ...(onMoveDown
      ? [{
          id: 'section-move-down',
          label: 'Move down',
          icon: <ChevronDown className="h-4 w-4" />,
          onSelect: onMoveDown,
        }]
      : []),
    ...(onClearValues ? buildClearValuesActionItems(onClearValues) : []),
    ...(onDelete
      ? [
          { id: 'section-danger-label', type: 'label' as const, label: 'Danger' },
          {
            id: 'section-delete',
            label: 'Delete section',
            icon: <Trash2 className="h-4 w-4" />,
            tone: 'danger' as const,
            onSelect: onDelete,
          },
        ]
      : []),
  ];
}
