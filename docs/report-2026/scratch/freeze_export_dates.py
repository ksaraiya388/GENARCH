"""AUDIT round 2, Task 2: refresh the Kunak export dates in FREEZE.json from manifest.json.

The freeze itself is not recomputed: the frozen copies, their hashes and
`frozen_at_utc` stay exactly as `freeze.py` wrote them on 2026-10-18. Only the
`export_date` / `export_date_source` pair on each `kunak_exports` entry is rewritten,
from the manifest entry for that entry's `source_path`, and only where it changed.

Run from the repo root:
    PYTHONUTF8=1 python docs/report-2026/scratch/freeze_export_dates.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
MANIFEST = REPO / "pipeline" / "sources" / "manifest.json"
FREEZE = REPO / "data" / "reports" / "2026" / "FREEZE.json"


def main() -> int:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    index = {s["filename"]: s for s in manifest["sources"] if "filename" in s}
    freeze = json.loads(FREEZE.read_text(encoding="utf-8"))

    changed = 0
    for entry in freeze["kunak_exports"]:
        source = index.get(entry["source_path"])
        if source is None:
            print(f"no manifest entry  {entry['source_path']}")
            continue
        new_date = source.get("export_date")
        new_src = source.get("export_date_source", "manifest.json")
        if (entry.get("export_date"), entry.get("export_date_source")) == (new_date, new_src):
            continue
        print(f"{entry['site_id']:20s} {entry.get('export_date')} -> {new_date}")
        entry["export_date"] = new_date
        entry["export_date_source"] = new_src
        changed += 1

    if not changed:
        print("no export dates changed")
        return 0
    with open(FREEZE, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps(freeze, indent=2, ensure_ascii=False) + "\n")
    print(f"updated {changed} kunak_exports entries in {FREEZE.relative_to(REPO).as_posix()}")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
    sys.exit(main())
