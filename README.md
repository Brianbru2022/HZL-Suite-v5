# HZL QS Suite

HZL QS Suite is a desktop QS workspace for building bills of quantities, managing standards libraries, comparing tenders, exporting reports, and supporting commercial project workflows.

This repository contains the v0.1.25 source snapshot and the row-placement fix: inserts and drops go below the target row. Holding Ctrl at library drag release inserts just the selected library line; otherwise the suggested block is used. Library drops copy, bill row drops move, and Before remains an explicit menu choice.

The four libraries bundled into the app are included in `data/`. External library packs, local databases, private configuration, build output, dependencies, and installers are excluded.

The placement update passed 41 focused unit tests, 43 browser regressions, TypeScript checks, and the production frontend build. Desktop verification with the installed app remains pending.

An existing detailed-editor navigation test (the Next priced item arrow) fails in the original v0.1.25 source as well as this snapshot. It is outside the placement update.

## Current Focus

- BoQ creation with bills, sections, pages, headings, comments, and priced items.
- SQLite-backed standards libraries for large datasets.
- Library JSON and `.qsplib` pack import/export.
- Trade package setup and tender comparison.
- Excel/PDF exports for project, bill, tender, and summary outputs.
- Cost Reports and Audit Trail beta workspaces inside the main app shell.
- AI-assisted drafting and checking, with user review remaining the commercial source of truth.

## Planned Workflow Modules

The project workspace includes placeholders for future QS workflow modules:

- Take-off linked to BoQ item quantities.
- Subcontract appointment from approved tender packages.
- Valuation periods, progress quantities, retention, and payment summaries.
- Variations register and agreed change values.
- Final account reconciliation.

These placeholders do not create or change project data yet.

## Development

Prerequisites:

- Node.js
- Rust and the Tauri prerequisites for the target platform

Install and run:

```bash
npm install
npm run dev
```

Common checks:

```bash
npm run lint
npm test -- --run
npm run build
npm run tauri -- build
```

Release support:

- See `RELEASE_CHECKLIST.md` before creating a distributable build.
- See `BACKUP_AND_RESTORE.md` before major imports, migrations, or release work.
- See `KNOWN_LIMITATIONS.md` for current early-access boundaries.

## Data And Compatibility

The product name is HZL QS Suite, but existing local storage and SQLite compatibility keys may still use the historic `qs-pro` prefix. Do not rename those keys casually, or existing projects and libraries may appear to be missing.

Large standards libraries should use the desktop SQLite path. JSON remains available for compatibility and smaller/manual exports.
