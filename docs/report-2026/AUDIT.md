# GENARCH Annual Report 2026 v1.0: pre-report audit

Measured 2026-10-18 on branch `report-2026` at `c2101b3d766dcaa29821448c8929ded5a1f2787f`. This
audit only measures and records. No existing file was modified. Internal document: it uses
site_ids and DEQ site names freely because it is not public output (CONTEXT C7, C8).

Scratch code: `docs/report-2026/scratch/freeze.py` (Task 4) and
`docs/report-2026/scratch/checks.py` (Task 5, output in `checks_output.json`). Both import
`pipeline.reshape_deq` and leave pipeline code untouched. Run them with `PYTHONUTF8=1`. On this machine the bare
`python` shim intermittently fails to load pandas DLLs under Windows Application Control.
`C:\Python314\python.exe` (pandas 3.0.5, numpy 2.5.1, xlrd 2.0.2) worked.

## Mojibake scan (Task 2)

`python scripts/check_mojibake.py` exits **1**: **190 hits in 34 tracked files**. 30 of
the hits are a leading U+FEFF and 160 are pattern hits. Nothing was fixed.

| Kind | Files |
|---|---|
| Real mojibake in **published data** | `data/graph/graph.json` (25 lines: double-encoded `≥`, `²`, `–`, `κ`, `×`) |
| Real mojibake in tracked docs/data | `docs/CITATION_GAPS.csv` (3, `G×E` double-encoded), `REPORT.md` (8, some quoting the graph.json defect), `outputs/repro/*` (page_diff 68, deqdata_diff 18, void_block 5, limitations_block 2) |
| Box-drawing characters in directory trees (false positives for the U+251C / U+252C rule) | `VERIFICATION.md` (35), `REPORT.md` |
| Leading BOM | `pipeline/sources/deq_sensor_site_history.csv`, `site/src/content/deq-attribution.ts`, `docs/COLLOCATION_METHOD.md`, `docs/FRIDAY_PROCEDURE.md`, `coverage_synchrony.py`, `.claude/prompts/consolidation_2026-08-29.md`, 16 files under `scripts/`, 8 under `outputs/repro/` |

Correction (2026-10-22): BOM files split 15 under scripts/ and 9 under outputs/repro/; total 24 unchanged.

The checker keeps its patterns as escapes, so it never matches itself. `docs/report-2026/CONTEXT.md` §1 contains
the five patterns as literal text, so it will fail the check once it is tracked.

## Inventory

### a. Route tree (`site/src/app`)

```
/                                   page.tsx
/about
/ancestry-equity
/atlas
/atlas/diseases                     /atlas/diseases/[slug]
/atlas/exposures                    /atlas/exposures/[slug]
/atlas/genes                        /atlas/genes/[slug]
/atlas/genes-pathways
/atlas/pathways                     /atlas/pathways/[slug]
/community                          /community/[region]
/community/data-center-alley
/ethics
/field-notes
/figures                            /figures/[id]
/glossary
/graph
/guide/how-to-read-a-disease-page
/mechanism-briefs                   /mechanism-briefs/[slug]
/methods                            /methods/ethics   /methods/model-card
/r/[code]                           (page.tsx + OutreachRedirect.tsx)
/reports/[year]
/search                             (page.tsx + SearchPageClient.tsx)
/updates                            /updates/[slug]
```

| Route | Exists |
|---|---|
| /reports | **No.** Only `/reports/[year]` exists, and its breadcrumb "Reports" links to `/updates/` |
| /reports/[year] | Yes. Built for `data/reports/2024` and `data/reports/2026`, both placeholder `index.json` |
| /updates | Yes |
| /methods | Yes |
| /mechanism-briefs | Yes |
| /graph | Yes |
| /community/data-center-alley | Yes |
| /r/[code] | Yes |

### b. pipeline/report.py

Exists (70 lines). `python -m pipeline report --year Y` writes `data/reports/Y/index.json`
holding a fixed template: title, a one-line summary, a hard-coded markdown "Highlights" list and
`pdf_path: null`. It reads no data, computes no numbers and writes no `numbers.json`. The
current `data/reports/2026/index.json` is that template.

### c. Counts from data/

| Entity | Count | Basis |
|---|---:|---|
| Diseases | 19 | `data/diseases/*.json` |
| Exposures | 15 | `data/exposures/*.json` |
| Genes | 26 | `data/genes/*.json` |
| Pathways | 12 | `data/pathways/*.json` |
| Community regions | 2 | `data/community/` (loudoun-county-va, fairfax-county-va) |
| Graph nodes | 97 | `data/graph/graph.json` |
| Graph edges | 165 | `data/graph/graph.json` |
| Unique citations | 219 | 312 `references[]` records across `data/**/*.json` (search index excluded), deduplicated by DOI (208) or by normalised title where no DOI (11) |

The validator's global citation-ID pool (`_collect_citation_ids`) holds only 28 IDs, because
most files use file-local `ref1`-style IDs (see `docs/CITATION_GAPS.csv`).

### d. Briefs

`site/content/briefs/` does not exist. The site reads `data/briefs/*.json`
(`site/src/lib/data.ts:164-178`) and treats `published: false` as nonexistent. A separate
`content/briefs/asthma-air-pollution-ormdl3.mdx` exists at the repo root, but nothing in `site/`
reads it. Only `scripts/check-constraints.mjs` scans it.

