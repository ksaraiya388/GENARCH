import fs from "fs";
import path from "path";

/**
 * Build-time reader for the Virginia DEQ source tables under `pipeline/sources/`.
 *
 * Every number rendered on /community/data-center-alley is computed here, from the CSVs, at
 * build time. Nothing is hardcoded from an analysis script. The one exception is DEQ's own
 * published regression coefficients, which are external ground truth and are used only as the
 * tolerance target that `getCollocation()` asserts against.
 *
 * The site is a static export, so none of this runs in the browser: these functions execute
 * during `next build` and their return values are serialized into the page as props.
 */

/* ------------------------------------------------------------------ constants */

/** DEQ qualifier IF, "Fire -- Canadian, informational only". Inclusive on both ends, EST. */
export const SMOKE_WINDOW = { start: "2026-07-16", end: "2026-07-19" } as const;

/**
 * Record endpoint for the percentile comparison. DEQ's "Data Center Air Quality Analysis" is
 * dated 2026-08-07, so every percentile compared against its Table 4 stops there.
 *
 * The sensor export now runs to 2026-08-28, and three later editions have shipped, but the
 * comparison stays on the August 7 edition because that is the edition whose Table 4 these
 * percentiles are set beside. The later editions are tracked in `DEQ_WEEKLY_EDITIONS` as
 * DEQ's own published figures rather than as recomputed comparisons.
 *
 * A recomputation over the full record to the 2026-08-28 cutoff, including the common-window
 * ranking and the percentile-method sensitivity, is in
 * outputs/repro/p98_common_window_2026-08-28.csv. Every value there carries its cutoff as a
 * column.
 */
export const RECORD_END = "2026-08-07";

/**
 * Cutoff for the collocation reproduction, hour-level. DEQ produces each weekly edition on
 * Friday morning from data through 07:00 that day, so the August 7 edition covers the record
 * to this instant rather than to the end of the released files (DEQ staff, correspondence,
 * 2026-08-16). This is DEQ's specification, not an inference from where the data stops.
 *
 * `RECORD_END` above is date-level and drives the percentile common window. The two are not
 * interchangeable and neither should be rewritten in terms of the other.
 *
 * Moving this cutoff to a later edition is blocked on data, not on a decision. The regulatory
 * monitor released under FOIA 26-4646 ends 2026-08-10, and a collocation fit needs both sides
 * of the pair, so no cutoff past 2026-08-10 is computable at all. A follow-up FOIA request
 * extending that range is pending; until it is released, the two open APEX 5 regressions
 * cannot be compared against any edition later than the one they are pinned to here.
 */
export const DEQ_EDITION_CUTOFF = "2026-08-07 07:00:00";
export const DEQ_EDITION_CUTOFF_LABEL = "2026-08-07 07:00 EST";

/** First day on which all six deployed sensors were collecting. */
export const COMMON_WINDOW_START = "2026-06-18";

/** Level of the 24-hour PM2.5 standard, in µg/m³. Not a threshold being crossed. */
export const PM25_24H_LEVEL = 35;

/** Annual PM2.5 standard in µg/m³, as revised in 2024. */
export const PM25_ANNUAL_LEVEL = 9.0;

/** Valid hours required before a 24-hour average is computed. Agency-confirmed. */
export const COMPLETENESS_MIN_HOURS = 18;

/** Regulatory site inside Loudoun County. `aurhill` is Arlington and is out of v1 scope. */
const REGULATORY_SITE = "ashburn";

/* -------------------------------------------------------------- file resolution */

/**
 * Mirrors the cwd-fallback ladder in `resolveDataDir()` (lib/data.ts). `copy-data.js` stages
 * the three CSVs into `site/public/data/deq/` before `next build`, which covers Vercel and CI;
 * the `pipeline/sources` entries cover `next dev`, where no prebuild step has run.
 */
function resolveSourcesDir(): string {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "public", "data", "deq"),
    path.join(cwd, "site", "public", "data", "deq"),
    path.join(cwd, "..", "pipeline", "sources"),
    path.join(cwd, "pipeline", "sources"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "deq_pm25_daily.csv"))) return dir;
  }
  return candidates[candidates.length - 1];
}

const SOURCES_DIR = resolveSourcesDir();

/**
 * RFC 4180 field splitting. None of the four DEQ files currently contains a quoted field, but
 * the `notes` column of the site history is free text and one added comma would silently shift
 * every column to its right if this were a naive `split(",")`.
 */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { out.push(field); field = ""; }
    else field += c;
  }
  out.push(field);
  return out;
}

type Row = Record<string, string>;

function readCsv(filename: string): Row[] {
  const full = path.join(SOURCES_DIR, filename);
  if (!fs.existsSync(full)) {
    throw new Error(
      `DEQ source ${filename} not found under ${SOURCES_DIR}. The data-center-alley page cannot be built without it.`
    );
  }
  // The site-history export carries a UTF-8 BOM; left in place it becomes part of the first
  // header name and every lookup of `site_id` returns undefined.
  const text = fs.readFileSync(full, "utf-8").replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const header = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Row = {};
    header.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    return row;
  });
}

/* ------------------------------------------------------------------- primitives */

const dayOf = (ts: string): string => ts.slice(0, 10);
const inSmokeWindow = (ts: string): boolean =>
  dayOf(ts) >= SMOKE_WINDOW.start && dayOf(ts) <= SMOKE_WINDOW.end;

/**
 * Linear-interpolation percentile, the definition NumPy and DEQ's own analysis use. Stated
 * explicitly because the alternative "nearest rank" definition moves a 51-day p98 by a whole
 * observation, which is exactly the scale of the differences this page discusses.
 */
function percentile(values: number[], p: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const k = (sorted.length - 1) * p;
  const lo = Math.floor(k);
  const hi = Math.min(lo + 1, sorted.length - 1);
  return sorted[lo] + (k - lo) * (sorted[hi] - sorted[lo]);
}

interface Fit { intercept: number; slope: number; r2: number; n: number }

