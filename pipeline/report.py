"""Generate the annual report's numbers, tables and figures.

    python -m pipeline.report --year 2026 --freeze data/reports/2026/FREEZE.json

Every figure the report states is recomputed here from the hash-pinned freeze, and
report prose cites `numbers.json` rather than typing a decimal (CONTEXT.md section
8). Without `--freeze` the command keeps its earlier behaviour and writes only the
report index.

Outputs use neutral site codes throughout. No internal slug, no DEQ school-derived
site name and no frozen filename reaches a value table, a figure label or alt text
(CONTEXT.md C7 and C8).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from pipeline.report_lib import (
    ancestry,
    ancestry_report,
    atlas,
    collocation,
    correlation,
    daily,
    figures,
    reconciliation,
    site_codes,
    tables,
    verify,
)
from pipeline.report_lib import freeze as freeze_lib
from pipeline.report_lib.freeze import Freeze, FreezeError
from pipeline.report_lib.numbers import NumberRegistry, display_text
from pipeline.report_lib.rounding import half_up
from pipeline.report_lib.rows import build_regulatory_rows, build_rows
from pipeline.reshape_deq import (
    DAILY_MIN_VALID_HOURS,
    REGULATORY_DAILY_FILE,
    VOID_WINDOWS,
    read_published_daily,
)

# site/src/lib/deq-data.ts. RECORD_END is date-level and drives the percentile
# windows; DEQ_EDITION_CUTOFF is hour-level and drives the collocation fits. The
# two are not interchangeable and neither is rewritten in terms of the other.
RECORD_END = date(2026, 8, 7)
COMMON_WINDOW_START = date(2026, 6, 18)
DEQ_EDITION_CUTOFF = datetime(2026, 8, 7, 7, 0)
DEQ_EDITION_CUTOFF_LABEL = "2026-08-07T07:00 EST"
PM25_24H_LEVEL = 35

# The regulatory form of the two PM2.5 standards, and the agreement tolerance the
# collocation reproduction is judged against. Both mirror constants the site already
# carries: PM25_ANNUAL_LEVEL and DEQ_TOLERANCE in site/src/lib/deq-data.ts. They are
# declared here so report prose can cite them through <N> rather than typing a decimal
# (CONTEXT.md section 8).
PM25_ANNUAL_LEVEL = 9.0
PM25_PERCENTILE = 98
PM25_AVERAGING_YEARS = 3
DEQ_TOLERANCE_COEFFICIENT = 0.05
DEQ_TOLERANCE_R2 = 0.03

# The live manifest and site history, which every weekly ingest rewrites. The
# report reads the frozen copies FREEZE.json config_inputs pins;
# `Freeze.config_path` redirects both.
MANIFEST_PATH = "pipeline/sources/manifest.json"
SITE_HISTORY_PATH = "pipeline/sources/deq_sensor_site_history.csv"

# The six sensors collecting across the common window.
COMMON_WINDOW_SITES = (
    "ashburn-collocated",
    "belfort-park",
    "dulles-area",
    "farmwell-middle",
    "golf-course",
    "sterling-ms",
)

# DEQ "Data Center Air Quality Analysis", 2026-08-07, Table 4, percentile_98.
# Transcribed from the frozen PDF; not computed.
DEQ_TABLE4_P98 = {
    "golf-course": 23.8,
    "belfort-park": 31.4,
    "ashburn-collocated": 25.5,
    "dulles-area": 18.4,
    "farmwell-middle": 26.0,
    "sterling-ms": 40.4,
    "heritage-farm": 9.7,
    "newberry-condo": 14.5,
    "steuart-weller": 10.2,
}

WHOLE_DAY_WINDOW = f"whole days through {RECORD_END.isoformat()}, 18 of 24 valid hours"
COMMON_WINDOW = (
    f"{COMMON_WINDOW_START.isoformat()} to {RECORD_END.isoformat()}, "
    "18 of 24 valid hours, exact zeros treated as missing"
)


REGULATORY_LABELS = {
    "AshburnPM2.5_030326_081026.xls": "Regulatory monitor, hourly PM2.5 (FOIA 26-4646)",
    "AshburnNO2_hourly_030326_081026.xls": "Regulatory monitor, hourly NO2 (FOIA 26-4646)",
    "AshburnPM2.5_dailyAvg_030326_081026.xls": (
        "Regulatory monitor, published daily average PM2.5 (FOIA 26-4646)"
    ),
    "AuroraHillsCO_hourly_030326_081026.xls": (
        "Reference monitor, hourly CO, Arlington County (FOIA 26-4646; outside v1 scope)"
    ),
}
CONFIG_LABELS = {
    "pipeline/sources/deq_sensor_site_history.csv": "Sensor site history",
    "pipeline/lookups/site_codes.json": "Site code lookup",
    "pipeline/sources/manifest.json": "Source provenance manifest",
}


def source_label(fz: Freeze, entry) -> str:
    """A neutral name for a frozen input.

    Frozen filenames embed the site slug, and C7 bars a slug from any public
    output, so sources are named by site code and identified by SHA-256.
    """
    if entry.rel_path in CONFIG_LABELS:
        return CONFIG_LABELS[entry.rel_path]
    if entry.site_id:
        origin = "original analysis inputs" if "aug-2026" in entry.rel_path else "data freeze"
        return f"Kunak hourly sensor export, {site_codes.code_for(entry.site_id)} ({origin})"
    if entry.path.name in REGULATORY_LABELS:
        return REGULATORY_LABELS[entry.path.name]
    for weekly in fz.doc["deq_weekly_reports"]:
        if weekly["frozen_path"] == entry.rel_path:
            suffix = entry.path.suffix.lstrip(".")
            return f"DEQ weekly report, {weekly['report_date']} ({suffix})"
    raise KeyError(f"no neutral label for frozen input {entry.rel_path}")


def inputs_for(fz: Freeze, entries) -> list[dict]:
    return [{"source": source_label(fz, e), "sha256": e.sha256} for e in entries]


def _resolve_data_dir() -> Path:
    return Path(__file__).resolve().parent.parent / "data"


def _resolve_reports_dir() -> Path:
    return _resolve_data_dir() / "reports"


# --------------------------------------------------------------- index.json


def generate_report(year: str | int, out_dir: str | Path | None = None) -> Path:
    """Generate the annual report index for a given year.

    `out_dir` defaults to `data/reports/<year>/`, the path this wrote to before
    it took the argument, so existing callers are unchanged. Tests pass a
    temporary directory: a pytest run must leave the working tree clean, which
    CI asserts after the suite.
    """
    year_str = str(year)
    if out_dir is not None:
        year_dir = Path(out_dir)
    else:
        year_dir = _resolve_reports_dir() / year_str
    year_dir.mkdir(parents=True, exist_ok=True)
    index_path = year_dir / "index.json"

    content = {
        "year": year_str,
        "title": f"GENARCH Annual Report {year_str}",
        "slug": year_str,
        "summary": (
            "Annual summary of atlas updates, data sources, and community engagement "
            f"for {year_str}."
        ),
        "content": f"## GENARCH Annual Report {year_str}\n\n"
        f"This report summarizes the GENARCH atlas updates for {year_str}.\n\n"
        f"### Highlights\n- Curated disease profiles with genetic architecture and "
        f"exposure modifiers\n"
        f"- Exposure definitions and system-level effects\n- Gene and pathway annotations\n"
        f"- Mechanism briefs explaining GxE hypotheses\n- Knowledge graph of entity "
        f"relationships\n"
        f"- Community module foundations\n\n"
        f"### Data Sources\n- GWAS Catalog, GTEx, literature curation\n"
        f"- See /methods for full pipeline documentation\n",
        "pdf_path": None,
    }

    # The PDF build is the only writer of the three pdf_* fields, and it runs long
    # after this function last ran (DECISIONS.md D21). Rewriting the file wholesale
    # would set pdf_path back to None on the next no-freeze invocation and the page
    # would stop offering a PDF that is sitting in site/public, so carry whatever is
    # already recorded instead of overwriting it.
    if index_path.exists():
        existing = json.loads(index_path.read_text(encoding="utf-8"))
        for field in ("pdf_path", "pdf_bytes", "pdf_sha256"):
            if existing.get(field) is not None:
                content[field] = existing[field]

    index_path.write_text(
        json.dumps(content, indent=2, ensure_ascii=False),
        encoding="utf-8",
        newline="\n",
    )
    return index_path


# ------------------------------------------------------------------ compute


def compute(fz: Freeze) -> dict:
    """Recompute every DEQ finding the report states, from the freeze."""
    august = [fz.verified_path(f.rel_path) for f in fz.original_analysis_inputs()]
    frozen = [fz.verified_path(f.rel_path) for f in fz.kunak_exports()]

    # Occupancy comes from the frozen copy of the site history, the one
    # `config_inputs` pins and hash-verifies, not from the live file a weekly
    # ingest rewrites. `build_rows` defaults to the live path, which left unit
    # periods as the one freeze input the report still read off the working tree
    # (DECISIONS.md D28). A unit backfilled or re-dated after the freeze now
    # cannot move a 2026 number.
    site_history = fz.config_path(SITE_HISTORY_PATH)
    august_rows = build_rows(august, site_history)
    frozen_rows = build_rows(frozen, site_history)
    active_at_deq_cutoff = sorted(
        {
            row["site_id"]
            for row in august_rows
            if row["pollutant"] == "PM2.5"
            and not row["excluded"]
            and row["value"] not in (None, "")
            and DEQ_EDITION_CUTOFF - timedelta(hours=24) <= row["ts_est"] < DEQ_EDITION_CUTOFF
        }
    )
    regulatory_rows = build_regulatory_rows(
        lambda name: fz.verified_path(fz.regulatory_named(name).rel_path)
    )
    published = read_published_daily(
        fz.verified_path(fz.regulatory_named(REGULATORY_DAILY_FILE).rel_path)
    )

    backfill_spec = next(
        spec for spec in collocation.DEQ_PUBLISHED if spec.key == "apex-05_NO2"
    )
    results: dict = {
        "collocation": collocation.fit_all(august_rows, regulatory_rows),
        # DECISIONS.md D16. The same fit over the freeze inputs rather than the
        # original analysis inputs. It is the only one of the four that moves,
        # because it is the only one that retains readings of zero and so the only
        # one the dashboard's all-zero backfill rows can enter. Reported beside the
        # August values rather than in place of them: DEQ's published coefficients
        # correspond to the August inputs.
        "collocation_backfill": collocation.fit_one(
            frozen_rows, regulatory_rows, backfill_spec
        ),
        "reconciliation": reconciliation.reconcile(regulatory_rows, published),
        "correlation": correlation.correlations(august_rows, list(COMMON_WINDOW_SITES)),
        "active_at_deq_cutoff": active_at_deq_cutoff,
    }

    # Percentiles, both day definitions, whole days and DEQ's edition cutoff.
    means = {
        ("standard", False, None): daily.daily_means(frozen_rows, daily.STANDARD),
        ("clock", False, None): daily.daily_means(frozen_rows, daily.CLOCK),
        ("clock", True, None): daily.daily_means(
            frozen_rows, daily.CLOCK, retain_zeros=True
        ),
        ("standard", False, "cut"): daily.daily_means(
            frozen_rows, daily.STANDARD, cutoff_est=DEQ_EDITION_CUTOFF
        ),
        ("clock", False, "cut"): daily.daily_means(
            frozen_rows, daily.CLOCK, cutoff_est=DEQ_EDITION_CUTOFF
        ),
    }
    results["means"] = means

    for binning, key in (("standard", "p98_common_standard"), ("clock", "p98_common_clock")):
        results[key] = {}
        results[key + "_deq_cutoff"] = {}
        for site in COMMON_WINDOW_SITES:
            whole = daily.window_days(
                means[(binning, False, None)].get(site, {}), COMMON_WINDOW_START, RECORD_END
            )
            cut = daily.window_days(
                means[(binning, False, "cut")].get(site, {}), COMMON_WINDOW_START, RECORD_END
            )
            results[key][site] = {"p98": daily.p98(whole.values()), "days": len(whole)}
            results[key + "_deq_cutoff"][site] = {
                "p98": daily.p98(cut.values()),
                "days": len(cut),
            }

    # Full-record variants, the nine sites in DEQ's 2026-08-07 Table 4.
    results["p98_full"] = {}
    for site in sorted(DEQ_TABLE4_P98):
        variants = {}
        for label, combo in (
            ("lst_zero_missing", ("standard", False, None)),
            ("clock_zero_missing", ("clock", False, None)),
            ("clock_zero_kept", ("clock", True, None)),
        ):
            days = {
                d: v for d, v in means[combo].get(site, {}).items() if d <= RECORD_END
            }
            variants[label] = {"p98": daily.p98(days.values()), "days": len(days)}
        variants["deq_table4"] = DEQ_TABLE4_P98[site]
        results["p98_full"][site] = variants

    # Record days and coverage, full frozen record.
    results["record"] = {}
    for site, days in means[("standard", False, None)].items():
        through = {d: v for d, v in days.items() if d <= RECORD_END}
        cut = {
            d: v
            for d, v in means[("standard", False, "cut")].get(site, {}).items()
            if d <= RECORD_END
        }
        results["record"][site] = {
            "days_through_record_end": len(through),
            "days_deq_cutoff": len(cut),
            "full_days": len(days),
            "first_day": min(days) if days else None,
            "last_day": max(days) if days else None,
            "all_days": sorted(days),
        }

    # Share of complete site-days below 35, full frozen record.
    loudoun = {s.site_id for s in site_codes.load() if s.in_v1_scope}
    share = {"loudoun": [0, 0], "all": [0, 0], "by_site": {}}
    for site, days in means[("standard", False, None)].items():
        below, total = daily.days_below(days, PM25_24H_LEVEL)
        share["by_site"][site] = (below, total)
        share["all"][0] += below
        share["all"][1] += total
        if site in loudoun:
            share["loudoun"][0] += below
            share["loudoun"][1] += total
    results["share_below_35"] = share

    # The same share and the common-window percentiles with the smoke window left
    # out, under both day definitions (GENARCH_RULES.md section 6: every summary
    # statistic is reported with and without the smoke window). A day is dropped
    # when its date, under the day definition in use, falls in the window.
    def drop_smoke(days: dict) -> dict:
        return {
            d: v
            for d, v in days.items()
            if not (correlation.SMOKE_START <= d <= correlation.SMOKE_END)
        }

    ex_share = [0, 0]
    for site, days in means[("standard", False, None)].items():
        if site not in loudoun:
            continue
        below, total = daily.days_below(drop_smoke(days), PM25_24H_LEVEL)
        ex_share[0] += below
        ex_share[1] += total
    results["share_below_35_ex_smoke"] = ex_share
    for binning, key in (("standard", "p98_common_standard"), ("clock", "p98_common_clock")):
        results[key + "_ex_smoke"] = {}
        for site in COMMON_WINDOW_SITES:
            whole = drop_smoke(
                daily.window_days(
                    means[(binning, False, None)].get(site, {}),
                    COMMON_WINDOW_START,
                    RECORD_END,
                )
            )
            results[key + "_ex_smoke"][site] = {
                "p98": daily.p98(whole.values()),
                "days": len(whole),
            }
        # The same under DEQ's edition cutoff (audit round 2, S2): the DEQ-cutoff
        # common-window percentile is GENARCH's own statistic, not a reproduction of a
        # DEQ-published one, so it is stated both ways (GENARCH_RULES.md section 6).
        results[key + "_ex_smoke_deq_cutoff"] = {}
        for site in COMMON_WINDOW_SITES:
            cut = drop_smoke(
                daily.window_days(
                    means[(binning, False, "cut")].get(site, {}),
                    COMMON_WINDOW_START,
                    RECORD_END,
                )
            )
            results[key + "_ex_smoke_deq_cutoff"][site] = {
                "p98": daily.p98(cut.values()),
                "days": len(cut),
            }

    # The days that set each common-window percentile, and whether all of them fall in
    # the smoke window, per site and day definition (D58). Under linear interpolation
    # the index is (n - 1) x 0.98; the days that set the value are the order statistics
    # carrying non-zero weight: one when the index is whole (51 days gives exactly 49),
    # two otherwise (audit round 2, S4).
    set_by_smoke = {}
    for binning in ("standard", "clock"):
        n_sites = 0
        for site in COMMON_WINDOW_SITES:
            days = daily.window_days(
                means[(binning, False, None)].get(site, {}), COMMON_WINDOW_START, RECORD_END
            )
            ordered = sorted(days, key=lambda d: days[d])
            k = (len(ordered) - 1) * 0.98
            lower = int(k)
            if abs(k - round(k)) < 1e-9:
                setting = {ordered[int(round(k))]}
            else:
                setting = {ordered[lower], ordered[min(lower + 1, len(ordered) - 1)]}
            if all(correlation.SMOKE_START <= d <= correlation.SMOKE_END for d in setting):
                n_sites += 1
        set_by_smoke[binning] = n_sites
    results["p98_common_set_by_smoke"] = set_by_smoke
    # The common-window record lengths at which the interpolation index is whole, so a
    # single day sets the percentile (audit round 2, S4).
    whole_index = set()
    for binning in ("standard", "clock"):
        for site in COMMON_WINDOW_SITES:
            n = len(
                daily.window_days(
                    means[(binning, False, None)].get(site, {}),
                    COMMON_WINDOW_START,
                    RECORD_END,
                )
            )
            k = (n - 1) * 0.98
            if abs(k - round(k)) < 1e-9:
                whole_index.add(n)
    results["p98_common_whole_index_days"] = sorted(whole_index)

    # Site-days at or above the level, with the smoke window included, and how many
    # of them fall inside it (D58).
    at_or_above = [
        d
        for site, days in means[("standard", False, None)].items()
        if site in loudoun
        for d, v in days.items()
        if v >= PM25_24H_LEVEL
    ]
    results["at_or_above_35"] = {
        "total": len(at_or_above),
        "in_smoke": sum(
            1 for d in at_or_above if correlation.SMOKE_START <= d <= correlation.SMOKE_END
        ),
    }

    # Each site's own-record percentile with the smoke window excluded, local standard
    # time, zeros missing (D58).
    results["p98_full_lst_ex_smoke"] = {}
    for site in sorted(DEQ_TABLE4_P98):
        days = drop_smoke(
            {
                d: v
                for d, v in means[("standard", False, None)].get(site, {}).items()
                if d <= RECORD_END
            }
        )
        results["p98_full_lst_ex_smoke"][site] = {
            "p98": daily.p98(days.values()),
            "days": len(days),
        }

    # The correlation with the smoke window included, beside the reported one (D58).
    results["correlation_with_smoke"] = correlation.correlations(
        august_rows, list(COMMON_WINDOW_SITES), exclude_smoke=False
    )

    results["backfill_hours"] = backfilled_all_zero_hours(august_rows, frozen_rows)

    # The regulatory record: the last hour carrying a value, and the last day that
    # clears the completeness threshold.
    pm25_reg = [
        row
        for row in regulatory_rows
        if row["site_id"] == reconciliation.REGULATORY_SITE
        and row["pollutant"] == "PM2.5"
        and row["value"] not in (None, "")
    ]
    complete = [
        d
        for d, rec in reconciliation.recomputed_days(regulatory_rows).items()
        if rec["valid_hours"] >= DAILY_MIN_VALID_HOURS
    ]
    results["regulatory"] = {
        "record_end": max(row["ts_est"] for row in pm25_reg).date().isoformat(),
        "last_complete_day": max(complete).isoformat(),
    }

    # Sensor PM2.5 readings DEQ voided, inside the first unit's collocation period.
    void = next(w for w in VOID_WINDOWS if w[-1] == "kunak_pm25_void_window")
    results["pm25_void"] = {
        "start": void[3].isoformat(),
        "end": void[4].isoformat(),
        "apex14_hours": sum(
            1
            for row in august_rows
            if row["site_id"] == collocation.COLLOCATED_SITE
            and row["pollutant"] == "PM2.5"
            and row["unit_id"] == "apex-14"
            and row["exclusion_reason"] == "kunak_pm25_void_window"
        ),
    }
    return results


def backfilled_all_zero_hours(august_rows: list[dict], frozen_rows: list[dict]) -> list[tuple]:
    """Hours the dashboard filled after the original analysis, every channel zero.

    An hour is counted when the freeze exports carry it, the original analysis
    exports do not, and it lies inside the span the original export covered for that
    site. Every such hour is expected to read zero on every channel (AUDIT.md round 2,
    Task 1b); one that does not raises, because it would be a different finding.
    """

    def by_hour(rows: list[dict]) -> dict:
        out: dict = {}
        for row in rows:
            out.setdefault((row["site_id"], row["ts_raw"]), {})[row["pollutant"]] = row["value"]
        return out

    august = by_hour(august_rows)
    frozen = by_hour(frozen_rows)
    span: dict[str, tuple] = {}
    for site, ts in august:
        lo, hi = span.get(site, (ts, ts))
        span[site] = (min(lo, ts), max(hi, ts))
    added = []
    for (site, ts), values in sorted(frozen.items()):
        if site not in span or (site, ts) in august:
            continue
        lo, hi = span[site]
        if not lo <= ts <= hi:
            continue
        readings = [v for v in values.values() if v not in (None, "")]
        if not readings or any(float(v) != 0.0 for v in readings):
            raise ValueError(f"backfilled hour {site} {ts} is not all-zero: {values}")
        added.append((site, ts))
    return added


# ------------------------------------------------------------------ numbers


def build_numbers(fz: Freeze, results: dict) -> NumberRegistry:
    reg = NumberRegistry()
    kunak_inputs = inputs_for(fz, fz.kunak_exports())
    august_inputs = inputs_for(fz, fz.original_analysis_inputs())
    regulatory_inputs = inputs_for(fz, fz.regulatory())
    table4_pdf = [
        e for e in fz.weekly_reports() if e.rel_path.endswith("2026-08-07_data_center_air_quality_analysis.pdf")
    ]
    table4_inputs = inputs_for(fz, table4_pdf)

    code_of = site_codes.code_for

    # ---- freeze
    reg.add(
        "freeze.cutoff",
        fz.kunak_cutoff(),
        method="latest hour carrying a non-empty pollutant value across the frozen "
        "sensor exports, local clock, hour-ending",
        inputs=kunak_inputs,
    )
    reg.add(
        "freeze.commit",
        fz.git_head,
        method="git HEAD recorded in FREEZE.json when the freeze was taken",
        inputs=[],
    )
    reg.add(
        "freeze.commit_rewritten",
        freeze_lib.checked_rewritten_freeze_commit(),
        method="the commit that carries the freeze's tree after the 2026-10-25 authorship "
        "rewrite, which changed every commit identifier and no file content "
        "(docs/report-2026/AUDIT.md, rewrite map). Checked with git on every run: the "
        "commit must exist and be an ancestor of HEAD",
        inputs=[],
    )
    for entry in fz.kunak_exports():
        reg.add(
            f"freeze.export_dates.{code_of(entry.site_id)}",
            entry.export_date,
            method="export date recorded in FREEZE.json for this site's frozen sensor export",
            inputs=inputs_for(fz, [entry]),
        )
    reg.add(
        "deq.edition_cutoff",
        DEQ_EDITION_CUTOFF_LABEL,
        method="each weekly edition is built from data through 07:00 that Friday, "
        "confirmed by agency staff",
        inputs=table4_inputs,
    )

    # ---- the standards themselves
    #
    # Not measurements and not derived from the freeze: these are the levels and the
    # statistical form the Code of Federal Regulations sets, carried as keys so the
    # report states them through <N> and types no decimal. The regulatory citation is
    # the provenance, which is why `inputs` is empty rather than naming a frozen file.
    reg.add(
        "naaqs.annual_standard",
        PM25_ANNUAL_LEVEL,
        unit="µg/m³",
        precision=1,
        window="annual primary standard, 2024 revision",
        method="level of the annual PM2.5 primary standard, 40 CFR 50.20, as revised in "
        "2024 (89 FR 16380). Evaluated as a three-year average of annual means and not evaluable "
        "against a low-cost sensor record",
    )
    reg.add(
        "naaqs.daily_standard",
        PM25_24H_LEVEL,
        unit="µg/m³",
        precision=0,
        window="24-hour standard",
        method="level of the 24-hour PM2.5 primary standard, 40 CFR 50.20. A single hourly "
        "reading above this level is not an exceedance of it",
    )
    reg.add(
        "naaqs.percentile",
        PM25_PERCENTILE,
        unit="percentile",
        precision=0,
        method="the percentile of daily 24-hour averages the 24-hour standard is "
        "evaluated on, 40 CFR Part 50 Appendix N",
    )
    reg.add(
        "naaqs.averaging_years",
        PM25_AVERAGING_YEARS,
        unit="years",
        precision=0,
        method="consecutive years the 98th percentile is averaged over before the "
        "24-hour standard is evaluated, 40 CFR Part 50 Appendix N",
    )

    # ---- network
    all_sites = site_codes.load()
    reg.add(
        "network.sites_total",
        len(all_sites),
        unit="sites",
        precision=0,
        method="distinct physical sites in the sensor site history",
        inputs=inputs_for(fz, [fz.config_input(SITE_HISTORY_PATH)]),
    )
    cutoff = fz.kunak_cutoff()
    active = sum(1 for e in fz.kunak_exports() if e.data_cutoff == cutoff)
    reg.add(
        "network.sites_active_at_cutoff",
        active,
        unit="sites",
        precision=0,
        method="sites whose frozen export still carries data at the freeze cutoff",
        inputs=kunak_inputs,
    )
    deq_active = [code_of(site) for site in results["active_at_deq_cutoff"]]
    reg.add(
        "network.sites_active_at_deq_cutoff",
        len(deq_active),
        unit="sites",
        precision=0,
        window=f"24 hours ending {DEQ_EDITION_CUTOFF_LABEL}",
        method="sites in the original analysis inputs carrying at least one valid PM2.5 "
        "reading in the 24 hours before DEQ's edition cutoff, exclusion flags applied: "
        + ", ".join(sorted(deq_active)),
        inputs=august_inputs,
    )
    for site, rec in sorted(results["record"].items()):
        code = code_of(site)
        reg.add(
            f"network.record_days.{code}",
            rec["days_through_record_end"],
            unit="days",
            precision=0,
            window=WHOLE_DAY_WINDOW,
            method="complete days, local standard time binning, exact zeros treated as missing",
            inputs=kunak_inputs,
        )
        reg.add(
            f"network.record_days.{code}.deq_cutoff",
            rec["days_deq_cutoff"],
            unit="days",
            precision=0,
            window=f"data through {DEQ_EDITION_CUTOFF_LABEL}, 18 of 24 valid hours",
            method="complete days under DEQ's stated edition cutoff, local standard time binning",
            inputs=kunak_inputs,
        )
    reg.add(
        "network.common_window.start",
        COMMON_WINDOW_START.isoformat(),
        method="first day on which all six deployed sensors were collecting",
        inputs=kunak_inputs,
    )
    reg.add(
        "network.common_window.end",
        RECORD_END.isoformat(),
        method="last whole day of the window, matching the 2026-08-07 DEQ edition",
        inputs=kunak_inputs,
    )

    # ---- share below 35
    share = results["share_below_35"]
    l_below, l_total = share["loudoun"]
    a_below, a_total = share["all"]
    reg.add(
        "summary.share_site_days_below_35",
        100 * l_below / l_total,
        unit="percent",
        precision=2,
        n=l_total,
        window="full frozen record, 18 of 24 valid hours, exact zeros treated as missing",
        method=f"{l_below} of {l_total} complete site-days strictly below 35 microgram per "
        "cubic metre across the nine Loudoun County sites; the regulatory monitor is not "
        "included",
        inputs=kunak_inputs,
    )
    reg.add(
        "summary.share_site_days_below_35.all_sites",
        100 * a_below / a_total,
        unit="percent",
        precision=2,
        n=a_total,
        window="full frozen record, 18 of 24 valid hours, exact zeros treated as missing",
        method=f"{a_below} of {a_total} complete site-days strictly below 35 microgram per "
        "cubic metre across all twelve sites, including the three outside Loudoun County; "
        "reported for the methods note only",
        inputs=kunak_inputs,
    )
    for site, (below, total) in sorted(share["by_site"].items()):
        if not site_codes.by_site_id(site).in_v1_scope:
            continue
        reg.add(
            f"summary.share_site_days_below_35.{code_of(site)}",
            100 * below / total,
            unit="percent",
            precision=2,
            n=total,
            window="full frozen record, 18 of 24 valid hours, exact zeros treated as missing",
            method=f"{below} of {total} complete site-days strictly below 35 microgram per "
            "cubic metre at this site",
            inputs=kunak_inputs,
        )

    # ---- collocation
    method = (
        "OLS with the sensor on x and the regulatory monitor on y; paired on ts_est; "
        "excluded flags applied on both sides; collocation period assigned by unit_id from "
        f"the occupancy table; the fit stops at {DEQ_EDITION_CUTOFF_LABEL}"
    )
    matches = near = 0
    for fit in results["collocation"]:
        base = f"colloc.{fit['key']}"
        zeros = (
            " exact zeros retained in this fit only, confirmed by agency staff"
            if fit["retains_exact_zeros"]
            else " exact zeros treated as missing"
        )
        window = f"{fit['period_start']} to {fit['period_end']} EST"
        # DECISIONS.md D54, D67: the APEX 5 NO2 comparison values are unpublished values
        # supplied by agency staff for the 2026-08-07 edition window, not a printed value.
        deq_note = (
            "unpublished values supplied by agency staff for the same window, the "
            "2026-08-07 edition window, two significant figures; not printed in an edition. "
            "DEQ's 2026-08-21 edition prints a different fit for that regression over a "
            "longer window, deq.aug21.apex-05_NO2.*"
            if fit["key"] == "apex-05_NO2"
            else "DEQ published, two significant figures"
        )
        for field, value, precision, note in (
            ("deq_intercept", fit["deq_intercept"], None, deq_note),
            ("deq_slope", fit["deq_slope"], None, deq_note),
            ("deq_r2", fit["deq_r2"], None, deq_note),
            ("gx_intercept", fit["gx_intercept"], 3, method + ";" + zeros),
            ("gx_slope", fit["gx_slope"], 3, method + ";" + zeros),
            ("gx_r2", fit["gx_r2"], 3, method + ";" + zeros),
            ("diff_intercept", fit["diff_intercept"], 3, "recomputed minus DEQ published"),
            ("diff_slope", fit["diff_slope"], 3, "recomputed minus DEQ published"),
            ("diff_r2", fit["diff_r2"], 3, "recomputed minus DEQ published"),
        ):
            reg.add(
                f"{base}.{field}",
                value,
                unit=fit["unit"] if "r2" not in field else None,
                precision=precision,
                n=fit["n_pairs"],
                window=window,
                method=note,
                inputs=august_inputs + regulatory_inputs,
            )
        reg.add(
            f"{base}.n_pairs",
            fit["n_pairs"],
            unit="paired hours",
            precision=0,
            window=window,
            method=method,
            inputs=august_inputs + regulatory_inputs,
        )
        for field in ("period_start", "period_end"):
            reg.add(
                f"{base}.{field}",
                fit[field],
                method="first and last paired hour entering the fit, EST",
                inputs=august_inputs + regulatory_inputs,
            )
        reg.add(
            f"{base}.status",
            fit["status"],
            method="each recomputed value rounded to the number of decimals DEQ printed for "
            "it; all three equal means the fit matches DEQ at DEQ's own published precision. "
            "Agreement to three decimals is not verifiable against the source and is not "
            "claimed (GENARCH_RULES.md section 9)",
            inputs=august_inputs + regulatory_inputs,
        )
        if fit["status"] == collocation.STATUS_MATCH:
            matches += 1
        else:
            near += 1

    count_method = (
        "internal tally for these tables only. GENARCH_RULES.md section 9 bars describing "
        "the four regressions as a count of how many match: two are closed windows whose "
        "published values cannot drift and two are open and refit weekly. Report prose "
        "describes them in those terms instead"
    )
    reg.add("colloc.match_count", matches, unit="regressions", precision=0, method=count_method)
    reg.add("colloc.near_count", near, unit="regressions", precision=0, method=count_method)

    tolerance_method = (
        "agreement tolerance against DEQ's published coefficients, GENARCH_RULES.md "
        "section 9, asserted as DEQ_TOLERANCE in site/src/lib/deq-data.ts. A coefficient "
        "outside tolerance fails the build"
    )
    reg.add(
        "colloc.tolerance_coefficient",
        DEQ_TOLERANCE_COEFFICIENT,
        unit="pollutant units",
        precision=2,
        method=tolerance_method + ", and applies to the intercept and the slope",
    )
    reg.add(
        "colloc.tolerance_r2",
        DEQ_TOLERANCE_R2,
        precision=2,
        method=tolerance_method + ", and applies to R-squared",
    )

    backfill = results["collocation_backfill"]
    backfill_method = (
        "the APEX 5 NO2 regression recomputed over the data freeze inputs instead of "
        "the original analysis inputs. It is the only one of the four that moves, "
        "because it is the only fit that retains readings of zero and so the only one "
        "the Kunak dashboard's all-zero backfill rows can enter (DECISIONS.md D16). "
        "DEQ's published coefficients correspond to the original inputs, so this is "
        "recorded beside the reported fit and never in place of it"
    )
    for field, unit, precision in (
        ("gx_intercept", "ppb", 3),
        ("gx_slope", "ppb", 3),
        ("gx_r2", None, 3),
        ("n_pairs", "paired hours", 0),
    ):
        reg.add(
            f"colloc.apex-05_NO2.backfill_{field}",
            backfill[field],
            unit=unit,
            precision=precision,
            n=backfill["n_pairs"],
            window=f"{backfill['period_start']} to {backfill['period_end']} EST",
            method=backfill_method,
            inputs=kunak_inputs + regulatory_inputs,
        )

    reg.add(
        "p98.reproduction_tolerance",
        DEQ_TOLERANCE_COEFFICIENT,
        unit="µg/m³",
        precision=2,
        method="the margin within which a recomputed 98th percentile is treated as "
        "reproducing DEQ's published Table 4 value (AUDIT.md Task 5b). DEQ prints that "
        "column to one decimal, so this is half of the last printed digit",
        inputs=table4_inputs,
    )

    # ---- daily reconciliation
    rec = results["reconciliation"]
    rec_window = f"{rec['window_start']} to {rec['window_end']}"
    rec_method = (
        "recomputed 24-hour means of the regulatory monitor against DEQ's published dailyAvg "
        "file, truncated to one decimal as DEQ truncates. Comparable means the published day "
        "survives the null-code and \"<\" exclusions and the recomputed day clears 18 of 24 "
        "valid hours"
    )
    for key, value, unit, precision in (
        ("daily.n_days", rec["n_days"], "days", 0),
        ("daily.n_match", rec["n_match"], "days", 0),
        ("daily.mean_abs_diff", rec["mean_abs_diff"], "µg/m³", 4),
        ("daily.max_abs_diff", rec["max_abs_diff"], "µg/m³", 4),
    ):
        reg.add(
            key,
            value,
            unit=unit,
            precision=precision,
            n=rec["n_days"],
            window=rec_window,
            method=rec_method,
            inputs=regulatory_inputs,
        )

    # ---- percentiles
    for binning, prefix, key in (
        ("local standard time", "p98.common", "p98_common_standard"),
        ("local clock time", "p98.common_clock", "p98_common_clock"),
    ):
        ranked = sorted(results[key].items(), key=lambda kv: -kv[1]["p98"])
        cut_ranked = sorted(
            results[key + "_deq_cutoff"].items(), key=lambda kv: -kv[1]["p98"]
        )
        cut_rank = {site: rank for rank, (site, _) in enumerate(cut_ranked, start=1)}
        for rank, (site, got) in enumerate(ranked, start=1):
            code = code_of(site)
            reg.add(
                f"{prefix}.{code}",
                got["p98"],
                unit="µg/m³",
                precision=3,
                n=got["days"],
                window=COMMON_WINDOW,
                method=f"98th percentile of daily averages by linear interpolation, "
                f"{binning} day binning",
                inputs=kunak_inputs,
            )
            reg.add(
                f"{prefix}.rank.{code}",
                rank,
                unit="rank",
                precision=0,
                n=len(ranked),
                window=COMMON_WINDOW,
                method=f"rank on the common window, {binning} day binning, highest first",
                inputs=kunak_inputs,
            )
            cut = results[key + "_deq_cutoff"][site]
            reg.add(
                f"{prefix}.rank.{code}.deq_cutoff",
                cut_rank[site],
                unit="rank",
                precision=0,
                n=len(ranked),
                window=f"{COMMON_WINDOW_START.isoformat()} to {DEQ_EDITION_CUTOFF_LABEL}, "
                "18 of 24 valid hours, exact zeros treated as missing",
                method=f"rank under DEQ's stated edition cutoff, {binning} day binning, "
                "highest first",
                inputs=kunak_inputs,
            )
            reg.add(
                f"{prefix}.{code}.deq_cutoff",
                cut["p98"],
                unit="µg/m³",
                precision=3,
                n=cut["days"],
                window=f"{COMMON_WINDOW_START.isoformat()} to {DEQ_EDITION_CUTOFF_LABEL}, "
                "18 of 24 valid hours, exact zeros treated as missing",
                method=f"98th percentile under DEQ's stated edition cutoff, {binning} "
                "day binning",
                inputs=kunak_inputs,
            )
        above = sum(1 for v in results[key].values() if v["p98"] > PM25_24H_LEVEL)
        reg.add(
            f"{prefix}.n_above_35",
            above,
            unit="sites",
            precision=0,
            n=len(ranked),
            window=COMMON_WINDOW,
            method=f"sites whose common-window 98th percentile exceeds 35 microgram per cubic "
            f"metre, {binning} day binning. Not a NAAQS comparison",
            inputs=kunak_inputs,
        )

    reg.add(
        "p98.common.n_sites",
        len(results["p98_common_standard"]),
        unit="sites",
        precision=0,
        window=COMMON_WINDOW,
        method="sensors collecting across the whole common window, the set every "
        "common-window percentile, rank and count is computed over",
        inputs=kunak_inputs,
    )

    rises = sorted(
        results["p98_common_clock"][site]["p98"] - results["p98_common_standard"][site]["p98"]
        for site in results["p98_common_standard"]
    )
    rise_method = (
        "per-site difference between the local clock time and local standard time "
        "98th percentile on the common window. Clock binning raises every site and "
        "reorders none of them"
    )
    reg.add(
        "p98.common_clock.rise_min",
        rises[0],
        unit="µg/m³",
        precision=3,
        n=len(rises),
        window=COMMON_WINDOW,
        method="smallest " + rise_method,
        inputs=kunak_inputs,
    )
    reg.add(
        "p98.common_clock.rise_max",
        rises[-1],
        unit="µg/m³",
        precision=3,
        n=len(rises),
        window=COMMON_WINDOW,
        method="largest " + rise_method,
        inputs=kunak_inputs,
    )

    for site, variants in sorted(results["p98_full"].items()):
        code = code_of(site)
        for label in ("lst_zero_missing", "clock_zero_missing", "clock_zero_kept"):
            got = variants[label]
            reg.add(
                f"p98.full.{code}.{label}",
                got["p98"],
                unit="µg/m³",
                precision=3,
                n=got["days"],
                window=WHOLE_DAY_WINDOW,
                method=f"98th percentile over the site's own record, variant {label}",
                inputs=kunak_inputs,
            )
        reg.add(
            f"p98.full.{code}.deq_table4",
            variants["deq_table4"],
            unit="µg/m³",
            method="transcribed from Table 4 of DEQ's 2026-08-07 report; not computed here",
            inputs=table4_inputs,
        )

    # ---- correlation and smoke
    corr = results["correlation"]
    corr_method = (
        "Pearson correlation of hourly PM2.5 between each pair of the six sensors, "
        "pairwise-complete on ts_est, smoke-window hours excluded, exact zeros treated as "
        "missing. Descriptive only: high spatial correlation does not establish that local "
        "sources contribute nothing"
    )
    for key, value in (("corr.min", corr["r_min"]), ("corr.max", corr["r_max"])):
        reg.add(
            key,
            value,
            unit="Pearson r",
            precision=3,
            n=len(corr["pairs"]),
            window="full record of the original analysis inputs, smoke window excluded",
            method=corr_method,
            inputs=august_inputs,
        )
    reg.add(
        "corr.n_hours",
        corr["n_hours"],
        unit="hours",
        precision=0,
        n=len(corr["pairs"]),
        window="full record of the original analysis inputs, smoke window excluded",
        method="distinct hours carrying a valid reading at one or more of the six sensors",
        inputs=august_inputs,
    )
    reg.add(
        "smoke.window_start",
        correlation.SMOKE_START.isoformat(),
        method="start of the Canadian wildfire transport window, DEQ qualifier IF",
        inputs=august_inputs,
    )
    reg.add(
        "smoke.window_end",
        correlation.SMOKE_END.isoformat(),
        method="end of the Canadian wildfire transport window, DEQ qualifier IF",
        inputs=august_inputs,
    )
    reg.add(
        "smoke.rule",
        correlation.SMOKE_RULE,
        method="exclusion rule applied wherever a statistic is reported without the smoke "
        "window",
        inputs=august_inputs,
    )
    add_audit_keys(fz, results, reg)
    scope_sensor_inputs(reg)
    return reg


_EXPORT_LABEL = re.compile(r"^Kunak hourly sensor export, (DC-\d{2}) \(")
_SITE_IN_KEY = re.compile(r"\.(DC-\d{2})(?:\.|$)")


def scope_sensor_inputs(reg: NumberRegistry) -> None:
    """List only the sensor exports a key reads (audit round 2, M7).

    The registry records every frozen sensor export as the input of each sensor key. A
    key whose value reads one site, the six common-window sensors or the nine Loudoun
    County sites keeps only those exports, so no Loudoun-only value names a Prince
    William County export as its input (D5, D52). Values are untouched.
    """
    common = {code_of_site(s) for s in COMMON_WINDOW_SITES}
    loudoun = {s.code for s in site_codes.load() if s.in_v1_scope}
    for key in reg.keys():
        inputs = reg.inputs(key)
        if not any(_EXPORT_LABEL.match(i["source"]) for i in inputs):
            continue
        if key.startswith("p98.common_exsmoke.diff."):
            scope = set(re.findall(r"DC-\d{2}", key))
        elif ".rank." in key:
            scope = common
        elif key.startswith(("p98.full.", "network.record_days.", "summary.share_site_days")):
            site = _SITE_IN_KEY.search(key)
            scope = {site.group(1)} if site else loudoun
            if key == "summary.share_site_days_below_35.all_sites":
                continue
        elif key.startswith(("p98.common", "network.common_window.")):
            site = _SITE_IN_KEY.search(key)
            scope = {site.group(1)} if site else common
        elif key.startswith("summary.site_days_at_or_above_35"):
            scope = loudoun
        else:
            continue
        reg.set_inputs(
            key,
            [
                i
                for i in inputs
                if not (m := _EXPORT_LABEL.match(i["source"])) or m.group(1) in scope
            ],
        )


def code_of_site(site_id: str) -> str:
    return site_codes.code_for(site_id)


# DEQ's 2026-08-21 edition, p. 14: the APEX 5 NO2 regression as DEQ first printed it
# after the 2026-08-19 correction, over that edition's own window. Transcribed from the
# archived PDF and read from the rendered page; not computed. The edition is not a
# freeze input, so its hash is pinned here and checked on every run.
DEQ_AUG21_PATH = "docs/deq-reports/2026-08-21_data_center_air_quality_analysis.pdf"
DEQ_AUG21_SHA256 = "20083d8629dccce2a2e834054b0aaaa3d8cabc9ab446d55a5748aa843de5eabd"
DEQ_AUG21_APEX05_NO2 = {"intercept": 1.8, "slope": 0.31, "r2": 0.2}

# Events DEQ records after the freeze, transcribed from the ingested edition text and
# checked against it on every run. None of them enters a computation.
POSTFREEZE_EVENTS = (
    (
        "deq.postfreeze.collocated_unit_swap",
        "2026-10-22",
        "pipeline/sources/deq/deq_dcamp_weekly_2026-10-30.txt",
        "APEX/Kunak sensor 5 at Broad Run HS was swapped out",
        "the collocated unit at site DC-01 was replaced, DEQ 2026-10-30 edition, section 2",
    ),
    (
        "deq.postfreeze.dc02_collection_end",
        "2026-10-22",
        "pipeline/sources/deq/deq_dcamp_weekly_2026-10-30.txt",
        "On October 22, 2026, data collection at Dulles Airport (sensor 9) ended",
        "data collection at site DC-02 ended, DEQ 2026-10-30 edition, section 2",
    ),
    (
        "deq.postfreeze.pw_sites_added",
        "2026-10-22",
        "pipeline/sources/deq/deq_dcamp_weekly_2026-10-30.txt",
        "Prince William Police Department West",
        "two sensors placed at new Prince William County sites, DEQ 2026-10-30 edition, "
        "section 2",
    ),
    (
        "deq.postfreeze.dc01_collection_end",
        "2026-11-04",
        "pipeline/sources/deq/deq_dcamp_weekly_2026-11-06.txt",
        "On November 4, 2026, data collection at Broad Run HS (sensor 8) ended",
        "sensor data collection at site DC-01 ended and the unit moved to a new Loudoun "
        "County site, DEQ 2026-11-06 edition, section 2; the regulatory monitor continues",
    ),
)

# DEQ's instruction of 2026-08-11 for the hour-ending, daylight-saving Kunak labels,
# which the America/New_York conversion reproduces for every frozen hour (D35).
KUNAK_SHIFT_HOURS = {"before_dst": 1, "after_dst": 2}
HOURS_PER_DAY = 24
DEQ_SIGNIFICANT_FIGURES = 2


def _file_input(rel_path: str, expected_sha256: str | None = None) -> list[dict]:
    path = Path(__file__).resolve().parent.parent / rel_path
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if expected_sha256 is not None and digest != expected_sha256:
        raise ValueError(f"{rel_path}: SHA-256 {digest} does not match the pinned {expected_sha256}")
    return [{"source": rel_path, "sha256": digest}]


def add_audit_keys(fz: Freeze, results: dict, reg: NumberRegistry) -> None:
    """Keys added for the draft-3 audit (docs/report-2026/AUDIT_FINDINGS.md).

    Every value the report states in prose, a caption, alt text or a table note comes
    through a key (DECISIONS.md D50). None of these changes a pre-existing key.
    """
    code_of = site_codes.code_for
    kunak_inputs = inputs_for(fz, fz.kunak_exports())
    august_inputs = inputs_for(fz, fz.original_analysis_inputs())
    regulatory_inputs = inputs_for(fz, fz.regulatory())
    table4_inputs = inputs_for(
        fz,
        [
            e
            for e in fz.weekly_reports()
            if e.rel_path.endswith("2026-08-07_data_center_air_quality_analysis.pdf")
        ],
    )
    history_inputs = inputs_for(fz, [fz.config_input(SITE_HISTORY_PATH)])

    # ---- freeze
    taken = datetime.fromisoformat(fz.frozen_at_utc).astimezone(
        ZoneInfo("America/New_York")
    )
    reg.add(
        "freeze.taken_at",
        taken.date().isoformat(),
        method="date the data freeze was taken, FREEZE.json frozen_at_utc converted to "
        "America/New_York",
        inputs=[],
    )
    reg.add(
        "freeze.rewrite_date",
        freeze_lib.AUTHORSHIP_REWRITE_DATE,
        method="date of the authorship history rewrite that changed every commit "
        "identifier and no file content (DECISIONS.md D27)",
        inputs=[],
    )
    n_inputs = (
        len(fz.original_analysis_inputs())
        + len(fz.kunak_exports())
        + len(fz.regulatory())
        + len(fz.weekly_reports())
    )
    reg.add(
        "freeze.n_deq_inputs",
        n_inputs,
        unit="files",
        precision=0,
        method="sensor exports (original analysis and data freeze), regulatory monitor "
        "files and DEQ weekly-edition files pinned in FREEZE.json; the rows of the "
        "frozen-inputs table",
        inputs=[],
    )
    reg.add(
        "freeze.n_inputs_pinned_in_keys",
        len(_file_input(DEQ_AUG21_PATH, DEQ_AUG21_SHA256)),
        unit="files",
        precision=0,
        method="DEQ inputs read by report keys and pinned by hash in those keys rather than "
        "in FREEZE.json: the 2026-08-21 edition behind deq.aug21.*; a row of the "
        "frozen-inputs table",
        inputs=[],
    )
    original_cutoff = max(e.data_cutoff for e in fz.original_analysis_inputs() if e.data_cutoff)
    reg.add(
        "freeze.original_cutoff_date",
        original_cutoff[:10],
        method="last day carrying a sensor value in the original analysis exports, local clock",
        inputs=august_inputs,
    )
    reg.add(
        "freeze.backfilled_zero_hours",
        len(results["backfill_hours"]),
        unit="hours",
        precision=0,
        method="hours present in the data-freeze exports and absent from the original "
        "analysis exports, inside the span each original export covered, every channel "
        "reading zero (AUDIT.md round 2, Task 1b): "
        + "; ".join(f"{code_of(site)} {ts:%Y-%m-%d %H:%M}" for site, ts in results["backfill_hours"]),
        inputs=august_inputs + kunak_inputs,
    )

    # ---- thresholds and conventions
    reg.add(
        "completeness.valid_hours",
        DAILY_MIN_VALID_HOURS,
        unit="hours",
        precision=0,
        method="valid hours a 24-hour average requires, the threshold DEQ applies, "
        "confirmed by agency staff (GENARCH_RULES.md section 3)",
    )
    reg.add(
        "completeness.hours_per_day",
        HOURS_PER_DAY,
        unit="hours",
        precision=0,
        method="hours in a day, the denominator of the completeness threshold",
    )
    for key, hours in KUNAK_SHIFT_HOURS.items():
        reg.add(
            f"kunak.shift_hours.{key}",
            hours,
            unit="hours",
            precision=0,
            method="hours the Kunak hour-ending label is moved back to reach hour-beginning "
            "EST, the instruction confirmed by agency staff, " + key.replace("_", " ")
            + " (reproduced by the America/New_York conversion, DECISIONS.md D35)",
        )
    reg.add(
        "colloc.deq_significant_figures",
        DEQ_SIGNIFICANT_FIGURES,
        unit="significant figures",
        precision=0,
        method="precision of DEQ's printed collocation coefficients (GENARCH_RULES.md "
        "section 9)",
        inputs=table4_inputs,
    )
    reg.add(
        "deq.table4_edition_date",
        "2026-08-07",
        method="edition date of the DEQ report whose Table 4 the own-record percentiles are "
        "compared against",
        inputs=table4_inputs,
    )
    oct09 = [e for e in fz.doc["deq_weekly_reports"] if e["report_date"] == "2026-10-09"]
    reg.add(
        "deq.edition_date.oct09",
        oct09[0]["report_date"],
        method="edition date of the newest DEQ edition inside the freeze, the source of the "
        "quoted limitation and of the sensor timeline the site key note cites",
        inputs=inputs_for(fz, [e for e in fz.weekly_reports() if "2026-10-09" in e.rel_path]),
    )
    reg.add(
        "deq.edition_date.aug21",
        "2026-08-21",
        method="edition date of the DEQ report that prints a different fit for the APEX 5 "
        "NO2 regression over a longer window (archived PDF, title page)",
        inputs=_file_input(DEQ_AUG21_PATH, DEQ_AUG21_SHA256),
    )
    reg.add(
        "deq.correspondence.collocation_correction",
        "2026-08-19",
        method="date on which agency staff supplied unpublished APEX 5 NO2 values for the "
        "2026-08-07 edition window and confirmed exact-zero retention in that fit; kept as "
        "a record and not cited in the report (DECISIONS.md D67)",
        inputs=[],
    )
    page_acs = "pipeline/sources/cross_ancestry/acs_loudoun_2023.json"
    page_acs_doc = json.loads(
        (Path(__file__).resolve().parent.parent / page_acs).read_text(encoding="utf-8")
    )
    reg.add(
        "ancestry.page_acs_release",
        page_acs_doc["api_base"].split("/data/")[1].split("/")[0],
        method="ACS 5-year release the atlas page on ancestry and equity reads, from the "
        "api_base of the file that page loads (" + page_acs_doc["vintage"] + ")",
        inputs=_file_input(page_acs),
    )
    ashburn = site_codes.by_site_id(collocation.COLLOCATED_SITE)
    reg.add(
        "network.unit_change.DC-01",
        ashburn.units[1].start_date,
        method="date the frozen site history gives for the change from the first to the "
        "second collocated unit at site DC-01",
        inputs=history_inputs,
    )

    # ---- network
    in_scope = [s for s in site_codes.load() if s.in_v1_scope]
    out_scope = [s for s in site_codes.load() if not s.in_v1_scope]
    active = set(results["active_at_deq_cutoff"])
    reg.add(
        "network.loudoun_sites",
        len(in_scope),
        unit="sites",
        precision=0,
        method="Loudoun County sites in the frozen site-code lookup, in v1 scope: "
        + ", ".join(s.code for s in in_scope),
        inputs=history_inputs,
    )
    reg.add(
        "network.sites_outside_scope",
        len(out_scope),
        unit="sites",
        precision=0,
        method="sites outside Loudoun County in the frozen site-code lookup, outside v1 "
        "scope: " + ", ".join(s.code for s in out_scope),
        inputs=history_inputs,
    )
    retired = [s.code for s in in_scope if s.site_id not in active]
    reg.add(
        "network.sites_retired_before_deq_cutoff",
        len(retired),
        unit="sites",
        precision=0,
        window=f"before {DEQ_EDITION_CUTOFF_LABEL}",
        method="Loudoun County sites with no valid PM2.5 reading in the 24 hours before DEQ's "
        "edition cutoff: " + ", ".join(retired),
        inputs=august_inputs,
    )
    joined = min(unit.start_date for s in out_scope for unit in s.units)
    reconfig_month = joined[:7]
    ended = [
        s.code
        for s in in_scope
        if s.units[-1].end_date and s.units[-1].end_date[:7] == reconfig_month
    ]
    reg.add(
        "network.sites_ended_at_reconfiguration",
        len(ended),
        unit="sites",
        precision=0,
        method="Loudoun County sites whose last unit period ends in the month the first site "
        "outside Loudoun County started, frozen site history: " + ", ".join(ended),
        inputs=history_inputs,
    )
    reg.add(
        "network.reconfiguration_month",
        date.fromisoformat(joined).strftime("%B %Y"),
        method="month the first site outside Loudoun County started, frozen site history",
        inputs=history_inputs,
    )
    reg.add(
        "network.first_start",
        min(unit.start_date for s in in_scope for unit in s.units),
        method="first day of any Loudoun County unit period in the frozen site history, the "
        "first day of the record DEQ analyses after the sensors' stabilisation period",
        inputs=history_inputs,
    )
    for site in in_scope:
        reg.add(
            f"network.start.{site.code}",
            min(unit.start_date for unit in site.units),
            method="first day of the site's first unit period, frozen site history",
            inputs=history_inputs,
        )

    # ---- regulatory record and the daily reconciliation's excluded days
    reg_rec = results["regulatory"]
    reg.add(
        "regulatory.record_end",
        reg_rec["record_end"],
        method="date of the last hour carrying a PM2.5 value in the regulatory monitor's "
        "hourly file released under FOIA 26-4646, EST",
        inputs=regulatory_inputs,
    )
    reg.add(
        "regulatory.last_complete_day",
        reg_rec["last_complete_day"],
        method="last day on which the regulatory monitor's hourly PM2.5 file carries at "
        f"least {DAILY_MIN_VALID_HOURS} valid hours",
        inputs=regulatory_inputs,
    )
    rec = results["reconciliation"]
    excluded = rec["excluded"]
    rec_window = f"{rec['window_start']} to {rec['window_end']}"
    mismatch = next(r for r in rec["rows"] if not r["match"])
    reg.add(
        "daily.mismatch_date",
        mismatch["date"],
        window=rec_window,
        method="the comparable day on which the truncated recomputed mean differs from DEQ's "
        "published value",
        inputs=regulatory_inputs,
    )
    reg.add(
        "daily.mismatch_valid_hours",
        mismatch["valid_hours"],
        unit="hours",
        precision=0,
        window=rec_window,
        method="valid hourly readings behind the recomputed mean on the one day that differs",
        inputs=regulatory_inputs,
    )
    reg.add(
        "daily.calendar_days",
        excluded["calendar_days"],
        unit="days",
        precision=0,
        window=rec_window,
        method="calendar days from the first to the last comparable day, inclusive",
        inputs=regulatory_inputs,
    )
    for name, text in (
        ("both", "the published day carries a null code or a \"<\" flag and the recomputed "
         "day falls short of the completeness threshold"),
        ("published_only", "the published day carries a null code or a \"<\" flag; the "
         "recomputed day is complete"),
        ("recomputed_only", "the recomputed day falls short of the completeness threshold; "
         "the published day survives the exclusions"),
    ):
        reg.add(
            f"daily.excluded.{name}",
            excluded["counts"][name],
            unit="days",
            precision=0,
            window=rec_window,
            method="calendar days in the window that are not comparable because " + text,
            inputs=regulatory_inputs,
        )
    reg.add(
        "daily.null_run.start",
        excluded["null_run_start"],
        window=rec_window,
        method="first day of the longest run of days on which every hourly regulatory PM2.5 "
        "reading carries an AQS null code",
        inputs=regulatory_inputs,
    )
    reg.add(
        "daily.null_run.end",
        excluded["null_run_end"],
        window=rec_window,
        method="last day of that run",
        inputs=regulatory_inputs,
    )
    reg.add(
        "daily.null_run.days",
        excluded["null_run_days"],
        unit="days",
        precision=0,
        window=rec_window,
        method="length of that run",
        inputs=regulatory_inputs,
    )
    reg.add(
        "daily.null_run.code",
        ", ".join(excluded["null_run_codes"]),
        window=rec_window,
        method="AQS null code(s) carried by every hour of that run",
        inputs=regulatory_inputs,
    )

    # ---- collocation
    void = results["pm25_void"]
    reg.add(
        "sensor.pm25_void.start",
        void["start"],
        method="first day of the sensor PM2.5 readings DEQ voided for high humidity and data "
        "quality issues (DEQ 2026-10-09 edition, footnote 3, p. 16)",
        inputs=august_inputs,
    )
    reg.add(
        "sensor.pm25_void.end",
        void["end"],
        method="last day of that voided period",
        inputs=august_inputs,
    )
    reg.add(
        "colloc.apex-14_PM2.5.void_hours",
        void["apex14_hours"],
        unit="hours",
        precision=0,
        method="APEX 14 PM2.5 sensor hours at the collocated site excluded because DEQ voided "
        "them; the reason the PM2.5 fit's first paired hour is later than the NO2 fit's",
        inputs=august_inputs,
    )
    aug21 = _file_input(DEQ_AUG21_PATH, DEQ_AUG21_SHA256)
    for field, value in DEQ_AUG21_APEX05_NO2.items():
        reg.add(
            f"deq.aug21.apex-05_NO2.{field}",
            value,
            method="APEX 5 NO2 regression as printed in DEQ's 2026-08-21 edition, p. 14, over "
            "that edition's own window, which runs past the regulatory record this report "
            "holds; transcribed, not computed, and not compared",
            inputs=aug21,
        )

    # ---- percentiles over each site's own record
    tolerance = DEQ_TOLERANCE_COEFFICIENT
    full = results["p98_full"]
    reg.add(
        "p98.full.n_sites",
        len(full),
        unit="sites",
        precision=0,
        method="sites in Table 4 of DEQ's 2026-08-07 edition, the rows the own-record "
        "percentiles are compared against",
        inputs=table4_inputs,
    )
    within: dict[str, set] = {}
    for label in ("lst_zero_missing", "clock_zero_missing", "clock_zero_kept"):
        within[label] = set()
        for site, variants in sorted(full.items()):
            diff = variants[label]["p98"] - variants["deq_table4"]
            reg.add(
                f"p98.full.{code_of(site)}.diff_{label}",
                diff,
                unit="µg/m³",
                precision=3,
                n=variants[label]["days"],
                window=WHOLE_DAY_WINDOW,
                method=f"98th percentile over the site's own record, variant {label}, minus "
                "the value in Table 4 of DEQ's 2026-08-07 edition",
                inputs=kunak_inputs + table4_inputs,
            )
            if abs(half_up(diff, 3)) <= tolerance:
                within[label].add(site)
    live = active & set(full)
    reg.add(
        "p98.full.clock_zero_missing.n_within_live",
        len(within["clock_zero_missing"] & live),
        unit="sites",
        precision=0,
        n=len(live),
        window=WHOLE_DAY_WINDOW,
        method="sites live at DEQ's edition cutoff whose local clock time, zeros-missing "
        "percentile is within the reproduction tolerance of DEQ's Table 4 value",
        inputs=kunak_inputs + table4_inputs,
    )
    reg.add(
        "p98.full.zero_kept.n_closed",
        len(within["clock_zero_kept"] - within["clock_zero_missing"]),
        unit="sites",
        precision=0,
        n=len(full),
        window=WHOLE_DAY_WINDOW,
        method="sites that move inside the reproduction tolerance when zero readings are "
        "kept, local clock time: "
        + ", ".join(sorted(code_of(s) for s in within["clock_zero_kept"] - within["clock_zero_missing"])),
        inputs=kunak_inputs + table4_inputs,
    )
    reg.add(
        "p98.full.zero_kept.n_opened",
        len(within["clock_zero_missing"] - within["clock_zero_kept"]),
        unit="sites",
        precision=0,
        n=len(full),
        window=WHOLE_DAY_WINDOW,
        method="sites that move outside the reproduction tolerance when zero readings are "
        "kept, local clock time: "
        + ", ".join(sorted(code_of(s) for s in within["clock_zero_missing"] - within["clock_zero_kept"])),
        inputs=kunak_inputs + table4_inputs,
    )

    # ---- correlation
    corr = results["correlation"]
    reg.add(
        "corr.n_pairs",
        len(corr["pairs"]),
        unit="site pairs",
        precision=0,
        window="full record of the original analysis inputs, smoke window excluded",
        method="site pairs among the six sensors with a correlation",
        inputs=august_inputs,
    )
    reg.add(
        "corr.n_sensors",
        len({site for pair in corr["pairs"] for site in (pair["a"], pair["b"])}),
        unit="sensors",
        precision=0,
        window="full record of the original analysis inputs, smoke window excluded",
        method="sensors entering the cross-site correlation, the distinct sites across its "
        "pairs",
        inputs=august_inputs,
    )
    for key, value, what in (
        ("corr.pair_hours_min", corr["n_min"], "fewest"),
        ("corr.pair_hours_max", corr["n_max"], "most"),
    ):
        reg.add(
            key,
            value,
            unit="hours",
            precision=0,
            n=len(corr["pairs"]),
            window="full record of the original analysis inputs, smoke window excluded",
            method=f"{what} overlapping non-smoke hours behind any one pair's correlation",
            inputs=august_inputs,
        )

    # ---- with the smoke window excluded (S12)
    smoke_days = (
        f"days from {correlation.SMOKE_START.isoformat()} to {correlation.SMOKE_END.isoformat()} "
        "excluded under the day definition in use"
    )
    below, total = results["share_below_35_ex_smoke"]
    reg.add(
        "summary.share_site_days_below_35.ex_smoke",
        100 * below / total,
        unit="percent",
        precision=2,
        n=total,
        window="full frozen record, 18 of 24 valid hours, exact zeros treated as missing, "
        + smoke_days,
        method=f"{below} of {total} complete site-days strictly below 35 microgram per cubic "
        "metre across the nine Loudoun County sites, smoke window excluded",
        inputs=kunak_inputs,
    )
    for binning, prefix, key in (
        ("local standard time", "p98.common_exsmoke", "p98_common_standard_ex_smoke"),
        ("local clock time", "p98.common_clock_exsmoke", "p98_common_clock_ex_smoke"),
    ):
        window = COMMON_WINDOW + ", " + smoke_days
        ranked = sorted(results[key].items(), key=lambda kv: -kv[1]["p98"])
        for rank, (site, got) in enumerate(ranked, start=1):
            code = code_of(site)
            reg.add(
                f"{prefix}.{code}",
                got["p98"],
                unit="µg/m³",
                precision=3,
                n=got["days"],
                window=window,
                method=f"98th percentile of daily averages by linear interpolation, {binning} "
                "day binning, smoke window excluded",
                inputs=kunak_inputs,
            )
            reg.add(
                f"{prefix}.rank.{code}",
                rank,
                unit="rank",
                precision=0,
                n=len(ranked),
                window=window,
                method=f"rank on the common window with the smoke window excluded, {binning} "
                "day binning, highest first",
                inputs=kunak_inputs,
            )
        reg.add(
            f"{prefix}.n_above_35",
            sum(1 for v in results[key].values() if v["p98"] > PM25_24H_LEVEL),
            unit="sites",
            precision=0,
            n=len(ranked),
            window=window,
            method=f"sites whose common-window 98th percentile exceeds 35 microgram per cubic "
            f"metre with the smoke window excluded, {binning} day binning. Not a NAAQS "
            "comparison",
            inputs=kunak_inputs,
        )

    # Section 5.4 says site DC-06 holds the same rank with the smoke window excluded as
    # with it included, under both day definitions; fail if that stops holding.
    for with_key, ex_key in (
        ("p98.common.rank.DC-06", "p98.common_exsmoke.rank.DC-06"),
        ("p98.common_clock.rank.DC-06", "p98.common_clock_exsmoke.rank.DC-06"),
    ):
        if with_key in reg and reg.value(with_key) != reg.value(ex_key):
            raise ValueError(
                f"{with_key} and {ex_key} differ; section 5.4 says DC-06's rank does not "
                "depend on the smoke days. Rewrite it."
            )

    # ---- the DEQ-cutoff common-window result both ways (audit round 2, S2)
    cut_window = (
        f"{COMMON_WINDOW_START.isoformat()} to {DEQ_EDITION_CUTOFF_LABEL}, 18 of 24 valid "
        "hours, exact zeros treated as missing"
    )
    for binning, with_prefix, ex_prefix, key in (
        ("local standard time", "p98.common", "p98.common_exsmoke", "p98_common_standard"),
        ("local clock time", "p98.common_clock", "p98.common_clock_exsmoke", "p98_common_clock"),
    ):
        reg.add(
            f"{with_prefix}.n_above_35.deq_cutoff",
            sum(
                1
                for v in results[key + "_deq_cutoff"].values()
                if v["p98"] > PM25_24H_LEVEL
            ),
            unit="sites",
            precision=0,
            n=len(results[key + "_deq_cutoff"]),
            window=cut_window,
            method=f"sites whose common-window 98th percentile under DEQ's stated edition "
            f"cutoff exceeds 35 microgram per cubic metre, smoke window included, {binning} "
            "day binning. Not a NAAQS comparison",
            inputs=kunak_inputs,
        )
        ex = results[key + "_ex_smoke_deq_cutoff"]
        ranked = sorted(ex.items(), key=lambda kv: -kv[1]["p98"])
        for rank, (site, got) in enumerate(ranked, start=1):
            code = code_of(site)
            reg.add(
                f"{ex_prefix}.{code}.deq_cutoff",
                got["p98"],
                unit="µg/m³",
                precision=3,
                n=got["days"],
                window=cut_window + ", " + smoke_days,
                method=f"98th percentile under DEQ's stated edition cutoff, {binning} day "
                "binning, smoke window excluded",
                inputs=kunak_inputs,
            )
            reg.add(
                f"{ex_prefix}.rank.{code}.deq_cutoff",
                rank,
                unit="rank",
                precision=0,
                n=len(ranked),
                window=cut_window + ", " + smoke_days,
                method=f"rank under DEQ's stated edition cutoff with the smoke window "
                f"excluded, {binning} day binning, highest first",
                inputs=kunak_inputs,
            )
        reg.add(
            f"{ex_prefix}.n_above_35.deq_cutoff",
            sum(1 for v in ex.values() if v["p98"] > PM25_24H_LEVEL),
            unit="sites",
            precision=0,
            n=len(ex),
            window=cut_window + ", " + smoke_days,
            method=f"sites whose common-window 98th percentile under DEQ's stated edition "
            f"cutoff exceeds 35 microgram per cubic metre with the smoke window excluded, "
            f"{binning} day binning. Not a NAAQS comparison",
            inputs=kunak_inputs,
        )

    # ---- the common-window result both ways, and the rest of D58
    reg.add(
        "freeze.cutoff_date",
        fz.kunak_cutoff()[:10],
        method="date of the latest hour carrying a non-empty pollutant value across the "
        "frozen sensor exports (freeze.cutoff), local clock",
        inputs=kunak_inputs,
    )
    above = results["at_or_above_35"]
    if above["in_smoke"] != above["total"]:
        raise ValueError(
            f"{above['total'] - above['in_smoke']} Loudoun site-days at or above 35 fall "
            "outside the smoke window; the summary sentence that all of them fall inside it "
            "no longer holds"
        )
    for key, value, what in (
        ("summary.site_days_at_or_above_35", above["total"], "complete site-days"),
        (
            "summary.site_days_at_or_above_35.in_smoke",
            above["in_smoke"],
            "of those site-days whose local standard time date falls in the smoke window",
        ),
    ):
        reg.add(
            key,
            value,
            unit="site-days",
            precision=0,
            n=results["share_below_35"]["loudoun"][1],
            window="full frozen record, 18 of 24 valid hours, exact zeros treated as missing",
            method=f"{what} at or above 35 microgram per cubic metre across the nine Loudoun "
            "County sites, local standard time days",
            inputs=kunak_inputs,
        )

    for binning, key in (
        ("local standard time", "p98.common.sites_set_by_smoke_days"),
        ("local clock time", "p98.common_clock.sites_set_by_smoke_days"),
    ):
        reg.add(
            key,
            results["p98_common_set_by_smoke"]["standard" if "standard" in binning else "clock"],
            unit="sites",
            precision=0,
            n=len(COMMON_WINDOW_SITES),
            window=COMMON_WINDOW,
            method="sites whose common-window 98th percentile is set, by linear "
            "interpolation, only by daily averages that fall in the smoke window: the "
            "order statistic or statistics carrying non-zero weight, one at a whole index "
            "(51 days) and two otherwise, "
            f"{binning} day binning",
            inputs=kunak_inputs,
        )
    whole_index = results["p98_common_whole_index_days"]
    if len(whole_index) != 1:
        raise ValueError(
            f"common-window record lengths with a whole interpolation index: {whole_index}; "
            "the section 5.4 wording names exactly one"
        )
    reg.add(
        "p98.common.whole_index_days",
        whole_index[0],
        unit="days",
        precision=0,
        window=COMMON_WINDOW,
        method="common-window record length, in whole days, at which the linear "
        "interpolation index (n - 1) x 0.98 is a whole number, so a single daily average "
        "sets the 98th percentile; at every other record length two days set it",
        inputs=kunak_inputs,
    )
    live = [
        s for s in results["active_at_deq_cutoff"] if s in results["p98_full"]
    ]
    offsets = [
        abs(
            results["p98_full"][s]["lst_zero_missing"]["p98"]
            - results["p98_full"][s]["deq_table4"]
        )
        for s in live
    ]
    for key, value, what in (
        ("p98.full.lst_offset_live.min_abs", min(offsets), "smallest"),
        ("p98.full.lst_offset_live.max_abs", max(offsets), "largest"),
    ):
        reg.add(
            key,
            value,
            unit="µg/m³",
            precision=3,
            n=len(live),
            window="each site's own record through " + RECORD_END.isoformat(),
            method=f"{what} absolute difference between the local standard time, "
            "zeros-missing own-record 98th percentile and DEQ's Table 4 value, among the "
            "sites live at DEQ's edition cutoff",
            inputs=kunak_inputs,
        )

    std_ex = results["p98_common_standard_ex_smoke"]
    clk_ex = results["p98_common_clock_ex_smoke"]
    window = COMMON_WINDOW + ", " + smoke_days
    for key, value, what in (
        ("p98.common_exsmoke.min", min(v["p98"] for v in std_ex.values()), "lowest"),
        ("p98.common_exsmoke.max", max(v["p98"] for v in std_ex.values()), "highest"),
    ):
        reg.add(
            key,
            value,
            unit="µg/m³",
            precision=3,
            n=len(std_ex),
            window=window,
            method=f"{what} common-window 98th percentile among the six sensors, local "
            "standard time day binning, smoke window excluded",
            inputs=kunak_inputs,
        )
    reg.add(
        "p98.common_clock_exsmoke.max_abs_diff",
        max(abs(clk_ex[s]["p98"] - std_ex[s]["p98"]) for s in std_ex),
        unit="µg/m³",
        precision=3,
        n=len(std_ex),
        window=window,
        method="largest absolute per-site difference between the local clock time and local "
        "standard time 98th percentile on the common window, smoke window excluded, from "
        "unrounded values",
        inputs=kunak_inputs,
    )
    by_code = {code_of(s): v for s, v in std_ex.items()}
    reg.add(
        "p98.common_exsmoke.diff.DC-04_DC-08",
        by_code["DC-04"]["p98"] - by_code["DC-08"]["p98"],
        unit="µg/m³",
        precision=3,
        n=2,
        window=window,
        method="DC-04 minus DC-08 common-window 98th percentile, local standard time day "
        "binning, smoke window excluded, from unrounded values",
        inputs=kunak_inputs,
    )

    for site, got in sorted(results["p98_full_lst_ex_smoke"].items(), key=lambda kv: code_of(kv[0])):
        reg.add(
            f"p98.full.{code_of(site)}.lst_zero_missing_exsmoke",
            got["p98"],
            unit="µg/m³",
            precision=3,
            n=got["days"],
            window="each site's own record through " + RECORD_END.isoformat() + ", 18 of 24 "
            "valid hours, exact zeros treated as missing, " + smoke_days,
            method="98th percentile of daily averages by linear interpolation, local standard "
            "time day binning, smoke window excluded",
            inputs=kunak_inputs,
        )

    corr_ws = results["correlation_with_smoke"]
    for key, value, what in (
        ("corr.with_smoke.min", corr_ws["r_min"], "lowest"),
        ("corr.with_smoke.max", corr_ws["r_max"], "highest"),
    ):
        reg.add(
            key,
            value,
            unit="Pearson r",
            precision=3,
            n=len(corr_ws["pairs"]),
            window="full record of the original analysis inputs, smoke window included",
            method=f"{what} pairwise-complete Pearson r of hourly PM2.5 among the six sensors, "
            "exact zeros treated as missing, smoke window included",
            inputs=august_inputs,
        )
    # Per pair, with the smoke window included (D61), beside the reported pair values.
    for pair in corr_ws["pairs"]:
        a, b = sorted((code_of(pair["a"]), code_of(pair["b"])))
        for suffix, value, unit, precision, what in (
            ("r", pair["r"], "Pearson r", 3, "pairwise-complete Pearson r of hourly PM2.5"),
            ("n_hours", pair["n"], "hours", 0, "overlapping hours behind the correlation"),
        ):
            reg.add(
                f"corr.with_smoke.{a}_{b}.{suffix}",
                value,
                unit=unit,
                precision=precision,
                n=pair["n"],
                window="full record of the original analysis inputs, smoke window included",
                method=f"{what} between {a} and {b}, exact zeros treated as missing, smoke "
                "window included",
                inputs=august_inputs,
            )

    # ---- the APEX units DEQ's 2026-10-09 edition names at the three sites the frozen
    # site history leaves unconfirmed (S14; audit round 2, S5). Transcribed from the
    # edition's section 2; site_key_notes() checks the phrases at generation.
    oct09_text = "pipeline/sources/deq/deq_dcamp_weekly_2026-10-09.txt"
    for code, unit in OCT09_UNIT_ASSIGNMENTS:
        reg.add(
            f"deq.oct09.unit.{code}",
            unit,
            unit="APEX sensor number",
            precision=0,
            method="APEX/Kunak sensor number DEQ's 2026-10-09 edition, section 2, gives at "
            "this site, which the frozen site history leaves unconfirmed; transcribed",
            inputs=_file_input(oct09_text),
        )
    reg.add(
        "deq.oct09.units_named",
        len(OCT09_UNIT_ASSIGNMENTS),
        unit="sites",
        precision=0,
        method="sites whose APEX unit DEQ's 2026-10-09 edition, section 2, names and the "
        "frozen site history leaves unconfirmed",
        inputs=_file_input(oct09_text),
    )

    # ---- the count of new Prince William County sites in the 2026-10-30 edition,
    # section 2 (audit round 2, S5): each site's phrase is checked in the edition text.
    oct30_text = "pipeline/sources/deq/deq_dcamp_weekly_2026-10-30.txt"
    oct30 = (Path(__file__).resolve().parent.parent / oct30_text).read_text(encoding="utf-8")
    pw_new = ("Prince William Police Department West", "Meadows Farms")
    for phrase in pw_new:
        if phrase not in oct30:
            raise ValueError(f"{oct30_text} no longer carries {phrase!r}")
    reg.add(
        "deq.postfreeze.pw_sites_added_count",
        len(pw_new),
        unit="sites",
        precision=0,
        method="after the freeze: sensors placed at new Prince William County sites on "
        "2026-10-22, DEQ 2026-10-30 edition, section 2. Changes no frozen value",
        inputs=_file_input(oct30_text),
    )

    # ---- events after the freeze, transcribed from the ingested editions
    for key, value, rel_path, phrase, what in POSTFREEZE_EVENTS:
        text = (Path(__file__).resolve().parent.parent / rel_path).read_text(encoding="utf-8")
        if phrase not in text:
            raise ValueError(f"{key}: {rel_path} no longer carries {phrase!r}")
        reg.add(
            key,
            value,
            method="after the freeze: " + what + ". Changes no frozen value",
            inputs=_file_input(rel_path),
        )


DEQ_PROJECT_PAGE = (
    "https://www.deq.virginia.gov/news-info/shortcuts/topics-of-interest/"
    "data-center-air-monitoring-project"
)


def weekly_origin(entry, report_date: str, by_basename: dict) -> str:
    """Where a frozen DEQ edition file came from (DECISIONS.md D56).

    The per-edition address the source manifest recorded at download, when it recorded
    one for this file. A text or table file GENARCH extracted from an edition names the
    edition it was derived from. Otherwise the project page, which carries only the
    current edition, with the archived copy named by its path (the SHA-256 is its own
    column). The manifest's fallback entry, which once supplied a later edition's
    address for the 2026-08-07 file, is not used.
    """
    for manifest_entry in by_basename.get(entry.path.name, []):
        url = manifest_entry.get("origin_url")
        if url and "PASTE" not in url:
            return url
    if entry.path.suffix in (".txt", ".json"):
        pdf = entry.path.with_suffix(".pdf").name.replace("_tables", "")
        return f"derived by GENARCH from the {report_date} edition PDF ({pdf})"
    return f"{DEQ_PROJECT_PAGE}; archived in the project repository at {entry.rel_path}"


OCT09_UNIT_ASSIGNMENTS = (("DC-07", 8), ("DC-08", 10), ("DC-09", 13))


def site_key_notes(reg: NumberRegistry) -> list[str]:
    """Notes for the site key (S14). The text is checked against DEQ's edition."""
    edition = "pipeline/sources/deq/deq_dcamp_weekly_2026-10-09.txt"
    text = (Path(__file__).resolve().parent.parent / edition).read_text(encoding="utf-8")
    for phrase in (
        "APEX/Kunak sensor 8 was removed for maintenance",
        "1757 Golf Course (sensor 13), Farmwell",
        "MS (sensor 10), and Sterling MS (sensor 6) ended",
    ):
        if phrase not in text.replace("\r\n", "\n"):
            raise ValueError(f"site key note: {edition} no longer carries {phrase!r}")
    return [
        "Active end is the first day with no data, so DEQ's editions give a date one day "
        "earlier.",
        "The APEX unit column reflects the site history as frozen. DEQ's "
        + reg.display("deq.edition_date.oct09")
        + " edition, section 2, names the units at "
        + count_word(reg.display("deq.oct09.units_named"))
        + " sites the history leaves unconfirmed: sensor "
        + reg.display("deq.oct09.unit.DC-07")
        + " at DC-07, sensor "
        + reg.display("deq.oct09.unit.DC-08")
        + " at DC-08 and sensor "
        + reg.display("deq.oct09.unit.DC-09")
        + " at DC-09.",
    ]


