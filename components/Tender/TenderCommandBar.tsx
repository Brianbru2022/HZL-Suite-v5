import React from 'react';
import { ArrowDownToLine, ArrowRightLeft, CalendarDays, ChevronDown, FileSpreadsheet, Layers3, MoreHorizontal, Plug, ShieldCheck, Trophy, UserPlus } from 'lucide-react';
import type { Contractor, TenderResponseState, TradePackage } from '../../types';
import type { ContextMenuEntry } from '../UI/ContextMenu';
import { MenuActionList } from '../UI/MenuActionList';
import { PopoverMenu } from '../UI/PopoverMenu';

type TenderDiscountType = 'PERCENT' | 'FIXED';

type TenderTradeStatusDraft = {
  budgetValue?: number;
  mainContractorDiscountType?: TenderDiscountType;
  mainContractorDiscountValue?: number;
  dueDate?: string;
  responseState?: TenderResponseState;
};

type TenderCommandBarProps = {
  trades: TradePackage[];
  selectedTrade: TradePackage | null;
  selectedTradeId: string;
  selectedTradeStatus?: TenderTradeStatusDraft;
  availableToAdd: Contractor[];
  contractors: Contractor[];
  comparisonMode: 'DETAILED' | 'OVERVIEW';
  valueMode: 'RATE' | 'VALUE';
  isDetailedMatrixMode: boolean;
  mainContractorDiscountType: TenderDiscountType;
  responseState: TenderResponseState;
  responseStateOptions: Array<{ value: TenderResponseState; label: string }>;
  tenderExportActionItems: ContextMenuEntry[];
  tenderApplyActionItems: ContextMenuEntry[];
  tenderGeneralActionItems: ContextMenuEntry[];
  displayTenderAwardExists: boolean;
  approvalFormReady: boolean;
  isCreatingApprovalForm: boolean;
  flashedActionId: string | null;
  preferredContractorId: string;
  showAdvancedTools: boolean;
  negotiationBaseId: string;
  negotiationMode: 'SPECIFIC' | 'CHEAPEST_ALL';
  negotiationCompareId: string;
  onSelectTrade: (tradeId: string) => void;
  onAddTenderContractor: (contractorId: string) => void;
  onUpdateTenderTradeStatus: (updates: TenderTradeStatusDraft) => void;
  onSetComparisonMode: (mode: 'DETAILED' | 'OVERVIEW') => void;
  onSetValueMode: (mode: 'RATE' | 'VALUE') => void;
  onCreateApprovalForm: () => void;
  onSetPreferredContractorId: (contractorId: string) => void;
  onSetNegotiationBaseId: (contractorId: string) => void;
  onSetNegotiationMode: (mode: 'SPECIFIC' | 'CHEAPEST_ALL') => void;
  onSetNegotiationCompareId: (contractorId: string) => void;
  onFillSelectedMix: () => void;
  onTakeCheaper: () => void;
  onPlugGaps: () => void;
  getTenderActionFeedbackClass: (actionId: string) => string;
};

function normaliseMoneyValue(value: number) {
  return Number(value.toFixed(2));
}

const tenderControlClass = 'min-h-9 rounded-app-sm border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-primary-400 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200';
const tenderGroupClass = 'min-w-0 rounded-app border border-slate-200/80 bg-slate-50/70 p-2.5 dark:border-slate-700/80 dark:bg-surface-800/45';
const tenderGroupTitleClass = 'mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500';
const tenderGroupControlsClass = 'flex flex-wrap items-center gap-2';

