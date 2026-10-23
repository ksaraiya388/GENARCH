"""Task 4: copy the report-2026 inputs into pipeline/sources/freeze-2026/ and write FREEZE.json.

Reads manifest.json but never writes it. Uses pipeline.reshape_deq readers so the
data cutoff is computed exactly the way the pipeline parses the files.

Run from the repo root:  PYTHONUTF8=1 python docs/report-2026/scratch/freeze.py
"""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO))

import pandas as pd  # noqa: E402

from pipeline.reshape_deq import (  # noqa: E402
    REGULATORY_DAILY_FILE,
    REGULATORY_FILES,
    kunak_pollutant_columns,
    read_kunak_file,
    to_est,
)

SOURCES = REPO / "pipeline" / "sources"
RAW = SOURCES / "deq-raw"
SUPERSEDED = RAW / "_superseded"
REG = SOURCES / "deq-regulatory"
FREEZE = SOURCES / "freeze-2026"
FREEZE_AUG = FREEZE / "aug-2026"
OUT = REPO / "data" / "reports" / "2026" / "FREEZE.json"
ORIGINAL_ANALYSIS_DATE = "2026-08-12"


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def rel(p: Path) -> str:
    return p.relative_to(REPO).as_posix()


def manifest_index() -> dict[str, dict]:
    m = json.loads((SOURCES / "manifest.json").read_text(encoding="utf-8"))
    return {s["filename"]: s for s in m["sources"] if "filename" in s}


def kunak_cutoff(path: Path) -> dict:
    """Last hour with any non-empty pollutant value, and the last non-empty PM2.5 hour."""
    _, records = read_kunak_file(path)
    header = [k for k in records[0] if not k.startswith("_")]
    cols = kunak_pollutant_columns(header)
    pm_cols = [c for c, p in cols.items() if p == "PM2.5"]
    last_any = last_pm = None
    for r in records:
        if any((r.get(c) or "").strip() for c in cols):
            last_any = r["_ts_raw"]
        if any((r.get(c) or "").strip() for c in pm_cols):
            last_pm = r["_ts_raw"]
    fmt = lambda t: t.isoformat(sep=" ") if t else None  # noqa: E731
    return {
        "data_cutoff_local_hour_ending": fmt(last_any),
        "data_cutoff_est_hour_beginning": fmt(to_est(last_any)) if last_any else None,
        "pm25_cutoff_local_hour_ending": fmt(last_pm),
        "first_hour_local": fmt(records[0]["_ts_raw"]),
        "rows_deduplicated": len(records),
    }


def regulatory_cutoff(path: Path) -> dict:
    frame = pd.read_excel(path, sheet_name="Sheet1", engine="xlrd")
    date_col = "Date" if "Date" in frame.columns else frame.columns[0]
    valid = frame[frame["Value"].notna()]
    last = valid[date_col].max() if not valid.empty else None
    return {
        "data_cutoff_est_hour_beginning": str(last) if last is not None else None,
        "rows": int(len(frame)),
        "date_column": str(date_col),
    }


def copy(src: Path, dest_dir: Path) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / src.name
    shutil.copy2(src, dest)
    if sha256(dest) != sha256(src):
        raise SystemExit(f"copy mismatch: {src}")
    return dest


def latest_kunak() -> dict[str, Path]:
    """Latest export per site in deq-raw/ (non-recursive), by the filename end date."""
    best: dict[str, Path] = {}
    for p in sorted(RAW.glob("*.csv")):
        site = p.name.split("_")[0]
        end = p.stem.split("_")[-1]
        if site not in best or end > best[site].stem.split("_")[-1]:
            best[site] = p
    return best


