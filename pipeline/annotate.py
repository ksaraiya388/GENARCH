"""Stage 3: annotate records with curated joins and derived metadata."""

from __future__ import annotations

from typing import Any


def annotate_bundle(bundle: dict[str, Any]) -> dict[str, Any]:
    """Attach deterministic annotations used by site rendering."""

    annotated = dict(bundle)
    graph = annotated.get("graph", {})

    type_to_route = {
        "Disease": "/atlas/diseases/{slug}",
        "Exposure": "/atlas/exposures/{slug}",
        "Gene": "/atlas/genes/{slug}",
        "Pathway": "/atlas/pathways/{slug}",
        "Tissue": "/atlas/diseases/asthma",
    }

    for node in graph.get("nodes", []):
        node_type = node.get("type")
        if node_type in type_to_route:
            node.setdefault("attrs", {})
            node["attrs"]["entity_route"] = type_to_route[node_type].format(slug=node.get("slug"))

    graph.setdefault("metadata", {})
    graph["metadata"]["node_count"] = len(graph.get("nodes", []))
    graph["metadata"]["edge_count"] = len(graph.get("edges", []))

    return annotated
