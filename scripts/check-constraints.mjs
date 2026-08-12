#!/usr/bin/env node
/**
 * GENARCH content-constraint lint.
 *
 * Scans DOM-reaching strings for banned causal / policy / second-person / unsupported-
 * capability language, plus structural completeness rules.
 *
 * ---------------------------------------------------------------------------
 * CITATION METADATA IS NEVER LINTED  (ruling R7)
 * ---------------------------------------------------------------------------
 * Nothing inside a `references[]` array is scanned, and the keys `title`, `authors`,
 * `journal`, `source`, and `doi` are excluded wherever they appear. A published paper's
 * title is quoted material. Enforcing the lexicon on it would pressure an author to
 * FALSIFY A CITATION in order to pass the lint -- which inverts the entire purpose of the
 * constraint system. `HHIP haploinsufficiency causes emphysema` is a real paper title and
 * must stay exactly as published.
 * ---------------------------------------------------------------------------
 *
 * Design notes:
 *  - No dependencies. Extractors are conservative: only strings that can reach the DOM.
 *    Code comments and identifiers are excluded -- a flat text search over source files
 *    produces false positives (REPORT.md section H2).
 *  - The lexicon is TIERED. Tier A is banned everywhere. Tier B is banned in headings and
 *    labels but is legitimate scientific prose in body copy.
 *  - Rule 1 governs causal claims linking ENVIRONMENTAL EXPOSURE to POPULATION HEALTH
 *    OUTCOME. It does not govern established intra-organism pathophysiology, which is
 *    carved out per-line via `// constraint-ok: intra-organism mechanism` (ruling R2).
 *  - Automated negation detection was attempted and REMOVED (ruling R1): it scored 4/6,
 *    and both failures were false negatives on real violations. Genuine disclaimers now
 *    carry an explicit, auditable suppression comment instead.
 *  - Context rules only ever ESCALATE severity (Tier B -> Tier A), never relax it, so a
 *    heuristic miss leaves a hit visible rather than silently exempting it.
 *  - Baseline ratchet: pre-existing hits in read-only territory live in
 *    docs/lint-baseline.json and report as ACCEPTED. In-scope violations are never
 *    baselined -- they are fixed (ruling R8).
 *
 * Usage:
 *   node scripts/check-constraints.mjs
 *   node scripts/check-constraints.mjs --update-baseline "<reason>"
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE_PATH = path.join(ROOT, "docs", "lint-baseline.json");

/* ------------------------------------------------------------------ lexicon */

// Banned everywhere a string reaches the DOM. No suppression in a heading position.
const TIER_A = [
  "drives", "driver", "drivers", "driving",
  // causal verbs (R2) -- carve-out for intra-organism mechanism, per line, with a reason
  "causes", "caused", "causing", "causal",
  "leads to", "led to", "results in", "resulting in",
  "harms", "poisons", "contaminates", "exceedance",
  // person/group as subject
  "high risk", "predisposed", "at risk",
  // policy position
  "alarming", "sprawl", "sacrificed", "deserve",
  "must act", "should be required", "at what cost", "Big Tech", "crisis",
  // second-person biology
  "your genes", "your genetic", "your genetics", "your risk", "your environment",
  "your exposure", "your DNA", "your local environment", "something in your environment",
  // unsupported capability claims
  "all data points are cited", "every claim is cited", "cites its sources", "fully cited",
  // published-copy phrases that must never reach the site
  "makes the other worse", "makes it worse",
];

// Banned in headings / chart titles / axis labels / table headers / alt / aria-label.
// Warning-only in body prose and MDX: "the effect of PM2.5 on epithelial barrier
// integrity", cited, is legitimate scientific writing.
const TIER_B = [
  "due to", "because of", "impacts", "impact of",
  "effect of", "effects of", "responsible for",
  "triggers",   // R3 -- escalates to Tier A on a population/person object
  "linked to",  // R4
  "unchecked",  // R6 -- escalates to Tier A when modifying growth/development/policy
];

// Exact phrases that must never trip the lint.
const WHITELIST_PHRASES = [
  // The project's own name. Both spellings: rendered strings are unhyphenated.
  "Genetic Epidemiology Network for At Risk Community Health",
  "Genetic Epidemiology Network for At-Risk Community Health",
  // R3 -- `environmental_triggers` is a field in the pathway schema. A lint that fails
  // its own data model is broken.
  "environmental triggers",
  // R5 / R11 -- standard genetics terminology; the subject is genetic, not human.
  "high-risk allele", "high-risk variant", "high-risk genotype", "high-risk haplotype",
  "confer high risk of", "confers high risk of",
];

