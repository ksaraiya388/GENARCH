"""Computations for the 2026-08-29 consolidation task.

Emits the Phase 1.6 Table 4 comparison (both day-binning conventions), the
Phase 2.2 rank-position artifact, the Phase 1.6d residual investigation, and
the Phase 5 reproductions of DEQ Tables 2 and 3.

Reads only. Never writes to pipeline/sources/.
"""
from __future__ import annotations

import csv
from pathlib import Path

import numpy as np
import pandas as pd

CUTOFF = "2026-08-27"          # DEQ 2026-08-28 report covers sensor data through here
EXPORT_DATE = "2026-08-28"     # Kunak dashboard download date of the six active exports
REG_CUTOFF = "2026-08-10"      # FOIA 26-4646 regulatory record end
REPORT_DATE = "2026-08-28"
OUT = Path("outputs/repro")

# DEQ published site label per pipeline site_id. Used in outputs/repro only:
# docs/CONTENT_CONSTRAINTS.md section 4 forbids these labels in site/src.
SITE = {
    "golf-course": "1757 Golf Club",
    "belfort-park": "Belfort Park Dr",
    "ashburn-collocated": "Broad Run HS",
    "dulles-area": "Dulles Airport",
    "farmwell-middle": "Farmwell Station MS",
    "sterling-ms": "Sterling MS",
}
RETIRED = ["Heritage Farm Museum", "Newberry Condo Assoc", "Steuart Weller ES"]

# DEQ 2026-08-28 report, transcribed from the archived PDF text sidecar.
T4 = {  # Table 4, PM2.5 24-hour (daily), ug/m3
    "1757 Golf Club": (7.6, 9.3, 5.4, 23.4),
    "Belfort Park Dr": (9.3, 10.3, 7.3, 25.9),
    "Broad Run HS": (8.3, 8.3, 6.8, 24.8),
    "Dulles Airport": (5.8, 7.0, 4.1, 17.8),
    "Farmwell Station MS": (8.2, 10.3, 6.1, 24.6),
    "Sterling MS": (10.5, 12.0, 8.4, 33.8),
}
T1 = {  # Table 1, CO hourly, ppm
    "1757 Golf Club": (0.1, 0.1, 0.1, 0.4),
    "Arlington Regulatory Monitor": (0.2, 0.1, 0.2, 0.6),
    "Belfort Park Dr": (0.1, 0.1, 0.2, 0.5),
    "Broad Run HS": (0.1, 0.1, 0.2, 0.4),
    "Dulles Airport": (0.1, 0.1, 0.1, 0.4),
    "Farmwell Station MS": (0.1, 0.1, 0.1, 0.4),
    "Heritage Farm Museum": (0.2, 0.1, 0.2, 0.4),
    "Newberry Condo Assoc": (0.2, 0.1, 0.2, 0.5),
    "Sterling MS": (0.1, 0.1, 0.1, 0.4),
    "Steuart Weller ES": (0.1, 0.1, 0.2, 0.4),
}
T2 = {  # Table 2, NO2 hourly, ppb
    "1757 Golf Club": (3.9, 4.1, 3.0, 15.4),
    "Belfort Park Dr": (2.7, 3.6, 1.3, 13.8),
    "Broad Run HS": (3.9, 3.9, 3.2, 13.1),
    "Broad Run HS Regulatory Monitor": (3.4, 3.2, 2.4, 13.7),
    "Dulles Airport": (5.6, 5.3, 4.7, 19.4),
    "Farmwell Station MS": (3.9, 3.7, 3.3, 12.9),
    "Heritage Farm Museum": (2.5, 3.1, 1.3, 10.8),
    "Newberry Condo Assoc": (4.1, 4.1, 3.2, 15.8),
    "Sterling MS": (5.1, 4.3, 4.5, 14.6),
    "Steuart Weller ES": (3.0, 3.2, 2.0, 11.4),
}
T3 = {  # Table 3, PM2.5 hourly, ug/m3
    "1757 Golf Club": (7.6, 10.2, 5.2, 29.4),
    "Belfort Park Dr": (9.3, 11.4, 6.6, 36.4),
    "Broad Run HS": (8.3, 9.1, 6.2, 28.7),
    "Broad Run HS Regulatory Monitor": (8.3, 16.6, 5.8, 23.2),
    "Dulles Airport": (5.8, 7.8, 3.9, 20.9),
    "Farmwell Station MS": (8.2, 11.3, 5.5, 28.5),
    "Heritage Farm Museum": (4.2, 3.4, 3.4, 15.6),
    "Newberry Condo Assoc": (5.7, 4.3, 4.6, 18.1),
    "Sterling MS": (10.5, 13.2, 7.7, 53.6),
    "Steuart Weller ES": (4.5, 3.2, 3.7, 13.5),
}

