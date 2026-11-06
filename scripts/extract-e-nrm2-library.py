"""Convert the supplied 2021 NRM2 CES XML into a bundled QS library.

The source hierarchy is preserved. Source cost rates are kept unchanged and
identified as historical 2021 rates in the library governance record.
"""

from __future__ import annotations

import json
import pathlib
import sys
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from decimal import Decimal


LIBRARY_ID = "builtin-nrm2-e-edition"
LIBRARY_NAME = "NRM2 [E-Edition]"
SOURCE_TYPES = {"13": "folder", "12": "section", "11": "MAJOR_HEADING", "10": "COMMENT", "1": "PRICED"}


def clean(value: str | None) -> str:
    return " ".join((value or "").split())


def main() -> None:
    source = pathlib.Path(sys.argv[1])
    destination = pathlib.Path(sys.argv[2])
    audit_destination = pathlib.Path(sys.argv[3])
    root = ET.parse(source).getroot()
    library_node = root.find("library")
    if library_node is None or library_node.get("name") != "NRM2_2021":
        raise ValueError("Expected the supplied NRM2_2021 library XML")
    items_node = library_node.find("items")
    if items_node is None:
        raise ValueError("The source library has no items")
    source_items = list(items_node)
    by_id = {node.get("id"): node for node in source_items}
    if len(by_id) != len(source_items):
        raise ValueError("Duplicate source item IDs")
    by_parent: dict[str, list[ET.Element]] = defaultdict(list)
    counts: Counter[str] = Counter()
    for node in source_items:
        kind = node.get("type")
        if kind not in SOURCE_TYPES:
            raise ValueError(f"Unrecognised source type {kind!r}")
        parent_id = node.get("pLevel")
        if parent_id != "0" and parent_id not in by_id:
            raise ValueError(f"Orphan source item {node.get('id')}")
        by_parent[parent_id].append(node)
        counts[kind] += 1
    for children in by_parent.values():
        children.sort(key=lambda node: int(node.get("pos") or 0))

    def children_of(node: ET.Element, expected_type: str) -> list[ET.Element]:
        children = by_parent[node.get("id")]
        if not children or any(child.get("type") != expected_type for child in children):
            raise ValueError(f"Unexpected children beneath source item {node.get('id')}")
        return children

    folders: list[dict] = []
    all_codes: set[str] = set()
    rate_min: Decimal | None = None
    rate_max: Decimal | None = None
    for folder_node in by_parent["0"]:
        if folder_node.get("type") != "13":
            raise ValueError("Expected source type 13 at the root")
        folder = {
            "id": f"e-nrm2-folder-{folder_node.get('id')}",
            "name": clean(folder_node.get("desc")),
            "sections": [],
        }
        folders.append(folder)
        for section_node in children_of(folder_node, "12"):
            rows: list[dict] = []
            price_codes: list[str] = []

            def add_heading(node: ET.Element, kind: str) -> None:
                rows.append({
                    "id": f"e-nrm2-item-{node.get('id')}",
                    "type": kind,
                    "reference": "",
                    "description": clean(node.get("desc")),
                    "unit": "",
                    "quantity": 0,
                    "rate": 0,
                    "total": 0,
                })

            for family_node in children_of(section_node, "11"):
                add_heading(family_node, "MAJOR_HEADING")
                for description_node in children_of(family_node, "10"):
                    add_heading(description_node, "COMMENT")
                    for price_node in children_of(description_node, "1"):
                        code = price_node.get("libcode")
                        unit = clean(price_node.get("uom"))
                        cost = Decimal(price_node.get("costPrice1") or "")
                        sale = Decimal(price_node.get("sellPrice1") or "")
                        if not code or not unit or cost != sale or code in all_codes:
                            raise ValueError(f"Invalid priced source item {price_node.get('id')}")
                        all_codes.add(code)
                        price_codes.append(code)
                        rate_min = cost if rate_min is None else min(rate_min, cost)
                        rate_max = cost if rate_max is None else max(rate_max, cost)
                        rows.append({
                            "id": f"e-nrm2-item-{price_node.get('id')}",
                            "type": "PRICED",
                            "reference": code,
                            "description": clean(price_node.get("desc")),
                            "unit": unit,
                            "quantity": 0,
                            "rate": float(cost),
                            "total": 0,
                        })
            if not price_codes:
                raise ValueError(f"Empty section {section_node.get('id')}")
            code_prefixes = {".".join(code.split(".")[:2]) for code in price_codes}
            if len(code_prefixes) != 1:
                raise ValueError(f"Section spans multiple source code groups: {section_node.get('id')}")
            section_code = code_prefixes.pop()
            section_name = clean(section_node.get("desc"))
            section = {
                "id": f"e-nrm2-section-{section_node.get('id')}",
                "orderRef": section_code,
                "name": section_name,
                "items": [{
                    "id": f"e-nrm2-item-{section_node.get('id')}",
                    "type": "GENERAL_HEADING",
                    "reference": "",
                    "description": f"{section_code} {section_name}",
                    "unit": "",
                    "quantity": 0,
                    "rate": 0,
                    "total": 0,
                }, *rows],
            }
            folder["sections"].append(section)
        folder["orderRef"] = folder["sections"][0]["orderRef"].split(".")[0]

    expected_item_count = counts["12"] + counts["11"] + counts["10"] + counts["1"]
    actual_item_count = sum(len(section["items"]) for folder in folders for section in folder["sections"])
    if counts != Counter({"13": 34, "12": 221, "11": 297, "10": 2491, "1": 9902}):
        raise ValueError(f"Unexpected source counts: {counts}")
    if actual_item_count != expected_item_count or len(all_codes) != counts["1"]:
        raise ValueError("The output does not reconcile with the source items")
    bundled = {
        "id": LIBRARY_ID,
        "name": LIBRARY_NAME,
        "folders": folders,
        "governance": {
            "source": f"User-supplied {source.name}; CES library backup dated {library_node.get('backupDate')}",
            "rateDate": "2021-04-27",
            "indexBasis": "Original source costPrice1, unindexed; historical rates require review before use",
            "approvalStatus": "DRAFT",
        },
        "permissions": {
            "allowExportAll": True,
            "allowExportFolders": True,
            "allowExportSections": True,
            "allowLibraryEditing": True,
        },
    }
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(bundled, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    audit = {
        "source": source.name,
        "library": LIBRARY_NAME,
        "sourceCounts": dict(counts),
        "outputFolders": len(folders),
        "outputSections": sum(len(folder["sections"]) for folder in folders),
        "outputItems": actual_item_count,
        "outputPricedItems": counts["1"],
        "uniqueSourceCodes": len(all_codes),
        "sourceRateMin": str(rate_min),
        "sourceRateMax": str(rate_max),
        "notes": [
            "Source type 13 maps to folder; 12 to section and its H1; 11 to H2; 10 to comment; 1 to priced item.",
            "The resource-group CSV describes resource categories, not additional bill items; it is not merged into the bill hierarchy.",
            "The CES trace is diagnostic source metadata, not bill content.",
            "Original 2021 cost rates are retained without uplift; quantities and totals start at zero.",
        ],
    }
    audit_destination.write_text(json.dumps(audit, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"{LIBRARY_NAME}: {len(folders)} folders, {audit['outputSections']} sections, {actual_item_count} rows, {counts['1']} priced")


if __name__ == "__main__":
    main()
