import React, { Suspense, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { BoQItem, ItemType, DimensionRow, AISuggestion, EditorConfig, HelpContextId } from './types';
import { useProjectData } from './hooks/useProjectData';
import { useToast } from './contexts/ToastContext';
import { useAiAssistant } from './hooks/useAiAssistant';
import { useAppActions } from './hooks/useAppActions';
import { AppContext } from './contexts/AppContext';
import { getGeminiConfigStatus, GEMINI_KEY_MESSAGE } from './services/geminiConfig';
import { getPreferredBillId } from './utils/projectSelection';
import { loadPersistedSessionState, persistSessionState, type PersistedSessionState } from './utils/appPersistence';
import { getHelpArticle } from './utils/helpContent';
import { EXPIRY_DATE_ISO, EXPIRY_TIME, RELEASE_DATE_ISO, RELEASE_LABEL, formatExpiryCountdown, getAppExpiryStatus, type AppExpiryStatus } from './utils/appExpiry';
import { HelpWalkthroughOverlay } from './components/Help/HelpWalkthroughOverlay';
import { APP_NAME } from './utils/branding';
import { recordOperationLogEntry } from './utils/operationLog';
import type { AppNotice } from './utils/appUi';

const NoProjectView = React.lazy(() =>
  import('./components/Layout/NoProjectView').then((module) => ({ default: module.NoProjectView }))
);
const ProjectView = React.lazy(() =>
  import('./components/Layout/ProjectView').then((module) => ({ default: module.ProjectView }))
);
const AiClarificationOverlay = React.lazy(() =>
  import('./components/Modals/AiClarificationOverlay').then((module) => ({ default: module.AiClarificationOverlay }))
);
const AiLoadingOverlay = React.lazy(() =>
  import('./components/Modals/AiLoadingOverlay').then((module) => ({ default: module.AiLoadingOverlay }))
);

function ExpiryStatusBar({
  now,
  isExpanded,
  setIsExpanded,
  isLocked,
}: {
  now: number;
  isExpanded: boolean;
  setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  isLocked: boolean;
}) {
  const remainingUntilExpiry = Math.max(0, EXPIRY_TIME - now);
  const isExpiryUrgent = remainingUntilExpiry <= 1000 * 60 * 60 * 24 * 14;
  const expiryCountdownLabel = formatExpiryCountdown(remainingUntilExpiry);
  const releaseDateLabel = new Date(RELEASE_DATE_ISO).toLocaleDateString([], { dateStyle: 'medium' });
  const expiryDateLabel = new Date(EXPIRY_DATE_ISO).toLocaleDateString([], { dateStyle: 'medium' });

  if (!isExpanded && !isExpiryUrgent && !isLocked) return null;

  return (
    <div className={`fixed inset-x-0 bottom-0 z-[160] border-t px-4 ${isExpanded ? 'py-2' : 'py-1.5'} text-sm shadow-lg backdrop-blur ${
      isLocked
        ? 'border-red-200 bg-red-50/95 text-red-800 dark:border-red-900/70 dark:bg-red-950/90 dark:text-red-200'
        : isExpiryUrgent
          ? 'border-amber-200 bg-amber-50/95 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/90 dark:text-amber-200'
          : 'border-emerald-200 bg-emerald-50/95 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/90 dark:text-emerald-200'
    }`}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="font-medium">
            {RELEASE_LABEL} update timer
          </div>
          {!isExpanded && (
            <div className="truncate text-xs font-semibold sm:text-sm">
              {isLocked ? 'Expired - update required' : expiryCountdownLabel}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isExpanded && (
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
              <span>Release date: {releaseDateLabel}</span>
              <span className="opacity-60">|</span>
              <span>Expiry date: {expiryDateLabel}</span>
              <span className="opacity-60">|</span>
              <span className="font-semibold">{isLocked ? 'Expired - update required' : expiryCountdownLabel}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="rounded-full border border-current/20 bg-white/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] transition hover:bg-white/80 dark:bg-black/10 dark:hover:bg-black/20"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Minimise update timer bar' : 'Expand update timer bar'}
          >
            {isExpanded ? 'Minimise' : 'Expand'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExpiryLockScreen({ status }: { status: AppExpiryStatus }) {
  const releaseDateLabel = new Date(status.releaseDateIso || RELEASE_DATE_ISO).toLocaleDateString([], { dateStyle: 'medium' });
  const expiryDateLabel = new Date(status.expiryDateIso || EXPIRY_DATE_ISO).toLocaleDateString([], { dateStyle: 'medium' });
  const isRollback = status.clockRollbackDetected || status.reason === 'clock_rollback';

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="workspace-shell w-full max-w-2xl overflow-hidden p-0">
          <div className="border-b border-red-200/80 bg-red-50 px-8 py-7 dark:border-red-900/70 dark:bg-red-950/40">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-600 dark:text-red-300">
              {isRollback ? 'Clock check failed' : 'Release expired'}
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              This copy of {APP_NAME} cannot continue
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {isRollback
                ? `The system clock appears to have been changed since ${APP_NAME} was last opened. Please install an updated valid build to continue using the app.`
                : `${status.releaseLabel || RELEASE_LABEL} was issued on ${releaseDateLabel} and expired on ${expiryDateLabel}. Please install an updated version to continue using the app.`}
            </p>
          </div>
          <div className="bg-white/92 px-8 py-7 dark:bg-surface-900/95">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-app border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-surface-800/70">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Version</div>
                <div className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">{status.releaseLabel || RELEASE_LABEL}</div>
              </div>
              <div className="rounded-app border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-surface-800/70">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Released</div>
                <div className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">{releaseDateLabel}</div>
              </div>
              <div className="rounded-app border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-surface-800/70">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{isRollback ? 'Status' : 'Expires'}</div>
                <div className="mt-2 text-base font-semibold text-red-700 dark:text-red-300">{isRollback ? 'Update required' : expiryDateLabel}</div>
              </div>
            </div>
            <p className="mt-5 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Project, library, import, export, AI, and settings modules are not loaded while this build is locked.
            </p>
          </div>
        </div>
      </div>
      <ExpiryStatusBar now={Date.now()} isExpanded={true} setIsExpanded={() => {}} isLocked />
    </div>
  );
}

export const App: React.FC = () => {
  const [expiryStatus, setExpiryStatus] = useState<AppExpiryStatus | null>(null);
  const [expiryError, setExpiryError] = useState<string | null>(null);
  const [gateNow, setGateNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    const loadStatus = async () => {
      try {
        const status = await getAppExpiryStatus();
        if (!cancelled) setExpiryStatus(status);
      } catch (error) {
        if (!cancelled) setExpiryError(error instanceof Error ? error.message : 'Expiry check failed.');
      }
    };
    void loadStatus();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setGateNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  if (expiryError) {
    return (
      <ExpiryLockScreen
        status={{
          releaseLabel: RELEASE_LABEL,
          releaseDateIso: RELEASE_DATE_ISO,
          expiryDateIso: EXPIRY_DATE_ISO,
          currentTimeIso: new Date().toISOString(),
          currentUnixSeconds: Math.floor(Date.now() / 1000),
          expiryUnixSeconds: Math.floor(EXPIRY_TIME / 1000),
          expired: false,
          clockRollbackDetected: true,
          locked: true,
          reason: expiryError,
        }}
      />
    );
  }

  if (!expiryStatus) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-50 text-sm font-medium text-slate-500 dark:bg-surface-950 dark:text-slate-300">
        Checking app update status...
      </div>
    );
  }

  if (expiryStatus.locked || gateNow >= EXPIRY_TIME) {
    return (
      <ExpiryLockScreen
        status={{
          ...expiryStatus,
          currentTimeIso: new Date(gateNow).toISOString(),
          currentUnixSeconds: Math.floor(gateNow / 1000),
          expired: expiryStatus.expired || gateNow >= EXPIRY_TIME,
          locked: true,
          reason: expiryStatus.reason === 'clock_rollback' ? expiryStatus.reason : 'expired',
        }}
      />
    );
  }

  return <WorkspaceApp />;
};

const WorkspaceApp: React.FC = () => {
  const {
    projects,
    setProjects,
    libraries,
    setLibraries,
    trades,
    setTrades,
    appraisals,
    setAppraisals,
    appraisalHouseTypes,
    setAppraisalHouseTypes,
    appraisalRates,
    setAppraisalRates,
    workspaceFolders,
    setWorkspaceFolders,
    appSettings,
    setAppSettings,
    updateProject,
    undo,
    redo,
    saveStatus,
    lastSavedAt,
    lastManualSaveAt,
    saveError,
    persistenceBackend,
    isHydrated,
    saveNow,
  } = useProjectData();
  const { showToast } = useToast();

  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [activeBillId, setActiveBillId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'standard' | 'trade'>('standard');
  const [selectedTradeFilter, setSelectedTradeFilter] = useState<string>('ALL');

  const [isLibraryWindowOpen, setIsLibraryWindowOpen] = useState(false);
  const [isTradesWindowOpen, setIsTradesWindowOpen] = useState(false);
  const [isTenderViewOpen, setIsTenderViewOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isCostReportsHubOpen, setIsCostReportsHubOpen] = useState(false);
  const [isCostPlanOpen, setIsCostPlanOpen] = useState(false);
  const [isAskAiOpen, setIsAskAiOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [helpContextId, setHelpContextId] = useState<HelpContextId>('HOME');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [walkthroughContextId, setWalkthroughContextId] = useState<HelpContextId | null>(null);
  const [walkthroughStepIndex, setWalkthroughStepIndex] = useState(0);

  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);

  const currentProject = useMemo(
    () => projects.find((p) => p.id === currentProjectId),
    [projects, currentProjectId]
  );
  const activeBill = useMemo(() => {
    if (!currentProject) return null;
    return currentProject.bills.find((b) => b.id === activeBillId) || null;
  }, [currentProject, activeBillId]);
  const auditedSaveNow = useCallback(async () => {
    try {
      const backend = await saveNow();
      recordOperationLogEntry({
        kind: 'save',
        status: 'success',
        subject: 'Manual save',
        message: `Manual save completed using ${backend === 'sqlite' ? 'SQLite' : 'local storage'}${currentProject ? ` for ${currentProject.name}` : ''}.`,
        projectId: currentProject?.id,
        projectName: currentProject?.name,
        billId: activeBill?.id,
        billName: activeBill?.name,
      });
      return backend;
    } catch (error) {
      recordOperationLogEntry({
        kind: 'save',
        status: 'error',
        subject: 'Manual save',
        message: error instanceof Error ? error.message : 'Manual save failed.',
        projectId: currentProject?.id,
        projectName: currentProject?.name,
        billId: activeBill?.id,
        billName: activeBill?.name,
        error: error instanceof Error ? error.message : undefined,
        nextStep: 'Check storage diagnostics and export a JSON backup if saving continues to fail.',
      });
      throw error;
    }
  }, [activeBill, currentProject, saveNow]);

  useEffect(() => {
    if (!currentProject) return;
    if (activeBillId && currentProject.bills.some((bill) => bill.id === activeBillId)) return;
    setActiveBillId(getPreferredBillId(currentProject));
  }, [currentProject, activeBillId]);

  const {
    isAiLoading,
    setIsAiLoading,
    isAskingAiQuestions,
    setIsAskingAiQuestions,
    aiClarification,
    setAiClarification,
    aiClarificationPhase,
    setAiClarificationPhase,
    aiAnswers,
    setAiAnswers,
    aiConversationHistory,
    setAiConversationHistory,
    aiFiles,
    setAiFiles,
    resetAiWorkflowFiles,
    promptConfig,
    setPromptConfig,
    handleFileUpload,
    handlePaste,
    handleAiHierarchyGeneration,
    submitAiClarification,
  } = useAiAssistant({
    currentProject,
    libraries,
    setLibraries,
    updateProject,
    setIsPromptOpen,
    showToast,
  });

  const [editorConfig, setEditorConfig] = useState<EditorConfig>({ billId: '', sectionId: '' });
  const [editFormData, setEditFormData] = useState({
    description: '',
    unit: '',
    quantity: 0,
    quantityDecimals: 0,
    rate: 0,
    reference: '',
    tradePackageId: '',
    dimensionRows: [] as DimensionRow[],
    type: 'PRICED' as ItemType,
    aiLocks: {
      description: false,
      rate: false,
      measurements: false,
    },
  });
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [recoverySession, setRecoverySession] = useState<PersistedSessionState | null>(null);
  const [sessionStateLoaded, setSessionStateLoaded] = useState(false);
  const fallbackWarningShownRef = useRef(false);
  const lastLoggedSaveErrorRef = useRef<string | null>(null);

  const [isGeminiConfigured, setIsGeminiConfigured] = useState<boolean | null>(null);
  const [geminiConfigSource, setGeminiConfigSource] = useState<'env' | 'imported' | 'none'>('none');
  const shellFallback = (
    <div className="flex h-screen items-center justify-center bg-surface-50 text-sm font-medium text-slate-500 dark:bg-surface-950 dark:text-slate-300">
      Loading workspace...
    </div>
  );

  const refreshGeminiConfiguration = useCallback(async () => {
    const status = await getGeminiConfigStatus();
    setIsGeminiConfigured(status.configured);
    setGeminiConfigSource(status.source);
  }, []);

  useEffect(() => {
    void refreshGeminiConfiguration();
  }, [refreshGeminiConfiguration]);

  useEffect(() => {
    if (!saveError) return;
    const expectedBrowserFallback = persistenceBackend === 'localStorage'
      && saveError.includes('Primary SQLite storage is unavailable');
    if (lastLoggedSaveErrorRef.current !== saveError) {
      lastLoggedSaveErrorRef.current = saveError;
      recordOperationLogEntry({
        kind: 'save',
        status: 'error',
        subject: 'Autosave issue',
        message: saveError,
        error: saveError,
        nextStep: 'Check Diagnostics, confirm SQLite is available, and export a JSON backup if the warning persists.',
      });
    }
    if (!expectedBrowserFallback) {
      showToast({ type: 'error', message: `Autosave issue: ${saveError}` });
    }
  }, [persistenceBackend, saveError, showToast]);

  const openHelp = useCallback((contextId?: HelpContextId) => {
    if (contextId) setHelpContextId(contextId);
    setIsHelpOpen(true);
  }, []);

  const closeHelp = useCallback(() => {
    setIsHelpOpen(false);
  }, []);

  const closeWalkthrough = useCallback(() => {
    setWalkthroughContextId(null);
    setWalkthroughStepIndex(0);
  }, []);

  const startWalkthrough = useCallback((contextId?: HelpContextId, stepId?: string) => {
    const nextContext = contextId || helpContextId;
    const steps = getHelpArticle(nextContext).walkthroughSteps || [];
    const initialIndex = stepId ? Math.max(0, steps.findIndex((step) => step.id === stepId)) : 0;
    setHelpContextId(nextContext);
    setIsHelpOpen(false);
    setWalkthroughContextId(nextContext);
    setWalkthroughStepIndex(initialIndex >= 0 ? initialIndex : 0);
  }, [helpContextId]);

  const nextWalkthroughStep = useCallback(() => {
    if (!walkthroughContextId) return;
    const steps = getHelpArticle(walkthroughContextId).walkthroughSteps || [];
    if (walkthroughStepIndex >= steps.length - 1) {
      closeWalkthrough();
      return;
    }
    setWalkthroughStepIndex((current) => current + 1);
  }, [closeWalkthrough, walkthroughContextId, walkthroughStepIndex]);

  const previousWalkthroughStep = useCallback(() => {
    setWalkthroughStepIndex((current) => Math.max(0, current - 1));
  }, []);

  useEffect(() => {
    if (!isHydrated || sessionStateLoaded) return;

    let cancelled = false;

    const hydrateSession = async () => {
      const persisted = await loadPersistedSessionState();
      if (cancelled) return;

      if (
        persisted?.wasOpen &&
        persisted.lastProjectId &&
        projects.some((project) => project.id === persisted.lastProjectId)
      ) {
        setRecoverySession(persisted);
      }

      setSessionStateLoaded(true);
    };

    void hydrateSession();

    return () => {
      cancelled = true;
    };
  }, [isHydrated, projects, sessionStateLoaded]);

  useEffect(() => {
    if (!isHydrated || !sessionStateLoaded) return;

    const writeOpenState = () => {
      void persistSessionState({
        lastProjectId: currentProjectId,
        lastBillId: activeBillId,
        wasOpen: true,
        updatedAt: new Date().toISOString(),
      });
    };

    writeOpenState();
  }, [activeBillId, currentProjectId, isHydrated, sessionStateLoaded]);

  useEffect(() => {
    if (!isHydrated || !sessionStateLoaded) return;

    const closeSession = () => {
      void persistSessionState({
        lastProjectId: currentProjectId,
        lastBillId: activeBillId,
        wasOpen: false,
        updatedAt: new Date().toISOString(),
      });
    };

    window.addEventListener('beforeunload', closeSession);
    window.addEventListener('pagehide', closeSession);

    return () => {
      window.removeEventListener('beforeunload', closeSession);
      window.removeEventListener('pagehide', closeSession);
    };
  }, [activeBillId, currentProjectId, isHydrated, sessionStateLoaded]);

  useEffect(() => {
    if (!isHydrated || persistenceBackend !== 'localStorage') return;
    if (fallbackWarningShownRef.current) return;
    fallbackWarningShownRef.current = true;
    recordOperationLogEntry({
      kind: 'system',
      status: 'error',
      subject: 'SQLite unavailable',
      message: 'Primary SQLite storage is unavailable. The app is using temporary browser fallback storage.',
      nextStep: 'Export a JSON backup before closing the app, then restart and check storage diagnostics.',
    });
  }, [isHydrated, persistenceBackend]);

  useEffect(() => {
    if (persistenceBackend === 'sqlite') {
      if (fallbackWarningShownRef.current) {
        recordOperationLogEntry({
          kind: 'system',
          status: 'success',
          subject: 'SQLite restored',
          message: 'Desktop SQLite storage is available again.',
        });
      }
      fallbackWarningShownRef.current = false;
    }
  }, [persistenceBackend]);

  const actions = useAppActions({
    projects,
    currentProject: currentProject ?? null,
    activeBill,
    activeBillId,
    libraries,
    trades,
    appSettings,
    updateProject,
    setProjects,
    setLibraries,
    setTrades,
    setCurrentProjectId,
    setActiveBillId,
    editorConfig,
    setEditorConfig,
    editFormData,
    setEditFormData,
    selectedItemIds,
    setSelectedItemIds,
    setIsEditorOpen,
    setIsPromptOpen,
    setIsAskingAiQuestions,
    setAiClarification,
    setIsAiLoading,
    setAiAnswers,
    setAiFiles,
    resetAiWorkflowFiles,
    setAiClarificationPhase,
    setPromptConfig,
    promptConfig,
    handleAiHierarchyGeneration,
    submitAiClarification,
    showToast,
    setAiSuggestions,
    setAiConversationHistory,
  });

  const appNotices = useMemo<AppNotice[]>(() => {
    const notices: AppNotice[] = [];
    if (isHydrated && persistenceBackend === 'localStorage') {
      notices.push({
        id: 'storage-browser-fallback',
        severity: 'danger',
        source: 'storage',
        message: 'SQLite storage is unavailable. Changes are cached in browser fallback storage; export JSON backups for critical work.',
        actionLabel: currentProject ? 'Export backup' : 'Open diagnostics',
      });
    }
    if (saveError && !(persistenceBackend === 'localStorage' && saveError.includes('Primary SQLite storage is unavailable'))) {
      notices.push({
        id: 'autosave-error',
        severity: 'danger',
        source: 'storage',
        message: saveError,
        actionLabel: 'Open diagnostics',
      });
    }
    if (isGeminiConfigured === false) {
      notices.push({
        id: 'ai-config-missing',
        severity: 'warning',
        source: 'ai',
        message: GEMINI_KEY_MESSAGE,
        actionLabel: 'Open settings',
      });
    }
    return notices;
  }, [currentProject, isGeminiConfigured, isHydrated, persistenceBackend, saveError]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isTyping =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement ||
        activeElement?.getAttribute('contenteditable') === 'true';

      if (!isTyping && (e.ctrlKey || e.metaKey) && !e.altKey && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        const isRedo = e.key.toLowerCase() === 'y' || e.shiftKey;
        const changed = isRedo ? redo() : undo();
        showToast({ type: 'info', message: changed ? (isRedo ? 'Change restored.' : 'Change undone.') : (isRedo ? 'Nothing to redo.' : 'Nothing to undo.') });
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && ((e.shiftKey && e.code === 'Digit1') || e.key === '!')) {
        e.preventDefault();
        setIsShortcutsOpen(true);
        return;
      }
      if (!isTyping && e.shiftKey && e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen(true);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        actions.openPrompt('CREATE_PROJECT');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && e.shiftKey) {
        e.preventDefault();
        if (currentProject) actions.openPrompt('ADD_BILL');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (currentProject) {
          actions.downloadJson(
            currentProject,
            `project-${currentProject.name.replace(/\s+/g, '-').toLowerCase()}.json`
          );
          showToast({ type: 'success', message: 'Project exported.' });
        }
        return;
      }
      if (
        !isEditorOpen &&
        !isPromptOpen &&
        !isLibraryWindowOpen &&
        !isTradesWindowOpen &&
        currentProject &&
        !isTenderViewOpen &&
        !isAnalyticsOpen &&
        !isCostReportsHubOpen &&
        !isSettingsOpen &&
        !isPaletteOpen
      ) {
        if (e.altKey && e.key.toLowerCase() === 's') {
          e.preventDefault();
          actions.openPrompt('ADD_SECTION');
          return;
        }
        if (e.altKey && e.key.toLowerCase() === 'l') {
          e.preventDefault();
          setIsLibraryWindowOpen(true);
          return;
        }
        if (e.altKey && e.key.toLowerCase() === 't') {
          e.preventDefault();
          setIsTenderViewOpen(true);
          return;
        }
        if (e.altKey && e.key === 'n') {
          const targetBill = activeBillId
            ? currentProject.bills.find((b) => b.id === activeBillId)
            : currentProject.bills[0];
          if (targetBill && targetBill.sections.length > 0) {
            const targetSection = targetBill.sections[targetBill.sections.length - 1];
            actions.openEditor(targetBill.id, targetSection.id, undefined, 'PRICED');
            e.preventDefault();
          }
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    isEditorOpen,
    isPromptOpen,
    isLibraryWindowOpen,
    isTradesWindowOpen,
    currentProject,
    activeBillId,
    isTenderViewOpen,
    isAnalyticsOpen,
    isCostReportsHubOpen,
    isSettingsOpen,
    isPaletteOpen,
    setIsLibraryWindowOpen,
    setIsTenderViewOpen,
    setIsShortcutsOpen,
    actions.openPrompt,
    actions.openEditor,
    actions.downloadJson,
    undo,
    redo,
    showToast,
  ]);

  const contextValue = useMemo(
    () => ({
      projects,
      currentProject: currentProject ?? null,
      currentProjectId,
      saveStatus,
      lastSavedAt,
      lastManualSaveAt,
      saveError,
      persistenceBackend,
      isHydrated,
      appNotices,
      appSettings,
      setAppSettings,
      saveNow: auditedSaveNow,
      activeBill,
      activeBillId,
      setCurrentProjectId,
      setActiveBillId,
      updateProject,
      setProjects,
      libraries,
      trades,
      appraisals,
      appraisalHouseTypes,
      appraisalRates,
      workspaceFolders,
      setLibraries,
      setTrades,
      setAppraisals,
      setAppraisalHouseTypes,
      setAppraisalRates,
      setWorkspaceFolders,
      viewMode,
      setViewMode,
      selectedTradeFilter,
      setSelectedTradeFilter,
      selectedItemIds,
      setSelectedItemIds,
      editorConfig,
      setEditorConfig,
      editFormData,
      setEditFormData,
      isEditorOpen,
      setIsEditorOpen,
      isLibraryWindowOpen,
      setIsLibraryWindowOpen,
      isTradesWindowOpen,
      setIsTradesWindowOpen,
      isTenderViewOpen,
      setIsTenderViewOpen,
      isAnalyticsOpen,
      setIsAnalyticsOpen,
      isCostReportsHubOpen,
      setIsCostReportsHubOpen,
      isCostPlanOpen,
      setIsCostPlanOpen,
      isAskAiOpen,
      setIsAskAiOpen,
      isSettingsOpen,
      setIsSettingsOpen,
      isPromptOpen,
      setIsPromptOpen,
      isPaletteOpen,
      setIsPaletteOpen,
      isExporting,
      setIsExporting,
      isVersionHistoryOpen,
      setIsVersionHistoryOpen,
      isShortcutsOpen,
      setIsShortcutsOpen,
      isAiLoading,
      aiSuggestions,
      setAiSuggestions,
      isGeminiConfigured,
      geminiConfigSource,
      refreshGeminiConfiguration,
      helpContextId,
      setHelpContextId,
      isHelpOpen,
      openHelp,
      closeHelp,
      walkthroughContextId,
      walkthroughStepIndex,
      startWalkthrough,
      nextWalkthroughStep,
      previousWalkthroughStep,
      closeWalkthrough,
      promptConfig,
      actions,
    }),
    [
      projects,
      appraisals,
      appraisalHouseTypes,
      appraisalRates,
      workspaceFolders,
      currentProject,
      currentProjectId,
      saveStatus,
      lastSavedAt,
      lastManualSaveAt,
      saveError,
      persistenceBackend,
      isHydrated,
      appNotices,
      appSettings,
      auditedSaveNow,
      activeBill,
      activeBillId,
      updateProject,
      viewMode,
      setViewMode,
      selectedTradeFilter,
      setSelectedTradeFilter,
      selectedItemIds,
      editorConfig,
      editFormData,
      isEditorOpen,
      isLibraryWindowOpen,
      isTradesWindowOpen,
      isTenderViewOpen,
      isAnalyticsOpen,
      isCostReportsHubOpen,
      isCostPlanOpen,
      isAskAiOpen,
      isSettingsOpen,
      isPromptOpen,
      isPaletteOpen,
      isExporting,
      isVersionHistoryOpen,
      isShortcutsOpen,
      isAiLoading,
      aiSuggestions,
      isGeminiConfigured,
      geminiConfigSource,
      refreshGeminiConfiguration,
      helpContextId,
      isHelpOpen,
      openHelp,
      closeHelp,
      walkthroughContextId,
      walkthroughStepIndex,
      startWalkthrough,
      nextWalkthroughStep,
      previousWalkthroughStep,
      closeWalkthrough,
      promptConfig,
      actions,
    ]
  );

  const handleJustGenerate = useCallback(() => {
    if (aiClarificationPhase === 'measurements') {
      setIsAskingAiQuestions(false);
      setAiClarification(null);
      return;
    }
    handleAiHierarchyGeneration(
      promptConfig.defaultValue,
      aiAnswers,
      undefined,
      aiConversationHistory,
      aiFiles,
      promptConfig.context?.aiOptions
    );
  }, [
    aiClarificationPhase,
    setIsAskingAiQuestions,
    setAiClarification,
    promptConfig.defaultValue,
    promptConfig.context?.aiOptions,
    aiAnswers,
    aiConversationHistory,
    aiFiles,
    handleAiHierarchyGeneration,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
        <>
            <Suspense fallback={shellFallback}>
              {!currentProjectId || !currentProject ? (
                <NoProjectView
                  recoverySession={recoverySession}
                  onReopenLastSession={() => {
                    if (!recoverySession?.lastProjectId) return;
                    setCurrentProjectId(recoverySession.lastProjectId);
                    const recoveredProject = projects.find((project) => project.id === recoverySession.lastProjectId);
                    setActiveBillId(recoverySession.lastBillId || getPreferredBillId(recoveredProject));
                    setRecoverySession(null);
                  }}
                  onDismissRecovery={() => setRecoverySession(null)}
                />
              ) : <ProjectView />}
            </Suspense>
            <Suspense fallback={null}>
              <AiClarificationOverlay
                visible={isAskingAiQuestions}
                aiClarification={aiClarification}
                measurementModeEnabled={!!promptConfig.context?.aiOptions?.includeMeasurements}
                aiAnswers={aiAnswers}
                setAiAnswers={setAiAnswers}
                aiFiles={aiFiles}
                setAiFiles={setAiFiles}
                onFileUpload={handleFileUpload}
                onPaste={handlePaste}
                onCancel={() => setIsAskingAiQuestions(false)}
                onJustGenerate={() => {
                  setIsAskingAiQuestions(false);
                  handleJustGenerate();
                }}
                onSubmit={submitAiClarification}
              />
              <AiLoadingOverlay visible={isAiLoading} />
            </Suspense>
            {walkthroughContextId && (
              <HelpWalkthroughOverlay
                steps={getHelpArticle(walkthroughContextId).walkthroughSteps || []}
                stepIndex={walkthroughStepIndex}
                onPrevious={previousWalkthroughStep}
                onNext={nextWalkthroughStep}
                onClose={closeWalkthrough}
              />
            )}
        </>
      </div>
    </AppContext.Provider>
  );
};
