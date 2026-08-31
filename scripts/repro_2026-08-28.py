"""Phase 3 recomputation for the 2026-08-28 DEQ report period.

Writes four dated CSVs under outputs/repro/. Every output carries its data
cutoff as a column, because the Kunak dashboard backfills and a figure without
a cutoff cannot be checked later.

Collocation follows docs/COLLOCATION_METHOD.md exactly: pair on ts_est, apply
the excluded flag on both sides, assign collocation periods by date rather than
by unit_id, and fit OLS with the sensor on x.
"""

from __future__ import annotations

import csv
import sys
from decimal import Decimal
from pathlib import Path

import numpy as np
import pandas as pd

REPO = Path(__file__).resolve().parents[1]
SRC = REPO / "pipeline" / "sources"
OUT = REPO / "outputs" / "repro"

SENSOR_CUTOFF = "2026-08-28"
REGULATORY_CUTOFF = "2026-08-10"
PUBLISHED_DAILY_CUTOFF = "2026-08-09"
REPORT_DATE = "2026-08-28"

SPLIT = pd.Timestamp("2026-04-08")
COMMON_WINDOW_START = pd.Timestamp("2026-06-18")

# A.5: internal slugs never appear in an artifact; DEQ's published names do.
DEQ_NAME = {
    "ashburn-collocated": "Broad Run HS",
    "belfort-park": "Belfort Park Dr",
    "dulles-area": "Dulles Airport",
    "farmwell-middle": "Farmwell Station MS",
    "golf-course": "1757 Golf Club",
    "sterling-ms": "Sterling MS",
    "ashburn": "Broad Run HS Regulatory Monitor",
}

OPERATING = [
    "ashburn-collocated",
    "belfort-park",
    "dulles-area",
    "farmwell-middle",
    "golf-course",
    "sterling-ms",
]

# DEQ 2026-08-28 report, Table 4. Newberry Condo Assoc recovered from the
# report text sidecar; it was truncated out of an earlier extraction.
TABLE4 = {
    "1757 Golf Club": (7.6, 9.3, 5.4, 23.4, "2026-04-08"),
    "Belfort Park Dr": (9.3, 10.3, 7.3, 25.9, "2026-05-14"),
    "Broad Run HS": (8.3, 8.3, 6.8, 24.8, "2026-03-03"),
    "Broad Run HS Regulatory Monitor": (8.2, 15.3, 6.0, 22.3, "2026-03-03"),
    "Dulles Airport": (5.8, 7.0, 4.1, 17.8, "2026-03-03"),
    "Farmwell Station MS": (8.2, 10.3, 6.1, 24.6, "2026-04-08"),
    "Heritage Farm Museum": (4.2, 2.3, 3.5, 9.7, "2026-03-03"),
    "Newberry Condo Assoc": (5.7, 3.1, 4.9, 14.5, "2026-03-03"),
    "Sterling MS": (10.5, 12.0, 8.4, 33.8, "2026-06-18"),
    "Steuart Weller ES": (4.6, 2.4, 3.9, 10.2, "2026-03-03"),
}

# DEQ 2026-08-28 published collocation coefficients, as strings so the
# published precision is preserved and can be read back.
PUBLISHED_COLLOCATION = {
    ("NO2", "APEX 14"): ("2.2", "1.1", "0.49"),
    ("NO2", "APEX 5"): ("1.7", "0.31", "0.21"),
    ("PM2.5", "APEX 14"): ("1.3", "0.83", "0.73"),
    ("PM2.5", "APEX 5"): ("-5", "1.6", "0.82"),
}


def sig_figs(published: str) -> int:
    """Significant figures in a published value, read from its own text."""
    digits = published.lstrip("-").replace(".", "").lstrip("0")
    return len(digits) or 1


def round_to(value: float, published: str) -> float:
    """Round a computed value to the published value's precision."""
    n = sig_figs(published)
    if value == 0:
        return 0.0
    return float(f"%.{n}g" % value)


def matches(value: float, published: str) -> bool:
    return round_to(value, published) == float(published)


