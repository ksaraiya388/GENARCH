"""Pydantic v2 models (strict mode) for all GENARCH entity types."""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Direction(str, Enum):
    amplify = "amplify"
    buffer = "buffer"
    unknown = "unknown"
    bidirectional = "bidirectional"


class Confidence(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class EvidenceType(str, Enum):
    GWAS = "GWAS"
    eQTL = "eQTL"
    pathway = "pathway"
    literature = "literature"
    inferred = "inferred"


class Reference(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    authors: Optional[str] = None
    year: int
    journal: Optional[str] = None
    doi: Optional[str] = None
    url: Optional[str] = None


class TopLocus(BaseModel):
    model_config = ConfigDict(extra="forbid")

    gene: str
    variant: Optional[str] = None
    gwas_p: Optional[float] = None
    effect_size: Optional[float] = None
    ancestry_composition: Optional[str] = None
    replication_status: Optional[str] = None
    evidence: str
    strength: float = Field(ge=0, le=1)
    citations: list[str]


class HeritabilityEstimate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    h2_snp: float
    h2_narrow_sense: Optional[float] = None
    source: str
    year: int


class GeneticArchitecture(BaseModel):
    model_config = ConfigDict(extra="forbid")

    top_loci: list[TopLocus]
    heritability_estimate: Optional[HeritabilityEstimate] = None
    prs_notes: str


class ExposureModifier(BaseModel):
    model_config = ConfigDict(extra="forbid")

    exposure_slug: str
    direction: Direction
    strength: float = Field(ge=0, le=1)
    confidence: Confidence
    mechanism_hypothesis: Optional[str] = None
    citations: list[str]


class TissueEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    relevance_score: float = Field(ge=0, le=1)
    evidence_type: Optional[str] = None
    citations: list[str]


class PopulationEquity(BaseModel):
    model_config = ConfigDict(extra="forbid")

    gwas_ancestry_breakdown: str
    transferability_notes: str
    data_gaps: str


class DiseaseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    slug: str
    name: str
    icd11_code: Optional[str] = None
    summary: str
    adolescent_relevance: str
    genetic_architecture: GeneticArchitecture
    exposure_modifiers: list[ExposureModifier]
    tissues: list[TissueEntry]
    population_equity: PopulationEquity
    mechanism_briefs: list[str]
    references: list[Reference]
    schema_version: str
    last_updated: str


# --- Exposure ---
class ExposureProxy(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    unit: str
    measurement_method: Optional[str] = None
    data_source: Optional[str] = None


class SystemAffected(BaseModel):
    model_config = ConfigDict(extra="forbid")

    system: str
    mechanism_summary: str
    evidence_strength: Optional[float] = None


class SensitiveWindow(BaseModel):
    model_config = ConfigDict(extra="forbid")

    period: str
    age_range: str
    mechanism_rationale: str
    citations: list[str]


class GxeHighlight(BaseModel):
    model_config = ConfigDict(extra="forbid")

    gene_slug: str
    disease_slug: str
    direction: Direction
    evidence_type: str
    citations: list[str]


class ExposureTissueEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    effect_type: Optional[str] = None
    citations: list[str]


class ExposureDistribution(BaseModel):
    model_config = ConfigDict(extra="forbid")

    data_source: str
    geographic_scope: str
    summary_stats: Optional[dict[str, float]] = None


class ExposureSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    slug: str
    name: str
    definition: str
    proxies: list[ExposureProxy]
    systems_affected: list[SystemAffected]
    sensitive_windows: list[SensitiveWindow]
    gxe_highlights: list[GxeHighlight]
    tissues: list[ExposureTissueEntry]
    exposure_distribution: Optional[ExposureDistribution] = None
    references: list[Reference]
    schema_version: str
    last_updated: str


# --- Gene ---
class RegulatoryNotes(BaseModel):
    model_config = ConfigDict(extra="forbid")

    promoter_activity: Optional[str] = None
    enhancer_associations: Optional[str] = None
    methylation_sensitivity: Optional[str] = None
    eqtl_tissues: Optional[list[str]] = None


class ExpressionContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tissue: str
    tpm_range: Optional[str] = None
    gtex_version: Optional[str] = None
    citations: list[str]


class LinkedDisease(BaseModel):
    model_config = ConfigDict(extra="forbid")

    disease_slug: str
    evidence_type: str
    strength: float


class LinkedExposure(BaseModel):
    model_config = ConfigDict(extra="forbid")

    exposure_slug: str
    evidence_type: str
    strength: float


class MechanisticHypothesis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hypothesis: str
    supporting_evidence: str
    confidence: Confidence


class GeneSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    slug: str
    symbol: str
    name: str
    chromosome: Optional[str] = None
    summary: str
    molecular_function: list[str]
    protein_class: Optional[str] = None
    regulatory_notes: Optional[RegulatoryNotes] = None
    expression_context: list[ExpressionContext]
    pathways: list[str]
    linked_diseases: list[LinkedDisease]
    linked_exposures: list[LinkedExposure]
    mechanistic_hypotheses: list[MechanisticHypothesis]
    confidence: Confidence
    references: list[Reference]
    schema_version: str
    last_updated: str


# --- Pathway ---
class EnvironmentalTrigger(BaseModel):
    model_config = ConfigDict(extra="forbid")

    exposure_slug: str
    trigger_type: str
    citations: list[str]


class KeyGene(BaseModel):
    model_config = ConfigDict(extra="forbid")

    gene_slug: str
    role_in_pathway: str
    citations: list[str]


class RegulatoryCheckpoint(BaseModel):
    model_config = ConfigDict(extra="forbid")

    node: str
    modulator_genes: Optional[list[str]] = None
    potential_therapeutic_target: Optional[bool] = None


class TissueSpecificity(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tissue: str
    expression_evidence: Optional[str] = None


class LinkedDiseasePathway(BaseModel):
    model_config = ConfigDict(extra="forbid")

    disease_slug: str
    pathway_role: str
    citations: list[str]


class LinkedExposurePathway(BaseModel):
    model_config = ConfigDict(extra="forbid")

    exposure_slug: str
    pathway_effect: str
    citations: list[str]


class PathwaySchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    slug: str
    name: str
    summary: str
    canonical_source: Optional[str] = None
    environmental_triggers: list[EnvironmentalTrigger]
    key_genes: list[KeyGene]
    regulatory_checkpoints: Optional[list[RegulatoryCheckpoint]] = None
    tissue_specificity: Optional[list[TissueSpecificity]] = None
    linked_diseases: list[LinkedDiseasePathway]
    linked_exposures: list[LinkedExposurePathway]
    diagram_asset: Optional[str] = None
    references: list[Reference]
    schema_version: str
    last_updated: str


# --- Graph ---
class GraphNodeAttrs(BaseModel):
    model_config = ConfigDict(extra="forbid")

    summary: Optional[str] = None
    confidence: Optional[str] = None
    last_updated: Optional[str] = None


class GraphNode(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    type: str
    label: str
    slug: str
    attrs: GraphNodeAttrs

    @field_validator("type")
    @classmethod
    def validate_node_type(cls, v: str) -> str:
        allowed = {"disease", "exposure", "gene", "variant", "pathway", "tissue"}
        if v not in allowed:
            raise ValueError(f"node type must be one of {allowed}")
        return v


class GraphEdgeAttrs(BaseModel):
    model_config = ConfigDict(extra="forbid")

    evidence_type: str
    direction: str
    tissue: str | list[str]
    strength: float
    confidence: str
    sources: list[str]
    year_first_reported: Optional[int] = None
    ancestry_rep: Optional[str] = None

    @field_validator("evidence_type")
    @classmethod
    def validate_evidence_type(cls, v: str) -> str:
        if v not in {"GWAS", "eQTL", "pathway", "literature", "inferred"}:
            raise ValueError("evidence_type must be GWAS, eQTL, pathway, literature, or inferred")
        return v

    @field_validator("direction")
    @classmethod
    def validate_direction(cls, v: str) -> str:
        if v not in {"amplify", "buffer", "unknown", "bidirectional"}:
            raise ValueError("direction must be amplify, buffer, unknown, or bidirectional")
        return v

    @field_validator("confidence")
    @classmethod
    def validate_confidence(cls, v: str) -> str:
        if v not in {"low", "medium", "high"}:
            raise ValueError("confidence must be low, medium, or high")
        return v

    @field_validator("ancestry_rep")
    @classmethod
    def validate_ancestry_rep(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in {"European-dominated", "Multi-ancestry", "Unknown"}:
            raise ValueError("ancestry_rep must be European-dominated, Multi-ancestry, or Unknown")
        return v


class GraphEdge(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    source: str
    target: str
    type: str
    attrs: GraphEdgeAttrs


class GraphMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid")

    generated_at: str
    pipeline_version: str
    node_count: int
    edge_count: int
    schema_version: str


class GraphSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nodes: list[GraphNode]
    edges: list[GraphEdge]
    metadata: GraphMetadata


# --- Community ---
class HealthStat(BaseModel):
    model_config = ConfigDict(extra="forbid")

    disease_slug: str
    metric_type: str
    value: float
    year: int
    source: str
    ci_lower: Optional[float] = None
    ci_upper: Optional[float] = None


class ExposureLayer(BaseModel):
    model_config = ConfigDict(extra="forbid")

    layer_name: str
    data_source: str
    year: int
    geojson_path: Optional[str] = None
    summary_stats: Optional[dict[str, float]] = None


class ShapSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    feature: str
    mean_shap_value: float
    direction: str


class CommunityModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

    features_used: list[str]
    hotspot_scores_geojson: Optional[str] = None
    shap_summaries: list[ShapSummary]
    model_card_version: str
    training_data_cutoff: str


class CommunityResource(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    type: str
    url: str
    description: str
    local_relevance: Optional[str] = None


class CommunitySchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    region_id: str
    name: str
    geo_level: str
    fips_code: Optional[str] = None
    health_stats: list[HealthStat]
    exposure_layers: list[ExposureLayer]
    model: CommunityModel
    resources: list[CommunityResource]
    limitations: str
    references: list[Reference]
    schema_version: str
    last_updated: str

    @field_validator("geo_level")
    @classmethod
    def validate_geo_level(cls, v: str) -> str:
        if v not in {"county", "census_tract", "zip"}:
            raise ValueError("geo_level must be county, census_tract, or zip")
        return v


# Schema registry for dispatch
ENTITY_SCHEMAS: dict[str, type[BaseModel]] = {
    "disease": DiseaseSchema,
    "exposure": ExposureSchema,
    "gene": GeneSchema,
    "pathway": PathwaySchema,
    "graph": GraphSchema,
    "community": CommunitySchema,
}
