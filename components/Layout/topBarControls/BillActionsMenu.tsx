import { Copy, Edit2, Menu, Settings, Tag, Upload } from 'lucide-react';
import type { ClearValuesMode } from '../../../types';
import type { ContextMenuEntry } from '../../UI/ContextMenu';
import { MenuActionList } from '../../UI/MenuActionList';
import { PopoverMenu } from '../../UI/PopoverMenu';
import { buildClearValuesActionItems } from '../../Project/billActionMenuItems';
import type { PromptHandler } from './types';

export function BillActionsMenu({
  activeBill,
  currentProject,
  canAssignTrade,
  onOpenTradeAssign,
  onOpenImportLines,
  onCopyBill,
  onClearBillValues,
  onOpenPrompt,
  onOpenBillSettings,
}: {
  activeBill?: any;
  currentProject?: any;
  canAssignTrade: boolean;
  onOpenTradeAssign: () => void;
  onOpenImportLines?: () => void;
  onCopyBill?: () => void;
  onClearBillValues?: (billId: string, mode: ClearValuesMode) => void;
  onOpenPrompt?: PromptHandler;
  onOpenBillSettings?: () => void;
}) {
  if (!activeBill) return null;

  const items: ContextMenuEntry[] = [
    { id: 'bill-actions-assign-label', type: 'label', label: 'Assign' },
    canAssignTrade
      ? {
          id: 'bill-actions-assign-trade',
          label: 'Assign trade',
          description: 'Assign a trade to the bill, section, or page.',
          icon: <Tag className="h-4 w-4" />,
          onSelect: onOpenTradeAssign,
        }
      : {
          id: 'bill-actions-assign-disabled',
          label: 'Assign trade',
          description: 'Create a trade package before bulk assignment.',
          icon: <Tag className="h-4 w-4" />,
          disabled: true,
          onSelect: () => {},
        },
    { id: 'bill-actions-import-label', type: 'label', label: 'Import' },
  ];

  if (onOpenImportLines) {
    items.push({
      id: 'bill-actions-import-lines',
      label: 'Import lines',
      description: 'Bring external bill lines into the active project.',
      icon: <Upload className="h-4 w-4" />,
      onSelect: onOpenImportLines,
    });
  }
  if (onClearBillValues) {
    items.push(
      ...buildClearValuesActionItems((mode) => onClearBillValues(activeBill.id, mode))
    );
  }

  items.push({ id: 'bill-actions-edit-label', type: 'label', label: 'Edit/settings' });
  if (onCopyBill) {
    items.push({
      id: 'bill-actions-copy-bill',
      label: 'Copy current bill',
      description: 'Duplicate the active bill structure and items.',
      icon: <Copy className="h-4 w-4" />,
      onSelect: onCopyBill,
    });
  }
  if (onOpenPrompt && currentProject) {
    items.push({
      id: 'bill-actions-rename-project',
      label: 'Rename project',
      icon: <Edit2 className="h-4 w-4" />,
      onSelect: () => onOpenPrompt('RENAME_PROJECT', { id: currentProject.id, name: currentProject.name }),
    });
  }
  if (onOpenPrompt) {
    items.push({
      id: 'bill-actions-rename-bill',
      label: 'Rename current bill',
      icon: <Edit2 className="h-4 w-4" />,
      onSelect: () => onOpenPrompt('RENAME_BILL', { id: activeBill.id, name: activeBill.name }),
    });
  }
  if (onOpenBillSettings) {
    items.push({
      id: 'bill-actions-bill-settings',
      label: 'Bill settings',
      description: 'Edit bill type and house-type settings.',
      icon: <Settings className="h-4 w-4" />,
      onSelect: onOpenBillSettings,
    });
  }

  return (
    <PopoverMenu
      ariaLabel="Bill actions"
      width={300}
      estimatedHeight={460}
      trigger={({ ref, isOpen, toggle }) => (
        <button
          ref={ref}
          type="button"
          onClick={toggle}
          className="workspace-secondary-btn px-3.5 py-2 text-xs"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          title="Common bill actions"
        >
          <Menu className="h-4 w-4" />
          Actions
        </button>
      )}
    >
      {(close) => <MenuActionList items={items} close={close} />}
    </PopoverMenu>
  );
}
