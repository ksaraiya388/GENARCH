"""Neutral site codes.

`pipeline/lookups/site_codes.json` is the single mapping shared by this report and
the site (DECISIONS.md D7). Internal slugs never leave this module: everything
downstream keys on the DC-xx code (CONTEXT.md C7 and C8).
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SITE_CODES_PATH = REPO_ROOT / "pipeline" / "lookups" / "site_codes.json"

LOUDOUN = "Loudoun County"


@dataclass(frozen=True)
class UnitPeriod:
    unit_id: str
    unit_label: str
    unit_id_confidence: str
    start_date: str
    end_date: str | None


@dataclass(frozen=True)
class Site:
    code: str
    site_id: str
    deq_published_name: str
    kunak_label: str
    area: str
    county: str
    county_source: str
    in_v1_scope: bool
    collocated_regulatory: bool
    pm25_end_date: str | None
    units: tuple[UnitPeriod, ...]


@lru_cache(maxsize=1)
def load(path: Path | None = None) -> tuple[Site, ...]:
    """Every site, in code order."""
    doc = json.loads((path or SITE_CODES_PATH).read_text(encoding="utf-8"))
    sites = tuple(
        Site(
            code=s["code"],
            site_id=s["site_id"],
            deq_published_name=s["deq_published_name"],
            kunak_label=s["kunak_label"],
            area=s["area"],
            county=s["county"],
            county_source=s["county_source"],
            in_v1_scope=s["in_v1_scope"],
            collocated_regulatory=s["collocated_regulatory"],
            pm25_end_date=s["pm25_end_date"],
            units=tuple(UnitPeriod(**u) for u in s["units"]),
        )
        for s in doc["sites"]
    )
    return tuple(sorted(sites, key=lambda s: s.code))


def by_site_id(site_id: str) -> Site:
    for site in load():
        if site.site_id == site_id:
            return site
    raise KeyError(f"no site code assigned for site_id {site_id!r}")


def code_for(site_id: str) -> str:
    return by_site_id(site_id).code


def by_code(code: str) -> Site:
    for site in load():
        if site.code == code:
            return site
    raise KeyError(f"unknown site code {code!r}")


def loudoun_codes() -> tuple[str, ...]:
    return tuple(s.code for s in load() if s.county == LOUDOUN)


def all_codes() -> tuple[str, ...]:
    return tuple(s.code for s in load())


def _slug_pattern() -> re.Pattern[str]:
    slugs = sorted({s.site_id for s in load()} | {"ashburn", "aurhill"}, key=len, reverse=True)
    return re.compile("|".join(re.escape(s) for s in slugs), re.IGNORECASE)


def find_slugs(text: str) -> list[str]:
    """Internal slugs present in `text`. Any hit is a C7 violation in public output."""
    return sorted({m.group(0) for m in _slug_pattern().finditer(text)})
