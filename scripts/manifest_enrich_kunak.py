"""Phase 3.2: give every raw Kunak export entry explicit provenance fields.

The manifest already carries download_date and a prose ``coverage`` string.
This adds the fields the consolidation brief asks for as first-class keys:
export_date, the range requested from the dashboard, and the first and last
data timestamp actually returned. The distinction matters because the two can
disagree: the dashboard backfills, so a re-pull over the same requested range
can return different data.
"""
from __future__ import annotations

import csv
import json
import re
from datetime import datetime
from pathlib import Path

MANIFEST = Path("pipeline/sources/manifest.json")
TS_FORMAT = "%b %d, %Y, %H:%M:%S"


def data_span(path: Path) -> tuple[str, str, int]:
    """First and last data timestamp actually present, and the row count."""
    text = path.read_text(encoding="utf-8-sig")
    lines = text.splitlines()
    start = 1 if lines and lines[0].startswith("sep=") else 0
    rows = list(csv.DictReader(lines[start:], delimiter=";"))
    stamps = sorted(
        datetime.strptime(r["Date"].strip(), TS_FORMAT)
        for r in rows if r.get("Date", "").strip()
    )
    fmt = "%Y-%m-%d %H:%M"
    return stamps[0].strftime(fmt), stamps[-1].strftime(fmt), len(rows)


def main() -> None:
    m = json.loads(MANIFEST.read_text(encoding="utf-8"))
    touched = 0
    for e in m["sources"]:
        fn = e.get("filename", "")
        if "deq-raw/" not in fn or not fn.endswith(".csv"):
            continue
        path = Path(fn)
        if not path.exists():
            print(f"MISSING {fn}")
            continue
        req = re.search(r"_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})\.csv$", fn)
        first, last, nrows = data_span(path)

        # export_date is the dashboard download date. It is kept distinct from
        # report_date (which DEQ edition the pull was made for) and from the
        # requested range, because the dashboard revises hours between pulls.
        e["export_date"] = e["download_date"]
        e["requested_range_start"] = req.group(1) if req else ""
        e["requested_range_end"] = req.group(2) if req else ""
        e["data_first_timestamp_local"] = first
        e["data_last_timestamp_local"] = last
        e["rows_as_exported"] = nrows
        e["timestamp_convention"] = (
            "Hour-ending local clock time as exported, DST-adjusted by the "
            "dashboard. reshape_deq normalises to hour-beginning EST in ts_est."
        )
        touched += 1
        state = "superseded" if "_superseded/" in fn else "active"
        print(f"{state:11} {path.name:52} {first} -> {last}  {nrows:5d} rows")

    MANIFEST.write_text(
        json.dumps(m, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\nenriched {touched} raw-export entries")


if __name__ == "__main__":
    main()