| Slug | Title | Genes | Exposure | Pathways | Date | Version | Published |
|---|---|---|---|---|---|---|---|
| asthma-air-pollution-17q21 | 17q21 genotype and PM2.5: how ORMDL3 and GSDMB regulation shifts asthma risk under air pollution exposure | ormdl3, gsdmb, il33 | air-pollution | nf-kb, il33-st2-axis | 2026-07-13 (`date`) | schema 1.0 | **false** |
| bdnf-stress-major-depressive-disorder | BDNF Val66Met and Psychosocial Stress in Major Depressive Disorder Susceptibility | bdnf, slc6a4 | psychosocial-stress | hpa-axis | 2026-03-15 | schema 1.0 | true |
| jak-stat-psoriasis-ibd-environment | JAK-STAT and IL-23/Th17 Pathway in Psoriasis and IBD: Environmental Triggers and Therapeutic Targets | hla-drb1 | tobacco | jak-stat-signaling, tnf-signaling | 2026-03-20 | schema 1.0 | true |
| leptin-melanocortin-obesity-environment | Leptin–Melanocortin Axis and Obesogenic Environment in Polygenic Obesity | lep, mc4r, fto | obesity-exposure | insulin-signaling | 2026-03-10 | schema 1.0 | true |
| no2-traffic-corridor-childhood-asthma | Traffic-Related Nitrogen Dioxide Along the Route 28–Dulles Corridor and Childhood Asthma | ormdl3, gsdmb, il33, tslp | air-pollution | nf-kb, il33-st2-axis, oxidative-stress-response | 2026-07-01 | schema 1.0 | true |
| oxidative-stress-air-pollution-asthma-cvd | Oxidative Stress Response Genes (GSTP1, SOD2) and Air Pollution in Asthma and Cardiovascular Susceptibility | gstp1, sod2, il33 | air-pollution | oxidative-stress-response, nf-kb | 2026-03-01 | schema 1.0 | true |
| pm25-il33-nfkb-asthma | PM2.5 Exposure Amplifies IL-33-Mediated Airway Inflammation via NF-kB Signaling in Genetically Susceptible Individuals | il33, gstp1 | air-pollution | nf-kb, oxidative-stress-response | 2026-02-26 | schema 1.0 | true |
| pparg-diet-type2diabetes | PPARG Pro12Ala and Diet Quality in Type 2 Diabetes and Insulin Sensitivity | pparg, tcf7l2, fto | diet-quality | insulin-signaling | 2026-03-05 | schema 1.0 | true |
| sleep-deprivation-metabolic-mental-health | Sleep Deprivation and Circadian Disruption in Metabolic and Mental Health: Gene–Environment Interactions | bdnf, fto | sleep-deprivation | hpa-axis | 2026-03-25 | schema 1.0 | true |
| t2d-south-asian-prs-transferability | Why European-ancestry GWAS underserve Loudoun's South Asian community: PRS transferability in type 2 diabetes | (none) | (none) | (none) | 2026-10-06 | schema 1.0 | true |
| *content/briefs/* asthma-air-pollution-ormdl3.mdx | How Air Pollution Amplifies Asthma Risk in ORMDL3 Variant Carriers | ORMDL3, GSDMB, IL33, TSLP | air-pollution | nf-kb-signaling, il33-st2-axis | 2026-07-01 | 1 | not routed |

Dates are `published_at` unless marked. No JSON brief has a content `version` field, only
`schema_version`. **Totals: 10 JSON briefs, 9 published and routable; 1 MDX file not routed;
11 brief files in all.** Commit `25d35b7` calls the T2D brief "#5".

### e. Charts

| File | Rendering page | Library | Data-table fallback |
|---|---|---|---|
| components/deq/DeqHourlySeries.tsx | /community/data-center-alley | Recharts | Yes, `DeqFigure` `<details>` table |
| components/deq/DeqPercentileBars.tsx | /community/data-center-alley | Recharts | Yes, `DeqFigure` `<details>` table |
| components/deq/DeqCorrelationMatrix.tsx | /community/data-center-alley | HTML `<table>` (is the table) | Yes, is a table |
| components/RiskShiftChart.tsx | /atlas/diseases/[slug] | Recharts | **No** chart table. The exposure-modifier table on the same page (`page.tsx:197`) carries direction/strength/confidence |
| components/TissueRelevanceChart.tsx | /atlas/diseases/[slug] | Recharts | **No** chart table. The tissue section above it shows scores as inline bars with text values |
| components/GraphPageClient.tsx | /graph | Cytoscape.js | **No.** The `<details>` at line 430 holds filters, not data |
| components/CommunityRegionDetail.tsx (map) | /community/[region] | Leaflet (dynamic import; react-leaflet installed, unused here) | Yes, `<table>` at line 366 |
| components/CommunityRegionDetail.tsx (Health Burden bars, ~line 410) | /community/[region] | CSS div bars | **No** (and the known 0px-height bug) |
| components/CommunityRegionDetail.tsx (SHAP attributions, ~line 468) | /community/[region] | CSS div bars | **No** |
| components/figures/BarRows.tsx (GWAS share, `ancestry-equity/page.tsx:317`) | /ancestry-equity | custom SVG, `aria-hidden` | **No.** The table at line 357 is a different source, labelled as such |
| components/figures/BarRows.tsx (PRS AUC, `ancestry-equity/page.tsx:582`) | /ancestry-equity | custom SVG | Yes, "Figure data" table at line 607 |
| figures/GwasAncestryImbalance.tsx, PrsPortability.tsx | /figures/[id] via FigureCanvas | BarRows SVG | **No** |
| figures/LoudounAsthmaVsState.tsx | /figures/[id] | Recharts | **No** |
| figures/Il33Pm25Chain.tsx, KnowledgeGraphHero.tsx | /figures/[id] | custom SVG with `aria-label` alt text | **No** (diagrams) |
| charts/HealthBurdenChart.tsx, SHAPSummaryChart.tsx, ExposureDistributionPlot.tsx | none (no importers) | Recharts | n/a, dead code |

### f. Constraint texts and current site labelling

`docs/CONTENT_CONSTRAINTS.md` §4, verbatim:

> ## 4. School siting — narrow frame
>
> Render all schools as a single uniform map layer with identical styling. Never highlight,
> colour, size, or annotate an individual school.
>
> Never place a school name and a health outcome, symptom, reading value, or elevated-reading
> event in the same sentence, table row, tooltip, or chart annotation. Where source data carries
> a school name in a sensor label, render the sensor by its DEQ sensor ID and general locality.
>
> The lint checks for a school name within 200 characters of a health or reading term. **The
> pattern must cover abbreviations** — `Broad Run HS` is a school name and the unextended
> pattern misses it. See `docs/PROMPT_AMENDMENTS.md` A2.

`docs/GENARCH_RULES.md` §4, verbatim (headings and text, lines 106-164):

> ## 4. Kunak sensor data
>
> ### Timestamp normalization
>
> ```
> Kunak values are HOUR-ENDING and DST-adjusted.
> Regulatory values are HOUR-BEGINNING and always EST.
>
> Before any comparison or 24-hour averaging, shift Kunak timestamps:
>     before 2026-03-08 03:00     -> back 1 hour
>     on/after 2026-03-08 03:00   -> back 2 hours
>
> Store both raw and normalized. Never overwrite raw.
> Emit the shift applied per row in provenance.
> ```
>
> Hard-fail validation if any comparison joins a Kunak reading to a regulatory reading on unnormalized timestamps.
>
> Applying the shift raises PM2.5 correlation from 0.861 to 0.889. Adjacent shifts score within 0.001 of each other, so the improvement confirms a shift is needed but does not independently validate the specific boundary. Use DEQ's instruction and cite DEQ.
>
> ### No QC flags
>
> Kunak files carry no null code, flag, or qualifier column. DEQ's dashboard states the values are published as detected and have not passed quality assurance validation. Regulatory and sensor data are therefore not symmetric, and any disagreement between them has at least three candidate explanations: sensor accuracy, absence of QA on one side, and timestamp convention. Do not attribute disagreement to sensor performance alone.
>
> ### Zeros
>
> Broad Run HS reports exact `0.0` on PM2.5 (53 rows), NO2 (780 rows, 20.2%), and VOCs (194 rows). No row has all three at zero, so these are per-pollutant floor clamping rather than device outage. Excluding them shifts the sensor mean by roughly 0.1 µg/m³. Whichever treatment you choose, state it.
>
> ### Duplicates
>
> The Broad Run HS export returned 4,721 rows against 3,862 unique timestamps. All 1,718 duplicate rows are exact across every column, confined to 2026-03-03 through 2026-04-07, 48 rows per day. Pagination artifact. Deduplicate on all columns. Check every file for this pattern, not just this one.
>
> ### Known gaps
>
> 2026-03-08 02:00 does not exist in local time (spring forward). 2026-04-21 08:00 is a genuine one-hour gap. Render gaps as gaps, never as zero, never interpolated. Report the excluded count alongside every statistic.
>
> ### Retired sites
>
> Heritage Farm Museum, Newberry Condo Assoc, and Steuart Weller ES show "Location without device" on the dashboard. Whether their historical data is downloadable is unresolved. If it is not, state the gap explicitly rather than letting three missing site records read as no data.
>
> ### Not exportable
>
> Meteorological data appears on the Latest data tab but not in the Historical data sensor selector. Record as a known gap. Wind-direction attribution is out of scope under Constraint 2 anyway.
>
> ### CO, ingested 2026-08-30, with the averaging period unresolved
>
> The 2026-08-28 export is the first to carry a `CO (ppm)` column; the 2026-08-10 export had none. CO is now ingested: `"CO": "CO"` was added to `KUNAK_POLLUTANT_PREFIXES` in `reshape_deq.py`, which was the only change required, since `POLLUTANT_UNITS` already carried CO for the regulatory side. Adding it leaves every existing output byte-identical apart from new CO rows, verified by diff: 19,748 CO rows added to the hourly table, six CO rows added to `deq_missing_hours.csv`, and `deq_pm25_daily.csv`, `deq_occupancy_violations.csv` and `deq_unit_conflicts.csv` unchanged to the byte. CO takes the same validity, exact-zero and occupancy rules as every other pollutant with no special-casing.
>
> **The averaging period is not settled and the sensor rows are provisional.** The standing note this section previously carried recorded Kunak CO as an 8-hour average against a 1-hour FOIA CO from Aurora Hills. DEQ's Table 1 is captioned "CO Hourly Concentrations Statistical Summary" and places the sensor rows beside that same 1-hour regulatory monitor. Both cannot be right. The note predates the first export to carry CO at all and has not been reconfirmed with DEQ. Until it is, do not describe the sensor CO rows as hourly concentrations and do not publish them.
>
> Aurora Hills remains in Arlington, not Loudoun, and remains out of v1 scope as `out_of_county_reference_arlington`.
>
> **Table 1 does not reproduce on the mean.** Against DEQ's published Table 1, at a 2026-08-27 cutoff and a 2026-08-28 export: the 98th percentile agrees within 0.08 ppm at every site, the standard deviation within 0.04, and the median within 0.09, but the mean sits 0.09 to 0.12 above DEQ's published figure. DEQ publishes that column at 0.1 ppm resolution, so the gap is a full unit of published precision and this is not a reproduction. Two complications are on record and neither is offered as the cause: the averaging-period question above, and the fact that DEQ's own Table 1 prints a mean below its median at three sites, which is not a shape a right-skewed concentration distribution takes. Recorded open in `outputs/repro/table1_co_hourly_2026-08-28.csv`. Do not attribute it.
>
> ### VOCs
>
> Broad Run HS VOC readings range from 0.27 ppb in March to 884.78 ppb in August. Three orders of magnitude, cause unknown. Record it. Do not use it.

How `/community/data-center-alley` labels sites beside values (`site/src/lib/deq-data.ts:294-302`):

```ts
/**
 * Sensors are identified by DEQ site_id and locality throughout this page, never by DEQ's
 * published site label. Four of the nine sites are hosted at schools, and rendering a school
 * name beside a concentration figure invites an inference about children at that school that
 * none of this data supports (docs/CONTENT_CONSTRAINTS.md section 4, PROMPT_AMENDMENTS A2).
 * The identifier crosswalk in `getCrosswalk()` carries DEQ's labels, with no measurements, so
 * the reproduction against DEQ's report stays checkable.
 */
