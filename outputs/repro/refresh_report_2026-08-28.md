# Kunak refresh to the 2026-08-28 DEQ report period

Run 2026-08-29. Sensor data cutoff 2026-08-28. Regulatory data cutoff
2026-08-10. Nothing is committed.

This report describes co-location and measurement mechanism only. It makes no
causal claim, names no facility as harming anyone, and contains no
individual-level statement. The limitation language DEQ attaches to this sensor
network, and the regulatory form of the PM2.5 standards, are in
`outputs/repro/README.md` and apply to every figure below. Most readings in this
record sit well below the standards: site mean daily PM2.5 runs 5.9 to 10.5
µg/m³.

## Corrections issued 2026-08-30

Three statements in this report were superseded by the consolidation task of
2026-08-29. They are corrected in place below and listed here so the change is
visible rather than silent. Full working in
`outputs/repro/consolidation_2026-08-29.md` and `docs/PERCENTILE_METHOD.md`.

| Section | Superseded statement | Replacement |
|---|---|---|
| 3.3, 3.4 | The origin of the p98 offset is unresolved and recorded as open | Explained. GENARCH bins daily averages on local standard time, DEQ's published sensor tables bin on local clock time. Regrouping on DEQ's convention brings four of six sites within 0.06 |
| 3.4 | The percentile definition was ruled out | Correct as far as it went, but the framing was wrong. No quantile convention reproduced all six sites because the cause was never the convention; it was the day binning |
| 3.3 | The offset is an offset, one-directional | The divergence is bidirectional, −0.89 to +2.12, and is now explained |

One further clarification, on the unprompted finding in Phase 2. The nine
backfilled hours all returned as exact zeros on all three pollutants and are all
excluded by the `exact_zero_floor` rule. They change the row count and the
missing-hour count and no statistic. A backfill that resolves an absence into an
instrument-floor zero is a change in the record, not a recovery of data.

## Phase 0, gates

| Gate | Result |
|---|---|
| 0.1 new exports present | Pass under amendment A.19. `pipeline/sources/incoming/` is empty and unused; the six new exports are in `pipeline/sources/deq-raw/` |
| 0.2 delimiter, columns, timestamps | Delimiter `;` unchanged, timestamp format `%b %d, %Y, %H:%M:%S` unchanged, **columns changed**: `AQI` and `CO (ppm)` added. Neither matches `KUNAK_POLLUTANT_PREFIXES`, so `reshape_deq` ignores both and needed no modification. Not a stop condition |
| 0.3 timestamps advanced | Pass. All six sites moved from ts_est 2026-08-10 21:00 to 2026-08-28 21:00 |
| 0.4 regulatory endpoint | Regulatory monitor ends 2026-08-10 23:00, earlier than 2026-08-27. Cap carried into every collocation and reconciliation output |
| 0.5 clean tree | Pass. No unrelated changes; `pipeline/reshape_deq.py` unmodified |
| A.24 glob check | Pass. `sorted(sensor_dir.glob("*.csv"))` at line 908 is non-recursive and resolves to exactly six files, all `_2026-08-28`. The six superseded files under `_superseded/` are excluded |

Two corrections to the brief's own premises, found at this stage:

- The three pipeline output CSVs in the working tree were already post-refresh,
  so the Phase 1.1 baseline was taken from git HEAD instead. HEAD carries the
  genuine pre-refresh state at 2026-08-10. Recorded in
  `pre_refresh_2026-08-28/PROVENANCE.txt`.
- A.24 states the superseded files' manifest entries were marked. They were not.
  `scripts/mark_superseded.py` looks for entries with a `filename` key under
  `deq-raw/`, and no such per-file entries existed, so it matched zero and wrote
  nothing. Phase 1.3 created them.

## Phase 2, delta

Full tables in `reshape_delta_2026-08-28.md`. Summary:

