"""Compute the Phase 2.2 before/after delta for the 2026-08-28 Kunak refresh.

The "before" side is the pre-refresh baseline snapshotted from git HEAD into
outputs/repro/pre_refresh_2026-08-28/; the "after" side is the current
pipeline output in pipeline/sources/. Nothing here recomputes the pipeline,
so the numbers are read from the emitted CSVs exactly as reshape_deq wrote
them.
"""

from __future__ import annotations

import csv
import sys
from collections import Counter, defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
BEFORE = REPO / "outputs" / "repro" / "pre_refresh_2026-08-28"
AFTER = REPO / "pipeline" / "sources"
OUT = REPO / "outputs" / "repro" / "reshape_delta_2026-08-28.md"

CUTOFF_BEFORE = "2026-08-10"
CUTOFF_AFTER = "2026-08-28"

SENSOR_SITES = [
    "ashburn-collocated",
    "belfort-park",
    "dulles-area",
    "farmwell-middle",
    "golf-course",
    "sterling-ms",
]


def read(path: Path) -> list[dict]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def hourly_stats(rows: list[dict]) -> dict:
    """Row counts, exclusions, reasons, and exact-zero runs per site/pollutant."""
    site_rows = Counter()
    site_hours = defaultdict(set)
    per_pair = Counter()
    excluded = Counter()
    reasons = defaultdict(set)
    zeros = Counter()
    max_run = defaultdict(int)

    for row in rows:
        site = row["site_id"]
        pollutant = row["pollutant"]
        pair = (site, pollutant)
        site_rows[site] += 1
        site_hours[site].add(row["ts_est"])
        per_pair[pair] += 1
        if row["excluded"] == "true":
            excluded[pair] += 1
            for reason in row["exclusion_reason"].split(","):
                reason = reason.strip()
                if reason:
                    reasons[pair].add(reason)
        # zero_run_length is populated only on exact-zero readings.
        run = row.get("zero_run_length") or ""
        if run:
            zeros[pair] += 1
            max_run[pair] = max(max_run[pair], int(run))

    return {
        "site_rows": site_rows,
        "site_hours": {s: len(v) for s, v in site_hours.items()},
        "per_pair": per_pair,
        "excluded": excluded,
        "reasons": reasons,
        "zeros": zeros,
        "max_run": max_run,
    }


def daily_recon(rows: list[dict], site_id: str) -> dict:
    """Comparable days and exact-after-truncation count for one site."""
    comparable = 0
    exact = 0
    mismatches = {}
    for row in rows:
        if row["site_id"] != site_id:
            continue
        if row["meets_18_of_24"] != "true":
            continue
        if not row["published_value"]:
            continue
        comparable += 1
        if row["matches_published"] == "true":
            exact += 1
        else:
            mismatches[row["date_est"]] = (
                row["mean_pm25_ugm3"],
                row["published_value"],
            )
    return {"comparable": comparable, "exact": exact, "mismatches": mismatches}


def missing_list(rows: list[dict]) -> dict:
    out = defaultdict(list)
    for row in rows:
        out[row["site_id"]].append((row["ts_est"], row["category"]))
    return out


def fmt_pct(num: int, den: int) -> str:
    return f"{100 * num / den:.1f}%" if den else "-"