export const siteLabel = (siteId: string, area: string): string => `${siteId} (${area})`;
```

That label goes beside values in every figure table, for example `page.tsx:396`
(`rows: splits.map((s) => [s.label, ..., n2(s.withSmoke.mean), n2(s.withSmoke.max), ...])`).
The edition table names the site by slug beside its p98 values (`page.tsx:737-745`,
`DEQ figure for {DEQ_WEEKLY_EDITIONS.siteId}` with `siteId: "sterling-ms"` at
`deq-data.ts:908`). The prose at `page.tsx:719-721` reads "That sensor, {shortest.key}, had the
shortest record". So rendered output reads `sterling-ms (Sterling)`, `farmwell-middle (Ashburn)`
and `ashburn-collocated (Ashburn)` next to concentrations. The crosswalk table
(`page.tsx:1056-1061`) maps slug to DEQ label without values.

### g. Constraint lint

Command: `npm run check:constraints` (equivalent: `node scripts/check-constraints.mjs`). Current
result: exit 0, **52 violations, 52 baselined, 3 exempted, 0 new**; in-scope 0. The count equals
the C9 baseline of 52.

### h. Citation and licence files

`CITATION.cff` (verbatim, comments included):

```yaml
cff-version: 1.2.0
message: "If you use GENARCH or its reproduction of the Virginia DEQ air monitoring analysis, please cite it as below."
title: "GENARCH: A Gene-Environment Interaction Atlas for Loudoun County, Virginia"
abstract: >-
  GENARCH is a static web atlas of gene-environment interaction evidence for
  Loudoun County, Virginia. It pairs a Python data pipeline with a Next.js
  static export to publish population-level evidence at county resolution, with
  every scientific claim tied to a citation. It produces no individual-level
  output, accepts no personal data, and is not a diagnostic tool. Version 1.0.0
  includes an independent reproduction of the Virginia Department of
  Environmental Quality's Data Center Air Monitoring analysis for the Loudoun
  data center corridor, computed from DEQ's raw sensor exports and from
  regulatory monitor records released under Virginia FOIA request 26-4646.
  Three of DEQ's four published collocation regressions reproduce within 0.05
  on coefficients and 0.03 on R-squared, and recomputed 24-hour PM2.5 averages
  match DEQ's published daily file on 118 of 119 comparable days with a mean
  absolute difference of 0.0017 micrograms per cubic metre. Both checks are
  asserted at build time.
type: software
authors:
  - family-names: Saraiya
    given-names: Kiaan
version: 1.0.0
date-released: "2026-08-15"
repository-code: "https://github.com/ksaraiya388/GENARCH"
url: "https://genarch.org"
license:
  - CC-BY-4.0
  - MIT
keywords:
  - gene-environment interaction
  - environmental epidemiology
  - air quality
  - PM2.5
  - open data
  - reproducibility
  - Loudoun County
  - Virginia

# doi: 10.5281/zenodo.XXXXXXX
# The DOI above is a placeholder and is intentionally left commented out. It
# will be uncommented and filled in with the concept DOI after the v1.0.0
# Zenodo deposit. Do not cite a DOI for this work until this line is active.
```

`data/reports/releases.json` is present. It holds 9 entries, newest first by file order but not by
date: brief-sleep-circadian (2026-03-25), brief-jak-stat (2026-03-20), brief-bdnf-stress
(2026-03-15), brief-leptin-melanocortin (2026-03-10), brief-pparg-diet (2026-03-05),
brief-oxidative-stress (2026-03-01), genarch-launch (2026-03-07), v1-0-initial-release
(2026-02-26, `version: "1.0.0"`), cross-ancestry-layer (2026-10-06). There is no entry for the
DEQ reproduction, the 2026-08-15 CITATION release date, or briefs no2-traffic-corridor /
pm25-il33 / t2d-south-asian.

`.zenodo.json`: **not present.**

`LICENSE` (single file at the root; none in `site/`): dual licence. CC BY 4.0 covers `data/`,
`docs/`, `content/`, `pipeline/sources/`, `site/src/content/`, root prose and rendered
figures/text. MIT covers `pipeline/` (excluding sources), `site/` (excluding `src/content/`),
`scripts/` and root config. It credits Virginia DEQ data per DEQ staff 2026-08-10 and FOIA
26-4646, and supersedes the prior CC BY-NC-SA 4.0 declaration.

### i. /r/[code] redirects

Defined in `site/src/app/r/[code]/page.tsx` as a TypeScript `const OUTREACH_CODES = [...] as const`
array. `generateStaticParams` builds one static page per code, with `dynamicParams = false`.
Each page renders a client-side redirect (`OutreachRedirect.tsx`) to
`/community/data-center-alley/` with a no-JS link fallback and `robots: { index: false }`.
`vercel.json` has no redirects. Codes (11): `deq`, `pec`, `lcp`, `mcaf`, `dcrc`, `loudounnow`,
`eenews`, `lchd`, `gmu`, `dip`, `muckrock`. The code comment cites "docs/GENARCH_RULES.md §11",
but the outreach rule is in §12.

### j. Package versions (installed)

| Package | Declared | Installed |
|---|---|---|
| next | ^14.0.0 (site) | 14.2.35 |
| react | ^18.0.0 (site) | 18.3.1 |
| recharts | ^2.0.0 (site) | 2.15.4 |
| playwright | ^1.48.0 (root devDependency) | 1.61.1 (root node_modules) |
| @playwright/test | not declared | **not installed** |
| MDX | @next/mdx ^14, @mdx-js/loader ^3, @mdx-js/react ^3 (site) | 14.2.35 / 3.1.1 / 3.1.1. **Installed but not configured**: `next.config.js` has no MDX plugin and no `.mdx` file is imported |
| @react-pdf/renderer | ^3.0.0 (site) | 3.4.5, no importer in `site/src` |

### k. Font loading

A CSS `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap')`
sits at `site/src/app/globals.css:5`. It does not use `next/font` or a `<link>` in `layout.tsx`.
Tailwind declares `mono: ["Fira Code", "Consolas", "monospace"]`, but no stylesheet loads Fira
Code, so it falls back to Consolas/monospace.

## Data freeze (Task 4)

Recorded in `data/reports/2026/FREEZE.json` (frozen 2026-10-18T23:04:13Z, git HEAD `c2101b3`).
26 files were copied to `pipeline/sources/freeze-2026/` (20 at the top level, 6 in `aug-2026/`). Each copy was hash-verified against
its source, and `manifest.json` was not touched.

- **Kunak, latest per site (12 files, `*_2026-03-03_2026-10-10.csv`).** None of the 12 has a
  `manifest.json` entry, so `export_date` is `null`. The only evidence for the date is the
  filename end date 2026-10-10 and the file mtime 2026-10-11. Six of the 12 are byte-identical to their
  `_2026-10-04` siblings: farmwell-middle, golf-course and sterling-ms (offline since
  2026-09-17), plus heritage-farm, newberry-condo and steuart-weller (retired).
  Data cutoffs (last non-null hour, local clock, hour-ending):
  ashburn-collocated, belfort-park, dulles-area, camp-snyder, evergreen-cc and vdot-mkc are at
  2026-10-10 23:00. farmwell-middle and sterling-ms are at 2026-09-17 11:00, golf-course at
  2026-09-17 10:00, heritage-farm at 2026-06-17 12:00, steuart-weller at 2026-06-17 10:00 and
  newberry-condo at 2026-05-14 10:00.
- **FOIA 26-4646 (4 files).** AshburnPM2.5, AshburnNO2_hourly and AuroraHillsCO_hourly end at
  2026-08-10 09:00 EST. AshburnPM2.5_dailyAvg ends at 2026-08-09. Export date 2026-08-11 is the
  FOIA release date (no per-file manifest entry).
- **DEQ weekly reports.** `2026-08-07_data_center_air_quality_analysis.pdf` (no manifest
  entry). Also `deq_dcamp_weekly_2026-10-09.pdf`, whose SHA-256 matches the manifest, with its
  `.txt` and `_tables.json` sidecars.
