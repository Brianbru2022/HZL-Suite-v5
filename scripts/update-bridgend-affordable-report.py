"""Revise the Bridgend pricing report's adopted affordable scenario to 80% OMV."""

from pathlib import Path
from docx import Document


SOURCE = Path(r"C:\Users\birob\AppData\Roaming\com.qspro.boq-generator\evidence\47221c54-5988-45cd-b357-cc0c71b2fffb\Bridgend_Kinross_Report.docx")
OUTPUT = Path(r"D:\apps\Work Apps\HZL\qs-suite-github-20260910\artifacts\Bridgend_Kinross_Report_80_percent_OMV.docx")


def set_text(paragraph, expected, replacement):
    if paragraph.text != expected:
        raise ValueError(f"Report changed: expected {expected!r}, got {paragraph.text!r}")
    if not paragraph.runs:
        paragraph.add_run(replacement)
        return
    paragraph.runs[0].text = replacement
    for run in paragraph.runs[1:]:
        run.text = ""


def replace(paragraph, old, new):
    if old not in paragraph.text:
        raise ValueError(f"Report changed: missing {old!r} in {paragraph.text!r}")
    set_text(paragraph, paragraph.text, paragraph.text.replace(old, new))


def set_cell(document, table, row, column, expected, replacement):
    cell = document.tables[table].cell(row, column)
    if len(cell.paragraphs) != 1:
        raise ValueError(f"Unexpected multi-paragraph cell {table}:{row}:{column}")
    set_text(cell.paragraphs[0], expected, replacement)


def main():
    doc = Document(SOURCE)
    paragraph_changes = {
        6: (
            "The £3,727,500 central affordable figure is a 70% OMV scenario, not an agreed transfer price. At 60% and 80%, the affordable value is £3,195,000 and £4,260,000 respectively.",
            "The adopted £4,260,000 affordable figure is 80% of OMV, as instructed for this appraisal, and is not an agreed transfer price. At 60% and 70%, the affordable value would be £3,195,000 and £3,727,500 respectively.",
        ),
        69: (
            "The central scenario is 70% of unrestricted OMV, the midpoint of the local historic 60% and 80% discounted-sale examples. It is a transparent appraisal placeholder.",
            "The adopted appraisal scenario is 80% of unrestricted OMV, as instructed. The historic local 60% and 80% discounted-sale examples are context; the 80% factor remains an appraisal assumption until the applicable tenure and purchaser terms are confirmed.",
        ),
        73: (
            "The 70% scenario gives unit values of £129,500 per flat, £175,000 per bungalow, £182,000 per D2-4, £203,000 per E3-5 and £241,500 per J5-8. The weighted scenario rate is £190/ft².",
            "The adopted 80% scenario gives unit values of £148,000 per flat, £200,000 per bungalow, £208,000 per D2-4, £232,000 per E3-5 and £276,000 per J5-8. The weighted scenario rate is £217/ft².",
        ),
        98: (
            "the central scenario is £190/ft². The scheme average after incentives is £281,576 per home, or £278/ft² over net dwelling GIFA. Private homes represent 72.4% of units and 85.3% of value before incentives; affordable homes represent 27.6% of units and 14.7% of that value.",
            "the adopted 80% OMV scenario is £217/ft². The scheme average after incentives is £287,697 per home, or £284/ft² over net dwelling GIFA. Private homes represent 72.4% of units and 83.6% of value before incentives; affordable homes represent 27.6% of units and 16.4% of that value.",
        ),
    }
    for index, (old, new) in paragraph_changes.items():
        replace(doc.paragraphs[index], old, new)

    cells = [
        (0, 4, 0, "Illustrative affordable value at 70%", "Adopted affordable value at 80%"),
        (0, 4, 1, "£3,727,500", "£4,260,000"),
        (0, 4, 2, "£3,727,500", "£4,260,000"),
        (0, 5, 1, "£1,597,500", "£1,065,000"),
        (0, 5, 2, "£1,597,500", "£1,065,000"),
        (0, 6, 1, "£25,362,500", "£25,895,000"),
        (0, 6, 2, "£28,467,500", "£29,000,000"),
        (0, 8, 1, "£24,497,100", "£25,029,600"),
        (0, 8, 2, "£27,477,900", "£28,010,400"),
        (7, 1, 2, "70%", "80%"), (7, 1, 3, "£129,500", "£148,000"),
        (7, 1, 4, "£185", "£211"), (7, 1, 5, "£1,942,500", "£2,220,000"), (7, 1, 6, "£832,500", "£555,000"),
        (7, 2, 2, "70%", "80%"), (7, 2, 3, "£175,000", "£200,000"),
        (7, 2, 4, "£236", "£269"), (7, 2, 5, "£350,000", "£400,000"), (7, 2, 6, "£150,000", "£100,000"),
        (7, 3, 2, "70%", "80%"), (7, 3, 3, "£182,000", "£208,000"),
        (7, 3, 4, "£192", "£220"), (7, 3, 5, "£546,000", "£624,000"), (7, 3, 6, "£234,000", "£156,000"),
        (7, 4, 2, "70%", "80%"), (7, 4, 3, "£203,000", "£232,000"),
        (7, 4, 4, "£203", "£232"), (7, 4, 5, "£406,000", "£464,000"), (7, 4, 6, "£174,000", "£116,000"),
        (7, 5, 2, "70%", "80%"), (7, 5, 3, "£241,500", "£276,000"),
        (7, 5, 4, "£173", "£197"), (7, 5, 5, "£483,000", "£552,000"), (7, 5, 6, "£207,000", "£138,000"),
        (7, 6, 2, "70%", "80%"), (7, 6, 5, "£3,727,500", "£4,260,000"), (7, 6, 6, "£1,597,500", "£1,065,000"),
        (8, 3, 0, "Central illustrative scenario", "Adopted 80% OMV value"),
        (8, 3, 1, "£3,727,500", "£4,260,000"),
        (8, 4, 0, "Weighted central value", "Weighted adopted value"),
        (8, 4, 1, "£190/ft²", "£217/ft²"),
        (8, 5, 1, "£1,597,500 / 30.0%", "£1,065,000 / 20.0%"),
        (9, 2, 0, "Central", "Alternative"),
        (9, 3, 0, "Upper", "Adopted"),
        (11, 4, 1, "3.4%", "3.3%"),
        (11, 4, 2, "3.5%", "3.4%"),
        (13, 2, 3, "£-1,597,500", "£-1,065,000"),
        (13, 2, 4, "£3,727,500", "£4,260,000"),
        (13, 4, 3, "£-1,597,500", "£-1,065,000"),
        (13, 4, 4, "£25,362,500", "£25,895,000"),
        (13, 6, 4, "£24,497,100", "£25,029,600"),
    ]
    for args in cells:
        set_cell(doc, *args)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUTPUT)
    check = Document(OUTPUT)
    all_text = "\n".join([p.text for p in check.paragraphs] + [c.text for t in check.tables for r in t.rows for c in r.cells])
    for stale in ["central scenario is 70%", "Illustrative affordable value at 70%", "£1,597,500"]:
        if stale in all_text:
            raise AssertionError(f"Stale report text: {stale}")
    assert "£4,260,000" in all_text and "£25,029,600" in all_text
    print(OUTPUT)


if __name__ == "__main__":
    main()
