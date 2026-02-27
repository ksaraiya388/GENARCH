"""Standardize IDs, slugs, citation IDs, and evidence type enums."""

from __future__ import annotations

import re
from typing import Any


EVIDENCE_TYPES = {"GWAS", "eQTL", "pathway", "literature", "inferred"}


def slugify(s: str) -> str:
    """Convert string to URL-safe slug (lowercase, hyphens)."""
    if not s:
        return ""
    s = s.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[-\s]+", "-", s)
    return s.strip("-")


def normalize_evidence_type(v: Any) -> str:
    """Normalize evidence type to allowed enum value."""
    if not v:
        return "literature"
    s = str(v).strip()
    for et in EVIDENCE_TYPES:
        if et.lower() == s.lower():
            return et
    return "literature"


def normalize_direction(v: Any) -> str:
    """Normalize direction to allowed value."""
    allowed = {"amplify", "buffer", "unknown", "bidirectional"}
    if not v:
        return "unknown"
    s = str(v).strip().lower()
    if s in allowed:
        return s
    return "unknown"


def normalize_confidence(v: Any) -> str:
    """Normalize confidence to allowed value."""
    allowed = {"low", "medium", "high"}
    if not v:
        return "medium"
    s = str(v).strip().lower()
    if s in allowed:
        return s
    return "medium"


def normalize_citation_id(v: Any) -> str:
    """Normalize citation ID (trim, preserve PMID/doi format)."""
    if v is None:
        return ""
    s = str(v).strip()
    return s


def normalize_entity(row: dict[str, Any], slug_field: str = "name") -> dict[str, Any]:
    """Normalize a single entity row: ensure slug, id, evidence types."""
    out = dict(row)
    if "slug" not in out or not out["slug"]:
        out["slug"] = slugify(out.get(slug_field, ""))
    if "id" not in out or not out["id"]:
        out["id"] = out.get("slug", "")
    return out


def normalize_diseases(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Normalize disease rows."""
    result = []
    for r in rows:
        n = normalize_entity(r, "name")
        for em in n.get("exposure_modifiers", []):
            if isinstance(em, dict):
                em["direction"] = normalize_direction(em.get("direction"))
        for t in n.get("top_loci", n.get("genetic_architecture", {}).get("top_loci", [])):
            if isinstance(t, dict) and "evidence" in t:
                t["evidence"] = normalize_evidence_type(t.get("evidence"))
        result.append(n)
    return result


def normalize_exposures(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Normalize exposure rows."""
    result = []
    for r in rows:
        n = normalize_entity(r, "name")
        for gh in n.get("gxe_highlights", []):
            if isinstance(gh, dict):
                gh["direction"] = normalize_direction(gh.get("direction"))
        result.append(n)
    return result


def normalize_genes(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Normalize gene rows."""
    return [normalize_entity(r, "symbol") for r in rows]


def normalize_pathways(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Normalize pathway rows."""
    return [normalize_entity(r, "name") for r in rows]


def normalize_all(ingested: dict[str, Any]) -> dict[str, Any]:
    """Normalize all ingested data."""
    out: dict[str, Any] = {}
    if ingested.get("diseases"):
        out["diseases"] = normalize_diseases(ingested["diseases"])
    else:
        out["diseases"] = []

    if ingested.get("exposures"):
        out["exposures"] = normalize_exposures(ingested["exposures"])
    else:
        out["exposures"] = []

    if ingested.get("genes"):
        out["genes"] = normalize_genes(ingested["genes"])
    else:
        out["genes"] = []

    if ingested.get("pathways"):
        out["pathways"] = normalize_pathways(ingested["pathways"])
    else:
        out["pathways"] = []

    out["variants"] = ingested.get("variants", [])
    out["tissues"] = ingested.get("tissues", [])
    out["citations"] = ingested.get("citations", [])

    return out
