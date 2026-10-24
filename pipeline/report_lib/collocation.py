"""The four collocation regressions at the collocated site.

Method, per `GENARCH_RULES.md` section 9 and `getCollocation()` in
`site/src/lib/deq-data.ts`: pair on `ts_est`; apply the excluded flags on both
sides; assign collocation periods by `unit_id` from the occupancy table; ordinary
least squares with the sensor on x and the regulatory monitor on y, matching DEQ's
orientation; every fit stops at the 2026-08-07 07:00 EST edition cutoff.

Exact zeros are retained in the APEX 5 NO2 fit and in nothing else (DEQ staff,
2026-08-19). Readmitting them into the other three moves coefficients that
currently reproduce back outside tolerance.

DEQ publishes these coefficients to two significant figures, so the comparison is
made at DEQ's own precision: each recomputed value is rounded to the number of
decimals DEQ printed for that value. Agreement to three decimals is not verifiable
against the source and is never claimed.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from pipeline.report_lib.rounding import half_up, matches_at_published_precision

COLLOCATED_SITE = "ashburn-collocated"
REGULATORY_SITE = "ashburn"
EDITION_CUTOFF_EST = datetime(2026, 8, 7, 7, 0)
EDITION_CUTOFF_LABEL = "2026-08-07 07:00 EST"

STATUS_MATCH = "matches DEQ at published precision"
STATUS_NEAR = "near"


@dataclass(frozen=True)
class PublishedSpec:
    key: str
    unit_id: str
    pollutant: str
    unit: str
    intercept: float
    slope: float
    r2: float
    retain_exact_zeros: bool = False


# Transcribed from DEQ's reports, asserted in DEQ_PUBLISHED (site/src/lib/deq-data.ts).
DEQ_PUBLISHED: tuple[PublishedSpec, ...] = (
    PublishedSpec("apex-14_PM2.5", "apex-14", "PM2.5", "µg/m³", 1.3, 0.83, 0.73),
    PublishedSpec("apex-05_PM2.5", "apex-05", "PM2.5", "µg/m³", -4.7, 1.7, 0.84),
    PublishedSpec("apex-14_NO2", "apex-14", "NO2", "ppb", 2.2, 1.1, 0.49),
    PublishedSpec(
        "apex-05_NO2", "apex-05", "NO2", "ppb", 1.8, 0.32, 0.21, retain_exact_zeros=True
    ),
)

# GENARCH_RULES.md section 9, the recorded reproduction. Used only by the internal
# reproducibility test; never presented as agreement with DEQ.
RULES_SECTION_9 = {
    "apex-14_PM2.5": {"intercept": 1.299, "slope": 0.831, "r2": 0.725, "n": 697},
    "apex-05_PM2.5": {"intercept": -4.678, "slope": 1.665, "r2": 0.837, "n": 2111},
    "apex-14_NO2": {"intercept": 2.186, "slope": 1.075, "r2": 0.497, "n": 589},
    "apex-05_NO2": {"intercept": 1.835, "slope": 0.319, "r2": 0.207, "n": 2745},
}


def least_squares(xs: list[float], ys: list[float]) -> dict:
    """OLS, in the closed form `leastSquares()` in deq-data.ts uses."""
    n = len(xs)
    if n < 2:
        raise ValueError("a regression needs at least two pairs")
    mx = sum(xs) / n
    my = sum(ys) / n
    sxx = sxy = syy = 0.0
    for x, y in zip(xs, ys):
        dx = x - mx
        dy = y - my
        sxx += dx * dx
        sxy += dx * dy
        syy += dy * dy
    slope = sxy / sxx
    return {
        "n": n,
        "intercept": my - slope * mx,
        "slope": slope,
        "r2": (sxy * sxy) / (sxx * syy),
    }


def regulatory_index(rows: list[dict], pollutant: str) -> dict[datetime, float]:
    return {
        row["ts_est"]: float(row["value"])
        for row in rows
        if row["site_id"] == REGULATORY_SITE
        and row["pollutant"] == pollutant
        and not row["excluded"]
        and row["value"] != ""
    }


def fit_one(sensor_rows: list[dict], regulatory_rows: list[dict], spec: PublishedSpec) -> dict:
    """One regression, with its DEQ comparison at DEQ's published precision."""
    reference = regulatory_index(regulatory_rows, spec.pollutant)
    pairs: list[tuple[datetime, float, float]] = []
    for row in sensor_rows:
        if row["site_id"] != COLLOCATED_SITE or row["pollutant"] != spec.pollutant:
            continue
        if row["unit_id"] != spec.unit_id or row["value"] == "":
            continue
        if row["ts_est"] > EDITION_CUTOFF_EST:
            continue
        if row["excluded"] and not (
            spec.retain_exact_zeros and row["exclusion_reason"] == "exact_zero_floor"
        ):
            continue
        reference_value = reference.get(row["ts_est"])
        if reference_value is None:
            continue
        pairs.append((row["ts_est"], float(row["value"]), reference_value))

    pairs.sort(key=lambda p: p[0])
    fit = least_squares([p[1] for p in pairs], [p[2] for p in pairs])

    matched = all(
        matches_at_published_precision(fit[field], getattr(spec, field))
        for field in ("intercept", "slope", "r2")
    )
    return {
        "key": spec.key,
        "unit_id": spec.unit_id,
        "pollutant": spec.pollutant,
        "unit": spec.unit,
        "deq_intercept": spec.intercept,
        "deq_slope": spec.slope,
        "deq_r2": spec.r2,
        "gx_intercept": half_up(fit["intercept"], 3),
        "gx_slope": half_up(fit["slope"], 3),
        "gx_r2": half_up(fit["r2"], 3),
        "diff_intercept": half_up(fit["intercept"] - spec.intercept, 3),
        "diff_slope": half_up(fit["slope"] - spec.slope, 3),
        "diff_r2": half_up(fit["r2"] - spec.r2, 3),
        "n_pairs": fit["n"],
        "period_start": pairs[0][0].isoformat(sep=" "),
        "period_end": pairs[-1][0].isoformat(sep=" "),
        "retains_exact_zeros": spec.retain_exact_zeros,
        "status": STATUS_MATCH if matched else STATUS_NEAR,
        "pairs": [(p[1], p[2]) for p in pairs],
        "raw": fit,
    }


def fit_all(sensor_rows: list[dict], regulatory_rows: list[dict]) -> list[dict]:
    return [fit_one(sensor_rows, regulatory_rows, spec) for spec in DEQ_PUBLISHED]