def main() -> int:
    b_hourly = read(BEFORE / "deq_data_center_air_monitoring_hourly.csv")
    a_hourly = read(AFTER / "deq_data_center_air_monitoring_hourly.csv")
    b_reg = read(BEFORE / "deq_regulatory_monitor_hourly.csv")
    a_reg = read(AFTER / "deq_regulatory_monitor_hourly.csv")
    b_daily = read(BEFORE / "deq_pm25_daily.csv")
    a_daily = read(AFTER / "deq_pm25_daily.csv")
    b_missing = read(BEFORE / "deq_missing_hours.csv")
    a_missing = read(AFTER / "deq_missing_hours.csv")

    b = hourly_stats(b_hourly)
    a = hourly_stats(a_hourly)
    br = hourly_stats(b_reg)
    ar = hourly_stats(a_reg)

    lines: list[str] = []
    w = lines.append

    w("# Reshape delta, 2026-08-28 Kunak refresh")
    w("")
    w(f"- Baseline data cutoff: {CUTOFF_BEFORE} (git HEAD snapshot)")
    w(f"- Refreshed data cutoff: {CUTOFF_AFTER}")
    w("- Sensor rows are hour-ending in the raw export and normalised to")
    w("  hour-beginning EST by reshape_deq; timestamps below are ts_est.")
    w("- Regulatory monitor is unchanged in this refresh: it remains capped")
    w("  at 2026-08-10 by FOIA 26-4646.")
    w("")

    w("## 1. Row counts per site")
    w("")
    w("| site | rows before | rows after | delta | site-hours before | site-hours after | delta |")
    w("| --- | ---: | ---: | ---: | ---: | ---: | ---: |")
    for site in SENSOR_SITES:
        rb, ra = b["site_rows"][site], a["site_rows"][site]
        hb, ha = b["site_hours"].get(site, 0), a["site_hours"].get(site, 0)
        w(f"| {site} | {rb} | {ra} | +{ra - rb} | {hb} | {ha} | +{ha - hb} |")
    tb, ta = sum(b["site_rows"].values()), sum(a["site_rows"].values())
    w(f"| **total** | **{tb}** | **{ta}** | **+{ta - tb}** | | | |")
    w("")
    w("Regulatory monitor rows: "
      f"{sum(br['site_rows'].values())} before, "
      f"{sum(ar['site_rows'].values())} after (unchanged, FOIA cap).")
    w("")

    w("## 2. Excluded rows per site per pollutant")
    w("")
    w("| site | pollutant | rows before | excl before | pct before | rows after | excl after | pct after | reason change |")
    w("| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |")
    pairs = sorted(set(b["per_pair"]) | set(a["per_pair"]))
    for pair in pairs:
        site, pol = pair
        nb, na = b["per_pair"][pair], a["per_pair"][pair]
        eb, ea = b["excluded"][pair], a["excluded"][pair]
        rb_, ra_ = b["reasons"].get(pair, set()), a["reasons"].get(pair, set())
        appeared = sorted(ra_ - rb_)
        gone = sorted(rb_ - ra_)
        change = []
        if appeared:
            change.append("appeared: " + ", ".join(appeared))
        if gone:
            change.append("disappeared: " + ", ".join(gone))
        w(
            f"| {site} | {pol} | {nb} | {eb} | {fmt_pct(eb, nb)} "
            f"| {na} | {ea} | {fmt_pct(ea, na)} | {'; '.join(change) or 'none'} |"
        )
    w("")

    w("## 3. Exact zeros and max run length")
    w("")
    w("| site | pollutant | zeros before | zeros after | delta | max run before | max run after |")
    w("| --- | --- | ---: | ---: | ---: | ---: | ---: |")
    for pair in pairs:
        site, pol = pair
        zb, za = b["zeros"][pair], a["zeros"][pair]
        mb, ma = b["max_run"][pair], a["max_run"][pair]
        w(f"| {site} | {pol} | {zb} | {za} | +{za - zb} | {mb} | {ma} |")
    w("")

    w("## 4. Missing hours")
    w("")
    bm, am = missing_list(b_missing), missing_list(a_missing)
    w("| site | before | after |")
    w("| --- | --- | --- |")
    for site in sorted(set(bm) | set(am)):
        before_set = {t for t, _ in bm.get(site, [])}
        after_set = {t for t, _ in am.get(site, [])}
        cats = {t: c for t, c in am.get(site, [])}
        cats.update({t: c for t, c in bm.get(site, [])})

        def render(items: set[str]) -> str:
            if not items:
                return "none"
            return "<br>".join(
                f"{t}{' [' + cats[t] + ']' if cats.get(t) else ''}"
                for t in sorted(items)
            )

        w(f"| {site} | {render(before_set)} | {render(after_set)} |")
    w("")
    new_missing = {
        (s, t)
        for s in am
        for t, _ in am[s]
        if t not in {x for x, _ in bm.get(s, [])}
    }
    resolved = {
        (s, t)
        for s in bm
        for t, _ in bm[s]
        if t not in {x for x, _ in am.get(s, [])}
    }
    w(f"New missing hours introduced by the refresh: {len(new_missing)}")
    for s, t in sorted(new_missing):
        w(f"- {s} {t}")
    w("")
    w(f"Missing hours resolved by the refresh: {len(resolved)}")
    for s, t in sorted(resolved):
        w(f"- {s} {t}")
    w("")

    w("## 5. Daily reconciliation (regulatory FEM monitor, site_id ashburn)")
    w("")
    w("This compares GENARCH's recomputed daily averages of the REGULATORY")
    w("FEM monitor at Broad Run HS against DEQ's published daily-average")
    w("file for that same monitor. It is not a sensor reconciliation.")
    w("")
    bd = daily_recon(b_daily, "ashburn")
    ad = daily_recon(a_daily, "ashburn")
    w("| metric | before | after |")
    w("| --- | ---: | ---: |")
    w(f"| comparable days | {bd['comparable']} | {ad['comparable']} |")
    w(f"| exact after truncation | {bd['exact']} | {ad['exact']} |")
    w(f"| mismatches | {len(bd['mismatches'])} | {len(ad['mismatches'])} |")
    w("")
    w("Mismatches by date:")
    w("")
    w("| date | recomputed | published | status |")
    w("| --- | ---: | ---: | --- |")
    all_dates = sorted(set(bd["mismatches"]) | set(ad["mismatches"]))
    for d in all_dates:
        in_b = d in bd["mismatches"]
        in_a = d in ad["mismatches"]
        if in_b and in_a:
            status = "persists (unchanged)"
            if bd["mismatches"][d] != ad["mismatches"][d]:
                status = "PERSISTS BUT VALUES CHANGED"
            rec, pub = ad["mismatches"][d]
        elif in_a:
            status = "NEW"
            rec, pub = ad["mismatches"][d]
        else:
            status = "resolved"
            rec, pub = bd["mismatches"][d]
        w(f"| {d} | {rec} | {pub} | {status} |")
    if not all_dates:
        w("| (none) | | | |")
    w("")
    w("Daily rows emitted: "
      f"{len(b_daily)} before, {len(a_daily)} after.")
    w("")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(REPO)} ({len(lines)} lines)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
