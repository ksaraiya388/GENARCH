/**
 * The report's three registries, merged once per build.
 *
 * `pipeline.report` splits what the report may state across three files. The DEQ
 * half is `numbers.json` and is gated on byte-identity in CI. The atlas half is
 * `inventory.json` and `chain.json`, which carry their own keys and their own table
 * manifests -- T08 and T09 -- which is why those two tables are absent from
 * `tables.json`. All three use the same record shape, so the report does not need to
 * know which file a key came from: a chain key and a DEQ key resolve the same way.
 *
 * A key present in two files is a bug in the generator, not something to resolve by
 * precedence, so the merge throws rather than picking a winner.
 */

import { getReportArtifact, getReportTextArtifact } from "./data";
import { parseCsvTable } from "./csv";
import type {
  ReportAtlasDoc,
  ReportFigureManifest,
  ReportNumber,
  ReportTableManifest,
} from "./types";

export class ReportKeyError extends Error {}

type NumbersFile = Record<string, ReportNumber>;

function merge(
  into: NumbersFile,
  from: NumbersFile | undefined,
  origin: string,
  seen: Map<string, string>
): void {
  if (!from) return;
  for (const [key, record] of Object.entries(from)) {
    const first = seen.get(key);
    if (first !== undefined) {
      throw new ReportKeyError(
        `report key "${key}" is emitted by both ${first} and ${origin}. ` +
          "One generator has to stop emitting it; the report cannot choose."
      );
    }
    seen.set(key, origin);
    into[key] = record;
  }
}

const numbersCache = new Map<string, NumbersFile>();

/** Every keyed value for one report year: numbers, inventory and chain together. */
export function numberRegistry(year: string): NumbersFile {
  const cached = numbersCache.get(year);
  if (cached) return cached;

  const merged: NumbersFile = {};
  const seen = new Map<string, string>();
  const numbers = getReportArtifact<NumbersFile>(year, "numbers.json");
  merge(merged, numbers ?? undefined, "numbers.json", seen);
  const inventory = getReportArtifact<ReportAtlasDoc>(year, "inventory.json");
  const chain = getReportArtifact<ReportAtlasDoc>(year, "chain.json");
  merge(merged, inventory?.keys, "inventory.json", seen);
  merge(merged, chain?.keys, "chain.json", seen);

  numbersCache.set(year, merged);
  return merged;
}

/**
 * One keyed value, or a thrown error naming the key.
 *
 * The throw is the point. These functions run inside server components during
 * `next build`, so a key that has been renamed in the pipeline or mistyped in the
 * prose stops the build with the key in the message, rather than rendering an empty
 * span into a published report.
 */
export function reportNumber(year: string, key: string): ReportNumber {
  const record = numberRegistry(year)[key];
  if (record === undefined) {
    throw new ReportKeyError(
      `report ${year} has no number keyed "${key}". It must exist in ` +
        `data/reports/${year}/numbers.json, inventory.json or chain.json. ` +
        "Nothing in report prose may be typed by hand."
    );
  }
  return record;
}

/**
 * The value as prose renders it, at the precision it was rounded to.
 *
 * This is the same rule as `NumberRegistry.display()` in
 * `pipeline/report_lib/numbers.py`, applied to the same field, so a number reads
 * identically in a figure's alt text and in the sentence beside it. A count rounded
 * to precision 0 is stored as 12.0 and must render as "12".
 */
export function formatNumber(record: ReportNumber, group = true): string {
  if (typeof record.value === "string") return record.value;
  if (record.precision === null) return String(record.value);
  const fixed = record.value.toFixed(record.precision);
  if (!group) return fixed;
  const [whole, fraction] = fixed.split(".");
  const sign = whole.startsWith("-") ? "-" : "";
  const digits = sign ? whole.slice(1) : whole;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === undefined ? sign + grouped : `${sign}${grouped}.${fraction}`;
}

/* ------------------------------------------------------------------------ tables */

const tableCache = new Map<string, Map<string, ReportTableManifest>>();

/**
 * Every table manifest for one year, keyed by both its full id and its short one.
 *
 * Both spellings resolve because the report cites tables as T03 while the manifests
 * name them T03_collocation. The summary table is why the short form cannot be a
 * fixed-width slice: its short id is T04s, not T04.
 */
export function tableRegistry(year: string): Map<string, ReportTableManifest> {
  const cached = tableCache.get(year);
  if (cached) return cached;

  const manifests: ReportTableManifest[] = [];
  const tables = getReportArtifact<{ tables: ReportTableManifest[] }>(year, "tables.json");
  if (tables?.tables) manifests.push(...tables.tables);
  for (const file of ["inventory.json", "chain.json"]) {
    const doc = getReportArtifact<ReportAtlasDoc>(year, file);
    if (doc?.table) manifests.push(doc.table);
  }

  const index = new Map<string, ReportTableManifest>();
  for (const manifest of manifests) {
    index.set(manifest.id, manifest);
    const short = manifest.id.split("_")[0];
    if (short && !index.has(short)) index.set(short, manifest);
  }
  tableCache.set(year, index);
  return index;
}

export function reportTable(year: string, id: string): ReportTableManifest {
  const index = tableRegistry(year);
  const manifest = index.get(id);
  if (manifest === undefined) {
    const known = Array.from(index.keys()).filter((k) => k.includes("_")).sort();
    throw new ReportKeyError(
      `report ${year} has no table "${id}". Known: ${known.join(", ")}`
    );
  }
  return manifest;
}

/** A table's header and rows, read from the CSV the manifest names. */
export function reportTableRows(
  year: string,
  manifest: ReportTableManifest
): { header: string[]; rows: string[][] } {
  const text = getReportTextArtifact(year, manifest.file);
  if (text === null) {
    throw new ReportKeyError(
      `report ${year} table ${manifest.id} names ${manifest.file}, which is not present`
    );
  }
  const parsed = parseCsvTable(text);
  if (parsed.rows.length !== manifest.row_count) {
    throw new ReportKeyError(
      `report ${year} table ${manifest.id}: the manifest says ${manifest.row_count} ` +
        `rows and ${manifest.file} holds ${parsed.rows.length}`
    );
  }
  return parsed;
}

/* ----------------------------------------------------------------------- figures */

const figureCache = new Map<string, Map<string, ReportFigureManifest>>();

export function figureRegistry(year: string): Map<string, ReportFigureManifest> {
  const cached = figureCache.get(year);
  if (cached) return cached;

  const index = new Map<string, ReportFigureManifest>();
  const doc = getReportArtifact<{ figures: ReportFigureManifest[] }>(year, "figures.json");
  for (const manifest of doc?.figures ?? []) {
    index.set(manifest.id, manifest);
    const short = manifest.id.split("_")[0];
    if (short && !index.has(short)) index.set(short, manifest);
  }
  figureCache.set(year, index);
  return index;
}

export function reportFigure(year: string, id: string): ReportFigureManifest {
  const index = figureRegistry(year);
  const manifest = index.get(id);
  if (manifest === undefined) {
    const known = Array.from(index.keys()).filter((k) => k.includes("_")).sort();
    throw new ReportKeyError(
      `report ${year} has no figure "${id}". Known: ${known.join(", ")}`
    );
  }
  return manifest;
}

/** Where `copy-data.js` stages the figure images for the browser to fetch. */
export function figureSrc(year: string, id: string, ext: "svg" | "png" = "svg"): string {
  return `/reports/${year}/${id}.${ext}`;
}
