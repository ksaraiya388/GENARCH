import fs from "fs";
import path from "path";

/**
 * Build-time readers for the two cross-ancestry source records under
 * `pipeline/sources/cross_ancestry/`: the ACS Loudoun population counts and the
 * verified bibliography.
 *
 * Mirrors the cwd-fallback ladder in `resolveSourcesDir()` (lib/deq-data.ts).
 * `copy-data.js` stages both files into `site/public/data/cross-ancestry/` before
 * `next build`, which covers Vercel and CI; the `pipeline/sources` entries cover
 * `next dev`, where no prebuild step has run.
 */

function resolveDir(): string {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "public", "data", "cross-ancestry"),
    path.join(cwd, "site", "public", "data", "cross-ancestry"),
    path.join(cwd, "..", "pipeline", "sources", "cross_ancestry"),
    path.join(cwd, "pipeline", "sources", "cross_ancestry"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "acs_loudoun_2023.json"))) return dir;
  }
  return candidates[candidates.length - 1];
}

const DIR = resolveDir();

export interface AcsCell {
  variable: string;
  /** The Census Bureau's own label text, verbatim. */
  label: string;
  estimate: string | null;
  margin_of_error: string | null;
  /**
   * False when the API returned a sentinel instead of a margin. A false value must
   * render as "not published", never as the raw negative number.
   */
  margin_of_error_published: boolean;
  percent?: string | null;
  percent_published?: boolean;
  percent_margin_of_error?: string | null;
  percent_margin_of_error_published?: boolean;
  percent_note?: string;
  /** The margin of error is at least as large as the estimate. */
  estimate_exceeds_margin: boolean;
}

export interface AcsLoudoun {
  source: string;
  dataset: string;
  vintage: string;
  geography: string;
  retrieved_at: string;
  notes: string;
  sentinel_handling: string;
  profile_dp05: Record<string, AcsCell>;
  detail_b02015: Record<string, AcsCell>;
}

export function getAcsLoudoun(): AcsLoudoun | null {
  const file = path.join(DIR, "acs_loudoun_2023.json");
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as AcsLoudoun;
  } catch {
    return null;
  }
}

export interface LiteratureExtraction {
  claim_id: string;
  trait: string;
  population: string;
  metric: string;
  value: number | null;
  comparator: string | null;
  locator: string;
  /** Internal provenance only. Never rendered. */
  excerpt_internal: string;
  source_text: string;
}

export interface LiteratureEntry {
  id: string;
  title: string;
  doi: string;
  verified?: {
    crossref_title: string;
    year: number | null;
    journal: string | null;
    first_author: string | null;
    checked_at: string;
  };
  populations_reported: string[];
  population_labels_as_used: string;
  traits: string[];
  extractions: LiteratureExtraction[];
  text_availability?: string;
}

export function getLiterature(): LiteratureEntry[] {
  const file = path.join(DIR, "literature.json");
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as LiteratureEntry[];
  } catch {
    return [];
  }
}

/** One extraction by claim id, or null. Used where a page states a single figure. */
export function findExtraction(
  lit: LiteratureEntry[],
  studyId: string,
  claimId: string
): LiteratureExtraction | null {
  const entry = lit.find((e) => e.id === studyId);
  if (!entry) return null;
  return entry.extractions.find((x) => x.claim_id === claimId) ?? null;
}

/** "Fatumo et al. 2022, Nature Medicine" from the verified Crossref record. */
export function citeShort(entry: LiteratureEntry | undefined): string {
  if (!entry?.verified) return "";
  const surname = (entry.verified.first_author ?? "").split(",")[0];
  const bits = [surname ? `${surname} et al.` : "", String(entry.verified.year ?? "")]
    .filter(Boolean)
    .join(" ");
  return entry.verified.journal ? `${bits}, ${entry.verified.journal}` : bits;
}

/**
 * Format an ACS cell as "45,468 (margin of error 2,243)", or with an explicit
 * statement where the Bureau publishes no margin. Never prints a sentinel.
 */
export function formatAcsCount(cell: AcsCell | undefined): string {
  if (!cell || cell.estimate === null) return "not retrieved";
  const n = Number(cell.estimate);
  const count = Number.isFinite(n) ? n.toLocaleString("en-US") : cell.estimate;
  if (!cell.margin_of_error_published) {
    return `${count} (no margin of error published)`;
  }
  const m = Number(cell.margin_of_error);
  const moe = Number.isFinite(m) ? m.toLocaleString("en-US") : cell.margin_of_error;
  return `${count} (margin of error ${moe})`;
}

/** Published percentage with its margin, or an explicit absence. */
export function formatAcsPercent(cell: AcsCell | undefined): string {
  if (!cell || !cell.percent_published || cell.percent === null) {
    return "no percentage published";
  }
  const pct = `${cell.percent}%`;
  if (!cell.percent_margin_of_error_published) {
    return `${pct} (no margin of error published)`;
  }
  return `${pct} (margin of error ${cell.percent_margin_of_error} percentage points)`;
}
