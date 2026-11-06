"""Apply the confirmed 427 m2/floor to Bridgend's provisional flat block."""

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


DB = Path(r"C:\Users\birob\AppData\Roaming\com.qspro.boq-generator\qs-pro.db")
BACKUP = Path(r"D:\apps\Work Apps\HZL\backups\2026-10-15-bridgend-flats\Bridgend-before-427m2-correction.json")
APPRAISAL_ID = "ea826776-1781-45df-ba37-6518dcf899cf"
OPTION_ID = "8d72e610-958b-4ce4-9910-b250f4f4bd5d"
HOUSE_TYPE_ID = "88b34088-1c99-5f0e-91cb-c4db131eb3d0"


def main() -> None:
    conn = sqlite3.connect(DB)
    try:
        raw = conn.execute("SELECT value FROM appraisals_state WHERE id = ?", (APPRAISAL_ID,)).fetchone()
        if raw is None:
            raise RuntimeError("Bridgend appraisal not found")
        original = raw[0]
        appraisal = json.loads(original)
        if appraisal.get("name") != "Bridgend, Kinross" or appraisal.get("frozenAt"):
            raise RuntimeError("Bridgend identity changed or appraisal is frozen")
        option = next((x for x in appraisal["options"] if x.get("id") == OPTION_ID), None)
        if option is None:
            raise RuntimeError("Bridgend option not found")
        flat = next((x for x in option.get("houseTypeSchedule", []) if x.get("id") == HOUSE_TYPE_ID), None)
        if flat is None or flat.get("quantity") != 15 or flat.get("gifaM2") != 65:
            raise RuntimeError("Flat schedule differs from reviewed data")
        parts = {x["key"]: x for x in flat["costBreakdown"]}
        if len(flat["costBreakdown"]) != 3 or set(parts) != {"CUSTOM_ALLOWANCE", "COMMON_STAIRS", "LIFT"}:
            raise RuntimeError("Cost breakdown differs from reviewed data")
        if abs(parts["COMMON_STAIRS"]["amount"] - 36720) < 0.01:
            print("Confirmed 427 m2/floor already saved; no change")
            return
        if abs(parts["COMMON_STAIRS"]["amount"] - 36360) > 0.01:
            raise RuntimeError("Common-area cost changed since review")
        if abs(parts["CUSTOM_ALLOWANCE"]["amount"] - 117000) > 0.01 or abs(parts["LIFT"]["amount"] - 70000 / 15) > 0.01:
            raise RuntimeError("Flat or lift allowance changed since review")

        BACKUP.parent.mkdir(parents=True, exist_ok=True)
        if BACKUP.exists():
            raise RuntimeError("Correction backup already exists; refusing to overwrite")
        BACKUP.write_text(json.dumps(appraisal, indent=2, ensure_ascii=False), encoding="utf-8")

        common = parts["COMMON_STAIRS"]
        common["amount"] = 306 * 1800 / 15
        common["notes"] = (
            "Confirmed gross block area 3 × 427 = 1,281 m2 less 975 m2 within the flats = "
            "306 m2 common/structure area. Apportioned equally across 15 homes at the provisional £1,800/m2 building-works rate."
        )
        detail = common["detailRows"][0]
        detail["quantity"] = 306 / 15
        detail["total"] = common["amount"]
        detail["basis"] = common["notes"]
        total_per_flat = sum(x["amount"] for x in flat["costBreakdown"] if x.get("included", True))
        flat["buildCostPerM2"] = total_per_flat / 65
        flat["notes"] = (
            "Provisional block construction cost £2,375,800 (£158,386.67/flat), excluding site-wide prelims, roads/services, "
            "land, fees and abnormal groundworks. Confirmed floor area: 427 m2 per storey × 3 = 1,281 m2 gross; "
            "15 × 65 m2 = 975 m2 within flats; 306 m2 is shared building area (76.1% net-to-gross). "
            "One three-stop lift allowed as a client-brief provision. £1,800/m2 gross building works is a provisional QS allowance "
            "triangulated against local house-type library costs at index 233, the Scottish Government October 2026 Housing Tender Return, "
            "and Fife Council's 2025 two-bedroom affordable benchmark. Lift budget checked against 2026 specialist guide. "
            "Sources: https://www.gov.scot/publications/housing-tender-return-htr-and-scottish-social-housing-tender-price-index-sshtpi/ ; "
            "https://www.fife.gov.uk/__data/assets/pdf_file/0029/676631/Note-of-FHP-Meeting-25.02.25.pdf ; "
            "https://www.futureliftservices.co.uk/blog/commercial-lift-installation-cost/"
        )
        appraisal["updatedAt"] = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
        updated = json.dumps(appraisal, ensure_ascii=False, separators=(",", ":"))
        conn.execute("BEGIN IMMEDIATE")
        result = conn.execute(
            "UPDATE appraisals_state SET value = ?, updated_at = ? WHERE id = ? AND value = ?",
            (updated, appraisal["updatedAt"], APPRAISAL_ID, original),
        )
        if result.rowcount != 1:
            conn.rollback()
            raise RuntimeError("Bridgend changed during the correction")
        conn.commit()
        print(f"Confirmed 427 m2/floor; block £{total_per_flat * 15:,.2f}, £{total_per_flat:,.2f}/flat")
        print(f"Backup: {BACKUP}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