- **Original analysis inputs, 2026-08-12 (`freeze-2026/aug-2026/`, 6 files).** These are the
  `_2026-03-03_2026-08-10.csv` exports for ashburn-collocated, belfort-park, dulles-area,
  farmwell-middle, golf-course and sterling-ms. All have manifest export_date 2026-08-10, were
  superseded 2026-08-29, and match their manifest SHA-256. The cutoff is 2026-08-10 23:00 local.
- The manifest's `raw_inputs`, the six 2026-08-28 entries and the reshape logic all point at
  `deq-raw/<site>_..._2026-08-28.csv`. Those files now sit in `_superseded/`, so the manifest
  no longer describes what `deq-raw/` holds.

## Checks

Method shared by all checks: rows are built by `reshape_deq.build_sensor_rows`, which applies
occupancy, void windows, the PM2.5 end date and `exact_zero_floor`. Daily means use the 18-of-24
rule, are untruncated, and take numpy `linear` p98. This matches `getPercentiles()` in
`site/src/lib/deq-data.ts`.

### a. Common-window p98, 2026-06-18 to 2026-08-07 (standard-time binning, zeros missing)

Identical from the 2026-08-10 exports and from the frozen 2026-10-10 exports, so no backfill
reached this window.

| Site | Valid days | Recomputed p98 | CONTEXT R3 | Diff | Rank |
|---|---:|---:|---:|---:|---:|
| farmwell-middle | 50 | 45.402 | 45.40 | +0.002 | 1 |
| belfort-park | 50 | 40.189 | 40.19 | −0.001 | 2 |
| golf-course | 51 | 40.123 | 40.12 | +0.003 | 3 |
| sterling-ms | 51 | 38.215 | 38.21 | +0.005 | 4 |
| ashburn-collocated | 51 | 37.097 | 37.10 | −0.003 | 5 |
| dulles-area | 50 | 29.500 | 29.50 | 0.000 | 6 |

R3 reproduces to within 0.005 at each site, with 5 of 6 above 35 and sterling-ms fourth. Both
ends of the window are inclusive, so the window holds whole days through 2026-08-07. That needs
hours after DEQ's stated edition cutoff of 07:00 on 2026-08-07 (DEQ staff, 2026-08-16).

### b. Full-record p98 against DEQ Table 4, 2026-08-07 edition

DEQ values are transcribed from `freeze-2026/2026-08-07_data_center_air_quality_analysis.pdf`,
Table 4, `percentile_98`. Each cell below gives n, the GENARCH p98, and the signed difference from DEQ in brackets.
Inputs are the 2026-08-10 exports for the six live sites and the frozen 2026-10-10 exports for
the three retired ones, which had no export in August. The six live sites give identical results
from either input set.

**Day set A: DEQ's stated cutoff (data through 2026-08-07 07:00 EST, last complete day
2026-08-06).**

| Site | DEQ | (i) std, zeros missing | (ii) std, zeros kept | (iii) clock, zeros missing | (iv) clock, zeros kept |
|---|---:|---|---|---|---|
| golf-course | 23.8 | 121, 24.90 (+1.10) | 121, 24.90 (+1.10) | 121, 23.84 (+0.04) | 121, 23.84 (+0.04) |
| belfort-park | 31.4 | 83, 30.98 (−0.42) | 84, 30.73 (−0.68) | 83, 31.71 (+0.31) | 84, 31.40 (−0.00) |
| ashburn-collocated | 25.5 | 151, 25.88 (+0.38) | 151, 25.88 (+0.38) | 151, 25.50 (−0.00) | 151, 25.50 (−0.00) |
| dulles-area | 18.4 | 149, 20.77 (+2.37) | 151, 20.76 (+2.36) | 148, 18.42 (+0.02) | 151, 18.25 (−0.15) |
| farmwell-middle | 26.0 | 119, 27.22 (+1.22) | 121, 27.17 (+1.17) | 119, 26.26 (+0.26) | 121, 26.14 (+0.14) |
| sterling-ms | 40.4 | 50, 39.36 (−1.04) | 50, 39.36 (−1.04) | 50, 41.57 (+1.17) | 50, 41.57 (+1.17) |
| heritage-farm | 9.7 | 82, 9.73 (+0.03) | 83, 9.73 (+0.03) | 82, 9.34 (−0.36) | 83, 9.34 (−0.36) |
| newberry-condo | 14.5 | 66, 14.52 (+0.02) | 66, 14.52 (+0.02) | 66, 14.25 (−0.25) | 66, 14.25 (−0.25) |
| steuart-weller | 10.2 | 100, 10.20 (−0.00) | 100, 10.16 (−0.04) | 100, 10.36 (+0.15) | 100, 10.20 (−0.01) |
| **within 0.05** | | 3 of 9 | 3 of 9 | 3 of 9 | 4 of 9 |

**Day set B: whole days through 2026-08-07, the `RECORD_END` convention in `deq-data.ts`.**

| Site | DEQ | (i) | (ii) | (iii) | (iv) |
|---|---:|---|---|---|---|
| golf-course | 23.8 | 122, 24.88 (+1.08) | 122, 24.88 (+1.08) | 122, 23.82 (+0.02) | 122, 23.82 (+0.02) |
| belfort-park | 31.4 | 84, 30.73 (−0.68) | 85, 30.47 (−0.93) | 84, 31.40 (−0.00) | 85, 31.09 (−0.31) |
| ashburn-collocated | 25.5 | 152, 25.85 (+0.35) | 152, 25.85 (+0.35) | 152, 25.47 (−0.03) | 152, 25.47 (−0.03) |
| dulles-area | 18.4 | 149, 20.77 (+2.37) | 152, 20.71 (+2.31) | 148, 18.42 (+0.02) | 152, 18.22 (−0.18) |
| farmwell-middle | 26.0 | 120, 27.20 (+1.20) | 122, 27.15 (+1.15) | 120, 26.20 (+0.20) | 122, 26.08 (+0.08) |
| sterling-ms | 40.4 | 51, 38.22 (−2.19) | 51, 38.22 (−2.19) | 51, 40.44 (+0.04) | 51, 40.44 (+0.04) |
| heritage-farm | 9.7 | 82, 9.73 (+0.03) | 83, 9.73 (+0.03) | 82, 9.34 (−0.36) | 83, 9.34 (−0.36) |
| newberry-condo | 14.5 | 66, 14.52 (+0.02) | 66, 14.52 (+0.02) | 66, 14.25 (−0.25) | 66, 14.25 (−0.25) |
| steuart-weller | 10.2 | 100, 10.20 (−0.00) | 100, 10.16 (−0.04) | 100, 10.36 (+0.15) | 100, 10.20 (−0.01) |
| **within 0.05** | | 3 of 9 | 3 of 9 | 5 of 9 | 4 of 9 |

**Which combination reproduces DEQ.** None reproduces all nine. Combination **(iii), local
clock time with zeros as missing, on day set B** reproduces five of the six live sites within
0.05; farmwell-middle is left at +0.20. The three retired sites reproduce only under standard-time
binning ((i) or (ii)) and move by −0.36 to +0.15 under clock binning. The cause was not tested.

**What explains the 1-2 µg/m³ offset.** The offset comes from **binning**. Moving from
standard-time to clock-time binning takes golf-course from +1.10 to +0.04, dulles-area from
+2.37 to +0.02 and farmwell-middle from +1.22 to +0.26 (day set A). Zero handling is secondary
and inconsistent in direction. It closes belfort-park under clock binning on day set A, opens it
again on day set B, and moves dulles-area by about −0.17. It never moves golf-course,
ashburn-collocated or sterling-ms. The sterling-ms value depends on the **day set**, not on
binning or zeros alone. At n = 50, p98 interpolates between the top two daily means. At n = 51
the linear index (n−1)×0.98 = 49 lands exactly on the second-highest daily mean, 40.442 under
clock binning, which truncates to 40.4. Any 51st day below that value gives the same result.

Additional variant, not one of the four requested: no completeness threshold, on day set A. It
reproduces at most 3 of 9, with sterling-ms at −0.27, so it was not adopted
(`checks_output.json`, `task_b_extra_no_completeness_threshold`).

### c. Newest DEQ weekly report in the freeze: 2026-10-09

Verbatim from `freeze-2026/deq_dcamp_weekly_2026-10-09.txt`, page 26, below Table 4:

