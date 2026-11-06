"""Extract the two embedded SMM datasets without running the legacy Tk app.

The input path is supplied explicitly; the committed JSON is bundled by Vite.
"""

import ast
import base64
import gzip
import json
import pathlib
import sys


def main() -> None:
    source = pathlib.Path(sys.argv[1])
    destination = pathlib.Path(sys.argv[2])
    tree = ast.parse(source.read_text(encoding="utf-8"))
    constants = {
        node.targets[0].id: ast.literal_eval(node.value)
        for node in tree.body
        if isinstance(node, ast.Assign)
        and len(node.targets) == 1
        and isinstance(node.targets[0], ast.Name)
        and node.targets[0].id in {"LIBRARY_DATA", "EMBEDDED_PRICING_LIBRARY_DATA"}
    }

    def decode(name: str):
        return json.loads(gzip.decompress(base64.b64decode(constants[name])))

    short_items = decode("LIBRARY_DATA")
    priced_items = [
        row for row in decode("EMBEDDED_PRICING_LIBRARY_DATA")
        if row.get("library") == "Franklin and Andrews SMM Rates Apr 2022"
    ]
    assert len(short_items) == 201 and len(priced_items) == 9902
    assert len({row[0] for row in short_items}) == len(short_items)
    assert len({row["code"] for row in priced_items}) == len(priced_items)
    def bill_item(item_id: str, kind: str, description: str, unit: str = "", rate: float = 0, reference: str = ""):
        return {
            "id": item_id, "type": kind, "reference": reference,
            "description": description, "unit": unit, "quantity": 1 if kind == "PRICED" else 0,
            "rate": rate, "total": rate if kind == "PRICED" else 0,
        }

    def new_folder(folder_id: str, title: str, order_ref: str = ""):
        folder = {"id": folder_id, "name": title, "sections": []}
        if order_ref:
            folder["orderRef"] = order_ref
        return folder

    work_folders = {}
    work_sections = {}
    for code, category, section_name, heading, description, unit in short_items:
        folder = work_folders.get(category)
        if folder is None:
            folder_index = len(work_folders)
            prefix, _, title = category.partition(" ")
            folder = new_folder(f"ah-work-folder-{folder_index}", title or category, prefix)
            work_folders[category] = folder
        key = (category, section_name)
        entry = work_sections.get(key)
        if entry is None:
            section_index = len(work_sections)
            section = {"id": f"ah-work-section-{section_index}", "name": section_name, "items": []}
            folder["sections"].append(section)
            items = section["items"]
            items.append(bill_item(f"ah-work-root-{section_index}", "GENERAL_HEADING", category))
            same_title = section_name.casefold() == category.casefold()
            if not same_title:
                items.append(bill_item(f"ah-work-section-heading-{section_index}", "MAJOR_HEADING", section_name))
            entry = {"section": section, "last_heading": None, "group_type": "MAJOR_HEADING" if same_title else "SUB_SECTION"}
            work_sections[key] = entry
        if heading != entry["last_heading"]:
            entry["section"]["items"].append(bill_item(f"ah-work-group-{code}", entry["group_type"], heading))
            entry["last_heading"] = heading
        entry["section"]["items"].append(bill_item(f"ah-work-{code}", "PRICED", description, unit, 0, code))

    smm_folders = {}
    smm_sections = {}
    for row in priced_items:
        category, section_name, group_name, detail_name = [node[1] for node in row["path"]]
        folder = smm_folders.get(category)
        if folder is None:
            folder = new_folder(f"ah-smm-folder-{len(smm_folders)}", category)
            smm_folders[category] = folder
        key = (category, section_name)
        entry = smm_sections.get(key)
        if entry is None:
            section_index = len(smm_sections)
            section = {"id": f"ah-smm-section-{section_index}", "name": section_name, "items": []}
            folder["sections"].append(section)
            section["items"].append(bill_item(f"ah-smm-root-{section_index}", "GENERAL_HEADING", category))
            same_title = section_name.casefold() == category.casefold()
            if not same_title:
                section["items"].append(bill_item(f"ah-smm-section-heading-{section_index}", "MAJOR_HEADING", section_name))
            entry = {"section": section, "last_group": None, "last_detail": None, "group_type": "MAJOR_HEADING" if same_title else "SUB_SECTION", "detail_type": "SUB_SECTION" if same_title else "MINOR_HEADING"}
            smm_sections[key] = entry
        items = entry["section"]["items"]
        if group_name != entry["last_group"]:
            items.append(bill_item(f"ah-smm-group-{entry['section']['id']}-{len(items)}", entry["group_type"], group_name))
            entry["last_group"] = group_name
            entry["last_detail"] = None
        if detail_name != entry["last_detail"]:
            items.append(bill_item(f"ah-smm-detail-{entry['section']['id']}-{len(items)}", entry["detail_type"], detail_name))
            entry["last_detail"] = detail_name
        items.append(bill_item(f"ah-smm-{row['code']}", "PRICED", row["description"], row["unit"], row["rate"], row["code"]))

    payload = [
        {
            "id": "builtin-smm7-work-ah-edition", "name": "SMM7 Work Items [AH Edition]",
            "folders": list(work_folders.values()),
            "governance": {
                "owner": "Allanwater / HZL", "source": "Allanwater_Estimating_v8.22.py LIBRARY_DATA",
                "indexBasis": "Unpriced SMM7 work items from the legacy application",
                "approvalStatus": "DRAFT",
            },
        },
        {
            "id": "builtin-franklin-andrews-smm-ah-edition", "name": "Franklin and Andrews SMM Rates Apr 2022 [AH Edition]",
            "folders": list(smm_folders.values()),
            "governance": {
                "owner": "Allanwater / HZL", "source": "Allanwater_Estimating_v8.22.py EMBEDDED_PRICING_LIBRARY_DATA: Franklin and Andrews SMM Rates Apr 2022",
                "rateDate": "2022-04", "indexBasis": "Historical source rates; no automatic index uplift applied",
                "approvalStatus": "DRAFT",
            },
        },
    ]
    destination.parent.mkdir(parents=True, exist_ok=True)
    # New IDs allow both rebuilt catalogs to coexist with the previous bundled
    # catalog until migration has succeeded.
    def rekey(value):
        if isinstance(value, dict):
            return {key: rekey(item) if key != "id" else item.replace("ah-work-", "ah2-work-").replace("ah-smm-", "ah2-smm-") for key, item in value.items()}
        if isinstance(value, list):
            return [rekey(item) for item in value]
        return value

    payload = rekey(payload)
    destination.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(short_items)} work items and {len(priced_items)} priced SMM items to {destination}")


if __name__ == "__main__":
    main()