def collocation_notes(reg: NumberRegistry) -> list[str]:
    """Notes for the collocation table (B7, S10, M6), every value from a key."""
    return [
        "† The comparison values for APEX 5 NO2 are unpublished values supplied by agency "
        "staff for the same window as the other three. DEQ's "
        + reg.display("deq.edition_date.aug21")
        + " edition prints a different fit for that regression over a longer window "
        "(p. 14): y = "
        + reg.display("deq.aug21.apex-05_NO2.intercept")
        + " + "
        + reg.display("deq.aug21.apex-05_NO2.slope")
        + "x, R-squared "
        + reg.display("deq.aug21.apex-05_NO2.r2")
        + ", over a longer window than the regulatory record this report holds, and is "
        "not compared.",
        "The APEX 14 PM2.5 fit begins later than the APEX 14 NO2 fit because DEQ voided "
        "the sensor PM2.5 readings from "
        + reg.display("sensor.pm25_void.start")
        + " to "
        + reg.display("sensor.pm25_void.end")
        + " for high humidity and data quality issues ("
        + reg.display("colloc.apex-14_PM2.5.void_hours")
        + " hours of this unit).",
        "First and last paired hour are the hours that enter each fit. Readings are "
        "assigned to a unit by the occupancy table (section 3.4), so the change from "
        "APEX 14 to APEX 5 falls between "
        + reg.display("colloc.apex-14_NO2.period_end")
        + " and "
        + reg.display("colloc.apex-05_NO2.period_start")
        + " EST, the evening before "
        + reg.display("network.unit_change.DC-01")
        + ", the date the site key gives.",
    ]


