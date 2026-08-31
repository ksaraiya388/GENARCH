# Consolidation of the 2026-08-28 refresh findings

Run 2026-08-30 against the brief at `.claude/prompts/consolidation_2026-08-29.md`.
Sensor data cutoff 2026-08-27, Kunak export date 2026-08-28. Regulatory data
cutoff 2026-08-10 under FOIA 26-4646. Nothing is committed.

This report describes co-location and measurement convention only. It makes no
causal claim, names no facility as harming anyone, and contains no
individual-level statement. Every statistic is a site or network aggregate. Most
readings in this record sit well below the standards: site mean daily PM2.5 runs
5.8 to 10.5 µg/m³.

Virginia DEQ, Office of Air Quality Monitoring, "Data Center Air Quality
Analysis", August 28, 2026, page 4:

> These sensors are capable of collecting pollutant concentration data and
> establishing pollutant concentration trends, but they are not regulatory
> instruments as specified in the Code of Federal Regulations (CFR). They cannot
> be used in determining attainment or non-attainment of the National Ambient
> Air Quality Standards (NAAQS). Only Federal Reference/Equivalent Method
> designated monitors can.

A single hourly reading above 35 µg/m³ is not an exceedance of the 24-hour PM2.5
standard. The regulatory form of that standard is the 98th percentile of daily
24-hour averages averaged over three consecutive years; the separate annual
standard is 9.0 µg/m³ as revised in 2024. Neither is evaluated here.

## Phase 0, gates

| Gate | Result |
|---|---|
| 0.1 tree clean apart from the staged refresh | Pass. Working tree matched the index exactly. Untracked: this brief, and the three p98 solver scripts the brief itself references |
| 0.2 six exports, all `_2026-08-28` | Pass. `sorted(glob("*.csv"))` on `deq-raw/` resolves to exactly six, all 2026-08-28. The six superseded files sit under `_superseded/` and are not globbed |
| 0.3 diagnostic output recorded | The three scripts had been run but no output was stored. All three were rerun and their output recorded at `outputs/repro/diagnostics/p98_diagnostics_2026-08-30.txt`. All three reproduce the figures the brief states |

## Phase 1, the p98 diagnosis

**The divergence is explained.** GENARCH bins hours into days by hour-beginning
local standard time (`ts_est`), which is the pipeline default and the 40 CFR
Part 50 Appendix N convention for daily averages. DEQ's published sensor tables
bin by hour-beginning local clock time. The two are identical in winter and
differ by one hour during EDT, which moves the last hour of each local day into
the previous day.

Which pattern the data supports, stated without hedging: **not day inclusion,
and not the quantile convention.** Mean, standard deviation and median all
reproduce under either binning, so the underlying daily values agree with DEQ's.
The p98 alone diverges, and it diverges in both directions.

| Site | n | Δ mean | Δ sd | Δ median | Δ p98, standard time | Δ p98, clock time |
|---|---:|---:|---:|---:|---:|---:|
| 1757 Golf Club | 141 | +0.00 | +0.02 | +0.10 | +1.19 | **+0.04** |
| Belfort Park Dr | 104 | +0.04 | +0.07 | +0.10 | +0.49 | **+0.06** |
| Broad Run HS | 172 | +0.02 | −0.03 | −0.05 | +0.42 | **+0.05** |
| Dulles Airport | 169 | +0.01 | +0.03 | +0.00 | +2.12 | **+0.02** |
| Farmwell Station MS | 140 | +0.02 | +0.04 | −0.05 | +2.12 | +0.41 |
| Sterling MS | 71 | +0.07 | +0.06 | +0.20 | −0.89 | +0.35 |

Four of six sites fall within 0.06 under DEQ's binning. The pipeline's binning
was **not** changed: it is the regulatory convention and it is correct. The
finding is that the two conventions diverge, not that either is wrong.

### 1.6d, the residual at two sites