/** Ordinary least squares, sensor on x and regulatory monitor on y, matching DEQ's orientation. */
function leastSquares(xs: number[], ys: number[]): Fit {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2;
    sxy += (xs[i] - mx) * (ys[i] - my);
    syy += (ys[i] - my) ** 2;
  }
  const slope = sxy / sxx;
  return { intercept: my - slope * mx, slope, r2: (sxy * sxy) / (sxx * syy), n };
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2;
    sxy += (xs[i] - mx) * (ys[i] - my);
    syy += (ys[i] - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
}

/* --------------------------------------------------------------- source loading */

/**
 * Validity, as confirmed by DEQ staff on 2026-08-12: exclude a reading if and only if the
 * value is missing, an AQS Null Code is present, or the Flags field contains `<`. No letter
 * code alone excludes a reading, and flags are case-sensitive -- `I` (Invalidated By Edit) and
 * `l` (Low Alarm) are different codes and are never folded together.
 *
 * The pipeline already applies this rule and writes the result to the `excluded` column. It is
 * re-derived here and checked so that a change in the pipeline's interpretation surfaces as a
 * build failure rather than as a quietly different page.
 */
function assertRegulatoryValidity(rows: Row[]): void {
  let mismatches = 0;
  for (const r of rows) {
    const derived = r.value === "" || r.aqs_null_code !== "" || r.flags.includes("<");
    if (derived !== (r.excluded === "true")) mismatches++;
  }
  if (mismatches > 0) {
    throw new Error(
      `DEQ regulatory validity: ${mismatches} row(s) where the pipeline's 'excluded' column ` +
      `disagrees with the DEQ exclusion rule (missing value, AQS Null Code, or Flags containing '<'). ` +
      `Reconcile pipeline/reshape_deq.py against docs/GENARCH_RULES.md section 3 before shipping this page.`
    );
  }
}

/**
 * The sensor export carries no flag column, so its exclusions cannot be re-derived. What can be
 * checked is that the pipeline has not introduced an exclusion class this page does not know how
 * to describe -- every reason is disclosed in the limitations box, and an undisclosed one would
 * silently drop readings.
 */
const KNOWN_SENSOR_EXCLUSIONS = new Set([
  "", "exact_zero_floor", "kunak_pm25_void_window", "pre_occupancy_transit",
]);

function assertSensorExclusions(rows: Row[]): void {
  const unknown = new Set<string>();
  for (const r of rows) {
    if (!KNOWN_SENSOR_EXCLUSIONS.has(r.exclusion_reason)) unknown.add(r.exclusion_reason);
  }
  if (unknown.size > 0) {
    throw new Error(
      `DEQ sensor data carries exclusion reason(s) this page does not disclose: ` +
      `${Array.from(unknown).join(", ")}. Add them to the limitations section before shipping.`
    );
  }
}

let sensorRowsCache: Row[] | null = null;
function sensorRows(): Row[] {
  if (sensorRowsCache) return sensorRowsCache;
  const rows = readCsv("deq_data_center_air_monitoring_hourly.csv");
  assertSensorExclusions(rows);
  sensorRowsCache = rows;
  return rows;
}

let regulatoryRowsCache: Row[] | null = null;
function regulatoryRows(): Row[] {
  if (regulatoryRowsCache) return regulatoryRowsCache;
  const rows = readCsv("deq_regulatory_monitor_hourly.csv");
  assertRegulatoryValidity(rows);
  regulatoryRowsCache = rows;
  return rows;
}

/** Valid sensor readings for one pollutant: `excluded=false` and a value present. */
function validSensor(pollutant: string): Row[] {
  return sensorRows().filter(
    (r) => r.pollutant === pollutant && r.excluded === "false" && r.value !== ""
  );
}

/**
 * `validSensor()` plus the readings the pipeline drops as `exact_zero_floor`, and nothing else:
 * every other exclusion reason stays out. Named rather than inlined so that a fit running on
 * this population cannot be mistaken for one running on the default.
 *
 * Only specs carrying `retainExactZeros` reach this, and only inside `getCollocation()`. The
 * reason and the scope are in `RETAIN_ZEROS_NOTE`.
 */
function sensorRowsRetainingExactZeros(pollutant: string): Row[] {
  return sensorRows().filter(
    (r) =>
      r.pollutant === pollutant &&
      r.value !== "" &&
      (r.excluded === "false" || r.exclusion_reason === "exact_zero_floor")
  );
}

/** Valid readings from the Loudoun regulatory monitor, keyed by timestamp. */
function validRegulatory(pollutant: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of regulatoryRows()) {
    if (r.site_id !== REGULATORY_SITE) continue;
    if (r.pollutant !== pollutant || r.excluded !== "false" || r.value === "") continue;
    map.set(r.ts_est, Number(r.value));
  }
  return map;
}

/* ------------------------------------------------------------------ site roster */

/**
 * Sensors are identified by DEQ site_id and locality throughout this page, never by DEQ's
 * published site label. Four of the nine sites are hosted at schools, and rendering a school
 * name beside a concentration figure invites an inference about children at that school that
 * none of this data supports (docs/CONTENT_CONSTRAINTS.md section 4, PROMPT_AMENDMENTS A2).
 * The identifier crosswalk in `getCrosswalk()` carries DEQ's labels, with no measurements, so
 * the reproduction against DEQ's report stays checkable.
 */
export const siteLabel = (siteId: string, area: string): string => `${siteId} (${area})`;

/** `apex-05` renders as `APEX 5`, matching DEQ's report. Hardware units are not sites. */
export function unitLabel(unitId: string): string {
  if (!unitId || unitId === "TO_CONFIRM") return "not confirmed";
  const m = unitId.match(/^apex-0*(\d+)$/);
  return m ? `APEX ${m[1]}` : unitId;
}

export interface RosterEntry {
  siteId: string;
  area: string;
  label: string;
  units: { unitId: string; unitLabel: string; confidence: string; start: string; end: string }[];
  startDate: string;
  endDate: string;
  pm25EndDate: string;
  collocatedRegulatory: boolean;
  /** False for the three sites DEQ shows as "Location without device". */
  hasExport: boolean;
  status: "active" | "retired";
  validPm25Hours: number;
}

