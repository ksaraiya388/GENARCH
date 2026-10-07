#!/usr/bin/env python3
"""Verify every DOI in the cross-ancestry bibliography against Crossref.

For each entry in ``pipeline/sources/cross_ancestry/literature.json`` this script:

1. fetches ``https://api.crossref.org/works/{doi}``;
2. requires a normalised title match against the recorded ``title``;
3. writes the ``verified`` block (crossref_title, year, journal, first_author,
   checked_at);
4. exits 1 on any mismatch or 404.

Normalisation is deliberately narrow: case folding, HTML entity decoding,
collapsing whitespace, and stripping punctuation. It does NOT do fuzzy
matching. A title that differs in wording is a different record, and the fix is
to correct the recorded title or delete the entry -- never to loosen the
comparison until it passes. Privé et al. 2022 is the worked example: the
candidate list said "applied to 9 ancestry groups IN the same cohort" and
Crossref says "FROM the same cohort". That is a one-word difference and this
script is required to catch it.

An entry that fails verification is DELETED, not patched by guessing. A record
whose title cannot be confirmed cannot support a claim on the site.

Usage:
    python scripts/verify_dois.py              # verify and write back
    python scripts/verify_dois.py --check      # verify without writing
"""

from __future__ import annotations

import argparse
import datetime
import html
import json
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIT_PATH = ROOT / "pipeline" / "sources" / "cross_ancestry" / "literature.json"
BIB_PATH = ROOT / "docs" / "cross-ancestry" / "cross_ancestry.bib"

UA = {"User-Agent": "GENARCH/1.0 (https://genarch.org; mailto:kiaansaraiya@gmail.com)"}
TIMEOUT = 60
CROSSREF = "https://api.crossref.org/works/"


def normalise(title: str) -> str:
    """Case-fold, decode entities, drop punctuation, collapse whitespace."""
    t = html.unescape(title)
    # Crossref returns some titles with LaTeX-ish or typographic variants of the
    # same character; NFKD folds those onto their ASCII base before comparison.
    t = unicodedata.normalize("NFKD", t)
    t = t.replace(" ", " ").replace(" ", " ")
    t = t.lower()
    t = re.sub(r"[^a-z0-9]+", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def fetch_crossref(doi: str) -> dict:
    url = CROSSREF + urllib.parse.quote(doi, safe="")
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=TIMEOUT) as fh:
        return json.loads(fh.read().decode("utf-8"))["message"]


def first_author(msg: dict) -> str | None:
    for a in msg.get("author") or []:
        if a.get("family"):
            given = a.get("given") or ""
            return f"{a['family']}, {given}".strip().rstrip(",")
        if a.get("name"):
            return a["name"]
    return None


def pub_year(msg: dict) -> int | None:
    for key in ("published", "published-print", "published-online", "issued"):
        parts = (msg.get(key) or {}).get("date-parts") or []
        if parts and parts[0] and parts[0][0]:
            return int(parts[0][0])
    return None


def _bib_escape(value: str) -> str:
    """Brace-protect BibTeX specials. Titles keep their own capitalisation."""
    for ch in "&%$#_":
        value = value.replace(ch, "\\" + ch)
    return value


