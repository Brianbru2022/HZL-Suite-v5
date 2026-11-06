import { useEffect, useState } from 'react';
import { Check, Tag } from 'lucide-react';
import { PopoverMenu } from '../../UI/PopoverMenu';
import type { TradeAssignTarget } from './types';

export function TradeAssignPopover({
  open,
  onOpenChange,
  activeBill,
  bills,
  availableTrades,
  onApplyTradeScope,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeBill?: any;
  bills: any[];
  availableTrades: Array<{ id: string; name: string }>;
  onApplyTradeScope?: (target: TradeAssignTarget, tradeId: string) => void;
}) {
  const [scope, setScope] = useState<'BILL' | 'SECTION' | 'PAGE'>('BILL');
  const [tradeId, setTradeId] = useState<string>('');
  const [billId, setBillId] = useState<string>('');
  const [sectionBillId, setSectionBillId] = useState<string>('');
  const [sectionId, setSectionId] = useState<string>('');
  const [pageBillId, setPageBillId] = useState<string>('');
  const [pageSectionId, setPageSectionId] = useState<string>('');
  const [pageId, setPageId] = useState<string>('');

  useEffect(() => {
    if (!activeBill) return;
    const firstBillId = activeBill.id;
    setBillId((current) => current || firstBillId);
    setSectionBillId((current) => current || firstBillId);
    setPageBillId((current) => current || firstBillId);
  }, [activeBill]);

  const selectedBillForBillScope = bills.find((bill: any) => bill.id === billId) || bills[0];
  const selectedBillForSectionScope = bills.find((bill: any) => bill.id === sectionBillId) || bills[0];
  const selectedBillForPageScope = bills.find((bill: any) => bill.id === pageBillId) || bills[0];
  const sectionScopeSections = selectedBillForSectionScope?.sections || [];
  const pageScopeSections = selectedBillForPageScope?.sections || [];
  const selectedSectionForSectionScope = sectionScopeSections.find((section: any) => section.id === sectionId) || sectionScopeSections[0];
  const selectedSectionForPageScope = pageScopeSections.find((section: any) => section.id === pageSectionId) || pageScopeSections[0];
  const pageScopePages = selectedSectionForPageScope?.pages || [];
  const selectedPageForPageScope = pageScopePages.find((page: any) => page.id === pageId) || pageScopePages[0];

  useEffect(() => {
    if (!selectedBillForSectionScope) return;
    setSectionId((current) =>
      sectionScopeSections.some((section: any) => section.id === current) ? current : (sectionScopeSections[0]?.id || '')
    );
  }, [sectionScopeSections, selectedBillForSectionScope]);

  useEffect(() => {
    if (!selectedBillForPageScope) return;
    setPageSectionId((current) =>
      pageScopeSections.some((section: any) => section.id === current) ? current : (pageScopeSections[0]?.id || '')
    );
  }, [pageScopeSections, selectedBillForPageScope]);

  useEffect(() => {
    setPageId((current) =>
      pageScopePages.some((page: any) => page.id === current) ? current : (pageScopePages[0]?.id || '')
    );
  }, [pageScopePages]);

  useEffect(() => {
    if (!open) return;
    if (!tradeId && availableTrades.length > 0) {
      setTradeId(availableTrades[0].id);
    }
  }, [availableTrades, open, tradeId]);

  const handleApply = () => {
    if (!tradeId || !onApplyTradeScope) return;
    if (scope === 'BILL' && selectedBillForBillScope) {
      onApplyTradeScope({ id: selectedBillForBillScope.id, label: selectedBillForBillScope.name, kind: 'BILL' }, tradeId);
      onOpenChange(false);
      return;
    }
    if (scope === 'SECTION' && selectedBillForSectionScope && selectedSectionForSectionScope) {
      onApplyTradeScope({
        id: selectedSectionForSectionScope.id,
        label: selectedSectionForSectionScope.name,
        kind: 'SECTION',
        sectionId: selectedSectionForSectionScope.id,
      }, tradeId);
      onOpenChange(false);
      return;
    }
    if (scope === 'PAGE' && selectedBillForPageScope && selectedSectionForPageScope && selectedPageForPageScope) {
      onApplyTradeScope({
        id: selectedPageForPageScope.id,
        label: selectedPageForPageScope.name || 'Page',
        kind: 'PAGE',
        sectionId: selectedSectionForPageScope.id,
        pageId: selectedPageForPageScope.id,
      }, tradeId);
      onOpenChange(false);
      return;
    }
    onOpenChange(false);
  };

  if (!activeBill || !onApplyTradeScope || bills.length === 0 || availableTrades.length === 0) return null;

  return (
    <PopoverMenu
      ariaLabel="Bulk trade assignment"
      width={352}
      estimatedHeight={560}
      open={open}
      onOpenChange={onOpenChange}
      menuClassName="workspace-popover-menu p-4"
      trigger={({ ref, isOpen, toggle }) => (
        <button
          ref={ref}
          type="button"
          onClick={toggle}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/85 text-slate-600 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-[rgb(27_36_44_/_0.92)] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          title="Assign a trade package to a whole bill, section, or page"
          data-help-id="help-bill-trade-assign"
        >
          <Tag className="h-4 w-4" />
        </button>
      )}
    >
      {() => (
        <>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Bulk trade assignment
          </div>
          <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Apply one trade package to a whole bill area
          </div>
          <div className="mt-4 inline-flex rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-surface-900">
            {(['BILL', 'SECTION', 'PAGE'] as const).map((nextScope) => (
              <button
                key={nextScope}
                type="button"
                onClick={() => setScope(nextScope)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                  scope === nextScope
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {nextScope === 'BILL' ? 'Bill' : nextScope === 'SECTION' ? 'Section' : 'Page'}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3">
            {scope === 'BILL' && (
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Bill
                <select
                  value={selectedBillForBillScope?.id || ''}
                  onChange={(event) => setBillId(event.target.value)}
                  className="mt-1 w-full rounded-app border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-100"
                >
                  {bills.map((bill: any) => (
                    <option key={bill.id} value={bill.id}>
                      {bill.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {scope === 'SECTION' && (
              <>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Bill
                  <select
                    value={selectedBillForSectionScope?.id || ''}
                    onChange={(event) => setSectionBillId(event.target.value)}
                    className="mt-1 w-full rounded-app border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-100"
                  >
                    {bills.map((bill: any) => (
                      <option key={bill.id} value={bill.id}>
                        {bill.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Section
                  <select
                    value={selectedSectionForSectionScope?.id || ''}
                    onChange={(event) => setSectionId(event.target.value)}
                    className="mt-1 w-full rounded-app border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-100"
                  >
                    {sectionScopeSections.map((section: any, index: number) => (
                      <option key={section.id} value={section.id}>
                        {`Section ${index + 1}: ${section.name}`}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {scope === 'PAGE' && (
              <>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Bill
                  <select
                    value={selectedBillForPageScope?.id || ''}
                    onChange={(event) => setPageBillId(event.target.value)}
                    className="mt-1 w-full rounded-app border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-100"
                  >
                    {bills.map((bill: any) => (
                      <option key={bill.id} value={bill.id}>
                        {bill.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Section
                  <select
                    value={selectedSectionForPageScope?.id || ''}
                    onChange={(event) => setPageSectionId(event.target.value)}
                    className="mt-1 w-full rounded-app border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-100"
                  >
                    {pageScopeSections.map((section: any, index: number) => (
                      <option key={section.id} value={section.id}>
                        {`Section ${index + 1}: ${section.name}`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Page
                  <select
                    value={selectedPageForPageScope?.id || ''}
                    onChange={(event) => setPageId(event.target.value)}
                    className="mt-1 w-full rounded-app border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-100"
                  >
                    {pageScopePages.map((page: any, index: number) => (
                      <option key={page.id} value={page.id}>
                        {`Page ${index + 1}: ${page.name || `Page ${index + 1}`}`}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Trade package
              <select
                value={tradeId}
                onChange={(event) => setTradeId(event.target.value)}
                className="mt-1 w-full rounded-app border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-100"
              >
                {availableTrades.map((trade) => (
                  <option key={trade.id} value={trade.id}>
                    {trade.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
              {scope === 'BILL'
                ? 'Applies to every priced item in the selected bill.'
                : scope === 'SECTION'
                  ? 'Applies to every priced item in the selected section.'
                  : 'Applies to every priced item on the selected page.'}
            </div>
            <button
              type="button"
              onClick={handleApply}
              disabled={
                !tradeId ||
                (scope === 'BILL' && !selectedBillForBillScope) ||
                (scope === 'SECTION' && (!selectedBillForSectionScope || !selectedSectionForSectionScope)) ||
                (scope === 'PAGE' && (!selectedBillForPageScope || !selectedSectionForPageScope || !selectedPageForPageScope))
              }
              className="workspace-primary-btn px-3 py-2 text-xs disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              Apply
            </button>
          </div>
        </>
      )}
    </PopoverMenu>
  );
}