Farmwell Station MS at +0.41 and Sterling MS at +0.35 remain after regrouping.
This is not day inclusion either. Across the whole network exactly **one** day
changes its 18-of-24 completeness status between the two binnings, and it is at
neither site:

| Site | Date | Standard time | Clock time |
|---|---|---|---|
| Dulles Airport | 2026-07-10 | 18 valid hours, included | 17 valid hours, excluded |

Both residual sites keep the same `n` under either binning, 140 and 71. The
residual is the interpolation position inside a wide bracket whose two
bracketing days are themselves smoke days:

| Site | Bracketing days and values | Gap | Residual |
|---|---|---:|---:|
| Farmwell Station MS | 2026-07-20 at 24.35 → 2026-07-19 at 27.33 | 2.98 | +0.41 |
| Sterling MS | 2026-07-19 at 24.70 → 2026-07-18 at 40.44 | 15.74 | +0.35 |

At Sterling MS the residual is 2 percent of the bracket width. **Reported open.**
The mechanism is identified and the exact remaining difference is not closed.
Both sit under half a microgram and neither affects any published claim. No
cause is attributed to them.

### Quantile convention

Seven conventions were tested across three cutoffs against DEQ's six published
values: numpy `linear`, `lower`, `higher`, `nearest`, `midpoint`; R types 4 and
6; EPA Appendix N rank selection. **None reproduced all six.** No convention was
adopted and the pipeline default is unchanged. The refresh report's statement
that percentile method was "ruled out" was correct about the method but wrong to
leave the cause open; the cause was never the convention.

## Phase 2, the record-length claim as an order statistic

The 98th percentile of daily averages is a different order statistic at
different record lengths. Under linear interpolation the index is (n − 1) × 0.98.

| Site | Valid days | p98 falls at rank | Ranks from the top | Bracketing values | Gap | Method spread |
|---|---:|---|---:|---|---:|---:|
| Sterling MS | 71 | 69.6 of 71 | 2.40 | 24.95 → 38.21 | 13.27 | **13.27** |
| Belfort Park Dr | 104 | 101.9 of 104 | 3.06 | 26.06 → 26.41 | 0.35 | 0.35 |
| Farmwell Station MS | 140 | 137.2 of 140 | 3.78 | 26.46 → 27.65 | 1.19 | 1.19 |
| 1757 Golf Club | 141 | 138.2 of 141 | 3.80 | 24.44 → 25.20 | 0.76 | 0.76 |
| Dulles Airport | 169 | 165.6 of 169 | 4.36 | 18.43 → 20.76 | 2.33 | 2.33 |
| Broad Run HS | 172 | 168.6 of 172 | 4.42 | 24.31 → 25.88 | 1.56 | 1.56 |

On the shortest record the statistic is effectively the second-highest daily
value. On the longest it is roughly the fourth-highest, drawn from a denser part
of the distribution. Comparing the two sets a near-maximum beside a genuine
upper-tail quantile.

**The interpolation sensitivity is the measurement of the effect**, not an
aside: holding the data fixed and changing only the convention moves Sterling
MS's p98 by 13.27 µg/m³ against 0.35 to 2.33 for the longer records.

**The general form, which is the strongest version.** Every bracketing day in
the table above falls inside the 2026-07-16 to 2026-07-20 smoke window, at every
site. The 98th percentile sits in a void between the bulk of the distribution
and the smoke days everywhere, not only on the short record. A one-hour shift in
the day boundary moves it by up to 2.12 µg/m³ while the mean holds to within
0.05. The statistic is sensitive to defensible methodological choices at every
site.

**Framing held.** DEQ's 2026-08-28 Table 4 shows no site above 35.0 and the
earlier ranking resolved as the record grew. The `sterling-ms` series
(40.4 → 38.2 → 36.0 → 33.8) is supporting illustration, not the claim. This is
not presented anywhere as correcting a standing DEQ error.

### 2.5 audit, and what was changed