- Sensor rows 51,441 to 59,244, a gain of 7,803. Site-hours 17,147 to 19,748.
  Every site gained 432 to 436 hours.
- No new exclusion reason category anywhere except `sterling-ms` VOCs, which
  recorded its first exact zero.
- Exact zeros rose at every site. Maximum run lengths held except
  `golf-course` PM2.5, 5 to 7 hours, and `sterling-ms` VOCs, 0 to 1.
- Regulatory monitor unchanged at 11,592 rows. It is FOIA-capped.
- Daily reconciliation unchanged: 119 comparable days, 118 exact after
  truncation, before and after.

**2.3, the 2026-03-10 mismatch.** Persists unchanged at recomputed 5.0 against
published 5.2, identical to the baseline. Left in place, as previously resolved
through DEQ correspondence confirming 5.0 is what recomputes from hourly data.

**2.4, Sterling MS growth.** 1,307 to 1,740 site-hours against roughly 1,680
anticipated. The arithmetic accounts for it exactly: 2026-06-18 00:00 to
2026-08-27 23:00 is 1,704 hours, plus 13 pre-occupancy transit hours on
2026-06-17 and 24 hours of 2026-08-28 gives 1,741 expected, less one missing
hour at 2026-06-29 14:00. No investigation needed.

**An unprompted finding.** The refresh introduced no new missing hours and
resolved nine that the 2026-08-10 export had left absent, all of them inside
that earlier export's own range. The dashboard backfilled them between the two
pulls. A re-pull is therefore not purely additive, and a figure computed from a
single export carries the state of the dashboard on its download date. This is
the practical reason every output here carries its cutoff as a field.

## Phase 3, the four claims

### 3.1 Collocation, `collocation_2026-08-28.csv`

Method is `docs/COLLOCATION_METHOD.md` exactly: pair on `ts_est`, apply the
excluded flag on both sides, assign periods by date, OLS with the sensor on x.

| Regression | Window | n | GENARCH | DEQ 2026-08-28 | Rounds to DEQ |
|---|---|---|---|---|---|
| NO2 APEX 14 | closed | 591 | 2.1957 + 1.0652x, R² 0.4908 | 2.2 + 1.1x, R² 0.49 | yes, all three |
| PM2.5 APEX 14 | closed | 699 | 1.2933 + 0.8317x, R² 0.7255 | 1.3 + 0.83x, R² 0.73 | yes, all three |
| NO2 APEX 5 | open, capped | 2,313 | 1.6614 + 0.3397x, R² 0.1990 | 1.7 + 0.31x, R² 0.21 | not comparable |
| PM2.5 APEX 5 | open, capped | 2,183 | -4.7002 + 1.6565x, R² 0.8345 | -5 + 1.6x, R² 0.82 | not comparable |

Both closed-window regressions round to DEQ's published values at DEQ's
published two significant figures. Both APEX 5 rows are labelled in the output
as capped at 2026-08-10 and not comparable to the 2026-08-28 report, because the
regulatory side of every pair ends there.

The APEX 14 NO2 R² is not a clean reproduction. Leave-one-out resampling spans
0.4784 to 0.5031 around a full-sample 0.4908, and several single observations
push it past the 0.4950 rounding boundary. The intercept and slope are stable.

### 3.2 Daily reconciliation, `daily_reconciliation_2026-08-28.csv`

Capped at 2026-08-09, the last day in DEQ's published daily-average file. 119
comparable days, 118 exact after truncation, mean absolute delta 0.0017 µg/m³.

This compares GENARCH's recomputed daily averages of the **regulatory FEM
monitor** at Broad Run HS against DEQ's published daily averages for that same
monitor. It is not a sensor reconciliation and is not described as one anywhere.

### 3.3 Common-window 98th percentile, `p98_common_window_2026-08-28.csv`

Common window 2026-06-18 to 2026-08-28, the intersection of all six operating
sensors' records.

