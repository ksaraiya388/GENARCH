"""Stage 6: strict schema and integrity validation."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from .models import (
    CommunityData,
    DiseaseData,
    ExposureData,
    GeneData,
    GraphData,
    PathwayData,
    collect_reference_ids,
    validate_citations_exist,
)
from .paths import BRIEFS_DIR, COMMUNITY_DIR, DISEASES_DIR, EXPOSURES_DIR, GENES_DIR, GRAPH_DIR, PATHWAYS_DIR


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _iter_entity_files(directory: Path) -> list[Path]:
    return sorted(path for path in directory.glob("*.json") if path.name != "index.json")


def _validate_entity_citations(
    disease: DiseaseData | ExposureData | GeneData | PathwayData,
    context: str,
    errors: list[str],
) -> None:
    citation_lists: list[list[str]] = []
    for row in disease.evidence_table:
        citation_lists.append(row.citations)

    if isinstance(disease, DiseaseData):
        citation_lists.extend([locus.citations for locus in disease.genetic_architecture.top_loci])
        citation_lists.extend([modifier.citations for modifier in disease.exposure_modifiers])
        citation_lists.extend([tissue.citations for tissue in disease.tissues])
        citation_lists.extend([point.citations for point in disease.risk_shift_data])
        citation_lists.extend([cell.citations for cell in disease.tissue_relevance_matrix])
    elif isinstance(disease, ExposureData):
        citation_lists.extend([window.citations for window in disease.sensitive_windows])
        citation_lists.extend([highlight.citations for highlight in disease.gxe_highlights])
        citation_lists.extend([tissue.citations for tissue in disease.tissues])
    elif isinstance(disease, GeneData):
        citation_lists.extend([context.citations for context in disease.expression_context])
    elif isinstance(disease, PathwayData):
        citation_lists.extend([trigger.citations for trigger in disease.environmental_triggers])
        citation_lists.extend([gene.citations for gene in disease.key_genes])
        citation_lists.extend([entry.citations for entry in disease.linked_diseases])
        citation_lists.extend([entry.citations for entry in disease.linked_exposures])

    missing = validate_citations_exist(disease, citation_lists)
    for citation in missing:
        errors.append(f"{context}: missing citation reference '{citation}'")


def validate_generated_data() -> tuple[bool, list[str]]:
    """Validate all generated data artifacts and return status + errors."""

    errors: list[str] = []

    diseases: list[DiseaseData] = []
    exposures: list[ExposureData] = []
    genes: list[GeneData] = []
    pathways: list[PathwayData] = []
    communities: list[CommunityData] = []

    def parse_collection(paths: list[Path], model: Any, sink: list[Any], section: str) -> None:
        for path in paths:
            try:
                parsed = model.model_validate(_read_json(path))
                sink.append(parsed)
            except ValidationError as exc:
                errors.append(f"{section}/{path.name}: schema error -> {exc}")

    parse_collection(_iter_entity_files(DISEASES_DIR), DiseaseData, diseases, "diseases")
    parse_collection(_iter_entity_files(EXPOSURES_DIR), ExposureData, exposures, "exposures")
    parse_collection(_iter_entity_files(GENES_DIR), GeneData, genes, "genes")
    parse_collection(_iter_entity_files(PATHWAYS_DIR), PathwayData, pathways, "pathways")
    parse_collection(_iter_entity_files(COMMUNITY_DIR), CommunityData, communities, "community")

    graph_path = GRAPH_DIR / "graph.json"
    graph: GraphData | None = None
    try:
        graph = GraphData.model_validate(_read_json(graph_path))
    except ValidationError as exc:
        errors.append(f"graph/graph.json: schema error -> {exc}")
    except FileNotFoundError:
        errors.append("graph/graph.json: file missing")

    disease_slugs = {item.slug for item in diseases}
    exposure_slugs = {item.slug for item in exposures}
    gene_slugs = {item.slug for item in genes}
    pathway_slugs = {item.slug for item in pathways}

    brief_slugs = {path.stem for path in BRIEFS_DIR.glob("*.mdx")}

    # Cross-link checks
    for disease in diseases:
        for gene_slug in disease.major_genes:
            if gene_slug not in gene_slugs:
                errors.append(f"disease:{disease.slug} major_genes references missing gene '{gene_slug}'")
        for exposure_slug in disease.environmental_exposures:
            if exposure_slug not in exposure_slugs:
                errors.append(
                    f"disease:{disease.slug} environmental_exposures references missing exposure '{exposure_slug}'"
                )
        for pathway_slug in disease.causal_pathways:
            if pathway_slug not in pathway_slugs:
                errors.append(f"disease:{disease.slug} causal_pathways references missing pathway '{pathway_slug}'")
        for modifier in disease.exposure_modifiers:
            if modifier.exposure_slug not in exposure_slugs:
                errors.append(
                    f"disease:{disease.slug} exposure_modifiers references missing exposure '{modifier.exposure_slug}'"
                )
        for brief in disease.mechanism_briefs:
            if brief not in brief_slugs:
                errors.append(f"disease:{disease.slug} references missing mechanism brief '{brief}'")
        _validate_entity_citations(disease, f"disease:{disease.slug}", errors)

    for exposure in exposures:
        for gene_slug in exposure.interacting_genes:
            if gene_slug not in gene_slugs:
                errors.append(f"exposure:{exposure.slug} interacting_genes references missing gene '{gene_slug}'")
        for highlight in exposure.gxe_highlights:
            if highlight.gene_slug not in gene_slugs:
                errors.append(f"exposure:{exposure.slug} references missing gene '{highlight.gene_slug}'")
            if highlight.disease_slug not in disease_slugs:
                errors.append(
                    f"exposure:{exposure.slug} references missing disease '{highlight.disease_slug}'"
                )
        _validate_entity_citations(exposure, f"exposure:{exposure.slug}", errors)

    for gene in genes:
        for linked_pathway in gene.pathways:
            if linked_pathway.slug not in pathway_slugs:
                errors.append(f"gene:{gene.slug} references missing pathway '{linked_pathway.slug}'")
        for linked_disease in gene.linked_diseases:
            if linked_disease.slug not in disease_slugs:
                errors.append(
                    f"gene:{gene.slug} references missing disease '{linked_disease.slug}'"
                )
        for linked_exposure in gene.linked_exposures:
            if linked_exposure.slug not in exposure_slugs:
                errors.append(
                    f"gene:{gene.slug} references missing exposure '{linked_exposure.slug}'"
                )
        _validate_entity_citations(gene, f"gene:{gene.slug}", errors)

    for pathway in pathways:
        for pathway_linked_disease in pathway.linked_diseases:
            if pathway_linked_disease.slug not in disease_slugs:
                errors.append(
                    f"pathway:{pathway.slug} references missing disease '{pathway_linked_disease.slug}'"
                )
        for pathway_linked_exposure in pathway.linked_exposures:
            if pathway_linked_exposure.slug not in exposure_slugs:
                errors.append(
                    f"pathway:{pathway.slug} references missing exposure '{pathway_linked_exposure.slug}'"
                )
        _validate_entity_citations(pathway, f"pathway:{pathway.slug}", errors)

    for community in communities:
        for stat in community.health_stats:
            if stat.disease_slug not in disease_slugs:
                errors.append(
                    f"community:{community.slug} health_stats references missing disease '{stat.disease_slug}'"
                )

    if graph is not None:
        node_ids = {node.id for node in graph.nodes}
        for edge in graph.edges:
            if edge.source not in node_ids:
                errors.append(f"graph edge {edge.id} has missing source node '{edge.source}'")
            if edge.target not in node_ids:
                errors.append(f"graph edge {edge.id} has missing target node '{edge.target}'")

        available_citations = set[str]()
        for disease_entity in diseases:
            available_citations.update(collect_reference_ids(disease_entity))
        for exposure_entity in exposures:
            available_citations.update(collect_reference_ids(exposure_entity))
        for gene_entity in genes:
            available_citations.update(collect_reference_ids(gene_entity))
        for pathway_entity in pathways:
            available_citations.update(collect_reference_ids(pathway_entity))
        for edge in graph.edges:
            for citation in edge.attrs.sources:
                if citation not in available_citations:
                    errors.append(f"graph edge {edge.id} references unknown citation '{citation}'")

    return len(errors) == 0, errors


def main() -> None:
    ok, errors = validate_generated_data()
    if not ok:
        print("GENARCH validation failed:")
        for error in errors:
            print(f"- {error}")
        raise SystemExit(1)
    print("GENARCH validation passed.")


if __name__ == "__main__":
    main()
