"""Stage 2: normalize source records."""

from __future__ import annotations

from typing import Any


def _normalize_slug(value: str) -> str:
    return value.strip().lower().replace("_", "-").replace(" ", "-")


def _normalize_citation_id(value: str) -> str:
    return value.strip().lower().replace(" ", "_")


def normalize_bundle(bundle: dict[str, Any]) -> dict[str, Any]:
    """Normalize slugs and citation IDs while preserving schema."""

    normalized = dict(bundle)

    for section in ("diseases", "exposures", "genes", "pathways", "community"):
        for entry in normalized.get(section, []):
            if "slug" in entry:
                entry["slug"] = _normalize_slug(str(entry["slug"]))

    # Graph node and edge citation normalization.
    graph = normalized.get("graph", {})
    for node in graph.get("nodes", []):
        node["slug"] = _normalize_slug(str(node["slug"]))

    for edge in graph.get("edges", []):
        attrs = edge.get("attrs", {})
        attrs["sources"] = [_normalize_citation_id(str(citation)) for citation in attrs.get("sources", [])]

    # Normalize reference IDs.
    for section in ("diseases", "exposures", "genes", "pathways", "community"):
        for entry in normalized.get(section, []):
            for reference in entry.get("references", []):
                reference["id"] = _normalize_citation_id(str(reference["id"]))
            for row in entry.get("evidence_table", []):
                row["citations"] = [_normalize_citation_id(str(citation)) for citation in row.get("citations", [])]

    return normalized
