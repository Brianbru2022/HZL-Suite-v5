# External Pilot Guide

Use this guide for the controlled desktop pilot. The register is in `Diagnostics > External pilot register` and is stored locally with the release-support evidence.

## Participants

Run the pilot with three to five named users on their own Windows profiles. Record their name and organisation before testing. Do not mark a step as passed from a developer machine on their behalf.

## Required Checkpoints

1. Install the signed desktop package.
2. Create or amend a representative appraisal and confirm it saves after restart.
3. Export PDF and Excel, then open both and reconcile them with the live screen.
4. Create a verified `.qsbackup`.
5. Restore that backup into a clean or disposable profile and confirm data/evidence reopen.
6. Install the next signed package over the pilot build and repeat open/save/export checks.

## Defect Severity

- `S1 critical`: data loss/corruption, security exposure, installer cannot be used, or the application will not launch.
- `S2 major`: a core workflow such as appraisal, save, export, backup, restore, or upgrade is unavailable or materially produces incorrect output without a safe workaround.
- `S3 normal`: a workflow defect with a practical workaround and no loss of calculation integrity.
- `S4 minor`: cosmetic, wording, or low-impact usability issue.

The commercial release gate remains blocked until every named user has passed every checkpoint and every S1/S2 defect is marked fixed. An accepted S1/S2 issue is still a release blocker.
