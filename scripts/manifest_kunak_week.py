"""Record one week's Kunak exports in pipeline/sources/manifest.json.

    python scripts/manifest_kunak_week.py <input-folder>

<input-folder> is the export folder the week's files were staged from. It must
hold the _provenance.txt the export wrote (export_date, kunak_to and a SHA-256
for every file) and the _pdf_sources.tsv naming the edition the week belongs to.

Two passes, both idempotent, so a second run changes nothing:

a. Adds one entry per staged file, i.e. every deq-raw/*.csv in the root whose
   SHA-256 appears in _provenance.txt and which has no entry yet. The fields are
   those of the 2026-10-29 entries, in their order; the shared values are taken
   from them, the per-file ones from the file itself.

b. Corrects every Kunak entry whose filename names the deq-raw root while the
   file now exists only under deq-raw/_superseded/: filename moves to the
   _superseded path and superseded_on, superseded_by and superseded_reason are
   set, as scripts/mark_superseded.py did for the 2026-08-10 set.
   superseded_on is the date of the commit that first added the file under
   _superseded/. A move not yet committed has no such commit, so it takes today's
   date, the date the move was made, and the run says so. superseded_by is the
   same site's next later export, at its current path.

The manifest is written LF without BOM, as .gitattributes pins it.
"""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
from datetime import date, datetime
from pathlib import Path

MANIFEST = Path("pipeline/sources/manifest.json")
RAW = Path("pipeline/sources/deq-raw")
SUPERSEDED = RAW / "_superseded"
ROOT_PREFIX = RAW.as_posix() + "/"
SUP_PREFIX = SUPERSEDED.as_posix() + "/"
KUNAK_NAME = re.compile(
    r"^(?P<site>[a-z0-9-]+)_multi_(?P<start>\d{4}-\d\d-\d\d)_(?P<end>\d{4}-\d\d-\d\d)\.csv$"
)
# The entries every new one is modelled on: field order and shared values.
MODEL_END = "2026-10-29"
SHARED = (
    "origin_url",
    "license",
    "attribution",
    "description",
    "export_date_source",
    "requested_range_start",
    "timestamp_convention",
)


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def read_provenance(folder: Path) -> tuple[str, str, dict[str, str]]:
    text = (folder / "_provenance.txt").read_text(encoding="utf-8-sig")
    fields = dict(re.findall(r"^(export_date|kunak_to) (\S+)\s*$", text, re.M))
    hashes = {h: name for h, name in re.findall(r"^([0-9a-f]{64})  (.+?)\s*$", text, re.M)}
    if "export_date" not in fields or "kunak_to" not in fields or not hashes:
        raise SystemExit("_provenance.txt lacks export_date, kunak_to or file hashes")
    return fields["export_date"], fields["kunak_to"], hashes


def read_edition_date(folder: Path) -> str:
    text = (folder / "_pdf_sources.tsv").read_text(encoding="utf-8-sig")
    dates = {ln.split("\t")[0].strip() for ln in text.splitlines() if ln.strip()}
    if len(dates) != 1:
        raise SystemExit(f"_pdf_sources.tsv names {len(dates)} editions; expected one")
    edition = dates.pop()
    date.fromisoformat(edition)
    return edition


def probe(p: Path) -> dict:
    """Location, header, row count and first/last hour, counted as staging counts them."""
    raw = p.read_bytes()
    lines = [ln for ln in raw.decode("utf-8-sig").splitlines() if ln.strip()]
    header = next(ln for ln in lines if ln.lstrip().startswith('"Location"'))
    rows = [
        ln
        for ln in lines
        if not ln.startswith("sep=") and not ln.lstrip().startswith('"Location"')
    ]
    cells = [[c.strip().strip('"') for c in r.split(";")] for r in rows]
    stamps = [datetime.strptime(c[1], "%b %d, %Y, %H:%M:%S") for c in cells]  # noqa: DTZ007
    locs = {c[0] for c in cells}
    if len(locs) != 1:
        raise SystemExit(f"{p.name}: {len(locs)} Location values")
    return {
        "location": locs.pop(),
        "columns": [c.strip().strip('"') for c in header.split(";")],
        "rows": len(rows),
        "first": min(stamps).strftime("%Y-%m-%d %H:%M"),
        "last": max(stamps).strftime("%Y-%m-%d %H:%M"),
        "bom": raw.startswith(b"\xef\xbb\xbf"),
    }


def git_added_date(path: Path) -> str | None:
    out = subprocess.run(
        [
            "git", "log", "--no-renames", "--diff-filter=A",
            "--format=%ad", "--date=short", "--", path.as_posix(),
        ],
        capture_output=True,
        text=True,
        check=True,
    ).stdout.split()
    return out[-1] if out else None