def staff_attribution(text: str) -> str:
    """A frozen manifest string with staff answers attributed to agency staff (D67).

    The frozen manifest keeps its wording, which dates the message and names DEQ staff.
    From 2026-11-20, at agency staff's request, a staff answer is attributed to agency
    staff with no date; site/src/lib/deq-data.ts asStaffAttribution() renders the live
    manifest the same way. Any other attribution form fails the run.
    """
    out = re.sub(r"\s*\(per DEQ staff, \d{4}-\d{2}-\d{2}\)", ", confirmed by agency staff", text)
    out = re.sub(r"confirmed by DEQ staff \d{4}-\d{2}-\d{2}", "confirmed by agency staff", out)
    out = out.replace(
        "Virginia DEQ confirmed redistributable with credit to Virginia DEQ.",
        "Redistributable with credit to Virginia DEQ, confirmed by agency staff.",
    )
    if re.search(r"DEQ staff|DEQ confirmed|correspondence", out, flags=re.IGNORECASE):
        raise ValueError(f"unrendered staff attribution in a provenance string: {out!r}")
    return out


def staff_status(fit: dict) -> str:
    """The T03 status cell (audit round 2, B2).

    The APEX 5 NO2 comparison values are unpublished values supplied by agency staff for
    the window (D54, D67), not values DEQ printed, so that cell names them as staff values.
    The key colloc.apex-05_NO2.status keeps its value; only the rendered cell differs.
    """
    if (
        fit["unit_id"] == "apex-05"
        and fit["pollutant"] == "NO2"
        and fit["status"] == collocation.STATUS_MATCH
    ):
        return "matches agency staff values at DEQ's precision"
    return fit["status"]


