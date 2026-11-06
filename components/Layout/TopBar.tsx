import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  HelpCircle,
  Info,
  LayoutGrid,
  Library as LibraryIcon,
  PlusCircle,
  Save,
} from 'lucide-react';
import { calculateProjectProgress } from '../../utils/calculations';
import { APP_NAME } from '../../utils/branding';
import { APP_RELEASE_LABEL } from '../../utils/appMetadata';
import type { AppNotice } from '../../utils/appUi';
import type { BoQItem, ClearValuesMode, ItemType } from '../../types';
import { AddLineMenu } from '../Project/AddLineMenu';
import { ESTIMATE_ONLY } from '../../utils/buildEdition';
import { ProjectLocationBadge } from '../Project/ProjectLocationBadge';
import {
  BillActionsMenu,
  BillControls,
  ProjectActionsMenu,
  ProjectSwitcher,
  QuickJumpMenu,
  TradeAssignPopover,
  WorkspaceViewMenu,
  type TradeAssignTarget,
} from './TopBarMenus';

type TopBarProps = {
  isHome: boolean;
  appName?: string;
  onNewProject?: () => void;
  projects?: any[];
  currentProject?: any;
  activeBill?: any;
  activeBillId?: string | null;
  selectedItemIds?: Set<string>;
  activeItemId?: string | null;
  activeBillSections?: Array<{ id: string; name: string }>;
  activeBillPages?: Array<{ id: string; name: string }>;
  selectedSectionId?: string | null;
  activeBillTradeTargets?: TradeAssignTarget[];
  availableTrades?: Array<{ id: string; name: string }>;
  setActiveBillId?: (id: string) => void;
  onReorderBills?: (draggedBillId: string, targetBillId: string) => void;
  onJumpToSection?: (id: string) => void;
  onJumpToPage?: (id: string) => void;
  onBackToProjects?: () => void;
  onSelectProject?: (id: string) => void;
  onExportPdf?: () => void;
  isExporting?: boolean;
  onOpenVersionHistory?: () => void;
  onOpenDiagnostics?: () => void;
  onOpenHelp?: () => void;
  onOpenPrompt?: (type: string, context?: any) => void;
  onOpenSettings?: () => void;
  onOpenAnalytics?: () => void;
  onOpenCostPlan?: () => void;
  onOpenAssemblies?: () => void;
  onOpenFutureModules?: () => void;
  onOpenBillSettings?: () => void;
  onCopyBill?: () => void;
  onOpenImportLines?: () => void;
  onOpenProjectSummary?: () => void;
  onOpenAskAi?: () => void;
  onOpenStandardsInsert?: () => void;
  onOpenTenderView?: () => void;
  onOpenEditor?: (billId: string, sectionId: string, item?: BoQItem, type?: ItemType, pageId?: string | null, insertAfterItemId?: string | null) => void;
  onClearBillValues?: (billId: string, mode: ClearValuesMode) => void;
  onApplyTradeScope?: (target: TradeAssignTarget, tradeId: string) => void;
  onDownloadProject?: () => void;
  onExportExcel?: () => void;
  onExportExcelCurrentBill?: () => void;
  viewMode?: 'standard' | 'trade';
  selectedTradeFilter?: string;
  saveStatus?: 'saved' | 'saving' | 'error';
  lastSavedAt?: number | null;
  lastManualSaveAt?: number | null;
  onSaveNow?: () => Promise<'sqlite' | 'localStorage'>;
  persistenceBackend?: 'sqlite' | 'localStorage';
  isAiLoading?: boolean;
  workspaceZoom?: number;
  onZoomOutWorkspace?: () => void;
  onZoomResetWorkspace?: () => void;
  onZoomInWorkspace?: () => void;
  isWorkspaceFocused?: boolean;
  onToggleWorkspaceFocus?: () => void;
  activeWorkspacePresetId?: string;
  onApplyWorkspacePreset?: (presetId: string) => void;
  workspaceLocationLabel?: string;
  systemNotices?: AppNotice[];
};

