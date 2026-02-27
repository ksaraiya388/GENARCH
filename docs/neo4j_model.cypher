// GENARCH Neo4j model constraints and example relationships

CREATE CONSTRAINT disease_slug IF NOT EXISTS
FOR (d:Disease) REQUIRE d.slug IS UNIQUE;

CREATE CONSTRAINT exposure_slug IF NOT EXISTS
FOR (e:Exposure) REQUIRE e.slug IS UNIQUE;

CREATE CONSTRAINT gene_slug IF NOT EXISTS
FOR (g:Gene) REQUIRE g.slug IS UNIQUE;

CREATE CONSTRAINT pathway_slug IF NOT EXISTS
FOR (p:Pathway) REQUIRE p.slug IS UNIQUE;

CREATE CONSTRAINT variant_rsid IF NOT EXISTS
FOR (v:Variant) REQUIRE v.rsid IS UNIQUE;

CREATE CONSTRAINT tissue_name IF NOT EXISTS
FOR (t:Tissue) REQUIRE t.name IS UNIQUE;

// Core node labels:
// :Disease, :Exposure, :Gene, :Variant, :Pathway, :Tissue, :Brief, :Report
//
// Mandatory relationship metadata:
// evidence_type, direction, tissue, strength, confidence, sources

// Example merge statements:
MERGE (d:Disease {slug: "asthma", name: "Asthma"});
MERGE (e:Exposure {slug: "air-pollution", name: "Ambient Air Pollution"});
MERGE (g:Gene {slug: "il33", symbol: "IL33"});
MERGE (p:Pathway {slug: "nf-kb-signaling", name: "NF-kB Signaling"});
MERGE (t:Tissue {name: "Bronchial epithelium"});

MERGE (d)-[:ASSOCIATED_WITH {
  evidence_type: "GWAS",
  direction: "amplify",
  tissue: ["Bronchial epithelium"],
  strength: 0.86,
  confidence: "high",
  citations: ["gwas_2019_demenais"]
}]->(g);

MERGE (e)-[:MODIFIES {
  evidence_type: "literature",
  direction: "amplify",
  tissue: ["Lung"],
  strength: 0.82,
  confidence: "high",
  citations: ["air_2021_guarnieri"]
}]->(d);

MERGE (e)-[:INTERACTS_WITH {
  evidence_type: "literature",
  direction: "amplify",
  tissue: ["Bronchial epithelium"],
  strength: 0.72,
  confidence: "medium",
  citations: ["lit_2023_pm25_il33"]
}]->(g);

MERGE (g)-[:PARTICIPATES_IN {
  evidence_type: "pathway",
  direction: "amplify",
  tissue: ["Bronchial epithelium"],
  strength: 0.79,
  confidence: "high",
  citations: ["path_2021_nfkb_reactome"]
}]->(p);

MERGE (g)-[:EXPRESSED_IN {
  evidence_type: "eQTL",
  direction: "unknown",
  tissue: ["Bronchial epithelium"],
  strength: 0.68,
  confidence: "high",
  citations: ["gtex_2020_cons"]
}]->(t);