MIN_HOURS = 18
METHODS = ["linear", "lower", "higher", "nearest", "midpoint"]
STAT_KEYS = ["mean", "sd", "median", "p98"]

BINNING_NOTE = (
    "reg_* bins hours into days by hour-beginning local standard time (ts_est), "
    "the pipeline default and the 40 CFR Part 50 Appendix N convention for daily "
    "averages. clock_* bins by hour-beginning local clock time (ts_raw minus one "
    "hour), which is what DEQ's published sensor tables use. The two are identical "
    "in EST and differ by one hour during EDT, which moves the last hour of each "
    "local day into the previous day. Neither is wrong; they answer different "
    "questions. reg_* is the regulatory-convention column set."
)

RANK_NOTE = (
    "The 98th percentile is a different order statistic at different record "
    "lengths. Under linear interpolation the index is (n-1)*0.98, so a short "
    "record reads its p98 from near the maximum and a long record reads it from "
    "further inside the upper tail. bracket_gap is the distance between the two "
    "daily values the statistic is interpolated between; where that gap is wide, "
    "a small difference in n or in quantile convention moves the statistic a long "
    "way without any change in the underlying measurements."
)


def load_sensor() -> pd.DataFrame:
    h = pd.read_csv("pipeline/sources/deq_data_center_air_monitoring_hourly.csv")
    # Kept unfiltered: the Phase 5 zero-policy diagnostic needs the excluded rows.
    # Callers that want the pipeline default apply ``valid()``.
    h = h.copy()
    h["ts_est"] = pd.to_datetime(h.ts_est)
    h["ts_raw"] = pd.to_datetime(h.ts_raw)
    # d_est: hour-beginning local standard time, the pipeline default.
    h["d_est"] = h.ts_est.dt.date
    # d_clock: hour-beginning local clock time. ts_raw is hour-ending local clock.
    h["d_clock"] = (h.ts_raw - pd.Timedelta(hours=1)).dt.date
    return h


def load_regulatory() -> pd.DataFrame:
    r = pd.read_csv("pipeline/sources/deq_regulatory_monitor_hourly.csv")
    r = r.copy()
    r["ts_est"] = pd.to_datetime(r.ts_est)
    r["ts_raw"] = pd.to_datetime(r.ts_raw)
    r["d_est"] = r.ts_est.dt.date
    r["d_clock"] = (r.ts_raw - pd.Timedelta(hours=1)).dt.date
    return r


def daily(h: pd.DataFrame, site: str, pollutant: str, col: str) -> pd.Series:
    """Valid daily means for one site under one day-binning convention."""
    cut = pd.Timestamp(CUTOFF).date()
    s = h[~h.excluded & (h.site_id == site) & (h.pollutant == pollutant)
          & (h[col] <= cut)]
    g = s.groupby(col).value.agg(["mean", "count"])
    return g[g["count"] >= MIN_HOURS]["mean"]


def stats(v: np.ndarray) -> tuple[float, float, float, float]:
    return (
        float(np.mean(v)),
        float(np.std(v, ddof=1)),
        float(np.median(v)),
        float(np.quantile(v, 0.98, method="linear")),
    )