> As the above table illustrates, no site’s 98th percentile concentration of the daily PM2.5
> averages is above the 24-hr 98th percentile PM2.5 NAAQS limit of 35.0 μg/m3 .
> No sensors are above the 24-hr (daily) average PM2.5 NAAQS limit of 9.0 μg/m3 .
> Loudoun County sensors have higher 98th percentile values than the Prince William
> County sensors as the Prince William County sensors were not deployed during the
> Minnesotan and Canadian wildfires during the weekend of July 17, 2026.

It **no longer identifies any sensor** above 35. The sentence naming one sensor was dropped from
the 2026-08-28 edition onward (GENARCH_RULES §9). The 2026-10-09 Table 4 lists seven rows:
Belfort Park Dr, Broad Run HS, Broad Run HS Regulatory Monitor, Camp William B Snyder, Dulles
Airport, Evergreen Country Club and VDOT MKC. The three sensors that went offline on 2026-09-17,
including Sterling MS, are no longer in the table. The report's title now reads "Loudoun County
and Prince William County Study Area". The text repeats the "daily average PM2.5 NAAQS limit of
9.0" wording that GENARCH_RULES §11 bars from adoption.

### d. County of the three 2026-09-17 sites

`pipeline/sources/deq_sensor_site_history.csv` has no coordinate columns. DEQ's 2026-10-09
report (p. 3) publishes no street address for Camp Snyder or Evergreen Country Club. For the
VDOT site it gives only "the Virginia Department of Transportation (VDOT) Facility at Mason King
Court". The street number 8011 comes from the site-history note ("8011 Mason King Court",
sourced to the Kunak dashboard).

| Site | Method | Result |
|---|---|---|
| VDOT MKC, 8011 Mason King Court | Census `onelineaddress`, "8011 Mason King Court, Manassas, VA" | Matched 8011 MASON KING CT, MANASSAS, VA, 20109 (−77.538383, 38.787015). **Prince William County, GEOID 51153** |
| Camp William B Snyder | No coordinates, no DEQ-published address. A place-name query to `onelineaddress` returns 0 matches | **unverified** by geocoder |
| Evergreen Country Club | No coordinates, no DEQ-published address. A place-name query returns 0 matches | **unverified** by geocoder |

DEQ's report states that these sensors "were moved from Loudoun County to Prince William County"
(p. 3), and its Table 4 text calls them "the Prince William County sensors". The site history
records all three as Prince William County, "verify before use in any Loudoun-scoped artifact".

### e. Share of complete site-days below 35 µg/m³

Full frozen record, all 12 sensor sites, standard-time binning, zeros missing, 18-of-24, strict
`< 35`: **1,288 of 1,299 site-days (99.15%)**. For the nine Loudoun sites only, excluding the
three Prince William sites: 1,220 of 1,231 (99.11%). The 11 site-days at or above 35 are split
2 each at ashburn-collocated, belfort-park, farmwell-middle, golf-course and sterling-ms, and 1
at dulles-area. The regulatory monitor is not included.

## Blocking decisions

1. **No /reports index route.** Only `/reports/[year]` exists, and its "Reports" breadcrumb points at `/updates/` (`site/src/app/reports/[year]/page.tsx`).
2. **pipeline/report.py computes nothing.** CONTEXT §4 says the report uses values "recomputed by pipeline.report at the data freeze", and §8 requires every number to come from `data/reports/2026/numbers.json` via an `<N>` component. Neither `numbers.json` nor `<N>` exists, and `report.py` writes a hard-coded template.
3. **R1 "to three decimals" conflicts with GENARCH_RULES §9.** §9 says "Agreement to three decimals is not verifiable against the source and must not be claimed"; DEQ publishes two significant figures. CITATION.cff says "within 0.05 … 0.03 on R-squared".
4. **R1 coefficients differ from the repo's recorded reproduction.** CONTEXT gives APEX 14 PM2.5 as 1.29 + 0.832x and APEX 14 NO2 as R² 0.491. GENARCH_RULES §9 gives 1.299 + 0.831x and R² 0.497 (date-window R² 0.4908 per §11).
5. **R1 "one near" conflicts with the repo.** GENARCH_RULES §9 records APEX 5 NO2 as reproducing after DEQ's 2026-08-19 zero-retention confirmation (1.835 + 0.319x, R² 0.207 against DEQ 1.8 + 0.32x, R² 0.21). It also bars "a count of how many currently match", so "three exact, one near" needs a ruling.
6. **R2 conflicts inside the docs.** CONTEXT, CITATION.cff, DATA_PROVENANCE.md and `outputs/repro/daily_reconciliation_2026-08-28.csv` agree on 118 of 119 (MAD 0.0017; re-verified here). GENARCH_RULES §3/§6/§9 still say 126 of 131, MAD 0.0099.
7. **R3 premise is stale.** DEQ dropped the "only Sterling MS above 35" sentence from the 2026-08-28 edition onward, and the 2026-10-09 edition names no sensor above 35 and no longer lists that site (Check c). The report must date the Table 4 statement to the 2026-08-07 edition.
8. **R3 caveat 2 wording conflicts with GENARCH_RULES §9.** "This corrects a comparison" sits against "Do not write that GENARCH corrected DEQ" and the rule that the falling figure is DEQ's own.
9. **R3 day counts and common window need hours DEQ did not have.** "51 days versus 84–152" and the common-window values only reproduce with whole days through 2026-08-07 (day set B). DEQ's edition cutoff was 07:00 that day, which gives 50 / 83–151 (Checks a, b).
10. **CONTEXT §6 "offset: state only the cause tested in AUDIT.md Task 4".** The offset was tested in Task 5, not Task 4. Check b finds binning explains most of it, the day set explains Sterling MS, and the three retired sites go the other way. Decide what the report may state.
11. **The site renders slugs, including school-derived ones, beside values.** `siteLabel()` = `${siteId} (${area})` puts `sterling-ms`, `farmwell-middle` and `ashburn-collocated` next to concentrations (`deq-data.ts:302`, `page.tsx:396`, `:719-745`). That violates C7, and arguably C8 and CONTENT_CONSTRAINTS §4 (abbreviated school names). Neutral DC-xx codes and a values-free site key do not exist yet.
12. **The three 2026-09-17 sites are outside Loudoun.** VDOT MKC geocodes to Prince William County (51153). Camp Snyder and Evergreen CC are unverified by geocoder but stated by DEQ to be in Prince William County. This conflicts with CONTEXT §6 "county as determined in AUDIT.md" and with the Loudoun-only charter (CLAUDE.md constraint 4). Decide whether those sites are excluded and how the Loudoun-only share (99.11%) versus the all-site share (99.15%) is reported.
13. **DEQ's own framing has changed to a two-county study area.** The 2026-10-09 title is "Loudoun County and Prince William County Study Area", and the report mentions a further Prince William site (Long Park) and a planned Manassas Airport sensor.
14. **Charts without data-table fallbacks.** RiskShiftChart, TissueRelevanceChart, the /graph Cytoscape view, the Health Burden and SHAP bars on /community/[region], the GWAS-share BarRows on /ancestry-equity, and all five /figures/[id] figures lack one (Inventory e).
15. **Brief count is ambiguous.** There are 9 published JSON briefs, 1 unpublished JSON brief and 1 un-routed MDX file. Commit `25d35b7` numbers the T2D brief "#5", and releases.json lists only 6 briefs.
16. **Brief titles may breach C5 / X8.** Examples: "PM2.5 Exposure Amplifies … in Genetically Susceptible Individuals", "… shifts asthma risk …", "… and Therapeutic Targets". The MDX is titled "How Air Pollution Amplifies Asthma Risk in ORMDL3 Variant Carriers". Quoting them in the module inventory needs a ruling.
17. **Mojibake gate fails today.** 190 hits / 34 files, including published `data/graph/graph.json` and a BOM in `pipeline/sources/deq_sensor_site_history.csv` and `site/src/content/deq-attribution.ts`. CONTEXT.md itself contains the literal patterns, so the gate fails on its own standing-context file once tracked. It needs an allowlist or a rewording of §1.
18. **The latest Kunak exports have no manifest entries.** All 12 `_2026-10-10` files lack `export_date` in `manifest.json`, which conflicts with CONTEXT §6 ("every input records its export date"). The manifest's live-file entries still point at files now in `_superseded/`.
19. **The site ignores hours DEQ excluded.** `deq-data.ts` `RECORD_END = "2026-08-07"` (date-level) includes data after DEQ's 07:00 edition cutoff. Decide whether report R3 uses DEQ's cutoff (day set A) or the site's (day set B). The two give different n and p98.
20. **Regulatory data still ends 2026-08-10** (FOIA 26-4646). Collocation (R1) and daily reconciliation (R2) cannot move past it. The freeze's Kunak cutoff is 2026-10-10, so the "values recomputed at the freeze" for R1/R2 equal the August values.
    Correction (2026-10-21, round 2 Task 1b): R2 is input-invariant. R1 is unchanged for three regressions; APEX 5 NO2 changes when backfilled all-zero rows enter its zero-retention fit (D16). R1 is computed from original_analysis_inputs.
