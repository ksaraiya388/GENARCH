"""Reshape raw Virginia DEQ air-monitoring files into tidy, validated CSVs.

Two instrument classes are read from two raw forms and emitted to two separate
files. They must never be merged into one series: DEQ's CFR limitation language
applies only to the low-cost sensors, and a merged series would make that
language false on its face (docs/GENARCH_RULES.md section 6).

Kunak sensor CSVs are semicolon-delimited with a ``sep=;`` preamble line, are
reverse-chronological, hour-ending and DST-adjusted, and carry no QC flags.
Regulatory monitor files are OLE2 ``.xls``, hour-beginning, always EST, and
carry AQS null codes and flags.

Clock discipline
----------------
All DEQ calendar-date rules -- occupancy windows, the PM2.5 void window and
``pm25_end_date`` -- are evaluated on ``ts_raw``, the dashboard's local wall
clock, which is the clock those published dates are written in. All analysis
operations -- daily averaging and every join -- use ``ts_est``.

Usage::

    python pipeline/reshape_deq.py [--input-root PATH] [--out-dir PATH]
"""

from __future__ import annotations

import argparse
import csv
import sys
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import ROUND_DOWN, Decimal
from pathlib import Path

import pandas as pd

# --------------------------------------------------------------------------
# Constants
# --------------------------------------------------------------------------

DEFAULT_INPUT_ROOT = Path(r"C:\Users\sarai\genarch-scratch")
SENSOR_SUBDIR = "deq-raw"
REGULATORY_SUBDIR = "deq-regulatory"

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCES_DIR = REPO_ROOT / "pipeline" / "sources"
SITE_HISTORY = SOURCES_DIR / "deq_sensor_site_history.csv"

# Every datetime here is deliberately naive. ts_raw is a local wall-clock
# reading off DEQ's dashboard and ts_est is fixed-offset EST that never
# observes DST; the shift between them is applied explicitly below. Attaching
# a tzinfo would invite a library to re-apply a DST correction DEQ has already
# accounted for.

# Kunak values are hour-ending and DST-adjusted; shift back to hour-beginning
# EST. DEQ supplied the boundary; see GENARCH_RULES section 4.
DST_CUTOVER = datetime.fromisoformat("2026-03-08T03:00:00")
SHIFT_BEFORE_CUTOVER = 1
SHIFT_FROM_CUTOVER = 2

# 2026-03-08 02:00 does not exist in local time (spring forward).
DST_MISSING_HOUR = datetime.fromisoformat("2026-03-08T02:00:00")

SENSOR_CLASS = "low_cost_sensor_kunak_apex"
REGULATORY_CLASS = "regulatory_fem"

DAILY_MIN_VALID_HOURS = 18
DAILY_HOURS = 24
MISSING_HOUR_FAIL_PCT = 10.0
TRANSIT_WINDOW_HOURS = 48
RELOCATION_WINDOW_DAYS = 7

FAR_FUTURE = datetime.fromisoformat("2099-01-01T00:00:00")

POLLUTANT_UNITS = {
    "PM2.5": "\u00b5g/m\u00b3",
    "NO2": "ppb",
    "VOCs": "ppb",
    "CO": "ppm",
}

# Kunak header prefix -> canonical pollutant name. Units come from the table
# above rather than from the header text, so a re-encoded export cannot change
# the emitted unit string.
KUNAK_POLLUTANT_PREFIXES = {
    "PM2.5": "PM2.5",
    "NO2": "NO2",
    "VOC": "VOCs",
}

REGULATORY_PARAMETERS = {
    "PM25_T640X": "PM2.5",
    "NO2": "NO2",
    "CO": "CO",
}

# DEQ site code -> site_id used in the regulatory output.
REGULATORY_SITES = {
    "ASHBURN": "ashburn",
    "AURHILL": "aurhill",
}

# Aurora Hills is in Arlington, not Loudoun. DEQ's 2026-08-07 report names it
# as the closest comparable CO regulatory site, so it is reshaped and kept, but
# it is out of v1 scope. Scope is never expressed through ``excluded``.
OUT_OF_SCOPE = {
    ("aurhill", "CO"): "out_of_county_reference_arlington",
}

REGULATORY_FILES = [
    ("AshburnPM2.5_030326_081026.xls", "PM2.5"),
    ("AshburnNO2_hourly_030326_081026.xls", "NO2"),
    ("AuroraHillsCO_hourly_030326_081026.xls", "CO"),
]
REGULATORY_DAILY_FILE = "AshburnPM2.5_dailyAvg_030326_081026.xls"

# DEQ-stated void windows, used both to exclude sensor readings and to
# categorise missing hours. Dates are inclusive and evaluated on ts_raw.
VOID_WINDOWS = [
    (SENSOR_CLASS, None, "PM2.5", date(2026, 3, 3), date(2026, 3, 8),
     "kunak_pm25_void_window"),
    (REGULATORY_CLASS, "ashburn", "PM2.5", date(2026, 5, 7), date(2026, 5, 10),
     "deq_void_window"),
    (REGULATORY_CLASS, "ashburn", "PM2.5", date(2026, 6, 16), date(2026, 7, 14),
     "deq_void_window"),
    (REGULATORY_CLASS, "ashburn", "NO2", date(2026, 5, 7), date(2026, 5, 10),
     "deq_void_window"),
]

