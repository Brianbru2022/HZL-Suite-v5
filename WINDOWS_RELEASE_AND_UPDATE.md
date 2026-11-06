# Windows Signing And Update Path

## Signing

External Windows installers must be signed after the Tauri build and before distribution. The release owner needs an organisation code-signing certificate in the Windows certificate store.

```powershell
.\scripts\sign-windows-installer.ps1 -InstallerPath "C:\release\HZL QS Suite_0.1.13_x64-setup.exe" -CertificateThumbprint "CERTIFICATE_THUMBPRINT"
.\scripts\verify-windows-installer-signature.ps1 -InstallerPath "C:\release\HZL QS Suite_0.1.13_x64-setup.exe"
```

Keep the verification output in the release folder. An unsigned installer is an internal test artefact, not a Pilot or Stable distribution.

`npm run release:bundle` now enforces both the reviewed source tag and a verified Windows signature. Before bundling, commit the reviewed source, run `npm run release:freeze`, and set `HZL_SIGNING_CERTIFICATE_THUMBPRINT` to the certificate thumbprint. The bundle command refuses an untagged, dirty or unsigned release.

## Deliberate Update Path

1. In the old app, create a `.qsbackup` and export Diagnostics.
2. Close the app completely.
3. Download the new signed installer from the controlled release folder and verify its signature.
4. Run the installer over the existing installation; it preserves the local app-data folder.
5. Open the updated app, confirm the release label and `Desktop SQLite` status in Diagnostics.
6. Open a representative project, library, and appraisal; export one relevant report.
7. Keep the pre-upgrade backup until the updated release has been accepted.

The app does not silently auto-update. This avoids unexpected updates during live estimating and gives each user a clear recovery point.
