"""One-off, auditable provisional flat-block allowance for the Bridgend appraisal."""

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path


DB = Path(r"C:\Users\birob\AppData\Roaming\com.qspro.boq-generator\qs-pro.db")
BACKUP = Path(r"D:\apps\Work Apps\HZL\backups\2026-10-15-bridgend-flats")
APPRAISAL_ID = "ea826776-1781-45df-ba37-6518dcf899cf"
OPTION_ID = "8d72e610-958b-4ce4-9910-b250f4f4bd5d"
HOUSE_TYPE_ID = "88b34088-1c99-5f0e-91cb-c4db131eb3d0"

FLATS = 15
NET_AREA_PER_FLAT_M2 = 65
GROSS_BLOCK_AREA_M2 = 1278  # Provisional: 975 m2 flats / 76.3% efficiency.
BUILDING_WORKS_RATE_PER_GROSS_M2 = 1800
PASSENGER_LIFT_ALLOWANCE = 70000


def component(key: str, label: str, amount: float, notes: str, quantity: float, unit: str, rate: float) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "key": key,
        "label": label,
        "amount": amount,
        "priceIndex": 233,
        "included": True,
        "notes": notes,
        "aiGenerated": False,
        "detailRows": [{
            "id": str(uuid.uuid4()),
            "label": label,
            "quantity": quantity,
            "unit": unit,
            "rate": rate,
            "total": amount,
            "basis": notes,
            "included": True,
        }],
    }


