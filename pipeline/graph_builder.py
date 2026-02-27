"""Build graph.json from all entity JSON files."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pipeline import __version__


def _resolve_data_dir() -> Path:
    root = Path(__file__).resolve().parent.parent
    return root / "data"


def load_entities(data_dir: Path) -> dict[str, list[dict[str, Any]]]:
    """Load all entity JSON files."""
    result: dict[str, list[dict[str, Any]]] = {
        "diseases": [],
        "exposures": [],
        "genes": [],
        "pathways": [],
    }
    for subdir in ["diseases", "exposures", "genes", "pathways"]:
        path = data_dir / subdir
        if path.exists():
            for f in path.rglob("*.json"):
                try:
                    result[subdir].append(json.loads(f.read_text()))
                except Exception:
                    pass
    return result


def build_nodes(entities: dict[str, list[dict[str, Any]]]) -> list[dict[str, Any]]:
    """Build graph nodes from entities."""
    nodes: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()

    def add_node(nid: str, ntype: str, label: str, slug: str, attrs: dict[str, Any]) -> None:
        key = (ntype, slug)
        if key in seen:
            return
        seen.add(key)
        nodes.append({
            "id": nid,
            "type": ntype,
            "label": label,
            "slug": slug,
            "attrs": attrs,
        })

    for d in entities.get("diseases", []):
        slug = d.get("slug", d.get("id", ""))
        add_node(
            slug,
            "disease",
            d.get("name", slug),
            slug,
            {"summary": d.get("summary"), "confidence": "high", "last_updated": d.get("last_updated")},
        )

    for e in entities.get("exposures", []):
        slug = e.get("slug", e.get("id", ""))
        add_node(
            slug,
            "exposure",
            e.get("name", slug),
            slug,
            {"summary": e.get("definition", e.get("summary")), "confidence": "medium", "last_updated": e.get("last_updated")},
        )

    for g in entities.get("genes", []):
        slug = g.get("slug", g.get("symbol", g.get("id", "")))
        add_node(
            slug,
            "gene",
            g.get("symbol", g.get("name", slug)),
            slug,
            {"summary": g.get("summary"), "confidence": g.get("confidence", "medium"), "last_updated": g.get("last_updated")},
        )

    for p in entities.get("pathways", []):
        slug = p.get("slug", p.get("id", ""))
        add_node(
            slug,
            "pathway",
            p.get("name", slug),
            slug,
            {"summary": p.get("summary"), "confidence": "medium", "last_updated": p.get("last_updated")},
        )

    return nodes


def build_edges(entities: dict[str, list[dict[str, Any]]]) -> list[dict[str, Any]]:
    """Build graph edges from entity relationships."""
    edges: list[dict[str, Any]] = []
    eid = 0

    def make_id() -> str:
        nonlocal eid
        eid += 1
        return f"e{eid}"

    for d in entities.get("diseases", []):
        d_slug = d.get("slug", d.get("id", ""))
        for em in d.get("exposure_modifiers", []):
            exp_slug = em.get("exposure_slug", "")
            if exp_slug:
                edges.append({
                    "id": make_id(),
                    "source": exp_slug,
                    "target": d_slug,
                    "type": "modifier",
                    "attrs": {
                        "evidence_type": "literature",
                        "direction": em.get("direction", "unknown"),
                        "tissue": [],
                        "strength": em.get("strength", 0.5),
                        "confidence": em.get("confidence", "medium"),
                        "sources": em.get("citations", []),
                    },
                })

        arch = d.get("genetic_architecture") or {}
        for locus in arch.get("top_loci", []):
            gene = locus.get("gene", "")
            if gene:
                gene_slug = gene.lower().replace("/", "-").replace(" ", "-")
                raw_ev = locus.get("evidence", "GWAS")
                valid_evidence_types = {"GWAS", "eQTL", "pathway", "literature", "inferred"}
                evidence_type = raw_ev if raw_ev in valid_evidence_types else "GWAS"
                edges.append({
                    "id": make_id(),
                    "source": gene_slug,
                    "target": d_slug,
                    "type": "association",
                    "attrs": {
                        "evidence_type": evidence_type,
                        "direction": "unknown",
                        "tissue": [],
                        "strength": locus.get("strength", 0.5),
                        "confidence": "medium",
                        "sources": locus.get("citations", []),
                    },
                })

    for e in entities.get("exposures", []):
        exp_slug = e.get("slug", e.get("id", ""))
        for gh in e.get("gxe_highlights", []):
            gene_slug = gh.get("gene_slug", "")
            d_slug = gh.get("disease_slug", "")
            if gene_slug and d_slug:
                edges.append({
                    "id": make_id(),
                    "source": exp_slug,
                    "target": d_slug,
                    "type": "modifier",
                    "attrs": {
                        "evidence_type": gh.get("evidence_type", "literature"),
                        "direction": gh.get("direction", "unknown"),
                        "tissue": [],
                        "strength": 0.5,
                        "confidence": "medium",
                        "sources": gh.get("citations", []),
                    },
                })

    for g in entities.get("genes", []):
        gene_slug = g.get("slug", g.get("symbol", g.get("id", "")))
        for ld in g.get("linked_diseases", []):
            d_slug = ld.get("disease_slug", ld) if isinstance(ld, dict) else ld
            if d_slug and isinstance(d_slug, str):
                edges.append({
                    "id": make_id(),
                    "source": gene_slug,
                    "target": d_slug,
                    "type": "association",
                    "attrs": {
                        "evidence_type": ld.get("evidence_type", "literature") if isinstance(ld, dict) else "literature",
                        "direction": "unknown",
                        "tissue": [],
                        "strength": float(ld.get("strength", 0.5)) if isinstance(ld, dict) else 0.5,
                        "confidence": "medium",
                        "sources": [],
                    },
                })

    for p in entities.get("pathways", []):
        pw_slug = p.get("slug", p.get("id", ""))
        for ld in p.get("linked_diseases", []):
            d_slug = ld.get("disease_slug", ld) if isinstance(ld, dict) else ld
            if d_slug and isinstance(d_slug, str):
                edges.append({
                    "id": make_id(),
                    "source": pw_slug,
                    "target": d_slug,
                    "type": "pathway",
                    "attrs": {
                        "evidence_type": "pathway",
                        "direction": "unknown",
                        "tissue": [],
                        "strength": 0.5,
                        "confidence": "medium",
                        "sources": ld.get("citations", []) if isinstance(ld, dict) else [],
                    },
                })
        for kg in p.get("key_genes", []):
            gene_slug = kg.get("gene_slug", "") if isinstance(kg, dict) else kg
            if gene_slug:
                edges.append({
                    "id": make_id(),
                    "source": gene_slug,
                    "target": pw_slug,
                    "type": "pathway",
                    "attrs": {
                        "evidence_type": "pathway",
                        "direction": "unknown",
                        "tissue": [],
                        "strength": 0.5,
                        "confidence": "medium",
                        "sources": kg.get("citations", []),
                    },
                })

    return edges


def build_graph() -> dict[str, Any]:
    """Build full graph structure."""
    from datetime import datetime

    data_dir = _resolve_data_dir()
    entities = load_entities(data_dir)
    nodes = build_nodes(entities)
    edges = build_edges(entities)

    return {
        "nodes": nodes,
        "edges": edges,
        "metadata": {
            "generated_at": datetime.utcnow().strftime("%Y-%m-%d"),
            "pipeline_version": __version__,
            "node_count": len(nodes),
            "edge_count": len(edges),
            "schema_version": "1.0",
        },
    }


def write_graph(graph: dict[str, Any], out_path: Path | None = None) -> Path:
    """Write graph.json to data/graph/."""
    data_dir = _resolve_data_dir()
    path = out_path or data_dir / "graph" / "graph.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(graph, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return path


def run_build() -> int:
    """Build and write graph. Returns 0 on success."""
    try:
        graph = build_graph()
        path = write_graph(graph)
        print(f"Graph built: {path} ({len(graph['nodes'])} nodes, {len(graph['edges'])} edges)")
        return 0
    except Exception as e:
        print(f"ERROR: {e}", file=__import__("sys").stderr)
        return 1