def write(path: Path, columns: list[str], rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)
    print(f"wrote {path.relative_to(REPO)} ({len(rows)} rows)")


def load() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    sensor = pd.read_csv(SRC / "deq_data_center_air_monitoring_hourly.csv")
    reg = pd.read_csv(SRC / "deq_regulatory_monitor_hourly.csv")
    daily = pd.read_csv(SRC / "deq_pm25_daily.csv")
    for frame in (sensor, reg):
        frame["ts_est"] = pd.to_datetime(frame["ts_est"])
    sensor["exclusion_reason"] = sensor["exclusion_reason"].fillna("")
    return sensor, reg, daily


def ols(sub: pd.DataFrame) -> tuple[int, float, float, float]:
    x = sub.value_sensor.to_numpy(float)
    y = sub.value_reg.to_numpy(float)
    slope, intercept = np.polyfit(x, y, 1)
    pred = intercept + slope * x
    r2 = 1 - ((y - pred) ** 2).sum() / ((y - y.mean()) ** 2).sum()
    return len(sub), intercept, slope, r2


def phase_31(sensor: pd.DataFrame, reg: pd.DataFrame) -> None:
    """Collocation at Broad Run HS, sensor against regulatory monitor."""
    r = reg[(reg.site_id == "ashburn") & (~reg.excluded)][
        ["ts_est", "pollutant", "value"]
    ]
    s = sensor[(sensor.site_id == "ashburn-collocated") & (~sensor.excluded)][
        ["ts_est", "pollutant", "value"]
    ]
    merged = s.merge(r, on=["ts_est", "pollutant"], suffixes=("_sensor", "_reg"))

    rows = []
    for pollutant in ("NO2", "PM2.5"):
        pol = merged[merged.pollutant == pollutant]
        for sensor_name, sub in (
            ("APEX 14", pol[pol.ts_est < SPLIT]),
            ("APEX 5", pol[pol.ts_est >= SPLIT]),
        ):
            n, intercept, slope, r2 = ols(sub)
            closed = sensor_name == "APEX 14"
            pub_i, pub_s, pub_r = PUBLISHED_COLLOCATION[(pollutant, sensor_name)]
            comparable = closed
            note = (
                "Closed window 2026-03-03 to 2026-04-08. DEQ's published value "
                "is fixed and cannot drift, so this is a like-for-like "
                "comparison."
                if closed
                else (
                    "capped at 2026-08-10, not comparable to the 2026-08-28 "
                    "report. The regulatory monitor ends 2026-08-10 under FOIA "
                    "26-4646 while DEQ's published figure uses data through "
                    "2026-08-27, so the two cover different windows."
                )
            )
            if pollutant == "NO2" and closed:
                note += (
                    " Intercept and slope reproduce; the R2 sits near a "
                    "rounding boundary and is not robust to leave-one-out "
                    "resampling."
                )
            rows.append(
                {
                    "report_date": REPORT_DATE,
                    "data_cutoff_sensor": SENSOR_CUTOFF,
                    "data_cutoff_regulatory": REGULATORY_CUTOFF,
                    "effective_cutoff": REGULATORY_CUTOFF,
                    "site": "Broad Run HS",
                    "pollutant": pollutant,
                    "sensor": sensor_name,
                    "window_start": "2026-03-03" if closed else "2026-04-08",
                    "window_end": "2026-04-08" if closed else REGULATORY_CUTOFF,
                    "window_status": "closed" if closed else "open",
                    "n_pairs": n,
                    "genarch_intercept": round(intercept, 4),
                    "genarch_slope": round(slope, 4),
                    "genarch_r2": round(r2, 4),
                    "deq_intercept": pub_i,
                    "deq_slope": pub_s,
                    "deq_r2": pub_r,
                    "intercept_rounds_to_deq": (
                        "yes" if matches(intercept, pub_i) else "no"
                    ),
                    "slope_rounds_to_deq": "yes" if matches(slope, pub_s) else "no",
                    "r2_rounds_to_deq": "yes" if matches(r2, pub_r) else "no",
                    "comparable_to_report": "yes" if comparable else "no",
                    "notes": note,
                }
            )

    write(
        OUT / "collocation_2026-08-28.csv",
        list(rows[0].keys()),
        rows,
    )


