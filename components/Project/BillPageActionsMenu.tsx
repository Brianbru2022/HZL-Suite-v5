import { MoreHorizontal } from 'lucide-react';
import type { ClearValuesMode, TradePackage } from '../../types';
import { PopoverMenu } from '../UI/PopoverMenu';
import { TradeAssignDropdown } from '../UI/TradeAssignDropdown';
import { MenuActionList } from '../UI/MenuActionList';
import { buildBillPageActionItems } from './billActionMenuItems';

export function BillPageActionsMenu({
  pageName,
  pricedItemCount,
  trades,
  tradeLabel,
  tradeHelperText,
  onRename,
  onCopy,
  onImportJson,
  onAssignTrade,
  onCreateTrade,
  onClearValues,
  onDelete,
}: {
  pageName: string;
  pricedItemCount: number;
  trades: TradePackage[];
  tradeLabel: string;
  tradeHelperText: string;
  onRename: () => void;
  onCopy?: () => void;
  onImportJson?: () => void;
  onAssignTrade?: (tradeId: string) => void;
  onCreateTrade: () => void;
  onClearValues?: (mode: ClearValuesMode) => void;
  onDelete?: () => void;
}) {
  return (
    <PopoverMenu
      ariaLabel={`${pageName} actions`}
      width={256}
      estimatedHeight={420}
      trigger={({ ref, isOpen, toggle }) => (
        <button
          ref={ref}
          type="button"
          onClick={toggle}
          className="rounded-app-sm border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300 dark:hover:bg-surface-800"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label={`${pageName} actions`}
          title="Page actions"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      )}
    >
      {(close) => (
        <div>
          <MenuActionList
            items={buildBillPageActionItems({
              onRename,
              onCopy,
              onImportJson,
              onClearValues,
              onDelete,
            })}
            close={close}
            itemTextSize="text-xs"
          />
          {onAssignTrade && pricedItemCount > 0 && (
            <div className="px-1 py-1">
              <TradeAssignDropdown
                trades={trades}
                onSelect={(tradeId) => {
                  close();
                  onAssignTrade(tradeId);
                }}
                label={tradeLabel}
                selectionCount={pricedItemCount}
                helperText={tradeHelperText}
                triggerClassName="flex w-full items-center gap-2 rounded-app-sm border border-slate-200 bg-white px-2 py-2 text-left text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300 dark:hover:bg-surface-800 dark:hover:text-slate-100"
                onCreateTrade={onCreateTrade}
              />
            </div>
          )}
        </div>
      )}
    </PopoverMenu>
  );
}
