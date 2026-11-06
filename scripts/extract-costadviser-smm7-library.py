"""Convert the user-supplied CostAdviser .ccpl XML into a bundled QS library.

The source is treated as legacy template content, not as verified SMM7 text.
No source rate is uplifted; all quantities and rates are zero in the library.
"""

from __future__ import annotations

import json
import pathlib
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter


SECTION_HEADING = re.compile(r"^([A-Z]{1,2}\d{2}[A-Za-z]?):\s*(.+)$")
ELEMENT_HEADING = re.compile(r"^([A-Z]):\s*(.+)$")
DAYWORK_DEFINITION = '"Definition of prime cost of daywork'
LIBRARY_ID = "builtin-costadviser-smm7-bq"


def clean(value: str | None) -> str:
    return " ".join((value or "").split())


def item(source_index: int, suffix: str, kind: str, description: str, unit: str = "") -> dict:
    return {
        "id": f"costadviser-{source_index:05d}-{suffix}",
        "type": kind,
        "reference": "",
        "description": description,
        "unit": unit,
        "quantity": 0,
        "rate": 0,
        "total": 0,
    }


def main() -> None:
    source = pathlib.Path(sys.argv[1])
    destination = pathlib.Path(sys.argv[2])
    audit_path = pathlib.Path(sys.argv[3])
    root = ET.parse(source).getroot()
    rows = [
        {node.tag.rsplit("}", 1)[-1]: clean(node.text) for node in record}
        for record in root
    ]
    folders: list[dict] = []
    sections: dict[tuple[str, str], dict] = {}
    source_counts: Counter[str] = Counter()
    missing_unit: list[int] = []
    placeholders: list[int] = []
    current_folder: dict | None = None
    current_section: dict | None = None
    uncoded_heading_type = "MAJOR_HEADING"

    for source_index, row in enumerate(rows):
        if row["References"]:
            source_counts["metadata"] += 1
            continue
        element = row["Element"]
        if element:
            match = ELEMENT_HEADING.match(element)
            if not match:
                raise ValueError(f"Unrecognised element at source row {source_index}: {element}")
            current_folder = {
                "id": f"costadviser-folder-{match.group(1)}",
                "orderRef": match.group(1),
                "name": match.group(2),
                "sections": [],
            }
            folders.append(current_folder)
            current_section = None
            source_counts["elements"] += 1

        heading = row["Heading"]
        if heading:
            if current_folder is None:
                raise ValueError(f"Heading before element at source row {source_index}")
            match = SECTION_HEADING.match(heading)
            if match:
                code, title = match.groups()
                section_key = (current_folder["id"], code)
                current_section = sections.get(section_key)
                if current_section is None:
                    section_title = "PILING" if code == "D30" else title
                    current_section = {
                        "id": f"costadviser-section-{current_folder['orderRef']}-{code}",
                        "orderRef": code,
                        "name": section_title,
                        "items": [item(source_index, "h1", "GENERAL_HEADING", f"{code} {section_title}")],
                    }
                    sections[section_key] = current_section
                    current_folder["sections"].append(current_section)
                    source_counts["sections"] += 1
                    if code == "D30":
                        current_section["items"].append(item(source_index, "h2", "MAJOR_HEADING", title))
                        uncoded_heading_type = "SUB_SECTION"
                    else:
                        uncoded_heading_type = "MAJOR_HEADING"
                else:
                    # Later runs of the same code are distinct work families inside
                    # the same section, rather than duplicate section records.
                    current_section["items"].append(item(source_index, "h2", "MAJOR_HEADING", title))
                    uncoded_heading_type = "SUB_SECTION"
                    source_counts["repeated_section_headers"] += 1
            else:
                if current_section is None:
                    raise ValueError(f"Work heading before section at source row {source_index}")
                current_section["items"].append(item(source_index, "work-heading", uncoded_heading_type, heading))
                source_counts["work_headings"] += 1

        description = row["Description"]
        details = row["Details"]
        unit = row["Unit"]
        rate = row["Rate"]
        if current_section is None and (description or details or unit):
            raise ValueError(f"Content before section at source row {source_index}")

        if description:
            if unit or rate:
                current_section["items"].append(item(source_index, "priced-description", "PRICED", description, unit))
                source_counts["priced_description_rows"] += 1
                if not unit:
                    missing_unit.append(source_index)
            else:
                current_section["items"].append(item(source_index, "comment", "COMMENT", description))
                source_counts["comments"] += 1

        if details:
            if not unit and not rate and details.startswith(DAYWORK_DEFINITION):
                current_section["items"].append(item(source_index, "sub-comment", "SUB_COMMENT", details))
                source_counts["narrative_details"] += 1
            else:
                current_section["items"].append(item(source_index, "priced-detail", "PRICED", details, unit))
                source_counts["priced_detail_rows"] += 1
                if not unit:
                    missing_unit.append(source_index)
        if "*" in description or "*" in details or "(insert" in (description + details).lower():
            placeholders.append(source_index)
        if not any((element, heading, description, details, unit, rate)):
            source_counts["blank_rows"] += 1

    for folder in folders:
        folder["sections"].sort(key=lambda section: section["orderRef"])
        for section in folder["sections"]:
            priced = [entry for entry in section["items"] if entry["type"] == "PRICED"]
            width = max(4, len(str(len(priced))))
            for ordinal, entry in enumerate(priced, 1):
                entry["reference"] = f"{section['orderRef']}.{ordinal:0{width}d}"

    catalog = {
        "id": LIBRARY_ID,
        "name": "SMM7 [CA-Edition]",
        "folders": folders,
        "governance": {
            "owner": "CostAdviser source supplied by user",
            "source": source.name,
            "indexBasis": "Legacy bill template; source rates are zero; unverified placeholders and missing units require review",
            "approvalStatus": "DRAFT",
        },
    }
    all_items = [entry for folder in folders for section in folder["sections"] for entry in section["items"]]
    ids = [entry["id"] for entry in all_items]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate generated item IDs")
    for section in sections.values():
        if section["items"][0]["type"] != "GENERAL_HEADING":
            raise ValueError(f"Missing H1: {section['id']}")
        if sum(entry["type"] == "GENERAL_HEADING" for entry in section["items"]) != 1:
            raise ValueError(f"Multiple H1 rows: {section['id']}")
    item_counts = Counter(entry["type"] for entry in all_items)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(catalog, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    audit_path.parent.mkdir(parents=True, exist_ok=True)
    audit_path.write_text(
        "SMM7 [CA-Edition] import audit\n"
        f"Source: {source}\nSource rows: {len(rows)}\n"
        f"Folders: {len(folders)}; sections: {len(sections)}; imported rows: {len(all_items)}\n"
        f"Imported row types: {dict(sorted(item_counts.items()))}\n"
        f"Source classifications: {dict(sorted(source_counts.items()))}\n"
        f"Priced rows with no source unit ({len(missing_unit)}): {missing_unit}\n"
        f"Rows with source placeholders or asterisks ({len(placeholders)}): {placeholders[:100]}{' ...' if len(placeholders) > 100 else ''}\n"
        "All source rates are zero. No published SMM7 compliance or current price accuracy is asserted.\n"
        "The catalog is draft because the source includes placeholders, missing units and some incomplete descriptions.\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(folders)} folders, {len(sections)} sections and {len(all_items)} rows to {destination}")


if __name__ == "__main__":
    main()