export const TopBar = ({
  isHome,
  appName = APP_NAME,
  onNewProject,
  projects = [],
  currentProject,
  activeBill,
  activeBillId,
  selectedItemIds = new Set(),
  activeItemId,
  activeBillSections = [],
  activeBillPages = [],
  selectedSectionId,
  availableTrades = [],
  setActiveBillId,
  onReorderBills,
  onJumpToSection,
  onJumpToPage,
  onBackToProjects,
  onSelectProject,
  onExportPdf,
  isExporting,
  onOpenVersionHistory,
  onOpenDiagnostics,
  onOpenHelp,
  onOpenPrompt,
  onOpenSettings,
  onOpenAnalytics,
  onOpenCostPlan,
  onOpenAssemblies,
  onOpenFutureModules,
  onOpenBillSettings,
  onCopyBill,
  onOpenImportLines,
  onOpenProjectSummary,
  onOpenAskAi,
  onOpenStandardsInsert,
  onOpenTenderView,
  onOpenEditor,
  onClearBillValues,
  onApplyTradeScope,
  onDownloadProject,
  onExportExcel,
  onExportExcelCurrentBill,
  viewMode: _viewMode,
  selectedTradeFilter: _selectedTradeFilter,
  saveStatus,
  lastSavedAt,
  lastManualSaveAt,
  onSaveNow,
  persistenceBackend = 'sqlite',
  isAiLoading,
  workspaceZoom,
  onZoomOutWorkspace,
  onZoomResetWorkspace,
  onZoomInWorkspace,
  isWorkspaceFocused,
  onToggleWorkspaceFocus,
  activeWorkspacePresetId,
  onApplyWorkspacePreset,
  workspaceLocationLabel,
  systemNotices = [],
}: TopBarProps) => {
  const releaseLabel = APP_RELEASE_LABEL;
  const [tradeAssignOpen, setTradeAssignOpen] = useState(false);
  const [isManualSaving, setIsManualSaving] = useState(false);
  const bills = currentProject?.bills ?? [];
  const canSwitchProjects = projects.length > 1;
  const hasSectionJump = !isHome && !!activeBill;
  const sectionJumpEnabled = activeBillSections.length > 0;
  const hasPageJump = !isHome && !!onJumpToPage;
  const pageJumpEnabled = activeBillPages.length > 0;
  const completion = currentProject ? calculateProjectProgress(currentProject) : 0;
  const projectMeta = currentProject?.client || '';
  const saveLabel = persistenceBackend === 'localStorage'
    ? lastSavedAt
      ? `Cached locally ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : 'Degraded mode'
    : saveStatus === 'saving'
      ? 'Saving changes...'
      : saveStatus === 'error'
        ? 'Autosave needs attention'
        : lastSavedAt
          ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : 'Autosave on';
  const manualSaveLabel = isManualSaving
    ? 'Saving...'
    : lastManualSaveAt
      ? `Saved now ${new Date(lastManualSaveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : 'Save now';
  const persistenceLabel = persistenceBackend === 'sqlite' ? 'SQLite' : 'Browser fallback';
  const savePillClass = saveStatus === 'saving'
    ? 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-surface-800 text-slate-700 dark:text-slate-200'
    : saveStatus === 'error'
      ? 'border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      : persistenceBackend === 'localStorage'
        ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-900/25 text-amber-800 dark:text-amber-200'
      : 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
  const canAssignTrade = !!activeBill && !!onApplyTradeScope && bills.length > 0 && availableTrades.length > 0;
  const highestNotice = systemNotices.find((notice) => notice.severity === 'danger')
    || systemNotices.find((notice) => notice.severity === 'warning')
    || systemNotices.find((notice) => notice.severity === 'info')
    || systemNotices[0];
  const noticePillClass = !highestNotice
    ? 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/25 dark:text-teal-200'
    : highestNotice.severity === 'danger'
      ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200'
      : highestNotice.severity === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200'
        : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200';
  const noticeLabel = !highestNotice
    ? 'System ready'
    : systemNotices.length > 1
      ? `${systemNotices.length} notices`
      : highestNotice.source === 'storage'
        ? 'Storage attention'
        : highestNotice.source === 'ai'
          ? 'AI setup'
          : 'Status notice';
  const noticeTitle = systemNotices.length
    ? systemNotices.map((notice) => notice.message).join('\n')
    : 'Storage, AI, and release checks are healthy.';
  const NoticeIcon = !highestNotice
    ? CheckCircle2
    : highestNotice.severity === 'danger' || highestNotice.severity === 'warning'
      ? AlertTriangle
      : Info;

  return (
    <header
      className={`shrink-0 flex flex-wrap items-start justify-between gap-3 px-4 py-3 sm:px-6 border-b border-slate-200/80 dark:border-slate-700/80 bg-[rgb(255_255_255_/_0.86)] dark:bg-[rgb(19_27_34_/_0.96)] backdrop-blur-xl shadow-app ${
        tradeAssignOpen ? 'z-[120]' : 'z-10'
      }`}
      data-help-id={isHome ? 'help-home-toolbar' : 'help-bill-toolbar'}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-start gap-3 lg:items-center lg:gap-4">
        {isHome ? (
          <div className="flex min-w-0 flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">
              Command centre
            </span>
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {appName}
              </h1>
              <span className="hidden sm:inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-[rgb(27_36_44_/_0.92)] dark:text-slate-400">
                QS workflow suite
              </span>
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Workspace
            </div>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <ProjectSwitcher
                projects={projects}
                currentProject={currentProject}
                canSwitchProjects={canSwitchProjects}
                onSelectProject={onSelectProject}
              />
              <BillControls
                bills={bills}
                activeBill={activeBill}
                activeBillId={activeBillId}
                setActiveBillId={setActiveBillId}
                onReorderBills={onReorderBills}
                onAddBill={() => onOpenPrompt?.('ADD_BILL')}
                onOpenBillSettings={onOpenBillSettings}
                onCopyBill={onCopyBill}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500 dark:text-slate-400">
              <span className="truncate">
                {workspaceLocationLabel || projectMeta || `${completion}% complete across ${bills.length} bill${bills.length === 1 ? '' : 's'}`}
              </span>
              {workspaceLocationLabel && (
                <span className="text-slate-400 dark:text-slate-500">
                  {`${completion}% complete across ${bills.length} bill${bills.length === 1 ? '' : 's'}`}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 lg:flex-none">
        {onOpenVersionHistory ? (
          <button
            type="button"
            onClick={onOpenVersionHistory}
            className="hidden xl:inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-2.5 py-1.5 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:bg-[rgb(27_36_44_/_0.92)] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            title="Open version history"
            aria-label="Open version history"
          >
            {releaseLabel}
          </button>
        ) : (
          <div className="hidden xl:inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-2.5 py-1.5 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-[rgb(27_36_44_/_0.92)] dark:text-slate-300">
            {releaseLabel}
          </div>
        )}
        {onOpenHelp && (
          <button
            type="button"
            onClick={onOpenHelp}
            className="workspace-secondary-btn px-3 py-2 text-xs"
            data-help-id="help-topbar-help"
            title="Open screen guide"
            aria-label="Open screen guide"
          >
            <HelpCircle className="h-4 w-4" />
            Help
          </button>
        )}
        {onOpenDiagnostics && (
          <button
            type="button"
            onClick={onOpenDiagnostics}
            className="workspace-secondary-btn px-3 py-2 text-xs"
            title="Open app diagnostics"
            aria-label="Open app diagnostics"
          >
            <Activity className="h-4 w-4" />
            Status
          </button>
        )}
        <button
          type="button"
          onClick={onOpenDiagnostics}
          disabled={!onOpenDiagnostics}
          className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition disabled:cursor-default md:inline-flex ${noticePillClass}`}
          title={noticeTitle}
          aria-label={noticeTitle}
        >
          <NoticeIcon className="h-3.5 w-3.5" />
          <span>{noticeLabel}</span>
        </button>
        {isHome && (
          <div className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-medium lg:inline-flex ${savePillClass}`}>
            <Save className={`h-3.5 w-3.5 ${saveStatus === 'saving' ? 'animate-pulse' : ''}`} />
            <span>{saveLabel}</span>
            <span className="text-[10px] uppercase tracking-[0.14em] opacity-75">{persistenceLabel}</span>
          </div>
        )}
        {!isHome && isAiLoading && (
          <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-[rgb(27_36_44_/_0.92)] dark:text-slate-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-500 dark:bg-slate-300" />
            AI thinking...
          </div>
        )}
        {!isHome && activeBill && (
          <QuickJumpMenu
            activeBillSections={activeBillSections}
            activeBillPages={activeBillPages}
            hasSectionJump={hasSectionJump}
            sectionJumpEnabled={sectionJumpEnabled}
            hasPageJump={hasPageJump}
            pageJumpEnabled={pageJumpEnabled}
            onJumpToSection={onJumpToSection}
            onJumpToPage={onJumpToPage}
          />
        )}
        {!isHome && activeBill && onOpenPrompt && onOpenEditor && (
          <div data-help-id="help-bill-add">
            <AddLineMenu
              activeBill={activeBill}
              selectedItemIds={selectedItemIds}
              activeItemId={activeItemId}
              defaultSectionId={selectedSectionId || ''}
              label="Add"
              onOpenStandards={onOpenStandardsInsert}
              onOpenEditor={onOpenEditor}
              onOpenPrompt={onOpenPrompt}
            />
          </div>
        )}
        {!isHome && activeBill && (
          <BillActionsMenu
            activeBill={activeBill}
            currentProject={currentProject}
            canAssignTrade={canAssignTrade}
            onOpenTradeAssign={() => setTradeAssignOpen(true)}
            onOpenImportLines={onOpenImportLines}
            onCopyBill={onCopyBill}
            onClearBillValues={onClearBillValues}
            onOpenPrompt={onOpenPrompt}
            onOpenBillSettings={onOpenBillSettings}
          />
        )}
        {!isHome && activeBill && onOpenStandardsInsert && (
          <button
            type="button"
            onClick={onOpenStandardsInsert}
            className="workspace-secondary-btn px-3.5 py-2 text-xs"
            title="Insert from standards library"
          >
            <LibraryIcon className="h-4 w-4" />
            Standards
          </button>
        )}
        {!isHome && activeBill && (
          <WorkspaceViewMenu
            workspaceZoom={workspaceZoom}
            isWorkspaceFocused={isWorkspaceFocused}
            onZoomOutWorkspace={onZoomOutWorkspace}
            onZoomResetWorkspace={onZoomResetWorkspace}
            onZoomInWorkspace={onZoomInWorkspace}
            onToggleWorkspaceFocus={onToggleWorkspaceFocus}
            activePresetId={activeWorkspacePresetId}
            onApplyWorkspacePreset={onApplyWorkspacePreset}
          />
        )}
        {!isHome && activeBill && (
          <TradeAssignPopover
            open={tradeAssignOpen}
            onOpenChange={setTradeAssignOpen}
            activeBill={activeBill}
            bills={bills}
            availableTrades={availableTrades}
            onApplyTradeScope={onApplyTradeScope}
          />
        )}
        {!isHome && (
          <div className="hidden items-center gap-2 lg:inline-flex">
            <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-medium ${savePillClass}`}>
              <Save className={`h-3.5 w-3.5 ${saveStatus === 'saving' ? 'animate-pulse' : ''}`} />
              <span>{saveLabel}</span>
              <span className="text-[10px] uppercase tracking-[0.14em] opacity-75">{persistenceLabel}</span>
              {persistenceBackend === 'localStorage' && (
                <span className="text-[10px] uppercase tracking-[0.14em] opacity-75">Backup recommended</span>
              )}
            </div>
            {onSaveNow && (
              <button
                type="button"
                onClick={() => {
                  setIsManualSaving(true);
                  void onSaveNow().finally(() => setIsManualSaving(false));
                }}
                disabled={isManualSaving}
                className="workspace-secondary-btn px-3 py-2 text-xs disabled:cursor-wait disabled:opacity-60"
                title="Save the current workspace state now"
                aria-label="Save now"
              >
                <Save className={`h-4 w-4 ${isManualSaving ? 'animate-pulse' : ''}`} />
                {manualSaveLabel}
              </button>
            )}
          </div>
        )}
        {isHome ? (
          onNewProject && (
            <button onClick={onNewProject} className="workspace-primary-btn px-3.5 py-2 text-xs">
              <PlusCircle className="h-4 w-4" /> New project
            </button>
          )
        ) : (
          <>
            {onOpenAskAi && (
              <button onClick={onOpenAskAi} className="workspace-primary-btn px-3.5 py-2 text-xs">
                <Bot className="h-4 w-4" />
                Ask AI
              </button>
            )}
            {currentProject && <ProjectLocationBadge project={currentProject} className="shrink max-w-32" />}
            {onBackToProjects && (
              <button
                onClick={onBackToProjects}
                className="flex items-center gap-2 rounded-app-sm border border-slate-200/70 bg-white/75 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[rgb(27_36_44_/_0.9)] dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <LayoutGrid className="h-4 w-4" /> Projects
              </button>
            )}
            <ProjectActionsMenu
              currentProject={currentProject}
              activeBill={activeBill}
              completion={completion}
              isExporting={isExporting}
              onOpenPrompt={onOpenPrompt}
              onOpenBillSettings={onOpenBillSettings}
              onOpenVersionHistory={onOpenVersionHistory}
              onOpenDiagnostics={onOpenDiagnostics}
              onOpenSettings={onOpenSettings}
              onOpenAnalytics={ESTIMATE_ONLY ? undefined : onOpenAnalytics}
              onOpenCostPlan={ESTIMATE_ONLY ? undefined : onOpenCostPlan}
              onOpenProjectSummary={ESTIMATE_ONLY ? undefined : onOpenProjectSummary}
              onOpenAssemblies={onOpenAssemblies}
              onOpenFutureModules={ESTIMATE_ONLY ? undefined : onOpenFutureModules}
              onOpenTenderView={ESTIMATE_ONLY ? undefined : onOpenTenderView}
              onDownloadProject={onDownloadProject}
              onExportPdf={onExportPdf}
              onExportExcel={onExportExcel}
              onExportExcelCurrentBill={onExportExcelCurrentBill}
            />
          </>
        )}
      </div>
    </header>
  );
};
