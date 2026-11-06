
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Wand2, Loader2, Sparkles, ListPlus, Plus, Trash2, MinusCircle, PlusCircle, Lightbulb, Search, ShoppingBag, Check, Filter, Paperclip, Ruler, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, MapPin } from 'lucide-react';
import { formatCurrency } from '../../utils/formatting';
import { getEditableUnitOptions, normalizeUnit } from '../../utils/formatting';
import { UnitType, DimensionRow, ProductSuggestion, EditorConfig, EditFormState, AISuggestion, BoQItem } from '../../types';
import { calculateItemQuantity, safeMul } from '../../utils/calculations';
import { parseSmartDimensions } from '../../utils/smartParser';
import { useToast } from '../../contexts/ToastContext';
import { generateId } from '../../utils/generateId';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useModalFocus } from '../../hooks/useModalFocus';
import type { TradePackage } from '../../types';
import { feedbackError, feedbackSuccess } from '../../utils/feedback';
import { looksLikeRichText, stripRichText } from '../../utils/richText';
import { useSpellcheckPreference } from '../../hooks/useSpellcheckPreference';
import { itemTypeOptions } from '../UI/ItemTypeDropdown';
import { useHelpContext } from '../../hooks/useHelpContext';
import { useAppContextOptional } from '../../contexts/AppContext';
import { HelpButton } from '../Help/HelpButton';
import { RateBuildUpPanel } from '../Project/RateBuildUpPanel';
import { formatProjectSiteLocation } from '../../utils/siteLocation';

export interface ItemEditorModalProps {
  config: EditorConfig;
  contextTitle?: string;
  contextDetail?: string;
  editorLocationContext?: {
    modeLabel: string;
    scopeLabel?: string;
    placementLabel?: string;
    rowLabel?: string;
  } | null;
  trades: TradePackage[];
  formData: EditFormState;
  setFormData: React.Dispatch<React.SetStateAction<EditFormState>>;
  onSave: () => void;
  onSaveAndAddAnother?: () => void;
  onSaveMultiple?: (items: BoQItem[], continueAdding?: boolean) => void;
  onClose: () => void;
  onAiFetch: () => void;
  isAiLoading: boolean;
  aiSuggestions: AISuggestion[];
  onSuggestionSelect: (s: AISuggestion) => void;
  onIntervalExpand: (interval: number, max: number) => Promise<void>;
  onPreviousItem?: () => void;
  onNextItem?: () => void;
  onPreviousPricedItem?: () => void;
  onNextPricedItem?: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  canGoPreviousPriced?: boolean;
  canGoNextPriced?: boolean;
  itemPositionLabel?: string;
  quickAddTargets?: Array<{ value: string; label: string; sectionId: string; pageId?: string | null }>;
  quickAddTargetValue?: string;
  onQuickAddTargetChange?: (value: string) => void;
  quickAddAnchorLabel?: string;
  quickAddPlacement?: 'before' | 'after';
  onQuickAddPlacementChange?: (placement: 'before' | 'after') => void;
}

type AiMeasureFile = { name: string; mimeType: string; data: string };

const MAX_AI_MEASURE_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function loadGeminiService() {
  return import('../../services/geminiService');
}

function buildAiScopeLabel(contextTitle?: string, contextDetail?: string) {
  const parts = [contextTitle, contextDetail].filter(Boolean);
  return parts.length > 0 ? parts.join(' • ') : 'Current bill context';
}

function EditorLocationStrip({
  context,
  compact = false,
}: {
  context?: ItemEditorModalProps['editorLocationContext'];
  compact?: boolean;
}) {
  if (!context) return null;
  return (
    <div className={`mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-emerald-800 dark:text-emerald-200 ${compact ? 'text-xs' : 'text-[11px]'}`}>
      <MapPin className="h-3.5 w-3.5 shrink-0" />
      <span className="font-semibold">{context.modeLabel}</span>
      {context.scopeLabel && <span className="max-w-[24rem] truncate">{context.scopeLabel}</span>}
      {context.placementLabel && <span className="max-w-[28rem] truncate">{context.placementLabel}</span>}
      {context.rowLabel && <span className="truncate">{context.rowLabel}</span>}
    </div>
  );
}

