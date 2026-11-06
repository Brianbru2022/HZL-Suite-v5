export type ReleaseSmokeCheckStatus = 'pending' | 'passed' | 'issue';

export interface ReleaseSmokeCheckItem {
  id: string;
  group: string;
  title: string;
  detail: string;
}

export type ReleaseSmokeChecklistState = Record<string, ReleaseSmokeCheckStatus>;

export interface ReleaseSmokeChecklistProgress {
  total: number;
  passed: number;
  issue: number;
  pending: number;
}

const RELEASE_SMOKE_CHECKLIST_KEY = 'hzl-release-smoke-checklist-v1';

export const RELEASE_SMOKE_CHECKLIST: ReleaseSmokeCheckItem[] = [
  {
    id: 'startup-opens',
    group: 'Startup and Storage',
    title: 'App opens to a usable workspace',
    detail: 'Launch the app and confirm there is no white screen, expiry lock, or startup crash.',
  },
  {
    id: 'storage-sqlite-ready',
    group: 'Startup and Storage',
    title: 'SQLite storage is ready',
    detail: 'Open Diagnostics and confirm Desktop SQLite is active with no autosave error.',
  },
  {
    id: 'packaged-installer-launch',
    group: 'Packaged Desktop',
    title: 'Packaged installer launches',
    detail: 'Install the generated desktop artifact on a clean Windows test profile or disposable VM and confirm the first window is usable.',
  },
  {
    id: 'packaged-settings-restart',
    group: 'Packaged Desktop',
    title: 'Settings and project data survive restart',
    detail: 'Change a Settings default, create or open a smoke project, close the packaged app, reopen it, and confirm both the project and setting persisted.',
  },
  {
    id: 'packaged-backup-restore',
    group: 'Packaged Desktop',
    title: 'Backup and restore verified',
    detail: 'Use Settings or Diagnostics to restore a .qsbackup, confirm the automatic pre-restore checkpoint is recorded, then verify the smoke project, library and managed evidence return after reload.',
  },
  {
    id: 'packaged-native-dialogs',
    group: 'Packaged Desktop',
    title: 'Native dialogs and exports work',
    detail: 'From the packaged app, verify project JSON, bill PDF, bill Excel, .qsplib pack, tender workbook, and AI config import/remove flows.',
  },
  {
    id: 'packaged-signed-upgrade',
    group: 'Packaged Desktop',
    title: 'Signed installer upgrade is verified',
    detail: 'Verify the installer signature, create a pre-upgrade .qsbackup, install over an existing clean-profile build, then reopen a representative project and export.',
  },
  {
    id: 'release-source-frozen',
    group: 'Release Control',
    title: 'Release source is committed and tagged',
    detail: 'Confirm the release commit has the matching vX.Y.Z tag and the release bundle manifest reports a clean source tree.',
  },
  {
    id: 'pilot-controlled-reconciliations',
    group: 'Release Control',
    title: 'Eight controlled reconciliations are retained',
    detail: 'Complete five residential and three commercial controlled spreadsheet comparisons, retain the evidence and reviewer sign-off in PILOT_RECONCILIATION_REGISTER.md.',
  },
  {
    id: 'autosave-small-edit',
    group: 'Startup and Storage',
    title: 'Autosave records a small edit',
    detail: 'Make a small bill or project edit, wait for saved status, then reopen Diagnostics.',
  },
  {
    id: 'first-run-banner-clearance',
    group: 'Shell and Visual Smoke',
    title: 'First-run shell is not hidden by banners',
    detail: 'Open a clean profile and confirm notices stay in the top status pill unless there is a true blocking data-risk state.',
  },
  {
    id: 'visual-smoke-light-dark',
    group: 'Shell and Visual Smoke',
    title: 'Light and dark viewports hold together',
    detail: 'Check Home, bill workspace, Library, Tender, Reports, and Audits at 1180x720, 1440x820, and 1920x1080 in light and dark themes.',
  },
  {
    id: 'rail-live-and-roadmap-states',
    group: 'Shell and Visual Smoke',
    title: 'Rail distinguishes live and roadmap modules',
    detail: 'Confirm Home, Estimate, Library, Tender, Reports, and Audits launch directly while planned modules sit behind Roadmap.',
  },
  {
    id: 'keyboard-menu-flow',
    group: 'Shell and Visual Smoke',
    title: 'Keyboard paths work through dense menus',
    detail: 'Use Tab, Shift+Tab, Escape, ArrowUp, ArrowDown, Home, and End in command palette, toolbar menus, modals, inspector navigation, and table editing.',
  },
  {
    id: 'bill-create-structure',
    group: 'Bill Workspace',
    title: 'Create bill, section, and page',
    detail: 'Use Add to create a bill, section, and page, confirming the destination each time.',
  },
  {
    id: 'bill-add-line-types',
    group: 'Bill Workspace',
    title: 'Add each standard line type',
    detail: 'Add H1, H2, H3, H4, comment, sub-comment, priced item, provisional sum, PC sum, and extra-over item.',
  },
  {
    id: 'bill-clear-values',
    group: 'Bill Workspace',
    title: 'Clear values by scope and mode',
    detail: 'Clear rates only, quantities only, and both at page, section, and bill level.',
  },
  {
    id: 'bill-inspector-navigation',
    group: 'Bill Workspace',
    title: 'Navigator and inspector behave correctly',
    detail: 'Collapse/expand the navigator, dock/float/resize the inspector, and confirm no layout overlap.',
  },
  {
    id: 'bill-sticky-totals-selection-bar',
    group: 'Bill Workspace',
    title: 'Sticky totals and selected-row actions stay usable',
    detail: 'Toggle sticky bill totals in Settings, drag the totals widget, switch to a non-bill module, select multiple rows, and confirm totals, assign trade, clear values, duplicate, delete, and clear selection do not overlap.',
  },
  {
    id: 'bill-workspace-presets',
    group: 'Bill Workspace',
    title: 'Workspace presets set task flow',
    detail: 'Apply clean bill, trade allocation, tender prep, and review/audit views; confirm zoom, focus, navigator, and Standards panel states are intentional.',
  },
  {
    id: 'library-large-browse',
    group: 'Libraries',
    title: 'Browse a large library lazily',
    detail: 'Open SMM7 or QSP, switch folders/sections, and confirm only visible/selected items load.',
  },
  {
    id: 'library-insert-item',
    group: 'Libraries',
    title: 'Insert library item into bill',
    detail: 'Select a section item from the library and insert it into a project bill.',
  },
  {
    id: 'library-json-section',
    group: 'Libraries',
    title: 'Section JSON import/export works',
    detail: 'Export one section JSON, import it into another section or page, and confirm item counts change.',
  },
  {
    id: 'library-pack-roundtrip',
    group: 'Libraries',
    title: '.qsplib pack export/import works',
    detail: 'Export a small SQLite library pack and import it back into a clean or test profile.',
  },
  {
    id: 'exports-bill',
    group: 'Exports and Tender',
    title: 'Bill PDF and Excel exports work',
    detail: 'Export the active bill to PDF and Excel, then open both files.',
  },
  {
    id: 'exports-summary-cost-plan',
    group: 'Exports and Tender',
    title: 'Summary and cost plan exports work',
    detail: 'Export project summary and cost plan workbooks/PDFs where applicable.',
  },
  {
    id: 'tender-compare-apply',
    group: 'Exports and Tender',
    title: 'Tender compare and apply winner works',
    detail: 'Import or enter contractor rates, identify missing rates, export tender analysis, and apply a winner safely.',
  },
  {
    id: 'recovery-restore-point',
    group: 'Recovery',
    title: 'Restore points and diagnostics are usable',
    detail: 'Create a restore point, copy diagnostics, and confirm operation history shows recent import/export events.',
  },
  {
    id: 'recovery-backup-diagnostics-export',
    group: 'Recovery',
    title: 'One-click backup and diagnostics export work',
    detail: 'Use Settings or Diagnostics to export a full app backup and diagnostics report, then confirm both files are written and operation history records them.',
  },
  {
    id: 'support-local-crash-consent',
    group: 'Recovery',
    title: 'Support diagnostics respect crash-report consent',
    detail: 'Confirm local crash reporting is off by default, enable it explicitly for a test, then confirm Diagnostics records reports locally without any automatic transmission.',
  },
];

