# HZL QS Suite 0.1.10 Pilot Release Notes

Date prepared: 2026-06-23
Status: Pilot candidate, pending installed-app smoke completion and npm audit verification.

## Release Focus

This build is focused on commercial pilot hardening rather than new feature expansion. It consolidates settings, improves the first-run shell, reduces detached module surfaces, adds stronger release smoke tooling, and packages a refreshed Windows installer with updated app identity assets.

## Highlights

- Renamed the product-facing app identity to HZL QS Suite while keeping legacy `qs-pro` storage keys stable.
- Added the left-rail Settings workspace for app-wide preferences, project defaults, module settings, and current-project overrides.
- Added movable sticky bill totals with a global default, scoped to the bill workspace.
- Embedded Library, Tender, Reports, Audits, Roadmap, and Settings inside the app shell so rail navigation behaves consistently.
- Added browser smoke coverage across Home, Bill, Library, Tender, Reports, Audits, Roadmap, Settings, sticky totals, context menus, and light/dark themes.
- Added a packaged desktop smoke gate with generated release report and manual installed-app checklist.
- Added a generated Windows installer/app icon and a simplified in-app mark that remains readable in light and dark mode.
- Split Excel export vendor dependencies into export-only chunks so the build output is easier to assess.

## Verification Status

- `npm run lint`: passing locally.
- `npm test -- --run`: passing in the latest desktop smoke gate.
- `npm run smoke:browser:preview`: passing locally.
- `cargo check`: passing in the latest desktop smoke gate.
- `npm run tauri -- build`: passing locally.
- `npm audit --audit-level=moderate`: blocked locally by certificate verification: `unable to verify the first certificate`.
- Build output: the previous oversized `excel-vendor` chunk has been reduced by using ExcelJS's modular browser entry and splitting export-only dependencies. Vite may still report externalised Node module warnings from unused ExcelJS file/CSV/read paths.

## Required Before Pilot Sharing

- Install the generated NSIS installer on a clean Windows profile or disposable VM.
- Confirm desktop/start-menu icon and in-app titlebar mark render correctly in light and dark mode.
- Confirm Settings, project data, and sticky bill totals survive app restart.
- Verify backup/restore against the packaged app data folder and `qs-pro.db`.
- Verify native save/open dialogs for JSON, PDF, Excel, `.qsplib`, and AI config import/remove.
- Re-run `npm audit --audit-level=moderate` from a trusted npm/Windows certificate environment, or record a named accepted exception in the release record.

## Known Limitations

- Desktop SQLite is the supported path for large standards libraries.
- Roadmap modules for take-off, subcontract appointments, valuations, variations, and final account remain placeholders.
- Audit Trail is beta and local-first; it is not an enterprise audit-control system.
- No multi-user collaboration, cloud sync, enterprise permissions, central licensing, BIM/CAD, or drawing take-off is included in this release.
