import type { Page } from '@playwright/test';

type SeedWorkspaceOptions = {
  theme?: 'light' | 'dark';
  project?: unknown | unknown[];
  library?: unknown;
  appraisals?: unknown[];
};

export const storageKeys = {
  projects: 'qs-pro-projects-v11',
  libraries: 'qs-pro-libraries-v11',
  trades: 'qs-pro-trades-v11',
  appraisals: 'qs-pro-appraisals-v1',
  appraisalHouseTypes: 'qs-pro-appraisal-house-types-v1',
  appraisalRates: 'qs-pro-appraisal-rates-v1',
  workspaceFolders: 'qs-pro-workspace-folders-v1',
  appSettings: 'qs-pro-app-settings-v1',
  theme: 'qs-pro-theme',
  spellcheck: 'qspro.spellcheckPreference',
};

export const seededProject = {
  id: 'e2e-revision-project',
  name: 'Revision E2E Project',
  client: 'HZL',
  location: 'Test Site',
  reference: 'E2E-REV',
  updatedAt: '2026-06-24T09:00:00.000Z',
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
  tenderContractors: {
    'trade-groundworks': ['contractor-alpha', 'contractor-beta'],
  },
  bills: [
    {
      id: 'e2e-revision-bill',
      name: 'Main bill',
      sections: [
        {
          id: 'e2e-revision-section',
          name: 'Groundworks',
          items: [
            {
              id: 'e2e-revision-heading',
              type: 'GENERAL_HEADING',
              reference: '',
              description: 'Groundworks',
              unit: '',
              quantity: 0,
              rate: 0,
              total: 0,
            },
            {
              id: 'e2e-revision-item',
              type: 'PRICED',
              reference: 'A.1',
              description: 'Excavate reduced levels',
              unit: 'm3',
              quantity: 10,
              quantityDecimals: 0,
              rate: 25,
              total: 250,
              tradePackageId: 'trade-groundworks',
            },
            {
              id: 'e2e-revision-ps',
              type: 'PROVISIONAL_SUM',
              reference: 'A.2',
              description: 'Testing and attendance allowance',
              unit: 'sum',
              quantity: 1,
              quantityDecimals: 0,
              rate: 350,
              total: 350,
            },
          ],
        },
      ],
    },
  ],
};

export const seededLibrary = {
  id: 'e2e-library',
  name: 'E2E Standards Library',
  permissions: {
    allowExportAll: true,
    allowExportFolders: true,
    allowExportSections: true,
    allowLibraryEditing: true,
  },
  folders: [
    {
      id: 'e2e-library-folder',
      orderRef: 'A',
      name: 'Groundworks',
      sections: [
        {
          id: 'e2e-library-section',
          orderRef: 'A10',
          name: 'Excavation',
          items: [
            { type: 'GENERAL_HEADING', reference: '', description: 'Groundworks', unit: '', rate: 0 },
            { type: 'PRICED', reference: 'A10.001', description: 'Excavate trenches', unit: 'm', rate: 22 },
          ],
          itemCount: 2,
          pricedCount: 1,
        },
      ],
      itemCount: 2,
      pricedCount: 1,
      sectionCount: 1,
    },
  ],
  itemCount: 2,
  pricedCount: 1,
  sectionCount: 1,
  folderCount: 1,
};

export const seededTrades = [
  {
    id: 'trade-groundworks',
    name: 'Groundworks',
    contractors: [
      {
        id: 'contractor-alpha',
        name: 'Alpha Groundworks',
        address: '1 Smoke Street',
        email: 'alpha@example.test',
        phone: '01000 000001',
        rating: 'GREEN',
      },
      {
        id: 'contractor-beta',
        name: 'Beta Civils',
        address: '2 Smoke Street',
        email: 'beta@example.test',
        phone: '01000 000002',
        rating: 'YELLOW',
      },
    ],
  },
];

export async function seedWorkspace(page: Page, options: SeedWorkspaceOptions = {}) {
  const theme = options.theme || 'light';
  await page.addInitScript(({ keys, project, library, trades, appraisals, preferredTheme }) => {
    window.localStorage.clear();
    window.localStorage.setItem(keys.theme, preferredTheme);
    window.localStorage.setItem(keys.projects, JSON.stringify(Array.isArray(project) ? project : [project]));
    window.localStorage.setItem(keys.libraries, JSON.stringify([library]));
    window.localStorage.setItem(keys.trades, JSON.stringify(trades));
    window.localStorage.setItem(keys.appraisals, JSON.stringify(appraisals));
    window.localStorage.setItem(keys.appraisalHouseTypes, JSON.stringify([]));
    window.localStorage.setItem(keys.appraisalRates, JSON.stringify([]));
    window.localStorage.setItem(keys.workspaceFolders, JSON.stringify([]));
    window.localStorage.setItem(keys.spellcheck, JSON.stringify({ enabled: true, language: 'en-GB' }));
    window.localStorage.setItem(keys.appSettings, JSON.stringify({
      version: 1,
      general: {
        hardeningMode: true,
        defaultSection: 'general',
      },
      projectDefaults: {
        measurementStandard: 'SMM7',
        ohpPercentage: 0,
        billWorkspaceMode: 'CLEAN',
        billWorkspaceLayout: 'FULL_BILL',
        showStickyBillTotals: true,
        showWorkflowGuidance: false,
        autoSnapshotsEnabled: true,
        renumberNumericBillsOnReorder: true,
      },
      moduleSettings: {
        estimating: { showBillSettingsShortcut: true },
        library: { preferQsplibPacks: true },
        tender: { showWorkflowStageCards: true },
        reports: { showBetaReports: true },
        audits: { showLocalAuditTrail: true },
        appraisals: {
          defaultTemplate: 'RESIDENTIAL_SALES',
          defaultDurationMonths: 18,
          defaultTargetProfitOnGdvPercent: 20,
          defaultFinanceAnnualRatePercent: 0,
        },
      },
    }));
  }, {
    keys: storageKeys,
    project: options.project || seededProject,
    library: options.library || seededLibrary,
    trades: seededTrades,
    appraisals: options.appraisals || [],
    preferredTheme: theme,
  });
}

export async function openSeededBillWorkspace(page: Page, options: SeedWorkspaceOptions = {}) {
  await seedWorkspace(page, options);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-smoke="home-workspace"]').waitFor({ state: 'visible' });
  await page.locator('[data-smoke="open-active-project"]').click();
  await page.locator('[data-smoke="bill-workspace"]').waitFor({ state: 'visible' });
}
