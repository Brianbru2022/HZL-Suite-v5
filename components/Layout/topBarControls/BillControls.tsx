import { useState } from 'react';
import { ChevronDown, Copy, GripVertical, Plus, Settings } from 'lucide-react';
import { PopoverMenu } from '../../UI/PopoverMenu';

const isNumberedBillName = (name?: string | null) => /^(.*\D)\s*(\d+)$/.test((name || '').trim());

export function BillControls({
  bills,
  activeBill,
  activeBillId,
  setActiveBillId,
  onReorderBills,
  onAddBill,
  onOpenBillSettings,
  onCopyBill,
}: {
  bills: any[];
  activeBill?: any;
  activeBillId?: string | null;
  setActiveBillId?: (id: string) => void;
  onReorderBills?: (draggedBillId: string, targetBillId: string) => void;
  onAddBill?: () => void;
  onOpenBillSettings?: () => void;
  onCopyBill?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draggedBillId, setDraggedBillId] = useState<string | null>(null);
  const activeBillLabel = activeBill?.name || 'No bill selected';
  const isHouseTypeBill = activeBill?.billType === 'HOUSE_TYPE';
  const billTypeLabel = isHouseTypeBill
    ? `House type: ${activeBill?.houseTypeName || activeBill?.name || 'Bill'} x${activeBill?.houseTypeQuantity || 1}`
    : 'Standard bill';

  const handleBillDrop = (targetBillId: string, explicitDraggedBillId?: string) => {
    const sourceBillId = explicitDraggedBillId || draggedBillId;
    if (!sourceBillId || sourceBillId === targetBillId) return;
    onReorderBills?.(sourceBillId, targetBillId);
    setDraggedBillId(null);
  };

  if (bills.length === 0) return null;

  return (
    <div className="hidden lg:flex items-center gap-2 rounded-full border border-slate-200 bg-white/75 px-2 py-1 dark:border-slate-700 dark:bg-[rgb(27_36_44_/_0.9)]">
      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Bill</span>
      <PopoverMenu
        ariaLabel="Select or reorder bill"
        align="left"
        width={288}
        estimatedHeight={480}
        open={open}
        onOpenChange={setOpen}
        menuClassName="workspace-popover-menu rounded-app p-2"
        trigger={({ ref, isOpen, toggle }) => (
          <button
            ref={ref}
            type="button"
            onClick={toggle}
            className="inline-flex max-w-[220px] items-center gap-2 bg-transparent py-0.5 pl-2 pr-1 text-[11px] font-medium text-slate-700 focus:outline-none dark:text-slate-200"
            aria-haspopup="menu"
            aria-expanded={isOpen}
            aria-label="Select or reorder bill"
          >
            <span className="truncate">
              {activeBill
                ? activeBill.billType === 'HOUSE_TYPE'
                  ? `${activeBill.houseTypeName || activeBill.name} x${activeBill.houseTypeQuantity || 1}`
                  : activeBill.name
                : 'No bill selected'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          </button>
        )}
      >
        {(close) => (
          <>
            <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              Drag numbered bills to reorder
            </div>
            <div className="space-y-1">
              {bills.map((bill: any, index: number) => {
                const isActiveBill = bill.id === activeBillId;
                const canDragBill = isNumberedBillName(bill.name);
                return (
                  <div
                    key={bill.id}
                    onDragEnd={() => setDraggedBillId(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      handleBillDrop(bill.id, event.dataTransfer.getData('text/plain'));
                    }}
                    className={`rounded-app-sm border transition-colors ${
                      draggedBillId === bill.id
                        ? 'border-primary-300 bg-primary-50 dark:border-primary-700 dark:bg-primary-900/30'
                        : 'border-transparent bg-transparent hover:border-slate-200 hover:bg-surface-muted dark:hover:border-slate-700 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <div
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${
                        isActiveBill ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {bill.billType === 'HOUSE_TYPE'
                            ? `${bill.houseTypeName || bill.name} x${bill.houseTypeQuantity || 1}`
                            : bill.name}
                        </div>
                        <div className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                          {`Position ${index + 1}`}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveBillId?.(bill.id);
                            close();
                          }}
                          className="rounded-app-sm border border-slate-200/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                        >
                          Select
                        </button>
                        <div
                          draggable={canDragBill}
                          onDragStart={(event) => {
                            if (!canDragBill) {
                              event.preventDefault();
                              return;
                            }
                            setDraggedBillId(bill.id);
                            event.dataTransfer.effectAllowed = 'move';
                            event.dataTransfer.setData('text/plain', bill.id);
                          }}
                          className={`inline-flex items-center gap-1 rounded-app-sm border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors ${
                            canDragBill
                              ? 'cursor-grab border-slate-200/80 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing dark:border-slate-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200'
                              : 'cursor-not-allowed border-slate-200/60 text-slate-300 dark:border-slate-700/60 dark:text-slate-600'
                          }`}
                          title={canDragBill ? 'Click and drag to reorder this numbered bill' : 'Only bill names ending in a number can be drag-reordered'}
                          aria-label={canDragBill ? `Drag to reorder ${bill.name}` : `${bill.name} is not draggable`}
                        >
                          <GripVertical className="h-3 w-3" />
                          {canDragBill ? 'Drag' : 'Fixed'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </PopoverMenu>
      <button
        type="button"
        onClick={onAddBill}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/70 dark:hover:text-slate-100"
        aria-label="Add new bill"
        title="Add new bill"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      {activeBill && onOpenBillSettings && (
        <button
          type="button"
          onClick={onOpenBillSettings}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
            isHouseTypeBill
              ? 'border-amber-300 bg-amber-50 text-amber-800 shadow-sm hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/40'
              : 'border-slate-200/80 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700/80 dark:hover:text-slate-100'
          }`}
          aria-label={`Open bill settings for ${activeBillLabel}`}
          title={billTypeLabel}
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      )}
      {activeBill && onCopyBill && (
        <button
          type="button"
          onClick={onCopyBill}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700/80 dark:hover:text-slate-100"
          aria-label={`Copy ${activeBillLabel}`}
          title="Copy bill"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