def bracket(v) -> dict:
    """Rank position of the linear-interpolated p98 and the values it sits between.

    Accepts a Series so the two bracketing days can be named as well as valued;
    at these sites they are almost always smoke-window days.
    """
    days = None
    if isinstance(v, pd.Series):
        srt = v.sort_values()
        days, arr = [str(d) for d in srt.index], srt.to_numpy()
    else:
        arr = np.sort(np.asarray(v))
    n = len(arr)
    k = (n - 1) * 0.98
    lo = int(np.floor(k))
    exact = abs(k - lo) < 1e-9
    hi = lo if exact else min(lo + 1, n - 1)
    return {
        "rank": k + 1,
        "lo_rank": lo + 1, "lo_val": float(arr[lo]),
        "hi_rank": hi + 1, "hi_val": float(arr[hi]),
        "lo_day": days[lo] if days else "", "hi_day": days[hi] if days else "",
        "gap": float(arr[hi] - arr[lo]),
        "exact": exact,
    }


def method_spread(v: np.ndarray) -> tuple[float, float, float]:
    qs = [float(np.quantile(v, 0.98, method=m)) for m in METHODS]
    return min(qs), max(qs), max(qs) - min(qs)


def measure(v, published: tuple) -> dict:
    arr = v.to_numpy() if isinstance(v, pd.Series) else np.asarray(v)
    m, sd, med, p98 = stats(arr)
    dm, dsd, dmed, dp98 = published
    out = {
        "n": len(arr), "mean": m, "sd": sd, "median": med, "p98": p98,
        "d_mean": m - dm, "d_sd": sd - dsd, "d_median": med - dmed, "d_p98": p98 - dp98,
        "values": arr,
    }
    out.update(bracket(v))
    return out


# --------------------------------------------------------------- Phase 1.6 / 1.6c
def phase1(h: pd.DataFrame) -> dict[str, dict]:
    rows, keep = [], {}
    for slug, name in SITE.items():
        pub = T4[name]
        rec = {"site": name}
        for tag, col in (("reg", "d_est"), ("clock", "d_clock")):
            rec[tag] = measure(daily(h, slug, "PM2.5", col), pub)
        keep[slug] = rec
        row = {
            "report_date": REPORT_DATE, "data_cutoff": CUTOFF, "export_date": EXPORT_DATE,
            "site": name,
            "deq_mean": pub[0], "deq_sd": pub[1], "deq_median": pub[2], "deq_p98": pub[3],
        }
        for tag in ("reg", "clock"):
            a = rec[tag]
            row.update({
                f"{tag}_n": a["n"],
                f"{tag}_mean": round(a["mean"], 3), f"{tag}_delta_mean": round(a["d_mean"], 3),
                f"{tag}_sd": round(a["sd"], 3), f"{tag}_delta_sd": round(a["d_sd"], 3),
                f"{tag}_median": round(a["median"], 3),
                f"{tag}_delta_median": round(a["d_median"], 3),
                f"{tag}_p98": round(a["p98"], 3), f"{tag}_delta_p98": round(a["d_p98"], 3),
                f"{tag}_p98_rank": round(a["rank"], 2),
                f"{tag}_p98_lower_value": round(a["lo_val"], 2),
                f"{tag}_p98_upper_value": round(a["hi_val"], 2),
                f"{tag}_p98_lower_day": a["lo_day"],
                f"{tag}_p98_upper_day": a["hi_day"],
                f"{tag}_p98_gap": round(a["gap"], 2),
            })
        row["regulatory_convention_column_set"] = "reg_*"
        row["binning_note"] = BINNING_NOTE
        rows.append(row)
    write_csv("table4_full_comparison_2026-08-28.csv", rows)
    return keep


# ------------------------------------------------------------------- Phase 2.2
def phase2(keep: dict) -> None:
    rows = []
    for rec in keep.values():
        a = rec["reg"]
        mn, mx, spread = method_spread(a["values"])
        rows.append({
            "report_date": REPORT_DATE, "data_cutoff": CUTOFF, "export_date": EXPORT_DATE,
            "site": rec["site"],
            "valid_days": a["n"],
            "p98_rank": round(a["rank"], 2),
            "p98_rank_of_n": f"{round(a['rank'], 1)} of {a['n']}",
            "ranks_from_top": round(a["n"] - a["rank"] + 1, 2),
            "lower_bracket_rank": a["lo_rank"], "lower_bracket_value": round(a["lo_val"], 2),
            "lower_bracket_day": a["lo_day"],
            "upper_bracket_rank": a["hi_rank"], "upper_bracket_value": round(a["hi_val"], 2),
            "upper_bracket_day": a["hi_day"],
            "bracket_gap": round(a["gap"], 2),
            "p98_linear": round(a["p98"], 3),
            "deq_published_p98": T4[rec["site"]][3],
            "delta_vs_deq": round(a["d_p98"], 3),
            "method_min": round(mn, 2), "method_max": round(mx, 2),
            "method_spread": round(spread, 2),
            "interpolation_methods_tested": "|".join(METHODS),
            "day_binning": "hour-beginning local standard time (regulatory convention)",
            "note": RANK_NOTE,
        })
    rows.sort(key=lambda r: r["valid_days"])
    write_csv("p98_rank_position_2026-08-28.csv", rows)


