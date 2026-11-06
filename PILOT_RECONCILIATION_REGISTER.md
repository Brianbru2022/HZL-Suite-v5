# Controlled Pilot Reconciliation Register

This local register is the release evidence for Pilot hardening. Each row must be completed from a controlled spreadsheet calculation before a report is approved or a Pilot installer is distributed. Do not substitute a narrative review for a retained calculation comparison.

| Case | Type | Controlled spreadsheet | Reviewer | Date | Appraisal total | Spreadsheet total | Variance | Report reviewed | Status |
|---|---|---|---|---|---:|---:|---:|---|---|
| Residential pilot 1 | Residential | Pending selection | | | | | | | Pending |
| Residential pilot 2 | Residential | Pending selection | | | | | | | Pending |
| Residential pilot 3 | Residential | Pending selection | | | | | | | Pending |
| Residential pilot 4 | Residential | Pending selection | | | | | | | Pending |
| Residential pilot 5 | Residential | Pending selection | | | | | | | Pending |
| Commercial pilot 1 | Commercial | Pending selection | | | | | | | Pending |
| Commercial pilot 2 | Commercial | Pending selection | | | | | | | Pending |
| Commercial pilot 3 | Commercial | Pending selection | | | | | | | Pending |

## Minimum Review Basis

- Reconcile the exact selected option, appraisal date, current/start indices, GDV or income basis, construction/site costs, contingency, finance and land treatment.
- Commercial cases additionally reconcile every included asset, shared cost, annual income, operating cost, lifecycle capex, interest, exit yield, exit value and excluded opportunity.
- Attach or retain the controlled spreadsheet and mark any accepted rounding variance with its cause.
- A report is only approved when blockers in the report-preparation view are resolved and the reviewer records evidence and exclusions.

## Completion Rule

- `Passed` means the controlled workbook is retained, the exact appraisal/option is named, a reviewer and date are recorded, variance is explained within the agreed tolerance, and the exported report has been checked against the reconciled result.
- `Failed` means the variance or a report discrepancy remains unresolved. It blocks Pilot distribution.
- `Pending` is not a release result. Do not mark the `Eight controlled reconciliations are retained` release check as passed while any row remains pending.
- Run `npm run pilot:verify` before a release bundle. The release bundle runs the same validation and refuses an incomplete register.
