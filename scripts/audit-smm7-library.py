"""Read-only structural audit of the live SMM7 (Official Edition) catalog.

This checks database hierarchy and item reference placement. Exact compliance
with the published RICS text still requires a licensed edition for comparison.
"""

from __future__ import annotations

import argparse
import csv
import re
import sqlite3
from collections import Counter, defaultdict
from pathlib import Path


def write_csv(path: Path, rows: list[dict]) -> None:
    if not rows:
        return
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=str(Path.home() / "AppData/Roaming/com.qspro.boq-generator/qs-pro.db"))
    parser.add_argument("--out", default="outputs/smm7-audit-20261105")
    args = parser.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(Path(args.db).resolve().as_uri() + "?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    catalog = conn.execute("select id, name from library_catalogs where name = ?", ("SMM7 (Official Edition)",)).fetchone()
    if catalog is None:
        raise SystemExit("SMM7 (Official Edition) catalog not found")
    library_id = catalog["id"]
    folders = list(conn.execute("select * from library_folders where library_id = ? order by position", (library_id,)))
    sections = list(conn.execute("select * from library_sections where library_id = ? order by folder_id, position", (library_id,)))
    folder_by_id = {row["id"]: row for row in folders}
    section_by_id = {row["id"]: row for row in sections}
    section_code_counts = Counter(row["order_ref"] for row in sections)
    folder_sections = defaultdict(list)
    for row in sections:
        folder_sections[row["folder_id"]].append(row)

    heading_rows = []
    for folder in folders:
        for section in folder_sections[folder["id"]]:
            heading_rows.append({
                "folder_code": folder["order_ref"],
                "folder_name": folder["name"],
                "section_code": section["order_ref"],
                "section_name": section["name"],
                "section_id": section["id"],
                "position": section["position"],
                "duplicate_code": section_code_counts[section["order_ref"]] > 1,
            })
    write_csv(out / "section-headings.csv", heading_rows)

    unsorted_folders = []
    for folder in folders:
        codes = [row["order_ref"] for row in folder_sections[folder["id"]]]
        if codes != sorted(codes):
            unsorted_folders.append(folder["order_ref"])

    mismatch_counts = Counter()
    mismatch_examples = {}
    first_headings = {}
    major_headings = {}
    section_item_counts = Counter()
    item_counts = Counter()
    missing_section = 0
    priced_blank_description = 0
    reference_pattern = re.compile(r"^([A-Z]\d{2})(?:\.|\b)", re.IGNORECASE)
    cursor = conn.execute(
        "select section_id, position, type, reference, description from library_items where library_id = ?",
        (library_id,),
    )
    for row in cursor:
        item_counts[row["type"]] += 1
        section = section_by_id.get(row["section_id"])
        if section is None:
            missing_section += 1
            continue
        section_item_counts[row["section_id"]] += 1
        if row["type"] in ("GENERAL_HEADING", "MAJOR_HEADING") and row["section_id"] not in first_headings:
            first_headings[row["section_id"]] = (row["type"], row["description"])
        if row["type"] == "MAJOR_HEADING" and row["section_id"] not in major_headings:
            major_headings[row["section_id"]] = row["description"] or ""
        if row["type"] == "PRICED" and not (row["description"] or "").strip():
            priced_blank_description += 1
        match = reference_pattern.match((row["reference"] or "").strip())
        if match and match.group(1).upper() != section["order_ref"].upper():
            key = (row["section_id"], match.group(1).upper())
            mismatch_counts[key] += 1
            mismatch_examples.setdefault(key, (row["type"], row["reference"], (row["description"] or "")[:120]))

    mismatch_rows = []
    for (section_id, reference_code), count in mismatch_counts.most_common():
        section = section_by_id[section_id]
        example = mismatch_examples[(section_id, reference_code)]
        mismatch_rows.append({
            "stored_folder": folder_by_id[section["folder_id"]]["order_ref"],
            "stored_section": section["order_ref"],
            "stored_section_name": section["name"],
            "reference_section": reference_code,
            "item_count": count,
            "example_type": example[0],
            "example_reference": example[1],
            "example_description": example[2],
        })
    write_csv(out / "misplaced-reference-batches.csv", mismatch_rows)
    first_heading_rows = []
    for section in sections:
        first_type, first_description = first_headings.get(section["id"], ("", ""))
        first_heading_rows.append({
            "folder_code": folder_by_id[section["folder_id"]]["order_ref"],
            "section_code": section["order_ref"],
            "section_name": section["name"],
            "first_heading_type": first_type,
            "first_heading": first_description,
        })
    write_csv(out / "first-headings.csv", first_heading_rows)
    differing_titles = []
    empty_sections = []
    for section in sections:
        if section_item_counts[section["id"]] == 0:
            empty_sections.append({"folder_code": folder_by_id[section["folder_id"]]["order_ref"], "section_code": section["order_ref"], "section_name": section["name"]})
        major = major_headings.get(section["id"])
        if not major:
            continue
        major_title = re.sub(r"^" + re.escape(section["order_ref"]) + r"\s*", "", major, flags=re.IGNORECASE).strip()
        normalize = lambda value: re.sub(r"[^a-z0-9]", "", value.lower())
        if normalize(section["name"]) != normalize(major_title):
            differing_titles.append({
                "folder_code": folder_by_id[section["folder_id"]]["order_ref"],
                "section_code": section["order_ref"],
                "section_name": section["name"],
                "first_major_heading": major,
                "section_items": section_item_counts[section["id"]],
            })
    write_csv(out / "section-title-differences.csv", differing_titles)
    write_csv(out / "empty-sections.csv", empty_sections)

    report = [
        "# SMM7 (Official Edition) structural audit",
        "",
        f"Catalog ID: `{library_id}`. Read-only scan of the live database.",
        "",
        f"- {len(folders):,} folders; {len(sections):,} sections; {sum(item_counts.values()):,} items.",
        f"- {len(unsorted_folders)} folders have section codes out of alphabetical/numeric order" + (f": {', '.join(unsorted_folders)}." if unsorted_folders else "."),
        f"- {sum(count - 1 for count in section_code_counts.values() if count > 1)} duplicate section codes: {', '.join(code for code, count in section_code_counts.items() if count > 1)}.",
        f"- {sum(mismatch_counts.values()):,} item references disagree with their stored section across {len(mismatch_counts)} batches.",
        f"- {missing_section:,} items point to a missing section; {priced_blank_description:,} priced items have blank descriptions.",
        f"- {len(differing_titles)} section names differ from their first major heading; {len(empty_sections)} sections have no rows. See the CSV files for editorial review.",
        "",
        "## Misplaced reference batches",
        "",
        "| Stored section | Reference section | Items | Example |",
        "|---|---|---:|---|",
    ]
    for row in mismatch_rows:
        report.append(f"| {row['stored_section']} {row['stored_section_name']} | {row['reference_section']} | {row['item_count']:,} | {row['example_reference']} |")
    report += [
        "",
        "## Limits",
        "",
        "This verifies internal placement and hierarchy only. The exact RICS SMM7 7th-edition headings and item rules require comparison with a licensed copy; this audit does not certify the catalog as the published standard.",
        "",
    ]
    (out / "README.md").write_text("\n".join(report), encoding="utf-8")
    print("\n".join(report[:13]))


if __name__ == "__main__":
    main()
