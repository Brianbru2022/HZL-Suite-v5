import { MoreHorizontal } from 'lucide-react';
import type { BoQItem, TradePackage } from '../../types';
import { stripRichText } from '../../utils/richText';
import { PopoverMenu } from '../UI/PopoverMenu';
import { TradeAssignDropdown } from '../UI/TradeAssignDropdown';
import { MenuActionList } from '../UI/MenuActionList';
import { buildBillRowActionItems } from './billActionMenuItems';
import { getTradeAssignmentHelperText } from './billRowHelpers';

export function BillRowActionsMenu({
  item,
  itemTypeLabel,
  trades,
  trade,
  canAssignTrade,
  canMoveUp,
  canMoveDown,
  onEdit,
  onAddAfter,
  onAssignTrade,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  item: BoQItem;
  itemTypeLabel: string;
  trades: TradePackage[];
  trade?: TradePackage | null;
  canAssignTrade: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onEdit: () => void;
  onAddAfter?: () => void;
  onAssignTrade: (tradeId: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  return (
    <PopoverMenu
      ariaLabel={`Actions for ${stripRichText(item.description)?.trim() || itemTypeLabel}`}
      width={260}
      estimatedHeight={360}
      trigger={({ ref, isOpen, toggle }) => (
        <button
          ref={ref}
          type="button"
          onClick={toggle}
          className="inline-flex h-7 w-7 items-center justify-center rounded-app-sm text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-slate-500 dark:hover:bg-surface-800 dark:hover:text-slate-200"
          aria-label={`Open actions for ${stripRichText(item.description)?.trim() || itemTypeLabel}`}
          aria-haspopup="menu"
          aria-expanded={isOpen}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      )}
    >
      {(close) => (
        <div>
          <MenuActionList
            items={buildBillRowActionItems({
              item,
              itemTypeLabel,
              index: 0,
              itemCount: 1,
              canMoveUp,
              canMoveDown,
              onEdit,
              onAddAfter,
              onMoveUp,
              onMoveDown,
              onDelete,
            })}
            close={close}
            itemTextSize="text-xs"
          />
          {canAssignTrade && (
            <div className="px-1 py-1">
              <TradeAssignDropdown
                trades={trades}
                onSelect={(tradeId) => {
                  close();
                  onAssignTrade(tradeId);
                }}
                label={trade ? `Assign trade: ${trade.name}` : 'Assign trade'}
                helperText={getTradeAssignmentHelperText(item, trade)}
                triggerClassName="flex w-full items-center gap-2 rounded-app-sm border border-slate-200 bg-white px-2 py-2 text-left text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300 dark:hover:bg-surface-800 dark:hover:text-slate-100"
              />
            </div>
          )}
        </div>
      )}
    </PopoverMenu>
  );
}