def main() -> int:
    manifest = manifest_index()
    head = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=REPO, capture_output=True, text=True, check=True
    ).stdout.strip()
    frozen_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    kunak_entries = []
    for site, src in sorted(latest_kunak().items()):
        m = manifest.get(rel(src))
        dest = copy(src, FREEZE)
        entry = {
            "site_id": site,
            "source_path": rel(src),
            "frozen_path": rel(dest),
            "sha256": sha256(dest),
            "size_bytes": dest.stat().st_size,
            "export_date": m.get("export_date") if m else None,
            "export_date_source": "manifest.json" if m else (
                "NOT IN manifest.json; filename end date "
                f"{src.stem.split('_')[-1]} and file mtime "
                f"{datetime.fromtimestamp(src.stat().st_mtime).date().isoformat()} are the only evidence"
            ),
            **kunak_cutoff(dest),
        }
        identical = [
            rel(o) for o in RAW.glob(f"{site}_*.csv")
            if o != src and sha256(o) == entry["sha256"]
        ]
        if identical:
            entry["byte_identical_to"] = identical
        kunak_entries.append(entry)

    reg_entries = []
    for name in [f for f, _ in REGULATORY_FILES] + [REGULATORY_DAILY_FILE]:
        src = REG / name
        dest = copy(src, FREEZE)
        reg_entries.append({
            "source_path": rel(src),
            "frozen_path": rel(dest),
            "sha256": sha256(dest),
            "size_bytes": dest.stat().st_size,
            "foia_request": "26-4646",
            "export_date": "2026-08-11",
            "export_date_source": (
                "manifest.json deq_regulatory_monitor_hourly.csv download_date "
                "(FOIA release date); no per-file manifest entry"
            ),
            "role": "published daily average file (dailyAvg)" if name == REGULATORY_DAILY_FILE
            else "hourly regulatory series read by reshape_deq.py",
            **regulatory_cutoff(dest),
        })

    deq_reports = []
    weekly = sorted((SOURCES / "deq").glob("deq_dcamp_weekly_*.pdf"))
    newest = weekly[-1]
    report_files = [REPO / "docs" / "deq-reports" / "2026-08-07_data_center_air_quality_analysis.pdf"]
    report_files += [newest, newest.with_suffix(".txt"),
                     newest.with_name(newest.stem + "_tables.json")]
    for src in report_files:
        if not src.exists():
            continue
        dest = copy(src, FREEZE)
        m = manifest.get(rel(src)) or manifest.get(rel(src.with_suffix(".pdf")))
        deq_reports.append({
            "source_path": rel(src),
            "frozen_path": rel(dest),
            "sha256": sha256(dest),
            "size_bytes": dest.stat().st_size,
            "report_date": "2026-08-07" if "2026-08-07" in src.name else newest.stem.split("_")[-1],
            "manifest_sha256": m.get("sha256") if m and src.suffix == ".pdf" else None,
            "role": "DEQ weekly report cited by R1-R3 (Table 4 statement)" if "2026-08-07" in src.name
            else "newest DEQ weekly report present at freeze",
        })

    # Task 4d: Kunak exports current on 2026-08-12, from manifest export dates.
    original = []
    candidates = list(RAW.glob("*.csv")) + list(SUPERSEDED.glob("*.csv"))
    for src in sorted(candidates):
        m = manifest.get(rel(src))
        if not m or not m.get("export_date"):
            continue
        exported = m["export_date"]
        superseded_on = m.get("superseded_on")
        if exported <= ORIGINAL_ANALYSIS_DATE and (
            superseded_on is None or superseded_on > ORIGINAL_ANALYSIS_DATE
        ):
            dest = copy(src, FREEZE_AUG)
            digest = sha256(dest)
            original.append({
                "site_id": m.get("site_id"),
                "source_path": rel(src),
                "frozen_path": rel(dest),
                "sha256": digest,
                "manifest_sha256": m.get("sha256"),
                "sha256_matches_manifest": digest == m.get("sha256"),
                "export_date": exported,
                "superseded_on": superseded_on,
                "report_date": m.get("report_date"),
                **kunak_cutoff(dest),
            })

    freeze = {
        "description": (
            "Data freeze for GENARCH Annual Report 2026 v1.0. Every input the report's DEQ "
            "analysis reads, copied byte-for-byte to pipeline/sources/freeze-2026/ with its "
            "original filename. Kunak data cutoff is the last hour carrying any non-empty "
            "pollutant value (local clock, hour-ending as exported; EST hour-beginning also "
            "given). Regulatory cutoff is the last hour with a non-null Value."
        ),
        "frozen_at_utc": frozen_at,
        "git_head": head,
        "branch": "report-2026",
        "kunak_exports": kunak_entries,
        "regulatory_foia_26_4646": reg_entries,
        "deq_weekly_reports": deq_reports,
        "original_analysis_inputs": {
            "analysis_date": ORIGINAL_ANALYSIS_DATE,
            "selection_rule": (
                "manifest.json export_date <= 2026-08-12 and superseded_on null or after "
                "2026-08-12, searched across deq-raw/ and deq-raw/_superseded/"
            ),
            "files": original,
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps(freeze, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {rel(OUT)}: {len(kunak_entries)} kunak, {len(reg_entries)} regulatory, "
          f"{len(deq_reports)} report files, {len(original)} original-analysis inputs")
    return 0


if __name__ == "__main__":
    sys.exit(main())