| # | File | Old framing | Action |
|---|---|---|---|
| 1 | `site/src/app/community/data-center-alley/page.tsx` §6 | Ranking argument; "The apparent difference between sites is a difference in record length" | Rewritten as an order-statistic argument, with the day-binning instability as the general form. Heading changed to "What the 98th percentile points at" |
| 2 | `site/src/lib/deq-data.ts` | `percentilePosition` and `getPercentiles` doc comments | Rewritten |
| 3 | `docs/GENARCH_RULES.md` | "Two independent measures support the record-length reading" | Rewritten as the order-statistic claim with both magnitude measurements |
| 4 | `outputs/repro/refresh_report_2026-08-28.md` | §3.3, §3.4, unrecomputable-claims item 3 | Corrections header added; three statements corrected in place |
| 5 | `outputs/repro/README.md` | File table, cutoff-only provenance | Export-date column added; new artifacts listed |
| 6 | `README.md` | "a record-length percentile comparison" | Reworded |
| 7 | `site/src/app/community/page.tsx` | "a record-length comparison across sites" | Reworded |
| 8 | `.claude/prompts/kunak_refresh_2026-08-28.md` | "1 to 2 ug/m3 above DEQ's" | Corrected in the new corrections header |

The phrase "1 to 2 µg/m³ above DEQ consistently" appears nowhere in the repo as
a live claim. The refresh report already stated it as a negative finding about
the mean; that sentence is correct and was left alone.

## Phase 3, export date as provenance

**3.1.** `export_date` added alongside the existing cutoff column on every file
in `outputs/repro/`. Backfilled on six existing files.
`superseded_claims_audit_2026-08-28.csv` is an audit of repository text rather
than a table of measurements, so no cutoff or export date applies; that is
stated in the README rather than faked with a column.

**3.2.** All twelve raw exports were already registered by the refresh task.
Each now also carries `export_date`, `requested_range_start`,
`requested_range_end`, `data_first_timestamp_local`, `data_last_timestamp_local`,
`rows_as_exported` and `timestamp_convention` as first-class keys rather than
buried in a prose `coverage` string. The requested range and the actual first
timestamp differ at four of the six sites, which is the distinction the fields
exist to record. The six superseded entries keep `superseded_on`,
`superseded_by` and `superseded_reason`.

**3.3.** Documented in `docs/DATA_PROVENANCE.md` as a property of the source,
with all nine hours and their before and after state.

**A correction to how the nine hours were described.** All nine returned as
exact zeros on all three pollutants, so all nine are excluded by the
`exact_zero_floor` rule. They change the row count and the missing-hour count
(45 rows to 18) and they change no statistic. A backfill that resolves an
absence into an instrument-floor zero is a change in the record, not a recovery
of data, and the refresh report's "resolved nine hours" wording invited the
second reading. Corrected there.

**3.4.** Nothing drafted for DEQ. Two observations are recorded for a later
correspondence decision: the day-binning divergence, and the Table 1 mean
discrepancy below.

## Phase 4, the deq-data.ts assertion

`apex-05-no2` removed from the build-time assertion set
(`assertAgainstDeq: false`). Both values are kept as a recorded pair carrying a
new `nonComparable` block that names both cutoffs and the reason: DEQ's side is
the 2026-08-19 correction refit over a window running past the 2026-08-07
edition cutoff the GENARCH fit stops at, and the fit cannot be extended because
a collocation fit needs both sides of each hourly pair and the FOIA 26-4646
regulatory record ends 2026-08-10. Neither side can move.

`restoreWhen` and `blockedOn` carry the FOIA marker as live fields rather than a
comment, so the gate is restored when the extended regulatory record arrives.
The divergence is not deleted: the row still renders, and the page carries a new
Status column marking it "Recorded" against "Checked by the build" for the other
three.