export function getSiteRoster(): RosterEntry[] {
  const history = readCsv("deq_sensor_site_history.csv");
  const hours = new Map<string, number>();
  for (const r of validSensor("PM2.5")) {
    hours.set(r.site_id, (hours.get(r.site_id) ?? 0) + 1);
  }
  const exported = new Set(sensorRows().map((r) => r.site_id));

  const bySite = new Map<string, RosterEntry>();
  for (const r of history) {
    const existing = bySite.get(r.site_id);
    const unit = {
      unitId: r.unit_id,
      unitLabel: unitLabel(r.unit_id),
      confidence: r.unit_id_confidence,
      start: r.start_date,
      end: r.end_date,
    };
    if (existing) {
      // A site's occupancy spans all of its unit rows: ashburn-collocated has two, one per
      // hardware unit, and reading the status off the first row alone would retire a site that
      // is still collecting under its second unit.
      existing.units.push(unit);
      if (r.start_date < existing.startDate) existing.startDate = r.start_date;
      existing.endDate = r.end_date === "" || existing.endDate === "" ? "" : r.end_date;
      if (r.pm25_end_date !== "") existing.pm25EndDate = r.pm25_end_date;
      continue;
    }
    bySite.set(r.site_id, {
      siteId: r.site_id,
      area: r.area,
      label: siteLabel(r.site_id, r.area),
      units: [unit],
      startDate: r.start_date,
      endDate: r.end_date,
      pm25EndDate: r.pm25_end_date,
      collocatedRegulatory: r.collocated_regulatory.toUpperCase() === "TRUE",
      hasExport: exported.has(r.site_id),
      status: "active",
      validPm25Hours: hours.get(r.site_id) ?? 0,
    });
  }
  // Status is derived only once every unit row for the site has been folded in.
  bySite.forEach((site) => {
    site.status = site.endDate === "" ? "active" : "retired";
  });
  return Array.from(bySite.values()).sort((a, b) => a.siteId.localeCompare(b.siteId));
}

/** The six sites with a downloadable record, in stable order. */
export function getActiveSiteIds(): string[] {
  return getSiteRoster().filter((s) => s.hasExport).map((s) => s.siteId);
}

/* ------------------------------------------------------- hourly PM2.5 time series */

export interface HourlySeriesPayload {
  /** Hour-beginning EST timestamps, ascending. Shared index for every series. */
  hours: string[];
  series: {
    key: string;
    label: string;
    instrumentClass: "sensor" | "regulatory";
    /** Aligned to `hours`. `null` is a gap and is rendered as a gap, never as zero. */
    values: (number | null)[];
  }[];
  /** Index range of the smoke window within `hours`, for the ReferenceArea. */
  smokeFrom: string;
  smokeTo: string;
}

/**
 * One line per deployed sensor plus the regulatory monitor. The two instrument classes stay
 * separate series and are labelled as such: merged into one line, DEQ's CFR language would be
 * false on its face.
 */
export function getHourlySeries(): HourlySeriesPayload {
  const roster = getSiteRoster();
  const sensorByKey = new Map<string, Map<string, number>>();
  for (const r of validSensor("PM2.5")) {
    let m = sensorByKey.get(r.site_id);
    if (!m) { m = new Map(); sensorByKey.set(r.site_id, m); }
    m.set(r.ts_est, Number(r.value));
  }
  const regulatory = validRegulatory("PM2.5");

  const hourSet = new Set<string>();
  sensorByKey.forEach((m) => m.forEach((_v, ts) => hourSet.add(ts)));
  regulatory.forEach((_v, ts) => hourSet.add(ts));
  const hours = Array.from(hourSet).sort();

  const series: HourlySeriesPayload["series"] = [];
  for (const site of roster) {
    const m = sensorByKey.get(site.siteId);
    if (!m) continue;
    series.push({
      key: site.siteId,
      label: site.label,
      instrumentClass: "sensor",
      values: hours.map((h) => m.get(h) ?? null),
    });
  }
  series.push({
    key: REGULATORY_SITE,
    label: `${REGULATORY_SITE} regulatory monitor (Ashburn)`,
    instrumentClass: "regulatory",
    values: hours.map((h) => regulatory.get(h) ?? null),
  });

  const smokeHours = hours.filter(inSmokeWindow);
  return {
    hours,
    series,
    smokeFrom: smokeHours[0] ?? SMOKE_WINDOW.start,
    smokeTo: smokeHours[smokeHours.length - 1] ?? SMOKE_WINDOW.end,
  };
}

/* --------------------------------------------------- summary statistics, split two ways */

export interface SplitStat {
  key: string;
  label: string;
  instrumentClass: "sensor" | "regulatory";
  withSmoke: { n: number; mean: number; max: number };
  withoutSmoke: { n: number; mean: number; max: number };
}

const summarize = (v: number[]) => ({
  n: v.length,
  mean: v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN,
  max: v.length ? Math.max(...v) : NaN,
});

/**
 * Every summary statistic on this page is reported twice, with and without 2026-07-16 to 19.
 * A pooled figure spanning the smoke transport episode and ordinary conditions sits between two
 * regimes and describes neither.
 */
export function getSmokeSplitStats(): SplitStat[] {
  const roster = getSiteRoster();
  const out: SplitStat[] = [];
  for (const site of roster) {
    const rows = validSensor("PM2.5").filter((r) => r.site_id === site.siteId);
    if (rows.length === 0) continue;
    const all = rows.map((r) => Number(r.value));
    const clean = rows.filter((r) => !inSmokeWindow(r.ts_est)).map((r) => Number(r.value));
    out.push({
      key: site.siteId,
      label: site.label,
      instrumentClass: "sensor",
      withSmoke: summarize(all),
      withoutSmoke: summarize(clean),
    });
  }
  const reg = Array.from(validRegulatory("PM2.5").entries());
  out.push({
    key: REGULATORY_SITE,
    label: `${REGULATORY_SITE} regulatory monitor (Ashburn)`,
    instrumentClass: "regulatory",
    withSmoke: summarize(reg.map(([, v]) => v)),
    withoutSmoke: summarize(reg.filter(([ts]) => !inSmokeWindow(ts)).map(([, v]) => v)),
  });
  return out;
}

/* ------------------------------------------------------------ collocation panel */

