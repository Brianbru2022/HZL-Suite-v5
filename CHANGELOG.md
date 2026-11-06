# Changelog

## Unreleased

- Added a controlled-launch support process, known-issues register, release channels, pilot programme, Windows signing/verification scripts, and a deliberate signed-installer upgrade path.
- Added opt-in local crash capture. Reports stay on the device and are included only when the user exports Diagnostics.
- Renamed the editable Audit Trail to Local operational history and made its non-immutable status explicit.
- Added local library governance records for owner, source, rate date, index basis, review date, approval status, and a retained change history. Governance is stored with normalized SQLite libraries and exported with library packs.
- Added report-preparation checks for invalid indices, unpriced house and commercial assets, unsupported sales assumptions, stale linked abnormals, unallocated shared commercial costs, and missing or changed evidence.
- Added a controlled eight-case residential/commercial reconciliation register for recording reviewed spreadsheet comparisons before pilot approval.
- Added assumption-source visibility to the internal commercial investment report.

## 0.1.13 - In development

- Added optional estimator rate build-ups for BoQ and library items. Derived rates reconcile labour, plant, materials, preliminaries, subcontractor, and custom components back to the main billed rate without changing tender workflows.
- Added SQLite and `.qsplib` support for rate build-ups, an Excel `Rate Build-ups` reconciliation sheet, and a conditional bill-PDF appendix.
- Added a controlled workbook-import path with worksheet inspection, automatic line classification, total reconciliation, explicit confirmation, a BoQ revision point, and an audit record before imported lines are appended.

## 0.1.11 - 2026-08-07

- Began the stabilisation release with verified source and app-data backup procedures, release-version alignment, and appraisal indexation regression coverage.

- Simplified the first-run shell by collapsing normal expiry detail, replacing full-width AI/storage warnings with a compact top-bar system status pill, and moving planned modules behind the Roadmap rail entry.
- Refreshed the home command centre around continue/create work and workflow health, removing duplicate first-screen project actions.
- Added shared UI contracts for notices, navigation modules, workspace presets, and design tokens, then exposed saved bill workspace presets from the top toolbar.
- Added an optional movable sticky bill totals strip scoped to the bill workspace, a clearer selected-row command bar, and more visible inspector save/navigation state for denser bill review work.
- Expanded release smoke coverage for first-run banner clearance, light/dark viewport checks, rail live/roadmap states, keyboard menu flow, and workspace presets.
- Started the Tender Analysis refactor by extracting the workflow/checklist header, detailed matrix summary panel, and empty tender-team state into focused components while preserving the detailed matrix behaviour.
- Added embedded workspace mode for Library Maintenance, Tender Analysis, Cost Reports, and Audit Trail so they sit inside the app shell with the rail/top bar visible instead of feeling like detached windows.
- Expanded Cost Reports with direct entry points for tender approval PDFs and export/audit history, and added status/date filters plus text export to Audit Trail v1.
- Improved Standards drag feedback by showing the likely insert mode and loaded row count while dragging into a bill.
- Added shared workflow module routing/readiness helpers so the landing hub, project rows, and rail launch modules more consistently.
- Promoted Audits from a placeholder to a beta Audit Trail module backed by the existing local operation history, with filtering, copy, and clear actions.
- Removed the unavailable rail badge from Audits and added a clearer Standards drop preview showing destination, insert mode, row counts, and sample rows before inserting into a bill.
- Made bill Standards drag/drop targets easier to see by lighting up valid bill, section, page, and row destinations while dragging from the Standards panel.
- Clarified the bill Standards insertion panel with plain-English insert modes, suggested scope badges, and a live preview of the exact rows that will be inserted.
- Added a final insert-plan confirmation for larger/structured Standards inserts and made the Standards row list easier to scan with distinct heading, comment, and priced item styling.
- Expanded Audit Trail v1 with bill and tender event categories, logging manual saves, Standards insertions, clear-values actions, bill row/section/page deletes, tender awards, and tender apply-back counts.
- Tightened AI and quick-action modal styling so prompts, AI loading, and clarification flows use the same compact workspace visual language.
- Refined the Trade & Contractor Library with a calmer header, compact contractor editor, neutral global-library wording, and a more useful directory overview.
- Added a clearer Tender Analysis workflow strip and issue checklist covering setup, returns, comparison, award, apply-back, and exports.
- Renamed the product-facing app identity to HZL QS Suite while keeping legacy storage keys stable for existing project/library data.
- Added a home-screen sample project workflow that builds a small bill from an installed SMM7 library where available, with a synthetic fallback if SMM7 is not installed.
- Added an app diagnostics status panel covering storage backend, autosave health, release/expiry information, recent import/export operations, and project/library/trade counts.
- Added a future workflow modules hub with placeholders for take-off, subcontract appointment, valuations, variations, final account, and audit trail.
- Standardised the top toolbar Actions and Project menus on the shared action-list renderer for more consistent grouping, descriptions, disabled states, and warning styling.
- Moved the remaining top toolbar popovers onto the shared viewport-safe menu shell, including project switching, bill selection, quick jump, workspace view controls, trade assignment, and project actions.
- Split the top toolbar controls into smaller menu components so project switching, bill selection, quick jump, bill actions, workspace view controls, trade assignment, and project actions are no longer embedded in the main toolbar layout file.
- Split the extracted top toolbar menu module into one file per control with a compatibility barrel, making the toolbar controls easier to maintain independently.
- Removed legacy blocking CDN scripts, external font links, and the old import map from the desktop HTML shell so the app can load from local bundled assets without hanging on external network/script requests.
- Added a startup error boundary so render failures show a recovery screen instead of leaving the desktop window blank.
- Split bill row, page, section, and clear-values menu definitions out of the main bill workspace file as the next low-risk bill UI maintainability step.
- Split the bill workspace further by extracting row actions, page actions, row display helpers, virtualized bill rows, and the section card into focused modules.
- Lazy-loaded ExcelJS and tender workbook helpers so the large Excel vendor chunk is fetched only when an Excel export action runs rather than during app startup.
- Lazy-loaded PDF generation so the PDF vendor chunk is fetched only when bill, cost-plan, or project-summary PDF exports run.
- Lazy-loaded AI generation flows and split lightweight AI configuration checks so Gemini service code is fetched only when an AI action runs.
- Removed the unused browser-side Gemini SDK client and dependency now that AI generation runs through the Tauri command path.
- Cleared npm audit findings by updating Vite/Vitest/React plugin tooling, upgrading the PDF export stack, and overriding ExcelJS's `uuid` dependency to a patched version.
- Moved large standards libraries toward normalized SQLite storage with lazy item loading, metadata-only React state, and cached library statistics for priced item totals.
- Added real SQLite `.qsplib` library pack import/export with permission flags, row-count progress, and regenerated search text on import.
- Refreshed the library workspace around an unlimited-depth outline editor, section-level JSON import/export, section splitting, and clearer long-operation status feedback.
