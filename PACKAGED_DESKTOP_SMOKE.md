# Packaged Desktop Smoke

Use this gate before approving a pilot installer. Browser smoke proves the shell and module navigation; packaged desktop smoke proves the Tauri build, SQLite path, native file dialogs, restart persistence, and backup/restore workflow.

## Automated Gate

Run:

```bash
npm run smoke:desktop
```

The script runs:

- `npm run lint`
- `npm test -- --run`
- `npm run smoke:browser:preview`
- `cargo check`
- `npm run tauri -- build`
- `npm audit --audit-level=moderate`

The audit step is recorded as non-blocking by default because local registry certificate failures can block the request before vulnerability data is returned. Use strict audit mode when the certificate issue is fixed:

```bash
npm run smoke:desktop -- --strict-audit
```

Useful options:

```bash
npm run smoke:desktop -- --skip-browser-smoke
npm run smoke:desktop -- --skip-tauri-build
npm run smoke:desktop -- --skip-audit
```

## Output

The script writes a dated folder under:

```text
artifacts/desktop-release-smoke/
```

Each run contains:

- `DESKTOP_RELEASE_SMOKE_REPORT.md`
- `PACKAGED_DESKTOP_SMOKE_CHECKLIST.md`

The report lists the automated command results, environment, generated installer artifacts, and the app data paths that must be verified manually.

## Manual Packaged Checks

Complete the generated checklist against the packaged installer, not the dev server. The minimum release decision must cover:

- Installer launches on a clean Windows test profile or disposable VM.
- Diagnostics reports Desktop SQLite.
- Settings survive app restart.
- A smoke project and library survive app restart.
- `Settings > General > Backup now` writes a full `.qsbackup` database export.
- `Settings > General > Export diagnostics` writes a diagnostics report and records the backup operation.
- Backup and restore is tested against `qs-pro.db`.
- Project JSON export/import works.
- Bill PDF and Excel exports open successfully.
- `.qsplib` library pack export/import works.
- AI config import/remove works and removal survives restart.
- Diagnostics release smoke checklist is copied into the release record.

Do not approve a pilot release while the automated report contains failed steps. If the report contains issues, document each accepted exception in the release notes.
