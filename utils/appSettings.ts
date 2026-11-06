import type {
  AppraisalTemplate,
  BillLineStyleConfig,
  BillLineStyleKey,
  BillWorkspaceLayout,
  BillWorkspaceMode,
  HeadingDisplayStyle,
  CommentDisplayStyle,
  Project,
} from '../types';

export const APP_SETTINGS_VERSION = 1;

export type AppSettingsSectionId = 'general' | 'project-defaults' | 'module-settings' | 'current-project';
export type AppAiProviderMode = 'AUTO' | 'GEMINI' | 'LOCAL_LM_STUDIO';
export type AppLocalAiSetupProfile = 'QWEN_14B_Q4' | 'CUSTOM';

export type AppProjectDefaults = {
  measurementStandard: 'SMM7' | 'NRM2';
  ohpPercentage: number;
  billWorkspaceLayout: BillWorkspaceLayout;
  billWorkspaceMode: BillWorkspaceMode;
  renumberNumericBillsOnReorder: boolean;
  showWorkflowGuidance: boolean;
  showStickyBillTotals: boolean;
  autoSnapshotsEnabled: boolean;
  headingDisplayStyle: HeadingDisplayStyle;
  commentDisplayStyle: CommentDisplayStyle;
  billLineStyles: Partial<Record<BillLineStyleKey, BillLineStyleConfig>>;
};

export type AppModuleSettings = {
  estimating: {
    showBillSettingsShortcut: boolean;
  };
  library: {
    preferQsplibPacks: boolean;
  };
  tender: {
    showWorkflowStageCards: boolean;
  };
  reports: {
    showBetaReports: boolean;
  };
  audits: {
    showLocalAuditTrail: boolean;
  };
  appraisals: {
    defaultTemplate: AppraisalTemplate;
    defaultDurationMonths: number;
    defaultTargetProfitOnGdvPercent: number;
    defaultFinanceAnnualRatePercent: number;
  };
};

export type AppSettings = {
  version: typeof APP_SETTINGS_VERSION;
  general: {
    hardeningMode: boolean;
    defaultSection: AppSettingsSectionId;
    crashReportingEnabled: boolean;
    releaseChannel: 'STABLE' | 'PILOT';
  };
  ai: {
    providerMode: AppAiProviderMode;
    localEndpoint: string;
    localModel: string;
    localModelDirectory: string;
    localSetupProfile: AppLocalAiSetupProfile;
  };
  projectDefaults: AppProjectDefaults;
  moduleSettings: AppModuleSettings;
};

