#!/usr/bin/env python3
"""Build the asthma trait-ID lookup the GWAS Catalog extraction selects on.

Writes ``pipeline/lookups/asthma_trait_terms.json``: the ontology IDs that count
as asthma for the report's ancestry-composition module, with the OLS query that
produced them.

Why a committed lookup
----------------------
Extraction from the GWAS Catalog must be deterministic and ID-based: no free-text
matching on trait names, and no network call at extraction time. So the term set
is resolved once here, committed, and read as data by
``pipeline/report_lib/ancestry.py``. Re-running this script against a later OLS
release can change the set, which is why the file records the query date and the
ontology versions it was resolved against.

Why two roots
-------------
``EFO_0000270`` is the identifier the GWAS Catalog has used for asthma, and the
original module brief named it. In current EFO that term is **obsolete**: OLS
returns it with the label ``obsolete_asthma`` and no children. Live asthma is
``MONDO_0004979``, which EFO imports. Both are seeds here: MONDO_0004979 for the
subtree, EFO_0000270 so that any catalog row still carrying the retired
identifier is matched rather than silently dropped.

Descendants are taken from both ``mondo`` and ``efo``, and the union is used. The
two disagree: MONDO's asthma subtree is larger, while EFO carries asthma subtypes
of its own (``EFO_0009759``, ``EFO_0010638``, ``EFO_1002011``) that MONDO does
not. Taking either alone would drop traits the catalog maps to.

Subtype breadth is the ontology's, not a judgement made here. MONDO places
``exercise-induced bronchoconstriction`` and ``aspirin-induced respiratory
disease`` under asthma; both are kept, because the selection rule is membership
of the ontology subtree and nothing is hand-filtered out of it.

Usage:
    python scripts/build_asthma_trait_terms.py
"""

from __future__ import annotations

import datetime
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / "pipeline" / "lookups" / "asthma_trait_terms.json"

OLS = "https://www.ebi.ac.uk/ols4/api"
UA = {"User-Agent": "GENARCH/1.0"}
TIMEOUT = 180

# Seed terms. `iri` is what OLS keys on; `ontologies` are the ontologies whose
# view of the subtree is queried.
SEEDS = (
    {
        "obo_id": "MONDO:0004979",
        "iri": "http://purl.obolibrary.org/obo/MONDO_0004979",
        "ontologies": ("mondo", "efo"),
        "role": "live asthma term; subtree root",
    },
    {
        "obo_id": "EFO:0000270",
        "iri": "http://www.ebi.ac.uk/efo/EFO_0000270",
        "ontologies": ("efo",),
        "role": "retired asthma term; matched for legacy catalog rows",
    },
)


class Stop(Exception):
    """A stop condition fired. Nothing is written."""


def get(url: str) -> dict:
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as fh:
            return json.loads(fh.read().decode("utf-8"))
    except Exception as exc:  # noqa: BLE001 - any failure is a stop condition
        raise Stop(f"OLS unreachable at {url}: {exc!r}") from exc


def encoded(iri: str) -> str:
    """OLS keys terms by a double-URL-encoded IRI."""
    return urllib.parse.quote(urllib.parse.quote(iri, safe=""), safe="")


def term(ontology: str, iri: str) -> dict:
    return get(f"{OLS}/ontologies/{ontology}/terms/{encoded(iri)}")


def descendants(ontology: str, iri: str) -> list[dict]:
    """Every hierarchical descendant, paged to exhaustion."""
    out: list[dict] = []
    page = 0
    while True:
        doc = get(
            f"{OLS}/ontologies/{ontology}/terms/{encoded(iri)}"
            f"/hierarchicalDescendants?size=200&page={page}"
        )
        out.extend(doc.get("_embedded", {}).get("terms", []))
        meta = doc.get("page", {})
        page += 1
        if page >= int(meta.get("totalPages", 0) or 0):
            break
    return out


