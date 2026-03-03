"""Stage 4: deterministic evidence scoring utilities."""

from __future__ import annotations

from collections import Counter
from typing import Any


def confidence_from_strength(strength: float, evidence_types: set[str]) -> str:
    """Assign confidence tier from explicit rules in METHODS.md."""

    if strength >= 0.7 and len(evidence_types) >= 2:
        return "high"
    if 0.4 <= strength < 0.7 or (strength >= 0.7 and len(evidence_types) == 1):
        return "medium"
    return "low"


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def score_bundle(bundle: dict[str, Any]) -> dict[str, Any]:
    """Normalize precomputed strengths and derive confidence where missing."""

    scored = dict(bundle)

    for disease in scored.get("diseases", []):
        evidence_types = {row["evidence_type"] for row in disease.get("evidence_table", [])}
        for modifier in disease.get("exposure_modifiers", []):
            modifier["strength"] = round(_clamp(float(modifier["strength"])), 3)
            modifier["confidence"] = confidence_from_strength(
                float(modifier["strength"]),
                evidence_types,
            )
        for locus in disease.get("genetic_architecture", {}).get("top_loci", []):
            locus["strength"] = round(_clamp(float(locus["strength"])), 3)

    for gene in scored.get("genes", []):
        evidence_types = {row["evidence_type"] for row in gene.get("evidence_table", [])}
        strengths: list[float] = [
            item["strength"] for item in gene.get("pathways", []) + gene.get("linked_diseases", []) + gene.get("linked_exposures", [])
        ]
        average_strength = sum(strengths) / len(strengths) if strengths else 0.0
        gene["confidence"] = confidence_from_strength(float(average_strength), evidence_types)

    for edge in scored.get("graph", {}).get("edges", []):
        attrs = edge.get("attrs", {})
        attrs["strength"] = round(_clamp(float(attrs.get("strength", 0.0))), 3)
        attrs["confidence"] = confidence_from_strength(
            float(attrs["strength"]),
            {str(attrs.get("evidence_type", "inferred"))},
        )

    # Keep deterministic ordering for graph edges by strength desc.
    graph_edges = scored.get("graph", {}).get("edges", [])
    graph_edges.sort(key=lambda edge: (-edge.get("attrs", {}).get("strength", 0), edge.get("id", "")))

    # Track evidence diversity metrics in graph metadata.
    evidence_counter = Counter(edge["attrs"]["evidence_type"] for edge in graph_edges)
    scored["graph"]["metadata"]["evidence_type_counts"] = dict(evidence_counter)

    return scored