SENSOR_COLUMNS = [
    "site_id", "unit_id", "unit_id_confidence", "ts_raw", "ts_est",
    "shift_hours", "pollutant", "value", "unit", "instrument_class",
    "zero_run_length", "excluded", "exclusion_reason", "v1_scope",
    "scope_reason",
]

REGULATORY_COLUMNS = [
    "site_id", "ts_raw", "ts_est", "pollutant", "value", "unit",
    "instrument_class", "parameter", "aqs_method_code", "average_interval",
    "flags", "aqs_null_code", "qualifier_codes", "excluded",
    "exclusion_reason", "v1_scope", "scope_reason",
]

DAILY_COLUMNS = [
    "site_id", "date_est", "instrument_class", "pollutant",
    "mean_pm25_ugm3", "valid_hours", "expected_hours", "meets_18_of_24",
    "published_value", "matches_published",
]


class DeqReshapeError(RuntimeError):
    """A hard validation failure. Nothing is emitted when this is raised."""


@dataclass(frozen=True)
class Occupancy:
    """One row of the site history: a site occupied by a unit over a window."""

    site_id: str
    kunak_label: str
    unit_id: str
    unit_id_confidence: str
    start: datetime
    end: datetime  # exclusive
    pm25_end: date | None


# --------------------------------------------------------------------------
# Small helpers
# --------------------------------------------------------------------------


def shift_hours_for(ts_raw: datetime) -> int:
    """Return the DEQ-instructed hour shift for a Kunak timestamp."""
    return SHIFT_BEFORE_CUTOVER if ts_raw < DST_CUTOVER else SHIFT_FROM_CUTOVER


def to_est(ts_raw: datetime) -> datetime:
    """Normalise a Kunak hour-ending local timestamp to hour-beginning EST."""
    return ts_raw - timedelta(hours=shift_hours_for(ts_raw))


def truncate_1dp(values: list[Decimal]) -> Decimal:
    """Mean of ``values`` truncated to one decimal.

    DEQ truncates published values; it does not round. The mean is computed in
    ``Decimal`` so a binary-float artefact cannot push a value across a tenth
    boundary in either direction.
    """
    total = sum(values, Decimal(0))
    mean = total / Decimal(len(values))
    return mean.quantize(Decimal("0.1"), rounding=ROUND_DOWN)


def hour_range(start: datetime, end: datetime) -> list[datetime]:
    """Every hour from ``start`` to ``end`` inclusive."""
    out, cur = [], start
    while cur <= end:
        out.append(cur)
        cur += timedelta(hours=1)
    return out


def join_on_est(left: pd.DataFrame, right: pd.DataFrame, on: str) -> pd.DataFrame:
    """Inner-join two frames, refusing anything not keyed on the EST clock.

    Joining a Kunak reading to a regulatory reading on unnormalised timestamps
    is a hard failure (GENARCH_RULES section 4). This is the only join in the
    script, so the guard cannot be bypassed by accident.
    """
    for side, frame in (("left", left), ("right", right)):
        if frame.attrs.get("clock") != "est":
            raise DeqReshapeError(
                f"refusing to join: {side} frame is not keyed on the EST clock "
                f"(join column {on!r}). Normalise timestamps first."
            )
    if not on.startswith(("ts_est", "date_est")):
        raise DeqReshapeError(
            f"refusing to join on {on!r}: joins must use ts_est or date_est."
        )
    return left.merge(right, on=on, how="inner")


def void_window_reason(
    instrument_class: str, site_id: str, pollutant: str, day: date
) -> str | None:
    """Return the void-window label covering this reading, if any."""
    for cls, site, poll, start, end, label in VOID_WINDOWS:
        if cls != instrument_class or poll != pollutant:
            continue
        if site is not None and site != site_id:
            continue
        if start <= day <= end:
            return label
    return None


# --------------------------------------------------------------------------
# Site history
# --------------------------------------------------------------------------


def load_site_history(path: Path) -> list[Occupancy]:
    """Read the curated site history into occupancy intervals."""
    if not path.exists():
        raise DeqReshapeError(f"site history not found: {path}")

    rows: list[Occupancy] = []
    with path.open(encoding="utf-8-sig", newline="") as fh:
        for row in csv.DictReader(fh):
            # DEQ publishes these as bare calendar dates on the site's local
            # clock; they are compared against ts_raw, which is also naive.
            start = datetime.fromisoformat(row["start_date"])
            end_raw = (row.get("end_date") or "").strip()
            end = datetime.fromisoformat(end_raw) if end_raw else FAR_FUTURE
            pm25_raw = (row.get("pm25_end_date") or "").strip()
            pm25_end = date.fromisoformat(pm25_raw) if pm25_raw else None
            rows.append(
                Occupancy(
                    site_id=row["site_id"].strip(),
                    kunak_label=row["kunak_label"].strip(),
                    unit_id=row["unit_id"].strip(),
                    unit_id_confidence=row["unit_id_confidence"].strip(),
                    start=start,
                    end=end,
                    pm25_end=pm25_end,
                )
            )
    if not rows:
        raise DeqReshapeError(f"site history is empty: {path}")
    return rows


def occupancy_by_site(history: list[Occupancy]) -> dict[str, list[Occupancy]]:
    """Group occupancy intervals by site. A site may hold several."""
    grouped: dict[str, list[Occupancy]] = defaultdict(list)
    for occ in history:
        grouped[occ.site_id].append(occ)
    for intervals in grouped.values():
        intervals.sort(key=lambda o: o.start)
    return dict(grouped)


