/**
 * Layout when no project is selected: Rail, TopBar, ProjectList, and shared modals.
 */
import React from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import { TitleBar } from './TitleBar';
import { Rail } from './Rail';
import { TopBar } from './TopBar';
import { ProjectList } from '../Project/ProjectList';
import { useAppContext } from '../../contexts/AppContext';
import { useToast } from '../../contexts/ToastContext';
import type { Project, WorkflowModuleId } from '../../types';
import { getPreferredBillId } from '../../utils/projectSelection';
import type { PersistedSessionState } from '../../utils/appPersistence';
import { withAutoSnapshot } from '../../utils/projectSnapshots';
import { resolveWorkflowModuleLaunch } from '../../utils/workflowModules';
import { assignEstimateReferences } from '../../utils/estimateReferences';
import { HelpPanel } from '../Help/HelpPanel';
import { useHelpContext } from '../../hooks/useHelpContext';
import { getHelpArticle } from '../../utils/helpContent';
import { APP_NAME } from '../../utils/branding';
import { ESTIMATE_ONLY } from '../../utils/buildEdition';

const LibraryWindow = React.lazy(() =>
  import('../Library/LibraryWindow').then((module) => ({ default: module.LibraryWindow }))
);
const TradesWindow = React.lazy(() =>
  import('../Trades/TradesWindow').then((module) => ({ default: module.TradesWindow }))
);
const PromptModal = React.lazy(() =>
  import('../Modals/PromptModal').then((module) => ({ default: module.PromptModal }))
);
const ItemEditorModal = React.lazy(() =>
  import('../Modals/ItemEditorModal').then((module) => ({ default: module.ItemEditorModal }))
);
const KeyboardShortcutsModal = React.lazy(() =>
  import('../Modals/KeyboardShortcutsModal').then((module) => ({ default: module.KeyboardShortcutsModal }))
);
const AppSettingsWorkspace = React.lazy(() =>
  import('../Settings/AppSettingsWorkspace').then((module) => ({ default: module.AppSettingsWorkspace }))
);
const AppraisalsWorkspace = React.lazy(() =>
  import('../Appraisals/AppraisalsWorkspace').then((module) => ({ default: module.AppraisalsWorkspace }))
);
const LandFinderWorkspace = React.lazy(() =>
  import('../LandFinder/LandFinderWorkspace').then((module) => ({ default: module.LandFinderWorkspace }))
);
const VersionHistoryModal = React.lazy(() =>
  import('../Modals/VersionHistoryModal').then((module) => ({ default: module.VersionHistoryModal }))
);
const AppDiagnosticsModal = React.lazy(() =>
  import('../Modals/AppDiagnosticsModal').then((module) => ({ default: module.AppDiagnosticsModal }))
);
const AuditTrailModal = React.lazy(() =>
  import('../Modals/AuditTrailModal').then((module) => ({ default: module.AuditTrailModal }))
);
const FutureModulesModal = React.lazy(() =>
  import('../Modals/FutureModulesModal').then((module) => ({ default: module.FutureModulesModal }))
);

