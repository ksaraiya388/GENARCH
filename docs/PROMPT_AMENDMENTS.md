# Pending work-package amendments

Contract breaks found during Phase 0 reconnaissance (2026-08-09) between the work-package
specification and the actual state of this repository. **None are fixed** — each belongs to a
deferred phase. Each is recorded here with the real field names and schemas as read from the
repository, so the specification can be amended before the phase runs.

Status key: **PENDING** — needs a specification amendment before its phase can execute.

---

## A0 — DEQ licence and retrieval method · **RESOLVED 2026-08-10**

**This supersedes the "all rights reserved / not public domain" reading recorded in
`METHOD_LOG_citations_and_DEQ_2026-08-09.md`.** That reading was based on the DEQ site-wide
Terms of Use boilerplate. It is obsolete and must not be carried forward.

On **2026-08-10, DEQ staff stated by email** that the sensor data is fully redistributable with
credit to Virginia DEQ, and directed retrieval via the download button on the public Kunak page.

Manifest values for the two DEQ source entries:

```json
"license": "Fully redistributable with credit that the data belong to Virginia DEQ (per DEQ staff, 2026-08-10). Preferred attribution line pending from DEQ Communications.",
"retrieval_method": "public Kunak Cloud CSV export, sanctioned by DEQ staff"
```

Consequences for Phase 1:

- `license` is **no longer** `TODO_MISSING_DATA`. The Phase 1.4 rule that sets
  `is_sample = True` unless `download_date` and `license` are both populated with non-TODO
  values can now be satisfied on the licence side; `download_date` still needs filling at
  retrieval time.
- The Route A → B → D acquisition ordering in the method log is moot for the readings
  themselves: staff sanctioned the Kunak export directly.
- The withdrawal of "Route C" (network-inspecting an undocumented endpoint) still stands on its
  own merits — the sanctioned path is the published download button, not a discovered endpoint.
- Attribution wording is **still pending** from DEQ Communications. Until it arrives, credit
  Virginia DEQ in the terms above and leave the preferred line marked pending.

Sensor **coordinates** remain a separate, unresolved item; DEQ GeoHub is the outstanding lead.

---

## A1 — DEQ hourly CSV column contract (blocks Phase 1.3 / 1.4) · PENDING

**Specification says** the CSV has 9 columns:

```
sensor_id, sensor_name, latitude, longitude, timestamp_local,
pm25_ugm3, no2_ppb, co_ppm, qc_flag
```

and Phase 1.3 defines `SensorSite` / `SensorReading` keyed on `sensor_id`.

**The file actually has 12 columns.** Read from
`pipeline/sources/deq_data_center_air_monitoring_hourly.csv` (header row; zero data rows,
intentionally):

```
site_id, site_label, sensor_unit_id, locality, latitude, longitude,
timestamp_local, pm25_ugm3, no2_ppb, co_ppm, qc_flag, is_collocated_ref
```

**Mapping, as far as it can be established without inventing anything:**

| Spec column | Actual column | Note |
|---|---|---|
| `sensor_id` | `site_id` **or** `sensor_unit_id` | **Ambiguous.** Two distinct identity columns exist. `site_id` is the deployment location; `sensor_unit_id` is the hardware unit. The companion file shows one site can have an unresolved unit (`TO_CONFIRM`), so these are not interchangeable. |
| `sensor_name` | `site_label` | Direct rename. |
| `latitude`, `longitude`, `timestamp_local`, `pm25_ugm3`, `no2_ppb`, `co_ppm`, `qc_flag` | same | Unchanged, 7 of 9. |
| — | `locality` | **New.** Maps to `SensorSite.locality`, already in the Phase 1.3 model. |
| — | `is_collocated_ref` | **New.** Appears to correspond to `SensorSite.is_reference_monitor`, but the Phase 1.3 rule says that field "must be False for every DEQ Kunak/APEX unit… If any record claims otherwise, hard error", while `deq_sensor_site_history.csv` row 1 has `is_collocated_ref=TRUE`. Collocation with a reference monitor is not the same as *being* a reference monitor. **Needs a ruling.** |

**Amendment required:** decide whether `SensorSite.sensor_id` binds to `site_id` or
`sensor_unit_id`; add `locality` and `is_collocated_ref` to the model; and reconcile
`is_collocated_ref` against the `is_reference_monitor` hard-error rule.

---

## A2 — School-name regex misses abbreviations (blocks Phase 1.3 and Phase 3 rule 3) · PENDING

**Specification says**, in Phase 1.3 and in the Phase 3 lint:

> `display_label` must not contain the substring `School`, `Elementary`, `Middle`, or `High`.

