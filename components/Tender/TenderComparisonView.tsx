
import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowDownToLine,
  ArrowRightLeft,
  BadgePercent,
  FileSpreadsheet,
  Layers3,
  MoreHorizontal,
  Plug,
  ShieldCheck,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { ContextMenu, shouldUseNativeContextMenu } from '../UI/ContextMenu';
import type { ContextMenuEntry, ContextMenuState } from '../UI/ContextMenu';
import { Project, TradePackage, BoQItem, Contractor, TenderApplySummary, TenderAwardRecord, TenderResponseState } from '../../types';
import { formatCurrency, getContractorStyle } from '../../utils/formatting';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useToast } from '../../contexts/ToastContext';
import { feedbackError, feedbackSuccess } from '../../utils/feedback';
import { getBillQuantityMultiplier } from '../../utils/calculations';
import { looksLikeRichText, sanitizeRichTextHtml, stripRichText } from '../../utils/richText';
import { useSpellcheckPreference } from '../../hooks/useSpellcheckPreference';
import { useHelpContext } from '../../hooks/useHelpContext';
import { useAppContextOptional } from '../../contexts/AppContext';
import { HelpButton } from '../Help/HelpButton';
import { TenderDetailedSummaryPanel } from './TenderDetailedSummaryPanel';
import { TenderEmptyTeamPanel } from './TenderEmptyTeamPanel';
import { TenderCommandBar } from './TenderCommandBar';
import { TenderWorkflowHeader } from './TenderWorkflowHeader';
import { TenderWorkflowStageCards } from './TenderWorkflowStageCards';
import { buildTenderWorkflowStages, type TenderWorkflowStageId } from '../../utils/tenderWorkflow';

type TenderDiscountType = 'PERCENT' | 'FIXED';

function getTenderItemLabel(item: BoQItem) {
  const reference = item.reference?.trim();
  const description = stripRichText(item.description)?.trim() || 'item';

  return reference ? `${reference} ${description}` : description;
}

function renderTenderDescription(description: string | undefined) {
  const value = description || '';
  if (!looksLikeRichText(value)) {
    return <span>{value}</span>;
  }

  return <span className="rich-text-content" dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(value) }} />;
}

async function loadTenderExcelExports() {
  return import('../../utils/excelExport');
}

async function loadTenderPdfExports() {
  return import('../../utils/pdfExport');
}

function getDerivedResponseState(
  invitedContractorCount: number,
  contractorReturnCount: number,
  winnerSelected: boolean
): TenderResponseState {
  if (winnerSelected) return 'WINNER_SELECTED';
  if (contractorReturnCount > 0 && invitedContractorCount > 0 && contractorReturnCount >= invitedContractorCount) return 'RETURNS_RECEIVED';
  if (contractorReturnCount > 0) return 'PARTIAL_RETURNS';
  if (invitedContractorCount > 0) return 'ISSUED';
  return 'NOT_ISSUED';
}

function formatMoneyInputValue(value: number | undefined | null) {
  return value && value > 0 ? value.toFixed(2) : '';
}

function isTenderStatusSource(source: string | undefined) {
  return source === 'INCLUDED' || source === 'EXCLUDED';
}

function getTenderDiscountAmount(grossTotal: number, discountType: TenderDiscountType, discountValue: number) {
  if (grossTotal <= 0 || discountValue <= 0) return 0;
  if (discountType === 'PERCENT') {
    return Math.min(grossTotal, grossTotal * (discountValue / 100));
  }
  return Math.min(grossTotal, discountValue);
}

function getTenderContextLevel(item: BoQItem) {
  switch (item.type) {
    case 'GENERAL_HEADING':
      return 1;
    case 'MAJOR_HEADING':
      return 2;
    case 'SUB_SECTION':
      return 3;
    case 'MINOR_HEADING':
      return 4;
    case 'COMMENT':
      return 5;
    case 'SUB_COMMENT':
      return 6;
    default:
      return 0;
  }
}

function filterTenderContextRows(items: BoQItem[], selectedTradeId: string) {
  if (!selectedTradeId) return items;

  const keepIds = new Set<string>();
  const contextStack: Array<{ id: string; level: number }> = [];

  items.forEach((item) => {
    const contextLevel = getTenderContextLevel(item);
    if (contextLevel > 0) {
      while (contextStack.length > 0 && contextStack[contextStack.length - 1].level >= contextLevel) {
        contextStack.pop();
      }
      contextStack.push({ id: item.id, level: contextLevel });
      return;
    }

    if (item.type === 'PRICED' && item.tradePackageId === selectedTradeId) {
      contextStack.forEach((context) => keepIds.add(context.id));
      keepIds.add(item.id);
    }
  });

  return items.filter((item) => keepIds.has(item.id));
}

function MoneyInput({
  id,
  value,
  ariaLabel,
  ariaDescribedBy,
  className,
  placeholder = '0.00',
  onCommit,
  onKeyDown,
}: {
  id?: string;
  value: number;
  ariaLabel: string;
  ariaDescribedBy?: string;
  className: string;
  placeholder?: string;
  onCommit: (value: number) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const [draft, setDraft] = useState(formatMoneyInputValue(value));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraft(formatMoneyInputValue(value));
    }
  }, [isEditing, value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      onCommit(0);
      setDraft('');
      setIsEditing(false);
      return;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setDraft(formatMoneyInputValue(value));
      setIsEditing(false);
      return;
    }

    const normalised = Number(parsed.toFixed(2));
    onCommit(normalised);
    setDraft(normalised.toFixed(2));
    setIsEditing(false);
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className={className}
      value={draft}
      placeholder={placeholder}
      onChange={(event) => {
        const next = event.target.value.replace(/,/g, '.');
        if (/^\d*(\.\d{0,2})?$/.test(next)) {
          setDraft(next);
        }
      }}
      onFocus={(event) => {
        setIsEditing(true);
        event.currentTarget.select();
      }}
      onBlur={commit}
      onWheel={(event) => event.currentTarget.blur()}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          setDraft(formatMoneyInputValue(value));
          setIsEditing(false);
          event.currentTarget.blur();
        }
      }}
    />
  );
}