export function NoProjectView({
  recoverySession,
  onReopenLastSession,
  onDismissRecovery,
}: {
  recoverySession?: PersistedSessionState | null;
  onReopenLastSession?: () => void;
  onDismissRecovery?: () => void;
}) {
  const lazyModalFallback = null;
  const {
    projects,
    libraries,
    trades,
    saveStatus,
    lastSavedAt,
    persistenceBackend,
    appNotices,
    workspaceFolders,
    setProjects,
    setWorkspaceFolders,
    setLibraries,
    setTrades,
    setCurrentProjectId,
    setActiveBillId,
    isLibraryWindowOpen,
    setIsLibraryWindowOpen,
    isTradesWindowOpen,
    setIsTradesWindowOpen,
    isTenderViewOpen,
    setIsTenderViewOpen,
    setIsAnalyticsOpen,
    isCostReportsHubOpen,
    setIsCostReportsHubOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isVersionHistoryOpen,
    setIsVersionHistoryOpen,
    helpContextId,
    isHelpOpen,
    openHelp,
    closeHelp,
    startWalkthrough,
    isPromptOpen,
    setIsPromptOpen,
    isEditorOpen,
    isShortcutsOpen,
    setIsShortcutsOpen,
    setIsEditorOpen,
    isAiLoading,
    editorConfig,
    editFormData,
    setEditFormData,
    aiSuggestions,
    promptConfig,
    actions,
    appSettings,
  } = useAppContext();
  const { showToast } = useToast();
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = React.useState(false);
  const [isAuditTrailOpen, setIsAuditTrailOpen] = React.useState(false);
  const [isLandFinderOpen, setIsLandFinderOpen] = React.useState(false);
  const [isAppraisalsOpen, setIsAppraisalsOpen] = React.useState(false);
  const [appraisalsInitialWorkspace, setAppraisalsInitialWorkspace] = React.useState<'REGISTER' | 'HOUSE_BUILDING' | 'COMMERCIAL' | 'LIBRARY'>('REGISTER');
  const [appraisalsResetKey, setAppraisalsResetKey] = React.useState(0);
  const [isFutureModulesOpen, setIsFutureModulesOpen] = React.useState(false);
  const [isCreatingSampleProject, setIsCreatingSampleProject] = React.useState(false);
  const [requestedHomeModuleHub, setRequestedHomeModuleHub] = React.useState<WorkflowModuleId | null>(null);
  const [closeHomeModuleHubSignal, setCloseHomeModuleHubSignal] = React.useState(0);
  useHelpContext('HOME');

  React.useEffect(() => {
    if (!ESTIMATE_ONLY) return;
    if (isLibraryWindowOpen) setIsLibraryWindowOpen(false);
    if (isTradesWindowOpen) setIsTradesWindowOpen(false);
    if (isTenderViewOpen) setIsTenderViewOpen(false);
    if (isCostReportsHubOpen) setIsCostReportsHubOpen(false);
    if (isLandFinderOpen) setIsLandFinderOpen(false);
    if (isAppraisalsOpen) setIsAppraisalsOpen(false);
    if (isAuditTrailOpen) setIsAuditTrailOpen(false);
    if (isFutureModulesOpen) setIsFutureModulesOpen(false);
  }, [isLibraryWindowOpen, isTradesWindowOpen, isTenderViewOpen, isCostReportsHubOpen, isLandFinderOpen, isAppraisalsOpen, isAuditTrailOpen, isFutureModulesOpen, setIsLibraryWindowOpen, setIsTradesWindowOpen, setIsTenderViewOpen, setIsCostReportsHubOpen]);

  const editorContext = React.useMemo(() => {
    if (!editorConfig.libId) {
      return { title: undefined, detail: undefined };
    }

    const library = libraries.find((entry) => entry.id === editorConfig.libId);
    const folder = library?.folders.find((entry) => entry.id === editorConfig.folderId);
    const section = folder?.sections.find((entry) => entry.id === editorConfig.libSectionId);

    return {
      title: library ? `${library.name}${folder ? ` / ${folder.name}` : ''}` : 'Library workspace',
      detail: section ? `Editing a reusable item in ${section.name}.` : 'Editing a reusable library item.',
    };
  }, [editorConfig, libraries]);

  const handleCreateSampleProject = React.useCallback(async () => {
    setIsCreatingSampleProject(true);
    try {
      const { createSampleProjectFromLibraries } = await import('../../utils/sampleProject');
      const result = await createSampleProjectFromLibraries(libraries, undefined, undefined, appSettings);
      const project = withAutoSnapshot(
        result.project,
        `Sample project created ${new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`,
        result.source === 'smm7'
          ? 'Automatic baseline restore point for the SMM7-backed sample bill.'
          : 'Automatic baseline restore point for the synthetic sample bill.'
      );
      setProjects((prev) => [...prev, project]);
      setCurrentProjectId(project.id);
      setActiveBillId(getPreferredBillId(project));
      showToast({
        type: result.source === 'smm7' ? 'success' : 'info',
        message: result.message,
        duration: 5000,
      });
    } catch (error) {
      showToast({
        type: 'error',
        message: error instanceof Error
          ? `Sample project could not be created. ${error.message}`
          : 'Sample project could not be created.',
      });
    } finally {
      setIsCreatingSampleProject(false);
    }
  }, [appSettings, libraries, setActiveBillId, setCurrentProjectId, setProjects, showToast]);

  const closeHomeSubwindows = React.useCallback(() => {
    setRequestedHomeModuleHub(null);
    setCloseHomeModuleHubSignal((value) => value + 1);
    setIsLibraryWindowOpen(false);
    setIsTradesWindowOpen(false);
    setIsTenderViewOpen(false);
    setIsAnalyticsOpen(false);
    setIsCostReportsHubOpen(false);
    setIsPromptOpen(false);
    setIsEditorOpen(false);
    setIsSettingsOpen(false);
    setIsDiagnosticsOpen(false);
    setIsAuditTrailOpen(false);
    setIsLandFinderOpen(false);
    setIsAppraisalsOpen(false);
    setIsFutureModulesOpen(false);
    setIsVersionHistoryOpen(false);
    setIsShortcutsOpen(false);
    closeHelp();
  }, [
    closeHelp,
    setIsAnalyticsOpen,
    setIsCostReportsHubOpen,
    setIsEditorOpen,
    setIsLibraryWindowOpen,
    setIsPromptOpen,
    setIsSettingsOpen,
    setIsShortcutsOpen,
    setIsTenderViewOpen,
    setIsTradesWindowOpen,
    setIsVersionHistoryOpen,
  ]);

  const requestRailModuleHub = React.useCallback((moduleId: WorkflowModuleId) => {
    if (ESTIMATE_ONLY && moduleId !== 'ESTIMATING') return;
    closeHomeSubwindows();
    setRequestedHomeModuleHub(moduleId);
  }, [closeHomeSubwindows]);

  const openHomeRoadmap = React.useCallback(() => {
    closeHomeSubwindows();
    setIsFutureModulesOpen(true);
  }, [closeHomeSubwindows]);

  const openHomeAppraisals = React.useCallback(() => {
    closeHomeSubwindows();
    setAppraisalsInitialWorkspace('REGISTER');
    setAppraisalsResetKey((value) => value + 1);
    setIsAppraisalsOpen(true);
  }, [closeHomeSubwindows]);

  const openHomeLandFinder = React.useCallback(() => {
    closeHomeSubwindows();
    setIsLandFinderOpen(true);
  }, [closeHomeSubwindows]);

  const openHomeAppraisalLibraries = React.useCallback(() => {
    closeHomeSubwindows();
    setIsLibraryWindowOpen(false);
    setAppraisalsInitialWorkspace('LIBRARY');
    setIsAppraisalsOpen(true);
  }, [closeHomeSubwindows, setIsLibraryWindowOpen]);

  const openHomeSettings = React.useCallback(() => {
    closeHomeSubwindows();
    setIsSettingsOpen(true);
  }, [closeHomeSubwindows, setIsSettingsOpen]);

  const handleOpenWorkflowModule = React.useCallback((moduleId: WorkflowModuleId, projectId?: string) => {
    if (ESTIMATE_ONLY && moduleId !== 'ESTIMATING') return;
    const target = resolveWorkflowModuleLaunch(moduleId, {
      projectCount: projects.length,
      projectId,
      preferHub: false,
    });
    const project = projectId ? projects.find((entry) => entry.id === projectId) : null;

    closeHomeSubwindows();

    if (target?.type === 'OPEN_PROJECT_MODULE' && project) {
      setCurrentProjectId(project.id);
      setActiveBillId(getPreferredBillId(project));
    }

    switch (target?.type) {
      case 'OPEN_PROJECT_MODULE':
        if (!project) {
          showToast({ type: 'info', message: 'Choose or create a project before opening this module.', duration: 3500 });
          return;
        }
        break;
      case 'OPEN_GLOBAL_MODULE':
        break;
      case 'PREVIEW':
      case 'PROJECT_PICKER':
      case 'PROJECT_REQUIRED':
      case 'MODULE_HUB':
      default:
        if (target?.type === 'PREVIEW') {
          showToast({ type: 'info', message: `${target.module.name} is a coming-soon module in this build.`, duration: 3500 });
        } else {
          showToast({ type: 'info', message: 'Choose or create a project before opening this module.', duration: 3500 });
        }
        return;
    }

    switch (target.module.id) {
      case 'APPRAISALS':
        setAppraisalsInitialWorkspace('REGISTER');
        setIsAppraisalsOpen(true);
        showToast({ type: 'info', message: 'Opened Development Appraisals.', duration: 2500 });
        return;
      case 'ESTIMATING':
        if (project) {
          showToast({ type: 'info', message: `Opened Estimating for ${project.name}.`, duration: 2500 });
        } else {
          showToast({ type: 'info', message: 'Choose or create a project before opening Estimating.', duration: 3500 });
        }
        return;
      case 'LIBRARY_MAINTENANCE':
        setIsLibraryWindowOpen(true);
        showToast({ type: 'info', message: 'Opened Library Maintenance.', duration: 2500 });
        return;
      case 'AUDITS':
        setIsAuditTrailOpen(true);
        showToast({ type: 'info', message: 'Opened Audit Trail.', duration: 2500 });
        return;
      case 'TENDER_ANALYSIS':
        if (project) {
          setIsTenderViewOpen(true);
          showToast({ type: 'info', message: `Opened Tender Analysis for ${project.name}.`, duration: 2500 });
        } else {
          showToast({ type: 'info', message: 'Choose or create a project before opening Tender Analysis.', duration: 3500 });
        }
        return;
      case 'COST_REPORTS':
        if (project) {
          setIsCostReportsHubOpen(true);
          showToast({ type: 'info', message: `Opened Cost Reports for ${project.name}.`, duration: 2500 });
        } else {
          showToast({ type: 'info', message: 'Choose or create a project before opening Cost Reports.', duration: 3500 });
        }
        return;
      default:
        return;
    }
  }, [
    projects,
    closeHomeSubwindows,
    setActiveBillId,
    setIsCostReportsHubOpen,
    setCurrentProjectId,
    setIsLibraryWindowOpen,
    setIsAppraisalsOpen,
    setIsTenderViewOpen,
    showToast,
  ]);

  return (
    <div
      className="flex flex-col h-screen bg-surface-50 dark:bg-surface-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans"
      onDragOver={actions.handleWindowDragOver}
      onDrop={actions.handleWindowDrop}
    >
      <TitleBar />
      <div className="flex flex-1 min-h-0">
        <Rail
          onGoHome={closeHomeSubwindows}
          onOpenLibrary={() => requestRailModuleHub('LIBRARY_MAINTENANCE')}
          onOpenLandFinder={openHomeLandFinder}
          onOpenAppraisals={openHomeAppraisals}
          onOpenEstimating={() => requestRailModuleHub('ESTIMATING')}
          onOpenTender={() => requestRailModuleHub('TENDER_ANALYSIS')}
          onOpenContracts={openHomeRoadmap}
          onOpenValuations={openHomeRoadmap}
          onOpenFinalAccounts={openHomeRoadmap}
          onOpenReports={() => requestRailModuleHub('COST_REPORTS')}
          onOpenAudits={() => requestRailModuleHub('AUDITS')}
          onOpenSettings={openHomeSettings}
          currentProject={null}
          activeLocation={isLandFinderOpen ? 'LAND_FINDER' : isAppraisalsOpen ? 'APPRAISALS' : isSettingsOpen ? 'SETTINGS' : isFutureModulesOpen ? 'ROADMAP' : 'HOME'}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar
            isHome={true}
            appName={APP_NAME}
            onOpenVersionHistory={() => setIsVersionHistoryOpen(true)}
            onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
            onOpenHelp={() => openHelp('HOME')}
            saveStatus={saveStatus}
            lastSavedAt={lastSavedAt}
            persistenceBackend={persistenceBackend}
            systemNotices={appNotices}
          />
          <HelpPanel
            isOpen={isHelpOpen}
            article={getHelpArticle(helpContextId)}
            onClose={closeHelp}
            onStartWalkthrough={(stepId) => startWalkthrough(helpContextId, stepId)}
          />
          {recoverySession && (
            <div className="border-b border-amber-200/80 bg-amber-50/90 px-6 py-3 dark:border-amber-900/60 dark:bg-amber-950/30">
              <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-app bg-amber-100 p-2 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                      Reopen your last workspace?
                    </div>
                    <div className="mt-1 text-sm text-amber-800/85 dark:text-amber-200/85">
                      The previous session may not have closed cleanly. Reopen the last active project and bill, or dismiss this reminder.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={onDismissRecovery} className="workspace-secondary-btn px-3 py-2 text-xs">
                    <X className="h-4 w-4" />
                    Dismiss
                  </button>
                  <button type="button" onClick={onReopenLastSession} className="workspace-primary-btn px-3 py-2 text-xs">
                    <RotateCcw className="h-4 w-4" />
                    Reopen last session
                  </button>
                </div>
              </div>
            </div>
          )}
          <main className="flex min-h-0 flex-1 overflow-hidden bg-surface-50 dark:bg-surface-950">
            {isLandFinderOpen ? (
              <div className="h-full min-w-0 flex-1 p-4">
                <React.Suspense fallback={lazyModalFallback}>
                  <LandFinderWorkspace onClose={() => setIsLandFinderOpen(false)} onOpenAppraisals={openHomeAppraisals} />
                </React.Suspense>
              </div>
            ) : isAppraisalsOpen ? (
              <div className="h-full min-w-0 flex-1 p-4">
                <React.Suspense fallback={lazyModalFallback}>
                  <AppraisalsWorkspace
                    key={`appraisals-${appraisalsResetKey}`}
                    initialWorkspace={appraisalsInitialWorkspace}
                    onClose={() => setIsAppraisalsOpen(false)}
                  />
                </React.Suspense>
              </div>
            ) : isSettingsOpen ? (
              <div className="h-full min-w-0 flex-1 p-4">
                <React.Suspense fallback={lazyModalFallback}>
                  <AppSettingsWorkspace
                    onClose={() => setIsSettingsOpen(false)}
                    onOpenShortcuts={() => setIsShortcutsOpen(true)}
                    onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
                  />
                </React.Suspense>
              </div>
            ) : (
              <ProjectList
                projects={projects}
                onSelectProject={(id: string) => {
                  setCurrentProjectId(id);
                  setActiveBillId(getPreferredBillId(projects.find((p) => p.id === id)));
                }}
                onImportProject={(data: Project | Project[]) => {
                  const incoming = Array.isArray(data) ? data : [data];
                  const existingIds = new Set(projects.map((project) => project.id));
                  const freshProjects = assignEstimateReferences(
                    incoming.filter((project) => !existingIds.has(project.id)),
                    projects
                  );
                  const skipped = incoming.length - freshProjects.length;

                  if (freshProjects.length > 0) {
                    setProjects((prev) => [...prev, ...freshProjects]);
                    setCurrentProjectId(freshProjects[0].id);
                    setActiveBillId(getPreferredBillId(freshProjects[0]));
                  }

                  return { added: freshProjects.length, skipped };
                }}
                onUpdateProject={(id, updates) => {
                  setProjects((prev) => prev.map((project) => (
                    project.id === id ? { ...project, ...updates } : project
                  )));
                }}
                workspaceFolders={workspaceFolders}
                setWorkspaceFolders={setWorkspaceFolders}
                onDeleteProject={(id: string) => setProjects((prev) => prev.filter((p) => p.id !== id))}
                onDownloadProject={(p: Project) => actions.downloadJson(p, `project-${p.name.replace(/\s+/g, '-').toLowerCase()}.json`)}
                onNewProject={() => actions.openPrompt('CREATE_PROJECT')}
                onCreateSampleProject={() => { void handleCreateSampleProject(); }}
                isCreatingSampleProject={isCreatingSampleProject}
                onOpenLibrary={() => setIsLibraryWindowOpen(true)}
                onOpenAppraisalLibraries={openHomeAppraisalLibraries}
                onOpenTrades={() => setIsTradesWindowOpen(true)}
                onOpenShortcuts={() => setIsShortcutsOpen(true)}
                onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
                onOpenAuditTrail={() => setIsAuditTrailOpen(true)}
                onOpenWorkflowModule={handleOpenWorkflowModule}
                requestedModuleHub={requestedHomeModuleHub}
                onConsumeRequestedModuleHub={() => setRequestedHomeModuleHub(null)}
                closeModuleHubSignal={closeHomeModuleHubSignal}
                embedInShell={true}
              />
            )}
          </main>
        </div>
      </div>

      <React.Suspense fallback={lazyModalFallback}>
        {isLibraryWindowOpen && (
          <LibraryWindow
            libraries={libraries}
            setLibraries={setLibraries}
            openPrompt={actions.openPrompt}
            openEditor={actions.openEditor}
            isAiLoading={isAiLoading}
            onImport={() => actions.handleImport(setLibraries, 'Libraries')}
            onExport={(data: unknown, filename: string) => actions.downloadJson(data, filename)}
            onUseInProject={() => {}}
            onClose={() => setIsLibraryWindowOpen(false)}
          />
        )}
        {isTradesWindowOpen && (
          <TradesWindow
            trades={trades}
            setTrades={setTrades}
            onClose={() => setIsTradesWindowOpen(false)}
            onImport={() => actions.handleImport(setTrades, 'Trade Directory')}
            onExport={() => actions.downloadJson(trades, `qs-trades-${new Date().toISOString().split('T')[0]}.json`)}
            onNewTrade={() => actions.openPrompt('CREATE_TRADE')}
            onAddContractor={(tradeId: string) => actions.openPrompt('ADD_CONTRACTOR', { tradeId })}
          />
        )}
        {isPromptOpen && (
          <PromptModal
            config={promptConfig}
            onSubmit={actions.handlePromptSubmit}
            onClose={() => setIsPromptOpen(false)}
          />
        )}
        {isEditorOpen && (
          <ItemEditorModal
            config={editorConfig}
            contextTitle={editorContext.title}
            contextDetail={editorContext.detail}
            trades={trades}
            formData={editFormData}
            setFormData={setEditFormData}
            onSave={actions.handleSaveItem}
            onSaveMultiple={actions.handleSaveMultipleItems}
            onClose={() => setIsEditorOpen(false)}
            onAiFetch={actions.handleAiFetchSuggestions}
            isAiLoading={isAiLoading}
            aiSuggestions={aiSuggestions}
            onSuggestionSelect={actions.onSuggestionSelect}
            onIntervalExpand={actions.handleIntervalExpandAndSave}
          />
        )}
        <VersionHistoryModal
          isOpen={isVersionHistoryOpen}
          onClose={() => setIsVersionHistoryOpen(false)}
        />
        <AppDiagnosticsModal
          isOpen={isDiagnosticsOpen}
          onClose={() => setIsDiagnosticsOpen(false)}
          onOpenSettings={() => {
            setIsDiagnosticsOpen(false);
            setIsSettingsOpen(true);
          }}
          onOpenVersionHistory={() => {
            setIsDiagnosticsOpen(false);
            setIsVersionHistoryOpen(true);
          }}
        />
        <AuditTrailModal
          isOpen={isAuditTrailOpen}
          onClose={() => setIsAuditTrailOpen(false)}
        />
        <FutureModulesModal
          isOpen={isFutureModulesOpen}
          project={null}
          onClose={() => setIsFutureModulesOpen(false)}
        />
        <KeyboardShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      </React.Suspense>
    </div>
  );
}
