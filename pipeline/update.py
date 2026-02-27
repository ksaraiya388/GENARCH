"""Orchestrate pipeline stages: ingest → normalize → annotate → score → emit → validate."""

from __future__ import annotations

import sys
from pathlib import Path

from pipeline import __version__
from pipeline.annotate import annotate_all
from pipeline.emit import emit_all
from pipeline.graph_builder import build_graph, write_graph
from pipeline.ingest import ingest_all
from pipeline.normalize import normalize_all
from pipeline.score import score_all
from pipeline.validate import validate


def _resolve_data_dir() -> Path:
    root = Path(__file__).resolve().parent.parent
    return root / "data"


def run_update(scope: str = "all", entity_id: str | None = None) -> int:
    """
    Run full pipeline. scope: all | disease | exposure | gene | pathway.
    entity_id: optional filter (e.g. asthma for disease).
    """
    # Ingest
    ingested = ingest_all()

    # Filter by scope/id if requested
    if scope != "all" and entity_id:
        key = f"{scope}s"  # diseases, exposures, genes, pathways
        if key in ingested and ingested[key]:
            filtered = [x for x in ingested[key] if (x.get("slug") or x.get("id") or x.get("name", "")) == entity_id]
            if filtered:
                ingested[key] = filtered
            else:
                # Try slug match
                ingested[key] = [
                    x for x in ingested[key]
                    if (x.get("slug") or "").lower() == entity_id.lower()
                    or (x.get("id") or "").lower() == entity_id.lower()
                ]

    # Normalize
    normalized = normalize_all(ingested)

    # Annotate
    annotated = annotate_all(normalized)

    # Score
    scored = score_all(annotated)

    # Emit
    written = emit_all(scored)
    for p in written:
        print(f"Emitted: {p}")

    # Build graph (from emitted data)
    data_dir = _resolve_data_dir()
    graph = build_graph()
    graph_path = write_graph(graph)
    print(f"Graph built: {graph_path}")

    # Validate (returns 0 or 1)
    return validate()


if __name__ == "__main__":
    scope = "all"
    entity_id = None
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--scope" and i + 1 < len(args):
            scope = args[i + 1]
            i += 2
            continue
        if args[i] == "--id" and i + 1 < len(args):
            entity_id = args[i + 1]
            i += 2
            continue
        i += 1

    sys.exit(run_update(scope=scope, entity_id=entity_id))