# ------------------------------------------------------------------ Phase 1.6d
def phase1d(h: pd.DataFrame) -> list[dict]:
    """Days whose validity or value differs between the two day-binnings."""
    cut = pd.Timestamp(CUTOFF).date()
    rows = []
    for slug, name in SITE.items():
        s = h[~h.excluded & (h.site_id == slug) & (h.pollutant == "PM2.5")]
        cnt = {}
        for tag, col in (("reg", "d_est"), ("clock", "d_clock")):
            cnt[tag] = s[s[col] <= cut].groupby(col).value.agg(["mean", "count"])
        for d in sorted(set(cnt["reg"].index) | set(cnt["clock"].index)):
            rc = int(cnt["reg"]["count"].get(d, 0))
            cc = int(cnt["clock"]["count"].get(d, 0))
            rv = cnt["reg"]["mean"].get(d, float("nan"))
            cv = cnt["clock"]["mean"].get(d, float("nan"))
            r_ok, c_ok = rc >= MIN_HOURS, cc >= MIN_HOURS
            differs = r_ok != c_ok or (r_ok and c_ok and abs(rv - cv) >= 0.5)
            if not differs:
                continue
            rows.append({
                "report_date": REPORT_DATE, "data_cutoff": CUTOFF,
                "export_date": EXPORT_DATE, "site": name, "date": str(d),
                "reg_valid_hours": rc, "reg_meets_18_of_24": str(r_ok).lower(),
                "reg_daily_mean": None if rc == 0 else round(float(rv), 2),
                "clock_valid_hours": cc, "clock_meets_18_of_24": str(c_ok).lower(),
                "clock_daily_mean": None if cc == 0 else round(float(cv), 2),
                "crosses_completeness_threshold": str(r_ok != c_ok).lower(),
                "daily_mean_shift": (
                    None if (rc == 0 or cc == 0) else round(float(cv - rv), 2)
                ),
            })
    write_csv("p98_day_binning_residual_2026-08-28.csv", rows)
    return rows


# --------------------------------------------------------------------- Phase 5
ZERO_NOTE = (
    "excl_* applies the pipeline default, which drops exact-zero readings "
    "(exclusion_reason exact_zero_floor). retd_* readmits them and is a diagnostic "
    "column set only: the pipeline default is unchanged and the zeros-retained "
    "treatment remains scoped to the APEX 5 NO2 regression per DEQ correspondence "
    "of 2026-08-19. Which set reproduces DEQ's published row is pollutant-specific "
    "and is recorded in reproduces_under. Hours are truncated by hour-beginning "
    "local standard time."
)


def zero_policy_series(df: pd.DataFrame, pollutant: str, site_col: str,
                       site: str, cut) -> dict[str, np.ndarray]:
    sub = df[(df[site_col] == site) & (df.pollutant == pollutant) & (df.d_est <= cut)]
    return {
        "excl": sub[~sub.excluded].value.to_numpy(),
        "retd": sub[(~sub.excluded)
                    | (sub.exclusion_reason == "exact_zero_floor")].value.to_numpy(),
    }


