-- GENARCH relational schema (v1)
-- PostgreSQL 15 + PostGIS

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS Disease (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  adolescent_relevance TEXT NOT NULL,
  prs_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS Exposure (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  definition TEXT NOT NULL,
  systems_affected JSONB NOT NULL DEFAULT '[]'::jsonb,
  sensitive_windows JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS Gene (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS Pathway (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS Variant (
  id BIGSERIAL PRIMARY KEY,
  rsid TEXT UNIQUE NOT NULL,
  summary TEXT
);

CREATE TABLE IF NOT EXISTS Tissue (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS MechanismBrief (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  question TEXT NOT NULL,
  evidence JSONB NOT NULL,
  mechanistic_chain JSONB NOT NULL,
  tissue_specificity JSONB NOT NULL,
  limitations TEXT NOT NULL,
  future_directions TEXT NOT NULL,
  published_at DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS Report (
  id BIGSERIAL PRIMARY KEY,
  year INTEGER UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  summary TEXT NOT NULL,
  published_at DATE NOT NULL,
  pdf_path TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS CommunityRegion (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  geojson geometry(GEOMETRY, 4326),
  population BIGINT,
  socioeconomic_index DOUBLE PRECISION,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS PassportTemplate (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  pdf_template_path TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Citation (
  id BIGSERIAL PRIMARY KEY,
  citation_key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  authors TEXT,
  year INTEGER NOT NULL,
  doi TEXT,
  url TEXT
);

CREATE TABLE IF NOT EXISTS EntityCitation (
  citation_id BIGINT NOT NULL REFERENCES Citation(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id BIGINT NOT NULL,
  PRIMARY KEY (citation_id, entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS DiseaseExposure (
  disease_id BIGINT NOT NULL REFERENCES Disease(id) ON DELETE CASCADE,
  exposure_id BIGINT NOT NULL REFERENCES Exposure(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('amplify', 'buffer', 'unknown')),
  strength DOUBLE PRECISION NOT NULL CHECK (strength >= 0 AND strength <= 1),
  confidence TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  evidence_type TEXT NOT NULL,
  citation_id BIGINT REFERENCES Citation(id),
  PRIMARY KEY (disease_id, exposure_id)
);

CREATE TABLE IF NOT EXISTS DiseaseGene (
  disease_id BIGINT NOT NULL REFERENCES Disease(id) ON DELETE CASCADE,
  gene_id BIGINT NOT NULL REFERENCES Gene(id) ON DELETE CASCADE,
  effect_size DOUBLE PRECISION,
  confidence TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  PRIMARY KEY (disease_id, gene_id)
);

CREATE TABLE IF NOT EXISTS ExposureGene (
  exposure_id BIGINT NOT NULL REFERENCES Exposure(id) ON DELETE CASCADE,
  gene_id BIGINT NOT NULL REFERENCES Gene(id) ON DELETE CASCADE,
  effect_direction TEXT NOT NULL CHECK (effect_direction IN ('amplify', 'buffer', 'unknown')),
  strength DOUBLE PRECISION NOT NULL CHECK (strength >= 0 AND strength <= 1),
  confidence TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  PRIMARY KEY (exposure_id, gene_id)
);

CREATE TABLE IF NOT EXISTS GenePathway (
  gene_id BIGINT NOT NULL REFERENCES Gene(id) ON DELETE CASCADE,
  pathway_id BIGINT NOT NULL REFERENCES Pathway(id) ON DELETE CASCADE,
  PRIMARY KEY (gene_id, pathway_id)
);

CREATE TABLE IF NOT EXISTS GeneTissue (
  gene_id BIGINT NOT NULL REFERENCES Gene(id) ON DELETE CASCADE,
  tissue_id BIGINT NOT NULL REFERENCES Tissue(id) ON DELETE CASCADE,
  expression_score DOUBLE PRECISION,
  PRIMARY KEY (gene_id, tissue_id)
);

CREATE TABLE IF NOT EXISTS VariantGene (
  variant_id BIGINT NOT NULL REFERENCES Variant(id) ON DELETE CASCADE,
  gene_id BIGINT NOT NULL REFERENCES Gene(id) ON DELETE CASCADE,
  location TEXT,
  annotation JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (variant_id, gene_id)
);

CREATE TABLE IF NOT EXISTS ExposurePathway (
  exposure_id BIGINT NOT NULL REFERENCES Exposure(id) ON DELETE CASCADE,
  pathway_id BIGINT NOT NULL REFERENCES Pathway(id) ON DELETE CASCADE,
  strength DOUBLE PRECISION NOT NULL CHECK (strength >= 0 AND strength <= 1),
  confidence TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  PRIMARY KEY (exposure_id, pathway_id)
);

CREATE TABLE IF NOT EXISTS CommunityExposure (
  region_id BIGINT NOT NULL REFERENCES CommunityRegion(id) ON DELETE CASCADE,
  exposure_id BIGINT NOT NULL REFERENCES Exposure(id) ON DELETE CASCADE,
  mean_level DOUBLE PRECISION,
  unit TEXT,
  source TEXT,
  PRIMARY KEY (region_id, exposure_id)
);

CREATE TABLE IF NOT EXISTS DiseaseRegionStats (
  region_id BIGINT NOT NULL REFERENCES CommunityRegion(id) ON DELETE CASCADE,
  disease_id BIGINT NOT NULL REFERENCES Disease(id) ON DELETE CASCADE,
  prevalence DOUBLE PRECISION,
  incidence DOUBLE PRECISION,
  source TEXT,
  PRIMARY KEY (region_id, disease_id)
);
