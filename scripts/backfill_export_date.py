"""Phase 3.1: carry export_date alongside the existing cutoff column.

A Kunak figure is a function of its export date as well as its data cutoff,
because the dashboard backfills previously-published hours. Files whose data
comes only from the FOIA regulatory release carry that provenance instead.
"""
from __future__ import annotations

import csv
from pathlib import Path

KUNAK = "2026-08-28"
FOIA = "n/a, FOIA 26-4646 regulatory release"

# filename -> (export_date value, column it is inserted after)
TARGETS = {
    "collocation_2026-08-28.csv": (
        f"sensor side {KUNAK}; regulatory side {FOIA}", "data_cutoff_regulatory"),
    "collocation_state_2026-08-28.csv": (
        f"sensor side {KUNAK}; regulatory side {FOIA}", "report_date"),
    "daily_reconciliation_2026-08-28.csv": (FOIA, "data_cutoff_published_dailyavg"),
    "deq_table4_2026-08-28.csv": (
        "n/a, transcribed from DEQ's published report", "report_date"),
    "p98_common_window_2026-08-28.csv": (KUNAK, "data_cutoff"),
    "zero_treatment_sensitivity_2026-08-28.csv": (KUNAK, "data_cutoff"),
}

OUT = Path("outputs/repro")


def main() -> None:
    for name, (value, after) in TARGETS.items():
        path = OUT / name
        raw = path.read_text(encoding="utf-8-sig")
        rows = list(csv.DictReader(raw.splitlines()))
        header = list(rows[0])
        if "export_date" in header:
            print(f"skip   {name}: already carries export_date")
            continue
        i = header.index(after) + 1
        header.insert(i, "export_date")
        for r in rows:
            r["export_date"] = value
        with path.open("w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=header)
            w.writeheader()
            w.writerows(rows)
        print(f"wrote  {name}: export_date after {after} ({len(rows)} rows)")


if __name__ == "__main__":
    main()