/**
 * A coefficient set DEQ issued by correspondence in place of one it had already published.
 * Carried in the data rather than only in the page's prose, so the provenance difference
 * between a figure read off a published report and a figure supplied by email survives any
 * later rewrite of the surrounding paragraphs.
 */
export interface DeqCorrection {
  /** Date of the DEQ correspondence carrying the corrected coefficients. */
  correspondenceDate: string;
  /** Report edition whose coefficients the correction replaces. */
  supersedesEdition: string;
  /** What that edition printed. */
  published: { intercept: number; slope: number; r2: number };
  /**
   * The first edition to carry the corrected regression in print, and the coefficients it
   * printed. Those coefficients are not the ones in `deq` above and are not meant to be: the
   * edition refits on a longer record, so it answers a different question than the row does.
   * Held here so the page can cite a published edition for the fact that DEQ corrected the
   * regression, rather than resting that fact on correspondence alone.
   */
  inPrint: {
    edition: string;
    coefficients: { intercept: number; slope: number; r2: number };
  };
}

interface DeqPublishedSpec {
  key: string;
  unitId: string;
  pollutant: string;
  unit: string;
  /** DEQ's coefficients: from the August 7 report, or from `correction` where one exists. */
  intercept: number;
  slope: number;
  r2: number;
  assertAgainstDeq: boolean;
  /**
   * Readmit the sensor's exact-zero readings into this one fit. See `RETAIN_ZEROS_NOTE`.
   * Absent means the pipeline's normal exclusion applies, which is the default everywhere.
   */
  retainExactZeros?: boolean;
  correction?: DeqCorrection;
  /**
   * Why this pair is held as a record rather than asserted. Present only where the two
   * sides are known to be computed over windows that cannot be aligned, so a passing
   * comparison would not mean what a passing comparison is supposed to mean.
   */
  nonComparable?: NonComparable;
}

/**
 * A DEQ figure and a GENARCH figure that are both correct and cannot be compared.
 *
 * `restoreWhen` is a live marker, not a comment. The gate comes back when the condition it
 * names is met, and the divergence stays visible on the page until then.
 */
export interface NonComparable {
  /** Window the DEQ coefficients were computed over. */
  deqCutoff: string;
  /** Window the GENARCH fit beside them stops at. */
  genarchCutoff: string;
  reason: string;
  restoreWhen: string;
  blockedOn: string;
}

/**
 * DEQ retains exact-zero sensor measurements in the APEX 5 NO2 collocation regression, and
 * confirmed that in correspondence on 2026-08-19 along with the corrected coefficients and the
 * underlying paired-hourly data. The pipeline excludes those readings globally as a
 * per-pollutant floor clamp (docs/GENARCH_RULES.md section 4), so this one fit has to readmit
 * them to be the same calculation DEQ ran.
 *
 * The flag is per comparison rather than per function, and deliberately so. Readmitting zeros
 * into the other three moves coefficients that currently reproduce back outside tolerance --
 * APEX 14 PM2.5 intercept to 1.368 against a published 1.3, APEX 14 NO2 R² to 0.549 against a
 * published 0.49. DEQ's confirmation covers the regression it was asked about; extending it to
 * regressions the agency did not speak to would be an inference, and the arithmetic says it
 * would be the wrong one.
 *
 * Nothing outside `getCollocation()` reads this flag. Percentiles, daily averages, smoke-window
 * splits and every other statistic on the page keep the pipeline's exclusion, because the effect
 * of retaining zeros there is untested and is a separate question.
 */
const RETAIN_ZEROS_NOTE =
  "DEQ staff confirmed on 2026-08-19 that exact-zero measurements are retained in this regression.";

/**
 * DEQ's regressions at the collocated site. External ground truth: the build-time fits are
 * asserted against these, not against any figure produced by a GENARCH analysis script.
 *
 * Three come from the August 7 2026 report. The APEX 5 NO2 entry carries DEQ's 2026-08-19
 * correction instead, with the August 7 figures preserved in `correction.published`.
 *
 * Every entry stays pinned to the August 7 window even though later editions have shipped,
 * because the GENARCH column is computed over exactly that span and the record itself stops
 * there. A later edition refits the two open-ended APEX 5 regressions on more weeks of data, so
 * setting one of its coefficients beside a GENARCH fit cut off at August 7 would compare two
 * different windows and read as a reproduction failure. `correction.inPrint` carries the later
 * figure where it belongs, as provenance rather than as a comparator.
 */
const DEQ_PUBLISHED: readonly DeqPublishedSpec[] = [
  { key: "apex-14-pm25", unitId: "apex-14", pollutant: "PM2.5", unit: "µg/m³",
    intercept: 1.3, slope: 0.83, r2: 0.73, assertAgainstDeq: true },
  { key: "apex-05-pm25", unitId: "apex-05", pollutant: "PM2.5", unit: "µg/m³",
    intercept: -4.7, slope: 1.7, r2: 0.84, assertAgainstDeq: true },
  { key: "apex-14-no2", unitId: "apex-14", pollutant: "NO2", unit: "ppb",
    intercept: 2.2, slope: 1.1, r2: 0.49, assertAgainstDeq: true },
  // Not asserted. See `nonComparable` below: the two sides are pinned to windows that
  // cannot be aligned in either direction, so the gate was demoted on 2026-08-29.
  { key: "apex-05-no2", unitId: "apex-05", pollutant: "NO2", unit: "ppb",
    intercept: 1.8, slope: 0.32, r2: 0.21, assertAgainstDeq: false,
    // RETAIN_ZEROS_NOTE above carries the reason and the scope of this one flag.
    retainExactZeros: true,
    correction: {
      correspondenceDate: "2026-08-19",
      supersedesEdition: "2026-08-07",
      published: { intercept: 1.9, slope: 0.29, r2: 0.17 },
      inPrint: {
        edition: "2026-08-21",
        coefficients: { intercept: 1.8, slope: 0.31, r2: 0.2 },
      },
    },
    nonComparable: {
      deqCutoff: "2026-08-19 correspondence, refit over DEQ's record to that date",
      genarchCutoff: DEQ_EDITION_CUTOFF_LABEL,
      reason:
        "DEQ's corrected coefficients were computed over a window that runs past the " +
        "2026-08-07 edition cutoff the GENARCH fit stops at. The fit cannot be extended " +
        "to meet them: a collocation fit needs both sides of each hourly pair, and the " +
        "regulatory monitor released under FOIA 26-4646 ends 2026-08-10. Neither side " +
        "can be moved, so no change on this side makes the comparison valid. A gate that " +
        "passes on a comparison known to be non-comparable is worse than no gate.",
      restoreWhen:
        "The follow-up FOIA request extends the regulatory record past 2026-08-10 and " +
        "the GENARCH fit can be recomputed over DEQ's own correction window. Set " +
        "assertAgainstDeq back to true and drop this block.",
      blockedOn: "FOIA 26-4646 follow-up request, pending",
    } },
];

