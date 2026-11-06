# Known Issues

This register is reviewed for every pilot and Stable release. New issues are recorded with impact, workaround, owner, and release decision; resolved issues remain in the release notes.

| ID | Status | Area | Impact / workaround | Owner | Target |
| --- | --- | --- | --- | --- | --- |
| KI-001 | Open | Pilot evidence | Residential and commercial reconciliation cases must be completed against reviewed spreadsheet calculations before commercial pilot approval. Do not use an unreviewed case as an approval basis. | Product owner | Pilot gate |
| KI-002 | Open | Windows signing | A valid organisation code-signing certificate must be supplied before an externally distributed installer can be signed. Use only internally controlled test builds until signing verification passes. | Release owner | Commercial launch gate |
| KI-003 | Open | Local audit history | The operational-history log is editable and clearable. Export it with the approved report/release record where a controlled audit record is required. | Product owner | Process control |

## How To Record A New Issue

Add a row before issuing a Pilot or Stable build. State the reproduction path, effect on data/calculation/export, workaround, severity from `SUPPORT_PROCESS.md`, owner, and release decision. Do not silently classify an unpriced or unsupported workflow as viable.

