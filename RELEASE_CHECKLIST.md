# Release Checklist

Use this checklist before creating an installer or sharing a build.

## Required Checks

```bash
npm run lint
npm test -- --run
npm run build
npm run smoke:browser:preview
cd src-tauri
cargo check
npm run tauri -- build
```

For pilot builds, run the packaged desktop gate from the repo root:

```bash
npm run smoke:desktop
```

Attach the generated `DESKTOP_RELEASE_SMOKE_REPORT.md` and completed `PACKAGED_DESKTOP_SMOKE_CHECKLIST.md` from `artifacts/desktop-release-smoke/` to the release record.

## Manual Smoke Tests

- Create a project.
- Create a bill, section, page, heading, comment, and priced item.
- Confirm Add destination choices are correct.
- Clear rates only, quantities only, and both.
- Import and export project JSON.
- Open a large standards library without loading all item rows into React state.
- Insert a library item into a bill.
- Export and import a `.qsplib` library pack.
- Run tender comparison and apply a selected winner.
- Open `Status` and confirm SQLite storage is available.
- Check recovery/degraded-storage messaging if SQLite is unavailable.
- Use `Settings > General > Backup now` and confirm a `.qsbackup` file is written in the packaged desktop app.
- Use `Settings > General > Export diagnostics` and attach the diagnostics report to the release record.
- Install the packaged app on a clean Windows test profile or disposable VM.
- Confirm Settings, project data, and sticky bill totals state survive app restart.
- Verify backup and restore using the packaged app data folder and `qs-pro.db`.
- Verify native save/open dialogs for JSON, PDF, Excel, `.qsplib`, and AI config import/remove.
- Verify the installer with `scripts/verify-windows-installer-signature.ps1`; unsigned installers are internal test artefacts only.
- Complete the deliberate upgrade path in `WINDOWS_RELEASE_AND_UPDATE.md` on a clean test profile, retaining the pre-upgrade `.qsbackup`.
- For a Pilot issue, complete the install, use, export, backup/restore, and upgrade scenarios in `PILOT_PROGRAMME.md` for every named participant.

## Release Folder Contents

- Installer.
- `RELEASE_NOTES_0.1.11.md`.
- Changelog.
- Known limitations.
- Backup and restore instructions.
- Packaged desktop smoke report and completed checklist.
- Build date and version.
- `SUPPORT_PROCESS.md`, `KNOWN_ISSUES.md`, `PILOT_PROGRAMME.md`, and `WINDOWS_RELEASE_AND_UPDATE.md`.

## Pilot Release Decision

- Do not share a pilot installer until the packaged desktop smoke checklist has been completed against an installed build.
- Treat `npm audit` certificate failures as a release issue, not as a clean pass. Record the trusted environment used for the final audit, or name the accepted exception in the release record.
- Keep the generated installer folder, release notes, smoke report, completed checklist, backup/restore notes, and known limitations together as the pilot release record.