def ontology_version(ontology: str) -> dict:
    doc = get(f"{OLS}/ontologies/{ontology}")
    cfg = doc.get("config", {}) or {}
    return {
        "ontology": ontology,
        "version": cfg.get("version"),
        "version_iri": cfg.get("versionIri"),
        "loaded": doc.get("loaded"),
    }


def obo_to_underscore(obo_id: str) -> str:
    """`MONDO:0004979` -> `MONDO_0004979`, the form a catalog URI ends with."""
    return obo_id.replace(":", "_")


def main() -> int:
    try:
        terms: dict[str, dict] = {}
        queries: list[dict] = []
        versions: dict[str, dict] = {}

        for seed in SEEDS:
            for ontology in seed["ontologies"]:
                if ontology not in versions:
                    versions[ontology] = ontology_version(ontology)
                head = term(ontology, seed["iri"])
                kids = descendants(ontology, seed["iri"])
                queries.append(
                    {
                        "ontology": ontology,
                        "seed": seed["obo_id"],
                        "seed_label_in_this_ontology": head.get("label"),
                        "seed_is_obsolete": bool(head.get("is_obsolete")),
                        "descendants_returned": len(kids),
                        "endpoint": (
                            f"{OLS}/ontologies/{ontology}/terms/"
                            "<double-encoded IRI>/hierarchicalDescendants"
                        ),
                    }
                )
                for found in [head, *kids]:
                    obo = found.get("obo_id")
                    if not obo:
                        continue
                    record = terms.setdefault(
                        obo,
                        {
                            "obo_id": obo,
                            "id": obo_to_underscore(obo),
                            "label": found.get("label"),
                            "iri": found.get("iri"),
                            "is_obsolete": bool(found.get("is_obsolete")),
                            "seen_in": [],
                            "relation": "seed" if found is head else "descendant",
                        },
                    )
                    if ontology not in record["seen_in"]:
                        record["seen_in"].append(ontology)
                        record["seen_in"].sort()

        if "MONDO:0004979" not in terms or "EFO:0000270" not in terms:
            raise Stop("a seed term did not resolve; refusing to write a partial set")

        payload = {
            "description": (
                "Ontology IDs that count as asthma for the report's GWAS Catalog "
                "ancestry-composition module. Selection against the catalog is by these "
                "IDs only: a MAPPED_TRAIT_URI matches when it ends in one of the `id` "
                "values below. No trait name is ever matched as free text."
            ),
            "selection_rule": (
                "Union of the hierarchical descendants of MONDO_0004979 in mondo and in "
                "efo, plus both seed terms themselves, plus EFO_0000270. The union is "
                "used because the two ontologies disagree: MONDO's subtree is larger and "
                "EFO carries asthma subtypes MONDO does not. Subtype breadth is the "
                "ontology's; nothing is hand-filtered out of the subtree."
            ),
            "obsolete_seed_note": (
                "EFO_0000270 is obsolete in current EFO, returned by OLS as "
                "'obsolete_asthma' with no children. It is retained as a seed so a "
                "catalog row still carrying the retired identifier is matched rather "
                "than dropped. Live asthma is MONDO_0004979."
            ),
            "resolved_at": datetime.date.today().isoformat(),
            "resolver": "scripts/build_asthma_trait_terms.py",
            "ontology_versions": [versions[k] for k in sorted(versions)],
            "queries": sorted(queries, key=lambda q: (q["seed"], q["ontology"])),
            "term_count": len(terms),
            "terms": [terms[k] for k in sorted(terms)],
        }

        OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(OUT_PATH, "w", encoding="utf-8", newline="\n") as fh:
            json.dump(payload, fh, indent=2, ensure_ascii=False, sort_keys=True)
            fh.write("\n")

        print(f"{len(terms)} asthma trait IDs -> {OUT_PATH.relative_to(ROOT).as_posix()}")
        for key in sorted(terms):
            rec = terms[key]
            flag = " (obsolete)" if rec["is_obsolete"] else ""
            print(f"  {rec['id']:<16} {rec['label']}{flag}  [{','.join(rec['seen_in'])}]")
        return 0

    except Stop as exc:
        print(f"STOP: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
