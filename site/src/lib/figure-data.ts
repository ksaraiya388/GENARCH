import fs from "fs";
import path from "path";
import { getGene, getDisease, getCommunityRegion } from "@/lib/data";
import { SNAPSHOT_AS_OF } from "@/lib/figures";
import type {
  FigureId,
  FigurePayload,
  EvidenceClass,
  Il33ChainData,
  LoudounPrevalenceData,
  GraphHeroData,
  GwasAncestryData,
  PrsPortabilityData,
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

/**
 * Mirrors `resolveSourcesDir()` in lib/deq-data.ts. `copy-data.js` stages the
 * cross-ancestry source records into `site/public/data/cross-ancestry/` before
 * `next build`, which covers Vercel and CI; the `pipeline/sources` entries cover
 * `next dev`, where no prebuild step has run.
 */
function resolveCrossAncestryDir(): string {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "public", "data", "cross-ancestry"),
    path.join(cwd, "site", "public", "data", "cross-ancestry"),
    path.join(cwd, "..", "pipeline", "sources"),
    path.join(cwd, "pipeline", "sources"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "gwas_ancestry_breakdown.csv"))) return dir;
  }
  return candidates[candidates.length - 1];
}

const CA_DIR = resolveCrossAncestryDir();

/** Minimal RFC 4180 field split: the `denominator_note` column is quoted free text. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(field);
      field = "";
    } else field += ch;
  }
  out.push(field);
  return out;
}

/**
 * One snapshot only. The CSV holds a 2023 snapshot and a 2024-09 snapshot whose
 * denominators differ ("GWAS Catalog participants, 2023" versus "GWAS Diversity
 * Monitor live dashboard, September 2024"), and the 2023 African row explicitly
 * excludes African American and Afro-Caribbean participants while the 2024-09 rows
 * do not. Plotting rows from both would put two different denominators on one axis.
 * Returns null rather than falling back to "whatever rows exist", so a CSV change
 * that removes the pinned snapshot drops the figure instead of silently mixing.
 */
function buildGwasAncestry(): GwasAncestryData | null {
  const file = path.join(CA_DIR, "gwas_ancestry_breakdown.csv");
  if (!fs.existsSync(file)) return null;
  const lines = fs
    .readFileSync(file, "utf-8")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;

  const header = splitCsvLine(lines[0]);
  const col = (name: string) => header.indexOf(name);
  const iGroup = col("ancestry_group");
  const iPct = col("gwas_participant_pct");
  const iAsOf = col("as_of");
  const iNote = col("denominator_note");
  const iSource = col("source");
  const iUrl = col("source_url");
  if ([iGroup, iPct, iAsOf, iNote, iSource, iUrl].some((i) => i < 0)) return null;

  const matching = lines
    .slice(1)
    .map(splitCsvLine)
    .filter((f) => f[iAsOf] === SNAPSHOT_AS_OF);
  if (matching.length === 0) return null;

  return {
    asOf: SNAPSHOT_AS_OF,
    denominatorNote: matching[0][iNote],
    source: matching[0][iSource],
    sourceUrl: matching[0][iUrl],
    rows: matching
      .map((f) => ({ group: f[iGroup], pct: Number(f[iPct]) }))
      .filter((r) => Number.isFinite(r.pct))
      .sort((a, b) => b.pct - a.pct),
  };
}

/**
 * One study, one metric, one trait, five groups. Values are read from the verified
 * bibliography rather than hard-coded here, so a figure bar cannot drift from the
 * extraction that `pipeline/validate.py` checks. Each row names the extraction's
 * claim_id; a claim_id that no longer resolves drops the figure.
 */
const PRS_PORTABILITY_CLAIMS: Array<{
  claimId: string;
  population: string;
  labelAsUsed: string;
}> = [
  {
    claimId: "huertachagoya2026-multi-incauc-european",
    population: "European ancestry",
    labelAsUsed: "European",
  },
  {
    claimId: "huertachagoya2026-multi-incauc-admixed-american",
    population: "Hispanic/Latino and Admixed American ancestry",
    labelAsUsed: "Admixed American",
  },
  {
    claimId: "huertachagoya2026-multi-incauc-east-asian",
    population: "East Asian ancestry",
    labelAsUsed: "East Asian",
  },
  {
    claimId: "huertachagoya2026-multi-incauc-south-asian",
    population: "South Asian ancestry",
    labelAsUsed: "South Asian",
  },
  {
    claimId: "huertachagoya2026-multi-incauc-african",
    population: "African ancestry",
    labelAsUsed: "African or African American",
  },
];

function buildPrsPortability(): PrsPortabilityData | null {
  const file = path.join(CA_DIR, "literature.json");
  if (!fs.existsSync(file)) return null;
  let lit: Array<{
    id: string;
    doi?: string;
    verified?: { first_author?: string; year?: number; journal?: string };
    extractions?: Array<{ claim_id?: string; value?: number | null }>;
  }>;
  try {
    lit = JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return null;
  }

  const entry = lit.find((e) => e.id === "huertachagoya2026");
  if (!entry || !entry.verified) return null;
  const byClaim = new Map(
    (entry.extractions ?? []).map((x) => [x.claim_id, x.value])
  );

  const rows = [];
  for (const c of PRS_PORTABILITY_CLAIMS) {
    const value = byClaim.get(c.claimId);
    if (typeof value !== "number") return null;
    rows.push({ population: c.population, labelAsUsed: c.labelAsUsed, value });
  }

  const v = entry.verified;
  return {
    study: entry.id,
    studyLabel: `${(v.first_author ?? "").split(",")[0]} et al. ${v.year}, ${v.journal ?? ""}`,
    doi: entry.doi ?? "",
    trait: "type 2 diabetes",
    metric: "incremental AUC of the multi-ancestry PRS",
    rows: rows.sort((a, b) => b.value - a.value),
  };
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
    case "gwas-ancestry-imbalance": {
      const data = buildGwasAncestry();
      return data ? { id, data } : null;
    }
    case "prs-portability": {
      const data = buildPrsPortability();
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
