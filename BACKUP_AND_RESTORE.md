# Backup And Restore

HZL QS Suite is local-first. Before major imports, library migrations, or release builds, create a recoverable backup.

## What To Back Up

- The source workspace if developing the app.
- The live app data folder:
  - `C:\Users\birob\AppData\Roaming\com.qspro.boq-generator`
- Optional runtime folders:
  - `C:\Users\birob\AppData\Local\com.qspro.boq-generator`
  - `C:\Users\birob\AppData\Local\QS Pro - BoQ Generator`

The important production database is normally `qs-pro.db` in the roaming app data folder.

## User Data Backup

Use the app export commands for project or library JSON backups where practical. For large libraries, prefer `.qsplib` packs over JSON.

For a one-click full app backup in the packaged desktop app:

1. Open `Settings > General`.
2. Choose `Backup now`.
3. Save the `.qsbackup` file to a dated backup or release folder. Keep its adjacent `.qsbackup.evidence` folder together with it; this contains managed appraisal evidence such as drawings, briefs, and quotations.
4. Open `Diagnostics` or `Settings > General`, choose `Export diagnostics`, and keep the diagnostics report beside the backup.

For a manual full local data backup:

1. Close HZL QS Suite.
2. Copy the app data folders listed above to a dated backup folder.
3. Confirm `qs-pro.db` exists in the backup and copy the `evidence` folder alongside it when present.
4. Keep the backup private, because it may contain project and library data.

## Restore

For a `.qsbackup` created by the desktop app:

1. Open `Settings > General` or `Diagnostics`.
2. Choose `Restore backup` and select the `.qsbackup` file.
3. Confirm the restore. The app creates and verifies an automatic pre-restore checkpoint before replacing the database.
4. The app reloads the restored state. When the selected backup has its adjacent `.evidence` folder, managed evidence is restored with it; when it does not, the current managed evidence is retained and the operation history records that fact.
5. Open a known project, library, appraisal and attachment to verify the restore.

Manual folder restore remains available for disaster recovery when the desktop app cannot open.

## Packaged Release Backup Smoke

Run this only in a clean test profile or disposable VM unless you have already made a verified backup of the real user profile.

1. Install the packaged app.
2. Open the app and confirm Diagnostics reports Desktop SQLite.
3. Create or open a smoke project and change one app setting, such as sticky bill totals.
4. Use `Settings > General > Backup now` and confirm a `.qsbackup` file is written.
5. Use `Settings > General > Export diagnostics` and confirm the diagnostics report records the backup operation.
6. Use `Restore backup`, select the same `.qsbackup`, and confirm that the automatic pre-restore checkpoint is recorded in Local operational history.
7. Confirm the smoke project, library state, app setting, evidence attachment, and Diagnostics SQLite status are restored after reload.
8. Copy the Diagnostics release smoke checklist report into the release record.

## Developer Restore

1. Restore the source workspace.
2. Run `npm install` if dependencies are missing.
3. Run:

```bash
npm run lint
npm test -- --run
npm run build
cd src-tauri
cargo check
```
