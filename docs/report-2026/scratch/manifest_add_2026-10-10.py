"""AUDIT round 2, Task 2: manifest entries for the twelve 2026-10-10 Kunak exports.

Adds one entry per `deq-raw/<site>_multi_2026-03-03_2026-10-10.csv` that has no
`manifest.json` entry, using the field set the existing Kunak entries carry.
`export_date` is the author timestamp of the commit that added the file
(`git log --diff-filter=A --format=%aI`), which bounds the real export date from
above: the dashboard download happened at or before the commit. No existing entry
is read back out and rewritten, and the file is rewritten only if something changed.

Run from the repo root:
    PYTHONUTF8=1 python docs/report-2026/scratch/manifest_add_2026-10-10.py
"""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO))

from pipeline.reshape_deq import read_kunak_file  # noqa: E402

MANIFEST = REPO / "pipeline" / "sources" / "manifest.json"
RAW = REPO / "pipeline" / "sources" / "deq-raw"
END = "2026-10-10"
REPORT_DATE = "2026-10-09"
EXPORT_DATE_SOURCE = "git add commit timestamp (upper bound)"

ORIGIN_URL = "https://kunakcloud.com/websites/VirginiaDEQ.html"
LICENSE = (
    "Fully redistributable with credit that the data belong to Virginia DEQ "
    "(per DEQ staff, 2026-08-10). Preferred attribution line pending from DEQ "
    "Communications."
)
ATTRIBUTION = "Virginia Department of Environmental Quality"
DESCRIPTION = (
    "Raw hourly Kunak Cloud export for one Data Center Air Monitoring Project sensor "
    "site. Timestamps are hour-ending and DST-adjusted as exported; reshape_deq "
    "normalises them to hour-beginning EST and never edits this file. Exports contain "
    "exact-duplicate row blocks from dashboard pagination, collapsed on read. Ingested "
    "by pipeline/reshape_deq.py, which globs deq-raw/ non-recursively. No dashboard "
    "download date was recorded for this export; export_date and download_date are both "
    "taken from the commit that added the file and are upper bounds."
)
TIMESTAMP_CONVENTION = (
    "Hour-ending local clock time as exported, DST-adjusted by the dashboard. "
    "reshape_deq normalises to hour-beginning EST in ts_est."
)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def rel(path: Path) -> str:
    return path.relative_to(REPO).as_posix()


def added_timestamp(path: Path) -> str:
    out = subprocess.run(
        ["git", "log", "--diff-filter=A", "--format=%aI", "--", rel(path)],
        cwd=REPO, capture_output=True, text=True, check=True,
    ).stdout.split()
    if not out:
        raise SystemExit(f"{rel(path)}: no adding commit found")
    return out[-1]


def file_format(path: Path) -> str:
    head = path.read_bytes()[:16]
    bom = "UTF-8 with BOM" if head.startswith(b"\xef\xbb\xbf") else "UTF-8 without BOM"
    sep = "sep=; preamble on line 1" if b"sep=" in head else "no sep= preamble"
    return f"CSV, semicolon-delimited, {bom}, {sep}"


def entry(path: Path) -> dict:
    site_id, records = read_kunak_file(path)
    raw_rows = sum(1 for line in path.read_text(encoding="utf-8-sig").splitlines()[2:] if line.strip())
    first, last = records[0]["_ts_raw"], records[-1]["_ts_raw"]
    header = [k for k in records[0] if not k.startswith("_")]
    stamp = added_timestamp(path)
    return {
        "filename": rel(path),
        "origin_url": ORIGIN_URL,
        "download_date": stamp[:10],
        "report_date": REPORT_DATE,
        "license": LICENSE,
        "attribution": ATTRIBUTION,
        "format": file_format(path),
        "sha256": sha256(path),
        "size_bytes": path.stat().st_size,
        "site_id": site_id,
        "kunak_location": records[0]["Location"],
        "coverage": (
            f"{first:%Y-%m-%d %H:%M} to {last:%Y-%m-%d %H:%M} local wall clock as "
            f"exported, {raw_rows} rows before dedup"
        ),
        "description": DESCRIPTION,
        "expected_columns": header,
        "export_date": stamp,
        "export_date_source": EXPORT_DATE_SOURCE,
        "requested_range_start": "2026-03-03",
        "requested_range_end": END,
        "data_first_timestamp_local": f"{first:%Y-%m-%d %H:%M}",
        "data_last_timestamp_local": f"{last:%Y-%m-%d %H:%M}",
        "rows_as_exported": raw_rows,
        "timestamp_convention": TIMESTAMP_CONVENTION,
    }


def main() -> int:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    known = {s["filename"] for s in manifest["sources"] if "filename" in s}
    targets = sorted(RAW.glob(f"*_{END}.csv"))
    if len(targets) != 12:
        raise SystemExit(f"expected 12 exports dated {END}, found {len(targets)}")
    added = []
    for path in targets:
        if rel(path) in known:
            print(f"skip  {rel(path)}: already in manifest.json")
            continue
        added.append(entry(path))
        print(f"add   {rel(path)}  export_date {added[-1]['export_date']}")
    if not added:
        print("nothing to add")
        return 0
    before = len(manifest["sources"])
    manifest["sources"].extend(added)
    with open(MANIFEST, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(f"manifest.json sources {before} -> {len(manifest['sources'])}")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
    sys.exit(main())
