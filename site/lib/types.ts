export type ConfidenceTier = "low" | "medium" | "high";
export type EvidenceType = "GWAS" | "eQTL" | "pathway" | "literature" | "inferred";
export type Direction = "amplify" | "buffer" | "unknown" | "bidirectional";

export interface Reference {
  id: string;
  title: string;
  authors?: string[];
  year: number;
  source: string;
  journal?: string;
  doi?: string;
  url?: string;
}

export interface EvidenceTableRow {
  label: string;
  evidence_type: EvidenceType;
  source: string;
  year: number;
  effect_size: number;
  confidence: ConfidenceTier;
  citations: string[];
}

export interface Disease {
  id: string;
  slug: string;
  name: string;
  disease_category: string;
  icd11_code: string;
  icd10_codes: string[];
  primary_pathophysiology: string;
  tissue_system: string[];
  inheritance_pattern: string;
  prevalence_global: string;
  heritability_estimate: string;
  genetic_architecture_type: string;
  major_genes: string[];
  common_risk_variants: string[];
  rare_high_penetrance_variants: string[];
  epigenetic_factors: string[];
  transcriptomic_signatures: string[];
  proteomic_markers: string[];
  metabolomic_markers: string[];
  gene_environment_interactions: string[];
  polygenic_risk_score_supported: boolean;
  validated_prs_studies: string[];
  environmental_exposures: string[];
  modifiable_risk_factors: string[];
  nonmodifiable_risk_factors: string[];
  biomarkers_clinical: string[];
  age_of_onset_distribution: string;
  sex_bias: string;
  ancestry_specific_risks: string[];
  comorbidities: string[];
  causal_pathways: string[];
  therapeutic_targets: string[];
  pharmacogenomic_markers: string[];
  prevention_strategies: string[];
  model_features_for_ml: string[];
  summary: string;
  adolescent_relevance: string;
  genetic_architecture: {
    top_loci: Array<{
      gene: string;
      variant?: string;
      gwas_p: number;
      effect_size: number;
      ancestry_composition: string;
      replication_status: string;
      evidence: EvidenceType;
      strength: number;
      citations: string[];
    }>;
    heritability_estimate: {
      h2_snp: number;
      h2_narrow_sense?: number;
      source: string;
      year: number;
    };
    prs_notes: string;
  };
  exposure_modifiers: Array<{
    exposure_slug: string;
    direction: Direction;
    strength: number;
    confidence: ConfidenceTier;
    mechanism_hypothesis: string;
    citations: string[];
  }>;
  tissues: Array<{
    name: string;
    relevance_score: number;
    evidence_type: EvidenceType;
    citations: string[];
  }>;
  population_equity: {
    gwas_ancestry_breakdown: string;
    transferability_notes: string;
    data_gaps: string;
  };
  mechanism_briefs: string[];
  risk_shift_data: Array<{
    exposure: string;
    stratum: string;
    liability_shift: number;
    confidence_low: number;
    confidence_high: number;
    evidence_type: EvidenceType;
    confidence: ConfidenceTier;
    citations: string[];
  }>;
  tissue_relevance_matrix: Array<{
    tissue: string;
    context: string;
    score: number;
    evidence_type: EvidenceType;
    confidence: ConfidenceTier;
    citations: string[];
  }>;
  evidence_table: EvidenceTableRow[];
  references: Reference[];
}

export interface Exposure {
  id: string;
  slug: string;
  name: string;
  exposure_category: string;
  biological_mechanism: string;
  interacting_genes: string[];
  effect_direction: Direction;
  dose_response_model: string;
  temporal_sensitivity: string;
  ancestry_modifiers: string[];
  definition: string;
  proxies: Array<{ name: string; unit: string; measurement_method: string; data_source: string }>;
  systems_affected: Array<{ system: string; mechanism_summary: string; evidence_strength: number }>;
  sensitive_windows: Array<{
    period: string;
    age_range: string;
    mechanism_rationale: string;
    citations: string[];
  }>;
  gxe_highlights: Array<{
    gene_slug: string;
    disease_slug: string;
    direction: Direction;
    evidence_type: EvidenceType;
    citations: string[];
  }>;
  tissues: Array<{ name: string; effect_type: string; citations: string[] }>;
  exposure_distribution: {
    data_source: string;
    geographic_scope: string;
    summary_stats: Record<string, number | string>;
  };
  evidence_table: EvidenceTableRow[];
  references: Reference[];
}