def resolve_interval(
    intervals: list[Occupancy], ts_raw: datetime
) -> Occupancy | None:
    """Return the interval covering ``ts_raw``, or None if outside them all."""
    for occ in intervals:
        if occ.start <= ts_raw < occ.end:
            return occ
    return None


# --------------------------------------------------------------------------
# Kunak sensor files
# --------------------------------------------------------------------------


def read_kunak_file(path: Path) -> tuple[str, list[dict]]:
    """Parse one Kunak export into deduplicated, ascending wide records.

    The date field contains commas ("Aug 10, 2026, 23:00:00"), so the file is
    parsed strictly as semicolon-delimited. The first line is a ``sep=;``
    preamble and is dropped.
    """
    site_id = path.name.split("_")[0]
    text = path.read_bytes().decode("utf-8-sig")
    lines = text.splitlines()
    if not lines or not lines[0].lower().startswith("sep="):
        raise DeqReshapeError(
            f"{path.name}: expected a 'sep=' preamble on line 1, got "
            f"{lines[0][:40]!r}"
        )

    reader = csv.reader(lines[1:], delimiter=";")
    rows = [r for r in reader if r]
    header, data = rows[0], rows[1:]
    if header[:2] != ["Location", "Date"]:
        raise DeqReshapeError(
            f"{path.name}: expected Location;Date first, got {header[:2]}"
        )

    # Exports contain exact-duplicate blocks (a pagination artefact).
    seen: set[tuple[str, ...]] = set()
    unique: list[list[str]] = []
    for row in data:
        key = tuple(row)
        if key in seen:
            continue
        seen.add(key)
        unique.append(row)

    records: list[dict] = []
    for row in unique:
        record = dict(zip(header, row))
        # Local wall clock as exported; normalised to EST later, never here.
        ts_raw = datetime.strptime(  # noqa: DTZ007
            record["Date"], "%b %d, %Y, %H:%M:%S"
        )
        if ts_raw.minute or ts_raw.second:
            raise DeqReshapeError(
                f"{path.name}: timestamp {record['Date']!r} is not on an exact "
                f"hour boundary"
            )
        record["_ts_raw"] = ts_raw
        records.append(record)

    records.sort(key=lambda r: r["_ts_raw"])
    return site_id, records


def kunak_pollutant_columns(header: list[str]) -> dict[str, str]:
    """Map raw Kunak column names to canonical pollutant names."""
    mapping: dict[str, str] = {}
    for column in header:
        for prefix, pollutant in KUNAK_POLLUTANT_PREFIXES.items():
            if column.startswith(prefix):
                mapping[column] = pollutant
    return mapping


def build_sensor_rows(
    site_id: str,
    records: list[dict],
    intervals: list[Occupancy],
    transit_sites: set[str],
) -> tuple[list[dict], list[dict]]:
    """Turn wide Kunak records into long rows, flagged but never dropped.

    Returns ``(rows, violations)``.
    """
    header = [k for k in records[0] if not k.startswith("_")]
    pollutant_columns = kunak_pollutant_columns(header)
    if not pollutant_columns:
        raise DeqReshapeError(f"{site_id}: no pollutant columns found")

    rows: list[dict] = []
    violations: list[dict] = []

    for record in records:
        ts_raw: datetime = record["_ts_raw"]
        ts_est = to_est(ts_raw)
        shift = shift_hours_for(ts_raw)
        occ = resolve_interval(intervals, ts_raw)

        in_transit = False
        if occ is None:
            in_transit = site_id in transit_sites
            violations.append(
                {
                    "site_id": site_id,
                    "ts_raw": ts_raw.isoformat(sep=" "),
                    "ts_est": ts_est.isoformat(sep=" "),
                    "disposition": (
                        "pre_occupancy_transit" if in_transit else "hard_failure"
                    ),
                }
            )
            # Attribute transit rows to the interval they are moving into.
            occ = intervals[0] if intervals else None

        for column, pollutant in pollutant_columns.items():
            raw_value = (record.get(column) or "").strip()
            if raw_value == "":
                continue
            value = float(raw_value)

            excluded = False
            reason = ""
            if in_transit:
                excluded, reason = True, "pre_occupancy_transit"
            elif (
                occ is not None
                and occ.pm25_end is not None
                and pollutant == "PM2.5"
                and ts_raw.date() > occ.pm25_end
            ):
                excluded, reason = True, "pm25_collection_ended"
            else:
                void = void_window_reason(
                    SENSOR_CLASS, site_id, pollutant, ts_raw.date()
                )
                if void:
                    excluded, reason = True, void
                elif value == 0.0:
                    excluded, reason = True, "exact_zero_floor"

            rows.append(
                {
                    "site_id": site_id,
                    "unit_id": occ.unit_id if occ else "",
                    "unit_id_confidence": occ.unit_id_confidence if occ else "",
                    "ts_raw": ts_raw,
                    "ts_est": ts_est,
                    "shift_hours": shift,
                    "pollutant": pollutant,
                    "value": raw_value,
                    "unit": POLLUTANT_UNITS[pollutant],
                    "instrument_class": SENSOR_CLASS,
                    "zero_run_length": "",
                    "excluded": excluded,
                    "exclusion_reason": reason,
                    "v1_scope": "in_scope",
                    "scope_reason": "",
                }
            )

    return rows, violations


