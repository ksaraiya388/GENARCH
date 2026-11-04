#!/usr/bin/env python3
"""Generate docs/report-2026/REVIEW_NOTES.md from the report's own source.

    PYTHONUTF8=1 python scripts/gen_review_notes.py
    PYTHONUTF8=1 python scripts/gen_review_notes.py --check

One row per sentence of report prose, carrying the registry keys and the references
that sentence cites. The point is the column that is empty: a factual sentence with no
key and no citation is an assertion the report is making on its own authority, and
those are what a reviewer has to read. Generated rather than written by hand, because a
hand-written map of several hundred sentences is out of date the first time a paragraph
is edited, and a stale provenance map is worse than none.

What counts as a sentence needing support is a judgement this script does not make. It
marks a sentence as unsupported, and `docs/report-2026/REVIEW_NOTES.md` carries the
count; many are legitimately unsupported, because they are definitions, scope
statements, or statements about what the report does not do.
"""

from __future__ import annotations

import argparse
import html
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
CONTENT = REPO_ROOT / "site" / "src" / "content" / "reports" / "2026"
OUTPUT = REPO_ROOT / "docs" / "report-2026" / "REVIEW_NOTES.md"

# Document order. Mirrors SECTIONS in the content index; a file missing from here is
# reported rather than silently skipped.
ORDER = (
    "cover.tsx",
    "summary.tsx",
    "s1-scope.tsx",
    "s2-data.tsx",
    "s3-methods.tsx",
    "s4-inventory.tsx",
    "s5-dca.tsx",
    "s6-ancestry.tsx",
    "s7-limitations.tsx",
    "s8-roadmap.tsx",
    "appendices.tsx",
)

NUMBER = re.compile(r'<N\s+[^>]*?k="([^"]+)"[^>]*?/>')
CITE = re.compile(r'<Cite\s+id="([^"]+)"\s*/>')
TABLE = re.compile(r'<ReportTable\s+[^>]*?id="([^"]+)"')
FIGURE = re.compile(r'<ReportFigure\s+[^>]*?id="([^"]+)"')
HEADING = re.compile(
    r'<(Section|Sub)\s+(?:number="(?P<number>[^"]*)"\s+)?[^>]*?title="(?P<title>[^"]*)"',
    re.DOTALL,
)
KIAAN = re.compile(r"\{/\*\s*KIAAN:?(?P<body>.*?)\*/\}", re.DOTALL)
SENTENCE = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9(“\"])")


def strip_comments(source: str) -> str:
    source = re.sub(r"\{\s*/\*.*?\*/\s*\}", " ", source, flags=re.DOTALL)
    source = re.sub(r"/\*.*?\*/", " ", source, flags=re.DOTALL)
    return re.sub(r"(?m)^\s*//.*$", " ", source)


