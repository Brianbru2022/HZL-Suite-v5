"""One-off, guarded RCC repair for Melrose and a new Bridgend revision."""

import copy
import datetime as dt
import json
import pathlib
import sqlite3
import uuid


DB = pathlib.Path.home() / "AppData/Roaming/com.qspro.boq-generator/qs-pro.db"
MELROSE_ID = "997887bb-4098-490d-ba9c-729205e3c632"
BRIDGEND_ID = "ea826776-1781-45df-ba37-6518dcf899cf"
FROZEN_OPTION_KEYS = (
    "frozenMetrics", "frozenMetricsBasis", "frozenFinalReportMetrics",
    "frozenSellerMetrics", "frozenZeroLandMetrics", "frozenReportData",
    "frozenCommercialAssurance", "approvedReportIssues",
)


def uid():
    return str(uuid.uuid4())


def load(connection, table):
    return [(row_id, position, json.loads(value)) for row_id, position, value
            in connection.execute(f"SELECT id, position, value FROM {table} ORDER BY position")]


def duplicate_option(option, house_types, rates, timestamp):
    result = copy.deepcopy(option)
    for key in FROZEN_OPTION_KEYS:
        result.pop(key, None)
    result.pop("finalReportExecutiveSummary", None)
    result.pop("finalReportSourceSignature", None)
    result["id"] = uid()
    result["recommended"] = False
    result["createdAt"] = timestamp
    result["updatedAt"] = timestamp
    source_ids = {row["id"]: uid() for row in result.get("siteDimensions", [])}
    for row in result.get("revenueLines", []):
        row["id"] = uid()
    for row in result.get("costLines", []):
        row["id"] = uid()
        if row.get("sourceSiteDimensionId"):
            row["sourceSiteDimensionId"] = source_ids.get(row["sourceSiteDimensionId"])
    for row in result.get("houseTypeSchedule", []):
        row["id"] = uid()
        current = house_types.get(row.get("libraryHouseTypeId"))
        if current:
            for key in ("buildCostPerM2", "costBreakdown", "priceIndex"):
                if key in current:
                    row[key] = copy.deepcopy(current[key])
                else:
                    row.pop(key, None)
    for row in result.get("siteDimensions", []):
        row["id"] = source_ids[row["id"]]
        current = rates.get(row.get("libraryRateId"))
        if current and not row.get("isCostDriverInput"):
            for key in ("rate", "priceIndex", "sourceFormula", "sourceRow"):
                if key in current:
                    row[key] = copy.deepcopy(current[key])
                else:
                    row.pop(key, None)
    for key in ("baseMeasurementFiles", "architectFeasibilityLayouts"):
        for row in result.get(key, []):
            row["id"] = uid()
    for entry in result.get("consentTracker", []):
        entry["id"] = uid()
        entry["createdAt"] = timestamp
        entry["updatedAt"] = timestamp
        for upload in entry.get("uploads", []):
            upload["id"] = uid()
    result["rccFees"] = {"authority": "PERTH_KINROSS"}
    return result


def main():
    timestamp = dt.datetime.now(dt.timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    backup = DB.with_name(f"qs-pro-before-rcc-20261015-{dt.datetime.now():%H%M%S}.db")
    with sqlite3.connect(DB) as connection:
        appraisals = {row_id: (position, value) for row_id, position, value in load(connection, "appraisals_state")}
        melrose_pos, melrose = appraisals[MELROSE_ID]
        bridgend_pos, bridgend = appraisals[BRIDGEND_ID]
        if melrose["name"] != "Dingleton, Melrose" or melrose.get("frozenAt"):
            raise RuntimeError("Melrose appraisal identity or editable status changed")
        if bridgend["name"] != "Bridgend, Kinross" or not bridgend.get("frozenAt"):
            raise RuntimeError("Bridgend frozen version identity changed")
        if bridgend.get("reference") != "2026.017.A":
            raise RuntimeError("Bridgend revision reference changed")
        if any(value.get("reference") == "2026.017.B" for _, value in appraisals.values()):
            raise RuntimeError("Bridgend revision B already exists")
        if not any(row.get("costDriver") == "ROADS_M2" and row.get("quantity", 0) > 0
                   for row in melrose["options"][0].get("siteDimensions", [])):
            raise RuntimeError("Melrose road area is missing")
        if not any(row.get("costDriver") == "ROADS_M2" and row.get("quantity", 0) > 0
                   for row in bridgend["options"][0].get("siteDimensions", [])):
            raise RuntimeError("Bridgend road area is missing")

        with sqlite3.connect(backup) as destination:
            connection.backup(destination)

        house_types = {row_id: value for row_id, _, value in load(connection, "appraisal_house_types_state")}
        rates = {row_id: value for row_id, _, value in load(connection, "appraisal_rates_state")}

        melrose_copy = copy.deepcopy(melrose)
        for option in melrose_copy["options"]:
            option["rccFees"] = {"authority": "OTHER", "otherAuthorityName": "Scottish Borders"}
            option["updatedAt"] = timestamp
        melrose_copy["updatedAt"] = timestamp

        bridgend_copy = copy.deepcopy(bridgend)
        bridgend_copy.pop("frozenAt", None)
        bridgend_copy.pop("archivedAt", None)
        bridgend_copy["id"] = uid()
        bridgend_copy["reference"] = "2026.017.B"
        bridgend_copy["versionSummary"] = "RCC allowance recalculated from Perth & Kinross 2026/27 officer-hour charge and site road measures."
        bridgend_copy["status"] = "DRAFT"
        bridgend_copy["createdAt"] = timestamp
        bridgend_copy["updatedAt"] = timestamp
        bridgend_copy["options"] = [duplicate_option(option, house_types, rates, timestamp)
                                    for option in bridgend["options"]]
        bridgend_copy["selectedOptionId"] = bridgend_copy["options"][0]["id"]

        connection.execute("UPDATE appraisals_state SET value=?, updated_at=? WHERE id=?",
                           (json.dumps(melrose_copy, separators=(",", ":")), timestamp, MELROSE_ID))
        connection.execute("UPDATE appraisals_state SET position=position+1 WHERE position>=?", (bridgend_pos,))
        connection.execute("INSERT INTO appraisals_state (id,position,value,updated_at) VALUES (?,?,?,?)",
                           (bridgend_copy["id"], bridgend_pos, json.dumps(bridgend_copy, separators=(",", ":")), timestamp))
        connection.commit()
    print("Backup:", backup)
    print("Melrose:", melrose_copy["reference"], melrose_copy["options"][0]["rccFees"])
    print("Bridgend:", bridgend_copy["reference"], bridgend_copy["id"], bridgend_copy["options"][0]["rccFees"])
    print("Original frozen Bridgend version preserved:", bridgend["id"])


if __name__ == "__main__":
    main()
