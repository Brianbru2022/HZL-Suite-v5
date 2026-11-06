import React, { useEffect, useState } from 'react';
import { Home, Save, X } from 'lucide-react';
import type { BoQBill } from '../../types';
import { useModalFocus } from '../../hooks/useModalFocus';

interface BillSettingsModalProps {
  bill: BoQBill;
  onSave: (updates: Partial<BoQBill>) => void;
  onClose: () => void;
}

export const BillSettingsModal: React.FC<BillSettingsModalProps> = ({ bill, onSave, onClose }) => {
  const [billType, setBillType] = useState<'STANDARD' | 'HOUSE_TYPE'>(bill.billType || 'STANDARD');
  const [houseTypeName, setHouseTypeName] = useState<string>(bill.houseTypeName || bill.name);
  const [houseTypeQuantity, setHouseTypeQuantity] = useState<number>(bill.houseTypeQuantity || 1);
  const { contentRef, contentProps } = useModalFocus(true, onClose);

  useEffect(() => {
    if (billType !== 'HOUSE_TYPE') return;
    setHouseTypeName((previous) => previous.trim() ? previous : bill.houseTypeName || bill.name);
  }, [bill.houseTypeName, bill.name, billType]);

  const handleSave = () => {
    onSave({
      billType,
      houseTypeName: billType === 'HOUSE_TYPE' ? (houseTypeName.trim() || bill.name) : undefined,
      houseTypeQuantity: billType === 'HOUSE_TYPE' ? Math.max(1, Number(houseTypeQuantity) || 1) : 1,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md dark:bg-black/60" onClick={onClose}>
      <div
        ref={contentRef}
        {...contentProps}
        className="workspace-shell flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200/80 bg-white/92 px-6 py-5 dark:border-slate-700/80 dark:bg-surface-900/95">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="workspace-chip mb-3">
                <Home className="h-3.5 w-3.5" />
                Bill settings
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{bill.name}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
                Mark this bill as a repeated house type if the summary should multiply its value by the number of units.
              </p>
            </div>
            <button type="button" onClick={onClose} className="workspace-secondary-btn px-3 py-2 text-xs" aria-label="Close bill settings">
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto bg-white/88 px-6 py-6 dark:bg-surface-900/92">
          <section className="workspace-sidebar p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Bill type</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {([
                {
                  value: 'STANDARD' as const,
                  label: 'Standard bill',
                  hint: 'Treat this bill as a one-off package in summaries and exports.',
                },
                {
                  value: 'HOUSE_TYPE' as const,
                  label: 'House type',
                  hint: 'Multiply this bill by the number of repeated units in project summaries.',
                },
              ]).map(({ value, label, hint }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setBillType(value)}
                  aria-pressed={billType === value}
                  className={`rounded-app border p-5 text-left transition-all ${
                    billType === value
                      ? 'border-primary-300 bg-primary-50 shadow-sm dark:border-primary-700 dark:bg-primary-900/30'
                      : 'border-slate-200 bg-surface hover:border-slate-300 dark:border-slate-700 dark:bg-surface-800 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${billType === value ? 'border-primary-600 dark:border-primary-400' : 'border-slate-300 dark:border-slate-600'}`}>
                      {billType === value && <div className="h-2.5 w-2.5 rounded-full bg-primary-600 dark:bg-primary-400" />}
                    </div>
                    <span className={`text-sm font-semibold ${billType === value ? 'text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-200'}`}>{label}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">{hint}</p>
                </button>
              ))}
            </div>
          </section>

          {billType === 'HOUSE_TYPE' && (
            <section className="workspace-sidebar p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">House type setup</div>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Name and number of repeated units</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
                This house type name starts from the bill name, but you can change it for summaries and tender reporting. The summary page will multiply this bill, and optionally its sections, by the number of houses below.
              </p>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">House type name</label>
                  <input
                    type="text"
                    value={houseTypeName}
                    onChange={(event) => setHouseTypeName(event.target.value)}
                    className="workspace-input"
                    aria-label="House type name"
                    placeholder={bill.name}
                  />
                </div>
                <div className="max-w-xs">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Units of this house type</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={houseTypeQuantity}
                  onChange={(event) => setHouseTypeQuantity(Math.max(1, Number(event.target.value) || 1))}
                  className="workspace-input"
                  aria-label="Number of houses for this house type"
                />
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="bg-white/92 px-6 py-4 dark:bg-surface-900/95">
          <div className="workspace-toolbar flex justify-end gap-3">
            <button type="button" onClick={onClose} className="workspace-secondary-btn">Cancel</button>
            <button type="button" onClick={handleSave} className="workspace-primary-btn">
              <Save className="h-4 w-4" />
              Save bill settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
