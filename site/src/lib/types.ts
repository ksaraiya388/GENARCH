// Disease schema
export interface Disease {
  id: string;
  slug: string;
  name: string;
  icd11_code?: string;
  summary: string;
  adolescent_relevance: string;
  genetic_architecture: {
    top_loci: Array<{
      gene: string;
      variant?: string;
      gwas_p?: number;
      effect_size?: number;
      ancestry_composition?: string;
      replication_status?: string;
      evidence: string;
      strength: number;
      citations: string[];
    }>;
    heritability_estimate?: {
      h2_snp: number;
      h2_narrow_sense?: number;
      source: string;
      year: number;
    };
    prs_notes: string;
  };
  exposure_modifiers: Array<{
    exposure_slug: string;
    direction: "amplify" | "buffer" | "unknown";
    strength: number;
    confidence: "low" | "medium" | "high";
    mechanism_hypothesis?: string;
    citations: string[];
  }>;
  tissues: Array<{
    name: string;
    relevance_score: number;
    evidence_type?: string;
    citations: string[];
  }>;
  population_equity: {
    gwas_ancestry_breakdown: string;
    transferability_notes: string;
    data_gaps: string;
  };
  mechanism_briefs: string[];
  references: Reference[];
  schema_version: string;
  last_updated: string;
}

export interface Exposure {
  id: string;
  slug: string;
  name: string;
  definition: string;
  proxies: Array<{
    name: string;
    unit: string;
    measurement_method?: string;
    data_source?: string;
  }>;
  systems_affected: Array<{
    system: string;
    mechanism_summary: string;
    evidence_strength?: number;
  }>;
  sensitive_windows: Array<{
    period: string;
    age_range: string;
    mechanism_rationale: string;
    citations: string[];
  }>;
  gxe_highlights: Array<{
    gene_slug: string;
    disease_slug: string;
    direction: "amplify" | "buffer" | "unknown";
    evidence_type: string;
    citations: string[];
  }>;
  tissues: Array<{
    name: string;
    effect_type?: string;
    citations: string[];
  }>;
  exposure_distribution?: {
    data_source: string;
    geographic_scope: string;
    summary_stats?: Record<string, number>;
  };
  references: Reference[];
  schema_version: string;
  last_updated: string;
}

export interface Gene {
  id: string;
  slug: string;
  symbol: string;
  name: string;
  chromosome?: string;
  summary: string;
  molecular_function: string[];
  protein_class?: string;
  regulatory_notes?: {
    promoter_activity?: string;
    enhancer_associations?: string;
    methylation_sensitivity?: string;
    eqtl_tissues?: string[];
  };
  expression_context: Array<{
    tissue: string;
    tpm_range?: string;
    gtex_version?: string;
    citations: string[];
  }>;
  pathways: string[];
  linked_diseases: Array<{
    disease_slug: string;
    evidence_type: string;
    strength: number;
  }>;
  linked_exposures: Array<{
    exposure_slug: string;
    evidence_type: string;
    strength: number;
  }>;
  mechanistic_hypotheses: Array<{
    hypothesis: string;
    supporting_evidence: string;
    confidence: "low" | "medium" | "high";
  }>;
  confidence: "low" | "medium" | "high";
  references: Reference[];
  schema_version: string;
  last_updated: string;
}

export interface Pathway {
  id: string;
  slug: string;
  name: string;
  summary: string;
  canonical_source?: string;
  environmental_triggers: Array<{
    exposure_slug: string;
    trigger_type: string;
    citations: string[];
  }>;
  key_genes: Array<{
    gene_slug: string;
    role_in_pathway: string;
    citations: string[];
  }>;
  regulatory_checkpoints?: Array<{
    node: string;
    modulator_genes?: string[];
    potential_therapeutic_target?: boolean;
  }>;
  tissue_specificity?: Array<{
    tissue: string;
    expression_evidence?: string;
  }>;
  linked_diseases: Array<{
    disease_slug: string;
    pathway_role: string;
    citations: string[];
  }>;
  linked_exposures: Array<{
    exposure_slug: string;
    pathway_effect: string;
    citations: string[];
  }>;
  diagram_asset?: string;
  references: Reference[];
  schema_version: string;
  last_updated: string;
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
  };
}

export interface GraphNode {
  id: string;
  type: "disease" | "exposure" | "gene" | "variant" | "pathway" | "tissue";
  label: string;
  slug: string;
  attrs: {
    summary?: string;
    confidence?: "low" | "medium" | "high";
    last_updated?: string;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  attrs: {
    evidence_type: "GWAS" | "eQTL" | "pathway" | "literature" | "inferred";
    direction: "amplify" | "buffer" | "unknown" | "bidirectional";
    tissue: string | string[];
    strength: number;
    confidence: "low" | "medium" | "high";
    sources: string[];
    year_first_reported?: number;
    ancestry_rep?:
      | "European-dominated"
      | "Multi-ancestry"
      | "Unknown";
  };
}

export interface CommunityRegion {
  region_id: string;
  name: string;
  geo_level: "county" | "census_tract" | "zip";
  fips_code?: string;
  health_stats: Array<{
    disease_slug: string;
    metric_type: string;
    value: number;
    year: number;
    source: string;
    ci_lower?: number;
    ci_upper?: number;
  }>;
  exposure_layers: Array<{
    layer_name: string;
    data_source: string;
    year: number;
    geojson_path?: string;
    summary_stats?: Record<string, number>;
  }>;
  model: {
    features_used: string[];
    hotspot_scores_geojson?: string;
    shap_summaries: Array<{
      feature: string;
      mean_shap_value: number;
      direction: string;
    }>;
    model_card_version: string;
    training_data_cutoff: string;
  };
  resources: Array<{
    name: string;
    type: string;
    url: string;
    description: string;
    local_relevance?: string;
  }>;
  limitations: string;
  references: Reference[];
  schema_version: string;
  last_updated: string;
}

export interface Reference {
  id: string;
  title: string;
  authors?: string;
  year: number;
  journal?: string;
  doi?: string;
  url?: string;
}

export interface MechanismBrief {
  slug: string;
  title: string;
  question: string;
  background: string;
  evidence_summary: string[];
  mechanistic_chain: string[];
  tissue_specificity: string;
  counterarguments: string[];
  validation_criteria: string[];
  related_disease: string;
  related_exposure: string;
  related_genes: string[];
  related_pathways: string[];
  references: Reference[];
  published_at: string;
}

export interface SearchItem {
  type: "disease" | "exposure" | "gene" | "pathway" | "brief";
  slug: string;
  name: string;
  summary: string;
  confidence?: string;
  synonyms?: string[];
}

export interface ReleaseItem {
  slug: string;
  title: string;
  date: string;
  summary?: string;
  content?: string;
  pdf_url?: string;
}

export interface AnnualReport {
  year: string;
  title: string;
  slug: string;
  summary?: string;
  pdf_path?: string;
  content?: string;
}
