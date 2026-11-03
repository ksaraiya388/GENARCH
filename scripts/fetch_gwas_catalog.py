#!/usr/bin/env python3
"""Download one dated GWAS Catalog release and cut the committed asthma extracts.

    python scripts/fetch_gwas_catalog.py              # download if absent, then extract
    python scripts/fetch_gwas_catalog.py --extract-only

Two files are read from the release, both under ``pipeline/sources/gwas-catalog/``:

* ``gwas-catalog-associations_ontology-annotated-full.zip`` -- associations with
  their ontology annotations, which is where ``MAPPED_TRAIT_URI`` lives.
* ``gwas-catalog-download-ancestries-v1.0.3.1.tsv`` -- one row per study, stage
  and ancestry group, carrying ``STAGE``, ``NUMBER OF INDIVIDUALS`` and
  ``BROAD ANCESTRAL CATEGORY``.

Both are about 120 MB together and neither is committed (DECISIONS.md D30). What
is committed is one asthma extract per file, plus ``extract_manifest.json``
recording the release date, the dated origin URLs, and the SHA-256 of all four
files. ``pipeline.report`` reads the extracts and never the full downloads.

Selection is by ontology ID, never by trait name
------------------------------------------------
``pipeline/lookups/asthma_trait_terms.json`` holds 23 asthma IDs, resolved from
OLS by ``scripts/build_asthma_trait_terms.py``. An association row is selected
when its ``MAPPED_TRAIT_URI`` ends in one of those IDs, matched on the URI's last
path segment so that a longer identifier sharing a prefix cannot match. The
ancestry extract is then every row of the ancestries file whose
``STUDY ACCESSION`` appears in the association extract. No trait name, no
free-text asthma match, and no manual row list anywhere.

Determinism
-----------
Source row order is preserved, columns are untouched, output is UTF-8 without a
BOM with LF endings. Re-running against the same full download reproduces each
extract byte-for-byte; ``tests/test_report.py`` asserts that twice over.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / "pipeline" / "sources" / "gwas-catalog"
TERMS_PATH = ROOT / "pipeline" / "lookups" / "asthma_trait_terms.json"

# The dated release, never the `latest` alias: `latest` is re-pointed every month
# and a URL that moves cannot pin anything (D30).
RELEASE_DATE = "2026-11-02"
RELEASE_BASE = "https://ftp.ebi.ac.uk/pub/databases/gwas/releases/2026/11/02"

ASSOCIATIONS_FILE = "gwas-catalog-associations_ontology-annotated-full.zip"
ANCESTRIES_FILE = "gwas-catalog-download-ancestries-v1.0.3.1.tsv"

ASSOCIATIONS_EXTRACT = f"asthma_associations_{RELEASE_DATE}.tsv"
ANCESTRIES_EXTRACT = f"asthma_ancestries_{RELEASE_DATE}.tsv"
EXTRACT_MANIFEST = "extract_manifest.json"

# Columns the extraction requires. Resolved by name against each file's own
# header, so a reordered or widened release fails loudly instead of silently
# reading the wrong column by position.
ASSOC_TRAIT_URI = "MAPPED_TRAIT_URI"
ASSOC_ACCESSION = "STUDY ACCESSION"
ANC_ACCESSION = "STUDY ACCESSION"

UA = {"User-Agent": "GENARCH/1.0"}
_CHUNK = 1048576


class Stop(Exception):
    """A stop condition fired. Nothing is written."""


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        while True:
            chunk = handle.read(_CHUNK)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def expected_size(url: str) -> int | None:
    try:
        req = urllib.request.Request(url, headers=UA, method="HEAD")
        with urllib.request.urlopen(req, timeout=120) as fh:
            value = fh.headers.get("Content-Length")
        return int(value) if value else None
    except Exception:  # noqa: BLE001 - treated as "size unknown"
        return None


def download(name: str, attempts: int = 40) -> Path:
    """Resume until the local size equals the server's Content-Length."""
    url = f"{RELEASE_BASE}/{name}"
    target = DEST / name
    DEST.mkdir(parents=True, exist_ok=True)
    size = expected_size(url)
    if size is None:
        raise Stop(f"no Content-Length for {url}; refusing to guess completeness")
    for attempt in range(1, attempts + 1):
        have = target.stat().st_size if target.exists() else 0
        if have == size:
            print(f"  {name}: {size} bytes, complete")
            return target
        if have > size:
            print(f"  {name}: local copy oversize, restarting")
            target.unlink()
            continue
        req = urllib.request.Request(url, headers={**UA, "Range": f"bytes={have}-"})
        try:
            with urllib.request.urlopen(req, timeout=900) as fh, open(target, "ab") as out:
                while True:
                    chunk = fh.read(_CHUNK)
                    if not chunk:
                        break
                    out.write(chunk)
        except (urllib.error.URLError, OSError, TimeoutError) as exc:
            print(f"  {name}: attempt {attempt} interrupted at "
                  f"{target.stat().st_size if target.exists() else 0}/{size} ({exc!r})")
            continue
    final = target.stat().st_size if target.exists() else 0
    raise Stop(f"{name} incomplete after {attempts} attempts: {final}/{size} bytes")


