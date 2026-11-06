"""Remove an exact Y20 duplicate and align A-X top-level labels.

The four changed group titles are corroborated by RICS isurv SMM7 chapter
headings. Other titles are normalised to the catalog's existing folder name.
"""

from __future__ import annotations

import argparse
import gzip
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

CANONICAL = {
    "C": "Existing site/building/services",
    "E": "In situ concrete/Large precast concrete",
    "M": "Surface finishes",
    "P": "Building fabric sundries",
    "V": "Electrical supply / power / lighting systems",
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--db", default=str(Path.home() / "AppData/Roaming/com.qspro.boq-generator/qs-pro.db"))
    parser.add_argument("--out", default="outputs/smm7-audit-20261105")
    args = parser.parse_args()
    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    conn.execute("pragma foreign_keys=on")
    conn.execute("pragma busy_timeout=30000")
    try:
        if args.apply:
            conn.execute("begin immediate")
        lid = conn.execute("select id from library_catalogs where name='SMM7 (Official Edition)'").fetchone()["id"]
        folders = list(conn.execute("select * from library_folders where library_id=?", (lid,)))
        y20 = list(conn.execute("select * from library_sections where library_id=? and order_ref='Y20'", (lid,)))
        if len(y20) != 2:
            raise RuntimeError("Expected two Y20 sections")
        if {row["name"] for row in y20} != {"General pipeline equipment", "Pumps"}:
            raise RuntimeError("Y20 labels changed")
        keep = next(row for row in y20 if row["name"] == "Pumps")
        remove = next(row for row in y20 if row["name"] == "General pipeline equipment")
        columns = "type,reference,description,unit,quantity,quantity_decimals,rate,total,dimension_rows,rate_build_up"
        def contents(sid: str) -> list[tuple]:
            return list(conn.execute(f"select {columns} from library_items where section_id=? order by position", (sid,)))
        if contents(keep["id"]) != contents(remove["id"]):
            raise RuntimeError("Y20 sections are no longer exact duplicates")
        affected_h1 = list(conn.execute(
            "select i.* from library_items i join library_folders f on f.id=i.folder_id "
            "where i.library_id=? and i.type='GENERAL_HEADING' and f.order_ref not in ('Y','Z')", (lid,)
        ))
        print(f"Preflight passed: {len(contents(remove['id'])):,} duplicate Y20 rows and {len(affected_h1)} A-X group headings.")
        if not args.apply:
            return
        out = Path(args.out)
        out.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        backup = out / f"smm7-headings-before-{stamp}.jsonl.gz"
        with gzip.open(backup, "wt", encoding="utf-8") as handle:
            for table, records in (
                ("library_catalogs", conn.execute("select * from library_catalogs where id=?", (lid,))),
                ("library_stats", conn.execute("select * from library_stats where library_id=?", (lid,))),
                ("library_folders", folders),
                ("library_sections", conn.execute("select * from library_sections where library_id=?", (lid,))),
                ("library_items", conn.execute("select * from library_items where section_id=? or id in (select i.id from library_items i join library_folders f on f.id=i.folder_id where i.library_id=? and i.type='GENERAL_HEADING' and f.order_ref not in ('Y','Z'))", (remove["id"], lid))),
            ):
                for row in records:
                    handle.write(json.dumps({"table": table, "row": dict(row)}, ensure_ascii=False) + "\n")
        if backup.stat().st_size < 1000:
            raise RuntimeError("Backup appears incomplete")
        conn.execute("delete from library_items where library_id=? and section_id=?", (lid, remove["id"]))
        conn.execute("delete from library_sections where library_id=? and id=?", (lid, remove["id"]))
        for folder in folders:
            code = folder["order_ref"]
            if code in ("Y", "Z"):
                continue
            name = CANONICAL.get(code, folder["name"])
            if name != folder["name"]:
                conn.execute("update library_folders set name=? where id=?", (name, folder["id"]))
            conn.execute("update library_items set description=? where library_id=? and folder_id=? and type='GENERAL_HEADING'", (name, lid, folder["id"]))
        for folder in folders:
            ordered = list(conn.execute("select id from library_sections where library_id=? and folder_id=? order by order_ref,name,id", (lid, folder["id"])))
            for position, section in enumerate(ordered):
                conn.execute("update library_sections set position=? where id=?", (position, section["id"]))
        item_count, priced_count = conn.execute("select count(*),sum(type='PRICED') from library_items where library_id=?", (lid,)).fetchone()
        section_count = conn.execute("select count(*) from library_sections where library_id=?", (lid,)).fetchone()[0]
        now = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
        conn.execute("update library_stats set section_count=?,item_count=?,priced_count=?,updated_at=? where library_id=?", (section_count,item_count,priced_count,now,lid))
        conn.execute("update library_catalogs set updated_at=? where id=?", (now,lid))
        conn.commit()
        print(f"Committed. Backup: {backup}. Sections: {section_count:,}; items: {item_count:,}.")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
