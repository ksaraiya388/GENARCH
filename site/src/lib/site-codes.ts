import fs from "fs";
import path from "path";

/**
 * Build-time reader for `pipeline/lookups/site_codes.json`, the single code mapping shared by
 * `pipeline.report` and this site (docs/report-2026/DECISIONS.md D7).
 *
 * Internal slugs never leave this module. Everything the page renders, serialises into a prop,
 * or offers for download keys on the DC-xx code instead (docs/report-2026/CONTEXT.md C7 and C8,
 * docs/CONTENT_CONSTRAINTS.md section 4). The lookup itself is staged outside `public/` by
 * `scripts/copy-data.js`, because the file carries every slug and a served copy would be a C7
 * violation on its own.
 */

export interface SiteUnitPeriod {
  unitId: string;
  unitLabel: string;
  startDate: string;
  /** Null while the unit is still in place. */
  endDate: string | null;
}

export interface SiteCodeEntry {
  code: string;
  /** Internal. Never rendered, never serialised into a prop, never written to a download. */
  siteId: string;
  deqPublishedName: string;
  county: string;
  inV1Scope: boolean;
  collocatedRegulatory: boolean;
  pm25EndDate: string | null;
  units: SiteUnitPeriod[];
}

interface RawUnit {
  unit_id: string;
  unit_label: string;
  start_date: string;
  end_date: string | null;
}

interface RawSite {
  code: string;
  site_id: string;
  deq_published_name: string;
  county: string;
  in_v1_scope: boolean;
  collocated_regulatory: boolean;
  pm25_end_date: string | null;
  units: RawUnit[];
}

/**
 * Mirrors the ladder in `resolveSourcesDir()` (lib/deq-data.ts). `copy-data.js` stages the
 * lookup into `site/_data/lookups/` before `next build`, which covers Vercel and CI; the
 * `pipeline/lookups` entries cover `next dev`, where no prebuild step has run.
 */
function resolveLookupPath(): string {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "_data", "lookups", "site_codes.json"),
    path.join(cwd, "site", "_data", "lookups", "site_codes.json"),
    path.join(cwd, "..", "pipeline", "lookups", "site_codes.json"),
    path.join(cwd, "pipeline", "lookups", "site_codes.json"),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(
      "site_codes.json was not found on any of the staged paths. Every site label on " +
      "/community/data-center-alley comes from it, so the build fails here rather than " +
      `rendering an internal slug. Looked in: ${candidates.join(", ")}`
    );
  }
  return found;
}

let cache: SiteCodeEntry[] | null = null;

/** Every site in the lookup, in code order. */
export function loadSiteCodes(): SiteCodeEntry[] {
  if (cache) return cache;
  const raw = JSON.parse(fs.readFileSync(resolveLookupPath(), "utf-8")) as { sites: RawSite[] };
  cache = raw.sites
    .map((s) => ({
      code: s.code,
      siteId: s.site_id,
      deqPublishedName: s.deq_published_name,
      county: s.county,
      inV1Scope: s.in_v1_scope,
      collocatedRegulatory: s.collocated_regulatory,
      pm25EndDate: s.pm25_end_date,
      units: s.units.map((u) => ({
        unitId: u.unit_id,
        unitLabel: u.unit_label,
        startDate: u.start_date,
        endDate: u.end_date,
      })),
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
  return cache;
}

/**
 * The code for one internal site_id. Throws rather than falling back to the slug: a missing
 * entry is a lookup that has not caught up with the site history, and rendering the slug in
 * its place is the exact failure the code scheme exists to prevent.
 */
export function codeFor(siteId: string): string {
  const site = loadSiteCodes().find((s) => s.siteId === siteId);
  if (!site) {
    throw new Error(
      `No site code is assigned for an internal site identifier that the DEQ tables carry. ` +
      `Add it to pipeline/lookups/site_codes.json, appending the next unused code without ` +
      `renumbering any existing one.`
    );
  }
  return site.code;
}

export function siteByCode(code: string): SiteCodeEntry {
  const site = loadSiteCodes().find((s) => s.code === code);
  if (!site) throw new Error(`Unknown site code ${code}.`);
  return site;
}

/** An occupancy period as the site key renders it: "2026-03-03 to 2026-04-08". */
export function unitPeriodLabel(u: SiteUnitPeriod): string {
  return `${u.startDate} to ${u.endDate ?? "present"}`;
}
