"""Cross-site hourly PM2.5 correlation.

Mirrors `getCorrelations()` in `site/src/lib/deq-data.ts`: pairwise-complete on
`ts_est`, the smoke window excluded, exact zeros already treated as missing by the
pipeline's `exact_zero_floor` exclusion.

Descriptive only. High spatial correlation does not establish that local sources
contribute nothing: the network may sit largely upwind, and a local increment can
be masked by a dominant regional signal.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime
from itertools import combinations

# DEQ qualifier IF, "Fire - Canadian, informational only". Inclusive on both ends.
SMOKE_START = date(2026, 7, 16)
SMOKE_END = date(2026, 7, 19)
SMOKE_RULE = (
    "hours whose local standard time day falls in the Canadian wildfire transport "
    "window are excluded; DEQ's own IF qualifier identifies the episode"
)


def in_smoke_window(ts_est: datetime) -> bool:
    return SMOKE_START <= ts_est.date() <= SMOKE_END


def pearson(xs: list[float], ys: list[float]) -> float:
    n = len(xs)
    mx = sum(xs) / n
    my = sum(ys) / n
    sxx = sxy = syy = 0.0
    for x, y in zip(xs, ys):
        dx = x - mx
        dy = y - my
        sxx += dx * dx
        sxy += dx * dy
        syy += dy * dy
    return sxy / ((sxx * syy) ** 0.5)


def correlations(rows: list[dict], site_ids: list[str]) -> dict:
    """Upper-triangle Pearson r for every site pair, on non-smoke hours."""
    wanted = set(site_ids)
    by_site: dict[str, dict[datetime, float]] = defaultdict(dict)
    for row in rows:
        if row["pollutant"] != "PM2.5" or row["excluded"] or row["value"] == "":
            continue
        if row["site_id"] not in wanted or in_smoke_window(row["ts_est"]):
            continue
        by_site[row["site_id"]][row["ts_est"]] = float(row["value"])

    pairs = []
    for a, b in combinations(sorted(site_ids), 2):
        shared = sorted(set(by_site[a]) & set(by_site[b]))
        if len(shared) < 2:
            continue
        xs = [by_site[a][ts] for ts in shared]
        ys = [by_site[b][ts] for ts in shared]
        pairs.append({"a": a, "b": b, "r": pearson(xs, ys), "n": len(shared)})

    if not pairs:
        raise ValueError("no site pair shared enough non-smoke hours to correlate")

    all_hours = set()
    for site in site_ids:
        all_hours |= set(by_site[site])

    return {
        "pairs": pairs,
        "r_min": min(p["r"] for p in pairs),
        "r_max": max(p["r"] for p in pairs),
        "n_min": min(p["n"] for p in pairs),
        "n_max": max(p["n"] for p in pairs),
        "n_hours": len(all_hours),
        "sites": sorted(site_ids),
    }
