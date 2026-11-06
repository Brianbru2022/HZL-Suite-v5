"""Move legacy appraisal data URLs into content-addressed managed evidence files.

Run against a stopped app, after taking a database backup. The database update
is transactional; files are written and hash-verified before their references
are committed. A repeat run verifies existing files and changes only rows that
still contain embedded evidence.
"""

import argparse
import base64
import datetime
import hashlib
import json
import sqlite3
from pathlib import Path


def embedded_reports(value):
    if isinstance(value, dict):
        data_url = value.get("dataUrl")
        if isinstance(data_url, str) and data_url:
            yield value
        for key, child in value.items():
            if key != "dataUrl":
                yield from embedded_reports(child)
    elif isinstance(value, list):
        for child in value:
            yield from embedded_reports(child)


def decoded_evidence(report):
    data_url = report["dataUrl"]
    if not data_url.startswith("data:") or ";base64," not in data_url:
        raise ValueError(f"Evidence {report.get('id')} has an unsupported data URL")
    return base64.b64decode(data_url.split(",", 1)[1], validate=True)


def migrate(database: Path, evidence_root: Path, apply: bool):
    connection = sqlite3.connect(database)
    connection.execute("PRAGMA busy_timeout=10000")
    ids = [row[0] for row in connection.execute("SELECT id FROM appraisals_state")]
    reports = 0
    unique_files = set()
    bytes_written = 0
    changed_rows = 0
    checked_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
    try:
        if apply:
            connection.execute("BEGIN IMMEDIATE")
        for appraisal_id in ids:
            raw = connection.execute("SELECT value FROM appraisals_state WHERE id=?", (appraisal_id,)).fetchone()[0]
            appraisal = json.loads(raw)
            changed = False
            for report in embedded_reports(appraisal):
                if not isinstance(report.get("id"), str) or not isinstance(report.get("fileName"), str):
                    raise ValueError(f"Evidence in appraisal {appraisal_id} has no ID or file name")
                content = decoded_evidence(report)
                digest = hashlib.sha256(content).hexdigest()
                relative = Path("evidence") / digest[:2] / f"{digest}.bin"
                destination = evidence_root / relative
                reports += 1
                if digest not in unique_files:
                    unique_files.add(digest)
                    bytes_written += len(content)
                if not apply:
                    continue
                destination.parent.mkdir(parents=True, exist_ok=True)
                if destination.exists():
                    if hashlib.sha256(destination.read_bytes()).hexdigest() != digest:
                        raise ValueError(f"Existing evidence does not match its hash: {destination}")
                else:
                    temporary = destination.with_suffix(".writing")
                    temporary.write_bytes(content)
                    if hashlib.sha256(temporary.read_bytes()).hexdigest() != digest:
                        raise ValueError(f"Written evidence failed verification: {temporary}")
                    temporary.replace(destination)
                report.pop("dataUrl")
                report.update({
                    "size": len(content),
                    "storageMode": "MANAGED_LOCAL",
                    "localEvidencePath": relative.as_posix(),
                    "contentSha256": digest,
                    "integrityStatus": "VERIFIED",
                    "integrityCheckedAt": checked_at,
                })
                changed = True
            if changed:
                changed_rows += 1
                connection.execute(
                    "UPDATE appraisals_state SET value=? WHERE id=?",
                    (json.dumps(appraisal, ensure_ascii=False, separators=(",", ":")), appraisal_id),
                )
        if apply:
            connection.commit()
            connection.execute("PRAGMA wal_checkpoint(TRUNCATE)")
            remaining = 0
            for (raw,) in connection.execute("SELECT value FROM appraisals_state"):
                remaining += sum(1 for _ in embedded_reports(json.loads(raw)))
            if remaining:
                raise ValueError(f"{remaining} embedded evidence records remain after migration")
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
    return {"appraisals": len(ids), "migrated_reports": reports, "changed_appraisals": changed_rows,
            "unique_files": len(unique_files), "unique_bytes": bytes_written, "applied": apply}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, required=True)
    parser.add_argument("--app-data-dir", type=Path, required=True)
    parser.add_argument("--apply", action="store_true", help="Write verified evidence files and update the database")
    args = parser.parse_args()
    print(json.dumps(migrate(args.database, args.app_data_dir, args.apply), indent=2))
