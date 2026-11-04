"""Checks on the report's authored source.

The report body is TSX under `site/src/content/reports/<year>/`. Three kinds of thing
can go wrong there that no other gate catches.

A number can be typed by hand. `docs/report-2026/CONTEXT.md` section 8 requires every
number in report prose to come from the generator through the `<N>` component, so that
a value cannot drift from the freeze it was computed at. A hand-typed decimal defeats
that silently: it renders perfectly and is simply wrong the next time the data move.

A reference can dangle. The components throw on an unknown key at build time, which is
the real gate, but a test that names the offending file and line is faster to act on
than a stack trace from a Next.js build worker, and it runs without `node_modules`.

A required statement can go missing. Several sentences in this report are required
verbatim -- the one permitted form of the priority claim, the statement that no
cross-ancestry effect estimates are computed, the two roadmap items the scope decisions
settled. They are easy to lose in an edit and impossible to notice by reading.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
YEAR = "2026"
CONTENT_DIR = REPO_ROOT / "site" / "src" / "content" / "reports" / YEAR
REPORT_DATA = REPO_ROOT / "data" / "reports" / YEAR
SITE_CODES = REPO_ROOT / "pipeline" / "lookups" / "site_codes.json"

# "PM2.5" and "PM10" are the names of pollutants, not measurements of anything, and
# they appear in nearly every paragraph. Nothing else is exempt: a decimal in report
# prose has to come from the registry.
NAME_TOKENS = ("PM2.5", "PM10")

DECIMAL = re.compile(r"\d+\.\d+")


def prose_files() -> list[Path]:
    return sorted(CONTENT_DIR.glob("*.tsx"))


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def strip_comments(source: str) -> str:
    """Remove JSX comments, block comments and line comments."""
    source = re.sub(r"\{\s*/\*.*?\*/\s*\}", " ", source, flags=re.DOTALL)
    source = re.sub(r"/\*.*?\*/", " ", source, flags=re.DOTALL)
    source = re.sub(r"(?m)^\s*//.*$", " ", source)
    return source


def strip_braced(source: str) -> str:
    """Remove every balanced `{...}` group: those are code, not prose.

    This covers both JSX expression containers in the body and attribute values
    written as expressions. `{" "}`, which is how a line break inside JSX keeps the
    space between two words, goes with them.
    """
    out: list[str] = []
    depth = 0
    for char in source:
        if char == "{":
            depth += 1
            continue
        if char == "}":
            depth = max(0, depth - 1)
            out.append(" ")
            continue
        if depth == 0:
            out.append(char)
    return "".join(out)


def jsx_text(source: str) -> str:
    """The literal text a reader sees, with markup, code and comments removed.

    Tags go first, which takes every attribute with them, so a key, an id or a
    `number={3}` cannot be mistaken for prose. `<N>` and `<Cite>` disappear the same
    way, which is what makes the decimal rule checkable: whatever decimal is left is
    one somebody typed into a sentence.
    """
    source = strip_comments(source)
    source = strip_braced(source)
    source = re.sub(r"<[^<>]*>", " ", source)
    return source


@pytest.mark.parametrize("path", prose_files(), ids=lambda p: p.name)
def test_no_hand_typed_decimal_in_report_prose(path: Path) -> None:
    text = jsx_text(read(path))
    for token in NAME_TOKENS:
        text = text.replace(token, " ")
    hits = DECIMAL.findall(text)
    assert hits == [], (
        f"{path.name} carries hand-typed decimal(s) {sorted(set(hits))} in its prose. "
        "Every number in report prose comes from the generator through <N> "
        "(CONTEXT.md section 8). Add a key in pipeline/report.py if one is missing."
    )


def registry_keys() -> set[str]:
    keys = set(json.loads((REPORT_DATA / "numbers.json").read_text(encoding="utf-8")))
    for name in ("inventory.json", "chain.json"):
        doc = json.loads((REPORT_DATA / name).read_text(encoding="utf-8"))
        keys |= set(doc["keys"])
    return keys


def used(pattern: str) -> dict[str, list[str]]:
    """Every value of one component attribute, by the file that uses it."""
    found: dict[str, list[str]] = {}
    for path in prose_files():
        hits = re.findall(pattern, strip_comments(read(path)))
        if hits:
            found[path.name] = hits
    return found


def test_every_number_key_in_the_prose_resolves() -> None:
    known = registry_keys()
    missing = {
        name: sorted({k for k in keys if k not in known})
        for name, keys in used(r'<N\s+k="([^"]+)"').items()
    }
    missing = {name: keys for name, keys in missing.items() if keys}
    assert missing == {}, f"unresolvable number keys: {missing}"


def test_the_prose_cites_a_broad_spread_of_the_registry() -> None:
    """A guard against the body quietly losing its numbers in an edit.

    Not a coverage target. If this count collapses, numbers have been replaced by
    prose somewhere, which is the failure CONTEXT.md section 8 exists to prevent and
    which no other check here would notice.
    """
    keys = {k for keys in used(r'<N\s+k="([^"]+)"').values() for k in keys}
    assert len(keys) >= 60, f"report prose cites only {len(keys)} distinct number keys"


def test_every_table_and_figure_in_the_prose_resolves() -> None:
    tables = json.loads((REPORT_DATA / "tables.json").read_text(encoding="utf-8"))
    ids = {t["id"] for t in tables["tables"]}
    for name in ("inventory.json", "chain.json"):
        doc = json.loads((REPORT_DATA / name).read_text(encoding="utf-8"))
        ids.add(doc["table"]["id"])
    figures = json.loads((REPORT_DATA / "figures.json").read_text(encoding="utf-8"))
    ids |= {f["id"] for f in figures["figures"]}
    short = {i.split("_")[0] for i in ids}

    for pattern in (r'<ReportTable\s+id="([^"]+)"', r'<ReportFigure\s+id="([^"]+)"'):
        for name, hits in used(pattern).items():
            for hit in hits:
                assert hit in ids or hit in short, f"{name} names unknown artifact {hit!r}"

    for name, hits in used(r'tableId="([^"]+)"').items():
        for hit in hits:
            assert hit in ids or hit in short, f"{name} names unknown table {hit!r}"


def references_doc() -> dict:
    return json.loads((CONTENT_DIR / "references.json").read_text(encoding="utf-8"))


def test_every_citation_in_the_prose_resolves() -> None:
    doc = references_doc()
    known = {e["id"] for e in doc["references"]} | {e["id"] for e in doc["sources"]}
    for name, hits in used(r'<Cite\s+id="([^"]+)"').items():
        for hit in hits:
            assert hit in known, f"{name} cites unknown reference {hit!r}"


def test_every_literature_reference_carries_a_verified_doi() -> None:
    for entry in references_doc()["references"]:
        doi = entry.get("doi", "")
        assert re.match(r"^10\.\d{4,9}/\S+$", doi), f"{entry['id']} has no usable DOI"
        verification = entry.get("verification") or {}
        assert verification.get("method"), f"{entry['id']} records no verification method"
        assert verification.get("source"), f"{entry['id']} records no verification source"


def test_every_source_entry_carries_all_five_required_fields() -> None:
    doc = references_doc()
    required = doc["required_source_fields"]
    assert required == ["publisher", "title", "edition_date", "url", "retrieved"]
    for entry in doc["sources"]:
        missing = [field for field in required if not entry.get(field)]
        assert missing == [], f"source {entry['id']} is missing {missing}"
        assert entry["url"].startswith("http"), f"source {entry['id']} has no usable URL"


def test_no_internal_site_identifier_reaches_the_report_prose() -> None:
    # Full slugs only, plus the regulatory monitor's own slug. The leading segment of
    # a slug is an ordinary place word that is also part of the name DEQ publishes for
    # that location, and the site key is allowed to carry those names because it
    # carries no reading value (CONTEXT.md C8).
    sites = json.loads(SITE_CODES.read_text(encoding="utf-8"))["sites"]
    identifiers = {s["site_id"] for s in sites} | {"ashburn"}
    for path in prose_files():
        lowered = read(path).lower()
        for identifier in sorted(identifiers):
            assert identifier.lower() not in lowered, (
                f"{path.name} names internal site identifier {identifier!r}; "
                "public output uses the neutral site code (CONTEXT.md C7)"
            )


def test_the_prose_makes_no_priority_claim() -> None:
    banned = re.compile(r"\bfirst (outside|independent|to)\b", re.IGNORECASE)
    for path in prose_files():
        hit = banned.search(jsx_text(read(path)))
        assert hit is None, (
            f"{path.name} makes a priority claim, {hit.group(0)!r} (CONTEXT.md X6). The "
            "permitted form is the one in the related-work subsection."
        )


def test_the_collocation_section_avoids_the_word_the_rules_bar() -> None:
    """GENARCH_RULES section 9 bars describing the reproduction as exact.

    DEQ publishes two significant figures, so the only supportable claim is that the
    recomputed values round to DEQ's at DEQ's own precision. The word invites the
    stronger reading, and "exactly" invites it just as much, so neither appears.
    """
    text = read(CONTENT_DIR / "s5-dca.tsx").lower()
    assert "exact" not in text, (
        "s5-dca.tsx uses a form of 'exact' about the collocation reproduction. "
        "Agreement to three decimals is not verifiable against the source."
    )


REQUIRED_SENTENCES = {
    "s6-ancestry.tsx": [
        "No cross-ancestry gene-environment effect estimates are reported in this",
        "The discovery total is a sum of study sample sizes, not a count of distinct",
        "does not say, and must not be read to say, that the locus is absent, inactive",
        "This is not a correction of the page.",
    ],
    "s8-roadmap.tsx": [
        "Prince William County sites (deployed 2026-09-17 and 2026-10-22) are "
        "outside v1 scope (D5); scope decision for v2.",
        "Page/report alignment: denominator labelling on /ancestry-equity and ACS "
        "release alignment (2023 vs 2024).",
    ],
    "s5-dca.tsx": [
        "To our knowledge, no independent reprocessing of the Project",
        "ranks fourth",
    ],
    "summary.tsx": [
        "Nothing here establishes that any exposure brought about any health outcome",
    ],
}


def flatten(value: str) -> str:
    """Collapse every run of whitespace, so wrapping does not change a sentence.

    JSX wraps a sentence across lines with whatever indentation the formatter chooses.
    Matching the raw source would make these checks fail on a reflow, which says
    nothing about the wording and trains everyone to edit the test.
    """
    return re.sub(r"\s+", " ", value).strip()


@pytest.mark.parametrize("name,needles", sorted(REQUIRED_SENTENCES.items()))
def test_required_statements_are_present(name: str, needles: list[str]) -> None:
    text = flatten(read(CONTENT_DIR / name))
    for needle in needles:
        assert flatten(needle) in text, (
            f"{name} no longer carries the required wording: {needle!r}"
        )


def test_the_deq_limitation_block_appears_in_the_summary_and_the_limitations() -> None:
    for name in ("summary.tsx", "s7-limitations.tsx"):
        text = read(CONTENT_DIR / name)
        assert "<DeqLimitation" in text, (
            f"{name} does not render the DEQ limitation. It is required in the report "
            "summary and in every limitations box (CONTEXT.md section 3)."
        )


def test_the_roadmap_items_are_marked_for_review() -> None:
    """Every dated roadmap item carries a marker, because the dates are judgements."""
    text = read(CONTENT_DIR / "s8-roadmap.tsx")
    markers = re.findall(r"\{/\*\s*KIAAN", text)
    items = re.findall(r"<Item>", text)
    assert len(markers) == len(items), (
        f"{len(items)} roadmap item(s) but {len(markers)} review marker(s); each dated "
        "item needs one."
    )


def test_the_chain_description_says_where_each_evidence_class_comes_from() -> None:
    """Steps two to four are figure-definition classes, not atlas records.

    Required wherever the chain is described, because a reader meeting an evidence
    class beside every step will otherwise assume all five were curated alike.
    """
    for name in ("s3-methods.tsx", "s5-dca.tsx"):
        text = read(CONTENT_DIR / name)
        assert "figure definition" in text, (
            f"{name} describes the mechanism chain without saying that the middle "
            "classes are assigned by the figure definition rather than read from an "
            "atlas record."
        )

# --------------------------------------------------------------- prose style


PARAGRAPH = re.compile(r"<(P|Lead|Item)>(?P<body>.*?)</\1>", re.DOTALL)

# CONTEXT.md section 8. Significance inflation and the promotional register, plus the
# negative parallelism the style rules name explicitly.
INFLATION = (
    "groundbreaking",
    "critical",
    "pivotal",
    "landmark",
    "crucial",
    "vital",
    "essential",
    "not only",
    "seamless",
    "leverage",
    "delve",
    "testament to",
    "stands as",
)


@pytest.mark.parametrize("path", prose_files(), ids=lambda p: p.name)
def test_no_paragraph_uses_more_than_one_em_dash(path: Path) -> None:
    """At most one em dash per paragraph (CONTEXT.md section 8).

    A matched pair used parenthetically is two, which is the form this catches: the
    pair is almost always standing in for parentheses or a pair of commas, and the
    rule exists because a document full of them reads as one long aside.
    """
    source = strip_comments(read(path))
    for match in PARAGRAPH.finditer(source):
        text = re.sub(r"<[^<>]*>", " ", match.group("body"))
        count = text.count("\u2014")
        assert count <= 1, (
            f"{path.name}: a paragraph uses {count} em dashes. "
            f"First words: {flatten(text)[:70]!r}"
        )


@pytest.mark.parametrize("path", prose_files(), ids=lambda p: p.name)
def test_the_prose_avoids_significance_inflation(path: Path) -> None:
    text = jsx_text(read(path)).lower()
    hits = [word for word in INFLATION if word in text]
    assert hits == [], f"{path.name} uses {hits} (CONTEXT.md section 8)"
