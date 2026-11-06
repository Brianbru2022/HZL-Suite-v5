"""Set saved house, infrastructure and plot-works base cost indices to 233.

Run without --apply to inspect a database. Back up the working database before
using --apply. The migration only changes index fields and is idempotent.
"""

import argparse
import collections
import json
import sqlite3


TARGET_INDEX = 233
ABNORMAL_REMOVALS = {
    "awd-infrastructure-removal-existing-structures",
    "awd-infrastructure-removal-existing-surfaces",
    "awd-infrastructure-alterations",
}


def base_cost_row(row):
    if row.get("isCostDriverInput"):
        return False
    rate_id = row.get("libraryRateId") or ""
    if rate_id in ABNORMAL_REMOVALS:
        return False
    return rate_id.startswith(("awd-infrastructure-", "awd-plot-works-")) or row.get(
        "sourceRow"
    ) in {
        "INFRASTRUCTURE_CUSTOM",
        "INFRASTRUCTURE_LIBRARY",
        "PLOT_WORKS_CUSTOM",
        "PLOT_WORKS_LIBRARY",
    }


def set_index(row, counts, key):
    if row.get("priceIndex") == TARGET_INDEX:
        return
    row["priceIndex"] = TARGET_INDEX
    counts[key] += 1


def migrate(db, apply):
    counts = collections.Counter()
    pending = []
    for table in (
        "appraisals_state",
        "appraisal_house_types_state",
        "appraisal_rates_state",
    ):
        for row_id, raw in db.execute(f"SELECT id, value FROM {table}"):
            value = json.loads(raw)
            before = counts.copy()
            if table == "appraisals_state":
                for option in value.get("options", []) or []:
                    for house in option.get("houseTypeSchedule", []) or []:
                        components = house.get("costBreakdown") or []
                        if components:
                            for component in components:
                                set_index(component, counts, "appraisal house components")
                        else:
                            set_index(house, counts, "appraisal house fallback")
                    for site_row in option.get("siteDimensions", []) or []:
                        if base_cost_row(site_row):
                            set_index(site_row, counts, "appraisal base site rows")
            elif table == "appraisal_house_types_state":
                components = value.get("costBreakdown") or []
                if components:
                    for component in components:
                        set_index(component, counts, "library house components")
                else:
                    set_index(value, counts, "library house fallback")
            elif (value.get("id") or "").startswith(
                ("awd-infrastructure-", "awd-plot-works-")
            ) and value.get("id") not in ABNORMAL_REMOVALS:
                set_index(value, counts, "rate library base rows")
            if counts != before:
                pending.append((table, row_id, json.dumps(value, ensure_ascii=False, separators=(",", ":"))))
    if apply:
        with db:
            for table, row_id, value in pending:
                db.execute(f"UPDATE {table} SET value = ? WHERE id = ?", (value, row_id))
    return dict(counts), len(pending)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("db", help="SQLite appraisal database")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    connection = sqlite3.connect(args.db)
    try:
        counts, records = migrate(connection, args.apply)
        print(json.dumps({"applied": args.apply, "records": records, "indices": counts}, indent=2))
    finally:
        connection.close()


if __name__ == "__main__":
    main()