/** Agreement tolerance against DEQ's published coefficients. */
export const DEQ_TOLERANCE = { coefficient: 0.05, r2: 0.03 } as const;

export interface CollocationRow {
  key: string;
  unitId: string;
  unitLabel: string;
  pollutant: string;
  unit: string;
  deq: { intercept: number; slope: number; r2: number };
  genarch: Fit;
  delta: { intercept: number; slope: number; r2: number };
  reproduces: boolean;
  asserted: boolean;
  /** True where this fit readmits the sensor's exact zeros. See `RETAIN_ZEROS_NOTE`. */
  retainsExactZeros: boolean;
  /** Present where `deq` above is a correction rather than a figure read off a report. */
  correction?: DeqCorrection;
  /**
   * Present where the pair is recorded rather than asserted. `reproduces` is still computed
   * and still rendered; what this says is that agreeing or disagreeing would not mean
   * anything, because the two sides are computed over windows that cannot be aligned.
   */
  nonComparable?: NonComparable;
}

/**
 * Build-time gate. A coefficient that has drifted outside tolerance of DEQ's published value
 * means the pipeline and the agency no longer agree, and the page's central claim -- that
 * GENARCH's processing reproduces an authoritative source -- would be false. That is a build
 * failure, not a rendering detail.
 *
 * Every fit stops at `DEQ_EDITION_CUTOFF`, because the DEQ coefficients being reproduced were
 * computed over exactly that span.
 *
 * Three of the four specs are asserted. `apex-05-no2` is not: its DEQ side is the 2026-08-19
 * correction, computed over a window that runs past this cutoff, and the FOIA-capped
 * regulatory record makes the gap unclosable from here. It is carried as a recorded pair with
 * a `nonComparable` label rather than dropped, so the divergence stays visible and the gate
 * can be restored when the extended regulatory record arrives.
 */
export function getCollocation(): CollocationRow[] {
  const rows: CollocationRow[] = [];
  for (const spec of DEQ_PUBLISHED) {
    const regulatory = validRegulatory(spec.pollutant);
    // Local to this function and to the specs that set the flag. `validSensor()` and every
    // other caller keep the pipeline's exclusion untouched -- see `RETAIN_ZEROS_NOTE`.
    const candidates = spec.retainExactZeros
      ? sensorRowsRetainingExactZeros(spec.pollutant)
      : validSensor(spec.pollutant);
    const xs: number[] = [];
    const ys: number[] = [];
    for (const r of candidates) {
      if (r.site_id !== "ashburn-collocated" || r.unit_id !== spec.unitId) continue;
      if (r.ts_est > DEQ_EDITION_CUTOFF) continue;
      const y = regulatory.get(r.ts_est);
      if (y === undefined) continue;
      xs.push(Number(r.value));
      ys.push(y);
    }
    const genarch = leastSquares(xs, ys);
    const delta = {
      intercept: Math.abs(genarch.intercept - spec.intercept),
      slope: Math.abs(genarch.slope - spec.slope),
      r2: Math.abs(genarch.r2 - spec.r2),
    };
    const reproduces =
      delta.intercept <= DEQ_TOLERANCE.coefficient &&
      delta.slope <= DEQ_TOLERANCE.coefficient &&
      delta.r2 <= DEQ_TOLERANCE.r2;

    if (spec.assertAgainstDeq && !reproduces) {
      throw new Error(
        `DEQ collocation reproduction failed for ${spec.unitId} ${spec.pollutant}: ` +
        `intercept ${genarch.intercept.toFixed(3)} vs DEQ ${spec.intercept} (delta ${delta.intercept.toFixed(3)}), ` +
        `slope ${genarch.slope.toFixed(3)} vs DEQ ${spec.slope} (delta ${delta.slope.toFixed(3)}), ` +
        `R2 ${genarch.r2.toFixed(3)} vs DEQ ${spec.r2} (delta ${delta.r2.toFixed(3)}), n=${genarch.n}. ` +
        `Tolerance is ${DEQ_TOLERANCE.coefficient} on coefficients and ${DEQ_TOLERANCE.r2} on R2.`
      );
    }
    rows.push({
      key: spec.key,
      unitId: spec.unitId,
      unitLabel: unitLabel(spec.unitId),
      pollutant: spec.pollutant,
      unit: spec.unit,
      deq: { intercept: spec.intercept, slope: spec.slope, r2: spec.r2 },
      genarch,
      delta,
      reproduces,
      asserted: spec.assertAgainstDeq,
      retainsExactZeros: spec.retainExactZeros === true,
      correction: spec.correction,
      nonComparable: spec.nonComparable,
    });
  }
  return rows;
}

/* ------------------------------------------------------- APEX 5 NO2 diagnostics */

/** Sensor concentration at which the two regression lines are compared, in ppb. */
const NO2_SEPARATION_AT = 10;

export interface No2Diagnostics {
  /** The same fit with the exact zeros dropped, which is the treatment used everywhere else. */
  zerosDropped: Fit;
  zeroCount: number;
  zeroTotal: number;
  zeroSharePct: number;
  /** Longest consecutive run of exact zeros in the APEX 5 window, in hours. */
  maxZeroRun: number;
  /** Mean of the valid regulatory NO2 series through the cutoff, in ppb. */
  regulatoryMean: number;
  separationAt: number;
  /** Gap between GENARCH's fitted line and DEQ's at `separationAt`, in ppb. */
  separationPpb: number;
}

