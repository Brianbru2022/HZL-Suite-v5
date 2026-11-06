# 0.1.13 Release Candidate Readiness

This record separates completed release tooling from evidence that must be gathered through real pilot use. Do not treat a completed development build as commercial availability.

## Complete Tooling

- [x] Local external-pilot register for three to five named users.
- [x] Six required checkpoint controls: install, appraisal, export, backup, restore and upgrade.
- [x] S1/S2 defects prevent the commercial-release gate from becoming ready until fixed.
- [x] Pilot register included in diagnostics and app-state backup evidence.
- [x] Controlled report issues retain reviewer, date, source SHA-256 and locked PDF/Excel outputs.
- [x] Release bundle checks require a clean tagged source, eight reconciliations and signed Windows installers.

## Evidence Required Before Pilot Distribution

- [ ] Commit the reviewed source and create the matching `v0.1.13` tag with `npm run release:freeze`.
- [ ] Complete all five residential and three commercial rows in `PILOT_RECONCILIATION_REGISTER.md` from retained controlled workbooks.
- [ ] Set the Windows code-signing certificate thumbprint in `HZL_SIGNING_CERTIFICATE_THUMBPRINT` and create the signed release bundle.
- [ ] Install the bundle on a clean Windows profile and complete the packaged desktop smoke checklist.

## External Pilot Exit Gate

- [ ] Register three to five named pilot users in `Diagnostics > External pilot register`.
- [ ] Each named user passes every required checkpoint on their own profile.
- [ ] Every S1/S2 defect is fixed and retested; accepted S1/S2 defects remain release blockers.
- [ ] Archive the pilot evidence with the release bundle and support diagnostics.

## Release Decision

Commercial availability is permitted only when the in-app pilot register reports `Commercial gate ready`, the reconciliation verifier passes, the source is frozen/tagged, and the signed installer has passed the packaged desktop smoke.
