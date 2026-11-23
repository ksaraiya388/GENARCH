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

## Encoding repair (2026-10-24)

Appended, not edited, per D23.

2026-10-24: data/graph/graph.json (generated 2026-03-07) is not reproducible from the current pipeline. A clean rebuild yields 72 nodes / 211 edges with 38 orphan-endpoint edges across 35 gene ids lacking gene records (including il1rl1), and validate rule 4 fails; the committed graph carries 27 gene nodes no code produces. Encoding repaired in place; structure unchanged at 97 nodes / 165 edges.

2026-10-24: moj.txt and four outputs/repro captures untracked. They quote corrupted text, and moj.txt was itself mangled by a cp437 console redirect when written. They remain on local disk; AUDIT's Task 2 table is the record. tabulate_moj.py can no longer run from the repo.

2026-10-24: after the in-place encoding repair, data/graph/graph.json holds 97 nodes and 165 edges; metadata.generated_at is 2026-03-07, metadata.node_count 97, metadata.edge_count 165, unchanged from before the repair. 27 of 4,536 lines changed; 4,509 are byte-identical.

Census correction: data/graph/graph.json carried 232 corrupted characters in 11 sequences across 27 lines (87 substitutions), not 83 in 8 across 26 as REPORT.md F3 recorded; F3 missed \u00e2\u2030\u00a5, \u00e2\u2030\u00a4 and \u00e2\u2020\u2019. Corruption entered at 0cd2031 (2026-04-03); the last clean version is d1ea029 (2026-03-07). Each repaired string matches both the d1ea029 text and its cp1252 round-trip. The stray CRLF from the BOM writer is on the last line of 17 files, not the first line of 26; all line endings were left untouched. graph.json gains no encoding_repair field (GraphSchema forbids extra keys). The checker pattern \u00e2\u20ac was generalized so that \u00e2\u2030\u00a4, \u00e2\u2030\u00a5 and \u00e2\u2020\u2019 are flagged.

