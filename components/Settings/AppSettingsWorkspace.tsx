import React from 'react';
import {
  BarChart3,
  CheckCircle2,
  Clipboard,
  Cpu,
  Download,
  FileArchive,
  FileText,
  History,
  KeyRound,
  Keyboard,
  Library,
  Lock,
  Monitor,
  Moon,
  Paintbrush2,
  Save,
  Scale,
  Settings,
  Sun,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { AppraisalTemplate, BillLineFontFamily, BillLineFontSize, BillLineStyleConfig, BillLineStyleKey, BillWorkspaceLayout } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { useTheme, type ThemePreference } from '../../contexts/ThemeContext';
import { useSpellcheckPreference } from '../../hooks/useSpellcheckPreference';
import { useToast } from '../../contexts/ToastContext';
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_BILL_LINE_STYLES,
  applyAppDefaultsToProject,
  buildNewProjectSettingsFromDefaults,
  getEffectiveProjectSettings,
  normalizeAppSettings,
  type AppSettings,
  type AppSettingsSectionId,
} from '../../utils/appSettings';
import {
  importGeminiConfigFromDialog,
  importGeminiConfigFromJson,
  removeGeminiConfig,
  validateAndStoreGeminiConfig,
} from '../../services/geminiConfig';
import { listRecentOperationLogEntries } from '../../utils/operationLog';
import { UK_SITE_COUNTIES, UK_SITE_REGIONS, type UkSiteRegion } from '../../utils/siteLocation';
import { readReleaseSmokeChecklistState } from '../../utils/releaseSmokeChecklist';
import {
  exportAppBackup,
  exportDiagnosticsReport,
  restoreAppBackup,
  type ReleaseSupportContext,
} from '../../utils/releaseSupport';
import {
  createLocalAiModelDirectory,
  getLocalAiStatus,
  loadLocalAiModel,
  startLocalAiServer,
  testLocalAiCompletion,
  type LocalAiStatus,
} from '../../services/localAiService';

const sectionButtonBase = 'flex w-full items-center gap-3 rounded-app border px-3 py-3 text-left text-sm font-semibold transition';
const fieldLabelClass = 'mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500';

const STYLE_LABELS: Record<BillLineStyleKey, string> = {
  GENERAL_HEADING: 'General heading',
  MAJOR_HEADING: 'Major heading',
  SUB_SECTION: 'Sub heading',
  MINOR_HEADING: 'Minor heading',
  COMMENT: 'Comment',
  SUB_COMMENT: 'Sub-comment',
  PRICED: 'Priced item',
  EXTRA_OVER_ITEM: 'Extra over item',
  PROVISIONAL_SUM: 'Provisional sum',
  PC_SUM: 'Prime cost sum',
};

function ToggleCard({
  enabled,
  title,
  detail,
  onClick,
  smokeId,
}: {
  enabled: boolean;
  title: string;
  detail: string;
  onClick: () => void;
  smokeId?: string;
}) {
  return (
    <button
      type="button"
      data-smoke={smokeId}
      onClick={onClick}
      className={`flex w-full items-start justify-between gap-4 rounded-app border p-4 text-left transition ${
        enabled
          ? 'border-primary-300 bg-primary-50 shadow-sm dark:border-primary-700 dark:bg-primary-900/25'
          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-surface-900 dark:hover:border-slate-600'
      }`}
    >
      <span>
        <span className={`block text-sm font-semibold ${enabled ? 'text-primary-700 dark:text-primary-300' : 'text-slate-800 dark:text-slate-100'}`}>
          {title}
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</span>
      </span>
      <span className={`mt-1 flex h-6 w-11 shrink-0 items-center rounded-full px-1 transition-colors ${enabled ? 'bg-primary-500 dark:bg-primary-400' : 'bg-slate-300 dark:bg-slate-600'}`}>
        <span className={`h-4 w-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
      </span>
    </button>
  );
}

function ChoiceCard({
  selected,
  title,
  detail,
  onClick,
}: {
  key?: React.Key;
  selected: boolean;
  title: string;
  detail?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-app border p-4 text-left transition ${
        selected
          ? 'border-primary-300 bg-primary-50 shadow-sm dark:border-primary-700 dark:bg-primary-900/25'
          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-surface-900 dark:hover:border-slate-600'
      }`}
    >
      <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</span>
      {detail && <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</span>}
    </button>
  );
}

function SectionHeading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail?: string }) {
  return (
    <div className="mb-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">{eyebrow}</div>
      <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">{title}</h3>
      {detail && <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{detail}</p>}
    </div>
  );
}

