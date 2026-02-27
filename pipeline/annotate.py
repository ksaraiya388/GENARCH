"""Map variant→gene, attach tissues/pathways via lookup tables."""

from __future__ import annotations

from typing import Any


def build_variant_gene_map(variants: list[dict[str, Any]]) -> dict[str, str]:
    """Build mapping from variant ID/rsid to gene symbol."""
    m: dict[str, str] = {}
    for v in variants:
        var_id = v.get("variant") or v.get("rsid") or v.get("id") or ""
        gene = v.get("gene") or v.get("gene_symbol") or ""
        if var_id and gene:
            m[str(var_id).strip()] = str(gene).strip()
    return m


def build_tissue_lookup(tissues: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Build tissue name -> metadata lookup."""
    m: dict[str, dict[str, Any]] = {}
    for t in tissues:
        name = t.get("name") or t.get("tissue") or ""
        if name:
            m[str(name).strip().lower()] = t
    return m


def annotate_locus(
    locus: dict[str, Any],
    variant_gene_map: dict[str, str],
) -> dict[str, Any]:
    """Annotate a TopLocus with gene from variant if missing."""
    out = dict(locus)
    if not out.get("gene") and out.get("variant"):
        gene = variant_gene_map.get(str(out["variant"]).strip())
        if gene:
            out["gene"] = gene
    return out


def annotate_disease(
    disease: dict[str, Any],
    variant_gene_map: dict[str, str],
    tissue_lookup: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Annotate disease with variant→gene mapping and tissue metadata."""
    out = dict(disease)
    arch = out.get("genetic_architecture") or {}
    if isinstance(arch, dict):
        arch = dict(arch)
        loci = arch.get("top_loci") or []
        arch["top_loci"] = [
            annotate_locus(l, variant_gene_map) for l in loci if isinstance(l, dict)
        ]
        out["genetic_architecture"] = arch
    tissues = out.get("tissues") or []
    new_tissues = []
    for t in tissues:
        if not isinstance(t, dict):
            new_tissues.append(t)
            continue
        nt = dict(t)
        name = nt.get("name", "")
        meta = tissue_lookup.get(name.strip().lower()) if name else None
        if meta:
            if "relevance_score" not in nt and "relevance_score" in meta:
                nt["relevance_score"] = meta["relevance_score"]
            if "evidence_type" not in nt and "evidence_type" in meta:
                nt["evidence_type"] = meta["evidence_type"]
        new_tissues.append(nt)
    out["tissues"] = new_tissues
    return out


def annotate_gene(
    gene: dict[str, Any],
    pathway_slugs: list[str],
) -> dict[str, Any]:
    """Annotate gene with pathway slugs if provided."""
    out = dict(gene)
    if pathway_slugs and "pathways" not in out:
        out["pathways"] = pathway_slugs
    return out


def annotate_pathway(
    pathway: dict[str, Any],
    gene_slugs: list[str],
) -> dict[str, Any]:
    """Annotate pathway with key gene slugs if provided."""
    out = dict(pathway)
    if gene_slugs:
        existing = out.get("key_genes") or []
        existing_slugs = {g.get("gene_slug") for g in existing if isinstance(g, dict)}
        for gs in gene_slugs:
            if gs and gs not in existing_slugs:
                existing.append({"gene_slug": gs, "role_in_pathway": "implicated", "citations": []})
                existing_slugs.add(gs)
        out["key_genes"] = existing
    return out


def annotate_all(
    normalized: dict[str, Any],
) -> dict[str, Any]:
    """Annotate all entities."""
    variant_gene_map = build_variant_gene_map(normalized.get("variants", []))
    tissue_lookup = build_tissue_lookup(normalized.get("tissues", []))

    out: dict[str, Any] = {}
    out["diseases"] = [
        annotate_disease(d, variant_gene_map, tissue_lookup)
        for d in normalized.get("diseases", [])
    ]
    out["exposures"] = list(normalized.get("exposures", []))
    out["genes"] = [
        annotate_gene(g, g.get("pathways", []))
        for g in normalized.get("genes", [])
    ]
    out["pathways"] = [
        annotate_pathway(
            p,
            [g.get("gene_slug") for g in (p.get("key_genes") or []) if isinstance(g, dict) and g.get("gene_slug")],
        )
        for p in normalized.get("pathways", [])
    ]
    out["variants"] = normalized.get("variants", [])
    out["tissues"] = normalized.get("tissues", [])
    out["citations"] = normalized.get("citations", [])

    return out
