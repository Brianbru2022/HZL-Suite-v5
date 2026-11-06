# Known Limitations

HZL QS Suite is moving toward early-access commercial readiness. These limitations should remain visible until the related work is complete.

## Current Limitations

- Large standards libraries require the desktop SQLite path for reliable performance.
- JSON remains available for compatibility, but `.qsplib` is the preferred transfer format for large libraries.
- Future modules for take-off, subcontract appointments, valuations, variations, and final account are placeholders only. Audit Trail is beta and is backed by local operation history rather than enterprise audit controls.
- The app is local-first and does not yet provide multi-user collaboration or cloud syncing.
- BIM/CAD measurement and drawing take-off are not implemented yet.
- Enterprise permissions, shared audit controls, and central licensing are not implemented yet.
- Some large UI modules are still being refactored and may remain harder to maintain than the target architecture.
- Excel export code is lazy-loaded and split into export-only vendor chunks, but ExcelJS remains a large optional dependency to monitor as export features grow.
- The modular ExcelJS browser build may emit Vite externalisation warnings for unused Node file/CSV/read paths; browser fallback Excel export smoke tests currently pass.
- `npm audit` may be blocked locally by registry certificate verification until the development machine trust chain is fixed. Treat a blocked audit as a release issue unless an accepted exception is recorded.

## Data And Content

- Protected standards content should only be used where the user has the rights to use it.
- SMM7 sample bill creation depends on an already installed user-owned SMM7 library.
- Existing storage keys may still use the historic `qs-pro` prefix for compatibility.
- Stage 2 pilot reconciliation is not complete until five residential and three commercial controlled spreadsheet cases have been selected, checked, and signed off in `PILOT_RECONCILIATION_REGISTER.md`.
