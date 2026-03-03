from __future__ import annotations

from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


EvidenceType = Literal["GWAS", "eQTL", "pathway", "literature", "inferred"]
Direction = Literal["amplify", "buffer", "unknown", "bidirectional"]
ConfidenceTier = Literal["low", "medium", "high"]
AncestryRep = Literal["European-dominated", "Multi-ancestry", "Unknown"]


class Reference(StrictModel):
    id: str
    title: str
    authors: str
    year: int
    journal: str | None = None
    doi: str | None = None
    url: str | None = None


class HeritabilityEstimate(StrictModel):
    h2_snp: float | None = None
    h2_narrow_sense: float | None = None
    source: str
    year: int


class TopLocus(StrictModel):
    gene: str
    variant: str | None = None
    gwas_p: float | None = None
    effect_size: float | None = None
    ancestry_composition: str | None = None
    replication_status: str | None = None
    evidence: str
    strength: Annotated[float, Field(ge=0.0, le=1.0)]
    citations: list[str]


class GeneticArchitecture(StrictModel):
    top_loci: list[TopLocus]
    heritability_estimate: HeritabilityEstimate | None = None
    prs_notes: str


class ExposureModifier(StrictModel):
    exposure_slug: str
    direction: Direction
    strength: Annotated[float, Field(ge=0.0, le=1.0)]
    confidence: ConfidenceTier
    mechanism_hypothesis: str | None = None
    citations: list[str]


class TissueEntry(StrictModel):
    name: str
    relevance_score: Annotated[float, Field(ge=0.0, le=1.0)]
    evidence_type: EvidenceType
    citations: list[str]


class PopulationEquity(StrictModel):
    gwas_ancestry_breakdown: str
    transferability_notes: str
    data_gaps: str


class Disease(StrictModel):
    id: str
    slug: str
    name: str
    icd11_code: str | None = None
    summary: str
    adolescent_relevance: str
    genetic_architecture: GeneticArchitecture
    exposure_modifiers: list[ExposureModifier]
    tissues: list[TissueEntry]
    population_equity: PopulationEquity
    mechanism_briefs: list[str] = Field(default_factory=list)
    references: list[Reference]
    schema_version: str
    last_updated: Annotated[date, Field(strict=False)]


class ExposureProxy(StrictModel):
    name: str
    unit: str | None = None
    measurement_method: str | None = None
    data_source: str | None = None


class SystemAffected(StrictModel):
    system: str
    mechanism_summary: str
    evidence_strength: Annotated[float, Field(ge=0.0, le=1.0)]


class SensitiveWindow(StrictModel):
    period: str
    age_range: str
    mechanism_rationale: str
    citations: list[str]


class GxEHighlight(StrictModel):
    gene_slug: str
    disease_slug: str
    direction: Direction
    evidence_type: EvidenceType
    citations: list[str]


class ExposureDistribution(StrictModel):
    data_source: str
    geographic_scope: str
    summary_stats: dict[str, float | str]


class Exposure(StrictModel):
    id: str
    slug: str
    name: str
    definition: str
    proxies: list[ExposureProxy]
    systems_affected: list[SystemAffected]
    sensitive_windows: list[SensitiveWindow]
    gxe_highlights: list[GxEHighlight]
    tissues: list[dict[str, object]]
    exposure_distribution: ExposureDistribution | None = None
    references: list[Reference]
    schema_version: str
    last_updated: Annotated[date, Field(strict=False)]


class RegulatoryNotes(StrictModel):
    promoter_activity: str | None = None
    enhancer_associations: str | None = None
    methylation_sensitivity: str | None = None
    eqtl_tissues: list[str] = Field(default_factory=list)


class ExpressionContext(StrictModel):
    tissue: str
    tpm_range: str | None = None
    gtex_version: str | None = None
    citations: list[str]


class LinkedEntity(StrictModel):
    slug: str
    evidence_type: EvidenceType
    strength: Annotated[float, Field(ge=0.0, le=1.0)]


class MechanisticHypothesis(StrictModel):
    hypothesis: str
    supporting_evidence: str
    confidence: ConfidenceTier