def next_export(site: str, end: str) -> Path | None:
    later = []
    for p in list(RAW.glob("*.csv")) + list(SUPERSEDED.glob("*.csv")):
        m = KUNAK_NAME.match(p.name)
        if m and m["site"] == site and m["end"] > end:
            later.append((m["end"], p.as_posix(), p))
    return min(later)[2] if later else None


def is_kunak(fn: str) -> bool:
    return fn.startswith(ROOT_PREFIX) and KUNAK_NAME.match(Path(fn).name) is not None


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        raise SystemExit(__doc__)
    folder = Path(argv[0])
    export_date, kunak_to, prov = read_provenance(folder)
    edition = read_edition_date(folder)

    original = MANIFEST.read_bytes()
    doc = json.loads(original)
    bucket = doc["sources"]
    model = [
        e for e in bucket
        if is_kunak(e.get("filename", "")) and e["filename"].endswith(f"_{MODEL_END}.csv")
    ]
    if not model:
        raise SystemExit(f"no {MODEL_END} Kunak entries to model on")
    order = [k for k in model[0] if not k.startswith("superseded_")]
    shared = {k: model[0][k] for k in SHARED}
    for e in model:
        keys = [k for k in e if not k.startswith("superseded_")]
        if keys != order or any(e[k] != shared[k] for k in SHARED):
            raise SystemExit(f"{MODEL_END} entries disagree on field order or shared values")

    # b. entries naming the root while the file lives only under _superseded
    corrected = []
    for e in bucket:
        fn = e.get("filename", "")
        if not is_kunak(fn) or fn.startswith(SUP_PREFIX):
            continue
        root, sup = Path(fn), SUPERSEDED / Path(fn).name
        if root.exists() or not sup.exists():
            continue
        m = KUNAK_NAME.match(sup.name)
        if sha256(sup) != e["sha256"]:
            raise SystemExit(f"{sup}: SHA-256 differs from the manifest entry")
        on, note = git_added_date(sup), ""
        if on is None:
            on, note = date.today().isoformat(), " (move not yet committed; today's date)"
        by = next_export(m["site"], m["end"])
        if by is None:
            raise SystemExit(f"{sup.name}: no later export of {m['site']} for superseded_by")
        by_end = KUNAK_NAME.match(by.name)["end"]
        e["filename"] = sup.as_posix()
        e["superseded_on"] = on
        e["superseded_by"] = by.as_posix()
        e["superseded_reason"] = (
            f"Replaced by a later full re-pull covering {m['start']} to {by_end}. "
            "Retained unmodified for provenance. reshape_deq.py globs deq-raw/ "
            "non-recursively, so files under _superseded/ are not ingested and "
            "cannot double-count overlapping hours."
        )
        corrected.append(f"{fn} -> {sup.as_posix()}  superseded_on={on}{note}  superseded_by={by.as_posix()}")

    # a. one entry per staged file of this export
    known = {e.get("filename") for e in bucket}
    added = []
    for p in sorted(RAW.glob("*.csv")):
        digest = sha256(p)
        if digest not in prov or p.as_posix() in known:
            continue
        m = KUNAK_NAME.match(p.name)
        if not m or m["end"] != kunak_to:
            raise SystemExit(f"{p.name}: staged name does not end at kunak_to {kunak_to}")
        info = probe(p)
        values = {
            **shared,
            "filename": p.as_posix(),
            "download_date": export_date[:10],
            "report_date": edition,
            "format": (
                f"CSV, semicolon-delimited, UTF-8 {'with' if info['bom'] else 'without'} BOM, "
                "sep=; preamble on line 1"
            ),
            "sha256": digest,
            "size_bytes": p.stat().st_size,
            "site_id": m["site"],
            "kunak_location": info["location"],
            "coverage": (
                f"{info['first']} to {info['last']} local wall clock as exported, "
                f"{info['rows']} rows before dedup"
            ),
            "expected_columns": info["columns"],
            "export_date": export_date,
            "requested_range_end": kunak_to,
            "data_first_timestamp_local": info["first"],
            "data_last_timestamp_local": info["last"],
            "rows_as_exported": info["rows"],
        }
        missing = set(order) - set(values)
        if missing:
            raise SystemExit(f"no value for {sorted(missing)}")
        bucket.append({k: values[k] for k in order})
        added.append(f"{p.as_posix()}  ({prov[digest]}, {info['rows']} rows)")

    out = (json.dumps(doc, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
    if out != original:
        with open(MANIFEST, "wb") as fh:
            fh.write(out)
    print(f"added {len(added)}")
    for line in added:
        print(f"  + {line}")
    print(f"corrected {len(corrected)}")
    for line in corrected:
        print(f"  ~ {line}")
    print("manifest " + ("written" if out != original else "unchanged"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
