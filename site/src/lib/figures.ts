/**
 * Figure system: shared sizes, ids, metadata, and colors for the exportable
 * social-card figures rendered under /figures.
 *
 * FIGURE_COLORS mirrors the design tokens in tailwind.config.ts. Recharts and
 * hand-authored SVG take color strings rather than Tailwind classes, so the
 * tokens are duplicated here as the single source for figure JS/SVG color.
 * Keep these in sync with tailwind.config.ts.
 */

export const FIGURE_SIZES = {
  card: { w: 1200, h: 675 }, // X / LinkedIn link card, 16:9
  square: { w: 1080, h: 1080 }, // Instagram, Reddit thumbnail
} as const;

export type FigureSize = keyof typeof FIGURE_SIZES;

export type FigureId =
  | "il33-pm25-chain"
  | "loudoun-asthma-vs-state"
  | "gwas-ancestry-imbalance"
  | "prs-portability"
  | "food-access-t2d"
  | "knowledge-graph-hero";

export interface FigureMeta {
  id: FigureId;
  title: string; // rendered as the figure headline
  claim: string; // one sentence, the takeaway
  sourceLine: string; // e.g. "CDC PLACES 2023; EPA AQS 2023"
  destination: string; // path on genarch.org this figure drives to
  altText: string; // accessibility + the text used when posting
}

export const FIGURE_COLORS = {
  navy: "#0B1F2F", // tailwind navy.deep
  navyMid: "#132B3C", // tailwind navy.mid
  navyLight: "#1A3A4F", // tailwind navy.light
  teal: "#2DD4BF", // tailwind teal.primary
  tealSoft: "#1FAFA0", // tailwind teal.soft
  slate: "#94A3B8", // tailwind cool.mid
  slateDark: "#64748B", // tailwind cool.dark
  amplify: "#C53030", // tailwind direction.amplify (risk-increasing)
  buffer: "#2F855A", // tailwind direction.buffer (protective)
  unknown: "#A0AEC0", // tailwind direction.unknown
  lightGray: "#F1F5F9", // tailwind surface.light
  white: "#FFFFFF",
} as const;

/**
 * Only figures backed by verified data ship. One of the originally scoped figures
 * is still not present here:
 *  - "food-access-t2d": STOPPED. The community dataset has only a county-level
 *    food-access summary, no tract-level food-access/diabetes pairs. See the
 *    curation spec at pipeline/sources/loudoun_tract_foodaccess_diabetes.README.md.
 *
 * "gwas-ancestry-imbalance" SHIPS as of the cross-ancestry work package. Its former
 * blocker was that a two-bar GWAS-share-versus-world-population chart needs a matched
 * world-population share by the same ancestry framework, which neither the GWAS
 * Diversity Monitor nor the Cell Genomics 2024 review publishes. That blocker is not
 * resolved and the two-bar chart is still not built. What ships instead is a narrower
 * figure: GWAS participant share alone, from ONE snapshot of
 * pipeline/sources/gwas_ancestry_breakdown.csv, with no world-population comparison
 * bar and therefore no second denominator. The CSV holds two mutually incompatible
 * snapshots (2023 and 2024-09) whose denominators differ; SNAPSHOT_AS_OF below pins
 * the figure to one of them, and mixing rows across `as_of` values would make the
 * bars measure different things.
 */
