"""Schema validation, cross-link validation, and citation validation."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from pipeline.schemas import (
    CommunitySchema,
    DiseaseSchema,
    ExposureSchema,
    GeneSchema,
    GraphSchema,
    PathwaySchema,
)


def _resolve_data_dir() -> Path:
    """Resolve data directory relative to repo root."""
    root = Path(__file__).resolve().parent.parent
    return root / "data"


def _collect_json_files(data_dir: Path) -> dict[str, list[Path]]:
    """Collect JSON files by entity type (directory name)."""
    by_type: dict[str, list[Path]] = {}
    dirs = ["diseases", "exposures", "genes", "pathways", "community", "graph", "briefs", "reports"]
    for subdir in dirs:
        path = data_dir / subdir
        if path.exists():
            by_type[subdir] = sorted(path.rglob("*.json"))
    return by_type


def _schema_for_type(entity_type: str):
    """Return Pydantic schema for entity type."""
    schemas = {
        "diseases": DiseaseSchema,
        "exposures": ExposureSchema,
        "genes": GeneSchema,
        "pathways": PathwaySchema,
        "community": CommunitySchema,
        "graph": GraphSchema,
    }
    return schemas.get(entity_type)


def _validate_schema(
    entity_type: str,
    filepath: Path,
    raw: dict,
    errors: list[str],
) -> dict | None:
    """Validate JSON against Pydantic schema. Returns parsed model or None."""
    schema_cls = _schema_for_type(entity_type)
    if schema_cls is None:
        return raw  # briefs, reports - no strict schema
    try:
        return schema_cls.model_validate(raw).model_dump()
    except Exception as e:
        errors.append(f"{filepath}: Schema validation failed: {e}")
        return None


def _collect_slugs(data_dir: Path) -> dict[str, set[str]]:
    """Collect all slugs by entity type from JSON files."""
    slugs: dict[str, set[str]] = {
        "disease": set(),
        "exposure": set(),
        "gene": set(),
        "pathway": set(),
    }
    for subdir, slug_key in [
        ("diseases", "disease"),
        ("exposures", "exposure"),
        ("genes", "gene"),
        ("pathways", "pathway"),
    ]:
        path = data_dir / subdir
        if not path.exists():
            continue
        for f in path.rglob("*.json"):
            try:
                raw = json.loads(f.read_text())
                s = raw.get("slug") or raw.get("region_id")
                if s:
                    slugs[slug_key].add(s)
            except Exception:
                pass
    return slugs


def _collect_citation_ids(data_dir: Path) -> set[str]:
    """Collect all reference IDs from entity JSON files."""
    ref_ids: set[str] = set()
    for subdir in ["diseases", "exposures", "genes", "pathways", "community", "briefs"]:
        path = data_dir / subdir
        if not path.exists():
            continue
        for f in path.rglob("*.json"):
            try:
                raw = json.loads(f.read_text())
                for ref in raw.get("references", []):
                    if isinstance(ref, dict) and ref.get("id"):
                        ref_ids.add(str(ref["id"]))
            except Exception:
                pass
    return ref_ids


def _collect_referenced_slugs(data_dir: Path) -> dict[str, list[tuple[Path, str]]]:
    """Collect referenced slugs with (filepath, slug) for cross-link check."""
    refs: dict[str, list[tuple[Path, str]]] = {
        "disease": [],
        "exposure": [],
        "gene": [],
        "pathway": [],
    }

    def add_ref(typ: str, fp: Path, slug: str) -> None:
        if slug:
            refs[typ].append((fp, slug))

    for subdir in ["diseases", "exposures", "genes", "pathways", "community", "briefs"]:
        path = data_dir / subdir
        if not path.exists():
            continue
        for f in path.rglob("*.json"):
            try:
                raw = json.loads(f.read_text())
                for em in raw.get("exposure_modifiers", []):
                    add_ref("exposure", f, em.get("exposure_slug", ""))
                for gh in raw.get("gxe_highlights", []):
                    add_ref("gene", f, gh.get("gene_slug", ""))
                    add_ref("disease", f, gh.get("disease_slug", ""))
                for ld in raw.get("linked_diseases", []):
                    add_ref("disease", f, ld.get("disease_slug", ""))
                for le in raw.get("linked_exposures", []):
                    add_ref("exposure", f, le.get("exposure_slug", ""))
                for et in raw.get("environmental_triggers", []):
                    add_ref("exposure", f, et.get("exposure_slug", ""))
                for kg in raw.get("key_genes", []):
                    add_ref("gene", f, kg.get("gene_slug", ""))
                for hs in raw.get("health_stats", []):
                    add_ref("disease", f, hs.get("disease_slug", ""))
                for rpg in raw.get("related_genes", []):
                    add_ref("gene", f, rpg)
                if raw.get("related_disease"):
                    add_ref("disease", f, raw["related_disease"])
                if raw.get("related_exposure"):
                    add_ref("exposure", f, raw["related_exposure"])
                for rp in raw.get("related_pathways", []):
                    add_ref("pathway", f, rp)
                for pw in raw.get("pathways", []):
                    add_ref("pathway", f, pw)
            except Exception:
                pass
    return refs


def _collect_citation_refs(data_dir: Path) -> list[tuple[Path, str]]:
    """Collect all citation ID references (filepath, citation_id)."""
    refs: list[tuple[Path, str]] = []
    for subdir in ["diseases", "exposures", "genes", "pathways", "community", "briefs"]:
        path = data_dir / subdir
        if not path.exists():
            continue
        for f in path.rglob("*.json"):
            try:
                raw = json.loads(f.read_text())

                def collect_citations(obj: object) -> None:
                    if isinstance(obj, dict):
                        if "citations" in obj and isinstance(obj["citations"], list):
                            for c in obj["citations"]:
                                if isinstance(c, str) and c:
                                    refs.append((f, c))
                        for v in obj.values():
                            collect_citations(v)
                    elif isinstance(obj, list):
                        for v in obj:
                            collect_citations(v)

                collect_citations(raw)
            except Exception:
                pass
    return refs


def validate() -> int:
    """Run all validations. Returns 0 on success, 1 on any error."""
    data_dir = _resolve_data_dir()
    errors: list[str] = []

    if not data_dir.exists():
        errors.append(f"Data directory does not exist: {data_dir}")
        for e in errors:
            print(f"ERROR: {e}", file=sys.stderr)
        return 1

    # 1. Schema validation
    by_type = _collect_json_files(data_dir)
    parsed: dict[str, list[dict]] = {
        "diseases": [],
        "exposures": [],
        "genes": [],
        "pathways": [],
        "community": [],
        "graph": [],
    }

    for entity_type, files in by_type.items():
        for fp in files:
            try:
                raw = json.loads(fp.read_text())
            except json.JSONDecodeError as e:
                errors.append(f"{fp}: Invalid JSON: {e}")
                continue
            result = _validate_schema(entity_type, fp, raw, errors)
            if result is not None and entity_type in parsed:
                parsed[entity_type].append(result)

    # 2. Cross-link validation
    slugs = _collect_slugs(data_dir)
    ref_slugs = _collect_referenced_slugs(data_dir)

    for typ, ref_list in ref_slugs.items():
        valid = slugs.get(typ, set())
        for fp, slug in ref_list:
            if slug and slug not in valid:
                errors.append(f"{fp}: Referenced {typ} slug '{slug}' does not exist")

    # 3. Citation validation
    citation_ids = _collect_citation_ids(data_dir)
    citation_refs = _collect_citation_refs(data_dir)

    for fp, cid in citation_refs:
        if cid and cid not in citation_ids:
            # Allow PMID/DOI-style references
            if not (cid.startswith("PMID:") or cid.startswith("doi:") or cid.startswith("http")):
                errors.append(f"{fp}: Citation ID '{cid}' does not exist in references")

    # Output
    if errors:
        for e in errors:
            print(f"ERROR: {e}", file=sys.stderr)
        return 1
    print("Validation passed: all schemas, cross-links, and citations OK.")
    return 0


if __name__ == "__main__":
    sys.exit(validate())
