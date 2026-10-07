# Phase 0 preflight — cross-ancestry work package

Run 2026-10-05 from `C:\Users\sarai\genarch` on `main` at `efc4d97`, working tree clean
(`## main...origin/main`, no modified or untracked files). `git pull --ff-only` was a no-op:
the branch already matched `origin/main`.

## Gate results

| Command | Exit | Notes |
|---|---|---|
| `git status -sb` | 0 | `## main...origin/main`, clean |
| `git pull --ff-only` | 0 | already up to date |
| `python -m pipeline validate` | 0 | passed, with 4 pre-existing warnings (below) |
| `python -m ruff check pipeline/` | 0 | `All checks passed!` |
| `npm run check:constraints` | 0 | **52 violations, 52 baselined, 3 exempted, 0 new** |
| `cd site && npx tsc --noEmit` | 0 | clean |
| `npm run site:build` | 0 | static export completed |

`pipeline validate` is run with `PYTHONUTF8=1` on Windows; without it the µ in the DEQ unit
strings raises a `cp1252` encode error in the warning output.

### Constraint-lint baseline, to be matched exactly at Phase 9

```
52 violations, 52 baselined, 3 exempted, 0 new
  in-scope, must be fixed (never baselined): 0
  baselineable (read-only + derived):        52
```

Tier A errors 55 (across 52 baselined findings), Tier B heading errors 0, Tier B body-prose
warnings 30, structural findings 0, inline suppressions 5. **Any new violation introduced by
this work package is fixed in the text, never baselined and never exempted.**

### Pre-existing validate warnings (not introduced here, not fixed here)

1. `data/pathways/il33-st2-axis.json` references gene slug `il1rl1`, which has no data file.
2. `graph.json`: 160 edges assert high/medium confidence with empty or placeholder-only sources.
3. Citation gap manifest: 628 rows (EMPTY 12, ORPHAN 63, UNNAMESPACED_ID 553).
4. Reference grade of unnamespaced/placeholder assertions: has_doi 390, journal_only 4,
   unnamespaced 153, url_only 6.

Rule 9 consequence: while `docs/CITATION_GAPS.csv` is non-empty, the atlas may not assert
blanket citation coverage of itself. The new pages make no such claim. (The exact banned
phrasings are enumerated in `docs/CONTENT_CONSTRAINTS.md` section 9 and are not repeated
here, because this file is itself linted.)

---

## How the files this package touches actually work

### `pipeline/schemas.py`

Pydantic v2, every model `ConfigDict(extra="forbid")`, so an unknown key is a hard
validation error rather than being ignored.

- `Reference` (L32): `id`, `title`, `year` required; `authors`, `journal`, `doi`, `url`
  optional. No `pmid` field — see PROMPT_AMENDMENTS A5, which is a proposal only.
- `PopulationEquity` (L95): exactly three required strings — `gwas_ancestry_breakdown`,
  `transferability_notes`, `data_gaps`. **Not edited by this package**: these live on
  `data/diseases/*.json`, which is lint read-only territory.
- `DiseaseAncestryContext` (L103): optional `discovery_ancestry` (required within the model),
  `replication_ancestries`, `transferability_rating`, `multi_ancestry_studies`, `notes`.
  Reachable from `DiseaseSchema.ancestry_context`, also not edited here.
- `DiseaseSchema` (L120) carries `population_equity` (required) and `ancestry_context`
  (optional). Adding a cross-ancestry field here would mean editing all 19 disease files, so
  the new entity lives in its own directory instead.

### `pipeline/validate.py`

- `_collect_json_files` (L28) walks a **hard-coded list** of subdirectories:
  `diseases, exposures, genes, pathways, community, graph, briefs, reports`. A new
  directory is invisible to the validator until it is added to that list. This is the single
  most important fact for Phase 4: `data/ancestry/` would otherwise be silently unvalidated.
- `_schema_for_type` (L39) maps directory to schema; a directory with no entry returns `None`,
  and `_validate_schema` then returns the raw dict unvalidated (that is how `briefs` and
  `reports` pass).