// R3: `triggers` becomes Tier A when a population or person is subject or object.
const POPULATION_NOUNS = [
  "people", "person", "persons", "population", "populations", "community", "communities",
  "resident", "residents", "child", "children", "kid", "kids", "student", "students",
  "adolescent", "adolescents", "patient", "patients", "individual", "individuals",
  "family", "families", "neighborhood", "neighborhoods", "household", "households",
];

// R6: `unchecked` becomes Tier A when it modifies these.
const UNCHECKED_ESCALATORS = [
  "growth", "development", "expansion", "sprawl", "construction", "building",
  "buildout", "build-out", "proliferation",
];

/* -------------------------------------------------------------- file walking */

const SCAN = [
  { dir: path.join(ROOT, "site", "src"), exts: [".tsx", ".ts", ".mdx"] },
  { dir: path.join(ROOT, "data"), exts: [".json"] },
  { dir: path.join(ROOT, "content"), exts: [".mdx", ".md"] },
];
const SKIP_DIRS = new Set(["node_modules", ".next", "out", "_data", ".git"]);

// R8: only these may be baselined. Everything else must be fixed, not ratcheted.
const READ_ONLY_PREFIXES = [
  "data/diseases/", "data/genes/", "data/pathways/", "data/exposures/", "content/briefs/",
];
// R10: generated artifacts that mirror read-only content. They cannot be fixed
// independently -- graph.json changes only by pipeline regeneration, and search-index.json
// has no generator stage. Every flagged string in them was verified to be a verbatim copy
// of a read-only source string (11/11 and 3/3). Classified separately so the audit trail
// distinguishes "mirrors legacy debt" from "is legacy debt".
const DERIVED_PATHS = ["data/graph/graph.json", "data/search-index.json"];

const zoneOf = (f) =>
  READ_ONLY_PREFIXES.some((p) => f.startsWith(p)) ? "READ_ONLY"
  : DERIVED_PATHS.includes(f) ? "DERIVED_FROM_READ_ONLY"
  : "IN_SCOPE";

function walk(dir, exts, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), exts, acc);
    } else if (exts.includes(path.extname(entry.name))) {
      acc.push(path.join(dir, entry.name));
    }
  }
  return acc;
}

const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");
const isBaselineable = (f) => zoneOf(f) !== "IN_SCOPE";

/* ---------------------------------------------------------------- extraction */

