"""Kunak clock conversion through zoneinfo America/New_York (DECISIONS.md D35).

The staged exports and the reshaped outputs are committed under
pipeline/sources/, so these run the same on any checkout.
"""

from __future__ import annotations

import csv
from datetime import datetime, timedelta
from pathlib import Path

import pytest

from pipeline.reshape_deq import (
    DST_FALLBACK_UNORDERED,
    DST_SPRING_FORWARD,
    SENSOR_CLASS,
    SITE_HISTORY,
    DeqReshapeError,
    build_sensor_rows,
    load_site_history,
    local_label_kind,
    missing_hour_inventory,
    occupancy_by_site,
    read_kunak_file,
    shift_hours_for,
    to_est,
)

SOURCES = Path(__file__).resolve().parents[1] / "pipeline" / "sources"
RAW = SOURCES / "deq-raw"

# The seven sites whose 2026-11-08 export carries two readings at 2026-11-01 01:00.
FALLBACK_SITES = {
    "ashburn-collocated", "belfort-park", "camp-snyder", "evergreen-cc",
    "meadows-farms", "pw-police-west", "vdot-mkc",
}
UNORDERED_HOURS = {"2026-10-31 23:00:00", "2026-11-01 00:00:00"}

# DEQ's instruction, which the hourly output followed through the 2026-10-29
# ingest: back 1 hour before 2026-03-08 03:00, back 2 hours from it.
DEQ_CUTOVER = datetime(2026, 3, 8, 3)


def deq_rule(ts_raw: datetime) -> datetime:
    return ts_raw - timedelta(hours=1 if ts_raw < DEQ_CUTOVER else 2)


def t(text: str) -> datetime:
    return datetime.fromisoformat(text)


def current_export(site_id: str, dst_hour: datetime) -> tuple[str, list[dict]]:
    """Read the site's one staged export, as reshape does: deq-raw root, non-recursive.

    Weekly staging retires the previous export, so no test names a dated file. The
    export must still span the DST hour the calling test checks.
    """
    matches = sorted(RAW.glob(f"{site_id}_multi_*.csv"))
    if len(matches) != 1:
        pytest.fail(
            f"expected one {site_id}_multi_*.csv in {RAW}, found {len(matches)}: "
            f"{[p.name for p in matches]}"
        )
    site, records = read_kunak_file(matches[0])
    stamps = [r["_ts_raw"] for r in records]
    if not stamps or not min(stamps) <= dst_hour <= max(stamps):
        span = f"{min(stamps)} to {max(stamps)}" if stamps else "no rows"
        pytest.fail(f"{matches[0].name} covers {span}, which does not span {dst_hour}")
    return site, records


def test_conversion_reproduces_the_committed_rule_through_october():
    """Every staged timestamp 2026-03-03 to 2026-10-31 keeps its earlier ts_est.

    outputs/repro/dst_regression_2026-11-08.txt records the same comparison
    against the committed 2026-10-29 hourly output: 35,690 timestamps matched it
    and 336 later ones matched this rule, with no difference.
    """
    lo, hi = t("2026-03-03 00:00"), t("2026-10-31 23:00")
    files = sorted(RAW.glob("*.csv"))
    assert files
    checked = 0
    for path in files:
        _, records = read_kunak_file(path)
        for ts_raw in {r["_ts_raw"] for r in records if lo <= r["_ts_raw"] <= hi}:
            assert to_est(ts_raw) == deq_rule(ts_raw), (path.name, ts_raw)
            assert shift_hours_for(ts_raw) == (ts_raw - deq_rule(ts_raw)) / timedelta(hours=1)
            checked += 1
    assert checked > 30_000


def test_fall_back_unambiguous_neighbours():
    assert to_est(t("2026-11-01 00:00")) == t("2026-10-31 22:00")
    assert to_est(t("2026-11-01 02:00")) == t("2026-11-01 01:00")
    assert shift_hours_for(t("2026-11-01 00:00")) == 2
    assert shift_hours_for(t("2026-11-01 02:00")) == 1