export interface Gene {
  id: string;
  slug: string;
  symbol: string;
  name: string;
  chromosome: string;
  summary: string;
  molecular_function: string[];
  protein_class: string;
  regulatory_notes: {
    promoter_activity: string;
    enhancer_associations: string;
    methylation_sensitivity: string;
    eqtl_tissues: string[];
  };
  expression_context: Array<{
    tissue: string;
    tpm_range: string;
    gtex_version: string;
    citations: string[];
  }>;
  pathways: Array<{ slug: string; evidence_type: EvidenceType; strength: number }>;
  linked_diseases: Array<{ slug: string; evidence_type: EvidenceType; strength: number }>;
  linked_exposures: Array<{ slug: string; evidence_type: EvidenceType; strength: number }>;
  mechanistic_hypotheses: Array<{
    hypothesis: string;
    supporting_evidence: string;
    confidence: ConfidenceTier;
  }>;
  confidence: ConfidenceTier;
  evidence_table: EvidenceTableRow[];
  references: Reference[];
}

export interface Pathway {
  id: string;
  slug: string;
  name: string;
  summary: string;
  canonical_source: string;
  environmental_triggers: Array<{ exposure_slug: string; trigger_type: string; citations: string[] }>;
  key_genes: Array<{ gene_slug: string; role_in_pathway: string; citations: string[] }>;
  regulatory_checkpoints: Array<{
    node: string;
    modulator_genes: string[];
    potential_therapeutic_target: string;
  }>;
  tissue_specificity: Array<{ tissue: string; expression_evidence: string }>;
  linked_diseases: Array<{ slug: string; pathway_role?: string; citations: string[] }>;
  linked_exposures: Array<{ slug: string; pathway_effect?: string; citations: string[] }>;
  diagram_asset: string;
  evidence_table: EvidenceTableRow[];
  references: Reference[];
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  slug: string;
  attrs: {
    summary: string;
    confidence: ConfidenceTier;
    last_updated: string;
    entity_route?: string;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  attrs: {
    evidence_type: EvidenceType;
    direction: Direction;
    tissue: string[];
    strength: number;
    confidence: ConfidenceTier;
    sources: string[];
    year_first_reported: number;
    ancestry_rep: string;
  };
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    generated_at: string;
    pipeline_version: string;
    node_count: number;
    edge_count: number;
    schema_version: string;
    evidence_type_counts?: Record<string, number>;
  };
}

export interface CommunityRegion {
  region_id: string;
  slug: string;
  name: string;
  geo_level: "county" | "census_tract" | "zip";
  fips_code: string;
  health_stats: Array<{
    disease_slug: string;
    metric_type: string;
    value: number;
    year: number;
    source: string;
    ci_lower: number;
    ci_upper: number;
  }>;
  exposure_layers: Array<{
    layer_name: string;
    data_source: string;
    year: number;
    geojson: GeoJSON.FeatureCollection;
    summary_stats: Record<string, number | string>;
  }>;
  model: {
    features_used: string[];
    hotspot_scores_geojson: GeoJSON.FeatureCollection;
    shap_summaries: Array<{
      feature: string;
      impact: number;
      direction: string;
      plain_language: string;
    }>;
    model_card: string;
    model_card_version: string;
    training_data_cutoff: string;
    metrics: Record<string, number>;
  };
  resources: Array<{
    name: string;
    type: string;
    url: string;
    description: string;
    local_relevance: string;
  }>;
  limitations: string;
  references: Reference[];
}

export interface ReleaseEntry {
  slug: string;
  title: string;
  summary: string;
  date: string;
  pdf_path: string;
  report_path: string;
  type: string;
}

export interface ReleasesData {
  releases: ReleaseEntry[];
  schema_version: string;
  last_updated: string;
}