/** Blank out comments so they never enter the hit set, preserving line numbers. */
function stripComments(src) {
  let out = src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, (m) => m.replace(/[^\n]/g, " "));
  out = out
    .split("\n")
    .map((line) => {
      const idx = line.search(/(^|[^:"'`\w])\/\//);
      if (idx === -1) return line;
      const before = line.slice(0, idx);
      if ((before.match(/["'`]/g) || []).length % 2 === 1) return line; // inside a string
      return before + " ".repeat(line.length - before.length);
    })
    .join("\n");
  return out;
}

const lineOf = (src, index) => src.slice(0, index).split("\n").length;

const DOM_ATTRS = [
  "title", "label", "alt", "aria-label", "ariaLabel", "caption",
  "description", "desc", "summary", "notes", "limitations", "placeholder",
];
const HEADING_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6", "th", "caption", "legend"];

function extractTsx(src, file) {
  const clean = stripComments(src);
  const out = [];
  const push = (index, text, context) => {
    const t = text.trim();
    if (!t || !/[a-z]{3}/i.test(t)) return;
    out.push({
      line: lineOf(clean, index),
      endLine: lineOf(clean, index + text.length),
      text: t, context, file,
    });
  };

  const headRe = new RegExp(`<(${HEADING_TAGS.join("|")})\\b[^>]*>([^<>{}]+)<`, "gi");
  for (const m of clean.matchAll(headRe)) push(m.index, m[2], "heading");
  for (const m of clean.matchAll(/>([^<>{}]{3,})</g)) push(m.index, m[1], "jsx-text");

  const attrRe = new RegExp(
    `\\b(${DOM_ATTRS.join("|")})\\s*[=:]\\s*(?:\\{\\s*)?["'\`]([^"'\`]+)["'\`]`, "g"
  );
  for (const m of clean.matchAll(attrRe)) {
    const key = m[1].toLowerCase();
    const labelish = ["alt", "aria-label", "arialabel", "title", "label", "caption"];
    push(m.index, m[2], labelish.includes(key) ? "label" : `attr:${key}`);
  }
  for (const m of clean.matchAll(/\b(?:id|aria-labelledby|htmlFor)\s*=\s*["'`]([^"'`]+)["'`]/g)) {
    if (/driv(?:e|er|ers|ing)/i.test(m[1])) push(m.index, m[1], "identifier");
  }
  return out;
}

const JSON_DISPLAY_KEYS = [
  "summary", "description", "notes", "limitations", "title", "label",
  "caption", "definition", "statement", "name", "mechanism_summary",
  "mechanism_hypothesis", "prs_notes", "adolescent_relevance",
  "transferability_notes", "data_gaps", "gwas_ancestry_breakdown",
  "hypothesis", "supporting_evidence", "role_in_pathway", "pathway_role",
  "pathway_effect", "mechanism_rationale", "local_relevance",
];

// R7: citation metadata, wherever it appears. Never linted.
const CITATION_KEYS = new Set(["title", "authors", "journal", "source", "doi", "url"]);

function extractJson(src, file) {
  const out = [];
  let data;
  try { data = JSON.parse(src); } catch { return out; }
  const lines = src.split("\n");
  const findLine = (key, value) => {
    const needle = JSON.stringify(value).slice(1, -1).slice(0, 60);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(`"${key}"`) && lines[i].includes(needle)) return i + 1;
    }
    return 1;
  };
  const walkValue = (node, jsonPath) => {
    if (Array.isArray(node)) {
      node.forEach((v, i) => walkValue(v, `${jsonPath}[${i}]`));
      return;
    }
    if (!node || typeof node !== "object") return;
    // R7: a reference record is citation metadata in its entirety.
    const isRefRecord = jsonPath.includes("references") ||
      (typeof node.id === "string" && ("doi" in node || "journal" in node) && "year" in node);
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === "string") {
        if (!JSON_DISPLAY_KEYS.includes(k)) continue;
        if (isRefRecord || (CITATION_KEYS.has(k) && jsonPath.includes("references"))) continue;
        const ln = findLine(k, v);
        out.push({ line: ln, endLine: ln, text: v, context: `json:${k}`, file, jsonPath: `${jsonPath}.${k}` });
      } else {
        walkValue(v, `${jsonPath}.${k}`);
      }
    }
  };
  walkValue(data, "$");
  return out;
}

function extractMdx(src, file) {
  const out = [];
  const lines = src.replace(/```[\s\S]*?```/g, (m) => m.replace(/[^\n]/g, "")).split("\n");
  let inFm = false;
  lines.forEach((line, i) => {
    if (i === 0 && line.trim() === "---") { inFm = true; return; }
    if (inFm) {
      if (line.trim() === "---") inFm = false;
      else if (/^(title|description|summary)\s*:/.test(line))
        out.push({ line: i + 1, endLine: i + 1, text: line.replace(/^\w+\s*:\s*/, ""), context: "heading", file });
      return;
    }
    const t = line.trim();
    if (!t) return;
    out.push({ line: i + 1, endLine: i + 1, text: t, context: /^#{1,6}\s/.test(t) ? "heading" : "mdx-prose", file });
  });
  return out;
}

/* ------------------------------------------------------------------ matching */

const wordRe = (term) =>
  new RegExp(`(?<![A-Za-z])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z])`, "i");

const isWhitelisted = (text, idx, term) => {
  const lower = text.toLowerCase();
  return WHITELIST_PHRASES.some((p) => {
    const pl = p.toLowerCase();
    let at = lower.indexOf(pl);
    while (at !== -1) {
      if (idx >= at && idx < at + pl.length) return true;
      at = lower.indexOf(pl, at + 1);
    }
    return false;
  });
};

/** Context rules only ever ESCALATE. A miss leaves the hit visible. */
function escalates(term, text, idx) {
  const sentence = (text.slice(0, idx).split(/[.;!?]\s/).pop() || "") +
    text.slice(idx, idx + 140);
  const low = sentence.toLowerCase();
  if (term === "triggers") return POPULATION_NOUNS.some((n) => wordRe(n).test(low));
  if (term === "unchecked") return UNCHECKED_ESCALATORS.some((n) => wordRe(n).test(low));
  return false;
}

const HARD_CONTEXTS = new Set(["heading", "label"]);

function classify(term, tier, context, text, idx) {
  if (tier === "B" && escalates(term, text, idx)) {
    return { severity: "error", tier: "A", reason: `Tier B escalated to A: population/policy object` };
  }
  if (tier === "A") return { severity: "error", tier: "A", reason: "Tier A: banned in all DOM strings" };
  if (HARD_CONTEXTS.has(context))
    return { severity: "error", tier: "B", reason: "Tier B in a heading/label position" };
  return { severity: "warning", tier: "B", reason: "Tier B in body prose" };
}

/* ------------------------------------------------------ suppressions + main */

function suppressionLines(src) {
  const map = new Map();
  src.split("\n").forEach((line, i) => {
    const m = line.match(/constraint-ok:\s*(.+?)\s*(?:\*\/|\}|$)/);
    if (m) map.set(i + 1, m[1].trim());
  });
  return map;
}

const files = SCAN.flatMap(({ dir, exts }) => walk(dir, exts));
const hits = [];
const suppressionsUsed = [];

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const ext = path.extname(file);
  const strings =
    ext === ".json" ? extractJson(src, file)
    : ext === ".mdx" || ext === ".md" ? extractMdx(src, file)
    : extractTsx(src, file);
  const supp = suppressionLines(src);

  for (const s of strings) {
    for (const [tier, terms] of [["A", TIER_A], ["B", TIER_B]]) {
      for (const term of terms) {
        const m = s.text.match(wordRe(term));
        if (!m) continue;
        if (isWhitelisted(s.text, m.index, term)) continue;
        const c = classify(term, tier, s.context, s.text, m.index);
        // A suppression comment may sit on the line above, or anywhere the string spans.
        let suppressedWith = null;
        for (let ln = s.line - 1; ln <= (s.endLine ?? s.line); ln++) {
          if (supp.has(ln)) { suppressedWith = supp.get(ln); break; }
        }
        const suppressible = !(c.tier === "A" && s.context === "heading");
        if (suppressedWith && suppressible) {
          suppressionsUsed.push({ file: rel(file), line: s.line, term, reason: suppressedWith });
          continue;
        }
        hits.push({
          file: rel(file), line: s.line, term, tier: c.tier, context: s.context,
          severity: c.severity, reason: c.reason, matched_string: s.text.slice(0, 160),
          jsonPath: s.jsonPath ?? null,
        });
      }
    }
  }
}

/* --------------------------------------------------------------- deduplicate */

const SEVERITY_RANK = { error: 0, warning: 1 };
const CONTEXT_RANK = { heading: 0, label: 1, "jsx-text": 2, "mdx-prose": 3, identifier: 9 };
{
  const best = new Map();
  for (const h of hits) {
    const k = `${h.file}|${h.line}|${h.term}`;
    const prev = best.get(k);
    if (!prev ||
        SEVERITY_RANK[h.severity] < SEVERITY_RANK[prev.severity] ||
        (h.severity === prev.severity &&
         (CONTEXT_RANK[h.context] ?? 5) < (CONTEXT_RANK[prev.context] ?? 5))) {
      best.set(k, h);
    }
  }
  hits.length = 0;
  hits.push(...best.values());
}

/* ------------------------------------------------------------ structural rules */

const structural = [];
const componentSrc = (() => {
  const p = path.join(ROOT, "site/src/components/CommunityRegionDetail.tsx");
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
})();
for (const f of walk(path.join(ROOT, "data", "community"), [".json"])) {
  const region = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const st of region.health_stats || []) {
    if (st.comparison_national != null && !/comparison_national/.test(componentSrc))
      structural.push(`${rel(f)}: '${st.disease_slug}/${st.metric_type}' has comparison_national but the component never renders it`);
    if (st.ci_lower != null && !/ci_lower/.test(componentSrc))
      structural.push(`${rel(f)}: '${st.disease_slug}/${st.metric_type}' has a confidence interval but the component never renders it`);
  }
}
for (const f of [...walk(path.join(ROOT, "data", "sensors"), [".json"]),
                 ...walk(path.join(ROOT, "site/src/app/community/data-center-alley"), [".tsx"])]) {
  if (/exceedance/i.test(fs.readFileSync(f, "utf8")))
    structural.push(`${rel(f)}: 'exceedance' is banned on the data-center-alley surfaces`);
}
// School name near a health/reading term. Abbreviations added per PROMPT_AMENDMENTS A2
// ("Broad Run HS" evades the specified pattern). A capitalized preceding token is required
// so "Multiple sclerosis (MS)" and the confidence tier "High" do not match.
const SCHOOL_RE =
  /\b[A-Z][a-zA-Z]*\s+(High School|Middle School|Elementary School|Elementary|School|HS|MS|ES)\b/;
const HEALTH_RE = /(asthma|PM2\.5|µg\/m3|ugm3|inflammation|prevalence|reading)/i;
for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  for (const m of src.matchAll(new RegExp(SCHOOL_RE, "g"))) {
    const win = src.slice(Math.max(0, m.index - 200), m.index + 200);
    if (HEALTH_RE.test(win))
      structural.push(`${rel(file)}:${src.slice(0, m.index).split("\n").length}: '${m[1]}' within 200 chars of a health/reading term`);
  }
}

/* ---------------------------------------------------------------- baseline */

const args = process.argv.slice(2);
const updateIdx = args.indexOf("--update-baseline");
const key = (h) => `${h.file}|${h.line}|${h.term}|${h.matched_string}`;

/* R12: reviewed exemptions. A baseline entry is unreviewed legacy debt; an exemption is a
   recorded decision. Keeping them apart is the whole point of the R2 audit trail. Matched
   on file + json_path + constraint, which is stable across reformatting (line numbers are
   not). Exemptions are checked BEFORE the baseline. */
const EXEMPTIONS_PATH = path.join(ROOT, "docs", "constraint-exemptions.json");
const exemptions = fs.existsSync(EXEMPTIONS_PATH)
  ? JSON.parse(fs.readFileSync(EXEMPTIONS_PATH, "utf8")).exemptions
  : [];
const exemptionKey = (f, jsonPath, term) => `${f}|${jsonPath}|${term}`;
const exemptionSet = new Map(
  exemptions.map((e) => [exemptionKey(e.file, e.json_path, e.constraint), e])
);
const matchExemption = (h) =>
  h.jsonPath ? exemptionSet.get(exemptionKey(h.file, h.jsonPath, h.term)) : undefined;

const allErrors = hits.filter((h) => h.severity === "error");
const exempted = allErrors.filter((h) => matchExemption(h));
const failing = allErrors.filter((h) => !matchExemption(h));
const fixable = failing.filter((h) => !isBaselineable(h.file));   // R8: must be fixed
const ratchetable = failing.filter((h) => isBaselineable(h.file)); // R8: may be baselined

if (updateIdx !== -1) {
  const reason = args[updateIdx + 1];
  if (!reason || reason.startsWith("--")) {
    console.error("ERROR: --update-baseline requires an explicit reason string.");
    process.exit(2);
  }
  const prev = fs.existsSync(BASELINE_PATH)
    ? JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")) : { entries: [] };
  if (prev.entries.length > 0 && ratchetable.length > prev.entries.length) {
    console.error(`ERROR: baseline may only shrink (${prev.entries.length} -> ${ratchetable.length}).`);
    process.exit(2);
  }
  fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
  fs.writeFileSync(BASELINE_PATH, JSON.stringify({
    reason,
    scope: "Read-only territory and derived-from-read-only artifacts only (rulings R8, R10). In-scope violations are fixed, never ratcheted. Reviewed carve-outs live in docs/constraint-exemptions.json, not here.",
    read_only_prefixes: READ_ONLY_PREFIXES,
    derived_from_read_only: DERIVED_PATHS,
    generated_by: "scripts/check-constraints.mjs --update-baseline",
    entries: ratchetable.map((h) => ({
      file: h.file, line: h.line, matched_string: h.matched_string, constraint: h.term,
      class: zoneOf(h.file),
    })).sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.constraint.localeCompare(b.constraint)),
  }, null, 2) + "\n");
  console.log(`Baseline written: ${ratchetable.length} entries (read-only territory only).`);
  console.log(`Reason: ${reason}`);
  console.log(`NOT baselined (must be fixed): ${fixable.length}`);
  process.exit(0);
}

const baseline = fs.existsSync(BASELINE_PATH)
  ? new Set(JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")).entries
      .map((e) => `${e.file}|${e.line}|${e.constraint}|${e.matched_string}`))
  : null;
const isBaselined = (h) => baseline !== null && baseline.has(key(h));
const newHits = failing.filter((h) => !isBaselined(h));

/* R10: a DERIVED_FROM_READ_ONLY baseline entry is only legitimate while it mirrors a string
   that genuinely exists in read-only territory. If a generated artifact ever carries a
   flagged string with no source counterpart, something authored a NEW violation into
   generated output, and the derived classification is being used to hide it. Hard fail. */
const derivedDrift = [];
if (baseline !== null) {
  const raw = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
  const sourceStrings = [];
  for (const { dir, exts } of SCAN) {
    for (const f of walk(dir, exts)) {
      if (zoneOf(rel(f)) !== "READ_ONLY") continue;
      const src = fs.readFileSync(f, "utf8");
      const ext = path.extname(f);
      const strings = ext === ".json" ? extractJson(src, f)
        : ext === ".mdx" || ext === ".md" ? extractMdx(src, f) : extractTsx(src, f);
      for (const s of strings) sourceStrings.push(s.text);
    }
  }
  for (const e of raw.entries.filter((x) => x.class === "DERIVED_FROM_READ_ONLY")) {
    const needle = e.matched_string.slice(0, 120);
    if (!sourceStrings.some((s) => s.includes(needle))) {
      derivedDrift.push(
        `${e.file}:${e.line} [${e.constraint}] has no verbatim counterpart in read-only source: "${needle.slice(0, 70)}..."`
      );
    }
  }
}

/* ------------------------------------------------------------------- output */

const group = (arr, f) => arr.reduce((a, x) => ((a[f(x)] ||= []).push(x), a), {});
const byTerm = (arr) => Object.entries(group(arr, (h) => h.term))
  .sort((a, b) => b[1].length - a[1].length).map(([t, v]) => `${t} ${v.length}`).join(", ");

console.log("GENARCH constraint lint");
console.log("=".repeat(72));
console.log(`scanned ${files.length} files`);
console.log();

for (const [heading, arr] of [
  ["TIER A -- errors (banned in every DOM string)", hits.filter((h) => h.tier === "A" && h.severity === "error")],
  ["TIER B -- errors (heading/label position)", hits.filter((h) => h.tier === "B" && h.severity === "error")],
  ["TIER B -- warnings (body prose, non-blocking)", hits.filter((h) => h.severity === "warning")],
]) {
  console.log(`${heading}: ${arr.length}`);
  if (arr.length) console.log(`  by term: ${byTerm(arr)}`);
  for (const [file, g] of Object.entries(group(arr, (h) => h.file)).sort()) {
    const zone = isBaselineable(file) ? "read-only" : "IN SCOPE";
    console.log(`  ${file}  [${zone}]`);
    for (const h of g.sort((a, b) => a.line - b.line)) {
      const flag = matchExemption(h) ? "EXEMPT  "
        : isBaselined(h) ? "ACCEPTED"
        : h.severity === "error" ? "NEW     " : "        ";
      console.log(`    ${flag} :${h.line} [${h.term}] (${h.context}) ${h.matched_string.slice(0, 92)}`);
    }
  }
  console.log();
}

console.log(`STRUCTURAL RULES: ${structural.length} finding(s)`);
for (const s of structural) console.log(`  ${s}`);
console.log();
console.log(`SUPPRESSIONS USED (inline, .tsx/.mdx): ${suppressionsUsed.length}`);
for (const s of suppressionsUsed) console.log(`  ${s.file}:${s.line} [${s.term}] -- ${s.reason}`);
console.log();

console.log(`EXEMPTED (docs/constraint-exemptions.json, reviewed): ${exempted.length}`);
for (const h of exempted) {
  const e = matchExemption(h);
  console.log(`  ${h.file}:${h.line} [${h.term}] ${h.jsonPath}`);
  console.log(`      ${e.reason}  (${e.date}, ${e.approver})`);
}
console.log();

if (derivedDrift.length) {
  console.log(`DERIVED-ARTIFACT DRIFT: ${derivedDrift.length} -- BLOCKING`);
  for (const d of derivedDrift) console.log(`  ${d}`);
  console.log();
}

console.log("=".repeat(72));
console.log(
  `${failing.length} violations, ${failing.length - newHits.length} baselined, ` +
  `${exempted.length} exempted, ${newHits.length} new`
);
console.log(`  in-scope, must be fixed (never baselined): ${fixable.length}`);
console.log(`  baselineable (read-only + derived):        ${ratchetable.length}`);
if (baseline === null) console.log("NOTE: docs/lint-baseline.json does not exist yet.");

process.exit(newHits.length > 0 || structural.length > 0 || derivedDrift.length > 0 ? 1 : 0);