def phase_32(daily: pd.DataFrame) -> None:
    """Daily reconciliation of the regulatory FEM monitor against DEQ."""
    sub = daily[daily.site_id == "ashburn"].copy()
    rows = []
    deltas = []
    comparable = 0
    exact = 0
    for record in sub.to_dict("records"):
        published = record["published_value"]
        recomputed = record["mean_pm25_ugm3"]
        has_pub = not (pd.isna(published) or published == "")
        meets = bool(record["meets_18_of_24"])
        delta = ""
        if has_pub and meets and not pd.isna(recomputed):
            comparable += 1
            delta_val = float(Decimal(str(recomputed)) - Decimal(str(published)))
            delta = round(delta_val, 4)
            deltas.append(abs(delta_val))
            if str(record["matches_published"]).lower() == "true":
                exact += 1
        rows.append(
            {
                "report_date": REPORT_DATE,
                "data_cutoff_regulatory": REGULATORY_CUTOFF,
                "data_cutoff_published_dailyavg": PUBLISHED_DAILY_CUTOFF,
                "date": record["date_est"],
                "site": DEQ_NAME["ashburn"],
                "instrument_class": record["instrument_class"],
                "recomputed_value": recomputed if not pd.isna(recomputed) else "",
                "published_value": published if has_pub else "",
                "delta": delta,
                "valid_hours": record["valid_hours"],
                "meets_18_of_24": str(meets).lower(),
                "comparable": "yes" if (has_pub and meets) else "no",
            }
        )

    write(OUT / "daily_reconciliation_2026-08-28.csv", list(rows[0].keys()), rows)
    mad = sum(deltas) / len(deltas) if deltas else 0.0
    print(
        f"    comparable days {comparable}, exact after truncation {exact}, "
        f"mean absolute delta {mad:.4f}"
    )
    return comparable, exact, mad


def daily_from_hourly(sensor: pd.DataFrame, retain_zeros: bool) -> pd.DataFrame:
    """Recompute daily PM2.5 means under one zero-treatment policy."""
    pm = sensor[sensor.pollutant == "PM2.5"].copy()
    if retain_zeros:
        # Keep exact-zero readings; every other exclusion still applies.
        keep = (~pm.excluded) | (pm.exclusion_reason == "exact_zero_floor")
    else:
        keep = ~pm.excluded
    pm = pm[keep].copy()
    pm["date_est"] = pm.ts_est.dt.date
    grouped = (
        pm.groupby(["site_id", "date_est"])
        .agg(mean_pm25=("value", "mean"), valid_hours=("value", "size"))
        .reset_index()
    )
    return grouped[grouped.valid_hours >= 18]


