"""Daily PM2.5 means and the 98th percentile.

Two day-binning conventions are defensible here and they do not agree
(`docs/PERCENTILE_METHOD.md`):

    standard  ts_est, hour-beginning local standard time. The pipeline default and
              the 40 CFR Part 50 Appendix N convention.
    clock     ts_raw minus one hour, hour-beginning local clock time. The convention
              DEQ's published sensor tables use.

GENARCH does not change its binning. Both are computed so the divergence can be
reported, which is the finding.

The completeness rule, the exclusion flags and the timestamps all come from
`reshape_deq`; this module only buckets and averages.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta
from decimal import Decimal

import numpy as np

from pipeline.reshape_deq import DAILY_MIN_VALID_HOURS

STANDARD = "standard"
CLOCK = "clock"
DAY_DEFINITION_LABEL = {
    STANDARD: "local standard time",
    CLOCK: "local clock time",
}


def day_key(row: dict, binning: str) -> date:
    if binning == STANDARD:
        return row["ts_est"].date()
    if binning == CLOCK:
        return (row["ts_raw"] - timedelta(hours=1)).date()
    raise ValueError(f"unknown binning {binning!r}")


def daily_means(
    rows: list[dict],
    binning: str = STANDARD,
    retain_zeros: bool = False,
    cutoff_est: datetime | None = None,
    min_hours: int = DAILY_MIN_VALID_HOURS,
) -> dict[str, dict[date, float]]:
    """Complete-day PM2.5 means per site_id, untruncated.

    `retain_zeros` readmits rows the pipeline flagged `exact_zero_floor` and nothing
    else. `cutoff_est` drops hours after DEQ's edition cutoff.
    """
    buckets: dict[tuple[str, date], list[Decimal]] = defaultdict(list)
    for row in rows:
        if row["pollutant"] != "PM2.5" or row["value"] == "":
            continue
        if cutoff_est is not None and row["ts_est"] > cutoff_est:
            continue
        if row["excluded"] and not (
            retain_zeros and row["exclusion_reason"] == "exact_zero_floor"
        ):
            continue
        buckets[(row["site_id"], day_key(row, binning))].append(Decimal(str(row["value"])))

    out: dict[str, dict[date, float]] = defaultdict(dict)
    for (site_id, day), values in buckets.items():
        if len(values) >= min_hours:
            out[site_id][day] = float(sum(values, Decimal(0)) / len(values))
    return {site: dict(sorted(days.items())) for site, days in sorted(out.items())}


def p98(values) -> float | None:
    """98th percentile by linear interpolation.

    The definition NumPy and DEQ's own analysis use, and the one `getPercentiles()`
    in `site/src/lib/deq-data.ts` mirrors. Nearest-rank moves a 51-day value by a
    whole observation, which is the scale of the differences under discussion.
    """
    values = list(values)
    if not values:
        return None
    return float(np.percentile(values, 98, method="linear"))


def percentile_rank_position(n: int, p: float = 0.98) -> dict:
    """Which order statistic the percentile is read from, at a record of `n` days."""
    k = (n - 1) * p
    lower = int(np.floor(k))
    exact = abs(k - lower) < 1e-9
    return {
        "n": n,
        "lower": lower + 1,
        "upper": lower + 1 if exact else min(lower + 2, n),
        "exact": exact,
    }


def window_days(days: dict[date, float], start: date, end: date) -> dict[date, float]:
    """Days within an inclusive window, in date order."""
    return {d: v for d, v in sorted(days.items()) if start <= d <= end}


def days_below(days: dict[date, float], level: float) -> tuple[int, int]:
    """(days strictly below `level`, total days)."""
    values = list(days.values())
    return sum(1 for v in values if v < level), len(values)