export const TenderComparisonView = ({
  project,
  trades,
  onClose,
  onUpdateRates,
  onUpdateTenderData,
  onSetWinner,
  onUpdateTenderAward,
  onRecordTenderBillApply,
  onUpdateTenderContractors,
  onUpdateTenderTradeStatus,
  embedded = false,
}: {
  project: Project;
  trades: TradePackage[];
  onClose: () => void;
  onUpdateRates: (items: { id: string; rate: number; rateSource: string }[]) => void;
  onUpdateTenderData: (data: any, attributes: any) => void;
  onSetWinner: (tradeId: string, winnerId: string, awardDetails?: { contractorName?: string; selectedAt?: string; sourceTenderPackageName?: string }) => void;
  onUpdateTenderAward: (tradeId: string, updates: Partial<TenderAwardRecord>) => void;
  onRecordTenderBillApply: (tradeId: string, summary: TenderApplySummary) => void;
  onUpdateTenderContractors: (tradeId: string, contractorIds: string[]) => void;
  onUpdateTenderTradeStatus: (tradeId: string, updates: { dueDate?: string; budgetValue?: number; mainContractorDiscountType?: TenderDiscountType; mainContractorDiscountValue?: number; contractorSubmissionComments?: Record<string, string>; lastReturnReceivedAt?: string; responseState?: TenderResponseState; winnerRationale?: string }) => void;
  embedded?: boolean;
}) => {
  const { preference: spellcheckPreference } = useSpellcheckPreference();
  const { askConfirm } = useConfirm();
  const { showToast } = useToast();
  const app = useAppContextOptional();
  useHelpContext('TENDER_ANALYSIS');
  const [selectedTradeId, setSelectedTradeId] = useState<string>(trades[0]?.id || '');
  const [comparisonMode, setComparisonMode] = useState<'DETAILED' | 'OVERVIEW'>('DETAILED');
  const [valueMode, setValueMode] = useState<'RATE' | 'VALUE'>('RATE');
  const [negotiationBaseId, setNegotiationBaseId] = useState<string>('');
  const [negotiationCompareId, setNegotiationCompareId] = useState<string>('');
  const [negotiationMode, setNegotiationMode] = useState<'SPECIFIC' | 'CHEAPEST_ALL'>('SPECIFIC');
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const [preferredContractorId, setPreferredContractorId] = useState<string>('');
  const [isCreatingApprovalForm, setIsCreatingApprovalForm] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [flashedActionId, setFlashedActionId] = useState<string | null>(null);
  const signedApprovalInputRef = React.useRef<HTMLInputElement | null>(null);
  const actionFlashTimerRef = React.useRef<number | null>(null);

  const flashTenderAction = React.useCallback((actionId: string) => {
    setFlashedActionId(actionId);
    if (actionFlashTimerRef.current !== null) {
      window.clearTimeout(actionFlashTimerRef.current);
    }
    actionFlashTimerRef.current = window.setTimeout(() => {
      setFlashedActionId(null);
      actionFlashTimerRef.current = null;
    }, 900);
  }, []);

  useEffect(() => () => {
    if (actionFlashTimerRef.current !== null) {
      window.clearTimeout(actionFlashTimerRef.current);
    }
  }, []);

  const getTenderActionFeedbackClass = React.useCallback((actionId: string) => (
    flashedActionId === actionId
      ? 'scale-[1.03] ring-2 ring-emerald-400 ring-offset-2 ring-offset-white dark:ring-emerald-500 dark:ring-offset-surface-900'
      : 'active:scale-[0.97]'
  ), [flashedActionId]);

  const openContextMenu = (event: React.MouseEvent<HTMLElement>, label: string, items: ContextMenuEntry[]) => {
    if (shouldUseNativeContextMenu(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, label, items });
  };

  const selectedTrade = trades.find(t => t.id === selectedTradeId);
  const selectedTradeStatus = selectedTradeId ? project.tenderTradeStatus?.[selectedTradeId] : undefined;
  const selectedTenderAward = selectedTradeId ? project.tenderAwards?.[selectedTradeId] : undefined;
  const projectWinnerId = selectedTenderAward?.contractorId;
  const mainContractorDiscountType: TenderDiscountType = selectedTradeStatus?.mainContractorDiscountType || 'PERCENT';
  const mainContractorDiscountValue = selectedTradeStatus?.mainContractorDiscountValue || 0;
  const contractorSubmissionComments = selectedTradeStatus?.contractorSubmissionComments || {};
  // Only show contractors that have been added to this project's tender for this trade
  const contractors: Contractor[] = useMemo(() => {
    if (!selectedTrade) return [];
    const ids = project.tenderContractors?.[selectedTradeId];
    if (!ids || ids.length === 0) return [];
    return ids
      .map(id => selectedTrade.contractors.find(c => c.id === id))
      .filter((c): c is Contractor => c != null);
  }, [project.tenderContractors, selectedTradeId, selectedTrade]);
  const allTradeContractors = selectedTrade?.contractors || [];
  const availableToAdd = allTradeContractors.filter(c => !contractors.some(tc => tc.id === c.id));

  const displayItems = useMemo(() => {
    const items: Array<{
      item: BoQItem;
      isRelevant: boolean;
      quantityMultiplier: number;
      effectiveQuantity: number;
      billName?: string;
    }> = [];
    project.bills.forEach(bill => {
      const quantityMultiplier = getBillQuantityMultiplier(bill);
      const billRows: typeof items = [];
      bill.sections.forEach(section => {
        const sectionItems = section.pages && section.pages.length > 0
          ? section.pages.flatMap(page => page.items || [])
          : section.items;
        const filteredSectionItems = filterTenderContextRows(sectionItems, selectedTradeId);
        const hasTenderRows = filteredSectionItems.some((item) => item.type === 'PRICED' && (!selectedTradeId || item.tradePackageId === selectedTradeId));
        if (!hasTenderRows) return;

        billRows.push({
          item: { id: `sect-${section.id}`, type: 'MAJOR_HEADING', description: section.name, unit: '', quantity: 0, rate: 0, total: 0, reference: '' } as BoQItem,
          isRelevant: true,
          quantityMultiplier,
          effectiveQuantity: 0,
          billName: bill.name,
        });
        filteredSectionItems.forEach(i => {
          const isRelevant = i.type === 'PRICED';
          billRows.push({
            item: i,
            isRelevant,
            quantityMultiplier,
            effectiveQuantity: i.quantity * quantityMultiplier,
            billName: bill.name,
          });
        });
      });
      if (billRows.length > 0) {
        items.push({
          item: { id: `bill-${bill.id}`, type: 'GENERAL_HEADING', description: bill.name, unit: '', quantity: 0, rate: 0, total: 0, reference: '' } as BoQItem,
          isRelevant: true,
          quantityMultiplier,
          effectiveQuantity: 0,
          billName: bill.name,
        });
        items.push(...billRows);
      }
    });
    return items;
  }, [project, selectedTradeId]);

  const tenderData = project.tenderData || {};
  const tenderAttributes = project.tenderAttributes || {};

  const handleRateChange = (itemId: string, contractorId: string, rate: number, isPlugged = false, source = '') => {
    const newData = { ...tenderData };
    if (!newData[itemId]) newData[itemId] = {};
    newData[itemId][contractorId] = rate;

    const newAttrs = { ...tenderAttributes };
    if (!newAttrs[itemId]) newAttrs[itemId] = {};
    newAttrs[itemId][contractorId] = { isPlugged, source };

    onUpdateTenderData(newData, newAttrs);
    if (selectedTradeId && contractorId !== 'QS_ESTIMATE' && (rate > 0 || isPlugged)) {
      const nextReturnCount = new Set(
        contractors
          .filter((contractor) =>
            selectedTradeItemIds.some((itemId) => {
              if (contractor.id === contractorId) return rate > 0 || isPlugged;
              const existingRate = newData[itemId]?.[contractor.id] || 0;
              const existingPlugged = Boolean(newAttrs[itemId]?.[contractor.id]?.isPlugged);
              return existingRate > 0 || existingPlugged;
            })
          )
          .map((contractor) => contractor.id)
      ).size;
      onUpdateTenderTradeStatus(selectedTradeId, {
        lastReturnReceivedAt: new Date().toISOString(),
        responseState: getDerivedResponseState(invitedContractorCount, nextReturnCount, Boolean(projectWinnerId)),
      });
    }
  };

  const analysis = useMemo(() => {
    const result = contractors.map(c => {
      let grossTotal = 0;
      let unpricedCount = 0;
      
      displayItems.forEach(({ item, isRelevant, effectiveQuantity }) => {
        if (item.type !== 'PRICED' || !isRelevant) return;
        const rate = tenderData[item.id]?.[c.id];
        // Check if actually priced (exists and > 0) OR plugged
        const isPlugged = tenderAttributes[item.id]?.[c.id]?.isPlugged;
        
        if ((rate === undefined || rate === 0) && !isPlugged) {
          unpricedCount++;
        }
        
        grossTotal += (effectiveQuantity * (rate || 0));
      });
      const discountAmount = getTenderDiscountAmount(grossTotal, mainContractorDiscountType, mainContractorDiscountValue);
      const total = Math.max(0, grossTotal - discountAmount);
      return { id: c.id, name: c.name, grossTotal, discountAmount, total, unpricedCount };
    });
    
    result.sort((a, b) => a.total - b.total);
    return result;
  }, [contractors, displayItems, tenderData, tenderAttributes, mainContractorDiscountType, mainContractorDiscountValue]);

  const pricedItems = useMemo(
    () => displayItems.filter(({ item, isRelevant }) => item.type === 'PRICED' && isRelevant),
    [displayItems]
  );
  const lowestTotal = analysis.length > 0 ? analysis[0].total : 0;
  const secondLowestTotal = analysis.length > 1 ? analysis[1].total : 0;
  const leaderGap = secondLowestTotal > lowestTotal ? secondLowestTotal - lowestTotal : 0;
  const completedTenderCount = analysis.filter(entry => entry.unpricedCount === 0).length;
  const pricedItemCount = pricedItems.length;
  const selectedTradeItemIds = pricedItems.map(({ item }) => item.id);
  const invitedContractorCount = contractors.length;
  const availableContractorCount = availableToAdd.length;
  const contractorReturnCount = contractors.filter(contractor =>
    selectedTradeItemIds.some(itemId => {
      const rate = tenderData[itemId]?.[contractor.id] || 0;
      const isPlugged = Boolean(tenderAttributes[itemId]?.[contractor.id]?.isPlugged);
      return rate > 0 || isPlugged;
    }),
  ).length;
  const pricedWithQsEstimateCount = pricedItems.filter(({ item }) => (tenderData[item.id]?.QS_ESTIMATE || 0) > 0).length;
  const selectedTradeHouseTypeSummaries = Array.from(
    new Map(
      pricedItems
        .filter(({ quantityMultiplier }) => quantityMultiplier > 1)
        .map(({ billName, quantityMultiplier }) => [billName || 'House type', quantityMultiplier])
    ).entries()
  );
  const winnerAnalysis = projectWinnerId ? analysis.find(entry => entry.id === projectWinnerId) : null;
  const winningCoverage = pricedItemCount > 0 && winnerAnalysis
    ? ((pricedItemCount - winnerAnalysis.unpricedCount) / pricedItemCount) * 100
    : 0;
  const tenderSetupState = !selectedTrade
    ? null
    : allTradeContractors.length === 0
      ? {
          label: 'No contractors in directory',
          detail: `The trade "${selectedTrade.name}" does not have any contractors in the Trade & Contractor Library yet.`,
          hint: 'Add contractors in the Trade & Contractor Library first, then return here to invite them into this tender.',
          tone: 'amber' as const,
        }
      : invitedContractorCount === 0
        ? {
            label: 'Invite your first contractor',
            detail: `This trade has ${allTradeContractors.length} available contractor${allTradeContractors.length === 1 ? '' : 's'}, but none have been added to this project's tender yet.`,
            hint: 'Use the tender team picker to invite the first contractor and begin collecting returns.',
            tone: 'primary' as const,
          }
        : contractorReturnCount === 0
          ? {
              label: 'Waiting for the first live return',
              detail: `${invitedContractorCount} contractor${invitedContractorCount === 1 ? '' : 's'} are in this tender, but no live rates have been entered yet.`,
              hint: 'Issue the blank tender workbook, then capture the first return to unlock comparison and winner selection.',
              tone: 'amber' as const,
            }
          : winnerAnalysis
            ? {
                label: 'Commercial review is active',
                detail: `Live returns are in and ${winnerAnalysis.name} is currently marked as winner for this trade.`,
                hint: 'Review the spread, then apply the agreed rates back into the live bill when you are ready.',
                tone: 'emerald' as const,
              }
            : {
                label: 'Ready for comparison',
                detail: `${contractorReturnCount} contractor${contractorReturnCount === 1 ? '' : 's'} have submitted live rates for this trade.`,
                hint: 'Review the overview or matrix, then choose the winning commercial position.',
                tone: 'primary' as const,
              };
  const readinessDetail = !selectedTrade
    ? 'Select a trade package to review its tender status.'
    : invitedContractorCount === 0
      ? 'Invite contractors into this tender before the comparison screen can begin.'
      : contractorReturnCount === 0
        ? 'Tender invites are set up, but no live contractor returns have been entered yet.'
        : winnerAnalysis
          ? 'A winner has been selected for this trade. Review coverage and push rates back into the live bill when ready.'
        : 'Live returns are in. Compare the commercial spread and select a winning position when you are comfortable.';
  const dueDateLabel = selectedTradeStatus?.dueDate
    ? new Date(`${selectedTradeStatus.dueDate}T00:00:00`).toLocaleDateString([], { dateStyle: 'medium' })
    : 'Not set';
  const budgetValue = selectedTradeStatus?.budgetValue || 0;
  const budgetLabel = budgetValue > 0 ? `GBP ${formatCurrency(budgetValue)}` : 'Not set';
  const discountLabel = mainContractorDiscountValue > 0
    ? mainContractorDiscountType === 'PERCENT'
      ? `${mainContractorDiscountValue.toFixed(2)}% main contractor discount`
      : `GBP ${formatCurrency(mainContractorDiscountValue)} fixed discount`
    : 'No discount';
  const lastReturnLabel = selectedTradeStatus?.lastReturnReceivedAt
    ? new Date(selectedTradeStatus.lastReturnReceivedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : 'No live return yet';
  const responseState = selectedTradeStatus?.responseState || getDerivedResponseState(invitedContractorCount, contractorReturnCount, Boolean(projectWinnerId));
  const responseStateOptions: Array<{ value: TenderResponseState; label: string }> = [
    { value: 'NOT_ISSUED', label: 'Not issued' },
    { value: 'ISSUED', label: 'Issued' },
    { value: 'PARTIAL_RETURNS', label: 'Partial returns' },
    { value: 'RETURNS_RECEIVED', label: 'Returns received' },
    { value: 'WINNER_SELECTED', label: 'Winner selected' },
  ];
  const isDetailedMatrixMode = comparisonMode === 'DETAILED';
  const displayTenderAward: TenderAwardRecord | undefined = useMemo(() => {
    if (selectedTenderAward) return selectedTenderAward;
    return undefined;
  }, [selectedTenderAward]);
  const selectedWinnerContractor = displayTenderAward
    ? contractors.find((entry) => entry.id === displayTenderAward.contractorId)
    : null;
  const approvalStatusLabel = displayTenderAward
    ? displayTenderAward.approvalStatus.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
    : 'No award record';
  const selectedCommercialSummary = displayTenderAward
    ? analysis.find((entry) => entry.id === displayTenderAward.contractorId)
    : null;
  const selectedCommercialTotal = selectedCommercialSummary?.total || 0;
  const selectedCommercialVariance = lowestTotal > 0 ? selectedCommercialTotal - lowestTotal : 0;
  const selectedCommercialVariancePct = lowestTotal > 0 ? (selectedCommercialVariance / lowestTotal) * 100 : 0;
  const selectedBudgetVariance = budgetValue > 0 ? selectedCommercialTotal - budgetValue : 0;
  const selectedBudgetVariancePct = budgetValue > 0 ? (selectedBudgetVariance / budgetValue) * 100 : 0;
  const approvalFormReady = Boolean(
    displayTenderAward?.preparedBy?.trim()
  );
  const approvalWatermark = !displayTenderAward
    ? ''
    : displayTenderAward.approvalStatus === 'REJECTED' && displayTenderAward.rejectionReason?.trim()
      ? 'Rejected'
      : displayTenderAward.approvedBy?.trim() && displayTenderAward.signedApproval && displayTenderAward.approvedAt
      ? 'Approved'
      : displayTenderAward.checkedBy?.trim()
        ? 'Director 1'
        : displayTenderAward.preparedBy?.trim()
          ? 'Prepared'
          : '';
  const decisionOutcome = displayTenderAward?.approvalStatus === 'REJECTED'
    ? 'REJECTED'
    : displayTenderAward?.approvalStatus === 'APPROVED'
      ? 'APPROVED'
      : 'IN_REVIEW';
  const missingReturnedRateCount = contractorReturnCount > 0
    ? analysis.reduce((count, contractor) => count + contractor.unpricedCount, 0)
    : pricedItemCount * Math.max(invitedContractorCount, 0);
  const latestApplySummary = displayTenderAward?.billApplyHistory?.[0] || null;
  const tenderWorkflowTabs = [
    {
      id: 'SETUP',
      label: 'Setup',
      detail: selectedTrade ? `${selectedTrade.name}` : 'Choose trade',
      complete: Boolean(selectedTrade && invitedContractorCount > 0),
      onSelect: () => setComparisonMode('OVERVIEW'),
    },
    {
      id: 'RETURNS',
      label: 'Returns',
      detail: contractorReturnCount > 0 ? `${contractorReturnCount}/${invitedContractorCount} live` : 'Awaiting rates',
      complete: contractorReturnCount > 0,
      onSelect: () => setComparisonMode('DETAILED'),
    },
    {
      id: 'COMPARISON',
      label: 'Comparison',
      detail: 'Detailed matrix',
      complete: contractorReturnCount > 0,
      onSelect: () => setComparisonMode('DETAILED'),
    },
    {
      id: 'AWARD',
      label: 'Award',
      detail: winnerAnalysis ? winnerAnalysis.name : 'No winner',
      complete: Boolean(winnerAnalysis),
      onSelect: () => setComparisonMode('OVERVIEW'),
    },
    {
      id: 'APPLY',
      label: 'Apply to bill',
      detail: latestApplySummary ? `${latestApplySummary.itemsUpdated} updated` : 'Not applied',
      complete: Boolean(latestApplySummary),
      onSelect: () => setComparisonMode('OVERVIEW'),
    },
    {
      id: 'EXPORT',
      label: 'Export',
      detail: displayTenderAward?.approvalWorkbookFileName ? 'Approval ready' : 'PDF issue',
      complete: Boolean(displayTenderAward?.approvalWorkbookFileName),
      onSelect: () => {
        setComparisonMode('OVERVIEW');
        showToast({ type: 'info', message: 'Use the Export menu in the tender command bar for tender workbooks, reports, and approval PDF issue.', duration: 3000 });
      },
    },
  ] as const;
  const activeTenderWorkflowTabId = !selectedTrade
    ? 'SETUP'
    : comparisonMode === 'DETAILED' && contractorReturnCount > 0
      ? 'COMPARISON'
      : contractorReturnCount === 0
        ? 'RETURNS'
        : !winnerAnalysis
          ? 'COMPARISON'
          : latestApplySummary
            ? 'APPLY'
            : 'AWARD';
  const tenderIssueChecklist = [
    {
      label: 'Trade selected',
      detail: selectedTrade?.name || 'Choose a trade package.',
      complete: Boolean(selectedTrade),
    },
    {
      label: 'Contractors invited',
      detail: invitedContractorCount > 0
        ? `${invitedContractorCount} contractor${invitedContractorCount === 1 ? '' : 's'} in this tender.`
        : allTradeContractors.length > 0
          ? 'Invite contractors from the trade library.'
          : 'No contractors exist in the trade library yet.',
      complete: invitedContractorCount > 0,
    },
    {
      label: 'Live returns captured',
      detail: contractorReturnCount > 0
        ? `${contractorReturnCount} live return${contractorReturnCount === 1 ? '' : 's'} captured.`
        : 'Enter contractor rates in the detailed matrix.',
      complete: contractorReturnCount > 0,
    },
    {
      label: 'Missing rates reviewed',
      detail: missingReturnedRateCount > 0
        ? `${missingReturnedRateCount.toLocaleString()} missing contractor rate${missingReturnedRateCount === 1 ? '' : 's'} across returned bids.`
        : 'No missing returned rates in scope.',
      complete: contractorReturnCount > 0 && missingReturnedRateCount === 0,
    },
    {
      label: 'Winner selected',
      detail: winnerAnalysis ? `${winnerAnalysis.name} is marked as winner.` : 'Select a preferred contractor before approval.',
      complete: Boolean(winnerAnalysis),
    },
    {
      label: 'Apply-back controlled',
      detail: latestApplySummary
        ? `${latestApplySummary.itemsUpdated} item${latestApplySummary.itemsUpdated === 1 ? '' : 's'} updated from the winning return.`
        : 'No winning rates have been applied back yet.',
      complete: Boolean(latestApplySummary),
    },
  ];
  const tenderWorkflowStages = useMemo(() => buildTenderWorkflowStages({
    selectedTradeName: selectedTrade?.name,
    invitedContractorCount,
    availableContractorCount,
    contractorReturnCount,
    pricedItemCount,
    missingReturnedRateCount,
    completedTenderCount,
    leaderName: analysis[0]?.name,
    leaderGap,
    winnerName: winnerAnalysis?.name || selectedWinnerContractor?.name || displayTenderAward?.contractorName,
    winnerCoveragePct: winningCoverage,
    latestApplyUpdatedCount: latestApplySummary?.itemsUpdated,
    approvalFileName: displayTenderAward?.approvalWorkbookFileName,
    budgetValue,
    selectedCommercialTotal,
  }), [
    selectedTrade?.name,
    invitedContractorCount,
    availableContractorCount,
    contractorReturnCount,
    pricedItemCount,
    missingReturnedRateCount,
    completedTenderCount,
    analysis,
    leaderGap,
    winnerAnalysis?.name,
    selectedWinnerContractor?.name,
    displayTenderAward?.contractorName,
    displayTenderAward?.approvalWorkbookFileName,
    winningCoverage,
    latestApplySummary?.itemsUpdated,
    budgetValue,
    selectedCommercialTotal,
  ]);
  const activeTenderWorkflowStageId = activeTenderWorkflowTabId as TenderWorkflowStageId;
  const handleSelectTenderWorkflowStage = (stageId: TenderWorkflowStageId) => {
    switch (stageId) {
      case 'RETURNS':
      case 'COMPARISON':
        setComparisonMode('DETAILED');
        return;
      case 'EXPORT':
        setComparisonMode('OVERVIEW');
        showToast({ type: 'info', message: 'Use the Exports group in the tender command bar for reports, blank tender sheets, and approval PDFs.', duration: 3000 });
        return;
      case 'SETUP':
      case 'AWARD':
      case 'APPLY':
      default:
        setComparisonMode('OVERVIEW');
    }
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    setPreferredContractorId(projectWinnerId || analysis[0]?.id || '');
  }, [projectWinnerId, analysis, selectedTradeId]);

  const handleKeyDown = (e: React.KeyboardEvent, itemId: string, contractorId: string, rowIndex: number) => {
    const key = e.key.toLowerCase();

    if (!e.altKey && !e.ctrlKey && !e.metaKey && (key === 'i' || key === 'e')) {
      e.preventDefault();
      handleRateChange(itemId, contractorId, 0, true, key === 'i' ? 'INCLUDED' : 'EXCLUDED');
      return;
    }
    
    if (e.altKey && ['l', 'h', 'a', 'p'].includes(key)) {
      e.preventDefault();
      
      const otherRates = contractors.map(c => tenderData[itemId]?.[c.id] || 0).filter(r => r > 0);
      const qsEstimate = tenderData[itemId]?.['QS_ESTIMATE'] || 0;

      let val = 0;
      let isPlugged = false;
      let source = '';

      if (key === 'l' && otherRates.length > 0) { val = Math.min(...otherRates); source = 'LOWEST'; }
      if (key === 'h' && otherRates.length > 0) { val = Math.max(...otherRates); source = 'HIGHEST'; }
      if (key === 'a' && otherRates.length > 0) { val = otherRates.reduce((a,b)=>a+b,0)/otherRates.length; source = 'AVERAGE'; }
      if (key === 'p') { val = qsEstimate; isPlugged = true; source = 'PLUGGED'; }

      if (val > 0 || isPlugged) {
         handleRateChange(itemId, contractorId, parseFloat(val.toFixed(2)), isPlugged, source);
      }
      return;
    }

    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      const direction = e.shiftKey ? -1 : 1;
      let nextIndex = rowIndex + direction;
      while (nextIndex >= 0 && nextIndex < displayItems.length) {
         if (displayItems[nextIndex].item.type === 'PRICED' && displayItems[nextIndex].isRelevant) {
            const el = document.getElementById(`input-${contractorId}-${displayItems[nextIndex].item.id}`);
            if (el) { (el as HTMLInputElement).focus(); (el as HTMLInputElement).select(); return; }
         }
         nextIndex += direction;
      }
    }
  };

  const handleNegotiatedKeyDown = (e: React.KeyboardEvent, rowIndex: number) => {
    if (e.key !== 'Tab' && e.key !== 'Enter') return;
    e.preventDefault();
    const direction = e.shiftKey ? -1 : 1;
    let nextIndex = rowIndex + direction;
    while (nextIndex >= 0 && nextIndex < displayItems.length) {
      if (displayItems[nextIndex].item.type === 'PRICED' && displayItems[nextIndex].isRelevant) {
        const el = document.getElementById(`input-NEGOTIATED-${displayItems[nextIndex].item.id}`);
        if (el) {
          (el as HTMLInputElement).focus();
          (el as HTMLInputElement).select();
          return;
        }
      }
      nextIndex += direction;
    }
  };

  const matrixKeyboardHintId = selectedTradeId ? `tender-matrix-help-${selectedTradeId}` : 'tender-matrix-help';

  const getApplyPreview = (mode: string) => {
    const contractor = contractors.find(c => c.id === mode);
    const sourceLabel = contractor
      ? contractor.name
      : mode === 'LOWEST'
        ? 'lowest tendered rates'
        : mode === 'AVERAGE'
          ? 'average tendered rates'
          : mode === 'QS_ESTIMATE'
            ? 'QS estimate rates'
            : 'selected source';

    let applicableCount = 0;
    let unavailableCount = 0;

    pricedItems.forEach(({ item }) => {
      const rates = contractors.map(c => tenderData[item.id]?.[c.id] || 0).filter(r => r > 0);
      let rate = 0;

      if (mode === 'LOWEST') rate = rates.length ? Math.min(...rates) : 0;
      else if (mode === 'HIGHEST') rate = rates.length ? Math.max(...rates) : 0;
      else if (mode === 'AVERAGE') rate = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
      else if (mode === 'QS_ESTIMATE') rate = tenderData[item.id]?.QS_ESTIMATE || 0;
      else rate = tenderData[item.id]?.[mode] || 0;

      if (rate > 0) applicableCount++;
      else unavailableCount++;
    });

    return {
      contractor,
      sourceLabel,
      applicableCount,
      unavailableCount,
      totalCount: pricedItemCount,
    };
  };

  const getChosenContractorApplySummary = (contractorId: string): TenderApplySummary | null => {
    if (!selectedTrade) return null;

    const updatedItemIds: string[] = [];
    const skippedItemIds: string[] = [];
    const noRateItemIds: string[] = [];

    pricedItems.forEach(({ item }) => {
      const contractorRate = tenderData[item.id]?.[contractorId] || 0;
      if (!contractorRate) {
        noRateItemIds.push(item.id);
        return;
      }

      if (Number(item.rate || 0).toFixed(2) === Number(contractorRate).toFixed(2)) {
        skippedItemIds.push(item.id);
        return;
      }

      updatedItemIds.push(item.id);
    });

    const contractor = contractors.find((entry) => entry.id === contractorId);

    return {
      appliedAt: new Date().toISOString(),
      contractorId,
      sourceTenderPackageId: selectedTrade.id,
      sourceTenderPackageName: selectedTrade.name,
      itemsUpdated: updatedItemIds.length,
      itemsSkipped: skippedItemIds.length,
      itemsWithNoContractorRate: noRateItemIds.length,
      updatedItemIds,
      skippedItemIds,
      noRateItemIds,
    };
  };

  const handleSelectWinner = async (contractorId: string) => {
    if (!selectedTrade) return;
    const contractor = contractors.find((entry) => entry.id === contractorId);
    if (!contractor) return;

    const contractorSummary = analysis.find((entry) => entry.id === contractorId);
    const ok = await askConfirm({
      title: 'Select winning contractor',
      message: `Set ${contractor.name} as the chosen contractor for ${selectedTrade.name}? This records the tender decision and unlocks approval actions, but does not change the live bill yet.${contractorSummary ? ` Current tender total: GBP ${formatCurrency(contractorSummary.total)}.` : ''}`,
      confirmLabel: 'Select winner',
      cancelLabel: 'Cancel',
    });
    if (!ok) return;

    onSetWinner(selectedTrade.id, contractorId, {
      contractorName: contractor.name,
      selectedAt: new Date().toISOString(),
      sourceTenderPackageName: selectedTrade.name,
    });
    showToast({
      type: 'success',
      message: `${contractor.name} is now the selected contractor for ${selectedTrade.name}.`,
      duration: 3500,
    });
  };

  const handleSubmissionCommentChange = (contractorId: string, value: string) => {
    if (!selectedTradeId) return;
    const trimmed = value.trim();
    const nextComments = { ...contractorSubmissionComments };
    if (trimmed) {
      nextComments[contractorId] = value;
    } else {
      delete nextComments[contractorId];
    }
    onUpdateTenderTradeStatus(selectedTradeId, {
      contractorSubmissionComments: nextComments,
    });
  };

  const handleCreateApprovalForm = async () => {
    if (!selectedTrade || !displayTenderAward) return;
    if (!approvalFormReady) {
      showToast({
        type: 'info',
        message: 'Enter Prepared by before creating the approval form.',
        duration: 4000,
      });
      return;
    }

    setIsCreatingApprovalForm(true);
    try {
      const { exportTenderApprovalPdf, saveTenderApprovalPdf } = await loadTenderPdfExports();
      const { blob, filename } = await exportTenderApprovalPdf(project, selectedTrade, displayTenderAward);
      const saved = await saveTenderApprovalPdf(blob, filename);
      if (!saved) {
        showToast({
          type: 'info',
          message: 'Tender approval PDF export was cancelled before saving.',
          duration: 3000,
        });
        return;
      }
      onUpdateTenderAward(selectedTrade.id, {
        approvalStatus: displayTenderAward.signedApproval ? 'SIGNED_APPROVAL_UPLOADED' : 'APPROVAL_FORM_CREATED',
        approvalFormCreatedAt: new Date().toISOString(),
        approvalWorkbookFileName: filename,
      });
      flashTenderAction('create-approval-form');
      showToast({
        type: 'success',
        message: `Created tender approval PDF for ${selectedTrade.name}.`,
        duration: 3500,
      });
    } catch (e) {
      showToast({ type: 'error', message: feedbackError(`Tender approval PDF for "${selectedTrade.name}"`, e, 'Please try the export again.') });
    } finally {
      setIsCreatingApprovalForm(false);
    }
  };

  const handleApplyChosenContractor = async () => {
    if (!selectedTrade || !displayTenderAward) return;
    const summary = getChosenContractorApplySummary(displayTenderAward.contractorId);
    if (!summary) return;

    if (summary.itemsUpdated === 0 && summary.itemsWithNoContractorRate === 0) {
      showToast({
        type: 'info',
        message: 'No live changes are waiting to be applied from the chosen contractor.',
        duration: 3500,
      });
      return;
    }

    const ok = await askConfirm({
      title: 'Apply chosen contractor to live bill',
      message: `${displayTenderAward.contractorName} will update ${summary.itemsUpdated} item${summary.itemsUpdated === 1 ? '' : 's'}, skip ${summary.itemsSkipped}, and leave ${summary.itemsWithNoContractorRate} item${summary.itemsWithNoContractorRate === 1 ? '' : 's'} unchanged because no contractor rate is available.`,
      confirmLabel: 'Apply winner',
      cancelLabel: 'Cancel',
    });
    if (!ok) return;

    const updates = pricedItems
      .map(({ item }) => {
        const rate = tenderData[item.id]?.[displayTenderAward.contractorId] || 0;
        if (!rate) return null;
        if (Number(item.rate || 0).toFixed(2) === Number(rate).toFixed(2)) return null;
        return { id: item.id, rate, rateSource: displayTenderAward.contractorId };
      })
      .filter((entry): entry is { id: string; rate: number; rateSource: string } => Boolean(entry));

    onUpdateRates(updates);
    onRecordTenderBillApply(selectedTrade.id, summary);
    showToast({
      type: 'success',
      message: `Applied ${displayTenderAward.contractorName} to ${summary.itemsUpdated} item${summary.itemsUpdated === 1 ? '' : 's'} in the active bill.`,
      duration: 3500,
    });
  };

  const handleSignedApprovalSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!displayTenderAward || !selectedTrade) return;
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const signatureDetection = /signed|approved|executed/i.test(file.name) ? 'DETECTED' : 'UNCERTAIN';
      onUpdateTenderAward(selectedTrade.id, {
        signedApproval: {
          fileName: file.name,
          uploadedAt: new Date().toISOString(),
          pdfDataUrl: typeof reader.result === 'string' ? reader.result : undefined,
          signatureDetection,
        },
        approvalStatus: 'SIGNED_APPROVAL_UPLOADED',
      });
      showToast({
        type: 'success',
        message: `Stored signed approval "${file.name}" against ${selectedTrade.name}.`,
        duration: 3500,
      });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleConfirmApproval = async () => {
    if (!selectedTrade || !displayTenderAward?.signedApproval) return;
    if (!displayTenderAward.approvedBy?.trim() || !displayTenderAward.approvedAt) {
      showToast({
        type: 'info',
        message: 'Enter Director approval 2 and the approval date before confirming approval.',
        duration: 4000,
      });
      return;
    }

    const ok = await askConfirm({
      title: 'Confirm tender approval',
      message: `Mark ${selectedTrade.name} as approved? This keeps the uploaded approval record in the tender file and marks the digital approval form as confirmed and approved.`,
      confirmLabel: 'Confirm approval',
      cancelLabel: 'Cancel',
    });
    if (!ok) return;

    onUpdateTenderAward(selectedTrade.id, {
      approvalStatus: 'APPROVED',
      signedApproval: {
        ...displayTenderAward.signedApproval,
        manuallyConfirmed: true,
      },
    });
    showToast({
      type: 'success',
      message: `${selectedTrade.name} is now marked as approved.`,
      duration: 3500,
    });
  };

  const handleRejectApproval = async () => {
    if (!selectedTrade || !displayTenderAward) return;
    if (!displayTenderAward.rejectionReason?.trim()) {
      showToast({
        type: 'info',
        message: 'Enter rejection comments before marking the approval as rejected.',
        duration: 4000,
      });
      return;
    }

    const ok = await askConfirm({
      title: 'Reject tender approval',
      message: `Mark ${selectedTrade.name} as rejected? This will keep the rejection comments in the tender record and show the approval form as rejected until it is reissued.`,
      confirmLabel: 'Reject approval',
      cancelLabel: 'Cancel',
    });
    if (!ok) return;

    onUpdateTenderAward(selectedTrade.id, {
      approvalStatus: 'REJECTED',
      rejectedAt: new Date().toISOString(),
      rejectedBy: displayTenderAward.checkedBy?.trim() || displayTenderAward.preparedBy?.trim() || undefined,
    });
    showToast({
      type: 'success',
      message: `${selectedTrade.name} is now marked as rejected.`,
      duration: 3500,
    });
  };

  const handleDecisionOutcomeChange = (value: 'IN_REVIEW' | 'APPROVED' | 'REJECTED') => {
    if (!selectedTrade || !displayTenderAward) return;
    if (value === 'REJECTED') {
      onUpdateTenderAward(selectedTrade.id, {
        approvalStatus: 'REJECTED',
      });
      return;
    }
    if (value === 'APPROVED') {
      onUpdateTenderAward(selectedTrade.id, {
        approvalStatus: displayTenderAward.signedApproval ? 'SIGNED_APPROVAL_UPLOADED' : 'APPROVAL_FORM_CREATED',
      });
      return;
    }
    onUpdateTenderAward(selectedTrade.id, {
      approvalStatus: displayTenderAward.signedApproval ? 'SIGNED_APPROVAL_UPLOADED' : 'APPROVAL_FORM_CREATED',
      rejectionReason: undefined,
      rejectedAt: undefined,
      rejectedBy: undefined,
    });
  };

  const applyBackGuidance = winnerAnalysis
    ? `Applying the winner will update only the ${pricedItemCount} priced item${pricedItemCount === 1 ? '' : 's'} in ${selectedTrade?.name || 'this trade'} inside the active bill. Items without a usable winning rate will stay unchanged.`
    : contractorReturnCount > 0
      ? `Apply-back writes only to the active bill and current trade scope. Choose a source once you are comfortable with the spread; items without a usable source rate will be left unchanged.`
      : `No apply-back should happen yet. Capture at least one live return or QS estimate first so there is a source rate to write back into the bill.`;

  const plugGapsWithEst = async () => {
     const ok = await askConfirm({
       title: 'Plug gaps with QS Estimate',
       message: 'This will fill all missing (0.00) rates with the QS Estimate value. Continue?',
       confirmLabel: 'Continue',
       cancelLabel: 'Cancel',
     });
     if (!ok) return;
     
     const newData = { ...tenderData };
     const newAttrs = { ...tenderAttributes };
     
     let pluggedCount = 0;
     contractors.forEach(c => {
        displayItems.forEach(({ item, isRelevant }) => {
           if (!isRelevant || item.type !== 'PRICED') return;
           
           const currentRate = newData[item.id]?.[c.id];
           const qsRate = newData[item.id]?.['QS_ESTIMATE'];
           
           // If rate is missing/zero and we have a QS estimate
           if ((!currentRate || currentRate === 0) && qsRate) {
              if (!newData[item.id]) newData[item.id] = {};
              newData[item.id][c.id] = qsRate;
              
              if (!newAttrs[item.id]) newAttrs[item.id] = {};
              newAttrs[item.id][c.id] = { isPlugged: true, source: 'QS_ESTIMATE' };
              pluggedCount++;
           }
        });
     });
     
     onUpdateTenderData(newData, newAttrs);
     flashTenderAction('plug-gaps');
     showToast({
       type: pluggedCount > 0 ? 'success' : 'info',
       message: pluggedCount > 0
         ? `Plugged ${pluggedCount} missing tender rate${pluggedCount === 1 ? '' : 's'} from QS estimates.`
         : 'No missing rates with QS estimates were found.',
       duration: 2500,
     });
  };

  const applyToProject = async (mode: string) => {
     const preview = getApplyPreview(mode);

     if (preview.applicableCount === 0) {
        showToast({
          type: 'info',
          message: `No usable ${preview.sourceLabel} are available for ${selectedTrade?.name || 'this trade'} yet.`,
          duration: 3500,
        });
        return;
     }

    const confirmMsg = `This will update ${preview.applicableCount} of ${preview.totalCount} priced item${preview.totalCount === 1 ? '' : 's'} in ${selectedTrade?.name || 'this trade'} using ${preview.sourceLabel}. ${selectedTradeHouseTypeSummaries.length > 0 ? 'House-type bill quantities are included in the tender totals shown here, but the applied rate still writes back per item rate.' : ''} ${preview.unavailableCount > 0 ? `${preview.unavailableCount} item${preview.unavailableCount === 1 ? '' : 's'} do not have a usable rate from this source and will be left unchanged.` : 'All priced items have a usable rate from this source.'}`;

     const ok = await askConfirm({
       title: 'Apply rates to project',
       message: confirmMsg,
       confirmLabel: 'Apply',
       cancelLabel: 'Cancel',
     });
     if (!ok) return;

     const updates: any[] = [];
     displayItems.forEach(({ item, isRelevant }) => {
        if (!isRelevant || item.type !== 'PRICED') return;
        
        let rate = 0;
        let source = mode;
        const rates = contractors.map(c => tenderData[item.id]?.[c.id] || 0).filter(r => r > 0);
        
        if (mode === 'LOWEST') rate = rates.length ? Math.min(...rates) : 0;
        else if (mode === 'HIGHEST') rate = rates.length ? Math.max(...rates) : 0;
        else if (mode === 'AVERAGE') rate = rates.length ? rates.reduce((a,b)=>a+b,0)/rates.length : 0;
        else if (mode === 'QS_ESTIMATE') rate = tenderData[item.id]?.['QS_ESTIMATE'] || 0;
        else rate = tenderData[item.id]?.[mode] || 0; 

        if (rate > 0) {
          updates.push({ id: item.id, rate, rateSource: source });
        }
     });
     
     // If a contractor is selected, mark them as winner
     if (preview.contractor) {
        onSetWinner(selectedTradeId, preview.contractor.id, {
          contractorName: preview.contractor.name,
          selectedAt: new Date().toISOString(),
          sourceTenderPackageName: selectedTrade?.name,
        });
     }
     
     onUpdateRates(updates);
     showToast({
       type: 'success',
       message: `Applied ${preview.sourceLabel} to ${updates.length} priced item${updates.length === 1 ? '' : 's'} in the active bill${preview.unavailableCount > 0 ? `, leaving ${preview.unavailableCount} unchanged.` : '.'}`,
       duration: 3500,
     });
  };

  const houseTypeScopeLabel = selectedTradeHouseTypeSummaries.length > 0
    ? selectedTradeHouseTypeSummaries
        .map(([billName, multiplier]) => `${billName} x${multiplier}`)
        .join(', ')
    : '';

  const handleExport = async () => {
    if (!selectedTrade) return;
    try {
      const { exportTenderAnalysisToExcel } = await loadTenderExcelExports();
      await exportTenderAnalysisToExcel(project, selectedTrade);
      showToast({ type: 'success', message: feedbackSuccess(`Tender report for "${selectedTrade.name}"`), duration: 3000 });
    } catch (e) {
      showToast({ type: 'error', message: feedbackError(`Tender report for "${selectedTrade.name}"`, e, 'Please try the export again.') });
    }
  };

  const handleExportBlankTender = async () => {
    if (!selectedTrade) return;
    try {
      const { exportBlankTenderTemplate } = await loadTenderExcelExports();
      await exportBlankTenderTemplate(project, selectedTrade);
      showToast({ type: 'success', message: feedbackSuccess(`Blank tender template for "${selectedTrade.name}"`), duration: 3000 });
    } catch (e) {
      showToast({ type: 'error', message: feedbackError(`Blank tender template for "${selectedTrade.name}"`, e, 'Please try the export again.') });
    }
  };

  const handleRemoveTenderContractor = (contractorId: string) => {
    if (!selectedTradeId) return;
    onUpdateTenderContractors(
      selectedTradeId,
      (project.tenderContractors?.[selectedTradeId] || []).filter(id => id !== contractorId)
    );
  };

  const getContractorContextItems = (contractor: Contractor): ContextMenuEntry[] => [
    { id: 'tender-decision-label', type: 'label', label: 'Decision' },
    {
      id: 'tender-select-winner',
      label: projectWinnerId === contractor.id ? 'Winner already selected' : 'Select as winner',
      icon: <Trophy className="h-4 w-4" />,
      disabled: projectWinnerId === contractor.id,
      onSelect: () => { void handleSelectWinner(contractor.id); },
    },
    { id: 'tender-apply-label', type: 'label', label: 'Apply' },
    {
      id: 'tender-apply-contractor',
      label: 'Apply this contractor to bill',
      description: 'Writes usable rates back to the active bill',
      icon: <ArrowDownToLine className="h-4 w-4" />,
      onSelect: () => { void applyToProject(contractor.id); },
    },
    {
      id: 'tender-fill-negotiated',
      label: 'Use as negotiated base',
      icon: <ArrowRightLeft className="h-4 w-4" />,
      onSelect: () => fillNegotiationFromContractor(contractor.id),
    },
    { id: 'tender-export-label', type: 'label', label: 'Import/export' },
    {
      id: 'tender-export-report',
      label: 'Export tender report',
      icon: <FileSpreadsheet className="h-4 w-4" />,
      onSelect: () => { void handleExport(); },
    },
    {
      id: 'tender-export-blank',
      label: 'Export blank tender',
      icon: <FileSpreadsheet className="h-4 w-4" />,
      onSelect: () => { void handleExportBlankTender(); },
    },
    { id: 'tender-danger-label', type: 'label', label: 'Danger' },
    {
      id: 'tender-remove-contractor',
      label: 'Remove from this tender',
      description: 'Leaves the contractor in the Trade & Contractor Library',
      icon: <X className="h-4 w-4" />,
      tone: 'danger',
      onSelect: () => handleRemoveTenderContractor(contractor.id),
    },
  ];

  const fillNegotiationFromContractor = (baseId: string) => {
    if (!baseId) return 0;

    const newData = { ...tenderData };
    const newAttrs = { ...tenderAttributes };
    let updatedCount = 0;

    displayItems.forEach(({ item, isRelevant }) => {
      if (!isRelevant || item.type !== 'PRICED') return;

      const itemData = newData[item.id] || {};
      const itemAttrs = newAttrs[item.id] || {};
      const baseRate = itemData[baseId] || 0;
      if (!baseRate) return;

      newData[item.id] = { ...itemData, NEGOTIATED: baseRate };
      newAttrs[item.id] = {
        ...itemAttrs,
        NEGOTIATED: {
          ...(itemAttrs.NEGOTIATED || {}),
          isPlugged: false,
          // Encode negotiation metadata into source string so we don't extend the attribute type
          // Pattern: NEG_BASE|<baseId>
          source: `NEG_BASE|${baseId}`,
        },
      };
      updatedCount++;
    });

    onUpdateTenderData(newData, newAttrs);
    return updatedCount;
  };

  const applyNegotiationCheaper = () => {
    if (!negotiationBaseId) return;

    const newData = { ...tenderData };
    const newAttrs = { ...tenderAttributes };
    let updatedCount = 0;

    displayItems.forEach(({ item, isRelevant }) => {
      if (!isRelevant || item.type !== 'PRICED') return;

      const itemData = newData[item.id] || {};
      const itemAttrs = newAttrs[item.id] || {};

      const currentNegotiated = itemData.NEGOTIATED || 0;
      const baseFromContractor = itemData[negotiationBaseId] || 0;
      let bestRate = currentNegotiated || baseFromContractor;

      let sourceType: 'CHEAPER_CONTRACTOR' | 'CHEAPEST_ALL' | '' = '';
      let sourceContractorId: string | null = null;

      if (negotiationMode === 'SPECIFIC') {
        if (!negotiationCompareId) return;
        const compareRate = itemData[negotiationCompareId] || 0;
        if (compareRate && (!bestRate || compareRate < bestRate)) {
          bestRate = compareRate;
          sourceType = 'CHEAPER_CONTRACTOR';
          sourceContractorId = negotiationCompareId;
        }
      } else {
        const contractorRates = contractors
          .map(c => ({ id: c.id, rate: itemData[c.id] || 0 }))
          .filter(r => r.rate > 0);
        if (contractorRates.length) {
          const cheapest = contractorRates.reduce((a, b) => (b.rate < a.rate ? b : a));
          if (!bestRate || cheapest.rate < bestRate) {
            bestRate = cheapest.rate;
            sourceType = 'CHEAPEST_ALL';
            sourceContractorId = cheapest.id;
          }
        }
      }

      if (!bestRate || !sourceType || !sourceContractorId) return;

      newData[item.id] = { ...itemData, NEGOTIATED: bestRate };
      newAttrs[item.id] = {
        ...itemAttrs,
        NEGOTIATED: {
          ...(itemAttrs.NEGOTIATED || {}),
          isPlugged: false,
          // Encode negotiation metadata into source string so we don't extend the attribute type
          // Pattern:
          //  - NEG_CHEAPER|<baseId>|<sourceContractorId>
          //  - NEG_CHEAPEST_ALL|<baseId>|<sourceContractorId>
          source: `${sourceType === 'CHEAPEST_ALL' ? 'NEG_CHEAPEST_ALL' : 'NEG_CHEAPER'}|${negotiationBaseId}|${sourceContractorId}`,
        },
      };
      updatedCount++;
    });

    onUpdateTenderData(newData, newAttrs);
    flashTenderAction('take-cheaper');
    showToast({
      type: updatedCount > 0 ? 'success' : 'info',
      message: updatedCount > 0
        ? `Updated ${updatedCount} negotiated rate${updatedCount === 1 ? '' : 's'} with the cheaper option.`
        : 'No cheaper negotiated rates were found.',
      duration: 2500,
    });
  };

  const tenderExportActionItems: ContextMenuEntry[] = [
    { id: 'tender-export-label', type: 'label', label: 'Import/export' },
    {
      id: 'tender-export-report',
      label: 'Export tender report',
      description: selectedTrade ? `Export analysis for ${selectedTrade.name}` : 'Select a trade first',
      icon: <FileSpreadsheet className="h-4 w-4" />,
      disabled: !selectedTrade,
      onSelect: () => { void handleExport(); },
    },
    {
      id: 'tender-export-blank',
      label: 'Export blank tender',
      description: selectedTrade ? 'Create a clean pricing workbook' : 'Select a trade first',
      icon: <FileSpreadsheet className="h-4 w-4" />,
      disabled: !selectedTrade,
      onSelect: () => { void handleExportBlankTender(); },
    },
  ];

  const tenderApplyActionItems: ContextMenuEntry[] = [
    { id: 'tender-apply-label', type: 'label', label: 'Apply rates' },
    {
      id: 'tender-apply-lowest',
      label: 'Apply lowest rates',
      description: `${getApplyPreview('LOWEST').applicableCount} usable item${getApplyPreview('LOWEST').applicableCount === 1 ? '' : 's'}`,
      icon: <ArrowDownToLine className="h-4 w-4" />,
      disabled: !selectedTrade || getApplyPreview('LOWEST').applicableCount === 0,
      onSelect: () => { void applyToProject('LOWEST'); },
    },
    {
      id: 'tender-apply-average',
      label: 'Apply average rates',
      description: `${getApplyPreview('AVERAGE').applicableCount} usable item${getApplyPreview('AVERAGE').applicableCount === 1 ? '' : 's'}`,
      icon: <ArrowDownToLine className="h-4 w-4" />,
      disabled: !selectedTrade || getApplyPreview('AVERAGE').applicableCount === 0,
      onSelect: () => { void applyToProject('AVERAGE'); },
    },
    {
      id: 'tender-apply-qs',
      label: 'Apply QS estimate',
      description: `${getApplyPreview('QS_ESTIMATE').applicableCount} usable item${getApplyPreview('QS_ESTIMATE').applicableCount === 1 ? '' : 's'}`,
      icon: <ArrowDownToLine className="h-4 w-4" />,
      disabled: !selectedTrade || getApplyPreview('QS_ESTIMATE').applicableCount === 0,
      onSelect: () => { void applyToProject('QS_ESTIMATE'); },
    },
    ...(displayTenderAward
      ? [
          { id: 'tender-apply-award-label', type: 'label' as const, label: 'Chosen contractor' },
          {
            id: 'tender-apply-chosen',
            label: 'Apply chosen contractor',
            description: displayTenderAward.contractorName,
            icon: <Trophy className="h-4 w-4" />,
            onSelect: () => { void handleApplyChosenContractor(); },
          },
        ]
      : []),
  ];

  const tenderGeneralActionItems: ContextMenuEntry[] = [
    { id: 'tender-setup-label', type: 'label', label: 'Setup' },
    {
      id: 'tender-open-overview',
      label: 'Show overview',
      icon: <ShieldCheck className="h-4 w-4" />,
      disabled: comparisonMode === 'OVERVIEW',
      onSelect: () => setComparisonMode('OVERVIEW'),
    },
    {
      id: 'tender-open-matrix',
      label: 'Show detailed matrix',
      icon: <Layers3 className="h-4 w-4" />,
      disabled: comparisonMode === 'DETAILED',
      onSelect: () => setComparisonMode('DETAILED'),
    },
    ...(isDetailedMatrixMode
      ? [{
          id: 'tender-toggle-value-mode',
          label: valueMode === 'RATE' ? 'Show values' : 'Show rates',
          icon: <ArrowRightLeft className="h-4 w-4" />,
          onSelect: () => setValueMode(valueMode === 'RATE' ? 'VALUE' : 'RATE'),
        }]
      : []),
    { id: 'tender-decision-label', type: 'label', label: 'Select winner' },
    ...(contractors.length > 0
      ? contractors.map((contractor): ContextMenuEntry => {
          const isWinner = projectWinnerId === contractor.id;
          const summary = analysis.find((entry) => entry.id === contractor.id);
          return {
            id: `tender-select-winner-${contractor.id}`,
            label: `${isWinner ? '✓ ' : ''}${contractor.name}`,
            description: summary
              ? `GBP ${formatCurrency(summary.total)}${summary.unpricedCount > 0 ? ` | ${summary.unpricedCount} missing` : ' | complete'}`
              : isWinner ? 'Current selected winner' : 'Select as project winner',
            icon: <Trophy className="h-4 w-4" />,
            disabled: isWinner,
            onSelect: () => { void handleSelectWinner(contractor.id); },
          };
        })
      : [{
          id: 'tender-select-winner-empty',
          label: 'No contractors in this tender',
          description: 'Add contractors before selecting a winner.',
          icon: <Trophy className="h-4 w-4" />,
          disabled: true,
          onSelect: () => undefined,
        } as ContextMenuEntry]),
    ...(displayTenderAward
      ? [
          {
            id: 'tender-create-approval',
            label: isCreatingApprovalForm ? 'Creating approval...' : 'Create approval form',
            description: approvalFormReady ? 'Create the formatted approval PDF' : 'Enter Prepared by first',
            icon: <FileSpreadsheet className="h-4 w-4" />,
            disabled: isCreatingApprovalForm || !approvalFormReady,
            onSelect: () => { void handleCreateApprovalForm(); },
          },
          {
            id: 'tender-apply-chosen-general',
            label: 'Apply chosen contractor',
            description: displayTenderAward.contractorName,
            icon: <ArrowDownToLine className="h-4 w-4" />,
            onSelect: () => { void handleApplyChosenContractor(); },
          },
        ]
      : []),
    { id: 'tender-tools-label', type: 'label', label: 'Tools' },
    {
      id: 'tender-toggle-advanced',
      label: showAdvancedTools ? 'Hide advanced tools' : 'Show advanced tools',
      icon: <MoreHorizontal className="h-4 w-4" />,
      disabled: !isDetailedMatrixMode,
      onSelect: () => setShowAdvancedTools((open) => !open),
    },
    {
      id: 'tender-plug-gaps',
      label: 'Plug gaps with QS estimate',
      icon: <Plug className="h-4 w-4" />,
      disabled: !isDetailedMatrixMode,
      onSelect: () => { void plugGapsWithEst(); },
    },
  ];

  return (
    <div data-smoke="tender-workspace" className={`${embedded ? 'h-full min-h-0' : 'workspace-rail-panel z-[100] animate-in slide-in-from-bottom-10'} overflow-y-auto rounded-app-xl border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(71,100,118,0.1),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2f5_100%)] shadow-card dark:border-slate-700/80 dark:bg-surface-950`}>
      <div className="border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-700/80 dark:bg-surface-900/95">
        <div className="px-8 py-5">
          <div className="space-y-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back to project workspace"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-100"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to project
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tracking-[0.18em] text-slate-400 dark:bg-slate-800 dark:text-slate-500">Esc</span>
            </button>
            <div className="workspace-chip px-3 py-1 text-[11px] tracking-[0.28em]">
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Tender analysis workspace
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Tender analysis</h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Compare live contractor returns item by item, close pricing gaps, review the commercial spread, and apply the agreed position back into the bill.
              </p>
            </div>
            <div className="flex justify-end">
              <HelpButton compact onClick={() => app?.openHelp('TENDER_ANALYSIS')} />
            </div>
            <TenderWorkflowHeader
              readinessDetail={readinessDetail}
              tabs={tenderWorkflowTabs}
              activeTabId={activeTenderWorkflowTabId}
              checklist={tenderIssueChecklist}
            />
            <TenderWorkflowStageCards
              stages={tenderWorkflowStages}
              activeStageId={activeTenderWorkflowStageId}
              onSelectStage={handleSelectTenderWorkflowStage}
            />
            <div
              data-help-id="help-tender-command-bar"
              className="sticky top-0 z-40 border border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm dark:border-slate-700/80 dark:bg-surface-900/95"
              onContextMenu={(event) => openContextMenu(event, 'Tender actions', tenderGeneralActionItems)}
            >
              <TenderCommandBar
                trades={trades}
                selectedTrade={selectedTrade || null}
                selectedTradeId={selectedTradeId}
                selectedTradeStatus={selectedTradeStatus}
                availableToAdd={availableToAdd}
                contractors={contractors}
                comparisonMode={comparisonMode}
                valueMode={valueMode}
                isDetailedMatrixMode={isDetailedMatrixMode}
                mainContractorDiscountType={mainContractorDiscountType}
                responseState={responseState}
                responseStateOptions={responseStateOptions}
                tenderExportActionItems={tenderExportActionItems}
                tenderApplyActionItems={tenderApplyActionItems}
                tenderGeneralActionItems={tenderGeneralActionItems}
                displayTenderAwardExists={Boolean(displayTenderAward)}
                approvalFormReady={approvalFormReady}
                isCreatingApprovalForm={isCreatingApprovalForm}
                flashedActionId={flashedActionId}
                preferredContractorId={preferredContractorId}
                showAdvancedTools={showAdvancedTools}
                negotiationBaseId={negotiationBaseId}
                negotiationMode={negotiationMode}
                negotiationCompareId={negotiationCompareId}
                onSelectTrade={setSelectedTradeId}
                onAddTenderContractor={(contractorId) => {
                  if (!selectedTradeId) return;
                  const current = project.tenderContractors?.[selectedTradeId] || [];
                  if (current.includes(contractorId)) return;
                  onUpdateTenderContractors(selectedTradeId, [...current, contractorId]);
                }}
                onUpdateTenderTradeStatus={(updates) => {
                  if (!selectedTradeId) return;
                  onUpdateTenderTradeStatus(selectedTradeId, updates);
                }}
                onSetComparisonMode={setComparisonMode}
                onSetValueMode={setValueMode}
                onCreateApprovalForm={() => { void handleCreateApprovalForm(); }}
                onSetPreferredContractorId={setPreferredContractorId}
                onSetNegotiationBaseId={setNegotiationBaseId}
                onSetNegotiationMode={setNegotiationMode}
                onSetNegotiationCompareId={setNegotiationCompareId}
                onFillSelectedMix={() => {
                  const updatedCount = fillNegotiationFromContractor(negotiationBaseId);
                  flashTenderAction('fill-selected-mix');
                  showToast({
                    type: updatedCount > 0 ? 'success' : 'info',
                    message: updatedCount > 0
                      ? `Filled ${updatedCount} negotiated rate${updatedCount === 1 ? '' : 's'} from the selected contractor.`
                      : 'No usable rates were found for the selected contractor.',
                    duration: 2500,
                  });
                }}
                onTakeCheaper={() => { void applyNegotiationCheaper(); }}
                onPlugGaps={() => { void plugGapsWithEst(); }}
                getTenderActionFeedbackClass={getTenderActionFeedbackClass}
              />
            </div>
          </div>
        </div>
      </div>

      <div
        className={`px-8 ${isDetailedMatrixMode ? 'py-4' : 'py-8'}`}
        onContextMenu={(event) => openContextMenu(event, 'Tender actions', tenderGeneralActionItems)}
      >
         {isDetailedMatrixMode && (
            <TenderDetailedSummaryPanel
              selectedTradeName={selectedTrade?.name || 'Select a trade'}
              valueMode={valueMode}
              pricedItemCount={pricedItemCount}
              invitedContractorCount={invitedContractorCount}
              contractorReturnCount={contractorReturnCount}
              missingReturnedRateCount={missingReturnedRateCount}
              currentLeaderName={analysis[0]?.name}
              currentLeaderTotal={analysis[0]?.total}
              leaderGap={leaderGap}
              lowestTotal={lowestTotal}
              completedTenderCount={completedTenderCount}
              winnerCoverageLabel={winnerAnalysis ? `${winningCoverage.toFixed(0)}%` : 'No winner'}
              winnerCoverageDetail={winnerAnalysis ? `${pricedItemCount - winnerAnalysis.unpricedCount}/${pricedItemCount} priced` : 'Select after review'}
              pricedWithQsEstimateCount={pricedWithQsEstimateCount}
              applyBackGuidance={applyBackGuidance}
            />
         )}
         {!selectedTrade ? null : contractors.length === 0 ? (
            <TenderEmptyTeamPanel
              tradeName={selectedTrade.name}
              availableContractorCount={allTradeContractors.length}
              tenderContractorCount={contractors.length}
              pricedItemCount={pricedItemCount}
            />
         ) : contractorReturnCount === 0 && !isDetailedMatrixMode ? (
            <div className="mx-auto flex max-w-5xl flex-col gap-6 rounded-app-xl border border-slate-200/80 bg-white/92 px-10 py-12 shadow-card dark:border-slate-700 dark:bg-surface-900/95">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300">
                    <UserPlus className="h-3.5 w-3.5" />
                    Tender setup in progress
                  </div>
                  <h3 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    Start collecting live contractor returns
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Your tender team is set up, but this trade does not have any live rates yet. Issue the blank tender workbook, collect the first return, then use the detailed matrix to review the spread.
                  </p>
                </div>
                <div className="rounded-app-lg border border-slate-200 bg-surface p-5 shadow-sm dark:border-slate-700 dark:bg-surface-800">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Current setup</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <div>{invitedContractorCount} invited contractor{invitedContractorCount === 1 ? '' : 's'}</div>
                    <div>{pricedItemCount} priced item{pricedItemCount === 1 ? '' : 's'} in this trade</div>
                    <div>{allTradeContractors.length - invitedContractorCount} contractor{allTradeContractors.length - invitedContractorCount === 1 ? '' : 's'} still available to add</div>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-app border border-slate-200 bg-surface p-4 dark:border-slate-700 dark:bg-surface-800">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">1. Invite team</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Add the contractors who should price this package.</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Use the tender team dropdown above to add more contractors from the Trade &amp; Contractor Library.</div>
                </div>
                <div className="rounded-app border border-slate-200 bg-surface p-4 dark:border-slate-700 dark:bg-surface-800">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">2. Issue tender</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Send a pricing sheet for this trade.</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Export the blank tender workbook when you need a clean issue sheet for pricing.</div>
                </div>
                <div className="rounded-app border border-slate-200 bg-surface p-4 dark:border-slate-700 dark:bg-surface-800">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">3. Capture return</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Enter the first live rates.</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Once one contractor return is entered, this view unlocks comparison and winner selection.</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={handleExportBlankTender} className="workspace-primary-btn px-4 py-2.5">
                  <FileSpreadsheet className="h-4 w-4" />
                  Export blank tender workbook
                </button>
                <button type="button" onClick={() => setComparisonMode('DETAILED')} className="workspace-secondary-btn px-4 py-2.5">
                  Open detailed matrix
                </button>
              </div>
            </div>
         ) : comparisonMode === 'OVERVIEW' ? (
            <div data-help-id="help-tender-overview" className="mx-auto grid max-w-[85rem] gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
               <div className="space-y-8">
               <div className="rounded-app-xl border border-slate-200/80 bg-white/92 p-8 shadow-card dark:border-slate-700 dark:bg-surface-900/95">
                  <div className="flex flex-wrap items-start justify-between gap-6">
                     <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:border-slate-700 dark:bg-surface-800 dark:text-slate-400">
                           <ShieldCheck className="h-3.5 w-3.5" />
                           Commercial position
                        </div>
                        <h3 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{selectedWinnerContractor?.name || analysis[0]?.name || 'Tender leaderboard'}</h3>
                        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                           Review the current commercial leader, record the award decision, and only then push the chosen return back into the live bill.
                        </p>
                     </div>
                     <div className="rounded-app-lg border border-emerald-200/80 bg-emerald-50/90 p-5 shadow-sm dark:border-emerald-900/80 dark:bg-emerald-900/20">
                       <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-300">Current lowest</div>
                       <div className="mt-3 text-3xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-100">{analysis[0] ? `GBP ${formatCurrency(analysis[0].total)}` : 'No bids'}</div>
                       {analysis[0] && mainContractorDiscountValue > 0 && (
                         <div className="mt-2 text-xs text-emerald-800/80 dark:text-emerald-200/80">
                           Gross GBP {formatCurrency(analysis[0].grossTotal)} less {mainContractorDiscountType === 'PERCENT' ? `${mainContractorDiscountValue.toFixed(2)}%` : `GBP ${formatCurrency(analysis[0].discountAmount)}`}
                         </div>
                       )}
                       <div className="mt-2 text-xs text-emerald-700/80 dark:text-emerald-300/80">{leaderGap > 0 ? `Gap to second place: GBP ${formatCurrency(leaderGap)}` : 'Add more contractor returns to show separation'}</div>
                     </div>
                  </div>
                  {selectedTrade && tenderSetupState && (
                    <div className={`mt-6 rounded-app border px-4 py-3 ${
                      tenderSetupState.tone === 'emerald'
                        ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/70 dark:bg-emerald-950/20'
                        : tenderSetupState.tone === 'primary'
                          ? 'border-primary-200 bg-primary-50/70 dark:border-primary-900/70 dark:bg-primary-950/20'
                          : 'border-amber-200 bg-amber-50/70 dark:border-amber-900/70 dark:bg-amber-950/20'
                    }`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Next setup step</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{tenderSetupState.label}</div>
                        </div>
                        <div className="max-w-xl text-xs leading-5 text-slate-600 dark:text-slate-300">{tenderSetupState.hint}</div>
                      </div>
                    </div>
                  )}
                  <div className="mt-6 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-surface-800 dark:text-slate-300">
                      <Layers3 className="h-3.5 w-3.5" />
                      {pricedItemCount} priced item{pricedItemCount === 1 ? '' : 's'} in scope
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300">
                      <Users className="h-3.5 w-3.5" />
                      {invitedContractorCount} invited, {availableContractorCount} available
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Leader: {analysis[0]?.name || 'No leader yet'}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300">
                      <BadgePercent className="h-3.5 w-3.5" />
                      {pricedWithQsEstimateCount} QS-guided item{pricedWithQsEstimateCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="relative mt-6 rounded-app-xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-surface-900">
                    {approvalWatermark && (
                      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-app-xl">
                        <div className="rotate-[-16deg] border-4 border-emerald-300/50 px-10 py-4 text-3xl font-semibold uppercase tracking-[0.32em] text-emerald-400/25 dark:border-emerald-600/40 dark:text-emerald-500/20">
                          {approvalWatermark}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-700">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Tender approval form</div>
                        <div className="mt-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                          {displayTenderAward ? `${displayTenderAward.contractorName} approval` : 'Awaiting winner selection'}
                        </div>
                        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {displayTenderAward
                            ? 'Review the proposed award, confirm the commercial rationale, then create the approval PDF and apply the agreed rates.'
                            : 'Select the winning contractor from the top command bar to prepare the approval and sign-off record.'}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {displayTenderAward && (
                          <button
                            type="button"
                            onClick={() => { void handleCreateApprovalForm(); }}
                            disabled={isCreatingApprovalForm}
                            className={`workspace-primary-btn rounded-full px-4 py-2 text-xs transition-all disabled:cursor-wait disabled:opacity-60 ${getTenderActionFeedbackClass('create-approval-form')}`}
                            title={approvalFormReady ? 'Create the tender approval PDF for signing.' : 'Enter Prepared by. Clicking will show what is missing.'}
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                            {isCreatingApprovalForm
                              ? 'Creating...'
                              : flashedActionId === 'create-approval-form'
                                ? 'Created'
                                : 'Create approval form'}
                          </button>
                        )}
                        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 dark:border-slate-700 dark:bg-surface-800 dark:text-slate-300">
                          {approvalStatusLabel}
                        </div>
                        {displayTenderAward?.approvalWorkbookFileName && (
                          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300">
                            {displayTenderAward.approvalWorkbookFileName}
                          </div>
                        )}
                      </div>
                    </div>
                    {displayTenderAward ? (
                      <div className="mt-5 space-y-5">
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
                          <div className="rounded-app border border-slate-200 bg-surface p-4 dark:border-slate-700 dark:bg-surface-800">
                            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                              <div>
                                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Project</div>
                                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{project.name}</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Trade package</div>
                                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedTrade?.name || 'Tender package'}</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Chosen contractor</div>
                                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{displayTenderAward.contractorName}</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Winner selected</div>
                                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {new Date(displayTenderAward.selectedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Tender due date</div>
                                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{dueDateLabel}</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Response state</div>
                                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {responseStateOptions.find((option) => option.value === responseState)?.label || 'Not issued'}
                                </div>
                              </div>
                                <div>
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Tender budget</div>
                                  <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{budgetLabel}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Main contractor discount</div>
                                  <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{discountLabel}</div>
                                </div>
                              </div>
                            </div>
                            <div className="rounded-app border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/80 dark:bg-emerald-900/20">
                              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">Approved commercial position</div>
                              <div className="mt-3 text-3xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-100">
                                GBP {formatCurrency(selectedCommercialTotal)}
                              </div>
                              {selectedCommercialSummary && mainContractorDiscountValue > 0 && (
                                <div className="mt-2 text-xs text-emerald-800/80 dark:text-emerald-200/80">
                                  Gross GBP {formatCurrency(selectedCommercialSummary.grossTotal)} less {mainContractorDiscountType === 'PERCENT' ? `${mainContractorDiscountValue.toFixed(2)}%` : `GBP ${formatCurrency(selectedCommercialSummary.discountAmount)}`}
                                </div>
                              )}
                              <div className="mt-2 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                                {selectedCommercialVariance > 0
                                  ? `Selected position is GBP ${formatCurrency(selectedCommercialVariance)} (${selectedCommercialVariancePct.toFixed(2)}%) above the lowest tender.`
                                : 'Selected position matches the lowest tender currently in scope.'}
                            </div>
                            <div className="mt-3 rounded-app-sm border border-emerald-200/80 bg-white/70 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200">
                              {budgetValue > 0
                                ? selectedBudgetVariance > 0
                                  ? `Budget check: GBP ${formatCurrency(selectedBudgetVariance)} (${selectedBudgetVariancePct.toFixed(2)}%) over tender budget.`
                                  : selectedBudgetVariance < 0
                                    ? `Budget check: GBP ${formatCurrency(Math.abs(selectedBudgetVariance))} (${Math.abs(selectedBudgetVariancePct).toFixed(2)}%) under tender budget.`
                                    : 'Budget check: selected position matches the tender budget.'
                                : 'Budget check: enter a tender budget value in the top command bar to compare the award against budget.'}
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-4">
                          <div className="rounded-app-sm border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-surface-800">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Invited</div>
                            <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{invitedContractorCount}</div>
                          </div>
                          <div className="rounded-app-sm border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-surface-800">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Live returns</div>
                            <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{contractorReturnCount}</div>
                          </div>
                          <div className="rounded-app-sm border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-surface-800">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Priced by winner</div>
                            <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{selectedCommercialSummary?.pricedItems || 0}</div>
                          </div>
                          <div className="rounded-app-sm border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-surface-800">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">In scope</div>
                            <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{pricedItemCount}</div>
                          </div>
                        </div>
                        {displayTenderAward.billApplyHistory[0] && (
                          <div className="rounded-app border border-slate-200 bg-surface p-4 dark:border-slate-700 dark:bg-surface-800">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Latest bill update summary</div>
                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                              <div className="rounded-app-sm border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-surface-900">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Items updated</div>
                                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{displayTenderAward.billApplyHistory[0].itemsUpdated}</div>
                              </div>
                              <div className="rounded-app-sm border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-surface-900">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Items skipped</div>
                                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{displayTenderAward.billApplyHistory[0].itemsSkipped}</div>
                              </div>
                              <div className="rounded-app-sm border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-surface-900">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">No contractor rate</div>
                                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{displayTenderAward.billApplyHistory[0].itemsWithNoContractorRate}</div>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
                          <div className="block rounded-app border border-slate-200 bg-surface p-4 dark:border-slate-700 dark:bg-surface-800">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Winner rationale</div>
                            <textarea
                              value={selectedTradeStatus?.winnerRationale || ''}
                              onChange={(e) => onUpdateTenderTradeStatus(selectedTradeId, { winnerRationale: e.target.value })}
                              spellCheck={spellcheckPreference.enabled}
                              lang={spellcheckPreference.language}
                              rows={5}
                              placeholder="Record the commercial reason for the preferred winner, including exclusions, coverage, negotiation outcome, and approval basis."
                              className="mt-3 w-full rounded-app-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-200"
                            />
                            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">This rationale appears in the approval PDF and forms part of the audit trail.</div>
                          </div>
                          <div className="rounded-app border border-slate-200 bg-surface p-4 dark:border-slate-700 dark:bg-surface-800">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Director approvals</div>
                              <div className="mt-4 space-y-3">
                              <div>
                                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Prepared by</div>
                                <input
                                  type="text"
                                  value={displayTenderAward.preparedBy || ''}
                                  onChange={(e) => onUpdateTenderAward(selectedTradeId, { preparedBy: e.target.value })}
                                  className="mt-2 w-full rounded-app-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-200"
                                  placeholder="Enter preparer name"
                                />
                              </div>
                              <div>
                                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Director approval 1</div>
                                <input
                                  type="text"
                                  value={displayTenderAward.checkedBy || ''}
                                  onChange={(e) => onUpdateTenderAward(selectedTradeId, { checkedBy: e.target.value })}
                                  className="mt-2 w-full rounded-app-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-200"
                                  placeholder="Enter first director name"
                                />
                              </div>
                                <div>
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Decision outcome</div>
                                  <select
                                    value={decisionOutcome}
                                    onChange={(e) => handleDecisionOutcomeChange(e.target.value as 'IN_REVIEW' | 'APPROVED' | 'REJECTED')}
                                    className="mt-2 w-full rounded-app-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-200"
                                  >
                                    <option value="IN_REVIEW">In review</option>
                                    <option value="APPROVED">Approved</option>
                                    <option value="REJECTED">Refused</option>
                                  </select>
                                </div>
                                <div>
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Director approval 2</div>
                                  <input
                                    type="text"
                                    value={displayTenderAward.approvedBy || ''}
                                  onChange={(e) => onUpdateTenderAward(selectedTradeId, { approvedBy: e.target.value })}
                                  className="mt-2 w-full rounded-app-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-200"
                                  placeholder="Enter second director name"
                                />
                              </div>
                                <div>
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Director approval date</div>
                                  <input
                                  type="date"
                                  value={displayTenderAward.approvedAt ? displayTenderAward.approvedAt.slice(0, 10) : ''}
                                  onChange={(e) => onUpdateTenderAward(selectedTradeId, { approvedAt: e.target.value ? new Date(`${e.target.value}T00:00:00`).toISOString() : undefined })}
                                  className="mt-2 w-full rounded-app-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-200"
                                  />
                                </div>
                                <div>
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Director refusal/comment</div>
                                  <textarea
                                    value={displayTenderAward.rejectionReason || ''}
                                    onChange={(e) => onUpdateTenderAward(selectedTradeId, { rejectionReason: e.target.value })}
                                    spellCheck={spellcheckPreference.enabled}
                                    lang={spellcheckPreference.language}
                                    rows={4}
                                    placeholder="If refused, record the director's comment and reason for refusal."
                                    className="mt-2 w-full rounded-app-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-200"
                                  />
                                </div>
                              <button
                                type="button"
                                onClick={() => signedApprovalInputRef.current?.click()}
                                className="workspace-secondary-btn w-full justify-center px-4 py-2.5 text-xs"
                              >
                                Upload returned approval / refusal PDF
                              </button>
                              <input
                                ref={signedApprovalInputRef}
                                type="file"
                                accept="application/pdf"
                                onChange={handleSignedApprovalSelected}
                                className="hidden"
                              />
                                <button
                                  type="button"
                                  onClick={() => { void handleConfirmApproval(); }}
                                  disabled={!displayTenderAward.signedApproval}
                                  className="workspace-secondary-btn w-full justify-center px-4 py-2.5 text-xs disabled:opacity-50"
                                >
                                  Confirm approved
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { void handleRejectApproval(); }}
                                  disabled={!displayTenderAward.rejectionReason?.trim()}
                                  className="workspace-secondary-btn w-full justify-center px-4 py-2.5 text-xs text-rose-700 disabled:opacity-50 dark:text-rose-300"
                                >
                                  Mark refused
                                </button>
                                <div className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                                  The uploaded returned PDF is stored as a locked project record and shown below as an uneditable returned decision.
                                </div>
                              </div>
                            </div>
                          </div>
                        {displayTenderAward.signedApproval?.pdfDataUrl && (
                          <div className="rounded-app border border-slate-200 bg-surface p-4 dark:border-slate-700 dark:bg-surface-800">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Returned signed approval</div>
                                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{displayTenderAward.signedApproval.fileName}</div>
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                Uploaded {new Date(displayTenderAward.signedApproval.uploadedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                              </div>
                            </div>
                            <div className="mt-4 overflow-hidden rounded-app border border-slate-200 bg-white dark:border-slate-600 dark:bg-surface-900">
                              <iframe
                                src={displayTenderAward.signedApproval.pdfDataUrl}
                                title="Signed tender approval PDF"
                                className="h-[34rem] w-full"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
               </div>
               <div className="grid gap-4 sm:grid-cols-3">
                  {analysis.slice(0,3).map((t, idx) => (
                     <button
                        key={t.id}
                        type="button"
                        onClick={() => { void handleSelectWinner(t.id); }}
                        onContextMenu={(event) => {
                          const contractor = contractors.find((entry) => entry.id === t.id);
                          if (contractor) openContextMenu(event, `${contractor.name} tender actions`, getContractorContextItems(contractor));
                        }}
                        className={`relative flex min-h-[15rem] w-full flex-col justify-between overflow-hidden rounded-app-lg border bg-white/92 p-6 text-left shadow-card transition-all dark:bg-surface-900/95 ${projectWinnerId === t.id ? 'border-emerald-400 ring-4 ring-emerald-50 dark:border-emerald-600 dark:ring-emerald-900/30' : 'border-slate-200/80 hover:border-primary-300 dark:border-slate-700 dark:hover:border-primary-600'}`}
                     >
                        <div className={`absolute top-0 right-0 p-4 text-6xl font-semibold opacity-5 ${getContractorStyle(contractors.findIndex(c => c.id === t.id)).text}`}>{idx+1}</div>
                        <div>
                           <div className="flex items-center gap-3 mb-4">
                              <div className={`w-3 h-3 rounded-full ${getContractorStyle(contractors.findIndex(c => c.id === t.id)).dot}`} />
                              <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{t.name}</h3>
                              {projectWinnerId === t.id && (
                                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"><Trophy className="h-3 w-3"/> Winner</span>
                              )}
                           </div>
                          <div className="mb-1 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">GBP {formatCurrency(t.total)}</div>
                          {mainContractorDiscountValue > 0 && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              Gross GBP {formatCurrency(t.grossTotal)} less {mainContractorDiscountType === 'PERCENT' ? `${mainContractorDiscountValue.toFixed(2)}%` : `GBP ${formatCurrency(t.discountAmount)}`}
                            </div>
                          )}
                          <div className={`text-xs font-medium ${idx === 0 || lowestTotal === 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                              {idx === 0 || lowestTotal === 0 ? 'Lowest tender' : `+${(((t.total - lowestTotal)/lowestTotal)*100).toFixed(2)}% vs lowest`}
                          </div>
                           <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t.unpricedCount === 0 ? 'Fully priced submission' : `${t.unpricedCount} unpriced items remaining`}</div>
                           {contractorSubmissionComments[t.id]?.trim() && (
                             <div className="mt-3 rounded-app border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600 dark:border-slate-700 dark:bg-surface-800 dark:text-slate-300">
                               {contractorSubmissionComments[t.id]}
                             </div>
                           )}
                        </div>
                        <div className="mt-6 text-xs font-medium text-slate-500 dark:text-slate-400">
                           {projectWinnerId === t.id ? 'Current preferred winner for this project. Create approval or apply back from the top command bar.' : 'Click to select this contractor as the tender winner for this project.'}
                        </div>
                     </button>
                  ))}
               </div>

               <div
                 className="overflow-hidden rounded-app-xl border border-slate-200/80 bg-white/92 p-8 shadow-card dark:border-slate-700 dark:bg-surface-900/95"
                 onContextMenu={(event) => openContextMenu(event, 'Tender ranking actions', tenderGeneralActionItems)}
               >
                  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                     <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Tender ranking</div>
                        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Leaderboard and completeness</h3>
                     </div>
                     <p className="max-w-xl text-sm text-slate-500 dark:text-slate-400">
                        Compare the full commercial spread before you commit rates back into the live bill.
                     </p>
                  </div>
                  <table className="w-full text-left">
                     <thead>
                        <tr className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wider border-b-2 border-slate-200 dark:border-slate-700">
                           <th className="pb-4 pl-4 w-16">Rank</th>
                           <th className="pb-4">Contractor</th>
                           <th className="pb-4 text-center">Unpriced items</th>
                           <th className="pb-4 text-right">Total (GBP)</th>
                           <th className="pb-4 text-right">Diff (GBP)</th>
                           <th className="pb-4 text-right">Diff (%)</th>
                           <th className="pb-4 pl-4">Submission comment</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {analysis.map((t, idx) => {
                          const contractor = contractors.find((entry) => entry.id === t.id);

                          return (
                           <tr
                             key={t.id}
                             className="group hover:bg-surface-muted dark:hover:bg-surface-800"
                             onContextMenu={(event) => {
                               if (contractor) openContextMenu(event, `${contractor.name} tender actions`, getContractorContextItems(contractor));
                             }}
                           >
                              <td className="py-4 pl-4 font-semibold text-slate-300 dark:text-slate-500">{idx+1}</td>
                              <td className="py-4 font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-3">
                                 <div className={`w-2 h-2 rounded-full ${getContractorStyle(contractors.findIndex(c => c.id === t.id)).dot}`} />
                                 {t.name}
                                 {projectWinnerId === t.id && <span className="text-emerald-500 dark:text-emerald-400"><Trophy className="w-3 h-3 inline"/></span>}
                              </td>
                              <td className="py-4 text-center">
                                 {t.unpricedCount > 0 ? <span className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded-app-sm text-xs font-medium">{t.unpricedCount}</span> : <span className="text-emerald-500 dark:text-emerald-400 text-xs font-medium">Complete</span>}
                              </td>
                              <td className="py-4 text-right font-semibold text-sm tabular-nums text-slate-900 dark:text-slate-100">GBP {formatCurrency(t.total)}</td>
                              <td className="py-4 text-right text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                                 {t.total - lowestTotal > 0 ? `+GBP ${formatCurrency(t.total - lowestTotal)}` : '-'}
                              </td>
                                <td className="py-4 text-right text-xs font-medium tabular-nums">
                                   <span className={t.total === lowestTotal ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}>
                                      {lowestTotal > 0 ? `${(((t.total - lowestTotal)/lowestTotal)*100).toFixed(2)}%` : '-'}
                                   </span>
                                </td>
                                <td className="py-4 pl-4">
                                  <textarea
                                    value={contractorSubmissionComments[t.id] || ''}
                                    onChange={(e) => handleSubmissionCommentChange(t.id, e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    spellCheck={spellcheckPreference.enabled}
                                    lang={spellcheckPreference.language}
                                    rows={3}
                                    placeholder="Add note about this submission..."
                                    className="w-full min-w-[16rem] rounded-app-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-primary-400 dark:border-slate-600 dark:bg-surface-900 dark:text-slate-200"
                                  />
                                </td>
                             </tr>
                          );
                        })}
                       </tbody>
                    </table>
               </div>
               </div>
               <div className="xl:sticky xl:top-28">
                  <div className="rounded-app-lg border border-slate-200/80 bg-white/90 p-4 shadow-card dark:border-slate-700 dark:bg-surface-900/95">
                     <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                        <div className="rounded-app border border-slate-200 bg-surface p-3 dark:border-slate-700 dark:bg-surface-800">
                           <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Invited</div>
                           <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{invitedContractorCount}</div>
                           <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Contractors currently in this tender.</div>
                        </div>
                        <div className="rounded-app border border-slate-200 bg-surface p-3 dark:border-slate-700 dark:bg-surface-800">
                           <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Returns</div>
                           <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{contractorReturnCount}</div>
                           <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Contractors with at least one live rate.</div>
                        </div>
                        <div className="rounded-app border border-slate-200 bg-surface p-3 dark:border-slate-700 dark:bg-surface-800">
                           <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Winner</div>
                           <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{winnerAnalysis?.name || 'Not selected'}</div>
                           <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Choose a winner once you trust the spread.</div>
                        </div>
                        <div className="rounded-app border border-slate-200 bg-surface p-3 dark:border-slate-700 dark:bg-surface-800">
                           <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Last return received</div>
                           <div className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{lastReturnLabel}</div>
                           <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">Updates automatically when a live contractor rate is entered.</div>
                        </div>
                        <div className="rounded-app border border-slate-200 bg-surface p-3 dark:border-slate-700 dark:bg-surface-800">
                           <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Tender due date</div>
                           <div className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{dueDateLabel}</div>
                           <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">Current target return date for this trade package.</div>
                        </div>
                        <div className="rounded-app border border-slate-200 bg-surface p-3 dark:border-slate-700 dark:bg-surface-800">
                           <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Response state</div>
                           <div className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {responseStateOptions.find((option) => option.value === responseState)?.label || 'Not issued'}
                           </div>
                           <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">Track whether this trade has been issued, partially returned, or commercially closed.</div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         ) : (
            <div
              data-help-id="help-tender-matrix"
              className="relative overflow-visible rounded-app-xl border border-slate-200/80 bg-white/92 shadow-card dark:border-slate-700 dark:bg-surface-900/95"
              onContextMenu={(event) => openContextMenu(event, 'Tender matrix actions', tenderGeneralActionItems)}
            >
      <p id={matrixKeyboardHintId} className="sr-only">
                  Use Tab or Enter to move down the current contractor column. Press Shift+Tab to move upward. In a rate cell, press I for Included, E for Excluded, Alt+L for lowest, Alt+H for highest, Alt+A for average, or Alt+P to plug the QS estimate.
               </p>
               <table className="w-full text-left border-collapse table-fixed">
                  <thead className="bg-surface-muted dark:bg-surface-800 sticky top-0 z-30 shadow-sm">
                     <tr>
                        <th className="p-4 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wider border-r border-slate-200 dark:border-slate-700 w-16 sticky left-0 bg-surface-muted dark:bg-surface-800 z-40">Ref</th>
                        <th className="p-4 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wider border-r border-slate-200 dark:border-slate-700 w-80 sticky left-16 bg-surface-muted dark:bg-surface-800 z-40 shadow-lg">Description</th>
                        <th className="p-4 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wider border-r border-slate-200 dark:border-slate-700 w-24 text-center">Qty</th>
                        
                        {contractors.map((c, i) => {
                           const style = getContractorStyle(i);
                           return (
                              <th
                                key={c.id}
                                className={`p-4 border-r border-slate-200 dark:border-slate-700 w-40 ${style.bg} group relative ${projectWinnerId === c.id ? 'ring-2 ring-emerald-400 z-30' : ''}`}
                                onContextMenu={(event) => openContextMenu(event, `${c.name} tender actions`, getContractorContextItems(c))}
                              >
                                 <div className="flex justify-between items-start">
                                    <div className="min-w-0">
                                      <div className={`text-xs font-semibold ${style.text} truncate`}>{c.name} {projectWinnerId === c.id && '(Winner)'}</div>
                                      <label className={`mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold transition ${
                                        projectWinnerId === c.id
                                          ? 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-200'
                                          : 'border-slate-200 bg-white/65 text-slate-600 hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:bg-surface-900/65 dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:text-emerald-200'
                                      }`}>
                                        <input
                                          type="checkbox"
                                          checked={projectWinnerId === c.id}
                                          onChange={() => {
                                            if (projectWinnerId !== c.id) void handleSelectWinner(c.id);
                                          }}
                                          className="h-3 w-3 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        Winner
                                      </label>
                                    </div>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                       <button
                                          type="button"
                                          onClick={() => applyToProject(c.id)}
                                          aria-label={`Apply ${c.name} tender rates to the bill`}
                                  className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 bg-surface dark:bg-surface-800 p-1 rounded-app-sm shadow-sm hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:text-slate-100 transition-all"
                                          title="Apply these rates to BoQ"
                                       >
                                          <ArrowDownToLine className="w-3 h-3" />
                                       </button>
                                       <button
                                          type="button"
                                          onClick={() => onUpdateTenderContractors(selectedTradeId, (project.tenderContractors?.[selectedTradeId] || []).filter(id => id !== c.id))}
                                          aria-label={`Remove ${c.name} from this tender`}
                                          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 bg-surface dark:bg-surface-800 p-1 rounded-app-sm shadow-sm hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-all"
                                          title="Remove from this tender"
                                       >
                                          <X className="w-3 h-3" />
                                       </button>
                                    </div>
                                 </div>
                                 <div className={`text-[10px] font-medium opacity-60 ${style.text}`}>GBP {formatCurrency(analysis.find(t=>t.id===c.id)?.total || 0)}</div>
                              </th>
                           );
                        })}
                        
                        <th className="p-4 border-r border-slate-200 dark:border-slate-700 w-40 bg-purple-50 dark:bg-purple-900/20">
                           <div className="text-xs font-semibold text-purple-700 dark:text-purple-300">QS Est.</div>
                           <div className="text-[9px] font-medium text-purple-500 dark:text-purple-400 uppercase tracking-wider">Source Reference</div>
                        </th>
                        <th className="p-4 border-r border-slate-200 dark:border-slate-700 w-40 bg-amber-50 dark:bg-amber-900/20">
                           <div className="text-xs font-semibold text-amber-700 dark:text-amber-300">Selected mix</div>
                           <div className="text-[9px] font-medium text-amber-500 dark:text-amber-400 uppercase tracking-wider">Negotiated rate</div>
                        </th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                     {displayItems.map(({ item, isRelevant, effectiveQuantity, quantityMultiplier, billName }, idx) => {
                        if (item.type !== 'PRICED') {
                           return (
                              <tr key={idx} className="bg-surface-muted dark:bg-surface-800">
                                 <td className="sticky left-0 bg-surface-muted dark:bg-surface-800 border-r border-slate-200 dark:border-slate-700"></td>
                                 <td className="sticky left-16 bg-surface-muted dark:bg-surface-800 border-r border-slate-200 dark:border-slate-700 px-4 py-2 font-semibold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-tight truncate shadow-lg" title={stripRichText(item.description)}>
                                   {renderTenderDescription(item.description)}
                                 </td>
                                 <td colSpan={contractors.length + 3} className="bg-surface-muted dark:bg-surface-800 border-r border-slate-200 dark:border-slate-700"></td>
                              </tr>
                           );
                        }

                        // Determine variance logic
                        const rates = contractors.map(c => tenderData[item.id]?.[c.id] || 0).filter(r => r > 0);
                        const minRate = rates.length ? Math.min(...rates) : 0;
                        const maxRate = rates.length ? Math.max(...rates) : 0;

                        // Base values per contractor for current mode (rate or total value)
                        const contractorBases = contractors
                          .map(c => {
                            const r = tenderData[item.id]?.[c.id] || 0;
                            return valueMode === 'RATE' ? r : r * effectiveQuantity;
                          })
                          .filter(v => v > 0);
                        const minBase = contractorBases.length ? Math.min(...contractorBases) : 0;

                        const qsRate = tenderData[item.id]?.['QS_ESTIMATE'] || 0;
                        const negotiatedRate = tenderData[item.id]?.['NEGOTIATED'] || 0;
                        const negotiatedAttrs = tenderAttributes[item.id]?.['NEGOTIATED'] || {};
                        const negotiatedIsDerived = Boolean(
                          negotiatedAttrs.source &&
                          (
                            (negotiatedAttrs.source as string).startsWith('NEG_CHEAPER') ||
                            (negotiatedAttrs.source as string).startsWith('NEG_CHEAPEST_ALL')
                          )
                        );

                        return (
                           <tr key={item.id} className="group hover:bg-surface-muted dark:hover:bg-surface-800">
                              <td className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 sticky left-0 bg-surface dark:bg-surface-900 group-hover:bg-surface-muted dark:group-hover:bg-surface-800 z-30">{item.reference || (idx+1)}</td>
                              <td className="px-4 py-3 text-xs font-medium text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 sticky left-16 bg-surface dark:bg-surface-900 group-hover:bg-surface-muted dark:group-hover:bg-surface-800 z-30 shadow-lg truncate" title={stripRichText(item.description)}>
                                {renderTenderDescription(item.description)}
                              </td>
                              <td
                                className="px-4 py-3 text-xs font-semibold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700 text-center"
                                title={quantityMultiplier > 1 ? `${billName || 'House type'} multiplied by ${quantityMultiplier} units` : undefined}
                              >
                                {quantityMultiplier > 1 ? `${effectiveQuantity.toFixed(3)} ${item.unit}` : `${item.quantity} ${item.unit}`}
                              </td>
                              
                              {contractors.map((c, cIdx) => {
                                 const style = getContractorStyle(cIdx);
                                 const rate = tenderData[item.id]?.[c.id] || 0;
                                 const attrs = tenderAttributes[item.id]?.[c.id] || {};
                                 const isStatusCell = isTenderStatusSource(attrs.source) && rate === 0;
                                 const statusLabel = attrs.source === 'INCLUDED' ? 'Included' : attrs.source === 'EXCLUDED' ? 'Excluded' : '';
                                 const isLowest = rate === minRate && rate > 0 && !attrs.isPlugged;
                                 const isHighest = rate === maxRate && rate > 0 && !attrs.isPlugged;
                                 const hasEnteredRate = rate > 0;
                                 const cellStateClass = isStatusCell
                                   ? attrs.source === 'INCLUDED'
                                     ? 'bg-emerald-50/80 dark:bg-emerald-950/35'
                                     : 'bg-rose-50/80 dark:bg-rose-950/35'
                                   : attrs.isPlugged
                                     ? 'bg-purple-50/80 dark:bg-purple-950/35'
                                     : hasEnteredRate
                                       ? isHighest
                                         ? 'bg-red-50/65 dark:bg-red-950/25'
                                         : 'bg-emerald-50/80 dark:bg-emerald-950/35'
                                       : 'bg-rose-50/95 dark:bg-rose-950/35';
                                 const inputStateClass = isStatusCell
                                   ? 'border-transparent text-transparent caret-slate-700 dark:caret-slate-300'
                                   : attrs.isPlugged
                                     ? 'border-purple-200 bg-white/55 text-purple-700 placeholder-purple-300 focus:border-purple-400 focus:bg-white dark:border-purple-800 dark:bg-purple-950/20 dark:text-purple-300'
                                     : hasEnteredRate
                                       ? `border-emerald-200 bg-white/65 placeholder-emerald-300 focus:border-emerald-500 focus:bg-white dark:border-emerald-800 dark:bg-emerald-950/20 ${isHighest ? 'text-red-700 dark:text-red-300' : isLowest ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-100'}`
                                       : 'border-rose-200 bg-rose-100/80 text-rose-800 placeholder-rose-400 focus:border-rose-500 focus:bg-white dark:border-rose-800 dark:bg-rose-950/45 dark:text-rose-200 dark:placeholder-rose-500';
                                 
                                 return (
                                    <td key={c.id} className={`px-2 py-1 border-r border-slate-200 dark:border-slate-700 relative transition-colors ${cellStateClass}`}>
                                       <div className="relative">
                                          {valueMode === 'RATE' ? (
                                             <MoneyInput
                                                id={`input-${c.id}-${item.id}`}
                                                ariaLabel={`${c.name} rate for ${getTenderItemLabel(item)}`}
                                                ariaDescribedBy={matrixKeyboardHintId}
                                                className={`w-full rounded-app-sm border text-right text-xs font-semibold outline-none tabular-nums py-2 pr-8 shadow-inner transition-colors ${inputStateClass}`}
                                                placeholder="Needed"
                                                value={rate}
                                                onCommit={(nextValue) => handleRateChange(
                                                  item.id,
                                                  c.id,
                                                  nextValue,
                                                  nextValue === 0 && !isStatusCell ? attrs.isPlugged : false,
                                                  nextValue === 0 && !isStatusCell ? (attrs.source || '') : ''
                                                )}
                                                onKeyDown={e => handleKeyDown(e, item.id, c.id, idx)}
                                             />
                                          ) : (
                                             <div className={`rounded-app-sm border px-2 py-2 pr-8 text-right text-xs font-semibold tabular-nums shadow-inner ${inputStateClass}`}>
                                               {hasEnteredRate ? formatCurrency(rate * effectiveQuantity) : 'Needed'}
                                             </div>
                                          )}
                                          {isStatusCell && valueMode === 'RATE' && (
                                            <div className={`pointer-events-none absolute inset-y-0 right-8 flex items-center text-[11px] font-semibold ${
                                              attrs.source === 'INCLUDED' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                                            }`}>
                                              {statusLabel}
                                            </div>
                                          )}
                                          
                                          {/* Indicators */}
                                          {attrs.isPlugged && !isTenderStatusSource(attrs.source) && <div className="absolute top-1/2 -translate-y-1/2 left-0 w-4 h-4 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-[8px] font-semibold flex items-center justify-center rounded-full pointer-events-none shadow-sm border border-purple-200 dark:border-purple-700" title="Plugged Rate">P</div>}
                                          {attrs.source === 'INCLUDED' && <div className="absolute top-1/2 -translate-y-1/2 left-0 w-4 h-4 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[8px] font-semibold flex items-center justify-center rounded-full pointer-events-none shadow-sm border border-emerald-200 dark:border-emerald-700" title="Included">I</div>}
                                          {attrs.source === 'EXCLUDED' && <div className="absolute top-1/2 -translate-y-1/2 left-0 w-4 h-4 bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-[8px] font-semibold flex items-center justify-center rounded-full pointer-events-none shadow-sm border border-rose-200 dark:border-rose-700" title="Excluded">E</div>}
                                          {!attrs.isPlugged && attrs.source === 'LOWEST' && <div className="absolute top-1/2 -translate-y-1/2 left-0 w-4 h-4 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[8px] font-semibold flex items-center justify-center rounded-full pointer-events-none">L</div>}
                                          {!attrs.isPlugged && attrs.source === 'HIGHEST' && <div className="absolute top-1/2 -translate-y-1/2 left-0 w-4 h-4 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 text-[8px] font-semibold flex items-center justify-center rounded-full pointer-events-none">H</div>}
                                          {!attrs.isPlugged && attrs.source === 'AVERAGE' && <div className="absolute top-1/2 -translate-y-1/2 left-0 w-4 h-4 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-[8px] font-semibold flex items-center justify-center rounded-full pointer-events-none">A</div>}

                                          {/* Per-item variance pill vs lowest in value mode */}
                                          {(() => {
                                            if (valueMode !== 'VALUE') return null;
                                            const base = valueMode === 'RATE' ? rate : rate * effectiveQuantity;
                                            const showVariancePill = base > 0 && minBase > 0;
                                            if (!showVariancePill) return null;

                                            const isBaseLowest = base === minBase;
                                            const diff = base - minBase;
                                            const pct = minBase > 0 ? (diff / minBase) * 100 : 0;

                                            return (
                                              <span
                                                className={`pointer-events-none absolute top-1/2 -translate-y-1/2 right-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold tabular-nums ${
                                                  isBaseLowest
                                                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                                    : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                                }`}
                                                title={
                                                  isBaseLowest
                                                    ? 'Lowest for this item'
                                                    : `+GBP ${formatCurrency(diff)} (${pct.toFixed(1)}%) vs lowest`
                                                }
                                              >
                                                {isBaseLowest ? 'Lowest' : `+${pct.toFixed(0)}%`}
                                              </span>
                                            );
                                          })()}
                                       </div>
                                    </td>
                                 );
                              })}

                              {/* QS Estimate Column */}
                              <td className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 bg-purple-50/20 dark:bg-purple-900/10">
                                 <MoneyInput
                                    ariaLabel={`QS estimate rate for ${getTenderItemLabel(item)}`}
                                    className="w-full bg-transparent text-right text-xs font-semibold outline-none tabular-nums py-2 pr-1 text-purple-700 dark:text-purple-300 placeholder-purple-300 dark:placeholder-purple-600"
                                    value={qsRate}
                                    onCommit={(nextValue) => handleRateChange(item.id, 'QS_ESTIMATE', nextValue)}
                                 />
                              </td>

                              {/* Selected / negotiated mix column */}
                              <td className={`px-2 py-1 border-r border-slate-200 dark:border-slate-700 transition-colors ${
                                negotiatedRate > 0
                                  ? negotiatedIsDerived
                                    ? 'bg-red-50/65 ring-1 ring-red-400 dark:bg-red-950/25 dark:ring-red-500'
                                    : 'bg-amber-50/85 dark:bg-amber-950/35'
                                  : 'bg-rose-50/95 dark:bg-rose-950/35'
                              }`}>
                                 <MoneyInput
                                    id={`input-NEGOTIATED-${item.id}`}
                                    ariaLabel={`Negotiated rate for ${getTenderItemLabel(item)}`}
                                    className={`w-full rounded-app-sm border text-right text-xs font-semibold outline-none tabular-nums py-2 pr-2 shadow-inner transition-colors ${
                                      negotiatedRate > 0
                                        ? negotiatedIsDerived
                                          ? 'border-red-200 bg-white/65 text-red-700 placeholder-red-300 focus:border-red-500 focus:bg-white dark:border-red-800 dark:bg-red-950/20 dark:text-red-300'
                                          : 'border-amber-200 bg-white/70 text-amber-800 placeholder-amber-300 focus:border-amber-500 focus:bg-white dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-200'
                                        : 'border-rose-200 bg-rose-100/80 text-rose-800 placeholder-rose-400 focus:border-rose-500 focus:bg-white dark:border-rose-800 dark:bg-rose-950/45 dark:text-rose-200 dark:placeholder-rose-500'
                                    }`}
                                    placeholder="Needed"
                                    value={negotiatedRate}
                                    onCommit={(nextValue) => handleRateChange(item.id, 'NEGOTIATED', nextValue, false, 'MANUAL')}
                                    onKeyDown={(event) => handleNegotiatedKeyDown(event, idx)}
                                 />
                              </td>
                           </tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>
         )}
      </div>
      <ContextMenu state={contextMenu} onClose={() => setContextMenu(null)} />
    </div>
  );
};