/**
 * Figures behind the APEX 5 NO2 paragraph. The comparison in `getCollocation()` retains the
 * sensor's exact zeros, because DEQ does; this computes the counterfactual with them dropped,
 * which is the treatment every other statistic on the page uses and the value this page carried
 * before 2026-08-19. Both fits are computed from the source tables at build time so the
 * paragraph states measured numbers rather than a recollection of an analysis run.
 *
 * Scope is the APEX 5 window throughout, since that is the window the fit uses. The site-level
 * exact-zero share over the whole NO2 record is a different population and is recorded in
 * docs/GENARCH_RULES.md section 4, not here.
 */
export function getNo2Diagnostics(): No2Diagnostics {
  const spec = DEQ_PUBLISHED.find((s) => s.key === "apex-05-no2");
  if (!spec) throw new Error("apex-05-no2 is missing from DEQ_PUBLISHED.");

  const regulatory = validRegulatory(spec.pollutant);
  const isUnit = (r: Row) =>
    r.site_id === "ashburn-collocated" && r.pollutant === spec.pollutant && r.unit_id === spec.unitId;

  const dx: number[] = [];
  const dy: number[] = [];
  let zeroCount = 0;
  let zeroTotal = 0;
  let maxZeroRun = 0;
  for (const r of sensorRows()) {
    if (!isUnit(r) || r.ts_est > DEQ_EDITION_CUTOFF) continue;
    zeroTotal++;
    if (r.exclusion_reason === "exact_zero_floor") {
      zeroCount++;
      const run = Number(r.zero_run_length);
      if (Number.isFinite(run) && run > maxZeroRun) maxZeroRun = run;
      continue;
    }
    if (r.value === "" || r.excluded === "true") continue;
    const y = regulatory.get(r.ts_est);
    if (y === undefined) continue;
    dx.push(Number(r.value));
    dy.push(y);
  }

  let regSum = 0;
  let regN = 0;
  regulatory.forEach((v, ts) => {
    if (ts > DEQ_EDITION_CUTOFF) return;
    regSum += v;
    regN++;
  });

  const cutoffFit = getCollocation().find((c) => c.key === spec.key);
  if (!cutoffFit) throw new Error("apex-05-no2 is missing from the collocation table.");
  const genarchAt = cutoffFit.genarch.intercept + cutoffFit.genarch.slope * NO2_SEPARATION_AT;
  const deqAt = spec.intercept + spec.slope * NO2_SEPARATION_AT;

  return {
    zerosDropped: leastSquares(dx, dy),
    zeroCount,
    zeroTotal,
    zeroSharePct: (100 * zeroCount) / zeroTotal,
    maxZeroRun,
    regulatoryMean: regSum / regN,
    separationAt: NO2_SEPARATION_AT,
    separationPpb: Math.abs(genarchAt - deqAt),
  };
}

/* -------------------------------------------------- daily average reconciliation */

export interface DailyReconciliation {
  compared: number;
  matching: number;
  meanAbsoluteDifference: number;
  mismatches: { siteId: string; date: string; recomputed: number; truncated: number; published: number }[];
}

/**
 * The days DEQ staff have reviewed. The page names this date and reports what DEQ said about it,
 * so a mismatch set that no longer matches makes an attributed sentence false. Reviewing a new
 * date means adding it here and writing what DEQ said; it is not a constant to widen until the
 * check passes.
 */
const DEQ_REVIEWED_MISMATCHES = ["2026-03-10"];

/**
 * DEQ truncates published daily averages to one decimal rather than rounding, so the comparison
 * truncates too. Only days meeting the 18-of-24 completeness rule are compared; DEQ's published
 * daily file applies no threshold of its own.
 */
export function getDailyReconciliation(): DailyReconciliation {
  const rows = readCsv("deq_pm25_daily.csv").filter(
    (r) => r.published_value !== "" && r.mean_pm25_ugm3 !== "" && r.meets_18_of_24 === "true"
  );
  let sum = 0;
  const mismatches: DailyReconciliation["mismatches"] = [];
  for (const r of rows) {
    const recomputed = Number(r.mean_pm25_ugm3);
    const truncated = Math.floor(recomputed * 10) / 10;
    const published = Number(r.published_value);
    const diff = Math.abs(truncated - published);
    sum += diff;
    if (diff > 1e-9) {
      mismatches.push({ siteId: r.site_id, date: r.date_est, recomputed, truncated, published });
    }
  }
  const dates = mismatches.map((m) => m.date).sort();
  if (dates.join(",") !== DEQ_REVIEWED_MISMATCHES.join(",")) {
    throw new Error(
      `DEQ daily reconciliation: the days that differ are now ${dates.join(", ") || "(none)"}, ` +
      `but the collocation section attributes a review to DEQ staff for ${DEQ_REVIEWED_MISMATCHES.join(", ")}. ` +
      `Update that paragraph and DEQ_REVIEWED_MISMATCHES together, so the page does not attribute ` +
      `a statement to DEQ about a day the agency has not been asked about.`
    );
  }

  return {
    compared: rows.length,
    matching: rows.length - mismatches.length,
    meanAbsoluteDifference: sum / rows.length,
    mismatches,
  };
}

/* --------------------------------------------- record length and p98 comparison */

export interface WeeklyEdition {
  /** Edition date in the form the surrounding prose writes it. */
  label: string;
  /** Column-header form, short enough for a table head. */
  short: string;
}

export interface WeeklyEditionRow {
  metric: string;
  unit: string;
  /**
   * One figure per entry in `DEQ_WEEKLY_EDITIONS.editions`, same order, oldest first. The
   * tuple length is what keeps the two aligned: add an edition without adding its figure and
   * the typecheck fails rather than the table rendering a column short.
   */
  values: readonly [number, number, number, number];
}

/**
 * Figures for one sensor as published in four consecutive editions of DEQ's weekly analysis.
 *
 * These twelve values are transcribed from DEQ's own PDFs, not computed from the source
 * tables, and they cannot be computed from them: they are DEQ's published outputs over DEQ's
 * own windows, each one a week longer than the last. The August 7, 14 and 21 editions are
 * archived under docs/deq-reports/ and the August 28 edition under pipeline/sources/deq/.
 * All twelve were diffed against those four PDFs on 2026-08-29 and reproduce exactly.
 *
 * They are here rather than in the page so that the edition dates and the values stay attached
 * to each other. Adding an edition means adding a column, not editing prose.
 */
