# 0.1.11 Release Record

## Scope

This stabilisation release prioritises reliable appraisal persistence, responsive editing, trade-level cost indexation, and a controlled commercial-appraisal rehearsal.

## Commercial Pilot

- Source record: `Cambuslang (Commercial)` / `2026.007.A`.
- Isolated clone: `Cambuslang (Commercial) - 0.1.11 Commercial Pilot` / `2026.007.P`.
- The live source record was not altered.
- Retained preliminary evidence: one extracted commercial assessment PDF.
- Pilot model: the existing `Hotel - Travelodge style` template, with one separately recorded hotel asset, retained revenue row, seven cost rows, lifecycle, exit-yield, operating-cost, selling-cost and funding assumptions.
- The original brief describes an early commercial opportunity and does not confirm operating terms for additional uses. Those opportunities are recorded as excluded rather than valued in the pilot.

## Validation Evidence

- Pre-pilot SQLite-safe checkpoint: `D:\workapps\HZL\QS\backups\HZL-QS-Suite-0.1.11-commercial-pilot\qs-pro-before-commercial-pilot.qsbackup`.
- Post-pilot SQLite-safe backup: `D:\workapps\HZL\QS\backups\HZL-QS-Suite-0.1.11-commercial-pilot\qs-pro-after-commercial-pilot-20260807-151703.qsbackup` (35,129,495,552 bytes).
- Disposable-profile restore: `D:\workapps\HZL\QS\backups\HZL-QS-Suite-0.1.11-commercial-pilot\restore-verification-20260807-1527\Roaming\com.qspro.boq-generator\qs-pro.db` (35,129,495,552 bytes).
- Restored data check: `2026.007.P` opens as `MODELLED`, has one commercial asset, one retained preliminary brief, and a 3,786,192-character attachment payload. The restored database also contains the `app_settings_v1` settings record.
- Export validation: covered by the commercial preliminary PDF smoke test and the full appraisal PDF, Excel and Word export smoke suite.
- Automated correctness coverage includes trade-index uplift, persistence mutation detection, library-refresh behaviour, startup guards, save cancellation and commercial asset/lifecycle calculations.
- Desktop release smoke: `D:\workapps\HZL\QS\HZL-QS-Suite-restored-20260701\source\artifacts\desktop-release-smoke\2026-08-07T14-34-20-856Z\DESKTOP_RELEASE_SMOKE_REPORT.md`.
  - TypeScript lint, 255 unit/integration tests, production browser matrix, Cargo check, native Rust tests, and packaged Tauri build all passed.
  - Built installers: `src-tauri\target\release\bundle\msi\HZL QS Suite_0.1.11_x64_en-US.msi` and `src-tauri\target\release\bundle\nsis\HZL QS Suite_0.1.11_x64-setup.exe`.

## Accepted Limitations

- The pilot is a controlled workflow rehearsal, not a valuation or recommendation for the source site.
- It intentionally does not value unconfirmed secondary commercial uses until accommodation, occupier, servicing, planning and investment assumptions are recorded.
- A desktop restore uses a disposable app-data profile and validates the SQLite database and retained attachment payloads; the active user profile is never replaced during release validation.
