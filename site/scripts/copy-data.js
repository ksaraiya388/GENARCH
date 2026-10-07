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
 * time and offers them for download, so they are staged into public/ where both uses can reach
 * them regardless of how the working directory is configured. Generated output, never committed.
 */
const DEQ_FILES = [
  "deq_data_center_air_monitoring_hourly.csv",
  "deq_regulatory_monitor_hourly.csv",
  "deq_pm25_daily.csv",
  "deq_sensor_site_history.csv",
  "manifest.json",
];

const deqSrc = path.resolve(__dirname, "..", "..", "pipeline", "sources");
const deqDest = path.resolve(__dirname, "..", "public", "data", "deq");

if (!fs.existsSync(deqSrc)) {
  console.log(`[copy-data] ${deqSrc} not found — skipping DEQ tables.`);
} else {
  fs.mkdirSync(deqDest, { recursive: true });
  let copied = 0;
  for (const name of DEQ_FILES) {
    const from = path.join(deqSrc, name);
    if (!fs.existsSync(from)) {
      console.error(`[copy-data] Required DEQ source missing: ${from}`);
      process.exit(1);
    }
    fs.copyFileSync(from, path.join(deqDest, name));
    copied++;
  }
  console.log(`[copy-data] Copied ${copied} DEQ source file(s) → ${deqDest}`);
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
