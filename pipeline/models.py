"""Canonical data contracts for GENARCH generated artifacts."""

from __future__ import annotations

from datetime import date
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"


class StrictModel(BaseModel):
    """Base model with strict type checking and no extra fields."""

    model_config = ConfigDict(extra="forbid", strict=True)


class ConfidenceTier(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class EvidenceType(str, Enum):
    GWAS = "GWAS"
    EQTL = "eQTL"
    PATHWAY = "pathway"
    LITERATURE = "literature"
    INFERRED = "inferred"


class Direction(str, Enum):
    AMPLIFY = "amplify"
    BUFFER = "buffer"
    UNKNOWN = "unknown"
    BIDIRECTIONAL = "bidirectional"


class AncestryRepresentation(str, Enum):
    EUROPEAN_DOMINATED = "European-dominated"
    MULTI_ANCESTRY = "Multi-ancestry"
    UNKNOWN = "Unknown"


class Reference(StrictModel):
    id: str = Field(min_length=3, max_length=120)
    title: str = Field(min_length=8)
    authors: list[str] = Field(default_factory=list)
    year: int = Field(ge=1900, le=2100)
    source: str = Field(min_length=2)
    journal: str | None = None
    doi: str | None = None
    url: str | None = None


class EvidenceTableRow(StrictModel):
    label: str = Field(min_length=2)
    evidence_type: EvidenceType
    source: str = Field(min_length=2)
    year: int = Field(ge=1900, le=2100)
    effect_size: float
    confidence: ConfidenceTier
    citations: list[str] = Field(min_length=1)


class TopLocus(StrictModel):
    gene: str = Field(pattern=SLUG_PATTERN)
    variant: str | None = None
    gwas_p: float = Field(gt=0)
    effect_size: float
    ancestry_composition: str = Field(min_length=3)
    replication_status: str = Field(min_length=3)
    evidence: EvidenceType
    strength: float = Field(ge=0, le=1)
    citations: list[str] = Field(min_length=1)


class HeritabilityEstimate(StrictModel):
    h2_snp: float = Field(ge=0, le=1)
    h2_narrow_sense: float | None = Field(default=None, ge=0, le=1)
    source: str = Field(min_length=2)
    year: int = Field(ge=1900, le=2100)


class GeneticArchitecture(StrictModel):
    top_loci: list[TopLocus] = Field(min_length=1)
    heritability_estimate: HeritabilityEstimate
    prs_notes: str = Field(min_length=12)


class ExposureModifier(StrictModel):
    exposure_slug: str = Field(pattern=SLUG_PATTERN)
    direction: Direction
    strength: float = Field(ge=0, le=1)
    confidence: ConfidenceTier
    mechanism_hypothesis: str = Field(min_length=12)
    citations: list[str] = Field(min_length=1)


class TissueScore(StrictModel):
    name: str = Field(min_length=2)
    relevance_score: float = Field(ge=0, le=1)
    evidence_type: EvidenceType
    citations: list[str] = Field(min_length=1)


class PopulationEquity(StrictModel):
    gwas_ancestry_breakdown: str = Field(min_length=8)
    transferability_notes: str = Field(min_length=8)
    data_gaps: str = Field(min_length=8)


class RiskShiftPoint(StrictModel):
    exposure: str = Field(min_length=2)
    stratum: str = Field(min_length=2)
    liability_shift: float
    confidence_low: float
    confidence_high: float
    evidence_type: EvidenceType
    confidence: ConfidenceTier
    citations: list[str] = Field(min_length=1)


class TissueHeatmapCell(StrictModel):
    tissue: str = Field(min_length=2)
    context: str = Field(min_length=2)
    score: float = Field(ge=0, le=1)
    evidence_type: EvidenceType
    confidence: ConfidenceTier
    citations: list[str] = Field(min_length=1)


class DiseaseData(StrictModel):
    id: str = Field(pattern=r"^dis_[a-z0-9-]+$")
    slug: str = Field(pattern=SLUG_PATTERN)
    name: str = Field(min_length=2)
    icd11_code: str = Field(min_length=2)
    summary: str = Field(min_length=80)
    adolescent_relevance: str = Field(min_length=40)
    genetic_architecture: GeneticArchitecture
    exposure_modifiers: list[ExposureModifier] = Field(min_length=1)
    tissues: list[TissueScore] = Field(min_length=1)
    population_equity: PopulationEquity
    mechanism_briefs: list[str] = Field(default_factory=list)
    risk_shift_data: list[RiskShiftPoint] = Field(min_length=1)
    tissue_relevance_matrix: list[TissueHeatmapCell] = Field(min_length=1)
    evidence_table: list[EvidenceTableRow] = Field(min_length=1)
    references: list[Reference] = Field(min_length=1)
    schema_version: str = Field(min_length=1)
    last_updated: date


class ProxyMeasure(StrictModel):
    name: str = Field(min_length=2)
    unit: str = Field(min_length=1)
    measurement_method: str = Field(min_length=3)
    data_source: str = Field(min_length=2)


class SystemAffected(StrictModel):
    system: str = Field(min_length=2)
    mechanism_summary: str = Field(min_length=8)
    evidence_strength: float = Field(ge=0, le=1)


class SensitiveWindow(StrictModel):
    period: str = Field(min_length=2)
    age_range: str = Field(min_length=2)
    mechanism_rationale: str = Field(min_length=8)
    citations: list[str] = Field(min_length=1)


class GxEHighlight(StrictModel):
    gene_slug: str = Field(pattern=SLUG_PATTERN)
    disease_slug: str = Field(pattern=SLUG_PATTERN)
    direction: Direction
    evidence_type: EvidenceType
    citations: list[str] = Field(min_length=1)


class ExposureTissue(StrictModel):
    name: str = Field(min_length=2)
    effect_type: str = Field(min_length=4)
    citations: list[str] = Field(min_length=1)


class ExposureDistribution(StrictModel):
    data_source: str = Field(min_length=2)
    geographic_scope: str = Field(min_length=2)
    summary_stats: dict[str, float | int | str]


class ExposureData(StrictModel):
    id: str = Field(pattern=r"^exp_[a-z0-9-]+$")
    slug: str = Field(pattern=SLUG_PATTERN)
    name: str = Field(min_length=2)
    definition: str = Field(min_length=20)
    proxies: list[ProxyMeasure] = Field(min_length=1)
    systems_affected: list[SystemAffected] = Field(min_length=1)
    sensitive_windows: list[SensitiveWindow] = Field(min_length=1)
    gxe_highlights: list[GxEHighlight] = Field(min_length=1)
    tissues: list[ExposureTissue] = Field(min_length=1)
    exposure_distribution: ExposureDistribution
    evidence_table: list[EvidenceTableRow] = Field(min_length=1)
    references: list[Reference] = Field(min_length=1)
    schema_version: str = Field(min_length=1)
    last_updated: date


class RegulatoryNotes(StrictModel):
    promoter_activity: str = Field(min_length=3)
    enhancer_associations: str = Field(min_length=3)
    methylation_sensitivity: str = Field(min_length=3)
    eqtl_tissues: list[str] = Field(min_length=1)


class ExpressionContext(StrictModel):
    tissue: str = Field(min_length=2)
    tpm_range: str = Field(min_length=1)
    gtex_version: str = Field(min_length=2)
    citations: list[str] = Field(min_length=1)


class LinkedEntity(StrictModel):
    slug: str = Field(pattern=SLUG_PATTERN)
    evidence_type: EvidenceType
    strength: float = Field(ge=0, le=1)


class MechanisticHypothesis(StrictModel):
    hypothesis: str = Field(min_length=10)
    supporting_evidence: str = Field(min_length=8)
    confidence: ConfidenceTier


class GeneData(StrictModel):
    id: str = Field(pattern=r"^gene_[a-z0-9-]+$")
    slug: str = Field(pattern=SLUG_PATTERN)
    symbol: str = Field(min_length=2)
    name: str = Field(min_length=2)
    chromosome: str = Field(min_length=2)
    summary: str = Field(min_length=60)
    molecular_function: list[str] = Field(min_length=1)
    protein_class: str = Field(min_length=2)
    regulatory_notes: RegulatoryNotes
    expression_context: list[ExpressionContext] = Field(min_length=1)
    pathways: list[LinkedEntity] = Field(min_length=1)
    linked_diseases: list[LinkedEntity] = Field(min_length=1)
    linked_exposures: list[LinkedEntity] = Field(min_length=1)
    mechanistic_hypotheses: list[MechanisticHypothesis] = Field(min_length=1)
    confidence: ConfidenceTier
    evidence_table: list[EvidenceTableRow] = Field(min_length=1)
    references: list[Reference] = Field(min_length=1)
    schema_version: str = Field(min_length=1)
    last_updated: date


class EnvironmentalTrigger(StrictModel):
    exposure_slug: str = Field(pattern=SLUG_PATTERN)
    trigger_type: str = Field(min_length=3)
    citations: list[str] = Field(min_length=1)


class KeyGene(StrictModel):
    gene_slug: str = Field(pattern=SLUG_PATTERN)
    role_in_pathway: str = Field(min_length=3)
    citations: list[str] = Field(min_length=1)


class RegulatoryCheckpoint(StrictModel):
    node: str = Field(min_length=2)
    modulator_genes: list[str] = Field(min_length=1)
    potential_therapeutic_target: str


class TissueSpecificity(StrictModel):
    tissue: str = Field(min_length=2)
    expression_evidence: str = Field(min_length=3)


class LinkedWithCitations(StrictModel):
    slug: str = Field(pattern=SLUG_PATTERN)
    pathway_role: str | None = None
    pathway_effect: str | None = None
    citations: list[str] = Field(min_length=1)


class PathwayData(StrictModel):
    id: str = Field(pattern=r"^path_[a-z0-9-]+$")
    slug: str = Field(pattern=SLUG_PATTERN)
    name: str = Field(min_length=2)
    summary: str = Field(min_length=80)
    canonical_source: str = Field(min_length=3)
    environmental_triggers: list[EnvironmentalTrigger] = Field(min_length=1)
    key_genes: list[KeyGene] = Field(min_length=1)
    regulatory_checkpoints: list[RegulatoryCheckpoint] = Field(min_length=1)
    tissue_specificity: list[TissueSpecificity] = Field(min_length=1)
    linked_diseases: list[LinkedWithCitations] = Field(min_length=1)
    linked_exposures: list[LinkedWithCitations] = Field(min_length=1)
    diagram_asset: str = Field(min_length=2)
    evidence_table: list[EvidenceTableRow] = Field(min_length=1)
    references: list[Reference] = Field(min_length=1)
    schema_version: str = Field(min_length=1)
    last_updated: date


class GraphNodeAttrs(StrictModel):
    summary: str = Field(min_length=2)
    confidence: ConfidenceTier
    last_updated: date
    entity_route: str | None = None


class GraphNode(StrictModel):
    id: str = Field(min_length=2)
    type: str = Field(min_length=2)
    label: str = Field(min_length=2)
    slug: str = Field(pattern=SLUG_PATTERN)
    attrs: GraphNodeAttrs


class GraphEdgeAttrs(StrictModel):
    evidence_type: EvidenceType
    direction: Direction
    tissue: list[str] = Field(min_length=1)
    strength: float = Field(ge=0, le=1)
    confidence: ConfidenceTier
    sources: list[str] = Field(min_length=1)
    year_first_reported: int = Field(ge=1900, le=2100)
    ancestry_rep: AncestryRepresentation


class GraphEdge(StrictModel):
    id: str = Field(min_length=3)
    source: str = Field(min_length=2)
    target: str = Field(min_length=2)
    type: str = Field(min_length=2)
    attrs: GraphEdgeAttrs


class GraphMetadata(StrictModel):
    generated_at: date
    pipeline_version: str
    node_count: int = Field(ge=0)
    edge_count: int = Field(ge=0)
    schema_version: str


class GraphData(StrictModel):
    nodes: list[GraphNode] = Field(min_length=1)
    edges: list[GraphEdge] = Field(min_length=1)
    metadata: GraphMetadata


class HealthStat(StrictModel):
    disease_slug: str = Field(pattern=SLUG_PATTERN)
    metric_type: str = Field(min_length=3)
    value: float
    year: int = Field(ge=1900, le=2100)
    source: str = Field(min_length=2)
    ci_lower: float
    ci_upper: float


class ExposureLayer(StrictModel):
    layer_name: str = Field(min_length=2)
    data_source: str = Field(min_length=2)
    year: int = Field(ge=1900, le=2100)
    geojson: dict[str, Any]
    summary_stats: dict[str, float | int | str]


class ShapSummary(StrictModel):
    feature: str = Field(min_length=2)
    impact: float
    direction: str = Field(min_length=2)
    plain_language: str = Field(min_length=8)


class CommunityModel(StrictModel):
    features_used: list[str] = Field(min_length=1)
    hotspot_scores_geojson: dict[str, Any]
    shap_summaries: list[ShapSummary] = Field(min_length=1)
    model_card: str = Field(min_length=8)
    model_card_version: str = Field(min_length=1)
    training_data_cutoff: date
    metrics: dict[str, float]


class CommunityResource(StrictModel):
    name: str = Field(min_length=2)
    type: str = Field(min_length=2)
    url: str = Field(min_length=4)
    description: str = Field(min_length=8)
    local_relevance: str = Field(min_length=8)


class CommunityData(StrictModel):
    region_id: str = Field(min_length=2)
    slug: str = Field(pattern=SLUG_PATTERN)
    name: str = Field(min_length=2)
    geo_level: str = Field(pattern=r"^(county|census_tract|zip)$")
    fips_code: str = Field(min_length=4)
    health_stats: list[HealthStat] = Field(min_length=1)
    exposure_layers: list[ExposureLayer] = Field(min_length=1)
    model: CommunityModel
    resources: list[CommunityResource] = Field(min_length=1)
    limitations: str = Field(min_length=12)
    references: list[Reference] = Field(min_length=1)
    schema_version: str = Field(min_length=1)
    last_updated: date


class ReleaseEntry(StrictModel):
    slug: str = Field(pattern=SLUG_PATTERN)
    title: str = Field(min_length=3)
    summary: str = Field(min_length=8)
    date: date
    pdf_path: str = Field(min_length=2)
    report_path: str = Field(min_length=2)
    type: str = Field(min_length=2)


class ReleasesData(StrictModel):
    releases: list[ReleaseEntry] = Field(min_length=1)
    schema_version: str = Field(min_length=1)
    last_updated: date


def ensure_slug(value: str) -> str:
    """Normalize slugs to lowercase kebab-case."""

    return value.strip().lower().replace(" ", "-")


def validate_date_iso8601(value: str) -> date:
    """Validate a date string for helpers used outside models."""

    return date.fromisoformat(value)


def collect_reference_ids(entity: DiseaseData | ExposureData | GeneData | PathwayData) -> set[str]:
    """Collect reference IDs declared on an entity."""

    return {reference.id for reference in entity.references}


def validate_citations_exist(
    entity: DiseaseData | ExposureData | GeneData | PathwayData,
    citation_lists: list[list[str]],
) -> list[str]:
    """Return missing citation IDs for an entity."""

    missing: list[str] = []
    available = collect_reference_ids(entity)
    for citations in citation_lists:
        for citation in citations:
            if citation not in available:
                missing.append(citation)
    return missing
