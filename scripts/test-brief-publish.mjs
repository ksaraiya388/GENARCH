// Test for the brief publication gate.
//
// Confirms that an unpublished brief (published:false, published_at:null):
//   - passes pipeline validate,
//   - is absent from the search index,
//   - is NOT emitted as a route in the static build (404),
// and that flipping published:true while leaving published_at:null makes
// pipeline validate exit 1.
//
// Run: npm run test:brief-publish  (rebuilds the site; ~1 min)

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SITE = path.join(ROOT, "site");
const SLUG = "asthma-air-pollution-17q21";
const BRIEF = path.join(ROOT, "data", "briefs", `${SLUG}.json`);
const SEARCH = path.join(ROOT, "data", "search-index.json");
const OUT_ROUTE = path.join(SITE, "out", "mechanism-briefs", SLUG, "index.html");
const PUBLISHED_ROUTE = path.join(
  SITE,
  "out",
  "mechanism-briefs",
  "pm25-il33-nfkb-asthma",
  "index.html"
);

const failures = [];
const ok = (m) => console.log(`  ok   ${m}`);
const bad = (m) => {
  failures.push(m);
  console.error(`  FAIL ${m}`);
};

function validateExit() {
  try {
    execSync("python -m pipeline validate", {
      cwd: ROOT,
      stdio: "pipe",
      env: { ...process.env, PYTHONUTF8: "1" },
    });
    return 0;
  } catch (e) {
    return typeof e.status === "number" ? e.status : 1;
  }
}

const orig = readFileSync(BRIEF, "utf8");
const brief = JSON.parse(orig);

if (brief.published === false && brief.published_at === null && brief.date) {
  ok("fixture is unpublished (published:false, published_at:null, date kept)");
} else {
  bad("brief fixture is not in the expected unpublished state");
}

if (validateExit() === 0) ok("validate passes in the unpublished state");
else bad("validate should pass with published:false / published_at:null");

try {
  writeFileSync(
    BRIEF,
    JSON.stringify({ ...brief, published: true, published_at: null }, null, 2) + "\n"
  );
  if (validateExit() === 1) {
    ok("validate exits 1 for published:true with null published_at");
  } else {
    bad("validate should exit 1 for published:true with null published_at");
  }
} finally {
  writeFileSync(BRIEF, orig);
}
if (validateExit() === 0) ok("fixture restored; validate passes again");
else bad("failed to restore the brief fixture");

if (!readFileSync(SEARCH, "utf8").includes(SLUG)) {
  ok("slug absent from data/search-index.json");
} else {
  bad("unpublished slug present in the search index");
}

console.log("  building site (reflects published:false)...");
execSync("npm run build", {
  cwd: SITE,
  stdio: "inherit",
  env: { ...process.env, PYTHONUTF8: "1" },
});

if (!existsSync(OUT_ROUTE)) ok("unpublished brief route is absent from the build (404)");
else bad("unpublished brief route was generated in the static export");

if (existsSync(PUBLISHED_ROUTE)) ok("a published brief route still builds (sanity)");
else bad("published brief route missing (sanity check failed)");

if (failures.length) {
  console.error(`\nBrief-publish test FAILED:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("\nBrief-publish test PASSED");