def count_word(shown: str) -> str:
    """A displayed count, with zero as "none" (DECISIONS.md D58), as N fmt="count" does."""
    return "none" if shown == "0" else shown


def _codes_for_common_window() -> list[str]:
    return sorted(site_codes.code_for(s) for s in COMMON_WINDOW_SITES)


# ------------------------------------------------------------------- tables


def build_tables(fz: Freeze, results: dict, reg: NumberRegistry) -> list[tables.Table]:
    code_of = site_codes.code_for
    manifest = json.loads(
        fz.config_path(MANIFEST_PATH).read_text(encoding="utf-8")
    )
    # Manifest keys are a mix of repo-relative paths and paths relative to
    # pipeline/sources/, so match on the basename.
    by_basename: dict[str, list[dict]] = {}
    for entry in manifest["sources"]:
        key = entry.get("filename") or entry.get("file")
        if key:
            by_basename.setdefault(key.replace("\\", "/").rsplit("/", 1)[-1], []).append(entry)

    def origin_of(entry: dict) -> str:
        if entry.get("origin_url"):
            return entry["origin_url"]
        urls = entry.get("origin_urls") or []
        return urls[0] if urls else ""

    def provenance(filename: str, fallback: str) -> tuple[str, str]:
        """(origin, licence) for a frozen file, from its own manifest entry if it has one.

        Four regulatory files and the 2026-08-07 report have no per-file entry, so
        they fall back to the entry for the product they feed.
        """
        for name in (filename, fallback):
            for entry in by_basename.get(name, []):
                return origin_of(entry), staff_attribution(entry.get("license", ""))
        return "", ""

    kunak_fallback = "deq_data_center_air_monitoring_hourly.csv"
    foia_fallback = "deq_regulatory_monitor_hourly.csv"
    weekly_fallback = "deq_dcamp_weekly_2026-10-09.pdf"

    # ---- T01 sources. Frozen filenames carry the site slug, so the source is named
    # by site code and identified by hash instead (C7).
    t01_rows = []
    for group in (fz.original_analysis_inputs(), fz.kunak_exports()):
        for entry in sorted(group, key=lambda e: code_of(e.site_id)):
            origin, licence = provenance(entry.path.name, kunak_fallback)
            t01_rows.append(
                [
                    source_label(fz, entry),
                    origin,
                    licence,
                    display_text(entry.export_date),
                    entry.data_cutoff,
                    entry.sha256,
                ]
            )
    for entry in sorted(fz.regulatory(), key=lambda e: e.path.name):
        origin, licence = provenance(entry.path.name, foia_fallback)
        t01_rows.append(
            [
                source_label(fz, entry),
                origin,
                licence,
                entry.export_date,
                entry.data_cutoff,
                entry.sha256,
            ]
        )
    for entry in sorted(fz.weekly_reports(), key=lambda e: e.rel_path):
        report_date = next(
            e["report_date"]
            for e in fz.doc["deq_weekly_reports"]
            if e["frozen_path"] == entry.rel_path
        )
        _, licence = provenance(entry.path.name, weekly_fallback)
        origin = weekly_origin(entry, report_date, by_basename)
        t01_rows.append(
            [
                source_label(fz, entry),
                origin,
                licence,
                "",
                report_date,
                entry.sha256,
            ]
        )

    # The 2026-08-21 edition is read by the deq.aug21.* keys and pinned by hash in
    # them, not in the freeze (audit round 2, S9). FREEZE.json stays unchanged.
    aug21 = _file_input(DEQ_AUG21_PATH, DEQ_AUG21_SHA256)[0]
    _, licence = provenance("deq_dcamp_weekly_2026-08-21.pdf", weekly_fallback)
    t01_rows.append(
        [
            "DEQ weekly report, 2026-08-21 (pdf), pinned in its keys, not in the freeze",
            f"{DEQ_PROJECT_PAGE}; archived in the project repository at {DEQ_AUG21_PATH}",
            licence,
            "",
            reg.value("deq.edition_date.aug21"),
            aug21["sha256"],
        ]
    )
    expected_rows = int(reg.value("freeze.n_deq_inputs")) + int(
        reg.value("freeze.n_inputs_pinned_in_keys")
    )
    if len(t01_rows) != expected_rows:
        raise ValueError(
            "T01 rows and freeze.n_deq_inputs + freeze.n_inputs_pinned_in_keys disagree"
        )
    t01 = tables.Table(
        "T01_sources",
        "Frozen inputs",
        "Every DEQ and sensor input the report's analysis reads: "
        + reg.display("freeze.n_deq_inputs")
        + " pinned in the data freeze and "
        + reg.display("freeze.n_inputs_pinned_in_keys")
        + " pinned by hash in the keys that read it. Sensor exports are named by site code; each row is identified by its "
        "SHA-256 so the reproduction stays checkable without printing a filename that "
        "carries a site identifier. The atlas, ancestry and configuration inputs are pinned "
        "in FREEZE.json under atlas_inputs, ancestry_inputs and config_inputs.",
        "data/reports/2026/FREEZE.json and pipeline/sources/manifest.json.",
        {"Data cutoff": "local clock for sensors, EST for the regulatory monitor"},
        ["Source", "Origin", "Licence", "Export date", "Data cutoff", "SHA-256"],
        t01_rows,
        notes=[
            "Export date for the data-freeze sensor exports ("
            + reg.display("freeze.export_dates.DC-01")
            + ") is an upper bound: the time the exports were committed to the project "
            "repository. The dashboard records no export time.",
            "A DEQ edition's Origin is the per-edition address the source manifest "
            "recorded at download. Where none was recorded, it is the project page, which "
            "carries only the current edition, and the archived copy in the project "
            "repository is identified by its path and SHA-256.",
        ],
    )

    # ---- T02 site key. Identifiers only; carries no reading value.
    t02_rows = []
    for site in site_codes.load():
        record = results["record"].get(site.site_id, {})
        for unit in site.units:
            t02_rows.append(
                [
                    site.code,
                    site.deq_published_name,
                    unit.unit_label,
                    site.county,
                    unit.start_date,
                    unit.end_date or "",
                    record.get("full_days", ""),
                ]
            )
    t02 = tables.Table(
        "T02_site_key",
        "Site key",
        "Maps each neutral site code to the name DEQ publishes for that location. One row "
        "per unit period, so a unit that moved is listed under each site it occupied. This "
        "table carries no reading value of any kind and none may be added to it.",
        "pipeline/sources/deq_sensor_site_history.csv and pipeline/lookups/site_codes.json.",
        {"Record days": "complete days over the full frozen record, 18 of 24 valid hours"},
        [
            "Site code",
            "DEQ published name",
            "APEX unit",
            "County",
            "Active start",
            "Active end",
            "Record days",
        ],
        t02_rows,
        notes=site_key_notes(reg),
    )

    # ---- T03 collocation
    t03_rows = [
        [
            f"{f['unit_id'].replace('apex-0', 'APEX ').replace('apex-', 'APEX ')} "
            f"{f['pollutant']}",
            f["deq_intercept"],
            f["deq_slope"],
            f["deq_r2"],
            f["gx_intercept"],
            f["gx_slope"],
            f["gx_r2"],
            f["diff_intercept"],
            f["diff_slope"],
            f["diff_r2"],
            f["n_pairs"],
            f["period_start"],
            f["period_end"],
            staff_status(f),
        ]
        for f in results["collocation"]
    ]
    t03 = tables.Table(
        "T03_collocation",
        "Collocation regressions",
        "The four regressions at the collocated site, sensor on x and regulatory monitor on "
        "y, each fit stopping at DEQ's " + reg.display("deq.edition_cutoff") + " edition "
        "cutoff. DEQ publishes its coefficients to "
        + reg.display("colloc.deq_significant_figures")
        + " significant figures, so status reports whether each recomputed value, rounded "
        "to the decimals DEQ printed, equals DEQ's. Exact zeros are retained in the APEX 5 "
        "NO2 fit and in nothing else.",
        "Frozen original analysis inputs and FOIA 26-4646, against DEQ's coefficients for "
        "the window of its " + reg.display("deq.table4_edition_date") + " edition.",
        {"Intercept and slope": "pollutant units", "n": "paired hours"},
        [
            "Comparison",
            "DEQ intercept",
            "DEQ slope",
            "DEQ R-squared",
            "GENARCH intercept",
            "GENARCH slope",
            "GENARCH R-squared",
            "Difference, intercept",
            "Difference, slope",
            "Difference, R-squared",
            "Paired hours",
            "First paired hour (EST)",
            "Last paired hour (EST)",
            "Status",
        ],
        t03_rows,
        notes=collocation_notes(reg),
    )

    # ---- T04 daily reconciliation
    rec = results["reconciliation"]
    t04 = tables.Table(
        "T04_daily_reconciliation",
        "Daily-average reconciliation, by day",
        "Recomputed 24-hour means of the regulatory monitor against DEQ's published daily "
        "file, truncated to one decimal as DEQ truncates. One row per comparable day; the "
        "summary table's note gives the reason for every day that is not comparable.",
        "FOIA 26-4646 hourly and published daily average files.",
        {"Recomputed": "µg/m³", "Published": "µg/m³"},
        [
            "Date",
            "Recomputed daily mean (µg/m³)",
            "DEQ published daily mean (µg/m³)",
            "Difference (µg/m³)",
            "Valid hours",
            "Agrees after truncation",
        ],
        [
            [
                r["date"],
                f"{r['recomputed']:.1f}",
                f"{r['published']:.1f}",
                f"{r['difference']:.1f}",
                r["valid_hours"],
                "yes" if r["match"] else "no",
            ]
            for r in rec["rows"]
        ],
    )
    t04s = tables.Table(
        "T04s_daily_summary",
        "Daily-average reconciliation, summary",
        "The reconciliation in one row. Comparable means the published day survives DEQ's "
        "null-code and logger-invalid exclusions and the recomputed day clears "
        + reg.display("completeness.valid_hours")
        + " of "
        + reg.display("completeness.hours_per_day")
        + " valid hours.",
        "FOIA 26-4646 hourly and published daily average files.",
        {"Mean absolute difference": "µg/m³"},
        [
            "Comparable days",
            "Agreeing days",
            "Mean absolute difference (µg/m³)",
            "Maximum absolute difference (µg/m³)",
            "Window start",
            "Window end",
            "Days that differ",
        ],
        [
            [
                rec["n_days"],
                rec["n_match"],
                f"{rec['mean_abs_diff']:.4f}",
                f"{rec['max_abs_diff']:.4f}",
                rec["window_start"],
                rec["window_end"],
                "; ".join(rec["mismatch_dates"]),
            ]
        ],
        notes=[
            "Of the "
            + reg.display("daily.calendar_days")
            + " calendar days in the window, "
            + reg.display("daily.n_days")
            + " are comparable. "
            + reg.display("daily.excluded.both")
            + " are not because DEQ's published day carries a null code or a \"<\" flag "
            "and the recomputed day falls short of the completeness threshold; "
            + reg.display("daily.excluded.published_only")
            + " because the published day alone fails those exclusions; and "
            + reg.display("daily.excluded.recomputed_only")
            + " because the recomputed day alone falls short. The longest gap, "
            + reg.display("daily.null_run.start")
            + " to "
            + reg.display("daily.null_run.end")
            + " ("
            + reg.display("daily.null_run.days")
            + " days), is a run in which every hourly reading carries AQS null code "
            + reg.display("daily.null_run.code")
            + ".",
        ],
    )

    # ---- T05 common-window percentiles
    t05_rows = []
    for binning, key, label in (
        ("standard", "p98_common_standard", "local standard time"),
        ("clock", "p98_common_clock", "local clock time"),
    ):
        ranked = sorted(results[key].items(), key=lambda kv: -kv[1]["p98"])
        ranks = {site: i for i, (site, _) in enumerate(ranked, start=1)}
        ranked_ex = sorted(results[key + "_ex_smoke"].items(), key=lambda kv: -kv[1]["p98"])
        ranks_ex = {site: i for i, (site, _) in enumerate(ranked_ex, start=1)}
        # One rank column serves both day sets (audit round 2, M8): fail if they differ.
        ranked_cut = sorted(
            results[key + "_deq_cutoff"].items(), key=lambda kv: -kv[1]["p98"]
        )
        ranks_cut = {site: i for i, (site, _) in enumerate(ranked_cut, start=1)}
        if ranks_cut != ranks:
            raise ValueError(
                f"{label}: whole-day and DEQ-cutoff ranks differ; the common-window table's "
                "single rank column no longer serves both"
            )
        for site in sorted(results[key], key=code_of):
            whole = results[key][site]
            cut = results[key + "_deq_cutoff"][site]
            ex = results[key + "_ex_smoke"][site]
            t05_rows.append(
                [
                    code_of(site),
                    label,
                    whole["days"],
                    f"{whole['p98']:.3f}",
                    cut["days"],
                    f"{cut['p98']:.3f}",
                    ranks[site],
                    ex["days"],
                    f"{ex['p98']:.3f}",
                    ranks_ex[site],
                ]
            )
    t05 = tables.Table(
        "T05_p98_common_window",
        "98th percentiles on the common window",
        "The "
        + reg.display("p98.common.n_sites")
        + " sensors restricted to the window in which all of them were collecting, under "
        "both day definitions and both cutoffs. Restricting to a common window removes the "
        "unequal-record-length difference; it does not remove the unequal-seasonality one, "
        "because the window is entirely high summer and contains the smoke period. Neither "
        "these values nor DEQ's are comparable to the NAAQS.",
        "Frozen sensor exports; DEQ's edition cutoff is "
        + reg.display("deq.edition_cutoff")
        + ".",
        {"98th percentile": "µg/m³"},
        [
            "Site code",
            "Day definition",
            "Whole-day record days",
            "Whole-day 98th percentile (µg/m³)",
            "DEQ-cutoff record days",
            "DEQ-cutoff 98th percentile (µg/m³)",
            "Rank (whole days and DEQ cutoff)",
            "Smoke window excluded: record days",
            "Smoke window excluded: 98th percentile (µg/m³)",
            "Smoke window excluded: rank",
        ],
        t05_rows,
        notes=[
            "Every difference section 5.4 quotes between values in this table, including the "
            "rise from local standard time to local clock time and the gap between two sites, "
            "is computed from the unrounded percentiles, so it can differ in the last decimal "
            "from a difference of the rounded values printed here.",
            "Under DEQ's cutoff a site loses its partial last day, and its percentile rises "
            "rather than falls. With linear interpolation, one day fewer moves the "
            "interpolation point toward the highest day in the record, which in this window "
            "is a smoke day. This is the order-statistic sensitivity section 5.4 describes, "
            "not a difference in the data.",
            "The last three columns use whole days with every day from "
            + reg.display("smoke.window_start")
            + " to "
            + reg.display("smoke.window_end")
            + " left out under the day definition in use (section 3.5). With the window "
            "included the count of sites above "
            + reg.display("naaqs.daily_standard")
            + " µg/m³ is "
            + reg.display("p98.common.n_above_35")
            + "; with it excluded it is "
            + count_word(reg.display("p98.common_exsmoke.n_above_35"))
            + " under local standard time and "
            + count_word(reg.display("p98.common_clock_exsmoke.n_above_35"))
            + " under local clock time. Under DEQ's cutoff the count is "
            + reg.display("p98.common.n_above_35.deq_cutoff")
            + " with the window included and "
            + count_word(reg.display("p98.common_exsmoke.n_above_35.deq_cutoff"))
            + " under local standard time and "
            + count_word(reg.display("p98.common_clock_exsmoke.n_above_35.deq_cutoff"))
            + " under local clock time with it excluded.",
        ],
    )

    # ---- T06 full-record variants
    t06_rows = []
    for site in sorted(results["p98_full"], key=code_of):
        v = results["p98_full"][site]
        ex = results["p98_full_lst_ex_smoke"][site]
        t06_rows.append(
            [
                code_of(site),
                v["lst_zero_missing"]["days"],
                f"{v['lst_zero_missing']['p98']:.3f}",
                ex["days"],
                f"{ex['p98']:.3f}",
                f"{v['clock_zero_missing']['p98']:.3f}",
                f"{v['clock_zero_kept']['p98']:.3f}",
                f"{v['deq_table4']:.1f}",
                f"{v['lst_zero_missing']['p98'] - v['deq_table4']:+.3f}",
                f"{v['clock_zero_missing']['p98'] - v['deq_table4']:+.3f}",
                f"{v['clock_zero_kept']['p98'] - v['deq_table4']:+.3f}",
            ]
        )
    t06 = tables.Table(
        "T06_p98_full_record_variants",
        "98th percentiles over each site's own record",
        "The same statistic under three defensible method combinations, plus the first of "
        "them with the smoke window excluded, against the value DEQ published in Table 4 of "
        "its " + reg.display("deq.table4_edition_date")
        + " report. No single combination reproduces all "
        + reg.display("p98.full.n_sites")
        + " rows, which is why this is reported as a partial reproduction. The day "
        "boundary accounts for most of the offset; zero handling is minor and inconsistent "
        "in direction.",
        "Frozen sensor exports and DEQ's "
        + reg.display("deq.table4_edition_date")
        + " report, Table 4.",
        {"98th percentile": "µg/m³"},
        [
            "Site code",
            "Record days",
            "98th percentile, local standard time, zeros missing (µg/m³)",
            "Record days, smoke window excluded",
            "98th percentile, local standard time, zeros missing, smoke window excluded "
            "(µg/m³)",
            "98th percentile, local clock time, zeros missing (µg/m³)",
            "98th percentile, local clock time, zeros kept (µg/m³)",
            "DEQ Table 4, 2026-08-07 (µg/m³)",
            "Difference, local standard time, zeros missing (µg/m³)",
            "Difference, local clock time, zeros missing (µg/m³)",
            "Difference, local clock time, zeros kept (µg/m³)",
        ],
        t06_rows,
        notes=[
            "The fourth and fifth columns leave out every day from "
            + reg.display("smoke.window_start")
            + " to "
            + reg.display("smoke.window_end")
            + " (section 3.5). DEQ's table includes them, so the differences are taken "
            "against the columns that include them.",
        ],
    )

    # ---- T07 correlation
    corr = results["correlation"]
    with_smoke = {
        tuple(sorted((code_of(p["a"]), code_of(p["b"])))): p
        for p in results["correlation_with_smoke"]["pairs"]
    }
    t07_rows = []
    for p in corr["pairs"]:
        a, b = sorted((code_of(p["a"]), code_of(p["b"])))
        ws = with_smoke[(a, b)]
        t07_rows.append(
            [
                a,
                b,
                f"{p['r']:.3f}",
                p["n"],
                reg.display(f"corr.with_smoke.{a}_{b}.r"),
                reg.display(f"corr.with_smoke.{a}_{b}.n_hours").replace(",", ""),
            ]
        )
        assert ws["n"] == int(t07_rows[-1][-1])
    t07_rows.sort(key=lambda r: (r[0], r[1]))
    t07 = tables.Table(
        "T07_correlation_matrix",
        "Cross-site hourly correlation",
        "Pearson correlation of hourly PM2.5 between each pair of the "
        + reg.display("corr.n_sensors")
        + " sensors, pairwise-complete, with exact zeros treated as missing, with the smoke "
        "window "
        "excluded and, in the last two columns, included. Long form rather than a grid so "
        "each pair carries its own overlapping-hour count. Descriptive only: high spatial correlation does not establish that local "
        "sources contribute nothing.",
        "Frozen original analysis inputs.",
        {"Pearson r": "dimensionless"},
        [
            "Site code A",
            "Site code B",
            "Pearson r",
            "Overlapping hours",
            "Pearson r, smoke window included",
            "Overlapping hours, smoke window included",
        ],
        t07_rows,
    )

    return [t01, t02, t03, t04, t04s, t05, t06, t07]


