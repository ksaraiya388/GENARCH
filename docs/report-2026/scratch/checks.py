"""Task 5 a, b, e: p98 recomputation and daily-average share, from frozen inputs only.

Rows are built with pipeline.reshape_deq (read_kunak_file, site history, occupancy,
transit exception, build_sensor_rows), so validity flags are exactly the pipeline's.
Only two things vary here, and only in this script:
  * day binning: ts_est (local standard time, hour-beginning) or ts_raw - 1 h
    (local clock time, hour-beginning);
  * zero handling: exact_zero_floor rows excluded (pipeline default) or retained.
No pipeline code is modified.

Run from the repo root:  PYTHONUTF8=1 python docs/report-2026/scratch/checks.py
Writes docs/report-2026/scratch/checks_output.json.
"""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from datetime import date, datetime, timedelta
from decimal import Decimal
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO))

import numpy as np  # noqa: E402

from pipeline.reshape_deq import (  # noqa: E402
    DAILY_MIN_VALID_HOURS,
    SITE_HISTORY,
    build_sensor_rows,
    find_transit_sites,
    load_site_history,
    occupancy_by_site,
    read_kunak_file,
    truncate_1dp,
)

FREEZE = REPO / "pipeline" / "sources" / "freeze-2026"
AUG = FREEZE / "aug-2026"
OUT = Path(__file__).with_name("checks_output.json")

COMMON_START, COMMON_END = date(2026, 6, 18), date(2026, 8, 7)
# DEQ builds each weekly edition from data through 07:00 EST that Friday (DEQ staff,
# 2026-08-16). The 2026-08-07 partial day can never reach 18 valid hours, so the
# hour cutoff and a date cutoff of 2026-08-06 give the same set of complete days.
AUG7_CUTOFF_EST = datetime(2026, 8, 7, 7, 0)

CONTEXT_R3 = {
    "farmwell-middle": 45.40, "belfort-park": 40.19, "golf-course": 40.12,
    "sterling-ms": 38.21, "ashburn-collocated": 37.10, "dulles-area": 29.50,
}
# DEQ "Data Center Air Quality Analysis", 2026-08-07, Table 4, percentile_98 column,
# transcribed from pipeline/sources/freeze-2026/2026-08-07_data_center_air_quality_analysis.pdf
DEQ_AUG7_TABLE4_P98 = {
    "golf-course": 23.8, "belfort-park": 31.4, "ashburn-collocated": 25.5,
    "dulles-area": 18.4, "farmwell-middle": 26.0, "heritage-farm": 9.7,
    "newberry-condo": 14.5, "sterling-ms": 40.4, "steuart-weller": 10.2,
}
DEQ_AUG7_TABLE4_MEAN = {
    "golf-course": 7.4, "belfort-park": 9.3, "ashburn-collocated": 8.1,
    "dulles-area": 5.6, "farmwell-middle": 7.9, "heritage-farm": 4.2,
    "newberry-condo": 5.7, "sterling-ms": 11.3, "steuart-weller": 4.6,
}
COMBOS = {
    "i_standard_zeros_missing": ("standard", False),
    "ii_standard_zeros_retained": ("standard", True),
    "iii_clock_zeros_missing": ("clock", False),
    "iv_clock_zeros_retained": ("clock", True),
}


def build_rows(files: list[Path]) -> list[dict]:
    """Sensor rows for a set of exports, exactly as reshape_deq.main builds them."""
    history = load_site_history(SITE_HISTORY)
    by_site = occupancy_by_site(history)
    parsed = {}
    for path in files:
        site_id, records = read_kunak_file(path)
        parsed[site_id] = records
    observed = {s: [r["_ts_raw"] for r in recs] for s, recs in parsed.items()}
    transit, _ = find_transit_sites(history, observed, by_site)
    rows: list[dict] = []
    for site_id, records in parsed.items():
        site_rows, violations = build_sensor_rows(site_id, records, by_site[site_id], transit)
        hard = [v for v in violations if v["disposition"] == "hard_failure"]
        if hard:
            raise SystemExit(f"{site_id}: {len(hard)} occupancy hard failures")
        rows.extend(site_rows)
    return rows


