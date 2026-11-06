import React from 'react';
import { AlertTriangle, Clock, History, RotateCcw, Save, Sparkles, X } from 'lucide-react';
import type { Project, ProjectSnapshot } from '../../types';
import { useHelpContext } from '../../hooks/useHelpContext';
import { useAppContextOptional } from '../../contexts/AppContext';
import { HelpButton } from '../Help/HelpButton';
import { APP_RELEASE_DATE_ISO, APP_RELEASE_PHASE, APP_VERSION } from '../../utils/appMetadata';
import { formatCurrency } from '../../utils/formatting';
import { formatRevisionDelta, summariseBoqRevisionDelta } from '../../utils/boqRevisionPoints';

interface VersionHistoryModalProps {
  isOpen: boolean;
  currentProject?: Project | null;
  onCreateSnapshot?: () => void;
  onCreateBoqRevisionPoint?: () => void;
  onRestoreSnapshot?: (snapshotId: string, options?: { skipConfirm?: boolean }) => void;
  onClose: () => void;
}

interface RevisionMetricProps {
  label: string;
  value: string;
  tone?: 'neutral' | 'positive' | 'danger';
}

const RevisionMetric: React.FC<RevisionMetricProps> = ({ label, value, tone = 'neutral' }) => {
  const toneClass =
    tone === 'positive'
      ? 'text-emerald-700 dark:text-emerald-300'
      : tone === 'danger'
        ? 'text-rose-700 dark:text-rose-300'
        : 'text-slate-900 dark:text-slate-100';

  return (
    <div className="rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2 dark:border-slate-700 dark:bg-surface-950/60">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
};

interface BoqRevertPreviewProps {
  currentProject: Project;
  snapshot: ProjectSnapshot;
  onCancel: () => void;
  onConfirm: () => void;
}

const BoqRevertPreview: React.FC<BoqRevertPreviewProps> = ({ currentProject, snapshot, onCancel, onConfirm }) => {
  const delta = summariseBoqRevisionDelta(snapshot, currentProject);
  const deltaTone = delta.valueDelta < 0 ? 'danger' : 'positive';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-md dark:bg-black/70">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="boq-revert-preview-title"
        className="workspace-shell w-full max-w-3xl overflow-hidden"
      >
        <div className="border-b border-amber-200/80 bg-amber-50/95 px-6 py-5 dark:border-amber-800/70 dark:bg-amber-950/45">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-app bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="workspace-chip mb-2 border-amber-200 bg-white/70 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  Revert preview
                </div>
                <h3 id="boq-revert-preview-title" className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                  Revert to this BoQ revision point?
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  The current project state will be saved as a new restore point first, then the live BoQ will roll back to this checkpoint.
                </p>
              </div>
            </div>
            <button type="button" onClick={onCancel} className="workspace-secondary-btn px-3 py-2 text-xs" aria-label="Cancel BoQ revert">
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>

        <div className="bg-white/95 px-6 py-6 dark:bg-surface-900/96">
          <div className="rounded-app border border-slate-200/80 bg-white/90 p-4 dark:border-slate-700 dark:bg-surface-950/70">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{snapshot.label}</div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {new Date(snapshot.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
                {snapshot.summary && (
                  <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{snapshot.summary}</p>
                )}
                {snapshot.note && (
                  <p className="mt-2 rounded-app-sm border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600 dark:border-slate-700 dark:bg-surface-900 dark:text-slate-300">
                    {snapshot.note}
                  </p>
                )}
              </div>
              <div className="workspace-chip border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-300">
                {delta.scopeLabel}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <RevisionMetric label="Rows" value={`${delta.before.items.toLocaleString()} -> ${delta.current.items.toLocaleString()}`} />
              <RevisionMetric label="Priced rows" value={`${delta.before.pricedItems.toLocaleString()} -> ${delta.current.pricedItems.toLocaleString()}`} />
              <RevisionMetric label="Value" value={`${formatCurrency(delta.before.value)} -> ${formatCurrency(delta.current.value)}`} />
              <RevisionMetric
                label="Value delta"
                value={`${delta.valueDelta >= 0 ? '+' : ''}${formatCurrency(delta.valueDelta)}`}
                tone={delta.valueDelta === 0 ? 'neutral' : deltaTone}
              />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <RevisionMetric label="Added rows" value={delta.addedItems.toLocaleString()} tone={delta.addedItems ? 'positive' : 'neutral'} />
              <RevisionMetric label="Removed rows" value={delta.removedItems.toLocaleString()} tone={delta.removedItems ? 'danger' : 'neutral'} />
              <RevisionMetric label="Changed rows" value={delta.changedItems.toLocaleString()} tone={delta.changedItems ? 'positive' : 'neutral'} />
            </div>

            <div className="mt-5 rounded-app-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/35 dark:text-amber-100">
              This is a project-level rollback to the selected checkpoint. Current work is protected by an automatic pre-revert restore point.
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <button type="button" onClick={onCancel} className="workspace-secondary-btn px-4 py-2.5 text-sm">
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex items-center justify-center gap-2 rounded-app-sm border border-rose-700 bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-app transition hover:bg-rose-700 dark:border-rose-500 dark:bg-rose-600 dark:hover:bg-rose-500"
            >
              <RotateCcw className="h-4 w-4" />
              Revert to this point
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const VERSIONS = [
  {
    version: APP_VERSION,
    date: APP_RELEASE_DATE_ISO.slice(0, 10),
    label: APP_RELEASE_PHASE,
    notes: [
      'Large standards libraries now use normalized SQLite storage instead of loading full library JSON blobs into React state, keeping startup and Library browsing stable for SMM7-sized datasets.',
      'Library browsing now loads section and page items on demand with paged rendering, section/folder/library search scopes, diagnostics, and lower heap usage while navigating large standards.',
      'Library import/export was expanded with folder and section JSON exports, section JSON import fixes, and selectable library exports from the main Library export dialog.',
      'Protected library exports now carry recipient permissions for full export, folder export, section export, and library editing, while still allowing recipients to insert items into bills and edit those bill items.',
      'Library management was tidied with three-dot action menus, alphabetical sorting, and favourite libraries pinned to the top of the list.',
    ],
  },
  {
    version: '0.1.9',
    date: '2026-05-04',
    label: 'Beta',
    notes: [
      'The release countdown tray can now be minimised after the app opens, while still defaulting open on startup so users always see the active update window first.',
      'The dark-mode rollout was completed across the Library shell, with darker structure panels, search areas, folder cards, info popovers, and content surfaces that now match the rest of the green-accented app theme.',
      'Library dark-mode contrast was tightened further so section structure panels no longer fall back to light-looking cards inside a dark workspace.',
      'The overall dark theme now reads more consistently across primary shells, working panes, and branded fills, reducing the last obvious black-or-light mismatches in the standards workflow.',
    ],
  },
  {
    version: '0.1.8',
    date: '2026-05-04',
    label: 'Beta',
    notes: [
      'Library export now opens a dedicated export dialog with a tickbox for protected sharing, allowing libraries to be imported into another HZL QS Suite app copy while preventing them from being exported again from that receiving copy.',
      'Protected library bundles are now tagged at export time, understood on import, and skipped automatically in future exports so protected content cannot be re-shared accidentally.',
      'The app shell now includes a built-in three-month release timer with a persistent bottom countdown bar that shows the current version, release date, expiry date, and time remaining.',
      'Once the release timer expires, the app now switches to a full update-required lock screen so outdated copies stop working until a newer build is installed.',
    ],
  },
  {
    version: '0.1.7',
    date: '2026-05-04',
    label: 'Beta',
    notes: [
      'The Standards Library was expanded into a fuller working workspace with support for library pages, JSON import into sections and pages, AI fill and AI tidy at section or page level, plus stronger delete, rename, search, and ordering controls.',
      'Library folders, sections, and pages now support separate Reference and Title values, display them as one combined label, and sort by the stored reference so standards like SMM7 can stay in the correct commercial order regardless of creation date.',
      'Library browsing was streamlined with collapsible heading groups, structure search, cleaner hover-based info panels, lighter pencil-icon actions, and fixes for imported content reopening correctly after leaving and re-entering the Library.',
      'Bill editing gained inline unit overtyping, a default quantity display of zero decimal places with per-item override in the inspector, page deletion even when pages already contain items, and better header stability when adding new sections or pages.',
      'Extra Over Item is now a first-class line type throughout the app, and the inspector can now change any row from one line type to another, including heading, comment, priced, extra over, provisional sum, and PC sum states.',
      'Project bill styling now covers priced items and extra over items as well as the existing heading and allowance families, with controls for font, size, colour, background, bold, underline, italic, and uppercase styling applied live in the bill workspace.',
      'Inspector editing was improved with whole-line text colour controls so users can recolour a full line without selecting text first.',
      'Excel exports were upgraded so individual bill workbooks now split sections into separate tabs, project workbook export can be issued either as one workbook per bill tab or separate bill workbooks with section tabs, and tender blank issue workbooks follow the same section-tab structure.',
      'Tender comparison now supports Included and Excluded hotkeys using I and E, commercial main-contractor discounting as either a percentage or fixed sum, and submission comments saved alongside each tender return.',
      'The visual language was pushed further toward the app green brand direction, replacing several remaining black fills and primary states across buttons, active cards, headings, and dashboard surfaces.',
    ],
  },
  {
    version: '0.1.6',
    date: '2026-04-07',
    label: 'Pre-Beta',
    notes: [
      'Project settings are now condensed into tighter tabs so workspace options, bill styling, project rules, and recovery controls are easier to reach without long scrolling.',
      'Bill styling now supports real per-line controls for general headings, major headings, sub headings, comments, provisional sums, and PC sums.',
      'Users can now set font family, text size, font colour, background colour, bold, underline, italic, and uppercase options for each bill line family.',
      'The live bill workspace now applies those custom line styles directly, while still preserving stronger highlights for active and selected rows.',
      'Older heading and comment display presets are now folded into the new bill style system so existing projects keep sensible defaults.',
    ],
  },
  {
    version: '0.1.5',
    date: '2026-04-07',
    label: 'Pre-Beta',
    notes: [
      'Bill row dragging now tracks the row under the pointer while you drag, with visible source-row tinting and before-or-after drop indicators.',
      'The help system now opens as a compact dialog and separates How do I, screen guide, and walkthrough modes for clearer task-based guidance.',
      'Walkthrough launches now close the main help dialog first and use stronger anchors around bill controls like add, trade allocation, quick jump, and zoom.',
      'Popup and side-panel help contexts were expanded so guidance follows the active screen or dialog more closely.',
      'Branding was simplified so the left rail is navigation-only and the title bar uses a lighter Desktop-plus-glyph treatment.',
      'The old standalone app rail tile and larger title-bar text stack were removed to give the shell a cleaner, less crowded look.',
    ],
  },
  {
    version: '0.1.4',
    date: '2026-04-06',
    label: 'Pre-Beta',
    notes: [
      'Bill line actions now collapse into a compact overflow menu for priced items, headings, comments, provisional sums, and PC sums.',
      'Quick add now supports quantity, unit, rate, explicit insertion targets, and a restore of numeric sequence creation directly inside the modal.',
      'Selected bill lines can now be imported from other bills into a chosen bill, section, or page location without moving the source content.',
      'Unit values are normalized to lowercase across the live workspace, editors, and exports for more consistent schedules.',
      'Breakdown-style Excel exports now include page totals as well as section totals and bill totals.',
      'Line movement continues to reindex bill references after each move so numbering follows the visible order.',
      'Editor and inspector text-entry surfaces were tightened so standard typing and multiline description editing stay consistent.',
    ],
  },
  {
    version: '0.1.3',
    date: '2026-03-27',
    label: 'Pre-Beta',
    notes: [
      'Bill rows now expose edit and delete actions for headings, comments, and non-priced lines, not just priced items.',
      'Inspector now identifies the selected line type clearly, including heading and comment rows.',
      'Project settings now include manual display presets for heading lines and comment lines in the live bill workspace.',
      'Project workbook export now opens with the summary sheet first, followed by one worksheet per bill.',
      'Bill creation actions were consolidated with a unified top-toolbar add menu for bill, section, and page actions.',
      'Bill quick add placement was tightened again around selected items, with explicit before or after placement against the checked line.',
      'Bill row drag-and-drop was reinforced so line reordering behaves more reliably inside the current bill, section, or page list.',
    ],
  },
  {
    version: '0.1.2',
    date: '2026-03-27',
    label: 'Pre-Beta',
    notes: [
      'Quick add was rebuilt into a cleaner bill-entry modal with description, rate, trade, and location only, plus Save and add another for faster line entry.',
      'Quick add location now supports exact insertion points, including before the first item, after the last item, and between existing bill lines.',
      'When a single item is ticked before quick add, the modal now offers an explicit Before or After placement against that selected item.',
      'Bill rows can now be dragged into a new order within the current bill, section, or page list using the row grip handle.',
      'Dragged item moves now trigger bill reference reindexing so numbering updates to match the new order.',
      'The bill top toolbar was condensed for smaller screens with icon popovers for quick jump and zoom controls, plus a live Bill > Section > Page location breadcrumb.',
      'New item creation now returns to the controlled add-item modal instead of dropping users into the inspector for unsaved draft lines.',
    ],
  },
  {
    version: '0.1.1',
    date: '2026-03-26',
    label: 'Pre-Beta',
    notes: [
      'Bill workspace zoom was reworked so zooming out densifies the bill table inside a fixed frame instead of shrinking the whole workspace.',
      'Focus mode now hides extra section and page guidance strips to maximise live bill space.',
      'Added top-toolbar bulk trade assignment with Bill, Section, and Page tabs for applying trade packages across larger scopes.',
      'Page-level trade assignment wording was clarified so it is obvious when a trade applies to every priced item on a page.',
      'App preferences now include built-in spell check with UK English as the default language, wired into the main editing surfaces.',
      'Add item dropdowns now reposition upward when space is tight, keeping menus on screen near the bottom of the workspace.',
      'Top release badge is now clickable and opens version history directly.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-03-19',
    label: 'Pre-beta',
    notes: [
      'AI product page: avoids duplicate items by rewriting existing matches in place and only appending genuinely new items in bill and library sections.',
      'AI prompt updated to prefer refining or merging existing headings and items before creating new ones.',
      'Trades window: added blank tender Excel export with bill and section structure, reference, description, unit, and quantity prefilled for pricing.',
      'Trades window: added per-contractor workbook export with one blank pricing sheet per contractor for tender issue.',
    ],
  },
  {
    version: '1.05',
    date: '2026-02-26',
    notes: [
      'Item editor modal refreshed with calmer styling, lighter shadow, and a unified accent language.',
      'Tabs and labels switched to sentence case with improved control alignment.',
      'Dimensions and market tabs now use more consistent typography and spacing.',
    ],
  },
  {
    version: '1.04',
    date: '2026-02-26',
    notes: [
      'Bill view gained clearer table hierarchy with subtler row treatment and lighter borders.',
      'Section toolbar tightened into a more compact grouped action row.',
      'Selection bar now shows quick totals with slimmer, clearer status pills.',
    ],
  },
  {
    version: '1.03',
    date: '2026-02-26',
    notes: [
      'App shell was reworked into a clearer desktop chrome with project selector in the header.',
      'Main workspace now uses a three-pane layout with bill table and right-hand inspector.',
      'Bill item clicks now open the inspector for quick edits while full editor access remains available for deeper changes.',
    ],
  },
  {
    version: '1.02',
    date: '2026-02-26',
    notes: [
      'Introduced a more consistent visual system across the main workspace.',
      'Refined shell spacing, typography, and hierarchy for a calmer professional tone.',
      'Polished the bill view and project list for a denser, more modern desktop feel.',
    ],
  },
  {
    version: '1.01',
    date: '2026-02-26',
    notes: [
      'Added the in-app version badge and version history modal.',
      'Converted the app to run as a native Tauri shell with client-side PDF export.',
      'Prepared the codebase for the modern UI refresh.',
    ],
  },
  {
    version: '0.0.0',
    date: 'Initial',
    notes: ['Initial AI Studio export of the bill of quantities generator.'],
  },
];

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  currentProject,
  onCreateSnapshot,
  onCreateBoqRevisionPoint,
  onRestoreSnapshot,
  onClose,
}) => {
  const app = useAppContextOptional();
  const [previewSnapshotId, setPreviewSnapshotId] = React.useState<string | null>(null);
  useHelpContext('VERSION_HISTORY', isOpen);

  React.useEffect(() => {
    if (!isOpen) setPreviewSnapshotId(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const snapshots = currentProject?.snapshots || [];
  const boqRevisionSnapshots = snapshots.filter((snapshot) => snapshot.kind === 'BOQ_REVISION');
  const restorePointSnapshots = snapshots.filter((snapshot) => snapshot.kind !== 'BOQ_REVISION');
  const previewSnapshot = previewSnapshotId
    ? boqRevisionSnapshots.find((snapshot) => snapshot.id === previewSnapshotId) || null
    : null;

  const handleConfirmBoqRevert = () => {
    if (!previewSnapshot || !onRestoreSnapshot) return;
    onRestoreSnapshot(previewSnapshot.id, { skipConfirm: true });
    setPreviewSnapshotId(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md dark:bg-black/60">
      <div data-help-id="help-version-history" className="workspace-shell flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden">
        <div className="border-b border-slate-200/80 bg-white/92 px-6 py-5 dark:border-slate-700/80 dark:bg-surface-900/95">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="workspace-chip mb-3">
                <History className="h-3.5 w-3.5" />
                Restore points and releases
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Version history</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
                Create manual restore points for the active project, or review release notes across the app.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <HelpButton compact onClick={() => app?.openHelp('VERSION_HISTORY')} />
              <button onClick={onClose} className="workspace-secondary-btn px-3 py-2 text-xs" aria-label="Close version history">
                <X className="h-4 w-4" />
                Close
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white/88 px-6 py-6 dark:bg-surface-900/92">
          <div className="space-y-6">
            <div className="workspace-sidebar p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-app bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      <History className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">BoQ revision points</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {currentProject ? `Bill checkpoints for ${currentProject.name}` : 'No active project selected'}
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Record a checkpoint before changing bill quantities, rates, or descriptions. Each point compares against the live BoQ and can be reverted through the safe restore flow.
                  </p>
                </div>
                {currentProject && onCreateBoqRevisionPoint && (
                  <button type="button" onClick={onCreateBoqRevisionPoint} className="workspace-primary-btn px-4 py-2.5 text-sm">
                    <History className="h-4 w-4" />
                    Record BoQ revision point
                  </button>
                )}
              </div>

              {boqRevisionSnapshots.length === 0 ? (
                <div className="workspace-empty mt-5 text-sm text-slate-500 dark:text-slate-400">
                  No BoQ revision points yet. Record one before a controlled bill change if you may need to compare or revert later.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {boqRevisionSnapshots.map((snapshot) => {
                    const delta = currentProject ? summariseBoqRevisionDelta(snapshot, currentProject) : null;
                    const deltaTone = delta && delta.valueDelta < 0 ? 'danger' : 'positive';
                    return (
                      <div key={snapshot.id} className="rounded-app border border-slate-200/80 bg-white/90 p-4 dark:border-slate-700 dark:bg-surface-900/90">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{snapshot.label}</div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {new Date(snapshot.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </div>
                            {snapshot.summary && (
                              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{snapshot.summary}</p>
                            )}
                            {snapshot.note && (
                              <p className="mt-2 rounded-app-sm border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600 dark:border-slate-700 dark:bg-surface-950 dark:text-slate-300">
                                {snapshot.note}
                              </p>
                            )}
                          </div>
                          {onRestoreSnapshot && (
                            <button
                              type="button"
                              onClick={() => setPreviewSnapshotId(snapshot.id)}
                              className="workspace-secondary-btn px-4 py-2 text-xs"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Revert
                            </button>
                          )}
                        </div>
                        {delta && (
                          <div className="mt-4">
                            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                              {delta.scopeLabel}: {formatRevisionDelta(delta)}
                            </div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                              <RevisionMetric label="Rows" value={`${delta.before.items.toLocaleString()} -> ${delta.current.items.toLocaleString()}`} />
                              <RevisionMetric label="Priced" value={`${delta.before.pricedItems.toLocaleString()} -> ${delta.current.pricedItems.toLocaleString()}`} />
                              <RevisionMetric label="Value" value={`${formatCurrency(delta.before.value)} -> ${formatCurrency(delta.current.value)}`} />
                              <RevisionMetric
                                label="Delta"
                                value={`${delta.valueDelta >= 0 ? '+' : ''}${formatCurrency(delta.valueDelta)}`}
                                tone={delta.valueDelta === 0 ? 'neutral' : deltaTone}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="workspace-sidebar p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-app bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                      <Save className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Restore points</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {currentProject ? `Manual snapshots for ${currentProject.name}` : 'No active project selected'}
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Create a restore point before major edits, imports, or rate writeback. Restoring will also save your current state first, so you can undo the rollback if needed.
                  </p>
                </div>
                {currentProject && onCreateSnapshot && (
                  <button type="button" onClick={onCreateSnapshot} className="workspace-primary-btn px-4 py-2.5 text-sm">
                    <Save className="h-4 w-4" />
                    Create restore point
                  </button>
                )}
              </div>

              {restorePointSnapshots.length === 0 ? (
                <div className="workspace-empty mt-5 text-sm text-slate-500 dark:text-slate-400">
                  No restore points yet. Create one before major changes if you want a manual rollback point.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {restorePointSnapshots.map((snapshot) => (
                    <div key={snapshot.id} className="rounded-app border border-slate-200/80 bg-white/90 p-4 dark:border-slate-700 dark:bg-surface-900/90">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{snapshot.label}</div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {new Date(snapshot.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                          {snapshot.summary && (
                            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{snapshot.summary}</p>
                          )}
                        </div>
                        {onRestoreSnapshot && (
                          <button
                            type="button"
                            onClick={() => onRestoreSnapshot(snapshot.id)}
                            className="workspace-secondary-btn px-4 py-2 text-xs"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Restore
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!VERSIONS.length ? (
              <div className="workspace-empty text-sm text-slate-500 dark:text-slate-400">No release notes available.</div>
            ) : (
              <div className="space-y-4">
                {VERSIONS.map((entry, index) => (
                  <div key={entry.version} className="workspace-sidebar p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-app bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                            {index === 0 ? <Sparkles className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              v{entry.version}{entry.label ? ` - ${entry.label}` : ''}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{entry.date}</div>
                          </div>
                        </div>
                      </div>
                      {index === 0 && (
                        <div className="workspace-chip border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
                          <Sparkles className="h-3.5 w-3.5" />
                          Beta
                        </div>
                      )}
                    </div>

                    <ul className="mt-5 space-y-3">
                      {entry.notes.map(note => (
                        <li key={note} className="flex items-start gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                          <span className="mt-2 h-2 w-2 rounded-full bg-primary-500 dark:bg-primary-400" />
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {currentProject && previewSnapshot && (
        <BoqRevertPreview
          currentProject={currentProject}
          snapshot={previewSnapshot}
          onCancel={() => setPreviewSnapshotId(null)}
          onConfirm={handleConfirmBoqRevert}
        />
      )}
    </div>
  );
};
