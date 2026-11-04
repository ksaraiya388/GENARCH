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
import json
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
        # The report. Its body is the largest block of user-visible text on the site and
        # it renders generated captions and table cells straight out of data/reports, so
        # a stale export would let the checks below pass on a build that predates it.
        SITE_DIR / "src" / "lib" / "report-registry.ts",
        SITE_DIR / "src" / "lib" / "report-content.tsx",
        SITE_DIR / "src" / "app" / "reports" / "page.tsx",
        SITE_DIR / "src" / "app" / "reports" / "[year]" / "page.tsx",
        SITE_DIR / "src" / "app" / "reports" / "[year]" / "print" / "page.tsx",
        *sorted((SITE_DIR / "src" / "content" / "reports" / "2026").glob("*")),
        *sorted((SITE_DIR / "src" / "components" / "report").glob("*")),
        *sorted((REPO_ROOT / "data" / "reports" / "2026").glob("*.json")),
        *sorted((REPO_ROOT / "data" / "reports" / "2026").glob("*.csv")),
    ]
    index = OUT_DIR / "community" / "data-center-alley" / "index.html"
    report = OUT_DIR / "reports" / "2026" / "index.html"
    if index.is_file() and report.is_file():
        built = min(index.stat().st_mtime, report.stat().st_mtime)
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

def test_the_report_pages_are_served_and_carry_their_safeguards(built_site):
    """The report's three routes, and the two things they must not get wrong.

    The report is the one page on the site that is deliberately unreachable: until its
    DOI is issued it is noindex, nofollow and linked from nowhere, so that a citation
    made from it resolves. And a bibliographic tag whose value is still pending must be
    omitted rather than emitted, because a reference manager that ingests the literal
    placeholder as a DOI stores a reference that will never resolve.
    """
    index = built_site / "reports" / "index.html"
    report = built_site / "reports" / "2026" / "index.html"
    printed = built_site / "reports" / "2026" / "print" / "index.html"
    for path in (index, report, printed):
        assert path.is_file(), f"{path.relative_to(built_site)} was not exported"

    report_html = report.read_text(encoding="utf-8", errors="replace")
    assert 'name="robots" content="noindex, nofollow"' in report_html

    # No tag may carry the placeholder, and the two that have no value yet must be gone.
    assert "citation_title" in report_html
    assert "citation_doi" not in report_html
    assert "citation_pdf_url" not in report_html
    assert "PENDING" not in report_html

    printed_html = printed.read_text(encoding="utf-8", errors="replace")
    assert 'name="robots"' in printed_html and "noindex" in printed_html

    # The index lists the report but does not link to it while the DOI is pending.
    index_html = index.read_text(encoding="utf-8", errors="replace")
    assert "DOI pending" in index_html
    assert 'href="/reports/2026/"' not in index_html


def test_the_report_figures_and_tables_are_served(built_site):
    """The figures are referenced by URL, so they have to be staged into public/.

    `copy-data.js` copies `data/` into `_data/`, which is never served, so a figure
    referenced from `_data` would 404 in the browser and print as a blank frame. This
    checks the staged copies exist and that the page points at them.
    """
    report = (built_site / "reports" / "2026" / "index.html").read_text(
        encoding="utf-8", errors="replace"
    )
    figures = json.loads(
        (REPO_ROOT / "data" / "reports" / "2026" / "figures.json").read_text(
            encoding="utf-8"
        )
    )
    for figure in figures["figures"]:
        src = f"/reports/2026/{figure['id']}.svg"
        assert src in report, f"{figure['id']} is not referenced by the report page"
        staged = built_site / "reports" / "2026" / f"{figure['id']}.svg"
        assert staged.is_file(), f"{figure['id']}.svg was not staged into the export"