| Site | Common p98 | Days | Rank | Full-record p98 | DEQ Table 4 | Delta |
|---|---:|---:|---:|---:|---:|---:|
| Farmwell Station MS | 37.55 | 71 | 1 | 26.70 | 24.6 | +2.10 |
| 1757 Golf Club | 34.15 | 71 | 2 | 24.58 | 23.4 | +1.18 |
| Belfort Park Dr | 34.02 | 71 | 3 | 26.38 | 25.9 | +0.48 |
| Sterling MS | 32.64 | 72 | 4 | 32.64 | 33.8 | -1.16 |
| Broad Run HS | 32.48 | 72 | 5 | 25.19 | 24.8 | +0.39 |
| Dulles Airport | 25.57 | 71 | 6 | 19.87 | 17.8 | +2.07 |

On matched windows the site that ranked first on its own record ranks fourth.
The deltas against DEQ's Table 4 in the last column are bidirectional, not a
one-directional offset, and are explained by day binning; see the corrections
header and `docs/PERCENTILE_METHOD.md`.

The common window is entirely high summer and contains the 2026-07-16 to
2026-07-19 smoke window, so it is not a clean control. It removes the
unequal-length confound and leaves the unequal-seasonality confound in place. It
is not a correction for record length and the output header says so.

A second measure points the same way. With 72 valid days, the choice of
percentile interpolation method alone moves Sterling MS's p98 by 13.27 µg/m³,
against 0.35 to 2.33 µg/m³ for the longer records. A statistic that unstable
cannot carry a ranking.

### 3.4 Zero-treatment sensitivity, `zero_treatment_sensitivity_2026-08-28.csv`

The suspected cause is not supported, and this is the clearest negative result
of the refresh.

| Site | DEQ mean | Zeros excluded | Δ | Zeros retained | Δ | Shift |
|---|---:|---:|---:|---:|---:|---:|
| Broad Run HS | 8.3 | 8.327 | +0.027 | 8.267 | -0.033 | -0.060 |
| Belfort Park Dr | 9.3 | 9.344 | +0.044 | 9.208 | -0.092 | -0.136 |
| Dulles Airport | 5.8 | 5.855 | +0.055 | 5.635 | -0.165 | -0.220 |
| Farmwell Station MS | 8.2 | 8.231 | +0.031 | 8.145 | -0.055 | -0.086 |
| 1757 Golf Club | 7.6 | 7.599 | -0.001 | 7.533 | -0.067 | -0.065 |
| Sterling MS | 10.5 | 10.530 | +0.030 | 10.438 | -0.062 | -0.092 |

There is no 1 to 2 µg/m³ offset in the mean to explain. Under the current
policy the site means reproduce DEQ's Table 4 to within 0.055, and switching
policy moves them by at most 0.22.

The offset that does exist is in the p98, and zero treatment does not explain
that either: retaining zeros moves the p98 by at most 0.14, roughly fifteen
times smaller than the deltas being explained. A separate check found that no
interpolation method reproduces DEQ's Table 4 consistently across sites.

**Corrected 2026-08-30.** This section originally recorded the origin of the p98
divergence as unresolved. It is now explained. The divergence is bidirectional,
−0.89 to +2.12 across the six sites, and its cause is the day boundary: GENARCH
bins hours into days on local standard time, which is the 40 CFR Part 50
Appendix N convention, while DEQ's published sensor tables bin on local clock
time. The two are identical in winter and differ by one hour during EDT.
Regrouping on DEQ's convention brings four of six sites within 0.06. The
interpolation method was correctly ruled out, but it was never the cause, so
describing it as the remaining candidate was the wrong framing. The pipeline's
binning is unchanged and is the regulatory convention. See
`docs/PERCENTILE_METHOD.md`.

The pipeline's default treatment was not changed.

## Phase 4, audit

`superseded_claims_audit_2026-08-28.csv`. First pass 28 findings. After Phase 5,
second pass:

