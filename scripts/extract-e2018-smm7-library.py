"""Convert the supplied 2018r1 CES SMM7 backup into a bundled QS library.

The source's folder/section/heading/comment/item hierarchy and historical
cost prices are preserved. Resource groups are audited separately because
they are rate-build-up categories, not bill items.
"""

from __future__ import annotations

import csv
import json
import pathlib
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from decimal import Decimal


LIBRARY_ID = "builtin-smm7-e2018-edition"
LIBRARY_NAME = "SMM7 Library [E2018-Edition]"
EXPECTED_COUNTS = Counter({"13": 17, "12": 96, "11": 506, "10": 2187, "1": 10458})


def clean(value: str | None) -> str:
    return " ".join((value or "").split())


def main() -> None:
    source, resource_groups_source, destination, audit_destination = map(pathlib.Path, sys.argv[1:5])
    library = ET.parse(source).getroot().find("library")
    if library is None or library.get("name") != "SMM7 2018r1":
        raise ValueError("Expected the supplied SMM7 2018r1 CES library")
    items_node = library.find("items")
    if items_node is None:
        raise ValueError("The source library has no items")
    source_items = list(items_node)
    by_id = {node.get("id"): node for node in source_items}
    if len(by_id) != len(source_items):
        raise ValueError("Duplicate source item IDs")
    children: dict[str, list[ET.Element]] = defaultdict(list)
    counts: Counter[str] = Counter()
    for node in source_items:
        item_id, parent_id, kind = node.get("id"), node.get("pLevel"), node.get("type")
        if not item_id or not parent_id or (parent_id != "0" and parent_id not in by_id):
            raise ValueError(f"Orphan or invalid source row {item_id}")
        if kind not in EXPECTED_COUNTS:
            raise ValueError(f"Unexpected source type {kind} on {item_id}")
        children[parent_id].append(node)
        counts[kind] += 1
    if counts != EXPECTED_COUNTS:
        raise ValueError(f"Source counts changed: {counts}")
    for rows in children.values():
        rows.sort(key=lambda node: int(node.get("pos") or 0))

    def typed_children(node: ET.Element, kind: str) -> list[ET.Element]:
        rows = children[node.get("id")]
        if not rows or any(row.get("type") != kind for row in rows):
            raise ValueError(f"Unexpected children beneath {node.get('id')}")
        return rows

    def heading(node: ET.Element, kind: str, description: str | None = None) -> dict:
        return {
            "id": f"e2018-smm7-item-{node.get('id')}", "type": kind,
            "reference": "", "description": description or clean(node.get("desc")),
            "unit": "", "quantity": 0, "rate": 0, "total": 0,
        }

    folders: list[dict] = []
    codes: set[str] = set()
    rate_min: Decimal | None = None
    rate_max: Decimal | None = None
    for folder_node in children["0"]:
        if folder_node.get("type") != "13":
            raise ValueError("Only source folders may appear at the root")
        folder = {
            "id": f"e2018-smm7-folder-{folder_node.get('id')}",
            "name": clean(folder_node.get("desc")), "sections": [],
        }
        for section_node in typed_children(folder_node, "12"):
            source_label = clean(section_node.get("desc"))
            section_match = re.fullmatch(r"([A-Z]\d{2}):\s*(.+)", source_label)
            if not section_match:
                raise ValueError(f"Section code missing: {source_label}")
            section_code, section_name = section_match.groups()
            rows = [heading(section_node, "GENERAL_HEADING", f"{section_code} {section_name}")]
            priced_in_section = 0
            for family_node in typed_children(section_node, "11"):
                rows.append(heading(family_node, "MAJOR_HEADING"))
                for description_node in typed_children(family_node, "10"):
                    rows.append(heading(description_node, "COMMENT"))
                    for price_node in typed_children(description_node, "1"):
                        code = price_node.get("libcode") or ""
                        unit = clean(price_node.get("uom"))
                        cost = Decimal(price_node.get("costPrice1") or "")
                        sale = Decimal(price_node.get("sellPrice1") or "")
                        if (not code or not code.startswith(f"{section_code[0]}.{section_code[1:]}.")
                                or not unit or cost <= 0 or cost != sale or code in codes):
                            raise ValueError(f"Invalid priced source item {price_node.get('id')}: {code}")
                        codes.add(code)
                        priced_in_section += 1
                        rate_min = cost if rate_min is None else min(rate_min, cost)
                        rate_max = cost if rate_max is None else max(rate_max, cost)
                        rows.append({
                            "id": f"e2018-smm7-item-{price_node.get('id')}",
                            "type": "PRICED", "reference": code,
                            "description": clean(price_node.get("desc")),
                            "unit": unit, "quantity": 0, "rate": float(cost), "total": 0,
                        })
            if not priced_in_section:
                raise ValueError(f"Empty section {source_label}")
            folder["sections"].append({
                "id": f"e2018-smm7-section-{section_node.get('id')}",
                "orderRef": section_code, "name": section_name, "items": rows,
            })
        folder["orderRef"] = folder["sections"][0]["orderRef"][0]
        folders.append(folder)

    with resource_groups_source.open(newline="", encoding="utf-8-sig") as stream:
        resource_groups = list(csv.reader(stream))
    if not resource_groups or any(len(row) != 3 for row in resource_groups):
        raise ValueError("Unexpected resource-group CSV layout")
    output_count = sum(len(section["items"]) for folder in folders for section in folder["sections"])
    if len(codes) != counts["1"] or output_count != sum(counts[k] for k in ("12", "11", "10", "1")):
        raise ValueError("Output rows do not reconcile with the source")

    bundled = {
        "id": LIBRARY_ID, "name": LIBRARY_NAME, "folders": folders,
        "governance": {
            "source": f"User-supplied {source.name}; CES backup {library.get('backupDate')}",
            "rateDate": "2017-10-24",
            "indexBasis": "Original source costPrice1, unindexed; historical rates require review before use",
            "approvalStatus": "DRAFT",
        },
        "permissions": {
            "allowExportAll": True, "allowExportFolders": True,
            "allowExportSections": True, "allowLibraryEditing": True,
        },
    }
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(bundled, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    audit = {
        "source": source.name, "resourceGroupsSource": resource_groups_source.name,
        "library": LIBRARY_NAME, "sourceCounts": dict(counts),
        "outputFolders": len(folders), "outputSections": sum(len(folder["sections"]) for folder in folders),
        "outputItems": output_count, "outputPricedItems": counts["1"],
        "uniqueSourceCodes": len(codes), "resourceGroupRows": len(resource_groups),
        "sourceRateMin": str(rate_min), "sourceRateMax": str(rate_max),
        "notes": [
            "Source type 13 maps to folder; 12 to section and H1; 11 to H2; 10 to comment; 1 to priced item.",
            "Source section labels are split into SMM7 order reference and section name.",
            "The resource-group CSV is rate-build-up taxonomy, not extra bill rows; it is not merged into the hierarchy.",
            "Source rates are retained as historical, unindexed 2017 prices; quantities and totals start at zero.",
        ],
    }
    audit_destination.write_text(json.dumps(audit, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"{LIBRARY_NAME}: {len(folders)} folders, {audit['outputSections']} sections, {output_count} rows, {counts['1']} priced")


if __name__ == "__main__":
    main()
