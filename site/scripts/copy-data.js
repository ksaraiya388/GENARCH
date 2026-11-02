#!/usr/bin/env node
/**
 * Copies ../data into ./_data so the Next.js build can access it
 * regardless of how the working directory is configured (Vercel, CI, local).
 */
const fs = require("fs");
const path = require("path");

const src = path.resolve(__dirname, "..", "..", "data");
const dest = path.resolve(__dirname, "..", "_data");

if (!fs.existsSync(src)) {
  console.log(`[copy-data] Source ${src} not found — skipping.`);
  process.exit(0);
}

function copyRecursive(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Remove stale copy
if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}

copyRecursive(src, dest);
console.log(`[copy-data] Copied ${src} → ${dest}`);

/**
 * The DEQ monitoring tables live under pipeline/sources/ rather than data/, because they are
 * source records rather than atlas entities. /community/data-center-alley reads them at build
 * time, so they are staged into `_data/deq/` where the build can reach them regardless of how
 * the working directory is configured.
 *
 * `_data/` is not served. These files carry a `site_id` column, DEQ's published school labels
 * and free-text notes naming both, so a served copy would put internal slugs and school names
 * in a reader's hands no matter what the page itself renders (docs/report-2026/CONTEXT.md C7
 * and C8). What the page offers for download is written by `writeNeutralisedDownloads()`
 * below: the same measurements, filtered to the page's county and keyed by site code.
 *
 * Generated output, never committed.
 */
const DEQ_FILES = [
  "deq_data_center_air_monitoring_hourly.csv",
  "deq_regulatory_monitor_hourly.csv",
  "deq_pm25_daily.csv",
  "deq_sensor_site_history.csv",
  "manifest.json",
];

/** The code lookup is shared with pipeline.report (DECISIONS.md D7) and is equally unserved. */
const LOOKUP_FILES = ["site_codes.json"];

const deqSrc = path.resolve(__dirname, "..", "..", "pipeline", "sources");
const lookupSrc = path.resolve(__dirname, "..", "..", "pipeline", "lookups");
const deqStage = path.join(dest, "deq");
const lookupStage = path.join(dest, "lookups");
const deqDest = path.resolve(__dirname, "..", "public", "data", "deq");

function stage(fromDir, names, toDir, what) {
  fs.mkdirSync(toDir, { recursive: true });
  for (const name of names) {
    const from = path.join(fromDir, name);
    if (!fs.existsSync(from)) {
      console.error(`[copy-data] Required ${what} missing: ${from}`);
      process.exit(1);
    }
    fs.copyFileSync(from, path.join(toDir, name));
  }
  console.log(`[copy-data] Staged ${names.length} ${what} file(s) -> ${toDir}`);
}

/* ------------------------------------------------- neutralised download tables */