21. **The MDX and PDF toolchain is installed but unwired.** @next/mdx is not configured, @react-pdf/renderer has no importer, and @playwright/test is not installed. Decide the report's authoring and PDF path.
22. **The author's ORCID is `[FILL]`** in CONTEXT §8. Left unfilled.

## Checks (round 2)

Measured 2026-10-20 on branch `report-2026`. Scratch code:
`docs/report-2026/scratch/round2.py` (Tasks 1a-1d, output in `round2_output.json`),
`docs/report-2026/scratch/quotes_r2.py` (Task 1e, output in `quotes_r2.json`),
`docs/report-2026/scratch/manifest_add_2026-10-10.py` and
`docs/report-2026/scratch/freeze_export_dates.py` (Task 2). All import `pipeline.reshape_deq`
and leave pipeline code untouched. Interpreter `C:\Python314\python.exe` with `PYTHONUTF8=1`.

### 1a. Method-matched record-length check

Configuration: the combination that best matched DEQ in round-1 check b, **local clock time
days with exact zeros treated as missing** (combination (iii)), 18-of-24 completeness,
untruncated daily means, numpy `linear` p98. Window 2026-06-18 to 2026-08-07 inclusive.
Both runs give identical values from the 2026-08-10 exports and from the 2026-10-10 freeze.

**Run 1: whole days through 2026-08-07** (the `RECORD_END` convention in `deq-data.ts`).

| Rank | Site | Valid days | Day range | p98 (clock) |
|---:|---|---:|---|---:|
| 1 | farmwell-middle | 50 | 2026-06-18 to 2026-08-07 | 47.916 |
| 2 | belfort-park | 50 | 2026-06-18 to 2026-08-07 | 42.689 |
| 3 | golf-course | 51 | 2026-06-18 to 2026-08-07 | 42.620 |
| 4 | **sterling-ms** | 51 | 2026-06-18 to 2026-08-07 | **40.442** |
| 5 | ashburn-collocated | 51 | 2026-06-18 to 2026-08-07 | 39.167 |
| 6 | dulles-area | 49 | 2026-06-18 to 2026-08-06 | 31.783 |

Above 35: **5 of 6**. DEQ's Table 4 sensor (`sterling-ms`) ranks **4th**.

**Run 2: DEQ's stated edition cutoff, 07:00 EST on 2026-08-07** (DEQ staff, 2026-08-16).

| Rank | Site | Valid days | Day range | p98 (clock) |
|---:|---|---:|---|---:|
| 1 | farmwell-middle | 49 | 2026-06-18 to 2026-08-06 | 49.157 |
| 2 | belfort-park | 49 | 2026-06-18 to 2026-08-06 | 43.756 |
| 3 | golf-course | 50 | 2026-06-18 to 2026-08-06 | 43.710 |
| 4 | **sterling-ms** | 50 | 2026-06-18 to 2026-08-06 | **41.572** |
| 5 | ashburn-collocated | 50 | 2026-06-18 to 2026-08-06 | 40.218 |
| 6 | dulles-area | 49 | 2026-06-18 to 2026-08-06 | 31.783 |

Above 35: **5 of 6**. `sterling-ms` ranks **4th**.

The count and the rank are stable across the two cutoffs and across the two day definitions:
round-1 check a, on standard-time days, also gives 5 of 6 above 35 with `sterling-ms` fourth
(45.402, 40.189, 40.123, 38.215, 37.097, 29.500). Clock binning raises every site's p98 by
1.3 to 2.6 µg/m³ relative to standard binning but does not reorder the six or change the count.
Under clock binning the `sterling-ms` full record is 51 days on day set B against 84 to 152 for
the other five, which is the span CONTEXT R3 states.

Dropping the 2026-08-07 partial day costs farmwell-middle, belfort-park and dulles-area one day
each; dulles-area never reaches 18 valid hours on 2026-08-07 under either run.

### 1b. Backfill attribution

Inputs. The 2026-08-10 exports are the six files in `pipeline/sources/freeze-2026/aug-2026/`,
recorded in `FREEZE.json` under `original_analysis_inputs` (`analysis_date` 2026-08-12,
selection rule: manifest `export_date` on or before 2026-08-12 and `superseded_on` null or
later). Each frozen copy was re-hashed here and matches both its manifest SHA-256 and the value
in `FREEZE.json`.

| Frozen file | export_date | SHA-256 |
|---|---|---|
| `ashburn-collocated_multi_2026-03-03_2026-08-10.csv` | 2026-08-10 | `cdffc873ed1be17cb3571f15374905d78d03e5d3897119ed2b7eee0fae4a858e` |
| `belfort-park_multi_2026-03-03_2026-08-10.csv` | 2026-08-10 | `415914d26c2e085fb02a7b0b6c60e5d96e56890846c1e608ed5cd0ce167f0699` |
| `dulles-area_multi_2026-03-03_2026-08-10.csv` | 2026-08-10 | `72dfe6ca5d944f23b7e61e8fe096d926b6f1923a0a3b28d9e442fe79f07fbf35` |
| `farmwell-middle_multi_2026-03-03_2026-08-10.csv` | 2026-08-10 | `9374946d2a8b34bcb9341fd0972ab0ecd4555a151f85664c7cd7eddd512c7b30` |
| `golf-course_multi_2026-03-03_2026-08-10.csv` | 2026-08-10 | `ddf15993971c6a904b8bdbe4e61494b27a56d1bc3e4994863fa7cb51a48ce42a` |
| `sterling-ms_multi_2026-03-03_2026-08-10.csv` | 2026-08-10 | `cb06a9afc1a5244576419efb02d417ebebded465297f4589db6fda01446e715f` |

**Collocation.** Four regressions at the collocated site, OLS with the sensor on x, paired on
`ts_est`, excluded flags applied on both sides, every fit stopping at the 2026-08-07 07:00 EST
edition cutoff, exact zeros retained in APEX 5 NO2 only. Collocation periods are assigned by
`unit_id`, which is the configuration `getCollocation()` runs and the one GENARCH_RULES §9
reports.

| Regression | GENARCH_RULES §9 | Original inputs (2026-08-10) | Current freeze (2026-10-10) |
|---|---|---|---|
| APEX 14 PM2.5 | 1.299 + 0.831x, R² 0.725, n 697 | 1.299 + 0.831x, R² 0.725, n 697 | 1.299 + 0.831x, R² 0.725, n 697 |
| APEX 5 PM2.5 | −4.678 + 1.665x, R² 0.837, n 2,111 | −4.678 + 1.665x, R² 0.837, n 2,111 | −4.678 + 1.665x, R² 0.837, n 2,111 |
| APEX 14 NO2 | 2.186 + 1.075x, R² 0.497, n 589 | 2.186 + 1.075x, R² 0.497, n 589 | 2.186 + 1.075x, R² 0.497, n 589 |
| APEX 5 NO2 | 1.835 + 0.319x, R² 0.207, n 2,745 | 1.835 + 0.319x, R² 0.207, n 2,745 | **1.847 + 0.317x, R² 0.204, n 2,746** |

Three of the four reproduce §9 exactly from both input sets. **APEX 5 NO2 moves**, by +0.012 on
the intercept, −0.002 on the slope and −0.003 on R², on one added pair. Both remain inside
DEQ's published precision (1.8 + 0.32x, R² 0.21), and that regression is already recorded as
non-comparable rather than asserted.

The same four regressions under the date-window selection of `docs/COLLOCATION_METHOD.md`, for
the record, since CONTEXT R1 quotes those figures: APEX 14 PM2.5 1.293 + 0.832x, R² 0.725,
n 699; APEX 5 PM2.5 −4.681 + 1.665x, R² 0.837, n 2,109; APEX 14 NO2 2.196 + 1.065x, R² 0.491,
n 591; APEX 5 NO2 1.835 + 0.319x, R² 0.207, n 2,743 from the original inputs and
1.847 + 0.317x, R² 0.204, n 2,744 from the freeze. The two-hour difference between the
selections is the one §11 describes, and the backfill moves the APEX 5 NO2 fit under either.