| Status | Count |
|---|---:|
| accepted-as-correct | 14 |
| resolved in this task | 3 |
| deferred, owner decision | 1 |
| **open** | **0** |

"Accepted-as-correct" rows are matches on the correcting text itself, or on
correctly dated historical records such as the superseded manifest entries.

Categories that returned nothing at all: "three exact", "one near", "sole
site", "three decimals" as a claim, "record-length artifact" framed as
correcting DEQ, and any window-mismatch explanation for the APEX 5 near-miss.
None of those phrasings were present in the repo.

## Phase 5, files edited

| File | Change |
|---|---|
| `site/src/lib/deq-data.ts` | `DEQ_WEEKLY_EDITIONS` widened to four editions with the 2026-08-28 figures; tuple types widened; transcription note rewritten to record verification against the PDFs; `RECORD_END` and `DEQ_EDITION_CUTOFF` given the FOIA-cap rationale |
| `site/src/app/community/data-center-alley/page.tsx` | Table 4 finding rewritten per 5.2; collocation claim rewritten per 5.3 with closed and open windows distinguished and precision restated; wind-direction material added per 5.4; edition counts corrected |
| `site/src/content/deq-attribution.ts` | `reportAug28` citation record added; archive-location comment corrected |
| `docs/GENARCH_RULES.md` | Four-edition percentile table; four-edition collocation table; validated-collocation block restated at DEQ's precision; 2026-08-28 edition log row; new section 11 holding the observations for correspondence |
| `docs/COLLOCATION_METHOD.md` | Reproduction status recomputed at the 2026-08-10 cutoff against the 2026-08-28 report; window-mismatch refutation recorded; the stored APEX 5 NO2 figure corrected from "superseded" to "agency-confirmed and scoped" |
| `docs/DATA_PROVENANCE.md` | Coverage and edition rows updated |
| `README.md` | Coverage and edition rows updated |
| `pipeline/sources/manifest.json` | Twelve raw-export entries added, six current and six superseded with `superseded_on`, `superseded_by`, `superseded_reason`; derived-table entry refreshed |
| `outputs/repro/collocation_state_2026-08-28.csv` | Rewritten with recomputed values and cap labels |
| `outputs/repro/deq_table4_2026-08-28.csv` | Truncated Newberry Condo Assoc row recovered and inserted |

### 5.4 wind direction

Added to `/community/data-center-alley`, attributed to DEQ's 2026-08-28 report:
DEQ reports a wind rose from Dulles Airport measurements, states winds during
the study period came predominantly from the south or northwest, and describes
its Broad Run HS and Dulles sites as good upwind sites with regard to Data
Center Alley. The page carries this as DEQ's characterisation of its own network
geometry and states explicitly that it does not establish any site as downwind
of any facility.

### 5.5 the report's internal inconsistency

Recorded in `docs/GENARCH_RULES.md` section 11, which is marked not for
publication. Section 4 of the 2026-08-28 report states both PM2.5 standards
correctly. The Section 5 conclusion then refers to a "24-hr (daily) average
PM2.5 NAAQS limit of 9.0 µg/m3" and names two sensors as above it. There is no
9.0 daily limit; 9.0 is the annual primary standard from the 2024 revision, and
the column in which those sites exceed 9.0 is the mean column. DEQ's next
sentence notes the standards rest on three-year averages and that no violation
can be inferred, so the conclusion is internally inconsistent rather than
misleading in effect. Held for correspondence. Not published, not adopted, not
characterised as an error anywhere public.

## Phase 6, constraint checks