function readMeasureFileAsBase64(file: File, maxBytes: number): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    if (file.size > maxBytes) {
      reject(`File "${file.name}" is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject('Failed to read file.');
        return;
      }
      const base64 = result.split(',')[1];
      if (!base64) {
        reject('Failed to encode file.');
        return;
      }
      resolve({ data: base64, mimeType: file.type || 'application/octet-stream' });
    };
    reader.onerror = () => reject(reader.error?.message || 'Failed to read file.');
    reader.readAsDataURL(file);
  });
}

export const ItemEditorModal: React.FC<ItemEditorModalProps> = ({ config, contextTitle, contextDetail, editorLocationContext, trades, formData, setFormData, onSave, onSaveAndAddAnother, onSaveMultiple, onClose, onAiFetch, isAiLoading, aiSuggestions, onSuggestionSelect, onIntervalExpand, onPreviousItem, onNextItem, onPreviousPricedItem, onNextPricedItem, canGoPrevious = false, canGoNext = false, canGoPreviousPriced = false, canGoNextPriced = false, itemPositionLabel, quickAddTargets = [], quickAddTargetValue = '__bill__', onQuickAddTargetChange, quickAddAnchorLabel, quickAddPlacement = 'after', onQuickAddPlacementChange }) => {
  const { showToast } = useToast();
  const { askConfirm } = useConfirm();
  const app = useAppContextOptional();
  const { contentRef, contentProps } = useModalFocus(true, onClose);
  const [activeTab, setActiveTab] = useState<'general' | 'dimensions' | 'market'>('general');
  const [isExpanding, setIsExpanding] = useState(false);
  const [intervalStep, setIntervalStep] = useState(0.5);
  const [maxVal, setMaxVal] = useState(5.0);
  const [expandingWait, setExpandingWait] = useState(false);
  const [smartSuggestion, setSmartSuggestion] = useState<{ suggestedUnit?: string; height?: number; width?: number } | null>(null);
  const [isAiMeasureOpen, setIsAiMeasureOpen] = useState(false);
  const [isAiMeasureLoading, setIsAiMeasureLoading] = useState(false);
  const [aiMeasureQuestion, setAiMeasureQuestion] = useState('');
  const [aiMeasureAnswer, setAiMeasureAnswer] = useState('');
  const [aiMeasureSummary, setAiMeasureSummary] = useState('');
  const [aiMeasureFiles, setAiMeasureFiles] = useState<AiMeasureFile[]>([]);
  const [aiMeasureHistory, setAiMeasureHistory] = useState<string[]>([]);

  // Market Research State
  const [marketAnalysis, setMarketAnalysis] = useState<string>("");
  const [productSuggestions, setProductSuggestions] = useState<ProductSuggestion[]>([]);

  // Independent loading states for better UX
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [isRateLoading, setIsRateLoading] = useState(false);

  const [isRefining, setIsRefining] = useState(false);
  const [marketRequirements, setMarketRequirements] = useState("");
  const [aiRateRationale, setAiRateRationale] = useState('');
  const [aiRateResult, setAiRateResult] = useState<{ rate: number; rationale: string } | null>(null);
  const { preference: spellcheckPreference } = useSpellcheckPreference();
  const quickAddTypeButtonRef = useRef<HTMLButtonElement>(null);
  const quickAddTypeMenuRef = useRef<HTMLDivElement>(null);
  const [isQuickAddTypeMenuOpen, setIsQuickAddTypeMenuOpen] = useState(false);
  const [quickAddTypeMenuPosition, setQuickAddTypeMenuPosition] = useState({ top: 0, left: 0 });
  const [isQuickAddSequenceOpen, setIsQuickAddSequenceOpen] = useState(false);
  const [sequenceStart, setSequenceStart] = useState(0);
  const [sequenceEnd, setSequenceEnd] = useState(0);
  const [sequenceStep, setSequenceStep] = useState(0.25);
  const [quickAddQuantityDraft, setQuickAddQuantityDraft] = useState('');
  const [quickAddRateDraft, setQuickAddRateDraft] = useState('');

  // Bill-level rows legitimately have no section ID.
  const isLibraryMode = Boolean(config.libId || !config.billId);
  const isQuickAddMode = Boolean(config.billId && !config.libId && !config.item);
  const usesBlankQuickAddNumbers = isQuickAddMode && !config.item;
  useHelpContext(isQuickAddMode ? 'QUICK_ADD' : 'ITEM_EDITOR');
  const isPriced = ['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(config.type || config.item?.type || formData.type);
  const isQuickAddPricedType = ['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(formData.type);
  const activeQuickAddTypeOption = useMemo(
    () => itemTypeOptions.find((option) => option.type === formData.type) || itemTypeOptions.find((option) => option.type === 'PRICED') || itemTypeOptions[0],
    [formData.type]
  );
  const plainDescription = looksLikeRichText(formData.description)
    ? stripRichText(formData.description)
    : formData.description;
  const hasNumbers = /\d/.test(plainDescription);
  const activeTrade = trades.find((trade) => trade.id === formData.tradePackageId);
  const aiScopeLabel = buildAiScopeLabel(contextTitle, contextDetail);
  const aiRateInputs = [
    plainDescription.trim() ? 'item description' : null,
    formData.unit ? `unit: ${formData.unit}` : null,
    marketRequirements.trim() ? 'user market requirements' : null,
  ].filter(Boolean) as string[];
  const aiRefineUses = isLibraryMode
    ? ['selected library item', 'current description draft']
    : ['selected item', aiScopeLabel, 'current description draft'];
  const aiRateUses = ['selected item', aiScopeLabel, 'description, unit, and quantity'];
  const aiMeasureUses = ['selected item', aiScopeLabel, 'uploaded drawings and exact answers'];
  const aiMeasureBasis = [
    aiMeasureFiles.length > 0 ? `${aiMeasureFiles.length} drawing${aiMeasureFiles.length === 1 ? '' : 's'} attached` : null,
    aiMeasureHistory.filter((entry) => entry.startsWith('User answer:')).length > 0
      ? `${aiMeasureHistory.filter((entry) => entry.startsWith('User answer:')).length} direct answer${aiMeasureHistory.filter((entry) => entry.startsWith('User answer:')).length === 1 ? '' : 's'}`
      : null,
    aiMeasureSummary ? 'latest AI take-off summary available' : null,
  ].filter(Boolean) as string[];
  const quantityDecimals = Math.max(0, Math.min(6, Number(formData.quantityDecimals) || 0));
  const formattedQuantity = formData.quantity.toFixed(quantityDecimals);

  useEffect(() => {
    if (!usesBlankQuickAddNumbers) {
      setQuickAddQuantityDraft(String(formData.quantity || ''));
      setQuickAddRateDraft(String(formData.rate || ''));
      return;
    }
    setQuickAddQuantityDraft('');
    setQuickAddRateDraft('');
  }, [config.billId, config.sectionId, config.pageId, config.insertAfterItemId, config.type, usesBlankQuickAddNumbers]);

  useEffect(() => {
    if (activeTab === 'dimensions' && formData.dimensionRows?.length > 0) {
       const qty = calculateItemQuantity(formData.dimensionRows, formData.unit);
       setFormData((prev) => ({ ...prev, quantity: qty }));
    }
  }, [formData.dimensionRows, formData.unit, activeTab]);

  useEffect(() => {
     const handleGlobalKey = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
           e.preventDefault();
           onSave();
        }
        const isTyping = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;
        if ((!isTyping && (e.key === '+' || e.key === '=')) || (e.altKey && (e.key === '+' || e.key === '='))) {
           e.preventDefault();
           addDimensionRow();
        }
     };
     window.addEventListener('keydown', handleGlobalKey);
     return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [formData, onSave]);

  useEffect(() => {
     if (!plainDescription) return;
     const result = parseSmartDimensions(plainDescription);
     if (result.height || result.width || (result.suggestedUnit && result.suggestedUnit !== formData.unit)) {
        setSmartSuggestion(result);
     } else {
        setSmartSuggestion(null);
     }
  }, [plainDescription]);

  useEffect(() => {
    if (!isQuickAddMode || !isQuickAddTypeMenuOpen || !quickAddTypeButtonRef.current) return;

    const updatePosition = () => {
      const rect = quickAddTypeButtonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const viewportPadding = 12;
      const menuWidth = Math.min(Math.max(rect.width, 320), window.innerWidth - viewportPadding * 2);
      const estimatedMenuHeight = 320;
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const openUpward = spaceBelow < Math.min(estimatedMenuHeight, 280) && rect.top > spaceBelow;
      const top = openUpward
        ? Math.max(viewportPadding, rect.top - estimatedMenuHeight - 4)
        : Math.min(rect.bottom + 4, Math.max(viewportPadding, window.innerHeight - estimatedMenuHeight - viewportPadding));
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        window.innerWidth - menuWidth - viewportPadding
      );
      setQuickAddTypeMenuPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isQuickAddMode, isQuickAddTypeMenuOpen]);

  useEffect(() => {
    if (!isQuickAddTypeMenuOpen) return;

    const focusTimer = window.setTimeout(() => {
      const firstButton = quickAddTypeMenuRef.current?.querySelector<HTMLButtonElement>('button');
      firstButton?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsQuickAddTypeMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      quickAddTypeButtonRef.current?.focus();
    };
  }, [isQuickAddTypeMenuOpen]);

  useEffect(() => {
    if (!isQuickAddSequenceOpen) return;
    const match = plainDescription.match(/-?\d+(?:\.\d+)?/);
    if (!match) return;
    const value = Number(match[0]);
    if (!Number.isFinite(value)) return;
    setSequenceStart(value);
    setSequenceEnd(value);
  }, [isQuickAddSequenceOpen, plainDescription]);

  useEffect(() => {
     const handleArrowNavigate = (e: KeyboardEvent) => {
       if (!onPreviousItem && !onNextItem) return;
       const activeEl = document.activeElement as HTMLElement | null;
       if (activeEl) {
         const tagName = activeEl.tagName;
         const isEditable =
           activeEl.isContentEditable ||
           tagName === 'INPUT' ||
           tagName === 'TEXTAREA' ||
           tagName === 'SELECT';
         if (isEditable) return;
       }

       if (e.key === 'ArrowUp' && canGoPrevious && onPreviousItem) {
         e.preventDefault();
         onPreviousItem();
       }

       if (e.key === 'ArrowDown' && canGoNext && onNextItem) {
         e.preventDefault();
         onNextItem();
       }
     };
     window.addEventListener('keydown', handleArrowNavigate);
     return () => window.removeEventListener('keydown', handleArrowNavigate);
  }, [canGoNext, canGoPrevious, onNextItem, onPreviousItem]);

  const applySmartSuggestion = () => {
     if (!smartSuggestion) return;
     const updates: Partial<EditFormState> = {};
     if (smartSuggestion.suggestedUnit) updates.unit = smartSuggestion.suggestedUnit;
     const rows = [...(formData.dimensionRows || [])];
     if (rows.length === 0) rows.push({ id: generateId(), multiplier: 1, length: 0, width: 0, height: 0, comment: '', isDeduction: false });
     if (rows.length > 0) {
         if (smartSuggestion.height) rows[0].height = smartSuggestion.height;
         if (smartSuggestion.width) rows[0].width = smartSuggestion.width;
     }
     updates.dimensionRows = rows;
     setFormData({ ...formData, ...updates });
     setSmartSuggestion(null);
     setActiveTab('dimensions');
  };

  const addDimensionRow = () => {
     const newRow: DimensionRow = { id: generateId(), multiplier: 0, length: 0, width: 0, height: 0, comment: '', isDeduction: false };
     setFormData((prev) => ({ ...prev, dimensionRows: [...(prev.dimensionRows || []), newRow] }));
  };

  const updateDim = (id: string, field: keyof DimensionRow, val: string | number | boolean) => {
    const next = (formData.dimensionRows || []).map((r) => r.id === id ? { ...r, [field]: val } : r);
    setFormData({ ...formData, dimensionRows: next });
  };

  const toggleDeduction = (id: string) => {
    const next = (formData.dimensionRows || []).map((r) => r.id === id ? { ...r, isDeduction: !r.isDeduction } : r);
    setFormData({ ...formData, dimensionRows: next });
  };

  const handleExpand = async () => {
    setExpandingWait(true);
    await onIntervalExpand(intervalStep, maxVal);
    setExpandingWait(false);
  };

  const handleDimKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Tab' && !e.shiftKey && index === (formData.dimensionRows?.length || 0) - 1) {
       e.preventDefault();
       addDimensionRow();
       window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
         const rows = document.querySelectorAll<HTMLTableRowElement>('[data-measurement-row]');
         rows[rows.length - 1]?.querySelector<HTMLInputElement>('[data-measurement-times]')?.focus();
       }));
    }
  };

  const handleMarketResearch = async () => {
     if (!plainDescription) return;

     setMarketAnalysis("");
     setProductSuggestions([]);

     setIsAnalysisLoading(true);
     const { getRealTimeProductAnalysis, suggestProducts } = await loadGeminiService();
     getRealTimeProductAnalysis(plainDescription, marketRequirements)
       .then((res) => {
         if ('error' in res) {
           showToast({ type: 'error', message: feedbackError('Market analysis', res.error, 'Please try the analysis again.') });
           setMarketAnalysis('');
           return;
         }
         setMarketAnalysis(res.data);
       })
       .catch((e) => { console.error(e); showToast({ type: 'error', message: feedbackError('Market analysis', e, 'Please try the analysis again.') }); })
       .finally(() => setIsAnalysisLoading(false));

     setIsProductsLoading(true);
     suggestProducts(plainDescription, marketRequirements)
       .then((res) => {
         if ('error' in res) {
           showToast({ type: 'error', message: feedbackError('Product search', res.error, 'Please try the search again.') });
           setProductSuggestions([]);
           return;
         }
         setProductSuggestions(res.data);
       })
       .catch((e) => { console.error(e); showToast({ type: 'error', message: feedbackError('Product search', e, 'Please try the search again.') }); })
       .finally(() => setIsProductsLoading(false));
  };

  const handleAiRate = async () => {
    if (formData.aiLocks.rate) {
      showToast({ type: 'info', message: 'Rate is locked against AI overwrite. Unlock it first to run AI rate.' });
      return;
    }
    if (!plainDescription.trim()) {
      showToast({ type: 'info', message: 'Add the item description first so AI can estimate a rate.' });
      return;
    }
    if (!formData.unit) {
      showToast({ type: 'info', message: 'Choose a unit first so AI can price the correct basis.' });
      return;
    }

    setIsRateLoading(true);
    const { getBoQRateEstimate } = await loadGeminiService();
    const site = app?.currentProject ? formatProjectSiteLocation(app.currentProject) : '';
    const result = await getBoQRateEstimate(plainDescription, formData.unit, [marketRequirements, site && `Site location: ${site}. Use relevant local labour and supply pricing.`].filter(Boolean).join('\n'));
    setIsRateLoading(false);

    if ('error' in result) {
      showToast({ type: 'error', message: feedbackError('AI rate estimate', result.error, 'Please try again or add more detail to the description.') });
      return;
    }

    setAiRateRationale(result.data.rationale);
    setAiRateResult(result.data);
  };

  const applyAllInclusiveRate = () => {
    if (!aiRateResult) return;
    setFormData((prev) => ({ ...prev, rate: aiRateResult.rate, rateBuildUp: { mode: 'SINGLE_RATE', components: prev.rateBuildUp?.components || [], updatedAt: new Date().toISOString() } }));
    showToast({ type: 'success', message: feedbackSuccess('AI rate estimate', `Inserted ${formatCurrency(aiRateResult.rate)} per ${formData.unit}.`) }); setAiRateResult(null);
  };
  const createLpmsBuildUp = async () => {
    if (!aiRateResult) return; setIsRateLoading(true);
    const { getBoQRateBuildUp } = await loadGeminiService(); const result = await getBoQRateBuildUp(plainDescription, formData.unit, [marketRequirements, app?.currentProject && `Site location: ${formatProjectSiteLocation(app.currentProject)}`].filter(Boolean).join('\n')); setIsRateLoading(false);
    if ('error' in result || result.data.components.length === 0) { showToast({ type: 'error', message: feedbackError('AI rate build-up', 'The rate was retained but an LPMS breakdown was not available.', 'Use the direct rate or add components manually.') }); return; }
    const rateBuildUp = { mode: 'DERIVED' as const, updatedAt: new Date().toISOString(), components: result.data.components.map((component, position) => ({ ...component, id: generateId(), included: true, position })) };
    const rate = rateBuildUp.components.reduce((total, component) => total + component.quantity * component.rate, 0);
    setFormData((prev) => ({ ...prev, rate, rateBuildUp })); setAiRateRationale(result.data.rationale); setAiRateResult(null);
    showToast({ type: 'success', message: `Created an editable LPMS rate build-up totalling ${formatCurrency(rate)}.` });
  };

  const applyProductSuggestion = async (prod: ProductSuggestion) => {
     if (formData.aiLocks.description) {
       showToast({ type: 'info', message: 'Description is locked. Unlock it before applying AI-generated wording.' });
       return;
     }
     const ok = await askConfirm({
       title: 'Update with product specification',
       message: `Rewrite this item's description to include the specification for "${prod.name}" (${prod.manufacturer})?`,
       confirmLabel: 'Update description',
       cancelLabel: 'Cancel',
     });
     if (!ok) return;
     setIsRefining(true);
     const { refineDescriptionWithProduct } = await loadGeminiService();
     const result = await refineDescriptionWithProduct(plainDescription, prod);
      if ('error' in result) {
        showToast({ type: 'error', message: feedbackError('Description refinement', result.error, 'Please try a different product suggestion.') });
        setIsRefining(false);
        return;
     }
     const refinedDescription = result.data;
     setFormData((prev) => ({ ...prev, description: refinedDescription }));
     showToast({ type: 'success', message: feedbackSuccess('Product specification update', 'Save changes when you are happy with the wording.') });
     setIsRefining(false);
  };

  const formatAIResponse = (text: string) => {
     if (!text) return null;
     const lines = text.split('\n');
     return lines.map((line, idx) => {
         // Handle Bullet Points
         const isBullet = line.trim().startsWith('-') || line.trim().startsWith('*');
         const content = line.replace(/^[\-*]\s*/, '');

         // Simple bold parser for **text**
         const parts = content.split(/(\*\*.*?\*\*)/g);

                     return (
                         <div key={idx} className={`mb-2 ${isBullet ? 'pl-4 relative' : ''}`}>
                                 {isBullet && <span className="absolute left-0 top-1.5 w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full" />}
                                 {parts.map((part, pIdx) => {
                                     if (part.startsWith('**') && part.endsWith('**')) {
                                         return <strong key={pIdx} className="text-slate-900 dark:text-slate-100 font-semibold">{part.slice(2, -2)}</strong>;
                                     }
                                     return <span key={pIdx} className="text-slate-600 dark:text-slate-300">{part}</span>;
                                 })}
                             </div>
                         );
     });
  };

  const isLoadingAnything = isAnalysisLoading || isProductsLoading;

  const applyMeasuredRows = async (rows: DimensionRow[], quantityOverride?: number, summary?: string) => {
    if (formData.aiLocks.measurements) {
      showToast({ type: 'info', message: 'Measurements are locked. Unlock them before applying AI take-off updates.' });
      return;
    }
    if ((formData.dimensionRows || []).length > 0) {
      const ok = await askConfirm({
        title: 'Replace current dimensions',
        message: 'Replace the current dimension rows with the AI-measured take-off?',
        confirmLabel: 'Replace',
        cancelLabel: 'Keep current',
      });
      if (!ok) return;
    }

    const quantity = quantityOverride ?? calculateItemQuantity(rows, formData.unit);
    setFormData((prev) => ({
      ...prev,
      dimensionRows: rows,
      quantity,
    }));
    setAiMeasureSummary(summary || 'AI measurements applied.');
    setIsAiMeasureOpen(false);
    showToast({ type: 'success', message: feedbackSuccess('AI measure', 'Dimensions updated in the measurement grid.') });
  };

  const runAiMeasure = async (overrideAnswer?: string) => {
    if (formData.aiLocks.measurements) {
      showToast({ type: 'info', message: 'Measurements are locked against AI overwrite. Unlock them first to continue.' });
      return;
    }
    if (!plainDescription.trim()) {
      showToast({ type: 'info', message: 'Add the item description first so AI measure knows what to quantify.' });
      return;
    }

    setIsAiMeasureOpen(true);
    setIsAiMeasureLoading(true);

    const answer = (overrideAnswer ?? aiMeasureAnswer).trim();
    const newHistory = [...aiMeasureHistory];
    if (answer) newHistory.push(`User answer: ${answer}`);
    if (aiMeasureFiles.length > 0) newHistory.push(`[Context: User provided ${aiMeasureFiles.length} measurement drawing file(s)]`);

    const { captureBoQMeasurements } = await loadGeminiService();
    const result = await captureBoQMeasurements([
      { description: plainDescription, unit: formData.unit, type: formData.type },
    ], newHistory, aiMeasureFiles);

    setIsAiMeasureLoading(false);

    if ('error' in result) {
      showToast({ type: 'error', message: feedbackError('AI measure', result.error, 'Please try again or upload clearer drawings.') });
      return;
    }

    setAiMeasureHistory(newHistory);
    setAiMeasureAnswer('');
    setAiMeasureSummary(result.data.summary || '');

    if (result.data.needsClarification) {
      setAiMeasureQuestion(result.data.question || 'Please provide the next missing size or upload the measurement drawing.');
      return;
    }

    const measuredItem = result.data.items?.[0];
    if (!measuredItem || measuredItem.dimensionRows.length === 0) {
      showToast({ type: 'info', message: 'AI measure could not find enough measurement detail yet. Please answer the next question or upload drawings.' });
      return;
    }

    const rows: DimensionRow[] = measuredItem.dimensionRows.map((row) => ({
      id: generateId(),
      multiplier: row.multiplier ?? 1,
      length: row.length ?? 0,
      width: row.width ?? 0,
      height: row.height ?? 0,
      comment: row.comment || 'AI measured',
      isDeduction: row.isDeduction ?? false,
    }));

    await applyMeasuredRows(rows, measuredItem.quantity, result.data.summary);
  };

  const startAiMeasure = async () => {
    setAiMeasureQuestion('');
    setAiMeasureSummary('');
    setAiMeasureAnswer('');
    setAiMeasureHistory([]);
    setAiMeasureFiles([]);
    await runAiMeasure('');
  };

  const handleAiMeasureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const nextFiles: AiMeasureFile[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const { data, mimeType } = await readMeasureFileAsBase64(files[i], MAX_AI_MEASURE_FILE_SIZE_BYTES);
        nextFiles.push({ name: files[i].name, mimeType, data });
      } catch (error) {
        showToast({ type: 'error', message: feedbackError(`Uploading "${files[i].name}" for AI measure`, error, 'Please try a smaller or different file.') });
      }
    }
    if (nextFiles.length > 0) {
      setAiMeasureFiles((prev) => [...prev, ...nextFiles]);
      setIsAiMeasureOpen(true);
    }
  };

  const handleAiMeasurePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') === -1) continue;
      const file = items[i].getAsFile();
      if (!file) continue;
      try {
        const { data, mimeType } = await readMeasureFileAsBase64(file, MAX_AI_MEASURE_FILE_SIZE_BYTES);
        setAiMeasureFiles((prev) => [...prev, { name: `Measurement snapshot ${new Date().toLocaleTimeString()}.png`, mimeType, data }]);
        setIsAiMeasureOpen(true);
      } catch (error) {
        showToast({ type: 'error', message: feedbackError('Pasting image for AI measure', error, 'Please try pasting the drawing again.') });
      }
      break;
    }
  };

  const toggleAiLock = (field: keyof EditFormState['aiLocks']) => {
    setFormData((prev) => ({
      ...prev,
      aiLocks: {
        ...prev.aiLocks,
        [field]: !prev.aiLocks[field],
      },
    }));
  };

  const applyQuickAddType = (nextType: EditFormState['type']) => {
    const nextIsPriced = ['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'].includes(nextType);
    setFormData((prev) => ({
      ...prev,
      type: nextType,
      unit: nextIsPriced ? normalizeUnit(prev.unit || UnitType.NR) : '',
      quantity: nextIsPriced ? prev.quantity : 0,
      rate: nextIsPriced ? prev.rate : 0,
      tradePackageId: nextIsPriced ? prev.tradePackageId : '',
      dimensionRows: nextIsPriced ? prev.dimensionRows : [],
    }));
    setIsQuickAddTypeMenuOpen(false);
  };

  const buildSequenceDescriptions = () => {
    const source = plainDescription;
    const match = source.match(/-?\d+(?:\.\d+)?/);
    if (!match) return [];
    if (sequenceStep <= 0 || sequenceEnd < sequenceStart) return [];

    const decimals = Math.max(
      (match[0].split('.')[1]?.length || 0),
      (String(sequenceStart).split('.')[1]?.length || 0),
      (String(sequenceEnd).split('.')[1]?.length || 0),
      (String(sequenceStep).split('.')[1]?.length || 0),
    );
    const prefix = source.slice(0, match.index || 0);
    const suffix = source.slice((match.index || 0) + match[0].length);
    const items: string[] = [];
    for (let value = sequenceStart; value <= sequenceEnd + sequenceStep / 1000; value += sequenceStep) {
      items.push(`${prefix}${value.toFixed(decimals)}${suffix}`);
      if (items.length >= 100) break;
    }
    return items;
  };

  const sequencePreview = useMemo(() => buildSequenceDescriptions(), [plainDescription, sequenceEnd, sequenceStart, sequenceStep]);

  const handleQuickAddSequenceSave = (continueAdding = false) => {
    if (!onSaveMultiple || !isQuickAddPricedType) return;
    const descriptions = buildSequenceDescriptions();
    if (descriptions.length === 0) {
      showToast({ type: 'info', message: 'Add a numeric value in the description, then set a valid start, end, and interval.' });
      return;
    }
    const nextItems = descriptions.map((description) => ({
      id: generateId(),
      type: formData.type,
      reference: '',
      description,
      unit: normalizeUnit(formData.unit || UnitType.NR),
      quantity: formData.quantity || 0,
      quantityDecimals,
      rate: formData.rate || 0,
      total: safeMul(formData.quantity || 0, formData.rate || 0),
      tradePackageId: formData.tradePackageId || '',
      dimensionRows: [],
      aiLocks: { ...formData.aiLocks },
    })) as BoQItem[];
    onSaveMultiple(nextItems, continueAdding);
  };

  if (isQuickAddMode) {
    return (
      <div data-smoke="item-editor-modal" className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 dark:bg-black/70">
        <div
          ref={contentRef}
          {...contentProps}
          aria-labelledby="item-editor-title"
          data-help-id="help-quick-add-main"
          className="w-full max-w-xl rounded-app-lg border border-slate-300 bg-white shadow-[0_32px_80px_-24px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-surface-900"
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <div className="min-w-0">
              <div className="workspace-chip">
                <PlusCircle className="h-3 w-3" />
                Quick add
              </div>
              <h2 id="item-editor-title" className="mt-3 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                Add new bill line
              </h2>
              {(contextTitle || contextDetail) && (
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {contextDetail || contextTitle}
                </div>
              )}
              <EditorLocationStrip context={editorLocationContext} compact />
            </div>
            <div className="flex items-center gap-2">
              <HelpButton compact onClick={() => app?.openHelp('QUICK_ADD')} />
              <button onClick={onClose} className="rounded-app-sm p-2 text-slate-500 transition-colors hover:bg-surface-muted dark:text-slate-400 dark:hover:bg-surface-800">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="space-y-4 bg-slate-50 px-5 py-5 dark:bg-surface-950">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Line type
              <button
                ref={quickAddTypeButtonRef}
                type="button"
                onClick={() => setIsQuickAddTypeMenuOpen((open) => !open)}
                data-help-id="help-quick-add-type"
                className="mt-2 flex w-full items-center justify-between rounded-app border border-slate-200 bg-white px-3 py-3 text-left outline-none transition hover:border-slate-300 hover:bg-slate-50 focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:hover:border-slate-500 dark:hover:bg-surface-800"
                aria-haspopup="menu"
                aria-expanded={isQuickAddTypeMenuOpen}
                aria-controls="quick-add-type-menu"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <activeQuickAddTypeOption.icon className={`h-4 w-4 shrink-0 ${activeQuickAddTypeOption.color}`} />
                  <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {activeQuickAddTypeOption.label}
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
              </button>
            </label>
            {isQuickAddTypeMenuOpen && typeof document !== 'undefined' && createPortal(
              <>
                <div className="fixed inset-0 z-[109]" aria-hidden onClick={() => setIsQuickAddTypeMenuOpen(false)} />
                <div
                  id="quick-add-type-menu"
                  ref={quickAddTypeMenuRef}
                  role="menu"
                  aria-label="Quick add line type"
                  className="fixed z-[110] max-h-[20rem] overflow-y-auto rounded-app border border-slate-200 bg-surface py-2 shadow-app-lg dark:border-slate-700 dark:bg-surface-800"
                  style={{ top: quickAddTypeMenuPosition.top, left: quickAddTypeMenuPosition.left, width: 320 }}
                >
                  {itemTypeOptions.map((option) => (
                    <button
                      key={option.type}
                      type="button"
                      role="menuitemradio"
                      aria-checked={formData.type === option.type}
                      onClick={() => applyQuickAddType(option.type)}
                      className="flex w-full items-center gap-3 rounded-app-sm px-3 py-2 text-left transition-colors hover:bg-surface-muted dark:hover:bg-surface-800"
                    >
                      <option.icon className={`h-4 w-4 shrink-0 ${option.color}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium text-slate-700 dark:text-slate-200">{option.label}</span>
                      </span>
                      {formData.type === option.type && <Check className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" />}
                    </button>
                  ))}
                </div>
              </>,
              document.body
            )}
            <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Description
              <textarea
                value={formData.description}
                onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                rows={4}
                spellCheck={spellcheckPreference.enabled}
                lang={spellcheckPreference.enabled ? spellcheckPreference.language : undefined}
                className="mt-2 w-full rounded-app border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-100"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Quantity
                <input
                  type="number"
                  step="0.001"
                  value={isQuickAddPricedType ? (usesBlankQuickAddNumbers ? quickAddQuantityDraft : formData.quantity) : ''}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    if (usesBlankQuickAddNumbers) setQuickAddQuantityDraft(nextValue);
                    const parsed = Number(nextValue);
                    setFormData((prev) => ({ ...prev, quantity: Number.isFinite(parsed) ? parsed : 0 }));
                  }}
                  onFocus={(event) => event.target.select()}
                  disabled={!isQuickAddPricedType}
                  className="mt-2 w-full rounded-app border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-primary-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-100 dark:disabled:bg-surface-800 dark:disabled:text-slate-500"
                />
              </label>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Unit
                <select
                  value={isQuickAddPricedType ? normalizeUnit(formData.unit) : ''}
                  onChange={(event) => setFormData((prev) => ({ ...prev, unit: normalizeUnit(event.target.value) }))}
                  disabled={!isQuickAddPricedType || formData.rateBuildUp?.mode === 'DERIVED'}
                  className="mt-2 w-full rounded-app border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-900 outline-none focus:border-primary-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-100 dark:disabled:bg-surface-800 dark:disabled:text-slate-500"
                >
                  {getEditableUnitOptions(formData.unit).map((unit) => (
                    <option key={unit} value={unit}>{normalizeUnit(unit)}</option>
                  ))}
                </select>
              </label>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Rate
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={isQuickAddPricedType ? (usesBlankQuickAddNumbers ? quickAddRateDraft : formData.rate) : ''}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    if (usesBlankQuickAddNumbers) setQuickAddRateDraft(nextValue);
                    const parsed = Number(nextValue);
                    setFormData((prev) => ({ ...prev, rate: Number.isFinite(parsed) ? Math.max(0, parsed) : 0 }));
                  }}
                  onFocus={(event) => event.target.select()}
                  disabled={!isQuickAddPricedType}
                  className="mt-2 w-full rounded-app border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-primary-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-100 dark:disabled:bg-surface-800 dark:disabled:text-slate-500"
                />
              </label>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Trade
                <select
                  value={isQuickAddPricedType ? formData.tradePackageId : ''}
                  onChange={(event) => setFormData((prev) => ({ ...prev, tradePackageId: event.target.value }))}
                  disabled={!isQuickAddPricedType}
                  className="mt-2 w-full rounded-app border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-900 outline-none focus:border-primary-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-100 dark:disabled:bg-surface-800 dark:disabled:text-slate-500"
                >
                  <option value="">- None -</option>
                  {trades.map((trade) => (
                    <option key={trade.id} value={trade.id}>{trade.name}</option>
                  ))}
                </select>
              </label>
            </div>
            {isQuickAddPricedType && <RateBuildUpPanel formData={formData} setFormData={setFormData} />}
            <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Location
              <select
                value={quickAddTargetValue}
                onChange={(event) => onQuickAddTargetChange?.(event.target.value)}
                data-help-id="help-quick-add-location"
                className="mt-2 w-full rounded-app border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-100"
              >
                {quickAddTargets.map((target) => (
                  <option key={target.value} value={target.value}>{target.label}</option>
                ))}
              </select>
            </label>
            {quickAddAnchorLabel && onQuickAddPlacementChange && (
              <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Selected item placement
                <select
                  value={quickAddPlacement}
                  onChange={(event) => onQuickAddPlacementChange(event.target.value as 'before' | 'after')}
                  className="mt-2 w-full rounded-app border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-100"
                >
                  <option value="before">Before {quickAddAnchorLabel}</option>
                  <option value="after">After {quickAddAnchorLabel}</option>
                </select>
              </label>
            )}
            {isQuickAddPricedType && hasNumbers && (
              <div data-help-id="help-quick-add-sequence" className="rounded-app-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Create multiple items
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Uses the first number in the description as the sequence value.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsQuickAddSequenceOpen((current) => !current)}
                    className="workspace-secondary-btn px-3 py-2 text-xs"
                  >
                    <ListPlus className="h-3.5 w-3.5" />
                    {isQuickAddSequenceOpen ? 'Hide' : 'Create sequence'}
                  </button>
                </div>
                {isQuickAddSequenceOpen && (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Start
                        <input type="number" step="0.01" value={sequenceStart} onChange={(event) => setSequenceStart(Number(event.target.value) || 0)} className="mt-2 w-full rounded-app border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-100" />
                      </label>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        End
                        <input type="number" step="0.01" value={sequenceEnd} onChange={(event) => setSequenceEnd(Number(event.target.value) || 0)} className="mt-2 w-full rounded-app border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-100" />
                      </label>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Interval
                        <input type="number" min="0.01" step="0.01" value={sequenceStep} onChange={(event) => setSequenceStep(Number(event.target.value) || 0)} className="mt-2 w-full rounded-app border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-100" />
                      </label>
                    </div>
                    <div className="rounded-app border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-surface-800 dark:text-slate-300">
                      <div className="font-semibold text-slate-700 dark:text-slate-100">Sequence preview</div>
                      <div className="mt-2 space-y-1">
                        {sequencePreview.length === 0 ? (
                          <div>No preview yet. Add a numeric value in the description and a valid range.</div>
                        ) : (
                          sequencePreview.slice(0, 5).map((entry) => (
                            <div key={entry} className="truncate">{entry}</div>
                          ))
                        )}
                        {sequencePreview.length > 5 && (
                          <div className="text-slate-400 dark:text-slate-500">+ {sequencePreview.length - 5} more items</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-surface-muted px-5 py-4 dark:border-slate-700 dark:bg-surface-800">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {isQuickAddPricedType ? `Total: ${formatCurrency(safeMul(formData.quantity, formData.rate))}` : 'Non-priced line'}
            </div>
            <div className="flex items-center gap-3">
              {isQuickAddSequenceOpen && onSaveMultiple && sequencePreview.length > 0 && (
                <>
                  <button onClick={() => handleQuickAddSequenceSave(true)} className="workspace-secondary-btn px-4 py-2 text-xs">
                    Create sequence and continue
                  </button>
                  <button onClick={() => handleQuickAddSequenceSave(false)} className="workspace-secondary-btn px-4 py-2 text-xs">
                    Create sequence
                  </button>
                </>
              )}
              {onSaveAndAddAnother && (
                <button
                  onClick={() => {
                    onSaveAndAddAnother();
                    if (usesBlankQuickAddNumbers) {
                      setQuickAddQuantityDraft('');
                      setQuickAddRateDraft('');
                    }
                  }}
                  className="workspace-secondary-btn px-4 py-2 text-xs"
                >
                  Save and add another
                </button>
              )}
              <button onClick={onSave} className="workspace-primary-btn px-4 py-2 text-xs">
                Save item
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-smoke="item-editor-modal" className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 dark:bg-black/70">
      <div
        ref={contentRef}
        {...contentProps}
        aria-labelledby="item-editor-title"
        data-help-id="help-item-editor-main"
        className="w-full max-w-[72rem] min-w-0 rounded-app-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-surface-900 shadow-[0_32px_80px_-24px_rgba(15,23,42,0.45)] flex flex-col max-h-[90vh] overflow-hidden"
      >
        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-surface-900">
          <div className="flex justify-between items-start gap-4">
            <div className="min-w-0">
              <div className="workspace-chip">
                {isLibraryMode ? <Lightbulb className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                {isLibraryMode ? 'Library editor' : 'Bill editor'}
              </div>
              <h2 id="item-editor-title" className="mt-1 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{isLibraryMode ? 'Standard item' : (formData.reference || 'Bill item editor')}</h2>
              <EditorLocationStrip context={editorLocationContext} />
              {(contextTitle || contextDetail) && (
                <div className="mt-0.5 max-w-[65rem] truncate text-[11px] text-slate-500 dark:text-slate-400" title={[contextTitle, contextDetail].filter(Boolean).join(' · ')}>
                  {[contextTitle, contextDetail].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <HelpButton compact onClick={() => app?.openHelp('ITEM_EDITOR')} />
              <button onClick={onClose} className="p-2 hover:bg-surface-muted dark:hover:bg-surface-800 rounded-app-sm transition-colors text-slate-500 dark:text-slate-400"><X className="w-5 h-5" /></button>
            </div>
          </div>
          {(!isLibraryMode || isPriced) && (
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 rounded-app border border-slate-200/80 bg-surface-muted/45 px-2 py-1 dark:border-slate-700 dark:bg-surface-800/60">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setActiveTab('general')} className={activeTab === 'general' ? 'workspace-tab-btn-active' : 'workspace-tab-btn'}>Line</button>
                {isPriced && <button onClick={() => setActiveTab('dimensions')} className={activeTab === 'dimensions' ? 'workspace-tab-btn-active' : 'workspace-tab-btn'}>Quantity</button>}
                {isPriced && <button onClick={() => setActiveTab('market')} className={activeTab === 'market' ? 'workspace-tab-btn-active' : 'workspace-tab-btn'}>Rate/tools</button>}
              </div>
              {(itemPositionLabel || canGoPrevious || canGoNext) && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  {itemPositionLabel && (
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-600 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300">
                      {itemPositionLabel}
                    </span>
                  )}
                  <div className="flex items-center gap-1" aria-label="Bill row navigation">
                    <button type="button" onClick={onPreviousPricedItem} disabled={!canGoPreviousPriced} className="workspace-secondary-btn px-2 py-1 text-xs disabled:opacity-40" aria-label="Previous priced item" title="Previous priced item"><ChevronsLeft className="h-4 w-4" /></button>
                    <button type="button" onClick={onPreviousItem} disabled={!canGoPrevious} className="workspace-secondary-btn px-2 py-1 text-xs disabled:opacity-40" aria-label="Previous bill row" title="Previous bill row"><ChevronLeft className="h-4 w-4" /></button>
                    <button type="button" onClick={onNextItem} disabled={!canGoNext} className="workspace-secondary-btn px-2 py-1 text-xs disabled:opacity-40" aria-label="Next bill row" title="Next bill row"><ChevronRight className="h-4 w-4" /></button>
                    <button type="button" onClick={onNextPricedItem} disabled={!canGoNextPriced} className="workspace-secondary-btn px-2 py-1 text-xs disabled:opacity-40" aria-label="Next priced item" title="Next priced item"><ChevronsRight className="h-4 w-4" /></button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 overflow-y-auto bg-slate-50 p-3 dark:bg-surface-950">
           {activeTab === 'general' && (
             <div className="space-y-2 animate-in fade-in">
                {!isLibraryMode && (
                  <div data-help-id="help-item-editor-ai" className="flex flex-wrap items-center gap-2 rounded-app border border-slate-200/80 bg-white/88 px-3 py-1.5 dark:border-slate-700 dark:bg-surface-900/92">
                      <label htmlFor="detailed-editor-trade" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Trade</label>
                      <select
                        id="detailed-editor-trade"
                        aria-label="Trade package"
                        value={formData.tradePackageId}
                        onChange={(e) => setFormData({ ...formData, tradePackageId: e.target.value })}
                        className="min-w-[12rem] flex-1 bg-surface dark:bg-surface-900 border border-slate-200 dark:border-slate-600 rounded-app-sm px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      >
                        <option value="">- None -</option>
                        {trades.map((trade) => (
                          <option key={trade.id} value={trade.id}>{trade.name}</option>
                        ))}
                      </select>
                      {activeTrade && <span className="text-[11px] text-slate-500 dark:text-slate-400">Feeds {activeTrade.name}</span>}
                  </div>
                )}
                <div className="space-y-2 relative">
                    <div className="flex justify-between items-center">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Description</label>
                    <div className="flex flex-wrap gap-3">
                      {hasNumbers && !isExpanding && !isLibraryMode && (
                        <button onClick={() => setIsExpanding(true)} className="workspace-tertiary-btn px-0 py-0 text-xs"><Wand2 className="w-3 h-3" /> Smart interval expand</button>
                      )}
                      {isPriced && !isLibraryMode && (
                        <button onClick={handleAiRate} disabled={isRateLoading || formData.aiLocks.rate} className="workspace-tertiary-btn px-0 py-0 text-xs disabled:opacity-60" title="Estimate a working UK rate for this selected item">
                          {isRateLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          AI rate item
                        </button>
                      )}
                      {isPriced && (
                        <button type="button" onClick={() => setActiveTab('market')} className="workspace-tertiary-btn px-0 py-0 text-xs" title="Find product specifications and recommendations for this item">
                          <Search className="w-3 h-3" /> Specification finder
                        </button>
                      )}
                      <button onClick={onAiFetch} disabled={isAiLoading || formData.aiLocks.description} className="workspace-tertiary-btn px-0 py-0 text-xs disabled:opacity-50" title="Refine the wording for this selected item only">{isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AI refine draft</button>
                    </div>
                  </div>
                    {!isLibraryMode && (
                      <div className="flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => toggleAiLock('description')} className={`rounded-full border px-2 py-1 text-[11px] font-medium transition-colors ${formData.aiLocks.description ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300'}`}>
                        {formData.aiLocks.description ? 'Description locked' : 'Lock description'}
                      </button>
                      {isPriced && (
                        <button type="button" onClick={() => toggleAiLock('rate')} className={`rounded-full border px-2 py-1 text-[11px] font-medium transition-colors ${formData.aiLocks.rate ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300'}`}>
                          {formData.aiLocks.rate ? 'Rate locked' : 'Lock rate'}
                        </button>
                      )}
                    </div>
                  )}
                    {!isLibraryMode && (
                    <details className="rounded-app border border-slate-200/80 bg-surface-muted/45 px-3 py-1.5 text-[11px] leading-5 text-slate-600 dark:border-slate-700 dark:bg-surface-800/60 dark:text-slate-300">
                      <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">AI input and review</summary>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <div className="rounded-app-sm border border-slate-200/70 bg-white/80 px-3 py-2 dark:border-slate-700 dark:bg-surface-900/80">
                          <div className="font-semibold text-slate-700 dark:text-slate-200">AI refine</div>
                          <div className="mt-1">Uses {aiRefineUses.join(' • ')}.</div>
                          <div className="mt-1 text-slate-500 dark:text-slate-400">Changes the description draft only. Review it before saving.</div>
                        </div>
                        {isPriced && (
                          <div className="rounded-app-sm border border-slate-200/70 bg-white/80 px-3 py-2 dark:border-slate-700 dark:bg-surface-900/80">
                            <div className="font-semibold text-slate-700 dark:text-slate-200">AI rate</div>
                            <div className="mt-1">Uses {aiRateUses.join(' • ')}.</div>
                            <div className="mt-1 text-slate-500 dark:text-slate-400">Changes the rate field only. Total updates from the new rate and nothing is final until you save.</div>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                  {isExpanding ? (
                    <div className="bg-surface-muted dark:bg-surface-800 p-5 rounded-app border border-slate-200 dark:border-slate-700 space-y-4">
                       <h4 className="text-xs font-medium text-slate-700 dark:text-slate-200">Interval expansion (m / nr / kg)</h4>
                       <div className="grid grid-cols-2 gap-4">
                          <div><label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Increment step</label><input type="number" step="0.1" value={intervalStep} onChange={(e) => setIntervalStep(parseFloat(e.target.value) || 0)} className="w-full bg-surface dark:bg-surface-900 border border-slate-200 dark:border-slate-600 rounded-app-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" /></div>
                          <div><label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Max value</label><input type="number" step="0.1" value={maxVal} onChange={(e) => setMaxVal(parseFloat(e.target.value) || 0)} className="w-full bg-surface dark:bg-surface-900 border border-slate-200 dark:border-slate-600 rounded-app-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" /></div>
                       </div>
                       <div className="flex gap-2">
                          <button onClick={handleExpand} disabled={expandingWait} className="workspace-primary-btn flex-1 text-xs disabled:opacity-70">{expandingWait ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListPlus className="w-4 h-4" />} Create sequence</button>
                          <button onClick={() => setIsExpanding(false)} className="workspace-tertiary-btn px-4 py-2 text-xs">Cancel</button>
                       </div>
                    </div>
                    ) : (
                <textarea autoFocus spellCheck={spellcheckPreference.enabled} lang={spellcheckPreference.enabled ? spellcheckPreference.language : undefined} className="w-full bg-white/90 dark:bg-surface-900 border border-slate-200/90 dark:border-slate-600 rounded-app p-3 text-sm min-h-[88px] leading-5 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" value={plainDescription} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Describe the work item..." />
                    )}
                    {aiRateResult && <div className="rounded-app border border-primary-200 bg-primary-50 p-3 text-xs text-slate-700 dark:border-primary-800 dark:bg-primary-950/25 dark:text-slate-200"><div className="font-semibold">Rate assessment: {formatCurrency(aiRateResult.rate)} per {formData.unit}</div><div className="mt-1 text-slate-600 dark:text-slate-300">Choose how you want to carry it into the bill.</div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={applyAllInclusiveRate} className="workspace-primary-btn px-3 py-2 text-xs">Use direct rate</button><button type="button" onClick={() => void createLpmsBuildUp()} disabled={isRateLoading} className="workspace-secondary-btn px-3 py-2 text-xs disabled:opacity-60">Create LPMS build-up</button><button type="button" onClick={() => setAiRateResult(null)} className="workspace-tertiary-btn px-2 py-2 text-xs">Discard</button></div></div>}
                  {smartSuggestion && (
                     <div onClick={applySmartSuggestion} className="absolute bottom-2 right-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 px-3 py-1.5 rounded-app-sm flex items-center gap-2 text-xs font-medium cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-700">
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>{smartSuggestion.suggestedUnit && `Use ${smartSuggestion.suggestedUnit}`} {smartSuggestion.height && `(H=${smartSuggestion.height}m)`}</span>
                     </div>
                  )}
                  {aiSuggestions.length > 0 && <div className="absolute top-full left-0 right-0 bg-surface dark:bg-surface-800 shadow-app-lg rounded-app border border-slate-200 dark:border-slate-700 z-50 overflow-hidden mt-1">{aiSuggestions.map((s, i) => <button key={i} onClick={() => onSuggestionSelect(s)} className="w-full text-left px-4 py-3 hover:bg-surface-muted dark:hover:bg-surface-800 border-b border-slate-200 dark:border-slate-700 last:border-0 text-xs font-medium text-slate-700 dark:text-slate-200">{s.description}</button>)}</div>}
                </div>

                {isPriced && (
                  <div className={`grid ${isLibraryMode ? 'grid-cols-1' : 'grid-cols-3'} gap-2`}>
                    {!isLibraryMode && (
                      <div className="rounded-app-lg border border-slate-200/80 dark:border-slate-700 bg-white/88 dark:bg-surface-900/92 p-2.5">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Current total</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(safeMul(formData.quantity, formData.rate))}</div>
                      </div>
                    )}
                    <div className="rounded-app-lg border border-slate-200/80 dark:border-slate-700 bg-white/88 dark:bg-surface-900/92 p-2.5"><label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 mb-1 block">Unit</label><select className="w-full bg-surface dark:bg-surface-900 border border-slate-200 dark:border-slate-600 rounded-app-sm px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" value={normalizeUnit(formData.unit)} onChange={(e) => setFormData({...formData, unit: normalizeUnit(e.target.value)})}>{getEditableUnitOptions(formData.unit).map(u => <option key={u} value={u}>{normalizeUnit(u)}</option>)}</select></div>
                    {!isLibraryMode && (
                        <div className="rounded-app-lg border border-slate-200/80 dark:border-slate-700 bg-white/88 dark:bg-surface-900/92 p-2.5">
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Rate (GBP)</label>
                            <span className="rounded-full border border-slate-200/80 bg-surface-muted/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:border-slate-700 dark:bg-surface-800 dark:text-slate-400">
                              AI-ready
                            </span>
                          </div>
                          <input type="number" step="0.01" disabled={formData.rateBuildUp?.mode === 'DERIVED'} className="w-full bg-surface dark:bg-surface-900 border border-slate-200 dark:border-slate-600 rounded-app-sm px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:disabled:bg-surface-800" value={formData.rate} onChange={(e) => setFormData({...formData, rate: parseFloat(e.target.value) || 0})} />
                          {config.item?.liveRateEvidence && formData.rate === config.item.rate && (
                            <div className="mt-2 text-[11px] leading-5 text-slate-600 dark:text-slate-300">
                              <div className="font-semibold">Live rate evidence · {new Date(config.item.liveRateEvidence.assessedAt).toLocaleDateString('en-GB')}</div>
                              <div>{config.item.liveRateEvidence.rationale}</div>
                              <div className="flex flex-wrap gap-x-2">
                                {config.item.liveRateEvidence.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="text-emerald-700 underline dark:text-emerald-300">{source.title}</a>)}
                              </div>
                            </div>
                          )}
                          {aiRateRationale && (
                            <div className="mt-3 rounded-app border border-primary-100/80 bg-primary-50/70 px-3 py-3 dark:border-primary-900/60 dark:bg-primary-950/20">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-700 dark:text-primary-300">
                                AI rate assumptions
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {aiRateInputs.map((input) => (
                                  <span key={input} className="rounded-full border border-primary-200/70 bg-white/80 px-2.5 py-1 text-[10px] font-medium text-primary-700 dark:border-primary-800/70 dark:bg-surface-900/70 dark:text-primary-300">
                                    {input}
                                  </span>
                                ))}
                              </div>
                              <div className="mt-3 text-[11px] leading-5 text-slate-600 dark:text-slate-300">
                                {aiRateRationale}
                              </div>
                            </div>
                          )}
                        </div>
                    )}
                  </div>
                )}
                {isPriced && <RateBuildUpPanel formData={formData} setFormData={setFormData} />}
             </div>
           )}

           {activeTab === 'dimensions' && (
             <div className="space-y-4 animate-in fade-in h-full flex flex-col" onPaste={handleAiMeasurePaste}>
               <div className="flex justify-between items-center shrink-0">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Dimensions</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => toggleAiLock('measurements')} className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${formData.aiLocks.measurements ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300'}`}>
                      {formData.aiLocks.measurements ? 'Measurements locked' : 'Lock measurements'}
                    </button>
                    <button onClick={startAiMeasure} className="workspace-secondary-btn px-3 py-1.5 text-xs" disabled={isAiMeasureLoading || formData.aiLocks.measurements} title="Measure this selected item from drawings or answers">
                      {isAiMeasureLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ruler className="w-3.5 h-3.5" />}
                      AI measure item
                    </button>
                    <button onClick={addDimensionRow} className="bg-surface-muted dark:bg-surface-800 text-slate-700 dark:text-slate-200 hover:bg-surface-200 dark:hover:bg-surface-900 px-3 py-1.5 rounded-app-sm text-xs font-medium transition-colors" title="Shortcut: Alt + Plus">+ Row</button>
                  </div>
               </div>

               <div className="rounded-app border border-slate-200/80 bg-surface-muted/50 px-3 py-3 text-[11px] leading-5 text-slate-600 dark:border-slate-700 dark:bg-surface-800/70 dark:text-slate-300 shrink-0">
                 <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                   AI preflight
                 </div>
                 <div className="mt-2 grid gap-2 md:grid-cols-2">
                   <div className="rounded-app-sm border border-slate-200/70 bg-white/80 px-3 py-2 dark:border-slate-700 dark:bg-surface-900/80">
                     <div className="font-semibold text-slate-700 dark:text-slate-200">AI measure</div>
                     <div className="mt-1">Uses {aiMeasureUses.join(' • ')}.</div>
                     <div className="mt-1 text-slate-500 dark:text-slate-400">It updates the measurement grid and recalculates quantity in this draft only. Review before saving.</div>
                   </div>
                   <div className="rounded-app-sm border border-slate-200/70 bg-white/80 px-3 py-2 dark:border-slate-700 dark:bg-surface-900/80">
                     <div className="font-semibold text-slate-700 dark:text-slate-200">Locks and review</div>
                     <div className="mt-1">Locked measurements block overwrite. Uploaded drawings stay in this AI measure session only.</div>
                     <div className="mt-1 text-slate-500 dark:text-slate-400">Close the panel to stop, or apply the measured rows and continue editing before Save.</div>
                   </div>
                 </div>
               </div>

               {isAiMeasureOpen && (
                 <div className="rounded-app-lg border border-slate-200/80 dark:border-slate-700 bg-surface dark:bg-surface-900 shadow-card p-4 space-y-4 shrink-0">
                  {formData.aiLocks.measurements && (
                    <div className="rounded-app border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/70 dark:bg-amber-900/20 dark:text-amber-200">
                      Measurements are currently locked, so AI can review the basis but will not overwrite the dimension grid until you unlock them.
                    </div>
                  )}
                   <div className="flex items-start justify-between gap-4">
                     <div>
                       <div className="workspace-chip">
                         <Ruler className="w-3 h-3" />
                         AI measure
                       </div>
                       <h4 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">One measurement at a time</h4>
                       <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                         The AI will ask for one exact missing size or drawing input at a time until it has enough to calculate the quantity.
                       </p>
                     </div>
                     <button type="button" onClick={() => setIsAiMeasureOpen(false)} className="workspace-tertiary-btn px-0 py-0 text-xs">
                       Close
                     </button>
                   </div>

                   {aiMeasureQuestion && (
                     <div className="rounded-app border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                       {aiMeasureQuestion}
                     </div>
                   )}

                   {aiMeasureSummary && (
                     <div className="rounded-app border border-slate-200/80 bg-surface-muted/50 px-4 py-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-surface-800/70 dark:text-slate-300">
                       {aiMeasureSummary}
                     </div>
                   )}

                   {(aiMeasureBasis.length > 0 || aiMeasureQuestion) && (
                     <div className="rounded-app border border-primary-100/80 bg-primary-50/60 px-4 py-3 dark:border-primary-900/60 dark:bg-primary-950/20">
                       <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-700 dark:text-primary-300">
                         AI measurement basis
                       </div>
                       {aiMeasureBasis.length > 0 && (
                         <div className="mt-2 flex flex-wrap gap-1.5">
                           {aiMeasureBasis.map((basis) => (
                             <span key={basis} className="rounded-full border border-primary-200/70 bg-white/80 px-2.5 py-1 text-[10px] font-medium text-primary-700 dark:border-primary-800/70 dark:bg-surface-900/70 dark:text-primary-300">
                               {basis}
                             </span>
                           ))}
                         </div>
                       )}
                       <p className="mt-3 text-[11px] leading-5 text-slate-600 dark:text-slate-300">
                         {aiMeasureQuestion
                           ? 'The AI is still gathering one exact missing input before it finalises the quantity.'
                           : 'The current measured rows were created from the drawings and answers gathered in this AI measure session.'}
                       </p>
                     </div>
                   )}

                   <div className="space-y-2">
                     <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Measurement drawings</label>
                     <div className="flex flex-wrap items-center gap-2">
                       <label className="workspace-secondary-btn cursor-pointer px-3 py-2 text-xs">
                         <Paperclip className="w-3.5 h-3.5" />
                         Upload drawings
                         <input type="file" multiple className="hidden" onChange={handleAiMeasureUpload} accept="image/*,.pdf,.txt,.csv" />
                       </label>
                       <span className="text-[11px] text-slate-400 dark:text-slate-500">Ctrl+V to paste</span>
                       {aiMeasureFiles.length > 0 && (
                         <div className="flex flex-wrap gap-1.5">
                           {aiMeasureFiles.map((file, index) => (
                             <span key={`${file.name}-${index}`} className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                               {file.name}
                             </span>
                           ))}
                         </div>
                       )}
                     </div>
                   </div>

                   <div className="space-y-2">
                     <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Answer the current question</label>
                     <div className="flex flex-col gap-3 md:flex-row">
                       <input
                         type="text"
                         value={aiMeasureAnswer}
                         onChange={(e) => setAiMeasureAnswer(e.target.value)}
                         onKeyDown={(e) => {
                           if (e.key === 'Enter') {
                             e.preventDefault();
                             runAiMeasure();
                           }
                         }}
                         placeholder="e.g. trench run 18m"
                         className="workspace-input flex-1 text-sm"
                       />
                       <button type="button" onClick={() => runAiMeasure()} disabled={isAiMeasureLoading} className="workspace-primary-btn min-w-[150px] text-xs disabled:opacity-70">
                         {isAiMeasureLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                         Next step
                       </button>
                     </div>
                   </div>
                 </div>
               )}

               <div
                 className="bg-surface-muted dark:bg-surface-800 rounded-app border border-slate-200 dark:border-slate-700 overflow-hidden flex-1 flex flex-col"
                 onContextMenu={(event) => {
                   if ((event.target as HTMLElement).closest('input, button, textarea')) return;
                   event.preventDefault();
                   addDimensionRow();
                 }}
                 title="Right-click blank measurement space to add a row"
               >
                  <div className="overflow-y-auto flex-1">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-surface dark:bg-surface-900 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 w-14 text-center border-r border-slate-200 dark:border-slate-700">Ded</th>
                          <th className="py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 w-20 text-center border-r border-slate-200 dark:border-slate-700">Times</th>
                          <th className="py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 w-24 text-center border-r border-slate-200 dark:border-slate-700">Dim 1 (L)</th>
                          {(formData.unit === UnitType.M2 || formData.unit === UnitType.M3) && (
                             <th className="py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 w-24 text-center border-r border-slate-200 dark:border-slate-700">Dim 2 (W)</th>
                          )}
                          {formData.unit === UnitType.M3 && (
                             <th className="py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 w-24 text-center border-r border-slate-200 dark:border-slate-700">Dim 3 (H)</th>
                          )}
                          <th className="py-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">Notes</th>
                          <th className="py-2 px-2 w-10 border-b border-slate-200 dark:border-slate-700"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {(formData.dimensionRows || []).map((r, idx) => {
                          const isM2 = formData.unit === UnitType.M2;
                          const isM3 = formData.unit === UnitType.M3;

                          return (
                            <tr key={r.id} data-measurement-row="true" className={`group transition-colors ${r.isDeduction ? 'bg-red-50/50 dark:bg-red-950/20' : 'hover:bg-slate-50 dark:hover:bg-surface-900/80'}`}>
                              <td className="p-0 border-r border-slate-100 text-center">
                                <button type="button" tabIndex={-1} aria-label={r.isDeduction ? 'Remove deduction' : 'Mark as deduction'} onClick={() => toggleDeduction(r.id)} className="w-full h-full py-3 flex items-center justify-center">
                                  {r.isDeduction ? <MinusCircle className="w-4 h-4 text-red-500" /> : <PlusCircle className="w-4 h-4 text-slate-300 group-hover:text-emerald-400" />}
                                </button>
                              </td>
                              <td className="p-0 border-r border-slate-100">
                                <input
                                  type="number" data-measurement-times="true"
                                  className={`w-full h-full py-3 px-2 text-center font-mono font-bold bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-slate-100 focus:text-slate-900 dark:focus:bg-surface-800 dark:focus:text-slate-100 ${r.isDeduction ? 'text-red-700 dark:text-red-300' : 'text-slate-700 dark:text-slate-200'}`}
                                  value={r.multiplier || ''}
                                  placeholder="0"
                                  onChange={(e) => updateDim(r.id, 'multiplier', parseFloat(e.target.value) || 0)}
                                />
                              </td>
                              <td className="p-0 border-r border-slate-100">
                                <input
                                  type="number" step="0.01"
                                  className="w-full h-full py-3 px-2 text-center font-mono text-slate-600 dark:text-slate-300 bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-slate-100 focus:text-slate-900 dark:focus:bg-surface-800 dark:focus:text-slate-100"
                                  value={r.length || ''}
                                  placeholder={(0).toFixed(quantityDecimals)}
                                  onChange={(e) => updateDim(r.id, 'length', parseFloat(e.target.value) || 0)}
                                />
                              </td>

                              {(isM2 || isM3) && (
                                <td className="p-0 border-r border-slate-100">
                                  <input
                                    type="number" step="0.01"
                                    className="w-full h-full py-3 px-2 text-center font-mono text-slate-600 dark:text-slate-300 bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-slate-100 focus:text-slate-900 dark:focus:bg-surface-800 dark:focus:text-slate-100"
                                    value={r.height || ''}
                                    placeholder={(0).toFixed(quantityDecimals)}
                                    onChange={(e) => updateDim(r.id, 'height', parseFloat(e.target.value) || 0)}
                                  />
                                </td>
                              )}

                              {isM3 && (
                                <td className="p-0 border-r border-slate-100">
                                  <input
                                    type="number" step="0.01"
                                    className="w-full h-full py-3 px-2 text-center font-mono text-slate-600 dark:text-slate-300 bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-slate-100 focus:text-slate-900 dark:focus:bg-surface-800 dark:focus:text-slate-100"
                                    value={r.width || ''}
                                    placeholder={(0).toFixed(quantityDecimals)}
                                    onChange={(e) => updateDim(r.id, 'width', parseFloat(e.target.value) || 0)}
                                  />
                                </td>
                              )}

                              <td className="p-0 relative">
                                <input
                                  type="text"
                                  className="w-full h-full py-3 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 bg-transparent outline-none focus:bg-amber-50 focus:text-slate-800 dark:focus:bg-amber-950/20 dark:focus:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-500"
                                  value={r.comment || ''}
                                  placeholder="Location / Ref..."
                                  onChange={(e) => updateDim(r.id, 'comment', e.target.value)}
                                  onKeyDown={(e) => handleDimKeyDown(e, idx)}
                                />
                              </td>
                              <td className="p-0 text-center">
                                <button type="button" tabIndex={-1} aria-label="Delete measurement row" onClick={() => setFormData({...formData, dimensionRows: formData.dimensionRows.filter((dr) => dr.id !== r.id)})} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                              </td>
                            </tr>
                          );
                        })}
                        {(formData.dimensionRows || []).length === 0 && (
                          <tr>
                             <td colSpan={7} className="py-10 text-center text-xs font-medium text-slate-400 dark:text-slate-500 italic bg-surface dark:bg-surface-900">
                                No measurements. Use + or right-click here to add a row.
                             </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-surface dark:bg-surface-900 border-t border-slate-200 dark:border-slate-700 px-4 py-2 flex justify-between items-center text-xs font-medium text-slate-500 dark:text-slate-400">
                     <div className="flex items-center gap-3"><span>Rows: {(formData.dimensionRows || []).length}</span><button type="button" onClick={addDimensionRow} aria-label="Add measurement row" className="workspace-secondary-btn px-2 py-1 text-xs"><Plus className="h-3.5 w-3.5" />Add row</button></div>
                     <span className="tabular-nums">Qty: {formattedQuantity}</span>
                  </div>
               </div>
             </div>
           )}

           {activeTab === 'market' && (
             <div className="space-y-5 animate-in fade-in h-full overflow-y-auto">
               <div className="rounded-app-lg border border-slate-200/80 dark:border-slate-700 bg-surface dark:bg-surface-900 shadow-card p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="workspace-chip">
                        <ShoppingBag className="w-3 h-3" />
                        Research workspace
                      </div>
                      <h3 className="mt-3 text-base font-semibold text-slate-800 dark:text-slate-100">Market research</h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">AI-assisted product intelligence, pricing direction, and specification cues.</p>
                    </div>
                    {!isLoadingAnything && (
                      <div className="rounded-app border border-slate-200/80 dark:border-slate-700 bg-surface-muted/50 dark:bg-surface-800/60 px-3 py-2 text-right">
                        <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Products</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{productSuggestions.length}</div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 items-end">
                     <div className="flex-1">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 mb-2 block flex items-center gap-1.5"><Filter className="w-3 h-3"/> Requirements</label>
                        <input
                           type="text"
                           value={marketRequirements}
                           onChange={(e) => setMarketRequirements(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handleMarketResearch()}
                           placeholder="e.g. Bosch only, under GBP 50/m2..."
                           className="w-full bg-surface dark:bg-surface-900 border border-slate-200 dark:border-slate-600 rounded-app-sm px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                     </div>
                     <button onClick={handleMarketResearch} disabled={isLoadingAnything} className="workspace-secondary-btn h-[42px] shrink-0 text-xs disabled:opacity-70">
                        {isLoadingAnything ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Refresh research
                     </button>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Market summary</span>
                        {isAnalysisLoading && <Loader2 className="w-3 h-3 animate-spin text-primary-500" />}
                      </div>

                      {isAnalysisLoading ? (
                          <div className="bg-surface dark:bg-surface-900 rounded-app-lg border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center justify-center py-12 shadow-card">
                              <Loader2 className="w-6 h-6 animate-spin text-primary-400 mb-3" />
                              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Searching the market...</span>
                          </div>
                      ) : (
                          <div className="bg-surface dark:bg-surface-900 rounded-app-lg border border-slate-200 dark:border-slate-700 p-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed min-h-[180px] shadow-card">
                              {marketAnalysis ? formatAIResponse(marketAnalysis) : <span className="text-slate-400 dark:text-slate-500 italic">Run refresh to generate a market summary for this item.</span>}
                          </div>
                      )}
                  </div>

                  <div className="space-y-3">
                      <div className="flex items-center gap-2">
                         <ShoppingBag className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                         <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Product recommendations</span>
                         {isProductsLoading && <Loader2 className="w-3 h-3 animate-spin text-primary-500" />}
                      </div>

                      {isProductsLoading ? (
                         <div className="bg-surface dark:bg-surface-900 rounded-app-lg border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center justify-center py-12 shadow-card">
                             <Loader2 className="w-6 h-6 animate-spin text-primary-400 mb-3" />
                             <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Finding products...</span>
                         </div>
                      ) : (
                         <>
                           {productSuggestions.length > 0 ? (
                             <div className="space-y-3">
                                {productSuggestions.map((prod, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => applyProductSuggestion(prod)}
                                    disabled={isRefining}
                                    className="w-full text-left bg-surface dark:bg-surface-900 p-4 rounded-app-lg border border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-card-hover transition-all group relative disabled:opacity-70"
                                  >
                                     <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="inline-flex items-center gap-1 rounded-app-sm border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm dark:border-slate-700 dark:bg-surface-800 dark:text-slate-200">
                                          {isRefining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Apply
                                        </span>
                                     </div>
                                     <div className="pr-16">
                                       <div className="flex items-start justify-between gap-3">
                                          <h5 className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-6">{prod.name}</h5>
                                       </div>
                                       <div className="flex flex-wrap items-center gap-2 mt-2 mb-2">
                                           <span className="text-xs text-slate-500 dark:text-slate-400">{prod.manufacturer}</span>
                                           <span className="bg-surface-muted dark:bg-surface-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-full text-[11px] font-medium">{prod.priceIndication || 'POA'}</span>
                                       </div>
                                       <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-5">{prod.description}</p>
                                     </div>
                                  </button>
                                ))}
                             </div>
                           ) : (
                             <div className="bg-surface dark:bg-surface-900 rounded-app-lg p-8 text-center border border-slate-200 dark:border-slate-700 shadow-card">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">No recommendations yet</div>
                                <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">Run refresh to surface product suggestions for this description.</div>
                             </div>
                           )}
                         </>
                      )}
                  </div>
               </div>
             </div>
           )}
        </div>
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center bg-surface-muted dark:bg-surface-800 shrink-0">
          {!isLibraryMode ? (
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 tabular-nums">Total: {formatCurrency(safeMul(formData.quantity, formData.rate))}</div>
          ) : (
             <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Library item</span>
          )}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 hidden lg:inline">Ctrl+S to save</span>
            <button onClick={onSave} className="workspace-primary-btn px-5 py-2 text-xs" title="Save (Ctrl+S)">
                {isLibraryMode ? 'Save standard' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