function StatusPill({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <span
      title={detail}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
        ok
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
          : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-surface-800 dark:text-slate-300'
      }`}
    >
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {label}
    </span>
  );
}

function mergeLineStyle(settings: AppSettings, key: BillLineStyleKey): BillLineStyleConfig {
  return {
    ...DEFAULT_BILL_LINE_STYLES[key],
    ...(settings.projectDefaults.billLineStyles[key] || {}),
  };
}

export function AppSettingsWorkspace({
  onClose,
  onOpenShortcuts,
  onOpenDiagnostics,
  onOpenBillSettings,
}: {
  onClose: () => void;
  onOpenShortcuts: () => void;
  onOpenDiagnostics: () => void;
  onOpenBillSettings?: () => void;
}) {
  const {
    appSettings,
    setAppSettings,
    projects,
    libraries,
    trades,
    currentProject,
    activeBill,
    updateProject,
    saveStatus,
    saveError,
    persistenceBackend,
    isHydrated,
    lastSavedAt,
    lastManualSaveAt,
    saveNow,
    isGeminiConfigured,
    geminiConfigSource,
    refreshGeminiConfiguration,
    openHelp,
  } = useAppContext();
  const { preference, setPreference } = useTheme();
  const { preference: spellcheckPreference, setPreference: setSpellcheckPreference } = useSpellcheckPreference();
  const { showToast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [activeSection, setActiveSection] = React.useState<AppSettingsSectionId>(currentProject ? appSettings.general.defaultSection : 'general');
  const [draft, setDraft] = React.useState<AppSettings>(() => normalizeAppSettings(appSettings));
  const [activeStyleKey, setActiveStyleKey] = React.useState<BillLineStyleKey>('GENERAL_HEADING');
  const [isAiConfigBusy, setIsAiConfigBusy] = React.useState(false);
  const [showManualConfig, setShowManualConfig] = React.useState(false);
  const [showApiKey, setShowApiKey] = React.useState(false);
  const [manualApiKey, setManualApiKey] = React.useState('');
  const [manualDefaultModel, setManualDefaultModel] = React.useState('gemini-3.1-pro-preview');
  const [manualAnalysisModel, setManualAnalysisModel] = React.useState('gemini-3.1-pro-preview');
  const [manualHierarchyModel, setManualHierarchyModel] = React.useState('gemini-3.1-pro-preview');
  const [backupExportState, setBackupExportState] = React.useState<'idle' | 'running'>('idle');
  const [backupRestoreState, setBackupRestoreState] = React.useState<'idle' | 'running'>('idle');
  const [diagnosticsExportState, setDiagnosticsExportState] = React.useState<'idle' | 'running'>('idle');
  const [localAiStatus, setLocalAiStatus] = React.useState<LocalAiStatus | null>(null);
  const [localAiBusyAction, setLocalAiBusyAction] = React.useState<'status' | 'mkdir' | 'server' | 'load' | 'test' | null>(null);

  React.useEffect(() => {
    setDraft(normalizeAppSettings(appSettings));
  }, [appSettings]);

  React.useEffect(() => {
    if (!currentProject && activeSection === 'current-project') setActiveSection('general');
  }, [activeSection, currentProject]);

  const currentProjectSettings = getEffectiveProjectSettings(currentProject, appSettings);
  const previewStyle = mergeLineStyle(draft, activeStyleKey);
  const fontPreviewClass = previewStyle.fontFamily === 'aptos-narrow' ? 'font-bill-aptos-narrow' : previewStyle.fontFamily === 'serif' ? 'font-serif' : previewStyle.fontFamily === 'mono' ? 'font-mono' : 'font-sans';

  const updateDraft = (recipe: (settings: AppSettings) => AppSettings) => {
    setDraft((current) => normalizeAppSettings(recipe(current)));
  };

  const updateProjectDefaults = <K extends keyof AppSettings['projectDefaults']>(key: K, value: AppSettings['projectDefaults'][K]) => {
    updateDraft((current) => ({
      ...current,
      projectDefaults: {
        ...current.projectDefaults,
        [key]: value,
      },
    }));
  };

  const updateModuleSettings = <K extends keyof AppSettings['moduleSettings']>(
    moduleId: K,
    updates: Partial<AppSettings['moduleSettings'][K]>
  ) => {
    updateDraft((current) => ({
      ...current,
      moduleSettings: {
        ...current.moduleSettings,
        [moduleId]: {
          ...current.moduleSettings[moduleId],
          ...updates,
        },
      },
    }));
  };

  const updateAiSettings = (updates: Partial<AppSettings['ai']>) => {
    updateDraft((current) => ({
      ...current,
      ai: {
        ...current.ai,
        ...updates,
      },
    }));
  };

  const updateStyle = <K extends keyof BillLineStyleConfig>(key: K, value: BillLineStyleConfig[K]) => {
    updateDraft((current) => ({
      ...current,
      projectDefaults: {
        ...current.projectDefaults,
        billLineStyles: {
          ...current.projectDefaults.billLineStyles,
          [activeStyleKey]: {
            ...mergeLineStyle(current, activeStyleKey),
            [key]: value,
          },
        },
      },
    }));
  };

  const handleSaveDefaults = () => {
    const normalized = normalizeAppSettings(draft);
    setAppSettings(normalized);
    showToast({ type: 'success', message: 'App settings saved.' });
  };

  const handleResetDraft = () => {
    setDraft(normalizeAppSettings(appSettings));
    showToast({ type: 'info', message: 'Unsaved settings changes were reset.' });
  };

  const handleRestoreBuiltInDefaults = () => {
    setDraft(DEFAULT_APP_SETTINGS);
    showToast({ type: 'info', message: 'Built-in defaults loaded. Save settings to keep them.' });
  };

  const handleApplyDefaultsToCurrentProject = () => {
    if (!currentProject) return;
    updateProject(currentProject.id, buildNewProjectSettingsFromDefaults(draft));
    showToast({ type: 'success', message: `Applied app defaults to ${currentProject.name}.` });
  };

  const handleCurrentProjectWorkspaceLayout = (layout: BillWorkspaceLayout) => {
    if (!currentProject) return;
    updateProject(currentProject.id, { billWorkspaceLayout: layout });
    showToast({
      type: 'success',
      message: layout === 'FOCUSED_SECTION'
        ? 'Section clicks now focus the selected section.'
        : 'Section clicks now jump within the full bill.',
      duration: 2600,
    });
  };

  const handleImportAiConfig = async () => {
    try {
      setIsAiConfigBusy(true);
      const status = await importGeminiConfigFromDialog();
      if (!status) {
        setIsAiConfigBusy(false);
        fileInputRef.current?.click();
        return;
      }
      await refreshGeminiConfiguration();
      showToast({ type: 'success', message: 'AI configuration imported.' });
    } catch {
      fileInputRef.current?.click();
    } finally {
      setIsAiConfigBusy(false);
    }
  };

  const handleAiConfigFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setIsAiConfigBusy(true);
      await importGeminiConfigFromJson(await file.text());
      await refreshGeminiConfiguration();
      showToast({ type: 'success', message: 'AI configuration imported.' });
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to import AI configuration.' });
    } finally {
      setIsAiConfigBusy(false);
    }
  };

  const handleRemoveAiConfig = async () => {
    try {
      setIsAiConfigBusy(true);
      await removeGeminiConfig();
      await refreshGeminiConfiguration();
      showToast({ type: 'info', message: 'Imported AI configuration removed.' });
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to remove AI configuration.' });
    } finally {
      setIsAiConfigBusy(false);
    }
  };

  const handleManualAiConfigSave = async () => {
    try {
      setIsAiConfigBusy(true);
      await validateAndStoreGeminiConfig({
        provider: 'gemini',
        apiKey: manualApiKey,
        defaultModel: manualDefaultModel,
        analysisModel: manualAnalysisModel,
        hierarchyModel: manualHierarchyModel,
      });
      await refreshGeminiConfiguration();
      setShowManualConfig(false);
      setShowApiKey(false);
      setManualApiKey('');
      showToast({ type: 'success', message: 'AI configuration validated and stored securely.' });
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to validate AI configuration.' });
    } finally {
      setIsAiConfigBusy(false);
    }
  };

  const refreshLocalAiStatus = async (toastOnSuccess = false) => {
    try {
      setLocalAiBusyAction('status');
      const status = await getLocalAiStatus(draft.ai);
      setLocalAiStatus(status);
      if (toastOnSuccess) showToast({ type: status.configuredModelLoaded ? 'success' : 'info', message: status.message });
      return status;
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to check local AI.' });
      return null;
    } finally {
      setLocalAiBusyAction(null);
    }
  };

  const handleCreateLocalModelDir = async () => {
    try {
      setLocalAiBusyAction('mkdir');
      const result = await createLocalAiModelDirectory(draft.ai);
      showToast({ type: result.ok ? 'success' : 'error', message: result.message });
      await refreshLocalAiStatus();
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to create local model folder.' });
    } finally {
      setLocalAiBusyAction(null);
    }
  };

  const handleStartLocalAiServer = async () => {
    try {
      setLocalAiBusyAction('server');
      const result = await startLocalAiServer();
      showToast({ type: result.ok ? 'success' : 'error', message: result.message });
      await refreshLocalAiStatus();
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to start LM Studio server.' });
    } finally {
      setLocalAiBusyAction(null);
    }
  };

  const handleLoadLocalAiModel = async () => {
    try {
      setLocalAiBusyAction('load');
      const result = await loadLocalAiModel(draft.ai.localModel);
      showToast({ type: result.ok ? 'success' : 'error', message: result.message });
      await refreshLocalAiStatus();
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Unable to load local model.' });
    } finally {
      setLocalAiBusyAction(null);
    }
  };

  const handleTestLocalAi = async () => {
    try {
      setLocalAiBusyAction('test');
      const result = await testLocalAiCompletion(draft.ai);
      showToast({ type: result.ok ? 'success' : 'error', message: `${result.message}${result.output ? ` ${result.output}` : ''}` });
      await refreshLocalAiStatus();
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Local AI test failed.' });
    } finally {
      setLocalAiBusyAction(null);
    }
  };

  const buildReleaseSupportContext = (): ReleaseSupportContext => ({
    projects,
    libraries,
    trades,
    appSettings,
    persistenceBackend,
    isHydrated,
    saveStatus,
    saveError,
    lastSavedAt,
    lastManualSaveAt,
    isGeminiConfigured,
    geminiConfigSource,
    currentProject,
    activeBill,
    releaseChecklistState: readReleaseSmokeChecklistState(),
    recentOperations: listRecentOperationLogEntries(50),
  });

  const handleExportBackup = async () => {
    if (backupExportState === 'running') return;
    setBackupExportState('running');
    try {
      const result = await exportAppBackup(buildReleaseSupportContext(), saveNow);
      showToast({
        type: result.status === 'success' ? 'success' : 'info',
        message: result.status === 'success'
          ? result.method === 'sqlite'
            ? 'Full SQLite app backup exported.'
            : 'App-state JSON backup exported.'
          : 'Backup export cancelled.',
      });
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Backup export failed.' });
    } finally {
      setBackupExportState('idle');
    }
  };

  const handleRestoreBackup = async () => {
    if (backupRestoreState === 'running') return;
    setBackupRestoreState('running');
    try {
      const result = await restoreAppBackup(buildReleaseSupportContext(), saveNow);
      if (result.status === 'success') {
        showToast({ type: 'success', message: 'Backup restored and verified. Reloading the app...' });
        window.setTimeout(() => window.location.reload(), 650);
      } else {
        showToast({ type: 'info', message: 'Backup restore cancelled.' });
      }
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Backup restore failed.' });
    } finally {
      setBackupRestoreState('idle');
    }
  };

  const handleExportDiagnosticsReport = async () => {
    if (diagnosticsExportState === 'running') return;
    setDiagnosticsExportState('running');
    try {
      const result = await exportDiagnosticsReport(buildReleaseSupportContext());
      showToast({
        type: result.status === 'success' ? 'success' : 'info',
        message: result.status === 'success' ? 'Diagnostics report exported.' : 'Diagnostics export cancelled.',
      });
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Diagnostics export failed.' });
    } finally {
      setDiagnosticsExportState('idle');
    }
  };

  const sectionButtons: Array<{ id: AppSettingsSectionId; label: string; icon: React.ReactNode; disabled?: boolean }> = [
    { id: 'general', label: 'General', icon: <Settings className="h-4 w-4" /> },
    { id: 'project-defaults', label: 'Project defaults', icon: <FileText className="h-4 w-4" /> },
    { id: 'module-settings', label: 'Module settings', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'current-project', label: 'Current project', icon: <CheckCircle2 className="h-4 w-4" />, disabled: !currentProject },
  ];

  return (
    <div data-smoke="settings-workspace" className="flex h-full min-h-0 flex-col overflow-hidden rounded-app-xl border border-slate-200/80 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f5_100%)] shadow-card dark:border-slate-700/80 dark:bg-[linear-gradient(180deg,#0f161b_0%,#0d1318_100%)]">
      <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleAiConfigFileChange} />
      <header className="border-b border-slate-200/80 bg-white/92 px-6 py-5 dark:border-slate-700/80 dark:bg-surface-900/95">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="workspace-chip mb-3">
              <Settings className="h-3.5 w-3.5" />
              Settings
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">App settings and release defaults</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-300">
              Control app-wide behaviour, new-project defaults, and module-specific settings from one left-rail workspace.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => openHelp('APP_PREFERENCES')} className="workspace-secondary-btn px-3 py-2 text-xs">Help</button>
            <button type="button" onClick={onClose} className="workspace-secondary-btn px-3 py-2 text-xs" aria-label="Close settings">
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[18rem_minmax(0,1fr)] overflow-hidden">
        <aside className="border-r border-slate-200/80 bg-white/78 p-4 dark:border-slate-800 dark:bg-surface-950/70">
          <div className="space-y-2">
            {sectionButtons.map((button) => {
              const active = activeSection === button.id;
              return (
                <button
                  key={button.id}
                  type="button"
                  disabled={button.disabled}
                  onClick={() => !button.disabled && setActiveSection(button.id)}
                  data-smoke={`settings-section-${button.id}`}
                  className={`${sectionButtonBase} ${
                    active
                      ? 'border-primary-300 bg-primary-50 text-primary-800 shadow-sm dark:border-primary-700 dark:bg-primary-900/25 dark:text-primary-200'
                      : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-white dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-surface-900'
                  } disabled:cursor-not-allowed disabled:opacity-45`}
                >
                  {button.icon}
                  {button.label}
                </button>
              );
            })}
          </div>
          <div className="mt-5 rounded-app border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-500 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-400">
            <div className="font-semibold text-slate-800 dark:text-slate-100">Save state</div>
            <div className="mt-1">{saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Storage needs attention'}</div>
            <div className="mt-1">{persistenceBackend === 'sqlite' ? 'Desktop SQLite' : 'Browser fallback'}</div>
            {lastSavedAt && <div className="mt-1">Last saved {new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
          </div>
        </aside>

        <main className="min-h-0 overflow-y-auto p-6">
          {activeSection === 'general' && (
            <div className="grid gap-5 xl:grid-cols-2">
              <section className="workspace-sidebar p-5">
                <SectionHeading eyebrow="Appearance" title="Theme preference" />
                <div className="grid gap-3 sm:grid-cols-3">
                  {([
                    { value: 'light' as ThemePreference, label: 'Light', icon: Sun },
                    { value: 'dark' as ThemePreference, label: 'Dark', icon: Moon },
                    { value: 'system' as ThemePreference, label: 'System', icon: Monitor },
                  ]).map(({ value, label, icon: Icon }) => (
                    <ChoiceCard key={value} selected={preference === value} title={label} onClick={() => setPreference(value)} detail={value === 'system' ? 'Follow OS' : value === 'dark' ? 'Reduced glare' : 'Bright workspace'} />
                  ))}
                </div>
              </section>

              <section className="workspace-sidebar p-5">
                <SectionHeading eyebrow="Writing tools" title="Spell check" />
                <ToggleCard
                  enabled={spellcheckPreference.enabled}
                  title="Desktop spelling assistance"
                  detail="Use browser-native spell checking in editors and text areas."
                  onClick={() => setSpellcheckPreference({ ...spellcheckPreference, enabled: !spellcheckPreference.enabled })}
                />
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <ChoiceCard selected={spellcheckPreference.language === 'en-GB'} title="UK English" detail="Default QS wording" onClick={() => setSpellcheckPreference({ ...spellcheckPreference, language: 'en-GB' })} />
                  <ChoiceCard selected={spellcheckPreference.language === 'en-US'} title="US English" detail="Alternative dictionary" onClick={() => setSpellcheckPreference({ ...spellcheckPreference, language: 'en-US' })} />
                </div>
              </section>

              <section className="workspace-sidebar p-5">
                <SectionHeading eyebrow="Navigation help" title="Keyboard and diagnostics" />
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={onOpenShortcuts} className="workspace-secondary-btn px-4 py-2 text-sm">
                    <Keyboard className="h-4 w-4" />
                    Keyboard shortcuts
                  </button>
                  <button type="button" onClick={onOpenDiagnostics} className="workspace-secondary-btn px-4 py-2 text-sm">
                    <Monitor className="h-4 w-4" />
                    Diagnostics
                  </button>
                </div>
              </section>

              <section className="workspace-sidebar p-5">
                <SectionHeading eyebrow="Support consent" title="Local crash reports" detail="Keep error details on this device so they can be included in a diagnostics handoff. Nothing is transmitted automatically." />
                <ToggleCard
                  enabled={draft.general.crashReportingEnabled}
                  title="Record local crash reports"
                  detail="Capture unexpected render and browser errors locally after this setting is saved. You control whether to export them."
                  onClick={() => updateDraft((current) => ({
                    ...current,
                    general: { ...current.general, crashReportingEnabled: !current.general.crashReportingEnabled },
                  }))}
                />
              </section>

              <section className="workspace-sidebar p-5">
                <SectionHeading eyebrow="Release channel" title="Installed build track" detail="Stable is the normal supported route. Pilot is reserved for named, supported trial users and does not download updates automatically." />
                <div className="grid gap-3 sm:grid-cols-2">
                  <ChoiceCard selected={draft.general.releaseChannel === 'STABLE'} title="Stable" detail="General supported release" onClick={() => updateDraft((current) => ({ ...current, general: { ...current.general, releaseChannel: 'STABLE' } }))} />
                  <ChoiceCard selected={draft.general.releaseChannel === 'PILOT'} title="Pilot" detail="Controlled trial release" onClick={() => updateDraft((current) => ({ ...current, general: { ...current.general, releaseChannel: 'PILOT' } }))} />
                </div>
              </section>

              <section className="workspace-sidebar p-5 xl:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <SectionHeading
                    eyebrow="Release support"
                    title="Backup and diagnostics export"
                    detail="Create a one-click app backup and a shareable diagnostics report before installer testing, risky imports, or support handoff."
                  />
                  <div className="rounded-app border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-300">
                    {persistenceBackend === 'sqlite' ? 'Desktop SQLite backup' : 'Browser JSON backup'}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleExportBackup}
                    disabled={backupExportState === 'running'}
                    className="workspace-primary-btn px-4 py-2 text-sm disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" />
                      {backupExportState === 'running' ? 'Backing up...' : 'Backup now'}
                    </button>
                    <button
                      type="button"
                      onClick={handleRestoreBackup}
                      disabled={persistenceBackend !== 'sqlite' || backupRestoreState === 'running'}
                      className="workspace-secondary-btn px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {backupRestoreState === 'running' ? 'Restoring...' : 'Restore backup'}
                    </button>
                  <button
                    type="button"
                    onClick={handleExportDiagnosticsReport}
                    disabled={diagnosticsExportState === 'running'}
                    className="workspace-secondary-btn px-4 py-2 text-sm disabled:opacity-60"
                  >
                    <Clipboard className="h-4 w-4" />
                    {diagnosticsExportState === 'running' ? 'Exporting...' : 'Export diagnostics bundle'}
                  </button>
                  <button type="button" onClick={onOpenDiagnostics} className="workspace-secondary-btn px-4 py-2 text-sm">
                    <FileArchive className="h-4 w-4" />
                    Open release checklist
                  </button>
                </div>
              </section>

              <section className="workspace-sidebar p-5">
                <SectionHeading eyebrow="AI configuration" title="Private desktop AI access" />
                <div className="flex flex-wrap items-center gap-3">
                  <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                    isGeminiConfigured
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-surface-800 dark:text-slate-300'
                  }`}>
                    <KeyRound className="h-3.5 w-3.5" />
                    {isGeminiConfigured ? 'Configured' : 'Not configured'}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Source: {geminiConfigSource === 'env' ? 'Local developer environment' : geminiConfigSource === 'imported' ? 'Imported private JSON' : 'None'}</div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={handleImportAiConfig} disabled={isAiConfigBusy} className="workspace-secondary-btn">
                    <Upload className="h-4 w-4" />
                    {isGeminiConfigured ? 'Replace AI config' : 'Import AI config'}
                  </button>
                  <button type="button" onClick={handleRemoveAiConfig} disabled={isAiConfigBusy || geminiConfigSource !== 'imported'} className="workspace-secondary-btn">
                    <Trash2 className="h-4 w-4" />
                    Remove imported config
                  </button>
                  <button type="button" onClick={() => setShowManualConfig((value) => !value)} disabled={isAiConfigBusy} className="workspace-secondary-btn">
                    <Lock className="h-4 w-4" />
                    {showManualConfig ? 'Hide manual setup' : 'Enter manually'}
                  </button>
                </div>
                {showManualConfig && (
                  <div className="mt-5 rounded-app-lg border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700 dark:bg-surface-950/60">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-sm md:col-span-2">
                        <div className={fieldLabelClass}>API key</div>
                        <div className="flex gap-2">
                          <input type={showApiKey ? 'text' : 'password'} value={manualApiKey} onChange={(event) => setManualApiKey(event.target.value)} placeholder="Paste your Gemini API key" className="workspace-input" />
                          <button type="button" onClick={() => setShowApiKey((value) => !value)} className="workspace-secondary-btn px-3">{showApiKey ? 'Hide' : 'Show'}</button>
                        </div>
                      </label>
                      <label className="text-sm">
                        <div className={fieldLabelClass}>Default model</div>
                        <input value={manualDefaultModel} onChange={(event) => setManualDefaultModel(event.target.value)} className="workspace-input" />
                      </label>
                      <label className="text-sm">
                        <div className={fieldLabelClass}>Analysis model</div>
                        <input value={manualAnalysisModel} onChange={(event) => setManualAnalysisModel(event.target.value)} className="workspace-input" />
                      </label>
                      <label className="text-sm md:col-span-2">
                        <div className={fieldLabelClass}>Hierarchy model</div>
                        <input value={manualHierarchyModel} onChange={(event) => setManualHierarchyModel(event.target.value)} className="workspace-input" />
                      </label>
                    </div>
                    <button type="button" onClick={handleManualAiConfigSave} disabled={isAiConfigBusy || !manualApiKey.trim()} className="workspace-primary-btn mt-4">
                      <KeyRound className="h-4 w-4" />
                      Validate and store securely
                    </button>
                  </div>
                )}
                <div className="mt-5 rounded-app-lg border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700 dark:bg-surface-950/60">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        <Cpu className="h-4 w-4" />
                        Local AI via LM Studio
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Keep LM Studio as the runtime, set its model directory to C:\models, then use this app to check, start, load, and test the local server.
                      </p>
                    </div>
                    <StatusPill label={draft.ai.providerMode === 'LOCAL_LM_STUDIO' ? 'Local' : draft.ai.providerMode === 'GEMINI' ? 'Gemini' : 'Auto'} ok />
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <ChoiceCard
                      selected={draft.ai.providerMode === 'AUTO'}
                      title="Auto"
                      detail="Use local AI when ready, then Gemini, then fallback."
                      onClick={() => updateAiSettings({ providerMode: 'AUTO' })}
                    />
                    <ChoiceCard
                      selected={draft.ai.providerMode === 'GEMINI'}
                      title="Gemini"
                      detail="Use the imported cloud AI configuration only."
                      onClick={() => updateAiSettings({ providerMode: 'GEMINI' })}
                    />
                    <ChoiceCard
                      selected={draft.ai.providerMode === 'LOCAL_LM_STUDIO'}
                      title="Local LM Studio"
                      detail="Use the local model and do not fall back to Gemini."
                      onClick={() => updateAiSettings({ providerMode: 'LOCAL_LM_STUDIO' })}
                    />
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <label className="text-sm">
                      <div className={fieldLabelClass}>Local endpoint</div>
                      <input value={draft.ai.localEndpoint} onChange={(event) => updateAiSettings({ localEndpoint: event.target.value })} className="workspace-input" />
                    </label>
                    <label className="text-sm">
                      <div className={fieldLabelClass}>Model folder</div>
                      <input value={draft.ai.localModelDirectory} onChange={(event) => updateAiSettings({ localModelDirectory: event.target.value })} className="workspace-input" />
                    </label>
                    <label className="text-sm">
                      <div className={fieldLabelClass}>Model profile</div>
                      <select
                        value={draft.ai.localSetupProfile}
                        onChange={(event) => updateAiSettings({ localSetupProfile: event.target.value === 'CUSTOM' ? 'CUSTOM' : 'QWEN_14B_Q4' })}
                        className="workspace-input"
                      >
                        <option value="QWEN_14B_Q4">Qwen 14B instruct, Q4 class</option>
                        <option value="CUSTOM">Custom</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      <div className={fieldLabelClass}>Local model id</div>
                      <input
                        list="local-ai-loaded-models"
                        value={draft.ai.localModel}
                        onChange={(event) => updateAiSettings({ localModel: event.target.value })}
                        className="workspace-input"
                        placeholder="hzl-local-report or LM Studio model id"
                      />
                      <datalist id="local-ai-loaded-models">
                        {(localAiStatus?.loadedModels || []).map((model) => <option key={model} value={model} />)}
                      </datalist>
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusPill label="lms CLI" ok={Boolean(localAiStatus?.cliAvailable)} detail={localAiStatus?.cliPath || undefined} />
                    <StatusPill label="Server" ok={Boolean(localAiStatus?.serverAvailable)} detail={localAiStatus?.endpoint} />
                    <StatusPill label="Model" ok={Boolean(localAiStatus?.configuredModelLoaded)} detail={(localAiStatus?.loadedModels || []).join(', ')} />
                    <StatusPill label="GPU" ok={Boolean(localAiStatus?.gpuDetected)} detail={localAiStatus?.gpuSummary || undefined} />
                    <StatusPill label="C:\\models" ok={Boolean(localAiStatus?.modelDirectoryExists)} detail={localAiStatus?.modelDirectory} />
                  </div>
                  {localAiStatus && <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{localAiStatus.message}</p>}

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" onClick={handleCreateLocalModelDir} disabled={Boolean(localAiBusyAction)} className="workspace-secondary-btn">
                      <Monitor className="h-4 w-4" />
                      {localAiBusyAction === 'mkdir' ? 'Creating...' : 'Create C:\\models'}
                    </button>
                    <button type="button" onClick={() => { void refreshLocalAiStatus(true); }} disabled={Boolean(localAiBusyAction)} className="workspace-secondary-btn">
                      <CheckCircle2 className="h-4 w-4" />
                      {localAiBusyAction === 'status' ? 'Checking...' : 'Check local AI'}
                    </button>
                    <button type="button" onClick={handleStartLocalAiServer} disabled={Boolean(localAiBusyAction)} className="workspace-secondary-btn">
                      <Monitor className="h-4 w-4" />
                      {localAiBusyAction === 'server' ? 'Starting...' : 'Start server'}
                    </button>
                    <button type="button" onClick={handleLoadLocalAiModel} disabled={Boolean(localAiBusyAction) || !draft.ai.localModel.trim()} className="workspace-secondary-btn">
                      <Cpu className="h-4 w-4" />
                      {localAiBusyAction === 'load' ? 'Loading...' : 'Load model'}
                    </button>
                    <button type="button" onClick={handleTestLocalAi} disabled={Boolean(localAiBusyAction) || !draft.ai.localModel.trim()} className="workspace-primary-btn">
                      <KeyRound className="h-4 w-4" />
                      {localAiBusyAction === 'test' ? 'Testing...' : 'Test prompt'}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeSection === 'project-defaults' && (
            <div className="grid gap-5 xl:grid-cols-[1fr_1.1fr]">
              <section className="workspace-sidebar p-5">
                <SectionHeading eyebrow="New project defaults" title="Commercial and workspace defaults" detail="These values apply to new projects, sample projects, and AI-created projects. Imported projects keep their embedded settings." />
                <div className="grid gap-3 md:grid-cols-2">
                  <ChoiceCard selected={draft.projectDefaults.measurementStandard === 'SMM7'} title="SMM7" detail="Traditional UK measurement method" onClick={() => updateProjectDefaults('measurementStandard', 'SMM7')} />
                  <ChoiceCard selected={draft.projectDefaults.measurementStandard === 'NRM2'} title="NRM2" detail="Modern detailed measurement standard" onClick={() => updateProjectDefaults('measurementStandard', 'NRM2')} />
                  <ChoiceCard selected={draft.projectDefaults.billWorkspaceMode === 'CLEAN'} title="Clean workspace" detail="Quieter expert mode" onClick={() => updateProjectDefaults('billWorkspaceMode', 'CLEAN')} />
                  <ChoiceCard selected={draft.projectDefaults.billWorkspaceMode === 'GUIDED'} title="Guided workspace" detail="Shows extra coaching panels" onClick={() => updateProjectDefaults('billWorkspaceMode', 'GUIDED')} />
                  <ChoiceCard selected={draft.projectDefaults.billWorkspaceLayout === 'FULL_BILL'} title="Full bill" detail="Section clicks scroll through one continuous bill." onClick={() => updateProjectDefaults('billWorkspaceLayout', 'FULL_BILL')} />
                  <ChoiceCard selected={draft.projectDefaults.billWorkspaceLayout === 'FOCUSED_SECTION'} title="Focused section" detail="Section clicks show only the selected section." onClick={() => updateProjectDefaults('billWorkspaceLayout', 'FOCUSED_SECTION')} />
                </div>
                <label className="mt-4 block text-sm">
                  <div className={fieldLabelClass}>Default markup %</div>
                  <input type="number" step="0.5" value={draft.projectDefaults.ohpPercentage} onChange={(event) => updateProjectDefaults('ohpPercentage', parseFloat(event.target.value) || 0)} className="workspace-input max-w-xs" />
                </label>
                <div className="mt-4 grid gap-3">
                  <ToggleCard smokeId="settings-sticky-totals-toggle" enabled={draft.projectDefaults.showStickyBillTotals} title="Sticky bill totals" detail="Show movable totals in the bill workspace by default." onClick={() => updateProjectDefaults('showStickyBillTotals', !draft.projectDefaults.showStickyBillTotals)} />
                  <ToggleCard enabled={draft.projectDefaults.showWorkflowGuidance} title="Workflow guidance" detail="Show coaching panels in new guided workspaces." onClick={() => updateProjectDefaults('showWorkflowGuidance', !draft.projectDefaults.showWorkflowGuidance)} />
                  <ToggleCard enabled={draft.projectDefaults.autoSnapshotsEnabled} title="Auto-snapshots before risky actions" detail="Create restore points before imports, AI bulk generation, and tender apply-back." onClick={() => updateProjectDefaults('autoSnapshotsEnabled', !draft.projectDefaults.autoSnapshotsEnabled)} />
                  <ToggleCard enabled={draft.projectDefaults.renumberNumericBillsOnReorder} title="Renumber numeric bill names" detail="Rename Bill 1, Bill 2 style names when bills are reordered." onClick={() => updateProjectDefaults('renumberNumericBillsOnReorder', !draft.projectDefaults.renumberNumericBillsOnReorder)} />
                </div>
              </section>

              <section className="workspace-sidebar p-5">
                <SectionHeading eyebrow="Bill line style defaults" title="Default visual styling" detail="These styles seed new projects. Current projects keep their own style overrides until defaults are applied." />
                <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
                  <div className="space-y-2">
                    {(Object.keys(STYLE_LABELS) as BillLineStyleKey[]).map((key) => (
                      <button key={key} type="button" onClick={() => setActiveStyleKey(key)} className={`${sectionButtonBase} ${activeStyleKey === key ? 'border-primary-300 bg-primary-50 text-primary-800 dark:border-primary-700 dark:bg-primary-900/25 dark:text-primary-200' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-200'}`}>
                        <Paintbrush2 className="h-4 w-4" />
                        {STYLE_LABELS[key]}
                      </button>
                    ))}
                  </div>
                  <div>
                    <div className={`rounded-app border border-slate-200/80 px-4 py-3 ${fontPreviewClass} ${previewStyle.bold ? 'font-semibold' : 'font-normal'} ${previewStyle.italic ? 'italic' : ''} ${previewStyle.underline ? 'underline underline-offset-4' : ''} ${previewStyle.uppercase ? 'uppercase' : ''} ${previewStyle.fontSize === 'xs' ? 'text-xs' : previewStyle.fontSize === 'base' ? 'text-base' : previewStyle.fontSize === 'lg' ? 'text-lg' : 'text-sm'}`} style={{ color: previewStyle.fontColor, backgroundColor: previewStyle.backgroundColor === 'transparent' ? undefined : previewStyle.backgroundColor }}>
                      {STYLE_LABELS[activeStyleKey]} preview
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="text-sm">
                        <div className={fieldLabelClass}>Font family</div>
                        <select value={previewStyle.fontFamily} onChange={(event) => updateStyle('fontFamily', event.target.value as BillLineFontFamily)} className="workspace-input">
                          <option value="aptos-narrow">Aptos Narrow</option>
                          <option value="sans">Sans</option>
                          <option value="serif">Serif</option>
                          <option value="mono">Mono</option>
                        </select>
                      </label>
                      <label className="text-sm">
                        <div className={fieldLabelClass}>Text size</div>
                        <select value={previewStyle.fontSize} onChange={(event) => updateStyle('fontSize', event.target.value as BillLineFontSize)} className="workspace-input">
                          <option value="xs">Extra small</option>
                          <option value="sm">Small</option>
                          <option value="base">Base</option>
                          <option value="lg">Large</option>
                        </select>
                      </label>
                      <label className="text-sm">
                        <div className={fieldLabelClass}>Font colour</div>
                        <input type="color" value={previewStyle.fontColor} onChange={(event) => updateStyle('fontColor', event.target.value)} className="h-10 w-full rounded border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-surface-950" />
                      </label>
                      <label className="text-sm">
                        <div className={fieldLabelClass}>Background colour</div>
                        <input type="color" value={previewStyle.backgroundColor === 'transparent' ? DEFAULT_BILL_LINE_STYLES[activeStyleKey].backgroundColor : previewStyle.backgroundColor} onChange={(event) => updateStyle('backgroundColor', event.target.value)} className="h-10 w-full rounded border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-surface-950" />
                      </label>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {([
                        ['bold', 'Bold'],
                        ['italic', 'Italic'],
                        ['underline', 'Underline'],
                        ['uppercase', 'Uppercase'],
                      ] as Array<[keyof BillLineStyleConfig, string]>).map(([key, label]) => (
                        <button key={key} type="button" onClick={() => updateStyle(key, !previewStyle[key] as never)} className={`rounded-full border px-3 py-2 text-xs font-semibold ${previewStyle[key] ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-700 dark:bg-primary-900/25 dark:text-primary-200' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeSection === 'module-settings' && (
            <div className="grid gap-5 xl:grid-cols-2">
              <section className="workspace-sidebar p-5">
                <SectionHeading eyebrow="Estimating" title="Bill workspace module" />
                <ToggleCard enabled={draft.moduleSettings.estimating.showBillSettingsShortcut} title="Show bill settings action" detail="Surface bill-specific settings when a bill is active." onClick={() => updateModuleSettings('estimating', { showBillSettingsShortcut: !draft.moduleSettings.estimating.showBillSettingsShortcut })} />
                {draft.moduleSettings.estimating.showBillSettingsShortcut && (
                  <button type="button" onClick={onOpenBillSettings} disabled={!activeBill || !onOpenBillSettings} className="workspace-secondary-btn mt-4 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">
                    <FileText className="h-4 w-4" />
                    {activeBill ? `Open settings for ${activeBill.name}` : 'Open active bill settings'}
                  </button>
                )}
              </section>
              <section className="workspace-sidebar p-5">
                <SectionHeading eyebrow="Appraisals" title="Development appraisal defaults" detail="These values seed new appraisal options. Existing appraisal records keep their own assumptions." />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className={fieldLabelClass}>Default template</span>
                    <select
                      value={draft.moduleSettings.appraisals.defaultTemplate}
                      onChange={(event) => updateModuleSettings('appraisals', { defaultTemplate: event.target.value as AppraisalTemplate })}
                      className="workspace-input mt-1 px-3 py-2 text-xs"
                    >
                      <option value="RESIDENTIAL_SALES">Residential sales</option>
                      <option value="COMMERCIAL_INCOME">Commercial income</option>
                    </select>
                  </label>
                  <label>
                    <span className={fieldLabelClass}>Default duration months</span>
                    <input
                      type="number"
                      min={1}
                      value={draft.moduleSettings.appraisals.defaultDurationMonths}
                      onChange={(event) => updateModuleSettings('appraisals', { defaultDurationMonths: Math.max(1, Math.round(parseFloat(event.target.value) || 1)) })}
                      className="workspace-input mt-1 px-3 py-2 text-xs"
                    />
                  </label>
                  <label>
                    <span className={fieldLabelClass}>Target profit on GDV %</span>
                    <input
                      type="number"
                      step="0.5"
                      value={draft.moduleSettings.appraisals.defaultTargetProfitOnGdvPercent}
                      onChange={(event) => updateModuleSettings('appraisals', { defaultTargetProfitOnGdvPercent: parseFloat(event.target.value) || 0 })}
                      className="workspace-input mt-1 px-3 py-2 text-xs"
                    />
                  </label>
                  <label>
                    <span className={fieldLabelClass}>Finance annual rate %</span>
                    <input
                      type="number"
                      step="0.25"
                      value={draft.moduleSettings.appraisals.defaultFinanceAnnualRatePercent}
                      onChange={(event) => updateModuleSettings('appraisals', { defaultFinanceAnnualRatePercent: parseFloat(event.target.value) || 0 })}
                      className="workspace-input mt-1 px-3 py-2 text-xs"
                    />
                  </label>
                </div>
              </section>
              <section className="workspace-sidebar p-5">
                <SectionHeading eyebrow="Library" title="Standards library module" />
                <ToggleCard enabled={draft.moduleSettings.library.preferQsplibPacks} title="Prefer .qsplib packs" detail="Use SQLite library packs as the recommended route for large libraries." onClick={() => updateModuleSettings('library', { preferQsplibPacks: !draft.moduleSettings.library.preferQsplibPacks })} />
              </section>
              <section className="workspace-sidebar p-5">
                <SectionHeading eyebrow="Tender" title="Tender analysis module" />
                <ToggleCard enabled={draft.moduleSettings.tender.showWorkflowStageCards} title="Show workflow stage cards" detail="Keep setup, returns, comparison, award, apply-back, and export stages visible." onClick={() => updateModuleSettings('tender', { showWorkflowStageCards: !draft.moduleSettings.tender.showWorkflowStageCards })} />
              </section>
              <section className="workspace-sidebar p-5">
                <SectionHeading eyebrow="Reports and audits" title="Beta module visibility" />
                <div className="grid gap-3">
                  <ToggleCard enabled={draft.moduleSettings.reports.showBetaReports} title="Show beta cost reports" detail="Keep Reports visible while it remains marked beta." onClick={() => updateModuleSettings('reports', { showBetaReports: !draft.moduleSettings.reports.showBetaReports })} />
                  <ToggleCard enabled={draft.moduleSettings.audits.showLocalAuditTrail} title="Show local audit trail" detail="Keep Audits visible as a local operation-history beta module." onClick={() => updateModuleSettings('audits', { showLocalAuditTrail: !draft.moduleSettings.audits.showLocalAuditTrail })} />
                </div>
              </section>
            </div>
          )}

          {activeSection === 'current-project' && currentProject && (
            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <section className="workspace-sidebar p-5">
                <SectionHeading eyebrow="Estimate general options" title={currentProject.name} detail="Set this estimate's location for local rate research. Other settings here apply to this estimate only." />
                <div className="mb-5 grid gap-3 sm:grid-cols-3">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Country
                    <input className="workspace-input mt-1" list="project-site-countries" aria-label="Project site country" value={currentProject.siteCountry || 'United Kingdom'} onChange={(event) => updateProject(currentProject.id, { siteCountry: event.target.value, siteRegion: event.target.value === 'United Kingdom' ? 'Scotland' : '', siteCounty: '', location: '' })} />
                    <datalist id="project-site-countries"><option value="United Kingdom" /><option value="Ireland" /></datalist>
                  </label>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Region
                    {(currentProject.siteCountry || 'United Kingdom') === 'United Kingdom' ? <select className="workspace-input mt-1" aria-label="Project site region" value={UK_SITE_REGIONS.includes(currentProject.siteRegion as UkSiteRegion) ? currentProject.siteRegion : 'Scotland'} onChange={(event) => updateProject(currentProject.id, { siteRegion: event.target.value, siteCounty: '', location: '' })}>
                      {UK_SITE_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
                    </select> : <input className="workspace-input mt-1" aria-label="Project site region" value={currentProject.siteRegion || ''} onChange={(event) => updateProject(currentProject.id, { siteRegion: event.target.value, location: [currentProject.siteCounty, event.target.value].filter(Boolean).join(', ') })} />}
                  </label>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">County / council area
                    {(currentProject.siteCountry || 'United Kingdom') === 'United Kingdom' ? <select className="workspace-input mt-1" aria-label="Project site county or council area" value={currentProject.siteCounty || ''} onChange={(event) => updateProject(currentProject.id, { siteCounty: event.target.value, location: [event.target.value, currentProject.siteRegion || 'Scotland'].filter(Boolean).join(', ') })}>
                      <option value="">Select area</option>
                      {UK_SITE_COUNTIES[(UK_SITE_REGIONS.includes(currentProject.siteRegion as UkSiteRegion) ? currentProject.siteRegion : 'Scotland') as UkSiteRegion].map((county) => <option key={county} value={county}>{county}</option>)}
                    </select> : <input className="workspace-input mt-1" aria-label="Project site county or council area" value={currentProject.siteCounty || ''} onChange={(event) => updateProject(currentProject.id, { siteCounty: event.target.value, location: [event.target.value, currentProject.siteRegion].filter(Boolean).join(', ') })} />}
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Standard</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{currentProjectSettings.measurementStandard}</div>
                  </div>
                  <div className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Markup</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{currentProjectSettings.ohpPercentage}%</div>
                  </div>
                  <div className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Workspace</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{currentProjectSettings.billWorkspaceMode} / {currentProjectSettings.billWorkspaceLayout}</div>
                  </div>
                  <div className="rounded-app border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Sticky totals</div>
                    <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{currentProjectSettings.showStickyBillTotals ? 'On' : 'Off'}</div>
                  </div>
                </div>
                <div className="mt-5">
                  <div className={fieldLabelClass}>Bill section clicks</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ChoiceCard
                      selected={currentProjectSettings.billWorkspaceLayout === 'FULL_BILL'}
                      title="Jump in full bill"
                      detail="Keep every section visible and scroll to the clicked section."
                      onClick={() => handleCurrentProjectWorkspaceLayout('FULL_BILL')}
                    />
                    <ChoiceCard
                      selected={currentProjectSettings.billWorkspaceLayout === 'FOCUSED_SECTION'}
                      title="Focus clicked section"
                      detail="Show only the selected section until another section is chosen."
                      onClick={() => handleCurrentProjectWorkspaceLayout('FOCUSED_SECTION')}
                    />
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="button" data-smoke="settings-apply-defaults-current-project" onClick={handleApplyDefaultsToCurrentProject} className="workspace-primary-btn px-4 py-2 text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Apply app defaults
                  </button>
                  <button type="button" onClick={() => updateProject(currentProject.id, applyAppDefaultsToProject(currentProject, DEFAULT_APP_SETTINGS))} className="workspace-secondary-btn px-4 py-2 text-sm">
                    Restore built-in project defaults
                  </button>
                </div>
              </section>

              <section className="workspace-sidebar p-5">
                <SectionHeading eyebrow="Live module context" title="Available module settings" />
                <div className="grid gap-3">
                  <div className="flex items-start gap-3 rounded-app border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
                    <FileText className="mt-0.5 h-4 w-4 text-slate-400" />
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Estimating</div>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Bill-specific house type settings stay on the active bill.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-app border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
                    <Library className="mt-0.5 h-4 w-4 text-slate-400" />
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Library</div>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Large library transfer guidance is controlled from Module Settings.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-app border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
                    <Scale className="mt-0.5 h-4 w-4 text-slate-400" />
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tender</div>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Tender workflow visibility is a module-level setting.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-app border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface-900">
                    <History className="mt-0.5 h-4 w-4 text-slate-400" />
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Audits</div>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Audit Trail remains a local-history beta module until enterprise audit controls exist.</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      <footer className="border-t border-slate-200/80 bg-white/92 px-6 py-4 dark:border-slate-700/80 dark:bg-surface-900/95">
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={handleResetDraft} className="workspace-secondary-btn px-4 py-2 text-sm">Reset unsaved changes</button>
          <button type="button" onClick={handleRestoreBuiltInDefaults} className="workspace-secondary-btn px-4 py-2 text-sm">Load built-in defaults</button>
          <button type="button" data-smoke="settings-save" onClick={handleSaveDefaults} className="workspace-primary-btn px-4 py-2 text-sm">
            <Save className="h-4 w-4" />
            Save settings
          </button>
        </div>
      </footer>
    </div>
  );
}
