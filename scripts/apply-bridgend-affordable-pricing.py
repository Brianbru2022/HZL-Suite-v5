"""Apply the instructed 80% OMV prices to the unfrozen Bridgend appraisal."""

import hashlib
import json
import os
import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from docx import Document
from docx.oxml.ns import qn


APPRAISAL_ID = "ea826776-1781-45df-ba37-6518dcf899cf"
OPTION_ID = "8d72e610-958b-4ce4-9910-b250f4f4bd5d"
DB = Path(r"C:\Users\birob\AppData\Roaming\com.qspro.boq-generator\qs-pro.db")
EVIDENCE = Path(r"C:\Users\birob\AppData\Roaming\com.qspro.boq-generator\evidence\47221c54-5988-45cd-b357-cc0c71b2fffb\Bridgend_Kinross_Report.docx")
REVISED = Path(r"D:\apps\Work Apps\HZL\qs-suite-github-20260910\artifacts\Bridgend_Kinross_Report_80_percent_OMV.docx")
BACKUP = Path(r"D:\apps\Work Apps\HZL\backups\2026-10-15-bridgend-affordable-80-percent")
OMV = {
    "88b34088-1c99-5f0e-91cb-c4db131eb3d0": (185000, 15),
    "bb12c6c3-bbe7-45ed-9e03-041c477bec70": (250000, 2),
    "03031aea-2cec-4ac2-b882-f9cf48c60c37": (260000, 3),
    "129e7d01-2efb-4095-8d40-8fe722988d0b": (290000, 2),
    "66629e03-01ed-4bf3-8140-943bcdf9959b": (345000, 2),
}


def extracted_text(path: Path) -> str:
    doc = Document(path)
    parts = []
    for node in doc.element.body.iterchildren():
        if node.tag == qn("w:p"):
            text = "".join(t.text or "" for t in node.iter(qn("w:t")))
            if text.strip():
                parts.append(text)
        elif node.tag == qn("w:tbl"):
            for row in node.iter(qn("w:tr")):
                cells = []
                for cell in row.iterchildren(qn("w:tc")):
                    cells.append(" ".join((t.text or "") for t in cell.iter(qn("w:t"))))
                parts.append(" | ".join(cells))
    return "\n".join(parts)


def main():
    if not REVISED.is_file() or not EVIDENCE.is_file():
        raise FileNotFoundError("The revised or original report is missing")
    text = extracted_text(REVISED)
    if "Adopted affordable value at 80%" not in text or "£4,260,000" not in text:
        raise AssertionError("Revised report does not contain the approved 80% appraisal figures")
    BACKUP.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT value, updated_at FROM appraisals_state WHERE id=?", (APPRAISAL_ID,)).fetchone()
    if not row:
        raise ValueError("Bridgend appraisal not found")
    appraisal = json.loads(row["value"])
    if appraisal.get("name") != "Bridgend, Kinross" or appraisal.get("frozenAt"):
        raise ValueError("Unexpected appraisal identity or frozen state")
    options = [o for o in appraisal.get("options", []) if o.get("id") == OPTION_ID]
    if len(options) != 1:
        raise ValueError("Expected Bridgend option not found")
    option = options[0]
    report = option.get("pricingReport") or {}
    if report.get("id") != "47221c54-5988-45cd-b357-cc0c71b2fffb":
        raise ValueError("Pricing report identity changed")
    expected_sha = "4a2b62fcaba665fc4e0076354fd34078c8b47163b08b757bf80157774cc04f26"
    if hashlib.sha256(EVIDENCE.read_bytes()).hexdigest() != expected_sha:
        raise ValueError("Original report changed since inspection")

    houses = {h["id"]: h for h in option.get("houseTypeSchedule", [])}
    if set(OMV) - set(houses):
        raise ValueError("Affordable house type schedule changed")
    for house_id, (omv, quantity) in OMV.items():
        house = houses[house_id]
        if house.get("tenure") != "AFFORDABLE" or house.get("quantity") != quantity:
            raise ValueError("Affordable unit identity or quantity changed")
        price = int(omv * 0.8)
        house["saleValuePerUnit"] = price
        house["saleRatePerM2"] = 0
        note = f"Affordable appraisal sale value £{price:,} per unit = 80% of unrestricted OMV £{omv:,} in the revised Bridgend pricing report."
        old_notes = house.get("notes") or ""
        if note not in old_notes:
            house["notes"] = (old_notes.rstrip() + " " + note).strip()
    if sum(int(h["quantity"] * h["saleValuePerUnit"]) for h in houses.values() if h.get("tenure") == "AFFORDABLE") != 4260000:
        raise AssertionError("Affordable GDV does not reconcile to £4,260,000")

    option["housePricesComment"] = "Affordable appraisal sale prices use 80% of the unrestricted OMVs in the revised Bridgend Kinross pricing report (24 homes; affordable GDV £4,260,000). This is the instructed appraisal assumption pending confirmed tenure and transfer terms."
    report["notes"] = "Revised 15 October 2026: adopted affordable appraisal value at 80% of unrestricted OMV, £4,260,000 across 24 homes."
    report["size"] = REVISED.stat().st_size
    report["contentSha256"] = hashlib.sha256(REVISED.read_bytes()).hexdigest()
    report["integrityStatus"] = "VERIFIED"
    now = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    report["integrityCheckedAt"] = now
    report["uploadedAt"] = now
    report["extractedText"] = text
    report["extractionStatus"] = "EXTRACTED"
    report["extractedAt"] = now
    report["extractionError"] = ""
    appraisal["updatedAt"] = now

    backup_json = BACKUP / "appraisal-before-80-percent.json"
    backup_docx = BACKUP / "Bridgend_Kinross_Report_before-80-percent.docx"
    if not backup_json.exists():
        backup_json.write_text(row["value"], encoding="utf-8")
    if not backup_docx.exists():
        shutil.copy2(EVIDENCE, backup_docx)
    temp = EVIDENCE.with_suffix(".docx.tmp")
    shutil.copy2(REVISED, temp)
    try:
        with conn:
            os.replace(temp, EVIDENCE)
            updated = conn.execute(
                "UPDATE appraisals_state SET value=?, updated_at=? WHERE id=? AND value=?",
                (json.dumps(appraisal, ensure_ascii=False, separators=(",", ":")), now, APPRAISAL_ID, row["value"]),
            )
            if updated.rowcount != 1:
                raise ValueError("Appraisal changed concurrently")
    except Exception:
        shutil.copy2(backup_docx, EVIDENCE)
        raise
    finally:
        if temp.exists():
            temp.unlink()
        conn.close()
    print(f"Updated {appraisal['name']}: 24 affordable homes, £4,260,000 GDV at 80% OMV")
    print(f"Report SHA256: {report['contentSha256']}")
    print(f"Backup: {BACKUP}")


if __name__ == "__main__":
    main()