> Fail on any string matching `/(School|Elementary|Middle|High)\b/` appearing within 200
> characters of any of: `asthma`, `PM2.5`, `µg/m3`, `ugm3`, `inflammation`, `prevalence`,
> `reading`.

**The source data uses an abbreviation the pattern does not match.** Read from
`pipeline/sources/deq_sensor_site_history.csv`, row 1:

```
site_id,site_label,locality,sensor_unit_id,start_date,end_date,is_collocated_ref,notes
ashburn-collocated,Broad Run HS,Ashburn,TO_CONFIRM,2026-03-03,,TRUE,Collocated with DEQ Ashburn air monitoring site for sensor-versus-monitor comparison
```

`Broad Run HS` is a school name. `HS` matches none of `School|Elementary|Middle|High`, so
**both the schema substitution rule and the lint rule pass it through unchanged** — and it
would be rendered next to PM2.5 readings, which is precisely the outcome the rule exists to
prevent. This is the highest-consequence of the four amendments: it fails silently and in the
safe-looking direction.

Row 2 (`site_label=Dulles Airport`) is a facility, not a school, and is unaffected.

**Amendment required:** extend both patterns to cover abbreviations, at minimum
`HS`, `MS`, `ES`, and `Elem`, as whole tokens — e.g.
`/(School|Elementary|Elem|Middle|High|\bHS\b|\bMS\b|\bES\b)/`. The substitution rule should
also be inverted to an **allowlist** (`sensor_id` + `locality` only) rather than a denylist,
so an unanticipated label form cannot leak through.

---

## A3 — `CommunitySchema` cannot hold the Phase 4 fields (blocks Phase 4.1 / 4.2) · PENDING

**Specification says** (Phase 4.1):

> Create `data/community/data-center-alley.json`. Conform it to the existing community region
> schema if it fits; if it does not fit, stop and report the mismatch rather than mutating the
> schema.

**It does not fit.** The real schema, read from `pipeline/schemas.py` L505-526:

```python
class CommunitySchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    region_id: str
    name: str
    geo_level: str
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

There is **no `mechanism_chain` field and no `modifier_loci` field**, and
`extra="forbid"` means adding either one causes a hard schema-validation failure rather than
being ignored. Phase 4.1's step object
(`step_index, from_entity, to_entity, statement, evidence_type, direction, tissue, strength,
confidence, sources[]`) and Phase 4.2's locus object have no home in this model.

Two further mismatches in the same area:
- `model: CommunityModel` is **required**, and `CommunityModel` requires `features_used`,
  `shap_summaries`, `model_card_version`, and `training_data_cutoff`. A mechanism page has no
  hotspot model, so these would have to be populated with values that do not exist.
- `geo_level` is validated against `{county, census_tract, zip}`. "Data Center Alley" is a
  corridor, none of the three.

**Amendment required:** either (a) add a distinct schema (e.g. `CorridorSchema` /
`MechanismPageSchema`) rather than overloading `CommunitySchema`, or (b) extend
`CommunitySchema` with optional `mechanism_chain` / `modifier_loci`, make `model` optional,
and widen the `geo_level` enum. Option (a) is cleaner and does not weaken validation for the
two existing county regions. **Per the stop condition, this is reported and not chosen here.**

---

## A4 — `population_limitations` does not exist (blocks Phase 4.3) · PENDING

**Specification says** (Phase 4.3):

> Source the text from the existing `population_limitations` field on
> `data/diseases/asthma.json`. Do not write new cross-ancestry prose.

**There is no such field.** `data/diseases/asthma.json` has `population_equity`, which is a
three-subfield object. The real model, read from `pipeline/schemas.py` L95-100:

```python
class PopulationEquity(BaseModel):
    model_config = ConfigDict(extra="forbid")

    gwas_ancestry_breakdown: str
    transferability_notes: str
    data_gaps: str