export const DEFAULT_BILL_LINE_STYLES: Record<BillLineStyleKey, BillLineStyleConfig> = {
  GENERAL_HEADING: { fontFamily: 'aptos-narrow', fontSize: 'sm', fontColor: '#000000', backgroundColor: '#ffffff', bold: true, underline: false, italic: false, uppercase: true },
  MAJOR_HEADING: { fontFamily: 'aptos-narrow', fontSize: 'sm', fontColor: '#000000', backgroundColor: '#ffffff', bold: true, underline: true, italic: false, uppercase: false },
  SUB_SECTION: { fontFamily: 'aptos-narrow', fontSize: 'sm', fontColor: '#000000', backgroundColor: '#ffffff', bold: true, underline: false, italic: false, uppercase: false },
  MINOR_HEADING: { fontFamily: 'aptos-narrow', fontSize: 'sm', fontColor: '#000000', backgroundColor: '#ffffff', bold: false, underline: false, italic: false, uppercase: false },
  COMMENT: { fontFamily: 'aptos-narrow', fontSize: 'sm', fontColor: '#000000', backgroundColor: '#ffffff', bold: false, underline: false, italic: true, uppercase: false },
  SUB_COMMENT: { fontFamily: 'aptos-narrow', fontSize: 'sm', fontColor: '#000000', backgroundColor: '#ffffff', bold: false, underline: false, italic: true, uppercase: false },
  PRICED: { fontFamily: 'aptos-narrow', fontSize: 'sm', fontColor: '#000000', backgroundColor: '#ffffff', bold: false, underline: false, italic: false, uppercase: false },
  EXTRA_OVER_ITEM: { fontFamily: 'aptos-narrow', fontSize: 'sm', fontColor: '#000000', backgroundColor: '#ffffff', bold: false, underline: false, italic: false, uppercase: false },
  PROVISIONAL_SUM: { fontFamily: 'aptos-narrow', fontSize: 'sm', fontColor: '#000000', backgroundColor: '#ffffff', bold: false, underline: false, italic: false, uppercase: false },
  PC_SUM: { fontFamily: 'aptos-narrow', fontSize: 'sm', fontColor: '#000000', backgroundColor: '#ffffff', bold: false, underline: false, italic: false, uppercase: false },
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  version: APP_SETTINGS_VERSION,
  general: {
    hardeningMode: true,
    defaultSection: 'general',
    crashReportingEnabled: false,
    releaseChannel: 'STABLE',
  },
  ai: {
    providerMode: 'AUTO',
    localEndpoint: 'http://127.0.0.1:1234/v1',
    localModel: 'hzl-local-report',
    localModelDirectory: 'C:\\models',
    localSetupProfile: 'QWEN_14B_Q4',
  },
  projectDefaults: {
    measurementStandard: 'SMM7',
    ohpPercentage: 0,
    billWorkspaceLayout: 'FULL_BILL',
    billWorkspaceMode: 'CLEAN',
    renumberNumericBillsOnReorder: true,
    showWorkflowGuidance: false,
    showStickyBillTotals: true,
    autoSnapshotsEnabled: true,
    headingDisplayStyle: 'BOLD',
    commentDisplayStyle: 'MUTED_ITALIC',
    billLineStyles: {},
  },
  moduleSettings: {
    estimating: {
      showBillSettingsShortcut: true,
    },
    library: {
      preferQsplibPacks: true,
    },
    tender: {
      showWorkflowStageCards: true,
    },
    reports: {
      showBetaReports: true,
    },
    audits: {
      showLocalAuditTrail: true,
    },
    appraisals: {
      defaultTemplate: 'RESIDENTIAL_SALES',
      defaultDurationMonths: 18,
      defaultTargetProfitOnGdvPercent: 20,
      defaultFinanceAnnualRatePercent: 0,
    },
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeBillWorkspaceLayout(value: unknown, fallback: BillWorkspaceLayout): BillWorkspaceLayout {
  return value === 'FOCUSED_SECTION' || value === 'FULL_BILL' ? value : fallback;
}

function normalizeBillWorkspaceMode(value: unknown, fallback: BillWorkspaceMode): BillWorkspaceMode {
  return value === 'GUIDED' || value === 'CLEAN' ? value : fallback;
}

function normalizeMeasurementStandard(value: unknown, fallback: 'SMM7' | 'NRM2') {
  return value === 'SMM7' || value === 'NRM2' ? value : fallback;
}

function normalizeHeadingDisplayStyle(value: unknown, fallback: HeadingDisplayStyle): HeadingDisplayStyle {
  return value === 'BOLD' || value === 'BOLD_UPPERCASE' || value === 'BOLD_UNDERLINE' ? value : fallback;
}

function normalizeCommentDisplayStyle(value: unknown, fallback: CommentDisplayStyle): CommentDisplayStyle {
  return value === 'MUTED_ITALIC' || value === 'PLAIN' || value === 'ITALIC' ? value : fallback;
}

function normalizeAppraisalTemplate(value: unknown, fallback: AppraisalTemplate): AppraisalTemplate {
  return value === 'RESIDENTIAL_SALES' || value === 'COMMERCIAL_INCOME' ? value : fallback;
}

function normalizeAiProviderMode(value: unknown, fallback: AppAiProviderMode): AppAiProviderMode {
  return value === 'AUTO' || value === 'GEMINI' || value === 'LOCAL_LM_STUDIO' ? value : fallback;
}

function normalizeLocalAiSetupProfile(value: unknown, fallback: AppLocalAiSetupProfile): AppLocalAiSetupProfile {
  return value === 'QWEN_14B_Q4' || value === 'CUSTOM' ? value : fallback;
}

function normalizeString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeBillLineStyles(value: unknown): Partial<Record<BillLineStyleKey, BillLineStyleConfig>> {
  if (!isRecord(value)) return {};
  const result: Partial<Record<BillLineStyleKey, BillLineStyleConfig>> = {};
  (Object.keys(DEFAULT_BILL_LINE_STYLES) as BillLineStyleKey[]).forEach((key) => {
    const entry = value[key];
    if (!isRecord(entry)) return;
    result[key] = {
      ...DEFAULT_BILL_LINE_STYLES[key],
      ...entry,
    } as BillLineStyleConfig;
  });
  return result;
}

export function normalizeAppSettings(value: unknown): AppSettings {
  const source = isRecord(value) ? value : {};
  const general = isRecord(source.general) ? source.general : {};
  const ai = isRecord(source.ai) ? source.ai : {};
  const projectDefaults = isRecord(source.projectDefaults) ? source.projectDefaults : {};
  const moduleSettings = isRecord(source.moduleSettings) ? source.moduleSettings : {};
  const estimating = isRecord(moduleSettings.estimating) ? moduleSettings.estimating : {};
  const library = isRecord(moduleSettings.library) ? moduleSettings.library : {};
  const tender = isRecord(moduleSettings.tender) ? moduleSettings.tender : {};
  const reports = isRecord(moduleSettings.reports) ? moduleSettings.reports : {};
  const audits = isRecord(moduleSettings.audits) ? moduleSettings.audits : {};
  const appraisals = isRecord(moduleSettings.appraisals) ? moduleSettings.appraisals : {};

  return {
    version: APP_SETTINGS_VERSION,
    general: {
      hardeningMode: normalizeBoolean(general.hardeningMode, DEFAULT_APP_SETTINGS.general.hardeningMode),
      defaultSection:
        general.defaultSection === 'project-defaults' ||
        general.defaultSection === 'module-settings' ||
        general.defaultSection === 'current-project'
          ? general.defaultSection
          : DEFAULT_APP_SETTINGS.general.defaultSection,
      crashReportingEnabled: normalizeBoolean(general.crashReportingEnabled, DEFAULT_APP_SETTINGS.general.crashReportingEnabled),
      releaseChannel: general.releaseChannel === 'PILOT' ? 'PILOT' : DEFAULT_APP_SETTINGS.general.releaseChannel,
    },
    ai: {
      providerMode: normalizeAiProviderMode(ai.providerMode, DEFAULT_APP_SETTINGS.ai.providerMode),
      localEndpoint: normalizeString(ai.localEndpoint, DEFAULT_APP_SETTINGS.ai.localEndpoint),
      localModel: normalizeString(ai.localModel, DEFAULT_APP_SETTINGS.ai.localModel),
      localModelDirectory: normalizeString(ai.localModelDirectory, DEFAULT_APP_SETTINGS.ai.localModelDirectory),
      localSetupProfile: normalizeLocalAiSetupProfile(ai.localSetupProfile, DEFAULT_APP_SETTINGS.ai.localSetupProfile),
    },
    projectDefaults: {
      measurementStandard: normalizeMeasurementStandard(projectDefaults.measurementStandard, DEFAULT_APP_SETTINGS.projectDefaults.measurementStandard),
      ohpPercentage: normalizeNumber(projectDefaults.ohpPercentage, DEFAULT_APP_SETTINGS.projectDefaults.ohpPercentage),
      billWorkspaceLayout: normalizeBillWorkspaceLayout(projectDefaults.billWorkspaceLayout, DEFAULT_APP_SETTINGS.projectDefaults.billWorkspaceLayout),
      billWorkspaceMode: normalizeBillWorkspaceMode(projectDefaults.billWorkspaceMode, DEFAULT_APP_SETTINGS.projectDefaults.billWorkspaceMode),
      renumberNumericBillsOnReorder: normalizeBoolean(projectDefaults.renumberNumericBillsOnReorder, DEFAULT_APP_SETTINGS.projectDefaults.renumberNumericBillsOnReorder),
      showWorkflowGuidance: normalizeBoolean(projectDefaults.showWorkflowGuidance, DEFAULT_APP_SETTINGS.projectDefaults.showWorkflowGuidance),
      showStickyBillTotals: normalizeBoolean(projectDefaults.showStickyBillTotals, DEFAULT_APP_SETTINGS.projectDefaults.showStickyBillTotals),
      autoSnapshotsEnabled: normalizeBoolean(projectDefaults.autoSnapshotsEnabled, DEFAULT_APP_SETTINGS.projectDefaults.autoSnapshotsEnabled),
      headingDisplayStyle: normalizeHeadingDisplayStyle(projectDefaults.headingDisplayStyle, DEFAULT_APP_SETTINGS.projectDefaults.headingDisplayStyle),
      commentDisplayStyle: normalizeCommentDisplayStyle(projectDefaults.commentDisplayStyle, DEFAULT_APP_SETTINGS.projectDefaults.commentDisplayStyle),
      billLineStyles: normalizeBillLineStyles(projectDefaults.billLineStyles),
    },
    moduleSettings: {
      estimating: {
        showBillSettingsShortcut: normalizeBoolean(estimating.showBillSettingsShortcut, DEFAULT_APP_SETTINGS.moduleSettings.estimating.showBillSettingsShortcut),
      },
      library: {
        preferQsplibPacks: normalizeBoolean(library.preferQsplibPacks, DEFAULT_APP_SETTINGS.moduleSettings.library.preferQsplibPacks),
      },
      tender: {
        showWorkflowStageCards: normalizeBoolean(tender.showWorkflowStageCards, DEFAULT_APP_SETTINGS.moduleSettings.tender.showWorkflowStageCards),
      },
      reports: {
        showBetaReports: normalizeBoolean(reports.showBetaReports, DEFAULT_APP_SETTINGS.moduleSettings.reports.showBetaReports),
      },
      audits: {
        showLocalAuditTrail: normalizeBoolean(audits.showLocalAuditTrail, DEFAULT_APP_SETTINGS.moduleSettings.audits.showLocalAuditTrail),
      },
      appraisals: {
        defaultTemplate: normalizeAppraisalTemplate(appraisals.defaultTemplate, DEFAULT_APP_SETTINGS.moduleSettings.appraisals.defaultTemplate),
        defaultDurationMonths: Math.max(1, Math.round(normalizeNumber(appraisals.defaultDurationMonths, DEFAULT_APP_SETTINGS.moduleSettings.appraisals.defaultDurationMonths))),
        defaultTargetProfitOnGdvPercent: normalizeNumber(appraisals.defaultTargetProfitOnGdvPercent, DEFAULT_APP_SETTINGS.moduleSettings.appraisals.defaultTargetProfitOnGdvPercent),
        defaultFinanceAnnualRatePercent: normalizeNumber(appraisals.defaultFinanceAnnualRatePercent, DEFAULT_APP_SETTINGS.moduleSettings.appraisals.defaultFinanceAnnualRatePercent),
      },
    },
  };
}

export function buildNewProjectSettingsFromDefaults(appSettings: AppSettings): Pick<
  Project,
  | 'measurementStandard'
  | 'ohpPercentage'
  | 'billWorkspaceLayout'
  | 'billWorkspaceMode'
  | 'renumberNumericBillsOnReorder'
  | 'showWorkflowGuidance'
  | 'showStickyBillTotals'
  | 'autoSnapshotsEnabled'
  | 'headingDisplayStyle'
  | 'commentDisplayStyle'
  | 'billLineStyles'
> {
  const defaults = normalizeAppSettings(appSettings).projectDefaults;
  return {
    measurementStandard: defaults.measurementStandard,
    ohpPercentage: defaults.ohpPercentage,
    billWorkspaceLayout: defaults.billWorkspaceLayout,
    billWorkspaceMode: defaults.billWorkspaceMode,
    renumberNumericBillsOnReorder: defaults.renumberNumericBillsOnReorder,
    showWorkflowGuidance: defaults.showWorkflowGuidance,
    showStickyBillTotals: defaults.showStickyBillTotals,
    autoSnapshotsEnabled: defaults.autoSnapshotsEnabled,
    headingDisplayStyle: defaults.headingDisplayStyle,
    commentDisplayStyle: defaults.commentDisplayStyle,
    billLineStyles: defaults.billLineStyles,
  };
}

export function applyAppDefaultsToProject(project: Project, appSettings: AppSettings): Project {
  return {
    ...project,
    ...buildNewProjectSettingsFromDefaults(appSettings),
    updatedAt: new Date().toISOString(),
  };
}

export function getEffectiveProjectSettings(project: Project | null | undefined, appSettings: AppSettings): AppProjectDefaults {
  const defaults = normalizeAppSettings(appSettings).projectDefaults;
  if (!project) return defaults;
  return {
    measurementStandard: project.measurementStandard || defaults.measurementStandard,
    ohpPercentage: typeof project.ohpPercentage === 'number' ? project.ohpPercentage : defaults.ohpPercentage,
    billWorkspaceLayout: project.billWorkspaceLayout || defaults.billWorkspaceLayout,
    billWorkspaceMode: project.billWorkspaceMode || defaults.billWorkspaceMode,
    renumberNumericBillsOnReorder: project.renumberNumericBillsOnReorder ?? defaults.renumberNumericBillsOnReorder,
    showWorkflowGuidance: project.showWorkflowGuidance ?? defaults.showWorkflowGuidance,
    showStickyBillTotals: project.showStickyBillTotals ?? defaults.showStickyBillTotals,
    autoSnapshotsEnabled: project.autoSnapshotsEnabled ?? defaults.autoSnapshotsEnabled,
    headingDisplayStyle: project.headingDisplayStyle || defaults.headingDisplayStyle,
    commentDisplayStyle: project.commentDisplayStyle || defaults.commentDisplayStyle,
    billLineStyles: {
      ...defaults.billLineStyles,
      ...(project.billLineStyles || {}),
    },
  };
}