def flatten(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


# Markers are written with sentinels rather than braces, because the next step strips
# every remaining `{...}` as a JSX expression container and would otherwise remove the
# markers this function had just inserted. They are converted to braces at the end.
KEY_OPEN, KEY_CLOSE = "\x01", "\x02"


def readable(block: str) -> str:
    """One JSX block as the sentence a reader sees, with its sources marked inline."""
    block = NUMBER.sub(lambda m: KEY_OPEN + m.group(1) + KEY_CLOSE, block)
    block = CITE.sub(lambda m: "[" + m.group(1) + "]", block)
    block = re.sub(r'\{"\s*"\}', " ", block)
    block = re.sub(r"\{[^{}]*\}", " ", block)
    block = re.sub(r"<[^<>]*>", " ", block)
    block = flatten(html.unescape(block))
    return block.replace(KEY_OPEN, "{").replace(KEY_CLOSE, "}")


def parse(path: Path) -> list[dict]:
    """Headings, prose blocks and review markers, in source order."""
    source = path.read_text(encoding="utf-8")
    events: list[dict] = []

    for match in KIAAN.finditer(source):
        events.append(
            {"kind": "marker", "at": match.start(), "text": flatten(match.group("body"))}
        )

    body = strip_comments(source)
    for match in HEADING.finditer(body):
        events.append(
            {
                "kind": "heading",
                "at": match.start(),
                "level": match.group(1),
                "number": match.group("number") or "",
                "title": html.unescape(match.group("title")),
            }
        )
    for regex, kind in ((TABLE, "table"), (FIGURE, "figure")):
        for match in regex.finditer(body):
            events.append({"kind": kind, "at": match.start(), "id": match.group(1)})

    # Prose lives inside these elements. A sentence outside one of them is layout or
    # metadata, not a claim, so it is not inventoried.
    for tag in ("P", "Lead", "Item", "Term"):
        for match in re.finditer(
            rf"<{tag}(?:\s[^>]*)?>(?P<body>.*?)</{tag}>", body, flags=re.DOTALL
        ):
            text = readable(match.group("body"))
            if text:
                events.append({"kind": "prose", "at": match.start(), "text": text})

    events.sort(key=lambda e: e["at"])
    return events


def sentences_of(text: str) -> list[str]:
    parts = [flatten(part) for part in SENTENCE.split(text)]
    return [part for part in parts if part]


def render() -> tuple[str, dict]:
    lines: list[str] = []
    stats = {"sentences": 0, "supported": 0, "keys": set(), "cites": set(), "markers": 0}

    lines.append("# Annual Report 2026: review notes")
    lines.append("")
    lines.append(
        "Generated by `scripts/gen_review_notes.py` from the report source under "
        "`site/src/content/reports/2026/`. Do not edit by hand: regenerate it."
    )
    lines.append("")
    lines.append(
        "One row per sentence of report prose. **Sources** lists the `numbers.json`, "
        "`inventory.json` or `chain.json` keys the sentence renders through `<N>`, in "
        "braces, and the reference ids it cites through `<Cite>`, in brackets. A row "
        "with an empty **Sources** column is a sentence the report asserts without a "
        "keyed value or a citation behind it. Many of those are legitimate -- a "
        "definition, a scope statement, a statement about what the report does not do "
        "-- and the rest are what a reviewer needs to look at."
    )
    lines.append("")
    lines.append(
        "Every number in report prose is rendered from a key, so a sentence carrying a "
        "figure and no key in this table would be a hand-typed number, which "
        "`tests/test_report_source.py` fails on independently."
    )
    lines.append("")

    body: list[str] = []
    for name in ORDER:
        path = CONTENT / name
        if not path.exists():
            body.append(f"## MISSING: {name}")
            body.append("")
            continue
        body.append(f"## `{name}`")
        body.append("")
        for event in parse(path):
            kind = event["kind"]
            if kind == "heading":
                prefix = "###" if event["level"] == "Section" else "####"
                number = f"{event['number']} " if event["number"] else ""
                body.append("")
                body.append(f"{prefix} {number}{event['title']}")
                body.append("")
                body.append("| Sentence | Sources |")
                body.append("|---|---|")
                continue
            if kind == "marker":
                stats["markers"] += 1
                body.append(f"| _Review marker:_ {event['text']} | _author judgement_ |")
                continue
            if kind in ("table", "figure"):
                body.append(f"| _Renders {kind}_ `{event['id']}` | _generated artifact_ |")
                continue

            for sentence in sentences_of(event["text"]):
                keys = re.findall(r"\{([a-zA-Z0-9_.\-]+)\}", sentence)
                cites = re.findall(r"\[([a-zA-Z0-9_]+)\]", sentence)
                stats["sentences"] += 1
                stats["keys"].update(keys)
                stats["cites"].update(cites)
                sources = " ".join(
                    [f"`{{{k}}}`" for k in keys] + [f"`[{c}]`" for c in cites]
                )
                if sources:
                    stats["supported"] += 1
                clean = sentence.replace("|", "\\|")
                body.append(f"| {clean} | {sources} |")
        body.append("")

    unsupported = stats["sentences"] - stats["supported"]
    lines.append("## Totals")
    lines.append("")
    lines.append(f"- Sentences inventoried: **{stats['sentences']}**")
    lines.append(
        f"- Carrying at least one key or citation: **{stats['supported']}**; "
        f"carrying neither: **{unsupported}**"
    )
    lines.append(f"- Distinct registry keys cited: **{len(stats['keys'])}**")
    lines.append(f"- Distinct references cited: **{len(stats['cites'])}**")
    lines.append(f"- Review markers awaiting the author: **{stats['markers']}**")
    lines.append("")
    lines.extend(body)

    text = "\n".join(lines).rstrip("\n") + "\n"
    return text, stats


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="exit 1 if the committed file is not what this would write",
    )
    args = parser.parse_args(argv)

    text, stats = render()
    if args.check:
        current = OUTPUT.read_text(encoding="utf-8") if OUTPUT.exists() else ""
        if current != text:
            print(f"{OUTPUT.relative_to(REPO_ROOT)} is stale; regenerate it", file=sys.stderr)
            return 1
        print(f"{OUTPUT.relative_to(REPO_ROOT)} is current")
        return 0

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)
    print(
        f"{OUTPUT.relative_to(REPO_ROOT)}: {stats['sentences']} sentences, "
        f"{len(stats['keys'])} keys, {len(stats['cites'])} references, "
        f"{stats['markers']} review markers"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