```

and `DiseaseSchema` (L120-137) carries `population_equity: PopulationEquity` plus an optional
`ancestry_context: Optional[DiseaseAncestryContext]` (L103-110:
`discovery_ancestry`, `replication_ancestries`, `transferability_rating`,
`multi_ancestry_studies`, `notes`). Confirmed by direct read:
`list(asthma["population_equity"].keys())` → `['gwas_ancestry_breakdown',
'transferability_notes', 'data_gaps']`; `'population_limitations' in asthma` → `False`.

**Amendment required:** name which subfield(s) the cross-ancestry note should be sourced from.
`transferability_notes` is the closest match to the intent, with `gwas_ancestry_breakdown` and
`data_gaps` as supporting context. Because Phase 4.3 forbids writing new cross-ancestry prose,
the amendment must specify the field rather than leave it to be chosen at build time.

---

## A5 — Evidence-grade fields on `Reference` · **PROPOSAL ONLY, NOT IMPLEMENTED**

Approved as a written proposal at Gate 2B. No code was written.

### The gap this closes

`pipeline/validate.py` rule 4 hard-fails an assertion at `high`/`medium` confidence whose
sources are empty or unnamespaced. It verifies that a source **exists**. It cannot verify that
the source **supports the claimed confidence**.

`10.1111/cei.12348` proves the gap is real, not theoretical. It is a correctly-formatted
citation with a valid DOI, journal, year, and (now) correct authors. It passes every existing
rule. It is also a **murine study using PM10**, cited in support of `high`-confidence claims
about **human PM2.5** exposure. No current check can see that.

### Proposed fields

Added to `Reference` in `pipeline/schemas.py` (all optional, so existing records stay valid):

```python
class StudyDesign(str, Enum):
    human_observational = "human_observational"
    human_experimental  = "human_experimental"
    animal_model        = "animal_model"
    in_vitro            = "in_vitro"
    review              = "review"

class Reference(BaseModel):
    model_config = ConfigDict(extra="forbid")
    # ... existing fields unchanged ...
    pmid: Optional[str] = None                       # see note below
    study_design: Optional[StudyDesign] = None
    exposure_metric_studied: Optional[str] = None    # "PM2.5" | "PM10" | "NO2" | "O3" | ...
    population_studied: Optional[str] = None         # free text: species, n, ancestry, age
    replication_status: Optional[str] = None         # "replicated" | "single_study" | "meta_analysis" | "unreplicated"
```

An assertion additionally needs to declare the metric it is *asserting about*, so the two can
be compared. Proposed on `ExposureModifier` and `GxeHighlight`:

```python
    exposure_metric_asserted: Optional[str] = None
```

### Proposed confidence cap rule

In `pipeline/validate.py`, evaluated after schema validation:

> **Confidence is capped at `low` when any cited reference has
> `study_design ∈ {animal_model, in_vitro}`, or when
> `exposure_metric_studied` differs from `exposure_metric_asserted`.**
> A declared confidence above the cap is a hard error naming both the assertion and the
> reference that caused the cap.

Two refinements worth deciding at implementation time:

- **Mixed evidence.** An assertion citing one animal study *and* two human cohorts should
  arguably not be capped at `low`. Suggested rule: the cap applies only when **every** cited
  reference is capped-grade. Where a mix exists, emit a warning naming the animal-model source
  so the human evidence must be the one doing the work.
- **Unknown grade.** A reference with `study_design = None` should **warn, not cap** — otherwise
  adding the field instantly fails 266 existing records. Warn until the field is backfilled,
  then flip to error behind a single flag.

### What it touches

| File | Change |
|---|---|
| `pipeline/schemas.py` | `StudyDesign` enum; 5 optional fields on `Reference`; 1 on `ExposureModifier` / `GxeHighlight` |
| `site/src/lib/types.ts` | mirror the same optional fields (types must track Pydantic) |
| `pipeline/validate.py` | the cap rule; a warn-mode flag while the field is unpopulated |
| `site/src/components/CitationRenderer.tsx` | render design and metric as a badge, so a reader sees "animal model, PM10" without opening the DOI |
| `data/**/*.json` | **backfill, 266 records.** The largest cost, and it cannot be automated: each record needs a human to read the paper's methods section |
| `docs/CITATION_GAPS.csv` | new `evidence_grade_missing` class for records lacking `study_design` |

### Note on `pmid`

`Reference` currently has no `pmid` field and is `extra="forbid"`, so the PMIDs supplied with
the Gate 2B corrections (24730559, 20860503, 19732864) **could not be stored** and were recorded
in `REPORT.md` provenance instead. `pmid` is included in this proposal for that reason; it is
independent of the evidence-grade work and could land on its own.

---

## Also noted, not blocking

- **`build_graph()` writes a wall-clock timestamp.** `pipeline/graph_builder.py` sets
  `metadata.generated_at` from `datetime.utcnow()`, so two runs on different days produce
  different bytes. This conflicts with operating rule 8 ("Running the pipeline twice on
  identical inputs must produce byte-identical outputs"). Any graph-drift validator must
  exclude `metadata.generated_at`, or it will trip on itself.
- **Four near-duplicate `formatDate` helpers** exist across
  `site/src/app/{updates,updates/[slug],mechanism-briefs,field-notes}/page.tsx` and
  `site/src/components/CommunityRegionsList.tsx`, using two different month formats
  (`month: "short"` vs `month: "long"`). Consolidation is out of scope for this work package.