# ------------------------------------------------------------------ figures


def build_figures(
    results: dict,
    reg: NumberRegistry,
    out_dir: Path,
    anc: dict | None = None,
) -> list[dict]:
    code_of = site_codes.code_for
    family = figures.configure()
    print(f"figures: font family {family}")
    entries: list[dict] = []
    limitation = figures.deq_limitation_block()

    # ---- F01
    unit_first_seen: dict[str, str] = {}
    for site in site_codes.load():
        for unit in site.units:
            key = unit.unit_id
            if key == "TO_CONFIRM":
                continue
            if key not in unit_first_seen or unit.start_date < unit_first_seen[key]:
                unit_first_seen[key] = unit.start_date
    spans = []
    for site in site_codes.load():
        record = results["record"].get(site.site_id, {})
        days = record.get("all_days", [])
        if not days:
            continue
        moves = []
        for index, unit in enumerate(site.units):
            if unit.unit_id == "TO_CONFIRM":
                continue
            moved_in = unit.start_date != unit_first_seen[unit.unit_id]
            if index > 0 or moved_in:
                moves.append(
                    {
                        "on": figures.as_date(unit.start_date),
                        "label": unit.unit_label,
                    }
                )
        spans.append(
            {"code": site.code, "runs": figures.contiguous_runs(days), "unit_moves": moves}
        )
    marks = {
        "common_start": COMMON_WINDOW_START,
        "common_end": RECORD_END,
        "smoke_start": correlation.SMOKE_START,
        "smoke_end": correlation.SMOKE_END,
        "lines": [
            (date(2026, 8, 10), "regulatory data end"),
            (date(2026, 9, 17), "network\nreconfiguration"),
        ],
    }
    figures.f01_network_timeline(out_dir, spans, marks)
    entries.append(
        {
            "id": "F01_network_timeline",
            "title": "Sensor network coverage by site code",
            "alt_text": (
                f"A timeline of {reg.display('network.sites_total')} sensor sites through the "
                f"{reg.display('freeze.cutoff')[:10]} data cutoff. Coverage is uneven: the "
                f"longest records run from {reg.display('network.first_start')}, while the "
                "shortest Loudoun County record begins on "
                f"{reg.display('network.start.DC-06')} and the "
                f"{reg.display('network.sites_outside_scope')} sites outside Loudoun County "
                f"begin in {reg.display('network.reconfiguration_month')}. All "
                f"{reg.display('p98.common.n_sites')} sensors in the common window were "
                f"collecting together only from {reg.display('network.common_window.start')} to "
                f"{reg.display('network.common_window.end')}."
            ),
            "caption": (
                f"The shaded band is the window in which all {reg.display('p98.common.n_sites')} "
                "sensors were collecting; the darker band is the wildfire smoke transport "
                "weekend, which DEQ's IF qualifier identifies; whether it is an exceptional "
                "event is a determination for the US EPA and is unresolved. Dotted lines mark "
                "the end of the regulatory monitor record and the network reconfiguration."
            ),
            "limitation": limitation,
            "data_table": "T02_site_key",
        }
    )

    # ---- F02
    figures.f02_collocation(out_dir, results["collocation"])
    entries.append(
        {
            "id": "F02_collocation",
            "title": "Collocation: sensor against the regulatory monitor",
            "alt_text": (
                "Four scatter panels of paired hourly readings, sensor on the horizontal "
                "axis and regulatory monitor on the vertical. DEQ's line and the "
                "recomputed line sit close together in every panel; the two PM2.5 panels "
                "show the tighter relationship, at R-squared "
                f"{reg.display('colloc.apex-14_PM2.5.gx_r2')} and "
                f"{reg.display('colloc.apex-05_PM2.5.gx_r2')}, against "
                f"{reg.display('colloc.apex-14_NO2.gx_r2')} and "
                f"{reg.display('colloc.apex-05_NO2.gx_r2')} for NO2."
            ),
            "caption": (
                "Each panel gives DEQ's equation, the recomputed equation, the number of "
                "paired hours and whether the recomputed values match DEQ at DEQ's own "
                "published precision. Every fit stops at the "
                + reg.display("deq.edition_cutoff")
                + " edition cutoff. DEQ's equations are those for the window of its "
                + reg.display("deq.table4_edition_date")
                + " edition; for APEX 5 NO2 (marked †) they are unpublished values supplied "
                "by agency staff for the same window, and the different fit DEQ's "
                + reg.display("deq.edition_date.aug21")
                + " edition prints for that regression over a longer window is given in the "
                "collocation table's note."
            ),
            "limitation": limitation,
            "data_table": "T03_collocation",
        }
    )

    # ---- F03
    figures.f03_daily_reconciliation(out_dir, results["reconciliation"]["rows"])
    entries.append(
        {
            "id": "F03_daily_reconciliation",
            "title": "Daily-average reconciliation, regulatory monitor",
            "alt_text": (
                f"Recomputed daily averages plotted against DEQ's published values for "
                f"{reg.display('daily.n_days')} comparable days. "
                f"{reg.display('daily.n_match')} sit on the one-to-one line; the mean absolute "
                f"difference is {reg.display('daily.mean_abs_diff')} micrograms per cubic "
                "metre. One day differs."
            ),
            "caption": (
                "Recomputed 24-hour means against DEQ's published daily file, truncated to "
                "one decimal as DEQ truncates. The single marked day is the one that "
                f"differs, at {reg.display('daily.mismatch_valid_hours')} valid hours. "
                "Comparable days are those surviving DEQ's null-code and logger-invalid "
                f"exclusions and clearing {reg.display('completeness.valid_hours')} of "
                f"{reg.display('completeness.hours_per_day')} valid hours."
            ),
            # Regulatory data only: no sensor is plotted, so DEQ's sensor limitation does
            # not apply here (DECISIONS.md D57; CONTEXT.md section 3, amended 2026-11-16).
            "limitation": (
                "Regulatory monitor data only, no sensor data: Virginia DEQ's federal "
                "equivalent method PM2.5 monitor at site DC-01, released under Virginia FOIA "
                f"request 26-4646, hourly record ending {reg.display('regulatory.record_end')}."
            ),
            "data_table": "T04_daily_reconciliation",
        }
    )

    # ---- F04
    f04_rows = []
    for site in COMMON_WINDOW_SITES:
        full = results["p98_full"][site]["lst_zero_missing"]
        common = results["p98_common_standard"][site]
        exsmoke = results["p98_common_standard_ex_smoke"][site]
        f04_rows.append(
            {
                "code": code_of(site),
                "full_p98": full["p98"],
                "full_days": full["days"],
                "common_p98": common["p98"],
                "common_days": common["days"],
                "exsmoke_p98": exsmoke["p98"],
                "exsmoke_days": exsmoke["days"],
            }
        )
    figures.f04_p98_by_site(out_dir, f04_rows)
    shortest = min(f04_rows, key=lambda r: r["full_days"])
    longest = max(f04_rows, key=lambda r: r["full_days"])
    # The caption's record lengths come from the network.record_days keys, and the
    # keys must agree with the days the figure annotates.
    shortest_days = reg.display(f"network.record_days.{shortest['code']}")
    longest_days = reg.display(f"network.record_days.{longest['code']}")
    for row, shown in ((shortest, shortest_days), (longest, longest_days)):
        if int(shown) != row["full_days"]:
            raise ValueError(
                f"F04 caption: network.record_days.{row['code']} is {shown} but the figure "
                f"annotates {row['full_days']} days"
            )
    entries.append(
        {
            "id": "F04_p98_by_site",
            "title": "Record length and one smoke weekend move the 98th percentile",
            "alt_text": (
                "For each site code, the 98th percentile over the site's own record and over "
                "the common window, joined by a line, and below them the common-window value "
                "with the smoke window excluded, joined by a dotted line. The site with the "
                f"shortest record, {shortest['code']} at {shortest_days} days, carries the "
                f"highest own-record value; {longest['code']} has {longest_days} days. On the "
                f"common window {reg.display('p98.common.n_above_35')} of "
                f"{reg.display('p98.common.n_sites')} sites sit above the "
                f"{reg.display('naaqs.daily_standard')} microgram line; with the smoke window "
                f"excluded, {count_word(reg.display('p98.common_exsmoke.n_above_35'))} do, the "
                f"values running from {reg.display('p98.common_exsmoke.min')} to "
                f"{reg.display('p98.common_exsmoke.max')}."
            ),
            "caption": (
                "Own-record against common-window 98th percentiles, with record days "
                f"annotated. A 98th percentile read from a {shortest_days}-day record is a "
                f"different order statistic from one read from {longest_days} days. "
                "Triangles give the common-window value with every day from "
                f"{reg.display('smoke.window_start')} to {reg.display('smoke.window_end')} "
                "excluded, local standard time days; the own-record values with that window "
                "excluded are in the own-record table. The horizontal line marks the level "
                "of the 24-hour standard and is not a threshold being crossed: neither these "
                "values nor DEQ's are comparable to the NAAQS."
            ),
            "limitation": limitation,
            "data_table": "T05_p98_common_window",
        }
    )

    # ---- F05
    corr = results["correlation"]
    matrix = {}
    for pair in corr["pairs"]:
        a, b = code_of(pair["a"]), code_of(pair["b"])
        matrix[(min(a, b), max(a, b))] = pair["r"]
    codes = _codes_for_common_window()
    figures.f05_correlation_heatmap(out_dir, codes, matrix)
    entries.append(
        {
            "id": "F05_correlation_heatmap",
            "title": "Cross-site hourly PM2.5 correlation",
            "alt_text": (
                f"A {reg.display('p98.common.n_sites')}-by-{reg.display('p98.common.n_sites')} "
                "matrix of pairwise correlations, every cell labelled. All "
                f"{reg.display('corr.n_pairs')} pairs fall between {reg.display('corr.min')} and "
                f"{reg.display('corr.max')}, so the sensors largely rise and fall together "
                "across the network."
            ),
            "caption": (
                "Pearson correlation of hourly PM2.5 between each pair of sensors, "
                "pairwise-complete, smoke window excluded, exact zeros treated as missing. "
                f"With the smoke window included the pairs fall between "
                f"{reg.display('corr.with_smoke.min')} and {reg.display('corr.with_smoke.max')} "
                "(the data table gives each pair both ways). "
                "Descriptive only: high spatial correlation does not establish that local "
                "sources contribute nothing, since the network may sit largely upwind and a "
                "local increment can be masked by a dominant regional signal."
            ),
            "limitation": limitation,
            "data_table": "T07_correlation_matrix",
        }
    )

    # ---- F06. Not a sensor figure, so it does not carry the DEQ CFR limitation:
    # that quotation is about low-cost air sensors and says nothing about a study
    # population or a census table. Its own limitation is composed below.
    if anc is not None:
        top, top_subtitle, bottom, bottom_subtitle = ancestry_report.figure_segments(anc)
        figures.f06_ancestry_composition(
            out_dir, top, top_subtitle, bottom, bottom_subtitle
        )
        discovery = anc["discovery"]
        largest = discovery["categories"][0]
        largest_share = reg.display(
            f"ancestry.discovery.{ancestry.slug(largest['category'])}.share"
        )
        entries.append(
            {
                "id": "F06_ancestry_composition",
                "title": (
                    "Who the asthma GWAS evidence was measured in, and who lives in "
                    "Loudoun County"
                ),
                "alt_text": (
                    "Two separate horizontal stacked bars. The upper bar shows that "
                    f"{largest_share} percent of asthma GWAS discovery individuals sit "
                    f"in the {largest['category']} category. The lower bar shows "
                    "Loudoun County residents by self-identified race, a different "
                    "measurement of a different population."
                ),
                "caption": (
                    "Upper panel: initial-stage discovery individuals across the asthma "
                    f"studies in GWAS Catalog release {anc['release']}, by the catalogue's "
                    "broad ancestral category. Lower panel: Loudoun County residents by "
                    f"self-identified race, {anc['acs']['dataset']}, table B02001. "
                    + ancestry_report.ACS_CATEGORY_SENTENCE
                    + " The two panels have separate axes and are not comparable: one "
                    "counts people enrolled in studies and groups them by genetic "
                    "ancestry, the other counts residents and groups them by a social "
                    "category."
                ),
                "limitation": ancestry_report.FIGURE_LIMITATION,
                "data_table": "T10_gwas_ancestry_composition",
            }
        )

    figures.write_manifest(entries, out_dir)
    return entries


