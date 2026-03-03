"""Stage 5: emit canonical JSON artifacts."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .paths import (
    COMMUNITY_DIR,
    DISEASES_DIR,
    EXPOSURES_DIR,
    GENES_DIR,
    GRAPH_DIR,
    PATHWAYS_DIR,
    REPORTS_DIR,
    ensure_directories,
)


def _write_json(path: Path, payload: dict[str, Any] | list[Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, indent=2, sort_keys=True, ensure_ascii=True) + "\n",
        encoding="utf-8",
    )


def emit_bundle(bundle: dict[str, Any]) -> None:
    """Write generated artifacts into data/* directories."""

    ensure_directories()

    diseases = bundle.get("diseases", [])
    exposures = bundle.get("exposures", [])
    genes = bundle.get("genes", [])
    pathways = bundle.get("pathways", [])
    communities = bundle.get("community", [])

    for entity in diseases:
        _write_json(DISEASES_DIR / f"{entity['slug']}.json", entity)
    for entity in exposures:
        _write_json(EXPOSURES_DIR / f"{entity['slug']}.json", entity)
    for entity in genes:
        _write_json(GENES_DIR / f"{entity['slug']}.json", entity)
    for entity in pathways:
        _write_json(PATHWAYS_DIR / f"{entity['slug']}.json", entity)
    for entity in communities:
        _write_json(COMMUNITY_DIR / f"{entity['slug']}.json", entity)

    _write_json(GRAPH_DIR / "graph.json", bundle["graph"])

    _write_json(
        DISEASES_DIR / "index.json",
        [{"slug": entity["slug"], "name": entity["name"]} for entity in diseases],
    )
    _write_json(
        EXPOSURES_DIR / "index.json",
        [{"slug": entity["slug"], "name": entity["name"]} for entity in exposures],
    )
    _write_json(
        GENES_DIR / "index.json",
        [{"slug": entity["slug"], "name": entity["name"], "symbol": entity["symbol"]} for entity in genes],
    )
    _write_json(
        PATHWAYS_DIR / "index.json",
        [{"slug": entity["slug"], "name": entity["name"]} for entity in pathways],
    )
    _write_json(
        COMMUNITY_DIR / "index.json",
        [{"slug": entity["slug"], "name": entity["name"]} for entity in communities],
    )

    synonyms: dict[str, list[str]] = {}

    def add_synonyms(key: str, values: list[str]) -> None:
        normalized_values = sorted(
            {
                value.strip().lower()
                for value in values
                if value and value.strip() and value.strip().lower() != key.lower()
            }
        )
        if normalized_values:
            synonyms[key] = normalized_values

    for disease in diseases:
        add_synonyms(
            disease["slug"],
            [
                disease["name"],
                disease["name"].replace("&", "and"),
                disease["name"].replace("disease", "").strip(),
            ],
        )
    for exposure in exposures:
        add_synonyms(
            exposure["slug"],
            [
                exposure["name"],
                exposure["name"].replace("(", "").replace(")", ""),
                exposure["name"].replace("and", "&"),
            ],
        )
    for gene in genes:
        add_synonyms(gene["slug"], [gene["name"], gene["symbol"], gene["symbol"].replace("-", "")])
    for pathway in pathways:
        add_synonyms(pathway["slug"], [pathway["name"], pathway["name"].replace("-", " ")])

    _write_json(Path("data/synonyms.json"), synonyms)

    releases = {
        "schema_version": "1.0",
        "last_updated": bundle["last_updated"],
        "releases": [
            {
                "slug": "2026",
                "title": "GENARCH 2026 Annual Report",
                "summary": (
                    f"Expanded multi-disease atlas release with {len(diseases)} diseases, "
                    f"{len(exposures)} exposures, {len(genes)} genes, and {len(pathways)} pathways."
                ),
                "date": "2026-02-26",
                "pdf_path": "/api/reports/2026/pdf",
                "report_path": "/updates/2026",
                "type": "report"
            }
        ]
    }
    _write_json(REPORTS_DIR / "releases.json", releases)