def test_fall_back_label_is_ambiguous_and_names_two_hours():
    label = t("2026-11-01 01:00")
    assert local_label_kind(label) == "ambiguous"
    assert {to_est(label, 0), to_est(label, 1)} == {
        t("2026-10-31 23:00"), t("2026-11-01 00:00"),
    }
    for neighbour in ("2026-11-01 00:00", "2026-11-01 02:00", "2026-10-31 23:00"):
        assert local_label_kind(t(neighbour)) == "unique"


def test_fall_back_readings_emit_no_row_and_are_listed_unordered():
    history = load_site_history(SITE_HISTORY)
    by_site = occupancy_by_site(history)
    site_id, records = current_export("belfort-park", t("2026-11-01 01:00"))
    repeated = [r for r in records if r["_ts_raw"] == t("2026-11-01 01:00")]
    assert len(repeated) == 2

    rows, _ = build_sensor_rows(site_id, records, by_site[site_id], set())
    hours = {r["ts_est"] for r in rows}
    assert t("2026-10-31 22:00") in hours and t("2026-11-01 01:00") in hours
    assert t("2026-10-31 23:00") not in hours
    assert t("2026-11-01 00:00") not in hours
    assert all(r["ts_raw"] != t("2026-11-01 01:00") for r in rows)

    placed = [
        r["_ts_raw"] for r in records if local_label_kind(r["_ts_raw"]) != "ambiguous"
    ]
    missing, _, _ = missing_hour_inventory(
        site_id, SENSOR_CLASS, placed, ["PM2.5"], frozenset({t("2026-11-01 01:00")})
    )
    listed = {m["ts_est"] for m in missing if m["category"] == DST_FALLBACK_UNORDERED}
    assert listed == UNORDERED_HOURS
    assert set(missing[0]) == {"site_id", "pollutant", "ts_est", "category"}


def test_reshaped_outputs_carry_the_unordered_hours_without_values():
    with open(SOURCES / "deq_missing_hours.csv", encoding="utf-8", newline="") as fh:
        missing = list(csv.DictReader(fh))
    unordered = [m for m in missing if m["category"] == DST_FALLBACK_UNORDERED]
    assert {m["site_id"] for m in unordered} == FALLBACK_SITES
    for site in FALLBACK_SITES:
        assert {m["ts_est"] for m in unordered if m["site_id"] == site} == UNORDERED_HOURS
    assert "value" not in missing[0]

    path = SOURCES / "deq_data_center_air_monitoring_hourly.csv"
    with open(path, encoding="utf-8", newline="") as fh:
        clash = [
            (r["site_id"], r["ts_est"])
            for r in csv.DictReader(fh)
            if r["site_id"] in FALLBACK_SITES
            and (r["ts_est"] in UNORDERED_HOURS or r["ts_raw"] == "2026-11-01 01:00:00")
        ]
    assert clash == []


def test_spring_forward_gap():
    assert local_label_kind(t("2026-03-08 02:00")) == "nonexistent"
    labels = ["2026-03-08 00:00", "2026-03-08 01:00", "2026-03-08 03:00", "2026-03-08 04:00"]
    assert [to_est(t(x)) for x in labels] == [
        t("2026-03-07 23:00"), t("2026-03-08 00:00"),
        t("2026-03-08 01:00"), t("2026-03-08 02:00"),
    ]

    # The gap is reported, at the ts_est DEQ's rule gave it.
    observed = [t(x) for x in labels]
    missing, expected, gaps = missing_hour_inventory(
        "belfort-park", SENSOR_CLASS, observed, ["PM2.5"]
    )
    assert (expected, gaps) == (5, 1)
    assert missing == [{
        "site_id": "belfort-park", "pollutant": "PM2.5",
        "ts_est": "2026-03-08 01:00:00", "category": DST_SPRING_FORWARD,
    }]

    # A reading labelled inside the gap names no hour and is a hard failure.
    history = load_site_history(SITE_HISTORY)
    by_site = occupancy_by_site(history)
    site_id, records = current_export("ashburn-collocated", t("2026-03-08 02:00"))
    sample = dict(records[0])
    sample["_ts_raw"] = t("2026-03-08 02:00")
    with pytest.raises(DeqReshapeError, match="spring-forward gap"):
        build_sensor_rows(site_id, [sample], by_site[site_id], set())