export const DEQ_WEEKLY_EDITIONS = {
  siteId: "sterling-ms",
  editions: [
    { label: "August 7, 2026", short: "Aug 7" },
    { label: "August 14, 2026", short: "Aug 14" },
    { label: "August 21, 2026", short: "Aug 21" },
    { label: "August 28, 2026", short: "Aug 28" },
  ] as readonly [WeeklyEdition, WeeklyEdition, WeeklyEdition, WeeklyEdition],
  rows: [
    { metric: "98th percentile of daily PM2.5 averages", unit: "µg/m³", values: [40.4, 38.2, 36.0, 33.8] },
    { metric: "98th percentile of hourly PM2.5", unit: "µg/m³", values: [69.1, 62.3, 56.8, 53.6] },
    { metric: "Mean hourly PM2.5", unit: "µg/m³", values: [11.3, 11.1, 10.8, 10.5] },
  ] as readonly WeeklyEditionRow[],
};

export interface RankPosition {
  /** One-indexed rank of the observation the percentile is read from, ascending. */
  lower: number;
  upper: number;
  n: number;
  /** True when the percentile lands exactly on an observation rather than between two. */
  exact: boolean;
}

/**
 * Which ranked observation a percentile is actually read from, at a given record length.
 *
 * The label "98th percentile" is fixed but the position it points at is not: under the
 * linear-interpolation definition the index is (n - 1) x 0.98, so a 51-day record reads its p98
 * from the 50th of 51 days while a 152-day record reads it from between the 148th and 149th of
 * 152. Same statistic name, different order statistic. A short record reads it from very near
 * the maximum; a long one reads it from inside the upper tail, where the observations are
 * denser.
 *
 * This is the order-statistic form of the argument, and it is the primary one. The magnitude is
 * measurable two ways: changing only the interpolation convention moves the shortest record's
 * p98 by 13.27 ug/m3 against 0.35 to 2.33 for the longer ones, and moving the day boundary by
 * one hour moves it by up to 2.12 ug/m3 at every site while the mean holds to within 0.05. See
 * docs/PERCENTILE_METHOD.md.
 */
export function percentilePosition(n: number, p = 0.98): RankPosition {
  const k = (n - 1) * p;
  const lo = Math.floor(k);
  const exact = Math.abs(k - lo) < 1e-9;
  return { lower: lo + 1, upper: exact ? lo + 1 : Math.min(lo + 2, n), n, exact };
}

export interface PercentileRow {
  key: string;
  label: string;
  fullDays: number;
  fullP98: number;
  fullPosition: RankPosition;
  commonDays: number;
  commonP98: number;
  commonPosition: RankPosition;
  /** Share of the site's full record falling in the smoke window, as a percentage. */
  smokeShare: number;
  firstDay: string;
  lastDay: string;
}

/** Daily 24-hour means per site, subject to the 18-of-24 completeness rule. */
function dailyMeans(siteId: string): Map<string, number> {
  const buckets = new Map<string, number[]>();
  for (const r of validSensor("PM2.5")) {
    if (r.site_id !== siteId) continue;
    const day = dayOf(r.ts_est);
    const b = buckets.get(day);
    if (b) b.push(Number(r.value));
    else buckets.set(day, [Number(r.value)]);
  }
  const out = new Map<string, number>();
  buckets.forEach((vals, day) => {
    if (vals.length < COMPLETENESS_MIN_HOURS) return;
    out.set(day, vals.reduce((a, b) => a + b, 0) / vals.length);
  });
  return out;
}

/**
 * Sensor records differ in length by a factor of three and the shortest falls entirely in high
 * summer, so a percentile computed over each site's own record is read from a different order
 * statistic at each site. Restricting every site to the window in which all six were collecting
 * removes the unequal-length difference. It does not remove the unequal-seasonality one: the
 * common window is entirely high summer and contains the smoke period, so it is a comparison
 * with one confound held rather than a clean control, and the page says so.
 */
export function getPercentiles(): PercentileRow[] {
  const out: PercentileRow[] = [];
  for (const site of getSiteRoster()) {
    if (!site.hasExport) continue;
    const means = dailyMeans(site.siteId);
    const days = Array.from(means.keys()).filter((d) => d <= RECORD_END).sort();
    if (days.length === 0) continue;
    const common = days.filter((d) => d >= COMMON_WINDOW_START);
    const smokeDays = days.filter((d) => d >= SMOKE_WINDOW.start && d <= SMOKE_WINDOW.end);
    out.push({
      key: site.siteId,
      label: site.label,
      fullDays: days.length,
      fullP98: percentile(days.map((d) => means.get(d)!), 0.98),
      fullPosition: percentilePosition(days.length),
      commonDays: common.length,
      commonP98: percentile(common.map((d) => means.get(d)!), 0.98),
      commonPosition: percentilePosition(common.length),
      smokeShare: (smokeDays.length / days.length) * 100,
      firstDay: days[0],
      lastDay: days[days.length - 1],
    });
  }
  return out.sort((a, b) => b.commonP98 - a.commonP98);
}

/* ------------------------------------------------------- cross-site correlation */

export interface CorrelationPayload {
  keys: string[];
  labels: Record<string, string>;
  /** Upper-triangle pairs; `r` and the hour count `n` for each. */
  pairs: { a: string; b: string; r: number; n: number }[];
  rMin: number;
  rMax: number;
  nMin: number;
  nMax: number;
  /** Median and maximum of the hourly max-to-min ratio across sites. */
  ratioMedian: number;
  ratioMax: number;
  ratioN: number;
}

/**
 * Hourly PM2.5 correlation across the deployed sensors, smoke window excluded, exact-zero
 * readings already treated as missing by the pipeline's `exact_zero_floor` exclusion.
 * Descriptive only: high spatial correlation does not establish that local sources contribute
 * nothing, since the network may sit largely upwind and a local increment can be masked by a
 * dominant regional signal.
 */