def main() -> None:
    net_area = FLATS * NET_AREA_PER_FLAT_M2
    common_area = GROSS_BLOCK_AREA_M2 - net_area
    flat_works = NET_AREA_PER_FLAT_M2 * BUILDING_WORKS_RATE_PER_GROSS_M2
    common_share = common_area * BUILDING_WORKS_RATE_PER_GROSS_M2 / FLATS
    lift_share = PASSENGER_LIFT_ALLOWANCE / FLATS
    per_flat = flat_works + common_share + lift_share
    block_total = per_flat * FLATS
    assert net_area == 975 and common_area == 303
    assert abs(block_total - 2_370_400) < 0.01

    conn = sqlite3.connect(DB)
    try:
        raw = conn.execute("SELECT value FROM appraisals_state WHERE id = ?", (APPRAISAL_ID,)).fetchone()
        if raw is None:
            raise RuntimeError("Bridgend appraisal was not found")
        original = raw[0]
        appraisal = json.loads(original)
        if appraisal.get("frozenAt") or appraisal.get("unviableMarkedAt"):
            raise RuntimeError("The Bridgend appraisal is locked")
        if appraisal.get("name") != "Bridgend, Kinross":
            raise RuntimeError("Appraisal identity changed")
        option = next((row for row in appraisal["options"] if row.get("id") == OPTION_ID), None)
        if option is None:
            raise RuntimeError("Bridgend option identity changed")
        if any(row.get("id") == HOUSE_TYPE_ID for row in option.get("houseTypeSchedule", [])):
            print("Bridgend flat block already present; nothing changed")
            return
        if option.get("houseTypeSchedule"):
            raise RuntimeError("Bridgend house types changed since review; refusing to append blindly")

        BACKUP.mkdir(parents=True, exist_ok=True)
        backup_file = BACKUP / "Bridgend-before-flat-block.json"
        if backup_file.exists():
            raise RuntimeError("Existing backup found; refusing to overwrite")
        backup_file.write_text(json.dumps(appraisal, indent=2, ensure_ascii=False), encoding="utf-8")

        row = {
            "id": HOUSE_TYPE_ID,
            "houseTypeName": "2-bed affordable flats — Bridgend three-storey block",
            "style": "FLAT",
            "configuration": "OTHER",
            "storeys": 3,
            "bedrooms": 2,
            "garage": False,
            "privateDrive": False,
            "tenure": "AFFORDABLE",
            "quantity": FLATS,
            "separateSalesQuantity": False,
            "constructionQuantityLabel": "15 affordable flats in one provisional block",
            "salesQuantityLabel": "",
            "quantitySeparationNotes": "",
            "gifaM2": NET_AREA_PER_FLAT_M2,
            "buildCostPerM2": per_flat / NET_AREA_PER_FLAT_M2,
            "costBreakdown": [
                component(
                    "CUSTOM_ALLOWANCE", "Flat accommodation construction", flat_works,
                    "65 m2 dwelling GIFA at provisional £1,800/m2 direct building works; includes dwelling fabric, fitout, services and fire/acoustic provisions.",
                    65, "m2", 1800,
                ),
                component(
                    "COMMON_STAIRS", "Share of building common/structure area", common_share,
                    "303 m2 gross area outside the 975 m2 flats, shared across 15 homes; includes common stairs/corridors, structure and finishes. The £1,800/m2 is a provisional QS allowance.",
                    common_area / FLATS, "m2", 1800,
                ),
                component(
                    "LIFT", "Share of one three-stop passenger lift", lift_share,
                    "One £70,000 block lift provision allocated across 15 flats; includes installation, ordinary lift-specific builder works, testing and commissioning. Confirm provider brief and specialist quotation.",
                    1 / FLATS, "nr", PASSENGER_LIFT_ALLOWANCE,
                ),
            ],
            "priceIndex": 0,
            "buildPeriodMonths": 12,
            "saleValuePerUnit": 0,
            "saleRatePerM2": 0,
            "notes": (
                "Provisional block cost £2,370,400 (£158,026.67/flat), excluding site-wide prelims, roads/services, land, fees and abnormal groundworks. "
                "15 × 65 m2 = 975 m2 dwelling GIFA. Reported 142 m2 external area per storey cannot contain five 65 m2 flats; "
                "assume one 3-storey block of 1,278 m2 gross (426 m2/storey; 76.3% dwelling efficiency) pending plans. "
                "One lift allowed as a client-brief provision; a lift is not automatically required by Scottish standards for every 3-storey block. "
                "Basis: current local CF2-4L/U and A2-4 costs at index 233, Scottish Government October 2026 Housing Tender Return, "
                "Fife Council 2025 two-bed affordable benchmark, and 2026 specialist lift budget. "
                "Source links: https://www.gov.scot/publications/housing-tender-return-htr-and-scottish-social-housing-tender-price-index-sshtpi/ ; "
                "https://www.fife.gov.uk/__data/assets/pdf_file/0029/676631/Note-of-FHP-Meeting-25.02.25.pdf ; "
                "https://www.futureliftservices.co.uk/blog/commercial-lift-installation-cost/"
            ),
        }
        option["houseTypeSchedule"] = [row]
        appraisal["updatedAt"] = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
        updated = json.dumps(appraisal, ensure_ascii=False, separators=(",", ":"))
        conn.execute("BEGIN IMMEDIATE")
        result = conn.execute(
            "UPDATE appraisals_state SET value = ?, updated_at = ? WHERE id = ? AND value = ?",
            (updated, appraisal["updatedAt"], APPRAISAL_ID, original),
        )
        if result.rowcount != 1:
            conn.rollback()
            raise RuntimeError("Bridgend changed during this edit")
        conn.commit()
        saved = json.loads(conn.execute("SELECT value FROM appraisals_state WHERE id = ?", (APPRAISAL_ID,)).fetchone()[0])
        house = saved["options"][0]["houseTypeSchedule"][0]
        assert house["id"] == HOUSE_TYPE_ID and house["quantity"] == FLATS
        assert abs(sum(item["amount"] for item in house["costBreakdown"]) * FLATS - block_total) < 0.01
        print(f"Saved {FLATS} affordable flats: £{per_flat:,.2f}/flat; £{block_total:,.2f} block, including one lift")
        print(f"Backup: {backup_file}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
