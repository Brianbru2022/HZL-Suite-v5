"""Reconcile Bridgend's flat-block building-only allowance with current benchmarks."""

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


DB = Path(r"C:\Users\birob\AppData\Roaming\com.qspro.boq-generator\qs-pro.db")
BACKUP = Path(r"D:\apps\Work Apps\HZL\backups\2026-10-15-bridgend-flats\Bridgend-before-rate-review.json")
APPRAISAL_ID = "ea826776-1781-45df-ba37-6518dcf899cf"
OPTION_ID = "8d72e610-958b-4ce4-9910-b250f4f4bd5d"
HOUSE_TYPE_ID = "88b34088-1c99-5f0e-91cb-c4db131eb3d0"
RATE = 1350
FLATS = 15
DWELLING_AREA = 65
COMMON_AREA = 306
LIFT_ALLOWANCE = 70000


def main() -> None:
    connection = sqlite3.connect(DB)
    try:
        result = connection.execute("SELECT value FROM appraisals_state WHERE id = ?", (APPRAISAL_ID,)).fetchone()
        if result is None:
            raise RuntimeError("Bridgend appraisal not found")
        original = result[0]
        appraisal = json.loads(original)
        if appraisal.get("name") != "Bridgend, Kinross" or appraisal.get("frozenAt"):
            raise RuntimeError("Bridgend identity changed or appraisal is frozen")
        option = next((row for row in appraisal.get("options", []) if row.get("id") == OPTION_ID), None)
        if option is None:
            raise RuntimeError("Bridgend option not found")
        house = next((row for row in option.get("houseTypeSchedule", []) if row.get("id") == HOUSE_TYPE_ID), None)
        if house is None or house.get("quantity") != FLATS or house.get("gifaM2") != DWELLING_AREA:
            raise RuntimeError("Flat quantity or area changed since review")
        components = {row["key"]: row for row in house.get("costBreakdown", [])}
        expected_keys = {"CUSTOM_ALLOWANCE", "COMMON_STAIRS", "LIFT"}
        if len(house["costBreakdown"]) != 3 or set(components) != expected_keys:
            raise RuntimeError("Cost breakdown changed since review")
        flat = components["CUSTOM_ALLOWANCE"]
        shared = components["COMMON_STAIRS"]
        lift = components["LIFT"]
        new_flat = DWELLING_AREA * RATE
        new_shared = COMMON_AREA / FLATS * RATE
        if abs(flat["amount"] - new_flat) < 0.01 and abs(shared["amount"] - new_shared) < 0.01:
            print("Reviewed building rate already saved; no change")
            return
        if (
            abs(flat["amount"] - 117000) > 0.01
            or abs(shared["amount"] - 36720) > 0.01
            or abs(lift["amount"] - LIFT_ALLOWANCE / FLATS) > 0.01
        ):
            raise RuntimeError("Existing cost changed since review")

        BACKUP.parent.mkdir(parents=True, exist_ok=True)
        if BACKUP.exists():
            raise RuntimeError("Review backup already exists; refusing to overwrite")
        BACKUP.write_text(json.dumps(appraisal, indent=2, ensure_ascii=False), encoding="utf-8")

        flat["amount"] = new_flat
        flat["notes"] = (
            "65 m2 flat allocation at £1,350/m2 provisional direct building rate; "
            "includes dwelling fabric, fitout, services, fire and acoustic work."
        )
        flat["detailRows"][0].update(rate=RATE, total=new_flat, basis=flat["notes"])
        shared["amount"] = new_shared
        shared["notes"] = (
            "Confirmed 306 m2 gross area outside the 15 flats, shared equally; "
            "includes common structure, circulation, stairs and finishes at £1,350/m2."
        )
        shared["detailRows"][0].update(rate=RATE, total=new_shared, basis=shared["notes"])
        lift["notes"] = "One three-stop lift at £70,000, including ordinary lift-specific builder's work and commissioning; shared across 15 flats."
        lift["detailRows"][0]["basis"] = lift["notes"]

        per_flat = new_flat + new_shared + lift["amount"]
        total = per_flat * FLATS
        assert abs(total - 1_799_350) < 0.01
        house["buildCostPerM2"] = per_flat / DWELLING_AREA
        house["notes"] = (
            "Building-only provisional cost £1,799,350 (£119,956.67/flat): 1,281 m2 gross "
            "(427 m2 × 3 storeys) at £1,350/m2 plus one £70,000 lift. "
            "Flats occupy 975 m2; 306 m2 is shared building area. "
            "The rate is a QS judgement checked against current Scottish Housing Tender Return "
            "substructure/superstructure indicative costs and the local CF2-4L/U house-type library; "
            "the lift is a provisional client-brief allowance. "
            "Excludes site infrastructure, external works, land, preliminaries, fees, contingency and abnormals. "
            "Sources: https://www.gov.scot/publications/housing-tender-return-htr-and-scottish-social-housing-tender-price-index-sshtpi/ ; "
            "https://www.futureliftservices.co.uk/blog/commercial-lift-installation-cost/"
        )
        appraisal["updatedAt"] = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
        updated = json.dumps(appraisal, ensure_ascii=False, separators=(",", ":"))
        connection.execute("BEGIN IMMEDIATE")
        changed = connection.execute(
            "UPDATE appraisals_state SET value = ?, updated_at = ? WHERE id = ? AND value = ?",
            (updated, appraisal["updatedAt"], APPRAISAL_ID, original),
        )
        if changed.rowcount != 1:
            connection.rollback()
            raise RuntimeError("Bridgend changed during review")
        connection.commit()
        print(f"Saved building and lift £{total:,.2f}; £{per_flat:,.2f} per flat")
        print(f"Backup: {BACKUP}")
    finally:
        connection.close()


if __name__ == "__main__":
    main()
