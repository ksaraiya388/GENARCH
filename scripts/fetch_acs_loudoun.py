#!/usr/bin/env python3
"""Fetch ACS 2023 5-year population counts for Loudoun County, Virginia.

Writes ``pipeline/sources/cross_ancestry/acs_loudoun_2023.json``: the raw API
responses, the matched variable codes, and the label text the Census Bureau
publishes for each one.

Variables are selected by matching LABEL TEXT against the year's
``variables.json``, never by a memorised variable code. Census renumbers
profile variables between vintages -- DP05_0038E is not the same series in
every year -- so a hard-coded code silently returns the wrong population.
A label that does not match exactly one variable is a hard error.

The Census data endpoints require an API key (the free one from
https://api.census.gov/data/key_signup.html). It is read from the
``CENSUS_API_KEY`` environment variable if set, otherwise from
``~/.census_api_key``, which sits outside the repository. It is never printed,
logged, written to the output file, or committed: every URL that carries it is
passed through ``_safe()`` before it can reach an error message or a saved field.
``variables.json`` needs no key, so label resolution runs before the key is read
and a missing key reports only after the labels verify.

Two tables are read:

* ``DP05`` (data profile): total population, Black or African American alone,
  Asian alone, and Hispanic or Latino of any race. The profile tables carry
  percentages (``PE``) and their margins of error (``PM``) alongside the counts,
  so the published percentage is used rather than one computed here.
* ``B02015`` (detailed table): Asian alone by selected groups, for the five
  South Asian groups GENARCH reports. Detailed tables carry counts and margins
  of error only; no percentage is published, and none is computed here.

Usage:
    python scripts/fetch_acs_loudoun.py
"""

from __future__ import annotations

import datetime
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

YEAR = "2023"
DATASET = "acs/acs5"
STATE_FIPS = "51"
COUNTY_FIPS = "107"
TIMEOUT = 180

ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / "pipeline" / "sources" / "cross_ancestry" / "acs_loudoun_2023.json"

# Fallback key location, deliberately outside the repository so it cannot be
# committed by a stray `git add -A`.
KEY_FILE = Path.home() / ".census_api_key"

UA = {"User-Agent": "GENARCH/1.0 (https://genarch.org; mailto:kiaansaraiya@gmail.com)"}

# Exact label strings, as published in the vintage's variables.json. Each must
# match exactly one variable. The key is the name GENARCH uses internally.
PROFILE_LABELS = {
    "total_population": "Estimate!!SEX AND AGE!!Total population",
    "black_or_african_american_alone": (
        "Estimate!!RACE!!Total population!!One race!!Black or African American"
    ),
    "asian_alone": "Estimate!!RACE!!Total population!!One race!!Asian",
    "hispanic_or_latino_any_race": (
        "Estimate!!HISPANIC OR LATINO AND RACE!!Total population!!"
        "Hispanic or Latino (of any race)"
    ),
}

DETAIL_LABELS = {
    "asian_indian": "Estimate!!Total:!!South Asian:!!Asian Indian",
    "pakistani": "Estimate!!Total:!!South Asian:!!Pakistani",
    "bangladeshi": "Estimate!!Total:!!South Asian:!!Bangladeshi",
    "sri_lankan": "Estimate!!Total:!!South Asian:!!Sri Lankan",
    "nepalese": "Estimate!!Total:!!South Asian:!!Nepalese",
}


class Stop(Exception):
    """A stop condition fired. Nothing is written."""


def _safe(url: str) -> str:
    """Strip the API key before a URL reaches a log line or an error message."""
    return re.sub(r"([?&]key=)[^&]*", r"\1REDACTED", url)


# The ACS API returns large negative sentinels in place of a statistic rather than
# omitting the field. Rendered as a number, "-555555555" reads as a margin of error of
# half a billion people. These are recognised and flagged, but no official definition
# is asserted for each code: the only claim made downstream is the one that is
# self-evident from the response, namely that no statistic was published for that cell.
_SENTINELS = {"-555555555", "-666666666", "-888888888", "-999999999", "-222222222"}


