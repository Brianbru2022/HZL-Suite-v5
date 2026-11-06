import React from 'react';
import { X, ExternalLink, Tag, ChevronLeft, ChevronRight, ChevronDown, Expand, Bold, Underline, Palette, List, PanelRightClose, PanelRightOpen, Save, MapPin, Calculator } from 'lucide-react';
import { ItemType, UnitType } from '../../types';
import type { BoQItem, TradePackage, RateBuildUp } from '../../types';
import { formatCurrency } from '../../utils/formatting';
import { normalizeUnit } from '../../utils/formatting';
import { safeMul } from '../../utils/calculations';
import { looksLikeRichText, stripRichText } from '../../utils/richText';
import { useSpellcheckPreference } from '../../hooks/useSpellcheckPreference';
import { useHelpContext } from '../../hooks/useHelpContext';
import { useAppContextOptional } from '../../contexts/AppContext';
import { HelpButton } from '../Help/HelpButton';
import { itemTypeOptions } from '../UI/ItemTypeDropdown';

interface InspectorLocationContext {
  modeLabel: string;
  scopeLabel?: string;
  placementLabel?: string;
  rowLabel?: string;
}

interface InspectorPanelProps {
  config: { item?: BoQItem | null; type?: string };
  contextTitle?: string;
  contextDetail?: string;
  editorLocationContext?: InspectorLocationContext | null;
  formData: {
    description: string;
    unit: string;
    quantity: number;
    quantityDecimals: number;
    rate: number;
    reference: string;
    tradePackageId: string;
    type: string;
    rateBuildUp?: RateBuildUp;
  };
  setFormData: (data: any) => void;
  trades: TradePackage[];
  onClose: () => void;
  onOpenFullEditor: () => void;
  onPreviousItem?: () => void;
  onNextItem?: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  itemPositionLabel?: string;
  isFloating?: boolean;
  onToggleFloating?: () => void;
  onFloatDragStart?: (event: React.MouseEvent<HTMLElement>) => void;
  isDraggingFloat?: boolean;
}

type InspectorSectionId = 'line' | 'trade' | 'values';

