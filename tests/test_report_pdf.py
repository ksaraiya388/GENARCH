"""Checks on the finished report PDF.

These skip unless a PDF has been built, because building one needs Playwright, a
browser download and a full site build, none of which belong in the default test run.
When a PDF is present they run the same audit the post-processor runs, which is the
point: the constraints apply to the artifact that gets downloaded and passed on, and
the only way to check that artifact is to read text out of it.

To produce one:

    node site/scripts/build-report-pdf.mjs --draft
    python -m pipeline.report_pdf_post docs/report-2026/drafts/<name>.pdf
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
YEAR = "2026"
DRAFTS = REPO_ROOT / "docs" / "report-2026" / "drafts"
PUBLISHED = REPO_ROOT / "site" / "public" / "reports" / YEAR


def find_pdf() -> Path | None:
    """The published PDF if there is one, otherwise the newest draft."""
    final = sorted(PUBLISHED.glob("GENARCH_Annual_Report_*.pdf")) if PUBLISHED.is_dir() else []
    if final:
        return final[-1]
    drafts = sorted(DRAFTS.glob("GENARCH_Annual_Report_*_draft-*.pdf")) if DRAFTS.is_dir() else []
    if drafts:
        return max(drafts, key=lambda p: p.stat().st_mtime)
    return None


pytest.importorskip("pypdf", reason="pypdf is needed to read the report PDF")
pytest.importorskip("pikepdf", reason="pikepdf is needed to read the report PDF")

PDF = find_pdf()
needs_pdf = pytest.mark.skipif(
    PDF is None,
    reason="no report PDF built; run site/scripts/build-report-pdf.mjs --draft",
)


@pytest.fixture(scope="module")
def text() -> str:
    from pipeline.report_pdf_post import extract_text

    return extract_text(PDF)


@needs_pdf
def test_the_pdf_is_tagged(text: str) -> None:
    """Structure tags are what make the document navigable by assistive technology.

    Nothing else in the build checks for them, and a PDF silently loses them if the
    renderer is called without the option, so this reads the flag off the file.
    """
    import pikepdf

    with pikepdf.open(PDF) as doc:
        mark_info = doc.Root.get("/MarkInfo")
        assert mark_info is not None, "/MarkInfo is absent: the PDF is not tagged"
        assert bool(mark_info.get("/Marked")) is True


@needs_pdf
def test_the_pdf_carries_its_bibliographic_metadata() -> None:
    import pikepdf

    frontmatter = json.loads(
        (REPO_ROOT / "site" / "src" / "content" / "reports" / YEAR / "frontmatter.json")
        .read_text(encoding="utf-8")
    )
    with pikepdf.open(PDF) as doc:
        assert str(doc.docinfo.get("/Title")) == frontmatter["title"]
        assert str(doc.docinfo.get("/Author")) == frontmatter["author"]["name"]
        assert str(doc.docinfo.get("/Subject"))
        assert str(doc.Root.get("/Lang")) == "en-US"


@needs_pdf
def test_the_deq_limitation_appears_beside_every_sensor_figure(text: str) -> None:
    """Required in the summary, in the limitations box and in every sensor caption.

    The expected count is computed from the manifest rather than fixed, so adding a
    sensor figure raises the bar instead of leaving a figure uncovered. The ancestry
    figure is not sensor data and carries its own descriptive-only limitation, which
    is why it is not counted.
    """
    import re
    import unicodedata

    from pipeline.report_pdf_post import count_sensor_figures

    limitation = json.loads(
        (REPO_ROOT / "site" / "src" / "content" / "deq-limitation.json").read_text(
            encoding="utf-8"
        )
    )["limitation"]
    needle = unicodedata.normalize("NFC", re.sub(r"\s+", " ", limitation)).strip()
    required = count_sensor_figures(YEAR) + 2
    assert text.count(needle) >= required, (
        f"DEQ's limitation appears {text.count(needle)} time(s) in the PDF; "
        f"{required} are required"
    )


@needs_pdf
def test_no_internal_site_identifier_reaches_the_pdf(text: str) -> None:
    from pipeline.report_pdf_post import internal_identifiers

    lowered = text.lower()
    for identifier in internal_identifiers():
        assert identifier.lower() not in lowered, (
            f"internal site identifier {identifier!r} reaches the PDF text (C7)"
        )


@needs_pdf
def test_the_pdf_makes_no_priority_claim(text: str) -> None:
    from pipeline.report_pdf_post import FIRST_CLAIM

    hit = FIRST_CLAIM.search(text)
    assert hit is None, f"the PDF makes a priority claim: {hit.group(0)!r} (X6)"


@needs_pdf
def test_the_pdf_carries_no_mojibake(text: str) -> None:
    from pipeline.report_pdf_post import MOJIBAKE

    for signature in MOJIBAKE:
        assert signature not in text, f"mojibake U+{ord(signature):04X} reaches the PDF"


def squash(value: str) -> str:
    """Drop whitespace and hyphens, so a wrapped cell compares as its own text.

    A cell inside a narrow column extracts in fragments, with renderer-inserted
    hyphens: "matches DEQ at published precision" comes out as "matches DEQ at pub-
    lished preci- sion". Those hyphens are layout, not data.
    """
    return re.sub(r"[\s\u00ad-]+", "", value).lower()


@needs_pdf
def test_every_figure_and_its_data_table_reach_the_pdf(text: str) -> None:
    """A figure whose data table did not print has lost its fallback.

    This is a real failure mode rather than a hypothetical one: the data tables sit in
    a `<details>`, whose contents a browser does not print unless the stylesheet
    forces them open, and the forcing rule is engine-dependent. Probing cells from
    each table is the only way to know it is in the file.

    Two probes per table, the first column of the first row and the last column of the
    header, because a wide table that overflows the measure loses its right-hand side
    rather than the whole of itself.
    """
    data = REPO_ROOT / "data" / "reports" / YEAR
    figures = json.loads((data / "figures.json").read_text(encoding="utf-8"))["figures"]
    manifests = {
        t["id"]: t
        for t in json.loads((data / "tables.json").read_text(encoding="utf-8"))["tables"]
    }
    flat = squash(text)

    for figure in figures:
        assert squash(figure["title"]) in flat, (
            f"{figure['id']} caption is absent from the PDF"
        )
        manifest = manifests.get(figure["data_table"])
        if manifest is None:
            continue
        rows = (data / manifest["file"]).read_text(encoding="utf-8").splitlines()
        assert len(rows) > 1
        probes = [rows[1].split(",")[0].strip('"'), manifest["columns"][-1]]
        for probe in probes:
            assert squash(probe) in flat, (
                f"{figure['id']}: {probe!r} from its data table {manifest['id']} did "
                "not reach the PDF, so the figure's data fallback is incomplete in the "
                "published artifact"
            )


@needs_pdf
def test_every_report_table_reaches_the_pdf_in_full(text: str) -> None:
    """Every table, and both ends of every header row.

    A table rendered into a measure narrower than itself keeps its left-hand columns
    and silently drops the rest, which is how the collocation table shipped without
    its status column in the first draft. Checking the last header cell of each table
    is what catches that.
    """
    data = REPO_ROOT / "data" / "reports" / YEAR
    manifests = list(
        json.loads((data / "tables.json").read_text(encoding="utf-8"))["tables"]
    )
    for name in ("inventory.json", "chain.json"):
        manifests.append(json.loads((data / name).read_text(encoding="utf-8"))["table"])

    flat = squash(text)
    for manifest in manifests:
        assert squash(manifest["title"]) in flat, (
            f"{manifest['id']} is absent from the PDF entirely"
        )
        for column in (manifest["columns"][0], manifest["columns"][-1]):
            assert squash(column) in flat, (
                f"{manifest['id']}: column {column!r} did not reach the PDF"
            )


@needs_pdf
def test_the_checksum_sidecars_match_the_file() -> None:
    import hashlib

    sha_file = PDF.with_suffix(PDF.suffix + ".sha256")
    if not sha_file.exists():
        pytest.skip("no sidecar yet; run pipeline.report_pdf_post")
    recorded = sha_file.read_text(encoding="utf-8").split()[0]
    assert recorded == hashlib.sha256(PDF.read_bytes()).hexdigest()