def write_bib(entries: list[dict]) -> None:
    """Emit a .bib of the verified records so AURORA can import the same set.

    Written from the ``verified`` blocks only, so an entry that has not passed
    Crossref verification cannot reach the bibliography. GENARCH does not copy
    this file into the AURORA repository; AURORA is read-only from here.
    """
    lines = [
        "% GENARCH cross-ancestry bibliography.",
        "% GENERATED FILE -- do not edit by hand.",
        "% Source: pipeline/sources/cross_ancestry/literature.json",
        "% Regenerate: python scripts/verify_dois.py",
        "%",
        "% Every record below passed DOI and title verification against Crossref.",
        "% Fields are taken from the Crossref record, not from a reading list.",
        "",
    ]
    for entry in sorted(entries, key=lambda e: e["id"]):
        v = entry.get("verified") or {}
        kind = "book" if not v.get("journal") else "article"
        lines.append(f"@{kind}{{{entry['id']},")
        lines.append(f"  title   = {{{{{_bib_escape(v.get('crossref_title', ''))}}}}},")
        if v.get("first_author"):
            lines.append(f"  author  = {{{_bib_escape(v['first_author'])} and others}},")
        if v.get("year"):
            lines.append(f"  year    = {{{v['year']}}},")
        if v.get("journal"):
            lines.append(f"  journal = {{{_bib_escape(v['journal'])}}},")
        lines.append(f"  doi     = {{{entry['doi']}}},")
        lines.append(f"  note    = {{verified against Crossref {v.get('checked_at', '')}}},")
        lines.append("}")
        lines.append("")

    BIB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(BIB_PATH, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(lines))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--check",
        action="store_true",
        help="verify only; do not write the verified blocks back",
    )
    args = ap.parse_args()

    if not LIT_PATH.exists():
        print(f"ERROR: {LIT_PATH} does not exist", file=sys.stderr)
        return 1

    entries = json.loads(LIT_PATH.read_text(encoding="utf-8"))
    if not isinstance(entries, list) or not entries:
        print("ERROR: literature.json must be a non-empty list", file=sys.stderr)
        return 1

    failures: list[str] = []
    seen_ids: set[str] = set()
    seen_dois: set[str] = set()

    for entry in entries:
        eid = entry.get("id", "<no id>")
        doi = (entry.get("doi") or "").strip()
        recorded = entry.get("title")

        if eid in seen_ids:
            failures.append(f"{eid}: duplicate id")
        seen_ids.add(eid)
        if doi.lower() in seen_dois:
            failures.append(f"{eid}: duplicate doi {doi}")
        seen_dois.add(doi.lower())

        if not doi:
            failures.append(f"{eid}: no doi recorded")
            continue
        if not recorded:
            failures.append(f"{eid}: no title recorded to match against")
            continue

        try:
            msg = fetch_crossref(doi)
        except urllib.error.HTTPError as exc:
            failures.append(f"{eid}: Crossref HTTP {exc.code} for {doi}")
            print(f"  FAIL {eid:<22} HTTP {exc.code}  {doi}")
            continue
        except Exception as exc:  # noqa: BLE001 - network failure is a failure
            failures.append(f"{eid}: Crossref fetch failed for {doi}: {exc!r}")
            print(f"  FAIL {eid:<22} fetch error  {doi}")
            continue

        titles = msg.get("title") or []
        cr_title = titles[0] if titles else ""
        if not cr_title:
            failures.append(f"{eid}: Crossref returned no title for {doi}")
            print(f"  FAIL {eid:<22} no Crossref title")
            continue

        if normalise(cr_title) != normalise(recorded):
            failures.append(
                f"{eid}: title mismatch for {doi}\n"
                f"       recorded: {recorded}\n"
                f"       crossref: {cr_title}"
            )
            print(f"  FAIL {eid:<22} title mismatch")
            continue

        journal = (msg.get("container-title") or [None])[0]
        entry["verified"] = {
            # Crossref returns some fields HTML-escaped ("Lancet Diabetes &amp;
            # Endocrinology"). Store the decoded form: these strings are read by
            # humans and copied into reference records.
            "crossref_title": html.unescape(cr_title),
            "year": pub_year(msg),
            "journal": html.unescape(journal) if journal else None,
            "first_author": first_author(msg),
            "checked_at": datetime.date.today().isoformat(),
        }
        print(f"  ok   {eid:<22} {doi}")
        time.sleep(0.25)

    if failures:
        print(
            f"\n{len(failures)} verification failure(s):\n- " + "\n- ".join(failures),
            file=sys.stderr,
        )
        print(
            "\nAn entry that fails is deleted from literature.json, not patched "
            "by guessing.",
            file=sys.stderr,
        )
        return 1

    if not args.check:
        with open(LIT_PATH, "w", encoding="utf-8", newline="\n") as fh:
            json.dump(entries, fh, indent=2, ensure_ascii=False)
            fh.write("\n")
        write_bib(entries)
        print(
            f"\nVerified {len(entries)} entries; wrote {LIT_PATH.name} and "
            f"{BIB_PATH.name}"
        )
    else:
        print(f"\nVerified {len(entries)} entries (--check: nothing written)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