interface InspectorSectionCardProps {
  id: InspectorSectionId;
  title: string;
  summary?: string;
  isCollapsed: boolean;
  isFloating: boolean;
  onToggle: (sectionId: InspectorSectionId) => void;
  children: React.ReactNode;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  config,
  contextTitle,
  contextDetail,
  editorLocationContext,
  formData,
  setFormData,
  trades,
  onClose,
  onOpenFullEditor,
  onPreviousItem,
  onNextItem,
  canGoPrevious = false,
  canGoNext = false,
  itemPositionLabel,
  isFloating = false,
  onToggleFloating,
  onFloatDragStart,
  isDraggingFloat = false,
}) => {
  const [isDescriptionEditorOpen, setIsDescriptionEditorOpen] = React.useState(false);
  const [isInspectorSaving, setIsInspectorSaving] = React.useState(false);
  const [collapsedSections, setCollapsedSections] = React.useState<Record<InspectorSectionId, boolean>>({
    line: false,
    trade: false,
    values: false,
  });
  const [rateInputDraft, setRateInputDraft] = React.useState<string | null>(null);
  const app = useAppContextOptional();
  useHelpContext('INSPECTOR');
  const { preference: spellcheckPreference } = useSpellcheckPreference();
  const pricedTypes: ItemType[] = ['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'];
  const isPriced = pricedTypes.includes((formData.type || config.item?.type || 'PRICED') as ItemType);
  const total = safeMul(formData.quantity, formData.rate);
  const activeTrade = trades.find((trade) => trade.id === formData.tradePackageId);
  const tradeSummaryLabel = activeTrade ? activeTrade.name : 'Unassigned';
  const saveState = isInspectorSaving || app?.saveStatus === 'saving'
    ? 'saving'
    : app?.saveStatus === 'error'
      ? 'error'
      : 'saved';
  const saveStateLabel = saveState === 'saving'
    ? 'Saving'
    : saveState === 'error'
      ? 'Save attention'
      : 'Live saved';
  const saveStateDetail = saveState === 'saving'
    ? 'Writing changes'
    : saveState === 'error'
      ? 'Open Status for details'
      : app?.lastSavedAt
        ? `Saved ${new Date(app.lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : 'Autosave on';
  const saveStateTone = saveState === 'saving'
    ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/25 dark:text-blue-200'
    : saveState === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-200'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-200';
  const itemType = (formData.type || config.item?.type || 'PRICED') as string;
  const itemTypeLabel = itemType === 'GENERAL_HEADING'
    ? 'General heading'
    : itemType === 'MAJOR_HEADING'
      ? 'Major heading'
      : itemType === 'SUB_SECTION'
        ? 'Sub heading'
        : itemType === 'MINOR_HEADING'
          ? 'Minor heading'
          : itemType === 'COMMENT'
            ? 'Comment'
            : itemType === 'SUB_COMMENT'
              ? 'Sub-comment'
              : itemType === 'EXTRA_OVER_ITEM'
                ? 'Extra over item'
              : itemType === 'PROVISIONAL_SUM'
                ? 'Provisional sum'
                : itemType === 'PC_SUM'
                  ? 'Prime cost sum'
                  : 'Priced item';
  const tradeSummaryTone = activeTrade
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300'
    : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300';
  const editableDescription = looksLikeRichText(formData.description)
    ? stripRichText(formData.description)
    : formData.description;
  const handleNumericFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.currentTarget.select();
  };
  const rateInputValue = rateInputDraft ?? (Number(formData.rate) === 0 ? '' : String(formData.rate));
  const handleRateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    const nextRate = nextValue.trim() === '' ? 0 : Number(nextValue);

    setRateInputDraft(nextValue);
    setFormData({
      ...formData,
      rate: Number.isFinite(nextRate) ? nextRate : 0,
    });
  };
  const quantityDecimals = Math.max(0, Math.min(6, Number(formData.quantityDecimals) || 0));
  const quantityDisplay = formData.quantity.toFixed(quantityDecimals);
  const handleLineTypeChange = (nextType: ItemType) => {
    const nextIsPriced = pricedTypes.includes(nextType);
    setFormData({
      ...formData,
      type: nextType,
      unit: nextIsPriced ? (formData.unit || 'nr') : '',
      quantity: nextIsPriced ? formData.quantity : 0,
      rate: nextIsPriced ? formData.rate : 0,
      tradePackageId: nextIsPriced ? formData.tradePackageId : '',
    });
  };
  const resolvedLocationContext = editorLocationContext ?? (contextTitle || contextDetail
    ? {
        modeLabel: config.item ? 'Editing selected row' : 'Adding new row',
        scopeLabel: contextTitle,
        placementLabel: contextDetail,
      }
    : null);
  const toggleSection = React.useCallback((sectionId: InspectorSectionId) => {
    setCollapsedSections((current) => ({ ...current, [sectionId]: !current[sectionId] }));
  }, []);

  return (
    <>
    <aside
      data-help-id="help-inspector-panel"
      data-smoke="bill-inspector"
      className={`z-20 h-full max-h-full overflow-hidden ${
        isFloating
          ? 'w-full rounded-app-xl border border-slate-200/80 bg-surface shadow-[0_24px_70px_-24px_rgba(15,23,42,0.48)] dark:border-slate-700/80 dark:bg-surface-900'
          : 'w-[320px] shrink-0 border-l border-slate-200/80 bg-surface/92 shadow-[-18px_0_40px_-30px_rgba(15,23,42,0.35)] dark:border-slate-700/80 dark:bg-surface-900/94'
      }`}
    >
      <div className="flex h-full min-h-0 flex-col">
      <div
        onMouseDown={isFloating ? onFloatDragStart : undefined}
        className={`border-b border-slate-200 dark:border-slate-700 shrink-0 bg-surface-muted/40 dark:bg-surface-800/65 ${
          isFloating ? `cursor-move select-none px-3 py-2 ${isDraggingFloat ? 'bg-slate-100 dark:bg-surface-800' : ''}` : 'px-4 py-3'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {config.item ? (config.item.reference || 'Selected item') : 'New item'}
            </h2>
            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px]">
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-600 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300">
                {itemTypeLabel}
              </span>
              <span className={`rounded-full border px-2 py-0.5 font-medium ${saveStateTone}`}>
                {saveStateLabel}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <HelpButton compact onClick={() => app?.openHelp('INSPECTOR')} />
            {onToggleFloating && (
              <button
                type="button"
                onClick={onToggleFloating}
                title={isFloating ? 'Dock inspector' : 'Float inspector'}
                className="workspace-icon-btn"
                aria-label={isFloating ? 'Dock inspector' : 'Float inspector'}
              >
                {isFloating ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              </button>
            )}
            <button
              type="button"
              onClick={onOpenFullEditor}
              title="Open the detailed editor for dimensions, AI tools, and market research"
              className="workspace-icon-btn bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500"
              aria-label="Open full editor"
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
            </button>
            {app?.saveNow && (
              <button
                type="button"
                onClick={() => {
                  setIsInspectorSaving(true);
                  void app.saveNow().finally(() => setIsInspectorSaving(false));
                }}
                disabled={isInspectorSaving}
                title="Save the current workspace state now"
                className="workspace-icon-btn disabled:cursor-wait disabled:opacity-60"
                aria-label={isInspectorSaving ? 'Saving' : 'Save now'}
              >
                <Save className={`h-4 w-4 ${isInspectorSaving ? 'animate-pulse' : ''}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-app-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              aria-label="Close inspector"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {resolvedLocationContext && (
          <InspectorLocationStrip context={resolvedLocationContext} isFloating={isFloating} />
        )}
        {!isFloating && (canGoPrevious || canGoNext) && (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-app border border-slate-200/80 bg-white/80 px-2.5 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-surface-900/80 dark:text-slate-300">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Row navigation</div>
              <div className="mt-0.5 truncate font-medium">{itemPositionLabel || 'Selected row'}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={onPreviousItem} disabled={!canGoPrevious} className="workspace-icon-btn disabled:opacity-50" title="Previous item" aria-label="Previous item">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={onNextItem} disabled={!canGoNext} className="workspace-icon-btn disabled:opacity-50" title="Next item" aria-label="Next item">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={`${isFloating ? 'p-2.5 space-y-2.5' : 'p-3 space-y-3'} min-h-0 flex-1 overflow-y-auto bg-surface-50/70 dark:bg-surface-950/60`}>
        {isFloating && (canGoPrevious || canGoNext) && (
          <div className="flex items-center justify-between gap-2 rounded-app border border-slate-200/80 bg-white/80 px-2.5 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-surface-900/80 dark:text-slate-300">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Row navigation</div>
              <div className="mt-0.5 truncate font-medium">{itemPositionLabel || 'Selected row'}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={onPreviousItem} disabled={!canGoPrevious} className="workspace-icon-btn disabled:opacity-50" title="Previous item">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={onNextItem} disabled={!canGoNext} className="workspace-icon-btn disabled:opacity-50" title="Next item">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
        <InspectorSectionCard
          id="line"
          title="Line"
          summary={itemTypeLabel}
          isCollapsed={collapsedSections.line}
          isFloating={isFloating}
          onToggle={toggleSection}
        >
          <div className={`${isFloating ? 'mb-2' : 'mb-3'} grid gap-2 ${isFloating ? '' : 'sm:grid-cols-[0.9fr_1.1fr]'}`}>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 block mb-1">
                Line type
              </label>
              <select
                aria-label="Line type"
                value={itemType}
                onChange={(e) => handleLineTypeChange(e.target.value as ItemType)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-app bg-surface dark:bg-surface-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                {itemTypeOptions.map((option) => (
                  <option key={option.type} value={option.type}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 block mb-1">
                Reference
              </label>
              <input
                aria-label="Reference"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-app bg-surface dark:bg-surface-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                placeholder="Reference"
              />
            </div>
          </div>
          <div className={`${isFloating ? 'mb-2' : 'mb-2.5'} flex items-center justify-between gap-3`}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Description</div>
            <button
              type="button"
              onClick={() => setIsDescriptionEditorOpen(true)}
              title="Open a larger description editor"
              className="workspace-secondary-btn px-2.5 py-1.5 text-xs"
            >
              <Expand className="w-3.5 h-3.5" />
              <span className={isFloating ? 'hidden 2xl:inline' : 'inline'}>Expand</span>
            </button>
          </div>
          <textarea
            aria-label="Item description"
            value={editableDescription}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            spellCheck={spellcheckPreference.enabled}
            lang={spellcheckPreference.language}
            className={`${isFloating ? 'min-h-[72px]' : 'min-h-[84px]'} w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-app resize-y bg-surface dark:bg-surface-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500`}
            placeholder="Describe the work item..."
          />
        </InspectorSectionCard>

        {isPriced && (
          <InspectorSectionCard
            id="trade"
            title="Trade"
            summary={tradeSummaryLabel}
            isCollapsed={collapsedSections.trade}
            isFloating={isFloating}
            onToggle={toggleSection}
          >
          <div className="flex items-center justify-between gap-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 block">
                <span className="inline-flex items-center gap-1.5">
                  <Tag className="w-3 h-3" />
                  Trade assignment
                </span>
              </label>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${tradeSummaryTone}`}>
              {activeTrade ? 'Assigned' : 'Unassigned'}
            </span>
          </div>
          <select
            aria-label="Trade package"
            value={formData.tradePackageId}
            onChange={(e) => setFormData({ ...formData, tradePackageId: e.target.value })}
            className="mt-2 w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-app bg-surface dark:bg-surface-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          >
            <option value="">- None -</option>
            {trades.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          </InspectorSectionCard>
        )}

        {isPriced && (
          <InspectorSectionCard
            id="values"
            title="Quantity and rate"
            summary={formatCurrency(total)}
            isCollapsed={collapsedSections.values}
            isFloating={isFloating}
            onToggle={toggleSection}
          >
          <div className={isFloating ? 'space-y-2.5' : 'space-y-3'}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Measurement and pricing</div>
              <div className="rounded-app border border-slate-200/80 dark:border-slate-700 bg-surface-muted/40 dark:bg-surface-800/60 px-2.5 py-1.5">
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Total</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(total)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-app border border-slate-200/80 dark:border-slate-700 bg-surface-muted/40 dark:bg-surface-800/60 px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Unit</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">{normalizeUnit(formData.unit) || 'None'}</div>
              </div>
              <div className="rounded-app border border-slate-200/80 dark:border-slate-700 bg-surface-muted/40 dark:bg-surface-800/60 px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Quantity</div>
                <div className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{quantityDisplay}</div>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 block mb-1">Unit</label>
                <select
                  aria-label="Unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-app bg-surface dark:bg-surface-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  {Object.values(UnitType).map((u) => (
                    <option key={u} value={u}>{normalizeUnit(u)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 block mb-1">Qty decimals</label>
                <select
                  aria-label="Quantity decimal places"
                  value={quantityDecimals}
                  onChange={(e) => setFormData({ ...formData, quantityDecimals: Math.max(0, Math.min(6, Number(e.target.value) || 0)) })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-app bg-surface dark:bg-surface-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                >
                  {[0, 1, 2, 3, 4].map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-[0.92fr_1.16fr]">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 block mb-1">Quantity</label>
                <input
                  type="number"
                  step="0.001"
                  aria-label="Quantity"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                  onFocus={handleNumericFocus}
                  onWheel={(event) => event.currentTarget.blur()}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-app font-mono bg-surface dark:bg-surface-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 block mb-1">Rate (GBP)</label>
                {formData.rateBuildUp?.mode === 'DERIVED' ? <button type="button" onClick={onOpenFullEditor} className="w-full rounded-app border border-primary-200 bg-primary-50 px-3 py-2.5 text-right text-sm font-semibold text-primary-800 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-200" title="Open rate build-up editor">Derived: {formatCurrency(formData.rate)}</button> : <input
                  type="number"
                  step="0.01"
                  aria-label="Rate in GBP"
                  value={rateInputValue}
                  placeholder="0"
                  onChange={handleRateChange}
                  onFocus={(event) => {
                    setRateInputDraft(event.currentTarget.value);
                    handleNumericFocus(event);
                  }}
                  onBlur={() => setRateInputDraft(null)}
                  onWheel={(event) => event.currentTarget.blur()}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-app font-mono bg-surface dark:bg-surface-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />}
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenFullEditor}
              className="workspace-secondary-btn mt-2.5 w-full justify-center px-3 py-2 text-xs"
              title="Open the LPMS-style labour, plant, materials and subcontractor rate build-up"
            >
              <Calculator className="h-3.5 w-3.5" />
              {formData.rateBuildUp?.mode === 'DERIVED' ? 'Edit LPMS rate build-up' : 'Add LPMS rate build-up'}
            </button>
          </div>
          </InspectorSectionCard>
        )}

      </div>

      <div className={`${isFloating ? 'p-2.5' : 'p-3'} border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shrink-0 bg-surface/90 dark:bg-surface-900/95`}>
        <div className="min-w-0 text-xs">
          <div className={`font-semibold ${saveState === 'error' ? 'text-rose-600 dark:text-rose-300' : saveState === 'saving' ? 'text-blue-600 dark:text-blue-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
            {saveStateLabel}
          </div>
          <div className="mt-0.5 truncate text-slate-500 dark:text-slate-400">
            {saveStateDetail}
            {app?.persistenceBackend === 'localStorage' ? ' · Browser fallback' : ''}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-app hover:bg-slate-200 dark:hover:bg-slate-600"
        >
          Close
        </button>
      </div>
      </div>
    </aside>
    {isDescriptionEditorOpen && (
      <RichDescriptionEditor
        value={formData.description}
        onClose={() => setIsDescriptionEditorOpen(false)}
        onSave={(value) => {
          setFormData({ ...formData, description: value });
          setIsDescriptionEditorOpen(false);
        }}
      />
    )}
    </>
  );
};

const InspectorLocationStrip: React.FC<{ context: InspectorLocationContext; isFloating: boolean }> = ({ context, isFloating }) => (
  <div
    className={`${isFloating ? 'mt-2 px-2.5 py-2' : 'mt-2 px-3 py-2'} rounded-app border border-emerald-200/80 bg-emerald-50/80 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-100`}
  >
    <div className="flex min-w-0 items-center gap-2">
      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-300" />
      <div className="min-w-0">
        <div className="truncate font-semibold">{context.modeLabel}</div>
        {context.scopeLabel && (
          <div className="mt-0.5 truncate text-[11px] text-emerald-800/80 dark:text-emerald-100/75">{context.scopeLabel}</div>
        )}
      </div>
    </div>
  </div>
);

const InspectorSectionCard: React.FC<InspectorSectionCardProps> = ({
  id,
  title,
  summary,
  isCollapsed,
  isFloating,
  onToggle,
  children,
}) => (
  <section className={`rounded-app-lg border border-slate-200/80 bg-surface shadow-card dark:border-slate-700 dark:bg-surface-900 ${isFloating ? 'p-2.5' : 'p-3'}`}>
    <button
      type="button"
      onClick={() => onToggle(id)}
      className="flex w-full items-center justify-between gap-3 text-left"
      aria-expanded={!isCollapsed}
    >
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{title}</div>
        {summary && (
          <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{summary}</div>
        )}
      </div>
      <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
    </button>
    {!isCollapsed && (
      <div className={isFloating ? 'mt-2.5' : 'mt-3'}>
        {children}
      </div>
    )}
  </section>
);

const COLOR_OPTIONS = [
  { label: 'Default', value: '#0f172a' },
  { label: 'Blue', value: '#1d4ed8' },
  { label: 'Green', value: '#047857' },
  { label: 'Amber', value: '#b45309' },
  { label: 'Red', value: '#b91c1c' },
  { label: 'Purple', value: '#7c3aed' },
];

function applyEditorCommand(command: string, value?: string) {
  globalThis.document?.execCommand(command, false, value);
}

function applyEditorColorToAll(editor: HTMLDivElement | null, color: string) {
  if (!editor || typeof window === 'undefined') return;

  editor.focus();

  const selection = window.getSelection();
  if (!selection) return;

  const savedRanges: Range[] = [];
  for (let index = 0; index < selection.rangeCount; index += 1) {
    const range = selection.getRangeAt(index);
    savedRanges.push(range.cloneRange());
  }

  const fullRange = document.createRange();
  fullRange.selectNodeContents(editor);

  selection.removeAllRanges();
  selection.addRange(fullRange);
  applyEditorCommand('styleWithCSS', 'true');
  applyEditorCommand('foreColor', color);

  selection.removeAllRanges();
  savedRanges.forEach((range) => selection.addRange(range));
}

const RichDescriptionEditor: React.FC<{
  value: string;
  onClose: () => void;
  onSave: (value: string) => void;
}> = ({ value, onClose, onSave }) => {
  const editorRef = React.useRef<HTMLDivElement | null>(null);
  const [html, setHtml] = React.useState(value || '');
  const { preference: spellcheckPreference } = useSpellcheckPreference();

  React.useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = value || '';
  }, [value]);

  const syncEditorHtml = React.useCallback(() => {
    if (editorRef.current) {
      setHtml(editorRef.current.innerHTML);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/65 p-4 dark:bg-black/75">
      <div className="w-full max-w-3xl rounded-app-lg border border-slate-300 bg-white shadow-[0_28px_72px_-24px_rgba(15,23,42,0.5)] dark:border-slate-700 dark:bg-surface-900">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Description editor</div>
            <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">Long-form item description</div>
          </div>
          <button type="button" onClick={onClose} className="workspace-secondary-btn px-3 py-2 text-xs">
            <X className="w-4 h-4" />
            Close
          </button>
        </div>
        <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-700">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => applyEditorCommand('bold')} className="workspace-secondary-btn px-3 py-1.5 text-xs"><Bold className="w-3.5 h-3.5" />Bold</button>
            <button type="button" onClick={() => applyEditorCommand('underline')} className="workspace-secondary-btn px-3 py-1.5 text-xs"><Underline className="w-3.5 h-3.5" />Underline</button>
            <button type="button" onClick={() => applyEditorCommand('insertUnorderedList')} className="workspace-secondary-btn px-3 py-1.5 text-xs"><List className="w-3.5 h-3.5" />Bullets</button>
            <div className="flex items-center gap-2 rounded-app border border-slate-200 px-2 py-1.5 dark:border-slate-700">
              <Palette className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  title={option.label}
                  onClick={() => applyEditorCommand('foreColor', option.value)}
                  className="h-4 w-4 rounded-full border border-slate-200 dark:border-slate-700"
                  style={{ backgroundColor: option.value }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-app border border-slate-200 px-2 py-1.5 dark:border-slate-700">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Whole line</span>
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={`all-${option.value}`}
                  type="button"
                  title={`Apply ${option.label} to the whole line`}
                  onClick={() => {
                    applyEditorColorToAll(editorRef.current, option.value);
                    syncEditorHtml();
                  }}
                  className="h-4 w-4 rounded-full border border-slate-200 dark:border-slate-700"
                  style={{ backgroundColor: option.value }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="p-5">
          <div
            ref={editorRef}
            contentEditable
            spellCheck={spellcheckPreference.enabled}
            lang={spellcheckPreference.language}
            suppressContentEditableWarning
            onInput={(e) => setHtml((e.target as HTMLDivElement).innerHTML)}
            className="min-h-[320px] rounded-app border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-100"
          />
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
          <button type="button" onClick={onClose} className="workspace-secondary-btn px-4 py-2 text-xs">Cancel</button>
          <button type="button" onClick={() => onSave(html)} className="workspace-primary-btn px-4 py-2 text-xs">Apply description</button>
        </div>
      </div>
    </div>
  );
};
