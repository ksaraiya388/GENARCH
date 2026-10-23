"""Task 1e: verbatim extracts from the frozen DEQ weekly PDFs.

Writes docs/report-2026/scratch/quotes_r2.json and prints the pages that carry
Table 4 and the only-site-above-35 sentence in each edition held in the repo.

Run from the repo root:  PYTHONUTF8=1 python docs/report-2026/scratch/quotes_r2.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pdfplumber

REPO = Path(__file__).resolve().parents[3]
OUT = Path(__file__).with_name("quotes_r2.json")

PDFS = [
    ("2026-08-07", REPO / "docs/deq-reports/2026-08-07_data_center_air_quality_analysis.pdf"),
    ("2026-08-14", REPO / "docs/deq-reports/2026-08-14_data_center_air_quality_analysis.pdf"),
    ("2026-08-21", REPO / "docs/deq-reports/2026-08-21_data_center_air_quality_analysis.pdf"),
    ("2026-08-28", REPO / "pipeline/sources/deq/deq_dcamp_weekly_2026-08-28.pdf"),
]

TABLE4 = re.compile(r"Table 4[:.]")
ONLY = re.compile(r"only (site|sensor)|is the only")
ABOVE35 = re.compile(r"98th percentile")


def main() -> int:
    result = {}
    for label, path in PDFS:
        if not path.exists():
            result[label] = {"error": "missing"}
            continue
        pages = []
        title = None
        with pdfplumber.open(path) as pdf:
            for i, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""
                if i == 1:
                    title = text
                if TABLE4.search(text) or (ONLY.search(text) and ABOVE35.search(text)):
                    pages.append({"page": i, "text": text})
        result[label] = {
            "source_path": path.relative_to(REPO).as_posix(),
            "page_1_text": title,
            "matched_pages": pages,
        }
        print(f"=== {label} ({path.name}) pages {[p['page'] for p in pages]} ===")
        print((title or "").strip()[:400])
        for p in pages:
            print(f"--- page {p['page']} ---")
            print(p["text"])
        print()
    with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
    sys.exit(main())