# --------------------------------------------------------------------- atlas

# Neither inventory nor chain output goes into `numbers.json` or `tables.json`. Those
# two are the DEQ half's artifacts and CI gates on their bytes, so the atlas half
# carries its own key file and its own table manifest and the DEQ outputs stay
# byte-identical across this change (D26).
ATLAS_DOC_NOTE = (
    "The atlas half of the report. Keys are namespaced inventory.* and chain.* and live "
    "here rather than in numbers.json, which holds the DEQ half and is gated on "
    "byte-identity. Every count is reported against the atlas freeze date and computed "
    "from the records FREEZE.json pins under atlas_inputs."
)


def _atlas_inputs(fz: Freeze, module: str) -> list[dict]:
    """Provenance stamp for one atlas module: every pinned record, by path and hash."""
    return [{"source": e.rel_path, "sha256": e.sha256} for e in fz.atlas_files(module)]


def _atlas_digest(fz: Freeze) -> list[dict]:
    """One stamp over the whole pinned atlas, for the total that spans every module."""
    digest = hashlib.sha256()
    for module, _ in freeze_lib.ATLAS_MODULES:
        for entry in fz.atlas_files(module):
            digest.update(entry.sha256.encode("ascii"))
    return [
        {
            "source": (
                "SHA-256 over the SHA-256 of every atlas record pinned in FREEZE.json "
                "atlas_inputs, in module then path order"
            ),
            "sha256": digest.hexdigest(),
        }
    ]