- `_collect_citation_ids` (L97) pools reference IDs from **all** entity directories into one
  global set, and rule 3 (L576) only checks membership in that global pool. So a citation ID
  defined in any file satisfies a reference from any other file. The new validator therefore
  does its own stricter per-file check.
- `_collect_referenced_slugs` (L115) recognises specific key names
  (`exposure_slug`, `disease_slug` inside `gxe_highlights`/`health_stats`, `related_disease`,
  and so on). A bare top-level `disease_slug` is **not** among them, so the new validator
  resolves that link itself.
- Rule 5 slug-filename consistency (L600) iterates its own hard-coded list, again excluding a
  new directory.
- `_validate_briefs` (L209): every brief needs a boolean `published`; a published brief needs
  a valid ISO `published_at`; an unpublished brief must have `published_at: null`. Publication
  is a data flag, not a merge-time decision.
- `_NEW_SURFACES` (L246) marks paths whose citation defects are hard errors rather than
  warnings.

### `site/src/lib/types.ts` and `site/src/lib/data.ts`

`types.ts` mirrors the Pydantic models by hand; there is no codegen, so the two must be
edited together. `MechanismBrief.related_exposure` is typed `string` (non-nullable) and needs
widening to `string | null` for Brief #5. `SearchItem.type` is a closed union of
`disease | exposure | gene | pathway | brief`.

`data.ts` reads JSON synchronously at build time. `resolveDataDir()` tries `site/_data`
(Vercel/CI), then `../data` (local dev), then `./data`. `readJsonFile` returns `null` on any
failure, so a missing cross-ancestry file degrades to "section absent" rather than a build
error — which is exactly the behaviour the disease page needs.
`getMechanismBrief` returns `null` unless `published === true`, so an unpublished brief is
not routable and not linkable.

`site/scripts/copy-data.js` copies `data/` recursively into `site/_data/`, so a new
`data/ancestry/` directory is picked up with no change to that script.

### `site/src/app/atlas/diseases/[slug]/page.tsx`

The population-equity block is at L225-275, guarded by `disease.population_equity &&`. It
renders the three `PopulationEquity` strings, then an optional "Ancestry Context" card. The
new cross-ancestry section goes immediately after it, before "Tissue Context" (L277), guarded
on the presence of `data/ancestry/{slug}.json`.

### `site/src/app/mechanism-briefs/[slug]/page.tsx` and `data/briefs/*.json`

The detail page renders `question`, `background`, `evidence_summary[]`,
`mechanistic_chain[]` (as an `<ol>`), `tissue_specificity` (an unguarded `<p>`, so it must
carry content), `counterarguments[]`, `validation_criteria[]`, then citations and limitations.
It never renders `related_exposure`, `related_disease`, `related_genes` or
`related_pathways`. The index page (`mechanism-briefs/page.tsx` L49-50) does read
`related_disease` and `related_exposure`, both behind truthiness guards, so
`related_exposure: null` is already safe there. Briefs have **no** strict Pydantic schema;
`_validate_briefs` is the only structural check.

Shape read from `data/briefs/pparg-diet-type2diabetes.json`: `slug, title, question,
background, evidence_summary[], mechanistic_chain[], tissue_specificity, counterarguments[],
validation_criteria[], related_disease, related_exposure, related_genes[],
related_pathways[], references[], published, published_at, schema_version`.

### `site/src/lib/figures.ts`, `site/src/components/figures/`, `scripts/export-figures.mjs`

`FIGURES` is a `Partial<Record<FigureId, FigureMeta>>`; only the keys present in it ship, and
`SHIPPED_FIGURE_IDS` derives from `Object.keys(FIGURES)`. Two of five scoped figures are
absent, each with a recorded reason in the comment at L49-57 — including
`gwas-ancestry-imbalance`.

Rendering path: `/figures/[id]` → `buildFigurePayload(id)` (server, reads `data/`) →
`FigureCanvas` (client, reads `?size=` from the query string) → `FigureFrame` (fixed pixel
box carrying the `data-figure-*` attributes) → the figure component.

