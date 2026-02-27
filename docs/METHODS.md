# GENARCH Methods

This document describes the data sources, pipeline architecture, scoring rules, and methodological limitations of the GENARCH (Genetic Epidemiology Network for At-Risk Community Health) atlas.

---

## 1. Data Sources

GENARCH integrates public, aggregate data from the following sources:

| Source | Domain | Use in GENARCH |
|--------|--------|----------------|
| **GWAS Catalog** | Genetic associations | Disease–variant associations, p-values, ancestry metadata |
| **GTEx v8** | Gene expression | Tissue-specific expression, eQTL context |
| **KEGG** | Pathways | Pathway–gene–disease linkages |
| **Reactome** | Pathways | Pathway topology, regulatory checkpoints |
| **ClinVar** | Variant pathogenicity | Variant interpretation context |
| **ENCODE** | Regulatory elements | Promoter, enhancer, methylation context |
| **EPA AQS** | Air quality | PM2.5, ozone, NO₂ monitoring data |
| **EJSCREEN** | Environmental justice | Industrial proximity, demographic indices |
| **CDC WONDER** | Mortality & morbidity | Age-adjusted rates, disease burden by geography |
| **County Health Rankings** | Population health | Composite health metrics |
| **USDA Food Access Atlas** | Food environment | Low-access areas, food desert indices |
| **Census TIGER/Line** | Geography | County, tract, and zip boundaries |
| **ACS** (American Community Survey) | Demographics | SVI (Social Vulnerability Index), population structure |

All sources are public and aggregate-level; no individual-level or identifiable data are used.

---

## 2. Pipeline Architecture

The GENARCH pipeline consists of seven stages:

```
┌─────────┐   ┌───────────┐   ┌──────────┐   ┌───────┐   ┌──────┐   ┌─────────┐   ┌─────────┐
│ Ingest  │ → │ Normalize │ → │ Annotate │ → │ Score │ → │ Emit │ → │ Validate│ → │ Package │
└─────────┘   └───────────┘   └──────────┘   └───────┘   └──────┘   └─────────┘   └─────────┘
```

### Stage 1: Ingest
Reads source files from `pipeline/sources/` (TSV, CSV, JSON). Supports diseases, exposures, genes, pathways, variants, tissues, and citations. Output: raw structured records.

### Stage 2: Normalize
Standardizes IDs, slugs, evidence type enums, direction (amplify/buffer/unknown/bidirectional), and confidence (low/medium/high). Normalizes citation IDs and evidence types to allowed values.

### Stage 3: Annotate
- Maps variants to genes via `variants.tsv` / `variants.json`
- Attaches tissue metadata (relevance scores, evidence types) from tissue lookup
- Links genes to pathways and pathways to key genes
- Enriches loci with gene symbols when variant is known

### Stage 4: Score
Applies evidence-strength and confidence scoring (see Section 3). Scores are computed for top loci (genetic associations) and exposure modifiers; results are capped at 1.0.

### Stage 5: Emit
Writes validated JSON to `data/` (diseases, exposures, genes, pathways). Output conforms to Pydantic schemas. Also builds `data/graph/graph.json` from entity relationships.

### Stage 6: Validate
- Schema validation: all JSON files validated against Pydantic models
- Cross-link validation: referenced slugs (disease, exposure, gene, pathway) must exist
- Citation validation: citation IDs must exist in references

### Stage 7: Package
Builds the static site (Next.js) and packages reports. No additional processing; the site consumes emitted data.

---

## 3. Scoring Rules

### 3.1 Evidence Strength (0–1, Normalized)

Evidence strength is computed per locus (top genetic association) and is the sum of base and bonuses, **capped at 1.0**.

| Component | Value | Condition |
|-----------|-------|-----------|
| **Base (GWAS p-value)** | 0.4 | p < 5×10⁻⁸ (genome-wide significant) |
| | 0.2 | p < 1×10⁻⁵ (suggestive) |
| | 0.1 | Literature only (no GWAS p) |
| **Replication** | +0.2 | Replicated in independent cohort |
| **eQTL** | +0.15 | Expression QTL evidence |
| **In vitro** | +0.10 | In vitro functional validation |
| **In vivo** | +0.15 | In vivo functional validation |
| **Human tissue** | +0.20 | Human tissue evidence |
| **Multi-ancestry** | +0.10 | Non-European majority or diverse cohorts |

Bonuses are applied additively; the maximum is 1.0. Example: p < 5×10⁻⁸ (0.4) + replicated (0.2) + eQTL (0.15) + human tissue (0.20) = 0.95 (capped at 1.0).

### 3.2 Confidence Tier

Confidence is assigned based on strength and number of evidence types:

| Tier | Condition |
|------|-----------|
| **HIGH** | strength ≥ 0.7 **and** ≥ 2 evidence types |
| **MEDIUM** | 0.4 ≤ strength < 0.7 **or** exactly 1 evidence type at ≥ 0.7 |
| **LOW** | strength < 0.4 **or** single literature source only |

Evidence types are drawn from: GWAS, eQTL, pathway, literature, inferred.

---

## 4. Evidence Tags

All edges and associations carry an `evidence_type` from this enum:

| Tag | Description |
|-----|-------------|
| **GWAS** | Genome-wide association study |
| **eQTL** | Expression quantitative trait locus |
| **pathway** | KEGG, Reactome, or curated pathway annotation |
| **literature** | Manual curation from published literature |
| **inferred** | Computationally or logically inferred |

---

## 5. Graph Relationship Types and Edge Attributes

### Node Types
- `disease`, `exposure`, `gene`, `variant`, `pathway`, `tissue`

### Edge Types
- `association` — gene–disease, pathway–disease
- `modifier` — exposure–disease (G×E)
- `pathway` — gene–pathway, pathway–disease

### Edge Attributes (`attrs`)

| Attribute | Type | Description |
|-----------|------|-------------|
| `evidence_type` | string | GWAS, eQTL, pathway, literature, inferred |
| `direction` | string | amplify, buffer, unknown, bidirectional |
| `tissue` | string \| string[] | Tissue context |
| `strength` | float | 0–1 normalized |
| `confidence` | string | low, medium, high |
| `sources` | string[] | Citation IDs |
| `year_first_reported` | int? | Optional |
| `ancestry_rep` | string? | European-dominated, Multi-ancestry, Unknown |

---

## 6. Known Limitations

### Ancestry Bias
GWAS datasets are disproportionately European (≈79% per Sirugo et al. 2019). Transferability of effect sizes and variant–disease associations to non-European populations is uncertain. GENARCH reports ancestry composition and data gaps where available.

### Data Lag
Curated sources (GWAS Catalog, GTEx, KEGG, etc.) are updated on varying schedules. Community data (EJSCREEN, CDC WONDER, ACS) have publication delays (typically 1–2 years). Users should check `last_updated` and source cutoffs.

### Mechanistic Inference
Pathway and G×E relationships are often inferred from correlative or indirect evidence. *In silico* and *in vitro* data do not guarantee *in vivo* relevance. Strength and confidence scores reflect evidence quality, not causal certainty.

### Spatial Resolution
Community hotspot scores are county- or census-tract-level. Within-area heterogeneity is not modeled. Small-area estimates may be unstable where counts are low.

### Model Generalizability
The community hotspot model (XGBoost) is trained on U.S. data. Performance outside the training distribution (e.g., different countries, time periods) is not validated.

---

## 7. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026 | Initial release; 7-stage pipeline; evidence scoring; graph schema v1.0 |