class Gene(StrictModel):
    id: str
    slug: str
    symbol: str
    name: str
    chromosome: str | None = None
    summary: str
    molecular_function: list[str]
    protein_class: str
    regulatory_notes: RegulatoryNotes
    expression_context: list[ExpressionContext]
    pathways: list[str]
    linked_diseases: list[LinkedEntity]
    linked_exposures: list[LinkedEntity]
    mechanistic_hypotheses: list[MechanisticHypothesis]
    confidence: ConfidenceTier
    references: list[Reference]
    schema_version: str
    last_updated: Annotated[date, Field(strict=False)]


class EnvironmentalTrigger(StrictModel):
    exposure_slug: str
    trigger_type: str
    citations: list[str]


class KeyGene(StrictModel):
    gene_slug: str
    role_in_pathway: str
    citations: list[str]


class RegulatoryCheckpoint(StrictModel):
    node: str
    modulator_genes: list[str]
    potential_therapeutic_target: str | None = None


class TissueSpecificity(StrictModel):
    tissue: str
    expression_evidence: str


class LinkedDisease(StrictModel):
    disease_slug: str
    pathway_role: str
    citations: list[str]


class LinkedExposure(StrictModel):
    exposure_slug: str
    pathway_effect: str
    citations: list[str]


class Pathway(StrictModel):
    id: str
    slug: str
    name: str
    summary: str
    canonical_source: str
    environmental_triggers: list[EnvironmentalTrigger]
    key_genes: list[KeyGene]
    regulatory_checkpoints: list[RegulatoryCheckpoint]
    tissue_specificity: list[TissueSpecificity]
    linked_diseases: list[LinkedDisease]
    linked_exposures: list[LinkedExposure]
    diagram_asset: str
    references: list[Reference]
    schema_version: str
    last_updated: Annotated[date, Field(strict=False)]


class GraphNodeAttrs(StrictModel):
    summary: str | None = None
    confidence: ConfidenceTier | None = None
    last_updated: Annotated[date | None, Field(strict=False)] = None


class GraphNode(StrictModel):
    id: str
    type: Literal["Disease", "Exposure", "Gene", "Variant", "Pathway", "Tissue"]
    label: str
    slug: str | None = None
    attrs: GraphNodeAttrs = Field(default_factory=GraphNodeAttrs)


class GraphEdgeAttrs(StrictModel):
    evidence_type: EvidenceType
    direction: Direction
    tissue: str | list[str]
    strength: Annotated[float, Field(ge=0.0, le=1.0)]
    confidence: ConfidenceTier
    sources: list[str]
    year_first_reported: int
    ancestry_rep: AncestryRep


class GraphEdge(StrictModel):
    id: str
    source: str
    target: str
    type: str
    attrs: GraphEdgeAttrs


class GraphMetadata(StrictModel):
    generated_at: Annotated[datetime, Field(strict=False)]
    pipeline_version: str
    node_count: int
    edge_count: int
    schema_version: str


class Graph(StrictModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    metadata: GraphMetadata


class HealthStat(StrictModel):
    disease_slug: str
    metric_type: str
    value: float
    year: int
    source: str
    ci_lower: float | None = None
    ci_upper: float | None = None


class ExposureLayer(StrictModel):
    layer_name: str
    data_source: str
    year: int
    geojson_path: str
    summary_stats: dict[str, float | str]


class CommunityModel(StrictModel):
    features_used: list[str]
    hotspot_scores_geojson: str
    shap_summaries: list[dict[str, object]]
    model_card_version: str
    training_data_cutoff: str


class CommunityResource(StrictModel):
    name: str
    type: str
    url: str
    description: str
    local_relevance: str


class Community(StrictModel):
    region_id: str
    slug: str
    name: str
    geo_level: Literal["county", "census_tract", "zip"]
    fips_code: str | None = None
    health_stats: list[HealthStat]
    exposure_layers: list[ExposureLayer]
    model: CommunityModel
    resources: list[CommunityResource]
    limitations: str
    references: list[Reference]
    schema_version: str
    last_updated: Annotated[date, Field(strict=False)]

