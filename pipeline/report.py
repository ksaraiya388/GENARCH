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
import json
import sys
from datetime import date, datetime
from pathlib import Path

from pipeline.report_lib import (
    collocation,
    correlation,
    daily,
    figures,
    reconciliation,
    site_codes,
    tables,
    verify,
)
from pipeline.report_lib.freeze import Freeze, FreezeError
from pipeline.report_lib.numbers import NumberRegistry
from pipeline.report_lib.rows import build_regulatory_rows, build_rows
from pipeline.reshape_deq import REGULATORY_DAILY_FILE, read_published_daily

# site/src/lib/deq-data.ts. RECORD_END is date-level and drives the percentile
# windows; DEQ_EDITION_CUTOFF is hour-level and drives the collocation fits. The
# two are not interchangeable and neither is rewritten in terms of the other.
RECORD_END = date(2026, 8, 7)
COMMON_WINDOW_START = date(2026, 6, 18)
DEQ_EDITION_CUTOFF = datetime(2026, 8, 7, 7, 0)
DEQ_EDITION_CUTOFF_LABEL = "2026-08-07T07:00 EST"
PM25_24H_LEVEL = 35

MANIFEST_PATH = "pipeline/sources/manifest.json"

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


def generate_report(year: str | int) -> Path:
    """Generate the annual report index for a given year."""
    year_str = str(year)
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

    august_rows = build_rows(august)
    frozen_rows = build_rows(frozen)
    regulatory_rows = build_regulatory_rows(
        lambda name: fz.verified_path(fz.regulatory_named(name).rel_path)
    )
    published = read_published_daily(
        fz.verified_path(fz.regulatory_named(REGULATORY_DAILY_FILE).rel_path)
    )

    results: dict = {
        "collocation": collocation.fit_all(august_rows, regulatory_rows),
        "reconciliation": reconciliation.reconcile(regulatory_rows, published),
        "correlation": correlation.correlations(august_rows, list(COMMON_WINDOW_SITES)),
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
    return results


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
        method="DEQ builds each weekly edition from data through 07:00 that Friday "
        "(DEQ staff, 2026-08-16)",
        inputs=table4_inputs,
    )

    # ---- network
    all_sites = site_codes.load()
    reg.add(
        "network.sites_total",
        len(all_sites),
        unit="sites",
        precision=0,
        method="distinct physical sites in the sensor site history",
        inputs=inputs_for(fz, [fz.config_input("pipeline/sources/deq_sensor_site_history.csv")]),
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
            " exact zeros retained in this fit only (DEQ staff, 2026-08-19)"
            if fit["retains_exact_zeros"]
            else " exact zeros treated as missing"
        )
        window = f"{fit['period_start']} to {fit['period_end']} EST"
        for field, value, precision, note in (
            ("deq_intercept", fit["deq_intercept"], None, "DEQ published, two significant figures"),
            ("deq_slope", fit["deq_slope"], None, "DEQ published, two significant figures"),
            ("deq_r2", fit["deq_r2"], None, "DEQ published, two significant figures"),
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
    return reg


def _codes_for_common_window() -> list[str]:
    return sorted(site_codes.code_for(s) for s in COMMON_WINDOW_SITES)


# ------------------------------------------------------------------- tables


def build_tables(fz: Freeze, results: dict, reg: NumberRegistry) -> list[tables.Table]:
    code_of = site_codes.code_for
    manifest = json.loads(
        fz.verified_path(MANIFEST_PATH).read_text(encoding="utf-8")
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
                return origin_of(entry), entry.get("license", "")
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
                    entry.export_date,
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
        origin, licence = provenance(entry.path.name, weekly_fallback)
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

    t01 = tables.Table(
        "T01_sources",
        "Frozen inputs",
        "Every file the report's analysis reads, as pinned in the data freeze. Sensor "
        "exports are named by site code; each row is identified by its SHA-256 so the "
        "reproduction stays checkable without printing a filename that carries a site "
        "identifier.",
        "data/reports/2026/FREEZE.json and pipeline/sources/manifest.json.",
        {"Data cutoff": "local clock for sensors, EST for the regulatory monitor"},
        ["Source", "Origin", "Licence", "Export date", "Data cutoff", "SHA-256"],
        t01_rows,
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
            f["status"],
        ]
        for f in results["collocation"]
    ]
    t03 = tables.Table(
        "T03_collocation",
        "Collocation regressions",
        "The four regressions at the collocated site, sensor on x and regulatory monitor on "
        "y, each fit stopping at DEQ's 2026-08-07 07:00 EST edition cutoff. DEQ publishes "
        "its coefficients to two significant figures, so status reports whether each "
        "recomputed value, rounded to the decimals DEQ printed, equals DEQ's. Exact zeros "
        "are retained in the APEX 5 NO2 fit and in nothing else.",
        "Frozen original analysis inputs and FOIA 26-4646, against DEQ's published "
        "coefficients.",
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
            "Period start",
            "Period end",
            "Status",
        ],
        t03_rows,
    )

    # ---- T04 daily reconciliation
    rec = results["reconciliation"]
    t04 = tables.Table(
        "T04_daily_reconciliation",
        "Daily-average reconciliation, by day",
        "Recomputed 24-hour means of the regulatory monitor against DEQ's published daily "
        "file, truncated to one decimal as DEQ truncates. One row per comparable day.",
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
        "null-code and logger-invalid exclusions and the recomputed day clears 18 of 24 "
        "valid hours.",
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
    )

    # ---- T05 common-window percentiles
    t05_rows = []
    for binning, key, label in (
        ("standard", "p98_common_standard", "local standard time"),
        ("clock", "p98_common_clock", "local clock time"),
    ):
        ranked = sorted(results[key].items(), key=lambda kv: -kv[1]["p98"])
        ranks = {site: i for i, (site, _) in enumerate(ranked, start=1)}
        for site in sorted(results[key], key=code_of):
            whole = results[key][site]
            cut = results[key + "_deq_cutoff"][site]
            t05_rows.append(
                [
                    code_of(site),
                    label,
                    whole["days"],
                    f"{whole['p98']:.3f}",
                    cut["days"],
                    f"{cut['p98']:.3f}",
                    ranks[site],
                ]
            )
    t05 = tables.Table(
        "T05_p98_common_window",
        "98th percentiles on the common window",
        "The six sensors restricted to the window in which all six were collecting, under "
        "both day definitions and both cutoffs. Restricting to a common window removes the "
        "unequal-record-length difference; it does not remove the unequal-seasonality one, "
        "because the window is entirely high summer and contains the smoke period. Neither "
        "these values nor DEQ's are comparable to the NAAQS.",
        "Frozen sensor exports; DEQ's edition cutoff is 2026-08-07 07:00 EST.",
        {"98th percentile": "µg/m³"},
        [
            "Site code",
            "Day definition",
            "Whole-day record days",
            "Whole-day 98th percentile (µg/m³)",
            "DEQ-cutoff record days",
            "DEQ-cutoff 98th percentile (µg/m³)",
            "Rank",
        ],
        t05_rows,
    )

    # ---- T06 full-record variants
    t06_rows = []
    for site in sorted(results["p98_full"], key=code_of):
        v = results["p98_full"][site]
        t06_rows.append(
            [
                code_of(site),
                v["lst_zero_missing"]["days"],
                f"{v['lst_zero_missing']['p98']:.3f}",
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
        "The same statistic under three defensible method combinations, against the value "
        "DEQ published in Table 4 of its 2026-08-07 report. No single combination reproduces "
        "all nine rows, which is why this is reported as a partial reproduction. The day "
        "boundary accounts for most of the offset; zero handling is minor and inconsistent "
        "in direction.",
        "Frozen sensor exports and DEQ's 2026-08-07 report, Table 4.",
        {"98th percentile": "µg/m³"},
        [
            "Site code",
            "Record days",
            "98th percentile, local standard time, zeros missing (µg/m³)",
            "98th percentile, local clock time, zeros missing (µg/m³)",
            "98th percentile, local clock time, zeros kept (µg/m³)",
            "DEQ Table 4, 2026-08-07 (µg/m³)",
            "Difference, local standard time, zeros missing (µg/m³)",
            "Difference, local clock time, zeros missing (µg/m³)",
            "Difference, local clock time, zeros kept (µg/m³)",
        ],
        t06_rows,
    )

    # ---- T07 correlation
    corr = results["correlation"]
    t07_rows = sorted(
        (
            [code_of(p["a"]), code_of(p["b"]), f"{p['r']:.3f}", p["n"]]
            for p in corr["pairs"]
        ),
        key=lambda r: (r[0], r[1]),
    )
    t07 = tables.Table(
        "T07_correlation_matrix",
        "Cross-site hourly correlation",
        "Pearson correlation of hourly PM2.5 between each pair of the six sensors, "
        "pairwise-complete, with the smoke window excluded and exact zeros treated as "
        "missing. Long form rather than a grid so each pair carries its own overlapping-hour "
        "count. Descriptive only: high spatial correlation does not establish that local "
        "sources contribute nothing.",
        "Frozen original analysis inputs.",
        {"Pearson r": "dimensionless"},
        ["Site code A", "Site code B", "Pearson r", "Overlapping hours"],
        t07_rows,
    )

    return [t01, t02, t03, t04, t04s, t05, t06, t07]


# ------------------------------------------------------------------ figures


def build_figures(results: dict, reg: NumberRegistry, out_dir: Path) -> list[dict]:
    code_of = site_codes.code_for
    figures.configure()
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
            (date(2026, 9, 17), "network reconfiguration"),
        ],
    }
    figures.f01_network_timeline(out_dir, spans, marks)
    entries.append(
        {
            "id": "F01_network_timeline",
            "title": "Sensor network coverage by site code",
            "alt_text": (
                f"A timeline of {reg.value('network.sites_total')} sensor sites across 2026. "
                "Coverage is uneven: the longest records run from early March, while the "
                f"shortest begins in mid-June. All six sensors in the common window were "
                f"collecting together only from {reg.value('network.common_window.start')} to "
                f"{reg.value('network.common_window.end')}."
            ),
            "caption": (
                "Coverage by site code. The shaded band is the window in which all six "
                "sensors were collecting; the darker band is the wildfire smoke transport "
                "weekend. Dotted lines mark the end of the regulatory monitor record and the "
                "network reconfiguration."
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
                "axis and regulatory monitor on the vertical. DEQ's published line and the "
                "recomputed line sit close together in every panel; the two PM2.5 panels "
                "show the tighter relationship, at R-squared "
                f"{reg.value('colloc.apex-14_PM2.5.gx_r2')} and "
                f"{reg.value('colloc.apex-05_PM2.5.gx_r2')}, against "
                f"{reg.value('colloc.apex-14_NO2.gx_r2')} and "
                f"{reg.value('colloc.apex-05_NO2.gx_r2')} for NO2."
            ),
            "caption": (
                "Each panel gives DEQ's published equation, the recomputed equation, the "
                "number of paired hours and whether the recomputed values match DEQ at "
                "DEQ's own published precision. Every fit stops at the 2026-08-07 07:00 EST "
                "edition cutoff."
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
                f"{reg.value('daily.n_days')} comparable days. "
                f"{reg.value('daily.n_match')} sit on the one-to-one line; the mean absolute "
                f"difference is {reg.value('daily.mean_abs_diff')} micrograms per cubic "
                "metre. One day differs."
            ),
            "caption": (
                "Recomputed 24-hour means against DEQ's published daily file, truncated to "
                "one decimal as DEQ truncates. The single marked day is the one that "
                "differs, at 23 valid hours. Comparable days are those surviving DEQ's "
                "null-code and logger-invalid exclusions and clearing 18 of 24 valid hours."
            ),
            "limitation": limitation,
            "data_table": "T04_daily_reconciliation",
        }
    )

    # ---- F04
    f04_rows = []
    for site in COMMON_WINDOW_SITES:
        full = results["p98_full"][site]["lst_zero_missing"]
        common = results["p98_common_standard"][site]
        f04_rows.append(
            {
                "code": code_of(site),
                "full_p98": full["p98"],
                "full_days": full["days"],
                "common_p98": common["p98"],
                "common_days": common["days"],
            }
        )
    figures.f04_p98_by_site(out_dir, f04_rows)
    shortest = min(f04_rows, key=lambda r: r["full_days"])
    longest = max(f04_rows, key=lambda r: r["full_days"])
    entries.append(
        {
            "id": "F04_p98_by_site",
            "title": "Record length moves the 98th percentile",
            "alt_text": (
                "For each site code, the 98th percentile over the site's own record and over "
                "the common window, joined by a line. The site with the shortest record, "
                f"{shortest['code']} at {shortest['full_days']} days, carries the highest "
                f"own-record value; {longest['code']} has {longest['full_days']} days. On the "
                f"common window {reg.value('p98.common.n_above_35')} of six sites sit above "
                "the 35 microgram line."
            ),
            "caption": (
                "Own-record against common-window 98th percentiles, with record days "
                "annotated. A 98th percentile read from a 51-day record is a different order "
                "statistic from one read from 152 days. The horizontal line marks the level "
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
                "A six-by-six matrix of pairwise correlations, every cell labelled. All "
                f"fifteen pairs fall between {reg.value('corr.min')} and "
                f"{reg.value('corr.max')}, so the sensors largely rise and fall together "
                "across the network."
            ),
            "caption": (
                "Pearson correlation of hourly PM2.5 between each pair of sensors, "
                "pairwise-complete, smoke window excluded, exact zeros treated as missing. "
                "Descriptive only: high spatial correlation does not establish that local "
                "sources contribute nothing, since the network may sit largely upwind and a "
                "local increment can be masked by a dominant regional signal."
            ),
            "limitation": limitation,
            "data_table": "T07_correlation_matrix",
        }
    )

    figures.write_manifest(entries, out_dir)
    return entries