`scripts/export-figures.mjs` builds the site, serves `site/out/`, then for each directory
under `out/figures/` screenshots `[data-figure-root]` at `deviceScaleFactor: 2` in both sizes.
It **waits for `[data-figure-root] svg`**, so every figure must render an SVG or the export
times out and exits 1. Figures are internal export assets: no content page embeds the
exported PNG, which also means a figure cannot be shown on a content page by referencing its
PNG, because the PNG is produced after the build that would need it. A figure shown on a
content page must share its chart component with the export page.

### `scripts/check-constraints.mjs`

- `SCAN` (L112): `site/src` (`.tsx/.ts/.mdx`), `data` (`.json`), `content` (`.mdx/.md`).
  `outputs/` is **not** scanned, so the post kit needs a new SCAN entry.
- `JSON_DISPLAY_KEYS` (L210): the allowlist of JSON keys whose string values are linted. A
  key not on this list is **never checked** — so a new prose key is unlinted until added.
  Current list includes `transferability_notes`, `data_gaps`, `gwas_ancestry_breakdown`.
- `READ_ONLY_PREFIXES` (L120): `data/diseases/`, `data/genes/`, `data/pathways/`,
  `data/exposures/`, `content/briefs/`. `DERIVED_PATHS` (L128): `data/graph/graph.json`,
  `data/search-index.json`. `zoneOf` (L130) classifies everything else as `IN_SCOPE`.
  **`data/ancestry/` is therefore IN_SCOPE and cannot be baselined**, which is the intent.
- `CITATION_KEYS` (L220) and the `isRefRecord` test (L241) exempt reference metadata from the
  lexicon, per Rule 8.
- Tier A is banned everywhere; Tier B is an error in heading/label position and a warning in
  body prose. Context rules only escalate, never relax.

### `pipeline/sources/gwas_ancestry_breakdown.csv` and `manifest.json`

The CSV holds **four rows across two incompatible snapshots**:

| ancestry_group | pct | as_of | denominator |
|---|---|---|---|
| European | 86.5 | 2023 | GWAS Catalog participants, 2023 snapshot |
| African | 0.47 | 2023 | GWAS Catalog participants; excludes African American / Afro-Caribbean |
| European | 94.48 | 2024-09 | GWAS Diversity Monitor live dashboard, September 2024 |
| Asian | 3.96 | 2024-09 | GWAS Diversity Monitor live dashboard, September 2024 |

The two `as_of` values have different denominators and must never share a chart.

`manifest.json` is `{description, sources[]}`, 23 entries, keyed loosely by `file` (several
entries have no `file`). The `gwas_ancestry_breakdown.csv` entry carries
`status: "PARTIAL. Figure C3 is NOT shipped."` and a `blocker` stating the figure needs a
matched world-population share by the same ancestry framework, which no source publishes.
That blocker applies to a **two-bar GWAS-versus-world** figure. The figure shipped here is a
one-snapshot GWAS-participant-share chart with no world-population bar, so the blocker does
not apply to it; both the manifest entry and the `figures.ts` comment are updated to say so.

### `data/reports/releases.json`, `data/search-index.json`, `Navigation.tsx`, `Footer.tsx`

`releases.json` is a flat list of `{slug, title, date, summary, schema_version}`, sorted by
date descending at read time. `search-index.json` is a hand-maintained flat list of
`{type, slug, name, summary, confidence, synonyms[]}`, 75 entries (gene 22, disease 19,
exposure 15, pathway 11, brief 8); `SearchPageClient.getHref` switches on `type`, so a new
entry type needs a case there and a label and colour. `Navigation.tsx` has
`NAV_LINKS` as a `const` tuple at L7-15. `Footer.tsx` has three hard-coded link columns
(Atlas, Resources, About) with no shared constant.

---

## Deviation from the plan, recorded at the point it happened

**Phase 3 (ACS) required a Census API key.** `https://api.census.gov/data/2023/acs/acs5/...`
now rejects keyless data requests with an HTML page titled "Missing Key"; the keyless
`variables.json` endpoint still works, so label resolution succeeded and only the data query
failed. All nine required labels matched exactly one variable each, so the second Phase 3 stop
condition did not fire. The owner supplied a key rather than halting the run.
`scripts/fetch_acs_loudoun.py` reads it from `CENSUS_API_KEY`, redacts it from every error
path, and never writes it to the output file.