2026-10-25: CI checks job failed on SHA-256 mismatches. core.autocrlf=true had stored LF-normalized copies of 59 hash-pinned raw files, whose recorded hashes matched the authentic working-tree bytes (42 of 59 mix CRLF and LF). Fixed by -text on pipeline/sources/** and a renormalize of 111 files; no hash, number, table or figure changed. Four writers (report.py, graph_builder.write_graph, fetch_geo, emit.py) now force LF. CI run 40156069808 passed both jobs; the reproducibility step was identical for all ten files. Runner pinned to ubuntu-24.04 and packages pinned on 2026-10-25.

## Authorship rewrite (2026-10-25)

Appended, not edited, per D23.

2026-10-25: all 95 commits on all seven branches were rewritten so that author and committer
are Kiaan Saraiya <kiaansaraiya@gmail.com>, and every `Co-Authored-By` trailer was removed (74
trailer lines in all: one naming Claude Opus 4.6 on the 2026-04-03 Passport-removal commit, the
rest naming Kiaan Saraiya, ksaraiya388 or the Vercel app). Author and commit dates are
unchanged. Every branch's tree is byte-identical to its pre-rewrite tree and every commit count
is unchanged: main 66, report-2026 72, feat/brief2-and-figures 38, and the four stale
pull-request branches 16, 16, 10 and 21. No file content, hash, number, table or figure changed.

Every SHA therefore changed. The SHAs this repository cites, old to new:

| Cited in | Old | New | Commit |
|---|---|---|---|
| `docs/GENARCH_RULES.md` section 3 (updated in place) | `03d8016` | `8885a56` | Phase 2B/3/C, 2026-08-12 |
| `AUDIT.md` lines 655, 656 | `03d8016` | `8885a56` | Phase 2B/3/C, 2026-08-12 |
| `AUDIT.md` lines 655, 656 | `a175853` | `0eb6003` | DEQ reshape pipeline, 2026-08-13 |
| `AUDIT.md` line 656 | `23ce0a8` | `21f27ca` | Public repo: README, licenses, 2026-08-15 |
| `AUDIT.md` lines 117, 514 | `25d35b7` | `81fb1df` | brief #5 T2D, 2026-10-06 |
| `AUDIT.md` lines 3, 342 | `c2101b3` | `782c1dc` | deq weekly ingest 2026-10-10 |
| `AUDIT.md` line 874 | `0cd2031` | `51fb4ce` | Remove Passport, 2026-04-03 |
| `AUDIT.md` line 874 | `d1ea029` | `ea40033` | GENARCH launch, 2026-03-07 |
| `REPORT.md` lines 318, 1443 (annotated in place) | `1178e1a` | `14622fe` | community last_updated, 2026-07-22 |

`AUDIT.md`'s own citations are left as written, per D23; this table is the resolution. The two
live documents that must resolve on their own, `docs/GENARCH_RULES.md` and `REPORT.md`, carry
the new SHA beside the old one.

`data/reports/2026/FREEZE.json` `git_head` and the `freeze.commit` key in `numbers.json` still
read `c2101b3d766dcaa29821448c8929ded5a1f2787f`. Both are left as they are. The field records
what HEAD was when the freeze was taken on 2026-10-18, which is what it says it records and
what was true that day; the rewrite came a week later. Editing it would change the bytes of a
frozen artifact and of a generated report output that CI gates on byte-identity, to chase a
renaming that moved no data. The tree the freeze attests to, and all 29 input hashes, are
unchanged.

The pre-rewrite objects remain reachable on GitHub by full SHA until they are garbage
collected, so the Claude trailer on `0cd2031` may still be served at its own commit URL. A
GitHub Support request is the only way to purge it; Kiaan is opening one. A local bundle of all
pre-rewrite refs was taken before the rewrite and is not in the repository.

2026-10-26: the four stale pull-request branches named in the 2026-10-25 entry above are
deleted from the remote, so the repository now carries three branches: `main`,
`report-2026` and `feat/brief2-and-figures`. The force push of 2026-10-25 re-triggered each
stale branch's own obsolete workflow, dormant since February and March, and
`cursor/genarch-initial-build-6a1a` failed on three `I001` import-order findings in
`pipeline/models.py`, `pipeline/paths.py` and `pipeline/validate.py`, files that left the tree
months ago. That branch's workflow installs ruff unpinned, so it drew ruff 0.17.2, which enables
`I001` by default where the ruff of February did not. The branch tree hashed `a729936` both
before and after the authorship rewrite, so no content of it changed and the failure was
pre-existing drift, not a consequence of the rewrite. All four branches were merged or closed
pull requests (PR 1, 2 and 4 merged, PR 3 closed), their heads are archived in a local bundle
outside the repository, and `main` and `report-2026` passed on the current workflow at
`782c1dc` and `2e2de4f`. `feat/brief2-and-figures` is fully contained in `main` and its own
workflow triggers only on `main` and `cursor/*`, so it runs no CI and carries no failure.

2026-11-02: `potential_therapeutic_target` renders nowhere. The `Therapeutic target` badge in
`site/src/app/atlas/pathways/[slug]/page.tsx` was the field's only reader and was removed under
CONTEXT.md C5, which bans clinical language on a label. The field stays in `pipeline/schemas.py`,
in `site/src/lib/types.ts` and in all four `data/pathways/*.json` records with its values
unchanged; a field rename or removal is deferred to the schema pass. Verified by grep over the
built export: `Therapeutic target` appears on no served page.

2026-11-02: drug-class terms (anti-*, inhibitor) are not in the C5 lexicon; every
`pathway_role`/`role_in_pathway` label using one was rewritten in this commit. Lexicon
extension deferred to the schema pass.

## DEQ wording source, atlas freeze, figure contrast (2026-11-02)

Appended, not edited, per D23.

2026-11-02: CONTEXT §3 previously held an edited version of DEQ staff email text (added
prefix; removed "(CFR)" and "(NAAQS)"). Replaced with DEQ's published report wording,
DEQ_REPORT_LIMITATION, cited to the 2026-10-09 report, p. 2.

2026-11-02: the quotation was located in both frozen DEQ reports before the citation was
written. `DEQ_REPORT_LIMITATION` occurs on p. 4 of
`pipeline/sources/freeze-2026/2026-08-07_data_center_air_quality_analysis.pdf` (25 pages) and on
p. 2 of `pipeline/sources/freeze-2026/deq_dcamp_weekly_2026-10-09.pdf` (28 pages); in both the
printed folio equals the PDF page index. The match holds under the D24 rule and only under it:
pdfplumber's extraction splits "pollutant" as `pol-` + line break + `lutant` in both files, so a
whitespace-only comparison misses it. The citation names the more recent of the two.
`scripts/gen_deq_limitation.py` re-runs that check on every generation and writes nothing if it
fails. `site/src/content/deq-limitation.json` is now generated from
`site/src/content/deq-attribution.ts` rather than from CONTEXT, and the byte-equality test
compares the two; the pairing sentence and the credit line are GENARCH's own wording and stay
sliced out of CONTEXT §3, unchanged. The file created in 118fd51 from the email-supplied text is
replaced. Its `attribution` key, which held `(Virginia DEQ)`, is now `citation` and holds the
report date and page.

2026-11-02: the `site/src/content/deq-limitation.json` `$.pairing` exemption in
`docs/constraint-exemptions.json` was re-checked after D29 and is still documentary. Two
independent reasons: `scripts/check-constraints.mjs` `SCAN` reads `site/src` for `.tsx`, `.ts`
and `.mdx` only and reads `.json` only under `data/`, so the file is outside the scan scope; and
`pairing` is not in `JSON_DISPLAY_KEYS`, which D29 extended with `pathway_role`,
`role_in_pathway` and `replication_status` but not with this key. The entry is kept with a
`status` of "documentary; not exercised" and a note saying so.

2026-11-02: the `--add-atlas-inputs` gate was rewritten to require all three of: HEAD contains
the Prompt A commit `03763e8` (`git merge-base --is-ancestor`); `data/graph/graph.json` passes
`scripts/check_mojibake.py`; and AUDIT.md carries the 2026-10-24 graph reproducibility entry
(D25). The `metadata.generated_at` later than 2026-10-22 condition is removed. It could not be
satisfied while D25 stands: D25 keeps the published graph at its 2026-03-07 build and repairs it
in place rather than regenerating it, so the old gate waited on a rebuild that was ruled out.
All three conditions hold at this commit and the atlas freeze was taken.

**Atlas freeze date: 2026-11-02.** 88 records pinned across 8 modules: diseases 19, exposures 15, genes 26, pathways 12, mechanism briefs 10, community regions 2, ancestry modules 3, knowledge graph 1. Knowledge
graph 97 nodes / 165 edges, matching
`metadata.node_count` and `metadata.edge_count`, `metadata.generated_at` 2026-03-07. T08 carries
the graph's status as "live; not reproducible from current pipeline (D25)"; every other module
reads "live; emitted by the current pipeline". The counts are read from the pinned records and
from the committed `data/graph/graph.json`, never asserted, and a test re-reads both. Every
inventory count carries the atlas freeze date, in the `window` field of each key and in a column
of T08.

Atlas records are pinned where they live rather than copied under `freeze-2026/` the way D28
copies the three configuration inputs. The atlas half of the report is a snapshot of the
committed atlas, so an edit after the freeze has to fail the run rather than be absorbed;
retaking the freeze is the remedy. `verify_all` now checks 117 inputs, 29 DEQ plus 88 atlas.
If atlas editing resumes before the report ships, the D28 remedy -- frozen copies with
`frozen_path` beside the live path -- applies here unchanged.

`inventory.*` and `chain.*` keys are emitted into `data/reports/2026/inventory.json` and
`data/reports/2026/chain.json`, not into `numbers.json`, and T08 and T09 are manifested in those
two files, not in `tables.json`. `numbers.json`, `tables.json` and T01-T07 are byte-identical
across this prompt, which is what CI gates on. The CI reproducibility step now compares
`inventory.json` and `chain.json` as well.

T09 reports the five links of the published `il33-pm25-chain` figure with the evidence class on
each. Two classes are read from atlas records (`data/genes/il33.json`
`linked_exposures[air-pollution].evidence_type` = literature, `linked_diseases[asthma]` = GWAS);
three are assigned by the figure definition in `site/src/lib/figure-data.ts` (functional,
functional, inferred) and the table marks them as not read from a record, so a reader does not
take every class for a record value. One link is inferred. Confidence high and direction amplify
come from the `air-pollution` exposure modifier on `data/diseases/asthma.json`. No brief title
and no entity prose is quoted in either atlas artifact: AUDIT item 16 holds that quoting brief
titles in the module inventory needs a ruling, and the D8 rewrites are not approved, so the
inventory counts the briefs and names none. A test asserts it.

2026-11-02: the `chrome` colour role is removed from `pipeline/report_lib/palette.py` and from
the contrast test, and no role is exempt from the contrast floors any more. The role held the
F04 35 microgram reference line and the F01 washes at `cool.mid`, 2.56:1 on white, on the
grounds that a reference line marks the level of a standard rather than a category. That was
wrong for F04, where six plotted percentiles are read against the line, which makes it a mark a
value is read off. The reference line and the F04 per-site connectors now use `cool.dark`
(`#64748B`, Tailwind slate-500, 4.76:1 on white), as does the F03 1:1 line; the F04 text label
stays in `navy.deep` at 16.78:1. The F01 washes keep their light fill, because neither carries a
value, and each gained a `cool.dark` outline at 4.76:1 and the smoke window gained a text label
inside the axes (GENARCH_RULES.md §6). `palette.data_marks()` is now the list the contrast test
reads, so a new mark is covered by being added to it.

Figures F01, F03 and F04 were regenerated. F02 and F05 never used the role and their bytes are
unchanged. `figures.json` changed in exactly five keys, the `limitation` field of each of the
five entries, and in nothing else: no key was added or removed and no other value moved.

2026-11-03: step 0 of the ancestry-composition module, the method comparison between the
report's planned T10 and the GWAS ancestry shares already on `/ancestry-equity`. Recorded before
any computation, because the answer changes what the module may emit.

The page's source and computation. `site/src/app/ancestry-equity/page.tsx` renders two
independent GWAS-share displays, neither of which reads the GWAS Catalog.

1. The `gwas-ancestry-imbalance` BarRows, built by `buildGwasAncestry()` in
   `site/src/lib/figure-data.ts`, read `pipeline/sources/gwas_ancestry_breakdown.csv`: a
   four-row hand-transcribed CSV of published summary percentages. The computation is a filter
   on `as_of` against `SNAPSHOT_AS_OF` in `site/src/lib/figures.ts`, pinned to `2024-09`, then a
   sort by percentage descending. No arithmetic is performed on any participant count. The
   `2024-09` rows are the GWAS Diversity Monitor live dashboard (Mills and Rahal, Nat Genet
   2020) and itemise only European 94.48 and Asian 3.96, so the remainder is unplotted. The
   manifest entry for that CSV records the download date as 2026-07-13 and the narrowing that
   dropped the world-population comparison bar.
2. A separate cited table of five groups from Fatumo et al. 2022, read out of
   `pipeline/sources/cross_ancestry/literature.json` by `claim_id`, deliberately not merged into
   the chart because the dashboard's "Asian" is not South Asian-specific.

The method the module was asked for. Initial-stage discovery individuals by broad ancestral
category, computed from the GWAS Catalog ancestries file over the studies whose
`MAPPED_TRAIT_URI` matches asthma, counted and shared, with multi-ancestry rows split on the
catalog's delimiter.

The two differ in four ways, and none of them is a difference in rounding or snapshot date:
trait scope (asthma-specific against all traits in the catalog), stage (initial-stage discovery
samples only against every participant the monitor counts), provenance (recomputed from the
pinned release against transcribed from a third-party dashboard), and the category framework
(the catalog's broad ancestral category against the monitor's groups, which itemise two
categories and leave the remainder unplotted). The quantities are therefore not the same
quantity measured two ways; they are two different quantities. "86.5 percent European in 2023"
and "94.48 percent European in 2024-09" already sit in the same CSV against different
denominators, which is why `SNAPSHOT_AS_OF` exists.

That distinction is the whole substance of the step 0 instruction, and it does not discharge it:
a reader who sees an asthma discovery-sample European share in the report and an all-trait
participant European share on the page has no way to tell from either surface that the two
denominators differ, so the shares read as a contradiction whether or not they are one. The
resolution owed is a single method for the one quantity both surfaces can state, with the
all-trait dashboard figure either relabelled so its denominator is unmistakable on the page or
replaced by the recomputed asthma figure. That ruling is not taken here.

Status: unfinished. No number was computed, no key emitted and no file changed under `data/` or
`pipeline/` in this entry. The GWAS Catalog release is identified: the FTP `latest` directory
resolves to `releases/2026/11`, dated 2026-11-02, holding
`gwas-catalog-associations_ontology-annotated-full.zip` and
`gwas-catalog-download-ancestries-v1.0.3.1.tsv`. Neither is downloaded into
`pipeline/sources/gwas-catalog/`, neither is in `manifest.json` or `FREEZE.json`, and the two
partial copies taken in this session live only in a scratch directory and are not to be pinned:
the ancestries transfer broke off at 27.8 MB of a stated 51 MB. The pipeline holds no earlier
GWAS Catalog release for asthma to compare release dates against; `gwas_ancestry_breakdown.csv`
cites the catalog through two intermediaries and pins no release.

Also unresolved, and logged because it is a repository decision rather than a computation: the
two files are about 120 MB together, against 84 MB for all of `pipeline/sources/` today, and the
associations file is a zip that git cannot pack down. Pinning both by SHA-256 in `FREEZE.json`
is what D26 reproducibility requires, but committing them doubles the clone every CI run pays
for. Whether to commit both in full, or to commit an asthma-filtered extract beside the
SHA-256 of the full download it came from, needs Kiaan's ruling.

2026-11-03: the ancestry-composition module's two review artefacts, generated by scripts/audit_append_ancestry.py from numbers.json and the extract manifest. No figure below is typed by hand.

Distinct MAPPED_TRAIT values matched by the 23 asthma ontology IDs, GWAS Catalog release 2026-11-02. Selection is by the last path segment of each IRI in MAPPED_TRAIT_URI; no trait name is matched as free text, so the names below are the output of the selection and never an input to it. 4156 of 1205644 association rows were kept, across 172 study accessions.

| MAPPED_TRAIT | Association rows |
|---|---|
| asthma | 2238 |
| childhood onset asthma | 491 |
| atopic asthma | 199 |
| asthma, response to diisocyanate | 180 |
| adult onset asthma | 160 |
| asthma, cardiovascular disorder | 145 |
| asthma, endometriosis | 127 |
| chronic rhinosinusitis, asthma | 96 |
| asthma, Eczematoid dermatitis, allergic rhinitis | 85 |
| asthma, allergic disease | 71 |
| asthma, age at onset | 65 |
| chronic obstructive pulmonary disease, asthma | 31 |
| gastroesophageal reflux disease, asthma | 22 |
| asthma, seasonal allergic rhinitis | 21 |
| T2-high asthma | 18 |
| asthma, diverticular disease | 18 |
| asthma, irritable bowel syndrome | 17 |
| drug use measurement, asthma | 15 |
| asthma, body mass index | 12 |
| Chronic Obstructive Asthma | 10 |
| asthma, major depressive disorder | 10 |
| asthma, family history | 9 |
| B-cell acute lymphoblastic leukemia, adult onset asthma | 8 |
| BMI-adjusted waist-hip ratio, asthma | 8 |
| adult onset asthma, body mass index | 8 |
| attention deficit-hyperactivity disorder, asthma | 7 |
| childhood onset asthma, atopic march, atopic eczema | 7 |
| BMI-adjusted waist-hip ratio, adult onset asthma | 6 |
| adult onset asthma, type 2 diabetes mellitus | 6 |
| asthma, polyp of colon | 6 |
| asthma, sex interaction measurement | 6 |
| asthma, traffic air pollution measurement | 5 |
| asthma, type 2 diabetes mellitus | 5 |
| asthma, Eczematoid dermatitis | 4 |
| asthma, Latin or Admixed American ancestry | 4 |
| asthma, Townsend deprivation index | 4 |
| asthma, neuroticism measurement | 4 |
| childhood onset asthma, age at onset, environmental tobacco smoke exposure measurement | 4 |
| asthma, age at diagnosis | 3 |
| asthma, alcohol exposure measurement | 3 |
| asthma, insomnia | 3 |
| asthma, metabolic rate measurement | 3 |
| asthma, peptic ulcer disease | 3 |
| asthma, COVID-19 | 2 |
| asthma, response to corticosteroid | 2 |
| childhood onset asthma, age at onset | 2 |
| asthma, anxiety disorder | 1 |
| asthma, blood glucose amount | 1 |
| blood glucose amount, adult onset asthma | 1 |

| Ontology ID | Association rows |
|---|---|
| MONDO_0004979 | 3236 |
| MONDO_0005405 | 504 |
| EFO_0010638 | 199 |
| EFO_1002011 | 189 |
| MONDO_0956975 | 18 |
| EFO_0009759 | 10 |

17 of the term IDs matched no association in this release and are listed so the set stays reviewable rather than looking complete: EFO_0000270, MONDO_0001491, MONDO_0004765, MONDO_0004766, MONDO_0004784, MONDO_0022742, MONDO_0025556, MONDO_0850282, MONDO_0850283, MONDO_0850284, MONDO_0850285, MONDO_0850286, MONDO_0850287, MONDO_0956971, MONDO_0956976, MONDO_0956977, MONDO_0956979. An ID matching nothing is kept in the lookup: it is a term the ontology places under asthma, and its absence here is a fact about this release's curation, not a reason to narrow the selection.

Method comparison between the live page and the report, owed by the step 0 entry of 2026-11-03 above. The page value is the GWAS Diversity Monitor transcription in pipeline/sources/gwas_ancestry_breakdown.csv, as_of 2024-09, which site/src/lib/figures.ts pins through SNAPSHOT_AS_OF. The catalog value is recomputed here from GWAS Catalog release 2026-11-02 over asthma studies only, counting initial-stage discovery individuals.

| Category as the page shows it | Page value (percent) | Catalog-derived (percent) | Difference (percentage points) | What the catalog value sums |
|---|---|---|---|---|
| Asian | 3.96 | 7.51 | 3.55 | the sum of the catalog's five Asian categories (East, South, South East, Central, Asian unspecified), because the dashboard publishes one undivided Asian bar and the catalog publishes no such category |
| European | 94.48 | 88.61 | -5.87 | the catalog's single European category |

The difference on each row is not an error in either figure. The two quantities have different denominators: the page counts participants in every GWAS of every trait as a third-party dashboard tallied them in 2024-09, and the report counts individuals in the initial-stage discovery samples of asthma studies in one dated catalog release. A row's difference measures the distance between those two definitions and nothing else. Neither value can be substituted for the other, and the report states this wherever it gives a share (numbers.json key ancestry.method_divergence, repeated in the T10 caption).

Resolution, and what is still open. The report and the page now have one method each for one clearly labelled quantity, and the report names the page's source and denominator wherever it states its own share, so the two cannot be read as two values of a single quantity. /ancestry-equity is unchanged, per the ruling on this work: it reads the 2023 ACS file and the dashboard transcription, and rewriting a public page's sourcing was not in scope here. What stays open is the page side: the all-trait dashboard bars carry no denominator on the page itself, so a reader who sees only the page still cannot tell what population the share describes. Relabelling those bars, or replacing them with the recomputed asthma figure, is the remaining work and is not done.

ACS release divergence, open item. The report's T12 and the F06 ACS panel read the 2024 ACS 5-year release, retrieved for this module into pipeline/sources/cross_ancestry/acs_loudoun_2024_*.json. The live page /ancestry-equity reads the 2023 release in pipeline/sources/cross_ancestry/acs_loudoun_2023.json and is unchanged, so the report and the page state county counts from two different vintages. Nothing is wrong with either number on its own terms and both name their vintage, but a reader comparing the two surfaces will find different totals for the same county. Moving the page to the newer release, or stating the vintage more prominently on it, is open.

## Report source, routes and PDF build (2026-11-04)

Prompt 3. The report body, the three routes, the Playwright PDF build and its Python
post-processor. What follows is what this round measured or changed that was not already
recorded, including four findings that correct or qualify earlier entries in this file.

### Keys added to numbers.json

Twelve, with every pre-existing entry unchanged value for value and `tables.json` and
T01-T12 unchanged by the addition (DECISIONS.md D32). Report prose types no number, so a
figure the prose has to state and the registry does not carry is a missing key rather than
a licence to type it.

| Key | Value | Why it did not exist |
|---|---|---|
| `naaqs.annual_standard` | 9.0 µg/m³ | the standards are the regulation, not a measurement, so nothing computed them |
| `naaqs.daily_standard` | 35 µg/m³ | as above |
| `naaqs.percentile` | 98 | as above |
| `naaqs.averaging_years` | 3 | as above |
| `colloc.tolerance_coefficient` | 0.05 | the tolerance lived only in `site/src/lib/deq-data.ts` and in prose in GENARCH_RULES section 9 |
| `colloc.tolerance_r2` | 0.03 | as above |
| `p98.common_clock.rise_min` | 2.069 µg/m³ | the clock-binning rise was never emitted as a key |
| `p98.common_clock.rise_max` | 2.514 µg/m³ | as above |
| `colloc.apex-05_NO2.backfill_gx_intercept` | 1.847 ppb | D16 recorded the backfill figures in prose; nothing recomputed them |
| `colloc.apex-05_NO2.backfill_gx_slope` | 0.317 ppb | as above |
| `colloc.apex-05_NO2.backfill_gx_r2` | 0.204 | as above |
| `colloc.apex-05_NO2.backfill_n_pairs` | 2,746 paired hours | as above |
| `p98.reproduction_tolerance` | 0.05 µg/m³ | Task 5b's within-0.05 margin was a convention in this file only |
| `ancestry.discovery.multi_trait_rows` | 1,040 association rows | the count existed only in `extract_manifest.json` |
| `ancestry.discovery.association_rows_kept` | 4,156 association rows | the denominator for the above |
| `ancestry.trait_terms_matching_no_association` | 17 ontology IDs | recorded in this file; not emitted |
| `ancestry.loci.count` | 5 loci | derivable but not stated |

The D16 backfill figures reproduce D16 exactly, recomputed over the freeze inputs rather
than transcribed from the decision: 1.847 + 0.317x, R-squared 0.204, n 2,746, against the
reported 1.835 + 0.319x, R-squared 0.207, n 2,745. One paired hour more, which is the whole
of the effect, and the other three regressions do not move. The multi-trait count is
recomputed from `asthma_associations_2026-11-02.tsv` by counting kept rows whose
`MAPPED_TRAIT_URI` names a segment outside the asthma term set; it equals the manifest's
`rows_also_mapped_to_another_trait`, and a test asserts both.

### Correction: the clock-binning rise in CONTEXT section 4 R3

CONTEXT.md R3 states that clock binning "raises every site by 1.3 to 2.6 µg/m³ and reorders
nothing", from the August 2026 analysis. Recomputed at the freeze, on the common window, the
rise is **2.069 to 2.514 µg/m³**. Per-site: DC-01 +2.069, DC-02 +2.283, DC-04 +2.500,
DC-06 +2.227, DC-08 +2.514, DC-09 +2.497. The direction and the ordering half of the claim
both hold -- every site rises and the ranking is identical under both definitions, which a
test now asserts -- and only the range differs. CONTEXT section 4 says the report uses values
recomputed by `pipeline.report` at the freeze, so the report states the recomputed range
through the two new keys and does not repeat the August one. No finding changes. CONTEXT.md
R3's range is superseded for report purposes and is left as written, being the August figure
it records.

### Correction: "carry no denominator on the page itself"

The entry of 2026-11-03 says the all-trait dashboard bars on `/ancestry-equity` "carry no
denominator on the page itself". The page does print one: `site/src/app/ancestry-equity/page.tsx`
renders `Denominator: {gwas.denominatorNote}`, which resolves to "GWAS Diversity Monitor live
dashboard, September 2024". What it names is the source and the date, not the population, so
a reader still cannot tell from the page that the share covers every trait in the catalog.
The substance of the earlier finding stands and the wording does not. Report section 6
describes the page as stating an all-trait share transcribed from the dashboard at its
September 2024 snapshot, and says the two measure different things with different
denominators; it does not claim the page is unlabelled, and it does not present the
difference as a correction.

### Tension: AUDIT item 16 against commit b6ae4fc

Line 1015 of this file, dated 2026-11-02, says "the D8 rewrites are not approved", and
`b6ae4fc` of the same day says they were approved on 2026-11-02 and applies all eleven.
Both are in the record and they cannot both be current. Read as: the rewrites are applied,
and item 16's separate question -- whether a brief title may be quoted in the module
inventory -- is still open, which is why T08's caption still states that it names no brief
and why the test asserting that still passes. The report quotes a brief title in exactly one
place, the mechanistic-context subsection, and quotes the post-rewrite title. No
pre-rewrite title appears anywhere in the report.

### Flagged, not changed: CITATION.cff states a count of matching regressions

`CITATION.cff`'s abstract reads "Three of DEQ's four published collocation regressions
reproduce within 0.05 on coefficients and 0.03 on R-squared". GENARCH_RULES section 9 bars
describing the four as a count of how many match, and requires describing them as two closed
windows whose published values cannot drift and two open windows that refit weekly. The
report follows section 9 and does not state the count; `colloc.match_count` and
`colloc.near_count` exist in `numbers.json` for the internal tables and are not rendered in
prose. The abstract is citation metadata and an authorial statement, so it is reported here
rather than rewritten. It needs Kiaan's ruling.

The ORCID was added to `CITATION.cff` in this round, which completes AUDIT item 22: the field
was absent rather than carrying a literal placeholder, and the identifier is the one CONTEXT
section 8 records and the report cover prints.

### Integer display formatting

Four display strings rendered a count as a float, because the registry stores a value rounded
to precision 0 as a JSON number and an f-string prints `12.0`. Fixed by a `display()` method
on the registry that formats to the recorded precision, used by every caption and alt text;
the site's `<N>` applies the same rule to the same field, so a number reads identically in a
figure and in the sentence beside it.

| Artifact | Was | Now |
|---|---|---|
| `figures.json` `F01_network_timeline.alt_text` | "a timeline of 12.0 sensor sites" | "12 sensor sites" |
| `figures.json` `F03_daily_reconciliation.alt_text` | "119.0 comparable days", "118.0 sit on the one-to-one line" | "119", "118" |
| `figures.json` `F04_p98_by_site.alt_text` | "5.0 of six sites sit above" | "5 of six sites" |
| `T10_gwas_ancestry_composition.csv` | "43766190.0" and eight more | "43766190" |

The genuine halves in T10 are kept: a row naming k broad ancestral categories contributes an
equal 1/k share, so 3604425.5 and 16100.5 are correct as printed. A sweep of every caption,
alt text, `method` string and CSV cell for the pattern found no other case. What it did find,
and left alone, is every one-decimal measurement: DEQ truncates its published values to one
decimal, so "5.0" in the reconciliation table, "26.0" in the Table 4 column and the 9.0
annual standard are correct. The test is scoped by unit to counts for that reason. No figure
image changed: all twelve SVG and PNG files are byte-identical across the fix, and
`numbers.json` values and every other table are unchanged.

### Post-freeze note carried into the report

The APEX 5 collocation window at DC-01 closed 2026-10-22, per DEQ's 2026-10-30 edition, after
the 2026-10-18 freeze. Report section 5.2 states this once, as a post-freeze note, and no R1
value or framing changes. GENARCH_RULES section 9's amendment of 2026-10-31 already records
it on the rules side.

### Page budget

The first draft ran to 105 pages against a 16-page budget for the main body, from two causes.
The screen stylesheet sizes every margin and gap in `rem`, which does not shrink when the
print rule drops the body to 10.5pt, so a Letter page was carrying about 1,200 characters
instead of roughly 3,000; print metrics are now restated in points. And every table was
rendered two or three times, inline beside the prose, again inside its figure's data-table
disclosure, and a third time in Appendix B. The disclosure is the copy that stays, being the
figure's accessibility fallback and already adjacent to the discussion. Appendix B now carries
only the two tables the body does not show, and Appendix A points at `FREEZE.json` for the
full hashes rather than reprinting the column. Measured page counts for the rebuilt draft are
recorded with the draft.

Wide tables were also losing their right-hand columns: `overflow-x: auto` scrolls on screen
and clips on paper, so the collocation table's status column was absent from the first draft
entirely. Print now uses a fixed table layout with wrapping inside cells, and a test probes a
cell of every figure's data table in the extracted PDF text so a silently clipped table fails
rather than shipping.

## Weekly DEQ ingest, edition 2026-11-06, export 2026-11-08 (2026-11-08)

2026-11-08: Broad Run HS (collocation site) closed 2026-11-04 per DEQ 2026-11-06 §2; Discovery ES deployed 2026-11-04. Post-freeze; the 2026 report is unaffected. Candidate §8 roadmap note.

2026-11-08: the 2026-11-08 Kunak export carries two different readings labelled
"Nov 1, 2026, 01:00:00", the repeated hour at the fall-back change, at the seven sites
transmitting that night, and no offset column to tell them apart. Continuity check, run
before any handling rule was adopted: for each ordering of the two rows, the sum of |Δ| over
PM2.5, NO2 and CO across the sequence 00:00 → 01:00 → 01:00 → 02:00 local. "File order"
places the row nearer 00:00 in the reverse-chronological file as the earlier hour.

| Site | File order | Reversed | Smaller |
|---|---|---|---|
| ashburn-collocated | 7.70 | 5.42 | reversed |
| belfort-park | 6.73 | 8.81 | file order |
| camp-snyder | 5.11 | 5.11 | tied |
| evergreen-cc | 1.65 | 2.81 | file order |
| meadows-farms | 4.31 | 6.71 | file order |
| pw-police-west | 7.98 | 8.56 | file order |
| vdot-mkc | 4.02 | 4.16 | file order |

Five of seven favour file order, one is reversed and one is tied, so the export cannot
order the hour. Both readings at every site are excluded as `dst_fallback_unordered`, and
ts_est 2026-10-31 23:00 and 2026-11-01 00:00 are listed in `deq_missing_hours.csv` under
that category (56 rows: 7 sites, 2 hours, 4 pollutants) (DECISIONS.md D35; GENARCH_RULES
section 4, amendment of 2026-11-08). The conversion now runs through zoneinfo
America/New_York; against the committed 2026-10-29 output it changes no ts_est from
2026-03-03 to 2026-10-31 (`outputs/repro/dst_regression_2026-11-08.txt`, 0 differences in
36,026 timestamps). The frozen report inputs end 2026-10-10, so the 2026 report is
unaffected.

2026-11-08: Discovery ES (discovery-es, DC-15) is placed in Loudoun County by derivation,
recorded verbatim in the site history notes and in `site_codes.json` `county_source`: "DEQ
2026-11-06 edition: figure panels list Discovery ES under 'Loudoun County'; §1 counts 2
operating Loudoun sensors, which with Broad Run HS closed and the 5 Prince William sites
named in §2 can only be Belfort Park Dr and Discovery ES. No sentence names its county."
`in_v1_scope` is true; area stays TO_CONFIRM. On /community/data-center-alley it appears
under DC-15 only, and every correlation pair with it is reported as insufficient overlap
(at most 48 hours).

### DEQ correspondence queue

- 2026-11-08: ask whether Kunak exports can be pulled in UTC or with an offset column, so
  that the repeated hour at a fall-back change can be ordered (D35).

## Rulings on page length, CITATION abstract, R3 range (2026-11-09)

2026-11-09: the 23-page main body is accepted and figure data tables stay beside their
figures (DECISIONS.md D36). This settles the page budget entry of 2026-11-04 above.

2026-11-09: `CITATION.cff`'s abstract no longer states a count of matching regressions,
which settles "Flagged, not changed: CITATION.cff states a count of matching regressions"
above. Its collocation sentence is now the report summary's own, taken from the rendered
page (`site/src/content/reports/2026/summary.tsx`, keys `colloc.tolerance_coefficient`,
`colloc.tolerance_r2`, `deq.edition_cutoff`): "The four collocation regressions at the
collocated site agree with DEQ's published coefficients within 0.05 on slope and intercept
and 0.03 on R-squared, computed through DEQ's 2026-08-07T07:00 EST edition cutoff." Repo
grep of README*, CITATION.cff, docs/, site/src, data/ and outputs/ for "three of", "three
exact", "one near" and "of four" applied to the collocation result: `CITATION.cff:14`
(public, rewritten); `docs/report-2026/AUDIT.md:263`, `:504`, `:606`, `:1256` and
`docs/report-2026/DECISIONS.md:128` (history, left as written under D23);
`site/src/app/community/data-center-alley/page.tsx:197` and `site/src/lib/deq-data.ts:808`
(code comments on which comparisons the build asserts, not rendered, left). Every other
hit concerns something else (sites, brief entries, evidence classes, exemption
conditions). README.md has none.

2026-11-09: CONTEXT section 4 R3 keeps its August line, "raises every site by 1.3 to 2.6
µg/m³ and reorders nothing", and carries a dated amendment beneath it with the freeze
values from numbers.json: 2.069–2.514 µg/m³ (p98.common_clock.rise_min, p98.common_clock.rise_max; ordering from p98.common.rank.* against p98.common_clock.rank.*; the six ranks are equal under both day
definitions). This carries the 2026-11-04 correction above into CONTEXT itself.

## Author review of draft-1 (2026-11-14)

2026-11-14 A: print colours restated for a white page on the print route, inside and outside print media (DECISIONS.md D37); build-report-pdf.mjs gains a contrast gate (4.5:1, 7:1 for body text) run before page.pdf(); draft-2 text prints in #111111, #0f172a, #475569, #0f766e and #ffffff (table headers) only, plus the draft header and footer templates (#555555, #bb0000).
2026-11-14 B: T01, T03, T09 and T11 laid out at fixed print widths inside the 6.5in measure (T01 two pages, licence once in a note, SHA-256 in monospace); a width gate fails the build on any table wider than its container, any overflowing cell and any element outside the measure; T08 empty graph cells render "n/a", T02 empty Active end "open at freeze" with the record-days note, T10 and T12 counts grouped and shares to two decimals with the half-count note, T11 units "counts"; render layer only, CSV bytes unchanged except T08 (item E); four T01 Export date cells stay empty (the DEQ weekly-report rows record none).
2026-11-14 C: figures in Calibri, asserted on Windows and printed in the run log (D38); F06 relaid out from measured extents with at least 4pt between title, subtitle and axes; F01 dotted-line labels, which were clipped outside the axes in draft-1, moved into the empty foot rows, smoke label wrapped, unit labels set right of their tick; F04 record-day labels moved off the stems; F02, F03, F05 unchanged; captions print the title in bold with the description below, and F01's caption no longer opens by repeating its title.
2026-11-14 D: prose blocks flush left in the body style, list markers restored, headings kept with the next block; draft-2 is 48 pages against draft-1's 38 because draft-1's overflowing tables made Chromium shrink every page to fit (body text measured 6.67pt in draft-1 against the stylesheet's 10pt), which the width gate now prevents.
2026-11-14 E: scope and data paragraphs replaced as written ("per-person risk score" passes the lint; DC-10, DC-11 and DC-12 start 2026-09-17, 2026-09-18 and 2026-09-16 in the frozen site history); section 5.1 names DEQ's 2026-08-07 edition; "5 of the 6" and "ranks fourth" come from p98.common.n_sites and a new fmt="ordinal" on <N>; D25 (T08), D5 (roadmap), CONTEXT.md X7 (F06 limitation, T10, T11, T12) and F06 (T12) removed at their generators, and T11's caption names the printed column; tables keep their file-ID numbering; DOI unchanged (REPORT_DOI was left unfilled in the review).
2026-11-14 F: section 2 and Appendix A.2 state that freeze commit c2101b3d766dcaa29821448c8929ded5a1f2787f is now 782c1dc6b4b55f126e1dbfc5cced97daf483bd56 after the 2026-10-25 rewrite, from FREEZE_COMMIT_REWRITTEN in pipeline/report_lib/freeze.py, which the generator checks is present and an ancestor of HEAD (key freeze.commit_rewritten); the ancestry freeze date 2026-11-03 is stated through the new key ancestry.frozen_at; FREEZE.json untouched.
2026-11-14 G: roadmap rulings applied and markers removed (DECISIONS.md D39 to D46); DC-01's closure on 2026-11-04 verified against DEQ's 2026-11-06 edition section 2 and DC-02's on 2026-10-22 against the 2026-10-30 edition section 2; the roadmap preamble now counts three blocked items, because the paired-site item now waits on DEQ.
2026-11-14 H: the after-the-freeze box adds DC-01's closure on 2026-11-04 and the end of the replacement unit's collocation window (DEQ 2026-11-06 edition, new source deq2026nov06, retrieved 2026-11-08) and DC-02's closure on 2026-10-22; no closure is recorded for DC-04, DC-10, DC-11 or DC-12; the roadmap gains "Collocation series status"; section 7.3 unchanged.
2026-11-14 I: generator rerun; every pre-existing numbers.json, inventory.json and chain.json value byte-identical; keys added freeze.commit_rewritten, ancestry.frozen_at, p98.common.n_sites; 45 ancestry.loci.*.associations methods carry the reworded counting rule; validate, constraint lint (52 baselined, 0 new), mojibake, pytest and ruff pass; review markers 0; draft-2 built with the existing draft build.

## Author review follow-up (2026-11-15)

2026-11-15 1: tables renumbered by first appearance (DECISIONS.md D47): T08, T02, T03, T04s, T06, T05, T07, T09, T10, T11, T12, T01, T04 print as Tables 1 to 13; CSV names and tables.json IDs unchanged; every source line names its archive file; the "Table 2" reference in section 5.2 renders through <TableRef>; the T12 caption names no table and needed no change (the E6 report listed it in error).
2026-11-15 2: new key network.sites_active_at_deq_cutoff, 6 sites (DC-01, DC-02, DC-04, DC-06, DC-08, DC-09), computed from the original analysis inputs as sites with a valid PM2.5 reading in the 24 hours before 2026-08-07T07:00 EST, now rendered in section 5.1; network.sites_active_at_cutoff unchanged at 6 (DC-01, DC-02, DC-04, DC-10, DC-11, DC-12 at the freeze cutoff).
2026-11-15 3: the Figure 4 caption takes its record lengths from network.record_days.DC-06 and network.record_days.DC-01, checked against the plotted days; new keys p98.common.rank.<code>.deq_cutoff and p98.common_clock.rank.<code>.deq_cutoff; DC-06 ranks 4 under both, rendered as ordinals.
2026-11-15 4: edition dates stated before the citation through <EditionDate> (D49), in section 1, the summary, sections 5.1, 5.2 (after-the-freeze box) and 5.4.
2026-11-15 5: deq2026oct30 retrieved set to 2026-10-30, the manifest download date; deq2026oct09 reads 2026-10-10 against a manifest download date of 2026-10-11 (reported, not changed); deq2026aug07 has no manifest entry to check.
2026-11-15 6: an empty Table 1 Export date renders "not applicable", with a note pointing to the Sources list; CSV unchanged.
2026-11-15 7: the maximum daily difference prints at one decimal in section 5.3 and the summary table (D48); key value and precision unchanged.
2026-11-15 8: the loci table caption reads "gene symbols"; replaced where the caption is composed, because pipeline/lookups/asthma_loci.json is pinned by hash.
2026-11-15 9: dates, times, gene symbols, cytobands and locus tokens never break inside a cell; fixed-width body cells break between words only, so the width gate fails any column too narrow for a word; the glossary keeps its first two and last two entries together.
2026-11-15 10: the PDF build waited on every image, and the site footer's lazy-loaded logo never enters the viewport, so the wait always ran to 30 seconds; it now waits on the six figure images only and fails on any with zero natural width.
2026-11-15 11: generator rerun, existing values byte-identical; validate, constraint lint (52 baselined, 0 new), mojibake, pytest, ruff, tsc and ESLint pass; review markers 0; draft-3 built, 47 pages, 14 tables inside their containers, DEQ verbatim limitation 7 times.

## Audit fixes for draft-3 (2026-11-16)

Findings from docs/report-2026/AUDIT_FINDINGS.md (61: B1-B9, S1-S39, M1-M13), one line each.

2026-11-16 B1: frontmatter date 2026-11-16, after the latest cited edition (2026-11-06, retrieved 2026-11-08); cover, changelog and APA citation follow (D53).
2026-11-16 B2: print.css hid every <footer> on the print route, including DeqLimitation's attribution; the rule now targets the site banner, header and contentinfo footer only, and the attribution prints in a <p> after the quote in the summary and section 7 boxes.
2026-11-16 B3: cfr5018 re-pointed to 40 CFR 50.20 (cfr5020), eCFR URL and title, read through the eCFR versioner API at 2026-10-01 (9.0 annual, 35 24-hour, 89 FR 16380); naaqs.annual_standard and naaqs.daily_standard method text names section 50.20, values unchanged (D53).
2026-11-16 B4: first authors Song L, Aneas I, MacIntyre EA (with the TAG Study subtitle) from Crossref; the IL-33/ST2 review replaced by its Crossref exact-title match, De la Fuente, MacDonald and Hermoso 2015, 10.1016/j.cytogfr.2015.07.017; all five brief entries method crossref, checked 2026-11-16; section 7.4 sentence and roadmap item for the brief record (D53).
2026-11-16 B5: the literature list prints its [n] labels in the order Cite numbers them.
2026-11-16 B6: hodgson2024 removed; genarchatlas cited in section 1.
2026-11-16 B7: Table 3 and Figure 2 mark the APEX 5 NO2 DEQ values † as staff correspondence of 2026-08-19; the 2026-08-21 edition p. 14 correction (1.8 + 0.31x, R-squared 0.2) is transcribed as deq.aug21.apex-05_NO2.*, stated in the table note, the figure and section 5.2, and not compared; deq2026aug21 added to Sources with retrieved date 2026-08-22 as an upper bound (archive commit fc6a0a8) (D54).
2026-11-16 B8: section 5.2 names the APEX 14 NO2 regression and its R-squared against DEQ's, without a count.
2026-11-16 B9: section 6.3 callout reworded as the fix gives, with ancestry.discovery.south_asian.share and ancestry.loci.17q12-21.south_asian.associations bound through <N>.
2026-11-16 S1: numbers bound to existing or new keys in every section, caption and alt text; exemptions recorded (D50); numbers.json gains 136 keys (114 before the S12 ruling, 22 after), inventory.json and chain.json 2 each; the T11 caption's locus count now comes from the same record as ancestry.loci.count.
2026-11-16 S2: ISO date-times print with a space, figure shares below 0.1 percent print "<0.1%", table counts carry thousands separators (D51).
2026-11-16 S3: Table 5 carries a note that the section 5.4 rise is computed from unrounded percentiles.
2026-11-16 S4: the summary R3 sentence, section 5.4 first paragraph and section 5.2 first paragraph name whole days through network.common_window.end and DEQ's edition cutoff deq.edition_cutoff.
2026-11-16 S5: summary R3 carries the full caveat 2, worded per the S12 ruling (records differed in length and in how much weight the smoke weekend carried).
2026-11-16 S6: section 5.1 gives whole-day counts with the DEQ-cutoff counts in brackets.
2026-11-16 S7: section 5.4 states that keeping zeros closes p98.full.zero_kept.n_closed site and opens p98.full.zero_kept.n_opened.
2026-11-16 S8: section 7.2 states that DEQ's printed correction (2026-08-21 edition) covers a longer window than the regulatory record this report holds and is not compared.
2026-11-16 S9: section 5.5 gives per-pair overlapping hours (corr.pair_hours_min to corr.pair_hours_max), distinct hours corr.n_hours, and the window through freeze.original_cutoff_date.
2026-11-16 S10: Table 3 note: DEQ voided sensor PM2.5 2026-03-03 to 2026-03-08 for high humidity (2026-10-09 edition footnote 3), 143 APEX 14 hours (keys sensor.pm25_void.*, colloc.apex-14_PM2.5.void_hours).
2026-11-16 S11: the reconciliation table carries the excluded-day breakdown by reason from keys: 160 calendar days, 119 comparable, 38 excluded on both sides, 2 published only, 1 recomputed only; the longest gap, 2026-06-17 to 2026-07-13 (27 days), is AQS null code AS.
2026-11-16 S12: ruling applied (D58): EPA exceptional-event sentence in section 3.5 and the Figure 1 in-figure label; summary share and R3 sentences replaced as ruled; section 5.4 retitled, smoke paragraph inserted, clock-binning sentence replaced; section 7.2 season sentence replaced; Table 5 smoke-excluded record days, percentile and rank for both day definitions; Table 6 own-record local standard time percentile with the window excluded; Figure 4 third marker series (drawn, not caption-only), title "Record length and one smoke weekend move the 98th percentile"; section 5.5 with-smoke correlation range 0.959 to 0.991; changelog wording; CONTEXT section 4 R3 amendment; new N format count renders zero as "none".
2026-11-16 S12 values: Loudoun complete site-days below 35 with the window excluded 1,207 of 1,207 (100.00 percent) against 1,220 of 1,231 (99.11) with it; all 11 site-days at or above 35 fall in the window. Common window, window excluded, local standard time: DC-01 24.356, DC-04 21.294, DC-08 21.267, DC-06 21.059, DC-09 20.703, DC-02 16.644; local clock time: DC-01 24.131, DC-08 21.283, DC-04 21.267, DC-06 20.879, DC-09 20.678, DC-02 16.732; none above 35 under either. Largest clock-minus-standard difference 0.225; DC-04 minus DC-08 under standard time 0.028 from unrounded values. At all six sites under both definitions the two days each common-window percentile is read from are smoke days. Own record, local standard time, window excluded: DC-06 21.059 against 38.215 with it.
2026-11-16 S12 one-way list (GENARCH_RULES section 6), reported and not changed: summary correlation sentence, Table 7 and Figure 5 (smoke excluded only); R1 collocation fits and the APEX 5 NO2 backfill fit (Table 3, Figure 2, summary, section 5.2; smoke hours included); R2 daily reconciliation (Tables 4 and 4s, Figure 3, summary, section 5.3; regulatory monitor, smoke days included); Table 5 DEQ-cutoff columns and ranks and the section 5.4 DEQ-cutoff ranking sentence (smoke included); Table 6 clock-time columns and all three difference columns, the section 5.4 own-record reproduction statements (p98.full.lst_offset_live.*, n_within_live, zero_kept.*, DC-08 difference) and the section 7.3 item (smoke included, as in DEQ's table); Figure 4 own-record series (smoke included; Table 6 gives the standard-time value both ways); record-day counts (network.record_days.*), which count smoke days.
2026-11-16 S12 community page: /community/data-center-alley says "{Word(aboveLevel.length)} of {word(commonWindow.length)} sites sit above 35 µg/m³ on matched windows, and site {shortest.key} ranks {ordinal(shortestRank)} rather than first" and that the common window "contains the smoke window"; it notes the percentiles include that window and DEQ staff's pre-smoke figure of about 20 µg/m³, but gives no smoke-excluded common-window value; its own-record against common-window chart and table are with smoke only. Not edited.
2026-11-16 S13: DC-10 to DC-12 dropped from the section 5.2 callout; Table 2 prints "outside scope" for Prince William record days; Table 12 keeps the three export rows under a D5 exception (D52).
2026-11-16 S14: site key notes give the Active end convention and the DEQ 2026-10-09 unit assignments (sensor 8 DC-07, 10 DC-08, 13 DC-09), checked against the edition text at generation; name column headed "Name on DEQ's dashboard" (D55).
2026-11-16 S15: summary callout and section 8 both describe the one unit that occupied two sites.
2026-11-16 S16: section 5.1 bounds the site count by the data cutoff; F01 alt text says the shortest Loudoun record begins in mid-June.
2026-11-16 S17: section 8 Prince William dates keyed, with the post-freeze date labelled and cited to the 2026-10-30 edition.
2026-11-16 S18: section 5.2 callout and section 8 say sensor collection at DC-01 ended and the unit moved; the regulatory monitor continues; section 8 item retitled "Collocated comparison, after the freeze".
2026-11-16 S19: the after-the-freeze callout records the two Prince William sites and the new Loudoun site, without codes or values, cited to the 2026-10-30 and 2026-11-06 editions.
2026-11-16 S20: section 7.3 item now says the backfill treatment will be reported to DEQ in the pre-publication review.
2026-11-16 S21: DEQ editions titled "Data Center Air Quality Analysis" with their edition dates and per-edition addresses (oct09 document 39287 retrieved 2026-10-11, oct30 39902, nov06 39963); the 2026-08-07 edition has no manifest entry and now gives the project page with its archive path and SHA-256 instead of the 2026-10-09 document ID it had borrowed through the manifest fallback (D56). DEQ hosts return 403 to automated clients: check by hand.
2026-11-16 S22: PEC source is Cork and Dominici, EmPower Analytics Group, for PEC, 2026-02-27, at its PDF URL (resolves, 200).
2026-11-16 S23: ACS edition date 2026-01-29 (Census release page); genarchatlas title "GENARCH — Genetic Epidemiology Atlas"; new source diversitymonitor2024 (snapshot 2024-09, retrieved 2026-07-13).
2026-11-16 S24: the ACS source note names its table through {table:T12}.
2026-11-16 S25: section 5.7 citations matched to claims, with [10] and [11] named as cell and animal evidence; section 6.3 reads "the measure the cited reviews give most weight".
2026-11-16 S26: two summary sentences on the ancestry composition and the 17q12-21 gap, keyed, with the not-a-headcount qualifier; the lead says the report does three things.
2026-11-16 S27: section 6.2 reads "sum to ... (a total of study sample sizes, not of distinct people)".
2026-11-16 S28: the T12 caption no longer carries the effect-estimate sentence.
2026-11-16 S29: glossary entry retitled "Federal reference or equivalent method monitor" and states the regulatory monitor is FEM.
2026-11-16 S30: no script on disk reproduces the X2-X4 quantities, so the numbers are removed and section 5.6 says the readings were examined in the August analysis.
2026-11-16 S31: glossary defines "Functional (evidence class)"; section 3.6 says the step 1 and step 5 classes come from gene-level links; keys chain.steps_from_records and chain.steps_from_figure.
2026-11-16 S32: section 7.4 and section 1 state the Fairfax County comparison region (inventory.community_regions.records).
2026-11-16 S33: Table 12 note gives export date as an upper bound, the commit time of the ingest (D10).
2026-11-16 S34: section 2 and Appendix A say every DEQ and sensor input is listed and the atlas, ancestry and configuration inputs are pinned in the freeze file.
2026-11-16 S35: Table 7 printed once (section 5.5); Appendix B reads "thirteen".
2026-11-16 S36: Appendix A.1 describes all six commands.
2026-11-16 S37: the zero-retention point reads "DEQ staff confirmed" with a correspondence source and no revision narrative; the correction is cited to the 2026-08-21 edition (D54).
2026-11-16 S38: the summary sentence is replaced as ruled under S12, naming the freeze.cutoff_date data cutoff.
2026-11-16 S39: Figure 4 reference-line label in the right margin, common-window markers hollow so the DC-06 own-record dot shows; legend moved to the upper left for the third series.
2026-11-16 M1: section 3.2 states the shift as America/New_York wall time and notes the autumn transition does not arise in this record.
2026-11-16 M2: Figure 3 carries a regulatory-data note; the PDF post-check declares the four sensor figures (F01, F02, F04, F05), so the required verbatim count is 6 (D57).
2026-11-16 M3: correspondence facts cited to the new deqcorrespondence source; the "follow-up request is pending" statement has no request record on disk and is left as written, unverified.
2026-11-16 M4: the listed phrases removed or reworded.
2026-11-16 M5: summary opens "This is GENARCH's annual report for 2026." as ruled.
2026-11-16 M6: Table 3 columns "First/Last paired hour (EST)" with a note tying them to the unit assignment and the site key date.
2026-11-16 M7: URLs, DOIs and break-anywhere cells (Table 8 source, Table 12 origin) break after separators through <wbr> with overflow-wrap anywhere, replacing word-break break-all; Tables 3 and 10 header hyphenation not resolved: the columns are at their fixed widths inside the 6.5 in measure, the small table size did not change it, and the print route has no landscape page; Figure 1 labels 8 pt (were 6.5 and 6.8), reconfiguration label on two lines; Table 10's Locus column keeps the record's label, which is read from hash-pinned asthma_loci.json; the T10 caption is present in tables.json.
2026-11-16 M8: NR and Other defined in the Table 9 and 10 notes.
2026-11-16 M9: the T10 caption's pointer to an internal path removed.
2026-11-16 M10: APA citation reads "Saraiya, K. (2026)."
2026-11-16 M11: no change (D59).
2026-11-16 M12: summary callout adds "(see section 7.5)".
2026-11-16 M13: British spelling throughout (D60); proper names, quotations and the hash-pinned T11 caption sentence keep theirs.

## Draft-4 follow-up (2026-11-17)

2026-11-17 1: GENARCH_RULES section 6 amended (DECISIONS.md D61): the smoke rule covers GENARCH's own descriptive statistics; reproductions of DEQ statistics and record-day counts are exempt and unchanged. Summary correlation sentence gives both ranges (0.886 to 0.966 excluded, 0.959 to 0.991 included); the correlation table adds smoke-included Pearson r and overlapping hours per pair from 30 new keys corr.with_smoke.<A>_<B>.r and .n_hours; the Figure 5 caption states the smoke-included range from keys; the Figure 4 caption points to the smoke-excluded own-record values in the own-record table.
2026-11-17 2: /community/data-center-alley gives the smoke-excluded common-window result beside the existing sentence, computed in lib/deq-data.ts on the report's window and local standard time days; the rendered values equal p98.common_exsmoke.* (all six values, ranks, count above 35), asserted by tests/test_site_output.py; the page fails its build if the shortest record's rank differs between the two.
2026-11-17 3: the summary's last paragraph and the exclusions box print together (break-inside avoid); no line of the summary is printed twice verbatim; the box's pairing sentence and the summary's sentences on the form of the standard overlap in content, and both are ruled (CONTEXT section 3, S12 item 1), so neither is cut; summary spans pages 1 to 3.
2026-11-17 4: Tables 3 and 10 printed transposed in the render layer (DECISIONS.md D62); CSVs, IDs and archive names unchanged; header cells carry no soft hyphens and break between words or after a slash between gene symbols; width gate passes.
2026-11-17 5: DEQ document IDs in report outputs: 39287 twice (2026-10-09 Sources entry and its frozen-inputs row), 39902 once (2026-10-30), 39963 once (2026-11-06); no ID belongs to another edition; 2026-08-07 and 2026-08-21 carry the project page and their archive paths.
2026-11-17 6: held: the request number supplied for the follow-up records request is the placeholder 26-NNNN; no Sources entry added and neither pending sentence changed until the number is given.

## Public repository hotfix (2026-11-20)

2026-11-20 0.1: GENARCH_RULES.md section 11 in full, the paragraph and heading of outputs/repro/refresh_report_2026-08-28.md section 5.5 that held the same observation, and item 5.5 of .claude/prompts/kunak_refresh_2026-08-28.md moved verbatim to a private file outside the repository. The refresh report keeps "### 5.5" and the line "An observation on this edition's wording is held for correspondence with DEQ."; the prompt keeps item 5.5 as that line; nothing renumbered. CONTEXT.md R1's pointer to the removed section now names docs/COLLOCATION_METHOD.md, which carries the date-window alternative.
2026-11-20 0.2: scan of the tracked tree on main and report-2026, raw data excluded: no other held-for-correspondence text, no pasted correspondence, no DEQ staff name, no @deq.virginia.gov address. Left in place and listed for the author: GENARCH_RULES.md section 9 and the section 10 log row of 2026-08-19 (the bounded-fit account of the 2026-08-07 APEX 5 NO2 figures); site/src/content/deq-attribution.ts line 30 (DEQ's "designed" typo, kept verbatim by rule); AUDIT.md lines 470 and 774, which quote the 2026-08-28 edition's published wording and point to the removed section (AUDIT.md is append-only); site/src/app/r/[code]/page.tsx line 9, whose "§11" pointer already meant the outreach section, now section 12.
2026-11-20 0.3: committed on main as 8527566 ("docs: move held DEQ correspondence notes out of the public repo") and pushed; the Vercel production deployment for 8527566 succeeded and CI passed. Cherry-picked cleanly onto report-2026 as 5320c4c and pushed.
2026-11-20 0.4: the removed text remains in earlier commits on both branches. History is not rewritten (DECISIONS.md D63): the 2026-10-25 authorship rewrite already changed every SHA once, the freeze records c2101b3 as git_head with 782c1dc as its rewritten identifier, and the report, FREEZE.json and this file cite that mapping; a second rewrite would break those citations again.

## Audit round 2 fixes (2026-11-20)

Findings from docs/report-2026/AUDIT_FINDINGS_2.md (28: B1-B4, S1-S13, M1-M11), one line each.

2026-11-20 B1: section 5.4's first paragraph states the common-window result with and without the smoke window, under both day definitions, with DC-06's rank under each; the second paragraph keeps the explanation.
2026-11-20 B2: the summary collocation sentence is replaced as ruled: the three regressions against the coefficients DEQ printed and the second unit's NO2 against the staff-supplied ones [F], each within the keyed tolerances; T03 Status for APEX 5 NO2 renders "matches DEQ staff values at DEQ's precision"; the key colloc.apex-05_NO2.status keeps its value.
2026-11-20 B3: Source F renders "DEQ staff, correspondence with the author, 2026-08-10 to 2026-08-19, on file.", with no URL and no retrieval date; every [F] citation points at it (D64).
2026-11-20 B4: the T03 † note gives the staff-supplied window and DEQ's printed figures without the axis-limit account; section 7.3 item 1 reads "Whether DEQ's published collocation plots carried axis limits that also bounded the fit. Asked of DEQ; awaiting an answer."
2026-11-20 S1: section 3.5 states that GENARCH's own statistics are reported both ways, that the correlation excludes hours by local standard time day while the percentiles and the site-day share exclude whole days under the day definition in use, and that reproductions of DEQ statistics are reported as DEQ computes them; section 5.4 says "days".
2026-11-20 S2: 30 new keys p98.common*.n_above_35.deq_cutoff and p98.common*_exsmoke.{code,rank,n_above_35}.deq_cutoff; the section 5.4 DEQ-cutoff sentence and the T05 note state the result both ways (5 and 5 with the window, none and none without; DC-06 fourth in all four); D61's exemption list corrected, its scope unchanged.
2026-11-20 S3: the corridor page's percentile table adds own-record and common-window values with the smoke window excluded, from getPercentiles(); the own-record values equal p98.full.<code>.lst_zero_missing_exsmoke (new test) and the common-window values equal p98.common_exsmoke.* (existing test); the correspondence is quoted as logged ("around or below 20") and each figure's window is stated. DEQ's figure covers each site's record before 2026-07-16; the smoke-excluded values cover days through 2026-08-07 including those after the smoke, so the two do not cover the same days and the stop condition does not apply. The "13.27" and "up to 2.12" sentences on that page remain one-way.
2026-11-20 S4: the day-setting count uses the order statistics carrying non-zero weight (one at a whole index, two otherwise); value unchanged at 6 under both definitions; new key p98.common.whole_index_days (51), guarded to a single value; section 5.4 worded as ruled.
2026-11-20 S5: data counts bound to keys: summary (network.loudoun_sites, p98.common.n_sites, corr.n_sensors); section 5.4 (p98.common.n_sites; "the other five" and "among the six" reworded without a count); section 5.2 callout (deq.postfreeze.pw_sites_added_count, phrases checked in the 2026-10-30 edition); T02 note (deq.oct09.unit.DC-07, DC-08, DC-09 and deq.oct09.units_named); T05 caption (p98.common.n_sites); T07 caption (corr.n_sensors); T09 caption (chain.steps, chain.steps_from_records, chain.steps_from_figure). D50 extended to structural references, page locators and request identifiers.
2026-11-20 S6: the T06 caption names the smoke-excluded column; T06 gains "Record days, smoke window excluded"; the note names the fourth and fifth columns; the table prints small to stay inside the measure.
2026-11-20 S7: the T05 note covers every difference section 5.4 quotes between table values, including the DC-04 minus DC-08 gap.
2026-11-20 S8: T01 export dates print with a space (D51), in the CSV and the PDF.
2026-11-20 S9: T01 gains a row for the 2026-08-21 edition, "pinned in its keys, not in the freeze", with its archive path and SHA-256; new key freeze.n_inputs_pinned_in_keys (1); section 2, Appendix A.3 and the T01 caption state both counts from keys; FREEZE.json unchanged.
2026-11-20 S10: section 5.7 cites the GWAS Catalog release for the disease-link association and [11] for the regulatory mechanism only.
2026-11-20 S11: new source foia266715 (FOIA 26-6715, filed 2026-11-17, status Open when retrieved 2026-11-20; the request page resolves, 200); sections 2 and 7.2 read "A follow-up request (26-6715, filed 2026-11-17) is open"; the report date moves to 2026-11-20 so that it does not precede a cited item (D66).
2026-11-20 S12: done with B2.
2026-11-20 S13: the T05 note explains why the DEQ-cutoff percentiles rise when a partial day is dropped.
2026-11-20 M1: the section 6.3 callout reads "that count is not evidence of absence".
2026-11-20 M2: the roadmap names DC-01 and DC-02 as the sites still collecting that had collected since the first start date.
2026-11-20 M3: [C] follows the DEQ attribution in the summary box, the section 7 box and the four sensor-figure captions; the verbatim count is unchanged at 6.
2026-11-20 M4: source notes take a {cite:id} token; the Diversity Monitor source note renders [7].
2026-11-20 M5: the F06 note reads "study sample sizes and resident counts" and no longer repeats the ACS sentence, which prints once, in the caption.
2026-11-20 M6: section 5.2's second paragraph prints with Figure 2 (keep-together children unsplittable and kept with the one before); the Figure 4 smoke-excluded markers sit right of the other two on their own dotted stem.
2026-11-20 M7: scope_sensor_inputs() narrows each sensor key's inputs to the exports it reads; no Loudoun-only key lists a Prince William export; values unchanged.
2026-11-20 M8: the T05 rank column is headed "Rank (whole days and DEQ cutoff)"; the generator fails if the two rankings ever differ.
2026-11-20 M9: section 7.2 names the window of its record-length range.
2026-11-20 M10: no change (D65).
2026-11-20 M11: section 5.4's clause matches the summary: "the records differed in length and in how much weight the smoke weekend carried in each".
2026-11-20 gates: generator rerun, every existing key value byte-identical (498 keys before, 534 after); validate, ruff, pytest (193 passed), tsc, ESLint, constraint lint (52 baselined, 0 new), mojibake and the PDF post-check pass; REVIEW_NOTES regenerated (427 sentences, 0 review markers); draft-6 built, 52 pages, 13 tables inside their containers, DEQ verbatim limitation 6 times; drafts 1 to 5 kept.
2026-11-20 layout, left: Table 12's last note breaks onto page 39 alone after the S9 row; the table already prints small.

## DEQ review amendments (2026-11-21)

Agency staff replied on 2026-11-20 and asked that their answers not be attributed to DEQ as an agency and that their emails not be cited as DEQ correspondence (DECISIONS.md D67).

2026-11-21 A1: /community/data-center-alley. Every "(DEQ staff, correspondence, ...)" citation and every "DEQ staff said/confirmed" sentence replaced; no ingested edition states any of these facts, so each reads "confirmed by agency staff" or "agency staff state", with no date or message reference. Changed strings: the project goal ("Agency staff describe the goal of the project ..."); the download method ("by a download method confirmed by agency staff"); the collocation table caption and the dagger's screen-reader text ("unpublished values supplied by agency staff"); the dagger note (staff values for the same window; "DEQ's 2026-08-21 edition prints a different fit for that regression over a longer window"); the edition cutoff ("Each edition is produced on Friday morning from data through 07:00 that day, confirmed by agency staff"); the recorded-row paragraph (comparison values are unpublished staff values, not printed figures; the earlier text said they were refit past the cutoff, which the staff data range, 2026-04-07 22:00 to 2026-08-07 05:00, does not support); the axis-limit paragraph, removed, and the "correction is now in print" paragraph, rewritten as the 2026-08-21 edition's different fit; the zero-retention sentence; the 2026-03-10 review; the expectation that the DC-06 figure would keep falling; the wildfire-skew sentence; the licence line; and the download table's licence and retrieval strings, which the page now renders from the manifest through asStaffAttribution(). nonComparable's deqCutoff, reason, restoreWhen and blockedOn and RETAIN_ZEROS_NOTE in deq-data.ts reworded to match. A build guard holds the recorded-row sentence: the page's fit on current sources (1.847 + 0.317x, R-squared 0.204, 2,746 pairs) is inside the 0.05 and 0.03 tolerance of the staff values but does not round to them, so the sentence says tolerance, not rounding.
2026-11-21 A2: the corridor page's convention-spread and day-boundary sentences are stated with and without the smoke window, from getP98Sensitivity() in deq-data.ts, at the 2026-08-28 cutoff the sentences already used: spread 13.27 for DC-06 against 0.35 to 2.33 with the window, 3.18 against 0.00 to 2.34 without it; day-boundary shift up to 2.08 with, up to 0.32 without; mean within 0.04 either way. The previous "up to 2.12" was a difference against DEQ's 2026-08-28 Table 4 (docs/PERCENTILE_METHOD.md), not a standard-minus-clock difference; the page now computes the latter directly, which is 2.08. No report key exists at that cutoff; tests/test_site_output.py recomputes every value through pipeline/report_lib/daily.py and holds the with-smoke spreads against outputs/repro/p98_common_window_2026-08-28.csv. The round-2 smoke-excluded table columns, which had been on report-2026 only, are on main with this commit.
2026-11-21 A3: GENARCH_RULES.md. Section 10's six correspondence rows (DEQ staff and DEQ FOIA, by the section's own definition) moved verbatim to the private file of D63; the two edition rows stay, with DC-06 for the slug and the 2026-08-21 row's "corrected ... in print" wording neutralised. Sections 4 and 9: DC-01 and DC-06 for the school name and slug beside values. Section 9: the axis-limit account, "Agency-confirmed", "The correction is in print" and "still the bounded fit" replaced by "DEQ's 2026-08-21 edition prints a different fit for that regression over a longer window". Staff attributions in sections 4, 5, 8 and 9 read "confirmed by agency staff" or "agency staff".
2026-11-21 A4: site/src/app/r/[code]/page.tsx points at GENARCH_RULES.md section 12.
2026-11-21 A5: main b255b74 ("site, docs: attribute agency staff answers per staff request"), pushed; CI passed. Cherry-picked onto report-2026 as 3535eb6 (the page and lib files resolved to main's versions, the test file to both sides' tests).
2026-11-21 B6: the deqcorrespondence source is removed; the sources after it move up one letter (G to F through Q to P). Each statement that cited it reads "confirmed by agency staff" with no citation: the timestamp shift and the completeness threshold (section 3.2, 3.3), zero retention (3.3), the exceptional-event status (3.5), the edition cutoff (Appendix B glossary).
2026-11-21 B7: "DEQ staff confirmed", "DEQ's confirmation", "until the agency confirms which" and "until DEQ confirms" replaced across the report content, pipeline/report.py captions, notes and method strings, figures.py, collocation.py and references.json. numbers.json: 12 method strings reworded, every value byte-identical (534 keys). T01's licence column renders the frozen manifest's "(per DEQ staff, 2026-08-10)" and "Virginia DEQ confirmed redistributable" as "confirmed by agency staff" through staff_attribution(); the frozen manifest is unchanged.
2026-11-21 B8: the APEX 5 NO2 comparison values are "unpublished values supplied by agency staff for the same window" in the summary (citation removed), the Table 3 Status cell ("matches agency staff values at DEQ's precision"), the Table 3 note, section 5.2, section 7.2 and the Figure 2 legend and caption.
2026-11-21 B9: every "printed correction" reads "DEQ's 2026-08-21 edition prints a different fit for that regression over a longer window", in sections 2, 5.2 and 7.2, the Table 3 note, the Figure 2 caption, the deq.edition_date.aug21 method and the references.json note (D68).
2026-11-21 B10: section 7.3 no longer lists the axis-limit or CO averaging-period items; its introduction records both as closed ("Agency staff state that the collocation plots carry no axis limits." "Agency staff state that the CO series in the weekly editions are 1-hour averages."). The roadmap's CO item says the averaging period is answered and a CO comparison is planned for the next version; the roadmap count of blocked items is two. The summary's "not contained" box drops the unresolved averaging period. No CO analysis is added. The APEX 6 occupancy and the attribution line stay open.
2026-11-21 B11: CONTEXT.md section 4 caveat 2 carries a dated amendment with the ruled wording.
2026-11-21 B12: Table 12's last two rows open page 39 and every note follows them (a page break before the second-to-last row, scoped to that table; a keep-together rule on the notes did not hold in Chromium).
2026-11-21 B13: DECISIONS.md D67 (attribution), D68 (the 2026-08-21 edition's different fit), D69 (D66 accepted until release).
2026-11-21 B14 gates: generator rerun, every key value byte-identical; validate, ruff, pytest, tsc, ESLint, constraint lint (52 baselined, 0 new), mojibake and the PDF post-check pass; REVIEW_NOTES regenerated (426 sentences, 0 review markers); draft-7 built, 52 pages, 13 tables inside their containers, DEQ verbatim limitation 6 times; drafts 1 to 6 kept.

## DEQ weekly ingest 2026-11-20 (2026-11-21)

2026-11-21: No DEQ weekly edition was published for 2026-11-13 and the project page gave no notice; the 2026-11-20 edition was diffed against 2026-11-06.
2026-11-21: Kunak relabelled pw-police-west from 'PW Police Dept. West' to 'PW Police Department West' between the 2026-11-08 and 2026-11-20 exports; the 371 earlier rows are unchanged; label updated in the staging map, site history and site_codes.json. Post-freeze; the 2026 report is unaffected.
2026-11-22: Revisions of previously published Kunak values, from a comparison of consecutive exports. The 2026-11-20 export changes 41 values at camp-snyder over 23 hours, 2026-10-28 07:00 to 2026-10-29 07:00 EST (23 PM2.5, 17 NO2, 1 CO; largest PM2.5 29.66 to 23.85), and restores one hour at evergreen-cc, 2026-09-17 13:00 local, with the values it carried through the 2026-10-10 export. An earlier revision: the 2026-10-29 export sets CO to 0 at ashburn-collocated for 4,445 hours, 2026-04-08 00:00 to 2026-10-10 23:00 local, every non-zero CO reading in the 2026-10-10 export. In every export since, the first non-zero CO reading at ashburn-collocated after 2026-04-07 is 2026-10-22 22:00 local, after the apex-08 swap; the zeroed span coincides with the apex-05 occupancy (2026-04-08 to 2026-10-22). No cause is inferred. Hours dropped from later exports: 12 each at camp-snyder and vdot-mkc (2026-09-26 export); one at camp-snyder, one at evergreen-cc and two at vdot-mkc (2026-10-29 export). The 2026-08-10 exports compared with the 2026-10-10 exports show no rewritten values. Prince William County sites and CO are outside v1 scope, and the report reads frozen inputs; the 2026 report is unaffected.
