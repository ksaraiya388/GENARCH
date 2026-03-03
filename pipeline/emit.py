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

    _write_json(
        Path("data/synonyms.json"),
        {
            "asthma": ["bronchial asthma", "reactive airway disease"],
            "air-pollution": ["pm2.5", "particulate matter", "ambient pollution"],
            "il33": ["interleukin 33", "il-33"],
            "nf-kb-signaling": ["nf-kb", "nuclear factor kappa b"]
        },
    )

    releases = {
        "schema_version": "1.0",
        "last_updated": bundle["last_updated"],
        "releases": [
            {
                "slug": "2026",
                "title": "GENARCH 2026 Annual Report",
                "summary": "Initial v1 release with asthma-air pollution seed atlas, graph, and community module.",
                "date": "2026-02-26",
                "pdf_path": "/api/reports/2026/pdf",
                "report_path": "/updates/2026",
                "type": "report"
            }
        ]
    }
    _write_json(REPORTS_DIR / "releases.json", releases)
