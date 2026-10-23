"""AUDIT round 2, Task 1a-1d. Measures only; writes nothing but its own JSON.

Rows are built with pipeline.reshape_deq (read_kunak_file, site history, occupancy,
transit exception, build_sensor_rows, read_regulatory_file, read_published_daily), so
validity flags are exactly the pipeline's. Nothing in pipeline/ is modified.

Three things vary here and only here:
  * day binning: ts_est (local standard time, hour-beginning) or ts_raw - 1 h
    (local clock time, hour-beginning);
  * zero handling: exact_zero_floor rows excluded (pipeline default) or retained;
  * collocation period selection: by unit_id (what site/src/lib/deq-data.ts does and
    what GENARCH_RULES.md section 9 reports) or strictly by date on ts_est
    (docs/COLLOCATION_METHOD.md and CONTEXT.md section 4 R1).

Run from the repo root:  PYTHONUTF8=1 python docs/report-2026/scratch/round2.py
Writes docs/report-2026/scratch/round2_output.json.
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
    REGULATORY_DAILY_FILE,
    REGULATORY_FILES,
    SITE_HISTORY,
    build_sensor_rows,
    find_transit_sites,
    load_site_history,
    occupancy_by_site,
    read_kunak_file,
    read_published_daily,
    read_regulatory_file,
    truncate_1dp,
)

FREEZE = REPO / "pipeline" / "sources" / "freeze-2026"
AUG = FREEZE / "aug-2026"
OUT = Path(__file__).with_name("round2_output.json")

COMMON_START, COMMON_END = date(2026, 6, 18), date(2026, 8, 7)
# DEQ builds each weekly edition from data through 07:00 EST that Friday
# (DEQ staff, 2026-08-16).
AUG7_CUTOFF_EST = datetime(2026, 8, 7, 7, 0)
APEX_SPLIT = datetime(2026, 4, 8)
# site/src/lib/deq-data.ts DEQ_EDITION_CUTOFF
COLLOCATION_CUTOFF = datetime(2026, 8, 7, 7, 0)

SIX = ["farmwell-middle", "belfort-park", "golf-course", "sterling-ms",
       "ashburn-collocated", "dulles-area"]
DEQ_TABLE4_SENSOR = "sterling-ms"

# DEQ "Data Center Air Quality Analysis", 2026-08-07, Table 4, percentile_98.
DEQ_AUG7_P98 = {
    "golf-course": 23.8, "belfort-park": 31.4, "ashburn-collocated": 25.5,
    "dulles-area": 18.4, "farmwell-middle": 26.0, "heritage-farm": 9.7,
    "newberry-condo": 14.5, "sterling-ms": 40.4, "steuart-weller": 10.2,
}
DEQ_AUG7_MEAN = {
    "golf-course": 7.4, "belfort-park": 9.3, "ashburn-collocated": 8.1,
    "dulles-area": 5.6, "farmwell-middle": 7.9, "heritage-farm": 4.2,
    "newberry-condo": 5.7, "sterling-ms": 11.3, "steuart-weller": 4.6,
}
DEQ_AUG7_MEDIAN = {
    "golf-course": 5.0, "belfort-park": 6.6, "ashburn-collocated": 6.2,
    "dulles-area": 3.6, "farmwell-middle": 5.2, "heritage-farm": 3.5,
    "newberry-condo": 4.9, "sterling-ms": 8.6, "steuart-weller": 3.9,
}
# GENARCH_RULES.md section 9, the published-precision collocation table.
RULES_S9 = {
    "PM2.5|apex-14": {"deq": "y = 1.3 + 0.83x, R2 = 0.73",
                      "recomputed": {"intercept": 1.299, "slope": 0.831, "r2": 0.725, "n": 697}},
    "PM2.5|apex-05": {"deq": "y = -4.7 + 1.7x, R2 = 0.84",
                      "recomputed": {"intercept": -4.678, "slope": 1.665, "r2": 0.837, "n": 2111}},
    "NO2|apex-14": {"deq": "y = 2.2 + 1.1x, R2 = 0.49",
                    "recomputed": {"intercept": 2.186, "slope": 1.075, "r2": 0.497, "n": 589}},
    "NO2|apex-05": {"deq": "y = 1.8 + 0.32x, R2 = 0.21 (corrected 2026-08-19)",
                    "recomputed": {"intercept": 1.835, "slope": 0.319, "r2": 0.207, "n": 2745}},
}
RETAIN_ZEROS = {"NO2|apex-05"}
RETIRED_EARLY = ["heritage-farm", "newberry-condo", "steuart-weller"]
OFFLINE_2026_09_17 = ["farmwell-middle", "golf-course", "sterling-ms"]


def r3(x):
    return None if x is None else round(float(x), 3)


# ---------------------------------------------------------------- sensor rows


def build_rows(files: list[Path]) -> list[dict]:
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


def daily(rows, binning, retain_zeros, cutoff_est=None, min_hours=DAILY_MIN_VALID_HOURS):
    """Complete-day PM2.5 means per site under one binning / zero combination."""
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
    out: dict[str, dict[date, float]] = defaultdict(dict)
    for (site, day), vals in buckets.items():
        if len(vals) >= min_hours:
            out[site][day] = float(sum(vals, Decimal(0)) / len(vals))
    return out


def p98(values):
    return float(np.percentile(values, 98, method="linear")) if values else None


# ---------------------------------------------------------------------- 1a


def task_1a(rows_by_input):
    """Common-window p98 under the combination that best matched DEQ in check b:
    local clock time days, exact zeros treated as missing."""
    runs = {
        "whole_days_through_2026-08-07": (None, COMMON_END),
        "deq_cutoff_2026-08-07_0700_est": (AUG7_CUTOFF_EST, COMMON_END),
    }
    out = {}
    for label, rows in rows_by_input.items():
        per_run = {}
        for run, (cutoff, last) in runs.items():
            d = daily(rows, "clock", False, cutoff_est=cutoff)
            res = {}
            for site in SIX:
                days = sorted(k for k in d.get(site, {}) if COMMON_START <= k <= last)
                res[site] = {
                    "valid_days": len(days),
                    "first_day": days[0].isoformat() if days else None,
                    "last_day": days[-1].isoformat() if days else None,
                    "p98": r3(p98([d[site][k] for k in days])),
                }
            ranked = sorted(SIX, key=lambda s: -res[s]["p98"])
            for i, s in enumerate(ranked, 1):
                res[s]["rank"] = i
            per_run[run] = {
                "per_site": res,
                "count_above_35": sum(1 for s in SIX if res[s]["p98"] > 35),
                "deq_table4_sensor": DEQ_TABLE4_SENSOR,
                "deq_table4_sensor_rank": res[DEQ_TABLE4_SENSOR]["rank"],
                "deq_table4_sensor_p98": res[DEQ_TABLE4_SENSOR]["p98"],
                "ranking_high_to_low": ranked,
            }
        out[label] = per_run
    return out


# ---------------------------------------------------------------------- 1b


def ols(xs, ys):
    x, y = np.asarray(xs, float), np.asarray(ys, float)
    slope, intercept = np.polyfit(x, y, 1)
    pred = intercept + slope * x
    r2 = 1 - ((y - pred) ** 2).sum() / ((y - y.mean()) ** 2).sum()
    return {"n": len(x), "intercept": r3(intercept), "slope": r3(slope), "r2": r3(r2)}


def regulatory_index(pollutant, reg_rows):
    return {
        r["ts_est"]: float(r["value"])
        for r in reg_rows
        if r["site_id"] == "ashburn" and r["pollutant"] == pollutant
        and not r["excluded"] and r["value"] != ""
    }


def collocation(sensor_rows, reg_rows, selection):
    """Four regressions at the collocated site, OLS with the sensor on x.

    `selection` is "unit_id" (period from the occupancy table, as deq-data.ts does)
    or "date" (period from ts_est against the 2026-04-08 boundary).
    """
    out = {}
    for pollutant in ("PM2.5", "NO2"):
        reg = regulatory_index(pollutant, reg_rows)
        for unit in ("apex-14", "apex-05"):
            key_name = f"{pollutant}|{unit}"
            retain = key_name in RETAIN_ZEROS
            xs, ys, used = [], [], []
            for r in sensor_rows:
                if r["site_id"] != "ashburn-collocated" or r["pollutant"] != pollutant:
                    continue
                if r["value"] == "" or r["ts_est"] > COLLOCATION_CUTOFF:
                    continue
                if r["excluded"] and not (retain and r["exclusion_reason"] == "exact_zero_floor"):
                    continue
                if selection == "unit_id":
                    if r["unit_id"] != unit:
                        continue
                else:
                    before = r["ts_est"] < APEX_SPLIT
                    if (unit == "apex-14") != before:
                        continue
                if r["ts_est"] not in reg:
                    continue
                xs.append(float(r["value"]))
                ys.append(reg[r["ts_est"]])
                used.append(r["ts_est"])
            fit = ols(xs, ys)
            fit["retains_exact_zeros"] = retain
            fit["first_pair_ts_est"] = min(used).isoformat(sep=" ") if used else None
            fit["last_pair_ts_est"] = max(used).isoformat(sep=" ") if used else None
            out[key_name] = fit
    return out


def reconciliation(reg_rows, published):
    """Daily reconciliation of the regulatory monitor against DEQ's published dailyAvg.

    Two comparable-set definitions:
      strict_18_of_24 -- days clearing 18 of 24 valid hours that are also valid in
        the published file (pipeline reconcile(), the "118 of 119" form);
      all_published_days -- every valid published day with at least one valid
        recomputed hour, no completeness filter (the "126 of 131" form).
    """
    buckets: dict[date, list[Decimal]] = defaultdict(list)
    for r in reg_rows:
        if r["site_id"] != "ashburn" or r["pollutant"] != "PM2.5" or r["excluded"]:
            continue
        buckets[r["ts_est"].date()].append(Decimal(str(r["value"])))
    recomputed = {d: {"hours": len(v), "trunc": truncate_1dp(v)} for d, v in buckets.items()}

    out = {}
    for label, min_hours in (("strict_18_of_24", DAILY_MIN_VALID_HOURS),
                             ("all_published_days", 1)):
        days = sorted(d for d in published if d in recomputed
                      and recomputed[d]["hours"] >= min_hours)
        matches, mismatches, deltas = 0, [], []
        for d in days:
            rec, pub = recomputed[d]["trunc"], published[d]
            delta = float(rec - pub)
            deltas.append(abs(delta))
            if rec == pub:
                matches += 1
            else:
                mismatches.append({
                    "date": d.isoformat(), "recomputed": str(rec), "published": str(pub),
                    "delta": r3(delta), "valid_hours": recomputed[d]["hours"],
                    "meets_18_of_24": recomputed[d]["hours"] >= DAILY_MIN_VALID_HOURS,
                })
        out[label] = {
            "comparable_days": len(days),
            "matches": matches,
            "statement": f"{matches} of {len(days)}",
            "mean_absolute_difference": round(sum(deltas) / len(deltas), 4) if deltas else None,
            "first_day": days[0].isoformat() if days else None,
            "last_day": days[-1].isoformat() if days else None,
            "mismatches": mismatches,
        }
    out["published_file"] = {
        "valid_days": len(published),
        "first_day": min(published).isoformat(),
        "last_day": max(published).isoformat(),
    }
    out["recomputed_any_hours"] = {
        "days": len(recomputed),
        "first_day": min(recomputed).isoformat(),
        "last_day": max(recomputed).isoformat(),
        "days_meeting_18_of_24": sum(1 for v in recomputed.values()
                                     if v["hours"] >= DAILY_MIN_VALID_HOURS),
    }
    out["published_days_without_recomputed_hours"] = sorted(
        d.isoformat() for d in published if d not in recomputed
    )
    out["published_days_below_18_hours"] = sorted(
        d.isoformat() for d in published
        if d in recomputed and recomputed[d]["hours"] < DAILY_MIN_VALID_HOURS
    )
    out["recomputed_18_of_24_days_not_in_published"] = sorted(
        d.isoformat() for d, v in recomputed.items()
        if v["hours"] >= DAILY_MIN_VALID_HOURS and d not in published
    )
    return out


def changed_timestamps(aug_rows, frozen_rows):
    """Readings whose value or exclusion changed between the two export sets.

    Compared on (site_id, pollutant, ts_raw) over the hours the August export covers,
    so later hours in the freeze count as additions rather than changes.
    """
    def index(rows):
        return {(r["site_id"], r["pollutant"], r["ts_raw"]): (r["value"], r["exclusion_reason"])
                for r in rows}

    a, f = index(aug_rows), index(frozen_rows)
    sites = {k[0] for k in a}
    changed, missing_in_freeze = [], []
    for key in sorted(a, key=lambda k: (k[0], k[1], k[2])):
        val, reason = a[key]
        if key not in f:
            missing_in_freeze.append({
                "site_id": key[0], "pollutant": key[1], "ts_raw": key[2].isoformat(sep=" "),
                "august_value": val,
            })
        elif f[key] != (val, reason):
            changed.append({
                "site_id": key[0], "pollutant": key[1], "ts_raw": key[2].isoformat(sep=" "),
                "august_value": val, "freeze_value": f[key][0],
                "august_exclusion": reason, "freeze_exclusion": f[key][1],
            })
    per_site_added: dict[str, int] = defaultdict(int)
    for k in f:
        if k[0] in sites and k not in a:
            per_site_added[k[0]] += 1
    return {
        "compared_sites": sorted(sites),
        "august_readings": len(a),
        "freeze_readings_same_sites": sum(1 for k in f if k[0] in sites),
        "changed_count": len(changed),
        "changed": changed,
        "present_in_august_absent_from_freeze": missing_in_freeze,
        "readings_added_after_august_cutoff": dict(sorted(per_site_added.items())),
    }


# ---------------------------------------------------------------------- 1d


def task_1d(frozen_rows, aug_rows):
    """Record-day counts and end dates for the retired sites, under each day definition.

    For each site the actual last complete day is reported under both binnings, and the
    end date implied by DEQ's Table 4 p98 is solved for by sweeping candidate last days.
    """
    out = {}
    for group, sites, rows in (
        ("retired_pm25_ended_before_the_2026-08-07_edition", RETIRED_EARLY, frozen_rows),
        ("offline_2026-09-17", OFFLINE_2026_09_17, aug_rows),
    ):
        group_out = {}
        for site in sites:
            deq = DEQ_AUG7_P98[site]
            per_binning = {}
            for binning in ("standard", "clock"):
                d = daily(rows, binning, False, cutoff_est=AUG7_CUTOFF_EST)
                days = sorted(d.get(site, {}))
                vals = [d[site][k] for k in days]
                full = {
                    "record_days": len(days),
                    "first_day": days[0].isoformat() if days else None,
                    "last_day": days[-1].isoformat() if days else None,
                    "p98": r3(p98(vals)),
                    "deq_p98": deq,
                    "diff_vs_deq": r3(p98(vals) - deq) if vals else None,
                    "mean": r3(float(np.mean(vals))) if vals else None,
                    "deq_mean": DEQ_AUG7_MEAN[site],
                    "median": r3(float(np.median(vals))) if vals else None,
                    "deq_median": DEQ_AUG7_MEDIAN[site],
                }
                # End-date sweep: truncate the record at each candidate last day and
                # see whether any end date brings this binning within 0.05 of DEQ.
                sweep = []
                for i in range(len(days)):
                    v = p98(vals[: i + 1])
                    sweep.append({
                        "last_day": days[i].isoformat(), "n": i + 1,
                        "p98": r3(v), "diff_vs_deq": r3(v - deq),
                    })
                full["end_date_sweep_within_0.05"] = [
                    s for s in sweep if abs(s["diff_vs_deq"]) < 0.05
                ]
                full["end_date_sweep_best"] = (
                    min(sweep, key=lambda s: abs(s["diff_vs_deq"])) if sweep else None
                )
                full["end_date_sweep_tail"] = sweep[-6:]
                per_binning[binning] = full
            group_out[site] = per_binning
        out[group] = group_out
    return out


# --------------------------------------------------------------------- main


def main() -> int:
    aug_files = sorted(AUG.glob("*.csv"))
    frozen_files = sorted(FREEZE.glob("*.csv"))
    aug_rows = build_rows(aug_files)
    frozen_rows = build_rows(frozen_files)
    inputs = {
        "original inputs (2026-08-10 exports)": aug_rows,
        "current freeze (2026-10-10 exports)": frozen_rows,
    }

    reg_rows = []
    for name, pollutant in REGULATORY_FILES:
        reg_rows.extend(read_regulatory_file(FREEZE / name, pollutant))
    published = read_published_daily(FREEZE / REGULATORY_DAILY_FILE)

    result = {
        "inputs": {
            "original inputs (2026-08-10 exports)": [p.name for p in aug_files],
            "current freeze (2026-10-10 exports)": [p.name for p in frozen_files],
            "regulatory (frozen, FOIA 26-4646)": [n for n, _ in REGULATORY_FILES],
            "published_daily_file": REGULATORY_DAILY_FILE,
        },
        "task_1a_common_window_clock_zeros_missing": task_1a(inputs),
        "task_1b_collocation": {
            label: {sel: collocation(rows, reg_rows, sel) for sel in ("unit_id", "date")}
            for label, rows in inputs.items()
        },
        "task_1b_collocation_rules_s9": RULES_S9,
        "task_1b_reconciliation": {
            label: reconciliation(reg_rows, published) for label in inputs
        },
        "task_1b_reconciliation_note": (
            "The daily reconciliation compares the regulatory monitor's recomputed daily "
            "means against DEQ's published dailyAvg file. Neither side reads a Kunak "
            "export, so it is identical under both input sets by construction."
        ),
        "task_1b_changed_timestamps": changed_timestamps(aug_rows, frozen_rows),
        "task_1c_r2_window": reconciliation(reg_rows, published),
        "task_1d_retired_sites": task_1d(frozen_rows, aug_rows),
    }
    with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps(result, indent=2, ensure_ascii=False, default=str) + "\n")
    print(f"wrote {OUT.relative_to(REPO).as_posix()}")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
    sys.exit(main())