export function getCorrelations(): CorrelationPayload {
  const roster = getSiteRoster().filter((s) => s.hasExport);
  const byKey = new Map<string, Map<string, number>>();
  for (const site of roster) byKey.set(site.siteId, new Map());
  for (const r of validSensor("PM2.5")) {
    if (inSmokeWindow(r.ts_est)) continue;
    byKey.get(r.site_id)?.set(r.ts_est, Number(r.value));
  }

  const keys = roster.map((s) => s.siteId);
  const labels: Record<string, string> = {};
  for (const s of roster) labels[s.siteId] = s.label;

  const pairs: CorrelationPayload["pairs"] = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const ma = byKey.get(keys[i])!;
      const mb = byKey.get(keys[j])!;
      const xs: number[] = [];
      const ys: number[] = [];
      ma.forEach((v, ts) => {
        const w = mb.get(ts);
        if (w !== undefined) { xs.push(v); ys.push(w); }
      });
      if (xs.length < 2) continue;
      pairs.push({ a: keys[i], b: keys[j], r: pearson(xs, ys), n: xs.length });
    }
  }

  // Hourly max-to-min ratio across whichever sites were reporting that hour.
  const perHour = new Map<string, number[]>();
  byKey.forEach((m) => {
    m.forEach((v, ts) => {
      const b = perHour.get(ts);
      if (b) b.push(v); else perHour.set(ts, [v]);
    });
  });
  const ratios: number[] = [];
  perHour.forEach((vals) => {
    if (vals.length < 2) return;
    const lo = Math.min(...vals);
    if (lo <= 0) return;
    ratios.push(Math.max(...vals) / lo);
  });
  ratios.sort((a, b) => a - b);

  return {
    keys,
    labels,
    pairs,
    rMin: Math.min(...pairs.map((p) => p.r)),
    rMax: Math.max(...pairs.map((p) => p.r)),
    nMin: Math.min(...pairs.map((p) => p.n)),
    nMax: Math.max(...pairs.map((p) => p.n)),
    ratioMedian: ratios[Math.floor(ratios.length / 2)],
    ratioMax: ratios[ratios.length - 1],
    ratioN: ratios.length,
  };
}

/* ------------------------------------------------------------------- crosswalk */

export interface CrosswalkRow {
  siteId: string;
  area: string;
  deqLabel: string;
  kunakLabel: string;
}

/**
 * Identifiers only: site_id, locality, DEQ's published site label, and the exact string Kunak's
 * dashboard displays. No reading value, percentile, or measurement of any kind appears in this
 * table, and none may be added to it. It exists so a reader can map this page onto DEQ's August 7
 * report, which is what makes the reproduction checkable.
 */
export function getCrosswalk(): CrosswalkRow[] {
  const seen = new Set<string>();
  const out: CrosswalkRow[] = [];
  for (const r of readCsv("deq_sensor_site_history.csv")) {
    if (seen.has(r.site_id)) continue;
    seen.add(r.site_id);
    out.push({
      siteId: r.site_id,
      area: r.area,
      deqLabel: r.site_name,
      kunakLabel: r.kunak_label,
    });
  }
  return out.sort((a, b) => a.siteId.localeCompare(b.siteId));
}

/* ------------------------------------------------------------------ provenance */

export interface ProvenanceEntry {
  file: string;
  purpose: string;
  originUrl: string;
  retrievalMethod: string;
  downloadDate: string;
  license: string;
  coverage: string;
  bytes: number;
}

interface ManifestSource {
  file: string;
  purpose?: string;
  origin_urls?: string[];
  retrieval_method?: string;
  download_date?: string;
  license?: string;
  coverage?: string;
}

/**
 * Licence and retrieval method are read from `pipeline/sources/manifest.json` rather than
 * restated here, so what the page tells a reader about provenance cannot drift from the record
 * the pipeline maintains.
 *
 * `deq_pm25_daily.csv` has no manifest entry of its own: it is derived by the pipeline from the
 * two hourly tables rather than retrieved, and its provenance is described as such.
 */
const DERIVED_DAILY: ManifestSource = {
  file: "deq_pm25_daily.csv",
  purpose:
    "Daily 24-hour PM2.5 averages recomputed from the hourly tables under the 18-of-24 completeness rule, with DEQ's published daily file carried alongside for reconciliation.",
  retrieval_method:
    "derived by the pipeline from deq_data_center_air_monitoring_hourly.csv and deq_regulatory_monitor_hourly.csv; published values from AshburnPM2.5_dailyAvg_030326_081026.xls, released under FOIA 26-4646",
  origin_urls: ["https://vadeq.nextrequest.com/requests/26-4646"],
  download_date: "2026-08-11",
  license:
    "Public records released in full under the Virginia Freedom of Information Act, no redactions, no cost. Credit Virginia DEQ.",
  coverage: "2026-03-03 to 2026-08-10, six sensor sites and the Ashburn regulatory monitor",
};

export function getProvenance(): ProvenanceEntry[] {
  const candidates = [
    path.join(SOURCES_DIR, "manifest.json"),
    path.join(process.cwd(), "..", "pipeline", "sources", "manifest.json"),
    path.join(process.cwd(), "pipeline", "sources", "manifest.json"),
  ];
  const found = candidates.find((f) => fs.existsSync(f));
  const sources: ManifestSource[] = found
    ? (JSON.parse(fs.readFileSync(found, "utf-8")) as { sources: ManifestSource[] }).sources
    : [];

  const wanted = [
    "deq_data_center_air_monitoring_hourly.csv",
    "deq_regulatory_monitor_hourly.csv",
    "deq_pm25_daily.csv",
  ];
  return wanted.map((name) => {
    const entry =
      sources.find((s) => s.file === name) ??
      (name === DERIVED_DAILY.file ? DERIVED_DAILY : undefined);
    const onDisk = path.join(SOURCES_DIR, name);
    return {
      file: name,
      purpose: entry?.purpose ?? "",
      originUrl: entry?.origin_urls?.[0] ?? "",
      retrievalMethod: entry?.retrieval_method ?? "",
      downloadDate: entry?.download_date ?? "",
      license: entry?.license ?? "",
      coverage: entry?.coverage ?? "",
      bytes: fs.existsSync(onDisk) ? fs.statSync(onDisk).size : 0,
    };
  });
}
