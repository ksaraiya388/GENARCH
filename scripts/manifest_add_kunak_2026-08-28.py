"""Phase 1.3: record the 2026-08-28 Kunak raw exports in the source manifest.

Adds one entry per new raw export, one per superseded 2026-08-10 export, and
refreshes the derived-table entry so it stops describing the old cutoff as
current. Idempotent: re-running replaces the entries it owns rather than
appending duplicates.
"""

from __future__ import annotations

import csv
import hashlib
import json
import sys
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
MANIFEST = REPO / "pipeline" / "sources" / "manifest.json"
RAW = REPO / "pipeline" / "sources" / "deq-raw"
SUPERSEDED = RAW / "_superseded"

ORIGIN_URL = "https://kunakcloud.com/websites/VirginiaDEQ.html"
LICENSE = (
    "Fully redistributable with credit that the data belong to Virginia DEQ "
    "(per DEQ staff, 2026-08-10). Preferred attribution line pending from DEQ "
    "Communications."
)
ATTRIBUTION = "Virginia Department of Environmental Quality"
DOWNLOAD_DATE = "2026-08-28"
REPORT_DATE = "2026-08-28"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def probe(path: Path) -> dict:
    """Read header, Location label, and timestamp range from a Kunak export."""
    text = path.read_bytes().decode("utf-8-sig").splitlines()
    rows = [r for r in csv.reader(text[1:], delimiter=";") if r]
    header, data = rows[0], rows[1:]
    records = [dict(zip(header, r)) for r in data]
    stamps = [
        datetime.strptime(r["Date"], "%b %d, %Y, %H:%M:%S") for r in records
    ]
    locations = sorted({r["Location"] for r in records})
    return {
        "header": header,
        "locations": locations,
        "first": min(stamps),
        "last": max(stamps),
        "rows": len(data),
    }


def entry(path: Path, superseded_by: str | None = None) -> dict:
    info = probe(path)
    rel = path.relative_to(REPO).as_posix()
    site_id = path.name.split("_")[0]
    out = {
        "filename": rel,
        "origin_url": ORIGIN_URL,
        "download_date": "2026-08-10" if superseded_by else DOWNLOAD_DATE,
        "report_date": "2026-08-07" if superseded_by else REPORT_DATE,
        "license": LICENSE,
        "attribution": ATTRIBUTION,
        "format": "CSV, semicolon-delimited, UTF-8 with BOM, sep=; preamble on line 1",
        "sha256": sha256(path),
        "size_bytes": path.stat().st_size,
        "site_id": site_id,
        "kunak_location": ", ".join(info["locations"]),
        "coverage": (
            f"{info['first'].date().isoformat()} {info['first'].time().isoformat(timespec='minutes')} to "
            f"{info['last'].date().isoformat()} {info['last'].time().isoformat(timespec='minutes')} "
            f"local wall clock as exported, {info['rows']} rows before dedup"
        ),
        "description": (
            "Raw hourly Kunak Cloud export for one Data Center Air Monitoring "
            "Project sensor site. Timestamps are hour-ending and DST-adjusted "
            "as exported; reshape_deq normalises them to hour-beginning EST and "
            "never edits this file. Exports contain exact-duplicate row blocks "
            "from dashboard pagination, collapsed on read. Ingested by "
            "pipeline/reshape_deq.py, which globs deq-raw/ non-recursively."
        ),
        "expected_columns": info["header"],
    }
    if superseded_by:
        out["superseded_on"] = "2026-08-29"
        out["superseded_by"] = superseded_by
        out["superseded_reason"] = (
            "Replaced by a full re-pull covering 2026-03-03 to 2026-08-28 for "
            "the DEQ report of that date. Retained unmodified for provenance. "
            "reshape_deq.py globs deq-raw/ non-recursively (line 908, "
            "sorted(sensor_dir.glob('*.csv'))), so files under _superseded/ are "
            "not ingested and cannot double-count overlapping hours."
        )
    return out


def main() -> int:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    sources = manifest["sources"]

    owned = {"deq-raw/" in e.get("filename", "") for e in sources}
    sources[:] = [e for e in sources if "deq-raw/" not in e.get("filename", "")]

    new_files = sorted(RAW.glob("*.csv"))
    old_files = sorted(SUPERSEDED.glob("*.csv"))
    if len(new_files) != 6:
        raise SystemExit(f"expected 6 current exports, found {len(new_files)}")

    added = []
    for path in new_files:
        sources.append(entry(path))
        added.append(path.name)
    for path in old_files:
        successor = (
            f"pipeline/sources/deq-raw/"
            f"{path.name.replace('_2026-08-10.csv', '_2026-08-28.csv')}"
        )
        sources.append(entry(path, superseded_by=successor))
        added.append(f"{path.name} (superseded)")

    # Refresh the derived-table entry so it stops describing the old cutoff.
    for e in sources:
        if e.get("file") == "deq_data_center_air_monitoring_hourly.csv":
            e["download_date"] = DOWNLOAD_DATE
            e["raw_inputs"] = (
                "pipeline/sources/deq-raw/<site-slug>_multi_2026-03-03_2026-08-28.csv "
                "(6 files, semicolon-delimited with a sep=; preamble, "
                "reverse-chronological). The 2026-08-10 set it replaced is "
                "retained under deq-raw/_superseded/ and is not ingested."
            )
            e["coverage"] = (
                "2026-03-03 to 2026-08-28, six sites, 19748 site-hours, "
                "59244 rows"
            )

    MANIFEST.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"manifest entries now: {len(sources)}")
    for name in added:
        print(f"  + {name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
