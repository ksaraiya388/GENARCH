"""The atlas half of the report: module inventory and the mechanism chain.

Both read only the atlas records `FREEZE.json` pins under `atlas_inputs`, each
hash-verified on the way in, so a count cannot move under the report without the
run failing.

Two things are deliberately absent.

No brief title, question or entity prose is quoted. The inventory reports counts.
AUDIT.md item 16 holds that quoting brief titles in the module inventory needs a
ruling, and the D8 rewrites are not approved, so the inventory counts the briefs
and names none of them.

The knowledge graph's counts come with a status rather than without one. The
published graph is not reproducible from the current pipeline: a clean rebuild
yields different counts, so the committed 97 nodes and 165 edges are reported as
the live published figures and marked as such (DECISIONS.md D25).
"""

from __future__ import annotations

import json

from pipeline.report_lib.freeze import ATLAS_MODULES, Freeze

GRAPH_MODULE = "knowledge_graph"
GRAPH_PATH = "data/graph/graph.json"

# D25, verbatim: the status the inventory and T08 both carry for the graph.
GRAPH_STATUS = "live; not reproducible from current pipeline (D25)"
MODULE_STATUS = "live; emitted by the current pipeline"

MODULE_LABELS = {
    "diseases": "Disease records",
    "exposures": "Exposure records",
    "genes": "Gene records",
    "pathways": "Pathway records",
    "mechanism_briefs": "Mechanism briefs",
    "community_regions": "Community regions",
    "ancestry_modules": "Cross-ancestry modules",
    GRAPH_MODULE: "Knowledge graph",
}

# The published five-step chain, as `buildIl33Chain()` in site/src/lib/figure-data.ts
# composes it for the `il33-pm25-chain` figure. Six nodes, five links.
CHAIN_FIGURE_ID = "il33-pm25-chain"
CHAIN_BRIEF = "pm25-il33-nfkb-asthma"
CHAIN_GENE = "il33"
CHAIN_DISEASE = "asthma"
CHAIN_EXPOSURE = "air-pollution"

CHAIN_NODES = (
    "PM2.5 particulate",
    "Bronchial epithelial injury",
    "IL-33 release",
    "ST2 on ILC2",
    "Type 2 inflammation",
    "Asthma exacerbation",
)

# Steps 2, 3 and 4 carry the evidence class the figure definition assigns them. They
# are not read from an atlas field, and the table says so per row rather than letting
# a reader assume every class came from a record.
_FIXED_CLASSES = {2: "functional", 3: "functional", 4: "inferred"}
_FIGURE_SOURCE = "GENARCH figure definition (site/src/lib/figure-data.ts)"


def _read(fz: Freeze, rel_path: str) -> dict:
    return json.loads(fz.atlas_path(rel_path).read_text(encoding="utf-8"))


# ------------------------------------------------------------------ inventory


def inventory(fz: Freeze) -> dict:
    """Module record counts, plus the graph's node and edge counts and its status."""
    frozen_at = fz.atlas_frozen_at()
    modules = []
    for module, rel_dir in ATLAS_MODULES:
        records = fz.atlas_files(module)
        entry = {
            "module": module,
            "label": MODULE_LABELS[module],
            "dir": rel_dir,
            "record_count": len(records),
            "status": GRAPH_STATUS if module == GRAPH_MODULE else MODULE_STATUS,
        }
        modules.append(entry)

    graph = _read(fz, GRAPH_PATH)
    metadata = graph.get("metadata", {})
    graph_counts = {
        "node_count": len(graph["nodes"]),
        "edge_count": len(graph["edges"]),
        "metadata_node_count": metadata.get("node_count"),
        "metadata_edge_count": metadata.get("edge_count"),
        "generated_at": metadata.get("generated_at"),
    }
    if graph_counts["node_count"] != graph_counts["metadata_node_count"]:
        raise ValueError(
            f"{GRAPH_PATH}: {graph_counts['node_count']} nodes against "
            f"metadata.node_count {graph_counts['metadata_node_count']}"
        )
    if graph_counts["edge_count"] != graph_counts["metadata_edge_count"]:
        raise ValueError(
            f"{GRAPH_PATH}: {graph_counts['edge_count']} edges against "
            f"metadata.edge_count {graph_counts['metadata_edge_count']}"
        )

    return {
        "frozen_at": frozen_at,
        "modules": modules,
        "graph": graph_counts,
        "record_total": sum(m["record_count"] for m in modules),
    }


# ---------------------------------------------------------------------- chain


def chain(fz: Freeze) -> dict:
    """The five mechanism-chain links, each with its evidence class and that class's source."""
    gene = _read(fz, f"data/genes/{CHAIN_GENE}.json")
    disease = _read(fz, f"data/diseases/{CHAIN_DISEASE}.json")
    brief = _read(fz, f"data/briefs/{CHAIN_BRIEF}.json")

    exposure_link = next(
        link for link in gene["linked_exposures"] if link["exposure_slug"] == CHAIN_EXPOSURE
    )
    disease_link = next(
        link for link in gene["linked_diseases"] if link["disease_slug"] == CHAIN_DISEASE
    )
    modifier = next(
        m for m in disease["exposure_modifiers"] if m["exposure_slug"] == CHAIN_EXPOSURE
    )

    gene_record = f"data/genes/{CHAIN_GENE}.json"
    sources = {
        1: (
            exposure_link["evidence_type"],
            f"{gene_record} linked_exposures[{CHAIN_EXPOSURE}].evidence_type",
        ),
        5: (
            disease_link["evidence_type"],
            f"{gene_record} linked_diseases[{CHAIN_DISEASE}].evidence_type",
        ),
    }

    steps = []
    for index in range(1, len(CHAIN_NODES)):
        evidence_class, source = sources.get(
            index, (_FIXED_CLASSES.get(index), _FIGURE_SOURCE)
        )
        if evidence_class is None:
            raise ValueError(f"no evidence class for chain step {index}")
        steps.append(
            {
                "step": index,
                "from": CHAIN_NODES[index - 1],
                "to": CHAIN_NODES[index],
                "evidence_class": evidence_class,
                "evidence_class_source": source,
                "from_an_atlas_record": index in sources,
                "inferred": evidence_class == "inferred",
            }
        )

    return {
        "figure_id": CHAIN_FIGURE_ID,
        "brief": CHAIN_BRIEF,
        "gene": CHAIN_GENE,
        "disease": CHAIN_DISEASE,
        "exposure": CHAIN_EXPOSURE,
        "steps": steps,
        "confidence": modifier["confidence"],
        "direction": modifier["direction"],
        "reference_count": len(brief["references"]),
        "brief_published_at": brief["published_at"],
        "inferred_steps": sum(1 for s in steps if s["inferred"]),
    }