| Check | Result |
|---|---|
| 6.1 no causal claims, stated first | Pass. Opening paragraph of this report and of `outputs/repro/README.md`; the page's existing framing is unchanged |
| 6.2 corridor, not company | Pass. No facility or company named in any text written here |
| 6.3 sensor limitations and sub-NAAQS readings stated first | Pass. Both in the opening section of `README.md` and of this report, before any figure |
| 6.4 no policy position | Pass. Nothing written here takes a position on data centers |
| 6.5 population-level only | Pass. Every statistic is a site or network aggregate; no individual-level statement |
| 6.6 ecological-fallacy disclosure | Not triggered. No artifact touched here places tract-level exposure beside tract-level prevalence; this refresh is sensor and monitor data only. The page's existing disclosure is unchanged |
| 6.7 DEQ limitation language verbatim | Pass. Present verbatim with attribution in `outputs/repro/README.md`, paired with the standard's regulatory form and the 9.0 annual standard. The page carries both DEQ variants, dashboard and report, each separately cited, plus the same pairing |
| 6.8 constraint lint against ratchet baseline | Pass, no regression. 52 violations, 52 baselined, 3 exempted, **0 new**. In-scope must-fix: 0. Structural rules: 0 findings |
| 6.9 humanizer standards | Applied to all prose written here. No em-dashes, no significance inflation, no fragmented headers |

## Phase 7, gates

| Gate | Exit |
|---|---|
| `python -m pipeline.reshape_deq` | 0 |
| `python -m pipeline.validate` | 0 |
| `python -m ruff check pipeline/` | 0, all checks passed |
| `cd site && npx tsc --noEmit` | 0 |
| `cd site && npm run build` | 0 |

The build passing matters beyond compilation: `getCollocation()` asserts every
fit against DEQ's published coefficients and fails the build on drift outside
tolerance, so a green build is evidence the reproduction still holds.

**Citation gap manifest, reported not fixed.** `docs/CITATION_GAPS.csv` carries
628 rows: EMPTY 12, ORPHAN 63, UNNAMESPACED_ID 553. 160 graph edges assert high
or medium confidence against empty or placeholder-only sources. Reference grade
of unnamespaced or placeholder assertions: has_doi 390, journal_only 4,
unnamespaced 153, url_only 6. Unchanged from the counts stated in the brief. Out
of scope here, and still blocking public display of per-step confidence badges.

## Claims that could not be recomputed, and why

1. **Both APEX 5 collocation regressions against the 2026-08-28 report.** The
   regulatory monitor ends 2026-08-10 under FOIA 26-4646 and a fit needs both
   sides of each pair. No cutoff past 2026-08-10 is computable. Computed anyway
   and labelled as capped and not comparable.
2. **Daily reconciliation past 2026-08-09.** DEQ's published daily-average file
   ends there. Same FOIA cause.
3. ~~**The origin of the p98 offset against DEQ's Table 4.**~~ **Resolved
   2026-08-30**, and no longer an open item. Zero treatment and quantile
   convention were both correctly ruled out; the cause is the day boundary, and
   the divergence is bidirectional rather than an offset. Four of six sites fall
   within 0.06 under DEQ's local-clock binning. A residual of +0.41 and +0.35 at
   two sites remains open and is under half a microgram. See
   `docs/PERCENTILE_METHOD.md`.

**The single blocking external dependency** is a follow-up FOIA request
extending the regulatory record past 2026-08-10. One release lifts both caps.

## Amendment findings

- **A.4 and A.8, window mismatch: refuted, confirmed on refreshed data.** A
  cutoff sweep from 2026-08-05 to 2026-08-10 moves the APEX 5 NO2 intercept by
  0.011, the slope by 0.002 and the R² by 0.002 on roughly 2,300 pairs. The
  historical near-miss is not a window artifact. Repo text offering that
  explanation: none found.
- **A.6, does the report resolve the apex-14 unit conflict? No.** The 2026-08-28
  report states that APEX 14 was collocated at Broad Run HS from 2026-03-03 to
  2026-04-08, and separately that the APEX 14 sensor at Newberry Condo Assoc.
  moved to Belfort Park Dr. on 2026-05-14. Both cannot hold unless the unit moved
  from Broad Run HS to Newberry on 2026-04-08, which the report does not state.
  The report is the source of both claims and reproduces the conflict rather than
  resolving it. `deq_unit_conflicts.csv` still carries the single row, classified
  `provenance_ambiguity`, with 863 readings on the `ashburn-collocated` side and
  0 on `newberry-condo`, so no reading can be misassigned. No unit assignment
  changed.