def hourly_row(name: str, row_class: str, cutoff: str, export: str,
               series: dict[str, np.ndarray] | None, pub: tuple,
               comparable: str, cap_reason: str, unit: str,
               source_caveat: str = "") -> dict:
    out = {
        "report_date": REPORT_DATE, "site": name, "row_class": row_class,
        "unit": unit, "data_cutoff": cutoff, "export_date": export,
    }
    if series is None:
        for tag in ("excl", "retd"):
            out[f"{tag}_n_hours"] = None
            for k in STAT_KEYS:
                out[f"{tag}_{k}"] = None
                out[f"{tag}_delta_{k}"] = None
        reproduces, under = "not applicable, no export", ""
    else:
        for tag, v in series.items():
            m = measure(v, pub)
            out[f"{tag}_n_hours"] = m["n"]
            for k in STAT_KEYS:
                out[f"{tag}_{k}"] = round(m[k], 3)
                out[f"{tag}_delta_{k}"] = round(m[f"d_{k}"], 3)
        hits = [t for t in ("excl", "retd")
                if all(abs(out[f"{t}_delta_{k}"]) < 0.05 for k in STAT_KEYS)]
        if comparable != "yes":
            reproduces, under = "not applicable, window not comparable", ""
        elif hits:
            reproduces = "yes"
            under = {"excl": "zeros excluded (pipeline default)",
                     "retd": "zeros retained (diagnostic)"}[hits[0]]
        else:
            reproduces = "no"
            best = min(("excl", "retd"),
                       key=lambda t: max(abs(out[f"{t}_delta_{k}"]) for k in STAT_KEYS))
            under = ("closest under "
                     + {"excl": "zeros excluded (pipeline default)",
                        "retd": "zeros retained (diagnostic)"}[best])
    out.update({
        "deq_mean": pub[0], "deq_sd": pub[1], "deq_median": pub[2], "deq_p98": pub[3],
        "comparable_to_report": comparable,
        "cap_reason": cap_reason,
        "reproduces_at_deq_precision": reproduces,
        "reproduces_under": under,
        "pipeline_default_changed": "no",
        "source_caveat": source_caveat,
        "zero_policy_note": ZERO_NOTE,
    })
    return out


def hourly_table(h: pd.DataFrame, r: pd.DataFrame, pollutant: str,
                 published: dict, unit: str, fname: str,
                 reg_site: str = "ashburn",
                 reg_name: str = "Broad Run HS Regulatory Monitor",
                 reg_extra: str = "", source_caveat: str = "") -> list[dict]:
    cut = pd.Timestamp(CUTOFF).date()
    rcut = pd.Timestamp(REG_CUTOFF).date()
    rows = []
    for slug, name in SITE.items():
        rows.append(hourly_row(
            name, "low_cost_sensor", CUTOFF, EXPORT_DATE,
            zero_policy_series(h, pollutant, "site_id", slug, cut),
            published[name], "yes", "", unit, source_caveat))

    rows.append(hourly_row(
        reg_name, "regulatory_fem", REG_CUTOFF, "n/a, FOIA 26-4646 release",
        zero_policy_series(r, pollutant, "site_id", reg_site, rcut),
        published[reg_name], "no",
        "Regulatory record ends 2026-08-10 under FOIA 26-4646 while DEQ's published "
        "row covers the record through 2026-08-27. The windows cannot be aligned in "
        "either direction. Deltas are shown for completeness and are not counted as "
        "a reproduction." + reg_extra, unit, source_caveat))

    for name in RETIRED:
        rows.append(hourly_row(
            name, "low_cost_sensor", "", "none", None, published[name], "no",
            "Retired site. The Kunak dashboard shows 'Location without device' and no "
            "export exists, so this row cannot be checked at all.", unit, source_caveat))

    write_csv(fname, rows)
    return rows


def write_csv(fname: str, rows: list[dict]) -> None:
    with (OUT / fname).open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    print(f"wrote {OUT / fname}  ({len(rows)} rows)")