def _is_sentinel(value: object) -> bool:
    if value is None:
        return True
    text = str(value).strip()
    if text in _SENTINELS:
        return True
    # Some cells carry the sentinel with a decimal tail, e.g. "-555555555.0".
    return text.rstrip("0").rstrip(".") in _SENTINELS


def _exceeds_margin(estimate: object, moe: object) -> bool:
    """True when the margin of error is at least as large as the estimate."""
    if _is_sentinel(moe) or estimate is None:
        return False
    try:
        return abs(float(str(moe))) >= abs(float(str(estimate)))
    except ValueError:
        return False


def _get(url: str) -> object:
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=TIMEOUT) as fh:
            return json.loads(fh.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise Stop(f"Census API returned HTTP {exc.code} for {_safe(url)}") from exc
    except Exception as exc:  # noqa: BLE001 - any failure is a stop condition
        raise Stop(f"Census API unreachable at {_safe(url)}: {exc!r}") from exc


def _resolve(
    variables: dict[str, dict], wanted: dict[str, str], prefix: str
) -> dict[str, dict[str, str]]:
    """Map each wanted label to exactly one estimate variable code.

    Raises Stop if a label matches zero or more than one variable.
    """
    resolved: dict[str, dict[str, str]] = {}
    for key, label in wanted.items():
        matches = [
            code
            for code, meta in variables.items()
            if code.startswith(prefix)
            and code.endswith("E")
            and not code.endswith("PE")
            and meta.get("label") == label
        ]
        if len(matches) != 1:
            raise Stop(
                f"label {label!r} matched {len(matches)} variables in "
                f"{YEAR} {prefix} ({matches}); expected exactly 1"
            )
        code = matches[0]
        resolved[key] = {"code": code, "label": variables[code]["label"]}
        print(f"  {code:<14} {variables[code]['label']}")
    return resolved


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


def _fetch_values(path: str, codes: list[str]) -> dict[str, str]:
    """Fetch one row for Loudoun County and return {variable code: value}."""
    url = (
        f"https://api.census.gov/data/{YEAR}/{path}?get="
        + urllib.parse.quote(",".join(codes))
        + f"&for=county:{COUNTY_FIPS}&in=state:{STATE_FIPS}"
        + f"&key={urllib.parse.quote(_api_key())}"
    )
    rows = _get(url)
    if not isinstance(rows, list) or len(rows) < 2:
        raise Stop(f"unexpected response shape from {_safe(url)}: {rows!r}")
    header, values = rows[0], rows[1]
    return dict(zip(header, values))


def _suffixed(codes: dict[str, dict[str, str]], suffixes: list[str]) -> list[str]:
    """Estimate codes end in E; swap that for each requested suffix."""
    out: list[str] = []
    for meta in codes.values():
        stem = meta["code"][:-1]
        out.extend(f"{stem}{s}" for s in suffixes)
    return out


def main() -> int:
    try:
        print(f"Resolving {YEAR} ACS variable labels...")
        profile_vars = _get(
            f"https://api.census.gov/data/{YEAR}/{DATASET}/profile/variables.json"
        )["variables"]
        detail_vars = _get(
            f"https://api.census.gov/data/{YEAR}/{DATASET}/variables.json"
        )["variables"]

        print("DP05 (data profile):")
        profile = _resolve(profile_vars, PROFILE_LABELS, "DP05")
        print("B02015 (Asian alone by selected groups):")
        detail = _resolve(detail_vars, DETAIL_LABELS, "B02015")

        # Profile tables publish estimate, MOE, percent, and percent MOE.
        # Detail tables publish estimate and MOE only.
        profile_raw = _fetch_values(
            f"{DATASET}/profile", _suffixed(profile, ["E", "M", "PE", "PM"])
        )
        detail_raw = _fetch_values(DATASET, _suffixed(detail, ["E", "M"]))

        def pack(
            codes: dict[str, dict[str, str]], raw: dict[str, str], pct: bool
        ) -> dict[str, dict]:
            out: dict[str, dict] = {}
            for key, meta in codes.items():
                stem = meta["code"][:-1]
                est = raw.get(f"{stem}E")
                moe = raw.get(f"{stem}M")
                rec: dict[str, object] = {
                    "variable": meta["code"],
                    "label": meta["label"],
                    "estimate": est,
                    "margin_of_error": moe,
                    "margin_of_error_published": not _is_sentinel(moe),
                }
                if pct:
                    pe = raw.get(f"{stem}PE")
                    pm = raw.get(f"{stem}PM")
                    # In a DP profile the percent column of a base row repeats the
                    # count rather than carrying a percentage. Treating that as a
                    # percentage would print "427082%".
                    is_base = pe is not None and pe == est
                    rec["percent"] = None if is_base else pe
                    rec["percent_published"] = not is_base and not _is_sentinel(pe)
                    rec["percent_margin_of_error"] = pm
                    rec["percent_margin_of_error_published"] = not _is_sentinel(pm)
                    if is_base:
                        rec["percent_note"] = (
                            "This is the base row of the table; the profile's percent "
                            "column repeats the count, so no percentage is published."
                        )
                # An estimate smaller than its own margin of error is not
                # distinguishable from a substantially smaller number. Flagged here so
                # the site cannot present it as a firm count.
                rec["estimate_exceeds_margin"] = _exceeds_margin(est, moe)
                out[key] = rec
            return out

        payload = {
            "source": "US Census Bureau, American Community Survey",
            "dataset": f"ACS {YEAR} 5-year estimates ({DATASET})",
            "vintage": f"{YEAR} ACS 5-year estimates (2019-{YEAR})",
            "geography": "Loudoun County, Virginia",
            "geography_fips": {"state": STATE_FIPS, "county": COUNTY_FIPS},
            "retrieved_at": datetime.date.today().isoformat(),
            "api_base": f"https://api.census.gov/data/{YEAR}/{DATASET}",
            "selection_method": (
                "Variables resolved by exact match against the vintage's "
                "variables.json label text, not by memorised variable code. "
                "A label matching other than exactly one variable is a hard error."
            ),
            "notes": (
                "Percentages and their margins of error are the values the "
                "Census Bureau publishes in the DP05 profile (PE/PM), not "
                "values computed here. B02015 is a detailed table and "
                "publishes no percentage; none is derived. Race and Hispanic "
                "origin are self-identification categories and are not "
                "genetic-ancestry groupings."
            ),
            "sentinel_handling": (
                "The API returns a large negative sentinel in place of a statistic it "
                "does not publish for a cell. Raw values are preserved verbatim; the "
                "'*_published' booleans say whether each cell carries a real statistic. "
                "A false value means no statistic was published and the cell must not be "
                "rendered as a number. 'estimate_exceeds_margin' marks an estimate whose "
                "margin of error is at least as large as the estimate itself."
            ),
            "sentinel_codes_recognised": sorted(_SENTINELS),
            "profile_dp05": pack(profile, profile_raw, pct=True),
            "detail_b02015": pack(detail, detail_raw, pct=False),
            "raw_responses": {"profile_dp05": profile_raw, "detail_b02015": detail_raw},
        }

        # Write-time guard. Nothing assembled above puts a URL in the payload, but
        # this file is the one artefact that leaves the process, so the invariant is
        # checked rather than assumed: a future field that interpolated a request URL
        # would otherwise leak the key into the repository silently.
        serialised = json.dumps(payload, indent=2, ensure_ascii=False)
        key = _api_key()
        if key in serialised or "key=" in serialised:
            raise Stop(
                "refusing to write: the payload contains an API key or a 'key=' URL "
                "parameter. Scrub the offending field before writing."
            )

        OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(OUT_PATH, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(serialised)
            fh.write("\n")
        print(f"\nWrote {OUT_PATH.relative_to(ROOT).as_posix()}")
        return 0

    except Stop as exc:
        print(f"STOP: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
