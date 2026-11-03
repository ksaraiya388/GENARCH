#!/usr/bin/env python3
"""Fetch one ACS 5-year release of DP05, B02001 and B02015 for Loudoun County.

Writes one file per table under ``pipeline/sources/cross_ancestry/``:

    acs_loudoun_<release>_dp05.json
    acs_loudoun_<release>_b02001.json
    acs_loudoun_<release>_b02015.json

Each holds the API's response verbatim under ``raw_response``, the release's own
label text for every variable in the table, and the request URL with the key
parameter removed. ``pipeline.report`` reads these for T12 and the F06 ACS panel.

This script does not touch ``acs_loudoun_2023.json``. That file is the input to
``/ancestry-equity`` and stays on the 2023 release it was retrieved from; the
report's release and the page's release are different and the divergence is an
open item in ``docs/report-2026/AUDIT.md``.

Why ``group()`` rather than label matching
------------------------------------------
``scripts/fetch_acs_loudoun.py`` resolves four DP05 variables by matching label
text against the vintage's 30 MB ``variables.json``, because Census renumbers
profile variables between vintages. This script takes whole tables instead:
``get=group(DP05)`` returns all 868 DP05 columns in one response, so no variable
has to be named, matched or numbered in advance, and nothing depends on a line
position. Labels come from the release's per-group metadata endpoint
(``.../groups/DP05.json``), which is the same authority as ``variables.json``
restricted to one table, so a label is still read from the release and never
assumed. Consumers select cells by label text at read time.

Three tables in one run, so all three share a vintage: a 2024 race count beside a
2023 total would not describe one population.

The key
-------
Read from ``CENSUS_API_KEY`` if set, otherwise ``~/.census_api_key``. It is never
printed, logged, written to an output file, or committed. Every URL that carries
it passes through ``_safe()`` before it can reach an error message or a saved
field, and a write-time guard refuses to write a payload containing the key or a
``key=`` parameter.

Usage:
    python scripts/fetch_acs_loudoun_release.py            # latest of 2024, 2023
    python scripts/fetch_acs_loudoun_release.py --release 2024
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

DATASET = "acs/acs5"
STATE_FIPS = "51"
COUNTY_FIPS = "107"
TIMEOUT = 300

# Newest first. The first release that serves all three tables is used.
CANDIDATE_RELEASES = ("2024", "2023")

# table id -> dataset path suffix. DP05 is a data profile and lives under
# `profile`; B02001 and B02015 are detailed tables on the base dataset.
TABLES = {
    "DP05": "profile",
    "B02001": "",
    "B02015": "",
}

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "pipeline" / "sources" / "cross_ancestry"

KEY_FILE = Path.home() / ".census_api_key"

UA = {"User-Agent": "GENARCH/1.0 (https://genarch.org)"}

_SENTINELS = {"-555555555", "-666666666", "-888888888", "-999999999", "-222222222"}


class Stop(Exception):
    """A stop condition fired. Nothing is written."""


def _safe(url: str) -> str:
    """Mask the API key before a URL reaches a log line or an error message."""
    return re.sub(r"([?&]key=)[^&]*", r"\1REDACTED", url)


def _without_key(url: str) -> str:
    """Drop the key parameter entirely, for a URL that gets written to a file.

    `_safe()` leaves the literal `key=` behind, which is the string the
    pre-commit scan greps for, so a recorded URL has to lose the parameter
    rather than mask its value.
    """
    stripped = re.sub(r"[?&]key=[^&]*", "", url)
    # A dropped first parameter leaves the next one introduced by `&`.
    return re.sub(r"\?&", "?", stripped)


def _api_key() -> str:
    """CENSUS_API_KEY if set, else ~/.census_api_key. Never echoed anywhere."""
    key = (os.environ.get("CENSUS_API_KEY") or "").strip()
    if key:
        return key
    if KEY_FILE.exists():
        try:
            key = KEY_FILE.read_text(encoding="utf-8").strip()
        except OSError as exc:
            raise Stop(f"could not read the key file at {KEY_FILE}: {exc}") from exc
        if key:
            return key
        raise Stop(f"the key file at {KEY_FILE} is empty")
    raise Stop(
        "No Census API key. The data endpoints reject keyless requests with an HTML "
        "'Missing Key' page. Set CENSUS_API_KEY, or put the key in "
        f"{KEY_FILE}. A free key comes from "
        "https://api.census.gov/data/key_signup.html."
    )


def _get(url: str) -> object:
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=TIMEOUT) as fh:
            return json.loads(fh.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise Stop(f"Census API returned HTTP {exc.code} for {_safe(url)}") from exc
    except Exception as exc:  # noqa: BLE001 - any failure is a stop condition
        raise Stop(f"Census API unreachable at {_safe(url)}: {exc!r}") from exc


def _base(release: str, table: str) -> str:
    suffix = TABLES[table]
    path = f"{DATASET}/{suffix}" if suffix else DATASET
    return f"https://api.census.gov/data/{release}/{path}"


def _data_url(release: str, table: str, key: str) -> str:
    return (
        f"{_base(release, table)}?get=group({table})"
        f"&for=county:{COUNTY_FIPS}&in=state:{STATE_FIPS}"
        f"&key={urllib.parse.quote(key)}"
    )


def _is_sentinel(value: object) -> bool:
    if value is None:
        return True
    text = str(value).strip()
    if text in _SENTINELS:
        return True
    return text.rstrip("0").rstrip(".") in _SENTINELS


def _release_serves(release: str, key: str) -> bool:
    """True when every table in TABLES answers for this release."""
    for table in TABLES:
        url = (
            f"{_base(release, table)}?get=NAME&for=county:{COUNTY_FIPS}"
            f"&in=state:{STATE_FIPS}&key={urllib.parse.quote(key)}"
        )
        try:
            rows = _get(url)
        except Stop:
            return False
        if not isinstance(rows, list) or len(rows) < 2:
            return False
    return True


def _pick_release(key: str, requested: str | None) -> str:
    if requested:
        if not _release_serves(requested, key):
            raise Stop(f"release {requested} does not serve all of {sorted(TABLES)}")
        return requested
    for release in CANDIDATE_RELEASES:
        print(f"probing ACS 5-year release {release}...")
        if _release_serves(release, key):
            return release
    raise Stop(f"none of {CANDIDATE_RELEASES} serves all of {sorted(TABLES)}")


def fetch_table(release: str, table: str, key: str) -> dict:
    """One table: labels from the release's group metadata, values from group()."""
    meta_url = f"{_base(release, table)}/groups/{table}.json"
    labels = _get(meta_url)
    if not isinstance(labels, dict) or "variables" not in labels:
        raise Stop(f"unexpected group metadata shape at {meta_url}")
    variables = labels["variables"]

    rows = _get(_data_url(release, table, key))
    if not isinstance(rows, list) or len(rows) < 2:
        raise Stop(f"unexpected response shape from {_safe(_data_url(release, table, key))}")
    header, values = rows[0], rows[1]
    cells = dict(zip(header, values))

    # Every data column the release labels, paired with its label text. Geography
    # columns (NAME, state, county) carry no label and are kept under `geography`.
    labelled: dict[str, dict] = {}
    for code in sorted(c for c in cells if c in variables):
        value = cells[code]
        labelled[code] = {
            "label": variables[code].get("label"),
            "value": value,
            "published": not _is_sentinel(value),
        }
    geography = {c: cells[c] for c in sorted(cells) if c not in variables}

    return {
        "source": "US Census Bureau, American Community Survey",
        "dataset": f"ACS {release} 5-year estimates ({DATASET})",
        "release": release,
        "table": table,
        "concept": next(
            (
                variables[c].get("concept")
                for c in sorted(variables)
                if variables[c].get("concept")
            ),
            None,
        ),
        "universe": next(
            (
                variables[c].get("universe")
                for c in sorted(variables)
                if variables[c].get("universe")
            ),
            None,
        ),
        "geography": "Loudoun County, Virginia",
        "geography_fips": {"state": STATE_FIPS, "county": COUNTY_FIPS},
        "geography_columns": geography,
        "retrieved_at": datetime.date.today().isoformat(),
        "request_url": _without_key(_data_url(release, table, "")),
        "label_source_url": meta_url,
        "selection_method": (
            f"Whole table requested as get=group({table}); no variable is named, "
            "matched or numbered in advance and nothing depends on a line position. "
            "Label text is read from the release's own per-group metadata endpoint "
            "recorded in label_source_url. Consumers select cells by label."
        ),
        "notes": (
            "Race and Hispanic origin in these tables are self-identified social "
            "categories. They are not genetic ancestry and must never be presented "
            "as a genetic-ancestry composition."
        ),
        "sentinel_handling": (
            "The API returns a large negative sentinel in place of a statistic it does "
            "not publish for a cell. Values are preserved verbatim and 'published' says "
            "whether the cell carries a real statistic. A false value must not be "
            "rendered as a number."
        ),
        "sentinel_codes_recognised": sorted(_SENTINELS),
        "variable_count": len(labelled),
        "raw_response": rows,
        "cells": labelled,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--release",
        default=None,
        help=f"ACS 5-year release year; default: newest of {CANDIDATE_RELEASES}",
    )
    args = parser.parse_args(argv)

    try:
        key = _api_key()
        release = _pick_release(key, args.release)
        print(f"ACS 5-year release {release}")

        OUT_DIR.mkdir(parents=True, exist_ok=True)
        written = []
        for table in sorted(TABLES):
            payload = fetch_table(release, table, key)
            serialised = json.dumps(payload, indent=2, ensure_ascii=False, sort_keys=True)

            # The one artefact that leaves the process. The invariant is checked
            # rather than assumed: a future field interpolating a request URL would
            # otherwise leak the key into the repository silently.
            if key in serialised or "key=" in serialised:
                raise Stop(
                    f"refusing to write {table}: the payload contains an API key or a "
                    "'key=' URL parameter. Scrub the offending field before writing."
                )

            out = OUT_DIR / f"acs_loudoun_{release}_{table.lower()}.json"
            with open(out, "w", encoding="utf-8", newline="\n") as fh:
                fh.write(serialised)
                fh.write("\n")
            written.append(out)
            print(f"  {table:<7} {payload['variable_count']:>3} labelled cells -> "
                  f"{out.relative_to(ROOT).as_posix()}")

        print(f"\n{len(written)} files written for release {release}")
        return 0

    except Stop as exc:
        print(f"STOP: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