**4.4 build effect.** Build exits 0. No other assertion depended on it: the two
`No2Diagnostics` functions look the spec up by key and throw only if it is
missing, which it is not. The page's prose claim that all four comparisons pass
the enforced tolerance was false once the gate was demoted and has been
rewritten to say three are checked and one is recorded.

## Phase 5, DEQ Tables 2 and 3

Truncated to 2026-08-27. Both emitted with a delta column per statistic, a
stated cutoff and export date, and both exact-zero column sets.

**A finding that resolves Table 2.** DEQ's zero treatment is pollutant-specific.

| DEQ table | Reproduces under | Δ mean, zeros excluded | Δ mean, zeros retained |
|---|---|---|---|
| Table 2, NO2 hourly | zeros **retained** | +0.76 to +0.95 | −0.07 to +0.05 |
| Table 3, PM2.5 hourly | zeros **excluded** (pipeline default) | −0.01 to +0.05 | −0.18 to −0.03 |

Under the pipeline default no NO2 site reproduces. Under a zeros-retained
treatment three of six reproduce on all four statistics within 0.05 and the
other three sit within 0.12. This corroborates and extends DEQ's correspondence
of 2026-08-19, which confirmed DEQ retains exact zeros in the APEX 5 NO2
regression: the behaviour is visible across all six sites in NO2 and absent in
PM2.5.

**The pipeline default was not changed and the zeros-retained treatment was not
extended.** It remains scoped to the single APEX 5 NO2 regression. The retained
columns are a diagnostic set, labelled as such in both files.

Table 3 under the pipeline default: three of six sites reproduce all four
statistics within 0.05; 1757 Golf Club misses only on median at −0.05; Farmwell
Station MS is within 0.09; Sterling MS is within 0.05 on three statistics and
+0.64 on p98, which is the short-record instability described in Phase 2.

**5.4.** Both regulatory-monitor rows computed, capped at 2026-08-10, labelled
`comparable_to_report = no`, and **not counted as reproductions**.

**5.5.** The three retired sites have no export and cannot be checked. Stated in
every row of both files with the reason.

## Phase 6, the CO decision: ingested

All three 6.1 conditions hold.

| Condition | Result |
|---|---|
| Existing outputs byte-identical apart from new CO rows | **Pass, verified by diff.** `deq_pm25_daily.csv`, `deq_occupancy_violations.csv` and `deq_unit_conflicts.csv` identical by sha256. The hourly file is identical after stripping the 19,748 CO rows. `deq_missing_hours.csv` gained exactly six rows, all CO. `reshape_deq` was first confirmed byte-reproducible without the change |
| Same validity, exact-zero and occupancy rules, no special-casing | **Pass.** One line added to `KUNAK_POLLUTANT_PREFIXES`; `POLLUTANT_UNITS` already carried CO. Exclusion vocabulary is `exact_zero_floor` and `pre_occupancy_transit`, the same as other pollutants. The only pollutant-specific branch in the exclusion path is the pre-existing PM2.5 void window |
| `pipeline.validate` and the full gate set exit 0 | **Pass.** All five gates exit 0 |

CO ingested and Table 1 reproduced at `table1_co_hourly_2026-08-28.csv`. The AQI
column was ignored in both directions, as instructed.

**Table 1 does not reproduce on the mean, and that is reported rather than
attributed.** The 98th percentile agrees within 0.08 ppm at every site, the
standard deviation within 0.04, the median within 0.09; the mean sits 0.09 to
0.12 above DEQ's published figure. DEQ publishes that column at 0.1 ppm
resolution, so the gap is one full unit of published precision.

Two complications are on record and **neither is offered as the cause**:

1. **The averaging period is unresolved.** `docs/GENARCH_RULES.md` section 4
   recorded the Kunak CO column as an 8-hour average, while DEQ's Table 1 is
   captioned "CO Hourly Concentrations" and sets the sensor rows beside a 1-hour
   regulatory monitor. Both cannot be right. The note predates the first export
   to carry a CO column at all and has not been reconfirmed with DEQ. Every
   sensor row in the Table 1 artifact carries this caveat in a `source_caveat`
   column and is marked provisional.