def daily(rows: list[dict], binning: str, retain_zeros: bool,
          cutoff_est: datetime | None = None,
          min_hours: int = DAILY_MIN_VALID_HOURS) -> dict[str, dict[date, dict]]:
    """Complete-day PM2.5 means per site under one binning/zero combination."""
    buckets: dict[tuple[str, date], list[Decimal]] = defaultdict(list)
    for r in rows:
        if r["pollutant"] != "PM2.5":
            continue
        if cutoff_est is not None and r["ts_est"] > cutoff_est:
            continue
        if r["excluded"] and not (retain_zeros and r["exclusion_reason"] == "exact_zero_floor"):
            continue
        ts = r["ts_est"] if binning == "standard" else r["ts_raw"] - timedelta(hours=1)
        buckets[(r["site_id"], ts.date())].append(Decimal(str(r["value"])))
    out: dict[str, dict[date, dict]] = defaultdict(dict)
    for (site, day), vals in buckets.items():
        if len(vals) >= min_hours:
            out[site][day] = {
                "mean": float(sum(vals, Decimal(0)) / len(vals)),
                "trunc": float(truncate_1dp(vals)),
            }
    return out


def p98(values: list[float]) -> float | None:
    return float(np.percentile(values, 98, method="linear")) if values else None


def r2(x: float | None) -> float | None:
    return None if x is None else round(x, 3)


def task_a(rows_by_input: dict[str, list[dict]]) -> dict:
    out = {}
    for label, rows in rows_by_input.items():
        d = daily(rows, "standard", False)
        res = {}
        for site in CONTEXT_R3:
            days = sorted(k for k in d.get(site, {}) if COMMON_START <= k <= COMMON_END)
            res[site] = {
                "valid_days": len(days),
                "p98": r2(p98([d[site][k]["mean"] for k in days])),
                "p98_truncated_daily": r2(p98([d[site][k]["trunc"] for k in days])),
                "context_r3": CONTEXT_R3[site],
            }
            res[site]["diff_vs_context"] = r2(res[site]["p98"] - CONTEXT_R3[site])
        ranked = sorted(res, key=lambda s: -res[s]["p98"])
        for i, s in enumerate(ranked, 1):
            res[s]["rank"] = i
        res["_above_35"] = sum(1 for s in CONTEXT_R3 if res[s]["p98"] > 35)
        out[label] = res
    return out


def task_b(rows_by_input: dict[str, list[dict]]) -> dict:
    out = {}
    # Two day sets: DEQ's stated edition cutoff (07:00 EST on 2026-08-07, so the last
    # complete day is 2026-08-06), and whole days through 2026-08-07 as the site's
    # RECORD_END uses, which needs hours after that cutoff.
    day_sets = {
        "cutoff_0700_est": (AUG7_CUTOFF_EST, date(2026, 8, 6)),
        "days_through_2026-08-07": (None, date(2026, 8, 7)),
    }
    for label, rows in rows_by_input.items():
        res = {}
        for (combo, (binning, zeros)), (ds, (cutoff, last)) in (
            (c, s) for s in day_sets.items() for c in COMBOS.items()
        ):
            d = daily(rows, binning, zeros, cutoff_est=cutoff)
            per = {}
            for site, deq in DEQ_AUG7_TABLE4_P98.items():
                if site not in d:
                    continue
                days = sorted(k for k in d[site] if k <= last)
                vals = [d[site][k]["mean"] for k in days]
                v = p98(vals)
                per[site] = {
                    "n": len(days),
                    "first_day": days[0].isoformat(),
                    "last_day": days[-1].isoformat(),
                    "p98": r2(v),
                    "deq_p98": deq,
                    "diff": r2(v - deq),
                    "mean": r2(float(np.mean(vals))),
                    "deq_mean": DEQ_AUG7_TABLE4_MEAN[site],
                    "p98_truncated_daily": r2(p98([d[site][k]["trunc"] for k in days])),
                }
            per["_matches_within_0.05"] = sum(1 for v in per.values() if abs(v["diff"]) < 0.05)
            res[f"{ds}|{combo}"] = per
        out[label] = res
    return out


