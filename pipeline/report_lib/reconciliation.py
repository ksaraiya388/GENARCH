"""Daily-average reconciliation against DEQ's published dailyAvg file.

Comparable means the published day survives the null-code and `<` exclusions of
`GENARCH_RULES.md` section 3 and the recomputed day clears 18 of 24 valid hours.
DEQ truncates published values to one decimal and does not round, so the
recomputed mean is truncated the same way before comparison; `truncate_1dp` in
`reshape_deq` is that rule.

Input-invariant by construction: both sides read the regulatory monitor, and
neither reads a Kunak export.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date
from decimal import Decimal

from pipeline.reshape_deq import DAILY_MIN_VALID_HOURS, truncate_1dp

REGULATORY_SITE = "ashburn"


def recomputed_days(rows: list[dict]) -> dict[date, dict]:
    """Truncated daily means and valid-hour counts from the hourly regulatory record."""
    buckets: dict[date, list[Decimal]] = defaultdict(list)
    for row in rows:
        if row["site_id"] != REGULATORY_SITE or row["pollutant"] != "PM2.5":
            continue
        if row["excluded"] or row["value"] == "":
            continue
        buckets[row["ts_est"].date()].append(Decimal(str(row["value"])))
    return {
        day: {"valid_hours": len(values), "truncated": truncate_1dp(values)}
        for day, values in sorted(buckets.items())
    }


def excluded_days(
    regulatory_rows: list[dict],
    published: dict[date, Decimal],
    recomputed: dict[date, dict],
    comparable: list[date],
    min_hours: int,
) -> dict:
    """Why each calendar day in the comparison window is not comparable.

    Every day between the first and last comparable day is classified once: the
    published day failed DEQ's null-code and "<" exclusions, the recomputed day fell
    short of the completeness threshold, or both. The longest run of days on which
    every hourly reading carries an AQS null code is reported with its code, because
    it accounts for the one long gap in the comparison.
    """
    if not comparable:
        return {}
    start, end = comparable[0], comparable[-1]
    counts = {"both": 0, "published_only": 0, "recomputed_only": 0}
    day = start
    while day <= end:
        if day not in comparable:
            published_ok = day in published
            recomputed_ok = recomputed.get(day, {}).get("valid_hours", 0) >= min_hours
            if not published_ok and not recomputed_ok:
                counts["both"] += 1
            elif not published_ok:
                counts["published_only"] += 1
            elif not recomputed_ok:
                counts["recomputed_only"] += 1
        day = date.fromordinal(day.toordinal() + 1)

    # Days on which every hourly PM2.5 row carries an AQS null code, and the code.
    codes_by_day: dict[date, set[str]] = defaultdict(set)
    rows_by_day: dict[date, int] = defaultdict(int)
    null_by_day: dict[date, int] = defaultdict(int)
    prefix = "regulatory_invalid:null_code="
    for row in regulatory_rows:
        if row["site_id"] != REGULATORY_SITE or row["pollutant"] != "PM2.5":
            continue
        d = row["ts_est"].date()
        rows_by_day[d] += 1
        reason = row.get("exclusion_reason") or ""
        if row["excluded"] and reason.startswith(prefix):
            null_by_day[d] += 1
            codes_by_day[d].add(reason[len(prefix):])
    all_null = sorted(d for d in rows_by_day if null_by_day[d] == rows_by_day[d] > 0)
    best: list[date] = []
    run: list[date] = []
    for d in all_null:
        if run and d.toordinal() == run[-1].toordinal() + 1:
            run.append(d)
        else:
            run = [d]
        if len(run) > len(best):
            best = list(run)
    run_codes = sorted(set().union(*(codes_by_day[d] for d in best))) if best else []
    return {
        "calendar_days": end.toordinal() - start.toordinal() + 1,
        "counts": counts,
        "null_run_start": best[0].isoformat() if best else None,
        "null_run_end": best[-1].isoformat() if best else None,
        "null_run_days": len(best),
        "null_run_codes": run_codes,
    }


def reconcile(
    regulatory_rows: list[dict],
    published: dict[date, Decimal],
    min_hours: int = DAILY_MIN_VALID_HOURS,
) -> dict:
    """Compare recomputed daily means against DEQ's published file."""
    recomputed = recomputed_days(regulatory_rows)
    days = sorted(
        day
        for day in published
        if day in recomputed and recomputed[day]["valid_hours"] >= min_hours
    )

    rows = []
    deltas = []
    matches = 0
    for day in days:
        mine = recomputed[day]["truncated"]
        theirs = published[day]
        delta = float(mine - theirs)
        deltas.append(abs(delta))
        agrees = mine == theirs
        matches += 1 if agrees else 0
        rows.append(
            {
                "date": day.isoformat(),
                "recomputed": float(mine),
                "published": float(theirs),
                "difference": delta,
                "valid_hours": recomputed[day]["valid_hours"],
                "match": agrees,
            }
        )

    excluded = excluded_days(regulatory_rows, published, recomputed, days, min_hours)

    return {
        "excluded": excluded,
        "rows": rows,
        "n_days": len(days),
        "n_match": matches,
        "mean_abs_diff": (sum(deltas) / len(deltas)) if deltas else None,
        "max_abs_diff": max(deltas) if deltas else None,
        "window_start": days[0].isoformat() if days else None,
        "window_end": days[-1].isoformat() if days else None,
        "mismatch_dates": [r["date"] for r in rows if not r["match"]],
    }