def annotate_zero_runs(rows: list[dict]) -> None:
    """Set ``zero_run_length`` on every exact-zero reading, in place.

    A run is consecutive in time: a missing hour breaks it, so an isolated
    floor reading stays distinguishable from a multi-day fault.
    """
    by_series: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for row in rows:
        by_series[(row["site_id"], row["pollutant"])].append(row)

    for series in by_series.values():
        series.sort(key=lambda r: r["ts_est"])
        run: list[dict] = []
        previous: datetime | None = None
        for row in series:
            is_zero = float(row["value"]) == 0.0
            contiguous = previous is not None and (
                row["ts_est"] - previous == timedelta(hours=1)
            )
            if is_zero and (not run or contiguous):
                run.append(row)
            else:
                for member in run:
                    member["zero_run_length"] = len(run)
                run = [row] if is_zero else []
            previous = row["ts_est"]
        for member in run:
            member["zero_run_length"] = len(run)


# --------------------------------------------------------------------------
# Occupancy and unit-conflict checks
# --------------------------------------------------------------------------


def find_transit_sites(
    history: list[Occupancy],
    observed: dict[str, list[datetime]],
    by_site: dict[str, list[Occupancy]],
) -> tuple[set[str], list[str]]:
    """Decide which sites qualify for the narrow pre-occupancy exception.

    A site qualifies only when every one of its violations falls within 48
    hours before its start, and the history shows a relocation into it: the
    same unit ends at another site within 7 days. If the origin site has
    readings overlapping the violation range, two sites claim one physical
    sensor at one time -- a hard failure, checked before the exception.
    """
    transit: set[str] = set()
    notes: list[str] = []

    for site_id, timestamps in observed.items():
        intervals = by_site.get(site_id, [])
        outside = [t for t in timestamps if resolve_interval(intervals, t) is None]
        if not outside:
            continue

        start = min(o.start for o in intervals)
        earliest_allowed = start - timedelta(hours=TRANSIT_WINDOW_HOURS)
        if not all(earliest_allowed <= t < start for t in outside):
            continue

        unit = next((o.unit_id for o in intervals if o.start == start), "")
        origin = None
        for occ in history:
            if occ.site_id == site_id or occ.unit_id != unit:
                continue
            if occ.end == FAR_FUTURE:
                continue  # still open: the unit was never released
            if abs((occ.end - start).days) <= RELOCATION_WINDOW_DAYS:
                origin = occ
                break
        if origin is None:
            continue

        low, high = min(outside), max(outside)
        clash = [
            t for t in observed.get(origin.site_id, []) if low <= t <= high
        ]
        if clash:
            raise DeqReshapeError(
                f"unit {unit} is claimed by {origin.site_id} and {site_id} at "
                f"the same time: both have readings between {low} and {high} "
                f"({len(clash)} overlapping at {origin.site_id}). Two sites "
                f"cannot hold one physical sensor."
            )

        transit.add(site_id)
        notes.append(
            f"{site_id}: {len(outside)} rows {low} to {high} accepted as "
            f"pre_occupancy_transit (unit {unit} released by "
            f"{origin.site_id} on {origin.end.date()})"
        )

    return transit, notes


def check_unit_conflicts(
    history: list[Occupancy], observed: dict[str, list[datetime]]
) -> tuple[list[dict], list[str]]:
    """Classify same-unit occupancy overlaps.

    Misattribution risk -- both sites hold readings in the overlap -- is a hard
    failure. Provenance ambiguity -- at most one side has readings -- is a
    warning. The test is against readings, not against which files exist, so a
    later download escalates the same overlap automatically.
    """
    conflicts: list[dict] = []
    warnings: list[str] = []

    for i, a in enumerate(history):
        for b in history[i + 1:]:
            if a.unit_id != b.unit_id or a.unit_id == "TO_CONFIRM":
                continue
            if a.site_id == b.site_id:
                continue
            low = max(a.start, b.start)
            high = min(a.end, b.end)
            if low >= high:
                continue

            a_hits = [t for t in observed.get(a.site_id, []) if low <= t < high]
            b_hits = [t for t in observed.get(b.site_id, []) if low <= t < high]
            both = bool(a_hits) and bool(b_hits)
            conflicts.append(
                {
                    "unit_id": a.unit_id,
                    "site_a": a.site_id,
                    "site_b": b.site_id,
                    "overlap_start": low.isoformat(sep=" "),
                    "overlap_end": high.isoformat(sep=" "),
                    "readings_site_a": len(a_hits),
                    "readings_site_b": len(b_hits),
                    "classification": (
                        "misattribution_risk" if both else "provenance_ambiguity"
                    ),
                }
            )
            if both:
                raise DeqReshapeError(
                    f"unit {a.unit_id} is claimed by {a.site_id} and "
                    f"{b.site_id} over {low} to {high}, and both sites have "
                    f"readings in that range ({len(a_hits)} and {len(b_hits)}). "
                    f"A reading could be assigned to the wrong site."
                )
            warnings.append(
                f"unit {a.unit_id}: {a.site_id} and {b.site_id} both claim "
                f"{low.date()} to {high.date()}; only "
                f"{a.site_id if a_hits else b.site_id if b_hits else 'neither'}"
                f" has readings, so no reading can be misassigned"
            )

    return conflicts, warnings