- **A.7, unarchived reports: the premise is wrong.** Three prior editions are
  archived at `docs/deq-reports/` (2026-08-07, 08-14, 08-21) and the fourth at
  `pipeline/sources/deq/`. All twelve Sterling MS figures and all four editions'
  collocation coefficients were extracted from those PDFs in this task and
  reproduce exactly. No claim in the repo now rests on an unarchived report. The
  one genuine provenance gap is unrelated: the manifest entry for the 2026-08-28
  PDF carries `"origin_url": "PASTE_DEQ_REPORT_URL_HERE"`.
- **A.9 and A.12, the stored APEX 5 NO2 figure: not superseded.** 1.84 / 0.316 /
  0.205 reproduces under a zeros-retained policy because DEQ confirmed on
  2026-08-19 that DEQ retains exact zeros in that one regression, supplied the
  corrected coefficients, and attached the paired hourly data. It is a
  deliberate agency-confirmed exception scoped to a single comparison, recorded
  in `GENARCH_RULES.md` section 9 and implemented as a per-comparison flag. The
  amendment's reading of it as an unsourced inconsistency was incorrect and
  `COLLOCATION_METHOD.md` has been corrected. Readmitting zeros into the other
  three moves APEX 14 PM2.5 intercept to 1.368 against a published 1.3 and APEX
  14 NO2 R² to 0.5442 against a published 0.49, so the scoping is load-bearing.
- **A.15, unit_id at swap boundaries.** Three documented swaps. Rows within 24
  hours whose `unit_id` disagrees with a date-window reading of DEQ's timeline:

  | Swap | Date | Rows in window | Inconsistent |
  |---|---|---:|---:|
  | APEX 14 to APEX 5, Broad Run HS | 2026-04-08 | 144 | 6 |
  | APEX 14, Newberry Condo to Belfort Park Dr | 2026-05-14 | 45 | 0 |
  | APEX 6, Steuart Weller ES to Sterling MS | 2026-06-18 | 117 | 0 |

  The six are two timestamps across three pollutants, at `ts_est` 2026-04-07
  22:00 and 23:00. The amendment describes these as originating at `ts_raw`
  2026-04-07 23:00 and 2026-04-08 00:00 under `shift_hours = 1`. They do not:
  `shift_hours` is 2 and the raw stamps are 2026-04-08 00:00 and 01:00, so in
  the local clock DEQ's report speaks in, both hours fall on 2026-04-08 and the
  pipeline's `apex-05` label agrees with DEQ. DEQ's own attached data for that
  regression begins at 2026-04-07 22:00 in `ts_est`, which confirms DEQ includes
  those hours in APEX 5.

  This cuts against the date-window method the task specified, and the two
  selections are not equally good. On the closed APEX 14 NO2 window, date-window
  selection gives R² 0.4908, which rounds to DEQ's published 0.49, while
  `unit_id` selection gives 0.4965, which rounds to 0.50. The method that
  reproduces DEQ's published R² is the one DEQ's own supplied data range
  contradicts. Unresolved, and a further reason not to present that R² as a clean
  reproduction. No unit assignment was changed.

## Deferred, needs an owner decision

`site/src/lib/deq-data.ts`, the `apex-05-no2` assertion target. It holds DEQ's
2026-08-19 corrected coefficients while the GENARCH fit beside it stops at the
2026-08-07 edition cutoff, which is the cross-window comparison the surrounding
comment warns against. Changing it moves a build-time gate, so it is reported
rather than changed.

## State

All changes staged, nothing committed, nothing pushed.