/** RFC 4180 field splitting, matching `splitCsvLine()` in lib/deq-data.ts. */
function splitCsvLine(line) {
  const out = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
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

function readCsvRows(file) {
  const text = fs.readFileSync(file, "utf-8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((l) => l !== "");
  return { header: splitCsvLine(lines[0]), rows: lines.slice(1).map(splitCsvLine) };
}

function csvField(v) {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function writeCsv(file, header, rows) {
  const body = [header, ...rows].map((r) => r.map(csvField).join(",")).join("\n");
  fs.writeFileSync(file, body + "\n", "utf-8");
}

/**
 * The county this page is scoped to, and the key the regulatory monitor is published under.
 * Both mirror `PAGE_COUNTY` and `REGULATORY_KEY` in lib/deq-data.ts. The regulatory monitor's
 * own site_id is a locality slug, so it is replaced here as well.
 */
const PAGE_COUNTY = "Loudoun";
const REGULATORY_KEY = "REG";
const REGULATORY_SITE = "ashburn";

/**
 * Rewrites the measurement tables the page offers for download so that no internal identifier
 * reaches a reader: `site_id` becomes `site_code`, every value row is filtered to the page's
 * county, and the site history is replaced by the values-free site key.
 *
 * The county filter here is the same one the page applies to every figure and statistic
 * (DECISIONS.md D5), so the download and the page describe the same network.
 */
function writeNeutralisedDownloads() {
  const codes = JSON.parse(fs.readFileSync(path.join(lookupStage, "site_codes.json"), "utf-8"));
  const codeOf = new Map(codes.sites.map((s) => [s.site_id, s.code]));
  const history = readCsvRows(path.join(deqStage, "deq_sensor_site_history.csv"));
  const col = (name) => history.header.indexOf(name);
  const inCounty = new Set(
    history.rows.filter((r) => r[col("county")] === PAGE_COUNTY).map((r) => r[col("site_id")])
  );
  if (inCounty.size === 0) {
    console.error(`[copy-data] No site in the history carries county '${PAGE_COUNTY}'.`);
    process.exit(1);
  }

  const relabel = (siteId) => {
    if (siteId === REGULATORY_SITE) return REGULATORY_KEY;
    const code = codeOf.get(siteId);
    if (!code) {
      console.error(
        "[copy-data] A DEQ table carries a site identifier with no code in " +
          "pipeline/lookups/site_codes.json. Append the next unused code without renumbering " +
          "any existing one; the download is not written with a slug in it."
      );
      process.exit(1);
    }
    return code;
  };

  // Value tables. Every row is kept or dropped on the county filter, and the identifier column
  // is rewritten in place so column order and every other field stay as DEQ shipped them.
  const VALUE_TABLES = [
    ["deq_data_center_air_monitoring_hourly.csv", "deq_sensor_hourly_loudoun.csv", false],
    ["deq_regulatory_monitor_hourly.csv", "deq_regulatory_monitor_hourly_loudoun.csv", true],
    ["deq_pm25_daily.csv", "deq_pm25_daily_loudoun.csv", true],
  ];
  for (const [from, to, allowRegulatory] of VALUE_TABLES) {
    const { header, rows } = readCsvRows(path.join(deqStage, from));
    const idx = header.indexOf("site_id");
    if (idx === -1) {
      console.error(`[copy-data] ${from} carries no site_id column.`);
      process.exit(1);
    }
    const out = [];
    for (const r of rows) {
      const siteId = r[idx];
      const keep = siteId === REGULATORY_SITE ? allowRegulatory : inCounty.has(siteId);
      if (!keep) continue;
      const copy = r.slice();
      copy[idx] = relabel(siteId);
      out.push(copy);
    }
    const renamed = header.slice();
    renamed[idx] = "site_code";
    writeCsv(path.join(deqDest, to), renamed, out);
    console.log(`[copy-data] Wrote ${to} (${out.length} rows, county '${PAGE_COUNTY}')`);
  }

  // The site key: identifiers and occupancy only, no measurement of any kind, all sites. This
  // replaces the site history as the downloadable roster, and it carries the same columns the
  // page renders in its own section away from every value display.
  const keyHeader = [
    "site_code",
    "deq_published_name",
    "county",
    "apex_unit",
    "active_start",
    "active_end",
    "v1_scope",
  ];
  const keyRows = [];
  for (const s of codes.sites) {
    for (const u of s.units) {
      keyRows.push([
        s.code,
        s.deq_published_name,
        s.county,
        u.unit_label,
        u.start_date,
        u.end_date === null ? "" : u.end_date,
        s.in_v1_scope ? "in scope" : "outside current scope",
      ]);
    }
  }
  writeCsv(path.join(deqDest, "deq_site_key.csv"), keyHeader, keyRows);
  console.log(`[copy-data] Wrote deq_site_key.csv (${keyRows.length} rows, all sites)`);
}

if (!fs.existsSync(deqSrc)) {
  console.log(`[copy-data] ${deqSrc} not found, skipping DEQ tables.`);
} else {
  // Rebuilt from scratch, so a file an earlier build served cannot survive into this one.
  if (fs.existsSync(deqDest)) fs.rmSync(deqDest, { recursive: true, force: true });
  fs.mkdirSync(deqDest, { recursive: true });
  stage(deqSrc, DEQ_FILES, deqStage, "DEQ source");
  stage(lookupSrc, LOOKUP_FILES, lookupStage, "lookup");
  writeNeutralisedDownloads();
}

/**
 * The cross-ancestry layer reads two source records at build time: the GWAS ancestry
 * snapshot table and the ACS Loudoun population counts. Same reason as the DEQ tables
 * above — they are source records rather than atlas entities, so they live under
 * pipeline/sources/ and are staged into public/ where the build can reach them
 * regardless of working directory. Generated output, never committed.
 */
const CROSS_ANCESTRY_FILES = [
  ["gwas_ancestry_breakdown.csv", "gwas_ancestry_breakdown.csv"],
  ["cross_ancestry/acs_loudoun_2023.json", "acs_loudoun_2023.json"],
  ["cross_ancestry/literature.json", "literature.json"],
];

const caDest = path.resolve(__dirname, "..", "public", "data", "cross-ancestry");

if (!fs.existsSync(deqSrc)) {
  console.log(`[copy-data] ${deqSrc} not found — skipping cross-ancestry sources.`);
} else {
  fs.mkdirSync(caDest, { recursive: true });
  let copied = 0;
  for (const [rel, name] of CROSS_ANCESTRY_FILES) {
    const from = path.join(deqSrc, rel);
    if (!fs.existsSync(from)) {
      console.error(`[copy-data] Required cross-ancestry source missing: ${from}`);
      process.exit(1);
    }
    fs.copyFileSync(from, path.join(caDest, name));
    copied++;
  }
  console.log(`[copy-data] Copied ${copied} cross-ancestry source file(s) → ${caDest}`);
}