**Daily reconciliation.** Input-invariant by construction: it compares the regulatory monitor's
recomputed daily means against DEQ's published `dailyAvg` file, and neither side reads a Kunak
export. Both runs give 118 of 119 comparable days, mean absolute difference 0.0017 µg/m³,
2026-03-03 to 2026-08-09, one mismatch (2026-03-10, recomputed 5.0 against a published 5.2,
23 valid hours). FOIA 26-4646 still ends 2026-08-10, so no Kunak refresh can move it.

**Changed timestamps.** Over the 51,441 readings the six August exports carry, compared on
(site, pollutant, hour-ending local timestamp): **0 values changed, 0 exclusion reasons changed,
0 readings disappeared.** The dashboard did not rewrite a published hour.

What it did instead is fill nine previously missing hours inside the August coverage range:

| Site | Hour added (local, hour-ending) |
|---|---|
| ashburn-collocated | 2026-04-21 08:00 |
| belfort-park | 2026-06-20 07:00 |
| farmwell-middle | 2026-07-10 06:00, 2026-07-30 05:00 |
| golf-course | 2026-04-27 06:00, 2026-05-14 02:00, 2026-06-28 05:00, 2026-06-28 06:00 |
| sterling-ms | 2026-07-09 14:00 |

Every one of the nine carries `0` on NO2, CO, VOCs and PM2.5 at once. Two consequences:

- The pipeline flags all of them `exact_zero_floor`, so they are invisible to every statistic
  except the one regression that readmits exact zeros. That is why APEX 5 NO2 is the only
  figure in this check that moved, on the single added hour at ashburn-collocated 2026-04-21
  08:00 (`ts_est` 2026-04-21 06:00), which pairs with a valid regulatory NO2 reading.
- GENARCH_RULES §4 records that no Kunak row has all three pollutants at zero, and reads the
  exact zeros as per-pollutant floor clamping rather than device outage. These nine rows do have
  every pollutant at zero. 2026-04-21 08:00 is also the hour §4 records as "a genuine one-hour
  gap". Both statements need revisiting; neither affects a published figure today.

### 1c. R2 window

**Provenance of the two counts.**

| Count | First appears | Commit | Code in repo |
|---|---|---|---|
| 126 of 131, MAD 0.0099 | `docs/GENARCH_RULES.md` §3 (truncation), §6 and §9 | `03d8016`, 2026-08-12T14:53:49−04:00, "Phase 2B/3/C: constraint lint, citation namespacing, DEQ data rules and provenance" | **None.** That commit adds no DEQ analysis code; `pipeline/reshape_deq.py` arrives the next day in `a175853`. `git log -S"126 of 131"` and `git log -S"0.0099"` both return only `03d8016`, and no `.py` file has ever contained either string. The figure was computed by unversioned ad-hoc code during the 2026-08-12 session |
| 118 of 119, MAD 0.0017 | `pipeline/sources/manifest.json` (`deq_pm25_daily.csv` limitations) | `a175853`, 2026-08-13T12:06:58−04:00, "DEQ reshape pipeline, ruff pin, lint fixes" | `pipeline/reshape_deq.py` `daily_pm25()` plus `reconcile()`, which the same commit adds. Restated in `README.md`, `CITATION.cff` and `docs/DATA_PROVENANCE.md` by `23ce0a8`, 2026-08-15T20:38:03−04:00 |

**Both counts recomputed from the frozen inputs** (`freeze-2026/AshburnPM2.5_030326_081026.xls`
and `freeze-2026/AshburnPM2.5_dailyAvg_030326_081026.xls`), under the corrected exclusion rule
of GENARCH_RULES §3, truncating to one decimal:

| | Comparable set | Result | MAD | Day range |
|---|---|---|---|---|
| 118 of 119 | published `dailyAvg` days that survive the null-code and `<` exclusions, intersected with recomputed days clearing 18 of 24 valid hours | **118 of 119** | **0.0017** | **2026-03-03 to 2026-08-09** |
| 126 of 131 | every published `dailyAvg` row carrying a numeric Value, exclusions **not** applied to the daily file, intersected with recomputed days having at least one valid hour, no completeness threshold | **126 of 131** | **0.0099** | **2026-03-03 to 2026-08-09** |

Both reproduce to the digit. The two counts share the same first and last day; what differs is
set membership, not the window.

- The 119-day set omits 2026-03-12 to 03-13, 2026-05-07 to 05-10, 2026-05-21 to 05-22,
  2026-06-04 to 06-05 and 2026-06-16 to 07-16 from the 160 calendar days in range.
- The 131-day set omits only 2026-05-08 to 05-09 and 2026-06-17 to 07-13.
- The 12 days in the 131-day set but not the 119-day set are 2026-03-12, 03-13, 05-07, 05-10,
  05-21, 05-22, 06-04, 06-05, 06-16, 07-14, 07-15 and 07-16. Ten of the twelve are days whose
  published value carries `<`, `P<`, `<>`, `P<>` or an `AS` null code and is therefore invalid
  under DEQ's own flag rule; the other two (07-15, 07-16) carry an `I`/`AS` published value
  while the hourly record for those days is complete and agrees exactly.
- The five mismatches behind 126 of 131 are 2026-03-10 (23 valid hours, −0.2), 2026-03-13 (14,
  +0.1 against a published value flagged `P<`), 2026-05-22 (17, −0.3, published `P<>`),
  2026-06-16 (10, +0.3) and 2026-07-14 (12, −0.4, published `IM>`/`AS`). This matches §9's
  description: four partial days plus one day at 23 hours differing by 0.2.

**Which count is the full overlap under the 18-of-24 rule: 118 of 119.** The frozen `dailyAvg`
file holds 161 rows for 2026-03-03 to 2026-08-10; 158 carry a numeric Value and 120 survive the
null-code and `<` exclusions that §3 requires before the file can be used as a reference.
Intersecting those 120 with the recomputed days clearing 18 of 24 drops 2026-06-16 (10 valid
hours) and leaves exactly 119. 126 of 131 is not an 18-of-24 overlap at all: it applies no
completeness threshold and reads the daily file unfiltered, which is the practice §3 rules out.

Two days clear 18 of 24 in the recomputation and are absent from the 119-day set only because
their published value is flagged invalid: 2026-07-15 and 2026-07-16. Counting those as
comparable gives 120 of 121 at the same MAD of 0.0017.

### 1d. Retired sites

The three sites whose Table 4 p98 reproduces only under standard-time binning (round-1 check b)
are the three whose PM2.5 record ended before the 2026-08-07 edition: `heritage-farm`,
`newberry-condo` and `steuart-weller`. They are not the three that went offline on 2026-09-17;
those are `farmwell-middle`, `golf-course` and `sterling-ms`, and both groups are reported here.
Day set A throughout (data through 2026-08-07 07:00 EST).

**Record-day counts and end dates are identical under the two day definitions**, so DEQ's Table 4
implies no end date different from ours at these three sites. The day boundary is the only thing
that moves.

| Site | Day definition | Record days | End date | p98 | DEQ Table 4 | Diff | Mean (ours / DEQ) | Median (ours / DEQ) |
|---|---|---:|---|---:|---:|---:|---|---|
| heritage-farm | standard | 82 | 2026-05-30 | 9.730 | 9.7 | +0.03 | 4.13 / 4.2 | 3.50 / 3.5 |
| heritage-farm | clock | 82 | 2026-05-30 | 9.341 | 9.7 | −0.36 | 4.13 / 4.2 | 3.60 / 3.5 |
| newberry-condo | standard | 66 | 2026-05-13 | 14.519 | 14.5 | +0.02 | 5.69 / 5.7 | 4.95 / 4.9 |
| newberry-condo | clock | 66 | 2026-05-13 | 14.252 | 14.5 | −0.25 | 5.68 / 5.7 | 4.84 / 4.9 |
| steuart-weller | standard | 100 | 2026-06-16 | 10.196 | 10.2 | −0.00 | 4.57 / 4.6 | 3.83 / 3.9 |
| steuart-weller | clock | 100 | 2026-06-16 | 10.355 | 10.2 | +0.16 | 4.57 / 4.6 | 4.05 / 3.9 |

**Does a different end date explain the standard-time-only match?** Each record was truncated at
every candidate last day in turn and the p98 recomputed under clock binning:

- `heritage-farm` would need to end 2026-04-24 (n 47, p98 9.724) instead of 2026-05-30 (n 82):
  36 days and 35 record-days earlier. DEQ's own report states this site ran to June 18 and the
  frozen data stop on 2026-05-30 for the documented particle-sensor air-flow failure.
- `newberry-condo` would need to end 2026-05-07 (n 60, p98 14.492) instead of 2026-05-13 (n 66).
  DEQ's report states the sensor moved to Belfort Park on May 14, so a May 7 end contradicts
  DEQ's own timeline.