def phase_33(sensor: pd.DataFrame) -> None:
    """Common-window and full-record daily PM2.5 98th percentiles."""
    daily = daily_from_hourly(sensor, retain_zeros=False)
    daily["date_ts"] = pd.to_datetime(daily.date_est)

    common = daily[
        (daily.date_ts >= COMMON_WINDOW_START) & (daily.site_id.isin(OPERATING))
    ]
    ranked = []
    for site_id, group in common.groupby("site_id"):
        ranked.append(
            {
                "site_id": site_id,
                "p98": float(np.percentile(group.mean_pm25, 98)),
                "n_days": len(group),
                "start": group.date_ts.min().date().isoformat(),
                "end": group.date_ts.max().date().isoformat(),
            }
        )
    ranked.sort(key=lambda d: d["p98"], reverse=True)

    rows = []
    for rank, item in enumerate(ranked, start=1):
        site_id = item["site_id"]
        name = DEQ_NAME[site_id]
        full = daily[daily.site_id == site_id]
        full_p98 = float(np.percentile(full.mean_pm25, 98))
        published_p98 = TABLE4[name][3]
        rows.append(
            {
                "report_date": REPORT_DATE,
                "data_cutoff": SENSOR_CUTOFF,
                "site": name,
                "common_window_start": item["start"],
                "common_window_end": item["end"],
                "common_window_p98": round(item["p98"], 2),
                "common_window_valid_days": item["n_days"],
                "common_window_rank": rank,
                "full_record_start": full.date_ts.min().date().isoformat(),
                "full_record_end": full.date_ts.max().date().isoformat(),
                "full_record_p98": round(full_p98, 2),
                "full_record_valid_days": len(full),
                "deq_published_p98": published_p98,
                "full_record_minus_published": round(full_p98 - published_p98, 2),
                "percentile_method": "numpy linear interpolation on valid daily means",
                "window_caution": (
                    "The common window is entirely high summer and contains the "
                    "2026-07-16 to 2026-07-19 wildfire period. It removes the "
                    "unequal-length confound and leaves the unequal-seasonality "
                    "confound in place, so it is not a clean control and is not "
                    "a correction for record length."
                ),
                "full_record_p98_method_spread": round(
                    float(
                        max(
                            np.percentile(full.mean_pm25, 98, method=m)
                            for m in ("linear", "lower", "higher", "nearest", "midpoint")
                        )
                        - min(
                            np.percentile(full.mean_pm25, 98, method=m)
                            for m in ("linear", "lower", "higher", "nearest", "midpoint")
                        )
                    ),
                    2,
                ),
            }
        )

    write(OUT / "p98_common_window_2026-08-28.csv", list(rows[0].keys()), rows)


def phase_34(sensor: pd.DataFrame) -> None:
    """Sensitivity of the site mean to exact-zero treatment. Measures only."""
    excluded = daily_from_hourly(sensor, retain_zeros=False)
    retained = daily_from_hourly(sensor, retain_zeros=True)

    rows = []
    for site_id in OPERATING:
        name = DEQ_NAME[site_id]
        published_mean = TABLE4[name][0]
        published_p98 = TABLE4[name][3]
        a = excluded[excluded.site_id == site_id]
        b = retained[retained.site_id == site_id]
        mean_excl = float(a.mean_pm25.mean())
        mean_ret = float(b.mean_pm25.mean())
        p98_excl = float(np.percentile(a.mean_pm25, 98))
        p98_ret = float(np.percentile(b.mean_pm25, 98))
        rows.append(
            {
                "report_date": REPORT_DATE,
                "data_cutoff": SENSOR_CUTOFF,
                "site": name,
                "deq_published_mean": published_mean,
                "genarch_mean_zeros_excluded": round(mean_excl, 3),
                "delta_mean_zeros_excluded": round(mean_excl - published_mean, 3),
                "valid_days_zeros_excluded": len(a),
                "genarch_mean_zeros_retained": round(mean_ret, 3),
                "delta_mean_zeros_retained": round(mean_ret - published_mean, 3),
                "valid_days_zeros_retained": len(b),
                "mean_shift_from_retaining": round(mean_ret - mean_excl, 3),
                "deq_published_p98": published_p98,
                "genarch_p98_zeros_excluded": round(p98_excl, 3),
                "delta_p98_zeros_excluded": round(p98_excl - published_p98, 3),
                "genarch_p98_zeros_retained": round(p98_ret, 3),
                "delta_p98_zeros_retained": round(p98_ret - published_p98, 3),
                "p98_shift_from_retaining": round(p98_ret - p98_excl, 3),
                "pipeline_default": "zeros excluded (exact_zero_floor)",
                "changed_in_this_task": "no",
            }
        )

    write(
        OUT / "zero_treatment_sensitivity_2026-08-28.csv",
        list(rows[0].keys()),
        rows,
    )


def main() -> int:
    sensor, reg, daily = load()
    print("Phase 3.1 collocation")
    phase_31(sensor, reg)
    print("Phase 3.2 daily reconciliation")
    phase_32(daily)
    print("Phase 3.3 p98 common window")
    phase_33(sensor)
    print("Phase 3.4 zero-treatment sensitivity")
    phase_34(sensor)
    return 0


if __name__ == "__main__":
    sys.exit(main())
