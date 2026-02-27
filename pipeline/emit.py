"""Write JSON files to data/ directories."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def _resolve_data_dir() -> Path:
    root = Path(__file__).resolve().parent.parent
    return root / "data"


def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def emit_disease(disease: dict[str, Any], data_dir: Path) -> Path:
    """Write single disease JSON."""
    slug = disease.get("slug") or disease.get("id") or "unknown"
    out_dir = data_dir / "diseases"
    _ensure_dir(out_dir)
    out_path = out_dir / f"{slug}.json"
    out_path.write_text(json.dumps(disease, indent=2, ensure_ascii=False), encoding="utf-8")
    return out_path


def emit_exposure(exposure: dict[str, Any], data_dir: Path) -> Path:
    """Write single exposure JSON."""
    slug = exposure.get("slug") or exposure.get("id") or "unknown"
    out_dir = data_dir / "exposures"
    _ensure_dir(out_dir)
    out_path = out_dir / f"{slug}.json"
    out_path.write_text(json.dumps(exposure, indent=2, ensure_ascii=False), encoding="utf-8")
    return out_path


def emit_gene(gene: dict[str, Any], data_dir: Path) -> Path:
    """Write single gene JSON."""
    slug = gene.get("slug") or gene.get("symbol") or gene.get("id") or "unknown"
    out_dir = data_dir / "genes"
    _ensure_dir(out_dir)
    out_path = out_dir / f"{slug}.json"
    out_path.write_text(json.dumps(gene, indent=2, ensure_ascii=False), encoding="utf-8")
    return out_path


def emit_pathway(pathway: dict[str, Any], data_dir: Path) -> Path:
    """Write single pathway JSON."""
    slug = pathway.get("slug") or pathway.get("id") or "unknown"
    out_dir = data_dir / "pathways"
    _ensure_dir(out_dir)
    out_path = out_dir / f"{slug}.json"
    out_path.write_text(json.dumps(pathway, indent=2, ensure_ascii=False), encoding="utf-8")
    return out_path


def to_disease_schema(raw: dict[str, Any], schema_version: str, last_updated: str) -> dict[str, Any]:
    """Convert raw scored data to DiseaseSchema-compatible dict."""
    arch = raw.get("genetic_architecture") or {}
    top_loci = []
    for t in arch.get("top_loci", []):
        top_loci.append({
            "gene": t.get("gene", ""),
            "variant": t.get("variant"),
            "gwas_p": t.get("gwas_p"),
            "effect_size": t.get("effect_size"),
            "ancestry_composition": t.get("ancestry_composition"),
            "replication_status": t.get("replication_status"),
            "evidence": t.get("evidence", "literature"),
            "strength": float(t.get("strength", 0.5)),
            "citations": t.get("citations", []),
        })
    h2 = arch.get("heritability_estimate")
    if h2:
        h2 = {
            "h2_snp": float(h2.get("h2_snp", 0)),
            "h2_narrow_sense": h2.get("h2_narrow_sense"),
            "source": h2.get("source", ""),
            "year": int(h2.get("year", 0)),
        }
    mods = []
    for m in raw.get("exposure_modifiers", []):
        d = m.get("direction", "unknown")
        if isinstance(d, str) and d not in ("amplify", "buffer", "unknown", "bidirectional"):
            d = "unknown"
        mods.append({
            "exposure_slug": m.get("exposure_slug", ""),
            "direction": d,
            "strength": float(m.get("strength", 0.5)),
            "confidence": m.get("confidence", "medium"),
            "mechanism_hypothesis": m.get("mechanism_hypothesis"),
            "citations": m.get("citations", []),
        })
    tissues = []
    for t in raw.get("tissues", []):
        tissues.append({
            "name": t.get("name", ""),
            "relevance_score": float(t.get("relevance_score", 0.5)),
            "evidence_type": t.get("evidence_type"),
            "citations": t.get("citations", []),
        })
    pe = raw.get("population_equity") or {}
    refs = raw.get("references", [])
    return {
        "id": raw.get("id", raw.get("slug", "")),
        "slug": raw.get("slug", ""),
        "name": raw.get("name", ""),
        "icd11_code": raw.get("icd11_code"),
        "summary": raw.get("summary", ""),
        "adolescent_relevance": raw.get("adolescent_relevance", ""),
        "genetic_architecture": {
            "top_loci": top_loci,
            "heritability_estimate": h2,
            "prs_notes": arch.get("prs_notes", ""),
        },
        "exposure_modifiers": mods,
        "tissues": tissues,
        "population_equity": {
            "gwas_ancestry_breakdown": pe.get("gwas_ancestry_breakdown", ""),
            "transferability_notes": pe.get("transferability_notes", ""),
            "data_gaps": pe.get("data_gaps", ""),
        },
        "mechanism_briefs": raw.get("mechanism_briefs", []),
        "references": refs,
        "schema_version": schema_version,
        "last_updated": last_updated,
    }


def emit_all(
    scored: dict[str, Any],
    schema_version: str = "1.0",
    last_updated: str | None = None,
) -> list[Path]:
    """Emit all entity JSON files. Returns list of written paths."""
    from datetime import datetime

    data_dir = _resolve_data_dir()
    ts = last_updated or datetime.utcnow().strftime("%Y-%m-%d")
    written: list[Path] = []

    for d in scored.get("diseases", []):
        obj = to_disease_schema(d, schema_version, ts)
        written.append(emit_disease(obj, data_dir))

    for e in scored.get("exposures", []):
        e = dict(e)
        e.setdefault("schema_version", schema_version)
        e.setdefault("last_updated", ts)
        written.append(emit_exposure(e, data_dir))

    for g in scored.get("genes", []):
        g = dict(g)
        g.setdefault("schema_version", schema_version)
        g.setdefault("last_updated", ts)
        written.append(emit_gene(g, data_dir))

    for p in scored.get("pathways", []):
        p = dict(p)
        p.setdefault("schema_version", schema_version)
        p.setdefault("last_updated", ts)
        written.append(emit_pathway(p, data_dir))

    return written