export function TenderCommandBar({
  trades,
  selectedTrade,
  selectedTradeId,
  selectedTradeStatus,
  availableToAdd,
  contractors,
  comparisonMode,
  valueMode,
  isDetailedMatrixMode,
  mainContractorDiscountType,
  responseState,
  responseStateOptions,
  tenderExportActionItems,
  tenderApplyActionItems,
  tenderGeneralActionItems,
  displayTenderAwardExists,
  approvalFormReady,
  isCreatingApprovalForm,
  flashedActionId,
  preferredContractorId,
  showAdvancedTools,
  negotiationBaseId,
  negotiationMode,
  negotiationCompareId,
  onSelectTrade,
  onAddTenderContractor,
  onUpdateTenderTradeStatus,
  onSetComparisonMode,
  onSetValueMode,
  onCreateApprovalForm,
  onSetPreferredContractorId,
  onSetNegotiationBaseId,
  onSetNegotiationMode,
  onSetNegotiationCompareId,
  onFillSelectedMix,
  onTakeCheaper,
  onPlugGaps,
  getTenderActionFeedbackClass,
}: TenderCommandBarProps) {
  return (
    <>
      <div className="grid gap-3 xl:grid-cols-[minmax(18rem,1.25fr)_minmax(20rem,1.45fr)_minmax(18rem,1.2fr)] 2xl:grid-cols-[minmax(18rem,1.2fr)_minmax(20rem,1.35fr)_minmax(18rem,1fr)_minmax(16rem,0.95fr)]">
        <div className={tenderGroupClass}>
          <div className={tenderGroupTitleClass}><UserPlus className="h-3.5 w-3.5" />Setup</div>
          <div className={tenderGroupControlsClass}>
            <select
              value={selectedTradeId}
              onChange={(event) => onSelectTrade(event.target.value)}
              aria-label="Select trade package for tender analysis"
              className={`${tenderControlClass} min-w-[12rem] flex-1`}
            >
              {trades.map((trade) => <option key={trade.id} value={trade.id}>{trade.name}</option>)}
            </select>
            {selectedTrade && (
              <select
                value=""
                onChange={(event) => {
                  const id = event.target.value;
                  if (!id) return;
                  onAddTenderContractor(id);
                  event.target.value = '';
                }}
                aria-label={`Add contractor to ${selectedTrade.name} tender`}
                className={`${tenderControlClass} min-w-[12rem] flex-1 appearance-none`}
              >
                <option value="">Add contractor...</option>
                {availableToAdd.map((contractor) => (
                  <option key={contractor.id} value={contractor.id}>{contractor.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className={tenderGroupClass}>
          <div className={tenderGroupTitleClass}><CalendarDays className="h-3.5 w-3.5" />Returns</div>
          <div className={tenderGroupControlsClass}>
            {selectedTrade && (
              <input
                type="date"
                value={selectedTradeStatus?.dueDate || ''}
                onChange={(event) => onUpdateTenderTradeStatus({ dueDate: event.target.value || undefined })}
                aria-label="Tender due date"
                className={`${tenderControlClass} min-w-[9.5rem]`}
              />
            )}
            {selectedTrade && (
              <select
                value={responseState}
                onChange={(event) => onUpdateTenderTradeStatus({ responseState: event.target.value as TenderResponseState })}
                aria-label="Tender response state"
                className={`${tenderControlClass} min-w-[11rem] flex-1`}
              >
                {responseStateOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            )}
            {selectedTrade && (
              <input
                type="number"
                step="0.01"
                min="0"
                value={selectedTradeStatus?.budgetValue ?? ''}
                onChange={(event) => onUpdateTenderTradeStatus({ budgetValue: event.target.value ? parseFloat(event.target.value) : undefined })}
                onFocus={(event) => event.currentTarget.select()}
                onWheel={(event) => event.currentTarget.blur()}
                onBlur={(event) => {
                  if (!event.target.value) return;
                  onUpdateTenderTradeStatus({ budgetValue: normaliseMoneyValue(parseFloat(event.target.value)) });
                }}
                aria-label="Tender budget value"
                placeholder="Budget"
                className={`${tenderControlClass} w-28`}
              />
            )}
            {selectedTrade && (
              <select
                value={mainContractorDiscountType}
                onChange={(event) => onUpdateTenderTradeStatus({ mainContractorDiscountType: event.target.value as TenderDiscountType })}
                aria-label="Main contractor discount type"
                className={`${tenderControlClass} w-32`}
              >
                <option value="PERCENT">Discount %</option>
                <option value="FIXED">Discount sum</option>
              </select>
            )}
            {selectedTrade && (
              <input
                type="number"
                step="0.01"
                min="0"
                value={selectedTradeStatus?.mainContractorDiscountValue ?? ''}
                onChange={(event) => onUpdateTenderTradeStatus({ mainContractorDiscountValue: event.target.value ? parseFloat(event.target.value) : undefined })}
                onFocus={(event) => event.currentTarget.select()}
                onWheel={(event) => event.currentTarget.blur()}
                onBlur={(event) => {
                  if (!event.target.value) return;
                  onUpdateTenderTradeStatus({ mainContractorDiscountValue: normaliseMoneyValue(parseFloat(event.target.value)) });
                }}
                aria-label={mainContractorDiscountType === 'PERCENT' ? 'Main contractor discount percentage' : 'Main contractor discount fixed sum'}
                placeholder={mainContractorDiscountType === 'PERCENT' ? 'Disc %' : 'Disc sum'}
                className={`${tenderControlClass} w-28`}
              />
            )}
          </div>
        </div>

        <div className={tenderGroupClass}>
          <div className={tenderGroupTitleClass}><Layers3 className="h-3.5 w-3.5" />Comparison</div>
          <div className={tenderGroupControlsClass}>
            <button type="button" onClick={() => onSetComparisonMode('OVERVIEW')} aria-pressed={comparisonMode === 'OVERVIEW'} className={comparisonMode === 'OVERVIEW' ? 'workspace-tab-btn-active px-3 py-2 text-xs' : 'workspace-tab-btn px-3 py-2 text-xs'}>Overview</button>
            <button type="button" onClick={() => onSetComparisonMode('DETAILED')} aria-pressed={comparisonMode === 'DETAILED'} className={comparisonMode === 'DETAILED' ? 'workspace-tab-btn-active px-3 py-2 text-xs' : 'workspace-tab-btn px-3 py-2 text-xs'}>Matrix</button>
            {isDetailedMatrixMode && (
              <button type="button" onClick={() => onSetValueMode(valueMode === 'RATE' ? 'VALUE' : 'RATE')} aria-pressed={valueMode === 'VALUE'} className="workspace-secondary-btn rounded-app-sm px-3 py-2 text-xs">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                {valueMode === 'RATE' ? 'Values' : 'Rates'}
              </button>
            )}
            <button type="button" onClick={onPlugGaps} disabled={!isDetailedMatrixMode} aria-label="Fill missing contractor rates using QS estimate values" className={`workspace-secondary-btn rounded-app-sm px-3 py-2 text-xs transition-all disabled:opacity-45 ${getTenderActionFeedbackClass('plug-gaps')}`}>
              <Plug className="h-3.5 w-3.5" />
              {flashedActionId === 'plug-gaps' ? 'Plugged' : 'Plug gaps'}
            </button>
          </div>
        </div>

        <div className={tenderGroupClass}>
          <div className={tenderGroupTitleClass}><Trophy className="h-3.5 w-3.5" />Award</div>
          <div className={tenderGroupControlsClass}>
            {selectedTrade && contractors.length > 0 && (
              <select
                value={preferredContractorId}
                onChange={(event) => onSetPreferredContractorId(event.target.value)}
                aria-label="Choose contractor return for award review"
                className={`${tenderControlClass} min-w-[11rem] flex-1`}
              >
                {contractors.map((contractor) => (
                  <option key={contractor.id} value={contractor.id}>{contractor.name}</option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={onCreateApprovalForm}
              disabled={isCreatingApprovalForm || !displayTenderAwardExists}
              title={
                !displayTenderAwardExists
                  ? 'Select a winning contractor before creating the approval form.'
                  : !approvalFormReady
                    ? 'Enter Prepared by. Clicking will show what is missing.'
                    : 'Create the tender approval PDF for signing.'
              }
              className={`workspace-secondary-btn rounded-app-sm px-3 py-2 text-xs transition-all disabled:cursor-not-allowed disabled:opacity-50 ${getTenderActionFeedbackClass('create-approval-form')}`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {isCreatingApprovalForm ? 'Creating...' : flashedActionId === 'create-approval-form' ? 'Created' : 'Approval PDF'}
            </button>
          </div>
        </div>

        <div className={tenderGroupClass}>
          <div className={tenderGroupTitleClass}><ArrowDownToLine className="h-3.5 w-3.5" />Apply-back</div>
          <div className={tenderGroupControlsClass}>
            <PopoverMenu
              ariaLabel="Tender apply-rate actions"
              width={320}
              estimatedHeight={380}
              trigger={({ ref, isOpen, toggle }) => (
                <button ref={ref} type="button" onClick={toggle} aria-haspopup="menu" aria-expanded={isOpen} className="workspace-secondary-btn rounded-app-sm px-3 py-2 text-xs">
                  <ArrowDownToLine className="h-4 w-4" />
                  Apply rates
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              )}
            >
              {(close) => <MenuActionList items={tenderApplyActionItems} close={close} itemTextSize="text-xs" />}
            </PopoverMenu>
            <PopoverMenu
              ariaLabel="Tender actions"
              width={330}
              estimatedHeight={440}
              trigger={({ ref, isOpen, toggle }) => (
                <button ref={ref} type="button" onClick={toggle} aria-haspopup="menu" aria-expanded={isOpen} className="workspace-primary-btn rounded-app-sm px-3 py-2 text-xs">
                  <MoreHorizontal className="h-4 w-4" />
                  Actions
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              )}
            >
              {(close) => <MenuActionList items={tenderGeneralActionItems} close={close} itemTextSize="text-xs" />}
            </PopoverMenu>
          </div>
        </div>

        <div className={tenderGroupClass}>
          <div className={tenderGroupTitleClass}><FileSpreadsheet className="h-3.5 w-3.5" />Exports</div>
          <div className={tenderGroupControlsClass}>
            <PopoverMenu
              ariaLabel="Tender export actions"
              width={300}
              estimatedHeight={240}
              trigger={({ ref, isOpen, toggle }) => (
                <button ref={ref} type="button" onClick={toggle} aria-haspopup="menu" aria-expanded={isOpen} className="workspace-secondary-btn rounded-app-sm px-3 py-2 text-xs">
                  <FileSpreadsheet className="h-4 w-4" />
                  Export
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              )}
            >
              {(close) => <MenuActionList items={tenderExportActionItems} close={close} itemTextSize="text-xs" />}
            </PopoverMenu>
          </div>
        </div>
      </div>
      {isDetailedMatrixMode && showAdvancedTools && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-3 dark:border-slate-700/80">
          <span className="px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Negotiation</span>
          <select value={negotiationBaseId} onChange={(event) => onSetNegotiationBaseId(event.target.value)} aria-label="Choose base contractor for negotiated mix" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-primary-400 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200">
            <option value="">Base contractor...</option>
            {contractors.map((contractor) => (
              <option key={contractor.id} value={contractor.id}>{contractor.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={onFillSelectedMix}
            disabled={!negotiationBaseId}
            aria-label="Fill negotiated mix from selected base contractor"
            className={`rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300 ${getTenderActionFeedbackClass('fill-selected-mix')}`}
          >
            {flashedActionId === 'fill-selected-mix' ? 'Filled' : 'Fill selected mix'}
          </button>
          <select value={negotiationMode} onChange={(event) => onSetNegotiationMode(event.target.value as 'SPECIFIC' | 'CHEAPEST_ALL')} aria-label="Choose negotiated comparison mode" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-primary-400 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200">
            <option value="SPECIFIC">Compare with contractor</option>
            <option value="CHEAPEST_ALL">Compare with cheapest of all</option>
          </select>
          {negotiationMode === 'SPECIFIC' && (
            <select value={negotiationCompareId} onChange={(event) => onSetNegotiationCompareId(event.target.value)} aria-label="Choose contractor to compare against the base contractor" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-primary-400 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200">
              <option value="">Contractor to compare...</option>
              {contractors.filter((contractor) => contractor.id !== negotiationBaseId).map((contractor) => (
                <option key={contractor.id} value={contractor.id}>{contractor.name}</option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={onTakeCheaper}
            disabled={!negotiationBaseId || (negotiationMode === 'SPECIFIC' && !negotiationCompareId)}
            aria-label="Replace negotiated mix with the cheaper option"
            className={`rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-700 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300 ${getTenderActionFeedbackClass('take-cheaper')}`}
          >
            {flashedActionId === 'take-cheaper' ? 'Checked' : 'Take cheaper'}
          </button>
          <button type="button" onClick={onPlugGaps} aria-label="Fill missing contractor rates using QS estimate values" className={`workspace-secondary-btn rounded-full px-4 py-2 text-xs transition-all ${getTenderActionFeedbackClass('plug-gaps')}`}>
            <Plug className="h-3 w-3" />
            {flashedActionId === 'plug-gaps' ? 'Plugged' : 'Plug gaps'}
          </button>
        </div>
      )}
    </>
  );
}
