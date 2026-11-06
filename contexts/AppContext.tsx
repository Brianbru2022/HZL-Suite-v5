/**
 * App-wide context: project data, modal state, editor state, and actions.
 * Reduces prop drilling into BillView, InspectorPanel, modals, and overlays.
 */
import React, { createContext, useContext } from 'react';
import type {
  AppraisalHouseTypeLibraryItem,
  AppraisalRateLibraryItem,
  Project,
  BoQBill,
  ItemLibrary,
  TradePackage,
  PromptConfigContext,
  HelpContextId,
  DevelopmentAppraisal,
  WorkspaceFolder,
} from '../types';
import type { EditorConfig, EditFormState } from '../types';
import type { AppActions } from '../hooks/useAppActions';
import type { AppNotice } from '../utils/appUi';
import type { AppSettings } from '../utils/appSettings';

export interface AppContextValue {
  projects: Project[];
  currentProject: Project | null;
  currentProjectId: string | null;
  saveStatus: 'saved' | 'saving' | 'error';
  lastSavedAt: number | null;
  lastManualSaveAt: number | null;
  saveError: string | null;
  persistenceBackend: 'sqlite' | 'localStorage';
  isHydrated: boolean;
  appNotices: AppNotice[];
  appSettings: AppSettings;
  setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  saveNow: () => Promise<'sqlite' | 'localStorage'>;
  activeBill: BoQBill | null;
  activeBillId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  setActiveBillId: (id: string | null) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  libraries: ItemLibrary[];
  trades: TradePackage[];
  appraisals: DevelopmentAppraisal[];
  appraisalHouseTypes: AppraisalHouseTypeLibraryItem[];
  appraisalRates: AppraisalRateLibraryItem[];
  workspaceFolders: WorkspaceFolder[];
  setLibraries: React.Dispatch<React.SetStateAction<ItemLibrary[]>>;
  setTrades: React.Dispatch<React.SetStateAction<TradePackage[]>>;
  setAppraisals: React.Dispatch<React.SetStateAction<DevelopmentAppraisal[]>>;
  setAppraisalHouseTypes: React.Dispatch<React.SetStateAction<AppraisalHouseTypeLibraryItem[]>>;
  setAppraisalRates: React.Dispatch<React.SetStateAction<AppraisalRateLibraryItem[]>>;
  setWorkspaceFolders: React.Dispatch<React.SetStateAction<WorkspaceFolder[]>>;
  viewMode: 'standard' | 'trade';
  setViewMode: React.Dispatch<React.SetStateAction<'standard' | 'trade'>>;
  selectedTradeFilter: string;
  setSelectedTradeFilter: React.Dispatch<React.SetStateAction<string>>;
  selectedItemIds: Set<string>;
  setSelectedItemIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  editorConfig: EditorConfig;
  setEditorConfig: React.Dispatch<React.SetStateAction<EditorConfig>>;
  editFormData: EditFormState;
  setEditFormData: React.Dispatch<React.SetStateAction<EditFormState>>;
  isEditorOpen: boolean;
  setIsEditorOpen: (v: boolean) => void;
  isLibraryWindowOpen: boolean;
  setIsLibraryWindowOpen: (v: boolean) => void;
  isTradesWindowOpen: boolean;
  setIsTradesWindowOpen: (v: boolean) => void;
  isTenderViewOpen: boolean;
  setIsTenderViewOpen: (v: boolean) => void;
  isAnalyticsOpen: boolean;
  setIsAnalyticsOpen: (v: boolean) => void;
  isCostReportsHubOpen: boolean;
  setIsCostReportsHubOpen: (v: boolean) => void;
  isCostPlanOpen: boolean;
  setIsCostPlanOpen: (v: boolean) => void;
  isAskAiOpen: boolean;
  setIsAskAiOpen: (v: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (v: boolean) => void;
  isPromptOpen: boolean;
  setIsPromptOpen: (v: boolean) => void;
  isPaletteOpen: boolean;
  setIsPaletteOpen: (v: boolean) => void;
  isExporting: boolean;
  setIsExporting: (v: boolean) => void;
  isVersionHistoryOpen: boolean;
  setIsVersionHistoryOpen: (v: boolean) => void;
  isShortcutsOpen: boolean;
  setIsShortcutsOpen: (v: boolean) => void;
  isAiLoading: boolean;
  aiSuggestions: { description: string; unit: string }[];
  setAiSuggestions: React.Dispatch<React.SetStateAction<{ description: string; unit: string }[]>>;
  /** True if Gemini API key is set (Tauri env or build-time env for browser). Null = still loading. */
  isGeminiConfigured: boolean | null;
  geminiConfigSource: 'env' | 'imported' | 'none';
  refreshGeminiConfiguration: () => Promise<void>;
  helpContextId: HelpContextId;
  setHelpContextId: React.Dispatch<React.SetStateAction<HelpContextId>>;
  isHelpOpen: boolean;
  openHelp: (contextId?: HelpContextId) => void;
  closeHelp: () => void;
  walkthroughContextId: HelpContextId | null;
  walkthroughStepIndex: number;
  startWalkthrough: (contextId?: HelpContextId, stepId?: string) => void;
  nextWalkthroughStep: () => void;
  previousWalkthroughStep: () => void;
  closeWalkthrough: () => void;
  /** From useAiAssistant - used by PromptModal and AI flows */
  promptConfig: {
    type: import('../types').PromptType;
    title: string;
    placeholder: string;
    defaultValue: string;
    context?: PromptConfigContext;
    showStandardToggle?: boolean;
    defaultStandard?: 'SMM7' | 'NRM2';
  };
  actions: AppActions;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useAppContext must be used within AppProvider');
  return value;
}

export function useAppContextOptional(): AppContextValue | null {
  return useContext(AppContext);
}

export { AppContext };
