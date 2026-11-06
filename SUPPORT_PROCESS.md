# Support Process

## Scope

HZL QS Suite is a local Windows desktop application. Support is handled against a named installed release, the user's exported diagnostics report, and a verified backup where data recovery is relevant. No project data is transmitted automatically.

## Support Route

1. Record the installed release label and whether the build is on the `Stable` or `Pilot` channel.
2. Open `Settings > General > Export diagnostics` and save the report.
3. If the issue concerns saved data, create a `.qsbackup` before attempting repairs.
4. Send the diagnostics report, a short reproduction sequence, and only the smallest necessary supporting export to the support contact supplied with the release.

## Response Commitments

| Severity | Meaning | Initial response | Target next step |
| --- | --- | --- | --- |
| S1 | Data-loss risk, installer failure, or the app cannot open | 1 business day | Workaround or recovery plan within 2 business days |
| S2 | Core workflow, export, backup, or restore is blocked | 1 business day | Reproduction and corrective plan within 3 business days |
| S3 | Material usability or calculation issue with a workaround | 2 business days | Triage decision within 5 business days |
| S4 | Improvement request or minor presentation issue | 5 business days | Planned, deferred, or declined with a rationale |

Times are business-day targets, not an automated service-level guarantee. A support response never replaces the user's responsibility to retain current backups.

## Diagnostics Bundle Contents

The diagnostics export records the release, storage health, app counts, active workspace, release-smoke checklist state, recent local operational history, and any locally captured crash reports where the user explicitly enabled that setting. Review the report before sharing it because it can include local project and file-path context.

## Release Channels

- `Stable`: supported installer intended for normal local production use.
- `Pilot`: named-user, tightly supported build used to validate workflows before it moves to Stable.

Neither channel checks for or downloads updates automatically. Upgrade is deliberate: back up, install the signed replacement, reopen, and run the upgrade checks in `WINDOWS_RELEASE_AND_UPDATE.md`.

