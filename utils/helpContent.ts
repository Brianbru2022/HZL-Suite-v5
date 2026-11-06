import type { HelpArticle, HelpContextId, HelpHowTo } from '../types';
import { APP_NAME } from './branding';

function article(
  id: HelpContextId,
  title: string,
  summary: string,
  sections: HelpArticle['sections'],
  howTosOrWalkthroughSteps?: HelpHowTo[] | HelpArticle['walkthroughSteps'],
  walkthroughStepsArg?: HelpArticle['walkthroughSteps'],
): HelpArticle {
  const howTos = walkthroughStepsArg ? (howTosOrWalkthroughSteps as HelpHowTo[] | undefined) : undefined;
  const walkthroughSteps = walkthroughStepsArg || (Array.isArray(howTosOrWalkthroughSteps) && howTosOrWalkthroughSteps.length > 0 && 'body' in howTosOrWalkthroughSteps[0]
    ? (howTosOrWalkthroughSteps as HelpArticle['walkthroughSteps'])
    : undefined);
  return { id, title, summary, sections, howTos, walkthroughSteps };
}

export const helpArticles: Record<HelpContextId, HelpArticle> = {
  HOME: article(
    'HOME',
    'Home and project list',
    'Start new workspaces, reopen existing ones, import backups, and move into the live estimating workspace.',
    [
      { title: 'What you can do here', bullets: ['Create a new project from scratch when you need a clean estimating workspace.', `Import CSV, CITE / EBQ, or ${APP_NAME} JSON files when the job already exists in another format.`, 'Open any existing project card to jump straight back into the last working bill.'] },
      { title: 'Typical workflow', bullets: ['Click New project and enter the project details to create a workspace shell.', 'If you already have schedule data, use Import project and choose the correct import type before opening the workspace.', 'Once the project list is populated, use the most recent card to reopen live work and continue editing from the preferred bill.'] },
      { title: 'Tips and warnings', bullets: [`Use JSON import when restoring an ${APP_NAME} backup; use CSV or CITE / EBQ when bringing in external schedules.`, 'Projects open into their preferred bill automatically, so you do not need to choose a bill every time from the home screen.', 'The Libraries, Trades, Settings, and release notes remain accessible even before any project is open.'] },
    ],
    [
      {
        id: 'home-create-project',
        title: 'How do I create a new project?',
        summary: 'Start a fresh workspace from the home screen.',
        steps: [
          'Click New project on the home screen.',
          'Enter the project details in the create dialog.',
          'Save the project to enter the live workspace.',
        ],
        walkthroughStepId: 'home-new-project',
      },
      {
        id: 'home-import-project',
        title: 'How do I import an existing project or bill file?',
        summary: 'Use the import menu when the data already exists elsewhere.',
        steps: [
          'Open Import project from the home screen.',
          `Choose the correct import type for CSV, CITE / EBQ, or ${APP_NAME} JSON.`,
          'Complete the import, then open the new or restored workspace from the project list.',
        ],
        walkthroughStepId: 'home-import',
      },
    ],
    [
      { id: 'home-new-project', title: 'Create a project', body: 'Start here when you want a new live workspace.', targetId: 'home-new-project' },
      { id: 'home-import', title: 'Import existing data', body: 'Use import actions to restore a project or seed a new one from a schedule.', targetId: 'home-import' },
      { id: 'home-open-workspace', title: 'Open a workspace', body: 'Project cards let you jump back into live bills and trade workflows.', targetId: 'home-project-list' },
    ],
  ),
  APPRAISALS: article(
    'APPRAISALS',
    'Development appraisals',
    'Compare early residential and commercial development options without changing live project data.',
    [
      { title: 'What you can do here', bullets: ['Create global appraisal records that can optionally link to a project for context.', 'Compare residential sales and commercial income options using residual land value or known land profit-on-GDV modes.', 'Review month-by-month cashflow, finance cost, peak funding, and decision notes before exporting a decision pack.'] },
      { title: 'Typical workflow', bullets: ['Create an appraisal, link a project if useful, then add one or more options.', 'Enter revenue, cost, cashflow timing, target profit, finance, and known land assumptions for each option.', 'Use the comparison table to mark a recommended option and export PDF or Excel evidence for review.'] },
      { title: 'V1 boundaries', bullets: ['Appraisals are decision-support records and do not update bills, tenders, cost plans, or libraries.', 'Tax, stamp duty, VAT, lender fees, and regional statutory tables are manual rows only in this version.', 'Linked project totals are inserted as read-only snapshots so later project edits do not silently rewrite the appraisal.'] },
    ],
  ),
  BILL_WORKSPACE: article(
    'BILL_WORKSPACE',
    'Bill workspace',
    'Build and edit the live bill, assign trades, import lines, reorder content, and export working books from one screen.',
    [
      { title: 'What you can do here', bullets: ['Add bills, sections, pages, and individual lines from the top toolbar or the local add buttons inside the bill.', 'Click descriptions to edit lines, use the inspector for quick changes, and use the row action menu for move, delete, and assign actions.', 'Assign trades at item, page, section, or whole-bill level depending on how much of the bill is already structured.'] },
      { title: 'Typical workflow', bullets: ['Choose the active bill from the top toolbar, then decide whether you are working bill-wide, section-by-section, or page-by-page.', 'Add or import lines into the correct section or page, then use quick add for fast entry and the full editor only when you need richer measurement or AI tools.', 'Refine quantities, units, rates, and trade assignment, then export working books or move the package into tender analysis once the bill is commercially ready.'] },
      { title: 'Best ways to work', bullets: ['Quick add is best for rapid line entry, especially when you are adding several similar items in one area of the bill.', 'Use the inspector when you want to change one selected line without leaving the bill view, and use the full editor when you need dimensions, AI research, or deeper line control.', 'Focus mode and zoom are there to maximise schedule visibility when you are reviewing or editing a dense page.'] },
      { title: 'Useful shortcuts and behaviours', bullets: ['If one line is ticked before you open quick add, you can place the new line before or after that anchor line.', 'Selected lines can also be used for bulk trade assignment or line import placement, which is much faster than manual repositioning later.', 'Use import lines when a similar bill already exists elsewhere in the project set and you want to reuse headings, comments, or priced items without rebuilding them.'] },
    ],
    [
      {
        id: 'bill-allocate-trade',
        title: 'How do I allocate a trade package?',
        summary: 'You can assign trades at item, page, section, or bill scope.',
        steps: [
          'For one line, click the trade badge or use the row action menu.',
          'For a whole page, section, or bill, open the trade assignment control from the top toolbar.',
          'Choose the scope tab, then pick the bill, section, or page and the trade package.',
          'Click Apply to update every priced line in that scope.',
        ],
        walkthroughStepId: 'bill-trade-assign-open',
      },
      {
        id: 'bill-add-line',
        title: 'How do I add a new item in the right place?',
        summary: 'Use quick add with an explicit insertion point.',
        steps: [
          'Open the Add menu from the top toolbar or use the local Add item button in the active bill area.',
          'Choose the line type and enter the description, quantity, unit, rate, and trade as needed.',
          'Use the location selector to place the line before, after, or at the top or bottom of the current bill, section, or page.',
          'If one line is ticked first, quick add can place the new line before or after that selected anchor.',
        ],
        walkthroughStepId: 'bill-add',
      },
      {
        id: 'bill-import-lines',
        title: 'How do I import lines from another bill?',
        summary: 'Reuse lines from another bill without rebuilding them.',
        steps: [
          'Open the Add menu and choose the import-lines workflow.',
          'Select the source project and bill.',
          'Tick the exact headings, comments, or priced lines you want to bring across.',
          'Choose the destination bill, section, or page and the insertion point, then complete the import.',
        ],
      },
      {
        id: 'bill-reorder-lines',
        title: 'How do I move a line and renumber the page?',
        summary: 'Move lines through the live sequence so references update in order.',
        steps: [
          'Use the row action menu to move the line up or down through items, headings, and comments.',
          'Move the line until it sits in the correct visible position in the page or section.',
          `${APP_NAME} reindexes the references after the move so numbering follows the new order.`,
        ],
        walkthroughStepId: 'bill-table',
      },
    ],
    [
      { id: 'bill-toolbar', title: 'Use the top toolbar', body: 'Start here to switch bills, open add controls, jump around the bill, zoom the workspace, and access whole-scope trade assignment.', targetId: 'help-bill-toolbar' },
      { id: 'bill-add', title: 'Open the add controls', body: 'Use this button to add bills, sections, or pages and to launch the item-creation flow in the right bill context.', targetId: 'help-bill-add' },
      { id: 'bill-trade-assign-open', title: 'Open bulk trade assignment', body: 'This control lets you apply one trade package to a whole bill, section, or page without changing items one by one.', targetId: 'help-bill-trade-assign' },
      { id: 'bill-quick-jump', title: 'Jump to the right working area', body: 'Use quick jump to move straight to a section or page instead of scrolling through the whole bill.', targetId: 'help-bill-quick-jump' },
      { id: 'bill-table', title: 'Work directly in the schedule', body: 'Descriptions, quantities, trade badges, row actions, and line order all work against the live schedule here.', targetId: 'help-bill-table' },
      { id: 'bill-inspector', title: 'Use the side inspector', body: 'When one line is selected, the side inspector gives you fast live editing without leaving the bill.', targetId: 'help-inspector-panel' },
    ],
  ),
  LIBRARY: article(
    'LIBRARY',
    'Library workspace',
    'Store reusable sections, folders, and bill-ready standard items so they can be inserted back into live projects.',
    [
      { title: 'What you can do here', bullets: ['Browse libraries, folders, and sections of reusable standards content.', 'Import and export library content so standards can move between users or machines.', 'Open saved items in the editor or push them back into a live project when you need to reuse wording or rates.'] },
      { title: 'Typical workflow', bullets: ['Open a library from the left column, then drill into a folder and section until the items you need are visible in the main panel.', 'Review or edit the library lines, then use the project insertion action when you want to bring them back into a bill.', 'Keep the library clean by grouping similar content into clearly named folders and sections rather than letting one library grow too flat.'] },
      { title: 'Tips and warnings', bullets: ['Libraries are for reusable standards, not live project-specific tender comparison or sign-off records.', 'Use clear names for libraries, folders, and sections so other users know what each standard set is for.', 'Import and export are best used for controlled movement of standard content, not for active bill collaboration.'] },
    ],
  ),
  TRADES: article(
    'TRADES',
    'Trade packages',
    'Build trade packages, manage linked contractors, and push packages into tender issue and comparison workflows.',
    [
      { title: 'What you can do here', bullets: ['Create and maintain trade packages for procurement-ready parts of the bill.', 'Add contractors, record their commercial status, and manage the active tender team for each package.', 'Use package exports to issue tender information or move directly into tender analysis when returns start arriving.'] },
      { title: 'Typical workflow', bullets: ['Create or open a trade package and confirm the package name reflects the actual procurement scope.', 'Link contractors and review package readiness before issue so the shortlist is commercially sensible.', 'When returns exist, use the next-action area to jump into tender analysis instead of continuing to manage the package as if it is pre-issue.'] },
      { title: 'Tips and warnings', bullets: ['Contractor ratings are there to help shortlist decisions, so keep them maintained rather than treating them as cosmetic labels.', 'The next-action box is designed to tell you the best commercial step for the current package state.', 'Trade workbook, blank tender, and tender sheets are issue tools; use them intentionally so issued information stays controlled.'] },
    ],
    [
      {
        id: 'trades-create-package',
        title: 'How do I create a trade package?',
        summary: 'Set up a procurement-ready package from the trades screen.',
        steps: [
          'Open the Trade & Contractor Library and choose the create-package action.',
          'Name the package for the actual procurement scope, not just the bill heading.',
          'Review the package list and make sure the correct trade is selected before adding contractors or exporting tender files.',
        ],
        walkthroughStepId: 'trades-list',
      },
      {
        id: 'trades-add-contractors',
        title: 'How do I add contractors to a package?',
        summary: 'Keep the tender team accurate before issuing tender information.',
        steps: [
          'Open the selected trade package.',
          'Use the contractor area to add, rate, or review the tender team.',
          'Confirm the next-step box still reflects the commercial stage you expect before moving into tender issue or analysis.',
        ],
        walkthroughStepId: 'trades-contractors',
      },
    ],
    [
      { id: 'trades-list', title: 'Choose a trade package', body: 'The package list controls which procurement workspace is active.', targetId: 'help-trades-list' },
      { id: 'trades-next-step', title: 'Follow the next step', body: 'The package summary highlights the next procurement action for the selected trade.', targetId: 'help-trades-next-step' },
      { id: 'trades-contractors', title: 'Manage contractor data', body: 'Use the contractor tools to keep the tender team accurate and current.', targetId: 'help-trades-contractors' },
    ],
  ),
  TENDER_ANALYSIS: article(
    'TENDER_ANALYSIS',
    'Tender analysis',
    'Compare contractor returns, review the commercial position, choose a winner, and manage approval and apply-back.',
    [
      { title: 'What you can do here', bullets: ['Switch between overview and detailed matrix modes depending on whether you are reviewing the commercial position or directly entering rates.', 'Enter contractor, QS, negotiated, and budget-related values directly in the matrix and overview controls.', 'Select the winning contractor, create the approval form, upload returned approvals, and apply the chosen rates back into the live bill.'] },
      { title: 'Typical workflow', bullets: ['Select the trade package in the top command bar, confirm the tender team is correct, and check the due date and response state.', 'Use detailed matrix when you need direct line-by-line rate entry or comparison; use overview when you want to review the commercial leader and complete the sign-off workflow.', 'Once a winner is selected, complete the approval form, record the rationale, and only then apply the chosen position back into the bill.'] },
      { title: 'Best ways to work', bullets: ['Detailed matrix is the main working surface for commercial input, so use it when live returns are being entered or tested.', 'Overview is the best place for winner selection, approval preparation, and confirming the final commercial position.', 'Budget checks, approval records, and returned approval documents remain tied to the tender package so the audit trail stays intact.'] },
      { title: 'Tips and warnings', bullets: ['Do not apply rates back into the bill until the winner and approval state are commercially agreed.', 'Use the top command bar as the primary control strip; the right rail is intended for status and information only.', 'If a trade has no live returns yet, issue the blank tender workbook first, then come back into the detailed matrix once responses arrive.'] },
    ],
    [
      {
        id: 'tender-select-winner',
        title: 'How do I choose a winning contractor?',
        summary: 'Use overview to decide and then lock the commercial choice.',
        steps: [
          'Open the Overview tab to review the leading commercial position.',
          'Select the winning contractor and confirm the selection when prompted.',
          'Complete the rationale and approval information before applying rates back to the bill.',
        ],
        walkthroughStepId: 'tender-overview',
      },
      {
        id: 'tender-enter-rates',
        title: 'How do I enter contractor rates?',
        summary: 'Use the detailed matrix for direct commercial input.',
        steps: [
          'Switch to Detailed matrix from the command bar.',
          'Click into the contractor, negotiated, or QS cells and overwrite the existing value with a two-decimal rate.',
          'Use the command bar controls to compare, plug gaps, or test the selected mix before finalising a winner.',
        ],
        walkthroughStepId: 'tender-matrix',
      },
      {
        id: 'tender-apply-back',
        title: 'How do I apply the selected contractor back to the bill?',
        summary: 'Use the approval workflow first, then write the chosen rates back.',
        steps: [
          'Select the winner and complete the approval form information.',
          'Create or review the approval form and confirm the commercial rationale is recorded.',
          'Use the Apply to bill controls to push the chosen contractor rates back into the live bill with an audit trail.',
        ],
        walkthroughStepId: 'tender-command-bar',
      },
    ],
    [
      { id: 'tender-command-bar', title: 'Use the command bar', body: 'This top row controls package selection, exports, compare mode, and apply-back actions.', targetId: 'help-tender-command-bar' },
      { id: 'tender-overview', title: 'Review the commercial position', body: 'The overview shows the leading contractor and the current procurement state.', targetId: 'help-tender-overview' },
      { id: 'tender-matrix', title: 'Enter and compare rates', body: 'The matrix is where you work line-by-line through contractor and QS rates.', targetId: 'help-tender-matrix' },
    ],
  ),
  ANALYTICS: article(
    'ANALYTICS',
    'Project analytics',
    'Review commercial distribution, trade allocation, and high-level package signals before moving into procurement or bill cleanup.',
    [
      { title: 'What you can do here', bullets: ['Inspect project value split by trade.', 'Spot unassigned value and concentration risk.', 'Jump into trade packaging or tender work from an informed starting point.'] },
      { title: 'Typical workflow', bullets: ['Use the KPIs to identify the biggest issue.', 'Follow the next action into trades or tender analysis.', 'Return after trade cleanup to confirm improved coverage.'] },
    ],
  ),
  COST_PLAN: article(
    'COST_PLAN',
    'Cost plan',
    'Create and review a higher-level elemental or conceptual commercial breakdown linked back to the live bill structure.',
    [
      { title: 'What you can do here', bullets: ['Switch between bill-led and AI-assisted cost plan views.', 'Review confidence, contingency, and elemental totals.', 'Save updated cost plan revisions back to the project.'] },
      { title: 'Tips', bullets: ['Treat the cost plan as reporting and planning, not line-by-line BoQ editing.', 'Use the notes and assumptions fields to explain judgement-based allowances.'] },
    ],
  ),
  PROJECT_SUMMARY: article(
    'PROJECT_SUMMARY',
    'Project summary',
    'Review rolled-up commercial totals by bill or by bill plus section, then export polished summary reports.',
    [
      { title: 'What you can do here', bullets: ['Switch summary mode between bill-only and bill-plus-section views depending on how much detail the audience needs.', 'Review rolled-up totals without opening every live bill.', 'Export the summary to Excel or PDF for reporting and internal review.'] },
      { title: 'Best ways to use it', bullets: ['Use bill-only mode for management or client-facing totals when section-level detail is unnecessary.', 'Use bill-plus-section mode when you need to explain where value sits without exposing every individual BoQ line.', 'Treat this as a reporting surface rather than an editing screen.'] },
      { title: 'Tips and warnings', bullets: ['House type multipliers are already applied here, so repeated house-type bills are reflected in the roll-up.', 'If the summary looks wrong, fix the live bill structure first, then come back here to confirm the corrected totals.', 'Use the project workbook export when you need a full breakdown pack, not just a summary sheet.'] },
    ],
  ),
  PROJECT_SETTINGS: article(
    'PROJECT_SETTINGS',
    'Project settings',
    'Control project identity, workspace mode, measurement standard, guidance behavior, and display preferences.',
    [
      { title: 'What you can do here', bullets: ['Change project metadata such as name, client, location, and working rules.', 'Set workspace mode, bill layout preferences, and line-display presets.', 'Adjust heading and comment presentation so the live bill and exports stay visually consistent.'] },
      { title: 'Best ways to use it', bullets: ['Set these preferences before heavy bill editing so the workspace behaves correctly from the start.', 'Use the heading and comment presets when you want a consistent office standard rather than ad-hoc formatting.', 'Treat these as project rules and presentation settings, not as a replacement for editing line data directly.'] },
      { title: 'Tips and warnings', bullets: ['These settings shape how the workspace behaves, but they do not rewrite the underlying bill content by themselves.', 'If you change display presets, review the bill and an export so you confirm the new presentation looks right in both places.', 'AI configuration controls belong here only when you are managing project-specific access from the project settings view.'] },
    ],
  ),
  APP_PREFERENCES: article(
    'APP_PREFERENCES',
    'App preferences',
    'Manage device-level behavior such as theme, keyboard help, spellcheck, and private AI configuration.',
    [
      { title: 'What you can do here', bullets: ['Switch light, dark, or system theme for the whole app.', 'Open the keyboard shortcuts guide from the same preferences surface.', 'Import or manually store the private AI configuration and manage spellcheck behavior.'] },
      { title: 'Best ways to use it', bullets: ['Use this screen for device-wide behavior rather than anything tied to one project.', 'If AI import is failing, use the manual validation route here instead of assuming the config file is invalid.', 'Use spellcheck settings here when you want UK English or another supported typing behavior across editors.'] },
      { title: 'Tips and warnings', bullets: ['Settings can apply across the whole app or act as project-specific overrides, depending on the section you use.', 'Spellcheck runs while you type in supported text fields; there is no separate spellcheck run button.', 'Imported AI config should only be used on trusted machines because it can contain private credentials.'] },
    ],
  ),
  KEYBOARD_SHORTCUTS: article(
    'KEYBOARD_SHORTCUTS',
    'Keyboard shortcuts',
    'Review the desktop shortcut set for fast navigation, bill editing, exports, and command access.',
    [
      { title: 'What you can do here', bullets: ['Scan the current shortcuts by category.', 'Use them to move faster through the bill and project shell.', 'Return here whenever you want a refresher on command access.'] },
    ],
  ),
  ITEM_EDITOR: article(
    'ITEM_EDITOR',
    'Full item editor',
    'Use the full editor when you need deeper control over a bill line, including dimensions, AI assistance, and market research.',
    [
      { title: 'What you can do here', bullets: ['Edit description, quantity, unit, rate, trade, and other commercial fields in one place.', 'Use dimensions, AI tools, and market analysis when the line needs more than a quick text or rate change.', 'Save changes or move between items without closing the editor.'] },
      { title: 'Typical workflow', bullets: ['Use the general tab for the main commercial fields and description.', 'Move to dimensions when the quantity needs a proper take-off rather than a single entered value.', 'Use AI and market tools only when they add value, then review the draft before saving it back to the bill.'] },
      { title: 'Tips and warnings', bullets: ['Use the full editor for deeper line work rather than rapid entry of many short items.', 'Quick add is usually the faster route for repetitive line creation.', 'AI suggestions should still be reviewed commercially before you save them into the live bill.'] },
    ],
    [
      {
        id: 'item-editor-ai-help',
        title: 'How do I use AI in the item editor?',
        summary: 'Use AI to support, not replace, commercial judgement.',
        steps: [
          'Open the full item editor for the selected line.',
          'Use the AI or market-research tools only for the field you need help with.',
          'Review the suggestion carefully, then save only the parts you want back into the live bill.',
        ],
        walkthroughStepId: 'item-editor-ai',
      },
    ],
    [
      { id: 'item-editor-main', title: 'Edit the core item fields', body: 'Use the general tab for the main commercial and descriptive fields.', targetId: 'help-item-editor-main' },
      { id: 'item-editor-ai', title: 'Use AI carefully', body: 'AI tools can suggest descriptions, measurements, and research, but you still control what is saved.', targetId: 'help-item-editor-ai' },
    ],
  ),
  QUICK_ADD: article(
    'QUICK_ADD',
    'Quick add',
    'Enter new bill lines quickly, choose their type and location, and optionally generate multiple numeric variants at once.',
    [
      { title: 'What you can do here', bullets: ['Create priced items, headings, comments, provisional sums, and PC sums without leaving the current bill context.', 'Set quantity, unit, rate, trade, and exact insertion point for priced items.', 'Generate multiple stepped items from a single numeric description pattern when one line needs to become a range.'] },
      { title: 'Typical workflow', bullets: ['Choose the line type first so the modal knows whether commercial fields should be active.', 'Enter the description and, for priced lines, the quantity, unit, rate, trade, and destination location.', 'Save once for a single line or use Save and add another when you are entering several items in sequence.'] },
      { title: 'Best ways to use it', bullets: ['If one line is selected before opening quick add, use the before/after placement control to anchor the new line exactly where it should go.', 'Use quick add for fast bill production and reserve the full editor for richer line development.', 'Use Create multiple items when the description contains a number that should expand into a stepped set of lines.'] },
      { title: 'Tips and warnings', bullets: ['Sequence generation uses the first numeric token in the description, so check the preview before saving.', 'Headings and comments are non-priced lines, so quantity, unit, rate, and trade are not the focus for those line types.', 'If location is wrong when you save, you will have to move the line afterward, so set the insertion point carefully.'] },
    ],
    [
      {
        id: 'quick-add-place-line',
        title: 'How do I place a line in the right location?',
        summary: 'Use the location picker before saving so the line lands exactly where you want it.',
        steps: [
          'Open quick add from the current bill, section, or page.',
          'Choose the line type and complete the line details.',
          'Use Location to target the correct bill, section, or page and choose before, after, top, or bottom placement.',
          'If a single line was selected first, use the before/after anchor options for that exact line.',
        ],
        walkthroughStepId: 'quick-add-location',
      },
      {
        id: 'quick-add-sequence-help',
        title: 'How do I create multiple items from one description?',
        summary: 'Use the sequence expander when one numeric description should become several stepped lines.',
        steps: [
          'Enter a description that contains the starting number to expand.',
          'Open Create multiple items.',
          'Set the start, end, and interval values, then review the preview.',
          'Create the sequence once the generated descriptions match the bill wording you want.',
        ],
        walkthroughStepId: 'quick-add-sequence',
      },
    ],
    [
      { id: 'quick-add-type', title: 'Pick the line type', body: 'Choose whether you are adding a priced item, heading, comment, or allowance line.', targetId: 'help-quick-add-type' },
      { id: 'quick-add-location', title: 'Set the exact insertion point', body: 'Choose where the new line lands before saving.', targetId: 'help-quick-add-location' },
      { id: 'quick-add-sequence', title: 'Generate multiple items', body: 'Open the sequence tools when one description should create a stepped range of lines.', targetId: 'help-quick-add-sequence' },
    ],
  ),
  INSPECTOR: article(
    'INSPECTOR',
    'Inspector panel',
    'Use the inspector for fast live editing of the currently selected line without leaving the bill workspace.',
    [
      { title: 'What you can do here', bullets: ['Edit the selected line live without leaving the bill workspace.', 'Move to the previous or next visible line quickly while staying in editing mode.', 'Open the full editor when the selected line needs dimensions, AI tools, or deeper commercial work.'] },
      { title: 'Best ways to use it', bullets: ['Use the inspector for fast text, quantity, rate, unit, and trade changes on the currently selected line.', 'Treat it as the quick-edit surface for the bill rather than the place for heavy line development.', 'Use the line-type label at the top to confirm whether you are editing a priced item, heading, comment, or allowance line.'] },
      { title: 'Tips and warnings', bullets: ['The inspector is best for quick edits, not complex measurement take-off or multi-step line creation.', 'If a line needs richer description work or AI support, open the full editor instead of trying to force it through the inspector.', 'Changes in the inspector are live to the selected line, so make sure the right row is selected before editing.'] },
    ],
    [
      {
        id: 'inspector-edit-line',
        title: 'How do I edit a selected line quickly?',
        summary: 'Use the inspector as the fast edit surface for the current row.',
        steps: [
          'Select a single line in the bill workspace.',
          'Use the inspector to change description, quantity, unit, rate, or trade directly.',
          'Move to the previous or next line from the inspector header if you are reviewing several lines in sequence.',
        ],
        walkthroughStepId: 'inspector-panel',
      },
    ],
    [
      { id: 'inspector-panel', title: 'Use the live inspector', body: 'This side panel is for fast editing of the currently selected line without opening the full item editor.', targetId: 'help-inspector-panel' },
    ],
  ),
  IMPORT_BILL_LINES: article(
    'IMPORT_BILL_LINES',
    'Import lines from another bill',
    'Copy selected lines from another bill into the current project structure without removing them from the source.',
    [
      { title: 'What you can do here', bullets: ['Choose a source project and bill.', 'Tick the specific lines to bring across.', 'Set the destination location inside the current bill structure.'] },
      { title: 'Tips', bullets: ['This is a copy/import flow, not a move.', 'Use it to reuse headings, comments, or priced lines from similar bills.'] },
    ],
  ),
  COPY_CONTENT: article(
    'COPY_CONTENT',
    'Copy content',
    'Copy a bill, section, or page into another project location or library target without changing the original source.',
    [
      { title: 'What you can do here', bullets: ['Send content into a new or existing project.', 'Copy into a bill, section, or library target depending on the source type.', 'Rename the copied content while keeping the original intact.'] },
    ],
  ),
  ASK_AI: article(
    'ASK_AI',
    'Ask AI',
    'Use the in-app AI assistant for project questions, structured prompting, and workflow support tied to the live workspace.',
    [
      { title: 'What you can do here', bullets: ['Ask project-aware questions.', 'Refine drafting, hierarchy, and commercial thinking.', 'Use attached context from the current workspace.'] },
      { title: 'Tips', bullets: ['Built-in help covers how the screen works; Ask AI is better for “what should I do here?” or “rewrite this” style questions.'] },
    ],
  ),
  ASSEMBLIES: article(
    'ASSEMBLIES',
    'Section assemblies',
    'Save reusable live sections and apply them back into other projects as structured assemblies.',
    [
      { title: 'What you can do here', bullets: ['Capture a section as a reusable assembly.', 'Review saved assemblies and their source provenance.', 'Apply an assembly back into a project bill.'] },
    ],
  ),
  BILL_SETTINGS: article(
    'BILL_SETTINGS',
    'Bill settings',
    'Adjust bill-specific naming and working preferences without editing the lines themselves.',
    [
      { title: 'What you can do here', bullets: ['Rename and configure the active bill.', 'Review bill-level options before continuing line editing.'] },
    ],
  ),
  PROMPT_MODAL: article(
    'PROMPT_MODAL',
    'Create and rename prompts',
    'Use the prompt modal for focused create, rename, and add flows driven by the current workspace context.',
    [
      { title: 'What you can do here', bullets: ['Create projects, bills, sections, pages, trades, and related records.', 'Rename structural parts of the live workspace.', 'Complete one focused action with minimal distraction.'] },
    ],
  ),
  VERSION_HISTORY: article(
    'VERSION_HISTORY',
    'Version history and restore points',
    'Review app release notes and project restore points so you can understand changes and roll back safely when needed.',
    [
      { title: 'What you can do here', bullets: ['Read release notes for the current version.', 'Create restore points manually.', 'Restore an earlier project state when you need to undo major changes.'] },
    ],
  ),
};

export function getHelpArticle(id: HelpContextId): HelpArticle {
  return helpArticles[id];
}
