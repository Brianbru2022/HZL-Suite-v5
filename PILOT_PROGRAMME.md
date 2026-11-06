# Controlled Commercial Pilot Programme

## Objective

Validate that a named user can install, use, export, back up, restore, and upgrade the local desktop application without developer intervention.

## Cohort

Recruit three to five paid or tightly supported users with a mix of estimating, library maintenance, residential appraisal, and commercial appraisal responsibilities. Each participant receives a signed Pilot installer, this programme, `SUPPORT_PROCESS.md`, `KNOWN_ISSUES.md`, and `WINDOWS_RELEASE_AND_UPDATE.md`.

## Required Scenarios

| Scenario | Evidence to retain | Pass condition |
| --- | --- | --- |
| Install | Installer name, signature verification, release label | Installs on a clean Windows profile without developer intervention |
| Core use | Short workflow note and saved project | Creates/edits a bill or appraisal and reopens it successfully |
| Exports | PDF, Excel and Word/other applicable report outputs | Files open and agree with the reviewed screen values |
| Backup/restore | `.qsbackup`, restore note, reopen screenshot | Restored profile contains the expected project, library, settings, and evidence |
| Upgrade | Pre-upgrade backup, replacement installer, post-upgrade diagnostics | Existing local data opens and the release label changes as expected |

## Pilot Register

| Pilot ID | Role | Release | Start | Scenarios passed | Defects / gaps | Exit decision |
| --- | --- | --- | --- | --- | --- | --- |
| P-01 |  |  |  |  |  |  |
| P-02 |  |  |  |  |  |  |
| P-03 |  |  |  |  |  |  |
| P-04 |  |  |  |  |  |  |
| P-05 |  |  |  |  |  |  |

## Defect Triage

Record every defect or workflow gap in the release record with severity, reproduction steps, diagnostics reference, workaround, owner, and fixed-in release. S1/S2 issues block promotion to Stable unless the product owner records a risk acceptance and a user-safe workaround.

## Exit Gate

Promotion is allowed only when every active pilot participant completes the five required scenarios, no unresolved S1/S2 issue remains, backup/restore and upgrade evidence has been reviewed, and the final signed installer has passed the packaged desktop smoke checklist.

