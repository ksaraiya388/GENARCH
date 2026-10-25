"""Fail if any git-tracked text file contains mojibake or a leading BOM.

Scans every file from ``git ls-files`` and skips binaries by extension and by
a null-byte check. Prints ``file:line:snippet`` for each hit and exits 1 if
any are found. Patterns are written as escapes so this file never matches
itself, and any file that states them is expected to do the same.

Box-drawing characters are legitimate in directory trees and ASCII tables, so
they are read by signature rather than by character (``DECISIONS.md`` D22):

  R-a  U+251C followed by a character that is neither whitespace nor
       box-drawing (U+2500-U+257F).
  R-b  any block element (U+2580-U+259F).
  R-c  a box-drawing character other than U+2500 and U+2502 immediately
       adjacent, on either side, to an ASCII letter or digit.
  R-d  U+252C followed by anything other than U+2500 or whitespace.
  R-e  U+00CE or U+00CF followed by a character in U+0080-U+00BF or
       U+0152-U+2122, the cp1252 high range.
  R-f  U+00E2 followed by a character in that same cp1252 high range.

A tree or table keeps box-drawing characters next to each other and to
whitespace. A cp437 round trip of double-encoded UTF-8 puts them against
letters and digits, and pulls in block elements that no tree draws.

R-f replaces an earlier literal pair, U+00E2 U+20AC, which caught only
the sequences whose second byte was 0x80. U+00E2 is the lead byte of a
three-byte UTF-8 sequence read as cp1252, and the second byte ranges
over 0x80-0xBF, so the euro sign is one case of twenty-seven. The pair
missed U+2264, U+2265 and U+2192, which arrive as U+00E2 U+2030 U+00A4,
U+00E2 U+2030 U+00A5 and U+00E2 U+2020 U+2019; one of those survived in
`data/graph/graph.json` with the checker reporting a clean run. A real
a-circumflex is followed by ordinary text, as in chateau, so the second
character carries the signal here too.

R-e reads the lead byte of a two-byte UTF-8 sequence decoded as cp1252.
Greek and Coptic double-encode that way: U+03BA arrives as U+00CE U+00BA,
U+03B1 as U+00CE U+00B1, U+03C0 as U+00CF U+20AC. A real I-circumflex or
I-diaeresis is followed by ordinary text, so the second character is what
separates the two. The three literal patterns above miss this class: a
`graph.json` pathway label read `NF-` U+00CE U+00BA `B` and passed.

U+2500 and U+2502 are out of R-c because a drawing does place them against
text: a cell whose label exactly fills its width ends in a letter against the
closing bar (the pipeline diagram in ``docs/METHODS.md``). R-d covers what
that exclusion would otherwise let through, since a drawing only ever follows
U+252C with U+2500.

Raw source data under ``pipeline/sources/`` is skipped: those files are DEQ's
bytes, hash-pinned in ``manifest.json``, and the readers that consume them
already strip BOMs. Their hits are reported as ``INFO`` and never fail the
run. There is no allowlist and no per-file exemption.

A single line may carry the marker ``mojibake-doc`` when it intentionally
documents the corruption itself, and the checker skips that line. The marker
is per line, never per file; corrupted content is repaired rather than marked
(``docs/report-2026/DECISIONS.md`` D14).

Usage::

    python scripts/check_mojibake.py
    python scripts/check_mojibake.py --selftest
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# Double-encoded UTF-8 (read as cp1252/latin-1), plus the three box-drawing
# signatures a drawing does not produce. Written as escapes, so this file
# never matches itself.
PATTERNS = [
    re.compile(r"\u00c3"),        # A-tilde
    re.compile(r"\u00c2"),        # A-circumflex
    # R-f. a-circumflex followed by the cp1252 high range: the lead
    # byte of a three-byte UTF-8 sequence (general punctuation, arrows,
    # mathematical operators) read as cp1252. The range covers every
    # cp1252 reading of a 0x80-0xBF continuation byte.
    re.compile(r"\u00e2[\u0080-\u00bf\u0152-\u2122]"),
    # R-a. Light vertical and right, followed by a character that is neither
    # whitespace nor box-drawing. End of line never matches: the following
    # character has to exist.
    re.compile(r"\u251c[^\s\u2500-\u257f]"),
    # R-b. Any block element. Trees and tables draw with box-drawing
    # characters; shades and half blocks arrive from a cp437 round trip.
    re.compile(r"[\u2580-\u259f]"),
    # R-c. A box-drawing character other than U+2500 and U+2502 touching an
    # ASCII letter or digit on either side.
    re.compile(r"[\u2501\u2503-\u257f][A-Za-z0-9]|[A-Za-z0-9][\u2501\u2503-\u257f]"),
    # R-d. Light down and horizontal followed by anything but a horizontal
    # or whitespace. Catches a space-separated cp437 run that R-c now lets
    # past; in a drawing U+252C is always followed by U+2500.
    re.compile(r"\u252c[^\u2500\s]"),
    # R-e. I-circumflex or I-diaeresis followed by the cp1252 high
    # range, which is the lead byte of a Greek or Coptic character
    # double-encoded through cp1252. Written as escapes, so this file
    # never matches itself.
    re.compile(r"[\u00ce\u00cf][\u0080-\u00bf\u0152-\u2122]"),
]
BOM = "\ufeff"

# Line marker for a line that intentionally documents the corruption itself.
# Scanned lines carrying it are skipped. Never used to silence real mojibake.
DOC_MARKER = "mojibake-doc"

# Raw source data: scanned and reported, never counted against the gate.
INFO_ONLY_PREFIXES = ("pipeline/sources/",)

BINARY_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp", ".tif", ".tiff",
    ".avif", ".pdf", ".xls", ".xlsx", ".docx", ".pptx", ".zip", ".gz", ".tgz",
    ".bz2", ".xz", ".7z", ".woff", ".woff2", ".ttf", ".otf", ".eot", ".mp3",
    ".mp4", ".mov", ".webm", ".wav", ".pyc", ".so", ".dll", ".exe", ".bin",
    ".parquet", ".feather", ".sqlite", ".db", ".pkl", ".npy", ".npz",
}

SNIPPET_CHARS = 80


def tracked_files() -> list[Path]:
    out = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
    ).stdout
    return [REPO_ROOT / p for p in out.decode("utf-8").split("\0") if p]


def snippet(line: str, col: int) -> str:
    start = max(0, col - SNIPPET_CHARS // 2)
    text = line[start:start + SNIPPET_CHARS].strip()
    return text.encode("unicode_escape").decode("ascii") if not text.isprintable() else text


def scan_text(text: str) -> list[tuple[int, str]]:
    hits: list[tuple[int, str]] = []
    if text.startswith(BOM):
        hits.append((1, "leading U+FEFF (BOM)"))
        text = text[1:]
    for lineno, line in enumerate(text.splitlines(), start=1):
        if DOC_MARKER in line:
            continue
        cols = [m.start() for m in (p.search(line) for p in PATTERNS) if m]
        if cols:
            hits.append((lineno, snippet(line, min(cols))))
    return hits


def scan(path: Path) -> list[tuple[int, str]]:
    if path.suffix.lower() in BINARY_EXTENSIONS or not path.is_file():
        return []
    data = path.read_bytes()
    if b"\0" in data:
        return []
    return scan_text(data.decode("utf-8", errors="replace"))


# Self-tests. Every string is written as escapes for the same reason the
# patterns are. MUST_FLAG is real double-encoded UTF-8; MUST_PASS is drawing.
MUST_FLAG = [
    ("mojibake micro sign and superscript three",
     "\u251c\u00e9\u252c\u2561g/m\u251c\u00e9\u252c\u2502"),
    ("mojibake superscript two", "R\u251c\u00e9\u252c\u2593"),
    ("a-circumflex plus euro sign", "0.08\u00e2\u20ac\"0.15"),
    ("A-tilde plus copyright sign", "\u00c3\u00a9"),
    ("leading BOM", "\ufeffplain ascii line\n"),
    ("cp437 micro sign, bare", "\u252c\u2561g/m\u252c\u2502"),
    ("cp437 superscript two in prose", "R\u252c\u2593 to 0.549"),
    ("cp437 micro sign after a number", "2.12 \u252c\u2561g/m\u252c\u2502"),
    ("cp437 degree sign", "25 \u252c\u2591C"),
    ("cp437 micro sign in a unit field",
     "unit: \"\u252c\u2561g/m\u252c\u2502\""),
    ("cp437 superscript three, space separated", "10 \u252c\u2502"),
    ("cp437 middle dot, space separated", "a \u252c\u2556 b"),
    ("cp437 BOM at the head of a diff line",
     "+\u2229\u2557\u2510import Link"),
    ("R-e kappa in a pathway label", "NF-\u00ce\u00baB"),
    ("R-e alpha, bare", "\u00ce\u00b1"),
    ("R-e pi, second character in the cp1252 high range", "\u00cf\u20ac"),
    ("R-f less-than or equal to", "\u00e2\u2030\u00a42.5"),
    ("R-f greater-than or equal to", "\u00e2\u2030\u00a5"),
    ("R-f rightwards arrow", "\u00e2\u2020\u2019"),
    ("R-f en dash in a range", "0.08\u00e2\u20ac\u201c0.15"),
]
MUST_PASS = [
    ("tree branch", "\u251c\u2500\u2500 src/"),
    ("tree continuation", "\u2502   \u2514\u2500\u2500 page.tsx"),
    ("table top border", "\u250c\u2500\u2500\u252c\u2500\u2500\u2510"),
    ("table row separator", "\u251c\u2500\u253c\u2500\u2524"),
    ("table data row", "\u2502 376  \u2502 text \u2502"),
    ("tree leaf with a path",
     "\u251c\u2500 site/src/app/community/page.tsx"),
    ("tree last leaf", "\u2514\u2500\u2500 page.tsx"),
    ("pipeline diagram row, tight cell",
     "\u2502 Ingest  \u2502 \u2192 \u2502 Normalize \u2502 \u2192 \u2502 "
     "Annotate \u2502 \u2192 \u2502 Score \u2502 \u2192 \u2502 Emit \u2502 "
     "\u2192 \u2502 Validate\u2502 \u2192 \u2502 Package \u2502"),
    ("tee in a horizontal rule", "\u2500\u252c\u2500"),
    ("I-circumflex before lowercase text", "\u00cele"),
    ("I-diaeresis before lowercase text", "\u00cfndex"),
    ("a-circumflex in a French word", "ch\u00e2teau"),
    ("a-circumflex opening a French word", "\u00e2ge"),
]


def selftest() -> int:
    failures = 0
    for want_hit, cases in ((True, MUST_FLAG), (False, MUST_PASS)):
        for name, text in cases:
            hits = scan_text(text)
            ok = bool(hits) is want_hit
            failures += not ok
            expect = "FLAG" if want_hit else "PASS"
            got = "FLAG" if hits else "PASS"
            mark = "ok  " if ok else "FAIL"
            detail = f"  {hits}" if hits else ""
            print(f"{mark} expect {expect} got {got}  {name}{detail}")
    print()
    if failures:
        print(f"SELFTEST FAIL: {failures} of "
              f"{len(MUST_FLAG) + len(MUST_PASS)} case(s)", file=sys.stderr)
        return 1
    print(f"SELFTEST OK: {len(MUST_FLAG) + len(MUST_PASS)} case(s)")
    return 0


def main() -> int:
    if "--selftest" in sys.argv[1:]:
        return selftest()
    total = 0
    files_hit = 0
    info_total = 0
    info_files = 0
    for path in tracked_files():
        hits = scan(path)
        if not hits:
            continue
        rel = path.relative_to(REPO_ROOT).as_posix()
        if rel.startswith(INFO_ONLY_PREFIXES):
            info_files += 1
            for lineno, text in hits:
                info_total += 1
                print(f"INFO {rel}:{lineno}:{text}")
            continue
        files_hit += 1
        for lineno, text in hits:
            total += 1
            print(f"{rel}:{lineno}:{text}")
    if info_total:
        print(
            f"\nINFO: {info_total} hit(s) in {info_files} raw source file(s) under "
            f"{', '.join(INFO_ONLY_PREFIXES)}; not counted"
        )
    if total:
        print(f"\nFAIL: {total} hit(s) in {files_hit} file(s)", file=sys.stderr)
        return 1
    print("OK: no mojibake or leading BOM in tracked text files")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
    sys.exit(main())