def _atlas_record_inputs(fz: Freeze, rel_paths: list[str]) -> list[dict]:
    entries = [fz.atlas_entry(rel) for rel in rel_paths]
    return [{"source": e.rel_path, "sha256": e.sha256} for e in entries]


def build_inventory(fz: Freeze, out_dir: Path) -> dict:
    """inventory.* keys plus T08. Counts carry the atlas freeze date."""
    inv = atlas.inventory(fz)
    frozen_at = inv["frozen_at"]
    as_of = f"atlas as frozen {frozen_at}"

    reg = NumberRegistry()
    reg.add(
        "inventory.frozen_at",
        frozen_at,
        method="atlas freeze date recorded in FREEZE.json atlas_inputs; every count below "
        "is the count on that date",
    )
    for module in inv["modules"]:
        reg.add(
            f"inventory.{module['module']}.records",
            module["record_count"],
            unit="records",
            precision=0,
            window=as_of,
            method=f"JSON records pinned under {module['dir']}",
            inputs=_atlas_inputs(fz, module["module"]),
        )
        reg.add(
            f"inventory.{module['module']}.status",
            module["status"],
            window=as_of,
            method="module status as of the atlas freeze",
        )
    reg.add(
        "inventory.module_count",
        len(inv["modules"]),
        unit="modules",
        precision=0,
        window=as_of,
        method="atlas modules counted in the inventory, the knowledge graph included",
    )
    reg.add(
        "inventory.reproducible_module_count",
        sum(1 for module in inv["modules"] if module["module"] != atlas.GRAPH_MODULE),
        unit="modules",
        precision=0,
        window=as_of,
        method="modules emitted by the current pipeline and reproducible from it: every module "
        "but the knowledge graph (DECISIONS.md D25)",
    )
    reg.add(
        "inventory.record_total",
        inv["record_total"],
        unit="records",
        precision=0,
        window=as_of,
        method="sum of the record counts of every module above",
        inputs=_atlas_digest(fz),
    )
    graph_inputs = _atlas_inputs(fz, atlas.GRAPH_MODULE)
    for key, value, unit in (
        ("inventory.graph.nodes", inv["graph"]["node_count"], "nodes"),
        ("inventory.graph.edges", inv["graph"]["edge_count"], "edges"),
    ):
        reg.add(
            key,
            value,
            unit=unit,
            precision=0,
            window=as_of,
            method=f"length of the {unit} array in the committed {atlas.GRAPH_PATH}, "
            "checked against its own metadata count",
            inputs=graph_inputs,
        )
    reg.add(
        "inventory.graph.generated_at",
        inv["graph"]["generated_at"],
        window=as_of,
        method=f"metadata.generated_at in the committed {atlas.GRAPH_PATH}",
        inputs=graph_inputs,
    )
    reg.add(
        "inventory.graph.status",
        atlas.GRAPH_STATUS,
        window=as_of,
        method="DECISIONS.md D25: the published graph is repaired in place and kept at its "
        "committed counts; a clean rebuild of the current pipeline yields different ones",
        inputs=graph_inputs,
    )

    table = tables.Table(
        "T08_module_inventory",
        "Atlas module inventory",
        "Record counts for every atlas module at the atlas freeze date, with each module's "
        "status. The knowledge graph's counts are the committed published figures: the graph "
        "is not reproducible from the current pipeline, which is why its status differs from "
        "every other row's and why report section 7 carries the disclosure. No brief title "
        "and no entity prose is quoted here; the inventory counts records and names none.",
        f"Atlas records pinned in FREEZE.json atlas_inputs, frozen {frozen_at}.",
        {"Records": "count", "Graph nodes": "count", "Graph edges": "count"},
        [
            "Module",
            "Records",
            "Graph nodes",
            "Graph edges",
            "Status",
            "As of (atlas freeze)",
        ],
        [
            [
                module["label"],
                module["record_count"],
                inv["graph"]["node_count"] if module["module"] == atlas.GRAPH_MODULE else "",
                inv["graph"]["edge_count"] if module["module"] == atlas.GRAPH_MODULE else "",
                atlas.GRAPH_STATUS_TEXT
                if module["module"] == atlas.GRAPH_MODULE
                else module["status"],
                frozen_at,
            ]
            for module in inv["modules"]
        ],
    )
    table.write(out_dir)
    _write_atlas_doc(
        out_dir / "inventory.json",
        reg,
        table,
        {"atlas_freeze_date": frozen_at, "graph": inv["graph"]},
    )
    return inv


