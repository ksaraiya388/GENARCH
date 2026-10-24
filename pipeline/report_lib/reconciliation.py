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

    return {
        "rows": rows,
        "n_days": len(days),
        "n_match": matches,
        "mean_abs_diff": (sum(deltas) / len(deltas)) if deltas else None,
        "max_abs_diff": max(deltas) if deltas else None,
        "window_start": days[0].isoformat() if days else None,
        "window_end": days[-1].isoformat() if days else None,
        "mismatch_dates": [r["date"] for r in rows if not r["match"]],
    }
