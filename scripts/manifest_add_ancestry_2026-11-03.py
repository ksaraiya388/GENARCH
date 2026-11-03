#!/usr/bin/env python3
"""Add the ancestry module's source entries to pipeline/sources/manifest.json.

Six entries: the two uncommitted GWAS Catalog full downloads, the two committed
asthma extracts cut from them, and the three ACS 2024 release files (one entry
each). Every SHA-256 is read off the file on disk, or out of
``extract_manifest.json`` for the two full downloads that D30 keeps out of git.

Idempotent: an entry whose ``file`` already appears is replaced, not duplicated.

Usage:
    python scripts/manifest_add_ancestry_2026-11-03.py
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "pipeline" / "sources" / "manifest.json"
GWAS_DIR = ROOT / "pipeline" / "sources" / "gwas-catalog"
ACS_DIR = ROOT / "pipeline" / "sources" / "cross_ancestry"
EXTRACT_MANIFEST = GWAS_DIR / "extract_manifest.json"

ACS_RELEASE = "2024"

# What https://www.ebi.ac.uk/gwas/docs/file-downloads actually states, checked
# 2026-11-03. The page names no licence for the data: it links to citation
# guidance and to EMBL-EBI's terms of use, and its footer licence
# ("Documentation available under CC BY 4.0") covers the documentation, not the
# files. EMBL-EBI's terms of use say EMBL-EBI "places no additional restrictions
# on the use or redistribution of the data" beyond those set by the original data
# owners. Recorded as stated rather than resolved into a licence name, because
# asserting a specific licence the page does not name would be an invention.
GWAS_LICENSE = (
    "No licence is stated for the data files on "
    "https://www.ebi.ac.uk/gwas/docs/file-downloads (checked 2026-11-03). That page "
    "links to GWAS Catalog citation guidance and to EMBL-EBI's terms of use; its "
    "footer licence statement, 'Documentation available under CC BY 4.0', covers the "
    "documentation and not the downloads. EMBL-EBI's terms of use state that EMBL-EBI "
    "'places no additional restrictions on the use or redistribution of the data' "
    "beyond those set by the original data owners, so reuse is governed by the owners' "
    "own terms. No specific licence name is asserted here because neither page names "
    "one. Cite the GWAS Catalog per its citation page."
)

ACS_LICENSE = (
    "US Census Bureau data are US Government works and are not subject to domestic "
    "copyright protection under 17 U.S.C. 105. The Bureau's terms of service ask that "
    "the Census Bureau be cited as the source and that the Bureau not be shown as "
    "endorsing any product. The API key used to retrieve these files is read from "
    "outside the repository and appears in no committed file."
)


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    if not EXTRACT_MANIFEST.is_file():
        print(f"STOP: missing {EXTRACT_MANIFEST}", file=sys.stderr)
        return 1
    extract = json.loads(EXTRACT_MANIFEST.read_text(encoding="utf-8"))
    by_name = {entry["name"]: entry for entry in extract["files"]}
    release = extract["release_date"]
    base = extract["release_base_url"]

    entries: list[dict] = []

    for name, purpose, columns_note in (
        (
            "gwas-catalog-associations_ontology-annotated-full.zip",
            "Source of the asthma association extract: all GWAS Catalog associations "
            "with their ontology annotations, which is the only download carrying "
            "MAPPED_TRAIT_URI.",
            "Zipped TSV, one member. Columns used: STUDY ACCESSION, MAPPED_TRAIT, "
            "MAPPED_TRAIT_URI, MAPPED_GENE, SNPS, P-VALUE. The full column list is "
            "recorded per extract in pipeline/sources/gwas-catalog/extract_manifest.json.",
        ),
        (
            "gwas-catalog-download-ancestries-v1.0.3.1.tsv",
            "Source of the asthma ancestry extract: one row per study, stage and "
            "ancestry group, carrying the discovery-sample size and ancestry category.",
            "TSV. Columns used: STUDY ACCESSION, STAGE, NUMBER OF INDIVIDUALS, "
            "BROAD ANCESTRAL CATEGORY. The v1.0.3.1 variant adds fields matching the "
            "unpublished downloads.",
        ),
    ):
        meta = by_name[name]
        entries.append(
            {
                "file": f"gwas-catalog/{name}",
                "purpose": purpose,
                "origin_urls": [f"{base}/{name}"],
                "retrieval_method": (
                    "HTTPS download from the dated release directory by "
                    "scripts/fetch_gwas_catalog.py. The releases/latest alias is "
                    "re-pointed every month and is never recorded as an origin."
                ),
                "download_date": "2026-11-03",
                "release_date": release,
                "license": GWAS_LICENSE,
                "format": "ZIP of TSV" if name.endswith(".zip") else "TSV",
                "columns": columns_note,
                "sha256": meta["sha256"],
                "size_bytes": meta["size_bytes"],
                "stored_in_git": False,
                "status": (
                    "NOT COMMITTED, per DECISIONS.md D30. Pinned by SHA-256 and dated "
                    "origin URL here and in data/reports/2026/FREEZE.json; gitignored "
                    "by name under pipeline/sources/gwas-catalog/."
                ),
                "description": (
                    "Too large to commit: this file and its sibling are about 120 MB "
                    "together and the zip cannot be packed by git. The committed asthma "
                    "extract beside it was cut from these exact bytes, which the SHA-256 "
                    "attests. Re-download from origin_urls and re-run "
                    "scripts/fetch_gwas_catalog.py to reproduce the extract byte-for-byte."
                ),
                "limitations": (
                    "A GWAS Catalog release is a snapshot of curation at one date; study "
                    "and ancestry records are revised between releases, so a share "
                    "computed here is a share as of this release and not a standing fact."
                ),
            }
        )

    for name, source_file, purpose in (
        (
            f"asthma_associations_{release}.tsv",
            "gwas-catalog-associations_ontology-annotated-full.zip",
            "Asthma associations: every row of the associations file whose "
            "MAPPED_TRAIT_URI names an asthma ontology ID. Read by "
            "pipeline/report_lib/ancestry.py for T11 (associations at the in-scope loci "
            "by discovery-sample ancestry).",
        ),
        (
            f"asthma_ancestries_{release}.tsv",
            "gwas-catalog-download-ancestries-v1.0.3.1.tsv",
            "Asthma ancestry rows: every row of the ancestries file whose STUDY "
            "ACCESSION appears in the association extract. Read by "
            "pipeline/report_lib/ancestry.py for T10 and F06 (discovery-sample "
            "composition by broad ancestral category).",
        ),
    ):
        meta = by_name[name]
        entries.append(
            {
                "file": f"gwas-catalog/{name}",
                "purpose": purpose,
                "origin_urls": [f"{base}/{source_file}"],
                "retrieval_method": (
                    f"Deterministic extract cut from {source_file} by "
                    "scripts/fetch_gwas_catalog.py. Selection is by ontology ID against "
                    "pipeline/lookups/asthma_trait_terms.json; no trait name is matched "
                    "as free text and no row is listed by hand."
                ),
                "download_date": "2026-11-03",
                "release_date": release,
                "license": GWAS_LICENSE,
                "format": "TSV",
                "columns": ", ".join(meta["columns"]),
                "sha256": meta["sha256"],
                "size_bytes": meta["size_bytes"],
                "cut_from": f"gwas-catalog/{source_file}",
                "cut_from_sha256": by_name[source_file]["sha256"],
                "generated_by": extract["extraction_script"],
                "stored_in_git": True,
                "status": "SHIPPED. Committed; the full download it was cut from is not.",
                "description": extract["selection_rule"] + " " + extract["determinism"],
                "limitations": (
                    "Scope is asthma as the ontology defines it: the 23 IDs in the term "
                    "lookup are the asthma subtree of MONDO and EFO plus the retired "
                    "EFO_0000270. A study the catalog maps to a trait outside that "
                    "subtree is not in this extract, however asthma-related its title."
                ),
            }
        )

    for table in ("b02001", "b02015", "dp05"):
        name = f"acs_loudoun_{ACS_RELEASE}_{table}.json"
        path = ACS_DIR / name
        if not path.is_file():
            print(f"STOP: missing {path}", file=sys.stderr)
            return 1
        doc = json.loads(path.read_text(encoding="utf-8"))
        entries.append(
            {
                "file": f"cross_ancestry/{name}",
                "purpose": (
                    f"Loudoun County population composition from ACS table "
                    f"{table.upper()}, read by pipeline/report_lib/ancestry.py for T12 "
                    "and the F06 ACS panel."
                ),
                "origin_urls": [doc["request_url"], doc["label_source_url"]],
                "retrieval_method": (
                    "api.census.gov group() request by "
                    "scripts/fetch_acs_loudoun_release.py. The whole table is requested, "
                    "so no variable is named or numbered in advance; label text comes "
                    "from the release's own per-group metadata endpoint. The API key is "
                    "read from outside the repository and is stripped from every "
                    "recorded URL."
                ),
                "download_date": doc["retrieved_at"],
                "release_date": doc["release"],
                "license": ACS_LICENSE,
                "format": "JSON",
                "columns": (
                    f"{doc['variable_count']} labelled cells; each carries label, value "
                    "and a published flag. The API response is preserved verbatim under "
                    "raw_response."
                ),
                "sha256": sha256_of(path),
                "size_bytes": path.stat().st_size,
                "generated_by": "scripts/fetch_acs_loudoun_release.py",
                "stored_in_git": True,
                "status": (
                    "SHIPPED. Read by the report only. The live page /ancestry-equity "
                    "reads the earlier acs_loudoun_2023.json and is unchanged; the "
                    "release divergence is an open item in docs/report-2026/AUDIT.md."
                ),
                "description": doc["sentinel_handling"] + " " + doc["notes"],
                "limitations": (
                    "Race and Hispanic origin here are self-identified social "
                    "categories, not genetic ancestry, and must never be presented as a "
                    "genetic-ancestry composition. Hispanic or Latino origin cross-cuts "
                    "every race category, so it is never a segment of a race stack. "
                    "Margins of error are published per cell and a cell whose margin is "
                    "absent carries a sentinel, not a number."
                ),
            }
        )

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    sources = manifest["sources"]
    existing = {entry.get("file"): i for i, entry in enumerate(sources)}
    added = replaced = 0
    for entry in entries:
        if entry["file"] in existing:
            sources[existing[entry["file"]]] = entry
            replaced += 1
        else:
            sources.append(entry)
            added += 1

    with open(MANIFEST, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(manifest, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    print(f"manifest.json: {added} entries added, {replaced} replaced, "
          f"{len(sources)} total")
    for entry in entries:
        stored = "committed" if entry["stored_in_git"] else "not stored (D30)"
        print(f"  {entry['sha256'][:16]}...  {entry['file']}  [{stored}]")
    return 0


if __name__ == "__main__":
    sys.exit(main())