- `steuart-weller` has **no** end date at which clock binning comes within 0.05 of DEQ: the
  closest point in the whole sweep is the true end date, at +0.16.

Means and medians agree with DEQ under both day definitions at all three sites, which is what a
record-length or end-date discrepancy would not look like. So: a different end date does not
explain it. **unexplained.**

For completeness, the three sites that went offline 2026-09-17 behave the other way round:
`golf-course` reproduces only under clock binning (121 days to 2026-08-06, 23.839 against 23.8;
standard gives 24.898), and `farmwell-middle` (119 days, 27.222 standard / 26.260 clock against
26.0) and `sterling-ms` (50 days, 39.363 standard / 41.572 clock against 40.4) reproduce under
neither on day set A. The `sterling-ms` value reproduces on day set B under clock binning only,
at n 51 (round-1 check b).

### 1e. Verbatim from DEQ's 2026-10-09 report

Source: `pipeline/sources/freeze-2026/deq_dcamp_weekly_2026-10-09.pdf`, with the text sidecar
`deq_dcamp_weekly_2026-10-09.txt` frozen beside it. Spellings, spacing and glyphs are DEQ's.

**Study-area title** (page 1, cover):

> Data Center Air Quality Analysis
> Virginia DEQ, Office of Air Quality Monitoring
> Loudoun County and Prince William County Study Area
> October 9, 2026

**Table 4 contents** (page 26, section 5, "PM2.5 24-Hour (Daily) Concentrations"):

> Table 4: PM2.5 24-Hour (Daily) Concentrations Statistical Summary
> Site mean standard_deviation median percentile_98
> Belfort Park Dr 8.2 9.0 6.3 23.6
> Broad Run HS 7.8 7.6 6.6 23.8
> Broad Run HS Regulatory Monitor 7.5 13.5 5.6 18.8
> Camp William B Snyder 4.0 2.0 3.6 8.1
> Dulles Airport 5.4 6.4 3.9 16.9
> Evergreen Country Club 3.0 1.6 2.7 6.3
> VDOT MKC 3.3 1.5 3.0 6.4

Seven rows. The three sensors that went offline on 2026-09-17 are not in it, and no row names a
single sensor as above any limit.

**No site above 35** (page 26, immediately below Table 4):

> As the above table illustrates, no site’s 98th percentile concentration of the daily PM2.5
> averages is above the 24-hr 98th percentile PM2.5 NAAQS limit of 35.0 μg/m3 .
> No sensors are above the 24-hr (daily) average PM2.5 NAAQS limit of 9.0 μg/m3 .
> Loudoun County sensors have higher 98th percentile values than the Prince William
> County sensors as the Prince William County sensors were not deployed during the
> Minnesotan and Canadian wildfires during the weekend of July 17, 2026.

The second sentence is the wording GENARCH_RULES §11 bars from adoption. Do not quote it on any
public page.

**County of the three 2026-09-17 sites** (page 3, section 2, "Sensor Timeline"; DEQ's PDF loses
some inter-word spaces, reproduced as extracted):

> • On September 17, 2026, data collection at 1757 Golf Course (sensor 13), Farmwell
> MS (sensor 10), and Sterling MS (sensor 6) ended as these sensors were moved
> fromLoudounCountytoPrinceWilliamCounty. APEX/Kunaksensor13wasmoved
> to the Virginia Department of Transportation (VDOT) Facility at Mason King Court
> (VDOTMKC).APEX/Kunaksensor10wasmovedtoCampWilliamBSynder(Camp
> Snyder) and APEX/Kunak sensor 6 was moved to Evergreen Country Club (ECC).

**First DEQ Table 4 to identify one sensor as the only one above 35: the report dated
2026-08-07.** That is the earliest edition the repo holds
(`docs/deq-reports/2026-08-07_data_center_air_quality_analysis.pdf`, archived also at
`freeze-2026/`), its cover reads "Loudoun County Study Area", and its Table 4 on page 24 is
followed by:

> As the above table and violin plot illustrates, only Sterling MS sensor’s 98th percentile
> concentration of the daily 𝑃𝑀2.5 averages is above the 24-hr 98th percentile 𝑃𝑀2.5
> NAAQS limit of 35.0
> 𝜇𝑔/𝑚3
> . The Sterling MS sensor and Belfort sensor are above the
> 24-hr(daily)average𝑃𝑀2.5NAAQSlimitof9.0𝜇𝑔/𝑚3
> . KeepinmindthattheNAAQS
> standards are based on 3 year averages, and so it cannot be said that these sensors are
> violating the NAAQS standards.

The 2026-08-14 and 2026-08-21 editions carry the same sentence; 2026-08-28 drops it. Whether an
edition before 2026-08-07 carried it cannot be checked from here: DEQ's published page serves
only the current edition, and the repo holds nothing earlier. Cite the date as the earliest
edition on record, not as DEQ's first report.

### Provenance added (Task 2)

Twelve entries added to `pipeline/sources/manifest.json` for
`deq-raw/<site>_multi_2026-03-03_2026-10-10.csv`, taking the field set the existing Kunak
entries use. All twelve files were added by one commit, author timestamp
**2026-10-11T13:47:03−04:00**, which is the `export_date` on each new entry, with
`export_date_source` "git add commit timestamp (upper bound)" and `download_date` the date part
of the same timestamp. No existing entry was altered. The twelve `export_date` values in
`data/reports/2026/FREEZE.json` were refreshed from the manifest; the frozen copies, their
hashes and `frozen_at_utc` are unchanged.

These exports differ from the August ones in one respect worth recording: they are UTF-8
**without** a BOM, where the 2026-08-10 and 2026-08-28 exports carry one. The `format` field
records this per entry.

Still open after Task 2: the manifest's six live `deq-raw/<site>_..._2026-08-28.csv` entries
still name paths that now sit under `_superseded/`, and the twelve `_2026-10-04` exports have no
entries either. Neither was in scope here.

## pipeline.report, DEQ half (2026-10-23)

Appended, not edited (D23). `python -m pipeline.report --year 2026 --freeze
data/reports/2026/FREEZE.json` now recomputes every DEQ finding the report states and emits
`numbers.json` (192 keys), T01-T07 with `tables.json`, and F01-F05 as SVG and 300-dpi PNG with
`figures.json`, all under `data/reports/2026/`. All 51 R1-R4 comparisons reproduce their CONTEXT
section 4 values; `--verify` prints the table. Outputs are byte-identical between runs.

**The atlas half is gated on Prompt A and is not in this run.** `inventory.*`, `chain.*`, T08 and
T09 are not emitted and carry no placeholder keys. `--add-atlas-inputs` refuses unless HEAD's
`data/graph/graph.json` has `metadata.generated_at` later than 2026-10-22 and passes
`scripts/check_mojibake.py`; it prints the reason and exits nonzero without writing. At this
commit both conditions fail: `generated_at` is 2026-03-07 and the file carries 25 mojibake hits.
`docs/GENARCH_RULES.md` section 7 records a clean rebuild at 72 nodes and 211 edges against the
committed 97 and 165, so the inventory counts cannot be frozen until that rebuild lands.

Site codes DC-01 to DC-12 were assigned in `pipeline/sources/deq_sensor_site_history.csv` row
order and recorded in `pipeline/lookups/site_codes.json` (D7), which the site is to consume
rather than re-deriving. No DC-xx convention existed before this commit.

`site/src/content/deq-limitation.json` is now the single source of truth for the CONTEXT section
3 limitation, its pairing sentence and the credit line; it is sliced out of CONTEXT.md and
asserted byte-for-byte by a test. It differs from `DEQ_REPORT_LIMITATION` in
`site/src/content/deq-attribution.ts`, which quotes the PDF wording; both are correct as
transcribed and neither was altered.

Gate results at this commit: constraint lint 52 violations, 52 baselined, 3 exempted, 0 new,
in-scope 0, exit 0. `check_mojibake.py` 272 hits in 32 files, exit 1, unchanged from the
2026-10-18 measurement, with 0 hits in any file added here. `ruff check pipeline/` passes.
`python -m pipeline validate` passes. 69 tests pass.

The exemption added for `site/src/content/deq-limitation.json` `$.pairing` is currently **inert**:
`scripts/check-constraints.mjs` scans `site/src` for `.tsx`, `.ts` and `.mdx` only, and `.json`
only under `data/`. It records the reviewed decision and becomes live if the constant moves under
`data/` or the scan list grows. The 3 exemptions the lint reports are the pre-existing causal
carve-outs on `alzheimers-disease.json`, `ischemic-stroke.json` and `graph.json`.