# --------------------------------------------------------------------------
# Regulatory files
# --------------------------------------------------------------------------


def read_regulatory_file(path: Path, pollutant: str) -> list[dict]:
    """Parse one FOIA-released regulatory ``.xls`` into long rows."""
    frame = pd.read_excel(path, sheet_name="Sheet1", engine="xlrd")
    required = [
        "Site", "Parameter", "Average Interval", "Date", "Value",
        "AQS Null Code", "Flags", "Qualifier Codes", "AQS Method Code",
    ]
    missing = [c for c in required if c not in frame.columns]
    if missing:
        raise DeqReshapeError(f"{path.name}: missing columns {missing}")

    rows: list[dict] = []
    for record in frame.to_dict("records"):
        site_code = str(record["Site"]).strip()
        site_id = REGULATORY_SITES.get(site_code)
        if site_id is None:
            raise DeqReshapeError(
                f"{path.name}: unknown DEQ site code {site_code!r}"
            )

        parameter = str(record["Parameter"]).strip()
        mapped = REGULATORY_PARAMETERS.get(parameter)
        if mapped is None:
            raise DeqReshapeError(
                f"{path.name}: unknown Parameter {parameter!r}"
            )
        if mapped != pollutant:
            raise DeqReshapeError(
                f"{path.name}: expected {pollutant}, found {mapped}"
            )

        ts = record["Date"]
        if not isinstance(ts, pd.Timestamp):
            raise DeqReshapeError(f"{path.name}: unparsed Date {ts!r}")
        ts = ts.to_pydatetime()
        if ts.minute or ts.second:
            raise DeqReshapeError(
                f"{path.name}: timestamp {ts} is not on an hour boundary"
            )

        # Flags are case-sensitive: C is Calibration and c is Ceiling Limit,
        # H is High-High Alarm and h is High Alarm, I is Invalidated By Edit
        # and l is Low Alarm. Never lowercase this column.
        flags = "" if pd.isna(record["Flags"]) else str(record["Flags"])
        null_code = (
            "" if pd.isna(record["AQS Null Code"])
            else str(record["AQS Null Code"]).strip()
        )
        qualifier = (
            "" if pd.isna(record["Qualifier Codes"])
            else str(record["Qualifier Codes"]).strip()
        )
        value = record["Value"]

        # EXCLUDE iff Value is NaN, or a null code is present, or Flags
        # contains "<". Never on a letter code alone.
        if pd.isna(value):
            excluded, reason = True, "regulatory_invalid:value_missing"
        elif null_code:
            excluded, reason = True, f"regulatory_invalid:null_code={null_code}"
        elif "<" in flags:
            excluded, reason = True, "regulatory_invalid:logger_invalid"
        else:
            excluded, reason = False, ""

        method = record["AQS Method Code"]
        method_str = "" if pd.isna(method) else str(int(method))
        scope_reason = OUT_OF_SCOPE.get((site_id, pollutant), "")

        rows.append(
            {
                "site_id": site_id,
                "ts_raw": ts,
                "ts_est": ts,  # regulatory values are always EST
                "pollutant": pollutant,
                "value": "" if pd.isna(value) else value,
                "unit": POLLUTANT_UNITS[pollutant],
                "instrument_class": REGULATORY_CLASS,
                "parameter": parameter,
                "aqs_method_code": method_str,
                "average_interval": str(record["Average Interval"]).strip(),
                "flags": flags,
                "aqs_null_code": null_code,
                "qualifier_codes": qualifier,
                "excluded": excluded,
                "exclusion_reason": reason,
                "v1_scope": "out_of_scope" if scope_reason else "in_scope",
                "scope_reason": scope_reason,
            }
        )
    return rows


def read_published_daily(path: Path) -> dict[date, Decimal]:
    """Read DEQ's published daily file, applying the same exclusion rule.

    The published file applies no completeness threshold and is itself
    unfiltered, so the null-code and "<" exclusions must be applied to it
    before it can be used as a reference (GENARCH_RULES section 3).
    """
    frame = pd.read_excel(path, sheet_name="Sheet1", engine="xlrd")
    published: dict[date, Decimal] = {}
    for record in frame.to_dict("records"):
        value = record["Value"]
        flags = "" if pd.isna(record["Flags"]) else str(record["Flags"])
        null_code = (
            "" if pd.isna(record["AQS Null Code"])
            else str(record["AQS Null Code"]).strip()
        )
        if pd.isna(value) or null_code or "<" in flags:
            continue
        published[record["Date"].date()] = Decimal(str(value))
    return published


# --------------------------------------------------------------------------
# Missing hours and daily averages
# --------------------------------------------------------------------------


def missing_hour_inventory(
    site_id: str,
    instrument_class: str,
    observed: list[datetime],
    pollutants: list[str],
) -> tuple[list[dict], int, int]:
    """Return missing-hour rows plus (expected, missing) counts for a site."""
    expected = hour_range(min(observed), max(observed))
    gaps = sorted(set(expected) - set(observed))

    rows: list[dict] = []
    for ts_raw in gaps:
        if instrument_class == SENSOR_CLASS:
            ts_est = to_est(ts_raw)
        else:
            ts_est = ts_raw
        for pollutant in pollutants:
            if ts_raw == DST_MISSING_HOUR:
                category = "dst_spring_forward"
            elif void_window_reason(
                instrument_class, site_id, pollutant, ts_raw.date()
            ):
                category = "documented_outage"
            else:
                category = "unexplained"
            rows.append(
                {
                    "site_id": site_id,
                    "pollutant": pollutant,
                    "ts_est": ts_est.isoformat(sep=" "),
                    "category": category,
                }
            )
    return rows, len(expected), len(gaps)


