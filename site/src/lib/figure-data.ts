import fs from "fs";
import path from "path";
import { getGene, getDisease, getCommunityRegion } from "@/lib/data";
import type {
  FigureId,
  FigurePayload,
  EvidenceClass,
  Il33ChainData,
  LoudounPrevalenceData,
  GraphHeroData,
} from "@/lib/figures";

/**
 * Server-only builders. Each figure's numbers are read from the atlas data
 * (data/*.json) at build time and passed as props into the client figure
 * components, since the static export cannot read the filesystem in the browser.
 */

function resolveDataDir(): string {
  const cwd = process.cwd();
  const internal = path.join(cwd, "_data");
  if (fs.existsSync(internal)) return internal;
  const sibling = path.join(cwd, "..", "data");
  if (fs.existsSync(sibling)) return sibling;
  const under = path.join(cwd, "data");
  if (fs.existsSync(under)) return under;
  return sibling;
}

function buildIl33Chain(): Il33ChainData | null {
  const gene = getGene("il33");
  const disease = getDisease("asthma");
  if (!gene || !disease) return null;

  // Evidence classes for the two data-backed links come straight from the atlas.
  const pollutionEvidence = (gene.linked_exposures.find(
    (e) => e.exposure_slug === "air-pollution"
  )?.evidence_type ?? "literature") as EvidenceClass;
  const asthmaEvidence = (gene.linked_diseases.find(
    (d) => d.disease_slug === "asthma"
  )?.evidence_type ?? "GWAS") as EvidenceClass;
  const confidence =
    disease.exposure_modifiers.find((m) => m.exposure_slug === "air-pollution")
      ?.confidence ?? "medium";

  const nodes = [
    "PM2.5 particulate",
    "Bronchial epithelial injury",
    "IL-33 release",
    "ST2 on ILC2",
    "Type 2 inflammation",
    "Asthma exacerbation",
  ];

  return {
    nodes,
    edges: [
      { from: nodes[0], to: nodes[1], evidenceClass: pollutionEvidence },
      { from: nodes[1], to: nodes[2], evidenceClass: "functional" },
      { from: nodes[2], to: nodes[3], evidenceClass: "functional" },
      { from: nodes[3], to: nodes[4], evidenceClass: "inferred" },
      { from: nodes[4], to: nodes[5], evidenceClass: asthmaEvidence },
    ],
    confidence,
  };
}

function buildLoudoun(): LoudounPrevalenceData | null {
  const region = getCommunityRegion("loudoun-county-va");
  if (!region) return null;
  const stat = region.health_stats.find(
    (s) => s.disease_slug === "asthma" && s.metric_type === "prevalence"
  );
  if (!stat) return null;
  return {
    regionName: region.name,
    unit: stat.unit ?? "percent",
    region: stat.value,
    state: stat.comparison_state ?? null,
    national: stat.comparison_national ?? null,
    year: stat.year,
    source: stat.source,
  };
}

function buildGraphHero(): GraphHeroData | null {
  const file = path.join(resolveDataDir(), "figures", "hero_layout.json");
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as GraphHeroData;
  } catch {
    return null;
  }
}

export function buildFigurePayload(id: FigureId): FigurePayload | null {
  switch (id) {
    case "il33-pm25-chain": {
      const data = buildIl33Chain();
      return data ? { id, data } : null;
    }
    case "loudoun-asthma-vs-state": {
      const data = buildLoudoun();
      return data ? { id, data } : null;
    }
    case "knowledge-graph-hero": {
      const data = buildGraphHero();
      return data ? { id, data } : null;
    }
    default:
      return null;
  }
}
