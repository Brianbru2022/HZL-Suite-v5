"""Repair verified duplicate/misfiled SMM7 data, with a full affected-row backup.

Run without --apply for a read-only preflight. This does not certify exact
published SMM7 wording; it only corrects internal placement and duplicates.
"""

from __future__ import annotations

import argparse
import gzip
import json
import re
import sqlite3
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

CATALOG = "SMM7 (Official Edition)"
BACKUP_CODES = ("R33", "H50", "Q41", "Q55", "Q46")


def content_rows(conn: sqlite3.Connection, sid: str) -> list[tuple]:
    return list(conn.execute(
        "select type,reference,description,unit,quantity,quantity_decimals,rate,total,dimension_rows,rate_build_up "
        "from library_items where section_id=? order by position", (sid,)
    ))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--db", default=str(Path.home() / "AppData/Roaming/com.qspro.boq-generator/qs-pro.db"))
    parser.add_argument("--out", default="outputs/smm7-audit-20261105")
    args = parser.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    conn.execute("pragma foreign_keys=on")
    conn.execute("pragma busy_timeout=30000")
    try:
        if args.apply:
            conn.execute("begin immediate")
        catalog = conn.execute("select id from library_catalogs where name=?", (CATALOG,)).fetchone()
        if catalog is None:
            raise RuntimeError("SMM7 catalog not found")
        lid = catalog["id"]
        folders = {row["order_ref"]: row for row in conn.execute("select * from library_folders where library_id=?", (lid,))}
        sections = list(conn.execute("select * from library_sections where library_id=?", (lid,)))
        by_code = {}
        for row in sections:
            by_code.setdefault(row["order_ref"], []).append(row)
        for code in (*BACKUP_CODES, "R19", "H51"):
            if len(by_code.get(code, [])) != 1:
                raise RuntimeError(f"Expected exactly one {code} section")
        sid = {code: by_code[code][0]["id"] for code in (*BACKUP_CODES, "R19", "H51")}
        r33 = content_rows(conn, sid["R33"])
        r19 = content_rows(conn, sid["R19"])
        h50 = content_rows(conn, sid["H50"])
        h51 = content_rows(conn, sid["H51"])
        if not r19 or r33[668:] != r19[1:]:
            raise RuntimeError("R33 appended R19 block no longer matches its source exactly")
        h51_counts = Counter(h51)
        if any(count > h51_counts[row] for row, count in Counter(h50).items()):
            raise RuntimeError("H50 content is not wholly duplicated under H51")
        q41 = content_rows(conn, sid["Q41"])
        if not q41[881][2].startswith("Q55 ") or len(content_rows(conn, sid["Q55"])) != 0:
            raise RuntimeError("Q55 split point or destination changed")
        if not content_rows(conn, sid["Q46"])[1][2].startswith("D46 "):
            raise RuntimeError("Q46 is no longer the D46 structural bunds block")
        print(f"Preflight passed: remove {len(r33)-668:,} duplicate R19 rows from R33 and {len(h50):,} duplicated H50 rows; move {len(q41)-881:,} Q55 rows; reclassify Q41 barrier refs and D46 bunds; sort sections.")
        if not args.apply:
            return

        stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        backup_path = out / f"smm7-structure-before-{stamp}.jsonl.gz"
        with gzip.open(backup_path, "wt", encoding="utf-8") as handle:
            for table, query, params in (
                ("library_catalogs", "select * from library_catalogs where id=?", (lid,)),
                ("library_stats", "select * from library_stats where library_id=?", (lid,)),
                ("library_folders", "select * from library_folders where library_id=?", (lid,)),
                ("library_sections", "select * from library_sections where library_id=?", (lid,)),
                ("library_items", "select * from library_items where library_id=? and section_id in (?,?,?,?,?)", (lid, *(sid[code] for code in BACKUP_CODES))),
            ):
                for row in conn.execute(query, params):
                    handle.write(json.dumps({"table": table, "row": dict(row)}, ensure_ascii=False) + "\n")
        if backup_path.stat().st_size < 1_000:
            raise RuntimeError("Backup appears incomplete")
        print(f"Saved affected-row backup: {backup_path} ({backup_path.stat().st_size:,} bytes)")

        # Both removed blocks are proved content duplicates above.
        conn.execute("delete from library_items where library_id=? and section_id=? and position>=668", (lid, sid["R33"]))
        conn.execute("delete from library_items where library_id=? and section_id=?", (lid, sid["H50"]))
        conn.execute("delete from library_sections where library_id=? and id=?", (lid, sid["H50"]))

        # The appended Q55 block has its own destination section, currently empty.
        conn.execute("update library_items set section_id=?, position=position-881 where library_id=? and section_id=? and position>=881", (sid["Q55"], lid, sid["Q41"]))
        conn.execute("update library_items set reference='Q41' || substr(reference,4) where library_id=? and section_id=? and reference like 'Q39.%'", (lid, sid["Q41"]))
        conn.execute("update library_items set description='Q41' || substr(description,4) where library_id=? and section_id=? and type='MAJOR_HEADING' and description like 'Q39 %'", (lid, sid["Q41"]))

        # This block is explicitly headed D46 Groundwork throughout, but stored as Q46.
        conn.execute("update library_sections set folder_id=?, order_ref='D46' where library_id=? and id=?", (folders["D"]["id"], lid, sid["Q46"]))
        conn.execute("update library_items set folder_id=? where library_id=? and section_id=?", (folders["D"]["id"], lid, sid["Q46"]))

        for folder in folders.values():
            ordered = list(conn.execute("select id,order_ref from library_sections where library_id=? and folder_id=? order by order_ref,name,id", (lid, folder["id"])))
            for position, section in enumerate(ordered):
                conn.execute("update library_sections set position=? where id=?", (position, section["id"]))
        for position, folder in enumerate(sorted(folders.values(), key=lambda row: row["order_ref"])):
            conn.execute("update library_folders set position=? where id=?", (position, folder["id"]))

        item_count, priced_count = conn.execute("select count(*),sum(type='PRICED') from library_items where library_id=?", (lid,)).fetchone()
        section_count = conn.execute("select count(*) from library_sections where library_id=?", (lid,)).fetchone()[0]
        now = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
        conn.execute("update library_stats set folder_count=?,section_count=?,item_count=?,priced_count=?,updated_at=? where library_id=?", (len(folders), section_count, item_count, priced_count, now, lid))
        conn.execute("update library_catalogs set updated_at=? where id=?", (now, lid))
        conn.commit()
        print(f"Committed: {section_count:,} sections, {item_count:,} items, {priced_count:,} priced items.")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
