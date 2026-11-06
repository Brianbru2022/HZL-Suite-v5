# HZL QS Suite 0.1.11 Release Notes

Date prepared: 2026-08-07
Status: Stabilisation release in progress.

## Release Focus

Version 0.1.11 focuses on appraisal correctness, responsiveness, save reliability, and release safety. It is deliberately a stabilisation release rather than a broad feature expansion.

## Included Work

- Verified pre-release source and desktop-data backup procedures.
- Aligned the package, desktop, and in-app release version to 0.1.11.
- Added regression coverage for trade-level house-type indexation and clarified indexed construction totals.
- Reduced avoidable appraisal recalculation and persistence work during editing.

## Required Before Sharing

- Complete lint, unit, build, Cargo, desktop-smoke, and installed-app checks.
- Verify a representative appraisal can be opened, saved, re-indexed, exported, backed up, and restored.
- Confirm final report PDF, Excel, and Word exports save successfully from a packaged desktop build.
