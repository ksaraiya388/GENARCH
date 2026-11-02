"""Tests for what the static site actually serves.

`tests/test_report.py` gates the report generator's output. This module gates the
other half of C7 and C8: the files `next build` emits under `site/out/`, which is
everything a reader can open or download.

The check is deliberately crude. It builds the site and greps every served HTML,
JSON and CSV file for every internal `site_id` in the DEQ site history, plus the
bare locality `ashburn` that the regulatory monitor is keyed on internally. A hit
is a C7 violation wherever it appears -- body copy, a label, a tooltip, an
`aria-label`, an `alt`, a React Server Component payload, or a download -- so the
test does not try to tell those apart.

The site-history CSV is the source of the term list rather than
`pipeline/lookups/site_codes.json`, let alone the frozen copy of it the report
reads: a site the weekly ingest adds to the history is a slug that can reach the
page before anyone remembers to assign it a code, and that is exactly the case
this test has to catch.
"""

from __future__ import annotations

import csv
import os
import re
import shutil
import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
SITE_DIR = REPO_ROOT / "site"
OUT_DIR = SITE_DIR / "out"
HISTORY = REPO_ROOT / "pipeline" / "sources" / "deq_sensor_site_history.csv"

# What a reader can open or receive. `.txt` covers the React Server Component
# payloads Next.js writes beside each route, which carry every serialised prop.
SERVED_SUFFIXES = {".html", ".json", ".csv", ".txt"}

# The regulatory monitor's internal site_id is a bare locality rather than a
# hyphenated slug, so it is not in the history's site_id column and has to be
# listed. `REGULATORY_KEY` in lib/deq-data.ts is what the site publishes instead.
EXTRA_TERMS = ("ashburn",)


def _site_ids() -> list[str]:
    with open(HISTORY, encoding="utf-8-sig", newline="") as handle:
        return sorted({row["site_id"] for row in csv.DictReader(handle)})


def _pattern(terms: list[str]) -> re.Pattern[str]:
    # Longest first, so a hit reports the most specific term that matched.
    ordered = sorted(terms, key=len, reverse=True)
    return re.compile("|".join(re.escape(term) for term in ordered), re.IGNORECASE)


@pytest.fixture(scope="module")
def built_site() -> Path:
    """One `npm run build`, reusing an existing export only when it is newer than the sources.

    The build is the test. A stale `site/out/` from an earlier commit would pass
    this check while the tree it was built from no longer does, so the export is
    rebuilt unless it is newer than every input that feeds the page.
    """
    npm = shutil.which("npm") or shutil.which("npm.cmd")
    if npm is None:
        pytest.skip("npm is not on PATH")
    if not (SITE_DIR / "node_modules").is_dir():
        pytest.skip("site/node_modules is absent; run npm install in site/")

    inputs = [
        HISTORY,
        REPO_ROOT / "pipeline" / "lookups" / "site_codes.json",
        SITE_DIR / "src" / "lib" / "deq-data.ts",
        SITE_DIR / "src" / "lib" / "site-codes.ts",
        SITE_DIR / "src" / "app" / "community" / "data-center-alley" / "page.tsx",
        SITE_DIR / "scripts" / "copy-data.js",
    ]
    index = OUT_DIR / "community" / "data-center-alley" / "index.html"
    if index.is_file():
        built = index.stat().st_mtime
        if all(p.stat().st_mtime <= built for p in inputs if p.exists()):
            return OUT_DIR

    env = dict(os.environ, PYTHONUTF8="1")
    done = subprocess.run(
        [npm, "run", "build"],
        cwd=SITE_DIR,
        env=env,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=1800,
    )
    assert done.returncode == 0, (
        "next build failed, so no served file could be checked:\n"
        + (done.stdout or "")[-4000:]
        + (done.stderr or "")[-4000:]
    )
    assert index.is_file(), f"the build produced no {index}"
    return OUT_DIR


def _served_files(out: Path) -> list[Path]:
    return [
        p
        for p in sorted(out.rglob("*"))
        if p.is_file() and p.suffix.lower() in SERVED_SUFFIXES
    ]


def test_no_served_file_contains_an_internal_site_identifier(built_site):
    terms = _site_ids() + list(EXTRA_TERMS)
    assert len(terms) >= 10, f"the history yielded only {len(terms)} terms; check the parse"
    pattern = _pattern(terms)

    offenders: dict[str, list[str]] = {}
    checked = 0
    for path in _served_files(built_site):
        text = path.read_text(encoding="utf-8", errors="replace")
        checked += 1
        found = sorted({m.group(0).lower() for m in pattern.finditer(text)})
        if found:
            offenders[path.relative_to(built_site).as_posix()] = found

    assert checked > 0, "no served file was found to check"
    assert not offenders, (
        "internal site identifiers reached files served to users. Every one of these is a C7 "
        f"violation (docs/report-2026/CONTEXT.md): {offenders}"
    )


def test_no_served_filename_contains_an_internal_site_identifier(built_site):
    pattern = _pattern(_site_ids() + list(EXTRA_TERMS))
    offenders = {
        p.relative_to(built_site).as_posix(): sorted(
            {m.group(0).lower() for m in pattern.finditer(p.name)}
        )
        for p in _served_files(built_site)
        if pattern.search(p.name)
    }
    assert not offenders, f"internal site identifiers in served filenames: {offenders}"


def test_the_served_downloads_are_keyed_by_site_code(built_site):
    """The download tables exist, carry `site_code`, and carry no `site_id`."""
    deq = built_site / "data" / "deq"
    assert deq.is_dir(), f"the build served no DEQ download directory at {deq}"
    tables = sorted(deq.glob("*.csv"))
    assert tables, "the build served no DEQ download tables"
    for path in tables:
        with open(path, encoding="utf-8", newline="") as handle:
            header = next(csv.reader(handle))
        assert "site_code" in header, f"{path.name} is not keyed by site code: {header}"
        assert "site_id" not in header, f"{path.name} still carries a site_id column"