export const FIGURES: Partial<Record<FigureId, FigureMeta>> = {
  "il33-pm25-chain": {
    id: "il33-pm25-chain",
    title: "How PM2.5 feeds the IL-33 pathway in asthma",
    claim:
      "In airway epithelium, fine-particle pollution can activate NF-κB and release IL-33, the alarmin that drives type 2 asthma inflammation.",
    sourceLine: "GENARCH atlas: IL33 gene and asthma gene–environment records",
    destination: "/mechanism-briefs/pm25-il33-nfkb-asthma",
    altText:
      "A five-step diagram running left to right: PM2.5 particulate, bronchial epithelial injury, IL-33 release, ST2 receptor on ILC2 cells, type 2 inflammation, then asthma exacerbation. Each arrow is tagged with its evidence class; steps without direct evidence are dashed and marked inferred.",
  },
  "loudoun-asthma-vs-state": {
    id: "loudoun-asthma-vs-state",
    title: "Adult asthma prevalence: Loudoun, Virginia, and the US",
    claim:
      "Loudoun County's modeled adult asthma prevalence (8.2%) sits below Virginia (9.4%) and close to the national rate (8.0%).",
    sourceLine: "BRFSS 2023, via GENARCH community dataset (loudoun-county-va)",
    destination: "/community/loudoun-county-va",
    altText:
      "A bar chart of adult asthma prevalence with three bars: Loudoun County at 8.2 percent, Virginia at 9.4 percent, and the United States at 8.0 percent. Loudoun is the lowest of the three.",
  },
  "gwas-ancestry-imbalance": {
    id: "gwas-ancestry-imbalance",
    title: "Who GWAS has enrolled, by ancestry group",
    claim:
      "In the GWAS Diversity Monitor's September 2024 snapshot, European-ancestry participants are 94.48% of GWAS participants and Asian-ancestry participants 3.96%.",
    sourceLine:
      "GWAS Diversity Monitor, September 2024 snapshot (Mills & Rahal, Nat Genet 2020)",
    destination: "/ancestry-equity",
    altText:
      "A bar chart of GWAS participant share by ancestry group from a single September 2024 snapshot. European ancestry is 94.48 percent and Asian ancestry is 3.96 percent. The snapshot itemises only these two groups and does not break out South Asian ancestry separately, so 'Asian' here is not South Asian-specific. The remaining share is not itemised in this snapshot and is not plotted.",
  },
  "prs-portability": {
    id: "prs-portability",
    title: "Type 2 diabetes polygenic score accuracy, by ancestry group",
    claim:
      "In one multi-ancestry type 2 diabetes polygenic score, incremental AUC is 0.143 in European-ancestry validation cohorts and 0.061 in South Asian-ancestry cohorts.",
    sourceLine:
      "Huerta-Chagoya et al., Lancet Diabetes Endocrinol 2026, doi:10.1016/s2213-8587(25)00405-x",
    destination: "/ancestry-equity",
    altText:
      "A bar chart of incremental AUC for one multi-ancestry type 2 diabetes polygenic risk score across five ancestry groups, from a single study: European 0.143, Admixed American 0.086, East Asian 0.074, South Asian 0.061, and African or African American 0.041. All five bars are the same metric, the same trait, and the same score, so they are directly comparable. Incremental AUC is the gain in area under the curve from adding the score to a model of age, sex and principal components.",
  },
  "knowledge-graph-hero": {
    id: "knowledge-graph-hero",
    title: "The GENARCH gene–environment graph",
    claim:
      "GENARCH links genes, exposures, pathways, and diseases into one navigable map of gene–environment interaction.",
    sourceLine: "GENARCH knowledge graph (seed release)",
    destination: "/graph",
    altText:
      "A network diagram of the GENARCH knowledge graph. Nodes are colored by type (disease, gene, exposure, pathway, tissue) and edges by direction (amplify in red, buffer in green, unknown in gray). Only the most connected nodes are labeled.",
  },
};

export const SHIPPED_FIGURE_IDS = Object.keys(FIGURES) as FigureId[];

/* ---- Per-figure data payloads (built server-side, rendered client-side) ---- */

export type EvidenceClass = "GWAS" | "eQTL" | "functional" | "literature" | "inferred";

export interface ChainEdge {
  from: string;
  to: string;
  evidenceClass: EvidenceClass;
}

export interface Il33ChainData {
  nodes: string[];
  edges: ChainEdge[];
  confidence: "low" | "medium" | "high";
}

export interface LoudounPrevalenceData {
  regionName: string;
  unit: string;
  region: number;
  state: number | null;
  national: number | null;
  year: number;
  source: string;
}

export interface GraphHeroNode {
  id: string;
  type: string;
  label: string;
  degree: number;
  x: number;
  y: number;
  labeled: boolean;
}

export interface GraphHeroEdge {
  source: string;
  target: string;
  direction: string;
  strength: number;
}

export interface GraphHeroData {
  nodes: GraphHeroNode[];
  edges: GraphHeroEdge[];
}

/**
 * The one snapshot of gwas_ancestry_breakdown.csv the figure is pinned to. The CSV
 * holds two snapshots whose denominators differ; rows from different `as_of` values
 * must never share an axis. Changing this constant changes the whole figure, which
 * is the point of having it in one place.
 */
export const SNAPSHOT_AS_OF = "2024-09";

export interface GwasAncestryRow {
  group: string;
  pct: number;
}

export interface GwasAncestryData {
  asOf: string;
  denominatorNote: string;
  source: string;
  sourceUrl: string;
  rows: GwasAncestryRow[];
}

export interface PrsPortabilityRow {
  /** GENARCH's label for the group. */
  population: string;
  /** The label the study itself used. */
  labelAsUsed: string;
  value: number;
}

export interface PrsPortabilityData {
  /** literature.json entry id. */
  study: string;
  studyLabel: string;
  doi: string;
  trait: string;
  /** Named on the chart. Every bar is this one metric. */
  metric: string;
  rows: PrsPortabilityRow[];
}

export type FigurePayload =
  | { id: "il33-pm25-chain"; data: Il33ChainData }
  | { id: "loudoun-asthma-vs-state"; data: LoudounPrevalenceData }
  | { id: "gwas-ancestry-imbalance"; data: GwasAncestryData }
  | { id: "prs-portability"; data: PrsPortabilityData }
  | { id: "knowledge-graph-hero"; data: GraphHeroData };