function isReleaseSmokeCheckStatus(value: unknown): value is ReleaseSmokeCheckStatus {
  return value === 'pending' || value === 'passed' || value === 'issue';
}

function getStorage() {
  return typeof window !== 'undefined' ? window.localStorage : null;
}

export function readReleaseSmokeChecklistState(): ReleaseSmokeChecklistState {
  const storage = getStorage();
  if (!storage) return {};
  try {
    const raw = storage.getItem(RELEASE_SMOKE_CHECKLIST_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const validIds = new Set(RELEASE_SMOKE_CHECKLIST.map((item) => item.id));
    return Object.entries(parsed as Record<string, unknown>).reduce<ReleaseSmokeChecklistState>((acc, [id, status]) => {
      if (validIds.has(id) && isReleaseSmokeCheckStatus(status)) acc[id] = status;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

export function writeReleaseSmokeChecklistState(state: ReleaseSmokeChecklistState) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(RELEASE_SMOKE_CHECKLIST_KEY, JSON.stringify(state));
  } catch {
    // Release checklist persistence must never interrupt the app.
  }
}

export function setReleaseSmokeCheckStatus(
  state: ReleaseSmokeChecklistState,
  id: string,
  status: ReleaseSmokeCheckStatus
): ReleaseSmokeChecklistState {
  if (!RELEASE_SMOKE_CHECKLIST.some((item) => item.id === id)) return state;
  return {
    ...state,
    [id]: status,
  };
}

export function getReleaseSmokeChecklistProgress(state: ReleaseSmokeChecklistState): ReleaseSmokeChecklistProgress {
  return RELEASE_SMOKE_CHECKLIST.reduce<ReleaseSmokeChecklistProgress>(
    (progress, item) => {
      const status = state[item.id] || 'pending';
      progress[status] += 1;
      return progress;
    },
    { total: RELEASE_SMOKE_CHECKLIST.length, passed: 0, issue: 0, pending: 0 }
  );
}

export function formatReleaseSmokeChecklistReport(
  state: ReleaseSmokeChecklistState,
  meta: { appName: string; releaseLabel: string; generatedAt?: string }
) {
  const progress = getReleaseSmokeChecklistProgress(state);
  const lines = [
    `${meta.appName} release smoke checklist`,
    `Release: ${meta.releaseLabel}`,
    `Generated: ${meta.generatedAt || new Date().toISOString()}`,
    `Progress: ${progress.passed}/${progress.total} passed, ${progress.issue} issue, ${progress.pending} pending`,
    '',
  ];

  const groups = Array.from(new Set(RELEASE_SMOKE_CHECKLIST.map((item) => item.group)));
  groups.forEach((group) => {
    lines.push(group);
    RELEASE_SMOKE_CHECKLIST
      .filter((item) => item.group === group)
      .forEach((item) => {
        const status = state[item.id] || 'pending';
        lines.push(`- [${status.toUpperCase()}] ${item.title}: ${item.detail}`);
      });
    lines.push('');
  });

  return lines.join('\n').trim();
}
