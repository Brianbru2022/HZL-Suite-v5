import React, { useState } from 'react';
import { ArrowLeft, Briefcase, Upload, Download, X, Plus, Trash2, Building, Phone, Mail, User, ShieldCheck, MapPin, AlertTriangle, AlertOctagon, FileSpreadsheet, ChevronDown, MoreHorizontal } from 'lucide-react';
import { TradePackage, Contractor, ContractorRating, TenderTradeStatus, TenderResponseState } from '../../types';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useModalFocus } from '../../hooks/useModalFocus';
import { useHelpContext } from '../../hooks/useHelpContext';
import { useAppContextOptional } from '../../contexts/AppContext';
import { HelpButton } from '../Help/HelpButton';
import { ContextMenu, shouldUseNativeContextMenu } from '../UI/ContextMenu';
import type { ContextMenuEntry, ContextMenuState } from '../UI/ContextMenu';
import { MenuActionList } from '../UI/MenuActionList';
import { PopoverMenu } from '../UI/PopoverMenu';

interface ContractorModalProps {
  contractor: Contractor;
  onSave: (c: Contractor) => void;
  onDelete: () => void;
  onClose: () => void;
}

const ContractorModal: React.FC<ContractorModalProps> = ({ contractor, onSave, onDelete, onClose }) => {
  const [formData, setFormData] = useState<Contractor>({ ...contractor });
  const { contentRef, contentProps } = useModalFocus(true, onClose);

  const ratings: { value: ContractorRating; color: string; icon: any; label: string }[] = [
    { value: 'GREEN', color: 'bg-emerald-500', icon: ShieldCheck, label: 'Approved' },
    { value: 'YELLOW', color: 'bg-yellow-400', icon: AlertTriangle, label: 'Minor Issues' },
    { value: 'ORANGE', color: 'bg-orange-500', icon: AlertTriangle, label: 'Warning' },
    { value: 'RED', color: 'bg-red-500', icon: AlertOctagon, label: 'Do Not Use' },
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm animate-in zoom-in-95 dark:bg-black/60">
      <div ref={contentRef} {...contentProps} aria-labelledby="contractor-modal-title" className="workspace-shell flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/92 px-5 py-4 dark:border-slate-700/80 dark:bg-surface-900/95">
          <div className="flex items-center gap-4">
            <div className="rounded-app-sm bg-slate-100 p-2 dark:bg-surface-800"><Building className="h-5 w-5 text-slate-700 dark:text-slate-300" /></div>
            <div>
              <h2 id="contractor-modal-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">Contractor details</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Shared trade library record</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close contractor details" className="workspace-icon-btn">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto bg-white/88 p-5 dark:bg-surface-900/92">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-2 block text-xs font-medium text-slate-500 dark:text-slate-400">Company Name</label>
              <input aria-label="Company name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="workspace-input py-2.5 text-sm" placeholder="e.g. ABC Construction Ltd" />
            </div>
            <div className="col-span-2">
              <label className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400"><MapPin className="h-3 w-3" /> Address</label>
              <textarea aria-label="Registered office address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="workspace-input min-h-[72px] py-2.5 text-sm" placeholder="Registered office address..." />
            </div>
            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400"><Mail className="h-3 w-3" /> Email</label>
              <input aria-label="Email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="workspace-input py-2.5 text-sm" placeholder="info@abc.co.uk" />
            </div>
            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400"><Phone className="h-3 w-3" /> Phone</label>
              <input aria-label="Phone" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="workspace-input py-2.5 text-sm" placeholder="+44 20 1234 5678" />
            </div>
            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400"><User className="h-3 w-3" /> Point of Contact</label>
              <input aria-label="Point of contact" value={formData.pointOfContact || ''} onChange={e => setFormData({ ...formData, pointOfContact: e.target.value })} className="workspace-input py-2.5 text-sm" placeholder="e.g. John Smith (Director)" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-500 dark:text-slate-400">Company Reg No.</label>
              <input aria-label="Company registration number" value={formData.companyReg || ''} onChange={e => setFormData({ ...formData, companyReg: e.target.value })} className="workspace-input py-2.5 text-sm" placeholder="XXXXXXXX" />
            </div>
          </div>

          <div className="rounded-app border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-surface-800/70">
            <label className="mb-3 block text-xs font-medium text-slate-500 dark:text-slate-400">Contractor rating</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ratings.map((r) => (
                <button
                  type="button"
                  key={r.value}
                  onClick={() => setFormData({ ...formData, rating: r.value })}
                  aria-pressed={formData.rating === r.value}
                  aria-label={`Set contractor rating to ${r.label}`}
                  className={`rounded-app-sm border px-2 py-3 transition-all ${formData.rating === r.value ? 'border-emerald-300 bg-white shadow-app dark:border-emerald-700 dark:bg-surface-900' : 'border-slate-200 bg-white/65 opacity-75 hover:bg-white hover:opacity-100 dark:border-slate-700 dark:bg-surface-900/50 dark:hover:bg-surface-900'}`}
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full ${r.color} text-white shadow-sm`}>
                      <r.icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{r.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-200/80 bg-white/92 p-4 dark:border-slate-700/80 dark:bg-surface-900/95">
          <button type="button" onClick={onDelete} className="flex items-center gap-2 rounded-app-sm px-4 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="workspace-secondary-btn px-3 py-2 text-xs">Cancel</button>
            <button type="button" onClick={() => onSave(formData)} className="workspace-primary-btn px-4 py-2 text-xs">Save changes</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const workspaceMetaChipClass = 'rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300';
const workspaceEmptyStateClass = 'flex max-w-xl flex-col items-center justify-center rounded-app-xl border border-dashed border-slate-300 bg-white/70 px-8 py-14 text-center dark:border-slate-700 dark:bg-surface-900/70';

function getTradeWorkflowStatus(trade: TradePackage, status?: TenderTradeStatus) {
  const responseState = status?.responseState;
  const hasWinner = Boolean(trade.winnerId) || responseState === 'WINNER_SELECTED';
  const hasReturns =
    responseState === 'PARTIAL_RETURNS' ||
    responseState === 'RETURNS_RECEIVED' ||
    responseState === 'WINNER_SELECTED' ||
    Boolean(status?.lastReturnReceivedAt);

  if (trade.contractors.length === 0) {
    return {
      label: 'Needs shortlist',
      detail: 'Add contractors before tender issue.',
      chipClass: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300',
    };
  }
  if (hasWinner) {
    return {
      label: 'Winner selected',
      detail: 'Review decision and apply-back choices.',
      chipClass: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300',
    };
  }
  if (hasReturns) {
    return {
      label: 'Returns received',
      detail: 'Compare prices and choose a winner.',
      chipClass: 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-900/70 dark:bg-primary-950/30 dark:text-primary-300',
    };
  }

  return {
    label: 'Ready to issue',
    detail: 'Issue pricing sheets and collect returns.',
    chipClass: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/30 dark:text-sky-300',
  };
}

function getTradeLibraryStatus(trade: TradePackage) {
  const approvedCount = trade.contractors.filter((contractor) => contractor.rating === 'GREEN').length;
  const reviewCount = trade.contractors.filter((contractor) => contractor.rating === 'YELLOW' || contractor.rating === 'ORANGE').length;
  const blockedCount = trade.contractors.filter((contractor) => contractor.rating === 'RED').length;

  if (trade.contractors.length === 0) {
    return {
      label: 'No contractors',
      detail: 'Add contractors to build this package shortlist.',
      chipClass: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-surface-800 dark:text-slate-300',
    };
  }
  if (blockedCount > 0) {
    return {
      label: 'Review ratings',
      detail: `${blockedCount} contractor${blockedCount === 1 ? '' : 's'} blocked or unsuitable.`,
      chipClass: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300',
    };
  }
  if (reviewCount > 0) {
    return {
      label: 'Review list',
      detail: `${reviewCount} contractor${reviewCount === 1 ? '' : 's'} marked for review.`,
      chipClass: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300',
    };
  }

  return {
    label: `${approvedCount} approved`,
    detail: 'Contractor shortlist is maintained in the shared library.',
    chipClass: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300',
  };
}

export const TradesWindow: React.FC<{
  trades: TradePackage[];
  setTrades: React.Dispatch<React.SetStateAction<TradePackage[]>>;
  tenderTradeStatus?: Record<string, TenderTradeStatus>;
  showProjectTenderContext?: boolean;
  onClose: () => void;
  onNewTrade: () => void;
  onAddContractor: (tradeId: string) => void;
  onOpenTenderView?: () => void;
  onExport: () => void;
  onImport: () => void;
  onExportTradeBoQ?: (trade: TradePackage) => void | Promise<void>;
  onExportBlankTender?: (trade: TradePackage) => void | Promise<void>;
  onExportTenderSheets?: (trade: TradePackage) => void | Promise<void>;
}> = ({ trades, setTrades, tenderTradeStatus, showProjectTenderContext = false, onClose, onNewTrade, onAddContractor, onOpenTenderView, onExport, onImport, onExportTradeBoQ, onExportBlankTender, onExportTenderSheets }) => {
  const { askConfirm } = useConfirm();
  const app = useAppContextOptional();
  useHelpContext('TRADES');
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [tradeFilter, setTradeFilter] = useState<string>('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);

  const selectedTrade = trades.find((t) => t.id === selectedTradeId);
  const hasProjectTenderContext = showProjectTenderContext;
  const selectedTenderStatus = hasProjectTenderContext && selectedTrade ? tenderTradeStatus?.[selectedTrade.id] : undefined;
  const selectedTradeWorkflowStatus = selectedTrade
    ? hasProjectTenderContext
      ? getTradeWorkflowStatus(selectedTrade, selectedTenderStatus)
      : getTradeLibraryStatus(selectedTrade)
    : null;

  const openContextMenu = (event: React.MouseEvent<HTMLElement>, label: string, items: ContextMenuEntry[]) => {
    if (shouldUseNativeContextMenu(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, label, items });
  };

  const buildTradeDirectoryActionItems = (): ContextMenuEntry[] => [
    { id: 'trade-directory-add-label', type: 'label', label: 'Add' },
    {
      id: 'trade-directory-new',
      label: 'New trade package',
      icon: <Plus className="h-4 w-4" />,
      onSelect: onNewTrade,
    },
    { id: 'trade-directory-import-label', type: 'label', label: 'Import/export' },
    {
      id: 'trade-directory-import',
      label: 'Import trade & contractor library',
      icon: <Upload className="h-4 w-4" />,
      onSelect: onImport,
    },
    {
      id: 'trade-directory-export',
      label: 'Export trade & contractor library',
      icon: <Download className="h-4 w-4" />,
      onSelect: onExport,
    },
    ...(selectedTrade
      ? [
          { id: 'trade-directory-selected-label', type: 'label' as const, label: 'Selected package' },
          {
            id: 'trade-directory-add-contractor',
            label: `Add contractor to ${selectedTrade.name}`,
            icon: <Plus className="h-4 w-4" />,
            onSelect: () => onAddContractor(selectedTrade.id),
          },
          ...(hasProjectTenderContext
            ? [
                {
                  id: 'trade-directory-export-selected',
                  label: 'Export selected trade workbook',
                  icon: <FileSpreadsheet className="h-4 w-4" />,
                  disabled: !onExportTradeBoQ,
                  onSelect: () => { void onExportTradeBoQ?.(selectedTrade); },
                },
              ]
            : []),
        ]
      : []),
    ...(hasProjectTenderContext && onOpenTenderView
      ? [
          { id: 'trade-directory-tender-label', type: 'label' as const, label: 'Tender' },
          {
            id: 'trade-directory-open-tender',
            label: 'Open tender comparison',
            icon: <Briefcase className="h-4 w-4" />,
            onSelect: onOpenTenderView,
          },
        ]
      : []),
  ];

  const buildTradeActionItems = (trade: TradePackage): ContextMenuEntry[] => [
    { id: 'trade-open-label', type: 'label', label: 'Open' },
    {
      id: 'trade-select',
      label: 'Select trade package',
      icon: <Briefcase className="h-4 w-4" />,
      onSelect: () => setSelectedTradeId(trade.id),
    },
    {
      id: 'trade-add-contractor',
      label: 'Add contractor',
      description: 'Add a contractor to this package shortlist',
      icon: <Plus className="h-4 w-4" />,
      onSelect: () => onAddContractor(trade.id),
    },
    ...(hasProjectTenderContext
      ? [
          { id: 'trade-export-label', type: 'label' as const, label: 'Import/export' },
          {
            id: 'trade-export-boq',
            label: 'Export trade workbook',
            icon: <FileSpreadsheet className="h-4 w-4" />,
            disabled: !onExportTradeBoQ,
            onSelect: () => { void onExportTradeBoQ?.(trade); },
          },
          {
            id: 'trade-export-blank',
            label: 'Export blank tender',
            icon: <FileSpreadsheet className="h-4 w-4" />,
            disabled: !onExportBlankTender,
            onSelect: () => { void onExportBlankTender?.(trade); },
          },
          {
            id: 'trade-export-sheets',
            label: 'Export tender sheets',
            icon: <FileSpreadsheet className="h-4 w-4" />,
            disabled: !onExportTenderSheets,
            onSelect: () => { void onExportTenderSheets?.(trade); },
          },
        ]
      : []),
    ...(hasProjectTenderContext && onOpenTenderView
      ? [
          { id: 'trade-tender-label', type: 'label' as const, label: 'Tender' },
          {
            id: 'trade-open-tender',
            label: 'Open tender comparison',
            icon: <Briefcase className="h-4 w-4" />,
            onSelect: onOpenTenderView,
          },
        ]
      : []),
  ];

  const buildContractorActionItems = (contractor: Contractor): ContextMenuEntry[] => [
    { id: 'contractor-edit-label', type: 'label', label: 'Edit' },
    {
      id: 'contractor-open',
      label: 'Open contractor details',
      icon: <User className="h-4 w-4" />,
      onSelect: () => setEditingContractor(contractor),
    },
    { id: 'contractor-danger-label', type: 'label', label: 'Danger' },
    {
      id: 'contractor-delete',
      label: 'Delete contractor',
      icon: <Trash2 className="h-4 w-4" />,
      tone: 'danger',
      onSelect: () => { void handleDeleteContractor(contractor.id); },
    },
  ];

  const handleUpdateContractor = (updated: Contractor) => {
    if (!selectedTradeId) return;

    setTrades((prev: TradePackage[]) => prev.map(t => {
      if (t.id !== selectedTradeId) return t;
      return {
        ...t,
        contractors: t.contractors.map(c => c.id === updated.id ? updated : c)
      };
    }));
    setEditingContractor(null);
  };

  const handleDeleteContractor = async (id: string) => {
    const ok = await askConfirm({
      title: 'Delete contractor',
      message: 'Are you sure you want to delete this contractor?',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!ok || !selectedTradeId) return;

    setTrades((prev: TradePackage[]) => prev.map(t => {
      if (t.id !== selectedTradeId) return t;
      return {
        ...t,
        contractors: t.contractors.filter(c => c.id !== id)
      };
    }));
    setEditingContractor(null);
  };

  const getRatingColor = (rating?: ContractorRating) => {
    switch (rating) {
      case 'GREEN': return 'border-emerald-400 bg-emerald-50/10';
      case 'YELLOW': return 'border-yellow-400 bg-yellow-50/10';
      case 'ORANGE': return 'border-orange-400 bg-orange-50/10';
      case 'RED': return 'border-red-400 bg-red-50/10';
      default: return 'border-slate-100 dark:border-slate-700';
    }
  };

  const getRatingBadge = (rating?: ContractorRating) => {
    switch (rating) {
      case 'GREEN': return <span className="flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700"><ShieldCheck className="h-3 w-3" /> Approved</span>;
      case 'YELLOW': return <span className="flex items-center gap-1 rounded bg-yellow-100 px-2 py-0.5 text-[9px] font-black uppercase text-yellow-700"><AlertTriangle className="h-3 w-3" /> Review</span>;
      case 'ORANGE': return <span className="flex items-center gap-1 rounded bg-orange-100 px-2 py-0.5 text-[9px] font-black uppercase text-orange-700"><AlertTriangle className="h-3 w-3" /> Warning</span>;
      case 'RED': return <span className="flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-[9px] font-black uppercase text-red-700"><AlertOctagon className="h-3 w-3" /> Blocked</span>;
      default: return <span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase text-slate-500">Unrated</span>;
    }
  };

  const filteredTrades = trades.filter((t) =>
    !tradeFilter ? true : t.name.toLowerCase().includes(tradeFilter.toLowerCase())
  );

  const directoryStats = trades.reduce(
    (stats, trade) => {
      stats.contractorCount += trade.contractors.length;
      stats.approvedCount += trade.contractors.filter((contractor) => contractor.rating === 'GREEN').length;
      stats.reviewCount += trade.contractors.filter((contractor) => contractor.rating === 'YELLOW' || contractor.rating === 'ORANGE').length;
      stats.blockedCount += trade.contractors.filter((contractor) => contractor.rating === 'RED').length;
      if (trade.contractors.length > 0) stats.readyPackageCount += 1;
      return stats;
    },
    { contractorCount: 0, approvedCount: 0, reviewCount: 0, blockedCount: 0, readyPackageCount: 0 }
  );

  const selectedTradeStats = selectedTrade
    ? {
        contractorCount: selectedTrade.contractors.length,
        approvedCount: selectedTrade.contractors.filter((c) => c.rating === 'GREEN').length,
        reviewCount: selectedTrade.contractors.filter((c) => c.rating === 'YELLOW' || c.rating === 'ORANGE').length,
        blockedCount: selectedTrade.contractors.filter((c) => c.rating === 'RED').length,
      }
    : null;

  const selectedTradeResponseState: TenderResponseState | undefined = selectedTenderStatus?.responseState;
  const selectedTradeHasReturns =
    hasProjectTenderContext && (
      selectedTradeResponseState === 'PARTIAL_RETURNS' ||
      selectedTradeResponseState === 'RETURNS_RECEIVED' ||
      selectedTradeResponseState === 'WINNER_SELECTED' ||
      Boolean(selectedTenderStatus?.lastReturnReceivedAt)
    );
  const selectedTradeHasWinner = hasProjectTenderContext && (Boolean(selectedTrade?.winnerId) || selectedTradeResponseState === 'WINNER_SELECTED');
  const nextAction = selectedTrade
    ? !hasProjectTenderContext
      ? selectedTrade.contractors.length === 0
        ? {
            eyebrow: 'Library record',
            title: 'Build the contractor shortlist',
            body: 'This shared trade package does not have any linked contractors yet.',
            buttonLabel: 'Add contractor',
            onClick: () => onAddContractor(selectedTrade.id),
            helper: 'Contractors added here become available when projects use this trade package.',
            accentClass: 'border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-surface-800/70',
          }
        : {
            eyebrow: 'Library record',
            title: 'Contractor shortlist maintained',
            body: 'This shared package is ready to be assigned to bill items and used inside project tender workflows.',
            buttonLabel: 'Add another contractor',
            onClick: () => onAddContractor(selectedTrade.id),
            helper: 'Tender issue, returns, and winner decisions are handled inside individual projects.',
            accentClass: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/20',
          }
      : selectedTrade.contractors.length === 0
      ? {
          eyebrow: 'Next best action',
          title: 'Link contractors before issue',
          body: 'This package needs a live tender list before you can issue pricing documents or track returns.',
          buttonLabel: 'Add contractors',
          onClick: () => onAddContractor(selectedTrade.id),
          helper: 'Start by building the shortlist for this package.',
          accentClass: 'border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20',
        }
      : selectedTradeHasReturns
        ? {
            eyebrow: selectedTradeHasWinner ? 'Tender review' : 'Returns received',
            title: selectedTradeHasWinner ? 'Review tender outcome' : 'Open tender comparison',
            body: selectedTradeHasWinner
              ? 'A winning contractor has been selected. Review the package outcome, comparisons, and apply-back choices.'
              : 'Tender returns are now in. Open the tender comparison to review pricing, compare contractors, and choose the next commercial move.',
            buttonLabel: selectedTradeHasWinner ? 'Review tender outcome' : 'Open tender comparison',
            onClick: () => onOpenTenderView?.(),
            helper: selectedTenderStatus?.lastReturnReceivedAt
              ? `Latest return recorded ${new Date(selectedTenderStatus.lastReturnReceivedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.`
              : 'Tender analysis is ready for commercial review.',
            accentClass: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/20',
          }
        : {
            eyebrow: 'Tender issue',
            title: 'Issue pricing documents',
            body: 'This package has a linked contractor list and is ready to move into tender issue and return tracking.',
            buttonLabel: 'Issue blank tender',
            onClick: () => onExportBlankTender?.(selectedTrade),
            helper: selectedTrade.contractors.length === 1
              ? 'Use the blank tender workbook to issue this package to the current contractor.'
              : 'Use the blank tender workbook or contractor sheets to issue this package to the current shortlist.',
            accentClass: 'border-sky-200 bg-sky-50/70 dark:border-sky-900/50 dark:bg-sky-950/20',
          }
    : null;

  return (
    <>
      <div className="workspace-rail-fixed z-[100] flex flex-col bg-surface-50 animate-in slide-in-from-bottom-10 dark:bg-surface-950">
        <div className="shrink-0 border-b border-slate-200/80 bg-white/92 px-5 py-4 shadow-app backdrop-blur-xl dark:border-slate-700/80 dark:bg-surface-900/95">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button type="button" onClick={onClose} aria-label="Back from trade and contractor library" className="workspace-compact-btn"><ArrowLeft className="w-4 h-4" />Back</button>
              <div className="rounded-app-sm border border-slate-200 bg-white/85 p-2.5 shadow-sm dark:border-slate-700/80 dark:bg-surface-800">
                <Briefcase className="h-5 w-5 text-slate-700 dark:text-slate-200" />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Library maintenance</div>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Trade & Contractor Library</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {hasProjectTenderContext
                    ? 'Project tender view: package shortlists, issue outputs, and tender readiness.'
                    : 'Maintain trade packages and contractor shortlists for use across projects.'}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className={workspaceMetaChipClass}>{trades.length} trade package{trades.length === 1 ? '' : 's'}</span>
                  <span className={workspaceMetaChipClass}>{directoryStats.contractorCount} contractor{directoryStats.contractorCount === 1 ? '' : 's'}</span>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300">{directoryStats.approvedCount} approved</span>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/20 dark:text-sky-300">{directoryStats.readyPackageCount} with contractors</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HelpButton compact onClick={() => app?.openHelp('TRADES')} />
              <button type="button" onClick={onNewTrade} className="workspace-primary-btn px-3 py-2 text-xs"><Plus className="h-4 w-4" />New package</button>
              <PopoverMenu
                ariaLabel="Trade and contractor library actions"
                width={320}
                estimatedHeight={420}
                trigger={({ ref, isOpen, toggle }) => (
                  <button
                    ref={ref}
                    type="button"
                    onClick={toggle}
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                    className="workspace-compact-btn"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    More
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                )}
              >
                {(close) => <MenuActionList items={buildTradeDirectoryActionItems()} close={close} itemTextSize="text-xs" />}
              </PopoverMenu>
              <button type="button" onClick={onClose} aria-label="Close trade and contractor library" className="workspace-compact-btn"><X className="w-4 h-4" />Close</button>
            </div>
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden bg-slate-50/85 dark:bg-surface-950">
          <div className="grid flex-1 grid-cols-[19rem_minmax(0,1fr)] gap-0 overflow-hidden px-4 py-4">
            <aside
              data-help-id="help-trades-list"
              className="min-h-0 border-r border-slate-200/80 pr-5 dark:border-slate-700/80"
              onContextMenu={(event) => openContextMenu(event, 'Trade & contractor library actions', buildTradeDirectoryActionItems())}
            >
              <div className="flex h-full flex-col rounded-app-xl border border-slate-200/80 bg-white/90 shadow-card dark:border-slate-700/80 dark:bg-[rgb(16_24_30_/_0.98)]">
                <div className="border-b border-slate-200/80 px-4 py-4 dark:border-slate-700/80">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Package directory</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{trades.length} package{trades.length === 1 ? '' : 's'} / {directoryStats.contractorCount} contractor{directoryStats.contractorCount === 1 ? '' : 's'}</div>
                    </div>
                    <PopoverMenu
                      ariaLabel="Trade and contractor library actions"
                      width={300}
                      estimatedHeight={390}
                      trigger={({ ref, isOpen, toggle }) => (
                        <button
                          ref={ref}
                          type="button"
                          onClick={toggle}
                          aria-label="Open trade and contractor library actions"
                          aria-haspopup="menu"
                          aria-expanded={isOpen}
                          className="workspace-icon-btn"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      )}
                    >
                      {(close) => <MenuActionList items={buildTradeDirectoryActionItems()} close={close} itemTextSize="text-xs" />}
                    </PopoverMenu>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={onNewTrade} className="workspace-primary-btn w-full justify-center px-3 py-2 text-xs"><Plus className="w-4 h-4" />New trade package</button>
                  </div>
                  <div className="mt-4">
                    <input aria-label="Filter trade packages" value={tradeFilter} onChange={e => setTradeFilter(e.target.value)} placeholder="Find a trade package..." className="workspace-input py-2.5 text-sm" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-3">
                  <div className="space-y-2">
                    {filteredTrades.map((trade) => {
                      const isActive = selectedTradeId === trade.id;
                      const approvedCount = trade.contractors.filter((c: Contractor) => c.rating === 'GREEN').length;
                      const workflowStatus = hasProjectTenderContext
                        ? getTradeWorkflowStatus(trade, tenderTradeStatus?.[trade.id])
                        : getTradeLibraryStatus(trade);
                      return (
                        <button
                          type="button"
                          key={trade.id}
                          onClick={() => setSelectedTradeId(trade.id)}
                          onContextMenu={(event) => openContextMenu(event, `${trade.name} actions`, buildTradeActionItems(trade))}
                          aria-pressed={isActive}
                          aria-label={`Select trade package ${trade.name}`}
                          className={`w-full rounded-app-lg border px-3 py-3 text-left transition-all ${isActive ? 'border-slate-300 bg-slate-100 shadow-sm dark:border-slate-600 dark:bg-[rgb(33_43_54_/_0.92)]' : 'border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-[rgb(24_35_42_/_0.88)]'}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex min-w-0 items-center gap-2">
                                <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{trade.name}</div>
                                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${workflowStatus.chipClass}`}>
                                  {workflowStatus.label}
                                </span>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                <span className={workspaceMetaChipClass}>{trade.contractors.length} contractor{trade.contractors.length === 1 ? '' : 's'}</span>
                                <span className={workspaceMetaChipClass}>{approvedCount} approved</span>
                              </div>
                              <div className="mt-2 max-h-8 overflow-hidden text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                                {workflowStatus.detail}
                              </div>
                            </div>
                            <Briefcase className={`mt-0.5 h-4 w-4 shrink-0 ${isActive ? 'text-slate-600 dark:text-slate-300' : 'text-slate-300 dark:text-slate-600'}`} />
                          </div>
                        </button>
                      );
                    })}
                    {filteredTrades.length === 0 && <div className="rounded-app-lg border border-dashed border-slate-300 bg-slate-50/80 px-4 py-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-surface-800/70 dark:text-slate-400">{tradeFilter ? 'No trade packages match the current filter.' : 'Create your first trade package to start building the shared directory.'}</div>}
                  </div>
                </div>
              </div>
            </aside>
            <main
              className="min-h-0 overflow-y-auto pl-5"
              onContextMenu={(event) => openContextMenu(
                event,
                selectedTrade ? `${selectedTrade.name} actions` : 'Trade & contractor library actions',
                selectedTrade ? buildTradeActionItems(selectedTrade) : buildTradeDirectoryActionItems()
              )}
            >
              {selectedTrade ? (
                <div className="mx-auto max-w-6xl space-y-5">
                  <div className="overflow-hidden rounded-app-lg border border-slate-200/80 bg-white/92 shadow-card dark:border-slate-700/80 dark:bg-surface-900/95">
                    <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-700/80">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Active package</div>
                          <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{selectedTrade.name}</h3>
                          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                            {hasProjectTenderContext
                              ? 'Control contractor coverage, prepare issue sheets, and manage the package handoff into tendering.'
                              : 'Maintain the shared contractor shortlist for this trade package.'}
                          </p>
                          {selectedTradeStats && (
                            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                              {selectedTradeWorkflowStatus && (
                                <span className={`rounded-full border px-2.5 py-1 font-semibold ${selectedTradeWorkflowStatus.chipClass}`}>
                                  {selectedTradeWorkflowStatus.label}
                                </span>
                              )}
                              <span className={workspaceMetaChipClass}>{selectedTradeStats.contractorCount} linked contractors</span>
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300">{selectedTradeStats.approvedCount} approved</span>
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300">{selectedTradeStats.reviewCount} under review</span>
                              <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">{selectedTradeStats.blockedCount} blocked</span>
                              {hasProjectTenderContext && selectedTenderStatus?.dueDate && (
                                <span className={workspaceMetaChipClass}>Due {new Date(selectedTenderStatus.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              )}
                              {hasProjectTenderContext && selectedTenderStatus?.lastReturnReceivedAt && (
                                <span className={workspaceMetaChipClass}>Last return {new Date(selectedTenderStatus.lastReturnReceivedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button type="button" onClick={() => onAddContractor(selectedTrade.id)} aria-label={`Add contractor to ${selectedTrade.name}`} className="workspace-primary-btn px-3 py-2 text-xs"><Plus className="w-4 h-4" />Add contractor</button>
                          <PopoverMenu
                            ariaLabel={`${selectedTrade.name} package actions`}
                            width={310}
                            estimatedHeight={410}
                            trigger={({ ref, isOpen, toggle }) => (
                              <button
                                ref={ref}
                                type="button"
                                onClick={toggle}
                                aria-haspopup="menu"
                                aria-expanded={isOpen}
                                className="workspace-secondary-btn px-3 py-2 text-xs"
                              >
                                More
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                            )}
                          >
                            {(close) => <MenuActionList items={buildTradeActionItems(selectedTrade)} close={close} itemTextSize="text-xs" />}
                          </PopoverMenu>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-0 xl:grid-cols-[1.05fr_0.95fr]">
                      <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-700/80 xl:border-b-0 xl:border-r">
                        {nextAction && (
                          <div data-help-id="help-trades-next-step" className={`mb-4 rounded-app border px-4 py-3 ${nextAction.accentClass}`}>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{nextAction.eyebrow}</div>
                            <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="text-base font-semibold text-slate-900 dark:text-slate-100">{nextAction.title}</div>
                                <div className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{nextAction.body}</div>
                                <div className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{nextAction.helper}</div>
                              </div>
                              <button
                                type="button"
                                onClick={nextAction.onClick}
                                className="workspace-primary-btn shrink-0 px-3 py-2 text-xs"
                              >
                                {nextAction.buttonLabel}
                              </button>
                            </div>
                          </div>
                        )}
                        {hasProjectTenderContext ? (
                          <>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Issue outputs</div>
                            <div className="mt-4 grid gap-2 sm:grid-cols-3">
                              <button type="button" onClick={() => onExportTradeBoQ?.(selectedTrade)} disabled={!onExportTradeBoQ} className="rounded-app border border-slate-200 bg-slate-50/90 p-3 text-left transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-surface-800/80 dark:hover:bg-surface-800">
                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200"><FileSpreadsheet className="h-4 w-4" /><span className="text-sm font-semibold">Trade workbook</span></div>
                                <div className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">Export the live BoQ for this package with current rates and values.</div>
                              </button>
                              <button type="button" onClick={() => onExportBlankTender?.(selectedTrade)} disabled={!onExportBlankTender} className="rounded-app border border-slate-200 bg-slate-50/90 p-3 text-left transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-surface-800/80 dark:hover:bg-surface-800">
                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200"><FileSpreadsheet className="h-4 w-4" /><span className="text-sm font-semibold">Blank tender</span></div>
                                <div className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">Issue a clean pricing workbook for competitive tender returns.</div>
                              </button>
                              <button type="button" onClick={() => onExportTenderSheets?.(selectedTrade)} disabled={!onExportTenderSheets} className="rounded-app border border-slate-200 bg-slate-50/90 p-3 text-left transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-surface-800/80 dark:hover:bg-surface-800">
                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200"><FileSpreadsheet className="h-4 w-4" /><span className="text-sm font-semibold">Tender sheets</span></div>
                                <div className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">Create one issue sheet per contractor for controlled distribution.</div>
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="rounded-app border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-surface-800/80">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Library use</div>
                            <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Available to project workspaces</div>
                            <div className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">Assign this trade package to bill items in a project, then manage tender issue, returns, and winning contractor decisions from that project.</div>
                          </div>
                        )}
                      </div>
                      <div className="px-5 py-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">{hasProjectTenderContext ? 'Package status' : 'Directory summary'}</div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-app border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-surface-800/80">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{hasProjectTenderContext ? 'Procurement readiness' : 'Contractor coverage'}</div>
                            <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {hasProjectTenderContext
                                ? selectedTrade.contractors.length === 0
                                  ? 'Contractor shortlist needed'
                                  : selectedTradeHasReturns
                                    ? 'Tender review in progress'
                                    : 'Tender issue can begin'
                                : selectedTrade.contractors.length === 0
                                  ? 'No contractors linked'
                                  : `${selectedTrade.contractors.length} contractor${selectedTrade.contractors.length === 1 ? '' : 's'} linked`}
                            </div>
                            <div className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                              {hasProjectTenderContext
                                ? selectedTrade.contractors.length === 0
                                  ? 'Add contractors before issuing tender information for this package.'
                                  : selectedTradeHasReturns
                                    ? 'Returns or winner decisions already exist, so the next commercial step is review rather than re-issue.'
                                    : 'This package already has linked contractors and can move into issue and return workflows.'
                                : selectedTrade.contractors.length === 0
                                  ? 'Add contractors here so this trade package is useful when assigned inside projects.'
                                  : 'This is the shared shortlist available to project tender workflows.'}
                            </div>
                          </div>
                          <div className="rounded-app border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-surface-800/80">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{hasProjectTenderContext ? 'Tender progress' : 'Rating review'}</div>
                            <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {hasProjectTenderContext
                                ? selectedTradeHasWinner
                                  ? 'Winner selected'
                                  : selectedTradeHasReturns
                                    ? 'Returns received'
                                    : selectedTrade.contractors.length === 0
                                      ? 'No issue in progress'
                                      : 'Ready to issue'
                                : selectedTradeStats
                                  ? `${selectedTradeStats.approvedCount} approved / ${selectedTradeStats.reviewCount} review / ${selectedTradeStats.blockedCount} blocked`
                                  : 'No ratings recorded'}
                            </div>
                            <div className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                              {hasProjectTenderContext
                                ? selectedTradeHasWinner
                                  ? 'Tender review is complete enough to revisit comparison or apply-back choices.'
                                  : selectedTradeHasReturns
                                    ? 'Open tender comparison to review returned prices and move toward a decision.'
                                    : selectedTrade.contractors.length === 0
                                      ? 'There is no live tender yet because this package still needs a contractor shortlist.'
                                      : 'Issue the blank tender or contractor sheets to begin collecting returns.'
                                : 'Ratings are maintained in the shared library; project-specific selections are handled inside each project.'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div data-help-id="help-trades-contractors" className="overflow-hidden rounded-app-lg border border-slate-200/80 bg-white/92 shadow-card dark:border-slate-700/80 dark:bg-surface-900/95">
                    <div className="border-b border-slate-200/80 px-5 py-4 dark:border-slate-700/80">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Linked contractors</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {hasProjectTenderContext ? `Tender team for ${selectedTrade.name}` : `Shared shortlist for ${selectedTrade.name}`}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{selectedTrade.contractors.length} contractor{selectedTrade.contractors.length === 1 ? '' : 's'}</div>
                      </div>
                    </div>
                    <div className="p-4">
                      {selectedTrade.contractors.length > 0 ? (
                        <div className="overflow-x-auto rounded-app-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-surface-900">
                          <div className="grid min-w-[860px] grid-cols-[minmax(220px,1.4fr)_minmax(160px,0.9fr)_minmax(220px,1.15fr)_120px_44px] border-b border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:border-slate-700 dark:bg-surface-800/80 dark:text-slate-400">
                            <div>Contractor</div>
                            <div>Contact</div>
                            <div>Email</div>
                            <div>Status</div>
                            <div aria-hidden />
                          </div>
                          <div className="divide-y divide-slate-200 dark:divide-slate-800">
                            {selectedTrade.contractors.map((contractor) => (
                              <div
                                key={contractor.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => setEditingContractor(contractor)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    setEditingContractor(contractor);
                                  }
                                }}
                                onContextMenu={(event) => openContextMenu(event, `${contractor.name} actions`, buildContractorActionItems(contractor))}
                                aria-label={`Open contractor ${contractor.name}`}
                                className={`grid min-w-[860px] cursor-pointer grid-cols-[minmax(220px,1.4fr)_minmax(160px,0.9fr)_minmax(220px,1.15fr)_120px_44px] items-center gap-3 px-4 py-3 text-sm transition hover:bg-slate-50 dark:hover:bg-surface-800/75 ${getRatingColor(contractor.rating)}`}
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-sm font-semibold text-slate-600 dark:bg-surface-800 dark:text-slate-300">{contractor.name.charAt(0)}</div>
                                  <div className="min-w-0">
                                    <div className="truncate font-semibold text-slate-900 dark:text-slate-100">{contractor.name}</div>
                                    <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{contractor.address || 'No address recorded'}</div>
                                  </div>
                                </div>
                                <div className="min-w-0 text-slate-600 dark:text-slate-300">
                                  <div className="truncate font-medium">{contractor.pointOfContact || 'No named contact'}</div>
                                  <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{contractor.phone || 'No phone'}</div>
                                </div>
                                <div className="min-w-0 truncate text-slate-600 dark:text-slate-300">{contractor.email || 'No email recorded'}</div>
                                <div>{getRatingBadge(contractor.rating)}</div>
                                <div className="flex justify-end">
                                  <PopoverMenu
                                    ariaLabel={`${contractor.name} contractor actions`}
                                    width={260}
                                    estimatedHeight={180}
                                    trigger={({ ref, isOpen, toggle }) => (
                                      <button
                                        ref={ref}
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          toggle();
                                        }}
                                        aria-haspopup="menu"
                                        aria-expanded={isOpen}
                                        aria-label={`Open ${contractor.name} actions`}
                                        className="workspace-icon-btn"
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </button>
                                    )}
                                  >
                                    {(close) => <MenuActionList items={buildContractorActionItems(contractor)} close={close} itemTextSize="text-xs" />}
                                  </PopoverMenu>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className={workspaceEmptyStateClass}>
                          <Briefcase className="mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
                          <div className="text-base font-semibold text-slate-700 dark:text-slate-200">No contractors linked yet</div>
                          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                            {hasProjectTenderContext
                              ? 'Build a shortlist for this package so it is ready for tender issue, return tracking, and commercial review.'
                              : 'Build a reusable shortlist for this package. Project-specific tender selections happen inside each project.'}
                          </p>
                          <button type="button" onClick={() => onAddContractor(selectedTrade.id)} className="workspace-primary-btn mt-5 px-4 py-2 text-sm"><Plus className="w-4 h-4" />Add first contractor</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center p-6">
                  <div className="w-full max-w-3xl rounded-app-lg border border-slate-200 bg-white/92 p-6 shadow-card dark:border-slate-700 dark:bg-surface-900/95">
                    <div className="flex items-start gap-4">
                      <div className="rounded-app-sm bg-slate-100 p-3 dark:bg-surface-800">
                        <Briefcase className="h-6 w-6 text-slate-500 dark:text-slate-300" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Directory overview</div>
                        <div className="mt-2 text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">Select a trade package</div>
                        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                          {hasProjectTenderContext
                            ? 'Open a package to review contractor coverage, issue exports, and tender readiness.'
                            : 'Open a package to maintain its shared contractor shortlist and rating status.'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-4">
                      <div className="rounded-app border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-surface-800">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Packages</div>
                        <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{trades.length}</div>
                      </div>
                      <div className="rounded-app border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-surface-800">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Contractors</div>
                        <div className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{directoryStats.contractorCount}</div>
                      </div>
                      <div className="rounded-app border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/60 dark:bg-emerald-950/25">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">Approved</div>
                        <div className="mt-1 text-xl font-semibold text-emerald-800 dark:text-emerald-100">{directoryStats.approvedCount}</div>
                      </div>
                      <div className="rounded-app border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/25">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-600 dark:text-amber-300">Review</div>
                        <div className="mt-1 text-xl font-semibold text-amber-800 dark:text-amber-100">{directoryStats.reviewCount + directoryStats.blockedCount}</div>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button type="button" onClick={onNewTrade} className="workspace-primary-btn px-4 py-2 text-sm"><Plus className="h-4 w-4" />New trade package</button>
                      <button type="button" onClick={onImport} className="workspace-secondary-btn px-4 py-2 text-sm"><Upload className="h-4 w-4" />Import library</button>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>

      {editingContractor && (
        <ContractorModal
          contractor={editingContractor}
          onSave={handleUpdateContractor}
          onDelete={() => handleDeleteContractor(editingContractor.id)}
          onClose={() => setEditingContractor(null)}
        />
      )}
      <ContextMenu state={contextMenu} onClose={() => setContextMenu(null)} />
    </>
  );
};