def load_terms() -> tuple[set[str], list[dict]]:
    if not TERMS_PATH.is_file():
        raise Stop(
            f"missing {TERMS_PATH.relative_to(ROOT).as_posix()}; "
            "run scripts/build_asthma_trait_terms.py first"
        )
    doc = json.loads(TERMS_PATH.read_text(encoding="utf-8"))
    ids = {t["id"] for t in doc["terms"]}
    if not ids:
        raise Stop("the asthma term lookup is empty")
    return ids, doc["terms"]


def uri_ids(field: str) -> set[str]:
    """The ontology IDs a MAPPED_TRAIT_URI cell names.

    The cell holds one or more IRIs separated by commas. Only the last path
    segment of each is compared, so `EFO_0000270` cannot match `EFO_00002701`
    and a substring search over the raw cell is avoided.
    """
    out = set()
    for piece in field.replace(";", ",").split(","):
        piece = piece.strip().rstrip("/")
        if piece:
            out.add(piece.rsplit("/", 1)[-1])
    return out


def open_associations(path: Path):
    """The single TSV member inside the associations zip, as text lines."""
    archive = zipfile.ZipFile(path)
    members = [m for m in archive.infolist() if not m.is_dir()]
    if len(members) != 1:
        raise Stop(
            f"expected exactly one member in {path.name}, found "
            f"{[m.filename for m in members]}"
        )
    handle = archive.open(members[0], "r")
    return archive, members[0].filename, (line.decode("utf-8") for line in handle)


def column(header: list[str], name: str, where: str) -> int:
    if name not in header:
        raise Stop(f"{where} has no {name!r} column; header is {header[:12]}...")
    return header.index(name)


def write_tsv(path: Path, header: list[str], rows: list[list[str]]) -> Path:
    """Write a TSV by joining on tabs, with no quoting of any kind.

    The csv module is deliberately not used here. Every field came out of a
    tab-split of the source, so no field can contain a tab, and writing them back
    with a plain join reproduces the source bytes of each cell exactly. A csv
    writer would instead apply its own quoting rules to cells containing quotes or
    commas -- which GWAS Catalog study titles and trait names routinely do -- and
    the extract would no longer be a verbatim subset of the release.

    A field carrying a tab or a newline would break that guarantee, so it fails
    the run rather than being silently escaped.
    """
    with open(path, "w", encoding="utf-8", newline="") as fh:
        for row in [header, *rows]:
            for cell in row:
                if "\t" in cell or "\n" in cell or "\r" in cell:
                    raise Stop(
                        f"field in {path.name} contains a tab or newline and cannot be "
                        f"written verbatim: {cell[:80]!r}"
                    )
            fh.write("\t".join(row))
            fh.write("\n")
    return path


