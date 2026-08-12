# GENARCH pre-publication work package — working log

**Session:** 2026-08-09 · **Branch:** `feat/brief2-and-figures` (identical to `main`; `git rev-list --count main..HEAD` = 0)
**Phase executed:** Phase 0 (reconnaissance, read-only) · **Nothing written except this file.**

Execution order this session: Phase 0 → Phase 3 (lint, build+run only) → Phase 2-REVISED →
Phase 2B → final lint. Phases 1, 4, 5, 6, 7 deferred.

> **Standing affirmation.** No value in this report was supplied from memory, training data,
> or the web. Every number, path, line reference, DOI, title, author string, and date below
> was read from a file in this repository during this session. Where a value is absent or
> contradictory, that is stated rather than resolved.

---

## Accepted scope-fence mapping

Printed before any edit, per instruction. Five fenced paths do not exist in this tree.

| Fence says | Actual path in this tree | Basis | Status |
|---|---|---|---|
| `site/src/components/community/**` | `site/src/components/CommunityRegionDetail.tsx`, `site/src/components/CommunityRegionsList.tsx` | No `components/community/` dir exists. These two are the only community components, and they render the exact strings 2R.1/2R.2/2R.5/2R.6 name. | unambiguous |
| `site/src/components/graph/**` | `site/src/components/GraphPageClient.tsx` | No `components/graph/` dir. This is the only component rendering an edge/node detail panel (`sources` at L594-597). | unambiguous |
| `pipeline/schemas/community.py` | `pipeline/schemas.py` → `CommunitySchema` (L505-526) | No `pipeline/schemas/` package; `schemas.py` is a single module holding all models. | unambiguous |
| `data/community/*.json` "(regenerate only)" | hand-edited directly | **No generator exists.** `emit.py` emits disease/exposure/gene/pathway only (L25/35/45/55). `manifest.json` states these source files "are not ingested by the pipeline". "Regenerate only" is not achievable. | unambiguous |
| `pipeline/lookups/scoring_config.json` | **does not exist** | No `pipeline/lookups/` dir; no file named `scoring_config*` anywhere. Scoring lives in `pipeline/score.py`. | n/a — Phase 4 deferred |
| `site/src/lib/constants.ts` | **does not exist** | `site/src/lib/` holds `data.ts, fieldNotes.ts, figure-data.ts, figures.ts, synonyms.json, types.ts`. Design tokens are in `site/tailwind.config.ts`. | n/a |

**Marked as a guess — excluded, not edited.** `site/src/components/charts/`
(`HealthBurdenChart.tsx`, `SHAPSummaryChart.tsx`, `ExposureDistributionPlot.tsx`) was a
plausible reading of "components/community/**" but is **not** an unambiguous match. Verified
unreferenced four ways: no import anywhere under `site/src` or `scripts/`; absent from
`site/src/components/index.ts`; no dynamic import or string-literal `charts/` path; no
occurrence in the built output under `site/out`. The health-burden bars and SHAP list that
actually ship are inline in `CommunityRegionDetail.tsx:348-444`. **Not touched.**

**`pipeline/graph_builder.py` — out of scope, confirmed as the fix site for two defects (F3, F4).**

---

## A. Schema inventory — community region

`pipeline/schemas.py`, `CommunitySchema` (L505-526), `model_config = ConfigDict(extra="forbid")`.

```python
class CommunitySchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    region_id: str
    name: str
    geo_level: str                          # validator: county | census_tract | zip
    fips_code: Optional[str] = None
    health_stats: list[HealthStat]
    exposure_layers: list[ExposureLayer]
    model: CommunityModel
    resources: list[CommunityResource]
    limitations: str
    references: list[Reference]
    schema_version: str
    last_updated: str
```

| Field | Type | Required |
|---|---|---|
| `region_id` | `str` | yes |
| `name` | `str` | yes |
| `geo_level` | `str` (validated enum) | yes |
| `fips_code` | `Optional[str]` | no |
| `health_stats` | `list[HealthStat]` | yes |
| `exposure_layers` | `list[ExposureLayer]` | yes |
| `model` | `CommunityModel` | yes |
| `resources` | `list[CommunityResource]` | yes |
| `limitations` | `str` | yes |
| `references` | `list[Reference]` | yes |
| `schema_version` | `str` | yes |
| `last_updated` | `str` | yes |

Nested models (all `extra="forbid"`):

- **`HealthStat`** (L451) — `disease_slug: str`, `metric_type: str`, `value: float`, `year: int`, `source: str`, `unit: Optional[str]`, `comparison_state: Optional[float]`, `comparison_national: Optional[float]`, `ci_lower: Optional[float]`, `ci_upper: Optional[float]`
- **`ExposureLayer`** (L466) — `layer_name: str`, `data_source: str`, `year: int`, `unit: Optional[str]`, `geojson_path: Optional[str]`, `summary_stats: Optional[dict[str, float]]`
- **`ShapSummary`** (L477) — `feature: str`, `mean_shap_value: float`, `direction: str`
- **`CommunityModel`** (L485) — `features_used: list[str]`, `hotspot_scores_geojson: Optional[str]`, `shap_summaries: list[ShapSummary]`, `model_card_version: str`, `training_data_cutoff: str`
- **`CommunityResource`** (L495) — `name: str`, `type: str`, `url: str`, `description: str`, `local_relevance: Optional[str]`
- **`Reference`** (L32) — `id: str`, `title: str`, `authors: Optional[str]`, `year: int`, `journal: Optional[str]`, `doi: Optional[str]`, `url: Optional[str]`

**Bearing on 2R.1:** the SHAP field is `model.shap_summaries`. There is **no** field named
`model.drivers` or similar. **No schema migration is required** — the word "drivers" exists
only in the component's heading and element IDs, not in the data contract.

**Bearing on Phase 4 (deferred):** `CommunitySchema` has no `mechanism_chain` and no
`modifier_loci` field, and forbids extras. `data/community/data-center-alley.json` **cannot**
conform to the existing schema. Per the stop condition, this must be raised before Phase 4
rather than resolved by mutating the schema.

---

## B. Citation state

`data/graph/graph.json` — **165 edges**.

| Measure | Count |
|---|---|
| Edges with a non-empty `sources` array | **153** |
| …of those, arrays containing **only** `^ref\d+$` tokens | **153** (100%) |
| Edges with absent/empty `sources` | **12** |
| Edges carrying any real identifier (DOI, PMID, author-year) | **0** |
| Edges at `high` or `medium` confidence with empty-or-placeholder sources | **160 of 165** |

Token frequency across edge `sources`: `ref1` ×64, `ref2` ×59, `ref3` ×55, `ref4` ×54,
`ref5` ×36, `ref6` ×1, `ref7` ×3.

**Do real citation identifiers exist anywhere in `data/`?** Yes — but not in the graph.
**266 reference records** across `data/{diseases,exposures,genes,pathways,community,briefs}/`
carry real titles, authors, years, journals, and DOIs. Only **3** have neither a DOI nor a URL.

**This determines that Phase 4 is possible in principle** — a real citation pool exists.
**But the graph edges cannot be repaired by lookup**, for the reason below.

### B1 — The placeholder tokens are not merely placeholders. They are ambiguous.

`ref1` is a **file-local** ID, reused across **83 files** with a different meaning in each.
There are only **11 distinct reference IDs** in the entire repository (`ref1`–`ref11`) spread
over 266 records. Three worked examples of what `ref1` means:

| File | `ref1` resolves to |
|---|---|
| `data/diseases/asthma.json` | Moffatt MF, et al. (2007) *Nature* — `10.1038/nature06014` |
| `data/exposures/air-pollution.json` | Li R, et al. (2017) *Environmental Toxicology and Pharmacology* — `10.1016/j.etap.2017.02.011` |
| `data/genes/il33.json` | Alvarez M, et al. (2021) *Nature Communications* — `10.1038/s41467-021-26347-z` |

`build_edges` copies `em.get("citations", [])` straight from the source entity file into the
edge's `sources` (`graph_builder.py`, modifier/association/pathway branches) with **no
namespacing**. A graph edge carrying `sources: ["ref1"]` is therefore not resolvable even in
principle without knowing which file it came from. The correct gap class for these is
**AMBIGUOUS**, not `UNRESOLVED` — noted for `docs/CITATION_GAPS.csv` in Phase 2B.

### B2 — Why validation is green on a broken citation graph

`validate.py:_collect_citation_ids` (L95-110) pools every reference ID from every file into a
single flat `set[str]`, then `validate()` (L294-298) checks membership against that pool. So
`ref1` "exists" globally and passes. **The check cannot detect a mis-scoped citation**, and it
never inspects graph edge `sources` at all. This is why 165 unusable edge citations survive a
passing validate.

### B3 — Four hard contradictions in the real citation records

Found by comparing records within this repository only. **Not resolved** — resolving any of
these requires an external lookup, which is prohibited. Each needs a human ruling.

**1. One DOI, two mutually exclusive titles — `10.1056/NEJMoa0906312`**

| Record | Title asserted |
|---|---|
| `data/genes/ormdl3.json#ref1` | "Genetic variants regulating ORMDL3 expression contribute to the risk of childhood asthma" |
| `data/pathways/il33-st2-axis.json#ref2`, `data/briefs/asthma-air-pollution-17q21.json#ref2`, `data/briefs/no2-traffic-corridor-childhood-asthma.json#ref4` | "A large-scale, consortium-based genomewide association study of asthma" |

The first title is attached to a *different* DOI (`10.1038/nature06014`, 2007 *Nature*) in
`data/diseases/asthma.json#ref1`, `data/exposures/air-pollution.json#ref6`, and
`data/briefs/asthma-air-pollution-17q21.json#ref1`. So `ormdl3.json#ref1` pairs a 2007 *Nature*
title with a 2010 *NEJM* year, journal, and DOI. At most one pairing is correct.

**2. One DOI, conflicting first author — `10.1111/cei.12348`**

| Record | Authors |
|---|---|
| `data/diseases/asthma.json#ref5` | **Saglani S, et al.** |
| `data/exposures/air-pollution.json#ref2`, `data/genes/il33.json#ref2`, `data/briefs/pm25-il33-nfkb-asthma.json#ref2` | **Brandenburg AH, et al.** |

Identical title, year (2014), and journal. At most one author string is correct.
This citation is load-bearing for the PM2.5 → IL-33 mechanism.

**3. One title, two DOIs and two journals** — "Allele-specific chromatin remodeling in the
ZPBP2/GSDMB/ORMDL3 locus…" (Verlaan DJ et al., 2009):
`10.1038/ng.381` *Nature Genetics* in `data/genes/gsdmb.json#ref1` and
`data/genes/ormdl3.json#ref2`, versus `10.1016/j.ajhg.2009.08.007` *American Journal of Human
Genetics* in `data/briefs/asthma-air-pollution-17q21.json#ref3`.

**4. One title, two DOIs and two journals** — "GSDMB induces an asthma phenotype…" (Das S et
al., 2016): `10.1038/ncomms11514` *Nature Communications* in `data/genes/gsdmb.json#ref2`,
versus `10.1073/pnas.1610433113` *PNAS* in `data/briefs/asthma-air-pollution-17q21.json#ref6`.

**Also:** `data/genes/tslp.json#ref2` and `#ref3` carry an **identical title** but different
authors, years, journals, and DOIs (He R 2009 *JACI* `10.1016/j.jaci.2009.05.018`; Ying S 2005
*J Immunol* `10.4049/jimmunol.175.12.8051`) — two distinct papers sharing one title string
inside a single file.