def main() -> None:
    h = load_sensor()
    r = load_regulatory()
    keep = phase1(h)
    phase2(keep)
    resid = phase1d(h)
    t1 = hourly_table(
        h, r, "CO", T1, "ppm", "table1_co_hourly_2026-08-28.csv",
        reg_site="aurhill", reg_name="Arlington Regulatory Monitor",
        reg_extra=(
            " This monitor is in Arlington, not Loudoun, and is carried out of v1 scope "
            "as DEQ's nearest CO comparator. DEQ voided 2026-03-31 to 2026-04-07 at this "
            "monitor; 173 of the 192 hours in that window are already excluded by AQS "
            "null codes in the released data, and 19 are not."),
        source_caveat=(
            "UNRESOLVED AVERAGING PERIOD. docs/GENARCH_RULES.md section 4 records the "
            "Kunak CO column as an 8-hour average, while DEQ's Table 1 is captioned "
            "'CO Hourly Concentrations' and places the sensor rows beside a 1-hour "
            "regulatory monitor. If the sensor column is an 8-hour average, the sensor "
            "rows of this table are not the same quantity as the regulatory row. The "
            "note predates this export, which is the first to carry a CO column at all, "
            "and it has not been reconfirmed against DEQ. Treat every sensor row here as "
            "provisional until the averaging period is settled with DEQ."))
    t2 = hourly_table(h, r, "NO2", T2, "ppb", "table2_no2_hourly_2026-08-28.csv")
    t3 = hourly_table(h, r, "PM2.5", T3, "ug/m3", "table3_pm25_hourly_2026-08-28.csv")

    print("\n=== Phase 1.6, Table 4, both binnings ===")
    print(f"{'site':22}{'n_reg':>6}{'dp98_reg':>10}{'n_clk':>7}{'dp98_clk':>10}"
          f"{'dmean_clk':>11}{'dsd_clk':>9}")
    for rec in keep.values():
        a, b = rec["reg"], rec["clock"]
        print(f"{rec['site']:22}{a['n']:6d}{a['d_p98']:+10.2f}{b['n']:7d}"
              f"{b['d_p98']:+10.2f}{b['d_mean']:+11.2f}{b['d_sd']:+9.2f}")

    print("\n=== Phase 1.6d, days differing between binnings ===")
    if not resid:
        print("none")
    for row in resid:
        print(f"{row['site']:22} {row['date']}  reg {row['reg_valid_hours']:2d}h "
              f"{str(row['reg_meets_18_of_24']):5} {row['reg_daily_mean']}   "
              f"clock {row['clock_valid_hours']:2d}h "
              f"{str(row['clock_meets_18_of_24']):5} {row['clock_daily_mean']}   "
              f"crosses={row['crosses_completeness_threshold']}")

    print("\n=== Phase 2.2, rank positions (regulatory binning) ===")
    print(f"{'site':22}{'n':>5}{'rank':>8}{'from_top':>10}{'lo':>8}{'hi':>8}"
          f"{'gap':>8}{'spread':>8}")
    for rec in sorted(keep.values(), key=lambda x: x["reg"]["n"]):
        a = rec["reg"]
        _, _, sp = method_spread(a["values"])
        print(f"{rec['site']:22}{a['n']:5d}{a['rank']:8.1f}"
              f"{a['n'] - a['rank'] + 1:10.1f}{a['lo_val']:8.1f}{a['hi_val']:8.1f}"
              f"{a['gap']:8.1f}{sp:8.2f}")

    for label, rows in (("Table 1 CO (ppm)", t1), ("Table 2 NO2 (ppb)", t2),
                        ("Table 3 PM2.5 (ug/m3)", t3)):
        print(f"\n=== Phase 5, {label} ===")
        print(f"{'site':32}{'zeros excluded (default)':>30}"
              f"{'zeros retained (diagnostic)':>32}   repro")
        print(f"{'':32}{'dmean':>8}{'dsd':>7}{'dmed':>7}{'dp98':>8}"
              f"{'dmean':>10}{'dsd':>7}{'dmed':>7}{'dp98':>8}")
        for row in rows:
            if row["excl_n_hours"] is None:
                print(f"{row['site']:32}{'-':>60}   "
                      f"{row['reproduces_at_deq_precision']}")
                continue
            cells = "".join(
                f"{row[f'{t}_delta_{k}']:{w}.2f}"
                for t, pad in (("excl", 0), ("retd", 2))
                for k, w in zip(STAT_KEYS, (f"+{8 + pad}", "+7", "+7", "+8"))
            )
            print(f"{row['site']:32}{cells}   "
                  f"{row['reproduces_at_deq_precision']}"
                  f"{' | ' + row['reproduces_under'] if row['reproduces_under'] else ''}")


if __name__ == "__main__":
    main()
