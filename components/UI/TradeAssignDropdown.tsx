
import React from 'react';
import { Plus, Tag, Users } from 'lucide-react';
import { TradePackage } from '../../types';
import { PopoverMenu } from './PopoverMenu';

const triggerClass = "flex items-center gap-1.5 bg-surface-muted dark:bg-surface-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded-app-sm text-[10px] font-medium hover:bg-surface-200 dark:hover:bg-surface-900 transition-colors";

type TradeAssignDropdownProps = {
  trades: TradePackage[];
  onSelect: (id: string) => void;
  label: string;
  selectionCount?: number;
  helperText?: string;
  onCreateTrade?: () => void;
  triggerClassName?: string;
};

export const TradeAssignDropdown: React.FC<TradeAssignDropdownProps> = ({
  trades,
  onSelect,
  label,
  selectionCount,
  helperText,
  onCreateTrade,
  triggerClassName,
}) => {
  const estimatedMenuHeight = trades.length === 0 ? 220 : Math.min(380, 110 + trades.length * 60);

  return (
    <PopoverMenu
      ariaLabel={`${label} trade assignment`}
      width={320}
      estimatedHeight={estimatedMenuHeight}
      menuClassName="workspace-popover-menu rounded-app py-2"
      trigger={({ ref, isOpen, toggle }) => (
        <button
          ref={ref}
          type="button"
          onClick={toggle}
          className={triggerClassName || triggerClass}
          aria-haspopup="menu"
          aria-expanded={isOpen}
        >
          <Tag className="w-3 h-3 shrink-0" />
          <span>{label}</span>
          {selectionCount !== undefined && selectionCount > 0 && (
            <span className="inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-primary-600 px-1.5 py-0.5 text-[9px] font-semibold text-white">
              {selectionCount}
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-700">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Assign to trade package
            </div>
            <div className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
              {helperText || 'Choose the trade package that should own these priced items.'}
            </div>
          </div>
          {trades.length === 0 ? (
            <div className="px-3 py-4">
              <div className="rounded-app-sm border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center dark:border-slate-700 dark:bg-slate-900/70">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  No trade packages yet
                </div>
                <div className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                  Create the first trade package to start allocating measured items.
                </div>
                {onCreateTrade && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      close();
                      onCreateTrade();
                    }}
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-app-sm bg-primary-600 px-3 py-2 text-xs font-medium text-white shadow-app transition-colors hover:bg-primary-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create first trade
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto px-2 py-2">
              {trades.map((trade: TradePackage) => {
                const contractorCount = trade.contractors.length;

                return (
                  <button
                    key={trade.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      close();
                      onSelect(trade.id);
                    }}
                    aria-label={`Assign ${label.toLowerCase()} to ${trade.name}`}
                    className="w-full rounded-app-sm border border-transparent px-3 py-2.5 text-left transition-colors hover:border-slate-200 hover:bg-surface-muted dark:hover:border-slate-700 dark:hover:bg-surface-900"
                  >
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {trade.name}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {contractorCount} available contractor{contractorCount === 1 ? '' : 's'}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">Tender invites are project-specific</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </PopoverMenu>
  );
};