def build_chain(fz: Freeze, out_dir: Path) -> dict:
    """chain.* keys plus T09, the five published links and their evidence classes."""
    chn = atlas.chain(fz)
    frozen_at = fz.atlas_frozen_at()
    as_of = f"atlas as frozen {frozen_at}"
    record_inputs = _atlas_record_inputs(
        fz,
        [
            f"data/genes/{atlas.CHAIN_GENE}.json",
            f"data/diseases/{atlas.CHAIN_DISEASE}.json",
            f"data/briefs/{atlas.CHAIN_BRIEF}.json",
        ],
    )

    reg = NumberRegistry()
    reg.add(
        "chain.steps",
        len(chn["steps"]),
        unit="links",
        precision=0,
        window=as_of,
        method=f"links in the published {chn['figure_id']} chain, six nodes end to end",
        inputs=record_inputs,
    )
    for step in chn["steps"]:
        prefix = f"chain.step{step['step']}"
        reg.add(
            f"{prefix}.link",
            f"{step['from']} to {step['to']}",
            window=as_of,
            method="chain link as the published figure composes it",
            inputs=record_inputs,
        )
        reg.add(
            f"{prefix}.evidence_class",
            step["evidence_class"],
            window=as_of,
            method=f"evidence class read from {step['evidence_class_source']}",
            inputs=record_inputs,
        )
    reg.add(
        "chain.inferred_steps",
        chn["inferred_steps"],
        unit="links",
        precision=0,
        window=as_of,
        method="links carrying the inferred evidence class, which have no direct evidence in "
        "the atlas and are drawn dashed in the figure",
        inputs=record_inputs,
    )
    from_records = sum(1 for step in chn["steps"] if step["from_an_atlas_record"])
    reg.add(
        "chain.steps_from_records",
        from_records,
        unit="links",
        precision=0,
        window=as_of,
        method="links whose evidence class is read from an atlas record",
        inputs=record_inputs,
    )
    reg.add(
        "chain.steps_from_figure",
        len(chn["steps"]) - from_records,
        unit="links",
        precision=0,
        window=as_of,
        method="links whose evidence class the figure definition assigns rather than an atlas "
        "record",
        inputs=record_inputs,
    )
    reg.add(
        "chain.confidence",
        chn["confidence"],
        window=as_of,
        method=f"confidence on the {atlas.CHAIN_EXPOSURE} exposure modifier of "
        f"data/diseases/{atlas.CHAIN_DISEASE}.json",
        inputs=record_inputs,
    )
    reg.add(
        "chain.direction",
        chn["direction"],
        window=as_of,
        method=f"direction on the {atlas.CHAIN_EXPOSURE} exposure modifier of "
        f"data/diseases/{atlas.CHAIN_DISEASE}.json",
        inputs=record_inputs,
    )
    reg.add(
        "chain.reference_count",
        chn["reference_count"],
        unit="references",
        precision=0,
        window=as_of,
        method=f"references carried by data/briefs/{atlas.CHAIN_BRIEF}.json",
        inputs=record_inputs,
    )

    table = tables.Table(
        "T09_chain_evidence",
        "Mechanism chain evidence by link",
        "Each link of the published "
        + reg.display("chain.steps")
        + "-step chain with its evidence class and where that class comes from. "
        + reg.display("chain.steps_from_records")
        + " classes are read from atlas records; "
        + reg.display("chain.steps_from_figure")
        + " are assigned by the figure definition and are marked as such, so a reader does not take every class for "
        "a record value. A link marked inferred has no direct evidence in the atlas. Every "
        "association here is population-level, and the chain states a mechanism: no link "
        "asserts that one step brings about the next.",
        f"Atlas records pinned in FREEZE.json atlas_inputs, frozen {frozen_at}.",
        {},
        [
            "Step",
            "From",
            "To",
            "Evidence class",
            "Class read from an atlas record",
            "Source of the evidence class",
            "As of (atlas freeze)",
        ],
        [
            [
                step["step"],
                step["from"],
                step["to"],
                step["evidence_class"],
                "yes" if step["from_an_atlas_record"] else "no",
                step["evidence_class_source"],
                frozen_at,
            ]
            for step in chn["steps"]
        ],
    )
    table.write(out_dir)
    _write_atlas_doc(
        out_dir / "chain.json",
        reg,
        table,
        {
            "atlas_freeze_date": frozen_at,
            "brief": chn["brief"],
            "figure_id": chn["figure_id"],
        },
    )
    return chn


def _write_atlas_doc(path: Path, reg: NumberRegistry, table: tables.Table, extra: dict) -> None:
    document = {
        "note": ATLAS_DOC_NOTE,
        "keys": reg.as_dict(),
        "table": table.manifest_entry(),
        **extra,
    }
    with open(path, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(document, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")


# --------------------------------------------------------------- atlas gate


def add_ancestry_inputs(fz: Freeze, acs_release: str) -> int:
    """Pin the ancestry inputs in FREEZE.json."""
    block = fz.take_ancestry_inputs(acs_release)
    print(
        f"ancestry_inputs pinned in {fz.path.name}: {len(block['files'])} records, "
        f"GWAS Catalog release {block['gwas_release_date']}, ACS {block['acs_release']}, "
        f"frozen {block['frozen_at']}"
    )
    for entry in block["files"]:
        print(f"  {entry['role']:<26} {entry['sha256'][:16]}...  {entry['path']}")
    for entry in block["full_downloads"]:
        print(f"  {'full download (not stored)':<26} {entry['sha256'][:16]}...  {entry['name']}")
    return 0


def add_atlas_inputs(fz: Freeze) -> int:
    blockers = fz.atlas_gate_blockers()
    if blockers:
        print("ABORT: atlas freeze blocked.", file=sys.stderr)
        for blocker in blockers:
            print(f"  {blocker}", file=sys.stderr)
        print(
            "No atlas_inputs block written. DEQ outputs unaffected.\n"
            "The inventory and mechanism-chain keys stay unemitted, with no placeholders, "
            "until all three gate conditions hold.",
            file=sys.stderr,
        )
        return 1
    block = fz.take_atlas_inputs()
    print(
        f"atlas_inputs pinned in {fz.path.name}: {len(block['files'])} records across "
        f"{len(block['modules'])} modules, frozen {block['frozen_at']}"
    )
    for module in block["modules"]:
        print(f"  {module['module']:<18} {module['record_count']:>3} records  {module['dir']}")
    print(f"  graph status: {block['graph_status']}")
    return 0


# -------------------------------------------------------------------- entry


def build_from_freeze(freeze_path: Path, out_dir: Path, show_verify: bool) -> int:
    fz = Freeze(freeze_path)
    if fz.ensure_config_inputs():
        print(f"pinned configuration inputs in {freeze_path.name}")
    checked = fz.verify_all()
    print(f"{len(checked)} frozen inputs hash-verified")

    results = compute(fz)
    reg = build_numbers(fz, results)

    # The ancestry half runs only once its inputs are pinned, and its keys go into
    # the shared registry rather than a file of their own: report prose cites them
    # through <N> like any other number. While the block is unpinned nothing is
    # emitted and no key appears as a placeholder.
    anc = None
    if fz.ancestry_inputs() is None:
        print(
            "ancestry: not frozen; ancestry.*, T10, T11, T12 and F06 not emitted "
            "(pin ancestry_inputs in FREEZE.json)"
        )
    else:
        anc = ancestry_report.compute(fz)
        ancestry_report.build_numbers(fz, anc, reg)

    numbers_path = reg.write(out_dir / "numbers.json")
    print(f"numbers.json: {len(reg)} keys -> {numbers_path}")

    report_tables = build_tables(fz, results, reg)
    if anc is not None:
        report_tables += ancestry_report.build_tables(anc)
    written = tables.write_tables(report_tables, out_dir)
    print(f"tables: {len(written) - 1} CSV plus tables.json")

    entries = build_figures(results, reg, out_dir, anc)
    print(f"figures: {len(entries)} as SVG and 300-dpi PNG plus figures.json")

    if anc is not None:
        discovery = anc["discovery"]
        print(
            f"ancestry: GWAS Catalog {anc['release']}, "
            f"{discovery['total_individuals']:,} discovery individuals across "
            f"{discovery['studies']} studies in "
            f"{len(discovery['categories'])} categories; ACS {anc['acs']['release']}"
        )

    # The atlas half runs only once its inputs are pinned. While they are not, nothing
    # is written and no key is emitted as a placeholder: a reader of inventory.json has
    # to be able to take every count in it as frozen and verified.
    if fz.atlas_inputs() is None:
        print(
            "atlas: not frozen; inventory.*, chain.*, T08 and T09 not emitted "
            "(run --add-atlas-inputs)"
        )
    else:
        inv = build_inventory(fz, out_dir)
        chn = build_chain(fz, out_dir)
        print(
            f"atlas: inventory.json and T08 ({inv['record_total']} records across "
            f"{len(inv['modules'])} modules, graph {inv['graph']['node_count']}/"
            f"{inv['graph']['edge_count']}), chain.json and T09 "
            f"({len(chn['steps'])} links), frozen {inv['frozen_at']}"
        )

    rows = verify.build_rows(results, site_codes.code_for)
    failed = [r for r in rows if not r.match]
    if show_verify or failed:
        print()
        print(verify.render(rows))
    if failed:
        print(
            "\nSTOP: an original-window value did not reproduce. Reporting rather than "
            "adjusting the computation.",
            file=sys.stderr,
        )
        return 1
    return 0


def run_report(
    year: str | int | None = None,
    freeze: str | Path | None = None,
    out_dir: str | Path | None = None,
    add_atlas: bool = False,
    add_ancestry: str | None = None,
    show_verify: bool = False,
) -> int:
    """Run report generation. Returns 0 on success, 1 on error."""
    y = year or datetime.now().year
    try:
        if freeze is None:
            path = generate_report(y, out_dir)
            print(f"Report generated: {path}")
            return 0
        freeze_path = Path(freeze).resolve()
        target = Path(out_dir).resolve() if out_dir else _resolve_reports_dir() / str(y)
        target.mkdir(parents=True, exist_ok=True)
        fz = Freeze(freeze_path)
        if add_atlas:
            return add_atlas_inputs(fz)
        if add_ancestry:
            return add_ancestry_inputs(fz, add_ancestry)
        return build_from_freeze(freeze_path, target, show_verify)
    except (FreezeError, OSError, ValueError, KeyError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="pipeline.report", description=__doc__)
    parser.add_argument("--year", default=None)
    parser.add_argument(
        "--freeze",
        default=None,
        help="path to FREEZE.json; recomputes every number, table and figure",
    )
    parser.add_argument("--out-dir", default=None)
    parser.add_argument(
        "--add-atlas-inputs",
        action="store_true",
        help="pin the atlas inputs in FREEZE.json; refuses while the graph rebuild is absent",
    )
    parser.add_argument(
        "--add-ancestry-inputs",
        default=None,
        metavar="ACS_RELEASE",
        help="pin the ancestry inputs in FREEZE.json for the named ACS 5-year release",
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="print the CONTEXT value against recomputed value table",
    )
    args = parser.parse_args(argv)
    return run_report(
        year=args.year,
        freeze=args.freeze,
        out_dir=args.out_dir,
        add_atlas=args.add_atlas_inputs,
        add_ancestry=args.add_ancestry_inputs,
        show_verify=args.verify,
    )


if __name__ == "__main__":
    sys.exit(main())