# --------------------------------------------------------------- atlas gate


def add_atlas_inputs(fz: Freeze) -> int:
    blockers = fz.atlas_gate_blockers()
    if blockers:
        print("ABORT: atlas freeze blocked.", file=sys.stderr)
        for blocker in blockers:
            print(f"  {blocker}", file=sys.stderr)
        print(
            "No atlas_inputs block written. DEQ outputs unaffected.\n"
            "The inventory and mechanism-chain numbers stay out of numbers.json until the "
            "Prompt A graph regeneration is in HEAD.",
            file=sys.stderr,
        )
        return 1
    raise NotImplementedError(
        "the atlas freeze is unblocked; implement atlas_inputs before taking it"
    )


# -------------------------------------------------------------------- entry


def build_from_freeze(freeze_path: Path, out_dir: Path, show_verify: bool) -> int:
    fz = Freeze(freeze_path)
    if fz.ensure_config_inputs():
        print(f"pinned configuration inputs in {freeze_path.name}")
    checked = fz.verify_all()
    print(f"{len(checked)} frozen inputs hash-verified")

    results = compute(fz)
    reg = build_numbers(fz, results)
    numbers_path = reg.write(out_dir / "numbers.json")
    print(f"numbers.json: {len(reg)} keys -> {numbers_path}")

    written = tables.write_tables(build_tables(fz, results, reg), out_dir)
    print(f"tables: {len(written) - 1} CSV plus tables.json")

    entries = build_figures(results, reg, out_dir)
    print(f"figures: {len(entries)} as SVG and 300-dpi PNG plus figures.json")

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
    show_verify: bool = False,
) -> int:
    """Run report generation. Returns 0 on success, 1 on error."""
    y = year or datetime.now().year
    try:
        if freeze is None:
            path = generate_report(y)
            print(f"Report generated: {path}")
            return 0
        freeze_path = Path(freeze).resolve()
        target = Path(out_dir).resolve() if out_dir else _resolve_reports_dir() / str(y)
        target.mkdir(parents=True, exist_ok=True)
        fz = Freeze(freeze_path)
        if add_atlas:
            return add_atlas_inputs(fz)
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
        show_verify=args.verify,
    )


if __name__ == "__main__":
    sys.exit(main())