2. DEQ's own Table 1 prints a mean below its median at three sites, which is not
   a shape a right-skewed concentration distribution takes.

**This is the one place where following the brief conflicts with a standing
project rule, and it is reported rather than worked around.** Section 4
previously read "CO is not part of the v1 story". The brief's Phase 6 gate
authorises the ingestion and all three of its conditions passed, so CO is
ingested; but the sensor CO rows should not be published until the averaging
period is settled with DEQ. Section 4 has been rewritten to say exactly that.

## Phase 7, prompt provenance

`.claude/prompts/` remains tracked. A corrections header was added to
`kunak_refresh_2026-08-28.md` recording the four refuted amendment premises
(A.5, A.7, A.9/A.12, A.15) with what replaced each, plus a fifth premise
corrected by this task. The header states that the corrections were made during
execution, against the brief, and why a record containing corrected errors is
stronger evidence of method than a clean one.

## Phase 8, constraint checks

Each checked, not only fixed.

| Check | Result |
|---|---|
| 8.1 no causal claims, first paragraph of every artifact | Pass. Opening paragraph of this report, of `docs/PERCENTILE_METHOD.md`, and of `outputs/repro/README.md`. The page's existing framing is unchanged |
| 8.2 no facility named as harming anyone | Pass. No company, operator, campus or address appears in anything written here |
| 8.3 sensor limitations and sub-NAAQS readings stated first | Pass. Both appear before any figure in this report and in `PERCENTILE_METHOD.md` |
| 8.4 no policy position | Pass. Nothing written here takes a position on data centers |
| 8.5 population-level only | Pass. Every statistic is a site or network aggregate |
| 8.6 ecological-fallacy disclosure | Not triggered. Nothing touched here places tract-level exposure beside tract-level prevalence; this is sensor and monitor data only. The page's existing disclosure is unchanged |
| 8.7 DEQ limitation language verbatim, attributed, paired with the standards note | Pass. Added verbatim with attribution to `docs/PERCENTILE_METHOD.md` and to this report, each paired with the note that a single hourly reading above 35 µg/m³ is not an exceedance and that the annual standard is 9.0 µg/m³. Already present in `outputs/repro/README.md` and on the page |
| 8.8 constraint lint against the ratchet baseline | Pass, no regression. **52 violations, 52 baselined, 3 exempted, 0 new.** In-scope must-fix: 0. Structural rules: 0 findings. Identical to the stated baseline |
| 8.9 humanizer standards | Applied to all prose written here. No em-dashes, no significance inflation, no rule-of-three padding |

DEQ's published site names are used in `outputs/repro/` and in
`docs/PERCENTILE_METHOD.md`, both outside the lint scope, and nowhere in
`site/src`, where section 4 of the constraints forbids a school name near a
reading value.

## Phase 9, gates

| Gate | Exit |
|---|---|
| `python -m pipeline.reshape_deq` | 0 |
| `python -m pipeline.validate` | 0 |
| `python -m ruff check pipeline/` | 0, all checks passed |
| `cd site && npx tsc --noEmit` | 0 |
| `cd site && npm run build` | 0 |

The three scripts added by this task also pass `ruff`. Six pre-existing ruff
errors elsewhere in `scripts/` were left alone; `scripts/` is not in the gate.

**Citation gap counts, reported not fixed.** `docs/CITATION_GAPS.csv` carries
628 rows: EMPTY 12, ORPHAN 63, UNNAMESPACED_ID 553. 160 graph edges assert high
or medium confidence against empty or placeholder-only sources. Reference grade
of unnamespaced or placeholder assertions: has_doi 390, journal_only 4,
unnamespaced 153, url_only 6. Unchanged.

## Files edited