def task_b_sterling(rows: list[dict]) -> dict:
    """Sterling MS residual: which day set / cutoff variants were tried."""
    site, out = "sterling-ms", {}
    for combo, (binning, zeros) in COMBOS.items():
        for label, cutoff, last in (
            ("cutoff_2026-08-07_0700_est", AUG7_CUTOFF_EST, date(2026, 8, 7)),
            ("no_cutoff_days_to_2026-08-07", None, date(2026, 8, 7)),
            ("no_cutoff_days_to_2026-08-06", None, date(2026, 8, 6)),
        ):
            d = daily(rows, binning, zeros, cutoff_est=cutoff).get(site, {})
            days = sorted(k for k in d if k <= last)
            out[f"{combo}|{label}"] = {
                "n": len(days),
                "p98": r2(p98([d[k]["mean"] for k in days])),
                "p98_truncated_daily": r2(p98([d[k]["trunc"] for k in days])),
                "top3_daily_means": [r2(v) for v in sorted((d[k]["mean"] for k in days), reverse=True)[:3]],
                "deq_p98": DEQ_AUG7_TABLE4_P98[site],
            }
    return out


def task_b_no_completeness(rows: list[dict]) -> dict:
    """Extra variant, not one of the four requested: no completeness threshold.

    DEQ states its published regulatory daily file applies none (GENARCH_RULES section 3).
    Tested here for the sensor Table 4 because the Sterling MS value reproduces only when
    a 51st (partial) day is present.
    """
    out = {}
    for combo, (binning, zeros) in COMBOS.items():
        d = daily(rows, binning, zeros, cutoff_est=AUG7_CUTOFF_EST, min_hours=1)
        per = {}
        for site, deq in DEQ_AUG7_TABLE4_P98.items():
            if site not in d:
                continue
            days = sorted(d[site])
            vals = [d[site][k]["mean"] for k in days]
            v = p98(vals)
            per[site] = {"n": len(days), "p98": r2(v), "deq_p98": deq, "diff": r2(v - deq),
                         "mean": r2(float(np.mean(vals))), "deq_mean": DEQ_AUG7_TABLE4_MEAN[site]}
        out[combo] = per
    return out


def task_e(rows: list[dict], loudoun_sites: set[str]) -> dict:
    d = daily(rows, "standard", False)
    per, tot, below, tot_l, below_l = {}, 0, 0, 0, 0
    for site in sorted(d):
        vals = [v["mean"] for v in d[site].values()]
        b = sum(1 for v in vals if v < 35)
        per[site] = {"complete_days": len(vals), "below_35": b, "at_or_above_35": len(vals) - b,
                     "first_day": min(d[site]).isoformat(), "last_day": max(d[site]).isoformat()}
        tot += len(vals)
        below += b
        if site in loudoun_sites:
            tot_l += len(vals)
            below_l += b
    return {
        "method": "EST binning, exact zeros excluded (pipeline default), 18-of-24, untruncated mean, strict < 35",
        "all_sites": {"site_days": tot, "below_35": below, "share": round(below / tot, 4)},
        "loudoun_sites_only": {"site_days": tot_l, "below_35": below_l,
                               "share": round(below_l / tot_l, 4)},
        "per_site": per,
    }


def main() -> int:
    aug_files = sorted(AUG.glob("*.csv"))
    frozen_files = sorted(FREEZE.glob("*.csv"))
    aug_rows = build_rows(aug_files)
    frozen_rows = build_rows(frozen_files)
    inputs = {"aug-2026 exports (2026-08-10)": aug_rows, "freeze exports (2026-10-10)": frozen_rows}
    pw = {"camp-snyder", "evergreen-cc", "vdot-mkc"}
    result = {
        "inputs": {
            "aug-2026 exports (2026-08-10)": [p.name for p in aug_files],
            "freeze exports (2026-10-10)": [p.name for p in frozen_files],
        },
        "task_a_common_window": task_a(inputs),
        "task_b_full_record_aug7": task_b(inputs),
        "task_b_sterling_sensitivity_aug_inputs": task_b_sterling(aug_rows),
        "task_b_extra_no_completeness_threshold": {
            label: task_b_no_completeness(rows) for label, rows in inputs.items()
        },
        "task_e_share_below_35": task_e(
            frozen_rows, {p.name.split("_")[0] for p in frozen_files} - pw
        ),
    }
    with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {OUT.relative_to(REPO).as_posix()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