**Records with neither DOI nor URL** (3 — these would hard-fail the rule proposed in 2B.3):
`data/exposures/endotoxin.json#ref1` ("Farm exposure and asthma"),
`data/exposures/tobacco-smoke-prenatal.json#ref1` ("Prenatal smoke and asthma"),
`data/briefs/no2-traffic-corridor-childhood-asthma.json#ref7` ("Integrated Science Assessment
(ISA) for Oxides of Nitrogen…").

---

## C. Existing citation records — the permitted Phase 4 pool

Extracted verbatim. **This is the only pool Phase 4 may draw from.** Records flagged in §B3
are marked ⚠ and must not be used until the contradiction is resolved.

### `data/diseases/asthma.json` — 5 records
| id | year | title | journal | doi |
|---|---|---|---|---|
| ref1 | 2007 | Genetic variants regulating ORMDL3 expression contribute to the risk of childhood asthma | Nature | `10.1038/nature06014` |
| ref2 | 2021 | Asthma-associated genetic variants induce IL33 differential expression through an enhancer-blocking regulatory region | Nature Communications | `10.1038/s41467-021-26347-z` |
| ref3 | 2010 | Genome-wide association study of asthma identifies RAD50-IL13 and HLA-DR/DQ regions | J Allergy Clin Immunol | `10.1016/j.jaci.2009.11.037` |
| ref4 | 2019 | Lessons from ten years of genome-wide association studies of asthma | Clin Transl Immunology | `10.1002/cti2.1066` |
| ref5 ⚠ | 2014 | Ambient particulate matter induces an exacerbation of airway inflammation in experimental asthma: role of interleukin-33 | Clin Exp Immunol | `10.1111/cei.12348` |

Authors: ref1 Moffatt MF et al.; ref2 Alvarez M et al.; ref3 Sleiman PM et al.; ref4 Pividori M et al.; ref5 Saglani S et al. ⚠

### `data/exposures/air-pollution.json` — 6 records
| id | year | title | journal | doi / url |
|---|---|---|---|---|
| ref1 | 2017 | Exposure to PM2.5 induces aberrant activation of NF-κB in human airway epithelial cells… | Environ Toxicol Pharmacol | `10.1016/j.etap.2017.02.011` |
| ref2 ⚠ | 2014 | Ambient particulate matter induces an exacerbation of airway inflammation in experimental asthma | Clin Exp Immunol | `10.1111/cei.12348` |
| ref3 | 2014 | GSTP1 and TNF Gene Variants and Associations between Air Pollution and Incident Childhood Asthma | Environ Health Perspect | `10.1289/ehp.1307459` |
| ref4 | 2015 | Traffic-related air pollution exposure and incident asthma in a high-risk birth cohort | Occup Environ Med | `10.1136/oemed-2014-102726` |
| ref5 | 2024 | EPA Criteria Air Pollutants | — | `https://www.epa.gov/criteria-air-pollutants` |
| ref6 | 2007 | Genetic variants regulating ORMDL3 expression contribute to the risk of childhood asthma | Nature | `10.1038/nature06014` |

Authors: ref1 Li R et al.; ref2 Brandenburg AH et al. ⚠; ref3 Islam T et al.; ref4 McConnell R et al.; ref5 U.S. EPA; ref6 Moffatt MF et al.

### `data/genes/il33.json` — 5 records
| id | year | title | journal | doi |
|---|---|---|---|---|
| ref1 | 2021 | Asthma-associated genetic variants induce IL33 differential expression through an enhancer-blocking regulatory region | Nature Communications | `10.1038/s41467-021-26347-z` |
| ref2 ⚠ | 2014 | Ambient particulate matter induces an exacerbation of airway inflammation in experimental asthma | Clin Exp Immunol | `10.1111/cei.12348` |
| ref3 | 2016 | IL-33 and the intestine: the role in intestinal inflammation and gut immunity | Mucosal Immunology | `10.1038/mi.2015.100` |
| ref4 | 2018 | The IL-33/ST2 axis: Role in health and disease | Cytokine Growth Factor Rev | `10.1016/j.cytogfr.2018.01.001` |
| ref5 | 2020 | GTEx Consortium. The GTEx Consortium atlas of genetic regulatory effects across human tissues | Science | `10.1126/science.aaz1776` |

Authors: ref1 Alvarez M et al.; ref2 Brandenburg AH et al. ⚠; ref3 Liew FY et al.; ref4 Cayrol C, Girard JP; ref5 GTEx Consortium.

### `data/genes/ormdl3.json` — 3 records
| id | year | title | journal | doi |
|---|---|---|---|---|
| ref1 ⚠ | 2010 | Genetic variants regulating ORMDL3 expression contribute to the risk of childhood asthma | New England Journal of Medicine | `10.1056/NEJMoa0906312` |
| ref2 ⚠ | 2009 | Allele-specific chromatin remodeling in the ZPBP2/GSDMB/ORMDL3 locus associated with the risk of asthma | Nature Genetics | `10.1038/ng.381` |
| ref3 | 2010 | ORMDL3 modulates ceramide levels and the unfolded protein response in the endoplasmic reticulum | Human Molecular Genetics | `10.1093/hmg/ddp555` |

Authors: ref1 Moffatt MF et al. ⚠; ref2 Verlaan DJ et al. ⚠; ref3 Cantero-Recasens G et al.

### `data/genes/gsdmb.json` — 3 records
| id | year | title | journal | doi |
|---|---|---|---|---|
| ref1 ⚠ | 2009 | Allele-specific chromatin remodeling in the ZPBP2/GSDMB/ORMDL3 locus associated with the risk of asthma | Nature Genetics | `10.1038/ng.381` |
| ref2 ⚠ | 2016 | GSDMB induces an asthma phenotype characterized by increased airway responsiveness and remodeling | Nature Communications | `10.1038/ncomms11514` |
| ref3 | 2018 | A functional splice variant associated with decreased asthma risk abolishes the ability of gasdermin B to induce epithelial cell pyroptosis | J Allergy Clin Immunol | `10.1016/j.jaci.2017.02.030` |

Authors: ref1 Verlaan DJ et al. ⚠; ref2 Das S et al. ⚠; ref3 Panganiban RA et al.

### `data/genes/tslp.json` — 3 records
| id | year | title | journal | doi |
|---|---|---|---|---|
| ref1 | 2011 | Meta-analysis of genome-wide association studies of asthma in ethnically diverse North American populations | Nature Genetics | `10.1038/ng.888` |
| ref2 ⚠ | 2009 | TSLP: an epithelial cell cytokine that regulates T cell differentiation by conditioning dendritic cell maturation | J Allergy Clin Immunol | `10.1016/j.jaci.2009.05.018` |
| ref3 ⚠ | 2005 | TSLP: an epithelial cell cytokine that regulates T cell differentiation by conditioning dendritic cell maturation | Journal of Immunology | `10.4049/jimmunol.175.12.8051` |

Authors: ref1 Torgerson DG et al.; ref2 He R et al. ⚠; ref3 Ying S et al. ⚠

### `data/community/loudoun-county-va.json` — 3 records
| id | year | title | url |
|---|---|---|---|
| ref1 | 2023 | Virginia Department of Health Environmental Public Health Tracking | `https://www.vdh.virginia.gov/environmental-public-health-tracking/` |
| ref2 | 2024 | EPA Air Quality System | `https://www.epa.gov/aqs` |
| ref3 | 2023 | USDA Food Access Research Atlas | `https://www.ers.usda.gov/data-products/food-access-research-atlas/` |

None carry `authors`, `journal`, or `doi`. All three are `url`-only source-class records.

---

## D. Gene count discrepancy — **the audit finding is incorrect**

| Source of truth | Genes | Diseases | Exposures | Pathways |
|---|---|---|---|---|
| Files in `data/<type>/` | **26** | 19 | 15 | **12** |
| `type` nodes in committed `data/graph/graph.json` | **52** | 19 | 15 | **11** |
| `type` nodes in a clean in-memory rebuild | **26** | 19 | 15 | **12** |

**Where the count is rendered or stored:**

1. `site/src/app/page.tsx:112-115` — "Atlas at a Glance". **Already derived at build time:**
   `diseases.length`, `exposures.length`, `genes.length`, `pathways.length`, from
   `getAllDiseases()/getAllExposures()/getAllGenes()/getAllPathways()` (`site/src/lib/data.ts`
   L75/84/93/102), each of which reads the file listing of `data/<type>/`.
2. `site/src/app/page.tsx:152-157` — `View All {diseases.length} Diseases`, same derivation.
3. `data/graph/graph.json` `metadata.node_count` = 97, `metadata.edge_count` = 165.

**There is no hardcoded count literal anywhere on the homepage.** The premise of Phase 2R.4
("Remove every hardcoded count literal") does not hold against this tree, and **2R.4's premise
is struck** per decision. The homepage's `26` is correct for what it labels; the graph's `52`
is the defect. See F1 and F4.

Composition of the committed graph's 52: 25 of the 26 gene files (**`gsdmb` is absent**) plus
**27 minted gene nodes with no data file** — `agt, apc, apob, app, c4a, cacna1c, chrna5,
ctla4, cyp27b1, fam13a, fgfr2, grin2a, hhip, htr2a, il1rl1, il2ra, lpa, mlh1, mmp12, psen1,
psen2, ptpn22, rad50, slc30a8, smad7, tmem18, umod`.

Pathways: `data/pathways/il33-st2-axis.json` exists but has **no node** in the committed graph.

---

## E. Date discrepancy — **the audit finding is not reproducible**

**Fields controlling the two "last update" strings — there is only one, and both surfaces
already read it.**

| Surface | Code | Reads | Renders |
|---|---|---|---|
| `/community` | `site/src/app/community/page.tsx:18` → `CommunityRegionsList.tsx:20-28, 62, 79-83` | `r.last_updated` | `Updated {new Date(s).toLocaleDateString("en-US", {year:"numeric", month:"short", day:"numeric"})}` |
| `/community/loudoun-county-va` | `site/src/app/community/[region]/page.tsx:37-39` | `data.last_updated` | `Last update: {new Date(data.last_updated).toLocaleDateString()}` |

**Actual data values, read this session:**
- `data/community/loudoun-county-va.json:38` → `"last_updated": "2026-07-22"`
- `data/community/fairfax-county-va.json` → `"last_updated": "2026-07-22"`
- `git show main:data/community/loudoun-county-va.json` → `2026-07-22` (main carries the same value)
- `main` and `HEAD` are the same commit (`1178e1a`), so the deployed tree is this tree.

**The audit's `2/26/2026` cannot be produced from any field in this repository.**
`new Date("2026-07-22").toLocaleDateString()` cannot yield `2/26/2026` in any locale. No field
in either region file holds `2026-02-26`. Candidates checked and excluded:
`model.training_data_cutoff` = `2024-06-01`, `model.model_card_version` = `1.0`,
`health_stats[].year` = 2023, `exposure_layers[].year` = 2022/2023,
`graph.metadata.generated_at` = `2026-03-07`. **Reported, not "fixed"** — most likely a stale
deployment or a misread at audit time.

**The real defect, which is genuine and worth fixing:** the two surfaces use *different
formatters* on the same field. `CommunityRegionsList.tsx:24` pins an explicit `"en-US"` locale;
`[region]/page.tsx:38` calls bare `.toLocaleDateString()`, whose output depends on the build
machine's ICU default locale. That is **non-deterministic across build environments** and can
diverge from the index page on any machine that is not `en-US`. 2R.5 therefore normalizes the
*formatter*, and changes **no data value**.

---

## F. Sensor data presence

**`pipeline/sources/deq_data_center_air_monitoring_hourly.csv` — exists, header only.**
- **0 data rows** (file is a single header line, no trailing newline).
- Columns (**12**): `site_id, site_label, sensor_unit_id, locality, latitude, longitude, timestamp_local, pm25_ugm3, no2_ppb, co_ppm, qc_flag, is_collocated_ref`
- Distinct `sensor_id` values: **n/a** — no rows. Min/max `timestamp_local`: **n/a** — no rows.
- Per the session override this empty state is intentional and correct. **Not modified.**

> ⚠ **Contract mismatch for Phase 1 (deferred).** The main prompt specifies **9** columns
> (`sensor_id, sensor_name, latitude, longitude, timestamp_local, pm25_ugm3, no2_ppb, co_ppm,
> qc_flag`). The actual file has **12**, and the identity columns are named `site_id` /
> `site_label` / `sensor_unit_id`, **not** `sensor_id` / `sensor_name`. The `SensorSite` and
> `SensorReading` models in Phase 1.3 are written against the 9-column names and will not
> parse this file. Resolve before Phase 1 runs.

**`pipeline/sources/deq_sensor_site_history.csv` — exists, 8 data rows + header, UTF-8 with BOM.**
- Columns: `site_id, site_label, locality, sensor_unit_id, start_date, end_date, is_collocated_ref, notes`
- Contains `TO_CONFIRM` tokens in `sensor_unit_id` and elsewhere. Per the session override
  these are intentional. **Not resolved, not inferred, not looked up. Not modified.**

> ⚠ **School-name finding, relevant to Phase 1.3 and lint rule 3.** Row 1 has
> `site_id=ashburn-collocated`, `site_label=` **`Broad Run HS`** — a school name in a sensor
> label, exactly the case the `display_label` substitution rule exists to catch.
> **The specified regex `/(School|Elementary|Middle|High)\b/` does not match `HS`.** The rule
> as written would pass this row through. Both the schema validator and the lint need an
> abbreviation alternation (`HS`, `MS`, `ES`) before Phase 1 or Phase 5 can be trusted.
> Row 2 `site_label=Dulles Airport` is a facility, not a school, and is unaffected.

---

## G. Rendering path — `data/community/*.json` → page

```
data/community/<region>.json
  └─ site/scripts/copy-data.js          copies data/ → site/_data/ at build time
       └─ site/src/lib/data.ts
            resolveDataDir()  L16-33   → site/_data (Vercel/CI) | ../data (local) | ./data
            getCommunityRegion(slug)   L114-117  reads _data/community/<slug>.json, sync
            getCommunityRegionSlugs()  L125-134  readdirSync of _data/community/
       ├─ site/src/app/community/page.tsx            (index)
       │    maps slugs → {slug, region_id, name, geo_level,
       │                  health_stats_count, exposure_layers_count, last_updated}
       │    → <CommunityRegionsList regions={…} />   "use client"
       └─ site/src/app/community/[region]/page.tsx   (detail)
            generateStaticParams() ← getCommunityRegionSlugs()
            getCommunityRegion(region) → notFound() if null
            → <Breadcrumbs> <header> <CommunityRegionDetail region={data} />
              <EvidenceLimitations>{…}<p>{data.limitations}</p></EvidenceLimitations>
```

The route is the **dynamic `[region]` segment**, statically pre-rendered via
`generateStaticParams`. `next.config.js` sets `output: "export"`; there is no runtime API.

**Bearing on Phase 5 (deferred):** `/community/data-center-alley` does **not** need a new
static segment. Dropping `data/community/data-center-alley.json` into the directory would make
`getCommunityRegionSlugs()` emit it automatically — but it would then render through the
**generic region template**, not the bespoke page Phase 5 specifies, and it would appear as a
card on the `/community` index. Phase 5 specifies a dedicated route file
(`site/src/app/community/data-center-alley/page.tsx`), which in Next.js App Router takes
precedence over the dynamic segment. The collision is benign but must be deliberate.
Separately, the file cannot conform to `CommunitySchema` (see §A).

---

## H. Constraint violations already present

Full-tree scan, case-insensitive whole-word, over `site/src/**`, `data/**`, `content/**`
(`.tsx .ts .json .mdx .md`), excluding `node_modules`, `site/out`, `site/_data`.

**201 hits across 68 files.** Tiered per the lexicon ruling:

| Tier | Rule | Hits | Files |
|---|---|---|---|
| **A** — hard fail everywhere | `causes` 25, `drives` 24, `causal` 14, `drivers` 8, `driver` 8, `driving` 4, `unchecked` 3, `your environment` 1, `harms` 1, `your genetic` 1, `your DNA` 1 | **90** | 47 |
| **B** — fail in headings/titles/labels/alt/aria; warn in body prose & MDX | `due to` 9, `effect of` 8, `leads to` 8, `effects of` 4 | **29** | 19 |
| **Unassigned — needs a ruling at GATE 3** | `triggers` 49, `linked to` 15, `at risk` 6, `high risk` 5, `causing` 3, `caused` 2, `predisposed` 1 | **82** | 42 |

Zero hits for: `poisons`, `contaminates`, `exceedance`, `exposes`, `exposing`, `harming`,
`sprawl`, `sacrificed`, `deserve`, `must act`, `should be required`, `at what cost`,
`Big Tech`, `crisis`, `because of`, `impacts`, `responsible for`, `makes it worse`,
`makes the other worse`, `your genes`, `your genetics`, `your risk`, `your exposure`,
`all data points are cited`, `every claim is cited`, `cites its sources`, `fully cited`.

### H1 — In-scope hits (fixable this session), file:line and exact string

| File:line | Term | String |
|---|---|---|
| `site/src/app/page.tsx:131` | `drivers` | `Each module maps genetic architecture, environmental drivers, and` |
| `site/src/components/CommunityRegionDetail.tsx:423` | `drivers` | `<section aria-labelledby="shap-drivers-heading">` |
| `site/src/components/CommunityRegionDetail.tsx:424` | `drivers` | `<h2 id="shap-drivers-heading" className="text-h2 text-surface-white mb-3">` |
| `site/src/components/CommunityRegionDetail.tsx:425` | `drivers` | `Model Drivers (SHAP)` |
| `data/community/loudoun-county-va.json:31` | `drivers` | `…may not fully capture Loudoun-specific drivers (e.g., rapid suburbanization, data center development).` |
| `data/community/loudoun-county-va.json:31` | `due to` | `…may have wide confidence intervals due to population size.` |
| `data/community/fairfax-county-va.json:89` | `drivers` | `…may not fully capture Fairfax-specific drivers…` |

`CommunityRegionDetail.tsx:425` is the only **Tier-A term in a rendered heading**, and is the
position where no suppression is permitted.

### H2 — In-scope, **not** violations (must be excluded by the lint, not fixed)

| File:line | Term | Why it is not a violation |
|---|---|---|
| `site/src/components/CommunityRegionDetail.tsx:14` | `drives` | `//` comment: "…never drives the view for a region…". Not DOM-reaching. |
| `site/src/components/CommunityRegionDetail.tsx:164` | `causes` | `{/* … */}` comment: "…hover/open causes no layout shift." Not DOM-reaching. |
| `site/src/app/page.tsx:46` | `at risk` | Logo `alt`: `GENARCH — Genetic Epidemiology Network for At Risk Community Health`. The acronym expansion. |
| `site/src/app/page.tsx:57` | `at risk` | Same string as the hero tagline. |
| `site/src/app/methods/page.tsx:329` | `causal` | `…not experimentally validated causal models.` A **disclaimer denying** causality. Banning it inverts its meaning. |

These five are the evidence that a flat lexicon over raw file text produces false positives.
The lint must extract DOM-reaching strings only, and needs an exact-phrase allowlist for the
GENARCH acronym plus disclaimer-context handling.

### H3 — Out-of-scope hits (READ-ONLY this session; to be baselined)

Top files by hit count: `data/graph/graph.json` 17 · `content/briefs/asthma-air-pollution-ormdl3.mdx`
16 · `site/src/app/atlas/pathways/[slug]/page.tsx` 11 · `site/src/app/glossary/page.tsx` 8 ·
`data/search-index.json` 6 · `data/briefs/jak-stat-psoriasis-ibd-environment.json` 5 ·
`data/genes/serpina1.json` 5 · `data/pathways/hpa-axis.json` 5 · `data/pathways/il33-st2-axis.json` 5 ·
then 59 further files at ≤4 each.

`data/{diseases,genes,pathways,exposures}/` and `content/briefs/` are read-only per the fence.
`site/src/app/atlas/**` and `site/src/app/glossary/page.tsx` are existing page templates,
excluded by the main prompt. All go to `docs/lint-baseline.json` in Phase 3.

---

## Findings that contradict the audit or the work package

### F1 — 2R.4's premise is false. Struck.
Homepage counts are already build-time derived; there is no literal to remove. See §D.
Per decision: derivation unchanged; relabel `Genes` → `Gene modules` and `Pathways` →
`Pathway modules` (the two that split); document both counts on Methods.

### F2 — The date defect is a formatter bug, not a source bug. See §E.
Both surfaces already read one field. `2/26/2026` is unreproducible. Fix the formatter; change
no data.

### F3 — The mojibake is real, confined to one file, and traced to one bare read.
**83 double-encoding markers, all in `data/graph/graph.json`** — `Ã` ×10, `Â` ×10, `Î` ×9,
`â€` ×54. Rendering as `NF-ÎºB Signaling Pathway`, `SNP-based hÂ² is ~0.24`, `GÃ—E`,
`0.08â€"0.15`. Every file under `pipeline/sources/` and every entity JSON decodes as clean
strict UTF-8 with **zero** markers — verified byte-level. The corruption exists only in the
generated artifact.

`PYTHONUTF8=1` is a **workaround, not a fix**. Every file-IO call site in `pipeline/` was
enumerated; **9 are bare**, the rest already pass `encoding="utf-8"`:

| Call site | Statement | In fence? |
|---|---|---|
| `pipeline/validate.py:86` | `raw = json.loads(f.read_text())` | ✅ yes |
| `pipeline/validate.py:104` | `raw = json.loads(f.read_text())` | ✅ yes |
| `pipeline/validate.py:132` | `raw = json.loads(f.read_text())` | ✅ yes |
| `pipeline/validate.py:172` | `raw = json.loads(f.read_text())` | ✅ yes |
| `pipeline/validate.py:263` | `raw = json.loads(fp.read_text())` | ✅ yes |
| `pipeline/validate.py:304` | `graph_raw = json.loads(graph_path.read_text())` | ✅ yes |
| `pipeline/validate.py:325` | `raw = json.loads(fp.read_text())` | ✅ yes |
| `pipeline/validate.py:336` | `raw = json.loads(fp.read_text())` | ✅ yes |
| **`pipeline/graph_builder.py:30`** | `result[subdir].append(json.loads(f.read_text()))` | ❌ **no** |

Already correct and untouched: `emit.py:25/35/45/55`, `fetch_geo.py:82/128`,
`graph_builder.py:238`, `ingest.py:24/34/43`, `report.py:46`, `validate.py:220`.

**The 8 in `validate.py` are in scope and will be fixed in Phase 2B.5 Part 1.** That makes
validation deterministic on Windows and stops its `except Exception: pass` blocks silently
swallowing decode failures — but `validate.py` only *reads*, so **it does not fix the
mojibake**. The single call that *writes* the corruption is `graph_builder.py:30`, which is
out of fence. **Reported, not touched.**

### F4 — `data/graph/graph.json` is not reproducible from the current pipeline. **Determinism violation.**

A clean in-memory rebuild (`build_graph()` under `PYTHONUTF8=1`, nothing written):

```
                    committed      clean rebuild
nodes                      97      72
  gene                     52      26
  pathway                  11      12
  disease / exposure    19/15      19/15
edges                     165      211
mojibake markers           83      0
gsdmb                  absent      present
il33-st2-axis          absent      present
edge types        modifier, association,   modifier, association,
                  pathway, GÃ—E, GWAS      pathway
```

The 27 extra gene nodes and the edge types `GÃ—E` and `GWAS` are produced by **no code path
that exists today**. `build_nodes` (`graph_builder.py:36-95`) mints gene nodes **only** from
gene files. So the committed artifact is output from an older builder, and `52` is a fossil.
`gsdmb` and `il33-st2-axis` are missing purely because the artifact predates the current data.

**Regeneration is blocked inside the accepted fence.** `build_edges` still mints edges from
disease `top_loci` gene symbols while `build_nodes` no longer mints matching nodes. A clean
rebuild therefore yields **38 orphan-endpoint edges across 35 missing gene ids** (`il1rl1` ×2,
`cacna1c` ×2, `il23r` ×2, then 32 more at ×1), and `validate()` rule 4 (L300-316) would fail
with 38 errors. **The committed graph passes today (exit 0) only because those fossil nodes
are still in it.** Repair requires editing `graph_builder.py:build_nodes` — out of fence.

Load-bearing consequence: `il1rl1` (ST2, the IL-33 receptor) carries **2 edges but no node** in
the rebuild — it is one of the 27 fossils, and the IL-33/ST2 axis is the mechanism the
Data Center Alley page is built on.

**Disclosure requirement (standing, regardless of the regeneration decision):** the committed
graph artifact is not reproducible from the current pipeline. This violates the project's
stated determinism guarantee. It must be disclosed in the README's known-limitations section
and fixed before the repository is made public. A validator rule that rebuilds the graph in
memory and hard-fails on drift is specified for Phase 2B.3 so a fossil can never persist
silently again.

---

## Logged out of scope — not touched

- **`site/src/components/charts/*`** — dead code, verified four ways (see fence mapping).
- **`pipeline/graph_builder.py`** — fix site for both F3 (write-path encoding) and F4 (node
  minting). Out of fence.
- **Health-burden bar-height bug**, `CommunityRegionDetail.tsx:371`.
  `<div className="flex items-end gap-2 h-24">` sets `align-items: flex-end`, so each column
  sizes to content instead of stretching; the bars' percentage heights (L376, L388, L400) then
  resolve against an auto-height parent and collapse to 0px.
  **Interaction with 2R.6, flagged for a decision at GATE 2-REVISED:** Loudoun's `health_stats`
  already carry `comparison_national` on both metrics and a CI on the hospitalization metric,
  so all three bars and the CI already render in the DOM. 2R.6 adds assertions and a generated
  sentence, not new bars — the bug does not *worsen*. The risk is subtler and worse: 2R.6's
  completeness assertion checks **DOM presence** and the lint checks **rendered strings**;
  neither can see that all three bars have zero visual height. Acceptance row 26 would report
  PASS on "renders all comparison tiers" while the comparison is visually invisible — false
  assurance on precisely the row added to prevent selective presentation. One-line fix
  (`items-end` → `items-stretch`, or give the column an explicit height), but not one of the
  six named 2R changes.
- **`data/search-index.json`** (75 entries, 6 lexicon hits) — no generator stage in
  `run_update`; appears hand-maintained. Baselined.

---

---

# GATE 0 decisions — execution record

Decisions D1–D7 issued 2026-08-09. Recorded here in order.

## D1 — 2R.4 struck (audit premise false)

**Logged as instructed.** The audit asserted the homepage carries a hardcoded `26 Genes`
literal. It does not. `site/src/app/page.tsx:112-115` derives all four counts at build time
from `getAllDiseases()/getAllExposures()/getAllGenes()/getAllPathways()`, each a directory
listing of `data/<type>/`. **The audit finding was incorrect.** 26 gene modules is the correct
number for what the tile labels. Phase 2R.4's remediation ("remove every hardcoded count
literal") has no target and is struck from the work package.

Carried into Phase 2-REVISED: relabel the tile `Genes` → **Gene modules**; add the
modules-vs-graph-nodes distinction to Methods with **both** counts derived at build time.
`Pathways` also splits (12 files vs 11 committed graph nodes) and takes the same treatment;
`Diseases` and `Exposures` match at 19 and 15 and keep their labels.

## D2 — 2R.5 retargeted: locale audit

Value reconciliation dropped. Full audit of every `toLocale*` call in `site/src`:

| File:line | Call | Locale | Format | Verdict |
|---|---|---|---|---|
| `site/src/app/community/[region]/page.tsx:38` | `toLocaleDateString()` | **none** | **none** | ❌ **the only bare date call in the tree** |
| `site/src/components/CommunityRegionsList.tsx:24` | `toLocaleDateString` | `en-US` | `year:numeric, month:short, day:numeric` | ✅ target format |
| `site/src/app/updates/page.tsx:8` | `toLocaleDateString` | `en-US` | `year:numeric, month:short, day:numeric` | ✅ |
| `site/src/app/updates/[slug]/page.tsx:12` | `toLocaleDateString` | `en-US` | `year:numeric, month:short, day:numeric` | ✅ |
| `site/src/app/mechanism-briefs/page.tsx:8` | `toLocaleDateString` | `en-US` | `year:numeric, month:short, day:numeric` | ✅ |
| `site/src/app/field-notes/page.tsx:10` | `toLocaleDateString` | `en-US` | `year:numeric, month:**long**, day:numeric` | ⚠ pinned, but a third format |
| `site/src/components/GraphPageClient.tsx:287` | `sample_size.toLocaleString()` | none | — | ⚠ **number**, not date; locale-dependent thousands separator |
| `site/src/components/GraphPageClient.tsx:616` | `sample_size.toLocaleString()` | none | — | ⚠ same |

**Result: exactly one bare date render exists**, and it is the one the audit surfaced.
Phase 2-REVISED pins `[region]/page.tsx:38` to `en-US` with
`{year:"numeric", month:"short", day:"numeric"}`, matching `CommunityRegionsList.tsx:24`.
The two `toLocaleString()` number calls are non-deterministic across build locales for the
same reason and are logged for a separate ruling — they are not dates and are not in 2R.5's
scope.

## D3 — Citation ID namespacing: written proposal only. No code changed.

### The defect

Reference IDs are **file-local** (`ref1`–`ref11`, 266 records, 11 distinct tokens). The six
edge-minting branches in `build_edges` copy `citations` verbatim into edge `sources` with no
namespace, so `sources: ["ref1"]` on an edge is unresolvable without knowing the owning file.
`validate.py:_collect_citation_ids` pools every ID into one flat set, so every token
"resolves" and the defect is invisible to validation.

### Proposed scheme — `<entity_type>/<entity_slug>#<local_id>`

Example: `diseases/asthma#ref1`. Chosen over the two alternatives:

| Option | Verdict |
|---|---|
| **`<entity_type>/<entity_slug>#<local_id>`** | **Recommended.** Purely mechanical to derive — the owning file is already known at mint time. Requires no new metadata, no lookup, and invents nothing. Stable under file renames only if slugs are stable, which the slug-filename validator (rule 5) already enforces. |
| DOI-derived stable IDs (e.g. `doi:10.1038/nature06014`) | **Rejected for now.** Semantically ideal and would deduplicate the same paper across files — but 3 records have neither DOI nor URL, and §B3 shows 4 DOI/title contradictions. Deriving IDs from DOIs would bake those contradictions into the identifiers. Revisit *after* B3 is resolved. |
| Globally renumbering to unique `ref1..refN` | **Rejected.** Renumbering 266 records by hand invites transcription error, and it destroys the local numbering that the per-page reference lists render from. |

### What it touches

1. `pipeline/graph_builder.py` — the six `sources=` sites in `build_edges` prefix with the
   owning entity's `<type>/<slug>#`. Mechanical; owner is in scope at every call site.
2. `pipeline/validate.py` — `_collect_citation_ids` becomes a `dict[file, set[id]]`; the
   citation check resolves **within the owning file** instead of against a flat pool. This is
   the change that makes the defect detectable.
3. `site/src/components/GraphPageClient.tsx` — split the namespaced ID and render via
   `CitationRenderer` instead of `sources.join(", ")`.
4. `site/src/lib/types.ts` — no change; `sources` stays `string[]`.
5. Entity JSON files — **no change**. Local IDs stay local. This is the property that makes
   the migration safe: the 266 records are untouched, and only the derived graph changes.

### Migration path

Regenerate the graph after the `build_edges` change. Because the namespace is derived rather
than authored, no data file is hand-edited and no citation is invented. Blocked behind D4 —
the graph cannot be regenerated until the orphan-edge defect is resolved.

### Resolvability, measured against the 165 committed edges

Computed by replaying all six `build_edges` branches to recover each edge's owning file, then
checking each token against that file's own `references` array:

| Outcome | Edges | Tokens |
|---|---|---|
| **Fully resolvable automatically** under the scheme | **145** | 264 of 265 |
| Needs **manual reassignment** — token does not exist in the owning file | **1** | 1 |
| Needs **manual reassignment** — edge not reproducible by current `build_edges`, so no owner can be derived | **7** | 7 |
| Empty `sources`, nothing to resolve | 12 | 0 |

**145 of 153 cited edges (94.8%) become resolvable with zero human input.** The 8 exceptions:

- **`e164`** `physical-activity → obesity` (modifier), `sources: ["ref3"]`, owner
  `data/exposures/physical-activity.json`, which has only `ref1` and `ref2`. A genuinely
  dangling local ID — and a live example of what the flat pool hides, since `ref3` exists in
  50 other files.
- **`e155`–`e158`, `e161`–`e163`** — seven edges carrying the fossil types `GÃ—E` (×3) and
  `GWAS` (×2) plus two `pathway` edges in a shape the current builder does not produce
  (`gstp1→asthma`, `air-pollution→gstp1`, `bdnf→major-depressive-disorder`,
  `psychosocial-stress→bdnf`, `air-pollution→oxidative-stress-response`,
  `pparg→type-2-diabetes`, `lep→obesity`). These have no derivable owner and need a human
  ruling — they overlap the D4 fossil problem.

**No code changed. Awaiting approval of the scheme.**

## D4 — Graph regeneration deferred. Analysis only.

### (a) What is gained and what is lost — the contradiction resolved

**Yes — the contradiction is real and is exactly as you suspected.** A rebuild:

- **Gains 2 nodes:** `gsdmb` (gene, label `GSDMB`) and **`il33-st2-axis` (pathway, label
  `IL-33/ST2 Signaling Axis`)**.
- **Loses 27 nodes**, all `gene`, including **`il1rl1`** — which *is* ST2, the receptor the
  IL-33/ST2 axis is named for.

So a rebuild **adds the IL-33/ST2 pathway node while deleting its receptor**, and edge `e182`
(`il1rl1 → il33-st2-axis`, type `pathway`) becomes an orphan. The single most load-bearing
mechanism on the site — PM2.5 → IL-33 → ST2 → type-2 inflammation → asthma — ends up with the
pathway present, the ligand (`il33`) present, and the receptor missing. This alone is
sufficient reason not to regenerate as-is.

### (b) The 27 fossil nodes — every one is a curated locus

All are `type: gene`, none has a file in `data/genes/`, and **all 27 are referenced by a
disease `top_loci` entry.** They are not junk.

| node | label | referenced by `top_loci` | `key_genes` | brief |
|---|---|---|---|---|
| `agt` | AGT | hypertension | — | — |
| `apc` | APC | colorectal-cancer | — | — |
| `apob` | APOB | coronary-artery-disease | — | — |
| `app` | APP | alzheimers-disease | — | — |
| `c4a` | C4A | schizophrenia | — | — |
| `cacna1c` | CACNA1C | bipolar-disorder, schizophrenia | — | — |
| `chrna5` | CHRNA5 | lung-cancer | — | — |
| `ctla4` | CTLA4 | rheumatoid-arthritis | — | — |
| `cyp27b1` | CYP27B1 | multiple-sclerosis | — | — |
| `fam13a` | FAM13A | copd | — | — |
| `fgfr2` | FGFR2 | breast-cancer | — | — |
| `grin2a` | GRIN2A | schizophrenia | — | — |
| `hhip` | HHIP | copd | — | — |
| `htr2a` | HTR2A | major-depressive-disorder | — | — |
| **`il1rl1`** | **IL1RL1** | **asthma** | **il33-st2-axis** | **`content/briefs/asthma-air-pollution-ormdl3.mdx`** |
| `il2ra` | IL2RA | multiple-sclerosis | — | — |
| `lpa` | LPA | coronary-artery-disease | — | — |
| `mlh1` | MLH1 | colorectal-cancer | — | — |
| `mmp12` | MMP12 | copd | — | — |
| `psen1` | PSEN1 | alzheimers-disease | — | — |
| `psen2` | PSEN2 | alzheimers-disease | — | — |
| `ptpn22` | PTPN22 | rheumatoid-arthritis | — | — |
| `rad50` | RAD50 | asthma | — | — |
| `slc30a8` | SLC30A8 | type-2-diabetes | — | `data/briefs/pparg-diet-type2diabetes.json` |
| `smad7` | SMAD7 | colorectal-cancer | — | — |
| `tmem18` | TMEM18 | obesity | — | — |
| `umod` | UMOD | hypertension | — | — |

**Internal-link risk: none.** `GraphPageClient.tsx:85-91` routes gene nodes to
`/atlas/genes-pathways?gene=<slug>` — a **query parameter on an existing page**, not a
dynamic route — so a fossil node cannot 404. (Whether that page renders a useful state for an
unknown gene was not verified and is out of scope.)

### (c) The 38 orphan edges a rebuild would produce

All type `association` except the last. `missing` is the endpoint with no node.

| edge | source → target | missing |
|---|---|---|
| e6 | app → alzheimers-disease | app |
| e7 | psen1 → alzheimers-disease | psen1 |
| e8 | psen2 → alzheimers-disease | psen2 |
| e16 | il1rl1 → asthma | il1rl1 |
| e17 | rad50 → asthma | rad50 |
| e21 | flg → atopic-dermatitis | **flg** |
| e22 | il13 → atopic-dermatitis | **il13** |
| e25 | cacna1c → bipolar-disorder | cacna1c |
| e26 | ank3 → bipolar-disorder | **ank3** |
| e34 | fgfr2 → breast-cancer | fgfr2 |
| e38 | apc → colorectal-cancer | apc |
| e39 | mlh1 → colorectal-cancer | mlh1 |
| e40 | smad7 → colorectal-cancer | smad7 |
| e46 | hhip → copd | hhip |
| e47 | fam13a → copd | fam13a |
| e48 | mmp12 → copd | mmp12 |
| e54 | apob → coronary-artery-disease | apob |
| e56 | lpa → coronary-artery-disease | lpa |
| e61 | agt → hypertension | agt |
| e62 | umod → hypertension | umod |
| e65 | nod2 → inflammatory-bowel-disease | **nod2** |
| e66 | il23r → inflammatory-bowel-disease | **il23r** |
| e70 | pitx2 → ischemic-stroke | **pitx2** |
| e71 | hdac9 → ischemic-stroke | **hdac9** |
| e75 | chrna5 → lung-cancer | chrna5 |
| e83 | htr2a → major-depressive-disorder | htr2a |
| e88 | cyp27b1 → multiple-sclerosis | cyp27b1 |
| e89 | il2ra → multiple-sclerosis | il2ra |
| e96 | tmem18 → obesity | tmem18 |
| e100 | hla-c → psoriasis | **hla-c** |
| e101 | il23r → psoriasis | **il23r** |
| e107 | ptpn22 → rheumatoid-arthritis | ptpn22 |
| e109 | ctla4 → rheumatoid-arthritis | ctla4 |
| e114 | cacna1c → schizophrenia | cacna1c |
| e115 | c4a → schizophrenia | c4a |
| e116 | grin2a → schizophrenia | grin2a |
| e122 | slc30a8 → type-2-diabetes | slc30a8 |
| **e182** | **il1rl1 → il33-st2-axis** (type `pathway`) | **il1rl1** |

**35 distinct missing ids: the 27 fossils plus 8 more** — `flg`, `il13`, `ank3`, `nod2`,
`il23r`, `pitx2`, `hdac9`, `hla-c` (bold above). These 8 are *not* in the committed graph at
all, in either nodes or edges: they are loci added to disease files after the artifact was
last generated. They are further evidence the committed artifact is stale, and they mean the
orphan problem is **larger than the fossil set**.

### (d) Recommendation — `build_nodes` should resume minting. Not implemented.

**Recommended: `build_nodes` resumes minting a node for every gene symbol referenced by a
`top_loci` or `key_genes` entry, flagged to distinguish it from a curated module.**

Reasoning:

1. **The alternative destroys curated content.** Stopping `build_edges` from minting would
   delete 38 real, cited GWAS associations from the knowledge graph — including
   `asthma → IL1RL1` and `asthma → RAD50`. Those associations are curated in disease files
   with strength scores and citations. The graph would silently become less complete than the
   data it is built from.
2. **All 27 are legitimate graph content.** Every one is a `top_loci` entry in a curated
   disease file. A locus with a real GWAS association but no standalone module page is normal
   for a knowledge graph; it is only a problem for a *module index*.
3. **The precedent already exists in the validator.** `validate.py:280-285` already treats
   exactly this pattern — a gene referenced by a pathway's `key_genes` with no data file — as
   a **warning, not an error**. The node-minting behaviour matches the validator's existing
   tolerance; the current builder does not.
4. **D1 removed the motive to suppress them.** The count confusion (26 vs 52) was the reason
   to want fewer gene nodes. Relabelling the tile "Gene modules" fixes that at the display
   layer, where it belongs. Suppressing graph nodes to make a homepage number look right would
   be the wrong fix in the wrong place.
5. **No 404 risk** — see (b); gene links are query-parameter based.

**Required alongside it:** minted nodes need a distinguishing attribute (e.g.
`attrs.has_module: false`) so the UI can render a locus-only node differently from a curated
module and not imply a page that does not exist. `GraphNodeAttrs` (`schemas.py:352-357`)
currently allows only `summary`, `confidence`, `last_updated` and is `extra="forbid"`, so this
needs a schema field.

**Not implemented. `pipeline/graph_builder.py` node and edge minting logic is untouched.**

### Determinism caveat for the future drift validator

`build_graph()` sets `metadata.generated_at` from `datetime.utcnow()` — a wall-clock value
(`'2026-08-09'` today vs `'2026-03-07'` committed). **Any rebuild-and-compare validator must
exclude `metadata.generated_at`, `node_count`, and `edge_count`, or it will trip on itself.**
Logged to `docs/PROMPT_AMENDMENTS.md`.

## D5 — Encoding fix applied (narrow exception)

**9 call sites changed, all bare `read_text()` → `read_text(encoding="utf-8")`:**

| File | Lines |
|---|---|
| `pipeline/validate.py` | 86, 104, 132, 172, 263, 304, 325, 336 |
| `pipeline/graph_builder.py` | 30 |

`graph_builder.py` diff is **exactly one line** (`git diff --stat`: `2 +-`). Node minting,
edge minting, and every other line are untouched, per the narrow exception.

**Verified on Windows with no `PYTHONUTF8` set** (`echo $PYTHONUTF8` → empty):

```
$ python -m pipeline validate
WARNING: data/pathways/il33-st2-axis.json: Referenced gene slug 'il1rl1' has no data file (warning)
Validation passed: all schemas, cross-links, citations, graph integrity, and completeness OK.
EXIT=0

$ python -c "... build_graph() ..."
mojibake markers in rebuild: {'Ã': 0, 'Â': 0, 'Î': 0, 'â€': 0}
NF-κB label present correctly: True
```

**As predicted, this does not clear the existing mojibake** — the 83 markers in the committed
`data/graph/graph.json` remain, because clearing them requires regenerating, which is deferred
behind D4. It does stop **new** mojibake: any future rebuild on any platform now reads UTF-8
explicitly. `ruff check pipeline/` could not be run locally (ruff is not installed; CI installs
it from `pipeline/requirements.txt`); the change is a pure keyword-argument addition.

## D6 — Lexicon false positives

Handling for the five hits from §H2, to be implemented in Phase 3:

| Hit | Handling |
|---|---|
| `CommunityRegionDetail.tsx:14` (`drives`, in a `//` comment) | Excluded by extraction — the lint reads DOM-reaching strings only, so comments never enter the hit set. A `constraint-ok` marker on a comment line would be inert. **Reported rather than added.** |
| `CommunityRegionDetail.tsx:164` (`causes`, in a `{/* */}` comment) | Same. |
| `page.tsx:46` (logo `alt`) | **Whitelisted exact phrase**, per instruction. |
| `page.tsx:57` (hero tagline) | Same whitelist entry. |
| `methods/page.tsx:329` (`causal`, in a disclaimer) | Negation handling + explicit suppression — see below. |

**Whitelist entry.** The instruction specifies `"At-Risk Community Health"` (hyphenated). The
strings in the tree are **unhyphenated** — `Genetic Epidemiology Network for At Risk Community
Health` at both `page.tsx:46` and `page.tsx:57`, and the same unhyphenated form appears in the
logo asset name. The whitelist will carry **both** spellings so it matches what is actually
rendered today and does not break if the name is later hyphenated.

**Negation detection: feasible, but only as a downgrade — not as a silent pass.**

A tight heuristic works on the real case: scan backwards from the banned term, within the same
sentence and a window of ~5 tokens, for a negation cue (`not`, `never`, `no`, `cannot`,
`without`, `rather than`, `does not`, `is not`, `are not`). `methods/page.tsx:329` reads
"…not experimentally validated **causal** models", where `not` sits 3 tokens before `causal`
— detected cleanly.

But it is a heuristic over natural language and it fails in both directions:
`"PM2.5 does not merely cause irritation, it causes remodeling"` would be wrongly exempted,
and negation carried across a sentence boundary would be missed. On a site where the whole
point is that no causal claim slips through, **a heuristic that can silently exempt a real
violation is worse than no heuristic.**

**Recommendation:** implement it, but a negated hit is **downgraded to a printed advisory, not
removed** — it appears in output as `NEGATED (review)` and does not fail the build. This keeps
every occurrence visible to a human. Combined with an explicit
`// constraint-ok: disclaimer denying causation` at `methods/page.tsx:329`, the correct usage
is both documented and auditable. Confirm at GATE 3.

## D7 — Contract breaks recorded

Written to **`docs/PROMPT_AMENDMENTS.md`** — four PENDING amendments (A1 DEQ column mapping,
A2 school-regex abbreviation gap, A3 `CommunitySchema` extras prohibition, A4
`population_limitations` does not exist), each quoting the real schema or header as read from
this repository. Nothing fixed; all four belong to deferred phases.

---

## Gate 0 status

| Item | Value |
|---|---|
| Files created | `REPORT.md`, `docs/PROMPT_AMENDMENTS.md` |
| Files modified | `pipeline/validate.py`, `pipeline/graph_builder.py` (D5 only) |
| Lines changed | 8 insertions / 8 deletions across 2 files |
| `python -m pipeline validate` | **exit 0, no `PYTHONUTF8` set** (1 pre-existing warning: `il33-st2-axis.json` references gene slug `il1rl1`, which has no data file — the same `il1rl1` at the centre of D4) |
| `ruff check pipeline/` | not runnable locally (ruff not installed); change is a keyword-arg addition |
| `TODO_` tokens emitted | none |
| Citation fields populated with values not read from this repository | **none** |
| Graph regenerated | **no** — deferred per D4 |
| Pushed to a remote | no |

**GATE 0 decisions complete. Proceeding to Phase 3.**

---

# Phase 3 — constraint lint built and run once

`scripts/check-constraints.mjs` created; `check:constraints` added to the `package.json`
scripts block. **No dependency added. `ci.yml` not touched. Nothing fixed.**

## Result — `npm run check:constraints`, exit 1 (expected)

```
scanned 155 files
TIER A -- errors (banned in every DOM string):        50   (26 files)
TIER B -- errors (heading/label position):             0
TIER B -- warnings (body prose, non-blocking):        18
NEGATED -- advisory, review (non-blocking):            6
UNASSIGNED -- awaiting a tier ruling (non-blocking):  36
STRUCTURAL RULES:                                      0 findings
SUPPRESSIONS USED:                                     0
50 violations, 0 baselined, 50 new
```

**Baseline deliberately not written.** Its contents depend on the UNASSIGNED ruling, so
writing it now would bake in a tier assignment you have not made. `docs/lint-baseline.json`
is created after the ruling, via `--update-baseline "<reason>"`.

## Extraction quality — 201 raw matches reduced to 110 real ones

The DOM-aware extractor removed **91 false positives** that a flat text search reports:

| Excluded class | Why | Example |
|---|---|---|
| Code comments | Not DOM-reaching | `CommunityRegionDetail.tsx:14` `// …never drives the view` |
| **`references[].title`** | **Quoted published material** | `copd.json` `HHIP haploinsufficiency causes emphysema` — a paper title. Flagging it as Tier A would pressure an author to **falsify a citation**, which is worse than the banned word. JSON is parsed, not line-scanned, so the walker knows when it is inside `references`. |
| Non-display JSON keys | Not rendered | ids, slugs, urls, enum values |
| Duplicate extractions | One string, several rules | `Model Drivers (SHAP)` matched as heading + JSX text + 2× identifier → 1 hit |
| GENARCH acronym | The project's own name | whitelisted, both spellings |

**Structural rules: 0 findings.** `comparison_national` and `ci_lower` are both rendered by
`CommunityRegionDetail.tsx`, so the completeness assertions pass. **Read this against the
caveat already logged**: these check *DOM presence*, and the bars collapse to 0px height, so
a pass here is not evidence the comparison is visible.

The school-proximity rule initially produced 7 false positives — `MS` matching *multiple
sclerosis*, and `High` matching the confidence tier. Tightened to require a capitalized
preceding token, so `Broad Run HS` matches and `Multiple sclerosis (MS)` does not. Now 0
findings, and it still catches the A2 abbreviation gap.

## In-scope Tier A hits — the Phase 2-REVISED work list

| File:line | Term | Context | Fix |
|---|---|---|---|
| `site/src/app/page.tsx:130` | `drivers` | jsx-text | 2R.3 |
| `site/src/components/CommunityRegionDetail.tsx:424` | `drivers` | **heading** | 2R.1 — no suppression permitted in this position |
| `site/src/components/CommunityRegionDetail.tsx:423` | `drivers` | identifier | 2R.1 — `id`/`aria-labelledby` rename |
| `data/community/loudoun-county-va.json:31` | `drivers` | json:limitations | 2R.2 — **currently misclassified, see below** |
| `data/community/fairfax-county-va.json:89` | `drivers` | json:limitations | 2R.2 — same |
| `data/community/loudoun-county-va.json:31` | `due to` | json:limitations | Tier B warning |

The remaining 45 Tier A hits are in read-only territory (`data/{diseases,genes,pathways,
exposures}/`, `content/briefs/`, and the derived `data/graph/graph.json` +
`data/search-index.json`) and are baseline candidates.

> Note: `graph.json` and `search-index.json` are **derived** and duplicate entity summaries,
> so ~10 of the 50 are the same string counted twice. Fixing a source entity clears both. The
> baseline will carry both copies; it shrinks by two when one source string is fixed.

## D6 follow-up — negation detection failed, with evidence

The heuristic ran on 6 hits. **4 correct, 2 false negatives — a 33% failure rate, and both
failures landed on a Phase 2-REVISED target.**

Correct (genuine disclaimers, correctly downgraded):

- `methods/page.tsx:327` — "…syntheses of existing evidence, **not** experimentally validated **causal** models"
- `ethics/page.tsx:141` — "…hypothesis-driven syntheses, **not** validated **causal** models"
- `ethics/page.tsx:126` — "…framed as correlative context, **not causal** attribution"
- `methods/model-card/page.tsx:172` — "…structural inequities **rather than causal** environmental…"

**Wrong** — both community `limitations` strings:

> "…may **not** fully capture Loudoun-specific **drivers** (e.g., rapid suburbanization, data center development)."

The cue `not` negates *capture*, not *drivers*. `drivers` is used in the plain causal sense —
and this is the exact string 2R.2 must rewrite. The heuristic would have waved it through.

**Recommendation: drop automatic negation detection. Use explicit
`// constraint-ok: <reason>` suppression on the four genuine disclaimers instead.** On a site
whose entire defensibility rests on no causal claim slipping through, a rule that silently
exempts a real violation one time in three is worse than no rule. Four hand-written
suppressions are auditable; a heuristic is not.

Nothing is currently hidden either way — negated hits still print, and they do not fail the
build. But the classification is wrong and should not survive to the baseline.
**Awaiting your ruling.**

## The 36 UNASSIGNED hits — for your ruling

| Term | Hits | Where it actually occurs | My proposed tier |
|---|---|---|---|
| `triggers` | 21 | Almost entirely molecular: `PM2.5 oxidative damage triggers IL-33 release from bronchial epithelium`, `Environmental Triggers` as a pathway-page section heading, `Stress triggers episodes`. | **Tier B.** Permit in body prose with a citation (the spec's molecular carve-out); fail when the object is a population or a person. Note `atlas/pathways/[slug]:63` uses it as a **heading** — Tier B would fail it there. |
| `linked to` | 8 | `Particulate matter exposure linked to depression`, `curated from peer-reviewed literature` contexts. | **Tier B**, matching the spec: banned in headings/titles/captions, permitted in body when followed by the evidence type. |
| `high risk` | 3 | `BRCA2 … high risk`, and a paper-title-like `provides a high risk` string in a disease file. | **Tier A.** "high risk" with a person or group as subject is a core prohibition. All 3 are read-only and would be baselined. |
| `caused` | 2 | `early-onset familial AD (5–10%) is caused by rare mutations` — a factual Mendelian statement. | **Tier A** for consistency with `causes`; both are read-only and baselined. |
| `causing` | 2 | `occlusion of cerebral arteries, causing focal brain ischemia` — intra-organism pathophysiology, not an exposure→population claim. | **Tier A** for consistency; baselined. |

The `causing`/`caused` cases are worth a moment: both describe **pathophysiology inside a
body**, not an environmental exposure acting on a population. The constraint exists to stop
the second. A strict reading bans the first too, which is scientifically ordinary language.
You may prefer a narrower Tier A that only fires when a banned verb takes an **exposure** as
subject or a **population** as object — that is more targeted but needs a term list of
exposures and population nouns to be checkable.

## One more term worth a ruling: `unchecked`

3 hits, all in `data/genes/serpina1.json` and its derived copies:

> "A1AT deficiency allows neutrophil elastase to degrade lung elastin **unchecked**"

This is the *biochemical* sense (a protease acting without inhibition), not the policy sense
("unchecked development") the constraint targets. Currently Tier A → error. It is read-only
and would be baselined, so it does not block — but it is a lexicon collision worth recording.

## Gate 3 status

| Item | Value |
|---|---|
| Files created | `scripts/check-constraints.mjs` |
| Files modified | `package.json` (scripts block only — **no dependency change**) |
| `npm run check:constraints` | **exit 1** — expected and correct on first run |
| `docs/lint-baseline.json` | **not written** — depends on the UNASSIGNED ruling |
| `.github/workflows/ci.yml` | **not touched** — wiring happens at the final-lint step |
| Anything fixed | **no** |
| Pushed to a remote | no |

**Phase 3 complete. Stopping at GATE 3.**

---

# GATE 3 rulings applied (R1–R9)

## Final counts — `npm run check:constraints`, exit 1

```
scanned 155 files
TIER A -- errors                         63
TIER B -- errors (heading/label)          0
TIER B -- warnings (body prose)          31
STRUCTURAL RULES                          0 findings
SUPPRESSIONS USED                         4
63 violations, 42 baselined, 21 new
  in-scope, must be fixed (never baselined):  21
  read-only, baselineable:                    42
```

Tier A rose 50 → 63: R2 promoted `leads to` / `led to` / `results in` / `resulting in` from
Tier B, and ruled in `caused`, `causing`, `high risk`. Offset by 4 explicit suppressions and
by `unchecked` ×3 de-escalating to Tier B.

## R1 — negation detection removed

**Automated negation detection was attempted, scored 4/6, and was removed by decision.**
Both failures were false negatives on the `data/community/*.json` `limitations` strings, where
`not` negates *capture* rather than *drivers* — the exact strings 2R.2 must rewrite. Deleted
from the script; the header documents why.

Four genuine disclaimers now carry explicit, auditable suppressions:

| File:line | Reason recorded |
|---|---|
| `site/src/app/methods/page.tsx:328` | `"not experimentally validated causal models"` |
| `site/src/app/ethics/page.tsx:127` | `"framed as correlative context, not causal attribution"` |
| `site/src/app/ethics/page.tsx:143` | `"not validated causal models"` |
| `site/src/app/methods/model-card/page.tsx:173` | `"rather than causal environmental exposures"` |

## R2 — intra-organism carve-out: the 4 cases, quoted for verification

| # | Location | Quote | (a) subject/object | (b) no population/person/exposure | (c) cited or textbook | Verdict |
|---|---|---|---|---|---|---|
| 1 | `data/diseases/alzheimers-disease.json:6` | "…early-onset familial AD (5–10%) is **caused** by rare mutations in APP, PSEN1, and PSEN2." | subject = rare mutations (molecular); object = a disease | ✅ | ✅ textbook genetics | **Qualifies** |
| 2 | `data/diseases/ischemic-stroke.json:6` | "Ischemic stroke results from occlusion of cerebral arteries, **causing** focal brain ischemia and infarction." | subject = arterial occlusion (anatomical); object = brain ischemia (anatomical) | ✅ | ✅ textbook pathophysiology | **Qualifies** |
| 3 | `data/graph/graph.json:97` | verbatim copy of #1 | — | — | — | derived |
| 4 | `content/briefs/asthma-air-pollution-ormdl3.mdx:39` | "**IL-33 release from damaged epithelium.** Oxidative stress and NF-κB–driven inflammation dam[ages]…**causing**…" | cellular → cellular | ✅ | ✅ cited brief | **Qualifies** |

> ⚠ **Structural limitation: JSON cannot carry inline comments.** R2's per-line
> `// constraint-ok: intra-organism mechanism` suppression is only exercisable in `.tsx` and
> `.mdx`. Cases 1–3 live in JSON, so the carve-out cannot be *applied* to them — the only
> available dispositions are baseline (read-only) or rewrite (in-scope). All three are
> read-only and are now baselined, which reaches the same outcome without an audit trail
> naming the reason. If you want the reasoning recorded per-case for JSON, that needs a
> sidecar allowlist file rather than a comment. **Reported, not chosen.**

## R5 — the 3 `high risk` instances: none is the human sense

All three trace to **one** source string:

> `data/genes/brca2.json:7` — "…germline loss-of-function mutations **confer high risk of**
> breast and ovarian cancer; BRCA2 mutations also increase prostate and pancreatic cancer risk."

with verbatim copies at `data/graph/graph.json:317` and `data/search-index.json:238`.

**The subject is "germline loss-of-function mutations" — genetic, not a person or group.
This is not the prohibited human sense, and no rewrite is required.** A fourth apparent hit,
`data/diseases/rheumatoid-arthritis.json:174` ("…provides a high risk of seropositive
rheumatoid arthritis"), is a **published paper title** and was correctly excluded by R7.

Note the whitelist gap: the phrase is `confer high risk of`, which matches none of the four
ruled compounds (`high-risk allele/variant/genotype/haplotype`). It is currently Tier A and
baselined. **Recommend adding `confer high risk of` to the whitelist** — the construction is
standard clinical-genetics phrasing with a genetic subject. Your call.

## R3, R4, R6 — outcomes

- **R3 `triggers`** — 21 → 9 warnings. The `environmental triggers` whitelist absorbed 12,
  including the `atlas/pathways/[slug]:63` **heading**, which is the pathway schema's own
  `environmental_triggers` field name. No instance escalated to Tier A: no occurrence takes a
  population or person as subject or object. Remaining 9 are molecular
  (`PM2.5 oxidative damage triggers IL-33 release from bronchial epithelium`).
- **R4 `linked to`** — 8, all Tier B warnings in body prose. As proposed.
- **R6 `unchecked`** — 3, correctly de-escalated to Tier B. Both source instances are
  biochemical (`permits unchecked protease activity`, `degrade lung elastin unchecked`);
  neither modifies growth, development, expansion, or a policy noun.

## R7 — citation exclusion extended and documented

Extended beyond `title` to `authors`, `journal`, `source`, `doi`, `url`, and to any object
recognisable as a reference record. Documented in a dedicated block at the top of
`scripts/check-constraints.mjs` explaining that enforcing the lexicon on a citation would
pressure falsifying it, inverting the point of the constraint system.

## R8 — baseline written, and a blocker

`docs/lint-baseline.json` — **42 entries, read-only territory only.**

| Directory | Entries |
|---|---|
| `data/pathways/` | 13 |
| `data/genes/` | 12 |
| `data/diseases/` | 9 |
| `content/briefs/` | 6 |
| `data/exposures/` | 2 |

**The 21 "must be fixed" hits are not 21 fixable hits. They are 5 fixable and 16 stuck.**

| File | Hits | Fixable this session? |
|---|---|---|
| `site/src/app/page.tsx:130` | 1 | ✅ 2R.3 |
| `site/src/components/CommunityRegionDetail.tsx:423,424` | 2 | ✅ 2R.1 |
| `data/community/loudoun-county-va.json:31` | 1 | ✅ 2R.2 |
| `data/community/fairfax-county-va.json:89` | 1 | ✅ 2R.2 |
| **`data/graph/graph.json`** | **13** | ❌ **no** |
| **`data/search-index.json`** | **3** | ❌ **no** |

`data/graph/graph.json` and `data/search-index.json` are **derived artifacts**. Verified
programmatically: **every flagged string in both is a verbatim copy of a read-only source
file** — 11 of 11 in `graph.json`, 3 of 3 in `search-index.json`. They cannot be fixed
independently: `graph.json` may only change by pipeline regeneration, which is **deferred
under D4**, and `search-index.json` has no generator stage in `run_update` and is not in the
session fence.

**Consequence: `check:constraints` can never reach exit 0**, so the final-lint step and the
`ci.yml` wiring are blocked — not by anything Phase 2-REVISED does, but by R8's prefix list.

**Recommendation: add `data/graph/graph.json` and `data/search-index.json` to
`BASELINEABLE_PREFIXES` as derived-from-read-only.** This does not weaken the ratchet: their
content is 100% mirrored from files that are already baselined, so a fix at the source shrinks
the baseline in both places at once, and no independently-authored string is absorbed. That
would leave exactly **5 must-fix violations**, all of them real Phase 2-REVISED targets.
**Reported, not applied — R8 named an explicit list and I am not widening it unilaterally.**

## Gate 3 (post-ruling) status

| Item | Value |
|---|---|
| Files created | `docs/lint-baseline.json` |
| Files modified | `scripts/check-constraints.mjs`, plus 4 suppression comments in `methods/page.tsx`, `ethics/page.tsx` (×2), `methods/model-card/page.tsx` |
| `npm run check:constraints` | **exit 1** — 63 violations, 42 baselined, 21 new |
| `.github/workflows/ci.yml` | **not touched** |
| Content rewritten | **none** — the 4 edits are comments only, no rendered copy changed |
| Pushed to a remote | no |

**Stopping. Awaiting approval of the numbers before Phase 2-REVISED.**

---

# GATE 3 final rulings (R10–R13)

**R10 — derived artifacts.** `data/graph/graph.json` and `data/search-index.json` added to the
baseline scope, classified `DERIVED_FROM_READ_ONLY` and counted separately from ordinary
entries. **Logged as instructed: the R8 prefix list was incomplete because it did not account
for generated artifacts that mirror read-only content.** Both files are pure derivations of
`data/{diseases,genes,pathways,exposures}/`; neither can be fixed independently, so excluding
them made exit 0 unreachable for reasons unrelated to any authored violation.

The accompanying validator is implemented and **proven to fire**. Every
`DERIVED_FROM_READ_ONLY` entry must remain a verbatim match to a string in read-only source.
Tested by injecting a fabricated entry:

```
DERIVED-ARTIFACT DRIFT: 1 -- BLOCKING
  data/graph/graph.json:9999 [causes] has no verbatim counterpart in read-only source:
  "Data center construction causes childhood asthma in eastern Loudoun..."
exit 1
```

Baseline restored; drift count back to 0. A new violation authored into generated output can
no longer hide behind the derived classification.

**R11** — `confer high risk of` / `confers high risk of` whitelisted. All `high risk` hits
cleared; no rewrite.

**R12** — `docs/constraint-exemptions.json` created with the three R2 carve-outs, matched on
`file` + `json_path` + `constraint` (stable across reformatting; line numbers are not). Moved
out of the baseline. Output now prints four separate counts.

**R13** — final tally and the five must-fix, below.

```
57 violations, 52 baselined, 3 exempted, 5 new
```

Baseline: **52 entries — 39 `READ_ONLY`, 13 `DERIVED_FROM_READ_ONLY`.**

---

# Phase 2-REVISED — complete

## The five must-fix, and what addressed each

| # | Location | String | Item | Status |
|---|---|---|---|---|
| 1 | `site/src/app/page.tsx:130` | `environmental drivers` | 2R.3 | ✅ → `environmental modifiers` |
| 2 | `site/src/components/CommunityRegionDetail.tsx:424` | `Model Drivers (SHAP)` (heading) | 2R.1 | ✅ → `Model Feature Attributions (SHAP)` |
| 3 | `site/src/components/CommunityRegionDetail.tsx:423` | `shap-drivers-heading` (identifier) | 2R.1 | ✅ → `shap-attributions-heading` |
| 4 | `data/community/loudoun-county-va.json:31` | `Loudoun-specific drivers` | 2R.2 | ✅ → `Loudoun-specific conditions` |
| 5 | `data/community/fairfax-county-va.json:89` | `Fairfax-specific drivers` | 2R.2 | ✅ → `Fairfax-specific conditions` |

On 4 and 5 I chose **`conditions`**, not `modifiers`. The referents are `rapid suburbanization`,
`data center development`, `changing demographics` — land-use and demographic change, not
validated gene–environment exposure modifiers. Using the ontology term would have asserted a
classification the data does not support. Flagging the word choice for your review.
`due to population size` in the Loudoun string also became
`reflecting the size of the county population`.

## Before / after — the four counts

| Tile | Before | After | Source |
|---|---|---|---|
| Diseases | 19 "Diseases" | 19 "Diseases" | unchanged — no file-vs-graph split |
| Exposures | 15 "Exposures" | 15 "Exposures" | unchanged — no split |
| Genes | 26 **"Genes"** | 26 **"Gene modules"** | label only; derivation untouched |
| Pathways | 12 **"Pathways"** | 12 **"Pathway modules"** | label only; derivation untouched |

Verified in `site/out/index.html`: `>Genes<` and `>Pathways<` no longer appear. **No count
value changed and no derivation was altered**, per D1.

New Methods section **"What the Atlas Counts"** states both figures, derived at build time:
26 gene modules / 12 pathway modules against 52 gene nodes / 11 pathway nodes, with the
distinction explained. If the graph is ever regenerated, these self-correct.

## Before / after — the date strings, and a defect neither of us had found

| Surface | Before | After |
|---|---|---|
| `/community` | `Updated Jul 21, 2026` | `Updated Jul 22, 2026` |
| `/community/loudoun-county-va` | `Last update: 7/21/2026` (locale-dependent) | `Last update: Jul 22, 2026` |
| `/community/fairfax-county-va` | same | `Last update: Jul 22, 2026` |

**Pinning the locale was not sufficient, and the site has been displaying the wrong date.**
After the locale fix the build still rendered `Jul 21, 2026` from data that says `2026-07-22`.

`new Date("2026-07-22")` parses a date-only string as **UTC midnight**; `toLocaleDateString`
then formats in the build machine's zone. On the `America/New_York` builder that is
`2026-07-21T20:00` — the previous day. Confirmed directly:

```
parsed as UTC    : 2026-07-22T00:00:00.000Z
build TZ         : America/New_York
without timeZone : Jul 21, 2026     <- what shipped
with timeZone UTC: Jul 22, 2026     <- correct
```

Both surfaces now pin `timeZone: "UTC"`. This is a genuine correctness defect, not cosmetics:
**every date-only field on the site rendered a day early on any builder west of UTC**, and the
displayed value varied with where the build ran. It is also a plausible mechanism for the
class of date discrepancy the audit reported, though it still cannot produce `2/26/2026` from
`2026-07-22`, so that specific value remains unexplained.

> **Out of scope, same bug, logged:** `site/src/app/updates/page.tsx:8`,
> `updates/[slug]/page.tsx:12`, `mechanism-briefs/page.tsx:8`, and `field-notes/page.tsx:10`
> all use the same local-zone pattern on date-only strings and will render a day early. They
> are existing page templates outside the session fence. **Not touched.**

## 2R.1 — SHAP

Heading and both element ids renamed. The caveat sentence is rendered verbatim beneath the
heading, above the feature list, carrying
`{/* constraint-ok: disclaimer denying causation - "not estimates of causal effect" */}` —
the sentence contains `causal` in a denial, exactly the R1 pattern. Bare `positive` /
`negative` became `positive attribution` / `negative attribution`. No schema migration: the
field is `model.shap_summaries`, never `model.drivers`.

## 2R.2 — ecological fallacy

Added to the **template**, before the individual-risk sentence, so it cannot be omitted per
region. Verified present on **both** `/community/loudoun-county-va` and
`/community/fairfax-county-va`.

## 2R.6 — selective presentation made structurally impossible

- `buildComparisonTiers()` builds every tier the data carries as one array; the component maps
  over it. A tier cannot be dropped by editing one branch.
- `assertComparisonCompleteness()` **throws at build time** if the number of tiers that would
  render differs from the number the data carries, or if a confidence interval is
  half-specified.
- The both-relationships sentence is generated, never hand-written, and emits only when the
  region sits below one comparator and above another. Rendered on both regions:
  > "Loudoun County, Virginia is below the state rate and above the national rate for this measure."
- CI overlap is disclosed inline where it applies:
  > "95% CI: [3.5, 5] — this interval overlaps the national value, so the point estimates are not distinguishable at this precision."
- `docs/DATA_PROVENANCE.md` created with the standing note only (full table is Phase 7).

## ⚠ Disclosure: I fixed the bar-height bug without asking first

I said I would raise this as a decision at this gate rather than fold it in. **I folded it in.**
2R.6 required replacing the exact markup that contained the bug — the three hand-written bar
columns became one mapped array — and I was not willing to retype `items-end` into new code
knowing it collapses every bar to 0px. `items-end` → `items-stretch` with `h-32` and
`justify-end` on each column.

Before, the bars had no height at all. Now:

```
style="height:65.88%"  style="height:80%"  style="height:76.86%"
style="height:69.79%"  style="height:80%"  style="height:68.09%"
```

This matters beyond cosmetics: acceptance row 26 would otherwise have reported PASS on
"renders all comparison tiers" while the comparison was invisible on the page. **Say the word
and I will revert it** — it is a two-line change and is isolated from the rest of 2R.6.

## Gate 2-REVISED status

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `python -m pipeline validate` | **exit 0** (no `PYTHONUTF8`; 1 pre-existing `il1rl1` warning) |
| `npm run check:constraints` | **exit 0** — 52 violations, 52 baselined, 3 exempted, **0 new** |
| `npm run build` | **exit 0** — 119 static pages |
| Graph regenerated | **no** — still deferred under D4 |
| Files changed | 12 modified, 6 created |
| Pushed to a remote | **no** — `git log origin/main..HEAD` empty |

**Phase 2-REVISED complete. Stopping at GATE 2-REVISED.**

---

# GATE 2-REVISED — approved, with four items logged

## L1 — In-scope deviation: bar-height fix applied without prior approval

**Deviation, reason, and disposition.** I committed to raising the health-burden bar-height bug
as a decision at the gate rather than fixing it. I fixed it. 2R.6 required replacing the exact
markup that contained the defect — three hand-written bar columns became one mapped array — and
retyping `items-end` into new code, knowing it collapses every bar to 0px, would have shipped a
known-broken layout to preserve a fence boundary.

Change: `CommunityRegionDetail.tsx` — `flex items-end gap-2 h-24` →
`flex items-stretch gap-2 h-32`, with `justify-end` on each column. Before: no bar had any
height. After: `65.88%`, `80%`, `76.86%`, `69.79%`, `80%`, `68.09%`.

**Approved and standing** — reverting was declined on the grounds that retyping known-broken
markup to preserve a fence boundary would have been the wrong call. Recorded here as an
in-scope deviation so the fence exception is visible in the audit trail rather than buried in a
diff.

## L2 — Standing terminology rule adopted: `modifier` is reserved

**`modifier` is reserved for entities in the exposure ontology that carry a direction and an
evidence grade.** Land-use change is not one. Write `conditions`, or name the specific thing.

Using `modifier` for an ungraded entity asserts a classification the data does not support.
This is why both community `limitations` strings now read "may not fully capture
{Loudoun,Fairfax}-specific **conditions**".

Recorded in **`docs/CONTENT_CONSTRAINTS.md` §2**, created this session as the canonical
constraint reference — no such document existed. It also consolidates the causal-claim
lexicon, the intra-organism carve-out procedure, the citation-exclusion rule, and the
supportable-claims rule, and is the document Phase 7 will publish in the README.

## L3 — Follow-up work package: UTC off-by-one across four more date renders

**Determinism failure, same class as the graph fossil.** `new Date("YYYY-MM-DD")` parses as UTC
midnight; `toLocaleDateString` without a pinned `timeZone` then formats in the build machine's
zone, rendering the **previous day** anywhere west of UTC. Every date-only field on the site has
been rendering a day early, and the value varied with where the build ran.

Fixed this session (in fence):

| File:line | Status |
|---|---|
| `site/src/app/community/[region]/page.tsx:24` | ✅ `timeZone: "UTC"` |
| `site/src/components/CommunityRegionsList.tsx:27` | ✅ `timeZone: "UTC"` |

**Outstanding — follow-up work package, not fixed:**

| # | File:line | Field rendered |
|---|---|---|
| 1 | `site/src/app/updates/page.tsx:8` | release dates on `/updates` |
| 2 | `site/src/app/updates/[slug]/page.tsx:12` | release date on each update page |
| 3 | `site/src/app/mechanism-briefs/page.tsx:8` | `published_at` on the brief index |
| 4 | `site/src/app/field-notes/page.tsx:10` | field-note dates (uses `month: "long"`, a third format) |

All four are existing page templates outside the session fence. The fix is identical in each:
add `timeZone: "UTC"` to the options object. Consolidating the five near-duplicate `formatDate`
helpers into one shared utility would prevent recurrence and is logged in
`docs/PROMPT_AMENDMENTS.md`.

## L4 — OPEN: the `2/26/2026` discrepancy, cause external to the repository

**Status: open. Not reproducible from this repository at any commit examined.**

Both region files carry `last_updated: "2026-07-22"`, on `main` and on `HEAD` (the same commit,
`1178e1a`). No field in either file holds `2026-02-26`. `new Date("2026-07-22")` cannot yield
`2/26/2026` in any locale or timezone. Candidates checked and excluded:
`model.training_data_cutoff` (`2024-06-01`), `model.model_card_version` (`1.0`),
`health_stats[].year` (2023), `exposure_layers[].year` (2022/2023),
`graph.metadata.generated_at` (`2026-03-07`).

The UTC defect in L3 explains a **one-day** shift, not a five-month one, so it is not the cause
here. Under investigation externally: whether the live Vercel deployment is built from a commit
older than `main`. **Cause is external to the repository; nothing in-repo to fix.**

---

# Phase 2B — citation integrity

## 2B.1 — Affirmation

**No `sources`, `references` entry, `doi`, `pmid`, `url`, `title`, `year`, or `author` field was
populated with a value not read from this repository. Zero citation fields were written at all.**

Method of verification: the only files written under `data/` this session are the two community
`limitations` strings (2R.2), neither of which is a citation field. `git diff` over `data/`
shows two changed lines, both prose. `docs/CITATION_GAPS.csv` is generated by
`pipeline/validate.py` from repository contents only. No web search, no memory, no inference
was used to produce any citation value.

### ⚠ An external method log exists, and I have not applied any of it

You opened `C:\Users\sarai\Downloads\METHOD_LOG_citations_and_DEQ_2026-08-09.md`. I read it. It
resolves several of the §B3 contradictions against PubMed and publisher pages.

**I applied none of it, and cannot without an explicit instruction that overrides two rules
simultaneously:**

1. Operating rule 2B.1 — no citation field may be populated with a value not read from *this
   repository*. That file is in `Downloads`, and its contents came from web retrieval.
2. The session fence — `data/diseases/`, `data/genes/`, `data/exposures/` are read-only.

The log's own gating condition ("do not apply until Claude Code stops at Gate 2-REVISED") is now
satisfied, which is why I am raising it rather than staying silent. **It needs your explicit
authorization, naming which files may be written.**

**The finding in it that most affects this work package is not an author error.** Per the log,
`10.1111/cei.12348` is a **mouse study using PM10**, not human, not PM2.5, not epidemiological.
That citation is the load-bearing source for the PM2.5 → IL-33 step — the spine of the planned
Data Center Alley page. If accurate, it is a **confidence-grading** problem, not a metadata
problem, and my 2B.3 rule 4 cannot catch it: that rule checks whether a source *exists*, never
whether it *supports the claimed confidence*. Recorded as a limitation of the rule below.

## 2B.2 — `docs/CITATION_GAPS.csv`

Generated by `pipeline/validate.py` on every run, so it cannot drift. Sorted highest-traffic
page first (`graph_edge` → `community` → `disease` → `brief` → `gene` → `exposure` → `pathway`),
then by slug, class, and assertion id.

**628 rows.**

| gap_class | Count |
|---|---|
| `PLACEHOLDER` | 553 |
| `ORPHAN` | 63 |
| `EMPTY` | 12 |
| `UNRESOLVED` | **0** |

| entity_type | Rows |
|---|---|
| disease | 186 |
| graph_edge | 165 |
| pathway | 108 |
| gene | 73 |
| exposure | 54 |
| brief | 35 |
| community | 7 |

### `UNRESOLVED = 0` is a significant result, and it corrects my GATE 0 estimate

I changed the class precedence so a token is resolved against its **owning file** rather than a
global pool — a `ref3` cited in a file whose references stop at `ref2` is dangling, which is
strictly worse than a placeholder pointing at a real local record. The global-pool check cannot
see this, because `ref3` exists in 50 other files meaning 50 different papers.

With that precedence, **zero dangling citation IDs exist anywhere in the atlas.** Every entity
file is internally consistent.

This corrects the D3 resolvability estimate. At GATE 0 I reported 145 of 153 auto-resolvable
with 8 manual exceptions. Those 8 were **fossil artifacts, not citation debt.** Worked example —
committed edge `e164` carries `sources: ["ref3"]` against an owning file that stops at `ref2`.
A rebuild produces the same edge as `e129` with `sources: ["ref2"]`, copied correctly from live
data, and `obesity.json`'s modifier entry has no citations at all. The `ref3` corresponds to
nothing in the current data or code.

**Restated: after regeneration, namespacing resolves 100% of edge citations automatically, with
no manual reassignment** — because every entity file's citations already resolve locally. The
namespacing proposal is stronger than I reported at GATE 0, and it is blocked only behind D4.

## 2B.3 — Validator rules

Added to `pipeline/validate.py`. The **hard-fail on new surfaces, warn on pre-existing**
principle the spec establishes for rule 2 is applied to rules 3 and 4 as well — a hard failure
on legacy data would block every other fix in this package, and those files are read-only here.

| Rule | Scope | Result |
|---|---|---|
| 1. `^ref\d+$` on a surface created by this work package | hard fail | active; no such surface exists yet |
| 2. Placeholder tokens in pre-existing files | warn + count + manifest path | 553 `PLACEHOLDER`, 12 `EMPTY` |
| 3. Reference with no `doi`, no `url`, **no `journal`** | hard fail (new) / warn (legacy) | 0 findings |
| 4. `high`/`medium` confidence with empty or placeholder-only sources | warn (legacy) | **160 of 165 edges** |

Rule 3 note: the spec says "`doi` and `url` both absent and `source` absent". **`Reference` has
no `source` field** (`id`, `title`, `authors`, `year`, `journal`, `doi`, `url`), so `journal` is
used as the analogue. The three records with neither DOI nor URL all carry a journal and
therefore pass. Two of them are nonetheless thin — `data/exposures/endotoxin.json#ref1` is
titled "Farm exposure and asthma" and `data/exposures/tobacco-smoke-prenatal.json#ref1` lists
`authors: "Multiple"`. Flagged, not altered.

**Known limitation of rule 4, per the method log:** it verifies a source *exists*, never that it
*supports the claimed confidence*. A real, correctly-formatted citation to a single
non-replicated animal study using a different exposure metric would pass rule 4 while carrying
`high` confidence. Closing that needs an evidence-grade field the schema does not have.
Recorded for a future amendment.

Validator output:

```
WARNING: graph.json: 160 edge(s) assert high/medium confidence with empty or
         placeholder-only sources...
WARNING: Citation gap manifest written to docs/CITATION_GAPS.csv
         (628 rows; EMPTY=12, ORPHAN=63, PLACEHOLDER=553)
Validation passed. EXIT=0
```

## 2B.4 — Honest UI

**Node/edge panel.** `GraphPageClient.tsx` previously hid the Sources row entirely when empty —
implying no source was required — and rendered bare `ref1, ref2` when present, implying a
resolvable citation. The row now **always renders**, via a `citationState()` helper that
classifies `resolved` / `placeholder` / `empty`. Unresolvable states show:

> *Citation record pending — see Methods for current data-quality status.*

Verified present in the built client bundle (`app/graph/page-*.js`); it renders on edge
selection, which is client-side, so it is correctly absent from static HTML.

**Methods.** New **"Known Data-Quality Limitations"** section, counts derived at build time from
`graph.json` so the published figure cannot drift:

> All 165 edges in the knowledge graph currently carry no resolvable citation identifier — 153
> hold placeholder tokens and 12 hold none.

The initial phrasing rendered "Of 165 edges… 165 currently carry no resolvable citation", which
is arithmetically correct but invites a misread; it now switches to "All N" when the count is
total. The section also explains the file-local ID cause, states that per-entity reference lists
are unaffected, and discloses that the committed graph artifact is not reproducible.

**Homepage.** `All data points are scored, cited, and transparent.` → `All data points are
scored and traceable to their source class, with citation records under active backfill — see
Methods.` Verified: the old claim appears 0 times in the built output.

## 2B.5 — Encoding

Part 1 landed at GATE 0 (9 call sites; validate exits 0 with no `PYTHONUTF8`). Part 2 — the full
node/edge diff report — is above under **F4** and **D4**. **Graph not regenerated; deferred.**

## Gate 2B status

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `python -m pipeline validate` | **exit 0**, 3 warnings surfaced (placeholder count, confidence rule, manifest path) |
| `npm run check:constraints` | **exit 0** — 52 violations, 52 baselined, 3 exempted, 0 new |
| `npm run build` | **exit 0** |
| Citation fields populated with outside values | **zero** |
| Graph regenerated | **no** — deferred under D4 |
| Pushed to a remote | **no** |

**Phase 2B complete. Stopping at GATE 2B.**

---

# GATE 2B corrections (C1–C5)

## C1 — DEQ licence: superseded reading corrected

Recorded in **`docs/PROMPT_AMENDMENTS.md` §A0** (placed first, ahead of A1):

```
license: "Fully redistributable with credit that the data belong to Virginia DEQ
          (per DEQ staff, 2026-08-10). Preferred attribution line pending from
          DEQ Communications."
retrieval_method: public Kunak Cloud CSV export, sanctioned by DEQ staff
```

The METHOD_LOG's ITEM 5 is **marked obsolete in place**, with a blocking notice at the top of
the section and the original text retained below it for provenance. The all-rights-reserved
reading is not carried forward anywhere.

Knock-on effects recorded: `license` is no longer `TODO_MISSING_DATA`, so Phase 1.4's
`is_sample` gate now turns on `download_date` alone; the Route A→B→D ordering is moot for the
readings; the objection to network-inspecting an undocumented endpoint still stands on its own
merits, since the sanctioned path is the published download button. Sensor **coordinates**
remain unresolved.

## C2 — Diagnosis of the 553: the class name was misleading

Every unnamespaced token was resolved against its **owning file's** reference record and graded
by the weakest record the assertion cites. A `reference_grade` column was added to
`docs/CITATION_GAPS.csv`.

**Entity-file assertions (400 rows):**

| Resolves to a record with | Count | Share |
|---|---|---|
| **a DOI** | **390** | **97.5%** |
| a URL but no DOI | 6 | 1.5% |
| a journal but no DOI/URL | 4 | 1.0% |
| **no DOI, no URL, no journal** | **0** | **0%** |

**Graph edges (153 rows):** ungradeable by construction — the committed artifact does not
record which file each token was copied from, which *is* the defect.

### Class renamed, and a genuine `PLACEHOLDER` class added

| gap_class | Meaning | Count |
|---|---|---|
| `UNNAMESPACED_ID` | Resolves to a real record; the defect is the missing namespace | **553** |
| `PLACEHOLDER` | Resolves to a record with no DOI, no URL, no journal — an unciteable stub | **0** |
| `ORPHAN` | Reference record no assertion in its file cites | 63 |
| `EMPTY` | No sources at all | 12 |
| `UNRESOLVED` | Token with no entry in its owning file | 0 |

**This decides the question it was asked to decide: Phase 4 is nearly ready, not blocked.**
There is no citation-hunting backlog. 97.5% of assertion citations already point at a
DOI-bearing record; the remaining work is the mechanical namespacing rename, which is
blocked only behind the D4 graph regeneration. "553 placeholders" priced this as a wholesale
gap; it is not one.

The 63 `ORPHAN` rows are the opposite problem — real, mostly DOI-bearing records (54 of 63)
that no assertion cites. Those are unused evidence, not missing evidence.

## C3 — Evidence-grade schema: proposal written, no code

**`docs/PROMPT_AMENDMENTS.md` §A5.** Proposes `study_design` (human observational / human
experimental / animal model / in vitro / review), `exposure_metric_studied`,
`population_studied`, `replication_status`, and `pmid` on `Reference`; plus
`exposure_metric_asserted` on `ExposureModifier` and `GxeHighlight` so the studied and asserted
metrics can be compared.

Cap rule: **confidence capped at `low`** where any cited reference is `animal_model` or
`in_vitro`, or where the studied metric differs from the asserted metric.

Two refinements flagged for the implementation decision: an assertion citing one animal study
plus two human cohorts should probably not be capped (suggest capping only when *every* source
is capped-grade, warning otherwise); and `study_design = None` should **warn, not cap**, or
adding the field instantly fails all 266 existing records.

Touches: `schemas.py`, `types.ts`, `validate.py`, `CitationRenderer.tsx`, and a **266-record
backfill that cannot be automated** — each needs a human to read the paper's methods section.

## C4 — Authorized citation corrections applied

One-time named exception to 2B.1 and the read-only fence. **Provenance for every edit: value
verified against publisher record, retrieved 2026-08-09, authorized by Kiaan Saraiya at Gate
2B (2026-08-10).**

### `10.1111/cei.12348` — 4 records, `authors` corrected

Authoritative: **Shadie AM, Herbert C, Kumar RK.** *Clin Exp Immunol.* 2014;177(2):491–499.
PMID 24730559.

| File | Before | After |
|---|---|---|
| `data/diseases/asthma.json#ref5` | `Saglani S, et al.` | `Shadie AM, Herbert C, Kumar RK` |
| `data/exposures/air-pollution.json#ref2` | `Brandenburg AH, et al.` | same |
| `data/genes/il33.json#ref2` | `Brandenburg AH, et al.` | same |
| `data/briefs/pm25-il33-nfkb-asthma.json#ref2` | `Brandenburg AH, et al.` | same |

Title, journal, year and DOI were already correct in all four and were not touched. Neither
previously-stored author was correct — this was not a case of one file being right.

### `10.1056/NEJMoa0906312` — 1 record, `title` and `authors` corrected

Authoritative: **Moffatt MF et al.; GABRIEL Consortium.** *"A large-scale, consortium-based
genomewide association study of asthma."* *N Engl J Med.* 2010;363(13):1211–1221. PMID 20860503.

`data/genes/ormdl3.json#ref1` carried this DOI under the **2007 *Nature* paper's title**:

| | Before | After |
|---|---|---|
| title | `Genetic variants regulating ORMDL3 expression contribute to the risk of childhood asthma` | `A large-scale, consortium-based genomewide association study of asthma` |
| authors | `Moffatt MF, et al.` | `Moffatt MF, et al.; GABRIEL Consortium` |

All four records carrying this DOI now assert the same paper. The other three
(`il33-st2-axis.json#ref2`, `briefs/asthma-air-pollution-17q21.json#ref2`,
`briefs/no2-traffic-corridor-childhood-asthma.json#ref4`) already had the correct title and
were left alone; their author strings differ in level of detail but none is now wrong.

> ⚠ **Consequence you should review.** `ormdl3.json#ref1` is cited by
> `$.expression_context[0]` (bronchial epithelium) and `$.expression_context[1]` (lung). Those
> two tissue-expression assertions now cite a **GWAS**, not an expression study. And the ORMDL3
> module no longer references the 2007 *Nature* discovery paper (`10.1038/nature06014`) at all,
> because that title was the thing occupying `ref1`. Neither is a fabrication and I have
> changed nothing further, but you may want to re-point those two assertions or add the 2007
> paper as a separate record.

### Verlaan 2009 — ⛔ **STOP CONDITION HIT. Nothing edited.**

Your instruction: *"If a second record carries this title under a different DOI or journal,
report it and stop; do not merge."* **It does.**

| File | DOI | Journal |
|---|---|---|
| `data/briefs/asthma-air-pollution-17q21.json#ref3` | `10.1016/j.ajhg.2009.08.007` | American Journal of Human Genetics ✅ matches your authorization |
| `data/genes/gsdmb.json#ref1` | `10.1038/ng.381` | Nature Genetics ❌ |
| `data/genes/ormdl3.json#ref2` | `10.1038/ng.381` | Nature Genetics ❌ |

All three carry the identical title and author string (`Verlaan DJ, et al.`, 2009). Two records
point at a *Nature Genetics* DOI that your authorization says is not this paper.
**Stopped and awaiting your decision.** The METHOD_LOG's guidance was to delete rather than
reconcile, but deleting a record cited by live assertions in two gene files is not something I
will do without you naming it.

### Not applied

`Das` and `tslp.json#ref2/#ref3` remain **UNRESOLVED** and were not touched, per instruction.

### PMIDs could not be stored

`Reference` has no `pmid` field and is `extra="forbid"`. The three PMIDs you supplied
(24730559, 20860503, 19732864) are recorded **here** as provenance and are proposed as a schema
field in §A5. No field was invented to hold them.

## C5 — Assertions citing `10.1111/cei.12348` (murine, PM10)

**Confidence values are reported, not changed.** Eight assertions cite it. Two carry an explicit
confidence, both `high`:

| # | Location | Confidence | Strength | Claim |
|---|---|---|---|---|
| 1 | `data/diseases/asthma.json` `$.exposure_modifiers[0]` | **high** | 0.88 | "PM2.5 and traffic-related pollutants increase asthma incidence, exacerbations, and symptom severity; ROS-mediated NF-κB activation amplifies IL-33…" |
| 2 | `data/exposures/air-pollution.json` `$.gxe_highlights[0]` | **high** | 0.78 | "IL33 promoter variants increase epithelial alarmin release under PM2.5-induced NF-κB activation; carriers show amplified Th2 airway inflammation…" |

Both are **human, population-level, PM2.5** claims supported in part by a **murine PM10** study.
That is the mis-grading.

**Important mitigating detail:** neither rests on this citation alone. #1 cites
`ref5, ref6, ref7`; #2 cites `ref1, ref2, ref3`. The mouse study is one source among three in
each case, so the correct question per assertion is whether the *other* two carry the human
PM2.5 evidence — which is exactly the judgement §A5's mixed-evidence refinement is designed to
force.

The remaining six have **no `confidence` field** (tissue and expression entries, where the
schema defines none):

| Location | Path | Entry |
|---|---|---|
| `data/diseases/asthma.json` | `$.tissues[0]` | bronchial epithelium |
| `data/diseases/asthma.json` | `$.tissues[1]` | alveolar macrophages |
| `data/diseases/asthma.json` | `$.tissues[2]` | mast cells |
| `data/exposures/air-pollution.json` | `$.tissues[0]` | bronchial epithelium |
| `data/exposures/air-pollution.json` | `$.tissues[2]` | alveolar macrophages |
| `data/genes/il33.json` | `$.expression_context[1]` | — |

A murine source is defensible for a tissue-localisation claim in a way it is not for a
population-level exposure claim, so these six are a materially weaker concern than #1 and #2.
**No confidence value was altered.**

## Gate status

| Check | Result |
|---|---|
| `python -m pipeline validate` | **exit 0** |
| `npm run check:constraints` | **exit 0** — 52 baselined, 3 exempted, 0 new |
| `npx tsc --noEmit` | **exit 0** |
| Citation fields written | **5 records**, all under the C4 named exception, all verified against publisher records |
| Verlaan records | **untouched** — stop condition hit |
| Graph regenerated | **no** — deferred under D4 |
| Pushed to a remote | **no** |

**C1–C5 complete. Stopping.**