| File | Change |
|---|---|
| `pipeline/reshape_deq.py` | One line: `"CO": "CO"` added to `KUNAK_POLLUTANT_PREFIXES`. Phase 6 only |
| `pipeline/sources/deq_data_center_air_monitoring_hourly.csv` | 19,748 CO rows added; everything else byte-identical |
| `pipeline/sources/deq_missing_hours.csv` | Six CO rows added |
| `pipeline/sources/manifest.json` | Seven provenance keys added to each of the twelve raw-export entries |
| `site/src/lib/deq-data.ts` | `apex-05-no2` assertion demoted; `NonComparable` type added and surfaced on `CollocationRow`; two doc comments rewritten to the order-statistic framing |
| `site/src/app/community/data-center-alley/page.tsx` | Section 6 rewritten; Status column and non-comparability note added to the collocation table; the "all four agree" claim corrected |
| `site/src/app/community/page.tsx` | One line reworded |
| `docs/PERCENTILE_METHOD.md` | New |
| `docs/GENARCH_RULES.md` | Record-length section rewritten; section 4 CO subsection rewritten |
| `docs/DATA_PROVENANCE.md` | New section on dashboard backfill and why `_superseded/` is load-bearing |
| `README.md` | One line reworded |
| `outputs/repro/README.md` | Export-date column, new artifacts, audit-file exception |
| `outputs/repro/refresh_report_2026-08-28.md` | Corrections header; three statements corrected in place |
| `.claude/prompts/kunak_refresh_2026-08-28.md` | Corrections header |
| `outputs/repro/*.csv` (six files) | `export_date` backfilled |
| `scripts/consolidation_2026-08-29.py`, `scripts/backfill_export_date.py`, `scripts/manifest_enrich_kunak.py` | New |

New artifacts: `table1_co_hourly_2026-08-28.csv`,
`table2_no2_hourly_2026-08-28.csv`, `table3_pm25_hourly_2026-08-28.csv`,
`table4_full_comparison_2026-08-28.csv`, `p98_rank_position_2026-08-28.csv`,
`p98_day_binning_residual_2026-08-28.csv`,
`diagnostics/p98_diagnostics_2026-08-30.txt`.

## Could not be resolved, and why

1. **The Farmwell and Sterling p98 residuals**, +0.41 and +0.35 after regrouping
   on DEQ's binning. Day inclusion is eliminated: `n` is identical under both
   binnings at both sites and no day at either site crosses the 18-of-24
   threshold. The residual is the interpolation position inside a bracket whose
   endpoints are smoke days that themselves shift when the boundary moves. Under
   half a microgram, no published claim affected, no cause attributed.
2. **DEQ's Table 1 mean for CO.** Off by a full unit of DEQ's published
   precision at every sensor site while sd, median and p98 agree. Two
   complications are recorded and neither is offered as the cause.
3. **The Kunak CO averaging period.** An 8-hour average per the standing note, an
   hourly concentration per DEQ's table caption. Not resolvable from the data;
   needs DEQ. Blocks publishing the sensor CO rows.
4. **Both APEX 5 collocation regressions and the daily reconciliation past
   2026-08-09.** Unchanged from the refresh. FOIA 26-4646 caps the regulatory
   record at 2026-08-10 and a fit needs both sides of each pair.
5. **The APEX 14 NO2 R² selection question** raised under A.15 in the refresh.
   Date-window selection gives 0.4908, which rounds to DEQ's published 0.49;
   `unit_id` selection gives 0.4965, which rounds to 0.50. The method that
   reproduces DEQ's figure is the one DEQ's own supplied data range contradicts.
   Untouched here and still open.
6. **Citation manifest, canvas backing store, node summary mojibake.** Out of
   scope by prohibition. Counts reported above, unchanged.

The single blocking external dependency remains a follow-up FOIA request
extending the regulatory record past 2026-08-10. One release lifts the caps on
items 4 and restores the Phase 4 gate.

## State

All changes staged. Nothing committed, nothing pushed.