def extract(assoc_path: Path, anc_path: Path) -> dict:
    term_ids, terms = load_terms()
    print(f"selecting on {len(term_ids)} asthma ontology IDs")

    archive, member, lines = open_associations(assoc_path)
    try:
        reader = csv.reader(lines, delimiter="\t", quoting=csv.QUOTE_NONE)
        header = next(reader)
        i_uri = column(header, ASSOC_TRAIT_URI, member)
        i_acc = column(header, ASSOC_ACCESSION, member)
        kept: list[list[str]] = []
        accessions: set[str] = set()
        asthma_only_accessions: set[str] = set()
        traits: dict[str, int] = {}
        matched_ids: dict[str, int] = {}
        co_traits: dict[str, int] = {}
        asthma_only_rows = 0
        total = 0
        i_label = header.index("MAPPED_TRAIT") if "MAPPED_TRAIT" in header else None
        for row in reader:
            total += 1
            if len(row) <= max(i_uri, i_acc):
                continue
            ids = uri_ids(row[i_uri])
            hits = ids & term_ids
            if not hits:
                continue
            kept.append(row)
            accession = row[i_acc].strip()
            accessions.add(accession)
            for hit in hits:
                matched_ids[hit] = matched_ids.get(hit, 0) + 1
            # A row whose MAPPED_TRAIT_URI names a non-asthma term as well is a
            # multi-trait association: the catalog mapped it to asthma and to
            # something else. The brief selects on "URI contains an asthma ID", so
            # these are in; the accounting here is what makes that visible.
            if ids <= term_ids:
                asthma_only_rows += 1
                asthma_only_accessions.add(accession)
            if i_label is not None:
                label = row[i_label].strip()
                traits[label] = traits.get(label, 0) + 1
                if not ids <= term_ids:
                    co_traits[label] = co_traits.get(label, 0) + 1
    finally:
        archive.close()

    print(f"  associations: {len(kept)} of {total} rows, "
          f"{len(accessions)} distinct study accessions")

    with open(anc_path, encoding="utf-8", newline="") as fh:
        reader = csv.reader(fh, delimiter="\t", quoting=csv.QUOTE_NONE)
        anc_header = next(reader)
        j_acc = column(anc_header, ANC_ACCESSION, anc_path.name)
        anc_rows = [r for r in reader if len(r) > j_acc and r[j_acc].strip() in accessions]
    print(f"  ancestries: {len(anc_rows)} rows for those accessions")

    if not kept or not anc_rows:
        raise Stop("extraction produced an empty side; refusing to write")

    DEST.mkdir(parents=True, exist_ok=True)
    assoc_out = write_tsv(DEST / ASSOCIATIONS_EXTRACT, header, kept)
    anc_out = write_tsv(DEST / ANCESTRIES_EXTRACT, anc_header, anc_rows)

    manifest = {
        "description": (
            "Asthma extracts of the GWAS Catalog "
            f"{RELEASE_DATE} release, cut by scripts/fetch_gwas_catalog.py. The full "
            "downloads are not committed (DECISIONS.md D30); their SHA-256 values below "
            "attest the release the extracts were cut from."
        ),
        "release_date": RELEASE_DATE,
        "release_base_url": RELEASE_BASE,
        "extraction_script": "scripts/fetch_gwas_catalog.py",
        "term_lookup": "pipeline/lookups/asthma_trait_terms.json",
        "selection_rule": (
            "An association row is selected when the last path segment of any IRI in its "
            f"{ASSOC_TRAIT_URI} cell equals one of the asthma ontology IDs in the term "
            "lookup. The ancestry extract is every row of the ancestries file whose "
            f"{ANC_ACCESSION} appears in the association extract. No trait name is matched "
            "as free text and no row is listed by hand."
        ),
        "determinism": (
            "Source row order and column content are preserved; output is UTF-8 without a "
            "BOM, LF endings, no quoting. Re-running on the same full download reproduces "
            "each extract byte-for-byte."
        ),
        "asthma_term_ids": sorted(term_ids),
        "asthma_term_ids_matched": dict(sorted(matched_ids.items())),
        "asthma_term_ids_unmatched": sorted(term_ids - set(matched_ids)),
        "mapped_traits_matched": dict(sorted(traits.items())),
        "association_rows_scanned": total,
        "association_rows_kept": len(kept),
        "study_accessions": len(accessions),
        "ancestry_rows_kept": len(anc_rows),
        "multi_trait_accounting": {
            "note": (
                "The selection rule is 'MAPPED_TRAIT_URI contains an asthma ID', so an "
                "association the catalog mapped to asthma AND another trait is kept. "
                "These rows come mostly from multi-trait and pleiotropy analyses. The "
                "counts below say how many, so a reader can see what the asthma "
                "denominator includes rather than having to infer it."
            ),
            "rows_mapped_to_asthma_terms_only": asthma_only_rows,
            "rows_also_mapped_to_another_trait": len(kept) - asthma_only_rows,
            "accessions_mapped_to_asthma_terms_only": len(asthma_only_accessions),
            "accessions_with_any_multi_trait_row": len(
                accessions - asthma_only_accessions
            ),
            "mapped_trait_cells_naming_another_trait": dict(sorted(co_traits.items())),
        },
        "files": [
            {
                "role": "full download, not committed",
                "name": ASSOCIATIONS_FILE,
                "origin_url": f"{RELEASE_BASE}/{ASSOCIATIONS_FILE}",
                "sha256": sha256_of(assoc_path),
                "size_bytes": assoc_path.stat().st_size,
            },
            {
                "role": "full download, not committed",
                "name": ANCESTRIES_FILE,
                "origin_url": f"{RELEASE_BASE}/{ANCESTRIES_FILE}",
                "sha256": sha256_of(anc_path),
                "size_bytes": anc_path.stat().st_size,
            },
            {
                "role": "committed extract",
                "name": ASSOCIATIONS_EXTRACT,
                "cut_from": ASSOCIATIONS_FILE,
                "sha256": sha256_of(assoc_out),
                "size_bytes": assoc_out.stat().st_size,
                "columns": header,
            },
            {
                "role": "committed extract",
                "name": ANCESTRIES_EXTRACT,
                "cut_from": ANCESTRIES_FILE,
                "sha256": sha256_of(anc_out),
                "size_bytes": anc_out.stat().st_size,
                "columns": anc_header,
            },
        ],
    }
    path = DEST / EXTRACT_MANIFEST
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(manifest, fh, indent=2, ensure_ascii=False, sort_keys=True)
        fh.write("\n")
    return manifest


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--extract-only",
        action="store_true",
        help="skip downloading; require both full files already present",
    )
    args = parser.parse_args(argv)
    try:
        if args.extract_only:
            paths = []
            for name in (ASSOCIATIONS_FILE, ANCESTRIES_FILE):
                path = DEST / name
                if not path.is_file():
                    raise Stop(f"missing {path.relative_to(ROOT).as_posix()}")
                paths.append(path)
            assoc_path, anc_path = paths
        else:
            print(f"GWAS Catalog release {RELEASE_DATE}")
            assoc_path = download(ASSOCIATIONS_FILE)
            anc_path = download(ANCESTRIES_FILE)

        manifest = extract(assoc_path, anc_path)
        print(f"\nrelease {manifest['release_date']}")
        for entry in manifest["files"]:
            print(f"  {entry['sha256'][:16]}...  {entry['size_bytes']:>12,}  {entry['name']}")
        unmatched = manifest["asthma_term_ids_unmatched"]
        print(f"\n{len(manifest['mapped_traits_matched'])} distinct MAPPED_TRAIT values matched; "
              f"{len(unmatched)} of {len(manifest['asthma_term_ids'])} term IDs matched nothing")
        return 0
    except Stop as exc:
        print(f"STOP: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
