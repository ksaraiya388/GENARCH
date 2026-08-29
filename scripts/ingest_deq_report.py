import hashlib
import json
import shutil
import sys
import unicodedata
from datetime import date
from pathlib import Path

import pdfplumber

MARKERS = [
    "data center",
    "pm2.5",
    "no2",
    "environmental quality",
    "collocation",
    "loudoun",
    "regulatory monitor",
    "hourly",
]
MIN_HITS = 5
MIN_PAGES = 5
MIN_TABLES = 5

src = Path(sys.argv[1])
report_date = sys.argv[2]
origin_url = sys.argv[3]
force = "--force" in sys.argv


def norm(s):
    return unicodedata.normalize("NFKC", s or "")


if not src.exists():
    raise SystemExit(f"missing source: {src}")

pages, tables = [], []
with pdfplumber.open(src) as pdf:
    for page_no, page in enumerate(pdf.pages, start=1):
        pages.append(f"===== PAGE {page_no} =====\n{norm(page.extract_text())}")
        for t_no, table in enumerate(page.extract_tables(), start=1):
            tables.append(
                {
                    "page": page_no,
                    "table_index": t_no,
                    "rows": [
                        [("" if c is None else norm(c).strip()) for c in row]
                        for row in table
                    ],
                }
            )

text = "\n\n".join(pages)
low = text.lower()
hits = [m for m in MARKERS if m in low]

print(f"pages={len(pages)} tables={len(tables)} chars={len(text)}")
print(f"markers ({len(hits)}/{len(MARKERS)}): {', '.join(hits) or 'NONE'}")

problems = []
if len(hits) < MIN_HITS:
    problems.append(f"only {len(hits)} content markers matched (need {MIN_HITS})")
if len(pages) < MIN_PAGES:
    problems.append(f"{len(pages)} pages (need {MIN_PAGES})")
if len(tables) < MIN_TABLES:
    problems.append(f"{len(tables)} tables (need {MIN_TABLES})")

if problems and not force:
    for p in problems:
        print(f"  REJECT: {p}")
    raise SystemExit("content gate failed. Nothing written.")

dest_dir = Path("pipeline/sources/deq")
dest_dir.mkdir(parents=True, exist_ok=True)
pdf_path = dest_dir / f"deq_dcamp_weekly_{report_date}.pdf"
if pdf_path.exists():
    raise SystemExit(f"already exists: {pdf_path}")

shutil.copy2(src, pdf_path)
txt_path = pdf_path.with_suffix(".txt")
tbl_path = pdf_path.with_name(pdf_path.stem + "_tables.json")
txt_path.write_text(text, encoding="utf-8")
tbl_path.write_text(json.dumps(tables, indent=2, ensure_ascii=False), encoding="utf-8")

digest = hashlib.sha256(pdf_path.read_bytes()).hexdigest()
entry = {
    "filename": pdf_path.as_posix(),
    "origin_url": origin_url,
    "download_date": date.today().isoformat(),
    "report_date": report_date,
    "license": "Public record. Virginia DEQ confirmed redistributable with credit to Virginia DEQ.",
    "attribution": "Virginia Department of Environmental Quality",
    "format": "pdf",
    "sha256": digest,
    "size_bytes": pdf_path.stat().st_size,
    "pages": len(pages),
    "tables_extracted": len(tables),
    "text_normalization": "NFKC",
    "description": (
        "Virginia DEQ Data Center Air Monitoring Project weekly analysis report. "
        "Reference artifact for reproduction of published collocation regressions, "
        "daily-average QA, and daily PM2.5 98th-percentile values. "
        "Not a data source; hourly Kunak CSV exports are the data source."
    ),
    "expected_columns": None,
    "derived_files": [txt_path.as_posix(), tbl_path.as_posix()],
}

mp = Path("pipeline/sources/manifest.json")
m = json.loads(mp.read_text(encoding="utf-8"))
if isinstance(m, dict) and "sources" in m:
    bucket = m["sources"]
elif isinstance(m, list):
    bucket = m
else:
    raise SystemExit(f"unrecognised manifest shape: {type(m)}")

if any(e.get("filename") == entry["filename"] for e in bucket):
    raise SystemExit("manifest entry already present")

bucket.append(entry)
mp.write_text(json.dumps(m, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

print(f"pdf    -> {pdf_path}")
print(f"text   -> {txt_path}")
print(f"tables -> {tbl_path}")
print(f"manifest appended, sha256={digest[:16]}...")
