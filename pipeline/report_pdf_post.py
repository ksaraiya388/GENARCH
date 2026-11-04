"""Post-process and audit the annual report PDF.

    python -m pipeline.report_pdf_post <pdf> [--final]

Two jobs, and they are separate on purpose.

The first is metadata: a PDF that will be deposited and cited needs its title, author,
subject, keywords and language in both the document information dictionary and the XMP
packet, because different readers consult different ones. This also asserts that the
PDF is tagged, since the structure tags are what make the document navigable by
assistive technology and nothing else in the build checks for them.

The second is an audit of the rendered text. Every content constraint this project
holds applies to what a reader actually sees, and the page source is not that: the text
is assembled from components, captions come out of generated manifests, and the PDF is
the artifact that will be downloaded and passed on. So the checks run against text
extracted from the finished file. A constraint breach fails the run. A causal verb is
listed rather than failed on, because the verbs have legitimate uses -- describing what
a cited paper reported, or denying the claim -- and only a reader can tell which this
is.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import unicodedata
import zipfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTMATTER = REPO_ROOT / "site" / "src" / "content" / "reports"
SITE_CODES = REPO_ROOT / "pipeline" / "lookups" / "site_codes.json"
REPORTS_DATA = REPO_ROOT / "data" / "reports"

# docs/report-2026/CONTEXT.md X8. Verbs that would assert the corridor, its facilities
# or a reading brought about a health outcome.
X8_VERBS = (
    "causes",
    "caused",
    "causing",
    "drives",
    "drove",
    "driving",
    "leads to",
    "led to",
    "responsible for",
    "harms",
    "harmed",
    "harming",
    "increases risk",
    "increased risk",
    "increasing risk",
)

# docs/report-2026/CONTEXT.md X6. A priority claim, in the three forms the rule names.
FIRST_CLAIM = re.compile(r"\bfirst (outside|independent|to)\b", re.IGNORECASE)

# The signatures scripts/check_mojibake.py looks for. Built from code points rather than
# written as characters or escapes, so this file cannot match itself. It did once: a patch
# script rewrote this line and its own string literal decoded the escapes on the way in,
# which the pre-commit encoding gate caught.
MOJIBAKE = (chr(0x00C3), chr(0x00C2), chr(0xFEFF))

SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")


class AuditError(RuntimeError):
    """A constraint the finished PDF does not satisfy."""


def sha256_of(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def md5_of(path: Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest()


def load_frontmatter(year: str) -> dict:
    path = FRONTMATTER / year / "frontmatter.json"
    if not path.exists():
        raise AuditError(f"no frontmatter for report {year}: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def year_from_pdf(pdf: Path) -> str:
    match = re.search(r"(\d{4})", pdf.name)
    if match is None:
        raise AuditError(f"cannot read a report year out of {pdf.name}")
    return match.group(1)


# The regulatory monitor's own slug. It is not a row in the site-code lookup, because
# the lookup covers sensor sites, so it is named here; CONTEXT.md C7 bans it by name.
REGULATORY_SLUG = "ashburn"


def internal_identifiers() -> list[str]:
    """Every internal site slug, read from the lookup rather than retyped.

    C7 keeps these out of every public surface. Reading them from the single lookup
    the pipeline and the site already share means a site added later is covered by
    this check without anybody remembering to extend a list here.

    Full slugs only. The leading segment of a slug is an ordinary place word that is
    also part of the name DEQ publishes for that location, and C8 sanctions exactly
    one table carrying those names: a site key with no reading value in it. Banning
    the word would make that table impossible while doing nothing about the slug,
    which is hyphenated and cannot occur inside a published name.
    """
    doc = json.loads(SITE_CODES.read_text(encoding="utf-8"))
    ids = {site["site_id"] for site in doc["sites"]}
    ids.add(REGULATORY_SLUG)
    return sorted(ids)


def extract_text(pdf: Path) -> str:
    """Rendered text, normalised so a check is not defeated by line layout.

    Three normalisations, each covering a way the same sentence can come out of a PDF
    looking different from itself: a hyphen at a line break is rejoined, every run of
    whitespace collapses to one space, and the text is NFC-composed so a quotation
    typed with a combining accent still matches one typed with a precomposed
    character.
    """
    from pypdf import PdfReader

    reader = PdfReader(str(pdf))
    pages = [page.extract_text() or "" for page in reader.pages]
    text = "\n".join(pages)
    text = unicodedata.normalize("NFC", text)
    text = re.sub(r"(\w)-\s*\n\s*(\w)", r"\1\2", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def count_sensor_figures(year: str) -> int:
    """Figures carrying DEQ's limitation: the sensor figures, not every figure.

    The ancestry figure is not sensor data and carries its own descriptive-only
    limitation instead, so counting figures in the manifest would overcount by one and
    the expected occurrence count would never be met.
    """
    figures = json.loads((REPORTS_DATA / year / "figures.json").read_text(encoding="utf-8"))
    limitation = json.loads(
        (REPO_ROOT / "site" / "src" / "content" / "deq-limitation.json").read_text(
            encoding="utf-8"
        )
    )["limitation"]
    first_sentence = limitation.split(". ")[0]
    return sum(1 for fig in figures["figures"] if first_sentence in fig["limitation"])


def audit(text: str, year: str, fm: dict, final: bool) -> list[str]:
    """Run every check. Returns the sentences held for review; raises on a breach."""
    failures: list[str] = []
    limitation = json.loads(
        (REPO_ROOT / "site" / "src" / "content" / "deq-limitation.json").read_text(
            encoding="utf-8"
        )
    )["limitation"]
    needle = unicodedata.normalize("NFC", re.sub(r"\s+", " ", limitation)).strip()

    # The limitation has to appear beside every sensor figure, in the summary and in
    # the limitations section. That is the number of sensor figures plus two, and it is
    # computed rather than hardcoded so adding a sensor figure raises the bar.
    required = count_sensor_figures(year) + 2
    found = text.count(needle)
    if found < required:
        failures.append(
            f"DEQ's limitation appears {found} time(s); at least {required} are required "
            f"({required - 2} sensor figure caption(s), the summary and the limitations "
            "section)"
        )

    lowered = text.lower()
    for identifier in internal_identifiers():
        if identifier.lower() in lowered:
            failures.append(
                f"internal site identifier {identifier!r} reaches the PDF text (C7)"
            )

    for signature in MOJIBAKE:
        if signature in text:
            failures.append(
                f"mojibake signature U+{ord(signature):04X} reaches the PDF text"
            )

    for match in FIRST_CLAIM.finditer(text):
        failures.append(
            f"priority claim {match.group(0)!r} reaches the PDF text (X6). The permitted "
            'form is "To our knowledge, no independent reprocessing of the Project\'s '
            'sensor data has been published."'
        )

    if final and "PENDING" in text:
        failures.append("the literal PENDING reaches a final PDF")

    if failures:
        raise AuditError("; ".join(failures))

    held: list[str] = []
    for sentence in SENTENCE_SPLIT.split(text):
        low = sentence.lower()
        hits = [verb for verb in X8_VERBS if verb in low]
        if hits:
            held.append(f"[{', '.join(hits)}] {sentence.strip()}")
    return held


def set_metadata(pdf: Path, fm: dict) -> None:
    """Write Info and XMP, and assert the file is tagged."""
    import pikepdf

    keywords = ", ".join(
        [
            "gene-environment interaction",
            "Loudoun County",
            "PM2.5",
            "low-cost sensor",
            "collocation",
            "GWAS ancestry composition",
            "population-level",
        ]
    )
    subject = (
        "Atlas scope, methods, and an independent reprocessing of Virginia DEQ Data "
        "Center Air Monitoring Project sensor data for Loudoun County, Virginia. "
        f"Version {fm['version']}. {fm['status']}. Population-level only; not medical "
        "advice and not a diagnostic tool."
    )

    with pikepdf.open(pdf, allow_overwriting_input=True) as doc:
        mark_info = doc.Root.get("/MarkInfo")
        marked = bool(mark_info is not None and mark_info.get("/Marked"))
        if not marked:
            raise AuditError(
                "the PDF is not tagged (/MarkInfo /Marked is absent or false). The "
                "structure tags are what make it navigable by assistive technology; "
                "rebuild with tagged: true rather than shipping it untagged."
            )

        with doc.open_metadata(set_pikepdf_as_editor=False) as meta:
            meta["dc:title"] = fm["title"]
            meta["dc:creator"] = [fm["author"]["name"]]
            meta["dc:description"] = subject
            meta["dc:language"] = ["en-US"]
            meta["dc:rights"] = f"{fm['license']} ({fm['licenseUrl']})"
            meta["pdf:Keywords"] = keywords
            meta["xmp:CreatorTool"] = "GENARCH report build"

        doc.docinfo["/Title"] = fm["title"]
        doc.docinfo["/Author"] = fm["author"]["name"]
        doc.docinfo["/Subject"] = subject
        doc.docinfo["/Keywords"] = keywords
        doc.Root["/Lang"] = pikepdf.String("en-US")
        doc.save()


def write_checksums(pdf: Path) -> tuple[str, str]:
    sha = sha256_of(pdf)
    md5 = md5_of(pdf)
    pdf.with_suffix(pdf.suffix + ".sha256").write_text(
        f"{sha}  {pdf.name}\n", encoding="utf-8", newline="\n"
    )
    pdf.with_suffix(pdf.suffix + ".md5").write_text(
        f"{md5}  {pdf.name}\n", encoding="utf-8", newline="\n"
    )
    return sha, md5


def build_tables_zip(pdf: Path, year: str, version: str) -> Path:
    """The twelve report tables as one archive, built deterministically.

    Fixed member timestamps and sorted names, so two runs over the same tables produce
    the same bytes. An archive whose hash moved every build could not be checksummed
    beside the PDF, which is the only reason to ship it next to one.
    """
    source = REPORTS_DATA / year
    members = sorted(
        p for p in source.glob("T*.csv") if re.match(r"^T\d\d", p.name)
    )
    if not members:
        raise AuditError(f"no table CSVs found under {source}")
    target = pdf.parent / f"GENARCH_Annual_Report_{year}_v{version}_tables.zip"
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for member in members:
            info = zipfile.ZipInfo(member.name, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, member.read_bytes())
    return target


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path)
    parser.add_argument(
        "--final",
        action="store_true",
        help="treat this as a published artifact: no pending identifier may remain",
    )
    parser.add_argument(
        "--year", default=None, help="report year; read from the filename by default"
    )
    args = parser.parse_args(argv)

    pdf: Path = args.pdf
    if not pdf.exists():
        print(f"no such file: {pdf}", file=sys.stderr)
        return 1

    year = args.year or year_from_pdf(pdf)
    fm = load_frontmatter(year)

    try:
        set_metadata(pdf, fm)
        print("metadata written; /MarkInfo /Marked is true")

        text = extract_text(pdf)
        print(f"extracted {len(text):,} characters of text")

        held = audit(text, year, fm, args.final)
    except AuditError as err:
        print(f"FAIL: {err}", file=sys.stderr)
        return 1

    sha, md5 = write_checksums(pdf)
    print(f"sha256 {sha}")
    print(f"md5    {md5}")

    archive = build_tables_zip(pdf, year, fm["version"])
    print(f"tables archive {archive.name} ({archive.stat().st_size:,} bytes)")

    if held:
        print()
        print(f"{len(held)} sentence(s) contain a CONTEXT X8 verb. Held for review, not")
        print("failed on: the verbs have legitimate uses in reporting what a cited paper")
        print("found, or in denying a claim. Read each one.")
        for sentence in held:
            print(f"  - {sentence}")
    else:
        print()
        print("no sentence contains a CONTEXT X8 verb")

    print()
    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