def daily_pm25(rows: list[dict], instrument_class: str) -> list[dict]:
    """Compute daily PM2.5 means on the EST clock, 18-of-24 required."""
    buckets: dict[tuple[str, date], list[Decimal]] = defaultdict(list)
    for row in rows:
        if row["pollutant"] != "PM2.5" or row["excluded"]:
            continue
        buckets[(row["site_id"], row["ts_est"].date())].append(
            Decimal(str(row["value"]))
        )

    out: list[dict] = []
    for (site_id, day), values in sorted(buckets.items()):
        meets = len(values) >= DAILY_MIN_VALID_HOURS
        out.append(
            {
                "site_id": site_id,
                "date_est": day.isoformat(),
                "instrument_class": instrument_class,
                "pollutant": "PM2.5",
                "mean_pm25_ugm3": str(truncate_1dp(values)) if meets else "",
                "valid_hours": len(values),
                "expected_hours": DAILY_HOURS,
                "meets_18_of_24": meets,
                "published_value": "",
                "matches_published": "",
            }
        )
    return out


def reconcile(
    daily_rows: list[dict], published: dict[date, Decimal], site_id: str
) -> tuple[int, int, list[str]]:
    """Compare recomputed daily means against DEQ's published file.

    Only days that both clear 18 of 24 valid hours and are valid in the
    published file are comparable. The count is reported, never asserted.
    """
    left = pd.DataFrame(
        [
            {"date_est": r["date_est"], "recomputed": r["mean_pm25_ugm3"]}
            for r in daily_rows
            if r["site_id"] == site_id and r["meets_18_of_24"]
        ]
    )
    right = pd.DataFrame(
        [
            {"date_est": d.isoformat(), "published": str(v)}
            for d, v in sorted(published.items())
        ]
    )
    if left.empty or right.empty:
        return 0, 0, []
    left.attrs["clock"] = "est"
    right.attrs["clock"] = "est"

    merged = join_on_est(left, right, "date_est")
    matches, mismatches = 0, []
    for record in merged.to_dict("records"):
        rec = Decimal(record["recomputed"])
        pub = Decimal(record["published"])
        if rec == pub:
            matches += 1
        else:
            mismatches.append(
                f"{record['date_est']}: recomputed {rec}, published {pub}"
            )

    for row in daily_rows:
        if row["site_id"] != site_id or not row["meets_18_of_24"]:
            continue
        day = date.fromisoformat(row["date_est"])
        if day in published:
            row["published_value"] = str(published[day])
            row["matches_published"] = (
                Decimal(row["mean_pm25_ugm3"]) == published[day]
            )

    return matches, len(merged), mismatches


# --------------------------------------------------------------------------
# Output
# --------------------------------------------------------------------------


def write_csv(path: Path, columns: list[str], rows: list[dict]) -> None:
    """Write rows deterministically as UTF-8 with LF endings."""
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(
            fh, fieldnames=columns, lineterminator="\n", extrasaction="ignore"
        )
        writer.writeheader()
        for row in rows:
            record = dict(row)
            for key in ("ts_raw", "ts_est"):
                if isinstance(record.get(key), datetime):
                    record[key] = record[key].isoformat(sep=" ")
            if isinstance(record.get("excluded"), bool):
                record["excluded"] = "true" if record["excluded"] else "false"
            if isinstance(record.get("meets_18_of_24"), bool):
                record["meets_18_of_24"] = (
                    "true" if record["meets_18_of_24"] else "false"
                )
            if isinstance(record.get("matches_published"), bool):
                record["matches_published"] = (
                    "true" if record["matches_published"] else "false"
                )
            writer.writerow(record)


def main(argv: list[str] | None = None) -> int:
    """Reshape both DEQ instrument classes and validate the result."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input-root",
        type=Path,
        default=DEFAULT_INPUT_ROOT,
        help="directory holding deq-raw/ and deq-regulatory/",
    )
    parser.add_argument("--out-dir", type=Path, default=SOURCES_DIR)
    args = parser.parse_args(argv)

    sensor_dir = args.input_root / SENSOR_SUBDIR
    regulatory_dir = args.input_root / REGULATORY_SUBDIR
    for directory in (sensor_dir, regulatory_dir):
        if not directory.is_dir():
            raise DeqReshapeError(f"input directory not found: {directory}")
    args.out_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 74)
    print("DEQ RESHAPE")
    print("=" * 74)
    print(f"input root : {args.input_root}")
    print(f"output dir : {args.out_dir}")

    history = load_site_history(SITE_HISTORY)
    by_site = occupancy_by_site(history)

    # ---------------- sensors ----------------
    sensor_files = sorted(sensor_dir.glob("*.csv"))
    if not sensor_files:
        raise DeqReshapeError(f"no sensor CSVs in {sensor_dir}")

    parsed: dict[str, list[dict]] = {}
    raw_counts: dict[str, int] = {}
    for path in sensor_files:
        site_id, records = read_kunak_file(path)
        if site_id not in by_site:
            raise DeqReshapeError(
                f"{path.name}: site_id {site_id!r} is not in the site history"
            )
        labels = {r["Location"] for r in records}
        expected_labels = {o.kunak_label for o in by_site[site_id]}
        if labels != expected_labels:
            raise DeqReshapeError(
                f"{path.name}: Location {sorted(labels)} does not match "
                f"kunak_label {sorted(expected_labels)} in the site history"
            )
        timestamps = [r["_ts_raw"] for r in records]
        if len(set(timestamps)) != len(timestamps):
            raise DeqReshapeError(
                f"{path.name}: duplicate site-timestamp pairs survive "
                f"deduplication -- values disagree for the same hour"
            )
        parsed[site_id] = records
        raw_counts[site_id] = len(records)

    observed = {s: [r["_ts_raw"] for r in recs] for s, recs in parsed.items()}

    conflicts, conflict_warnings = check_unit_conflicts(history, observed)
    transit_sites, transit_notes = find_transit_sites(
        history, observed, by_site
    )

    sensor_rows: list[dict] = []
    violations: list[dict] = []
    for site_id, records in parsed.items():
        rows, site_violations = build_sensor_rows(
            site_id, records, by_site[site_id], transit_sites
        )
        sensor_rows.extend(rows)
        violations.extend(site_violations)

    hard_violations = [
        v for v in violations if v["disposition"] == "hard_failure"
    ]
    if hard_violations:
        write_csv(
            args.out_dir / "deq_occupancy_violations.csv",
            ["site_id", "ts_raw", "ts_est", "disposition"],
            violations,
        )
        offenders = sorted({v["site_id"] for v in hard_violations})
        raise DeqReshapeError(
            f"{len(hard_violations)} readings fall outside their site's "
            f"occupancy window and do not qualify for the pre-occupancy "
            f"transit exception (sites: {', '.join(offenders)}). Quarantined "
            f"to deq_occupancy_violations.csv."
        )

    annotate_zero_runs(sensor_rows)

    # ---------------- regulatory ----------------
    regulatory_rows: list[dict] = []
    for filename, pollutant in REGULATORY_FILES:
        path = regulatory_dir / filename
        if not path.exists():
            raise DeqReshapeError(f"regulatory file not found: {path}")
        regulatory_rows.extend(read_regulatory_file(path, pollutant))

    seen_keys: set[tuple[str, datetime, str]] = set()
    for row in regulatory_rows:
        key = (row["site_id"], row["ts_est"], row["pollutant"])
        if key in seen_keys:
            raise DeqReshapeError(f"duplicate regulatory reading: {key}")
        seen_keys.add(key)

    # ---------------- missing hours ----------------
    missing_rows: list[dict] = []
    missing_summary: list[tuple[str, int, int, list[datetime]]] = []
    for site_id, timestamps in sorted(observed.items()):
        pollutants = sorted(
            {r["pollutant"] for r in sensor_rows if r["site_id"] == site_id}
        )
        rows, expected, gaps = missing_hour_inventory(
            site_id, SENSOR_CLASS, timestamps, pollutants
        )
        missing_rows.extend(rows)
        gap_list = sorted(
            set(hour_range(min(timestamps), max(timestamps))) - set(timestamps)
        )
        missing_summary.append((site_id, expected, gaps, gap_list))
        pct = 100.0 * gaps / expected if expected else 0.0
        if pct > MISSING_HOUR_FAIL_PCT:
            raise DeqReshapeError(
                f"{site_id}: {gaps} of {expected} expected hours are missing "
                f"({pct:.1f}%), above the {MISSING_HOUR_FAIL_PCT:.0f}% "
                f"threshold. That is systematic loss, not routine downtime."
            )

    regulatory_observed: dict[tuple[str, str], list[datetime]] = defaultdict(list)
    for row in regulatory_rows:
        regulatory_observed[(row["site_id"], row["pollutant"])].append(
            row["ts_est"]
        )
    for (site_id, pollutant), timestamps in sorted(regulatory_observed.items()):
        rows, expected, gaps = missing_hour_inventory(
            site_id, REGULATORY_CLASS, timestamps, [pollutant]
        )
        missing_rows.extend(rows)
        missing_summary.append((f"{site_id}/{pollutant}", expected, gaps, []))

    # ---------------- daily ----------------
    daily_rows = daily_pm25(sensor_rows, SENSOR_CLASS)
    daily_rows.extend(
        daily_pm25(
            [r for r in regulatory_rows if r["pollutant"] == "PM2.5"],
            REGULATORY_CLASS,
        )
    )
    published = read_published_daily(regulatory_dir / REGULATORY_DAILY_FILE)
    matches, comparable, mismatches = reconcile(daily_rows, published, "ashburn")

    # ---------------- emit ----------------
    write_csv(
        args.out_dir / "deq_data_center_air_monitoring_hourly.csv",
        SENSOR_COLUMNS,
        sensor_rows,
    )
    write_csv(
        args.out_dir / "deq_regulatory_monitor_hourly.csv",
        REGULATORY_COLUMNS,
        regulatory_rows,
    )
    write_csv(args.out_dir / "deq_pm25_daily.csv", DAILY_COLUMNS, daily_rows)
    write_csv(
        args.out_dir / "deq_occupancy_violations.csv",
        ["site_id", "ts_raw", "ts_est", "disposition"],
        violations,
    )
    write_csv(
        args.out_dir / "deq_unit_conflicts.csv",
        [
            "unit_id", "site_a", "site_b", "overlap_start", "overlap_end",
            "readings_site_a", "readings_site_b", "classification",
        ],
        conflicts,
    )
    write_csv(
        args.out_dir / "deq_missing_hours.csv",
        ["site_id", "pollutant", "ts_est", "category"],
        missing_rows,
    )

    # ---------------- summary ----------------
    print("\n--- SENSOR FILES (Kunak) ---")
    print(f"{'site':<20}{'raw':>7}{'dedup':>8}{'long rows':>11}")
    for path in sensor_files:
        site_id = path.name.split("_")[0]
        raw_lines = len(path.read_bytes().decode("utf-8-sig").splitlines()) - 2
        emitted = sum(1 for r in sensor_rows if r["site_id"] == site_id)
        print(
            f"{site_id:<20}{raw_lines:>7}{raw_counts[site_id]:>8}{emitted:>11}"
        )
    print(f"{'TOTAL':<20}{'':>7}{sum(raw_counts.values()):>8}"
          f"{len(sensor_rows):>11}")

    print("\n--- EXCLUDED PER SITE PER POLLUTANT (validity only) ---")
    tally: dict[tuple[str, str], list[int]] = defaultdict(lambda: [0, 0])
    reasons: dict[tuple[str, str], set[str]] = defaultdict(set)
    for row in sensor_rows + regulatory_rows:
        key = (row["site_id"], row["pollutant"])
        tally[key][0] += 1
        if row["excluded"]:
            tally[key][1] += 1
            reasons[key].add(row["exclusion_reason"].split("=")[0])
    print(f"{'site':<20}{'pollutant':<10}{'rows':>7}{'excluded':>10}{'pct':>7}"
          f"  reasons")
    for (site_id, pollutant), (total, excluded) in sorted(tally.items()):
        pct = 100.0 * excluded / total if total else 0.0
        why = ", ".join(sorted(reasons[(site_id, pollutant)])) or "-"
        print(
            f"{site_id:<20}{pollutant:<10}{total:>7}{excluded:>10}"
            f"{pct:>6.1f}%  {why}"
        )

    print("\n--- EXACT ZEROS PER SITE PER POLLUTANT ---")
    zeros: dict[tuple[str, str], list[int]] = defaultdict(lambda: [0, 0])
    for row in sensor_rows:
        if float(row["value"]) == 0.0:
            key = (row["site_id"], row["pollutant"])
            zeros[key][0] += 1
            zeros[key][1] = max(zeros[key][1], int(row["zero_run_length"] or 0))
    print(f"{'site':<20}{'pollutant':<10}{'zeros':>8}{'max run (h)':>13}")
    for (site_id, pollutant), (count, longest) in sorted(zeros.items()):
        print(f"{site_id:<20}{pollutant:<10}{count:>8}{longest:>13}")

    print("\n--- MISSING HOURS (reported, not a failure) ---")
    for label, expected, gaps, gap_list in missing_summary:
        pct = 100.0 * gaps / expected if expected else 0.0
        print(f"  {label:<24}{gaps:>4} of {expected:>5} expected ({pct:.2f}%)")
        if 0 < len(gap_list) < 20:
            for ts_raw in gap_list:
                note = (
                    " [dst_spring_forward]"
                    if ts_raw == DST_MISSING_HOUR
                    else ""
                )
                print(f"      {ts_raw}{note}")

    print("\n--- SITES IN HISTORY WITH NO EXPORT ---")
    absent = sorted(set(by_site) - set(parsed))
    print(f"  {', '.join(absent) if absent else 'none'}")
    if absent:
        print(
            "  These have no readings, so rules scoped to them match 0 rows.\n"
            "  DEQ lists retired sites as 'Location without device'; whether\n"
            "  their history is downloadable is unresolved."
        )

    print("\n--- UNIT CONFLICTS ---")
    if conflict_warnings:
        for warning in conflict_warnings:
            print(f"  WARNING (provenance ambiguity): {warning}")
    else:
        print("  none")

    print("\n--- OCCUPANCY ---")
    if transit_notes:
        for note in transit_notes:
            print(f"  {note}")
    else:
        print("  no violations")

    print("\n--- DAILY RECONCILIATION vs DEQ PUBLISHED FILE ---")
    print(f"  comparable days (>=18 valid hours AND published-valid): "
          f"{comparable}")
    print(f"  EXACT AFTER TRUNCATION: {matches} of {comparable}")
    for line in mismatches:
        print(f"    mismatch {line}")

    print("\n--- OUTPUTS ---")
    for name in (
        "deq_data_center_air_monitoring_hourly.csv",
        "deq_regulatory_monitor_hourly.csv",
        "deq_pm25_daily.csv",
        "deq_occupancy_violations.csv",
        "deq_unit_conflicts.csv",
        "deq_missing_hours.csv",
    ):
        path = args.out_dir / name
        count = len(path.read_text(encoding="utf-8").splitlines()) - 1
        print(f"  {name:<48}{count:>7} rows")

    print("\nOK")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except DeqReshapeError as exc:
        print(f"\nHARD FAILURE: {exc}", file=sys.stderr)
        sys.exit(1)
